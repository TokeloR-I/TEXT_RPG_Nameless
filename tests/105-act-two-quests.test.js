// Chapter Two, Act II quests on the existing maps (2026-11-13): C2-07 Verse and Witness (diggers on the Silent Field,
// three families of the six hundred, then Yrsa), C2-S01 The Last Loom (Sigrid's memorial sail) and C2-S06 The Bride of
// the Mound (Ragna's weeping bride), plus the three Act II mini bosses (Hrolf, Hallgeir, the Bride).
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const CH2 = require('../src/story/chapter2.js');
const DATA = require('../src/data.js');
const { takeExit, inspect, contact } = require('./world-helpers.js');

function run(extra = [], done = []) {
    const g = new GameEngine({ seed: 105 });
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
function fight(g, s, id) {
    const r = contact(s, id); assert.strictEqual(r.type, 'encounter', `${id} starts a fight`);
    win(g); s.fightOver(id, 'victory'); settle(g);
}
const seen = (s, map, id) => s.visibleObjects(map).some((o) => o.id === id);

test('C2-05 hands on to C2-07, and the diggers only stand on the Silent Field after Bjarki is laid', () => {
    const { g, s } = run([], ['C204']);
    assert.ok(!seen(s, 'silent_field', 'silent_field_diggers'));
    g.startQuest('C205', { quiet: true });
    takeExit(s, 'hrafnholm_west_road'); takeExit(s, 'jarnmyr_barrow_mouth');
    const b = s.visibleObjects('bjarki_barrow').find((o) => /^barrow_bjarki/.test(o.id));
    fight(g, s, b.id);
    assert.strictEqual(g.questState('C205'), 'complete');
    assert.strictEqual(g.questState('C207'), 'active');
    assert.ok(seen(s, 'silent_field', 'silent_field_diggers'));
});

test('C2-07 Verse and Witness: the diggers, any three of four families, then Yrsa closes it', () => {
    const { g, s } = run(['bjarki_laid', 'sigrid_met'], ['C204', 'C205']);
    g.startQuest('C207', { quiet: true });
    const xp0 = g.player.xp, lvl0 = g.player.level;
    takeExit(s, 'hrafnholm_silent_field');
    fight(g, s, 'silent_field_diggers');
    assert.ok(g.hasStoryFlag('field_diggers_beaten'));
    assert.ok(!seen(s, 'silent_field', 'silent_field_diggers'), 'the diggers stay beaten');
    takeExit(s, 'silent_field_south');
    inspect(s, 'hrafnholm_hild'); say(g, /Thank you, Hild/);
    assert.ok(!g.hasStoryFlag('witnesses_heard'), 'one family is not enough');
    takeExit(s, 'hrafnholm_west_road'); takeExit(s, 'jarnmyr_west_boardwalk');
    inspect(s, 'birkholt_ragna'); say(g, /Thank you, Ragna/);
    assert.ok(!g.hasStoryFlag('witnesses_heard'));
    takeExit(s, 'birkholt_east_boardwalk'); takeExit(s, 'jarnmyr_north_track');
    inspect(s, 'runadal_thorvi'); say(g, /I believe it/);
    assert.ok(g.hasStoryFlag('witnesses_heard'), 'three of four families is enough (Sigrid skipped)');
    inspect(s, 'runadal_yrsa');
    assert.ok(g.hasStoryFlag('yrsa_witnessed'));
    say(g, /Goodbye/);
    assert.strictEqual(g.questState('C207'), 'complete');
    assert.ok(g.hasStoryFlag('verse_witnessed'));
    assert.ok(g.player.xp > xp0 || g.player.level > lvl0);
});

test('C2-07: Yrsa will not hear it before the diggers are dealt with', () => {
    const { g, s } = run(['bjarki_laid', 'witnesses_heard', 'witness_hild', 'witness_ragna', 'witness_thorvi'], ['C204', 'C205']);
    g.startQuest('C207', { quiet: true });
    takeExit(s, 'hrafnholm_west_road'); takeExit(s, 'jarnmyr_north_track');
    inspect(s, 'runadal_yrsa');
    assert.ok(!g.hasStoryFlag('yrsa_witnessed'));
});

for (const pick of ['truth', 'quiet']) {
    test(`C2-S01 The Last Loom: yarn from the rack, Asta's stick from her house, and Sigrid weaves (${pick})`, () => {
        const { g, s } = run(['sigrid_met']);
        takeExit(s, 'hrafnholm_west_road'); takeExit(s, 'jarnmyr_west_boardwalk');
        inspect(s, 'birkholt_rack'); assert.ok(!g.player.inventory.includes('Madder Yarn'), 'the rack gives nothing before the quest');
        inspect(s, 'birkholt_sigrid'); say(g, /anything I can do/); say(g, /find them/);
        assert.strictEqual(g.questState('C2-S01'), 'active');
        inspect(s, 'birkholt_rack'); assert.ok(g.player.inventory.includes('Madder Yarn'));
        inspect(s, 'birkholt_asta_house'); assert.ok(g.player.inventory.includes("Asta's Pattern Stick"));
        inspect(s, 'birkholt_sigrid');
        say(g, pick === 'truth' ? /Weave it in/ : /Leave it out/); say(g, /Goodbye/);
        assert.strictEqual(g.questState('C2-S01'), 'complete');
        assert.ok(g.hasStoryFlag(`loom_${pick}`));
        assert.ok(g.player.inventory.includes('Memorial Cloth'));
        assert.ok(!g.player.inventory.includes('Madder Yarn') && !g.player.inventory.includes("Asta's Pattern Stick"));
    });
}

for (const pick of ['return', 'keep']) {
    test(`C2-S06 The Bride of the Mound: the stones, Eyvind's confession, then the brooch (${pick})`, () => {
        const { g, s } = run();
        takeExit(s, 'hrafnholm_west_road'); takeExit(s, 'jarnmyr_west_boardwalk');
        assert.ok(!seen(s, 'birkholt', 'birkholt_mound_bride'));
        inspect(s, 'birkholt_ragna'); say(g, /A bride/); say(g, /find out/);
        assert.strictEqual(g.questState('C2-S06'), 'active');
        inspect(s, 'birkholt_stones'); assert.ok(g.hasStoryFlag('bride_ribbon_found'));
        inspect(s, 'birkholt_eyvind'); say(g, /Goodbye/);
        assert.ok(g.player.inventory.includes("Bride's Brooch"));
        inspect(s, 'birkholt_ragna');
        if (pick === 'keep') {
            say(g, /keeping it/);
            assert.strictEqual(g.questState('C2-S06'), 'complete');
            assert.ok(g.player.inventory.includes("Bride's Brooch"), 'the brooch is yours');
            assert.ok(!seen(s, 'birkholt', 'birkholt_mound_bride'));
        } else {
            say(g, /give it back/); say(g, /Goodbye/);
            assert.ok(seen(s, 'birkholt', 'birkholt_mound_bride'), 'she waits at the stones');
            fight(g, s, 'birkholt_mound_bride');
            assert.strictEqual(g.questState('C2-S06'), 'complete');
            assert.ok(g.hasStoryFlag('bride_laid'));
            assert.ok(!g.player.inventory.includes("Bride's Brooch"));
            assert.ok(!seen(s, 'birkholt', 'birkholt_mound_bride'), 'she sleeps');
        }
    });
}

test('Act II mini bosses: Hrolf, Hallgeir and the Bride are elites with turn stats, readable live kits, loot and art', () => {
    const SPR = require('../assets/sprites/enso-enemies.js');
    for (const id of ['draugr_champion', 'grave_foreman', 'mound_bride']) {
        assert.ok(DATA.enemies[id] && DATA.enemies[id].hp >= 120, id);
        const kit = DATA.actionRules.enemies[id];
        assert.ok(kit && kit.attacks.length >= 2, `${id}: live kit`);
        for (const a of kit.attacks) for (const step of a.combo || [a]) assert.ok((step.windupMs || a.windupMs) >= 600, `${id} ${a.name}: readable tell`);
        assert.strictEqual(DATA.enemies[id].lootRank, 'elite', `${id}: elite loot`);
        assert.ok(JSON.stringify(SPR).includes(id), `${id}: art`);
    }
    const passage = ZONE1.maps.bjarki_barrow.encounters.find((o) => o.id === 'barrow_passage_dead');
    assert.ok(passage.enemies.includes('draugr_champion'), 'Hrolf guards the barrow passage');
    for (const id of ['ragna', 'eyvind', 'thorvi', 'sigrid', 'hild', 'yrsa']) for (const node of Object.values(CH2.npcs[id].nodes)) for (const [, line] of node.lines || []) {
        assert.ok(line.length <= 160, `${id}: "${line}" is too long for one page`);
        assert.ok((line.match(/[.!?](\s|$)/g) || []).length <= 2, `${id}: "${line}" is more than two sentences`);
    }
});
