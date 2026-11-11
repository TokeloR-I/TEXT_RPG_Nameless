// Chapter Two, Act I (docs/design/CHAPTER_TWO_LORE.md; Tokelo 2026-11-11: "start building the world for chapter 2"):
// the east track opens when Chapter One is done, Frostspine Pass (C2-01) and Skeldvik Harbor (C2-02) play from the
// first step to the pointer at Hrafnholm, an older save walks straight on, and both maps paint whole.
// Fights are won by forcing enemy HP to 1: this checks story and accounting, not balance (Gauge and Tally).
const crypto = require('crypto');
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const CH2 = require('../src/story/chapter2.js');
const { walkTo, takeExit, inspect, contact } = require('./world-helpers.js');
const TABLET = 'Birkholt Name Tablet';

/** A character standing on the Overgrown Road. `done`: Chapter One finished (Q08 "Ten Seals" active, the crow won). */
function run(done = true, cls = 'warrior') {
    const g = new GameEngine({ seed: 98 });
    g.start(); g.act({ type: 'choose_class', classId: cls }); g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    if (done) {
        for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07']) g.story.quests[q].state = 'complete';
        g.story.flags.push('chapter_one_complete', 'aspect_nahemoth', 'anchor:homestead', 'north_gate_open');
        g.story.quests.Q08.state = 'active';
    }
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('road', 'from_grounds');
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
/** A level gained on the way can ask for a path: take the first, as a player pressing on would. */
function settle(g) { if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: g.getAvailableActions().actions[0].branchId }); }
function fight(g, s, id) { const r = contact(s, id); assert.strictEqual(r.type, 'encounter', `${id}: ${JSON.stringify(r).slice(0, 200)}`); win(g); s.fightOver(id, 'victory'); }
function talk(s, id) { const r = inspect(s, id); assert.strictEqual(r.type, 'talk', `${id}: ${JSON.stringify(r).slice(0, 200)}`); return r; }
function say(g, re) {
    const a = g.getAvailableActions(), c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(a.actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const text = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');

/** C2-01 start to finish; leaves you standing in Skeldvik. */
function frostspine(g, s) {
    assert.strictEqual(takeExit(s, 'road_frostspine').type, 'transition');
    fight(g, s, 'frostspine_caravan_raiders');
    inspect(s, 'frostspine_tablet');
    talk(s, 'frostspine_eydis'); say(g, /found this under her hands/); say(g, /carry it/); say(g, /Goodbye/);
    fight(g, s, 'frostspine_ulfrun');
    assert.strictEqual(takeExit(s, 'frostspine_north').type, 'transition');
    settle(g);
}

test('Chapter Two: the world with Hrimvald in it is valid, and its people, markers and conditions point at real things', () => {
    assert.deepStrictEqual(validateWorld(ZONE1, data, STORY), []);
    const objs = new Map();
    for (const [mid, m] of Object.entries(ZONE1.maps)) for (const o of [...(m.interactables || []), ...(m.encounters || [])]) objs.set(o.id, mid);
    for (const [id, q] of Object.entries(CH2.quests)) {
        assert.strictEqual(STORY.quests[id], q, `${id} is part of the one story`);
        for (const o of q.objectives) {
            if (o.marker) { const m = ZONE1.maps[o.marker.map]; assert.ok(m && o.marker.y < m.tiles.length && o.marker.x < m.tiles[0].length, `${id}.${o.id}: marker`); }
            if (['inspect', 'defeat'].includes(o.on.type)) assert.ok(objs.has(o.on.id), `${id}.${o.id}: ${o.on.id}`);
            if (o.on.type === 'enter') assert.ok(ZONE1.maps[o.on.id], `${id}.${o.id}: map`);
            // A step that waits on a conversation is offered by some choice or node.
            if (o.on.type === 'story' && !CH2.quests[id].teaser) assert.ok(JSON.stringify(CH2.npcs).includes(`"id":"${o.on.id}"`), `${id}.${o.id}: nobody fires ${o.on.id}`);
        }
    }
    for (const [nid, npc] of Object.entries(CH2.npcs)) {
        assert.ok([...Object.values(ZONE1.maps)].some((m) => (m.interactables || []).some((o) => o.npc === nid)), `${nid} stands on a map`);
        for (const t of npc.talk) assert.ok(npc.nodes[t.node], `${nid}: talk -> ${t.node}`);
        for (const [k, node] of Object.entries(npc.nodes)) {
            assert.ok((node.choices || []).length, `${nid}.${k}: a way out`);
            for (const c of node.choices) if (c.to) assert.ok(npc.nodes[c.to], `${nid}.${k}: -> ${c.to}`);
        }
    }
    for (const a of Object.values(CH2.anchors)) assert.ok(ZONE1.maps[a.map].spawns[a.spawn], 'anchor lands on a real spawn');
    // Lore rules (lore doc guardrails; Tokelo 2026-11-11): no door motif, and nobody here knows who the player was.
    const strings = [];
    (function walk(v) { if (typeof v === 'string') strings.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })([CH2, ZONE1.maps.frostspine_pass, ZONE1.maps.skeldvik]);
    const words = strings.join('\n');
    assert.ok(!/\bgates?\b|threshold|behind the door|door (that|which|between)/i.test(words), 'no door motif in Chapter Two text');
    assert.ok((words.match(/\bdoors?\b/gi) || []).length <= 1, 'a door is furniture here, at most');
    assert.ok(!/you (were|are) the (old )?(lord|king|sovereign|crown)|your (crown|throne|army)/i.test(words), 'no identity reveal');
    assert.ok(!/horn(ed)? helm/i.test(words));
});

test('Chapter Two: the east track stays shut until Chapter One is done, then leads to Frostspine Pass and back', () => {
    const early = run(false);
    const r = walkTo(early.s, 31, 9);
    assert.notStrictEqual((r || {}).type, 'transition');
    assert.strictEqual(early.s.mapId, 'road');
    assert.ok(/unfinished business/.test(ZONE1.maps.road.exits.find((e) => e.id === 'road_frostspine').lockedText));

    const { g, s } = run();
    assert.ok(/east track/.test(g.currentObjective('Q08').text), 'Ten Seals now says where to go');
    assert.ok(!STORY.quests.Q08.teaser);
    assert.strictEqual(takeExit(s, 'road_frostspine').type, 'transition');
    assert.strictEqual(s.mapId, 'frostspine_pass');
    assert.strictEqual(g.questState('Q08'), 'complete', 'following the crows east finishes Ten Seals');
    assert.strictEqual(g.questState('C201'), 'active');
    assert.strictEqual(takeExit(s, 'frostspine_west').type, 'transition');
    assert.strictEqual(s.mapId, 'road');
    assert.deepStrictEqual([s.x, s.y], [30, 9]);
});

test('C2-01 The Frostspine Road: raiders on the caravan guard the tablet, Ulfrun holds the only gap, Skeldvik lies beyond', () => {
    const { g, s } = run();
    takeExit(s, 'road_frostspine');
    // The gap is the only way east: with Ulfrun standing, the north exit can't be reached.
    assert.throws(() => walkTo(s, 26, 1), /no path/);
    // Until the raiders are beaten the bier gives nothing, and Eydis only whispers.
    assert.ok(/raiders are standing over/.test(JSON.stringify(inspect(s, 'frostspine_tablet'))));
    assert.ok(!g.player.inventory.includes(TABLET));
    assert.ok(/still at the biers/.test(text(talk(s, 'frostspine_eydis'))));
    say(g, /Stay by the fire/);
    const xp0 = g.player.xp + g.player.level * 1e6;
    fight(g, s, 'frostspine_caravan_raiders');
    assert.ok(g.hasStoryFlag('caravan_saved'));
    inspect(s, 'frostspine_tablet');
    assert.strictEqual(g.player.inventory.filter((i) => i === TABLET).length, 1);
    inspect(s, 'frostspine_tablet');
    assert.strictEqual(g.player.inventory.filter((i) => i === TABLET).length, 1, 'the tablet is given once');
    talk(s, 'frostspine_eydis'); say(g, /What is the Roll/); say(g, /clear the pass/); say(g, /Goodbye/);
    assert.strictEqual(g.currentObjective('C201').id, 'gap');
    fight(g, s, 'frostspine_ulfrun');
    assert.ok(g.hasStoryFlag('ulfrun_beaten'));
    assert.ok(g.player.xp + g.player.level * 1e6 > xp0);
    assert.strictEqual(takeExit(s, 'frostspine_north').type, 'transition');
    assert.strictEqual(s.mapId, 'skeldvik');
    assert.strictEqual(g.questState('C201'), 'complete');
    assert.strictEqual(g.questState('C202'), 'active');
    // Eydis came down by the goat track: gone from the pass, waiting at the memorial stone.
    assert.ok(s.visibleObjects('skeldvik').some((o) => o.id === 'skeldvik_eydis'));
    assert.ok(!s.visibleObjects('frostspine_pass').some((o) => o.id === 'frostspine_eydis'));
});

test('C2-01: a player who fights straight through still gets the Roll from Eydis in Skeldvik (no stall)', () => {
    const { g, s } = run();
    takeExit(s, 'road_frostspine');
    fight(g, s, 'frostspine_caravan_raiders');
    fight(g, s, 'frostspine_ulfrun');
    takeExit(s, 'frostspine_north');
    assert.strictEqual(g.questState('C201'), 'active', 'the tablet and the skald are still owed');
    talk(s, 'skeldvik_eydis'); say(g, /ask around/);
    takeExit(s, 'skeldvik_north');
    inspect(s, 'frostspine_tablet');
    settle(g);
    assert.strictEqual(g.questState('C201'), 'complete');
    assert.strictEqual(g.questState('C202'), 'active');
    assert.strictEqual(g.currentObjective('C202').id, 'memorial', 'meeting her at the harbour already counted');
});

for (const [choice, flag, keeps] of [[/belongs with the Roll/, 'tablet_with_eydis', false], [/Thora's guard/, 'tablet_with_reeve', false], [/keep carrying it/, 'tablet_kept', true]]) {
    test(`C2-02 Salt and Silver: three witnesses, then the tablet decision (${flag}) ends Act I and points at Hrafnholm`, () => {
        const { g, s } = run();
        frostspine(g, s);
        talk(s, 'skeldvik_eydis'); say(g, /ask around/);
        // She will not hear a verdict before you have asked.
        talk(s, 'skeldvik_eydis');
        assert.ok(!(g.getAvailableActions().actions || []).some((a) => /I know who/.test(a.text || '')));
        say(g, /still asking/);
        // Any order works: Solveig first, then Leif, then the stone.
        talk(s, 'skeldvik_solveig'); say(g, /Who split the memorial board/); say(g, /Thank you/);
        talk(s, 'skeldvik_leif'); say(g, /armed crews/); say(g, /Thank you/);
        inspect(s, 'skeldvik_memorial');
        assert.strictEqual(g.currentObjective('C202').id, 'decide');
        talk(s, 'skeldvik_eydis'); say(g, /I know who/); say(g, choice); say(g, /What happens now/); say(g, /Goodbye/);
        assert.ok(g.hasStoryFlag(flag) && g.hasStoryFlag('tablet_decided') && g.hasStoryFlag('skeldvik_evidence'));
        assert.strictEqual(g.player.inventory.includes(TABLET), keeps);
        assert.strictEqual(g.questState('C202'), 'complete');
        assert.strictEqual(g.trackedObjective().questId, 'C203');
        // The decision is made once, and Thora knows about it.
        talk(s, 'skeldvik_eydis');
        assert.ok(!(g.getAvailableActions().actions || []).some((a) => /I know who/.test(a.text || '')));
        say(g, /Goodbye/);
        const r = talk(s, 'skeldvik_thora');
        assert.strictEqual(/dues chest/.test(text(r)), flag === 'tablet_with_reeve');
    });
}

test('Chapter Two dialogue (Wick review): every spoken line fits one page of the dialogue box', () => {
    const DP = require('../ui/dialogue-pages.js');
    for (const [nid, npc] of Object.entries(CH2.npcs)) for (const [k, node] of Object.entries(npc.nodes)) for (const [, line] of node.lines || []) {
        assert.ok(DP.splitSentences(line).length <= 2, `${nid}.${k}: more than two sentences: ${line}`);
        assert.strictEqual(DP.paginate(line).length, 1, `${nid}.${k}: longer than one page: ${line}`);
    }
});

test('Skeldvik seeds Hrafnholm: the succession, the Wolf-Banner\'s own case and the southern silver, none of it required', () => {
    const { g, s } = run();
    frostspine(g, s);
    // Thora: whose law, and why the high seat is in question.
    talk(s, 'skeldvik_thora'); let r = say(g, /Whose law/);
    assert.ok(/Ragnhild Frostmark/.test(text(r)) && /grave-ale/.test(text(r)));
    assert.ok(g.hasStoryFlag('heard_of_succession'));
    say(g, /Goodbye/);
    // Geir speaks for Torvald; the silver question only once Leif has named it.
    talk(s, 'skeldvik_geir');
    assert.ok(!(g.getAvailableActions().actions || []).some((a) => /silver/.test(a.text || '')));
    r = say(g, /Who are you people/);
    assert.ok(/Arni/.test(text(r)) && g.hasStoryFlag('wolfbanner_heard'));
    say(g, /Goodbye/);
    talk(s, 'skeldvik_eydis'); say(g, /ask around/);
    talk(s, 'skeldvik_leif'); say(g, /armed crews/); r = say(g, /took it anyway/);
    assert.ok(/Osric Vane/.test(text(r)));
    say(g, /Goodbye/);
    talk(s, 'skeldvik_geir'); say(g, /silver/); say(g, /Goodbye/);
    assert.ok(g.hasStoryFlag('southern_friends_heard'));
    // Eydis: the Silent Field names Hallvard, and asking about him is then offered.
    talk(s, 'skeldvik_eydis'); r = say(g, /Silent Field/);
    assert.ok(/Hallvard/.test(text(r)) && g.hasStoryFlag('heard_of_hallvard'));
    r = say(g, /Who is Hallvard/);
    assert.ok(/Runa/.test(text(r)));
    // None of it is on the quest's path.
    assert.strictEqual(g.questState('C202'), 'active');
    for (const o of CH2.quests.C202.objectives) assert.ok(!['heard_of_succession', 'wolfbanner_heard', 'heard_of_hallvard'].includes(o.on.id));
});

test('Skeldvik: the harbour bell attunes a Black Flight anchor, and the crow can bring you back to it', () => {
    const { g, s } = run();
    frostspine(g, s);
    assert.ok(!g.flightAvailability().some((o) => o.anchorId === 'skeldvik'), 'not before you have stood there');
    inspect(s, 'skeldvik_bell');
    assert.ok(g.hasStoryFlag('anchor:skeldvik'));
    assert.strictEqual(s.blackFlight('homestead').type, 'transition');
    assert.strictEqual(s.mapId, 'grounds');
    const opt = g.flightAvailability().find((o) => o.anchorId === 'skeldvik');
    assert.ok(opt && opt.enabled && opt.region === 'Hrimvald');
    s.blackFlight('skeldvik');
    assert.strictEqual(s.mapId, 'skeldvik');
    assert.deepStrictEqual([s.x, s.y], [26, 4]);
});

test('Saves: a save from before Chapter Two existed loads, gets the new quests, and walks east into the pass', () => {
    const { g } = run();
    const save = JSON.parse(JSON.stringify(g.serialize()));
    for (const id of Object.keys(CH2.quests)) delete save.state.story.quests[id];        // what an older save looks like
    const res = new GameEngine({ seed: 1 }).load(save);
    assert.ok(res.ok, JSON.stringify(res.error));
    const back = GameEngine.fromSave(save);
    for (const id of Object.keys(CH2.quests)) assert.strictEqual(back.questState(id), 'unseen', `${id} filled in`);
    assert.strictEqual(back.questState('Q08'), 'active');
    back.player.hp = back.player.maxHp = 99999;
    const s = new WorldSession(ZONE1, { engine: back });
    s.place('road', 'from_grounds');
    frostspine(back, s);
    assert.strictEqual(back.questState('C201'), 'complete');
    // And a Chapter Two save round-trips mid-quest.
    const again = GameEngine.fromSave(JSON.parse(JSON.stringify(back.serialize())));
    assert.strictEqual(again.questState('C202'), 'active');
    assert.ok(again.player.inventory.includes(TABLET) && again.hasStoryFlag('eydis_in_skeldvik'));
});

test('The Wolf-Banner: three new enemies with turn stats, live-combat kits, loot ranks and art (candidates for Gauge)', () => {
    for (const id of ['wolfbanner_raider', 'wolfbanner_skirmisher', 'wolfbanner_ringleader']) {
        const e = data.enemies[id], kit = data.actionRules.enemies[id];
        assert.ok(e && e.hp === e.maxHp && e.xp > data.enemies.cult_zealot.xp, `${id}: a step above the zealot`);
        assert.ok(kit && kit.attacks.length >= 2, `${id}: an action kit`);
        for (const a of kit.attacks) assert.ok(e.skills.some((sk) => sk.name === a.skill), `${id}: ${a.name} uses one of its skills`);
        assert.ok(e.lootRank && e.lootLevel >= 3);
    }
    assert.strictEqual(data.enemies.wolfbanner_ringleader.lootRank, 'elite');
    const gate = ZONE1.maps.frostspine_pass.encounters.filter((e) => e.gate);
    assert.deepStrictEqual(gate.map((e) => e.id), ['frostspine_ulfrun']);
});

test('Scene art: Frostspine Pass and Skeldvik Harbor paint whole, the same every time, every tile named', () => {
    const SCENE = require('../ui/scene-art.js');
    require('../ui/scene-hrimvald.js');
    const nameAt = (m, x, y) => {
        if (y < 0 || y >= m.tiles.length || x < 0 || x >= m.tiles[0].length) return null;
        const ch = m.tiles[y][x], def = (m.legend && m.legend[ch]) || ZONE1.tileset[ch];
        return def ? def.name : null;
    };
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    const painted = {
        frostspine_pass: ['ground', 'road', 'fir', 'crag', 'rock', 'watch_post', 'mile_marker', 'caravan', 'bier', 'campfire', 'crate', 'wolf_banner', 'cairn', 'log'],
        skeldvik: ['snow', 'cobble', 'yard', 'wharf', 'steps', 'terrace', 'water', 'cliff', 'fir', 'skerry', 'waterfall', 'palisade', 'terrace_wall', 'inn', 'house',
            'shipyard_hall', 'shipyard', 'harbour_bell', 'memorial_stone', 'ring_stone', 'brazier', 'banner', 'customs_stone', 'stall', 'fish_rack', 'nets', 'crane',
            'barrel', 'crate', 'log_pile', 'workbench', 'fence', 'longship', 'rowboat']
    };
    for (const [mapId, names] of Object.entries(painted)) {
        const map = ZONE1.maps[mapId];
        assert.strictEqual(map.scene, mapId);
        assert.ok(SCENE.has(map), `${mapId}: scene registered`);
        const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
        assert.strictEqual(a.w, map.tiles[0].length * 32); assert.strictEqual(a.h, map.tiles.length * 32);
        assert.strictEqual(sha(a.base), sha(b.base), `${mapId}: deterministic`);
        assert.strictEqual(sha(a.over), sha(b.over), `${mapId}: deterministic over layer`);
        for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`${mapId}: base pixel ${(i - 3) / 4} is not opaque`);
        const known = new Set(names), used = new Set();
        for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) { const n = nameAt(map, x, y); assert.ok(known.has(n), `${mapId} ${x},${y}: ${n}`); used.add(n); }
        assert.deepStrictEqual([...used].sort(), [...known].sort(), `${mapId}: nothing listed that the map doesn't use`);
        for (const [id, sp] of Object.entries(map.spawns)) assert.ok(a.over[((sp.y * 32 + 16) * a.w + sp.x * 32 + 16) * 4 + 3] < 60, `${mapId}: open over spawn ${id}`);
        assert.strictEqual(typeof a.animate, 'function');
    }
});
