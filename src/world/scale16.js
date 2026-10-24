/* =========================================================================
 * Enso's Last Stand — 32 → 16 PX MAP CONVERTER (Keel's engine decision rev 2, P0)
 * The art scale moves to 16 px tiles with 24×32 characters (two tiles tall). An existing map made for 32 px
 * tiles becomes a 16 px map by turning every cell into a 2×2 block: tiles repeat, coordinates double, and
 * anything that covers an area (boundaries, light radii) doubles in size. The map then looks and plays the
 * same at half the tile size. Pure functions, no DOM; tools/convert-maps-16.js runs them over the world.
 *   doubleMap(map)      one map (returns a new object; tileSize: 16, source32: the original, for the painters)
 *   doubleWorld(world)  every map in a world, plus the start
 *   doubleStory(story)  quest objective markers ({ map, x, y }) in the story data
 * Step and interact exits are copied onto all four cells of their block (ids `<id>`, `<id>__2..4`, one
 * `group`; the plain id goes on the cell nearest a spawn), so a doorway is still one doorway wide. Objects stay on one cell: the top-left of their block, or, on a solid tile,
 * the cell of the block that faces open ground. A spawn beside a doorway lands on the cell touching it.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const BLOCK = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const at2 = (o) => ({ ...o, x: o.x * 2, y: o.y * 2 });

    /** `tileset` (the world's) lets an object on a solid tile, such as an inscription in a wall, move to the cell of its
     *  block that faces open ground, so it can still be reached. Without it, objects go to the top-left cell. */
    function doubleMap(map, tileset = {}) {
        if (map.tileSize === 16) return map;
        const out = { ...map, tileSize: 16, source32: map };
        if (map.ambient && map.ambient.lantern) out.ambient = { ...map.ambient, lantern: map.ambient.lantern * 2 };   // light radii are in tiles
        out.tiles = [];
        for (const row of map.tiles) { const r = [...row].map((c) => c + c).join(''); out.tiles.push(r, r); }
        const solid = (x, y) => {
            const ch = out.tiles[y] && out.tiles[y][x];
            const t = ch == null ? null : (map.legend && map.legend[ch]) || tileset[ch];
            return !t || !!t.solid;
        };
        const place = (o) => {
            const bx = o.x * 2, by = o.y * 2;
            // An object on open ground takes its whole block, so it blocks, talks and fights from all of it (QA-33/34).
            if (!solid(bx, by) || !Object.keys(tileset).length) return { ...o, x: bx, y: by, w: 2, h: 2 };
            for (const [dx, dy] of BLOCK) {
                const x = bx + dx, y = by + dy;
                const open = [[x, y + 1], [x, y - 1], [x - 1, y], [x + 1, y]].some(([nx, ny]) => (nx < bx || nx > bx + 1 || ny < by || ny > by + 1) && !solid(nx, ny));
                if (open) return { ...o, x, y };
            }
            return { ...o, x: bx, y: by };
        };
        // A spawn next to a doorway lands on the cell of its block that touches the doorway.
        const spawn = (s) => {
            const e = (map.exits || []).find((x) => Math.abs(x.x - s.x) + Math.abs(x.y - s.y) === 1);
            return { ...s, x: s.x * 2 + (e && e.x > s.x ? 1 : 0), y: s.y * 2 + (e && e.y > s.y ? 1 : 0) };
        };
        if (map.spawns) out.spawns = Object.fromEntries(Object.entries(map.spawns).map(([k, s]) => [k, spawn(s)]));
        // The exit keeps its own id on the cell nearest a spawn (the side you walk in from); the rest get suffixes.
        const spawns = Object.values(out.spawns || {});
        const near = (x, y) => Math.min(Infinity, ...spawns.map((p) => Math.abs(p.x - x) + Math.abs(p.y - y)));
        if (map.exits) out.exits = map.exits.flatMap((e) => BLOCK
            .map(([dx, dy]) => [e.x * 2 + dx, e.y * 2 + dy])
            .sort((a, b) => near(a[0], a[1]) - near(b[0], b[1]))
            .map(([x, y], i) => ({ ...e, id: i ? `${e.id}__${i + 1}` : e.id, group: e.group || e.id, x, y })));
        for (const k of ['interactables', 'encounters']) if (map[k]) out[k] = map[k].map(place);
        if (map.boundaries) out.boundaries = map.boundaries.map((b) => ({ ...at2(b), w: (b.w || 1) * 2, h: (b.h || 1) * 2 }));
        if (map.lights) out.lights = map.lights.map((l) => ({ ...at2(l), radius: l.radius * 2 }));
        return out;
    }

    function doubleWorld(world) {
        return { ...world, maps: Object.fromEntries(Object.entries(world.maps).map(([id, m]) => [id, doubleMap(m, world.tileset)])) };
    }

    function doubleStory(story) {
        const step = (o) => (o.marker ? { ...o, marker: { ...o.marker, x: o.marker.x * 2, y: o.marker.y * 2 } } : o);
        const quests = Object.fromEntries(Object.entries(story.quests || {}).map(([id, q]) => [id, { ...q, objectives: (q.objectives || []).map(step) }]));
        return { ...story, quests };
    }

    const api = { doubleMap, doubleWorld, doubleStory };
    ENSO.scale16 = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
