// Phase 1 spec §5: save/load (SaveGame v1). Identical future after load (I13), transactional failures,
// validation codes, data-change warnings, attachments, Chapter One state.
const fs = require('fs');
const path = require('path');
const { test, assert, GameEngine, newGame } = require('./helpers.js');
const SaveMethods = require('../src/engine/save.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');

const roundTrip = (save) => JSON.parse(JSON.stringify(save));

test('Save: a SaveGame v1 is plain JSON with the spec header, and the engine version matches package.json', () => {
    const g = newGame(42).do('mage', 'n', 'engage');
    const save = g.serialize({ label: 'Hallway', createdAt: '2026-10-23T20:00:00Z', attachments: { note: 'x' } });
    assert.deepStrictEqual(roundTrip(save), save, 'JSON-safe');
    assert.strictEqual(save.format, 'enso-save');
    assert.strictEqual(save.formatVersion, SaveMethods.FORMAT_VERSION);
    assert.deepStrictEqual(save.game, { version: save.engine.version, revision: SaveMethods.CONTENT_REVISION, chapter: null });
    assert.strictEqual(save.engine.version, JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version);
    assert.deepStrictEqual(save.meta, { label: 'Hallway', createdAt: '2026-10-23T20:00:00Z' });
    assert.strictEqual(save.rng.seed, 42);
    assert.deepStrictEqual(Object.keys(save.state).sort(), ['combat', 'currentRoom', 'flags', 'mode', 'pendingBranchChoice', 'player', 'progression', 'rooms', 'stats', 'story', 'world'].sort());
    assert.strictEqual(save.state.mode, 'combat', 'mid-fight saves are allowed');
});

test('Save: serialize -> load -> continue gives the identical future, mid-fight too (I13)', () => {
    for (const cmds of [['warrior', 'n'], ['necromancer', 'n', 'engage', 'attack 1']]) {
        const g = newGame(7).do(...cmds);
        const save = roundTrip(g.serialize());
        const copy = GameEngine.fromSave(save);
        assert.strictEqual(copy.snapshot().json, g.snapshot().json);
        const next = g.mode === 'combat' ? ['attack 1', 'attack 2', 'attack 1'] : ['engage', 'attack 1', 'attack 1'];
        const a = next.map((c) => g.input(c));
        const b = next.map((c) => copy.input(c));
        assert.deepStrictEqual(b, a, `${cmds.join(' ')}: same events after loading`);
        assert.strictEqual(copy.snapshot().json, g.snapshot().json);
    }
});

test('Save: load prints what the player needs (room, or the fight menu)', () => {
    const fight = GameEngine.fromSave(roundTrip(newGame(3).do('rogue', 'n', 'engage').serialize()));
    assert.match(fight.lastLoad.events.map((e) => e.text).join('\n'), /Game loaded\.[\s\S]*--- Enemies ---/);
    const room = GameEngine.fromSave(roundTrip(newGame(3).do('rogue').serialize()));
    assert.match(room.lastLoad.events.map((e) => e.text).join('\n'), /Game loaded\.\n--- STARTING ROOM ---/);
});

test('Save: bad saves are refused with the spec codes and leave the current game untouched', () => {
    const g = newGame(5).do('warrior', 'n', 'engage');
    const before = g.snapshot().json;
    const good = g.serialize();
    const cases = [
        [null, 'FORMAT_UNKNOWN'], [{ format: 'other' }, 'FORMAT_UNKNOWN'],
        [{ ...good, formatVersion: SaveMethods.FORMAT_VERSION + 1 }, 'VERSION_UNSUPPORTED'],
        [{ ...good, state: undefined }, 'CORRUPT'],
        [{ ...good, state: { ...good.state, mode: 'flying' } }, 'CORRUPT'],
        [{ ...good, state: { ...good.state, combat: null } }, 'CORRUPT'],
        [{ ...good, rng: { seed: 1 } }, 'CORRUPT']
    ];
    for (const [save, code] of cases) {
        const r = g.load(save);
        assert.strictEqual(r.ok, false);
        assert.strictEqual(r.error.code, code, JSON.stringify(save && save.formatVersion));
        assert.strictEqual(g.snapshot().json, before, `${code}: nothing changed`);
    }
    // a save that validates but breaks on restore rolls back as well
    const broken = roundTrip(good);
    broken.state.combat.order = [{ id: 'nobody' }];
    broken.state.player = null; broken.state.mode = 'explore';
    assert.strictEqual(g.load(broken).ok, false);
    assert.strictEqual(g.snapshot().json, before);
});

