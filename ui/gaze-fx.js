/* =========================================================================
 * Enso's Last Stand — GAZE FX: the Fallen Seraph's halo and six wings (drawn by code; Saffron/Quill)
 * Tokelo (2026-11-04): stare at the robed statue in the Kloster courtyard. After 60 s a halo lights over it;
 * at 120 s six wings come out of it and it speaks. The engine counts the time (src/engine/gaze.js); this only
 * draws what engine.gazeView() reports, over the scene, every frame:
 *   - while you look: a few gold motes rise round the statue, more the longer you look;
 *   - from the halo: a ring of pale gold over the hood, pulsing, brightening towards the wake;
 *   - once awake (for good): six wings unfold from the robe, two up over the face, two spread wide, two down
 *     over the feet, grey stone feathers edged in gold, breathing slowly; the halo stays.
 * Pixels are plotted as 1 px rects so it stays crisp with the rest of the pixel art. No image goes in.
 *   ENSO.gazeFx.draw(g, { x, y, view, id }, now)   x, y: the top of the statue's hood in map pixels
 * And the same light on you (Tokelo, 2026-11-04), from engine.legendaryLook() (data: legendaryWebs.<id>.look):
 *   - a halo over your head from the moment the Fallen Seraphim web opens;
 *   - six wings at your back (and red eyes, recoloured in the sprite) once every skill of the web is learned.
 *   ENSO.gazeFx.playerWings(g, cx, base, facing, now)   before the body (after it when you face away)
 *   ENSO.gazeFx.playerHalo(g, cx, base, now)            after the body.  cx, base: the sprite's feet
 * ========================================================================= */
