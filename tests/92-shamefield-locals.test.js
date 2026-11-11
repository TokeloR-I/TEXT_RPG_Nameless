// Get to know the locals (Tokelo, 2026-11-02): the Watch Captain's quest after the register (L01), and the six
// Shamefield side quests it counts (SF1-SF6; since 2026-11-04 it gates the orchard and SF6 teaches cooking), played through the real world model + engine. SF1, Bread and Beer,
// is the first real use of the homestead planting and crafting rules (src/engine/exploration.js).
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const { takeExit, inspect, contact, travel } = require('./world-helpers.js');

const lines = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text);
function win(g) {
    for (let i = 0; i < 100 && g.mode === 'combat'; i++) {
        for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1;
        const a = g.getAvailableActions();
        if (a.awaiting === 'continue') g.act({ type: 'continue' });
        else { const t = g.alive(g.combat.enemies)[0]; g.act({ type: 'attack', targetId: t.id }); }
    }
    assert.strictEqual(g.world.lastResult, 'victory');
}
function fight(g, s, id) { settle(g); const r = contact(s, id); assert.strictEqual(r.type, 'encounter', `${id}: ${JSON.stringify(r).slice(0, 200)}`); win(g); s.fightOver(id, 'victory'); }
/** Level 3 can arrive mid-errand: take the path choice so the world goes on. */
function settle(g) { if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: Object.keys(data.evolutionPaths[g.player.className].branches)[0] }); }
function talk(s, objId) { settle(s.engine); const r = inspect(s, objId); assert.strictEqual(r.type, 'talk', `${objId}: ${JSON.stringify(r).slice(0, 200)}`); return r; }
function say(g, re) {
    const a = g.getAvailableActions();
    const c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(a.actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const has = (g, re) => ((g.getAvailableActions().actions) || []).some((x) => x.type === 'dialogue_choice' && re.test(x.text));
const bye = (g) => { const r = g.act({ type: 'dialogue_leave' }); settle(g); return r; };
const count = (g, item) => g.player.inventory.filter((i) => i === item).length;

/** A run that has just handed the register to the Watch Captain (Q05 complete). */
function afterRegister(cls = 'warrior', seed = 7) {
    const g = new GameEngine({ seed });
    g.start();
    g.act({ type: 'choose_class', classId: cls });
    g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    const s = new WorldSession(ZONE1, { engine: g });
    inspect(s, 'cellar_inscription'); travel(s, 'house'); travel(s, 'grounds'); inspect(s, 'grounds_foundation'); travel(s, 'road');
    travel(s, 'tollway');
    talk(s, 'tollway_elian'); say(g, /going on to the village/); say(g, /Goodbye/);
    fight(g, s, 'tollway_ragpickers'); fight(g, s, 'tollway_root_chewers');
    takeExit(s, 'tollway_south');
    talk(s, 'village_tamsin'); bye(g);
    talk(s, 'village_mara'); say(g, /carry supplies/); bye(g);
    talk(s, 'village_tamsin'); say(g, /Mara sent/); bye(g);
    talk(s, 'village_captain'); bye(g);
    travel(s, 'tollway'); fight(g, s, 'tollway_strongbox_looters'); inspect(s, 'tollway_register');
    travel(s, 'shamefield');
    const r = talk(s, 'village_captain'); say(g, /Here it is/);
    return { g, s, r };
}

test('Locals: the world still validates, and every new station names a story station', () => {
    assert.deepStrictEqual(validateWorld(ZONE1, data, STORY), []);
    const bad = JSON.parse(JSON.stringify(ZONE1));
    bad.maps.shamefield.interactables.find((o) => o.kind === 'station').station = 'nowhere';
    assert.ok(validateWorld(bad, data, STORY).some((e) => /unknown story station 'nowhere'/.test(e)));
});

test('Locals: returning the register gets a lazy Captain who keeps the gate shut until you take his deal', () => {
    const { g, s, r } = afterRegister();
    assert.strictEqual(g.questState('Q05'), 'complete');
    assert.strictEqual(g.questState('Q06'), 'unseen', 'no orchard yet');
    assert.ok(!g.hasStoryFlag('north_gate_open'), 'the register alone opens nothing');
    assert.strictEqual(g.questState('L01'), 'unseen', 'nothing starts until you agree');
    const said = g.getAvailableActions().dialogue.lines.map((l) => l.text).join(' ');
    assert.match(said, /Thanks for the ledger[\s\S]*forged papers[\s\S]*Help a couple of them/);
    say(g, /Just open the gate/);
    assert.strictEqual(g.questState('L01'), 'unseen', 'refusing changes nothing');
    say(g, /I'll help them/);
    assert.match(g.getAvailableActions().dialogue.lines.map((l) => l.text).join(' '), /beer isn't going to drink itself\. \*hic\*/);
    assert.strictEqual(g.questState('L01'), 'active');
    assert.strictEqual(g.getJournal().quests.find((q) => q.id === 'L01').kind, 'side', 'optional since the Broken Crown rework');
    for (const id of ['SF1', 'SF2', 'SF3', 'SF4', 'SF5', 'SF6']) assert.strictEqual(g.questState(id), 'available', id);
    const j = g.getJournal().quests.find((q) => q.id === 'L01');
    assert.strictEqual(j.objective.text, 'Help six Shamefield households (0/6)');
    say(g, /Who needs help/);
    assert.match(g.getAvailableActions().dialogue.lines.map((l) => l.text).join(' '), /Greta Rusk has lost her pigs[\s\S]*eat like animals/);
    bye(g);
    // Walking off without the deal is fine too: the Captain asks again next time.
    const later = afterRegister('rogue', 9);
    bye(later.g);
    assert.strictEqual(later.g.questState('L01'), 'unseen');
    talk(later.s, 'village_captain'); say(later.g, /I'll help them/);
    assert.strictEqual(later.g.questState('L01'), 'active');
    assert.ok(r && s);
});

test('Locals: a run that returned the register before this quest existed is offered it by the Captain', () => {
    const { g, s } = afterRegister();
    bye(g);
    for (const id of ['L01', 'SF1', 'SF2', 'SF3', 'SF4', 'SF5', 'SF6']) g.story.quests[id] = { state: 'unseen', step: 0 };
    talk(s, 'village_captain'); say(g, /I'll help them/);
    assert.strictEqual(g.questState('L01'), 'active');
    assert.strictEqual(g.questState('SF3'), 'available');
});

test('Locals: a run that took the deal before A Proper Meal existed is offered it when it asks the Captain', () => {
    const { g, s } = afterRegister();
    say(g, /I'll help them/); bye(g);
    g.story.quests.SF6 = { state: 'unseen', step: 0 };
    talk(s, 'village_captain'); bye(g);
    assert.strictEqual(g.questState('SF6'), 'available');
});

test('Locals: a run that finished the locals on five favours, before A Proper Meal existed, is offered it by Oda on load (bug hunt 2026-11-07)', () => {
    const { g } = afterRegister();
    bye(g);
    // As an older save had it: L01 done, SF6 never heard of, and this catch-up not yet run.
    g.story.quests.L01 = { state: 'complete', step: 2 };
    g.story.quests.SF6 = { state: 'unseen', step: 0 };
    g.story.claimed = g.story.claimed.filter((k) => k !== 'catchup:sf6_offer');
    const c = GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())));
    assert.strictEqual(c.questState('SF6'), 'available');
    const s2 = new WorldSession(ZONE1, { engine: c, map: 'village_residential_lane', spawn: Object.keys(ZONE1.maps.village_residential_lane.spawns)[0] });
    talk(s2, 'lane_oda');
    assert.ok(has(c, /eat like an animal/), 'Oda offers A Proper Meal');
    // A new game never runs it (the deal offers SF6 itself).
    const fresh = new GameEngine({ seed: 1 }); fresh.start();
    assert.ok(fresh.story ? fresh.story.claimed.includes('catchup:sf6_offer') : true);
});

test('Locals: A Proper Meal teaches the hearth and eating, with what Oda hands you', () => {
    const { g, s } = afterRegister();
    say(g, /I'll help them/); bye(g);
    travel(s, 'village_residential_lane');
    talk(s, 'lane_oda'); say(g, /eat like an animal/); bye(g);
    assert.strictEqual(g.questState('SF6'), 'active');
    assert.ok(g.player.inventory.includes('Brötchen') && g.player.inventory.includes('Pork'));
    talk(s, 'lane_oda');
    assert.ok(!has(g, /I cooked/), 'nothing to report before you eat');
    bye(g);
    travel(s, 'grounds'); talk(s, 'grounds_hearth'); say(g, /Cook Leberkäsbrötchen/); bye(g);
    assert.strictEqual(g.currentObjective('SF6').id, 'eat');
    assert.ok(g.act({ type: 'use_item', item: 'Leberkäsbrötchen' }).ok);
    assert.strictEqual(g.currentObjective('SF6').id, 'oda');
    travel(s, 'village_residential_lane'); talk(s, 'lane_oda'); say(g, /I cooked/); bye(g);
    assert.strictEqual(g.questState('SF6'), 'complete');
    assert.strictEqual(count(g, 'Brezel'), 2);
    assert.match(data.itemDefinitions['Brötchen'].description, /Leberkäsbrötchen/, 'the roll says what to make of it');
});

test('Locals: all six favours, in the corners of Shamefield, count toward the Captain, who pays once and opens the gate', () => {
    const { g, s } = afterRegister('mage', 11);
    say(g, /I'll help them/); bye(g);
    const progress = () => g.getJournal().quests.find((q) => q.id === 'L01').objective.text;

    // SF4 Singing at the Mill: the falls on the west bank were walled off before; the lane behind the slate house opens them.
    talk(s, 'village_tamsin'); say(g, /troubling the village/); bye(g);
    assert.strictEqual(g.questState('SF4'), 'active');
    assert.ok(!s.visibleObjects().some((o) => o.id === 'mill_shade'), 'nothing sings until you go and listen');
    inspect(s, 'village_mill_bottles');
    fight(g, s, 'mill_shade');
    talk(s, 'village_tamsin'); say(g, /mill is quiet/); bye(g);
    assert.strictEqual(g.questState('SF4'), 'complete');
    assert.strictEqual(progress(), 'Help six Shamefield households (1/6)');

    // SF3 Pigs at Large: three pigs in three corners, then Greta.
    travel(s, 'village_residential_lane'); talk(s, 'lane_greta'); say(g, /lost some pigs/); bye(g);
    travel(s, 'shamefield');
    for (const id of ['stray_pig_bridge', 'stray_pig_houses', 'stray_pig_church']) {
        assert.ok(s.visibleObjects().some((o) => o.id === id), `${id} is out`);
        inspect(s, id);
        assert.ok(!s.visibleObjects().some((o) => o.id === id), `${id} went home`);
    }
    travel(s, 'village_residential_lane'); talk(s, 'lane_greta'); say(g, /on their way home/); bye(g);
    assert.strictEqual(g.questState('SF3'), 'complete');

    // SF5 Names for the Bell: Elian's letter goes in the box at the church door.
    travel(s, 'shamefield'); talk(s, 'village_elian'); say(g, /church/); bye(g);
    assert.ok(g.player.inventory.includes("Elian's Letter"));
    const door = talk(s, 'village_church_door'); say(g, /Leave Elian's letter/);
    assert.strictEqual(door.type, 'talk');
    assert.ok(!g.player.inventory.includes("Elian's Letter"));
    talk(s, 'village_elian'); say(g, /letter is at the church/); bye(g);
    assert.strictEqual(g.questState('SF5'), 'complete');

    // SF2 The Brown Hops: roots, granary, the rats on the south lawn, then Fenric.
    travel(s, 'briarwell_cloister_court');
    talk(s, 'cloister_fenric'); say(g, /hops look sick/); say(g, /find out what's eating/); bye(g);
    assert.ok(!s.visibleObjects().some((o) => o.id === 'cloister_rat_nest'), 'the nest waits for the tracks');
    const roots = inspect(s, 'cloister_hops');
    assert.match(lines(roots).join('\n'), /rust-red fur/);
    inspect(s, 'cloister_granary');
    fight(g, s, 'cloister_rat_nest');
    talk(s, 'cloister_fenric'); say(g, /It was rats/); bye(g);
    assert.strictEqual(g.questState('SF2'), 'complete');
    assert.strictEqual(progress(), 'Help six Shamefield households (4/6)');

    // SF1 Bread and Beer: plant, tend, harvest, gather, brew, mill, bake, share.
    travel(s, 'village_residential_lane'); talk(s, 'lane_oda'); say(g, /at it again/); bye(g);
    assert.ok(g.player.inventory.includes('Sourdough Starter'));
    travel(s, 'briarwell_cloister_court');
    talk(s, 'cloister_garden_bed');
    assert.ok(!has(g, /Plant/), 'the bed is not yours to dig yet');
    bye(g);
    talk(s, 'cloister_merrow'); say(g, /garden bed/);
    assert.ok(g.player.inventory.includes('Barley Seed'));
    say(g, /Dig Briarwell garden bed \(free\)/);
    assert.ok(g.player.homestead.built.briarwell_bed);
    bye(g);
    talk(s, 'cloister_garden_bed');
    assert.ok(!has(g, /Harvest/));
    say(g, /Plant the Barley Seed/);
    assert.strictEqual(g.plotState('briarwell_bed'), 'growing');
    say(g, /Water and weed/); say(g, /Water and weed/);
    assert.ok(!has(g, /Water and weed/), 'nothing left to tend');
    say(g, /Harvest the barley/);
    assert.strictEqual(count(g, 'Barley'), 2, 'one seed, two barley');
    bye(g);
    talk(s, 'cloister_fenric');
    const early = say(g, /Brew a cask/);
    assert.ok(early.events.some((e) => e.type === 'refusal' || /lack crafting ingredients/i.test(e.text || '')), 'no hops yet: refused by the crafting rule');
    assert.strictEqual(count(g, 'Barley'), 2, 'a refused brew spends nothing');
    bye(g);
    travel(s, 'shamefield');
    inspect(s, 'village_wild_hops');
    inspect(s, 'village_rye');
    talk(s, 'village_watermill'); say(g, /Grind the rye/); bye(g);
    assert.ok(g.player.inventory.includes('Rye Flour'));
    travel(s, 'briarwell_cloister_court');
    talk(s, 'cloister_fenric'); say(g, /Brew a cask/); bye(g);
    assert.ok(g.player.inventory.includes('Briarwell Pale'));
    travel(s, 'village_residential_lane'); talk(s, 'lane_oda'); say(g, /Bake a rye loaf/); bye(g);
    assert.ok(g.player.inventory.includes('Shamefield Rye Loaf'));
    travel(s, 'briarwell_cloister_court'); talk(s, 'cloister_fenric'); say(g, /Oda baked you this/); bye(g);
    travel(s, 'village_residential_lane'); talk(s, 'lane_oda'); say(g, /Fenric brewed you this/); bye(g);
    assert.strictEqual(g.questState('SF1'), 'complete');
    assert.strictEqual(g.currentObjective('L01').id, 'favours', 'five of six is not enough');

    // SF6 A Proper Meal: cook at the homestead hearth, eat, tell Oda.
    talk(s, 'lane_oda'); say(g, /eat like an animal/); bye(g);
    travel(s, 'grounds'); talk(s, 'grounds_hearth'); say(g, /Cook Leberkäsbrötchen/); bye(g);
    assert.ok(g.act({ type: 'use_item', item: 'Leberkäsbrötchen' }).ok);
    travel(s, 'village_residential_lane'); talk(s, 'lane_oda'); say(g, /I cooked/); bye(g);
    assert.strictEqual(g.questState('SF6'), 'complete');

    // Six of six: report to the Captain, who opens the gate.
    assert.strictEqual(g.currentObjective('L01').id, 'report');
    travel(s, 'shamefield');
    const gold = g.player.gold;
    talk(s, 'village_captain'); say(g, /I know the locals now/); bye(g);
    assert.strictEqual(g.questState('L01'), 'complete');
    assert.strictEqual(g.player.gold, gold + 15);
    assert.ok(g.hasStoryFlag('shamefield_friend'));
    assert.ok(g.hasStoryFlag('north_gate_open'), 'the gate opens');
    assert.strictEqual(g.questState('C1-N02'), 'complete', 'the village vouched for you, so no evidence was needed');
    assert.strictEqual(g.questState('C1-N04'), 'active', 'and the main road goes on');
    talk(s, 'village_captain'); bye(g);
    assert.strictEqual(g.player.gold, gold + 15, 'paid once');
    assert.deepStrictEqual(g.player.inventory.filter((i) => ['Barley', 'Wild Hops', 'Rye Sheaf', 'Rye Flour', 'Sourdough Starter', 'Briarwell Pale', 'Shamefield Rye Loaf', 'Barley Seed'].includes(i)), [], 'every ingredient went into something');
});

test('Locals: planting, harvesting and crafting fire story events from the text commands too', () => {
    const { g } = afterRegister();
    bye(g);
    g.act({ type: 'dialogue_leave' });
    g.player.homestead = { built: { briarwell_bed: true }, plots: {} };
    g.player.inventory.push('Barley Seed');
    assert.ok(g.act({ type: 'plant', plotId: 'briarwell_bed', seed: 'Barley Seed' }).ok);
    assert.ok(g.story.seen.includes('plant:Barley Seed'));
    g.act({ type: 'tend', plotId: 'briarwell_bed' }); g.act({ type: 'tend', plotId: 'briarwell_bed' });
    assert.ok(g.act({ type: 'harvest', plotId: 'briarwell_bed' }).ok);
    assert.ok(g.story.seen.includes('harvest:Barley'));
    g.player.inventory.push('Wild Hops');
    assert.ok(g.act({ type: 'craft', recipeId: 'brew_briarwell_pale' }).ok);
    assert.ok(g.story.seen.includes('craft:brew_briarwell_pale'));
});

// ---------------------------------------------------------------------------------------------------------------
// The same fights in the live world (combat v3 action sim on the 16 px maps world.html plays).
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD16 = doubleWorld(ZONE1);
function liveFight(mapId, encounterId, prepare, seed = 92) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    g.player.hp = g.player.maxHp = 99999;
    prepare(g);
    const s = new WorldSession(WORLD16, { engine: g });
    s.place(mapId, Object.keys(WORLD16.maps[mapId].spawns)[0]);
    const enc = WORLD16.maps[mapId].encounters.find((e) => e.id === encounterId);
    const free = [[enc.x + 3, enc.y], [enc.x - 3, enc.y], [enc.x, enc.y + 3], [enc.x, enc.y - 3], [enc.x + 2, enc.y + 2]].find(([x, y]) => !s.solidForAction(x, y));
    [s.x, s.y] = free;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    const mine = () => sim.actors.filter((a) => a.encounterId === encounterId);
    assert.ok(mine().length === enc.enemies.length, `${encounterId}: ${enc.enemies.length} bodies in the world`);
    for (let i = 0; i < 60 * 90 && !g.isDefeated(encounterId); i++) {
        const tgt = mine().find((a) => !a.dead) || sim.player;
        const d = Math.hypot(tgt.x - sim.player.x, tgt.y - sim.player.y);
        const mv = d > 14 ? { x: (tgt.x - sim.player.x) / d, y: (tgt.y - sim.player.y) / d } : { x: 0, y: 0 };
        sim.update(1000 / 60, { move: mv, aim: { x: tgt.x, y: tgt.y }, attack: i % 6 === 0 });
    }
    assert.ok(g.isDefeated(encounterId), `${encounterId} beaten in the world`);
    assert.strictEqual(g.mode, 'explore');
    return { g, s, sim };
}

test('Locals live: the four strongbox looters fight in the world, then the strongbox opens (16 px, action sim)', () => {
    const { g, s } = liveFight('tollway', 'tollway_strongbox_looters', (g) => { g.story.quests.Q05 = { state: 'active', step: 1 }; });
    const box = s.map.interactables.find((o) => o.id === 'tollway_register');
    assert.strictEqual(s.guardOf(box), null, 'no guards left on the box');
    assert.strictEqual(g.story.quests.Q05.step, 2, 'the quest moved on to taking the register');
});

test('Locals live: the singing shades on the reopened mill falls and the granary rats fight in the world', () => {
    liveFight('shamefield', 'mill_shade', (g) => { g.story.quests.SF4 = { state: 'active', step: 1 }; g.story.flags.push('sf4_heard'); });
    liveFight('briarwell_cloister_court', 'cloister_rat_nest', (g) => { g.story.quests.SF2 = { state: 'active', step: 2 }; g.story.flags.push('sf2_tracks'); });
});

// The Broken Crown rework (2026-11-11, docs/design/CHAPTER_ONE_NARRATIVE_REWORK.md §5): never all six. Two households
// vouching for you is the village route north; the four left stay open with their own rewards.
test('Locals: two households are enough for the Captain to open the road; the other four stay optional', () => {
    const { g, s } = afterRegister('warrior', 12);
    say(g, /I'll help them/); bye(g);
    assert.strictEqual(g.questState('C1-N02'), 'active');
    talk(s, 'village_tamsin'); say(g, /troubling the village/); bye(g);
    inspect(s, 'village_mill_bottles'); fight(g, s, 'mill_shade');
    talk(s, 'village_tamsin'); say(g, /mill is quiet/); bye(g);
    talk(s, 'village_captain');
    assert.ok(!has(g, /Open the gate/), 'one household is not enough');
    bye(g);
    assert.ok(!g.hasStoryFlag('north_gate_open'));
    travel(s, 'village_residential_lane'); talk(s, 'lane_greta'); say(g, /lost some pigs/); bye(g);
    travel(s, 'shamefield');
    for (const id of ['stray_pig_bridge', 'stray_pig_houses', 'stray_pig_church']) inspect(s, id);
    travel(s, 'village_residential_lane'); talk(s, 'lane_greta'); say(g, /on their way home/); bye(g);
    travel(s, 'shamefield');
    const xp = g.player.xp, lvl = g.player.level;
    talk(s, 'village_captain'); say(g, /Open the gate/); bye(g);
    assert.ok(g.hasStoryFlag('north_gate_open'), 'two households vouched');
    assert.ok(g.hasStoryFlag('village_vouched'));
    assert.strictEqual(g.questState('C1-N02'), 'complete');
    assert.ok(g.player.xp !== xp || g.player.level !== lvl, 'The Ash on the Register pays its XP once');
    assert.strictEqual(g.questState('C1-N04'), 'active');
    assert.strictEqual(g.questState('L01'), 'active', 'Get to Know the Locals stays open for the other four');
    for (const id of ['SF1', 'SF2', 'SF5', 'SF6']) assert.strictEqual(g.questState(id), 'available', `${id} is still there to do`);
    assert.ok(!s.visibleObjects().some((o) => o.id === 'village_oath_courier'), 'no courier left waiting for a route you no longer need');
});
