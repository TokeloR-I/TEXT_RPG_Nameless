// Chapter Two, Act II on the new maps (PR #267, Tokelo's pictures): C2-06 The Wolf's Bargain in the Wolf-Banner camp
// (Torvald, the map table, Skuli Tally-Hand, three endings) and C2-S07 The Winter Hunt in the uplands (Old Greymane).
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const CH2 = require('../src/story/chapter2.js');
const DATA = require('../src/data.js');
const { takeExit, inspect, contact } = require('./world-helpers.js');

function run(extra = [], done = []) {
    const g = new GameEngine({ seed: 106 });
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
function toCamp(s) {
    takeExit(s, 'hrafnholm_silent_field'); takeExit(s, 'silent_field_east_path'); assert.strictEqual(s.mapId, 'uplands');
    takeExit(s, 'uplands_camp_trail'); assert.strictEqual(s.mapId, 'wolfbanner_camp');
}

test('C2-05 now opens C2-06 and C2-07 together', () => {
    const { g, s } = run([], ['C204']);
    g.startQuest('C205', { quiet: true });
    takeExit(s, 'hrafnholm_west_road'); takeExit(s, 'jarnmyr_barrow_mouth');
    fight(g, s, s.visibleObjects('bjarki_barrow').find((o) => /^barrow_bjarki/.test(o.id)).id);
    assert.strictEqual(g.questState('C206'), 'active');
    assert.strictEqual(g.questState('C207'), 'active');
});

for (const [pick, re] of [['negotiated', /Cut Skuli/], ['exposed', /goes to the Thing/], ['feigned', /Keep the silver/]]) {
    test(`C2-06 The Wolf's Bargain: Torvald, the camp, the map table, Skuli, and a bargain (${pick})`, () => {
        const { g, s } = run(['torvald_met', 'bjarki_laid'], ['C204', 'C205']);
        g.startQuest('C206', { quiet: true });
        assert.ok(!seen(s, 'wolfbanner_camp', 'camp_torvald'), 'Torvald is in Hrafnholm first');
        inspect(s, 'hrafnholm_torvald'); say(g, /see you there/);
        assert.ok(g.hasStoryFlag('torvald_at_camp'));
        assert.ok(!seen(s, 'hrafnholm', 'hrafnholm_torvald'), 'he rides for the camp');
        toCamp(s);
        assert.strictEqual(g.currentObjective('C206').id, 'table');
        assert.ok(!seen(s, 'wolfbanner_camp', 'camp_skuli'), 'Skuli keeps out of sight until you read the table');
        inspect(s, 'camp_steinar'); say(g, /Goodbye/);
        inspect(s, 'camp_table'); assert.ok(g.hasStoryFlag('camp_map_read'));
        fight(g, s, 'camp_skuli');
        assert.ok(g.player.inventory.includes("Skuli's Tally"));
        inspect(s, 'camp_torvald'); say(g, re); say(g, /./);
        assert.ok(g.hasStoryFlag(`bargain_${pick}`));
        assert.strictEqual(g.questState('C206'), 'complete');
        assert.strictEqual(g.player.inventory.includes("Skuli's Tally"), pick !== 'exposed', 'only the Thing keeps the tally');
        assert.ok(!seen(s, 'wolfbanner_camp', 'camp_torvald') && seen(s, 'hrafnholm', 'hrafnholm_torvald'), 'back in Hrafnholm');
    });
}

for (const pick of ['hunt', 'drive']) {
    test(`C2-S07 The Winter Hunt: tracks, the stand, the den, then Old Greymane (${pick})`, () => {
        const { g, s } = run();
        takeExit(s, 'hrafnholm_silent_field'); takeExit(s, 'silent_field_east_path');
        inspect(s, 'uplands_tracks');
        inspect(s, 'uplands_gunnhild'); say(g, /find it/);
        assert.strictEqual(g.questState('C2-S07'), 'active');
        inspect(s, 'uplands_tracks'); inspect(s, 'uplands_stand'); inspect(s, 'uplands_den');
        assert.ok(g.hasStoryFlag('greymane_found'));
        assert.ok(!seen(s, 'uplands', 'uplands_greymane') && !seen(s, 'uplands', 'uplands_den_smoke'));
        inspect(s, 'uplands_gunnhild');
        if (pick === 'hunt') {
            say(g, /kill her/);
            fight(g, s, 'uplands_greymane');
            assert.ok(g.hasStoryFlag('greymane_down'));
        } else {
            say(g, /smoke-pot/);
            assert.ok(g.player.inventory.includes('Smoke Pot'));
            assert.ok(!seen(s, 'uplands', 'uplands_greymane'), 'no fight on the gentle road');
            inspect(s, 'uplands_den_smoke');
            assert.ok(g.hasStoryFlag('greymane_driven') && !g.player.inventory.includes('Smoke Pot'));
        }
        assert.strictEqual(g.questState('C2-S07'), 'complete');
    });
}

test('C2-06 and C2-S07 mini bosses: Skuli Tally-Hand and Old Greymane are elites with readable live kits, loot and art; the lines fit', () => {
    const SPR = require('../assets/sprites/enso-enemies.js');
    for (const id of ['skuli_tally_hand', 'old_greymane']) {
        assert.ok(DATA.enemies[id].hp >= 120 && DATA.enemies[id].lootRank === 'elite', id);
        for (const a of DATA.actionRules.enemies[id].attacks) assert.ok(a.windupMs >= 600, `${id} ${a.name}: readable tell`);
        assert.ok(JSON.stringify(SPR).includes(id), `${id}: art`);
    }
    for (const id of ['torvald', 'steinar', 'gunnhild']) for (const node of Object.values(CH2.npcs[id].nodes)) for (const [, line] of node.lines || []) {
        assert.ok(line.length <= 160, `${id}: "${line}" is too long for one page`);
        assert.ok((line.match(/[.!?](\s|$)/g) || []).length <= 2, `${id}: "${line}" is more than two sentences`);
    }
});
