// Combat v2: real-time fights (src/engine/realtime.js, docs/REALTIME_COMBAT.md). The turn-based
// legacy mode is the default and is covered by every other test file.
const { test, assert, GameEngine, data, assertHealthy } = require('./helpers.js');

const RT = data.realtimeRules;
function rtGame(seed = 1) {
    const g = new GameEngine({ seed, combatMode: 'realtime' });
    g.log = g.start();
    g.do = (...cmds) => { for (const c of cmds) g.log.push(...g.input(c)); return g; };
    g.run = (ms, step = 100) => { for (let t = 0; t < ms && g.mode === 'combat'; t += step) g.log.push(...g.tick(Math.min(step, ms - t))); return g; };
    g.text = () => g.log.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
    return g;
}
/** James Newton: 666 HP, 66 DEF. Direct hits do 0, so the fight lasts as long as a test needs. */
function newton(cls = 'warrior', seed = 1) {
    const g = rtGame(seed).do(cls, 'engage');
    g.player.hp = g.player.maxHp = 99999;
    g.player.resource.current = g.player.resource.max = 99;
    return g;
}
const option = (g, type, skillId) => g.getAvailableActions().actions.find((o) => o.type === type && (!skillId || o.skillId === skillId));
const enemy = (g) => g.combat.enemies[0];

test('RT-01: turn-based stays the default; combatMode realtime starts a clocked fight with no turns', () => {
    assert.strictEqual(new GameEngine({ seed: 1 }).combatMode, 'turn');
    const g = newton();
    assert.strictEqual(g.combatMode, 'realtime');
    assert.ok(g.combat.rt, 'real-time fight state');
    const avail = g.getAvailableActions();
    assert.strictEqual(avail.awaiting, 'realtime');
    assert.strictEqual(avail.skillBar.length, RT.skillBar.slots);
    assert.strictEqual(g.getRealtimeState().now, 0);
    assert.strictEqual(g.getState().combat.realtime, undefined, 'getState() is unchanged (golden replay hash)');
    // ticking does nothing outside a real-time fight
    const t = new GameEngine({ seed: 1 }); t.start(); t.input('warrior'); t.input('engage');
    assert.deepStrictEqual(t.tick(1000), []);
    assertHealthy(g);
});

test('RT-02: skills have cooldowns from cost (or their own), share a global cooldown; availability and act() agree', () => {
    const g = newton();
    assert.strictEqual(g.rtCooldownMs('Power Strike'), (RT.cooldowns.baseSeconds + RT.cooldowns.perCostSeconds * 2) * 1000);
    assert.strictEqual(g.rtCooldownMs('Guard'), RT.cooldowns.baseSeconds * 1000);
    assert.ok(g.act({ type: 'skill', skillId: 'Power Strike' }).ok);
    let r = g.act({ type: 'skill', skillId: 'Power Strike' });
    assert.strictEqual(r.error.code, 'ON_COOLDOWN');
    assert.strictEqual(option(g, 'skill', 'Power Strike').reason.code, 'ON_COOLDOWN', 'availability agrees');
    r = g.act({ type: 'skill', skillId: 'Guard' });
    assert.strictEqual(r.error.code, 'GLOBAL_COOLDOWN');
    assert.strictEqual(option(g, 'skill', 'Guard').reason.code, 'GLOBAL_COOLDOWN');
    // the basic attack has its own swing timer and ignores the global cooldown
    assert.ok(g.act({ type: 'attack' }).ok, 'basic attack during the global cooldown');
    assert.strictEqual(g.act({ type: 'attack' }).error.code, 'ON_COOLDOWN', 'but not twice inside one swing');
    g.run(RT.globalCooldownSeconds * 1000);
    assert.ok(g.act({ type: 'skill', skillId: 'Guard' }).ok, 'global cooldown over');
    const cd = g.getRealtimeState().cooldowns['Power Strike'];
    assert.ok(cd && cd.remainingMs > 0 && cd.totalMs === g.rtCooldownMs('Power Strike'));
    g.run(g.rtCooldownMs('Power Strike'));
    assert.ok(option(g, 'skill', 'Power Strike').enabled, 'cooldown over');
    assert.ok(g.act({ type: 'skill', skillId: 'Power Strike' }).ok);
    // QA #14 RT-1: an item shares the global cooldown, and availability says so too
    g.player.inventory.push('Bandages'); g.player.hp -= 50;
    assert.strictEqual(option(g, 'use_item').reason.code, 'GLOBAL_COOLDOWN');
    assert.strictEqual(g.act({ type: 'use_item', item: 'Bandages' }).error.code, 'GLOBAL_COOLDOWN');
    g.run(RT.globalCooldownSeconds * 1000);
    assert.ok(option(g, 'use_item').enabled);
    assert.ok(g.act({ type: 'use_item', item: 'Bandages' }).ok);
    assertHealthy(g);
});

