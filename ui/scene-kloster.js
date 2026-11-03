/* =========================================================================
 * Enso's Last Stand — SCENE ART: BRIARWELL KLOSTER (original, drawn by code; Saffron/Quill)
 * Paints the Kloster above Shamefield whole, after Tokelo's reference (2026-11-03, "Kloster Sankt Alban"): a walled
 * German monastery seen from above. The abbey church fills the north side, with its rose window over the door and
 * a bell tower (Glockenturm) beside it. The cloister garth (Kreuzgang) lies below the church: an arcaded walk round
 * hedged rose beds, cypresses and a fountain with a cross. The monks' cells (Konvent) run down the west side; the
 * refectory and the abbot's house stand either side of the path from the gatehouse; the cemetery (Friedhof) sits
 * behind a low wall in the north-east, the herb garden and hop poles below it, then the brewery and workshop, the
 * storehouse and the woodpile. Round towers with pointed roofs stand on the corners of the curtain wall, and a
 * gatehouse with a cross and two banners opens to the road down to the village, past a field and a scarecrow.
 *
 * Adds the 'kloster' scene to ENSO.sceneArt (ui/scene-art.js) and reuses its painting kit. The map's tiles (legend in
 * src/world/chapter1-maps.js) still decide collision, exits and where each thing stands; the scene paints what the
 * tiles say is there. No image goes in: every pixel comes from shapes, noise and the palette below
 * (docs/art/ORIGINAL_ART_PLAN.md §0). Review: `node tools/preview-scene.js briarwell_cloister_court out.png 1`.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (!SA) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, rectFill, shape, ellipse, box, poly, thick, fill, shadow,
        field, tree, deadTree, barrel, crate, cart, scarecrow, blockOf, masonry } = SA.kit;

    // The Kloster palette: an overcast late afternoon. Dark olive grass, warm grey stone, grey-brown flagstones,
    // red-brown clay roof tiles, dark timber, box-hedge green, white roses, herbs, and warm light in every window.
    const KP = {
        grass: R(['#181f11', '#1f2814', '#273118', '#2f3a1c', '#384520', '#435025', '#4f5c2a']),
        dirt: R(['#251c15', '#30251b', '#3b2e21', '#473828', '#53422f', '#604d37']),
        flag: R(['#2b2926', '#36332f', '#423d38', '#4e4842', '#5a534b', '#675f55', '#756c60']),
        stone: R(['#1d1b1b', '#282625', '#33302e', '#3f3b38', '#4b4642', '#58524c', '#665f57', '#756c63']),
        tile: R(['#1c0c08', '#2a120c', '#3a1911', '#4b2116', '#5c2a1b', '#6d3321', '#7f3d27', '#91492e']),
        plank: R(['#120c08', '#1b130d', '#251a12', '#302218', '#3c2b1e', '#493525', '#56402d']),
        plaster: R(['#4a4339', '#5b5346', '#6c6353', '#7d7461', '#8d8470']),
        glow: R(['#4d220c', '#8f4515', '#d07c26', '#f6b44c', '#ffe08f']),
        rose: R(['#3a1a08', '#7a3a0e', '#c2661a', '#f09a2e', '#ffd36a', '#fff1b8']),
        moss: R(['#1d2412', '#283117', '#333e1c', '#3f4b21']),
        leaf: R(['#0f170c', '#152010', '#1c2a14', '#243518', '#2d421c', '#385021', '#445f27', '#516e2e']),
        hedge: R(['#0c140b', '#111c0f', '#172513', '#1e3017', '#263c1b', '#30491f', '#3b5724']),
        soil: R(['#170f0a', '#20160e', '#2a1d13', '#352518']),
        water: R(['#0d1a22', '#12242e', '#19303c', '#21404e', '#2e5465', '#46708a']),
        cloth: R(['#2c0a0a', '#4a100f', '#681814', '#86221a', '#a02f22']),
        bronze: R(['#2a1c0c', '#4a3315', '#6e4d1f', '#93692b', '#b8883c']),
        copper: R(['#2e140a', '#5a2a12', '#86441c', '#b0622a', '#d4884a']),
        herbs: [R(['#14220f', '#1e3214', '#2a451a', '#3a5c22', '#4f752c']), R(['#221a2e', '#382a4a', '#544070', '#715a96', '#9178b4']),
            R(['#2a3128', '#3d473a', '#56614f', '#727c68', '#909a84']), R(['#1d2a12', '#2e4218', '#425c1f', '#c8b040', '#efe08a'])],
        flowers: [[226, 222, 206], [238, 236, 226], [214, 160, 170], [196, 70, 70]],
        crop: R(['#1f2a12', '#2b3a16', '#384b1b', '#465c20', '#566e26', '#6a812e']),
        shadow: [5, 6, 9]
    };
    const pick = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))];

    // ---------------------------------------------------------------------
    // Ground: grass, earth, flagstones and bed soil.
    // ---------------------------------------------------------------------
    const PAVED = new Set(['flagstones', 'gate', 'cloister_fountain', 'cypress', 'arcade']);
    const DIRTY = { dirt_path: 1, woodpile: 0.6, cart: 0.5, barrel: 0.5, crate: 0.5, bench: 0.55, storehouse: 0.4, brewery: 0.4 };
    const SOIL = new Set(['hedge_bed', 'herb_bed', 'crops', 'scarecrow', 'grave', 'hop_trellis']);

    /** Voronoi stones for paving: which stone a pixel is on, how far it is from the joint, and its lit edge. */
    function stones(x, y, seed, size = 10) {
        const gx = Math.floor(x / size), gy = Math.floor(y / (size * 0.8));
        let f1 = 1e9, f2 = 1e9, id = 0, cx1 = 0, cy1 = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const cx = (gx + i + 0.15 + hash(gx + i, gy + j, seed) * 0.7) * size, cy = (gy + j + 0.15 + hash(gx + i, gy + j, seed + 1) * 0.7) * size * 0.8;
            const d = Math.hypot(x - cx, (y - cy) * 1.15);
            if (d < f1) { f2 = f1; f1 = d; id = (gx + i) * 7919 + (gy + j); cx1 = cx; cy1 = cy; } else if (d < f2) f2 = d;
        }
        return { id, f1: f1 / size * 10, edge: f2 - f1, lit: (x - cx1) * -0.6 + (y - cy1) * -0.8 > size * 0.22 };
    }

    function ground(img, map, nameAt, cw, ch, seed) {
        const dirtC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) dirtC[y * cw + x] = DIRTY[nameAt(map, x, y)] || 0;
        const dirt = field(dirtC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);                 // 0 grass, 1 earth, 2 flagstones, 5 soil
        const paved = (cx, cy) => {
            const n = nameAt(map, cx, cy);
            if (n === 'lantern') return [nameAt(map, cx - 1, cy), nameAt(map, cx + 1, cy)].some((m) => PAVED.has(m));
            return PAVED.has(n);
        };
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cx = Math.floor(x / C), cy = Math.floor(y / C), cell = nameAt(map, cx, cy);
            if (paved(cx, cy)) { kind[i] = 2; continue; }
            if (SOIL.has(cell)) { kind[i] = cell === 'grave' ? 0 : 5; continue; }
            const d = dirt(x, y) + (fbm(x / 18, y / 18, seed + 1) - 0.5) * 0.42 + (vnoise(x / 5, y / 5, seed + 2) - 0.5) * 0.1;
            kind[i] = d > 0.5 ? 1 : 0;
        }
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 0) {
                const big = fbm(x / 30, y / 30, seed + 3), mid = vnoise(x / 4, y / 4, seed + 4), fine = hash(x, y, seed + 5);
                let t = big * 0.45 + mid * 0.38 + fine * 0.2;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 1 || kind[i + r] === 1 || kind[i - r * img.w] === 1 || kind[i + r * img.w] === 1) { t -= 0.26 / r; break; }
                put(img, x, y, pick(KP.grass, t));
            } else if (k === 1) {
                let t = fbm(x / 10, y / 10, seed + 7) * 0.55 + hash(x, y, seed + 8) * 0.35 + 0.08;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 0 || kind[i + r] === 0 || kind[i - r * img.w] === 0 || kind[i + r * img.w] === 0) t -= 0.13;
                put(img, x, y, pick(KP.dirt, t));
            } else if (k === 2) {                                  // flagstones: irregular worn stones set in mortar
                const v = stones(x, y, seed + 9);
                let t = 0.42 + (hash(v.id, 0, seed + 10) - 0.5) * 0.34 - v.f1 * 0.03 + (vnoise(x / 3, y / 3, seed + 11) - 0.5) * 0.12;
                if (v.edge < 1.1) t = 0.04; else if (v.edge < 2.1) t -= 0.14;
                else if (v.lit) t += 0.12;
                put(img, x, y, pick(KP.flag, t));
                if (v.edge < 1.1 && vnoise(x / 3, y / 3, seed + 12) > 0.66) put(img, x, y, KP.moss[2]);
            } else {                                               // soil
                put(img, x, y, pick(KP.soil, fbm(x / 6, y / 6, seed + 12) * 0.7 + hash(x, y, seed) * 0.3));
            }
        }
        // Where flagstones meet grass, a dark edge and a kerb line.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] === 2 && (kind[i - 1] !== 2 || kind[i + 1] !== 2 || kind[i - img.w] !== 2 || kind[i + img.w] !== 2)) put(img, x, y, KP.stone[5]);
            else if (kind[i] !== 2 && (kind[i - 1] === 2 || kind[i + 1] === 2 || kind[i - img.w] === 2)) put(img, x, y, KP.shadow, 0.35);
        }
        return kind;
    }

    function details(img, kind, seed) {
        const N = (img.w * img.h) / 32;
        for (let n = 0; n < N; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 && r < 0.72) {                             // a tuft
                const h = 2 + Math.floor(hash(n, 10, seed) * 4);
                for (let b = -1; b <= 1; b++) for (let j = 0; j < h - Math.abs(b); j++) put(img, x + b, y - j, j === h - 1 - Math.abs(b) ? KP.grass[6] : KP.grass[4]);
            } else if (k === 0 && r < 0.8) {                       // a little white flower
                put(img, x, y, KP.flowers[0]); put(img, x, y + 1, KP.grass[2]);
            } else if (k === 1 && r < 0.4) {
                put(img, x, y, KP.stone[5]); put(img, x + 1, y, KP.stone[4]); put(img, x, y + 1, KP.dirt[1]);
            } else if (k === 2 && r < 0.08) {                      // a weed in a joint
                put(img, x, y, KP.moss[3]); put(img, x + 1, y - 1, KP.grass[5]);
            }
        }
    }

    // ---------------------------------------------------------------------
    // Shared helpers
    // ---------------------------------------------------------------------
    /** Paint into the scratch layer, then move what was drawn onto the base, with anything above `split` on the
     *  over layer when someone can stand behind it (`overhead`). `onlyOver(x, y)` narrows what may go over. */
    function tall(L, box4, split, overhead, draw, onlyOver = null) {
        const S = L.scratch;
        draw(S);
        const [x0, y0, x1, y1] = box4.map((v) => Math.round(v));
        for (let y = Math.max(0, y0); y < Math.min(S.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(S.w, x1); x++) {
            const i = (y * S.w + x) * 4, a = S.data[i + 3];
            if (!a) continue;
            const up = overhead && y < split && (!onlyOver || onlyOver(x, y));
            put(up ? L.over : L.base, x, y, [S.data[i], S.data[i + 1], S.data[i + 2]], a / 255);
            S.data[i] = S.data[i + 1] = S.data[i + 2] = S.data[i + 3] = 0;
        }
    }
    /** Clay roof tiles over a polygon. `vertical` runs the courses up and down (a roof seen along its ridge). */
    function roofTiles(img, pts, seed, { vertical = false, tone = 0, moss = 0.8 } = {}) {
        const area = shape(); poly(area, img, pts, 0);
        for (const [i] of area.px) {
            const x = i % img.w, y = (i / img.w) | 0, a = vertical ? x : y, b = vertical ? y : x;
            const course = Math.floor(a / 6), v = a % 6, sh = (course % 2) * 4, col = Math.floor((b + sh) / 8), u = (b + sh) % 8;
            let t = 0.48 + tone + (hash(col, course, seed) - 0.5) * 0.26 + Math.sin(((u + 0.5) / 8) * Math.PI) * 0.2;
            if (v === 5) t = 0.06; else if (v === 0) t += 0.1;
            if (u === 0) t -= 0.14;
            if (hash(col, course, seed + 3) < 0.025) t -= 0.25;
            put(img, x, y, pick(KP.tile, t));
            if (fbm(x / 9, y / 7, seed + 4) > moss && hash(x, y, seed) < 0.7) put(img, x, y, pick(KP.moss, vnoise(x / 2, y / 2, seed) * 0.95));
        }
        return area;
    }
    function stoneWall(img, x, y, w, h, seed) { masonry(img, x, y, w, h, seed, KP.stone); }
    function litWindow(img, x, y, w, h, seed, { arched = true, glass = KP.glow } = {}) {
        for (let j = -4; j < h + 4; j++) for (let i = -4; i < w + 4; i++) put(img, x + i, y + j, glass[2], 0.1);
        const inside = (i, j) => { if (!arched || j >= w / 2) return i >= 0 && i < w && j >= 0 && j < h; const ax = i - (w - 1) / 2, ay = j - w / 2; return ax * ax + ay * ay <= (w / 2) ** 2 && i >= 0 && i < w; };
        for (let j = -2; j < h + 2; j++) for (let i = -2; i < w + 2; i++) {
            if (inside(i, j)) put(img, x + i, y + j, pick(glass, 0.98 - Math.hypot((i - w / 2) / w, (j - h * 0.6) / h) * 1.5 + (hash(i, j, seed) - 0.5) * 0.15));
            else if ([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].some(([dx, dy]) => inside(i + dx, j + dy))) put(img, x + i, y + j, KP.stone[6]);
        }
        rectFill(img, x + Math.floor(w / 2), y + 2, 1, h - 2, KP.plank[1]);
        rectFill(img, x, y + Math.floor(h * 0.55), w, 1, KP.plank[1]);
        rectFill(img, x - 2, y + h + 1, w + 4, 2, KP.stone[6]);
    }
    /** A pointed (Gothic) window of warm glass with a mullion. */
    function lancet(img, x, y, w, h, seed) {
        for (let j = -4; j < h + 4; j++) for (let i = -5; i < w + 5; i++) put(img, x + i, y + j, KP.rose[3], 0.08);
        for (let j = -2; j < h + 1; j++) for (let i = -2; i < w + 2; i++) {
            const ax = i - (w - 1) / 2, top = Math.abs(ax) * 1.5;
            if (j < top - 2) continue;
            const edge = j < top || i < 0 || i >= w || j >= h;
            put(img, x + i, y + j, edge ? KP.stone[6] : pick(KP.rose, 0.92 - Math.abs(ax) / w - (j / h) * 0.3 + (hash(i, j, seed) - 0.5) * 0.15));
        }
        for (let j = Math.ceil(w * 0.8); j < h; j++) put(img, x + Math.floor(w / 2), y + j, KP.stone[1]);
        for (let i = 0; i < w; i++) put(img, x + i, y + Math.floor(h * 0.62), KP.stone[1]);
    }
    function door(img, x, y, w, h, seed, { arched = true } = {}) {
        for (let j = -4; j < h; j++) for (let i = -4; i < w + 4; i++) {
            const ax = i - w / 2 + 0.5, ay = j - w / 2, r2 = ax * ax + ay * ay;
            if (arched && ay < 0 && r2 > ((w / 2) + 4) ** 2) continue;
            if (!arched && j < -3) continue;
            const inside = i >= 0 && i < w && (!arched || ay >= 0 || r2 <= (w / 2) ** 2) && j >= 0;
            if (inside) put(img, x + i, y + j, pick(KP.plank, 0.3 + hash(Math.floor(i / 5), 0, seed) * 0.3 + (i % 5 === 0 ? -0.2 : 0)));
            else put(img, x + i, y + j, pick(KP.stone, 0.62 + (hash(Math.floor(Math.atan2(ay, ax) * 4), 0, seed) - 0.5) * 0.3));
        }
        rectFill(img, x, y + Math.round(h * 0.35), w, 1, PAL.iron[1]); rectFill(img, x, y + h - 7, w, 1, PAL.iron[1]);
        put(img, x + w - 4, y + h / 2 + 2, PAL.iron[4]);
        const st = shape(); box(st, img, x - 4, y + h, w + 8, 3, 0.3); fill(img, st, KP.stone.slice(2), { tex: 0.4, seed, outline: KP.stone[0] });
    }
    function chimney(img, x, top, h, seed, scene) {
        stoneWall(img, x, top, 12, h, seed);
        rectFill(img, x - 2, top - 3, 16, 4, KP.stone[6]); rectFill(img, x - 2, top + 1, 16, 1, KP.stone[1]);
        rectFill(img, x + 3, top - 3, 6, 2, [8, 7, 8]);
        scene.smoke.push({ x: x + 6, y: top - 4 });
    }
    function cross(img, cx, top, h, seed, ramp = KP.stone) {
        const s = shape(); box(s, img, cx - 1.5, top, 3, h, 0.2); box(s, img, cx - h * 0.32, top + h * 0.28, h * 0.64, 3, 0.4);
        fill(img, s, ramp.slice(2), { tex: 0.3, seed, outline: ramp[0] });
    }
    function pinnacle(img, cx, gy, h, seed) {
        const s = shape(); box(s, img, cx - 3, gy - h, 6, h, 0); poly(s, img, [[cx - 4, gy - h], [cx + 4, gy - h], [cx, gy - h - 12]], 0.3);
        for (const [i] of s.px) s.px.set(i, (((i % img.w) - cx) / 4) * -0.7);
        fill(img, s, KP.stone.slice(1), { tex: 0.3, seed, outline: KP.stone[0] });
        put(img, cx, gy - h - 13, KP.stone[7]);
    }
    function eaveLine(img, x0, x1, y, seed, ramp = KP.tile) {
        for (let x = x0; x < x1; x++) {
            const d = 1 + Math.floor(hash(x >> 2, y, seed) * 2);
            for (let j = 0; j < d; j++) put(img, x, y + j, j === d - 1 ? [10, 6, 5] : ramp[2]);
            put(img, x, y + d, KP.shadow, 0.5); put(img, x, y + d + 1, KP.shadow, 0.3);
        }
    }
    function timberFrame(img, x, y, w, h, seed) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(img, x + i, y + j, pick(KP.plaster, 0.45 + (vnoise((x + i) / 4, (y + j) / 4, seed) - 0.5) * 0.35));
        const beam = (ax, ay, bx, by) => { const s = shape(); thick(s, img, ax, ay, bx, by, 1.4); fill(img, s, KP.plank.slice(1), { outline: KP.plank[0] }); };
        beam(x, y + 1, x + w, y + 1); beam(x, y + h - 2, x + w, y + h - 2); beam(x, y + Math.round(h / 2), x + w, y + Math.round(h / 2));
        const n = Math.max(2, Math.round(w / 22));
        for (let k = 0; k <= n; k++) { const px = Math.round(x + (k / n) * (w - 1)); beam(px, y, px, y + h - 1); }
        for (let k = 0; k < n; k++) if (hash(k, x, seed) < 0.6) { const px = x + (k / n) * w, pw = w / n; beam(px + 2, y + h / 2 - 1, px + pw - 2, y + 3); }
    }

    // ---------------------------------------------------------------------
    // The walls
    // ---------------------------------------------------------------------
    const WALLISH = new Set(['kloster_wall', 'wall_tower', 'gatehouse', 'gate']);
    function curtain(L, map, nameAt, x, y, seed) {
        const img = L.base, x0 = x * C, y0 = y * C;
        const vert = WALLISH.has(nameAt(map, x, y - 1)) || WALLISH.has(nameAt(map, x, y + 1));
        if (vert) {                                                // seen from above: the wall walk and two parapets
            const l = x0 + 4, w = 24;
            shadow(img, l + w + 3, y0 + 16, 4, 16, 0.4);
            stoneWall(img, l, y0, w, C, seed + y);
            for (let j = 0; j < C; j++) for (let i = 5; i < w - 5; i++) put(img, l + i, y0 + j, pick(KP.flag, 0.42 + (hash(i >> 2, (y0 + j) >> 2, seed) - 0.5) * 0.3));
            for (const px of [l, l + w - 5]) for (let j = 0; j < C; j += 8) {
                const s = shape(); box(s, img, px, y0 + j, 5, 6, px === l ? 0.4 : -0.2); fill(img, s, KP.stone.slice(2), { tex: 0.4, seed: seed + j, outline: KP.stone[0] });
            }
            return;
        }
        // Seen from the front: crenellations along the top, a stone face, moss at the foot.
        const top = y0 - 4, faceTop = y0 + 6, B = y0 + C;
        const l = WALLISH.has(nameAt(map, x - 1, y)) || nameAt(map, x - 1, y) === 'bell_tower' || nameAt(map, x - 1, y) === 'abbey_church' ? x0 : x0 + 2;
        const r = WALLISH.has(nameAt(map, x + 1, y)) || nameAt(map, x + 1, y) === 'bell_tower' || nameAt(map, x + 1, y) === 'abbey_church' ? x0 + C : x0 + C - 2;
        for (let i = l; i < r; i++) for (let j = top + 4; j < faceTop; j++) put(img, i, j, pick(KP.flag, 0.55 + (hash(i >> 2, j >> 1, seed) - 0.5) * 0.25));
        for (let i = l; i < r; i += 8) { const s = shape(); box(s, img, i, top - 2, 5, 7, 0.4); fill(img, s, KP.stone.slice(2), { tex: 0.4, seed: seed + i, outline: KP.stone[0] }); }
        stoneWall(img, l, faceTop, r - l, B - faceTop, seed + x * 7 + y);
        for (let i = l; i < r; i++) { put(img, i, faceTop, KP.stone[7]); put(img, i, B, KP.shadow, 0.5); }
        for (let i = l; i < r; i++) if (vnoise(i / 4, B / 4, seed + 3) > 0.5) for (let j = 0; j < 3 + hash(i, 1, seed) * 4; j++) put(img, i, B - 1 - j, pick(KP.moss, hash(i, j, seed)));
    }
    /** A round corner tower: a stone drum, an arrow slit and a pointed roof of tiles. */
    function tower(L, x, y, seed) {
        const img = L.base, cx = x * C + 16, B = y * C + C + 4, r = 20, bodyTop = B - 46;
        shadow(img, cx + 8, B, r + 4, 6, 0.5);
        const body = shape(); box(body, img, cx - r, bodyTop, r * 2, B - bodyTop, 0); ellipse(body, img, cx, B, r, 5);
        const tmp = Img(r * 2, B - bodyTop + 6); masonry(tmp, 0, 0, r * 2, B - bodyTop + 6, seed, KP.stone);
        for (const [i] of body.px) {
            const px = i % img.w, py = (i / img.w) | 0, u = (px - (cx - r)) / (r * 2), k = ((Math.min(tmp.h - 1, py - bodyTop)) * tmp.w + Math.max(0, Math.min(tmp.w - 1, px - (cx - r)))) * 4;
            const sh = Math.cos(u * Math.PI) * 0.5 - 0.15;            // round: lit on the left
            const c = [tmp.data[k], tmp.data[k + 1], tmp.data[k + 2]].map((v) => Math.max(0, Math.min(255, v * (1 + sh * 0.6))));
            put(img, px, py, c);
        }
        rectFill(img, cx - 2, bodyTop + 16, 4, 12, [10, 8, 8]); put(img, cx - 2, bodyTop + 16, KP.stone[6]);
        for (let i = -r; i <= r; i++) put(img, cx + i, bodyTop, KP.stone[6]);
        const roofH = 38, roof = [[cx - r - 4, bodyTop + 2], [cx + r + 4, bodyTop + 2], [cx, bodyTop - roofH]];
        roofTiles(img, roof, seed + 1, { vertical: true, moss: 0.85 });
        const sh2 = shape(); poly(sh2, img, [[cx, bodyTop - roofH], [cx + r + 4, bodyTop + 2], [cx, bodyTop + 2]], 0);
        for (const [i] of sh2.px) put(img, i % img.w, (i / img.w) | 0, KP.shadow, 0.3);
        for (let i = -r - 4; i <= r + 4; i++) { put(img, cx + i, bodyTop + 2, [10, 6, 5]); put(img, cx + i, bodyTop + 3, KP.shadow, 0.5); }
        rectFill(img, cx - 1, bodyTop - roofH - 6, 2, 7, PAL.iron[3]);
    }
    function lowWall(L, map, nameAt, x, y, seed) {
        const img = L.base, x0 = x * C, y0 = y * C, is = (dx, dy) => nameAt(map, x + dx, y + dy) === 'low_wall';
        const vert = (is(0, -1) || is(0, 1)) && !is(-1, 0) && !is(1, 0);
        if (vert) {
            stoneWall(img, x0 + 10, y0, 12, C, seed + y);
            for (let j = 0; j < C; j++) { put(img, x0 + 10, y0 + j, KP.stone[6]); put(img, x0 + 22, y0 + j, KP.shadow, 0.5); }
            return;
        }
        const l = is(-1, 0) ? x0 : x0 + 8, r = is(1, 0) ? x0 + C : x0 + 24, gy = y0 + 26;
        stoneWall(img, l, gy - 14, r - l, 14, seed + x);
        rectFill(img, l, gy - 16, r - l, 3, KP.stone[6]); rectFill(img, l, gy - 13, r - l, 1, KP.stone[2]);
        for (let i = l; i < r; i++) put(img, i, gy, KP.shadow, 0.45);
        if (!is(-1, 0)) { const s = shape(); box(s, img, l - 2, gy - 20, 7, 20, 0.2); fill(img, s, KP.stone.slice(2), { tex: 0.4, seed, outline: KP.stone[0] }); }
        if (!is(1, 0)) { const s = shape(); box(s, img, r - 5, gy - 20, 7, 20, -0.2); fill(img, s, KP.stone.slice(2), { tex: 0.4, seed, outline: KP.stone[0] }); }
    }

    // ---------------------------------------------------------------------
    // The church and the bell tower
    // ---------------------------------------------------------------------
    /** The abbey church: a long nave under red tiles with buttresses, pinnacles and tall lit lancets, and a transept
     *  front facing the cloister: a gable with a rose window over the great door, a cross on top. */
    function church(L, b, seed, scene) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C, cx = Math.round((X0 + X1) / 2);
        const sideB = B - 22, wallTop = sideB - 92;
        shadow(img, cx + 10, B + 2, (X1 - X0) / 2 + 6, 8, 0.5);
        // The far (north) transept's roof, peeking over the nave.
        roofTiles(img, [[cx - 46, Y0 + 30], [cx + 46, Y0 + 30], [cx, Y0 - 22]], seed + 9, { vertical: true, tone: -0.12 });
        cross(img, cx, Y0 - 44, 22, seed);
        // Nave walls and roof.
        stoneWall(img, X0 + 6, wallTop, X1 - X0 - 12, sideB - wallTop, seed);
        roofTiles(img, [[X0 - 2, wallTop + 6], [X1 + 2, wallTop + 6], [X1 - 14, Y0 + 18], [X0 + 14, Y0 + 18]], seed + 1, { tone: 0.02 });
        const ridge = shape(); box(ridge, img, X0 + 14, Y0 + 15, X1 - X0 - 28, 4, 0.4); fill(img, ridge, KP.tile.slice(2), { tex: 0.3, seed, outline: [10, 6, 5] });
        eaveLine(img, X0 - 2, X1 + 2, wallTop + 6, seed);
        for (const ex of [X0 + 14, X1 - 15]) { cross(img, ex, Y0 - 4, 18, seed + ex); }
        // Buttresses with pinnacles between tall lancets along both aisles.
        const bays = [X0 + 10, X0 + 46, X0 + 82, X1 - 116, X1 - 80, X1 - 44].filter((bx) => bx < cx - 60 || bx > cx + 52);
        for (const bx of bays) {
            const s = shape(); box(s, img, bx, wallTop + 4, 10, sideB - wallTop - 4, 0); poly(s, img, [[bx - 2, sideB], [bx + 12, sideB], [bx + 10, sideB - 30], [bx, sideB - 30]], 0);
            for (const [i] of s.px) s.px.set(i, (((i % img.w) - bx - 5) / 5) * -0.7);
            fill(img, s, KP.stone.slice(1), { tex: 0.4, seed: seed + bx, outline: KP.stone[0] });
            pinnacle(img, bx + 5, wallTop + 4, 12, seed + bx);
        }
        for (let k = 0; k + 1 < bays.length; k++) {
            const a = bays[k] + 10, z = bays[k + 1];
            if (z - a < 18 || z - a > 60) continue;
            lancet(img, Math.round((a + z) / 2) - 6, wallTop + 26, 12, 46, seed + k);
            scene.windows.push({ x: (a + z) / 2, y: wallTop + 50 });
        }
        // The transept front: verges, a gable of stone, buttresses and the corner pinnacles.
        const gw = 116, gx0 = cx - gw / 2, apex = wallTop - 58, gbase = wallTop + 4;
        roofTiles(img, [[gx0 - 8, gbase + 6], [cx, apex - 8], [cx, gbase + 6]], seed + 3, { vertical: true, tone: 0.08 });
        roofTiles(img, [[cx, apex - 8], [gx0 + gw + 8, gbase + 6], [cx, gbase + 6]], seed + 4, { vertical: true, tone: -0.16 });
        const front = Img(gw, B - apex); masonry(front, 0, 0, gw, B - apex, seed + 5, KP.stone);
        for (let j = 0; j < B - apex; j++) for (let i = 0; i < gw; i++) {
            const rise = gbase - apex;
            if (j < rise && Math.abs(i - gw / 2) > (j / rise) * (gw / 2)) continue;
            const k = (j * gw + i) * 4; put(img, gx0 + i, apex + j, [front.data[k] + 10, front.data[k + 1] + 9, front.data[k + 2] + 8]);
        }
        for (const side of [-1, 1]) {
            const v = shape(); thick(v, img, cx, apex - 4, cx + side * (gw / 2 + 4), gbase, 2.4, side < 0 ? 0.4 : -0.3); fill(img, v, KP.stone.slice(2), { tex: 0.4, seed, outline: KP.stone[0] });
            const bx = side < 0 ? gx0 - 8 : gx0 + gw - 2;
            const bt = shape(); box(bt, img, bx, gbase - 6, 10, B - gbase + 6, side < 0 ? 0.3 : -0.3); fill(img, bt, KP.stone.slice(1), { tex: 0.5, seed: seed + side, scale: 2, outline: KP.stone[0] });
            pinnacle(img, bx + 5, gbase - 6, 16, seed + side * 3);
        }
        cross(img, cx, apex - 30, 26, seed + 7);
        // The rose window: a wheel of warm glass with stone tracery.
        const ry = apex + 74, rr = 21;
        for (let j = -rr - 8; j <= rr + 8; j++) for (let i = -rr - 8; i <= rr + 8; i++) { const d = Math.hypot(i, j); if (d < rr + 8) put(img, cx + i, ry + j, KP.rose[3], 0.1 * (1 - d / (rr + 8))); }
        for (let j = -rr - 3; j <= rr + 3; j++) for (let i = -rr - 3; i <= rr + 3; i++) {
            const d = Math.hypot(i, j), a = Math.atan2(j, i);
            if (d > rr + 3) continue;
            if (d > rr) { put(img, cx + i, ry + j, KP.stone[d > rr + 2 ? 2 : 6]); continue; }
            const spoke = Math.abs(((a / (Math.PI * 2)) * 12 + 12) % 1 - 0.5) > 0.44 && d > 5;
            const ring = Math.abs(d - rr * 0.55) < 1 || d < 4;
            if (spoke || ring) put(img, cx + i, ry + j, d < 4 ? KP.stone[6] : KP.stone[4]);
            else put(img, cx + i, ry + j, pick(KP.rose, 0.95 - d / (rr * 1.6) + (hash(Math.floor(a * 6), Math.floor(d / 5), seed) - 0.5) * 0.25));
        }
        // Two lancets either side of the door, the great door under a pointed arch, steps and torches.
        lancet(img, gx0 + 14, ry + 6, 10, 30, seed + 11); lancet(img, gx0 + gw - 24, ry + 6, 10, 30, seed + 12);
        const dw = 30, dh = 40, dx = cx - dw / 2, dy = B - dh - 8;
        for (let j = -14; j < dh; j++) for (let i = -7; i < dw + 7; i++) {
            const ax = Math.abs(i - (dw - 1) / 2), arch = j < 0 ? 0 : 0, pt = (ax / (dw / 2 + 7)) ** 2 * 16 - 14;
            void arch;
            if (j < pt) continue;
            const inside = i >= 0 && i < dw && j >= pt + 6;
            if (inside) put(img, dx + i, dy + j, pick(KP.plank, 0.3 + hash(Math.floor(i / 5), 0, seed) * 0.3 + (i % 5 === 0 ? -0.2 : 0)));
            else put(img, dx + i, dy + j, pick(KP.stone, 0.55 + ((j - pt) < 3 ? 0.25 : 0) + (hash(i >> 2, j >> 2, seed) - 0.5) * 0.2));
        }
        rectFill(img, cx, dy - 6, 1, dh + 6, KP.plank[0]);
        for (const hx of [cx - 5, cx + 4]) { put(img, hx, dy + dh / 2, PAL.iron[4]); put(img, hx, dy + dh / 2 + 1, PAL.iron[2]); }
        for (let s = 0; s < 3; s++) { const st = shape(); box(st, img, dx - 8 - s * 4, B - 8 + s * 3, dw + 16 + s * 8, 3, 0.3 - s * 0.1); fill(img, st, KP.stone.slice(2), { tex: 0.4, seed: seed + s, outline: KP.stone[0] }); }
        for (const tx of [dx - 12, dx + dw + 12]) torchOn(img, tx, dy + 14, seed + tx, scene);
        // Moss on the stones.
        for (let n = 0; n < 220; n++) { const x = X0 + hash(n, 1, seed) * (X1 - X0), y = wallTop + hash(n, 2, seed) * (sideB - wallTop); if (vnoise(x / 6, y / 6, seed) > 0.62) put(img, x, y, KP.moss[2 + (n % 2)]); }
        scene.windows.push({ x: cx, y: ry, red: true });
    }
    /** An iron bracket torch fixed to a wall. */
    function torchOn(img, x, y, seed, scene) {
        for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const d = Math.hypot(i, j); if (d < 12) put(img, x + i, y - 6 + j, KP.glow[3], (1 - d / 12) * 0.22); }
        rectFill(img, x - 1, y, 3, 8, PAL.iron[2]); rectFill(img, x - 3, y - 2, 7, 3, PAL.iron[3]);
        const f = shape(); ellipse(f, img, x, y - 6, 2.6, 4.2); fill(img, f, KP.glow.slice(1), { edge: false });
        scene.flames.push({ x, y: y - 6 });
    }
    /** The bell tower: a tall square tower with a lit slit, the open belfry with its bronze bell, a pointed roof. */
    function bellTower(L, b, seed, scene) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C, cx = Math.round((X0 + X1) / 2);
        const tw = 70, tx = cx - tw / 2, top = Y0 + 34;
        shadow(img, cx + 10, B + 2, tw / 2 + 8, 7, 0.5);
        stoneWall(img, tx, top, tw, B - top, seed);
        for (let y = top; y < B; y++) { put(img, tx - 1, y, KP.stone[0]); put(img, tx + tw, y, KP.stone[0]); for (let k = 0; k < 8; k++) put(img, tx + tw - 1 - k, y, KP.shadow, 0.3 - k * 0.03); }
        for (const yy of [top + 66, B - 70]) rectFill(img, tx - 3, yy, tw + 6, 4, KP.stone[6]);   // string courses
        // The belfry: a pointed opening, the bell, louvres.
        const bw = 30, bh = 38, by = top + 18;
        for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
            const ax = Math.abs(i - (bw - 1) / 2), pt = (ax / (bw / 2)) ** 2 * 14;
            if (j < 14 - (14 - pt)) { if (j < pt) continue; }
            put(img, cx - bw / 2 + i, by + j, [10, 9, 12]);
        }
        const bell = shape(); poly(bell, img, [[cx - 6, by + 14], [cx + 6, by + 14], [cx + 9, by + 28], [cx + 12, by + 31], [cx - 12, by + 31], [cx - 9, by + 28]], (px) => ((px - cx) / 12) * -0.85);
        fill(img, bell, KP.bronze, { outline: KP.bronze[0] });
        rectFill(img, cx - 1, by + 9, 2, 5, KP.bronze[1]); rectFill(img, cx - 14, by + 8, 28, 2, KP.plank[3]);
        rectFill(img, cx - bw / 2 - 3, by + bh, bw + 6, 3, KP.stone[6]);
        for (let j = 0; j < bh; j++) { put(img, cx - bw / 2 - 1, by + j, KP.stone[6]); put(img, cx + bw / 2, by + j, KP.stone[2]); }
        // A lit slit window and the door.
        lancet(img, cx - 4, top + 84, 8, 22, seed + 2);
        door(img, cx - 10, B - 34, 20, 30, seed + 3);
        // The roof: a steep pyramid of tiles, a cross on top.
        const eave = top + 2;
        roofTiles(img, [[tx - 8, eave], [cx, top - 70], [cx, eave]], seed + 4, { vertical: true, tone: 0.06 });
        roofTiles(img, [[cx, top - 70], [tx + tw + 8, eave], [cx, eave]], seed + 5, { vertical: true, tone: -0.18 });
        eaveLine(img, tx - 8, tx + tw + 8, eave, seed);
        cross(img, cx, top - 96, 28, seed + 6);
        scene.windows.push({ x: cx, y: top + 95 });
    }

    // ---------------------------------------------------------------------
    // The ranges: cells, refectory, abbot's house, brewery, storehouse
    // ---------------------------------------------------------------------
    /** A range seen along its ridge (a long building running north to south): two roof slopes and the gable end. */
    function rangeNS(L, b, seed, scene, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C, cx = Math.round((X0 + X1) / 2), W = X1 - X0;
        tall(L, [X0 - 20, Y0 - 30, X1 + 20, B + 12], Y0, overhead, (S) => {
            const wallTop = B - 62, apex = wallTop - 52;
            shadow(S, cx + 10, B + 2, W / 2 + 10, 8, 0.5);
            // A sliver of the long east wall, in shade, under the right eave.
            stoneWall(S, X1 - 10, Y0 + 4, 8, wallTop - Y0, seed + 9);
            for (let y = Y0 + 4; y < wallTop; y++) for (let k = 0; k < 8; k++) put(S, X1 - 10 + k, y, KP.shadow, 0.35);
            roofTiles(S, [[X0 - 6, Y0 - 4], [cx, Y0 - 12], [cx, apex], [X0 - 6, wallTop + 6]], seed + 1, { vertical: true, tone: 0.06 });
            roofTiles(S, [[cx, Y0 - 12], [X1 + 2, Y0 - 4], [X1 + 2, wallTop + 2], [cx, apex]], seed + 2, { vertical: true, tone: -0.18 });
            const ridge = shape(); box(ridge, S, cx - 2, Y0 - 12, 5, apex - Y0 + 12, 0.3); fill(S, ridge, KP.tile.slice(2), { tex: 0.3, seed, outline: [10, 6, 5] });
            // Little dormers with lit windows down the lit slope, a chimney on the ridge.
            for (let k = 0, n = Math.max(2, Math.floor((apex - Y0) / 60)); k < n; k++) {
                const dy = Y0 + 20 + k * ((apex - Y0 - 30) / Math.max(1, n - 1)), dx = X0 + W * 0.22;
                const d = shape(); box(d, S, dx - 8, dy, 16, 14, 0.1); fill(S, d, KP.plaster, { tex: 0.3, seed: seed + k, outline: KP.plank[0] });
                roofTiles(S, [[dx - 11, dy + 2], [dx, dy - 8], [dx + 11, dy + 2]], seed + 20 + k, { tone: 0.1 });
                litWindow(S, dx - 4, dy + 3, 8, 9, seed + k, { arched: false });
                scene.windows.push({ x: dx, y: dy + 8 });
            }
            chimney(S, cx - 6, Y0 + 40, 18, seed + 3, scene);
            // The gable end: stone wall and triangle, windows, the door.
            const tmp = Img(W, B - apex); masonry(tmp, 0, 0, W, B - apex, seed + 4, KP.stone);
            for (let j = 0; j < B - apex; j++) for (let i = 2; i < W - 2; i++) {
                const rise = wallTop - apex;
                if (j < rise && Math.abs(i - W / 2) > (j / rise) * (W / 2)) continue;
                const k = (j * W + i) * 4; put(S, X0 + i, apex + j, [tmp.data[k] + 8, tmp.data[k + 1] + 7, tmp.data[k + 2] + 6]);
            }
            for (const side of [-1, 1]) { const v = shape(); thick(v, S, cx, apex - 3, cx + side * (W / 2 + 4), wallTop + 4, 2.2, side < 0 ? 0.4 : -0.3); fill(S, v, KP.tile.slice(1), { tex: 0.3, seed, outline: [10, 6, 5] }); }
            litWindow(S, cx - 5, apex + 22, 10, 12, seed + 5);
            const slots = [X0 + W * 0.2, X0 + W * 0.8];
            for (const wx of slots) { litWindow(S, Math.round(wx) - 6, wallTop + 12, 12, 18, seed + wx); scene.windows.push({ x: wx, y: wallTop + 20 }); }
            door(S, cx - 10, B - 36, 20, 32, seed + 6);
            for (let n = 0; n < 120; n++) { const x = X0 + hash(n, 1, seed) * W, y = wallTop + hash(n, 2, seed) * 60; if (vnoise(x / 6, y / 6, seed) > 0.64) put(S, x, y, KP.moss[2 + (n % 2)]); }
        });
    }
    /** A range seen from the front: walls of stone (or a timber frame over a stone ground floor), a hipped tile roof,
     *  lit windows, a door, chimneys; options for a gabled front, an open brewing bay and a barn door. */
    function rangeEW(L, b, seed, scene, overhead, opt = {}) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C, W = X1 - X0, H = B - Y0, cx = Math.round((X0 + X1) / 2);
        tall(L, [X0 - 24, Y0 - 50, X1 + 24, B + 12], Y0, overhead, (S) => {
            const wallH = opt.wallH || Math.max(40, Math.round(H * 0.55)), wallTop = B - wallH, eave = wallTop + 4, roofTop = Y0 - 8;
            shadow(S, cx + 10, B + 2, W / 2 + 10, 8, 0.5);
            if (opt.timber) { stoneWall(S, X0 + 2, B - 22, W - 4, 22, seed); timberFrame(S, X0 + 2, wallTop, W - 4, wallH - 22, seed + 1); }
            else stoneWall(S, X0 + 2, wallTop, W - 4, wallH, seed);
            for (let y = wallTop; y < B; y++) { put(S, X0 + 1, y, KP.stone[0]); put(S, X1 - 2, y, KP.stone[0]); }
            // Openings along the front.
            const used = [];
            if (opt.bay) {                                     // the brewing bay: open timber posts, a copper kettle, its fire
                const bx0 = X0 + W * opt.bay[0], bx1 = X0 + W * opt.bay[1], by = wallTop + 6;
                for (let y = by; y < B - 2; y++) for (let x = bx0; x < bx1; x++) put(S, x, y, pick(R(['#0d0907', '#160f0b', '#1f150f']), hash(x >> 2, y >> 2, seed) * 0.7 + (y - by) / (B - by) * 0.3));
                for (let j = -18; j <= 18; j++) for (let i = -24; i <= 24; i++) { const d = Math.hypot(i / 1.3, j); if (d < 18) put(S, bx0 + 24 + i, B - 12 + j, KP.glow[3], (1 - d / 18) * 0.35); }
                const fire = shape(); ellipse(fire, S, bx0 + 24, B - 8, 9, 4); fill(S, fire, KP.glow.slice(1), { edge: false });
                const k = shape(); ellipse(k, S, bx0 + 24, B - 22, 14, 12); box(k, S, bx0 + 10, B - 34, 28, 10, 0.3);
                for (const [i] of k.px) k.px.set(i, (((i % S.w) - bx0 - 24) / 14) * -0.8 + 0.1);
                fill(S, k, KP.copper, { outline: [20, 10, 6] });
                rectFill(S, bx0 + 9, B - 35, 30, 2, KP.copper[4]);
                scene.flames.push({ x: bx0 + 24, y: B - 10, big: true });
                for (let n = 0; n < 3; n++) barrel({ base: S }, bx0 + 54 + n * 15, B - 2, seed + n);
                for (let x = bx0; x < bx1; x += Math.max(18, Math.round((bx1 - bx0) / 3))) { const p = shape(); box(p, S, x, wallTop, 5, B - wallTop, 0); fill(S, p, KP.plank.slice(1), { tex: 0.4, seed: seed + x, outline: KP.plank[0] }); }
                used.push([bx0, bx1]);
            }
            if (opt.barn) {                                    // the storehouse: a wide barn door, one leaf ajar
                const dw = 44, dh = Math.min(42, wallH - 8), dx = cx - dw / 2 - 10;
                rectFill(S, dx - 4, B - dh - 6, dw + 8, dh + 6, KP.stone[6]);
                for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) put(S, dx + i, B - dh + j - 2, i > dw / 2 + 6 ? [10, 8, 7] : pick(KP.plank, 0.35 + hash(Math.floor(i / 5), 0, seed) * 0.3 + (i % 5 === 0 ? -0.2 : 0)));
                const lf = shape(); thick(lf, S, dx + 2, B - dh - 2, dx + dw / 2 - 2, B - 4, 1.2); thick(lf, S, dx + dw / 2 - 2, B - dh - 2, dx + 2, B - 4, 1.2); fill(S, lf, KP.plank.slice(2), { outline: KP.plank[0] });
                used.push([dx - 8, dx + dw + 8]);
            }
            const dw = 18, dh = Math.min(32, wallH - 10), dx = Math.round(X0 + W * (opt.doorAt || 0.5) - dw / 2);
            if (!opt.barn) { door(S, dx, B - dh - 4, dw, dh, seed + 2); used.push([dx - 8, dx + dw + 8]); }
            const ww = opt.tallWindows ? 12 : 12, wh = opt.tallWindows ? 24 : 14, wy = opt.timber ? wallTop + 8 : wallTop + Math.max(8, Math.round((wallH - wh) / 2) - 6);
            const slots = Math.max(1, Math.floor(W / (opt.tallWindows ? 30 : 40)));
            for (let k = 0; k < slots; k++) {
                const wx = Math.round(X0 + ((k + 0.5) / slots) * W - ww / 2);
                if (used.some(([a, z]) => wx + ww > a && wx < z)) continue;
                litWindow(S, wx, wy, ww, wh, seed + k, { arched: !opt.timber });
                scene.windows.push({ x: wx + ww / 2, y: wy + wh / 2 });
            }
            // Roof, ridge, eaves, the hips.
            roofTiles(S, [[X0 - 8, eave], [X1 + 8, eave], [X1 - 12, roofTop + 8], [X0 + 12, roofTop + 8]], seed + 3);
            const ridge = shape(); box(ridge, S, X0 + 12, roofTop + 5, W - 24, 4, 0.4); fill(S, ridge, KP.tile.slice(2), { tex: 0.3, seed, outline: [10, 6, 5] });
            for (let y = roofTop + 8; y < eave; y++) {
                const f = (y - roofTop - 8) / (eave - roofTop - 8);
                put(S, Math.round(X0 + 12 - 20 * f), y, [10, 6, 5]); put(S, Math.round(X1 - 12 + 20 * f), y, [10, 6, 5]);
                for (let k = 1; k < 10; k++) put(S, Math.round(X1 - 12 + 20 * f) - k, y, KP.shadow, 0.2 - k * 0.02);
            }
            eaveLine(S, X0 - 8, X1 + 8, eave, seed);
            if (opt.gable) {                                   // a cross gable over the door, with a window
                const gx = X0 + W * (opt.doorAt || 0.5), gw2 = 34, gt = roofTop - 6;
                roofTiles(S, [[gx - gw2 - 6, eave + 2], [gx, gt - 4], [gx, eave + 2]], seed + 7, { vertical: true, tone: 0.08 });
                roofTiles(S, [[gx, gt - 4], [gx + gw2 + 6, eave + 2], [gx, eave + 2]], seed + 8, { vertical: true, tone: -0.18 });
                const g = Img(gw2 * 2, eave - gt + 6); masonry(g, 0, 0, gw2 * 2, eave - gt + 6, seed + 9, KP.stone);
                for (let j = 0; j < eave - gt + 6; j++) for (let i = 0; i < gw2 * 2; i++) { if (j < eave - gt && Math.abs(i - gw2) > (j / (eave - gt)) * gw2 - 4) continue; const k = (j * gw2 * 2 + i) * 4; put(S, gx - gw2 + i, gt + 6 + j, [g.data[k] + 10, g.data[k + 1] + 9, g.data[k + 2] + 8]); }
                litWindow(S, gx - 6, eave - 30, 12, 16, seed + 10);
                cross(S, gx, gt - 26, 18, seed);
            }
            for (const f of opt.chimneys || []) chimney(S, Math.round(X0 + W * f), roofTop + 12, 18, seed + f * 100, scene);
            for (let n = 0; n < 100; n++) { const x = X0 + hash(n, 1, seed) * W, y = wallTop + hash(n, 2, seed) * wallH; if (vnoise(x / 6, y / 6, seed) > 0.66) put(S, x, y, KP.moss[2 + (n % 2)]); }
        });
    }

    // ---------------------------------------------------------------------
    // The cloister: arcades, hedged beds, cypresses, the fountain
    // ---------------------------------------------------------------------
    /** The arcade (Kreuzgang walk) seen along one side: a lean-to of tiles; the south side shows its row of arches. */
    function arcade(L, b, seed, gaps) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C;
        if (b.y1 > b.y0) {                                         // west or east side: the roof from above
            roofTiles(img, [[X0 + 2, Y0 - 4], [X1 - 2, Y0 - 4], [X1 - 2, B], [X0 + 2, B]], seed, { vertical: true, tone: -0.02 });
            for (let y = Y0 - 4; y < B; y++) { put(img, X0 + 1, y, [10, 6, 5]); put(img, X1 - 2, y, [10, 6, 5]); put(img, X0, y, KP.shadow, 0.4); put(img, X1 - 1, y, KP.shadow, 0.4); }
            for (let y = Y0; y < B; y += 6) for (const x of [X0 + 6, X1 - 7]) { put(img, x, y, KP.tile[1]); }
            return;
        }
        // The south side: a front of round arches on columns under the roof; over the way through, it hangs overhead.
        const faceTop = Y0 + 6, roofTop = Y0 - 16;
        tall(L, [X0 - 6, roofTop - 4, X1 + 6, B + 8], Y0 + 12, true, (S) => {
            roofTiles(S, [[X0 - 4, faceTop + 2], [X1 + 4, faceTop + 2], [X1, roofTop], [X0, roofTop]], seed + 1);
            eaveLine(S, X0 - 4, X1 + 4, faceTop + 2, seed);
            stoneWall(S, X0, faceTop + 5, X1 - X0, B - faceTop - 7, seed + 2);
            const span = 24, g0 = gaps.length ? Math.min(...gaps) * C : -1e9, g1 = gaps.length ? (Math.max(...gaps) + 1) * C : -1e9;
            const arches = [];
            for (let ax = X0 + 4; ax + span <= X1 - 2; ax += span + 4) if (ax + span + 4 < g0 || ax - 4 > g1) arches.push([ax, span, false]);
            if (gaps.length) arches.push([g0 + 2, g1 - g0 - 4, true]);
            for (const [ax, aw0, isGap] of arches) {
                const top = faceTop + (isGap ? 2 : 10), ah = B - top - (isGap ? 0 : 2), aw = aw0;
                const rx = aw / 2, ry = Math.min(rx, isGap ? 9 : rx), curve = (i) => ry - ry * Math.sqrt(Math.max(0, 1 - ((i - (aw - 1) / 2) / rx) ** 2));
                for (let j = 0; j < ah; j++) for (let i = 0; i < aw; i++) {
                    if (j < curve(i)) continue;
                    put(S, ax + i, top + j, isGap ? pick(R(['#1a1715', '#24201d', '#2f2a26', '#3a3530']), (j / ah) * 0.9 + 0.05) : pick(R(['#0e0c0b', '#171412', '#221d19']), (j / ah) * 0.8 + hash(i >> 2, j >> 2, seed) * 0.2));
                }
                for (let i = 0; i < aw; i++) put(S, ax + i, top + curve(i) - 1, KP.stone[6]);
            }
            for (let x = X0; x < X1; x++) put(S, x, B - 1, KP.shadow, 0.5);
        }, (x) => gaps.some((g) => x >= g * C - 6 && x < (g + 1) * C + 6));
    }
    /** A hedged bed: a low clipped box hedge round soil and white rose bushes. */
    function hedgeBed(L, b, seed) {
        const img = L.base, X0 = b.x0 * C + 3, X1 = (b.x1 + 1) * C - 3, Y0 = b.y0 * C + 3, B = (b.y1 + 1) * C - 3;
        shadow(img, (X0 + X1) / 2 + 4, B + 2, (X1 - X0) / 2 + 2, 4, 0.4);
        const h = shape();
        for (let y = Y0; y < B; y++) for (let x = X0; x < X1; x++) {
            const edge = Math.min(x - X0, X1 - 1 - x, y - Y0, B - 1 - y);
            if (edge < 6) h.px.set(y * img.w + x, ((y - Y0) / (B - Y0)) * -0.3 + (edge < 2 ? -0.4 : 0.35) + (vnoise(x / 2.5, y / 2.5, seed) - 0.5) * 0.7);
        }
        fill(img, h, KP.hedge, { outline: KP.hedge[0] });
        for (let x = X0; x < X1; x++) for (let j = 0; j < 4; j++) put(img, x, B + j - 2, pick(KP.hedge, 0.15 + (vnoise(x / 2, j, seed) - 0.5) * 0.3));   // the front face
        // Rose bushes inside.
        const n = Math.round(((X1 - X0) * (B - Y0)) / 260);
        for (let k = 0; k < n; k++) {
            const rx = X0 + 11 + hash(k, b.x0, seed) * (X1 - X0 - 22), ry = Y0 + 11 + hash(k, b.y0, seed + 1) * (B - Y0 - 22);
            const s = shape(); ellipse(s, img, rx, ry, 7, 6);
            for (const [i, v] of s.px) s.px.set(i, v * 0.7 + (vnoise((i % img.w) / 2, ((i / img.w) | 0) / 2, seed + k) - 0.5) * 0.9);
            fill(img, s, KP.leaf, { outline: KP.leaf[0] });
            for (let f = 0; f < 6; f++) {
                const fx = rx - 5 + hash(f, k, seed + 2) * 10, fy = ry - 5 + hash(f, k, seed + 3) * 9, c = KP.flowers[hash(k, f, seed + 4) < 0.75 ? 1 : 2];
                put(img, fx, fy, c); put(img, fx + 1, fy, c); put(img, fx, fy + 1, KP.flowers[0]);
            }
        }
    }
    function cypress(L, x, y, seed, overhead) {
        const cx = x * C + 16, gy = y * C + 28;
        tall(L, [cx - 14, gy - 70, cx + 14, gy + 6], y * C, overhead, (S) => {
            shadow(S, cx + 5, gy, 9, 3, 0.45);
            rectFill(S, cx - 1, gy - 5, 3, 6, KP.plank[2]);
            const s = shape();
            for (let j = 0; j < 58; j++) { const t = j / 58, w = Math.sin(Math.min(1, t * 1.25) * Math.PI) * 8 * (t < 0.15 ? 0.9 : 1) + 1.5; for (let i = -w; i <= w; i++) s.px.set(Math.round(gy - 4 - j) * S.w + Math.round(cx + i), (i / w) * -0.7 + (vnoise((cx + i) / 2, (gy - j) / 2.2, seed + x) - 0.5) * 0.9); }
            fill(S, s, KP.leaf, { outline: KP.leaf[0] });
        });
    }
    /** The fountain in the garth: an eight-sided basin with water, a column, a little stone cross on top. */
    function fountain(L, x, y, seed, scene, overhead) {
        const cx = x * C + 16, gy = y * C + 26;
        tall(L, [cx - 34, gy - 64, cx + 34, gy + 10], y * C, overhead, (S) => {
            shadow(S, cx + 5, gy + 3, 30, 7, 0.45);
            const oct = (rx, ry, cy0) => [...Array(8)].map((_, k) => [cx + Math.cos((k + 0.5) * Math.PI / 4) * rx, cy0 + Math.sin((k + 0.5) * Math.PI / 4) * ry]);
            const rim = shape(); poly(rim, S, oct(28, 13, gy - 8), (px, py) => ((py - gy + 8) / 13) * -0.5 + 0.2); fill(S, rim, KP.stone.slice(2), { tex: 0.4, seed, outline: KP.stone[0] });
            const face = shape(); box(face, S, cx - 26, gy - 8, 52, 9, -0.1); fill(S, face, KP.stone.slice(1), { tex: 0.5, seed: seed + 1, outline: KP.stone[0] });
            const water = shape(); poly(water, S, oct(23, 9.5, gy - 9), 0);
            for (const [i] of water.px) { const px = i % S.w, py = (i / S.w) | 0; put(S, px, py, pick(KP.water, 0.35 + (vnoise(px / 4, py / 2, seed) - 0.5) * 0.5 + (py < gy - 13 ? 0.2 : 0))); if (hash(px, py, seed) < 0.05) scene.water.push(py * S.w + px); }
            const col = shape(); box(col, S, cx - 4, gy - 44, 8, 36, 0); for (const [i] of col.px) col.px.set(i, (((i % S.w) - cx) / 4) * -0.7);
            fill(S, col, KP.stone.slice(1), { tex: 0.3, seed, outline: KP.stone[0] });
            const bowl = shape(); ellipse(bowl, S, cx, gy - 30, 10, 4); fill(S, bowl, KP.stone.slice(2), { outline: KP.stone[0] });
            cross(S, cx, gy - 62, 18, seed + 2);
            for (const sx of [-6, 6]) for (let j = 0; j < 14; j++) put(S, cx + sx + Math.sign(sx) * j * 0.3, gy - 28 + j, [170, 200, 214], 0.55);   // water falling from the bowl
        });
    }

    // ---------------------------------------------------------------------
    // Gardens, the cemetery, the yard
    // ---------------------------------------------------------------------
    function herbBed(L, b, seed) {
        const img = L.base, X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, Y0 = b.y0 * C + 3, B = (b.y1 + 1) * C - 3;
        shadow(img, (X0 + X1) / 2 + 3, B + 2, (X1 - X0) / 2, 3, 0.35);
        const frame = shape(); box(frame, img, X0, Y0, X1 - X0, B - Y0, 0);
        for (const [i] of frame.px) { const px = i % img.w, py = (i / img.w) | 0, e = Math.min(px - X0, X1 - 1 - px, py - Y0, B - 1 - py); if (e >= 3) frame.px.delete(i); else frame.px.set(i, py === B - 1 || px === X1 - 1 ? -0.5 : 0.4); }
        fill(img, frame, KP.plank.slice(1), { tex: 0.4, seed, outline: KP.plank[0] });
        const rows = Math.floor((B - Y0 - 6) / 13);
        for (let r = 0; r < rows; r++) {
            const ramp = KP.herbs[Math.floor(hash(r, b.x0, seed) * KP.herbs.length)], ry = Y0 + 9 + r * 13;
            for (let px = X0 + 6; px < X1 - 6; px += 6) {
                const s = shape(); ellipse(s, img, px + hash(px, r, seed) * 2, ry, 4.2, 4);
                for (const [i, v] of s.px) s.px.set(i, v * 0.6 + (vnoise((i % img.w) / 1.6, ((i / img.w) | 0) / 1.6, seed + r) - 0.5) * 1.0);
                fill(img, s, ramp, { outline: ramp[0] });
            }
        }
    }
    function hops(L, b, seed, overhead) {
        const X0 = b.x0 * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C, cx = X0 + 16;
        tall(L, [X0 - 10, Y0 - 50, X0 + C + 10, B + 6], Y0, overhead, (S) => {
            for (let py = Y0 + 20; py <= B; py += 32) {
                shadow(S, cx + 4, py, 8, 2.5, 0.4);
                const p = shape(); thick(p, S, cx, py - 58, cx, py, 1.6); fill(S, p, KP.plank, { tex: 0.4, seed: seed + py, outline: KP.plank[0] });
                for (let j = 0; j < 54; j++) {                  // the bine twisting up the pole, with cones
                    const vx = cx + Math.sin(j / 3 + py) * 3.5, vy = py - j;
                    put(S, vx, vy, KP.leaf[5]); put(S, vx + 1, vy, KP.leaf[3]);
                    if (j % 6 === 0) { const l = shape(); ellipse(l, S, vx + (j % 12 ? 4 : -4), vy, 3.5, 2.6); fill(S, l, KP.leaf.slice(2), { outline: KP.leaf[0] }); }
                    if (j % 9 === 4 && j > 12) { const c = shape(); ellipse(c, S, vx + (j % 18 ? -3 : 3), vy + 2, 2, 3); fill(S, c, R(['#3f5a1e', '#62822c', '#8fac44', '#bcd06a']), { outline: KP.leaf[1] }); }
                }
            }
            for (let py = Y0 - 34; py <= B - 34; py += 3) put(S, cx, py, [80, 74, 62], 0.4);   // the top wire
        });
    }
    function grave(L, x, y, seed) {
        const img = L.base;
        for (let k = 0; k < 2; k++) {
            const cx = x * C + 9 + k * 15, gy = y * C + 18 + k * 8 + hash(x, y + k, seed) * 4;
            if (hash(x * 3 + k, y, seed) < 0.3) continue;
            const mound = shape(); ellipse(mound, img, cx + 1, gy + 4, 6, 3); fill(img, mound, KP.grass.slice(2), { outline: KP.grass[0] });
            const st = shape(); box(st, img, cx - 4, gy - 10, 8, 11, 0); ellipse(st, img, cx, gy - 10, 4, 3);
            for (const [i] of st.px) st.px.set(i, (((i % img.w) - cx) / 4) * -0.6 + 0.1);
            fill(img, st, KP.stone.slice(2), { tex: 0.4, seed: seed + k, outline: KP.stone[0] });
            rectFill(img, cx - 2, gy - 8, 4, 1, KP.stone[2]); put(img, cx, gy - 10, KP.stone[2]); put(img, cx, gy - 6, KP.stone[2]);
            if (hash(x, y * 5 + k, seed) < 0.3) torchCandle(img, cx + 6, gy + 1);
        }
    }
    function torchCandle(img, x, y) { put(img, x, y, KP.plaster[4]); put(img, x, y - 1, KP.plaster[4]); put(img, x, y - 2, KP.glow[4]); for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) put(img, x + i, y - 2 + j, KP.glow[3], 0.08); }
    function graveCross(L, x, y, seed, overhead) {
        const cx = x * C + 16, gy = y * C + 28;
        tall(L, [cx - 20, gy - 60, cx + 20, gy + 6], y * C, overhead, (S) => {
            shadow(S, cx + 5, gy, 14, 4, 0.45);
            for (let s = 0; s < 2; s++) { const p = shape(); box(p, S, cx - 12 + s * 4, gy - 6 - s * 5, 24 - s * 8, 6, 0.3 - s * 0.2); fill(S, p, KP.stone.slice(2), { tex: 0.4, seed: seed + s, outline: KP.stone[0] }); }
            const c = shape(); box(c, S, cx - 3, gy - 52, 7, 42, 0); box(c, S, cx - 13, gy - 42, 27, 6, 0.3);
            for (const [i, v] of c.px) c.px.set(i, v + (((i % S.w) - cx) / 6) * -0.5);
            fill(S, c, KP.stone.slice(2), { tex: 0.4, seed: seed + 3, outline: KP.stone[0] });
            for (let j = 0; j < 10; j++) put(S, cx + 2, gy - 50 + j * 4, KP.moss[2]);
        });
    }
    function woodpile(L, b, seed) {
        const img = L.base, X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4;
        shadow(img, (X0 + X1) / 2 + 4, B + 1, (X1 - X0) / 2 + 2, 5, 0.45);
        const roof = shape(); poly(roof, img, [[X0 - 4, B - 34], [X1 + 4, B - 34], [X1, B - 44], [X0, B - 44]], 0.3); fill(img, roof, KP.plank.slice(1), { tex: 0.5, seed, outline: KP.plank[0] });
        for (const px of [X0, X1 - 4]) { const p = shape(); box(p, img, px, B - 34, 4, 34, 0); fill(img, p, KP.plank.slice(1), { outline: KP.plank[0] }); }
        for (let r = 0; r < 4; r++) for (let px = X0 + 6 + (r % 2) * 4; px < X1 - 6; px += 8) {
            const e = shape(); ellipse(e, img, px, B - 4 - r * 7, 4, 3.6); fill(img, e, PAL.straw, { edge: false, outline: KP.plank[1] });
            put(img, px, B - 4 - r * 7, PAL.straw[0]);
        }
    }
    function bench(L, x, y, seed) {
        const img = L.base, cx = x * C + 16, gy = y * C + 24;
        shadow(img, cx + 3, gy + 2, 18, 4, 0.4);
        const t = shape(); box(t, img, cx - 16, gy - 12, 32, 6, 0.5); box(t, img, cx - 16, gy - 6, 32, 3, -0.3); fill(img, t, KP.plank.slice(1), { tex: 0.4, seed, outline: KP.plank[0] });
        for (const lx of [cx - 13, cx + 10]) { const l = shape(); box(l, img, lx, gy - 3, 3, 7, 0); fill(img, l, KP.plank.slice(1), { outline: KP.plank[0] }); }
        put(img, cx - 6, gy - 11, KP.plaster[3]); put(img, cx - 5, gy - 11, KP.plaster[4]); put(img, cx + 6, gy - 10, KP.copper[3]);   // a cup, a jug
    }
    function crops(L, x, y, seed) {
        const img = L.base, x0 = x * C, y0 = y * C;
        for (let r = 0; r < 4; r++) for (let px = x0 + 2; px < x0 + C - 2; px += 4) {
            const py = y0 + 6 + r * 8, h = 4 + hash(px, r, seed) * 4;
            for (let j = 0; j < h; j++) put(img, px + (j > h / 2 ? 1 : 0), py - j + 4, pick(KP.crop, 0.3 + j / h * 0.6));
        }
    }
    function sideFence(L, x, y, seed) {
        const img = L.base, cx = x * C + 16, y0 = y * C;
        const s = shape(); box(s, img, cx - 2, y0, 3, C, 0.2); box(s, img, cx + 2, y0, 2, C, -0.3);
        for (const py of [y0 + 4, y0 + 20]) box(s, img, cx - 3, py - 10, 4, 14, 0.4);
        for (const [i] of s.px) s.px.set(i, s.px.get(i) + (vnoise(i % img.w, ((i / img.w) | 0) / 4, seed) - 0.5) * 0.6);
        fill(img, s, PAL.wood.slice(1, 7), { outline: PAL.wood[0] });
    }
    function torchPost(S, cx, gy, seed, scene) {
        shadow(S, cx + 3, gy + 1, 5, 2, 0.4);
        const p = shape(); thick(p, S, cx, gy - 36, cx, gy, 1.3); fill(S, p, KP.plank, { outline: KP.plank[0] });
        const cup = shape(); poly(cup, S, [[cx - 5, gy - 40], [cx + 5, gy - 40], [cx + 3, gy - 35], [cx - 3, gy - 35]], 0); fill(S, cup, PAL.iron, { outline: PAL.iron[0] });
        for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) { const d = Math.hypot(x, y); if (d < 10) put(S, cx + x, gy - 46 + y, KP.glow[3], (1 - d / 10) * 0.22); }
        const f = shape(); ellipse(f, S, cx, gy - 44, 3.2, 5); fill(S, f, KP.glow.slice(1), { edge: false });
        scene.flames.push({ x: cx, y: gy - 44 });
    }

    // ---------------------------------------------------------------------
    // The gatehouse
    // ---------------------------------------------------------------------
    function crossBanner(img, x, y, w, h, seed) {
        const s = shape(); poly(s, img, [[x, y], [x + w, y], [x + w, y + h], [x + w / 2, y + h - 6], [x, y + h]], (px) => ((px - x) / w - 0.5) * -0.9);
        fill(img, s, KP.cloth, { tex: 0.3, seed, outline: [26, 8, 8] });
        const cx = Math.round(x + w / 2);
        rectFill(img, cx - 1, y + 6, 3, h - 16, KP.plaster[4]); rectFill(img, cx - 5, y + 11, 11, 3, KP.plaster[4]);
        rectFill(img, x - 2, y - 1, w + 4, 2, KP.plank[2]);
    }
    /** Two square towers with pointed roofs and banners, between them a gable with a cross over the open gate. */
    function gatehouse(L, left, right, gateX, seed, scene) {
        const X0 = left.x0 * C, X1 = (right.x1 + 1) * C, B = (left.y1 + 1) * C + 4, gx = gateX * C + 16;
        tall(L, [X0 - 10, B - 140, X1 + 10, B + 10], left.y0 * C + 6, true, (S) => {
            shadow(S, gx + 10, B + 2, (X1 - X0) / 2 + 4, 8, 0.5);
            // The gate block between the towers, its gable and cross.
            const gw = 64, gTop = B - 60;
            stoneWall(S, gx - gw / 2, gTop, gw, B - gTop, seed);
            const apex = gTop - 26;
            roofTiles(S, [[gx - gw / 2 - 6, gTop + 4], [gx, apex], [gx, gTop + 4]], seed + 1, { vertical: true, tone: 0.06 });
            roofTiles(S, [[gx, apex], [gx + gw / 2 + 6, gTop + 4], [gx, gTop + 4]], seed + 2, { vertical: true, tone: -0.18 });
            eaveLine(S, gx - gw / 2 - 6, gx + gw / 2 + 6, gTop + 4, seed);
            cross(S, gx, apex - 20, 18, seed + 3);
            const plaque = shape(); box(plaque, S, gx - 7, gTop + 4, 14, 14, 0.2); fill(S, plaque, KP.stone.slice(3), { tex: 0.3, seed, outline: KP.stone[0] });
            cross(S, gx, gTop + 6, 10, seed + 4, R(['#140c08', '#1e140e', '#2a1d14', '#3a2a1c', '#4a3a2a']));
            // The arch and the open doors.
            const aw = 28, ah = 38, ax = gx - aw / 2, ay = B - ah;
            for (let j = -6; j < ah; j++) for (let i = -6; i < aw + 6; i++) {
                const cx2 = i - (aw - 1) / 2, cy2 = j - aw / 2, r2 = cx2 * cx2 + cy2 * cy2;
                if (cy2 < 0 && r2 > (aw / 2 + 6) ** 2) continue;
                const inside = i >= 0 && i < aw && (cy2 >= 0 || r2 <= (aw / 2) ** 2) && j >= 0;
                put(S, ax + i, ay + j, inside ? pick(R(['#0c0a09', '#15110e', '#3a3632', '#45403a']), (j / ah) * 0.9 + 0.05) : pick(KP.stone, 0.62 + (hash(Math.floor(Math.atan2(cy2, cx2) * 4), 0, seed) - 0.5) * 0.3));
            }
            for (const side of [-1, 1]) {                         // the door leaves, swung in against the passage walls
                const lx = side < 0 ? ax + 1 : ax + aw - 7;
                for (let j = 8; j < ah - 2; j++) for (let i = 0; i < 6; i++) put(S, lx + i, ay + j, pick(KP.plank, 0.35 + (i === 0 ? -0.2 : 0) + hash(i, j >> 3, seed) * 0.2));
                rectFill(S, lx, ay + 16, 6, 1, PAL.iron[2]); rectFill(S, lx, ay + ah - 10, 6, 1, PAL.iron[2]);
            }
            // The towers.
            for (const tcx of [left.x0 * C + 40, (right.x1 + 1) * C - 40]) {
                const tw = 48, tx = tcx - tw / 2, top = B - 74;
                stoneWall(S, tx, top, tw, B - top, seed + tcx);
                for (let y = top; y < B; y++) { put(S, tx - 1, y, KP.stone[0]); put(S, tx + tw, y, KP.stone[0]); for (let k = 0; k < 6; k++) put(S, tx + tw - 1 - k, y, KP.shadow, 0.28 - k * 0.04); }
                rectFill(S, tx - 3, top + 22, tw + 6, 3, KP.stone[6]);
                rectFill(S, tcx - 2, top + 8, 4, 10, [10, 8, 8]);
                roofTiles(S, [[tx - 6, top + 2], [tcx, top - 42], [tcx, top + 2]], seed + tcx, { vertical: true, tone: 0.06 });
                roofTiles(S, [[tcx, top - 42], [tx + tw + 6, top + 2], [tcx, top + 2]], seed + tcx + 1, { vertical: true, tone: -0.18 });
                eaveLine(S, tx - 6, tx + tw + 6, top + 2, seed);
                rectFill(S, tcx - 1, top - 49, 2, 8, PAL.iron[3]);
                crossBanner(S, tcx - 9, top + 30, 18, 32, seed + tcx);
            }
        }, (x, y) => (x > gx - 36 && x < gx + 36) || y < B - 72);
        scene.windows.push({ x: gx, y: B - 30 });
    }

    // ---------------------------------------------------------------------
    // The scene
    // ---------------------------------------------------------------------
    function kloster(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) };
        const seed = 83, scene = { smoke: [], flames: [], windows: [], water: [] };
        const kind = ground(L.base, map, nameAt, cw, ch, seed);
        details(L.base, kind, seed);
        const OPEN = new Set(['grass', 'dirt_path', 'flagstones', 'gate']);
        const open = (x, y) => OPEN.has(nameAt(map, x, y));
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        // Flat things first.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (nameAt(map, x, y) === 'crops') crops(L, x, y, seed);
        const items = [], seen = new Set();
        const BLOCKS = { abbey_church: 1, bell_tower: 1, monks_cells: 1, refectory: 1, abbots_house: 1, brewery: 1, storehouse: 1,
            hedge_bed: 1, herb_bed: 1, hop_trellis: 1, woodpile: 1, gatehouse: 1 };
        const gates = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (n === 'arcade') {                                  // the cloister walk: straight runs, the south one with its way through
                if (seen.has(`${x},${y}`)) continue;
                const isA = (xx, yy) => nameAt(map, xx, yy) === 'arcade';
                const horiz = (xx, yy) => isA(xx - 1, yy) || isA(xx + 1, yy);
                if (horiz(x, y)) {
                    let x1 = x; const gaps = [];
                    for (let xx = x; xx < cw; xx++) {
                        if (isA(xx, y) && horiz(xx, y)) { x1 = xx; seen.add(`${xx},${y}`); }
                        else if (nameAt(map, xx, y) === 'flagstones' && [1, 2, 3].some((k) => isA(xx + k, y) && [...Array(k)].every((_, q) => nameAt(map, xx + q, y) === 'flagstones'))) gaps.push(xx);
                        else break;
                    }
                    items.push({ y: y + 0.9, x, draw: () => arcade(L, { x0: x, x1, y0: y, y1: y }, seed + x * 13 + y * 7, gaps) });
                } else {
                    let y1 = y;
                    for (let yy = y; yy < ch && isA(x, yy) && !horiz(x, yy); yy++) { y1 = yy; seen.add(`${x},${yy}`); }
                    items.push({ y: y1 + 0.9, x, draw: () => arcade(L, { x0: x, x1: x, y0: y, y1 }, seed + x * 13 + y * 7, []) });
                }
                continue;
            }
            if (BLOCKS[n]) {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set([n]), seen), s = seed + b.x0 * 13 + b.y0 * 7;
                const over = [...Array(b.x1 - b.x0 + 1)].some((_, i) => open(b.x0 + i, b.y0 - 1));
                if (n === 'gatehouse') { gates.push(b); continue; }
                const draw = {
                    abbey_church: () => church(L, b, s, scene),
                    bell_tower: () => bellTower(L, b, s, scene),
                    monks_cells: () => rangeNS(L, b, s, scene, over),
                    refectory: () => rangeEW(L, b, s, scene, over, { tallWindows: true, doorAt: 0.82, chimneys: [0.22] }),
                    abbots_house: () => rangeEW(L, b, s, scene, over, { gable: true, doorAt: 0.5, chimneys: [0.8] }),
                    brewery: () => rangeEW(L, b, s, scene, over, { timber: true, bay: [0.42, 0.98], doorAt: 0.18, chimneys: [0.55, 0.86] }),
                    storehouse: () => rangeEW(L, b, s, scene, over, { barn: true, wallH: 44 }),
                    hedge_bed: () => hedgeBed(L, b, s),
                    herb_bed: () => herbBed(L, b, s),
                    hop_trellis: () => hops(L, b, s, over),
                    woodpile: () => woodpile(L, b, s)
                }[n];
                items.push({ y: b.y1 + 0.9, x: b.x0, draw });
                continue;
            }
            const cx = x * C + 16, gy = y * C + 28, ov = open(x, y - 1);
            const P = {
                kloster_wall: () => curtain(L, map, nameAt, x, y, seed),
                wall_tower: () => tower(L, x, y, seed + x * 7 + y),
                low_wall: () => lowWall(L, map, nameAt, x, y, seed),
                tree: () => tree(L, x, y, seed, { big: 1.2 + hash(x, y, seed) * 0.4, ramp: KP.leaf, overhead: behind(x, y) }),
                dead_tree: () => deadTree(L, x, y, seed + x),
                cypress: () => cypress(L, x, y, seed, behind(x, y)),
                cloister_fountain: () => fountain(L, x, y, seed, scene, behind(x, y)),
                grave: () => grave(L, x, y, seed),
                grave_cross: () => graveCross(L, x, y, seed, behind(x, y)),
                barrel: () => barrel(L, cx, gy, seed + x),
                crate: () => crate(L, cx, gy, seed + x + y, hash(x, y, seed) < 0.5 ? 1 : -1),
                cart: () => cart(L, x, y, seed + x),
                bench: () => bench(L, x, y, seed + x),
                scarecrow: () => scarecrow(L, x, y, seed),
                fence: () => sideFence(L, x, y, seed),
                lantern: () => tall(L, [cx - 12, gy - 60, cx + 12, gy + 6], y * C, ov, (S) => torchPost(S, cx, gy, seed + x, scene))
            }[n];
            if (P) items.push({ x, y: y + (n === 'tree' ? 0.8 : n === 'kloster_wall' || n === 'wall_tower' ? 0.95 : 0.5), draw: P });
        }
        // The gatehouse: its two halves either side of the gate.
        for (const l of gates) {
            const r = gates.find((p) => p.y0 === l.y0 && p.x0 > l.x1 && nameAt(map, l.x1 + 1, l.y0) === 'gate');
            if (r) items.push({ x: l.x0, y: l.y1 + 0.97, draw: () => gatehouse(L, l, r, l.x1 + 1, seed + l.x0, scene) });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Static smoke over the chimneys (the moving puffs come from animate).
        for (const c of scene.smoke) for (let k = 0; k < 7; k++) {
            const px = c.x + k * 3 + Math.sin(k) * 2, py = c.y - k * 6, r = 2 + k * 0.7;
            for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) put(L.over, px + i, py + j, [160, 156, 150], 0.15 - k * 0.018);
        }
        // Late afternoon: the edges sink into shadow.
        for (let y = 0; y < L.base.h; y++) for (let x = 0; x < L.base.w; x++) {
            const d = Math.min(x, y, L.base.w - 1 - x, L.base.h - 1 - y);
            if (d < 18) put(L.base, x, y, KP.shadow, (1 - d / 18) * 0.35);
        }
        function animate(g, time) {
            for (let k = 0; k < scene.flames.length; k++) {           // torches and the brewing fire
                const f = scene.flames[k], a = Math.sin(time / 90 + k * 2.1), b2 = Math.sin(time / 57 + k);
                if (f.big) {
                    g.fillStyle = 'rgba(255, 210, 110, 0.8)'; g.fillRect(f.x - 3 + (a > 0.3 ? 1 : 0), f.y - 5 - (b2 > 0 ? 1 : 0), 5, 4);
                    g.fillStyle = 'rgba(255, 120, 40, 0.6)'; g.fillRect(f.x - 6 + (b2 > 0.5 ? 1 : 0), f.y - 1, 11, 3);
                } else {
                    g.fillStyle = 'rgba(255, 214, 120, 0.85)'; g.fillRect(f.x - 1 + (a > 0.3 ? 1 : 0), f.y - 4 - (b2 > 0 ? 1 : 0), 2, 3);
                    g.fillStyle = 'rgba(255, 120, 40, 0.6)'; g.fillRect(f.x - 2 + (b2 > 0.5 ? 1 : 0), f.y - 1, 4, 2);
                }
            }
            for (let k = 0; k < scene.smoke.length; k++) {            // chimney smoke
                const c = scene.smoke[k];
                for (let p = 0; p < 4; p++) {
                    const t = ((time / 45 + p * 25 + k * 13) % 100) / 100;
                    const r = 2 + t * 4, x = c.x + t * 16 + Math.sin(time / 700 + p) * 2, y = c.y - t * 42;
                    g.fillStyle = `rgba(165, 160, 152, ${(0.22 * (1 - t)).toFixed(3)})`;
                    g.fillRect(Math.round(x - r), Math.round(y - r * 0.7), Math.round(r * 2), Math.round(r * 1.4));
                }
            }
        }
        return { w: L.base.w, h: L.base.h, base: L.base.data, over: L.over.data, water: scene.water, animate, windows: scene.windows };
    }

    SA.scenes.kloster = kloster;
    if (isNode) module.exports = kloster;
})(typeof window !== 'undefined' ? window : globalThis);
