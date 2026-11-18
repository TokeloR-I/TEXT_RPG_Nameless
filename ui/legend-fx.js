/* =========================================================================
 * Enso's Last Stand — LEGENDARY SKILL VFX (docs/design/LEGENDARY_WEBS.md; Quill)
 * Every legendary skill's own look in the world, in a fight or out of one (Tokelo 2026-11-18: "the fallen angel
 * only has 2 skills on the tree, the fenrir legendary class doesn't even have visual effects").
 *
 *   - Which skill looks like what is DATA: data.skillVfx[skillName] = { style, palette } (src/data.js). This file only
 *     knows styles and palettes, never a skill or class name.
 *   - The sim reports 'skill_fx' events (src/action/sim.js skillFx): phase 'start' (cast), 'fire' (its shape comes out;
 *     cx, cy = where a ground shape lands) and 'impact' (where a projectile stopped). Projectiles in flight are drawn
 *     by projectile(g, pj) from their skill.
 *   - Fenrir's Heir stances: stanceAura() under and around the player while a stance is held, stanceSwitch() as a burst
 *     when it changes (engine.getStance(), data skillWeb.legendaryWebs.<id>.stances.list.<id>.palette).
 *   - Summoned bodies for legendary skills (spirit wolves, thralls, mirror selves) join ENSO.actionFx.BODIES.
 *
 * Rules (as ui/action-fx.js): presentation only, map pixel space, pixel-crisp fillRect runs, time passed in,
 * "random" from a hash, loads in Node for tests.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const R = Math.round;
    const TAU = Math.PI * 2;
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : (v || 0));
    const hash = (a, b = 0, c = 0) => {
        let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const ease = (k) => 1 - (1 - k) * (1 - k);

    // ---------------------------------------------------------------------
    // Palettes: [core, bright, mid, dark, accent]
    // ---------------------------------------------------------------------
    const PALETTES = {
        radiant: { core: '#fffdf2', bright: '#ffeaa0', mid: '#e8b64a', dark: '#8a6a3a', accent: '#ff4a32', ash: '#9a948a' },   // fallen light, ash, the red eyes
        sun:     { core: '#fff6c8', bright: '#ffc840', mid: '#ff7a1c', dark: '#a8300e', accent: '#ffe890', ash: '#5a2a14' },   // Sköll: amber-gold, red flame
        moon:    { core: '#f0eaff', bright: '#b8a0ff', mid: '#6a48b8', dark: '#22123e', accent: '#d8d0ff', ash: '#0c0614' },   // Hati: black-violet, pale moon
        eclipse: { core: '#ffffff', bright: '#ffc840', mid: '#8a5ad8', dark: '#1a0c28', accent: '#ff7a1c', ash: '#2a1838' },   // both wolves
        chain:   { core: '#f4f0e8', bright: '#c8c4bc', mid: '#8a8478', dark: '#3a3630', accent: '#e8b64a', ash: '#5a564e' },   // Gleipnir
        grave:   { core: '#f2ffe8', bright: '#9cffb0', mid: '#3ea860', dark: '#16261a', accent: '#e8dfc4', ash: '#4a5a44' },   // Deathlord: bone and grave-light
        abyss:   { core: '#e8dcff', bright: '#9a6ad8', mid: '#4a2a78', dark: '#0e0818', accent: '#7cff9a', ash: '#2a1e3a' },   // the Abyssal King
        prism:   { core: '#ffffff', bright: '#c8f4ff', mid: '#8a6ae8', dark: '#1e1438', accent: '#ff6ad8', ash: '#5ae8ff' }    // Reality Breaker
    };
    const HUES = ['#ff5a8a', '#ffb040', '#fff05a', '#6aff8a', '#5ae8ff', '#8a7aff', '#e06aff'];   // prism splits
    const pal = (name) => PALETTES[name] || PALETTES.radiant;

    // ---------------------------------------------------------------------
    // Pixel primitives
    // ---------------------------------------------------------------------
    const px = (g, x, y, c, s = 1) => { g.fillStyle = c; g.fillRect(R(x - (s - 1) / 2), R(y - (s - 1) / 2), s, s); };
    /** A ground ring (squashed: perspective), whole pixels: 2 px dots over a soft wider glow, so it reads at game scale. */
    function ring(g, x, y, r, c, squash = 0.5, gap = 0, size = 2) {
        if (r < 0.5) return;
        const n = Math.max(10, Math.ceil(TAU * r * 1.2));
        const a0 = g.globalAlpha;
        for (const pass of r > 8 ? [0, 1] : [1]) {
            const s = pass ? size : size + 2;
            g.globalAlpha = pass ? a0 : a0 * 0.3;
            g.fillStyle = c;
            let last = '';
            for (let i = 0; i < n; i++) {
                if (gap && (i % gap) === 0) continue;
                const a = (i / n) * TAU, X = R(x + Math.cos(a) * r - s / 2), Y = R(y + Math.sin(a) * r * squash - s / 2);
                const k = X + ',' + Y; if (k === last) continue; last = k;
                g.fillRect(X, Y, s, s);
            }
        }
        g.globalAlpha = a0;
    }
    /** A filled ellipse as horizontal runs. */
    function disc(g, x, y, rx, ry, c) {
        g.fillStyle = c;
        const X = R(x), Y = R(y);
        for (let yy = -Math.floor(ry); yy <= Math.floor(ry); yy++) {
            const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry || 1))));
            if (w > 0) g.fillRect(X - w, Y + yy, w * 2, 1);
        }
    }
    function line(g, x0, y0, x1, y1, c, w = 1) {
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        g.fillStyle = c;
        for (let i = 0; i <= n; i++) { const t = i / n; g.fillRect(R(x0 + (x1 - x0) * t - (w - 1) / 2), R(y0 + (y1 - y0) * t - (w - 1) / 2), w, w); }
    }
    /** A vertical column of light (a pillar from the sky). */
    function pillar(g, x, groundY, w, h, P, a) {
        g.globalAlpha = a * 0.55; g.fillStyle = P.mid; g.fillRect(R(x - w), R(groundY - h), R(w * 2), R(h));
        g.globalAlpha = a * 0.85; g.fillStyle = P.bright; g.fillRect(R(x - w / 2), R(groundY - h), Math.max(1, R(w)), R(h));
        g.globalAlpha = a; g.fillStyle = P.core; g.fillRect(R(x) - 0, R(groundY - h), 1, R(h));
        g.globalAlpha = 1;
    }
    /** One feathered wing: `dir` -1 left / 1 right, opened by `k` (0..1), feathers fanned from (x, y). */
    function wing(g, x, y, dir, k, P, len = 16, feathers = 6, lift = 0) {
        for (let i = 0; i < feathers; i++) {
            const a = (-100 + lift + (i / (feathers - 1)) * 80 * k) * Math.PI / 180;
            const L = len * (0.55 + 0.45 * Math.sin((i + 1) / feathers * Math.PI)) * (0.4 + 0.6 * k);
            const ex = x + dir * Math.cos(a + Math.PI / 2) * L, ey = y + Math.sin(a) * L * 0.75;
            line(g, x, y, ex, ey, i % 2 ? P.bright : P.core, 2);
            px(g, ex, ey, P.mid, 3);
        }
    }
    /** Jaws closing: two curved rows of teeth meeting at (x, y). k 0 open .. 1 shut. */
    function jaws(g, x, y, size, k, P) {
        const open = (1 - k) * size * 0.8;
        for (const s of [-1, 1]) {
            for (let i = -3; i <= 3; i++) {
                const bx = x + i * size / 4, by = y + s * (open + Math.abs(i) * size * 0.06);
                line(g, bx - size / 4, by - s * 1, bx + size / 4, by - s * 1, P.dark, 1);
                line(g, bx - 1, by, bx, by - s * size * 0.22, P.core, 1);   // a fang
            }
            line(g, x - size, y + s * (open + size * 0.2), x + size, y + s * (open + size * 0.2), P.mid, 2);
        }
    }
    /** A wolf's head in profile, made of flame or shadow, facing `angle`. */
    function wolfHead(g, x, y, angle, size, P, now) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const at = (u, v) => [x + u * c - v * s, y + u * s + v * c];
        const pts = [[size, 0], [size * 0.6, -size * 0.25], [size * 0.2, -size * 0.35], [-size * 0.1, -size * 0.8], [-size * 0.2, -size * 0.3],
            [-size * 0.5, -size * 0.45], [-size * 0.7, 0], [-size * 0.4, size * 0.4], [size * 0.3, size * 0.3], [size * 0.85, size * 0.15]];
        const f = Math.floor(now / 60) % 3;
        for (let i = 0; i < pts.length; i++) {
            const [ax, ay] = at(...pts[i]); const [bx, by] = at(...pts[(i + 1) % pts.length]);
            line(g, ax, ay, bx, by, i % 3 === f ? P.core : P.bright, 2);
        }
        disc(g, ...at(0, 0), size * 0.38, size * 0.3, P.mid);
        const [ex, ey] = at(size * 0.25, -size * 0.12); px(g, ex, ey, P.core, 2);
        for (let i = 0; i < 10; i++) {   // the mane trails behind
            const [tx, ty] = at(-size * (0.8 + i * 0.3), (hash(i, f) - 0.5) * size * 1.1);
            px(g, tx, ty, i < 3 ? P.bright : i < 6 ? P.mid : P.dark, i < 5 ? 3 : 2);
        }
    }
    /** A wolf seen from the side, for the stance companions and the summoned spirit wolves. */
    function wolfBody(g, x, y, dir, P, now, alpha = 1) {
        const b = R(Math.sin(now / 140) * 0.8), step = Math.floor(now / 120) % 2;
        g.globalAlpha = alpha;
        disc(g, x, y - 6 + b, 7, 3, P.mid);                 // body
        disc(g, x + dir * 7, y - 9 + b, 3, 2.5, P.mid);      // head
        px(g, x + dir * 10, y - 8 + b, P.mid, 2);           // muzzle
        px(g, x + dir * 6, y - 13 + b, P.bright, 2);         // ear
        px(g, x + dir * 8, y - 10 + b, P.core);             // eye
        for (const [lx, o] of [[-5, step], [-2, 1 - step], [3, step], [6, 1 - step]]) g.fillRect(R(x + dir * lx), R(y - 3 + b), 1, 3 + o);
        line(g, x - dir * 7, y - 7 + b, x - dir * 12, y - 10 + b - step, P.bright, 1);   // tail
        g.fillStyle = P.bright; g.fillRect(R(x - 6), R(y - 9 + b), 12, 1);               // the lit back
        g.globalAlpha = 1;
    }
    /** Glyphs drawn in pixels: an eye (Watcher's brand), a skull, a clock, a crown, a cross of light. */
    const GLYPHS = {
        eye(g, x, y, s, P) { disc(g, x, y, s, s * 0.5, P.dark); disc(g, x, y, s * 0.8, s * 0.38, P.bright); disc(g, x, y, s * 0.3, s * 0.3, P.accent); px(g, x, y, P.core); },
        skull(g, x, y, s, P) { disc(g, x, y - s * 0.2, s * 0.8, s * 0.7, P.accent); g.fillStyle = P.accent; g.fillRect(R(x - s * 0.45), R(y + s * 0.3), R(s * 0.9), R(s * 0.4)); px(g, x - s * 0.35, y - s * 0.15, P.dark, 2); px(g, x + s * 0.35, y - s * 0.15, P.dark, 2); px(g, x, y + s * 0.15, P.dark); },
        clock(g, x, y, s, P, now) { ring(g, x, y, s, P.bright, 1); const a = now / 120; line(g, x, y, x + Math.cos(a) * s * 0.8, y + Math.sin(a) * s * 0.8, P.core); line(g, x, y, x + Math.cos(-a / 12) * s * 0.5, y + Math.sin(-a / 12) * s * 0.5, P.accent); },
        crown(g, x, y, s, P) { g.fillStyle = P.accent; g.fillRect(R(x - s), R(y), R(s * 2), 2); for (const o of [-1, 0, 1]) line(g, x + o * s * 0.8, y, x + o * s * 0.8, y - s * (o ? 0.7 : 1), P.accent, 1); },
        cross(g, x, y, s, P) { line(g, x - s, y, x + s, y, P.bright, 1); line(g, x, y - s, x, y + s, P.bright, 1); px(g, x, y, P.core, 2); }
    };
    /** Cracks out of a point: jagged lines (reality, the ground, Gleipnir's links). */
    function cracks(g, x, y, r, n, seed, P, squash = 0.5) {
        for (let i = 0; i < n; i++) {
            let a = (i / n) * TAU + hash(seed, i) * 0.6, cx = x, cy = y;
            const segs = 4;
            for (let j = 1; j <= segs; j++) {
                a += (hash(seed, i, j) - 0.5) * 0.9;
                const nx = x + Math.cos(a) * r * (j / segs), ny = y + Math.sin(a) * r * (j / segs) * squash;
                line(g, cx, cy, nx, ny, j < 2 ? P.core : j < 3 ? P.bright : P.mid, 1);
                cx = nx; cy = ny;
            }
        }
    }
    /** n particles: fn(i, h0, h1, h2) returns [x, y, colour, size] or null. */
    function motes(g, n, seed, fn) {
        for (let i = 0; i < n; i++) { const m = fn(i, hash(seed, i, 1), hash(seed, i, 2), hash(seed, i, 3)); if (m) px(g, m[0], m[1], m[2], m[3] || (i % 2 ? 2 : 1)); }
    }

    // ---------------------------------------------------------------------
    // Styles: each draws one effect at progress k (0..1). e = { x, y, cx, cy, angle, radius, reach, width, seed, P, now, sx, sy }
    // `phase`: which sim phase spawns it; `life` ms. A style with `proj` also draws its projectile in flight.
    // ---------------------------------------------------------------------
    const STYLES = {};
    const style = (name, def) => { STYLES[name] = def; };
    const fade = (k, inn = 0.15) => (k < inn ? k / inn : 1 - (k - inn) / (1 - inn));
    /** A short charge at the caster while any styled skill winds up (every non-self style shows one). */
    function charge(g, e, k) {
        const P = e.P, a = fade(k, 0.5);
        g.globalAlpha = a;
        ring(g, e.x, e.y + 2, 6 + 6 * (1 - k), P.bright, 0.5);
        motes(g, 8, e.seed, (i, h0, h1) => { const ang = h0 * TAU, d = (1 - k) * 14 + 2; return [e.x + Math.cos(ang) * d, e.y - 8 + Math.sin(ang) * d * 0.6, i % 2 ? P.core : P.mid]; });
        g.globalAlpha = 1;
    }

    // --- Fallen Seraphim: fallen light, ash and feathers ---
    style('spear', { proj: (g, pj, P, now) => {
        const c = Math.cos(pj.angle), s = Math.sin(pj.angle);
        for (let i = 0; i < 14; i++) px(g, pj.x - c * i, pj.y - s * i, i < 2 ? P.core : i < 7 ? P.bright : P.mid, i < 4 ? 2 : 1);
        px(g, pj.x - c * 16 + (hash(now >> 5) - 0.5) * 4, pj.y - s * 16 + (hash(now >> 5, 1) - 0.5) * 4, P.ash);
        GLYPHS.cross(g, pj.x, pj.y, 3 + (Math.floor(now / 80) % 2), P);
    }, impact: { life: 520, draw(g, e, k) {
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        GLYPHS.cross(g, e.cx, e.cy - 6, 4 + 10 * ease(k), P);
        ring(g, e.cx, e.cy, 4 + 14 * ease(k), P.bright);
        motes(g, 14, e.seed, (i, h0, h1) => [e.cx + Math.cos(h0 * TAU) * 16 * k, e.cy - 6 + Math.sin(h0 * TAU) * 12 * k + k * k * 8, i % 3 ? P.bright : P.ash]);
        g.globalAlpha = 1;
    } } });
    style('sigil', { proj: (g, pj, P, now) => { GLYPHS.eye(g, pj.x, pj.y, 3, P); px(g, pj.x - Math.cos(pj.angle) * 5, pj.y - Math.sin(pj.angle) * 5, P.mid); },
        impact: { life: 1400, draw(g, e, k) {   // the Watcher's brand: an eye opens over it inside a turning ring
            const P = e.P, a = fade(k, 0.1); g.globalAlpha = a;
            ring(g, e.cx, e.cy + 2, 10, P.mid, 0.5, 5);
            const t = e.now / 300;
            for (let i = 0; i < 6; i++) px(g, e.cx + Math.cos(t + i * TAU / 6) * 10, e.cy + 2 + Math.sin(t + i * TAU / 6) * 5, P.bright, 2);
            GLYPHS.eye(g, e.cx, e.cy - 20 - ease(Math.min(1, k * 3)) * 4, 4, P);
            g.globalAlpha = 1;
        } } });
    style('feathers', { proj: (g, pj, P, now) => {
        const c = Math.cos(pj.angle), s = Math.sin(pj.angle);
        for (let f = -1; f <= 2; f++) {   // four burning feathers in a loose fan
            const ox = -s * f * 3, oy = c * f * 3, back = Math.abs(f) * 3;
            for (let i = 0; i < 6; i++) px(g, pj.x + ox - c * (i + back), pj.y + oy - s * (i + back), i === 0 ? P.core : i < 3 ? P.bright : P.accent);
        }
    }, impact: { life: 600, draw(g, e, k) {
        const P = e.P; g.globalAlpha = fade(k, 0.05);
        motes(g, 18, e.seed, (i, h0, h1) => { const a = h0 * TAU; return [e.cx + Math.cos(a) * 18 * ease(k), e.cy - 6 + Math.sin(a) * 10 * ease(k) + k * 10 * h1, i % 2 ? P.bright : P.ash, 2]; });
        g.globalAlpha = 1;
    } } });
    style('verdict', { phase: 'fire', life: 900, draw(g, e, k) {   // a blade of light falls at the end of the line and stands there
        const P = e.P, reach = e.reach || 60;
        const tx = e.x + Math.cos(e.angle) * reach * 0.8, ty = e.y + Math.sin(e.angle) * reach * 0.8;
        const drop = clamp01(k / 0.25), a = k < 0.25 ? 1 : 1 - (k - 0.25) / 0.75;
        g.globalAlpha = a;
        line(g, e.x, e.y, tx, ty, P.mid, 1);
        const top = ty - 70 + 60 * ease(drop);
        line(g, tx, top - 22, tx, top + 6, P.core, 3); line(g, tx - 6, top - 14, tx + 6, top - 14, P.bright, 2);   // hilt and blade
        if (drop >= 1) { ring(g, tx, ty, 6 + 18 * (k - 0.25), P.bright); cracks(g, tx, ty + 2, 16, 6, e.seed, P); }
        motes(g, 12, e.seed, (i, h0, h1) => [tx + (h0 - 0.5) * 30, ty - 30 * h1 + k * 30, P.ash]);
        g.globalAlpha = 1;
    } });
    style('halo', { phase: 'start', life: 1200, draw(g, e, k) {
        const P = e.P, a = fade(k, 0.1); g.globalAlpha = a;
        const r = 4 + 10 * ease(Math.min(1, k * 2));
        ring(g, e.x, e.y - 30, r, P.bright, 0.35); ring(g, e.x, e.y - 30, r - 1, P.core, 0.35, 3);
        ring(g, e.x, e.y + 2, 8 + 8 * k, P.mid, 0.5, 4);
        motes(g, 16, e.seed, (i, h0, h1) => [e.x + (h0 - 0.5) * 26, e.y - 30 + ((h1 + k) % 1) * 32, P.ash]);
        g.globalAlpha = 1;
    } });
    style('wing_wrap', { phase: 'start', life: 900, draw(g, e, k) {   // a grey wing folds round you
        const P = e.P; g.globalAlpha = fade(k, 0.2);
        const fold = k < 0.5 ? k * 2 : 1;
        wing(g, e.x - 2, e.y - 14, -1, fold, { ...P, core: '#e8e4dc', bright: P.ash, mid: P.dark }, 16, 7, 40 * fold);
        wing(g, e.x + 2, e.y - 14, 1, fold, { ...P, core: '#e8e4dc', bright: P.ash, mid: P.dark }, 16, 7, 40 * fold);
        ring(g, e.x, e.y - 8, 12, P.bright, 0.9, 3);
        g.globalAlpha = 1;
    } });
    style('mercy', { phase: 'start', life: 1300, draw(g, e, k) {
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        ring(g, e.x, e.y + 2, 10 + 4 * Math.sin(k * 6), P.bright);
        motes(g, 20, e.seed, (i, h0, h1) => { const t = (h1 + k * 1.2) % 1; return [e.x + Math.sin(h0 * TAU + t * 4) * 9, e.y + 2 - t * 34, t < 0.6 ? P.bright : P.core, i % 4 ? 1 : 2]; });
        for (let i = 0; i < 3; i++) GLYPHS.cross(g, e.x + (i - 1) * 9, e.y - 12 - ((k * 1.5 + i * 0.3) % 1) * 20, 2, P);
        g.globalAlpha = 1;
    } });
    style('ashfall', { phase: 'fire', life: 1200, draw(g, e, k) {   // ash falls on everything around; embers fly back to you
        const P = e.P, r = e.radius || 80; g.globalAlpha = fade(k, 0.1);
        ring(g, e.x, e.y, r * ease(Math.min(1, k * 2)), P.ash, 0.5, 4);
        motes(g, 50, e.seed, (i, h0, h1, h2) => { const a = h0 * TAU, d = Math.sqrt(h1) * r; const t = (h2 + k) % 1; return [e.x + Math.cos(a) * d + Math.sin(t * 9) * 2, e.y + Math.sin(a) * d * 0.5 - 30 + t * 30, i % 5 ? P.ash : P.bright]; });
        if (k > 0.4) motes(g, 10, e.seed + 7, (i, h0, h1) => { const t = (k - 0.4) / 0.6, a = h0 * TAU, d = r * 0.8 * (1 - t); return [e.x + Math.cos(a) * d, e.y - 8 + Math.sin(a) * d * 0.5, P.accent, 2]; });
        g.globalAlpha = 1;
    } });
    style('coal', { phase: 'start', life: 1600, draw(g, e, k) {   // the live coal comes down from above into your hands; fire rings out
        const P = e.P;
        const fall = clamp01(k / 0.35);
        g.globalAlpha = 1;
        if (fall < 1) { const y = e.y - 90 + 78 * ease(fall); pillar(g, e.x, y, 2, 90 - 78 * ease(fall), P, 0.5); disc(g, e.x, y, 3, 3, P.accent); px(g, e.x, y, P.core, 2); }
        else {
            const t = (k - 0.35) / 0.65; g.globalAlpha = 1 - t;
            disc(g, e.x, e.y - 10, 4, 4, P.accent); px(g, e.x, e.y - 10, P.core, 2);
            ring(g, e.x, e.y + 2, 6 + 30 * ease(t), P.accent); ring(g, e.x, e.y + 2, 4 + 24 * ease(t), P.bright, 0.5, 3);
            pillar(g, e.x, e.y + 2, 8 * (1 - t), 60, P, 1 - t);
        }
        g.globalAlpha = 1;
    } });
    style('wingstep', { phase: 'start', life: 800, draw(g, e, k) {
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        const flap = Math.abs(Math.sin(k * Math.PI * 3));
        wing(g, e.x - 3, e.y - 16, -1, 0.4 + 0.6 * flap, P, 18, 6); wing(g, e.x + 3, e.y - 16, 1, 0.4 + 0.6 * flap, P, 18, 6);
        ring(g, e.x, e.y + 2, 6 + 14 * k, P.ash, 0.4);
        motes(g, 10, e.seed, (i, h0, h1) => [e.x + (h0 - 0.5) * 30 * k, e.y - 10 + h1 * 20 * k, '#f4f0e8', 2]);
        g.globalAlpha = 1;
    } });
    style('gale', { phase: 'fire', life: 700, draw(g, e, k) {   // one beat: a ring of wind and feathers out
        const P = e.P, r = (e.radius || 80) * ease(k); g.globalAlpha = 1 - k;
        ring(g, e.x, e.y, r, P.bright, 0.5, 2); ring(g, e.x, e.y, r * 0.8, P.ash, 0.5, 3);
        motes(g, 24, e.seed, (i, h0) => { const a = h0 * TAU; return [e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.5 - 4, i % 2 ? '#f4f0e8' : P.ash, 2]; });
        wing(g, e.x - 3, e.y - 16, -1, 1 - k * 0.5, P, 20, 6); wing(g, e.x + 3, e.y - 16, 1, 1 - k * 0.5, P, 20, 6);
        g.globalAlpha = 1;
    } });
    style('six_wings', { phase: 'fire', life: 1000, draw(g, e, k) {   // six wings open round you and the glare goes out
        const P = e.P, r = e.radius || 80; g.globalAlpha = fade(k, 0.2);
        const o = ease(Math.min(1, k * 2));
        for (const [dy, len] of [[-24, 18], [-16, 24], [-8, 16]]) { wing(g, e.x - 3, e.y + dy, -1, o, P, len, 6); wing(g, e.x + 3, e.y + dy, 1, o, P, len, 6); }
        ring(g, e.x, e.y, r * ease(k), P.core, 0.5); ring(g, e.x, e.y, r * ease(k) - 3, P.bright, 0.5, 3);
        g.globalAlpha = 1;
    } });
    style('pillars', { phase: 'fire', life: 1100, draw(g, e, k) {   // judgement from above: light comes down in columns all round
        const P = e.P, r = e.radius || 80;
        for (let i = 0; i < 7; i++) {
            const delay = hash(e.seed, i) * 0.4, t = clamp01((k - delay) / 0.45);
            if (t <= 0 || t >= 1) continue;
            const a = hash(e.seed, i, 4) * TAU, d = (0.3 + 0.7 * hash(e.seed, i, 5)) * r;
            const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d * 0.5;
            pillar(g, x, y, 3, 80 * (1 - t * 0.3), P, 1 - t);
            g.globalAlpha = 1 - t; ring(g, x, y, 3 + 10 * t, P.bright); g.globalAlpha = 1;
        }
    } });
    style('descent', { phase: 'fire', life: 1500, draw(g, e, k) {   // you come down like judgement: column, six wings, shockwave
        const P = e.P, r = e.radius || 100;
        const col = clamp01(k / 0.3);
        if (col < 1) pillar(g, e.x, e.y + 2, 4 + 10 * col, 120, P, 1);
        const t = clamp01((k - 0.25) / 0.75);
        g.globalAlpha = 1 - t;
        ring(g, e.x, e.y + 2, r * ease(t), P.core); ring(g, e.x, e.y + 2, r * ease(t) - 4, P.accent, 0.5, 2); ring(g, e.x, e.y + 2, r * ease(t) * 0.6, P.bright, 0.5, 3);
        cracks(g, e.x, e.y + 2, r * 0.5, 9, e.seed, P);
        for (const [dy, len] of [[-26, 22], [-18, 28], [-10, 20]]) { wing(g, e.x - 3, e.y + dy, -1, 1, P, len, 6); wing(g, e.x + 3, e.y + dy, 1, 1, P, len, 6); }
        g.globalAlpha = 1;
    } });

    // --- Fenrir's Heir: sunfire, consuming dark, the chain ---
    style('wolf_head', { proj: (g, pj, P, now) => wolfHead(g, pj.x, pj.y, pj.angle, 10, P, now),
        impact: { life: 600, draw(g, e, k) { burst(g, e, k, 18); } } });
    style('devour_sun', { proj: (g, pj, P, now) => { disc(g, pj.x, pj.y, 6, 6, P.mid); disc(g, pj.x, pj.y, 4, 4, P.bright); px(g, pj.x, pj.y, P.core, 3); wolfHead(g, pj.x - Math.cos(pj.angle) * 4, pj.y - Math.sin(pj.angle) * 4, pj.angle, 11, P, now); },
        impact: { life: 1300, draw(g, e, k) {   // the sun appears over it, and the jaws close on it
            const P = e.P, sunK = clamp01(k / 0.35);
            g.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
            disc(g, e.cx, e.cy - 18, 10 * ease(sunK), 10 * ease(sunK), P.bright); disc(g, e.cx, e.cy - 18, 6 * ease(sunK), 6 * ease(sunK), P.core);
            if (k > 0.3) jaws(g, e.cx, e.cy - 18, 14, clamp01((k - 0.3) / 0.25), { ...P, core: '#ffffff', dark: P.dark });
            if (k > 0.55) burst(g, e, (k - 0.55) / 0.45, 36);
            g.globalAlpha = 1;
        } } });
    /** A fire or shadow burst on the ground (impacts). */
    function burst(g, e, k, r) {
        const P = e.P; g.globalAlpha = 1 - k;
        ring(g, e.cx, e.cy, r * ease(k), P.bright); ring(g, e.cx, e.cy, r * 0.6 * ease(k), P.mid, 0.5, 2);
        motes(g, 16, e.seed, (i, h0, h1) => { const a = h0 * TAU, d = r * ease(k) * (0.4 + 0.6 * h1); return [e.cx + Math.cos(a) * d, e.cy + Math.sin(a) * d * 0.5 - k * 10 * h1, i % 3 ? P.mid : P.core, 2]; });
        g.globalAlpha = 1;
    }
    style('howl', { phase: 'start', life: 1100, draw(g, e, k) {   // the howl: arcs of sound roll out, the wolf's head shows over you
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        for (let i = 0; i < 3; i++) { const t = (k * 1.4 - i * 0.18); if (t > 0 && t < 1) ring(g, e.x, e.y - 12, 6 + (e.radius || 60) * 0.7 * t, i ? P.mid : P.bright, 0.55, 2 + i); }
        wolfHead(g, e.x, e.y - 40, -Math.PI / 2 + 0.3, 12, P, e.now);
        motes(g, 12, e.seed, (i, h0, h1) => [e.x + (h0 - 0.5) * 22, e.y - ((h1 + k) % 1) * 30, i % 2 ? P.bright : P.mid, 2]);
        g.globalAlpha = 1;
    } });
    style('rush', { phase: 'start', life: 700, draw(g, e, k) {   // a burning wolf runs with you, flames left on the path, then the rake
        const P = e.P, len = 48 * Math.min(1, k * 4);
        g.globalAlpha = 1 - k;
        for (let i = 0; i < len; i += 2) {
            const x = e.x + Math.cos(e.angle) * i, y = e.y + Math.sin(e.angle) * i;
            const h = 3 + hash(e.seed, i) * 6 * (1 - k);
            line(g, x, y, x, y - h, i % 4 ? P.mid : P.bright, 1); px(g, x, y - h, P.core);
        }
        const ex = e.x + Math.cos(e.angle) * 48, ey = e.y + Math.sin(e.angle) * 48;
        if (k > 0.2) for (let s = -1; s <= 1; s++) { const a = e.angle + s * 0.5; line(g, ex, ey - 6, ex + Math.cos(a) * 26 * ease((k - 0.2) / 0.8), ey - 6 + Math.sin(a) * 26 * ease((k - 0.2) / 0.8), P.bright, 2); }
        if (k < 0.4) wolfHead(g, e.x + Math.cos(e.angle) * len, e.y + Math.sin(e.angle) * len - 8, e.angle, 8, P, e.now);
        g.globalAlpha = 1;
    } });
    style('meteors', { phase: 'fire', life: 1400, draw(g, e, k) {   // the sun falls in sparks on the spot
        const P = e.P, r = e.radius || 44;
        g.globalAlpha = fade(k, 0.1); ring(g, e.cx, e.cy, r, P.dark, 0.5, 2); ring(g, e.cx, e.cy, r * 0.96, P.mid, 0.5, 5); g.globalAlpha = 1;
        for (let i = 0; i < 12; i++) {
            const t0 = hash(e.seed, i) * 0.6, t = clamp01((k - t0) / 0.3);
            if (t <= 0 || t >= 1) continue;
            const a = hash(e.seed, i, 2) * TAU, d = Math.sqrt(hash(e.seed, i, 3)) * r * 0.9;
            const tx = e.cx + Math.cos(a) * d, ty = e.cy + Math.sin(a) * d * 0.5;
            if (t < 0.6) { const f = t / 0.6, x = tx + 18 * (1 - f), y = ty - 50 * (1 - f); line(g, x + 4, y - 8, x, y, P.mid, 1); px(g, x, y, P.core, 2); }
            else { const f = (t - 0.6) / 0.4; g.globalAlpha = 1 - f; ring(g, tx, ty, 2 + 6 * f, P.bright); px(g, tx, ty - 2, P.core, 2); g.globalAlpha = 1; }
        }
    } });
    style('maw', { phase: 'fire', life: 900, draw(g, e, k) {   // darkness opens and drags inward: spiral arms turning in
        const P = e.P, r = e.radius || 64; g.globalAlpha = fade(k, 0.15);
        disc(g, e.x, e.y + 2, r * 0.25 * (1 - k * 0.5), r * 0.12, P.ash);
        for (let arm = 0; arm < 5; arm++) for (let j = 0; j < 16; j++) {
            const t = j / 16, a = arm * TAU / 5 + t * 3 + k * 5, d = r * (1 - t) * (1 - k * 0.6);
            px(g, e.x + Math.cos(a) * d, e.y + 2 + Math.sin(a) * d * 0.5, t < 0.3 ? P.dark : t < 0.7 ? P.mid : P.bright, j % 4 ? 1 : 2);
        }
        ring(g, e.x, e.y + 2, r * (1 - k * 0.7), P.mid, 0.5, 3);
        g.globalAlpha = 1;
    } });
    style('jaws', { proj: (g, pj, P, now) => { jaws(g, pj.x, pj.y, 5, 0.3 + 0.3 * Math.sin(now / 60), P); px(g, pj.x - Math.cos(pj.angle) * 6, pj.y - Math.sin(pj.angle) * 6, P.mid, 2); },
        impact: { life: 700, draw(g, e, k) { g.globalAlpha = fade(k, 0.05); jaws(g, e.cx, e.cy - 8, 10, clamp01(k / 0.35), e.P); g.globalAlpha = 1; if (k > 0.35) burst(g, e, (k - 0.35) / 0.65, 14); } } });
    style('drain', { phase: 'fire', life: 1100, draw(g, e, k) {   // the dark feeds: tendrils reach out, then crawl back into you
        const P = e.P, r = e.radius || 80; g.globalAlpha = fade(k, 0.1);
        for (let i = 0; i < 9; i++) {
            const a = hash(e.seed, i) * TAU, reach = r * (k < 0.5 ? ease(k * 2) : 1), back = k < 0.5 ? 0 : (k - 0.5) * 2;
            for (let j = 0; j < 14; j++) { const t = j / 14; if (t < back) continue; const d = reach * t, w = Math.sin(t * 7 + e.now / 90 + i) * 3; px(g, e.x + Math.cos(a) * d - Math.sin(a) * w, e.y - 4 + Math.sin(a) * d * 0.5 + Math.cos(a) * w * 0.5, j % 3 ? P.mid : P.bright); }
        }
        ring(g, e.x, e.y + 2, 10, P.bright, 0.5, 2);
        g.globalAlpha = 1;
    } });
    style('devour_moon', { phase: 'fire', life: 1500, draw(g, e, k) {   // a moon rises over you, Hati swallows it, everything is pulled in
        const P = e.P, r = e.radius || 120;
        const rise = clamp01(k / 0.3), bite = clamp01((k - 0.3) / 0.25), pull = clamp01((k - 0.5) / 0.5);
        g.globalAlpha = 1 - pull * 0.8;
        if (bite < 1) { disc(g, e.x, e.y - 40 - 10 * rise, 12 * ease(rise), 12 * ease(rise), P.core); disc(g, e.x + 4, e.y - 42 - 10 * rise, 10 * ease(rise), 10 * ease(rise), P.accent); }
        if (k > 0.3) jaws(g, e.x, e.y - 50, 18, bite, { ...P, core: '#ffffff' });
        if (pull > 0) { ring(g, e.x, e.y + 2, r * (1 - ease(pull)), P.bright); ring(g, e.x, e.y + 2, r * (1 - ease(pull)) * 0.8, P.mid, 0.5, 2);
            motes(g, 30, e.seed, (i, h0, h1) => { const a = h0 * TAU + pull * 2, d = r * (1 - pull) * (0.3 + 0.7 * h1); return [e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.5, i % 2 ? P.mid : P.bright, 2]; });
            disc(g, e.x, e.y + 2, 6 * pull, 3 * pull, P.ash); }
        g.globalAlpha = 1;
    } });
    style('pack', { phase: 'start', life: 1000, draw(g, e, k) {   // two wolves leap out of you, one of sun and one of moon
        const t = ease(k), a = fade(k, 0.1);
        wolfBody(g, e.x - 6 - 18 * t, e.y + 4 - Math.sin(k * Math.PI) * 10, -1, pal('sun'), e.now, a);
        wolfBody(g, e.x + 6 + 18 * t, e.y + 4 - Math.sin(k * Math.PI) * 10, 1, pal('moon'), e.now, a);
        g.globalAlpha = a; ring(g, e.x, e.y + 2, 6 + 16 * t, '#e8e0d0', 0.5, 3); g.globalAlpha = 1;
    } });
    style('chains', { phase: 'start', life: 900, draw(g, e, k) {   // Gleipnir breaks: links fly off you and hang as armour
        const P = e.P; g.globalAlpha = fade(k, 0.05);
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU, d = 6 + 22 * ease(k);
            const x = e.x + Math.cos(a) * d, y = e.y - 10 + Math.sin(a) * d * 0.6;
            ring(g, x, y, 2, i % 2 ? P.bright : P.mid, 1.4);
        }
        if (k < 0.25) for (let i = 0; i < 4; i++) line(g, e.x - 10, e.y - 16 + i * 4, e.x + 10, e.y - 14 + i * 4, P.mid, 1);
        ring(g, e.x, e.y - 8, 12, P.accent, 1.1, 4);
        g.globalAlpha = 1;
    } });
    style('eclipse', { phase: 'fire', life: 1200, draw(g, e, k) {   // sun and moon slide together over you; the corona rings out
        const S = pal('sun'), M = pal('moon'), r = e.radius || 100;
        const slide = ease(clamp01(k / 0.4)), t = clamp01((k - 0.35) / 0.65);
        g.globalAlpha = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
        disc(g, e.x - 14 + 14 * slide, e.y - 40, 10, 10, S.bright); disc(g, e.x - 14 + 14 * slide, e.y - 40, 6, 6, S.core);
        disc(g, e.x + 14 - 14 * slide, e.y - 40, 9, 9, M.ash);
        if (t > 0) { ring(g, e.x, e.y - 40, 11 + 3 * Math.sin(e.now / 60), S.mid, 1, 2); ring(g, e.x, e.y + 2, r * ease(t), S.bright); ring(g, e.x, e.y + 2, r * ease(t) * 0.85, M.bright, 0.5, 2); }
        g.globalAlpha = 1;
    } });

    // --- Deathlord Eternal: bone, grave-light and the abyss ---
    style('grave_rise', { phase: 'start', life: 1100, draw(g, e, k) {   // the ground cracks and bony hands come up either side
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        for (const s of [-1, 1]) {
            const x = e.x + s * 16, y = e.y + 6;
            cracks(g, x, y, 10, 5, e.seed + s, P);
            const up = ease(clamp01(k / 0.5)) * 10;
            line(g, x, y, x, y - up, P.accent, 2);
            for (const f of [-2, 0, 2]) line(g, x + f, y - up, x + f * 1.5, y - up - 3, P.accent, 1);
            motes(g, 6, e.seed + s * 9, (i, h0, h1) => [x + (h0 - 0.5) * 12, y - h1 * 18 * k, P.bright]);
        }
        g.globalAlpha = 1;
    } });
    style('banner', { phase: 'start', life: 1300, draw(g, e, k) {   // a banner of bones on a spear rises behind you
        const P = e.P; g.globalAlpha = fade(k, 0.15);
        const up = ease(clamp01(k / 0.4)) * 34, x = e.x - 10, wave = Math.sin(e.now / 120) * 2;
        line(g, x, e.y + 2, x, e.y + 2 - up, P.accent, 1);
        if (up > 20) { g.fillStyle = P.dark; g.fillRect(R(x + 1), R(e.y + 2 - up), 10, 12 + R(wave)); GLYPHS.skull(g, x + 6, e.y + 2 - up + 6, 3, P); }
        ring(g, e.x, e.y + 2, 10 + 8 * k, P.bright, 0.5, 3);
        g.globalAlpha = 1;
    } });
    style('hands', { phase: 'fire', life: 1200, draw(g, e, k) {   // bony hands burst out all round and claw
        const P = e.P, r = e.radius || 90;
        g.globalAlpha = fade(k, 0.1); ring(g, e.x, e.y + 2, r * ease(Math.min(1, k * 3)), P.mid, 0.5, 3); g.globalAlpha = 1;
        for (let i = 0; i < 12; i++) {
            const t = clamp01((k - hash(e.seed, i) * 0.3) / 0.5); if (t <= 0 || t >= 1) continue;
            const a = hash(e.seed, i, 2) * TAU, d = (0.3 + 0.7 * hash(e.seed, i, 3)) * r;
            const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d * 0.5, up = Math.sin(t * Math.PI) * 10;
            g.globalAlpha = 1 - t * 0.5;
            cracks(g, x, y, 5, 3, e.seed + i, P);
            line(g, x, y, x, y - up, P.accent, 2);
            for (const f of [-2, 0, 2]) line(g, x + f, y - up, x + f * 1.6, y - up - 3, P.accent, 1);
            g.globalAlpha = 1;
        }
    } });
    style('mantle', { phase: 'start', life: 1200, draw(g, e, k) {   // the abyss wraps round you like a cloak
        const P = e.P; g.globalAlpha = fade(k, 0.15);
        for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU + k * 3, d = 12 - 4 * k; px(g, e.x + Math.cos(a) * d, e.y - 10 + Math.sin(a) * d * 1.2, i % 3 ? P.mid : P.bright, 2); }
        ring(g, e.x, e.y + 2, 12, P.accent, 0.5, 2);
        motes(g, 12, e.seed, (i, h0, h1) => [e.x + (h0 - 0.5) * 24, e.y + 2 - ((h1 + k) % 1) * 28, P.dark, 2]);
        g.globalAlpha = 1;
    } });
    style('word', { proj: (g, pj, P, now) => { GLYPHS.skull(g, pj.x, pj.y, 3, P); for (let i = 1; i < 6; i++) px(g, pj.x - Math.cos(pj.angle) * i * 2, pj.y - Math.sin(pj.angle) * i * 2, i < 3 ? P.bright : P.mid); },
        impact: { life: 1200, draw(g, e, k) {   // silence: a ring of runes closes on its mouth
            const P = e.P; g.globalAlpha = fade(k, 0.1);
            const r = 14 * (1 - ease(Math.min(1, k * 2))) + 6;
            for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + e.now / 400; px(g, e.cx + Math.cos(a) * r, e.cy - 14 + Math.sin(a) * r * 0.6, P.bright, 2); }
            line(g, e.cx - 4, e.cy - 14, e.cx + 4, e.cy - 14, P.accent, 1);
            g.globalAlpha = 1;
        } } });
    style('throne', { phase: 'start', life: 1400, draw(g, e, k) {   // bone pillars rise round you, then a crown over your head
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU, x = e.x + Math.cos(a) * 14, y = e.y + 2 + Math.sin(a) * 7;
            const h = ease(clamp01((k - i * 0.03) / 0.35)) * (10 + (i % 2) * 6);
            line(g, x, y, x, y - h, P.accent, 2); px(g, x, y - h - 1, P.core, 2);
        }
        GLYPHS.crown(g, e.x, e.y - 30, 4, P);
        g.globalAlpha = 1;
    } });
    style('kingfall', { phase: 'fire', life: 1400, draw(g, e, k) {   // the Abyssal King comes down: a dark column, a crown, a quake
        const P = e.P, r = e.radius || 120;
        const col = clamp01(k / 0.3);
        if (col < 1) { pillar(g, e.x, e.y + 2, 6 + 8 * col, 110, { ...P, core: P.bright, bright: P.mid, mid: P.dark }, 1); GLYPHS.crown(g, e.x, e.y - 30 - 40 * (1 - col), 5, P); }
        const t = clamp01((k - 0.25) / 0.75);
        g.globalAlpha = 1 - t;
        ring(g, e.x, e.y + 2, r * ease(t), P.bright); ring(g, e.x, e.y + 2, r * ease(t) * 0.7, P.accent, 0.5, 2);
        cracks(g, e.x, e.y + 2, r * 0.6, 10, e.seed, { ...P, core: P.accent, bright: P.bright, mid: P.mid });
        motes(g, 20, e.seed, (i, h0, h1) => { const a = h0 * TAU, d = r * ease(t) * h1; return [e.x + Math.cos(a) * d, e.y + 2 + Math.sin(a) * d * 0.5 - t * 12, P.accent, 2]; });
        g.globalAlpha = 1;
    } });
    style('scythe', { proj: (g, pj, P, now) => {   // a spinning scythe of grave-light
        const a = now / 40;
        for (let i = 0; i < 10; i++) { const t = i / 10, b = a + t * 2.2; px(g, pj.x + Math.cos(b) * 6, pj.y + Math.sin(b) * 4, t < 0.3 ? P.core : P.bright, t < 0.5 ? 2 : 1); }
        line(g, pj.x, pj.y, pj.x + Math.cos(a + Math.PI) * 5, pj.y + Math.sin(a + Math.PI) * 3, P.accent, 1);
    }, impact: { life: 700, draw(g, e, k) {   // the cut, and a wisp of soul flying back toward you
        const P = e.P; g.globalAlpha = 1 - k;
        for (let s = -1; s <= 1; s += 2) line(g, e.cx - 10, e.cy - 14 + s * 4 * k, e.cx + 10, e.cy - 4 - s * 4 * k, P.bright, 2);
        const wx = e.cx + (e.x - e.cx) * ease(k), wy = e.cy - 10 + (e.y - 10 - e.cy + 10) * ease(k) - Math.sin(k * Math.PI) * 14;
        disc(g, wx, wy, 2, 2, P.core); px(g, wx - 2, wy + 2, P.bright);
        g.globalAlpha = 1;
    } } });
    style('rot', { phase: 'fire', life: 1500, draw(g, e, k) {   // a green rot cloud settles over everything around
        const P = e.P, r = e.radius || 100; g.globalAlpha = fade(k, 0.15) * 0.9;
        ring(g, e.x, e.y + 2, r * ease(Math.min(1, k * 2)), P.mid, 0.5, 2);
        motes(g, 60, e.seed, (i, h0, h1, h2) => { const a = h0 * TAU, d = Math.sqrt(h1) * r * ease(Math.min(1, k * 2)); return [e.x + Math.cos(a) * d + Math.sin(e.now / 300 + i) * 2, e.y + Math.sin(a) * d * 0.5 - h2 * 10 - k * 6, i % 4 ? P.mid : P.bright, i % 5 ? 1 : 2]; });
        GLYPHS.skull(g, e.x, e.y - 34 - k * 6, 4, P);
        g.globalAlpha = 1;
    } });
    style('requiem', { phase: 'fire', life: 1800, draw(g, e, k) {   // souls spiral up out of everything around, singing
        const P = e.P, r = e.radius || 110;
        g.globalAlpha = fade(k, 0.1); ring(g, e.x, e.y + 2, r, P.mid, 0.5, 3); ring(g, e.x, e.y + 2, r * (1 - k), P.bright, 0.5, 2);
        for (let i = 0; i < 14; i++) {
            const a = hash(e.seed, i) * TAU + k * 4, d = r * (0.2 + 0.8 * hash(e.seed, i, 2)) * (1 - k * 0.6), up = k * 60 * (0.5 + hash(e.seed, i, 3));
            const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d * 0.5 - up;
            disc(g, x, y, 2, 2.5, P.core); px(g, x, y + 3, P.bright); px(g, x + Math.sin(e.now / 80 + i), y + 5, P.mid);
        }
        g.globalAlpha = 1;
    } });
    style('dominion', { phase: 'fire', life: 1800, draw(g, e, k) {   // every enemy kneels: a sigil of bone spreads, a skull crown over you
        const P = e.P, r = e.radius || 140;
        const spread = ease(clamp01(k / 0.4));
        g.globalAlpha = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
        ring(g, e.x, e.y + 2, r * spread, P.bright); ring(g, e.x, e.y + 2, r * spread * 0.92, P.accent, 0.5, 3); ring(g, e.x, e.y + 2, r * spread * 0.5, P.mid, 0.5, 2);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + k; line(g, e.x + Math.cos(a) * r * spread * 0.5, e.y + 2 + Math.sin(a) * r * spread * 0.25, e.x + Math.cos(a + TAU / 3) * r * spread * 0.5, e.y + 2 + Math.sin(a + TAU / 3) * r * spread * 0.25, P.mid, 1); }
        GLYPHS.skull(g, e.x, e.y - 34, 5, P); GLYPHS.crown(g, e.x, e.y - 40, 5, P);
        pillar(g, e.x, e.y + 2, 4 * (1 - k), 70, P, 1 - k);
        g.globalAlpha = 1;
    } });

    // --- Reality Breaker: cracks, split colour, frozen time ---
    style('shard', { proj: (g, pj, P, now) => {
        const c = Math.cos(pj.angle), s = Math.sin(pj.angle);
        for (let i = 0; i < 9; i++) px(g, pj.x - c * i + s * (i % 2), pj.y - s * i - c * (i % 2), HUES[(i + (now >> 6)) % HUES.length], i < 3 ? 2 : 1);
        px(g, pj.x, pj.y, P.core, 3);
    }, impact: { life: 700, draw(g, e, k) {   // a star of cracks in the air, the colours split apart
        const P = e.P; g.globalAlpha = 1 - k;
        cracks(g, e.cx, e.cy - 8, 6 + 14 * ease(k), 7, e.seed, P, 0.9);
        for (let h = 0; h < 3; h++) ring(g, e.cx + (h - 1) * 2 * k * 3, e.cy - 8, 4 + 10 * k, HUES[h * 2], 0.9, 3);
        g.globalAlpha = 1;
    } } });
    style('fault', { phase: 'fire', life: 1100, draw(g, e, k) {   // the world tears along a line: a bright seam, edges lifting
        const P = e.P, reach = e.reach || 96;
        const len = reach * ease(Math.min(1, k * 3));
        g.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        let x = e.x, y = e.y;
        for (let i = 1; i <= 12; i++) {
            const t = i / 12; if (t * reach > len) break;
            const nx = e.x + Math.cos(e.angle) * reach * t + (hash(e.seed, i) - 0.5) * 6 * -Math.sin(e.angle), ny = e.y + Math.sin(e.angle) * reach * t + (hash(e.seed, i) - 0.5) * 6 * Math.cos(e.angle);
            line(g, x, y, nx, ny, P.core, 2); line(g, x, y - 2, nx, ny - 2, HUES[i % HUES.length], 1); line(g, x, y + 2, nx, ny + 2, P.mid, 1);
            x = nx; y = ny;
        }
        g.globalAlpha = 1;
    } });
    style('unwrite', { phase: 'fire', life: 1100, draw(g, e, k) {   // the thing is erased: white blocks, glitch rows
        const P = e.P, reach = e.reach || 70;
        const tx = e.x + Math.cos(e.angle) * reach * 0.7, ty = e.y + Math.sin(e.angle) * reach * 0.7;
        g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        line(g, e.x, e.y - 6, tx, ty - 6, P.bright, 1);
        for (let i = 0; i < 10; i++) {
            const w = 4 + hash(e.seed, i, R(e.now / 60)) * 14, h = 1 + (i % 3);
            g.fillStyle = i % 3 ? P.core : HUES[i % HUES.length];
            g.fillRect(R(tx - w / 2 + (hash(e.seed, i) - 0.5) * 12), R(ty - 22 + i * 2.4), R(w * (1 - k * 0.5)), h);
        }
        g.globalAlpha = 1;
    } });
    style('phase', { phase: 'start', life: 900, draw(g, e, k) {   // you split into colour ghosts for a moment
        const a = fade(k, 0.1);
        for (let h = 0; h < 3; h++) {
            const off = Math.sin(k * Math.PI) * 6 * (h - 1);
            g.globalAlpha = a * 0.6; disc(g, e.x + off, e.y - 12, 5, 10, [HUES[0], HUES[4], HUES[5]][h]);
        }
        g.globalAlpha = a; ring(g, e.x, e.y + 2, 8 + 10 * k, e.P.bright, 0.5, 2);
        g.globalAlpha = 1;
    } });
    style('null', { phase: 'fire', life: 1400, draw(g, e, k) {   // a moment cut out: grey, still, a clock with no hands moving
        const P = e.P, r = e.radius || 110;
        g.globalAlpha = (k < 0.8 ? 0.35 : 0.35 * (1 - (k - 0.8) / 0.2)); disc(g, e.x, e.y + 2, r * ease(Math.min(1, k * 4)), r * 0.5 * ease(Math.min(1, k * 4)), '#b8c0d0');
        g.globalAlpha = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
        ring(g, e.x, e.y + 2, r * ease(Math.min(1, k * 4)), P.core); ring(g, e.x, e.y + 2, r * ease(Math.min(1, k * 4)) - 3, P.bright, 0.5, 4);
        GLYPHS.clock(g, e.x, e.y - 30, 8, P, k < 0.2 ? e.now : 0);
        g.globalAlpha = 1;
    } });
    style('borrowed', { phase: 'start', life: 1100, draw(g, e, k) {   // a clock over you spins far too fast
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        GLYPHS.clock(g, e.x, e.y - 32, 7, P, e.now * 6);
        for (let i = 0; i < 3; i++) ring(g, e.x, e.y + 2, (6 + 6 * i) + 6 * ((k * 3) % 1), HUES[(i * 2 + 1) % HUES.length], 0.5, 3);
        g.globalAlpha = 1;
    } });
    style('rewind', { phase: 'start', life: 1500, draw(g, e, k) {   // a spiral winds backwards into you
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        for (let j = 0; j < 40; j++) { const t = j / 40, a = -t * 10 - k * 12, d = 4 + (1 - ((t + k) % 1)) * 26; px(g, e.x + Math.cos(a) * d, e.y - 10 + Math.sin(a) * d * 0.6, HUES[j % HUES.length]); }
        GLYPHS.clock(g, e.x, e.y - 36, 6, P, -e.now * 4);
        g.globalAlpha = 1;
    } });
    style('prism', { phase: 'fire', life: 800, draw(g, e, k) {   // light breaks into colours: rays out in every hue
        const r = (e.radius || 90) * ease(k); g.globalAlpha = 1 - k;
        for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + k; line(g, e.x + Math.cos(a) * r * 0.3, e.y - 6 + Math.sin(a) * r * 0.15, e.x + Math.cos(a) * r, e.y - 6 + Math.sin(a) * r * 0.5, HUES[i % HUES.length], 1); }
        disc(g, e.x, e.y - 8, 6 * (1 - k), 6 * (1 - k), e.P.core);
        g.globalAlpha = 1;
    } });
    style('mirror', { phase: 'start', life: 900, draw(g, e, k) {   // a pane of glass that is not there cracks either side of you
        const P = e.P; g.globalAlpha = fade(k, 0.1);
        for (const s of [-1, 1]) {
            const x = e.x + s * 14;
            g.globalAlpha = 0.5 * fade(k, 0.1); g.fillStyle = P.bright; g.fillRect(R(x - 5), R(e.y - 24), 10, 26);
            g.globalAlpha = fade(k, 0.1); cracks(g, x, e.y - 12, 10 * ease(k), 6, e.seed + s, P, 1.2);
        }
        g.globalAlpha = 1;
    } });
    style('lie', { proj: (g, pj, P, now) => { GLYPHS.eye(g, pj.x, pj.y, 3, P); for (let i = 1; i < 5; i++) px(g, pj.x - Math.cos(pj.angle) * i * 2, pj.y - Math.sin(pj.angle) * i * 2, HUES[(i + (now >> 6)) % HUES.length]); },
        impact: { life: 1100, draw(g, e, k) { g.globalAlpha = fade(k, 0.1); GLYPHS.eye(g, e.cx, e.cy - 22, 4, e.P); cracks(g, e.cx, e.cy - 8, 12 * ease(k), 6, e.seed, e.P, 0.9); g.globalAlpha = 1; } } });
    style('collapse', { phase: 'fire', life: 1500, draw(g, e, k) {   // the world folds in on the spot: a grid that buckles and drops
        const P = e.P, r = e.radius || 56;
        const fold = ease(clamp01(k / 0.6));
        g.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
        for (let i = -4; i <= 4; i++) {
            const d = r * (1 - fold * 0.8);
            line(g, e.cx + i * d / 4, e.cy - d * 0.5, e.cx + i * d / 4 * (1 - fold), e.cy + d * 0.5 * (1 - fold * 0.5), HUES[(i + 4) % HUES.length], 1);
            line(g, e.cx - d, e.cy + i * d / 8, e.cx + d, e.cy + i * d / 8 * (1 - fold), P.mid, 1);
        }
        ring(g, e.cx, e.cy, r * (1 - fold * 0.9), P.core);
        if (k > 0.6) { const t = (k - 0.6) / 0.4; ring(g, e.cx, e.cy, r * 1.2 * ease(t), P.bright); cracks(g, e.cx, e.cy, r * ease(t), 8, e.seed, P); }
        g.globalAlpha = 1;
    } });

    // ---------------------------------------------------------------------
    // The effect list
    // ---------------------------------------------------------------------
    function createFx(table = {}) {
        let list = [];
        const lookup = (skill) => (skill && table[skill]) || null;
        return {
            /** One sim 'skill_fx' event. Returns true if the skill has its own look. */
            event(ev, now) {
                const v = lookup(ev.skill);
                const st = v && STYLES[v.style];
                if (!st) return false;
                const P = pal(v.palette);
                const base = { x: ev.x, y: ev.y, cx: ev.cx != null ? ev.cx : ev.x, cy: ev.cy != null ? ev.cy : ev.y, angle: ev.angle || 0, radius: ev.radius || 0, reach: ev.reach || 0, width: ev.width || 0, P, seed: (now | 0) ^ list.length * 7919 };
                if (ev.phase === 'impact') { if (st.impact) list.push({ ...base, draw: st.impact.draw, t0: now, life: st.impact.life }); return true; }
                if (ev.phase === 'start' && st.phase !== 'start' && ev.castMs) list.push({ ...base, draw: charge, t0: now, life: Math.max(200, ev.castMs) });
                if ((st.phase || 'fire') === ev.phase && st.draw) list.push({ ...base, draw: st.draw, t0: now, life: st.life || 900 });
                return true;
            },
            /** A burst on its own (a stance switch). */
            spawn(drawFn, o, now, life = 900) { list.push({ seed: now | 0, ...o, draw: drawFn, t0: now, life }); },
            draw(g, now) {
                if (!list.length) return;
                g.save();
                list = list.filter((e) => {
                    const k = (now - e.t0) / e.life;
                    if (k >= 1) return false;
                    if (k >= 0) e.draw(g, { ...e, now }, k);
                    return true;
                });
                g.globalAlpha = 1;
                g.restore();
            },
            count() { return list.length; }
        };
    }

    /** A projectile in flight drawn by its skill's style. Returns false if the skill has no look (action-fx draws it). */
    function projectile(g, pj, now, table = {}) {
        const v = pj && pj.skill && table[pj.skill];
        const st = v && STYLES[v.style];
        if (!st || !st.proj) return false;
        st.proj(g, pj, pal(v.palette), now);
        return true;
    }

    // ---------------------------------------------------------------------
    // Fenrir's Heir: the stance you hold, on you (Tokelo 2026-11-18: "when I switch I just see text")
    // ---------------------------------------------------------------------
    /** Under and round the player while a stance is held. `st`: { palette, bond (0..100), companion }. */
    function stanceAura(g, x, y, st, now, layer) {
        if (!st) return;
        const P = pal(st.palette);
        const bond = clamp01((st.bond || 0) / 100);
        if (layer === 'ground') {   // a ring on the ground that turns, brighter as the bond grows
            const t = now / 900;
            g.globalAlpha = 0.45 + 0.4 * bond;
            ring(g, x, y + 1, 13, P.mid, 0.45, 3);
            for (let i = 0; i < 3 + R(bond * 3); i++) { const a = t + i * TAU / (3 + R(bond * 3)); px(g, x + Math.cos(a) * 13, y + 1 + Math.sin(a) * 6, P.bright, 3); }
            g.globalAlpha = 1;
            return;
        }
        // Over the body: Sköll trails rising embers, Hati drifting shadow, the Fenrir stance turning chain links.
        g.globalAlpha = 0.85;
        if (st.motes === 'chain') {
            for (let i = 0; i < 4; i++) { const a = now / 700 + i * TAU / 4; ring(g, x + Math.cos(a) * 12, y - 12 + Math.sin(a) * 4, 1.5, i % 2 ? P.bright : P.mid, 1.4); }
        } else {
            const n = 10 + R(bond * 10), rise = st.motes === 'sink' ? -1 : 1;
            motes(g, n, 31, (i, h0, h1, h2) => {
                const t = ((now / (900 + h2 * 600)) + h1) % 1;
                return [x + (h0 - 0.5) * 18 + Math.sin(t * 6 + i) * 2, y - 2 - (rise > 0 ? t : 1 - t) * 30, t < 0.4 ? P.bright : t < 0.8 ? P.mid : P.dark, i % 4 ? 1 : 2];
            });
        }
        g.globalAlpha = 1;
        if (st.companion) {   // the wolf itself runs at your side, a ghost at first and more solid as the bond grows
            const dir = st.facing === 'left' ? -1 : 1;
            wolfBody(g, x - dir * 16, y + 2, dir, P, now, 0.4 + 0.5 * bond);
        }
    }
    /** The burst when you change wolf: the new wolf's colour floods out and its head shows over you. */
    function stanceSwitch(g, e, k) {
        const P = e.P; g.globalAlpha = fade(k, 0.08);
        ring(g, e.x, e.y + 2, 4 + 34 * ease(k), P.bright); ring(g, e.x, e.y + 2, 2 + 26 * ease(k), P.mid, 0.5, 2);
        pillar(g, e.x, e.y + 2, 6 * (1 - k), 50, P, 1 - k);
        if (e.motes === 'chain') for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ring(g, e.x + Math.cos(a) * 18 * ease(k), e.y - 10 + Math.sin(a) * 10 * ease(k), 2, P.bright, 1.4); }
        else wolfHead(g, e.x, e.y - 34 - 6 * k, -Math.PI / 2 + 0.35, 9, P, e.now);
        motes(g, 18, e.seed, (i, h0, h1) => { const a = h0 * TAU, d = 30 * ease(k) * h1; return [e.x + Math.cos(a) * d, e.y - 8 + Math.sin(a) * d * 0.6, i % 2 ? P.bright : P.core, 2]; });
        g.globalAlpha = 1;
    }

    // ---------------------------------------------------------------------
    // Summoned bodies (32 px box, feet at 16, 28), added to action-fx's painter table
    // ---------------------------------------------------------------------
    const BODIES = {
        spectral_wolf(g, px0, py0, t) {   // Call of the Pack: half sun, half moon (which one by a hash of where it stands)
            const P = (Math.floor(t / 4000) + (px0 | 0)) % 2 ? pal('moon') : pal('sun');
            wolfBody(g, px0 + 16, py0 + 28, 1, P, t, 0.9);
            px(g, px0 + 16 + (hash(t >> 7) - 0.5) * 16, py0 + 18 - (t % 600) / 60, P.bright);
        },
        deathless_thrall(g, px0, py0, t) {   // Raise the Fallen Host: a grave-knight in rusted black plate, green eye-light
            const P = pal('grave'), b = Math.sin(t / 200) * 0.8, f = Math.floor(t / 160) % 2;
            g.fillStyle = 'rgba(10,30,14,0.35)'; g.fillRect(px0 + 8, py0 + 27, 16, 2);
            g.fillStyle = '#1c1a1e'; g.fillRect(px0 + 12, py0 + 20, 3, 8 - f); g.fillRect(px0 + 17, py0 + 20, 3, 7 + f);
            g.fillStyle = '#2a2830'; g.fillRect(px0 + 10, py0 + 11 + b, 12, 10);
            g.fillStyle = P.accent; g.fillRect(px0 + 11, py0 + 13 + b, 10, 1); g.fillRect(px0 + 15, py0 + 12 + b, 2, 8);   // the ribcage showing
            g.fillStyle = '#3a3840'; g.fillRect(px0 + 12, py0 + 4 + b, 8, 7);
            g.fillStyle = P.bright; g.fillRect(px0 + 13, py0 + 7 + b, 2, 1); g.fillRect(px0 + 17, py0 + 7 + b, 2, 1);
            g.fillStyle = '#8a8a7a'; g.fillRect(px0 + 22, py0 + 6 + b, 1, 14);                                              // the grave-blade
            g.fillStyle = P.mid; g.fillRect(px0 + 22, py0 + 6 + b, 1, 2);
        },
        mirror_self(g, px0, py0, t) {   // Mirror Self: a figure of glass with colour splitting at its edges
            const b = Math.sin(t / 160) * 0.8;
            for (let h = 0; h < 3; h++) { g.globalAlpha = 0.45; g.fillStyle = [HUES[0], HUES[4], HUES[5]][h]; g.fillRect(px0 + 11 + h - 1, py0 + 8 + b, 10, 18); }
            g.globalAlpha = 0.85; g.fillStyle = '#e8f4ff'; g.fillRect(px0 + 12, py0 + 9 + b, 8, 16); disc(g, px0 + 16, py0 + 6 + b, 4, 4, '#f4faff');
            g.fillStyle = '#5ae8ff'; g.fillRect(px0 + 13, py0 + 14 + b, 1, 6); g.fillRect(px0 + 18, py0 + 11 + b, 1, 4);
            g.globalAlpha = 1;
        }
    };
    if (ENSO.actionFx && ENSO.actionFx.BODIES) Object.assign(ENSO.actionFx.BODIES, BODIES);

    const api = { createFx, projectile, stanceAura, stanceSwitch, STYLES, PALETTES, BODIES, styleNames: () => Object.keys(STYLES) };
    ENSO.legendFx = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
