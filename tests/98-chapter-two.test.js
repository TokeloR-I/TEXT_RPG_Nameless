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
        for (const o of q.awaitsArea ? [] : q.objectives) {   // awaitsArea: content waiting on Tokelo's picture of its area (tests/100)
            if (o.marker) { const m = ZONE1.maps[o.marker.map]; assert.ok(m && o.marker.y < m.tiles.length && o.marker.x < m.tiles[0].length, `${id}.${o.id}: marker`); }
            if (['inspect', 'defeat'].includes(o.on.type)) assert.ok(objs.has(o.on.id), `${id}.${o.id}: ${o.on.id}`);
            if (o.on.type === 'enter') assert.ok(ZONE1.maps[o.on.id], `${id}.${o.id}: map`);
            // A step that waits on a conversation is offered by some choice or node.
            if (o.on.type === 'story' && !CH2.quests[id].teaser) assert.ok(JSON.stringify([CH2.npcs, CH2.triggers]).includes(`"id":"${o.on.id}"`), `${id}.${o.id}: nobody fires ${o.on.id}`);
        }
    }
    for (const [nid, npc] of Object.entries(CH2.npcs)) {
        if (!npc.awaitsArea && !npc.portable) assert.ok([...Object.values(ZONE1.maps)].some((m) => (m.interactables || []).some((o) => o.npc === nid || o.station === nid)), `${nid} stands on a map`);
        for (const t of npc.talk) assert.ok(npc.nodes[t.node], `${nid}: talk -> ${t.node}`);
        for (const [k, node] of Object.entries(npc.nodes)) {
            assert.ok((node.choices || []).length, `${nid}.${k}: a way out`);
            for (const c of node.choices) if (c.to) assert.ok(npc.nodes[c.to], `${nid}.${k}: -> ${c.to}`);
        }
    }
    for (const a of Object.values(CH2.anchors)) assert.ok(ZONE1.maps[a.map].spawns[a.spawn], 'anchor lands on a real spawn');
    // Lore rules (lore doc guardrails; Tokelo 2026-11-11): no door motif, and nobody here knows who the player was.
    const strings = [];
    (function walk(v) { if (typeof v === 'string') strings.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })([CH2, ZONE1.maps.frostspine_pass, ZONE1.maps.skeldvik, ZONE1.maps.stormtide_inn, ZONE1.maps.hrafnholm, ZONE1.maps.hall_of_winter, ZONE1.maps.jarnmyr,
        ZONE1.maps.silent_field, ZONE1.maps.birkholt, ZONE1.maps.runadal, ZONE1.maps.bjarki_barrow]);
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
        // The decision is made once: Eydis goes up the road to read at the Thing (C2-03), and Thora knows about it.
        assert.ok(!s.visibleObjects('skeldvik').some((o) => o.id === 'skeldvik_eydis'), 'Eydis has gone on to Hrafnholm');
        assert.ok(s.visibleObjects('hrafnholm').some((o) => o.id === 'hrafnholm_eydis'));
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
    assert.deepStrictEqual([s.x, s.y], [39, 5]);
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

