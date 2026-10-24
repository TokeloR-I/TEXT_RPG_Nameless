// Shamefield expansion (SHAMEFIELD_VILLAGE_MAP_AND_IMPLEMENTATION_HANDOFF.md): the cloister courtyard and Baker's Lane
// are reachable from the square and back, every new villager talks, and nothing new pays XP or Gold.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const { walkTo, inspect } = require('./world-helpers.js');

function village() {
    const g = new GameEngine({ seed: 4 });
    g.start();
    g.act({ type: 'choose_class', classId: 'mage' });
    g.act({ type: 'enter_world' });
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('shamefield', 'from_tollway');
    return { g, s };
}
const mapOf = (s, id) => s.world.maps[id];

test('Shamefield expansion: the cloister and the lane are reachable from the square and lead back', () => {
    const { s } = village();
    for (const [exitId, mapId] of [['shamefield_cloister', 'briarwell_cloister_court'], ['shamefield_lane', 'village_residential_lane']]) {
        s.place('shamefield', 'from_tollway');
        const ex = mapOf(s, 'shamefield').exits.find((e) => e.id === exitId);
        const r = walkTo(s, ex.x, ex.y);
        assert.strictEqual(r.type, 'transition'); assert.strictEqual(s.mapId, mapId);
        assert.ok(r.text, 'a short first-arrival line');
        const back = mapOf(s, mapId).exits[0];
        assert.strictEqual(walkTo(s, back.x, back.y).to, 'shamefield');
    }
});

test('Shamefield expansion: the fountain and the old well are both still in the square', () => {
    const ids = mapOf(village().s, 'shamefield').interactables.map((o) => o.id);
    assert.ok(ids.includes('village_well') && ids.includes('village_fountain'));
});

test('Shamefield expansion: every new villager and inspectable responds, and none of it pays XP or Gold', () => {
    const { g, s } = village();
    const xp = g.player.xp, gold = g.player.gold, inv = g.player.inventory.length;
    for (const mapId of ['briarwell_cloister_court', 'village_residential_lane']) {
        s.place(mapId, 'from_village');
        for (const o of mapOf(s, mapId).interactables) {
            const r = inspect(s, o.id);
            assert.ok(r && r.type !== 'none', `${o.id} responds`);
            if (o.kind === 'npc') {
                assert.strictEqual(g.getAvailableActions().awaiting, 'dialogue', `${o.id} talks`);
                g.act({ type: 'dialogue_leave' });
            }
        }
    }
    assert.strictEqual(g.player.xp, xp); assert.strictEqual(g.player.gold, gold); assert.strictEqual(g.player.inventory.length, inv);
});
