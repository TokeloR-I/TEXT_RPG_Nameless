// QA-33/34/37: on the 16 px world (what the browser plays) every person and fight covers its whole 2x2 block,
// and every required fight still holds the only way on, as it does on the authored 32 px maps.
const { test, assert } = require('./helpers.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');

const W16 = doubleWorld(ZONE1);

/** Exit groups reachable on foot from a spawn, everything placed counting as an obstacle. */
function exitsReached(world, mapId, spawn) {
    const s = new WorldSession(world);
    s.place(mapId, spawn);
    const map = world.maps[mapId], seen = new Set([`${s.x},${s.y}`]), queue = [[s.x, s.y]], out = new Set();
    while (queue.length) {
        const [x, y] = queue.shift();
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            const e = (map.exits || []).find((ex) => ex.x === nx && ex.y === ny);
            if (e) out.add(e.group || e.id);
            const k = `${nx},${ny}`;
            if (seen.has(k) || s.isBlocked(nx, ny)) continue;
            seen.add(k); queue.push([nx, ny]);
        }
    }
    return out;
}

test('16 px world: every placed object on open ground blocks, talks and fights from its whole block', () => {
    let n = 0;
    for (const [id, map] of Object.entries(W16.maps)) {
        const s = new WorldSession(W16);
        s.place(id, Object.keys(map.spawns)[0]);
        for (const o of [...(map.interactables || []), ...(map.encounters || [])]) {
            if (!o.w) continue;
            n++;
            for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
                const at = s.objectAt(o.x + dx, o.y + dy);
                if (s.present(o)) assert.strictEqual(at && at.id, o.id, `${id}.${o.id} covers ${o.x + dx},${o.y + dy}`);
            }
        }
    }
    assert.ok(n >= 24, `people and fights on open ground: ${n}`);
});

test('16 px world: a required fight holds the way on, as on the 32 px maps', () => {
    for (const [world, label] of [[ZONE1, '32 px'], [W16, '16 px']]) {
        for (const [id, map] of Object.entries(world.maps)) {
            if (!(map.encounters || []).some((e) => e.gate)) continue;
            const all = new Set((map.exits || []).map((e) => e.group || e.id));
            const reached = exitsReached(world, id, Object.keys(map.spawns)[0]);
            assert.ok(reached.size < all.size, `${label} ${id}: the gate fight can be walked past (${[...reached]})`);
        }
    }
});
