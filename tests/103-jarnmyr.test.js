// Chapter Two, Act II begins (Tokelo, 2026-11-13: Járnmyr's picture, "First one"). C2-04 Iron for the Wolf: the west road
// from Hrafnholm opens once the Thing has made you its witness; Bjorn Ironvein denies it; any three of the collier, the
// bloomery, the quarry and the ore cart put you on the trail; the buyers come down the barrow path and carry a bill of sale
// paid in old Crown plate; the witness names who gets it, Bjorn's forge opens, and C2-05 waits for the barrow's picture.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const CH2 = require('../src/story/chapter2.js');
const DATA = require('../src/data.js');
const { walkTo, takeExit, inspect, contact } = require('./world-helpers.js');

function run(extra = []) {
    const g = new GameEngine({ seed: 103 });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07', 'Q08', 'C201', 'C202', 'C203']) g.story.quests[q].state = 'complete';
    g.story.flags.push('chapter_one_complete', 'aspect_nahemoth', 'caravan_saved', 'ulfrun_beaten', 'eydis_met', 'eydis_in_skeldvik', 'tablet_with_eydis',
        'tablet_decided', 'skeldvik_evidence', 'thing_sat', 'thing_asked_inquiry', 'thing_heard', ...extra);
    g.startQuest('C204', { quiet: true });
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('hrafnholm', 'from_skeldvik');
    return { g, s };
}
function win(g) {
    for (let i = 0; i < 100 && g.mode === 'combat'; i++) {
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
const text = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
function talk(s, id) { const r = inspect(s, id); assert.strictEqual(r.type, 'talk', `${id}: ${JSON.stringify(r).slice(0, 200)}`); return r; }

test('Járnmyr: the west road stays shut until the Thing has sat, then leads there and back', () => {
    const { g, s } = run();
    g.story.flags.splice(g.story.flags.indexOf('thing_heard'), 1);
    let r = walkTo(s, 0, 18);
    assert.notStrictEqual((r || {}).type, 'transition');
    assert.strictEqual(s.mapId, 'hrafnholm');
    g.story.flags.push('thing_heard');
    takeExit(s, 'hrafnholm_west_road');
    assert.strictEqual(s.mapId, 'jarnmyr');
    assert.strictEqual(g.currentObjective('C204').id, 'bjorn', 'arriving is the first step');
    takeExit(s, 'jarnmyr_south_road');
    assert.strictEqual(s.mapId, 'hrafnholm');
});

for (const [skip, choice, flag] of [['clue_cart', /Jarl Ragnhild/, 'iron_to_ragnhild'], ['clue_collier', /Torvald Redhand/, 'iron_to_torvald'], ['clue_quarry', /Arnkel/, 'iron_to_thing']]) {
    test(`C2-04 Iron for the Wolf: three clues (not ${skip}), the buyers, the bill of sale to ${flag}, Bjorn's forge`, () => {
        const { g, s } = run(['heard_of_osric']);
        takeExit(s, 'hrafnholm_west_road');
        // Before Bjorn, the works will talk; the buyers are not on the path yet.
        assert.ok(!s.visibleObjects('jarnmyr').some((o) => o.id === 'jarnmyr_buyers'));
        let r = talk(s, 'jarnmyr_bjorn'); assert.ok(/Forty families/.test(text(r)));
        say(g, /Where does your iron go/); say(g, /ask around/);
        assert.strictEqual(g.currentObjective('C204').id, 'trail');
        const clues = {
            clue_collier: () => { talk(s, 'jarnmyr_asger'); say(g, /rest of it/); say(g, /Thank you/); },
            clue_bloomery: () => { talk(s, 'jarnmyr_thyri'); say(g, /Who is the buyer/); say(g, /Thank you/); },
            clue_quarry: () => { talk(s, 'jarnmyr_vigdis'); say(g, /missing/); say(g, /Thank you/); },
            clue_cart: () => { const t = text(inspect(s, 'jarnmyr_ore_cart')); assert.ok(/cloak-pin/.test(t) || g.hasStoryFlag('clue_cart')); }
        };
        const order = Object.keys(clues).filter((k) => k !== skip);
        for (const [i, k] of order.entries()) {
            clues[k]();
            assert.ok(g.hasStoryFlag(k), k);
            assert.strictEqual(g.hasStoryFlag('jarnmyr_trail_found'), i === 2, `the trail opens on the third clue (${k})`);
        }
        assert.strictEqual(g.currentObjective('C204').id, 'buyers');
        assert.ok(s.visibleObjects('jarnmyr').some((o) => o.id === 'jarnmyr_buyers'), 'the buyers come down the barrow path');
        r = contact(s, 'jarnmyr_buyers'); assert.strictEqual(r.type, 'encounter');
        win(g); s.fightOver('jarnmyr_buyers', 'victory'); settle(g);
        assert.ok(g.player.inventory.includes('Bill of Sale'));
        assert.ok(g.hasStoryFlag('buyers_beaten'));
        assert.strictEqual(g.currentObjective('C204').id, 'confront');
        // Bjorn reads it; the witness names who gets it.
        r = talk(s, 'jarnmyr_bjorn'); assert.ok(/Crown plate/.test(text(r)));
        const gold = g.player.gold;
        say(g, choice); say(g, /Goodbye/); settle(g);
        assert.ok(g.hasStoryFlag(flag));
        assert.strictEqual(g.questState('C204'), 'complete');
        assert.ok(!g.player.inventory.includes('Bill of Sale'), 'the paper went on');
        assert.strictEqual(g.player.gold, gold + 30);
        assert.ok(g.hasStoryFlag('jarnmyr_forge_open'));
        assert.strictEqual(g.questState('C205'), 'active');
        assert.ok(CH2.quests.C205.teaser && /next part/.test(g.currentObjective('C205').text), 'the barrow waits for its picture');
        // The forge sells to the witness now: the warrior's bog-iron axe is on the shelf.
        talk(s, 'jarnmyr_bjorn'); say(g, /What have you got/);
        assert.ok(DATA.shopDefinitions.bjorn.stock['Mire-Iron Bearded Axe']);
    });
}

test('Járnmyr: the barrow, Birkholt and Rúnadal are boundaries until their pictures come; every Járnmyr line fits the dialogue box', () => {
    const map = ZONE1.maps.jarnmyr;
    assert.deepStrictEqual(map.boundaries.map((b) => b.id).sort(), ['jarnmyr_barrow_mouth', 'jarnmyr_birkholt_boardwalk', 'jarnmyr_runadal_track']);
    for (const id of ['bjorn', 'asger', 'thyri', 'vigdis']) {
        const npc = CH2.npcs[id];
        for (const node of Object.values(npc.nodes)) for (const [, line] of node.lines || []) {
            assert.ok(line.length <= 160, `${id}: "${line}" is too long for one page`);
            assert.ok((line.match(/[.!?](\s|$)/g) || []).length <= 2, `${id}: "${line}" is more than two sentences`);
        }
    }
    for (const it of ['Mire-Iron Bearded Axe', 'Bog-Iron Seax', "Charcoal-Burner's Staff", 'Slag-Glass Wand', 'Bill of Sale']) assert.ok(DATA.itemDefinitions[it], it);
});
