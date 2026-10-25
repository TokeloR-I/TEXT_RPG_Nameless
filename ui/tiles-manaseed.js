/* =========================================================================
 * Enso's Last Stand — MANA SEED TILES (Seliel the Shaper; written permission in assets/LICENSE-manaseed.txt)
 * Draws grass, dirt paths, trees, rocks, timber houses (walls, windows, roofs) and wooden floors from the
 * Mana Seed starter pack. Only the pieces listed in PARTS are shipped: tools/gen-manaseed-tiles.js cuts them
 * from the pack into one atlas, packed as 'tiles/manaseed'. Every other tile keeps its painter.
 * The static layer paints converted maps at 32 px, so a cell is four 16 px tiles or one 32 px piece.
 *   ground.grass / dirt_path / wood_floor   (g, px, py, T, c), c has the neighbours' names
 *   painters.*                               drawn over the floor; trees draw in decorPass so crowns can overlap
 *   sprites.strongbox                        the treasure chest
 *   overhangs.tree                           the crown above the tree's cell, over people standing there
 * Every function returns false while the atlas loads; ui/world-render.js then uses the painter it replaced.
 * Never use this art as input for AI image generation. Presentation only.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const KEY = 'tiles/manaseed';
    const t16 = (sheet, c, r) => [sheet, c * 16, r * 16, 16, 16];
    // name -> [pack sheet, x, y, w, h] in the pack's own pictures. S = seasonal sample (summer), T = simplified
    // full timber, H = home interiors, timber roof, C = cozy furnishings sampler, W = summer water sparkles,
    // X = treasure chests.
    const PARTS = {
        ...Object.fromEntries([1, 2, 3, 4, 5].map((r, i) => [`grass${i}`, t16('S', 0, r)])),
        ...Object.fromEntries([[0, 6], [1, 6], [2, 6], [3, 6], [0, 7], [1, 7], [2, 7], [3, 7]].map(([c, r], i) => [`flowers${i}`, t16('S', c, r)])),
        dirtTL: t16('S', 1, 0), dirtT: t16('S', 2, 0), dirtTR: t16('S', 3, 0),
        dirtL: t16('S', 1, 1), dirtR: t16('S', 3, 1),
        dirtBL: t16('S', 1, 2), dirtB: t16('S', 2, 2), dirtBR: t16('S', 3, 2),
        // dirt with a grass corner (concave turns): named by where the grass is
        dirtInBR: t16('S', 1, 3), dirtInBL: t16('S', 2, 3), dirtInTR: t16('S', 1, 4), dirtInTL: t16('S', 2, 4),
        ...Object.fromEntries([0, 1, 2, 3, 4].map((r) => [`dirt${r}`, t16('S', 4, r)])),
        pebbles0: t16('S', 4, 6), pebbles1: t16('S', 4, 7),
        tree: ['S', 176, 0, 80, 112],
        boulder: ['S', 48, 224, 32, 32],
        wall: ['T', 128, 96, 32, 32], window: ['T', 96, 96, 32, 32], roof: ['T', 208, 32, 32, 32],
        floor: ['H', 16, 160, 32, 32],
        water0: t16('S', 12, 13), water1: t16('S', 13, 13), water2: t16('S', 13, 14),
        ...Object.fromEntries([0, 1, 2, 3].map((f) => [`sparkle${f}`, t16('W', f, 0)])),
        chest: ['X', 6, 9, 20, 19],
        table: ['C', 39, 5, 34, 42], chair: ['C', 17, 7, 14, 24], bookcase: ['C', 128, 0, 32, 54], rocker: ['C', 74, 50, 21, 30]
    };

    /** Where each part sits in the shipped atlas: shelf-packed in PARTS order, ATLAS_W wide. Shared with the tool. */
    const ATLAS_W = 256;
    function layout(parts = PARTS) {
        const at = {};
        let x = 0, y = 0, row = 0;
        for (const [name, [, , , w, h]] of Object.entries(parts)) {
            if (x + w > ATLAS_W) { x = 0; y += row; row = 0; }
            at[name] = [x, y, w, h];
            x += w; row = Math.max(row, h);
        }
        return { at, w: ATLAS_W, h: y + row };
    }
    const AT = layout().at;

    const sheet = () => (ENSO.atlas ? ENSO.atlas.image(KEY) : null);
    const hash = (x, y, s = 0) => {
        let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const put = (g, img, name, x, y) => { const [sx, sy, w, h] = AT[name]; g.drawImage(img, sx, sy, w, h, x, y, w, h); };
    /** A 32 px piece over a cell (or each 32 px block of a larger one). */
    const fill32 = (name) => (g, px, py, T) => {
        const img = sheet();
        if (!img) return false;
        for (let y = 0; y < T; y += 32) for (let x = 0; x < T; x += 32) put(g, img, name, px + x, py + y);
    };

    /** Furniture: the piece stands on the bottom middle of its cell (taller pieces reach into the cell above). */
    const stand = (name) => (g, px, py, T) => {
        const img = sheet();
        if (!img) return false;
        const [, , w, h] = AT[name];
        put(g, img, name, px + Math.floor((T - w) / 2), py + T - h - 1);
    };

    // What a path's edge treats as grass.
    const GRASSY = new Set(['grass', 'tall_weeds', 'tree', 'dead_tree', 'fruit_tree', 'rock', 'fence', 'well', 'scarecrow', 'signpost', 'memorial', 'wagon', 'cart', 'hops', 'pig']);

    const ground = {
        grass(g, px, py, T, c) {
            const img = sheet();
            if (!img) return false;
            for (let y = 0; y < T; y += 16) for (let x = 0; x < T; x += 16) {
                const tx = c.tx * 4 + x / 16, ty = c.ty * 4 + y / 16;
                const r = hash(tx, ty, 11);
                put(g, img, r < 0.07 ? `flowers${Math.floor(hash(tx, ty, 12) * 8)}` : `grass${Math.floor(hash(tx, ty, 13) * 5)}`, px + x, py + y);
            }
        },
        /** Each 16 px quarter picks its piece from the two sides and the corner it faces. */
        dirt_path(g, px, py, T, c) {
            const img = sheet();
            if (!img) return false;
            const n = T / 16, grass = (name) => GRASSY.has(name);
            const diag = { TL: c.aboveLeft, TR: c.aboveRight, BL: c.belowLeft, BR: c.belowRight };
            for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
                const v = j === 0 ? 'T' : j === n - 1 ? 'B' : '', h = i === 0 ? 'L' : i === n - 1 ? 'R' : '';
                const vg = v && grass(v === 'T' ? c.above : c.below), hg = h && grass(h === 'L' ? c.left : c.right);
                let part = `dirt${Math.floor(hash(c.tx * 4 + i, c.ty * 4 + j, 14) * 5)}`;
                if (vg && hg) part = `dirt${v}${h}`;
                else if (vg) part = `dirt${v}`;
                else if (hg) part = `dirt${h}`;
                else if (v && h && grass(diag[v + h])) part = `dirtIn${v}${h}`;
                put(g, img, part, px + i * 16, py + j * 16);
            }
        },
        wood_floor: fill32('floor')
    };

    const painters = {
        tree() { return sheet() ? undefined : false; },          // drawn whole in decorPass
        rock(g, px, py, T) {
            const img = sheet();
            if (!img) return false;
            put(g, img, 'boulder', px + (T - 32) / 2, py + T - 32);
        },
        house_wall: fill32('wall'), timber_wall: fill32('wall'), house_window: fill32('window'), roof: fill32('roof'),
        /** Deep water; a few tiles glint, each on its own beat (water is redrawn every frame). */
        water(g, px, py, T, c) {
            const img = sheet();
            if (!img) return false;
            for (let y = 0; y < T; y += 16) for (let x = 0; x < T; x += 16) {
                const tx = c.tx * 4 + x / 16, ty = c.ty * 4 + y / 16;
                put(g, img, `water${Math.floor(hash(tx, ty, 15) * 3)}`, px + x, py + y);
                if (hash(tx, ty, 16) < 0.3) {
                    const f = Math.floor((c.time || 0) / 180 + hash(tx, ty, 17) * 24) % 8;
                    if (f < 4) put(g, img, `sparkle${f}`, px + x, py + y);
                }
            }
            // A muddy bank where the water meets land.
            g.fillStyle = '#3d4a2a';
            if (c.above !== 'water') g.fillRect(px, py, T, 3);
            if (c.left !== 'water') g.fillRect(px, py, 2, T);
            if (c.right !== 'water') g.fillRect(px + T - 2, py, 2, T);
            g.fillStyle = '#1e5a7a';
            if (c.below !== 'water') g.fillRect(px, py + T - 2, T, 2);
        },
        table: stand('table'), chair: stand('chair'), shelf: stand('bookcase'), armchair: stand('rocker')
    };

    /** Where a tree's sprite goes: trunk foot at the bottom middle of its cell. */
    function treeAt(x, y, T) {
        const [sx, sy, w, h] = AT.tree;
        return { sx, sy, w, h, dx: x * T + Math.floor((T - w) / 2), dy: (y + 1) * T - h + 6 };
    }

    // Where a tree's crown never goes: the ground you walk along (paths, floors, bridges, doorways, stairs).
    const OPEN_GROUND = new Set(['dirt_path', 'cobble', 'bridge', 'stone_floor', 'wood_floor', 'doorway', 'rug', 'stairs_up', 'stairs_down']);

    function decorPass(g, map, nameAt, T) {
        const img = sheet();
        if (!img) return false;
        for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) {
            if (nameAt(map, x, y) !== 'tree') continue;
            const t = treeAt(x, y, T);
            // The crown spreads over grass, trees and buildings but is cut away from paths, floors and exits, so
            // the way on stays in view (QA-35) and trees keep their crowns (QA-50).
            g.save();
            g.beginPath();
            for (let cy = Math.floor(t.dy / T); cy <= y; cy++) for (let cx = Math.floor(t.dx / T); cx * T < t.dx + t.w; cx++) {
                const n = nameAt(map, cx, cy);
                if ((cx === x && cy === y) || !OPEN_GROUND.has(n)) g.rect(cx * T, cy * T, T, T);
            }
            g.clip();
            g.drawImage(img, t.sx, t.sy, t.w, t.h, t.dx, t.dy, t.w, t.h);
            g.restore();
        }
    }

    const overhangs = {
        tree(g, px, py, T, c) {
            const img = sheet();
            if (!img) return false;
            if (OPEN_GROUND.has(c.above)) return;   // the crown was clipped off that cell (decorPass)
            const t = treeAt(c.tx, c.ty, T);
            // Only the crown straight above the trunk's cell covers people: the parts spilling sideways would hide
            // anyone in a gap between trees (paths through a tree line).
            const above = py - t.dy, cut = Math.max(0, Math.floor((t.w - T) / 2) - 6);
            if (above > 0) g.drawImage(img, t.sx + cut, t.sy, t.w - 2 * cut, above, t.dx + cut, t.dy, t.w - 2 * cut, above);
        }
    };

    /** Object sprites (interactables with a `sprite`). */
    const sprites = { strongbox: stand('chest') };

    const api = { ground, sprites, painters, overhangs, decorPass, KEY, PARTS, layout };
    ENSO.tilesManaseed = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
