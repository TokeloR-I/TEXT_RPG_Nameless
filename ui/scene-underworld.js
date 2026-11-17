/* =========================================================================
 * Enso's Last Stand — SCENE ART: THE FIRST DOMINION (original, drawn by code; Saffron/Quill)
 * The Underworld arena under the homestead well (CB2, docs/design/JAMES_DEMONKORE_DEVIL_UNION_NARRATIVE_DESIGN.md §4).
 * Tokelo, 2026-11-17: "you guys have permission to builed the arena without the image" — a one-off exception to
 * the area-art-first rule, so this scene is the team's own proposal and can be repainted from a picture later.
 *   'underworld_arena'  A round floor of cracked basalt in a black pit. Lava pools fill the four corners and run
 *                       down the side walls, ash drifts in a ring round the middle, four obsidian pillars stand at
 *                       the quarters, a binding circle is cut into the centre where the ruler kneels, and a narrow
 *                       stair climbs out of the north wall back to the well.
 *   'dominion_space'    The Second Dominion (Beelzebub): islands of violet glass over a starless void.
 *   'dominion_iron'     The Third Dominion (Slotos): riveted iron plate between pits of cooling slag.
 *   'dominion_wind'     The Fourth Dominion (Plumede): a pale wind-swept ledge over a chasm, black feathers.
 *   Tokelo, 2026-11-17: "you have freedom on the arenas, model them to how you see fit". All four share one painter
 *   (`dominion(theme)`); a theme swaps the ramps, the tile names and how its pits are drawn (lava, void, slag, chasm).
 *
 * Adds the scene to ENSO.sceneArt (ui/scene-art.js), reusing the homestead room painters (SA.roomKit,
 * ui/scene-homestead-rooms.js, so load this file after that one). The map's tiles (src/world/chapter2-maps.js)
 * decide collision, exits and where the waves and the ruler stand. No image goes in.
 * Review: `node tools/preview-scene.js underworld_arena out.png 1`.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SA = isNode ? require('./scene-art.js') : ENSO.sceneArt;
    if (isNode) require('./scene-homestead-rooms.js');
    if (!SA || !SA.roomKit) return;
    const { C, hash, vnoise, fbm, R, put, rectFill, shadow, Img } = SA.kit;
    const K = SA.roomKit, pick = K.pick;

    // Basalt, ash, sulphur and lava; the only light down here comes from below.
    const UP = {
        basalt: R(['#07060a', '#0d0b10', '#141117', '#1b161e', '#231c25', '#2c232d', '#362a35']),
        ash: R(['#1d1a1a', '#292524', '#36302e', '#433b38', '#524843', '#62574f']),
        wall: R(['#040306', '#09070b', '#0f0c11', '#161118', '#1e171f', '#271d27']),
        obsidian: R(['#050408', '#0c0a12', '#15121e', '#201b2c', '#2d2640', '#3e3557', '#58507a']),
        lava: R(['#3a0804', '#6a1206', '#a2240a', '#d4440e', '#f2741c', '#ffa83c', '#ffd77a', '#fff4c4']),
        sulphur: [214, 196, 70]
    };
    const WALL = new Set(['abyss_wall']);
    const FIRST = { seed: 666, floor: 'basalt', dust: 'ash', pit: 'lava', pillar: 'obsidian_pillar', exit: 'stair_up', mode: 'lava', crust: 0.78,
        pal: { floor: UP.basalt, dust: UP.ash, wall: UP.wall, pillar: UP.obsidian, pit: UP.lava }, speck: UP.sulphur, debris: 'bones', embers: true, glow: [255, 90, 30], pool: [255, 200, 90] };
    const THEMES = {
        underworld_arena: FIRST,
        // Beelzebub: violet glass floating over a starless void; the cracks glow cold.
        dominion_space: { seed: 717, floor: 'riftglass', dust: 'stardust', pit: 'void', pillar: 'glass_shard', exit: 'rift_back', mode: 'void',
            pal: { floor: R(['#07060e', '#0e0b1a', '#151126', '#1d1834', '#262042', '#302852', '#3c3264']), dust: R(['#16142a', '#221e3c', '#2e2850', '#3c3466', '#4c4280', '#5e549a']),
                wall: R(['#030208', '#07050e', '#0c0916', '#120e20', '#18132a', '#1f1934']), pillar: R(['#0c0820', '#181236', '#261e52', '#3a2e74', '#5446a0', '#7a6ac8', '#b8f0e0']),
                pit: R(['#000000', '#05030c', '#120a2a', '#2a1a5c', '#5a3cb0', '#8a6ae8', '#c8b8ff', '#f0f8ff']) },
            speck: [184, 240, 224], debris: 'shards', embers: false, glow: [150, 110, 255], pool: [190, 160, 255] },
        // Slotos: riveted iron plate between pits of cooling slag.
        dominion_iron: { seed: 818, floor: 'iron_plate', dust: 'scale', pit: 'slag', pillar: 'iron_post', exit: 'rift_back', mode: 'lava', crust: 0.6,
            pal: { floor: R(['#0c0a0a', '#151212', '#1e1a19', '#282220', '#322b28', '#3e3530', '#4a403a']), dust: R(['#24170f', '#352216', '#4a2e1c', '#5e3c24', '#734c30', '#8a5e3e']),
                wall: R(['#050404', '#0a0807', '#100d0b', '#17130f', '#1e1914', '#26201a']), pillar: R(['#0e0c0c', '#1c1818', '#2c2624', '#3e3632', '#544a44', '#6e625a', '#a09080']),
                pit: R(['#1a0c06', '#3a1a0a', '#5e2a10', '#8e4014', '#c06020', '#e08a34', '#f4b860', '#ffe0a0']) },
            speck: [224, 154, 74], debris: 'rivets', embers: true, glow: [255, 130, 50], pool: [255, 190, 110] },
        // Plumede: pale wind-scoured rock over a chasm; black feathers drift across the floor.
        dominion_wind: { seed: 919, floor: 'pale_rock', dust: 'feathers', pit: 'chasm', pillar: 'perch', exit: 'rift_back', mode: 'chasm',
            pal: { floor: R(['#2a2a32', '#3a3a44', '#4a4a56', '#5c5c68', '#6e6e7a', '#82828e', '#9696a2']), dust: R(['#0a0a10', '#14141c', '#1e1e28', '#2a2a36', '#383846', '#4a4a5a']),
                wall: R(['#101016', '#16161e', '#1e1e28', '#262632', '#30303c', '#3a3a48']), pillar: R(['#141418', '#24242c', '#383842', '#4c4c58', '#62626e', '#7a7a86', '#b0b0c0']),
                pit: R(['#03030a', '#0a0a16', '#141426', '#202036', '#2e2e4a', '#404060', '#5a5a7c', '#8a8aac']) },
            speck: [216, 212, 232], debris: 'feathers', embers: false, glow: [200, 200, 240], pool: [230, 230, 255] }
    };

    const dominion = (T) => function paint(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, w = cw * C, h = ch * C;
        const L = { base: Img(w, h), over: Img(w, h), scratch: Img(w, h) }, seed = T.seed, img = L.base, P = T.pal;
        const at = (x, y) => nameAt(map, x, y);
        const isFloor = (n) => n === T.floor || n === T.dust;
        // Floor: cracked stone (or plate, or glass), with the map's dust tiles drifted soft-edged over it.
        const isDust = (x, y) => (at(x, y) === T.dust ? 1 : 0);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (T.debris === 'rivets') {   // square plates with seams and a rivet at each corner
                const lx = x % 16, ly = y % 16, plate = hash(Math.floor(x / 16), Math.floor(y / 16), seed);
                put(img, x, y, pick(P.floor, 0.3 + plate * 0.25 + (vnoise(x / 4, y / 4, seed) - 0.5) * 0.15));
                if (lx === 0 || ly === 0) put(img, x, y, P.floor[0], 0.8);
                else if ((lx === 2 || lx === 13) && (ly === 2 || ly === 13)) put(img, x, y, P.floor[6], 0.8);
            } else K.fieldstones(img, x, y, seed, P.floor, 17, [[3, 2, 3], [6, 3, 4], [10, 4, 4], [14, 5, 4]]);
            const fx = x / C - 0.5, fy = y / C - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
            const dust = (isDust(x0, y0) * (1 - u) + isDust(x0 + 1, y0) * u) * (1 - v) + (isDust(x0, y0 + 1) * (1 - u) + isDust(x0 + 1, y0 + 1) * u) * v;
            const k = Math.max(0, Math.min(1, (dust + (fbm(x / 10, y / 10, seed + 2) - 0.5) * 0.7 - 0.3) * 2.2));
            if (k > 0) put(img, x, y, pick(P.dust, 0.35 + (vnoise(x / 3, y / 3, seed + 6) - 0.5) * 0.5), 0.8 * k);
        }
        // Cracks in the floor, glowing brighter toward the pits (dark, in the wind's chasm).
        const pitNear = (x, y) => { let d = 9; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (at(x + i, y + j) === T.pit) d = Math.min(d, Math.hypot(i, j)); return d; };
        const heat = [];
        for (let y = 0; y < ch; y++) { heat.push([]); for (let x = 0; x < cw; x++) heat[y].push(pitNear(x, y)); }
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C);
            if (!isFloor(at(cx, cy))) continue;
            const hot = Math.max(0, 1 - heat[cy][cx] / 4);
            const crack = Math.abs(vnoise(x / 14, y / 14, seed + 5) - 0.5) < 0.018 + hot * 0.02;
            if (T.mode === 'chasm') { if (crack) put(img, x, y, P.floor[0], 0.6); continue; }
            if (crack) put(img, x, y, pick(P.pit, 0.25 + hot * 0.45), 0.55 + hot * 0.35);
            if (hot > 0) put(img, x, y, P.pit[3], 0.12 * hot);
        }
        // The pits: churning lava or slag with a crust at the rim, an open starfield, or a drop into the dark.
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C);
            if (at(cx, cy) !== T.pit) continue;
            const lx = x - cx * C, ly = y - cy * C;
            let edge = 99;
            if (at(cx - 1, cy) !== T.pit && !WALL.has(at(cx - 1, cy))) edge = Math.min(edge, lx);
            if (at(cx + 1, cy) !== T.pit && !WALL.has(at(cx + 1, cy))) edge = Math.min(edge, C - 1 - lx);
            if (at(cx, cy - 1) !== T.pit && !WALL.has(at(cx, cy - 1))) edge = Math.min(edge, ly);
            if (at(cx, cy + 1) !== T.pit && !WALL.has(at(cx, cy + 1))) edge = Math.min(edge, C - 1 - ly);
            const f = fbm(x / 16, y / 16, seed + 9);
            if (T.mode === 'void') {
                let t = 0.04 + Math.max(0, f - 0.45) * 0.5;                               // a faint nebula
                const star = hash(x, y, seed + 13);
                if (star > 0.994) t = 0.7 + (star - 0.994) * 50;
                if (edge < 3) t = 0.62 - edge * 0.12;                                    // the glass rim glows
                put(img, x, y, pick(P.pit, Math.min(0.99, t)));
                continue;
            }
            if (T.mode === 'chasm') {
                // The cliff falls away from the ledge into mist; streaks of wind blow across the drop.
                let t = 0.42 - Math.min(edge, 24) * 0.014 + (f - 0.5) * 0.2;
                if (Math.abs(Math.sin(y / 4 + x / 30 + f * 5)) < 0.06) t += 0.22;
                if (edge < 3) { put(img, x, y, pick(P.floor, 0.1 + edge * 0.05)); continue; }   // the lip of the ledge
                put(img, x, y, pick(P.pit, Math.max(0, t)));
                continue;
            }
            const swirl = Math.sin(x / 7 + f * 6) * 0.5 + 0.5;
            let t = 0.22 + f * 0.3 + swirl * 0.16;
            if (edge < 5) t = 0.08 + edge * 0.05;                       // dark crust at the rim
            else if (vnoise(x / 5, y / 5, seed + 11) > T.crust) t = 0.15;  // floating crust
            put(img, x, y, pick(P.pit, t));
        }
        K.occlude(img, map, nameAt, (n) => WALL.has(n), cw, ch, 12, 0.6);
        K.walls(L, map, nameAt, cw, ch, seed, {
            isWall: (n) => WALL.has(n), cap: K.stoneCap(P.wall),
            face: (im, x, y, ww, hh, s) => {
                K.stoneFace(P.wall)(im, x, y, ww, hh, s);
                for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) {
                    put(im, x + i, y + j, P.wall[1], 0.55);
                    if (vnoise((x + i) / 3, (y + j) / 7, s + 3) > 0.86) put(im, x + i, y + j, P.pit[3], T.mode === 'chasm' ? 0.2 : 0.55);
                    if (j > hh - 5) put(im, x + i, y + j, P.pit[2], 0.08 * (j - hh + 5));   // lit from the floor
                }
            }
        });
        // The binding circle in the middle of the floor, where the ruler kneels.
        const mx = 13 * C + C / 2, my = 10 * C + C / 2 - 4, ring = T.mode === 'chasm' ? P.floor : P.pit;
        // Ring colours [outer, inner, marks, triangle]: lit from the pits, pale on the wind's ledge, starlight over the void.
        const RI = { chasm: [6, 6, 6, 5], void: [5, 6, 6, 5] }[T.mode] || [2, 3, 4, 3];
        for (let y = my - 80; y < my + 80; y++) for (let x = mx - 90; x < mx + 90; x++) {
            const d = Math.hypot(x - mx, (y - my) * 1.25), a = Math.atan2(y - my, x - mx);
            if ((d > 66 && d < 69) || (d > 52 && d < 54)) put(img, x, y, ring[d > 60 ? RI[0] : RI[1]], 0.75);
            // Nine marks between the rings, one for each mark cut in the floor (not explained to the player).
            if (d > 55 && d < 65 && Math.abs(Math.sin(a * 4.5)) < 0.05) put(img, x, y, ring[RI[2]], 0.8);
            if (d < 52) put(img, x, y, P.floor[0], 0.25 * (1 - d / 52));
        }
        for (let k = 0; k < 3; k++) {   // a triangle inside the inner ring
            const a0 = -Math.PI / 2 + k * (Math.PI * 2 / 3), a1 = a0 + Math.PI * 2 / 3;
            const x0 = mx + Math.cos(a0) * 50, y0 = my + Math.sin(a0) * 40, x1 = mx + Math.cos(a1) * 50, y1 = my + Math.sin(a1) * 40;
            for (let s = 0; s <= 120; s++) { const t = s / 120; put(img, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, ring[RI[3]], 0.7); }
        }
        // Pillars (obsidian, glass shards, iron posts, perches): the foot on the floor, the shaft rising overhead.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (at(x, y) === T.pillar) pillar(L, x, y, seed + x * 7 + y, T);
        // The way out: the stair to the well, or the rift back to the First Dominion.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (at(x, y) === T.exit) (T.exit === 'stair_up' ? stair : riftBack)(img, x, y, seed, T);
        // Scattered on the floor: sulphur and bones, glass shards, rivets and scale, or black feathers.
        for (let n = 0; n < (T.debris === 'feathers' ? 520 : 160); n++) {
            const x = hash(n, 1, seed) * w, y = hash(n, 2, seed) * h, nm = at(Math.floor(x / C), Math.floor(y / C));
            if (!isFloor(nm)) continue;
            if (T.debris === 'feathers') {
                const a = hash(n, 3, seed) * Math.PI, len = 4 + Math.floor(hash(n, 4, seed) * 4);
                for (let i = 0; i < len; i++) put(img, x + Math.cos(a) * i, y + Math.sin(a) * i, i < 1 ? T.speck : [16, 16, 22], 0.85);
                continue;
            }
            if (n % 3 === 0) { rectFill(img, x, y, 2, 2, T.speck, 0.8); put(img, x, y, [255, 240, 220], 0.7); }
            else if (n % 3 === 1 && T.debris === 'bones') { rectFill(img, x, y, 4, 1, [196, 186, 170], 0.75); put(img, x - 1, y, [220, 212, 196], 0.8); put(img, x + 4, y, [220, 212, 196], 0.8); }
            else if (n % 3 === 1 && T.debris === 'shards') { for (let i = 0; i < 4; i++) put(img, x + i, y - i * 0.5, pick(P.pillar, 0.5 + i * 0.1), 0.85); }
            else if (n % 3 === 1) rectFill(img, x, y, 3, 2, P.dust[4], 0.8);
        }
        // Moving glow on the pits, and embers (lava, slag), twinkling stars (void) or drifting feathers (wind).
        const pools = [], embers = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (at(x, y) === T.pit) pools.push({ x: x * C, y: y * C, k: hash(x, y, seed) });
        if (T.embers) for (let k = 0; k < 10; k++) { const p = pools[Math.floor(hash(k, 7, seed) * pools.length)]; if (p) embers.push({ x: p.x + C / 2, y: p.y + C / 2, embers: 16 }); }
        const emberAnim = T.embers ? K.flames(embers) : null;
        const [pr, pg, pb] = T.pool, [gr, gg, gb] = T.glow;
        const animate = (g, time) => {
            for (const p of pools) {
                const v = Math.sin(time / 700 + p.k * 12);
                if (v < 0.35) continue;
                g.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${(0.1 * v).toFixed(3)})`;
                if (T.mode === 'void') g.fillRect(p.x + 4 + Math.round(p.k * 22), p.y + 4 + Math.round(hash(p.x, p.y, 3) * 22), 2, 2);
                else if (T.mode === 'chasm') g.fillRect(p.x + ((time / 6 + p.k * 400) % C), p.y + 6 + Math.round(p.k * 18), 8, 1);
                else g.fillRect(p.x + 4 + Math.round(p.k * 14), p.y + 6 + Math.round(Math.sin(time / 400 + p.k * 5) * 4), 10, 6);
            }
            const pulse = 0.08 + 0.05 * Math.sin(time / 520);
            g.fillStyle = `rgba(${gr}, ${gg}, ${gb}, ${pulse.toFixed(3)})`;
            g.fillRect(mx - 3, my - 3, 6, 6);
            if (T.mode === 'chasm') for (let k = 0; k < 6; k++) {   // feathers blown across the ledge
                const fx = (time / (18 + k * 3) + k * 137) % w, fy = (k * 97 + Math.sin(time / 600 + k) * 20 + 80) % h;
                g.fillStyle = 'rgba(14, 14, 20, 0.8)'; g.fillRect(fx, fy, 5, 1); g.fillRect(fx + 1, fy - 1, 2, 1);
            }
            if (emberAnim) emberAnim(g, time);
        };
        return { w, h, base: img.data, over: L.over.data, water: [], animate };
    };

    function pillar(L, cx, cy, seed, T) {
        const OB = T.pal.pillar, PIT = T.mode === 'chasm' ? T.pal.floor : T.pal.pit;
        const img = L.base, over = L.over, x0 = cx * C + 6, wd = C - 12, foot = cy * C + C - 4, top = cy * C - C;
        shadow(img, x0 + wd / 2 + 4, foot, wd / 2 + 4, 5, 0.6);
        for (let y = top; y < foot; y++) for (let x = x0; x < x0 + wd; x++) {
            const u = (x - x0) / wd, facet = Math.floor(u * 4);
            let t = 0.2 + [0.35, 0.55, 0.3, 0.12][facet] + (vnoise(x / 2, y / 5, seed) - 0.5) * 0.12;
            if (u < 0.08 || u > 0.92) t = 0.05;
            if (y > foot - 6) t -= 0.12;
            const col = pick(OB, t), layer = y < cy * C ? over : img;
            put(layer, x, y, col);
            if (facet === 1 && Math.abs(Math.sin(y / 5 + seed)) < 0.08) put(layer, x, y, OB[6], 0.7);   // glassy glint
        }
        // A sharp cap and a red sheen from the lava below.
        for (let j = 0; j < 7; j++) for (let i = j; i < wd - j; i++) put(over, x0 + i, top - j, pick(OB, 0.5 - j * 0.05));
        for (let y = foot - 14; y < foot; y++) for (let x = x0; x < x0 + wd; x++) put(img, x, y, PIT[2], 0.18 * ((y - foot + 14) / 14));
    }

    // The rift back to the First Dominion: a tear in the north wall, red light leaking through it.
    function riftBack(img, cx, cy, seed, T) {
        const x0 = cx * C + C / 2, y0 = cy * C + C / 2;
        for (let j = -C / 2; j < C / 2; j++) for (let i = -C / 2; i < C / 2; i++) {
            const d = Math.hypot(i / 9, j / 15);
            if (d < 1) put(img, x0 + i, y0 + j, d < 0.45 ? [255, 110, 40] : T.glow, d < 0.45 ? 0.8 : 0.5 * (1 - d) + 0.2);
            else if (d < 1.5) put(img, x0 + i, y0 + j, T.glow, 0.2 * (1.5 - d));
        }
        for (let j = -12; j < 12; j++) put(img, x0, y0 + j, [255, 230, 200], 0.6 - Math.abs(j) / 30 + 0.02 * hash(j, 1, seed));
    }

    function stair(img, cx, cy, seed) {
        const x0 = cx * C + 4, wd = C - 8, y0 = cy * C;
        for (let s = 0; s < 6; s++) {
            const y = y0 + s * (C / 6), t = 0.15 + s * 0.08;
            rectFill(img, x0, y, wd, C / 6, pick(UP.basalt, t));
            rectFill(img, x0, y, wd, 1, UP.basalt[6], 0.7);
        }
        for (let j = 0; j < C; j++) { put(img, x0 - 1, y0 + j, UP.wall[0]); put(img, x0 + wd, y0 + j, UP.wall[0]); }
        // A faint cold light from the well far above.
        for (let j = 0; j < C; j++) for (let i = 0; i < wd; i++) put(img, x0 + i, y0 + j, [170, 190, 220], 0.16 * (1 - j / C) + 0.02 * hash(i, j, seed));
    }

    const scenes = Object.fromEntries(Object.entries(THEMES).map(([id, T]) => [id, dominion(T)]));
    Object.assign(SA.scenes, scenes);
    if (isNode) module.exports = scenes;
})(typeof window !== 'undefined' ? window : globalThis);
