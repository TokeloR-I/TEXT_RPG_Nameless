/* =========================================================================
 * Enso's Last Stand — SCENE ART: THE OVERGROWN ROAD (original, drawn by code; Saffron/Quill)
 * Paints the Overgrown Road whole, after Tokelo's reference (2026-11-01): a green crossroads in the wood. A stream
 * runs down the west side between mossy boulders, with a waterfall at each end and a plank bridge where the west
 * track crosses it. A travellers' camp sits by the water: a stained canvas tent, a campfire under a cooking pot,
 * a barrel, a crate and a log to sit on. Crow banners hang from posts with lanterns along the road. Broken stone
 * walls stand among the trees, a stone arch opens on a quiet corner to the east, a covered wagon has been left
 * by the east track, and the wood round it all is green with a few red-leaved trees.
 *
 * Adds the 'overgrown_road' scene to ENSO.sceneArt (ui/scene-art.js) and reuses its painting kit. The map's tiles
 * (legend in src/world/zone1.js) still decide collision, exits and where each thing stands; the scene paints what
 * the tiles say is there. No image goes in: every pixel comes from shapes, noise and the palette below
 * (docs/art/ORIGINAL_ART_PLAN.md §0). Review: `node tools/preview-scene.js road out.png 1`.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (!SA) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, rectFill, shape, sset, ellipse, box, poly, thick, fill, shadow,
        field, tree, stump, barrel, crate, fence, blockOf, masonry } = SA.kit;

    // The road palette: a bright afternoon in an old wood. Lush mid greens, warm brown earth, blue-green water,
    // grey stone furred with moss, weathered canvas, crow-red cloth and lantern light.
    const RP = {
        grass: R(['#1c3311', '#244016', '#2e4e1a', '#3a5e1e', '#466e22', '#537d27', '#628d2d', '#759e36']),
        dirt: R(['#3a2817', '#48331d', '#573e24', '#664a2b', '#755633', '#83623b', '#937045']),
        water: R(['#0b2534', '#0f3146', '#153e57', '#1b4c69', '#235d7d', '#2f7192', '#4a8ead', '#77b2cb']),
        foam: R(['#8fbccb', '#bcdbe4', '#e2f1f4', '#fbffff']),
        rock: R(['#1b1c1f', '#26272b', '#333438', '#414246', '#505155', '#616164', '#747474', '#8a8986']),
        moss: R(['#26401a', '#32521d', '#406621', '#4f7a26', '#5f8c2c']),
        leaf: R(['#0e200b', '#142d0e', '#1c3c12', '#264d16', '#315f1a', '#3e711e', '#4e8423', '#63992b', '#7dad35']),
        red: R(['#260a0b', '#3c0f11', '#561517', '#711e1d', '#8b2924', '#a4362b', '#bb4934', '#cf6444']),
        bark: R(['#1a110b', '#271a10', '#352415', '#452f1b', '#563b22', '#674829']),
        plank: R(['#1f140c', '#2c1d11', '#3b2716', '#4b321c', '#5c3e23', '#6d4b2b', '#7f5934']),
        canvas: R(['#4a4236', '#665c4b', '#847861', '#a19478', '#bbae8f', '#d2c6a6', '#e3d9bb']),
        clothRed: R(['#33090a', '#510f0f', '#701915', '#8e251d', '#a93428']),
        glow: R(['#5a2808', '#a24f16', '#e08a28', '#ffc04a', '#ffe9a6']),
        reed: R(['#2c3f14', '#3d5419', '#53691f', '#6d7f28', '#8c9234', '#a8a443']),
        berry: [[150, 30, 40], [190, 50, 60]],
        flowers: [[232, 228, 214], [236, 170, 190], [170, 140, 220], [240, 210, 110]],
        shadow: [6, 12, 10]
    };
    const pick = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))];

    // ---------------------------------------------------------------------
    // Ground: grass, earth, water and the falls, decided per pixel from smoothed fields over the cells.
    // ---------------------------------------------------------------------
    const WET = { water: 1, waterfall: 1, bridge: 1, bank_rocks: 0.42, reeds: 0.25 };
    const DIRTY = { dirt_path: 1, campfire: 0.95, tent: 0.55, crate: 0.45, log: 0.35, barrel: 0.45, wagon: 0.45, signpost: 0.9,
        ruin: 0.3, lantern: 0.5, arch: 0.6, bridge: 0.8 };

    function ground(img, map, nameAt, cw, ch, seed) {
        const dirtC = new Float32Array(cw * ch), wetC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), i = y * cw + x;
            wetC[i] = WET[n] || 0;
            dirtC[i] = DIRTY[n] || 0;
        }
        // The camp's trampled yard: bare earth round the tent and the fire.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (n !== 'campfire' && n !== 'tent') continue;
            for (let dy = -1; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx, ny = y + dy, nn = nameAt(map, nx, ny);
                if (nn === 'grass' || nn === 'flowers' || nn === 'log' || nn === 'crate' || nn === 'barrel' || nn === 'lantern') dirtC[ny * cw + nx] = Math.max(dirtC[ny * cw + nx], 0.62 - Math.abs(dx) * 0.06);
            }
        }
        const dirt = field(dirtC, cw, ch), wet = field(wetC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);               // 0 grass, 1 earth, 3 water, 4 falls
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cell = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            const n1 = fbm(x / 20, y / 20, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            if (cell === 'waterfall') { kind[i] = 4; continue; }
            if (cell === 'water' || cell === 'bridge' || (WET[cell] && wet(x, y) + (n1 - 0.5) * 0.3 + (n2 - 0.5) * 0.08 > 0.55)) { kind[i] = 3; continue; }
            const d = dirt(x, y) + (n1 - 0.5) * 0.42 + (n2 - 0.5) * 0.1;
            kind[i] = d > 0.5 ? 1 : 0;
        }
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 0) {                                         // grass: lush, clumpy, darker at the path's edge
                const big = fbm(x / 34, y / 34, seed + 3), mid = vnoise(x / 4, y / 4, seed + 4), fine = hash(x, y, seed + 5);
                let t = big * 0.45 + mid * 0.4 + fine * 0.2;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 1 || kind[i + r] === 1 || kind[i - r * img.w] === 1 || kind[i + r * img.w] === 1) { t -= 0.28 / r; break; }
                put(img, x, y, pick(RP.grass, t));
            } else if (k === 1) {                                  // earth: speckled warm brown, darker at the rims
                let t = fbm(x / 10, y / 10, seed + 7) * 0.55 + hash(x, y, seed + 8) * 0.35 + 0.08;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 0 || kind[i + r] === 0 || kind[i - r * img.w] === 0 || kind[i + r * img.w] === 0) t -= 0.13;
                put(img, x, y, pick(RP.dirt, t));
            } else if (k === 3) {                                  // water: deeper in the middle, streaks with the current
                let near = 0;
                for (let r = 1; r <= 9; r++) if (kind[i - r] < 3 || kind[i + r] < 3) { near = 10 - r; break; }
                let t = 0.25 + near * 0.045 + (fbm(x / 8, y / 22, seed + 12) - 0.5) * 0.35;
                if (vnoise(x / 8, y / 1.8, seed + 13) > 0.78) t += 0.25;
                if (hash(x, y, seed + 21) < 0.01) t += 0.5;
                put(img, x, y, pick(RP.water, t));
            } else {                                               // falls: white water in long vertical strands
                const s = vnoise(x / 2.2, y / 14 - x * 0.05, seed + 14), s2 = vnoise(x / 5, y / 6, seed + 15), band = vnoise(x / 7, 0, seed + 16);
                const t = s * 0.65 + s2 * 0.35 + (band - 0.5) * 0.4;
                put(img, x, y, t > 0.78 ? RP.foam[3] : t > 0.66 ? RP.foam[2] : t > 0.54 ? RP.foam[1] : t > 0.44 ? RP.foam[0] : pick(RP.water, 0.5 + t * 0.6));
            }
        }
        // Foam below the falls, and where the stream breaks round the bridge posts.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] !== 3) continue;
            let up = 0;
            for (let r = 1; r <= 14; r++) if (kind[i - r * img.w] === 4) { up = 15 - r; break; }
            if (up && hash(x, y, seed + 16) < up / 15) put(img, x, y, RP.foam[1 + (hash(x, y, seed + 17) < 0.4 ? 1 : 0)], 0.85);
        }
        // Rock lip at the top of each fall, dark rock at its sides.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x;
            if (kind[i] !== 4) continue;
            const l = x > 0 && kind[i - 1] !== 4, r = x < img.w - 1 && kind[i + 1] !== 4, top = y > 0 && kind[i - img.w] === 3;
            const wl = 2 + Math.floor(vnoise(x, y / 6, seed + 18) * 3);
            for (let k = 0; k < wl; k++) {
                if (l) put(img, x + k, y, pick(RP.rock, 0.5 - k * 0.08));
                if (r) put(img, x - k, y, pick(RP.rock, 0.28 - k * 0.04));
            }
            if (top) for (let k = 0; k < 5; k++) put(img, x, y + k, k < 3 ? pick(RP.rock, 0.55 - k * 0.1 + (hash(x >> 2, k, seed) - 0.5) * 0.2) : RP.foam[2]);
        }
        // Wet banks: a dark rim on the land side, a pale line on the water side.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] >= 3) { if (kind[i - 1] < 3 || kind[i + 1] < 3) put(img, x, y, RP.foam[0], 0.45); continue; }
            if (kind[i + 1] === 3 || kind[i - 1] === 3 || kind[i + 2] === 3 || kind[i - 2] === 3 || kind[i + img.w] === 3) put(img, x, y, RP.dirt[0], 0.7);
        }
        // Pebbles and small stones along the waterline.
        for (let n = 0; n < 700; n++) {
            const x = Math.floor(hash(n, 30, seed) * img.w), y = Math.floor(hash(n, 31, seed) * img.h), i = y * img.w + x;
            if (kind[i] !== 3) continue;
            const land = [[-3, 0], [3, 0]].some(([dx]) => kind[i + dx] !== undefined && kind[i + dx] < 3);
            if (!land) continue;
            const st = shape(); ellipse(st, img, x, y, 2 + hash(n, 32, seed) * 3, 1.6 + hash(n, 33, seed) * 1.8);
            fill(img, st, RP.rock.slice(2), { tex: 0.4, seed: seed + n, outline: RP.rock[0] });
        }
        return kind;
    }

    /** Small things on the ground: grass tufts, clover, pebbles on the paths, lily pads on the stream. */
    function details(img, kind, seed) {
        const N = (img.w * img.h) / 30;
        for (let n = 0; n < N; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x];
            const r = hash(n, 9, seed);
            if (k === 0 && r < 0.75) {                             // a tuft
                const h = 2 + Math.floor(hash(n, 10, seed) * 4), lt = RP.grass[7], md = RP.grass[5];
                for (let b = -1; b <= 1; b++) for (let j = 0; j < h - Math.abs(b); j++) put(img, x + b + (j === h - 1 - Math.abs(b) ? b : 0), y - j, j === h - 1 - Math.abs(b) ? lt : md);
                put(img, x, y + 1, RP.grass[1]);
            } else if (k === 0) {                                  // clover
                put(img, x, y, RP.grass[6]); put(img, x + 1, y, RP.grass[6]); put(img, x, y + 1, RP.grass[2]);
            } else if (k === 1 && r < 0.4) {                       // a pebble
                put(img, x, y, RP.rock[6]); put(img, x + 1, y, RP.rock[5]); put(img, x, y + 1, RP.dirt[1]);
            } else if (k === 1 && r < 0.55) {                      // a darker clod
                put(img, x, y, RP.dirt[1]); put(img, x + 1, y, RP.dirt[2]);
            }
        }
        // Grey pebbles in clusters on the paths, as in old cart ruts.
        for (let n = 0; n < 160; n++) {
            const x = Math.floor(hash(n, 40, seed) * img.w), y = Math.floor(hash(n, 41, seed) * img.h);
            if (kind[y * img.w + x] !== 1) continue;
            for (let k = 0; k < 4; k++) {
                const px = x + Math.floor((hash(n, 42 + k, seed) - 0.5) * 8), py = y + Math.floor((hash(n, 50 + k, seed) - 0.5) * 5);
                if (kind[py * img.w + px] !== 1) continue;
                put(img, px, py, RP.rock[5]); put(img, px + 1, py, RP.rock[4]); put(img, px, py + 1, RP.rock[2]);
            }
        }
        // Lily pads where the stream is slow, near the banks.
        for (let n = 0; n < 60; n++) {
            const x = Math.floor(hash(n, 60, seed) * img.w), y = Math.floor(hash(n, 61, seed) * img.h), i = y * img.w + x;
            if (kind[i] !== 3 || kind[i - 6] !== 3 || kind[i + 6] !== 3) continue;
            let fall = false;
            for (let r = 1; r < 24; r++) if (kind[i - r * img.w] === 4) fall = true;
            if (fall) continue;
            const p = shape(); ellipse(p, img, x, y, 3.6, 2.6);
            for (const [q] of p.px) { const px = q % img.w, py = (q / img.w) | 0; if (px > x && py < y && px - x < 3) p.px.delete(q); }
            fill(img, p, RP.leaf.slice(3), { outline: RP.leaf[1] });
            if (hash(n, 62, seed) < 0.3) { put(img, x - 1, y - 1, RP.flowers[1]); put(img, x, y - 1, RP.flowers[0]); }
        }
    }

    // ---------------------------------------------------------------------
    // Shared helpers
    // ---------------------------------------------------------------------
    /** Paint into the scratch layer, then move what was drawn onto the base, with anything above `split` on the
     *  over layer when someone can stand behind it (`overhead`). */
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
    function planks(img, x, y, w, h, seed, ramp = RP.plank, vertical = true) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const a = vertical ? i : j, b = Math.floor(a / 5), u = a % 5, along = vertical ? y + j : x + i;
            let t = 0.4 + (hash(b, 0, seed) - 0.5) * 0.35 + (vnoise(b * 3.1, along / 9, seed) - 0.5) * 0.3;
            if (u === 0) t = 0.05; else if (u === 1) t += 0.16;
            put(img, x + i, y + j, pick(ramp, t));
        }
    }
    function boulder(img, x, y, rx, ry, seed, mossy = 0.55) {
        shadow(img, x + 3, y + ry * 0.6, rx + 2, ry * 0.5, 0.35);
        const s = shape(); ellipse(s, img, x, y, rx, ry);
        for (const [i, v] of s.px) s.px.set(i, v * 0.85 + (vnoise((i % img.w) / 2.5, ((i / img.w) | 0) / 2.5, seed) - 0.5) * 0.5);
        fill(img, s, RP.rock.slice(1), { outline: RP.rock[0] });
        // Facets and cracks, then moss on the top.
        for (const [i, v] of s.px) {
            const px = i % img.w, py = (i / img.w) | 0;
            if (hash(px >> 2, py >> 2, seed + 3) < 0.08) put(img, px, py, RP.rock[1]);
            if (py < y - ry * 0.15 && v > -0.2 && vnoise(px / 3, py / 3, seed + 5) > 1 - mossy) put(img, px, py, pick(RP.moss, 0.3 + vnoise(px / 1.5, py / 1.5, seed) * 0.7));
        }
    }

    // ---------------------------------------------------------------------
    // The stream: boulder banks, reeds, the bridge
    // ---------------------------------------------------------------------
    function bankRocks(L, map, nameAt, x, y, seed) {
        const img = L.base, x0 = x * C, y0 = y * C;
        const nearFall = [-1, 0, 1, 2].some((dy) => nameAt(map, x - 1, y + dy) === 'waterfall' || nameAt(map, x + 1, y + dy) === 'waterfall');
        const n = nearFall ? 3 : 2 + Math.floor(hash(x, y, seed) * 2);
        for (let k = 0; k < n; k++) {
            const bx = x0 + 6 + hash(k, x + y * 7, seed) * 20, by = y0 + 6 + (k / n) * 22 + hash(k, y, seed + 1) * 6;
            const rx = (nearFall ? 9 : 7) + hash(k, x, seed + 2) * 5, ry = rx * (0.7 + hash(k, y, seed + 3) * 0.2);
            boulder(img, bx, by, rx, ry, seed + k * 31 + x * 7 + y);
        }
        // Ferns and grass growing between the stones.
        for (let k = 0; k < 6; k++) {
            const fx = x0 + hash(k, x, seed + 9) * C, fy = y0 + hash(k, y, seed + 9) * C;
            for (let j = 0; j < 5; j++) put(img, fx + (j % 2), fy - j, RP.grass[5 + (j & 1)]);
        }
    }
    function reeds(L, x, y, seed) {
        const img = L.base, x0 = x * C, y0 = y * C;
        for (let n = 0; n < 34; n++) {
            const rx = x0 + hash(n, x, seed) * C, ry = y0 + 10 + hash(n, y, seed) * (C - 6);
            const h = 9 + Math.floor(hash(n, 3, seed + x) * 12), lean = (hash(n, 4, seed + y) - 0.5) * 5;
            for (let j = 0; j < h; j++) put(img, Math.round(rx + (lean * j) / h), ry - j, pick(RP.reed, 0.15 + (j / h) * 0.85));
            if (hash(n, 5, seed) < 0.25) for (let j = 0; j < 4; j++) put(img, Math.round(rx + lean), ry - h - j + 2, [92, 62, 34]);   // a bulrush head
        }
    }
    /** The plank bridge over the stream: a deck of boards laid across the way, posts and rails on both sides. */
    function bridge(L, b, seed) {
        const img = L.base, X0 = b.x0 * C - 4, X1 = (b.x1 + 1) * C + 4, Y0 = b.y0 * C + 2, Y1 = (b.y1 + 1) * C - 4;
        shadow(img, (X0 + X1) / 2 + 4, Y1 + 6, (X1 - X0) / 2, 6, 0.5);
        for (const px of [X0 + 10, X0 + 44, X1 - 48, X1 - 14]) {   // supports into the water
            const s = shape(); box(s, img, px, Y1 - 2, 6, 16, 0); fill(img, s, RP.plank, { tex: 0.4, seed: seed + px, outline: RP.plank[0] });
            for (let i = -3; i < 9; i++) put(img, px + i, Y1 + 13 + (i & 1), RP.foam[1 + (i & 1)], 0.8);
        }
        planks(img, X0, Y0 + 6, X1 - X0, Y1 - Y0 - 6, seed, RP.plank, true);
        for (let px = X0; px < X1; px++) { put(img, px, Y0 + 6, RP.plank[6]); put(img, px, Y1 - 1, RP.plank[0]); put(img, px, Y1, RP.shadow, 0.6); }
        for (let px = X0 + 5; px < X1; px += 5) if (hash(px, 3, seed) < 0.12) rectFill(img, px + 1, Y0 + 20 + hash(px, 4, seed) * 20, 3, 2, RP.plank[0]);   // knots and gaps
        // Rails and posts: the far rail first, then the near one.
        for (const ry of [Y0, Y1 - 14]) {
            for (let px = X0; px <= X1 - 6; px += Math.round((X1 - X0 - 6) / 4)) {
                const p = shape(); box(p, img, px, ry - 8, 6, 20, 0);
                for (const [i] of p.px) p.px.set(i, (((i % img.w) - px - 3) / 3) * -0.6);
                fill(img, p, RP.plank.slice(1), { tex: 0.4, seed: seed + px, outline: RP.plank[0] });
                rectFill(img, px, ry - 8, 6, 2, RP.plank[6]);
            }
            const r = shape(); box(r, img, X0, ry - 4, X1 - X0, 4, 0.4); fill(img, r, RP.plank.slice(2), { tex: 0.5, seed: seed + ry, scale: 2, outline: RP.plank[0] });
        }
    }

    // ---------------------------------------------------------------------
    // Plants
    // ---------------------------------------------------------------------
    function bush(L, cx, cy, seed) {
        const img = L.base, x = cx * C + 16, gy = cy * C + 28;
        shadow(img, x + 4, gy, 16, 5, 0.42);
        const s = shape();
        for (let b = 0; b < 7; b++) ellipse(s, img, x + (b - 3) * 4.5 + (hash(b, cx, seed) - 0.5) * 3, gy - 9 - (b % 3) * 4 - hash(b, cy, seed) * 3, 7.5, 7);
        for (const [i, v] of s.px) s.px.set(i, v * 0.7 + (vnoise((i % img.w) / 2.6, ((i / img.w) | 0) / 2.6, seed + cx) - 0.5) * 1.0);
        fill(img, s, RP.leaf, { outline: RP.leaf[0] });
        for (let n = 0; n < 9; n++) {                              // berries or blossom
            const px = x - 12 + hash(n, cx, seed + 1) * 24, py = gy - 22 + hash(n, cy, seed + 1) * 16;
            if (!s.px.has(Math.round(py) * img.w + Math.round(px))) continue;
            const c = hash(cx, cy, seed) < 0.5 ? RP.berry : [RP.flowers[3], RP.flowers[0]];
            put(img, px, py, c[1]); put(img, px + 1, py, c[0]); put(img, px, py + 1, c[0]);
        }
    }
    function flowers(L, x, y, seed) {
        const img = L.base, x0 = x * C, y0 = y * C, c = RP.flowers[Math.floor(hash(x, y, seed) * RP.flowers.length)], c2 = RP.flowers[Math.floor(hash(y, x, seed) * 2)];
        for (let n = 0; n < 9; n++) {
            const fx = x0 + 4 + hash(n, x, seed) * (C - 8), fy = y0 + 8 + hash(n, y, seed) * (C - 12);
            for (let j = 1; j < 4; j++) put(img, fx, fy + j, RP.grass[3]);
            put(img, fx - 1, fy + 2, RP.leaf[5]); put(img, fx + 1, fy + 3, RP.leaf[5]);
            const col = n % 3 ? c : c2;
            put(img, fx - 1, fy, col); put(img, fx + 1, fy, col); put(img, fx, fy - 1, col); put(img, fx, fy + 1, col);
            put(img, fx, fy, RP.flowers[3]);
        }
    }

    // ---------------------------------------------------------------------
    // The camp
    // ---------------------------------------------------------------------
    /** The tent: a stained canvas A-frame, its door open toward the fire, a loose flap pegged out to one side. */
    function tent(L, b, seed, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 6, cx = Math.round((X0 + X1) / 2) + 10;
        tall(L, [X0 - 24, b.y0 * C - 40, X1 + 24, B + 12], b.y0 * C, overhead, (S) => {
            shadow(S, cx, B + 2, (X1 - X0) / 2 + 6, 8, 0.45);
            const ay = B - 86, back = [cx - 38, ay + 8];
            // The flap pegged out to the left, and the side of the tent running back from the door.
            const flap = shape(); poly(flap, S, [[back[0], back[1]], [X0 - 16, B - 34], [X0 - 8, B - 14], [cx - 48, B - 2]], (px, py) => -0.2 + (vnoise(px / 5, py / 5, seed) - 0.5) * 0.4);
            fill(S, flap, RP.canvas, { tex: 0.25, seed, outline: RP.canvas[0] });
            const side = shape(); poly(side, S, [[cx, ay], [back[0], back[1]], [cx - 48, B - 2], [cx - 32, B]], (px, py) => 0.35 - (py - ay) / 160 + (vnoise(px / 6, py / 4, seed + 1) - 0.5) * 0.35);
            fill(S, side, RP.canvas, { tex: 0.25, seed: seed + 1, outline: RP.canvas[0] });
            // The front: a canvas triangle with the open doorway in it.
            const front = shape(); poly(front, S, [[cx, ay], [cx - 32, B], [cx + 36, B]], (px) => ((px - cx) / 36) * -0.5 - 0.05);
            fill(S, front, RP.canvas, { tex: 0.3, seed: seed + 2, outline: RP.canvas[0] });
            const doorway = shape(); poly(doorway, S, [[cx + 2, ay + 20], [cx - 17, B], [cx + 21, B]], 0);
            for (const [i] of doorway.px) { const px = i % S.w, py = (i / S.w) | 0; put(S, px, py, py > B - 12 ? pick(RP.plank, 0.35 + hash(px >> 2, py, seed) * 0.2) : [14, 10, 8]); }
            for (let py = ay + 20; py < B; py++) { const f = (py - ay - 20) / (B - ay - 20); put(S, Math.round(cx + 2 - 19 * f), py, RP.canvas[2]); put(S, Math.round(cx + 2 + 19 * f), py, RP.canvas[3]); }
            const roll = shape(); ellipse(roll, S, cx + 1, B - 6, 11, 3.6); fill(S, roll, RP.clothRed, { outline: RP.clothRed[0] });   // a bedroll inside
            // Stains, mends and seams.
            for (const s of [side, front, flap]) for (const [i] of s.px) {
                const px = i % S.w, py = (i / S.w) | 0;
                const st = fbm(px / 7, py / 7, seed + 9);
                if (st > 0.68) put(S, px, py, [98, 64, 40], Math.min(0.7, (st - 0.68) * 4));
                if (hash(px >> 1, py >> 1, seed + 4) < 0.01) put(S, px, py, [70, 30, 22]);
            }
            for (let k = 0; k < 4; k++) { const sx = cx - 28 + k * 7, sy = ay + 34 + k * 10; rectFill(S, sx, sy, 8, 6, RP.canvas[1]); for (let i = 0; i < 8; i += 2) put(S, sx + i, sy, RP.plank[2]); }
            // Pole tips, guy ropes and pegs.
            for (const [px, py] of [[cx, ay], back]) { const p = shape(); thick(p, S, px, py + 4, px, py - 8, 1.2); fill(S, p, RP.plank.slice(1), { outline: RP.plank[0] }); }
            for (const [gx, gy2] of [[cx + 44, B + 4], [X0 - 14, B - 10]]) {
                const n = Math.hypot(gx - cx, gy2 - ay);
                for (let t = 0; t <= 1; t += 1 / n) put(S, cx + (gx - cx) * t, ay + (gy2 - ay) * t + Math.sin(t * Math.PI) * 4, [150, 140, 110], 0.8);
                rectFill(S, gx - 1, gy2 - 3, 2, 4, RP.plank[3]);
            }
        });
    }
    /** The campfire: a ring of stones round burning logs, a cooking pot on a crossbar between two forked posts. */
    function campfire(L, x, y, seed, overhead, scene) {
        const cx = x * C + 16, gy = y * C + 24;
        tall(L, [cx - 30, gy - 70, cx + 30, gy + 10], y * C, overhead, (S) => {
            for (let yy = -26; yy <= 26; yy++) for (let xx = -32; xx <= 32; xx++) { const d = Math.hypot(xx / 1.25, yy); if (d < 26) put(S, cx + xx, gy - 4 + yy, RP.glow[3], (1 - d / 26) * 0.18); }
            const ash = shape(); ellipse(ash, S, cx, gy - 2, 11, 5); fill(S, ash, RP.rock.slice(0, 3), { tex: 0.6, seed, edge: false });
            for (let k = 0; k < 10; k++) {                         // stones, back row first
                const a = Math.PI + (k / 10) * Math.PI * 2, sx = cx + Math.cos(a) * 12, sy = gy - 2 + Math.sin(a) * 6;
                if (Math.sin(a) > 0) continue;
                const s = shape(); ellipse(s, S, sx, sy, 3.6, 2.6); fill(S, s, RP.rock.slice(2), { tex: 0.4, seed: seed + k, outline: RP.rock[0] });
            }
            for (const [a, b2] of [[-8, 4], [8, -4]]) { const l = shape(); thick(l, S, cx + a, gy, cx + b2, gy - 6, 2.2); fill(S, l, RP.bark, { outline: RP.bark[0] }); }
            const f = shape(); ellipse(f, S, cx, gy - 9, 5.5, 8); fill(S, f, RP.glow.slice(1), { edge: false });
            const f2 = shape(); ellipse(f2, S, cx, gy - 7, 3, 4.5); fill(S, f2, RP.glow.slice(3), { edge: false });
            for (let k = 0; k < 10; k++) {
                const a = (k / 10) * Math.PI * 2, sx = cx + Math.cos(a) * 12, sy = gy - 2 + Math.sin(a) * 6;
                if (Math.sin(a) <= 0) continue;
                const s = shape(); ellipse(s, S, sx, sy, 3.8, 2.8); fill(S, s, RP.rock.slice(2), { tex: 0.4, seed: seed + k, outline: RP.rock[0] });
            }
            // Forked posts, crossbar, chain and pot.
            for (const px of [cx - 20, cx + 20]) {
                const p = shape(); thick(p, S, px, gy + 2, px, gy - 44, 1.6); thick(p, S, px, gy - 40, px - 4, gy - 48, 1.1); thick(p, S, px, gy - 40, px + 4, gy - 48, 1.1);
                fill(S, p, RP.plank.slice(1), { tex: 0.3, seed: seed + px, outline: RP.plank[0] });
            }
            const bar = shape(); thick(bar, S, cx - 24, gy - 44, cx + 24, gy - 44, 1.3); fill(S, bar, RP.plank.slice(2), { outline: RP.plank[0] });
            for (let j = gy - 43; j < gy - 30; j++) put(S, cx, j, SA.PAL.iron[(j & 1) ? 2 : 4]);
            const pot = shape(); ellipse(pot, S, cx, gy - 22, 9, 8); box(pot, S, cx - 9, gy - 30, 18, 6, 0.2);
            for (const [i] of pot.px) pot.px.set(i, (((i % S.w) - cx) / 9) * -0.7 + 0.05);
            fill(S, pot, SA.PAL.iron, { outline: [10, 10, 12] });
            rectFill(S, cx - 10, gy - 31, 20, 2, SA.PAL.iron[4]);
            const rim = shape(); ellipse(rim, S, cx, gy - 30, 8, 2); fill(S, rim, R(['#3a2a1a', '#5a4024', '#7a5a34']), { edge: false });   // stew
            for (let i = -8; i <= 8; i += 2) put(S, cx + i, gy - 14 + Math.abs(i) * 0.3, RP.glow[3], 0.5);
        });
        scene.flames.push({ x: cx, y: gy - 9, big: true });
        scene.smoke.push({ x: cx, y: gy - 36 });
    }
    function log(L, b, seed) {
        const img = L.base, X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, gy = (b.y1 + 1) * C - 8;
        shadow(img, (X0 + X1) / 2 + 4, gy + 3, (X1 - X0) / 2 + 2, 4, 0.45);
        const s = shape(); box(s, img, X0 + 4, gy - 14, X1 - X0 - 8, 14, 0);
        for (const [i] of s.px) { const py = (i / img.w) | 0; s.px.set(i, ((py - gy + 7) / 7) * -0.85 + (vnoise((i % img.w) / 9, py / 1.6, seed) - 0.5) * 0.45); }
        fill(img, s, RP.bark, { outline: RP.bark[0] });
        for (let px = X0 + 6; px < X1 - 6; px += 3) if (hash(px, 1, seed) < 0.3) put(img, px, gy - 12 + hash(px, 2, seed) * 4, RP.moss[2 + (px & 1)]);
        for (const ex of [X0 + 4, X1 - 4]) {                        // the cut ends, showing rings
            const e = shape(); ellipse(e, img, ex, gy - 7, 4.5, 7); fill(img, e, SA.PAL.straw, { edge: false, outline: RP.bark[0] });
            put(img, ex, gy - 7, RP.bark[3]); for (let j = -4; j <= 4; j += 4) put(img, ex + (j ? 1 : 0), gy - 7 + j, SA.PAL.straw[0]);
        }
    }

    // ---------------------------------------------------------------------
    // Crow banners and lanterns
    // ---------------------------------------------------------------------
    const CROW = [
        '.....##.......',
        '....####......',
        '....###bb.....',
        '...####.......',
        '..#######.....',
        '.##########...',
        '############..',
        '#.#########...',
        '...#.##.......',
        '..##.#........'
    ];
    function crow(img, x, y, colour = [16, 12, 12]) {
        CROW.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') put(img, x + i, y + j, colour); else if (ch === 'b') put(img, x + i, y + j, [70, 60, 50]); }));
    }
    function banner(img, x, y, w, h, seed) {
        const s = shape();
        poly(s, img, [[x, y], [x + w, y], [x + w, y + h], [x + w * 0.72, y + h - 7], [x + w / 2, y + h + 1], [x + w * 0.28, y + h - 7], [x, y + h]],
            (px, py) => ((px - x) / w - 0.5) * -0.9 + Math.sin((py - y) / 6) * 0.12);
        fill(img, s, RP.clothRed, { tex: 0.3, seed, outline: [26, 8, 8] });
        for (const [i] of s.px) { const px = i % img.w, py = (i / img.w) | 0; if (!s.px.has(i - 2) || !s.px.has(i + 2)) put(img, px, py, RP.clothRed[0]); if (fbm(px / 4, py / 4, seed + 3) > 0.72) put(img, px, py, [70, 40, 30], 0.5); }
        crow(img, Math.round(x + w / 2 - 7), Math.round(y + h * 0.35));
        for (let i = -2; i <= w + 2; i++) put(img, x + i, y, RP.plank[1]);
    }
    function lanternAt(S, x, y, seed) {
        for (let yy = -16; yy <= 16; yy++) for (let xx = -16; xx <= 16; xx++) { const d = Math.hypot(xx, yy); if (d < 16) put(S, x + xx, y + yy, RP.glow[3], (1 - d / 16) * 0.2); }
        for (let j = -9; j < -5; j++) put(S, x, y + j, SA.PAL.iron[3]);
        const cage = shape(); poly(cage, S, [[x - 4, y - 5], [x + 4, y - 5], [x + 5, y + 5], [x - 5, y + 5]], 0); fill(S, cage, SA.PAL.iron, { outline: SA.PAL.iron[0] });
        const g = shape(); box(g, S, x - 3, y - 3, 6, 7, 0); fill(S, g, RP.glow.slice(2), { tex: 0.5, seed, edge: false });
        rectFill(S, x - 1, y - 1, 2, 3, RP.glow[4]);
        put(S, x, y - 3, SA.PAL.iron[1]); put(S, x, y + 2, SA.PAL.iron[1]);
        rectFill(S, x - 5, y - 6, 10, 2, SA.PAL.iron[2]); rectFill(S, x - 5, y + 5, 10, 2, SA.PAL.iron[2]);
    }
    /** A banner post: a tall post and a crossbar, the crow banner hanging from one arm and a lantern from the other. */
    function bannerPost(S, cx, gy, seed, flip, scene) {
        shadow(S, cx + 6, gy + 1, 10, 3, 0.42);
        const p = shape(); thick(p, S, cx, gy - 82, cx, gy, 2.2); thick(p, S, cx - 24, gy - 76, cx + 24, gy - 76, 1.5);
        thick(p, S, cx, gy - 66, cx + (flip ? -10 : 10), gy - 76, 1); thick(p, S, cx, gy - 66, cx + (flip ? 10 : -10), gy - 76, 1);
        fill(S, p, RP.plank, { tex: 0.4, seed, outline: RP.plank[0] });
        rectFill(S, cx - 2, gy - 86, 5, 4, SA.PAL.iron[3]);
        for (const ex of [cx - 24, cx + 22]) rectFill(S, ex, gy - 78, 3, 5, SA.PAL.iron[2]);
        const bx = flip ? cx - 24 : cx + 4;
        banner(S, bx, gy - 74, 20, 46, seed);
        const lx = flip ? cx + 18 : cx - 18;
        lanternAt(S, lx, gy - 62, seed + 1);
        scene.flames.push({ x: lx, y: gy - 62 });
        const st = shape(); ellipse(st, S, cx, gy - 1, 6, 2.5); fill(S, st, RP.rock.slice(2), { tex: 0.5, seed, outline: RP.rock[0] });   // a stone at the foot
    }
    function lanternPost(S, cx, gy, seed, scene) {
        shadow(S, cx + 4, gy + 1, 6, 2.5, 0.4);
        const p = shape(); thick(p, S, cx, gy - 46, cx, gy, 1.7); thick(p, S, cx, gy - 44, cx + 12, gy - 44, 1.1);
        fill(S, p, RP.plank, { tex: 0.4, seed, outline: RP.plank[0] });
        lanternAt(S, cx + 11, gy - 32, seed);
        scene.flames.push({ x: cx + 11, y: gy - 32 });
    }
    function signpost(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 7, 2.5, 0.4);
        const p = shape(); thick(p, S, cx, gy - 44, cx, gy, 1.8); fill(S, p, RP.plank, { tex: 0.4, seed, outline: RP.plank[0] });
        const arrows = [[gy - 40, 1, 0.02], [gy - 30, -1, -0.04], [gy - 21, 1, 0.05]];
        for (const [ay, dir, tilt] of arrows) {
            const a = shape(), x0 = dir > 0 ? cx - 4 : cx + 4, x1 = cx + dir * 18;
            poly(a, S, [[x0, ay + tilt * 20], [x1, ay - tilt * 20], [x1 + dir * 5, ay + 3], [x1, ay + 7 - tilt * 20], [x0, ay + 7 + tilt * 20]], 0.2);
            fill(S, a, RP.plank.slice(2), { tex: 0.5, seed: seed + ay, outline: RP.plank[0] });
            for (let i = 4; i < 15; i += 3) put(S, cx + dir * i, ay + 3, RP.plank[1]);     // letters, long weathered off
        }
    }

    // ---------------------------------------------------------------------
    // Ruins and the arch
    // ---------------------------------------------------------------------
    /** Big squared stones in courses, lit from the top left, moss on the upper faces. */
    function blocks(img, x, y, w, h, seed, ramp = RP.rock) {
        const bh = 9;
        for (let j = 0; j < h; j++) {
            const row = Math.floor(j / bh), v = j % bh, off = (row % 2) * 7 + Math.floor(hash(row, x, seed) * 5);
            for (let i = 0; i < w; i++) {
                const col = Math.floor((i + off) / 13), u = (i + off) % 13;
                let t = 0.5 + (hash(col, row, seed) - 0.5) * 0.3 + (vnoise((x + i) / 3, (y + j) / 3, seed + 1) - 0.5) * 0.2;
                if (v === 0 || u === 0) t = 0.1; else if (v === 1 || u === 1) t += 0.22; else if (v === bh - 1 || u === 12) t -= 0.22;
                put(img, x + i, y + j, pick(ramp, t));
                if (v > 0 && u > 0 && vnoise((x + i) / 4, (y + j) / 4, seed + 7) > 0.74) put(img, x + i, y + j, pick(RP.moss, 0.2 + hash(i, j, seed) * 0.6));
            }
        }
    }
    /** A broken wall: blocks under a stepped, ragged top, cap stones lit from above, ivy down the face. */
    function brokenWall(img, x, y, w, h, seed, steps) {
        const tmp = Img(w, h); blocks(tmp, 0, 0, w, h, seed);
        const top = (i) => Math.round(steps(i / w) * h / 9) * 9;   // the top steps down a course at a time
        for (let i = 0; i < w; i++) {
            const t0 = Math.max(0, Math.min(h - 9, top(i)));
            for (let j = t0; j < h; j++) { const k = (j * w + i) * 4; put(img, x + i, y + j, [tmp.data[k], tmp.data[k + 1], tmp.data[k + 2]]); }
            for (let j = t0 - 5; j < t0; j++) put(img, x + i, y + j, pick(RP.rock, 0.72 + (hash(Math.floor(i / 13), t0, seed) - 0.5) * 0.25));   // the top of the wall, seen from above
            put(img, x + i, y + t0 - 6, RP.rock[1]);
            if (vnoise((x + i) / 4, t0 / 4, seed + 3) > 0.45) for (let j = t0 - 5; j < t0 - 1; j++) if (hash(i, j, seed) < 0.75) put(img, x + i, y + j, pick(RP.moss, 0.35 + hash(j, i, seed) * 0.6));
        }
        for (let j = 0; j < h; j++) put(img, x + w, y + j, RP.shadow, 0.55);
        for (let i = 0; i < w; i++) put(img, x + i, y + h, RP.shadow, 0.5);
        // Ivy hanging from the top.
        for (let n = 0; n < Math.floor(w / 9); n++) {
            const ix = Math.floor(hash(n, w, seed + 5) * w); if (hash(n, 1, seed + 6) < 0.4) continue;
            const t0 = Math.max(0, top(ix)), len = 8 + hash(n, 2, seed) * (h - t0) * 0.8;
            for (let j = 0; j < len; j++) { const px = x + ix + Math.round(Math.sin(j / 4 + n) * 1.5); put(img, px, y + t0 - 3 + j, RP.leaf[4]); if (j % 3 === 0) { put(img, px - 1, y + t0 - 3 + j, RP.leaf[6]); put(img, px + 1, y + t0 - 2 + j, RP.leaf[3]); } }
        }
    }
    function ruins(L, b, seed, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C - 2, W = X1 - X0, H = B - Y0;
        tall(L, [X0 - 8, Y0 - 60, X1 + 8, B + 10], Y0, overhead, (S) => {
            shadow(S, X0 + W / 2 + 6, B + 2, W / 2 + 6, 6, 0.42);
            // A back wall along the top of the block, then a front wall with a tall broken pier, stepping down.
            const tallSide = hash(b.x0, b.y0, seed) < 0.5;
            const backH = Math.min(96, H + 6);
            brokenWall(S, X0 + 10, B - backH - 18, W - 20, backH, seed, (t) => 0.5 - (tallSide ? (1 - t) : t) * 0.4 + (vnoise(t * 5, 0, seed) - 0.5) * 0.4);
            const frontH = Math.min(110, H + 26), fw = Math.round(W * 0.66), fx = tallSide ? X0 : X1 - fw;
            brokenWall(S, fx, B - frontH, fw, frontH, seed + 1, (t) => {
                const u = tallSide ? t : 1 - t;                    // the pier at one end, falling to rubble at the other
                return u < 0.28 ? 0.02 : u < 0.4 ? 0.3 : u < 0.6 ? 0.5 + (vnoise(u * 9, 1, seed) - 0.5) * 0.2 : 0.72 + (u - 0.6) * 0.5;
            });
            for (let n = 0; n < 14; n++) {                         // fallen blocks and rubble at the foot
                const rx = X0 + hash(n, 1, seed) * W, ry = B - 2 + hash(n, 2, seed) * 6, big = hash(n, 3, seed) < 0.3;
                const s = shape(); if (big) box(s, S, rx - 5, ry - 7, 11, 8, 0.1); else ellipse(s, S, rx, ry, 2 + hash(n, 4, seed) * 2.5, 1.6 + hash(n, 5, seed) * 1.5);
                fill(S, s, RP.rock.slice(1), { tex: 0.4, seed: seed + n, outline: RP.rock[0] });
            }
            for (let n = 0; n < 26; n++) {                         // grass and ferns at the base
                const fx2 = X0 + hash(n, 7, seed) * W, fy = B + hash(n, 8, seed) * 4;
                for (let j = 0; j < 4 + (n % 4); j++) put(S, fx2 + (j % 2 ? 1 : 0) * (n % 2 ? 1 : -1), fy - j, RP.grass[4 + (j & 1) * 2]);
            }
        });
    }
    /** The stone arch: two piers of big blocks and a round arch of wedge stones; its top hangs over the way through. */
    function arch(L, left, right, seed) {
        const img = L.scratch, xl = left.x0 * C + 16, xr = right.x0 * C + 16, B = (left.y1 + 1) * C - 2;
        const pw = 24, top = B - 76, cx = (xl + xr) / 2, rOut = (xr - xl) / 2 + pw / 2, rIn = (xr - xl) / 2 - pw / 2 + 2, spring = top + rOut;
        tall(L, [xl - 30, top - 10, xr + 30, B + 10], B - 44, true, (S) => {
            void img;
            shadow(S, cx + 6, B + 2, rOut + 8, 6, 0.45);
            for (const px of [xl, xr]) {
                blocks(S, px - pw / 2, spring - 4, pw, B - spring + 4, seed + px);
                for (let j = spring - 4; j < B; j++) { put(S, px - pw / 2 - 1, j, RP.rock[0]); put(S, px + pw / 2, j, RP.rock[0]); put(S, px + pw / 2 - 1, j, RP.rock[2]); }
                rectFill(S, px - pw / 2 - 2, B - 6, pw + 4, 6, RP.rock[3]);
            }
            // Wedge stones round the arch, each shaded on its own.
            const n = 9;
            for (let k = 0; k < n; k++) {
                const a0 = Math.PI + (k / n) * Math.PI, a1 = Math.PI + ((k + 1) / n) * Math.PI;
                const s = shape(), pts = [[cx + Math.cos(a0) * rIn, spring + Math.sin(a0) * rIn], [cx + Math.cos(a0) * rOut, spring + Math.sin(a0) * rOut], [cx + Math.cos(a1) * rOut, spring + Math.sin(a1) * rOut], [cx + Math.cos(a1) * rIn, spring + Math.sin(a1) * rIn]];
                poly(s, S, pts, (px, py) => ((px - cx) / rOut) * -0.4 + ((py - spring) / rOut) * -0.5 + (hash(k, 1, seed) - 0.5) * 0.4);
                fill(S, s, RP.rock.slice(1), { tex: 0.35, seed: seed + k, outline: RP.rock[0] });
                for (const [i] of s.px) { const px = i % S.w, py = (i / S.w) | 0; if (Math.hypot(px - cx, py - spring) > rOut - 4 && vnoise(px / 3, py / 3, seed + 9) > 0.45) put(S, px, py, pick(RP.moss, 0.3 + hash(px, py, seed) * 0.6)); }
            }
            // Ivy trailing down one pier from the arch.
            for (let j = 0; j < 46; j++) { const px = xr + 6 + Math.round(Math.sin(j / 5) * 2); put(S, px, spring - 8 + j, RP.leaf[4]); if (j % 3 === 0) { put(S, px - 1, spring - 8 + j, RP.leaf[6]); put(S, px + 1, spring - 7 + j, RP.leaf[3]); } }
        });
    }

    // ---------------------------------------------------------------------
    // The covered wagon
    // ---------------------------------------------------------------------
    function wheel(img, cx, cy, r, seed) {
        const w = shape();
        for (let a = 0; a < 360; a += 2) {
            const t = (a * Math.PI) / 180;
            for (let rr = r - 2.5; rr <= r; rr += 0.5) sset(w, img, cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, Math.cos(t) * -0.6 + Math.sin(t) * -0.8);
        }
        for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2; thick(w, img, cx, cy, cx + Math.cos(t) * (r - 2), cy + Math.sin(t) * (r - 2), 0.8, -0.1); }
        fill(img, w, RP.plank.slice(1), { tex: 0.3, seed, outline: RP.plank[0] });
        const hub = shape(); ellipse(hub, img, cx, cy, 3, 3); fill(img, hub, SA.PAL.iron, { outline: SA.PAL.iron[0] });
        for (let a = 0; a < 360; a += 3) { const t = (a * Math.PI) / 180; put(img, cx + Math.cos(t) * r, cy + Math.sin(t) * r, SA.PAL.iron[Math.sin(t) < 0 ? 4 : 2]); }
    }
    function wagon(L, b, seed, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 2, W = X1 - X0;
        tall(L, [X0 - 40, b.y0 * C - 60, X1 + 16, B + 10], b.y0 * C, overhead, (S) => {
            shadow(S, X0 + W / 2 + 4, B + 1, W / 2 + 12, 8, 0.5);
            const bx0 = X0 + 4, bx1 = X1 + 4, bedTop = B - 40, bedBot = B - 20;
            // The shafts reaching forward to the left, resting on the ground.
            const sh = shape(); thick(sh, S, bx0 + 2, bedBot - 3, X0 - 30, B - 3, 1.6); thick(sh, S, bx0 + 2, bedBot - 10, X0 - 24, B - 11, 1.6); thick(sh, S, X0 - 30, B - 3, X0 - 24, B - 11, 1.3);
            fill(S, sh, RP.plank.slice(1), { outline: RP.plank[0] });
            wheel(S, bx0 + 16, B - 13, 11, seed + 1);                          // the far front wheel, half hidden
            wheel(S, bx1 - 22, B - 15, 14, seed + 3);                          // the far rear wheel
            // The bed: a plank box, side boards, and the goods at the front.
            planks(S, bx0, bedTop, bx1 - bx0, bedBot - bedTop, seed, RP.plank, false);
            for (let px = bx0 + 18; px < bx1 - 4; px += 18) { const st = shape(); box(st, S, px, bedTop - 2, 3, bedBot - bedTop + 3, 0.1); fill(S, st, RP.plank.slice(1), { outline: RP.plank[0] }); }
            const rail = shape(); box(rail, S, bx0 - 2, bedTop - 4, bx1 - bx0 + 4, 5, 0.4); box(rail, S, bx0 - 2, bedBot - 1, bx1 - bx0 + 4, 4, -0.3); fill(S, rail, RP.plank.slice(1), { tex: 0.4, seed, outline: RP.plank[0] });
            // The canvas cover on hoops, torn and stained, the hoops showing through the rips.
            const cy0 = bedTop - 46;
            const cover = shape(); poly(cover, S, [[bx0 + 6, bedTop - 2], [bx0 + 2, cy0 + 16], [bx0 + 14, cy0 + 2], [bx1 - 14, cy0 - 2], [bx1 - 2, cy0 + 12], [bx1 - 1, bedTop - 2]],
                (px, py) => 0.5 - ((py - cy0) / 46) * 0.9 + Math.sin((px - bx0) / 9) * 0.14);
            const rip = (px, py) => fbm(px / 9, py / 6, seed + 3) > 0.67 && py > cy0 + 14;
            for (const [i] of cover.px) put(S, i % S.w, (i / S.w) | 0, hash(i, 0, seed) < 0.5 ? [18, 13, 9] : [26, 19, 13]);   // the dark inside, seen through the rips
            for (const i of [...cover.px.keys()]) if (rip(i % S.w, (i / S.w) | 0)) cover.px.delete(i);
            fill(S, cover, RP.canvas, { tex: 0.25, seed: seed + 2, outline: RP.canvas[0] });
            for (let hx = bx0 + 18; hx < bx1 - 6; hx += 18) for (let py = cy0 + 2; py < bedTop - 2; py++) if (!cover.px.has(py * S.w + hx)) { put(S, hx, py, RP.plank[3]); put(S, hx + 1, py, RP.plank[1]); } else { put(S, hx, py, RP.canvas[1]); put(S, hx + 1, py, RP.canvas[4]); }
            for (const [i] of cover.px) { const px = i % S.w, py = (i / S.w) | 0; const st = fbm(px / 6, py / 6, seed + 9); if (st > 0.64) put(S, px, py, [104, 66, 40], Math.min(0.75, (st - 0.64) * 4)); if (hash(px, py, seed) < 0.008) put(S, px, py, [72, 28, 20]); }
            for (let x = bx0 + 6; x < bx1 - 2; x++) if (hash(x >> 1, 0, seed + 5) < 0.35) for (let j = 0; j < 2 + hash(x, 1, seed) * 6; j++) put(S, x, bedTop - 2 + j, RP.canvas[2]);   // ragged hem
            // The open front: dark inside, a sack and a box showing.
            const fr = shape(); ellipse(fr, S, bx0 + 9, cy0 + 24, 8, 18); fill(S, fr, R(['#120d09', '#1c140e']), { edge: false });
            const sack = shape(); ellipse(sack, S, bx0 + 8, bedTop - 8, 6, 7); fill(S, sack, SA.PAL.straw, { tex: 0.5, seed, outline: RP.plank[0] });
            for (let k = 0; k < 7; k++) put(S, bx0 + 3 + k * 2, bedTop - 1 - (k & 1), RP.glow[3]);   // something gold spilled at the front
            wheel(S, bx1 - 26, B - 17, 17, seed + 4);                         // the big near rear wheel
            wheel(S, bx0 + 22, B - 12, 12, seed + 6);                         // the near front wheel
        });
    }

    // ---------------------------------------------------------------------
    // The scene
    // ---------------------------------------------------------------------
    function overgrownRoad(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) };
        const seed = 57, scene = { smoke: [], flames: [] };
        const kind = ground(L.base, map, nameAt, cw, ch, seed);
        details(L.base, kind, seed);
        const OPEN = new Set(['grass', 'dirt_path', 'flowers', 'reeds', 'bridge']);
        const open = (x, y) => OPEN.has(nameAt(map, x, y));
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        // Flat things first: flowers, reeds.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (n === 'flowers') flowers(L, x, y, seed);
            else if (n === 'reeds') reeds(L, x, y, seed);
        }
        // Everything that stands up, back to front.
        const items = [], seen = new Set();
        const BLOCKS = { tent: 1, ruin: 1, wagon: 1, log: 1, bridge: 1 };
        const pillars = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (BLOCKS[n]) {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set([n]), seen), s = seed + b.x0 * 13 + b.y0 * 7;
                const over = [...Array(b.x1 - b.x0 + 1)].some((_, i) => open(b.x0 + i, b.y0 - 1));
                const draw = { tent: () => tent(L, b, s, over), ruin: () => ruins(L, b, s, over), wagon: () => wagon(L, b, s, over), log: () => log(L, b, s), bridge: () => bridge(L, b, s) }[n];
                items.push({ y: n === 'bridge' ? b.y0 - 0.5 : b.y1 + 0.9, x: b.x0, draw });
                continue;
            }
            if (n === 'arch') {
                if (seen.has(`${x},${y}`)) continue;
                pillars.push(blockOf(map, nameAt, x, y, new Set(['arch']), seen));
                continue;
            }
            const cx = x * C + 16, gy = y * C + 28, ov = open(x, y - 1);
            const P = {
                tree: () => tree(L, x, y, seed, { big: 1.45 + hash(x, y, seed) * 0.55, ramp: RP.leaf, overhead: behind(x, y) }),
                red_tree: () => tree(L, x, y, seed + 3, { big: 1.45 + hash(x, y, seed) * 0.4, ramp: RP.red, overhead: behind(x, y) }),
                bank_rocks: () => bankRocks(L, map, nameAt, x, y, seed),
                rock: () => { boulder(L.base, cx - 4, gy - 8, 10, 8, seed + x * 3 + y); boulder(L.base, cx + 8, gy - 4, 6, 5, seed + x + y * 3); },
                bush: () => bush(L, x, y, seed),
                stump: () => stump(L, x, y, seed),
                barrel: () => barrel(L, cx, gy, seed + x),
                crate: () => { crate(L, cx, gy, seed + x + y, 1); },
                campfire: () => campfire(L, x, y, seed, behind(x, y), scene),
                banner: () => tall(L, [cx - 40, gy - 96, cx + 40, gy + 6], y * C, behind(x, y), (S) => bannerPost(S, cx, gy, seed + x * 7 + y, hash(x, y, seed + 2) < 0.5, scene)),
                lantern: () => tall(L, [cx - 20, gy - 60, cx + 30, gy + 6], y * C, ov, (S) => lanternPost(S, cx - 4, gy, seed + x, scene)),
                signpost: () => tall(L, [cx - 30, gy - 52, cx + 30, gy + 6], y * C, ov, (S) => signpost(S, cx, gy, seed + x)),
                fence: () => fence(L, map, nameAt, x, y, seed)
            }[n];
            if (P) items.push({ x, y: y + (n === 'tree' || n === 'red_tree' ? 0.8 : n === 'bank_rocks' ? 0.3 : 0.5), draw: P });
        }
        // Arch piers pair up across the way through.
        for (const l of pillars) {
            const r = pillars.find((p) => p.y0 === l.y0 && p.x0 === l.x0 + 2);
            if (r) items.push({ x: l.x0, y: l.y1 + 0.9, draw: () => arch(L, l, r, seed + l.x0) });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Static smoke over the fire (the moving puffs come from animate).
        for (const c of scene.smoke) for (let k = 0; k < 6; k++) {
            const px = c.x + k * 2 + Math.sin(k) * 2, py = c.y - k * 6, r = 2 + k * 0.8;
            for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) put(L.over, px + i, py + j, [190, 186, 176], 0.14 - k * 0.018);
        }
        // Soft shade at the edges of the wood.
        for (let y = 0; y < L.base.h; y++) for (let x = 0; x < L.base.w; x++) {
            const d = Math.min(x, y, L.base.w - 1 - x, L.base.h - 1 - y);
            if (d < 14) put(L.base, x, y, RP.shadow, (1 - d / 14) * 0.3);
        }
        const water = [], falls = [];
        for (let i = 0; i < kind.length; i += 5) {
            if (kind[i] === 3 && hash(i, 0, seed) < 0.12) water.push(i);
            if (kind[i] === 4 && hash(i, 1, seed) < 0.06) falls.push(i);
        }
        const W = L.base.w;
        function animate(g, time) {
            g.fillStyle = 'rgba(240, 250, 252, 0.6)';                  // water sliding down the falls
            for (let k = 0; k < falls.length; k++) {
                const i = falls[k], x = i % W, y = (i / W) | 0, off = ((time / 8 + k * 37) % 24) | 0;
                if (kind[i + off * W] === 4) g.fillRect(x, y + off, 1, 3);
            }
            for (let k = 0; k < scene.flames.length; k++) {            // the campfire and the lanterns
                const f = scene.flames[k], a = Math.sin(time / 90 + k * 2.1), b2 = Math.sin(time / 57 + k);
                if (f.big) {
                    g.fillStyle = 'rgba(255, 220, 120, 0.85)'; g.fillRect(f.x - 2 + (a > 0.3 ? 1 : 0), f.y - 8 - (b2 > 0 ? 2 : 0), 3, 5);
                    g.fillStyle = 'rgba(255, 130, 40, 0.65)'; g.fillRect(f.x - 4 + (b2 > 0.5 ? 1 : 0), f.y - 3, 7, 4);
                    if (a > 0.6) { g.fillStyle = 'rgba(255, 200, 90, 0.9)'; g.fillRect(f.x + (b2 > 0 ? 3 : -4), f.y - 14 - ((time / 40) % 6 | 0), 1, 1); }
                } else {
                    g.fillStyle = `rgba(255, 220, 130, ${(0.35 + 0.25 * a).toFixed(3)})`; g.fillRect(f.x - 2, f.y - 2, 4, 5);
                }
            }
            for (let k = 0; k < scene.smoke.length; k++) {             // smoke from the fire
                const c = scene.smoke[k];
                for (let p = 0; p < 5; p++) {
                    const t = ((time / 50 + p * 20 + k * 13) % 100) / 100;
                    const r = 2 + t * 5, x = c.x + t * 10 + Math.sin(time / 700 + p) * 3, y = c.y - t * 46;
                    g.fillStyle = `rgba(200, 196, 188, ${(0.2 * (1 - t)).toFixed(3)})`;
                    g.fillRect(Math.round(x - r), Math.round(y - r * 0.7), Math.round(r * 2), Math.round(r * 1.4));
                }
            }
        }
        return { w: L.base.w, h: L.base.h, base: L.base.data, over: L.over.data, water, animate };
    }

    SA.scenes.overgrown_road = overgrownRoad;
    if (isNode) module.exports = overgrownRoad;
})(typeof window !== 'undefined' ? window : globalThis);
