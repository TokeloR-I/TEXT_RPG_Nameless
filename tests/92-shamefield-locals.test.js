// Get to know the locals (Tokelo, 2026-11-02): the Watch Captain's quest after the register (L01), and the five
// Shamefield side quests it counts (SF1-SF5), played through the real world model + engine. SF1, Bread and Beer,
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

test('Locals: returning the register starts "Get to Know the Locals" and offers the five favours', () => {
    const { g } = afterRegister();
    assert.strictEqual(g.questState('Q05'), 'complete');
    assert.strictEqual(g.questState('Q06'), 'active', 'the main road goes on as before');
    assert.strictEqual(g.questState('L01'), 'active');
    for (const id of ['SF1', 'SF2', 'SF3', 'SF4', 'SF5']) assert.strictEqual(g.questState(id), 'available', id);
    const j = g.getJournal().quests.find((q) => q.id === 'L01');
    assert.strictEqual(j.objective.text, 'Help five Shamefield households (0/5)');
    say(g, /Who needs help/);
    assert.match(g.getAvailableActions().dialogue.lines.map((l) => l.text).join(' '), /Greta Rusk has lost her pigs/);
});

test('Locals: a run that returned the register before this quest existed is offered it by the Captain', () => {
    const { g, s } = afterRegister();
    bye(g);
    for (const id of ['L01', 'SF1', 'SF2', 'SF3', 'SF4', 'SF5']) g.story.quests[id] = { state: 'unseen', step: 0 };
    talk(s, 'village_captain');
    assert.strictEqual(g.questState('L01'), 'active');
    assert.strictEqual(g.questState('SF3'), 'available');
});

test('Locals: all five favours, in the corners of Shamefield, count toward the Captain, who pays once', () => {
    const { g, s } = afterRegister('mage', 11);
    bye(g);
    const progress = () => g.getJournal().quests.find((q) => q.id === 'L01').objective.text;

    // SF4 Singing at the Mill: the falls on the west bank were walled off before; the lane behind the slate house opens them.
    talk(s, 'village_tamsin'); say(g, /troubling the village/); bye(g);
    assert.strictEqual(g.questState('SF4'), 'active');
    assert.ok(!s.visibleObjects().some((o) => o.id === 'mill_shade'), 'nothing sings until you go and listen');
    inspect(s, 'village_mill_bottles');
    fight(g, s, 'mill_shade');
    talk(s, 'village_tamsin'); say(g, /mill is quiet/); bye(g);
    assert.strictEqual(g.questState('SF4'), 'complete');
    assert.strictEqual(progress(), 'Help five Shamefield households (1/5)');

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
    assert.strictEqual(progress(), 'Help five Shamefield households (4/5)');

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

    // Five of five: report to the Captain.
    assert.strictEqual(g.currentObjective('L01').id, 'report');
    travel(s, 'shamefield');
    const gold = g.player.gold;
    talk(s, 'village_captain'); say(g, /I know the locals now/); bye(g);
    assert.strictEqual(g.questState('L01'), 'complete');
    assert.strictEqual(g.player.gold, gold + 15);
    assert.ok(g.hasStoryFlag('shamefield_friend'));
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
