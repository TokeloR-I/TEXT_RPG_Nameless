// Zone 1 complete (Phase B): shed, well, road, pickups, visible encounters and the battle handoff.
// docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md §2, §4 and Phase B acceptance.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const { walkTo, takeExit, inspect, contact, travel } = require('./world-helpers.js');

/** A run in world mode: engine with a class, world flags on, session bound to it. */
function worldRun(cls = 'warrior', seed = 1) {
    const g = new GameEngine({ seed });
    g.start(); g.input(cls); g.enterWorld();
    const s = new WorldSession(ZONE1, { engine: g });
    return { g, s };
}
const text = (events) => events.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
/** Fight until the engine leaves combat, attacking the first living enemy. Returns all text. */
function fight(g, maxTurns = 200) {
    let out = '';
    for (let i = 0; i < maxTurns && g.mode === 'combat'; i++) out += text(g.input(g.combat.awaitingContinue ? 'continue' : 'attack 1')) + '\n';
    return out;
}

test('Zone 1: all six maps are reachable and you can always come back to the cellar', () => {
    const { s } = worldRun();
    assert.deepStrictEqual(ZONE1.zones.forgotten_homestead.mapIds, ['cellar', 'house', 'grounds', 'shed', 'well', 'road']);
    for (const id of ['house', 'grounds', 'shed', 'grounds', 'well', 'grounds', 'road', 'grounds', 'house', 'cellar']) {
        travel(s, id);
        assert.strictEqual(s.mapId, id);
    }
});

test('Zone 1: pickups give their item once, through the engine, and never come back', () => {
    const { g, s } = worldRun('warrior');
    const count = (item) => g.player.inventory.filter((i) => i === item).length;
    const before = count('Bandages');
    travel(s, 'shed');
    const r = inspect(s, 'shed_bandages');
    assert.strictEqual(r.type, 'pickup');
    assert.match(text(r.events), /You pick up the Bandages/);
    assert.strictEqual(count('Bandages'), before + 1);
    assert.ok(g.world.collected.includes('shed_bandages'), 'the engine keeps the run flag');
    assert.strictEqual(s.objectAt(2, 3), null, 'gone from the table');
    for (let i = 0; i < 3; i++) { travel(s, 'grounds'); travel(s, 'shed'); }
    assert.strictEqual(s.objectAt(2, 3), null, 're-entering does not respawn it');
    assert.match(text(g.worldPickup('shed_bandages', 'Bandages')), /nothing left/, 'and the engine refuses a second pickup');
    assert.strictEqual(count('Bandages'), before + 1, 'cannot be farmed');
    travel(s, 'well');
    assert.strictEqual(inspect(s, 'well_bottle').type, 'pickup');
    assert.ok(g.player.inventory.includes('Half-full Wine Bottle'));
    assert.match(inspect(s, 'well_carving').text, /circle/, 'each optional area has a clue');
    assert.match((travel(s, 'shed'), inspect(s, 'shed_hooks')).text, /shears/);
});

test('Zone 1: walking into a visible enemy starts a normal fight; victory removes it and keeps your place', () => {
    const { g, s } = worldRun('warrior', 3);
    travel(s, 'grounds');
    const r = contact(s, 'grounds_weed_rats');
    assert.strictEqual(r.type, 'encounter');
    assert.strictEqual(g.mode, 'combat');
    assert.deepStrictEqual(g.combat.enemies.map((e) => e.key), ['rust_rat', 'rust_rat']);
    assert.deepStrictEqual(g.combat.enemies.map((e) => e.entityKey), ['world:grounds_weed_rats#0', 'world:grounds_weed_rats#1'], 'kill credit is scoped to the encounter');
    const where = [s.mapId, s.x, s.y];
    const xp = g.player.xp;
    const log = fight(g);
    assert.match(log, /VICTORY/);
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.world.lastResult, 'victory');
    assert.ok(g.isDefeated('grounds_weed_rats'));
    assert.strictEqual(g.player.xp, xp + 20, 'normal rewards: 10 XP per rat');
    assert.deepStrictEqual([s.mapId, s.x, s.y], where, 'back on the map where you were');
    assert.doesNotMatch(log, /STARTING ROOM|Exits/, 'no text-game room description after a world fight');
    s.fightOver('grounds_weed_rats', 'victory');
    assert.strictEqual(s.objectAt(5, 15), null, 'the rats are gone');
    assert.strictEqual(s.move(s.facing).type, 'moved', 'their tile is walkable now');
    travel(s, 'house'); travel(s, 'grounds');
    assert.strictEqual(s.objectAt(5, 15), null, 'and stay gone for the run');
    assert.ok(g.data.rooms.hallway_of_chains.enemies.length, 'legacy rooms untouched');
});

