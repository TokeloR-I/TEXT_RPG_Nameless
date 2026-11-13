// The Hrimvald kitchen (Tokelo, 2026-11-13: "a bar with mead ... local food found in the norse area with relevant
// buffs and also a prank quest for surströmming"; then "make sure the player can make the food in the region, let the
// home hearth be the one with all recipes for all regions ... only exception is rat related food", a hearth in the
// chapter 2 areas, and a portable hearth taught on the road). Spec: docs/design/NORSE_KITCHEN.md.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const CH2 = require('../src/story/chapter2.js');
const { inspect } = require('./world-helpers.js');

const items = data.itemDefinitions, recipes = data.recipeDefinitions, FOOD = data.foodRules;
const NORSE = Object.entries(recipes).filter(([, r]) => r.region === 'hrimvald');
const count = (g, item) => g.player.inventory.filter((i) => i === item).length;
const give = (g, item, n = 1) => { for (let i = 0; i < n; i++) g.player.inventory.push(item); };

/** A Chapter Two character (Chapter One done) standing on `map`. */
function run(map = 'skeldvik', spawn = 'from_pass') {
    const g = new GameEngine({ seed: 101, combatMode: 'action' });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07']) g.story.quests[q].state = 'complete';
    g.story.flags.push('chapter_one_complete', 'north_gate_open', 'caravan_saved', 'eydis_in_skeldvik');
    g.player.gold = 500;
    const s = new WorldSession(ZONE1, { engine: g });
    s.place(map, spawn);
    g.act({ type: 'world_enter', mapId: map });   // arriving tells the story where you are, as a transition does
    return { g, s };
}
function talk(s, id) { const r = inspect(s, id); assert.strictEqual(r.type, 'talk', `${id}: ${JSON.stringify(r).slice(0, 200)}`); return r; }
function say(g, re) {
    const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(g.getAvailableActions().actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const has = (g, re) => (g.getAvailableActions().actions || []).some((x) => x.type === 'dialogue_choice' && re.test(x.text));
const menu = (g) => g.getAvailableActions().kitchen.recipes.map((r) => r.id);
const leave = (g) => { while (g.story.dialogue) g.act({ type: 'dialogue_leave' }); };

// ---------------------------------------------------------------- data
test('Norse kitchen data: Hrimvald dishes and mead, every buff at most 3 minutes, mead behaves like beer', () => {
    assert.ok(NORSE.length >= 8, `${NORSE.length} Norse hearth recipes`);
    for (const name of ['Mead', 'Lingonberry Mead', 'Juniper Ale', 'Surströmming', 'Fårikål', 'Gravlax', 'Skyr']) {
        const d = items[name];
        assert.ok(d && (d.use === 'meal' || d.use === 'drink'), `${name} is food`);
        if (d.mods) assert.ok(d.seconds > 0 && d.seconds <= FOOD.maxSeconds && data.statusDefinitions[name], `${name}: own status, ≤ 3 min`);
    }
    assert.strictEqual(items.Mead.use, 'drink');
    assert.strictEqual(data.statusDefinitions.Mead.maxStacks, FOOD.drinkStacks, 'mead stacks like beer');
    // Dairy stays bought (Tokelo): skyr and sour cream are never farmed.
    for (const d of ['Skyr', 'Sour Cream']) assert.ok(!Object.values(data.cropDefinitions).some((c) => c.produces === d) && data.shopDefinitions.gudrun.stock[d], `${d} is bought`);
    for (const id of ['solveig', 'aslaug', 'gudrun']) assert.ok(STORY.npcs[id].nodes[Object.keys(STORY.npcs[id].nodes)[0]].choices.some((c) => (c.effects || []).some((e) => e.shop === id)), `${id} has a shop`);
    assert.ok(Object.values(recipes).some((r) => r.station === 'meadery' && r.output === 'Mead'), 'mead is brewed at the Stormtide');
    assert.strictEqual(recipes.cook_rattengulasch.region, 'any', 'rat goulash cooks anywhere (Tokelo)');
});

test('Norse kitchen world: hearths, sellers and berries stand on chapter 2 maps only, and the world validates', () => {
    assert.deepStrictEqual(validateWorld(ZONE1, data, STORY), []);
    const where = {};
    for (const [mid, m] of Object.entries(ZONE1.maps)) for (const o of m.interactables || []) where[o.id] = { mid, o };
    for (const id of ['skeldvik_cookfire', 'hrafnholm_feast_fire', 'skeldvik_aslaug', 'hrafnholm_gudrun', 'frostspine_juniper', 'frostspine_lingonberries', 'frostspine_cloudberries'])
        assert.ok(where[id] && FOOD.regions.hrimvald.maps.includes(where[id].mid), `${id} is in Hrimvald`);
    assert.strictEqual(STORY.npcs.harbour_cookfire.region, 'hrimvald');
    assert.strictEqual(STORY.npcs.feast_fire.region, 'hrimvald');
});

// ---------------------------------------------------------------- regional cooking
test('Regional cooking: Hrimvald hearths cook Norse food (and rat goulash), Chapter One public hearths do not, home cooks all', () => {
    const { g, s } = run();
    talk(s, 'skeldvik_cookfire');
    const here = menu(g);
    for (const [id] of NORSE) assert.ok(here.includes(id), `cookfire offers ${id}`);
    assert.ok(here.includes('cook_rattengulasch'), 'rat goulash everywhere');
    assert.ok(!here.includes('cook_schnitzel') && !here.includes('cook_bratwurst'), 'no German dishes at a Norse hearth');
    // Cooking a Norse dish works; asking for a German one is refused with the same code everywhere.
    give(g, 'Mutton'); give(g, 'Cabbage', 2);
    assert.ok(g.act({ type: 'cook', recipeId: 'cook_farikal' }).ok);
    assert.strictEqual(count(g, 'Fårikål'), 2);
    give(g, 'Pork');
    const r = g.act({ type: 'cook', recipeId: 'cook_bratwurst' });
    assert.ok(!r.ok);
    assert.strictEqual(count(g, 'Pork'), 1, 'nothing used up');
    assert.ok(!has(g, /Bratwurst/), 'no dialogue choice for a German dish either');
    leave(g);
    // The public Chapter One hearths cook only Chapter One's food; the home hearth cooks every region's.
    const lane = STORY.npcs.lane_hearth, home = STORY.npcs.homestead_hearth;
    assert.ok(!g.hearthCooks(lane, recipes.cook_farikal) && g.hearthCooks(lane, recipes.cook_schnitzel) && g.hearthCooks(lane, recipes.cook_rattengulasch));
    assert.ok(g.hearthCooks(home, recipes.cook_farikal) && g.hearthCooks(home, recipes.cook_schnitzel));
    assert.ok(!JSON.stringify(lane).includes('Fårikål') && JSON.stringify(home).includes('Fårikål'), 'menus are built per region');
});

// ---------------------------------------------------------------- the camp kit (C2S2)
test('A Fire of Your Own (C2S2): Hakon trades his spare camp kit for juniper; it cooks the food of where you stand', () => {
    const { g, s } = run('frostspine_pass', 'from_road');
    talk(s, 'frostspine_hakon'); say(g, /How do you eat out here/);
    assert.strictEqual(g.questState('C2S2'), 'active');
    leave(g);
    inspect(s, 'frostspine_juniper');
    assert.strictEqual(count(g, 'Juniper Berries'), 1);
    talk(s, 'frostspine_hakon'); say(g, /Juniper, for your tinder/); leave(g);
    assert.strictEqual(g.questState('C2S2'), 'complete');
    assert.strictEqual(count(g, 'Camp Kit'), 1);
    // In Hrimvald the camp cooks Norse food; the kit isn't used up.
    const use = g.getAvailableActions().actions.find((a) => a.type === 'use_item' && a.item === 'Camp Kit');
    assert.ok(use && use.enabled, 'the kit is usable out of a fight');
    g.act({ type: 'use_item', item: 'Camp Kit' });
    assert.strictEqual(g.story.dialogue.npcId, 'camp_hearth');
    assert.ok(menu(g).includes('cook_farikal') && !menu(g).includes('cook_schnitzel') && menu(g).includes('cook_rattengulasch'));
    give(g, 'Herring', 2);
    say(g, /Smoked Herring/);
    assert.strictEqual(count(g, 'Smoked Herring'), 2);
    leave(g);
    assert.strictEqual(count(g, 'Camp Kit'), 1);
    // Back in Chapter One's lands the same kit cooks Chapter One's food.
    g.act({ type: 'world_enter', mapId: 'road' });
    g.act({ type: 'use_item', item: 'Camp Kit' });
    assert.ok(menu(g).includes('cook_schnitzel') && !menu(g).includes('cook_farikal'));
    give(g, 'Pork');
    say(g, /Bratwurst/);
    assert.strictEqual(count(g, 'Bratwurst'), 2);
    assert.ok(!has(g, /Fårikål/));
    leave(g);
});

// ---------------------------------------------------------------- mead and the prank (C2S1)
test('Aslaug sells and brews mead at the Stormtide; mead stacks, and the fifth drink still makes you Drunk', () => {
    const { g, s } = run();
    talk(s, 'skeldvik_aslaug'); say(g, /What have you got/);
    assert.ok(g.act({ type: 'buy', shopId: 'aslaug', item: 'Mead' }).ok);
    give(g, 'Honey', 2);
    say(g, /Brew 2 Mead/);
    assert.strictEqual(count(g, 'Mead'), 3);
    leave(g);
    for (let i = 0; i < 3; i++) g.act({ type: 'use_item', item: 'Mead' });
    assert.strictEqual(g.player.statusEffects.find((x) => x.name === 'Mead').stacks, 3);
    assert.ok(g.foodMod(g.player, 'damage') >= 0.36 - 1e-9);
    give(g, 'Juniper Ale', 2);
    g.act({ type: 'use_item', item: 'Juniper Ale' });
    assert.ok(!g.controlsInverted());
    g.act({ type: 'use_item', item: 'Juniper Ale' });
    assert.ok(g.controlsInverted(), 'the fifth horn tilts the floor');
});

test('Sour Herring (C2S1): Solveig, Leif, Geir and a tapped cask; the reeve looks the other way', () => {
    const { g, s } = run();
    g.story.flags.push('eydis_harbor_met', 'solveig_told');
    talk(s, 'skeldvik_solveig'); say(g, /smiling at that narrow ship/); say(g, /Give me the cask/); leave(g);
    assert.strictEqual(g.questState('C2S1'), 'active');
    assert.strictEqual(count(g, 'Cask of Surströmming'), 1);
    // The gangplank: watched while Geir sits on it, and the cask needs Leif's awl.
    talk(s, 'skeldvik_gangplank'); assert.ok(!has(g, /Tap the cask/)); leave(g);
    talk(s, 'skeldvik_leif'); say(g, /cooper's awl/); leave(g);
    give(g, 'Mead');
    talk(s, 'skeldvik_geir'); say(g, /A mead, to the six hundred/); leave(g);
    assert.strictEqual(count(g, 'Mead'), 0, 'Geir drinks it');
    talk(s, 'skeldvik_gangplank'); say(g, /Tap the cask/); leave(g);
    assert.strictEqual(count(g, 'Cask of Surströmming'), 0);
    talk(s, 'skeldvik_thora'); assert.ok(has(g, /smell on the wharf/)); leave(g);
    talk(s, 'skeldvik_solveig'); say(g, /whole ship is weeping/); leave(g);
    assert.strictEqual(g.questState('C2S1'), 'complete');
    assert.strictEqual(count(g, 'Surströmming'), 2);
    // Eating it: a strong, long meal buff.
    g.act({ type: 'use_item', item: 'Surströmming' });
    assert.ok(g.foodMod(g.player, 'defence') >= items['Surströmming'].mods.defence - 1e-9);
    // The gangplank only exists while the prank is on.
    assert.strictEqual(ZONE1.maps.skeldvik.interactables.find((o) => o.id === 'skeldvik_gangplank').when.quests.C2S1, 'active');
});

test('Sour Herring: lying to Geir about the dues works too, and a save mid-prank carries on', () => {
    const { g, s } = run();
    g.story.flags.push('eydis_harbor_met', 'solveig_told');
    talk(s, 'skeldvik_solveig'); say(g, /smiling at that narrow ship/); say(g, /Give me the cask/); leave(g);
    talk(s, 'skeldvik_geir'); say(g, /mooring dues/); leave(g);
    const saved = JSON.parse(JSON.stringify(g.serialize()));
    const g2 = new GameEngine({ seed: 7, combatMode: 'action' });
    assert.ok(g2.load(saved).ok);
    assert.strictEqual(g2.questState('C2S1'), 'active');
    assert.ok(g2.hasStoryFlag('geir_distracted') && g2.player.inventory.includes('Cask of Surströmming'));
});
