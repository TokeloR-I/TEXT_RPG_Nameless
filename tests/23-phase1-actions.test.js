// Phase 1, slice 2: getAvailableActions() + act() (architecture/PHASE1_ENGINE_INTERFACE_SPEC.md §4, §6A, §8;
// authorized in #64). Invariants checked here: I2 JSON safety, I9 pure availability, I10 availability agrees
// with act(), I12 parser equivalence, I15 liveness, I17 world isolation, C11 transactions.
const { test, assert, GameEngine, data, newGame } = require('./helpers.js');

const texts = (events) => events.filter((e) => e.type === 'text').map((e) => e.text);
/** An independent copy of a game (same data, same RNG state), for trying actions without touching the original. */
function fork(g) {
    const f = new GameEngine({ seed: g.seed, data: g.data });
    f.restore(g.snapshot());
    return f;
}
const options = (g) => g.getAvailableActions().actions;
const find = (g, type, skillId) => options(g).find((o) => o.type === type && (!skillId || o.skillId === skillId));
/** Every concrete action an availability list offers: one per (option, target) where targets are chosen. */
function concrete(avail) {
    const out = [];
    for (const o of avail.actions) {
        const base = { ...o };
        for (const k of ['enabled', 'reason', 'targets', 'notes', 'cost', 'resource', 'targeting', 'isBasic', 'pick', 'count', 'name']) delete base[k];
        if (o.pick) {
            const ids = (o.targets || []).slice(0, o.pick.max).map((t) => t.id);
            out.push({ action: { ...base, targetIds: ids }, enabled: o.enabled, code: o.reason && o.reason.code });
        } else if ((o.type === 'skill' || o.type === 'attack') && o.targeting === 'enemy_single' && o.targets && o.targets.length) {
            for (const t of o.targets) out.push({ action: { ...base, targetId: t.id }, enabled: o.enabled && t.enabled, code: (t.reason || o.reason || {}).code });
        } else {
            out.push({ action: base, enabled: o.enabled, code: o.reason && o.reason.code });
        }
    }
    return out;
}
/** A seeded bot that only ever picks enabled actions; calls check(g) before every move. */
function botRun(seed, steps, check) {
    const classes = Object.keys(data.basePlayerClasses);
    const g = new GameEngine({ seed });
    g.start();
    let r = seed * 7919;
    const pick = (a) => a[(r = (r * 48271) % 2147483647) % a.length];
    g.act({ type: 'choose_class', classId: classes[seed % 4] });
    if (seed % 2) g.act({ type: 'cheat', cheat: 'add_xp', amount: [250, 400, 2000][seed % 3] });
    for (let i = 0; i < steps; i++) {
        if (check) check(g, i);
        const avail = g.getAvailableActions();
        let choices = concrete(avail).filter((c) => c.enabled);
        // explore: prefer forward progress so bots reach fights
        if (avail.mode === 'explore') {
            const fight = choices.find((c) => c.action.type === 'engage');
            if (fight) choices = [fight];
        }
        if (!choices.length) break;
        const res = g.act(pick(choices).action);
        assert.ok(!res.error || res.error.code !== 'INTERNAL_ERROR', `seed ${seed} step ${i}: ${JSON.stringify(res.error)}`);
        assert.ok(res.ok, `seed ${seed} step ${i}: an enabled action was refused: ${JSON.stringify(res.error)}`);
    }
    assert.deepStrictEqual(g.errors, [], `seed ${seed}: no engine errors`);
    return g;
}

test('Phase 1: availability lists every option with reasons, and is pure and JSON-safe (I2, I9)', () => {
    const g = newGame(2).do('necromancer', 'e', 'engage');
    const before = JSON.stringify(g.snapshot());
    const a = g.getAvailableActions();
    assert.strictEqual(JSON.stringify(g.snapshot()), before, 'no state or RNG change');
    assert.deepStrictEqual(g.getAvailableActions(), a, 'two calls in a row are equal');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), a, 'JSON-safe');
    assert.deepStrictEqual([a.mode, a.awaiting], ['combat', 'action']);
    assert.deepStrictEqual(a.actions.map((o) => o.type + (o.skillId ? `:${o.skillId}` : '')),
        ['attack:Basic Attack', 'skill:Grave Bolt', 'skill:Raise Skeleton', 'skill:Soul Leech', 'flee'], 'every known skill is listed');
    const raise = a.actions.find((o) => o.skillId === 'Raise Skeleton');
    assert.deepStrictEqual([raise.enabled, raise.reason.code], [false, 'NOT_ENOUGH_RESOURCE']);
    assert.match(raise.reason.message, /Not enough Soul Energy! \(Raise Skeleton needs 2, you have 1\)/, 'same words as the text game');
    assert.deepStrictEqual(a.actions[0].targets.map((t) => t.id), ['enemy_0', 'enemy_1', 'enemy_2']);
});