test('RT-03: the basic attack swing comes from SPD; enemies wind up, then land, on their own clocks', () => {
    const g = newton();
    const spd = g.speedOf(g.player);
    const expect = Math.round(Math.min(RT.basicAttack.maxSeconds, Math.max(RT.basicAttack.minSeconds, RT.basicAttack.swingSeconds * RT.basicAttack.referenceSpeed / spd)) * 1000);
    assert.strictEqual(g.rtIntervalMs(g.player), expect);
    const hpBefore = g.player.hp;
    g.run(RT.enemy.openingSeconds * 1000);
    const view = g.getRealtimeState().actors[enemy(g).id];
    assert.ok(view.windup, 'winding up after the opening');
    assert.strictEqual(view.windup.totalMs, RT.enemy.windupSeconds * 1000);
    assert.match(g.text(), /readies/);
    assert.strictEqual(g.player.hp, hpBefore, 'nothing has landed yet');
    g.run(RT.enemy.windupSeconds * 1000);
    assert.ok(g.player.hp < hpBefore, 'the blow lands after the wind-up');
    assert.strictEqual(g.getRealtimeState().actors[enemy(g).id].windup, null);
    assertHealthy(g);
});

test('RT-04: a stun during the wind-up interrupts it; a stunned enemy skips its next action; a stunned player is refused', () => {
    const g = newton();
    g.run(RT.enemy.openingSeconds * 1000);
    assert.ok(g.getRealtimeState().actors[enemy(g).id].windup);
    g.applyStatus(g.player, enemy(g), { name: 'Stun', type: 'skip_turn', duration: 1 });
    const hp = g.player.hp;
    g.run(RT.enemy.windupSeconds * 1000);
    assert.match(g.text(), /interrupted/);
    assert.strictEqual(g.player.hp, hp);
    assert.ok(enemy(g).statusEffects.find((s) => s.name === 'Stun').rtTotalMs === RT.secondsPerTurn * 1000, '1 turn = secondsPerTurn');
    g.applyStatus(enemy(g), g.player, { name: 'Stun', type: 'skip_turn', duration: 1 });
    assert.strictEqual(g.act({ type: 'attack' }).error.code, 'STUNNED');
    assert.strictEqual(option(g, 'attack').reason.code, 'STUNNED');
    g.run(RT.secondsPerTurn * 1000 + 100);
    assert.ok(!g.player.statusEffects.some((s) => s.name === 'Stun'), 'the stun wore off on time');
    assert.ok(g.act({ type: 'attack' }).ok);
    assertHealthy(g);
});

