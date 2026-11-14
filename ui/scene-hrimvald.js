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
 *   'hrafnholm'        The Jarl's town at dusk under snow, after Tokelo's reference map (2026-11-13): the Great Hall on
 *                      its stone terrace (carved entrance, Frostmark banners, fire bowls), the Thing's ring of fitted
 *                      stone with tiered benches and the bloc banners, the law rock on its dais, noble houses with their
 *                      house banners, Guild Lane's forge and wool stall, the Training Yard's butts, dummies and spear
 *                      racks, the War Memorial's three boards under a turf roof, the feast tables, the palisade and the
 *                      south arch with ravens carved on its posts. Turf roofs, no horned helmets.
 *   'stormtide_inn'    Inside the Stormtide Inn, Skeldvik's meeting hall, after Tokelo's interior picture (2026-11-13): the bar and
 *                      casks, the kitchen corner, the long fire with the spit and cauldron, the feast tables, the tafl table.
 *   'hall_of_winter'   Inside the Great Hall, after Tokelo's interior picture (2026-11-13): the empty high seat and the
 *                      empty step below it, red hangings, house banners, the fire pit with three cauldrons, the feast
 *                      tables, the red runner, the skald's corner, the Lawspeaker's table, the Six Hundred Remembered.
 *   'gullstrand_coast' Gullstrand Coast and the Wolf's Wake under a storm, after Tokelo's picture (2026-11-13): thatched
 *                      houses with smoking chimneys, fish racks, a canvas awning, the net shed, quay, pier and rowboats; the
 *                      winding stair; the carved cliff (a rayed sun and Sköll in gold, a broken chain, Hati and a crescent
 *                      moon in violet), the bright cave and the dark one throwing their own light, the binding stone, the
 *                      cracked ring of flagstones; the shingle beach with its wreck, sea stacks and whitecaps.
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
    let ROOF = R(['#15110f', '#201a17', '#2c2420', '#3a302a', '#4a3e35', '#5b4d42', '#6d5e50']);
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
        // A thatched house (Gullstrand): the same timber house under sea-grass thatch instead of snow-laden planks.
        if (o.thatch) {
            const roof = ROOF, snow = NP.snow;
            ROOF = THATCH; NP.snow = THATCH_HI;
            try { building(L, b, seed, overhead, FX, { ...o, thatch: false }); } finally { ROOF = roof; NP.snow = snow; }
            return;
        }
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
                const dw2 = Z(o.doorW || 9), dh2 = Z(o.doorH || 24);     // the door: a person's height and a bit (the Great Hall's twice as wide)
                rectFill(S, mx - dw2, B - dh2, dw2 * 2, dh2 - 1, NP.oak[0]);
                RK.planks(S, mx - dw2 + 2, B - dh2 + 2, dw2 * 2 - 4, dh2 - 3, seed + 9, NP.oak.slice(1), true);
                rectFill(S, mx - dw2 - 1, B - dh2 - 2, dw2 * 2 + 2, Z(2), NP.oak[5]); rectFill(S, mx + Z(4), B - Z(11), z, z, PAL.iron[4]); rectFill(S, mx + Z(4), B - Z(10), z, z, PAL.iron[2]);
                for (const side of [-1, 1]) if (gw > Z(34)) windowLit(S, mx + side * Math.round(gw * 0.58) - Z(4), wallTop + Z(8), Z(8), Z(9), FX);
                for (let px = mx - dw2 - Z(3); px <= mx + dw2 + Z(3); px++) { put(S, px, B + 1, NP.cliff[4]); put(S, px, B + 2, NP.cliff[5]); put(S, px, B + 3, NP.cliff[2]); }                       // the door stone
                FX.glows.push({ x: mx, y: B + 4, r: Z(26), a: 0.28 });
                if (o.doorW > 12) for (let py = B - dh2 + 2; py < B - 1; py++) { put(S, mx, py, NP.oak[0]); put(S, mx + 1, py, NP.oak[5], 0.5); }   // two leaves
                if (o.knot) {                                            // carved knotwork round the entrance, the Hall of Winter's
                    for (let py = B - dh2 - Z(14); py < B - Z(2); py++) for (const sg of [-1, 1]) { const a = Math.sin((py - B) / (2.2 * z)) * Z(3); put(S, Math.round(mx + sg * (dw2 + Z(5)) + a), py, NP.oak[6]); put(S, Math.round(mx + sg * (dw2 + Z(5)) - a), py, NP.oak[1]); }
                    for (let px = mx - dw2 - Z(6); px <= mx + dw2 + Z(6); px++) { const a = Math.sin(px / (2.2 * z)) * Z(2); put(S, px, Math.round(B - dh2 - Z(8) + a), NP.oak[6]); put(S, px, Math.round(B - dh2 - Z(8) - a), NP.oak[1]); }
                }
                if (o.hallBanners) for (const sg of [-1, 1]) clothBanner(S, mx + sg * (dw2 + Z(16)) - Z(7), B - dh2 - Z(4), Z(14), Z(34), seed + sg, NP.madder);
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
            if (o.banner) clothBanner(S, mx - Math.round(gw * 0.58) - (gw > Z(34) ? Z(16) : -Z(6)), wallTop + Z(5), Z(11), Z(26), seed, o.bannerRamp);
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
    /** Skeldvik's banner: madder red with a pale branching mark (Hrafnholm's houses weave it in their own colours). */
    function clothBanner(S, x, y, w, h, seed, ramp = NP.madder) {
        const cl = shape(); poly(cl, S, [[x, y], [x + w, y], [x + w, y + h - 4], [x + w / 2, y + h], [x, y + h - 4]], (px, py) => ((px - x) / w) * -0.7 + Math.sin(py / 4 + seed) * 0.2);
        fill(S, cl, ramp.slice(1), { tex: 0.25, seed, outline: ramp[0] });
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

    // ---------------------------------------------------------------------
    // Hrafnholm (after Tokelo's reference map, 2026-11-13): the Jarl's town at dusk under snow
    // ---------------------------------------------------------------------
    const OCHRE = R(['#2e2008', '#4c360e', '#6e5016', '#8f6c20', '#b08a2e', '#c8a444']);
    const PINE = R(['#0e1e14', '#16301e', '#1f4229', '#2b5636', '#3a6a44']);
    const H_GROUND = new Set(['snow', 'cobble', 'yard', 'paving', 'steps']);
    const H_BASE = { fir: 'snow', palisade: 'snow', cliff: 'cliff', boulder: 'snow', great_hall: 'cobble', house: 'cobble', guildhall: 'cobble', forge: 'cobble',
        terrace_wall: 'cobble', law_rock: 'paving', tier_bench: 'paving', target: 'yard', dummy: 'yard', shed: 'yard' };

    function hrafnholm(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 983, img = L.base;
        const N = (x, y) => nameAt(map, x, y);
        const under = new Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const n = N(x, y); under[y * cw + x] = n === 'steps' ? 'paving' : H_GROUND.has(n) ? n : H_BASE[n] || null; }
        for (let pass = 0; pass < 2; pass++) for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (!under[y * cw + x]) {
            const votes = {};
            for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const g = (x + dx < 0 || y + dy < 0 || x + dx >= cw || y + dy >= ch) ? null : under[(y + dy) * cw + x + dx]; if (g && g !== 'cliff') votes[g] = (votes[g] || 0) + 1; }
            const best = Object.keys(votes).sort((a, b) => votes[b] - votes[a] || (a < b ? -1 : 1))[0];
            if (best || pass) under[y * cw + x] = best || 'cobble';
        }
        const snowC = new Float32Array(cw * ch), yardC = new Float32Array(cw * ch);
        for (let i = 0; i < cw * ch; i++) { snowC[i] = under[i] === 'snow' ? 1 : under[i] === 'cliff' ? 0.4 : 0; yardC[i] = under[i] === 'yard' ? 1 : 0; }
        const snowF = field(snowC, cw, ch), yardF = field(yardC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);               // 0 cobble, 1 yard, 2 paving, 4 snow, 5 rock
        const cobbleAt = (x, y, ramp, sw, sh, sd) => {
            const row = Math.floor(y / sh), u = x + hash(row, 1, sd) * sw * 2 + Math.sin(y / 9 + row) * 1.2, col = Math.floor(u / sw), fx = u - col * sw, fy = y - row * sh;
            if (fx < 1 || fy < 1 || (fx < 2 && fy < 2) || (fx > sw - 1.2 && fy < 2)) return ramp[0];
            return pick(ramp, 0.22 + hash(col, row, sd + 2) * 0.5 + (fy < 2.2 ? 0.1 : fy > sh - 1.6 ? -0.1 : 0) + (fx < 2.2 ? 0.05 : 0));
        };
        // The Thing's floor is laid in rings round the law rock.
        let rockX = 0, rockY = 0, rn = 0;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (N(x, y) === 'law_rock') { rockX += x * C + 16; rockY += y * C + 16; rn++; }
        if (rn) { rockX /= rn; rockY /= rn; }
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cx = Math.floor(x / C), cy = Math.floor(y / C), g = under[cy * cw + cx];
            const n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            if (g === 'cliff') { kind[i] = 5; put(img, x, y, n1 * 0.7 + n2 * 0.3 > 0.45 ? pick(NP.snow, 0.2 + n1 * 0.5) : pick(NP.cliff, 0.1 + n1 * 0.35 + hash(x, y, seed) * 0.08)); continue; }
            if (g === 'paving') {
                kind[i] = 2;
                const dx = (x - rockX) / 1.4, dy = y - rockY, d = Math.hypot(dx, dy), ring = Math.floor(d / 16), ang = Math.atan2(dy, dx) + Math.PI, seg = Math.floor(ang * (2 + ring * 1.6)), fr = d / 16 - ring, af = ang * (2 + ring * 1.6) - seg;
                const inRing = rn && d < 15 * 16 && cy > 13;
                put(img, x, y, inRing ? (fr < 0.08 || af < 0.06 ? FLAG[0] : pick(FLAG, 0.3 + hash(ring, seg, seed + 55) * 0.45)) : cobbleAt(x, y, FLAG, 13, 9, seed + 50));
                if (fbm(x / 9, y / 7, seed + 41) > 0.74) put(img, x, y, pick(NP.snow, 0.5 + n2 * 0.4), 0.85);
                continue;
            }
            if (snowF(x, y) + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.14 > 0.5) {
                kind[i] = 4;
                put(img, x, y, pick(NP.snow, 0.5 + (fbm(x / 34, y / 16, seed + 3) - 0.5) * 0.9 + (n2 - 0.5) * 0.12 + (N(cx, cy) === 'fir' ? -0.2 : 0)));
            } else if (yardF(x, y) + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.1 > 0.5) {
                kind[i] = 1;
                put(img, x, y, pick(NP.dirt, fbm(x / 10, y / 10, seed + 7) * 0.5 + hash(x, y, seed + 8) * 0.3 + 0.2)); put(img, x, y, [120, 84, 44], 0.14);
                if (hash(x, y, seed + 9) < 0.06) put(img, x, y, PAL.straw[1 + ((x + y) & 1)], 0.8);
                if (fbm(x / 12, y / 8, seed + 19) > 0.72) put(img, x, y, pick(NP.snow, 0.5 + n2 * 0.4), 0.8);              // trodden snow in the yard
            } else {
                kind[i] = 0;
                put(img, x, y, cobbleAt(x, y, COBBLE, 8, 6, seed + 30));
                const sn = fbm(x / 13, y / 9, seed + 40) + snowF(x, y) * 0.5;
                if (sn > 0.74) put(img, x, y, pick(NP.snow, 0.45 + n2 * 0.4), sn > 0.8 ? 0.95 : 0.6);
            }
        }
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 4 && (kind[i + img.w] === 0 || kind[i + img.w] === 1 || kind[i + img.w] === 2 || kind[i + 1] === 0 || kind[i + 1] === 1)) put(img, x, y, NP.snow[0], 0.75);
            else if (k === 4 && (kind[i - img.w] === 0 || kind[i - 1] === 0 || kind[i - img.w] === 2)) put(img, x, y, NP.snow[6], 0.8);
        }
        for (let n = 0; n < (img.w * img.h) / 40; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 4 && r < 0.1) { for (let j = 0; j < 4; j++) put(img, x + (j > 2 ? 1 : 0), y - j, [150, 132, 92]); put(img, x + 1, y + 1, NP.snow[1]); }
            else if (k === 4 && r < 0.3) { put(img, x, y, NP.snow[2]); put(img, x + 1, y, NP.snow[1]); put(img, x, y - 1, NP.snow[6]); }
            else if (k === 1 && r < 0.3) { put(img, x, y, NP.rock[6]); put(img, x + 1, y, NP.rock[5]); put(img, x, y + 1, NP.dirt[0]); }
            else if (k === 0 && r < 0.05) { rectFill(img, x, y, 3, 1, [70, 86, 52]); put(img, x + 1, y - 1, [70, 86, 52]); }
        }
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows };
        const open = (x, y) => H_GROUND.has(N(x, y));
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const inner = innerFn(map, nameAt);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const seen = new Set();
        const BANNERS = [NP.woad, OCHRE, PINE, NP.madder];
        const BLOCKS = {
            great_hall: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + 7, anyBehind(b), FX, { z: 2, gw: 84, wallH: 40, depth: 96, chimneys: 2, carved: true, lantern: true, doorW: 15, doorH: 34, hallBanners: true, knot: true }) }),
            house: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + b.x0 * 5 + b.y0, anyBehind(b), FX, { z: 2, chimneys: hash(b.x0, b.y0, seed) < 0.6 ? 1 : 0, banner: true, bannerRamp: BANNERS[Math.floor(hash(b.x0, b.y0, seed + 3) * 4)] }) }),
            guildhall: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + 41, anyBehind(b), FX, { z: 2, chimneys: 1, sign: 'axes' }) }),
            forge: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + 43, anyBehind(b), FX, { z: 2, gw: 56, wallH: 30, depth: 50, open: true, chimneys: 1, sign: 'axes' }) }),
            shed: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + 47, anyBehind(b), FX, { z: 1.5, open: true }) }),
            stall: (b) => ({ y: b.y1 + 0.6, draw: () => stall(L, b, seed + b.x0 + b.y0 * 3, anyBehind(b), FX) }),
            terrace_wall: (b) => ({ y: b.y1 + 0.5, draw: () => terraceWall(img, b, seed) }),
            tier_bench: (b) => ({ y: b.y1 + 0.7, draw: () => tierBenches(L, b, seed + b.x0, b.x0 < cw / 2 ? NP.woad : NP.madder) }),
            law_rock: (b) => ({ y: b.y1 + 0.8, draw: () => lawRock(L, b, seed, open(b.x0, b.y0 - 1)) }),
            feast_table: (b) => ({ y: b.y1 + 0.6, draw: () => feastTable(L, b, seed + b.x0, FX) }),
            war_memorial: (b) => ({ y: b.y1 + 0.8, draw: () => warMemorial(L, b, seed, anyBehind(b), FX) }),
            bench: (b) => ({ y: b.y1 + 0.5, draw: () => bench(L, b, seed + b.x0) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P2 = {
                cliff: () => { const inn = inner(x, y, 'cliff'); if (inn && hash(x, y, seed + 31) > 0.22) return; cragCell(L, x, y, seed, NP.cliff, NP.snow, 7, open(x, y + 1), open(x, y - 1), inn ? 2 : 1); },
                fir: () => fir(L, x, y, seed, behind(x, y), 0.75),
                boulder: () => stone(img, cx, gy - 8, 13, 9, seed + x * 3 + y, NP.cliff, NP.snow, 0.7),
                barrel: () => barrel(L, cx, gy, seed + x),
                crate: () => crate(L, cx, gy, seed + x),
                fence: () => fence(L, map, nameAt, x, y, seed),
                steps: () => steps(img, map, (a, b2) => (N(a, b2) === 'paving' ? 'cobble' : N(a, b2)), x, y, seed),
                palisade: () => tall(L, [cx - 18, gy - 60, cx + 18, gy + 6], y * C, false, (S) => palisade(S, x * C, gy, seed + x * 7 + y, '')),
                arch_post: () => archPost(L, x, y, seed, N(x + 5, y) === 'arch_post', FX),
                ring_wall: () => ringWall(L, x, y, seed, N),
                brazier: () => tall(L, [cx - 14, gy - 40, cx + 14, gy + 6], y * C, false, (S) => brazier(S, cx, gy, seed + x, FX)),
                banner: () => tall(L, [cx - 14, gy - 70, cx + 18, gy + 6], y * C, open(x, y - 1), (S) => townBanner(S, cx, gy, seed + x)),
                log_pile: () => logPile(img, cx, gy, seed + x),
                target: () => tall(L, [cx - 18, gy - 44, cx + 18, gy + 6], y * C, false, (S) => target(S, cx, gy, seed + x)),
                dummy: () => tall(L, [cx - 16, gy - 46, cx + 16, gy + 6], y * C, false, (S) => dummy(S, cx, gy, seed + x + y)),
                weapon_rack: () => tall(L, [cx - 18, gy - 50, cx + 18, gy + 6], y * C, open(x, y - 1), (S) => weaponRack(S, cx, gy, seed + x + y)),
                anvil: () => anvil(img, cx, gy, seed)
            }[n];
            if (P2) items.push({ x, y: y + (n === 'fir' ? 0.8 : n === 'cliff' ? 0.95 : n === 'steps' ? -1 : n === 'ring_wall' ? 0.7 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, 14, 0.3);
        dusk([img, L.over], glows);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** One cell of the Thing's ring: a low wall of fitted fieldstone with snow along the top and moss at the foot. */
    function ringWall(L, x, y, seed, N) {
        const X0 = x * C, gy = y * C + C, top = gy - 22;
        tall(L, [X0 - 2, top - 4, X0 + C + 2, gy + 6], y * C, false, (S) => {
            RK.blocks(S, X0, top, C, gy - top, seed + x * 7 + y, NP.cliff);
            for (let px = X0; px < X0 + C; px++) {
                put(S, px, top, NP.cliff[7]); put(S, px, top + 1, NP.cliff[6]); if (hash(px, y, seed) < 0.85) put(S, px, top - 1, NP.snow[6]); if (hash(px, y + 1, seed) < 0.6) put(S, px, top, NP.snow[5]);
                for (let j = 0; j < 4; j++) put(S, px, gy + j, NP.shadow, 0.45 - j * 0.1);
                if (vnoise(px / 3, y, seed + 2) > 0.62) for (let j = 0; j < 2 + hash(px, 4, seed) * 4; j++) put(S, px, gy - 2 - j, RP.moss[1 + (j & 1)], 0.8);
            }
            if (N(x - 1, y) !== 'ring_wall') for (let j = top; j < gy; j++) put(S, X0, j, NP.cliff[0]);
            if (N(x + 1, y) !== 'ring_wall') for (let j = top; j < gy; j++) put(S, X0 + C - 1, j, NP.cliff[0]);
        });
    }
    /** Benches stepped up the side of the ring, one tier to a row, with the bloc's banners on a rail behind. */
    function tierBenches(L, b, seed, ramp) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, Y0 = b.y0 * C, B = (b.y1 + 1) * C, W = X1 - X0;
        tall(L, [X0 - 6, Y0 - 50, X1 + 6, B + 6], Y0, false, (S) => {
            // the rail and its banners
            for (const px of [X0 + 4, X1 - 6]) { const p = shape(); box(p, S, px, Y0 - 40, 3, 46, 0); fill(S, p, NP.plank.slice(2), { outline: NP.plank[0] }); }
            const rl = shape(); thick(rl, S, X0 + 2, Y0 - 38, X1 - 2, Y0 - 38, 1); fill(S, rl, NP.plank.slice(3), { outline: NP.plank[0] });
            for (let k = 0; k < 3; k++) clothBanner(S, X0 + 12 + k * Math.round((W - 34) / 2), Y0 - 36, 12, 26, seed + k, ramp);
            for (let row = b.y0; row <= b.y1; row++) {
                const by = row * C + 22, f = (row - b.y0) / Math.max(1, b.y1 - b.y0);
                RK.blocks(S, X0, by - 2, W, C - 20, seed + row, NP.cliff);                                  // the stone step under each tier
                const sb = shape(); box(sb, S, X0 + 2, by - 10, W - 4, 6, 0.3); fill(S, sb, NP.plank.slice(2 + Math.round(f)), { tex: 0.3, seed: seed + row, outline: NP.plank[0] });
                for (let px = X0 + 2; px < X1 - 2; px++) if (hash(px, row, seed) < 0.55) put(S, px, by - 11, NP.snow[5 + (px & 1)]);
                for (const px of [X0 + 8, X0 + W / 2, X1 - 10]) rectFill(S, Math.round(px), by - 4, 3, 4, NP.plank[1]);
            }
        });
    }
    /** The law rock: a slab of grey stone on end on a two-stepped dais of fitted stone, cut with a band of runes. */
    function lawRock(L, b, seed, overhead) {
        const X0 = b.x0 * C - 4, X1 = (b.x1 + 1) * C + 4, B = (b.y1 + 1) * C - 2, mx = Math.round((X0 + X1) / 2);
        tall(L, [X0 - 8, B - 110, X1 + 8, B + 8], b.y0 * C - 10, overhead, (S) => {
            shadow(S, mx + 6, B + 2, (X1 - X0) / 2 + 6, 7, 0.5);
            for (const [inset, h] of [[0, 12], [10, 10]]) {
                const y0 = B - (inset ? 22 : 12);
                RK.blocks(S, X0 + inset, y0, X1 - X0 - inset * 2, h, seed + inset, NP.cliff);
                for (let px = X0 + inset; px < X1 - inset; px++) { put(S, px, y0, NP.cliff[7]); if (hash(px, inset, seed) < 0.6) put(S, px, y0 - 1, NP.snow[6]); put(S, px, y0 + h, NP.cliff[0]); }
            }
            const s = shape(); poly(s, S, [[mx - 15, B - 22], [mx - 16, B - 70], [mx - 10, B - 92], [mx + 2, B - 98], [mx + 12, B - 90], [mx + 16, B - 66], [mx + 15, B - 22]],
                (px, py) => ((px - mx) / 16) * -0.5 + (vnoise(px / 4, py / 5, seed) - 0.5) * 0.45);
            fill(S, s, NP.cliff.slice(1), { outline: NP.cliff[0] });
            for (const [i] of s.px) { const px = i % S.w, py = (i / S.w) | 0; if (!s.px.has(i - S.w)) { put(S, px, py, NP.snow[6]); put(S, px, py + 1, NP.snow[5]); } }
            for (let py = B - 84; py < B - 30; py += 7) for (let px = mx - 9; px < mx + 10; px += 4) {             // runes, cut in short strokes
                const r = hash(px, py, seed + 4);
                put(S, px, py, NP.cliff[0]); put(S, px, py + 1, NP.cliff[0]); put(S, px, py + 2, NP.cliff[0]);
                if (r < 0.5) put(S, px + 1, py + (r < 0.25 ? 0 : 2), NP.cliff[0]); else put(S, px - 1, py + 1, NP.cliff[0]);
                put(S, px + 1, py + 1, NP.cliff[6], 0.5);
            }
            for (let px = mx - 6; px <= mx + 6; px++) put(S, px, B - 44, NP.cliff[6], 0.6);                         // worn where hands go
        });
    }
    /** A bench with a back, for sitting out in the cold. */
    function bench(L, b, seed) {
        const X0 = b.x0 * C + 3, X1 = (b.x1 + 1) * C - 3, B = (b.y1 + 1) * C - 6, W = X1 - X0;
        tall(L, [X0 - 4, B - 34, X1 + 4, B + 6], b.y0 * C, false, (S) => {
            shadow(S, X0 + W / 2 + 3, B + 1, W / 2 + 2, 4, 0.4);
            const bk = shape(); box(bk, S, X0 + 2, B - 28, W - 4, 12, 0.2); fill(S, bk, NP.plank.slice(2), { tex: 0.3, seed, outline: NP.plank[0] });
            for (let py = B - 26; py < B - 18; py += 3) for (let px = X0 + 4; px < X1 - 4; px++) put(S, px, py, NP.plank[1], 0.6);
            const st = shape(); box(st, S, X0, B - 14, W, 6, 0.4); fill(S, st, NP.plank.slice(3), { tex: 0.3, seed: seed + 1, outline: NP.plank[0] });
            for (const px of [X0 + 3, X1 - 6]) rectFill(S, px, B - 8, 3, 8, NP.plank[1]);
            for (let px = X0; px < X1; px++) { if (hash(px, 1, seed) < 0.7) put(S, px, B - 15, NP.snow[6]); if (hash(px, 2, seed) < 0.6) put(S, px, B - 29, NP.snow[6]); }
        });
    }
    /** A trestle table with benches either side, set out for the households: horn cups, bread, a jug, a lamp. */
    function feastTable(L, b, seed, FX) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        tall(L, [X0 - 6, B - 34, X1 + 6, B + 8], b.y0 * C, false, (S) => {
            shadow(S, X0 + W / 2 + 3, B + 2, W / 2 + 4, 5, 0.45);
            const bb = shape(); box(bb, S, X0 + 4, B - 30, W - 8, 4, 0.2); fill(S, bb, NP.plank.slice(2), { outline: NP.plank[0] });                 // the far bench
            const tb = shape(); box(tb, S, X0, B - 22, W, 8, 0.35); fill(S, tb, NP.plank.slice(3), { tex: 0.3, seed, outline: NP.plank[0] });
            for (const px of [X0 + 5, X1 - 8]) rectFill(S, px, B - 14, 3, 10, NP.plank[1]);
            const nb = shape(); box(nb, S, X0 + 2, B - 6, W - 4, 4, 0.3); fill(S, nb, NP.plank.slice(3), { outline: NP.plank[0] });                 // the near bench
            for (let px = X0 + 6; px < X1 - 6; px += 9) {
                const r = hash(px, 3, seed);
                if (r < 0.45) { rectFill(S, px, B - 26, 3, 4, [214, 200, 160]); put(S, px, B - 27, [236, 226, 196]); }                                 // a horn cup
                else if (r < 0.7) { const e = shape(); ellipse(e, S, px + 2, B - 23, 4, 2); fill(S, e, [[120, 80, 40], [160, 112, 58], [190, 140, 76]], { edge: false }); }    // bread
                else rectFill(S, px, B - 28, 4, 6, PAL.iron[2]);                                                                                     // a jug
            }
            for (let px = X0; px < X1; px++) if (hash(px, 9, seed) < 0.5) put(S, px, B - 23, NP.snow[6], 0.5);
            const lx = X0 + Math.round(W / 2); rectFill(S, lx - 1, B - 30, 3, 6, PAL.iron[1]); rectFill(S, lx - 1, B - 29, 3, 3, NP.glow[4]);
            FX.flames.push({ x: lx, y: B - 28 }); FX.glows.push({ x: lx, y: B - 18, r: 46, a: 0.55 });
        });
    }
    /** The War Memorial: three long boards of names under a turf roof, on a footing of fitted stone, pine on the ledge. */
    function warMemorial(L, b, seed, overhead, FX) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 2, W = X1 - X0, top = B - 74;
        tall(L, [X0 - 12, top - 22, X1 + 12, B + 8], b.y0 * C, overhead, (S) => {
            shadow(S, X0 + W / 2 + 5, B + 2, W / 2 + 6, 6, 0.5);
            RK.blocks(S, X0, B - 16, W, 16, seed, NP.cliff);
            for (let px = X0; px < X1; px++) { put(S, px, B - 16, NP.cliff[7]); put(S, px, B, NP.cliff[0]); }
            for (const px of [X0 + 2, X1 - 7]) { const p = shape(); box(p, S, px, top, 5, B - 16 - top, 0); fill(S, p, NP.oak.slice(1), { tex: 0.3, seed, outline: NP.oak[0] }); }
            const bw = Math.floor((W - 26) / 3);
            for (let k = 0; k < 3; k++) {
                const bx = X0 + 10 + k * (bw + 3), by = top + 10, bh = B - 22 - by;
                rectFill(S, bx - 1, by - 1, bw + 2, bh + 2, NP.oak[0]);
                RK.planks(S, bx, by, bw, bh, seed + k * 5, NP.plank.slice(3), false);
                for (let py = by + 4; py < by + bh - 3; py += 4) for (let px = bx + 3; px < bx + bw - 3; px++) if (hash(px >> 1, py, seed + k) < 0.62 && ((px - bx) % 22) < 18) put(S, px, py, NP.plank[1]);
                const gap = by + 6 + Math.floor(hash(k, 1, seed) * (bh - 12)); for (let px = bx + 6; px < bx + 16; px++) put(S, px, gap, [210, 190, 150]);   // a name shaved away
            }
            for (let py = top - 18; py <= top + 2; py++) {                                                                        // the turf roof
                const f = (py - (top - 18)) / 20, x0 = X0 - 8 + (1 - f) * 10, x1 = X1 + 8 - (1 - f) * 10;
                for (let px = Math.round(x0); px < x1; px++) roofPx(S, px, py, 0.6 - f * 0.3, 1 - f * 0.9, seed + 7, false);
            }
            for (let px = X0 - 8; px < X1 + 8; px++) { put(S, px, top + 3, ROOF[0]); put(S, px, top + 4, NP.shadow, 0.5); }
            for (let px = X0 + 6; px < X1 - 6; px += 3) { put(S, px, B - 18, PINE[2 + (px & 1)]); put(S, px + 1, B - 19, PINE[3]); }   // pine on the ledge
            for (let k = 0; k < 6; k++) { const cx = X0 + 14 + k * ((W - 28) / 5); rectFill(S, Math.round(cx), B - 21, 2, 3, [230, 220, 190]); put(S, Math.round(cx), B - 22, NP.glow[NP.glow.length - 1]); FX.glows.push({ x: cx, y: B - 16, r: 18, a: 0.35 }); }
        });
    }
    /** A straw archery butt on a tripod, painted with rings, red-fletched arrows in it. */
    function target(S, cx, gy, seed) {
        shadow(S, cx + 3, gy + 1, 11, 3, 0.4);
        const fr = shape(); thick(fr, S, cx - 9, gy, cx - 3, gy - 34, 1); thick(fr, S, cx + 9, gy, cx + 3, gy - 34, 1); thick(fr, S, cx, gy - 2, cx, gy - 30, 1); fill(S, fr, NP.plank.slice(2), { outline: NP.plank[0] });
        const s = shape(); ellipse(s, S, cx, gy - 26, 11, 11); fill(S, s, PAL.straw, { tex: 0.5, seed, outline: [70, 50, 20] });
        for (const [r, c] of [[8, [236, 230, 210]], [5.5, NP.madder[4]], [3, [236, 230, 210]], [1.4, NP.madder[3]]]) { const e = shape(); ellipse(e, S, cx, gy - 26, r, r); fill(S, e, [c, c, c], { edge: false }); }
        for (let k = 0; k < 3; k++) { const ax = cx - 5 + hash(k, 1, seed) * 10, ay = gy - 31 + hash(k, 2, seed) * 10; for (let j = 0; j < 6; j++) put(S, ax + j, ay - j * 0.4, NP.plank[6]); put(S, ax + 6, ay - 3, NP.madder[4]); put(S, ax + 7, ay - 3, NP.madder[3]); }
        for (let px = cx - 8; px < cx + 8; px++) if (hash(px, 3, seed) < 0.6) put(S, px, gy - 37, NP.snow[6]);
    }
    /** A practice dummy: sacking stuffed with straw on a cross of poles, torn to the frame in places. */
    function dummy(S, cx, gy, seed) {
        shadow(S, cx + 3, gy + 1, 8, 3, 0.4);
        const p = shape(); thick(p, S, cx, gy, cx, gy - 38, 1.3); thick(p, S, cx - 12, gy - 28, cx + 12, gy - 28, 1); fill(S, p, NP.plank.slice(2), { outline: NP.plank[0] });
        const body = shape(); box(body, S, cx - 7, gy - 32, 14, 18, 0.2); fill(S, body, NP.wool.slice(1, 5), { tex: 0.5, seed, outline: NP.wool[0] });
        const head = shape(); ellipse(head, S, cx, gy - 37, 5, 5); fill(S, head, NP.wool.slice(1, 5), { tex: 0.5, seed: seed + 1, outline: NP.wool[0] });
        for (let k = 0; k < 4; k++) { const tx = cx - 5 + hash(k, 1, seed) * 10, ty = gy - 30 + hash(k, 2, seed) * 14; put(S, tx, ty, PAL.straw[3]); put(S, tx + 1, ty, PAL.straw[2]); put(S, tx, ty + 1, PAL.straw[1]); }
        rectFill(S, cx - 7, gy - 23, 14, 2, [50, 36, 24]);
        for (let px = cx - 5; px < cx + 5; px++) if (hash(px, 4, seed) < 0.6) put(S, px, gy - 42, NP.snow[6]);
    }
    /** A rack of spears, heads up, with a round shield leant against it. */
    function weaponRack(S, cx, gy, seed) {
        shadow(S, cx + 3, gy + 1, 13, 3, 0.4);
        const fr = shape(); box(fr, S, cx - 13, gy - 8, 26, 3, 0); box(fr, S, cx - 13, gy - 30, 26, 3, 0); thick(fr, S, cx - 12, gy, cx - 12, gy - 32, 1); thick(fr, S, cx + 12, gy, cx + 12, gy - 32, 1);
        fill(S, fr, NP.plank.slice(2), { outline: NP.plank[0] });
        for (let k = 0; k < 5; k++) { const px = cx - 9 + k * 4.5; for (let j = 0; j < 40; j++) put(S, px, gy - 2 - j, NP.oak[3 + (j & 1)]); rectFill(S, Math.round(px) - 1, gy - 46, 3, 5, PAL.iron[4]); put(S, px, gy - 47, PAL.iron[5] || PAL.iron[4]); }
        const sh = shape(); ellipse(sh, S, cx + 9, gy - 9, 7, 7); fill(S, sh, hash(seed, 1, 2) < 0.5 ? NP.madder.slice(1) : NP.woad.slice(1), { outline: [16, 12, 10] });
        for (let j = -6; j <= 6; j++) put(S, cx + 9 + j, gy - 9, NP.wool[4]); put(S, cx + 9, gy - 9, PAL.iron[4]);
    }
    function anvil(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 11, 3, 0.45);
        const st = shape(); box(st, img, cx - 7, gy - 12, 14, 12, 0); fill(img, st, NP.oak.slice(1), { tex: 0.4, seed, outline: NP.oak[0] });
        const a = shape(); poly(a, img, [[cx - 12, gy - 20], [cx + 8, gy - 20], [cx + 13, gy - 18], [cx + 6, gy - 16], [cx + 4, gy - 12], [cx - 6, gy - 12], [cx - 7, gy - 16], [cx - 12, gy - 18]], (px) => ((px - cx) / 12) * -0.6);
        fill(img, a, PAL.iron, { outline: PAL.iron[0] });
        for (let px = cx - 11; px < cx + 8; px++) put(img, px, gy - 20, PAL.iron[4]);
    }
    /** A post of the south arch: whole pine, carved with ravens at the top. The left post also carries the beam,
     *  which hangs over the road in the over layer so you walk under it. */
    function archPost(L, x, y, seed, beam, FX) {
        const cx = x * C + 16, gy = y * C + 30;
        tall(L, [cx - 14, gy - 96, cx + 14, gy + 6], y * C, false, (S) => {
            shadow(S, cx + 4, gy + 1, 10, 3.5, 0.5);
            const p = shape(); box(p, S, cx - 7, gy - 92, 14, 92, 0); for (const [i] of p.px) p.px.set(i, (((i % S.w) - cx) / 7) * -0.7 + (vnoise((i % S.w) / 3, ((i / S.w) | 0) / 9, seed + x) - 0.5) * 0.3);
            fill(S, p, NP.oak, { outline: NP.oak[0] });
            for (let py = gy - 86; py < gy - 60; py += 6) for (let px = cx - 5; px <= cx + 5; px++) if ((px + py) % 4 === 0) put(S, px, py, NP.oak[1]);   // carved bands
            rectFill(S, cx - 4, gy - 72, 8, 6, NP.oak[1]); put(S, cx - 2, gy - 70, [220, 200, 150]); rectFill(S, cx + 3, gy - 69, 3, 1, NP.oak[1]);   // a raven's head
            for (let px = cx - 7; px < cx + 7; px++) if (hash(px, 1, seed) < 0.7) put(S, px, gy - 93, NP.snow[6]);
            const bowl = shape(); poly(bowl, S, [[cx - 8, gy - 30], [cx + 8, gy - 30], [cx + 5, gy - 24], [cx - 5, gy - 24]], 0); fill(S, bowl, PAL.iron, { outline: PAL.iron[0] });
        });
        FX.flames.push({ x: cx, y: gy - 34, big: true }); FX.glows.push({ x: cx, y: gy - 20, r: 56, a: 0.6 });
        if (beam) tall(L, [cx - 20, gy - 110, cx + 5 * C + 20, gy - 70], gy + 40, true, (S) => {
            const bm = shape(); box(bm, S, cx - 16, gy - 100, 5 * C + 32, 12, 0.2); fill(S, bm, NP.oak.slice(1), { tex: 0.3, seed, outline: NP.oak[0] });
            for (let px = cx - 16; px < cx + 5 * C + 16; px++) { if (hash(px, 2, seed) < 0.85) put(S, px, gy - 101, NP.snow[6]); if (hash(px, 3, seed) < 0.5) put(S, px, gy - 102, NP.snow[5]); if ((px >> 2) % 3 === 0) put(S, px, gy - 94, NP.oak[1]); }
            for (const bx of [cx + 30, cx + 5 * C - 30]) { const br = shape(); thick(br, S, bx, gy - 88, bx + (bx < cx + 80 ? -22 : 22), gy - 70, 1.4); fill(S, br, NP.oak.slice(2), { outline: NP.oak[0] }); }
            const mid = cx + Math.round(5 * C / 2); rectFill(S, mid - 14, gy - 98, 28, 8, NP.oak[3]);
            for (let k = 0; k < 6; k++) rectFill(S, mid - 11 + k * 4, gy - 96 + (k & 1), 2, 4, NP.wool[5]);
        });
    }

    // ---------------------------------------------------------------------
    // The Hall of Winter, inside (after Tokelo's reference picture, 2026-11-13)
    // ---------------------------------------------------------------------
    const RUNNER = R(['#2a0a0a', '#45120f', '#5e1b15', '#77271c', '#8e3524']);
    function hallOfWinter(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 1019, img = L.base;
        const N = (x, y) => nameAt(map, x, y);
        const FLOORY = new Set(['floor', 'runner', 'dais', 'dais_steps']);
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows };
        const cob = (x, y, sw, sh, sd) => {
            const row = Math.floor(y / sh), u = x + hash(row, 1, sd) * sw * 2, col = Math.floor(u / sw), fx = u - col * sw, fy = y - row * sh;
            if (fx < 1 || fy < 1) return FLAG[0];
            return pick(FLAG, 0.25 + hash(col, row, sd + 2) * 0.45 + (fy < 2 ? 0.1 : 0));
        };
        // Floor: flagstones; the dais is planked oak; the runner is woven red with a pale knot border.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C), n = N(cx, cy);
            put(img, x, y, cob(x, y, 14, 10, seed));
            if (hash(x >> 1, y >> 1, seed + 3) < 0.04) put(img, x, y, FLAG[1]);
            if (n === 'dais' || n === 'high_seat' || n === 'chair' || n === 'side_table' || (n === 'brazier' && cy < 8)) { const t = Math.floor(x / 6); put(img, x, y, (x % 6) === 0 ? NP.oak[0] : pick(NP.oak, 0.45 + (hash(t, Math.floor(y / 40), seed) - 0.5) * 0.25 + (vnoise(t, y / 12, seed) - 0.5) * 0.2)); }
        }
        // The runner, from the way in to the dais steps.
        let rx0 = 1e9, rx1 = -1, ry0 = 1e9, ry1 = -1;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (N(x, y) === 'runner') { rx0 = Math.min(rx0, x); rx1 = Math.max(rx1, x); ry0 = Math.min(ry0, y); ry1 = Math.max(ry1, y); }
        if (rx1 >= 0) {
            const X0 = rx0 * C + 6, X1 = (rx1 + 1) * C - 6, Y0 = ry0 * C - 4, Y1 = (ry1 + 2) * C;
            for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
                const u = x - X0, w = X1 - X0, edge = u < 4 || u >= w - 4;
                let c = pick(RUNNER, 0.5 + (hash(x >> 1, y >> 1, seed + 5) - 0.5) * 0.3);
                if (edge) c = (u === 1 || u === w - 2) ? [196, 170, 120] : RUNNER[1];
                else if (Math.abs(((u - w / 2) + ((y >> 2) % 6) * 1.5)) % 9 < 1 || Math.abs(((u - w / 2) - ((y >> 2) % 6) * 1.5)) % 9 < 1) c = [170, 120, 80];   // the knot down the middle
                put(img, x, y, c);
            }
        }
        // Dais steps: oak treads.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (N(x, y) === 'dais_steps') for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) { const u = j % 8; put(img, x * C + i, y * C + j, u === 0 ? NP.oak[6] : u === 7 ? NP.oak[0] : pick(NP.oak, 0.4 + hash(x, Math.floor(j / 8), seed) * 0.25)); }
        // Walls: timber, posts and beams. The back wall shows its face (three cells tall), with small high windows.
        const wall = (x, y) => N(x, y) === 'wall' || N(x, y) === 'post';
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            if (!wall(x, y)) continue;
            const X0 = x * C, Y0 = y * C, face = !wall(x, y + 1) && y > 0;
            for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) { const px = X0 + i, py = Y0 + j; timberPx(img, px, py, 0, seed + (y < 3 ? 1 : 2), y < 3 ? 0.05 : 0.18); }
            if (face) { RK.blocks(img, X0, Y0 + C - 10, C, 10, seed + x, NP.cliff); for (let i = 0; i < C; i++) { put(img, X0 + i, Y0 + C - 10, NP.cliff[6]); for (let k = 0; k < 6; k++) put(img, X0 + i, Y0 + C + k, NP.shadow, 0.5 - k * 0.08); } }
            if (!wall(x, y - 1) && y > 0) for (let i = 0; i < C; i++) { put(img, X0 + i, Y0, NP.oak[5]); put(img, X0 + i, Y0 + 1, NP.oak[2]); put(img, X0 + i, Y0 - 1, NP.shadow, 0.4); }
            for (const [dx, ex] of [[-1, 0], [1, C - 1]]) if (!wall(x + dx, y) && x + dx >= 0 && x + dx < cw) for (let j = 0; j < C; j++) { put(img, X0 + ex, Y0 + j, NP.oak[0]); put(img, X0 + ex + (dx < 0 ? -1 : 1), Y0 + j, NP.shadow, 0.5); }
        }
        // The back wall's posts, beam and windows; the carved gable and red hangings behind the seat.
        const BW = 3 * C;
        for (let x = 2 * C; x < (cw - 2) * C; x += 4 * C) { const p = shape(); box(p, img, x - 5, 6, 10, BW - 12, 0); for (const [i] of p.px) p.px.set(i, (((i % img.w) - x) / 5) * -0.6); fill(img, p, NP.oak, { tex: 0.3, seed: seed + x, outline: NP.oak[0] }); }
        for (let px = 2 * C; px < (cw - 2) * C; px++) { put(img, px, 18, NP.oak[1]); put(img, px, 19, NP.oak[4]); put(img, px, 20, NP.oak[1]); }
        for (const wx of [5, 7, 9, 26, 28, 30]) { const x = wx * C + 8; rectFill(img, x - 1, 4, 14, 12, NP.oak[0]); for (let j = 0; j < 10; j++) for (let i = 0; i < 12; i++) put(img, x + i, 5 + j, pick(NP.snow, 0.6 + (1 - j / 10) * 0.3)); rectFill(img, x + 5, 5, 2, 10, NP.oak[1]); rectFill(img, x, 9, 12, 2, NP.oak[1]); }
        const gx0 = 13 * C, gx1 = 23 * C, gmx = (gx0 + gx1) / 2;
        for (let y = 2; y < BW - 2; y++) for (let x = gx0 + 10; x < gx1 - 10; x++) put(img, x, y, pick(NP.madder, 0.35 + Math.sin((x - gx0) / 5) * 0.12 + (y / BW) * 0.2 + hash(x, y >> 2, seed) * 0.08));   // the hangings
        for (let x = gx0 + 10; x < gx1 - 10; x += 10) for (let y = 2; y < BW - 2; y++) put(img, x, y, NP.madder[0], 0.6);
        const gb = shape(); for (const side of [-1, 1]) thick(gb, img, gmx + side * (gmx - gx0 - 4), 22, gmx, 2, 2.4); fill(img, gb, NP.oak.slice(2), { outline: NP.oak[0] });
        for (let x = gx0 + 6; x < gx1 - 6; x++) { put(img, x, 24, NP.oak[0]); put(img, x, 25, NP.oak[5]); put(img, x, 26, NP.oak[3]); if ((x >> 2) % 2) put(img, x, 25, NP.oak[6]); }
        // House banners on the back wall, either side of the hangings.
        const bannersAt = [[5.5, NP.woad], [9.5, NP.madder], [25.5, PINE], [29.5, OCHRE]];
        for (const [bx, ramp] of bannersAt) clothBanner(img, Math.round(bx * C - 8), 26, 18, 52, seed + bx, ramp);
        clothBanner(img, Math.round(14.2 * C), 30, 14, 40, seed + 3, NP.madder); clothBanner(img, Math.round(20.8 * C), 30, 14, 40, seed + 4, NP.madder);
        const seen = new Set();
        const BLOCKS = {
            high_seat: (b) => ({ y: b.y1 + 0.8, draw: () => highSeat(L, b, seed) }),
            fire_pit: (b) => ({ y: b.y1 + 0.6, draw: () => firePit(L, b, seed, FX) }),
            feast_table: (b) => ({ y: b.y1 + 0.6, draw: () => hallTable(L, b, seed + b.x0 + b.y0 * 7, FX) }),
            skald_corner: (b) => ({ y: b.y1 + 0.6, draw: () => skaldCorner(L, b, seed, FX) }),
            law_table: (b) => ({ y: b.y1 + 0.6, draw: () => lawTable(L, b, seed, FX) }),
            name_boards: (b) => ({ y: b.y1 + 0.2, draw: () => nameBoards(L, b, seed) }),
            candle_table: (b) => ({ y: b.y1 + 0.6, draw: () => candleTable(L, b, seed, FX) }),
            screen: (b) => ({ y: b.y0 + 0.7, draw: () => screen(L, b, seed + b.x0, N) }),
            weapon_rack: (b) => ({ y: b.y1 + 0.5, draw: () => { for (let x = b.x0; x <= b.x1; x++) tall(L, [x * C - 2, b.y0 * C - 30, x * C + 34, b.y1 * C + 36], 0, false, (S) => weaponRack(S, x * C + 16, b.y1 * C + 28, seed + x)); } }),
            fur_chest: (b) => ({ y: b.y1 + 0.5, draw: () => furChest(L, b, seed + b.x0) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P2 = {
                brazier: () => tall(L, [cx - 14, gy - 40, cx + 14, gy + 6], 0, false, (S) => brazier(S, cx, gy, seed + x, FX)),
                post: () => tall(L, [cx - 16, gy - 70, cx + 16, gy + 6], 0, false, (S) => { RK.blocks(S, cx - 12, gy - 24, 24, 24, seed + x, NP.cliff); brazier(S, cx, gy - 22, seed + x, FX); }),
                chair: () => tall(L, [cx - 16, gy - 50, cx + 16, gy + 6], 0, false, (S) => chair(S, cx, gy, seed)),
                side_table: () => tall(L, [cx - 14, gy - 30, cx + 14, gy + 6], 0, false, (S) => { const t = shape(); box(t, S, cx - 10, gy - 16, 20, 5, 0.3); fill(S, t, NP.oak.slice(2), { outline: NP.oak[0] }); rectFill(S, cx - 8, gy - 11, 2, 11, NP.oak[1]); rectFill(S, cx + 6, gy - 11, 2, 11, NP.oak[1]); rectFill(S, cx - 3, gy - 24, 5, 8, PAL.iron[3]); rectFill(S, cx - 2, gy - 26, 3, 2, PAL.iron[4]); }),
                barrel: () => barrel(L, cx, gy, seed + x),
                crate: () => crate(L, cx, gy, seed + x),
                berry_jar: () => tall(L, [cx - 14, gy - 40, cx + 14, gy + 6], 0, false, (S) => { const j = shape(); ellipse(j, S, cx, gy - 8, 7, 8); fill(S, j, NP.oak.slice(3), { outline: NP.oak[0] }); for (let k = 0; k < 14; k++) { const a = hash(k, 1, seed), bx = cx - 8 + a * 16, by = gy - 18 - hash(k, 2, seed) * 16; for (let j2 = 0; j2 < 4; j2++) put(S, bx + (j2 & 1), by + j2, NP.oak[1]); rectFill(S, Math.round(bx), Math.round(by), 2, 2, NP.madder[5]); } }),
                shield_stand: () => tall(L, [cx - 14, gy - 34, cx + 14, gy + 6], 0, false, (S) => { const sh = shape(); ellipse(sh, S, cx, gy - 14, 10, 10); fill(S, sh, (x + y) % 2 ? NP.madder.slice(1) : NP.woad.slice(1), { outline: [16, 12, 10] }); for (let j = -9; j <= 9; j++) put(S, cx + j, gy - 14, NP.wool[4]); for (let j = -9; j <= 9; j++) put(S, cx, gy - 14 + j, NP.wool[4]); rectFill(S, cx - 2, gy - 16, 4, 4, PAL.iron[4]); }),
                shields: () => { for (const dx of [-8, 8]) { const sh = shape(); ellipse(sh, img, cx + dx, gy - 46, 9, 9); fill(img, sh, dx < 0 ? NP.madder.slice(1) : NP.woad.slice(1), { outline: [16, 12, 10] }); rectFill(img, cx + dx - 2, gy - 48, 4, 4, PAL.iron[4]); } },
                wall_banner: () => clothBanner(img, cx + (x < cw / 2 ? -22 : 6), gy - 48, 14, 40, seed + x, x < cw / 2 ? NP.woad : NP.madder)
            }[n];
            if (P2) items.push({ x, y: y + 0.5, draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Wall sconces between the side posts.
        for (let y = 4; y < ch - 3; y += 5) for (const x of [2 * C + 2, (cw - 2) * C - 4]) { rectFill(img, x - 1, y * C, 3, 6, PAL.iron[1]); rectFill(img, x - 1, y * C - 3, 3, 3, NP.glow[4]); flames.push({ x, y: y * C - 2 }); glows.push({ x, y: y * C + 8, r: 44, a: 0.55 }); }
        // Lamplight: darker toward the walls, warm everywhere a flame is.
        for (const im of [img, L.over]) { const d = im.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = d[i] * 0.8 + 4; d[i + 1] = d[i + 1] * 0.78 + 3; d[i + 2] = d[i + 2] * 0.8 + 4; } }
        for (const g of glows) {
            const r = g.r, a = g.a == null ? 0.5 : g.a;
            for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
                const x = Math.round(g.x) + xx, y = Math.round(g.y) + yy, dd = Math.hypot(xx, yy) / r;
                if (dd >= 1 || x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
                const w = (1 - dd) * (1 - dd) * a;
                for (const im of [img, L.over]) { const i = (y * im.w + x) * 4, d = im.data; if (!d[i + 3]) continue; for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] + WARM[j] * w * 0.45 + (WARM[j] - d[i + j]) * w * 0.2); }
            }
        }
        edgeShade(img, 20, 0.4);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** The high seat: carved ash, a back like a gable end, ravens' heads on the arms, a white fur folded on it. */
    function highSeat(L, b, seed) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 6, mx = Math.round((X0 + X1) / 2);
        tall(L, [X0 - 16, B - 100, X1 + 16, B + 8], 0, false, (S) => {
            shadow(S, mx + 4, B + 2, 26, 6, 0.55);
            const bk = shape(); poly(bk, S, [[mx - 22, B - 30], [mx - 22, B - 74], [mx, B - 96], [mx + 22, B - 74], [mx + 22, B - 30]], (px, py) => ((px - mx) / 22) * -0.5 + (vnoise(px / 3, py / 3, seed) - 0.5) * 0.3);
            fill(S, bk, NP.oak.slice(1), { outline: NP.oak[0] });
            for (let py = B - 84; py < B - 34; py++) { const a = Math.sin((py - B) / 4) * 9; for (const sg of [-1, 1]) { put(S, Math.round(mx + sg * a), py, NP.oak[6]); put(S, Math.round(mx + sg * a) + 1, py, NP.oak[1]); } }   // knotwork
            const seat = shape(); box(seat, S, mx - 26, B - 34, 52, 12, 0.3); fill(S, seat, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (const sg of [-1, 1]) {
                const arm = shape(); box(arm, S, mx + sg * 24 - 4, B - 48, 8, 46, 0); fill(S, arm, NP.oak.slice(1), { outline: NP.oak[0] });
                rectFill(S, mx + sg * 24 - 5, B - 54, 10, 7, NP.oak[4]); rectFill(S, mx + sg * 24 + sg * 4 - 1, B - 51, 3, 2, NP.oak[6]); put(S, mx + sg * 24, B - 52, [20, 14, 10]);   // a raven's head
            }
            const fur = shape(); ellipse(fur, S, mx - 2, B - 36, 20, 7); for (const [i, v] of fur.px) fur.px.set(i, v + (hash(i, 1, seed) - 0.5) * 0.5); fill(S, fur, NP.wool.slice(3), { outline: NP.wool[1] });
            for (let k = 0; k < 9; k++) { const fx = mx - 20 + k * 5; for (let j = 0; j < 5; j++) put(S, fx + (j & 1), B - 30 + j, NP.wool[4]); }
            const st = shape(); box(st, S, mx - 30, B - 14, 60, 8, 0.2); fill(S, st, NP.oak.slice(2), { outline: NP.oak[0] });               // the step below it, empty too
            rectFill(S, mx - 30, B - 6, 60, 6, NP.oak[1]);
        });
    }
    function chair(S, cx, gy, seed) {
        shadow(S, cx + 3, gy + 1, 12, 4, 0.45);
        const bk = shape(); box(bk, S, cx - 10, gy - 44, 20, 28, 0.2); fill(S, bk, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
        for (let py = gy - 40; py < gy - 20; py += 4) for (let px = cx - 7; px < cx + 7; px++) put(S, px, py, NP.oak[1], 0.5);
        const st = shape(); box(st, S, cx - 12, gy - 18, 24, 8, 0.3); fill(S, st, NP.madder.slice(2), { tex: 0.4, seed, outline: NP.madder[0] });
        for (const px of [cx - 11, cx + 8]) rectFill(S, px, gy - 10, 3, 10, NP.oak[1]);
    }
    /** The fire pit: a ring of fitted stone, a timber frame over it, three cauldrons on chains, and the long fire. */
    function firePit(L, b, seed, FX) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 6, mx = Math.round((X0 + X1) / 2), my = B - 24;
        tall(L, [X0 - 10, B - 110, X1 + 10, B + 10], 0, false, (S) => {
            for (let yy = -40; yy <= 40; yy++) for (let xx = -70; xx <= 70; xx++) { const d = Math.hypot(xx / 70, yy / 40); if (d < 1) put(S, mx + xx, my + yy, NP.glow[3], (1 - d) * 0.25); }
            const rim = shape(); ellipse(rim, S, mx, my, 50, 24); fill(S, rim, NP.cliff.slice(1), { tex: 0.5, seed, outline: NP.cliff[0] });
            for (const [i] of rim.px) { const px = i % S.w, py = (i / S.w) | 0; if (Math.floor((Math.atan2((py - my) / 24, (px - mx) / 50) + Math.PI) * 6) % 2 === 0 && hash(px >> 2, py >> 2, seed) < 0.4) put(S, px, py, NP.cliff[2]); }
            const pit = shape(); ellipse(pit, S, mx, my - 2, 38, 16); fill(S, pit, [[30, 14, 8], [60, 26, 12], [110, 50, 20]], { edge: false });
            for (let k = 0; k < 18; k++) { const a = hash(k, 1, seed) * Math.PI * 2, r = hash(k, 2, seed); put(S, mx + Math.cos(a) * r * 34, my - 2 + Math.sin(a) * r * 13, [255, 160, 60]); }
            const f = shape(); ellipse(f, S, mx, my - 10, 14, 12); fill(S, f, NP.glow.slice(1), { edge: false });
            const f2 = shape(); ellipse(f2, S, mx, my - 8, 7, 7); fill(S, f2, NP.glow.slice(3), { edge: false });
            const fr = shape();
            for (const sg of [-1, 1]) { thick(fr, S, mx + sg * 48, my + 12, mx + sg * 44, my - 78, 2.2); thick(fr, S, mx + sg * 44, my - 74, mx + sg * 30, my - 84, 1.4); }
            thick(fr, S, mx - 52, my - 76, mx + 52, my - 76, 2); fill(S, fr, NP.oak.slice(1), { tex: 0.3, seed, outline: NP.oak[0] });
            for (const [dx, r] of [[-26, 9], [0, 12], [26, 9]]) {
                for (let j = my - 74; j < my - 36 - r; j++) put(S, mx + dx, j, PAL.iron[2]);
                const c = shape(); ellipse(c, S, mx + dx, my - 30 - (dx ? 4 : 0), r, r * 0.8); fill(S, c, PAL.iron, { outline: PAL.iron[0] });
                for (let px = mx + dx - r + 2; px < mx + dx + r - 2; px++) put(S, px, my - 30 - (dx ? 4 : 0) - r * 0.6, PAL.iron[4]);
                FX.smoke.push({ x: mx + dx - 6, y: my - 40 - r });
            }
            FX.flames.push({ x: mx, y: my - 12, big: true }); FX.flames.push({ x: mx - 14, y: my - 6, big: true }); FX.flames.push({ x: mx + 14, y: my - 6, big: true });
            FX.glows.push({ x: mx, y: my, r: 150, a: 0.85 });
        });
    }
    /** A feast table: benches with furs on them, bowls, cups, candles and a red-and-white runner down the middle. */
    function hallTable(L, b, seed, FX) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        tall(L, [X0 - 8, B - 70, X1 + 8, B + 8], 0, false, (S) => {
            shadow(S, X0 + W / 2 + 4, B + 2, W / 2 + 6, 6, 0.5);
            const tb = shape(); box(tb, S, X0, B - 50, W, 22, 0.3); fill(S, tb, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (let py = B - 48; py < B - 30; py += 6) for (let px = X0 + 2; px < X1 - 2; px++) put(S, px, py, NP.oak[1], 0.6);
            const rn = shape(); box(rn, S, X0 + 20, B - 46, W - 40, 12, 0); for (const [i] of rn.px) { const px = i % S.w; put(S, px, (i / S.w) | 0, ((px >> 2) % 3) ? RUNNER[3] : [206, 190, 160]); }
            for (const px of [X0 + 6, X1 - 10]) rectFill(S, px, B - 28, 4, 12, NP.oak[1]);
            const bn = shape(); box(bn, S, X0 + 6, B - 16, W - 12, 7, 0.3); fill(S, bn, NP.oak.slice(2), { tex: 0.3, seed: seed + 1, outline: NP.oak[0] });
            for (const px of [X0 + 10, X1 - 14]) rectFill(S, px, B - 9, 3, 9, NP.oak[1]);
            const fur = shape(); ellipse(fur, S, X0 + W * (0.3 + hash(seed, 1, 3) * 0.4), B - 12, 16, 5); for (const [i, v] of fur.px) fur.px.set(i, v + (hash(i, 2, seed) - 0.5) * 0.6); fill(S, fur, NP.wool.slice(2), { outline: NP.wool[0] });
            for (let k = 0; k < 7; k++) {
                const px = Math.round(X0 + 12 + k * ((W - 24) / 6)), r = hash(k, 3, seed);
                if (r < 0.35) { const e = shape(); ellipse(e, S, px, B - 52, 6, 3); fill(S, e, NP.bronze.slice(1).map((c) => [c[0] + 70, c[1] + 40, c[2]]), { outline: [40, 30, 14] }); }
                else if (r < 0.6) { rectFill(S, px - 2, B - 58, 5, 7, [176, 140, 70]); put(S, px - 1, B - 58, [226, 196, 120]); }
                else if (r < 0.8) { const e = shape(); ellipse(e, S, px, B - 52, 5, 3); fill(S, e, [[60, 20, 14], [140, 30, 24], [200, 60, 40]], { edge: false }); }
                else { rectFill(S, px - 2, B - 62, 4, 10, PAL.iron[2]); rectFill(S, px - 1, B - 64, 2, 2, PAL.iron[4]); }
            }
            for (const px of [X0 + 22, X1 - 26]) { rectFill(S, px - 1, B - 60, 3, 8, [234, 224, 196]); put(S, px, B - 62, NP.glow[NP.glow.length - 1]); put(S, px, B - 61, NP.glow[4]); FX.flames.push({ x: px, y: B - 62 }); FX.glows.push({ x: px, y: B - 50, r: 40, a: 0.5 }); }
        });
    }
    /** The skald's corner: a bench on a round of rugs, a harp leaning against it, a stool. Hallvard's place. */
    function skaldCorner(L, b, seed, FX) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 4, W = X1 - X0, mx = X0 + W / 2;
        tall(L, [X0 - 6, B - 90, X1 + 6, B + 8], 0, false, (S) => {
            const rug = shape(); ellipse(rug, S, mx, B - 18, W / 2 - 2, 20); fill(S, rug, RUNNER, { tex: 0.4, seed, outline: RUNNER[0] });
            for (const [i] of rug.px) { const px = i % S.w, py = (i / S.w) | 0, d = Math.hypot((px - mx) / (W / 2 - 2), (py - B + 18) / 20); if (Math.abs(d - 0.7) < 0.05 || Math.abs(d - 0.9) < 0.04) put(S, px, py, [196, 170, 120]); }
            clothBanner(S, X0 + 14, B - 88, 18, 44, seed + 9, NP.woad);
            const bk = shape(); box(bk, S, X0 + 10, B - 62, W - 34, 22, 0.2); fill(S, bk, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            const st = shape(); box(st, S, X0 + 8, B - 42, W - 30, 10, 0.3); fill(S, st, NP.madder.slice(2), { tex: 0.4, seed, outline: NP.madder[0] });
            for (const px of [X0 + 12, X1 - 28]) rectFill(S, px, B - 32, 3, 12, NP.oak[1]);
            const hp = shape(); thick(hp, S, X1 - 18, B - 20, X1 - 12, B - 64, 1.4); thick(hp, S, X1 - 12, B - 64, X1 - 26, B - 56, 1.2); fill(S, hp, NP.oak.slice(3), { outline: NP.oak[0] });   // the harp
            for (let k = 0; k < 4; k++) for (let j = 0; j < 30 - k * 6; j++) put(S, X1 - 22 + k * 2, B - 52 + j * 0.9 + k, [220, 210, 180], 0.7);
            const sl = shape(); ellipse(sl, S, mx + 14, B - 14, 7, 3); fill(S, sl, NP.oak.slice(3), { outline: NP.oak[0] }); rectFill(S, mx + 9, B - 12, 2, 8, NP.oak[1]); rectFill(S, mx + 17, B - 12, 2, 8, NP.oak[1]);
            rectFill(S, X0 + 6, B - 70, 3, 5, PAL.iron[1]); rectFill(S, X0 + 6, B - 69, 3, 3, NP.glow[4]); FX.flames.push({ x: X0 + 7, y: B - 68 }); FX.glows.push({ x: X0 + 7, y: B - 56, r: 40, a: 0.5 });
        });
    }
    /** The Lawspeaker's table: law-sticks and tally staves, a shelf of them behind, a rug, the inheritances tied in grey. */
    function lawTable(L, b, seed, FX) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        tall(L, [X0 - 6, B - 96, X1 + 6, B + 8], 0, false, (S) => {
            const rug = shape(); box(rug, S, X0 + 2, B - 30, W - 4, 28, 0); fill(S, rug, RUNNER, { tex: 0.4, seed, outline: RUNNER[0] });
            for (let px = X0 + 6; px < X1 - 6; px++) { put(S, px, B - 26, [196, 170, 120]); put(S, px, B - 7, [196, 170, 120]); }
            const sh = shape(); box(sh, S, X1 - 40, B - 94, 34, 60, 0.2); fill(S, sh, NP.oak.slice(1), { tex: 0.3, seed, outline: NP.oak[0] });
            for (let py = B - 84; py < B - 36; py += 14) { for (let px = X1 - 38; px < X1 - 8; px++) put(S, px, py, NP.oak[0]); for (let k = 0; k < 8; k++) rectFill(S, X1 - 36 + k * 3.5, py - 10 + (k % 3), 2, 10 - (k % 3), k % 3 ? [200, 180, 140] : [230, 214, 176]); }
            const tb = shape(); box(tb, S, X0 + 8, B - 40, W - 54, 14, 0.3); fill(S, tb, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (const px of [X0 + 12, X1 - 52]) rectFill(S, px, B - 26, 3, 14, NP.oak[1]);
            for (let k = 0; k < 9; k++) { const px = X0 + 14 + k * 5, len = 14 + (k % 3) * 2; for (let j = 0; j < len; j++) put(S, px + j * 0.2, B - 44 - (k % 2) * 2 + j * 0.05, [214, 194, 150]); }
            rectFill(S, X0 + 54, B - 50, 16, 8, [214, 194, 150]); rectFill(S, X0 + 54, B - 47, 16, 2, NP.wool[2]);                 // the heap tied with grey wool
            rectFill(S, X0 + 22, B - 54, 3, 8, [234, 224, 196]); put(S, X0 + 23, B - 56, NP.glow[NP.glow.length - 1]); FX.flames.push({ x: X0 + 23, y: B - 56 }); FX.glows.push({ x: X0 + 23, y: B - 44, r: 42, a: 0.5 });
        });
    }
    /** "The Six Hundred Remembered": five tall boards of names on the screen under a carved heading. */
    function nameBoards(L, b, seed) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 6, W = X1 - X0, top = B - 64;
        tall(L, [X0 - 6, top - 26, X1 + 6, B + 6], 0, false, (S) => {
            rectFill(S, X0 - 2, top - 2, W + 4, B - top + 4, NP.oak[0]);
            const bw = Math.floor((W - 12) / 5);
            for (let k = 0; k < 5; k++) {
                const bx = X0 + 2 + k * (bw + 2);
                RK.planks(S, bx, top, bw, B - top, seed + k, NP.plank.slice(3), true);
                for (let py = top + 6; py < B - 4; py += 4) for (let px = bx + 3; px < bx + bw - 3; px++) if (hash(px >> 1, py, seed + k) < 0.6 && (px - bx) % 16 < 12) put(S, px, py, NP.plank[1]);
                const cut = top + 10 + Math.floor(hash(k, 4, seed) * 40); for (let px = bx + 4; px < bx + 14; px++) { put(S, px, cut, NP.oak[0]); put(S, px, cut + 1, NP.oak[0]); }   // cut again, more deeply
            }
            // the heading board
            const hx = X0 + W / 2 - 60; rectFill(S, hx - 2, top - 24, 124, 20, NP.oak[0]); rectFill(S, hx, top - 22, 120, 16, [26, 24, 26]);
            for (let k = 0; k < 18; k++) rectFill(S, hx + 6 + k * 6, top - 19 + (k % 3 === 1 ? 1 : 0), 3, 4 + (k % 2), [214, 204, 178]);
            for (let k = 0; k < 12; k++) rectFill(S, hx + 24 + k * 6, top - 12, 3, 3, [214, 204, 178]);
        });
    }
    /** Candles burning on the table under the names, a bowl, a fur. */
    function candleTable(L, b, seed, FX) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 6, W = X1 - X0;
        tall(L, [X0 - 6, B - 40, X1 + 6, B + 8], 0, false, (S) => {
            shadow(S, X0 + W / 2 + 3, B + 2, W / 2, 5, 0.45);
            const tb = shape(); box(tb, S, X0 + 2, B - 20, W - 4, 8, 0.3); fill(S, tb, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (const px of [X0 + 6, X1 - 9]) rectFill(S, px, B - 12, 3, 12, NP.oak[1]);
            const fur = shape(); ellipse(fur, S, X0 + 34, B - 22, 16, 4); fill(S, fur, NP.wool.slice(2), { outline: NP.wool[0] });
            const bw = shape(); ellipse(bw, S, X0 + W / 2 + 10, B - 23, 8, 3); fill(S, bw, [[60, 46, 20], [120, 92, 40], [176, 140, 70]], { outline: [40, 30, 14] });
            for (let k = 0; k < 9; k++) { const px = Math.round(X0 + 8 + k * ((W - 16) / 8)), h = 5 + (k % 3) * 3; if (Math.abs(px - (X0 + 34)) < 12) continue; rectFill(S, px - 1, B - 20 - h, 3, h, [236, 228, 204]); put(S, px, B - 22 - h, NP.glow[NP.glow.length - 1]); put(S, px, B - 21 - h, NP.glow[4]); FX.flames.push({ x: px, y: B - 22 - h }); FX.glows.push({ x: px, y: B - 30, r: 30, a: 0.4 }); }
        });
    }
    /** A low screen of planks on a stone footing, with posts: it walls off the rooms by the entrance. */
    function screen(L, b, seed, N) {
        // The run along the top row of the block is the screen; any cells hanging below it are its end walls.
        let hx0 = b.x1, hx1 = b.x0;
        for (let x = b.x0; x <= b.x1; x++) if (N(x, b.y0) === 'screen') { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); }
        const X0 = hx0 * C, X1 = (hx1 + 1) * C, Y0 = b.y0 * C, B = Y0 + C;
        tall(L, [b.x0 * C - 4, Y0 - 44, (b.x1 + 1) * C + 4, (b.y1 + 1) * C + 6], 0, false, (S) => {
            RK.planks(S, X0, Y0 - 30, X1 - X0, C + 20, seed, NP.plank.slice(1), true);
            RK.blocks(S, X0, B - 10, X1 - X0, 10, seed + 1, NP.cliff);
            for (let px = X0; px < X1; px++) { put(S, px, Y0 - 31, NP.oak[5]); put(S, px, Y0 - 30, NP.oak[2]); for (let k = 0; k < 5; k++) put(S, px, B + k, NP.shadow, 0.45 - k * 0.08); }
            for (let px = X0 + 8; px < X1 - 4; px += 3 * C) { const p = shape(); box(p, S, px, Y0 - 40, 10, B - Y0 + 40, 0); for (const [i] of p.px) p.px.set(i, (((i % S.w) - px - 5) / 5) * -0.6); fill(S, p, NP.oak, { tex: 0.3, seed: seed + px, outline: NP.oak[0] }); rectFill(S, px - 1, Y0 - 44, 12, 5, NP.oak[4]); }
            for (let y = b.y0 + 1; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (N(x, y) === 'screen') {
                const vx = x * C + 8;
                RK.planks(S, vx, y * C - 30, 16, C + 30, seed + y, NP.plank.slice(1), false);
                for (let py = y * C - 30; py < (y + 1) * C; py++) { put(S, vx, py, NP.oak[0]); put(S, vx + 15, py, NP.oak[0]); }
                for (let px = vx; px < vx + 16; px++) put(S, px, y * C - 31, NP.oak[5]);
            }
        });
    }
    function furChest(L, b, seed) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 6, W = X1 - X0;
        tall(L, [X0 - 4, B - 34, X1 + 4, B + 6], 0, false, (S) => {
            shadow(S, X0 + W / 2 + 3, B + 1, W / 2 + 2, 4, 0.45);
            const c = shape(); box(c, S, X0, B - 22, W, 22, 0.3); fill(S, c, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (const px of [X0 + 6, X1 - 8]) rectFill(S, px, B - 22, 2, 22, PAL.iron[2]);
            const fur = shape(); ellipse(fur, S, X0 + W / 2, B - 24, W / 2 + 2, 6); for (const [i, v] of fur.px) fur.px.set(i, v + (hash(i, 3, seed) - 0.5) * 0.6); fill(S, fur, NP.wool.slice(3), { outline: NP.wool[1] });
        });
    }

    // ---------------------------------------------------------------------
    // The Stormtide Inn, inside (after Tokelo's interior picture, 2026-11-13): Skeldvik's meeting hall. Warm timber
    // everywhere, a floor of wide boards, the bar and casks down the west wall, the kitchen corner, the long fire.
    // ---------------------------------------------------------------------
    const BOARD = R(['#1f1009', '#2e180d', '#3e2112', '#4f2b17', '#61361d', '#734224', '#864f2b', '#9a5d33']);
    const SKY = R(['#1a2a44', '#26395a', '#334c72', '#46628c', '#6380a6', '#8aa4c4']);
    function stormtideInn(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 2027, img = L.base;
        const N = (x, y) => nameAt(map, x, y);
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows };
        // Floor: wide boards running east-west, butt joints staggered, worn paler down the middle of the room.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const row = Math.floor(y / 9), fy = y - row * 9, u = x + Math.floor(hash(row, 1, seed) * 90), len = 70 + Math.floor(hash(row, 2, seed) * 40), col = Math.floor(u / len), fx = u - col * len;
            let t = 0.48 + (hash(col, row, seed + 3) - 0.5) * 0.22 + (vnoise(u / 14, row, seed) - 0.5) * 0.16;
            if (fy === 0) t = 0.04; else if (fy === 1) t += 0.1; else if (fy === 8) t -= 0.12;
            if (fx === 0) t = 0.08;
            const wear = Math.max(0, 1 - Math.abs(x / img.w - 0.5) * 2.6) * 0.08;
            put(img, x, y, pick(BOARD, t + wear));
            if (hash(x, y, seed + 9) < 0.006) put(img, x, y, BOARD[1]);                                                      // knots and nail heads
        }
        // Walls: timber, the back wall shows its face (three cells tall) with posts, a beam and tall narrow windows.
        const wall = (x, y) => N(x, y) === 'wall';
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            if (!wall(x, y)) continue;
            const X0 = x * C, Y0 = y * C, face = !wall(x, y + 1) && y > 0 && y + 1 < ch;
            for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) { const px = X0 + i, py = Y0 + j, bq = Math.floor(px / 7), u = px % 7; put(img, px, py, u === 0 ? BOARD[0] : pick(BOARD, (y < 3 ? 0.42 : 0.24) + (hash(bq, y < 3 ? 1 : 2, seed) - 0.5) * 0.2 + (vnoise(bq * 3.1, py / 11, seed) - 0.5) * 0.16 + (u === 1 ? 0.08 : 0))); }
            if (face) { RK.blocks(img, X0, Y0 + C - 8, C, 8, seed + x, NP.cliff); for (let i = 0; i < C; i++) { put(img, X0 + i, Y0 + C - 8, NP.cliff[6]); for (let k = 0; k < 6; k++) put(img, X0 + i, Y0 + C + k, NP.shadow, 0.5 - k * 0.08); } }
            if (!wall(x, y - 1) && y > 0) for (let i = 0; i < C; i++) { put(img, X0 + i, Y0, NP.oak[6]); put(img, X0 + i, Y0 + 1, NP.oak[3]); put(img, X0 + i, Y0 - 1, NP.shadow, 0.4); }
            for (const [dx, ex] of [[-1, 0], [1, C - 1]]) if (!wall(x + dx, y) && x + dx >= 0 && x + dx < cw) for (let j = 0; j < C; j++) { put(img, X0 + ex, Y0 + j, NP.oak[0]); put(img, X0 + ex + (dx < 0 ? -1 : 1), Y0 + j, NP.shadow, 0.5); }
        }
        const BW = 3 * C;
        for (let px = 2 * C; px < (cw - 2) * C; px++) { put(img, px, 22, NP.oak[1]); put(img, px, 23, NP.oak[5]); put(img, px, 24, NP.oak[3]); put(img, px, 25, NP.oak[1]); }   // the wall plate
        for (const wx of [17.5, 21.5, 29.5, 33.5]) {                                                                        // tall windows, snow and dusk outside
            const x = Math.round(wx * C) - 6, y0 = 30, h = 50;
            rectFill(img, x - 2, y0 - 2, 16, h + 4, NP.oak[0]);
            for (let j = 0; j < h; j++) for (let i = 0; i < 12; i++) { if (j < 6 && Math.hypot(i - 5.5, j - 6) > 6.5) continue; put(img, x + i, y0 + j, pick(SKY, 0.2 + (j / h) * 0.7)); if (j > h - 10 && hash(i, j, seed) < 0.5) put(img, x + i, y0 + j, NP.snow[4]); }
            rectFill(img, x + 5, y0, 2, h, NP.oak[1]); for (let j = 14; j < h; j += 14) rectFill(img, x, y0 + j, 12, 1, NP.oak[1]);
            glows.push({ x: x + 6, y: y0 + h + 10, r: 22, a: 0.15 });
        }
        for (const px of [2 * C, 13 * C + 16, 26 * C + 16, (cw - 2) * C]) { const p = shape(); box(p, img, px - 6, 0, 12, BW - 4, 0); for (const [i] of p.px) p.px.set(i, (((i % img.w) - px) / 6) * -0.6); fill(img, p, NP.oak, { tex: 0.3, seed: seed + px, outline: NP.oak[0] }); for (let k = 0; k < 3; k++) rectFill(img, px - 7, 60 + k * 3, 14, 1, NP.wool[2]); }
        // Utensils on a rail in the middle of the back wall: ladles, a skimmer, a pan.
        for (let k = 0; k < 6; k++) { const ux = 15 * C + 8 + k * 9; rectFill(img, ux, 40, 1, 22, PAL.iron[2]); const h = shape(); ellipse(h, img, ux, 64, 3 + (k % 2), 3); fill(img, h, PAL.iron, { outline: PAL.iron[0] }); }
        rectFill(img, 15 * C + 2, 38, 60, 2, NP.oak[1]);
        const seen = new Set();
        const BLOCKS = {
            kitchen_shelf: (b) => ({ y: b.y1 + 0.3, draw: () => kitchenShelf(L, b, seed) }),
            pantry: (b) => ({ y: b.y1 + 0.5, draw: () => pantry(L, b, seed) }),
            prep_table: (b) => ({ y: b.y1 + 0.6, draw: () => prepTable(L, b, seed) }),
            cask_rack: (b) => ({ y: b.y1 + 0.4, draw: () => caskRack(L, b, seed) }),
            bar_counter: (b) => ({ y: b.y1 + 0.6, draw: () => barCounter(L, b, seed, N, FX) }),
            long_fire: (b) => ({ y: b.y1 + 0.6, draw: () => longFire(L, b, seed, FX) }),
            feast_table: (b) => ({ y: b.y1 + 0.6, draw: () => hallTable(L, b, seed + b.x0 + b.y0 * 7, FX) }),
            bench: (b) => ({ y: b.y1 + 0.5, draw: () => innBench(L, b, seed + b.x0) }),
            tafl_table: (b) => ({ y: b.y1 + 0.6, draw: () => taflTable(L, b, seed, FX) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P2 = {
                post: () => tall(L, [cx - 16, 0, cx + 16, gy + 6], 0, false, (S) => { shadow(S, cx + 4, gy, 14, 5, 0.5); const p = shape(); box(p, S, cx - 9, BW - 6, 18, gy - BW + 6, 0); for (const [i] of p.px) p.px.set(i, (((i % S.w) - cx) / 9) * -0.7 + (vnoise((i % S.w) / 2, ((i / S.w) | 0) / 14, seed) - 0.5) * 0.3); fill(S, p, NP.oak, { tex: 0.3, seed: seed + x, outline: NP.oak[0] }); for (let k2 = 0; k2 < 4; k2++) rectFill(S, cx - 10, gy - 150 + k2 * 3, 20, 2, NP.wool[3 - (k2 % 2)]); rectFill(S, cx - 12, gy - 8, 24, 8, NP.oak[2]); }),
                stool: () => { const s = shape(); ellipse(s, img, cx, gy - 10, 8, 4); fill(img, s, BOARD.slice(3), { outline: BOARD[0] }); for (const dx of [-5, 4]) rectFill(img, cx + dx, gy - 7, 2, 8, BOARD[1]); shadow(img, cx + 2, gy + 1, 8, 3, 0.35); },
                barrel: () => barrel(L, cx, gy, seed + x)
            }[n];
            if (P2) items.push({ x, y: y + 0.5, draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Torches either side of the way out, and sconces on the side walls.
        for (const tx of [17 * C + 8, 23 * C - 8]) { const ty = 23 * C + 6; rectFill(img, tx - 2, ty, 4, 10, PAL.iron[1]); rectFill(img, tx - 3, ty - 3, 6, 4, NP.glow[4]); flames.push({ x: tx, y: ty - 3, big: true }); glows.push({ x: tx, y: ty - 8, r: 60, a: 0.7 }); }
        for (let y = 6; y < ch - 3; y += 6) for (const x of [(cw - 2) * C - 4]) { rectFill(img, x - 1, y * C, 3, 6, PAL.iron[1]); rectFill(img, x - 1, y * C - 3, 3, 3, NP.glow[4]); flames.push({ x, y: y * C - 2 }); glows.push({ x, y: y * C + 8, r: 44, a: 0.55 }); }
        // Lamplight: warm everywhere a flame is, darker toward the walls.
        for (const im of [img, L.over]) { const d = im.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = d[i] * 0.84 + 4; d[i + 1] = d[i + 1] * 0.8 + 3; d[i + 2] = d[i + 2] * 0.8 + 4; } }
        for (const g of glows) {
            const r = g.r, a = g.a == null ? 0.5 : g.a;
            for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
                const x = Math.round(g.x) + xx, y = Math.round(g.y) + yy, dd = Math.hypot(xx, yy) / r;
                if (dd >= 1 || x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
                const w = (1 - dd) * (1 - dd) * a;
                for (const im of [img, L.over]) { const i = (y * im.w + x) * 4, d = im.data; if (!d[i + 3]) continue; for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] + WARM[j] * w * 0.45 + (WARM[j] - d[i + j]) * w * 0.2); }
            }
        }
        edgeShade(img, 18, 0.35);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** Shelves of bowls and pots against the back wall, and above them a beam hung with cod, hams and sausages. */
    function kitchenShelf(L, b, seed) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        tall(L, [X0 - 4, 20, X1 + 4, B + 6], 0, false, (S) => {
            for (let px = X0 + 6; px < X1 - 6; px++) { put(S, px, 30, NP.oak[1]); put(S, px, 31, NP.oak[4]); put(S, px, 32, NP.oak[1]); }   // the beam
            for (let k = 0; k < 12; k++) {
                const hx = X0 + 18 + k * ((W - 36) / 11), kind = k % 4, top = 33;
                for (let j = 0; j < 6; j++) put(S, hx, top + j, NP.wool[3]);
                if (kind === 0 || kind === 2) { const f = shape(); poly(f, S, [[hx - 3, top + 6], [hx + 3, top + 6], [hx + 4, top + 26], [hx, top + 32], [hx - 4, top + 26]], (px) => ((px - hx) / 4) * -0.5); fill(S, f, [[70, 76, 84], [110, 120, 130], [160, 170, 178], [200, 206, 210]], { outline: [30, 34, 40] }); }
                else if (kind === 1) { const h = shape(); ellipse(h, S, hx, top + 18, 6, 11); fill(S, h, NP.madder.map((c) => [c[0] + 30, c[1] + 10, c[2]]), { outline: NP.madder[0] }); rectFill(S, hx - 2, top + 28, 4, 3, [220, 200, 170]); }
                else for (let j = 0; j < 4; j++) { const s2 = shape(); ellipse(s2, S, hx + (j % 2) * 2 - 1, top + 9 + j * 6, 2.5, 3.5); fill(S, s2, NP.madder.slice(1), { outline: NP.madder[0] }); }
            }
            // the shelves: two boards on brackets, crocks, bowls and copper pots
            for (const sy of [B - 24, B - 8]) {
                const sh = shape(); box(sh, S, X0 + 4, sy, W - 8, 5, 0.3); fill(S, sh, NP.oak.slice(2), { outline: NP.oak[0] });
                for (let k = 0; k < Math.floor((W - 16) / 14); k++) {
                    const px = X0 + 12 + k * 14, r = hash(k, sy, seed);
                    if (r < 0.35) { const p = shape(); ellipse(p, S, px, sy - 5, 6, 5); fill(S, p, [[60, 30, 14], [120, 64, 30], [180, 100, 50], [220, 150, 90]], { outline: [40, 20, 10] }); }
                    else if (r < 0.7) { const p = shape(); ellipse(p, S, px, sy - 3, 6, 3); fill(S, p, NP.oak.slice(3), { outline: NP.oak[0] }); }
                    else { const p = shape(); box(p, S, px - 4, sy - 10, 8, 10, 0.3); fill(S, p, [[90, 80, 70], [140, 126, 110], [190, 176, 156]], { outline: [50, 44, 40] }); }
                }
            }
            for (const px of [X0 + 8, X1 - 10]) rectFill(S, px, B - 26, 3, 26, NP.oak[1]);
        });
    }
    /** Sacks of grain and flour, crocks and a basket of potatoes by the back wall. */
    function pantry(L, b, seed) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 4;
        tall(L, [X0 - 6, B - 50, X1 + 6, B + 8], 0, false, (S) => {
            shadow(S, (X0 + X1) / 2 + 3, B + 1, (X1 - X0) / 2, 5, 0.45);
            for (let k = 0; k < 4; k++) {
                const px = X0 + 12 + k * ((X1 - X0 - 24) / 3), r = hash(k, 1, seed);
                if (r < 0.6) { const s = shape(); poly(s, S, [[px - 10, B], [px - 11, B - 20], [px - 6, B - 30], [px + 6, B - 30], [px + 11, B - 20], [px + 10, B]], (x) => ((x - px) / 11) * -0.5); fill(S, s, NP.wool.slice(1), { tex: 0.4, seed: seed + k, outline: NP.wool[0] }); rectFill(S, px - 5, B - 32, 10, 3, NP.wool[1]); }
                else { const s = shape(); ellipse(s, S, px, B - 12, 9, 12); fill(S, s, [[70, 50, 30], [120, 90, 56], [170, 130, 86], [200, 166, 120]], { outline: [40, 28, 16] }); }
            }
            const bk = shape(); ellipse(bk, S, X1 - 10, B - 6, 10, 6); fill(S, bk, NP.oak.slice(3), { outline: NP.oak[0] });
            for (let k = 0; k < 7; k++) { const p = shape(); ellipse(p, S, X1 - 16 + (k % 4) * 4, B - 10 - Math.floor(k / 4) * 3, 2.5, 2); fill(S, p, [[120, 90, 40], [170, 130, 70], [200, 166, 100]], { edge: false }); }
        });
    }
    /** The prep table: carrots, onions, a cod half cleaned, a knife. */
    function prepTable(L, b, seed) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        tall(L, [X0 - 6, B - 50, X1 + 6, B + 8], 0, false, (S) => {
            shadow(S, X0 + W / 2 + 3, B + 1, W / 2 + 4, 5, 0.45);
            const tb = shape(); box(tb, S, X0, B - 34, W, 18, 0.3); fill(S, tb, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (const px of [X0 + 4, X1 - 8]) rectFill(S, px, B - 16, 4, 16, NP.oak[1]);
            for (let k = 0; k < 6; k++) { const cx = X0 + 12 + k * 5; const c = shape(); poly(c, S, [[cx - 2, B - 30], [cx + 2, B - 30], [cx + 7, B - 20], [cx + 6, B - 19]], 0); fill(S, c, [[160, 70, 10], [220, 110, 30], [250, 150, 60]], { edge: false }); rectFill(S, cx - 3, B - 33, 3, 3, [70, 130, 50]); }
            for (let k = 0; k < 3; k++) { const o = shape(); ellipse(o, S, X0 + 50 + k * 8, B - 26, 4, 3.5); fill(S, o, [[150, 110, 60], [200, 160, 100], [230, 200, 150]], { outline: [90, 60, 30] }); }
            const f = shape(); ellipse(f, S, X1 - 34, B - 26, 18, 5); fill(S, f, [[70, 76, 84], [120, 130, 140], [170, 178, 186], [210, 214, 218]], { outline: [30, 34, 40] });
            rectFill(S, X1 - 14, B - 28, 10, 2, PAL.iron[4]); rectFill(S, X1 - 18, B - 28, 4, 2, NP.oak[2]);
        });
    }
    /** Casks on their stands along the west wall, lying on their sides, a brass tap in each end. */
    function caskRack(L, b, seed) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, Y1 = (b.y1 + 1) * C, n = 6, step = (Y1 - Y0) / n;
        tall(L, [X0 - 4, Y0 - 30, X1 + 8, Y1 + 8], 0, false, (S) => {
            for (let k = 0; k < n; k++) {
                const gy = Math.round(Y0 + (k + 1) * step) - 4, cy = gy - 20, r = 19;
                rectFill(S, X0 + 8, gy - 6, X1 - X0 - 16, 6, NP.oak[1]); for (const px of [X0 + 10, X1 - 14]) rectFill(S, px, gy - 8, 4, 8, NP.oak[2]);   // the stand
                const s = shape(); box(s, S, X0 + 6, cy - r, X1 - X0 - 22, r * 2, 0); for (const [i] of s.px) { const py = (i / S.w) | 0; s.px.set(i, ((cy - py) / r) * 0.8 + (hash((i % S.w) >> 2, 1, seed + k) - 0.5) * 0.1); }
                fill(S, s, PAL.wood.slice(1, 7), { tex: 0.25, seed: seed + k, outline: PAL.wood[0] });
                for (const hx of [X0 + 14, X0 + 30, X1 - 30]) for (let py = cy - r + 1; py < cy + r; py++) { put(S, hx, py, PAL.iron[2]); put(S, hx + 1, py, PAL.iron[3]); }
                const end = shape(); ellipse(end, S, X1 - 16, cy, 8, r); fill(S, end, PAL.wood.slice(2, 7), { tex: 0.3, seed: seed + k + 5, outline: PAL.wood[0] });
                for (let py = cy - r + 2; py < cy + r - 1; py++) put(S, X1 - 16 + Math.round(Math.sqrt(Math.max(0, 1 - ((py - cy) / r) ** 2)) * 7), py, PAL.iron[3]);
                rectFill(S, X1 - 14, cy + 2, 8, 3, [200, 160, 60]); rectFill(S, X1 - 8, cy + 3, 3, 7, [220, 180, 80]); put(S, X1 - 7, cy + 10, [250, 220, 140]);   // the tap
                rectFill(S, X1 - 22, cy - 8, 6, 4, [230, 226, 214]);                                                                                   // the chalk mark
            }
        });
    }
    /** The bar: a heavy oak counter, its top worn pale, set with mugs, drinking horns, a jug and candles. */
    function barCounter(L, b, seed, N, FX) {
        tall(L, [b.x0 * C - 6, b.y0 * C - 40, (b.x1 + 1) * C + 10, (b.y1 + 1) * C + 10], 0, false, (S) => {
            for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
                if (N(x, y) !== 'bar_counter') continue;
                const X = x * C, Y = y * C - 14, down = N(x, y + 1) !== 'bar_counter', east = N(x + 1, y) !== 'bar_counter';
                for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) put(S, X + i, Y + j, pick(BOARD, 0.66 + (hash(Math.floor((X + i) / 7), 3, seed) - 0.5) * 0.2 + (vnoise((Y + j) / 9, (X + i) / 7, seed) - 0.5) * 0.12 + (i === 0 || i === C - 1 ? -0.3 : 0)));
                if (east) { for (let j = 0; j < C + 14; j++) for (let i = 0; i < 6; i++) put(S, X + C + i, Y + 4 + j, pick(BOARD, 0.32 - i * 0.03)); for (let j = 0; j < C + 14; j += 10) for (let i = 0; i < 6; i++) put(S, X + C + i, Y + 4 + j, BOARD[1]); }
                if (down) { for (let j = 0; j < 16; j++) for (let i = 0; i < C; i++) put(S, X + i, Y + C + j, pick(BOARD, 0.36 - j * 0.012 + ((i % 8) === 0 ? -0.15 : 0))); for (let i = 0; i < C; i++) put(S, X + i, Y + C, BOARD[6]); }
                const r = hash(x, y, seed + 4);                                                                         // what stands on it
                if (r < 0.3) for (const dx of [8, 20]) { rectFill(S, X + dx - 3, Y + 8, 7, 9, NP.oak[3]); rectFill(S, X + dx - 3, Y + 8, 7, 2, [236, 226, 196]); rectFill(S, X + dx + 4, Y + 10, 2, 5, NP.oak[1]); }
                else if (r < 0.5) { const h = shape(); thick(h, S, X + 6, Y + 18, X + 24, Y + 8, 2.2); fill(S, h, [[120, 100, 70], [200, 180, 140], [236, 222, 190]], { outline: [70, 56, 36] }); }
                else if (r < 0.65) { const j = shape(); ellipse(j, S, X + 16, Y + 12, 6, 8); fill(S, j, [[80, 36, 20], [140, 70, 40], [190, 110, 70]], { outline: [50, 20, 10] }); }
                else if (r < 0.8) { rectFill(S, X + 15, Y + 4, 3, 9, [236, 228, 204]); put(S, X + 16, Y + 2, NP.glow[NP.glow.length - 1]); FX.flames.push({ x: X + 16, y: Y + 2 }); FX.glows.push({ x: X + 16, y: Y + 12, r: 34, a: 0.5 }); }
            }
            // a checked cloth hanging over the corner
            const cx = (b.x0 + 4) * C + 6, cy = b.y1 * C - 8;
            for (let j = 0; j < 22; j++) for (let i = 0; i < 14; i++) put(S, cx + i + Math.round(j * 0.1), cy + j, ((i >> 2) + (j >> 2)) % 2 ? [200, 60, 50] : [226, 214, 196]);
        });
    }
    /** The long fire: a stone hearth the length of four tables, a pig turning on the spit at the north end, the
     *  cauldron on its iron frame over the coals at the south end. */
    function longFire(L, b, seed, FX) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, Y0 = b.y0 * C, B = (b.y1 + 1) * C - 4, mx = Math.round((X0 + X1) / 2);
        tall(L, [X0 - 10, Y0 - 60, X1 + 10, B + 10], 0, false, (S) => {
            for (let yy = Y0 - 20; yy < B + 20; yy++) for (let xx = X0 - 30; xx < X1 + 30; xx++) { const d = Math.hypot((xx - mx) / ((X1 - X0) / 2 + 30), (yy - (Y0 + B) / 2) / ((B - Y0) / 2 + 20)); if (d < 1) put(S, xx, yy, NP.glow[3], (1 - d) * 0.18); }
            // the kerb: fitted stones all round
            for (let y = Y0; y < B; y += 13) for (const x of [X0, X1 - 14]) { const st = shape(); box(st, S, x, y, 14, 12, 0.5); fill(S, st, NP.cliff.slice(2), { tex: 0.4, seed: seed + y + x, outline: NP.cliff[0] }); }
            for (let x = X0; x < X1; x += 15) for (const y of [Y0, B - 14]) { const st = shape(); box(st, S, x, y, 15, 14, 0.5); fill(S, st, NP.cliff.slice(2), { tex: 0.4, seed: seed + y + x * 3, outline: NP.cliff[0] }); }
            // the coals
            for (let y = Y0 + 14; y < B - 14; y++) for (let x = X0 + 14; x < X1 - 14; x++) { const h = vnoise(x / 4, y / 4, seed); const d = Math.abs(x - mx) / ((X1 - X0) / 2 - 14); put(S, x, y, h - d * 0.18 > 0.7 ? [255, 180, 70] : h - d * 0.18 > 0.58 ? [190, 70, 22] : h > 0.46 ? [86, 30, 14] : h > 0.3 ? [40, 24, 18] : [26, 22, 22]); }
            // flames along the middle
            const fy = Y0 + Math.round((B - Y0) * 0.62);
            for (const dx of [-12, 0, 12]) { const f = shape(); ellipse(f, S, mx + dx, fy - 8, 8, 14); fill(S, f, NP.glow.slice(1), { edge: false }); const f2 = shape(); ellipse(f2, S, mx + dx, fy - 4, 4, 7); fill(S, f2, NP.glow.slice(4), { edge: false }); FX.flames.push({ x: mx + dx, y: fy - 14, big: true }); }
            // the spit: two forked irons and a pig
            const sy = Y0 + 10;
            const fr = shape(); for (const sg of [-1, 1]) { thick(fr, S, mx + sg * 34, sy + 18, mx + sg * 34, sy - 22, 1.6); thick(fr, S, mx + sg * 34, sy - 22, mx + sg * 30, sy - 28, 1); thick(fr, S, mx + sg * 34, sy - 22, mx + sg * 38, sy - 28, 1); }
            fill(S, fr, PAL.iron, { outline: PAL.iron[0] });
            for (let px = mx - 42; px < mx + 44; px++) { put(S, px, sy - 22, PAL.iron[3]); put(S, px, sy - 21, PAL.iron[1]); }
            rectFill(S, mx + 42, sy - 26, 2, 8, PAL.iron[3]); rectFill(S, mx + 42, sy - 26, 6, 2, PAL.iron[3]);                          // the crank
            const pig = shape(); ellipse(pig, S, mx, sy - 22, 24, 11); ellipse(pig, S, mx + 24, sy - 24, 7, 6);
            for (const [i, v] of pig.px) pig.px.set(i, v + ((sy - 22 - ((i / S.w) | 0)) / 11) * 0.5);
            fill(S, pig, [[70, 26, 10], [120, 50, 18], [170, 84, 34], [210, 120, 56], [236, 160, 90]], { outline: [44, 16, 6] });
            for (let k = 0; k < 4; k++) rectFill(S, mx - 16 + k * 9, sy - 30 + (k % 2), 2, 14, [100, 40, 14]);
            // the cauldron on its frame
            const cy = B - 34;
            const cf = shape(); for (const sg of [-1, 1]) thick(cf, S, mx + sg * 30, B - 16, mx + sg * 30, cy - 34, 1.6); thick(cf, S, mx - 32, cy - 34, mx + 32, cy - 34, 1.4); fill(S, cf, PAL.iron, { outline: PAL.iron[0] });
            for (let j = cy - 33; j < cy - 14; j++) put(S, mx, j, PAL.iron[2]);
            const pot = shape(); ellipse(pot, S, mx, cy - 2, 16, 13); fill(S, pot, PAL.iron, { outline: PAL.iron[0] });
            const brim = shape(); ellipse(brim, S, mx, cy - 12, 14, 4); fill(S, brim, [[90, 70, 30], [140, 110, 50], [180, 150, 80]], { edge: false });
            FX.smoke.push({ x: mx - 6, y: cy - 20 }); FX.smoke.push({ x: mx, y: sy - 36 });
            FX.glows.push({ x: mx, y: (Y0 + B) / 2, r: 170, a: 0.6 });
        });
    }
    /** A plank bench, set along a wall: the long one under the back windows, the short ones down the east side. */
    function innBench(L, b, seed) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, Y0 = b.y0 * C + 4, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        tall(L, [X0 - 4, Y0 - 20, X1 + 6, B + 8], 0, false, (S) => {
            shadow(S, X0 + W / 2 + 3, B + 1, W / 2 + 2, 4, 0.4);
            const st = shape(); box(st, S, X0, Y0 - 6, W, B - Y0 - 6, 0.4); fill(S, st, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (let px = X0 + 1; px < X1 - 1; px++) put(S, px, Y0 - 5, NP.oak[6]);
            const fr = shape(); box(fr, S, X0, B - 12, W, 6, 0); fill(S, fr, NP.oak.slice(1, 4), { outline: NP.oak[0] });
            for (const px of [X0 + 4, X1 - 8]) rectFill(S, px, B - 8, 4, 8, NP.oak[1]);
        });
    }
    /** The tafl table: a heavy board cut into the tabletop, the king in the middle, the pieces mid-game, a candle. */
    function taflTable(L, b, seed, FX) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        tall(L, [X0 - 8, B - 70, X1 + 8, B + 8], 0, false, (S) => {
            shadow(S, X0 + W / 2 + 4, B + 2, W / 2 + 6, 6, 0.5);
            const tb = shape(); box(tb, S, X0, B - 52, W, 30, 0.3); fill(S, tb, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (const px of [X0 + 6, X1 - 10]) rectFill(S, px, B - 22, 4, 22, NP.oak[1]);
            const bx = X0 + W / 2 - 22, by = B - 50, sq = 44 / 11;
            rectFill(S, bx - 2, by - 2, 48, 30, NP.oak[0]);
            for (let j = 0; j < 7; j++) for (let i = 0; i < 11; i++) rectFill(S, Math.round(bx + i * sq), by + j * 4, Math.ceil(sq), 4, (i + j) % 2 ? NP.oak[5] : NP.oak[4]);
            for (let k = 0; k < 16; k++) { const i = Math.floor(hash(k, 1, seed) * 11), j = Math.floor(hash(k, 2, seed) * 7); rectFill(S, Math.round(bx + i * sq) + 1, by + j * 4 + 1, 2, 2, k < 9 ? [24, 20, 18] : [226, 216, 190]); }
            rectFill(S, bx + 21, by + 10, 3, 6, [230, 196, 90]); put(S, bx + 22, by + 9, [255, 230, 140]);                                   // the king
            rectFill(S, X1 - 14, B - 64, 3, 8, [234, 224, 196]); put(S, X1 - 13, B - 66, NP.glow[NP.glow.length - 1]); FX.flames.push({ x: X1 - 13, y: B - 66 }); FX.glows.push({ x: X1 - 13, y: B - 54, r: 44, a: 0.5 });
            for (const [dx, ramp] of [[10, NP.oak], [W - 30, NP.oak]]) { const m = shape(); box(m, S, X0 + dx, B - 60, 8, 9, 0.3); fill(S, m, ramp.slice(3), { outline: ramp[0] }); rectFill(S, X0 + dx, B - 60, 8, 2, [236, 226, 196]); }
        });
    }

    // ---------------------------------------------------------------------
    // Gullstrand Coast and the Wolf's Wake (after Tokelo's picture, 2026-11-13): a fishing village on green cliffs
    // under a storm, and above it the carved shrine of the two wolves (Fenrir's Heir, quest CL1).
    // ---------------------------------------------------------------------
    const THATCH = R(['#241a0c', '#352812', '#4a3818', '#5e4a20', '#745c2a', '#8a6e34', '#a0843e']);
    const THATCH_HI = R(['#4a3a1a', '#5a4620', '#6c5628', '#7e6630', '#927a3a', '#a68c46', '#bca054']);
    const GOLD = R(['#3a2408', '#6a4210', '#a06a1a', '#d09a2c', '#f0c850', '#fde58c', '#fff6cc']);
    const VIOLET = R(['#120a20', '#24163c', '#3a2660', '#56408a', '#7a62b4', '#a690dc', '#d6c8f6']);
    const SHINGLE = R(['#1e2024', '#2c2f34', '#3c4046', '#4e5258', '#62666a', '#787b7c', '#8f918e']);
    const SUN_LIGHT = [255, 196, 90], MOON_LIGHT = [168, 120, 255];
    const G_GROUND = new Set(['grass', 'path', 'flagstones', 'steps', 'shingle', 'wharf']);
    const G_BASE = { fir: 'grass', cliff: 'cliff', water: 'water', rowboat: 'water', wreck: 'shingle', wolf_carving: 'cliff', sun_cave: 'cliff', moon_cave: 'cliff',
        binding_stone: 'flagstones', steps: 'path', house: 'path', net_shed: 'path', awning: 'path' };
    /** A wolf at full stretch, facing right, in units of its length: ellipses for body, chest, haunch and head, limbs
     *  and tail as tapered strokes ([x, y, rx, ry] ellipses; [x1, y1, x2, y2, r] strokes; y is up from the paws). */
    const WOLF = {
        blobs: [[0.32, -0.55, 0.28, 0.115], [0.56, -0.56, 0.11, 0.125], [0.08, -0.56, 0.11, 0.115], [0.8, -0.68, 0.08, 0.068]],
        strokes: [[0.6, -0.6, 0.76, -0.67, 0.07], [0.8, -0.67, 0.96, -0.645, 0.036], [0.82, -0.63, 0.94, -0.59, 0.022],
            [0.6, -0.49, 0.76, -0.4, 0.033], [0.76, -0.4, 0.92, -0.38, 0.024], [0.54, -0.47, 0.62, -0.34, 0.03], [0.62, -0.34, 0.74, -0.27, 0.022],
            [0.06, -0.48, -0.1, -0.42, 0.04], [-0.1, -0.42, -0.26, -0.43, 0.024], [0.12, -0.46, 0.02, -0.33, 0.034], [0.02, -0.33, -0.14, -0.27, 0.022],
            [-0.02, -0.6, -0.18, -0.68, 0.05], [-0.18, -0.68, -0.34, -0.7, 0.04], [-0.34, -0.7, -0.42, -0.67, 0.025]],
        ears: [[0.75, -0.73, 0.78, -0.85, 0.82, -0.73], [0.8, -0.73, 0.84, -0.83, 0.86, -0.71]]
    };

    function gullstrand(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 1213, img = L.base;
        const N = (x, y) => nameAt(map, x, y);
        const under = new Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y);
            if (n === 'rock') { under[y * cw + x] = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => N(x + dx, y + dy) === 'water') ? 'water' : null; continue; }
            under[y * cw + x] = G_GROUND.has(n) && n !== 'steps' ? n : G_BASE[n] || null;
        }
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (!under[y * cw + x]) {
            const votes = {};
            for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const n = N(x + dx, y + dy); if (G_GROUND.has(n) && n !== 'steps') votes[n] = (votes[n] || 0) + 1; }
            under[y * cw + x] = Object.keys(votes).sort((a, b) => votes[b] - votes[a] || (a < b ? -1 : 1))[0] || 'grass';
        }
        const U = (x, y) => (x < 0 || y < 0 || x >= cw || y >= ch ? null : under[y * cw + x]);
        const isWater = (x, y) => U(x, y) === 'water', isPlank = (x, y) => U(x, y) === 'wharf';
        const pathC = new Float32Array(cw * ch), landC = new Float32Array(cw * ch);
        for (let i = 0; i < cw * ch; i++) { pathC[i] = under[i] === 'path' ? 1 : 0; landC[i] = under[i] === 'water' ? 0 : 1; }
        const pathF = field(pathC, cw, ch), landF = field(landC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);          // 0 grass, 1 path, 2 wharf, 3 water, 4 flagstones, 5 rock, 6 shingle
        const cobbleAt = (x, y, ramp, sw, sh, sd) => {
            const row = Math.floor(y / sh), u = x + hash(row, 1, sd) * sw * 2 + Math.sin(y / 9 + row) * 1.2, col = Math.floor(u / sw), fx = u - col * sw, fy = y - row * sh;
            if (fx < 1 || fy < 1 || (fx < 2 && fy < 2) || (fx > sw - 1.2 && fy < 2)) return ramp[0];
            return pick(ramp, 0.22 + hash(col, row, sd + 2) * 0.5 + (fy < 2.2 ? 0.1 : fy > sh - 1.6 ? -0.1 : 0) + (fx < 2.2 ? 0.05 : 0));
        };
        // The ring of the Wolf's Wake: concentric courses of flagstone round a centre stone, split by one crack.
        const ring = (() => { const o = (map.encounters || []).find((e) => e.id === 'wolfs_wake_trial'); return o ? { x: o.x * C + 16, y: o.y * C + 16 } : { x: 28 * C + 16, y: 8 * C + 16 }; })();
        const RX = 104, RY = 78;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cx = Math.floor(x / C), cy = Math.floor(y / C), g = under[cy * cw + cx];
            const n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            if (g === 'water') {
                kind[i] = 3;
                const shore = landF(x, y);
                let t = 0.16 + (fbm(x / 40, y / 9, seed + 12) - 0.5) * 0.5 + (y / img.h) * 0.08;
                if (vnoise(x / 9, y / 2.4, seed + 13) > 0.74) t += 0.16;
                put(img, x, y, pick(NP.water, t));
                const cap = vnoise(x / 7, y / 2.2, seed + 14) + fbm(x / 30, y / 18, seed + 15) * 0.4;
                if (cap > 1.02) put(img, x, y, pick(NP.foam, cap - 1.02 + hash(x, y, seed) * 0.4), 0.8);                     // whitecaps
                if (shore > 0.12) { const f = (shore - 0.12) * 2.6 + (vnoise(x / 4, y / 3, seed + 16) - 0.5) * 0.9; if (f > 0.35) put(img, x, y, pick(NP.foam, f * 0.7 + hash(x, y, seed + 1) * 0.3), Math.min(0.95, f)); }
                continue;
            }
            if (g === 'cliff') { kind[i] = 5; put(img, x, y, n1 * 0.7 + n2 * 0.3 > 0.52 ? pick(NP.turf, 0.25 + n1 * 0.5) : pick(NP.cliff, 0.12 + n1 * 0.4 + hash(x, y, seed) * 0.08)); continue; }
            if (g === 'wharf') { kind[i] = 2; continue; }
            if (g === 'flagstones') {
                kind[i] = 4;
                const dx = (x - ring.x) / RX, dy = (y - ring.y) / RY, d = Math.hypot(dx, dy);
                if (d < 1) {
                    const r5 = d * 4, band = Math.floor(r5), a = Math.atan2(dy, dx) + Math.PI, segs = 4 + band * 5, seg = Math.floor(a / (Math.PI * 2) * segs + band * 0.4);
                    const fr = r5 - band, af = a / (Math.PI * 2) * segs + band * 0.4 - seg;
                    put(img, x, y, fr < 0.08 || af < 0.05 || d > 0.97 ? FLAG[0] : pick(FLAG, 0.42 + hash(band, seg, seed + 55) * 0.35 + (band === 0 ? 0.12 : 0)));
                } else put(img, x, y, cobbleAt(x, y, FLAG, 19, 13, seed + 50));
                if (fbm(x / 9, y / 7, seed + 41) > 0.7 && d > 0.9) put(img, x, y, pick(NP.turf, 0.3 + n2 * 0.4), 0.8);   // grass in the joints at the edges
                continue;
            }
            if (g === 'shingle') {
                // The sea's edge wanders up and down the beach (a ragged tide line, not the tile edge).
                const tide = landF(x, y) + (fbm(x / 16, y / 12, seed + 62) - 0.5) * 0.4;
                if (tide < 0.66) {
                    kind[i] = 3;
                    put(img, x, y, pick(NP.water, 0.3 + (tide - 0.4) * 0.6 + (n2 - 0.5) * 0.15));
                    if (tide > 0.56 - n2 * 0.08) put(img, x, y, pick(NP.foam, 0.4 + hash(x, y, seed) * 0.5), 0.85);
                    continue;
                }
                kind[i] = 6;
                put(img, x, y, pick(SHINGLE, 0.46 + (n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.2));
                put(img, x, y, [120, 104, 80], 0.12 + n1 * 0.12);                                                           // sand between the stones
                if (hash(x >> 1, y >> 1, seed + 60) < 0.22) put(img, x, y, pick(SHINGLE, 0.2 + hash(x >> 1, y >> 1, seed + 63) * 0.7), 0.7);   // pebbles
                if (tide < 0.8) put(img, x, y, NP.water[1], (0.8 - tide) * 2.4);                                            // wet stones
                continue;
            }
            if (pathF(x, y) + (n1 - 0.5) * 0.45 + (n2 - 0.5) * 0.12 > 0.5) {
                kind[i] = 1;
                put(img, x, y, pick(NP.dirt, 0.3 + fbm(x / 10, y / 10, seed + 7) * 0.45 + hash(x, y, seed + 8) * 0.2)); put(img, x, y, [130, 100, 60], 0.16);
            } else {
                kind[i] = 0;
                const m = fbm(x / 30, y / 18, seed + 3);
                put(img, x, y, m < 0.42 ? pick(NP.grass, 0.4 + n2 * 0.4 + m * 0.4) : pick(NP.turf, 0.2 + (m - 0.42) * 1.1 + (n2 - 0.5) * 0.3));
            }
        }
        // Edges: the path's lip of trodden turf, and tufts, heather, little flowers and stones.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] === 0 && (kind[i + img.w] === 1 || kind[i + 1] === 1)) put(img, x, y, NP.grass[1], 0.7);
            else if (kind[i] === 1 && (kind[i - img.w] === 0 || kind[i - 1] === 0)) put(img, x, y, NP.dirt[6], 0.5);
        }
        for (let n = 0; n < (img.w * img.h) / 36; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 && r < 0.3) { for (let j = 0; j < 3; j++) put(img, x + (j & 1), y - j, NP.turf[5 + (j & 1)]); }
            else if (k === 0 && r < 0.38) { put(img, x, y, [140, 96, 150]); put(img, x + 1, y, [112, 74, 126]); put(img, x, y - 1, [168, 120, 172]); }           // heather
            else if (k === 0 && r < 0.42) { put(img, x, y, [226, 214, 150]); put(img, x, y + 1, NP.turf[2]); }
            else if (k === 1 && r < 0.3) { put(img, x, y, NP.rock[6]); put(img, x + 1, y, NP.rock[5]); put(img, x, y + 1, NP.dirt[0]); }
            else if (k === 4 && r < 0.06) { rectFill(img, x, y, 3, 1, [70, 86, 52]); put(img, x + 1, y - 1, [70, 86, 52]); }
        }
        // The crack across the ring: the broken binding, cut through every course.
        for (let k = -RX + 8; k < RX - 8; k++) {
            const px = ring.x + k, py = Math.round(ring.y - k * 0.32 + Math.sin(k / 6) * 3 + (hash(k >> 2, 1, seed) - 0.5) * 3);
            put(img, px, py, [14, 12, 16]); put(img, px, py + 1, FLAG[1]); if (hash(k, 2, seed) < 0.3) put(img, px, py - 1, [14, 12, 16], 0.7);
        }
        // Rocky lips where land meets the sea, then the quay, the pier and the boats' wharf.
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const g = U(x, y), X0 = x * C, Y0 = y * C;
            if (g !== 'water' && g !== 'wharf' && g !== 'cliff' && isWater(x, y + 1)) {
                RK.blocks(img, X0, Y0 + C, C, 9, seed + x, NP.cliff);
                for (let i = 0; i < C; i++) { put(img, X0 + i, Y0 + C - 1, NP.cliff[6]); for (let j = 0; j < 4; j++) put(img, X0 + i, Y0 + C + 9 + j, NP.shadow, 0.5 - j * 0.12); }
            }
            if (g !== 'wharf') continue;
            RK.planks(img, X0, Y0, C, C, seed + y * 3 + (isPlank(x - 1, y) || isPlank(x + 1, y) ? 0 : x), NP.plank, isPlank(x - 1, y) || isPlank(x + 1, y) || !isPlank(x, y + 1));
            for (let n = 0; n < 3; n++) if (hash(x, y * 7 + n, seed) < 0.35) put(img, X0 + 4 + hash(x, n, seed) * 24, Y0 + 4 + hash(y, n, seed) * 24, PAL.iron[1]);
            if (!isPlank(x, y - 1)) for (let i = 0; i < C; i++) { put(img, X0 + i, Y0, NP.plank[7]); put(img, X0 + i, Y0 + 1, NP.plank[6], 0.6); }
            if (!isPlank(x - 1, y)) for (let j = 0; j < C; j++) { put(img, X0, Y0 + j, NP.plank[0]); put(img, X0 + 1, Y0 + j, NP.plank[6], 0.4); }
            if (!isPlank(x + 1, y)) for (let j = 0; j < C; j++) { put(img, X0 + C - 1, Y0 + j, NP.plank[0]); if (isWater(x + 1, y)) { put(img, X0 + C, Y0 + j, NP.shadow, 0.5); put(img, X0 + C + 1, Y0 + j, NP.shadow, 0.3); } }
            if (isWater(x, y + 1)) {
                for (let i = 0; i < C; i++) { put(img, X0 + i, Y0 + C - 2, NP.plank[6]); put(img, X0 + i, Y0 + C - 1, NP.plank[1]); for (let j = 0; j < 9; j++) put(img, X0 + i, Y0 + C + j, NP.shadow, 0.78 - j * 0.07); }
                for (const px of [X0 + 5, X0 + 21]) { for (let j = 0; j < 13; j++) { rectFill(img, px, Y0 + C + j, 4, 1, NP.plank[j < 2 ? 4 : 2]); put(img, px, Y0 + C + j, NP.plank[5]); } }
            }
            const sea = isWater(x, y - 1) ? -1 : isWater(x, y + 1) ? 1 : 0;
            if (sea && (x + y) % 3 === 0) items.push({ x, y: sea < 0 ? y - 0.2 : y + 0.86, draw: () => post(img, X0 + 16, sea < 0 ? Y0 + 6 : Y0 + C - 3, seed + x, null) });
            else if ((isWater(x + 1, y) || isWater(x - 1, y)) && y % 2 === 0) items.push({ x, y: y + 0.3, draw: () => post(img, isWater(x + 1, y) ? X0 + C - 4 : X0 + 4, Y0 + 18, seed + y, null) });
        }
        const open = (x, y) => G_GROUND.has(N(x, y));
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const inner = innerFn(map, nameAt);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const seen = new Set(), tinted = [], caves = {};
        for (const name of ['sun_cave', 'moon_cave']) { let sx = 0, n = 0; for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (N(x, y) === name) { sx += x; n++; } if (n) caves[name] = Math.round((sx / n) * C + 16); }
        const SHRINE = new Set(['wolf_carving', 'sun_cave', 'moon_cave']);
        const BLOCKS = {
            house: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + b.x0 * 5 + b.y0, anyBehind(b), FX, { z: 2, chimneys: 1, thatch: true }) }),
            net_shed: (b) => ({ y: b.y1 + 0.9, draw: () => { building(L, b, seed + 71, anyBehind(b), FX, { z: 1.5, thatch: true }); netDrape(img, b, seed); } }),
            awning: (b) => ({ y: b.y1 + 0.8, draw: () => awning(L, b, seed + 5) }),
            fish_rack: (b) => ({ y: b.y1 + 0.6, draw: () => fishRack(L, b, seed + b.x0, anyBehind(b)) }),
            wreck: (b) => ({ y: b.y1 + 0.5, draw: () => wreck(L, b, seed + 9) }),
            wolf_carving: (b) => ({ y: b.y1 + 0.9, draw: () => wolfCarving(L, b, seed, tinted, caves) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (SHRINE.has(n)) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, SHRINE, seen); items.push({ x, ...BLOCKS.wolf_carving(b) }); continue; }
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P2 = {
                cliff: () => { const inn = inner(x, y, 'cliff'); if (inn && hash(x, y, seed + 31) > 0.3) return; cragCell(L, x, y, seed, NP.cliff, NP.turf, 6, open(x, y + 1) || isWater(x, y + 1), open(x, y - 1), inn ? 2 : 1); },
                rock: () => {
                    if (isWater(x, y)) { for (let a = 0; a < 48; a++) { const t = (a / 48) * Math.PI * 2; put(img, cx + Math.cos(t) * (18 + hash(a, 1, seed) * 4), gy - 4 + Math.sin(t) * (8 + hash(a, 2, seed) * 3), NP.foam[1 + (a & 1)], 0.8); } cragCell(L, x, y, seed + 7, NP.cliff, NP.turf, 6, true, false, 1); }
                    else stone(img, cx, gy - 8, 11 + hash(x, y, seed) * 3, 8, seed + x * 3 + y, NP.cliff, NP.turf, 0.5);
                },
                fir: () => fir(L, x, y, seed, behind(x, y), 0),
                rowboat: () => rowboat(img, cx, gy, seed + x, true),
                barrel: () => barrel(L, cx, gy, seed + x),
                crate: () => crate(L, cx, gy, seed + x),
                fence: () => fence(L, map, nameAt, x, y, seed),
                steps: () => cliffSteps(img, N, x, y, seed),
                binding_stone: () => tall(L, [cx - 26, gy - 80, cx + 26, gy + 8], y * C, open(x, y - 1), (S) => bindingStone(S, cx, gy, seed, tinted))
            }[n];
            if (P2) items.push({ x, y: y + (n === 'fir' ? 0.8 : n === 'cliff' ? 0.95 : n === 'steps' ? -1 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Gulls over the sea and on the stacks.
        for (let n = 0; n < 14; n++) { const gx = Math.floor((0.45 + hash(n, 1, seed + 80) * 0.53) * img.w), gy2 = Math.floor((0.05 + hash(n, 2, seed + 80) * 0.9) * img.h); if (kind[gy2 * img.w + gx] === 3) { rectFill(img, gx - 2, gy2, 2, 1, [236, 238, 240]); rectFill(img, gx + 1, gy2, 2, 1, [236, 238, 240]); put(img, gx, gy2 + 1, [210, 214, 220]); } }
        edgeShade(img, 14, 0.3);
        // The storm coming in over the sea from the north-east: cloud shadow on the water.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const a = clamp(sstep(0.55, 1.0, x / img.w) * sstep(1.0, 0.0, y / img.h) * (0.25 + fbm(x / 90, y / 50, seed + 90) * 0.6), 0, 0.55);
            if (a > 0.02) put(img, x, y, [18, 20, 32], a * (kind[y * img.w + x] === 3 ? 1 : 0.6));
        }
        storm([img, L.over], glows, tinted);
        const water = [];
        for (let i = 0; i < kind.length; i += 5) if (kind[i] === 3 && hash(i, 0, seed) < 0.1) water.push(i);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water, animate: animator(flames, smoke) };
    }
    /** A grey day under a storm: everything cools and dims a little; lit windows warm their walls, and the two caves
     *  throw their own light (sun-gold and moon-violet) over the flagstones. */
    function storm(layers, glows, tinted) {
        for (const im of layers) { const d = im.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = d[i] * 0.84 + 4; d[i + 1] = d[i + 1] * 0.87 + 6; d[i + 2] = d[i + 2] * 0.93 + 12; } }
        for (const g of [...glows.map((q) => ({ ...q, c: WARM })), ...tinted]) {
            const r = g.r, a = g.a == null ? 0.5 : g.a, ry = Math.round(r * 0.8), c = g.c;
            for (let yy = -ry; yy <= ry; yy++) for (let xx = -r; xx <= r; xx++) {
                const x = Math.round(g.x) + xx, y = Math.round(g.y) + yy, dd = Math.hypot(xx, yy / 0.8) / r;
                if (dd >= 1 || x < 0 || y < 0 || x >= layers[0].w || y >= layers[0].h) continue;
                const w = (1 - dd) * (1 - dd) * a;
                for (const im of layers) { const i = (y * im.w + x) * 4, d = im.data; if (!d[i + 3]) continue; for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] + c[j] * w * 0.5 + (c[j] - d[i + j]) * w * 0.25); }
            }
        }
    }
    /** Stone steps cut up the headland: treads across the climb, the cliff's edge either side. */
    function cliffSteps(img, N, x, y, seed) {
        const X0 = x * C, Y0 = y * C;
        for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) {
            const u = (Y0 + j) % 7, bq = Math.floor((i + Math.floor((Y0 + j) / 7) * 5) / 10);
            put(img, X0 + i, Y0 + j, u === 0 ? FLAG[6] : u === 6 ? FLAG[0] : u === 5 ? FLAG[1] : pick(FLAG, 0.35 + hash(bq, Math.floor((Y0 + j) / 7), seed + x) * 0.3 + (u < 3 ? 0.08 : 0)));
            if (u > 0 && u < 3 && hash(X0 + i, Y0 + j, seed + 4) < 0.08) put(img, X0 + i, Y0 + j, NP.turf[4]);
        }
        for (const [dx, ex] of [[-1, 0], [1, C - 1]]) if (N(x + dx, y) !== 'steps') for (let j = 0; j < C; j++) { put(img, X0 + ex, Y0 + j, FLAG[0]); put(img, X0 + ex + (dx < 0 ? 1 : -1), Y0 + j, FLAG[2]); put(img, X0 + ex + (dx < 0 ? -1 : 1), Y0 + j, NP.shadow, 0.5); }
    }
    /** Nets hung to dry on the net shed's side wall, with cork floats. */
    function netDrape(img, b, seed) {
        const X0 = (b.x1 + 1) * C - 30, X1 = (b.x1 + 1) * C + 6, Y = (b.y1 + 1) * C - 40;
        for (let px = X0; px < X1; px++) { const sag = 26 + Math.sin(((px - X0) / (X1 - X0)) * Math.PI) * 8; for (let py = Y; py < Y + sag; py++) if ((px + py) % 4 === 0 || (px - py + 400) % 4 === 0) put(img, px, py, [176, 166, 136], 0.9); }
        for (let px = X0 - 2; px < X1 + 2; px++) { put(img, px, Y, NP.oak[4]); put(img, px, Y + 1, NP.oak[1]); }
        for (let k = 0; k < 4; k++) { const f = shape(); ellipse(f, img, X0 + 5 + k * 9, Y + 22 + (k % 2) * 5, 2.2, 1.7); fill(img, f, NP.oak.slice(4), { outline: NP.oak[1] }); }
    }
    /** A canvas awning on four poles, sagging between them, a bench and a basket of floats under it. */
    function awning(L, b, seed) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4, top = B - 46;
        tall(L, [X0 - 8, top - 8, X1 + 8, B + 6], b.y0 * C, false, (S) => {
            shadow(S, (X0 + X1) / 2 + 4, B, (X1 - X0) / 2 + 4, 6, 0.4);
            const p = shape(); for (const px of [X0 + 2, X1 - 3]) thick(p, S, px, B, px, top + 6, 1.4); fill(S, p, NP.oak.slice(2), { outline: NP.oak[0] });
            const cl = shape();
            poly(cl, S, [[X0 - 4, top + 6], [X1 + 4, top], [X1 + 6, top + 22], [X0 - 2, top + 26]], (px, py) => -0.3 + Math.sin((px - X0) / 7) * 0.18 + ((py - top) / 26) * -0.4);
            fill(S, cl, NP.wool.slice(1), { tex: 0.25, seed, outline: NP.wool[0] });
            for (let px = X0 - 2; px < X1 + 6; px += 3) put(S, px, top + 24 + Math.round(Math.sin(px / 4) * 1.5), NP.wool[1]);
            barrel({ base: S }, X0 + 14, B, seed + 1); crate({ base: S }, X1 - 14, B, seed + 2);
        });
    }
    /** The wreck on the beach: a longship on her side with her back broken, ribs showing through the gap, a mast
     *  snapped twice and the sail in red rags; loose strakes on the shingle round her. */
    function wreck(L, b, seed) {
        const X0 = b.x0 * C + 6, X1 = (b.x1 + 1) * C - 4, W = X1 - X0, B = (b.y1 + 1) * C - 10, mx = Math.round(X0 + W * 0.52);
        const bow = (px) => Math.pow(Math.abs((px - X0) / W - 0.5) * 2, 2.6), tilt = (px) => ((px - X0) / W) * 18;
        const keel = (px) => B - bow(px) * 20 - tilt(px), sheer = (px) => B - 30 - bow(px) * 30 - tilt(px), gap = (px) => Math.abs(px - mx) < 14 + Math.sin(px) * 2;
        tall(L, [X0 - 30, B - 160, X1 + 30, B + 20], b.y0 * C + 40, false, (S) => {
            shadow(S, mx + 6, B + 2, W / 2 + 10, 10, 0.5);
            for (let k = 0; k < 7; k++) { const sx = X0 + hash(k, 1, seed) * W, sy = B + 4 + hash(k, 2, seed) * 14, pl = shape(); thick(pl, S, sx, sy, sx + 14 + hash(k, 3, seed) * 14, sy - 3 + hash(k, 4, seed) * 6, 1.6); fill(S, pl, NP.oak.slice(1, 6), { outline: NP.oak[0] }); }
            const hull = shape();
            for (let px = X0; px <= X1; px++) for (let py = Math.round(sheer(px)); py <= keel(px); py++) if (!gap(px) || py > keel(px) - 6) sset(hull, S, px, py, ((py - sheer(px)) / 30) * -0.8 + 0.3);
            fill(S, hull, NP.oak, { outline: NP.oak[0] });
            for (const [i] of hull.px) { const px = i % S.w, py = (i / S.w) | 0, d = Math.round(keel(px)) - py; if (d % 5 === 4) put(S, px, py, NP.oak[0], 0.8); else if (d % 5 === 1 && px % 8 === 0) put(S, px, py, PAL.iron[3]); if (hash(px >> 2, py >> 2, seed) < 0.06) put(S, px, py, [40, 52, 34]); }
            // The break: dark inside, ribs standing up through it.
            for (let px = mx - 16; px <= mx + 16; px++) for (let py = Math.round(sheer(px)) - 2; py < keel(px) - 6; py++) put(S, px, py, [16, 12, 10], gap(px) ? 0.95 : 0);
            for (let k = -2; k <= 2; k++) { const rx = mx + k * 6, rb = shape(); thick(rb, S, rx, keel(rx) - 6, rx + k * 2, sheer(rx) - 10 - Math.abs(k) * -3, 1.3); fill(S, rb, NP.oak.slice(3), { outline: NP.oak[0] }); }
            for (let px = X0; px <= X1; px++) if (!gap(px)) { put(S, px, Math.round(sheer(px)), NP.oak[6]); put(S, px, Math.round(sheer(px)) + 1, NP.oak[5]); }
            // The stem post curls up at the bow (west); the stern is broken off short.
            const st = shape(), y0 = sheer(X0);
            thick(st, S, X0 + 3, y0 + 4, X0 - 5, y0 - 20, 2.2); thick(st, S, X0 - 5, y0 - 20, X0 - 3, y0 - 34, 1.9); thick(st, S, X0 - 3, y0 - 34, X0 - 10, y0 - 38, 1.7);
            fill(S, st, NP.oak.slice(2), { outline: NP.oak[0] });
            const sp = shape(); thick(sp, S, X1, sheer(X1) + 2, X1 + 4, sheer(X1) - 10, 2); fill(S, sp, NP.oak.slice(2), { outline: NP.oak[0] });
            // Mast, snapped: a stump with a jagged top, and the upper part leaning against it, yard and rags.
            const mbase = sheer(mx + 26) + 4, mtop = mbase - 92;
            const ms = shape(); thick(ms, S, mx + 26, mbase, mx + 30, mtop, 1.8); thick(ms, S, mx + 30, mtop, mx + 54, mtop + 30, 1.5); fill(S, ms, NP.oak.slice(2), { outline: NP.oak[0] });
            const yd = shape(); thick(yd, S, mx + 4, mtop + 10, mx + 58, mtop + 4, 1.2); fill(S, yd, NP.oak.slice(2), { outline: NP.oak[0] });
            for (let py = mtop + 12; py < mtop + 62; py++) for (let px = mx + 6; px < mx + 56; px++) {
                const u = (px - mx - 6) / 50, f = (py - mtop - 12) / 50, edge = 0.35 + vnoise(px / 4, 0, seed) * 0.9;
                if (f > edge || hash(px >> 1, py >> 1, seed + 3) < 0.12 + f * 0.25) continue;                                  // torn bottom edge and holes
                put(S, px, py, pick(Math.floor(u * 4) % 2 ? NP.wool : NP.madder, 0.45 + Math.sin(u * Math.PI * 4) * 0.1 - f * 0.25 + (vnoise(px / 5, py / 7, seed) - 0.5) * 0.25));
            }
            const line = (x1, y1, x2, y2, a) => { const n = Math.hypot(x2 - x1, y2 - y1); for (let t = 0; t <= n; t++) put(S, x1 + ((x2 - x1) * t) / n, y1 + ((y2 - y1) * t) / n, [34, 28, 22], a); };
            line(mx + 30, mtop + 2, X0 + 6, sheer(X0) - 10, 0.55); line(mx + 30, mtop + 2, X1 - 4, sheer(X1) - 6, 0.55);
            for (let px = X0 - 10; px < X1 + 10; px += 3) if (hash(px, 1, seed) < 0.5) put(S, px, B + 2 + hash(px, 2, seed) * 3, NP.foam[1], 0.6);
        });
    }
    /** The carved face of the Wolf's Wake: the cliff cut back flat; on the sun's side a rayed sun and Sköll running
     *  at it, a broken chain across the middle, on the moon's side Hati running at a crescent; the bright cave
     *  under the sun and the dark one under the moon. Light comes out of both caves. */
    function wolfCarving(L, b, seed, tinted, caves) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C - 18, B = (b.y1 + 1) * C, W = X1 - X0, S = L.base;
        // The cut face: a shallow recess with a worn frame.
        for (let py = Y0; py < B; py++) {
            const sw = 10 + Math.sin(py / 11) * 3;
            for (let px = X0; px < X1; px++) {
                const inside = px > X0 + sw && px < X1 - sw && py > Y0 + 10;
                const n = fbm(px / 26, py / 14, seed + 300), v = vnoise(px / 4, py / 6, seed + 301);
                put(S, px, py, pick(NP.cliff, (inside ? 0.28 : 0.42) + n * 0.28 + (v - 0.5) * 0.1 + (py - Y0) / (B - Y0) * -0.08));
                if (!inside && hash(px >> 1, py >> 2, seed) < 0.12) put(S, px, py, pick(NP.turf, 0.3 + v * 0.4));
                if (inside && hash(px >> 3, py >> 4, seed + 7) < 0.05) put(S, px, py, NP.cliff[1], 0.6);                        // old cracks
            }
        }
        for (let px = X0 + 12; px < X1 - 12; px++) { put(S, px, Y0 + 10, NP.cliff[0]); put(S, px, Y0 + 11, NP.cliff[1]); put(S, px, B - 1, NP.shadow, 0.6); }
        // A carving: a shape filled with a lit ramp, cut deep (dark rim below and right, pale rim above and left).
        const carve = (s, ramp) => {
            fill(S, s, ramp.slice(1), { tex: 0.3, seed: seed + 5 });
            for (const [i] of s.px) {
                const px = i % S.w, py = (i / S.w) | 0;
                if (!s.px.has(i + 1) || !s.px.has(i + S.w)) put(S, px + 1, py + 1, [10, 8, 12], 0.8);
                if (!s.px.has(i - 1) || !s.px.has(i - S.w)) put(S, px - 1, py - 1, ramp[ramp.length - 1], 0.5);
            }
        };
        const top = Y0 + 14, sunX = X0 + 70, moonX = X1 - 70;
        // The sun, rayed like a wheel.
        const sun = shape(); ellipse(sun, S, sunX, top + 28, 18, 18);
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; thick(sun, S, sunX + Math.cos(a) * 20, top + 28 + Math.sin(a) * 20, sunX + Math.cos(a) * 30, top + 28 + Math.sin(a) * 30, 2); }
        carve(sun, GOLD);
        tinted.push({ x: sunX, y: top + 28, r: 50, a: 0.35, c: SUN_LIGHT });
        // The moon: a crescent.
        const moon = shape();
        for (let yy = -24; yy <= 24; yy++) for (let xx = -24; xx <= 24; xx++) if (Math.hypot(xx, yy) <= 20 && Math.hypot(xx - 10, yy - 6) > 16) sset(moon, S, moonX + xx, top + 28 + yy, -yy / 30 - xx / 40);
        carve(moon, VIOLET);
        tinted.push({ x: moonX, y: top + 30, r: 50, a: 0.3, c: MOON_LIGHT });
        // The wolves, running out from the middle toward their lights.
        const wolf = (cx, gy, len, dir, ramp) => {
            const s = shape(), X = (u) => cx + dir * (u - 0.32) * len, Y = (v) => gy + v * len;
            for (const [u1, v1, u2, v2, r] of WOLF.strokes) thick(s, S, X(u1), Y(v1), X(u2), Y(v2), r * len, -0.1);
            for (const [u, v, rx, ry] of WOLF.blobs) ellipse(s, S, X(u), Y(v), rx * len, ry * len, 0.15);
            for (const [a1, b1, a2, b2, a3, b3] of WOLF.ears) poly(s, S, [[X(a1), Y(b1)], [X(a2), Y(b2)], [X(a3), Y(b3)]], 0.4);
            for (const [i, v] of s.px) s.px.set(i, v + (vnoise((i % S.w) / 6, ((i / S.w) | 0) / 6, seed) - 0.5) * 0.3);
            carve(s, ramp);
            const ex = X(0.83), ey = Y(-0.69);
            put(S, ex, ey, ramp[ramp.length - 1]); put(S, ex + dir, ey, ramp[ramp.length - 1]);                                 // the eye
            for (let k = 0; k < 9; k++) { const fx = X(0.08 + k * 0.06), fy = Y(-0.62 + Math.sin(k) * 0.015); put(S, fx, fy, ramp[2]); put(S, fx + dir, fy + 1, ramp[2]); }   // fur along the back
        };
        const mid = Math.round(X0 + W / 2), LEN = 108, wolfY = Y0 + 159, off = 20 + 0.74 * LEN;
        wolf(mid - off, wolfY, LEN, -1, GOLD);
        wolf(mid + off, wolfY, LEN, 1, VIOLET);
        // The chain, link by link from wolf to wolf, broken in the middle: the left half sun-lit, the right moon-dark.
        for (let k = -6; k <= 6; k++) {
            if (Math.abs(k) < 1) continue;
            const lx = mid + k * 14 + (k > 0 ? 6 : -6), ly = wolfY - 0.52 * LEN + Math.cos(k * 0.5) * -5 + (Math.abs(k) === 1 ? 7 : 0), l = shape();
            if (k % 2) { for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; for (const r of [1, 0.8, 0.62]) sset(l, S, lx + Math.cos(t) * 9 * r, ly + Math.sin(t) * 5 * r, Math.sin(t) * -0.6); } }
            else { for (let a = 0; a < 28; a++) { const t = (a / 28) * Math.PI * 2; for (const r of [1, 0.7]) sset(l, S, lx + Math.cos(t) * 3 * r, ly + Math.sin(t) * 6.5, Math.cos(t) * -0.6); } }
            const ramp = k < 0 ? GOLD : VIOLET;
            fill(S, l, k < 0 ? [ramp[1], ramp[2], NP.cliff[5], ramp[4]] : [ramp[0], ramp[2], NP.cliff[4], ramp[4]], { outline: [10, 8, 12] });
        }
        // The broken ends: a scatter of chips under the gap.
        for (let k = 0; k < 14; k++) put(S, mid - 8 + hash(k, 1, seed) * 16, wolfY - 26 + hash(k, 2, seed) * 20, NP.cliff[1 + (k % 3)]);
        // The caves: an arch in the rock, the inside lit from somewhere deep.
        for (const [name, ramp, light] of [['sun_cave', GOLD, SUN_LIGHT], ['moon_cave', VIOLET, MOON_LIGHT]]) {
            const ccx = caves[name];
            if (ccx == null) continue;
            const hw = 40, hh = 46, gyc = B;
            for (let py = gyc - hh; py < gyc; py++) for (let px = ccx - hw; px <= ccx + hw; px++) {
                const u = (px - ccx) / hw, f = (gyc - py) / hh; if (u * u + f * f > 1) continue;
                const depth = Math.hypot(u, f * 0.9);
                put(S, px, py, depth > 0.86 ? NP.cliff[0] : pick(ramp, 0.15 + (1 - depth) * 0.8 + (vnoise(px / 5, py / 5, seed + 8) - 0.5) * 0.2));
            }
            for (let a = 0; a <= 40; a++) {                                                                                     // the rim of rough stones
                const t = (a / 40) * Math.PI, st = shape(); ellipse(st, S, ccx - Math.cos(t) * (hw + 3), gyc - Math.sin(t) * (hh + 2), 4.5, 4); fill(S, st, NP.cliff.slice(2), { outline: NP.cliff[0] });
            }
            if (name === 'sun_cave') for (let k = 0; k < 5; k++) { const st = shape(); ellipse(st, S, ccx - 10 + k * 5, gyc - 6 - (k % 2) * 4, 4, 3.4); fill(S, st, [[20, 18, 22], [34, 30, 34], [60, 50, 40]], { outline: [8, 8, 10] }); }   // the black cairn
            else for (let k = 0; k < 6; k++) put(S, ccx - 12 + hash(k, 1, seed) * 24, gyc - 30 + hash(k, 2, seed) * 20, VIOLET[6]);                                 // something pale in the dark
            tinted.push({ x: ccx, y: gyc + 10, r: 96, a: 0.45, c: light });
            for (let px = ccx - hw - 6; px <= ccx + hw + 6; px++) for (let j = 0; j < 4; j++) put(S, px, gyc + j, NP.shadow, 0.3 - j * 0.06);
        }
    }
    /** The binding stone at the ring's edge: a standing stone cut with the same broken chain, two tooth-shaped
     *  hollows in its face (gold-lit and violet-lit), lichen on its shoulders. */
    function bindingStone(S, cx, gy, seed, tinted) {
        shadow(S, cx + 5, gy + 1, 15, 5, 0.5);
        const s = shape();
        poly(s, S, [[cx - 13, gy], [cx - 15, gy - 30], [cx - 11, gy - 58], [cx - 2, gy - 68], [cx + 9, gy - 62], [cx + 14, gy - 36], [cx + 13, gy]], (px, py) => ((px - cx) / 14) * -0.6 + ((py - gy + 68) / 68) * -0.3 + (vnoise(px / 4, py / 5, seed) - 0.5) * 0.5);
        fill(S, s, NP.cliff.slice(1), { outline: NP.cliff[0] });
        for (const [i, v] of s.px) { const px = i % S.w, py = (i / S.w) | 0; if (py < gy - 52 + vnoise(px / 3, 0, seed) * 6 && v > -0.2) put(S, px, py, pick(NP.turf, 0.4 + v * 0.3), 0.8); }
        for (let py = gy - 50; py < gy - 6; py += 7) { const l = shape(); ellipse(l, S, cx + Math.sin(py) * 1.5, py, 2.4, 3.4); fill(S, l, [NP.cliff[0], NP.cliff[1], NP.cliff[2]], { edge: false }); }
        for (const [dx, ramp] of [[-6, GOLD], [6, VIOLET]]) {
            const t = shape(); poly(t, S, [[cx + dx - 3, gy - 36], [cx + dx + 3, gy - 36], [cx + dx + 1, gy - 22], [cx + dx, gy - 20], [cx + dx - 1, gy - 22]], 0);
            fill(S, t, [[10, 8, 12], ramp[1], ramp[2]], { edge: false });
            for (const [i] of t.px) { const px = i % S.w, py = (i / S.w) | 0; if (!t.px.has(i - S.w)) put(S, px, py, ramp[4], 0.7); }
        }
        tinted.push({ x: cx - 6, y: gy - 20, r: 26, a: 0.35, c: SUN_LIGHT }); tinted.push({ x: cx + 6, y: gy - 20, r: 26, a: 0.35, c: MOON_LIGHT });
    }

    // ---------------------------------------------------------------------
    // Járnmyr, the iron mire (C2-04), after Tokelo's picture (2026-11-13)
    // ---------------------------------------------------------------------
    // Autumn moor under a grey sky and a dusting of snow: olive and ochre grass, red-brown bog water full of iron,
    // clay furnaces, charcoal, rust-red ore and grey slag, a pale stepped quarry, a turf-covered barrow.
    const MOOR = R(['#2b2a15', '#38361b', '#474320', '#575126', '#67602d', '#786e35', '#8a7d3f', '#9c8c4a']);
    const REED = R(['#3a2c10', '#5a4618', '#7a6024', '#9a7a30', '#b8943e', '#cfae52']);
    const BOG = R(['#1c0b06', '#2c1209', '#3e1a0d', '#522412', '#662e17', '#7a3a1e', '#8e4826', '#a25a32']);
    const PEAT = R(['#160f0a', '#21170f', '#2e2015', '#3b291b', '#4a3422', '#5a402a']);
    const CLAY = R(['#2e1c12', '#4a2c1c', '#683e28', '#865436', '#a06a48', '#b8835e', '#cc9c78']);
    const CHAR = R(['#0b0a0b', '#141214', '#1d1a1c', '#282426', '#353032', '#443e40']);
    const ORE = R(['#260d07', '#42180c', '#622412', '#81321a', '#9c4224', '#b45634', '#c46c48']);
    const SLAG = R(['#101216', '#1a1d22', '#262a30', '#33383f', '#43494f', '#565c62']);
    const QSTONE = R(['#26282c', '#35383d', '#46494e', '#585c61', '#6c7075', '#82868a', '#999c9f', '#b2b4b5']);
    const J_GROUND = new Set(['moor', 'path', 'yard', 'boardwalk', 'peat', 'quarry_floor', 'barrow_mouth']);
    const J_BASE = { bog: 'bog', crag: 'crag', quarry: 'quarry', fir: 'moor', barrow: 'moor', log_pile: 'moor', kiln: 'yard', woodshed: 'yard', charcoal: 'yard',
        furnace: 'yard', slag: 'yard', ore: 'yard', stone_hut: 'yard', shed: 'yard', smithy: 'yard', smithy_wing: 'yard', weapon_rack: 'yard', anvil: 'yard',
        ingots: 'yard', ore_cart: 'yard', barrel: 'yard', crane: 'quarry_floor', blocks: 'quarry_floor', peat_stack: 'peat', barrow_mouth: 'path' };

    function jarnmyr(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, L = layersFor(map), seed = 1311, img = L.base;
        const N = (x, y) => nameAt(map, x, y);
        const under = new Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const n = N(x, y); under[y * cw + x] = J_GROUND.has(n) && n !== 'barrow_mouth' ? n : J_BASE[n] || null; }
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (!under[y * cw + x]) {
            const votes = {};
            for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const n = N(x + dx, y + dy); if (J_GROUND.has(n)) votes[n] = (votes[n] || 0) + 1; }
            under[y * cw + x] = Object.keys(votes).sort((a, b) => votes[b] - votes[a] || (a < b ? -1 : 1))[0] || 'moor';
        }
        const U = (x, y) => (x < 0 || y < 0 || x >= cw || y >= ch ? null : under[y * cw + x]);
        const cells = (f) => { const a = new Float32Array(cw * ch); for (let i = 0; i < a.length; i++) a[i] = f(under[i]); return field(a, cw, ch); };
        const pathF = cells((u) => (u === 'path' ? 1 : 0)), yardF = cells((u) => (u === 'yard' ? 1 : 0)), bogF = cells((u) => (u === 'bog' || u === 'boardwalk' ? 1 : 0));
        const peatF = cells((u) => (u === 'peat' ? 1 : 0)), floorF = cells((u) => (u === 'quarry_floor' ? 1 : 0));
        // The quarry is stepped: how many terraces up from the floor each wall cell stands (breadth-first through the walls).
        const qd = new Float32Array(cw * ch).fill(-1), q = [];
        for (let i = 0; i < cw * ch; i++) if (under[i] === 'quarry_floor') { qd[i] = 0; q.push(i); }
        while (q.length) { const i = q.shift(), x = i % cw, y = (i / cw) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = x + dx, ny = y + dy, j = ny * cw + nx; if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || qd[j] >= 0 || under[j] !== 'quarry') continue; qd[j] = qd[i] + 1; q.push(j); } }
        for (let i = 0; i < qd.length; i++) if (qd[i] < 0) qd[i] = under[i] === 'quarry' ? 4 : 0;
        const qF = field(qd, cw, ch);
        const lvl = (x, y) => Math.floor(Math.min(5.2, qF(x, y) * 1.15 + (vnoise(x / 16, y / 40, seed + 70) - 0.5) * 0.5));
        const kind = new Uint8Array(img.w * img.h);          // 0 moor, 1 path, 2 yard, 3 bog water, 4 peat, 5 quarry ledge, 6 quarry face, 7 rock, 8 floor
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cx = Math.floor(x / C), cy = Math.floor(y / C), g = under[cy * cw + cx];
            const n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            if (g === 'crag') { kind[i] = 7; put(img, x, y, n1 > 0.55 ? pick(MOOR, 0.2 + n1 * 0.4) : pick(NP.cliff, 0.15 + n1 * 0.4 + hash(x, y, seed) * 0.08)); continue; }
            if ((g === 'quarry_floor' || g === 'quarry') && floorF(x, y) + (n1 - 0.5) * 0.35 > 0.5) {
                kind[i] = 8;
                put(img, x, y, pick(QSTONE, 0.38 + (n1 - 0.5) * 0.25 + hash(x, y, seed + 9) * 0.12)); put(img, x, y, [110, 90, 62], 0.18);
                if (hash(x >> 1, y >> 1, seed + 76) < 0.1) put(img, x, y, QSTONE[6]);
                continue;
            }
            if (g === 'quarry') {
                const l0 = lvl(x, y), below = lvl(x, y + 18), lip = lvl(x, y + 3);
                if (below < l0) {                                                   // a cut face, dropping toward you
                    kind[i] = 6;
                    const col = Math.floor((x + Math.floor(y / 11) * 7) / 13), fy = y % 11;
                    let t = 0.3 + hash(col, Math.floor(y / 11), seed + 71) * 0.22 + (vnoise(x / 2, y / 9, seed + 72) - 0.5) * 0.2;
                    if (fy === 0 || (x + Math.floor(y / 11) * 7) % 13 === 0) t = 0.08;                // block joints
                    t -= 0.06; if (lip < l0) t = 0.85;
                    put(img, x, y, pick(QSTONE, t));
                } else {                                                           // a ledge: flat, rubble and snow on it
                    kind[i] = 5;
                    put(img, x, y, pick(QSTONE, 0.6 + (n1 - 0.5) * 0.25 + (n2 - 0.5) * 0.15 + l0 * 0.03));
                    if (hash(x >> 1, y >> 1, seed + 73) < 0.05) put(img, x, y, pick(QSTONE, 0.25 + hash(x >> 1, y >> 1, seed + 74) * 0.4));
                    if (fbm(x / 9, y / 7, seed + 75) > 0.76) put(img, x, y, pick(NP.snow, 0.55 + n2 * 0.25), 0.7);
                    if (lvl(x, y - 4) > l0) put(img, x, y, QSTONE[0], 0.55); else if (lvl(x, y - 8) > l0) put(img, x, y, QSTONE[1], 0.3);                                    // shadow under the face above
                }
                continue;
            }
            const wet = bogF(x, y) + (fbm(x / 16, y / 14, seed + 20) - 0.5) * 0.7 + (n2 - 0.5) * 0.06;
            const hummock = g === 'bog' && fbm(x / 22, y / 18, seed + 25) + (fbm(x / 6, y / 6, seed + 28) - 0.5) * 0.12 > 0.68;
            const trench = g === 'bog' && (U(cx, cy - 1) === 'peat' || U(cx, cy + 1) === 'peat') && Math.abs((y % C) - 16) < 9 + (vnoise(x / 6, cy, seed + 29) - 0.5) * 8;
            if (trench) { kind[i] = 3; put(img, x, y, pick(BOG, 0.3 + (fbm(x / 20, y / 8, seed + 21) - 0.5) * 0.3 + (Math.abs((y % C) - 16) > 6 ? -0.2 : 0))); continue; }
            if ((g === 'bog' || g === 'boardwalk') && wet > 0.66 && !hummock) {
                kind[i] = 3;
                const shoreD = Math.min(1, (wet - 0.66) * 3);
                let t = 0.46 + (fbm(x / 40, y / 16, seed + 21) - 0.5) * 0.35 - (1 - shoreD) * 0.3;
                if (vnoise(x / 14, y / 2.2, seed + 22) > 0.8) t += 0.14;                                        // ripples catching the sky
                put(img, x, y, pick(BOG, t));
                if (fbm(x / 10, y / 8, seed + 23) > 0.7) put(img, x, y, [176, 112, 66], 0.22);               // the iron skin on the water
                if (vnoise(x / 18, y / 1.6, seed + 26) > 0.9) put(img, x, y, [176, 170, 176], 0.3);           // grey sky caught in it
                if (wet < 0.74) put(img, x, y, PEAT[1], (0.74 - wet) * 8);                                   // mud at the edge
                continue;
            }
            if (g === 'peat' || g === 'bog' && (U(cx, cy - 1) === 'peat' || U(cx, cy + 1) === 'peat') || peatF(x, y) > 0.55 && (g === 'moor' || g === 'yard')) {
                kind[i] = 4;
                const step = (y + Math.round(vnoise(x / 20, 0, seed + 24) * 4)) % 32;
                put(img, x, y, step < 3 ? PEAT[0] : step < 5 ? PEAT[4] : pick(PEAT, 0.4 + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.3));
                put(img, x, y, [92, 58, 34], 0.15);
                if (hash(x >> 1, y >> 1, seed + 27) < 0.04) put(img, x, y, MOOR[3]);
                continue;
            }
            if (pathF(x, y) + (n1 - 0.5) * 0.45 + (n2 - 0.5) * 0.12 > 0.5) {
                kind[i] = 1;
                put(img, x, y, pick(NP.dirt, 0.42 + fbm(x / 10, y / 10, seed + 7) * 0.45 + hash(x, y, seed + 8) * 0.18)); put(img, x, y, [150, 112, 70], 0.22);
            } else if (yardF(x, y) + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.1 > 0.5) {
                kind[i] = 2;                                                       // the work yard: trodden earth, ash and cinders
                put(img, x, y, pick(NP.dirt, 0.3 + fbm(x / 12, y / 12, seed + 10) * 0.4 + hash(x, y, seed + 11) * 0.14)); put(img, x, y, [120, 84, 58], 0.2);
                if (hash(x, y, seed + 12) < 0.05) put(img, x, y, CHAR[1]);
                else if (hash(x, y, seed + 13) < 0.025) put(img, x, y, ORE[3]);
            } else {
                kind[i] = 0;
                const m = fbm(x / 26, y / 16, seed + 3);
                put(img, x, y, pick(MOOR, 0.25 + m * 0.6 + (n2 - 0.5) * 0.3));
                if (m < 0.36) put(img, x, y, pick(NP.grass, 0.4 + n2 * 0.4), 0.55);
                if (fbm(x / 11, y / 9, seed + 14) > 0.8) put(img, x, y, pick(NP.snow, 0.5 + n2 * 0.3), 0.55);   // old snow in the hollows
            }
        }
        // Edges: the path's lip of turf; then tufts, heather and stones; reeds round the bog.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] === 0 && (kind[i + img.w] === 1 || kind[i + 1] === 1 || kind[i + img.w] === 2)) put(img, x, y, MOOR[1], 0.7);
            else if ((kind[i] === 1 || kind[i] === 2) && (kind[i - img.w] === 0 || kind[i - 1] === 0)) put(img, x, y, NP.dirt[6], 0.45);
            if (kind[i] === 3 && kind[i - img.w] !== 3 && kind[i - img.w] !== 6) put(img, x, y, BOG[0], 0.8);   // the bank's shadow on the water
        }
        const reed = (rx, ry, h, sd) => {
            for (let k = 0; k < 5; k++) {
                const bx = rx + (hash(k, 1, sd) - 0.5) * 8, lean = (hash(k, 2, sd) - 0.5) * 0.5, hh = h * (0.6 + hash(k, 3, sd) * 0.5);
                for (let j = 0; j < hh; j++) put(img, bx + lean * j, ry - j, REED[Math.min(5, 1 + Math.floor((j / hh) * 5))]);
                if (hash(k, 4, sd) < 0.35) { rectFill(img, Math.round(bx + lean * hh) - 1, Math.round(ry - hh) - 1, 2, 4, [70, 40, 22]); }
            }
        };
        for (let n = 0; n < (img.w * img.h) / 30; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), i = y * img.w + x, k = kind[i], r = hash(n, 9, seed);
            const nearWater = kind[i + 6] === 3 || kind[i - 6] === 3 || kind[Math.min(kind.length - 1, i + img.w * 4)] === 3;
            if (k === 0 && nearWater && r < 0.16 && U(Math.floor(x / C), Math.floor(y / C)) !== 'boardwalk') reed(x, y, 9 + hash(n, 10, seed) * 7, seed + n);
            else if (k === 0 && r < 0.22) { for (let j = 0; j < 4; j++) put(img, x + (j & 1), y - j, MOOR[5 + (j & 1)]); }
            else if (k === 0 && r < 0.27) { put(img, x, y, [132, 84, 112]); put(img, x + 1, y, [108, 66, 96]); put(img, x, y - 1, [158, 108, 140]); }       // heather
            else if (k === 0 && r < 0.29) { put(img, x, y, [226, 214, 170]); put(img, x, y + 1, MOOR[2]); }
            else if ((k === 1 || k === 2) && r < 0.25) { put(img, x, y, NP.rock[6]); put(img, x + 1, y, NP.rock[5]); put(img, x, y + 1, NP.dirt[0]); }
            else if (k === 8 && r < 0.2) { rectFill(img, x, y, 3, 2, QSTONE[5]); put(img, x, y + 2, QSTONE[1]); }
        }
        // Cart ruts along the quarry floor and the main road.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x; if (kind[i] !== 8 && kind[i] !== 1) continue;
            const r = Math.abs(((x + Math.sin(y / 23) * 4) % 18) - 9);
            if (kind[i] === 8 && r < 0.8 && hash(x >> 2, y >> 2, seed + 77) < 0.7) put(img, x, y, QSTONE[1], 0.45);
        }
        // Boardwalks: planks across the run, on piles, with a post at every other tile.
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows };
        const isBW = (x, y) => U(x, y) === 'boardwalk' || (N(x, y) === 'boardwalk');
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            if (N(x, y) !== 'boardwalk') continue;
            const X0 = x * C, Y0 = y * C, horiz = isBW(x - 1, y) || isBW(x + 1, y), vert = isBW(x, y - 1) || isBW(x, y + 1);
            const bands = [];
            if (horiz || !vert) bands.push([isBW(x - 1, y) ? X0 : X0 + 6, Y0 + 7, (isBW(x + 1, y) ? X0 + C : X0 + C - 6) - (isBW(x - 1, y) ? X0 : X0 + 6), 18, false]);
            if (vert) bands.push([X0 + 7, isBW(x, y - 1) ? Y0 : Y0 + 6, 18, (isBW(x, y + 1) ? Y0 + C : Y0 + C - 4) - (isBW(x, y - 1) ? Y0 : Y0 + 6), true]);
            for (const [bx, by, bw, bh, v] of bands) {
                for (let j = 0; j < bh + 3; j++) for (let i2 = -1; i2 < bw + 2; i2++) put(img, bx + i2, by + j + 2, BOG[0], 0.35);
                for (let j = 0; j < bh; j++) for (let i2 = 0; i2 < bw; i2++) {
                    const a = v ? (by + j) : (bx + i2), u = ((a % 5) + 5) % 5, b = Math.floor(a / 5);
                    put(img, bx + i2, by + j, u === 0 ? NP.plank[0] : pick(NP.plank, 0.42 + (hash(b, x + y, seed) - 0.5) * 0.35 + (vnoise(b * 2.3, (v ? i2 : j) / 6, seed) - 0.5) * 0.25 + (u === 1 ? 0.12 : 0)));
                    if (hash(bx + i2, by + j, seed + 30) < 0.012) put(img, bx + i2, by + j, NP.snow[5]);
                }
                for (let k2 = 0; k2 < (v ? bh : bw); k2++) { if (v) { put(img, bx - 1, by + k2, NP.plank[1]); put(img, bx + bw, by + k2, NP.plank[1]); } else { put(img, bx + k2, by - 1, NP.plank[6]); put(img, bx + k2, by + bh, NP.plank[1]); } }
            }
            if ((x + y) % 2 === 0) for (const [px, py] of horiz && !vert ? [[X0 + 3, Y0 + 26], [X0 + 27, Y0 + 26]] : [[X0 + 5, Y0 + 14], [X0 + 26, Y0 + 14]]) { rectFill(img, px, py - 6, 3, 8, NP.oak[2]); rectFill(img, px, py - 6, 3, 1, NP.oak[5]); }
        }
        const open = (x, y) => J_GROUND.has(N(x, y));
        const behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const inner = innerFn(map, nameAt);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const seen = new Set();
        const BLOCKS = {
            barrow: (b) => ({ y: b.y0 - 1, draw: () => barrow(L, b, seed, N) }),
            kiln: (b) => ({ y: b.y1 + 0.7, draw: () => kiln(L, b, seed + b.x0 * 7, FX, anyBehind(b)) }),
            woodshed: (b) => ({ y: b.y1 + 0.8, draw: () => leanTo(L, b, seed + b.x0, anyBehind(b), 'logs') }),
            shed: (b) => ({ y: b.y1 + 0.8, draw: () => leanTo(L, b, seed + b.x0 * 3 + b.y0, anyBehind(b), b.y0 > 20 ? 'barrels' : 'logs') }),
            smithy_wing: (b) => ({ y: b.y1 + 0.8, draw: () => leanTo(L, b, seed + 5, anyBehind(b), 'tools') }),
            weapon_rack: (b) => ({ y: b.y1 + 0.8, draw: () => rackShed(L, b, seed + 9, anyBehind(b)) }),
            charcoal: (b) => ({ y: b.y1 + 0.6, draw: () => heap(L, b, seed + b.x0, CHAR, true) }),
            ore: (b) => ({ y: b.y1 + 0.6, draw: () => heap(L, b, seed + 3, ORE, true) }),
            slag: (b) => ({ y: b.y1 + 0.6, draw: () => heap(L, b, seed + 4, SLAG, false) }),
            furnace: (b) => ({ y: b.y1 + 0.8, draw: () => furnace(L, b, seed + b.x0 * 13, FX, anyBehind(b)) }),
            stone_hut: (b) => ({ y: b.y1 + 0.9, draw: () => stoneHut(L, b, seed + 17, FX, anyBehind(b)) }),
            smithy: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + 43, anyBehind(b), FX, { z: 2, gw: 70, wallH: 30, depth: 64, open: true, chimneys: 2, sign: 'axes' }) }),
            ingots: (b) => ({ y: b.y1 + 0.5, draw: () => { for (let xx = b.x0; xx <= b.x1; xx++) ingots(img, xx * C + 16, b.y1 * C + 28, seed + xx); } })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P2 = {
                crag: () => { const inn = inner(x, y, 'crag'); if (inn && hash(x, y, seed + 31) > 0.3) return; cragCell(L, x, y, seed, NP.cliff, NP.snow, 5, open(x, y + 1), open(x, y - 1), inn ? 2 : 1); },
                fir: () => fir(L, x, y, seed, behind(x, y), 0.3),
                log_pile: () => logPile(img, cx, gy, seed + x),
                barrel: () => barrel(L, cx, gy, seed + x),
                fence: () => fence(L, map, nameAt, x, y, seed),
                anvil: () => anvil(img, cx, gy, seed),
                ore_cart: () => oreCart(img, cx, gy, seed),
                crane: () => tall(L, [cx - 30, gy - 110, cx + 40, gy + 8], y * C, open(x, y - 1), (S) => quarryCrane(S, cx, gy, seed + x)),
                blocks: () => cutBlocks(img, cx, gy, seed + x * 3 + y),
                peat_stack: () => peatStack(img, cx, gy, seed + x + y)
            }[n];
            if (P2) items.push({ x, y: y + (n === 'fir' ? 0.8 : n === 'crag' ? 0.95 : 0.5), draw: P2 });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, 14, 0.3);
        overcast([img, L.over], glows);
        const water = [];
        for (let i = 0; i < kind.length; i += 5) if (kind[i] === 3 && hash(i, 0, seed) < 0.1) water.push(i);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water, animate: animator(flames, smoke) };
    }
    /** A grey autumn day: a little cooler and flatter, with warm light round every furnace mouth and the forge. */
    function overcast(layers, glows) {
        for (const im of layers) { const d = im.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = d[i] * 0.93 + 3; d[i + 1] = d[i + 1] * 0.93 + 4; d[i + 2] = d[i + 2] * 0.95 + 9; } }
        for (const g of glows) {
            const r = g.r, a = g.a == null ? 0.5 : g.a, ry = Math.round(r * 0.8);
            for (let yy = -ry; yy <= ry; yy++) for (let xx = -r; xx <= r; xx++) {
                const x = Math.round(g.x) + xx, y = Math.round(g.y) + yy, dd = Math.hypot(xx, yy / 0.8) / r;
                if (dd >= 1 || x < 0 || y < 0 || x >= layers[0].w || y >= layers[0].h) continue;
                const w = (1 - dd) * (1 - dd) * a * 0.7;
                for (const im of layers) { const i = (y * im.w + x) * 4, d = im.data; if (!d[i + 3]) continue; for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] + WARM[j] * w * 0.45 + (WARM[j] - d[i + j]) * w * 0.2); }
            }
        }
    }
    /** The barrow: a long mound under turf and old snow, a kerb of standing stones round its foot (dug out on the near
     *  side), and at the south end the stone entrance, two uprights and a lintel over a mouth of black, wedged open. */
    function barrow(L, b, seed, N) {
        const S = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, W = X1 - X0, mx = X0 + W / 2;
        let mouth = null;
        for (let x = b.x0; x <= b.x1; x++) if (N(x, b.y1 + 1) === 'barrow_mouth' || N(x, b.y1) === 'barrow_mouth') mouth = x;
        const by = (b.y1 + 1) * C + 4, top = b.y0 * C - 40, H = by - top;
        shadow(S, mx + 8, by - 2, W / 2 + 8, 14, 0.45);
        const m = shape();
        for (let py = top; py < by; py++) for (let px = X0 - 6; px < X1 + 6; px++) {
            const dx = (px - mx) / (W / 2 + 6), dy = (py - (by - H * 0.38)) / (H * 0.62);
            const d = dx * dx + dy * dy * (dy > 0 ? 1.8 : 1);
            if (d < 1) sset(m, S, px, py, -dx * 0.5 - dy * 0.7 + (vnoise(px / 7, py / 6, seed + 1) - 0.5) * 0.4);
        }
        fill(S, m, MOOR.slice(0, 7), { outline: MOOR[0] });
        for (const [i, v] of m.px) {
            const px = i % S.w, py = (i / S.w) | 0;
            if (fbm(px / 9, py / 7, seed + 2) > 0.68 && v > -0.2) put(S, px, py, pick(NP.snow, 0.5 + v * 0.4), 0.8);
            if (hash(px, py, seed + 3) < 0.04) put(S, px, py, MOOR[6]);
        }
        // The kerb: standing stones round the foot of the mound; on the near side some lie tipped out, dug free.
        for (let k = 0; k <= 22; k++) {
            const t = Math.PI * (0.05 + (k / 22) * 0.9), sx = mx - Math.cos(t) * (W / 2 + 2), sy = by - 6 - Math.sin(t) * 18;
            if (mouth != null && Math.abs(sx - (mouth * C + 16)) < 26) continue;
            const dug = hash(k, 1, seed) < 0.3 && sx > mx - W * 0.35 && sx < mx + W * 0.35;
            if (dug) { stone(S, sx + 8, sy + 12, 7, 4, seed + k, NP.cliff, NP.snow, 0.2); const hole = shape(); ellipse(hole, S, sx, sy, 6, 3); fill(S, hole, PEAT.slice(0, 3), { edge: false }); }
            else { const st = shape(); poly(st, S, [[sx - 5, sy + 2], [sx - 4, sy - 12], [sx, sy - 15], [sx + 4, sy - 12], [sx + 5, sy + 2]], (px) => ((px - sx) / 5) * -0.6); fill(S, st, NP.cliff.slice(1), { tex: 0.4, seed: seed + k, outline: NP.cliff[0] }); }
        }
        if (mouth != null) {
            const ex = mouth * C + 16, eb = (b.y1 + 1) * C + 24;
            for (let py = eb - 40; py < eb; py++) for (let px = ex - 22; px < ex + 22; px++) put(S, px, py, MOOR[1], 0.6);
            RK.blocks(S, ex - 26, eb - 42, 12, 42, seed + 4, NP.cliff); RK.blocks(S, ex + 14, eb - 42, 12, 42, seed + 5, NP.cliff);
            const dk = shape(); poly(dk, S, [[ex - 14, eb], [ex - 14, eb - 30], [ex - 10, eb - 36], [ex + 10, eb - 36], [ex + 14, eb - 30], [ex + 14, eb]], 0);
            for (const [i] of dk.px) { const px = i % S.w, py = (i / S.w) | 0; put(S, px, py, [8, 7, 8]); if (py > eb - 8) put(S, px, py, [26, 20, 16], (py - eb + 8) / 10); }
            const ln = shape(); box(ln, S, ex - 30, eb - 50, 60, 10, 0.3); fill(S, ln, NP.cliff.slice(2), { tex: 0.5, seed: seed + 6, outline: NP.cliff[0] });
            for (let px = ex - 29; px < ex + 30; px++) if (hash(px, 9, seed) < 0.7) put(S, px, eb - 51, NP.snow[6]);
            for (const wx of [ex - 10, ex + 6]) { rectFill(S, wx, eb - 34, 4, 9, PAL.iron[2]); rectFill(S, wx, eb - 34, 4, 1, PAL.iron[4]); }   // quarry wedges in the jamb
            for (let k = 0; k < 6; k++) { const px = ex - 8 + hash(k, 2, seed) * 16, py = eb + 4 + hash(k, 3, seed) * 10; rectFill(S, px, py, 3, 2, PEAT[3]); }
        }
    }
    /** A charcoal kiln: a dome of stacked wood under turf and earth, smoking at the crown, in a ring of fence posts. */
    function kiln(L, b, seed, FX, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, cx = (X0 + X1) / 2, gy = (b.y1 + 1) * C - 6, rx = (X1 - X0) / 2 - 6, h = 52;
        tall(L, [X0 - 12, gy - h - 16, X1 + 12, gy + 12], b.y0 * C + 16, overhead, (S) => {
            shadow(S, cx + 8, gy, rx + 6, 10, 0.5);
            for (let k = 0; k < 18; k++) {                                   // the back half of the post ring
                const t = Math.PI + (k / 17) * Math.PI, px = cx + Math.cos(t) * (rx + 8), py = gy - 10 + Math.sin(t) * 14;
                rectFill(S, px - 1, py - 12, 3, 13, NP.oak[2]); rectFill(S, px - 1, py - 12, 3, 1, NP.oak[5]);
            }
            const d = shape();
            for (let py = gy - h; py < gy; py++) for (let px = cx - rx; px < cx + rx; px++) {
                const dx = (px - cx) / rx, dy = (gy - py) / h, e = Math.sqrt(Math.max(0, 1 - dx * dx));
                if (dy < e * (0.92 + vnoise(px / 5, 0, seed) * 0.12)) sset(d, S, px, py, -dx * 0.6 + (dy - 0.5) * 0.6 + (vnoise(px / 4, py / 4, seed + 1) - 0.5) * 0.5);
            }
            fill(S, d, CHAR, { outline: CHAR[0] });
            for (const [i, v] of d.px) {
                const px = i % S.w, py = (i / S.w) | 0;
                if (fbm(px / 6, py / 5, seed + 2) > 0.58) put(S, px, py, pick(MOOR, 0.15 + (v + 1) * 0.25), 0.9);   // turf patches
                if (hash(px >> 1, py >> 1, seed + 3) < 0.03) put(S, px, py, [196, 90, 40]);                        // a vent glowing
            }
            for (let k = 0; k < 18; k++) {                                   // the front half
                const t = (k / 17) * Math.PI, px = cx + Math.cos(t) * (rx + 8), py = gy - 10 + Math.sin(t) * 14;
                rectFill(S, px - 1, py - 12, 3, 13, NP.oak[3]); rectFill(S, px - 1, py - 12, 3, 1, NP.oak[6]);
                if (k < 17) { const nx = cx + Math.cos(((k + 1) / 17) * Math.PI) * (rx + 8), ny = gy - 10 + Math.sin(((k + 1) / 17) * Math.PI) * 14; for (let s2 = 0; s2 <= 8; s2++) put(S, px + ((nx - px) * s2) / 8, py - 8 + ((ny - py) * s2) / 8, NP.oak[4]); }
            }
        });
        FX.smoke.push({ x: cx, y: gy - h }); FX.glows.push({ x: cx, y: gy - h + 6, r: 18, a: 0.25 });
    }
    /** An open shed on posts under a plank roof: logs stacked to the beams, barrels, or the smith's tools on the wall. */
    function leanTo(L, b, seed, overhead, what) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4, W = X1 - X0, top = Math.max(b.y0 * C - 30, B - 74), eave = B - 40;
        tall(L, [X0 - 10, top - 10, X1 + 10, B + 8], b.y0 * C + 8, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 6, B + 1, W / 2 + 6, 6, 0.5);
            for (let py = top + 10; py < B; py++) for (let px = X0 + 3; px < X1 - 3; px++) timberPx(S, px, py, X0, seed, 0.35);       // back wall in shade
            if (what === 'logs') {
                for (let ry = B - 6; ry > eave + 4; ry -= 8) for (let rx = X0 + 8 + ((B - ry) % 16 ? 4 : 0); rx < X1 - 6; rx += 8) {
                    const e = shape(); ellipse(e, S, rx, ry, 4.2, 3.8); fill(S, e, PAL.straw, { outline: NP.oak[0] }); put(S, rx, ry, NP.oak[3]);
                }
            } else if (what === 'barrels') {
                for (let rx = X0 + 14; rx < X1 - 8; rx += 18) barrel({ base: S }, rx, B - 2, seed + rx);
            } else if (what === 'hay') {                                      // the sheep shelter: hay heaped against the back wall
                const h = shape(); for (let k = 0; k < 4; k++) ellipse(h, S, X0 + 18 + k * ((W - 36) / 3), B - 10, (W - 20) / 6 + 4, 12); fill(S, h, PAL.straw, { tex: 0.7, seed, outline: NP.oak[0] });
                for (const [i] of h.px) if (hash(i, 3, seed) < 0.15) put(S, i % S.w, (i / S.w) | 0, PAL.straw[PAL.straw.length - 1]);
            } else if (what === 'loom') {                                     // an upright loom, warp weighted with clay rings; baskets of wool
                const lx = X0 + W * 0.3, lw = Math.min(70, W * 0.45), ly = eave + 6;
                const fr = shape(); box(fr, S, lx, ly, 4, B - ly, -0.2); box(fr, S, lx + lw, ly, 4, B - ly, -0.2); box(fr, S, lx - 2, ly, lw + 8, 4, 0.3); fill(S, fr, NP.oak.slice(1, 6), { outline: NP.oak[0] });
                for (let px = lx + 6; px < lx + lw; px += 2) for (let py = ly + 4; py < B - 12; py++) put(S, px, py, py < ly + 26 ? (hash(px >> 3, 1, seed) < 0.5 ? NP.madder[4] : NP.wool[4]) : NP.wool[3]);
                for (let px = lx + 6; px < lx + lw; px += 6) { const r = shape(); ellipse(r, S, px, B - 10, 2.6, 2.6); fill(S, r, CLAY.slice(2), { outline: CLAY[0] }); }
                for (const bx of [X1 - 24, X1 - 44]) { const bk = shape(); box(bk, S, bx - 8, B - 12, 16, 11, 0.2); fill(S, bk, PAL.straw.slice(0, 5), { tex: 0.6, seed: seed + bx, outline: NP.oak[0] }); const w = shape(); ellipse(w, S, bx, B - 13, 7, 4); fill(S, w, NP.wool.slice(2), { tex: 0.6, seed: seed + bx + 1, outline: NP.wool[0] }); }
            } else if (what === 'bench') {                                    // the völva's lean-to: a bench with a fleece, a basket, a staff, herbs drying
                const bn = shape(); box(bn, S, X0 + W * 0.3, B - 16, W * 0.45, 6, 0.3); fill(S, bn, NP.plank.slice(2), { outline: NP.oak[0] });
                for (const lx of [X0 + W * 0.32, X0 + W * 0.72]) rectFill(S, Math.round(lx), B - 10, 3, 10, NP.oak[1]);
                const fl = shape(); ellipse(fl, S, X0 + W * 0.6, B - 18, 16, 5); fill(S, fl, NP.wool.slice(2), { tex: 0.7, seed, outline: NP.wool[0] });
                const bk = shape(); box(bk, S, X0 + 14, B - 14, 16, 13, 0.2); fill(S, bk, PAL.straw.slice(0, 5), { tex: 0.6, seed: seed + 2, outline: NP.oak[0] });
                const st = shape(); thick(st, S, X1 - 16, B, X1 - 26, eave + 4, 1.2); fill(S, st, NP.oak.slice(2), { outline: NP.oak[0] });
                for (let k = 0; k < 5; k++) { const hx = X0 + 20 + k * ((W - 40) / 4); for (let j = 0; j < 12; j++) put(S, hx + (j & 1) - 0.5, eave + 7 + j, j < 3 ? NP.oak[2] : [[100, 140, 70], [150, 120, 180], [200, 190, 120]][k % 3]); }
            } else {                                                          // tools: tongs, hammers and blades on the wall, a grindstone
                for (let rx = X0 + 10; rx < X1 - 8; rx += 9) { const hgt = 14 + hash(rx, 1, seed) * 10; rectFill(S, rx, eave + 8, 2, hgt, hash(rx, 2, seed) < 0.5 ? PAL.iron[3] : NP.oak[3]); rectFill(S, rx - 1, eave + 8, 4, 3, PAL.iron[4]); }
                const gs = shape(); ellipse(gs, S, X1 - 22, B - 12, 9, 9); fill(S, gs, NP.cliff.slice(2), { outline: NP.cliff[0] });
                const wb = shape(); box(wb, S, X0 + 8, B - 14, 34, 5, 0.3); fill(S, wb, NP.plank.slice(3), { outline: NP.plank[0] });
                rectFill(S, X0 + 10, B - 9, 3, 9, NP.plank[1]); rectFill(S, X0 + 37, B - 9, 3, 9, NP.plank[1]);
            }
            for (const px of [X0, X1 - 5, ...(W > 120 ? [Math.round((X0 + X1) / 2)] : [])]) { const p = shape(); box(p, S, px, eave, 5, B - eave, -0.2); fill(S, p, NP.oak.slice(1, 6), { outline: NP.oak[0] }); }
            for (let py = top; py <= eave + 4; py++) {
                const f = (py - top) / (eave + 4 - top), xa = X0 - 6 - f * 4, xb = X1 + 6 + f * 4;
                for (let px = Math.round(xa); px < xb; px++) {
                    const course = (py - top) % 6 === 5 || (hash(Math.floor((py - top) / 6), 0, seed) * 40 + px) % 17 < 1;
                    put(S, px, py, course ? ROOF[0] : pick(NP.plank, 0.3 + f * 0.25 + (hash(px >> 2, Math.floor((py - top) / 6), seed) - 0.5) * 0.2));
                    if (fbm(px / 8, py / 6, seed + 5) > 0.66) put(S, px, py, pick(NP.snow, 0.5 + f * 0.3), 0.85);
                    else if (fbm(px / 9, py / 7, seed + 6) > 0.62) put(S, px, py, pick(NP.turf, 0.2 + f * 0.4), 0.6);
                }
                put(S, Math.round(xa) - 1, py, ROOF[0]); put(S, Math.round(xb), py, ROOF[0]);
            }
            for (let px = X0 - 10; px < X1 + 10; px++) { put(S, px, eave + 5, NP.oak[1]); put(S, px, eave + 6, NP.shadow, 0.5); }
        });
    }
    /** The weapon racks under their awning: a row of racks of spears and axes, the awning on posts above them. */
    function rackShed(L, b, seed, overhead) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 2, eave = B - 52, top = eave - 22;
        tall(L, [X0 - 12, top - 8, X1 + 12, B + 8], b.y0 * C + 8, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 6, B, (X1 - X0) / 2 + 6, 6, 0.45);
            for (let x = b.x0; x <= b.x1; x++) weaponRack(S, x * C + 16, B - 2, seed + x);
            for (let x = b.x0; x <= b.x1; x += 2) { const e = shape(); poly(e, S, [[x * C + 6, B - 30], [x * C + 14, B - 44], [x * C + 22, B - 30]], 0.3); fill(S, e, PAL.iron.slice(2), { outline: PAL.iron[0] }); rectFill(S, x * C + 13, B - 30, 2, 28, NP.oak[3]); }   // axes hung between
            for (const px of [X0, X1 - 4]) { const p = shape(); box(p, S, px, eave, 4, B - eave, -0.2); fill(S, p, NP.oak.slice(1, 6), { outline: NP.oak[0] }); }
            for (let py = top; py <= eave + 3; py++) { const f = (py - top) / (eave + 3 - top); for (let px = Math.round(X0 - 8 - f * 3); px < X1 + 8 + f * 3; px++) { put(S, px, py, (py - top) % 5 === 4 ? ROOF[0] : pick(NP.plank, 0.32 + f * 0.25 + (hash(px >> 2, (py - top) / 5 | 0, seed) - 0.5) * 0.2)); if (fbm(px / 8, py / 6, seed) > 0.65) put(S, px, py, NP.snow[5], 0.8); } }
        });
    }
    /** A heap: ore, slag or charcoal, lumpy, a little higher in the middle; charcoal and ore in a low plank fence. */
    function heap(L, b, seed, ramp, fenced) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4, cx = (X0 + X1) / 2, rx = (X1 - X0) / 2, h = Math.min(30, 10 + (b.y1 - b.y0 + 1) * 10);
        const S = L.base;
        shadow(S, cx + 6, B, rx + 4, 7, 0.45);
        const m = shape();
        for (let py = B - h - 12; py < B; py++) for (let px = X0; px < X1; px++) {
            const dx = (px - cx) / rx, ridge = (1 - dx * dx) * h + (vnoise(px / 6, 0, seed) - 0.5) * 8;
            if (B - py < ridge) sset(m, S, px, py, -dx * 0.6 + ((B - py) / h - 0.5) * 0.5);
        }
        fill(S, m, ramp, { outline: ramp[0] });
        for (const [i, v] of m.px) { const px = i % S.w, py = (i / S.w) | 0; if (hash(px >> 1, py >> 1, seed + 1) < 0.25) put(S, px, py, pick(ramp, (v + 1) / 2 + (hash(px >> 1, py >> 1, seed + 2) - 0.5) * 0.5)); if (hash(px, py, seed + 3) < 0.03) put(S, px, py, ramp[ramp.length - 1]); }
        if (fenced) for (let px = X0 - 6; px < X1 + 6; px++) { for (let j = 0; j < 7; j++) put(S, px, B - 2 + j, j < 1 ? NP.plank[6] : pick(NP.plank, 0.3 + (hash(Math.floor(px / 12), j, seed) - 0.5) * 0.2)); if ((px - X0) % 24 === 0) rectFill(S, px, B - 8, 3, 15, NP.oak[3]); }
    }
    /** A bloomery furnace: a cone of clay on a ring of stones, its top cut off and smoking, a glowing arch at its foot,
     *  bellows and tools leant against it. */
    function furnace(L, b, seed, FX, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, cx = (X0 + X1) / 2, gy = (b.y1 + 1) * C - 4, h = 82, rb = 26, rt = 11;
        tall(L, [X0 - 16, gy - h - 12, X1 + 16, gy + 10], b.y0 * C + 20, overhead, (S) => {
            shadow(S, cx + 8, gy, rb + 10, 8, 0.5);
            for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2, st = shape(); ellipse(st, S, cx + Math.cos(t) * (rb + 4), gy - 4 + Math.sin(t) * 6, 6, 4.5); fill(S, st, NP.cliff.slice(2), { tex: 0.4, seed: seed + k, outline: NP.cliff[0] }); }
            const c = shape();
            for (let py = gy - h; py < gy - 4; py++) { const f = (gy - 4 - py) / (h - 4), r = rb - (rb - rt) * Math.pow(f, 0.85); for (let px = Math.round(cx - r); px < cx + r; px++) sset(c, S, px, py, ((px - cx) / r) * -0.75 + (vnoise(px / 4, py / 5, seed) - 0.5) * 0.35); }
            fill(S, c, CLAY, { outline: CLAY[0] });
            for (const [i] of c.px) { const px = i % S.w, py = (i / S.w) | 0; if (fbm(px / 5, py / 4, seed + 1) > 0.66) put(S, px, py, NP.cliff[4], 0.6); if ((py + Math.round(vnoise(px / 9, 0, seed) * 3)) % 9 === 0 && hash(px, py, seed) < 0.6) put(S, px, py, CLAY[1], 0.6); }
            const rim = shape(); ellipse(rim, S, cx, gy - h, rt + 1, 3.5); fill(S, rim, [[20, 10, 6], [40, 18, 10], [120, 50, 20]], { edge: false });
            const arch = shape(); poly(arch, S, [[cx - 9, gy - 4], [cx - 9, gy - 18], [cx - 6, gy - 24], [cx, gy - 26], [cx + 6, gy - 24], [cx + 9, gy - 18], [cx + 9, gy - 4]], 0);
            for (const [i] of arch.px) { const px = i % S.w, py = (i / S.w) | 0, f = (gy - 4 - py) / 22; put(S, px, py, pick(NP.glow, 0.95 - f * 0.55 + hash(px, py, seed) * 0.08)); }
            for (let px = cx - 10; px <= cx + 10; px++) put(S, px, gy - 27 + Math.round(Math.abs(px - cx) * 0.3), CLAY[6]);
            const bel = shape(); poly(bel, S, [[cx + rb - 2, gy - 6], [cx + rb + 14, gy - 12], [cx + rb + 16, gy - 4], [cx + rb + 2, gy - 2]], 0.2); fill(S, bel, NP.oak.slice(2), { outline: NP.oak[0] });
            const tl = shape(); thick(tl, S, cx - rb - 6, gy, cx - rb + 2, gy - 40, 1.2); fill(S, tl, NP.oak.slice(2, 6), { outline: NP.oak[0] }); rectFill(S, cx - rb + 1, gy - 44, 4, 5, PAL.iron[3]);
        });
        FX.flames.push({ x: cx, y: gy - 12, big: true }); FX.smoke.push({ x: cx, y: gy - h - 2 }); FX.smoke.push({ x: cx - 3, y: gy - h - 6 });
        FX.glows.push({ x: cx, y: gy - 6, r: 46, a: 0.6 });
    }
    /** The bloomers' hut: dry-stone walls, a turf-and-thatch roof, a low dark entrance and one lit window. */
    function stoneHut(L, b, seed, FX, overhead) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 4, W = X1 - X0, mx = Math.round((X0 + X1) / 2), wallTop = B - 40, ridge = Math.max(b.y0 * C - 20, wallTop - 46);
        tall(L, [X0 - 14, ridge - 10, X1 + 14, B + 8], b.y0 * C + 10, overhead, (S) => {
            shadow(S, mx + 8, B + 2, W / 2 + 10, 7, 0.55);
            RK.blocks(S, X0, wallTop, W, B - wallTop, seed, NP.cliff);
            for (let px = X0; px < X1; px++) put(S, px, B, NP.cliff[0]);
            for (let py = wallTop; py < B; py++) { put(S, X0, py, NP.cliff[0]); put(S, X1 - 1, py, NP.cliff[0]); }
            const dx0 = mx + 10; rectFill(S, dx0, B - 26, 16, 26, [14, 10, 8]); rectFill(S, dx0 - 2, B - 29, 20, 4, NP.cliff[5]);
            windowLit(S, X0 + 16, wallTop + 12, 8, 8, FX);
            for (let py = ridge; py <= wallTop + 4; py++) {
                const f = (py - ridge) / (wallTop + 4 - ridge), xa = X0 - 8 - f * 6, xb = X1 + 8 + f * 6;
                for (let px = Math.round(xa); px < xb; px++) {
                    put(S, px, py, pick(THATCH, 0.35 + f * 0.4 + (vnoise(px / 2, py / 6, seed) - 0.5) * 0.35));
                    if (fbm(px / 9, py / 7, seed + 3) > 0.56) put(S, px, py, pick(NP.turf, 0.25 + f * 0.4), 0.75);
                    if (fbm(px / 7, py / 5, seed + 4) > 0.7 && f < 0.6) put(S, px, py, NP.snow[5], 0.8);
                }
                put(S, Math.round(xa) - 1, py, THATCH[0]); put(S, Math.round(xb), py, THATCH[0]);
            }
            for (let px = X0 - 14; px < X1 + 14; px++) { put(S, px, wallTop + 5, THATCH[0]); put(S, px, wallTop + 6, NP.shadow, 0.5); }
            for (let px = X0 - 8; px < X1 + 8; px++) put(S, px, ridge, THATCH[6]);
            chimney(S, X1 - 22, ridge + 10, seed, FX);
        });
    }
    function oreCart(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 16, 4, 0.45);
        const bed = shape(); poly(bed, img, [[cx - 14, gy - 18], [cx + 14, gy - 18], [cx + 12, gy - 6], [cx - 12, gy - 6]], (px, py) => (py - gy + 12) * -0.1);
        fill(img, bed, NP.plank.slice(1, 7), { tex: 0.3, seed, outline: NP.oak[0] });
        const h = shape(); ellipse(h, img, cx, gy - 19, 13, 6); fill(img, h, ORE, { tex: 0.6, seed: seed + 1, outline: ORE[0] });
        for (const wx of [cx - 9, cx + 9]) { const w = shape(); ellipse(w, img, wx, gy - 5, 5, 5); fill(img, w, NP.oak.slice(1, 6), { outline: NP.oak[0] }); put(img, wx, gy - 5, PAL.iron[3]); }
        const sh = shape(); thick(sh, img, cx + 14, gy - 10, cx + 26, gy - 2, 1.1); fill(img, sh, NP.oak.slice(2, 6), { outline: NP.oak[0] });
        put(img, cx - 4, gy - 22, [70, 120, 100]); put(img, cx - 3, gy - 22, [96, 150, 120]);          // a green glint of old bronze under the ore
    }
    function ingots(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 13, 3, 0.4);
        for (let r = 0; r < 4; r++) for (let k = 0; k < 3 - (r >> 1); k++) {
            const x = cx - 11 + k * 8 + (r % 2) * 3, y = gy - 4 - r * 4, s = shape(); box(s, img, x, y, 7, 4, 0.2 - r * 0.05);
            fill(img, s, PAL.iron.slice(1), { tex: 0.3, seed: seed + r * 5 + k, outline: PAL.iron[0] });
        }
    }
    function quarryCrane(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 14, 3, 0.45);
        const fr = shape();
        thick(fr, S, cx - 12, gy, cx, gy - 80, 2); thick(fr, S, cx + 12, gy, cx, gy - 80, 2); thick(fr, S, cx - 6, gy - 40, cx + 6, gy - 40, 1.2);
        thick(fr, S, cx - 14, gy - 76, cx + 30, gy - 84, 1.8);
        fill(S, fr, NP.plank.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
        const wl = shape(); ellipse(wl, S, cx, gy - 34, 5, 5); fill(S, wl, NP.oak.slice(2), { outline: NP.oak[0] });
        for (let py = gy - 82; py < gy - 40; py++) put(S, cx + 26, py, NP.wool[2]);
        const bl = shape(); box(bl, S, cx + 18, gy - 42, 17, 13, 0.2); fill(S, bl, QSTONE.slice(2), { tex: 0.3, seed: seed + 1, outline: QSTONE[0] });
        for (let px = cx + 18; px < cx + 35; px++) put(S, px, gy - 42, QSTONE[7]);
        put(S, cx, gy - 82, NP.snow[6]); put(S, cx + 1, gy - 81, NP.snow[5]);
    }
    function cutBlocks(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 15, 4, 0.45);
        for (const [dx, dy, w, h] of [[-14, 0, 13, 10], [0, 0, 13, 11], [-8, -10, 14, 10]]) {
            const s = shape(); box(s, img, cx + dx, gy - h + dy, w, h, 0); fill(img, s, QSTONE.slice(2), { tex: 0.3, seed: seed + dx, outline: QSTONE[0] });
            for (let px = cx + dx; px < cx + dx + w; px++) put(img, px, gy - h + dy, QSTONE[7]);
            if (hash(dx, dy, seed) < 0.6) for (let px = cx + dx + 1; px < cx + dx + w - 1; px++) if (hash(px, 1, seed) < 0.6) put(img, px, gy - h + dy - 1, NP.snow[6]);
        }
    }
    function peatStack(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 13, 4, 0.45);
        for (let r = 0; r < 5; r++) {
            const y = gy - 3 - r * 4, horiz = r % 2 === 0;
            for (let k = 0; k < (horiz ? 3 : 4); k++) { const s = shape(); if (horiz) box(s, img, cx - 11 + k * 7 + (r === 4 ? 4 : 0), y - 3, 6, 4, 0.1); else box(s, img, cx - 11 + k * 6, y - 3, 4, 4, 0.1); fill(img, s, PEAT.slice(1), { tex: 0.5, seed: seed + r * 7 + k, outline: PEAT[0] }); }
        }
    }

    // ---------------------------------------------------------------------
    // Act II (Tokelo's pictures, 2026-11-13): the Silent Field, Birkholt and Rúnadal.
    // ---------------------------------------------------------------------
    const kit = SA.kit;
    /** Which ground lies under every cell: the cell's own ground, the ground an object stands on, or what its
     *  open neighbours vote for. Shared by the three Act II painters. */
    function groundGrid(map, nameAt, GROUND, BASE, dflt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, N = (x, y) => nameAt(map, x, y), under = new Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const n = N(x, y); under[y * cw + x] = GROUND.has(n) ? n : BASE[n] || null; }
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (!under[y * cw + x]) {
            const votes = {};
            for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const n = N(x + dx, y + dy); if (GROUND.has(n)) votes[n] = (votes[n] || 0) + 1; }
            under[y * cw + x] = Object.keys(votes).sort((a, b) => votes[b] - votes[a] || (a < b ? -1 : 1))[0] || dflt;
        }
        const U = (x, y) => (x < 0 || y < 0 || x >= cw || y >= ch ? null : under[y * cw + x]);
        const cells = (f) => { const a = new Float32Array(cw * ch); for (let i = 0; i < a.length; i++) a[i] = f(under[i]); return field(a, cw, ch); };
        return { cw, ch, N, under, U, cells };
    }
    /** Bare branches against the sky: a trunk that forks, and forks again. */
    const BARK = R(['#120f0d', '#1d1915', '#29231d', '#362e26', '#443a30', '#54483c', '#655849']);
    function bareTree(img, x, gy, seed, s = 1) {
        const t = shape();
        thick(t, img, x, gy - 30 * s, x, gy, 4.2 * s);
        thick(t, img, x - 1, gy - 4, x - 10 * s, gy + 2, 2 * s); thick(t, img, x + 1, gy - 4, x + 10 * s, gy + 1, 2 * s);
        const limb = (ax, ay, a, len, w, depth) => {
            const bx = ax + Math.cos(a) * len, by = ay + Math.sin(a) * len;
            thick(t, img, ax, ay, bx, by, w);
            if (depth <= 0) return;
            const forks = depth > 2 ? 2 : 2 + (hash(ax | 0, ay | 0, seed) < 0.4 ? 1 : 0);
            for (let f = 0; f < forks; f++) limb(bx, by, a + (f - (forks - 1) / 2) * 0.75 + (hash(ax | 0, f + depth, seed) - 0.5) * 0.5, len * (0.62 + hash(f, depth, seed + (ax | 0)) * 0.18), Math.max(0.5, w * 0.62), depth - 1);
        };
        const top = gy - 30 * s;
        limb(x, top + 6 * s, -Math.PI / 2 - 0.85, 18 * s, 2.6 * s, 3); limb(x, top + 2 * s, -Math.PI / 2 + 0.8, 19 * s, 2.6 * s, 3);
        limb(x, top, -Math.PI / 2 - 0.1, 16 * s, 2.4 * s, 3); limb(x, top + 12 * s, -Math.PI / 2 + 1.3, 14 * s, 1.8 * s, 2);
        for (const [i] of t.px) { const px = i % img.w, py = (i / img.w) | 0; t.px.set(i, t.px.get(i) * 0.8 + (vnoise(px / 2, py / 5, seed) - 0.5) * 0.7); }
        fill(img, t, BARK, { outline: BARK[0] });
    }
    /** A standing stone, mossy at the foot; `h` tall, `w` half-wide; `cut`: 'knot', 'rune', or nothing. */
    function mossStone(S, cx, gy, seed, h, w, cut, cap = RP.moss) {
        shadow(S, cx + 4, gy + 1, w + 4, 4, 0.45);
        const s = shape(); poly(s, S, [[cx - w, gy], [cx - w - 1, gy - h * 0.55], [cx - w + 2, gy - h * 0.9], [cx - 1, gy - h], [cx + w - 2, gy - h * 0.92], [cx + w, gy - h * 0.5], [cx + w, gy]],
            (px, py) => ((px - cx) / w) * -0.55 + (vnoise(px / 3, py / 4, seed) - 0.5) * 0.45);
        fill(S, s, NP.cliff.slice(1), { outline: NP.cliff[0] });
        for (const [i] of s.px) {
            const px = i % S.w, py = (i / S.w) | 0;
            if ((py > gy - 7 && vnoise(px / 2, py / 2, seed + 3) > 0.45) || (!s.px.has(i - S.w * 2) && vnoise(px / 3, 0, seed + 4) > 0.5) || fbm(px / 4, py / 4, seed + 5) > 0.72) put(S, px, py, cap[1 + ((px + py) % 3)]);
            if (hash(px >> 1, py >> 2, seed + 6) < 0.05) put(S, px, py, NP.cliff[1]);
        }
        if (cut === 'knot') for (let py = Math.round(gy - h * 0.8); py < gy - h * 0.25; py++) {
            const a = Math.sin((py - gy) / 3) * (w * 0.5);
            for (const sg of [-1, 1]) { const px = Math.round(cx + sg * a); put(S, px, py, NP.cliff[0]); put(S, px + 1, py, NP.cliff[7], 0.6); }
        }
        if (cut === 'rune') {                                     // one rune, cut deep: a stem and three pairs of branches
            const top = Math.round(gy - h * 0.82), bot = Math.round(gy - h * 0.18), cut2 = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { const px = Math.round(x0 + ((x1 - x0) * k) / n), py = Math.round(y0 + ((y1 - y0) * k) / n); put(S, px, py, NP.cliff[0]); put(S, px + 1, py, NP.cliff[0]); put(S, px + 2, py, NP.cliff[6], 0.5); } };
            cut2(cx, top, cx, bot);
            for (let k = 0; k < 3; k++) { const y0 = top + 3 + k * Math.round((bot - top) / 4); cut2(cx, y0 + 6, cx - w * 0.6, y0); cut2(cx, y0 + 6, cx + w * 0.6, y0); }
        }
        for (let k = 0; k < 3; k++) { const st = shape(); ellipse(st, S, cx - w + k * w, gy + 1 - (k & 1), 3 + hash(k, 1, seed) * 2, 2.2); fill(S, st, NP.cliff.slice(2), { outline: NP.cliff[0] }); }
    }
    /** A sunlit autumn day: warmer and a touch brighter, warm light round fires and lit windows. */
    function autumnDay(layers, glows, warm = 1) {
        for (const im of layers) { const d = im.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = Math.min(255, d[i] * (1 + 0.05 * warm) + 4); d[i + 1] = Math.min(255, d[i + 1] * (1 + 0.025 * warm) + 2); d[i + 2] = d[i + 2] * (1 - 0.04 * warm); } }
        for (const g of glows) {
            const r = g.r, a = g.a == null ? 0.5 : g.a, ry = Math.round(r * 0.8);
            for (let yy = -ry; yy <= ry; yy++) for (let xx = -r; xx <= r; xx++) {
                const x = Math.round(g.x) + xx, y = Math.round(g.y) + yy, dd = Math.hypot(xx, yy / 0.8) / r;
                if (dd >= 1 || x < 0 || y < 0 || x >= layers[0].w || y >= layers[0].h) continue;
                const w = (1 - dd) * (1 - dd) * a * 0.6;
                for (const im of layers) { const i = (y * im.w + x) * 4, d = im.data; if (!d[i + 3]) continue; for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] + WARM[j] * w * 0.4); }
            }
        }
    }

    // --- The Silent Field ---
    const FIELD = R(['#33333c', '#41414a', '#504f58', '#605f68', '#71707a', '#83828b', '#97959e', '#acaab1', '#c2c0c5']);
    const TRACK = R(['#33261d', '#433226', '#544030', '#664e3b', '#785d47', '#8a6d54', '#9c7e63']);
    const SOIL = R(['#1a1310', '#241a15', '#2f231c', '#3b2c23', '#47362b', '#534033']);
    const S_GROUND = new Set(['tall_grass', 'path', 'torn_earth', 'bridge']);
    const S_BASE = { stream: 'stream', rock: 'tall_grass', dead_tree: 'tall_grass', grave: 'tall_grass', memorial_stone: 'torn_earth', round_stone: 'torn_earth',
        bell_tower: 'tall_grass', field_tent: 'path', relic: 'tall_grass', war_banner: 'tall_grass' };
    function silentField(map, nameAt) {
        const L = layersFor(map), seed = 2207, img = L.base, G = groundGrid(map, nameAt, S_GROUND, S_BASE, 'tall_grass'), { cw, ch, N, U } = G;
        const pathF = G.cells((u) => (u === 'path' || u === 'bridge' ? 1 : 0)), earthF = G.cells((u) => (u === 'torn_earth' ? 1 : 0)), waterF = G.cells((u) => (u === 'stream' ? 1 : 0));
        const kind = new Uint8Array(img.w * img.h);          // 0 grass, 1 path, 2 earth, 3 water, 4 bank
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            const wet = waterF(x, y) + (fbm(x / 14, y / 10, seed + 3) - 0.5) * 0.35;
            if (wet > 0.55) {
                kind[i] = 3;
                let t = 0.3 + (fbm(x / 30, y / 6, seed + 4) - 0.5) * 0.3 + (vnoise(x / 12, y / 1.8, seed + 5) > 0.78 ? 0.18 : 0);
                put(img, x, y, pick(NP.water, t)); put(img, x, y, [96, 96, 110], 0.35);
                if (wet < 0.62) put(img, x, y, SOIL[2], (0.62 - wet) * 9);
                continue;
            }
            if (wet > 0.42) { kind[i] = 4; put(img, x, y, pick(NP.cliff, 0.25 + n1 * 0.45 + hash(x >> 1, y >> 1, seed) * 0.15)); if (vnoise(x / 3, y / 3, seed + 6) > 0.62) put(img, x, y, RP.moss[1 + (x & 1)]); continue; }
            if (pathF(x, y) + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.12 > 0.5) {
                kind[i] = 1; put(img, x, y, pick(TRACK, 0.35 + fbm(x / 9, y / 9, seed + 7) * 0.45 + hash(x, y, seed + 8) * 0.15));
                if (hash(x, y, seed + 9) < 0.03) put(img, x, y, NP.rock[5]);
                continue;
            }
            if (earthF(x, y) + (n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.1 > 0.5) {
                kind[i] = 2; put(img, x, y, pick(SOIL, 0.3 + fbm(x / 7, y / 7, seed + 10) * 0.5 + hash(x, y, seed + 11) * 0.2));
                if (hash(x >> 1, y >> 1, seed + 12) < 0.04) put(img, x, y, SOIL[5]);
                continue;
            }
            kind[i] = 0;
            put(img, x, y, pick(FIELD, 0.05 + fbm(x / 30, y / 14, seed + 13) * 0.45 + (n2 - 0.5) * 0.25));
        }
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if ((kind[i] === 1 || kind[i] === 2) && kind[i - img.w] === 0) put(img, x, y, FIELD[1], 0.6);
            if (kind[i] === 3 && kind[i - img.w] !== 3) put(img, x, y, NP.water[0], 0.7);
        }
        // The grass: thousands of pale stems leaning east in the wind, a plume on each; white flowers in the hollows.
        for (let n = 0; n < (img.w * img.h) / 7; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k !== 0 || fbm(x / 14, y / 10, seed + 15) < 0.32 + r * 0.25) continue;
            if (r < 0.012) { for (const [dx, dy] of [[0, 0], [2, 1], [-1, 2]]) { put(img, x + dx, y + dy, [232, 228, 214]); put(img, x + dx, y + dy + 1, [196, 180, 120], 0.6); } continue; }
            const h = 8 + hash(n, 10, seed) * 11, lean = 0.25 + vnoise(x / 60, y / 60, seed + 14) * 0.35, t0 = 0.3 + hash(n, 11, seed) * 0.4 + (fbm(x / 40, y / 20, seed + 16) - 0.5) * 0.3;
            for (let j = 0; j < h; j++) put(img, x + lean * j * (j / h), y - j, pick(FIELD, t0 + (j / h) * 0.3 - 0.15));
            const px = x + lean * h, py = y - h;
            put(img, px, py, FIELD[8]); put(img, px + 1, py, FIELD[7]); put(img, px + 1, py + 1, FIELD[7]); put(img, px + 2, py + 1, FIELD[6]);
            put(img, x, y + 1, FIELD[0], 0.5);
        }
        // The round stone at the heart of the ring: a flat wheel of eight spokes in a kerb of flags.
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows }, seen = new Set();
        const open = (x, y) => S_GROUND.has(N(x, y)), behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const BLOCKS = {
            round_stone: (b) => ({ y: b.y0 - 1, draw: () => roundStone(img, (b.x0 + b.x1 + 1) * C / 2, (b.y0 + b.y1 + 1) * C / 2, seed) }),
            bell_tower: (b) => ({ y: b.y1 + 0.9, draw: () => fieldBell(L, b, seed + 5, anyBehind(b)) }),
            field_tent: (b) => ({ y: b.y1 + 0.9, draw: () => fieldTent(L, b, seed + 9, anyBehind(b)) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P = {
                dead_tree: () => tall(L, [cx - 90, gy - 150, cx + 90, gy + 8], y * C, behind(x, y), (S) => { shadow(S, cx + 8, gy + 1, 24, 6, 0.4); bareTree(S, cx, gy, seed + x * 5 + y, 1.45 + hash(x, y, seed) * 0.4); }),
                grave: () => tall(L, [cx - 24, gy - 40, cx + 30, gy + 8], y * C, behind(x, y), (S) => grave(S, cx + (hash(x, y, seed) - 0.5) * 6, gy, seed + x * 3 + y)),
                memorial_stone: () => tall(L, [cx - 24, gy - 76, cx + 28, gy + 6], y * C, behind(x, y), (S) => mossStone(S, cx, gy, seed + x * 7 + y, 58 + hash(x, y, seed) * 10, 13, null)),
                rock: () => stone(img, cx, gy - 9, 13 + hash(x, y, seed) * 4, 10, seed + x + y, NP.cliff, RP.moss, 0.1),
                relic: () => relic(img, cx, gy, seed + x),
                war_banner: () => tall(L, [cx - 14, gy - 56, cx + 24, gy + 4], y * C, behind(x, y), (S) => markerSpear(S, cx, gy, seed + x * 3 + y)),
                bridge: () => fieldBridge(img, x, y, N, seed)
            }[n];
            if (P) items.push({ x, y: y + (n === 'dead_tree' ? 0.8 : n === 'bridge' ? -0.5 : 0.5), draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Mist lying in the hollows and drifting over the field.
        for (const im of [img, L.over]) { const d = im.data; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const i = (y * im.w + x) * 4; if (!d[i + 3]) continue; const m = Math.max(0, fbm(x / 90, y / 26, seed + 40) - 0.5) * 0.9 + Math.max(0, vnoise(x / 40, y / 12, seed + 41) - 0.7) * 0.6; if (m > 0) for (let j = 0; j < 3; j++) d[i + j] = d[i + j] + ([196, 196, 206][j] - d[i + j]) * Math.min(0.55, m); } }
        edgeShade(img, 16, 0.32);
        overcast([img, L.over], glows);
        const water = [];
        for (let i = 0; i < kind.length; i += 5) if (kind[i] === 3 && hash(i, 0, seed) < 0.1) water.push(i);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water, animate: animator(flames, smoke) };
    }
    function roundStone(img, mx, my, seed) {
        const k = shape(); ellipse(k, img, mx, my, 30, 19); fill(img, k, NP.cliff.slice(1, 6), { tex: 0.4, seed, outline: NP.cliff[0] });
        for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; for (let r = 21; r < 30; r++) put(img, mx + Math.cos(t) * r, my + Math.sin(t) * r * 0.63, NP.cliff[1]); }
        const d = shape(); ellipse(d, img, mx, my, 20, 12.5); fill(img, d, NP.cliff.slice(3), { tex: 0.3, seed: seed + 1, outline: NP.cliff[1] });
        for (let r = 14; r < 16; r++) for (let a = 0; a < 200; a++) { const t = (a / 200) * Math.PI * 2; put(img, mx + Math.cos(t) * r, my + Math.sin(t) * r * 0.62, NP.cliff[1]); }
        for (let s = 0; s < 8; s++) { const t = (s / 8) * Math.PI * 2 + 0.2; for (let r = 2; r < 13; r++) put(img, mx + Math.cos(t) * r, my + Math.sin(t) * r * 0.62, NP.cliff[1]); }
        for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; put(img, mx + Math.cos(t) * 31, my + Math.sin(t) * 20, SOIL[0]); }
        for (let px = mx - 30; px < mx - 10; px++) if (hash(px, 1, seed) < 0.6) put(img, px, my + 8 + Math.round(Math.sin(px / 3) * 2), SOIL[5]);   // where the bar went in
    }
    function grave(img, cx, gy, seed) {
        shadow(img, cx + 4, gy + 1, 10, 3, 0.45);
        const h = 24 + hash(seed, 2, 1) * 8, s = shape();
        poly(s, img, [[cx - 9, gy], [cx - 9, gy - h + 7], [cx - 5, gy - h], [cx + 5, gy - h], [cx + 9, gy - h + 7], [cx + 9, gy]], (px, py) => ((px - cx) / 9) * -0.6 + (vnoise(px / 2, py / 3, seed) - 0.5) * 0.4);
        fill(img, s, NP.cliff.slice(1), { outline: NP.cliff[0] });
        for (let k = 0; k < 4; k++) for (let px = cx - 5; px < cx + 5; px++) if (hash(px, k, seed) < 0.7) put(img, px, gy - h + 8 + k * 4, NP.cliff[1]);
        for (const [i] of s.px) { const px = i % img.w, py = (i / img.w) | 0; if (py > gy - 5 && vnoise(px / 2, py, seed + 3) > 0.45) put(img, px, py, RP.moss[1 + (px & 1)]); }
        const b = shape(); box(b, img, cx - 12, gy - 3, 24, 5, 0.2); fill(img, b, NP.cliff.slice(2, 6), { tex: 0.5, seed: seed + 1, outline: NP.cliff[0] });
        if (hash(seed, 3, 1) < 0.5) { const s2 = shape(); poly(s2, img, [[cx + 10, gy + 2], [cx + 10, gy - 7], [cx + 13, gy - 10], [cx + 16, gy - 7], [cx + 16, gy + 2]], (px) => ((px - cx - 13) / 3) * -0.6); fill(img, s2, NP.cliff.slice(1), { outline: NP.cliff[0] }); }
    }
    function relic(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 16, 4, 0.45);
        const w = shape(); for (let a = 0; a < 360; a += 3) { const t = (a * Math.PI) / 180; sset(w, img, cx + 6 + Math.cos(t) * 10, gy - 11 + Math.sin(t) * 10, Math.cos(t) * -0.4); sset(w, img, cx + 6 + Math.cos(t) * 9, gy - 11 + Math.sin(t) * 9, 0); }
        for (let a = 0; a < 360; a += 45) thick(w, img, cx + 6, gy - 11, cx + 6 + Math.cos((a * Math.PI) / 180) * 9, gy - 11 + Math.sin((a * Math.PI) / 180) * 9, 0.6, -0.2);
        fill(img, w, NP.plank.slice(1, 6), { outline: NP.oak[0] });
        const sh = shape(); ellipse(sh, img, cx - 4, gy - 9, 9, 9); fill(img, sh, NP.wool.slice(0, 4), { tex: 0.5, seed, outline: NP.oak[0] });
        for (const [i] of sh.px) { const px = i % img.w, py = (i / img.w) | 0; if ((px - cx + 4) * (py - gy + 9) > 0 && hash(px >> 1, py >> 1, seed) < 0.75) put(img, px, py, NP.madder[2 + ((px + py) & 1)], 0.6); }
        const boss = shape(); ellipse(boss, img, cx - 4, gy - 9, 2.5, 2.5); fill(img, boss, PAL.iron.slice(2), { outline: PAL.iron[0] });
        const sp = shape(); thick(sp, img, cx - 18, gy + 2, cx + 14, gy - 4, 0.8); fill(img, sp, NP.oak.slice(2), { outline: NP.oak[0] });
        for (let k = 0; k < 5; k++) put(img, cx + 14 + k, gy - 4 - k * 0.2, PAL.iron[3 + (k & 1)]);
    }
    function markerSpear(S, cx, gy, seed) {
        shadow(S, cx + 3, gy + 1, 5, 2, 0.4);
        const p = shape(); thick(p, S, cx, gy, cx + 1, gy - 46, 0.9); fill(S, p, NP.oak.slice(2), { outline: NP.oak[0] });
        const hd = shape(); poly(hd, S, [[cx - 1, gy - 46], [cx + 3, gy - 46], [cx + 1, gy - 54]], () => 0.2); fill(S, hd, PAL.iron.slice(2), { outline: PAL.iron[0] });
        for (let py = gy - 44; py < gy - 22; py++) {                   // a strip of red cloth, faded, torn into tails
            const f = (py - gy + 44) / 22, len = 14 - f * 6 + Math.sin(py * 1.7 + seed) * 2;
            for (let k = 0; k < len; k++) { if (f > 0.5 && (k + py) % 5 === 0) continue; put(S, cx + 2 + k, py + Math.sin((k + seed) / 3) * 1.5, pick(NP.madder, 0.35 + (1 - f) * 0.3 + (k / len) * 0.2)); }
        }
    }
    function fieldBridge(img, x, y, N, seed) {
        const X0 = x * C, Y0 = y * C, top = N(x, y - 1) !== 'bridge', bot = N(x, y + 1) !== 'bridge', left = N(x - 1, y) !== 'bridge';
        if (!left) return;                                             // drawn once per row, from its left cell
        const BX = X0 + 6, BW = 52, by0 = Y0 - (top ? 4 : 0), by1 = Y0 + C + (bot ? 4 : 0);
        for (let py = by0; py < by1 + 3; py++) for (let px = BX - 1; px < BX + BW + 2; px++) put(img, px + 3, py + 2, NP.water[0], 0.3);
        for (let py = by0; py < by1; py++) for (let px = BX; px < BX + BW; px++) {
            const u = (py - by0) % 6, b = Math.floor((py - by0) / 6) + y * 7;
            put(img, px, py, u === 0 ? NP.plank[0] : pick(NP.plank, 0.42 + (hash(b, 1, seed) - 0.5) * 0.35 + (vnoise(px / 6, b, seed) - 0.5) * 0.25));
        }
        for (const px of [BX - 2, BX + BW]) { for (let py = by0 - 10; py < by1; py++) put(img, px, py, py % 16 < 10 ? NP.oak[2] : NP.oak[1]); for (let py = by0 - 10; py < by1; py++) put(img, px + 1, py, NP.oak[0]); }
        for (const px of [BX - 3, BX + BW - 1]) for (let py = by0 - 12; py < by1; py += 16) { rectFill(img, px, py, 4, 12, NP.oak[3]); rectFill(img, px, py, 4, 1, NP.oak[6]); }
    }
    /** The field bell on its ruined footing: a stone base, the bell under its little roof, and the fallen timbers of
     *  the old frame heaped against the east side. */
    function fieldBell(L, b, seed, overhead) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 4, mx = X0 + 46;
        tall(L, [X0 - 20, B - 150, X1 + 20, B + 10], b.y0 * C + 8, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 8, B + 2, (X1 - X0) / 2 + 6, 8, 0.5);
            const H = 34;
            RK.blocks(S, X0 + 8, B - H, 82, H, seed, NP.cliff);
            for (let px = X0 + 8; px < X0 + 90; px++) { put(S, px, B - H, NP.cliff[7]); if (vnoise(px / 4, 0, seed) > 0.55) put(S, px, B - H - 1, RP.moss[2]); }
            for (let k = 0; k < 3; k++) RK.blocks(S, X0 + 18 + k * 8, B - 6 + k * 3, 30, 4, seed + k, NP.cliff);   // the steps
            for (let k = 0; k < 9; k++) { const st = shape(); ellipse(st, S, X0 + 92 + hash(k, 1, seed) * 30, B - 4 - hash(k, 2, seed) * 14, 4 + hash(k, 3, seed) * 3, 3); fill(S, st, NP.cliff.slice(2), { outline: NP.cliff[0] }); }
            const snow = NP.snow; NP.snow = SHINGLE; try { bellTower(S, mx, B - H + 2, seed); } finally { NP.snow = snow; }
            for (const [ax, ay, bx2, by2] of [[X0 + 74, B - 92, X0 + 116, B - 6], [X0 + 84, B - 70, X0 + 124, B - 22], [X0 + 96, B - 40, X0 + 128, B - 4], [X0 + 70, B - 54, X0 + 112, B - 50], [X0 + 100, B - 64, X0 + 104, B - 2]]) {
                const t = shape(); thick(t, S, ax, ay, bx2, by2, 2.4); fill(S, t, NP.plank.slice(1), { tex: 0.4, seed: seed + ax, outline: NP.oak[0] });
            }
            for (let px = X0 + 8; px < X0 + 90; px++) if (hash(px, 9, seed) < 0.3) put(S, px, B - H + 4 + (px % 9), RP.moss[1]);
        });
    }
    /** The field hospital: a long tent on a frame of poles, the canvas rotted to rags and hanging in tails, a red
     *  mark faded on the roof; cots in a row inside, a table of bowls at the end. */
    function fieldTent(L, b, seed, overhead) {
        const X0 = b.x0 * C + 6, X1 = (b.x1 + 1) * C - 6, B = (b.y1 + 1) * C - 6, W = X1 - X0, eave = B - 64, ridge = eave - 62;
        tall(L, [X0 - 20, ridge - 20, X1 + 20, B + 10], b.y0 * C + 8, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 8, B + 2, W / 2 + 8, 8, 0.5);
            for (let py = eave; py < B; py++) for (let px = X0 + 4; px < X1 - 4; px++) put(S, px, py, pick(TRACK, 0.15 + (py - eave) / (B - eave) * 0.3 + hash(px >> 2, py >> 2, seed) * 0.08));
            for (let k = 0; k < 3; k++) {                                     // cots
                const cx = X0 + 30 + k * ((W - 120) / 2), cy = B - 22;
                const f = shape(); box(f, S, cx - 18, cy - 8, 36, 12, 0.2); fill(S, f, NP.plank.slice(2), { outline: NP.oak[0] });
                const bl = shape(); box(bl, S, cx - 17, cy - 10, 34, 9, 0.3); fill(S, bl, NP.wool.slice(1), { tex: 0.5, seed: seed + k, outline: NP.wool[0] });
                for (const lx of [cx - 17, cx + 15]) rectFill(S, lx, cy + 4, 2, 6, NP.oak[1]);
            }
            const tx = X1 - 44, ty = B - 18, t = shape(); box(t, S, tx - 18, ty - 10, 38, 10, 0.3); fill(S, t, NP.plank.slice(2), { outline: NP.oak[0] });
            for (const lx of [tx - 16, tx + 16]) rectFill(S, lx, ty, 3, 12, NP.oak[1]);
            for (const [dx, c] of [[-10, PAL.iron[3]], [0, NP.wool[3]], [9, NP.plank[4]]]) { const bw = shape(); ellipse(bw, S, tx + dx, ty - 11, 4, 2); fill(S, bw, [c, c, c], { outline: NP.oak[0] }); }
            for (let k = 0; k < 4; k++) put(S, tx - 4 + k * 3, ty - 9, NP.madder[2]);
            for (const px of [X0, X0 + W / 3, X0 + (2 * W) / 3, X1 - 4]) { const p = shape(); box(p, S, Math.round(px), ridge + 10, 4, B - ridge - 10, -0.2); fill(S, p, NP.oak.slice(1, 6), { outline: NP.oak[0] }); }
            const fr = shape(); thick(fr, S, X0 - 6, eave, X1 + 6, eave, 1.4); thick(fr, S, X0 + 2, ridge + 10, X1 - 2, ridge + 10, 1.4); fill(S, fr, NP.oak.slice(2), { outline: NP.oak[0] });
            // The canvas: a pitched sheet from the ridge pole to the eaves, torn through; tails hang below the eave.
            for (let py = ridge; py < eave + 30; py++) {
                const f = (py - ridge) / (eave - ridge);
                for (let px = Math.round(X0 - 8 - Math.min(1, f) * 6); px < X1 + 8 + Math.min(1, f) * 6; px++) {
                    const tear = fbm(px / 7, py / 9, seed + 1) > 0.66 - (f > 1 ? 0 : 0.05);
                    if (f > 1) { const tail = (Math.floor(px / 7) * 13 + seed) % 31, len = 8 + (tail % 23); if (py - eave > len || (px % 7 === 0)) continue; }
                    if (tear) continue;
                    let c = pick(NP.wool, 0.55 + (1 - Math.min(1, f)) * 0.25 + (vnoise(px / 4, py / 12, seed + 2) - 0.5) * 0.35 - (f > 1 ? 0.2 : 0));
                    put(S, px, py, c);
                    if (fbm(px / 12, py / 10, seed + 3) > 0.68) put(S, px, py, [116, 96, 70], 0.35);                         // stains
                    const rx = px - (X0 + W * 0.35), ry = py - (ridge + (eave - ridge) * 0.5);
                    if ((Math.abs(rx) < 4 && Math.abs(ry) < 15) || (Math.abs(ry) < 4 && Math.abs(rx) < 15)) put(S, px, py, NP.madder[3], 0.55);   // the faded red mark
                }
            }
            for (let px = X0 - 8; px < X1 + 8; px++) if (alphaAt(S, px, ridge)) put(S, px, ridge, NP.oak[1]);
        });
    }

    // --- Birkholt ---
    const MEAD = R(['#2a2612', '#383217', '#48401c', '#584e21', '#6a5c27', '#7c6a2e', '#8e7a36', '#a08a40']);
    const BARLEY = R(['#3a2608', '#5c3e0e', '#7e5814', '#a0741e', '#bf8f2c', '#d6a83e', '#e8c25a']);
    const BIRCH = R(['#3a1606', '#5c240a', '#82380e', '#a64e14', '#c66a1c', '#de8a2c', '#eeac46']);
    const B_GROUND = new Set(['meadow', 'path']);
    const B_BASE = { barley: 'field', herbs: 'garden', fence: 'meadow', house: 'meadow', sheep_shelter: 'meadow', sheep: 'meadow', trough: 'meadow', loom_shed: 'meadow',
        drying_rack: 'meadow', standing_stone: 'meadow', rock: 'meadow', memorial_cloth: 'meadow', barrel: 'meadow', cart: 'path', birch: 'meadow' };
    function birkholt(map, nameAt) {
        const L = layersFor(map), seed = 3109, img = L.base, G = groundGrid(map, nameAt, B_GROUND, B_BASE, 'meadow'), { cw, ch, N } = G;
        const pathF = G.cells((u) => (u === 'path' ? 1 : 0));
        const kind = new Uint8Array(img.w * img.h);
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cx = Math.floor(x / C), cy = Math.floor(y / C), g = G.under[cy * cw + cx], n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            if (g === 'field') {                                          // barley in drills; the east strips cut to stubble
                kind[i] = 5; const r = y % 8, cut = vnoise(cx / 3, 0, seed + 3) > 0.62;
                put(img, x, y, r < 2 ? SOIL[2] : pick(BARLEY, (cut ? 0.25 : 0.45) + (r / 8) * 0.3 + (vnoise(x / 2, y / 6, seed + 4) - 0.5) * 0.4));
                if (!cut && r === 2 && hash(x, y, seed) < 0.5) put(img, x, y - 1, BARLEY[6]);
                continue;
            }
            if (g === 'garden') { kind[i] = 6; put(img, x, y, pick(SOIL, 0.35 + n1 * 0.35 + hash(x, y, seed) * 0.15)); continue; }
            if (pathF(x, y) + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.12 > 0.5) {
                kind[i] = 1; put(img, x, y, pick(TRACK, 0.3 + fbm(x / 9, y / 9, seed + 7) * 0.45 + hash(x, y, seed + 8) * 0.15));
                const rut = Math.abs(((x + y * 0.3) % 14) - 7); if (rut < 0.7 && hash(x >> 2, y >> 2, seed) < 0.5) put(img, x, y, TRACK[1], 0.5);
                continue;
            }
            kind[i] = 0;
            put(img, x, y, pick(MEAD, 0.2 + fbm(x / 26, y / 16, seed + 13) * 0.55 + (n2 - 0.5) * 0.3));
            if (fbm(x / 10, y / 8, seed + 14) > 0.74) put(img, x, y, pick(NP.snow, 0.45 + n2 * 0.3), 0.7);      // frost in the hollows
        }
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) { const i = y * img.w + x; if (kind[i] === 1 && kind[i - img.w] === 0) put(img, x, y, MEAD[1], 0.7); }
        for (let n = 0; n < (img.w * img.h) / 26; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 && r < 0.4) { for (let j = 0; j < 4; j++) put(img, x + (j & 1), y - j, MEAD[5 + (j & 1)]); }
            else if (k === 0 && r < 0.46) { const c = pick(BIRCH, 0.3 + hash(n, 10, seed) * 0.5); for (const [dx, dy] of [[0, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [0, -2]]) put(img, x + dx, y + dy, c); }   // autumn bushes
            else if (k === 1 && r < 0.2) { put(img, x, y, NP.rock[5]); put(img, x + 1, y, NP.rock[4]); }
        }
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows }, seen = new Set();
        const open = (x, y) => B_GROUND.has(N(x, y)), behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const BLOCKS = {
            house: (b) => ({ y: b.y1 + 0.9, draw: () => building(L, b, seed + b.x0 * 5 + b.y0, anyBehind(b), FX, { z: 2, chimneys: 1, thatch: true }) }),
            sheep_shelter: (b) => ({ y: b.y1 + 0.8, draw: () => leanTo(L, b, seed + b.x0 * 3 + b.y0, anyBehind(b), 'hay') }),
            loom_shed: (b) => ({ y: b.y1 + 0.8, draw: () => leanTo(L, b, seed + b.x0 * 7, anyBehind(b), 'loom') }),
            drying_rack: (b) => ({ y: b.y1 + 0.7, draw: () => dryingRack(L, b, seed + b.x0, anyBehind(b)) }),
            herbs: (b) => ({ y: b.y0 - 0.5, draw: () => herbBed(img, b, seed + b.x0) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P = {
                fence: () => rail(L, N, x, y, seed),
                sheep: () => sheep(img, cx + (hash(x, y, seed) - 0.5) * 10, gy - 2, seed + x * 3 + y),
                trough: () => trough(img, cx, gy, seed),
                standing_stone: () => tall(L, [cx - 20, gy - 66, cx + 24, gy + 6], y * C, behind(x, y), (S) => mossStone(S, cx, gy, seed + x * 7 + y, 40 + hash(x, y, seed + 1) * 16, 10, 'knot', NP.turf)),
                rock: () => stone(img, cx, gy - 8, 11, 8, seed + x + y, NP.cliff, NP.turf, 0.4),
                memorial_cloth: () => tall(L, [cx - 24, gy - 70, cx + 26, gy + 6], y * C, behind(x, y), (S) => memorialCloth(S, cx, gy, seed)),
                barrel: () => barrel(L, cx, gy, seed + x * 3 + y),
                cart: () => { if (N(x - 1, y) !== 'cart') kit.cart(L, x, y, seed); },
                birch: () => tall(L, [cx - 40, gy - 90, cx + 40, gy + 8], y * C, behind(x, y), (S) => birchTree(S, cx, gy, seed + x * 5 + y))
            }[n];
            if (P) items.push({ x, y: y + (n === 'birch' ? 0.8 : n === 'fence' ? 0.4 : 0.5), draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, 14, 0.28);
        autumnDay([img, L.over], glows, 1);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** Post-and-rail fencing that runs either way: rails along a row, or down a column. */
    function rail(L, N, x, y, seed) {
        const img = L.base, isF = (a, b) => N(a, b) === 'fence', X0 = x * C, Y0 = y * C, gy = Y0 + 24, h = isF(x - 1, y) || isF(x + 1, y), v = isF(x, y - 1) || isF(x, y + 1);
        const s = shape(), post = (px, py) => { box(s, img, px, py - 16, 4, 18, 0); shadow(img, px + 4, py + 2, 3, 1.5, 0.3); };
        if (h || !v) {
            const left = isF(x - 1, y) ? X0 : X0 + 12, right = isF(x + 1, y) ? X0 + C : X0 + 20;
            for (const ry of [gy - 13, gy - 6]) box(s, img, left, ry, right - left, 2, 0.3);
            post(X0 + 14, gy);
        }
        if (v) {
            const top = isF(x, y - 1) ? Y0 - 8 : Y0 + 8, bot = isF(x, y + 1) ? Y0 + C - 8 : Y0 + 24;
            for (const rx of [X0 + 14, X0 + 17]) box(s, img, rx, top, 1, bot - top, 0.2);
            if (!h) post(X0 + 14, gy);
        }
        for (const [i] of s.px) { const py = (i / img.w) | 0; s.px.set(i, s.px.get(i) + (vnoise(i % img.w, py / 4, seed) - 0.5) * 0.8); }
        fill(img, s, PAL.wood.slice(1, 7), { outline: PAL.wood[0] });
    }
    function sheep(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 10, 3, 0.4);
        const flip = hash(seed, 1, 2) < 0.5 ? -1 : 1, tone = hash(seed, 2, 3);
        const ramp = tone < 0.6 ? R(['#6a6252', '#8c8470', '#aaa28c', '#c6bea6', '#dcd6c0', '#eeead8']) : tone < 0.8 ? R(['#3a3430', '#4e4640', '#635a52', '#786e64', '#8c8276']) : R(['#4a3a2a', '#614c36', '#7a6044', '#937654', '#a88a66']);
        for (const lx of [-7, -2, 4, 8]) rectFill(img, cx + lx * flip, gy - 5, 2, 6, [40, 34, 30]);
        const b = shape(); for (let k = 0; k < 5; k++) ellipse(b, img, cx - 6 + k * 3, gy - 10 - (k % 2), 6.5, 6);
        for (const [i, v] of b.px) b.px.set(i, v * 0.6 + (vnoise((i % img.w) / 1.6, ((i / img.w) | 0) / 1.6, seed) - 0.5) * 0.9);
        fill(img, b, ramp, { outline: ramp[0] });
        const hd = shape(); ellipse(hd, img, cx + 13 * flip, gy - 12, 3.4, 4); fill(img, hd, R(['#1c1814', '#2c2620', '#3e362e']), { outline: [20, 16, 14] });
        put(img, cx + 14 * flip, gy - 13, [210, 200, 180]);
    }
    function trough(img, cx, gy, seed) {
        shadow(img, cx + 3, gy + 1, 14, 3, 0.4);
        const t = shape(); box(t, img, cx - 13, gy - 9, 26, 9, 0.3); fill(img, t, NP.plank.slice(2), { tex: 0.4, seed, outline: NP.oak[0] });
        rectFill(img, cx - 11, gy - 8, 22, 3, NP.water[4]); for (let px = cx - 10; px < cx + 10; px += 3) put(img, px, gy - 8, NP.foam[1]);
    }
    function dryingRack(L, b, seed, overhead) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 6, top = B - 52;
        tall(L, [X0 - 8, top - 8, X1 + 8, B + 6], b.y0 * C + 8, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 6, B + 1, (X1 - X0) / 2 + 4, 4, 0.4);
            const fr = shape();
            for (const px of [X0, X1 - 3, ...(X1 - X0 > 90 ? [Math.round((X0 + X1) / 2)] : [])]) box(fr, S, px, top, 3, B - top, -0.2);
            box(fr, S, X0 - 2, top + 2, X1 - X0 + 4, 3, 0.3); box(fr, S, X0 - 2, top + 26, X1 - X0 + 4, 2, 0.3);
            fill(S, fr, NP.oak.slice(1, 6), { outline: NP.oak[0] });
            const dyes = [NP.wool, NP.wool, NP.madder, R(['#4a3a08', '#6e5810', '#94781a', '#b89a2a', '#d4b844']), NP.wool];
            for (let k = 0, px = X0 + 6; px < X1 - 14; k++, px += 14 + Math.round(hash(k, 1, seed) * 4)) {
                for (const row of [0, 1]) {
                    const ramp = dyes[Math.floor(hash(k, row + 2, seed) * dyes.length)], h = 14 + hash(k, row, seed) * 8, w = 10, y0 = top + 5 + row * 24;
                    const f = shape(); poly(f, S, [[px, y0], [px + w, y0], [px + w + 1, y0 + h - 3], [px + w - 3, y0 + h], [px + 3, y0 + h - 1], [px - 1, y0 + h - 4]], (qx) => ((qx - px - w / 2) / w) * -0.5);
                    for (const [i, v] of f.px) f.px.set(i, v + (vnoise((i % S.w) / 1.5, ((i / S.w) | 0) / 3, seed + k) - 0.5) * 0.6);
                    fill(S, f, ramp.slice(1), { outline: ramp[0] });
                }
            }
        });
    }
    function herbBed(img, b, seed) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, Y1 = (b.y1 + 1) * C;
        const kinds = [[[150, 120, 200], [112, 86, 160]], [[236, 232, 210], [200, 190, 120]], [[222, 160, 60], [176, 110, 40]], [[96, 140, 70], [60, 100, 50]]];
        let k = 0;
        for (let py = Y0 + 10; py < Y1 - 2; py += 13) for (let px = X0 + 8; px < X1 - 6; px += 12, k++) {
            const [hi, lo] = kinds[Math.floor((px - X0) / ((X1 - X0) / kinds.length)) % kinds.length];
            shadow(img, px + 2, py + 2, 6, 2, 0.35);
            const s = shape(); for (let j = 0; j < 4; j++) ellipse(s, img, px - 3 + j * 2, py - 3 - (j & 1) * 2, 3.5, 3.5); fill(img, s, NP.turf.slice(1), { outline: NP.turf[0] });
            for (let j = 0; j < 22; j++) { const fx = px - 5 + hash(j, k, seed) * 11, fy = py - 9 + hash(j, k + 1, seed) * 8; put(img, fx, fy, j & 1 ? hi : lo); if (j % 3 === 0) put(img, fx, fy - 1, hi); }
        }
    }
    function memorialCloth(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 18, 4, 0.4);
        const fr = shape(); box(fr, S, cx - 18, gy - 60, 3, 60, -0.2); box(fr, S, cx + 15, gy - 60, 3, 60, -0.2); box(fr, S, cx - 20, gy - 62, 40, 3, 0.3);
        fill(S, fr, NP.oak.slice(1, 6), { outline: NP.oak[0] });
        const X = cx - 13, Y = gy - 58, W = 26, H = 38;
        for (let py = Y; py < Y + H; py++) for (let px = X; px < X + W; px++) put(S, px, py, pick(NP.wool, 0.75 + (vnoise(px / 3, py / 8, seed) - 0.5) * 0.25));
        for (let px = X; px < X + W; px++) { put(S, px, Y + H, (px & 1) ? NP.wool[3] : NP.wool[1]); put(S, px, Y + 2, NP.madder[3]); put(S, px, Y + H - 3, NP.madder[3]); }
        const mx = X + W / 2, my = Y + H / 2;
        for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; for (let r = 2; r < 10; r++) { const px = Math.round(mx + Math.cos(t) * r), py = Math.round(my + Math.sin(t) * r); put(S, px, py, NP.madder[4]); if (r > 6) { put(S, px + Math.round(Math.cos(t + 1.6)), py + Math.round(Math.sin(t + 1.6)), NP.madder[3]); put(S, px + Math.round(Math.cos(t - 1.6)), py + Math.round(Math.sin(t - 1.6)), NP.madder[3]); } } }
        rectFill(S, mx - 1, my - 1, 3, 3, NP.madder[2]);
        for (let py = Y + 6; py < Y + H - 5; py += 3) { put(S, X + 2, py, NP.madder[2]); put(S, X + W - 3, py, NP.madder[2]); }
    }
    function birchTree(S, cx, gy, seed, leaves = BIRCH) {
        shadow(S, cx + 8, gy + 1, 18, 5, 0.4);
        const t = shape(); thick(t, S, cx, gy - 54, cx + 1, gy, 2.6); thick(t, S, cx, gy - 30, cx - 10, gy - 48, 1.2); thick(t, S, cx, gy - 38, cx + 11, gy - 56, 1.2);
        fill(S, t, R(['#5a5550', '#9c9890', '#c8c4ba', '#e2ded4', '#f0ece2']), { outline: [36, 32, 30] });
        for (let py = gy - 52; py < gy; py += 4 + (py % 3)) if (hash(py, 1, seed) < 0.7) { put(S, cx - 1 + (py & 1), py, [30, 28, 26]); put(S, cx + (py & 1), py, [30, 28, 26]); }
        const c = shape();
        for (let k = 0; k < 9; k++) ellipse(c, S, cx + (hash(k, 1, seed) - 0.5) * 30, gy - 50 - hash(k, 2, seed) * 28, 8 + hash(k, 3, seed) * 5, 7 + hash(k, 4, seed) * 4);
        for (const [i, v] of c.px) { const px = i % S.w, py = (i / S.w) | 0; c.px.set(i, v * 0.6 + (vnoise(px / 2.2, py / 2.2, seed + 5) - 0.5) * 0.9); }
        fill(S, c, leaves, { outline: leaves[0] });
        for (const [i] of c.px) if (hash(i, 7, seed) < 0.06) put(S, i % S.w, (i / S.w) | 0, [36, 30, 22], 0.6);           // the gaps where the leaves are gone
    }

    // --- Rúnadal ---
    const MOSSG = R(['#18200f', '#212c14', '#2b3819', '#36461e', '#425524', '#50652b', '#5e7533', '#6e863d']);
    const DUFF = R(['#2e2014', '#3e2c1b', '#4f3a24', '#62492d', '#765a38', '#8a6c44', '#9e7f52']);
    const PINE_G = R(['#09140c', '#0e1d11', '#142817', '#1b331d', '#233f24', '#2e4c2c', '#3b5a34', '#4b6a3e', '#5e7c49']);
    const R_GROUND = new Set(['moss', 'path']);
    const R_BASE = { pine: 'moss', boulder: 'moss', rune_stone: 'path', ring_stone: 'path', offering_table: 'path', lean_to: 'moss', campfire: 'path', stump: 'path' };
    function runadal(map, nameAt) {
        const L = layersFor(map), seed = 4013, img = L.base, G = groundGrid(map, nameAt, R_GROUND, R_BASE, 'moss'), { cw, ch, N } = G;
        const pathF = G.cells((u) => (u === 'path' ? 1 : 0));
        const treeD = new Float32Array(cw * ch); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) treeD[y * cw + x] = N(x, y) === 'pine' ? 1 : 0;
        const shadeF = field(treeD, cw, ch);
        const kind = new Uint8Array(img.w * img.h);
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, n1 = fbm(x / 20, y / 20, seed + 1), n2 = vnoise(x / 4, y / 4, seed + 2);
            if (pathF(x, y) + (n1 - 0.5) * 0.45 + (n2 - 0.5) * 0.12 > 0.5) {
                kind[i] = 1; put(img, x, y, pick(DUFF, 0.35 + fbm(x / 8, y / 8, seed + 7) * 0.45 + hash(x, y, seed + 8) * 0.18));
                if (hash(x, y, seed + 9) < 0.06) put(img, x, y, DUFF[6]); else if (hash(x, y, seed + 10) < 0.04) put(img, x, y, NP.rock[5]);
            } else {
                kind[i] = 0; put(img, x, y, pick(MOSSG, 0.3 + fbm(x / 18, y / 14, seed + 13) * 0.55 + (n2 - 0.5) * 0.35));
                if (fbm(x / 12, y / 10, seed + 14) > 0.76) put(img, x, y, pick(DUFF, 0.3 + n2 * 0.3), 0.6);                   // needles
            }
            const sh = shadeF(x, y) * 0.55 + (fbm(x / 34, y / 30, seed + 15) - 0.5) * 0.4;                           // shade under the canopy, sun in the clearing
            if (sh > 0.15) put(img, x, y, [8, 14, 8], Math.min(0.45, (sh - 0.15) * 0.8)); else put(img, x, y, [255, 214, 130], Math.min(0.14, (0.15 - sh) * 0.3));
        }
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) { const i = y * img.w + x; if (kind[i] === 1 && kind[i - img.w] === 0) put(img, x, y, MOSSG[1], 0.6); }
        for (let n = 0; n < (img.w * img.h) / 30; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 && r < 0.18) { put(img, x, y, [150, 104, 150]); put(img, x + 1, y, [120, 80, 124]); put(img, x, y - 1, [182, 136, 182]); }   // heather
            else if (k === 0 && r < 0.26) { for (let j = 0; j < 6; j++) { put(img, x + j, y - j * 0.5, MOSSG[6]); put(img, x - j, y - j * 0.5, MOSSG[5]); } }   // fern
            else if (k === 0 && r < 0.3) { put(img, x, y, [214, 222, 230]); put(img, x + 1, y + 1, [190, 200, 214]); }                                     // a last scrap of snow
            else if (k === 0 && r < 0.34) { for (let j = 0; j < 4; j++) put(img, x + (j & 1), y - j, MOSSG[5 + (j & 1)]); }
        }
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows }, seen = new Set();
        const open = (x, y) => R_GROUND.has(N(x, y)), behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1), inner = innerFn(map, nameAt);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const BLOCKS = {
            offering_table: (b) => ({ y: b.y1 + 0.6, draw: () => offeringTable(img, b, seed) }),
            lean_to: (b) => ({ y: b.y1 + 0.8, draw: () => leanTo(L, b, seed + 31, anyBehind(b), 'bench') })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P = {
                pine: () => { if (inner(x, y, 'pine') && hash(x, y, seed + 3) < 0.4) return; bigPine(L, x, y, seed, behind(x, y) || inner(x, y, 'pine')); },
                boulder: () => stone(img, cx, gy - 9, 12 + hash(x, y, seed) * 3, 10, seed + x * 3 + y, NP.cliff, RP.moss, 0.6),
                rune_stone: () => tall(L, [cx - 30, gy - 96, cx + 34, gy + 6], y * C, behind(x, y), (S) => mossStone(S, cx, gy, seed + x * 7 + y, 62 + (x === 25 ? 20 : 0), x === 25 ? 20 : 14, 'rune')),
                ring_stone: () => tall(L, [cx - 18, gy - 46, cx + 20, gy + 6], y * C, behind(x, y), (S) => mossStone(S, cx, gy, seed + x * 5 + y, 28 + hash(x, y, seed) * 10, 8, null)),
                campfire: () => { flames.push(fire(img, cx, gy, seed)); glows.push({ x: cx, y: gy - 8, r: 70, a: 0.5 }); smoke.push({ x: cx, y: gy - 16 }); },
                stump: () => kit.stump(L, x, y, seed + x)
            }[n];
            if (P) items.push({ x, y: y + (n === 'pine' ? 0.8 : 0.5), draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Shafts of low sun through the pines.
        for (const im of [img, L.over]) { const d = im.data; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const i = (y * im.w + x) * 4; if (!d[i + 3]) continue; const s = vnoise((x + y * 0.6) / 46, 0, seed + 60); if (s > 0.68) for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] + [255, 216, 140][j] * (s - 0.68) * 0.35); } }
        edgeShade(img, 16, 0.34);
        autumnDay([img, L.over], glows, 0.6);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** A big spruce of the deep wood: a red-brown trunk with roots, and a tall cone of drooping bough tiers. */
    function bigPine(L, cx, cy, seed, overhead) {
        const x = cx * C + 16 + (hash(cx, cy, seed) - 0.5) * 10, gy = cy * C + 30, h = 78 + hash(cx, cy, seed + 1) * 30, w = 30 + hash(cx, cy, seed + 2) * 10;
        shadow(L.base, x + 10, gy, w, 7, 0.5);
        const tr = shape(); thick(tr, L.base, x, gy - 16, x, gy, 3.6); thick(tr, L.base, x - 2, gy, x - 9, gy + 2, 1.6); thick(tr, L.base, x + 2, gy, x + 8, gy + 2, 1.6);
        fill(L.base, tr, R(['#2a1408', '#42200e', '#5c3016', '#78421e', '#905428']), { tex: 0.5, seed, outline: [24, 12, 6] });
        const CL = overhead ? L.over : L.base, s = shape(), tiers = 6;
        for (let t = 0; t < tiers; t++) {
            const ty = gy - 12 - (t / tiers) * h, tw = w * (1 - t / (tiers + 0.8)), th = h / tiers + 10;
            poly(s, CL, [[x, ty - th], [x + tw, ty], [x + tw * 0.6, ty - 3], [x + tw * 0.3, ty + 1], [x, ty - 1], [x - tw * 0.3, ty + 1], [x - tw * 0.6, ty - 3], [x - tw, ty]], (px, py) => ((px - x) / tw) * -0.55 + ((py - ty) / th) * 0.35);
        }
        for (const [i, v] of s.px) s.px.set(i, v * 0.75 + (vnoise((i % CL.w) / 2, ((i / CL.w) | 0) / 1.6, seed + cx * 3 + cy) - 0.5) * 0.8);
        fill(CL, s, PINE_G, { outline: PINE_G[0] });
        for (const [i, v] of s.px) if (v > 0.35 && hash(i, 1, seed) < 0.1) put(CL, i % CL.w, (i / CL.w) | 0, [120, 150, 80], 0.5);   // the sunlit tips
    }
    function offeringTable(img, b, seed) {
        const mx = (b.x0 + b.x1 + 1) * C / 2, gy = (b.y1 + 1) * C - 6;
        shadow(img, mx + 6, gy + 2, 40, 8, 0.5);
        for (const dx of [-26, 0, 24]) { const l = shape(); box(l, img, mx + dx - 6, gy - 10, 12, 12, 0); fill(img, l, NP.cliff.slice(1, 6), { tex: 0.4, seed: seed + dx, outline: NP.cliff[0] }); }
        const t = shape(); ellipse(t, img, mx, gy - 18, 42, 14); fill(img, t, NP.cliff.slice(2), { tex: 0.5, seed, outline: NP.cliff[0] });
        for (const [i] of t.px) { const px = i % img.w, py = (i / img.w) | 0; if (vnoise(px / 3, py / 3, seed + 2) > 0.66) put(img, px, py, RP.moss[2]); }
        // The cloth: woven stripes, hanging over the front edge.
        for (let py = gy - 26; py < gy - 2; py++) for (let px = mx - 22; px < mx + 2; px++) {
            if (py > gy - 12 && (px + py) % 9 === 0) continue;
            const st = ((px - mx) & 7) < 2 || ((py - gy) & 7) < 2;
            put(img, px, py, st ? NP.madder[3 + ((px >> 2) & 1)] : pick(NP.wool, 0.65 + (vnoise(px / 3, py / 3, seed + 3) - 0.5) * 0.25));
        }
        for (let px = mx - 22; px < mx + 2; px += 2) put(img, px, gy - 1, NP.wool[2]);
        const loaf = shape(); ellipse(loaf, img, mx - 12, gy - 24, 9, 6); fill(img, loaf, R(['#4a2a10', '#6e4018', '#945a22', '#b8772e', '#d4973e']), { outline: [50, 28, 12] });
        for (const dx of [-16, -12, -8]) put(img, mx + dx, gy - 26, [232, 196, 120]);
        const bowl = shape(); ellipse(bowl, img, mx + 10, gy - 22, 6, 3.5); fill(img, bowl, NP.oak.slice(2), { outline: NP.oak[0] }); const milk = shape(); ellipse(milk, img, mx + 10, gy - 23, 4.4, 1.6); fill(img, milk, NP.wool.slice(3), { edge: false });
        const cup = shape(); box(cup, img, mx + 18, gy - 34, 8, 10, 0.2); fill(img, cup, NP.oak.slice(1), { outline: NP.oak[0] }); rectFill(img, mx + 19, gy - 34, 6, 1, NP.oak[0]);
    }


    // --- Bjarki's Barrow (the inside of the Járnmyr mound) ---
    const TOMB = R(['#151312', '#1e1b19', '#282421', '#332e2a', '#3f3934', '#4b443e', '#585049', '#665d55', '#766c63']);
    const TOMB_DIRT = R(['#1d140e', '#291c13', '#362518', '#432e1e', '#513825', '#5f422c']);
    const T_OPEN = new Set(['flagstones', 'rubble', 'barrow_mouth', 'dais_steps']);
    function knot(S, x0, y0, w, h, seed, ramp) {
        // An interlace panel: two bands crossing over and under down the middle, a border round it.
        for (let py = y0; py < y0 + h; py++) for (let px = x0; px < x0 + w; px++) if (px === x0 || px === x0 + w - 1 || py === y0 || py === y0 + h - 1) put(S, px, py, ramp[1]);
        const cx = x0 + w / 2, amp = w / 2 - 3;
        for (let py = y0 + 2; py < y0 + h - 2; py++) {
            const a = Math.sin(((py - y0) / (h - 4)) * Math.PI * 2 * Math.max(1, Math.round(h / 22))) * amp;
            for (const sg of [-1, 1]) { const px = Math.round(cx + sg * a); put(S, px, py, ramp[1]); put(S, px + 1, py, ramp[6], 0.6); }
        }
    }
    function bjarkiBarrow(map, nameAt) {
        const L = layersFor(map), seed = 5011, img = L.base, N = (x, y) => nameAt(map, x, y), cw = map.tiles[0].length, ch = map.tiles.length;
        const open = (x, y) => T_OPEN.has(N(x, y));
        const nearOpen = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (open(x + dx, y + dy) || ['dais', 'flame_altar', 'stone_coffin'].includes(N(x + dx, y + dy))) return true; return false; };
        // Floors first: square flags in offset courses, worn, with grave-earth trodden over them.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C), n = N(cx, cy);
            if (n === 'knot_wall' || n === 'grave_slab' && !open(cx - 1, cy) && !open(cx + 1, cy)) { put(img, x, y, [6, 5, 5]); continue; }
            const row = Math.floor(y / 16), off = (row & 1) * 8, col = Math.floor((x + off) / 16), fx = (x + off) % 16, fy = y % 16;
            let t = 0.42 + (hash(col, row, seed) - 0.5) * 0.25 + (vnoise(x / 6, y / 6, seed + 1) - 0.5) * 0.18;
            if (fx === 0 || fy === 0) t = 0.12; else if (fx === 1 || fy === 1) t += 0.12;
            put(img, x, y, pick(TOMB, t));
            const dirt = fbm(x / 26, y / 20, seed + 2) + (n === 'rubble' ? 0.25 : 0);
            if (dirt > 0.62) put(img, x, y, pick(TOMB_DIRT, 0.3 + vnoise(x / 3, y / 3, seed + 3) * 0.5), Math.min(0.85, (dirt - 0.62) * 4));
            if (n === 'rubble' && hash(x >> 1, y >> 1, seed + 4) < 0.08) put(img, x, y, TOMB[6]);
        }
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows }, seen = new Set();
        const firebowl = (S, cx, top, small) => {
            const b = shape(); ellipse(b, S, cx, top, small ? 5 : 10, small ? 2.5 : 4); fill(S, b, PAL.iron.slice(1), { outline: PAL.iron[0] });
            const f = shape(); ellipse(f, S, cx, top - (small ? 4 : 8), small ? 2.5 : 6, small ? 4 : 9); fill(S, f, NP.glow.slice(1), { edge: false });
            const f2 = shape(); ellipse(f2, S, cx, top - (small ? 3 : 6), small ? 1.2 : 3, small ? 2 : 5); fill(S, f2, NP.glow.slice(3), { edge: false });
            flames.push({ x: cx, y: top - (small ? 4 : 8), big: !small }); glows.push({ x: cx, y: top, r: small ? 40 : 110, a: small ? 0.5 : 0.9 });
        };
        const BLOCKS = {
            dais: (b) => ({ y: b.y0 - 0.5, draw: () => {
                const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, Y1 = (b.y1 + 1) * C;
                shadow(img, (X0 + X1) / 2 + 6, Y1 + 2, (X1 - X0) / 2 + 6, 8, 0.6);
                for (let py = Y0; py < Y1; py++) for (let px = X0; px < X1; px++) { const r = Math.floor((py - Y0) / 12), c = Math.floor((px - X0 + (r & 1) * 10) / 20), e = (py - Y0) % 12 === 0 || (px - X0 + (r & 1) * 10) % 20 === 0; put(img, px, py, e ? TOMB[1] : pick(TOMB, 0.55 + (hash(c, r, seed + 7) - 0.5) * 0.2 + (vnoise(px / 5, py / 5, seed + 8) - 0.5) * 0.12)); }
                for (let px = X0; px < X1; px++) { put(img, px, Y0, TOMB[8]); put(img, px, Y1 - 1, TOMB[0]); }
                for (let py = Y0; py < Y1; py++) { put(img, X0, py, TOMB[7]); put(img, X1 - 1, py, TOMB[0]); }
            } }),
            dais_steps: (b) => ({ y: b.y0 - 0.4, draw: () => {
                const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, Y1 = (b.y1 + 1) * C;
                for (let py = Y0; py < Y1; py++) for (let px = X0; px < X1; px++) { const s2 = (py - Y0) % 12; put(img, px, py, s2 < 2 ? TOMB[0] : s2 < 4 ? TOMB[7] : pick(TOMB, 0.5 + (py - Y0) / (Y1 - Y0) * 0.15 + (hash(px >> 3, py, seed) - 0.5) * 0.12)); }
                for (const [dx, dy] of [[-30, 10], [36, 20]]) { const r = shape(); poly(r, img, [[(X0 + X1) / 2 + dx, Y0 + dy], [(X0 + X1) / 2 + dx + 14, Y0 + dy + 2], [(X0 + X1) / 2 + dx + 10, Y0 + dy + 18], [(X0 + X1) / 2 + dx + 2, Y0 + dy + 14]], () => 0); fill(img, r, NP.madder.slice(1, 5), { tex: 0.5, seed: seed + dx, outline: NP.madder[0] }); }
            } }),
            stone_coffin: (b) => ({ y: b.y1 + 0.2, draw: () => {
                const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, Y0 = b.y0 * C + 4, Y1 = (b.y1 + 1) * C - 2, W = X1 - X0;
                shadow(img, (X0 + X1) / 2 + 4, Y1 + 2, W / 2 + 4, 5, 0.6);
                const body = shape(); box(body, img, X0, Y0 + 14, W, Y1 - Y0 - 14, -0.1); fill(img, body, TOMB.slice(2), { tex: 0.4, seed, outline: TOMB[0] });
                const lid = shape(); box(lid, img, X0 - 4, Y0, W + 8, 18, 0.35); fill(img, lid, TOMB.slice(3), { tex: 0.35, seed: seed + 1, outline: TOMB[0] });
                knot(img, X0 + 8, Y0 + 3, W - 16, 12, seed, TOMB);
                for (let k = 0; k < 3; k++) knot(img, X0 + 6 + k * (W / 3), Y0 + 20, W / 3 - 8, Y1 - Y0 - 24, seed + k, TOMB);
                for (const dx of [10, W - 26]) for (let py = Y0 + 14; py < Y1 + 6; py++) for (let px = X0 + dx; px < X0 + dx + 14; px++) if (hash(px, py >> 2, seed) < 0.9 && !(py > Y1 && (px + py) % 4 === 0)) put(img, px, py, pick(NP.madder, 0.3 + (vnoise(px / 3, py / 6, seed) - 0.5) * 0.4));
                const bar = shape(); thick(bar, img, X1 - 6, Y0 + 2, X1 + 12, Y0 - 10, 1.2); fill(img, bar, PAL.iron.slice(1), { outline: PAL.iron[0] });
            } }),
            flame_altar: (b) => ({ y: b.y1 + 0.9, draw: () => tall(L, [b.x0 * C - 10, b.y0 * C - 50, (b.x1 + 1) * C + 10, (b.y1 + 1) * C + 6], b.y0 * C + 4, false, (S) => {
                const cx = (b.x0 + b.x1 + 1) * C / 2, B = (b.y1 + 1) * C - 2;
                RK.blocks(S, cx - 22, B - 10, 44, 10, seed + 5, TOMB.slice(1));
                const p = shape(); box(p, S, cx - 13, B - 56, 26, 46, 0); for (const [i] of p.px) p.px.set(i, (((i % S.w) - cx) / 13) * -0.5); fill(S, p, TOMB.slice(2), { tex: 0.35, seed, outline: TOMB[0] });
                knot(S, cx - 9, B - 50, 18, 34, seed + 2, TOMB);
                firebowl(S, cx, B - 58, false);
            }) }),
            fire_pillar: (b) => ({ y: b.y1 + 0.9, draw: () => tall(L, [b.x0 * C - 16, b.y0 * C - 60, (b.x1 + 1) * C + 16, (b.y1 + 1) * C + 8], b.y0 * C + 8, true, (S) => {
                const cx = (b.x0 + b.x1 + 1) * C / 2, B = (b.y1 + 1) * C + 2;
                shadow(S, cx + 6, B, 36, 7, 0.55);
                RK.blocks(S, cx - 34, B - 10, 68, 10, seed + 9, TOMB.slice(1)); RK.blocks(S, cx - 26, B - 18, 52, 8, seed + 10, TOMB.slice(2));
                for (let px = cx - 34; px < cx + 34; px++) put(S, px, B - 10, TOMB[8]);
                const p = shape(); box(p, S, cx - 14, B - 74, 28, 56, 0); for (const [i] of p.px) p.px.set(i, (((i % S.w) - cx) / 14) * -0.5); fill(S, p, TOMB.slice(2), { tex: 0.35, seed, outline: TOMB[0] });
                knot(S, cx - 10, B - 68, 20, 44, seed + 3, TOMB);
                const cap = shape(); box(cap, S, cx - 17, B - 80, 34, 7, 0.4); fill(S, cap, TOMB.slice(3), { outline: TOMB[0] });
                firebowl(S, cx, B - 82, false);
            }) }),
            grave_coffin: (b) => ({ y: b.y1 + 0.5, draw: () => {
                const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, Y0 = b.y0 * C + 6, Y1 = (b.y1 + 1) * C - 4, W = X1 - X0;
                shadow(img, (X0 + X1) / 2 + 4, Y1 + 2, W / 2 + 4, 4, 0.55);
                const body = shape(); box(body, img, X0, Y0 + 10, W, Y1 - Y0 - 10, -0.1); fill(img, body, TOMB.slice(2), { tex: 0.4, seed: seed + b.x0, outline: TOMB[0] });
                const lid = shape(); poly(lid, img, [[X0 + 6, Y0 - 2], [X1 + 4, Y0 + 4], [X1 - 2, Y0 + 18], [X0, Y0 + 12]], () => 0.3); fill(img, lid, TOMB.slice(3), { tex: 0.35, seed: seed + b.x0 + 1, outline: TOMB[0] });
                knot(img, X0 + 12, Y0 + 3, W - 24, 10, seed + b.x0, TOMB);
                for (let k = 0; k < 14; k++) put(img, X0 + W / 2 + Math.sin(k) * 3, Y0 + 2 + k, TOMB[0]);                       // cracked across
            } }),
            grave_goods: (b) => ({ y: b.y1 + 0.6, draw: () => tall(L, [b.x0 * C - 6, b.y0 * C - 34, (b.x1 + 1) * C + 6, (b.y1 + 1) * C + 4], b.y0 * C, false, (S) => {
                const X0 = b.x0 * C, gy = (b.y1 + 1) * C - 4;
                for (let k = 0; k < 3; k++) { const sx = X0 + 10 + k * 9, sp = shape(); thick(sp, S, sx, gy, sx + 6, gy - 44, 0.8); fill(S, sp, NP.oak.slice(2), { outline: NP.oak[0] }); const hd = shape(); poly(hd, S, [[sx + 5, gy - 44], [sx + 8, gy - 44], [sx + 7, gy - 52]], () => 0.2); fill(S, hd, PAL.iron.slice(2), { outline: PAL.iron[0] }); }
                const sh = shape(); ellipse(sh, S, X0 + 50, gy - 14, 13, 13); fill(S, sh, NP.plank.slice(1, 6), { tex: 0.4, seed, outline: NP.oak[0] });
                for (const [i] of sh.px) { const px = i % S.w, py = (i / S.w) | 0; if (Math.abs(px - X0 - 50) < 2 || Math.abs(py - gy + 14) < 2) put(S, px, py, NP.madder[3]); }
                const boss = shape(); ellipse(boss, S, X0 + 50, gy - 14, 3, 3); fill(S, boss, PAL.iron.slice(2), { outline: PAL.iron[0] });
                const sw = shape(); thick(sw, S, X0 + 68, gy - 2, X0 + 76, gy - 34, 1); fill(S, sw, PAL.iron.slice(2), { outline: PAL.iron[0] }); rectFill(S, X0 + 68, gy - 30, 12, 2, NP.oak[3]);
                const pot = shape(); ellipse(pot, S, X0 + 84, gy - 5, 6, 5); fill(S, pot, CLAY.slice(1, 6), { outline: CLAY[0] });
            }) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P = {
                knot_wall: () => { if (nearOpen(x, y)) tombWall(L, x, y, N, open, seed); },
                grave_slab: () => tall(L, [x * C - 4, y * C - 30, x * C + 36, y * C + 34], y * C, true, (S) => graveSlab(S, cx, gy + 2, seed + x * 3 + y, open(x - 1, y) ? 1 : -1)),
                candle_stand: () => { const st = shape(); box(st, img, cx - 3, gy - 12, 6, 12, 0); fill(img, st, TOMB.slice(2), { outline: TOMB[0] }); firebowl(img, cx, gy - 13, true); },
                urn: () => { shadow(img, cx + 3, gy + 1, 9, 3, 0.5); const u = shape(); ellipse(u, img, cx, gy - 9, 8, 9); box(u, img, cx - 4, gy - 20, 8, 4); fill(img, u, CLAY.slice(1, 6), { tex: 0.3, seed: seed + x, outline: CLAY[0] }); for (let px = cx - 7; px < cx + 7; px++) put(img, px, gy - 11, CLAY[1]); },
                barrow_mouth: () => {
                    for (const sx of [-30, 26]) { const p = shape(); box(p, img, cx + sx, gy - 34, 6, 38, 0); fill(img, p, TOMB.slice(2), { outline: TOMB[0] }); firebowl(img, cx + sx + 3, gy - 18, true); }
                }
            }[n];
            if (P) items.push({ x, y: y + (n === 'knot_wall' ? 0.95 : 0.5), draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Underground: dark everywhere the fires don't reach.
        for (const im of [img, L.over]) { const d = im.data; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const i = (y * im.w + x) * 4; if (!d[i + 3]) continue; for (let j = 0; j < 3; j++) d[i + j] *= 0.8; } }
        overcast([img, L.over], glows);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** A wall cell beside the floor: a north wall is a face of tall knotwork stones; a side wall is a rim of rough blocks. */
    function tombWall(L, x, y, N, open, seed) {
        const img = L.base, X0 = x * C, Y0 = y * C;
        if (open(x, y + 1) || ['dais', 'flame_altar'].includes(N(x, y + 1))) {
            tall(L, [X0 - 2, Y0 - 30, X0 + C + 2, Y0 + C + 2], Y0 + C, false, (S) => {
                const s = shape(); box(s, S, X0 + 1, Y0 - 24, C - 2, C + 24, 0); for (const [i] of s.px) s.px.set(i, (((i % S.w) - X0 - 16) / 16) * -0.4 + (vnoise((i % S.w) / 3, ((i / S.w) | 0) / 4, seed + x) - 0.5) * 0.3);
                fill(S, s, TOMB.slice(2), { outline: TOMB[0] });
                if (hash(x, y, seed) < 0.75) knot(S, X0 + 7, Y0 - 16, 18, 36, seed + x * 3, TOMB); else for (let k = 0; k < 4; k++) rectFill(S, X0 + 9 + k * 4, Y0 - 12 + k * 7, 2, 5, TOMB[1]);   // runes
                const cap = shape(); ellipse(cap, S, X0 + 16, Y0 - 24, 17, 6); fill(S, cap, TOMB.slice(3), { tex: 0.4, seed: seed + x + y, outline: TOMB[0] });
                for (let px = X0 + 1; px < X0 + C - 1; px++) put(S, px, Y0 + C - 1, TOMB[0]);
            });
            return;
        }
        for (const [dx, dy, r] of [[8, 8, 10], [24, 10, 9], [10, 24, 9], [24, 24, 10]]) {
            const b = shape(); ellipse(b, img, X0 + dx, Y0 + dy, r, r * 0.85); for (const [i, v] of b.px) b.px.set(i, v * 0.8 + (vnoise((i % img.w) / 2.5, ((i / img.w) | 0) / 2.5, seed + x * 7 + y) - 0.5) * 0.5);
            fill(img, b, TOMB.slice(1), { outline: TOMB[0] });
            for (const [i] of b.px) if (hash(i, 2, seed) < 0.03) put(img, i % img.w, (i / img.w) | 0, RP.moss[1], 0.6);
        }
    }
    function graveSlab(S, cx, gy, seed, side) {
        shadow(S, cx + 4, gy, 10, 3, 0.5);
        const s = shape(); poly(s, S, [[cx - 8, gy], [cx - 8, gy - 34], [cx - 4, gy - 40], [cx + 4, gy - 40], [cx + 8, gy - 34], [cx + 8, gy]], (px) => ((px - cx) / 8) * -0.5 * side);
        fill(S, s, TOMB.slice(2), { tex: 0.4, seed, outline: TOMB[0] });
        for (let py = gy - 32; py < gy - 8; py += 4) put(S, cx + Math.round(Math.sin(py / 3) * 3), py, TOMB[1]);
        if (hash(seed, 1, 2) < 0.4) for (let py = gy - 30; py < gy - 4; py++) for (let px = cx - 2; px < cx + 5; px++) if (hash(px, py >> 2, seed) < 0.8) put(S, px, py, pick(NP.madder, 0.3 + (vnoise(px / 2, py / 5, seed) - 0.5) * 0.4));
    }


    // --- The uplands (after Tokelo's picture, 2026-11-13): golden heath between spruce and yellow birch, a trail with wolf
    // tracks in the mud, the hunter's stand, the summer pasture, a stream under a plank bridge, grey ledges to the east ---
    const HEATH = R(['#2a2610', '#383214', '#47401a', '#58501f', '#6a6025', '#7d722c', '#908434', '#a2963e', '#b4a84c']);
    const MUD = R(['#24190f', '#322315', '#412e1b', '#513a22', '#62472a', '#745634', '#86663f']);
    const BIRCH_Y = R(['#3e3008', '#5e4a0c', '#806812', '#a2861a', '#c0a226', '#d8bc3a', '#ecd460', '#f6e696']);
    const U_GROUND = new Set(['heath', 'path', 'pasture', 'bridge']);
    const U_BASE = { pine: 'heath', birch: 'heath', boulder: 'heath', ledge: 'ledge', den: 'ledge', stream: 'stream', sheep: 'pasture', hunting_stand: 'heath', fallen_log: 'heath' };
    function uplands(map, nameAt) {
        const L = layersFor(map), seed = 6101, img = L.base, G = groundGrid(map, nameAt, U_GROUND, U_BASE, 'heath'), { cw, ch, N } = G;
        const pathF = G.cells((u) => (u === 'path' || u === 'bridge' ? 1 : 0)), waterF = G.cells((u) => (u === 'stream' ? 1 : 0));
        const pastF = G.cells((u) => (u === 'pasture' ? 1 : 0)), rockF = G.cells((u) => (u === 'ledge' ? 1 : 0));
        const treeD = new Float32Array(cw * ch); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) treeD[y * cw + x] = N(x, y) === 'pine' ? 1 : N(x, y) === 'birch' ? 0.5 : 0;
        const shadeF = field(treeD, cw, ch);
        const kind = new Uint8Array(img.w * img.h);          // 0 heath, 1 path, 2 pasture, 3 water, 4 bank, 5 rock
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, n1 = fbm(x / 22, y / 22, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            const wet = waterF(x, y) + (fbm(x / 12, y / 14, seed + 3) - 0.5) * 0.35;
            if (wet > 0.55) {
                kind[i] = 3;
                const t = 0.32 + (fbm(x / 8, y / 26, seed + 4) - 0.5) * 0.35 + (vnoise(x / 1.8, y / 9, seed + 5) > 0.74 ? 0.25 : 0);
                put(img, x, y, pick(NP.water, t)); put(img, x, y, [70, 90, 110], 0.2);
                if (vnoise(x / 3, y / 2, seed + 6) > 0.8) put(img, x, y, NP.foam[1], 0.7);                                // riffles over the stones
                continue;
            }
            if (wet > 0.4) { kind[i] = 4; put(img, x, y, pick(NP.cliff, 0.3 + n1 * 0.45 + hash(x >> 1, y >> 1, seed) * 0.15)); if (vnoise(x / 3, y / 3, seed + 7) > 0.6) put(img, x, y, HEATH[2 + (x & 1)]); continue; }
            if (rockF(x, y) + (n1 - 0.5) * 0.3 > 0.55) {
                kind[i] = 5; put(img, x, y, pick(NP.cliff, 0.2 + n1 * 0.4 + hash(x >> 1, y >> 1, seed + 8) * 0.12));
                if (fbm(x / 9, y / 9, seed + 9) > 0.62) put(img, x, y, pick(HEATH, 0.3 + n2 * 0.4), 0.8);
                continue;
            }
            if (pathF(x, y) + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.12 > 0.5) {
                kind[i] = 1; put(img, x, y, pick(MUD, 0.3 + fbm(x / 9, y / 9, seed + 10) * 0.5 + hash(x, y, seed + 11) * 0.15));
                if (hash(x, y, seed + 12) < 0.025) put(img, x, y, NP.rock[5]);
                continue;
            }
            const sh = shadeF(x, y) * 0.5 + (fbm(x / 30, y / 26, seed + 13) - 0.5) * 0.3;
            if (pastF(x, y) + (n1 - 0.5) * 0.3 > 0.5) {
                kind[i] = 2; put(img, x, y, pick(HEATH, 0.42 + fbm(x / 16, y / 10, seed + 14) * 0.35 + (n2 - 0.5) * 0.2)); put(img, x, y, NP.turf[5], 0.25);
            } else {
                kind[i] = 0; put(img, x, y, pick(HEATH, 0.22 + fbm(x / 26, y / 18, seed + 15) * 0.6 + (n2 - 0.5) * 0.3 - Math.max(0, sh) * 0.5));
                if (fbm(x / 13, y / 11, seed + 16) > 0.7) put(img, x, y, pick(MUD, 0.3 + n2 * 0.3), 0.45);              // brown bracken
            }
            if (fbm(x / 11, y / 9, seed + 17) > 0.74 + sh * 0.3) put(img, x, y, pick(NP.snow, 0.5 + n2 * 0.4), 0.85);   // old snow lying in patches
        }
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] === 1 && (kind[i - img.w] === 0 || kind[i - img.w] === 2)) put(img, x, y, HEATH[1], 0.7);
            if (kind[i] === 1 && (kind[i + img.w] === 0 || kind[i + img.w] === 2)) put(img, x, y, HEATH[6], 0.4);
            if (kind[i] === 3 && kind[i - img.w] !== 3 && kind[i - 1] !== 3) put(img, x, y, NP.water[0], 0.7);
        }
        // Grass: tall golden stalks, red bilberry, a fern here and there; stones in the stream and on its banks.
        for (let n = 0; n < (img.w * img.h) / 9; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 || k === 2) {
                if (r < 0.06) { const c = pick(NP.madder, 0.4 + hash(n, 10, seed) * 0.5); for (const [dx, dy] of [[0, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [0, -2]]) put(img, x + dx, y + dy, c); continue; }
                if (r < 0.09 && k === 0) { for (let j = 0; j < 6; j++) { put(img, x + j, y - j * 0.5, NP.turf[5]); put(img, x - j, y - j * 0.5, NP.turf[4]); } continue; }
                const h = (k === 2 ? 3 : 5) + hash(n, 11, seed) * (k === 2 ? 3 : 7), lean = 0.15 + vnoise(x / 50, y / 50, seed + 18) * 0.3, t0 = 0.45 + hash(n, 12, seed) * 0.4;
                for (let j = 0; j < h; j++) put(img, x + lean * j * (j / h), y - j, pick(HEATH, t0 + (j / h) * 0.25 - 0.1));
                put(img, x, y + 1, HEATH[0], 0.5);
            } else if ((k === 4 && r < 0.04) || (k === 3 && r < 0.008)) stone(img, x, y, 3 + hash(n, 13, seed) * 4, 2.5 + hash(n, 14, seed) * 3, seed + n, NP.cliff, NP.snow, k === 4 ? 0.2 : 0);
            else if (k === 1 && r < 0.03) { put(img, x, y, NP.rock[5]); put(img, x + 1, y, NP.rock[4]); }
        }
        // The tracks: a family of wolves along the trail from the pasture, and one far bigger, dragging a hind foot.
        const paw = (px, py, big) => { const s2 = big ? 1.5 : 1; const p = shape(); ellipse(p, img, px, py, 2.2 * s2, 1.8 * s2); for (const [dx, dy] of [[-2.4, -2.6], [-0.8, -3.4], [0.8, -3.4], [2.4, -2.6]]) ellipse(p, img, px + dx * s2, py + dy * s2, 0.9 * s2, 0.9 * s2); fill(img, p, MUD.slice(0, 2), { edge: false }); };
        for (let x = 0; x < cw; x++) for (let y = 0; y < ch; y++) {
            if (N(x, y) !== 'path' || x < 8 || x > 27 || y < 20 || y > 28) continue;
            for (let k = 0; k < 3; k++) if (hash(x, y * 3 + k, seed + 20) < 0.55) paw(x * C + 6 + hash(x, k, seed) * 20, y * C + 8 + hash(y, k, seed) * 18, false);
            if ((x + y) % 2 === 0) { const px = x * C + 14, py = y * C + 16; paw(px, py, true); for (let j = 0; j < 8; j++) put(img, px + 3 + j, py + 4 + j * 0.2, MUD[0], 0.6); }   // the dragged foot
        }
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows }, seen = new Set();
        const open = (x, y) => U_GROUND.has(N(x, y)), behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1), inner = innerFn(map, nameAt);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const BLOCKS = {
            hunting_stand: (b) => ({ y: b.y1 + 0.9, draw: () => huntingStand(L, b, seed + 3, anyBehind(b)) }),
            fallen_log: (b) => ({ y: b.y1 + 0.5, draw: () => fallenLog(img, b, seed + 5) }),
            bridge: (b) => ({ y: b.y0 - 0.5, draw: () => plankBridge(img, b, seed + 7) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P = {
                pine: () => { if (inner(x, y, 'pine') && hash(x, y, seed + 21) < 0.35) return; spruce(L, x, y, seed, behind(x, y) || inner(x, y, 'pine'), 0.25 + hash(x, y, seed + 22) * 0.3); },
                birch: () => tall(L, [cx - 40, gy - 92, cx + 40, gy + 8], y * C, true, (S) => birchTree(S, cx, gy, seed + x * 5 + y, BIRCH_Y)),
                boulder: () => stone(img, cx, gy - 9, 12 + hash(x, y, seed) * 4, 10, seed + x * 3 + y, NP.cliff, hash(x, y, seed + 23) < 0.5 ? NP.snow : HEATH, 0.35),
                ledge: () => { const inn = inner(x, y, 'ledge'); if (inn && hash(x, y, seed + 24) > 0.3) return; const snowy = hash(x >> 1, y >> 1, seed + 25) < 0.45; cragCell(L, x, y, seed + 26, NP.cliff, snowy ? NP.snow : HEATH, snowy ? 6 : 8, open(x, y + 1), open(x, y - 1), inn ? 2 : 1); },
                den: () => den(L, x, y, seed + 27),
                fence: () => rail(L, N, x, y, seed),
                sheep: () => sheep(img, cx + (hash(x, y, seed) - 0.5) * 10, gy - 2, seed + x * 3 + y)
            }[n];
            if (P) items.push({ x, y: y + (n === 'pine' || n === 'birch' ? 0.8 : n === 'den' ? 0.99 : n === 'ledge' ? 0.95 : n === 'fence' ? 0.4 : 0.5), draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // Low autumn sun through the trees.
        for (const im of [img, L.over]) { const d = im.data; for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const i = (y * im.w + x) * 4; if (!d[i + 3]) continue; const s = vnoise((x + y * 0.7) / 60, 0, seed + 60); if (s > 0.66) for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] + [255, 220, 150][j] * (s - 0.66) * 0.3); } }
        edgeShade(img, 16, 0.3);
        autumnDay([img, L.over], glows, 0.8);
        const water = [];
        for (let i = 0; i < kind.length; i += 5) if (kind[i] === 3 && hash(i, 0, seed) < 0.1) water.push(i);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water, animate: animator(flames, smoke) };
    }
    /** A spruce of the uplands: like Rúnadal's, a little smaller, with the last snow lying on its boughs. */
    function spruce(L, cx, cy, seed, overhead, snow) {
        const x = cx * C + 16 + (hash(cx, cy, seed) - 0.5) * 10, gy = cy * C + 30, h = 64 + hash(cx, cy, seed + 1) * 34, w = 24 + hash(cx, cy, seed + 2) * 10;
        shadow(L.base, x + 10, gy, w, 7, 0.5);
        const tr = shape(); thick(tr, L.base, x, gy - 14, x, gy, 3.2); thick(tr, L.base, x - 2, gy, x - 8, gy + 2, 1.4); thick(tr, L.base, x + 2, gy, x + 7, gy + 2, 1.4);
        fill(L.base, tr, R(['#2a1408', '#42200e', '#5c3016', '#78421e', '#905428']), { tex: 0.5, seed, outline: [24, 12, 6] });
        const CL = overhead ? L.over : L.base, s = shape(), tiers = 6;
        for (let t = 0; t < tiers; t++) {
            const ty = gy - 10 - (t / tiers) * h, tw = w * (1 - t / (tiers + 0.8)), th = h / tiers + 10;
            poly(s, CL, [[x, ty - th], [x + tw, ty], [x + tw * 0.6, ty - 3], [x + tw * 0.3, ty + 1], [x, ty - 1], [x - tw * 0.3, ty + 1], [x - tw * 0.6, ty - 3], [x - tw, ty]], (px, py) => ((px - x) / tw) * -0.55 + ((py - ty) / th) * 0.35);
        }
        for (const [i, v] of s.px) s.px.set(i, v * 0.75 + (vnoise((i % CL.w) / 2, ((i / CL.w) | 0) / 1.6, seed + cx * 3 + cy) - 0.5) * 0.8);
        fill(CL, s, PINE_G, { outline: PINE_G[0] });
        for (const [i, v] of s.px) {
            const px = i % CL.w, py = (i / CL.w) | 0;
            if (v > 0.3 && hash(i, 1, seed) < 0.08) put(CL, px, py, [130, 150, 80], 0.5);
            if (!s.px.has(i - CL.w * 2) && hash(px >> 1, py, seed + 3) < snow) { put(CL, px, py, NP.snow[6], 0.9); put(CL, px, py + 1, NP.snow[4], 0.7); }   // snow along the top of each tier
        }
    }
    /** The hunter's raised stand: four pine legs, a platform, a little hut of split boards with a pent roof, a ladder. */
    function huntingStand(L, b, seed, overhead) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 4, W = X1 - X0, deck = B - 62, roof = deck - 40;
        tall(L, [X0 - 20, roof - 16, X1 + 30, B + 8], b.y0 * C + 10, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 12, B + 2, W / 2 + 10, 6, 0.5);
            const legs = shape();
            for (const [lx, bx] of [[X0 + 6, X0 + 1], [X1 - 6, X1 - 1], [X0 + 12, X0 + 9], [X1 - 12, X1 - 9]]) thick(legs, S, lx, deck, bx, B, 2);
            thick(legs, S, X0 + 4, B - 22, X1 - 4, deck + 6, 1); thick(legs, S, X1 - 4, B - 22, X0 + 4, deck + 6, 1);                         // cross braces
            fill(S, legs, NP.oak.slice(1, 7), { outline: NP.oak[0] });
            const dk = shape(); box(dk, S, X0 - 2, deck - 6, W + 4, 8, 0.3); fill(S, dk, NP.plank.slice(2), { tex: 0.3, seed, outline: NP.plank[0] });
            RK.planks(S, X0 + 2, roof + 6, W - 4, deck - roof - 8, seed + 1, NP.plank.slice(1), true);                                         // the hut walls
            for (let py = roof + 6; py < deck - 2; py++) { put(S, X0 + 2, py, NP.oak[0]); put(S, X1 - 3, py, NP.oak[0]); }
            rectFill(S, X0 + 8, roof + 16, W - 16, 9, [16, 12, 10]);                                                                       // the shooting slot
            for (let py = roof - 6; py < roof + 8; py++) { const f = (py - roof + 6) / 14; for (let px = Math.round(X0 - 6); px < X1 + 6; px++) put(S, px, py, (py - roof) % 4 === 0 ? NP.oak[0] : pick(NP.plank, 0.3 + f * 0.35 + hash(px >> 2, py >> 2, seed) * 0.15)); }
            for (let px = X0 - 6; px < X1 + 6; px++) if (fbm(px / 7, 0, seed + 4) > 0.45) { put(S, px, roof - 7, NP.snow[6]); put(S, px, roof - 6, NP.snow[4]); }
            const ld = shape(); thick(ld, S, X1 + 2, deck - 2, X1 + 20, B, 1.2); thick(ld, S, X1 + 9, deck - 2, X1 + 27, B, 1.2);             // the ladder
            for (let k = 1; k < 8; k++) { const f = k / 8; thick(ld, S, X1 + 2 + 18 * f, deck - 2 + (B - deck + 2) * f, X1 + 9 + 18 * f, deck - 2 + (B - deck + 2) * f, 0.8); }
            fill(S, ld, NP.oak.slice(2, 7), { outline: NP.oak[0] });
        });
    }
    function fallenLog(img, b, seed) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, gy = (b.y1 + 1) * C - 8;
        shadow(img, (X0 + X1) / 2 + 4, gy + 2, (X1 - X0) / 2 + 2, 4, 0.45);
        const l = shape(); box(l, img, X0, gy - 12, X1 - X0, 12, 0);
        for (const [i] of l.px) { const py = (i / img.w) | 0; l.px.set(i, ((py - gy + 6) / 6) * -0.8 + (vnoise((i % img.w) / 9, py / 1.4, seed) - 0.5) * 0.45); }
        fill(img, l, R(['#3a3a36', '#56544e', '#74706a', '#929088', '#b0aca2']), { outline: [30, 28, 26] });                                    // a birch: grey-white bark
        for (let px = X0 + 4; px < X1 - 4; px += 5 + (px % 3)) { put(img, px, gy - 9, [30, 28, 26]); put(img, px + 1, gy - 9, [30, 28, 26]); put(img, px + 2, gy - 4, [30, 28, 26]); }
        for (const [i] of l.px) if (vnoise((i % img.w) / 4, ((i / img.w) | 0) / 3, seed + 2) > 0.66) put(img, i % img.w, (i / img.w) | 0, NP.turf[3 + (i & 1)]);   // moss
        const e = shape(); ellipse(e, img, X1, gy - 6, 4, 6); fill(img, e, PAL.straw, { edge: false, outline: NP.oak[0] }); put(img, X1, gy - 6, NP.oak[2]);
        const br = shape(); thick(br, img, X0 + 22, gy - 10, X0 + 14, gy - 22, 1); thick(br, img, X0 + 60, gy - 10, X0 + 70, gy - 20, 1); fill(img, br, NP.oak.slice(1, 5), { outline: NP.oak[0] });
    }
    /** A short bridge of split planks across the stream on stone piers, a rail either side. Runs east-west. */
    function plankBridge(img, b, seed) {
        const X0 = b.x0 * C - 10, X1 = (b.x1 + 1) * C + 10, Y0 = b.y0 * C + 6, Y1 = (b.y1 + 1) * C - 6;
        for (const px of [X0 + 2, X1 - 14]) { RK.blocks(img, px, Y0 + 4, 12, Y1 - Y0 + 6, seed + px, NP.cliff); }
        for (let py = Y0 + 3; py < Y1 + 5; py++) for (let px = X0; px < X1 + 3; px++) put(img, px + 3, py, NP.water[0], 0.35);
        for (let py = Y0; py < Y1; py++) for (let px = X0; px < X1; px++) {
            const u = (px - X0) % 7, bd = Math.floor((px - X0) / 7);
            put(img, px, py, u === 0 ? NP.plank[0] : pick(NP.plank, 0.45 + (hash(bd, 1, seed) - 0.5) * 0.35 + (vnoise(bd, py / 6, seed) - 0.5) * 0.25 + (py - Y0 < 2 ? 0.15 : 0)));
        }
        for (const py of [Y0 - 2, Y1 - 2]) { for (let px = X0 - 2; px < X1 + 2; px++) { put(img, px, py, NP.oak[3]); put(img, px, py + 1, NP.oak[0]); } for (let px = X0; px < X1; px += 16) rectFill(img, px, py - 8, 3, 10, NP.oak[2]); }
    }
    /** The den: a black hole under the edge of the ledge, the rock heaped over it, bones and fur in the trodden earth. */
    function den(L, x, y, seed) {
        const img = L.base, cx = x * C + 16, gy = (y + 1) * C - 2;
        cragCell(L, x, y, seed, NP.cliff, NP.snow, 5, false, true, 1);
        const m = shape(); ellipse(m, img, cx, gy - 18, 13, 10); for (const [i, v] of m.px) m.px.set(i, v * 0.4 - 0.6); fill(img, m, [[6, 6, 8], [14, 13, 14], [24, 22, 22]], { edge: false });
        for (let px = cx - 13; px <= cx + 13; px++) { put(img, px, gy - 29 + Math.round(Math.abs(px - cx) / 3), NP.cliff[6]); put(img, px, gy - 28 + Math.round(Math.abs(px - cx) / 3), NP.cliff[1]); }
        const dirt = shape(); ellipse(dirt, img, cx, gy - 30, 22, 7); fill(img, dirt, MUD.slice(1, 5), { tex: 0.6, seed, edge: false });       // the worn ground at the mouth, on top of the ledge
        for (let k = 0; k < 6; k++) { const bx = cx - 16 + hash(k, 1, seed) * 32, by = gy - 33 + hash(k, 2, seed) * 7, a = hash(k, 3, seed) * 3; for (let j = 0; j < 6; j++) put(img, bx + Math.cos(a) * j, by + Math.sin(a) * j * 0.4, [214, 206, 186]); put(img, bx - 1, by, [236, 230, 212]); }
        for (let k = 0; k < 10; k++) put(img, cx - 10 + hash(k, 4, seed) * 20, gy - 32 + hash(k, 5, seed) * 6, [128, 124, 116]);       // a tuft of grey fur
    }

    // --- The Wolf-Banner war camp (after Tokelo's picture, 2026-11-13): a ring of sharpened stakes on a cold hill, the
    // north-east stretch knocked down, a muster ground of trampled mud between braziers and bonfires, black tents,
    // Torvald's command tent with its map table, weapon racks, horses on a line, the cookfire, and wolf banners ---
    const CANVAS = R(['#141414', '#1d1c1b', '#272523', '#312e2b', '#3c3834', '#48433d', '#555048', '#635d54']);
    const TRAMPLE = R(['#21170e', '#2d1f13', '#3a2918', '#48331e', '#573e25', '#664a2d', '#765736', '#866540']);
    const HILLGRASS = R(['#26240f', '#333015', '#413c1a', '#504820', '#5f5627', '#6e642f', '#7e7238', '#8e8242']);
    const W_GROUND = new Set(['grass', 'path', 'muster']);
    const W_BASE = { pine: 'grass', rock: 'grass', stakes: 'grass', broken_stakes: 'grass', brazier: 'muster', bonfire: 'muster', tent: 'grass', command_tent: 'grass',
        map_table: 'grass', weapon_rack: 'grass', wolf_banner: 'grass', horse_line: 'grass', cart: 'grass', log_shelter: 'grass', cookfire: 'path', bench: 'path',
        barrel: 'grass', crate: 'grass', cage: 'grass' };
    function wolfbannerCamp(map, nameAt) {
        const L = layersFor(map), seed = 6203, img = L.base, G = groundGrid(map, nameAt, W_GROUND, W_BASE, 'grass'), { cw, ch, N } = G;
        const pathF = G.cells((u) => (u === 'path' ? 1 : 0)), musterF = G.cells((u) => (u === 'muster' ? 1 : 0));
        const kind = new Uint8Array(img.w * img.h);          // 0 grass, 1 path, 2 muster
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, n1 = fbm(x / 20, y / 20, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            const m = musterF(x, y) + (n1 - 0.5) * 0.45 + (n2 - 0.5) * 0.12, p = pathF(x, y) + (n1 - 0.5) * 0.4 + (n2 - 0.5) * 0.12;
            if (m > 0.5 || p > 0.5) {
                kind[i] = m > 0.5 ? 2 : 1;
                let t = 0.3 + fbm(x / 9, y / 9, seed + 3) * 0.5 + hash(x, y, seed + 4) * 0.12;
                put(img, x, y, pick(TRAMPLE, t));
                if (fbm(x / 7, y / 5, seed + 5) > 0.72) put(img, x, y, pick(NP.water, 0.35 + n2 * 0.3), 0.55);                     // puddles
                else if (hash(x, y, seed + 6) < 0.02) put(img, x, y, NP.rock[5]);
                continue;
            }
            kind[i] = 0;
            put(img, x, y, pick(HILLGRASS, 0.2 + fbm(x / 26, y / 18, seed + 7) * 0.6 + (n2 - 0.5) * 0.3));
            if (fbm(x / 12, y / 10, seed + 8) > 0.72) put(img, x, y, pick(NP.snow, 0.45 + n2 * 0.4), 0.8);                       // old snow
        }
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) { const i = y * img.w + x; if (kind[i] && kind[i - img.w] === 0) put(img, x, y, HILLGRASS[1], 0.7); }
        for (let n = 0; n < (img.w * img.h) / 14; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x], r = hash(n, 9, seed);
            if (k === 0 && r < 0.05) { const c = pick(NP.madder, 0.3 + hash(n, 10, seed) * 0.4); for (const [dx, dy] of [[0, 0], [1, -1], [-1, -1], [0, -2], [2, -3], [-2, -3]]) put(img, x + dx, y + dy, c); }   // dry thorn
            else if (k === 0) { const h = 3 + hash(n, 11, seed) * 6; for (let j = 0; j < h; j++) put(img, x + (j > h - 2 ? 1 : 0), y - j, pick(HILLGRASS, 0.5 + hash(n, 12, seed) * 0.4)); }
            else if (r < 0.03) { put(img, x, y, NP.rock[5]); put(img, x + 1, y, NP.rock[3]); }
            else if (k && r < 0.08) { put(img, x, y, TRAMPLE[0]); put(img, x + 2, y, TRAMPLE[0]); put(img, x + 1, y + 2, TRAMPLE[0]); }                       // boot and hoof prints
        }
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows }, seen = new Set();
        const open = (x, y) => W_GROUND.has(N(x, y)), behind = (x, y) => open(x, y - 1) || open(x - 1, y - 1) || open(x + 1, y - 1);
        const anyBehind = (b) => { for (let xx = b.x0; xx <= b.x1; xx++) if (open(xx, b.y0 - 1)) return true; return false; };
        const BLOCKS = {
            tent: (b) => ({ y: b.y1 + 0.9, draw: () => campTent(L, b, seed + b.x0 * 7 + b.y0, anyBehind(b)) }),
            command_tent: (b) => ({ y: b.y1 + 0.9, draw: () => commandTent(L, b, seed + 11, FX) }),
            map_table: (b) => ({ y: b.y1 + 0.95, draw: () => mapTable(L, b, seed + 13, FX) }),
            bonfire: (b) => ({ y: b.y1 + 0.7, draw: () => bonfire(L, b, seed + b.x0, FX) }),
            weapon_rack: (b) => ({ y: b.y1 + 0.5, draw: () => { for (let x = b.x0; x <= b.x1; x++) tall(L, [x * C - 6, b.y0 * C - 30, x * C + 38, b.y1 * C + 36], b.y0 * C, anyBehind(b), (S) => { weaponRack(S, x * C + 16, b.y1 * C + 26, seed + x); if (x === b.x1) for (let k = 0; k < 2; k++) { const sh = shape(); ellipse(sh, S, x * C + 6 + k * 14, b.y1 * C + 22, 8, 8); fill(S, sh, k ? NP.madder.slice(1) : NP.wool.slice(1), { outline: [16, 12, 10] }); for (let j = -7; j <= 7; j++) put(S, x * C + 6 + k * 14 + j, b.y1 * C + 22, k ? NP.wool[4] : NP.madder[3]); rectFill(S, x * C + 5 + k * 14, b.y1 * C + 21, 3, 3, PAL.iron[4]); } }); } }),
            horse_line: (b) => ({ y: b.y1 + 0.6, draw: () => horseLine(L, b, seed + 17) }),
            cart: (b) => ({ y: b.y1 + 0.7, draw: () => supplyCart(L, b, seed + 19, anyBehind(b)) }),
            log_shelter: (b) => ({ y: b.y1 + 0.8, draw: () => leanTo(L, b, seed + 23, anyBehind(b), 'logs') }),
            cookfire: (b) => ({ y: b.y1 + 0.6, draw: () => campCookfire(L, b, seed + 29, FX) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P = {
                pine: () => spruce(L, x, y, seed, behind(x, y), 0.35 + hash(x, y, seed + 30) * 0.3),
                rock: () => stone(img, cx, gy - 9, 13 + hash(x, y, seed) * 4, 10, seed + x * 3 + y, NP.cliff, hash(x, y, seed + 31) < 0.6 ? NP.snow : HILLGRASS, 0.4),
                stakes: () => tall(L, [x * C - 12, y * C - 40, x * C + 44, y * C + 36], y * C + 20, behind(x, y), (S) => stakeCell(S, x, y, seed, false)),
                broken_stakes: () => tall(L, [x * C - 20, y * C - 40, x * C + 52, y * C + 40], y * C + 20, behind(x, y), (S) => stakeCell(S, x, y, seed, true)),
                brazier: () => tall(L, [cx - 20, gy - 50, cx + 20, gy + 8], y * C, behind(x, y), (S) => fireBasket(S, cx, gy, seed + x, FX)),
                wolf_banner: () => tall(L, [cx - 20, gy - 96, cx + 30, gy + 6], y * C, true, (S) => warBanner(S, cx, gy, seed + x * 3 + y)),
                bench: () => bench(L, { x0: x, x1: x, y0: y, y1: y }, seed + x),
                barrel: () => barrel(L, cx, gy, seed + x * 3 + y),
                crate: () => { crate(L, cx - 4, gy, seed + x); crate(L, cx + 6, gy - 2, seed + x + 1, 1); },
                cage: () => tall(L, [cx - 24, gy - 50, cx + 24, gy + 8], y * C, behind(x, y), (S) => poleCage(S, cx, gy, seed + x))
            }[n];
            if (P) items.push({ x, y: y + (n === 'pine' ? 0.8 : n === 'stakes' || n === 'broken_stakes' ? 0.7 : 0.5), draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        edgeShade(img, 16, 0.32);
        overcast([img, L.over], glows);
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** One cell of the stake ring: three or four sharpened logs on a bank of earth, lashed to a rail. Broken: knocked
     *  flat, some still leaning, a gap where the rest were dragged away. */
    function stakeCell(S, x, y, seed, broken) {
        const X0 = x * C, gy = y * C + 26;
        const bank = shape(); ellipse(bank, S, X0 + 16, gy + 1, 19, 6); fill(S, bank, TRAMPLE.slice(1, 6), { tex: 0.6, seed: seed + x, edge: false });
        for (let k = 0; k < 4; k++) {
            const lx = X0 + 1 + k * 8 + (hash(x, k, seed) - 0.5) * 2, r = hash(x * 7 + k, y, seed + 1);
            if (broken && r < 0.35) continue;                                                     // gone
            if (broken && r < 0.75) {                                                             // knocked down, lying across the bank
                const lg = shape(), a = (hash(k, x + y, seed) - 0.5) * 1.2, len = 26 + r * 14, ex = lx + Math.cos(a) * len, ey = gy - 2 + Math.sin(a) * len * 0.4;
                thick(lg, S, lx, gy - 2, ex, ey, 3.2); fill(S, lg, NP.oak, { tex: 0.3, seed: seed + k, outline: NP.oak[0] });
                put(S, ex, ey, PAL.straw[3]); put(S, ex + 1, ey, PAL.straw[2]);
                continue;
            }
            const h = (broken ? 24 : 40) + hash(k, y * 3 + x, seed + 2) * 12, lean = broken ? (r - 0.85) * 40 : (hash(k, x, seed + 3) - 0.5) * 4, lg = shape();
            poly(lg, S, [[lx, gy], [lx + lean, gy - h + 7], [lx + 4 + lean, gy - h], [lx + 8 + lean, gy - h + 7], [lx + 8, gy]], (px) => ((px - lx - 4) / 4) * -0.7);
            fill(S, lg, NP.oak, { tex: 0.35, seed: seed + x * 5 + k, outline: NP.oak[0] });
            for (let i = 2; i < 7; i++) put(S, lx + lean + i, gy - h + 6 - (i === 4 ? 4 : i === 3 || i === 5 ? 2 : 0), PAL.straw[3]);   // the fresh-cut points
        }
        if (!broken) for (let px = X0 - 2; px < X0 + C + 2; px++) { put(S, px, gy - 18, NP.oak[1]); put(S, px, gy - 17, NP.oak[4]); if ((px - X0) % 8 === 4) { put(S, px, gy - 19, NP.wool[1]); put(S, px, gy - 16, NP.wool[1]); } }
    }
    /** An iron fire basket on three legs, burning. */
    function fireBasket(S, cx, gy, seed, FX) {
        shadow(S, cx + 3, gy + 1, 9, 3, 0.4);
        const lg = shape(); for (const dx of [-8, 0, 8]) thick(lg, S, cx + dx * 0.5, gy - 18, cx + dx, gy, 1); fill(S, lg, PAL.iron, { outline: PAL.iron[0] });
        const bs = shape(); poly(bs, S, [[cx - 10, gy - 30], [cx + 10, gy - 30], [cx + 6, gy - 18], [cx - 6, gy - 18]], (px) => ((px - cx) / 10) * -0.6); fill(S, bs, PAL.iron, { outline: PAL.iron[0] });
        for (let px = cx - 8; px <= cx + 8; px += 4) for (let py = gy - 29; py < gy - 19; py++) put(S, px, py, [230, 120, 40], 0.7);                // embers between the bars
        const f = shape(); ellipse(f, S, cx, gy - 36, 6, 8); fill(S, f, NP.glow.slice(1), { edge: false });
        const f2 = shape(); ellipse(f2, S, cx, gy - 34, 3, 4.5); fill(S, f2, NP.glow.slice(3), { edge: false });
        FX.flames.push({ x: cx, y: gy - 36, big: true }); FX.glows.push({ x: cx, y: gy - 20, r: 70, a: 0.75 });
    }
    /** A bonfire: a square crib of split logs, burning high, smoke going off downwind. */
    function bonfire(L, b, seed, FX) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, mx = (X0 + X1) / 2, gy = (b.y1 + 1) * C - 4;
        tall(L, [X0 - 12, gy - 80, X1 + 12, gy + 10], b.y0 * C, false, (S) => {
            for (let yy = -26; yy <= 26; yy++) for (let xx = -44; xx <= 44; xx++) { const d = Math.hypot(xx / 44, yy / 26); if (d < 1) put(S, mx + xx, gy - 6 + yy, NP.glow[3], (1 - d) * 0.22); }
            const ash = shape(); ellipse(ash, S, mx, gy - 4, 28, 8); fill(S, ash, NP.rock.slice(0, 3), { tex: 0.6, seed, edge: false });
            for (let row = 0; row < 5; row++) {
                const py = gy - 6 - row * 6, w = 26 - row * 3;
                const lg = shape(); if (row % 2) { thick(lg, S, mx - w, py, mx + w, py - 2, 2.4); thick(lg, S, mx - w + 4, py + 3, mx + w - 2, py + 1, 2.4); } else { thick(lg, S, mx - w, py - 3, mx - w + 8, py + 3, 2.6); thick(lg, S, mx + w - 8, py - 3, mx + w, py + 3, 2.6); }
                fill(S, lg, NP.oak, { tex: 0.3, seed: seed + row, outline: NP.oak[0] });
            }
            const f = shape(); for (let k = 0; k < 5; k++) ellipse(f, S, mx - 14 + k * 7, gy - 40 - hash(k, 1, seed) * 10, 6, 14 + hash(k, 2, seed) * 6); fill(S, f, NP.glow.slice(1), { edge: false });
            const f2 = shape(); ellipse(f2, S, mx, gy - 34, 9, 12); fill(S, f2, NP.glow.slice(3), { edge: false });
            for (const dx of [-12, 0, 12]) FX.flames.push({ x: mx + dx, y: gy - 44, big: true });
            FX.smoke.push({ x: mx, y: gy - 62 }); FX.glows.push({ x: mx, y: gy - 20, r: 130, a: 0.85 });
        });
    }
    /** A war tent of tarred black canvas: a ridge pole, the sides pegged down, the front flap tied back on the dark. */
    function campTent(L, b, seed, overhead) {
        const X0 = b.x0 * C + 2, X1 = (b.x1 + 1) * C - 2, B = (b.y1 + 1) * C - 4, W = X1 - X0, H = Math.min(78, 30 + W * 0.36), ridge = B - H;
        tall(L, [X0 - 16, ridge - 14, X1 + 16, B + 10], b.y0 * C + 8, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 8, B + 2, W / 2 + 10, 7, 0.55);
            const fx = X0 + Math.round(W * 0.28), fw = Math.max(18, Math.round(W * 0.3));                    // the gable end, facing you, toward the left
            // The long side of the roof: from the ridge pole down to the pegged hem, folds every few pixels.
            const side = shape(); poly(side, S, [[fx, ridge], [X1 - 4, ridge + 4], [X1 + 6, B - 4], [fx + fw * 0.5 + 4, B]], (px, py) => ((py - ridge) / H) * 0.35 + Math.sin(px / 5) * 0.12);
            for (const [i, v] of side.px) side.px.set(i, v + (vnoise((i % S.w) / 6, ((i / S.w) | 0) / 3, seed) - 0.5) * 0.4);
            fill(S, side, CANVAS, { outline: CANVAS[0] });
            const end = shape(); poly(end, S, [[fx, ridge], [fx + fw * 0.5 + 4, B], [X0 - 6, B]], (px) => ((px - fx) / fw) * -0.4); fill(S, end, CANVAS.slice(1), { tex: 0.3, seed: seed + 1, outline: CANVAS[0] });
            const dark = shape(); poly(dark, S, [[fx - 1, ridge + 16], [fx + fw * 0.3, B], [fx - fw * 0.4, B]], 0); fill(S, dark, [[8, 6, 6], [14, 12, 11], [20, 17, 15]], { edge: false });   // the open flap
            const flap = shape(); poly(flap, S, [[fx - 1, ridge + 14], [fx - fw * 0.42, B], [fx - fw * 0.55 - 6, B - 6]], 0.2); fill(S, flap, CANVAS.slice(3), { outline: CANVAS[0] });
            for (let px = fx; px < X1 - 4; px++) put(S, px, ridge + ((px - fx) / (X1 - fx)) * 4, NP.oak[3]);                                       // ridge pole
            for (const [px, py] of [[fx, ridge], [X1 - 4, ridge + 4]]) { rectFill(S, px - 1, py - 8, 3, 9, NP.oak[3]); put(S, px, py - 9, NP.oak[5]); }
            for (const [ax, ay, bx2] of [[X0 - 4, B - 2, X0 - 14], [X1 + 4, B - 6, X1 + 14], [fx + fw * 0.5, B, fx + fw * 0.6]]) { for (let k = 0; k < 10; k++) put(S, ax + (bx2 - ax) * k / 10, ay + k * 0.5, NP.wool[2]); rectFill(S, bx2, ay + 4, 2, 3, NP.oak[2]); }   // guy ropes
            for (let px = fx + fw * 0.5 + 4; px < X1 + 6; px += 9) { const py = B - 4 + Math.round(((px - fx) / (X1 - fx)) * -0); rectFill(S, Math.round(px), py, 2, 4, NP.oak[1]); }
            for (const [i] of side.px) { const px = i % S.w, py = (i / S.w) | 0; if (py - ridge < 6 && fbm(px / 6, 0, seed + 3) > 0.5) put(S, px, py, NP.snow[5], 0.7); }   // frost along the ridge
        });
    }
    /** Torvald's tent: twice the size of the rest, a red valance scalloped along the eave, the front open under an
     *  awning on two poles; inside, a lamp on a table, bedding, chests. */
    function commandTent(L, b, seed, FX) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C + 6, W = X1 - X0, eave = B - 70, ridge = eave - 56, mx = (X0 + X1) / 2;
        tall(L, [X0 - 24, ridge - 30, X1 + 24, B + 30], B - 16, true, (S) => {
            shadow(S, mx + 10, B + 4, W / 2 + 14, 8, 0.55);
            for (let py = eave; py < B; py++) for (let px = X0 + 10; px < X1 - 10; px++) put(S, px, py, pick(CANVAS, 0.12 + (py - eave) / (B - eave) * 0.25 + hash(px >> 2, py >> 2, seed) * 0.06));   // the dark inside
            const bed = shape(); box(bed, S, X0 + 20, B - 30, 46, 16, 0.3); fill(S, bed, NP.wool.slice(1), { tex: 0.5, seed, outline: NP.wool[0] });
            for (const cx2 of [X1 - 50, X1 - 30]) crate({ base: S }, cx2, B - 6, seed + cx2);
            const tb = shape(); box(tb, S, mx - 18, B - 34, 36, 8, 0.3); fill(S, tb, NP.oak.slice(2), { outline: NP.oak[0] }); rectFill(S, mx - 15, B - 26, 3, 12, NP.oak[1]); rectFill(S, mx + 12, B - 26, 3, 12, NP.oak[1]);
            rectFill(S, mx - 3, B - 44, 6, 9, PAL.iron[2]); rectFill(S, mx - 2, B - 42, 4, 5, NP.glow[4]); FX.flames.push({ x: mx, y: B - 40 }); FX.glows.push({ x: mx, y: B - 30, r: 60, a: 0.7 });
            // Back wall and the two pitched roofs either side of the ridge.
            const back = shape(); poly(back, S, [[X0 + 6, eave], [mx, ridge], [X1 - 6, eave]], (px) => ((px - mx) / (W / 2)) * -0.4); fill(S, back, CANVAS.slice(1), { tex: 0.3, seed: seed + 1, outline: CANVAS[0] });
            const roof = shape(); poly(roof, S, [[X0 - 10, eave + 6], [mx - 6, ridge + 4], [mx + 6, ridge + 4], [X1 + 10, eave + 6], [X1 - 6, eave - 4], [X0 + 6, eave - 4]], (px, py) => ((px - mx) / (W / 2)) * -0.5 + ((py - ridge) / (eave - ridge)) * 0.3);
            for (const [i, v] of roof.px) roof.px.set(i, v + Math.sin((i % S.w) / 6) * 0.1 + (vnoise((i % S.w) / 6, ((i / S.w) | 0) / 4, seed) - 0.5) * 0.3);
            fill(S, roof, CANVAS, { outline: CANVAS[0] });
            for (let px = X0 - 10; px < X1 + 10; px++) {                                                     // the red valance, scalloped, with a pale band
                const sc = Math.abs(((px - X0) % 16) - 8) / 8, len = 12 + Math.round((1 - sc * sc) * 6);
                for (let j = 0; j < len; j++) put(S, px, eave + 2 + j, j < 3 ? [206, 176, 120] : pick(NP.madder, 0.65 - j / len * 0.4));
            }
            for (const px of [X0 - 6, X1 + 2, mx - 30, mx + 26]) { const p = shape(); box(p, S, px, eave - 4, 4, B - eave + 6, -0.2); fill(S, p, NP.oak.slice(1, 6), { outline: NP.oak[0] }); }
            const pole = shape(); box(pole, S, X1 - 20, ridge - 46, 4, eave - ridge + 50, -0.2); fill(S, pole, NP.oak.slice(1, 6), { outline: NP.oak[0] });   // the standard
            const fl = shape(); poly(fl, S, [[X1 - 16, ridge - 44], [X1 + 26, ridge - 40], [X1 + 18, ridge - 30], [X1 + 26, ridge - 18], [X1 - 16, ridge - 20]], (px, py) => Math.sin(px / 6) * 0.25 + ((py - ridge + 44) / 26) * 0.2);
            fill(S, fl, NP.madder, { tex: 0.25, seed: seed + 3, outline: [26, 8, 8] });
            runningWolf(S, X1 - 6, ridge - 32, 1);
        });
    }
    /** The map table under the awning: a hide map of Hrimvald weighted with stones, a lamp, a rug under it. */
    function mapTable(L, b, seed, FX) {
        const cx = b.x0 * C + 16, gy = (b.y1 + 1) * C - 4;
        tall(L, [cx - 40, gy - 50, cx + 40, gy + 10], b.y0 * C, false, (S) => {
            const rug = shape(); box(rug, S, cx - 34, gy - 18, 68, 22, 0); fill(S, rug, RUNNER, { tex: 0.4, seed, outline: RUNNER[0] });
            for (let px = cx - 30; px < cx + 30; px++) { put(S, px, gy - 15, [196, 170, 120]); put(S, px, gy + 1, [196, 170, 120]); }
            shadow(S, cx + 4, gy - 2, 26, 4, 0.5);
            const tb = shape(); box(tb, S, cx - 24, gy - 30, 48, 12, 0.3); fill(S, tb, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
            for (const px of [cx - 21, cx + 18]) rectFill(S, px, gy - 18, 3, 16, NP.oak[1]);
            const hide = shape(); poly(hide, S, [[cx - 20, gy - 31], [cx + 14, gy - 32], [cx + 19, gy - 27], [cx - 16, gy - 25]], 0.3); fill(S, hide, R(['#6a5236', '#8a6c48', '#a8885e', '#c4a676', '#d8bf90']), { tex: 0.4, seed: seed + 1, outline: [60, 44, 28] });
            for (let k = 0; k < 14; k++) put(S, cx - 14 + k * 2, gy - 29 + Math.sin(k) * 1.5, [70, 50, 34]);                         // a coast drawn in soot
            for (const [dx, dy] of [[-8, -28], [4, -30], [10, -27]]) put(S, cx + dx, gy + dy, NP.madder[4]);                         // marks in red
            for (const dx of [-19, 17]) { const st = shape(); ellipse(st, S, cx + dx, gy - 29, 2.6, 2); fill(S, st, NP.rock.slice(3), { outline: NP.rock[0] }); }
            rectFill(S, cx + 21, gy - 40, 5, 8, PAL.iron[2]); rectFill(S, cx + 22, gy - 38, 3, 4, NP.glow[4]); FX.flames.push({ x: cx + 23, y: gy - 37 }); FX.glows.push({ x: cx + 23, y: gy - 28, r: 46, a: 0.6 });
        });
    }
    /** The pale running wolf of the banner, at `s` scale, facing right. */
    function runningWolf(S, x, y, s) {
        const wc = [214, 210, 202], p = (dx, dy, w = 1, h = 1) => rectFill(S, Math.round(x + dx * s), Math.round(y + dy * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), wc);
        p(0, 0, 11, 3); p(10, -2, 4, 3); p(14, -1, 2, 1); p(11, -3, 1, 1); p(13, -3, 1, 1);         // body, head, snout, ears
        p(-2, -1, 2, 1); p(-4, -2, 2, 1);                                                          // tail out behind
        p(0, 3, 1, 2); p(-1, 5, 1, 1); p(3, 3, 1, 2); p(8, 3, 1, 2); p(9, 5, 1, 1); p(10, 3, 1, 2); // legs at a run
    }
    /** A war banner: a tall pole with a crossbar, red cloth hanging from it with a swallowtail, the running wolf. */
    function warBanner(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 7, 2.5, 0.4);
        const p = shape(); thick(p, S, cx, gy - 88, cx, gy, 1.6); thick(p, S, cx - 1, gy - 80, cx + 22, gy - 80, 1); fill(S, p, NP.oak.slice(1, 6), { outline: NP.oak[0] });
        const hd = shape(); poly(hd, S, [[cx, gy - 96], [cx + 3, gy - 88], [cx, gy - 86], [cx - 3, gy - 88]], 0.4); fill(S, hd, PAL.iron.slice(2), { outline: PAL.iron[0] });
        const cl = shape(); poly(cl, S, [[cx + 2, gy - 79], [cx + 22, gy - 79], [cx + 22, gy - 44], [cx + 17, gy - 49], [cx + 12, gy - 42], [cx + 7, gy - 49], [cx + 2, gy - 44]], (px, py) => ((px - cx) / 22) * -0.5 + Math.sin(py / 5 + seed) * 0.15);
        fill(S, cl, NP.madder, { tex: 0.25, seed, outline: [26, 8, 8] });
        for (let px = cx + 3; px < cx + 22; px++) put(S, px, gy - 77, [206, 176, 120]);
        runningWolf(S, cx + 5, gy - 64, 1);
    }
    /** The horse line: a rail between two posts, the horses tied along it in their winter coats, a bucket. */
    function horseLine(L, b, seed) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, gy = (b.y1 + 1) * C - 6;
        tall(L, [X0 - 10, gy - 60, X1 + 10, gy + 8], b.y0 * C, false, (S) => {
            const fr = shape(); box(fr, S, X0, gy - 40, 5, 40, 0); box(fr, S, X1 - 5, gy - 40, 5, 40, 0); thick(fr, S, X0, gy - 34, X1, gy - 34, 1.4); fill(S, fr, NP.oak.slice(1, 6), { outline: NP.oak[0] });
            const coats = [R(['#1e120a', '#34200f', '#4e3016', '#6a421e', '#865628']), R(['#46443e', '#66625a', '#8a867c', '#aaa69a', '#c6c2b4']), R(['#140f0c', '#221a14', '#30251c', '#403126', '#523f30'])];
            const n = Math.max(2, Math.min(3, Math.floor((X1 - X0) / 56)));
            for (let k = 0; k < n; k++) {
                const hx = X0 + 30 + k * ((X1 - X0 - 60) / Math.max(1, n - 1)), ramp = coats[k % 3];
                shadow(S, hx + 4, gy + 1, 20, 4, 0.45);
                for (const lx of [-14, -9, 9, 14]) rectFill(S, hx + lx, gy - 16, 3, 16, ramp[1]);
                const bd = shape(); ellipse(bd, S, hx, gy - 22, 19, 9); fill(S, bd, ramp, { tex: 0.3, seed: seed + k, outline: ramp[0] });
                const nk = shape(); poly(nk, S, [[hx - 14, gy - 26], [hx - 20, gy - 40], [hx - 26, gy - 42], [hx - 30, gy - 36], [hx - 22, gy - 30], [hx - 18, gy - 20]], 0.3); fill(S, nk, ramp, { outline: ramp[0] });
                for (let j = 0; j < 12; j++) put(S, hx - 17 - j * 0.4, gy - 40 + j, ramp[0]);                                            // mane
                const tl = shape(); thick(tl, S, hx + 18, gy - 26, hx + 22, gy - 10, 1.4); fill(S, tl, [ramp[0], ramp[1], ramp[0]], { edge: false });
                const rug = shape(); box(rug, S, hx - 10, gy - 30, 18, 12, 0.2); fill(S, rug, k % 2 ? NP.woad.slice(1) : NP.madder.slice(1), { tex: 0.4, seed: seed + k + 9, outline: [16, 12, 10] });
                for (let j = 0; j < 8; j++) put(S, hx - 28 + j * 2.4, gy - 37 + j * 0.4, NP.wool[1]);                                    // the halter rope to the rail
            }
            const bk = shape(); box(bk, S, X1 - 22, gy - 10, 12, 10, 0.2); fill(S, bk, NP.plank.slice(2), { outline: NP.oak[0] }); rectFill(S, X1 - 21, gy - 10, 10, 2, NP.water[4]);
        });
    }
    /** The supply cart: a plank bed on two big wheels, piled with crates and sacks, its shafts down on the ground. */
    function supplyCart(L, b, seed, overhead) {
        const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 4, W = X1 - X0, bed = B - 28;
        tall(L, [X0 - 30, bed - 40, X1 + 10, B + 8], b.y0 * C + 8, overhead, (S) => {
            shadow(S, (X0 + X1) / 2 + 6, B + 2, W / 2 + 6, 6, 0.5);
            const sh = shape(); thick(sh, S, X0 + 4, bed + 10, X0 - 26, B - 2, 1.4); thick(sh, S, X0 + 10, bed + 14, X0 - 20, B + 2, 1.4); fill(S, sh, NP.oak.slice(1, 6), { outline: NP.oak[0] });
            RK.planks(S, X0, bed, W, 16, seed, NP.plank.slice(1), false);
            for (let px = X0; px < X1; px++) { put(S, px, bed - 1, NP.oak[0]); put(S, px, bed + 16, NP.oak[0]); }
            for (let k = 0; k < 4; k++) crate({ base: S }, X0 + 16 + k * ((W - 30) / 3), bed + 2 - (k % 2) * 12, seed + k);
            for (let k = 0; k < 3; k++) { const sk = shape(); ellipse(sk, S, X0 + 26 + k * 26, bed - 14 - (k % 2) * 4, 10, 8); fill(S, sk, NP.wool.slice(1, 5), { tex: 0.5, seed: seed + k + 5, outline: NP.wool[0] }); }
            for (const wx of [X0 + 18, X1 - 22]) {
                const wh = shape(); ellipse(wh, S, wx, B - 12, 13, 13); fill(S, wh, NP.oak.slice(1, 6), { outline: NP.oak[0] });
                const hb = shape(); ellipse(hb, S, wx, B - 12, 9, 9); fill(S, hb, [[0, 0, 0]], { edge: false });
                for (let a = 0; a < 6; a++) { const t = (a / 6) * Math.PI * 2; for (let r = 2; r < 10; r++) put(S, wx + Math.cos(t) * r, B - 12 + Math.sin(t) * r, NP.oak[3]); }
                rectFill(S, wx - 2, B - 14, 4, 4, PAL.iron[3]);
            }
        });
    }
    /** The cookfire: a tripod over a ring of stones with the pot on its chain, a second pot and a bucket by it. */
    function campCookfire(L, b, seed, FX) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, mx = Math.round((X0 + X1) / 2), gy = (b.y1 + 1) * C - 12;
        tall(L, [X0 - 10, gy - 80, X1 + 10, gy + 14], b.y0 * C, false, (S) => {
            FX.flames.push(fire(S, mx, gy, seed));
            const tp = shape(); thick(tp, S, mx - 24, gy + 4, mx, gy - 62, 1.6); thick(tp, S, mx + 24, gy + 4, mx, gy - 62, 1.6); thick(tp, S, mx + 4, gy - 4, mx, gy - 62, 1.4); fill(S, tp, NP.oak.slice(1, 6), { outline: NP.oak[0] });
            for (let j = gy - 60; j < gy - 30; j++) put(S, mx, j, PAL.iron[2]);
            const pot = shape(); ellipse(pot, S, mx, gy - 22, 12, 10); fill(S, pot, PAL.iron, { outline: PAL.iron[0] }); for (let px = mx - 10; px < mx + 10; px++) put(S, px, gy - 30, PAL.iron[4]);
            const pot2 = shape(); ellipse(pot2, S, X1 - 14, gy, 8, 7); fill(S, pot2, PAL.iron, { outline: PAL.iron[0] });
            const bk = shape(); box(bk, S, X0 + 6, gy - 8, 12, 11, 0.2); fill(S, bk, NP.plank.slice(2), { outline: NP.oak[0] });
            FX.smoke.push({ x: mx - 4, y: gy - 40 }); FX.glows.push({ x: mx, y: gy - 8, r: 90, a: 0.75 });
        });
    }
    /** A cage of poles lashed at the corners, a roof of poles, straw inside. Empty. */
    function poleCage(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 18, 4, 0.45);
        const st = shape(); box(st, S, cx - 15, gy - 8, 30, 8, 0.2); fill(S, st, PAL.straw, { tex: 0.7, seed, edge: false });
        const fr = shape();
        for (let k = 0; k <= 5; k++) { const px = cx - 16 + k * 6.4; thick(fr, S, px, gy, px + 4, gy - 30, 0.9); }
        thick(fr, S, cx - 18, gy - 1, cx + 18, gy - 1, 1); thick(fr, S, cx - 14, gy - 31, cx + 22, gy - 31, 1); thick(fr, S, cx - 16, gy - 16, cx + 20, gy - 16, 0.8);
        fill(S, fr, NP.oak.slice(2, 7), { outline: NP.oak[0] });
        for (const px of [cx - 16, cx + 16]) { put(S, px, gy - 16, NP.wool[3]); put(S, px + 1, gy - 15, NP.wool[3]); }
    }

    // --- Hallvard's Barrow, inside (after Tokelo's picture, 2026-11-13): a kept hall, warm with fire and candlelight ---
    const DRESSED = R(['#1b1918', '#262321', '#322e2b', '#3e3935', '#4b4540', '#59524b', '#675f57', '#766d63', '#867c70']);
    const H_OPEN = new Set(['flagstones', 'runner', 'dais', 'dais_steps', 'barrow_mouth']);
    function hallvardBarrow(map, nameAt) {
        const L = layersFor(map), seed = 6301, img = L.base, N = (x, y) => nameAt(map, x, y), cw = map.tiles[0].length, ch = map.tiles.length;
        const open = (x, y) => H_OPEN.has(N(x, y));
        const nearOpen = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = N(x + dx, y + dy); if (n && n !== 'barrow_wall') return true; } return false; };
        // Floors: big square flags, swept; the dais is laid in longer, paler slabs.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C), n = N(cx, cy);
            if (n === 'barrow_wall') { put(img, x, y, [8, 7, 7]); continue; }
            const dais = n === 'dais' || n === 'chair' || n === 'fire_pillar' || (n === 'candles' && cy < 8) || (n === 'vase' && cy < 8) || n === 'runner' && cy < 8;
            const sw = dais ? 24 : 20, sh = dais ? 12 : 20, row = Math.floor(y / sh), off = (row & 1) * (sw / 2), col = Math.floor((x + off) / sw), fx = (x + off) % sw, fy = y % sh;
            let t = (dais ? 0.55 : 0.45) + (hash(col, row, seed + (dais ? 9 : 0)) - 0.5) * 0.22 + (vnoise(x / 7, y / 7, seed + 1) - 0.5) * 0.14;
            if (fx === 0 || fy === 0) t = 0.12; else if (fx === 1 || fy === 1) t += 0.1;
            put(img, x, y, pick(DRESSED, t));
            if (hash(x >> 1, y >> 1, seed + 2) < 0.03) put(img, x, y, DRESSED[2]);
        }
        // The runners: woven red with a pale border and a knot down the middle, from the passage to the vestibule, and on the dais.
        const runners = []; const seenR = new Set();
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (N(x, y) === 'runner' && !seenR.has(`${x},${y}`)) runners.push(blockOf(map, nameAt, x, y, new Set(['runner']), seenR));
        for (const b of runners) {
            const X0 = b.x0 * C + 6, X1 = (b.x1 + 1) * C - 6, Y0 = b.y0 * C + (b.y0 < 8 ? 4 : 8), Y1 = (b.y1 + 1) * C - (b.y1 > 30 ? 0 : 8);
            for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
                const u = x - X0, w = X1 - X0, v = y - Y0, edge = u < 4 || u >= w - 4 || (b.y0 < 8 && (v < 4 || v >= Y1 - Y0 - 4));
                let c = pick(RUNNER, 0.5 + (hash(x >> 1, y >> 1, seed + 5) - 0.5) * 0.3);
                if (edge) c = (u === 1 || u === w - 2) ? [196, 170, 120] : RUNNER[1];
                else if (Math.abs(((u - w / 2) + ((y >> 2) % 6) * 1.5)) % 9 < 1 || Math.abs(((u - w / 2) - ((y >> 2) % 6) * 1.5)) % 9 < 1) c = [190, 150, 96];
                put(img, x, y, c);
            }
            if (b.y1 < 30 && b.y0 > 8) for (let x = X0; x < X1; x += 3) for (let k = 0; k < 4; k++) put(img, x, Y1 + k, [196, 170, 120], 0.8);   // fringe
        }
        const flames = [], smoke = [], glows = [], items = [], FX = { flames, smoke, glows }, seen = new Set();
        const candle = (S, px, py, h) => { rectFill(S, px - 1, py - h, 3, h, [236, 226, 200]); put(S, px, py - h - 2, NP.glow[NP.glow.length - 1]); put(S, px, py - h - 1, NP.glow[4]); flames.push({ x: px, y: py - h - 2 }); glows.push({ x: px, y: py - h, r: 26, a: 0.35 }); };
        const firebowl = (S, cx, top) => {
            const b = shape(); ellipse(b, S, cx, top, 13, 5); fill(S, b, NP.bronze.slice(1).map((c) => [c[0] + 70, c[1] + 40, c[2]]), { outline: [40, 28, 12] });
            const f = shape(); ellipse(f, S, cx, top - 10, 8, 11); fill(S, f, NP.glow.slice(1), { edge: false });
            const f2 = shape(); ellipse(f2, S, cx, top - 7, 4, 6); fill(S, f2, NP.glow.slice(3), { edge: false });
            flames.push({ x: cx, y: top - 10, big: true }); glows.push({ x: cx, y: top, r: 120, a: 0.9 });
        };
        const BLOCKS = {
            dais: (b) => ({ y: b.y0 - 0.6, draw: () => { for (let px = b.x0 * C; px < (b.x1 + 1) * C; px++) { put(img, px, b.y0 * C, DRESSED[8]); } } }),
            dais_front: (b) => ({ y: b.y1 + 0.3, draw: () => {
                const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, Y1 = (b.y1 + 1) * C;
                RK.blocks(img, X0, Y0 + 6, X1 - X0, Y1 - Y0 - 6, seed + b.x0, DRESSED.slice(1));
                for (let px = X0; px < X1; px++) { put(img, px, Y0 + 5, DRESSED[8]); put(img, px, Y0 + 6, DRESSED[6]); for (let k = 0; k < 5; k++) put(img, px, Y1 + k, NP.shadow, 0.45 - k * 0.08); }
                for (let px = X0 + 18; px < X1 - 18; px += 48) knot(img, px, Y0 + 9, 22, Y1 - Y0 - 12, seed + px, DRESSED);
            } }),
            dais_steps: (b) => ({ y: b.y0 - 0.4, draw: () => {
                const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C + 6, Y1 = (b.y1 + 1) * C;
                for (let py = Y0; py < Y1; py++) for (let px = X0; px < X1; px++) { const s2 = (py - Y0) % 14; put(img, px, py, s2 < 2 ? DRESSED[0] : s2 < 4 ? DRESSED[8] : pick(DRESSED, 0.55 + (py - Y0) / (Y1 - Y0) * 0.15 + (hash(px >> 3, py, seed) - 0.5) * 0.1)); }
                for (let px = X0; px < X1; px++) for (let k = 0; k < 4; k++) put(img, px, Y1 + k, NP.shadow, 0.35 - k * 0.08);
            } }),
            fire_pillar: (b) => ({ y: b.y1 + 0.9, draw: () => tall(L, [b.x0 * C - 16, b.y0 * C - 70, (b.x1 + 1) * C + 16, (b.y1 + 1) * C + 8], b.y0 * C + 8, false, (S) => {
                const cx = (b.x0 + b.x1 + 1) * C / 2, B = (b.y1 + 1) * C - 2;
                shadow(S, cx + 6, B, 28, 6, 0.55);
                RK.blocks(S, cx - 24, B - 10, 48, 10, seed + 9, DRESSED.slice(2));
                const p = shape(); box(p, S, cx - 15, B - 58, 30, 48, 0); for (const [i] of p.px) p.px.set(i, (((i % S.w) - cx) / 15) * -0.5); fill(S, p, DRESSED.slice(2), { tex: 0.3, seed, outline: DRESSED[0] });
                knot(S, cx - 10, B - 52, 20, 36, seed + 3, DRESSED);
                const cap = shape(); box(cap, S, cx - 18, B - 64, 36, 7, 0.4); fill(S, cap, DRESSED.slice(3), { outline: DRESSED[0] });
                firebowl(S, cx, B - 66);
            }) }),
            offering_ledge: (b) => ({ y: b.y1 + 0.5, draw: () => tall(L, [b.x0 * C - 4, b.y0 * C - 40, (b.x1 + 1) * C + 4, (b.y1 + 1) * C + 6], 0, false, (S) => {
                const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 4, W = X1 - X0;
                RK.blocks(S, X0, B - 18, W, 18, seed + b.x0 + b.y0, DRESSED.slice(2));
                for (let px = X0; px < X1; px++) { put(S, px, B - 18, DRESSED[8]); put(S, px, B + 1, NP.shadow, 0.4); }
                if (W > 40) {
                    const cl = shape(); box(cl, S, X0 + W * 0.55, B - 26, 22, 30, 0); fill(S, cl, RUNNER, { tex: 0.3, seed, outline: RUNNER[0] });
                    for (let py = B - 24; py < B + 4; py++) { put(S, X0 + W * 0.55 + 3, py, [196, 170, 120]); put(S, X0 + W * 0.55 + 18, py, [196, 170, 120]); }
                    for (let k = 0; k < 3; k++) { const f = shape(); box(f, S, X0 + 10, B - 24 - k * 4, 26, 4, 0.2); fill(S, f, NP.wool.slice(3), { outline: NP.wool[1] }); }
                    const bw = shape(); ellipse(bw, S, X1 - 22, B - 21, 9, 4); fill(S, bw, NP.bronze.slice(1).map((c) => [c[0] + 70, c[1] + 40, c[2]]), { outline: [40, 28, 12] });
                    for (let k = 0; k < 8; k++) put(S, X1 - 28 + k * 1.6, B - 23, [214, 180, 90]);
                }
                for (let k = 0; k < (W > 40 ? 4 : 2); k++) candle(S, X0 + 8 + k * (W > 40 ? W / 4 : 12), B - 18, 6 + (k % 2) * 4);
            }) }),
            bench: (b) => ({ y: b.y1 + 0.5, draw: () => tall(L, [b.x0 * C - 4, b.y0 * C - 20, (b.x1 + 1) * C + 4, (b.y1 + 1) * C + 6], 0, false, (S) => {
                const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 6, W = X1 - X0;
                shadow(S, X0 + W / 2 + 4, B + 2, W / 2 + 4, 5, 0.5);
                const st = shape(); box(st, S, X0, B - 18, W, 10, 0.4); fill(S, st, NP.oak.slice(2), { tex: 0.3, seed: seed + b.y0, outline: NP.oak[0] });
                for (const px of [X0 + 6, X1 - 10, X0 + W / 2 - 2]) rectFill(S, Math.round(px), B - 8, 4, 8, NP.oak[1]);
                const rn = shape(); box(rn, S, X0 + W * 0.3, B - 19, W * 0.4, 14, 0); fill(S, rn, RUNNER, { tex: 0.3, seed: seed + b.y0 + 1, outline: RUNNER[0] });
                for (const [i] of rn.px) { const px = i % S.w, py = (i / S.w) | 0; if ((px + py) % 6 === 0) put(S, px, py, [196, 170, 120]); }
                for (let px = Math.round(X0 + W * 0.3); px < X0 + W * 0.7; px += 2) put(S, px, B - 5, [196, 170, 120]);
            }) }),
            keepers_table: (b) => ({ y: b.y1 + 0.5, draw: () => tall(L, [b.x0 * C - 4, b.y0 * C - 40, (b.x1 + 1) * C + 4, (b.y1 + 1) * C + 6], 0, false, (S) => {
                const X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 4, W = X1 - X0;
                shadow(S, X0 + W / 2 + 3, B + 1, W / 2 + 2, 4, 0.45);
                const t = shape(); box(t, S, X0, B - 20, W, 8, 0.3); fill(S, t, NP.oak.slice(2), { tex: 0.3, seed, outline: NP.oak[0] });
                for (const px of [X0 + 3, X1 - 6]) rectFill(S, px, B - 12, 3, 12, NP.oak[1]);
                rectFill(S, X0 + W / 2 - 4, B - 34, 9, 13, PAL.iron[1]); rectFill(S, X0 + W / 2 - 2, B - 32, 5, 8, NP.glow[4]); rectFill(S, X0 + W / 2 - 3, B - 36, 7, 2, PAL.iron[3]);
                flames.push({ x: X0 + W / 2, y: B - 28 }); glows.push({ x: X0 + W / 2, y: B - 24, r: 60, a: 0.6 });
                for (let k = 0; k < 10; k++) put(S, X0 + 6 + k * 1.5, B - 21, [214, 194, 150]);                                       // the notched stick
            }) })
        };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = N(x, y), cx = x * C + 16, gy = y * C + 28, k = `${x},${y}`;
            if (BLOCKS[n]) { if (seen.has(k)) continue; const b = blockOf(map, nameAt, x, y, new Set([n]), seen); items.push({ x, ...BLOCKS[n](b) }); continue; }
            const P = {
                barrow_wall: () => { if (nearOpen(x, y)) hallWall(L, x, y, N, seed); },
                chair: () => tall(L, [cx - 16, gy - 50, cx + 16, gy + 6], 0, false, (S) => { chair(S, cx, gy, seed + x); const f = shape(); ellipse(f, S, cx, gy - 18, 11, 4); fill(S, f, NP.wool.slice(3), { outline: NP.wool[1] }); }),
                brazier: () => tall(L, [cx - 16, gy - 70, cx + 16, gy + 6], 0, false, (S) => { if (N(x, y + 1) === 'brazier') return; RK.blocks(S, cx - 12, gy - 26, 24, 26, seed + x, DRESSED.slice(2)); knot(S, cx - 6, gy - 24, 12, 20, seed + x, DRESSED); brazier(S, cx, gy - 24, seed + x, FX); }),
                candles: () => tall(L, [cx - 16, gy - 30, cx + 16, gy + 6], 0, false, (S) => { for (let k = 0; k < 4; k++) candle(S, cx - 9 + k * 6, gy - (k % 2) * 3, 6 + ((k * 7) % 3) * 3); }),
                vase: () => tall(L, [cx - 16, gy - 50, cx + 16, gy + 6], 0, false, (S) => {
                    shadow(S, cx + 3, gy + 1, 9, 3, 0.5);
                    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.22; const sx = cx, sy = gy - 16; for (let j = 0; j < 22; j++) { const px = sx + Math.cos(a) * j, py = sy + Math.sin(a) * j; put(S, px, py, NP.oak[2]); if (j > 6 && j % 3 === 0) { put(S, px + 1, py, [236, 230, 210]); put(S, px - 1, py, [210, 200, 176]); } } }   // pussy willow
                    const v = shape(); ellipse(v, S, cx, gy - 8, 8, 9); box(v, S, cx - 4, gy - 20, 8, 5); fill(S, v, NP.bronze.slice(1).map((c) => [c[0] + 60, c[1] + 34, c[2]]), { tex: 0.3, seed: seed + x, outline: [40, 28, 12] });
                }),
                basket: () => { shadow(img, cx + 3, gy + 1, 9, 3, 0.45); const bk = shape(); ellipse(bk, img, cx, gy - 8, 10, 9); fill(img, bk, PAL.straw, { tex: 0.7, seed, outline: NP.oak[0] }); for (let py = gy - 16; py < gy; py += 3) for (let px = cx - 9; px < cx + 9; px++) if (alphaAt(img, px, py)) put(img, px, py, PAL.straw[0], 0.5); },
                barrel: () => barrel(L, cx, gy, seed + x * 3 + y)
            }[n];
            if (P) items.push({ x, y: y + (n === 'barrow_wall' ? 0.95 : 0.5), draw: P });
        }
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const it of items) it.draw();
        // The back wall: knotwork panels behind the dais, two red banners, and lanterns on the vestibule walls.
        const frieze = (x0, x1, y0, h) => { for (let px = x0; px < x1; px++) for (let py = y0; py < y0 + h; py++) put(img, px, py, pick(DRESSED, 0.45 + (vnoise(px / 5, py / 5, seed + 30) - 0.5) * 0.2)); for (let px = x0 + 4; px < x1 - 30; px += 40) knot(img, px, y0 + 3, 34, h - 6, seed + px, DRESSED); };
        frieze(18 * C, 30 * C, 1 * C + 4, 2 * C - 8);
        frieze(5 * C + 8, 10 * C - 8, 3 * C + 10, C + 8); frieze(38 * C + 8, 43 * C - 8, 3 * C + 10, C + 8);
        for (const bx of [13.5, 33.5]) { clothBanner(img, Math.round(bx * C - 12), 1 * C - 6, 24, 3 * C - 4, seed + bx, NP.madder); for (let py = C; py < 3 * C; py += 8) for (let px = Math.round(bx * C - 6); px < bx * C + 6; px += 3) put(img, px + ((py >> 3) & 1) * 2, py, [206, 176, 120], 0.6); }
        for (const lx of [21, 26]) { const px = lx * C + 16, py = 21 * C - 2; rectFill(img, px - 4, py - 12, 9, 14, PAL.iron[1]); rectFill(img, px - 2, py - 10, 5, 9, NP.glow[4]); rectFill(img, px - 5, py - 14, 11, 2, PAL.iron[3]); flames.push({ x: px, y: py - 6 }); glows.push({ x: px, y: py, r: 70, a: 0.65 }); }
        for (const py of [28, 30]) for (const px of [22 * C - 2, 26 * C + 1]) { rectFill(img, px - 1, py * C, 3, 6, PAL.iron[1]); rectFill(img, px - 1, py * C - 3, 3, 3, NP.glow[4]); flames.push({ x: px, y: py * C - 2 }); glows.push({ x: px, y: py * C + 6, r: 36, a: 0.5 }); }
        // Firelight: dark toward the walls, warm wherever a flame is.
        for (const im of [img, L.over]) { const d = im.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = d[i] * 0.74 + 3; d[i + 1] = d[i + 1] * 0.72 + 2; d[i + 2] = d[i + 2] * 0.74 + 3; } }
        for (const g of glows) {
            const r = g.r, a = g.a == null ? 0.5 : g.a;
            for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
                const x = Math.round(g.x) + xx, y = Math.round(g.y) + yy, dd = Math.hypot(xx, yy) / r;
                if (dd >= 1 || x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
                const w = (1 - dd) * (1 - dd) * a;
                for (const im of [img, L.over]) { const i = (y * im.w + x) * 4, d = im.data; if (!d[i + 3]) continue; for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] + WARM[j] * w * 0.5 + (WARM[j] - d[i + j]) * w * 0.2); }
            }
        }
        return { w: img.w, h: img.h, base: img.data, over: L.over.data, water: [], animate: animator(flames, smoke) };
    }
    /** A wall cell of the barrow hall: facing the room, a face of dressed blocks with a coping; elsewhere, its top. */
    function hallWall(L, x, y, N, seed) {
        const img = L.base, X0 = x * C, Y0 = y * C, wall = (a, b) => { const n = N(a, b); return n === 'barrow_wall' || n === null; };
        if (!wall(x, y + 1)) {
            tall(L, [X0 - 2, Y0 - 20, X0 + C + 2, Y0 + C + 2], Y0 + C, false, (S) => {
                RK.blocks(S, X0, Y0 - 14, C, C + 14, seed + x * 3 + y, DRESSED.slice(1));
                for (let px = X0; px < X0 + C; px++) { put(S, px, Y0 - 15, DRESSED[8]); put(S, px, Y0 - 14, DRESSED[6]); put(S, px, Y0 + C - 1, DRESSED[0]); }
            });
            for (let px = X0; px < X0 + C; px++) for (let k = 0; k < 6; k++) put(img, px, Y0 + C + k, NP.shadow, 0.5 - k * 0.08);
            return;
        }
        for (let py = Y0; py < Y0 + C; py++) for (let px = X0; px < X0 + C; px++) put(img, px, py, pick(DRESSED, 0.25 + (hash(px >> 3, py >> 3, seed + x) - 0.5) * 0.15 + (vnoise(px / 4, py / 4, seed) - 0.5) * 0.1));
        for (const [dx, dy, ex, ey] of [[-1, 0, 0, -1], [1, 0, C - 1, -1], [0, -1, -1, 0]]) if (!wall(x + dx, y + dy)) for (let k = 0; k < C; k++) { const px = ex < 0 ? X0 + k : X0 + ex, py = ey < 0 ? Y0 + k : Y0 + ey; put(img, px, py, DRESSED[7]); }
    }

    Object.assign(SA.scenes, { frostspine_pass: frostspinePass, skeldvik, stormtide_inn: stormtideInn, hrafnholm, hall_of_winter: hallOfWinter, gullstrand_coast: gullstrand, jarnmyr, silent_field: silentField, birkholt, runadal, bjarki_barrow: bjarkiBarrow, uplands, wolfbanner_camp: wolfbannerCamp, hallvard_barrow: hallvardBarrow });
    if (isNode) module.exports = { frostspine_pass: frostspinePass, skeldvik, stormtide_inn: stormtideInn, hrafnholm, hall_of_winter: hallOfWinter, gullstrand_coast: gullstrand, jarnmyr, silent_field: silentField, birkholt, runadal, bjarki_barrow: bjarkiBarrow };
})(typeof window !== 'undefined' ? window : globalThis);
