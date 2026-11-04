/* =========================================================================
 * Enso's Last Stand — SCENE ART: THE HOMESTEAD ROOMS (original, drawn by code; Saffron/Quill)
 * Brings the four small places of the Forgotten Homestead up to the painted look of the outdoor scenes
 * (Tokelo, 2026-11-04: "bring the other areas up to speed with the graphic overhaul"):
 *   'cellar'       The Cellar: a low vault of damp fieldstone. Barrels and crates, heaps of fallen stone, a shelf
 *                  of dried-out preserve jars, the bedroll you wake on, a drift of black feathers under a crack of
 *                  grey light, the tallies scratched into the stone and wooden steps up to the house.
 *   'farmhouse'    The House: oak floorboards, whitewashed walls over a timber dado. The kitchen with its counter,
 *                  pots and hanging herbs, the table set for two, a dresser; the parlour with the stone hearth, a
 *                  red rug, an armchair and a bookshelf of books turned to the wall; the hall with the travelling
 *                  chest; the bedroom with the bed made tight. Steps down to the cellar, the front door to the yard.
 *   'old_shed'     The Old Shed: rough boards, a tool rack with one pair of shears hung upside down, seed crates,
 *                  the workbench, a rain barrel and a crate by the door.
 *   'well_bottom'  The bottom of the well: a round shaft of wet stone, rubble, a black pool seeping in from the
 *                  east, the rope hanging in a shaft of daylight, the circle carved into the west wall.
 *
 * Adds these scenes to ENSO.sceneArt (ui/scene-art.js) and reuses its painting kit. The maps' tiles (src/world/zone1.js)
 * still decide collision, exits and where each thing stands; nothing moved. The scenes paint what the tiles say is
 * there. No image goes in: every pixel comes from shapes, noise and the palette below (docs/art/ORIGINAL_ART_PLAN.md §0).
 * Review: `node tools/preview-scene.js cellar out.png 1` (also house, shed, well).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (!SA) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, rectFill, shape, ellipse, box, poly, thick, fill, shadow, barrel, crate, blockOf, masonry } = SA.kit;

    // Lamplight in an old farmhouse: cold fieldstone below ground, warm oak and limewash above it.
    const HP = {
        flag: R(['#16161a', '#1f1f23', '#29292c', '#333335', '#3e3d3e', '#4a4847', '#575451', '#65615c']),
        cellarWall: R(['#121215', '#1a1a1e', '#232326', '#2d2c2f', '#383639', '#444144', '#514d4f']),
        wellStone: R(['#0d1012', '#141a1c', '#1b2326', '#232d30', '#2c383a', '#374445', '#435150']),
        oak: R(['#1a0f08', '#27170c', '#352011', '#432a17', '#53351d', '#634024', '#754d2c', '#885b35']),
        board: R(['#1c140d', '#281c12', '#352617', '#43301d', '#523b23', '#61472a', '#715332']),
        plaster: R(['#4a4438', '#5c5547', '#6e6655', '#807764', '#918873', '#a29983']),
        timber: R(['#140c07', '#20140b', '#2c1b0f', '#3a2414', '#482d19']),
        cloth: R(['#2b0d0c', '#46140f', '#611d14', '#7b2a1b', '#953b25', '#ab4f31']),
        blanket: R(['#18222c', '#23313f', '#2f4053', '#3d5168', '#4c637c']),
        linen: R(['#57524a', '#706a5f', '#8b8475', '#a59e8c', '#c0b8a3']),
        straw: PAL.straw,
        iron: PAL.iron,
        glow: R(['#4d200a', '#8f4114', '#d27424', '#f6ae46', '#ffdf8e', '#fff6d8']),
        ash: R(['#1b1a1a', '#2a2828', '#3b3837', '#4e4a47', '#625d58']),
        water: R(['#06090b', '#0a1013', '#0f181c', '#152127', '#1d2c33', '#2a3e46']),
        moss: R(['#1b2614', '#24321a', '#2f4120', '#3b5127']),
        herb: R(['#1d2a12', '#2a3b17', '#3a4e1d', '#4d6324']),
        jar: R(['#1c2422', '#2a3633', '#3a4a45', '#4f625b', '#6c8178']),
        book: [[96, 30, 24], [36, 54, 82], [52, 70, 38], [112, 84, 34], [74, 40, 64], [124, 104, 74], [58, 30, 20]],
        feather: R(['#08080b', '#121218', '#1c1c25', '#2a2a36']),
        light: [214, 220, 214],
        shadow: [4, 4, 6]
    };
    const pick = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))];
    const STONE_WALL = new Set(['stone_wall']), WOOD_WALL = new Set(['wood_wall']);

    // ---------------------------------------------------------------------
    // Floors
    // ---------------------------------------------------------------------
    /** Fieldstone flags in uneven courses, mortar dark, a little moss and damp in the joints. */
    function flagstones(img, x, y, seed, ramp = HP.flag, damp = 0.3) {
        const rh = 11, row = Math.floor(y / rh), v = y % rh;
        const off = Math.floor(hash(row, 0, seed) * 14), wdt = 13 + Math.floor(hash(row, 1, seed) * 6);
        const col = Math.floor((x + off) / wdt), u = (x + off) % wdt;
        let t = 0.46 + (hash(col, row, seed + 2) - 0.5) * 0.3 + (vnoise(x / 4, y / 4, seed + 3) - 0.5) * 0.18;
        const joint = u === 0 || v === 0;
        if (joint) t = 0.06; else if (u === 1 || v === 1) t += 0.1; else if (u === wdt - 1 || v === rh - 1) t -= 0.1;
        if (hash(x >> 1, y >> 1, seed + 4) < 0.025) t -= 0.12;
        put(img, x, y, pick(ramp, t));
        if (joint && vnoise(x / 5, y / 5, seed + 5) > 1 - damp) put(img, x, y, pick(HP.moss, vnoise(x, y, seed + 6)));
    }
    /** Irregular fieldstones set in packed earth (Voronoi cells), each a little different, lit on the top left. */
    function fieldstones(img, x, y, seed, ramp = HP.flag, size = 13, earth = HP.board) {
        const gx = Math.floor(x / size), gy = Math.floor(y / (size * 0.8));
        let f1 = 1e9, f2 = 1e9, id = 0, cx1 = 0, cy1 = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const cx = (gx + i + 0.15 + hash(gx + i, gy + j, seed) * 0.7) * size, cy = (gy + j + 0.15 + hash(gx + i, gy + j, seed + 1) * 0.7) * size * 0.8;
            const d = Math.hypot(x - cx, (y - cy) * 1.15);
            if (d < f1) { f2 = f1; f1 = d; id = (gx + i) * 7919 + (gy + j); cx1 = cx; cy1 = cy; } else if (d < f2) f2 = d;
        }
        const edge = f2 - f1, lit = (x - cx1) * -0.6 + (y - cy1) * -0.8 > size * 0.2;
        if (edge < 1.6) { put(img, x, y, pick(earth, 0.12 + hash(x, y, seed + 7) * 0.18)); return 'joint'; }
        let t = 0.42 + (hash(id, 0, seed + 2) - 0.5) * 0.32 + (vnoise(x / 3, y / 3, seed + 3) - 0.5) * 0.16;
        if (edge < 2.6) t -= 0.16; else if (lit) t += 0.1;
        put(img, x, y, pick(ramp, t));
        return 'stone';
    }
    /** Oak floorboards running east-west, staggered ends, grain and nail heads. */
    function boards(img, x, y, seed, ramp = HP.oak, bh = 7) {
        const row = Math.floor(y / bh), v = y % bh;
        const len = 40 + Math.floor(hash(row, 2, seed) * 40), off = Math.floor(hash(row, 3, seed) * len);
        const col = Math.floor((x + off) / len), u = (x + off) % len;
        let t = 0.45 + (hash(col, row, seed) - 0.5) * 0.28 + (vnoise(x / 14, y * 1.7, seed + 1) - 0.5) * 0.22;
        if (v === 0) t = 0.05; else if (v === 1) t += 0.12; else if (v === bh - 1) t -= 0.1;
        if (u === 0) t = 0.1;
        if ((u === 3 || u === len - 4) && (v === 2 || v === bh - 3)) t = 0.02;     // nail heads
        put(img, x, y, pick(ramp, t));
    }
    /** Soft dark at the foot of walls, so rooms read as enclosed. */
    function occlude(img, map, nameAt, isWall, cw, ch, depth = 8, strength = 0.42) {
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C);
            if (isWall(nameAt(map, cx, cy))) continue;
            const lx = x - cx * C, ly = y - cy * C;
            let d = 99;
            if (isWall(nameAt(map, cx - 1, cy))) d = Math.min(d, lx);
            if (isWall(nameAt(map, cx + 1, cy))) d = Math.min(d, C - 1 - lx);
            if (isWall(nameAt(map, cx, cy + 1))) d = Math.min(d, (C - 1 - ly) * 1.6);
            if (d < depth) put(img, x, y, HP.shadow, strength * (1 - d / depth));
        }
    }

    // ---------------------------------------------------------------------
    // Walls: a top seen from above, and a face wherever a floor lies south of the wall.
    // ---------------------------------------------------------------------
    function walls(L, map, nameAt, cw, ch, seed, { isWall, cap, face, capH = 12 }) {
        const img = L.base;
        const W = (x, y) => { const n = nameAt(map, x, y); return n == null || isWall(n); };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            if (!isWall(nameAt(map, x, y))) continue;
            const x0 = x * C, y0 = y * C, hasFace = !W(x, y + 1), h = hasFace ? capH : C;
            cap(img, x0, y0, C, h, seed + x * 3 + y * 7, x, y);
            if (!W(x - 1, y)) { rectFill(img, x0, y0, 2, h, [255, 240, 210], 0.22); rectFill(img, x0 - 3, y0, 3, h, HP.shadow, 0.3); }
            if (!W(x + 1, y)) { rectFill(img, x0 + C - 2, y0, 2, h, [255, 240, 210], 0.16); rectFill(img, x0 + C, y0, 3, h, HP.shadow, 0.3); }
            if (!W(x, y - 1)) rectFill(img, x0, y0, C, 2, [255, 240, 210], 0.22);
            if (!hasFace) continue;
            face(img, x0, y0 + h, C, C - h, seed + x * 11 + y, x, y);
            rectFill(img, x0, y0 + h, C, 1, [255, 255, 255], 0.12);
            for (let i = 0; i < C; i++) for (let j = 0; j < 6; j++) put(img, x0 + i, y0 + C + j, HP.shadow, 0.4 * (1 - j / 6));
        }
    }
    const stoneCap = (ramp) => (img, x, y, w, h, s) => { masonry(img, x, y, w, h, s, ramp); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(img, x + i, y + j, HP.shadow, 0.62); };
    const stoneFace = (ramp) => (img, x, y, w, h, s) => {
        masonry(img, x, y, w, h, s, ramp);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            if (vnoise((x + i) / 4, (y + j) / 3, s + 9) > 0.74) put(img, x + i, y + j, HP.moss[1], 0.55);   // damp and moss
            if (j > h - 6) put(img, x + i, y + j, HP.shadow, 0.08 * (j - h + 6));
        }
    };

    // ---------------------------------------------------------------------
    // Painting helpers and props
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
    function slab(img, x, y, w, h, ramp, seed, { v = 0.2, tex = 0.4 } = {}) {
        const s = shape(); box(s, img, x, y, w, h, v); fill(img, s, ramp, { tex, seed, scale: 1.5, outline: ramp[0] }); return s;
    }
    function rubble(L, cx, cy, seed, ramp = HP.cellarWall) {
        const img = L.base, x0 = cx * C, y0 = cy * C;
        shadow(img, x0 + 18, y0 + 24, 16, 6, 0.45);
        for (let k = 0; k < 9; k++) {
            const bx = x0 + 5 + hash(k, cx, seed) * 22, by = y0 + 10 + hash(k, cy, seed + 1) * 16, rx = 3 + hash(k, cx + cy, seed + 2) * 5;
            const s = shape();
            poly(s, img, [[bx - rx, by + rx * 0.5], [bx - rx * 0.6, by - rx * 0.7], [bx + rx * 0.5, by - rx * 0.8], [bx + rx, by + rx * 0.3], [bx + rx * 0.2, by + rx * 0.7]],
                (px, py) => ((px - bx) / rx) * -0.5 + ((py - by) / rx) * -0.7);
            fill(img, s, ramp.slice(1).concat([PAL.stone[5]]), { tex: 0.5, seed: seed + k, outline: ramp[0] });
        }
        if (hash(cx, cy, seed + 3) < 0.6) { const b = shape(); thick(b, img, x0 + 3, y0 + 9, x0 + 27, y0 + 16, 2); fill(img, b, HP.timber.concat([HP.oak[3]]), { tex: 0.5, seed, outline: HP.timber[0] }); }
        for (let k = 0; k < 14; k++) put(img, x0 + 4 + hash(k, 9, seed + cx) * 24, y0 + 20 + hash(k, 10, seed + cy) * 10, PAL.stone[3 + (k % 3)]);
    }
    /** A shelf unit against the wall above it: uprights, three boards and what sits on them. */
    function shelf(L, cx, cy, seed, goods) {
        const img = L.base, x0 = cx * C + 2, top = cy * C - 18, w = C - 4, bot = cy * C + 26;
        shadow(img, x0 + w / 2 + 2, bot, w / 2 + 2, 3, 0.45);
        rectFill(img, x0, top, w, bot - top, HP.timber[1]);
        slab(img, x0, top, 3, bot - top, HP.oak, seed); slab(img, x0 + w - 3, top, 3, bot - top, HP.oak, seed + 1);
        const rows = [top + 12, top + 26, top + 40];
        for (let r = 0; r < rows.length; r++) {
            const ry = rows[r];
            rectFill(img, x0 + 3, ry, w - 6, 2, HP.oak[5]); rectFill(img, x0 + 3, ry + 2, w - 6, 1, HP.oak[1]);
            for (let i = 0, px = x0 + 4; px < x0 + w - 5; i++) {
                const h = hash(i, r, seed + cx);
                if (goods === 'books') {
                    const bw = 2 + Math.floor(h * 2), bh = 8 + Math.floor(hash(i, r + 5, seed) * 3), c = HP.book[Math.floor(hash(i, r + 9, seed) * HP.book.length)];
                    // Turned to the wall: you see the pale page edges, not the spines.
                    rectFill(img, px, ry - bh, bw, bh, [c[0] * 0.5 + 70, c[1] * 0.5 + 64, c[2] * 0.5 + 52]);
                    rectFill(img, px, ry - bh, 1, bh, c);
                    px += bw + (h < 0.1 ? 2 : 0);
                } else if (goods === 'jars') {
                    if (h < 0.25) { px += 3; continue; }
                    const jr = shape(); box(jr, img, px, ry - 8, 5, 8, 0); fill(img, jr, HP.jar, { outline: HP.jar[0] });
                    rectFill(img, px + 1, ry - 4, 3, 3, [20, 16, 12]);                           // the black film inside
                    rectFill(img, px, ry - 9, 5, 1, HP.linen[1]);
                    px += 7;
                } else if (goods === 'plates') {
                    const pl = shape(); ellipse(pl, img, px + 4, ry - 5, 4, 5); fill(img, pl, HP.linen, { outline: HP.timber[0] });
                    put(img, px + 4, ry - 5, HP.linen[1]);
                    px += 9;
                } else {                                                                           // tools: hooks with one pair of shears, hung upside down
                    if (r === 0) { put(img, px + 2, ry - 10, HP.iron[4]); put(img, px + 2, ry - 9, HP.iron[3]); if (i === 1) { const sh = shape(); thick(sh, img, px, ry - 9, px + 3, ry + 2, 0.8); thick(sh, img, px + 5, ry - 9, px + 2, ry + 2, 0.8); fill(img, sh, HP.iron, { outline: HP.iron[0] }); rectFill(img, px - 1, ry - 11, 3, 2, HP.cloth[3]); rectFill(img, px + 4, ry - 11, 3, 2, HP.cloth[3]); } px += 8; }
                    else { if (h < 0.5) slab(img, px, ry - 6, 6, 6, HP.board, seed + i); px += 9; }
                }
            }
        }
        rectFill(img, x0, top, w, 2, HP.oak[6]);
    }
    function bedroll(L, cx, cy, seed) {
        const img = L.base, x = cx * C + 3, y = cy * C + 6;
        shadow(img, x + 14, y + 22, 15, 5, 0.4);
        const s = shape(); box(s, img, x, y + 4, 26, 18, 0); fill(img, s, HP.straw.slice(0, 3), { tex: 0.6, seed, scale: 1, outline: HP.timber[0] });
        const bl = shape(); poly(bl, img, [[x + 2, y + 9], [x + 25, y + 7], [x + 26, y + 21], [x + 3, y + 22]], (px, py) => (py - y - 14) * -0.06);
        fill(img, bl, HP.blanket, { tex: 0.4, seed: seed + 1, outline: HP.timber[0] });
        for (let i = 0; i < 22; i++) put(img, x + 3 + i, y + 12 + Math.round(Math.sin(i / 3) * 1.2), HP.blanket[0]);    // a fold
        const roll = shape(); ellipse(roll, img, x + 6, y + 6, 6, 4); fill(img, roll, HP.linen.slice(0, 4), { outline: HP.timber[0] });
    }
    function feathers(img, x, y, seed, n = 26) {
        for (let k = 0; k < n; k++) {
            const fx = x + (hash(k, 1, seed) - 0.5) * 30, fy = y + (hash(k, 2, seed) - 0.5) * 16, a = hash(k, 3, seed) * Math.PI, l = 3 + hash(k, 4, seed) * 4;
            for (let j = 0; j < l; j++) put(img, fx + Math.cos(a) * j, fy + Math.sin(a) * j * 0.6, HP.feather[j < 1 ? 3 : 1 + (j % 2)]);
            put(img, fx + Math.cos(a) * l, fy + Math.sin(a) * l * 0.6, [60, 60, 72]);
        }
    }
    function lightShaft(L, x, y, w, len, a = 0.12) {
        for (let j = 0; j < len; j++) {
            const spread = w / 2 + j * 0.25;
            for (let i = -spread; i <= spread; i++) put(L.over, x + i + j * 0.18, y + j, HP.light, a * (1 - Math.abs(i) / (spread + 1)) * (0.4 + 0.6 * j / len));
        }
    }
    /** Wooden steps climbing north out of an alcove. */
    function stairsUp(img, cx, cy, seed) {
        const x0 = cx * C, y0 = cy * C;
        for (let k = 0; k < 5; k++) {
            const sy = y0 + k * 6, t = 0.75 - k * 0.12;
            for (let j = 0; j < 6; j++) for (let i = 2; i < C - 2; i++) put(img, x0 + i, sy + j, j === 0 ? pick(HP.oak, t + 0.15) : j > 3 ? HP.shadow : pick(HP.oak, t - (vnoise(i / 6, k, seed) - 0.5) * 0.2));
        }
        rectFill(img, x0 + 1, y0, 2, C, HP.timber[2]); rectFill(img, x0 + C - 3, y0, 2, C, HP.timber[1]);
        for (let j = 0; j < 8; j++) for (let i = 2; i < C - 2; i++) put(img, x0 + i, y0 + j, [0, 0, 0], 0.35 * (1 - j / 8));
    }
    /** Steps going down into the dark, against the west wall. */
    function stairsDown(img, cx, cy, seed) {
        const x0 = cx * C, y0 = cy * C;
        rectFill(img, x0 + 2, y0 + 2, C - 4, C - 4, [6, 5, 5]);
        for (let k = 0; k < 4; k++) {
            const sx = x0 + C - 4 - (k + 1) * 6;
            for (let j = 3; j < C - 3; j++) for (let i = 0; i < 5; i++) put(img, sx + i, y0 + j, pick(HP.oak, 0.6 - k * 0.15 + (i === 4 ? 0.12 : 0) - (vnoise(j / 5, k, seed) - 0.5) * 0.15));
        }
        rectFill(img, x0 + 2, y0 + 1, C - 4, 2, HP.oak[5]); rectFill(img, x0 + 2, y0 + C - 3, C - 4, 2, HP.oak[2]);
    }
    /** A strapped chest (or a closed seed crate) seen from the front. */
    function chest(L, cx, cy, seed, straps = true) {
        const img = L.base, x = cx * C + 4, gy = cy * C + 27;
        shadow(img, x + 13, gy, 14, 4, 0.45);
        slab(img, x, gy - 14, 24, 14, HP.oak, seed, { v: -0.1 });
        const lid = shape(); poly(lid, img, [[x, gy - 14], [x + 24, gy - 14], [x + 22, gy - 21], [x + 2, gy - 21]], 0.6); fill(img, lid, HP.oak.slice(2), { tex: 0.4, seed: seed + 1, outline: HP.oak[0] });
        if (straps) for (const sx of [x + 5, x + 17]) { rectFill(img, sx, gy - 21, 3, 21, [44, 30, 18]); put(img, sx + 1, gy - 9, HP.iron[4]); }
        rectFill(img, x + 10, gy - 14, 4, 4, HP.iron[3]); put(img, x + 11, gy - 12, HP.iron[0]);
    }

    // ---------------------------------------------------------------------
    // The Cellar
    // ---------------------------------------------------------------------
    function cellar(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) }, seed = 311;
        const isWall = (n) => STONE_WALL.has(n);
        for (let y = 0; y < L.base.h; y++) for (let x = 0; x < L.base.w; x++) {
            if (fieldstones(L.base, x, y, seed, HP.flag, 14) === 'joint' && vnoise(x / 5, y / 5, seed + 5) > 0.66) put(L.base, x, y, pick(HP.moss, vnoise(x, y, seed + 6)));
        }
        // A dark seep of damp across the floor.
        for (let y = 0; y < L.base.h; y++) for (let x = 0; x < L.base.w; x++) if (fbm(x / 26, y / 26, seed + 9) > 0.62) put(L.base, x, y, HP.water[2], 0.35);
        occlude(L.base, map, nameAt, isWall, cw, ch);
        walls(L, map, nameAt, cw, ch, seed, { isWall, cap: stoneCap(HP.cellarWall), face: stoneFace(HP.cellarWall) });
        const img = L.base;
        // The tallies on the inner wall, the half-scratched-out inscription on the west wall.
        for (let r = 0; r < 3; r++) for (let k = 0; k < (r === 2 ? 4 : 9); k++) rectFill(img, 5 * C + 4 + k * 3, 2 * C + 14 + r * 5, 1, 4, [110, 104, 96]);
        rectFill(img, 5 * C + 4 + 4 * 3, 2 * C + 24, 1, 2, [110, 104, 96]);
        for (let k = 0; k < 12; k++) rectFill(img, 4 + (k % 2) * 3, 4 * C + 4 + k * 2, 3 + (k % 3), 1, k % 4 === 1 ? [30, 28, 30] : [96, 92, 88]);
        { const cr = shape(); thick(cr, img, 6, 4 * C + 2, 12, 4 * C + 26, 0.7); fill(img, cr, [[8, 8, 10]], { edge: false }); }
        const items = [], seen = new Set();
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 27;
            const P = {
                barrel: () => { barrel(L, cx - 4, gy, seed + x); if (hash(x, y, seed) < 0.5) barrel(L, cx + 7, gy + 2, seed + y); },
                crate: () => { crate(L, cx, gy, seed + x * 3 + y, hash(x, y, seed) < 0.5 ? 1 : -1); if (hash(y, x, seed) < 0.45) crate(L, cx + 2, gy - 12, seed + x + 9, 0); },
                rubble: () => rubble(L, x, y, seed + x * 5 + y),
                shelf: () => shelf(L, x, y, seed, 'jars'),
                bedroll: () => bedroll(L, x, y, seed),
                stairs_up: () => stairsUp(img, x, y, seed)
            }[n];
            if (P) items.push({ x, y: y + 0.5, draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // The crack in the ceiling: a drift of black feathers under a thin grey light.
        feathers(img, 8 * C + 16, 3 * C + 18, seed);
        lightShaft(L, 8 * C + 12, 0, 6, 3 * C + 22, 0.1);
        // A candle stub by the bedroll.
        const cs = { x: 1 * C + 26, y: 5 * C + 8 };
        rectFill(img, cs.x, cs.y, 3, 5, HP.linen[4]); rectFill(img, cs.x - 1, cs.y + 5, 5, 1, HP.iron[2]);
        return { w: L.base.w, h: L.base.h, base: L.base.data, over: L.over.data, water: [], animate: flames([{ x: cs.x + 1, y: cs.y - 1, small: true }]) };
    }

    // ---------------------------------------------------------------------
    // The House
    // ---------------------------------------------------------------------
    function farmhouse(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) }, seed = 412;
        const isWall = (n) => WOOD_WALL.has(n);
        const img = L.base;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) boards(img, x, y, seed + (y > 7 * C ? 5 : 0));
        // Wear: a paler path of scuffed boards from the front door up the hall and to the hearth.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (fbm(x / 30, y / 30, seed + 3) > 0.6) put(img, x, y, HP.oak[7], 0.08);
        occlude(img, map, nameAt, isWall, cw, ch, 9, 0.45);
        // Walls: a dark beam on top; the face is limewash over a dado of boards, with a post every few cells.
        walls(L, map, nameAt, cw, ch, seed, {
            isWall,
            cap: (im, x, y, w, h, s) => {
                for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(im, x + i, y + j, pick(HP.timber, 0.18 + (vnoise((x + i) / 10, (y + j) * 0.8, s) - 0.5) * 0.3 + (j % 8 === 0 ? -0.15 : 0)));
            },
            face: (im, x, y, w, h, s, cx) => {
                for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
                    const px = x + i, py = y + j;
                    if (j < h - 8) put(im, px, py, pick(HP.plaster, 0.55 + (fbm(px / 6, py / 6, s) - 0.5) * 0.45 + (j < 2 ? -0.25 : 0)));
                    else put(im, px, py, pick(HP.board, 0.5 + (((px >> 2) % 2) ? 0.1 : -0.05) + (j === h - 8 ? 0.3 : 0) - (j > h - 2 ? 0.3 : 0)));
                }
                if (cx % 3 === 0) rectFill(im, x + 13, y, 5, h - 8, HP.timber[3]);
                if (hash(cx, s, 4) < 0.35) for (let k = 0; k < 10; k++) put(im, x + 4 + hash(k, cx, s) * 24, y + 2 + hash(k, cx + 1, s) * (h - 10), HP.plaster[1]);   // flaking limewash
            }
        });
        // Doorways: a worn threshold and the frame posts.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            if (nameAt(map, x, y) !== 'doorway') continue;
            const x0 = x * C, y0 = y * C, vertical = isWall(nameAt(map, x, y - 1)) && isWall(nameAt(map, x, y + 1));
            if (vertical) { rectFill(img, x0 + 10, y0, 12, C, HP.oak[6], 0.5); rectFill(img, x0 + 13, y0 - 6, 6, 6, HP.timber[3]); rectFill(img, x0 + 13, y0 + C, 6, 6, HP.timber[3]); }
            else {
                rectFill(img, x0, y0 + 10, C, 12, PAL.stone[4]); rectFill(img, x0, y0 + 10, C, 1, PAL.stone[6]);
                rectFill(img, x0 - 4, y0 + 2, 5, C - 4, HP.timber[3]); rectFill(img, x0 + C - 1, y0 + 2, 5, C - 4, HP.timber[2]);
                if (y === ch - 1) for (let j = 0; j < 12; j++) for (let i = 0; i < C; i++) put(img, x0 + i, y0 + 20 + j, [190, 196, 200], 0.12 * (j / 12));   // grey daylight from the yard
            }
        }
        const items = [], seen = new Set();
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 27;
            if (['counter', 'fireplace', 'rug', 'bed', 'table'].includes(n)) {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set([n]), seen);
                const draw = { counter: () => counter(L, b, seed), fireplace: () => hearth(L, b, seed, scene), rug: () => rug(img, b, seed), bed: () => bed(L, b, seed), table: () => table(L, b, seed) }[n];
                items.push({ x, y: n === 'rug' ? -1 : b.y1 + 0.6, draw });
                continue;
            }
            const P = {
                shelf: () => shelf(L, x, y, seed + x, y === 1 && x >= 17 ? 'books' : y === 1 ? 'plates' : 'jars'),
                chair: () => chair(L, x, y, seed, nameAt(map, x + 1, y) === 'table' ? 1 : -1),
                armchair: () => armchair(L, x, y, seed),
                crate: () => (x === 2 && y === 9 ? chest(L, x, y, seed) : crate(L, cx, gy, seed + x)),
                stairs_down: () => stairsDown(img, x, y, seed)
            }[n];
            if (P) items.push({ x, y: y + 0.5, draw: P });
        }
        const scene = { flames: [] };
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Herbs drying from the kitchen beam, a window of grey light on the parlour floor.
        for (let k = 0; k < 5; k++) { const hx = 1 * C + 10 + k * 14; for (let j = 0; j < 8; j++) put(img, hx + (j % 2), 2 * C + 2 + j, pick(HP.herb, j / 8)); put(img, hx, 2 * C + 1, HP.straw[2]); }
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: flames(scene.flames) };
    }
    function counter(L, b, seed) {
        const img = L.base, x = b.x0 * C, w = (b.x1 - b.x0 + 1) * C, top = b.y0 * C - 4, gy = b.y1 * C + 28;
        shadow(img, x + w / 2 + 2, gy, w / 2 + 2, 4, 0.45);
        slab(img, x + 1, top + 10, w - 2, gy - top - 10, HP.oak, seed, { v: -0.2 });
        for (let k = 1; k < b.x1 - b.x0 + 1; k++) rectFill(img, x + k * C, top + 12, 1, gy - top - 14, HP.oak[0]);
        for (let k = 0; k <= b.x1 - b.x0; k++) { rectFill(img, x + k * C + 6, top + 16, C - 12, 8, HP.oak[2]); put(img, x + k * C + 15, top + 20, HP.iron[4]); }
        const wt = shape(); box(wt, img, x, top, w, 10, 0.6); fill(img, wt, HP.board.slice(2), { tex: 0.4, seed, outline: HP.oak[0] });
        // On top: a pot, a bowl, a loaf board, a knife.
        const pot = shape(); ellipse(pot, img, x + 12, top + 2, 7, 6); fill(img, pot, HP.iron, { outline: HP.iron[0] }); rectFill(img, x + 7, top - 3, 10, 2, HP.iron[3]);
        const bowl = shape(); ellipse(bowl, img, x + 40, top + 5, 6, 3); fill(img, bowl, HP.linen.slice(1), { outline: HP.timber[0] });
        slab(img, x + 58, top + 2, 18, 6, HP.oak.slice(3), seed + 2);
        rectFill(img, x + 62, top + 4, 8, 1, HP.iron[4]); rectFill(img, x + 70, top + 4, 3, 1, HP.timber[3]);
    }
    function table(L, b, seed) {
        const img = L.base, x = b.x0 * C + 2, w = (b.x1 - b.x0 + 1) * C - 4, y = b.y0 * C + 4, gy = b.y1 * C + 28;
        shadow(img, x + w / 2 + 3, gy, w / 2 + 2, 4, 0.45);
        for (const lx of [x + 2, x + w - 5]) slab(img, lx, y + 14, 3, gy - y - 14, HP.oak, seed);
        const top = shape(); box(top, img, x, y, w, 16, 0.5); fill(img, top, HP.oak.slice(2), { tex: 0.35, seed, outline: HP.oak[0] });
        rectFill(img, x, y + 16, w, 3, HP.oak[1]);
        // Two places: one scraped clean, one never touched under even dust.
        const p1 = shape(); ellipse(p1, img, x + w / 2 - 6, y + 8, 5, 3.5); fill(img, p1, HP.linen.slice(2), { outline: HP.timber[0] });
        const p2 = shape(); ellipse(p2, img, x + w / 2 + 7, y + 8, 5, 3.5); fill(img, p2, HP.linen.slice(0, 3), { outline: HP.timber[0] });
        for (let k = 0; k < 8; k++) put(img, x + w / 2 + 4 + hash(k, 1, seed) * 7, y + 6 + hash(k, 2, seed) * 4, HP.ash[4]);
        rectFill(img, x + w / 2 - 14, y + 6, 1, 5, HP.iron[4]); rectFill(img, x + w / 2 + 14, y + 6, 1, 5, HP.iron[4]);
    }
    function chair(L, cx, cy, seed, dir) {
        const img = L.base, x = cx * C + 10, gy = cy * C + 26;
        shadow(img, x + 7, gy, 8, 3, 0.4);
        slab(img, x, gy - 12, 12, 4, HP.oak.slice(2), seed + cx);
        for (const lx of [x + 1, x + 9]) rectFill(img, lx, gy - 8, 2, 8, HP.oak[2]);
        const bx = dir > 0 ? x : x + 9;
        slab(img, bx, gy - 26, 3, 16, HP.oak, seed);
        rectFill(img, dir > 0 ? x : x + 3, gy - 24, 9, 2, HP.oak[4]); rectFill(img, dir > 0 ? x : x + 3, gy - 19, 9, 2, HP.oak[4]);
    }
    function armchair(L, cx, cy, seed) {
        const img = L.base, x = cx * C + 3, gy = cy * C + 28;
        shadow(img, x + 14, gy, 15, 4, 0.45);
        const back = shape(); ellipse(back, img, x + 13, gy - 22, 12, 9); box(back, img, x + 1, gy - 22, 24, 10); fill(img, back, HP.cloth, { tex: 0.5, seed, outline: HP.cloth[0] });
        const seat = shape(); box(seat, img, x + 3, gy - 14, 20, 12, 0.3); fill(img, seat, HP.cloth.slice(1), { tex: 0.4, seed: seed + 1, outline: HP.cloth[0] });
        for (const ax of [x, x + 21]) { const a = shape(); box(a, img, ax, gy - 18, 6, 15, 0); ellipse(a, img, ax + 3, gy - 18, 3, 3); fill(img, a, HP.cloth, { tex: 0.3, seed, outline: HP.cloth[0] }); }
        rectFill(img, x + 3, gy - 2, 3, 2, HP.oak[1]); rectFill(img, x + 20, gy - 2, 3, 2, HP.oak[1]);
        // A folded shawl on the arm.
        rectFill(img, x + 20, gy - 17, 6, 5, HP.blanket[3]); rectFill(img, x + 20, gy - 13, 6, 1, HP.blanket[1]);
    }
    function rug(img, b, seed) {
        const x0 = b.x0 * C + 4, y0 = b.y0 * C + 4, x1 = (b.x1 + 1) * C - 4, y1 = (b.y1 + 1) * C - 4;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const e = Math.min(x - x0, y - y0, x1 - 1 - x, y1 - 1 - y);
            const u = (x - x0) % 16, v = (y - y0) % 16, diamond = Math.abs(u - 8) + Math.abs(v - 8);
            let c = e < 2 ? HP.cloth[0] : e < 5 ? [150, 110, 48] : e < 7 ? HP.cloth[1] : diamond < 3 ? [180, 140, 60] : diamond < 5 ? [36, 52, 72] : pick(HP.cloth, 0.55 + (vnoise(x / 3, y / 3, seed) - 0.5) * 0.25);
            put(img, x, y, c);
            if (vnoise(x / 7, y / 7, seed + 5) > 0.78) put(img, x, y, HP.shadow, 0.25);     // worn patches
        }
        for (let x = x0; x < x1; x += 2) { put(img, x, y0 - 1, HP.linen[2]); put(img, x, y0 - 2, HP.linen[1]); put(img, x, y1, HP.linen[2]); put(img, x, y1 + 1, HP.linen[1]); }
    }
    function bed(L, b, seed) {
        const img = L.base, x = b.x0 * C + 2, w = (b.x1 - b.x0 + 1) * C - 4, y = b.y0 * C - 2, gy = (b.y1 + 1) * C - 2;
        shadow(img, x + w / 2 + 3, gy, w / 2 + 3, 4, 0.5);
        slab(img, x, y, w, gy - y, HP.oak, seed, { v: -0.2 });
        slab(img, x - 1, y - 6, w + 2, 10, HP.oak.slice(1), seed + 1, { v: 0.4 });                 // headboard
        const pillow = shape(); ellipse(pillow, img, x + w / 2, y + 10, w / 2 - 6, 5); fill(img, pillow, HP.linen.slice(1), { tex: 0.3, seed, outline: HP.timber[0] });
        // The blanket pulled tight, corners tucked.
        const bl = shape(); box(bl, img, x + 3, y + 16, w - 6, gy - y - 22, 0.2); fill(img, bl, HP.blanket, { tex: 0.3, seed: seed + 2, outline: HP.blanket[0] });
        rectFill(img, x + 3, y + 16, w - 6, 3, HP.linen[3]);
        for (let i = x + 6; i < x + w - 6; i += 8) rectFill(img, i, y + 22, 4, gy - y - 30, HP.blanket[4], 0.25);
        rectFill(img, x, gy - 5, w, 3, HP.oak[1]);
    }
    function hearth(L, b, seed, scene) {
        const img = L.base, x = b.x0 * C, w = (b.x1 - b.x0 + 1) * C, top = b.y0 * C - 22, gy = b.y1 * C + 30;
        // Chimney breast of fieldstone, a timber mantel, the opening with banked embers in the ash.
        masonry(img, x - 2, top, w + 4, gy - top, seed + 5, PAL.stone);
        rectFill(img, x - 4, top + 14, w + 8, 5, HP.oak[5]); rectFill(img, x - 4, top + 19, w + 8, 2, HP.oak[1]);
        const ox = x + 16, ow = w - 32, oy = top + 24;
        rectFill(img, ox, oy, ow, gy - oy - 2, [10, 8, 8]);
        for (let j = 0; j < 4; j++) for (let i = 0; i < ow; i++) put(img, ox + i, oy + j, [0, 0, 0], 0.6);
        for (let i = 0; i < ow; i++) for (let j = 0; j < 7; j++) put(img, ox + i, gy - 9 + j, pick(HP.ash, 0.3 + hash(i, j, seed) * 0.6));
        for (let k = 0; k < 3; k++) { const lg = shape(); thick(lg, img, ox + 6 + k * 10, gy - 8, ox + 16 + k * 9, gy - 11, 1.6); fill(img, lg, HP.timber, { outline: [0, 0, 0] }); }
        for (let k = 0; k < 16; k++) put(img, ox + 4 + hash(k, 3, seed) * (ow - 8), gy - 10 + hash(k, 4, seed) * 4, pick(HP.glow, 0.3 + hash(k, 5, seed) * 0.5));
        rectFill(img, x - 2, gy - 3, w + 4, 4, PAL.stone[5]);                                           // the hearthstone
        // Things on the mantel: two candlesticks and a jug.
        for (const cx of [x + 6, x + w - 9]) { rectFill(img, cx, top + 8, 2, 6, HP.linen[4]); rectFill(img, cx - 1, top + 13, 4, 1, HP.iron[3]); scene.flames.push({ x: cx + 1, y: top + 7, small: true }); }
        slab(img, x + w / 2 - 4, top + 6, 8, 8, PAL.stone.slice(3), seed + 9);
        scene.flames.push({ x: ox + ow / 2, y: gy - 10, embers: ow });
    }

    // ---------------------------------------------------------------------
    // The Old Shed
    // ---------------------------------------------------------------------
    function oldShed(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) }, seed = 517;
        const isWall = (n) => WOOD_WALL.has(n);
        const img = L.base;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            boards(img, x, y, seed, HP.board, 8);
            if (fbm(x / 18, y / 18, seed + 2) > 0.66) put(img, x, y, HP.straw[1], 0.12);                // straw trodden into the boards
        }
        for (let k = 0; k < 120; k++) { const sx = hash(k, 1, seed) * img.w, sy = hash(k, 2, seed) * img.h, a = hash(k, 3, seed) * 3; for (let j = 0; j < 4; j++) put(img, sx + Math.cos(a) * j, sy + Math.sin(a) * j, HP.straw[2 + (k % 2)]); }
        occlude(img, map, nameAt, isWall, cw, ch, 9, 0.5);
        walls(L, map, nameAt, cw, ch, seed, {
            isWall,
            cap: (im, x, y, w, h, s) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(im, x + i, y + j, pick(HP.timber, 0.2 + (vnoise((x + i) / 8, (y + j) * 0.7, s) - 0.5) * 0.16 + (((y + j) % 7) === 0 ? -0.15 : 0))); },
            face: (im, x, y, w, h, s) => {
                for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
                    const px = x + i, u = px % 7;
                    put(im, px, y + j, pick(HP.board, u === 0 ? 0.05 : 0.45 + (hash(px / 7 | 0, 0, s) - 0.5) * 0.3 + (vnoise(px / 3, (y + j) / 10, s) - 0.5) * 0.25));
                    if (u === 0 && hash(px, y + j, s) < 0.08) put(im, px, y + j, [150, 150, 140], 0.5);     // light through the gaps
                }
            }
        });
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (nameAt(map, x, y) === 'doorway') {
            const x0 = x * C, y0 = y * C;
            rectFill(img, x0 + 2, y0 + 4, C - 4, C - 6, [120, 124, 116], 0.35);
            rectFill(img, x0 - 3, y0, 4, C, HP.timber[3]); rectFill(img, x0 + C - 1, y0, 4, C, HP.timber[2]);
            const dr = shape(); poly(dr, img, [[x0 + C, y0 + 2], [x0 + C + 10, y0 - 6], [x0 + C + 10, y0 + 18], [x0 + C, y0 + 26]], 0.2); fill(img, dr, HP.board, { tex: 0.4, seed, outline: HP.timber[0] });
        }
        const items = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 27;
            const P = {
                shelf: () => shelf(L, x, y, seed + x, 'tools'),
                crate: () => (y === 1 ? seedCrate(L, x, y, seed) : crate(L, cx, gy, seed + x + y, 1)),
                workbench: () => workbench(L, x, y, seed),
                barrel: () => { barrel(L, cx, gy, seed + x); const w = shape(); ellipse(w, img, cx, gy - 18, 5, 2); fill(img, w, HP.water, { edge: false }); }
            }[n];
            if (P) items.push({ x, y: y + 0.5, draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        for (let j = 0; j < 34; j++) for (let i = -7 - j * 0.25; i < 7 + j * 0.25; i++) put(img, 4 * C + 16 + i, 6 * C - j, HP.light, 0.07 * (1 - j / 34));   // daylight through the door
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [] };
    }
    function seedCrate(L, cx, cy, seed) {
        const img = L.base, x = cx * C + 3, gy = cy * C + 28;
        shadow(img, x + 13, gy, 14, 4, 0.45);
        slab(img, x, gy - 16, 26, 16, HP.board, seed + cx, { v: -0.1 });
        for (const ly of [gy - 11, gy - 5]) rectFill(img, x + 1, ly, 24, 1, HP.board[0]);
        // Open top, packets standing in rows, each with a little label.
        rectFill(img, x + 2, gy - 22, 22, 7, HP.timber[1]);
        for (let k = 0; k < 6; k++) { const c = [[150, 120, 70], [120, 140, 80], [160, 100, 80], [130, 120, 140]][k % 4]; rectFill(img, x + 3 + k * 4, gy - 24 + (k % 2), 3, 8, c); put(img, x + 4 + k * 4, gy - 21 + (k % 2), HP.linen[4]); }
    }
    function workbench(L, cx, cy, seed) {
        const img = L.base, x = cx * C - 6, w = C + 12, y = cy * C + 2, gy = cy * C + 28;
        shadow(img, x + w / 2 + 3, gy, w / 2 + 2, 4, 0.5);
        for (const lx of [x + 2, x + w - 6]) slab(img, lx, y + 10, 4, gy - y - 10, HP.oak, seed);
        rectFill(img, x + 4, gy - 8, w - 8, 2, HP.oak[2]);
        const top = shape(); box(top, img, x, y, w, 12, 0.5); fill(img, top, HP.oak.slice(1), { tex: 0.5, seed, outline: HP.oak[0] });
        // A vice, a mallet, shavings and a folded tarp.
        rectFill(img, x + w - 10, y - 4, 8, 6, HP.iron[2]); rectFill(img, x + w - 8, y - 6, 2, 3, HP.iron[4]);
        const m = shape(); thick(m, img, x + 6, y + 6, x + 16, y + 3, 1); box(m, img, x + 3, y + 2, 5, 5, 0.3); fill(img, m, HP.oak.slice(2), { outline: HP.oak[0] });
        for (let k = 0; k < 10; k++) put(img, x + 18 + hash(k, 1, seed) * 12, y + 3 + hash(k, 2, seed) * 7, HP.straw[3]);
        rectFill(img, x + 6, y + 14, 16, 6, [66, 70, 58]); rectFill(img, x + 6, y + 14, 16, 1, [96, 100, 84]);
    }

    // ---------------------------------------------------------------------
    // The bottom of the well
    // ---------------------------------------------------------------------
    function wellBottom(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) }, seed = 623;
        const isWall = (n) => STONE_WALL.has(n);
        const img = L.base;
        const kind = new Uint8Array(img.w * img.h);
        // Wet silt and stones at the bottom; the seep pool where the tiles say water.
        const wetC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) wetC[y * cw + x] = nameAt(map, x, y) === 'water' ? 1 : 0;
        const wet = SA.kit.field(wetC, cw, ch);
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, n = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            if (n !== 'stone_wall' && wet(x, y) + (fbm(x / 10, y / 10, seed) - 0.5) * 0.35 > 0.5) {
                kind[i] = 3;
                put(img, x, y, pick(HP.water, 0.3 + (fbm(x / 9, y / 5, seed + 1) - 0.5) * 0.5 + (hash(x, y, seed) < 0.01 ? 0.5 : 0)));
                continue;
            }
            const st = vnoise(x / 6, y / 6, seed + 2), t = 0.3 + st * 0.3 + (hash(x, y, seed + 3) - 0.5) * 0.12;
            put(img, x, y, pick(HP.wellStone, t));
            if (st > 0.7) put(img, x, y, pick(HP.wellStone, 0.7 + (vnoise(x / 2, y / 2, seed) - 0.5) * 0.3));
            if (wet(x, y) > 0.2) put(img, x, y, HP.water[1], wet(x, y) * 0.5);
        }
        for (let n = 0; n < 90; n++) {
            const x = hash(n, 1, seed) * img.w, y = hash(n, 2, seed) * img.h, i = Math.floor(y) * img.w + Math.floor(x);
            if (kind[i] === 3) continue;
            const s = shape(); ellipse(s, img, x, y, 2 + hash(n, 3, seed) * 3, 1.5 + hash(n, 4, seed) * 2); fill(img, s, HP.wellStone.slice(2), { tex: 0.4, seed: n, outline: HP.wellStone[0] });
        }
        occlude(img, map, nameAt, isWall, cw, ch, 10, 0.5);
        walls(L, map, nameAt, cw, ch, seed, { isWall, cap: stoneCap(HP.wellStone), face: stoneFace(HP.wellStone) });
        // The shaft is round: the corners sink into the dark.
        const mx = img.w / 2, my = img.h / 2;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const d = Math.hypot((x - mx) / (img.w * 0.5), (y - my) / (img.h * 0.55));
            if (d > 0.78) put(img, x, y, HP.shadow, Math.min(0.85, (d - 0.78) * 2.6));
        }
        // The carved circle on the west wall, open at the top, tallies under it.
        for (let a = 0.35; a < Math.PI * 2 - 0.35; a += 0.05) put(img, 16 + Math.sin(a) * 7, 4 * C + 10 - Math.cos(a) * 7, [120, 130, 128]);
        for (let k = 0; k < 5; k++) rectFill(img, 9 + k * 3, 4 * C + 22, 1, 4, [100, 108, 104]);
        const items = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            const P = { rubble: () => rubble(L, x, y, seed + x * 7, HP.wellStone), rock: () => { const s = shape(); ellipse(s, img, x * C + 16, y * C + 18, 12, 9); fill(img, s, HP.wellStone.slice(1).concat([PAL.stone[4]]), { tex: 0.5, seed, outline: HP.wellStone[0] }); for (const [i, v] of s.px) if (v > 0.3 && vnoise((i % img.w) / 3, ((i / img.w) | 0) / 3, seed) > 0.6) put(img, i % img.w, (i / img.w) | 0, HP.moss[2]); } }[n];
            if (P) items.push({ x, y: y + 0.5, draw: P });
        }
        for (const it of items) it.draw();
        // The rope, hanging in the daylight from the well head far above; the coil it ends in.
        const rx = 4 * C + 16;
        lightShaft(L, rx, 0, 22, 2 * C + 20, 0.14);
        for (let y = 0; y < C + 18; y++) { const sx = rx + Math.round(Math.sin(y / 9) * 1); put(img, sx, y, HP.straw[(y >> 1) % 2 ? 2 : 3]); put(img, sx + 1, y, HP.straw[1]); }
        const coil = shape(); ellipse(coil, img, rx + 2, C + 22, 8, 4); fill(img, coil, HP.straw, { tex: 0.6, seed, scale: 1, outline: HP.timber[0] });
        for (let a = 0; a < 6.28; a += 0.3) put(img, rx + 2 + Math.cos(a) * 4, C + 22 + Math.sin(a) * 2, HP.straw[0]);
        const water = [];
        for (let i = 0; i < kind.length; i += 3) if (kind[i] === 3 && hash(i, 0, seed) < 0.1) water.push(i);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water };
    }

    // ---------------------------------------------------------------------
    // Moving parts: candle flames and banked embers.
    // ---------------------------------------------------------------------
    function flames(list) {
        return (g, time) => {
            for (let k = 0; k < list.length; k++) {
                const f = list[k], a = Math.sin(time / 90 + k * 2.3), b = Math.sin(time / 53 + k);
                if (f.embers) {
                    for (let e = 0; e < 7; e++) {
                        const v = Math.sin(time / (240 + e * 37) + e * 1.9);
                        if (v < 0.1) continue;
                        g.fillStyle = `rgba(255, ${140 + e * 12}, 60, ${(v * 0.7).toFixed(3)})`;
                        g.fillRect(Math.round(f.x - f.embers / 2 + 6 + (e * (f.embers - 12)) / 6), f.y + (e % 3), 2, 1);
                    }
                    if (a > 0.5) { g.fillStyle = 'rgba(255, 190, 90, 0.55)'; g.fillRect(Math.round(f.x + b * 8), f.y - 3, 2, 3); }
                    continue;
                }
                g.fillStyle = 'rgba(255, 226, 140, 0.9)'; g.fillRect(f.x - (a > 0.4 ? 1 : 0), f.y - 2 - (b > 0.3 ? 1 : 0), 2, 3);
                g.fillStyle = `rgba(255, 200, 110, ${(0.18 + 0.08 * a).toFixed(3)})`; g.fillRect(f.x - 3, f.y - 4, 7, 7);
            }
        };
    }

    Object.assign(SA.scenes, { cellar, farmhouse, old_shed: oldShed, well_bottom: wellBottom });
    // The room painters, for the other indoor scenes (ui/scene-featherwatch-roost.js) to share the look.
    SA.roomKit = { HP, pick, tall, slab, walls, stoneCap, stoneFace, fieldstones, occlude, rubble, shelf, bedroll, feathers, lightShaft, flames, chest };
    if (isNode) module.exports = { cellar, farmhouse, old_shed: oldShed, well_bottom: wellBottom };
})(typeof window !== 'undefined' ? window : globalThis);
