/* =========================================================================
 * Enso's Last Stand — ACTION COMBAT VFX (combat v3, docs/ACTION_COMBAT.md; Sable)
 * The in-world combat visuals: hit sparks, floating numbers, guard/parry/dodge feedback, deaths, pickups,
 * level-ups, AoE bursts, cast glyphs, enemy telegraphs (drawn on the real damage footprint), the player's
 * swing smear, projectiles, ground markers, tiny enemy HP bars and an enemy actor painter.
 *
 * Rules of this file:
 *   - Presentation only. It never reads or changes game state; the caller passes everything in.
 *   - Everything is drawn in MAP pixel space: the caller has already translated the context by the camera.
 *   - Pixel-crisp: shapes are rasterised into whole-pixel fillRect runs (no anti-aliased paths), positions rounded.
 *   - Deterministic and timer-free: time (`now`, ms) is always passed in; "random" spark angles come from a hash.
 *   - Angles are radians, 0 = facing +x (right), y grows downwards (canvas convention).
 *   - Loads in Node for tests (module.exports), and needs no DOM except one optional scratch canvas for tinting.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    // ---------------------------------------------------------------------
    // Small pixel helpers
    // ---------------------------------------------------------------------
    const R = Math.round;
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : (v || 0));
    const TAU = Math.PI * 2;
    const hash = (a, b = 0, c = 0) => {
        let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    // 4x4 ordered dither: a pixel is drawn when its threshold is below the wanted coverage (crisp pixel-art fades).
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
    const dither = (x, y, a) => a > BAYER[((y & 3) << 2) | (x & 3)];
    const px = (g, x, y, c, s = 1) => { g.fillStyle = c; g.fillRect(R(x), R(y), s, s); };
    /** Normalise an angle difference into (-PI, PI]. */
    const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d <= -Math.PI) d += TAU; return d; };

    /** Points on a whole-pixel circle (midpoint algorithm), optionally squashed vertically (ry/rx). */
    function ringPoints(rx, ry = rx) {
        const pts = [], seen = new Set();
        const n = Math.max(8, Math.ceil(TAU * Math.max(rx, ry) * 1.5));
        for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU, x = R(Math.cos(a) * rx), y = R(Math.sin(a) * ry), k = x + ',' + y;
            if (!seen.has(k)) { seen.add(k); pts.push([x, y, a]); }
        }
        return pts;
    }
    function pxRing(g, cx, cy, r, c, ry) {
        if (r < 0.5) { px(g, cx, cy, c); return; }
        g.fillStyle = c;
        for (const [x, y] of ringPoints(r, ry == null ? r : ry)) g.fillRect(R(cx) + x, R(cy) + y, 1, 1);
    }
    /** Filled whole-pixel ellipse as horizontal runs (shadows). */
    function pxEllipse(g, cx, cy, rx, ry, c) {
        g.fillStyle = c;
        const X = R(cx), Y = R(cy);
        for (let y = -Math.floor(ry); y <= Math.floor(ry); y++) {
            const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
            if (w > 0) g.fillRect(X - w, Y + y, w * 2, 1);
        }
    }
    /** Rasterise a region over a bounding box: cell(x, y) returns a colour or null; equal neighbours are batched into runs. */
    function raster(g, x0, y0, x1, y1, cell) {
        x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
        for (let y = y0; y <= y1; y++) {
            let runC = null, runX = 0;
            for (let x = x0; x <= x1 + 1; x++) {
                const c = x <= x1 ? cell(x, y) : null;
                if (c !== runC) {
                    if (runC) { g.fillStyle = runC; g.fillRect(runX, y, x - runX, 1); }
                    runC = c; runX = x;
                }
            }
        }
    }

    // ---------------------------------------------------------------------
    // Colours
    // ---------------------------------------------------------------------
    // [core, mid, dark] per damage type. Unknown types read as physical.
    const DAMAGE = {
        physical: ['#fff6dc', '#f0c070', '#a8683a'],
        magic: ['#f4e4ff', '#c08cff', '#6a3cc8'],
        fire: ['#fff4a0', '#ffa030', '#c83c18'],
        ice: ['#f4fcff', '#9ad8ff', '#3c84c8'],
        poison: ['#eaffb0', '#9ade4a', '#3c7a28'],
        true: ['#ffffff', '#f4ecff', '#b8a8e0'],
        lightning: ['#ffffe0', '#fff060', '#5aa0ff'],
        radiant: ['#fffbe8', '#ffe48a', '#d8a040'],
        shadow: ['#d8c0f0', '#8a5ab8', '#3a2058'],
        bone: ['#fbf6e8', '#e0d6b8', '#7ae08a']
    };
    DAMAGE.magical = DAMAGE.magic; DAMAGE.arcane = DAMAGE.magic; DAMAGE.necrotic = DAMAGE.shadow; DAMAGE.holy = DAMAGE.radiant;
    const dmgCol = (t) => DAMAGE[t] || DAMAGE.physical;
    const STATUS_COLOUR = {
        stun: '#ffe040', stunned: '#ffe040', freeze: '#a8e8ff', frozen: '#a8e8ff', slow: '#6aa0ff', slowed: '#6aa0ff',
        burn: '#ff8a30', burning: '#ff8a30', poison: '#9ade4a', poisoned: '#9ade4a', infection: '#c8f060', infected: '#c8f060',
        bleed: '#e03838', bleeding: '#e03838', mark: '#d070ff', marked: '#d070ff', expose: '#ff70a0', exposed: '#ff70a0',
        weaken: '#a08870', weakened: '#a08870', silence: '#8ab0c8', silenced: '#8ab0c8', fear: '#9a70c0', guard: '#c8d8f0', root: '#8a6a3a', rooted: '#8a6a3a'
    };
    const statusColour = (s) => {
        if (s && typeof s === 'object') return s.colour || s.color || statusColour(s.name || s.id || s.kind);
        const k = String(s || '').toLowerCase().replace(/[^a-z]/g, '');
        if (STATUS_COLOUR[k]) return STATUS_COLOUR[k];
        for (const [n, c] of Object.entries(STATUS_COLOUR)) if (k.includes(n)) return c;
        return '#c8c0b0';
    };

    // ---------------------------------------------------------------------
    // A 3x5 pixel font for numbers and short words (damage, MISS, PARRY, LEVEL UP)
    // ---------------------------------------------------------------------
    const GLYPHS = {
        0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001011001111', 4: '101101111001001',
        5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
        '+': '000010111010000', '-': '000000111000000', '!': '010010010000010', ' ': '000000000000000', '.': '000000000000010',
        A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
        F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
        K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
        P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
        U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111'
    };
    /** Width in pixels of `text` at integer scale `s`. */
    const textWidth = (text, s = 1) => Math.max(0, String(text).length * 4 * s - s);
    /** Pixel text, centred on x, top at y, with a 1px dark outline. */
    function pixelText(g, text, x, y, colour, s = 1, outline = '#140a0c') {
        const str = String(text).toUpperCase();
        const X = R(x - textWidth(str, s) / 2), Y = R(y);
        for (const pass of outline ? [0, 1] : [1]) {
            g.fillStyle = pass ? colour : outline;
            for (let i = 0; i < str.length; i++) {
                const gl = GLYPHS[str[i]] || GLYPHS[' '];
                for (let j = 0; j < 15; j++) if (gl[j] === '1') {
                    const gx = X + (i * 4 + (j % 3)) * s, gy = Y + Math.floor(j / 3) * s;
                    if (pass) g.fillRect(gx, gy, s, s); else g.fillRect(gx - 1, gy - 1, s + 2, s + 2);
                }
            }
        }
    }

    // ---------------------------------------------------------------------
    // Spawned effects
    // ---------------------------------------------------------------------
    const LIFE = { hit: 280, damage: 850, guard: 300, parry: 380, dodge: 320, death: 950, pickup: 650, levelup: 1500, aoe: 480, cast: 420 };
    const ease = (t) => 1 - (1 - t) * (1 - t);

    const DRAW = {
        /** { x, y, damageType, crit?, angle? (direction the blow travelled) } spark burst. */
        hit(g, d, t, f) {
            const [c0, c1, c2] = dmgCol(d.damageType);
            const n = d.crit ? 9 : 6, reach = (d.crit ? 11 : 7) * ease(t);
            if (t < 0.22) {                                                    // impact star
                const s = d.crit ? 3 : 2;
                g.fillStyle = c0; g.fillRect(R(d.x) - s, R(d.y), s * 2 + 1, 1); g.fillRect(R(d.x), R(d.y) - s, 1, s * 2 + 1);
                g.fillStyle = c1; g.fillRect(R(d.x) - 1, R(d.y) - 1, 3, 3); px(g, d.x, d.y, c0);
            }
            for (let i = 0; i < n; i++) {
                const base = d.angle != null ? d.angle + (hash(f.seed, i) - 0.5) * 2.2 : (i / n) * TAU + hash(f.seed, i) * 0.6;
                const r = reach * (0.6 + 0.6 * hash(f.seed, i, 7));
                const x = d.x + Math.cos(base) * r, y = d.y + Math.sin(base) * r + t * t * 3;   // slight fall
                const tail = Math.max(1, r - 3);
                if (t < 0.75) px(g, d.x + Math.cos(base) * tail, d.y + Math.sin(base) * tail + t * t * 3, t < 0.4 ? c1 : c2);
                px(g, x, y, t < 0.5 ? c0 : c1);
            }
        },
        /** { x, y, amount?, text?, crit?, heal?, taken? (player lost HP), damageType? } floating number. */
        damage(g, d, t, f) {
            const text = d.text != null ? String(d.text) : (d.heal ? '+' : '') + Math.max(0, Math.round(Math.abs(d.amount || 0)));
            const colour = d.colour || (d.heal ? '#7cf070' : d.taken ? '#ff4a3a' : d.crit ? '#ffe040' : d.text != null ? '#e8e0d0' : (d.damageType && d.damageType !== 'physical' ? dmgCol(d.damageType)[1] : '#fff4e0'));
            const s = d.crit ? 2 : 1;
            const jitter = ((f.seq % 3) - 1) * 4;
            const pop = d.crit && t < 0.12 ? -2 : 0;
            const rise = R(ease(Math.min(1, t * 1.4)) * (d.crit ? 16 : 13));
            if (t > 0.65 && !dither(f.seq, R(t * 40), 1 - (t - 0.65) / 0.35)) return;   // stepped fade-out
            pixelText(g, text, d.x + jitter, d.y - 5 * s - rise + pop, colour, s);
        },
        /** { x, y, angle (facing of the guard) } shield spark. */
        guard(g, d, t, f) {
            const a = d.angle || 0, r = 7 + R(t * 2);
            const col = t < 0.3 ? '#ffffff' : t < 0.6 ? '#c8dcff' : '#6a8ac8';
            for (let i = -4; i <= 4; i++) {                                     // the shield face: a short pixel arc
                const aa = a + i * 0.16;
                if (Math.abs(i) === 4 && t > 0.5) continue;
                px(g, d.x + Math.cos(aa) * r, d.y + Math.sin(aa) * r, col);
            }
            for (let i = 0; i < 4; i++) {                                       // sparks thrown off the face
                const aa = a + (hash(f.seed, i) - 0.5) * 1.8, rr = r + 2 + ease(t) * 7 * (0.5 + hash(f.seed, i, 3));
                px(g, d.x + Math.cos(aa) * rr, d.y + Math.sin(aa) * rr, t < 0.5 ? '#fff6c0' : '#c8a050');
            }
        },
        /** { x, y } bright flash ring. */
        parry(g, d, t) {
            const r = 3 + ease(t) * 13;
            pxRing(g, d.x, d.y, r, t < 0.5 ? '#ffffff' : '#ffe890');
            if (t < 0.6) pxRing(g, d.x, d.y, Math.max(1, r - 2), '#fff6c0');
            if (t < 0.35) {                                                     // the flash: a 4-point star
                const s = R(7 * (1 - t / 0.35)) + 2;
                g.fillStyle = '#ffffff';
                g.fillRect(R(d.x) - s, R(d.y), s * 2 + 1, 1); g.fillRect(R(d.x), R(d.y) - s, 1, s * 2 + 1);
                g.fillRect(R(d.x) - 1, R(d.y) - 1, 3, 3);
            }
            if (t > 0.15 && t < 0.85) pixelText(g, 'PARRY', d.x, d.y - 22 - R(t * 4), '#fff0a0');
        },
        /** { x, y (where the dodge ended), fromX?, fromY? | angle + distance, facing?, draw?(g, x, y, alpha, facing) } afterimages. */
        dodge(g, d, t) {
            const fx = d.fromX != null ? d.fromX : d.x - Math.cos(d.angle || 0) * (d.distance || 18);
            const fy = d.fromY != null ? d.fromY : d.y - Math.sin(d.angle || 0) * (d.distance || 18);
            for (let i = 0; i < 3; i++) {
                const k = i / 3;                                                // 0 = start of the dodge
                const a = (1 - t) * (0.25 + 0.2 * i);
                if (a <= 0.02) continue;
                const x = R(fx + (d.x - fx) * k), y = R(fy + (d.y - fy) * k);
                if (typeof d.draw === 'function') {
                    g.save(); g.globalAlpha = a; try { d.draw(g, x, y, a, d.facing); } finally { g.restore(); }
                    continue;
                }
                // simple silhouette, feet at (x, y): head, shoulders, body and legs, a pale blue ghost
                raster(g, x - 6, y - 26, x + 6, y, (X, Y) => {
                    const ax = Math.abs(X - x), ry = y - Y;
                    let inside = false, rim = false;
                    if (ry >= 19) { const h = Math.hypot(X - x, Y - (y - 22)); inside = h <= 3.6; rim = h > 2.6; }
                    else if (ry >= 8) { const w = ry >= 16 ? 5 : 4; inside = ax <= w; rim = ax === w || ry === 18; }
                    else { inside = ax >= 1 && ax <= 3; rim = ax === 3; }
                    if (!inside || !dither(X, Y, a * 1.8)) return null;
                    return rim ? '#d8ecff' : '#6a9ad8';
                });
            }
            if (t < 0.4) for (let i = 0; i < 4; i++) px(g, fx + (d.x - fx) * (i / 4) + (i % 2 ? 1 : -1) * 3, fy + (d.y - fy) * (i / 4) - 1, '#9ab8d8');   // dust kicked up
        },
        /** { x, y, colour?, soul? (default true) } puff of dust + a rising soul wisp. */
        death(g, d, t, f) {
            const puffT = Math.min(1, t / 0.5);
            if (puffT < 1) for (let i = 0; i < 10; i++) {
                const a = (i / 10) * TAU + hash(f.seed, i) * 0.5, r = 2 + ease(puffT) * (7 + 4 * hash(f.seed, i, 2));
                const x = d.x + Math.cos(a) * r, y = d.y - 3 + Math.sin(a) * r * 0.55 - puffT * 3;
                const s = puffT < 0.4 ? 2 : 1;
                if (dither(i, R(puffT * 16), 1 - puffT * 0.9)) px(g, x, y, puffT < 0.5 ? '#c8bca8' : '#8a8070', s);
            }
            if (d.soul === false) return;
            const wt = (t - 0.15) / 0.85;
            if (wt <= 0 || wt >= 1) return;
            const wx = d.x + Math.sin(wt * 9) * 3, wy = d.y - 8 - wt * 26;
            const core = d.colour || '#c8fff4', glow = '#5ac8c0';
            if (wt < 0.7 || dither(R(wt * 31), 1, (1 - wt) / 0.3)) {
                px(g, wx - 2, wy - 1, glow, 5); px(g, wx - 1, wy - 2, glow, 3); px(g, wx - 1, wy - 1, core, 3); px(g, wx, wy, '#ffffff');
                for (let i = 1; i <= 6; i++) px(g, d.x + Math.sin((wt - i * 0.05) * 9) * 3 - (i < 3 ? 1 : 0), wy + 1 + i * 2, i < 4 ? glow : '#2e7a78', i < 3 ? 2 : 1);
            }
        },
        /** { x, y, colour? } sparkle. */
        pickup(g, d, t, f) {
            const c = d.colour || '#ffe070';
            const s = R(1 + 4 * Math.sin(Math.PI * Math.min(1, t * 1.6)));
            if (s > 0 && t < 0.62) {
                g.fillStyle = c; g.fillRect(R(d.x) - s, R(d.y), s * 2 + 1, 1); g.fillRect(R(d.x), R(d.y) - s, 1, s * 2 + 1);
                px(g, d.x, d.y, '#ffffff');
            }
            for (let i = 0; i < 5; i++) {
                const a = hash(f.seed, i) * TAU, r = 3 + ease(t) * 6;
                const x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r - t * 8;
                if (dither(i, R(t * 20), 1 - t)) px(g, x, y, i % 2 ? '#ffffff' : c);
            }
        },
        /** { x, y } golden columns, a ring and LEVEL UP. */
        levelup(g, d, t, f) {
            const ring = Math.min(1, t / 0.4);
            if (ring < 1) pxRing(g, d.x, d.y, 4 + ease(ring) * 16, ring < 0.5 ? '#fff6c0' : '#e8b040', (4 + ease(ring) * 16) * 0.45);
            for (let i = 0; i < 9; i++) {
                const ox = R((hash(f.seed, i) - 0.5) * 22), speed = 30 + 20 * hash(f.seed, i, 1), delay = hash(f.seed, i, 2) * 0.4;
                const lt = (t - delay) / 0.6;
                if (lt <= 0 || lt >= 1) continue;
                const y = d.y - lt * speed;
                for (let k = 0; k < 4; k++) if (dither(i, k, 1 - lt)) px(g, d.x + ox, y + k * 2, k ? '#e8b040' : '#fff6c0');
            }
            if (t > 0.1) pixelText(g, 'LEVEL UP', d.x, d.y - 36 - R(ease(Math.min(1, t * 2)) * 6), t < 0.85 || (R(t * 30) % 2) ? '#ffe070' : '#c89030');
        },
        /** { x, y, radius, damageType? } expanding ring burst (circle skills). */
        aoe(g, d, t, f) {
            const [c0, c1, c2] = dmgCol(d.damageType || 'magic');
            const rMax = d.radius || 24, r = rMax * (0.25 + 0.75 * ease(Math.min(1, t * 1.3)));
            const fill = 0.55 * (1 - t);
            const X = R(d.x), Y = R(d.y);
            raster(g, X - r, Y - r, X + r, Y + r, (x, y) => {
                const dd = Math.hypot(x - X, y - Y);
                if (dd > r) return null;
                if (dd > r - 1.5) return t < 0.5 ? c0 : c1;
                if (dd > r - 3) return dither(x, y, 0.8 * (1 - t)) ? c1 : null;
                return dither(x, y, fill * (dd / r)) ? c2 : null;
            });
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * TAU + hash(f.seed, i) * 0.4, rr = r + 2 + hash(f.seed, i, 4) * 4 * t;
                if (t < 0.8) px(g, d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr - t * 3, t < 0.4 ? c0 : c1);
            }
        },
        /** { x, y, damageType? | cls? } small rotating glyph at the caster. */
        cast(g, d, t) {
            const [c0, c1] = d.cls ? CLASS_SWING[d.cls] ? [CLASS_SWING[d.cls].lead, CLASS_SWING[d.cls].mid] : dmgCol('magic') : dmgCol(d.damageType || 'magic');
            const s = R(2 + 3 * Math.sin(Math.PI * t));
            const X = R(d.x), Y = R(d.y - 2 - t * 4);
            const rot = (R(t * 6) % 2) === 0;                                   // alternates diamond / square, a "turning" rune
            g.fillStyle = c1;
            for (let i = -s; i <= s; i++) {
                if (rot) { g.fillRect(X + i, Y - (s - Math.abs(i)), 1, 1); g.fillRect(X + i, Y + (s - Math.abs(i)), 1, 1); }
                else { g.fillRect(X + i, Y - s, 1, 1); g.fillRect(X + i, Y + s, 1, 1); g.fillRect(X - s, Y + i, 1, 1); g.fillRect(X + s, Y + i, 1, 1); }
            }
            px(g, X, Y, c0);
            if (t < 0.6) { px(g, X, Y - s - 2, c0); px(g, X, Y + s + 2, c0); px(g, X - s - 2, Y, c0); px(g, X + s + 2, Y, c0); }
        }
    };

    function createFx() {
        const list = [];
        let seq = 0;
        const fx = {
            list,
            /** Add an effect. Returns it, or null for an unknown type (ignored, never throws). */
            spawn(type, data = {}, now = 0) {
                if (!DRAW[type]) return null;
                const life = data.life || LIFE[type];
                seq++;
                const e = { type, data, t0: now, life, seq, seed: hash(seq, R(data.x || 0), R(data.y || 0)) * 1e9 | 0 };
                list.push(e);
                if (list.length > 300) list.shift();                           // a hard cap: a busy fight never grows without bound
                return e;
            },
            /** Drop effects whose lifetime is over at `now`. */
            prune(now) { for (let i = list.length - 1; i >= 0; i--) if (now - list[i].t0 >= list[i].life) list.splice(i, 1); },
            /** Draw every live effect (map pixel space), oldest first; expired ones are removed. */
            draw(g, now) {
                fx.prune(now);
                for (const e of list) {
                    const t = clamp01((now - e.t0) / e.life);
                    if (now < e.t0) continue;                                    // scheduled in the future
                    g.save();
                    try { DRAW[e.type](g, e.data, t, e); } finally { g.restore(); }
                }
            },
            clear() { list.length = 0; },
            get size() { return list.length; },
            /** A small whole-pixel camera shake from live hits that asked for one ({ shake: px }). */
            shakeOffset(now) {
                let m = 0;
                for (const e of list) if (e.data.shake && now >= e.t0) m = Math.max(m, e.data.shake * (1 - clamp01((now - e.t0) / Math.min(e.life, 200))));
                if (m < 0.5) return { x: 0, y: 0 };
                const k = Math.floor(now / 33);
                return { x: R((hash(k, 1) - 0.5) * 2 * m), y: R((hash(k, 2) - 0.5) * 2 * m) };
            }
        };
        return fx;
    }

    // ---------------------------------------------------------------------
    // Telegraphs: the enemy's wind-up drawn on the real damage footprint
    // ---------------------------------------------------------------------
    /** Is (x, y) inside the shape, and how far along from its origin (0..1)? Returns -1 when outside. */
    function shapeDepth(s, x, y) {
        const dx = x - s.x, dy = y - s.y;
        switch (s.kind) {
            case 'circle': { const d = Math.hypot(dx, dy); return d <= s.radius ? d / s.radius : -1; }
            case 'line': {
                const c = Math.cos(s.angle || 0), sn = Math.sin(s.angle || 0);
                const along = dx * c + dy * sn, across = -dx * sn + dy * c;
                return along >= 0 && along <= s.length && Math.abs(across) <= (s.width || 8) / 2 ? along / s.length : -1;
            }
            case 'arc': case 'cone': default: {
                const reach = s.reach || s.length || s.radius || 24, arc = s.arc != null ? s.arc : s.spread != null ? s.spread : Math.PI / 2;
                const d = Math.hypot(dx, dy);
                if (d > reach || d < (s.inner || 0)) return -1;
                if (d > 0.5 && Math.abs(angDiff(Math.atan2(dy, dx), s.angle || 0)) > arc / 2) return -1;
                return d / reach;
            }
        }
    }
    function shapeBounds(s) {
        if (s.kind === 'line') {
            const c = Math.cos(s.angle || 0), sn = Math.sin(s.angle || 0), w = (s.width || 8) / 2, L = s.length;
            const xs = [s.x - sn * w, s.x + sn * w, s.x + c * L - sn * w, s.x + c * L + sn * w];
            const ys = [s.y + c * w, s.y - c * w, s.y + sn * L + c * w, s.y + sn * L - c * w];
            return [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1];
        }
        const r = s.kind === 'circle' ? s.radius : (s.reach || s.length || s.radius || 24);
        return [s.x - r - 1, s.y - r - 1, s.x + r + 1, s.y + r + 1];
    }
    const TELE = {
        normal: { area: '#5a1810', fill: '#c83a1c', fillHi: '#ff7a3a', edge: '#ff9a50', flash: '#fff0b0' },
        boss: { area: '#2a0a26', fill: '#8a1238', fillHi: '#c0285a', edge: '#d050c0', flash: '#ffc8f0' }
    };
    /**
     * telegraph(g, shape, progress, now, { boss }?) — shape { kind: 'arc'|'cone', x, y, angle, arc, reach }
     * | { kind: 'circle', x, y, radius } | { kind: 'line', x, y, angle, length, width }. `shape.boss` works too.
     * A faint area shows the whole footprint, a stronger fill grows from the origin as progress 0 → 1, the edge
     * is a crisp 1px line, and the last 15% flashes so the moment to dodge is unmistakable.
     */
    function telegraph(g, shape, progress, now = 0, opts = {}) {
        if (!shape) return;
        const p = clamp01(progress);
        const pal = (opts.boss || shape.boss) ? TELE.boss : TELE.normal;
        const late = p >= 0.85, blink = late && (Math.floor(now / 60) % 2 === 0);
        const areaA = 0.22 + 0.1 * Math.sin(now / 120), fillA = late ? 0.6 : 0.42;
        const [x0, y0, x1, y1] = shapeBounds(shape);
        raster(g, x0, y0, x1, y1, (x, y) => {
            const d = shapeDepth(shape, x + 0.5, y + 0.5);
            if (d < 0) return null;
            const edge = shapeDepth(shape, x + 1.5, y + 0.5) < 0 || shapeDepth(shape, x - 0.5, y + 0.5) < 0 || shapeDepth(shape, x + 0.5, y + 1.5) < 0 || shapeDepth(shape, x + 0.5, y - 0.5) < 0;
            if (edge) return blink ? pal.flash : pal.edge;
            if (d <= p) {
                if (Math.abs(d - p) < 0.06 && p < 1) return pal.fillHi;          // the bright front of the fill
                return dither(x, y, blink ? 0.85 : fillA) ? (blink ? pal.fillHi : pal.fill) : null;
            }
            return dither(x, y, areaA) ? pal.area : null;
        });
    }

    // ---------------------------------------------------------------------
    // The player's swing smear
    // ---------------------------------------------------------------------
    const CLASS_SWING = {
        warrior: { lead: '#ffffff', mid: '#c8d4e4', tail: '#6a7a90', inner: 0.42, trail: 0.75 },     // heavy steel, a wide band
        rogue: { lead: '#f4fff0', mid: '#a8d8b0', tail: '#3c6a4a', inner: 0.78, trail: 0.45, double: true },   // quick, thin, double
        necromancer: { lead: '#fbf6e8', mid: '#d8ceb0', tail: '#4ab868', inner: 0.6, trail: 0.7 },   // bone with a sickly green tail
        mage: { lead: '#fbeaff', mid: '#c08cff', tail: '#5a2ab0', inner: 0.6, trail: 0.7 }           // arcane purple
    };
    function smear(g, x, y, angle, arc, reach, progress, cfg, reverse) {
        const lead = ease(clamp01(progress) * 1.15 > 1 ? 1 : clamp01(progress) * 1.15);
        const fade = progress > 0.75 ? (progress - 0.75) / 0.25 : 0;          // the smear dissolves at the end
        const start = angle - (arc / 2) * (reverse ? -1 : 1), dir = reverse ? -1 : 1;
        const inner = reach * cfg.inner;
        const X = R(x), Y = R(y);
        raster(g, X - reach - 1, Y - reach - 1, X + reach + 1, Y + reach + 1, (px0, py0) => {
            const dx = px0 + 0.5 - x, dy = py0 + 0.5 - y, d = Math.hypot(dx, dy);
            if (d > reach || d < inner) return null;
            const u = (angDiff(Math.atan2(dy, dx), start) * dir) / arc;        // 0 at the start of the sweep, 1 at its end
            if (u < 0 || u > lead) return null;
            const behind = (lead - u) / cfg.trail;                              // 0 at the blade, 1 at the end of the trail
            if (behind > 1) return null;
            const band = (d - inner) / (reach - inner);                         // crescent: thick at the blade, thin in the tail
            if (band < behind * 0.85) return null;
            if (!dither(px0, py0, (1 - fade) * (1.1 - behind * 0.6))) return null;
            if (d > reach - 1.2 && behind < 0.8) return cfg.lead;             // the blade's path: a crisp bright rim
            if (band > 0.82 && behind < 0.5) return cfg.lead;
            return behind < 0.25 ? cfg.lead : behind < 0.6 ? cfg.mid : cfg.tail;
        });
    }
    /** swing(g, { x, y, angle, arc, reach, progress (0..1 over the attack), cls }) — a crisp arc slash per class. */
    function swing(g, o) {
        if (!o) return;
        const cfg = CLASS_SWING[String(o.cls || '').toLowerCase()] || CLASS_SWING.warrior;
        const arc = o.arc || Math.PI * 0.8, reach = o.reach || 20, p = clamp01(o.progress);
        if (p <= 0 || p >= 1) return;
        if (cfg.double) {
            smear(g, o.x, o.y, o.angle || 0, arc, reach, Math.min(1, p * 1.6), cfg, false);
            if (p > 0.3) smear(g, o.x, o.y, o.angle || 0, arc * 0.85, reach * 0.92, (p - 0.3) / 0.7, cfg, true);
        } else smear(g, o.x, o.y, o.angle || 0, arc, reach, p, cfg, false);
    }

    // ---------------------------------------------------------------------
    // Projectiles: drawn as pixels along the flight direction (no rotated bitmaps, so they stay crisp)
    // ---------------------------------------------------------------------
    const PROJ = {
        arcane(p, c, s, now) {           // purple orb, white core, orbiting motes
            p(-1, 0, '#8a50e0', 3); p(0, 0, '#f4e4ff');
            for (let i = 1; i <= 5; i++) p(-i * 2 - 1, (i % 2 ? 1 : -1) * (i > 2 ? 1 : 0), i < 3 ? '#c08cff' : '#6a3cc8');
            const a = now / 70; p(Math.cos(a) * 3, Math.sin(a) * 3, '#ffffff'); p(Math.cos(a + Math.PI) * 3, Math.sin(a + Math.PI) * 3, '#c08cff');
        },
        fire(p, c, s, now) {             // flickering bolt, ember trail
            const f = Math.floor(now / 50) % 2;
            p(-1, 0, '#ff7a20', 3); p(0, 0, '#fff4a0'); p(1, 0, '#ffd060');
            for (let i = 1; i <= 6; i++) p(-i * 1.6 - 1, ((i + f) % 3 - 1), i < 3 ? '#ffa030' : i < 5 ? '#e0501c' : '#7a2a18');
            p(-4, f ? -2 : 2, '#ffd060');
        },
        bone(p) {                        // a bone shard with a green necrotic glint
            for (let i = -3; i <= 2; i++) p(i, 0, '#e8e0c8');
            p(3, 0, '#ffffff'); p(-3, -1, '#e8e0c8'); p(-3, 1, '#e8e0c8'); p(-1, 1, '#a89e80');
            p(-5, 0, '#4ab868'); p(-7, 0, '#2e7a48');
        },
        shadow(p, c, s, now) {           // dark blob with a wispy tail
            p(-1, -1, '#3a2058', 3); p(0, 0, '#0c0612'); p(1, 0, '#a080c0');
            for (let i = 1; i <= 6; i++) p(-i * 2, Math.sin(now / 80 + i) * 1.5, i < 3 ? '#5a3a80' : '#2a1840');
        },
        arrow(p) {                       // shaft, steel head, pale fletching
            for (let i = -5; i <= 1; i++) p(i, 0, '#8a6440');
            p(2, 0, '#e0e4ec'); p(3, 0, '#ffffff'); p(1, -1, '#a8acb8'); p(1, 1, '#a8acb8');
            p(-5, -1, '#e8e0d0'); p(-6, -1, '#e8e0d0'); p(-5, 1, '#e8e0d0'); p(-6, 1, '#e8e0d0');
        },
        enemy_spit(p, c, s, now) {       // a gob of poison with drips
            p(-1, -1, '#5a9a30', 3); p(0, -1, '#eaffb0');
            for (let i = 1; i <= 4; i++) p(-i * 2 - 1, (i % 2) + Math.floor(now / 90 + i) % 2, i < 3 ? '#9ade4a' : '#3c7a28');
        },
        feather(p, c, s, now) {          // the Crow Warden's feather: black vane, a lighter rachis, flutter
            const w = Math.sin(now / 60) * 1.2;
            for (let i = -4; i <= 3; i++) { p(i, w * (i / 4), '#141018'); if (i > -3 && i < 3) { p(i, w * (i / 4) - 1, '#2a2430'); p(i, w * (i / 4) + 1, '#2a2430'); } }
            p(4, 0, '#8a8098'); p(-1, w * -0.25, '#5a5468');
            p(-6, w, '#e03030');                                                 // the crow-red glint that sells it as hostile
        }
    };
    /** projectile(g, { x, y, angle, kind, now }) — x, y is the projectile's head. Unknown kinds draw as arcane. */
    function projectile(g, o) {
        if (!o) return;
        const c = Math.cos(o.angle || 0), s = Math.sin(o.angle || 0);
        const p = (along, across, colour, size = 1) => {
            const X = R(o.x + along * c - across * s - (size - 1) / 2), Y = R(o.y + along * s + across * c - (size - 1) / 2);
            g.fillStyle = colour; g.fillRect(X, Y, size, size);
        };
        (PROJ[o.kind] || PROJ.arcane)(p, c, s, o.now || 0);
    }

    // ---------------------------------------------------------------------
    // Ground markers
    // ---------------------------------------------------------------------
    /** Lock-on ring under the target's feet: a squashed gold ring with four turning corner ticks. */
    function targetRing(g, x, y, r = 9, now = 0) {
        const pulse = (Math.floor(now / 250) % 2);
        pxRing(g, x, y, r + pulse * 0, '#e8b040', (r) * 0.45);
        const a0 = now / 600;
        for (let i = 0; i < 4; i++) {
            const a = a0 + i * (Math.PI / 2);
            for (let k = 0; k < 3; k++) {
                const rr = r + 2 + k * 0 + (pulse ? 1 : 0);
                px(g, x + Math.cos(a + k * 0.12) * rr, y + Math.sin(a + k * 0.12) * rr * 0.45, k === 1 ? '#fff6c0' : '#e8b040');
            }
        }
    }
    /** Mouse aim reticle: a small gapped crosshair that breathes. */
    function aimReticle(g, x, y, now = 0) {
        const gap = 2 + (Math.floor(now / 200) % 2), len = 3;
        const X = R(x), Y = R(y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 0; i < len; i++) {
            const d = gap + i;
            px(g, X + dx * d + (dy ? 1 : 0), Y + dy * d + (dx ? 1 : 0), '#1a0e10');       // a dark drop shadow keeps it readable on grass
            px(g, X + dx * d, Y + dy * d, i === len - 1 ? '#ffe8b0' : '#ffffff');
        }
        px(g, X, Y, '#ff5a3a');
    }
    /** A faint dotted circle (skill range). */
    function rangeCircle(g, x, y, r) {
        let i = 0;
        g.fillStyle = 'rgba(232, 236, 255, 0.55)';
        for (const [dx, dy] of ringPoints(r)) if ((i++ % 4) < 2) g.fillRect(R(x) + dx, R(y) + dy, 1, 1);
    }

    // ---------------------------------------------------------------------
    // Tiny world-space HP bar
    // ---------------------------------------------------------------------
    /**
     * enemyBar(g, x, y, w, hp, maxHp, { chipHp?, statuses?: [name | { name, colour }], boss?, stunned? })
     * x is the bar's centre, y its top. chipHp (the HP shown a moment ago, kept by the caller) draws the recent
     * damage in a lighter colour. Statuses are 2x2 pips in a row under the bar.
     */
    function enemyBar(g, x, y, w = 18, hp = 0, maxHp = 1, opts = {}) {
        const W = Math.max(6, R(w)), X = R(x - W / 2), Y = R(y);
        const frac = maxHp > 0 ? clamp01(hp / maxHp) : 0, chip = maxHp > 0 && opts.chipHp != null ? clamp01(opts.chipHp / maxHp) : frac;
        const fill = R(frac * W), chipW = Math.max(fill, R(chip * W));
        g.fillStyle = '#0c0608'; g.fillRect(X - 1, Y - 1, W + 2, 4);              // frame
        g.fillStyle = '#3a1418'; g.fillRect(X, Y, W, 2);                          // empty
        if (chipW > fill) { g.fillStyle = '#ffd8a0'; g.fillRect(X + fill, Y, chipW - fill, 2); }
        const col = opts.boss ? ['#c83a8a', '#ff7ac0'] : frac > 0.5 ? ['#c83a2a', '#ff6a4a'] : frac > 0.25 ? ['#d0701c', '#ffa040'] : ['#e8301c', '#ff8a6a'];
        if (fill > 0) { g.fillStyle = col[0]; g.fillRect(X, Y, fill, 2); g.fillStyle = col[1]; g.fillRect(X, Y, fill, 1); }
        if (opts.stunned) { g.fillStyle = '#ffe040'; g.fillRect(X - 1, Y - 1, W + 2, 1); }   // a stunned foe's bar gets a yellow lid
        const st = opts.statuses || [];
        for (let i = 0; i < st.length && i * 3 < W + 2; i++) {
            g.fillStyle = '#0c0608'; g.fillRect(X + i * 3 - 1, Y + 3, 4, 4);
            g.fillStyle = statusColour(st[i]); g.fillRect(X + i * 3, Y + 4, 2, 2);
        }
    }

    // ---------------------------------------------------------------------
    // Enemies in the world
    // ---------------------------------------------------------------------
    // The creature painters: ui/battle-hd.js (64x64 box, feet at y 58, facing right) are exported and preferred;
    // ui/world-render.js's 32px map creatures are used when it exports `creatures` and `CREATURE_FOR`.
    const SCALE_HD = 0.5;                       // 64px HD painters at half size: about the height of the 64px-frame player
    function painterFor(enemyKey, style) {
        const HD = ENSO.battleHD, WR = ENSO.worldRender;
        if (style !== 'map' && HD && HD.creatures) {
            const name = (HD.CREATURE_FOR && HD.CREATURE_FOR[enemyKey]) || enemyKey;
            const fn = HD.creatures[name] || (enemyKey && /shade/.test(enemyKey) && HD.creatures.shade);
            if (fn) return { draw: (g, t) => fn(g, t), box: 64, feet: [32, 58], scale: SCALE_HD };
        }
        if (WR && WR.creatures) {
            const name = (WR.CREATURE_FOR && WR.CREATURE_FOR[enemyKey]) || enemyKey;
            const fn = WR.creatures[name];
            if (fn) return { draw: (g, t) => fn(g, 0, 0, t, false), box: 32, feet: [16, 28], scale: 1 };
        }
        if (HD && HD.creatures && HD.creatures.shade) return { draw: (g, t) => HD.creatures.shade(g, t), box: 64, feet: [32, 58], scale: SCALE_HD };
        return { draw: fallbackFoe, box: 32, feet: [16, 28], scale: 1 };
    }
    /** When no painter is loaded (tests, a stripped build): a hunched dark silhouette with red eyes, facing right. */
    function fallbackFoe(g, t) {
        const b = Math.round(Math.sin(t / 200));
        raster(g, 8, 10 + b, 24, 28, (x, y) => {
            const dx = (x - 16) / 8, dy = (y - (20 + b)) / 8;
            return dx * dx + dy * dy * 1.4 <= 1 ? (x < 13 ? '#2a2430' : '#3a3242') : null;
        });
        g.fillStyle = '#e03030'; g.fillRect(19, 16 + b, 2, 1); g.fillRect(22, 16 + b, 1, 1);
    }
    let scratch = null;                         // one reused canvas for tinted enemies (none in Node)
    function scratchCanvas(w, h) {
        if (!scratch) {
            if (typeof OffscreenCanvas !== 'undefined') scratch = new OffscreenCanvas(w, h);
            else if (typeof document !== 'undefined' && document.createElement) scratch = document.createElement('canvas');
            else return null;
        }
        if (scratch.width !== w) scratch.width = w;
        if (scratch.height !== h) scratch.height = h;
        return scratch;
    }

    /**
     * drawEnemy(g, enemyKey, x, y, { facing, state, t, now, style?, scale? }) — the creature art at feet (x, y):
     * soft shadow; bob while moving; lean back + red pulse on windup; lunge on attack; ease back on recover;
     * white flash on hurt; shake + stars on stagger; fade and sink on dead (gone after ~650 ms).
     */
    function drawEnemy(g, enemyKey, x, y, o = {}) {
        const state = o.state || 'idle', t = Math.max(0, o.t || 0), now = o.now || 0;
        const dir = o.facing === 'left' ? -1 : 1;
        const P = painterFor(enemyKey, o.style);
        const scale = (o.scale || 1) * P.scale;
        let dx = 0, dy = 0, alpha = 1, tint = null, tintA = 0, animT = now;
        switch (state) {
            case 'move': dy = -Math.round(Math.abs(Math.sin(now / 95)) * 1.6); animT = now * 1.6; break;
            case 'windup': {
                const k = Math.min(1, t / 220);
                dx = -dir * R(2 * k); dy = R(-1 * k);
                tint = '#ff2010'; tintA = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(now / 55)); break;
            }
            case 'attack': { const k = t < 70 ? t / 70 : Math.max(0, 1 - (t - 70) / 220); dx = dir * R(5 * k); break; }
            case 'recover': dx = dir * R(Math.max(0, 1 - t / 250) * 1); break;
            case 'hurt': dx = -dir * (t < 120 ? 1 : 0); if (t < 170) { tint = '#ffffff'; tintA = t < 90 ? 0.9 : 0.9 * (1 - (t - 90) / 80); } break;
            case 'stagger': dx = (Math.floor(now / 45) % 2 ? 1 : -1); tint = '#ffe040'; tintA = 0.12; break;
            case 'dead': { const k = Math.min(1, t / 650); alpha = 1 - k; dy = R(k * 5); tint = '#000000'; tintA = 0.35 * k; if (alpha <= 0) return; break; }
            default: break;
        }
        // soft shadow, fixed to the ground (doesn't lunge or bob)
        const shR = R(P.box * scale * 0.28);
        if (state !== 'dead' || alpha > 0.4) { pxEllipse(g, x, y, shR + 1, 2, 'rgba(0,0,0,0.18)'); pxEllipse(g, x, y, shR - 1, 1.5, 'rgba(0,0,0,0.18)'); }
        const fx = P.feet[0] * scale, fy = P.feet[1] * scale;
        const bw = Math.ceil(P.box * scale) + 8, bh = Math.ceil(P.box * scale) + 8;    // painters overhang their box a little
        const X = R(x + dx), Y = R(y + dy);
        const sc = scratchCanvas(bw, bh);
        if (sc && sc.getContext) {
            const sg = sc.getContext('2d');
            sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'source-over'; sg.globalAlpha = 1;
            sg.clearRect(0, 0, bw, bh);
            sg.save(); sg.translate(4, 4); sg.scale(scale, scale); P.draw(sg, animT); sg.restore();
            if (tint && tintA > 0) { sg.globalCompositeOperation = 'source-atop'; sg.globalAlpha = Math.min(1, tintA); sg.fillStyle = tint; sg.fillRect(0, 0, bw, bh); sg.globalCompositeOperation = 'source-over'; sg.globalAlpha = 1; }
            g.save();
            g.globalAlpha *= alpha;
            g.imageSmoothingEnabled = false;
            g.translate(X, Y); if (dir < 0) g.scale(-1, 1);
            g.drawImage(sc, -R(fx) - 4, -R(fy) - 4);
            g.restore();
        } else {                                                                // Node / no canvas: draw straight, no tint
            g.save();
            g.globalAlpha *= alpha;
            g.translate(X, Y); g.scale(dir * scale, scale); g.translate(-P.feet[0], -P.feet[1]);
            P.draw(g, animT);
            g.restore();
        }
        if (state === 'stagger') {                                              // dizzy stars over the head
            const hy = Y - R(P.box * scale * 0.8);
            for (let i = 0; i < 3; i++) {
                const a = now / 160 + (i * TAU) / 3;
                const sx = X + R(Math.cos(a) * 6), sy = hy + R(Math.sin(a) * 2);
                g.fillStyle = '#ffe040'; g.fillRect(sx, sy - 1, 1, 3); g.fillRect(sx - 1, sy, 3, 1);
            }
        }
        if (state === 'windup' && t > 40) {                                     // a "!" tell above the head
            const hy = Y - R(P.box * scale * 0.8) - 8;
            if (Math.floor(now / 90) % 2 === 0 || t > 200) pixelText(g, '!', X, hy, '#ff5a3a');
        }
    }

    const api = {
        createFx, telegraph, swing, projectile, targetRing, aimReticle, rangeCircle, enemyBar, drawEnemy,
        pixelText, textWidth, // helpers
        TYPES: Object.keys(LIFE), LIFE, DAMAGE, CLASS_SWING, PROJECTILES: Object.keys(PROJ), statusColour, shapeDepth
    };
    ENSO.actionFx = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
