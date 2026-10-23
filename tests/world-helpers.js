// Walking helpers for the world tests: shortest paths on a map and the common moves.
const { DIRS } = require('../src/world/world.js');

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

/** Walk up to a visible enemy and into it. Returns the result of that last step. */
function contact(s, id) {
    const e = s.map.encounters.find((x) => x.id === id);
    const spot = [[e.x, e.y + 1, 'up'], [e.x, e.y - 1, 'down'], [e.x - 1, e.y, 'right'], [e.x + 1, e.y, 'left']]
        .find(([x, y]) => !s.isBlocked(x, y) && !s.exitAt(x, y, 'step'));
    walkTo(s, spot[0], spot[1]);
    return s.move(spot[2]);
}
/** Go from wherever you are to a map by the shortest chain of exits (breadth-first over the exit graph). */
function travel(s, mapId) {
    const prev = new Map([[s.mapId, null]]);
    const queue = [s.mapId];
    while (queue.length) {
        const m = queue.shift();
        for (const e of s.world.maps[m].exits || []) if (!prev.has(e.toMap)) { prev.set(e.toMap, [m, e.id]); queue.push(e.toMap); }
    }
    const route = [];
    for (let m = mapId; prev.get(m); m = prev.get(m)[0]) route.unshift(prev.get(m)[1]);
    for (const exitId of route) {
        const r = takeExit(s, exitId);
        if (!r || r.type !== 'transition') throw new Error(`exit ${exitId} didn't work: ${JSON.stringify(r)}`);
    }
}

module.exports = { pathTo, walkTo, takeExit, inspect, contact, travel };