test('RT-05: DoTs tick on their own clock for their timed duration, stack to 99, and stacks shorten the tick', () => {
    const g = newton();
    const e = enemy(g);
    g.applyDot(g.player, e, { name: 'Bleed', value: 2, duration: 2 });
    const bleed = g.findStatus(e, 'Bleed');
    assert.strictEqual(bleed.rtTotalMs, 2 * RT.secondsPerTurn * 1000);
    assert.strictEqual(g.rtTickMs(bleed), RT.statuses.tickSeconds * 1000);
    const hp = e.hp;
    g.run(3000);
    assert.strictEqual(hp - e.hp, 3 * 2, 'three 1-second ticks of 2');
    g.run(3100);
    assert.ok(!g.findStatus(e, 'Bleed'), 'gone after 6 seconds');
    for (let i = 0; i < 120; i++) g.applyDot(g.player, e, { name: 'Poison', value: 1, duration: 3 });
    const poison = g.findStatus(e, 'Poison');
    assert.strictEqual(poison.stacks, RT.statuses.dotMaxStacks, 'capped at 99');
    const expected = Math.max(RT.statuses.minTickSeconds, RT.statuses.tickSeconds / (1 + RT.statuses.perStackSpeedup * 98));
    assert.strictEqual(g.rtTickMs(poison), Math.round(expected * 1000));
    assert.ok(g.rtTickMs(poison) < g.rtTickMs({ stacks: 1 }), 'more stacks, faster ticks');
    // the turn-based game keeps the approved caps
    assert.strictEqual(new GameEngine({ seed: 1 }).maxStacks('Infection'), 3);
    assert.strictEqual(g.maxStacks('Infection'), 99);
    assertHealthy(g);
});

test('RT-06: policy statuses (Guard, Expose, Marked for Death) are timed, not opportunity-based', () => {
    const g = newton();
    g.act({ type: 'skill', skillId: 'Guard' });
    const guard = g.findStatus(g.player, 'Guard');
    assert.ok(guard, 'guarding');
    assert.strictEqual(guard.policy, null);
    assert.strictEqual(guard.rtTotalMs, RT.statuses.buffs.Guard.seconds * 1000, "Gauge's buff timing wins over guardSeconds");
    g.run(RT.statuses.buffs.Guard.seconds * 1000 + 100);
    assert.ok(!g.findStatus(g.player, 'Guard'), 'Guard ran out on the clock');
    assertHealthy(g);
});

test('RT-07: skill bar: 6 slots fill from learned skills; set_skill_slot swaps outside combat only; new skills take an empty slot once', () => {
    const g = rtGame(2).do('warrior');
    const bar = () => g.getSkillBar().map((s) => s.skillId);
    assert.deepStrictEqual(bar(), ['Guard', 'Power Strike', null, null, null, null], 'Slash is the basic attack, not on the bar');
    let r = g.act({ type: 'set_skill_slot', slot: 3, skillId: 'Guard' });
    assert.ok(r.ok);
    assert.deepStrictEqual(bar(), [null, 'Power Strike', null, 'Guard', null, null], 'moved');
    r = g.act({ type: 'set_skill_slot', slot: 1, skillId: 'Guard' });
    assert.deepStrictEqual(bar(), [null, 'Guard', null, 'Power Strike', null, null], 'swapped');
    assert.strictEqual(g.act({ type: 'set_skill_slot', slot: 6, skillId: 'Guard' }).error.code, 'INVALID_SLOT');
    assert.strictEqual(g.act({ type: 'set_skill_slot', slot: 0, skillId: 'Fireball' }).error.code, 'SKILL_NOT_KNOWN');
    assert.strictEqual(g.act({ type: 'set_skill_slot', slot: 0, skillId: 'Slash' }).error.code, 'INVALID_SLOT');
    g.act({ type: 'set_skill_slot', slot: 3, skillId: null });
    assert.deepStrictEqual(bar(), [null, 'Guard', null, null, null, null], 'cleared');
    g.player.skills.push('Whirlwind');
    assert.deepStrictEqual(bar(), ['Whirlwind', 'Guard', null, null, null, null], 'a new skill takes the first empty slot; a cleared one stays off');
    g.do('engage');
    assert.strictEqual(g.act({ type: 'set_skill_slot', slot: 0, skillId: 'Power Strike' }).error.code, 'IN_COMBAT');
    g.player.resource.current = 10;
    assert.ok(g.act({ type: 'skill_slot', slot: 1 }).ok, 'slot 2 = Guard');
    assert.strictEqual(g.act({ type: 'skill_slot', slot: 2 }).error.code, 'EMPTY_SLOT');
    assertHealthy(g);
});

