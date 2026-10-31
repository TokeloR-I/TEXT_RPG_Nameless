/* =========================================================================
 * Enso's Last Stand — SCENE ART: SHAMEFIELD (original, drawn by code; Saffron/Quill)
 * Paints the Shamefield village square whole, after Tokelo's reference (2026-10-31): a dark autumn town on a
 * shelf between cliffs. A dead tree with a raven banner stands on a stone ring in the cobbled square; the
 * church with its bell tower and red windows to the north-east; the watermill on the river and its two falls to
 * the west, a plank bridge to the south-west; a stair up the cliff to the north; the south gate between raven
 * banners and torches; the well, the market stall, the notice board, a fenced crop field with hens, ruins on the
 * ledge, red-leaved trees.
 *
 * Adds the 'shamefield' scene to ENSO.sceneArt (ui/scene-art.js) and reuses its painting kit. The map's tiles
 * (legend in src/world/chapter1-maps.js) still decide collision, exits and where each thing stands; the scene
 * paints what the tiles say is there. No image goes in: every pixel comes from shapes, noise and the palette
 * below (docs/art/ORIGINAL_ART_PLAN.md §0). Review: `node tools/preview-scene.js shamefield out.png 1`.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (!SA) return;
    const { C, hash, vnoise, fbm, R, PAL, Img, put, alphaAt, rectFill, shape, sset, ellipse, box, poly, thick, fill, shadow,
        tree, barrel, crate, cart, fence, well, blockOf, masonry, slates } = SA.kit;

    // The Shamefield palette: dusk autumn. Dark olive-brown grass, wet mud, grey-brown cobbles, slate-blue water,
    // red-brown shingles, near-black timber, blood-red leaves, warm window light and red church glass.
    const SP = {
        grass: R(['#17180f', '#1f2014', '#282818', '#32301c', '#3d3920', '#494325', '#564e2b']),
        dirt: R(['#1c1712', '#251e17', '#30271e', '#3b3025', '#473a2d', '#554536']),
        cobble: R(['#211f1c', '#2b2825', '#35322d', '#403c36', '#4c4740', '#5a544b', '#6a6358']),
        mortar: [20, 17, 13],
        water: R(['#0b151b', '#0f1d25', '#152833', '#1c3542', '#264656', '#365d70', '#5a8396']),
        foam: R(['#7b9aa5', '#a9c2c8', '#d4e2e2', '#eef5f2']),
        rock: R(['#111013', '#18171b', '#201f24', '#29282d', '#333137', '#3e3b40', '#4b4747', '#5a5552']),
        moss: R(['#1b2012', '#252b16', '#30371b', '#3c4320', '#4a5126']),
        red: R(['#220909', '#350e0d', '#4c1412', '#661b15', '#82241a', '#9d3220', '#b9482b']),
        bark: R(['#0d0a09', '#15110e', '#1e1813', '#282019', '#33291f', '#3f3327']),
        shingle: R(['#1b0c0a', '#2a120e', '#3c1913', '#502218', '#642b1e', '#783524', '#8c412b']),
        plank: R(['#100b08', '#18110c', '#221811', '#2d2016', '#38291c', '#443223', '#513d2b']),
        glow: R(['#4d220c', '#8f4515', '#d07c26', '#f6b44c', '#ffe08f']),
        glass: R(['#2e0605', '#5a0f0a', '#911d14', '#cf3a25', '#ff7a4c']),
        clothRed: R(['#2c0a0a', '#4a100f', '#681814', '#86221a', '#a02f22']),
        clothPale: R(['#4f483e', '#6f6656', '#8f8670', '#b2a98e', '#d0c8ac']),
        stone: R(['#19181c', '#232227', '#2d2c31', '#38363b', '#444146', '#524e50', '#625d5b']),
        bronze: R(['#2a1c0c', '#4a3315', '#6e4d1f', '#93692b', '#b8883c']),
        crop: R(['#0f1a0d', '#152412', '#1d3216', '#27411b', '#33521f', '#426624']),
        hen: R(['#6d675c', '#9a9284', '#c4bcaa', '#e6e0cf']),
        shadow: [5, 6, 10]
    };
    const pick = (ramp, t) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))];

    // ---------------------------------------------------------------------
    // Ground: grass, mud, cobbles, water and the two falls, decided per pixel from smoothed fields over the cells.
    // ---------------------------------------------------------------------
    const WET = { water: 1, waterfall: 1, mill_wheel: 1, bridge: 1 };
    const DIRTY = { dirt_path: 1, stone_stairs: 0.8, hen_hut: 0.6, chickens: 0.55, crops: 1, cart: 0.5 };
    const BUILT = new Set(['house', 'slate_house', 'watermill', 'church']);
    const SOLIDISH = new Set(['cliff', 'ruin', 'water', 'waterfall', 'mill_wheel', 'tree', ...BUILT]);
    function field(cells, cw, ch) {
        return (px, py) => {
            const fx = px / C - 0.5, fy = py / C - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
            const v = (x, y) => cells[Math.max(0, Math.min(ch - 1, y)) * cw + Math.max(0, Math.min(cw - 1, x))];
            return (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty;
        };
    }

    function ground(img, map, nameAt, cw, ch, seed) {
        const cobC = new Float32Array(cw * ch), dirtC = new Float32Array(cw * ch), wetC = new Float32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), i = y * cw + x;
            wetC[i] = WET[n] || 0;
            dirtC[i] = DIRTY[n] || (BUILT.has(n) ? 0.65 : 0);
            if (n === 'cobble') cobC[i] = 1;
            else if (!SOLIDISH.has(n) && n !== 'grass' && n !== 'dirt_path') {
                // A thing standing in the square sits on the cobbles round it.
                const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => nameAt(map, x + dx, y + dy) === 'cobble').length;
                cobC[i] = around >= 2 ? 1 : around * 0.35;
            }
        }
        const cob = field(cobC, cw, ch), dirt = field(dirtC, cw, ch), wet = field(wetC, cw, ch);
        const kind = new Uint8Array(img.w * img.h);               // 0 grass, 1 mud, 2 cobble, 3 water, 4 falls
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, cell = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            const n1 = fbm(x / 20, y / 20, seed + 1), n2 = vnoise(x / 5, y / 5, seed + 2);
            if (cell === 'waterfall') { kind[i] = 4; continue; }
            if (WET[cell] && wet(x, y) + (n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.08 > 0.45) { kind[i] = 3; continue; }
            const c = cob(x, y) + (n1 - 0.5) * 0.55 + (n2 - 0.5) * 0.14;
            if (c > 0.5) { kind[i] = fbm(x / 26, y / 26, seed + 4) + (vnoise(x / 7, y / 7, seed + 5) - 0.5) * 0.12 > 0.6 ? 1 : 2; continue; }
            const d = dirt(x, y) + Math.max(0, c) * 0.5 + (n1 - 0.5) * 0.5 + (n2 - 0.5) * 0.12;
            kind[i] = d > 0.5 ? 1 : 0;
        }
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x, k = kind[i];
            if (k === 0) {                                         // grass: dark, patchy, worn toward the mud
                const big = fbm(x / 30, y / 30, seed + 3), mid = vnoise(x / 5, y / 5, seed + 4), fine = hash(x, y, seed + 5);
                let t = big * 0.5 + mid * 0.35 + fine * 0.2;
                if (kind[i - 1] === 1 || kind[i + 1] === 1 || kind[i - img.w] === 1 || kind[i + img.w] === 1) t -= 0.25;
                put(img, x, y, pick(SP.grass, t * 0.95));
            } else if (k === 1) {                                  // mud: mottled, darker at the rims
                let t = fbm(x / 9, y / 9, seed + 7) * 0.7 + hash(x, y, seed + 8) * 0.25;
                for (let r = 1; r <= 2; r++) if (kind[i - r] === 0 || kind[i + r] === 0 || kind[i - r * img.w] === 0 || kind[i + r * img.w] === 0) t -= 0.12;
                put(img, x, y, pick(SP.dirt, t));
            } else if (k === 2) {                                  // cobbles: rounded stones, irregular, mud between
                const gx = Math.floor(x / 6), gy = Math.floor(y / 5);
                let d1 = 1e9, d2 = 1e9, id = 0, cxs = 0, cys = 0;
                for (let j = -1; j <= 1; j++) for (let i2 = -1; i2 <= 1; i2++) {
                    const ax = gx + i2, ay = gy + j;
                    const px = ax * 6 + 1 + hash(ax, ay, seed + 10) * 4, py = ay * 5 + 1 + hash(ay, ax, seed + 11) * 3;
                    const d = ((x + 0.5 - px) / 1.15) ** 2 + (y + 0.5 - py) ** 2;
                    if (d < d1) { d2 = d1; d1 = d; id = ax * 7919 + ay; cxs = px; cys = py; } else if (d < d2) d2 = d;
                }
                const edge = Math.sqrt(d2) - Math.sqrt(d1);
                if (edge < 0.9) { put(img, x, y, hash(x, y, seed + 9) < 0.1 ? SP.moss[1] : hash(x, y, seed + 19) < 0.5 ? SP.mortar : SP.dirt[1]); continue; }
                let t = 0.3 + hash(id, 3, seed) * 0.26 - (fbm(x / 34, y / 34, seed + 12) - 0.5) * 0.4;
                t += ((cxs - x) * 0.6 + (cys - y) * 0.8) * 0.045;               // lit from the top left
                if (edge < 1.6) t -= 0.08;
                if (kind[i - 2] === 1 || kind[i + 2] === 1 || kind[i - 2 * img.w] === 1 || kind[i + 2 * img.w] === 1) t -= 0.15;
                put(img, x, y, pick(SP.cobble, t));
            } else if (k === 3) {                                  // water: darker away from the bank, streaks with the current
                let near = 0;
                for (let r = 1; r <= 7; r++) if (kind[i - r * img.w] < 3 || kind[i + r * img.w] < 3 || kind[i - r] < 3 || kind[i + r] < 3) { near = 8 - r; break; }
                let t = 0.22 + near * 0.06 + (fbm(x / 22, y / 10, seed + 12) - 0.5) * 0.35;
                if (vnoise(x / 1.6, y / 9, seed + 13) > 0.76) t += 0.32;
                if (hash(x, y, seed + 21) < 0.012) t += 0.5;
                put(img, x, y, pick(SP.water, t));
            } else {                                               // falls: white water in long vertical strands
                const s = vnoise(x / 2.2, y / 14 - x * 0.05, seed + 14), s2 = vnoise(x / 5, y / 6, seed + 15), band = vnoise(x / 7, 0, seed + 16);
                const t = s * 0.65 + s2 * 0.35 + (band - 0.5) * 0.4;
                put(img, x, y, t > 0.8 ? SP.foam[3] : t > 0.68 ? SP.foam[2] : t > 0.56 ? SP.foam[1] : t > 0.46 ? SP.foam[0] : pick(SP.water, 0.4 + t * 0.6));
            }
        }
        // Foam where the falls hit the water, and on the stream round the mill wheel.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] !== 3) continue;
            let up = 0;
            for (let r = 1; r <= 12; r++) if (kind[i - r * img.w] === 4) { up = 13 - r; break; }
            if (up && hash(x, y, seed + 16) < up / 14) put(img, x, y, SP.foam[1 + (hash(x, y, seed + 17) < 0.4 ? 1 : 0)], 0.85);
        }
        // Rocky sides and lip on the falls.
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
            const i = y * img.w + x;
            if (kind[i] !== 4) continue;
            const l = x > 0 && kind[i - 1] !== 4, r = x < img.w - 1 && kind[i + 1] !== 4, top = y > 0 && kind[i - img.w] !== 4 && kind[i - img.w] !== 3;
            const wl = 3 + Math.floor(vnoise(x, y / 6, seed + 18) * 4);
            for (let k = 0; k < wl; k++) {
                if (l) put(img, x + k, y, pick(SP.rock, 0.55 - k * 0.08 + (hash(x + k, y >> 2, seed) - 0.5) * 0.2));
                if (r) put(img, x - k, y, pick(SP.rock, 0.3 - k * 0.04 + (hash(x - k, y >> 2, seed) - 0.5) * 0.2));
            }
            if (top) for (let k = 0; k < 4; k++) put(img, x, y + k, k < 2 ? pick(SP.rock, 0.5) : SP.foam[2]);
        }
        // Wet banks: a dark rim on the land side of the water, and stones along it.
        for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
            const i = y * img.w + x;
            if (kind[i] >= 3) continue;
            if (kind[i + 1] === 3 || kind[i - 1] === 3 || kind[i + img.w] === 3 || kind[i + 2] === 3 || kind[i - 2] === 3) put(img, x, y, SP.dirt[0], 0.7);
            else if (kind[i - img.w] === 3) put(img, x, y, SP.water[1], 0.5);
        }
        // Stones along the banks, breaking the line between land and water.
        for (let n = 0; n < 900; n++) {
            const x = Math.floor(hash(n, 30, seed) * img.w), y = Math.floor(hash(n, 31, seed) * img.h), i = y * img.w + x;
            if (kind[i] !== 3) continue;
            const land = [[-4, 0], [4, 0], [0, -4], [0, 4]].some(([dx, dy]) => { const k = kind[i + dy * img.w + dx]; return k !== undefined && k < 3; });
            if (!land) continue;
            const st = shape(); ellipse(st, img, x, y, 2.5 + hash(n, 32, seed) * 3.5, 2 + hash(n, 33, seed) * 2);
            fill(img, st, SP.rock.slice(1), { tex: 0.4, seed: seed + n, outline: SP.rock[0] });
            for (const [p] of st.px) if (hash(p, 1, seed) < 0.3) put(img, p % img.w, (p / img.w) | 0, SP.moss[2]);
        }
        return kind;
    }

    /** Small things on the ground: tufts, fallen red leaves, pebbles, puddles. */
    function details(img, kind, map, nameAt, seed) {
        const N = (img.w * img.h) / 40;
        for (let n = 0; n < N; n++) {
            const x = Math.floor(hash(n, 7, seed) * img.w), y = Math.floor(hash(n, 8, seed) * img.h), k = kind[y * img.w + x];
            const r = hash(n, 9, seed);
            if (k === 0 && r < 0.6) {                              // a tuft
                const h = 2 + Math.floor(hash(n, 10, seed) * 3), lt = SP.grass[6], md = SP.grass[4];
                for (let b = -1; b <= 1; b++) for (let j = 0; j < h - Math.abs(b); j++) put(img, x + b + (j === h - 1 - Math.abs(b) ? b : 0), y - j, j === h - 1 - Math.abs(b) ? lt : md);
                put(img, x, y + 1, SP.grass[0]);
            } else if ((k === 0 || k === 1 || (k === 2 && r < 0.66)) && r < 0.82) { // a fallen leaf
                const c = pick(SP.red, 0.45 + hash(n, 11, seed) * 0.55);
                put(img, x, y, c); put(img, x + 1, y, c); if (hash(n, 12, seed) < 0.5) put(img, x, y + 1, SP.red[2]);
            } else if (k === 2 && r < 0.9) {                       // a loose stone
                put(img, x, y, SP.cobble[6]); put(img, x + 1, y, SP.cobble[4]); put(img, x, y + 1, SP.mortar);
            }
        }
        // Puddles on the mud and between the cobbles, holding a little of the sky.
        for (let n = 0; n < 70; n++) {
            const x = Math.floor(hash(n, 20, seed) * img.w), y = Math.floor(hash(n, 21, seed) * img.h), k = kind[y * img.w + x];
            if (k !== 1 && k !== 2) continue;
            const cell = nameAt(map, Math.floor(x / C), Math.floor(y / C));
            if (cell !== 'cobble' && cell !== 'dirt_path') continue;
            const s = shape(); ellipse(s, img, x, y, 5 + hash(n, 22, seed) * 7, 2 + hash(n, 23, seed) * 2.2);
            for (const p of [...s.px.keys()]) { const px = p % img.w, py = (p / img.w) | 0; if (kind[p] !== 1 && kind[p] !== 2) s.px.delete(p); else s.px.set(p, vnoise(px / 3, py, seed + n) > 0.72 ? 1 : 0); }
            for (const [p, v] of s.px) { const px = p % img.w, py = (p / img.w) | 0; put(img, px, py, v ? SP.water[6] : SP.water[3]); if (!s.px.has(p - img.w)) put(img, px, py, SP.dirt[0]); }
        }
    }

    // ---------------------------------------------------------------------
    // Cliffs, ruins, stairs, the bridge, crops
    // ---------------------------------------------------------------------
    const CLIFFY = new Set(['cliff', 'ruin']);
    /** Rock in tall columns: every cliff face in the village shares the same columns, so faces line up. */
    function columns(w, seed) {
        const at = new Int16Array(w), start = new Int16Array(w), width = new Uint8Array(w);
        let x = 0, k = 0;
        while (x < w) { const cw = 6 + Math.floor(hash(k, 0, seed) * 6); for (let i = 0; i < cw && x + i < w; i++) { at[x + i] = k; start[x + i] = x; width[x + i] = cw; } x += cw; k++; }
        return { at, start, width };
    }
    function rockFace(img, cols, x0, y0, w, h, seed, dark = 0) {
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
            const ci = cols.at[x], u = x - cols.start[x], cw = cols.width[x];
            const period = 9 + Math.floor(hash(ci, 1, seed) * 7), crack = (y + Math.floor(hash(ci, 2, seed) * period)) % period;
            let t = 0.5 + (hash(ci, 3, seed) - 0.5) * 0.25 + (vnoise(x / 3, y / 7, seed + 4) - 0.5) * 0.25 - dark;
            if (u === 0) t += 0.24; else if (u === 1) t += 0.12; else if (u === cw - 1) t = 0.08; else if (u === cw - 2) t -= 0.16;
            if (crack === 0) t = 0.06; else if (crack === 1) t += 0.12;
            put(img, x, y, pick(SP.rock, t));
            if (u > 0 && u < cw - 2 && vnoise(x / 3, y / 3, seed + 9) > 0.8) put(img, x, y, SP.moss[2]);
        }
    }
    function ledgeTop(img, x0, y0, w, h, seed) {
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
            const t = fbm(x / 10, y / 10, seed) * 0.7 + hash(x, y, seed + 1) * 0.3;
            put(img, x, y, t > 0.62 ? pick(SP.moss, (t - 0.62) * 2.6) : pick(SP.grass, t * 0.8));
        }
        for (let n = 0; n < 3; n++) {                              // rocks breaking through
            const s = shape(), sx = x0 + hash(n, x0, seed) * w, sy = y0 + 6 + hash(n, y0, seed) * (h - 8);
            if (hash(n, x0 + y0, seed + 2) < 0.5) continue;
            ellipse(s, img, sx, sy, 3 + hash(n, 3, seed) * 4, 2 + hash(n, 4, seed) * 2);
            fill(img, s, SP.rock.slice(2), { tex: 0.4, seed: seed + n, outline: SP.rock[0] });
        }
    }
    function cliff(L, cols, map, nameAt, x, y, ch, seed) {
        const x0 = x * C, y0 = y * C, img = L.base;
        const cl = (dx, dy) => CLIFFY.has(nameAt(map, x + dx, y + dy)) || nameAt(map, x + dx, y + dy) === null;
        if (y < ch / 2) {                                          // a ledge above the village: its face looks south
            if (!cl(0, 1)) {
                ledgeTop(img, x0, y0, C, 10, seed + x * 7 + y);
                rockFace(img, cols, x0, y0 + 10, C, C - 10, seed);
                for (let px = x0; px < x0 + C; px++) {             // the grass lip and hanging roots
                    const d = Math.floor(vnoise(px / 3, y, seed + 5) * 4);
                    for (let j = 0; j < d; j++) put(img, px, y0 + 10 + j, SP.moss[1 + (j % 2)]);
                    if (hash(px, y, seed + 6) < 0.08) for (let j = 0; j < 4 + hash(px, y, seed + 7) * 10; j++) put(img, px, y0 + 12 + j, SP.moss[1]);
                    put(img, px, y0 + C - 1, SP.shadow, 0.5);
                }
            } else ledgeTop(img, x0, y0, C, C, seed + x * 7 + y);
        } else {                                                   // a drop below the village: its face looks south too
            let depth = 0;
            for (let k = 1; k <= 3 && cl(0, -k); k++) depth = k;
            rockFace(img, cols, x0, y0, C, C, seed + 30, 0.1 + depth * 0.1);
            if (!cl(0, -1)) for (let px = x0; px < x0 + C; px++) {  // the lip where the village ground ends
                const d = 3 + Math.floor(vnoise(px / 4, y, seed + 8) * 4);
                for (let j = 0; j < d; j++) put(img, px, y0 + j, j === d - 1 ? SP.moss[0] : pick(SP.grass, 0.35 + j * 0.08));
                if (hash(px, y, seed + 9) < 0.06) for (let j = 0; j < 3 + hash(px, y, seed) * 7; j++) put(img, px, y0 + d + j, SP.moss[1]);
            }
            if (!cl(-1, 0)) for (let py = y0; py < y0 + C; py++) put(img, x0, py, SP.shadow, 0.4);
            for (let py = y0; py < y0 + C; py++) for (let px = x0; px < x0 + C; px++) put(img, px, py, SP.shadow, depth * 0.1 + ((py - y0) / C) * 0.08 + (vnoise(px / 9, py / 9, seed + 31) - 0.5) * 0.1);
        }
    }

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

    /** A ruined wall: masonry cut along a ragged top, with openings. */
    function ruinWall(img, x, y, w, h, seed, { arch = null } = {}) {
        const tmp = Img(w, h);
        masonry(tmp, 0, 0, w, h, seed, SP.stone);
        const top = (i) => Math.floor((fbm(i / 9, 0, seed) * 0.8 + hash(i >> 2, 1, seed) * 0.35) * h * 0.55);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            if (j < top(i)) continue;
            if (arch) {
                const ax = i - arch.x, ay = j - arch.y;
                const inside = ax >= 0 && ax < arch.w && ay < arch.h && (ay >= arch.w / 2 || (ax - arch.w / 2) ** 2 + (ay - arch.w / 2) ** 2 <= (arch.w / 2) ** 2) && ay >= 0;
                if (inside) { put(img, x + i, y + j, ay > arch.h - 3 ? SP.stone[1] : [10, 10, 12]); continue; }
            }
            const k = (j * w + i) * 4;
            put(img, x + i, y + j, [tmp.data[k], tmp.data[k + 1], tmp.data[k + 2]]);
            if (j === top(i)) put(img, x + i, y + j, SP.stone[5]);
            if (j > top(i) && j < top(i) + 3 && vnoise((x + i) / 3, (y + j) / 3, seed) > 0.55) put(img, x + i, y + j, SP.moss[3]);
        }
        for (let j = 0; j < h; j++) { put(img, x - 1, y + j, SP.stone[0]); put(img, x + w, y + j, SP.shadow, 0.6); }
    }
    function ruins(L, b, seed) {
        const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C - 4, img = L.base;
        shadow(img, (X0 + X1) / 2, B + 1, (X1 - X0) / 2, 5, 0.4);
        ruinWall(img, X0 + 8, B - 54, 70, 54, seed, { arch: { x: 26, y: 16, w: 14, h: 26 } });
        ruinWall(img, X0 + 96, B - 34, 40, 34, seed + 1);
        ruinWall(img, X0 + 150, B - 60, 64, 60, seed + 2, { arch: { x: 22, y: 20, w: 16, h: 30 } });
        for (let n = 0; n < 16; n++) {                             // rubble
            const s = shape(); ellipse(s, img, X0 + hash(n, 1, seed) * (X1 - X0), B - 2 + hash(n, 2, seed) * 5, 2 + hash(n, 3, seed) * 4, 2 + hash(n, 4, seed) * 2);
            fill(img, s, SP.stone, { tex: 0.4, seed: seed + n, outline: SP.stone[0] });
        }
    }

    function stairs(L, map, nameAt, x, y, seed) {
        const x0 = x * C, y0 = y * C, img = L.base;
        const isS = (dx, dy) => nameAt(map, x + dx, y + dy) === 'stone_stairs';
        for (let py = y0; py < y0 + C; py++) for (let px = x0; px < x0 + C; px++) {
            const v = (py - y0) % 8;
            let t = v === 0 ? 0.85 : v < 3 ? 0.62 : 0.32 - (v - 3) * 0.04;
            t += (vnoise(px / 4, py / 3, seed) - 0.5) * 0.18 + (hash(Math.floor(px / 9), Math.floor(py / 8), seed) - 0.5) * 0.15;
            if (v > 0 && v < 3 && (px - x0 + Math.floor(py / 8) * 4) % 11 === 0) t = 0.3;
            put(img, px, py, pick(SP.stone, t));
        }
        if (!isS(-1, 0)) { const s = shape(); box(s, img, x0, y0, 4, C, 0.5); fill(img, s, SP.stone, { tex: 0.4, seed, outline: SP.stone[0] }); }
        if (!isS(1, 0)) { const s = shape(); box(s, img, x0 + C - 4, y0, 4, C, -0.4); fill(img, s, SP.stone, { tex: 0.4, seed, outline: SP.stone[0] }); }
        // The orchard gate at the top of the north stair: two posts and a lintel, a chain hanging across.
        if (y === 0 && !isS(0, -1) && isS(0, 1)) {
            for (const px of [x0 - 6, x0 + C - 2]) { const s = shape(); box(s, img, px, y0, 8, 26, 0); for (const [i] of s.px) s.px.set(i, (((i % img.w) - px - 4) / 4) * -0.6); fill(img, s, SP.plank, { tex: 0.4, seed, outline: SP.plank[0] }); }
            const l = shape(); box(l, img, x0 - 8, y0, C + 16, 5, 0.4); fill(img, l, SP.plank, { tex: 0.4, seed, outline: SP.plank[0] });
            for (let i = 0; i <= C; i += 2) put(img, x0 + i, y0 + 16 + Math.round(Math.sin((i / C) * Math.PI) * 5), PAL.iron[(i / 2) % 2 ? 2 : 4]);
        }
    }

    function bridge(L, map, nameAt, x, y, seed) {
        const x0 = x * C, y0 = y * C, img = L.base;
        shadow(img, x0 + 16, y0 + C + 4, 18, 4, 0.5);
        for (let px = x0; px < x0 + C; px += 5) {                  // deck planks, across the stream
            const s = shape(); box(s, img, px, y0 + 4, 4, C - 6, 0);
            for (const [i] of s.px) s.px.set(i, (vnoise(px, ((i / img.w) | 0) / 6, seed) - 0.5) * 0.9 + (hash(px, y, seed) - 0.5) * 0.4);
            fill(img, s, SP.plank.slice(1), { outline: SP.plank[0], edge: false });
            if (hash(px, x, seed + 1) < 0.1) rectFill(img, px + 1, y0 + 12, 2, 4, SP.water[1]);
        }
        // Supports into the water, then the rails and posts.
        for (const px of [x0 + 2, x0 + 18]) { const s = shape(); box(s, img, px, y0 + C - 4, 5, 18, 0); fill(img, s, SP.plank, { tex: 0.4, seed: seed + px, outline: SP.plank[0] }); rectFill(img, px - 2, y0 + C + 12, 9, 2, SP.foam[0]); }
        for (const ry of [y0 + 1, y0 + C - 4]) { const s = shape(); box(s, img, x0, ry, C, 4, 0.3); fill(img, s, SP.plank.slice(1), { tex: 0.5, seed: seed + ry, scale: 2, outline: SP.plank[0] }); }
        const s = shape(); box(s, img, x0 + 13, y0 - 12, 5, 16, 0); box(s, img, x0 + 13, y0 + C - 14, 5, 16, 0); fill(img, s, SP.plank, { tex: 0.4, seed, outline: SP.plank[0] });
        const rail = shape(); box(rail, img, x0, y0 - 10, C, 3, 0.4); fill(img, rail, SP.plank.slice(2), { outline: SP.plank[0] });
    }

    function crops(L, x, y, seed) {
        const x0 = x * C, y0 = y * C, img = L.base;
        for (let py = y0; py < y0 + C; py++) for (let px = x0; px < x0 + C; px++) {
            const furrow = (px - x0) % 16;
            put(img, px, py, pick(SP.dirt, (furrow < 3 || furrow > 13 ? 0.15 : 0.45) + (hash(px, py, seed) - 0.5) * 0.2));
        }
        for (const cx of [x0 + 8, x0 + 24]) {                      // a row of bean poles, leaves climbing them
            const s = shape();
            for (let k = 0; k < 4; k++) {
                const ly = y0 + 2 + k * 8 + hash(cx, k + y, seed) * 3;
                ellipse(s, img, cx - 2, ly, 4, 3.2); ellipse(s, img, cx + 2, ly + 3, 4, 3.2);
            }
            for (const [i, v] of s.px) s.px.set(i, v * 0.6 + (vnoise((i % img.w) / 2, ((i / img.w) | 0) / 2, seed + cx) - 0.5) * 1.1);
            for (let py = y0; py < y0 + C; py++) put(img, cx, py, SP.plank[4]);
            fill(img, s, SP.crop, { outline: SP.crop[0] });
            for (let k = 0; k < 3; k++) put(img, cx - 2 + k * 2, y0 + 6 + k * 9, [150, 150, 90]);
        }
    }

    // ---------------------------------------------------------------------
    // Trees and banners
    // ---------------------------------------------------------------------
    /** A big bare tree: a gnarled trunk with root flares and limbs that split and thin out, all in dark bark. */
    function bareTree(img, x, gy, seed, s = 1) {
        const t = shape();
        thick(t, img, x, gy - 30 * s, x, gy, 4.2 * s);
        thick(t, img, x - 1, gy - 4, x - 10 * s, gy + 2, 2 * s); thick(t, img, x + 1, gy - 4, x + 10 * s, gy + 1, 2 * s); thick(t, img, x, gy - 3, x - 3, gy + 3, 1.8 * s);
        const limb = (ax, ay, a, len, w, depth) => {
            const bx = ax + Math.cos(a) * len, by = ay + Math.sin(a) * len;
            thick(t, img, ax, ay, bx, by, w);
            if (depth <= 0) return;
            const forks = depth > 2 ? 2 : 2 + (hash(ax | 0, ay | 0, seed) < 0.4 ? 1 : 0);
            for (let f = 0; f < forks; f++) {
                const da = (f - (forks - 1) / 2) * 0.75 + (hash(ax | 0, f + depth, seed) - 0.5) * 0.5;
                limb(bx, by, a + da, len * (0.62 + hash(f, depth, seed + (ax | 0)) * 0.18), Math.max(0.5, w * 0.62), depth - 1);
            }
        };
        const top = gy - 30 * s;
        limb(x, top + 6 * s, -Math.PI / 2 - 0.85, 18 * s, 2.6 * s, 3);
        limb(x, top + 2 * s, -Math.PI / 2 + 0.8, 19 * s, 2.6 * s, 3);
        limb(x, top, -Math.PI / 2 - 0.1, 16 * s, 2.4 * s, 3);
        limb(x, top + 12 * s, -Math.PI / 2 + 1.3, 14 * s, 1.8 * s, 2);
        for (const [i] of t.px) { const px = i % img.w, py = (i / img.w) | 0; t.px.set(i, t.px.get(i) * 0.8 + (vnoise(px / 2, py / 5, seed) - 0.5) * 0.7); }
        fill(img, t, SP.bark, { outline: SP.bark[0] });
    }
    const RAVEN = [
        '......##....',
        '.....####...',
        '.....###bb..',
        '....####....',
        '..#######...',
        '.#########..',
        '##########..',
        '#..#######..',
        '....#..#....',
        '...##.##....'
    ];
    function raven(img, x, y, colour = [10, 9, 12]) {
        RAVEN.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') put(img, x + i, y + j, colour); else if (ch === 'b') put(img, x + i, y + j, [60, 56, 52]); }));
    }
    /** A hanging banner: cloth with a border, a raven, a forked foot. */
    function banner(img, x, y, w, h, seed, ramp, border) {
        const s = shape();
        poly(s, img, [[x, y], [x + w, y], [x + w, y + h], [x + w / 2, y + h - 6], [x, y + h]], (px, py) => ((px - x) / w - 0.5) * -0.9 + Math.sin((py - y) / 5) * 0.15);
        fill(img, s, ramp, { tex: 0.3, seed, outline: [10, 6, 6] });
        for (const [i] of s.px) {
            const px = i % img.w, py = (i / img.w) | 0;
            if (!s.px.has(i - 2) || !s.px.has(i + 2) || !s.px.has(i - 2 * img.w)) put(img, px, py, border);
        }
        raven(img, Math.round(x + w / 2 - 6), Math.round(y + h / 2 - 8));
        for (let i = 0; i <= w; i++) put(img, x + i, y, SP.plank[2]);
    }
    function bannerPost(S, cx, gy, seed) {
        shadow(S, cx + 5, gy + 1, 9, 3, 0.4);
        const p = shape(); thick(p, S, cx, gy - 80, cx, gy, 1.8); thick(p, S, cx - 4, gy - 76, cx + 18, gy - 76, 1.2);
        fill(S, p, SP.plank, { tex: 0.4, seed, outline: SP.plank[0] });
        rectFill(S, cx - 1, gy - 84, 3, 4, PAL.iron[3]);
        banner(S, cx + 1, gy - 74, 17, 38, seed, SP.clothRed, SP.clothRed[0]);
    }
    function torch(S, cx, gy, seed) {
        shadow(S, cx + 3, gy + 1, 5, 2, 0.4);
        const p = shape(); thick(p, S, cx, gy - 36, cx, gy, 1.3); fill(S, p, SP.plank, { outline: SP.plank[0] });
        const cup = shape(); poly(cup, S, [[cx - 5, gy - 40], [cx + 5, gy - 40], [cx + 3, gy - 35], [cx - 3, gy - 35]], 0); fill(S, cup, PAL.iron, { outline: PAL.iron[0] });
        // The flame, and its glow on whatever is near.
        for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) { const d = Math.hypot(x, y); if (d < 10) put(S, cx + x, gy - 46 + y, SP.glow[3], (1 - d / 10) * 0.22); }
        const f = shape(); ellipse(f, S, cx, gy - 44, 3.2, 5); fill(S, f, SP.glow.slice(1), { edge: false });
        rectFill(S, cx - 1, gy - 45, 2, 3, SP.glow[4]);
    }

    // ---------------------------------------------------------------------
    // Buildings
    // ---------------------------------------------------------------------
    /** Roof covering in courses (wooden shingles or slates) over a polygon, ragged and patched with moss. */
    function shingles(img, pts, seed, ramp, { cw = 6, chh = 6, hole = () => false, moss = 0.72 } = {}) {
        const area = shape(); poly(area, img, pts, 0);
        const ys = pts.map((p) => p[1]), top = Math.min(...ys);
        for (const [i] of area.px) {
            const x = i % img.w, y = (i / img.w) | 0;
            if (hole(x, y)) { put(img, x, y, (x + y) % 9 ? [12, 9, 9] : [24, 16, 13]); continue; }
            const course = Math.floor((y - top) / chh), v = (y - top) % chh, off = (course % 2) * (cw >> 1) + Math.floor(hash(course, 0, seed) * 2);
            const col = Math.floor((x + off) / cw), u = (x + off) % cw;
            const hang = Math.floor(hash(col, course, seed + 1) * 3);
            let t = 0.42 + (hash(col, course, seed) - 0.5) * 0.4 + (v / chh) * 0.32;
            if (v < hang) t = 0.08;                                     // the shadow of the course above, ragged
            else if (u === cw - 1) t -= 0.22;
            if (hash(col, course, seed + 2) < 0.03) t = 0.06;          // a missing one
            put(img, x, y, pick(ramp, t));
            if (fbm(x / 9, y / 7, seed + 3) > moss && hash(x, y, seed) < 0.75) put(img, x, y, pick(SP.moss, (vnoise(x / 2, y / 2, seed) * 0.9)));
        }
        return area;
    }
    function planks(img, x, y, w, h, seed, ramp = SP.plank) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const b = Math.floor(i / 5), u = i % 5;
            let t = 0.35 + (hash(b, 0, seed) - 0.5) * 0.35 + (vnoise(x + i, (y + j) / 9, seed) - 0.5) * 0.3;
            if (u === 0) t = 0.05; else if (u === 1) t += 0.15;
            if (hash(b, Math.floor((y + j) / 13), seed + 1) < 0.08 && (y + j) % 13 === 0) t = 0.1;
            put(img, x + i, y + j, pick(ramp, t));
        }
    }
    function litWindow(img, x, y, w, h, seed, { dark = false, glass = SP.glow } = {}) {
        if (!dark) for (let j = -4; j < h + 4; j++) for (let i = -4; i < w + 4; i++) put(img, x + i, y + j, glass[2], 0.12);
        rectFill(img, x - 2, y - 2, w + 4, h + 4, SP.plank[0]);
        rectFill(img, x - 1, y - 1, w + 2, h + 2, SP.plank[3]);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const d = Math.hypot((i - w / 2) / w, (j - h * 0.6) / h);
            put(img, x + i, y + j, dark ? [12, 12, 16] : pick(glass, 0.98 - d * 1.5 + (hash(i, j, seed) - 0.5) * 0.15));
        }
        rectFill(img, x + Math.floor(w / 2) - 1, y, 2, h, SP.plank[1]); rectFill(img, x, y + Math.floor(h / 2) - 1, w, 2, SP.plank[1]);
        rectFill(img, x - 3, y + h + 1, w + 6, 2, SP.plank[4]);
        if (dark) { const s = shape(); thick(s, img, x - 3, y + 2, x + w + 3, y + h - 3, 1.3, 0.2); fill(img, s, SP.plank.slice(2), { outline: SP.plank[0] }); }
    }
    function door(img, x, y, w, h, seed) {
        rectFill(img, x - 3, y - 3, w + 6, h + 3, SP.plank[1]);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(img, x + i, y + j, pick(SP.plank, 0.3 + hash(Math.floor(i / 5), 0, seed) * 0.3 + (i % 5 === 0 ? -0.2 : 0)));
        rectFill(img, x, y + 6, w, 2, PAL.iron[1]); rectFill(img, x, y + h - 9, w, 2, PAL.iron[1]);
        put(img, x + w - 4, y + h / 2, PAL.iron[4]); put(img, x + w - 4, y + h / 2 + 1, PAL.iron[2]);
        const st = shape(); box(st, img, x - 5, y + h, w + 10, 4, 0.3); fill(img, st, SP.stone, { tex: 0.4, seed, outline: SP.stone[0] });
    }
    function chimney(img, x, top, h, seed, smoke) {
        masonry(img, x, top, 14, h, seed, SP.stone);
        rectFill(img, x - 2, top - 3, 18, 4, SP.stone[5]); rectFill(img, x - 2, top + 1, 18, 1, SP.stone[1]);
        for (let y = top; y < top + h; y++) { put(img, x - 1, y, SP.stone[0]); put(img, x + 14, y, SP.stone[0]); }
        rectFill(img, x + 3, top - 3, 8, 2, [8, 7, 8]);
        smoke.push({ x: x + 7, y: top - 4 });
    }

    /** A house: plank walls on a stone footing, lit windows, a door, and a steep roof of shingles or slates. */
    function house(L, b, seed, style, scene) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Y0 = b.y0 * C, B = (b.y1 + 1) * C, W = X1 - X0, H = B - Y0;
        const wallH = Math.max(26, Math.min(58, Math.round(H * 0.36))), wallTop = B - wallH;
        const roofTop = Y0 - 6, eave = wallTop + 5;
        shadow(img, X0 + W / 2 + 8, B + 2, W / 2 + 10, 7, 0.5);
        planks(img, X0 + 4, wallTop, W - 8, wallH - 5, seed);
        masonry(img, X0 + 3, B - 6, W - 6, 6, seed + 1, SP.stone);
        for (const px of [X0 + 3, X1 - 7]) { const s = shape(); box(s, img, px, wallTop, 4, wallH - 5, 0); fill(img, s, SP.plank.slice(1), { tex: 0.4, seed: seed + px, outline: SP.plank[0] }); }
        { const s = shape(); box(s, img, X0 + 3, wallTop, W - 6, 3, 0.3); fill(img, s, SP.plank.slice(1), { tex: 0.4, seed, outline: SP.plank[0] }); }
        // Door and windows along the front wall.
        const dw = W >= 120 ? 18 : 14, dh = Math.min(30, wallH - 12);
        const dx = Math.round(X0 + W * (hash(b.x0, b.y0, seed) < 0.5 ? 0.38 : 0.62) - dw / 2);
        door(img, dx, B - 6 - dh, dw, dh, seed + 2);
        const wy = wallTop + Math.max(6, Math.round((wallH - 18) / 2) - 2), ww = W >= 120 ? 14 : 12, wh = 12;
        const slots = Math.max(1, Math.floor(W / 52));
        for (let k = 0; k < slots; k++) {
            const wx = Math.round(X0 + ((k + 0.5) / slots) * W - ww / 2);
            if (wx + ww > dx - 6 && wx < dx + dw + 6) continue;
            litWindow(img, wx, wy, ww, wh, seed + k, { dark: hash(k, b.x0, seed + 3) < 0.2 });
        }
        // Roof: a hipped slope seen from the front, ragged eaves, a ridge, holes in the old ones.
        const ramp = style === 'slate' ? null : SP.shingle;
        const pts = [[X0 - 8, eave], [X1 + 8, eave], [X1 - 6, roofTop + 10], [X0 + 6, roofTop + 10]];
        const holed = hash(b.x0, b.y1, seed + 4) < 0.45;
        const hx = X0 + W * (0.55 + hash(b.x1, 1, seed) * 0.2), hy = roofTop + (eave - roofTop) * 0.45;
        const hole = holed ? (x, y) => ((x - hx) / 18) ** 2 + ((y - hy) / 11) ** 2 < 1 && fbm(x / 6, y / 6, seed + 5) > 0.35 : () => false;
        if (ramp) shingles(img, pts, seed + 6, ramp, { hole });
        else slates(img, pts, seed + 6, hole, -0.08);
        if (holed) for (let k = 0; k < 3; k++) { const s = shape(); thick(s, img, hx - 14 + k * 11, hy + 9, hx - 8 + k * 11, hy - 9, 1.2); fill(img, s, SP.plank.slice(1), { outline: SP.plank[0] }); }
        const ridge = shape(); box(ridge, img, X0 + 6, roofTop + 7, W - 12, 4, 0.4); fill(img, ridge, ramp ? SP.shingle.slice(2) : PAL.slate.slice(1), { tex: 0.4, seed, outline: [8, 6, 6] });
        for (let x = X0 - 8; x < X1 + 8; x++) {                    // ragged eave, dripping over the wall
            const d = 1 + Math.floor(hash(x >> 1, b.y1, seed + 7) * 4);
            for (let j = 0; j < d; j++) put(img, x, eave + j, j === d - 1 ? [8, 6, 6] : ramp ? SP.shingle[2] : PAL.slate[1]);
            put(img, x, eave + d, SP.shadow, 0.55);
        }
        for (let y = roofTop + 10; y < eave; y++) {                // the hip edges
            const f = (y - roofTop - 10) / (eave - roofTop - 10);
            put(img, Math.round(X0 + 6 - 14 * f), y, [8, 6, 6]); put(img, Math.round(X1 - 6 + 14 * f), y, [8, 6, 6]);
        }
        // A dormer on the bigger houses, a chimney with smoke on most.
        if (W >= 150) {
            const cx = X0 + W * 0.3, by = eave - 14, s = shape();
            poly(s, img, [[cx - 18, by], [cx, by - 22], [cx + 18, by]], (px) => (px < cx ? 0.4 : -0.3));
            if (ramp) fill(img, s, SP.shingle, { tex: 0.5, seed, scale: 2, outline: [8, 6, 6] }); else fill(img, s, PAL.slate, { tex: 0.5, seed, scale: 2, outline: PAL.slate[0] });
            rectFill(img, cx - 9, by - 2, 18, 10, SP.plank[2]);
            litWindow(img, cx - 5, by - 1, 10, 8, seed + 9);
        }
        if (hash(b.x0, b.y0, seed + 8) < 0.8) chimney(img, Math.round(X0 + W * (0.7 + hash(b.x0, 2, seed) * 0.12)), roofTop + 4, Math.max(16, Math.round((eave - roofTop) * 0.5)), seed + 10, scene.smoke);
        scene.windows.push({ x: dx + dw / 2, y: B - 10 });
    }

    function watermill(L, b, seed, scene) {
        house(L, b, seed, 'shingle', scene);
    }
    function millWheel(L, b, seed) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C;
        const cx = (X0 + X1) / 2 + 6, cy = B - 30, r = 28;
        shadow(img, cx + 6, cy + 4, r, r * 0.9, 0.3);
        const w = shape();
        for (let a = 0; a < 360; a += 2) {
            const t = (a * Math.PI) / 180;
            for (const rr of [r, r - 1, r - 2, r - 3]) sset(w, img, cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.98, Math.cos(t) * -0.6 + Math.sin(t) * -0.8);
            for (const rr of [r - 9, r - 10]) sset(w, img, cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, 0);
        }
        for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2 + 0.2; thick(w, img, cx, cy, cx + Math.cos(t) * (r - 2), cy + Math.sin(t) * (r - 2), 1.2, -0.1); }
        for (let k = 0; k < 16; k++) {                             // paddles
            const t = (k / 16) * Math.PI * 2;
            thick(w, img, cx + Math.cos(t) * (r - 2), cy + Math.sin(t) * (r - 2), cx + Math.cos(t) * (r + 4), cy + Math.sin(t) * (r + 4), 2, Math.cos(t) * -0.5);
        }
        fill(img, w, SP.plank.slice(1), { tex: 0.4, seed, outline: SP.plank[0] });
        const hub = shape(); ellipse(hub, img, cx, cy, 5, 5); fill(img, hub, PAL.iron, { outline: PAL.iron[0] });
        for (let n = 0; n < 60; n++) {                             // white water where the paddles dip
            const a = Math.PI * (0.15 + hash(n, 1, seed) * 0.7), d = r + hash(n, 2, seed) * 6;
            put(img, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7 + 6, SP.foam[1 + (n % 3)], 0.9);
        }
    }

    /** The church: stone nave under a steep slate roof, a gabled front with a tall red window over the door, red
     *  lancets in the side walls, and the bell tower rising behind. */
    function church(L, b, seed, scene) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C, cx = Math.round((X0 + X1) / 2);
        const wallTop = B - 104, eave = wallTop + 4;
        shadow(img, cx + 8, B + 2, (X1 - X0) / 2 + 8, 8, 0.5);
        masonry(img, X0 + 4, wallTop, X1 - X0 - 8, B - wallTop, seed, SP.stone);
        // Main roof.
        slates(img, [[X0 - 6, eave], [X1 + 6, eave], [X1 - 14, Y(b) + 52], [X0 + 14, Y(b) + 52]], seed + 1, () => false, -0.12);
        const ridge = shape(); box(ridge, img, X0 + 14, Y(b) + 49, X1 - X0 - 28, 4, 0.4); fill(img, ridge, PAL.slate.slice(1), { outline: PAL.slate[0] });
        for (let x = X0 - 6; x < X1 + 6; x++) { put(img, x, eave, PAL.slate[0]); put(img, x, eave + 1, SP.shadow, 0.6); }
        // Bell tower, behind the front gable.
        const tw = 44, tx = cx - tw / 2, tTop = Y(b) + 14;
        masonry(img, tx, tTop, tw, wallTop - tTop + 10, seed + 2, SP.stone);
        for (let y = tTop; y < wallTop + 10; y++) { put(img, tx - 1, y, SP.stone[0]); put(img, tx + tw, y, SP.stone[0]); put(img, tx + tw - 1, y, SP.stone[1]); }
        const by = tTop + 8, bw = 18, bh = 26;                     // the belfry and its bell
        for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
            const ax = i - bw / 2 + 0.5, ay = j - bw / 2;
            if (ay < 0 && ax * ax + ay * ay > (bw / 2) ** 2) continue;
            put(img, cx - bw / 2 + i, by + j, [9, 9, 12]);
        }
        const bell = shape(); poly(bell, img, [[cx - 4, by + 7], [cx + 4, by + 7], [cx + 6, by + 17], [cx + 8, by + 19], [cx - 8, by + 19], [cx - 6, by + 17]], (px) => ((px - cx) / 8) * -0.8);
        fill(img, bell, SP.bronze, { outline: SP.bronze[0] });
        rectFill(img, cx - 1, by + 4, 2, 3, SP.bronze[1]);
        rectFill(img, cx - bw / 2 - 2, by + bh, bw + 4, 3, SP.stone[5]);
        const spire = shape(); poly(spire, img, [[tx - 5, tTop + 2], [tx + tw + 5, tTop + 2], [cx, tTop - 40]], (px) => (px < cx ? 0.5 : -0.4));
        fill(img, spire, PAL.slate, { tex: 0.5, seed, scale: 1.5, outline: PAL.slate[0] });
        // Front gable over the door.
        const gw = 104, gx0 = cx - gw / 2, apex = wallTop - 46;
        const tmp = Img(gw, B - apex);
        masonry(tmp, 0, 0, gw, B - apex, seed + 3, SP.stone);
        for (let j = 0; j < B - apex; j++) for (let i = 0; i < gw; i++) {
            if (j < 46 && Math.abs(i - gw / 2) > (j / 46) * (gw / 2)) continue;
            const k = (j * gw + i) * 4; put(img, gx0 + i, apex + j, [tmp.data[k] + 6, tmp.data[k + 1] + 6, tmp.data[k + 2] + 8]);
        }
        for (const side of [-1, 1]) {                              // slate verges and buttresses
            const s = shape(); thick(s, img, cx, apex - 4, cx + side * (gw / 2 + 8), wallTop + 4, 2.8, side < 0 ? 0.4 : -0.3); fill(img, s, PAL.slate, { tex: 0.4, seed, outline: PAL.slate[0] });
            const bt = shape(); box(bt, img, side < 0 ? gx0 - 4 : gx0 + gw - 4, wallTop + 8, 8, B - wallTop - 8, side < 0 ? 0.3 : -0.3); fill(img, bt, SP.stone, { tex: 0.5, seed: seed + side, scale: 2, outline: SP.stone[0] });
        }
        const lancet = (x, y, w, h) => {                           // a pointed window of red glass
            for (let j = -4; j < h + 4; j++) for (let i = -5; i < w + 5; i++) put(img, x + i, y + j, SP.glass[3], 0.08);
            for (let j = -2; j < h + 1; j++) for (let i = -2; i < w + 2; i++) {
                const ax = i - (w - 1) / 2, top = Math.abs(ax) * 1.4;
                if (j < top - 2) continue;
                const edge = j < top || i < 0 || i >= w || j >= h;
                put(img, x + i, y + j, edge ? SP.stone[5] : pick(SP.glass, 0.95 - Math.abs(ax) / w - (j / h) * 0.25 + (hash(i, j, seed) - 0.5) * 0.15));
            }
            for (let j = Math.ceil(w * 0.7); j < h; j++) put(img, x + Math.floor(w / 2), y + j, SP.stone[1]);
            for (let i = 0; i < w; i++) put(img, x + i, y + Math.floor(h * 0.6), SP.stone[1]);
        };
        lancet(cx - 12, apex + 22, 9, 30); lancet(cx + 3, apex + 22, 9, 30);
        lancet(cx - 4, apex + 12, 8, 14);
        for (const lx of [X0 + 18, X0 + 36, X1 - 46, X1 - 28]) lancet(lx, wallTop + 30, 9, 26);
        // The door: an arch of stone round heavy planks.
        const dw = 24, dh = 36, dx = cx - dw / 2, dy = B - dh - 2;
        for (let j = -6; j < dh; j++) for (let i = -6; i < dw + 6; i++) {
            const ax = i - dw / 2 + 0.5, ay = j - dw / 2, r2 = ax * ax + ay * ay;
            if (ay < 0 && r2 > ((dw / 2) + 6) ** 2) continue;
            const inside = (i >= 0 && i < dw) && (ay >= 0 || r2 <= (dw / 2) ** 2);
            if (inside) put(img, dx + i, dy + j, pick(SP.plank, 0.25 + hash(Math.floor(i / 6), 0, seed) * 0.3 + (i % 6 === 0 ? -0.2 : 0)));
            else put(img, dx + i, dy + j, pick(SP.stone, 0.55 + (hash(Math.floor(Math.atan2(ay, ax) * 4), 0, seed) - 0.5) * 0.3));
        }
        rectFill(img, cx - 1, dy - 2, 2, dh + 2, SP.plank[0]);
        put(img, cx - 4, dy + dh / 2, PAL.iron[4]); put(img, cx + 3, dy + dh / 2, PAL.iron[4]);
        // Moss on the stones, ivy up a buttress.
        for (let n = 0; n < 180; n++) { const x = X0 + hash(n, 1, seed) * (X1 - X0), y = wallTop + hash(n, 2, seed) * (B - wallTop); if (vnoise(x / 6, y / 6, seed) > 0.6) put(img, x, y, SP.moss[2 + (n % 2)]); }
        scene.windows.push({ x: cx, y: apex + 40, red: true });
    }
    const Y = (b) => b.y0 * C;

    function henHut(L, b, seed) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C, W = X1 - X0;
        shadow(img, X0 + W / 2 + 4, B + 1, W / 2 + 4, 5, 0.45);
        planks(img, X0 + 4, B - 28, W - 8, 26, seed);
        rectFill(img, X0 + W / 2 - 8, B - 18, 16, 16, [12, 10, 9]);
        for (let i = 0; i < 12; i++) put(img, X0 + W / 2 - 6 + i, B - 3 - (i % 3), PAL.straw[2 + (i % 2)]);
        const s = shape(); poly(s, img, [[X0 - 4, B - 26], [X1 + 4, B - 26], [X1 - 2, B - 52], [X0 + 2, B - 52]], (px, py) => (py - B + 40) * -0.04 + (vnoise(px / 2, py / 6, seed) - 0.5) * 0.8);
        fill(img, s, PAL.straw, { outline: PAL.straw[0] });
        for (let x = X0 - 4; x < X1 + 4; x += 2) put(img, x, B - 25 + (hash(x, 0, seed) < 0.5 ? 1 : 0), PAL.straw[0]);
    }

    // ---------------------------------------------------------------------
    // Square furniture: stall, notice board, covered trough, memorial, raven tree, hens
    // ---------------------------------------------------------------------
    function stall(L, b, seed) {
        const img = L.base, X0 = b.x0 * C + 4, X1 = (b.x1 + 1) * C - 4, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        shadow(img, (X0 + X1) / 2 + 4, B + 2, W / 2 + 6, 6, 0.5);
        for (const px of [X0 + 2, X1 - 5]) { const s = shape(); box(s, img, px, B - 58, 3, 58, 0); fill(img, s, SP.plank, { outline: SP.plank[0] }); }
        planks(img, X0 + 2, B - 22, W - 4, 20, seed);                       // the counter
        const top = shape(); box(top, img, X0, B - 26, W, 5, 0.5); fill(img, top, SP.plank.slice(2), { tex: 0.5, seed, outline: SP.plank[0] });
        for (let k = 0; k < 9; k++) {                                       // goods: pumpkins, sacks, jars
            const gx = X0 + 6 + k * ((W - 12) / 8), r = hash(k, 1, seed);
            const s = shape();
            if (r < 0.4) { ellipse(s, img, gx, B - 30, 4.5, 3.6); fill(img, s, R(['#4a1e08', '#7a3a10', '#a85a1c', '#cc7a2c']), { outline: [20, 10, 6] }); put(img, gx, B - 34, SP.crop[3]); }
            else if (r < 0.75) { ellipse(s, img, gx, B - 31, 4, 5); fill(img, s, SP.clothPale, { tex: 0.4, seed: k, outline: SP.plank[0] }); }
            else { box(s, img, gx - 2, B - 35, 4, 8, 0); fill(img, s, R(['#1a2a28', '#2a4440', '#3e605a']), { outline: [8, 10, 10] }); }
        }
        // The canopy: striped cloth, sagging, torn along the front.
        const cy = B - 62;
        for (let x = X0 - 6; x < X1 + 6; x++) {
            const stripe = Math.floor((x - X0 + 6) / 12) % 2, sag = Math.sin(((x - X0 + 6) / (W + 12)) * Math.PI) * 4;
            const len = 16 + sag + (hash(x >> 2, 0, seed) < 0.3 ? -3 : 0) + ((x >> 1) % 3 === 0 ? 2 : 0);
            for (let j = 0; j < len; j++) {
                const t = 0.75 - j / len * 0.55 + (vnoise(x / 3, j / 3, seed) - 0.5) * 0.2;
                put(img, x, cy + j + Math.round(sag * 0.4), pick(stripe ? SP.clothPale : SP.clothRed, t));
            }
            put(img, x, cy - 1, SP.plank[0]);
        }
        for (let n = 0; n < 40; n++) put(img, X0 - 6 + hash(n, 3, seed) * (W + 12), cy + 3 + hash(n, 4, seed) * 10, SP.dirt[2], 0.45);   // stains
    }
    function noticeBoard(S, b, seed) {
        const X0 = b.x0 * C + 6, X1 = (b.x1 + 1) * C - 6, B = (b.y1 + 1) * C - 4, W = X1 - X0;
        shadow(S, (X0 + X1) / 2 + 4, B + 1, W / 2 + 4, 4, 0.45);
        for (const px of [X0 + 2, X1 - 6]) { const s = shape(); box(s, S, px, B - 48, 4, 48, 0); fill(S, s, SP.plank, { tex: 0.4, seed, outline: SP.plank[0] }); }
        planks(S, X0, B - 42, W, 28, seed + 1);
        const fr = shape(); box(fr, S, X0 - 2, B - 44, W + 4, 3, 0.3); box(fr, S, X0 - 2, B - 15, W + 4, 3, 0.3); fill(S, fr, SP.plank.slice(1), { outline: SP.plank[0] });
        for (let k = 0; k < 6; k++) {                                       // the notices
            const px = X0 + 3 + k * ((W - 14) / 5) + (hash(k, 1, seed) - 0.5) * 3, py = B - 39 + (k % 2) * 8 + hash(k, 2, seed) * 3, pw = 7 + Math.floor(hash(k, 3, seed) * 4), ph = 8 + Math.floor(hash(k, 4, seed) * 6);
            rectFill(S, px, py, pw, ph, SP.clothPale[3 + (k % 2)]);
            for (let l = py + 2; l < py + ph - 1; l += 2) rectFill(S, px + 1, l, pw - 2 - (l % 3), 1, SP.clothPale[1]);
            put(S, px + pw / 2, py, [140, 40, 30]);
        }
        shingles(S, [[X0 - 8, B - 44], [X1 + 8, B - 44], [X1 + 2, B - 56], [X0 - 2, B - 56]], seed + 2, SP.shingle, { cw: 5, chh: 4 });
    }
    function trough(S, cx, gy, seed) {
        shadow(S, cx + 4, gy + 1, 15, 4, 0.45);
        const basin = shape(); box(basin, S, cx - 13, gy - 12, 26, 12, 0); ellipse(basin, S, cx, gy - 12, 13, 4);
        for (const [i] of basin.px) basin.px.set(i, (((i % S.w) - cx) / 13) * -0.7);
        fill(S, basin, SP.stone, { tex: 0.5, seed, scale: 2, outline: SP.stone[0] });
        const w = shape(); ellipse(w, S, cx, gy - 12, 10, 2.6); fill(S, w, SP.water.slice(2), { edge: false });
        put(S, cx - 3, gy - 12, SP.water[6]); put(S, cx - 2, gy - 12, SP.water[6]);
        for (const px of [cx - 13, cx + 11]) { const s = shape(); box(s, S, px, gy - 40, 3, 30, 0); fill(S, s, SP.plank, { outline: SP.plank[0] }); }
        const spout = shape(); box(spout, S, cx - 2, gy - 26, 4, 8, 0); fill(S, spout, PAL.iron, { outline: PAL.iron[0] });
        for (let j = gy - 18; j < gy - 12; j++) put(S, cx, j, SP.foam[1]);
        shingles(S, [[cx - 19, gy - 36], [cx + 19, gy - 36], [cx + 12, gy - 48], [cx - 12, gy - 48]], seed + 3, SP.shingle, { cw: 5, chh: 4 });
    }
    function memorial(S, cx, gy, seed) {
        shadow(S, cx + 5, gy + 1, 12, 4, 0.5);
        const pl = shape(); box(pl, S, cx - 10, gy - 8, 20, 8, 0.2); fill(S, pl, SP.stone, { tex: 0.5, seed, scale: 2, outline: SP.stone[0] });
        const p = shape(); poly(p, S, [[cx - 7, gy - 8], [cx + 7, gy - 8], [cx + 5, gy - 70], [cx - 5, gy - 70]], (px) => ((px - cx) / 7) * -0.8);
        fill(S, p, SP.stone, { tex: 0.6, seed: seed + 1, scale: 2, outline: SP.stone[0] });
        const cap = shape(); poly(cap, S, [[cx - 8, gy - 70], [cx + 8, gy - 70], [cx, gy - 80]], (px) => (px < cx ? 0.5 : -0.4)); fill(S, cap, SP.stone.slice(2), { outline: SP.stone[0] });
        for (let y = gy - 62; y < gy - 20; y += 6) rectFill(S, cx - 3, y, 6, 1, SP.stone[1]);
        for (let n = 0; n < 30; n++) { const x = cx - 6 + hash(n, 1, seed) * 12, y = gy - 70 + hash(n, 2, seed) * 60; if (vnoise(x / 3, y / 3, seed) > 0.55) put(S, x, y, SP.moss[3]); }
        for (const [fx, c] of [[-8, [210, 200, 180]], [6, [170, 60, 50]], [9, [220, 190, 110]]]) { put(S, cx + fx, gy - 2, c); put(S, cx + fx + 1, gy - 1, c); put(S, cx + fx, gy - 1, SP.crop[3]); }
    }
    function chickens(L, x, y, seed) {
        for (let k = 0; k < 2; k++) {
            const img = L.base, cx = x * C + 8 + k * 14 + hash(k, x, seed) * 4, gy = y * C + 14 + k * 10 + hash(k, y, seed) * 4, f = hash(k, x + y, seed) < 0.5 ? 1 : -1;
            shadow(img, cx + 2, gy + 1, 5, 1.6, 0.4);
            const b = shape(); ellipse(b, img, cx, gy - 4, 4.5, 3.5); ellipse(b, img, cx - f * 4, gy - 6, 2, 2.5); ellipse(b, img, cx + f * 3, gy - 8, 2.2, 2.2);
            fill(img, b, SP.hen, { outline: [30, 28, 24] });
            put(img, cx + f * 3, gy - 11, [170, 30, 26]); put(img, cx + f * 4, gy - 11, [170, 30, 26]);
            put(img, cx + f * 5, gy - 8, [210, 150, 50]); put(img, cx + f * 3, gy - 9, [10, 10, 10]);
            put(img, cx - 1, gy, [180, 130, 50]); put(img, cx + 1, gy, [180, 130, 50]);
        }
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
    /** The raven tree: an old dead oak inside a ring of stones, the town's raven banner hung from a limb. */
    function ravenTree(L, b, seed, overhead) {
        const img = L.base, X0 = b.x0 * C, X1 = (b.x1 + 1) * C, B = (b.y1 + 1) * C, cx = (X0 + X1) / 2, cy = B - 22;
        const rx = (X1 - X0) / 2 - 4, ry = 22;
        shadow(img, cx + 6, cy + 6, rx + 6, ry + 4, 0.45);
        const soil = shape(); ellipse(soil, img, cx, cy, rx - 6, ry - 5);
        for (const [i] of soil.px) soil.px.set(i, (vnoise((i % img.w) / 3, ((i / img.w) | 0) / 3, seed) - 0.5) * 1.2);
        fill(img, soil, SP.dirt, { edge: false });
        for (let n = 0; n < 50; n++) { const a = hash(n, 1, seed) * Math.PI * 2, d = hash(n, 2, seed); put(img, cx + Math.cos(a) * d * (rx - 8), cy + Math.sin(a) * d * (ry - 6), pick(SP.red, 0.3 + hash(n, 3, seed) * 0.7)); }
        const stones = (front) => {
            for (let k = 0; k < 30; k++) {
                const a = (k / 30) * Math.PI * 2, sx = cx + Math.cos(a) * rx, sy = cy + Math.sin(a) * ry;
                if ((Math.sin(a) > 0) !== front) continue;
                const s = shape();
                if (front) box(s, img, sx - 5, sy, 10, 7, -0.3);
                ellipse(s, img, sx, sy, 6, 3.6, 0.3);
                fill(img, s, SP.stone, { tex: 0.5, seed: seed + k, scale: 1.5, outline: SP.stone[0] });
            }
        };
        stones(false);
        tall(L, [X0 - 70, B - 200, X1 + 70, B + 10], b.y0 * C, overhead, (S) => {
            bareTree(S, cx, cy + 2, seed, 1.9);
            // A limb reaching right, and the banner hanging from it.
            const limb = shape(); thick(limb, S, cx + 4, cy - 44, cx + 40, cy - 52, 2.2); fill(S, limb, SP.bark, { outline: SP.bark[0] });
            for (const rx2 of [cx + 22, cx + 36]) for (let j = cy - 50; j < cy - 44; j++) put(S, rx2, j, SP.clothPale[1]);
            banner(S, cx + 20, cy - 46, 18, 34, seed + 5, SP.clothPale, SP.clothRed[3]);
            const p2 = shape(); poly(p2, S, [[cx - 30, cy - 58], [cx - 26, cy - 58], [cx - 27, cy - 46], [cx - 29, cy - 46]], 0); fill(S, p2, SP.clothRed, { outline: SP.clothRed[0] });
        });
        stones(true);
    }

    // ---------------------------------------------------------------------
    // The scene
    // ---------------------------------------------------------------------
    function shamefield(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length;
        const L = { base: Img(cw * C, ch * C), over: Img(cw * C, ch * C), scratch: Img(cw * C, ch * C) };
        const seed = 31, scene = { smoke: [], windows: [], flames: [] };
        const kind = ground(L.base, map, nameAt, cw, ch, seed);
        details(L.base, kind, map, nameAt, seed);
        const cols = columns(L.base.w, seed + 40);
        const open = (x, y) => { const n = nameAt(map, x, y); return n === 'grass' || n === 'cobble' || n === 'dirt_path' || n === 'stone_stairs' || n === 'bridge'; };
        // Flat things first: cliffs, stairs, the bridge, the crop rows.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y);
            if (n === 'cliff' || n === 'ruin') cliff(L, cols, map, nameAt, x, y, ch, seed);
            else if (n === 'stone_stairs') stairs(L, map, nameAt, x, y, seed);
            else if (n === 'bridge') bridge(L, map, nameAt, x, y, seed);
            else if (n === 'crops') crops(L, x, y, seed);
        }
        // Everything that stands up, back to front.
        const items = [], seen = new Set();
        const BLOCKS = { house: 'house', slate_house: 'house', watermill: 'mill', church: 'church', hen_hut: 'hut', stall: 'stall', notice_board: 'board', raven_tree: 'raven', mill_wheel: 'wheel', ruin: 'ruin' };
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const n = nameAt(map, x, y), at = (dy = 0.5) => ({ y: y + dy, x });
            if (BLOCKS[n]) {
                if (seen.has(`${x},${y}`)) continue;
                const b = blockOf(map, nameAt, x, y, new Set([n]), seen), s = seed + b.x0 * 13 + b.y0 * 7;
                const over = [...Array(b.x1 - b.x0 + 1)].some((_, i) => open(b.x0 + i, b.y0 - 1));
                const draw = {
                    house: () => (n === 'slate_house' ? house(L, b, s, 'slate', scene) : house(L, b, s, 'shingle', scene)),
                    mill: () => watermill(L, b, s, scene),
                    church: () => church(L, b, s, scene),
                    hut: () => henHut(L, b, s),
                    stall: () => stall(L, b, s),
                    board: () => tall(L, [b.x0 * C - 12, b.y0 * C - 40, (b.x1 + 1) * C + 12, (b.y1 + 1) * C + 6], b.y0 * C, over, (S) => noticeBoard(S, b, s)),
                    raven: () => ravenTree(L, b, s, over),
                    wheel: () => millWheel(L, b, s),
                    ruin: () => ruins(L, b, s)
                }[BLOCKS[n]];
                items.push({ y: b.y1 + (n === 'mill_wheel' ? 0.95 : 0.9), x: b.x0, draw });
                continue;
            }
            const cx = x * C + 16, gy = y * C + 28, ov = open(x, y - 1);
            const P = {
                tree: () => tree(L, x, y, seed, { big: 1.2 + hash(x, y, seed) * 0.35, ramp: SP.red, overhead: ov || open(x - 1, y - 1) || open(x + 1, y - 1) }),
                dead_tree: () => tall(L, [cx - 70, gy - 110, cx + 70, gy + 8], y * C, ov || open(x - 1, y - 1) || open(x + 1, y - 1), (S) => bareTree(S, cx, gy, seed + x * 5 + y, 1.15 + hash(x, y, seed) * 0.3)),
                banner: () => tall(L, [cx - 14, gy - 90, cx + 26, gy + 6], y * C, ov, (S) => bannerPost(S, cx - 4, gy, seed + x)),
                lantern: () => { tall(L, [cx - 12, gy - 60, cx + 12, gy + 6], y * C, ov, (S) => torch(S, cx, gy, seed + x)); scene.flames.push({ x: cx, y: gy - 44 }); },
                well: () => well(L, x, y, seed),
                fountain: () => tall(L, [cx - 22, gy - 52, cx + 22, gy + 6], y * C, ov, (S) => trough(S, cx, gy, seed)),
                memorial: () => tall(L, [cx - 14, gy - 84, cx + 18, gy + 6], y * C, ov, (S) => memorial(S, cx, gy, seed)),
                cart: () => cart(L, x, y, seed + x),
                crate: () => crate(L, cx, gy, seed + x + y, hash(x, y, seed) < 0.5 ? 1 : -1),
                barrel: () => barrel(L, cx, gy, seed + x),
                fence: () => (nameAt(map, x - 1, y) !== 'fence' && nameAt(map, x + 1, y) !== 'fence' ? sideFence(L, map, nameAt, x, y, seed) : fence(L, map, nameAt, x, y, seed)),
                chickens: () => chickens(L, x, y, seed)
            }[n];
            if (P) items.push({ ...at(n === 'tree' || n === 'dead_tree' ? 0.8 : 0.5), draw: P });
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
            if (d < 18) put(L.base, x, y, SP.shadow, (1 - d / 18) * 0.4);
        }
        const water = [], falls = [];
        for (let i = 0; i < kind.length; i += 5) {
            if (kind[i] === 3 && hash(i, 0, seed) < 0.1) water.push(i);
            if (kind[i] === 4 && hash(i, 1, seed) < 0.05) falls.push(i);
        }
        const W = L.base.w;
        function animate(g, time) {
            // Water sliding down the falls.
            g.fillStyle = 'rgba(235, 245, 242, 0.55)';
            for (let k = 0; k < falls.length; k++) {
                const i = falls[k], x = i % W, y = (i / W) | 0, off = ((time / 9 + k * 37) % 24) | 0;
                if (kind[i + off * W] === 4) g.fillRect(x, y + off, 1, 3);
            }
            // Torch flames.
            for (let k = 0; k < scene.flames.length; k++) {
                const f = scene.flames[k], a = Math.sin(time / 90 + k * 2.1), b2 = Math.sin(time / 57 + k);
                g.fillStyle = 'rgba(255, 214, 120, 0.85)'; g.fillRect(f.x - 1 + (a > 0.3 ? 1 : 0), f.y - 4 - (b2 > 0 ? 1 : 0), 2, 3);
                g.fillStyle = 'rgba(255, 120, 40, 0.6)'; g.fillRect(f.x - 2 + (b2 > 0.5 ? 1 : 0), f.y - 1, 4, 2);
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
        return { w: L.base.w, h: L.base.h, base: L.base.data, over: L.over.data, water, animate, windows: scene.windows };
    }

    SA.scenes.shamefield = shamefield;
    if (isNode) module.exports = shamefield;
})(typeof window !== 'undefined' ? window : globalThis);
