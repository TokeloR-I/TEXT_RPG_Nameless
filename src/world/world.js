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
 *   const s = new WorldSession(ENSO.world.zone1, { engine });
 *   s.move('up')   -> { type: 'moved' | 'blocked' | 'transition' | 'encounter' | 'boundary', ... }
 *   s.interact()   -> { type: 'message' | 'pickup' | 'transition' | 'nothing', ... }
 *
 * Encounters start on CONTACT: walking into a visible enemy starts the fight
 * (E on it only describes it). After fleeing, that enemy ignores you until you
 * step away from it, so a held key can't drag you straight back in.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const FACINGS = Object.keys(DIRS);
    const TRIGGERS = ['step', 'interact'];
    const OBJECT_KINDS = ['inspect', 'pickup', 'npc'];

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
    /** Every placed thing on a map that occupies a tile (objects and enemies block movement while present). */
    const placed = (map) => [...(map.interactables || []), ...(map.encounters || [])];
    const isEncounter = (map, o) => (map.encounters || []).includes(o);
    /** Exits by doorway: exits sharing a `group` (one wide doorway) are checked as one. Map of name -> exits. */
    function exitGroups(map) {
        const out = new Map();
        for (const e of map.exits || []) { const k = e.group || e.id; if (!out.has(k)) out.set(k, []); out.get(k).push(e); }
        return out;
    }
    const inRect = (r, x, y) => x >= r.x && y >= r.y && x < r.x + (r.w || 1) && y < r.y + (r.h || 1);

    /** Tiles reachable on foot from (x, y), treating every placed object as an obstacle, except an encounter
     *  marked `gate: true`: a required fight that holds the only way on (Chapter One), gone once it's beaten. */
    function reachable(world, map, x, y) {
        const blocked = new Set(placed(map).filter((o) => !(o.gate && isEncounter(map, o))).map((o) => `${o.x},${o.y}`));
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
    function validateWorld(world, gameData, storyData) {
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
                if (isSolidTile(world, map, o.x, o.y) && isEncounter(map, o)) err(`${where}: encounter ${o.id} stands in a wall`);
                if (isEncounter(map, o)) {
                    if (o.trigger !== 'contact') err(`${where}: encounter ${o.id} needs trigger 'contact'`);
                    if (!Array.isArray(o.enemies) || !o.enemies.length) err(`${where}: encounter ${o.id} has no enemies`);
                    for (const key of o.enemies || []) {
                        if (gameData && !gameData.enemies[key]) err(`${where}: encounter ${o.id} uses unknown enemy '${key}'`);
                        if (key === 'James_Newton') err(`${where}: encounter ${o.id} uses the James Newton test dummy`);
                    }
                    for (const [sid, sp] of Object.entries(map.spawns || {})) {
                        if (Math.max(Math.abs(sp.x - o.x), Math.abs(sp.y - o.y)) <= 1) err(`${where}: encounter ${o.id} is right next to spawn ${sid} (no unavoidable fights at an entrance)`);
                    }
                    continue;
                }
                if (!OBJECT_KINDS.includes(o.kind)) err(`${where}: object ${o.id} has unknown kind '${o.kind}'`);
                if (o.kind === 'npc') {           // Chapter One people: dialogue lives in the story data (src/story/)
                    if (!o.npc) err(`${where}: npc ${o.id} needs an npc id`);
                    else if (storyData && !storyData.npcs[o.npc]) err(`${where}: npc ${o.id} uses unknown story npc '${o.npc}'`);
                    continue;
                }
                if (!o.text) err(`${where}: object ${o.id} has no text`);
                if (o.kind === 'pickup' && (!o.item || (gameData && !gameData.itemDefinitions[o.item]))) err(`${where}: pickup ${o.id} has unknown item '${o.item}'`);
            }
            for (const b of map.boundaries || []) {
                claim(b.id, `${where} boundary`);
                if (!b.text) err(`${where}: boundary ${b.id} has no text`);
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
                if (e.trigger === 'interact' && !e.prompt) err(`${where}: interact exit ${e.id} needs a prompt (what pressing E does)`);
                if (e.requires && !e.lockedText) err(`${where}: locked exit ${e.id} needs lockedText (why it won't open yet)`);
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
                // A doorway several tiles wide is several exits sharing a `group`: one usable tile is enough.
                for (const [gid, group] of exitGroups(map)) if (!group.some((e) => usable(e.x, e.y, e.trigger === 'step'))) err(`${where}: exit ${gid} can't be reached from spawn ${sid}`);
                for (const o of placed(map)) if (!usable(o.x, o.y, false)) err(`${where}: object ${o.id} can't be reached from spawn ${sid}`);
                for (const b of map.boundaries || []) {
                    let ok = false;
                    for (let y = b.y; y < b.y + (b.h || 1); y++) for (let x = b.x; x < b.x + (b.w || 1); x++) if (area.has(`${x},${y}`)) ok = true;
                    if (!ok) err(`${where}: boundary ${b.id} can't be reached from spawn ${sid}`);
                }
                for (const [oid, other] of Object.entries(spawns)) if (!area.has(`${other.x},${other.y}`)) err(`${where}: spawn ${oid} can't be reached from spawn ${sid}`);
            }
        }

        // Transitions must be reversible and symmetrical: for every exit A (M -> N), N has an exit B back to M,
        // A lands next to B, and B lands next to A.
        const near = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
        for (const [mid, map] of Object.entries(world.maps)) {
            for (const [gid, group] of exitGroups(map)) {
                const a0 = group[0];
                const dest = world.maps[a0.toMap];
                const landing = dest && (dest.spawns || {})[a0.toSpawn];
                if (!landing) continue;
                const back = (dest.exits || []).filter((b) => b.toMap === mid);
                if (!back.length) { err(`exit ${gid}: no way back from ${a0.toMap} to ${mid}`); continue; }
                const pair = back.find((b) => near(landing, b) && map.spawns[b.toSpawn] && group.some((a) => near(map.spawns[b.toSpawn], a)));
                if (!pair) err(`exit ${gid}: the return trip isn't symmetrical (land next to the way back, and come back next to ${gid})`);
            }
        }
        // Every map in a zone is reachable from the start through exits.
        if (world.start && world.maps[world.start.map]) {
            const seen = new Set([world.start.map]);
            const queue = [world.start.map];
            while (queue.length) for (const e of world.maps[queue.shift()].exits || []) if (world.maps[e.toMap] && !seen.has(e.toMap)) { seen.add(e.toMap); queue.push(e.toMap); }
            for (const mid of Object.keys(world.maps)) if (!seen.has(mid)) err(`map ${mid} can't be reached from the start`);
        }
        return errors;
    }

    // ---------------------------------------------------------------------
    // A player walking around the world
    // ---------------------------------------------------------------------
    class WorldSession {
        /** @param world  world data (see src/world/zone1.js)
         *  @param opts   { engine, map, spawn }. With an engine (after engine.enterWorld()), pickups and
         *                fights go through it and it keeps the run flags. Without one (map tools, tests of
         *                pure movement) the session keeps its own flags and fights are only reported. */
        constructor(world, opts = {}) {
            this.world = world;
            this.engine = opts.engine || null;
            this.local = { collected: [], defeated: [], narrated: [] };
            this.cooldown = null;   // encounter id that ignores contact until you step away (after fleeing)
            this.steps = 0;
            this.place(opts.map || world.start.map, opts.spawn || world.start.spawn);
        }

        isCollected(id) { return this.engine ? this.engine.isCollected(id) : this.local.collected.includes(id); }
        isDefeated(id) { return this.engine ? this.engine.isDefeated(id) : this.local.defeated.includes(id); }
        /** Is this placed thing (on `map`, default the current one) still there? Collected pickups and beaten enemies are gone. */
        present(o, map = this.map) {
            if (o.when && !this.allows(o.when)) return false;      // story-conditional people and enemies
            return isEncounter(map, o) ? !this.isDefeated(o.id) : !(o.kind === 'pickup' && this.isCollected(o.id));
        }
        /** Story conditions are the engine's (src/engine/story.js). Without an engine, everything is open. */
        allows(cond) { return !cond || !this.engine || !this.engine.story || this.engine.storyAllows(cond); }
        /** Objects and enemies still on a map (default: the current one). A front end draws the map it is
         *  showing, which during a step-and-fade transition is still the one the player just left (#98). */
        visibleObjects(mapId = this.mapId) {
            const map = this.world.maps[mapId];
            if (!map) return [];
            return placed(map).filter((o) => this.present(o, map)).map((o) => ({ ...o, kind: isEncounter(map, o) ? 'encounter' : o.kind }));
        }

        /** An exit's arrival narration plays once per run (#98): true the first time, false after.
         *  With an engine the record is a run flag, so it survives save/load. */
        firstNarration(id) {
            if (this.engine && this.engine.world) {
                if (this.engine.hasNarrated(id)) return false;
                this.engine.act({ type: 'world_narration', id });
                return true;
            }
            if (this.local.narrated.includes(id)) return false;
            this.local.narrated.push(id);
            return true;
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
        objectAt(x, y) { return placed(this.map).find((o) => o.x === x && o.y === y && this.present(o)) || null; }
        boundaryAt(x, y) { return (this.map.boundaries || []).find((b) => inRect(b, x, y)) || null; }
        exitAt(x, y, trigger) { return (this.map.exits || []).find((e) => e.x === x && e.y === y && (!trigger || e.trigger === trigger)) || null; }
        isBlocked(x, y) { return isSolidTile(this.world, this.map, x, y) || !!this.objectAt(x, y); }
        facingTile() { const [dx, dy] = DIRS[this.facing]; return [this.x + dx, this.y + dy]; }

        /** One tile step. Turning to face the direction always happens, even when blocked. */
        move(dir) {
            if (!DIRS[dir]) throw new Error(`Unknown direction '${dir}'`);
            this.facing = dir;
            const [nx, ny] = this.facingTile();
            const obj = this.objectAt(nx, ny);
            if (obj && isEncounter(this.map, obj)) {
                if (this.cooldown === obj.id) return { type: 'blocked', x: nx, y: ny, cooling: obj.id };
                return this.engage(obj);
            }
            if (this.isBlocked(nx, ny)) return { type: 'blocked', x: nx, y: ny };
            const gate = this.exitAt(nx, ny, 'step');    // a locked way on (story gate): you stay put and are told why
            if (gate && !this.allows(gate.requires)) return { type: 'locked', id: gate.id, x: this.x, y: this.y, text: gate.lockedText };
            const wasIn = this.boundaryAt(this.x, this.y);
            this.x = nx;
            this.y = ny;
            this.steps++;
            if (this.cooldown) {
                const e = (this.map.encounters || []).find((x) => x.id === this.cooldown);
                if (!e || Math.max(Math.abs(e.x - nx), Math.abs(e.y - ny)) > 1) this.cooldown = null;
            }
            const exit = this.exitAt(nx, ny, 'step');
            if (exit) return this.transition(exit);
            const edge = this.boundaryAt(nx, ny);
            if (edge && edge !== wasIn) return { type: 'boundary', id: edge.id, title: edge.title || null, text: edge.text, x: nx, y: ny };
            return { type: 'moved', x: nx, y: ny };
        }

        /** Contact with a visible enemy: the engine starts a normal fight. */
        engage(enc) {
            const events = this.engine ? this.engine.worldEncounter(enc.id, enc.enemies) : [];
            const w = this.engine && this.engine.world;
            // The fight may already be over when this returns (a faster enemy can finish a 1 HP player).
            const started = !this.engine || (this.engine.mode === 'combat' && w.encounter === enc.id) || w.lastEncounter === enc.id;
            if (!started) return { type: 'blocked', x: enc.x, y: enc.y, events };
            return { type: 'encounter', id: enc.id, enemies: [...enc.enemies], events };
        }

        /** Tell the session how a fight it started ended ('victory' | 'fled' | 'defeat'). */
        fightOver(id, result) {
            if (result === 'fled') this.cooldown = id;
            if (result === 'victory' && !this.engine && !this.local.defeated.includes(id)) this.local.defeated.push(id);
        }

        /** Act on whatever is in front of the player. */
        interact() {
            const [fx, fy] = this.facingTile();
            const obj = this.objectAt(fx, fy);
            if (obj && isEncounter(this.map, obj)) return { type: 'message', id: obj.id, title: obj.name || null, text: obj.text || 'It hasn\'t noticed you yet. Walk into it to fight.' };
            if (obj && obj.kind === 'npc') {
                const events = this.engine ? this.engine.act({ type: 'talk', npcId: obj.npc }).events : [];
                return { type: 'talk', id: obj.id, npc: obj.npc, title: obj.name || null, events };
            }
            if (obj && obj.kind === 'pickup') {
                let events = [];
                if (this.engine) events = this.engine.worldPickup(obj.id, obj.item);
                else this.local.collected.push(obj.id);
                if (!this.isCollected(obj.id)) return { type: 'nothing', events };
                return { type: 'pickup', id: obj.id, item: obj.item, title: obj.name || null, text: obj.text, events };
            }
            if (obj) {
                const events = this.engine && this.engine.story ? this.engine.act({ type: 'world_inspect', objectId: obj.id }).events : [];
                return { type: 'message', id: obj.id, title: obj.name || null, text: obj.text, events };
            }
            const exit = this.exitAt(fx, fy, 'interact');
            if (exit && !this.allows(exit.requires)) return { type: 'message', id: exit.id, title: null, text: exit.lockedText };
            if (exit) return this.transition(exit);
            return { type: 'nothing' };
        }

        /** What pressing E would do right now, for the on-screen hint: { verb, name } or null. */
        prompt() {
            const [fx, fy] = this.facingTile();
            const obj = this.objectAt(fx, fy);
            if (obj && isEncounter(this.map, obj)) return { verb: this.cooldown === obj.id ? 'Step away first' : 'Walk into it to fight', name: obj.name || 'Enemy', kind: 'encounter' };
            if (obj && obj.kind === 'pickup') return { verb: 'Pick up', name: obj.name || obj.item, kind: 'pickup' };
            if (obj && obj.kind === 'npc') return { verb: 'Talk to', name: obj.name || (this.engine ? this.engine.npcName(obj.npc) : obj.npc), kind: 'npc' };
            if (obj) return { verb: 'Inspect', name: obj.name || 'something', kind: 'inspect' };
            const exit = this.exitAt(fx, fy, 'interact');
            if (exit) return { verb: exit.prompt, name: null, kind: 'exit' };
            return null;
        }

        transition(exit) {
            const from = this.mapId;
            this.place(exit.toMap, exit.toSpawn);
            // Arriving is a story event (quests like "reach Shamefield"). Walking itself never calls the engine.
            const events = this.engine && this.engine.story ? this.engine.act({ type: 'world_enter', mapId: this.mapId }).events : [];
            const text = exit.text && this.firstNarration(exit.id) ? exit.text : null;
            return { type: 'transition', exit: exit.id, from, to: this.mapId, text, events };
        }

        /** Black Flight (src/engine/story.js): the engine checks the rules, then the player arrives at the
         *  anchor's safe spawn exactly as if they had walked in. Same shape as transition(); a refusal
         *  changes nothing and returns { type: 'refused', events }. */
        blackFlight(anchorId) {
            const r = this.engine.act({ type: 'black_flight', anchorId });
            const go = r.ok && r.events.find((e) => e.type === 'world.travel');
            if (!go || !this.world.maps[go.map]) return { type: 'refused', events: r.events };
            const from = this.mapId;
            this.place(go.map, go.spawn);
            const events = [...r.events, ...this.engine.act({ type: 'world_enter', mapId: this.mapId }).events];
            return { type: 'transition', exit: null, anchor: anchorId, from, to: this.mapId, text: null, events };
        }

        getState() { return { map: this.mapId, x: this.x, y: this.y, facing: this.facing, steps: this.steps, cooldown: this.cooldown }; }

        /** Put the player back where a save says (getState() shape). Anything that doesn't fit the map
         *  (unknown map, out of bounds, in a wall, on an exit) falls back to the world's start. */
        restorePosition(st) {
            const map = st && this.world.maps[st.map];
            const ok = map && Number.isInteger(st.x) && Number.isInteger(st.y) && inBounds(map, st.x, st.y)
                && !isSolidTile(this.world, map, st.x, st.y) && !(map.exits || []).some((e) => e.x === st.x && e.y === st.y);
            if (!ok) { this.place(this.world.start.map, this.world.start.spawn); return false; }
            this.mapId = st.map; this.x = st.x; this.y = st.y;
            this.facing = FACINGS.includes(st.facing) ? st.facing : 'down';
            this.steps = Number.isInteger(st.steps) ? st.steps : 0;
            this.cooldown = typeof st.cooldown === 'string' ? st.cooldown : null;
            return true;
        }
    }

    const api = { WorldSession, validateWorld, tileAt, reachable, DIRS };
    ENSO.worldModel = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
