// Chapter Two world (Tokelo's pictures, 2026-11-13): the uplands east of the Silent Field (C2-S07 The Winter Hunt) and
// the Wolf-Banner war camp up the uplands' north-east trail (C2-06 The Wolf's Bargain). The quests themselves are built
// in their own thread; this checks the places, the roads between them, the ids those quests hook on, and the crow.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const CH2 = require('../src/story/chapter2.js');
const SA = require('../ui/scene-art.js');
require('../ui/scene-hrimvald.js');
const { takeExit, inspect } = require('./world-helpers.js');

function run(extra = []) {
    const g = new GameEngine({ seed: 105 });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07', 'Q08', 'C201', 'C202', 'C203']) g.story.quests[q].state = 'complete';
    g.story.flags.push('chapter_one_complete', 'aspect_nahemoth', 'thing_heard', ...extra);
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('hrafnholm', 'from_skeldvik');
    return { g, s };
}
const leave = (g) => { while (g.story.dialogue) g.act({ type: 'dialogue_leave' }); };

test('Uplands and war camp: valid maps, painted whole, in Hrimvald for the cook pot', () => {
    assert.deepStrictEqual(validateWorld(ZONE1, data, STORY), []);
    for (const id of ['uplands', 'wolfbanner_camp']) {
        const m = ZONE1.maps[id];
        assert.strictEqual(m.scene, id);
        assert.ok(SA.scenes[id], `${id}: a scene painter`);
        assert.ok(data.foodRules.regions.hrimvald.maps.includes(id), `${id}: cooks Hrimvald's dishes`);
    }
    // Every Hrimvald map is in the region, so the camp kit cooks the North's food anywhere in the North.
    for (const [id, m] of Object.entries(ZONE1.maps)) if (/^hrimvald_/.test(m.zoneId)) assert.ok(data.foodRules.regions.hrimvald.maps.includes(id), id);
    assert.ok(!ZONE1.maps.silent_field.boundaries.some((b) => b.id === 'silent_field_east_path'), 'the east path is a road now');
});

test('Uplands and war camp: up the Silent Field\'s east path, the north-east trail to the camp, and back down', () => {
    const { s } = run();
    takeExit(s, 'hrafnholm_silent_field'); assert.strictEqual(s.mapId, 'silent_field');
    takeExit(s, 'silent_field_east_path'); assert.strictEqual(s.mapId, 'uplands');
    takeExit(s, 'uplands_camp_trail'); assert.strictEqual(s.mapId, 'wolfbanner_camp');
    takeExit(s, 'camp_south_road'); assert.strictEqual(s.mapId, 'uplands');
    takeExit(s, 'uplands_west_trail'); assert.strictEqual(s.mapId, 'silent_field');
});

test('Uplands and war camp: the objects C2-06 and C2-S07 hook on are where the quest thread expects them', () => {
    const ids = (m) => new Set([...ZONE1.maps[m].interactables, ...ZONE1.maps[m].encounters].map((o) => o.id));
    for (const id of ['uplands_tracks', 'uplands_stand', 'uplands_den', 'uplands_den_smoke']) assert.ok(ids('uplands').has(id), id);
    for (const id of ['camp_table', 'camp_cart', 'camp_cage', 'camp_hearth', 'camp_torvald']) assert.ok(ids('wolfbanner_camp').has(id), id);
    const smoke = ZONE1.maps.uplands.interactables.find((o) => o.id === 'uplands_den_smoke');
    assert.deepStrictEqual(smoke.when, { flags: ['greymane_drive'] });
    const torvald = ZONE1.maps.wolfbanner_camp.interactables.find((o) => o.id === 'camp_torvald');
    assert.deepStrictEqual(torvald.when, { flags: ['torvald_at_camp'], notFlags: ['bargain_made'] });
});

test('War camp: the cookfire cooks the North\'s dishes, and it is not the portable camp kit', () => {
    const { g, s } = run();
    s.place('wolfbanner_camp', 'from_uplands');
    const f = inspect(s, 'camp_hearth');
    assert.strictEqual(f.type, 'talk'); assert.strictEqual(f.npc, 'warcamp_fire');
    assert.strictEqual(STORY.npcs.warcamp_fire.region, 'hrimvald');
    assert.ok(!STORY.npcs.warcamp_fire.portable);
    const menu = g.getAvailableActions().kitchen.recipes.map((x) => x.id);
    assert.ok(menu.includes('cook_farikal') && !menu.includes('cook_schnitzel'), menu.join(','));
    leave(g);
});

test('Black Flight: the War Memorial attunes Hrafnholm, the lore\'s fourth anchor', () => {
    const { g, s } = run();
    assert.ok(!g.hasStoryFlag('anchor:hrafnholm'));
    inspect(s, 'hrafnholm_memorial');
    assert.ok(g.hasStoryFlag('anchor:hrafnholm'));
    const a = CH2.anchors.hrafnholm;
    assert.ok(a && ZONE1.maps[a.map].spawns[a.spawn]);
    for (const id of ['skeldvik', 'hrafnholm', 'runadal', 'silent_field']) assert.ok(CH2.anchors[id], id);
});
