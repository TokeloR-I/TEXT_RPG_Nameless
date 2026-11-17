/* =========================================================================
 * Enso's Last Stand — DEVIL UNION MERGE LOOK (original, drawn by code; Saffron/Quill)
 * Tokelo, 2026-11-17: "can we take a page out of Black Clover's devil union? where you have this dark looking armor
 * or shadowy design?" While you are merged with a demon (engine.activeUnion(), src/engine/union.js) the hero is
 * wrapped in that demon's dark armor: the sprite's cloth, metal and hair are recoloured to it (a palette, no new
 * sheets), its own pieces are drawn on and around the body, and black smoke curls off you the whole time. Each look
 * is the team's own design, not a copy of anything:
 *   lucifero   starless black plate; a dark ring of nothing over the head; dust dragged in at your feet (gravity).
 *   beelzebub  violet rift-glass; glass shards on the shoulders; a cracked halo; flies turning round you (space).
 *   slotos     slag-iron hulk; tusked pauldrons; orange heat in the seams; sparks when struck (toughness).
 *   plumede    black plumage with a pale edge; folded feather wings that flare on a dash; feathers shed on the move.
 * Second pass (Tokelo: "more animalistic ... owl or wild bore or fox ... extra arms or ... spider legs"): Plumede
 * wears an owl helm, Slotos a wild boar's, Beelzebub a fox's with six glass spider legs, Lucifero grows four
 * shadow arms.
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
        lucifero: { glow: [200, 176, 255], smoke: [10, 8, 18],
            palette: { cloth: '#16131f', cloth2: '#0c0a12', accent: '#c8b0ff', leather: '#100d18', metal: '#3e3458', hat: '#16131f', shieldFace: '#16131f', eye: '#c8b0ff' } },
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
        lucifero(g, cx, base, L, k, view, now) {
            g.fillStyle = rgba([6, 4, 12], 0.5 * k); g.beginPath(); g.ellipse(cx, base - 1, 14, 4.5, 0, 0, Math.PI * 2); g.fill();
            for (let i = 0; i < 10; i++) {
                const life = (now / 900 + hash(i, 7)) % 1, a = hash(i, 8) * Math.PI * 2, d = 18 * (1 - life);
                g.fillStyle = rgba(L.glow, 0.7 * k * life); g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(base - 1 + Math.sin(a) * d * 0.3), 1, 1);
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
        // A ring of nothing over the head: a crown of black with a faint violet rim.
        lucifero(g, cx, base, L, k, view, now) {
            const y = base - HEAD_TOP - 3 + Math.round(Math.sin(now / 700) * 0.6);
            for (let s = 0; s < 44; s++) {
                const t = (s / 44) * Math.PI * 2, x = Math.round(cx + Math.cos(t) * 6), yy = Math.round(y + Math.sin(t) * 2);
                g.fillStyle = rgba([4, 3, 8], 0.95 * k); g.fillRect(x, yy, 1, 2);
                if (s % 2) { g.fillStyle = rgba(L.glow, 0.5 * k); g.fillRect(x, yy - 1, 1, 1); }
            }
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
        // Slag-iron pauldrons and orange heat in the seams; sparks when you are hit (the tusks are on the boar helm).
        slotos(g, cx, base, L, k, view, now) {
            const y = base - SHOULDERS;
            for (const side of [-1, 1]) {
                g.fillStyle = rgba([60, 48, 44], 0.95 * k); g.fillRect(Math.round(cx + side * 7 - 3), y - 2, 6, 4);
                g.fillStyle = rgba(L.glow, 0.85 * k); g.fillRect(Math.round(cx + side * 7 - 3), y + 1, 6, 1);   // the seam
            }
            const seam = 0.5 + 0.5 * Math.sin(now / 260);
            g.fillStyle = rgba(L.glow, 0.5 * k * seam); g.fillRect(cx - 4, base - SHOULDERS + 6, 8, 1); g.fillRect(cx - 3, base - SHOULDERS + 10, 6, 1);
            if (view && view.anim === 'hurt' && view.animT != null && view.animT < 200) for (let i = 0; i < 8; i++) {
                const a = hash(i, Math.floor(now / 60)) * Math.PI * 2, d = 4 + view.animT / 20;
                g.fillStyle = rgba([255, 220, 140], 0.9 * k); g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(base - SHOULDERS + Math.sin(a) * d), 1, 1);
            }
        },
        // A half mask of black feathers, and feathers shed behind you on the move.
        plumede(g, cx, base, L, k, view, now) {
            if (moving(view) || dashing(view)) for (let i = 0; i < 6; i++) {
                const life = (now / 600 + hash(i, 5)) % 1, x = cx + (hash(i, 6) - 0.5) * 18, y = base - 6 - hash(i, 9) * 20 + life * 8;
                g.fillStyle = rgba([10, 10, 16], 0.85 * k * (1 - life)); g.fillRect(Math.round(x), Math.round(y), 3, 1);
                g.fillStyle = rgba(L.glow, 0.6 * k * (1 - life)); g.fillRect(Math.round(x), Math.round(y), 1, 1);
            }
        }
    };

    // --- second pass (Tokelo 2026-11-17: "can we add more animalistic characteristic like a head with the shape of an
    // owl or wild bore or fox ... other armors to grow extra arms or another one spider legs"). Animal helms drawn as
    // pixel grids (left half, mirrored), and extra limbs drawn as jointed strokes. Plumede an owl, Slotos a wild boar,
    // Beelzebub a fox with glass spider legs, Lucifero four shadow arms.
    const half = (rows) => rows.map((r) => r + [...r].reverse().join(''));
    const HELMS = {
        plumede: { top: 41, colours: { o: '#07070c', d: '#15151f', m: '#2a2a3a', l: '#4a4a62', p: '#d8d4e8', e: '#fff6c0', b: '#b09048' },
            rows: half([
                '..oo......', '.odo......', '.oddo.....', '.odmdooooo', '..odmmmmmm', '..odddmmmm', '.odpppddmm', 'odppeepdmm',
                'odpeeeepdm', 'odpeeeepdb', 'odppeepddb', '.odpppdmmo', '.oddddmmmm', '..odddmmmm', '...oddddmm', '....oooooo']) },
        slotos: { top: 40, colours: { o: '#140f0e', d: '#33282a', m: '#5c4a44', l: '#8e7a6a', s: '#a07a68', n: '#140f0e', t: '#f0e4c8', e: '#ffb050', r: '#1e1716' },
            rows: half([
                '...o....rr', '..odo..rrr', '..oddoorrd', '.odddddddm', '.oddmmmmmm', '.odmmmmmmm', 'odmeemmmmm', 'odmmmmmmmm',
                'odmmmmmlll', '.odmmmllss', 't.odmlssss', 't.odmssnss', 'tt.odsssss', '.tt.osssss', '..t..ooooo']) },
        beelzebub: { top: 42, colours: { o: '#08061a', d: '#1e1638', m: '#3a2c68', l: '#6a58b0', w: '#b8f0e0', e: '#e8fff8', n: '#08061a' },
            rows: half([
                '.o........', '.oo.......', '.olo......', '.olmo.....', '.odlmooooo', '.oddmmmmmm', 'odmmmmmmmm', 'odmeemmmmm',
                'odmmeemmmm', 'owwmmmmmmm', '.owwwmmmmm', '..owwwmmmm', '...owwwmmm', '....owwwmn', '.....ooooo']) }
    };
    // Facing away you see the back of the helm: the face colours go dark.
    const BACK = { p: 'm', e: 'm', b: 'm', s: 'm', n: 'm', w: 'm', l: 'm' };
    function helm(g, cx, base, id, k, view, now) {
        const H = HELMS[id];
        if (!H) return;
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
    function shadowArms(g, cx, base, L, k, view, now) {
        const sh = base - SHOULDERS + 2;
        for (const side of [-1, 1]) for (const [lift, reach, ph] of [[16, 15, 0], [3, 19, 1.7]]) {
            const sway = Math.sin(now / 520 + ph + side) * 2;
            const root = [cx + side * 4, sh], elbow = [cx + side * (reach * 0.6), sh - lift * 0.6 + sway * 0.5], hand = [cx + side * reach, sh - lift + sway];
            limb(g, [root, elbow, hand], 4, 2, [10, 8, 18], L, k);
            for (let c = -1; c <= 1; c++) {                                        // three claws
                const a = Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) + c * 0.5;
                for (let s = 1; s <= 3; s++) { g.fillStyle = rgba(c ? [10, 8, 18] : L.glow, 0.9 * k); g.fillRect(Math.round(hand[0] + Math.cos(a) * s), Math.round(hand[1] + Math.sin(a) * s), 1, 1); }
            }
        }
    }
    /** Beelzebub: six legs of violet glass out of the small of the back, arched like a spider's, tips on the ground. */
    function spiderLegs(g, cx, base, L, k, view, now) {
        const root = base - 16, walk = moving(view) ? now / 110 : now / 900;
        for (const side of [-1, 1]) for (let n = 0; n < 3; n++) {
            const step = Math.sin(walk + n * 2.1 + (side > 0 ? 1 : 0)) * (moving(view) ? 2.5 : 0.6);
            const knee = [cx + side * (9 + n * 3), root - 13 + n * 3 - Math.max(0, step)];
            const foot = [cx + side * (14 + n * 4) + step, base - 1 - Math.max(0, step) * 0.5];
            limb(g, [[cx + side * 2, root], knee, foot], 3, 1.4, [38, 28, 72], L, k);
            g.fillStyle = rgba(L.glow, 0.9 * k); g.fillRect(Math.round(knee[0]), Math.round(knee[1]), 1, 1);   // a glinting joint
        }
    }

    function behind(g, cx, base, st, view, now) {
        const L = st && LOOKS[st.id];
        if (!L) return;
        g.save();
        try {
            smoke(g, cx, base, L, st.k, now);
            if (st.id === 'lucifero') shadowArms(g, cx, base, L, st.k, view, now);
            if (st.id === 'beelzebub') spiderLegs(g, cx, base, L, st.k, view, now);
            BEHIND[st.id](g, cx, base, L, st.k, view, now);
        } finally { g.restore(); }
    }
    function front(g, cx, base, st, view, now) {
        const L = st && LOOKS[st.id];
        if (!L) return;
        g.save();
        try { helm(g, cx, base, st.id, st.k, view, now); FRONT[st.id](g, cx, base, L, st.k, view, now); burst(g, cx, base, L, st.burst); } finally { g.restore(); }
    }

    const api = { LOOKS, HELMS, palette, state, reset, behind, front };
    ENSO.unionFx = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