test('Save: changed game data is a warning by default and a refusal with strictData', () => {
    const save = roundTrip(newGame(2).do('mage').serialize());
    save.data.hash = 'not-this-data';
    const g = new GameEngine({ seed: 9 });
    const r = g.load(save);
    assert.ok(r.ok);
    assert.deepStrictEqual(r.warnings.map((w) => w.code), ['DATA_CHANGED']);
    const strict = new GameEngine({ seed: 9 }).load(save, { strictData: true });
    assert.deepStrictEqual([strict.ok, strict.error.code], [false, 'DATA_CHANGED']);
    assert.strictEqual(SaveMethods.cyrb53('abc'), SaveMethods.cyrb53('abc'));
    assert.notStrictEqual(SaveMethods.cyrb53('abc'), SaveMethods.cyrb53('abd'));
});

test('Save: Chapter One state and the world position (attachments) come back exactly', () => {
    const g = new GameEngine({ seed: 11 });
    g.start(); g.act({ type: 'choose_class', classId: 'rogue' }); g.act({ type: 'set_identity', name: 'Wren Test', appearance: 2 }); g.act({ type: 'enter_world' });
    const s = new WorldSession(ZONE1, { engine: g });
    g.act({ type: 'world_inspect', objectId: 'cellar_inscription' });
    s.place('house', 'from_cellar'); g.act({ type: 'world_enter', mapId: 'house' });
    const save = roundTrip(g.serialize({ attachments: { world: s.getState() } }));
    const copy = GameEngine.fromSave(save);
    assert.strictEqual(copy.player.name, 'Wren Test');
    assert.strictEqual(copy.player.appearance, 2);
    assert.strictEqual(copy.questState('Q01'), 'complete');
    assert.deepStrictEqual(copy.getJournal(), g.getJournal());
    assert.deepStrictEqual(copy.lastLoad.attachments.world, s.getState());
    const s2 = new WorldSession(ZONE1, { engine: copy });
    s2.restorePosition(copy.lastLoad.attachments.world);
    assert.deepStrictEqual([s2.mapId, s2.x, s2.y, s2.facing], [s.mapId, s.x, s.y, s.facing]);
    const xp = copy.player.xp;
    copy.act({ type: 'world_enter', mapId: 'house' });
    copy.act({ type: 'world_inspect', objectId: 'cellar_inscription' });
    assert.strictEqual(copy.player.xp, xp, 'nothing paid twice after loading');
    // a position that makes no sense falls back to the start, never into a wall
    const s3 = new WorldSession(ZONE1, { engine: copy });
    s3.restorePosition({ map: 'house', x: 0, y: 0, facing: 'up' });
    assert.deepStrictEqual([s3.mapId, s3.x, s3.y], [ZONE1.start.map, ZONE1.maps[ZONE1.start.map].spawns[ZONE1.start.spawn].x, ZONE1.maps[ZONE1.start.map].spawns[ZONE1.start.spawn].y]);
});

test('Save: load never runs code from a save (JSON in, plain assignment out)', () => {
    const save = roundTrip(newGame(4).do('warrior').serialize());
    save.state.player.name = '"); globalThis.__pwned = true; ("';
    save.state.flags.__proto__polluted = true;
    const g = GameEngine.fromSave(save);
    assert.strictEqual(globalThis.__pwned, undefined);
    assert.strictEqual({}.polluted, undefined);
    assert.strictEqual(g.player.name, '"); globalThis.__pwned = true; ("');
});

// ---------------------------------------------------------------------------------------------
// Saves outlive game updates: a playtester keeps one save while chapters and areas ship.
// ---------------------------------------------------------------------------------------------
const CHAPTER1 = require('../src/story/chapter1.js');
const storyWith = (fn) => { const s = JSON.parse(JSON.stringify(CHAPTER1)); fn(s); return s; };
const NEW_QUEST = { title: 'The Road North', kind: 'main', xp: 5, summary: 'Chapter 2 begins.', objectives: [{ id: 'go', text: 'Walk north', on: { type: 'enter', id: 'nowhere_yet' } }], onComplete: [] };
function worldGame(seed = 11, options = {}) {
    const g = new GameEngine({ seed, ...options });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'set_identity', name: 'Tester', appearance: 1 }); g.act({ type: 'enter_world' });
    g.act({ type: 'world_inspect', objectId: 'cellar_inscription' });
    g.act({ type: 'world_enter', mapId: 'house' });
    return g;
}

