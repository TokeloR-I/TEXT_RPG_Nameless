/* =========================================================================
 * Enso's Last Stand — WORLD MODEL (headless)
 * Implements docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md §3 and §5.
 *
 * Owns SPACE only: maps, collision, tile-step movement, facing, named-spawn
 * transitions and what the player is facing. No DOM, no timers. A front end
 * (ui/world-ui.js) or a test calls move() / interact() and shows the result.
 *
 * The game engine stays authoritative for rules, inventory, fights and run
 * flags. Walking never calls the engine, so exploration cannot advance
 * combat rounds, status durations or resource regeneration.
 *
 *   const s = new WorldSession(ENSO.world.zone1);
 *   s.move('up')   -> { type: 'moved' | 'blocked' | 'transition', ... }
 *   s.interact()   -> { type: 'message' | 'transition' | 'nothing', ... }
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const FACINGS = Object.keys(DIRS);
    const TRIGGERS = ['step', 'interact'];

    // ---------------------------------------------------------------------
    // Map geometry
    // ---------------------------------------------------------------------
    const width = (map) => (map.tiles[0] || '').length;
    const height = (map) => map.tiles.length;
    const inBounds = (map, x, y) => y >= 0 && y < height(map) && x >= 0 && x < width(map);
    /** The tile definition at (x, y): map legend first, then the world tileset. Out of bounds = null. */
    function tileAt(world, map, x, y) {
        if (!inBounds(map, x, y)) return null;
        const ch = map.tiles[y][x];
        return (map.legend && map.legend[ch]) || world.tileset[ch] || null;
    }
    const isSolidTile = (world, map, x, y) => { const t = tileAt(world, map, x, y); return !t || !!t.solid; };
    const neighbours = (x, y) => Object.values(DIRS).map(([dx, dy]) => [x + dx, y + dy]);
    /** Every placed thing on a map that occupies a tile (interactables block movement while present). */
    const placed = (map) => [...(map.interactables || [])];

    /** Tiles reachable on foot from (x, y), treating every placed object as an obstacle. */
    function reachable(world, map, x, y) {
        const blocked = new Set(placed(map).map((o) => `${o.x},${o.y}`));
        const seen = new Set([`${x},${y}`]);
        const queue = [[x, y]];
        while (queue.length) {
            const [cx, cy] = queue.shift();
            for (const [nx, ny] of neighbours(cx, cy)) {
                const k = `${nx},${ny}`;
                if (seen.has(k) || isSolidTile(world, map, nx, ny) || blocked.has(k)) continue;
                seen.add(k);
                queue.push([nx, ny]);
            }
        }
        return seen;
    }

    // ---------------------------------------------------------------------
    // Validation (§5 required invariants). Returns a list of problems; [] = valid.
    // ---------------------------------------------------------------------
    function validateWorld(world, gameData) {
        const errors = [];
        const err = (msg) => errors.push(msg);
        const ids = new Map(); // global object ids: zones, maps, exits, objects
        const claim = (id, what) => {
            if (!id || typeof id !== 'string') { err(`${what}: missing id`); return; }
            if (ids.has(id)) err(`duplicate id '${id}' (${what} and ${ids.get(id)})`);
            else ids.set(id, what);
        };
        if (!world || !world.tileset || !world.maps || !world.zones) return ['world needs tileset, zones and maps'];

        for (const [zid, zone] of Object.entries(world.zones)) {
            claim(zid, 'zone');
            for (const mid of zone.mapIds || []) {
                if (!world.maps[mid]) err(`zone ${zid}: unknown map '${mid}'`);
                else if (world.maps[mid].zoneId !== zid) err(`zone ${zid}: map '${mid}' says it belongs to '${world.maps[mid].zoneId}'`);
            }
        }
        if (!world.start || !world.maps[world.start.map] || !(world.maps[world.start.map].spawns || {})[world.start.spawn]) err('start: needs an existing map and spawn');

        for (const [mid, map] of Object.entries(world.maps)) {
            claim(mid, 'map');
            const where = `map ${mid}`;
            if (!world.zones[map.zoneId] || !(world.zones[map.zoneId].mapIds || []).includes(mid)) err(`${where}: not listed in zone '${map.zoneId}'`);
            if (!Array.isArray(map.tiles) || !map.tiles.length) { err(`${where}: no tiles`); continue; }
            const w = width(map);
            map.tiles.forEach((row, y) => {
                if (row.length !== w) err(`${where}: row ${y} is ${row.length} wide, expected ${w}`);
                for (let x = 0; x < row.length; x++) if (!tileAt(world, map, x, y)) err(`${where}: unknown tile '${row[x]}' at ${x},${y}`);
            });
            const objAt = new Map();
            for (const o of placed(map)) {
                claim(o.id, `${where} object`);
                if (!inBounds(map, o.x, o.y)) { err(`${where}: object ${o.id} out of bounds`); continue; }
                if (objAt.has(`${o.x},${o.y}`)) err(`${where}: objects ${o.id} and ${objAt.get(`${o.x},${o.y}`)} share a tile`);
                objAt.set(`${o.x},${o.y}`, o.id);
                if (o.kind !== 'inspect') err(`${where}: object ${o.id} has unknown kind '${o.kind}'`);
                if (!o.text) err(`${where}: object ${o.id} has no text`);
            }
            const spawns = map.spawns || {};
            if (!Object.keys(spawns).length) err(`${where}: no spawns`);
            const exitAt = new Map();
            for (const e of map.exits || []) {
                claim(e.id, `${where} exit`);
                if (!inBounds(map, e.x, e.y)) { err(`${where}: exit ${e.id} out of bounds`); continue; }
                if (exitAt.has(`${e.x},${e.y}`)) err(`${where}: exits ${e.id} and ${exitAt.get(`${e.x},${e.y}`)} share a tile`);
                exitAt.set(`${e.x},${e.y}`, e.id);
                if (!TRIGGERS.includes(e.trigger)) err(`${where}: exit ${e.id} has unknown trigger '${e.trigger}'`);
                if (e.trigger === 'step' && isSolidTile(world, map, e.x, e.y)) err(`${where}: step exit ${e.id} is on a solid tile`);
                const dest = world.maps[e.toMap];
                if (!dest) err(`${where}: exit ${e.id} goes to unknown map '${e.toMap}'`);
                else if (!(dest.spawns || {})[e.toSpawn]) err(`${where}: exit ${e.id} goes to unknown spawn '${e.toMap}.${e.toSpawn}'`);
            }
            for (const [sid, sp] of Object.entries(spawns)) {
                const at = `${where}: spawn ${sid}`;
                if (!inBounds(map, sp.x, sp.y)) { err(`${at} out of bounds`); continue; }
                if (isSolidTile(world, map, sp.x, sp.y)) err(`${at} is in collision`);
                if (objAt.has(`${sp.x},${sp.y}`)) err(`${at} is on object ${objAt.get(`${sp.x},${sp.y}`)}`);
                if (exitAt.has(`${sp.x},${sp.y}`)) err(`${at} is on exit ${exitAt.get(`${sp.x},${sp.y}`)} (instant bounce-back)`);
                if (sp.facing && !FACINGS.includes(sp.facing)) err(`${at} has unknown facing '${sp.facing}'`);
            }
            // Everything must be usable from every spawn (one connected walkable area per map).
            for (const [sid, sp] of Object.entries(spawns)) {
                if (!inBounds(map, sp.x, sp.y) || isSolidTile(world, map, sp.x, sp.y)) continue;
                const area = reachable(world, map, sp.x, sp.y);
                const usable = (x, y, onTile) => (onTile && area.has(`${x},${y}`)) || neighbours(x, y).some(([nx, ny]) => area.has(`${nx},${ny}`));
                for (const e of map.exits || []) if (!usable(e.x, e.y, e.trigger === 'step')) err(`${where}: exit ${e.id} can't be reached from spawn ${sid}`);
                for (const o of placed(map)) if (!usable(o.x, o.y, false)) err(`${where}: object ${o.id} can't be reached from spawn ${sid}`);
                for (const [oid, other] of Object.entries(spawns)) if (!area.has(`${other.x},${other.y}`)) err(`${where}: spawn ${oid} can't be reached from spawn ${sid}`);
            }
        }

        // Transitions must be reversible and symmetrical: for every exit A (M -> N), N has an exit B back to M,
        // A lands next to B, and B lands next to A.
        const near = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
        for (const [mid, map] of Object.entries(world.maps)) {
            for (const a of map.exits || []) {
                const dest = world.maps[a.toMap];
                const landing = dest && (dest.spawns || {})[a.toSpawn];
                if (!landing) continue;
                const back = (dest.exits || []).filter((b) => b.toMap === mid);
                if (!back.length) { err(`exit ${a.id}: no way back from ${a.toMap} to ${mid}`); continue; }
                const pair = back.find((b) => near(landing, b) && map.spawns[b.toSpawn] && near(map.spawns[b.toSpawn], a));
                if (!pair) err(`exit ${a.id}: the return trip isn't symmetrical (land next to the way back, and come back next to ${a.id})`);
            }
        }
        // Every map in a zone is reachable from the start through exits.
        if (world.start && world.maps[world.start.map]) {
            const seen = new Set([world.start.map]);
            const queue = [world.start.map];
            while (queue.length) for (const e of world.maps[queue.shift()].exits || []) if (world.maps[e.toMap] && !seen.has(e.toMap)) { seen.add(e.toMap); queue.push(e.toMap); }
            for (const mid of Object.keys(world.maps)) if (!seen.has(mid)) err(`map ${mid} can't be reached from the start`);
        }
        void gameData; // used by later object kinds (pickups, encounters)
        return errors;
    }

    // ---------------------------------------------------------------------
    // A player walking around the world
    // ---------------------------------------------------------------------
    class WorldSession {
        /** @param world  world data (see src/world/zone1.js)
         *  @param opts   { map, spawn } to start somewhere other than world.start */
        constructor(world, opts = {}) {
            this.world = world;
            this.steps = 0;
            this.place(opts.map || world.start.map, opts.spawn || world.start.spawn);
        }

        get map() { return this.world.maps[this.mapId]; }

        place(mapId, spawnName) {
            const map = this.world.maps[mapId];
            const sp = map && map.spawns[spawnName];
            if (!sp) throw new Error(`No spawn '${mapId}.${spawnName}'`);
            this.mapId = mapId;
            this.x = sp.x;
            this.y = sp.y;
            this.facing = sp.facing || 'down';
        }

        tile(x, y) { return tileAt(this.world, this.map, x, y); }
        objectAt(x, y) { return placed(this.map).find((o) => o.x === x && o.y === y) || null; }
        exitAt(x, y, trigger) { return (this.map.exits || []).find((e) => e.x === x && e.y === y && (!trigger || e.trigger === trigger)) || null; }
        isBlocked(x, y) { return isSolidTile(this.world, this.map, x, y) || !!this.objectAt(x, y); }
        facingTile() { const [dx, dy] = DIRS[this.facing]; return [this.x + dx, this.y + dy]; }

        /** One tile step. Turning to face the direction always happens, even when blocked. */
        move(dir) {
            if (!DIRS[dir]) throw new Error(`Unknown direction '${dir}'`);
            this.facing = dir;
            const [nx, ny] = this.facingTile();
            if (this.isBlocked(nx, ny)) return { type: 'blocked', x: nx, y: ny };
            this.x = nx;
            this.y = ny;
            this.steps++;
            const exit = this.exitAt(nx, ny, 'step');
            if (exit) return this.transition(exit);
            return { type: 'moved', x: nx, y: ny };
        }

        /** Act on whatever is in front of the player. */
        interact() {
            const [fx, fy] = this.facingTile();
            const obj = this.objectAt(fx, fy);
            if (obj) return { type: 'message', id: obj.id, title: obj.name || null, text: obj.text };
            const exit = this.exitAt(fx, fy, 'interact');
            if (exit) return this.transition(exit);
            return { type: 'nothing' };
        }

        transition(exit) {
            const from = this.mapId;
            this.place(exit.toMap, exit.toSpawn);
            return { type: 'transition', exit: exit.id, from, to: this.mapId, text: exit.text || null };
        }

        getState() { return { map: this.mapId, x: this.x, y: this.y, facing: this.facing, steps: this.steps }; }
    }

    const api = { WorldSession, validateWorld, tileAt, reachable, DIRS };
    ENSO.worldModel = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