test('RT-08: the pulse does the end-of-round bookkeeping (regen, round counter) on the clock', () => {
    const g = rtGame(3).do('mage', 'engage');
    g.player.hp = g.player.maxHp = 99999;
    g.player.resource.current = 0;
    g.run(RT.pulseSeconds * 1000);
    assert.strictEqual(g.combat.round, 2);
    assert.strictEqual(g.player.resource.current, g.player.resource.regen);
    assertHealthy(g);
});

test('RT-09: the same seed and inputs give the same fight; a mid-fight save resumes on the same clock', () => {
    const play = () => {
        const g = rtGame(11).do('rogue', 'n', 'engage');
        for (let i = 0; i < 400 && g.mode === 'combat'; i++) {
            const o = g.getAvailableActions().actions.find((x) => x.enabled && (x.type === 'skill' || x.type === 'attack'));
            if (o && i % 3 === 0) g.log.push(...g.act(o.type === 'attack' ? { type: 'attack' } : { type: 'skill', skillId: o.skillId }).events);
            g.run(100);
        }
        return g;
    };
    assert.strictEqual(play().text(), play().text());
    const g = rtGame(5).do('warrior', 'n', 'engage');
    g.run(1500);
    const copy = GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())), { combatMode: 'realtime' });
    assert.strictEqual(copy.combat.rt.now, g.combat.rt.now);
    const a = g.tick(800).map((e) => e.text).join('\n');
    const b = copy.tick(800).map((e) => e.text).join('\n');
    assert.strictEqual(a, b, 'the copy plays on identically');
    assertHealthy(copy);
});

test('RT-10: fuzz: 120 seeded real-time fights never crash, NaN, overstack or refuse an enabled option', () => {
    const classes = Object.keys(data.basePlayerClasses);
    for (let seed = 1; seed <= 120; seed++) {
        const g = rtGame(seed).do(classes[seed % 4]);
        if (seed % 3 === 0) g.do('add_xp 400');
        if (g.mode === 'branch_select') g.do(Object.keys(data.evolutionPaths[g.player.className].branches)[seed % 3]);
        g.do(seed % 2 ? 'n' : 'look', 'engage');
        let r = seed * 7919;
        const rand = () => (r = (r * 48271) % 2147483647) / 2147483647;
        for (let step = 0; step < 600 && g.mode === 'combat'; step++) {
            const avail = g.getAvailableActions();
            const enabled = avail.actions.filter((o) => o.enabled && (o.type === 'skill' || o.type === 'attack'));
            if (enabled.length && rand() < 0.5) {
                const o = enabled[Math.floor(rand() * enabled.length)];
                const target = o.targets && o.targets.find((t) => t.enabled);
                const action = o.type === 'attack' ? { type: 'attack' } : { type: 'skill', skillId: o.skillId };
                if (o.pick) action.targetIds = o.targets.slice(0, o.pick.min).map((t) => t.id);
                else if (target) action.targetId = target.id;
                const res = g.act(action);
                assert.ok(res.ok, `seed ${seed}: ${o.skillId || 'attack'} was enabled but refused: ${res.error && res.error.message}`);
            }
            g.tick(50 + Math.floor(rand() * 200));
            assertHealthy(g);
            if (g.combat) for (const x of [g.player, ...g.combat.enemies]) for (const s of x.statusEffects) assert.ok((s.stacks || 1) <= 99, `${s.name} x${s.stacks}`);
        }
    }
});
