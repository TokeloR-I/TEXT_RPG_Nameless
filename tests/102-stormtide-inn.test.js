/* The Stormtide Inn, Skeldvik's meeting hall (Tokelo, 2026-11-13: "a hall or something people can meet up", built
 * after Tokelo's interior picture): in under the sign, Aslaug across her counter, the long fire cooks Hrimvald's
 * food, the tafl players talk, and out the way you came. */
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const { walkTo, takeExit, inspect } = require('./world-helpers.js');

function run(world = ZONE1) {
    const g = new GameEngine({ seed: 102, combatMode: 'action' });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07']) g.story.quests[q].state = 'complete';
    g.story.flags.push('chapter_one_complete', 'north_gate_open', 'caravan_saved', 'eydis_in_skeldvik');
    g.player.gold = 500;
    const s = new WorldSession(world, { engine: g });
    s.place('skeldvik', 'from_pass');
    g.act({ type: 'world_enter', mapId: 'skeldvik' });
    return { g, s };
}
const say = (g, re) => {
    const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(g.getAvailableActions().actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
};
const leave = (g) => { while (g.story.dialogue) g.act({ type: 'dialogue_leave' }); };
const lines = (r) => JSON.stringify(r.events || []);

test('Stormtide Inn: the map is valid, painted, in Skeldvik and in Hrimvald for cooking', () => {
    assert.deepStrictEqual(validateWorld(ZONE1, data, STORY), []);
    const inn = ZONE1.maps.stormtide_inn;
    assert.strictEqual(inn.scene, 'stormtide_inn');
    assert.strictEqual(inn.zoneId, 'hrimvald_skeldvik');
    assert.ok(data.foodRules.regions.hrimvald.maps.includes('stormtide_inn'));
    assert.strictEqual(STORY.npcs.stormtide_hearth.region, 'hrimvald');
    assert.ok(!ZONE1.maps.skeldvik.interactables.some((o) => o.id === 'skeldvik_aslaug'), 'Aslaug no longer waits outside');
});

test('Stormtide Inn: in under the sign, Aslaug across the counter, the long fire, the tafl players, and out again', () => {
    const { g, s } = run();
    const r = takeExit(s, 'skeldvik_inn_entry');
    assert.strictEqual(r.type, 'transition');
    assert.strictEqual(s.mapId, 'stormtide_inn');
    // Aslaug stands behind her bar; you talk to her from the room side, facing the counter.
    walkTo(s, 8, 11); s.move('left');
    assert.strictEqual(s.x, 8, 'the counter stops you');
    const a = s.interact();
    assert.strictEqual(a.type, 'talk'); assert.strictEqual(a.npc, 'aslaug');
    say(g, /What have you got/);
    assert.ok(g.act({ type: 'buy', shopId: 'aslaug', item: 'Mead' }).ok, 'mead from the bar');
    leave(g);
    // The long fire cooks Hrimvald's dishes, not Chapter One's.
    const f = inspect(s, 'stormtide_hearth');
    assert.strictEqual(f.type, 'talk');
    const menu = g.getAvailableActions().kitchen.recipes.map((x) => x.id);
    assert.ok(menu.includes('cook_farikal') && !menu.includes('cook_schnitzel'), menu.join(','));
    leave(g);
    // The regulars.
    assert.strictEqual(inspect(s, 'stormtide_halli').type, 'talk'); say(g, /What are you playing/); leave(g);
    assert.strictEqual(inspect(s, 'stormtide_sveinn').type, 'talk'); assert.ok(/king/.test(lines(say(g, /play the king/)))); leave(g);
    assert.ok(/king/.test(inspect(s, 'stormtide_tafl').text));
    // Out the way you came, in front of the inn.
    assert.strictEqual(takeExit(s, 'stormtide_out').type, 'transition');
    assert.strictEqual(s.mapId, 'skeldvik');
    assert.deepStrictEqual([s.x, s.y], [24, 10]);
});

test('Stormtide Inn (16 px world): Aslaug still answers across the counter, and the doorway works both ways', () => {
    const { doubleWorld } = require('../src/world/scale16.js');
    const W16 = doubleWorld(ZONE1);
    const { s } = run(W16);
    assert.strictEqual(takeExit(s, 'skeldvik_inn_entry').type, 'transition');
    assert.strictEqual(s.mapId, 'stormtide_inn');
    walkTo(s, 16, 22); s.move('left');
    assert.strictEqual(s.x, 16);
    const a = s.interact();
    assert.strictEqual(a.type, 'talk'); assert.strictEqual(a.npc, 'aslaug');
    s.engine.act({ type: 'dialogue_leave' });
    assert.strictEqual(takeExit(s, 'stormtide_out').type, 'transition');
    assert.strictEqual(s.mapId, 'skeldvik');
});