test('Scene art: every Hrimvald map (Frostspine Pass to Bjarki\'s Barrow) paints whole, the same every time, every tile named', () => {
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
            'barrel', 'crate', 'log_pile', 'workbench', 'fence', 'longship', 'rowboat'],
        hrafnholm: ['snow', 'cobble', 'yard', 'paving', 'steps', 'cliff', 'fir', 'boulder', 'palisade', 'arch_post', 'fence', 'great_hall', 'terrace_wall', 'house',
            'guildhall', 'forge', 'stall', 'shed', 'ring_wall', 'tier_bench', 'law_rock', 'brazier', 'banner', 'bench', 'feast_table', 'war_memorial', 'target', 'dummy',
            'weapon_rack', 'anvil', 'crate', 'barrel', 'log_pile'],
        stormtide_inn: ['planks', 'wall', 'post', 'kitchen_shelf', 'pantry', 'prep_table', 'cask_rack', 'bar_counter', 'stool', 'long_fire', 'feast_table',
            'bench', 'tafl_table', 'barrel'],
        hall_of_winter: ['floor', 'runner', 'dais', 'dais_steps', 'wall', 'post', 'screen', 'high_seat', 'chair', 'side_table', 'brazier', 'fire_pit', 'feast_table',
            'skald_corner', 'law_table', 'name_boards', 'candle_table', 'berry_jar', 'weapon_rack', 'shield_stand', 'fur_chest', 'barrel', 'shields', 'wall_banner', 'crate'],
        gullstrand_coast: ['grass', 'path', 'flagstones', 'steps', 'shingle', 'wharf', 'water', 'cliff', 'fir', 'rock', 'wolf_carving', 'sun_cave', 'moon_cave',
            'binding_stone', 'house', 'awning', 'net_shed', 'fish_rack', 'fence', 'barrel', 'crate', 'rowboat', 'wreck'],
        jarnmyr: ['moor', 'path', 'yard', 'boardwalk', 'peat', 'quarry_floor', 'barrow_mouth', 'bog', 'crag', 'fir', 'kiln', 'woodshed', 'charcoal', 'log_pile',
            'furnace', 'slag', 'ore', 'stone_hut', 'shed', 'smithy', 'smithy_wing', 'weapon_rack', 'anvil', 'ingots', 'ore_cart', 'barrel', 'fence', 'quarry', 'crane',
            'blocks', 'barrow', 'peat_stack'],
        silent_field: ['tall_grass', 'path', 'torn_earth', 'bridge', 'round_stone', 'stream', 'rock', 'dead_tree', 'grave', 'memorial_stone', 'bell_tower',
            'field_tent', 'relic', 'war_banner'],
        birkholt: ['meadow', 'path', 'barley', 'fence', 'house', 'sheep_shelter', 'sheep', 'trough', 'loom_shed', 'drying_rack', 'standing_stone', 'rock',
            'memorial_cloth', 'herbs', 'barrel', 'cart', 'birch'],
        runadal: ['moss', 'path', 'pine', 'boulder', 'rune_stone', 'ring_stone', 'offering_table', 'lean_to', 'campfire', 'stump'],
        bjarki_barrow: ['flagstones', 'rubble', 'barrow_mouth', 'dais_steps', 'knot_wall', 'grave_slab', 'dais', 'stone_coffin', 'flame_altar', 'fire_pillar',
            'candle_stand', 'urn', 'grave_coffin', 'grave_goods']
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

test('Playtest 2026-11-11 (16 px world): the harbour bell answers E from the terrace in front of it, and the stair opens onto the town', () => {
    const { doubleWorld } = require('../src/world/scale16.js');
    const { pathTo } = require('./world-helpers.js');
    const W16 = doubleWorld(ZONE1);
    const { g } = run();
    const s = new WorldSession(W16, { engine: g });
    s.place('skeldvik', 'flight_bell');
    assert.strictEqual(s.facing, 'up');
    const r = s.interact();
    assert.strictEqual(r.type, 'message', 'arriving by crow you face the bell, and E rings true');
    assert.strictEqual(r.id, 'skeldvik_bell');
    // Down the Upland stair: straight on to the alehouse door across the square, past the memorial without a detour.
    s.place('skeldvik', 'from_pass');
    const steps = pathTo(s, 24 * 2, 10 * 2).length;
    assert.ok(steps <= 60, `the alehouse door is ${steps} steps from the foot of the stair (it was 112 to the old inn, the long way round)`);
});

test('Skeldvik re-laid at full scale: a save standing in the old harbour starts at the stair, a new one keeps its spot', () => {
    const { doubleWorld } = require('../src/world/scale16.js');
    const W16 = doubleWorld(ZONE1);
    const { g } = run();
    const s = new WorldSession(W16, { engine: g });
    const old = { map: 'skeldvik', x: 60, y: 30, facing: 'left', tile: 16 };
    assert.strictEqual(s.restorePosition(old, { revision: 1 }), false);
    assert.deepStrictEqual([s.mapId, s.x, s.y], ['skeldvik', W16.maps.skeldvik.spawns.from_pass.x, W16.maps.skeldvik.spawns.from_pass.y]);
    s.place('skeldvik', 'flight_bell');
    const here = { map: 'skeldvik', x: s.x, y: s.y + 2, facing: 'down', tile: 16 };
    assert.strictEqual(s.restorePosition(here, { revision: 2 }), true);
    assert.deepStrictEqual([s.x, s.y], [here.x, here.y]);
});

// C2-03 (Tokelo, 2026-11-13: the Hrafnholm and Hall of Winter reference pictures): the road from Skeldvik opens,
// the Jarl is in her hall beside the empty seat, Torvald is in the yard, and the Thing itself is the next part.
/** Act I done (the tablet decided by `choice`); leaves you in Skeldvik with C203 active. */
function actOne(g, s, choice = /belongs with the Roll/) {
    frostspine(g, s);
    talk(s, 'skeldvik_eydis'); say(g, /ask around/);
    talk(s, 'skeldvik_solveig'); say(g, /Who split the memorial board/); say(g, /Thank you/);
    talk(s, 'skeldvik_leif'); say(g, /armed crews/); say(g, /Thank you/);
    inspect(s, 'skeldvik_memorial');
    talk(s, 'skeldvik_eydis'); say(g, /I know who/); say(g, choice); say(g, /What happens now/); say(g, /Goodbye/);
    settle(g);
    assert.strictEqual(g.questState('C203'), 'active');
}

test('C2-03 Hrafnholm: the south-west road leads up to the town, the Jarl waits by the empty seat, Torvald in the yard', () => {
    const { g, s } = run();
    actOne(g, s);
    assert.strictEqual(g.currentObjective('C203').id, 'hrafnholm');
    assert.strictEqual(takeExit(s, 'skeldvik_west_road').type, 'transition');
    assert.strictEqual(s.mapId, 'hrafnholm');
    assert.strictEqual(g.currentObjective('C203').id, 'ragnhild', 'arriving is the first step');
    // Into the hall by its entrance, and the Jarl knows the stranger gave the board to Eydis.
    assert.strictEqual(takeExit(s, 'hrafnholm_hall_entry').type, 'transition');
    assert.strictEqual(s.mapId, 'hall_of_winter');
    assert.ok(/skald and not to this hall/.test(text(talk(s, 'hall_ragnhild'))));
    say(g, /high seat empty/); say(g, /What will you ask the Thing/); say(g, /Goodbye/);
    assert.ok(g.hasStoryFlag('ragnhild_met'));
    assert.strictEqual(g.currentObjective('C203').id, 'torvald');
    assert.ok(/guest of this hall/.test(text(talk(s, 'hall_ragnhild'))), 'the second time she only reminds you');
    say(g, /Goodbye/);
    assert.ok(/empty/.test(JSON.stringify(inspect(s, 'hall_high_seat'))));
    takeExit(s, 'hall_of_winter_out');
    assert.strictEqual(s.mapId, 'hrafnholm');
    // Torvald remembers Ulfrun was spared.
    assert.ok(/let her walk away/.test(text(talk(s, 'hrafnholm_torvald'))));
    say(g, /name boards/); say(g, /Goodbye/);
    assert.strictEqual(g.currentObjective('C203').id, 'thing', 'the Thing itself is the next part of Chapter Two');
    assert.strictEqual(g.questState('C203'), 'active');
    // The way on to the Silent Field is a boundary until its picture comes.
    assert.ok(ZONE1.maps.hrafnholm.exits.some((e) => e.id === 'hrafnholm_silent_field' && e.toMap === 'silent_field'), 'the north-east track goes up to the Silent Field (Act II)');
    // And the road home: back down to Skeldvik's south-west corner.
    walkTo(s, 25, 38);
    assert.strictEqual(takeExit(s, 'hrafnholm_south_road').type, 'transition');
    assert.strictEqual(s.mapId, 'skeldvik');
});

test('C2-03: what Act I decided and heard changes how Hrafnholm receives you', () => {
    for (const [choice, line] of [[/Thora's guard/, /Thora wrote to me/], [/keep carrying it/, /I ask you for it, formally/]]) {
        const { g, s } = run();
        actOne(g, s, choice);
        takeExit(s, 'skeldvik_west_road'); takeExit(s, 'hrafnholm_hall_entry');
        assert.ok(line.test(text(talk(s, 'hall_ragnhild'))), String(line));
        say(g, /Goodbye/);
    }
    // Optional threads only add choices: Osric knows his name has gone before him, Runa can be asked about her father.
    const { g, s } = run();
    actOne(g, s);
    takeExit(s, 'skeldvik_west_road');
    g.story.flags.push('heard_of_osric', 'heard_of_hallvard');
    assert.ok(/heard my name already/.test(text(talk(s, 'hrafnholm_osric')))); say(g, /Goodbye/);
    talk(s, 'hrafnholm_runa'); say(g, /Your father/); say(g, /Goodbye/);
    talk(s, 'hrafnholm_arnkel'); say(g, /twenty winters/); say(g, /Goodbye/);
    talk(s, 'hrafnholm_sigrun'); say(g, /What do you want/); say(g, /Goodbye/);
});

test('C2-03: a save from before Hrafnholm, standing in Skeldvik with the old pointer, walks straight up the road', () => {
    const { g, s } = run();
    actOne(g, s);
    const save = JSON.parse(JSON.stringify(g.serialize()));
    save.game.revision = 2;                                                       // made before Hrafnholm was built
    const again = GameEngine.fromSave(save);
    assert.strictEqual(again.questState('C203'), 'active');
    assert.strictEqual(again.currentObjective('C203').id, 'hrafnholm');
    const s2 = new WorldSession(ZONE1, { engine: again });
    s2.place('skeldvik', 'from_hrafnholm');
    assert.strictEqual(takeExit(s2, 'skeldvik_west_road').type, 'transition');
    assert.strictEqual(again.currentObjective('C203').id, 'ragnhild');
});

test("Gullstrand Coast (Tokelo's picture, 2026-11-13): the cliff path from Skeldvik, Brynja's clues, both hunts, the Binding Echo, and the waking", () => {
    const { g, s } = run();
    frostspine(g, s);
    const visible = (id) => s.visibleObjects('gullstrand_coast').some((o) => o.id === id);
    assert.strictEqual(takeExit(s, 'skeldvik_gullstrand').type, 'transition');
    assert.strictEqual(s.mapId, 'gullstrand_coast');
    assert.ok(g.story.seen.includes('enter:gullstrand_coast'));
    // Brynja gives the clue before the carving is read, and no marker gives the quest away.
    talk(s, 'gullstrand_brynja'); say(g, /turn its back/); say(g, /Answering it/); say(g, /Goodbye/);
    assert.notStrictEqual(g.questState('CL1'), 'active');
    assert.ok(!visible('gullstrand_sun_hunt') && !visible('gullstrand_moon_hunt') && !visible('wolfs_wake_trial'), 'nothing wakes before the carving');
    inspect(s, 'gullstrand_wolf_carving');
    assert.strictEqual(g.questState('CL1'), 'active');
    assert.ok(visible('gullstrand_sun_hunt'), 'the sun-mad wolves lift their heads');
    for (const o of CH2.quests.CL1.objectives) assert.ok(o.marker && o.marker.map === 'gullstrand_coast', `${o.id} has a marker on the coast`);
    talk(s, 'gullstrand_brynja'); say(g, /dark hollow/);
    say(g, /Goodbye/);
    // The bright cave can't be used while its wolves lie across it.
    const guarded = inspect(s, 'gullstrand_sun_cairn');
    assert.strictEqual(guarded.type, 'message');
    assert.strictEqual(guarded.guarded, 'gullstrand_sun_hunt');
    // Moon first this time: a light is no use, waiting in the dark gives the fang and wakes the hollow's wolves.
    talk(s, 'gullstrand_moon_hollow'); say(g, /Hold your light up/); say(g, /Go back in/); say(g, /Put out your light/); say(g, /Turn round/);
    assert.ok(g.player.inventory.includes('Moon Fang'));
    assert.ok(visible('gullstrand_moon_hunt'));
    fight(g, s, 'gullstrand_moon_hunt');
    settle(g);
    assert.ok(g.hasStoryFlag('fenrir_moon_wolves_beaten'));
    assert.strictEqual(g.currentObjective('CL1').id, 'sun', 'the sun step is still owed');
    fight(g, s, 'gullstrand_sun_hunt');
    settle(g);
    talk(s, 'gullstrand_sun_cairn'); say(g, /Go on/);
    assert.ok(g.player.inventory.includes('Sun Fang'));
    assert.strictEqual(g.currentObjective('CL1').id, 'stone');
    talk(s, 'gullstrand_binding_stone'); say(g, /Lay the Sun Fang/); say(g, /Face it/);
    assert.ok(visible('wolfs_wake_trial'), 'the Binding Echo wakes on the ring');
    assert.strictEqual(g.currentObjective('CL1').id, 'trial');
    fight(g, s, 'wolfs_wake_trial');
    settle(g);
    assert.ok(g.hasStoryFlag('fenrir_trial_cleared') && !visible('wolfs_wake_trial'));
    talk(s, 'gullstrand_binding_stone'); say(g, /^Hati/);
    assert.strictEqual(g.questState('CL1'), 'complete');
    assert.ok(g.webOwns('heart.fenrirs_heir'));
    assert.strictEqual(g.getStance().active, 'hati');
    say(g, /run with you/);
    talk(s, 'gullstrand_brynja');
    assert.strictEqual(g.story.dialogue.node, 'after');
    say(g, /Goodbye/);
    assert.strictEqual(takeExit(s, 'gullstrand_north').type, 'transition');
    assert.strictEqual(s.mapId, 'skeldvik');
});