test('Save updates: a save from this version loads unchanged (no reconciling, no warnings)', () => {
    const g = worldGame();
    const copy = GameEngine.fromSave(roundTrip(g.serialize()));
    assert.strictEqual(copy.snapshot().json, g.snapshot().json);
    assert.deepStrictEqual(copy.lastLoad.warnings, []);
    assert.deepStrictEqual(copy.lastLoad.game, { version: SaveMethods.ENGINE_VERSION, revision: SaveMethods.CONTENT_REVISION, chapter: CHAPTER1.id });
});

test('Save updates: a format 1 save is migrated (input untouched) and loads with an UPGRADED note', () => {
    const v1 = roundTrip(worldGame().serialize());
    v1.formatVersion = 1; delete v1.game;
    const before = JSON.stringify(v1);
    const m = SaveMethods.migrateSave(v1);
    assert.strictEqual(JSON.stringify(v1), before, 'migrateSave never edits the save it was given');
    assert.strictEqual(m.save.formatVersion, SaveMethods.FORMAT_VERSION);
    assert.deepStrictEqual(m.save.game, { version: v1.engine.version, chapter: CHAPTER1.id });
    const copy = GameEngine.fromSave(v1);
    assert.ok(copy.lastLoad.warnings.some((w) => w.code === 'UPGRADED'));
    assert.strictEqual(copy.questState('Q01'), 'complete');
    for (let v = 1; v < SaveMethods.FORMAT_VERSION; v++) assert.strictEqual(typeof SaveMethods.MIGRATIONS[v], 'function', `a migration from format ${v}`);
});

test('Save updates: a format 2 save holding the old door names gets the fire names (Fallen Seraphim rename)', () => {
    const v2 = roundTrip(worldGame().serialize());
    v2.formatVersion = 2;
    v2.state.player.inventory.push('Doorward', 'Spear of the Cold Door');
    v2.state.player.equipment.mainHand = 'Doorward';
    v2.state.player.skills = [...(v2.state.player.skills || []), 'The Door Held Open'];
    v2.state.flags.door_note = 'Doorward is a word, not a key';   // only exact names are renamed
    const m = SaveMethods.migrateSave(v2);
    const p = m.save.state.player;
    assert.ok(p.inventory.includes('Emberward') && p.inventory.includes('Spear of the Altar Fire'));
    assert.ok(!JSON.stringify(m.save.state).includes('"Doorward"'));
    assert.strictEqual(p.equipment.mainHand, 'Emberward');
    assert.ok(p.skills.includes('The Coal Carried Down'));
    assert.strictEqual(m.save.state.flags.door_note, 'Doorward is a word, not a key');
    const copy = GameEngine.fromSave(v2);
    assert.ok(copy.lastLoad.ok !== false && copy.player.inventory.includes('Emberward'));
});

test('Save updates: quests added after the save start unseen, and effects that name them do not break', () => {
    const save = roundTrip(worldGame().serialize());
    const story = storyWith((s) => {
        s.quests.C2Q01 = NEW_QUEST;
        s.triggers.push({ id: 'c2_rumour', on: { type: 'inspect', id: 'cellar_old_purse' }, effects: [{ available: 'C2Q01' }] });
    });
    const copy = GameEngine.fromSave(save, { storyData: story });
    assert.strictEqual(copy.questState('C2Q01'), 'unseen');
    assert.ok(copy.lastLoad.warnings.some((w) => w.code === 'CONTENT_UPDATED' && /1 new quest/.test(w.message)));
    copy.act({ type: 'world_enter', mapId: 'cellar' });
    copy.act({ type: 'world_inspect', objectId: 'cellar_old_purse' });
    assert.strictEqual(copy.questState('C2Q01'), 'available');
    copy.getJournal();
});

test('Save updates: a quest removed from the game is set aside, never crashes the journal or events', () => {
    const g = worldGame();
    const active = Object.keys(g.story.quests).find((id) => g.questState(id) === 'active');
    assert.ok(active, 'some quest is active');
    const story = storyWith((s) => { delete s.quests[active]; });
    const copy = GameEngine.fromSave(roundTrip(g.serialize()), { storyData: story });
    assert.strictEqual(copy.story.quests[active], undefined);
    assert.strictEqual(copy.story.retiredQuests[active].state, 'active');
    assert.ok(!copy.trackedQuestIds().includes(active));
    copy.getJournal(); copy.getAvailableActions();
    copy.act({ type: 'world_enter', mapId: 'cellar' });
    assert.strictEqual(copy.errors.length, 0, copy.errors.map((e) => e.message).join('; '));
});