test('Phase 1: act() uses stable ids, so a target stays the same unit after another enemy dies (ID-2)', () => {
    const g = newGame(2).do('necromancer', 'e', 'engage');
    g.combat.enemies[0].hp = 1;
    const first = g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.ok(first.ok);
    assert.ok(g.combat.enemies[0].hp <= 0, 'enemy_0 died');
    const target = g.combat.enemies.find((e) => e.id === 'enemy_2');
    const hp = target.hp;
    g.player.hp = g.player.maxHp = 999;
    const r = g.act({ type: 'attack', targetId: 'enemy_2' });
    assert.ok(r.ok);
    assert.ok(target.hp < hp, 'enemy_2 (now list position 2) took the hit, not whoever is "2" in the text menu');
    const bad = g.act({ type: 'attack', targetId: 'enemy_0' });
    assert.deepStrictEqual([bad.ok, bad.error.code], [false, 'INVALID_TARGET'], 'a dead unit is not a target');
    assert.strictEqual(g.combat.awaitingPlayer, true, 'refusal keeps the turn');
});

test('Phase 1: rejection codes, each with the message the text game prints (spec §4.4)', () => {
    const code = (g, action) => { const r = g.act(action); assert.strictEqual(r.ok, false, JSON.stringify(action)); return r.error.code; };
    // explore / menus
    const cs = new GameEngine({ seed: 1 }); cs.start();
    assert.strictEqual(code(cs, { type: 'choose_class', classId: 'bard' }), 'INVALID_CLASS');
    assert.strictEqual(code(cs, { type: 'move', direction: 'north' }), 'WRONG_MODE');
    const g = newGame(1).do('warrior');
    assert.strictEqual(code(g, { type: 'move', direction: 'west' }), 'NO_EXIT');
    assert.strictEqual(code(g, { type: 'take', item: 'Crown' }), 'ITEM_NOT_HERE');
    assert.strictEqual(code(g, { type: 'use_item', item: 'Unicorn' }), 'NO_ITEM');
    g.player.inventory.push('Bandages');
    assert.strictEqual(code(g, { type: 'use_item', item: 'Bandages' }), 'FULL_HEALTH');
    assert.deepStrictEqual(find(g, 'use_item').reason, { code: 'FULL_HEALTH', message: "You're already at full health." });
    g.player.hp -= 10;
    assert.strictEqual(find(g, 'use_item').enabled, true, 'usable once hurt');
    assert.strictEqual(code(g, { type: 'attack' }), 'WRONG_MODE');
    assert.strictEqual(code(g, { type: 'dance' }), 'UNKNOWN_ACTION');
    // combat
    const f = newGame(2).do('necromancer', 'e', 'engage');
    assert.strictEqual(code(f, { type: 'skill', skillId: 'Raise Skeleton' }), 'NOT_ENOUGH_RESOURCE');
    assert.strictEqual(code(f, { type: 'skill', skillId: 'Corpse Bloom' }), 'SKILL_NOT_KNOWN');
    assert.strictEqual(code(f, { type: 'skill', skillId: 'Fireball of Doom' }), 'UNKNOWN_SKILL');
    assert.strictEqual(code(f, { type: 'attack' }), 'INVALID_TARGET', 'three enemies: a target is required');
    assert.strictEqual(code(f, { type: 'attack', targetId: 'enemy_9' }), 'INVALID_TARGET');
    assert.strictEqual(code(f, { type: 'continue' }), 'WRONG_MODE');
    f.player.skills.push('Corpse Bloom'); f.player.resource.current = 9;
    assert.strictEqual(code(f, { type: 'skill', skillId: 'Corpse Bloom' }), 'REQUIREMENT_FAILED', 'no corpse');
    f.applyStatus(f.combat.enemies[0], f.player, { name: 'Silence', type: 'silence', duration: 1 });
    assert.strictEqual(code(f, { type: 'skill', skillId: 'Grave Bolt', targetId: 'enemy_1' }), 'SILENCED');
    assert.strictEqual(find(f, 'skill', 'Grave Bolt').reason.code, 'SILENCED', 'availability agrees');
    assert.strictEqual(find(f, 'attack').enabled, true, 'the basic attack still works');
    const w = newGame(19).do('warrior', 'engage');
    w.player.skills.push('Dragon’s Dominion'); w.player.resource.type = 'Fury Gauge'; w.player.resource.current = 5;
    assert.ok(w.act({ type: 'skill', skillId: 'Dragon’s Dominion' }).ok);
    w.player.resource.current = 5;
    if (w.mode === 'combat' && w.combat.awaitingPlayer) assert.strictEqual(code(w, { type: 'skill', skillId: 'Dragon’s Dominion' }), 'ONCE_PER_FIGHT');
    const ni = newGame(3).do('mage', 'n', 'engage');
    const notBuilt = Object.keys(data.skillDefinitions).find((k) => !ni.isCastable(data.skillDefinitions[k]));
    ni.player.skills.push(notBuilt);
    assert.strictEqual(code(ni, { type: 'skill', skillId: notBuilt, targetId: 'enemy_0' }), 'NOT_IMPLEMENTED');
    // the text game shows the identical sentence for the same refusal
    const t = newGame(2).do('necromancer', 'e', 'engage');
    const viaText = texts(t.input('raise skeleton')).find((x) => /^Error:/.test(x));
    const viaAct = fork(t).act({ type: 'skill', skillId: 'Raise Skeleton' });
    assert.strictEqual(viaText, `Error: ${viaAct.error.message}`);
    assert.ok(texts(viaAct.events).includes(viaText), 'act() prints the same refusal line');
});

