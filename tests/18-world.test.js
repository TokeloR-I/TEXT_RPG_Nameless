// Zone 1 world model: docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md §3, §5 and Phase A acceptance.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession, validateWorld, DIRS } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');

const copy = (o) => JSON.parse(JSON.stringify(o));
/** Shortest walk to (x, y) on the current map, never stepping on an exit tile on the way. Returns directions. */
function pathTo(s, x, y) {
    const key = (a, b) => `${a},${b}`;
    const prev = new Map([[key(s.x, s.y), null]]);
    const queue = [[s.x, s.y]];
    while (queue.length) {
        const [cx, cy] = queue.shift();
        if (cx === x && cy === y) break;
        for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
            const nx = cx + dx, ny = cy + dy;
            if (prev.has(key(nx, ny)) || s.isBlocked(nx, ny)) continue;
            if (s.exitAt(nx, ny, 'step') && !(nx === x && ny === y)) continue;
            prev.set(key(nx, ny), [cx, cy, dir]);
            queue.push([nx, ny]);
        }
    }
    if (!prev.has(key(x, y))) throw new Error(`no path on ${s.mapId} to ${x},${y}`);
    const dirs = [];
    for (let k = key(x, y); prev.get(k); ) { const [px, py, dir] = prev.get(k); dirs.unshift(dir); k = key(px, py); }
    return dirs;
}
/** Walk to (x, y); returns the result of the last step. */
function walkTo(s, x, y) {
    let r = null;
    for (const dir of pathTo(s, x, y)) r = s.move(dir);
    return r;
}
/** Walk through the named exit on the current map and return the transition. */
function takeExit(s, exitId) {
    const e = s.map.exits.find((x) => x.id === exitId);
    if (e.trigger === 'step') return walkTo(s, e.x, e.y);
    const [ax, ay] = [[e.x, e.y + 1], [e.x, e.y - 1], [e.x - 1, e.y], [e.x + 1, e.y]].find(([nx, ny]) => !s.isBlocked(nx, ny));
    walkTo(s, ax, ay);
    s.move(Object.keys(DIRS).find((d) => ax + DIRS[d][0] === e.x && ay + DIRS[d][1] === e.y));
    return s.interact();
}
/** Face an object (standing next to it) and interact. */
function inspect(s, id) {
    const o = s.map.interactables.find((x) => x.id === id);
    const spot = [[o.x, o.y + 1, 'up'], [o.x, o.y - 1, 'down'], [o.x - 1, o.y, 'right'], [o.x + 1, o.y, 'left']]
        .find(([x, y]) => !s.isBlocked(x, y) && !s.exitAt(x, y, 'step'));
    walkTo(s, spot[0], spot[1]);
    s.move(spot[2]); // turn to face it (blocked by the object, so no step)
    return s.interact();
}

test('World: Zone 1 data validates (ids, destinations, spawns, reachability, symmetric transitions)', () => {
    assert.deepStrictEqual(validateWorld(ZONE1, data), []);
    for (const id of ['cellar', 'house', 'grounds']) assert.ok(ZONE1.zones.forgotten_homestead.mapIds.includes(id), id);
    assert.strictEqual(ZONE1.start.map, 'cellar', 'the player wakes in the cellar');
});

