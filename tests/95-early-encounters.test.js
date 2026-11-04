// Early encounters you can't stroll past (Tokelo's playtest, 2026-11-04): the Overgrown Road wolf leads a pack of
// three and is its mini boss, the Homestead rats wait by the only way to the road, and a night in the homestead bed
// brings both back as hunting grounds, so a player can reach level 4 to 5 before the Crow Warden.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const ZONE1 = require('../src/world/zone1.js');
const { inspect } = require('./world-helpers.js');
const WORLD = doubleWorld(ZONE1);
const STEP = 1000 / 60;
const enc = (map, id) => ZONE1.maps[map].encounters.find((e) => e.id === id);

test('Road wolf: a pack of four, led by the Hungry Wolf with more HP than any of its three pack wolves', () => {
    const e = enc('road', 'road_wolf');
    assert.deepStrictEqual(e.enemies, ['hungry_wolf', 'pack_wolf', 'pack_wolf', 'pack_wolf']);
    const alpha = data.enemies.hungry_wolf, pack = data.enemies.pack_wolf;
    assert.ok(alpha.maxHp > pack.maxHp, 'the leader is the mini boss');
    assert.strictEqual(alpha.tier, 'elite');
    assert.strictEqual(alpha.lootRank, 'elite');
    assert.ok(data.actionRules.enemies.pack_wolf, 'the pack wolves have an action profile of their own');
});

/** Walk the action player through waypoints given in original (32 px) tiles; returns true once a fight starts. */
function walkEngages(mapId, spawn, points) {
    const g = new GameEngine({ seed: 95, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    s.place(mapId, spawn);
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 95 });
    for (const [ox, oy] of points) {
        const tx = (ox * 2 + 1) * 16, ty = (oy * 2 + 1) * 16;
        for (let i = 0; i < 60 * 20; i++) {
            if (g.mode === 'combat') return true;
            const p = sim.player, d = Math.hypot(tx - p.x, ty - p.y);
            if (d < 4) break;
            sim.update(STEP, { move: { x: (tx - p.x) / d, y: (ty - p.y) / d } });
        }
    }
    return g.mode === 'combat';
}

test('Road wolf: walking the road in either direction brings the pack onto you', () => {
    assert.ok(walkEngages('road', 'from_grounds', [[16, 3], [15, 8], [14, 12], [14, 16], [15, 20]]), 'heading south to the tollway');
    assert.ok(walkEngages('road', 'from_tollway', [[15, 18], [14, 15], [14, 12], [15, 8], [16, 2]]), 'coming back north');
});

test('Homestead rats: every way from the house to the road passes them', () => {
    assert.ok(walkEngages('grounds', 'from_house', [[14, 9], [14, 16], [14, 18], [20, 18], [20, 20]]), 'through the west gap');
    assert.ok(walkEngages('grounds', 'from_house', [[14, 9], [20, 9], [25, 11], [25, 13], [20, 16], [20, 18], [20, 20]]), 'through the east gap');
});

test('Hunting grounds: a night in the homestead bed brings back the rats and the wolf pack, nothing else', () => {
    const g = new GameEngine({ seed: 7 });
    g.start();
    g.act({ type: 'choose_class', classId: 'rogue' });
    g.act({ type: 'enter_world' });
    g.player.homestead = { built: { homestead_gate: true }, plots: {} };
    g.world.defeated.push('grounds_weed_rats', 'road_wolf', 'tollway_ragpickers');
    const s = new WorldSession(ZONE1, { engine: g, map: 'house', spawn: 'from_grounds' });
    inspect(s, 'house_bed');
    const sleep = (g.getAvailableActions().actions || []).find((a) => a.type === 'dialogue_choice' && /Sleep until morning/.test(a.text));
    assert.ok(sleep, 'the bed offers sleep');
    g.act({ type: 'dialogue_choice', choiceId: sleep.choiceId });
    for (const id of data.gameRules.restRespawns) assert.ok(!g.isDefeated(id), `${id} is back`);
    assert.ok(g.isDefeated('tollway_ragpickers'), 'a story gate stays beaten');
    assert.deepStrictEqual([...data.gameRules.restRespawns].sort(), ['grounds_weed_rats', 'road_wolf']);
});