test('Phase 1: availability agrees with act() for every option and target (I10), across seeded bot runs', () => {
    let checked = 0;
    for (let seed = 1; seed <= 24; seed++) {
        botRun(seed, 40, (g, i) => {
            const snap = JSON.stringify(g.snapshot());
            const avail = g.getAvailableActions();
            assert.strictEqual(JSON.stringify(g.snapshot()), snap, `seed ${seed} step ${i}: availability changed state (I9)`);
            assert.deepStrictEqual(JSON.parse(JSON.stringify(avail)), avail, 'JSON-safe (I2)');
            if (i % 3) return;
            for (const c of concrete(avail)) {
                const r = fork(g).act(c.action);
                checked++;
                if (c.enabled) assert.ok(r.ok, `seed ${seed}: enabled ${JSON.stringify(c.action)} refused: ${JSON.stringify(r.error)}`);
                else assert.deepStrictEqual([r.ok, r.error && r.error.code], [false, c.code], `seed ${seed}: disabled ${JSON.stringify(c.action)} -> ${JSON.stringify(r.error)}`);
            }
        });
    }
    assert.ok(checked > 1000, `checked ${checked} option/target pairs`);
});

test('Phase 1: typing a command and act() with the parsed action change the game identically (I12)', () => {
    let compared = 0;
    for (let seed = 1; seed <= 12; seed++) {
        botRun(seed, 30, (g) => {
            if (g.mode !== 'combat' || !g.combat.awaitingPlayer || g.combat.awaitingContinue) return;
            const living = g.alive(g.combat.enemies);
            for (const c of concrete(g.getAvailableActions())) {
                const a = c.action;
                let text = null;
                if (a.type === 'attack') text = `attack ${living.findIndex((e) => e.id === a.targetId) + 1}`;
                else if (a.type === 'skill' && a.targetIds) text = `${a.skillId} ${a.targetIds.map((id) => living.findIndex((e) => e.id === id) + 1).join(',')}`;
                else if (a.type === 'skill') text = a.targetId ? `${a.skillId} ${living.findIndex((e) => e.id === a.targetId) + 1}` : a.skillId;
                else if (a.type === 'use_item') text = `use ${a.item}`;
                else if (a.type === 'flee') text = 'flee';
                if (!text) continue;
                const x = fork(g), y = fork(g);
                const viaText = texts(x.input(text)).slice(1);           // drop the "> command" echo
                const viaAct = texts(y.act(a).events);
                assert.strictEqual(x.snapshot().json, y.snapshot().json, `seed ${seed}: '${text}' vs ${JSON.stringify(a)}`);
                assert.deepStrictEqual(viaAct, viaText, `seed ${seed}: same text for '${text}'`);
                compared++;
            }
        });
    }
    assert.ok(compared > 200, `compared ${compared} commands`);
});

