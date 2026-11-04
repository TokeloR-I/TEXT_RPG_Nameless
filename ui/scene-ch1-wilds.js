/* =========================================================================
 * Enso's Last Stand — SCENE ART: CHAPTER ONE OUT IN THE WILDS (original, drawn by code; Saffron/Quill)
 * Brings the four outdoor maps of Chapter One that still used tile art up to the painted look of the Overgrown
 * Road and Shamefield (Tokelo, 2026-11-04: "bring the other areas up to speed with the graphic overhaul"):
 *   'tollway'       The Broken Tollway at dusk: the road south through a grey-green wood, the toll booth with its
 *                   shutter hanging open, the warning post with the heroes' sun breaking a crown, scattered goods, a
 *                   dark river and the one plank bridge, the barricade of overturned carts chained end to end with a
 *                   single gap, more wrecks in the grass, the toll stones the chanterelles grow between.
 *   'allotment'     Shane's Allotment: two raised beds of mint, yarrow and something purple; Shane's plank shack with
 *                   its patched roof, a seizure notice on the door and pots of mint; the watch's confiscation wagon
 *                   stacked with seized goods and a ledger tied on top; a scarecrow; the path east to the village.
 *   'orchard'       The North Orchard on a warm evening: rows of apple trees heavy with red fruit and windfalls in
 *                   the grass, the old causeway wall across the north with the paved causeway through it and the
 *                   circle scraped into its stones, a fallen piece of the wall, the path up the middle.
 *   'featherwatch'  Featherwatch Path at night: a stony climb that zigzags up through dark firs and crags, the broken
 *                   cage with its door bent outward, the roost where the splinted crow hops on a rail, the crow
 *                   perch made from a cart axle, crows on the branches.
 *
 * Adds these scenes to ENSO.sceneArt (ui/scene-art.js) and reuses its kit and the Overgrown Road's painters
 * (SA.roadKit, ui/scene-road.js, so load this file after that one). The maps' tiles (src/world/chapter1-maps.js) still
 * decide collision, exits and where each thing and person stands; nothing moved. No image goes in: every pixel comes
 * from shapes, noise and the palettes below (docs/art/ORIGINAL_ART_PLAN.md §0).
 * Review: `node tools/preview-scene.js tollway out.png 1` (also allotment, orchard, featherwatch).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (isNode) require('./scene-road.js');
    if (!SA || !SA.roadKit) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, alphaAt, rectFill, shape, sset, ellipse, box, poly, thick, fill, shadow,
        field, tree, deadTree, stump, barrel, crate, cart, scarecrow, blockOf, masonry } = SA.kit;
    const RK = SA.roadKit, RP = RK.RP, tall = RK.tall;
    const pick = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))];

    // One palette per place. Each keeps the road's ramps where they fit and shifts the light.
    const PALS = {
        tollway: {
            grass: R(['#18261a', '#1e2f1f', '#253823', '#2d4228', '#364c2d', '#405732', '#4c6238', '#5a6e40']),
            dirt: R(['#2d241c', '#382d22', '#443729', '#504131', '#5c4b38', '#69563f', '#776247']),
            water: R(['#0a161f', '#0e1d29', '#132634', '#183040', '#1f3b4d', '#2a4a5d', '#3f6175', '#5f8094']),
            leaf: R(['#0d1a10', '#132315', '#1a2e1b', '#213a21', '#2a4728', '#34552f', '#406336', '#4f733f', '#61834a']),
            rock: RP.rock, flowers: [[200, 196, 186], [170, 150, 200], [210, 190, 120]], shadow: [6, 10, 14]
        },
        allotment: {
            grass: RP.grass, dirt: RP.dirt, water: RP.water, leaf: RP.leaf, rock: RP.rock, flowers: RP.flowers, shadow: RP.shadow
        },
        orchard: {
            grass: R(['#22300f', '#2c3b13', '#384818', '#45561c', '#526321', '#617026', '#727d2d', '#868c37']),
            dirt: R(['#3c2a16', '#4a341b', '#594021', '#684c28', '#775830', '#866439', '#957244']),
            water: RP.water,
            leaf: R(['#122009', '#192b0c', '#213910', '#2b4814', '#365818', '#42681d', '#507823', '#628a2b', '#789c35']),
            rock: R(['#211f1c', '#2d2a26', '#3a3631', '#48433c', '#575147', '#686053', '#7b7262', '#908573']),
            flowers: [[236, 226, 200], [240, 200, 90], [220, 120, 140]], shadow: [10, 8, 4]
        },
        featherwatch: {
            grass: R(['#121a1c', '#172124', '#1c292c', '#223134', '#2a3a3c', '#334445', '#3d4e4e', '#4a5a58']),
            dirt: R(['#1d1e22', '#25262b', '#2e3035', '#383a3f', '#43454a', '#4f5156', '#5c5e62']),
            water: RP.water,
            leaf: R(['#060c0e', '#0a1215', '#0f191c', '#142124', '#1a2a2c', '#213335', '#293d3e', '#334847', '#3f5552']),
            rock: R(['#121317', '#1a1b20', '#23252a', '#2d2f35', '#383a40', '#45474c', '#53555a', '#636569']),
            flowers: [[180, 190, 210], [150, 160, 190]], shadow: [2, 4, 8]
        }
    };

    // ---------------------------------------------------------------------
    // Ground: grass, earth, paving and water from smoothed fields over the cells (as on the road).
    // ---------------------------------------------------------------------
    function ground(img, map, nameAt, cw, ch, seed, P, DIRTY, WET) {
        const dirtC = new Float32Array(cw * ch), wetC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const n = nameAt(map, x, y); dirtC[y * cw + x] = DIRTY[n] || 0; wetC[y * cw + x] = WET[n] || 0; }
        const dirt = field(dirtC, cw, ch), wet = field(wetC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);               // 0 grass, 1 earth, 2 paving, 3 water
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cell = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            const n1 = fbm(x / 20, y / 20, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            if (cell === 'stone_floor') { kind[i] = 2; continue; }
            if (cell === 'bridge' || wet(x, y) + (n1 - 0.5) * 0.45 + (n2 - 0.5) * 0.1 > 0.42) { kind[i] = 3; continue; }
            kind[i] = dirt(x, y) + (n1 - 0.5) * 0.42 + (n2 - 0.5) * 0.1 > 0.5 ? 1 : 0;
        }
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 0) {
                let t = fbm(x / 34, y / 34, seed + 3) * 0.45 + vnoise(x / 4, y / 4, seed + 4) * 0.4 + hash(x, y, seed + 5) * 0.2;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 1 || kind[i + r] === 1 || kind[i - r * img.w] === 1 || kind[i + r * img.w] === 1) { t -= 0.28 / r; break; }
                put(img, x, y, pick(P.grass, t));
            } else if (k === 1) {
                let t = fbm(x / 10, y / 10, seed + 7) * 0.55 + hash(x, y, seed + 8) * 0.35 + 0.08;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 0 || kind[i + r] === 0 || kind[i - r * img.w] === 0 || kind[i + r * img.w] === 0) t -= 0.13;
                put(img, x, y, pick(P.dirt, t));
            } else if (k === 2) {                                  // big worn paving slabs
                const row = Math.floor(y / 12), off = (row % 2) * 9, col = Math.floor((x + off) / 18), u = (x + off) % 18, v = y % 12;
                let t = 0.5 + (hash(col, row, seed) - 0.5) * 0.3 + (vnoise(x / 3, y / 3, seed + 9) - 0.5) * 0.18;
                if (u === 0 || v === 0) t = 0.1; else if (u === 1 || v === 1) t += 0.16; else if (u === 17 || v === 11) t -= 0.14;
                put(img, x, y, pick(P.rock, t));
                if ((u === 0 || v === 0) && vnoise(x / 3, y / 3, seed + 10) > 0.55) put(img, x, y, pick(RP.moss, hash(x, y, seed)));
            } else {
                let near = 0;
                for (let r = 1; r <= 9; r++) if (kind[i - r * img.w] !== 3 || kind[i + r * img.w] !== 3) { near = 10 - r; break; }
                let t = 0.25 + near * 0.045 + (fbm(x / 22, y / 8, seed + 12) - 0.5) * 0.35;
                if (vnoise(x / 1.8, y / 8, seed + 13) > 0.8) t += 0.22;
                put(img, x, y, pick(P.water, t));
            }
        }
        // Wet banks: a dark rim on the land, a pale line on the water.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] === 3) { if (kind[i - img.w] !== 3 || kind[i + img.w] !== 3) put(img, x, y, RP.foam[0], 0.4); continue; }
            if (kind[i + img.w] === 3 || kind[i - img.w] === 3 || kind[i + 2 * img.w] === 3 || kind[i - 2 * img.w] === 3) put(img, x, y, P.dirt[0], 0.7);
        }
        return kind;
    }
    function details(img, kind, seed, P, { tufts = 1, pebbles = 1 } = {}) {
        const N = (img.w * img.h) / 30;
        for (let n = 0; n < N; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 && r < 0.7 * tufts) {
                const h = 2 + Math.floor(hash(n, 10, seed) * 4);
                for (let b = -1; b <= 1; b++) for (let j = 0; j < h - Math.abs(b); j++) put(img, x + b + (j === h - 1 - Math.abs(b) ? b : 0), y - j, j === h - 1 - Math.abs(b) ? P.grass[7] : P.grass[5]);
                put(img, x, y + 1, P.grass[1]);
            } else if (k === 0 && r < 0.7 * tufts + 0.08) {
                const c = P.flowers[n % P.flowers.length]; put(img, x, y, c); put(img, x + 1, y + 1, c); put(img, x, y + 1, P.grass[2]);
            } else if (k === 1 && r < 0.4 * pebbles) {
                put(img, x, y, P.rock[6]); put(img, x + 1, y, P.rock[5]); put(img, x, y + 1, P.dirt[1]);
            }
        }
    }
    const edgeShade = (img, P, w = 14, a = 0.3) => {
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const d = Math.min(x, y, img.w - 1 - x, img.h - 1 - y);
            if (d < w) put(img, x, y, P.shadow, (1 - d / w) * a);
        }
    };
    const layersFor = (map) => { const w = map.tiles[0].length * C, h = map.tiles.length * C; return { base: Img(w, h), over: Img(w, h), scratch: Img(w, h) }; };
    const openFn = (map, nameAt, OPEN) => (x, y) => OPEN.has(nameAt(map, x, y));
    /** Trees beside a way through the edge of the map stand back from it, so nobody arriving there is hidden. */
    const byGap = (map, nameAt, x, y) => [-1, 1].some((d) => { const n = nameAt(map, x + d, y); return n === 'dirt_path' || n === 'stone_floor'; }) || [-1, 1].some((d) => nameAt(map, x + d, y - 1) === 'dirt_path' || nameAt(map, x + d, y + 1) === 'dirt_path');

    // ---------------------------------------------------------------------
    // Shared props
    // ---------------------------------------------------------------------
    /** A timber hut (toll booth or shack): plank walls, a door, a window, and a roof of shingles or patched boards. */
    function hut(L, b, seed, overhead, { roofTone = 0, shutter = false, notice = false, patched = false, pots = false } = {}, doorX = null) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C - 2, W = X1 - X0;
        const wallTop = B - 30;
        tall(L, [X0 - 12, Y0 - 20, X1 + 12, B + 10], Y0 + 4, overhead, (S) => {
            shadow(S, X0 + W / 2 + 6, B + 2, W / 2 + 8, 6, 0.5);
            RK.planks(S, X0 + 2, wallTop, W - 4, B - wallTop, seed, RP.plank, true);
            for (let px = X0 + 2; px < X1 - 2; px++) { put(S, px, B - 1, RP.plank[0]); put(S, px, wallTop, RP.plank[1]); }
            for (const px of [X0 + 2, X1 - 6]) { const p = shape(); box(p, S, px, wallTop - 2, 4, B - wallTop + 2, 0.1); fill(S, p, RP.plank, { tex: 0.3, seed: seed + px, outline: RP.plank[0] }); }
            if (doorX != null) {
                const dx = doorX * C + 8;
                rectFill(S, dx - 1, wallTop + 3, 18, B - wallTop - 3, RP.plank[0]);
                RK.planks(S, dx, wallTop + 4, 16, B - wallTop - 5, seed + 9, RP.plank.slice(1), true);
                put(S, dx + 12, wallTop + 16, PAL.iron[4]); put(S, dx + 12, wallTop + 17, PAL.iron[2]);
                if (notice) { rectFill(S, dx + 2, wallTop + 7, 10, 8, [208, 200, 178]); for (let k = 0; k < 3; k++) rectFill(S, dx + 3, wallTop + 9 + k * 2, 7 - (k % 2) * 2, 1, [70, 60, 50]); rectFill(S, dx + 3, wallTop + 7, 2, 1, [150, 30, 30]); }
            }
            // A window, its shutter hanging open on one hinge.
            const wx = doorX != null && doorX * C + 8 - X0 > W / 2 ? X0 + 12 : X1 - 30;
            rectFill(S, wx - 1, wallTop + 6, 16, 12, RP.plank[0]); rectFill(S, wx, wallTop + 7, 14, 10, [14, 12, 12]);
            if (shutter) { const sh = shape(); poly(sh, S, [[wx + 14, wallTop + 7], [wx + 22, wallTop + 10], [wx + 21, wallTop + 22], [wx + 14, wallTop + 17]], 0.1); fill(S, sh, RP.plank.slice(1), { tex: 0.4, seed, outline: RP.plank[0] }); }
            else { rectFill(S, wx + 6, wallTop + 7, 2, 10, RP.plank[3]); rectFill(S, wx, wallTop + 11, 14, 2, RP.plank[3]); rectFill(S, wx + 1, wallTop + 8, 4, 2, [70, 80, 90]); }
            rectFill(S, wx - 2, wallTop + 18, 18, 2, RP.plank[5]);
            // The roof: courses of shingles (or odd boards nailed on) with an overhang, darkest under the eaves.
            const ry0 = Y0 - 8, ry1 = wallTop + 2;
            const roof = shape(); poly(roof, S, [[X0 - 6, ry1], [X0 + 2, ry0], [X1 - 2, ry0], [X1 + 6, ry1]], 0);
            for (const [i] of roof.px) {
                const px = i % S.w, py = (i / S.w) | 0, course = Math.floor((py - ry0) / 5), off = (course % 2) * 4, col = Math.floor((px + off) / 8);
                let t = 0.48 + roofTone + (hash(col, course, seed) - 0.5) * 0.3 + ((py - ry0) % 5 === 4 ? -0.3 : 0) + ((px + off) % 8 === 0 ? -0.18 : 0) - ((py - ry0) / (ry1 - ry0)) * 0.12;
                const patch = patched && hash(Math.floor(px / 14), Math.floor((py - ry0) / 10), seed + 4) < 0.22;
                if (patch) t = 0.45 + hash(px >> 2, py >> 2, seed) * 0.25 + ((px % 5) === 0 ? -0.3 : 0);
                put(S, px, py, pick(patch ? RP.plank : PAL.slate, t));
                if (vnoise(px / 4, py / 4, seed + 30) > 0.8) put(S, px, py, PAL.moss[1 + ((px + py) & 1)]);
            }
            for (let px = X0 - 6; px < X1 + 6; px++) { put(S, px, ry1, RP.plank[1]); put(S, px, ry1 + 1, [0, 0, 0], 0.5); put(S, px, ry1 + 2, [0, 0, 0], 0.3); }
            rectFill(S, X0 + 2, ry0 - 2, W - 4, 3, PAL.slate[5]);
            if (pots) for (let k = 0; k < 3; k++) {                // pots of mint by the door
                const px = X0 + 8 + k * 10 + (k > 1 ? W - 50 : 0), gy = B + 2, p = shape();
                poly(p, S, [[px - 4, gy - 8], [px + 4, gy - 8], [px + 3, gy], [px - 3, gy]], 0); fill(S, p, R(['#4a2418', '#6a3622', '#8a4a2e']), { outline: [30, 14, 8] });
                for (let n = 0; n < 9; n++) { const lx = px - 4 + hash(n, k, seed) * 8, ly = gy - 9 - hash(n, k + 3, seed) * 6; put(S, lx, ly, RP.leaf[6]); put(S, lx + 1, ly, RP.leaf[4]); }
            }
        });
    }
    /** A crow perched (the road's crow, scaled down). */
    function smallCrow(img, x, y) {
        rectFill(img, x, y, 5, 3, [14, 12, 14]); rectFill(img, x + 1, y - 2, 3, 2, [14, 12, 14]); put(img, x + 4, y - 1, [70, 60, 50]); put(img, x - 1, y + 1, [14, 12, 14]); put(img, x + 2, y - 2, [180, 50, 40]);
        put(img, x + 1, y + 3, [40, 34, 30]); put(img, x + 3, y + 3, [40, 34, 30]);
    }

    // ---------------------------------------------------------------------
    // The Broken Tollway
    // ---------------------------------------------------------------------
    function tollway(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 701, P = PALS.tollway;
        const kind = ground(L.base, map, nameAt, cw, ch, seed, P, { dirt_path: 1, bridge: 1, cart: 0.55, crate: 0.5, signpost: 0.6, shed_door_shut: 0.9, shed_wall: 0.45 }, { water: 1, bridge: 1 });
        details(L.base, kind, seed, P);
        const img = L.base;
        // Boulders and reeds along both banks of the river.
        for (let n = 0; n < 90; n++) {
            const x = Math.floor(hash(n, 11, seed) * img.w), y = Math.floor(hash(n, 12, seed) * img.h), i = y * img.w + x;
            if (kind[i] === 3 || !(kind[i + 4 * img.w] === 3 || kind[i - 4 * img.w] === 3)) continue;
            if (nameAt(map, Math.floor(x / C), Math.floor(y / C)) === 'dirt_path' || Math.abs(x - 9.5 * C) < 26) continue;
            if (hash(n, 13, seed) < 0.55) RK.boulder(img, x, y, 4 + hash(n, 14, seed) * 5, 3 + hash(n, 15, seed) * 3, seed + n, 0.5);
            else for (let k = 0; k < 7; k++) { const rx = x + (hash(k, n, seed) - 0.5) * 12, h = 6 + hash(k, n + 1, seed) * 8; for (let j = 0; j < h; j++) put(img, rx + (j * (hash(k, 2, seed) - 0.5)) / 3, y - j, pick(RP.reed, j / h)); }
        }
        // Old toll stones set in the road, worn and half buried.
        for (let n = 0; n < 60; n++) {
            const x = hash(n, 1, seed) * img.w, y = hash(n, 2, seed) * img.h;
            if (kind[Math.floor(y) * img.w + Math.floor(x)] !== 1) continue;
            const s = shape(); box(s, img, x, y, 7 + hash(n, 3, seed) * 6, 5, 0.3); fill(img, s, P.rock.slice(2, 7), { tex: 0.5, seed: n, outline: P.rock[1] });
        }
        const OPEN = new Set(['grass', 'dirt_path', 'bridge']), open = openFn(map, nameAt, OPEN);
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const items = [], seen = new Set();
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 28;
            if (n === 'shed_roof' || n === 'shed_wall' || n === 'shed_door_shut') {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set(['shed_roof', 'shed_wall', 'shed_door_shut']), seen);
                let door = null; for (let xx = b.x0; xx <= b.x1; xx++) if (nameAt(map, xx, b.y1) === 'shed_door_shut') door = xx;
                items.push({ x, y: b.y1 + 0.9, draw: () => hut(L, b, seed, [...Array(b.x1 - b.x0 + 1)].some((_, i) => open(b.x0 + i, b.y0 - 1)), { shutter: true }, door) });
                continue;
            }
            if (n === 'bridge') { if (seen.has(`${x},${y}`)) continue; const b = blockOf(map, nameAt, x, y, new Set(['bridge']), seen); items.push({ x, y: b.y0 - 0.5, draw: () => plankBridge(L, b, seed) }); continue; }
            if (n === 'cart') {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set(['cart']), seen);
                if (b.x1 > b.x0) items.push({ x, y: b.y1 + 0.6, draw: () => barricade(L, b, seed, behind(b.x0, b.y0), P) });
                else items.push({ x, y: y + 0.6, draw: () => cart(L, x, y, seed + x * 3 + y) });
                continue;
            }
            const P2 = {
                tree: () => tree(L, x, y, seed, { big: byGap(map, nameAt, x, y) ? 0.9 : (x < 2 || x > cw - 3 || y === 0 || y === ch - 1 ? 1.5 : 1.2) + hash(x, y, seed) * 0.4, ramp: hash(x, y, seed + 9) < 0.15 ? RP.red : P.leaf, overhead: behind(x, y), dy: y === 0 ? 14 : 0 }),
                dead_tree: () => deadTree(L, x, y, seed + x),
                rock: () => { RK.boulder(img, cx - 3, gy - 8, 10, 8, seed + x * 3 + y, 0.35); RK.boulder(img, cx + 8, gy - 3, 5, 4, seed + x + y * 5, 0.3); },
                crate: () => goods(L, x, y, seed),
                signpost: () => tall(L, [cx - 24, gy - 64, cx + 24, gy + 6], y * C, open(x, y - 1), (S) => warningPost(S, cx, gy, seed))
            }[n];
            if (P2) items.push({ x, y: y + (n === 'tree' ? 0.8 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, P, 16, 0.35);
        const water = [];
        for (let i = 0; i < kind.length; i += 5) if (kind[i] === 3 && hash(i, 0, seed) < 0.12) water.push(i);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water };
    }
    /** The bridge over the river, running north-south: boards laid across the way, rails and posts both sides. */
    function plankBridge(L, b, seed) {
        const img = L.base, X0 = b.x0 * C - 4, X1 = (b.x1 + 1) * C + 4, Y0 = b.y0 * C - 8, Y1 = (b.y1 + 1) * C + 8;
        shadow(img, (X0 + X1) / 2 + 6, (Y0 + Y1) / 2 + 4, (X1 - X0) / 2 + 4, (Y1 - Y0) / 2, 0.45);
        for (const py of [Y0 + 18, Y1 - 22]) for (const px of [X0 - 2, X1 - 4]) { const s = shape(); box(s, img, px, py, 6, 14, 0); fill(img, s, RP.plank, { tex: 0.4, seed: seed + py, outline: RP.plank[0] }); for (let i = -2; i < 8; i++) put(img, px + i, py + 14 + (i & 1), RP.foam[1], 0.7); }
        RK.planks(img, X0, Y0, X1 - X0, Y1 - Y0, seed, RP.plank, false);
        for (let py = Y0 + 5; py < Y1; py += 5) if (hash(py, 3, seed) < 0.15) rectFill(img, X0 + 6 + hash(py, 4, seed) * 20, py + 1, 4, 2, RP.plank[0]);
        for (const rx of [X0 - 3, X1 - 2]) {
            const r = shape(); box(r, img, rx, Y0 - 4, 5, Y1 - Y0 + 4, 0.3); fill(img, r, RP.plank.slice(1), { tex: 0.5, seed: seed + rx, outline: RP.plank[0] });
            for (let py = Y0 - 4; py <= Y1 - 4; py += Math.round((Y1 - Y0) / 3)) rectFill(img, rx - 1, py, 7, 5, RP.plank[5]);
        }
    }
    /** The barricade: carts tipped on their sides and chained together across the road. */
    function barricade(L, b, seed, overhead, P) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 3;
        tall(L, [X0 - 8, B - 60, X1 + 8, B + 8], b.y0 * C, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 4, B + 1, (X1 - X0) / 2 + 6, 6, 0.5);
            // The bed of each cart on its side: a wall of boards with the rim on top.
            RK.planks(S, X0 + 2, B - 26, X1 - X0 - 4, 24, seed + b.x0, RP.plank, true);
            for (let px = X0 + 2; px < X1 - 2; px++) { put(S, px, B - 26, RP.plank[6]); put(S, px, B - 25, RP.plank[4]); put(S, px, B - 2, RP.plank[0]); }
            for (let px = X0 + 26; px < X1 - 10; px += 30 + Math.floor(hash(px, 1, seed) * 10)) { const g = shape(); poly(g, S, [[px, B - 26], [px + 6, B - 26], [px + 3, B - 14]], 0); for (const [i] of g.px) put(S, i % S.w, (i / S.w) | 0, [12, 10, 8]); }   // splintered gaps
            // Wheels sticking up, some broken; an axle pointing at the sky.
            for (let px = X0 + 18; px < X1 - 12; px += 44) {
                const r = 10 + hash(px, 2, seed) * 4;
                RK.wheel(S, px, B - 30 - r * 0.6, r, seed + px);
                if (hash(px, 3, seed) < 0.4) for (let j = 0; j < 8; j++) put(S, px + r * 0.6 + j * 0.3, B - 34 - r - j, [0, 0, 0], 0);
            }
            // The chain looped from cart to cart.
            for (let px = X0; px < X1; px++) { const py = Math.round(B - 16 + Math.sin(((px - X0) / C) * Math.PI) * 4); put(S, px, py, PAL.iron[(px >> 1) % 2 ? 3 : 4]); put(S, px, py + 1, PAL.iron[1]); }
            for (let n = 0; n < 10; n++) { const fx = X0 + hash(n, 9, seed) * (X1 - X0), fy = B + hash(n, 8, seed) * 3; for (let j = 0; j < 5; j++) put(S, fx, fy - j, P.grass[4 + (j & 1)]); }
        });
    }
    /** Scattered goods: a bolt of cloth, a cracked honey jar, a child's wooden horse, a burst pack. */
    function goods(L, cx, cy, seed) {
        const img = L.base, x = cx * C + 4, gy = cy * C + 26;
        shadow(img, x + 12, gy, 14, 4, 0.4);
        const bolt = shape(); ellipse(bolt, img, x + 6, gy - 5, 7, 4); box(bolt, img, x + 4, gy - 9, 14, 8, 0.2); fill(img, bolt, R(['#3a1e3c', '#552c58', '#704074', '#8c5690']), { tex: 0.4, seed, outline: [20, 10, 20] });
        const jar = shape(); ellipse(jar, img, x + 21, gy - 5, 4, 5); fill(img, jar, R(['#6a4410', '#9a6418', '#c8902a', '#e8b850']), { outline: [40, 24, 8] });
        for (let k = 0; k < 4; k++) put(img, x + 24 + k, gy - 1 + (k % 2), [200, 140, 40]);
        rectFill(img, x + 8, gy + 1, 8, 3, RP.plank[5]); rectFill(img, x + 14, gy - 2, 3, 3, RP.plank[5]); put(img, x + 9, gy + 4, RP.plank[2]); put(img, x + 14, gy + 4, RP.plank[2]);
    }
    /** The warning post: the heroes' sun breaking a crown, and newer paint under it. */
    function warningPost(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 8, 3, 0.4);
        const p = shape(); thick(p, S, cx, gy - 50, cx, gy, 2); fill(S, p, RP.plank, { tex: 0.4, seed, outline: RP.plank[0] });
        const bd = shape(); box(bd, S, cx - 14, gy - 52, 28, 30, 0.1); fill(S, bd, RP.plank.slice(2), { tex: 0.4, seed: seed + 1, outline: RP.plank[0] });
        const sx = cx, sy = gy - 42;
        for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; for (let r = 4; r < 8; r++) put(S, sx + Math.cos(t) * r, sy + Math.sin(t) * r * 0.9, [222, 178, 70]); }
        const sun = shape(); ellipse(sun, S, sx, sy, 3.5, 3.5); fill(S, sun, R(['#a0701c', '#d8a63a', '#f4d070']), { edge: false });
        for (let i = -6; i <= 6; i++) put(S, sx + i, sy + 6 + Math.abs(i % 3), [120, 120, 130]);    // the broken crown under it
        put(S, sx - 5, sy + 4, [120, 120, 130]); put(S, sx, sy + 3, [120, 120, 130]); put(S, sx + 5, sy + 4, [120, 120, 130]);
        for (let k = 0; k < 3; k++) rectFill(S, cx - 11, gy - 32 + k * 3, 22 - (k % 2) * 6, 1, [210, 204, 190]);
    }

    // ---------------------------------------------------------------------
    // Shane's Allotment
    // ---------------------------------------------------------------------
    function allotment(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 733, P = PALS.allotment;
        const kind = ground(L.base, map, nameAt, cw, ch, seed, P, { dirt_path: 1, tall_weeds: 0.85, shed_wall: 0.5, shed_door_shut: 0.9, wagon: 0.5, scarecrow: 0.3 }, {});
        details(L.base, kind, seed, P);
        const img = L.base;
        const OPEN = new Set(['grass', 'dirt_path']), open = openFn(map, nameAt, OPEN);
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const items = [], seen = new Set();
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 28;
            if (n === 'tall_weeds') { if (seen.has(`${x},${y}`)) continue; const b = blockOf(map, nameAt, x, y, new Set(['tall_weeds']), seen); items.push({ x, y: b.y0 - 0.2, draw: () => herbBed(L, b, seed + b.y0) }); continue; }
            if (n === 'shed_roof' || n === 'shed_wall' || n === 'shed_door_shut') {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set(['shed_roof', 'shed_wall', 'shed_door_shut']), seen);
                let door = null; for (let xx = b.x0; xx <= b.x1; xx++) if (nameAt(map, xx, b.y1) === 'shed_door_shut') door = xx;
                items.push({ x, y: b.y1 + 0.9, draw: () => hut(L, b, seed, [...Array(b.x1 - b.x0 + 1)].some((_, i) => open(b.x0 + i, b.y0 - 1)), { roofTone: -0.05, notice: true, patched: true, pots: true }, door) });
                continue;
            }
            if (n === 'wagon') { if (seen.has(`${x},${y}`)) continue; const b = blockOf(map, nameAt, x, y, new Set(['wagon']), seen); items.push({ x, y: b.y1 + 0.7, draw: () => evidenceWagon(L, b, seed, behind(b.x0, b.y0) || behind(b.x1, b.y0)) }); continue; }
            const P2 = {
                tree: () => tree(L, x, y, seed, { big: byGap(map, nameAt, x, y) ? 0.9 : 1.4 + hash(x, y, seed) * 0.5, ramp: P.leaf, overhead: behind(x, y) }),
                rock: () => { RK.boulder(img, cx - 2, gy - 8, 10, 8, seed + x * 3 + y); RK.boulder(img, cx + 9, gy - 3, 5, 4, seed + x + y * 5); },
                scarecrow: () => tall(L, [cx - 20, gy - 44, cx + 20, gy + 6], y * C, open(x, y - 1), (S) => scarecrow({ base: S, over: S }, x, y, seed))
            }[n];
            if (P2) items.push({ x, y: y + (n === 'tree' ? 0.8 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, P, 14, 0.28);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [] };
    }
    /** A raised bed edged with boards: rows of mint, yarrow and something purple, a few weeds coming through. */
    function herbBed(L, b, seed) {
        const img = L.base, X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, Y0 = b.y0 * C + 2, Y1 = (b.y1 + 1) * C - 2;
        shadow(img, (X0 + X1) / 2 + 3, Y1 + 2, (X1 - X0) / 2 + 2, 4, 0.4);
        for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) put(img, x, y, pick(R(['#1c130b', '#261a10', '#312215', '#3c2a1a']), 0.4 + (vnoise(x / 3, y / 3, seed) - 0.5) * 0.6));
        const rowsN = Math.floor((Y1 - Y0 - 6) / 13);
        for (let r = 0; r < rowsN; r++) {
            const ry = Y0 + 8 + r * 13, kindR = (r + b.x0) % 3;
            for (let px = X0 + 6; px < X1 - 6; px += 7 + Math.floor(hash(px, r, seed) * 3)) {
                const jx = px + (hash(px, r + 1, seed) - 0.5) * 3, jy = ry + (hash(px, r + 2, seed) - 0.5) * 3;
                if (kindR === 0) {                                     // mint: round bright leaves
                    const m = shape(); for (let k = 0; k < 4; k++) ellipse(m, img, jx + (k - 1.5) * 2.5, jy - (k % 2) * 3, 2.6, 2.3); fill(img, m, RP.leaf.slice(3), { outline: RP.leaf[1] });
                } else if (kindR === 1) {                              // yarrow: feathery leaves, flat white heads
                    for (let j = 0; j < 8; j++) put(img, jx + (j % 2), jy - j, RP.leaf[4]);
                    for (let k = -3; k <= 3; k++) { put(img, jx + k, jy - 9, [228, 224, 206]); if (Math.abs(k) < 3) put(img, jx + k, jy - 10, [240, 238, 224]); }
                } else {                                               // the purple one
                    for (let j = 0; j < 9; j++) put(img, jx, jy - j, RP.leaf[3 + (j & 1)]);
                    for (let j = 0; j < 5; j++) { put(img, jx - 1, jy - 6 - j, [130, 70, 170]); put(img, jx + 1, jy - 7 - j, [160, 96, 200]); }
                }
            }
        }
        for (let n = 0; n < 20; n++) { const wx = X0 + hash(n, 1, seed) * (X1 - X0), wy = Y0 + hash(n, 2, seed) * (Y1 - Y0); for (let j = 0; j < 4; j++) put(img, wx + (j & 1), wy - j, RP.grass[5]); }
        // The board edging.
        for (const [x, y, w, h] of [[X0 - 2, Y0 - 2, X1 - X0 + 4, 4], [X0 - 2, Y1 - 2, X1 - X0 + 4, 5], [X0 - 2, Y0 - 2, 4, Y1 - Y0 + 4], [X1 - 2, Y0 - 2, 4, Y1 - Y0 + 4]]) {
            const s = shape(); box(s, img, x, y, w, h, 0.3); fill(img, s, RP.plank.slice(1), { tex: 0.5, seed: seed + x + y, outline: RP.plank[0] });
        }
        for (let px = X0; px < X1; px++) put(img, px, Y1 + 3, RP.plank[0]);
    }
    /** The watch's confiscation wagon: an open bed stacked with seized goods, a ledger tied on top with string. */
    function evidenceWagon(L, b, seed, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 2, W = X1 - X0;
        tall(L, [X0 - 30, B - 70, X1 + 12, B + 8], b.y0 * C, overhead, (S) => {
            shadow(S, X0 + W / 2 + 2, B + 1, W / 2 + 10, 6, 0.5);
            const sh = shape(); thick(sh, S, X0 + 4, B - 14, X0 - 24, B - 2, 1.4); thick(sh, S, X0 + 4, B - 19, X0 - 20, B - 9, 1.4); fill(S, sh, RP.plank.slice(1), { outline: RP.plank[0] });
            RK.wheel(S, X0 + 14, B - 11, 10, seed + 1);
            const bedTop = B - 30, bedBot = B - 14;
            RK.planks(S, X0 + 2, bedTop, W - 2, bedBot - bedTop, seed, RP.plank, false);
            rectFill(S, X0 + 2, bedTop - 2, W - 2, 3, R(['#26303e'])[0]);                         // the watch's blue band
            for (let k = 0; k < 3; k++) rectFill(S, X0 + 10 + k * 16, bedTop + 4, 6, 6, [196, 170, 70]);
            // Goods: crates, jars, a doctor's case, packets; on top, the battered ledger tied with string.
            crate({ base: S }, X0 + 16, bedTop + 1, seed + 3, 1);
            crate({ base: S }, X0 + 38, bedTop + 1, seed + 4, -1);
            for (let k = 0; k < 4; k++) { const j = shape(); box(j, S, X0 + 48 + k * 4, bedTop - 8, 3, 8, 0); fill(S, j, R(['#2a3a36', '#405a52', '#6a8a7e']), { outline: [16, 22, 20] }); }
            const cs = shape(); box(cs, S, X0 + 22, bedTop - 26, 16, 10, 0.2); fill(S, cs, R(['#2a1408', '#45220e', '#633418', '#7a4420']), { outline: [16, 8, 4] }); rectFill(S, X0 + 28, bedTop - 28, 4, 2, PAL.iron[4]);
            const lg = shape(); box(lg, S, X0 + 21, bedTop - 31, 18, 5, 0.4); fill(S, lg, R(['#3a1810', '#5a2818', '#7a3c24']), { outline: [20, 8, 4] });
            for (let j = bedTop - 32; j < bedTop - 16; j++) put(S, X0 + 30, j, [208, 196, 160]);
            for (let i = X0 + 20; i < X0 + 40; i++) put(S, i, bedTop - 29, [208, 196, 160]);
            RK.wheel(S, X1 - 14, B - 12, 12, seed + 5);
        });
    }

    // ---------------------------------------------------------------------
    // The North Orchard
    // ---------------------------------------------------------------------
    function orchard(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 761, P = PALS.orchard;
        const kind = ground(L.base, map, nameAt, cw, ch, seed, P, { dirt_path: 1, rubble: 0.6 }, {});
        details(L.base, kind, seed, P);
        const img = L.base;
        // Windfalls in the grass under the rows.
        for (let n = 0; n < 220; n++) {
            const x = hash(n, 1, seed) * img.w, y = hash(n, 2, seed) * img.h, cell = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            if (kind[Math.floor(y) * img.w + Math.floor(x)] !== 0 || cell !== 'grass') continue;
            const near = [[0, -1], [-1, -1], [1, -1], [0, 0]].some(([dx, dy]) => nameAt(map, Math.floor(x / C) + dx, Math.floor(y / C) + dy) === 'fruit_tree');
            if (!near) continue;
            const a = shape(); ellipse(a, img, x, y, 2.2, 2); fill(img, a, R(['#4a1410', '#7a2418', '#a83a22', '#cc5a34']), { outline: [30, 10, 6] }); put(img, x - 1, y - 1, [240, 170, 120]);
        }
        const OPEN = new Set(['grass', 'dirt_path', 'stone_floor']), open = openFn(map, nameAt, OPEN);
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        causewayWall(L, map, nameAt, cw, seed, P);
        const items = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 28;
            const P2 = {
                tree: () => tree(L, x, y, seed, { big: byGap(map, nameAt, x, y) ? 0.9 : 1.35 + hash(x, y, seed) * 0.45, ramp: hash(x, y, seed + 4) < 0.25 ? PAL.leafAutumn : P.leaf, overhead: behind(x, y), dy: y === 0 ? 10 : 0 }),
                fruit_tree: () => appleTree(L, x, y, seed, behind(x, y), x === 9 && y === 15),
                dead_tree: () => deadTree(L, x, y, seed + x),
                rock: () => { RK.boulder(img, cx - 2, gy - 8, 10, 8, seed + x * 3 + y, 0.4); RK.boulder(img, cx + 9, gy - 3, 5, 4, seed + x + y * 5, 0.4); }
            }[n];
            if (P2) items.push({ x, y: y + (n === 'tree' || n === 'fruit_tree' ? 0.8 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, P, 14, 0.3);
        // Warm evening light across the whole orchard.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) put(img, x, y, [255, 196, 110], 0.05 + 0.04 * (x / img.w));
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [] };
    }
    function appleTree(L, cx, cy, seed, overhead, ribbon) {
        const s = seed + 17, big = 1.05 + hash(cx, cy, s + 6) * 0.2;
        tree(L, cx, cy, s, { big, ramp: PALS.orchard.leaf, overhead });
        const CL = overhead ? L.over : L.base;
        const x = cx * C + 16 + (hash(cx, cy, s) - 0.5) * 8, gy = cy * C + 28, r = (15 + hash(cx, cy, s + 1) * 5) * big, cy0 = gy - 14 - r * 0.85;
        for (let n = 0; n < 16; n++) {
            const a = hash(n, cx, s + cy) * Math.PI * 2, d = r * (0.2 + hash(n, cy, s) * 0.65);
            const px = Math.round(x + Math.cos(a) * d), py = Math.round(cy0 + Math.sin(a) * d * 0.85);
            if (!alphaAt(CL, px, py)) continue;
            put(CL, px, py, [168, 32, 26]); put(CL, px + 1, py, [196, 48, 34]); put(CL, px, py + 1, [120, 22, 18]); put(CL, px + 1, py + 1, [150, 30, 24]); put(CL, px, py - 1, [236, 120, 90]);
        }
        if (ribbon) { rectFill(L.base, x - 3, gy - 10, 7, 2, [200, 40, 50]); put(L.base, x + 3, gy - 8, [200, 40, 50]); put(L.base, x + 4, gy - 7, [160, 30, 40]); }
    }
    /** The old causeway wall across the north: a broad bank of fitted stone, its top grown over, a face of big
     *  blocks with buttresses, the paved causeway running through, one piece fallen, the circle scraped into the flags. */
    function causewayWall(L, map, nameAt, cw, seed, P) {
        const img = L.base;
        let y0 = 99, y1 = -1;
        for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < cw; x++) if (nameAt(map, x, y) === 'stone_wall') { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        if (y1 < 0) return;
        const faceY = y1 * C + 4;
        for (let y = y0 * C; y < (y1 + 1) * C; y++) for (let x = 0; x < img.w; x++) {
            const n = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            if (n !== 'stone_wall' && n !== 'rubble') continue;
            if (y < faceY) {                                        // the top of the bank: turf and stones showing through
                const t = fbm(x / 12, y / 12, seed + 5) * 0.6 + hash(x, y, seed) * 0.3;
                put(img, x, y, vnoise(x / 6, y / 6, seed + 6) > 0.62 ? pick(P.rock, 0.3 + t * 0.6) : pick(P.grass, 0.15 + t * 0.6));
            }
        }
        // The face: big blocks, darkest at the foot, buttresses every few cells.
        for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y1);
            if (n !== 'stone_wall' && n !== 'rubble') continue;
            RK.blocks(img, x * C, faceY, C, (y1 + 1) * C - faceY, seed + x, P.rock);
            for (let j = faceY; j < (y1 + 1) * C; j++) for (let i = 0; i < C; i++) put(img, x * C + i, j, P.shadow, ((j - faceY) / ((y1 + 1) * C - faceY)) * 0.35);
            for (let i = 0; i < C; i++) put(img, x * C + i, faceY, P.rock[7]);
            if (x % 4 === 1) { const bt = shape(); poly(bt, img, [[x * C + 8, faceY - 6], [x * C + 22, faceY - 6], [x * C + 26, (y1 + 1) * C], [x * C + 4, (y1 + 1) * C]], (px) => ((px - x * C - 15) / 11) * -0.6); fill(img, bt, P.rock.slice(1), { tex: 0.4, seed: seed + x, outline: P.rock[0] }); }
            for (let i = 0; i < C; i++) for (let j = 0; j < 6; j++) put(img, x * C + i, (y1 + 1) * C + j, P.shadow, 0.4 * (1 - j / 6));
            if (hash(x, 3, seed) < 0.5) for (let j = 0; j < 12 + hash(x, 4, seed) * 14; j++) { const px = x * C + 6 + hash(x, 5, seed) * 20 + Math.round(Math.sin(j / 4) * 1.5); put(img, px, faceY + j, P.leaf[4]); if (j % 3 === 0) put(img, px + 1, faceY + j, P.leaf[6]); }
        }
        // The causeway: low parapets either side of the paving, and the scraped circle in the flags.
        for (let x = 0; x < cw; x++) for (let y = y0; y <= y1; y++) {
            if (nameAt(map, x, y) !== 'stone_floor') continue;
            for (const side of [-1, 1]) if (nameAt(map, x + side, y) === 'stone_wall') {
                const px = side < 0 ? x * C - 2 : (x + 1) * C - 5, s = shape(); box(s, img, px, y * C, 7, C, side < 0 ? 0.4 : -0.2);
                fill(img, s, P.rock.slice(2), { tex: 0.5, seed: seed + y, outline: P.rock[0] });
            }
            if (y === y1) { const ccx = x * C + 16, ccy = y * C + 16; for (let a = 0.45; a < Math.PI * 2 - 0.45; a += 0.04) { put(img, ccx + Math.sin(a) * 11, ccy - Math.cos(a) * 9, [196, 188, 170]); put(img, ccx + Math.sin(a) * 10, ccy - Math.cos(a) * 8, [110, 100, 90]); } }
        }
        for (let x = 0; x < cw; x++) for (let y = y0; y <= y1; y++) if (nameAt(map, x, y) === 'rubble') {
            for (let k = 0; k < 8; k++) { const s = shape(), bx = x * C + 4 + hash(k, x, seed) * 24, by = y * C + 8 + hash(k, y, seed) * 20; box(s, img, bx - 4, by - 3, 8 + hash(k, 1, seed) * 4, 6, 0.3); fill(img, s, P.rock.slice(2), { tex: 0.5, seed: seed + k, outline: P.rock[0] }); }
        }
    }

    // ---------------------------------------------------------------------
    // Featherwatch Path
    // ---------------------------------------------------------------------
    function featherwatch(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 797, P = PALS.featherwatch;
        const kind = ground(L.base, map, nameAt, cw, ch, seed, P, { dirt_path: 1, cage: 0.6 }, {});
        const img = L.base;
        // Under the firs: needles and stone; on the path: steps cut into the rock as it climbs.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const n = nameAt(map, Math.floor(x / C), Math.floor(y / C)), i = y * img.w + x;
            if (n === 'tree') { put(img, x, y, pick(P.grass, 0.1 + fbm(x / 9, y / 9, seed + 2) * 0.35)); if (vnoise(x / 5, y / 5, seed + 3) > 0.68) put(img, x, y, pick(P.rock, 0.3 + hash(x, y, seed) * 0.3)); continue; }
            if (kind[i] === 1 && n === 'dirt_path' && nameAt(map, Math.floor(x / C), Math.floor(y / C) - 1) === 'dirt_path' && y % 10 === 0) { put(img, x, y, P.rock[1]); put(img, x, y + 1, P.rock[6]); }
        }
        details(img, kind, seed, P, { tufts: 0.22 });
        const OPEN = new Set(['grass', 'dirt_path']), open = openFn(map, nameAt, OPEN);
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const items = [];
        const at = (x, y) => (map.interactables || []).find((o) => o.x === x && o.y === y);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 28;
            const P2 = {
                tree: () => (hash(x, y, seed + 5) < 0.1 && !behind(x, y) ? crag(L, x, y, seed, P) : fir(L, x, y, seed, behind(x, y), P)),
                cage: () => {
                    const o = at(x, y), id = o ? o.id : '';
                    tall(L, [cx - 24, gy - 50, cx + 24, gy + 6], y * C, open(x, y - 1), (S) => (/perch/.test(id) ? perch(S, cx, gy, seed) : cage(S, cx, gy, seed + x, { broken: /cage/.test(id), crow: !/cage/.test(id) })));
                },
                dead_tree: () => deadTree(L, x, y, seed + x),
                rock: () => { RK.boulder(img, cx - 2, gy - 8, 10, 8, seed + x * 3 + y, 0.25); RK.boulder(img, cx + 9, gy - 3, 5, 4, seed + x + y * 5, 0.2); }
            }[n];
            if (P2) items.push({ x, y: y + (n === 'tree' ? 0.8 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Crows on the branches by the path.
        for (let n = 0; n < 9; n++) {
            const x = Math.floor(hash(n, 1, seed) * cw), y = Math.floor(hash(n, 2, seed) * ch);
            if (nameAt(map, x, y) !== 'tree' || !(open(x + 1, y) || open(x - 1, y))) continue;
            smallCrow(L.over.data && alphaAt(L.over, x * C + 16, y * C - 6) ? L.over : L.base, x * C + 10 + hash(n, 3, seed) * 10, y * C - 6);
        }
        edgeShade(img, P, 18, 0.45);
        // Cold moonlight from the north-east.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) put(img, x, y, [120, 150, 200], 0.05 + 0.05 * (1 - y / img.h));
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [] };
    }
    /** A dark fir: a straight trunk and tiers of drooping boughs, frost on the moonlit edges. */
    function fir(L, cx, cy, seed, overhead, P) {
        const x = cx * C + 16 + (hash(cx, cy, seed) - 0.5) * 4, gy = cy * C + 30, h = 40 + hash(cx, cy, seed + 1) * 16, w = 13 + hash(cx, cy, seed + 2) * 4;
        shadow(L.base, x + 6, gy, w * 0.8, 5, 0.45);
        const tr = shape(); thick(tr, L.base, x, gy - 10, x, gy, 2.4); fill(L.base, tr, PAL.wood.slice(0, 4), { outline: PAL.wood[0] });
        const CL = overhead ? L.over : L.base, s = shape(), tiers = 4;
        for (let t = 0; t < tiers; t++) {
            const ty = gy - 8 - (t / tiers) * h, tw = w * (1 - t / (tiers + 0.6)), th = h / tiers + 8;
            poly(s, CL, [[x, ty - th], [x + tw, ty], [x + tw * 0.55, ty - 2], [x, ty + 1], [x - tw * 0.55, ty - 2], [x - tw, ty]], (px, py) => ((px - x) / tw) * -0.5 + ((py - ty) / th) * 0.4);
        }
        for (const [i, v] of s.px) s.px.set(i, v * 0.8 + (vnoise((i % CL.w) / 2.5, ((i / CL.w) | 0) / 2, seed + cx * 3 + cy) - 0.5) * 0.7);
        fill(CL, s, P.leaf, { outline: P.leaf[0] });
        for (const [i, v] of s.px) if (v > 0.55 && hash(i, 1, seed) < 0.3) put(CL, i % CL.w, (i / CL.w) | 0, [150, 170, 180], 0.6);
    }
    function crag(L, cx, cy, seed, P) {
        const img = L.base, x = cx * C + 16, gy = cy * C + 30;
        shadow(img, x + 5, gy, 17, 5, 0.5);
        const s = shape(); poly(s, img, [[x - 16, gy], [x - 14, gy - 12], [x - 6, gy - 22], [x + 3, gy - 19], [x + 9, gy - 24], [x + 15, gy - 10], [x + 16, gy]], (px, py) => ((px - x) / 16) * -0.6 + ((py - gy + 16) / 18) * -0.5 + (vnoise(px / 4, py / 4, seed) - 0.5) * 0.6);
        fill(img, s, P.rock.slice(0, 6), { tex: 0.5, seed, outline: P.rock[0] });
        for (const [i, v] of s.px) if (v > 0.4 && vnoise((i % img.w) / 3, ((i / img.w) | 0) / 3, seed + 2) > 0.6) put(img, i % img.w, (i / img.w) | 0, PAL.moss[0]);
    }
    /** A cage of old bars on a flat stone, the door bent outward or a crow on top. */
    function cage(S, cx, gy, seed, { broken = false, crow = false } = {}) {
        shadow(S, cx + 4, gy, 14, 4, 0.5);
        const st = shape(); box(st, S, cx - 13, gy - 5, 26, 5, 0.3); fill(S, st, PALS.featherwatch.rock.slice(2), { tex: 0.4, seed, outline: PALS.featherwatch.rock[0] });
        rectFill(S, cx - 11, gy - 9, 22, 4, PAL.straw[1]);
        for (let i = -11; i <= 11; i += 4) if (!(broken && i > 2)) rectFill(S, cx + i, gy - 32, 1, 27, PAL.iron[i < 0 ? 4 : 3]);
        rectFill(S, cx - 12, gy - 34, 25, 3, PAL.iron[3]); rectFill(S, cx - 12, gy - 7, 25, 2, PAL.iron[2]);
        if (broken) for (let k = 0; k < 3; k++) { const b = shape(); thick(b, S, cx + 4 + k * 4, gy - 7, cx + 12 + k * 5, gy - 30 + k * 2, 0.6); fill(S, b, [PAL.iron[4]], { edge: false }); }
        if (crow) { smallCrow(S, cx - 3, gy - 38); rectFill(S, cx - 4, gy - 36, 3, 1, [230, 226, 210]); }
    }
    function perch(S, cx, gy, seed) {
        shadow(S, cx + 4, gy, 10, 3, 0.45);
        const p = shape(); thick(p, S, cx - 2, gy - 30, cx - 2, gy, 1.8); thick(p, S, cx - 12, gy - 28, cx + 12, gy - 30, 1.6); fill(S, p, RP.plank, { tex: 0.4, seed, outline: RP.plank[0] });
        RK.wheel(S, cx - 12, gy - 28, 4, seed);
        smallCrow(S, cx + 4, gy - 36); smallCrow(S, cx - 9, gy - 34);
        const d = shape(); ellipse(d, S, cx + 8, gy - 2, 5, 2); fill(S, d, PAL.stone.slice(2), { outline: PAL.stone[0] }); rectFill(S, cx + 6, gy - 3, 4, 1, PALS.tollway.water[5]);
    }

    Object.assign(SA.scenes, { tollway, allotment, orchard, featherwatch });
    if (isNode) module.exports = { tollway, allotment, orchard, featherwatch };
})(typeof window !== 'undefined' ? window : globalThis);
