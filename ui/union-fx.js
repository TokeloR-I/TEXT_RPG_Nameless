/* =========================================================================
 * Enso's Last Stand — DEVIL UNION MERGE LOOK (original, drawn by code; Saffron/Quill)
 * Tokelo, 2026-11-17: "can we take a page out of Black Clover's devil union? where you have this dark looking armor
 * or shadowy design?" While you are merged with a demon (engine.activeUnion(), src/engine/union.js) the hero is
 * wrapped in that demon's dark armor: the sprite's cloth, metal and hair are recoloured to it (a palette, no new
 * sheets), its own pieces are drawn on and around the body, and black smoke curls off you the whole time. Each look
 * is ENSO's own design:
 *   lucifero   (follows Tokelo's design picture) a spiked hood-helm with violet eyes (with Heavy Field), a black halo in a curl of purple
 *              smoke, chevron plate with a glowing V, belt and tabard, four clawed shadow arms, a torn skirt, a
 *              gravity vortex with rocks at the feet.
 *   beelzebub  violet rift-glass; glass shards on the shoulders; a cracked halo; flies turning round you (space).
 *   slotos     slag-iron hulk; tusked pauldrons; orange heat in the seams; sparks when struck (toughness).
 *   plumede    black plumage with a pale edge; folded feather wings that flare on a dash; feathers shed on the move.
 * Second pass (Tokelo: "more animalistic ... owl or wild bore or fox ... extra arms or ... spider legs"): Lucifero
 * grows four shadow arms. Plumede's owl helm and Slotos's boar helm come on only with a union skill (Fleet Form,
 * Iron Hide) and go when it ends. Beelzebub keeps his first look (no fox) and from the hips down
 * he is a spider: the hero's legs become eight violet-glass ones.
 * A merge starts with a burst in the demon's colour and ends with the smoke thinning away (fade in / out).
 * Eight facings (Tokelo 2026-11-18): every piece sits in the body's own space and is seen from the way you face, so the
 * armor turns with the hero (N, NE, E, SE, S, SW, W, NW), with a profile and a back for the helms and Lucifero's plate.
 *
 *   ENSO.unionFx.palette(id)                                the sprite palette override for the armor
 *   ENSO.unionFx.behind(g, cx, base, st, view, now)         before the body: whatever is behind you at this facing
 *   ENSO.unionFx.front(g, cx, base, st, view, now)          after the body.  cx, base: the sprite's feet
 *   ENSO.unionFx.state(id, now)                             { id, k (0..1 strength), burst (0..1) } for this frame
 * ========================================================================= */
