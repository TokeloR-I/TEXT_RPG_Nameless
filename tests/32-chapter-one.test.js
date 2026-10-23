// Chapter One end to end through the real world model + engine (CH1-01..03): the mainline route, the
// 250-XP-before-the-Warden guarantee for every class with ALL optional content skipped, the Warden's
// tragedy beats, the key and memory, Orin, Shane's quest and his exact "Suffer!" goodbye, no duplicate
// rewards. Fights are won by forcing enemy HP to 1: this checks story and XP accounting, not balance
// (class survival per encounter is Tally's QA, docs/design/ENSO_CH1_ENCOUNTERS_XP_AND_BALANCE.md).
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const { walkTo, takeExit, inspect, contact, travel } = require('./world-helpers.js');

function run(cls = 'warrior', seed = 1) {
    const g = new GameEngine({ seed });
    g.start();
    g.act({ type: 'choose_class', classId: cls });
    g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    const s = new WorldSession(ZONE1, { engine: g });
    const log = [];
    return { g, s, log };
}
const lines = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text);
/** Win the fight that just started (enemies forced to 1 HP each turn). */
function win(g) {
    for (let i = 0; i < 100 && g.mode === 'combat'; i++) {
        for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1;
        const a = g.getAvailableActions();
        if (a.awaiting === 'continue') g.act({ type: 'continue' });
        else { const t = g.alive(g.combat.enemies)[0]; g.act({ type: 'attack', targetId: t.id }); }
    }
    assert.strictEqual(g.world.lastResult, 'victory');
}
function fight(g, s, id) { const r = contact(s, id); assert.strictEqual(r.type, 'encounter', `${id}: ${JSON.stringify(r)}`); win(g); s.fightOver(id, 'victory'); }
function talk(s, objId) { const r = inspect(s, objId); assert.strictEqual(r.type, 'talk', `${objId}: ${JSON.stringify(r).slice(0, 200)}`); return r; }
function say(g, re) {
    const a = g.getAvailableActions();
    const c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(a.actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const bye = (g) => g.act({ type: 'dialogue_leave' });
const total = (g) => { let t = g.player.xp, need = 100; for (let l = 1; l < g.player.level; l++) { t += need; need = Math.floor(need * 1.5); } return t; };

/** The whole mainline up to the Warden's warning, skipping every optional thing. Returns XP before the boss. */
function mainline(ctx) {
    const { g, s } = ctx;
    inspect(s, 'cellar_inscription');
    travel(s, 'house');
    assert.strictEqual(g.questState('Q01'), 'complete');
    travel(s, 'grounds'); inspect(s, 'grounds_foundation');
    travel(s, 'road');
    assert.strictEqual(g.questState('Q02'), 'complete');
    travel(s, 'tollway');
    talk(s, 'tollway_elian'); say(g, /going on to the village/); say(g, /Goodbye/);
    assert.strictEqual(g.questState('Q03'), 'complete');
    fight(g, s, 'tollway_ragpickers');
    fight(g, s, 'tollway_root_chewers');
    assert.strictEqual(total(g), 105, 'segment B: 15+20+25 quest + 20+25 enemy');
    assert.strictEqual(g.player.level, 2);
    takeExit(s, 'tollway_south');
    talk(s, 'village_tamsin'); bye(g);
    talk(s, 'village_mara'); bye(g);
    assert.strictEqual(g.questState('Q04'), 'complete');
    const shut = walkTo(s, 15, 1) && s.move('up');
    assert.deepStrictEqual([shut.type, s.mapId], ['locked', 'shamefield'], 'the orchard gate is shut until Q05');
    talk(s, 'village_captain'); bye(g);
    travel(s, 'tollway'); inspect(s, 'tollway_register');
    assert.ok(g.player.inventory.includes('Tollway Register'));
    travel(s, 'shamefield');
    talk(s, 'village_captain'); say(g, /Here it is/); bye(g);
    assert.strictEqual(g.questState('Q05'), 'complete');
    assert.ok(!g.player.inventory.includes('Tollway Register'), 'handed over');
    travel(s, 'orchard');
    fight(g, s, 'orchard_cultists');
    takeExit(s, 'orchard_north');
    fight(g, s, 'featherwatch_ghoul');
    takeExit(s, 'featherwatch_north');
    inspect(s, 'sanctuary_journal');
    const warn = talk(s, 'sanctuary_warden_npc');
    assert.match(lines(warn).join('\n'), /Quest complete: The Keeper's Warning \(\+30 XP\)[\s\S]*There is nothing down there worth another life\. Turn back\./);
    return total(g);
}

test('Chapter One: every class reaches level 3 with exactly 250 XP before the Warden, skipping all optional content', () => {
    for (const cls of Object.keys(data.basePlayerClasses)) {
        const ctx = run(cls, 3);
        const xp = mainline(ctx);
        assert.strictEqual(xp, 250, `${cls}: 135 quest + 115 enemy XP`);
        assert.strictEqual(ctx.g.player.level, 3, cls);
        assert.strictEqual(ctx.g.stats.fights, 4, `${cls}: only the four required fights`);
        assert.strictEqual(ctx.g.mode, 'explore', `${cls}: still talking to the Warden`);
        bye(ctx.g);
        assert.strictEqual(ctx.g.mode, 'branch_select', `${cls}: the evolution choice comes before the boss`);
    }
});

test('Chapter One: the Warden warns, can be left in peace, and only fights when you choose it; his death gives the key once and ends nothing', () => {
    const ctx = run('rogue', 4);
    const { g, s } = ctx;
    mainline(ctx);
    say(g, /What is behind it/);
    say(g, /I'll go/);
    g.act({ type: 'choose_branch', branchId: Object.keys(data.evolutionPaths.rogue.branches)[0] });
    assert.ok(!s.visibleObjects().some((o) => o.id === 'sanctuary_warden'), 'no boss fight until you choose one');
    const locked = takeExit(s, 'sanctuary_seal');
    assert.match(locked.text, /no keyhole/, 'the seal is shut');
    talk(s, 'sanctuary_warden_npc'); say(g, /Stand aside/);
    const draw = say(g, /Draw your weapon/);
    assert.doesNotMatch(lines(draw).join('\n'), /Suffer/);
    assert.ok(s.visibleObjects().some((o) => o.id === 'sanctuary_warden'), 'he stands between you and the seal');
    assert.ok(!s.visibleObjects().some((o) => o.id === 'sanctuary_warden_npc'));
    const before = g.stats.fights;
    contact(s, 'sanctuary_warden');
    assert.strictEqual(g.combat.enemies[0].key, 'crow_touched_warden', 'the existing boss, unchanged');
    for (let i = 0; i < 100 && g.mode === 'combat'; i++) { g.combat.enemies[0].hp = Math.min(g.combat.enemies[0].hp, 1); const a = g.getAvailableActions(); g.act(a.awaiting === 'continue' ? { type: 'continue' } : a.awaiting === 'turn_order' ? { type: 'turn_order', order: null } : { type: 'attack', targetId: 'enemy_0' }); }
    assert.strictEqual(g.mode, 'explore', 'the campaign goes on (no win screen on the world route)');
    assert.strictEqual(g.stats.fights, before + 1);
    s.fightOver('sanctuary_warden', 'victory');
    assert.ok(g.player.inventory.includes('Seal-Key of the First Echo'));
    assert.ok(g.hasStoryFlag('warden_dead') && g.hasStoryFlag('crow_warden_memory_key'));
    const open = takeExit(s, 'sanctuary_seal');
    assert.deepStrictEqual([open.type, open.to], ['transition', 'seal_chamber']);
    const memory = inspect(s, 'seal_first_echo');
    const text = lines(memory).join('\n');
    assert.match(text, /a street full of people[\s\S]*Only that whoever gave it expected to be obeyed/);
    assert.doesNotMatch(text, /\byou (were|are) the (lord|ruler|tyrant)/i, 'no early reveal');
    assert.ok(!g.player.inventory.includes('Seal-Key of the First Echo'), 'the key is spent');
    assert.strictEqual(g.questState('Q07'), 'active');
    const again = inspect(s, 'seal_first_echo');
    assert.doesNotMatch(lines(again).join('\n'), /Received|Quest/, 'nothing twice');
    // home: Orin, the ledger, and the first repair (Rook's build rule fires the story event)
    travel(s, 'grounds');
    talk(s, 'grounds_orin'); say(g, /rebuilt/);
    assert.ok(g.player.inventory.includes("Builder's Ledger"));
    bye(g);
    assert.strictEqual(g.questState('Q07'), 'active', 'waiting for the gate repair');
    g.storyEvent({ type: 'build', id: 'homestead_gate' });
    assert.strictEqual(g.questState('Q07'), 'complete');
    assert.ok(g.hasStoryFlag('chapter_one_complete'));
    assert.strictEqual(g.trackedObjective().questId, 'Q08', 'a clear next objective toward chapter two');
    assert.strictEqual(g.player.inventory.filter((i) => i === "Builder's Ledger").length, 1);
});

test("Chapter One: Shane's quest: chant, pursuers, ledger, recruitment, and \"Suffer!\" on every normal goodbye", () => {
    const ctx = run('necromancer', 6);
    const { g, s } = ctx;
    travel(s, 'tollway');
    fight(g, s, 'tollway_ragpickers'); fight(g, s, 'tollway_root_chewers');
    const arrive = takeExit(s, 'tollway_south');
    assert.match(lines(arrive).join('\n'), /Shame on Shane! Shame on Shane!/);
    talk(s, 'village_crowd'); say(g, /What did he do/); bye(g);
    assert.strictEqual(g.questState('S01'), 'available');
    let r = talk(s, 'village_shane');
    assert.match(lines(r).join('\n'), /Shane: "They say it as if shame pays my debts\. It does not\."/);
    say(g, /Why are the watch after you/);
    say(g, /What do you need/);
    r = say(g, /I'll get your ledger/);
    assert.ok(lines(r).includes('Shane: "Suffer!"'), 'exact line, exact punctuation');
    assert.strictEqual(g.questState('S01'), 'active');
    // a quick hello-goodbye also ends with it
    talk(s, 'village_shane'); r = bye(g);
    assert.deepStrictEqual(lines(r).slice(-1), ['Shane: "Suffer!"']);
    travel(s, 'allotment');
    assert.ok(s.visibleObjects().some((o) => o.id === 'allotment_watch'), 'the pursuers are at the wagon now');
    fight(g, s, 'allotment_watch');
    inspect(s, 'allotment_wagon');
    assert.ok(g.player.inventory.includes("Shane's Ledger"));
    travel(s, 'shamefield');
    talk(s, 'village_shane'); say(g, /Here's your ledger/);
    r = bye(g);
    assert.ok(lines(r).includes('Shane: "Suffer!"'));
    assert.strictEqual(g.questState('S01'), 'complete');
    for (const f of ['shane_met', 'shane_ledger_found', 'shane_watch_resolved', 'shane_recruited', 'shane_stall_unlocked']) assert.ok(g.hasStoryFlag(f), f);
    assert.ok(!g.player.inventory.includes("Shane's Ledger"));
    assert.ok(!s.visibleObjects().some((o) => o.id === 'village_shane'), 'he has left the village');
    travel(s, 'grounds');
    assert.strictEqual(s.visibleObjects().filter((o) => o.npc === 'shane').length, 1, 'one Shane, at home');
    talk(s, 'grounds_shane');
    say(g, /What have you got/);
    say(g, /farming/);
    r = bye(g);
    assert.ok(lines(r).includes('Shane: "Suffer!"'));
    assert.ok(g.hasStoryFlag('farm_intro_offered'));
    // the watch remembers
    travel(s, 'shamefield');
    r = talk(s, 'village_captain');
    assert.match(lines(r).join('\n'), /limping from Shane's allotment/);
});

test('Chapter One: no reward twice: re-entering maps, re-talking and save/restore never repeat quest XP or items', () => {
    const ctx = run('mage', 8);
    const { g, s } = ctx;
    inspect(s, 'cellar_inscription'); travel(s, 'house'); travel(s, 'grounds'); inspect(s, 'grounds_foundation'); travel(s, 'road'); travel(s, 'tollway');
    talk(s, 'tollway_elian'); say(g, /going on to the village/); bye(g);
    const xp = total(g);
    const copy = new GameEngine({ seed: 8 });
    copy.restore(g.snapshot());
    const s2 = new WorldSession(ZONE1, { engine: copy, map: s.mapId, spawn: 'from_road' });
    for (const [eng, ses] of [[g, s], [copy, s2]]) {
        travel(ses, 'road'); travel(ses, 'grounds'); inspect(ses, 'grounds_foundation'); travel(ses, 'cellar'); inspect(ses, 'cellar_inscription'); travel(ses, 'house');
        assert.strictEqual(total(eng), xp, 'nothing paid again');
    }
    // the notice-board jobs: an already-beaten wolf completes its job at once, paid once
    travel(s, 'road');
    fight(g, s, 'road_wolf');
    travel(s, 'tollway');
    fight(g, s, 'tollway_ragpickers'); fight(g, s, 'tollway_root_chewers');
    travel(s, 'shamefield');
    const before = total(g);
    const board = inspect(s, 'village_notice_board');
    assert.match(lines(board).join('\n'), /Job started|Side quest started/);
    assert.strictEqual(g.questState('J01'), 'complete');
    assert.strictEqual(total(g), before + STORY.quests.J01.xp);
    inspect(s, 'village_notice_board');
    assert.strictEqual(total(g), before + STORY.quests.J01.xp);
});

test('Chapter One: content integrity: every objective marker, npc and condition points at something real', () => {
    assert.deepStrictEqual(validateWorld(ZONE1, data, STORY), []);
    const placed = new Set(Object.values(ZONE1.maps).flatMap((m) => [...(m.interactables || []), ...(m.encounters || [])]).map((o) => o.id));
    const npcsOnMaps = new Set(Object.values(ZONE1.maps).flatMap((m) => (m.interactables || []).filter((o) => o.kind === 'npc').map((o) => o.npc)));
    for (const [id, q] of Object.entries(STORY.quests)) {
        for (const o of q.objectives) {
            if (o.marker) assert.ok(ZONE1.maps[o.marker.map], `${id}.${o.id}: marker map ${o.marker.map}`);
            if (['inspect', 'defeat', 'pickup'].includes(o.on.type)) assert.ok(placed.has(o.on.id), `${id}.${o.id}: nothing called ${o.on.id} on any map`);
            if (o.on.type === 'enter') assert.ok(ZONE1.maps[o.on.id], `${id}.${o.id}: no map ${o.on.id}`);
            if (o.on.type === 'talk') assert.ok(npcsOnMaps.has(o.on.id), `${id}.${o.id}: ${o.on.id} isn't on any map`);
        }
    }
    for (const [nid, npc] of Object.entries(STORY.npcs)) {
        for (const t of npc.talk) assert.ok(npc.nodes[t.node], `${nid}: talk -> ${t.node}`);
        for (const [k, node] of Object.entries(npc.nodes)) for (const c of node.choices || []) if (c.to) assert.ok(npc.nodes[c.to], `${nid}.${k}: -> ${c.to}`);
    }
    // XP table from the design doc
    const main = ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'Q06'].map((q) => STORY.quests[q].xp);
    assert.deepStrictEqual(main, [15, 20, 25, 25, 20, 30]);
    const gates = Object.values(ZONE1.maps).flatMap((m) => m.encounters || []).filter((e) => e.gate);
    assert.strictEqual(gates.reduce((sum, e) => sum + e.enemies.reduce((t, k) => t + data.enemies[k].xp, 0), 0), 115, 'required fights: 20+25+40+30');
    assert.strictEqual(STORY.npcs.shane.farewell, 'Suffer!');
});
