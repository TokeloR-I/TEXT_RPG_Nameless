/* =========================================================================
 * Enso's Last Stand — SCENE ART (original, drawn by code; Saffron/Quill art plan M3)
 * Paints a whole outdoor map as one picture instead of tile by tile, so grass, dirt and water meet in organic
 * shapes and buildings are drawn as buildings. The map's tiles still decide collision and where each thing
 * stands: a scene reads them and paints what is there. No image goes in; every pixel comes from the code below
 * and its palette (docs/art/ORIGINAL_ART_PLAN.md §0).
 *
 *   ENSO.sceneArt.has(map)                    does this map have a scene (map.scene names one)
 *   ENSO.sceneArt.paint(map, nameAt)          -> { w, h, base, over, water } RGBA layers at 32 px per cell
 *                                              base: under everyone; over: tree crowns and roofs, over everyone
 *   ENSO.sceneArt.layers(map, nameAt)         the same as canvases (browser only, cached per map)
 *   ENSO.sceneArt.animate(g, map, time)       moving light on the water, drawn each frame over the base
 * Scenes: 'homestead' (the Forgotten Homestead grounds, after Tokelo's reference: a ruined stone and timber
 * farmhouse by a river, a smithy, a well, tilled plots, dry-stone walls and a dock).
 * Pure apart from layers()/animate(); `node tools/preview-scene.js` renders a scene to a PNG for review.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const C = 32;                                           // pixels per map cell (the 32 px source grid)

    // ---------------------------------------------------------------------
    // Noise and colour
    // ---------------------------------------------------------------------
    const hash = (x, y, s = 0) => {
        let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    function vnoise(x, y, s) {
        const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
        const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
        return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    }
    const fbm = (x, y, s, oct = 3) => { let v = 0, amp = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { v += vnoise(x * f, y * f, s + i * 17) * amp; n += amp; amp *= 0.5; f *= 2; } return v / n; };
    const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const R = (list) => list.map(hex);

    // The homestead palette: muted olive grass, brown earth, slate-blue roofs, weathered grey stone.
    const PAL = {
        grass: R(['#26311a', '#2f3c1e', '#3a4823', '#465528', '#53622d', '#627033', '#737d3a']),
        dry: R(['#5a5a2c', '#6e6a33', '#837a3c', '#988b47']),
        dirt: R(['#33281d', '#3f3224', '#4c3c2a', '#5a4731', '#685339', '#7a6343']),
        tilled: R(['#21180f', '#2d2015', '#3a2a1b', '#4a3624']),
        water: R(['#101c26', '#15242f', '#1a2d3a', '#213848', '#2b4659', '#3c5d72']),
        glint: R(['#6f93a6', '#a9c6cf']),
        stone: R(['#2b2a2e', '#3b3a3e', '#4c4a4c', '#5e5b5a', '#716d69', '#87827a', '#9d978c']),
        slate: R(['#1a1d27', '#232836', '#2d3445', '#384156', '#465169', '#59647c']),
        wood: R(['#20160f', '#2e2016', '#3e2c1d', '#513a26', '#664a30', '#7d5d3c', '#957251']),
        plaster: R(['#4f4b45', '#625d55', '#757066', '#8a8477', '#9e9887']),
        leaf: R(['#141d12', '#1c2a17', '#25381c', '#2f4722', '#3b5828', '#4b6b2f', '#5e7f37']),
        leafAutumn: R(['#1f2010', '#2d2d15', '#3f3c1b', '#545021', '#6b6528', '#857c31', '#9c8e3b']),
        moss: R(['#2a3a1c', '#3a4d22', '#4d6229']),
        iron: R(['#18181c', '#26262c', '#36363e', '#4a4a52', '#62626a']),
        straw: R(['#5e4a22', '#7a6230', '#957a3e', '#b0944e']),
        flower: R(['#e8e4d4', '#f2d872', '#c9b8e0']),
        shadow: [8, 10, 16]
    };

    // ---------------------------------------------------------------------
    // Raster: an RGBA buffer with blending, and shaded shapes.
    // ---------------------------------------------------------------------
    function Img(w, h) { return { w, h, data: new Uint8ClampedArray(w * h * 4) }; }
    function put(img, x, y, c, a = 1) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
        const i = (y * img.w + x) * 4, d = img.data;
        if (a >= 1) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return; }
        const k = d[i + 3] / 255, na = a + k * (1 - a);
        if (na <= 0) return;
        for (let j = 0; j < 3; j++) d[i + j] = (c[j] * a + d[i + j] * k * (1 - a)) / na;
        d[i + 3] = na * 255;
    }
    const alphaAt = (img, x, y) => (x < 0 || y < 0 || x >= img.w || y >= img.h ? 0 : img.data[((y | 0) * img.w + (x | 0)) * 4 + 3]);
    const rectFill = (img, x, y, w, h, c, a = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(img, x + i, y + j, c, a); };

    /** A shape: Map(index -> shade value in [-1, 1]), 1 facing the light (top left). */
    const LX = -0.6, LY = -0.8;
    function shape() { return { px: new Map(), w: 0 }; }
    function sset(s, img, x, y, v) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < img.w && y < img.h) s.px.set(y * img.w + x, Math.max(-1, Math.min(1, v))); }
    function ellipse(s, img, cx, cy, rx, ry, bias = 0) {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
            const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
            if (dx * dx + dy * dy <= 1) sset(s, img, x, y, (dx * LX + dy * LY) + bias);
        }
        return s;
    }
    function box(s, img, x, y, w, h, v = 0) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) sset(s, img, x + i, y + j, v); return s; }
    function poly(s, img, pts, v = 0) {
        const ys = pts.map((p) => p[1]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
            const py = y + 0.5, xs = [];
            for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; if ((y1 <= py && y2 > py) || (y2 <= py && y1 > py)) xs.push(x1 + ((py - y1) / (y2 - y1)) * (x2 - x1)); }
            xs.sort((a, b) => a - b);
            for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) sset(s, img, x, y, typeof v === 'function' ? v(x, y) : v);
        }
        return s;
    }
    function thick(s, img, ax, ay, bx, by, r, bias = 0) {
        const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1e-6;
        for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.max(ay, by) + r; y++) for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.max(ax, bx) + r; x++) {
            const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
            const ox = px - (ax + vx * t), oy = py - (ay + vy * t), d = Math.hypot(ox, oy);
            if (d <= r) sset(s, img, x, y, ((ox * LX + oy * LY) / Math.max(r, 0.7)) * 0.9 + bias);
        }
        return s;
    }
    /** Paint a shape with a ramp (dark to light). `tex` adds per-pixel variation; `outline` rings it. */
    function fill(img, s, ramp, { tex = 0, seed = 0, outline = null, scale = 3, edge = true } = {}) {
        const n = ramp.length;
        for (const [i, v] of s.px) {
            const x = i % img.w, y = (i / img.w) | 0;
            let t = (v + 1) / 2 + (tex ? (vnoise(x / scale, y / scale, seed) - 0.5) * tex : 0);
            if (edge && (!s.px.has(i + 1) || !s.px.has(i + img.w))) t -= 0.18;
            put(img, x, y, ramp[Math.max(0, Math.min(n - 1, Math.floor(t * n)))]);
        }
        if (outline) for (const [i] of s.px) {
            const x = i % img.w, y = (i / img.w) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!s.px.has((y + dy) * img.w + x + dx)) put(img, x + dx, y + dy, outline);
        }
    }
    /** A soft drop shadow: darken an ellipse on the ground. */
    function shadow(img, cx, cy, rx, ry, a = 0.38) {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
            const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
            if (d <= 1) put(img, x, y, PAL.shadow, a * (d > 0.6 ? 0.6 : 1));
        }
    }

    // ---------------------------------------------------------------------
    // Ground: grass, dirt, tilled earth and water, decided per pixel from smoothed fields over the cell grid.
    // ---------------------------------------------------------------------
    const DIRTY = { dirt_path: 1, doorway: 1, shed_door_shut: 0.8, footbridge: 1, dock: 0.9, anvil: 0.75, cart: 0.55, crate: 0.6, barrel: 0.6, stump: 0.3 };
    const WET = { water: 1, dock: 1, footbridge: 1 };
    const BUILDING = new Set(['roof', 'house_wall', 'house_window', 'shed_roof', 'shed_wall']);
    const OPEN = new Set(['grass', 'tall_weeds', 'dirt_path', 'tilled_soil', 'dock', 'footbridge', 'doorway']);
    /** Bilinear sample of a per-cell value (cell centres), so fields have soft, organic edges. */
    function field(cells, cw, ch) {
        return (px, py) => {
            const fx = px / C - 0.5, fy = py / C - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
            const v = (x, y) => cells[Math.max(0, Math.min(ch - 1, y)) * cw + Math.max(0, Math.min(cw - 1, x))];
            return (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty;
        };
    }

    function paintGround(img, map, nameAt, cw, ch, seed) {
        const dirtC = new Float32Array(cw * ch), wetC = new Float32Array(cw * ch), tillC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            dirtC[y * cw + x] = DIRTY[n] || 0;
            wetC[y * cw + x] = WET[n] || 0;
            tillC[y * cw + x] = n === 'tilled_soil' ? 1 : 0;
            if (BUILDING.has(n) && nameAt(map, x, y + 1) && !BUILDING.has(nameAt(map, x, y + 1))) dirtC[y * cw + x] = Math.max(dirtC[y * cw + x], 0.55);
        }
        // Yards: the earth in front of buildings and round the well is worn bare.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (n === 'well') for (const [dx, dy] of [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) { const i = (y + dy) * cw + x + dx; if (i >= 0 && i < dirtC.length) dirtC[i] = Math.max(dirtC[i], 0.6); }
            if (n === 'shed_wall' || n === 'doorway') for (const dx of [-1, 0, 1]) { const i = (y + 1) * cw + x + dx; if (i < dirtC.length) dirtC[i] = Math.max(dirtC[i], 0.62); }
        }
        const dirt = field(dirtC, cw, ch), wet = field(wetC, cw, ch), till = field(tillC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);               // 0 grass, 1 dirt, 2 tilled, 3 water
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x;
            const n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            const w = wet(x, y) + (n1 - 0.5) * 0.28 + (n2 - 0.5) * 0.06;
            const cellName = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            if (cellName === 'water' || (w > 0.62 && cellName !== 'dock' && cellName !== 'footbridge' && WET[cellName])) { kind[i] = 3; continue; }
            if (till(x, y) > 0.55 && cellName === 'tilled_soil') { kind[i] = 2; continue; }
            const d = dirt(x, y) + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.12 + (fbm(x / 60, y / 60, seed + 9) > 0.66 ? 0.25 : 0);
            kind[i] = d > 0.52 ? 1 : 0;
        }
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 0) {                                        // grass: clumps of light and shade, dry patches
                const big = fbm(x / 30, y / 30, seed + 3), mid = vnoise(x / 6, y / 6, seed + 4), fine = hash(x, y, seed + 5);
                let t = big * 0.55 + mid * 0.35 + fine * 0.18;
                // darker where the grass meets bare earth
                if (kind[i - 1] === 1 || kind[i + 1] === 1 || kind[i - img.w] === 1 || kind[i + img.w] === 1) t -= 0.25;
                const dryness = fbm(x / 40, y / 40, seed + 6);
                const ramp = dryness > 0.68 && t > 0.5 ? PAL.dry : PAL.grass;
                put(img, x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length * 0.95)))]);
            } else if (k === 1) {                                 // bare earth: mottled, pebbles, darker at the rims
                const t0 = fbm(x / 9, y / 9, seed + 7) * 0.7 + hash(x, y, seed + 8) * 0.3;
                let t = t0;
                let rim = 0;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 0 || kind[i + r] === 0 || kind[i - r * img.w] === 0 || kind[i + r * img.w] === 0) rim++;
                t -= rim * 0.14;
                put(img, x, y, PAL.dirt[Math.max(0, Math.min(PAL.dirt.length - 1, Math.floor(t * PAL.dirt.length)))]);
            } else if (k === 2) {                                 // tilled rows: ridges and furrows
                const row = (y + Math.floor(vnoise(x / 12, y, seed) * 2)) % 6;
                const t = row < 2 ? 0.85 : row < 4 ? 0.55 : 0.2;
                put(img, x, y, PAL.tilled[Math.max(0, Math.min(3, Math.floor((t + (hash(x, y, seed) - 0.5) * 0.3) * 4)))]);
            } else {                                              // water: darker away from the bank
                let near = 0;
                for (let r = 1; r <= 6; r += 1) if (kind[i - r * img.w] !== 3 || kind[i + r * img.w] !== 3 || kind[i - r] !== 3 || kind[i + r] !== 3) { near = 7 - r; break; }
                const t = 0.15 + near * 0.08 + (fbm(x / 26, y / 9, seed + 10) - 0.5) * 0.3;
                put(img, x, y, PAL.water[Math.max(0, Math.min(PAL.water.length - 1, Math.floor(t * PAL.water.length)))]);
            }
        }
        // Ripples: short pale streaks along the current.
        for (let n = 0; n < (img.w * img.h) / 900; n++) {
            const x = Math.floor(hash(n, 1, seed + 11) * img.w), y = Math.floor(hash(n, 2, seed + 11) * img.h);
            if (kind[y * img.w + x] !== 3) continue;
            const len = 3 + Math.floor(hash(n, 3, seed) * 6);
            for (let j = 0; j < len; j++) if (kind[y * img.w + x + j] === 3) put(img, x + j, y, PAL.water[4], 0.55);
        }
        // Wet bank: a dark rim on the land side of the water.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] === 3) continue;
            if (kind[i + img.w] === 3 || kind[i + 2 * img.w] === 3) put(img, x, y, PAL.dirt[1], 0.75);
            else if (kind[i - img.w] === 3) put(img, x, y, PAL.water[1], 0.5);
        }
        return kind;
    }

    /** Small things on the grass: tufts, flowers, pebbles; tufts also break the edges of the paths. */
    function paintDetails(img, kind, map, nameAt, seed) {
        const count = (img.w * img.h) / 34;
        for (let n = 0; n < count; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h);
            const k = kind[y * img.w + x];
            const cell = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            if (k === 0 || (k === 1 && kind[y * img.w + x + 3] === 0)) {
                const tall = 2 + Math.floor(hash(n, 9, seed) * 3);
                const dry = fbm(x / 40, y / 40, seed + 6) > 0.6;
                const lt = dry ? PAL.dry[3] : PAL.grass[6], md = dry ? PAL.dry[2] : PAL.grass[4];
                for (let b = -1; b <= 1; b++) {
                    const h = tall - Math.abs(b);
                    for (let j = 0; j < h; j++) put(img, x + b + (j === h - 1 ? b : 0), y - j, j === h - 1 ? lt : md);
                }
                put(img, x, y + 1, PAL.grass[1]);
            } else if (k === 1 && hash(n, 10, seed) < 0.35) {
                put(img, x, y, PAL.dirt[5]); put(img, x + 1, y, PAL.dirt[4]); put(img, x, y + 1, PAL.dirt[1]);
            }
            void cell;
        }
        // Flowers: small white and yellow heads in loose drifts.
        for (let n = 0; n < (img.w * img.h) / 700; n++) {
            const x = Math.floor(hash(n, 12, seed) * img.w), y = Math.floor(hash(n, 13, seed) * img.h);
            if (kind[y * img.w + x] !== 0 || fbm(x / 50, y / 50, seed + 14) < 0.5) continue;
            const c = PAL.flower[hash(n, 15, seed) < 0.7 ? 0 : hash(n, 16, seed) < 0.6 ? 1 : 2];
            for (let f = 0; f < 3; f++) {
                const fx = x + Math.floor(hash(n, 20 + f, seed) * 7) - 3, fy = y + Math.floor(hash(n, 30 + f, seed) * 5) - 2;
                if (kind[fy * img.w + fx] !== 0) continue;
                put(img, fx, fy + 1, PAL.grass[2]); put(img, fx - 1, fy, c); put(img, fx + 1, fy, c); put(img, fx, fy - 1, c); put(img, fx, fy, PAL.flower[1]);
            }
        }
    }

    // ---------------------------------------------------------------------
    // Things that stand on the ground. Each painter gets the cell (cx, cy) and paints into base and/or over.
    // ---------------------------------------------------------------------
    function tree(L, cx, cy, seed, { big = 1, autumn = false, overhead = true, dy = 0, ramp: leafRamp = null } = {}) {
        const x = cx * C + 16 + (hash(cx, cy, seed) - 0.5) * 8, gy = cy * C + 28 + dy;
        const r = (15 + hash(cx, cy, seed + 1) * 5) * big;
        shadow(L.base, x + 6, gy + 1, r * 0.9, 6, 0.42);
        // Trunk and roots.
        const trunk = shape();
        thick(trunk, L.base, x, gy - 14, x, gy, 3.2); thick(trunk, L.base, x - 3, gy, x - 6, gy + 2, 1.4); thick(trunk, L.base, x + 3, gy, x + 6, gy + 1, 1.4);
        fill(L.base, trunk, PAL.wood.slice(0, 6), { tex: 0.5, seed, outline: PAL.wood[0] });
        // Crown: a cluster of leaf masses, in the over layer.
        // The crown goes over people only where someone can walk behind the tree; otherwise it is part of the
        // ground picture, so buildings in front of it still cover it.
        const CL = overhead ? L.over : L.base;
        const crown = shape(), cy0 = gy - 14 - r * 0.85;
        const blobs = 6 + Math.floor(hash(cx, cy, seed + 2) * 3);
        ellipse(crown, CL, x, cy0, r * 0.78, r * 0.7);
        for (let b = 0; b < blobs; b++) {
            const a = (b / blobs) * Math.PI * 2 + hash(cx, cy, seed + b) * 0.6;
            const br = r * (0.42 + hash(cx, cy, seed + 10 + b) * 0.2);
            ellipse(crown, CL, x + Math.cos(a) * r * 0.55, cy0 + Math.sin(a) * r * 0.48, br, br * 0.9);
        }
        const ramp = leafRamp || (autumn ? PAL.leafAutumn : PAL.leaf);
        // Leaf clumps: the shade value plus clumpy noise, so the crown reads as many small leaf masses.
        for (const [i, v] of crown.px) {
            const px = i % CL.w, py = (i / CL.w) | 0;
            const clump = vnoise(px / 3.2, py / 3.2, seed + cx * 7 + cy) - 0.5;
            crown.px.set(i, v * 0.75 + clump * 0.9);
        }
        fill(CL, crown, ramp, { outline: ramp[0], edge: true });
        // A few bright leaf tips on the lit side.
        for (let n = 0; n < r * 1.6; n++) {
            const a = Math.PI * (1.0 + hash(n, cx, seed + cy) * 0.75), d = r * (0.3 + hash(n, cy, seed + 3) * 0.55);
            const px = Math.round(x + Math.cos(a) * d), py = Math.round(cy0 + Math.sin(a) * d * 0.9);
            if (crown.px.has(py * CL.w + px)) { put(CL, px, py, ramp[6]); put(CL, px + 1, py, ramp[5]); }
        }
    }
    function deadTree(L, cx, cy, seed) {
        const x = cx * C + 16, gy = cy * C + 28;
        shadow(L.base, x + 4, gy + 1, 10, 4, 0.35);
        const s = shape();
        thick(s, L.base, x, gy - 18, x, gy, 2.6);
        thick(s, L.base, x - 2, gy, x - 6, gy + 2, 1.2); thick(s, L.base, x + 2, gy, x + 5, gy + 2, 1.2);
        fill(L.base, s, PAL.wood.slice(0, 5), { tex: 0.4, seed, outline: PAL.wood[0] });
        // Bare branches reach up into the over layer.
        const br = shape();
        const limb = (ax, ay, a, len, w, depth) => {
            const bx = ax + Math.cos(a) * len, by = ay + Math.sin(a) * len;
            thick(br, L.over, ax, ay, bx, by, w);
            if (depth > 0) for (const da of [-0.5, 0.45]) limb(bx, by, a + da + (hash(ax | 0, ay | 0, seed + depth) - 0.5) * 0.4, len * 0.68, Math.max(0.6, w * 0.65), depth - 1);
        };
        thick(br, L.over, x, gy - 30, x, gy - 14, 2.2);
        limb(x, gy - 28, -Math.PI / 2 - 0.5, 9, 1.6, 3); limb(x, gy - 26, -Math.PI / 2 + 0.55, 10, 1.6, 3); limb(x, gy - 30, -Math.PI / 2, 7, 1.3, 2);
        fill(L.over, br, PAL.wood.slice(0, 5), { tex: 0.3, seed, outline: PAL.wood[0] });
    }
    function rock(L, cx, cy, seed, { big = false } = {}) {
        const x = cx * C + 16, gy = cy * C + 26;
        const n = big ? 1 : 2 + Math.floor(hash(cx, cy, seed) * 2);
        shadow(L.base, x + 4, gy + 3, big ? 15 : 13, 5, 0.4);
        for (let k = 0; k < n; k++) {
            const s = shape();
            const ox = big ? 0 : (k - (n - 1) / 2) * 9 + (hash(k, cx, seed) - 0.5) * 4, oy = big ? 0 : (hash(k, cy, seed) - 0.5) * 5;
            const rx = big ? 13 : 6 + hash(k, cx + cy, seed) * 4, ry = big ? 11 : 5 + hash(k, cy, seed + 1) * 3;
            if (big) poly(s, L.base, [[x - 13, gy - 16], [x + 12, gy - 18], [x + 14, gy + 1], [x - 12, gy + 2]], (px, py) => ((px - x) / 14) * LX + ((py - gy + 8) / 10) * LY);
            else ellipse(s, L.base, x + ox, gy - ry + 2 + oy, rx, ry);
            fill(L.base, s, PAL.stone, { tex: 0.45, seed: seed + k, outline: PAL.stone[0] });
            // Moss on top.
            for (const [i, v] of s.px) { const px = i % L.base.w, py = (i / L.base.w) | 0; if (v > 0.3 && vnoise(px / 3, py / 3, seed + 40) > 0.6) put(L.base, px, py, PAL.moss[v > 0.6 ? 2 : 1]); }
        }
        if (big) for (let i = 0; i < 4; i++) rectFill(L.base, x - 10 + i * 6, gy - 9 + (i % 2), 4, 1, PAL.stone[1]);
    }
    function bush(L, cx, cy, seed) {
        const x = cx * C + 16, gy = cy * C + 28;
        shadow(L.base, x + 3, gy, 14, 4, 0.4);
        const s = shape();
        for (let b = 0; b < 5; b++) ellipse(s, L.base, x + (b - 2) * 5, gy - 8 - (b % 2) * 4, 7, 6.5);
        for (const [i, v] of s.px) s.px.set(i, v * 0.7 + (vnoise((i % L.base.w) / 3, ((i / L.base.w) | 0) / 3, seed) - 0.5));
        fill(L.base, s, PAL.leaf, { outline: PAL.leaf[0] });
    }
    function stump(L, cx, cy, seed) {
        const x = cx * C + 16, gy = cy * C + 26;
        shadow(L.base, x + 3, gy + 1, 10, 3.5);
        const side = shape(); box(side, L.base, x - 7, gy - 8, 14, 9, 0);
        for (const [i] of side.px) side.px.set(i, (((i % L.base.w) - x) / 7) * LX * 1.2);
        fill(L.base, side, PAL.wood.slice(1, 6), { tex: 0.6, seed, scale: 1.5, outline: PAL.wood[0] });
        const top = shape(); ellipse(top, L.base, x, gy - 8, 7, 3);
        fill(L.base, top, PAL.straw, { edge: false });
        put(L.base, x, gy - 8, PAL.wood[3]); put(L.base, x - 3, gy - 8, PAL.straw[0]);
    }
    function barrel(L, x, gy, seed) {
        shadow(L.base, x + 3, gy, 9, 3.5);
        const s = shape(); ellipse(s, L.base, x, gy - 9, 7, 9.5); box(s, L.base, x - 7, gy - 15, 14, 12);
        for (const [i] of s.px) s.px.set(i, (((i % L.base.w) + 0.5 - x) / 7) * LX * 1.3);
        fill(L.base, s, PAL.wood.slice(1, 7), { tex: 0.25, seed, scale: 1, outline: PAL.wood[0] });
        for (const hy of [gy - 15, gy - 4]) for (let i = -6; i <= 6; i++) if (alphaAt(L.base, x + i, hy)) put(L.base, x + i, hy, PAL.iron[i < 0 ? 3 : 2]);
        const lid = shape(); ellipse(lid, L.base, x, gy - 18, 6.5, 2.6); fill(L.base, lid, PAL.wood.slice(2, 7), { edge: false });
    }
    function crate(L, x, gy, seed, tilt = 0) {
        shadow(L.base, x + 3, gy, 11, 3.5);
        const front = shape(); box(front, L.base, x - 9, gy - 12, 18, 12, -0.1);
        fill(L.base, front, PAL.wood.slice(1, 6), { tex: 0.5, seed, scale: 1, outline: PAL.wood[0] });
        const top = shape(); poly(top, L.base, [[x - 9, gy - 12], [x + 9, gy - 12], [x + 7 + tilt, gy - 17], [x - 7 + tilt, gy - 17]], 0.7);
        fill(L.base, top, PAL.wood.slice(2, 7), { tex: 0.4, seed: seed + 1, scale: 1, outline: PAL.wood[0] });
        for (let i = -8; i <= 8; i++) { put(L.base, x + i, gy - 7, PAL.wood[1]); }
        for (let j = 0; j < 12; j++) { put(L.base, x - 9 + Math.round((j / 12) * 17), gy - 1 - j, PAL.wood[5]); }
    }
    function anvil(L, cx, cy, seed) {
        const x = cx * C + 16, gy = cy * C + 26;
        shadow(L.base, x + 3, gy + 1, 11, 3.5);
        const st = shape(); box(st, L.base, x - 5, gy - 8, 10, 9); fill(L.base, st, PAL.wood.slice(1, 6), { tex: 0.5, seed, outline: PAL.wood[0] });
        const s = shape();
        poly(s, L.base, [[x - 9, gy - 15], [x + 6, gy - 15], [x + 11, gy - 13], [x + 6, gy - 11], [x + 3, gy - 11], [x + 4, gy - 8], [x - 4, gy - 8], [x - 3, gy - 11], [x - 9, gy - 11]], (px, py) => ((py - gy + 13) / 3) * LY * 0.8);
        fill(L.base, s, PAL.iron, { outline: PAL.iron[0] });
        rectFill(L.base, x - 8, gy - 15, 13, 1, PAL.iron[4]);
    }
    function cart(L, cx, cy, seed) {
        const x = cx * C + 16, gy = cy * C + 26;
        shadow(L.base, x + 4, gy + 2, 22, 5, 0.4);
        // Bed of the cart, tipped down at the front where a wheel is missing.
        const bed = shape();
        poly(bed, L.base, [[x - 18, gy - 18], [x + 12, gy - 14], [x + 12, gy - 6], [x - 18, gy - 10]], (px, py) => (py - gy + 12) * -0.12);
        fill(L.base, bed, PAL.wood.slice(1, 7), { tex: 0.5, seed, scale: 1.5, outline: PAL.wood[0] });
        for (let i = 0; i < 4; i++) for (let px = x - 17; px < x + 12; px++) { const py = Math.round(gy - 16 + i * 2.6 + ((px - x + 18) / 30) * 4); if (alphaAt(L.base, px, py)) put(L.base, px, py, PAL.wood[2]); }
        const shaft = shape(); thick(shaft, L.base, x + 12, gy - 9, x + 24, gy - 1, 1.2); thick(shaft, L.base, x + 12, gy - 12, x + 25, gy - 5, 1.2);
        fill(L.base, shaft, PAL.wood.slice(1, 6), { outline: PAL.wood[0] });
        // Wheel.
        const wx = x - 6, wy = gy - 6;
        const wheel = shape();
        for (let a = 0; a < 360; a += 4) { const t = (a * Math.PI) / 180; sset(wheel, L.base, wx + Math.cos(t) * 7, wy + Math.sin(t) * 7, Math.cos(t) * LX + Math.sin(t) * LY); sset(wheel, L.base, wx + Math.cos(t) * 6, wy + Math.sin(t) * 6, 0); }
        for (let a = 0; a < 360; a += 60) thick(wheel, L.base, wx, wy, wx + Math.cos((a * Math.PI) / 180) * 6, wy + Math.sin((a * Math.PI) / 180) * 6, 0.6, -0.2);
        fill(L.base, wheel, PAL.wood.slice(0, 6), { outline: PAL.wood[0] });
        put(L.base, wx, wy, PAL.iron[3]);
        // A loose plank beside it.
        const pl = shape(); thick(pl, L.base, x + 4, gy + 4, x + 18, gy + 1, 1.3); fill(L.base, pl, PAL.wood.slice(2, 7), { outline: PAL.wood[0] });
    }
    function scarecrow(L, cx, cy, seed) {
        const x = cx * C + 16, gy = cy * C + 28;
        shadow(L.base, x + 3, gy, 8, 3);
        const post = shape(); thick(post, L.base, x, gy - 30, x, gy, 1.3); thick(post, L.base, x - 12, gy - 22, x + 12, gy - 22, 1.1);
        fill(L.base, post, PAL.wood.slice(1, 6), { outline: PAL.wood[0] });
        const coat = shape(); poly(coat, L.base, [[x - 11, gy - 24], [x + 11, gy - 24], [x + 7, gy - 8], [x + 3, gy - 10], [x, gy - 7], [x - 3, gy - 10], [x - 7, gy - 8]], (px) => ((px - x) / 10) * LX);
        fill(L.base, coat, R(['#2a2218', '#3c3120', '#52442b', '#665638']), { tex: 0.5, seed, outline: PAL.wood[0] });
        for (const sx of [-12, 12]) for (let i = 0; i < 3; i++) put(L.base, x + sx + (sx < 0 ? -i : i), gy - 21 + i, PAL.straw[3]);
        const head = shape(); ellipse(head, L.base, x, gy - 28, 5, 5); fill(L.base, head, PAL.straw.slice(1), { outline: PAL.wood[0] });
        put(L.base, x - 2, gy - 28, PAL.wood[0]); put(L.base, x + 2, gy - 28, PAL.wood[0]);
        const hat = shape(); ellipse(hat, L.base, x, gy - 32, 8, 2.2); box(hat, L.base, x - 4, gy - 37, 8, 5, 0.2); fill(L.base, hat, PAL.straw, { outline: PAL.wood[0] });
        // Crows on the arms.
        for (const sx of [-9, 8]) { rectFill(L.base, x + sx, gy - 27, 3, 3, [14, 14, 18]); put(L.base, x + sx + (sx < 0 ? -1 : 3), gy - 26, [14, 14, 18]); put(L.base, x + sx + 1, gy - 26, [200, 60, 50]); }
    }

    // Fences: posts and two rails, joined to fence neighbours; some rails are broken.
    function fence(L, map, nameAt, cx, cy, seed) {
        const x0 = cx * C, gy = cy * C + 24;
        const isF = (x, y) => nameAt(map, x, y) === 'fence';
        const s = shape();
        const posts = [x0 + 4, x0 + 20];
        for (const px of posts) { box(s, L.base, px, gy - 16, 3, 18, 0); shadow(L.base, px + 3, gy + 2, 3, 1.5, 0.3); }
        const left = isF(cx - 1, cy) ? x0 : x0 + 4, right = isF(cx + 1, cy) ? x0 + C : x0 + 23;
        for (const ry of [gy - 13, gy - 7]) {
            const broken = hash(cx, ry, seed) < 0.18;
            const end = broken ? left + Math.floor((right - left) * 0.5) : right;
            box(s, L.base, left, ry, end - left, 2, 0.3);
            if (broken) { const b = shape(); thick(b, L.base, end - 2, ry + 1, end + 6, ry + 9, 0.9); fill(L.base, b, PAL.wood.slice(1, 6), { outline: PAL.wood[0] }); }
        }
        for (const [i] of s.px) { const py = (i / L.base.w) | 0; s.px.set(i, s.px.get(i) + (vnoise(i % L.base.w, py / 4, seed) - 0.5) * 0.8); }
        fill(L.base, s, PAL.wood.slice(1, 7), { outline: PAL.wood[0] });
        for (const px of posts) rectFill(L.base, px, gy - 16, 3, 1, PAL.wood[6]);
    }

    // Dry-stone wall: rows of rough stones with a capping course, moss, and a pillar at each opening.
    function drystone(L, map, nameAt, cx, cy, seed) {
        const x0 = cx * C, gy = cy * C + 30;
        const isW = (x, y) => nameAt(map, x, y) === 'drystone_wall';
        const H = 18 + Math.floor(hash(cx, cy, seed) * 3) - (hash(cx, cy, seed + 1) < 0.2 ? 6 : 0);
        shadow(L.base, x0 + 18, gy + 2, 18, 3, 0.35);
        let y = gy;
        for (let row = 0; y > gy - H; row++) {
            const rh = 5 + Math.floor(hash(cx, row, seed + 2) * 2);
            let x = x0 - (row % 2 ? 4 : 0);
            while (x < x0 + C) {
                const sw = 7 + Math.floor(hash(x, row + cy * 9, seed + 3) * 6);
                const s = shape();
                const sx = Math.max(x, x0), ex = Math.min(x + sw - 1, x0 + C);
                if (ex - sx >= 2) {
                    ellipse(s, L.base, (sx + ex) / 2, y - rh / 2, (ex - sx) / 2 + 0.5, rh / 2 + 0.4);
                    fill(L.base, s, PAL.stone, { tex: 0.5, seed: seed + x, outline: PAL.stone[0], scale: 2 });
                }
                x += sw;
            }
            y -= rh;
        }
        // Caps: flatter, lighter stones on top.
        for (let x = x0; x < x0 + C; x += 8) { const s = shape(); ellipse(s, L.base, x + 4, y - 1, 5, 2.6, 0.4); fill(L.base, s, PAL.stone.slice(2), { tex: 0.4, seed: seed + x, outline: PAL.stone[0] }); }
        for (let n = 0; n < 7; n++) { const px = x0 + Math.floor(hash(n, cx, seed + 5) * C), py = y + Math.floor(hash(n, cy, seed + 6) * H); if (alphaAt(L.base, px, py)) put(L.base, px, py, PAL.moss[1 + (n % 2)]); }
        // Pillars beside an opening in the wall.
        for (const [dx, side] of [[-1, 0], [1, C - 10]]) if (!isW(cx + dx, cy) && nameAt(map, cx + dx, cy) !== 'tree' && nameAt(map, cx + dx, cy) !== 'dead_tree') {
            const s = shape(); box(s, L.base, x0 + side, gy - 27, 10, 27, 0);
            for (const [i] of s.px) s.px.set(i, (((i % L.base.w) - x0 - side - 5) / 5) * LX);
            fill(L.base, s, PAL.stone, { tex: 0.6, seed: seed + side, scale: 2, outline: PAL.stone[0] });
            for (let r = gy - 24; r < gy; r += 5) rectFill(L.base, x0 + side + 1, r, 8, 1, PAL.stone[1]);
            const cap = shape(); box(cap, L.base, x0 + side - 1, gy - 30, 12, 4, 0.5); fill(L.base, cap, PAL.stone.slice(2), { outline: PAL.stone[0] });
        }
    }

    function well(L, cx, cy, seed) {
        const x = cx * C + 16, gy = cy * C + 28;
        shadow(L.base, x + 4, gy + 1, 16, 4.5, 0.45);
        // The stone ring.
        const ring = shape();
        ellipse(ring, L.base, x, gy - 9, 14, 6); box(ring, L.base, x - 14, gy - 9, 29, 9);
        for (const [i] of ring.px) { const px = i % L.base.w; ring.px.set(i, ((px - x) / 14) * LX * 1.2); }
        fill(L.base, ring, PAL.stone, { tex: 0.6, seed, scale: 2, outline: PAL.stone[0] });
        for (let r = gy - 6; r < gy; r += 4) for (let px = x - 13; px <= x + 13; px++) if ((px + r) % 7 === 0) put(L.base, px, r, PAL.stone[1]);
        for (let r = gy - 6; r < gy; r += 4) for (let px = x - 13; px <= x + 13; px++) put(L.base, px, r, PAL.stone[2], 0.5);
        const top = shape(); ellipse(top, L.base, x, gy - 10, 12, 4.6); fill(L.base, top, PAL.stone.slice(3), { edge: false });
        const hole = shape(); ellipse(hole, L.base, x, gy - 10, 9, 3); fill(L.base, hole, PAL.water.slice(0, 2), { edge: false });
        // Frame, beam and a little slate roof (the roof is over people walking behind it).
        const fr = shape();
        thick(fr, L.base, x - 12, gy - 10, x - 12, gy - 34, 1.4); thick(fr, L.base, x + 12, gy - 10, x + 12, gy - 34, 1.4);
        fill(L.base, fr, PAL.wood.slice(1, 6), { outline: PAL.wood[0] });
        const beam = shape(); thick(beam, L.over, x - 13, gy - 30, x + 13, gy - 30, 1); fill(L.over, beam, PAL.wood.slice(1, 6), { outline: PAL.wood[0] });
        for (let j = gy - 29; j < gy - 16; j++) put(L.base, x + 3, j, PAL.straw[1]);
        const bucket = shape(); box(bucket, L.base, x + 1, gy - 17, 5, 5); fill(L.base, bucket, PAL.wood.slice(2, 6), { outline: PAL.wood[0] });
        const roof = shape();
        poly(roof, L.over, [[x - 17, gy - 33], [x, gy - 44], [x + 17, gy - 33], [x + 15, gy - 30], [x, gy - 40], [x - 15, gy - 30]], (px, py) => (px < x ? 0.5 : -0.4) + (py - gy + 36) * -0.03);
        fill(L.over, roof, PAL.slate, { tex: 0.4, seed, scale: 1.5, outline: PAL.slate[0] });
        // Pails beside it.
        barrel(L, x - 20, gy + 2, seed + 4);
    }

    function dock(L, map, nameAt, cx, cy, seed) {
        const x0 = cx * C, y0 = cy * C;
        const isD = (x, y) => nameAt(map, x, y) === 'dock';
        for (let px = x0; px < x0 + C; px += 6) {
            const s = shape(); box(s, L.base, px, y0, 5, C, 0);
            for (const [i] of s.px) s.px.set(i, (vnoise(px, ((i / L.base.w) | 0) / 6, seed) - 0.5) * 0.8 + (((i % L.base.w) - px - 2) / 3) * LX);
            fill(L.base, s, PAL.wood.slice(1, 7), { outline: PAL.wood[0], edge: false });
            if (hash(px, cy, seed) < 0.12) rectFill(L.base, px + 1, y0 + 12, 3, 3, PAL.water[0]);
        }
        for (let py = y0; py < y0 + C; py += 16) for (let px = x0; px < x0 + C; px++) put(L.base, px, py, PAL.wood[1]);
        if (!isD(cx, cy + 1)) for (const px of [x0 + 2, x0 + C - 5]) { const s = shape(); box(s, L.base, px, y0 + C - 6, 4, 10); fill(L.base, s, PAL.wood.slice(0, 4), { outline: PAL.wood[0] }); }
        if (!isD(cx - 1, cy)) for (let py = y0; py < y0 + C; py++) put(L.base, x0 - 1, py, PAL.shadow, 0.5);
    }
    function footbridge(L, map, nameAt, cx, cy, seed) {
        const x0 = cx * C, y0 = cy * C;
        for (let py = y0; py < y0 + C; py += 5) {
            const s = shape(); box(s, L.base, x0 + 1, py, C - 2, 4, 0);
            for (const [i] of s.px) s.px.set(i, (vnoise((i % L.base.w) / 6, py, seed) - 0.5) * 0.8 + 0.1);
            fill(L.base, s, PAL.wood.slice(1, 7), { outline: PAL.wood[0], edge: false });
        }
        for (const px of [x0 - 1, x0 + C - 2]) {
            const s = shape(); box(s, L.base, px, y0, 3, C, 0.2); fill(L.base, s, PAL.wood.slice(0, 5), { outline: PAL.wood[0] });
            for (let py = y0 + 2; py < y0 + C; py += 14) { const p = shape(); box(p, L.base, px - 1, py - 6, 5, 8, 0.4); fill(L.base, p, PAL.wood.slice(1, 6), { outline: PAL.wood[0] }); }
        }
    }
    function weeds(L, kind, cx, cy, seed) {
        const x0 = cx * C, y0 = cy * C;
        for (let n = 0; n < 40; n++) {
            const x = x0 + Math.floor(hash(n, cx, seed + cy) * C), y = y0 + 6 + Math.floor(hash(n, cy, seed + cx) * (C - 4));
            const h = 6 + Math.floor(hash(n, 3, seed + cx * cy) * 7), lean = (hash(n, 4, seed + cx) - 0.5) * 4;
            const dry = hash(n, 5, seed + cy) < 0.45;
            const ramp = dry ? PAL.dry : PAL.grass.slice(2);
            for (let j = 0; j < h; j++) {
                const px = Math.round(x + (lean * j) / h);
                put(L.base, px, y - j, ramp[Math.min(ramp.length - 1, Math.floor((j / h) * ramp.length))]);
                if (j === 0) put(L.base, px + 1, y, PAL.grass[0], 0.6);
            }
            if (dry && hash(n, 6, seed) < 0.4) { const px = Math.round(x + lean); put(L.base, px, y - h, PAL.straw[3]); put(L.base, px + 1, y - h + 1, PAL.straw[2]); }
        }
    }

    // ---------------------------------------------------------------------
    // Buildings
    // ---------------------------------------------------------------------
    /** Bounding box of the connected cells whose names are in `names`, starting at (x, y). */
    function blockOf(map, nameAt, x, y, names, seen) {
        const q = [[x, y]]; let x0 = x, y0 = y, x1 = x, y1 = y;
        seen.add(`${x},${y}`);
        while (q.length) {
            const [cx, cy] = q.pop();
            x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`;
                if (!seen.has(k) && names.has(nameAt(map, nx, ny))) { seen.add(k); q.push([nx, ny]); }
            }
        }
        return { x0, y0, x1, y1 };
    }

    /** Rough masonry: irregular stones in courses, inside a rectangle. */
    function masonry(img, x, y, w, h, seed, ramp = PAL.stone) {
        rectFill(img, x, y, w, h, ramp[1]);
        let yy = y;
        for (let row = 0; yy < y + h; row++) {
            const rh = 4 + Math.floor(hash(row, x, seed) * 3);
            let xx = x - Math.floor(hash(row, y, seed + 1) * 6);
            while (xx < x + w) {
                const sw = 5 + Math.floor(hash(xx, row, seed + 2) * 7);
                const s = shape();
                const sx = Math.max(xx + 1, x), ex = Math.min(xx + sw - 1, x + w);
                const ey = Math.min(yy + rh - 1, y + h);
                if (ex > sx && ey > yy) {
                    for (let j = yy; j < ey; j++) for (let i = sx; i < ex; i++) sset(s, img, i, j, ((i - sx) / Math.max(1, ex - sx) - 0.5) * LX * 1.6 + ((j - yy) / Math.max(1, ey - yy) - 0.5) * LY * 1.4);
                    fill(img, s, ramp.slice(1), { tex: 0.5, seed: seed + xx * 3 + row, scale: 1.5, edge: false });
                }
                xx += sw;
            }
            yy += rh;
        }
    }
    /** Slate roof courses over a polygon area; `hole(x, y)` true where the roof has fallen in. */
    function slates(img, pts, seed, hole = () => false, tone = 0) {
        const area = shape(); poly(area, img, pts, 0);
        for (const [i] of area.px) {
            const x = i % img.w, y = (i / img.w) | 0;
            if (hole(x, y)) continue;
            const course = Math.floor(y / 4), off = (course % 2) * 3;
            const col = Math.floor((x + off) / 6);
            const inRow = y % 4, inCol = (x + off) % 6;
            let t = 0.55 + (hash(col, course, seed) - 0.5) * 0.35 + tone;
            if (inRow === 3) t = 0.08;                                    // the shadow under each course
            else if (inCol === 5) t -= 0.25;                              // the gap between slates
            else if (inRow === 0) t += 0.15;                              // the lit lower edge of the course above
            if (hash(col, course, seed + 7) < 0.04) t = 0.12;             // a missing slate
            put(img, x, y, PAL.slate[Math.max(0, Math.min(PAL.slate.length - 1, Math.floor(t * PAL.slate.length)))]);
            if (vnoise(x / 4, y / 4, seed + 30) > 0.78) put(img, x, y, PAL.moss[(x + y) % 2 ? 1 : 2]);
        }
        return area;
    }
    function windowAt(img, x, y, w, h, seed, { boarded = false, broken = false } = {}) {
        rectFill(img, x - 2, y - 2, w + 4, h + 4, PAL.stone[5]);                          // stone surround
        rectFill(img, x - 2, y + h + 1, w + 4, 2, PAL.stone[6]);                          // sill
        rectFill(img, x - 1, y - 1, w + 2, h + 2, PAL.wood[1]);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(img, x + i, y + j, (i + j) % 7 === 0 && !broken ? [44, 52, 64] : [16, 18, 26]);
        rectFill(img, x + Math.floor(w / 2) - 1, y, 2, h, PAL.wood[3]); rectFill(img, x, y + Math.floor(h / 2) - 1, w, 2, PAL.wood[3]);
        if (broken) for (let i = 0; i < 4; i++) put(img, x + 2 + i, y + 2 + (i % 2), [70, 84, 96]);
        if (boarded) for (const [a, b] of [[0, 3], [0, h - 5]]) {
            const s = shape(); thick(s, img, x - 3, y + a + (b > 3 ? 2 : 0), x + w + 3, y + b, 1.4, 0.2);
            fill(img, s, PAL.wood.slice(2, 7), { outline: PAL.wood[0] });
        }
    }
    function ivy(img, x, y, w, h, seed, density = 0.5) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const px = x + i, py = y + j;
            const v = fbm(px / 7, py / 7, seed) + (1 - j / h) * -0.1;
            if (v > 1 - density * 0.62) {
                const t = vnoise(px / 2, py / 2, seed + 3);
                put(img, px, py, PAL.leaf[t > 0.66 ? 5 : t > 0.33 ? 4 : 3]);
                if (t < 0.15) put(img, px, py, PAL.leaf[2]);
            }
        }
    }

    function farmhouse(L, b, seed) {
        // The house's own cells: b.x0..b.x1, b.y0..b.y1 (roof rows over a wall row). It is drawn taller than its
        // footprint: two storeys under a slate roof that reaches up over the tree line behind.
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, base = (b.y1 + 1) * C;
        const W = X1 - X0;
        const wallTop = base - 70, roofTop = Math.max(0, base - 132);
        const img = L.base;
        shadow(img, X0 + W / 2 + 8, base + 2, W / 2 + 10, 8, 0.45);
        // Upper storey: timber frame with stone infill; ground storey: rough masonry.
        masonry(img, X0 + 4, base - 40, W - 8, 40, seed);
        masonry(img, X0 + 4, wallTop, W - 8, 32, seed + 1, PAL.plaster);
        // Timber frame.
        const timber = (x, y, w, h) => { const s = shape(); box(s, img, x, y, w, h, 0); fill(img, s, PAL.wood.slice(1, 6), { tex: 0.5, seed: x + y, scale: 1.5, outline: PAL.wood[0] }); };
        timber(X0 + 4, base - 42, W - 8, 4);
        timber(X0 + 4, wallTop, W - 8, 3);
        for (let x = X0 + 4; x < X1 - 6; x += 32) timber(x, wallTop, 4, 30);
        timber(X1 - 8, wallTop, 4, 70); timber(X0 + 4, wallTop, 4, 70);
        for (let x = X0 + 8; x < X1 - 40; x += 64) { const s = shape(); thick(s, img, x + 4, wallTop + 28, x + 28, wallTop + 4, 1.4); fill(img, s, PAL.wood.slice(1, 6), { outline: PAL.wood[0] }); }
        // Upper windows, over the ground-floor ones.
        const winX = [X0 + (11 - b.x0) * C + 8, X0 + (17 - b.x0) * C + 8];
        winX.forEach((x, i) => windowAt(img, Math.min(Math.max(x, X0 + 10), X1 - 26), wallTop + 8, 14, 14, seed + 50 + i, { broken: i === 1 }));
        // Front door (the house's doorway cell), with a step.
        const doorCell = L.doorX != null ? L.doorX : Math.floor((b.x0 + b.x1) / 2);
        const dx = doorCell * C + 4, dw = C - 8;
        rectFill(img, dx - 3, base - 38, dw + 6, 38, PAL.stone[5]);
        rectFill(img, dx - 3, base - 40, dw + 6, 3, PAL.stone[6]);
        for (let j = 0; j < 34; j++) for (let i = 0; i < dw; i++) {
            const plank = Math.floor(i / 6), t = 0.25 + hash(plank, 0, seed) * 0.25 + (i % 6 === 0 ? -0.15 : 0);
            put(img, dx + i, base - 34 + j, PAL.wood[Math.max(0, Math.floor(t * 7))]);
        }
        rectFill(img, dx + dw - 8, base - 34, 6, 34, [12, 10, 14]);                         // a plank missing: dark inside
        rectFill(img, dx + 2, base - 22, 2, 2, PAL.iron[4]);
        const step = shape(); box(step, img, dx - 6, base - 2, dw + 12, 5, 0.3); fill(img, step, PAL.stone.slice(2), { tex: 0.5, seed, outline: PAL.stone[0] });
        // Ground-floor windows on the 'house_window' cells.
        for (const wx of L.windows || []) windowAt(img, wx * C + 9, base - 32, 14, 16, seed + wx, { boarded: wx % 2 === 1 });
        // Ivy up the left of the house and round the door.
        ivy(img, X0 + 2, wallTop - 4, 50, 74, seed + 70, 0.75);
        ivy(img, dx - 14, base - 46, 12, 46, seed + 71, 0.55);
        ivy(img, X1 - 120, wallTop + 30, 60, 40, seed + 72, 0.45);
        // Roof: a front gable over the left wing, the main roof, and a collapsed stretch to the right with bare rafters.
        const roofBottom = wallTop + 2;
        const gx0 = X0 - 4, gx1 = X0 + Math.round(W * 0.42);
        const collapsed = (x, y) => x > X0 + W * 0.52 && x < X0 + W * 0.86 && y > roofTop + 14 && y < roofBottom - 8 && fbm(x / 16, y / 14, seed + 80) > 0.38;
        slates(img, [[X0 - 6, roofBottom], [X1 + 6, roofBottom], [X1 - 6, roofTop + 12], [X0 + 6, roofTop + 12]], seed + 81, collapsed);
        // Inside the hole: darkness and rafters.
        for (let y = roofTop + 12; y < roofBottom; y++) for (let x = X0; x < X1; x++) if (collapsed(x, y)) put(img, x, y, (x + y) % 9 ? [14, 12, 16] : [22, 18, 20]);
        for (let x = X0 + Math.round(W * 0.54); x < X0 + W * 0.86; x += 14) { const s = shape(); thick(s, img, x, roofBottom - 4, x + 9, roofTop + 16, 1.6); fill(img, s, PAL.wood.slice(1, 6), { outline: PAL.wood[0] }); }
        { const s = shape(); thick(s, img, X0 + W * 0.52, roofTop + 30, X0 + W * 0.88, roofTop + 26, 1.4); thick(s, img, X0 + W * 0.6, roofBottom - 10, X0 + W * 0.74, roofTop + 40, 1.3); fill(img, s, PAL.wood.slice(1, 6), { outline: PAL.wood[0] }); }
        // Ridge.
        const ridge = shape(); box(ridge, img, X0 + 6, roofTop + 9, W - 12, 4, 0.3); fill(img, ridge, PAL.slate.slice(1), { outline: PAL.slate[0] });
        // Gable: a triangle of roof over the left wing, with its own timbered face.
        const apex = [(gx0 + gx1) / 2, roofTop + 2];
        slates(img, [[gx0, roofBottom + 2], [apex[0], apex[1]], [gx1, roofBottom + 2]], seed + 82, () => false, 0.1);
        const face = shape(); poly(face, img, [[gx0 + 14, roofBottom], [apex[0], apex[1] + 16], [gx1 - 14, roofBottom]], 0);
        for (const [i] of face.px) face.px.delete(i);
        const gface = [[gx0 + 16, roofBottom + 1], [apex[0], apex[1] + 18], [gx1 - 16, roofBottom + 1]];
        const gf = shape(); poly(gf, img, gface, 0);
        for (const [i] of gf.px) put(img, i % img.w, (i / img.w) | 0, PAL.plaster[2 + (hash(i, 0, seed) < 0.3 ? 1 : 0)]);
        windowAt(img, apex[0] - 6, roofBottom - 22, 12, 12, seed + 90, {});
        for (const [a, c] of [[gface[0], gface[1]], [gface[1], gface[2]]]) { const s = shape(); thick(s, img, a[0], a[1], c[0], c[1], 1.6); fill(img, s, PAL.wood.slice(1, 6), { outline: PAL.wood[0] }); }
        // Bargeboards along the gable edges.
        for (const [a, c] of [[[gx0, roofBottom + 2], apex], [apex, [gx1, roofBottom + 2]]]) { const s = shape(); thick(s, img, a[0], a[1], c[0], c[1], 1.5, 0.3); fill(img, s, PAL.wood.slice(2, 7), { outline: PAL.wood[0] }); }
        // Eaves: a dark line under the roof.
        for (let x = X0 - 4; x < X1 + 4; x++) { put(img, x, roofBottom, PAL.slate[0]); put(img, x, roofBottom + 1, PAL.shadow, 0.5); }
        // Chimney at the right end.
        const chx = X1 - 44, chTop = Math.max(0, roofTop - 6);
        const ch = shape(); box(ch, img, chx, chTop, 18, roofBottom - 26 - chTop);
        for (const [i] of ch.px) ch.px.set(i, (((i % img.w) - chx - 9) / 9) * LX);
        masonry(img, chx, chTop, 18, roofBottom - 26 - chTop, seed + 95);
        rectFill(img, chx - 2, chTop, 22, 4, PAL.stone[5]); rectFill(img, chx - 2, chTop + 4, 22, 1, PAL.stone[1]);
        for (let y = chTop; y < roofBottom - 26; y++) { put(img, chx - 1, y, PAL.stone[0]); put(img, chx + 18, y, PAL.stone[0]); }
        // Fallen slates and rubble at the right-hand corner.
        for (let n = 0; n < 9; n++) { const s = shape(); ellipse(s, img, X1 - 6 + hash(n, 1, seed) * 26, base - 4 + hash(n, 2, seed) * 14, 3 + hash(n, 3, seed) * 3, 2.4); fill(img, s, n % 3 ? PAL.stone : PAL.slate, { outline: PAL.stone[0] }); }
        // Walls get a dark outline.
        for (let y = wallTop; y < base; y++) { put(img, X0 + 3, y, PAL.stone[0]); put(img, X1 - 4, y, PAL.stone[0]); }
    }

    function smithy(L, b, seed) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, base = (b.y1 + 1) * C, W = X1 - X0;
        const img = L.base;
        const wallTop = base - 40, roofTop = (b.y0) * C - 8;
        shadow(img, X0 + W / 2 + 8, base + 2, W / 2 + 8, 6, 0.42);
        // A stone forge wall on the left, timber planks elsewhere, the door in the middle.
        masonry(img, X0 + 2, wallTop, 40, 40, seed);
        for (let x = X0 + 42; x < X1 - 2; x += 5) {
            const s = shape(); box(s, img, x, wallTop, 5, 40, 0);
            for (const [i] of s.px) s.px.set(i, (vnoise(x, ((i / img.w) | 0) / 7, seed) - 0.5) * 0.9 + (((i % img.w) - x - 2) / 3) * LX * 0.6);
            fill(img, s, PAL.wood.slice(1, 6), { outline: PAL.wood[0], edge: false });
        }
        const dx = (L.shedDoor != null ? L.shedDoor : Math.floor((b.x0 + b.x1) / 2)) * C + 4;
        rectFill(img, dx - 2, base - 34, C - 4, 34, PAL.wood[2]);
        rectFill(img, dx, base - 32, C - 8, 32, [12, 10, 14]);
        rectFill(img, dx + 2, base - 32, 6, 32, PAL.wood[3]);                                 // the door, ajar
        rectFill(img, dx + 2, base - 32, 1, 32, PAL.wood[5]);
        // Glow of an old forge through a gap in the stone.
        rectFill(img, X0 + 14, base - 16, 8, 6, [40, 20, 14]); rectFill(img, X0 + 16, base - 14, 4, 3, [110, 50, 22]);
        // Roof: slates, sagging, with a hole near the right end.
        const roofBottom = wallTop + 2;
        const hole = (x, y) => x > X0 + W * 0.62 && x < X0 + W * 0.84 && y > roofTop + 10 && y < roofBottom - 6 && fbm(x / 10, y / 10, seed + 5) > 0.42;
        slates(img, [[X0 - 6, roofBottom], [X1 + 6, roofBottom], [X1 - 2, roofTop + 4], [X0 + 2, roofTop + 4]], seed + 6, hole);
        for (let y = roofTop; y < roofBottom; y++) for (let x = X0; x < X1; x++) if (hole(x, y)) put(img, x, y, [14, 12, 16]);
        for (let x = X0 + W * 0.62; x < X0 + W * 0.84; x += 11) { const s = shape(); thick(s, img, x, roofBottom - 3, x + 9, roofTop + 12, 1.2); fill(img, s, PAL.wood.slice(1, 6), { outline: PAL.wood[0] }); }
        const ridge = shape(); box(ridge, img, X0 + 2, roofTop + 2, W - 4, 3, 0.3); fill(img, ridge, PAL.slate.slice(1), { outline: PAL.slate[0] });
        for (let x = X0 - 6; x < X1 + 6; x++) { put(img, x, roofBottom, PAL.slate[0]); put(img, x, roofBottom + 1, PAL.shadow, 0.5); }
        // A short forge chimney.
        masonry(img, X0 + 12, roofTop - 10, 14, 26, seed + 9);
        rectFill(img, X0 + 10, roofTop - 12, 18, 3, PAL.stone[5]);
        // Corner posts.
        for (const px of [X0 + 1, X1 - 5]) { const s = shape(); box(s, img, px, wallTop - 2, 4, 42); fill(img, s, PAL.wood.slice(0, 5), { outline: PAL.wood[0] }); }
        ivy(img, X1 - 30, wallTop + 6, 26, 34, seed + 12, 0.5);
    }

    // ---------------------------------------------------------------------
    // The scene
    // ---------------------------------------------------------------------
    const scenes = {
        homestead(map, nameAt) {
            const src = map;
            const cw = src.tiles[0].length, ch = src.tiles.length;
            const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C) };
            const seed = 7;
            const kind = paintGround(L.base, src, nameAt, cw, ch, seed);
            paintDetails(L.base, kind, src, nameAt, seed);
            // Shore stones along the river bank.
            for (let x = 0; x < cw; x++) for (let y = 0; y < ch; y++) {
                if (nameAt(src, x, y) !== 'water' || nameAt(src, x, y - 1) === 'water') continue;
                const up = nameAt(src, x, y - 1);
                if (up === 'dock' || up === 'footbridge' || up === 'tree') continue;
                for (let n = 0; n < 3; n++) {
                    const s = shape(), sx = x * C + 4 + hash(x, n, seed) * 24, sy = y * C + 2 + hash(n, x, seed) * 6;
                    ellipse(s, L.base, sx, sy, 4 + hash(x, n + 5, seed) * 4, 3 + hash(x, n + 9, seed) * 2);
                    fill(L.base, s, PAL.stone, { tex: 0.4, seed: seed + x + n, outline: PAL.stone[0] });
                }
            }
            // Lily pads and reeds.
            for (let n = 0; n < 40; n++) {
                const x = Math.floor(hash(n, 50, seed) * L.base.w), y = Math.floor(hash(n, 51, seed) * L.base.h);
                if (kind[y * L.base.w + x] !== 3) continue;
                const s = shape(); ellipse(s, L.base, x, y, 3, 2); fill(L.base, s, PAL.leaf.slice(2), { outline: PAL.leaf[1], edge: false });
                put(L.base, x + 1, y, PAL.water[2]);
                if (n % 5 === 0) { put(L.base, x - 1, y - 1, PAL.flower[0]); put(L.base, x - 2, y - 1, PAL.flower[2]); }
            }
            // Scattered small things on open ground: low shrubs, stones, puddles on the paths, a fallen plank.
            for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) {
                const n = nameAt(src, x, y), r = hash(x, y, seed + 60);
                const px = x * C + 6 + Math.floor(hash(x, y, seed + 61) * 20), py = y * C + 8 + Math.floor(hash(x, y, seed + 62) * 18);
                if (n === 'grass' && r < 0.09) {
                    const s = shape();
                    for (let b = 0; b < 3; b++) ellipse(s, L.base, px + (b - 1) * 4, py - (b % 2) * 2, 4, 3.4);
                    for (const [i, v] of s.px) s.px.set(i, v * 0.7 + (vnoise((i % L.base.w) / 2.5, ((i / L.base.w) | 0) / 2.5, seed + x) - 0.5));
                    shadow(L.base, px + 2, py + 3, 8, 2, 0.3);
                    fill(L.base, s, hash(x, y, seed + 63) < 0.4 ? PAL.leafAutumn.slice(1) : PAL.leaf.slice(1), { outline: PAL.leaf[0] });
                } else if (n === 'grass' && r < 0.13) {
                    const s = shape(); ellipse(s, L.base, px, py, 3 + hash(x, y, 5) * 2, 2.4); shadow(L.base, px + 2, py + 2, 4, 1.5, 0.3);
                    fill(L.base, s, PAL.stone, { tex: 0.4, seed: x * y, outline: PAL.stone[0] });
                } else if (n === 'dirt_path' && r < 0.12) {
                    const s = shape(); ellipse(s, L.base, px, py, 5 + hash(x, y, 7) * 4, 2.6);
                    for (const [i] of s.px) put(L.base, i % L.base.w, (i / L.base.w) | 0, vnoise((i % L.base.w) / 3, 0, x) > 0.7 ? PAL.glint[0] : PAL.water[4]);
                    for (const [i] of s.px) { const ix = i % L.base.w, iy = (i / L.base.w) | 0; if (!s.px.has(i - L.base.w)) put(L.base, ix, iy, PAL.dirt[0]); }
                } else if (n === 'grass' && r < 0.15) {
                    const s = shape(); thick(s, L.base, px - 6, py, px + 6, py - 2, 1.2, 0.2); fill(L.base, s, PAL.wood.slice(2, 6), { outline: PAL.wood[0] });
                }
            }
            const gapNear = (x, y) => [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => { const n = nameAt(src, x + dx, y + dy); return (x + dx === 0 || x + dx === cw - 1 || y + dy === 0 || y + dy === ch - 1) && OPEN.has(n); });
            const seen = new Set(), items = [];
            const doorX = []; const windows = [];
            for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
                const n = nameAt(src, x, y);
                if (n === 'doorway' && BUILDING.has(nameAt(src, x - 1, y))) doorX.push(x);
                if (n === 'house_window') windows.push(x);
            }
            const HOUSE = new Set(['roof', 'house_wall', 'house_window', 'doorway']), SHED = new Set(['shed_roof', 'shed_wall', 'doorway', 'shed_door_shut']);
            for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
                const n = nameAt(src, x, y);
                if ((n === 'roof' || n === 'house_wall') && !seen.has(`${x},${y}`)) {
                    const b = blockOf(src, nameAt, x, y, HOUSE, seen);
                    items.push({ y: b.y1 + 0.9, draw: () => farmhouse({ ...L, doorX: doorX.find((d) => d >= b.x0 && d <= b.x1), windows: windows.filter((w) => w >= b.x0 && w <= b.x1) }, b, seed + 100) });
                } else if ((n === 'shed_roof' || n === 'shed_wall') && !seen.has(`${x},${y}`)) {
                    const b = blockOf(src, nameAt, x, y, SHED, seen);
                    const sd = [];
                    for (let xx = b.x0; xx <= b.x1; xx++) if (nameAt(src, xx, b.y1) === 'doorway' || nameAt(src, xx, b.y1) === 'shed_door_shut') sd.push(xx);
                    items.push({ y: b.y1 + 0.9, draw: () => smithy({ ...L, shedDoor: sd[0] }, b, seed + 200) });
                }
                const at = { y: y + (n === 'tree' ? 0.8 : 0.5) };
                const edge = x === 0 || y === 0 || x === cw - 1 || y === ch - 1;
                const P = {
                    // Edge trees grow into a dense wood, but stand back from a way out through it.
                    tree: () => tree(L, x, y, seed, { big: edge && !gapNear(x, y) ? 1.55 + hash(x, y, seed + 4) * 0.3 : 0.85, autumn: hash(x, y, seed + 3) < 0.28, dy: y === 0 ? 14 : y === ch - 1 ? 22 : 0, overhead: OPEN.has(nameAt(src, x, y - 1)) || OPEN.has(nameAt(src, x - 1, y - 1)) || OPEN.has(nameAt(src, x + 1, y - 1)) }),
                    dead_tree: () => deadTree(L, x, y, seed + x),
                    rock: () => rock(L, x, y, seed + x * 3 + y, { big: x === 11 && y === 12 }),
                    bush: () => bush(L, x, y, seed + x),
                    stump: () => stump(L, x, y, seed + x),
                    barrel: () => { barrel(L, x * C + 10, y * C + 28, seed + x); if (hash(x, y, seed) < 0.6) barrel(L, x * C + 22, y * C + 30, seed + y); },
                    crate: () => crate(L, x * C + 16, y * C + 28, seed + x + y, hash(x, y, seed) < 0.5 ? 1 : -1),
                    anvil: () => anvil(L, x, y, seed),
                    cart: () => cart(L, x, y, seed),
                    scarecrow: () => scarecrow(L, x, y, seed),
                    fence: () => fence(L, src, nameAt, x, y, seed),
                    drystone_wall: () => drystone(L, src, nameAt, x, y, seed),
                    well: () => well(L, x, y, seed),
                    dock: () => dock(L, src, nameAt, x, y, seed),
                    footbridge: () => footbridge(L, src, nameAt, x, y, seed),
                    tall_weeds: () => weeds(L, kind, x, y, seed)
                }[n];
                if (P) items.push({ ...at, x, draw: P });
            }
            items.sort((a, b) => a.y - b.y || (a.x || 0) - (b.x || 0));
            for (const it of items) it.draw();
            // Mist at the forest edge: the outer ring darkens toward the border.
            for (let y = 0; y < L.base.h; y++) for (let x = 0; x < L.base.w; x++) {
                const d = Math.min(x, y, L.base.w - 1 - x, L.base.h - 1 - y);
                if (d < 14) put(L.base, x, y, PAL.shadow, (1 - d / 14) * 0.35);
            }
            const water = [];
            for (let i = 0; i < kind.length; i += 7) if (kind[i] === 3 && hash(i, 0, seed) < 0.12) water.push(i);
            return { w: L.base.w, h: L.base.h, base: L.base.data, over: L.over.data, water };
        }
    };

    const has = (map) => !!(map && map.scene && scenes[map.scene]);
    function paint(map, nameAt) { return scenes[map.scene](map, nameAt); }
    const cache = new WeakMap();
    /** Canvases for a map's scene (cached): { base, over, water }. Browser only. */
    function layers(map, nameAt) {
        if (cache.has(map)) return cache.get(map);
        const p = paint(map, nameAt);
        const mk = (data) => {
            const c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
            c.getContext('2d').putImageData(new ImageData(data, p.w, p.h), 0, 0);
            return c;
        };
        const out = { base: mk(p.base), over: mk(p.over), water: p.water, w: p.w, animate: p.animate };
        cache.set(map, out);
        return out;
    }
    /** Light moving on the water: a few pale glints that come and go. */
    function animate(g, map, time) {
        const l = cache.get(map);
        if (!l) return;
        if (l.animate) l.animate(g, time);                   // a scene's own moving parts (falls, smoke, flames)
        for (let k = 0; k < l.water.length; k++) {
            const i = l.water[k], a = Math.sin(time / 600 + k * 1.7);
            if (a < 0.55) continue;
            const x = i % l.w, y = (i / l.w) | 0;
            g.fillStyle = `rgba(169, 198, 207, ${(a - 0.55) * 1.6})`;
            g.fillRect(x, y, 2 + (k % 3), 1);
        }
    }

    // The painting kit, for scenes kept in their own files (ui/scene-shamefield.js adds 'shamefield').
    const kit = { C, hash, vnoise, fbm, hex, R, PAL, Img, put, alphaAt, rectFill, shape, sset, ellipse, box, poly, thick, fill, shadow,
        field, paintDetails, tree, deadTree, rock, bush, stump, barrel, crate, cart, fence, well, blockOf, masonry, slates, windowAt, ivy };
    const api = { has, paint, layers, animate, scenes, PAL, kit };
    ENSO.sceneArt = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
