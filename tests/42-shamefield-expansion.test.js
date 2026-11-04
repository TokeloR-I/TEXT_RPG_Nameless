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
            if (!s.present(o)) continue;          // quest-only things (they come with their quest)
            const r = inspect(s, o.id);
            assert.ok(r && r.type !== 'none', `${o.id} responds`);
            if (o.kind === 'npc' || o.kind === 'station') {
                assert.strictEqual(g.getAvailableActions().awaiting, 'dialogue', `${o.id} talks`);
                g.act({ type: 'dialogue_leave' });
            }
        }
    }
    assert.strictEqual(g.player.xp, xp); assert.strictEqual(g.player.gold, gold); assert.strictEqual(g.player.inventory.length, inv);
});

test('Shamefield rebuild: every quest marker in the square stands on the villager or thing it points at', () => {
    const story = require('../src/story/chapter1.js');
    const map = ZONE1.maps.shamefield;
    let n = 0;
    for (const q of Object.values(story.quests)) for (const o of q.objectives || []) {
        if (!o.marker || o.marker.map !== 'shamefield') continue;
        n++;
        const on = (i) => o.marker.x >= i.x && o.marker.y >= i.y && o.marker.x < i.x + (i.w || 1) && o.marker.y < i.y + (i.h || 1);   // the watermill is 4×4
        assert.ok([...map.interactables, ...(map.encounters || [])].some(on), `${o.id}: marker ${o.marker.x},${o.marker.y}`);
    }
    assert.ok(n >= 6);
});

test('Kloster rebuild: every quest marker in the Kloster stands on the villager or thing it points at', () => {
    const story = require('../src/story/chapter1.js');
    const map = ZONE1.maps.briarwell_cloister_court;
    let n = 0;
    for (const q of Object.values(story.quests)) for (const o of q.objectives || []) {
        if (!o.marker || o.marker.map !== 'briarwell_cloister_court') continue;
        n++;
        assert.ok([...map.interactables, ...(map.encounters || [])].some((i) => i.x === o.marker.x && i.y === o.marker.y), `${o.id}: marker ${o.marker.x},${o.marker.y}`);
    }
    assert.ok(n >= 8);
});

test("Baker's Lane rebuild: Oda and Greta's quest markers stand on them, and every lane thing can be reached", () => {
    const story = require('../src/story/chapter1.js');
    const map = ZONE1.maps.village_residential_lane;
    let n = 0;
    for (const q of Object.values(story.quests)) for (const o of q.objectives || []) {
        if (!o.marker || o.marker.map !== 'village_residential_lane') continue;
        n++;
        assert.ok(map.interactables.some((i) => i.x === o.marker.x && i.y === o.marker.y), `${o.id}: marker ${o.marker.x},${o.marker.y}`);
    }
    assert.ok(n >= 3);
    const { s } = village();
    s.place('village_residential_lane', 'from_village');
    for (const o of map.interactables) {
        s.place('village_residential_lane', 'from_village');
        assert.ok(inspect(s, o.id).type !== 'none', `${o.id} can be reached and responds`);
        if (o.kind === 'npc') s.engine.act({ type: 'dialogue_leave' });
    }
});

test('Watermill (Tokelo, 2026-11-04): the whole lower mill answers E, at the front door too, in the 32 px and 16 px worlds', () => {
    const { doubleWorld } = require('../src/world/scale16.js');
    const story = require('../src/story/chapter1.js');
    for (const [world, k] of [[ZONE1, 1], [doubleWorld(ZONE1), 2]]) {
        const g = new GameEngine({ seed: 4 });
        g.start(); g.act({ type: 'choose_class', classId: 'mage' }); g.act({ type: 'enter_world' });
        const s = new WorldSession(world, { engine: g });
        s.place('shamefield', 'from_tollway');
        // In front of the door (32 px: 6,14), facing up; and by the east wall (8,11), facing left.
        for (const [x, y, facing] of [[6, 14, 'up'], [7, 14, 'up'], [8, 11, 'left'], [3, 10, 'right']]) {
            s.x = x * k + (facing === 'right' ? k - 1 : 0); s.y = y * k; s.facing = facing;   // the cell of the block nearest the mill
            assert.ok(!s.isBlocked(s.x, s.y), `${x},${y} is open ground`);
            const p = s.prompt();
            assert.ok(p && p.kind === 'station' && p.name === 'Old watermill', `${k === 2 ? '16' : '32'} px, ${x},${y} ${facing}: ${JSON.stringify(p)}`);
        }
        s.x = 6 * k; s.y = 14 * k; s.facing = 'up';
        assert.strictEqual(s.interact().type, 'talk');
        assert.ok(g.getAvailableActions().actions.some((a) => a.type === 'dialogue_choice'), 'the mill opens its choices');
    }
    // The quest marker stands on the mill's front.
    const mark = story.quests.SF1.objectives.find((o) => o.id === 'mill').marker;
    assert.deepStrictEqual([mark.x, mark.y], [6, 13]);
});

test('Watermill: without rye during Bread and Beer it says where the rye is; with a sheaf it grinds flour', () => {
    const { g, s } = village();
    g.act({ type: 'unlock_events' });
    g.story.quests.SF1 = { state: 'active', done: [] };
    s.x = 6; s.y = 14; s.facing = 'up';
    s.interact();
    const no = g.getAvailableActions().actions.find((a) => a.type === 'dialogue_choice' && /no rye/.test(a.text));
    assert.ok(no, 'a hint choice');
    const r = g.act({ type: 'dialogue_choice', choiceId: no.choiceId });
    assert.ok(r.events.some((e) => /field fence behind the square/.test(e.text || '')));
    g.act({ type: 'dialogue_leave' });
    g.player.inventory.push('Rye Sheaf');
    s.interact();
    const grind = g.getAvailableActions().actions.find((a) => a.type === 'dialogue_choice' && /Grind the rye/.test(a.text));
    g.act({ type: 'dialogue_choice', choiceId: grind.choiceId });
    assert.ok(g.player.inventory.includes('Rye Flour'));
});