test('Phase 1: bots choosing only enabled actions never hit an internal error and always get the turn back (I15)', () => {
    for (let seed = 30; seed < 60; seed++) {
        const g = botRun(seed, 120);
        assert.ok(['class_select', 'explore', 'combat', 'branch_select', 'game_over', 'won'].includes(g.mode), g.mode);
        if (g.mode === 'combat') assert.ok(g.combat.awaitingPlayer, `seed ${seed}: control returns to the player`);
    }
});

test('Phase 1: a skipped turn offers only Continue; Soul Chain takes targetIds with a pick count', () => {
    const g = newGame(1).do('warrior', 'n', 'engage');
    g.applyStatus(g.combat.enemies[0], g.player, { name: 'Stun', type: 'skip_turn', duration: 1 });
    g.act({ type: 'attack', targetId: 'enemy_0' });
    if (g.combat && g.combat.awaitingContinue) {
        const a = g.getAvailableActions();
        assert.deepStrictEqual([a.awaiting, a.actions], ['continue', [{ type: 'continue', enabled: true }]]);
        assert.strictEqual(g.act({ type: 'attack', targetId: 'enemy_1' }).error.code, 'WRONG_MODE');
        assert.ok(g.act({ type: 'continue' }).ok);
    }
    if (!data.skillDefinitions['Soul Chain']) return;  // Soulbinder (PR #52)
    const s = newGame(13).do('necromancer', 'add_xp 250', 'soulbinder', 'n', 'engage');
    s.player.resource.current = s.player.resource.max;
    const chain = find(s, 'skill', 'Soul Chain');
    assert.deepStrictEqual([chain.targeting, chain.pick], ['enemy_multiple', { min: 2, max: 2 }]);
    assert.strictEqual(s.act({ type: 'skill', skillId: 'Soul Chain', targetIds: ['enemy_0', 'enemy_0'] }).error.code, 'INVALID_TARGET');
    const r = s.act({ type: 'skill', skillId: 'Soul Chain', targetIds: ['enemy_0', 'enemy_2'] });
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.match(texts(r.events).join('\n'), /Soul Chain binds/);
});

test('Phase 1: Shield Bash availability carries the QA-2/QA-16 stun notes without disabling it', () => {
    const g = newGame(7).do('warrior', 'add_xp 250', 'vanguard', 'e', 'engage');
    g.player.resource.current = 1;
    let bash = find(g, 'skill', 'Shield Bash');
    assert.ok(bash.enabled);
    assert.deepStrictEqual(bash.notes, [{ code: 'STUN_NEEDS_RESOURCE', message: 'No stun: needs 3 Oath Points.' }]);
    g.player.resource.current = 3;
    g.combat.enemies[2].shieldBashRecovery = 'await_recovery';
    bash = find(g, 'skill', 'Shield Bash');
    assert.strictEqual(bash.notes, undefined);
    const t = bash.targets.find((x) => x.id === 'enemy_2');
    assert.deepStrictEqual([t.enabled, t.notes[0].code], [true, 'STUN_NOT_ELIGIBLE']);
});

test('Phase 1: Assassinate is checked per target (too healthy on one enemy, allowed on another)', () => {
    const g = newGame(1).do('rogue', 'add_xp 2000', 'assassin', 'n', 'engage');
    const name = Object.keys(data.skillDefinitions).find((k) => (data.skillDefinitions[k].effects || []).some((e) => e.type === 'execute_below' || e.threshold));
    if (!name) return;
    if (!g.player.skills.includes(name)) g.player.skills.push(name);
    g.player.resource.current = g.player.resource.max = 99;
    g.combat.enemies[1].hp = 1;
    const opt = find(g, 'skill', name);
    const byId = Object.fromEntries(opt.targets.map((t) => [t.id, t]));
    assert.strictEqual(byId.enemy_1.enabled, true);
    assert.deepStrictEqual([byId.enemy_0.enabled, byId.enemy_0.reason.code], [false, 'REQUIREMENT_FAILED']);
    assert.match(byId.enemy_0.reason.message, /too healthy/);
    assert.strictEqual(fork(g).act({ type: 'skill', skillId: name, targetId: 'enemy_0' }).error.code, 'REQUIREMENT_FAILED');
});

