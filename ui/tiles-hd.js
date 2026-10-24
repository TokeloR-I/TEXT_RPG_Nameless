/* =========================================================================
 * Enso's Last Stand — HD TILE PAINTERS (HD-2D overhaul)
 * Detailed pixel-art painters for the common tiles (grass, cobbles, paths, flagstones, clay roofs,
 * half-timber walls, windows, trees, stone walls, water, fences, lanterns, and the interiors: floorboards,
 * plank walls, flagstones, furniture, storage and the hearth) and the cast-shadow /
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

    // Interior palettes: oiled floorboards, plank walls, dressed flagstones
    const W_ = {
        board: ['#6a4a30', '#5e4229', '#734f33', '#654630'], boardLine: '#2e1f14', grain: 'rgba(30,18,10,0.35)', boardLight: 'rgba(255,220,170,0.10)',
        plank: ['#5b4430', '#533e2b', '#624a34'], plankDark: '#2e2016', cap: '#7a5e44',
        ash: ['#5c5864', '#58545f', '#605c68', '#5a5662', '#64606c'], seam: '#2c2a32'
    };

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
        // Flagstones in a running bond: two courses per tile, stone lengths vary, worn edges, moss in some seams.
        stone_floor(g, px, py, T, c) {
            rect(g, px, py, T, T, W_.seam);
            const h = T / 2;
            for (let r = 0; r < 2; r++) {
                const row = c.ty * 2 + r;
                let x = -Math.floor(hash(row, c.tx, 31) * 10);
                for (let k = 0; x < T; k++) {
                    const w = 10 + Math.floor(hash(c.tx * 7 + k, row, 32) * 12);
                    const sx = Math.max(0, x), ex = Math.min(T, x + w);
                    if (ex - sx >= 2) {
                        const sy = py + r * h, X = px + sx, Wd = ex - sx - 1, Hd = h - 1;
                        rect(g, X, sy, Wd, Hd, pick(W_.ash, hash(c.tx * 13 + k, row, 33)));
                        rect(g, X, sy, Wd, 1, 'rgba(255,250,240,0.10)'); rect(g, X, sy, 1, Hd, 'rgba(255,250,240,0.06)');
                        rect(g, X, sy + Hd - 1, Wd, 1, 'rgba(0,0,0,0.22)');
                        const r1 = hash(c.tx * 5 + k, row, 34);
                        if (r1 < 0.07 && Wd > 8) {                                                    // a hairline crack
                            g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath();
                            const cx0 = X + 2 + hash(k, row, 36) * (Wd - 6);
                            g.moveTo(cx0, sy + 1); g.lineTo(cx0 + (hash(k, row, 37) - 0.5) * 6, sy + Hd * 0.5); g.lineTo(cx0 + (hash(k, row, 38) - 0.5) * 8, sy + Hd - 1); g.stroke();
                        }
                        else if (r1 > 0.86) rect(g, X + 2, sy + 3, 3, 2, 'rgba(255,255,255,0.06)');                                                       // a worn hollow
                        if (hash(c.tx * 3 + k, row, 35) < 0.12) rect(g, X, sy + Hd, Math.min(5, Wd), 1, P.moss);
                    }
                    x += w;
                }
            }
            const lf = hash(c.tx >> 2, c.ty >> 2, 39) - 0.5;                                          // broad patches of damp and wear
            g.fillStyle = lf > 0 ? `rgba(255,248,235,${lf * 0.08})` : `rgba(10,10,20,${-lf * 0.18})`; g.fillRect(px, py, T, T);
        },
        // Floorboards run left to right, ends staggered per row, with grain, nail heads and a soft sheen.
        wood_floor(g, px, py, T, c) {
            rect(g, px, py, T, T, W_.boardLine);
            const h = T / 4;
            for (let r = 0; r < 4; r++) {
                const row = c.ty * 4 + r, sy = py + r * h;
                const joint = 4 + Math.floor(hash(row, c.tx, 41) * (T - 8));
                const ends = hash(row, c.tx, 45) < 0.5 ? [[0, joint], [joint, T]] : [[0, T]];
                for (const [a, b] of ends) {
                    const col = pick(W_.board, hash(row, c.tx * 2 + (a > 0 ? 1 : 0), 42));
                    rect(g, px + a, sy, b - a, h - 1, col);
                    rect(g, px + a, sy, b - a, 1, W_.boardLight);
                    const gx = px + a + Math.floor(hash(row, c.tx * 3 + a, 43) * Math.max(1, b - a - 8));
                    rect(g, gx, sy + 3, 5 + Math.floor(hash(row, c.tx, 44) * 6), 1, W_.grain);
                    if (a > 0) { rect(g, px + a - 1, sy, 1, h - 1, W_.boardLine); rect(g, px + a + 1, sy + 3, 1, 1, '#2a2420'); rect(g, px + a - 3, sy + 3, 1, 1, '#2a2420'); }
                }
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
        // ---- interiors: plank walls, furniture and storage, lit from the upper left ----
        wood_wall(g, px, py, T, c) {
            const face = c.below !== 'wood_wall' && c.below !== 'stone_wall';
            rect(g, px, py, T, T, '#1c140e');
            rect(g, px, py, T, 2, '#3a2a1c');                                                     // the wall's top edge catches the light
            if (!face) { rect(g, px + 2, py + 4, T - 4, T - 6, '#21170f'); return; }
            const top = py + Math.floor(T * 0.28);
            for (let i = 0; i < 4; i++) {
                const x = px + i * T / 4;
                rect(g, x, top, T / 4 - 1, py + T - top, pick(W_.plank, hash(c.tx * 4 + i, c.ty, 51)));
                rect(g, x, top, 1, py + T - top, 'rgba(255,220,170,0.08)');
                rect(g, x + T / 4 - 1, top, 1, py + T - top, W_.plankDark);
                if (hash(c.tx * 4 + i, c.ty, 52) < 0.3) circle(g, x + 4, top + 8 + hash(c.tx + i, c.ty, 53) * 8, 1.2, '#3a2a1a');   // a knot
            }
            rect(g, px, top, T, 3, W_.cap); rect(g, px, top + 3, T, 1, 'rgba(0,0,0,0.35)');
            rect(g, px, py + T - 4, T, 4, '#2a1d13'); rect(g, px, py + T - 4, T, 1, '#4a3626');   // skirting
            if (hash(c.tx, c.ty, 54) < 0.18) {                                                    // a bundle of drying herbs
                rect(g, px + T / 2, top + 4, 1, 4, '#2a1d13');
                for (let k = -2; k <= 2; k++) rect(g, px + T / 2 + k, top + 8, 1, 7 - Math.abs(k), k % 2 ? '#5a7040' : '#6a8048');
            }
        },
        barrel(g, px, py, T) {
            const cx = px + T / 2, cy = py + T / 2;
            g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx + 2, cy + T * 0.34, T * 0.34, T * 0.1, 0, 0, Math.PI * 2); g.fill();
            rect(g, cx - T * 0.32, cy - T * 0.2, T * 0.64, T * 0.52, '#5b3f28');
            for (let i = 1; i < 5; i++) rect(g, cx - T * 0.32 + i * T * 0.128, cy - T * 0.2, 1, T * 0.52, '#3a2818');   // staves
            rect(g, cx - T * 0.32, cy - T * 0.2, T * 0.14, T * 0.52, 'rgba(255,220,170,0.12)');
            rect(g, cx + T * 0.18, cy - T * 0.2, T * 0.14, T * 0.52, 'rgba(0,0,0,0.25)');
            for (const y of [cy - T * 0.1, cy + T * 0.2]) { rect(g, cx - T * 0.33, y, T * 0.66, 2, '#3a3a40'); rect(g, cx - T * 0.33, y, T * 0.66, 1, '#7a7a84'); }
            g.fillStyle = '#6e4e34'; g.beginPath(); g.ellipse(cx, cy - T * 0.2, T * 0.32, T * 0.11, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#3a2818'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy - T * 0.2, T * 0.24, T * 0.07, 0, 0, Math.PI * 2); g.stroke();
        },
        crate(g, px, py, T) {
            g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px + 5, py + T - 5, T - 6, 3);
            rect(g, px + 3, py + 8, T - 6, T - 12, '#6b5235');                                    // front
            rect(g, px + 3, py + 3, T - 6, 6, '#8a6c48');                                        // lid, lit
            for (let i = 1; i < 3; i++) rect(g, px + 3, py + 8 + Math.round(i * (T - 12) / 3), T - 6, 1, '#4a3825');
            rect(g, px + 3, py + 8, 3, T - 12, '#4e3a26'); rect(g, px + T - 6, py + 8, 3, T - 12, '#4e3a26');
            g.strokeStyle = '#4e3a26'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 6, py + 9); g.lineTo(px + T - 6, py + T - 5); g.stroke();
            for (const [x, y] of [[4, 9], [T - 5, 9], [4, T - 6], [T - 5, T - 6]]) rect(g, px + x, py + y, 1, 1, '#a8a8b0');
            rect(g, px + 3, py + 3, T - 6, 1, 'rgba(255,230,190,0.25)');
        },
        shelf(g, px, py, T, c) {
            rect(g, px + 1, py + 1, T - 2, T - 2, '#3a2a1c'); rect(g, px + 3, py + 3, T - 6, T - 6, '#1e150e');
            for (let r = 0; r < 3; r++) {
                const by = py + 3 + Math.round((r + 1) * (T - 6) / 3) - 2;
                let x = px + 4;
                while (x < px + T - 7) {
                    const kind = hash(c.tx * 9 + x, c.ty * 3 + r, 61);
                    if (kind < 0.55) {                                                               // books
                        const w = 2 + Math.floor(kind * 3), hh = 5 + Math.floor(hash(x, r, 62) * 3);
                        rect(g, x, by - hh, w, hh, pick(['#6a2a2a', '#2a4a6a', '#5a5a2a', '#4a2a5a', '#7a5a30'], hash(x, c.ty + r, 63))); rect(g, x, by - hh, 1, hh, 'rgba(255,255,255,0.15)');
                        x += w + 1;
                    } else if (kind < 0.85) {                                                        // a jar
                        circle(g, x + 2, by - 3, 2.5, pick(['#4f7a52', '#7a6a50', '#8a8a96'], hash(x, r, 64))); rect(g, x + 1, by - 7, 3, 2, '#5a4a3a'); rect(g, x + 1, by - 4, 1, 1, 'rgba(255,255,255,0.45)');
                        x += 6;
                    } else x += 4;
                }
                rect(g, px + 2, by, T - 4, 2, '#5a4430'); rect(g, px + 2, by, T - 4, 1, '#7a5e44');
            }
        },
        bed(g, px, py, T, c) {
            const head = c.above !== 'bed', foot = c.below !== 'bed';
            rect(g, px + 1, py, T - 2, T, '#4a3220');
            rect(g, px + 1, py, 2, T, '#6a4a30'); rect(g, px + T - 3, py, 2, T, '#2e1f14');
            if (head) { rect(g, px + 1, py, T - 2, 4, '#6a4a30'); rect(g, px + 5, py + 5, T - 10, 8, '#e0d8c8'); rect(g, px + 5, py + 11, T - 10, 2, '#b0a898'); }
            const qy = head ? py + 13 : py, qb = foot ? py + T - 3 : py + T;
            rect(g, px + 3, qy, T - 6, qb - qy, '#6a4a6a');                                      // quilt
            for (let y = qy + 2; y < qb - 1; y += 6) for (let x = px + 5; x < px + T - 5; x += 6) rect(g, x, y, 2, 2, (x + y) % 12 ? '#8a6a8a' : '#a88a50');
            if (head) rect(g, px + 3, qy, T - 6, 2, '#d8d0c0');                                  // turned-down sheet
            rect(g, px + T - 5, qy, 2, qb - qy, 'rgba(0,0,0,0.2)');
            if (foot) rect(g, px + 1, py + T - 3, T - 2, 3, '#6a4a30');
        },
        rug(g, px, py, T, c) {
            const e = (t) => t !== 'rug';
            rect(g, px, py, T, T, '#5a1e26');
            for (let y = 0; y < T; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < T; x += 4) rect(g, px + x, py + y, 2, 2, '#64242c');
            if (e(c.above)) { rect(g, px, py, T, 4, '#8a5a30'); rect(g, px, py + 4, T, 1, '#c8a050'); }
            if (e(c.below)) { rect(g, px, py + T - 4, T, 4, '#8a5a30'); rect(g, px, py + T - 5, T, 1, '#c8a050'); }
            if (e(c.left)) { rect(g, px, py, 4, T, '#8a5a30'); rect(g, px + 4, py, 1, T, '#c8a050'); }
            if (e(c.right)) { rect(g, px + T - 4, py, 4, T, '#8a5a30'); rect(g, px + T - 5, py, 1, T, '#c8a050'); }
            const cx = px + T / 2, cy = py + T / 2;                                               // a medallion on each tile
            g.fillStyle = '#2a3a5a'; g.beginPath(); g.moveTo(cx, cy - 6); g.lineTo(cx + 6, cy); g.lineTo(cx, cy + 6); g.lineTo(cx - 6, cy); g.fill();
            g.fillStyle = '#c8a050'; g.beginPath(); g.moveTo(cx, cy - 3); g.lineTo(cx + 3, cy); g.lineTo(cx, cy + 3); g.lineTo(cx - 3, cy); g.fill();
        },
        fireplace(g, px, py, T, c) {
            rect(g, px, py, T, T, '#3a3640');
            for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
                const x = px + (r % 2) * 5 + k * 11 - 5, y = py + r * 8;
                const sx = Math.max(px, x), ex = Math.min(px + T, x + 10);
                if (ex > sx) { rect(g, sx, y, ex - sx, 7, pick(W_.ash, hash(c.tx * 4 + k, r, 71))); rect(g, sx, y, ex - sx, 1, 'rgba(255,255,255,0.1)'); }
            }
            rect(g, px + 5, py + 12, T - 10, T - 12, '#100a08');                                 // firebox
            rect(g, px, py + 8, T, 4, '#5a3e28'); rect(g, px, py + 8, T, 1, '#7a5a3c');          // mantel
            rect(g, px + 7, py + T - 4, T - 14, 3, '#3a2418');                                    // logs
            const t = c.time || 0;
            for (let i = 0; i < 4; i++) {
                const fx = px + 10 + i * 4, hh = 6 + (i % 2) * 3 + Math.sin(t / 110 + i * 1.7) * 2;
                g.fillStyle = '#e8702a'; g.beginPath(); g.moveTo(fx - 2.5, py + T - 4); g.quadraticCurveTo(fx, py + T - 4 - hh * 1.4, fx + 2.5, py + T - 4); g.fill();
                g.fillStyle = '#ffd070'; g.beginPath(); g.moveTo(fx - 1.2, py + T - 4); g.quadraticCurveTo(fx, py + T - 4 - hh * 0.8, fx + 1.2, py + T - 4); g.fill();
            }
            for (let i = 0; i < 3; i++) { const k = (t / 600 + i / 3) % 1; rect(g, px + 11 + i * 5 + Math.sin(t / 200 + i) * 2, py + T - 8 - k * 12, 1, 1, `rgba(255, 180, 90, ${1 - k})`); }
        },
        table(g, px, py, T) {
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px + 4, py + T - 4, T - 6, 3);
            rect(g, px + 4, py + T - 10, 3, 9, '#3a2a1c'); rect(g, px + T - 7, py + T - 10, 3, 9, '#2e2016');
            rect(g, px + 2, py + 6, T - 4, T - 15, '#7a5a3c');
            for (let i = 1; i < 3; i++) rect(g, px + 2, py + 6 + Math.round(i * (T - 15) / 3), T - 4, 1, '#5a4028');
            rect(g, px + 2, py + 6, T - 4, 1, '#9a7a58'); rect(g, px + 2, py + T - 10, T - 4, 2, '#4a3220');
            circle(g, px + 11, py + 12, 4, '#c8c0b0'); circle(g, px + 11, py + 12, 2.5, '#a8a090');
            rect(g, px + 19, py + 8, 4, 6, '#8a6a4a'); rect(g, px + 19, py + 8, 4, 1, '#c8b090');    // a mug
        },
        chair(g, px, py, T) {
            rect(g, px + 9, py + 4, T - 18, 10, '#6b4f35'); rect(g, px + 9, py + 4, T - 18, 1, '#8a6a48');
            for (let i = 0; i < 3; i++) rect(g, px + 11 + i * 4, py + 6, 1, 7, '#4a3220');
            rect(g, px + 8, py + 14, T - 16, 6, '#7a5a3c'); rect(g, px + 8, py + 14, T - 16, 1, '#9a7a58');
            rect(g, px + 9, py + 20, 2, 7, '#3a2a1c'); rect(g, px + T - 11, py + 20, 2, 7, '#3a2a1c');
        },
        bedroll(g, px, py, T) {
            g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(px + 4, py + T - 7, T - 6, 3);
            rect(g, px + 3, py + 7, T - 6, T - 14, '#5a5240'); rect(g, px + 3, py + 7, T - 6, 1, '#7a7058');
            for (let i = 0; i < 3; i++) rect(g, px + 12 + i * 6, py + 7, 1, T - 14, '#4a4232');
            rect(g, px + 4, py + 9, 8, T - 18, '#8a826c'); rect(g, px + 4, py + 9, 8, 1, '#a8a088');      // rolled blanket as a pillow
            rect(g, px + T - 7, py + 8, 2, T - 16, '#3a2a1a');                                          // a tie
        },
        stairs_up(g, px, py, T) {
            for (let i = 0; i < 5; i++) {
                const y = py + i * T / 5, v = 70 + i * 10;
                rect(g, px + 2, y, T - 4, T / 5 - 1, `rgb(${v},${v - 4},${v + 4})`);
                rect(g, px + 2, y, T - 4, 1, `rgba(255,255,255,${0.06 + i * 0.02})`);
            }
            rect(g, px, py, 2, T, '#2c2a32'); rect(g, px + T - 2, py, 2, T, '#2c2a32');
        },
        stairs_down(g, px, py, T) {
            for (let i = 0; i < 5; i++) {
                const y = py + i * T / 5, v = 60 - i * 10;
                rect(g, px + 2, y, T - 4, T / 5 - 1, `rgb(${v},${Math.max(0, v - 14)},${Math.max(0, v - 26)})`);
                rect(g, px + 2, y, T - 4, 1, `rgba(255,220,170,${0.12 - i * 0.02})`);
            }
            rect(g, px, py, 2, T, '#2a1d13'); rect(g, px + T - 2, py, 2, T, '#2a1d13');
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
    const packTrees = () => { const P = ENSO.tilesManaseed; return !!(P && ENSO.atlas && ENSO.atlas.image(P.KEY)); };

    function shadePass(g, map, nameAt, T) {
        const H = map.tiles.length, W = map.tiles[0].length;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const name = nameAt(map, x, y), h = TALL[name];
            if (!h) continue;
            if (name === 'tree' && packTrees()) continue;   // Mana Seed trees carry their own shadow

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
