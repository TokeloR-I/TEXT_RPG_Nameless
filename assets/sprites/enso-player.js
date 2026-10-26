/* =========================================================================
 * Enso's Last Stand — THE ENSO PLAYER (original art, drawn by code; Saffron/Quill art plan, M1–M2)
 * Every pixel of this character is made here, from shapes and our own palette. No picture, pack or
 * generator output goes in, so nothing third-party is ever used as input (docs/art/ORIGINAL_ART_PLAN.md §0).
 *
 * A pose is a skeleton (head, shoulders, elbows, hands, hips, knees, feet, weapon angle). Each body part is a
 * shape on that skeleton (ellipse, capsule or polygon) shaded by its own curvature, light from the top left,
 * with a darker edge where it overlaps something and a coloured outline round the whole figure.
 *
 * Contract (the same as the earlier 64x64 doll, so the world, hitboxes and camera need no change):
 *   frame 64x64, feet at (32, 43), facings down/up/left/right (left mirrors right), 19 poses:
 *   stand, walk1-6, ready1-4, slash1-4, parry, hit, down2, down3.
 * Shape choices (hair style, outfit style, hat, weapon type, shield type) pick the sheet; colours (skin, hair
 * colour, outfit colour, metal) are palette roles, so one sheet serves every colour. Sheets are built when first
 * asked for (ENSO.sheetProviders, ui/sprites.js) and each frame only when first drawn.
 * Presentation only.
 * ========================================================================= */
