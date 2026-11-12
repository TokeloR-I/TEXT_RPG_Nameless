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
 *   'skeldvik'         Skeldvik Harbor at dusk under snow, after Tokelo's reference map (2026-11-11). The Upland
 *                      Trail comes down a stair through the palisade; the memorial stone stands in its ring of
 *                      small stones and fire bowls, half its name board split away; the Stormtide Inn, a great
 *                      gabled hall with carved bargeboards, two chimneys and lit windows; the harbour bell under
 *                      its own roof on a terrace of fitted stone; the market wharf's striped stalls; cod on the
 *                      racks; the crane with its net; plank wharves on piles with torches on the mooring posts;
 *                      the armed ship in the basin with her red sail set and shields along the rail, the trader
 *                      at the north dock; the shipwright's hall open on its fire and a hull on the stocks; the
 *                      customs stone; skerries, a waterfall across the fjord and mist coming in. No horned helmets.
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
    // Skeldvik Harbor (after Tokelo's reference map, 2026-11-11): a harbour town at dusk under snow
    // ---------------------------------------------------------------------
    const ROOF = R(['#15110f', '#201a17', '#2c2420', '#3a302a', '#4a3e35', '#5b4d42', '#6d5e50']);
    const COBBLE = R(['#231e1b', '#352e29', '#463d36', '#574c43', '#695d51', '#7b6e60', '#8d8070', '#a09382']);
    const FLAG = R(['#26272a', '#36383c', '#484b50', '#5a5e63', '#6d7176', '#82868a', '#989b9d']);
    const WARM = [255, 176, 92];
    const GROUND = new Set(['snow', 'cobble', 'yard', 'wharf', 'terrace', 'steps']);
    const BASE_OF = { fir: 'snow', palisade: 'snow', cliff: 'cliff', waterfall: 'cliff', water: 'water', longship: 'water', rowboat: 'water', nets: 'water', skerry: 'water',
        inn: 'cobble', house: 'cobble', shipyard_hall: 'yard', shipyard: 'yard', harbour_bell: 'terrace', terrace_wall: 'cobble', steps: 'cobble' };

    function skeldvik(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 947, img = L.base;
        const N = (x, y) => nameAt(map, x, y);
        // What lies under each cell: the ground itself, or for a thing standing on it, the ground its neighbours share.
        const under = new Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const n = N(x, y); under[y * cw + x] = n === 'steps' ? 'cobble' : GROUND.has(n) ? n : BASE_OF[n] || null; }
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (!under[y * cw + x]) {
            const votes = {};
            for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const n = N(x + dx, y + dy); if (GROUND.has(n)) { const g = n === 'steps' ? 'cobble' : n; votes[g] = (votes[g] || 0) + 1; } }
            under[y * cw + x] = Object.keys(votes).sort((a, b) => votes[b] - votes[a] || (a < b ? -1 : 1))[0] || 'cobble';
        }
        const U = (x, y) => (x < 0 || y < 0 || x >= cw || y >= ch ? null : under[y * cw + x]);
        const isPlank = (x, y) => U(x, y) === 'wharf', isWater = (x, y) => U(x, y) === 'water';
        const snowC = new Float32Array(cw * ch), yardC = new Float32Array(cw * ch);
        for (let i = 0; i < cw * ch; i++) { snowC[i] = under[i] === 'snow' ? 1 : under[i] === 'cliff' ? 0.35 : 0; yardC[i] = under[i] === 'yard' ? 1 : 0; }
        const snowF = field(snowC, cw, ch), yardF = field(yardC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);               // 0 cobble, 1 yard, 3 water, 4 snow, 5 rock
        const cobbleAt = (x, y, ramp, sw, sh, sd) => {
            const row = Math.floor(y / sh), u = x + hash(row, 1, sd) * sw * 2 + Math.sin(y / 9 + row) * 1.2, col = Math.floor(u / sw), fx = u - col * sw, fy = y - row * sh;
            if (fx < 1 || fy < 1 || (fx < 2 && fy < 2) || (fx > sw - 1.2 && fy < 2)) return ramp[0];
            return pick(ramp, 0.22 + hash(col, row, sd + 2) * 0.5 + (fy < 2.2 ? 0.1 : fy > sh - 1.6 ? -0.1 : 0) + (fx < 2.2 ? 0.05 : 0));
        };
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cx = Math.floor(x / C), cy = Math.floor(y / C), g = under[cy * cw + cx];
            const n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            if (g === 'water') {
                kind[i] = 3;
                let t = 0.1 + (fbm(x / 46, y / 10, seed + 12) - 0.5) * 0.42 + (x / img.w) * 0.16 + 0.12;
                if (vnoise(x / 10, y / 1.7, seed + 13) > 0.8) t += 0.13;
                put(img, x, y, pick(NP.water, t));
                continue;
            }
            if (g === 'cliff') { kind[i] = 5; put(img, x, y, n1 * 0.7 + n2 * 0.3 > 0.45 ? pick(NP.snow, 0.2 + n1 * 0.5) : pick(NP.cliff, 0.1 + n1 * 0.35 + hash(x, y, seed) * 0.08)); continue; }
            if (g === 'wharf') { kind[i] = 2; continue; }
            if (g === 'terrace') { kind[i] = 0; put(img, x, y, cobbleAt(x, y, FLAG, 13, 9, seed + 50)); if (fbm(x / 9, y / 7, seed + 41) > 0.7) put(img, x, y, pick(NP.snow, 0.5 + n2 * 0.4), 0.85); continue; }
            if (snowF(x, y) + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.14 > 0.5) {
                kind[i] = 4;
                put(img, x, y, pick(NP.snow, 0.5 + (fbm(x / 34, y / 16, seed + 3) - 0.5) * 0.9 + (n2 - 0.5) * 0.12 + (N(cx, cy) === 'fir' ? -0.2 : 0)));
            } else if (yardF(x, y) + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.1 > 0.5) {
                kind[i] = 1;
                put(img, x, y, pick(NP.dirt, fbm(x / 10, y / 10, seed + 7) * 0.5 + hash(x, y, seed + 8) * 0.3 + 0.2)); put(img, x, y, [120, 84, 44], 0.14);
                if (hash(x, y, seed + 9) < 0.09) put(img, x, y, PAL.straw[1 + ((x + y) & 1)], 0.8);                          // straw and shavings trodden in
            } else {
                kind[i] = 0;
                put(img, x, y, cobbleAt(x, y, COBBLE, 8, 6, seed + 30));
                const sn = fbm(x / 13, y / 9, seed + 40) + snowF(x, y) * 0.5;                                              // snow lying between the stones
                if (sn > 0.74) put(img, x, y, pick(NP.snow, 0.45 + n2 * 0.4), sn > 0.8 ? 0.95 : 0.6);
            }
        }
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 4 && (kind[i + img.w] === 0 || kind[i + img.w] === 1 || kind[i + 1] === 0 || kind[i + 1] === 1)) put(img, x, y, NP.snow[0], 0.75);
            else if (k === 4 && (kind[i - img.w] === 0 || kind[i - 1] === 0)) put(img, x, y, NP.snow[6], 0.8);
        }
        for (let n = 0; n < (img.w * img.h) / 40; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 4 && r < 0.1) { for (let j = 0; j < 4; j++) put(img, x + (j > 2 ? 1 : 0), y - j, [150, 132, 92]); put(img, x + 1, y + 1, NP.snow[1]); }
            else if (k === 4 && r < 0.3) { put(img, x, y, NP.snow[2]); put(img, x + 1, y, NP.snow[1]); put(img, x, y - 1, NP.snow[6]); }
            else if (k === 1 && r < 0.3) { put(img, x, y, NP.rock[6]); put(img, x + 1, y, NP.rock[5]); put(img, x, y + 1, NP.dirt[0]); }
            else if (k === 0 && r < 0.05) { rectFill(img, x, y, 3, 1, [70, 86, 52]); put(img, x + 1, y - 1, [70, 86, 52]); }                 // moss between the cobbles
        }
        // A round of pale flagstones about the memorial stone.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (N(x, y) === 'memorial_stone') {
            const mx = x * C + 16, my = y * C + 26;
            for (let yy = -46; yy <= 46; yy++) for (let xx = -62; xx <= 62; xx++) {
                const d = Math.hypot(xx / 62, yy / 46), px = mx + xx, py = my + yy;
                if (d >= 1 || kind[py * img.w + px] !== 0) continue;
                const ring = Math.floor(d * 5), ang = Math.floor((Math.atan2(yy / 46, xx / 62) + Math.PI) * (3 + ring * 2.2) + ring * 0.5);
                const fr = d * 5 - ring, af = (Math.atan2(yy / 46, xx / 62) + Math.PI) * (3 + ring * 2.2) + ring * 0.5 - ang;
                put(img, px, py, fr < 0.1 || af < 0.07 ? FLAG[0] : pick(FLAG, 0.3 + hash(ring, ang, seed + 55) * 0.45), d > 0.92 ? 0.6 : 1);
                if (fbm(px / 8, py / 6, seed + 41) > 0.72) put(img, px, py, NP.snow[5], 0.8);
            }
        }
        // The stone quay where the town meets the water, and the wharves: planks on piles.
        const flames = [], smoke = [], glows = [], items = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const g = U(x, y), X0 = x * C, Y0 = y * C;
            if (g !== 'water' && g !== 'wharf' && g !== 'cliff' && isWater(x, y + 1)) {
                RK.blocks(img, X0, Y0 + C, C, 10, seed + x, NP.cliff);
                for (let i = 0; i < C; i++) { put(img, X0 + i, Y0 + C - 1, COBBLE[7]); put(img, X0 + i, Y0 + C + 10, NP.shadow, 0.6); put(img, X0 + i, Y0 + C + 11, NP.shadow, 0.4); put(img, X0 + i, Y0 + C + 12, NP.shadow, 0.2); if (hash(X0 + i, y, seed) < 0.3) put(img, X0 + i, Y0 + C + 9, [58, 70, 40]); }
            }
            if (g !== 'water' && g !== 'wharf' && g !== 'cliff') {
                if (isWater(x + 1, y)) for (let j = 0; j < C; j++) { put(img, X0 + C - 1, Y0 + j, COBBLE[0]); put(img, X0 + C - 2, Y0 + j, COBBLE[6], 0.6); put(img, X0 + C, Y0 + j, NP.shadow, 0.5); put(img, X0 + C + 1, Y0 + j, NP.shadow, 0.3); }
                if (isWater(x - 1, y)) for (let j = 0; j < C; j++) { put(img, X0, Y0 + j, COBBLE[0]); put(img, X0 - 1, Y0 + j, NP.shadow, 0.4); }
                if (isWater(x, y - 1)) for (let i = 0; i < C; i++) { put(img, X0 + i, Y0, COBBLE[0]); put(img, X0 + i, Y0 + 1, COBBLE[6], 0.6); }
            }
            if (g !== 'wharf') continue;
            RK.planks(img, X0, Y0, C, C, seed + y * 3 + (isPlank(x - 1, y) || isPlank(x + 1, y) ? 0 : x), NP.plank, isPlank(x - 1, y) || isPlank(x + 1, y) || !isPlank(x, y + 1));
            for (let n = 0; n < 3; n++) if (hash(x, y * 7 + n, seed) < 0.35) put(img, X0 + 4 + hash(x, n, seed) * 24, Y0 + 4 + hash(y, n, seed) * 24, PAL.iron[1]);
            if (hash(x, y, seed + 60) < 0.25) for (let i = 0; i < 9; i++) put(img, X0 + 6 + i + hash(i, x, seed) * 3, Y0 + 9 + hash(i, y, seed) * 12, NP.snow[4 + (i & 1)], 0.8);   // a little snow on the boards
            if (!isPlank(x, y - 1)) for (let i = 0; i < C; i++) { put(img, X0 + i, Y0, NP.plank[7]); put(img, X0 + i, Y0 + 1, NP.plank[6], 0.6); if (isWater(x, y - 1)) { put(img, X0 + i, Y0 - 1, NP.plank[0]); put(img, X0 + i, Y0 - 2, NP.shadow, 0.4); } }
            if (!isPlank(x - 1, y)) for (let j = 0; j < C; j++) { put(img, X0, Y0 + j, NP.plank[0]); put(img, X0 + 1, Y0 + j, NP.plank[6], 0.4); }
            if (!isPlank(x + 1, y)) for (let j = 0; j < C; j++) { put(img, X0 + C - 1, Y0 + j, NP.plank[0]); if (isWater(x + 1, y)) { put(img, X0 + C, Y0 + j, NP.shadow, 0.5); put(img, X0 + C + 1, Y0 + j, NP.shadow, 0.3); } }
            if (isWater(x, y + 1)) {                                    // the edge beam, the dark under the wharf and its piles
                for (let i = 0; i < C; i++) { put(img, X0 + i, Y0 + C - 2, NP.plank[6]); put(img, X0 + i, Y0 + C - 1, NP.plank[1]); for (let j = 0; j < 9; j++) put(img, X0 + i, Y0 + C + j, NP.shadow, 0.78 - j * 0.07); }
                for (const px of [X0 + 5, X0 + 21]) { for (let j = 0; j < 13; j++) { rectFill(img, px, Y0 + C + j, 4, 1, NP.plank[j < 2 ? 4 : 2]); put(img, px, Y0 + C + j, NP.plank[5]); } for (let j = 13; j < 22; j++) if (j & 1) rectFill(img, px, Y0 + C + j, 4, 1, NP.plank[1], 0.35); }
            } else if (!isPlank(x, y + 1)) for (let i = 0; i < C; i++) put(img, X0 + i, Y0 + C - 1, NP.plank[0]);
            // Mooring posts along the water, some with a torch.
            const sea = isWater(x, y - 1) ? -1 : isWater(x, y + 1) ? 1 : 0, torch = hash(x * 3, y, seed + 70) < 0.3;
            if (sea && (x + y) % 2 === 0) items.push({ x, y: sea < 0 ? y - 0.2 : y + 0.86, draw: () => post(img, X0 + 16, sea < 0 ? Y0 + 6 : Y0 + C - 3, seed + x, torch ? { flames, glows } : null) });
            else if ((isWater(x + 1, y) || isWater(x - 1, y)) && y % 2 === 0) items.push({ x, y: y + 0.3, draw: () => post(img, isWater(x + 1, y) ? X0 + C - 4 : X0 + 4, Y0 + 18, seed + y, torch ? { flames, glows } : null) });
        }
        const open = (x, y) => GROUND.has(N(x, y));
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const inner = innerFn(map, nameAt);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const idAt = (b) => { const o = (map.interactables || []).find((q) => q.x >= b.x0 && q.x <= b.x1 && q.y >= b.y0 && q.y <= b.y1 && q.kind === 'inspect'); return o ? o.id : ''; };
        const seen = new Set(), FX = { flames, smoke, glows };
        const BLOCKS = {
            // Built at z 2 (playtest 2026-11-11): Baker's Lane proportions, so a person stands a head below the eaves.
            inn: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + 77, anyBehind(b), FX, { z: 2, gw: 64, wallH: 32, depth: 80, chimneys: 2, sign: 'inn', banner: true, carved: true, lantern: true }) }),
            house: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + b.x0 * 5 + b.y0, anyBehind(b), FX, { z: 2, chimneys: hash(b.x0, b.y0, seed) < 0.6 ? 1 : 0, banner: b.x1 - b.x0 >= 4 }) }),
            shipyard_hall: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + 31, anyBehind(b), FX, { z: 2, gw: 68, wallH: 36, depth: 54, open: true, sign: 'axes' }) }),
            shipyard: (b) => ({ y: b.y1 + 0.9, draw: () => shipyard(L, b, seed, anyBehind(b)) }),
            longship: (b) => ({ y: b.y1 + 0.3, draw: () => { const armed = /armed/.test(idAt(b)); ship(L, b, seed + b.x0, { sail: armed, shields: armed }); } }),
            fish_rack: (b) => ({ y: b.y1 + 0.6, draw: () => fishRack(L, b, seed + b.x0, anyBehind(b)) }),
            stall: (b) => ({ y: b.y1 + 0.6, draw: () => stall(L, b, seed + b.x0 + b.y0 * 3, anyBehind(b), FX) }),
            nets: (b) => ({ y: b.y0 - 0.1, draw: () => hangingNets(img, b, seed + b.x0) }),
            terrace_wall: (b) => ({ y: b.y1 + 0.5, draw: () => terraceWall(img, b, seed) }),
            waterfall: (b) => ({ y: ch + 1, draw: () => waterfall(img, b, seed) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P2 = {
                cliff: () => { const inn = inner(x, y, 'cliff'); if (inn && hash(x, y, seed + 31) > 0.22) return; cragCell(L, x, y, seed, NP.cliff, NP.snow, 7, open(x, y + 1) || isWater(x, y + 1), open(x, y - 1), inn ? 2 : 1); },
                fir: () => fir(L, x, y, seed, behind(x, y), 0.75),
                skerry: () => skerry(img, cx, gy, seed + x * 3 + y),
                rowboat: () => rowboat(img, cx, gy, seed + x, true),
                barrel: () => barrel(L, cx, gy, seed + x),
                crate: () => crate(L, cx, gy, seed + x),
                fence: () => fence(L, map, nameAt, x, y, seed),
                steps: () => steps(img, map, N, x, y, seed),
                palisade: () => tall(L, [cx - 18, gy - 60, cx + 18, gy + 6], y * C, false, (S) => palisade(S, x * C, gy, seed + x * 7 + y, N(x - 1, y) === 'steps' || N(x + 1, y) === 'steps' ? (y === 1 ? 'banner' : 'post') : '')),
                harbour_bell: () => tall(L, [cx - 34, gy - 96, cx + 34, gy + 8], y * C, false, (S) => bellTower(S, cx, gy, seed)),
                memorial_stone: () => tall(L, [cx - 24, gy - 84, cx + 24, gy + 8], y * C - 6, open(x, y - 1), (S) => memorialStone(S, cx, gy, seed)),
                ring_stone: () => tall(L, [cx - 12, gy - 34, cx + 12, gy + 6], y * C, open(x, y - 1), (S) => ringStone(S, cx, gy, seed + x + y * 3)),
                brazier: () => tall(L, [cx - 14, gy - 40, cx + 14, gy + 6], y * C, false, (S) => brazier(S, cx, gy, seed + x, FX)),
                banner: () => tall(L, [cx - 14, gy - 70, cx + 18, gy + 6], y * C, open(x, y - 1), (S) => townBanner(S, cx, gy, seed + x)),
                crane: () => tall(L, [cx - 20, gy - 90, cx + 50, gy + 30], y * C - 8, open(x, y - 1), (S) => crane(S, cx, gy, seed)),
                customs_stone: () => customsStone(img, cx, gy, seed),
                log_pile: () => logPile(img, cx, gy, seed + x),
                workbench: () => workbench(img, cx, gy, seed + x)
            }[n];
            if (P2) items.push({ x, y: y + (n === 'fir' ? 0.8 : n === 'cliff' ? 0.95 : n === 'steps' ? -1 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Gulls on the water and the skerries.
        for (let n = 0; n < 9; n++) { const gx = Math.floor((0.55 + hash(n, 1, seed + 80) * 0.43) * img.w), gy2 = Math.floor((0.2 + hash(n, 2, seed + 80) * 0.75) * img.h); if (kind[gy2 * img.w + gx] === 3 && isWater(Math.floor(gx / C), Math.floor(gy2 / C))) { rectFill(img, gx - 2, gy2, 2, 1, [236, 238, 240]); rectFill(img, gx + 1, gy2, 2, 1, [236, 238, 240]); put(img, gx, gy2 + 1, [210, 214, 220]); } }
        edgeShade(img, 14, 0.3);
        // Sea mist coming in over the far water.
        for (let y = 0; y < img.h; y++) for (let x = Math.floor(img.w * 0.62); x < img.w; x++) {
            const a = clamp(sstep(0.62, 1.0, x / img.w) * 0.42 * (0.35 + fbm(x / 60, y / 26, seed + 90) * 1.1), 0, 0.5) * (y > img.h * 0.75 ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(y / 120)));
            if (a > 0.02 && isWater(Math.floor(x / C), Math.floor(y / C))) put(img, x, y, [168, 186, 200], a);
        }
        dusk([img, L.over], glows);
        const water = [];
        for (let i = 0; i < kind.length; i += 5) if (kind[i] === 3 && hash(i, 0, seed) < 0.1) water.push(i);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water, animate: animator(flames, smoke) };
    }
    /** Evening: everything goes blue and dim, then each lit window, torch and brazier warms the ground round it. */
    function dusk(layers, glows) {
        for (const im of layers) { const d = im.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = d[i] * 0.78 + 2; d[i + 1] = d[i + 1] * 0.82 + 5; d[i + 2] = d[i + 2] * 0.94 + 12; } }
        for (const g of glows) {
            const r = g.r, a = g.a == null ? 0.5 : g.a;
            const ry = Math.round(r * 0.8);
            for (let yy = -ry; yy <= ry; yy++) for (let xx = -r; xx <= r; xx++) {
                const x = Math.round(g.x) + xx, y = Math.round(g.y) + yy, dd = Math.hypot(xx, yy / 0.8) / r;
                if (dd >= 1 || x < 0 || y < 0 || x >= layers[0].w || y >= layers[0].h) continue;
                const w = (1 - dd) * (1 - dd) * a;
                for (const im of layers) { const i = (y * im.w + x) * 4, d = im.data; if (!d[i + 3]) continue; for (let j = 0; j < 3; j++) d[i + j] = d[i + j] + WARM[j] * w * 0.5 + (WARM[j] - d[i + j]) * w * 0.25; }
            }
        }
    }
    /** A lit window: dark frame, warm panes, a mullion. */
    function windowLit(S, x, y, w, h, FX) {
        rectFill(S, x - 1, y - 1, w + 2, h + 2, NP.oak[0]);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(S, x + i, y + j, pick(NP.glow, 0.55 + (1 - j / h) * 0.3 + hash(x + i, y + j, 5) * 0.12));
        for (let j = 0; j < h; j++) put(S, x + (w >> 1), y + j, NP.oak[1]);
        for (let i = 0; i < w; i++) put(S, x + i, y + (h >> 1), NP.oak[1]);
        rectFill(S, x - 1, y + h + 1, w + 2, 1, NP.snow[5]);
        FX.glows.push({ x: x + w / 2, y: y + h / 2 + 6, r: 30, a: 0.5 });
    }
    function roofPx(S, px, py, t, snowAmt, seed, course) {
        put(S, px, py, course ? ROOF[0] : pick(ROOF, t + (hash(px >> 1, py >> 1, seed) - 0.5) * 0.14));
        const m = fbm(px / 9, py / 7, seed + 5);
        if (m > 0.63 && !course) put(S, px, py, pick(NP.turf, 0.15 + m * 0.5), 0.7);                                   // moss
        if (snowAmt + (fbm(px / 8, py / 6, seed + 9) - 0.5) * 1.0 > 0.5) put(S, px, py, pick(NP.snow, 0.42 + t * 0.45 + hash(px, py, seed) * 0.14));
    }
    function timberPx(S, px, py, X, seed, dark = 0) {
        const bq = Math.floor((px - X) / 5), u = ((px - X) % 5 + 5) % 5;
        put(S, px, py, u === 0 ? NP.plank[0] : pick(NP.plank, 0.3 + (hash(bq, 0, seed) - 0.5) * 0.3 + (vnoise(bq * 3.1, py / 9, seed) - 0.5) * 0.28 + (u === 1 ? 0.12 : 0) - dark));
    }
    function chimney(S, x, y, seed, FX) {
        RK.blocks(S, x - 6, y - 26, 12, 30, seed, NP.cliff);
        for (let j = 0; j < 30; j++) { put(S, x - 7, y - 26 + j, NP.cliff[0]); put(S, x + 6, y - 26 + j, NP.cliff[0]); }
        rectFill(S, x - 8, y - 29, 16, 4, NP.cliff[3]); rectFill(S, x - 8, y - 30, 16, 2, NP.snow[5]); rectFill(S, x - 4, y - 28, 8, 2, [10, 8, 8]);
        FX.smoke.push({ x, y: y - 30 });
    }
    /** A timber house, gable end to the street: plank walls on a stone sill, a steep plank roof under snow and
     *  moss running back from crossed bargeboards. Wider plots get lower wings either side under their own roofs.
     *  The inn is the same house built large, with a sign, a banner and two chimneys; the shipwright's hall has
     *  its whole front open on the fire inside. */
    function building(L, b, seed, overhead, FX, o = {}) {
        // `z`: how big the house is built. 1 is the old scale; Skeldvik's rebuild (playtest 2026-11-11) uses 2, so walls,
        // doors and windows stand at Baker's Lane proportions next to a 32 px person (a door taller than you).
        const z = o.z || 1, Z = (v) => Math.round(v * z);
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, Y0 = b.y0 * C, B = (b.y1 + 1) * C - 3, W = X1 - X0, mx = Math.round(X0 + W / 2);
        const wallH = Z(o.wallH || 26), gw = Math.round(Math.min(Z(o.gw || 46), W / 2 - 1)), rise = Math.round(gw * 0.74), wallTop = B - wallH, apex = wallTop - rise;
        const depth = Math.max(8, Math.min(Z(o.depth || 70), apex - (Y0 - 14))), wings = W / 2 - gw > Z(10), eave = (gw + Z(6));
        tall(L, [X0 - Z(16), apex - depth - Z(40), X1 + Z(16), B + 8], Y0 + 8, overhead, (S) => {
            shadow(S, mx + Z(6), B + 3, W / 2 + Z(10), Z(7), 0.55);
            if (wings) {
                const wt = B - wallH + Z(4), ridge = Math.max(Y0 + 2, wt - Z(76));
                for (let py = wt; py < B; py++) for (let px = X0; px < X1; px++) timberPx(S, px, py, X0, seed + 3, py < wt + Z(5) ? 0.25 : 0.05);
                RK.blocks(S, X0, B - Z(4), W, Z(4), seed + 1, NP.rock);
                for (let px = X0; px < X1; px++) put(S, px, B, NP.rock[0]);
                for (const side of [-1, 1]) { const wx = side < 0 ? Math.round((X0 + mx - gw) / 2) : Math.round((X1 + mx + gw) / 2); if (Math.abs(wx - mx) - gw > Z(9)) windowLit(S, wx - Z(4), wt + Z(7), Z(8), Z(8), FX); }
                for (let py = ridge; py <= wt + 2; py++) {
                    const f = (py - ridge) / (wt + 2 - ridge), xa = X0 + 3 - f * Z(8), xb = X1 - 3 + f * Z(8);
                    for (let px = Math.round(xa); px < xb; px++) roofPx(S, px, py, 0.72 - f * 0.45, 1.0 - f * 0.95, seed + 11, (py - ridge) % Z(6) === Z(6) - 1 || (hash(Math.floor((py - ridge) / Z(6)), 0, seed) * 40 + px) % 23 < 1);
                    put(S, Math.round(xa) - 1, py, ROOF[0]); put(S, Math.round(xb), py, ROOF[0]);
                }
                for (let px = X0 - Z(5); px < X1 + Z(5); px++) { put(S, px, wt + 3, ROOF[0]); put(S, px, wt + 4, NP.shadow, 0.5); put(S, px, ridge - 1, NP.snow[6]); }
            }
            // The two roof planes running back from the gable.
            for (let u = 0; u <= eave; u++) for (const side of [-1, 1]) {
                if (u === 0 && side > 0) continue;
                const px = mx + side * u, yf = apex - 3 + (u * (wallTop + 5 - apex)) / eave;
                for (let py = Math.round(yf - depth); py <= yf; py++) roofPx(S, px, py, (side < 0 ? 0.72 : 0.5) - (u / eave) * 0.22, 0.95 - (u / eave) * 0.85 + ((yf - py) / depth) * 0.2, seed + 13, u % Z(6) === Z(6) - 1 || (hash(Math.floor(u / Z(6)), side, seed) * 30 + py) % 19 < 1);
                put(S, px, Math.round(yf - depth) - 1, ROOF[0]);
                if (u === eave) for (let py = Math.round(yf - depth); py <= yf; py++) put(S, px + side, py, ROOF[0]);
            }
            for (let py = apex - 3 - depth; py <= apex - 3; py++) { put(S, mx, py, NP.snow[6]); put(S, mx - 1, py, NP.snow[5]); }
            // The gable wall.
            const face = shape(); poly(face, S, [[mx - gw, B], [mx - gw, wallTop], [mx, apex], [mx + gw, wallTop], [mx + gw, B]], 0);
            for (const [i] of face.px) { const px = i % S.w, py = (i / S.w) | 0, under = py - (apex + (Math.abs(px - mx) * (wallTop - apex)) / gw); timberPx(S, px, py, mx - gw, seed, under < Z(7) ? 0.28 - under * 0.03 / z : 0); }
            for (let px = mx - gw; px <= mx + gw; px++) { put(S, px, wallTop, NP.oak[5]); put(S, px, wallTop + 1, NP.oak[2]); put(S, px, wallTop + 2, NP.oak[0]); }
            for (const px of [mx - gw, mx + gw - Z(3)]) for (let py = wallTop; py < B; py++) { rectFill(S, px, py, Z(3), 1, NP.oak[3]); put(S, px, py, NP.oak[5]); put(S, px + Z(3), py, NP.oak[0]); }
            if (z > 1) for (let py = wallTop + Z(10); py < B - Z(6); py += Z(12)) for (let px = mx - gw + Z(3); px < mx + gw - Z(3); px++) { put(S, px, py, NP.oak[1]); put(S, px, py + 1, NP.oak[4], 0.5); }   // a sill beam or two across a big wall
            RK.blocks(S, mx - gw, B - Z(4), gw * 2, Z(5), seed + 1, NP.rock);
            for (let px = mx - gw; px <= mx + gw; px++) { put(S, px, B + 1, NP.rock[0]); if (hash(px, 2, seed) < 0.45) put(S, px, B - Z(5), NP.snow[5]); }
            if (o.open) {                                              // the shipwright's hall: the whole front open on the work inside
                const dw = Math.round(gw * 0.62), dh = wallH + Z(8);
                for (let py = B - dh; py < B - 1; py++) for (let px = mx - dw; px <= mx + dw; px++) { const f = (py - (B - dh)) / dh; put(S, px, py, [26 + f * 150, 14 + f * 78, 8 + f * 24]); }
                for (let px = mx - dw - 2; px <= mx + dw + 2; px++) { put(S, px, B - dh - 1, NP.oak[5]); put(S, px, B - dh - 2, NP.oak[3]); put(S, px, B - dh, NP.oak[0]); }
                for (const px of [mx - dw - Z(3), mx + dw + 1]) for (let py = B - dh; py < B; py++) { rectFill(S, px, py, Z(3), 1, NP.oak[3]); put(S, px, py, NP.oak[5]); }
                for (const px of [mx - dw + Z(10), mx + dw - Z(14)]) { rectFill(S, px, B - Z(16), Z(5), Z(15), [30, 18, 10]); rectFill(S, px - Z(2), B - Z(18), Z(9), Z(3), [30, 18, 10]); }                     // trestles against the light
                FX.glows.push({ x: mx, y: B - Z(6), r: Z(78), a: 0.75 }); FX.flames.push({ x: mx - Z(6), y: B - Z(8) });
            } else {
                const dw2 = Z(9), dh2 = Z(24);                           // the door: a person's height and a bit
                rectFill(S, mx - dw2, B - dh2, dw2 * 2, dh2 - 1, NP.oak[0]);
                RK.planks(S, mx - dw2 + 2, B - dh2 + 2, dw2 * 2 - 4, dh2 - 3, seed + 9, NP.oak.slice(1), true);
                rectFill(S, mx - dw2 - 1, B - dh2 - 2, dw2 * 2 + 2, Z(2), NP.oak[5]); rectFill(S, mx + Z(4), B - Z(11), z, z, PAL.iron[4]); rectFill(S, mx + Z(4), B - Z(10), z, z, PAL.iron[2]);
                for (const side of [-1, 1]) if (gw > Z(34)) windowLit(S, mx + side * Math.round(gw * 0.58) - Z(4), wallTop + Z(8), Z(8), Z(9), FX);
                for (let px = mx - dw2 - Z(3); px <= mx + dw2 + Z(3); px++) { put(S, px, B + 1, NP.cliff[4]); put(S, px, B + 2, NP.cliff[5]); put(S, px, B + 3, NP.cliff[2]); }                       // the door stone
                FX.glows.push({ x: mx, y: B + 4, r: Z(26), a: 0.28 });
            }
            if (rise > Z(30) && o.sign !== 'axes') windowLit(S, mx - Z(4), apex + Math.round(rise * 0.5), Z(8), Z(8), FX);
            if (o.sign === 'axes') {                                   // crossed axes on a board in the gable
                const sy = apex + Math.round(rise * 0.55);
                rectFill(S, mx - Z(13), sy - Z(9), Z(26), Z(18), NP.oak[1]); rectFill(S, mx - Z(12), sy - Z(8), Z(24), Z(16), NP.oak[3]);
                const ax = shape(); thick(ax, S, mx - Z(8), sy + Z(6), mx + Z(8), sy - Z(6), 0.8 * z); thick(ax, S, mx + Z(8), sy + Z(6), mx - Z(8), sy - Z(6), 0.8 * z); fill(S, ax, NP.wool.slice(3), { edge: false });
                rectFill(S, mx + Z(5), sy - Z(8), Z(5), Z(5), PAL.iron[4]); rectFill(S, mx - Z(10), sy - Z(8), Z(5), Z(5), PAL.iron[4]);
            }
            if (o.sign === 'inn') {                                    // a painted board over the door and a hanging sign with a mug on it
                rectFill(S, mx - Z(22), B - Z(40), Z(44), Z(11), NP.oak[0]); rectFill(S, mx - Z(21), B - Z(39), Z(42), Z(9), [22, 22, 26]);
                for (let k = 0; k < 9; k++) rectFill(S, mx - Z(17) + k * Z(4), B - Z(36) + (k % 3 === 1 ? z : 0), Z(2), Z(3) + (k % 2) * z, [214, 204, 178]);
                const hx = mx + Z(26); rectFill(S, hx, B - Z(34), Z(12), z, PAL.iron[2]); rectFill(S, hx + Z(2), B - Z(33), Z(9), Z(11), NP.oak[1]); rectFill(S, hx + Z(3), B - Z(32), Z(7), Z(9), NP.oak[4]);
                rectFill(S, hx + Z(4), B - Z(30), Z(4), Z(6), [232, 190, 80]); rectFill(S, hx + Z(4), B - Z(31), Z(4), z, [244, 240, 226]); rectFill(S, hx + Z(8), B - Z(28), z, Z(2), [232, 190, 80]);
            }
            if (o.lantern) for (const side of [-1, 1]) { const lx = mx + side * Z(14); rectFill(S, lx - 1, B - Z(22), 3, 5, PAL.iron[1]); rectFill(S, lx - 1, B - Z(21), 3, 3, NP.glow[4]); FX.flames.push({ x: lx, y: B - Z(20) }); FX.glows.push({ x: lx, y: B - Z(14), r: 34, a: 0.5 }); }
            if (o.banner) clothBanner(S, mx - Math.round(gw * 0.58) - (gw > Z(34) ? Z(16) : -Z(6)), wallTop + Z(5), Z(11), Z(26), seed);
            // Bargeboards, crossed past the ridge; the inn's end in carved beasts' heads.
            for (const side of [-1, 1]) {
                const bb = shape(); thick(bb, S, mx + side * (eave + Z(2)), wallTop + Z(7), mx - side * Z(7), apex - Z(12), 1.8 * z);
                fill(S, bb, NP.plank.slice(3), { outline: NP.oak[0] });
                for (const [i] of bb.px) if (!bb.px.has(i - S.w)) { const px = i % S.w, py = (i / S.w) | 0; put(S, px, py - 1, NP.snow[6]); if (hash(px, py, seed) < 0.5) put(S, px, py - 2, NP.snow[5]); }
                if (o.carved) { const hx = mx - side * Z(8), hy = apex - Z(14); rectFill(S, hx - (side > 0 ? Z(5) : 0), hy - Z(4), Z(6), Z(4), NP.plank[5]); rectFill(S, hx - side * Z(5), hy - Z(2), z, z, NP.plank[6]); rectFill(S, hx - side * Z(2), hy - Z(3), z, z, [20, 14, 10]); rectFill(S, hx, hy - Z(5), z, z, NP.plank[6]); }
            }
            for (let k = 0; k < (o.chimneys || 0); k++) chimney(S, mx + (k ? -1 : 1) * (wings ? gw + Math.round((W / 2 - gw) * 0.5) : Math.round(gw * 0.55)), wings ? Math.max(Y0 + 8, B - wallH - Z(36)) : apex - depth + Z(22) + Math.round(gw * 0.3), seed + k, FX);
        });
    }
    /** Skeldvik's banner: madder red with a pale branching mark. */
    function clothBanner(S, x, y, w, h, seed) {
        const cl = shape(); poly(cl, S, [[x, y], [x + w, y], [x + w, y + h - 4], [x + w / 2, y + h], [x, y + h - 4]], (px, py) => ((px - x) / w) * -0.7 + Math.sin(py / 4 + seed) * 0.2);
        fill(S, cl, NP.madder.slice(1), { tex: 0.25, seed, outline: [26, 8, 8] });
        const mc = [226, 216, 196], mx = Math.round(x + w / 2);
        for (let j = 5; j < h - 8; j++) put(S, mx, y + j, mc);
        for (const [dy, r] of [[7, 3], [11, 3], [15, 2]]) for (let k = 1; k <= r; k++) { put(S, mx - k, y + dy - k, mc); put(S, mx + k, y + dy - k, mc); }
        rectFill(S, x - 1, y - 2, w + 2, 2, NP.oak[4]);
    }
    function townBanner(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 6, 2.5, 0.4);
        const p = shape(); thick(p, S, cx - 4, gy, cx - 4, gy - 62, 1.5); thick(p, S, cx - 4, gy - 58, cx + 12, gy - 58, 1); fill(S, p, NP.plank.slice(2), { outline: NP.plank[0] });
        put(S, cx - 4, gy - 65, NP.snow[6]); put(S, cx - 5, gy - 64, NP.snow[5]);
        clothBanner(S, cx - 1, gy - 56, 12, 28, seed);
    }
    /** The gate palisade: sharpened logs with snow on their points. */
    function palisade(S, X0, gy, seed, extra) {
        for (let k = 0; k < 4; k++) {
            const x = X0 + k * 8, h = 44 + hash(k, 1, seed) * 8, lg = shape();
            poly(lg, S, [[x, gy], [x, gy - h + 6], [x + 4, gy - h], [x + 8, gy - h + 6], [x + 8, gy]], (px) => ((px - x - 4) / 4) * -0.7);
            fill(S, lg, NP.oak, { tex: 0.3, seed: seed + k, outline: NP.oak[0] });
            for (let i = 2; i < 7; i++) put(S, x + i, gy - h + 5 - (i === 4 ? 4 : i === 3 || i === 5 ? 2 : 0), NP.snow[6]);
        }
        for (let px = X0; px < X0 + C; px++) { put(S, px, gy - 30, NP.oak[1]); put(S, px, gy - 29, NP.oak[5]); if (hash(px, 3, seed) < 0.6) put(S, px, gy + 1, NP.snow[5]); }
        if (extra === 'banner') clothBanner(S, X0 + 10, gy - 44, 12, 26, seed);
    }
    /** Steps cut in stone: treads across the way you climb. */
    function steps(img, map, N, x, y, seed) {
        const X0 = x * C, Y0 = y * C, side = !GROUND.has(N(x, y - 1)) && !GROUND.has(N(x, y + 1)) || (N(x, y - 1) !== 'steps' && N(x, y + 1) !== 'steps' && GROUND.has(N(x - 1, y)) && GROUND.has(N(x + 1, y)) && N(x - 1, y) !== 'steps' && N(x + 1, y) !== 'steps' && N(x - 1, y) !== N(x + 1, y));
        for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) {
            const a = side ? i : j, u = a % 8, bq = Math.floor((side ? j : i + Math.floor(a / 8) * 5) / 11);
            put(img, X0 + i, Y0 + j, u === 0 ? FLAG[6] : u === 7 ? FLAG[0] : u === 6 ? FLAG[1] : pick(FLAG, 0.35 + hash(bq, Math.floor(a / 8), seed + x) * 0.3 + (u < 3 ? 0.08 : 0)));
            if (u > 0 && u < 3 && hash(X0 + i, Y0 + j, seed + 4) < 0.25) put(img, X0 + i, Y0 + j, NP.snow[5]);
        }
        for (const [dx, ex] of [[-1, 0], [1, C - 1]]) if (!GROUND.has(N(x + dx, y)) || (!side && N(x + dx, y) !== 'steps')) for (let j = 0; j < C; j++) { put(img, X0 + ex, Y0 + j, FLAG[0]); put(img, X0 + ex + (dx < 0 ? 1 : -1), Y0 + j, FLAG[2]); }
    }
    /** The face of the bell terrace: fitted stone, snow along the top. */
    function terraceWall(img, b, seed) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C;
        RK.blocks(img, X0, Y0, X1 - X0, C - 2, seed + 5, NP.cliff);
        for (let px = X0; px < X1; px++) {
            put(img, px, Y0, NP.cliff[7]); put(img, px, Y0 + 1, NP.cliff[6]); if (hash(px, 1, seed) < 0.85) put(img, px, Y0 - 1, NP.snow[6]); if (hash(px, 2, seed) < 0.5) put(img, px, Y0, NP.snow[5]);
            put(img, px, Y0 + C - 2, NP.cliff[0]); for (let j = 0; j < 5; j++) put(img, px, Y0 + C - 1 + j, NP.shadow, 0.5 - j * 0.1);
            if (vnoise(px / 3, 0, seed + 2) > 0.62) for (let j = 0; j < 3 + hash(px, 4, seed) * 5; j++) put(img, px, Y0 + C - 3 - j, RP.moss[1 + (j & 1)], 0.8);
        }
        for (let j = 0; j < C - 2; j++) { put(img, X0, Y0 + j, NP.cliff[0]); put(img, X1 - 1, Y0 + j, NP.cliff[0]); }
    }
    /** The harbour bell: bronze gone green with salt, hung in a timber frame under its own roof on a stone footing. */
    function bellTower(S, cx, gy, seed) {
        shadow(S, cx + 5, gy + 2, 26, 6, 0.5);
        RK.blocks(S, cx - 22, gy - 10, 44, 12, seed, NP.cliff);
        for (let px = cx - 22; px < cx + 22; px++) { put(S, px, gy - 10, NP.cliff[7]); put(S, px, gy + 2, NP.cliff[0]); if (hash(px, 1, seed) < 0.7) put(S, px, gy - 11, NP.snow[6]); }
        for (const px of [cx - 18, cx + 15]) { const p = shape(); box(p, S, px, gy - 64, 4, 54, 0); for (const [i] of p.px) p.px.set(i, (((i % S.w) - px - 2) / 2) * -0.6); fill(S, p, NP.plank.slice(1), { tex: 0.3, seed, outline: NP.oak[0] }); }
        const br = shape(); thick(br, S, cx - 16, gy - 40, cx - 4, gy - 60, 1.2); thick(br, S, cx + 16, gy - 40, cx + 4, gy - 60, 1.2); thick(br, S, cx - 18, gy - 60, cx + 18, gy - 60, 1.6); fill(S, br, NP.plank.slice(2), { outline: NP.oak[0] });
        for (let py = gy - 90; py <= gy - 62; py++) { const f = (py - (gy - 90)) / 28, hw = 4 + f * 24; for (let px = Math.round(cx - hw); px <= cx + hw; px++) roofPx(S, px, py, 0.7 - f * 0.3 - (px > cx ? 0.15 : 0), 0.95 - f * 0.7, seed + 3, (py - gy) % 5 === 0); put(S, Math.round(cx - hw) - 1, py, ROOF[0]); put(S, Math.round(cx + hw) + 1, py, ROOF[0]); }
        for (let px = cx - 29; px <= cx + 29; px++) { put(S, px, gy - 61, ROOF[0]); put(S, px, gy - 60, NP.shadow, 0.5); }
        const bl = shape(); poly(bl, S, [[cx - 5, gy - 54], [cx + 5, gy - 54], [cx + 8, gy - 38], [cx + 11, gy - 33], [cx - 11, gy - 33], [cx - 8, gy - 38]], (px) => ((px - cx) / 10) * -0.8);
        fill(S, bl, NP.bronze, { outline: NP.bronze[0] });
        rectFill(S, cx - 2, gy - 58, 4, 4, PAL.iron[2]); for (let px = cx - 10; px <= cx + 10; px++) put(S, px, gy - 35, NP.bronze[4]);
        put(S, cx, gy - 32, PAL.iron[2]); put(S, cx, gy - 31, PAL.iron[3]);
        for (let j = gy - 30; j < gy - 9; j++) put(S, cx + (j % 5 === 0 ? 1 : 0), j, NP.wool[j > gy - 18 ? 5 : 3]);                                                         // the rope, pale where hands go
    }
    /** The memorial stone: a standing stone twice a man's height, cut with knotwork, a board of names pegged to
     *  it. Half the board has been split away along the grain; the wood underneath is still pale. */
    function memorialStone(S, cx, gy, seed) {
        shadow(S, cx + 5, gy + 2, 17, 5, 0.5);
        const s = shape(); poly(s, S, [[cx - 13, gy], [cx - 14, gy - 40], [cx - 10, gy - 66], [cx - 2, gy - 76], [cx + 7, gy - 72], [cx + 13, gy - 54], [cx + 14, gy - 24], [cx + 13, gy]], (px, py) => ((px - cx) / 14) * -0.5 + (vnoise(px / 4, py / 5, seed) - 0.5) * 0.5);
        fill(S, s, NP.cliff.slice(1), { outline: NP.cliff[0] });
        for (const [i] of s.px) {
            const px = i % S.w, py = (i / S.w) | 0;
            if (py > gy - 8 && vnoise(px / 2, py / 2, seed + 3) > 0.55) put(S, px, py, RP.moss[1 + (px & 1)]);
            if (!s.px.has(i - S.w)) { put(S, px, py, NP.snow[6]); put(S, px, py + 1, NP.snow[5]); if (hash(px, 1, seed) < 0.6) put(S, px, py + 2, NP.snow[4]); }
        }
        for (let py = gy - 66; py < gy - 42; py++) {                   // the knot: two bands crossing over and under
            const a = Math.sin((py - gy) / 3.2) * 6;
            for (const sgn of [-1, 1]) { const px = Math.round(cx + sgn * a); if (!(sgn > 0 && Math.abs(a) < 1.5)) { put(S, px, py, NP.cliff[0]); put(S, px + 1, py, NP.cliff[7], 0.7); } }
        }
        for (let px = cx - 9; px <= cx + 9; px++) { put(S, px, gy - 68, NP.cliff[1]); put(S, px, gy - 41, NP.cliff[1]); }
        // The board: grey with weather and cut with rows of names on the left; the right half gone, a pale ragged edge.
        const X = cx - 10, Y = gy - 37, edge = (py) => cx + 1 + Math.round(Math.sin(py * 1.3) * 1.5 + Math.sin(py * 0.5) * 1);
        for (let py = Y; py < Y + 26; py++) for (let px = X; px < cx + 11; px++) {
            if (px < edge(py)) put(S, px, py, pick(NP.plank, 0.55 + (vnoise(px / 5, py / 1.5, seed + 5) - 0.5) * 0.3));
            else if (px < edge(py) + 2) put(S, px, py, [226, 204, 160]);                                                              // fresh wood
        }
        for (let py = Y + 2; py < Y + 25; py += 3) for (let px = X + 1; px < edge(py) - 1; px++) if (hash(px, py, seed) < 0.72) put(S, px, py, NP.plank[1]);
        for (let px = X; px < cx + 2; px++) { put(S, px, Y - 1, NP.plank[0]); put(S, px, Y + 26, NP.plank[0]); }
        for (let py = Y; py < Y + 26; py++) put(S, X - 1, py, NP.plank[0]);
        put(S, X + 1, Y + 1, PAL.iron[4]); put(S, X + 1, Y + 24, PAL.iron[4]);
        for (const [dx, dy] of [[8, 6], [9, 15], [7, 22]]) put(S, cx + dx, Y + dy, PAL.iron[3]);                                         // the pegs left in the stone
        for (let k = 0; k < 5; k++) put(S, cx + 4 + k * 2, gy + 2 + (k & 1), [226, 204, 160]);                                          // splinters at its foot
    }
    function ringStone(S, cx, gy, seed) {
        shadow(S, cx + 3, gy + 1, 8, 3, 0.4);
        const h = 20 + hash(seed, 1, 3) * 8, s = shape(); poly(s, S, [[cx - 6, gy], [cx - 6, gy - h + 6], [cx - 2, gy - h], [cx + 4, gy - h + 3], [cx + 6, gy]], (px, py) => ((px - cx) / 6) * -0.5 + (vnoise(px / 3, py / 4, seed) - 0.5) * 0.5);
        fill(S, s, NP.cliff.slice(1), { outline: NP.cliff[0] });
        for (const [i] of s.px) if (!s.px.has(i - S.w)) { put(S, i % S.w, (i / S.w) | 0, NP.snow[6]); put(S, i % S.w, ((i / S.w) | 0) + 1, NP.snow[5]); }
    }
    /** A fire bowl on a stone foot. */
    function brazier(S, cx, gy, seed, FX) {
        shadow(S, cx + 3, gy + 1, 9, 3, 0.4);
        RK.blocks(S, cx - 5, gy - 12, 10, 13, seed, NP.cliff); for (let j = 0; j < 13; j++) { put(S, cx - 6, gy - 12 + j, NP.cliff[0]); put(S, cx + 5, gy - 12 + j, NP.cliff[0]); }
        const bw = shape(); poly(bw, S, [[cx - 9, gy - 19], [cx + 9, gy - 19], [cx + 6, gy - 12], [cx - 6, gy - 12]], (px) => ((px - cx) / 9) * -0.6); fill(S, bw, PAL.iron, { outline: PAL.iron[0] });
        const f = shape(); ellipse(f, S, cx, gy - 24, 5, 6.5); fill(S, f, NP.glow.slice(1), { edge: false });
        const f2 = shape(); ellipse(f2, S, cx, gy - 22, 2.6, 3.6); fill(S, f2, NP.glow.slice(3), { edge: false });
        FX.flames.push({ x: cx, y: gy - 24, big: true }); FX.glows.push({ x: cx, y: gy - 10, r: 62, a: 0.7 });
    }
    /** A mooring post with a turn of rope; some carry a torch. */
    function post(img, x, y, seed, torch) {
        const h = torch ? 22 : 12, p = shape(); box(p, img, x - 2, y - h + 1, 5, h, 0); for (const [i] of p.px) p.px.set(i, (((i % img.w) - x) / 2.5) * -0.6);
        fill(img, p, NP.plank.slice(1), { tex: 0.3, seed, outline: NP.plank[0] });
        rectFill(img, x - 2, y - h, 5, 1, torch ? PAL.iron[2] : NP.snow[6]); rectFill(img, x - 3, y - 6, 7, 2, NP.wool[3]); rectFill(img, x - 3, y - 4, 7, 1, NP.wool[1]);
        if (torch) { rectFill(img, x - 1, y - h - 5, 3, 5, NP.glow[4]); put(img, x, y - h - 6, NP.glow[NP.glow.length - 1]); torch.flames.push({ x, y: y - h - 3 }); torch.glows.push({ x, y: y - h + 8, r: 44, a: 0.6 }); }
    }
    /** A clinker-built ship at her mooring, seen from the wharf: overlapping strakes, stem and stern posts curling
     *  up to carved heads, mast and yard. `sail`: set, in stripes of red and undyed wool with Skeldvik's mark.
     *  `shields`: hung along the rail. Without them she is the trader, her sail furled on a lowered yard. */
    function ship(L, b, seed, { sail = false, shields = false } = {}) {
        const X0 = b.x0 * C + 12, X1 = (b.x1 + 1) * C - 12, W = X1 - X0, B = (b.y1 + 1) * C - 8, mx = Math.round(X0 + W / 2), mastTop = B - (sail ? 112 : 86);
        const bow = (px) => Math.pow(Math.abs((px - X0) / W - 0.5) * 2, 2.8), keel = (px) => B - bow(px) * 16, sheer = (px) => B - (sail ? 15 : 18) - bow(px) * 24;
        tall(L, [X0 - 24, mastTop - 8, X1 + 24, B + 16], b.y0 * C, false, (S) => {
            for (let px = X0 - 4; px < X1 + 4; px++) for (let j = 0; j < 9; j++) put(S, px + 2, B + j, NP.shadow, 0.55 - j * 0.06);                            // her shadow on the water
            const hull = shape();
            for (let px = X0; px <= X1; px++) for (let py = Math.round(sheer(px)); py <= keel(px); py++) sset(hull, S, px, py, ((py - sheer(px)) / 18) * -0.8 + 0.4);
            fill(S, hull, NP.oak, { outline: NP.oak[0] });
            for (const [i] of hull.px) { const px = i % S.w, py = (i / S.w) | 0, d = Math.round(keel(px)) - py; if (d % 4 === 3) put(S, px, py, NP.oak[0], 0.75); else if (d % 4 === 1 && px % 7 === 0) put(S, px, py, PAL.iron[4]); }
            for (let px = X0; px <= X1; px++) { put(S, px, Math.round(sheer(px)), NP.oak[6]); put(S, px, Math.round(sheer(px)) + 1, NP.oak[5]); }
            // Stem and stern: the posts sweep up and curl; a carved head looks out over the water at the bow.
            for (const [px, dir] of [[X0, -1], [X1, 1]]) {
                const st = shape(), y0 = sheer(px);
                thick(st, S, px + dir * -3, y0 + 4, px + dir * 5, y0 - 16, 2); thick(st, S, px + dir * 5, y0 - 16, px + dir * 4, y0 - 26, 1.7); thick(st, S, px + dir * 4, y0 - 26, px + dir * 9, y0 - 30, 1.6);
                fill(S, st, NP.oak.slice(2), { outline: NP.oak[0] });
                if (dir < 0) { rectFill(S, px - 14, y0 - 33, 6, 4, NP.oak[5]); rectFill(S, px - 16, y0 - 31, 3, 3, NP.oak[4]); put(S, px - 12, y0 - 32, [236, 200, 110]); put(S, px - 10, y0 - 35, NP.oak[6]); put(S, px - 8, y0 - 35, NP.oak[6]); }
                else { put(S, px + 10, y0 - 31, NP.oak[6]); put(S, px + 11, y0 - 30, NP.oak[5]); put(S, px + 10, y0 - 29, NP.oak[4]); }
            }
            if (shields) for (let px = X0 + 22; px < X1 - 18; px += 13) {
                const sy = sheer(px) + 6, sh = shape(); ellipse(sh, S, px, sy, 5.2, 5.2);
                fill(S, sh, Math.floor((px - X0) / 13) % 2 ? NP.wool.slice(2) : NP.madder.slice(1), { outline: [16, 12, 10] }); put(S, px, sy, PAL.iron[4]); put(S, px + 1, sy, PAL.iron[3]);
            } else { crate({ base: S }, mx + 26, sheer(mx + 26) + 2, seed + 1); barrel({ base: S }, mx - 30, sheer(mx - 30) + 3, seed + 2); const bl = shape(); ellipse(bl, S, mx - 12, sheer(mx) - 2, 9, 5); fill(S, bl, NP.wool, { tex: 0.3, seed, outline: NP.wool[0] }); }
            const ms = shape(); thick(ms, S, mx, sheer(mx) + 2, mx, mastTop, 1.6); fill(S, ms, NP.oak.slice(2), { outline: NP.oak[0] });
            const line = (x1, y1, x2, y2, a) => { const n = Math.hypot(x2 - x1, y2 - y1); for (let t = 0; t <= n; t++) put(S, x1 + ((x2 - x1) * t) / n, y1 + ((y2 - y1) * t) / n, [34, 28, 22], a); };
            line(mx, mastTop + 2, X0 + 2, sheer(X0) - 14, 0.6); line(mx, mastTop + 2, X1 - 2, sheer(X1) - 14, 0.6);
            if (sail) {
                const yy = mastTop + 8, hw = Math.round(W * 0.25), sb = sheer(mx) - 20;
                const yd = shape(); thick(yd, S, mx - hw - 6, yy, mx + hw + 6, yy, 1.3); fill(S, yd, NP.oak.slice(2), { outline: NP.oak[0] });
                for (let py = yy + 2; py <= sb + 8; py++) for (let px = mx - hw; px <= mx + hw; px++) {
                    const u = (px - (mx - hw)) / (hw * 2), f = (py - yy) / (sb - yy), belly = Math.sin(u * Math.PI) * 7;
                    if (py > sb + belly) continue;
                    const stripe = Math.floor(u * 5) % 2 === 0, sh = 0.62 + Math.sin(u * Math.PI * 5) * 0.1 - f * 0.18 + (vnoise(px / 5, py / 9, seed) - 0.5) * 0.2 - (u > 0.5 ? 0.1 : 0);
                    put(S, px, py, pick(stripe ? NP.madder : NP.wool, sh + (stripe ? 0.15 : 0.1)));
                    if (px === mx - hw || px === mx + hw || Math.abs(u * 5 - Math.round(u * 5)) < 0.02) put(S, px, py, stripe ? NP.madder[0] : NP.wool[0], 0.6);
                }
                const mc = [232, 224, 204], cy = Math.round((yy + sb) / 2);                                                         // Skeldvik's mark on the middle stripe
                for (let j = -13; j <= 13; j++) rectFill(S, mx - 1, cy + j, 2, 1, mc);
                for (const [dy, r] of [[-8, 6], [-2, 6], [4, 5]]) for (let k = 1; k <= r; k++) { rectFill(S, mx - 1 - k, cy + dy - k, 2, 1, mc); rectFill(S, mx + k, cy + dy - k, 2, 1, mc); }
                line(mx - hw, sb, X0 + 30, sheer(X0 + 30), 0.5); line(mx + hw, sb, X1 - 30, sheer(X1 - 30), 0.5);
            } else {
                const yy = sheer(mx) - 22, hw = Math.round(W * 0.3);
                const yd = shape(); thick(yd, S, mx - hw, yy, mx + hw, yy - 2, 1.2); fill(S, yd, NP.oak.slice(2), { outline: NP.oak[0] });
                const sl = shape(); thick(sl, S, mx - hw + 4, yy + 3, mx + hw - 4, yy + 1, 2.6); for (const [i, v] of sl.px) sl.px.set(i, v + Math.sin((i % S.w) / 2.5) * 0.25);
                fill(S, sl, NP.wool.slice(1), { outline: NP.wool[0] });
                for (let px = mx - hw + 8; px < mx + hw - 6; px += 9) for (let j = -1; j <= 5; j++) put(S, px, yy + j, NP.oak[1]);
                rectFill(S, mx + 1, mastTop + 1, 8, 3, NP.woad[3]); rectFill(S, mx + 8, mastTop + 2, 3, 2, NP.woad[1]);
            }
            for (let px = X0 + 6; px < X1 - 6; px += 3) if (hash(px, 1, seed) < 0.5) put(S, px, B + 1 + hash(px, 2, seed) * 2, NP.foam[1], 0.7);
        });
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
    /** A rock standing out of the fjord, snow on top, the water white round its foot. */
    function skerry(img, cx, gy, seed) {
        for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; put(img, cx + Math.cos(t) * (15 + hash(a, 1, seed) * 3), gy - 6 + Math.sin(t) * (7 + hash(a, 2, seed) * 2), NP.foam[1 + (a & 1)], 0.7); }
        stone(img, cx - 2, gy - 10, 12, 9, seed, NP.cliff, NP.snow, 0.75); stone(img, cx + 10, gy - 5, 6, 4.5, seed + 5, NP.cliff, NP.snow, 0.6);
    }
    /** The fall across the fjord: one white thread down the cliff, lost in mist. */
    function waterfall(img, b, seed) {
        const cx = b.x0 * C + 16, y0 = b.y0 * C + 10, y1 = (b.y1 + 1) * C + 6;
        for (let py = y0; py < y1; py++) { const hw = 4 + ((py - y0) / (y1 - y0)) * 4 + Math.sin(py / 9) * 1.2; for (let px = Math.round(cx - hw); px <= cx + hw; px++) { const e = Math.abs(px - cx) / hw; put(img, px + Math.round(Math.sin(py / 30) * 2), py, pick(NP.foam, 0.4 + hash(px, py >> 2, seed) * 0.6 - e * 0.3), 0.92 - e * 0.5); } }
        for (let yy = -16; yy <= 14; yy++) for (let xx = -34; xx <= 34; xx++) { const d = Math.hypot(xx / 34, yy / 15); if (d < 1) put(img, cx + xx, y1 + yy + 4, [206, 220, 228], (1 - d) * (0.5 + fbm((cx + xx) / 8, (y1 + yy) / 6, seed) * 0.5) * 0.75); }
    }
    /** Nets hung from the wharf's edge to dry, down to the water. */
    function hangingNets(img, b, seed) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, Y = b.y0 * C + 1;
        for (let px = X0; px < X1; px++) { const sag = Math.sin(((px - X0) / (X1 - X0)) * Math.PI * 2) * 3 + 16; for (let py = Y; py < Y + sag; py++) if ((px + py) % 4 === 0 || (px - py + 400) % 4 === 0) put(img, px, py, [156, 146, 118], 0.9); }
        for (let px = X0; px < X1; px++) put(img, px, Y, NP.wool[2]);
        for (let k = 0; k < 5; k++) { const fx = X0 + 5 + k * ((X1 - X0 - 10) / 4), f = shape(); ellipse(f, img, fx, Y + 13 + (k % 2) * 3, 2, 1.6); fill(img, f, NP.oak.slice(4), { outline: NP.oak[1] }); }
    }
    /** The wharf crane: a post, a jib, and a net of cod swinging from the rope. */
    function crane(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 10, 3, 0.45);
        const fr = shape(); thick(fr, S, cx, gy, cx, gy - 78, 2.2); thick(fr, S, cx - 2, gy - 70, cx + 40, gy - 84, 1.6); thick(fr, S, cx, gy - 44, cx + 22, gy - 76, 1.2); thick(fr, S, cx - 8, gy, cx, gy - 18, 1.2);
        fill(S, fr, NP.plank.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
        for (let py = gy - 82; py < gy - 46; py++) put(S, cx + 38, py, NP.wool[3]);
        for (let yy = -15; yy <= 15; yy++) for (let xx = -10; xx <= 10; xx++) { const d = Math.hypot(xx / (10 * (0.55 + (yy + 15) / 50)), yy / 15); if (d < 1) { const px = cx + 38 + xx, py = gy - 32 + yy; put(S, px, py, (px + py) % 4 === 0 || (px - py + 400) % 4 === 0 ? [150, 140, 112] : [190, 196, 200], (px + py) % 4 === 0 || (px - py + 400) % 4 === 0 ? 1 : 0.85 - d * 0.3); } }
        put(S, cx, gy - 81, NP.snow[6]); put(S, cx + 1, gy - 80, NP.snow[5]);
    }
    function logPile(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 16, 4, 0.45);
        for (const [dx, dy] of [[-8, 0], [0, 0], [8, 0], [-4, -8], [4, -8], [0, -15]]) {
            const e = shape(); ellipse(e, img, cx + dx, gy - 5 + dy, 4.6, 4.6); fill(img, e, PAL.straw, { outline: NP.oak[0] });
            put(img, cx + dx, gy - 5 + dy, NP.oak[3]); put(img, cx + dx - 1, gy - 6 + dy, NP.oak[4]);
        }
        for (let i = -4; i <= 4; i++) if (hash(i, 1, seed) < 0.7) put(img, cx + i, gy - 25, NP.snow[6]);
    }
    function workbench(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 15, 4, 0.4);
        rectFill(img, cx - 11, gy - 10, 3, 10, NP.plank[1]); rectFill(img, cx + 9, gy - 10, 3, 10, NP.plank[1]);
        const tb = shape(); box(tb, img, cx - 14, gy - 15, 28, 7, 0.3); fill(img, tb, NP.plank.slice(3), { tex: 0.3, seed, outline: NP.plank[0] });
        rectFill(img, cx - 9, gy - 17, 9, 2, NP.oak[5]); rectFill(img, cx - 1, gy - 18, 3, 4, PAL.iron[3]);                              // an adze
        rectFill(img, cx + 4, gy - 17, 7, 2, NP.plank[7]);
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
    function stall(L, b, seed, overhead, FX) {
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
            for (const [i, v] of aw.px) { const px = i % S.w; put(S, px, (i / S.w) | 0, pick(Math.floor((px - X0) / 7) % 2 ? NP.madder : NP.wool, (v + 1) / 2 + 0.1)); }
            for (let px = X0 - 4; px < X1 + 4; px++) { put(S, px, B - 34, NP.madder[0]); if (px % 4 < 2) put(S, px, B - 33, NP.wool[3]); if (hash(px, 7, seed) < 0.6) put(S, px, B - 47, NP.snow[6]); }
            rectFill(S, X0 + 5, B - 32, 3, 5, PAL.iron[1]); rectFill(S, X0 + 5, B - 31, 3, 3, NP.glow[4]); FX.flames.push({ x: X0 + 6, y: B - 30 }); FX.glows.push({ x: X0 + W / 2, y: B - 12, r: 40, a: 0.55 });
        });
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

    Object.assign(SA.scenes, { frostspine_pass: frostspinePass, skeldvik });
    if (isNode) module.exports = { frostspine_pass: frostspinePass, skeldvik };
})(typeof window !== 'undefined' ? window : globalThis);
