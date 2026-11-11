// The rest of the Chapter One master brief (docs/design/CHAPTER_ONE_DEVELOPMENT_MASTER_BRIEF.md, Tokelo 2026-11-11),
// through the real world model + engine: C1-N03 The Festival in Ash (Oda's cooking lesson at the festival hearth, the
// memorial, the raid, protect or pursue and what each costs), Sergeant Kess at the orchard supply post (custody or
// release, remembered at the end), C1-N05 A Sanctuary Under Siege (and helping the Warden, which never buys the key),
// the four exploration secrets, and Shamefield talking among itself. Fights are forced wins: story, not balance.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const { takeExit, inspect, contact, travel } = require('./world-helpers.js');
const { storyRouteNorth } = require('../tools/lib/broken-oath-route.js');
const { runRoute } = require('../tools/lib/chapter-one-loot-route.js');

const lines = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text);
function settle(g) { if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: Object.keys(data.evolutionPaths[g.player.className].branches)[0] }); }
function win(g) {
    for (let i = 0; i < 200 && g.mode === 'combat'; i++) {
        for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1;
        const a = g.getAvailableActions();
        if (a.awaiting === 'continue') g.act({ type: 'continue' });
        else if (a.awaiting === 'turn_order') g.act({ type: 'turn_order', order: null });
        else g.act({ type: 'attack', targetId: g.alive(g.combat.enemies)[0].id });
    }
}
function fight(g, s, id) { settle(g); const r = contact(s, id); assert.strictEqual(r.type, 'encounter', `${id}: ${JSON.stringify(r).slice(0, 200)}`); win(g); const out = s.fightOver(id, 'victory'); settle(g); return out; }
function talk(s, objId) { settle(s.engine); const r = inspect(s, objId); assert.strictEqual(r.type, 'talk', `${objId}: ${JSON.stringify(r).slice(0, 200)}`); return r; }
function say(g, re) {
    const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(g.getAvailableActions().actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const has = (g, re) => ((g.getAvailableActions().actions) || []).some((x) => x.type === 'dialogue_choice' && re.test(x.text));
const bye = (g) => { const r = g.act({ type: 'dialogue_leave' }); settle(g); return r; };
const spoken = (g) => g.getAvailableActions().dialogue.lines.map((l) => l.text).join(' ');
const io = (g, s) => ({ say: (re) => say(g, re), bye: () => bye(g), settle: () => settle(g), fight: (id) => { fight(g, s, id); return true; } });
const visible = (s, id) => s.visibleObjects().some((o) => o.id === id);
const count = (g, item) => g.player.inventory.filter((i) => i === item).length;

function start(cls = 'warrior', seed = 5) {
    const g = new GameEngine({ seed });
    g.start();
    g.act({ type: 'choose_class', classId: cls });
    g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    return { g, s: new WorldSession(ZONE1, { engine: g }) };
}
/** From waking to C1-N03 active: the register returned, the story route north, the Captain's "after the festival". */
function toFestival(cls, seed) {
    const ctx = start(cls, seed);
    const { g, s } = ctx;
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
    talk(s, 'village_captain'); say(g, /Here it is/); say(g, /find out who forged/); bye(g);
    storyRouteNorth(g, s, io(g, s));
    assert.strictEqual(g.questState('C1-N03'), 'active');
    return ctx;
}

test('C1-N03: Oda teaches the meal at the festival hearth, once, and the buff is explained in its own numbers', () => {
    const { g, s } = toFestival('mage', 51);
    assert.strictEqual(g.currentObjective('C1-N03').id, 'lesson');
    assert.ok(visible(s, 'square_hearth'), 'the festival hearth stands by the raven tree');
    assert.ok(visible(s, 'village_festival_cask'), 'the square is dressed for the festival');
    talk(s, 'village_captain');
    assert.match(spoken(g), /Festival security\? I inspected the tavern\. Thoroughly\. Twice\./);
    bye(g);
    talk(s, 'village_tamsin');
    assert.match(spoken(g), /Nobody hears the names hungry/, 'no names before the meal');
    bye(g);
    travel(s, 'village_residential_lane');
    talk(s, 'lane_oda');
    if (!has(g, /festival tables/)) bye(g), talk(s, 'lane_oda');   // the overheard scene first, then her greeting
    say(g, /festival tables/);
    assert.match(spoken(g), /hearth by the raven tree/);
    bye(g);
    assert.deepStrictEqual([count(g, 'Brötchen'), count(g, 'Pork')], [1, 1], 'exactly what the recipe needs');
    talk(s, 'lane_oda');
    assert.ok(!has(g, /festival tables/), 'the lesson is given once');
    assert.ok(!has(g, /lost the roll/), 'no restock while you still have them');
    bye(g);
    // Lose them (sold, eaten, dropped): Oda restocks once, never twice.
    g.player.inventory = g.player.inventory.filter((i) => i !== 'Pork' && i !== 'Brötchen');
    talk(s, 'lane_oda'); say(g, /lost the roll/); bye(g);
    assert.deepStrictEqual([count(g, 'Brötchen'), count(g, 'Pork')], [1, 1]);
    g.player.inventory = g.player.inventory.filter((i) => i !== 'Pork');
    talk(s, 'lane_oda'); assert.ok(!has(g, /lost the roll/), 'one restock only'); bye(g);
    g.player.inventory.push('Pork');
    travel(s, 'shamefield');
    talk(s, 'square_hearth'); say(g, /Cook Leberkäsbrötchen/); bye(g);
    assert.strictEqual(g.currentObjective('C1-N03').id, 'eat');
    const ate = g.act({ type: 'use_item', item: 'Leberkäsbrötchen' });
    assert.ok(ate.ok);
    const said = lines(ate).join('\n');
    assert.match(said, /Heals 22; -6% damage taken for 150 s/, 'the explanation reads the meal\'s own numbers');
    assert.strictEqual(g.currentObjective('C1-N03').id, 'memorial');
    assert.ok(g.hasStoryFlag('festival_fed'));
});

test('C1-N03: protect the people: the stalls stand, the roll is lost (Kess has it), Greta thanks you', () => {
    const { g, s } = toFestival('warrior', 52);
    const ctxIo = io(g, s);
    travel(s, 'village_residential_lane');
    talk(s, 'lane_oda'); if (!has(g, /festival tables/)) bye(g), talk(s, 'lane_oda'); say(g, /festival tables/); bye(g);
    travel(s, 'shamefield');
    talk(s, 'square_hearth'); say(g, /Cook Leberkäsbrötchen/); bye(g);
    assert.ok(g.act({ type: 'use_item', item: 'Leberkäsbrötchen' }).ok);
    talk(s, 'village_tamsin');
    assert.match(spoken(g), /Festival of the Sun\. One year since the heroes broke the old crown/);
    say(g, /Read them/);
    assert.match(spoken(g), /Not the mug, the crossbow\. Gods, I need a better posting\./);
    say(g, /Protect the people/);
    assert.ok(visible(s, 'village_tamsin'));
    assert.ok(!s.visibleObjects().some((o) => o.id === 'village_festival_cask'), 'the festival is over once the raid starts');
    assert.ok(s.map.encounters.find((e) => e.id === 'festival_raiders'));
    talk(s, 'village_captain'); assert.match(spoken(g), /Mostly the right way round/); bye(g);
    ctxIo.fight('festival_raiders');
    assert.ok(g.hasStoryFlag('raid_over'));
    assert.ok(!g.hasStoryFlag('memorial_roll_saved'), 'the thief got away with the roll');
    assert.strictEqual(g.currentObjective('C1-N03').id, 'captain', 'the thief step was moot');
    const gold = g.player.gold;
    talk(s, 'village_captain');
    assert.match(spoken(g), /Everyone's breathing\. I counted them\. Twice, like the tavern\./);
    say(g, /go north/); bye(g);
    assert.strictEqual(g.questState('C1-N03'), 'complete');
    assert.ok(g.hasStoryFlag('north_gate_open'));
    assert.strictEqual(g.questState('C1-N04'), 'active');
    assert.strictEqual(g.player.gold, gold + 10, 'the festival supplies');
    assert.strictEqual(count(g, 'Bratwurst'), 1, 'Greta\'s thanks for the stall');
    assert.ok(!visible(s, 'village_wrecked_stall'), 'her stall stands');
    talk(s, 'village_tamsin'); assert.match(spoken(g), /You stood between them and the stalls/); bye(g);
    travel(s, 'village_residential_lane');
    talk(s, 'lane_greta');
    const greta = spoken(g);
    bye(g);
    if (!/Didn't even look at the sausages/.test(greta)) { talk(s, 'lane_greta'); assert.match(spoken(g), /Didn't even look at the sausages/); bye(g); }
    // Nothing twice.
    travel(s, 'shamefield');
    talk(s, 'village_captain'); bye(g);
    assert.strictEqual(g.player.gold, gold + 10);
    assert.strictEqual(g.story.claimed.filter((k) => k === 'quest:C1-N03').length, 1);
    // Kess had the roll.
    travel(s, 'orchard');
    for (const id of ['orchard_east_lookouts', 'orchard_west_lookouts']) fight(g, s, id);
    fight(g, s, 'orchard_kess');
    assert.ok(g.hasStoryFlag('memorial_roll_saved'), "the roll was in the sergeant's satchel");
});

test('C1-N03: pursue the thief: the roll is saved, but Greta\'s stall is wrecked and she says so', () => {
    const { g, s } = toFestival('rogue', 53);
    travel(s, 'village_residential_lane');
    talk(s, 'lane_oda'); if (!has(g, /festival tables/)) bye(g), talk(s, 'lane_oda'); say(g, /festival tables/); bye(g);
    travel(s, 'shamefield');
    talk(s, 'square_hearth'); say(g, /Cook Leberkäsbrötchen/); bye(g);
    assert.ok(g.act({ type: 'use_item', item: 'Leberkäsbrötchen' }).ok);
    talk(s, 'village_tamsin'); say(g, /Read them/); say(g, /Go after/);
    fight(g, s, 'festival_thief');
    assert.ok(g.hasStoryFlag('memorial_roll_saved'));
    assert.ok(visible(s, 'village_wrecked_stall'), 'the raid did its damage while you ran');
    talk(s, 'village_captain');
    assert.match(spoken(g), /You left my square to chase one man\?[\s\S]*Tactical\. I hate it\./);
    say(g, /go north/); bye(g);
    assert.ok(g.hasStoryFlag('north_gate_open'), 'both choices reach Corvin');
    assert.strictEqual(count(g, 'Bratwurst'), 0);
    travel(s, 'village_residential_lane');
    let heard = '';
    for (let i = 0; i < 3 && !/firewood/.test(heard); i++) { talk(s, 'lane_greta'); heard = spoken(g); bye(g); }
    assert.match(heard, /My stall's firewood\. Mara's got six stitches/);
    talk(s, 'lane_greta'); assert.ok(has(g, /What have you got/), 'she still sells to you'); bye(g);
});

test('C1-N03: cooking and eating for A Proper Meal during C1-N02 never skips the forged-register hunt', () => {
    const ctx = start('necromancer', 54);
    const { g, s } = ctx;
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
    talk(s, 'village_captain'); say(g, /Here it is/); say(g, /I'll help them/); bye(g);
    travel(s, 'village_residential_lane');
    talk(s, 'lane_oda'); if (!has(g, /eat like an animal/)) bye(g), talk(s, 'lane_oda'); say(g, /eat like an animal/); bye(g);
    travel(s, 'grounds'); talk(s, 'grounds_hearth'); say(g, /Cook Leberkäsbrötchen/); bye(g);
    assert.ok(g.act({ type: 'use_item', item: 'Leberkäsbrötchen' }).ok);
    assert.strictEqual(g.questState('C1-N02'), 'active', 'a meal is not a main-quest step');
    assert.strictEqual(g.questState('C1-N03'), 'unseen');
});

test('Sergeant Kess: an elite at the orchard supply post who yields; custody or release is remembered at the end', () => {
    assert.strictEqual(data.enemies.oath_sergeant.tier, 'elite');
    assert.ok(data.actionRules.enemies.oath_sergeant.attacks.every((a) => data.enemies.oath_sergeant.skills.some((k) => k.name === a.skill)), 'every attack uses a real skill');
    const endings = {};
    for (const [kess, seed] of [['capture', 61], ['release', 62]]) {
        const r = runRoute({ cls: 'warrior', seed, forced: true, buy: false, stopBeforeBoss: true, kess, festival: 'pursue' });
        assert.strictEqual(r.where, null);
        const { g, s } = r;
        assert.ok(g.hasStoryFlag('kess_beaten') && g.hasStoryFlag(kess === 'capture' ? 'kess_captured' : 'kess_released'));
        say(g, /What is behind it/); say(g, /I'll go/); settle(g);
        talk(s, 'sanctuary_warden_npc'); say(g, /Stand aside/); say(g, /Draw your weapon/);
        fight(g, s, 'sanctuary_warden');
        takeExit(s, 'sanctuary_seal'); inspect(s, 'seal_first_echo');
        travel(s, 'grounds');
        talk(s, 'grounds_orin'); say(g, /rebuilt/);
        const build = g.dialogueChoices().find((c) => c.choiceId === 'build:homestead_gate');
        endings[kess] = lines(g.act({ type: 'dialogue_choice', choiceId: build.choiceId })).join('\n');
        bye(g);
    }
    assert.match(endings.capture, /Sergeant Kess in the tavern cellar/);
    assert.doesNotMatch(endings.capture, /Nobody has seen Sergeant Kess/);
    assert.match(endings.release, /Nobody has seen Sergeant Kess since the orchard/);
});

test('Sergeant Kess talks after the fight: the timetable, the mark, and a real choice', () => {
    const r = runRoute({ cls: 'mage', seed: 63, forced: true, buy: false, stopBeforeBoss: true });
    const { g, s } = r;
    travel(s, 'orchard');
    assert.ok(!visible(s, 'orchard_kess_npc'), 'the sergeant was dealt with once');
    assert.ok(!s.map.encounters.some((e) => e.id === 'orchard_kess' && g.storyAllows(e.when)), 'and does not come back');
    // A fresh run, stopping right after the fight.
    const fresh = toFestival('mage', 64);
    const fg = fresh.g, fs = fresh.s;
    travel(fs, 'village_residential_lane');
    talk(fs, 'lane_oda'); if (!has(fg, /festival tables/)) bye(fg), talk(fs, 'lane_oda'); say(fg, /festival tables/); bye(fg);
    travel(fs, 'shamefield'); talk(fs, 'square_hearth'); say(fg, /Cook Leberkäsbrötchen/); bye(fg);
    fg.act({ type: 'use_item', item: 'Leberkäsbrötchen' });
    talk(fs, 'village_tamsin'); say(fg, /Read them/); say(fg, /Protect/); fight(fg, fs, 'festival_raiders');
    talk(fs, 'village_captain'); say(fg, /go north/); bye(fg);
    travel(fs, 'orchard');
    assert.strictEqual(fg.currentObjective('C1-N04').id, 'kess');
    fight(fg, fs, 'orchard_kess');
    assert.strictEqual(fg.currentObjective('C1-N04').id, 'corvin');
    assert.ok(visible(fs, 'orchard_kess_npc'));
    talk(fs, 'orchard_kess_npc');
    assert.match(spoken(fg), /trying to place a face[\s\S]*Corvin waits at the foot of the climb\. The chains go up to the roost at dusk/);
    assert.doesNotMatch(spoken(fg), /majesty|my lord|emperor/i);
    say(fg, /Why follow Corvin/);
    assert.match(spoken(fg), /Corvin fed us/);
    say(fg, /Tie Kess up/); bye(fg);
    assert.ok(!visible(fs, 'orchard_kess_npc'));
    assert.ok(visible(fs, 'orchard_supply_post'));
});

test('C1-N05: the siege comes before the Warden; helping him mend the cages is thanked, never paid with the key', () => {
    const fresh = runRoute({ cls: 'rogue', seed: 71, forced: true, buy: false, stopBeforeBoss: true });
    const { g, s } = fresh;
    assert.strictEqual(g.questState('C1-N05'), 'complete');
    assert.ok(g.hasStoryFlag('siege_broken'));
    // The help is offered at his first greeting (the route has already moved on to his warning): the node itself.
    const STORY = require('../src/story/chapter1.js');
    const early = STORY.npcs.warden.nodes.early.choices.find((c) => /broken cages/.test(c.text));
    assert.deepStrictEqual(early.if, { flags: ['siege_broken'], notFlags: ['warden_helped'] });
    const mend = STORY.npcs.warden.nodes.mend;
    assert.ok(!JSON.stringify(mend).includes('Seal-Key'), 'mending the cages never hands over the key');
    assert.match(mend.lines.map((l) => l[1]).join(' '), /It changes nothing about the key/);
});

test('C1-N05: the cage-breakers hold the sanctuary; once they are gone the Warden takes your help with the cages, once', () => {
    const ctx = toFestival('warrior', 72);
    const { g, s } = ctx;
    travel(s, 'village_residential_lane');
    talk(s, 'lane_oda'); if (!has(g, /festival tables/)) bye(g), talk(s, 'lane_oda'); say(g, /festival tables/); bye(g);
    travel(s, 'shamefield'); talk(s, 'square_hearth'); say(g, /Cook Leberkäsbrötchen/); bye(g);
    g.act({ type: 'use_item', item: 'Leberkäsbrötchen' });
    talk(s, 'village_tamsin'); say(g, /Read them/); say(g, /Protect/); fight(g, s, 'festival_raiders');
    talk(s, 'village_captain'); say(g, /go north/); bye(g);
    travel(s, 'orchard');
    for (const id of ['orchard_east_lookouts', 'orchard_west_lookouts', 'orchard_kess']) fight(g, s, id);
    talk(s, 'orchard_kess_npc'); say(g, /Get up\. Go/); bye(g);
    fight(g, s, 'orchard_cultists');
    takeExit(s, 'orchard_north');
    talk(s, 'featherwatch_corvin'); say(g, /won't reach the Warden/); bye(g);
    fight(g, s, 'featherwatch_rearguard');
    assert.strictEqual(g.questState('C1-N05'), 'active');
    for (const id of ['featherwatch_crows', 'featherwatch_ghoul']) fight(g, s, id);
    takeExit(s, 'featherwatch_north');
    assert.ok(s.map.encounters.some((e) => e.id === 'sanctuary_siege' && g.storyAllows(e.when)), 'the cage-breakers are at work');
    assert.ok(visible(s, 'sanctuary_broken_cages'));
    fight(g, s, 'sanctuary_siege');
    assert.strictEqual(g.currentObjective('C1-N05').id, 'cages');
    inspect(s, 'sanctuary_broken_cages');
    assert.strictEqual(g.questState('C1-N05'), 'complete');
    assert.strictEqual(g.questState('Q06'), 'active');
    talk(s, 'sanctuary_warden_npc');
    say(g, /broken cages/);
    assert.match(spoken(g), /It changes nothing about the key\. But thank you\./);
    bye(g);
    assert.ok(g.hasStoryFlag('warden_helped'));
    assert.ok(!g.player.inventory.includes('Seal-Key of the First Echo'));
    talk(s, 'sanctuary_warden_npc'); assert.ok(!has(g, /broken cages/), 'once'); bye(g);
});

test('Exploration secrets: a clue shows each cache, and each cache pays once', () => {
    const { g, s } = runRoute({ cls: 'necromancer', seed: 81, forced: true, buy: false, stopBeforeBoss: true });
    bye(g);
    const secrets = [
        ['road', 'road_hunter_note', 'road_hunter_cache', ['Pork', 'Rough Hide', 'Padded Jerkin']],
        ['tollway', 'tollway_quartermaster_marks', 'tollway_supply_cache', ['Scrap Metal', 'Apprentice Charm']],
        ['shamefield', 'village_miller_note', 'village_mill_recess', ['Flour', 'Small Coin Purse']],
        ['featherwatch', 'featherwatch_ridge_rope', 'featherwatch_lookout', ['Bandages', 'Wild Herbs']]
    ];
    for (const [map, clue, cache, items] of secrets) {
        travel(s, map);
        assert.ok(!visible(s, cache), `${cache} is hidden until you read the clue`);
        inspect(s, clue);
        assert.ok(visible(s, cache), `${clue} shows ${cache}`);
        const before = items.map((i) => count(g, i));
        inspect(s, cache);
        assert.deepStrictEqual(items.map((i) => count(g, i)), before.map((n) => n + 1), `${cache} pays`);
        inspect(s, cache);
        assert.deepStrictEqual(items.map((i) => count(g, i)), before.map((n) => n + 1), `${cache} pays once`);
        for (const i of items) assert.ok(data.itemDefinitions[i], `${i} is a real item`);
    }
    assert.ok(g.hasStoryFlag('corvin_invoice_found'));
});

test('Shamefield talks among itself: each overheard scene plays once, and never hides a quest choice', () => {
    const { g, s } = toFestival('warrior', 91);
    talk(s, 'village_bragg');
    assert.match(spoken(g), /At least it arrived/);
    assert.ok(has(g, /What have you got/), 'Bragg still sells');
    bye(g);
    talk(s, 'village_bragg');
    assert.doesNotMatch(spoken(g), /At least it arrived/, 'once');
    bye(g);
    travel(s, 'village_residential_lane');
    talk(s, 'lane_oda');
    assert.match(spoken(g), /Put it down before I bake you/);
    assert.ok(has(g, /festival tables/), 'the banter leads straight into the lesson');
    bye(g);
    talk(s, 'lane_greta'); assert.match(spoken(g), /Walking is outside my job description/); bye(g);
    travel(s, 'briarwell_cloister_court');
    talk(s, 'cloister_merrow'); assert.match(spoken(g), /Ring it, and say the names out loud/); bye(g);
});