(function (global) {
    const ENSO = global.ENSO || (global.ENSO = {});
    const sheets = ENSO.spriteSheets || (ENSO.spriteSheets = {});
    const manifest = ENSO.spriteManifest || (ENSO.spriteManifest = {});
    const providers = ENSO.sheetProviders || (ENSO.sheetProviders = []);

    const W = 64, H = 64, FRAME = { w: W, h: H };
    const FACINGS = ['down', 'up', 'right', 'left'];
    const POSES = ['stand', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'ready1', 'ready2', 'ready3', 'ready4',
        'slash1', 'slash2', 'slash3', 'slash4', 'parry', 'hit', 'down2', 'down3'];

    // ---------------------------------------------------------------------
    // Materials: each is a ramp of 4 roles (highlight, base, shade, deep) plus its outline role.
    // ---------------------------------------------------------------------
    const MAT = {
        skin: '1234q', hair: '5678w', cloth: 'ABCDx', cloth2: 'EFGHy', leather: 'IJKLz', metal: 'MNOPQ',
        wood: 'RSTUV', accent: 'abcdv', hat: 'fghij', shieldFace: 'lmnop'
    };
    const ROLE_MAT = {};
    for (const [m, roles] of Object.entries(MAT)) for (const r of roles) ROLE_MAT[r] = m;
    const OUTLINE_OF = Object.fromEntries(Object.entries(ROLE_MAT).map(([r, m]) => [r, MAT[m][4]]));
    // Fixed roles: eyes, eye shine, mouth, the smear of a swing.
    const EYE = 'e', SHINE = 'r', MOUTH = 't', SMEAR = 'Z', SMEAR2 = 'Y', BLACK = 'k';

    // ---------------------------------------------------------------------
    // Choices shown in the creator. Indices are what saves keep; any index wraps, so older saves still load.
    // ---------------------------------------------------------------------
    const SKINS = [{ name: 'Ash', swatch: '#c79a74' }, { name: 'Ember', swatch: '#b4704f' }, { name: 'Umber', swatch: '#7d5038' }, { name: 'Pale', swatch: '#e6c3a2' }];
    const HAIR_STYLES = ['Tousled', 'Tied Tail', 'Bob', 'Braid', 'Top Knot', 'Long Loose', 'Swept Undercut', 'Shorn', 'Curls'];
    const HAIR_COLOURS = [
        { name: 'Raven', swatch: '#2e2a33' }, { name: 'Chestnut', swatch: '#6b4129' }, { name: 'Copper', swatch: '#a8532c' },
        { name: 'Honey', swatch: '#c08d43' }, { name: 'Ash Blond', swatch: '#b9aa86' }, { name: 'Silver', swatch: '#a9adb6' },
        { name: 'Snow', swatch: '#e2e0d8' }, { name: 'Ember Red', swatch: '#9b2f2c' }, { name: 'Moss', swatch: '#4f6a3c' },
        { name: 'Dusk Blue', swatch: '#3d4f7a' }, { name: 'Violet', swatch: '#6a4683' }, { name: 'Rose', swatch: '#b46a78' }
    ];
    const OUTFIT_STYLES = [
        { name: 'Wanderer', cloth2: '#5a4b3e', accent: '#a8452f' },
        { name: 'Ranger Coat', cloth2: '#b8a888', accent: '#4a3a2a' },
        { name: 'Ironclad', cloth2: '#4a4744', accent: '#b8862f' },
        { name: 'Robe', cloth2: '#3e3436', accent: '#c9a54a' },
        { name: 'Shadow Leathers', cloth2: '#2f2c33', accent: '#5a5260' },
        { name: 'Farmhand', cloth2: '#d6cdb4', accent: '#7a5a38' }
    ];
    const OUTFIT_COLOURS = [
        { name: 'Moss', swatch: '#4f6b3e' }, { name: 'Rust', swatch: '#9a4630' }, { name: 'Indigo', swatch: '#3b4c80' },
        { name: 'Ash', swatch: '#6e6c70' }, { name: 'Ochre', swatch: '#b0843a' }, { name: 'Plum', swatch: '#6a3f68' },
        { name: 'Teal', swatch: '#2f6b6a' }, { name: 'Bone', swatch: '#c9bea0' }, { name: 'Crow', swatch: '#2c2a30' },
        { name: 'Ember', swatch: '#c0602c' }
    ];
    const HATS = [
        { name: 'None' }, { name: 'Hood', swatch: '#4a4038' }, { name: 'Wide Brim', swatch: '#5a4632' }, { name: 'Bandana', swatch: '#8a2e2a' },
        { name: 'Iron Helm', swatch: '#8a8c94' }, { name: 'Circlet', swatch: '#c9a54a' }, { name: 'Straw Hat', swatch: '#c8a85e' }
    ];
    const WEAPON_TYPES = ['Sword', 'Axe', 'Mace', 'Spear'];
    const METALS = [
        { name: 'Iron', swatch: '#9a9ca4' }, { name: 'Bronze', swatch: '#b07a3e' }, { name: 'Frost', swatch: '#8ec4d8' },
        { name: 'Gold', swatch: '#d6ae48' }, { name: 'Obsidian', swatch: '#4a4458' }
    ];
    const WEAPONS = METALS.flatMap((m) => WEAPON_TYPES.map((t) => `${m.name} ${t}`));
    const SHIELD_TYPES = ['Round', 'Kite', 'Buckler'];
    const SHIELD_COLOURS = [{ name: 'Oak', swatch: '#7a5634' }, { name: 'Crimson', swatch: '#8a2e2a' }, { name: 'Azure', swatch: '#34507e' }, { name: 'Ash', swatch: '#6a6a6e' }];
    const SHIELDS = ['None', ...SHIELD_COLOURS.flatMap((c) => SHIELD_TYPES.map((t) => `${c.name} ${t}`))];

    const wrap = (i, n) => ((Number.isInteger(i) ? i : 0) % n + n) % n;
    /** The shape choices behind a cosmetics object (all wrapped into range). */
    function shapeOf(c = {}) {
        const weapon = wrap(c.weapon, WEAPONS.length), shield = wrap(c.shield, SHIELDS.length);
        return {
            hair: wrap(c.hairStyle, HAIR_STYLES.length), outfit: wrap(c.outfit, OUTFIT_STYLES.length), hat: wrap(c.hat, HATS.length),
            weapon: c.weapon < 0 ? -1 : weapon % WEAPON_TYPES.length, shield: shield === 0 ? -1 : (shield - 1) % SHIELD_TYPES.length
        };
    }

    // ---------------------------------------------------------------------
    // Colour: ramps hue-shifted like a painter's (warm lights, cool violet shadows).
    // ---------------------------------------------------------------------
    function hexToHsl(hex) {
        const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
        if (mx === mn) return [0, 0, l];
        const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return [h * 60, s, l];
    }
    function hslToHex(h, s, l) {
        h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
        const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
        const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
        return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
    }
    /** Shift a hue toward a target hue by up to `amt` degrees. */
    const toward = (h, target, amt) => { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); };
    /** [highlight, base, shade, deep, outline] from one base colour. */
    function ramp(hex) {
        const [h, s, l] = hexToHsl(hex);
        return [
            hslToHex(toward(h, 50, 12), s * 0.95 + 0.03, l + (1 - l) * 0.28),
            hex,
            hslToHex(toward(h, 255, 14), Math.min(1, s * 1.05 + 0.04), l * 0.74),
            hslToHex(toward(h, 260, 24), Math.min(1, s * 1.05 + 0.06), l * 0.52),
            hslToHex(toward(h, 265, 30), Math.min(1, s * 0.9 + 0.08), Math.min(0.2, l * 0.34))
        ];
    }
    const ramps = new Map();
    const rampOf = (hex) => { if (!ramps.has(hex)) ramps.set(hex, ramp(hex)); return ramps.get(hex); };

    /** Role -> colour for one character: skin from `appearance`, the rest from the cosmetics. `palette` may give
     *  base colours directly ({ skin, hair, cloth, cloth2, accent, hat, metal }), as villagers do. */
    function paletteFor({ appearance = 0, cosmetics = {}, palette = {} } = {}) {
        const style = OUTFIT_STYLES[wrap(cosmetics.outfit, OUTFIT_STYLES.length)];
        const hatDef = HATS[wrap(cosmetics.hat, HATS.length)];
        const weapon = wrap(cosmetics.weapon, WEAPONS.length), shield = wrap(cosmetics.shield, SHIELDS.length);
        const base = {
            skin: SKINS[wrap(appearance, SKINS.length)].swatch,
            hair: HAIR_COLOURS[wrap(cosmetics.hairColor, HAIR_COLOURS.length)].swatch,
            cloth: OUTFIT_COLOURS[wrap(cosmetics.outfitColor, OUTFIT_COLOURS.length)].swatch,
            cloth2: style.cloth2, accent: style.accent, leather: '#5e4330',
            metal: METALS[Math.floor(weapon / WEAPON_TYPES.length)].swatch, wood: '#7a5a3a',
            hat: hatDef.swatch || '#4a4038',
            shieldFace: shield ? SHIELD_COLOURS[Math.floor((shield - 1) / SHIELD_TYPES.length)].swatch : '#7a5634',
            ...palette
        };
        const out = { [BLACK]: '#17131c', [EYE]: '#1c1820', [SHINE]: '#f2ecdc', [MOUTH]: rampOf(base.skin)[3], [SMEAR]: '#fff6dc', [SMEAR2]: '#d8e4f0' };
        for (const [m, roles] of Object.entries(MAT)) { const r = rampOf(base[m]); for (let i = 0; i < 5; i++) out[roles[i]] = r[i]; }
        return out;
    }

    // ---------------------------------------------------------------------
    // Raster: a frame is a grid of roles. Shapes are drawn as "parts" with their own shading.
    // ---------------------------------------------------------------------
    const LIGHT = [-0.58, -0.81];                // toward the light: top left
    function newGrid() { return { role: new Array(W * H).fill(null), mat: new Array(W * H).fill(null) }; }
    /** A part under construction: pixel index -> shading value in [-1, 1] (1 = facing the light). */
    const part = () => new Map();
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    function setPx(p, x, y, s) { x = Math.floor(x); y = Math.floor(y); if (inside(x, y)) p.set(y * W + x, Math.max(-1, Math.min(1, s))); }
    /** Filled ellipse, shaded as a dome. */
    function ellipse(p, cx, cy, rx, ry, bias = 0) {
        for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
            const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
            if (d <= 1) setPx(p, x, y, (dx * LIGHT[0] + dy * LIGHT[1]) * 0.95 + bias);
        }
        return p;
    }
    /** Thick line (a limb), shaded as a cylinder. */
    function capsule(p, ax, ay, bx, by, r, bias = 0) {
        const vx = bx - ax, vy = by - ay, len2 = vx * vx + vy * vy || 1e-6;
        for (let y = Math.floor(Math.min(ay, by) - r - 1); y <= Math.max(ay, by) + r + 1; y++) for (let x = Math.floor(Math.min(ax, bx) - r - 1); x <= Math.max(ax, bx) + r + 1; x++) {
            const px = x + 0.5, py = y + 0.5;
            const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
            const ox = px - (ax + vx * t), oy = py - (ay + vy * t), d = Math.hypot(ox, oy);
            if (d <= r) setPx(p, x, y, ((ox * LIGHT[0] + oy * LIGHT[1]) / Math.max(r, 0.8)) * 0.9 + bias);
        }
        return p;
    }
    /** Filled polygon, shaded across its width at each row (a cloth tube). */
    function poly(p, pts, bias = 0, flat = false) {
        const ys = pts.map((q) => q[1]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
            const py = y + 0.5, xs = [];
            for (let i = 0; i < pts.length; i++) {
                const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
                if ((y1 <= py && y2 > py) || (y2 <= py && y1 > py)) xs.push(x1 + ((py - y1) / (y2 - y1)) * (x2 - x1));
            }
            xs.sort((a, b) => a - b);
            for (let k = 0; k + 1 < xs.length; k += 2) {
                const l = xs[k], r = xs[k + 1], mid = (l + r) / 2, half = Math.max(1, (r - l) / 2);
                for (let x = Math.round(l); x < Math.round(r); x++) setPx(p, x, y, flat ? bias : ((x + 0.5 - mid) / half) * LIGHT[0] * 1.1 + bias);
            }
        }
        return p;
    }
    const rect = (p, x, y, w, h, s = 0) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPx(p, x + i, y + j, s); return p; };
    /** Line of single pixels (thin details: weapon edges, staves). */
    function line(p, ax, ay, bx, by, s = 0) {
        const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
        for (let i = 0; i <= n; i++) setPx(p, ax + ((bx - ax) * i) / n + 0.5, ay + ((by - ay) * i) / n + 0.5, s);
        return p;
    }

    /** Put a part on the grid in a material. `edge` darkens the part's border where it lies over something
     *  already drawn, so overlapping shapes stay readable. `cut` removes pixels (used to carve). */
    function paint(grid, p, mat, { edge = true, levels = [0.42, -0.2, -0.62] } = {}) {
        const roles = MAT[mat] || mat;
        for (const [i, s] of p) {
            const x = i % W, y = (i / W) | 0;
            let k = s > levels[0] ? 0 : s > levels[1] ? 1 : s > levels[2] ? 2 : 3;
            if (edge) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy;
                if (!inside(nx, ny)) continue;
                const j = ny * W + nx;
                if (!p.has(j) && grid.role[j] && grid.mat[j] !== mat) { k = Math.max(k, dy < 0 && dx === 0 ? 2 : 3); break; }
            }
            grid.role[i] = roles[k]; grid.mat[i] = mat;
        }
    }
    const dot = (grid, x, y, role) => { x = Math.floor(x); y = Math.floor(y); if (inside(x, y)) { grid.role[y * W + x] = role; grid.mat[y * W + x] = ROLE_MAT[role] || role; } };
    const erase = (grid, x, y) => { x = Math.floor(x); y = Math.floor(y); if (inside(x, y)) { grid.role[y * W + x] = null; grid.mat[y * W + x] = null; } };

    /** The coloured outline: every empty pixel touching the figure takes the darkest colour of what it touches. */
    function outline(grid) {
        const add = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = y * W + x;
            if (grid.role[i]) continue;
            let best = null;
            for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
                const nx = x + dx, ny = y + dy;
                if (!inside(nx, ny)) continue;
                const r = grid.role[ny * W + nx];
                if (r && r !== SMEAR && r !== SMEAR2) best = OUTLINE_OF[r] || BLACK;
            }
            if (best) add.push([i, best]);
        }
        for (const [i, r] of add) { grid.role[i] = r; grid.mat[i] = 'outline'; }
        // Feet and the ground contact read darkest.
        for (let x = 0; x < W; x++) for (let y = H - 1; y > 0; y--) { const i = y * W + x; if (grid.mat[i] === 'outline' && !grid.role[i + W]) { if (y >= 42) grid.role[i] = BLACK; break; } }
    }

    // ---------------------------------------------------------------------
    // Skeletons. Coordinates are frame pixels (feet at 32, 43). R/L are the character's own right/left; the
    // character holds the weapon in the right hand and the shield on the left arm. `right` is drawn and
    // `left` is its mirror.
    // ---------------------------------------------------------------------
    const lerp = (a, b, t) => a + (b - a) * t;
    function baseSkeleton(facing) {
        if (facing === 'right') return {
            head: [32.5, 17.6], neck: [32, 24], torsoTop: 24.2, torsoBottom: 34.5, torsoX: 32, lean: 0, bob: 0,
            shR: [31.5, 26], elR: [31.8, 29.8], haR: [32.6, 33.2], shL: [32.5, 26], elL: [32.6, 29.8], haL: [33.2, 33],
            hipR: [31.6, 34.6], knR: [31.8, 38.6], ftR: [31.6, 42.4], hipL: [32.4, 34.6], knL: [32.6, 38.6], ftL: [32.8, 42.4],
            weapon: 65, eyes: 'open'
        };
        const s = facing === 'up' ? 1 : -1;            // +x is the character's right when seen from behind
        return {
            head: [32, 17.6], neck: [32, 24], torsoTop: 24.2, torsoBottom: 34.5, torsoX: 32, lean: 0, bob: 0,
            shR: [32 + s * 5.3, 26], elR: [32 + s * 5.9, 29.6], haR: [32 + s * 6.2, 33.2],
            shL: [32 - s * 5.3, 26], elL: [32 - s * 5.9, 29.6], haL: [32 - s * 6.2, 33.2],
            hipR: [32 + s * 2.1, 34.6], knR: [32 + s * 2.2, 38.6], ftR: [32 + s * 2.2, 42.4],
            hipL: [32 - s * 2.1, 34.6], knL: [32 - s * 2.2, 38.6], ftL: [32 - s * 2.2, 42.4],
            weapon: 90 + s * 20, eyes: 'open'
        };
    }
    const add = (p, dx, dy) => [p[0] + dx, p[1] + dy];
    function shiftBody(k, dx, dy, { feet = false } = {}) {
        for (const j of ['head', 'neck', 'shR', 'elR', 'haR', 'shL', 'elL', 'haL', 'hipR', 'hipL']) k[j] = add(k[j], dx, dy);
        if (feet) for (const j of ['knR', 'knL', 'ftR', 'ftL']) k[j] = add(k[j], dx, dy);
        k.torsoTop += dy; k.torsoBottom += dy; k.torsoX += dx;
    }
    /** A knee halfway between hip and foot, pushed by `bend` (side view: forward; front view: outward). */
    const knee = (hip, foot, bx, by = 0) => [lerp(hip[0], foot[0], 0.5) + bx, lerp(hip[1], foot[1], 0.52) + by];
    const elbow = (sh, hand, bx, by = 0) => [lerp(sh[0], hand[0], 0.5) + bx, lerp(sh[1], hand[1], 0.5) + by];

    /** The skeleton of one frame. */
    function skeleton(facing, pose) {
        const k = baseSkeleton(facing);
        const side = facing === 'right', back = facing === 'up', s = back ? 1 : -1;
        const m = /^([a-z]+)(\d?)$/.exec(pose), name = m[1], n = Number(m[2] || 0);
        k.pose = name;
        k.weaponBehind = back;
        k.shieldFront = !back;
        if (name === 'walk') {
            const ph = ((n - 1) / 6) * Math.PI * 2, sn = Math.sin(ph), cs = Math.cos(ph);
            const bob = Math.abs(cs) > 0.7 ? 0 : -1;
            shiftBody(k, 0, bob);
            if (side) {
                k.ftR = [32 + 4.2 * sn, 42.4 - (cs > 0.2 ? 1.6 * cs : 0)]; k.ftL = [32 - 4.2 * sn, 42.4 - (cs < -0.2 ? -1.6 * cs : 0)];
                k.knR = knee(k.hipR, k.ftR, 1.1 + (cs > 0 ? 0.8 : 0)); k.knL = knee(k.hipL, k.ftL, 1.1 + (cs < 0 ? 0.8 : 0));
                k.haR = [32.6 - 3.2 * sn, 33 + bob]; k.elR = elbow(k.shR, k.haR, -0.4 * sn);
                k.haL = [33.2 + 3.2 * sn, 32.8 + bob]; k.elL = elbow(k.shL, k.haL, 0.4 * sn);
                k.weapon = 65 - 18 * sn;
            } else {
                const liftR = sn > 0.2 ? 1.8 * sn : 0, liftL = sn < -0.2 ? -1.8 * sn : 0;
                k.ftR = add(k.ftR, 0, -liftR); k.ftL = add(k.ftL, 0, -liftL);
                k.knR = knee(k.hipR, k.ftR, s * 0.3 * liftR, -liftR * 0.5); k.knL = knee(k.hipL, k.ftL, -s * 0.3 * liftL, -liftL * 0.5);
                k.haR = add(k.haR, 0, bob + (back ? 1 : -1) * 1.3 * sn); k.haL = add(k.haL, 0, bob - (back ? 1 : -1) * 1.3 * sn);
                k.elR = elbow(k.shR, k.haR, s * 0.5); k.elL = elbow(k.shL, k.haL, -s * 0.5);
            }
        } else if (name === 'ready') {
            const breathe = n === 2 || n === 3 ? 1 : 0;
            shiftBody(k, 0, 1 + breathe);
            if (side) {
                k.ftR = [35.4, 42.4]; k.ftL = [28.6, 42.4];
                k.knR = knee(k.hipR, k.ftR, 1.4); k.knL = knee(k.hipL, k.ftL, 0.6);
                k.haR = [36.6, 31 + breathe]; k.elR = [33.6, 30.6 + breathe];
                k.haL = [36.2, 29.4 + breathe]; k.elL = [34.6, 29.6 + breathe];
                k.weapon = -38 + (n === 3 ? 4 : 0);
                k.lean = 0.8;
            } else {
                k.ftR = add(k.ftR, s * 1.4, 0); k.ftL = add(k.ftL, -s * 1.4, 0);
                k.knR = knee(k.hipR, k.ftR, s * 0.9); k.knL = knee(k.hipL, k.ftL, -s * 0.9);
                k.haR = [32 + s * 6.4, 31.4 + breathe]; k.elR = [32 + s * 7, 28.8 + breathe];
                k.haL = [32 - s * 4.2, 30.4 + breathe]; k.elL = [32 - s * 6.6, 28.6 + breathe];
                k.weapon = back ? -64 : -116 + (n === 3 ? 4 : 0);
            }
        } else if (name === 'slash') {
            shiftBody(k, 0, 1);
            if (side) {
                k.ftR = [36, 42.4]; k.ftL = [28.4, 42.4];
                k.knR = knee(k.hipR, k.ftR, 1.6); k.knL = knee(k.hipL, k.ftL, 0.4);
                const arm = [
                    { ha: [27.6, 20.4], w: -150, lean: -0.8 },
                    { ha: [34.4, 21.6], w: -52, lean: 0.4, smear: [-150, -35] },
                    { ha: [40, 29.4], w: 18, lean: 1.4, smear: [-110, 25], dy: 1 },
                    { ha: [37.4, 34.4], w: 72, lean: 1, smear: [-20, 70], dy: 1 }
                ][n - 1];
                k.haR = arm.ha; k.elR = elbow(k.shR, k.haR, n === 1 ? -1.2 : 0.4, n === 1 ? 1 : 0.8);
                k.haL = n >= 3 ? [30.4, 32] : [35.4, 30.6]; k.elL = elbow(k.shL, k.haL, 0.6, 0.6);
                k.weapon = arm.w; k.lean = arm.lean; k.smear = arm.smear;
                if (arm.dy) shiftBody(k, 0.6, arm.dy);
            } else if (back) {
                k.ftR = add(k.ftR, 1, -1); k.ftL = add(k.ftL, -1, 0);
                const arm = [
                    { ha: [39.6, 22.6], w: -40 },
                    { ha: [36, 20.6], w: -88, smear: [-30, -100] },
                    { ha: [30.6, 21.4], w: -128, smear: [-60, -170], behind: true },
                    { ha: [26.6, 30.4], w: 140, smear: [-150, -220] }
                ][n - 1];
                k.haR = arm.ha; k.elR = elbow(k.shR, k.haR, 1.2, 0.4);
                k.weapon = arm.w; k.smear = arm.smear;
                k.weaponBehind = n === 3 || n === 2;
                k.haL = [26.4, 30.6]; k.elL = elbow(k.shL, k.haL, -0.8);
            } else {
                k.ftR = add(k.ftR, -1, 0); k.ftL = add(k.ftL, 1, -0.4);
                k.knR = knee(k.hipR, k.ftR, -0.9); k.knL = knee(k.hipL, k.ftL, 0.9);
                const arm = [
                    { ha: [24.4, 21.4], w: -128 },
                    { ha: [28, 26.6], w: 175, smear: [240, 165] },
                    { ha: [35.6, 32.8], w: 38, smear: [200, 55] },
                    { ha: [38.6, 34.4], w: 78, smear: [110, 50] }
                ][n - 1];
                k.haR = arm.ha; k.elR = elbow(k.shR, k.haR, -1.4, n === 1 ? 1.2 : 0.4);
                k.weapon = arm.w; k.smear = arm.smear;
                k.haL = n >= 3 ? [37.6, 30] : [37.2, 32.6]; k.elL = elbow(k.shL, k.haL, 1);
                k.weaponBehind = n === 1;
            }
        } else if (name === 'parry') {
            shiftBody(k, 0, 1);
            if (side) {
                k.ftR = [34.6, 42.4]; k.ftL = [29, 42.4]; k.knR = knee(k.hipR, k.ftR, 1.2); k.knL = knee(k.hipL, k.ftL, 0.6);
                k.haL = [36.6, 27.4]; k.elL = [34.6, 29.6];
                k.haR = [35.2, 26.6]; k.elR = [33.2, 30]; k.weapon = -80; k.lean = -0.4;
            } else {
                k.ftR = add(k.ftR, s, 0); k.ftL = add(k.ftL, -s, 0);
                k.haL = [32 - s * 2.2, 28]; k.elL = [32 - s * 6.2, 28.6];
                k.haR = [32 + s * 5.6, 26]; k.elR = [32 + s * 7.2, 29]; k.weapon = back ? -70 : -110;
            }
            k.parry = true;
        } else if (name === 'hit') {
            if (side) { shiftBody(k, -1.4, -1); k.lean = -1.4; k.haR = [28.6, 30.6]; k.elR = elbow(k.shR, k.haR, 0.6); k.haL = [36, 28]; k.elL = elbow(k.shL, k.haL, 0, 0.6); k.ftR = [34, 42.4]; k.ftL = [29.4, 42]; k.weapon = 150; }
            else { shiftBody(k, 0, back ? 1 : -1); k.haR = [32 + s * 8, 28.6]; k.haL = [32 - s * 8, 28.6]; k.elR = elbow(k.shR, k.haR, 0, 0.8); k.elL = elbow(k.shL, k.haL, 0, 0.8); k.weapon = back ? 10 : 170; }
            k.knR = knee(k.hipR, k.ftR, side ? 0.6 : s * 0.4); k.knL = knee(k.hipL, k.ftL, side ? 0.6 : -s * 0.4);
            k.eyes = 'shut';
        } else if (name === 'down' && n === 2) {
            shiftBody(k, 0, 5);
            if (side) {
                k.ftR = [36.4, 42.4]; k.knR = [36.2, 37.6]; k.ftL = [27.4, 42.6]; k.knL = [33.2, 42];
                k.haR = [37.6, 34]; k.elR = elbow(k.shR, k.haR, 0.6); k.haL = [35.8, 37]; k.elL = elbow(k.shL, k.haL, 0.4); k.weapon = 88; k.lean = 1.2;
            } else {
                k.ftR = [32 + s * 3.6, 42.6]; k.knR = [32 + s * 3.4, 41.4]; k.ftL = [32 - s * 2.6, 42.6]; k.knL = [32 - s * 3, 38.6];
                k.haR = [32 + s * 6.2, 34.6]; k.elR = elbow(k.shR, k.haR, s * 0.8); k.haL = [32 - s * 4.4, 37.2]; k.elL = elbow(k.shL, k.haL, -s * 0.6); k.weapon = 92;
            }
            k.eyes = 'shut';
        } else if (name === 'down') {
            // Lying on the ground, head to the left (all facings).
            return {
                pose: 'lying', head: [20.4, 37.6], lying: true, eyes: 'shut', torsoX: 0, lean: 0, weaponBehind: true,
                shR: [25.6, 39.8], elR: [29.4, 41.6], haR: [33.2, 41.6], shL: [25.6, 36.6], elL: [29.4, 35.4], haL: [32.8, 36],
                hipR: [36.4, 40], knR: [40.4, 40.4], ftR: [44.6, 40.8], hipL: [36.4, 38], knL: [40.2, 36.8], ftL: [44.2, 38.2],
                weapon: 8, weaponAt: [36, 43]
            };
        }
        if (k.lean) { k.head = add(k.head, k.lean, 0); k.neck = add(k.neck, k.lean * 0.6, 0); k.shR = add(k.shR, k.lean * 0.5, 0); k.shL = add(k.shL, k.lean * 0.5, 0); }
        return k;
    }

    // ---------------------------------------------------------------------
    // Parts
    // ---------------------------------------------------------------------
    function drawLeg(grid, hip, kn, ft, style, side, near) {
        const robe = style === 3;
        const boot = part();
        // Boots: a rounded block at the foot, toe pointing the way the character faces.
        const toe = side ? 1.4 : 0;
        ellipse(boot, ft[0] + toe * 0.5, ft[1] - 1.2, side ? 2.6 : 1.9, 1.7);
        capsule(boot, kn[0], lerp(kn[1], ft[1], 0.45), ft[0], ft[1] - 1.4, side ? 1.7 : 1.6);
        const leg = part();
        capsule(leg, hip[0], hip[1], kn[0], kn[1], 1.75);
        capsule(leg, kn[0], kn[1], ft[0], lerp(kn[1], ft[1], 0.5), 1.6);
        if (!robe) paint(grid, leg, 'cloth2');
        paint(grid, boot, 'leather');
        if (style === 5) { const cuff = part(); rect(cuff, Math.round(lerp(kn[0], ft[0], 0.45)) - 1, Math.round(lerp(kn[1], ft[1], 0.45)), 3, 1, 0.2); paint(grid, cuff, 'cloth2', { edge: false }); }
    }

    function drawArm(grid, sh, el, ha, style, back, opts = {}) {
        const sleeve = part();
        capsule(sleeve, sh[0], sh[1], el[0], el[1], style === 3 ? 2 : 1.65);
        capsule(sleeve, el[0], el[1], lerp(el[0], ha[0], 0.7), lerp(el[1], ha[1], 0.7), style === 3 ? 1.9 : 1.45);
        const wide = style === 3;   // robe sleeves flare at the wrist
        if (wide) ellipse(sleeve, lerp(el[0], ha[0], 0.7), lerp(el[1], ha[1], 0.7), 2.1, 1.7);
        paint(grid, sleeve, style === 2 ? 'cloth2' : style === 5 ? 'cloth2' : style === 4 ? 'cloth' : 'cloth');
        if (style === 2) { const pad = part(); ellipse(pad, sh[0], sh[1] - 0.2, 2.6, 2.1, 0.1); paint(grid, pad, 'metal'); }
        if (style === 4) { const wrap2 = part(); capsule(wrap2, lerp(el[0], ha[0], 0.35), lerp(el[1], ha[1], 0.35), lerp(el[0], ha[0], 0.7), lerp(el[1], ha[1], 0.7), 1.5); paint(grid, wrap2, 'leather'); }
        const hand = part();
        ellipse(hand, ha[0], ha[1], 1.55, 1.5, 0.1);
        paint(grid, hand, opts.glove ? 'leather' : 'skin');
    }

    function drawTorso(grid, k, style, facing) {
        const side = facing === 'right', back = facing === 'up';
        const t = k.torsoTop, b = k.torsoBottom, cx = k.torsoX, lean = k.lean || 0;
        const wTop = side ? 3.6 : 5.4, wWaist = side ? 3.2 : 4.2, wHip = side ? 3.6 : 4.8;
        const chestF = side ? 0.9 : 0;
        const waistY = lerp(t, b, 0.66);
        // Hem: how far the garment reaches below the hips.
        const hem = { 0: 3.2, 1: 7.4, 2: 2.6, 3: 8.4, 4: 1.8, 5: 1.2 }[style];
        const flare = { 0: 1.2, 1: 1.4, 2: 1.4, 3: 1.8, 4: 0.4, 5: 0.6 }[style];
        const hemY = Math.min(b + hem, 42.2);
        const body = part();
        poly(body, [[cx - wTop + lean * 0.6 + chestF * 0.2, t], [cx + wTop + lean * 0.6 + chestF, t], [cx + wWaist + lean * 0.3 + chestF * 0.5, waistY], [cx + wHip, b],
            [cx + wHip + flare, hemY], [cx - wHip - flare, hemY], [cx - wHip, b], [cx - wWaist + lean * 0.3, waistY]]);
        // Round the shoulders.
        ellipse(body, cx - wTop + 1 + lean * 0.6, t + 1.3, 1.8, 1.6); ellipse(body, cx + wTop - 1 + lean * 0.6 + chestF, t + 1.3, 1.8, 1.6);
        paint(grid, body, 'cloth');
        const P = (pts) => pts.map(([x, y]) => [x + cx, y]);
        if (style === 1 && !back) {                       // open coat: the shirt shows down the front
            const shirt = part();
            if (side) poly(shirt, P([[1.4 + chestF, t + 0.6], [wTop + chestF - 0.4, t + 0.6], [wWaist + chestF * 0.4, waistY], [1.2, waistY]]), 0.2);
            else poly(shirt, P([[-1.6, t + 0.5], [1.6, t + 0.5], [1, b + 1], [-1, b + 1]]), 0.2);
            paint(grid, shirt, 'cloth2');
        }
        if (style === 2) {                                // breastplate
            const plate = part();
            if (side) poly(plate, P([[-wTop + 1, t + 1], [wTop + chestF, t + 1], [wWaist + chestF * 0.5, waistY + 0.6], [-wWaist + 1, waistY + 0.6]]));
            else poly(plate, P([[-wTop + 0.6, t + 0.8], [wTop - 0.6, t + 0.8], [wWaist - 0.2, waistY + 0.8], [-wWaist + 0.2, waistY + 0.8]]));
            paint(grid, plate, 'metal');
            if (!back && !side) for (let y = Math.ceil(t + 2); y < waistY; y += 1) dot(grid, cx, y, MAT.metal[2]);
        }
        if (style === 5 && !back) {                       // farmhand: light shirt under a vest
            const shirt = part();
            if (side) poly(shirt, P([[0.8 + chestF, t + 0.4], [wTop + chestF, t + 0.4], [wWaist + chestF * 0.5, waistY], [0.6, waistY]]), 0.2);
            else poly(shirt, P([[-2.2, t + 0.4], [2.2, t + 0.4], [1.6, b], [-1.6, b]]), 0.2);
            paint(grid, shirt, 'cloth2');
        }
        if (style === 4 && !back) {                       // leathers: a strap across the chest
            const strap = part();
            if (side) capsule(strap, cx - 1.6, t + 1, cx + 1.8 + chestF, waistY, 0.7);
            else capsule(strap, cx + 3.6, t + 0.8, cx - 3.4, waistY + 0.6, 0.75);
            paint(grid, strap, 'leather', { edge: false });
        }
        // Belt or sash.
        const belt = part();
        poly(belt, [[cx - wWaist - 0.4, waistY + 0.4], [cx + wWaist + 0.4 + chestF * 0.5, waistY + 0.4], [cx + wHip, waistY + 2], [cx - wHip, waistY + 2]], 0, false);
        paint(grid, belt, style === 3 ? 'accent' : 'leather');
        if (!back && !side && style !== 3) { dot(grid, cx - 0.5, waistY + 1, MAT.accent[0]); dot(grid, cx + 0.5, waistY + 1, MAT.accent[1]); }
        if (side && style === 3) { const tail = part(); capsule(tail, cx - wWaist, waistY + 1.4, cx - wWaist - 0.6, waistY + 5, 0.8); paint(grid, tail, 'accent'); }
        // Neckline / collar.
        if (!back) {
            if (style === 0) { const sc = part(); poly(sc, side ? [[cx - 1.8, t - 0.6], [cx + 2.8, t - 0.6], [cx + 2.2, t + 2], [cx - 1.4, t + 2]] : [[cx - 4, t - 0.6], [cx + 4, t - 0.6], [cx + 2.6, t + 2.4], [cx - 2.6, t + 2.4]], 0.1); paint(grid, sc, 'accent'); }
            if (style === 4) { const sc = part(); ellipse(sc, cx + (side ? 0.8 : 0), t + 0.6, side ? 3 : 4.4, 1.9); paint(grid, sc, 'accent'); }
            if (style === 3 && !side) { for (let y = Math.ceil(t + 1); y < waistY; y++) dot(grid, cx, y, MAT.accent[1]); }
        } else {
            if (style === 0 || style === 4) {          // a short cape or hood falls over the back
                const cape = part();
                const cb = style === 0 ? b + 1.6 : t + 6;
                poly(cape, [[cx - wTop + 0.6, t - 0.6], [cx + wTop - 0.6, t - 0.6], [cx + wTop + 0.4, cb - 1], [cx + 2, cb], [cx, cb - 1.4], [cx - 2, cb], [cx - wTop - 0.4, cb - 1]]);
                paint(grid, cape, 'accent');
                for (const fx of [-2.4, 1.6]) for (let y = Math.ceil(t + 2); y < cb - 1.6; y++) dot(grid, cx + fx, y, MAT.accent[2]);
            }
        }
    }

    // Hair: drawn round the head centre. `front` is everything over the face/head; `back` goes behind the body.
    function drawHairBack(grid, k, style, facing) {
        const [hx, hy] = k.head, back = facing === 'up', side = facing === 'right';
        const p = part();
        const dir = side ? -1 : 0;
        if (style === 1) {                                               // tied tail
            if (side) { capsule(p, hx - 4.6, hy - 1, hx - 7.4, hy + 4.4, 1.6); ellipse(p, hx - 7.6, hy + 5.6, 1.6, 1.8); }
            else if (back) { capsule(p, hx, hy + 2, hx, hy + 9.4, 1.7); ellipse(p, hx, hy + 9.8, 1.5, 1.6); }
        } else if (style === 5) {                                        // long, loose
            if (side) poly(p, [[hx - 5.6, hy - 3], [hx - 1, hy - 2], [hx - 0.6, hy + 11.4], [hx - 6.6, hy + 10.4]]);
            else poly(p, [[hx - 6.6, hy - 2], [hx + 6.6, hy - 2], [hx + 6.8, hy + 11], [hx - 6.8, hy + 11]]);
        } else if (style === 3) {                                        // braid
            if (back) for (let i = 0; i < 4; i++) ellipse(p, hx + (i % 2 ? 0.5 : -0.5), hy + 4 + i * 2.4, 1.6, 1.4);
            else if (side) for (let i = 0; i < 4; i++) ellipse(p, hx - 4.2 - i * 0.6, hy + 2.6 + i * 2.2, 1.5, 1.3);
        } else if (style === 2) {                                        // bob: back of the bob shows below the head
            if (back || side) poly(p, [[hx - 6.4 + (side ? 1 : 0), hy - 1], [hx + (side ? 0 : 6.4), hy - 1], [hx + (side ? 0.4 : 6.6), hy + 5.6], [hx - 6.6, hy + 5.6]]);
        } else if (style === 8) {                                        // curls
            if (!side && !back) { ellipse(p, hx - 6.2, hy + 3, 2.4, 3.2); ellipse(p, hx + 6.2, hy + 3, 2.4, 3.2); }
            if (side) ellipse(p, hx - 4.4, hy + 3, 3.2, 3.6);
            if (back) ellipse(p, hx, hy + 3, 7.4, 4.6);
        }
        void dir;
        if (p.size) paint(grid, p, 'hair');
    }
    function drawHairFront(grid, k, style, facing, hat) {
        const [hx, hy] = k.head, back = facing === 'up', side = facing === 'right';
        const helmet = hat === 4, hood = hat === 1;
        if (style === 7) {                                               // shorn: a dark cap close to the skull
            const p = part(); ellipse(p, hx - (side ? 0.6 : 0), hy - 2.4, side ? 5.4 : 6.2, 3.8);
            for (const i of [...p.keys()]) { const y = (i / W) | 0; if (y > hy - 1 && !back) p.delete(i); }
            if (!helmet && !hood) paint(grid, p, 'hair', { levels: [0.6, 0, -0.5] });
            return;
        }
        const cap = part();
        // The skull cover: a dome over the top of the head.
        const vol = style === 8 ? 1.2 : style === 4 || style === 6 ? 0.3 : 0.7;
        ellipse(cap, hx - (side ? 0.8 : 0), hy - 1.6, (side ? 5.6 : 6.6) + vol, 5.2 + vol * 0.6);
        // Cut the face out of the dome (front and side).
        for (const i of [...cap.keys()]) {
            const x = i % W, y = (i / W) | 0;
            if (back) { if (y > hy + 4.4 + (style === 2 || style === 5 ? 3 : style === 1 || style === 4 || style === 6 ? -0.6 : 0)) cap.delete(i); continue; }
            if (side) { if (x > hx - 1.4 && y > hy - 1.6) cap.delete(i); if (y > hy + 2.6 && style !== 2 && style !== 5) cap.delete(i); continue; }
            const fringe = { 0: -0.6, 1: -1.6, 2: -1, 3: -1.8, 4: -2.2, 5: -1.4, 6: -1.6, 8: -0.8 }[style];
            if (y > hy + fringe && Math.abs(x + 0.5 - hx) < 4.6) cap.delete(i);
            if (y > hy + 2.4 && style !== 2 && style !== 5 && style !== 8) cap.delete(i);
        }
        if (helmet) return;                                             // the helm covers it all
        paint(grid, cap, 'hair');
        const p = part();
        if (!back && !side) {
            if (style === 0) for (const dx of [-3.4, -0.8, 1.8]) poly(p, [[hx + dx - 1.2, hy - 2.6], [hx + dx + 1.8, hy - 2.6], [hx + dx + 0.4, hy + 0.4]]);
            if (style === 2) { capsule(p, hx - 5.8, hy - 1, hx - 5.4, hy + 4.6, 1.5); capsule(p, hx + 5.8, hy - 1, hx + 5.4, hy + 4.6, 1.5); }
            if (style === 5) { capsule(p, hx - 6, hy - 1, hx - 6.2, hy + 8.4, 1.6); capsule(p, hx + 6, hy - 1, hx + 6.2, hy + 8.4, 1.6); }
            if (style === 6) poly(p, [[hx - 6, hy - 4.6], [hx + 3, hy - 5.2], [hx + 1.4, hy - 1.6], [hx - 5, hy - 0.4]]);
            if (style === 3) { capsule(p, hx + 5.6, hy, hx + 6.6, hy + 5, 1.3); for (let i = 0; i < 3; i++) ellipse(p, hx + 6.6, hy + 6 + i * 1.8, 1.3, 1.1); }
            if (style === 1) { capsule(p, hx - 5.6, hy - 1, hx - 5.8, hy + 1.6, 1.1); capsule(p, hx + 5.6, hy - 1, hx + 5.8, hy + 1.6, 1.1); }
        } else if (side) {
            if (style === 0) for (const dx of [-0.4, 2]) poly(p, [[hx + dx - 1.6, hy - 3.4], [hx + dx + 2.4, hy - 3], [hx + dx + 1.2, hy + 0.2]]);
            if (style === 6) poly(p, [[hx - 3.6, hy - 5.4], [hx + 4.6, hy - 4.4], [hx + 2.6, hy - 2]]);
            if (style === 2 || style === 5) capsule(p, hx - 1.6, hy - 1, hx - 1.4, hy + (style === 5 ? 7 : 4.4), 1.4);
        }
        if (!hood) {
            if (style === 4) { ellipse(p, hx - (side ? 1.4 : 0), hy - 7.2, 2.6, 2.2); }   // top knot
            if (style === 8) for (const [dx, dy] of [[-4, -4.6], [0, -6], [4, -4.6], [-5.6, -1], [5.6, -1]]) if (!side || dx <= 0) ellipse(p, hx + dx, hy + dy, 2, 1.8);
        }
        if (p.size) paint(grid, p, 'hair');
    }

    function drawHead(grid, k, facing) {
        const [hx, hy] = k.head, side = facing === 'right', back = facing === 'up';
        const head = part();
        if (k.lying) ellipse(head, hx, hy, 5.6, 5.4);
        else ellipse(head, hx + (side ? 0.4 : 0), hy + 0.3, side ? 5.6 : 6.2, 6.2);
        if (side && !k.lying) { setPx(head, hx + 6, hy + 0.6, 0.2); setPx(head, hx + 5.6, hy + 1.6, 0); }   // nose
        // Ears.
        if (!side && !k.lying) { ellipse(head, hx - 6.2, hy + 0.8, 1, 1.4, -0.1); ellipse(head, hx + 6.2, hy + 0.8, 1, 1.4, -0.3); }
        if (side) ellipse(head, hx - 1.4, hy + 0.8, 1.1, 1.4, -0.2);
        paint(grid, head, 'skin', { levels: [0.55, -0.5, -0.9] });
        if (back) return;
        const shut = k.eyes === 'shut';
        if (k.lying) { dot(grid, hx + 1, hy - 1, MAT.skin[3]); dot(grid, hx + 2, hy - 1, MAT.skin[3]); return; }
        const ey = Math.floor(hy + 2.2);
        if (side) {
            const ex = Math.floor(hx + 3);
            if (shut) dot(grid, ex, ey, MAT.skin[3]);
            else { dot(grid, ex, ey, EYE); dot(grid, ex, ey - 1, EYE); }
            dot(grid, ex + 1, ey + 2, MOUTH);
        } else {
            for (const ex of [Math.floor(hx - 3), Math.floor(hx + 2)]) {
                if (shut) { dot(grid, ex, ey, MAT.skin[3]); dot(grid, ex + 1, ey, MAT.skin[3]); continue; }
                dot(grid, ex, ey, EYE); dot(grid, ex, ey - 1, EYE); dot(grid, ex + 1, ey, EYE); dot(grid, ex + 1, ey - 1, SHINE);
            }
            dot(grid, Math.floor(hx), ey + 2, MOUTH);
        }
    }

    function drawHat(grid, k, hat, facing, layer) {
        if (!hat) return;
        const [hx, hy] = k.head, side = facing === 'right', back = facing === 'up';
        const p = part();
        if (hat === 1) {                                                 // hood: drawn in two layers
            if (layer === 'back') { if (!back) { poly(p, [[hx - 7.2, hy - 2], [hx + 7.2, hy - 2], [hx + 7.6, hy + 7.6], [hx - 7.6, hy + 7.6]]); paint(grid, p, 'hat'); } return; }
            ellipse(p, hx - (side ? 0.6 : 0), hy - 1.4, side ? 6.6 : 7.4, 6.4);
            if (back) { poly(p, [[hx - 7.4, hy], [hx + 7.4, hy], [hx + 7.6, hy + 7.4], [hx - 7.6, hy + 7.4]]); }
            for (const i of [...p.keys()]) {
                const x = i % W, y = (i / W) | 0;
                if (back) continue;
                if (side) { if (x > hx - 0.4 && y > hy - 3) p.delete(i); continue; }
                if (y > hy - 3.6 && Math.abs(x + 0.5 - hx) < 4.8) p.delete(i);
            }
            if (side) poly(p, [[hx - 6.4, hy - 1], [hx - 1, hy - 1], [hx - 0.4, hy + 7], [hx - 6.6, hy + 6]]);
            paint(grid, p, 'hat');
            return;
        }
        if (layer === 'back') return;
        if (hat === 2 || hat === 6) {                                    // wide brim / straw hat
            ellipse(p, hx - (side ? 0.4 : 0), hy - 4.4, side ? 9 : 10, 2.4, 0.1);
            const crown = part(); ellipse(crown, hx - (side ? 0.4 : 0), hy - 6.6, side ? 4.6 : 5.2, 3.4);
            for (const i of [...crown.keys()]) if (((i / W) | 0) > hy - 4.6) crown.delete(i);
            paint(grid, p, 'hat'); paint(grid, crown, 'hat');
            const band = part(); rect(band, Math.floor(hx - (side ? 4.4 : 5)), Math.floor(hy - 5.6), side ? 9 : 10, 1, 0); paint(grid, band, hat === 6 ? 'accent' : 'leather', { edge: false });
            return;
        }
        if (hat === 3) {                                                 // bandana
            if (back) { ellipse(p, hx, hy - 2, 6.6, 4.8); for (const i of [...p.keys()]) if (((i / W) | 0) > hy + 1) p.delete(i); capsule(p, hx, hy + 1, hx + 1.4, hy + 5, 1); capsule(p, hx, hy + 1, hx - 1.6, hy + 4.4, 1); }
            else if (side) { ellipse(p, hx - 0.6, hy - 2.4, 6, 4.4); for (const i of [...p.keys()]) if (((i / W) | 0) > hy - 1.6) p.delete(i); capsule(p, hx - 5, hy - 2, hx - 7.4, hy + 2.4, 1); }
            else { ellipse(p, hx, hy - 2.6, 6.8, 4.4); for (const i of [...p.keys()]) if (((i / W) | 0) > hy - 2) p.delete(i); }
            paint(grid, p, 'hat');
            return;
        }
        if (hat === 4) {                                                 // iron helm with a nasal guard
            ellipse(p, hx - (side ? 0.6 : 0), hy - 1.6, side ? 6.2 : 7, 5.8);
            for (const i of [...p.keys()]) {
                const x = i % W, y = (i / W) | 0;
                if (back) { if (y > hy + 3.4) p.delete(i); continue; }
                if (side) { if (x > hx + 0.6 && y > hy - 0.6) p.delete(i); if (y > hy + 3) p.delete(i); continue; }
                if (y > hy - 0.6 && Math.abs(x + 0.5 - hx) < 4.6) p.delete(i);
                if (y > hy + 3) p.delete(i);
            }
            if (!back) { if (side) rect(p, Math.floor(hx + 3.4), Math.floor(hy - 1), 1, 3, 0.2); else rect(p, Math.floor(hx) - 0.5, Math.floor(hy - 1), 1, 3, 0.3); }
            paint(grid, p, 'metal');
            const rim = part(); rect(rim, Math.floor(hx - (side ? 6 : 7)), Math.floor(hy - 1.8), side ? 12 : 14, 1, -0.3);
            for (const i of [...rim.keys()]) if (grid.mat[i] !== 'metal') rim.delete(i);
            paint(grid, rim, 'metal', { edge: false });
            return;
        }
        if (hat === 5) {                                                 // circlet
            const y = Math.floor(hy - 3.2);
            for (let x = Math.floor(hx - (side ? 5 : 6)); x <= hx + (side ? 4 : 6); x++) if (grid.role[y * W + x]) setPx(p, x, y, 0.4);
            paint(grid, p, 'accent', { edge: false });
            if (!back) dot(grid, side ? hx + 3 : hx, y, MAT.shieldFace[0]);
        }
    }

    // Weapons: from the hand along `angle` (degrees, 0 = +x, 90 = down). Spear and mace are two-handed-length.
    function drawWeapon(grid, k, type, flags = {}) {
        if (type < 0) return;                                            // unarmed (villagers)
        const [hx, hy] = k.weaponAt || k.haR;
        const a = (k.weapon * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
        const at = (t, o = 0) => [hx + ux * t + px * o, hy + uy * t + py * o];
        const grip = part(), blade = part(), guard = part();
        const ground = (q) => { for (const i of [...q.keys()]) if (((i / W) | 0) > 44) q.delete(i); return q; };
        if (type === 0) {                                                // sword
            const L = flags.short ? 7 : 12;
            capsule(grip, ...at(-2.6), ...at(0.6), 0.75);
            ellipse(grip, ...at(-3), 0.9, 0.9);
            capsule(guard, ...at(1.4, -2.4), ...at(1.4, 2.4), 0.75);
            capsule(blade, ...at(2), ...at(L), 1.05, 0.15);
            line(blade, ...at(2, -0.4), ...at(L - 0.6, -0.4), 0.9);
            paint(grid, ground(grip), 'leather'); paint(grid, ground(blade), 'metal', { levels: [0.6, -0.1, -0.7] }); paint(grid, ground(guard), 'accent');
            const [tx, ty] = at(L + 0.4); if (ty <= 44) dot(grid, tx, ty, MAT.metal[0]);
        } else if (type === 1) {                                         // axe
            capsule(grip, ...at(-3), ...at(10), 0.8);
            paint(grid, ground(grip), 'wood');
            const head = part();
            poly(head, [at(7, 0), at(10.4, 0), at(11.6, -4.6), at(9.6, -5), at(8.6, -2.6), at(6.2, -3.4)].map(([x, y]) => [x, y]));
            ellipse(head, ...at(9, -4.4), 2, 1.6);
            paint(grid, ground(head), 'metal', { levels: [0.5, -0.2, -0.7] });
        } else if (type === 2) {                                         // mace
            capsule(grip, ...at(-2.6), ...at(8), 0.8);
            paint(grid, ground(grip), 'wood');
            const head = part(); ellipse(head, ...at(9.6), 2.6, 2.6);
            paint(grid, ground(head), 'metal');
            for (const o of [-1, 1]) { const [sx, sy] = at(9.6, o * 3.2); dot(grid, sx, sy, MAT.metal[2]); }
            const [tx, ty] = at(12.6); dot(grid, tx, ty, MAT.metal[2]);
        } else {                                                         // spear
            capsule(grip, ...at(-7), ...at(13), 0.75);
            paint(grid, ground(grip), 'wood');
            const head = part(); poly(head, [at(12.4, -1.6), at(12.4, 1.6), at(17.6, 0)]); capsule(head, ...at(12), ...at(16.4), 0.9);
            paint(grid, ground(head), 'metal', { levels: [0.5, -0.2, -0.7] });
            const tie = part(); capsule(tie, ...at(11), ...at(12), 1); paint(grid, tie, 'accent');
        }
    }

    function drawShield(grid, k, type, facing) {
        const side = facing === 'right', back = facing === 'up';
        const [hx, hy] = k.haL;
        const p = part(), rim = part(), boss = part();
        const cx = side ? hx + (k.parry ? 1.4 : 0.6) : hx + (back ? 0 : 0), cy = hy - (k.parry ? 2 : 1);
        if (back) {                                                      // the back of the shield: wood and a strap
            if (type === 2) ellipse(p, cx, cy, 3.2, 3.2); else if (type === 1) poly(p, [[cx - 4, cy - 4.4], [cx + 4, cy - 4.4], [cx + 3.6, cy + 1.4], [cx, cy + 6], [cx - 3.6, cy + 1.4]]); else ellipse(p, cx, cy, 4.8, 4.8);
            paint(grid, p, 'wood');
            const strap = part(); rect(strap, Math.floor(cx - 2), Math.floor(cy), 4, 1); paint(grid, strap, 'leather', { edge: false });
            return;
        }
        if (side) {                                                      // edge-on: a narrow oval
            const h = type === 2 ? 3.4 : type === 1 ? 5.6 : 5;
            ellipse(p, cx + 1.4, cy + (type === 1 ? 0.8 : 0), 1.8, h);
            paint(grid, p, 'shieldFace');
            ellipse(rim, cx + 2.4, cy + (type === 1 ? 0.8 : 0), 0.8, h - 0.6); paint(grid, rim, 'metal', { edge: false });
            return;
        }
        if (type === 0) { ellipse(p, cx, cy, 5, 5); }
        else if (type === 1) poly(p, [[cx - 4.6, cy - 4.8], [cx + 4.6, cy - 4.8], [cx + 4.2, cy + 1.6], [cx, cy + 6.8], [cx - 4.2, cy + 1.6]]);
        else ellipse(p, cx, cy, 3.4, 3.4);
        paint(grid, p, 'shieldFace');
        // Rim and boss in metal.
        for (const i of p.keys()) {
            const x = i % W, y = (i / W) | 0;
            if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !p.has((y + dy) * W + x + dx))) rim.set(i, p.get(i));
        }
        paint(grid, rim, 'metal', { edge: false });
        if (type === 1) { for (let y = Math.ceil(cy - 3.6); y < cy + 5; y++) dot(grid, cx, y, MAT.accent[1]); for (let x = Math.ceil(cx - 3.4); x < cx + 3.4; x++) dot(grid, x, Math.floor(cy - 1), MAT.accent[1]); }
        else { ellipse(boss, cx, cy, 1.4, 1.4); paint(grid, boss, 'metal', { edge: false }); }
    }

    /** The bright arc of a swing (slash2-4), from angle a0 to a1 round the shoulder, at a radius. */
    function drawSmear(grid, k, facing) {
        if (!k.smear) return;
        const [a0, a1] = k.smear, cx = k.shR[0], cy = k.shR[1] + 1;
        const r = 12.4, steps = 40;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps, a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
            const w = Math.sin(t * Math.PI) * 2.2 + 0.4;
            for (let d = 0; d < w; d += 0.5) {
                const x = cx + Math.cos(a) * (r - d), y = cy + Math.sin(a) * (r - d) * (facing === 'right' ? 1 : 0.8);
                const xi = Math.floor(x), yi = Math.floor(y);
                if (!inside(xi, yi) || grid.role[yi * W + xi]) continue;
                dot(grid, xi, yi, d < 0.6 ? SMEAR : SMEAR2);
            }
        }
    }

    /** Draw one frame. Returns 64 strings of roles ('.' = transparent). */
    function drawFrame(shape, facing, pose) {
        const k = skeleton(facing, pose);
        const g = newGrid();
        const side = facing === 'right', back = facing === 'up';
        const { hair, outfit, hat, weapon, shield } = shape;
        const hasShield = shield >= 0;
        if (k.lying) {
            drawWeapon(g, k, weapon);
            drawHairBack(g, { ...k, head: [k.head[0] - 1, k.head[1]] }, hair === 5 ? 5 : -1, 'right');
            drawLeg(g, k.hipL, k.knL, k.ftL, outfit, true); drawArm(g, k.shL, k.elL, k.haL, outfit, false);
            drawTorsoLying(g, k, outfit);
            drawLeg(g, k.hipR, k.knR, k.ftR, outfit, true); drawArm(g, k.shR, k.elR, k.haR, outfit, false);
            drawHead(g, k, 'down');
            const capK = { ...k, head: k.head };
            drawHairLying(g, capK, hair, hat);
            outline(g);
            return toRows(g);
        }
        // Behind everything: what hangs at the back.
        if (back) {
            if (hasShield && !k.parry) drawShield(g, { ...k, haL: [32, 27.4] }, shield, 'up');
        }
        if (k.weaponBehind) drawWeapon(g, k, weapon);
        drawHairBack(g, k, hair, facing);
        drawHat(g, k, hat, facing, 'back');
        if (side) {
            // Far side first: left leg, left arm (with the shield on it).
            drawLeg(g, k.hipL, k.knL, k.ftL, outfit, true, false);
            if (!k.parry && !k.pose.startsWith('ready')) { drawArm(g, k.shL, k.elL, k.haL, outfit, false); if (hasShield) drawShield(g, k, shield, facing); }
            drawLeg(g, k.hipR, k.knR, k.ftR, outfit, true, true);
            drawTorso(g, k, outfit, facing);
            if (k.parry || k.pose.startsWith('ready')) { drawArm(g, k.shL, k.elL, k.haL, outfit, false); if (hasShield) drawShield(g, k, shield, facing); }
            drawHead(g, k, facing);
            drawHairFront(g, k, hair, facing, hat);
            drawHat(g, k, hat, facing, 'front');
            drawSmear(g, k, facing);
            drawArm(g, k.shR, k.elR, k.haR, outfit, false);
            if (!k.weaponBehind) drawWeapon(g, k, weapon);
            outline(g);
            return toRows(g);
        }
        drawLeg(g, k.hipR, k.knR, k.ftR, outfit, false);
        drawLeg(g, k.hipL, k.knL, k.ftL, outfit, false);
        drawTorso(g, k, outfit, facing);
        if (back) {                                                      // seen from behind: arms, then the head over them
            drawArm(g, k.shL, k.elL, k.haL, outfit, true);
            drawArm(g, k.shR, k.elR, k.haR, outfit, true);
            drawHead(g, k, facing);
            drawHairFront(g, k, hair, facing, hat);
            drawHat(g, k, hat, facing, 'front');
            if (hasShield && k.parry) drawShield(g, { ...k, haL: [k.haL[0], k.haL[1]] }, shield, 'up');
            drawSmear(g, k, facing);
            if (!k.weaponBehind) drawWeapon(g, k, weapon);
            outline(g);
            return toRows(g);
        }
        drawHead(g, k, facing);
        drawHairFront(g, k, hair, facing, hat);
        drawHat(g, k, hat, facing, 'front');
        drawArm(g, k.shL, k.elL, k.haL, outfit, false);
        if (hasShield) drawShield(g, k, shield, facing);
        drawSmear(g, k, facing);
        drawArm(g, k.shR, k.elR, k.haR, outfit, false);
        if (!k.weaponBehind) drawWeapon(g, k, weapon);
        outline(g);
        return toRows(g);
    }
    function drawTorsoLying(g, k, style) {
        const p = part();
        const hem = style === 1 || style === 3 ? 6 : 2;
        poly(p, [[24.2, 35.4], [36.6, 36], [36.6 + hem, 36.4], [36.6 + hem, 41.4], [36.6, 41.6], [24.2, 41.8]]);
        ellipse(p, 25, 38.6, 2, 3.2);
        paint(g, p, 'cloth');
        const belt = part(); rect(belt, 33, 36, 2, 6); paint(g, belt, style === 3 ? 'accent' : 'leather');
    }
    function drawHairLying(g, k, hair, hat) {
        const [hx, hy] = k.head;
        const p = part();
        ellipse(p, hx - 2.2, hy, 4.2, 5.8 + (hair === 8 ? 1 : 0));
        for (const i of [...p.keys()]) if ((i % W) > hx - 0.6) p.delete(i);
        if (hair === 7) return;
        if (hat === 4) { paint(g, p, 'metal'); return; }
        if (hat === 1) { paint(g, p, 'hat'); return; }
        paint(g, p, 'hair');
    }
    function toRows(g) {
        const rows = [];
        for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) s += g.role[y * W + x] || '.'; rows.push(s); }
        return rows;
    }
    const mirrorRows = (rows) => rows.map((r) => [...r].reverse().join(''));

    // ---------------------------------------------------------------------
    // Sheets: one per shape combination, ids 'enso.<hair>.<outfit>.<hat>.<weapon>.<shield>' (shield -1 = none).
    // Frames are made on first use.
    // ---------------------------------------------------------------------
    const ID = /^enso\.(\d+)\.(\d+)\.(\d+)\.(-?\d+)\.(-?\d+)$/;
    function buildSheet(id) {
        const m = ID.exec(id);
        if (!m) return null;
        const shape = { hair: +m[1], outfit: +m[2], hat: +m[3], weapon: +m[4], shield: +m[5] };
        const frames = {};
        for (const facing of FACINGS) for (const pose of POSES) {
            const key = `${facing}.${pose}`;
            let rows = null;
            Object.defineProperty(frames, key, {
                enumerable: true,
                get() {
                    if (!rows) rows = facing === 'left' ? mirrorRows(sheets[id].frames[`right.${pose}`]) : drawFrame(shape, facing, pose);
                    return rows;
                }
            });
        }
        return { layer: 'body', frame: FRAME, frames, shape };
    }
    providers.push((id) => (ID.test(id) ? buildSheet(id) : null));

    const st = (pose, ms, oy = 0) => ({ pose, ms, oy });
    const steps = (poses, ms) => poses.map((pose, i) => ({ pose, ms: Array.isArray(ms) ? ms[i] : ms, oy: 0 }));
    manifest.enso = {
        classes: ['*'],                     // every player class; villagers use it too (ui/world-render.js person())
        frame: FRAME,
        anchor: { x: 32, y: 43 },
        animations: {
            idle: steps(['stand'], 1000),
            walk: steps(['walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6'], 120),
            ready: steps(['ready1', 'ready2', 'ready3', 'ready4'], 220),
            attack: { once: true, then: 'ready', steps: steps(['slash1', 'slash2', 'slash3', 'slash4'], [160, 65, 65, 200]) },
            cast: { once: true, then: 'ready', steps: steps(['parry', 'parry'], [160, 380]) },
            hit: { once: true, then: 'ready', steps: steps(['hit', 'ready1'], [300, 100]) },
            death: { once: true, steps: steps(['hit', 'down2', 'down3'], [160, 220, 1]) },
            // Action combat (docs/ACTION_COMBAT.md): swing ≈ 350 ms startup → active → recovery, heavy slower,
            // dodge ≈ 250 ms, guard a held block, hurt a short flinch.
            swing: { once: true, then: 'ready', steps: [st('slash1', 90), st('slash2', 50), st('slash3', 50), st('slash4', 160)] },
            heavy: { once: true, then: 'ready', steps: [st('ready1', 120, 1), st('slash1', 200), st('slash2', 70), st('slash3', 90, 1), st('slash4', 240)] },
            dodge: { once: true, then: 'ready', steps: [st('ready1', 60, 1), st('walk2', 120, 2), st('walk5', 70, 1)] },
            guard: [st('parry', 600, 0), st('parry', 600, 1)],
            hurt: { once: true, then: 'ready', steps: [st('hit', 160, -1), st('ready1', 90)] }
        },
        layerOrder: { down: ['body'], up: ['body'], left: ['body'], right: ['body'] },
        layers: { body: 'enso.{shape}' },
        fallbacks: { body: 'enso.0.0.0.0.-1' },
        /** Sheet-id fields from cosmetics (the template's {shape}). */
        sheetFields(cosmetics = {}) { const s = shapeOf(cosmetics); return { shape: `${s.hair}.${s.outfit}.${s.hat}.${s.weapon}.${s.shield}` }; },
        paletteFor,
        options: {
            skins: SKINS, hairStyles: HAIR_STYLES, hairColours: HAIR_COLOURS,
            outfits: OUTFIT_STYLES.map((o) => o.name), outfitColours: OUTFIT_COLOURS,
            hats: HATS.map((h) => h.name), hatSwatches: HATS.map((h) => h.swatch || null),
            weapons: WEAPONS, shields: SHIELDS
        }
    };
    ENSO.ensoPlayer = { drawFrame, skeleton, shapeOf, paletteFor, buildSheet, FACINGS, POSES, ramp, MAT };
    if (typeof module !== 'undefined' && module.exports) module.exports = ENSO.ensoPlayer;
})(typeof window !== 'undefined' ? window : globalThis);