test('Save updates: character fields and gear slots added later get a new character\'s defaults', () => {
    const save = roundTrip(worldGame().serialize());
    delete save.state.player.gold; delete save.state.player.equipment.accessory; delete save.state.player.resource.regen;
    const copy = GameEngine.fromSave(save);
    assert.strictEqual(copy.player.gold, 0);
    assert.ok('accessory' in copy.player.equipment);
    assert.ok('regen' in copy.player.resource);
    assert.ok(copy.lastLoad.warnings.some((w) => w.code === 'CONTENT_UPDATED'));
});

test('Save updates: a conversation that no longer exists is closed on load', () => {
    const save = roundTrip(worldGame().serialize());
    save.state.story.dialogue = { npcId: 'npc_cut_from_the_game', node: 'hello' };
    const copy = GameEngine.fromSave(save);
    assert.strictEqual(copy.story.dialogue, null);
    assert.notStrictEqual(copy.getAvailableActions().awaiting, 'dialogue');
});

test('Save updates: story catch-up runs once for older saves that already passed its point, never for new games', () => {
    const catchUp = [{ id: 'chapter2_open', if: { quests: { Q01: 'complete' } }, effects: [{ start: 'C2Q01' }] }];
    const story = storyWith((s) => { s.quests.C2Q01 = NEW_QUEST; s.catchUp = catchUp; });
    // A playtester's save from before Chapter 2 shipped: Q01 is done, so Chapter 2 opens on load.
    const old = GameEngine.fromSave(roundTrip(worldGame().serialize()), { storyData: story });
    assert.strictEqual(old.questState('C2Q01'), 'active');
    assert.ok(old.story.claimed.includes('catchup:chapter2_open'));
    const again = GameEngine.fromSave(roundTrip(old.serialize()), { storyData: story });
    assert.strictEqual(again.snapshot().json, old.snapshot().json, 'runs once');
    // A new game on the new version never runs it: it reaches Chapter 2 through the story itself.
    const fresh = worldGame(11, { storyData: story });
    assert.ok(fresh.story.claimed.includes('catchup:chapter2_open'));
    assert.strictEqual(fresh.questState('C2Q01'), 'unseen');
    // A condition not met yet is spent too: the normal story path gets there later.
    const early = new GameEngine({ seed: 3 });
    early.start(); early.act({ type: 'choose_class', classId: 'mage' }); early.act({ type: 'set_identity', name: 'E', appearance: 0 }); early.act({ type: 'enter_world' });
    const e2 = GameEngine.fromSave(roundTrip(early.serialize()), { storyData: story });
    assert.strictEqual(e2.questState('C2Q01'), 'unseen');
});

test('Playtest 2026-11-11: a save carried back to an older copy of the game says it is newer, and its quests come back later', () => {
    const { GameEngine } = require('./helpers.js');
    const g = new GameEngine({ seed: 7 });
    g.start(); g.input('warrior');
    const save = JSON.parse(JSON.stringify(g.serialize()));
    assert.strictEqual(save.game.revision, SaveMethods.CONTENT_REVISION);
    const plain = new GameEngine({ seed: 1 }).load(JSON.parse(JSON.stringify(save)));
    assert.ok(!plain.warnings.some((w) => w.code === 'NEWER_SAVE'), 'a save from this version is not newer');
    // What a newer version's save looks like here: a later content release, a quest and an item this build doesn't have.
    const newer = JSON.parse(JSON.stringify(save));
    newer.game.revision = 999;
    if (newer.state.story) newer.state.story.quests.FUTURE_Q = { state: 'active', step: 1 };
    newer.state.player.inventory.push('Item From The Future');
    const h = new GameEngine({ seed: 1 });
    const r = h.load(newer);
    assert.ok(r.ok);
    const w = r.warnings.find((x) => x.code === 'NEWER_SAVE');
    assert.ok(w && /newer version/.test(w.message), JSON.stringify(r.warnings));
    assert.ok(w.details.some((d) => /item/.test(d)));
});
