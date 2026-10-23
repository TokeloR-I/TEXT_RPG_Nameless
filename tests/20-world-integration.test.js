// Zone 1 integration (Phase C): transition graph, persistence, fight lifecycle, prompts, determinism
// and legacy compatibility. docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md §7 Phase C.
const { test, assert, GameEngine, data, newGame, fightOut } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const { walkTo, takeExit, inspect, contact, travel } = require('./world-helpers.js');

function worldRun(cls = 'warrior', seed = 1) {
    const g = new GameEngine({ seed });
    g.start(); g.input(cls); g.enterWorld();
    return { g, s: new WorldSession(ZONE1, { engine: g }) };
}
const win = (g) => { for (let i = 0; i < 300 && g.mode === 'combat'; i++) g.input(g.combat.awaitingContinue ? 'continue' : 'attack 1'); };
const near = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

test('Integration: every exit in the zone round-trips to where you left, facing away from the door', () => {
    let checked = 0;
    let total = 0;
    for (const [mid, map] of Object.entries(ZONE1.maps)) {
        for (const exit of map.exits) {
            total++;
            // Chapter One gate fights hold some ways on, so start from a spawn on the exit's side of them.
            const reaches = (sp) => { try { takeExit(new WorldSession(ZONE1, { map: mid, spawn: sp }), exit.id); return true; } catch (e) { return false; } };
            const spawn = Object.keys(map.spawns).find(reaches) || Object.keys(map.spawns)[0];
            const s = new WorldSession(ZONE1, { map: mid, spawn });
            const there = takeExit(s, exit.id);
            assert.deepStrictEqual([there.type, there.to], ['transition', exit.toMap], exit.id);
            assert.strictEqual(s.exitAt(s.x, s.y), null, `${exit.id}: never land on an exit`);
            const back = s.map.exits.find((b) => b.toMap === mid && near(b, s));
            assert.ok(back, `${exit.id}: the way back is right next to where you land`);
            const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[s.facing];
            assert.ok(!(s.x + dx === back.x && s.y + dy === back.y), `${exit.id}: you face away from the way back`);
            const home = takeExit(s, back.id);
            assert.strictEqual(home.to, mid);
            assert.ok(near(s, exit), `${back.id}: you come back next to ${exit.id}`);
            checked++;
        }
    }
    assert.strictEqual(checked, total, 'every exit, both ways');
    assert.ok(total >= 24, 'Zone 1 and Chapter One together');
});

test('Integration: beaten and fled enemies, and taken items, persist across the whole zone for the run', () => {
    const { g, s } = worldRun('rogue', 9);
    travel(s, 'grounds');
    contact(s, 'grounds_weed_rats'); win(g); s.fightOver('grounds_weed_rats', g.world.lastResult);
    travel(s, 'shed'); inspect(s, 'shed_bandages');
    travel(s, 'road');
    contact(s, 'road_wolf'); g.input('flee'); s.fightOver('road_wolf', 'fled');
    for (const m of ['grounds', 'house', 'cellar', 'house', 'grounds', 'well', 'grounds', 'shed', 'grounds', 'road']) travel(s, m);
    assert.ok(s.visibleObjects().some((o) => o.id === 'road_wolf'), 'the fled wolf is still there');
    assert.strictEqual(s.cooldown, null, 'leaving the map cleared the flee cooldown');
    travel(s, 'grounds');
    assert.ok(!s.visibleObjects().some((o) => o.id === 'grounds_weed_rats'), 'the rats stay beaten');
    travel(s, 'shed');
    assert.ok(!s.visibleObjects().some((o) => o.id === 'shed_bandages'), 'the bandages stay taken');
    assert.deepStrictEqual(g.world.defeated, ['grounds_weed_rats']);
    assert.deepStrictEqual(g.world.collected, ['shed_bandages']);
});

test('Integration: fight lifecycle flee -> come back -> win credits kills and XP exactly once', () => {
    const { g, s } = worldRun('warrior', 4);
    travel(s, 'road');
    const xp0 = g.player.xp, kills0 = g.stats.kills;
    contact(s, 'road_wolf');
    g.input('attack 1');
    g.input('flee');
    s.fightOver('road_wolf', 'fled');
    assert.strictEqual(g.stats.kills, kills0);
    walkTo(s, 13, 13);
    assert.strictEqual(contact(s, 'road_wolf').type, 'encounter');
    assert.strictEqual(g.combat.enemies[0].hp, g.combat.enemies[0].maxHp, 'a fresh fight: the wolf is back at full health (no carry-over)');
    win(g);
    s.fightOver('road_wolf', g.world.lastResult);
    assert.strictEqual(g.stats.kills, kills0 + 1);
    assert.strictEqual(g.player.xp - xp0, data.enemies.hungry_wolf.xp);
    assert.strictEqual(g.stats.fights, 1, 'a fled fight is not a fight won');
    assert.strictEqual(s.prompt(), null, 'nothing left to face');
});

test('Integration: the on-screen hint says what E would do', () => {
    const { s } = worldRun();
    assert.strictEqual(s.prompt(), null, 'facing the floor');
    travel(s, 'shed');
    walkTo(s, 2, 4); s.move('up');
    assert.deepStrictEqual(s.prompt(), { verb: 'Pick up', name: 'Bandages', kind: 'pickup' });
    s.interact();
    assert.strictEqual(s.prompt(), null, 'once taken, nothing is left to do there');
    travel(s, 'grounds'); walkTo(s, 23, 8); s.move('up');
    assert.deepStrictEqual(s.prompt(), { verb: 'Climb down the well', name: null, kind: 'exit' });
    travel(s, 'road'); walkTo(s, 13, 11); s.move('up');
    assert.deepStrictEqual(s.prompt(), { verb: 'Walk into it to fight', name: 'Hungry Wolf', kind: 'encounter' });
});

test('Integration: identical inputs give identical runs (seeded and deterministic end to end)', () => {
    const play = () => {
        const { g, s } = worldRun('mage', 21);
        travel(s, 'grounds'); contact(s, 'grounds_weed_rats'); win(g); s.fightOver('grounds_weed_rats', g.world.lastResult);
        travel(s, 'well'); inspect(s, 'well_bottle');
        travel(s, 'road'); contact(s, 'road_wolf'); win(g);
        return JSON.stringify([g.snapshot().json, s.getState()]);
    };
    assert.strictEqual(play(), play());
});

test('Integration: the text game never touches world state, and a world run leaves the legacy rooms alone', () => {
    const before = JSON.stringify(data.rooms);
    const g = newGame(2).do('warrior', 'n', 'engage');
    fightOut(g);
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.world, null);
    assert.deepStrictEqual(g.getState().world, null);
    const { g: w, s } = worldRun('warrior', 2);
    travel(s, 'grounds'); contact(s, 'grounds_weed_rats'); win(w);
    assert.strictEqual(JSON.stringify(data.rooms), before, 'shared data untouched');
    assert.deepStrictEqual(w.rooms, JSON.parse(before), 'the world run did not clear any text-game room');
    assert.strictEqual(w.currentRoom, 'starting_room');
});
