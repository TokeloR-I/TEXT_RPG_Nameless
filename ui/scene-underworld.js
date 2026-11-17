/* =========================================================================
 * Enso's Last Stand — SCENE ART: THE FIRST DOMINION (original, drawn by code; Saffron/Quill)
 * The Underworld arena under the homestead well (CB2, docs/design/JAMES_DEMONKORE_DEVIL_UNION_NARRATIVE_DESIGN.md §4).
 * Tokelo, 2026-11-17: "you guys have permission to builed the arena without the image" — a one-off exception to
 * the area-art-first rule, so this scene is the team's own proposal and can be repainted from a picture later.
 *   'underworld_arena'  A round floor of cracked basalt in a black pit. Lava pools fill the four corners and run
 *                       down the side walls, ash drifts in a ring round the middle, four obsidian pillars stand at
 *                       the quarters, a binding circle is cut into the centre where the ruler kneels, and a narrow
 *                       stair climbs out of the north wall back to the well.
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

    function underworldArena(map, nameAt) {
        const cw = map.tiles[0].length, ch = map.tiles.length, w = cw * C, h = ch * C;
        const L = { base: Img(w, h), over: Img(w, h), scratch: Img(w, h) }, seed = 666, img = L.base;
        const at = (x, y) => nameAt(map, x, y);
        // Floor: cracked basalt, with ash where the map says ash.
        // Ash drifts soft-edged over the stones: how much ash a pixel gets blends the ash tiles round it, broken by noise.
        const isAsh = (x, y) => (at(x, y) === 'ash' ? 1 : 0);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            K.fieldstones(img, x, y, seed, UP.basalt, 17, [[3, 2, 3], [6, 3, 4], [10, 4, 4], [14, 5, 4]]);
            const fx = x / C - 0.5, fy = y / C - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
            const ash = (isAsh(x0, y0) * (1 - u) + isAsh(x0 + 1, y0) * u) * (1 - v) + (isAsh(x0, y0 + 1) * (1 - u) + isAsh(x0 + 1, y0 + 1) * u) * v;
            const k = Math.max(0, Math.min(1, (ash + (fbm(x / 10, y / 10, seed + 2) - 0.5) * 0.7 - 0.3) * 2.2));
            if (k > 0) put(img, x, y, pick(UP.ash, 0.35 + (vnoise(x / 3, y / 3, seed + 6) - 0.5) * 0.5), 0.8 * k);
        }
        // Glowing cracks in the basalt, brighter toward the lava.
        const lavaNear = (x, y) => { let d = 9; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (at(x + i, y + j) === 'lava') d = Math.min(d, Math.hypot(i, j)); return d; };
        const heat = [];
        for (let y = 0; y < ch; y++) { heat.push([]); for (let x = 0; x < cw; x++) heat[y].push(lavaNear(x, y)); }
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C), n = at(cx, cy);
            if (n !== 'basalt' && n !== 'ash') continue;
            const hot = Math.max(0, 1 - heat[cy][cx] / 4);
            const crack = Math.abs(vnoise(x / 14, y / 14, seed + 5) - 0.5) < 0.018 + hot * 0.02;
            if (crack) put(img, x, y, pick(UP.lava, 0.25 + hot * 0.45), 0.55 + hot * 0.35);
            if (hot > 0) put(img, x, y, UP.lava[3], 0.12 * hot);
        }
        // Lava pools: a churning surface with a crust at the rim.
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const cx = Math.floor(x / C), cy = Math.floor(y / C);
            if (at(cx, cy) !== 'lava') continue;
            const lx = x - cx * C, ly = y - cy * C;
            let edge = 99;
            if (at(cx - 1, cy) !== 'lava' && !WALL.has(at(cx - 1, cy))) edge = Math.min(edge, lx);
            if (at(cx + 1, cy) !== 'lava' && !WALL.has(at(cx + 1, cy))) edge = Math.min(edge, C - 1 - lx);
            if (at(cx, cy - 1) !== 'lava' && !WALL.has(at(cx, cy - 1))) edge = Math.min(edge, ly);
            if (at(cx, cy + 1) !== 'lava' && !WALL.has(at(cx, cy + 1))) edge = Math.min(edge, C - 1 - ly);
            const f = fbm(x / 16, y / 16, seed + 9), swirl = Math.sin(x / 7 + f * 6) * 0.5 + 0.5;
            let t = 0.22 + f * 0.3 + swirl * 0.16;
            if (edge < 5) t = 0.08 + edge * 0.05;                       // dark crust at the rim
            else if (vnoise(x / 5, y / 5, seed + 11) > 0.78) t = 0.15;  // floating crust
            put(img, x, y, pick(UP.lava, t));
        }
        K.occlude(img, map, nameAt, (n) => WALL.has(n), cw, ch, 12, 0.6);
        K.walls(L, map, nameAt, cw, ch, seed, {
            isWall: (n) => WALL.has(n), cap: K.stoneCap(UP.wall),
            face: (im, x, y, ww, hh, s) => {
                K.stoneFace(UP.wall)(im, x, y, ww, hh, s);
                for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) {
                    put(im, x + i, y + j, UP.wall[1], 0.55);
                    if (vnoise((x + i) / 3, (y + j) / 7, s + 3) > 0.86) put(im, x + i, y + j, UP.lava[3], 0.55);
                    if (j > hh - 5) put(im, x + i, y + j, UP.lava[2], 0.08 * (j - hh + 5));   // lit from the floor
                }
            }
        });
        // The binding circle in the middle of the floor, where the ruler kneels.
        const mx = 13 * C + C / 2, my = 10 * C + C / 2 - 4;
        for (let y = my - 80; y < my + 80; y++) for (let x = mx - 90; x < mx + 90; x++) {
            const d = Math.hypot(x - mx, (y - my) * 1.25), a = Math.atan2(y - my, x - mx);
            if ((d > 66 && d < 69) || (d > 52 && d < 54)) put(img, x, y, UP.lava[d > 60 ? 2 : 3], 0.75);
            // Nine marks between the rings, one for each mark cut in the floor (not explained to the player).
            if (d > 55 && d < 65 && Math.abs(Math.sin(a * 4.5)) < 0.05) put(img, x, y, UP.lava[4], 0.8);
            if (d < 52) put(img, x, y, UP.basalt[0], 0.25 * (1 - d / 52));
        }
        for (let k = 0; k < 3; k++) {   // a triangle inside the inner ring
            const a0 = -Math.PI / 2 + k * (Math.PI * 2 / 3), a1 = a0 + Math.PI * 2 / 3;
            const x0 = mx + Math.cos(a0) * 50, y0 = my + Math.sin(a0) * 40, x1 = mx + Math.cos(a1) * 50, y1 = my + Math.sin(a1) * 40;
            for (let s = 0; s <= 120; s++) { const t = s / 120; put(img, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, UP.lava[3], 0.7); }
        }
        // Obsidian pillars: the foot on the floor, the shaft rising into the overhead layer.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (at(x, y) === 'obsidian_pillar') pillar(L, x, y, seed + x * 7 + y);
        // The stair climbing out of the north wall.
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (at(x, y) === 'stair_up') stair(img, x, y, seed);
        // Sulphur crystals and bones scattered in the ash.
        for (let n = 0; n < 160; n++) {
            const x = hash(n, 1, seed) * w, y = hash(n, 2, seed) * h, nm = at(Math.floor(x / C), Math.floor(y / C));
            if (nm !== 'ash' && nm !== 'basalt') continue;
            if (n % 3 === 0) { rectFill(img, x, y, 2, 2, UP.sulphur, 0.8); put(img, x, y, [255, 240, 150], 0.9); }
            else if (n % 3 === 1) { rectFill(img, x, y, 4, 1, [196, 186, 170], 0.75); put(img, x - 1, y, [220, 212, 196], 0.8); put(img, x + 4, y, [220, 212, 196], 0.8); }
        }
        // Moving glow on the lava and rising embers.
        const pools = [], embers = [];
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (at(x, y) === 'lava') pools.push({ x: x * C, y: y * C, k: hash(x, y, seed) });
        for (let k = 0; k < 10; k++) { const p = pools[Math.floor(hash(k, 7, seed) * pools.length)]; if (p) embers.push({ x: p.x + C / 2, y: p.y + C / 2, embers: 16 }); }
        const emberAnim = K.flames(embers);
        const animate = (g, time) => {
            for (const p of pools) {
                const v = Math.sin(time / 700 + p.k * 12);
                if (v < 0.35) continue;
                g.fillStyle = `rgba(255, 200, 90, ${(0.1 * v).toFixed(3)})`;
                g.fillRect(p.x + 4 + Math.round(p.k * 14), p.y + 6 + Math.round(Math.sin(time / 400 + p.k * 5) * 4), 10, 6);
            }
            const pulse = 0.08 + 0.05 * Math.sin(time / 520);
            g.fillStyle = `rgba(255, 90, 30, ${pulse.toFixed(3)})`;
            g.fillRect(mx - 3, my - 3, 6, 6);
            emberAnim(g, time);
        };
        return { w, h, base: img.data, over: L.over.data, water: [], animate };
    }

    function pillar(L, cx, cy, seed) {
        const img = L.base, over = L.over, x0 = cx * C + 6, wd = C - 12, foot = cy * C + C - 4, top = cy * C - C;
        shadow(img, x0 + wd / 2 + 4, foot, wd / 2 + 4, 5, 0.6);
        for (let y = top; y < foot; y++) for (let x = x0; x < x0 + wd; x++) {
            const u = (x - x0) / wd, facet = Math.floor(u * 4);
            let t = 0.2 + [0.35, 0.55, 0.3, 0.12][facet] + (vnoise(x / 2, y / 5, seed) - 0.5) * 0.12;
            if (u < 0.08 || u > 0.92) t = 0.05;
            if (y > foot - 6) t -= 0.12;
            const col = pick(UP.obsidian, t), layer = y < cy * C ? over : img;
            put(layer, x, y, col);
            if (facet === 1 && Math.abs(Math.sin(y / 5 + seed)) < 0.08) put(layer, x, y, UP.obsidian[6], 0.7);   // glassy glint
        }
        // A sharp cap and a red sheen from the lava below.
        for (let j = 0; j < 7; j++) for (let i = j; i < wd - j; i++) put(over, x0 + i, top - j, pick(UP.obsidian, 0.5 - j * 0.05));
        for (let y = foot - 14; y < foot; y++) for (let x = x0; x < x0 + wd; x++) put(img, x, y, UP.lava[2], 0.18 * ((y - foot + 14) / 14));
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

    Object.assign(SA.scenes, { underworld_arena: underworldArena });
    if (isNode) module.exports = { underworld_arena: underworldArena };
})(typeof window !== 'undefined' ? window : globalThis);
