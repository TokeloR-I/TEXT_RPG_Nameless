/* =========================================================================
 * Enso's Last Stand — SCENE ART: INSIDE BRIARWELL KLOSTER (original, drawn by code; Saffron/Quill)
 * Paints the enclosed house round the cloister court (the Klausur) whole, after Tokelo's reference
 * (2026-11-04, "Pixel-Art Monastery Cloister Map"): a candle-lit monastery seen from above. The abbey chapel
 * fills the north middle, with three stained-glass lancets over the altar, banners with gold crosses, pews either
 * side of a red runner and hooded saints in niches. The library with its armillary sphere, the study, the infirmary
 * and a herb garden run down the west side; the refectory with its hearth, the brewery with two copper vats, the
 * barrel cellar and the dormitory cells down the east. Two corridors of warm stone run between. In the middle lies
 * the cloister court: an arcade hung with vines and banners on its north side, four flower beds with cypresses and
 * benches, and in the very centre a round fountain with a robed, hooded statue (the Fallen Seraph, gazeRules in
 * src/data.js; its halo and six wings are drawn live by ui/world-ui.js). South: the entrance hall, two saints and
 * two braziers by the steps down to the garth.
 *
 * Adds the 'kloster_inner' scene to ENSO.sceneArt (ui/scene-art.js) and reuses its painting kit. The map's tiles
 * (legend in src/world/chapter1-maps.js) decide collision and where each thing stands; the scene paints what the
 * tiles say is there. No image goes in: every pixel comes from shapes, noise and the palette below
 * (docs/art/ORIGINAL_ART_PLAN.md §0). Review: `node tools/preview-scene.js kloster_inner out.png 1`.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (!SA) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, rectFill, shape, ellipse, box, poly, thick, fill, shadow, barrel, blockOf, masonry } = SA.kit;

    // Candlelight on old stone: warm grey-brown floors, dark walls, red cloth, gold, oak, copper and box-hedge green.
    const IP = {
        floor: R(['#1f1915', '#2a221c', '#352b23', '#41352b', '#4d3f33', '#5a4a3c', '#685646']),
        court: R(['#29251f', '#353028', '#423b31', '#4f473b', '#5d5446', '#6b6151', '#7a6f5e']),
        wall: R(['#151213', '#1e1a1a', '#282322', '#332d2b', '#3e3734', '#4a423e', '#574e48']),
        face: R(['#1c1816', '#272120', '#322b28', '#3e3631', '#4a413a', '#574c44', '#65584e']),
        oak: R(['#140c07', '#1e130b', '#2a1b10', '#372416', '#452e1c', '#553923', '#66452b']),
        cloth: R(['#2a0808', '#460d0c', '#621411', '#7e1c16', '#9a271d', '#b33628']),
        gold: R(['#3a2608', '#6a470f', '#9a6c1a', '#c99a2c', '#ecc85a', '#fff0a8']),
        glow: R(['#4d220c', '#8f4515', '#d07c26', '#f6b44c', '#ffe08f', '#fff6d8']),
        glassR: R(['#3a0a10', '#7a1420', '#b82a2c', '#e05a3a', '#ff9a5a']),
        glassB: R(['#0a1430', '#142a66', '#2448a0', '#3c74d0', '#7aaaf0']),
        stone: R(['#2a2828', '#3a3837', '#4b4846', '#5d5955', '#706b65', '#86807a', '#9c958e']),
        copper: R(['#2a1208', '#4e220e', '#7a3816', '#a85222', '#cc7234', '#e8965a', '#f6c08a']),
        iron: PAL.iron,
        leaf: R(['#0d150b', '#132010', '#1a2c15', '#23391a', '#2d4720', '#385626', '#44662d']),
        soil: R(['#170f0a', '#20160e', '#2a1d13', '#352518']),
        water: R(['#0d1a22', '#12242e', '#19303c', '#21404e', '#2e5465', '#46708a']),
        linen: R(['#6e665a', '#8a8274', '#a69e8e', '#c2baa8', '#ddd6c4']),
        book: [[110, 30, 24], [36, 58, 92], [52, 74, 40], [120, 88, 34], [80, 40, 70], [140, 116, 80], [60, 30, 20]],
        flowers: [[200, 40, 40], [230, 226, 210], [150, 90, 190], [240, 200, 80], [210, 120, 150]],
        shadow: [5, 4, 6]
    };
    const pick = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))];

    const WALL = 'klausur_wall';
    const COURT = new Set(['court_paving', 'court_pillar', 'flower_bed', 'cypress', 'bench', 'seraph_fountain']);

    // ---------------------------------------------------------------------
    // Ground
    // ---------------------------------------------------------------------
    /** Voronoi paving for the court: worn irregular stones in mortar. */
    function stones(x, y, seed, size = 11) {
        const gx = Math.floor(x / size), gy = Math.floor(y / (size * 0.8));
        let f1 = 1e9, f2 = 1e9, id = 0, cx1 = 0, cy1 = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const cx = (gx + i + 0.15 + hash(gx + i, gy + j, seed) * 0.7) * size, cy = (gy + j + 0.15 + hash(gx + i, gy + j, seed + 1) * 0.7) * size * 0.8;
            const d = Math.hypot(x - cx, (y - cy) * 1.15);
            if (d < f1) { f2 = f1; f1 = d; id = (gx + i) * 7919 + (gy + j); cx1 = cx; cy1 = cy; } else if (d < f2) f2 = d;
        }
        return { id, edge: f2 - f1, lit: (x - cx1) * -0.6 + (y - cy1) * -0.8 > size * 0.22 };
    }

    function ground(img, map, nameAt, seed) {
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C), n = nameAt(map, cx, cy);
            if (n === WALL) continue;
            if (COURT.has(n)) {
                const v = stones(x, y, seed + 9);
                let t = 0.46 + (hash(v.id, 0, seed + 10) - 0.5) * 0.3 + (vnoise(x / 3, y / 3, seed + 11) - 0.5) * 0.12;
                if (v.edge < 1.1) t = 0.06; else if (v.edge < 2.1) t -= 0.14; else if (v.lit) t += 0.1;
                put(img, x, y, pick(IP.court, t));
                if (v.edge < 1.2 && vnoise(x / 4, y / 4, seed + 12) > 0.7) put(img, x, y, IP.leaf[3]);
                continue;
            }
            // Indoor floor: long stones in courses, each a little different, joints dark.
            const row = Math.floor(y / 10), off = (row % 2) * 9, col = Math.floor((x + off) / 18);
            const u = (x + off) % 18, v = y % 10;
            let t = 0.44 + (hash(col, row, seed) - 0.5) * 0.3 + (vnoise(x / 4, y / 4, seed + 2) - 0.5) * 0.16;
            if (u === 0 || v === 0) t = 0.06; else if (u === 1 || v === 1) t += 0.08; else if (u === 17 || v === 9) t -= 0.1;
            put(img, x, y, pick(IP.floor, t));
            if (n === 'red_carpet') {
                const lx = x - cx * C;
                if (lx >= 5 && lx < 27) {
                    const edge = lx < 8 || lx > 23;
                    put(img, x, y, edge ? pick(IP.gold, 0.5 + (hash(x, y, seed) - 0.5) * 0.2) : pick(IP.cloth, 0.55 + (vnoise(x / 2, y / 6, seed + 4) - 0.5) * 0.3 + ((y % 8) === 0 ? -0.1 : 0)));
                }
            }
            if (n === 'stairs') {                                 // steps down to the garth
                const ly = y - cy * C;
                put(img, x, y, pick(IP.stone, 0.62 - Math.floor(ly / 8) * 0.12 + ((ly % 8) === 0 ? 0.15 : 0) + (hash(x >> 2, ly >> 3, seed) - 0.5) * 0.1));
            }
        }
    }

    // ---------------------------------------------------------------------
    // Walls: a dark top, and a stone face wherever a floor lies south of the wall.
    // ---------------------------------------------------------------------
    const isWall = (map, nameAt, x, y) => { const n = nameAt(map, x, y); return n === WALL || n == null; };
    function walls(L, map, nameAt, cw, ch, seed) {
        const img = L.base;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            if (!isWall(map, nameAt, x, y) || nameAt(map, x, y) == null) continue;
            const x0 = x * C, y0 = y * C;
            const face = !isWall(map, nameAt, x, y + 1);
            const capH = face ? 12 : C;
            // Top of the wall: rough dark masonry, a lit rim where it meets the room.
            masonry(img, x0, y0, C, capH, seed + x * 3 + y * 7, IP.wall);
            for (const [dx, dy, side] of [[-1, 0, 'l'], [1, 0, 'r'], [0, -1, 't']]) {
                if (isWall(map, nameAt, x + dx, y + dy)) continue;
                if (side === 'l') rectFill(img, x0, y0, 2, capH, IP.wall[6]);
                if (side === 'r') rectFill(img, x0 + C - 2, y0, 2, capH, IP.wall[1]);
                if (side === 't') rectFill(img, x0, y0, C, 2, IP.wall[6]);
            }
            if (!face) continue;
            masonry(img, x0, y0 + capH, C, C - capH, seed + x * 11 + y, IP.face);
            rectFill(img, x0, y0 + capH, C, 1, IP.face[6]);
            rectFill(img, x0, y0 + C - 2, C, 2, IP.face[0]);
            for (let i = 0; i < C; i++) for (let j = 0; j < 7; j++) put(img, x0 + i, y0 + C + j, IP.shadow, 0.38 * (1 - j / 7));   // its shadow on the floor
        }
    }

    // ---------------------------------------------------------------------
    // Painting helpers
    // ---------------------------------------------------------------------
    function tall(L, box4, split, overhead, draw) {
        const S = L.scratch;
        draw(S);
        const [x0, y0, x1, y1] = box4.map((v) => Math.round(v));
        for (let y = Math.max(0, y0); y < Math.min(S.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(S.w, x1); x++) {
            const i = (y * S.w + x) * 4, a = S.data[i + 3];
            if (!a) continue;
            put(overhead && y < split ? L.over : L.base, x, y, [S.data[i], S.data[i + 1], S.data[i + 2]], a / 255);
            S.data[i] = S.data[i + 1] = S.data[i + 2] = S.data[i + 3] = 0;
        }
    }
    function glowAt(img, cx, cy, r, c, a) {
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d < r) put(img, cx + x, cy + y, c, (1 - d / r) * a); }
    }
    function candle(img, x, y, scene, h = 5) {
        rectFill(img, x, y - h, 2, h, IP.linen[4]); put(img, x, y - h - 1, IP.glow[5]); put(img, x + 1, y - h - 1, IP.glow[4]);
        glowAt(img, x + 1, y - h - 1, 7, IP.glow[3], 0.16);
        if (scene) scene.flames.push({ x: x + 1, y: y - h - 1 });
    }
    function crossBanner(img, x, y, w, h, seed) {
        const s = shape(); poly(s, img, [[x, y], [x + w, y], [x + w, y + h], [x + w / 2, y + h - 5], [x, y + h]], (px) => ((px - x) / w - 0.5) * -0.9);
        fill(img, s, IP.cloth, { tex: 0.3, seed, outline: [24, 6, 6] });
        const cx = Math.round(x + w / 2);
        rectFill(img, cx - 1, y + 4, 2, h - 12, IP.gold[4]); rectFill(img, cx - 4, y + 8, 8, 2, IP.gold[4]);
        rectFill(img, x - 2, y - 2, w + 4, 2, IP.gold[2]);
    }
    function lancet(img, x, y, w, h, glass, seed) {
        for (let j = -2; j < h + 2; j++) for (let i = -2; i < w + 2; i++) {
            const ax = i - (w - 1) / 2, top = Math.max(0, w / 2 - Math.sqrt(Math.max(0, (w / 2) ** 2 - ax * ax))) * 1.6;
            if (j < top - 2) continue;
            const edge = j < top || i < 0 || i >= w || j >= h;
            if (edge) { put(img, x + i, y + j, IP.stone[5]); continue; }
            const pane = (Math.floor(i / 3) + Math.floor(j / 4)) % 3;
            const ramp = pane === 0 ? IP.glassB : pane === 1 ? IP.glassR : IP.gold;
            put(img, x + i, y + j, pick(ramp, 0.75 - (j / h) * 0.35 + (hash(i >> 1, j >> 2, seed) - 0.5) * 0.3));
            if (i % 3 === 2 || j % 4 === 3) put(img, x + i, y + j, IP.iron[0], 0.7);
        }
        glowAt(img, x + w / 2, y + h + 6, 14, IP.glow[3], 0.08);
    }
    function litWindow(img, x, y, w, h, seed) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const ax = i - (w - 1) / 2, top = w / 2 - Math.sqrt(Math.max(0, (w / 2) ** 2 - ax * ax));
            if (j < top) continue;
            const edge = i === 0 || i === w - 1 || j === h - 1 || j < top + 1;
            put(img, x + i, y + j, edge ? IP.stone[4] : pick(IP.glow, 0.7 - j / h * 0.4 + (hash(i, j, seed) - 0.5) * 0.15));
        }
        rectFill(img, x + Math.floor(w / 2), y + 2, 1, h - 2, IP.iron[0]);
    }

    // ---------------------------------------------------------------------
    // Furniture
    // ---------------------------------------------------------------------
    function bookshelf(L, b, seed) {
        const X = b.x0 * C + 2, W = (b.x1 - b.x0 + 1) * C - 4, top = b.y0 * C - 14, B = (b.y1 + 1) * C - 4;
        tall(L, [X - 4, top - 2, X + W + 6, B + 6], b.y0 * C, false, (S) => {
            rectFill(S, X + 2, B, W, 4, IP.shadow, 0.4);
            const f = shape(); box(f, S, X, top, W, B - top, 0); fill(S, f, IP.oak, { tex: 0.3, seed, outline: IP.oak[0] });
            const shelfH = 11;
            for (let sy = top + 3, k = 0; sy + shelfH <= B - 2; sy += shelfH + 2, k++) {
                rectFill(S, X + 2, sy + shelfH, W - 4, 2, IP.oak[5]);
                let bx = X + 3;
                while (bx < X + W - 4) {
                    const bw = 2 + Math.floor(hash(bx, sy, seed) * 3), bh = shelfH - 1 - Math.floor(hash(bx, sy, seed + 1) * 4);
                    if (hash(bx, sy, seed + 2) < 0.1) { bx += bw + 2; continue; }
                    const c = IP.book[Math.floor(hash(bx, sy, seed + 3) * IP.book.length)];
                    for (let j = 0; j < bh; j++) for (let i = 0; i < bw && bx + i < X + W - 3; i++) put(S, bx + i, sy + shelfH - j, i === 0 ? c.map((v) => v * 1.3) : j === 2 ? IP.gold[3] : c);
                    bx += bw;
                }
            }
        });
    }
    function desk(L, b, seed, scene) {
        const X = b.x0 * C + 3, W = (b.x1 - b.x0 + 1) * C - 6, Y = b.y0 * C + 6, H = (b.y1 - b.y0 + 1) * C - 12;
        shadow(L.base, X + W / 2 + 3, Y + H + 3, W / 2 + 2, 4, 0.45);
        const top = shape(); box(top, L.base, X, Y, W, H - 5, 0.4); fill(L.base, top, IP.oak.slice(2), { tex: 0.35, seed, outline: IP.oak[0] });
        const front = shape(); box(front, L.base, X, Y + H - 5, W, 5, -0.4); fill(L.base, front, IP.oak, { outline: IP.oak[0] });
        // An open book, papers, a candle.
        const bx = X + 5 + Math.floor(hash(b.x0, b.y0, seed) * Math.max(1, W - 24));
        rectFill(L.base, bx, Y + 4, 16, 10, IP.linen[3]); rectFill(L.base, bx + 8, Y + 4, 1, 10, IP.linen[1]);
        for (let k = 0; k < 4; k++) { rectFill(L.base, bx + 2, Y + 6 + k * 2, 5, 1, IP.linen[1]); rectFill(L.base, bx + 10, Y + 6 + k * 2, 5, 1, IP.linen[1]); }
        if (W > 40) rectFill(L.base, X + W - 18, Y + 6, 10, 8, IP.linen[4]);
        candle(L.base, X + W - 6, Y + 10, scene);
    }
    function armillary(L, x, y, seed) {
        const cx = x * C + 16, cy = y * C + 20;
        // The star rug under it.
        const rug = shape(); ellipse(rug, L.base, cx, cy + 6, 30, 16); fill(L.base, rug, R(['#0e1424', '#141c34', '#1c2846', '#24345a']), { tex: 0.2, seed });
        for (let a = 0; a < 360; a += 4) put(L.base, cx + Math.cos(a * Math.PI / 180) * 27, cy + 6 + Math.sin(a * Math.PI / 180) * 13.5, IP.gold[3]);
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const s = shape(); thick(s, L.base, cx, cy + 6, cx + Math.cos(a) * (k % 2 ? 9 : 16), cy + 6 + Math.sin(a) * (k % 2 ? 5 : 8), 0.8); fill(L.base, s, IP.gold.slice(2), { edge: false }); }
        tall(L, [cx - 20, cy - 40, cx + 20, cy + 12], y * C, true, (S) => {
            shadow(S, cx + 3, cy + 6, 8, 3, 0.5);
            const st = shape(); thick(st, S, cx, cy - 10, cx, cy + 5, 1.5); fill(S, st, IP.gold.slice(1), { outline: IP.oak[0] });
            rectFill(S, cx - 5, cy + 4, 10, 2, IP.gold[2]);
            const ring = (rx, ry, tilt, c) => { for (let a = 0; a < 360; a += 2) { const t = a * Math.PI / 180, px = Math.cos(t) * rx, py = Math.sin(t) * ry; put(S, cx + px * Math.cos(tilt) - py * Math.sin(tilt), cy - 22 + px * Math.sin(tilt) + py * Math.cos(tilt), c); } };
            ring(13, 13, 0, IP.gold[4]); ring(13, 4, 0.4, IP.gold[3]); ring(4, 13, 0.2, IP.gold[3]); ring(13, 6, -0.7, IP.gold[2]);
            const sun = shape(); ellipse(sun, S, cx, cy - 22, 3, 3); fill(S, sun, IP.glow.slice(2), { edge: false });
        });
    }
    function pews(L, b, seed) {
        for (let y = b.y0; y <= b.y1; y++) {
            const X = b.x0 * C + 2, W = (b.x1 - b.x0 + 1) * C - 4, Y = y * C + 8;
            shadow(L.base, X + W / 2 + 3, Y + 20, W / 2, 3, 0.4);
            const seat = shape(); box(seat, L.base, X, Y + 6, W, 9, 0.5); fill(L.base, seat, IP.oak.slice(2), { tex: 0.3, seed: seed + y, outline: IP.oak[0] });
            const back = shape(); box(back, L.base, X, Y, W, 6, -0.2); fill(L.base, back, IP.oak.slice(1), { tex: 0.3, seed: seed + y + 1, outline: IP.oak[0] });
            for (let i = X + 4; i < X + W; i += 12) rectFill(L.base, i, Y + 1, 1, 4, IP.oak[5]);
            rectFill(L.base, X, Y + 15, W, 3, IP.oak[0]);
        }
    }
    function altar(L, x, y, seed, scene) {
        const cx = x * C + 16, gy = y * C + 28;
        tall(L, [cx - 26, gy - 46, cx + 26, gy + 6], y * C, false, (S) => {
            shadow(S, cx + 3, gy + 2, 24, 4, 0.5);
            const blk = shape(); box(blk, S, cx - 22, gy - 16, 44, 16, -0.1); fill(S, blk, IP.stone.slice(1), { tex: 0.3, seed, outline: IP.stone[0] });
            const cloth = shape(); box(cloth, S, cx - 23, gy - 20, 46, 9, 0.5); fill(S, cloth, IP.linen, { tex: 0.2, seed: seed + 1, outline: IP.linen[0] });
            rectFill(S, cx - 6, gy - 11, 12, 11, IP.cloth[3]); rectFill(S, cx - 1, gy - 10, 2, 8, IP.gold[4]); rectFill(S, cx - 3, gy - 8, 6, 2, IP.gold[4]);
            const cr = shape(); box(cr, S, cx - 2, gy - 44, 4, 24, 0.3); box(cr, S, cx - 8, gy - 38, 16, 4, 0.3); fill(S, cr, IP.gold.slice(1), { outline: IP.gold[0] });
            glowAt(S, cx, gy - 34, 14, IP.gold[4], 0.12);
            for (const dx of [-19, -13, 11, 17]) candle(S, cx + dx, gy - 20, scene, 6);
        });
    }
    /** A robed, hooded figure in grey stone, hands folded. The Fallen Seraph wears the same robe. */
    function robedFigure(S, cx, gy, h, seed, ramp = IP.stone) {
        const w = h * 0.34;
        const body = shape();
        poly(body, S, [[cx - w * 0.55, gy - h * 0.72], [cx + w * 0.55, gy - h * 0.72], [cx + w, gy], [cx - w, gy]], (px) => ((px - cx) / w) * -0.7);
        fill(S, body, ramp.slice(1), { tex: 0.35, seed, outline: ramp[0] });
        for (let k = -1; k <= 1; k++) { const fx = cx + k * w * 0.45; const f = shape(); thick(f, S, fx, gy - h * 0.6, fx + k * w * 0.25, gy - 1, 0.6); fill(S, f, [ramp[1]], { edge: false }); }   // folds
        const hood = shape(); ellipse(hood, S, cx, gy - h * 0.8, w * 0.62, h * 0.17); fill(S, hood, ramp.slice(1), { tex: 0.3, seed: seed + 1, outline: ramp[0] });
        const face = shape(); ellipse(face, S, cx, gy - h * 0.77, w * 0.3, h * 0.09); fill(S, face, [ramp[0], ramp[1]], { edge: false });
        const hands = shape(); ellipse(hands, S, cx, gy - h * 0.5, w * 0.38, h * 0.07); fill(S, hands, ramp.slice(2), { outline: ramp[0] });
    }
    function saint(L, x, y, seed, overhead) {
        const cx = x * C + 16, gy = y * C + 28;
        tall(L, [cx - 16, gy - 50, cx + 16, gy + 6], y * C, overhead, (S) => {
            shadow(S, cx + 3, gy + 1, 11, 3, 0.5);
            const plinth = shape(); box(plinth, S, cx - 10, gy - 6, 20, 6, 0); fill(S, plinth, IP.stone.slice(1), { outline: IP.stone[0] });
            robedFigure(S, cx, gy - 6, 40, seed);
        });
    }
    function candelabra(L, x, y, seed, scene, overhead) {
        const cx = x * C + 16, gy = y * C + 26;
        tall(L, [cx - 14, gy - 44, cx + 14, gy + 6], y * C, overhead, (S) => {
            shadow(S, cx + 2, gy + 1, 6, 2, 0.45);
            const st = shape(); thick(st, S, cx, gy - 26, cx, gy, 1.2); thick(st, S, cx - 8, gy - 26, cx + 8, gy - 26, 1); fill(S, st, IP.iron, { outline: IP.iron[0] });
            rectFill(S, cx - 4, gy - 1, 9, 2, IP.iron[2]);
            for (const dx of [-8, 0, 8]) candle(S, cx + dx - 1, gy - 26, scene, 6);
        });
    }
    function longTable(L, b, seed, scene) {
        const X = b.x0 * C + 2, W = (b.x1 - b.x0 + 1) * C - 4, Y = b.y0 * C + 8, H = 16;
        shadow(L.base, X + W / 2 + 3, Y + H + 10, W / 2 + 2, 4, 0.45);
        for (const by of [Y - 6, Y + H + 3]) { const bench = shape(); box(bench, L.base, X + 4, by, W - 8, 5, 0.3); fill(L.base, bench, IP.oak.slice(1), { tex: 0.3, seed: seed + by, outline: IP.oak[0] }); }
        const top = shape(); box(top, L.base, X, Y, W, H, 0.4); fill(L.base, top, IP.oak.slice(2), { tex: 0.35, seed, outline: IP.oak[0] });
        for (let px = X + 10; px < X + W - 6; px += 16) {
            const plate = shape(); ellipse(plate, L.base, px, Y + 5, 4, 2.2); fill(L.base, plate, IP.linen.slice(1), { outline: IP.linen[0] });
            if (hash(px, Y, seed) < 0.5) rectFill(L.base, px - 1, Y + 9, 3, 4, IP.copper[4]); else { const br = shape(); ellipse(br, L.base, px, Y + 11, 3, 2); fill(L.base, br, IP.gold.slice(1, 4)); }
        }
        candle(L.base, X + W / 2 - 1, Y + 9, scene, 6);
    }
    function hearth(L, x, y, seed, scene) {
        const X = x * C, gy = (y + 1) * C - 2;
        tall(L, [X - 8, gy - 60, X + C + 2, gy + 4], y * C, false, (S) => {
            masonry(S, X - 6, gy - 58, C + 6, 58, seed, IP.stone);
            rectFill(S, X - 8, gy - 30, C + 10, 4, IP.stone[5]);
            const mouth = shape(); box(mouth, S, X, gy - 24, C - 8, 22, 0); fill(S, mouth, [[10, 6, 6], [18, 10, 8]], { edge: false });
            for (let k = 0; k < 3; k++) rectFill(S, X + 3 + k * 7, gy - 6, 6, 3, IP.oak[3]);
            glowAt(S, X + 12, gy - 10, 16, IP.glow[3], 0.3);
            scene.flames.push({ x: X + 12, y: gy - 9, big: true });
        });
    }
    function copperVat(L, b, seed) {
        const cx = (b.x0 + b.x1 + 1) / 2 * C, gy = (b.y1 + 1) * C - 4, r = (b.x1 - b.x0 + 1) * C / 2 - 5;
        tall(L, [cx - r - 6, gy - 86, cx + r + 10, gy + 6], b.y0 * C, true, (S) => {
            shadow(S, cx + 4, gy, r + 2, 6, 0.5);
            const body = shape(); box(body, S, cx - r, gy - 46, r * 2, 42, 0); ellipse(body, S, cx, gy - 4, r, 7);
            for (const [i] of body.px) body.px.set(i, (((i % S.w) - cx) / r) * -0.8);
            fill(S, body, IP.copper, { tex: 0.15, seed, outline: IP.copper[0] });
            for (const hy of [gy - 40, gy - 22, gy - 8]) for (let i = -r + 1; i < r; i++) put(S, cx + i, hy, IP.copper[1]);
            const dome = shape(); ellipse(dome, S, cx, gy - 47, r, 12); fill(S, dome, IP.copper.slice(1), { tex: 0.15, seed: seed + 1, outline: IP.copper[0] });
            const neck = shape(); box(neck, S, cx - 4, gy - 72, 8, 18, 0); fill(S, neck, IP.copper.slice(1), { outline: IP.copper[0] });
            const pipe = shape(); thick(pipe, S, cx, gy - 72, cx + r + 4, gy - 60, 2); thick(pipe, S, cx + r + 4, gy - 60, cx + r + 4, gy - 30, 2); fill(S, pipe, IP.copper.slice(2), { outline: IP.copper[0] });
            rectFill(S, cx - 3, gy - 20, 6, 6, IP.iron[3]);
        });
    }
    function barrelRack(L, b, seed) {
        const X = b.x0 * C + 2, W = (b.x1 - b.x0 + 1) * C - 4, gy = (b.y1 + 1) * C - 3;
        tall(L, [X - 2, gy - 44, X + W + 4, gy + 4], b.y0 * C, false, (S) => {
            shadow(S, X + W / 2 + 3, gy, W / 2, 4, 0.45);
            rectFill(S, X, gy - 4, W, 4, IP.oak[2]); rectFill(S, X, gy - 40, 3, 40, IP.oak[3]); rectFill(S, X + W - 3, gy - 40, 3, 40, IP.oak[1]);
            const n = Math.max(2, Math.round(W / 22)), rr = W / n / 2 - 1;
            for (const row of [0, 1]) for (let k = 0; k < n - row; k++) {
                const cx = X + rr + 1 + k * (rr * 2 + 2) + row * (rr + 1), cy = gy - 4 - rr - row * (rr * 1.7);
                const s = shape(); ellipse(s, S, cx, cy, rr, rr); fill(S, s, IP.oak.slice(2), { tex: 0.3, seed: seed + k + row * 9, outline: IP.oak[0] });
                for (let a = 0; a < 360; a += 6) put(S, cx + Math.cos(a * Math.PI / 180) * (rr - 2), cy + Math.sin(a * Math.PI / 180) * (rr - 2), IP.iron[2]);
                rectFill(S, cx - 1, cy - 1, 3, 3, IP.oak[0]);
            }
        });
    }
    function cellBed(L, b, seed, scene) {
        const X = b.x0 * C + 5, W = C - 10, Y = b.y0 * C + 2, H = (b.y1 - b.y0 + 1) * C - 6;
        shadow(L.base, X + W / 2 + 3, Y + H + 2, W / 2 + 2, 3, 0.45);
        const fr = shape(); box(fr, L.base, X, Y, W, H, 0); fill(L.base, fr, IP.oak.slice(1), { outline: IP.oak[0] });
        const sheet = shape(); box(sheet, L.base, X + 2, Y + 3, W - 4, H - 6, 0.4); fill(L.base, sheet, IP.linen, { tex: 0.2, seed });
        const pil = shape(); ellipse(pil, L.base, X + W / 2, Y + 8, W / 2 - 4, 4); fill(L.base, pil, IP.linen.slice(2), { outline: IP.linen[0] });
        const bl = shape(); box(bl, L.base, X + 2, Y + H * 0.45, W - 4, H * 0.5, 0.1); fill(L.base, bl, IP.cloth.slice(1), { tex: 0.3, seed: seed + 1, outline: IP.cloth[0] });
        for (let j = 0; j < 3; j++) rectFill(L.base, X + 3, Y + H * 0.45 + 4 + j * 7, W - 6, 1, IP.cloth[1]);
        if (b.y0 > 0 && nameAtCache(b.x0, b.y0 - 1) === WALL) {   // a wooden cross on the wall over the bed
            const cx = X + W / 2, cy = b.y0 * C - 10;
            rectFill(L.base, cx - 1, cy - 6, 3, 13, IP.oak[4]); rectFill(L.base, cx - 4, cy - 3, 9, 3, IP.oak[4]);
        }
        if (scene && hash(b.x0, b.y0, seed) < 0.6) candle(L.base, X + W + 1, Y + 10, scene, 4);
    }
    let nameAtCache = () => null;
    function planter(L, b, seed) {
        const X = b.x0 * C + 2, W = (b.x1 - b.x0 + 1) * C - 4, Y = b.y0 * C + 10, H = 18;
        shadow(L.base, X + W / 2 + 3, Y + H + 2, W / 2, 3, 0.45);
        const tr = shape(); box(tr, L.base, X, Y + 6, W, H - 6, -0.1); fill(L.base, tr, IP.stone.slice(1), { tex: 0.35, seed, outline: IP.stone[0] });
        rectFill(L.base, X + 2, Y + 6, W - 4, 3, IP.soil[2]);
        for (let i = X + 2; i < X + W - 2; i += 2) {
            const h = 5 + Math.floor(hash(i, Y, seed) * 10), c = IP.flowers[Math.floor(hash(i >> 3, Y, seed + 1) * IP.flowers.length)];
            for (let j = 0; j < h; j++) put(L.base, i + (j % 3 === 0 ? 1 : 0), Y + 7 - j, IP.leaf[3 + (j % 3)]);
            if (hash(i, Y, seed + 2) < 0.55) { put(L.base, i, Y + 6 - h, c); put(L.base, i + 1, Y + 6 - h, c); put(L.base, i, Y + 5 - h, c.map((v) => Math.min(255, v * 1.15))); }
        }
    }
    function brazier(L, x, y, seed, scene, overhead) {
        const cx = x * C + 16, gy = y * C + 26;
        tall(L, [cx - 14, gy - 44, cx + 14, gy + 6], y * C, overhead, (S) => {
            shadow(S, cx + 3, gy + 1, 9, 3, 0.5);
            const legs = shape(); thick(legs, S, cx - 7, gy, cx - 3, gy - 14, 1); thick(legs, S, cx + 7, gy, cx + 3, gy - 14, 1); thick(legs, S, cx, gy + 1, cx, gy - 14, 1); fill(S, legs, IP.iron, { outline: IP.iron[0] });
            const bowl = shape(); poly(bowl, S, [[cx - 11, gy - 20], [cx + 11, gy - 20], [cx + 6, gy - 12], [cx - 6, gy - 12]], (px) => ((px - cx) / 11) * -0.6); fill(S, bowl, IP.iron.slice(1), { outline: IP.iron[0] });
            rectFill(S, cx - 9, gy - 22, 18, 3, IP.glow[2]);
            glowAt(S, cx, gy - 28, 18, IP.glow[3], 0.25);
            const f = shape(); ellipse(f, S, cx, gy - 27, 6, 8); fill(S, f, IP.glow.slice(2), { edge: false });
            scene.flames.push({ x: cx, y: gy - 26, big: true });
        });
    }

    // ---------------------------------------------------------------------
    // The cloister court
    // ---------------------------------------------------------------------
    /** The north arcade: round arches spring from pillar to pillar, hung with vines and two banners. */
    function arcade(L, row, x0, x1, seed) {
        const Y = row * C, B = Y + C;
        const pillars = [];
        for (let x = x0; x <= x1; x++) if (nameAtCache(x, row) === 'court_pillar') pillars.push(x * C + 16);
        // The arches and the walk's roof edge go over a player walking under them.
        tall(L, [x0 * C - 4, Y - 30, (x1 + 1) * C + 4, B + 4], B - 8, true, (S) => {
            for (let k = 0; k + 1 < pillars.length; k++) {
                const a = pillars[k], b2 = pillars[k + 1], mid = (a + b2) / 2, r = (b2 - a) / 2;
                for (let px = a; px <= b2; px++) {
                    const top = Y - 2 - Math.sqrt(Math.max(0, r * r - (px - mid) ** 2)) * 0.55 + r * 0.55;
                    for (let py = Y - 22; py < top; py++) put(S, px, py, pick(IP.stone, 0.5 + (vnoise(px / 3, py / 3, seed) - 0.5) * 0.3 + (py > top - 3 ? 0.18 : 0)));
                    put(S, px, Math.round(top), IP.stone[1]);
                }
            }
            rectFill(S, x0 * C, Y - 24, (x1 - x0 + 1) * C, 3, IP.stone[5]);
            for (let px = x0 * C; px < (x1 + 1) * C; px++) {   // vines along the top
                const hang = Math.floor(fbm(px / 9, 3, seed) * 14) - 3;
                for (let j = 0; j < hang; j++) put(S, px, Y - 22 + j, pick(IP.leaf, 0.3 + vnoise(px / 2, j / 2, seed + 1) * 0.7));
                if (hash(px, 1, seed) < 0.04) put(S, px, Y - 22 + Math.max(0, hang), IP.flowers[1]);
            }
        });
        for (const px of pillars) tall(L, [px - 8, Y - 26, px + 8, B + 4], B - 8, true, (S) => {
            shadow(S, px + 3, B - 3, 7, 2.5, 0.45);
            const col = shape(); box(col, S, px - 4, Y - 18, 8, C + 12, 0); for (const [i] of col.px) col.px.set(i, (((i % S.w) - px) / 4) * -0.8);
            fill(S, col, IP.stone.slice(1), { tex: 0.25, seed: seed + px, outline: IP.stone[0] });
            rectFill(S, px - 6, Y - 20, 12, 3, IP.stone[5]); rectFill(S, px - 6, B - 6, 12, 3, IP.stone[3]);
            for (let j = 0; j < 16; j++) if (hash(px, j, seed) < 0.6) put(S, px - 4 + Math.round(Math.sin(j * 0.9) * 3), Y - 14 + j * 2, IP.leaf[4]);   // ivy up the column
        });
    }
    function bed(L, b, seed, scene) {
        const X = b.x0 * C + 3, W = (b.x1 - b.x0 + 1) * C - 6, Y = b.y0 * C + 3, H = (b.y1 - b.y0 + 1) * C - 6;
        const kerb = shape(); poly(kerb, L.base, [[X + 6, Y], [X + W - 6, Y], [X + W, Y + 6], [X + W, Y + H], [X, Y + H], [X, Y + 6]], 0.1);
        fill(L.base, kerb, IP.stone.slice(1), { tex: 0.3, seed, outline: IP.stone[0] });
        const soil = shape(); poly(soil, L.base, [[X + 8, Y + 3], [X + W - 8, Y + 3], [X + W - 3, Y + 8], [X + W - 3, Y + H - 4], [X + 3, Y + H - 4], [X + 3, Y + 8]], 0);
        fill(L.base, soil, IP.soil, { tex: 0.5, seed: seed + 1 });
        // Flowers: red, white and purple in drifts, leaves between.
        for (const [i] of soil.px) {
            const x = i % L.base.w, y = (i / L.base.w) | 0;
            const n = vnoise(x / 3, y / 3, seed + 2);
            if (n > 0.22) put(L.base, x, y, pick(IP.leaf, 0.2 + n * 0.8 + (hash(x, y, seed) - 0.5) * 0.3));
            if (hash(x, y, seed + 3) < 0.04) {
                const drift = fbm(x / 14, y / 14, seed + 4), c = IP.flowers[[0, 0, 2, 4, 1][Math.floor(drift * 5) % 5]];
                put(L.base, x, y, c); put(L.base, x + 1, y, c.map((v) => v * 0.8)); put(L.base, x, y - 1, c.map((v) => Math.min(255, v * 1.15)));
            }
        }
        for (let x = b.x0; x <= b.x1; x++) for (let y = b.y0; y <= b.y1; y++) {
            if (nameAtCache(x, y) === 'bench') {                     // a bench along the bed's south edge
                const bx = x * C - 4, by = (y + 1) * C - 10, bw = C + 8;
                shadow(L.base, bx + bw / 2 + 3, by + 9, bw / 2, 2.5, 0.45);
                const seat = shape(); box(seat, L.base, bx, by, bw, 6, 0.5); fill(L.base, seat, IP.oak.slice(2), { tex: 0.3, seed: seed + x, outline: IP.oak[0] });
                rectFill(L.base, bx + 2, by + 6, 3, 4, IP.oak[1]); rectFill(L.base, bx + bw - 5, by + 6, 3, 4, IP.oak[1]);
            }
        }
        for (let x = b.x0; x <= b.x1; x++) for (let y = b.y0; y <= b.y1; y++) if (nameAtCache(x, y) === 'cypress') scene.cypresses.push({ x, y });
    }
    function cypress(L, x, y, seed, overhead) {
        const cx = x * C + 16, gy = y * C + 30;
        tall(L, [cx - 14, gy - 74, cx + 14, gy + 6], y * C, overhead, (S) => {
            shadow(S, cx + 5, gy, 9, 3, 0.45);
            rectFill(S, cx - 1, gy - 5, 3, 6, IP.oak[2]);
            const s = shape();
            for (let j = 0; j < 62; j++) { const t = j / 62, w = Math.sin(Math.min(1, t * 1.25) * Math.PI) * 8.5 + 1.5; for (let i = -w; i <= w; i++) s.px.set(Math.round(gy - 4 - j) * S.w + Math.round(cx + i), (i / w) * -0.7 + (vnoise((cx + i) / 2, (gy - j) / 2.2, seed + x) - 0.5) * 0.9); }
            fill(S, s, IP.leaf, { outline: IP.leaf[0] });
        });
    }
    /** The fountain in the very middle: a round stone basin, and on its pedestal the robed statue. */
    function seraphFountain(L, b, seed, scene, overhead) {
        const cx = (b.x0 + b.x1 + 1) / 2 * C, gy = (b.y1 + 1) * C - 6;
        tall(L, [cx - 52, gy - 100, cx + 52, gy + 10], b.y0 * C, overhead, (S) => {
            shadow(S, cx + 6, gy + 2, 46, 9, 0.5);
            const ring = (rx, ry, cy0) => [...Array(16)].map((_, k) => [cx + Math.cos((k + 0.5) * Math.PI / 8) * rx, cy0 + Math.sin((k + 0.5) * Math.PI / 8) * ry]);
            const step = shape(); poly(step, S, ring(46, 19, gy - 12), (px, py) => ((py - gy + 12) / 19) * -0.5 + 0.2); fill(S, step, IP.stone.slice(1), { tex: 0.35, seed, outline: IP.stone[0] });
            const rim = shape(); poly(rim, S, ring(38, 15, gy - 15), (px, py) => ((py - gy + 15) / 15) * -0.5 + 0.35); fill(S, rim, IP.stone.slice(2), { tex: 0.35, seed: seed + 1, outline: IP.stone[0] });
            const face = shape(); box(face, S, cx - 36, gy - 15, 72, 8, -0.2); fill(S, face, IP.stone.slice(1), { tex: 0.4, seed: seed + 2, outline: IP.stone[0] });
            const water = shape(); poly(water, S, ring(32, 11.5, gy - 16), 0);
            for (const [i] of water.px) { const px = i % S.w, py = (i / S.w) | 0; put(S, px, py, pick(IP.water, 0.4 + (vnoise(px / 4, py / 2, seed) - 0.5) * 0.5 + (py < gy - 21 ? 0.2 : 0))); if (hash(px, py, seed) < 0.05) scene.water.push(py * S.w + px); }
            const ped = shape(); box(ped, S, cx - 9, gy - 34, 18, 20, 0); for (const [i] of ped.px) ped.px.set(i, (((i % S.w) - cx) / 9) * -0.7);
            fill(S, ped, IP.stone.slice(1), { tex: 0.3, seed: seed + 3, outline: IP.stone[0] });
            rectFill(S, cx - 12, gy - 36, 24, 3, IP.stone[5]);
            for (const sx of [-10, 10]) for (let j = 0; j < 12; j++) put(S, cx + sx + Math.sign(sx) * j * 0.4, gy - 30 + j, [170, 200, 214], 0.5);   // water from the pedestal's mouths
            robedFigure(S, cx, gy - 36, 52, seed + 4);
            glowAt(S, cx, gy - 60, 30, IP.glow[4], 0.06);
        });
        scene.anchors.seraph = { x: cx, y: gy - 36 - 52 };   // the top of the hood: the halo hangs above it
    }

    // ---------------------------------------------------------------------
    // Wall dressing: windows, banners and sconces on the room faces.
    // ---------------------------------------------------------------------
    function dressing(L, map, nameAt, cw, ch, seed, scene) {
        const img = L.base;
        const faceAt = (x, y) => isWall(map, nameAt, x, y) && nameAt(map, x, y) != null && !isWall(map, nameAt, x, y + 1);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            if (!faceAt(x, y)) continue;
            const below = nameAt(map, x, y + 1), X = x * C, Y = y * C + 12;
            const chapel = y === 0 && x >= 13 && x <= 25;
            if (chapel) {
                if (x === 16 || x === 19 || x === 22) lancet(img, X + 5, Y - 12, 22, 34, x === 19 ? IP.gold : IP.glassB, seed + x);
                else if (x === 14 || x === 24) crossBanner(img, X + 8, Y - 6, 16, 26, seed + x);
                else if (x === 18 || x === 20) { rectFill(img, X + 14, Y + 4, 4, 6, IP.iron[2]); candle(img, X + 15, Y + 4, scene, 5); }
                continue;
            }
            if (below === 'bookshelf' || below === 'barrel_rack' || below === 'hearth' || below === 'copper_vat') continue;   // the furniture stands against it
            const h = hash(x, y, seed + 5);
            if (y === 0 && h < 0.45) litWindow(img, X + 9, Y - 8, 14, 18, seed + x);
            else if (h < 0.22) crossBanner(img, X + 9, Y - 6, 14, 22, seed + x);
            else if (h < 0.5) { rectFill(img, X + 14, Y + 6, 4, 4, IP.iron[2]); candle(img, X + 15, Y + 6, scene, 4); }
        }
    }

    // ---------------------------------------------------------------------
    // The scene
    // ---------------------------------------------------------------------
    function klosterInner(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) };
        const seed = 131, scene = { flames: [], water: [], cypresses: [], anchors: {} };
        nameAtCache = (x, y) => nameAt(map, x, y);
        rectFill(L.base, 0, 0, L.base.w, L.base.h, IP.wall[0]);
        ground(L.base, map, nameAt, seed);
        walls(L, map, nameAt, cw, ch, seed);
        dressing(L, map, nameAt, cw, ch, seed, scene);
        const OPEN = new Set(['stone_floor', 'red_carpet', 'court_paving', 'stairs']);
        const open = (x, y) => OPEN.has(nameAt(map, x, y));
        const behind = (x, y) => open(x, y - 1);
        const items = [], seen = new Set();
        const BLOCKS = { bookshelf: 1, desk: 1, pew: 1, long_table: 1, copper_vat: 1, barrel_rack: 1, cell_bed: 1, planter: 1, seraph_fountain: 1 };
        const bedNames = new Set(['flower_bed', 'cypress', 'bench']);
        let arcadeRow = null;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (n === 'court_pillar') { if (arcadeRow == null) arcadeRow = { y, x0: x, x1: x }; else arcadeRow.x1 = Math.max(arcadeRow.x1, x); continue; }
            if (bedNames.has(n)) {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, bedNames, seen);
                items.push({ y: b.y0 + 0.2, x: b.x0, draw: () => bed(L, b, seed + b.x0 * 13 + b.y0 * 7, scene) });
                continue;
            }
            if (BLOCKS[n]) {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set([n]), seen), s = seed + b.x0 * 13 + b.y0 * 7;
                const draw = {
                    bookshelf: () => bookshelf(L, b, s),
                    desk: () => desk(L, b, s, scene),
                    pew: () => pews(L, b, s),
                    long_table: () => longTable(L, b, s, scene),
                    copper_vat: () => copperVat(L, b, s),
                    barrel_rack: () => barrelRack(L, b, s),
                    cell_bed: () => cellBed(L, b, s, scene),
                    planter: () => planter(L, b, s),
                    seraph_fountain: () => seraphFountain(L, b, s, scene, true)
                }[n];
                items.push({ y: b.y1 + 0.9, x: b.x0, draw });
                continue;
            }
            const cx = x * C + 16, gy = y * C + 28;
            const P = {
                armillary: () => armillary(L, x, y, seed + x),
                altar: () => altar(L, x, y, seed, scene),
                saint_statue: () => saint(L, x, y, seed + x * 7 + y, behind(x, y)),
                candelabra: () => candelabra(L, x, y, seed + x, scene, behind(x, y)),
                hearth: () => hearth(L, x, y, seed, scene),
                barrel: () => barrel(L, cx, gy, seed + x + y),
                brazier: () => brazier(L, x, y, seed + x, scene, behind(x, y))
            }[n];
            if (P) items.push({ x, y: y + 0.5, draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        for (const c of scene.cypresses) cypress(L, c.x, c.y, seed + c.x * 3 + c.y, behind(c.x, c.y) || true);
        if (arcadeRow) arcade(L, arcadeRow.y, arcadeRow.x0, arcadeRow.x1, seed + 7);
        // Candlelight pools on the floors, the court a little brighter, the corners into shadow.
        for (const f of scene.flames) glowAt(L.base, Math.round(f.x), Math.round(f.y) + 8, f.big ? 34 : 18, IP.glow[3], f.big ? 0.12 : 0.07);
        for (let y = 0; y < L.base.h; y++) for (let x = 0; x < L.base.w; x++) {
            const d = Math.min(x, y, L.base.w - 1 - x, L.base.h - 1 - y);
            if (d < 22) put(L.base, x, y, IP.shadow, (1 - d / 22) * 0.45);
        }
        nameAtCache = () => null;
        function animate(g, time) {
            for (let k = 0; k < scene.flames.length; k++) {           // candles, braziers and the hearth
                const f = scene.flames[k], a = Math.sin(time / 90 + k * 2.1), b2 = Math.sin(time / 57 + k);
                if (f.big) {
                    g.fillStyle = 'rgba(255, 210, 110, 0.8)'; g.fillRect(f.x - 3 + (a > 0.3 ? 1 : 0), f.y - 6 - (b2 > 0 ? 1 : 0), 5, 5);
                    g.fillStyle = 'rgba(255, 120, 40, 0.6)'; g.fillRect(f.x - 6 + (b2 > 0.5 ? 1 : 0), f.y - 1, 11, 3);
                } else {
                    g.fillStyle = 'rgba(255, 220, 130, 0.85)'; g.fillRect(f.x - 1 + (a > 0.4 ? 1 : 0), f.y - 2 - (b2 > 0.2 ? 1 : 0), 1, 2);
                }
            }
        }
        return { w: L.base.w, h: L.base.h, base: L.base.data, over: L.over.data, water: scene.water, animate, anchors: scene.anchors };
    }

    SA.scenes.kloster_inner = klosterInner;
    if (isNode) module.exports = klosterInner;
})(typeof window !== 'undefined' ? window : globalThis);