test('Phase 1: world intents are actions; the old method names still work; flags stay per run (§6A, I17)', () => {
    const g = newGame(5).do('warrior');
    const rooms = JSON.stringify(g.rooms);
    assert.ok(g.act({ type: 'enter_world' }).ok);
    assert.deepStrictEqual(options(g).map((o) => o.type), [], 'no text-game rooms in world mode (and nothing usable at full HP)');
    assert.ok(g.act({ type: 'world_pickup', pickupId: 'shed_bandages', item: 'Bandages' }).ok);
    assert.strictEqual(g.act({ type: 'world_pickup', pickupId: 'shed_bandages', item: 'Bandages' }).error.code, 'ALREADY_COLLECTED');
    assert.match(texts(g.worldPickup('shed_bandages', 'Bandages')).join(), /nothing left here/, 'wrapper unchanged');
    assert.ok(g.act({ type: 'world_encounter', encounterId: 'road_wolf', enemies: ['hungry_wolf'] }).ok);
    assert.strictEqual(g.act({ type: 'world_pickup', pickupId: 'x', item: 'Bandages' }).error.code, 'WRONG_MODE');
    for (let i = 0; i < 50 && g.mode === 'combat'; i++) g.act(g.combat.awaitingContinue ? { type: 'continue' } : { type: 'attack' });
    assert.ok(g.isDefeated('road_wolf'));
    assert.strictEqual(g.act({ type: 'world_encounter', encounterId: 'road_wolf', enemies: ['hungry_wolf'] }).error.code, 'ALREADY_DEFEATED');
    assert.strictEqual(JSON.stringify(g.rooms), rooms, 'the text-game rooms are untouched');
});

test('Phase 1: act() is a transaction: an internal error rolls back and reports INTERNAL_ERROR (C11)', () => {
    const d = JSON.parse(JSON.stringify(data));
    d.skillDefinitions['Bad Purge'] = { name: 'Bad Purge', cost: 0, effects: [{ type: 'cleanse' }], target: 'self' };
    const h = new GameEngine({ seed: 1, data: d }); h.start(); h.input('warrior'); h.input('n'); h.input('engage');
    h.player.skills.push('Bad Purge');
    const before = h.snapshot().json;
    const r = h.act({ type: 'skill', skillId: 'Bad Purge' });
    assert.deepStrictEqual([r.ok, r.error.code], [false, 'INTERNAL_ERROR']);
    assert.strictEqual(h.snapshot().json, before, 'nothing changed');
    assert.ok(h.act({ type: 'attack', targetId: 'enemy_0' }).ok, 'and the game goes on');
});

test('Phase 1: the world battle menu shows exactly what the engine allows, with its reasons (I18)', () => {
    const BM = require('../ui/battle-menu.js');
    let seen = 0;
    for (let seed = 1; seed <= 16; seed++) {
        botRun(seed, 40, (g) => {
            if (g.mode !== 'combat' || !g.combat.awaitingPlayer) return;
            const avail = g.getAvailableActions();
            const state = g.getState();
            const root = BM.entries(avail, 'root');
            if (avail.awaiting === 'continue') { assert.deepStrictEqual(root.map((e) => e.kind), ['continue']); return; }
            for (const view of ['skills', 'items']) {
                for (const e of BM.entries(avail, view)) {
                    assert.strictEqual(e.disabled, !e.option.enabled, `${e.label}: menu and engine agree`);
                    if (e.disabled) assert.ok(e.sub.includes(e.option.reason.message), `${e.label}: shows the engine's reason`);
                    seen++;
                }
            }
            const attack = root.find((e) => e.kind === 'attack');
            assert.strictEqual(attack.disabled, !avail.actions.find((o) => o.type === 'attack').enabled);
            // every action the menu can send is one the engine accepts (single targets via their entries)
            for (const o of avail.actions.filter((x) => x.enabled && (x.type === 'attack' || x.type === 'skill'))) {
                const mode = BM.targetMode(o);
                const ids = mode === 'single' ? [BM.targetEntries(o, state).find((t) => !t.disabled).id]
                    : mode === 'multi' ? o.targets.slice(0, o.pick.max).map((t) => t.id) : undefined;
                const r = fork(g).act(BM.actionFor(o, ids));
                assert.ok(r.ok, `${o.skillId}: ${JSON.stringify(r.error)}`);
            }
        });
    }
    assert.ok(seen > 300, `checked ${seen} menu entries`);
});
