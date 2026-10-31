// Gauge (2026-10-31): buffs in timed fights last realtimeRules.statuses.buffs[name].seconds and stack to maxStacks.
// A recast adds one stack and refreshes the timer; damage reduction multiplies per stack; a charge buff spends one
// stack per use. Turn mode never reads the table. Spec: docs/design/BALANCE_BUFFS.md.
const { test, assert, GameEngine, data, assertHealthy } = require('./helpers.js');

const BUFFS = data.realtimeRules.statuses.buffs;
function newton(cls = 'warrior', seed = 1) {
    const g = new GameEngine({ seed, combatMode: 'realtime' });
    g.start(); g.input(cls); g.input('engage');
    g.player.hp = g.player.maxHp = 99999;
    g.player.resource.current = g.player.resource.max = 99;
    g.run = (ms, step = 100) => { for (let t = 0; t < ms && g.mode === 'combat'; t += step) g.tick(Math.min(step, ms - t)); };
    return g;
}

test('Every buff in the table lasts at least 6 s and stacks to at least 1 (no 3 s buffs left)', () => {
    for (const [name, b] of Object.entries(BUFFS)) {
        if (b.seconds != null) assert.ok(b.seconds >= 6, `${name}: ${b.seconds} s`);
        assert.ok(b.maxStacks >= 1, `${name}: maxStacks ${b.maxStacks}`);
    }
});

test('Guard in a real-time fight: lasts its table seconds, a recast adds a stack (cap 2) and refreshes the timer', () => {
    const g = newton();
    assert.ok(g.act({ type: 'skill', skillId: 'Guard' }).ok);
    let st = g.findStatus(g.player, 'Guard');
    assert.strictEqual(st.rtTotalMs, BUFFS.Guard.seconds * 1000);
    assert.strictEqual(st.stacks, 1);
    g.run(g.rtCooldownMs('Guard') + 100);
    assert.ok(g.act({ type: 'skill', skillId: 'Guard' }).ok);
    st = g.findStatus(g.player, 'Guard');
    assert.strictEqual(st.stacks, 2);
    assert.strictEqual(st.rtEndsAt - g.combat.rt.now, BUFFS.Guard.seconds * 1000, 'refreshed to full');
    g.run(g.rtCooldownMs('Guard') + 100);
    assert.ok(g.act({ type: 'skill', skillId: 'Guard' }).ok);
    assert.strictEqual(g.findStatus(g.player, 'Guard').stacks, BUFFS.Guard.maxStacks, 'capped');
    g.run(BUFFS.Guard.seconds * 1000 + 100);
    assert.ok(!g.findStatus(g.player, 'Guard'), 'all stacks run out together');
    assertHealthy(g);
});

test('Damage reduction multiplies per stack: two 25% Guards take 100 to 56', () => {
    const g = newton();
    const foe = g.combat.enemies[0];
    g.applyStatus(g.player, g.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    g.applyStatus(g.player, g.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    const hp = g.player.hp;
    g.secondarySoulDamage(g.player, 100, foe);
    assert.strictEqual(hp - g.player.hp, 56);
});

test('Charge buffs spend one stack per use: Mirror Image (3) eats three hits, the fourth lands', () => {
    const g = newton('mage');
    const foe = g.combat.enemies[0];
    for (let i = 0; i < 4; i++) g.applyStatus(g.player, g.player, { name: 'Mirror Image', type: 'dodge', value: 1, duration: 1 });
    assert.strictEqual(g.findStatus(g.player, 'Mirror Image').stacks, 3, 'capped at 3');
    for (let i = 0; i < 3; i++) assert.strictEqual(g.hitConnects(foe, g.player), false, `image ${i + 1}`);
    assert.ok(!g.findStatus(g.player, 'Mirror Image'));
    assert.strictEqual(g.hitConnects(foe, g.player), true);
});

test('Bone Wall (2) absorbs two hits, one stack each', () => {
    const g = newton('necromancer');
    const foe = g.combat.enemies[0];
    for (let i = 0; i < 2; i++) g.applyStatus(g.player, g.player, { name: 'Bone Wall', type: 'absorb', duration: 1 });
    assert.strictEqual(g.hitConnects(foe, g.player), false);
    assert.strictEqual(g.findStatus(g.player, 'Bone Wall').stacks, 1);
    assert.strictEqual(g.hitConnects(foe, g.player), false);
    assert.ok(!g.findStatus(g.player, 'Bone Wall'));
});

test('Turn mode is untouched: Guard and Evasion stay one stack', () => {
    const g = new GameEngine({ seed: 1 });
    g.start(); g.input('warrior'); g.input('engage');
    g.applyStatus(g.player, g.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    g.applyStatus(g.player, g.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    const st = g.findStatus(g.player, 'Guard');
    assert.strictEqual(st.stacks, 1);
    assert.strictEqual(g.maxStacks('Evasion'), 1);
});