test('World: the validator catches broken map data', () => {
    const broken = (mutate, pattern) => {
        const w = copy(ZONE1); mutate(w);
        const errs = validateWorld(w, data);
        assert.ok(errs.some((e) => pattern.test(e)), `expected ${pattern}, got: ${errs.join(' | ') || 'no errors'}`);
    };
    broken((w) => { w.maps.house.interactables[0].id = 'cellar_jars'; }, /duplicate id 'cellar_jars'/);
    broken((w) => { w.maps.cellar.exits[0].toMap = 'attic'; }, /unknown map 'attic'/);
    broken((w) => { w.maps.cellar.exits[0].toSpawn = 'nowhere'; }, /unknown spawn 'house.nowhere'/);
    broken((w) => { w.maps.cellar.spawns.start = { x: 0, y: 0 }; }, /spawn start is in collision/);
    broken((w) => { w.maps.house.spawns.from_cellar = { x: 1, y: 5 }; }, /instant bounce-back/);
    broken((w) => { w.maps.house.exits = w.maps.house.exits.filter((e) => e.toMap !== 'cellar'); }, /no way back from house to cellar/);
    broken((w) => { w.maps.house.spawns.from_cellar = { x: 3, y: 6, facing: 'right' }; }, /isn't symmetrical/);
    broken((w) => { w.maps.cellar.tiles[4] = '#..........#'; }, /row 4 is 12 wide/);
    broken((w) => { w.maps.cellar.tiles[1] = '#bx..#....?..#'; }, /unknown tile '\?'/);
    broken((w) => { w.maps.cellar.tiles[6] = '#.........x###'; w.maps.cellar.tiles[7] = '#rr........###'; w.maps.cellar.tiles[8] = '#xb.....b..###'; }, /exit cellar_stairs can't be reached|spawn from_house can't be reached/);
    broken((w) => { w.maps.cellar.interactables.push({ id: 'twin', kind: 'inspect', x: 8, y: 3, text: 'x' }); }, /share a tile/);
    broken((w) => { w.zones.forgotten_homestead.mapIds.push('attic'); }, /unknown map 'attic'/);
    broken((w) => { w.maps.loft = copy(w.maps.shed || w.maps.cellar); w.maps.loft.exits = []; w.maps.loft.interactables = []; w.zones.forgotten_homestead.mapIds.push('loft'); }, /map loft can't be reached from the start/);
});

test('World: walls, furniture and objects block; bumping turns you without moving', () => {
    const s = new WorldSession(ZONE1);
    assert.deepStrictEqual([s.mapId, s.x, s.y], ['cellar', 3, 5]);
    walkTo(s, 1, 6);
    assert.strictEqual(s.move('left').type, 'blocked', 'outer wall');
    assert.deepStrictEqual([s.x, s.y, s.facing], [1, 6, 'left'], 'turned, did not move');
    assert.strictEqual(s.move('down').type, 'blocked', 'rubble');
    walkTo(s, 8, 4);
    assert.strictEqual(s.move('up').type, 'blocked', 'the feathers are an object you stand next to, not on');
    walkTo(s, 4, 3);
    assert.strictEqual(s.move('right').type, 'blocked', 'rubble pile at 5,3');
    for (let i = 0; i < 40; i++) s.move(Object.keys(DIRS)[i % 4]);
    assert.ok(!s.isBlocked(s.x, s.y), 'never inside anything solid');
});

test('World: cellar -> house -> grounds and back, repeatedly, landing on named spawns with no bounce-back', () => {
    const s = new WorldSession(ZONE1);
    for (let lap = 0; lap < 3; lap++) {
        let r = takeExit(s, 'cellar_stairs');
        assert.deepStrictEqual([r.type, r.to, s.x, s.y, s.facing], ['transition', 'house', 2, 5, 'right'], `lap ${lap}: up the stairs`);
        assert.strictEqual(s.exitAt(s.x, s.y), null, 'never land on an exit');
        assert.strictEqual(s.move('right').type, 'moved', 'keep walking the way you came in: no bounce');
        r = takeExit(s, 'house_front_door');
        assert.deepStrictEqual([r.type, r.to, s.x, s.y, s.facing], ['transition', 'grounds', 14, 4, 'down']);
        assert.strictEqual(s.move('down').type, 'moved');
        r = takeExit(s, 'grounds_house_door');
        assert.deepStrictEqual([r.to, s.x, s.y, s.facing], ['house', 6, 11, 'up']);
        r = takeExit(s, 'house_cellar_stairs');
        assert.deepStrictEqual([r.to, s.x, s.y, s.facing], ['cellar', 12, 6, 'down']);
    }
});

test('World: inspecting shows the object text; facing nothing does nothing', () => {
    const s = new WorldSession(ZONE1);
    assert.deepStrictEqual(s.interact(), { type: 'nothing' }, 'facing an empty floor');
    const r = inspect(s, 'cellar_tallies');
    assert.strictEqual(r.type, 'message');
    assert.match(r.text, /Tallies/);
    assert.strictEqual(inspect(s, 'cellar_tallies').type, 'message', 'clues stay inspectable');
    // every map named in Phase A has at least one inspectable and some blocked geometry
    for (const id of ['cellar', 'house', 'grounds']) {
        const m = ZONE1.maps[id];
        assert.ok(m.interactables.some((o) => o.kind === 'inspect'), `${id} has an inspectable`);
        assert.ok(m.tiles.some((row, y) => [...row].some((ch, x) => x > 0 && y > 0 && x < row.length - 1 && y < m.tiles.length - 1 && ZONE1.tileset[ch].solid)), `${id} has blocked geometry inside its walls`);
    }
});

test('World: walking never touches the engine (no rounds, statuses, regen or RNG use)', () => {
    const g = new GameEngine({ seed: 4 });
    g.start(); g.input('necromancer');
    g.player.statusEffects.push({ name: 'Poison', type: 'dot', value: 2, duration: 3, armed: true });
    const before = JSON.stringify(g.snapshot());
    const s = new WorldSession(ZONE1);
    takeExit(s, 'cellar_stairs');
    takeExit(s, 'house_front_door');
    for (let i = 0; i < 300; i++) s.move(Object.keys(DIRS)[(i * 7 + (i >> 3)) % 4]);
    inspect(s, 'grounds_scarecrow');
    assert.strictEqual(JSON.stringify(g.snapshot()), before, 'engine state and RNG untouched');
    assert.deepStrictEqual(g.flush(), [], 'no engine output');
});

test('World: the text game is unchanged (legacy rooms and start still work alongside the world data)', () => {
    const g = new GameEngine({ seed: 1 });
    const out = g.start().concat(g.input('warrior')).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
    assert.match(out, /STARTING ROOM/);
    assert.ok(data.rooms.hallway_of_chains, 'legacy rooms kept');
    assert.strictEqual(g.mode, 'explore');
});
