/* =========================================================================
 * Enso's Last Stand — HD TILE PAINTERS (HD-2D overhaul)
 * Detailed pixel-art painters for the common tiles (grass, cobbles, paths, flagstones, clay roofs,
 * half-timber walls, windows, trees, stone walls, water, fences, lanterns) and the cast-shadow /
 * ambient-occlusion pass that gives the flat tile grid height. ui/world-render.js uses these in
 * place of its simple painters when this file is loaded; the map data doesn't change, so authored
 * PNG tilesets can replace any painter later, one tile name at a time.
 * Light comes from the upper left: highlights on top/left edges, shadows fall down and right.
 * Presentation only.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const hash = (x, y, s = 0) => {
        let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const pick = (list, r) => list[Math.min(list.length - 1, Math.floor(r * list.length))];
    const circle = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };

    // Palettes (warm, slightly desaturated: the grade in ui/postfx.js adds the rest)
    const P = {
        grass: ['#45713a', '#48763d', '#4c793f', '#507d42'], grassDark: '#30522a', grassLight: '#79a85a',
        flowers: ['#e8d26a', '#f0ece0', '#a8b8e8', '#e09a9a'],
        stones: ['#8c7b68', '#7d6d5c', '#978570', '#6f6150', '#857463'], mortar: '#3b322b',
        dirt: ['#7a5c3e', '#6e5236', '#856444'], pebble: '#9a8468',
        flag: ['#6a6670', '#615d68', '#726e78'], flagLine: '#2e2c34',
        clay: ['#8e3a2a', '#9a4430', '#843424', '#a24c36'], clayDark: '#5a2018', clayLight: '#c06a4a',
        plaster: '#dccbaa', plasterShade: '#c4b392', beam: '#4a2f1f', beamLight: '#6a4630',
        leaf: ['#2a4a2a', '#345a30', '#3f6a36', '#4e7c40'], leafLight: '#6e9a52', leafDark: '#1c321e',
        wall: ['#5e5a64', '#56525c', '#68646e'], wallDark: '#2c2a32', moss: '#4a6a3a',
        water: '#1f4a5a', waterDeep: '#173a48', waterLight: '#5aa0b0'
    };

    function grassBase(g, px, py, T, c) {
        for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x += 4) rect(g, px + x, py + y, 4, 4, pick(P.grass, hash(c.tx * 8 + x, c.ty * 8 + y, 1)));
        for (let i = 0; i < 9; i++) {                                    // blades: a light tip over a dark root
            const x = px + Math.floor(hash(c.tx, c.ty, i + 20) * (T - 2)), y = py + 2 + Math.floor(hash(c.tx, c.ty, i + 40) * (T - 5));
            rect(g, x, y + 2, 1, 2, P.grassDark); rect(g, x, y, 1, 2, P.grassLight);
        }
        if (hash(c.tx, c.ty, 3) < 0.22) {                                 // a few flowers
            const col = pick(P.flowers, hash(c.tx, c.ty, 4));
            for (let i = 0; i < 3; i++) rect(g, px + 4 + Math.floor(hash(c.tx, c.ty, 50 + i) * (T - 8)), py + 4 + Math.floor(hash(c.tx, c.ty, 60 + i) * (T - 8)), 2, 2, col);
        }
    }
    function cobbleBase(g, px, py, T, c) {
        rect(g, px, py, T, T, P.mortar);
        const rows = 4, h = T / rows;
        for (let r = 0; r < rows; r++) {
            const off = ((r + c.ty * rows) % 2) * 4;
            for (let x = -off; x < T; x += 8) {
                const sx = Math.max(px, px + x + 1), ex = Math.min(px + T, px + x + 8);
                if (ex - sx < 2) continue;
                const sy = py + r * h + 1, w = ex - sx, hh = h - 1;
                const col = pick(P.stones, hash(c.tx * 9 + x, c.ty * 9 + r, 2));
                rect(g, sx, sy, w, hh, col);
                rect(g, sx, sy, w, 1, 'rgba(255,240,220,0.18)'); rect(g, sx, sy, 1, hh, 'rgba(255,240,220,0.10)');
                rect(g, sx, sy + hh - 1, w, 1, 'rgba(0,0,0,0.25)'); rect(g, ex - 1, sy, 1, hh, 'rgba(0,0,0,0.15)');
            }
        }
    }

    const ground = {
        grass(g, px, py, T, c) { grassBase(g, px, py, T, c); },
        cobble(g, px, py, T, c) { cobbleBase(g, px, py, T, c); },
        dirt_path(g, px, py, T, c) {
            for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x += 4) rect(g, px + x, py + y, 4, 4, pick(P.dirt, hash(c.tx * 8 + x, c.ty * 8 + y, 5)));
            for (let i = 0; i < 6; i++) {
                const x = px + Math.floor(hash(c.tx, c.ty, i + 70) * (T - 3)), y = py + Math.floor(hash(c.tx, c.ty, i + 80) * (T - 3));
                rect(g, x, y, 2, 2, P.pebble); rect(g, x, y + 2, 2, 1, 'rgba(0,0,0,0.3)');
            }
            const soft = (n) => n === 'grass' || n === 'tall_weeds' || n === 'tree';   // ragged grass edges
            for (let i = 0; i < T; i += 3) {
                if (soft(c.left)) rect(g, px, py + i, 1 + Math.floor(hash(c.tx, c.ty * 31 + i, 9) * 3), 3, P.grass[1]);
                if (soft(c.right)) { const w = 1 + Math.floor(hash(c.tx, c.ty * 37 + i, 9) * 3); rect(g, px + T - w, py + i, w, 3, P.grass[1]); }
                if (soft(c.above)) rect(g, px + i, py, 3, 1 + Math.floor(hash(c.tx * 41 + i, c.ty, 9) * 3), P.grass[1]);
                if (soft(c.below)) { const h = 1 + Math.floor(hash(c.tx * 43 + i, c.ty, 9) * 3); rect(g, px + i, py + T - h, 3, h, P.grass[1]); }
            }
        },
        stone_floor(g, px, py, T, c) {
            rect(g, px, py, T, T, P.flagLine);
            for (const [x, y, w, h] of [[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]]) {
                const col = pick(P.flag, hash(c.tx * 4 + x, c.ty * 4 + y, 6));
                rect(g, px + x + 1, py + y + 1, w - 2, h - 2, col);
                rect(g, px + x + 1, py + y + 1, w - 2, 1, 'rgba(255,255,255,0.08)');
                rect(g, px + x + 1, py + y + h - 2, w - 2, 1, 'rgba(0,0,0,0.25)');
                if (hash(c.tx * 4 + x, c.ty * 4 + y, 7) < 0.25) rect(g, px + x + 4, py + y + 6, 5, 1, 'rgba(0,0,0,0.3)');   // a crack
            }
        }
    };

    function timberWall(g, px, py, T, c) {
        rect(g, px, py, T, T, P.plaster);
        for (let i = 0; i < 10; i++) rect(g, px + Math.floor(hash(c.tx, c.ty, i + 90) * (T - 2)), py + Math.floor(hash(c.tx, c.ty, i + 95) * (T - 8)), 2, 1, P.plasterShade);
        rect(g, px, py, T, 3, P.beam); rect(g, px, py + 14, T, 3, P.beam);
        rect(g, px, py, 3, T - 6, P.beam); rect(g, px, py, T, 1, P.beamLight);
        g.strokeStyle = P.beam; g.lineWidth = 3; g.beginPath();
        if ((c.tx + c.ty) % 2) { g.moveTo(px + 3, py + 14); g.lineTo(px + T, py + 3); } else { g.moveTo(px + 3, py + 3); g.lineTo(px + T, py + 14); }
        g.stroke();
        for (let x = 0; x < T; x += 8) {                                         // stone plinth
            rect(g, px + x, py + T - 6, 8, 6, pick(P.wall, hash(c.tx * 4 + x, c.ty, 8)));
            rect(g, px + x, py + T - 6, 8, 1, 'rgba(255,255,255,0.12)'); rect(g, px + x + 7, py + T - 6, 1, 6, 'rgba(0,0,0,0.3)');
        }
        rect(g, px, py + T - 1, T, 1, 'rgba(0,0,0,0.5)');
    }
    function window_(g, px, py, T, c) {
        rect(g, px + 8, py + 17, T - 16, 10, P.beam);                          // frame
        const lit = true;   // evening: every window is lit
        rect(g, px + 10, py + 18, T - 20, 8, lit ? '#e8b058' : '#2a3442');
        if (lit) rect(g, px + 10, py + 18, T - 20, 2, '#f8d890');
        rect(g, px + T / 2 - 1, py + 18, 2, 8, P.beam); rect(g, px + 10, py + 21, T - 20, 1, P.beam);
        rect(g, px + 6, py + 26, T - 12, 2, P.beamLight);                       // sill
        if (hash(c.tx, c.ty, 13) < 0.5) for (let i = 0; i < 4; i++) circle(g, px + 9 + i * 5, py + 25, 2, pick(['#c84a4a', '#e8d26a', '#e88ab0'], hash(c.tx, c.ty, 14 + i)));
    }

    const painters = {
        house_wall(g, px, py, T, c) { timberWall(g, px, py, T, c); },
        timber_wall(g, px, py, T, c) { timberWall(g, px, py, T, c); if (hash(c.tx, c.ty, 9) < 0.35) window_(g, px, py, T, c); },
        house_window(g, px, py, T, c) { timberWall(g, px, py, T, c); window_(g, px, py, T, c); },
        roof(g, px, py, T, c) {
            rect(g, px, py, T, T, P.clayDark);
            for (let r = 0; r < 4; r++) {                                         // overlapping rows of clay tiles
                const off = ((r + c.ty * 4) % 2) * 3;
                for (let x = -off; x < T; x += 6) {
                    const sx = Math.max(px, px + x), ex = Math.min(px + T, px + x + 6);
                    if (ex - sx < 2) continue;
                    const sy = py + r * 8;
                    rect(g, sx, sy, ex - sx - 1, 7, pick(P.clay, hash(c.tx * 7 + x, c.ty * 7 + r, 10)));
                    rect(g, sx, sy, ex - sx - 1, 1, P.clayLight);
                    rect(g, sx, sy + 6, ex - sx - 1, 1, P.clayDark);
                }
            }
            g.fillStyle = 'rgba(255,220,180,0.06)'; g.fillRect(px, py, T, T / 2);  // the sunny upper slope
            if (c.above !== 'roof') { rect(g, px, py, T, 4, '#4a1a14'); rect(g, px, py + 1, T, 1, P.clayLight); }   // ridge
            if (c.below !== 'roof') { rect(g, px, py + T - 4, T, 4, '#3a1410'); rect(g, px, py + T - 1, T, 1, '#1a0806'); }   // eave
            if (hash(c.tx, c.ty, 11) < 0.12 && c.above !== 'roof') {               // a chimney
                rect(g, px + 18, py - 6, 8, 12, '#6a5a52'); rect(g, px + 18, py - 6, 8, 2, '#8a7a70'); rect(g, px + 25, py - 6, 1, 12, '#3a302a');
            }
        },
        tree(g, px, py, T, c) {
            g.fillStyle = 'rgba(10,20,10,0.4)'; g.beginPath(); g.ellipse(px + T / 2 + 4, py + T - 5, 13, 5, 0, 0, Math.PI * 2); g.fill();
            rect(g, px + T / 2 - 3, py + 10, 6, T - 13, '#4a3424'); rect(g, px + T / 2 - 3, py + 10, 2, T - 13, '#6a4c34');
            rect(g, px + T / 2 - 5, py + T - 5, 10, 2, '#3a2818');
            leaves(g, px + T / 2, py + 10, 13, c, 0);
        },
        stone_wall(g, px, py, T, c) {
            rect(g, px, py, T, T, P.wallDark);
            for (let r = 0; r < 4; r++) {
                const off = ((r + c.ty) % 2) * 6;
                for (let x = -off; x < T; x += 12) {
                    const sx = Math.max(px, px + x + 1), ex = Math.min(px + T, px + x + 12);
                    if (ex - sx < 2) continue;
                    const sy = py + r * 8 + 1;
                    rect(g, sx, sy, ex - sx, 7, pick(P.wall, hash(c.tx * 5 + x, c.ty * 5 + r, 15)));
                    rect(g, sx, sy, ex - sx, 1, 'rgba(255,255,255,0.14)'); rect(g, sx, sy + 6, ex - sx, 1, 'rgba(0,0,0,0.3)');
                }
            }
            if (hash(c.tx, c.ty, 16) < 0.3) for (let i = 0; i < 5; i++) rect(g, px + Math.floor(hash(c.tx, c.ty, 17 + i) * 28), py + T - 4 - Math.floor(hash(c.tx, c.ty, 22 + i) * 8), 3, 2, P.moss);
            if (c.below !== 'stone_wall') rect(g, px, py + T - 2, T, 2, 'rgba(0,0,0,0.45)');
        },
        fence(g, px, py, T, c) {
            for (const x of [3, T - 7]) {
                rect(g, px + x + 2, py + 12, 4, 18, 'rgba(0,0,0,0.25)');              // post shadow
                rect(g, px + x, py + 8, 4, 20, '#6a4c30'); rect(g, px + x, py + 8, 1, 20, '#8a6a48'); rect(g, px + x, py + 7, 4, 2, '#8a6a48');
            }
            for (const y of [12, 20]) { rect(g, px, py + y, T, 3, '#7a5a3a'); rect(g, px, py + y, T, 1, '#9a7a56'); rect(g, px, py + y + 3, T, 1, 'rgba(0,0,0,0.3)'); }
        },
        water(g, px, py, T, c) {
            const grd = g.createLinearGradient(px, py, px, py + T);
            grd.addColorStop(0, P.water); grd.addColorStop(1, P.waterDeep);
            g.fillStyle = grd; g.fillRect(px, py, T, T);
            const t = c.time / 700;
            for (let i = 0; i < 4; i++) {
                const y = py + 4 + i * 7 + Math.sin(t + c.tx * 1.7 + i) * 1.5;
                const x = px + 3 + ((i * 9 + c.tx * 5 + Math.floor(t * 2)) % 18);
                rect(g, x, y, 7, 1, 'rgba(160,220,235,0.35)'); rect(g, x + 2, y, 3, 1, 'rgba(230,250,255,0.5)');
            }
            if (c.above && c.above !== 'water' && c.above !== 'bridge') { rect(g, px, py, T, 3, 'rgba(0,0,0,0.35)'); rect(g, px, py + 3, T, 1, 'rgba(200,240,255,0.35)'); }
        },
        lantern(g, px, py, T, c) {
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + T / 2 + 3, py + T - 3, 6, 2, 0, 0, Math.PI * 2); g.fill();
            rect(g, px + T / 2 - 1, py + 8, 3, T - 10, '#2a2420'); rect(g, px + T / 2 - 4, py + T - 4, 9, 2, '#2a2420');
            rect(g, px + T / 2 - 4, py + 2, 9, 2, '#2a2420');
            const f = 0.8 + 0.2 * Math.sin(c.time / 120 + c.tx * 3);
            rect(g, px + T / 2 - 3, py + 4, 7, 6, `rgba(255, ${190 + Math.floor(40 * f)}, 110, 1)`);
            rect(g, px + T / 2 - 1, py + 5, 3, 4, '#fff4c8');
            rect(g, px + T / 2 - 3, py + 10, 7, 1, '#2a2420');
        }
    };

    function leaves(g, cx, cy, r, c, s) {
        // Clumps from dark (back, lower right) to light (front, upper left), outlined by the darkest green.
        const clumps = [];
        for (let i = 0; i < 9; i++) {
            const a = hash(c.tx, c.ty, 30 + i + s) * Math.PI * 2, d = hash(c.tx, c.ty, 40 + i + s) * r * 0.65;
            clumps.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r * (0.45 + hash(c.tx, c.ty, 50 + i + s) * 0.25)]);
        }
        for (const [x, y, rr] of clumps) circle(g, x + 1, y + 1, rr + 1, P.leafDark);
        for (const [x, y, rr] of clumps) circle(g, x, y, rr, P.leaf[1]);
        for (const [x, y, rr] of clumps) circle(g, x - rr * 0.25, y - rr * 0.3, rr * 0.65, P.leaf[2]);
        for (const [x, y, rr] of clumps) circle(g, x - rr * 0.4, y - rr * 0.5, rr * 0.3, P.leaf[3]);
        for (let i = 0; i < 6; i++) rect(g, Math.round(cx - r * 0.6 + hash(c.tx, c.ty, 60 + i + s) * r), Math.round(cy - r * 0.7 + hash(c.tx, c.ty, 70 + i + s) * r * 0.8), 2, 1, P.leafLight);
    }

    /** Tree crowns over the row above (drawn after people, so they pass behind them). */
    const overhangs = {
        tree(g, px, py, T, c) { leaves(g, px + T / 2, py - 2, 15, c, 100); }
    };

    /** What casts a shadow: tall things. Height in tiles (roughly) sets how far the shadow reaches. */
    const TALL = {
        roof: 1, house_wall: 0.6, house_window: 0.6, timber_wall: 0.6, stone_wall: 0.7, wood_wall: 0.5,
        shed_wall: 0.5, shed_roof: 0.8, shed_door_shut: 0.5
    };
    /** Cast shadows and contact occlusion onto the neighbours of tall tiles (static layer, after all tiles). */
    function shadePass(g, map, nameAt, T) {
        const H = map.tiles.length, W = map.tiles[0].length;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const h = TALL[nameAt(map, x, y)];
            if (!h) continue;
            const px = x * T, py = y * T;
            if (!TALL[nameAt(map, x, y + 1)] && y + 1 < H) {                    // falls down onto the tile below
                const d = Math.round(T * 0.45 * h + 4);
                const gr = g.createLinearGradient(0, py + T, 0, py + T + d);
                gr.addColorStop(0, 'rgba(8,6,16,0.45)'); gr.addColorStop(1, 'rgba(8,6,16,0)');
                g.fillStyle = gr; g.fillRect(px + 3, py + T, T, d);
            }
            if (!TALL[nameAt(map, x + 1, y)] && x + 1 < W) {                    // and a little to the right
                const d = Math.round(T * 0.3 * h + 3);
                const gr = g.createLinearGradient(px + T, 0, px + T + d, 0);
                gr.addColorStop(0, 'rgba(8,6,16,0.32)'); gr.addColorStop(1, 'rgba(8,6,16,0)');
                g.fillStyle = gr; g.fillRect(px + T, py + 4, d, T);
            }
        }
    }

    /** Tiles that give light (merged into the renderer's TILE_LIGHTS). */
    const lights = {
        lantern: { radius: 3.2, color: 'rgba(255, 190, 110, 0.35)' },
        house_window: { radius: 0.9, color: 'rgba(255, 170, 80, 0.12)' }
    };

    const api = { ground, painters, overhangs, shadePass, lights, TALL };
    ENSO.tilesHD = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
