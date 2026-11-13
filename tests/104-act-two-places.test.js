// Chapter Two, Act II places (Tokelo's pictures, 2026-11-13): the Silent Field up the north-east track from Hrafnholm,
// Birkholt across the boardwalk west of Járnmyr, Rúnadal up the north track, and Bjarki's Barrow inside the Járnmyr
// mound, where C2-05 A Chieftain Disturbed is played: each burial fire you put out takes a grave-ward from Bjarki's side.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const CH2 = require('../src/story/chapter2.js');
const DATA = require('../src/data.js');
const { takeExit, inspect, contact } = require('./world-helpers.js');

function run(extra = [], done = []) {
    const g = new GameEngine({ seed: 104 });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07', 'Q08', 'C201', 'C202', 'C203', ...done]) g.story.quests[q].state = 'complete';
    g.story.flags.push('chapter_one_complete', 'aspect_nahemoth', 'caravan_saved', 'ulfrun_beaten', 'eydis_met', 'eydis_in_skeldvik', 'tablet_decided',
        'skeldvik_evidence', 'thing_sat', 'thing_asked_inquiry', 'thing_heard', ...extra);
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
const text = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');

test('Act II places: the Silent Field, Birkholt and Rúnadal are reached and left by their roads, and their Black Flight anchors attune', () => {
    const { g, s } = run(['tablet_with_eydis']);
    takeExit(s, 'hrafnholm_silent_field'); assert.strictEqual(s.mapId, 'silent_field');
    inspect(s, 'silent_bell'); assert.ok(g.hasStoryFlag('anchor:silent_field'));
    takeExit(s, 'silent_field_south'); assert.strictEqual(s.mapId, 'hrafnholm');
    takeExit(s, 'hrafnholm_west_road'); assert.strictEqual(s.mapId, 'jarnmyr');
    takeExit(s, 'jarnmyr_west_boardwalk'); assert.strictEqual(s.mapId, 'birkholt');
    let r = inspect(s, 'birkholt_sigrid'); assert.strictEqual(r.type, 'talk'); assert.ok(/Asta was my mother/.test(text(r)));
    r = say(g, /with Eydis/); assert.ok(/Ketil/.test(text(r)));
    say(g, /Goodbye/); assert.ok(g.hasStoryFlag('sigrid_met'));
    takeExit(s, 'birkholt_east_boardwalk'); assert.strictEqual(s.mapId, 'jarnmyr');
    takeExit(s, 'jarnmyr_north_track'); assert.strictEqual(s.mapId, 'runadal');
    inspect(s, 'runadal_table'); assert.ok(g.hasStoryFlag('anchor:runadal'));
    r = inspect(s, 'runadal_yrsa'); assert.ok(/Yrsa/.test(text(r)));
    say(g, /look at me/); say(g, /Goodbye/);
    takeExit(s, 'runadal_south_track'); assert.strictEqual(s.mapId, 'jarnmyr');
    for (const a of ['silent_field', 'runadal']) assert.ok(CH2.anchors[a] && ZONE1.maps[CH2.anchors[a].map].spawns[CH2.anchors[a].spawn]);
});

test('Act II places: the Silent Field track waits for the Thing like the west road does', () => {
    const { s } = run();
    const ex = ZONE1.maps.hrafnholm.exits.filter((e) => e.toMap === 'silent_field');
    assert.strictEqual(ex.length, 2);
    for (const e of ex) assert.deepStrictEqual(e.requires, { flags: ['thing_heard'] });
    assert.ok(s);
});

for (const fires of [0, 1, 2, 3]) {
    test(`C2-05 A Chieftain Disturbed: ${fires} burial fire(s) out, Bjarki fights with ${3 - fires} grave-ward(s), and lies down again`, () => {
        const { g, s } = run([], ['C204']);
        g.startQuest('C205', { quiet: true });
        takeExit(s, 'hrafnholm_west_road');
        takeExit(s, 'jarnmyr_barrow_mouth'); assert.strictEqual(s.mapId, 'bjarki_barrow');
        assert.strictEqual(g.currentObjective('C205').id, 'bjarki');
        for (const id of ['barrow_anchor_altar', 'barrow_anchor_west', 'barrow_anchor_east'].slice(0, fires)) inspect(s, id);
        const fights = s.visibleObjects('bjarki_barrow').filter((o) => /^barrow_bjarki/.test(o.id));
        assert.strictEqual(fights.length, 1, 'one Bjarki at a time');
        assert.strictEqual(fights[0].enemies.filter((k) => k === 'grave_ward').length, 3 - fires);
        const r = contact(s, fights[0].id); assert.strictEqual(r.type, 'encounter');
        win(g); s.fightOver(fights[0].id, 'victory'); settle(g);
        assert.ok(g.hasStoryFlag('bjarki_laid'));
        assert.ok(g.player.inventory.includes("Bjarki's Arm Ring"));
        assert.strictEqual(g.questState('C205'), 'complete');
        assert.ok(!s.visibleObjects('bjarki_barrow').some((o) => /^barrow_bjarki/.test(o.id)), 'he stays down');
    });
}

test('C2-05: the barrow-dead and Bjarki have turn stats, live kits with readable tells, and art; the barrow mouth opens only for C2-05', () => {
    for (const id of ['draugr', 'grave_ward', 'bjarki_grave_bound']) {
        assert.ok(DATA.enemies[id] && DATA.enemies[id].hp > 0, id);
        const kit = DATA.actionRules.enemies[id];
        assert.ok(kit && kit.attacks.length, `${id}: live kit`);
        for (const a of kit.attacks) for (const step of a.combo || [a]) assert.ok((step.windupMs || a.windupMs) >= 600, `${id} ${a.name}: readable tell`);
    }
    assert.ok(DATA.enemies.bjarki_grave_bound.specialFlags.includes('boss'));
    assert.ok(DATA.actionRules.enemies.bjarki_grave_bound.attacks.some((a) => a.shape === 'ground'), 'the burial curse marks the ground');
    const mouth = ZONE1.maps.jarnmyr.exits.find((e) => e.id === 'jarnmyr_barrow_mouth');
    assert.deepStrictEqual(mouth.requires, { quests: { C205: 'active+' } });
    for (const id of ['sigrid', 'yrsa']) for (const node of Object.values(CH2.npcs[id].nodes)) for (const [, line] of node.lines || []) {
        assert.ok(line.length <= 160, `${id}: "${line}" is too long for one page`);
        assert.ok((line.match(/[.!?](\s|$)/g) || []).length <= 2, `${id}: "${line}" is more than two sentences`);
    }
});
