/* =========================================================================
 * Enso's Last Stand — SCENE ART: HRIMVALD, THE NORTH (original, drawn by code; Saffron/Quill)
 * Chapter Two, Act I (docs/design/CHAPTER_TWO_LORE.md §2.1; Tokelo, 2026-11-11: "start building the world for
 * chapter 2"). Two maps, each painted whole like the Chapter One scenes:
 *   'frostspine_pass'  The way north. The last firs of Blackbriar Vale in the west, green going to frost; the road
 *                      climbing east through one gap in grey crags into rock and snow. On the road the funeral
 *                      caravan: a wagon on its side with a wheel in the air, an ash-wood bier with a figure wrapped
 *                      in undyed wool, a second bier tipped empty with its grave goods set upright, a low campfire,
 *                      the raiders' spear with its red wolf rag. Past the gap a log watch post on a stone footing
 *                      with its beacon basket, the travellers' cairn, the old Crown's mile marker pushed over.
 *   'skeldvik'         Skeldvik Harbor. A grey-green fjord between cliffs; a plank wharf with three jetties; two
 *                      clinker-built ships at their moorings (a broad trader, and a narrow one with shields along
 *                      the rail and a red rag at the masthead); a hull half planked on the stocks in Leif's yard;
 *                      cod drying on racks, a market stall under a striped awning, nets hung to mend, the harbour
 *                      bell on its post; turf-roofed longhouses with crossed gable boards and smoke holes, the
 *                      alehouse with its kettle sign; the squat customs stone; the memorial stone with half its
 *                      name board split away. No horned helmets, no dragon heads: a working harbour.
 *
 * Adds these scenes to ENSO.sceneArt (ui/scene-art.js) with its kit and the Overgrown Road's painters (SA.roadKit,
 * so load this file after ui/scene-road.js). The maps' tiles (src/world/chapter2-maps.js) decide collision, exits
 * and where each thing and person stands. No image goes in: every pixel comes from shapes, noise and the palette
 * below (docs/art/ORIGINAL_ART_PLAN.md §0).
 * Review: `node tools/preview-scene.js frostspine_pass out.png 1` (also skeldvik).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (isNode) require('./scene-road.js');
    if (!SA || !SA.roadKit) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, alphaAt, rectFill, shape, sset, ellipse, box, poly, thick, fill, shadow,
        field, barrel, crate, fence, blockOf } = SA.kit;
    const RK = SA.roadKit, RP = RK.RP, tall = RK.tall;
    const pick = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))];
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

    // The North's palette: cold light, grey rock, weathered wood; colour comes from wool (madder red, woad blue).
    const NP = {
        snow: R(['#7388a6', '#899cb6', '#a0b1c7', '#b8c7d8', '#cfdae6', '#e2eaf1', '#f4f8fb']),
        grass: R(['#18241a', '#20301f', '#293b25', '#33472b', '#3f5432', '#4c613a', '#5b6d43', '#6b7a4e']),
        dirt: R(['#272320', '#342e29', '#423a33', '#51473e', '#60554a', '#716557', '#837666']),
        rock: R(['#15171c', '#1f2228', '#2b2f36', '#383d45', '#474d55', '#595f66', '#6e747a', '#868b8f']),
        cliff: R(['#1a1c1f', '#25282b', '#313538', '#3f4346', '#4f5355', '#616566', '#767978', '#8e8f8b']),
        fir: R(['#07110f', '#0b1915', '#10221c', '#162c24', '#1d372c', '#264435', '#31523f', '#3f624b', '#507458']),
        water: R(['#0a1922', '#0d222d', '#122c39', '#183746', '#1f4455', '#295366', '#3a687a', '#588594']),
        foam: R(['#8fb1bd', '#b9d2d9', '#dfeef0']),
        turf: R(['#22301a', '#2d3e1f', '#3a4e25', '#48602c', '#587334', '#6b873d', '#819b4a']),
        plank: R(['#1c1713', '#28211b', '#352c24', '#44392e', '#54473a', '#665747', '#796956', '#8d7c67']),
        oak: R(['#1e130b', '#2c1c10', '#3c2716', '#4d331c', '#5f4024', '#724e2c', '#865d36']),
        shingle: R(['#33373c', '#43474b', '#55595b', '#686b6a', '#7d7e79', '#939288']),
        wool: R(['#5a5346', '#756c5a', '#91876f', '#ab9f85', '#c5b99c', '#dcd1b4']),
        madder: R(['#2e0b0b', '#4c1210', '#6e1c16', '#8f2a1e', '#ad3c2a', '#c75a3e']),
        woad: R(['#12202e', '#1a3044', '#24435c', '#305875', '#43708f']),
        bronze: R(['#1f2a22', '#2e4436', '#3f6650', '#5a8a6c', '#8ab08e']),
        glow: RP.glow, shadow: [6, 10, 16]
    };

    const layersFor = (map) => { const w = map.tiles[0].length * C, h = map.tiles.length * C; return { base: Img(w, h), over: Img(w, h), scratch: Img(w, h) }; };
    const edgeShade = (img, w = 14, a = 0.3) => {
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const d = Math.min(x, y, img.w - 1 - x, img.h - 1 - y); if (d < w) put(img, x, y, NP.shadow, (1 - d / w) * a); }
    };

    // ---------------------------------------------------------------------
    // Shared painters
    // ---------------------------------------------------------------------
    /** Deep inside a rock mass (rock on every side, or the map edge): there it is a plateau with the odd big peak,
     *  so a wall reads as one cliff and not a row of the same tooth. */
    const innerFn = (map, nameAt) => (x, y, name) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]].every(([dx, dy]) => { const n = nameAt(map, x + dx, y + dy); return n === name || n === null; });
    /** One cell of a rock wall: a jagged mass with strata, capped with snow (the pass) or turf (the fjord). Cells
     *  are painted back to front, so a run of them reads as one cliff. `front`: open ground lies below it. */
    function cragCell(L, cx, cy, seed, ramp, cap, capDepth, front, overhead, big = 1) {
        const x0 = cx * C - (big - 1) * 16, base = (cy + 1) * C + (front ? 3 : 0), CW = C * big;
        const h = ((front ? 40 : 30) + hash(cx, cy, seed) * 14) * (big > 1 ? 1.45 : 1);
        const j = (n) => (hash(cx * 3 + n, cy, seed + 2) - 0.5) * 8;
        tall(L, [x0 - 10, base - h - 8, x0 + CW + 10, base + 2], cy * C, overhead, (S) => {
            const s = shape();
            poly(s, S, [[x0 - 6, base], [x0 - 4 + j(1), base - h * 0.5], [x0 + CW * 0.16 + j(2), base - h * 0.86], [x0 + CW * 0.4 + j(3), base - h], [x0 + CW * 0.7 + j(4), base - h * 0.8],
                [x0 + CW + 3 + j(5), base - h * 0.52], [x0 + CW + 6, base]],
            (px, py) => ((px - x0 - CW / 2) / (CW * 0.7)) * -0.5 + ((py - base + h) / h) * -0.55 + (vnoise(px / 6, py / 3, seed + cx * 7 + cy * 3) - 0.5) * 0.75);
            fill(S, s, ramp, { outline: ramp[0] });
            const top = new Map();
            for (const [i] of s.px) { const px = i % S.w, py = (i / S.w) | 0; if (!top.has(px) || py < top.get(px)) top.set(px, py); }
            for (const [i, v] of s.px) {
                const px = i % S.w, py = (i / S.w) | 0, d = py - top.get(px);
                if ((py + Math.floor(vnoise(px / 11, cy, seed) * 5)) % 7 === 0 && hash(px >> 1, py, seed) < 0.55) put(S, px, py, ramp[1], 0.55);   // strata
                if (hash(px >> 2, py >> 3, seed + 9) < 0.04) put(S, px, py, ramp[0], 0.7);                                                      // cracks
                if (capDepth > 0 && d < capDepth + vnoise(px / 5, cy * 3, seed + 4) * capDepth) put(S, px, py, pick(cap, 0.45 + v * 0.3 + (d < 2 ? 0.3 : 0) + hash(px, py, seed) * 0.12));
            }
            if (front) for (let px = x0 - 4; px < x0 + CW + 4; px++) for (let k = 0; k < 4; k++) if (s.px.has((base - 1 - k) * S.w + px)) put(S, px, base - 1 - k, NP.shadow, 0.35 - k * 0.07);
        });
    }
    /** A fir: a straight trunk and tiers of drooping boughs; `snow` 0-1 loads the boughs with it. */
    function fir(L, cx, cy, seed, overhead, snow) {
        const x = cx * C + 16 + (hash(cx, cy, seed) - 0.5) * 6, gy = cy * C + 30, h = 42 + hash(cx, cy, seed + 1) * 16, w = 13 + hash(cx, cy, seed + 2) * 4;
        shadow(L.base, x + 6, gy, w * 0.8, 5, 0.42);
        const tr = shape(); thick(tr, L.base, x, gy - 10, x, gy, 2.4); fill(L.base, tr, NP.oak.slice(0, 4), { outline: NP.oak[0] });
        const CL = overhead ? L.over : L.base, s = shape(), tiers = 4;
        for (let t = 0; t < tiers; t++) {
            const ty = gy - 8 - (t / tiers) * h, tw = w * (1 - t / (tiers + 0.6)), th = h / tiers + 8;
            poly(s, CL, [[x, ty - th], [x + tw, ty], [x + tw * 0.55, ty - 2], [x, ty + 1], [x - tw * 0.55, ty - 2], [x - tw, ty]], (px, py) => ((px - x) / tw) * -0.5 + ((py - ty) / th) * 0.4);
        }
        for (const [i, v] of s.px) s.px.set(i, v * 0.8 + (vnoise((i % CL.w) / 2.5, ((i / CL.w) | 0) / 2, seed + cx * 3 + cy) - 0.5) * 0.7);
        fill(CL, s, NP.fir, { outline: NP.fir[0] });
        for (const [i, v] of s.px) {
            const px = i % CL.w, py = (i / CL.w) | 0;
            if (v > 0.25 - snow * 0.5 && hash(i, 1, seed) < 0.12 + snow * 0.6) put(CL, px, py, pick(NP.snow, 0.55 + v * 0.4), 0.5 + snow * 0.5);
        }
    }
    /** A boulder in the North's grey, with a cap of snow or moss. */
    function stone(img, x, y, rx, ry, seed, ramp, cap, capAmt) {
        shadow(img, x + 3, y + ry * 0.6, rx + 2, ry * 0.5, 0.35);
        const s = shape(); ellipse(s, img, x, y, rx, ry);
        for (const [i, v] of s.px) s.px.set(i, v * 0.85 + (vnoise((i % img.w) / 2.5, ((i / img.w) | 0) / 2.5, seed) - 0.5) * 0.5);
        fill(img, s, ramp.slice(1), { outline: ramp[0] });
        for (const [i, v] of s.px) {
            const px = i % img.w, py = (i / img.w) | 0;
            if (hash(px >> 2, py >> 2, seed + 3) < 0.08) put(img, px, py, ramp[1]);
            if (py < y - ry * (0.55 - capAmt * 0.6) + vnoise(px / 3, 0, seed) * 2 && v > -0.3) put(img, px, py, pick(cap, 0.5 + v * 0.45));
        }
    }
    /** A fire on the ground: a ring of stones, crossed logs, flame. Returns where the flame is (for animate). */
    function fire(S, cx, gy, seed) {
        for (let yy = -24; yy <= 24; yy++) for (let xx = -30; xx <= 30; xx++) { const d = Math.hypot(xx / 1.25, yy); if (d < 24) put(S, cx + xx, gy - 4 + yy, NP.glow[3], (1 - d / 24) * 0.2); }
        const ash = shape(); ellipse(ash, S, cx, gy - 2, 10, 4.5); fill(S, ash, NP.rock.slice(0, 3), { tex: 0.6, seed, edge: false });
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, st = shape(); ellipse(st, S, cx + Math.cos(a) * 11, gy - 2 + Math.sin(a) * 5, 3.2, 2.4); fill(S, st, NP.rock.slice(2), { tex: 0.4, seed: seed + k, outline: NP.rock[0] }); }
        for (const [a, b] of [[-7, 3], [7, -3]]) { const l = shape(); thick(l, S, cx + a, gy - 1, cx + b, gy - 6, 2); fill(S, l, NP.oak, { outline: NP.oak[0] }); }
        const f = shape(); ellipse(f, S, cx, gy - 8, 4.5, 6.5); fill(S, f, NP.glow.slice(1), { edge: false });
        const f2 = shape(); ellipse(f2, S, cx, gy - 6, 2.4, 3.6); fill(S, f2, NP.glow.slice(3), { edge: false });
        return { x: cx, y: gy - 8, big: true };
    }
    function animator(flames, smoke) {
        return function animate(g, time) {
            for (let k = 0; k < flames.length; k++) {
                const f = flames[k], a = Math.sin(time / 90 + k * 2.1), b = Math.sin(time / 57 + k);
                if (f.big) {
                    g.fillStyle = 'rgba(255, 220, 120, 0.85)'; g.fillRect(f.x - 2 + (a > 0.3 ? 1 : 0), f.y - 5 - (b > 0 ? 2 : 0), 3, 5);
                    g.fillStyle = 'rgba(255, 130, 40, 0.65)'; g.fillRect(f.x - 3 + (b > 0.5 ? 1 : 0), f.y, 6, 4);
                    if (a > 0.6) { g.fillStyle = 'rgba(255, 200, 90, 0.9)'; g.fillRect(f.x + (b > 0 ? 3 : -4), f.y - 10 - ((time / 40) % 6 | 0), 1, 1); }
                } else { g.fillStyle = `rgba(255, 220, 130, ${(0.35 + 0.25 * a).toFixed(3)})`; g.fillRect(f.x - 2, f.y - 2, 4, 4); }
            }
            for (let k = 0; k < smoke.length; k++) {
                const c = smoke[k];
                for (let p = 0; p < 5; p++) {
                    const t = ((time / 60 + p * 20 + k * 13) % 100) / 100, r = 2 + t * 5, x = c.x + t * 14 + Math.sin(time / 700 + p) * 3, y = c.y - t * 44;
                    g.fillStyle = `rgba(206, 208, 206, ${(0.22 * (1 - t)).toFixed(3)})`;
                    g.fillRect(Math.round(x - r), Math.round(y - r * 0.7), Math.round(r * 2), Math.round(r * 1.4));
                }
            }
        };
    }

    // ---------------------------------------------------------------------
    // Frostspine Pass
    // ---------------------------------------------------------------------
    function frostspinePass(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 911, img = L.base;
        const ROADY = { road: 1, caravan: 0.6, bier: 0.5, wolf_banner: 0.8, campfire: 0.35, crate: 0.3 };
        const roadC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) roadC[y * cw + x] = ROADY[nameAt(map, x, y)] || 0;
        const road = field(roadC, cw, ch);
        // How much snow lies here: none under the Vale's last firs, everything white by the top of the pass.
        const snowAt = (x, y) => sstep(0.22, 0.7, x / img.w + (0.5 - y / img.h) * 0.12);
        const kind = new Uint8Array(img.w * img.h);               // 0 grass, 1 road, 4 snow, 5 bare rock
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cell = nameAt(map, Math.floor(x / C), Math.floor(y / C)), s = snowAt(x, y);
            const n1 = fbm(x / 24, y / 24, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            const white = n1 * 0.75 + n2 * 0.25 < s * 1.15 - 0.08;
            if (cell === 'crag') {
                kind[i] = 5;
                put(img, x, y, white && fbm(x / 11, y / 11, seed + 20) > 0.4 ? pick(NP.snow, 0.25 + fbm(x / 30, y / 14, seed + 3) * 0.6) : pick(NP.rock, 0.12 + n1 * 0.35 + hash(x, y, seed) * 0.08));
                continue;
            }
            if (road(x, y) + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.12 > 0.5) {
                kind[i] = 1;
                let t = fbm(x / 10, y / 10, seed + 7) * 0.55 + hash(x, y, seed + 8) * 0.3 + 0.1;
                if (Math.abs(((y + Math.sin(x / 40) * 3) % 32) - 12) < 1.2 || Math.abs(((y + Math.sin(x / 40) * 3) % 32) - 21) < 1.2) t -= 0.14;   // wheel ruts
                put(img, x, y, pick(NP.dirt, t));
                if (s > 0.25 && vnoise(x / 4, y / 2.5, seed + 9) > 1.05 - s * 0.5) put(img, x, y, pick(NP.snow, 0.35 + n2 * 0.4), 0.85);      // snow lying in the ruts
                continue;
            }
            if (white) {
                kind[i] = 4;
                const t = 0.5 + (fbm(x / 34, y / 16, seed + 3) - 0.5) * 0.9 + (n2 - 0.5) * 0.12 + (cell === 'fir' ? -0.2 : 0);
                put(img, x, y, pick(NP.snow, t));
            } else {
                let t = fbm(x / 34, y / 34, seed + 3) * 0.45 + vnoise(x / 4, y / 4, seed + 4) * 0.4 + hash(x, y, seed + 5) * 0.2;
                if (cell === 'fir') t *= 0.55;                     // needles and shade under the trees
                put(img, x, y, pick(NP.grass, t));
                if (s > 0.05 && hash(x, y, seed + 6) < s * 0.5) put(img, x, y, NP.snow[4], 0.55);   // frost on the grass
            }
        }
        // Edges: a blue shadow where snow meets grass or road, a dark rim on the road.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 4 && (kind[i + img.w] === 0 || kind[i + img.w] === 1 || kind[i + 1] === 0 || kind[i + 1] === 1)) put(img, x, y, NP.snow[0], 0.7);
            else if (k === 4 && (kind[i - img.w] !== 4 || kind[i - 1] !== 4)) put(img, x, y, NP.snow[6], 0.8);
            else if (k === 1 && (kind[i - img.w] === 0 || kind[i + img.w] === 0)) put(img, x, y, NP.dirt[0], 0.5);
        }
        // Small things: tufts in the grass, dry stalks and hollows in the snow, stones on the road.
        for (let n = 0; n < (img.w * img.h) / 34; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 && r < 0.6) { const h = 2 + Math.floor(hash(n, 10, seed) * 4); for (let j = 0; j < h; j++) put(img, x + (j === h - 1 ? 1 : 0), y - j, NP.grass[j === h - 1 ? 7 : 5]); put(img, x, y + 1, NP.grass[1]); }
            else if (k === 4 && r < 0.12) { for (let j = 0; j < 4; j++) put(img, x + (j > 2 ? 1 : 0), y - j, [150, 132, 92]); put(img, x + 1, y + 1, NP.snow[1]); }
            else if (k === 4 && r < 0.3) { put(img, x, y, NP.snow[2]); put(img, x + 1, y, NP.snow[1]); put(img, x, y - 1, NP.snow[6]); }
            else if (k === 1 && r < 0.35) { put(img, x, y, NP.rock[6]); put(img, x + 1, y, NP.rock[5]); put(img, x, y + 1, NP.dirt[0]); }
        }
        const OPEN = new Set(['ground', 'road']), open = (x, y) => OPEN.has(nameAt(map, x, y));
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const snowCell = (x, y) => snowAt(x * C + 16, y * C + 16);
        const inner = innerFn(map, nameAt);
        const items = [], seen = new Set(), flames = [], smoke = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 28, s = snowCell(x, y), k = `${x},${y}`;
            if (n === 'caravan') { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set(['caravan']), seen); items.push({ x, y: b.y1 + 0.7, draw: () => caravan(L, b, seed, true) }); continue; }
            if (n === 'bier') { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set(['bier']), seen); items.push({ x, y: b.y1 + 0.4, draw: () => bier(L, b, seed + x, b.x1 > b.x0) }); continue; }
            if (n === 'watch_post') { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set(['watch_post']), seen); items.push({ x, y: b.y1 + 0.9, draw: () => watchPost(L, b, seed, behind(b.x0, b.y0) || behind(b.x1, b.y0)) }); continue; }
            const P2 = {
                crag: () => { const inn = inner(x, y, 'crag'); if (inn && hash(x, y, seed + 31) > 0.22) return; cragCell(L, x, y, seed, NP.rock, NP.snow, 2 + s * 9, open(x, y + 1), open(x, y - 1), inn ? 2 : 1); },
                fir: () => fir(L, x, y, seed, behind(x, y), s),
                rock: () => { stone(img, cx - 3, gy - 8, 10, 8, seed + x * 3 + y, NP.rock, NP.snow, s); stone(img, cx + 9, gy - 3, 5, 4, seed + x + y * 5, NP.rock, NP.snow, s); },
                campfire: () => tall(L, [cx - 32, gy - 40, cx + 32, gy + 22], y * C, false, (S) => { flames.push(fire(S, cx, gy - 2, seed)); smoke.push({ x: cx, y: gy - 16 }); }),
                crate: () => crate(L, cx, gy, seed + x),
                log: () => { shadow(img, cx + 3, gy, 15, 4, 0.4); const l = shape(); box(l, img, cx - 13, gy - 10, 26, 10, 0); for (const [i] of l.px) { const py = (i / img.w) | 0; l.px.set(i, ((py - gy + 5) / 5) * -0.8 + (vnoise((i % img.w) / 8, py / 1.5, seed) - 0.5) * 0.4); } fill(img, l, NP.oak, { outline: NP.oak[0] }); for (const ex of [cx - 13, cx + 13]) { const e = shape(); ellipse(e, img, ex, gy - 5, 3.5, 5); fill(img, e, PAL.straw, { edge: false, outline: NP.oak[0] }); } },
                wolf_banner: () => tall(L, [cx - 20, gy - 66, cx + 24, gy + 6], y * C, open(x, y - 1), (S) => wolfBanner(S, cx, gy, seed)),
                cairn: () => tall(L, [cx - 20, gy - 40, cx + 20, gy + 6], y * C, open(x, y - 1), (S) => cairn(S, cx, gy, seed, s)),
                mile_marker: () => mileMarker(img, cx, gy, seed, s)
            }[n];
            if (P2) items.push({ x, y: y + (n === 'fir' ? 0.8 : n === 'crag' ? 0.95 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, 16, 0.32);
        // Cold light from the north-east, bluer toward the top of the pass.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) put(img, x, y, [150, 180, 225], 0.04 + 0.05 * (x / img.w));
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** The funeral wagon on its side: the bed a wall of boards, one wheel in the air, the tilt cloth spilled out. */
    function caravan(L, b, seed, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 3, W = X1 - X0;
        tall(L, [X0 - 22, B - 62, X1 + 14, B + 10], b.y0 * C, overhead, (S) => {
            shadow(S, X0 + W / 2 + 4, B + 2, W / 2 + 10, 7, 0.5);
            // The tilt: undyed wool cloth dragged off its hoops, lying to the left.
            const cl = shape(); poly(cl, S, [[X0 - 18, B + 2], [X0 - 10, B - 12], [X0 + 10, B - 20], [X0 + 26, B - 8], [X0 + 20, B + 4]], (px, py) => ((px - X0) / 30) * -0.5 + Math.sin(px / 4 + py / 3) * 0.25);
            fill(S, cl, NP.wool, { tex: 0.3, seed, outline: NP.wool[0] });
            RK.planks(S, X0 + 8, B - 28, W - 16, 26, seed + 3, NP.oak, false);
            for (let px = X0 + 8; px < X1 - 8; px++) { put(S, px, B - 28, NP.oak[6]); put(S, px, B - 27, NP.oak[4]); put(S, px, B - 2, NP.oak[0]); }
            for (const px of [X0 + 8, X0 + W / 2 - 2, X1 - 12]) { const p = shape(); box(p, S, px, B - 30, 4, 29, 0.1); fill(S, p, NP.oak.slice(1), { tex: 0.3, seed: seed + px, outline: NP.oak[0] }); }
            // Two hoops of the tilt frame, bent; the axle and a wheel standing up in the air.
            for (const px of [X0 + 30, X0 + 58]) { const hp = shape(); for (let a = 0; a <= 32; a++) { const t = (a / 32) * Math.PI; sset(hp, S, px + Math.cos(t) * 12, B - 28 - Math.sin(t) * 9, 0.2); sset(hp, S, px + Math.cos(t) * 12, B - 29 - Math.sin(t) * 9, 0.5); } fill(S, hp, NP.oak.slice(2), { edge: false }); }
            const ax = shape(); thick(ax, S, X1 - 26, B - 26, X1 - 22, B - 44, 1.6); fill(S, ax, PAL.iron, { outline: PAL.iron[0] });
            RK.wheel(S, X1 - 22, B - 48, 12, seed + 5);
            RK.wheel(S, X0 + 22, B - 8, 11, seed + 6);
            // What it carried: a loom frame, a wheel of cheese, a bundle of birch twigs tied with red thread.
            const lm = shape(); for (const [x1, y1, x2, y2] of [[X1 - 2, B - 22, X1 + 8, B + 2], [X1 + 6, B - 24, X1 + 12, B], [X1 - 1, B - 14, X1 + 10, B - 16]]) thick(lm, S, x1, y1, x2, y2, 1.1); fill(S, lm, NP.plank.slice(3), { outline: NP.plank[0] });
            const chz = shape(); ellipse(chz, S, X0 + 44, B + 3, 5, 3); fill(S, chz, R(['#8a6a22', '#b8923a', '#dcc060']), { outline: [60, 44, 14] });
            for (let k = 0; k < 7; k++) { const t = shape(); thick(t, S, X0 + 60 + k, B + 5, X0 + 74 + k * 1.5, B - 2 - k, 0.5); fill(S, t, [[196, 190, 178]], { edge: false }); }
            rectFill(S, X0 + 64, B + 1, 3, 4, NP.madder[4]);
        });
    }
    /** A bier of ash wood. `laid`: the long one, a figure wrapped in undyed wool, her hands over the oak tablet.
     *  Otherwise the second, tipped empty, with a shuttle, an antler comb and a cup stood upright beside it. */
    function bier(L, b, seed, laid) {
        const img = L.base, X0 = b.x0 * C + 3, X1 = (b.x1 + 1) * C - 3, gy = (b.y1 + 1) * C - 6;
        shadow(img, (X0 + X1) / 2 + 3, gy + 2, (X1 - X0) / 2 + 2, 5, 0.45);
        if (laid) {
            for (const px of [X0 + 6, X1 - 8]) rectFill(img, px, gy - 4, 3, 6, NP.plank[1]);
            const bd = shape(); box(bd, img, X0, gy - 12, X1 - X0, 9, 0.1); fill(img, bd, NP.plank.slice(2), { tex: 0.4, seed, outline: NP.plank[0] });
            for (let px = X0; px < X1; px++) put(img, px, gy - 12, NP.plank[7]);
            const fg = shape(); ellipse(fg, img, (X0 + X1) / 2 + 2, gy - 16, (X1 - X0) / 2 - 8, 6); ellipse(fg, img, X0 + 11, gy - 17, 6, 5.5);
            for (const [i, v] of fg.px) fg.px.set(i, v * 0.8 + Math.sin((i % img.w) / 3.5) * 0.18);
            fill(img, fg, NP.wool, { outline: NP.wool[0] });
            for (let px = X0 + 18; px < X1 - 6; px += 9) for (let j = -5; j <= 4; j++) put(img, px + (j & 1), gy - 16 + j, NP.wool[1], 0.7);   // the binding cords
            rectFill(img, (X0 + X1) / 2 - 5, gy - 21, 11, 6, NP.oak[4]); rectFill(img, (X0 + X1) / 2 - 5, gy - 21, 11, 1, NP.oak[6]);          // the tablet
            for (let k = 0; k < 3; k++) rectFill(img, (X0 + X1) / 2 - 3, gy - 19 + k * 2, 7, 1, NP.oak[1]);
        } else {
            const bd = shape(); poly(bd, img, [[X0, gy - 2], [X0 + 4, gy - 16], [X1 - 4, gy - 20], [X1, gy - 5]], (px, py) => ((py - gy + 10) / 10) * -0.5); fill(img, bd, NP.plank.slice(2), { tex: 0.4, seed, outline: NP.plank[0] });
            for (let px = X0 + 4; px < X1 - 2; px += 5) for (let j = 0; j < 12; j++) put(img, px, gy - 16 + j, NP.plank[1], 0.5);
            const cup = shape(); box(cup, img, X0 + 3, gy - 2, 4, 5, 0); fill(img, cup, NP.oak.slice(3), { outline: NP.oak[0] });
            rectFill(img, X0 + 10, gy + 1, 8, 2, [214, 204, 178]); for (let k = 0; k < 4; k++) put(img, X0 + 11 + k * 2, gy + 3, [214, 204, 178]);   // antler comb
            const sh = shape(); ellipse(sh, img, X0 + 23, gy + 2, 4, 1.6); fill(img, sh, NP.oak.slice(4), { outline: NP.oak[0] });                    // her shuttle
        }
    }
    /** The raiders' mark: a spear driven into the road, a strip of red cloth under the head with a running wolf. */
    function wolfBanner(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 7, 2.5, 0.4);
        const p = shape(); thick(p, S, cx, gy - 58, cx, gy, 1.4); fill(S, p, NP.plank.slice(2), { outline: NP.plank[0] });
        const hd = shape(); poly(hd, S, [[cx, gy - 66], [cx + 3, gy - 58], [cx, gy - 55], [cx - 3, gy - 58]], 0.4); fill(S, hd, PAL.iron.slice(2), { outline: PAL.iron[0] });
        const fl = shape(); poly(fl, S, [[cx + 1, gy - 54], [cx + 20, gy - 52], [cx + 22, gy - 38], [cx + 15, gy - 41], [cx + 9, gy - 34], [cx + 1, gy - 37]], (px, py) => ((px - cx) / 22) * -0.6 + Math.sin(px / 3) * 0.2);
        fill(S, fl, NP.madder, { tex: 0.3, seed, outline: [26, 8, 8] });
        // The wolf, in grey thread: body, head, ears, legs at a run, tail out behind.
        const wc = [176, 178, 180];
        rectFill(S, cx + 6, gy - 47, 9, 3, wc); rectFill(S, cx + 14, gy - 49, 4, 3, wc); put(S, cx + 18, gy - 48, wc); put(S, cx + 15, gy - 50, wc); put(S, cx + 17, gy - 50, wc);
        put(S, cx + 5, gy - 48, wc); put(S, cx + 4, gy - 49, wc); put(S, cx + 6, gy - 44, wc); put(S, cx + 5, gy - 43, wc); put(S, cx + 13, gy - 44, wc); put(S, cx + 15, gy - 43, wc); put(S, cx + 9, gy - 44, wc);
    }
    /** The travellers' cairn: a stone from everyone who has crossed. */
    function cairn(S, cx, gy, seed, snow) {
        shadow(S, cx + 4, gy + 1, 15, 4, 0.45);
        let n = 0;
        for (let row = 0; row < 5; row++) for (let k = 0; k < 5 - row; k++) {
            const st = shape(), sx = cx - (5 - row) * 3.4 + k * 6.8 + 3.4 + (hash(row, k, seed) - 0.5) * 2, sy = gy - 3 - row * 6;
            ellipse(st, S, sx, sy, 4.2 - row * 0.2, 3.4); fill(S, st, NP.rock.slice(2), { tex: 0.4, seed: seed + (n++), outline: NP.rock[0] });
            if (snow > 0.3 && hash(row, k, seed + 3) < snow) { put(S, sx - 1, sy - 3, NP.snow[6]); put(S, sx, sy - 3, NP.snow[5]); put(S, sx + 1, sy - 3, NP.snow[6]); put(S, sx, sy - 4, NP.snow[6]); }
        }
    }
    /** The old Crown's mile marker, pushed over: a squared stone lying across the verge, a winter notch for each year. */
    function mileMarker(img, cx, gy, seed, snow) {
        shadow(img, cx + 2, gy + 2, 20, 5, 0.45);
        const ft = shape(); box(ft, img, cx - 16, gy - 8, 9, 9, 0); fill(img, ft, NP.rock.slice(2), { tex: 0.4, seed, outline: NP.rock[0] });   // the stump it broke from
        const s = shape(); poly(s, img, [[cx - 8, gy - 2], [cx - 5, gy - 13], [cx + 20, gy - 19], [cx + 23, gy - 8]], (px, py) => ((py - gy + 10) / 10) * -0.5 + (vnoise(px / 4, py / 4, seed) - 0.5) * 0.4);
        fill(img, s, NP.rock.slice(3), { outline: NP.rock[0] });
        for (let k = 0; k < 9; k++) put(img, cx - 2 + k * 2.4, gy - 15 - k * 0.55, NP.rock[1]);                        // the notches along the edge
        for (const [dx, dy, w] of [[4, -9, 1], [7, -10, 1], [10, -11, 1], [13, -11, 3]]) rectFill(img, cx + dx, gy + dy, w, 4, NP.rock[1]);   // the number, still sharp
        if (snow > 0.2) for (const [i] of s.px) { const px = i % img.w, py = (i / img.w) | 0; if (!s.px.has(i - img.w) && hash(px, 1, seed) < snow) { put(img, px, py, NP.snow[6]); put(img, px, py - 1, NP.snow[5]); } }
    }
    /** The watch post: a stone footing, walls of laid logs, the roof gone, a beacon basket on its pole. */
    function watchPost(L, b, seed, overhead) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 2, W = X1 - X0, top = b.y0 * C - 14;
        tall(L, [X0 - 8, top - 44, X1 + 10, B + 8], b.y0 * C + 6, overhead, (S) => {
            shadow(S, X0 + W / 2 + 6, B + 2, W / 2 + 6, 6, 0.5);
            RK.blocks(S, X0, B - 16, W, 16, seed, NP.rock);
            for (let px = X0; px < X1; px++) { put(S, px, B - 16, NP.rock[7]); put(S, px, B - 1, NP.rock[0]); }
            for (let ly = top; ly < B - 16; ly += 7) {                // courses of logs, ends sticking out at the corners
                const lg = shape(); box(lg, S, X0 + 2, ly, W - 4, 7, 0);
                for (const [i] of lg.px) { const py = (i / S.w) | 0; lg.px.set(i, ((py - ly - 3) / 3.5) * -0.8 + (vnoise((i % S.w) / 9, py / 1.5, seed + ly) - 0.5) * 0.4); }
                fill(S, lg, NP.oak, { outline: NP.oak[0] });
                for (const ex of [X0, X1 - 4]) { const e = shape(); ellipse(e, S, ex + 2, ly + 3.5, 3, 3.4); fill(S, e, PAL.straw, { edge: false, outline: NP.oak[0] }); }
            }
            rectFill(S, X0 + W / 2 - 7, B - 34, 14, 18, [12, 10, 10]); rectFill(S, X0 + W / 2 - 8, B - 36, 16, 3, NP.oak[5]);            // the doorway, dark
            rectFill(S, X0 + 14, top + 10, 8, 5, [12, 10, 10]); rectFill(S, X1 - 22, top + 10, 8, 5, [12, 10, 10]);                    // slits
            for (const [x1, x2] of [[X0 + 4, X0 + 22], [X1 - 6, X1 - 30]]) { const r = shape(); thick(r, S, x1, top + 2, x2, top - 14, 1.5); fill(S, r, NP.oak.slice(1), { outline: NP.oak[0] }); }   // broken rafters
            for (let px = X0 + 2; px < X1 - 2; px++) if (hash(px, 3, seed) < 0.8) { put(S, px, top - 1, NP.snow[6]); put(S, px, top, NP.snow[5]); if (hash(px, 4, seed) < 0.4) put(S, px, top - 2, NP.snow[6]); }
            // The beacon: an iron basket on a pole, pitch still in it, never lit.
            const bx = X1 - 12, by = top - 30;
            const pl = shape(); thick(pl, S, bx, top + 4, bx, by + 6, 1.4); fill(S, pl, NP.oak.slice(1), { outline: NP.oak[0] });
            const bk = shape(); poly(bk, S, [[bx - 6, by], [bx + 6, by], [bx + 4, by + 8], [bx - 4, by + 8]], 0); fill(S, bk, PAL.iron, { outline: PAL.iron[0] });
            for (let k = -4; k <= 4; k += 2) for (let j = 1; j < 7; j++) put(S, bx + k, by + j, [10, 9, 9]);
            rectFill(S, bx - 4, by - 2, 9, 2, [22, 18, 16]); put(S, bx - 2, by - 3, NP.snow[6]); put(S, bx + 1, by - 3, NP.snow[6]);
        });
    }

    // ---------------------------------------------------------------------
    // Skeldvik Harbor
    // ---------------------------------------------------------------------
    function skeldvik(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 947, img = L.base;
        // Which cells are plank wharf: the wharf itself, the jetties, and whatever stands in a run of wharf.
        const WH = new Set(['wharf', 'jetty']), ONWHARF = new Set(['fish_rack', 'stall', 'nets', 'barrel', 'crate', 'harbour_bell']);
        const plankCell = new Uint8Array(cw * ch);
        for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) if (WH.has(nameAt(map, x, y))) plankCell[y * cw + x] = 1;
            for (let pass = 0; pass < 2; pass++) for (let i = 0; i < cw; i++) { const x = pass ? cw - 1 - i : i; if (ONWHARF.has(nameAt(map, x, y)) && (plankCell[y * cw + x - 1] || plankCell[y * cw + x + 1]) && nameAt(map, x, y - 1) === 'wharf') plankCell[y * cw + x] = 1; }
        }
        const isPlank = (x, y) => x >= 0 && y >= 0 && x < cw && y < ch && !!plankCell[y * cw + x];
        const DIRTY = { road: 1, turf_house: 0.35, alehouse: 0.4, memorial_stone: 0.5, customs_stone: 0.5, shipyard: 0.75 };
        const dirtC = new Float32Array(cw * ch), wetC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            dirtC[y * cw + x] = DIRTY[n] || 0;
            wetC[y * cw + x] = n === 'water' || n === 'longship' || n === 'jetty' || (n === 'rowboat' && nameAt(map, x, y - 1) === 'water') ? 1 : isPlank(x, y) ? (isPlank(x, y - 1) ? 0.3 : 0.75) : 0;
        }
        const dirt = field(dirtC, cw, ch), wet = field(wetC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);               // 0 grass, 1 road, 2 shingle, 3 water, 5 rock
        const shoreY = 7 * C;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cell = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            const n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2), w = wet(x, y) + (n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.08;
            if (cell === 'cliff') { kind[i] = 5; put(img, x, y, n1 * 0.7 + n2 * 0.3 > 0.42 ? pick(NP.turf, 0.1 + n1 * 0.5 + hash(x, y, seed) * 0.1) : pick(NP.cliff, 0.12 + n1 * 0.35 + hash(x, y, seed) * 0.08)); continue; }
            if (w > 0.5) {
                kind[i] = 3;
                let t = 0.12 + (y / shoreY) * 0.42 + (fbm(x / 40, y / 9, seed + 12) - 0.5) * 0.4;
                if (vnoise(x / 9, y / 1.8, seed + 13) > 0.8) t += 0.14;
                put(img, x, y, pick(NP.water, t));
            } else if (w > 0.3) {
                kind[i] = 2;
                put(img, x, y, pick(NP.shingle, 0.15 + vnoise(x / 2, y / 2, seed + 14) * 0.6 + hash(x, y, seed) * 0.25));
            } else if (dirt(x, y) + (n1 - 0.5) * 0.42 + (n2 - 0.5) * 0.1 > 0.5) {
                kind[i] = 1;
                put(img, x, y, pick(NP.dirt, fbm(x / 10, y / 10, seed + 7) * 0.55 + hash(x, y, seed + 8) * 0.35 + 0.1));
            } else {
                let t = fbm(x / 34, y / 34, seed + 3) * 0.5 + vnoise(x / 4, y / 4, seed + 4) * 0.38 + hash(x, y, seed + 5) * 0.2;
                if (cell === 'fir') t *= 0.6;
                put(img, x, y, pick(NP.grass, t + 0.06));
            }
        }
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 3 && (kind[i + img.w] === 2 || kind[i + 1] === 2 || kind[i - 1] === 2)) put(img, x, y, NP.foam[1 + ((x + y) & 1)], 0.75);
            else if (k === 2 && kind[i - img.w] === 3) put(img, x, y, NP.shingle[0], 0.8);
            else if (k === 1 && (kind[i - img.w] === 0 || kind[i + img.w] === 0)) put(img, x, y, NP.dirt[0], 0.5);
            else if (k === 0 && (kind[i + img.w] === 1 || kind[i + 1] === 1)) put(img, x, y, NP.grass[0], 0.5);
        }
        for (let n = 0; n < (img.w * img.h) / 30; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 && r < 0.65) { const h = 2 + Math.floor(hash(n, 10, seed) * 4); for (let j = 0; j < h; j++) put(img, x + (j === h - 1 ? 1 : 0), y - j, NP.grass[j === h - 1 ? 7 : 5]); put(img, x, y + 1, NP.grass[1]); }
            else if (k === 0 && r < 0.71) { const c = [[232, 228, 214], [200, 170, 220], [240, 214, 120]][n % 3]; put(img, x, y, c); put(img, x + 1, y + 1, c); }   // sea pinks, heather
            else if (k === 2 && r < 0.3) { const p = shape(); ellipse(p, img, x, y, 2 + hash(n, 1, seed) * 2, 1.5); fill(img, p, NP.shingle.slice(2), { outline: NP.shingle[0] }); }
            else if (k === 2 && r < 0.36) { for (let j = 0; j < 6; j++) put(img, x + j, y + Math.round(Math.sin(j) * 1), [58, 70, 40]); }                             // wrack on the tideline
            else if (k === 1 && r < 0.3) { put(img, x, y, NP.rock[6]); put(img, x + 1, y, NP.rock[5]); put(img, x, y + 1, NP.dirt[0]); }
        }
        // The wharf and the jetties: planks on piles, laid over the shore.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (isPlank(x, y)) {
            const jetty = nameAt(map, x, y) === 'jetty', X0 = x * C, Y0 = y * C;
            if (jetty) {
                for (let j = 0; j < C + 6; j++) for (const px of [X0 + 3, X0 + C - 1]) put(img, px + 3, Y0 + j, NP.shadow, 0.35);                         // shadow on the water
                RK.planks(img, X0 + 3, Y0, C - 6, C, seed + x, NP.plank, false);
                for (let j = 0; j < C; j++) { put(img, X0 + 3, Y0 + j, NP.plank[0]); put(img, X0 + C - 4, Y0 + j, NP.plank[0]); put(img, X0 + 4, Y0 + j, NP.plank[6], 0.5); }
                if (!isPlank(x, y - 1)) for (let i = 3; i < C - 3; i++) { put(img, X0 + i, Y0, NP.plank[7]); put(img, X0 + i, Y0 - 1, NP.plank[0]); }
            } else {
                RK.planks(img, X0, Y0, C, C, seed + y * 3, NP.plank, true);
                if (!isPlank(x, y - 1)) { for (let i = 0; i < C; i++) { put(img, X0 + i, Y0, NP.plank[7]); put(img, X0 + i, Y0 + 1, NP.plank[6], 0.6); put(img, X0 + i, Y0 - 1, NP.plank[0]); put(img, X0 + i, Y0 - 2, NP.shadow, 0.4); } }
                if (!isPlank(x, y + 1)) for (let i = 0; i < C; i++) { put(img, X0 + i, Y0 + C - 1, NP.plank[0]); put(img, X0 + i, Y0 + C, NP.shadow, 0.45); put(img, X0 + i, Y0 + C + 1, NP.shadow, 0.25); }
                if (!isPlank(x - 1, y)) for (let j = 0; j < C; j++) put(img, X0, Y0 + j, NP.plank[0]);
                if (!isPlank(x + 1, y)) for (let j = 0; j < C; j++) { put(img, X0 + C - 1, Y0 + j, NP.plank[0]); put(img, X0 + C, Y0 + j, NP.shadow, 0.4); }
                for (let n = 0; n < 3; n++) if (hash(x, y * 7 + n, seed) < 0.35) put(img, X0 + 4 + hash(x, n, seed) * 24, Y0 + 4 + hash(y, n, seed) * 24, PAL.iron[1]);   // nail heads
            }
        }
        const OPEN = new Set(['grass', 'road', 'wharf', 'jetty']), open = (x, y) => OPEN.has(nameAt(map, x, y));
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const inner = innerFn(map, nameAt);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const idAt = (b) => { const o = (map.interactables || []).find((q) => q.x >= b.x0 && q.x <= b.x1 && q.y >= b.y0 && q.y <= b.y1 && q.kind === 'inspect'); return o ? o.id : ''; };
        const items = [], seen = new Set(), flames = [], smoke = [];
        const BLOCKS = {
            longship: (b) => ({ y: b.y1 + 0.3, draw: () => longship(img, b, seed + b.x0, /armed/.test(idAt(b))) }),
            shipyard: (b) => ({ y: b.y1 + 0.9, draw: () => shipyard(L, b, seed, anyBehind(b)) }),
            turf_house: (b) => ({ y: b.y1 + 0.9, draw: () => longhouse(L, b, seed + b.x0 * 5 + b.y0, anyBehind(b), smoke, {}) }),
            alehouse: (b) => ({ y: b.y1 + 0.9, draw: () => longhouse(L, b, seed + 77, anyBehind(b), smoke, { sign: true, glow: true }, flames) }),
            fish_rack: (b) => ({ y: b.y1 + 0.6, draw: () => fishRack(L, b, seed + b.x0, anyBehind(b)) }),
            stall: (b) => ({ y: b.y1 + 0.6, draw: () => stall(L, b, seed, anyBehind(b)) }),
            nets: (b) => ({ y: b.y1 + 0.6, draw: () => nets(L, b, seed, anyBehind(b)) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P2 = {
                cliff: () => { const inn = inner(x, y, 'cliff'); if (inn && hash(x, y, seed + 31) > 0.22) return; cragCell(L, x, y, seed, NP.cliff, NP.turf, y < 7 ? 3 : 6, open(x, y + 1) || nameAt(map, x, y + 1) === 'water', open(x, y - 1), inn ? 2 : 1); },
                fir: () => fir(L, x, y, seed, behind(x, y), 0),
                rock: () => { stone(img, cx - 3, gy - 8, 10, 8, seed + x * 3 + y, NP.cliff, RP.moss, 0.5); stone(img, cx + 9, gy - 3, 5, 4, seed + x + y * 5, NP.cliff, RP.moss, 0.4); },
                rowboat: () => rowboat(img, cx, gy, seed + x, nameAt(map, x, y - 1) === 'water'),
                barrel: () => barrel(L, cx, gy, seed + x),
                crate: () => crate(L, cx, gy, seed + x),
                fence: () => fence(L, map, nameAt, x, y, seed),
                harbour_bell: () => tall(L, [cx - 22, gy - 62, cx + 22, gy + 6], y * C, open(x, y - 1), (S) => { flames.push(harbourBell(S, cx, gy, seed)); }),
                customs_stone: () => customsStone(img, cx, gy, seed),
                memorial_stone: () => tall(L, [cx - 20, gy - 56, cx + 20, gy + 6], y * C, open(x, y - 1), (S) => memorialStone(S, cx, gy, seed))
            }[n];
            if (P2) items.push({ x, y: y + (n === 'fir' ? 0.8 : n === 'cliff' ? 0.95 : 0.5), draw: P2 });
        }
        // Mooring posts along the wharf's sea edge and at the jetty heads.
        for (let x = 0; x < cw; x++) for (let y = 0; y < ch; y++) {
            if (nameAt(map, x, y) === 'wharf' && !isPlank(x, y - 1) && x % 3 === 0) items.push({ x, y: y - 0.2, draw: () => post(img, x * C + 16, y * C + 5, seed + x) });
            if (nameAt(map, x, y) === 'jetty' && !isPlank(x, y - 1)) items.push({ x, y: y - 0.2, draw: () => { post(img, x * C + 5, y * C + 6, seed + x); post(img, x * C + C - 5, y * C + 6, seed + x + 1); } });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, 14, 0.28);
        // Flat northern daylight, a little haze over the far water.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) put(img, x, y, [176, 196, 210], y < shoreY ? 0.05 + 0.1 * (1 - y / shoreY) : 0.03);
        const water = [];
        for (let i = 0; i < kind.length; i += 5) if (kind[i] === 3 && hash(i, 0, seed) < 0.1) water.push(i);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water, animate: animator(flames, smoke) };
    }
    /** A mooring post with a turn of rope. */
    function post(img, x, y, seed) {
        const p = shape(); box(p, img, x - 2, y - 11, 5, 12, 0); for (const [i] of p.px) p.px.set(i, (((i % img.w) - x) / 2.5) * -0.6);
        fill(img, p, NP.plank.slice(1), { tex: 0.3, seed, outline: NP.plank[0] });
        rectFill(img, x - 2, y - 12, 5, 1, NP.plank[7]); rectFill(img, x - 3, y - 6, 7, 2, NP.wool[3]); rectFill(img, x - 3, y - 4, 7, 1, NP.wool[1]);
    }
    /** A clinker-built ship at her mooring, seen from above the rail: overlapping strakes, thwarts, mast and yard
     *  with the sail furled. `armed`: narrower, shields hung along the rail, a red rag at the masthead. */
    function longship(img, b, seed, armed) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, W = X1 - X0, mid = b.y0 * C + 15, half = armed ? 9 : 12, mx = X0 + W / 2;
        const edge = (px) => { const u = (px - X0) / W; return Math.pow(Math.sin(Math.PI * clamp(u)), 0.55) * half; };
        for (let px = X0; px < X1; px++) for (let j = 0; j < 5; j++) put(img, px + 3, mid + edge(px) + 1 + j, NP.shadow, 0.4 - j * 0.07);      // her shadow on the water
        const hull = shape();
        for (let px = X0; px < X1; px++) { const e = edge(px); for (let py = Math.round(mid - e); py <= Math.round(mid + e); py++) sset(hull, img, px, py, ((py - mid) / half) * -0.75 + ((px - mx) / W) * -0.3); }
        fill(img, hull, NP.oak, { outline: NP.oak[0] });
        for (const [i] of hull.px) {                                 // strakes outside, the open hold inside
            const px = i % img.w, py = (i / img.w) | 0, e = edge(px), d = e - Math.abs(py - mid);
            if (d > 4.5) put(img, px, py, pick(NP.plank, 0.25 + vnoise(px / 6, py / 2, seed) * 0.35));
            else if (Math.round(d) === 2 || Math.round(d) === 4) put(img, px, py, NP.oak[1], 0.8);
            else if (d < 1.2 && py < mid) put(img, px, py, NP.oak[6]);
        }
        for (let px = X0 + 14; px < X1 - 12; px += 9) { const e = edge(px) - 4.5; for (let py = Math.round(mid - e); py <= mid + e; py++) { put(img, px, py, NP.oak[5]); put(img, px + 1, py, NP.oak[2]); } }   // thwarts
        if (!armed) { crate({ base: img }, mx + 22, mid + 5, seed + 1); const bl = shape(); ellipse(bl, img, mx - 24, mid + 1, 7, 5); fill(img, bl, NP.wool, { tex: 0.3, seed, outline: NP.wool[0] }); }
        for (const [px, dir] of [[X0, -1], [X1 - 1, 1]]) { const st = shape(); thick(st, img, px, mid, px + dir * 3, mid - 9, 1.6); fill(img, st, NP.oak.slice(2), { outline: NP.oak[0] }); }   // stem and stern posts, plain
        if (armed) for (let px = X0 + 16; px < X1 - 14; px += 9) for (const side of [-1, 1]) {
            const sy = mid + side * (edge(px) - 1), sh = shape(); ellipse(sh, img, px, sy, 3.6, 3.6);
            fill(img, sh, [NP.madder.slice(1), NP.wool.slice(1), NP.woad.slice(1)][Math.floor(hash(px, side, seed) * 3)], { outline: [16, 12, 10] }); put(img, px, sy, PAL.iron[4]);
        }
        // The yard lying along her with the sail furled and lashed, and the mast (seen from above: its foot and stays).
        const yd = shape(); thick(yd, img, mx - W * 0.3, mid - 1, mx + W * 0.3, mid - 2, 1.2); fill(img, yd, NP.oak.slice(2), { outline: NP.oak[0] });
        const sl = shape(); thick(sl, img, mx - W * 0.27, mid + 1, mx + W * 0.27, mid, 2.2); for (const [i, v] of sl.px) sl.px.set(i, v + Math.sin((i % img.w) / 2.5) * 0.25);
        fill(img, sl, armed ? NP.wool.slice(0, 5) : NP.wool.slice(1), { outline: NP.wool[0] });
        for (let px = mx - W * 0.25; px < mx + W * 0.26; px += 8) for (let j = -2; j <= 3; j++) put(img, px, mid + j, NP.oak[1]);
        const ms = shape(); ellipse(ms, img, mx, mid - 5, 2.6, 2.6); fill(img, ms, NP.oak.slice(3), { outline: NP.oak[0] });
        for (const [tx, ty] of [[X0 + 6, mid], [X1 - 6, mid]]) for (let t = 0; t < 1; t += 0.02) put(img, mx + (tx - mx) * t, mid - 5 + (ty - mid + 5) * t, [30, 26, 22], 0.45);
        if (armed) { rectFill(img, mx + 2, mid - 9, 7, 3, NP.madder[4]); rectFill(img, mx + 8, mid - 8, 3, 2, NP.madder[2]); }
        for (let t = 0; t < 1; t += 0.03) put(img, X0 - 2 - t * 6, mid - 2 + t * (b.y0 * C + C + 2 - mid) * 0.0 + Math.sin(t * 3) * 2, NP.wool[3]);   // mooring line to the jetty
    }
    /** A small boat: afloat, or pulled up on the shingle with her oars shipped. */
    function rowboat(img, cx, gy, seed, afloat) {
        const y = gy - 10;
        if (afloat) for (let i = -12; i <= 12; i++) for (let j = 0; j < 3; j++) put(img, cx + i + 2, y + 6 + j, NP.shadow, 0.35); else shadow(img, cx + 2, y + 6, 14, 4, 0.4);
        const h = shape(); for (let i = -13; i <= 13; i++) { const e = Math.pow(Math.cos((i / 13) * Math.PI / 2), 0.6) * 6; for (let j = -Math.round(e); j <= Math.round(e); j++) sset(h, img, cx + i, y + j, (j / 6) * -0.7); }
        fill(img, h, NP.oak, { outline: NP.oak[0] });
        for (const [i] of h.px) { const px = i % img.w, py = (i / img.w) | 0; if (Math.abs(py - y) < 3 && Math.abs(px - cx) < 10) put(img, px, py, NP.plank[2 + ((px + py) & 1)]); }
        for (const dx of [-5, 4]) rectFill(img, cx + dx, y - 3, 2, 7, NP.oak[5]);
        const o = shape(); thick(o, img, cx - 11, y + 1, cx + 9, y - 1, 0.7); fill(img, o, NP.plank.slice(5), { edge: false }); rectFill(img, cx + 8, y - 2, 4, 3, NP.plank[6]);
    }
    /** Leif's yard: a hull on the stocks, half planked, the ribs showing where the strakes haven't reached. */
    function shipyard(L, b, seed, overhead) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4, W = X1 - X0, keelY = B - 12, mx = X0 + W / 2;
        tall(L, [X0 - 6, b.y0 * C - 20, X1 + 8, B + 8], b.y0 * C + 4, overhead, (S) => {
            shadow(S, mx + 4, B + 1, W / 2 + 2, 6, 0.5);
            for (let n = 0; n < 60; n++) { const sx = X0 + hash(n, 1, seed) * W, sy = B - 4 + hash(n, 2, seed) * 8; put(S, sx, sy, PAL.straw[2 + (n % 2)]); put(S, sx + 1, sy, PAL.straw[1]); }   // shavings
            const sheer = (px) => { const u = (px - X0) / W; return keelY - 22 - Math.pow(Math.abs(u - 0.5) * 2, 2.4) * 24; };          // the top edge, rising to stem and stern
            const keel = (px) => { const u = (px - X0) / W; return keelY - Math.pow(Math.abs(u - 0.5) * 2, 3) * 30; };
            const hull = shape();
            for (let px = X0 + 2; px < X1 - 2; px++) for (let py = Math.round(sheer(px)); py <= keel(px); py++) sset(hull, S, px, py, ((py - sheer(px)) / 26) * -0.7 + 0.3);
            const planked = (px, py) => px < mx + 6 - (py - sheer(px)) * 0.9;      // the strakes go on from the keel up and from the stem back
            for (const [i, v] of hull.px) {
                const px = i % S.w, py = (i / S.w) | 0, d = py - sheer(px), course = Math.floor((keel(px) - py) / 4);
                if (planked(px, py) || keel(px) - py < 5) {
                    put(S, px, py, pick(NP.oak, 0.5 + v * 0.3 + (hash(course, 3, seed) - 0.5) * 0.2 + (vnoise(px / 9, py / 2, seed) - 0.5) * 0.2));
                    if ((Math.round(keel(px)) - py) % 4 === 0) put(S, px, py, NP.oak[0], 0.7);
                    if ((Math.round(keel(px)) - py) % 4 === 2 && px % 6 === 0) put(S, px, py, PAL.iron[4]);                    // the rivets
                } else if ((px - X0) % 9 < 2) put(S, px, py, pick(NP.oak, 0.35 + (d / 26) * 0.3)); else S.data[i * 4 + 3] = 0;   // ribs, and daylight between
            }
            for (let px = X0 + 2; px < X1 - 2; px++) { put(S, px, Math.round(sheer(px)), NP.oak[6]); put(S, px, Math.round(keel(px)) + 1, NP.oak[0]); put(S, px, Math.round(keel(px)), NP.oak[1]); }
            for (const [px, dir] of [[X0 + 2, -1], [X1 - 3, 1]]) { const st = shape(); thick(st, S, px, sheer(px) + 4, px + dir * 2, sheer(px) - 12, 1.7); fill(S, st, NP.oak.slice(2), { outline: NP.oak[0] }); }
            // The stocks: cross-timbers under the keel and shores leaning against the hull.
            for (let px = X0 + 14; px < X1 - 10; px += 22) { const t = shape(); box(t, S, px - 6, keelY + 1, 12, 5, 0); fill(S, t, NP.plank.slice(1), { tex: 0.4, seed: seed + px, outline: NP.plank[0] }); }
            for (const px of [X0 + 26, mx, X1 - 28]) { const sh = shape(); thick(sh, S, px + 10, B + 2, px, keelY - 12, 1.2); fill(S, sh, NP.plank.slice(2), { outline: NP.plank[0] }); }
            // A stack of split planks and a mallet left on it.
            for (let k = 0; k < 4; k++) { const pl = shape(); box(pl, S, X1 - 34 + k, B - 2 - k * 3, 30, 3, 0.2 - k * 0.05); fill(S, pl, NP.plank.slice(3), { tex: 0.3, seed: seed + k, outline: NP.plank[1] }); }
            rectFill(S, X1 - 22, B - 16, 7, 4, NP.oak[3]); rectFill(S, X1 - 19, B - 12, 2, 2, NP.oak[5]);
        });
    }
    /** A longhouse under turf: low plank walls on a stone sill, a bowed ridge, crossed boards at each gable, a
     *  smoke hole. The alehouse is the same house built longer, with a kettle on a pole and its door open. */
    function longhouse(L, b, seed, overhead, smoke, { sign = false, glow = false } = {}, flames = null) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C - 2, W = X1 - X0, wallTop = B - (sign ? 26 : 22), ridge = Y0 - 4, mx = X0 + W / 2;
        tall(L, [X0 - 12, ridge - 22, X1 + 14, B + 8], Y0 + 6, overhead, (S) => {
            shadow(S, mx + 6, B + 2, W / 2 + 8, 6, 0.5);
            RK.planks(S, X0 + 3, wallTop, W - 6, B - wallTop - 4, seed, NP.plank, true);
            RK.blocks(S, X0 + 2, B - 5, W - 4, 5, seed + 1, NP.rock);
            for (let px = X0 + 3; px < X1 - 3; px++) { put(S, px, B - 1, NP.rock[0]); put(S, px, wallTop, NP.plank[0]); }
            const dx = Math.round(mx - 7);
            rectFill(S, dx - 2, wallTop + 2, 18, B - wallTop - 2, NP.oak[1]);
            if (glow) { rectFill(S, dx, wallTop + 4, 14, B - wallTop - 5, [70, 36, 14]); rectFill(S, dx + 2, wallTop + 8, 10, B - wallTop - 9, NP.glow[1]); rectFill(S, dx + 4, B - 9, 6, 6, NP.glow[2]); if (flames) flames.push({ x: dx + 7, y: B - 6 }); }
            else { RK.planks(S, dx, wallTop + 4, 14, B - wallTop - 5, seed + 9, NP.oak.slice(1), true); put(S, dx + 10, wallTop + 12, PAL.iron[4]); }
            rectFill(S, dx - 3, wallTop + 1, 20, 2, NP.oak[5]);
            // The roof: turf, bowed like an upturned boat, grass standing along the ridge.
            const bow = (px) => Math.sin(((px - X0) / W) * Math.PI) * 5;
            const roof = shape();
            for (let px = X0 - 7; px < X1 + 7; px++) { const top = ridge - bow(px) + Math.pow(Math.abs((px - mx) / (W / 2 + 7)), 6) * 16; for (let py = Math.round(top); py <= wallTop + 3; py++) sset(roof, S, px, py, ((py - top) / (wallTop - ridge)) * -0.75 + 0.35 + ((px - mx) / W) * -0.25); }
            for (const [i, v] of roof.px) { const py = (i / S.w) | 0; roof.px.set(i, v * 1.15 - 0.1 + (vnoise((i % S.w) / 4, py / 3, seed + 4) - 0.5) * 0.5 + ((py - ridge) % 9 === 0 ? -0.35 : 0)); }   // turves laid in courses
            fill(S, roof, NP.turf, { outline: NP.turf[0] });
            for (const [i] of roof.px) {
                const px = i % S.w, py = (i / S.w) | 0;
                if (!roof.px.has(i - S.w)) { for (let j = 1; j <= 2 + (hash(px, 5, seed) * 3 | 0); j++) put(S, px, py - j, NP.turf[4 + (px & 1)]); }       // grass on the ridge
                else if (hash(px, py, seed + 6) < 0.012) put(S, px, py, [[236, 226, 160], [226, 226, 220]][px & 1]);                             // a few flowers
                if (py > wallTop + 1) put(S, px, py, NP.shadow, 0.4);                                                                          // the eaves
            }
            for (let px = X0 - 7; px < X1 + 7; px++) put(S, px, wallTop + 4, NP.oak[1]);
            // Crossed gable boards at each end, plain.
            for (const gx of [X0 - 3, X1 + 3]) { const g = shape(); thick(g, S, gx - 5, ridge + 14, gx + 4, ridge - 12, 1.1); thick(g, S, gx + 5, ridge + 14, gx - 4, ridge - 12, 1.1); fill(S, g, NP.plank.slice(3), { outline: NP.plank[0] }); }
            // The smoke hole.
            const hx = mx + (sign ? -W * 0.2 : W * 0.12), hy = ridge - bow(hx) + 5;
            rectFill(S, hx - 4, hy - 1, 9, 4, NP.oak[1]); rectFill(S, hx - 3, hy, 7, 2, [10, 8, 8]);
            for (let k = 0; k < 14; k++) put(S, hx - 5 + hash(k, 1, seed) * 11, hy - 2 - hash(k, 2, seed) * 5, [30, 28, 26], 0.35);
            smoke.push({ x: hx, y: hy - 2 });
            if (sign) {                                                // a kettle hung from a pole by the door
                const px = dx + 26, py = wallTop - 6;
                const pl = shape(); thick(pl, S, px, B, px, py - 8, 1.3); thick(pl, S, px, py - 6, px + 12, py - 6, 1); fill(S, pl, NP.oak.slice(2), { outline: NP.oak[0] });
                for (let j = 0; j < 4; j++) put(S, px + 10, py - 5 + j, PAL.iron[2]);
                const kt = shape(); ellipse(kt, S, px + 10, py + 3, 5, 4.5); fill(S, kt, PAL.iron, { outline: PAL.iron[0] }); rectFill(S, px + 6, py - 1, 9, 1, PAL.iron[4]);
                put(S, px + 6, py + 6, [240, 240, 236]); put(S, px + 7, py + 7, [240, 240, 236]); put(S, px + 5, py + 7, [30, 30, 34]);   // the gull
            }
        });
    }
    /** Cod split and hung in pairs by the tail on a rack of poles. */
    function fishRack(L, b, seed, overhead) {
        const X0 = b.x0 * C + 3, X1 = (b.x1 + 1) * C - 3, B = (b.y1 + 1) * C - 3, top = B - 40;
        tall(L, [X0 - 6, top - 6, X1 + 6, B + 6], b.y0 * C, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 4, B + 1, (X1 - X0) / 2 + 2, 4, 0.4);
            const fr = shape();
            for (const px of [X0 + 1, X1 - 2]) { thick(fr, S, px - 4, B, px, top, 1.1); thick(fr, S, px + 4, B, px, top, 1.1); }
            for (const py of [top + 2, top + 18]) thick(fr, S, X0 - 2, py, X1 + 2, py, 1);
            fill(S, fr, NP.plank.slice(2), { outline: NP.plank[0] });
            for (const py of [top + 2, top + 18]) for (let px = X0 + 5; px < X1 - 4; px += 5) {
                const len = 9 + hash(px, py, seed) * 4, c = hash(px, 1, seed) < 0.5 ? [206, 196, 170] : [186, 172, 146];
                for (let j = 1; j < len; j++) { const w = j < 3 ? 0 : j < len - 2 ? 1 : 0; for (let i = -w; i <= w; i++) put(S, px + i, py + j, i < 0 ? c : [c[0] - 30, c[1] - 30, c[2] - 30]); }
                put(S, px, py + 1, [90, 80, 70]);
            }
        });
    }
    /** A market stall: a trestle table under a striped wool awning, amber and whetstones and a great many combs. */
    function stall(L, b, seed, overhead) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 3, W = X1 - X0;
        tall(L, [X0 - 6, B - 50, X1 + 6, B + 6], b.y0 * C, overhead, (S) => {
            shadow(S, X0 + W / 2 + 4, B + 1, W / 2 + 2, 4, 0.4);
            for (const px of [X0 + 2, X1 - 4]) { const p = shape(); box(p, S, px, B - 40, 3, 40, 0); fill(S, p, NP.plank.slice(2), { outline: NP.plank[0] }); }
            const tb = shape(); box(tb, S, X0 + 2, B - 16, W - 4, 5, 0.3); fill(S, tb, NP.plank.slice(3), { tex: 0.3, seed, outline: NP.plank[0] });
            rectFill(S, X0 + 6, B - 11, 2, 10, NP.plank[2]); rectFill(S, X1 - 8, B - 11, 2, 10, NP.plank[2]);
            for (let k = 0; k < 6; k++) { put(S, X0 + 8 + k * 3, B - 18, [222, 150, 40]); put(S, X0 + 8 + k * 3, B - 17, [170, 100, 24]); }                    // amber
            for (let k = 0; k < 3; k++) rectFill(S, X0 + 30 + k * 6, B - 18, 4, 2, NP.rock[5]);                                                                // whetstones
            for (let k = 0; k < 5; k++) { rectFill(S, X1 - 14 - k * 4, B - 19, 3, 1, [226, 218, 196]); put(S, X1 - 14 - k * 4, B - 18, [226, 218, 196]); put(S, X1 - 12 - k * 4, B - 18, [226, 218, 196]); }   // combs
            const aw = shape(); poly(aw, S, [[X0 - 4, B - 34], [X0 + 2, B - 46], [X1 - 2, B - 46], [X1 + 4, B - 34]], (px, py) => ((py - B + 40) / 12) * -0.6);
            for (const [i, v] of aw.px) { const px = i % S.w; put(S, px, (i / S.w) | 0, pick(Math.floor((px - X0) / 7) % 2 ? NP.woad : NP.wool, (v + 1) / 2)); }
            for (let px = X0 - 4; px < X1 + 4; px++) { put(S, px, B - 34, NP.woad[0]); if (px % 4 < 2) put(S, px, B - 33, NP.wool[3]); }
        });
    }
    /** Nets hung over poles to dry and to mend. */
    function nets(L, b, seed, overhead) {
        const X0 = b.x0 * C + 3, X1 = (b.x1 + 1) * C - 3, B = (b.y1 + 1) * C - 3, top = B - 34;
        tall(L, [X0 - 4, top - 4, X1 + 4, B + 6], b.y0 * C, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 4, B + 1, (X1 - X0) / 2, 4, 0.35);
            const fr = shape(); for (const px of [X0, X1 - 2]) thick(fr, S, px, B, px, top, 1.1); thick(fr, S, X0 - 2, top + 2, X1 + 2, top + 2, 1); fill(S, fr, NP.plank.slice(2), { outline: NP.plank[0] });
            for (let px = X0 + 2; px < X1 - 2; px++) { const sag = Math.sin(((px - X0) / (X1 - X0)) * Math.PI) * 6; for (let py = top + 3; py < B - 6 + sag; py++) if ((px + py) % 4 === 0 || (px - py + 400) % 4 === 0) put(S, px, py, [150, 140, 112], 0.85); }
            for (let k = 0; k < 6; k++) { const fx = X0 + 6 + k * ((X1 - X0 - 12) / 5); const f = shape(); ellipse(f, S, fx, top + 6 + (k % 2) * 3, 2, 1.6); fill(S, f, NP.oak.slice(4), { outline: NP.oak[1] }); }   // cork floats
        });
    }
    /** The harbour bell: bronze gone green with salt, on a post with a worn rope, a small lamp for fog. */
    function harbourBell(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 8, 3, 0.4);
        const p = shape(); thick(p, S, cx - 6, gy, cx - 6, gy - 52, 1.8); thick(p, S, cx - 6, gy - 48, cx + 10, gy - 48, 1.4); thick(p, S, cx - 6, gy - 36, cx + 4, gy - 48, 1);
        fill(S, p, NP.plank.slice(2), { tex: 0.3, seed, outline: NP.plank[0] });
        const bl = shape(); poly(bl, S, [[cx + 2, gy - 45], [cx + 10, gy - 45], [cx + 12, gy - 33], [cx + 14, gy - 30], [cx - 2, gy - 30], [cx, gy - 33]], (px) => ((px - cx - 6) / 8) * -0.7);
        fill(S, bl, NP.bronze, { outline: NP.bronze[0] });
        put(S, cx + 6, gy - 29, PAL.iron[2]); put(S, cx + 6, gy - 28, PAL.iron[3]);
        for (let j = gy - 27; j < gy - 8; j++) put(S, cx + 6 + (j % 5 === 0 ? 1 : 0), j, NP.wool[j > gy - 16 ? 5 : 3]);                                                // the rope, pale where hands go
        for (let yy = -9; yy <= 9; yy++) for (let xx = -9; xx <= 9; xx++) { const d = Math.hypot(xx, yy); if (d < 9) put(S, cx - 12 + xx, gy - 38 + yy, NP.glow[3], (1 - d / 9) * 0.22); }
        rectFill(S, cx - 14, gy - 41, 5, 6, PAL.iron[1]); rectFill(S, cx - 13, gy - 40, 3, 4, NP.glow[3]); put(S, cx - 12, gy - 42, PAL.iron[3]); put(S, cx - 9, gy - 42, NP.plank[3]); put(S, cx - 8, gy - 42, NP.plank[3]);
        return { x: cx - 12, y: gy - 38 };
    }
    /** The old Crown's customs stone: squat, a coin slot cut in the top, its mark on the side. Children sit on it. */
    function customsStone(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 13, 4, 0.45);
        const s = shape(); poly(s, img, [[cx - 11, gy], [cx - 10, gy - 15], [cx - 6, gy - 19], [cx + 7, gy - 19], [cx + 11, gy - 14], [cx + 12, gy]], (px, py) => ((px - cx) / 12) * -0.5 + ((py - gy + 10) / 10) * -0.4 + (vnoise(px / 3, py / 3, seed) - 0.5) * 0.4);
        fill(img, s, NP.cliff.slice(2), { outline: NP.cliff[0] });
        rectFill(img, cx - 4, gy - 18, 8, 2, [10, 10, 12]);                                                                             // the slot
        for (const [dx, dy] of [[-4, -8], [-2, -11], [0, -8], [2, -11], [4, -8]]) put(img, cx + dx, gy + dy, NP.cliff[1]);               // a crown, worn
        rectFill(img, cx - 4, gy - 7, 9, 1, NP.cliff[1]);
        for (let px = cx - 9; px < cx + 10; px++) if (vnoise(px / 2, 0, seed + 2) > 0.55) { put(img, px, gy - 1, RP.moss[2]); put(img, px, gy - 2, RP.moss[1], 0.7); }
        put(img, cx + 5, gy - 20, [236, 236, 232]); put(img, cx + 6, gy - 19, [220, 220, 214]);                                          // what the gull left
    }
    /** The memorial stone: a standing stone with a board of names pegged to it. Half the board has been split
     *  away along the grain; the wood underneath is still pale. */
    function memorialStone(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 12, 4, 0.45);
        const s = shape(); poly(s, S, [[cx - 9, gy], [cx - 10, gy - 30], [cx - 6, gy - 46], [cx + 2, gy - 50], [cx + 8, gy - 42], [cx + 10, gy - 20], [cx + 9, gy]], (px, py) => ((px - cx) / 10) * -0.5 + (vnoise(px / 4, py / 5, seed) - 0.5) * 0.5);
        fill(S, s, NP.cliff.slice(1), { outline: NP.cliff[0] });
        for (const [i] of s.px) { const px = i % S.w, py = (i / S.w) | 0; if (py > gy - 8 && vnoise(px / 2, py / 2, seed + 3) > 0.55) put(S, px, py, RP.moss[1 + (px & 1)]); }
        // The board: grey with weather and cut with rows of names on the left; the right half gone, a pale ragged edge.
        const X = cx - 7, Y = gy - 38, edge = (py) => cx + Math.round(Math.sin(py * 1.3) * 1.5 + Math.sin(py * 0.5) * 1);
        for (let py = Y; py < Y + 22; py++) for (let px = X; px < cx + 8; px++) {
            if (px < edge(py)) put(S, px, py, pick(NP.plank, 0.55 + (vnoise(px / 5, py / 1.5, seed + 5) - 0.5) * 0.3));
            else if (px < edge(py) + 2) put(S, px, py, [226, 204, 160]);                                                              // fresh wood
        }
        for (let py = Y + 2; py < Y + 21; py += 3) for (let px = X + 1; px < edge(py) - 1; px++) if (hash(px, py, seed) < 0.72) put(S, px, py, NP.plank[1]);
        for (let px = X; px < cx + 1; px++) { put(S, px, Y - 1, NP.plank[0]); put(S, px, Y + 22, NP.plank[0]); }
        for (let py = Y; py < Y + 22; py++) put(S, X - 1, py, NP.plank[0]);
        put(S, X + 1, Y + 1, PAL.iron[4]); put(S, X + 1, Y + 20, PAL.iron[4]);
        for (const [dx, dy] of [[9, 6], [10, 14], [8, 19]]) { put(S, cx + dx - 3, Y + dy, PAL.iron[3]); }                                 // the pegs left in the stone
        for (let k = 0; k < 5; k++) { put(S, cx + 2 + k * 2, gy + 1 + (k & 1), [226, 204, 160]); }                                      // splinters at its foot
    }

    Object.assign(SA.scenes, { frostspine_pass: frostspinePass, skeldvik });
    if (isNode) module.exports = { frostspine_pass: frostspinePass, skeldvik };
})(typeof window !== 'undefined' ? window : globalThis);
