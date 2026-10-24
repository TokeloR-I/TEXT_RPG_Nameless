/* =========================================================================
 * Enso's Last Stand — OUTDOOR TILES FROM THE FORSAKEN PIXELS PACK
 * "Free Environment Pixel Tilemap & Assets 16x16" by Forsaken Pixels (free to use, no copyright; see
 * assets/src/tiles/LICENSE-forsaken.txt). The sheet is packed as 'tiles/forsaken' (assets/src/tiles/forsaken.png).
 * Replaces the painters for grass, dirt paths, trees and rocks; every other tile keeps its painter.
 * The static layer paints converted maps at 32 px, so each cell is four 16 px tiles of the sheet.
 *   ground.grass / ground.dirt_path   (g, px, py, T, c), c has the neighbours' names (above, below, left, right)
 *   painters.tree / painters.rock     the cell's own part (trees draw in decorPass so crowns can overlap)
 *   decorPass(g, map, nameAt, T)      whole trees, back to front, after every tile of the static layer
 *   overhangs.tree                    the crown above the tree's cell, drawn over people standing there
 * Every function returns false while the sheet is still loading; ui/world-render.js then uses the old painter.
 * Presentation only.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const KEY = 'tiles/forsaken';
    const sheet = () => (ENSO.atlas ? ENSO.atlas.image(KEY) : null);
    const hash = (x, y, s = 0) => {
        let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };

    // Where things are on the sheet. Tiles are [col, row] of the 16 px grid; sprites are pixel boxes [x, y, w, h].
    const S = 16;
    const DIRT = [4, 6];
    // Grass on dirt, nine pieces: [col][row] for left/middle/right and top/middle/bottom edges.
    const GRASS_EDGE = { col: { left: 1, mid: 2, right: 3 }, row: { top: 0, mid: 1, bottom: 2 } };
    const TREES = [[86, 101, 70, 86], [87, 199, 53, 69]];
    const ROCK = [6, 244, 25, 27];
    const SPECKS = [                                           // flowers, sprigs and pebbles scattered on grass
        [3, 194, 7, 5], [23, 195, 7, 6], [35, 196, 7, 5], [54, 199, 5, 3], [67, 198, 4, 4], [73, 195, 4, 4],
        [50, 162, 4, 4], [58, 166, 4, 3], [69, 167, 3, 4], [73, 165, 3, 4], [50, 181, 11, 6], [53, 231, 5, 4]
    ];

    const tile = (g, img, [c, r], x, y) => g.drawImage(img, c * S, r * S, S, S, x, y, S, S);
    const isDirt = (n) => n === 'dirt_path';

    const ground = {
        grass(g, px, py, T, c) {
            const img = sheet();
            if (!img) return false;
            const n = T / S;                                   // tiles per cell side (2 at 32 px)
            for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
                // Edge pieces only on the cell's outer tiles, toward a path.
                const col = i === 0 && isDirt(c.left) ? 'left' : i === n - 1 && isDirt(c.right) ? 'right' : 'mid';
                const row = j === 0 && isDirt(c.above) ? 'top' : j === n - 1 && isDirt(c.below) ? 'bottom' : 'mid';
                tile(g, img, [GRASS_EDGE.col[col], GRASS_EDGE.row[row]], px + i * S, py + j * S);
                if (col === 'mid' && row === 'mid' && hash(c.tx * n + i, c.ty * n + j, 5) < 0.14) {
                    const [sx, sy, w, h] = SPECKS[Math.floor(hash(c.tx * n + i, c.ty * n + j, 6) * SPECKS.length)];
                    g.drawImage(img, sx, sy, w, h, px + i * S + Math.floor((S - w) / 2), py + j * S + Math.floor((S - h) / 2), w, h);
                }
            }
        },
        dirt_path(g, px, py, T) {
            const img = sheet();
            if (!img) return false;
            for (let y = 0; y < T; y += S) for (let x = 0; x < T; x += S) tile(g, img, DIRT, px + x, py + y);
        }
    };

    const painters = {
        tree() { return sheet() ? undefined : false; },        // drawn whole in decorPass
        rock(g, px, py, T) {
            const img = sheet();
            if (!img) return false;
            const [sx, sy, w, h] = ROCK;
            g.drawImage(img, sx, sy, w, h, px + Math.floor((T - w) / 2), py + T - h - 2, w, h);
        }
    };

    /** The tree for a cell: which sprite, and where it goes (trunk foot at the bottom middle of the cell). */
    function treeAt(x, y, T) {
        const [sx, sy, w, h] = TREES[hash(x, y, 3) < 0.35 ? 0 : 1];
        return { sx, sy, w, h, dx: x * T + Math.floor((T - w) / 2), dy: (y + 1) * T - h + 2 };
    }

    function decorPass(g, map, nameAt, T) {
        const img = sheet();
        if (!img) return false;
        for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) {
            if (nameAt(map, x, y) !== 'tree') continue;
            const t = treeAt(x, y, T);
            g.drawImage(img, t.sx, t.sy, t.w, t.h, t.dx, t.dy, t.w, t.h);
        }
    }

    const overhangs = {
        tree(g, px, py, T, c) {
            const img = sheet();
            if (!img) return false;
            const t = treeAt(c.tx, c.ty, T);
            const above = py - t.dy;                           // how much of the sprite is above this cell
            if (above > 0) g.drawImage(img, t.sx, t.sy, t.w, above, t.dx, t.dy, t.w, above);
        }
    };

    const api = { ground, painters, overhangs, decorPass, KEY };
    ENSO.tilesForsaken = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
