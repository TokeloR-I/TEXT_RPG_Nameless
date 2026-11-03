/* =========================================================================
 * Enso's Last Stand — SCENE ART: BAKER'S LANE (original, drawn by code; Saffron/Quill)
 * Paints Baker's Lane whole, after Tokelo's reference (2026-11-03): a dusk lane of timber-framed houses with dark
 * slate roofs inside the town wall. A cobbled road runs east from the west gate, with a round drain set in the
 * cobbles where the lane to the south leaves it. On the north side: Oda's bakery with its awning and bread sign, the
 * domed brick oven with a fire in its mouth and a tall chimney, the woodshed stacked with split logs, a table of
 * loaves and flour, a cabbage garden under a washing line, Greta's smokehouse and a fenced yard of hens. On the
 * south side: a house by the pig pen and its lean-to, the stone well, the big house with its gable and red rose
 * beds, a house at the foot of the lane, washing lines, barrels and crates, lantern posts, bare autumn trees.
 *
 * Adds the 'bakers_lane' scene to ENSO.sceneArt (ui/scene-art.js) and reuses its painting kit. The map's tiles
 * (legend in src/world/chapter1-maps.js) still decide collision, exits and where each thing stands; the scene
 * paints what the tiles say is there. No image goes in: every pixel comes from shapes, noise and the palette
 * below (docs/art/ORIGINAL_ART_PLAN.md §0). Review: `node tools/preview-scene.js village_residential_lane out.png 1`.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (!SA) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, rectFill, shape, ellipse, box, poly, thick, fill, shadow,
        field, tree, stump, barrel, crate, fence, well, blockOf, masonry } = SA.kit;

    // The lane palette: an autumn dusk. Olive-brown grass, brown earth, grey-brown cobbles, warm plaster between
    // near-black beams, dark violet-grey slates, red brick, cream canvas, orange leaves and warm window light.
    const BP = {
        grass: R(['#1b1c10', '#232414', '#2c2d18', '#36361c', '#414020', '#4d4a25', '#5a552b']),
        dirt: R(['#211a13', '#2b2219', '#362b1f', '#423425', '#4f3e2c', '#5d4934']),
        cobble: R(['#25221f', '#2f2b27', '#3a3530', '#45403a', '#524c44', '#615a50', '#71695d']),
        mortar: [22, 18, 14],
        stone: R(['#1f1e22', '#2a292d', '#353438', '#424044', '#504d4f', '#605c5b', '#716c68', '#86807a']),
        moss: R(['#1d2112', '#272d16', '#32391b', '#3e4520']),
        slate: R(['#141219', '#1c1922', '#25212c', '#2f2a37', '#3a3443', '#463f50', '#544b5e']),
        timber: R(['#120c09', '#1b130e', '#251a12', '#302217', '#3c2b1d']),
        plaster: R(['#4a4033', '#5c5040', '#6f624d', '#82735a', '#968566', '#a99773', '#bba982']),
        plank: R(['#140e0a', '#1d150f', '#271c14', '#32241a', '#3e2d20', '#4b3727', '#58412f']),
        brick: R(['#2a100c', '#3e1811', '#552117', '#6b2b1d', '#823724', '#97432c']),
        glow: R(['#4d220c', '#8f4515', '#d07c26', '#f6b44c', '#ffe08f']),
        canvas: R(['#5a5243', '#77705d', '#958c75', '#b1a78c', '#c9bfa2', '#ddd3b6']),
        bread: R(['#3d1f0c', '#5c3213', '#7d4a1d', '#9c6428', '#b98039', '#d29c52']),
        flour: R(['#6d675b', '#8f887a', '#b2ab9a', '#d3cdbb', '#ebe6d6']),
        leaf: R(['#1f120a', '#33190c', '#4c240f', '#673312', '#834517', '#a05a1d', '#bb7427']),
        green: R(['#121a0d', '#1a2512', '#233217', '#2d401c', '#384f21', '#455e27', '#566e2f']),
        cabbage: R(['#16260f', '#213a16', '#2e501d', '#3f6826', '#55802f', '#709a3d']),
        bark: R(['#0d0a09', '#15110e', '#1e1813', '#282019', '#33291f', '#3f3327']),
        clothRed: R(['#2c0a0a', '#4a100f', '#681814', '#86221a', '#a02f22']),
        linen: R(['#57534a', '#7a756a', '#a29c8e', '#c8c2b2', '#e2dccb']),
        hen: R(['#6d675c', '#9a9284', '#c4bcaa', '#e6e0cf']),
        pig: R(['#5a3530', '#7f4d45', '#a4685d', '#c3877a', '#d9a294']),
        rose: [[150, 30, 34], [186, 46, 48], [214, 70, 66]],
        shadow: [5, 6, 10]
    };
    const pick = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))];

    // ---------------------------------------------------------------------
    // Ground: grass, mud and cobbles, decided per pixel from smoothed fields over the cells.
    // ---------------------------------------------------------------------
    const COBBLED = new Set(['cobble', 'drain']);
    const DIRTY = { dirt_path: 1, pig_mud: 1, pig_shed: 0.8, chickens: 0.85, coop: 0.7, hay: 0.75, woodshed: 0.7, oven: 0.6, bread_table: 0.6,
        sacks: 0.6, smokehouse: 0.5, mounting_stone: 0.5, barrel: 0.45, crate: 0.45, well: 0.55, lantern: 0.35, laundry: 0.3, stump: 0.3 };
    const BUILT = new Set(['house', 'bakery', 'smokehouse', 'town_wall', 'wall_banner']);

    function ground(img, map, nameAt, cw, ch, seed) {
        const cobC = new Float32Array(cw * ch), dirtC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), i = y * cw + x;
            dirtC[i] = DIRTY[n] || (BUILT.has(n) ? 0.6 : 0);
            if (COBBLED.has(n)) cobC[i] = 1;
            else if (n !== 'grass' && n !== 'dirt_path' && !BUILT.has(n)) {
                // A thing standing beside the road sits on the cobbles round it.
                const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => COBBLED.has(nameAt(map, x + dx, y + dy))).length;
                cobC[i] = around >= 2 ? 0.9 : around * 0.3;
            }
        }
        const cob = field(cobC, cw, ch), dirt = field(dirtC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);               // 0 grass, 1 mud, 2 cobble
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x;
            const n1 = fbm(x / 20, y / 20, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            const c = cob(x, y) + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.14;
            if (c > 0.5) { kind[i] = 2; continue; }
            const d = dirt(x, y) + Math.max(0, c) * 0.6 + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.12;
            kind[i] = d > 0.5 ? 1 : 0;
        }
        // The drain: where the lane leaves the road, the cobbles are laid in rings round it.
        const drains = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (nameAt(map, x, y) === 'drain') drains.push([x * C + 16, y * C + 16]);
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 0) {                                         // grass: dark, patchy, worn toward the mud
                const big = fbm(x / 30, y / 30, seed + 3), mid = vnoise(x / 5, y / 5, seed + 4), fine = hash(x, y, seed + 5);
                let t = big * 0.5 + mid * 0.35 + fine * 0.2;
                if (kind[i - 1] === 1 || kind[i + 1] === 1 || kind[i - img.w] === 1 || kind[i + img.w] === 1) t -= 0.25;
                put(img, x, y, pick(BP.grass, t));
            } else if (k === 1) {                                  // mud: mottled, darker at the rims
                let t = fbm(x / 9, y / 9, seed + 7) * 0.7 + hash(x, y, seed + 8) * 0.25;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 0 || kind[i + r] === 0 || kind[i - r * img.w] === 0 || kind[i + r * img.w] === 0) t -= 0.12;
                put(img, x, y, pick(BP.dirt, t));
            } else {
                const dr = drains.find(([dx, dy]) => (x - dx) ** 2 + ((y - dy) * 1.25) ** 2 < 74 * 74);
                if (dr) {                                          // rings of setts round the drain
                    const rx = x + 0.5 - dr[0], ry = (y + 0.5 - dr[1]) * 1.25, r = Math.hypot(rx, ry);
                    const ring = Math.floor(r / 7), segs = Math.max(6, Math.floor((2 * Math.PI * (ring * 7 + 3.5)) / 8));
                    const a = (Math.atan2(ry, rx) / (2 * Math.PI) + 1 + ring * 0.37) % 1, sg = Math.floor(a * segs);
                    const edgeR = Math.min(r % 7, 7 - (r % 7)), edgeA = Math.min((a * segs) % 1, 1 - ((a * segs) % 1)) * (2 * Math.PI * r / segs);
                    if (edgeR < 0.9 || edgeA < 0.9) { put(img, x, y, BP.mortar); continue; }
                    let t = 0.4 + hash(ring, sg, seed) * 0.3 - (ry / 7) * 0.02 + (rx < 0 ? 0.04 : -0.04);
                    if (edgeR < 1.7 || edgeA < 1.7) t -= 0.1;
                    put(img, x, y, pick(BP.cobble, t));
                    continue;
                }
                // cobbles: rounded stones, irregular, mud between
                const gx = Math.floor(x / 7), gy = Math.floor(y / 6);
                let d1 = 1e9, d2 = 1e9, id = 0, cxs = 0, cys = 0;
                for (let j = -1; j <= 1; j++) for (let i2 = -1; i2 <= 1; i2++) {
                    const ax = gx + i2, ay = gy + j;
                    const px = ax * 7 + 1 + hash(ax, ay, seed + 10) * 5, py = ay * 6 + 1 + hash(ay, ax, seed + 11) * 4;
                    const d = ((x + 0.5 - px) / 1.15) ** 2 + (y + 0.5 - py) ** 2;
                    if (d < d1) { d2 = d1; d1 = d; id = ax * 7919 + ay; cxs = px; cys = py; } else if (d < d2) d2 = d;
                }
                const edge = Math.sqrt(d2) - Math.sqrt(d1);
                if (edge < 0.9) { put(img, x, y, hash(x, y, seed + 9) < 0.12 ? BP.moss[1] : hash(x, y, seed + 19) < 0.5 ? BP.mortar : BP.dirt[1]); continue; }
                let t = 0.34 + hash(id, 3, seed) * 0.28 - (fbm(x / 34, y / 34, seed + 12) - 0.5) * 0.4;
                t += ((cxs - x) * 0.6 + (cys - y) * 0.8) * 0.045;               // lit from the top left
                if (edge < 1.6) t -= 0.08;
                if (kind[i - 2] !== 2 || kind[i + 2] !== 2 || kind[i - 2 * img.w] !== 2 || kind[i + 2 * img.w] !== 2) t -= 0.14;
                put(img, x, y, pick(BP.cobble, t));
            }
        }
        // A kerb of bigger, paler stones where the road meets the verge.
        for (let n = 0; n < 2600; n++) {
            const x = Math.floor(hash(n, 50, seed) * img.w), y = Math.floor(hash(n, 51, seed) * img.h), i = y * img.w + x;
            if (kind[i] !== 2) continue;
            const rim = [[-5, 0], [5, 0], [0, -5], [0, 5]].some(([dx, dy]) => { const k = kind[i + dy * img.w + dx]; return k !== undefined && k !== 2; });
            if (!rim || hash(n, 52, seed) < 0.55) continue;
            const s = shape(); ellipse(s, img, x, y, 3 + hash(n, 53, seed) * 2.5, 2.4 + hash(n, 54, seed) * 1.4);
            fill(img, s, BP.cobble.slice(2), { tex: 0.4, seed: seed + n, outline: BP.mortar });
        }
        return kind;
    }

    /** Small things on the ground: tufts, fallen orange leaves, pebbles, puddles on the road. */
    function details(img, kind, seed) {
        const N = (img.w * img.h) / 40;
        for (let n = 0; n < N; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x];
            const r = hash(n, 9, seed);
            if (k === 0 && r < 0.6) {                              // a tuft
                const h = 2 + Math.floor(hash(n, 10, seed) * 3), lt = BP.grass[6], md = BP.grass[4];
                for (let b = -1; b <= 1; b++) for (let j = 0; j < h - Math.abs(b); j++) put(img, x + b + (j === h - 1 - Math.abs(b) ? b : 0), y - j, j === h - 1 - Math.abs(b) ? lt : md);
                put(img, x, y + 1, BP.grass[0]);
            } else if ((k === 0 || k === 1 || (k === 2 && r < 0.68)) && r < 0.8) { // a fallen leaf
                const c = pick(BP.leaf, 0.45 + hash(n, 11, seed) * 0.55);
                put(img, x, y, c); put(img, x + 1, y, c); if (hash(n, 12, seed) < 0.5) put(img, x, y + 1, BP.leaf[2]);
            } else if (k === 2 && r < 0.9) {                       // a loose stone
                put(img, x, y, BP.cobble[6]); put(img, x + 1, y, BP.cobble[4]); put(img, x, y + 1, BP.mortar);
            } else if (k === 0 && r < 0.86) {                      // a tiny pale flower
                put(img, x, y, hash(n, 13, seed) < 0.5 ? [200, 196, 176] : [176, 150, 200]);
            }
        }
        // Puddles between the cobbles and on the mud, holding a little of the dusk sky.
        for (let n = 0; n < 50; n++) {
            const x = Math.floor(hash(n, 20, seed) * img.w), y = Math.floor(hash(n, 21, seed) * img.h), k = kind[y * img.w + x];
            if (k !== 1 && k !== 2) continue;
            const s = shape(); ellipse(s, img, x, y, 4 + hash(n, 22, seed) * 6, 2 + hash(n, 23, seed) * 2);
            for (const p of [...s.px.keys()]) { const px = p % img.w, py = (p / img.w) | 0; if (kind[p] !== k) s.px.delete(p); else s.px.set(p, vnoise(px / 3, py, seed + n) > 0.72 ? 1 : 0); }
            for (const [p, v] of s.px) { const px = p % img.w, py = (p / img.w) | 0; put(img, px, py, v ? [86, 96, 112] : [34, 38, 48]); if (!s.px.has(p - img.w)) put(img, px, py, BP.dirt[0]); }
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
    function planks(img, x, y, w, h, seed, ramp = BP.plank, vertical = true) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const a = vertical ? i : j, b2 = vertical ? j : i, b = Math.floor(a / 5), u = a % 5;
            let t = 0.4 + (hash(b, 0, seed) - 0.5) * 0.35 + (vnoise(b * 3, (y + b2) / 9, seed) - 0.5) * 0.3;
            if (u === 0) t = 0.05; else if (u === 1) t += 0.15;
            put(img, x + i, y + j, pick(ramp, t));
        }
    }
    /** Roof courses (slates) over a polygon, ragged, mossy in places; `lit(x)` shades one slope lighter. */
    function roofing(img, pts, seed, { cw = 7, chh = 6, lit = () => 0, moss = 0.74 } = {}) {
        const area = shape(); poly(area, img, pts, 0);
        const top = Math.min(...pts.map((p) => p[1]));
        for (const [i] of area.px) {
            const x = i % img.w, y = (i / img.w) | 0;
            const course = Math.floor((y - top) / chh), v = (y - top) % chh, off = (course % 2) * (cw >> 1) + Math.floor(hash(course, 0, seed) * 2);
            const col = Math.floor((x + off) / cw), u = (x + off) % cw;
            const hang = Math.floor(hash(col, course, seed + 1) * 2.5);
            let t = 0.4 + (hash(col, course, seed) - 0.5) * 0.3 + (v / chh) * 0.3 + lit(x, y);
            if (v < hang) t = 0.06;                                    // the shadow of the course above, ragged
            else if (u === cw - 1) t -= 0.22;
            if (hash(col, course, seed + 2) < 0.025) t = 0.08;         // a slipped slate
            put(img, x, y, pick(BP.slate, t));
            if (fbm(x / 9, y / 7, seed + 3) > moss && hash(x, y, seed) < 0.7) put(img, x, y, pick(BP.moss, vnoise(x / 2, y / 2, seed) * 0.95));
        }
        return area;
    }
    /** A window of small leaded panes, lit warm from inside (or dark), in a timber frame with a sill. */
    function litWindow(img, x, y, w, h, seed, { dark = false } = {}) {
        if (!dark) for (let j = -5; j < h + 5; j++) for (let i = -5; i < w + 5; i++) put(img, x + i, y + j, BP.glow[2], 0.1);
        rectFill(img, x - 2, y - 2, w + 4, h + 4, BP.timber[0]);
        rectFill(img, x - 1, y - 1, w + 2, h + 2, BP.timber[3]);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const d = Math.hypot((i - w / 2) / w, (j - h * 0.6) / h);
            let c = dark ? [14, 13, 18] : pick(BP.glow, 0.98 - d * 1.4 + (hash(i, j, seed) - 0.5) * 0.15);
            if ((i + j) % 4 === 0 || (i - j + 400) % 4 === 0) c = dark ? [26, 24, 30] : pick(BP.glow, 0.45);   // the leading
            put(img, x + i, y + j, c);
        }
        rectFill(img, x + Math.floor(w / 2) - 1, y, 2, h, BP.timber[1]);
        rectFill(img, x - 3, y + h + 1, w + 6, 2, BP.timber[4]);
    }
    function door(img, x, y, w, h, seed) {
        rectFill(img, x - 3, y - 3, w + 6, h + 3, BP.timber[0]);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(img, x + i, y + j, pick(BP.plank, 0.3 + hash(Math.floor(i / 4), 0, seed) * 0.35 + (i % 4 === 0 ? -0.25 : 0)));
        for (let i = 0; i < w; i++) { put(img, x + i, y + Math.round(Math.abs(i - w / 2) * 0.4), BP.timber[0]); }   // the arched head
        rectFill(img, x, y + 7, w, 2, PAL.iron[1]); rectFill(img, x, y + h - 9, w, 2, PAL.iron[1]);
        put(img, x + w - 4, y + h / 2, PAL.iron[4]); put(img, x + w - 4, y + h / 2 + 1, PAL.iron[2]);
        const st = shape(); box(st, img, x - 5, y + h, w + 10, 4, 0.3); fill(img, st, BP.stone, { tex: 0.4, seed, outline: BP.stone[0] });
    }
    function chimney(img, x, top, h, seed, smoke, ramp = BP.stone) {
        masonry(img, x, top, 14, h, seed, ramp);
        rectFill(img, x - 2, top - 3, 18, 4, ramp[5]); rectFill(img, x - 2, top + 1, 18, 1, ramp[1]);
        for (let y = top; y < top + h; y++) { put(img, x - 1, y, ramp[0]); put(img, x + 14, y, ramp[0]); }
        rectFill(img, x + 3, top - 3, 8, 2, [8, 7, 8]);
        smoke.push({ x: x + 7, y: top - 4 });
    }
    /** A timber-framed wall: warm plaster between dark posts, rails and braces. */
    function timberWall(img, x, y, w, h, seed) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const t = 0.62 + (fbm((x + i) / 6, (y + j) / 6, seed) - 0.5) * 0.35 + (hash(x + i, y + j, seed) - 0.5) * 0.12 - (j / h) * 0.18;
            put(img, x + i, y + j, pick(BP.plaster, t));
        }
        const beam = (bx, by, bw, bh) => { for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) put(img, bx + i, by + j, pick(BP.timber, (i === 0 || j === 0 ? 0.75 : 0.4) + (vnoise((bx + i) / 2, (by + j) / 6, seed) - 0.5) * 0.4)); };
        const n = Math.max(2, Math.round(w / 24)), step = w / n;
        const rail = h > 34 ? Math.round(h * 0.48) : -1;
        for (let k = 0; k <= n; k++) beam(Math.round(x + k * step) - (k === n ? 3 : 0), y, 3, h);
        beam(x, y, w, 3); beam(x, y + h - 3, w, 3);
        if (rail > 0) beam(x, y + rail, w, 3);
        for (let k = 0; k < n; k++) {                              // braces in some panels
            if (hash(k, Math.round(x), seed + 3) < 0.55) continue;
            const ax = Math.round(x + k * step) + 3, bx = Math.round(x + (k + 1) * step) - 1, top = rail > 0 ? y + rail + 3 : y + 3, bot = y + h - 3;
            const s = shape(); hash(k, 1, seed) < 0.5 ? thick(s, img, ax, bot, bx, top, 1.3) : thick(s, img, ax, top, bx, bot, 1.3);
            fill(img, s, BP.timber, { outline: null, edge: false });
        }
        return { n, step, rail };
    }

    // ---------------------------------------------------------------------
    // Buildings
    // ---------------------------------------------------------------------
    /** A house: a timber-framed front on a stone footing, lit leaded windows, a door, a hipped slate roof, and on
     *  the wider ones a cross gable with its own framed end and window. Options: gable 'left' | 'right' | 'mid',
     *  plank walls (sheds), a chimney, and the bakery's awning and sign. */
    function house(L, b, seed, scene, o = {}) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C, W = X1 - X0, H = B - Y0;
        const wallH = Math.max(36, Math.min(80, Math.round(H * 0.42))), wallTop = B - wallH;
        const roofTop = Y0 + 2, eave = wallTop + 5;
        shadow(img, X0 + W / 2 + 10, B + 2, W / 2 + 12, 8, 0.5);
        const wx0 = X0 + 4, ww = W - 8;
        if (o.plank) planks(img, wx0, wallTop, ww, wallH - 8, seed); else timberWall(img, wx0, wallTop, ww, wallH - 8, seed);
        masonry(img, X0 + 3, B - 9, W - 6, 9, seed + 1, BP.stone);
        rectFill(img, X0 + 3, B - 10, W - 6, 1, BP.stone[0]);
        // Cross gable span, if any.
        const gw = Math.max(64, Math.min(124, Math.round(W * 0.4)));
        const gx0 = o.gable === 'left' ? X0 + 12 : o.gable === 'right' ? X1 - 12 - gw : o.gable === 'mid' ? Math.round(X0 + W * 0.56 - gw / 2) : null;
        const gcx = gx0 != null ? gx0 + gw / 2 : null;
        // Door (under the gable when there is one) and windows along the front.
        const dw = 16, dh = Math.min(30, wallH - 16);
        const dx = Math.round(o.doorAt != null ? X0 + W * o.doorAt - dw / 2 : gcx != null ? gcx - dw / 2 : X0 + W * (hash(b.x0, b.y0, seed) < 0.5 ? 0.36 : 0.64) - dw / 2);
        door(img, dx, B - 9 - dh, dw, dh, seed + 2);
        const wy = wallTop + Math.max(7, Math.round((wallH - 8) * 0.24)), wwin = 13, wh = 13;
        const slots = Math.max(1, Math.floor(W / 44));
        for (let k = 0; k < slots; k++) {
            const wxx = Math.round(X0 + ((k + 0.5) / slots) * W - wwin / 2);
            if (wxx + wwin > dx - 7 && wxx < dx + dw + 7) continue;
            if (o.awning && wxx + wwin > o.awning[0] - 4 && wxx < o.awning[1] + 4) continue;
            litWindow(img, wxx, wy, wwin, wh, seed + k, { dark: hash(k, b.x0, seed + 3) < 0.18 });
            scene.windows.push({ x: wxx + wwin / 2, y: wy + wh / 2 });
        }
        // The main roof: a hipped slope seen from the front, a ridge, ragged eaves.
        const pts = [[X0 - 8, eave], [X1 + 8, eave], [X1 - 10, roofTop + 12], [X0 + 10, roofTop + 12]];
        roofing(img, pts, seed + 6);
        const ridge = shape(); box(ridge, img, X0 + 10, roofTop + 8, W - 20, 5, 0.4); fill(img, ridge, BP.slate.slice(2), { tex: 0.4, seed, outline: [8, 6, 9] });
        for (let x = X0 - 8; x < X1 + 8; x++) {
            const d = 1 + Math.floor(hash(x >> 1, b.y1, seed + 7) * 3);
            for (let j = 0; j < d; j++) put(img, x, eave + j, j === d - 1 ? [8, 6, 9] : BP.slate[2]);
            put(img, x, eave + d, BP.shadow, 0.55); put(img, x, eave + d + 1, BP.shadow, 0.3);
        }
        for (let y = roofTop + 12; y < eave; y++) {                // the hip edges
            const f = (y - roofTop - 12) / (eave - roofTop - 12);
            put(img, Math.round(X0 + 10 - 18 * f), y, [8, 6, 9]); put(img, Math.round(X1 - 10 + 18 * f), y, [8, 6, 9]);
        }
        // The cross gable: its own roof running back to the ridge, and a framed gable end with a window.
        if (gx0 != null) {
            const apex = Math.max(roofTop + 22, eave - Math.round(gw * 0.5));
            const gp = [[gx0 - 9, eave + 3], [gx0 + 4, roofTop + 12], [gx0 + gw - 4, roofTop + 12], [gx0 + gw + 9, eave + 3]];
            roofing(img, gp, seed + 11, { lit: (x) => (x < gcx ? 0.12 : -0.1) });
            for (let y = roofTop + 12; y < eave; y++) put(img, Math.round(gcx), y, BP.slate[5], 0.6);
            const tri = shape(); poly(tri, img, [[gx0 + 1, eave + 1], [gcx, apex], [gx0 + gw - 1, eave + 1]], 0);
            for (const [i] of tri.px) { const x = i % img.w, y = (i / img.w) | 0; put(img, x, y, pick(BP.plaster, 0.55 + (fbm(x / 6, y / 6, seed) - 0.5) * 0.3 - ((eave - y) / (eave - apex)) * 0.12)); }
            // Timber in the gable: a king post, a collar, two struts.
            const tb = shape();
            thick(tb, img, gcx, apex + 2, gcx, eave, 1.4); thick(tb, img, gx0 + gw * 0.18, eave - (eave - apex) * 0.35, gx0 + gw * 0.82, eave - (eave - apex) * 0.35, 1.3);
            thick(tb, img, gx0 + gw * 0.2, eave, gcx - 3, eave - (eave - apex) * 0.62, 1.2); thick(tb, img, gx0 + gw * 0.8, eave, gcx + 3, eave - (eave - apex) * 0.62, 1.2);
            fill(img, tb, BP.timber, { edge: false });
            const gwy = Math.round(eave - (eave - apex) * 0.33);
            litWindow(img, Math.round(gcx - 6), gwy, 12, 12, seed + 12);
            scene.windows.push({ x: gcx, y: gwy + 6 });
            rectFill(img, gx0 - 2, eave + 1, gw + 4, 3, BP.timber[2]);
            const verge = shape(); thick(verge, img, gx0 - 8, eave + 3, gcx, apex - 5, 2.4); thick(verge, img, gcx, apex - 5, gx0 + gw + 8, eave + 3, 2.4);
            fill(img, verge, BP.plank.slice(1), { tex: 0.4, seed, outline: BP.timber[0] });
        }
        // The bakery: a cream awning over the shop shelves, and a sign with a loaf on it.
        if (o.awning) {
            const [ax0, ax1] = o.awning, sy = B - 9 - 34;
            rectFill(img, ax0 + 2, sy, ax1 - ax0 - 4, 34, BP.timber[0]);
            for (const shy of [sy + 12, sy + 26]) {                // shelves of loaves
                rectFill(img, ax0 + 2, shy, ax1 - ax0 - 4, 3, BP.plank[4]);
                for (let lx = ax0 + 7; lx < ax1 - 8; lx += 11) {
                    const s = shape(); ellipse(s, img, lx + hash(lx, shy, seed) * 2, shy - 4, 5, 3.6);
                    fill(img, s, BP.bread, { tex: 0.3, seed: lx, outline: BP.bread[0] });
                    put(img, lx - 1, shy - 6, BP.bread[5]); put(img, lx + 1, shy - 5, BP.bread[5]);
                }
            }
            const cy = wallTop + 4;
            for (let x = ax0 - 6; x < ax1 + 6; x++) {                // the canvas, sagging, scalloped along the front
                const sag = Math.sin(((x - ax0 + 6) / (ax1 - ax0 + 12)) * Math.PI) * 3, len = 18 + sag + (Math.floor((x - ax0) / 8) % 2 ? 0 : 2) - Math.abs(((x - ax0) % 8) - 4) * 0.4;
                for (let j = 0; j < len; j++) put(img, x, cy + j, pick(BP.canvas, 0.85 - (j / len) * 0.5 + (vnoise(x / 3, j / 3, seed) - 0.5) * 0.18));
                put(img, x, cy - 1, BP.timber[0]); put(img, x, cy + Math.round(len), BP.shadow, 0.5);
            }
            for (const px of [ax0 - 4, ax1 + 2]) { const s = shape(); box(s, img, px, cy + 14, 3, B - 9 - cy - 14, 0); fill(img, s, BP.plank, { outline: BP.timber[0] }); }
            // The sign on its bracket.
            const sx = ax1 + 14, sgy = wallTop + 10;
            const br = shape(); thick(br, img, sx - 12, sgy - 4, sx + 12, sgy - 4, 1.2); fill(img, br, PAL.iron, { outline: PAL.iron[0] });
            for (const cx of [sx - 6, sx + 6]) for (let j = sgy - 3; j < sgy + 1; j++) put(img, cx, j, PAL.iron[3]);
            const bd = shape(); box(bd, img, sx - 11, sgy, 22, 15, 0.2); fill(img, bd, BP.plank.slice(1), { tex: 0.4, seed, outline: BP.timber[0] });
            rectFill(img, sx - 9, sgy + 2, 18, 11, BP.timber[2]);
            const lf = shape(); ellipse(lf, img, sx, sgy + 8, 7, 4); fill(img, lf, BP.bread.slice(1), { outline: BP.bread[0] });
            for (let k = -3; k <= 3; k += 3) put(img, sx + k, sgy + 6, BP.bread[5]);
        }
        if (o.chimney !== false) chimney(img, Math.round(X0 + W * (o.chimneyAt || (0.68 + hash(b.x0, 2, seed) * 0.14))), roofTop + 2, Math.max(16, Math.round((eave - roofTop) * 0.45)), seed + 10, scene.smoke, o.brickChimney ? BP.brick : BP.stone);
    }

    /** The bread oven: a dome of stone with a red brick mouth and the fire in it, a tall brick chimney behind. */
    function oven(L, b, seed, scene) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C, cx = (X0 + X1) / 2;
        shadow(img, cx + 10, B + 1, (X1 - X0) / 2 + 6, 7, 0.5);
        // The chimney first: it stands behind the dome.
        const chTop = Y0 - 18;
        for (let y = chTop; y < B - 70; y++) for (let x = cx - 10; x < cx + 10; x++) {
            const row = Math.floor((y - chTop) / 4), off = row % 2 ? 4 : 0, bx = (x - cx + 10 + off) % 8, by = (y - chTop) % 4;
            let t = 0.5 + (hash(Math.floor((x + off) / 8), row, seed) - 0.5) * 0.4 + (x < cx - 4 ? 0.1 : x > cx + 5 ? -0.15 : 0);
            if (by === 3 || bx === 7) { put(img, x, y, [34, 26, 22]); continue; }
            put(img, x, y, pick(BP.brick, t));
        }
        rectFill(img, cx - 13, chTop - 3, 26, 5, BP.brick[4]); rectFill(img, cx - 13, chTop + 2, 26, 1, BP.brick[1]);
        rectFill(img, cx - 6, chTop - 3, 12, 2, [8, 6, 6]);
        scene.smoke.push({ x: cx, y: chTop - 4 });
        // A stone plinth, then the dome in courses of rough stone.
        masonry(img, X0 + 6, B - 14, X1 - X0 - 12, 14, seed + 1, BP.stone);
        const R0 = (X1 - X0) / 2 - 6, dcy = B - 14, ry = 62;
        for (let y = dcy - ry; y < dcy; y++) for (let x = cx - R0; x < cx + R0; x++) {
            const dx = (x + 0.5 - cx) / R0, dy = (y + 0.5 - dcy) / ry;
            if (dx * dx + dy * dy > 1) continue;
            const course = Math.floor((dcy - y) / 7), off = (course % 2) * 5, u = (x + off - X0) % 11, v = (dcy - y) % 7;
            let t = 0.55 + (-dx * 0.6 - dy * 0.25) * 0.45 + (hash(Math.floor((x + off) / 11), course, seed) - 0.5) * 0.3;
            if (v === 0 || u === 0) t = 0.1;
            put(img, x, y, pick(BP.stone, t));
            if (dx * dx + dy * dy > 0.86) put(img, x, y, BP.stone[0], 0.6);
        }
        // The mouth: a brick arch, black inside, the fire on the hearth.
        const mw = 30, mh = 30, mx = cx - mw / 2, my = B - 14 - mh;
        for (let y = my - 8; y < B - 12; y++) for (let x = mx - 8; x < mx + mw + 8; x++) {
            const ax = x + 0.5 - cx, ay = y + 0.5 - (my + mw / 2);
            const outer = (y >= my + mw / 2 ? Math.abs(ax) < mw / 2 + 7 : Math.hypot(ax, ay) < mw / 2 + 7);
            const inner = (y >= my + mw / 2 ? Math.abs(ax) < mw / 2 : Math.hypot(ax, ay) < mw / 2);
            if (inner) {
                const g = Math.max(0, 1 - Math.hypot(ax / (mw / 2), (y - (B - 18)) / 22));
                put(img, x, y, g > 0.05 ? pick(BP.glow, g * 1.1 - 0.1 + (hash(x, y, seed) - 0.5) * 0.15) : [10, 6, 5]);
            } else if (outer) {
                const ang = Math.atan2(ay, ax), seg = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 20);
                put(img, x, y, (Math.floor((x + y) / 3) + seg) % 5 === 0 ? [34, 20, 16] : pick(BP.brick, 0.5 + (hash(seg, Math.floor(y / 4), seed) - 0.5) * 0.5));
            }
        }
        for (const [lx, ly] of [[-7, -5], [2, -4], [-2, -8]]) { const s = shape(); thick(s, img, cx + lx - 6, B - 16 + ly, cx + lx + 6, B - 18 + ly, 2); fill(img, s, BP.bark, { outline: BP.bark[0] }); }
        const fl = shape(); ellipse(fl, img, cx, B - 30, 7, 10); ellipse(fl, img, cx - 6, B - 26, 4, 6); ellipse(fl, img, cx + 6, B - 26, 4, 7);
        fill(img, fl, BP.glow.slice(2), { edge: false });
        for (let y = -40; y <= 40; y++) for (let x = -50; x <= 50; x++) { const d = Math.hypot(x / 50, y / 40); if (d < 1) put(img, cx + x, B - 4 + y * 0.4, BP.glow[3], (1 - d) * 0.16); }
        scene.flames.push({ x: cx, y: B - 30 });
        // A peel leaning on the oven.
        const peel = shape(); thick(peel, img, X1 - 18, B - 4, X1 - 10, B - 60, 1.2); ellipse(peel, img, X1 - 10, B - 64, 5, 6); fill(img, peel, BP.plank.slice(2), { outline: BP.timber[0] });
    }

    /** The woodshed: a plank lean-to stacked to the roof with split logs, end-on. */
    function woodshed(L, b, seed) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C;
        shadow(img, (X0 + X1) / 2 + 6, B + 1, (X1 - X0) / 2 + 6, 6, 0.5);
        planks(img, X0 + 2, Y0 + 30, X1 - X0 - 4, B - Y0 - 32, seed, BP.plank.slice(0, 4));
        for (let y = B - 4; y > Y0 + 40; y -= 9) for (let x = X0 + 8 + ((B - y) % 18 ? 4 : 0); x < X1 - 6; x += 9) {
            const s = shape(); ellipse(s, img, x, y - 4, 4.6, 4.4);
            fill(img, s, PAL.wood.slice(2, 7), { edge: false, outline: BP.bark[1] });
            put(img, x, y - 4, PAL.wood[3]); put(img, x - 1, y - 5, PAL.wood[6]);
            if (hash(x, y, seed) < 0.3) for (let k = -3; k <= 3; k++) put(img, x + k, y - 4 + Math.round(k * 0.3), PAL.wood[2]);
        }
        for (const px of [X0 + 1, X1 - 5]) { const s = shape(); box(s, img, px, Y0 + 24, 4, B - Y0 - 24, 0); fill(img, s, BP.plank, { tex: 0.4, seed: px, outline: BP.timber[0] }); }
        const roof = shape(); poly(roof, img, [[X0 - 8, Y0 + 34], [X1 + 6, Y0 + 30], [X1 + 2, Y0 - 2], [X0 - 2, Y0 + 4]], (px, py) => (py - Y0) * -0.01);
        for (const [i] of roof.px) roof.px.set(i, (((i % img.w) - X0) % 7 === 0 ? -0.8 : 0) + (vnoise(((i % img.w) / 7) | 0, ((i / img.w) | 0) / 8, seed) - 0.5) * 0.7);
        fill(img, roof, BP.plank.slice(1), { outline: BP.timber[0] });
        for (let x = X0 - 8; x < X1 + 6; x++) put(img, x, Y0 + 35 - Math.round((x - X0 + 8) * 0.06), BP.shadow, 0.6);
    }

    /** A table in front of the oven: flour, a basin of dough, a basket of rolls, a cloth. */
    function breadTable(L, b, seed) {
        const img = L.base, X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        shadow(img, (X0 + X1) / 2 + 4, B + 1, W / 2 + 4, 5, 0.5);
        for (const px of [X0 + 3, X1 - 6]) { const s = shape(); box(s, img, px, B - 14, 3, 14, 0); fill(img, s, BP.plank, { outline: BP.timber[0] }); }
        planks(img, X0, B - 22, W, 8, seed, BP.plank.slice(2), false);
        rectFill(img, X0, B - 14, W, 1, BP.timber[0]);
        const sack = shape(); ellipse(sack, img, X0 + 12, B - 30, 8, 9); box(sack, img, X0 + 6, B - 40, 12, 4); fill(img, sack, BP.flour, { tex: 0.4, seed, outline: BP.plank[0] });
        rectFill(img, X0 + 7, B - 40, 10, 2, BP.flour[4]);
        const bowl = shape(); ellipse(bowl, img, X0 + 32, B - 25, 9, 4); fill(img, bowl, BP.plank.slice(3), { outline: BP.timber[0] });
        const dough = shape(); ellipse(dough, img, X0 + 32, B - 27, 7, 2.6); fill(img, dough, BP.flour.slice(2), { edge: false });
        const bk = shape(); ellipse(bk, img, X1 - 14, B - 25, 10, 5); fill(img, bk, PAL.straw, { tex: 0.6, seed, scale: 1, outline: BP.plank[0] });
        for (let k = 0; k < 5; k++) { const s = shape(); ellipse(s, img, X1 - 21 + k * 3.5, B - 28 + (k % 2), 3, 2.4); fill(img, s, BP.bread.slice(1), { outline: BP.bread[0] }); }
        rectFill(img, X0 + 44, B - 22, 8, 4, BP.flour[3]);
    }
    function sacks(L, x, y, seed) {
        const img = L.base;
        for (let k = 0; k < 2; k++) {
            const cx = x * C + 10 + k * 13, gy = y * C + 28 - k * 3;
            shadow(img, cx + 3, gy, 8, 3);
            const s = shape(); ellipse(s, img, cx, gy - 9, 7, 9); box(s, img, cx - 5, gy - 21, 10, 5);
            fill(img, s, BP.flour.slice(0, 4), { tex: 0.5, seed: seed + k, outline: BP.plank[0] });
            rectFill(img, cx - 5, gy - 17, 10, 2, BP.plank[3]);
            put(img, cx - 2, gy - 9, BP.flour[0]); put(img, cx - 1, gy - 9, BP.flour[0]);
        }
    }
    /** A washing line between two posts, linen and shirts pegged along it. */
    function laundry(S, b, seed) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, gy = (b.y1 + 1) * C - 6, top = gy - 34;
        for (const px of [X0, X1 - 3]) { shadow(S, px + 4, gy + 1, 5, 2, 0.4); const s = shape(); box(s, S, px, top - 2, 3, gy - top + 2, 0); fill(S, s, BP.plank, { outline: BP.timber[0] }); }
        const sagAt = (x) => top + 2 + Math.sin(((x - X0) / (X1 - X0)) * Math.PI) * 5;
        for (let x = X0 + 2; x < X1 - 1; x++) put(S, x, sagAt(x), [24, 22, 20]);
        for (let x = X0 + 6; x < X1 - 10;) {
            const w = 8 + Math.floor(hash(x, 1, seed) * 7), h = 12 + Math.floor(hash(x, 2, seed) * 9), shirt = hash(x, 3, seed) < 0.3;
            const ramp = hash(x, 4, seed) < 0.2 ? R(['#2a2e3a', '#3c4254', '#525a70']) : BP.linen;
            for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
                const yy = Math.round(sagAt(x + i)) + j;
                if (shirt && j > 5 && i > 2 && i < w - 3 && j > h - 3) continue;
                put(S, x + i, yy, pick(ramp, 0.75 - (i / w) * 0.4 + (vnoise((x + i) / 2, j / 3, seed) - 0.5) * 0.25));
            }
            put(S, x + 1, Math.round(sagAt(x + 1)), BP.plank[5]); put(S, x + w - 2, Math.round(sagAt(x + w - 2)), BP.plank[5]);
            x += w + 3 + Math.floor(hash(x, 5, seed) * 4);
        }
    }
    /** Cabbage rows and a stand of purple kale in a little plot with a low picket fence round it. */
    function garden(L, b, seed) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C;
        for (let y = Y0 + 4; y < B - 2; y++) for (let x = X0 + 2; x < X1 - 2; x++) put(img, x, y, pick(BP.dirt, ((y - Y0) % 14 < 3 ? 0.15 : 0.5) + (hash(x, y, seed) - 0.5) * 0.25));
        for (let y = Y0 + 14; y < B - 6; y += 14) for (let x = X0 + 10; x < X1 - 22; x += 14) {
            const s = shape(); ellipse(s, img, x + hash(x, y, seed) * 3, y, 6.5, 5.5);
            for (const [i, v] of s.px) s.px.set(i, v * 0.6 + (vnoise((i % img.w) / 2, ((i / img.w) | 0) / 2, seed) - 0.5) * 0.9);
            fill(img, s, BP.cabbage, { outline: BP.cabbage[0] });
            const hd = shape(); ellipse(hd, img, x + 1, y - 1, 3, 2.6); fill(img, hd, BP.cabbage.slice(3), { edge: false });
        }
        for (let y = Y0 + 12; y < B - 6; y += 9) for (const dx of [-16, -8]) {                 // the kale, deep purple
            const s = shape(); ellipse(s, img, X1 + dx + hash(y, dx, seed) * 2, y, 4, 5);
            for (const [i, v] of s.px) s.px.set(i, v * 0.6 + (vnoise((i % img.w) / 2, ((i / img.w) | 0) / 2, seed + 4) - 0.5));
            fill(img, s, R(['#1d0f26', '#2e1840', '#43245c', '#5c3478', '#7a4a96']), { outline: [14, 8, 18] });
        }
        const pk = shape();
        for (let x = X0 + 1; x < X1 - 1; x += 4) { box(pk, img, x, Y0 - 4, 2, 8, 0.3); box(pk, img, x, B - 10, 2, 9, 0.2); }
        for (let y = Y0; y < B - 2; y += 5) { box(pk, img, X0, y, 2, 4, 0.3); box(pk, img, X1 - 2, y, 2, 4, -0.2); }
        box(pk, img, X0, Y0 - 1, X1 - X0, 2, 0.4); box(pk, img, X0, B - 7, X1 - X0, 2, 0.3);
        fill(img, pk, PAL.wood.slice(1, 7), { outline: PAL.wood[0] });
    }
    /** The hen coop: a little plank house on stilts with a ramp and a slate lid. */
    function coop(L, b, seed) {
        const img = L.base, X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        shadow(img, X0 + W / 2 + 4, B + 1, W / 2 + 4, 5, 0.45);
        for (const px of [X0 + 2, X1 - 5]) { const s = shape(); box(s, img, px, B - 10, 3, 10, 0); fill(img, s, BP.plank, { outline: BP.timber[0] }); }
        planks(img, X0, B - 40, W, 30, seed);
        rectFill(img, X0 + W / 2 - 6, B - 26, 12, 14, [10, 8, 7]);
        for (let i = 0; i < 10; i++) put(img, X0 + W / 2 - 5 + i, B - 13 - (i % 2), PAL.straw[2 + (i % 2)]);
        const ramp = shape(); thick(ramp, img, X0 + W / 2, B - 12, X0 + W / 2 + 12, B, 2.2); fill(img, ramp, BP.plank.slice(2), { outline: BP.timber[0] });
        roofing(img, [[X0 - 6, B - 38], [X1 + 6, B - 38], [X1 - 2, B - 62], [X0 + 2, B - 62]], seed + 2, { cw: 5, chh: 4 });
        for (let x = X0 - 6; x < X1 + 6; x++) { put(img, x, B - 38, [8, 6, 9]); put(img, x, B - 37, BP.shadow, 0.5); }
    }
    function hay(L, x, y, seed) {
        const img = L.base, cx = x * C + 16, gy = y * C + 26;
        shadow(img, cx + 3, gy + 1, 14, 4);
        const s = shape(); ellipse(s, img, cx, gy - 8, 13, 9);
        for (const [i, v] of s.px) s.px.set(i, v * 0.7 + (vnoise(((i % img.w)) / 1.5, ((i / img.w) | 0) / 4, seed) - 0.5) * 0.9);
        fill(img, s, PAL.straw, { outline: PAL.straw[0] });
        for (let k = 0; k < 14; k++) { const a = hash(k, x, seed) * Math.PI * 2; put(img, cx + Math.cos(a) * 14, gy - 8 + Math.sin(a) * 9, PAL.straw[3]); }
    }
    function chickens(L, x, y, seed) {
        const img = L.base;
        for (let k = 0; k < 2; k++) {
            const cx = x * C + 8 + k * 14 + hash(k, x, seed) * 4, gy = y * C + 14 + k * 10 + hash(k, y, seed) * 4, f = hash(k, x + y, seed) < 0.5 ? 1 : -1;
            shadow(img, cx + 2, gy + 1, 5, 1.6, 0.4);
            const bd = shape(); ellipse(bd, img, cx, gy - 4, 4.5, 3.5); ellipse(bd, img, cx - f * 4, gy - 6, 2, 2.5); ellipse(bd, img, cx + f * 3, gy - 8, 2.2, 2.2);
            fill(img, bd, BP.hen, { outline: [30, 28, 24] });
            put(img, cx + f * 3, gy - 11, [170, 30, 26]); put(img, cx + f * 4, gy - 11, [170, 30, 26]);
            put(img, cx + f * 5, gy - 8, [210, 150, 50]); put(img, cx + f * 3, gy - 9, [10, 10, 10]);
            put(img, cx - 1, gy, [180, 130, 50]); put(img, cx + 1, gy, [180, 130, 50]);
        }
        for (let k = 0; k < 6; k++) put(img, x * C + hash(k, 3, seed + x) * C, y * C + hash(k, 4, seed + y) * C, PAL.straw[3]);   // scattered grain
    }
    /** A pig, side on, very pleased with the mud. */
    function pig(img, cx, gy, f, seed) {
        shadow(img, cx + 2, gy + 1, 12, 3, 0.45);
        const s = shape(); ellipse(s, img, cx, gy - 8, 11, 7); ellipse(s, img, cx + f * 10, gy - 9, 5.5, 5);
        for (const lx of [-6, -2, 4, 7]) box(s, img, cx + lx * f, gy - 4, 2, 4, -0.3);
        fill(img, s, BP.pig, { tex: 0.25, seed, outline: [40, 22, 20] });
        const sn = shape(); ellipse(sn, img, cx + f * 15, gy - 8, 2.2, 2.4); fill(img, sn, BP.pig.slice(2), { outline: [40, 22, 20] });
        put(img, cx + f * 15, gy - 8, [80, 40, 36]);
        put(img, cx + f * 11, gy - 11, [12, 8, 8]);
        const ear = shape(); poly(ear, img, [[cx + f * 7, gy - 13], [cx + f * 10, gy - 17], [cx + f * 11, gy - 12]], 0.2); fill(img, ear, BP.pig.slice(1), { outline: [40, 22, 20] });
        for (let k = 0; k < 4; k++) put(img, cx - f * (11 + (k % 2)), gy - 11 + k, [120, 70, 64]);      // the curly tail
        for (let n = 0; n < 12; n++) put(img, cx - 8 + hash(n, 1, seed) * 16, gy - 4 + hash(n, 2, seed) * 3, BP.dirt[1]);   // mud on the legs
    }
    function pigPen(L, b, seed) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C;
        for (let n = 0; n < 6; n++) {                              // wallows
            const s = shape(); ellipse(s, img, X0 + 20 + hash(n, 1, seed) * (X1 - X0 - 40), Y0 + 14 + hash(n, 2, seed) * (B - Y0 - 28), 10 + hash(n, 3, seed) * 8, 4 + hash(n, 4, seed) * 3);
            for (const [i] of s.px) s.px.set(i, (vnoise((i % img.w) / 3, ((i / img.w) | 0) / 2, seed + n) - 0.5) * 1.2);
            fill(img, s, BP.dirt.slice(0, 3), { edge: false });
        }
        for (let n = 0; n < 40; n++) put(img, X0 + hash(n, 5, seed) * (X1 - X0), Y0 + hash(n, 6, seed) * (B - Y0), PAL.straw[1 + (n % 3)]);
        // The trough of bran and crusts by the gate side.
        const tx = X1 - 30, ty = Y0 + 20;
        const tr = shape(); box(tr, img, tx - 12, ty - 6, 24, 7, 0); fill(img, tr, BP.plank.slice(1), { tex: 0.4, seed, outline: BP.timber[0] });
        for (let i = 0; i < 20; i++) put(img, tx - 10 + i, ty - 6, i % 4 === 0 ? BP.bread[4] : BP.bread[2]);
        pig(img, X0 + 44, Y0 + 44, 1, seed + 1);
        pig(img, X0 + 92, B - 10, -1, seed + 2);
    }
    /** A lean-to shed: a sloping plank roof on posts, straw underneath. */
    function leanTo(L, b, seed) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C;
        shadow(img, (X0 + X1) / 2 + 6, B + 1, (X1 - X0) / 2 + 6, 6, 0.5);
        planks(img, X0 + 2, Y0 + 26, X1 - X0 - 4, B - Y0 - 28, seed, BP.plank.slice(0, 4));
        for (let n = 0; n < 60; n++) { const x = X0 + 6 + hash(n, 1, seed) * (X1 - X0 - 12), y = B - 4 - hash(n, 2, seed) * 16; put(img, x, y, PAL.straw[1 + (n % 3)]); put(img, x + 1, y - 1, PAL.straw[2]); }
        const hb = shape(); ellipse(hb, img, X0 + 18, B - 10, 10, 7); fill(img, hb, PAL.straw, { tex: 0.6, seed, scale: 1.5, outline: PAL.straw[0] });
        for (const px of [X0 + 2, X1 - 6]) { const s = shape(); box(s, img, px, Y0 + 20, 4, B - Y0 - 20, 0); fill(img, s, BP.plank, { tex: 0.4, seed: px, outline: BP.timber[0] }); }
        const roof = shape(); poly(roof, img, [[X0 - 8, Y0 + 28], [X1 + 8, Y0 + 28], [X1 + 4, Y0 - 2], [X0 - 4, Y0 - 2]], 0);
        for (const [i] of roof.px) { const px = i % img.w; roof.px.set(i, ((px - X0) % 8 === 0 ? -0.8 : 0.1) + (vnoise((px / 8) | 0, ((i / img.w) | 0) / 9, seed) - 0.5) * 0.7); }
        fill(img, roof, BP.plank.slice(1), { outline: BP.timber[0] });
        for (let x = X0 - 8; x < X1 + 8; x++) { put(img, x, Y0 + 29, BP.shadow, 0.6); put(img, x, Y0 + 30, BP.shadow, 0.3); }
    }

    // ---------------------------------------------------------------------
    // The town wall, banners, lanterns, trees and small things
    // ---------------------------------------------------------------------
    const WALLY = new Set(['town_wall', 'wall_banner']);
    /** The town wall seen from above: a paved wall-walk with a parapet on the outer edge, its inner face dropping
     *  to the lane, and round towers either side of the gate. */
    function townWall(L, map, nameAt, x, y, seed) {
        const img = L.base, x0 = x * C, y0 = y * C;
        const isW = (dx, dy) => WALLY.has(nameAt(map, x + dx, y + dy)) || nameAt(map, x + dx, y + dy) === null;
        masonry(img, x0, y0, C, C, seed + x * 7 + y * 13, BP.stone);
        for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) put(img, x0 + i, y0 + j, BP.stone[5], (vnoise((x0 + i) / 5, (y0 + j) / 5, seed) - 0.3) * 0.25);
        // Merlons on the outer edge (the map edge).
        if (nameAt(map, x - 1, y) === null) for (let py = y0; py < y0 + C; py += 12) { const s = shape(); box(s, img, x0, py + 1, 10, 9, 0.4); fill(img, s, BP.stone.slice(2), { tex: 0.5, seed: py, outline: BP.stone[0] }); }
        if (nameAt(map, x, y + 1) === null) for (let px = x0; px < x0 + C; px += 12) { const s = shape(); box(s, img, px + 1, y0 + C - 10, 9, 10, 0.3); fill(img, s, BP.stone.slice(2), { tex: 0.5, seed: px, outline: BP.stone[0] }); }
        // The inner face: a strip of darker stone where the wall drops toward the lane, and its shadow.
        if (!isW(1, 0)) { for (let j = 0; j < C; j++) for (let i = 0; i < 8; i++) put(img, x0 + C - 8 + i, y0 + j, pick(BP.stone, 0.32 - i * 0.025 + (hash(i >> 2, (y0 + j) >> 2, seed) - 0.5) * 0.15)); for (let j = 0; j < C; j++) for (let i = 0; i < 6; i++) put(img, x0 + C + i, y0 + j, BP.shadow, 0.45 - i * 0.07); }
        if (!isW(0, -1)) { for (let i = 0; i < C; i++) put(img, x0 + i, y0, BP.stone[7]); }
        if (!isW(0, 1)) { for (let j = 0; j < 12; j++) for (let i = 0; i < C; i++) put(img, x0 + i, y0 + C - 12 + j, pick(BP.stone, 0.4 - j * 0.02 + (hash((x0 + i) >> 3, j >> 2, seed) - 0.5) * 0.18)); for (let i = 0; i < C; i++) for (let j = 0; j < 5; j++) put(img, x0 + i, y0 + C + j, BP.shadow, 0.45 - j * 0.08); }
        if (!isW(-1, 0) && nameAt(map, x - 1, y) !== null) for (let j = 0; j < C; j++) put(img, x0, y0 + j, BP.stone[7]);
        for (let n = 0; n < 14; n++) { const px = x0 + hash(n, x, seed) * C, py = y0 + hash(n, y, seed) * C; if (vnoise(px / 5, py / 5, seed + 9) > 0.58) put(img, px, py, BP.moss[2 + (n % 2)]); }
    }
    function gateTower(L, cx, cy, seed) {
        const img = L.base;
        shadow(img, cx + 10, cy + 10, 40, 22, 0.45);
        // The tower top: paving inside a ring of merlons, with the drop of its face showing on the lane side.
        const tmp = Img(80, 72);
        masonry(tmp, 0, 0, 80, 72, seed + 3, BP.stone);
        for (let y = -32; y <= 34; y++) for (let x = -36; x <= 36; x++) {
            const d = Math.hypot(x / 34, y / 30);
            if (d > 1) continue;
            const k = ((y + 34) * 80 + x + 38) * 4;
            let c = [tmp.data[k], tmp.data[k + 1], tmp.data[k + 2]];
            if (d > 0.78) c = pick(BP.stone, 0.62 - (x > 0 ? 0.2 : 0) + (hash((x + 40) >> 3, (y + 40) >> 3, seed) - 0.5) * 0.2);
            if (d > 0.78 && Math.floor((Math.atan2(y, x) + Math.PI) / (Math.PI / 8)) % 2) c = pick(BP.stone, 0.3);
            if (d > 0.95) c = BP.stone[0];
            put(img, cx + x, cy + y, c);
        }
        for (let x = -30; x <= 36; x++) for (let j = 0; j < 9; j++) { const y = Math.round(Math.sqrt(Math.max(0, 1 - (x / 34) ** 2)) * 30); if (x > -10) put(img, cx + x, cy + y + j, pick(BP.stone, 0.3 - j * 0.02 + (hash((x + 40) >> 2, j >> 2, seed) - 0.5) * 0.15)); }
    }
    /** A raven banner hanging on the inner face of the wall. */
    function wallBanner(L, x, y, seed) {
        const img = L.base, bx = x * C + C - 26, by = y * C - 12, w = 18, h = 50;
        rectFill(img, bx - 2, by - 2, w + 4, 3, BP.timber[2]);
        const s = shape();
        poly(s, img, [[bx, by], [bx + w, by], [bx + w, by + h], [bx + w / 2, by + h - 7], [bx, by + h]], (px, py) => ((px - bx) / w - 0.5) * -0.9 + Math.sin((py - by) / 5) * 0.15);
        fill(img, s, BP.clothRed, { tex: 0.3, seed, outline: [10, 6, 6] });
        for (const [i] of s.px) { const px = i % img.w, py = (i / img.w) | 0; if (!s.px.has(i - 2) || !s.px.has(i + 2)) put(img, px, py, BP.clothRed[0]); }
        // The emblem: a pale ring with a mark in it.
        const cx = bx + w / 2, cy = by + 20;
        for (let a = 0; a < 360; a += 10) { const t = (a * Math.PI) / 180; put(img, cx + Math.cos(t) * 6, cy + Math.sin(t) * 6, BP.linen[3]); }
        rectFill(img, cx - 1, cy - 3, 2, 6, BP.linen[3]); put(img, cx, cy - 12, BP.linen[2]); put(img, cx, cy + 12, BP.linen[2]);
    }
    /** A lantern post: a timber post with an arm, a hanging iron lantern and its glow. */
    function lanternPost(S, cx, gy, seed, f = 1) {
        shadow(S, cx + 4, gy + 1, 6, 2.5, 0.45);
        const p = shape(); thick(p, S, cx, gy - 52, cx, gy, 1.8); thick(p, S, cx, gy - 50, cx + f * 16, gy - 50, 1.3); thick(p, S, cx + f * 2, gy - 42, cx + f * 9, gy - 49, 0.9);
        fill(S, p, BP.plank.slice(1), { tex: 0.4, seed, outline: BP.timber[0] });
        const lx = cx + f * 14;
        for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) { const d = Math.hypot(x, y); if (d < 14) put(S, lx + x, gy - 38 + y, BP.glow[3], (1 - d / 14) * 0.2); }
        put(S, lx, gy - 48, PAL.iron[2]); put(S, lx, gy - 47, PAL.iron[2]);
        const cage = shape(); poly(cage, S, [[lx - 4, gy - 46], [lx + 4, gy - 46], [lx + 5, gy - 34], [lx - 5, gy - 34]], 0); fill(S, cage, PAL.iron, { outline: PAL.iron[0] });
        rectFill(S, lx - 3, gy - 44, 6, 8, BP.glow[3]); rectFill(S, lx - 1, gy - 42, 2, 4, BP.glow[4]);
        rectFill(S, lx - 5, gy - 47, 10, 2, PAL.iron[3]); rectFill(S, lx - 5, gy - 34, 10, 2, PAL.iron[1]);
        return { x: lx, y: gy - 40 };
    }
    /** A big bare tree with a few orange leaves left: a gnarled trunk with root flares and limbs that fork and thin. */
    function bareTree(img, x, gy, seed, s = 1, leaves = 0.5) {
        const t = shape();
        thick(t, img, x, gy - 26 * s, x, gy, 3.8 * s);
        thick(t, img, x - 1, gy - 4, x - 9 * s, gy + 2, 1.8 * s); thick(t, img, x + 1, gy - 4, x + 9 * s, gy + 1, 1.8 * s);
        const tips = [];
        const limb = (ax, ay, a, len, w, depth) => {
            const bx = ax + Math.cos(a) * len, by = ay + Math.sin(a) * len;
            thick(t, img, ax, ay, bx, by, w);
            if (depth <= 0) { tips.push([bx, by]); return; }
            const forks = 2 + (hash(ax | 0, ay | 0, seed) < 0.3 ? 1 : 0);
            for (let f = 0; f < forks; f++) {
                const da = (f - (forks - 1) / 2) * 0.7 + (hash(ax | 0, f + depth, seed) - 0.5) * 0.5;
                limb(bx, by, a + da, len * (0.62 + hash(f, depth, seed + (ax | 0)) * 0.18), Math.max(0.5, w * 0.62), depth - 1);
            }
        };
        const top = gy - 26 * s;
        limb(x, top + 6 * s, -Math.PI / 2 - 0.85, 16 * s, 2.4 * s, 3);
        limb(x, top + 2 * s, -Math.PI / 2 + 0.8, 17 * s, 2.4 * s, 3);
        limb(x, top, -Math.PI / 2 - 0.1, 15 * s, 2.2 * s, 3);
        for (const [i] of t.px) { const px = i % img.w, py = (i / img.w) | 0; t.px.set(i, t.px.get(i) * 0.8 + (vnoise(px / 2, py / 5, seed) - 0.5) * 0.7); }
        fill(img, t, BP.bark, { outline: BP.bark[0] });
        for (const [tx, ty] of tips) for (let k = 0; k < 4; k++) {
            if (hash(tx | 0, k, seed) > leaves) continue;
            const lx = tx + (hash(k, ty | 0, seed) - 0.5) * 8, ly = ty + (hash(ty | 0, k, seed) - 0.5) * 6, c = pick(BP.leaf, 0.45 + hash(k, tx | 0, seed + 1) * 0.55);
            put(img, lx, ly, c); put(img, lx + 1, ly, c); put(img, lx, ly + 1, BP.leaf[2]);
        }
    }
    function autumnBush(L, cx, cy, seed, roses = false) {
        const img = L.base, x = cx * C + 16, gy = cy * C + 28;
        shadow(img, x + 3, gy, 15, 4, 0.45);
        const s = shape();
        for (let b = 0; b < 5; b++) ellipse(s, img, x + (b - 2) * 5, gy - 9 - (b % 2) * 4, 7.5, 7);
        for (const [i, v] of s.px) s.px.set(i, v * 0.7 + (vnoise((i % img.w) / 3, ((i / img.w) | 0) / 3, seed) - 0.5));
        fill(img, s, roses ? BP.green : hash(cx, cy, seed) < 0.35 ? BP.leaf.slice(1) : BP.green, { outline: BP.green[0] });
        const n = roses ? 18 : 5;
        for (let k = 0; k < n; k++) {
            const px = x - 12 + hash(k, cx, seed) * 24, py = gy - 18 + hash(k, cy, seed) * 14;
            if (!s.px.has((py | 0) * img.w + (px | 0))) continue;
            const c = roses ? BP.rose[k % 3] : pick(BP.leaf, 0.7 + hash(k, 3, seed) * 0.3);
            put(img, px, py, c); put(img, px + 1, py, c); if (roses) put(img, px, py + 1, BP.rose[0]);
        }
    }
    function mountingStone(L, x, y, seed) {
        const img = L.base, cx = x * C + 16, gy = y * C + 28;
        shadow(img, cx + 4, gy + 1, 14, 4, 0.45);
        const s = shape(); box(s, img, cx - 11, gy - 12, 22, 12, 0); for (const [i] of s.px) s.px.set(i, (((i % img.w) - cx) / 11) * -0.6);
        fill(img, s, BP.stone, { tex: 0.5, seed, scale: 2, outline: BP.stone[0] });
        const top = shape(); poly(top, img, [[cx - 11, gy - 12], [cx + 11, gy - 12], [cx + 8, gy - 18], [cx - 8, gy - 18]], 0.6); fill(img, top, BP.stone.slice(3), { tex: 0.3, seed, outline: BP.stone[0] });
        for (let i = -6; i <= 6; i += 4) for (let j = 0; j < 4; j++) put(img, cx + i + j * 0.5, gy - 17 + j, BP.stone[2]);   // the scratched board
        for (let i = -7; i <= 7; i++) put(img, cx + i, gy - 15, BP.stone[2]);
    }
    function drain(L, x, y) {
        const img = L.base, cx = x * C + 16, cy = y * C + 16;
        rectFill(img, cx - 9, cy - 6, 18, 12, [10, 9, 9]);
        rectFill(img, cx - 10, cy - 7, 20, 1, PAL.iron[3]); rectFill(img, cx - 10, cy + 6, 20, 1, PAL.iron[1]);
        for (let i = -10; i <= 10; i += 3) for (let j = -6; j <= 6; j++) put(img, cx + i, cy + j, i < 0 ? PAL.iron[3] : PAL.iron[2]);
    }
    /** A fence running north-south: a post and two rails seen end-on, joined to the fence above and below. */
    function sideFence(L, map, nameAt, x, y, seed) {
        const img = L.base, cx = x * C + 16, y0 = y * C, s = shape();
        const up = nameAt(map, x, y - 1) === 'fence', down = nameAt(map, x, y + 1) === 'fence';
        for (const py of [y0 + 6, y0 + 22]) { box(s, img, cx - 1, py - 12, 3, 16, 0); shadow(img, cx + 3, py + 4, 3, 1.5, 0.3); }
        box(s, img, cx - 2, up ? y0 - 6 : y0 - 4, 2, (down ? C + 6 : C - 2) - (up ? -2 : 0), 0.3);
        box(s, img, cx + 1, up ? y0 : y0 + 2, 2, down ? C + 4 : C - 6, -0.2);
        for (const [i] of s.px) s.px.set(i, s.px.get(i) + (vnoise(i % img.w, ((i / img.w) | 0) / 4, seed) - 0.5) * 0.7);
        fill(img, s, PAL.wood.slice(1, 7), { outline: PAL.wood[0] });
    }

    // ---------------------------------------------------------------------
    // The scene
    // ---------------------------------------------------------------------
    // How each building is dressed (by the top-left cell of its block); anything not listed gets a plain house.
    const DRESS = {
        bakery: { gable: 'left', awning: [0.52, 0.86], chimneyAt: 0.82, brickChimney: true },
        smokehouse: { plank: true, chimneyAt: 0.3, doorAt: 0.55 }
    };
    function bakersLane(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) };
        const seed = 47, scene = { smoke: [], windows: [], flames: [], lanterns: [] };
        const kind = ground(L.base, map, nameAt, cw, ch, seed);
        details(L.base, kind, seed);
        const open = (x, y) => { const n = nameAt(map, x, y); return n === 'grass' || n === 'cobble' || n === 'dirt_path' || n === 'drain'; };
        // Flat things first: the wall, the drain, the gate towers.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (WALLY.has(n)) townWall(L, map, nameAt, x, y, seed);
            else if (n === 'drain') drain(L, x, y);
        }
        for (let y = 1; y < ch - 1; y++) {                         // the gate: towers either side of a gap in the wall
            if (WALLY.has(nameAt(map, 0, y)) || !WALLY.has(nameAt(map, 0, y - 1)) || !WALLY.has(nameAt(map, 0, y + 1))) continue;
            gateTower(L, 26, y * C - 26, seed + 1); gateTower(L, 26, (y + 1) * C + 26, seed + 2);
            for (let x = 0; x < 2 * C; x++) for (let j = 0; j < 4; j++) put(L.base, x, y * C + j, BP.shadow, 0.5 - j * 0.1);
        }
        // Everything that stands up, back to front.
        const items = [], seen = new Set();
        const BLOCKS = { house: 1, bakery: 1, smokehouse: 1, oven: 1, woodshed: 1, bread_table: 1, laundry: 1, cabbages: 1, coop: 1, pig_mud: 1, pig_shed: 1 };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (BLOCKS[n]) {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set([n]), seen), s = seed + b.x0 * 13 + b.y0 * 7;
                const over = [...Array(b.x1 - b.x0 + 1)].some((_, i) => open(b.x0 + i, b.y0 - 1));
                const gable = (b.x1 - b.x0 + 1) >= 5 ? (b.x0 < 6 ? 'right' : b.x0 > 16 ? 'mid' : 'left') : null;
                const draw = {
                    house: () => house(L, b, s, scene, { gable }),
                    bakery: () => house(L, b, s, scene, { ...DRESS.bakery, awning: DRESS.bakery.awning.map((f) => Math.round(b.x0 * C + f * (b.x1 - b.x0 + 1) * C)) }),
                    smokehouse: () => house(L, b, s, scene, DRESS.smokehouse),
                    oven: () => oven(L, b, s, scene),
                    woodshed: () => woodshed(L, b, s),
                    bread_table: () => breadTable(L, b, s),
                    laundry: () => tall(L, [b.x0 * C - 4, b.y0 * C - 40, (b.x1 + 1) * C + 4, (b.y1 + 1) * C + 4], b.y0 * C, over, (S) => laundry(S, b, s)),
                    cabbages: () => garden(L, b, s),
                    coop: () => coop(L, b, s),
                    pig_mud: () => pigPen(L, b, s),
                    pig_shed: () => leanTo(L, b, s)
                }[n];
                items.push({ y: b.y1 + (n === 'pig_mud' || n === 'cabbages' ? 0.1 : 0.9), x: b.x0, draw });
                continue;
            }
            const cx = x * C + 16, gy = y * C + 28, ov = open(x, y - 1);
            const P = {
                tree: () => tree(L, x, y, seed, { big: 1.15 + hash(x, y, seed) * 0.35, ramp: hash(x, y, seed + 5) < 0.5 ? BP.leaf : BP.green, overhead: ov || open(x - 1, y - 1) || open(x + 1, y - 1) }),
                dead_tree: () => tall(L, [cx - 70, gy - 100, cx + 70, gy + 8], y * C, ov || open(x - 1, y - 1) || open(x + 1, y - 1), (S) => bareTree(S, cx, gy, seed + x * 5 + y, 1.15 + hash(x, y, seed) * 0.3)),
                lantern: () => tall(L, [cx - 20, gy - 70, cx + 34, gy + 6], y * C, ov, (S) => scene.lanterns.push(lanternPost(S, cx - 4, gy, seed + x, x > cw / 2 ? -1 : 1))),
                well: () => well(L, x, y, seed),
                barrel: () => barrel(L, cx, gy, seed + x),
                crate: () => crate(L, cx, gy, seed + x + y, hash(x, y, seed) < 0.5 ? 1 : -1),
                sacks: () => sacks(L, x, y, seed + x),
                fence: () => (nameAt(map, x - 1, y) !== 'fence' && nameAt(map, x + 1, y) !== 'fence' ? sideFence(L, map, nameAt, x, y, seed) : fence(L, map, nameAt, x, y, seed)),
                chickens: () => chickens(L, x, y, seed),
                hay: () => hay(L, x, y, seed),
                bush: () => autumnBush(L, x, y, seed),
                rose_bed: () => autumnBush(L, x, y, seed, true),
                stump: () => stump(L, x, y, seed),
                mounting_stone: () => mountingStone(L, x, y, seed),
                wall_banner: () => wallBanner(L, x, y, seed + y)
            }[n];
            if (P) items.push({ y: y + (n === 'tree' || n === 'dead_tree' ? 0.8 : 0.5), x, draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Static smoke over the chimneys (the moving puffs come from animate).
        for (const c of scene.smoke) for (let k = 0; k < 7; k++) {
            const px = c.x + k * 3 + Math.sin(k) * 2, py = c.y - k * 6, r = 2 + k * 0.7;
            for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) put(L.over, px + i, py + j, [150, 146, 140], 0.16 - k * 0.018);
        }
        // Dusk: the edges sink into shadow.
        for (let y = 0; y < L.base.h; y++) for (let x = 0; x < L.base.w; x++) {
            const d = Math.min(x, y, L.base.w - 1 - x, L.base.h - 1 - y);
            if (d < 18) put(L.base, x, y, BP.shadow, (1 - d / 18) * 0.4);
        }
        function animate(g, time) {
            // The oven fire and the lanterns flicker.
            for (let k = 0; k < scene.flames.length; k++) {
                const f = scene.flames[k], a = Math.sin(time / 80 + k * 2.1), b2 = Math.sin(time / 53 + k);
                g.fillStyle = 'rgba(255, 214, 120, 0.8)'; g.fillRect(f.x - 2 + (a > 0.3 ? 1 : 0), f.y - 5 - (b2 > 0 ? 2 : 0), 4, 5);
                g.fillStyle = 'rgba(255, 120, 40, 0.55)'; g.fillRect(f.x - 5 + (b2 > 0.5 ? 1 : 0), f.y + 1, 10, 3);
            }
            for (let k = 0; k < scene.lanterns.length; k++) {
                const f = scene.lanterns[k], a = Math.sin(time / 110 + k * 1.7);
                g.fillStyle = `rgba(255, 220, 140, ${(0.35 + a * 0.2).toFixed(3)})`; g.fillRect(f.x - 2, f.y - 3, 4, 5);
            }
            // Smoke rising from the chimneys.
            for (let k = 0; k < scene.smoke.length; k++) {
                const c = scene.smoke[k];
                for (let p = 0; p < 4; p++) {
                    const t = ((time / 45 + p * 25 + k * 13) % 100) / 100;
                    const r = 2 + t * 4, x = c.x + t * 16 + Math.sin(time / 700 + p) * 2, y = c.y - t * 42;
                    g.fillStyle = `rgba(160, 156, 150, ${(0.22 * (1 - t)).toFixed(3)})`;
                    g.fillRect(Math.round(x - r), Math.round(y - r * 0.7), Math.round(r * 2), Math.round(r * 1.4));
                }
            }
        }
        return { w: L.base.w, h: L.base.h, base: L.base.data, over: L.over.data, water: [], animate, windows: scene.windows };
    }

    SA.scenes.bakers_lane = bakersLane;
    if (isNode) module.exports = bakersLane;
})(typeof window !== 'undefined' ? window : globalThis);