(function (global) {
    const ENSO = global.ENSO || (global.ENSO = {});
    const seen = {};   // id -> { haloAt, awakeAt }: when each stage was first drawn, for the fade-ins

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

    function halo(g, x, y, a, now) {
        const pulse = 0.75 + 0.25 * Math.sin(now / 420);
        for (let k = 0; k < 72; k++) {
            const t = (k / 72) * Math.PI * 2, px = Math.round(x + Math.cos(t) * 10), py = Math.round(y + Math.sin(t) * 3.2);
            g.fillStyle = `rgba(255, 236, 170, ${(a * pulse).toFixed(3)})`; g.fillRect(px, py, 1, 1);
            if (k % 2 === 0) { g.fillStyle = `rgba(255, 250, 225, ${(a * 0.6 * pulse).toFixed(3)})`; g.fillRect(px, py - 1, 1, 1); }
        }
        g.fillStyle = `rgba(255, 230, 160, ${(a * 0.12 * pulse).toFixed(3)})`;   // its glow
        g.fillRect(Math.round(x - 14), Math.round(y - 6), 29, 12);
        g.fillRect(Math.round(x - 10), Math.round(y - 9), 21, 18);
    }

    /** One wing: a fan of five feathers from (rx, ry), pointing at `ang` (radians), `len` long, `u` unfolded (0..1). */
    function wing(g, rx, ry, ang, len, u, side, glow, wk = 1) {
        const spread = 0.17 * u;
        for (let f = 0; f < 5; f++) {
            const fa = ang + (f - 2) * spread * side, fl = len * u * (1 - Math.abs(f - 2) * 0.13);
            for (let s = 0; s <= fl; s += 0.7) {
                const t = s / Math.max(1, fl);
                const bend = Math.sin(t * Math.PI) * 2.2 * side;                       // a slight curve back
                const cx = rx + Math.cos(fa) * s - Math.sin(fa) * bend, cy = ry + Math.sin(fa) * s + Math.cos(fa) * bend;
                const w = ((1 - t * 0.75) * 2.6 + 0.4) * wk;
                for (let o = -w; o <= w; o += 1) {
                    const px = Math.round(cx - Math.sin(fa) * o), py = Math.round(cy + Math.cos(fa) * o);
                    const edge = Math.abs(o) > w - 1;
                    const shade = Math.round(92 + t * 44 + (o < 0 ? 14 : -10));
                    g.fillStyle = edge ? `rgba(206, 168, 80, ${0.75 * u})` : `rgba(${shade}, ${shade - 2}, ${shade - 6}, ${0.95 * u})`;
                    g.fillRect(px, py, 1, 1);
                }
            }
            if (glow > 0) {   // light running out to the tips
                const tx = Math.round(rx + Math.cos(fa) * fl), ty = Math.round(ry + Math.sin(fa) * fl);
                g.fillStyle = `rgba(255, 246, 210, ${(0.7 * glow * u).toFixed(3)})`; g.fillRect(tx - 1, ty - 1, 2, 2);
            }
        }
    }

    function wings(g, x, y, u, now, k = 1) {
        const breathe = Math.sin(now / 900) * 0.05;
        const glow = 0.5 + 0.5 * Math.sin(now / 520);
        // [root offset x, root offset y, angle (right side), length]: up over the face, wide, down over the feet.
        const pairs = [[4, 16, -1.2 - breathe, 26], [6, 22, -0.3 + breathe, 40], [5, 34, 0.55 - breathe, 24]];
        for (const [ox, oy, ang, len] of pairs) {
            wing(g, x + ox * k, y + oy * k, ang, len * k, u, 1, glow, k < 1 ? 0.7 : 1);
            wing(g, x - ox * k, y + oy * k, Math.PI - ang, len * k, u, -1, glow, k < 1 ? 0.7 : 1);
        }
    }

    // The player sprite (assets/sprites/enso-player.js, v3 rig): a 96 px frame, feet at y 68, head centre about 30 px
    // over the feet (radius about 7), shoulders about 22 px. So the head's top is ~38 px over the feet.
    const HEAD_TOP = 38, SHOULDERS = 24;
    /** Six wings at your back, at about half the statue's size (it is twice your height). */
    function playerWings(g, cx, base, facing, now) {
        wings(g, cx, base - SHOULDERS - 16 * 0.6, 1, now, facing === 'up' ? 0.5 : 0.6);
    }
    /** Your halo: a small gold ring over your head that bobs and pulses. */
    function playerHalo(g, cx, base, now) {
        const y = base - HEAD_TOP - 3 + Math.round(Math.sin(now / 650) * 0.6);
        const pulse = 0.75 + 0.25 * Math.sin(now / 420);
        for (let k = 0; k < 40; k++) {
            const t = (k / 40) * Math.PI * 2, px = Math.round(cx + Math.cos(t) * 5.5), py = Math.round(y + Math.sin(t) * 1.8);
            g.fillStyle = `rgba(255, 236, 170, ${(0.95 * pulse).toFixed(3)})`; g.fillRect(px, py, 1, 1);
        }
        for (let k = 0; k < 24; k++) {   // a fainter ring just above, for the glow
            const t = (k / 24) * Math.PI * 2;
            g.fillStyle = `rgba(255, 250, 225, ${(0.35 * pulse).toFixed(3)})`; g.fillRect(Math.round(cx + Math.cos(t) * 5), Math.round(y - 1 + Math.sin(t) * 1.4), 1, 1);
        }
    }

    function motes(g, x, y, share, now) {
        const n = Math.floor(2 + share * 10);
        for (let k = 0; k < n; k++) {
            const p = ((now / 2400 + hash(k, 1)) % 1);
            const px = Math.round(x + (hash(k, 2) - 0.5) * 44 + Math.sin(now / 700 + k) * 2), py = Math.round(y + 56 - p * 70);
            g.fillStyle = `rgba(255, 228, 150, ${((1 - p) * (0.25 + share * 0.55)).toFixed(3)})`;
            g.fillRect(px, py, 1, 1);
        }
    }

    function draw(g, { x, y, view, id }, now) {
        if (!view) return;
        const st = seen[id] || (seen[id] = { haloAt: null, awakeAt: null });
        if (!view.halo) st.haloAt = null; else if (st.haloAt == null) st.haloAt = now;
        if (!view.awake) st.awakeAt = null; else if (st.awakeAt == null) st.awakeAt = now;
        if (view.ms > 0 && !view.awake) motes(g, x, y, clamp01(view.ms / view.wakeMs), now);
        if (view.awake) wings(g, x, y, clamp01((now - st.awakeAt) / 1600), now);
        if (view.halo) {
            const toward = view.awake ? 1 : clamp01((view.ms - view.haloMs) / Math.max(1, view.wakeMs - view.haloMs));
            halo(g, x, y - 5, clamp01((now - st.haloAt) / 1500) * (0.55 + 0.45 * toward), now);
        }
    }

    ENSO.gazeFx = { draw, playerWings, playerHalo };
})(typeof window !== 'undefined' ? window : globalThis);
