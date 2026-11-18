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
 *
 *   ENSO.unionFx.palette(id)                                the sprite palette override for the armor
 *   ENSO.unionFx.behind(g, cx, base, id, view, now)         before the body (after it when you face away)
 *   ENSO.unionFx.front(g, cx, base, id, view, now)          after the body.  cx, base: the sprite's feet
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

    const away = (view) => String((view && (view.facing8 || view.facing)) || 'down').startsWith('up');
    const moving = (view) => !!(view && (view.moving || view.gait === 'walk'));
    const dashing = (view) => !!(view && view.anim === 'dodge');

    // --- behind the body ---------------------------------------------------------------------------------------
    const BEHIND = {
        // Gravity: a dark well at the feet with grit dragged into it.
        // Gravity: a purple vortex turning under the feet with rock shards circling it, and a black halo wrapped in
        // purple smoke standing behind the head.
        lucifero(g, cx, base, L, k, view, now) {
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
            const hy = base - HEAD_TOP - 8;                                              // the halo, upright over the head
            for (let s = 0; s < 72; s++) {
                const t = (s / 72) * Math.PI * 2, x = Math.round(cx + Math.cos(t) * 9), y = Math.round(hy + Math.sin(t) * 9);
                g.fillStyle = rgba([6, 2, 10], 0.95 * k); g.fillRect(x, y, 2, 2);
            }
            for (let s = 0; s < 34; s++) {                                               // a thick curl of smoke over its top-left
                const t = s / 34, a = Math.PI * (0.85 + t * 0.9) + Math.sin(now / 900) * 0.08, rr = 10 + t * 3 + Math.sin(t * 6 + now / 500) * 0.6;
                const w = t < 0.8 ? 3 - t * 2 : 1;
                g.fillStyle = rgba(t > 0.6 ? [230, 160, 255] : L.glow, k * (0.55 + 0.35 * t));
                g.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(hy + Math.sin(a) * rr), Math.max(1, Math.round(w)), Math.max(1, Math.round(w * 0.7)));
            }
            for (let i = 0; i < 16; i++) {                                               // purple smoke wound round it
                const t = now / 700 + i * 0.4, x = cx + Math.cos(t) * (10 + Math.sin(i) * 1.5), y = hy + Math.sin(t) * (10 + Math.cos(i) * 1.5);
                g.fillStyle = rgba(L.glow, k * (0.25 + 0.35 * (i / 16))); g.fillRect(Math.round(x), Math.round(y), 2, 1);
            }
        },
        // Space: a cracked halo standing behind the head.
        beelzebub(g, cx, base, L, k, view, now) {
            const y = base - HEAD - 2, pulse = 0.7 + 0.3 * Math.sin(now / 380);
            for (let s = 0; s < 80; s++) {
                const t = (s / 80) * Math.PI * 2;
                if (Math.abs(Math.sin(t * 3 + 0.4)) < 0.12) continue;                 // three cracks in the ring
                g.fillStyle = rgba(L.glow, 0.8 * k * pulse); g.fillRect(Math.round(cx + Math.cos(t) * 11), Math.round(y + Math.sin(t) * 11), 1, 1);
            }
        },
        // Toughness: heat coming off the shell at the back.
        slotos(g, cx, base, L, k, view, now) {
            const grad = g.createRadialGradient(cx, base - SHOULDERS, 0, cx, base - SHOULDERS, 18);
            grad.addColorStop(0, rgba(L.glow, 0.22 * k)); grad.addColorStop(1, rgba(L.glow, 0));
            g.fillStyle = grad; g.fillRect(cx - 18, base - SHOULDERS - 18, 36, 36);
        },
        // Agility: black feather wings folded at the back, flung wide on a dash.
        plumede(g, cx, base, L, k, view, now) {
            const open = dashing(view) ? 1 : 0.5 + 0.05 * Math.sin(now / 500);
            for (const side of [-1, 1]) for (let f = 0; f < 5; f++) {
                // Angle below the horizontal: folded, the feathers hang down the back; open, they fan out and up.
                const ang = 1.25 - open * (0.35 + f * 0.32) + f * 0.06;
                const dx = side * Math.cos(ang), dy = Math.sin(ang), len = (12 + f * 3) * (0.7 + open * 0.5);
                const rx = cx + side * 3, ry = base - SHOULDERS - 2;
                for (let s = 0; s < len; s += 0.8) {
                    const w = Math.max(0.6, 2.4 * (1 - s / len));
                    for (let o = -w; o <= w; o += 1) {
                        const px = rx + dx * s - dy * o, py = ry + dy * s + dx * o;
                        g.fillStyle = Math.abs(o) > w - 1 && s > len * 0.6 ? rgba(L.glow, 0.7 * k) : rgba([10, 10, 16], 0.92 * k);
                        g.fillRect(Math.round(px), Math.round(py), 1, 1);
                    }
                }
            }
        }
    };

    // --- in front of the body ----------------------------------------------------------------------------------
    const FRONT = {
        // Spiked pauldrons, a torn skirt of plate and cloth, and purple light running down the chest.
        lucifero(g, cx, base, L, k, view, now) {
            const sh = base - SHOULDERS;
            for (const side of [-1, 1]) {
                for (let j = 0; j < 3; j++) for (let i = 0; i < 6 - j * 2; i++) {        // a layered pauldron
                    g.fillStyle = rgba(j === 2 ? [110, 96, 136] : j ? [74, 62, 94] : [36, 28, 48], 0.97 * k);
                    g.fillRect(Math.round(cx + side * (5 + i + j)), sh - 1 + j - 1, 1, 1);
                }
                for (let n = 0; n < 3; n++) for (let s = 0; s < 4 - n; s++) {             // three spikes, swept out and up
                    g.fillStyle = rgba(s === 3 - n ? [140, 124, 168] : [54, 44, 70], 0.97 * k);
                    g.fillRect(Math.round(cx + side * (6 + n * 2 + s * 0.7)), sh - 2 - s - (n === 1 ? 1 : 0), 1, 1);
                }
            }
            for (let i = -10; i <= 10; i++) {                                               // the torn skirt, flaring wide
                if (Math.abs(i) < 6) continue;
                const len = 6 + Math.round(hash(i, 3) * 7), sway = Math.round(Math.sin(now / 400 + i * 0.7) * (moving(view) ? 1.5 : 0.5));
                for (let j = 0; j < len; j++) {
                    g.fillStyle = rgba(j > len - 3 ? [58, 26, 86] : i % 2 ? [106, 46, 150] : [74, 34, 108], 0.95 * k);
                    g.fillRect(cx + i + (j > 2 ? sway * Math.sign(i) : 0) + Math.round(j * 0.25 * Math.sign(i)), base - 14 + j, 1, 1);
                }
            }
            plate(g, cx, base, k, view, now);
        },
        // Glass shards jutting from both shoulders, and flies turning round you.
        beelzebub(g, cx, base, L, k, view, now) {
            const y = base - SHOULDERS;
            for (const side of [-1, 1]) for (let j = 0; j < 3; j++) {
                const h = 6 - j * 1.5, x0 = cx + side * (6 + j * 2);
                for (let s = 0; s < h; s++) {
                    g.fillStyle = s > h - 2 ? rgba(L.glow, 0.9 * k) : rgba([58, 44, 104], 0.95 * k);
                    g.fillRect(Math.round(x0 + side * s * 0.5), Math.round(y - s - j), 1, 1);
                }
            }
            for (let i = 0; i < 6; i++) {
                const a = now / (260 + i * 40) + i * 1.7, r = 12 + (i % 3) * 3;
                g.fillStyle = rgba([12, 14, 10], 0.9 * k);
                g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(base - SHOULDERS + Math.sin(a * 1.3) * 8), 1, 1);
            }
        },
        // Tusked pauldrons and orange heat in the seams; sparks when you are hit (under Iron Hide the tusks are the boar's).
        slotos(g, cx, base, L, k, view, now) {
            const y = base - SHOULDERS;
            for (const side of [-1, 1]) {
                g.fillStyle = rgba([60, 48, 44], 0.95 * k); g.fillRect(Math.round(cx + side * 7 - 3), y - 2, 6, 4);
                g.fillStyle = rgba(L.glow, 0.85 * k); g.fillRect(Math.round(cx + side * 7 - 3), y + 1, 6, 1);   // the seam
                if (!helmOn('slotos', view)) for (let s = 0; s < 6; s++) {                                    // the tusk curls up
                    g.fillStyle = rgba([226, 212, 186], 0.95 * k);
                    g.fillRect(Math.round(cx + side * (9 + s * 0.7)), Math.round(y - 2 - s + (s * s) * 0.12), 1, 1);
                }
            }
            const seam = 0.5 + 0.5 * Math.sin(now / 260);
            g.fillStyle = rgba(L.glow, 0.5 * k * seam); g.fillRect(cx - 4, base - SHOULDERS + 6, 8, 1); g.fillRect(cx - 3, base - SHOULDERS + 10, 6, 1);
            if (view && view.anim === 'hurt' && view.animT != null && view.animT < 200) for (let i = 0; i < 8; i++) {
                const a = hash(i, Math.floor(now / 60)) * Math.PI * 2, d = 4 + view.animT / 20;
                g.fillStyle = rgba([255, 220, 140], 0.9 * k); g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(base - SHOULDERS + Math.sin(a) * d), 1, 1);
            }
        },
        // A half mask of black feathers (the owl's face under Fleet Form), and feathers shed behind you on the move.
        plumede(g, cx, base, L, k, view, now) {
            if (!away(view) && !helmOn('plumede', view)) {
                const y = base - HEAD - 1;
                g.fillStyle = rgba([10, 10, 16], 0.9 * k); g.fillRect(cx - 5, y - 1, 10, 2);
                g.fillStyle = rgba(L.glow, 0.8 * k); g.fillRect(cx - 5, y - 2, 10, 1);
            }
            if (moving(view) || dashing(view)) for (let i = 0; i < 6; i++) {
                const life = (now / 600 + hash(i, 5)) % 1, x = cx + (hash(i, 6) - 0.5) * 18, y = base - 6 - hash(i, 9) * 20 + life * 8;
                g.fillStyle = rgba([10, 10, 16], 0.85 * k * (1 - life)); g.fillRect(Math.round(x), Math.round(y), 3, 1);
                g.fillStyle = rgba(L.glow, 0.6 * k * (1 - life)); g.fillRect(Math.round(x), Math.round(y), 1, 1);
            }
        }
    };

    // --- second pass (Tokelo 2026-11-17: "can we add more animalistic characteristic like a head with the shape of an
    // owl or wild bore or fox ... other armors to grow extra arms or another one spider legs"; "the player legs are spider
    // legs"). Animal helms drawn as
    // pixel grids (left half, mirrored), and extra limbs drawn as jointed strokes. Plumede an owl, Slotos a wild boar,
    // Lucifero four shadow arms. Beelzebub keeps his first look and walks on a spider's legs.
    const half = (rows) => rows.map((r) => r + [...r].reverse().join(''));
    // Tokelo (16:00): the helms are not the merge's everyday look; each comes on with one union skill and goes with it.
    const HELMS = {
        // Lucifero's spiked hood-helm (Tokelo's reference: the face in shadow, violet eyes). Tokelo (2026-11-17 18:58):
        // "take the helm off and apply to a skill like the others": it comes on for CAST_SHOW_MS after Heavy Field.
        lucifero: { top: 41, skill: 'Heavy Field', colours: { o: '#0c0a12', d: '#2a2238', m: '#463a5a', l: '#7a6c96', s: '#08060c', e: '#f0a0ff', g: '#a040e0', h: '#1a1424' },
            rows: half([
                '........o', '.......ol', '......odl', '.....oddm', '...ooddmm', '..ohdddmm', '.ohddmmdm', '.ohdmddsd',
                'ohhdssss', 'ohdmseess', 'ohdmsgees', 'ohdmssssg', '.ohdmssss', '.ohhdmsss', '..ohhdmss', '...ooohhd'].map((r) => r.padEnd(9, 's').slice(0, 9))) },
        plumede: { top: 41, skill: 'Fleet Form', colours: { o: '#07070c', d: '#15151f', m: '#2a2a3a', l: '#4a4a62', p: '#d8d4e8', e: '#fff6c0', b: '#b09048' },
            rows: half([
                '..oo......', '.odo......', '.oddo.....', '.odmdooooo', '..odmmmmmm', '..odddmmmm', '.odpppddmm', 'odppeepdmm',
                'odpeeeepdm', 'odpeeeepdb', 'odppeepddb', '.odpppdmmo', '.oddddmmmm', '..odddmmmm', '...oddddmm', '....oooooo']) },
        slotos: { top: 40, skill: 'Iron Hide', colours: { o: '#140f0e', d: '#33282a', m: '#5c4a44', l: '#8e7a6a', s: '#a07a68', n: '#140f0e', t: '#f0e4c8', e: '#ffb050', r: '#1e1716' },
            rows: half([
                '...o....rr', '..odo..rrr', '..oddoorrd', '.odddddddm', '.oddmmmmmm', '.odmmmmmmm', 'odmeemmmmm', 'odmmmmmmmm',
                'odmmmmmlll', '.odmmmllss', 't.odmlssss', 't.odmssnss', 'tt.odsssss', '.tt.osssss', '..t..ooooo']) }
    };
    // Facing away you see the back of the helm: the face colours go dark.
    const BACK = { p: 'm', e: 'm', b: 'm', s: 'm', n: 'm', w: 'm', l: 'm' };
    /** How long a skill that leaves no status on you (Heavy Field) still counts as on, after the cast: its slow's 6 s. */
    const CAST_SHOW_MS = 6000;
    /** Is the helm on? Only while its skill's status is on you, or it was cast in the last CAST_SHOW_MS (view.statuses:
     *  the names, from ui/world-ui.js). */
    const helmOn = (id, view) => !!(HELMS[id] && (HELMS[id].always || (view && Array.isArray(view.statuses) && view.statuses.includes(HELMS[id].skill))));
    function helm(g, cx, base, id, k, view, now) {
        const H = HELMS[id];
        if (!H || !helmOn(id, view)) return;
        const back = away(view), bob = Math.round(Math.sin(now / 650) * 0.4);
        const x0 = cx - H.rows[0].length / 2, y0 = base - H.top + bob;
        H.rows.forEach((row, j) => [...row].forEach((ch, i) => {
            if (ch === '.') return;
            const c = H.colours[back && BACK[ch] ? BACK[ch] : ch];
            g.globalAlpha = k * (ch === 'e' && !back ? 0.85 + 0.15 * Math.sin(now / 300) : 1);
            g.fillStyle = c; g.fillRect(x0 + i, y0 + j, 1, 1);
        }));
        g.globalAlpha = 1;
    }

    /** A jointed limb: thick at the root, thin at the tip, dark with a rim of the demon's glow. */
    function limb(g, pts, w0, w1, dark, L, k) {
        const total = pts.length - 1;
        for (let s = 0; s < total; s++) {
            const [ax, ay] = pts[s], [bx, by] = pts[s + 1], len = Math.hypot(bx - ax, by - ay);
            for (let t = 0; t <= len; t += 0.6) {
                const u = (s + t / len) / total, w = w0 + (w1 - w0) * u, x = ax + (bx - ax) * t / len, y = ay + (by - ay) * t / len;
                g.fillStyle = rgba(dark, 0.95 * k); g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), Math.max(1, Math.round(w)), Math.max(1, Math.round(w)));
                if (Math.round(t / 0.6) % 4 === 0) { g.fillStyle = rgba(L.glow, 0.45 * k); g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), 1, 1); }
            }
        }
    }
    /** Lucifero: four arms of shadow out of the back, the upper pair raised, the lower reaching out, clawed. */
    // Lucifero's plate, drawn over the hero's body after Tokelo's design picture: layered chevron plates down the chest
    // with a purple glow in the middle, a belt with a buckle, a torn purple skirt and plated legs. One front-facing grid
    // (left half, mirrored); facing away, the glow goes dark.
    const PLATE = {
        colours: { o: '#120c1a', d: '#2a2238', m: '#463a5a', l: '#8a7aa6', g: '#c060ff', w: '#f4d8ff', b: '#3e3046', k: '#a898b8', p: '#6a2e96', q: '#3a1a56' },
        rows: half([
            '....ooo', '..oodmm', '..ooooo', '.odmmdd', 'odlmddg', 'odmldgw', 'oddlmgw', 'odmdlgg', 'olddmlg', 'odlmddm', 'oddmlmd',
            'obbbbbb', 'obkbbbk', 'oqpqdpq', 'oqpdqpd', '.oqpdpm', '.odlmoq', '.omdlop', '.odmdop', '.olmdoq',
            '.odlmo.', '.odmdo.', 'oddmdo.', 'odmmdo.', 'oolllo.', 'ooooo..'])
    };
    const PLATE_BACK = { g: 'd', w: 'm' };
    function plate(g, cx, base, k, view, now) {
        const back = away(view), x0 = cx - PLATE.rows[0].length / 2, y0 = base - PLATE.rows.length;
        const stride = moving(view) ? Math.round(Math.sin(now / 120)) : 0;
        PLATE.rows.forEach((row, j) => [...row].forEach((ch, i) => {
            if (ch === '.') return;
            const leg = j >= 16 && ch !== 'p' && ch !== 'q' ? (i < 7 ? stride : -stride) : 0;   // the legs step with the walk, the tabard hangs
            g.globalAlpha = k * (ch === 'g' || ch === 'w' ? 0.75 + 0.25 * Math.sin(now / 420) : 1);
            g.fillStyle = PLATE.colours[back && PLATE_BACK[ch] ? PLATE_BACK[ch] : ch]; g.fillRect(x0 + i, y0 + j + Math.min(0, leg), 1, 1);
        }));
        g.globalAlpha = 1;
    }
    function shadowArms(g, cx, base, L, k, view, now) {
        const sh = base - SHOULDERS + 2;
        for (const side of [-1, 1]) for (const [ex, ey, hx, hy, ph] of [[13, -6, 15, -19, 0], [14, 2, 22, -2, 1.7]]) {
            const sway = Math.sin(now / 520 + ph + side) * 1.5;
            const root = [cx + side * 5, sh], elbow = [cx + side * ex, sh + ey + sway * 0.5], hand = [cx + side * hx, sh + hy + sway];
            limb(g, [root, elbow, hand], 8, 5, [22, 14, 32], L, k);                           // outline
            limb(g, [root, elbow, hand], 6, 3.5, [62, 48, 82], L, k);
            limb(g, [[root[0], root[1] + 1], [elbow[0], elbow[1] + 1.5], [hand[0], hand[1] + 1]], 2, 1.2, [36, 26, 50], L, 0.6 * k);   // the shade under it
            // Purple light in the cracks, running down each arm.
            for (let t = 0.15; t < 0.95; t += 0.08) {
                const p = t < 0.5 ? [root[0] + (elbow[0] - root[0]) * t * 2, root[1] + (elbow[1] - root[1]) * t * 2] : [elbow[0] + (hand[0] - elbow[0]) * (t - 0.5) * 2, elbow[1] + (hand[1] - elbow[1]) * (t - 0.5) * 2];
                if (hash(Math.round(t * 50), side + 3) > 0.45) { g.fillStyle = rgba(L.glow, 0.85 * k); g.fillRect(Math.round(p[0]), Math.round(p[1] + (hash(t * 9, 1) - 0.5) * 2), 1, 1); }
            }
            g.fillStyle = rgba([24, 16, 34], 0.97 * k); g.fillRect(Math.round(hand[0] - 3.5), Math.round(hand[1] - 2.5), 7, 5); g.fillRect(Math.round(hand[0] - 2.5), Math.round(hand[1] - 3.5), 5, 7);   // the hand, outlined
            g.fillStyle = rgba([62, 48, 82], 0.97 * k); g.fillRect(Math.round(hand[0] - 2.5), Math.round(hand[1] - 2.5), 5, 5);
            g.fillStyle = rgba([110, 94, 136], 0.97 * k); g.fillRect(Math.round(hand[0] - 2.5), Math.round(hand[1] - 2.5), 5, 1);
            for (let c = -1.5; c <= 1.5; c += 1) {                                 // four hooked claws, pale at the tips
                const a = Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) + c * 0.5;
                for (let s = 2; s <= 7; s += 0.5) { g.fillStyle = rgba(s >= 6 ? [196, 180, 220] : s < 3 ? [24, 16, 34] : [96, 80, 120], 0.97 * k); g.fillRect(Math.round(hand[0] + Math.cos(a + s * 0.16 * side) * (s + 1)), Math.round(hand[1] + Math.sin(a + s * 0.16 * side) * (s + 1)), 1, 1); }
            }
        }
    }
    /** Beelzebub: a spider from the hips down (Tokelo: "the player legs are spider legs"). The sprite is
     *  drawn cut off at the hips (LOWER.hips, ui/world-render.js clips it), and here a violet-glass spider body takes
     *  its place: a thorax at the hips, an abdomen behind, and eight jointed legs that step when you move. */
    // Tokelo (16:06): "give it to beelzebub", on his first look (halo, shards, flies; no fox).
    const LOWER = { beelzebub: { hips: 12 } };
    function spiderBody(g, cx, base, L, k, view, now, layer, hips = 12) {
        const hip = base - hips, walk = moving(view) ? now / 95 : now / 900, side0 = away(view) ? -1 : 1;
        if (layer === 'back') {                                                           // the abdomen, behind the body
            const ay = hip + 1 + Math.sin(now / 700) * 0.5;
            for (let j = -5; j <= 5; j++) for (let i = -7; i <= 7; i++) {
                const d = Math.hypot(i / 7, j / 5);
                if (d > 1) continue;
                const c = d > 0.85 ? [8, 6, 26] : (Math.abs(i) < 1.5 && Math.abs(j) < 3.5 && j % 2 === 0) ? L.glow : [36 + Math.round((1 - d) * 26), 26 + Math.round((1 - d) * 18), 70 + Math.round((1 - d) * 40)];
                g.fillStyle = rgba(c, 0.97 * k); g.fillRect(Math.round(cx + i), Math.round(ay - 6 * side0 * 0 + j - 3), 1, 1);
            }
        }
        // Eight legs, four a side; the back pairs behind the body, the front pairs in front of it.
        for (const side of [-1, 1]) for (let n = 0; n < 4; n++) {
            const front = n < 2;
            if ((layer === 'front') !== front) continue;
            const step = Math.sin(walk + n * 1.6 + (side > 0 ? Math.PI : 0)) * (moving(view) ? 2.5 : 0.5);
            const spread = 6 + n * 3.5;
            const rootP = [cx + side * 3, hip + 1];
            const knee = [cx + side * spread, hip - 6 + n * 1.5 - Math.max(0, step)];
            const foot = [cx + side * (spread + 4 + n) + step, base - 1 - Math.max(0, step) * 0.6];
            limb(g, [rootP, knee, foot], 2.6, 1.2, front ? [44, 32, 84] : [28, 20, 56], L, k);
            g.fillStyle = rgba(L.glow, 0.9 * k); g.fillRect(Math.round(knee[0]), Math.round(knee[1]), 1, 1);   // a glinting joint
        }
        if (layer === 'front') {                                                          // the thorax over the hips
            for (let j = -3; j <= 2; j++) for (let i = -5; i <= 5; i++) {
                if (Math.hypot(i / 5, j / 3) > 1) continue;
                g.fillStyle = rgba(Math.hypot(i / 5, j / 3) > 0.75 ? [8, 6, 26] : [58, 44, 104], 0.97 * k); g.fillRect(cx + i, hip + j + 1, 1, 1);
            }
        }
    }
    /** How many px of the sprite's legs to hide while merged (only a demon that replaces the legs), else 0. */
    const lowerBody = (st) => (st && st.k > 0.5 && LOWER[st.id] ? LOWER[st.id].hips : 0);

    function behind(g, cx, base, st, view, now) {
        const L = st && LOOKS[st.id];
        if (!L) return;
        g.save();
        try {
            smoke(g, cx, base, L, st.k, now);
            if (st.id === 'lucifero') shadowArms(g, cx, base, L, st.k, view, now);
            if (LOWER[st.id]) spiderBody(g, cx, base, L, st.k, view, now, 'back', LOWER[st.id].hips);
            BEHIND[st.id](g, cx, base, L, st.k, view, now);
        } finally { g.restore(); }
    }
    function front(g, cx, base, st, view, now) {
        const L = st && LOOKS[st.id];
        if (!L) return;
        g.save();
        try { if (LOWER[st.id]) spiderBody(g, cx, base, L, st.k, view, now, 'front', LOWER[st.id].hips); helm(g, cx, base, st.id, st.k, view, now); FRONT[st.id](g, cx, base, L, st.k, view, now); burst(g, cx, base, L, st.burst); } finally { g.restore(); }
    }

    const api = { LOOKS, HELMS, PLATE, CAST_SHOW_MS, helmOn, palette, state, reset, behind, front, lowerBody };
    ENSO.unionFx = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
