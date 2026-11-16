// Chapter Two enemies and side quests (Tokelo, 2026-11-16: "add enemies and side quests"), all on maps that already
// exist: C2-S03 Iron Beneath the Mire (Járnmyr: bog lights, mire-dead, the Man in the Peat), C2-S11 Salt on the
// Shingle (Gullstrand: drowned oarsmen) and C2-S12 Wolf-Coats on the Road (Skeldvik and the Frostspine Pass).
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const CH2 = require('../src/story/chapter2.js');
const DATA = require('../src/data.js');
const { takeExit, inspect, contact } = require('./world-helpers.js');

function run(extra = [], done = []) {
    const g = new GameEngine({ seed: 107 });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07', 'Q08', 'C201', 'C202', 'C203', ...done]) g.story.quests[q].state = 'complete';
    g.story.flags.push('chapter_one_complete', 'aspect_nahemoth', 'caravan_saved', 'ulfrun_beaten', 'eydis_met', 'eydis_in_skeldvik', 'tablet_decided',
        'skeldvik_evidence', 'thing_sat', 'thing_asked_inquiry', 'thing_heard', ...extra);
    g.world.defeated.push('frostspine_caravan_raiders', 'frostspine_ulfrun');   // Act I's pass fights, long since won
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('hrafnholm', 'from_skeldvik');
    return { g, s };
}
function win(g) {
    for (let i = 0; i < 200 && g.mode === 'combat'; i++) {
        for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1;
        if (g.getAvailableActions().awaiting === 'continue') g.act({ type: 'continue' });
        else g.act({ type: 'attack', targetId: g.alive(g.combat.enemies)[0].id });
    }
    assert.strictEqual(g.world.lastResult, 'victory');
}
function settle(g) { if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: g.getAvailableActions().actions[0].branchId }); }
function say(g, re) {
    const a = g.getAvailableActions(), c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(a.actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
function fight(g, s, id) {
    const r = contact(s, id); assert.strictEqual(r.type, 'encounter', `${id} starts a fight`);
    win(g); s.fightOver(id, 'victory'); settle(g);
}
const seen = (s, map, id) => s.visibleObjects(map).some((o) => o.id === id);
const count = (g, item) => g.player.inventory.filter((x) => x === item).length;

for (const pick of ['rebury', 'cut']) {
    test(`C2-S03 Iron Beneath the Mire: the cut, the lights, Bjorn's peat-right, the Man in the Peat, then Oddny (${pick})`, () => {
        const { g, s } = run(['jarnmyr_forge_open', 'bjorn_met'], ['C204']);
        takeExit(s, 'hrafnholm_west_road');
        assert.ok(!seen(s, 'jarnmyr', 'jarnmyr_bog_lights'), 'no lights before the quest');
        inspect(s, 'jarnmyr_oddny'); say(g, /see what is in the cut/);
        assert.strictEqual(g.questState('C2-S03'), 'active');
        inspect(s, 'jarnmyr_deep_cut');
        assert.ok(!seen(s, 'jarnmyr', 'jarnmyr_peat_king'), 'he stays down until Bjorn has been asked');
        fight(g, s, 'jarnmyr_bog_lights');
        assert.ok(g.hasStoryFlag('mire_lights_out'));
        inspect(s, 'jarnmyr_bjorn'); say(g, /go and see/);
        assert.ok(seen(s, 'jarnmyr', 'jarnmyr_peat_king'));
        fight(g, s, 'jarnmyr_peat_king');
        assert.ok(g.player.inventory.includes('Plaited Cord'));
        const iron = count(g, 'Bog Iron'), gold = g.player.gold;
        inspect(s, 'jarnmyr_oddny');
        say(g, pick === 'rebury' ? /Put him back/ : /Let Bjorn cut/); say(g, /Goodbye/);
        assert.strictEqual(g.questState('C2-S03'), 'complete');
        assert.ok(!g.player.inventory.includes('Plaited Cord'));
        if (pick === 'rebury') { assert.ok(g.hasStoryFlag('mire_reburied')); assert.strictEqual(g.player.gold, gold + 35); assert.strictEqual(count(g, 'Bog Iron'), iron); }
        else { assert.ok(g.hasStoryFlag('mire_cut')); assert.strictEqual(count(g, 'Bog Iron'), iron + 3); }
        assert.ok(!seen(s, 'jarnmyr', 'jarnmyr_peat_king') && !seen(s, 'jarnmyr', 'jarnmyr_bog_lights'), 'both stay beaten');
        inspect(s, 'jarnmyr_bjorn'); assert.ok(/Bog iron/.test(JSON.stringify(g.getAvailableActions())), "Bjorn's forge is open again");
    });
}

test('C2-S03: Oddny only asks once Bjorn is selling to you again (C2-04 done)', () => {
    const { g, s } = run();
    takeExit(s, 'hrafnholm_west_road');
    inspect(s, 'jarnmyr_oddny');
    assert.ok(!(g.getAvailableActions().actions || []).some((a) => /in the cut/.test(a.text || '')));
});

test('C2-S11 Salt on the Shingle: the wrack line, the drowned at the wreck, then at the boats, then Ketil', () => {
    const { g, s } = run();
    takeExit(s, 'hrafnholm_south_road'); takeExit(s, 'skeldvik_gullstrand');
    assert.ok(!seen(s, 'gullstrand_coast', 'gullstrand_drowned'), 'the beach is quiet before Ketil asks');
    inspect(s, 'gullstrand_ketil'); say(g, /meet them/);
    assert.strictEqual(g.questState('C2-S11'), 'active');
    inspect(s, 'gullstrand_wrack');
    assert.ok(!seen(s, 'gullstrand_coast', 'gullstrand_drowned_boats'), 'the boat group waits for the first');
    fight(g, s, 'gullstrand_drowned');
    fight(g, s, 'gullstrand_drowned_boats');
    const fish = count(g, 'Stockfish');
    inspect(s, 'gullstrand_ketil'); say(g, /Goodbye/);
    assert.strictEqual(g.questState('C2-S11'), 'complete');
    assert.strictEqual(count(g, 'Stockfish'), fish + 2);
});

test('C2-S12 Wolf-Coats on the Road: Thora asks after the Thing, Hakon points, the post, Hrapp, then the pelt', () => {
    const { g, s } = run();
    takeExit(s, 'hrafnholm_south_road');
    inspect(s, 'skeldvik_thora'); say(g, /trouble on the roads/); say(g, /clear the road/);
    assert.strictEqual(g.questState('C2-S12'), 'active');
    takeExit(s, 'skeldvik_north');
    assert.ok(seen(s, 'frostspine_pass', 'frostspine_wolfcoats_post'));
    assert.ok(!seen(s, 'frostspine_pass', 'frostspine_wolfcoats_marker'));
    inspect(s, 'frostspine_hakon'); say(g, /wolf skins/); say(g, /Goodbye/);
    fight(g, s, 'frostspine_wolfcoats_post');
    fight(g, s, 'frostspine_wolfcoats_marker');
    assert.ok(g.player.inventory.includes('Wolf-Coat Pelt'));
    takeExit(s, 'frostspine_north');
    const gold = g.player.gold;
    inspect(s, 'skeldvik_thora'); say(g, /Goodbye/);
    assert.strictEqual(g.questState('C2-S12'), 'complete');
    assert.ok(g.hasStoryFlag('pass_road_safe'));
    assert.strictEqual(g.player.gold, gold + 30);
    assert.ok(!g.player.inventory.includes('Wolf-Coat Pelt'));
});

test('C2-S12: Thora has nothing for you on the roads before the Thing has sat', () => {
    const { g, s } = run();
    g.story.flags = g.story.flags.filter((f) => f !== 'thing_heard');
    takeExit(s, 'hrafnholm_south_road');
    inspect(s, 'skeldvik_thora');
    assert.ok(!(g.getAvailableActions().actions || []).some((a) => /trouble on the roads/.test(a.text || '')));
});

test('New Chapter Two enemies: turn stats, readable live kits, loot, art, and no gate on the pass but Ulfrun', () => {
    const SPR = require('../assets/sprites/enso-enemies.js');
    for (const id of ['bog_light', 'mire_dead', 'peat_king', 'drowned_oarsman', 'ulfhednar']) {
        const e = DATA.enemies[id];
        assert.ok(e && e.hp > 0 && e.skills.length, id);
        const kit = DATA.actionRules.enemies[id];
        assert.ok(kit && kit.attacks.length, `${id}: live kit`);
        const names = e.skills.map((k) => k.name);
        for (const a of kit.attacks) assert.ok(names.includes(a.skill), `${id}: ${a.skill} has turn damage`);
        assert.ok(['common', 'elite'].includes(e.lootRank), `${id}: loot`);
        assert.ok(SPR.keys.includes(id), `${id}: art`);
    }
    assert.strictEqual(DATA.enemies.peat_king.lootRank, 'elite');
    for (const a of DATA.actionRules.enemies.peat_king.attacks) assert.ok(a.windupMs >= 600, `peat_king ${a.name}: readable tell`);
    assert.deepStrictEqual(ZONE1.maps.frostspine_pass.encounters.filter((e) => e.gate).map((e) => e.id), ['frostspine_ulfrun']);
});

test('New side quest dialogue fits one page (two sentences, 160 characters)', () => {
    for (const id of ['oddny', 'ketil', 'bjorn', 'thora', 'hakon']) for (const node of Object.values(CH2.npcs[id].nodes)) for (const [, line] of node.lines || []) {
        assert.ok(line.length <= 160, `${id}: "${line}" is too long for one page`);
        assert.ok((line.match(/[.!?](\s|$)/g) || []).length <= 2, `${id}: "${line}" is more than two sentences`);
    }
});

test('Old saves: a save from before these quests gets them on load, offered and not started', () => {
    const { g } = run(['jarnmyr_forge_open'], ['C204']);
    const raw = JSON.parse(JSON.stringify(g.serialize()));
    (function strip(v) { if (v && typeof v === 'object') { if (v.quests) for (const q of ['C2-S03', 'C2-S11', 'C2-S12']) delete v.quests[q]; Object.values(v).forEach(strip); } })(raw);
    const g2 = new GameEngine({ seed: 1 });
    g2.load(raw);
    for (const q of ['C2-S03', 'C2-S11', 'C2-S12']) assert.strictEqual(g2.questState(q), 'unseen', q);
});

test('Live combat: every new group fights in the action sim and hurts you, and none of them gives up while you stand there', () => {
    const { doubleWorld } = require('../src/world/scale16.js');
    const { ActionSim } = require('../src/action/sim.js');
    const WORLD = doubleWorld(ZONE1);
    const STEP = 1000 / 60;
    const groups = [['jarnmyr', 'jarnmyr_bog_lights', 'C2-S03'], ['jarnmyr', 'jarnmyr_peat_king', 'C2-S03'],
        ['gullstrand_coast', 'gullstrand_drowned_boats', 'C2-S11'], ['frostspine_pass', 'frostspine_wolfcoats_marker', 'C2-S12']];
    for (const [map, id, quest] of groups) {
        const g = new GameEngine({ seed: 107, combatMode: 'action' });
        g.start(); g.input('warrior'); g.enterWorld();
        while (g.player.level < 6) g.addExperience(g.player.xpToNext, { quiet: true });
        if (g.pendingBranchChoice) { g.maybePromptBranch(); g.act({ type: 'choose_branch', branchId: 'free' }); }
        g.player.hp = g.player.maxHp = 9999;
        g.story.quests[quest].state = 'active';
        g.story.flags.push('mire_bjorn_asked', 'drowned_first_beaten', 'wolfcoats_post_beaten');
        const s = new WorldSession(WORLD, { engine: g });
        s.place(map, Object.keys(WORLD.maps[map].spawns)[0]);
        const enc = WORLD.maps[map].encounters.find((e) => e.id === id);
        s.x = enc.x - 4; s.y = enc.y;
        const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 107 });
        assert.ok(sim.groups[id], `${id}: in the sim`);
        sim.engageGroup(sim.groups[id]);
        for (let i = 0; i < 60 * 20; i++) sim.update(STEP, {});
        assert.ok(g.player.hp < 9999, `${id}: they land hits`);
        assert.strictEqual(g.mode, 'combat', `${id}: still fighting after 20 s, no leash`);
    }
});
