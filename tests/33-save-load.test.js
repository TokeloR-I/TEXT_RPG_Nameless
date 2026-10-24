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
    assert.strictEqual(save.formatVersion, 1);
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
        [{ ...good, formatVersion: 2 }, 'VERSION_UNSUPPORTED'],
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