(function (global) {
    const ENSO = global.ENSO || (global.ENSO = {});
    // The player rig (assets/sprites/enso-player.js): feet at the base, shoulders ~24 px up, head top ~38 px up.
    const HEAD_TOP = 38, SHOULDERS = 24, HEAD = 30;
    const FADE_IN = 300, FADE_OUT = 700, BURST = 500;
    const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;

    // Each demon's armor: the palette swap (assets/sprites/enso-player.js base colours: cloth, cloth2, accent, leather, metal, hat, eye; the hair and face stay yours) and its glow.
    const LOOKS = {
        // Tokelo's reference (2026-11-17 16:41): violet-black plate, purple light in the cracks.
        lucifero: { glow: [200, 96, 255], smoke: [26, 10, 40],
            palette: { cloth: '#2a2238', cloth2: '#1a1424', accent: '#c060ff', leather: '#3a3046', metal: '#5a4c70', hat: '#2a2238', shieldFace: '#2a2238', eye: '#e080ff' } },
        beelzebub: { glow: [184, 240, 224], smoke: [16, 10, 34],
            palette: { cloth: '#241a46', cloth2: '#120c24', accent: '#b8f0e0', leather: '#1a1430', metal: '#6a58b0', hat: '#241a46', shieldFace: '#241a46', eye: '#b8f0e0' } },
        slotos: { glow: [240, 150, 70], smoke: [22, 16, 14],
            palette: { cloth: '#3a2e2c', cloth2: '#1e1716', accent: '#e09a4a', leather: '#2a201c', metal: '#7a6a60', hat: '#3a2e2c', shieldFace: '#3a2e2c', eye: '#f0a050' } },
        plumede: { glow: [216, 212, 232], smoke: [8, 8, 14],
            palette: { cloth: '#16161f', cloth2: '#08080e', accent: '#d8d4e8', leather: '#101018', metal: '#4a4a62', hat: '#16161f', shieldFace: '#16161f', eye: '#e8e4f8' } }
    };

    // When the current merge began and the last one ended, for the burst and the fades (presentation only).
    const clock = { id: null, start: -1e9, endedId: null, ended: -1e9 };
    function state(id, now) {
        if (id && id !== clock.id) { clock.id = id; clock.start = now; }
        if (!id && clock.id) { clock.endedId = clock.id; clock.ended = now; clock.id = null; }
        if (clock.id) {
            const t = now - clock.start;
            return { id: clock.id, k: Math.min(1, t / FADE_IN), burst: t < BURST ? 1 - t / BURST : 0 };
        }
        const t = now - clock.ended;
        return t < FADE_OUT && clock.endedId ? { id: clock.endedId, k: 1 - t / FADE_OUT, burst: 0, fading: true } : null;
    }
    function reset() { clock.id = null; clock.start = -1e9; clock.endedId = null; clock.ended = -1e9; }

    const palette = (id) => (LOOKS[id] ? LOOKS[id].palette : null);

    /** Black smoke curling up off the body, edged with the demon's glow. */
    function smoke(g, cx, base, L, k, now) {
        for (let i = 0; i < 22; i++) {
            const life = ((now / 1100 + hash(i, 1)) % 1), side = hash(i, 2) < 0.5 ? -1 : 1;
            const x = cx + side * (5 + hash(i, 3) * 7) + Math.sin(now / 300 + i) * 2 * life;
            const y = base - 4 - life * (HEAD_TOP + 6) - hash(i, 4) * 6;
            const r = 2 + life * 4, a = k * 0.7 * (1 - life);
            g.fillStyle = rgba(L.smoke, a); g.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), Math.ceil(r), Math.ceil(r));
            if (i % 3 === 0) { g.fillStyle = rgba(L.glow, a * 0.6); g.fillRect(Math.round(x), Math.round(y - r / 2), 1, 1); }
        }
    }

    /** The merge's first half second: a ring of the demon's colour bursting outward from the hero. */
    function burst(g, cx, base, L, u) {
        if (u <= 0) return;
        const r = 8 + (1 - u) * 34, y = base - SHOULDERS * 0.6;
        for (let k = 0; k < 64; k++) {
            const t = (k / 64) * Math.PI * 2;
            g.fillStyle = rgba(L.glow, 0.85 * u); g.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(y + Math.sin(t) * r * 0.55), 2, 1);
            g.fillStyle = rgba(L.smoke, 0.6 * u); g.fillRect(Math.round(cx + Math.cos(t) * r * 0.8), Math.round(y + Math.sin(t) * r * 0.44), 2, 2);
        }
    }

    // --- the eight facings (Tokelo 2026-11-18: "the armor only has one side ... front back left right NW SW NE SE") ---
    // The rig (assets/sprites/enso-player.js) turns the hero 8 ways, so the armor does too. Every piece is placed in the
    // body's own space (x across the body: + is screen right when you face the camera; z forward: + toward the camera
    // when you face it; y up) and projected for the facing. What ends up behind the body is drawn before it
    // (behind()), the rest after it (front()). Pixel grids (helms, plate) have a front, a profile (facing right) and a
    // back (the front's shapes in the back colours); the 3/4 views turn the front or back grid part way, and the -left
    // facings mirror the -right ones, as the rig does.
    const DEG = Math.PI / 180;
    const YAW = { down: 0, 'down-right': 45, right: 90, 'up-right': 135, up: 180, 'up-left': -135, left: -90, 'down-left': -45 };
    const TURN34 = 0.3;        // how far a 3/4 grid's middle slides (of its half width), as the rig's diagonals turn part way
    function pose(view) {
        const f = String((view && (view.facing8 || view.facing)) || 'down');
        const a = (YAW[f] != null ? YAW[f] : 0) * DEG;
        const sn = Math.sin(a), cs = Math.cos(a);
        const s = Math.abs(sn) < 1e-6 ? 0 : sn, c = Math.abs(cs) < 1e-6 ? 0 : cs;
        const kind = Math.abs(s) > 0.9 ? 'side' : c > 0.9 ? 'front' : c < -0.9 ? 'back' : c > 0 ? 'front34' : 'back34';
        return { f, s, c, kind, flip: s < 0, away: c < -0.1 };
    }
    /** Body space -> screen x offset, and depth (+ toward the camera: drawn over the body). */
    const sx = (P, x, z) => x * P.c + z * P.s;
    const dz = (P, x, z) => -x * P.s + z * P.c;
    /** A flat thing seen at this facing keeps at least this much of its width (edge on, it is still a few pixels). */
    const thin = (P, min = 0.2) => (P.c < 0 ? -1 : 1) * Math.max(Math.abs(P.c), min);
    const inLayer = (layer, D) => (layer === 'back' ? D < 0 : D >= 0);

    const away = (view) => pose(view).away;
    const moving = (view) => !!(view && (view.moving || view.gait === 'walk'));
    const dashing = (view) => !!(view && view.anim === 'dodge');

    // --- pixel grids for every facing --------------------------------------------------------------------------------
    const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));
    const recolour = (rows, map) => rows.map((r) => [...r].map((ch) => map[ch] || ch).join(''));
    /** The front (or back) grid turned part way (a 3/4 view, as the rig draws its diagonals): its middle slides by
     *  `shift` of the half width toward the facing, the near side widens and the far side narrows. The silhouette
     *  keeps its outline, so nothing has to be invented past the edge. */
    function turnGrid(rows, shift) {
        const W = rows[0].length;
        return rows.map((row) => {
            let line = '';
            for (let j = 0; j < W; j++) {
                const x = (j + 0.5) / W * 2 - 1;   // -1..1 across the output
                const u = x < shift ? -1 + (x + 1) / (1 + shift) : (x - shift) / (1 - shift);   // where it comes from
                line += row[Math.max(0, Math.min(W - 1, Math.floor((u + 1) / 2 * W)))];
            }
            const a = [...line], i0 = a.findIndex((ch) => ch !== '.'), i1 = a.length - 1 - [...a].reverse().findIndex((ch) => ch !== '.');
            if (i0 >= 0) { a[i0] = 'o'; a[i1] = 'o'; }   // close the outline the sampling may have skipped
            return a.join('');
        });
    }
    /** The rows for a grid set ({ rows (front), side (facing right), back? , backMap }) at this facing. Cached. */
    const gridCache = new Map();
    function gridAt(set, P) {
        const key = P.kind + (P.flip ? 'L' : 'R');
        let byKind = gridCache.get(set);
        if (!byKind) gridCache.set(set, (byKind = {}));
        if (byKind[key]) return byKind[key];
        const back = set.back || recolour(set.rows, set.backMap || {});
        let rows;
        if (P.kind === 'front') rows = set.rows;
        else if (P.kind === 'back') rows = back;
        else if (P.kind === 'side') rows = set.side;
        else if (P.kind === 'front34') rows = turnGrid(set.rows, TURN34);
        else rows = turnGrid(back, -TURN34);
        if (P.flip) rows = mirror(rows);
        return (byKind[key] = rows);
    }

    // --- Lucifero (Tokelo's design picture) ----------------------------------------------------------------------
    /** A ring standing behind the head (Lucifero's black halo, Beelzebub's cracked one), seen edge on in profile. */
    function haloRing(g, P, cx, hy, r, z, draw) {
        const hx = cx + sx(P, 0, z), squash = thin(P, 0.35);
        for (let n = 0; n < 80; n++) { const t = (n / 80) * Math.PI * 2; draw(Math.round(hx + Math.cos(t) * r * squash), Math.round(hy + Math.sin(t) * r), t); }
        return { hx, squash };
    }
    function luciferoHalo(g, cx, base, L, k, P, now) {
        const hy = base - HEAD_TOP - 8;
        const { hx, squash } = haloRing(g, P, cx, hy, 9, -5, (x, y) => { g.fillStyle = rgba([6, 2, 10], 0.95 * k); g.fillRect(x, y, 2, 2); });
        for (let s = 0; s < 34; s++) {                                               // a thick curl of smoke over its top-left
            const t = s / 34, a = Math.PI * (0.85 + t * 0.9) + Math.sin(now / 900) * 0.08, rr = 10 + t * 3 + Math.sin(t * 6 + now / 500) * 0.6;
            const w = t < 0.8 ? 3 - t * 2 : 1;
            g.fillStyle = rgba(t > 0.6 ? [230, 160, 255] : L.glow, k * (0.55 + 0.35 * t));
            g.fillRect(Math.round(hx + Math.cos(a) * rr * squash), Math.round(hy + Math.sin(a) * rr), Math.max(1, Math.round(w * Math.max(Math.abs(squash), 0.5))), Math.max(1, Math.round(w * 0.7)));
        }
        for (let i = 0; i < 16; i++) {                                               // purple smoke wound round it
            const t = now / 700 + i * 0.4, x = hx + Math.cos(t) * (10 + Math.sin(i) * 1.5) * squash, y = hy + Math.sin(t) * (10 + Math.cos(i) * 1.5);
            g.fillStyle = rgba(L.glow, k * (0.25 + 0.35 * (i / 16))); g.fillRect(Math.round(x), Math.round(y), 2, 1);
        }
    }
    /** Gravity: a purple vortex turning under the feet with rock shards circling it (on the ground: always behind). */
    function luciferoVortex(g, cx, base, L, k, now) {
        g.fillStyle = rgba([12, 4, 22], 0.6 * k); g.beginPath(); g.ellipse(cx, base - 1, 15, 5, 0, 0, Math.PI * 2); g.fill();
        for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 40; s++) {           // three spiral arms
            const t = s / 40, a = -now / 500 + arm * (Math.PI * 2 / 3) + t * 5, rr = 2 + t * 13;
            g.fillStyle = rgba(t < 0.4 ? [240, 190, 255] : L.glow, k * (0.95 - t * 0.6));
            g.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(base - 1 + Math.sin(a) * rr * 0.32), 1, 1);
        }
        for (let i = 0; i < 6; i++) {                                                // rock shards in orbit
            const a = now / (900 + i * 90) + i * 1.05, rr = 15 + (i % 3) * 3, lift = 3 + (i % 2) * 5 + Math.sin(now / 400 + i) * 1.5;
            const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(base - 1 + Math.sin(a) * rr * 0.32 - lift);
            g.fillStyle = rgba([58, 48, 72], 0.95 * k); g.fillRect(x, y, 2, 2);
            g.fillStyle = rgba([120, 104, 140], 0.95 * k); g.fillRect(x, y, 1, 1);
        }
    }
    /** A shoulder piece, drawn by `paint(px, py, outward)` in its own pixels: placed on the shoulder for the facing.
     *  `outward` is the screen direction away from the body (+1 / -1); the piece narrows as it turns edge on. */
    function shoulder(P, cx, side, reach = 7) {
        const X = cx + sx(P, side * reach, 0), D = dz(P, side * reach, 0);
        const out = Math.sign(sx(P, side, 0)) || (side * (P.s >= 0 ? -1 : 1));
        const scale = Math.max(Math.abs(P.c), 0.45);
        return { X, D, out, scale, at: (lx) => Math.round(cx + sx(P, side * (reach - 7), 0) + out * lx * scale) };
    }
    const shoulderLayer = (layer, D) => (layer === 'back' ? D < -2 : D >= -2);   // on top of the shoulder, unless round the far side
    function luciferoPauldrons(g, cx, base, L, k, P, layer) {
        const sh = base - SHOULDERS;
        for (const side of [-1, 1]) {
            const S = shoulder(P, cx, side);
            if (!shoulderLayer(layer, S.D)) continue;
            for (let j = 0; j < 3; j++) for (let i = 0; i < 6 - j * 2; i++) {        // a layered pauldron
                g.fillStyle = rgba(j === 2 ? [110, 96, 136] : j ? [74, 62, 94] : [36, 28, 48], 0.97 * k);
                g.fillRect(S.at(5 + i + j), sh - 1 + j - 1, 1, 1);
            }
            for (let n = 0; n < 3; n++) for (let s = 0; s < 4 - n; s++) {             // three spikes, swept out and up
                g.fillStyle = rgba(s === 3 - n ? [140, 124, 168] : [54, 44, 70], 0.97 * k);
                g.fillRect(S.at(6 + n * 2 + s * 0.7), sh - 2 - s - (n === 1 ? 1 : 0), 1, 1);
            }
        }
    }
    /** The torn skirt: strips all round the waist (not over the tabard, front or back), flaring out as they fall. */
    function luciferoSkirt(g, cx, base, k, P, view, now, layer) {
        for (let n = 0; n < 20; n++) {
            const side = n < 10 ? 1 : -1, psi = side * (37 + (n % 10) * 11.8) * DEG;   // 37°..143° on each side
            const x = 10 * Math.sin(psi), z = 10 * Math.cos(psi);
            const D = dz(P, x, z);
            if (!inLayer(layer, D)) continue;
            const X = cx + sx(P, x, z), outward = Math.sign(X - cx) || 1, i = Math.round(x);
            const len = 6 + Math.round(hash(n, 3) * 7), sway = Math.round(Math.sin(now / 400 + n * 0.7) * (moving(view) ? 1.5 : 0.5));
            for (let j = 0; j < len; j++) {
                g.fillStyle = rgba(j > len - 3 ? [58, 26, 86] : i % 2 ? [106, 46, 150] : [74, 34, 108], 0.95 * k);
                g.fillRect(Math.round(X + (j > 2 ? sway * outward : 0) + j * 0.25 * outward), base - 14 + j, 1, 1);
            }
        }
    }
    /** Lucifero: four arms of shadow out of the back, the upper pair raised, the lower reaching out, clawed. Each
     *  joint has a place in the body's space, so in profile the raised pair stands behind you and the lower pair
     *  reaches ahead, and from behind they grow out of your back over the body. */
    const ARMS = [   // [elbow x, y, z], [hand x, y, z] (x outward), from a root on the shoulder blade (x 5, z -3)
        { elbow: [13, -6, -6], hand: [15, -19, -8], ph: 0 },
        { elbow: [14, 2, -2], hand: [22, -2, 4], ph: 1.7 }
    ];
    function shadowArms(g, cx, base, L, k, P, now, layer) {
        const sh = base - SHOULDERS + 2;
        const pt = (side, [x, y, z], sway = 0) => [cx + sx(P, side * x, z), sh + y + sway];
        for (const side of [-1, 1]) for (const A of ARMS) {
            const D = (dz(P, side * 5, -3) + dz(P, side * A.elbow[0], A.elbow[2])) / 2;
            if (!inLayer(layer, D)) continue;
            const sway = Math.sin(now / 520 + A.ph + side) * 1.5;
            const root = pt(side, [5, 0, -3]), elbow = pt(side, A.elbow, sway * 0.5), hand = pt(side, A.hand, sway);
            const sd = Math.sign(hand[0] - root[0]) || side;
            limb(g, [root, elbow, hand], 8, 5, [22, 14, 32], L, k);                           // outline
            limb(g, [root, elbow, hand], 6, 3.5, [62, 48, 82], L, k);
            limb(g, [[root[0], root[1] + 1], [elbow[0], elbow[1] + 1.5], [hand[0], hand[1] + 1]], 2, 1.2, [36, 26, 50], L, 0.6 * k);   // the shade under it
            for (let t = 0.15; t < 0.95; t += 0.08) {                                          // purple light in the cracks
                const p = t < 0.5 ? [root[0] + (elbow[0] - root[0]) * t * 2, root[1] + (elbow[1] - root[1]) * t * 2] : [elbow[0] + (hand[0] - elbow[0]) * (t - 0.5) * 2, elbow[1] + (hand[1] - elbow[1]) * (t - 0.5) * 2];
                if (hash(Math.round(t * 50), side + 3) > 0.45) { g.fillStyle = rgba(L.glow, 0.85 * k); g.fillRect(Math.round(p[0]), Math.round(p[1] + (hash(t * 9, 1) - 0.5) * 2), 1, 1); }
            }
            g.fillStyle = rgba([24, 16, 34], 0.97 * k); g.fillRect(Math.round(hand[0] - 3.5), Math.round(hand[1] - 2.5), 7, 5); g.fillRect(Math.round(hand[0] - 2.5), Math.round(hand[1] - 3.5), 5, 7);   // the hand, outlined
            g.fillStyle = rgba([62, 48, 82], 0.97 * k); g.fillRect(Math.round(hand[0] - 2.5), Math.round(hand[1] - 2.5), 5, 5);
            g.fillStyle = rgba([110, 94, 136], 0.97 * k); g.fillRect(Math.round(hand[0] - 2.5), Math.round(hand[1] - 2.5), 5, 1);
            const reach = Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) > 1 ? Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) : (sd > 0 ? 0 : Math.PI);
            for (let cl = -1.5; cl <= 1.5; cl += 1) {                                          // four hooked claws, pale at the tips
                const a = reach + cl * 0.5;
                for (let s = 2; s <= 7; s += 0.5) { g.fillStyle = rgba(s >= 6 ? [196, 180, 220] : s < 3 ? [24, 16, 34] : [96, 80, 120], 0.97 * k); g.fillRect(Math.round(hand[0] + Math.cos(a + s * 0.16 * sd) * (s + 1)), Math.round(hand[1] + Math.sin(a + s * 0.16 * sd) * (s + 1)), 1, 1); }
            }
        }
    }

    // Lucifero's plate, drawn over the hero's body after Tokelo's design picture: layered chevron plates down the chest
    // with a purple glow in the middle, a belt with a buckle, a torn purple skirt and plated legs. The front grid is the
    // design (left half, mirrored); the profile shows the chest's curve with the glow at its edge, the tabard hanging
    // in front and the legs one behind the other; from behind the plates go dark (no glow).
    const half = (rows) => rows.map((r) => r + [...r].reverse().join(''));
    const PLATE = {
        colours: { o: '#120c1a', d: '#2a2238', m: '#463a5a', l: '#8a7aa6', g: '#c060ff', w: '#f4d8ff', b: '#3e3046', k: '#a898b8', p: '#6a2e96', q: '#3a1a56' },
        rows: half([
            '....ooo', '..oodmm', '..ooooo', '.odmmdd', 'odlmddg', 'odmldgw', 'oddlmgw', 'odmdlgg', 'olddmlg', 'odlmddm', 'oddmlmd',
            'obbbbbb', 'obkbbbk', 'oqpqdpq', 'oqpdqpd', '.oqpdpm', '.odlmoq', '.omdlop', '.odmdop', '.olmdoq',
            '.odlmo.', '.odmdo.', 'oddmdo.', 'odmmdo.', 'oolllo.', 'ooooo..']),
        side: [
            '..oooooo..', '.oddmmmdo.', '.oooooooo.', '.odmmddmo.', 'odlmddmgo.', 'odmlddmgwo', 'oddlmdmgwo', 'odmdlddggo', 'olddmlddgo', 'odlmddmmdo', 'oddmlmddo.',
            'obbbbbbbbo', 'obkbbbbkbo', '.odqpqpqpo', '.odpqdpqpo', '.odmpdpqo.', '..odlmdo..', '..omdlmo..', '..odmdmo..', '..olmdmo..',
            '..odlmdo..', '..odmdmo..', '..oddmdoo.', '..odmmmdo.', '..oolllloo', '..ooooooo.'],
        backMap: { g: 'd', w: 'm' }
    };
    function plate(g, cx, base, k, P, view, now) {
        const rows = gridAt(PLATE, P), W = rows[0].length;
        const shift = P.kind === 'side' ? (P.flip ? 0 : -1) : P.kind === 'front34' || P.kind === 'back34' ? (P.flip ? 1 : -1) : 0;
        const x0 = Math.round(cx - W / 2) + shift, y0 = base - rows.length;
        const stride = moving(view) ? Math.round(Math.sin(now / 120)) : 0;
        rows.forEach((row, j) => [...row].forEach((ch, i) => {
            if (ch === '.') return;
            const leg = j >= 16 && ch !== 'p' && ch !== 'q' ? (i < W / 2 ? stride : -stride) : 0;   // the legs step with the walk, the tabard hangs
            g.globalAlpha = k * (ch === 'g' || ch === 'w' ? 0.75 + 0.25 * Math.sin(now / 420) : 1);
            g.fillStyle = PLATE.colours[ch] || PLATE.colours.d; g.fillRect(x0 + i, y0 + j + Math.min(0, leg), 1, 1);
        }));
        g.globalAlpha = 1;
    }

    // --- Beelzebub (space) -----------------------------------------------------------------------------------------
    function beelzebubHalo(g, cx, base, L, k, P, now) {
        const y = base - HEAD - 2, pulse = 0.7 + 0.3 * Math.sin(now / 380);
        haloRing(g, P, cx, y, 11, -4, (x, yy, t) => {
            if (Math.abs(Math.sin(t * 3 + 0.4)) < 0.12) return;                       // three cracks in the ring
            g.fillStyle = rgba(L.glow, 0.8 * k * pulse); g.fillRect(x, yy, 1, 1);
        });
    }
    function beelzebubShards(g, cx, base, L, k, P, layer) {
        const y = base - SHOULDERS;
        for (const side of [-1, 1]) {
            const S = shoulder(P, cx, side);
            if (!shoulderLayer(layer, S.D)) continue;
            for (let j = 0; j < 3; j++) {
                const h = 6 - j * 1.5;
                for (let s = 0; s < h; s++) {
                    g.fillStyle = s > h - 2 ? rgba(L.glow, 0.9 * k) : rgba([58, 44, 104], 0.95 * k);
                    g.fillRect(S.at(6 + j * 2 + s * 0.5), Math.round(y - s - j), 1, 1);
                }
            }
        }
    }
    /** Flies turning round you, in front of you or behind you as they circle. */
    function flies(g, cx, base, k, P, now, layer) {
        for (let i = 0; i < 6; i++) {
            const a = now / (260 + i * 40) + i * 1.7, r = 12 + (i % 3) * 3, x = Math.cos(a) * r, z = Math.sin(a) * r;
            if (!inLayer(layer, dz(P, x, z))) continue;
            g.fillStyle = rgba([12, 14, 10], 0.9 * k);
            g.fillRect(Math.round(cx + sx(P, x, z)), Math.round(base - SHOULDERS + Math.sin(a * 1.3) * 8), 1, 1);
        }
    }
    /** Beelzebub: a spider from the hips down (Tokelo: "the player legs are spider legs"). The sprite is drawn cut off
     *  at the hips (LOWER.hips, ui/world-render.js clips it), and here a violet-glass spider body takes its place: a
     *  thorax at the hips, an abdomen behind you, and eight jointed legs fanned round you that step when you move. */
    // Tokelo (16:06): "give it to beelzebub", on his first look (halo, shards, flies; no fox).
    const LOWER = { beelzebub: { hips: 12 } };
    const LEG_FAN = [55, 20, -20, -55];   // each pair's angle from straight out to the side, + toward the front
    function spiderBody(g, cx, base, L, k, P, view, now, layer, hips = 12) {
        const hip = base - hips, walk = moving(view) ? now / 95 : now / 900;
        const abdomen = () => {                                                       // behind you: long in profile
            const X = cx + sx(P, 0, -7), ay = hip - 2 + Math.sin(now / 700) * 0.5;
            const rx = 7 * Math.abs(P.c) + 9 * Math.abs(P.s), ry = 5;
            for (let j = -ry; j <= ry; j++) for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) {
                const d = Math.hypot(i / rx, j / ry);
                if (d > 1) continue;
                const c = d > 0.85 ? [8, 6, 26] : (Math.abs(i) < 1.5 && Math.abs(j) < 3.5 && j % 2 === 0) ? L.glow : [36 + Math.round((1 - d) * 26), 26 + Math.round((1 - d) * 18), 70 + Math.round((1 - d) * 40)];
                g.fillStyle = rgba(c, 0.97 * k); g.fillRect(Math.round(X + i), Math.round(ay + j), 1, 1);
            }
        };
        const thorax = () => {                                                        // over the hips
            for (let j = -3; j <= 2; j++) for (let i = -5; i <= 5; i++) {
                if (Math.hypot(i / 5, j / 3) > 1) continue;
                g.fillStyle = rgba(Math.hypot(i / 5, j / 3) > 0.75 ? [8, 6, 26] : [58, 44, 104], 0.97 * k); g.fillRect(cx + i, hip + j + 1, 1, 1);
            }
        };
        const aD = dz(P, 0, -7);
        if (layer === 'back' && aD < 0) abdomen();
        // Eight legs, four a side, fanned from front to back; whichever side of the body each one is on.
        for (const side of [-1, 1]) LEG_FAN.forEach((deg, n) => {
            const b = deg * DEG, ox = side * Math.cos(b), oz = Math.sin(b);
            const D = dz(P, ox * 8, oz * 8);
            if (!inLayer(layer, D)) return;
            const step = Math.sin(walk + n * 1.6 + (side > 0 ? Math.PI : 0)) * (moving(view) ? 2.5 : 0.5);
            const rk = 6 + n * 1.2, rf = rk + 5 + n + step;
            const at = (r, y) => [cx + sx(P, side * 3 + ox * r, oz * r), y];
            const rootP = at(0, hip + 1), knee = at(rk, hip - 6 + n * 1.5 - Math.max(0, step)), foot = at(rf, base - 1 - Math.max(0, step) * 0.6);
            limb(g, [rootP, knee, foot], 2.6, 1.2, D >= 0 ? [44, 32, 84] : [28, 20, 56], L, k);
            g.fillStyle = rgba(L.glow, 0.9 * k); g.fillRect(Math.round(knee[0]), Math.round(knee[1]), 1, 1);   // a glinting joint
        });
        if (layer === 'front') { thorax(); if (aD >= 0) abdomen(); }               // from behind the abdomen is in front of you
    }
    /** How many px of the sprite's legs to hide while merged (only a demon that replaces the legs), else 0. */
    const lowerBody = (st) => (st && st.k > 0.5 && LOWER[st.id] ? LOWER[st.id].hips : 0);

    // --- Slotos (toughness) ----------------------------------------------------------------------------------------
    function slotosHeat(g, cx, base, L, k) {                                          // heat coming off the shell
        const grad = g.createRadialGradient(cx, base - SHOULDERS, 0, cx, base - SHOULDERS, 18);
        grad.addColorStop(0, rgba(L.glow, 0.22 * k)); grad.addColorStop(1, rgba(L.glow, 0));
        g.fillStyle = grad; g.fillRect(cx - 18, base - SHOULDERS - 18, 36, 36);
    }
    function slotosPauldrons(g, cx, base, L, k, P, view, layer) {
        const y = base - SHOULDERS;
        for (const side of [-1, 1]) {
            const S = shoulder(P, cx, side);
            if (!shoulderLayer(layer, S.D)) continue;
            const x0 = Math.min(S.at(4), S.at(10)), w = Math.max(2, Math.abs(S.at(10) - S.at(4)));
            g.fillStyle = rgba([60, 48, 44], 0.95 * k); g.fillRect(x0, y - 2, w, 4);
            g.fillStyle = rgba(L.glow, 0.85 * k); g.fillRect(x0, y + 1, w, 1);              // the seam
            if (!helmOn('slotos', view)) for (let s = 0; s < 6; s++) {                        // the tusk curls up
                g.fillStyle = rgba([226, 212, 186], 0.95 * k);
                g.fillRect(S.at(9 + s * 0.7), Math.round(y - 2 - s + (s * s) * 0.12), 1, 1);
            }
        }
    }
    function slotosSeams(g, cx, base, L, k, P, view, now) {                            // orange heat in the chest (or back) seams
        if (Math.abs(P.c) < 0.3) return;
        const seam = 0.5 + 0.5 * Math.sin(now / 260), w = Math.abs(P.c), off = Math.round(sx(P, 0, 3));
        g.fillStyle = rgba(L.glow, 0.5 * k * seam);
        g.fillRect(Math.round(cx + off - 4 * w), base - SHOULDERS + 6, Math.max(2, Math.round(8 * w)), 1);
        g.fillRect(Math.round(cx + off - 3 * w), base - SHOULDERS + 10, Math.max(2, Math.round(6 * w)), 1);
    }
    function slotosSparks(g, cx, base, k, view, now) {                                 // sparks when you are hit
        if (!(view && view.anim === 'hurt' && view.animT != null && view.animT < 200)) return;
        for (let i = 0; i < 8; i++) {
            const a = hash(i, Math.floor(now / 60)) * Math.PI * 2, d = 4 + view.animT / 20;
            g.fillStyle = rgba([255, 220, 140], 0.9 * k); g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(base - SHOULDERS + Math.sin(a) * d), 1, 1);
        }
    }

    // --- Plumede (agility) -----------------------------------------------------------------------------------------
    /** Black feather wings folded at the back, flung wide on a dash: each feather runs out, down and back from the
     *  shoulder blades, so in profile the wings trail behind you and from behind they cover your back. */
    function plumedeWings(g, cx, base, L, k, P, view, now, layer) {
        const open = dashing(view) ? 1 : 0.5 + 0.05 * Math.sin(now / 500);
        const ry = base - SHOULDERS - 2;
        for (const side of [-1, 1]) {
            if (!inLayer(layer, dz(P, side * 8, -6))) continue;
            for (let f = 0; f < 5; f++) {
                const ang = 1.25 - open * (0.35 + f * 0.32) + f * 0.06;   // below the horizontal: folded they hang, open they fan up
                const ux = Math.cos(ang), uy = Math.sin(ang), back = 0.55 - f * 0.05, len = (12 + f * 3) * (0.7 + open * 0.5);
                for (let s = 0; s < len; s += 0.8) {
                    const w = Math.max(0.6, 2.4 * (1 - s / len));
                    for (let o = -w; o <= w; o += 1) {
                        const bx = side * (3 + ux * s) - uy * o * side, by = uy * s + ux * o, bz = -3 - back * s;
                        g.fillStyle = Math.abs(o) > w - 1 && s > len * 0.6 ? rgba(L.glow, 0.7 * k) : rgba([10, 10, 16], 0.92 * k);
                        g.fillRect(Math.round(cx + sx(P, bx, bz)), Math.round(ry + by), 1, 1);
                    }
                }
            }
        }
    }
    function plumedeMask(g, cx, base, L, k, P, view) {                                // a half mask of black feathers
        if (P.c < 0.3 || helmOn('plumede', view)) return;
        const y = base - HEAD - 1, w = Math.round(10 * P.c), x = Math.round(cx + sx(P, 0, 4) - w / 2);
        g.fillStyle = rgba([10, 10, 16], 0.9 * k); g.fillRect(x, y - 1, w, 2);
        g.fillStyle = rgba(L.glow, 0.8 * k); g.fillRect(x, y - 2, w, 1);
    }
    function plumedeShed(g, cx, base, L, k, view, now) {                               // feathers shed behind you on the move
        if (!(moving(view) || dashing(view))) return;
        for (let i = 0; i < 6; i++) {
            const life = (now / 600 + hash(i, 5)) % 1, x = cx + (hash(i, 6) - 0.5) * 18, y = base - 6 - hash(i, 9) * 20 + life * 8;
            g.fillStyle = rgba([10, 10, 16], 0.85 * k * (1 - life)); g.fillRect(Math.round(x), Math.round(y), 3, 1);
            g.fillStyle = rgba(L.glow, 0.6 * k * (1 - life)); g.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
    }

    // --- the animal helms (Tokelo 2026-11-17: "more animalistic ... owl or wild bore"; Lucifero's hood after the
    // design picture). Tokelo (16:00): not the merge's everyday look; each comes on with one union skill and goes with
    // it. Each has a front grid (left half, mirrored), a profile facing right, and a back in the dark colours.
    const BACK = { p: 'm', e: 'm', b: 'm', s: 'm', n: 'm', w: 'm', l: 'm', g: 'm', t: 'm' };
    const HELMS = {
        // Lucifero's spiked hood-helm (Tokelo's reference: the face in shadow, violet eyes). Tokelo (2026-11-17 18:58):
        // "take the helm off and apply to a skill like the others": it comes on for CAST_SHOW_MS after Heavy Field.
        lucifero: { top: 41, skill: 'Heavy Field', colours: { o: '#0c0a12', d: '#2a2238', m: '#463a5a', l: '#7a6c96', s: '#08060c', e: '#f0a0ff', g: '#a040e0', h: '#1a1424' },
            rows: half([
                '........o', '.......ol', '......odl', '.....oddm', '...ooddmm', '..ohdddmm', '.ohddmmdm', '.ohdmddsd',
                'ohhdssss', 'ohdmseess', 'ohdmsgees', 'ohdmssssg', '.ohdmssss', '.ohhdmsss', '..ohhdmss', '...ooohhd'].map((r) => r.padEnd(9, 's').slice(0, 9))),
            side: [
                '.......oo.......', '......olo.......', '.....odlo.......', '....oddmmo......', '..oodddmmmoo....', '.ohhddmmmmddo...', 'ohhddmmdmmmddo..', 'ohdmddmmddsddo..',
                'ohdmdddddsssso..', 'ohdmdddsssseso..', 'ohdmddssssgeso..', 'ohdmdddsssssso..', '.ohdmddssssso...', '.ohhdmmdssso....', '..ohhdmmddso....', '...ooohhhhoo....'] },
        plumede: { top: 41, skill: 'Fleet Form', colours: { o: '#07070c', d: '#15151f', m: '#2a2a3a', l: '#4a4a62', p: '#d8d4e8', e: '#fff6c0', b: '#b09048' },
            rows: half([
                '..oo......', '.odo......', '.oddo.....', '.odmdooooo', '..odmmmmmm', '..odddmmmm', '.odpppddmm', 'odppeepdmm',
                'odpeeeepdm', 'odpeeeepdb', 'odppeepddb', '.odpppdmmo', '.oddddmmmm', '..odddmmmm', '...oddddmm', '....oooooo']),
            side: [
                '.oo.............', '.odo............', '.oddo...........', '.odmdooooooo....', '..odmmmmmmmmo...', '..odddmmmmmmmo..', '.oddddmmmpppdo..', 'odddmmmmppeeppo.',
                'oddmmmmmpeeeepo.', 'oddmmmmmpeeeepbo', 'oddmmmmmppeeppbo', '.oddmmmmmpppdbo.', '.oddddmmmmmmmo..', '..odddmmmmmmo...', '...oddddmmmo....', '....oooooooo....'] },
        slotos: { top: 40, skill: 'Iron Hide', colours: { o: '#140f0e', d: '#33282a', m: '#5c4a44', l: '#8e7a6a', s: '#a07a68', n: '#140f0e', t: '#f0e4c8', e: '#ffb050', r: '#1e1716' },
            rows: half([
                '...o....rr', '..odo..rrr', '..oddoorrd', '.odddddddm', '.oddmmmmmm', '.odmmmmmmm', 'odmeemmmmm', 'odmmmmmmmm',
                'odmmmmmlll', '.odmmmllss', 't.odmlssss', 't.odmssnss', 'tt.odsssss', '.tt.osssss', '..t..ooooo']),
            side: [
                '...o..............', '..odo.............', '..oddoorrr........', '.odddddrrrro......', '.oddmmmmmmmdo.....', '.odmmmmmmmmmdo....', 'odmmmmmmeemmmdo...', 'odmmmmmmmmmmmmdoo.',
                'odmmmmmmmmmllllllo', '.odmmmmmmllsssssno', '.odmmmmmlssssssso.', '..odmmmlsssstto...', '..odmmssssstto....', '...odsssssoot.....', '....ooooooo.......'] }
    };
    // The profiles reach one pixel further each way than the head they cover (the back of the hair, the nose).
    const widen = (rows) => rows.map((r) => {
        const a = [...r], i1 = a.length - 1 - [...a].reverse().findIndex((ch) => ch !== '.');
        if (i1 > 1 && i1 < a.length) a.splice(i1, 0, a[i1 - 1]);
        if (a[0] !== '.') a.splice(1, 0, a[1]); else a.unshift('.');
        return a.join('').padEnd(r.length + 2, '.');
    });
    for (const H of Object.values(HELMS)) { H.backMap = BACK; H.side = widen(H.side); }
    /** How long a skill that leaves no status on you (Heavy Field) still counts as on, after the cast: its slow's 6 s. */
    const CAST_SHOW_MS = 6000;
    /** Is the helm on? Only while its skill's status is on you, or it was cast in the last CAST_SHOW_MS (view.statuses:
     *  the names, from ui/world-ui.js). */
    const helmOn = (id, view) => !!(HELMS[id] && (HELMS[id].always || (view && Array.isArray(view.statuses) && view.statuses.includes(HELMS[id].skill))));
    function helm(g, cx, base, id, k, P, view, now) {
        const H = HELMS[id];
        if (!H || !helmOn(id, view)) return;
        const rows = gridAt(H, P), W = rows[0].length, bob = Math.round(Math.sin(now / 650) * 0.4);
        const shift = P.kind === 'side' && P.flip ? -1 : 0;
        const x0 = Math.round(cx - W / 2) + shift, y0 = base - H.top + bob;
        rows.forEach((row, j) => [...row].forEach((ch, i) => {
            if (ch === '.') return;
            g.globalAlpha = k * (ch === 'e' ? 0.85 + 0.15 * Math.sin(now / 300) : 1);
            g.fillStyle = H.colours[ch] || H.colours.d; g.fillRect(x0 + i, y0 + j, 1, 1);
        }));
        g.globalAlpha = 1;
    }

    /** A jointed limb: thick at the root, thin at the tip, dark with a rim of the demon's glow. */
    function limb(g, pts, w0, w1, dark, L, k) {
        const total = pts.length - 1;
        for (let s = 0; s < total; s++) {
            const [ax, ay] = pts[s], [bx, by] = pts[s + 1], len = Math.max(0.01, Math.hypot(bx - ax, by - ay));
            for (let t = 0; t <= len; t += 0.6) {
                const u = (s + t / len) / total, w = w0 + (w1 - w0) * u, x = ax + (bx - ax) * t / len, y = ay + (by - ay) * t / len;
                g.fillStyle = rgba(dark, 0.95 * k); g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), Math.max(1, Math.round(w)), Math.max(1, Math.round(w)));
                if (Math.round(t / 0.6) % 4 === 0) { g.fillStyle = rgba(L.glow, 0.45 * k); g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), 1, 1); }
            }
        }
    }

    // --- each demon, one layer at a time ('back': before the body, 'front': after it) ---------------------------------
    const DRAW = {
        lucifero(g, cx, base, L, k, P, view, now, layer) {
            if (layer === 'back') luciferoVortex(g, cx, base, L, k, now);
            if (inLayer(layer, dz(P, 0, -5) - 0.01)) luciferoHalo(g, cx, base, L, k, P, now);
            shadowArms(g, cx, base, L, k, P, now, layer);
            if (layer === 'front') plate(g, cx, base, k, P, view, now);
            luciferoSkirt(g, cx, base, k, P, view, now, layer);
            luciferoPauldrons(g, cx, base, L, k, P, layer);
        },
        beelzebub(g, cx, base, L, k, P, view, now, layer) {
            if (inLayer(layer, dz(P, 0, -4) - 0.01)) beelzebubHalo(g, cx, base, L, k, P, now);
            spiderBody(g, cx, base, L, k, P, view, now, layer, LOWER.beelzebub.hips);
            beelzebubShards(g, cx, base, L, k, P, layer);
            flies(g, cx, base, k, P, now, layer);
        },
        slotos(g, cx, base, L, k, P, view, now, layer) {
            if (layer === 'back') { slotosHeat(g, cx, base, L, k); return; }
            slotosSeams(g, cx, base, L, k, P, view, now);
            slotosPauldrons(g, cx, base, L, k, P, view, 'front');
            slotosSparks(g, cx, base, k, view, now);
        },
        plumede(g, cx, base, L, k, P, view, now, layer) {
            plumedeWings(g, cx, base, L, k, P, view, now, layer);
            if (layer === 'front') { plumedeMask(g, cx, base, L, k, P, view); plumedeShed(g, cx, base, L, k, view, now); }
        }
    };

    /** Before the body: smoke, and whatever of the demon is behind you at this facing. */
    function behind(g, cx, base, st, view, now) {
        const L = st && LOOKS[st.id];
        if (!L) return;
        const P = pose(view);
        g.save();
        try {
            smoke(g, cx, base, L, st.k, now);
            if (st.id === 'slotos') slotosPauldrons(g, cx, base, L, st.k, P, view, 'back');
            DRAW[st.id](g, cx, base, L, st.k, P, view, now, 'back');
        } finally { g.restore(); }
    }
    /** After the body: the rest of the demon, the helm, and the burst of a fresh merge. */
    function front(g, cx, base, st, view, now) {
        const L = st && LOOKS[st.id];
        if (!L) return;
        const P = pose(view);
        g.save();
        try {
            DRAW[st.id](g, cx, base, L, st.k, P, view, now, 'front');
            helm(g, cx, base, st.id, st.k, P, view, now);
            burst(g, cx, base, L, st.burst);
        } finally { g.restore(); }
    }

    const api = { LOOKS, HELMS, PLATE, CAST_SHOW_MS, YAW, helmOn, palette, state, reset, behind, front, lowerBody, pose, gridAt };
    ENSO.unionFx = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