test('Zone 1: fleeing keeps the enemy, and it ignores you until you step away (no instant re-engage)', () => {
    const { g, s } = worldRun('mage', 2);
    travel(s, 'road');
    assert.strictEqual(contact(s, 'road_wolf').type, 'encounter');
    g.input('flee');
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.world.lastResult, 'fled');
    s.fightOver('road_wolf', 'fled');
    assert.ok(s.objectAt(13, 10), 'the wolf is still there');
    const again = s.move(s.facing);
    assert.deepStrictEqual([again.type, again.cooling], ['blocked', 'road_wolf'], 'holding the key into it does nothing');
    assert.strictEqual(g.mode, 'explore');
    assert.deepStrictEqual([s.x, s.y, s.facing], [13, 11, 'up'], 'standing just below the wolf');
    s.move('left'); assert.strictEqual(s.cooldown, 'road_wolf', 'still next to it (diagonally): still ignored');
    s.move('down'); assert.strictEqual(s.cooldown, null, 'out of reach: it notices you again');
    assert.strictEqual(contact(s, 'road_wolf').type, 'encounter', 'and you can choose to fight it');
});

test('Zone 1: defeat in a world fight is the normal game over', () => {
    const { g, s } = worldRun('mage', 5);
    travel(s, 'road');
    g.player.hp = 1;
    const r = contact(s, 'road_wolf');
    assert.strictEqual(r.type, 'encounter', 'the fight happened even though it ended before your first turn');
    const log = text(r.events) + fight(g);
    assert.match(log, /DEFEAT/);
    assert.strictEqual(g.mode, 'game_over');
    assert.strictEqual(g.world.lastResult, 'defeat');
    assert.ok(!g.isDefeated('road_wolf'));
});

test('Zone 1: a world fight uses exactly the current battle rules (same log as the same fight in the text game)', () => {
    const run = (world) => {
        const g = new GameEngine({ seed: 11 });
        g.start(); g.input('rogue'); g.equipStarters(); g.flush();
        let log = '';
        if (world) { g.enterWorld(); log = text(g.worldEncounter('road_wolf', ['hungry_wolf'])) + '\n'; } else g.startCombat(['hungry_wolf']);
        log += fight(g);
        return log.slice(0, log.indexOf('--- VICTORY! ---'));
    };
    const a = run(true), b = run(false);
    assert.ok(a.length > 200);
    assert.strictEqual(a, b);
});

test('Zone 1: the road goes on through the fog to the Broken Tollway (Chapter One), and you can turn back', () => {
    const { s } = worldRun();
    travel(s, 'road');
    walkTo(s, 12, 20);
    const r = s.move('down');
    assert.deepStrictEqual([r.type, r.to], ['transition', 'tollway']);
    assert.match(r.text, /fog/);
    travel(s, 'grounds');
    assert.strictEqual(s.mapId, 'grounds');
});

test('Zone 1: no boss, no forced fights, no test dummy; every optional area has something to find', () => {
    const maps = ZONE1.zones.forgotten_homestead.mapIds.map((id) => ZONE1.maps[id]);
    const encounters = maps.flatMap((m) => m.encounters || []);
    assert.ok(encounters.length >= 1);
    for (const e of encounters) for (const k of e.enemies) {
        assert.ok(!(data.enemies[k].specialFlags || []).includes('boss'), `${e.id}: no boss in Zone 1`);
        assert.notStrictEqual(k, 'James_Newton');
    }
    // you can cross the whole zone to its far edge without touching an enemy
    const { g, s } = worldRun();
    travel(s, 'road');
    walkTo(s, 12, 20);
    assert.strictEqual(s.move('down').type, 'transition');
    assert.strictEqual(g.stats.fights, 0, 'no fight was needed');
    for (const id of ['shed', 'well']) {
        const objs = ZONE1.maps[id].interactables;
        assert.ok(objs.some((o) => o.kind === 'inspect') && objs.some((o) => o.kind === 'pickup'), `${id}: a clue and a reward`);
    }
});

test('Zone 1: world intents are transactions and refuse when out of place', () => {
    const { g, s } = worldRun('warrior', 7);
    travel(s, 'grounds');
    contact(s, 'grounds_weed_rats');
    assert.match(text(g.worldEncounter('road_wolf', ['hungry_wolf'])), /Not now/, 'no second fight during a fight');
    assert.match(text(g.worldPickup('shed_bandages', 'Bandages')), /Not now/, 'no looting mid-fight');
    assert.ok(!g.isCollected('shed_bandages'));
    const flags = JSON.stringify(g.world);
    const out = text(g.worldPickup('x', 'Nonexistent Thing'));
    assert.match(out, /Not now/);
    assert.strictEqual(JSON.stringify(g.world), flags);
    fight(g);
    // an error mid-intent rolls everything back, flags included
    const snapBefore = JSON.stringify(g.world);
    const orig = g.grantItem;
    g.grantItem = () => { throw new Error('boom'); };
    assert.match(text(g.worldPickup('shed_bandages', 'Bandages')), /internal error/);
    g.grantItem = orig;
    assert.strictEqual(JSON.stringify(g.world), snapBefore, 'the half-done pickup was rolled back');
});
