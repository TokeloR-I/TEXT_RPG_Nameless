/* =========================================================================
 * Enso's Last Stand — TILED MAP LOADER (Keel's engine decision rev 2, P0)
 * Turns a map made in Tiled (https://www.mapeditor.org/, JSON export) into the src/world map format, so
 * validateWorld, WorldSession, the engine and the tests work on it unchanged. Pure data, no DOM.
 *
 * Layers (by name):
 *   ground, detail, walls  tile layers drawn under the player, in that order
 *   overhead               tile layer drawn over the player (roofs, canopies, cliff lips)
 *   collision              any tile here = solid; with this layer present it decides collision for every cell
 *   objects                object layer; each object's Class (or Type) says what it is:
 *                          spawn | exit | inspect | pickup | npc | encounter | boundary | light
 * Each cell's logical tile (the one-character tile the rules see) is the topmost walls/detail/ground tile whose
 * tileset entry has a `tile` property (a tileset character such as ",") or `name` (a tile name such as
 * "grass"). Cells with none use the map's `defaultTile` property (default ",").
 * Object properties are copied onto the result; strings that look like JSON ("[...]" or "{...}") are parsed,
 * and an encounter's `enemies` may also be a comma list. Map properties `name`, `zoneId`, `ambient` (JSON) and
 * any others are copied the same way. The art itself is kept on `map.art` for ui/world-render.js:
 *   art: { tileSize, width, height, tilesets: [{ firstgid, asset, columns, tilecount }], layers: { ground: [gid…], … } }
 * where `asset` names an image in ENSO.packedAssets (tools/pack-assets.js): the tileset's `asset` property, or
 * its image file name without the extension.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const ART_LAYERS = ['ground', 'detail', 'walls', 'overhead'];
    const LOGIC_LAYERS = ['walls', 'detail', 'ground'];                 // topmost first
    const GID_MASK = 0x1fffffff;                                         // Tiled keeps flip flags in the top 3 bits
    const KINDS = ['spawn', 'exit', 'inspect', 'pickup', 'npc', 'encounter', 'boundary', 'light'];
    // Spare characters for legend entries (a tile whose collision differs from its tileset default).
    const SPARE = '0123456789!$%&*-/;<>?@[]`{|}abcdefgiqsyzEGHMNOQ';

    function value(v) {
        if (typeof v !== 'string') return v;
        const s = v.trim();
        if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
            try { return JSON.parse(s); } catch (e) { return v; }
        }
        return v;
    }
    const props = (list) => Object.fromEntries((list || []).map((p) => [p.name, value(p.value)]));

    /** Tileset entry for a gid: { set, local, props } or null. */
    function tileInfo(tilesets, gid) {
        const id = gid & GID_MASK;
        if (!id) return null;
        let set = null;
        for (const t of tilesets) if (t.firstgid <= id && (!set || t.firstgid > set.firstgid)) set = t;
        if (!set) return null;
        const local = id - set.firstgid;
        const entry = (set.tiles || []).find((t) => t.id === local);
        return { set, local, props: props(entry && entry.properties) };
    }

    /**
     * Convert a Tiled JSON map. `tileset` is the world tileset (ENSO.world.zone1.tileset) used to resolve tile
     * names and default collision. Returns { map, errors }: errors are problems in the Tiled file itself
     * (unknown tiles, objects without a class); run validateWorld on the result for everything else.
     */
    function fromTiled(json, tileset) {
        const errors = [];
        const W = json.width, H = json.height, tw = json.tilewidth, th = json.tileheight;
        const mp = props(json.properties);
        const layer = (name) => (json.layers || []).find((l) => l.type === 'tilelayer' && l.name === name);
        const byName = Object.fromEntries(Object.entries(tileset).map(([ch, d]) => [d.name, ch]));
        const tilesets = json.tilesets || [];
        const defaultTile = mp.defaultTile ? (tileset[mp.defaultTile] ? mp.defaultTile : byName[mp.defaultTile]) : ',';
        if (!defaultTile) errors.push(`defaultTile '${mp.defaultTile}' is not a known tile`);

        const charOf = (gid) => {
            const info = tileInfo(tilesets, gid);
            if (!info) return null;
            if (info.props.tile != null) {
                if (!tileset[info.props.tile]) { errors.push(`tileset tile ${info.local} names unknown tile '${info.props.tile}'`); return null; }
                return info.props.tile;
            }
            if (info.props.name != null) {
                if (!byName[info.props.name]) { errors.push(`tileset tile ${info.local} names unknown tile '${info.props.name}'`); return null; }
                return byName[info.props.name];
            }
            return null;
        };

        // Logical tiles, then collision (via legend variants: same tile name, the other solid flag).
        const collision = layer('collision');
        const legend = {}, variant = {};
        const used = new Set(Object.keys(tileset));
        let spare = 0;
        const variantOf = (ch, solid) => {
            const key = `${ch}|${solid}`;
            if (variant[key]) return variant[key];
            while (spare < SPARE.length && used.has(SPARE[spare])) spare++;
            if (spare >= SPARE.length) { errors.push('too many collision variants for one map'); return ch; }
            const c = SPARE[spare++];
            used.add(c);
            legend[c] = { ...tileset[ch], solid };
            return (variant[key] = c);
        };
        const tiles = [];
        for (let y = 0; y < H; y++) {
            let row = '';
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                let ch = null;
                for (const name of LOGIC_LAYERS) {
                    const l = layer(name);
                    if (l && (ch = charOf(l.data[i]))) break;
                }
                ch = ch || defaultTile || ',';
                if (collision) {
                    const solid = !!(collision.data[i] & GID_MASK);
                    if (!!tileset[ch].solid !== solid) ch = variantOf(ch, solid);
                }
                row += ch;
            }
            tiles.push(row);
        }

        // Objects.
        const map = { tiles, spawns: {}, exits: [], interactables: [], encounters: [], boundaries: [], lights: [] };
        const cell = (o) => {
            const top = o.gid ? o.y - th : o.y;                          // tile objects are anchored at their bottom
            return { x: Math.floor((o.x + (o.point ? 0 : 0.5)) / tw), y: Math.floor((top + (o.point ? 0 : 0.5)) / th) };
        };
        for (const group of (json.layers || []).filter((l) => l.type === 'objectgroup')) {
            for (const o of group.objects || []) {
                const kind = o.class || o.type;
                const p = props(o.properties);
                const { x, y } = cell(o);
                const id = p.id || o.name;
                if (!KINDS.includes(kind)) { errors.push(`object ${o.id}${o.name ? ` (${o.name})` : ''} has class '${kind || ''}': expected one of ${KINDS.join(', ')}`); continue; }
                if (!id && kind !== 'light' && kind !== 'spawn') errors.push(`${kind} object ${o.id} needs a name (or an id property)`);
                if (kind === 'spawn') map.spawns[o.name] = { x, y, facing: p.facing || 'down' };
                else if (kind === 'exit') map.exits.push({ id, x, y, trigger: 'step', ...p });
                else if (kind === 'encounter') {
                    const enemies = typeof p.enemies === 'string' ? p.enemies.split(',').map((s) => s.trim()).filter(Boolean) : p.enemies;
                    map.encounters.push({ id, x, y, name: o.name, trigger: 'contact', ...p, enemies });
                } else if (kind === 'boundary') map.boundaries.push({ id, x, y, w: Math.max(1, Math.round(o.width / tw)), h: Math.max(1, Math.round(o.height / th)), ...p });
                else if (kind === 'light') map.lights.push({ x, y, radius: 3, ...p });
                else map.interactables.push({ id, kind, x, y, name: o.name, ...p });
            }
        }
        for (const k of ['exits', 'interactables', 'encounters', 'boundaries', 'lights']) if (!map[k].length) delete map[k];
        if (Object.keys(legend).length) map.legend = legend;
        const { defaultTile: _d, ...rest } = mp;
        Object.assign(map, rest);

        // Art, for the renderer.
        map.art = {
            tileSize: tw, width: W, height: H,
            tilesets: tilesets.map((t) => ({
                firstgid: t.firstgid, columns: t.columns, tilecount: t.tilecount,
                asset: props(t.properties).asset || String(t.image || t.name || '').replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '')
            })),
            layers: Object.fromEntries(ART_LAYERS.filter((n) => layer(n)).map((n) => [n, layer(n).data.slice()]))
        };
        return { map, errors };
    }

    /** The source cell { asset, sx, sy, flipX } of an art gid on a map's art, or null (pure; for the renderer). */
    function artCell(art, gid) {
        const id = gid & GID_MASK;
        if (!id) return null;
        let set = null;
        for (const t of art.tilesets) if (t.firstgid <= id && (!set || t.firstgid > set.firstgid)) set = t;
        if (!set) return null;
        const local = id - set.firstgid;
        if (set.tilecount && local >= set.tilecount) return null;
        return { asset: set.asset, sx: (local % set.columns) * art.tileSize, sy: Math.floor(local / set.columns) * art.tileSize, flipX: !!(gid & 0x80000000) };
    }

    const api = { fromTiled, artCell, ART_LAYERS, GID_MASK };
    ENSO.tiled = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
