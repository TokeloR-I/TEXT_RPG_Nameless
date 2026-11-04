/* =========================================================================
 * Enso's Last Stand — SCENE ART: THE WARDEN'S ROOST (original, drawn by code; Saffron/Quill)
 * Brings the top of Featherwatch up to the painted look of the rest of Chapter One (Tokelo, 2026-11-04):
 *   'warden_sanctuary'  The Warden's Sanctuary: the hall of an old hill prison the Warden has made a roost. Cold
 *                       flagstones strewn with straw and black feathers, moonlight through arrow slits, perches along
 *                       the walls, cages rebuilt from prison bars (a nest and the gray crow with the crooked wing, an
 *                       empty one with clean straw and a full water dish), his table with the log and a candle, a
 *                       barrel of feed, a shelf of splints and seed, his thin bedroll by the cages, a worn crow-circle
 *                       set in the middle of the floor, and the black seal door with its feather-shaped hollow.
 *   'seal_chamber'      The Seal Chamber: a small black room under the seal, basalt slabs with veins of ember light
 *                       running in toward the First Seal, a ring of black stone set into the floor and left open at
 *                       the top, rubble where the vault has cracked.
 *
 * Adds these scenes to ENSO.sceneArt (ui/scene-art.js) and reuses its kit and the homestead room painters
 * (SA.roomKit, ui/scene-homestead-rooms.js, so load this file after that one). The maps' tiles
 * (src/world/chapter1-maps.js) still decide collision, exits and where the Warden, his log and the cages stand.
 * No image goes in: every pixel comes from shapes, noise and the palette below (docs/art/ORIGINAL_ART_PLAN.md §0).
 * Review: `node tools/preview-scene.js sanctuary out.png 1` (also seal_chamber).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (isNode) require('./scene-homestead-rooms.js');
    if (!SA || !SA.roomKit) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, rectFill, shape, ellipse, box, poly, thick, fill, shadow, barrel } = SA.kit;
    const K = SA.roomKit, HP = K.HP, pick = K.pick;

    // Moonlit hill stone, iron bars, straw and crow-black; ember red under the seal.
    const WP = {
        floor: R(['#141619', '#1b1e22', '#23262b', '#2b2f34', '#34383d', '#3e4247', '#494d51', '#55585b']),
        wall: R(['#0f1013', '#16181c', '#1e2125', '#272a2f', '#313439', '#3b3e43', '#46494d']),
        basalt: R(['#080709', '#0e0c0f', '#141216', '#1b181d', '#221e24', '#2a252c', '#332d35']),
        ember: R(['#3a0c06', '#6e180a', '#a8300e', '#d85a1a', '#f6923a', '#ffc878', '#fff0c8']),
        moon: [176, 196, 220],
        crow: [14, 12, 16],
        shadow: [3, 3, 6]
    };
    const STONE = new Set(['stone_wall']);

    // ---------------------------------------------------------------------
    // The Warden's Sanctuary
    // ---------------------------------------------------------------------
    function sanctuary(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, w = cw * C, h = ch * C;
        const L = { base: Img(w, h), over: Img(w, h), scratch: Img(w, h) }, seed = 881, img = L.base;
        const isWall = (n) => STONE.has(n) || n === 'seal_door';
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) K.fieldstones(img, x, y, seed, WP.floor, 16, WP.basalt);
        // A crow-circle of darker stones in the middle of the hall, worn by years of feet.
        const mx = 11 * C, my = 8 * C + 8;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const d = Math.hypot(x - mx, (y - my) * 1.25);
            if (d > 62 && d < 70) put(img, x, y, WP.basalt[3], 0.7);
            else if (d > 56 && d < 60) put(img, x, y, WP.floor[6], 0.35);
        }
        crowMark(img, mx, my, 1.8);
        // Straw spread round the cages, black feathers everywhere.
        for (let n = 0; n < 900; n++) {
            const x = hash(n, 1, seed) * w, y = hash(n, 2, seed) * h, cx = Math.floor(x / C), cy = Math.floor(y / C);
            const nearCage = [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => nameAt(map, cx + dx, cy + dy) === 'cage'));
            if (!nearCage && hash(n, 3, seed) > 0.2) continue;
            const a = hash(n, 4, seed) * Math.PI;
            for (let j = 0; j < 4; j++) put(img, x + Math.cos(a) * j, y + Math.sin(a) * j, HP.straw[1 + (n % 3)]);
        }
        for (let k = 0; k < 9; k++) K.feathers(img, (2 + hash(k, 5, seed) * 18) * C, (2 + hash(k, 6, seed) * 11) * C, seed + k, 10);
        K.occlude(img, map, nameAt, isWall, cw, ch, 10, 0.5);
        K.walls(L, map, nameAt, cw, ch, seed, { isWall: (n) => STONE.has(n), cap: K.stoneCap(WP.wall), face: K.stoneFace(WP.wall) });
        // Arrow slits in the north wall with moonlight falling across the floor; perches along the side walls.
        for (const sx of [4, 7, 15, 18]) {
            const x0 = sx * C + 13, y0 = 1 * C + 14;
            rectFill(img, x0, y0, 5, 14, [6, 8, 12]); rectFill(img, x0 + 1, y0 + 1, 3, 12, [40, 52, 70]);
            for (let j = 0; j < 70; j++) for (let i = -3 - j * 0.15; i < 6 + j * 0.15; i++) put(L.over, x0 + i + j * 0.35, y0 + 18 + j, WP.moon, 0.07 * (1 - j / 70));
        }
        for (const [px, py] of [[1, 4], [1, 11], [20, 11], [20, 2]]) perchBar(img, px * C, py * C, seed + px * 7 + py, px > 10);
        seal(L, map, nameAt, seed);
        const items = [], flames = [];
        // Iron torch brackets on the wall either side of the seal.
        for (const tx of [8 * C + 16, 13 * C + 16]) {
            const ty = 1 * C + 16;
            rectFill(img, tx - 1, ty, 3, 10, HP.iron[3]); rectFill(img, tx - 4, ty - 2, 9, 3, HP.iron[2]);
            const cup = shape(); poly(cup, img, [[tx - 5, ty - 8], [tx + 5, ty - 8], [tx + 3, ty - 2], [tx - 3, ty - 2]], 0); fill(img, cup, HP.iron, { outline: HP.iron[0] });
            for (let yy = ty - 30; yy < ty + 14; yy++) for (let xx = tx - 22; xx < tx + 22; xx++) { const d = Math.hypot(xx - tx, yy - ty + 10); if (d < 22) put(img, xx, yy, HP.glow[3], 0.14 * (1 - d / 22)); }
            rectFill(img, tx - 2, ty - 12, 4, 4, HP.glow[4]);
            flames.push({ x: tx, y: ty - 10, small: true });
        }
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 27;
            const o = (map.interactables || []).find((it) => it.x === x && it.y === y);
            const P = {
                cage: () => prisonCage(L, x, y, seed + x * 5 + y, o ? (/grey/.test(o.id) ? 'grey' : /empty/.test(o.id) ? 'empty' : 'crow') : (hash(x, y, seed) < 0.5 ? 'crow' : 'nest')),
                table: () => logTable(L, x, y, seed, flames),
                barrel: () => { barrel(L, cx, gy, seed + x); for (let k = 0; k < 8; k++) put(img, cx - 4 + hash(k, 1, seed) * 8, gy - 19 + hash(k, 2, seed) * 2, HP.straw[3]); },
                shelf: () => K.shelf(L, x, y, seed + x, 'jars'),
                rug: () => K.bedroll(L, x, y, seed + 3)
            }[n];
            if (P) items.push({ x, y: y + 0.5, draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Night air on the heights: a cold blue wash, warmer round the candle.
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(img, x, y, [90, 110, 150], 0.06);
        return { w, h, base: img.data, over: L.over.data, water: [], animate: K.flames(flames) };
    }
    /** The heroes' crow, laid in dark stones: wings spread, inside a ring left open at the top. */
    function crowMark(img, x, y, s) {
        const pts = [[0, -10], [4, -6], [16, -8], [26, -2], [12, 0], [6, 6], [3, 14], [0, 10], [-3, 14], [-6, 6], [-12, 0], [-26, -2], [-16, -8], [-4, -6]];
        const sh = shape(); poly(sh, img, pts.map(([a, b]) => [x + a * s, y + b * s]), 0);
        for (const [i] of sh.px) put(img, i % img.w, (i / img.w) | 0, WP.basalt[2 + (hash(i, 0, 3) < 0.3 ? 1 : 0)], 0.8);
        for (let a = 0.4; a < Math.PI * 2 - 0.4; a += 0.02) put(img, x + Math.sin(a) * 50, y - Math.cos(a) * 40, WP.basalt[1], 0.85);
    }
    function perchBar(img, x, y, seed, right) {
        const px = right ? x + 4 : x + 22;
        const p = shape(); thick(p, img, px, y + 6, px + (right ? -12 : 12), y + 8, 1.4); fill(img, p, HP.oak, { outline: HP.timber[0] });
        rectFill(img, px - 1, y + 2, 3, 6, HP.iron[2]);
        if (hash(x, y, seed) < 0.7) { const cx = px + (right ? -8 : 4); rectFill(img, cx, y + 1, 5, 4, WP.crow); rectFill(img, cx + (right ? -1 : 3), y - 1, 3, 2, WP.crow); put(img, cx + (right ? -2 : 6), y, [80, 70, 54]); }
        for (let k = 0; k < 6; k++) put(img, px + (right ? -10 : 2) + hash(k, 1, seed) * 10, y + 14 + hash(k, 2, seed) * 10, [190, 186, 176], 0.6);   // droppings below
    }
    /** The seal door: a slab of black stone with no handle and no keyhole, only a feather-shaped hollow, warm to the touch. */
    function seal(L, map, nameAt, seed) {
        const img = L.base;
        let x0 = 99, x1 = -1, y = 0;
        for (let yy = 0; yy < map.tiles.length; yy++) for (let x = 0; x < map.tiles[0].length; x++) if (nameAt(map, x, yy) === 'seal_door') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y = yy; }
        if (x1 < 0) return;
        const X0 = x0 * C - 10, X1 = (x1 + 1) * C + 10, top = (y - 1) * C + 8, B = (y + 1) * C - 1;
        // A frame of dressed stone round a tall black slab under a pointed head.
        const fr = shape(); poly(fr, img, [[X0, B], [X0, top + 24], [(X0 + X1) / 2, top - 4], [X1, top + 24], [X1, B]], (px) => ((px - (X0 + X1) / 2) / (X1 - X0)) * -1.2);
        fill(img, fr, PAL.stone.slice(1), { tex: 0.4, seed, outline: WP.shadow });
        const sx0 = X0 + 9, sx1 = X1 - 9;
        const slab = shape(); poly(slab, img, [[sx0, B], [sx0, top + 28], [(sx0 + sx1) / 2, top + 6], [sx1, top + 28], [sx1, B]], (px, py) => ((px - (sx0 + sx1) / 2) / (sx1 - sx0)) * -0.6 + (vnoise(px / 5, py / 5, seed) - 0.5) * 0.4);
        fill(img, slab, WP.basalt, { tex: 0.25, seed: seed + 1, outline: [0, 0, 0] });
        // Carved feathers round the hollow, and the hollow itself, faintly lit from within.
        const fx = (sx0 + sx1) / 2, fy = top + 40;
        for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.45; for (let j = 14; j < 24; j++) put(img, fx + Math.cos(a) * j, fy + Math.sin(a) * j * 0.9, WP.basalt[5]); }
        const fh = shape(); poly(fh, img, [[fx, fy - 13], [fx + 4, fy - 4], [fx + 3, fy + 8], [fx, fy + 13], [fx - 3, fy + 8], [fx - 4, fy - 4]], 0);
        for (const [i] of fh.px) { const px = i % img.w, py = (i / img.w) | 0; put(img, px, py, pick(WP.ember, 0.25 + (1 - Math.abs(px - fx) / 4) * 0.25)); }
        for (let j = -12; j < 13; j++) put(img, fx, fy + j, WP.ember[1]);
        for (let yy = fy - 22; yy < fy + 22; yy++) for (let xx = fx - 18; xx < fx + 18; xx++) { const d = Math.hypot(xx - fx, yy - fy); if (d < 18) put(img, xx, yy, WP.ember[3], 0.08 * (1 - d / 18)); }
        rectFill(img, X0 - 4, B - 2, X1 - X0 + 8, 3, PAL.stone[4]);
    }
    /** A cage rebuilt from old prison bars, bound with wire and rag; inside a nest, a crow, or clean straw and water. */
    function prisonCage(L, cx, cy, seed, what) {
        const img = L.base, x = cx * C + 2, gy = cy * C + 29, w = 28, top = gy - 34;
        shadow(img, x + w / 2 + 3, gy, w / 2 + 3, 4, 0.5);
        rectFill(img, x, gy - 5, w, 5, HP.oak[2]); rectFill(img, x, gy - 5, w, 1, HP.oak[5]);
        // Inside first.
        rectFill(img, x + 2, gy - 9, w - 4, 4, HP.straw[what === 'empty' ? 3 : 1]);
        if (what === 'empty' || what === 'grey') { const d = shape(); ellipse(d, img, x + w - 8, gy - 8, 4, 2); fill(img, d, PAL.stone.slice(3), { outline: PAL.stone[0] }); rectFill(img, x + w - 10, gy - 9, 4, 1, [80, 110, 130]); }
        if (what !== 'empty') {
            const n = shape(); ellipse(n, img, x + 11, gy - 9, 7, 3.5); fill(img, n, HP.straw, { tex: 0.7, seed, scale: 1, outline: HP.timber[0] });
            const c = what === 'grey' ? [98, 98, 106] : WP.crow;
            rectFill(img, x + 7, gy - 17, 8, 6, c); rectFill(img, x + 12, gy - 20, 5, 4, c); put(img, x + 17, gy - 19, [96, 84, 60]); put(img, x + 14, gy - 19, [210, 200, 120]);
            if (what === 'grey') { rectFill(img, x + 5, gy - 14, 3, 5, [120, 120, 128]); rectFill(img, x + 6, gy - 13, 3, 1, [230, 224, 200]); }   // the crooked, splinted wing
        }
        // The bars, the top hoop, wire binding, a ribbon tying the door open on the gray one.
        for (let i = 0; i <= w; i += 4) { rectFill(img, x + i, top, 1, gy - 5 - top, HP.iron[i < w / 2 ? 4 : 3]); put(img, x + i + 1, top + 2, HP.iron[1]); }
        rectFill(img, x - 1, top - 2, w + 3, 3, HP.iron[3]); rectFill(img, x - 1, top + 14, w + 3, 1, HP.iron[2]);
        for (let k = 0; k < 4; k++) put(img, x + 3 + k * 7, top + 14, [150, 120, 70]);
        if (what === 'grey') { rectFill(img, x + w - 1, top + 6, 3, 4, [200, 40, 50]); put(img, x + w + 2, top + 10, [200, 40, 50]); }
        const roof = shape(); ellipse(roof, img, x + w / 2, top - 3, w / 2 + 1, 4); fill(img, roof, HP.iron, { outline: HP.iron[0] });
    }
    function logTable(L, cx, cy, seed, flames) {
        const img = L.base, x = cx * C - 4, w = C + 8, y = cy * C + 4, gy = cy * C + 28;
        shadow(img, x + w / 2 + 3, gy, w / 2 + 2, 4, 0.5);
        for (const lx of [x + 3, x + w - 6]) K.slab(img, lx, y + 12, 3, gy - y - 12, HP.oak, seed);
        const top = shape(); box(top, img, x, y, w, 14, 0.5); fill(img, top, HP.oak.slice(1), { tex: 0.5, seed, outline: HP.oak[0] });
        // The log open on it, a quill, splints and a feather, a candle.
        rectFill(img, x + 8, y + 3, 16, 9, HP.linen[3]); rectFill(img, x + 16, y + 3, 1, 9, HP.linen[1]);
        for (let k = 0; k < 4; k++) { rectFill(img, x + 9, y + 5 + k * 2, 6, 1, HP.linen[0]); rectFill(img, x + 18, y + 5 + k * 2, 5, 1, HP.linen[0]); }
        for (let j = 0; j < 7; j++) put(img, x + 25 + j * 0.6, y + 10 - j, j < 2 ? [30, 30, 30] : [210, 206, 190]);
        for (let k = 0; k < 3; k++) rectFill(img, x + 2 + k * 2, y + 4, 1, 8, HP.straw[3]);
        rectFill(img, x + w - 8, y - 4, 3, 7, HP.linen[4]); rectFill(img, x + w - 9, y + 3, 5, 1, HP.iron[3]);
        flames.push({ x: x + w - 7, y: y - 5, small: true });
    }

    // ---------------------------------------------------------------------
    // The Seal Chamber
    // ---------------------------------------------------------------------
    function sealChamber(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, w = cw * C, h = ch * C;
        const L = { base: Img(w, h), over: Img(w, h), scratch: Img(w, h) }, seed = 919, img = L.base;
        let sx = 5, sy = 2;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (nameAt(map, x, y) === 'seal_door') { sx = x; sy = y; }
        const cx = sx * C + 16, cy = sy * C + 16;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) K.fieldstones(img, x, y, seed, WP.basalt, 18, [[4, 3, 4], [8, 5, 6], [12, 7, 7], [16, 8, 8]]);
        // Veins of ember light running in through the joints toward the seal.
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const d = Math.hypot(x - cx, (y - cy) * 1.1), a = Math.atan2(y - cy, x - cx);
            const vein = Math.abs(Math.sin(a * 7 + fbm(x / 20, y / 20, seed) * 3)) < 0.05 + 0.04 * (1 - Math.min(1, d / 160));
            if (vein && d > 24 && d < 150) put(img, x, y, pick(WP.ember, 0.55 - d / 400), 0.75 * (1 - d / 160));
            if (d < 70) put(img, x, y, WP.ember[2], 0.12 * (1 - d / 70));
        }
        K.occlude(img, map, nameAt, (n) => STONE.has(n), cw, ch, 10, 0.55);
        K.walls(L, map, nameAt, cw, ch, seed, { isWall: (n) => STONE.has(n), cap: K.stoneCap(WP.basalt), face: (im, x, y, ww, hh, s) => { K.stoneFace(WP.wall)(im, x, y, ww, hh, s); for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) if (vnoise((x + i) / 3, (y + j) / 6, s + 3) > 0.84) put(im, x + i, y + j, WP.ember[2], 0.5); } });
        // The First Seal: a broad ring of black stone in the floor, open at the top, glowing in its cracks.
        for (let y = cy - 30; y < cy + 30; y++) for (let x = cx - 34; x < cx + 34; x++) {
            const d = Math.hypot(x - cx, (y - cy) * 1.15), a = Math.atan2(x - cx, -(y - cy));
            if (d > 28) continue;
            if (Math.abs(a) < 0.42 && d > 14) continue;                 // the gap at the top
            if (d > 15) {
                let t = 0.4 + (vnoise(x / 3, y / 3, seed + 4) - 0.5) * 0.4 + ((x - cx) * -0.6 + (y - cy) * -0.8) / 60;
                if (d > 26.5) t = 0.05; else if (d < 16.5) t = 0.1;
                put(img, x, y, pick(WP.basalt, t));
                if (Math.abs(Math.sin(a * 5)) < 0.06 && d > 17 && d < 26) put(img, x, y, WP.ember[4]);
            } else put(img, x, y, pick(WP.ember, 0.2 + (1 - d / 15) * 0.5 + (vnoise(x / 2, y / 2, seed) - 0.5) * 0.2), 0.85);
        }
        for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + 0.6 + (k / 7) * (Math.PI * 2 - 1.2); for (let j = 0; j < 3; j++) put(img, cx + Math.cos(a) * (21 + j * 0.3) + j, cy + Math.sin(a) * (19 + j), WP.ember[5]); }
        const items = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (nameAt(map, x, y) === 'rubble') items.push(() => K.rubble(L, x, y, seed + x * 3 + y, WP.basalt));
        for (const it of items) it();
        // The door out (south): a cold strip of the sanctuary's light.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (y === ch - 1 && nameAt(map, x, y) === 'stone_floor') for (let j = 0; j < C; j++) for (let i = 4; i < C - 4; i++) put(img, x * C + i, y * C + j, WP.moon, 0.1 * (j / C));
        const embers = [];
        for (let k = 0; k < 6; k++) embers.push({ x: cx - 12 + hash(k, 1, seed) * 24, y: cy - 2 + hash(k, 2, seed) * 8, embers: 18 });
        return { w, h, base: img.data, over: L.over.data, water: [], animate: K.flames(embers) };
    }

    Object.assign(SA.scenes, { warden_sanctuary: sanctuary, seal_chamber: sealChamber });
    if (isNode) module.exports = { warden_sanctuary: sanctuary, seal_chamber: sealChamber };
})(typeof window !== 'undefined' ? window : globalThis);
