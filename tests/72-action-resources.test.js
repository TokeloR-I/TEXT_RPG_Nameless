// Combat v3: skill resource recovery (Tokelo, 2026-10-31). A passive trickle in a fight, a fast refill out of one,
// and the pool is carried into the next fight. Numbers: actionRules.resources in src/data.js.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;

function engine(cls, mode = 'action') {
    const g = new GameEngine({ seed: 72, combatMode: mode });
    g.start(); g.input(cls); g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    return g;
}
const anEnemy = (g) => (g.data.enemies.rust_rat ? 'rust_rat' : Object.keys(g.data.enemies)[0]);

test('Necromancer: Soul Energy trickles in during a fight even without dealing damage (+1 every 4 s)', () => {
    const g = engine('necromancer');
    g.player.resource.current = 0;
    assert.ok(g.actionEngage('t', [anEnemy(g)]).ok);
    assert.strictEqual(g.player.resource.current, 1, 'startOfFight is still the floor');
    const events = [];
    for (let i = 0; i < 8; i++) events.push(...g.tick(1000));
    assert.strictEqual(g.player.resource.current, 3, '8 s of a fight: +2');
    assert.ok(events.some((e) => /You recover 1 Soul Energy/.test(e.text || '')));
});

test('Warrior: Momentum now builds in a fight, so Power Strike (2) comes up', () => {
    const g = engine('warrior');
    assert.ok(g.actionEngage('t', [anEnemy(g)]).ok);
    assert.strictEqual(g.player.resource.current, 1);
    for (let i = 0; i < 4; i++) g.tick(1000);
    assert.ok(g.player.resource.current >= 2, `Momentum ${g.player.resource.current}`);
});

test('A pool is carried into the next fight (start value is a floor, not a reset)', () => {
    const g = engine('necromancer');
    g.player.resource.current = 7;
    assert.ok(g.actionEngage('t', [anEnemy(g)]).ok);
    assert.strictEqual(g.player.resource.current, 7);
});

test('A resource with no recovery rule keeps the old reset to startOfFight', () => {
    const g = engine('necromancer');
    const pools = g.data.actionRules.resources.pools;
    const saved = pools['Soul Energy'];
    delete pools['Soul Energy'];
    try {
        g.player.resource.current = 7;
        assert.ok(g.actionEngage('t', [anEnemy(g)]).ok);
        assert.strictEqual(g.player.resource.current, 1);
    } finally { pools['Soul Energy'] = saved; }
});

test('Out of a fight the pool refills: Soul Energy 0 -> 10 in about 10 s of walking', () => {
    const g = engine('necromancer');
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 72 });
    sim.groups = {}; sim.actors = []; sim.syncEncounters = () => {};   // nobody on the map
    g.player.resource.current = 0;
    for (let i = 0; i < 120; i++) sim.update(STEP, {});
    assert.strictEqual(g.player.resource.current, 2, 'after 2 s: enough for Raise Skeleton');
    for (let i = 0; i < 600; i++) sim.update(STEP, {});
    assert.strictEqual(g.player.resource.current, 10, 'full, and never past max');
});

test('Out of a fight Momentum refills only to calmTo (2), not to max', () => {
    const g = engine('warrior');
    g.player.resource.current = 0;
    for (let i = 0; i < 20; i++) g.actionCalmRegen(1000);
    assert.strictEqual(g.player.resource.current, 2);
    g.player.resource.current = 5;   // more than calmTo is kept, not drained
    g.actionCalmRegen(1000);
    assert.strictEqual(g.player.resource.current, 5);
});

test('The calm refill does nothing in a fight, and the old modes are untouched', () => {
    const g = engine('necromancer');
    assert.ok(g.actionEngage('t', [anEnemy(g)]).ok);
    const before = g.player.resource.current;
    g.actionCalmRegen(10000);
    assert.strictEqual(g.player.resource.current, before);
    const rt = engine('necromancer', 'realtime');
    rt.player.resource.current = 7;
    rt.startCombat([anEnemy(rt)], 'x');
    assert.strictEqual(rt.player.resource.current, 1, 'v2 real-time still resets to startOfFight');
});
