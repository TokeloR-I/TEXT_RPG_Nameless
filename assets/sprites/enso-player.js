/* =========================================================================
 * Enso's Last Stand — THE ENSO PLAYER (original art, drawn by code; Saffron/Quill art plan, M1–M2)
 * Every pixel of this character is made here, from shapes and our own palette. No picture, pack or
 * generator output goes in, so nothing third-party is ever used as input (docs/art/ORIGINAL_ART_PLAN.md §0).
 *
 * A pose is written once in the character's own space (forward, right, up) and projected for each facing (the rig,
 * v3), so all eight directions show the same pose from a different side. Each body part is a shape on the projected
 * skeleton (ellipse, capsule or polygon) shaded by its own curvature, light from the top left, with a darker edge
 * where it overlaps something and a coloured outline round the whole figure. Hair and cloth are not posed: a damped
 * spring trails the head and chest through each motion, and the hanging parts bend by how far it lags (swayTrack).
 *
 * Style (docs/art/PLAYER_STYLE_SHEET.md, v3): a figure about 40 px tall, the head and everything on it scaled by
 * HEAD_S, big eyes (lid, shine, iris), soft skin shading and a near-black outline.
 *
 * Contract: frame 96x96, feet at (48, 68) (manifest.enso.anchor; the world places the feet, so hitboxes and the
 *   camera are unchanged), facings down/up/left/right plus the diagonals down-right/down-left/up-right/up-left
 *   (each -left facing mirrors its -right one). Frames are '<motion><n>' for the motions in ANIMS (idle, walk,
 *   ready, guard, slash, heavy, thrust, cast, hit, dash, stop, fall), plus down3/down4 lying; stand, parry, hit
 *   and down1/down2 are older names kept as aliases.
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

    const W = 96, H = 96, FRAME = { w: W, h: H };
    const FACINGS = ['down', 'up', 'right', 'left', 'down-right', 'down-left', 'up-right', 'up-left'];
    // A diagonal is the front or back view turned part of the way toward the profile (a 3/4 view): the skeleton is
    // the blend of the two, and the parts are drawn as the front/back view with the face and details moved by k.turn.
    const DIAG = { 'down-right': ['down', 'right'], 'up-right': ['up', 'right'] };
    const MIRROR = { left: 'right', 'down-left': 'down-right', 'up-left': 'up-right' };
    const TURN = 0.5;                            // how far a diagonal has turned, for the painters
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
    // Fixed roles: eyes (lid, shine, iris light and deep), mouth, the smear of a swing.
    const EYE = 'e', SHINE = 'r', MOUTH = 't', SMEAR = 'Z', SMEAR2 = 'Y', BLACK = 'k', IRIS = 'u', IRIS2 = 's';

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
    // Caster weapons (Tokelo, 2026-11-09: "for mage and necromancer we dont even have wand or staff"). Their shapes are
    // types 4 and 5; they come after the first twenty choices in WEAPONS, so a saved weapon index keeps its look.
    const CASTER_TYPES = ['Staff', 'Wand'];
    const TYPE_INDEX = { sword: 0, axe: 1, mace: 2, spear: 3, staff: 4, wand: 5 };
    const METALS = [
        { name: 'Iron', swatch: '#9a9ca4' }, { name: 'Bronze', swatch: '#b07a3e' }, { name: 'Frost', swatch: '#8ec4d8' },
        { name: 'Gold', swatch: '#d6ae48' }, { name: 'Obsidian', swatch: '#4a4458' }
    ];
    const WEAPON_DEFS = [...METALS.flatMap((m, mi) => WEAPON_TYPES.map((t, ti) => ({ name: `${m.name} ${t}`, type: ti, metal: mi }))),
        ...METALS.flatMap((m, mi) => CASTER_TYPES.map((t, ti) => ({ name: `${m.name} ${t}`, type: WEAPON_TYPES.length + ti, metal: mi })))];
    const WEAPONS = WEAPON_DEFS.map((w) => w.name);
    /** The shape drawn in the hand: the chosen look, unless the weapon actually held (cosmetics.held, set by the
     *  front end from the equipped main hand) is a different kind: a staff or wand is drawn as one, and a blade in a
     *  hand that chose a staff look is drawn as a sword. The chosen metal colour always stays. */
    function heldType(c = {}) {
        const chosen = WEAPON_DEFS[wrap(c.weapon, WEAPONS.length)].type;
        const held = c.held && TYPE_INDEX[c.held];
        if (held != null) return held;
        if (c.held === 'blade' && chosen >= TYPE_INDEX.spear) return TYPE_INDEX.sword;
        return chosen;
    }
    const SHIELD_TYPES = ['Round', 'Kite', 'Buckler'];
    const SHIELD_COLOURS = [{ name: 'Oak', swatch: '#7a5634' }, { name: 'Crimson', swatch: '#8a2e2a' }, { name: 'Azure', swatch: '#34507e' }, { name: 'Ash', swatch: '#6a6a6e' }];
    const SHIELDS = ['None', ...SHIELD_COLOURS.flatMap((c) => SHIELD_TYPES.map((t) => `${c.name} ${t}`))];

    const wrap = (i, n) => ((Number.isInteger(i) ? i : 0) % n + n) % n;
    /** The shape choices behind a cosmetics object (all wrapped into range). */
    function shapeOf(c = {}) {
        const shield = wrap(c.shield, SHIELDS.length);
        return {
            hair: wrap(c.hairStyle, HAIR_STYLES.length), outfit: wrap(c.outfit, OUTFIT_STYLES.length), hat: wrap(c.hat, HATS.length),
            weapon: c.weapon < 0 ? -1 : heldType(c), shield: shield === 0 ? -1 : (shield - 1) % SHIELD_TYPES.length
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
    function ramp(hex, soft = false) {
        const [h, s, l] = hexToHsl(hex);
        const sh = soft ? 0.45 : 1;                // skin: gentler hue shift and saturation, so shadows never go red
        return [
            hslToHex(toward(h, 50, 12), s * 0.95 + 0.03, l + (1 - l) * 0.28),
            hex,
            hslToHex(toward(h, 255, 14 * sh), Math.min(1, s * (soft ? 0.86 : 1.05) + 0.04 * sh), l * (soft ? 0.8 : 0.74)),
            hslToHex(toward(h, 260, 24 * sh), Math.min(1, s * (soft ? 0.8 : 1.05) + 0.06 * sh), l * (soft ? 0.6 : 0.52)),
            hslToHex(toward(h, 265, 40), Math.min(0.6, s * 0.6 + 0.1), Math.min(0.11, l * 0.2))
        ];
    }
    const ramps = new Map();
    const rampOf = (hex, soft = false) => { const key = hex + (soft ? '~' : ''); if (!ramps.has(key)) ramps.set(key, ramp(hex, soft)); return ramps.get(key); };

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
            metal: METALS[WEAPON_DEFS[weapon].metal].swatch, wood: '#7a5a3a',
            hat: hatDef.swatch || '#4a4038',
            shieldFace: shield ? SHIELD_COLOURS[Math.floor((shield - 1) / SHIELD_TYPES.length)].swatch : '#7a5634',
            ...palette
        };
        const iris = rampOf(base.eye || '#3f86c4');
        const out = { [BLACK]: '#120e16', [EYE]: '#16121c', [SHINE]: '#fbf6ea', [IRIS]: iris[0], [IRIS2]: iris[2], [MOUTH]: rampOf(base.skin, true)[3], [SMEAR]: '#fff6dc', [SMEAR2]: '#d8e4f0' };
        for (const [m, roles] of Object.entries(MAT)) { const r = rampOf(base[m], m === 'skin'); for (let i = 0; i < 5; i++) out[roles[i]] = r[i]; }
        return out;
    }

    // ---------------------------------------------------------------------
    // Raster: a frame is a grid of roles. Shapes are drawn as "parts" with their own shading.
    // ---------------------------------------------------------------------
    const LIGHT = [-0.58, -0.81];                // toward the light: top left
    // Chibi proportions: the head, hair and hats are drawn on the head centre and scaled up by HEAD_S, so every hair
    // style and hat grows with the head. While XF is set the shape helpers map their points and radii through it,
    // and un(i) maps a pixel back into the unscaled space the cut-out rules are written in.
    const HEAD_S = 1.16;
    let XF = null;
    const X = (x) => (XF ? XF.cx + (x - XF.cx) * XF.s : x), Y = (y) => (XF ? XF.cy + (y - XF.cy) * XF.s : y), RS = (r) => (XF ? r * XF.s : r);
    const un = (i) => { const x = i % W, y = (i / W) | 0; return XF ? [XF.cx + (x + 0.5 - XF.cx) / XF.s - 0.5, XF.cy + (y + 0.5 - XF.cy) / XF.s - 0.5] : [x, y]; };
    /** Run a head-part painter in head space (centred on k.head, scaled by HEAD_S). */
    const inHead = (fn) => function (grid, k, ...rest) {
        XF = { cx: k.head[0], cy: k.head[1], s: HEAD_S };
        try { return fn(grid, k, ...rest); } finally { XF = null; }
    };
    function newGrid() { return { role: new Array(W * H).fill(null), mat: new Array(W * H).fill(null) }; }
    /** A part under construction: pixel index -> shading value in [-1, 1] (1 = facing the light). */
    const part = () => new Map();
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    function setPx(p, x, y, s) { x = Math.floor(x); y = Math.floor(y); if (inside(x, y)) p.set(y * W + x, Math.max(-1, Math.min(1, s))); }
    /** Filled ellipse, shaded as a dome. */
    function ellipse(p, cx, cy, rx, ry, bias = 0) {
        cx = X(cx); cy = Y(cy); rx = RS(rx); ry = RS(ry);
        for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
            const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
            if (d <= 1) setPx(p, x, y, (dx * LIGHT[0] + dy * LIGHT[1]) * 0.95 + bias);
        }
        return p;
    }
    /** Thick line (a limb), shaded as a cylinder. */
    function capsule(p, ax, ay, bx, by, r, bias = 0) {
        ax = X(ax); ay = Y(ay); bx = X(bx); by = Y(by); r = RS(r);
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
        if (XF) pts = pts.map(([x, y]) => [X(x), Y(y)]);
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
    const rect = (p, x, y, w, h, s = 0) => { if (XF) { const x1 = X(x + w), y1 = Y(y + h); x = Math.round(X(x)); y = Math.round(Y(y)); w = Math.max(1, Math.round(x1) - x); h = Math.max(1, Math.round(y1) - y); } for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setPx(p, x + i, y + j, s); return p; };
    /** Line of single pixels (thin details: weapon edges, staves). */
    function line(p, ax, ay, bx, by, s = 0) {
        ax = X(ax); ay = Y(ay); bx = X(bx); by = Y(by);
        const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
        for (let i = 0; i <= n; i++) setPx(p, ax + ((bx - ax) * i) / n + 0.5, ay + ((by - ay) * i) / n + 0.5, s);
        return p;
    }

    /** Put a part on the grid in a material. `edge` darkens the part's border where it lies over something
     *  already drawn, so overlapping shapes stay readable. `cut` removes pixels (used to carve). */
    function paint(grid, p, mat, { edge = true, levels = [0.42, -0.2, -0.62], edgeMax = 3 } = {}) {
        const roles = MAT[mat] || mat;
        for (const [i, s] of p) {
            const x = i % W, y = (i / W) | 0;
            let k = s > levels[0] ? 0 : s > levels[1] ? 1 : s > levels[2] ? 2 : 3;
            if (edge) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy;
                if (!inside(nx, ny)) continue;
                const j = ny * W + nx;
                if (!p.has(j) && grid.role[j] && grid.mat[j] !== mat) { k = Math.max(k, Math.min(edgeMax, dy < 0 && dx === 0 ? 2 : 3)); break; }
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
        for (let x = 0; x < W; x++) for (let y = H - 1; y > 0; y--) { const i = y * W + x; if (grid.mat[i] === 'outline' && !grid.role[i + W]) { if (y >= FEET - 1) grid.role[i] = BLACK; break; } }
    }

    // ---------------------------------------------------------------------
    // The rig (v3). A pose is written ONCE, in the character's own space (forward, right, up), and projected for
    // each of the five drawn facings, so all eight directions show the same pose from a different side instead of
    // five separately keyed drawings. Arms and the weapon are aimed with angles (yaw round the body, elevation), so
    // a swing between two keys travels an arc, and elbows and knees are solved from where the hands and feet are.
    // R/L are the character's own right/left; the weapon is in the right hand, the shield on the left arm.
    // ---------------------------------------------------------------------
    const lerp = (a, b, t) => a + (b - a) * t;
    const CX = W / 2, FEET = 67.4, TILT = 0.45;        // screen centre, the sole line, how far "toward the camera" drops on screen
    const BODY = { hip: 10.8, chest: 23.3, sh: 21.7, neck: 23.4, head: 29.8, shW: 5.3, hipW: 2.1, upArm: 4.3, foreArm: 4.3, thigh: 5.7, shin: 5.5 };
    const VIEW = { right: 0, 'down-right': 45, down: 90, 'up-right': -45, up: -90 };   // the screen angle the character faces
    const rad = (d) => (d * Math.PI) / 180;
    const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const vlen = (a) => Math.hypot(a[0], a[1], a[2]) || 1e-6;
    /** Turn [forward, right, up] round the up axis; a positive angle swings forward toward the right. */
    const rotY = ([f, r, u], deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [f * c - r * s, f * s + r * c, u]; };
    /** A direction from yaw (0 = forward, 90 = out to the `side`) and elevation (90 = straight up). */
    const sph = (yaw, elev, side = 1) => { const ce = Math.cos(rad(elev)); return [ce * Math.cos(rad(yaw)), side * ce * Math.sin(rad(yaw)), Math.sin(rad(elev))]; };
    /** The middle joint of a two-bone limb from a to c, bent toward `pole`. */
    function ik(a, c, l1, l2, pole) {
        const d = vsub(c, a), L = vlen(d), n = vmul(d, 1 / L), Lc = Math.min(L, l1 + l2 - 0.02);
        const x = (l1 * l1 - l2 * l2 + Lc * Lc) / (2 * Lc), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
        let p = vsub(pole, vmul(n, vdot(pole, n))); p = vmul(p, 1 / vlen(p));
        return vadd(vadd(a, vmul(n, x * (L / Lc))), vmul(p, h));
    }

    // A pose: numbers only, so two poses blend field by field.
    //   px/pr/pu  pelvis shift (forward, right, up)      hipYaw/yaw  hips and shoulders turned (positive: right side back)
    //   pitch/roll lean forward / to the right (degrees)  hf/hr/hu    head shift          br  breath (chest and head rise)
    //   aR/aL     arm: [yaw, elevation, reach] from the shoulder (yaw 90 = out to that arm's own side)
    //   fR/fL     foot: [forward, out to its own side, lift]        w  weapon: [yaw, elevation]
    const REST = { px: 0, pr: 0, pu: 0, hipYaw: 0, yaw: 0, pitch: 0, roll: 0, hf: 0, hr: 0, hu: 0, br: 0,
        aR: [80, -80, 8.2], aL: [90, -84, 8.3], fR: [0, 2.2, 0], fL: [0, 2.2, 0], w: [25, -52] };
    const pose = (base, over) => ({ ...base, ...over });
    const READY = pose(REST, { pu: -1.4, hipYaw: 24, yaw: 30, pitch: 6, fL: [3.4, 2.2, 0], fR: [-3.2, 2.9, 0], aR: [52, -24, 6.6], w: [-8, 36], aL: [28, -34, 6.4], shieldFront: 1 });
    const GUARD = pose(READY, { pu: -2.1, yaw: 12, hipYaw: 14, pitch: 9, aL: [8, 2, 5.6], aR: [30, 16, 6], w: [-62, 52], parry: 1 });
    const blend = (a, b, t) => {
        const o = { ...(t < 0.5 ? a : b) };
        for (const key of Object.keys(REST)) o[key] = Array.isArray(REST[key]) ? a[key].map((v, i) => lerp(v, b[key][i], t)) : lerp(a[key], b[key], t);
        return o;
    };
    const EASE = { lin: (t) => t, out: (t) => 1 - (1 - t) * (1 - t), in: (t) => t * t, io: (t) => t * t * (3 - 2 * t) };
    /** Keyed motion: [[ms, pose, ease into this key], ...] -> pose at any time. */
    const keyed = (keys) => (t) => {
        if (t <= keys[0][0]) return keys[0][1];
        for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return blend(keys[i - 1][1], keys[i][1], EASE[keys[i][2] || 'io']((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
        return keys[keys.length - 1][1];
    };
    const TAU = Math.PI * 2;

    // --- The motions. Each: how long, whether it loops, the times its frames are taken at, and the pose at a time.
    const RUN_MS = 640;
    function runPose(t) {
        const p = ((t / RUN_MS) % 1 + 1) % 1, th = p * TAU, A = 4.6;
        // A foot is planted for half the cycle (sliding back under the body) and swings forward, lifted, for the other half.
        const foot = (ph) => { const q = ((ph % 1) + 1) % 1; if (q < 0.5) return [A - 4 * A * q, 2, q < 0.08 ? 0.5 : 0]; const s = (q - 0.5) * 2; return [-A + 2 * A * EASE.io(s), 2, Math.sin(Math.PI * s) * 3.2 + (s < 0.4 ? 1.2 * (1 - s / 0.4) : 0)]; };
        const sw = Math.cos(th);                                   // +1 when the right foot lands in front
        const arm = (deg, reach) => [Math.sin(rad(deg)) * reach, 0.9, -Math.cos(rad(deg)) * reach];
        return pose(REST, {
            pu: -1.3 + 1.5 * Math.abs(Math.sin(th)), px: 0.4, pitch: 9, roll: 1.5 * Math.sin(th),
            hipYaw: -11 * sw, yaw: 15 * sw, hu: 0.25 * Math.sin(th * 2 - 0.6),
            fR: foot(p), fL: foot(p + 0.5),
            hL: arm(34 * sw - 4, 7.4), hR: arm(-20 * sw + 8, 6.6), w: [14 + 10 * sw, -34 - 6 * sw]
        });
    }
    const idlePose = (t) => { const b = Math.sin((t / 2400) * TAU); return pose(REST, { pr: 0.5, roll: 1.2, hipYaw: 6, yaw: 4, br: 0.45 + 0.45 * b, hu: 0.2 * Math.sin((t / 2400) * TAU - 0.9), fL: [0.6, 2.6, 0], aR: [80, -80 + 1.5 * b, 8.2] }); };
    const readyPose = (t) => { const b = Math.sin((t / 1600) * TAU); return pose(READY, { pu: -1.4 - 0.5 * b, br: 0.3 + 0.3 * b, aR: [52, -24 + 3 * b, 6.6], w: [-8, 36 + 3 * b] }); };
    const guardPose = (t) => { const b = Math.sin((t / 1200) * TAU); return pose(GUARD, { pu: -2.1 - 0.4 * b, br: 0.3 + 0.3 * b }); };
    // Swing: coil back (weight on the back foot, shoulders wound up), cut across the front with the whole body
    // turning and stepping in, overshoot, settle back to guard.
    const COIL = pose(READY, { yaw: 58, hipYaw: 36, px: -1.5, pu: -2.3, pitch: -3, hf: -0.4, aR: [124, 48, 7.6], w: [142, 62], aL: [8, -18, 6.6], fR: [-3.6, 2.9, 0] });
    const CUT = pose(READY, { yaw: -50, hipYaw: -14, px: 2.8, pu: -2.5, pitch: 17, hf: 0.5, aR: [-52, -30, 8.5], w: [-72, -36], aL: [66, -52, 6.2], fL: [4.6, 2.2, 0], fR: [-4.6, 2.8, 0.7] });
    const THROUGH = pose(CUT, { yaw: -60, pitch: 19, pu: -2.8, aR: [-92, -44, 7.8], w: [-128, -48] });
    // Heavy: both hands over the head, up on the toes, then the whole body drops into the blow.
    const GATHER = pose(READY, { pu: -2.7, pitch: 9, aR: [40, -40, 6], aL: [36, -40, 6], w: [0, 14] });
    const RAISED = pose(READY, { pu: 0.7, px: -0.8, pitch: -13, yaw: 16, hipYaw: 10, hu: 0.3, hf: -0.5, aR: [26, 76, 8.2], aL: [26, 70, 7.8], w: [172, 58], fR: [-3.2, 2.9, 0.6], fL: [3.2, 2.2, 0.3] });
    const SLAM = pose(READY, { pu: -3.8, px: 3, pitch: 31, yaw: 0, hipYaw: 0, hf: 0.8, aR: [6, -46, 8.5], aL: [6, -50, 8.2], w: [4, -30], fR: [-5, 2.7, 0.6], fL: [4.8, 2.3, 0] });
    // Thrust: draw the hand back to the hip, then drive the point straight out behind a long step.
    const CHAMBER = pose(READY, { yaw: 46, hipYaw: 30, px: -1.6, pu: -2.2, aR: [150, -22, 6.2], w: [4, 4], aL: [14, -6, 7.2] });
    const LUNGE = pose(READY, { yaw: -34, hipYaw: -8, px: 3.6, pu: -3, pitch: 20, hf: 0.7, aR: [-4, -4, 8.5], w: [0, 0], aL: [150, -30, 7], fL: [5.4, 2.2, 0], fR: [-5.2, 2.8, 0.5] });
    // Cast: gather at the chest, raise the weapon hand high, throw it forward.
    const DRAW_IN = pose(READY, { pu: -1.6, yaw: 36, aR: [70, 8, 5.4], w: [20, 74], aL: [34, -8, 5.2] });
    const RAISE = pose(READY, { pu: 0.5, pitch: -7, yaw: 10, hu: 0.4, aR: [24, 64, 8.3], w: [8, 82], aL: [48, 22, 7.2] });
    const RELEASE = pose(READY, { px: 1.4, pu: -1.8, pitch: 11, yaw: -22, hipYaw: 4, aR: [4, 10, 8.5], w: [0, 26], aL: [72, -34, 6.6] });
    // Hurt: thrown back off the front foot, head snapping away, arms flung wide.
    const RECOIL = pose(READY, { px: -2.4, pu: -0.5, pitch: -17, yaw: -14, hipYaw: 4, hf: -1.3, hu: -0.3, aR: [112, -28, 7.6], aL: [104, -22, 7.6], w: [150, -18], fR: [-3.8, 2.7, 0], fL: [1.6, 2.4, 0.9], eyes: 'shut', shieldFront: 0 });
    const REEL = pose(RECOIL, { px: -3.1, pitch: -21, pu: -1.1, fL: [0.6, 2.4, 0.2] });
    // Dodge: a low sprinting dive, arms and weapon streaming back.
    const DIVE = (lead) => pose(REST, { pu: -3.7, px: 2.2, pitch: 38, yaw: 14 * lead, hf: 0.6, aR: [172, -8, 8], w: [178, -4], aL: [176, -14, 8], fR: lead > 0 ? [5.2, 2.2, 1.6] : [-5.6, 2.2, 2.4], fL: lead > 0 ? [-5.6, 2.2, 2.4] : [5.2, 2.2, 1.6] });
    const CROUCH = pose(REST, { pu: -2.6, pitch: 20, fL: [2.4, 2.3, 0], fR: [-2.4, 2.5, 0], aR: [120, -50, 7.4], aL: [120, -54, 7.4] });
    const SKID = pose(REST, { px: -0.9, pu: -1.5, pitch: -9, fR: [3.8, 2.2, 0], fL: [-2.2, 2.4, 0], aR: [30, -62, 7.6], aL: [40, -60, 7.6], hf: -0.3 });
    const KNEEL = pose(REST, { pu: -5.6, px: 0.6, pitch: 27, hf: 1.2, hu: -1, fR: [3, 2.4, 0], fL: [-3.6, 2.2, 0.4], aR: [30, -70, 8], aL: [60, -80, 8.2], w: [10, -8], eyes: 'shut' });
    const ANIMS = {
        idle: { ms: 2400, loop: true, at: [0, 300, 600, 900, 1200, 1500, 1800, 2100], pose: idlePose, wind: 1 },
        walk: { ms: RUN_MS, loop: true, at: Array.from({ length: 10 }, (_, i) => (i * RUN_MS) / 10), pose: runPose, drag: 2.4 },
        ready: { ms: 1600, loop: true, at: [0, 267, 533, 800, 1067, 1333], pose: readyPose, wind: 0.6 },
        guard: { ms: 1200, loop: true, at: [0, 300, 600, 900], pose: guardPose, wind: 0.4 },
        slash: { ms: 350, at: [0, 30, 55, 90, 120, 150, 200, 270], trail: [3, 4, 5, 6],
            pose: keyed([[0, READY], [55, COIL, 'out'], [150, CUT, 'in'], [215, THROUGH, 'out'], [350, READY, 'io']]) },
        heavy: { ms: 720, at: [0, 70, 130, 200, 270, 330, 380, 430, 500, 600], trail: [6, 7],
            pose: keyed([[0, READY], [130, GATHER, 'out'], [330, RAISED, 'out'], [430, SLAM, 'in'], [560, pose(SLAM, { pu: -3.3, pitch: 28 }), 'out'], [720, READY, 'io']]) },
        thrust: { ms: 350, at: [0, 40, 80, 115, 150, 200, 270], trail: [3, 4],
            pose: keyed([[0, READY], [80, CHAMBER, 'out'], [150, LUNGE, 'in'], [215, pose(LUNGE, { px: 3.9, pu: -3.2 }), 'out'], [350, READY, 'io']]) },
        cast: { ms: 540, at: [0, 70, 140, 220, 300, 360, 420, 480],
            pose: keyed([[0, READY], [140, DRAW_IN, 'out'], [300, RAISE, 'io'], [420, RELEASE, 'in'], [540, READY, 'io']]) },
        hit: { ms: 250, at: [0, 50, 110, 180], pose: keyed([[0, RECOIL], [70, REEL, 'out'], [250, READY, 'io']]) },
        dash: { ms: 250, at: [0, 60, 120, 190], drag: 4.6, pose: keyed([[0, CROUCH], [60, DIVE(1), 'out'], [150, DIVE(-1), 'io'], [250, CROUCH, 'io']]) },
        stop: { ms: 180, at: [0, 60, 120], pose: keyed([[0, SKID], [180, idlePose(0), 'out']]) },
        fall: { ms: 440, at: [0, 140, 240, 440], pose: keyed([[0, RECOIL], [140, REEL, 'out'], [440, KNEEL, 'in']]) }
    };
    // Frame names: '<motion><n>' (walk1..walk10). The older names stay as aliases, so nothing that asks for one breaks.
    const FRAMES = {};
    for (const [name, a] of Object.entries(ANIMS)) a.at.forEach((t, i) => { FRAMES[`${name}${i + 1}`] = { anim: name, i, t }; });
    Object.assign(FRAMES, { stand: FRAMES.idle1, parry: FRAMES.guard1, hit: FRAMES.hit1, down1: FRAMES.fall3, down2: FRAMES.fall4, slash0: FRAMES.slash1 });
    const LYING = { down3: -1, down4: 0 };
    const POSES = [...Object.keys(FRAMES), ...Object.keys(LYING)];

    /** A pose seen from one facing: every joint in frame pixels, plus what the painters need to layer it. */
    function build(s, facing) {
        const a = rad(VIEW[facing]), ca = Math.cos(a), sa = Math.sin(a);
        const proj = ([f, r, u]) => { const gy = f * sa + r * ca; return [CX + f * ca - r * sa, FEET - u + gy * TILT, gy]; };
        const hipC = [s.px, s.pr, BODY.hip + s.pu];
        const sp = [Math.sin(rad(s.pitch)), Math.sin(rad(s.roll)), Math.cos(rad(s.pitch)) * Math.cos(rad(s.roll))];
        const up = (h, lift = s.br) => vadd(vadd(hipC, vmul(sp, h - BODY.hip)), [0, 0, lift]);
        const shC = up(BODY.sh);
        const arm = (side, spec, explicit) => {
            const S = vadd(shC, rotY([0, side * BODY.shW, 0], s.yaw));
            const off = explicit ? [explicit[0], side * explicit[1], explicit[2]] : vmul(sph(spec[0], spec[1], side), Math.min(spec[2], 8.55));
            const Hd = vadd(S, off);
            return [S, ik(S, Hd, BODY.upArm, BODY.foreArm, [-0.6, side * 0.4, -0.7]), Hd];
        };
        const leg = (side, ft) => {
            const Hp = vadd(hipC, rotY([0, side * BODY.hipW, 0], s.hipYaw)), F = [ft[0], side * ft[1], ft[2]];
            return [Hp, ik(Hp, F, BODY.thigh, BODY.shin, [1, side * 0.3, 0.1]), F];
        };
        const R = arm(1, s.aR, s.hR), L = arm(-1, s.aL, s.hL), lr = leg(1, s.fR), ll = leg(-1, s.fL);
        const head = vadd(up(BODY.neck), [s.hf + sp[0] * 1.4, s.hr + sp[1] * 1.4, BODY.head - BODY.neck + s.hu]);
        const P = (v) => { const q = proj(v); return [q[0], q[1]]; };
        const hipS = proj(hipC), chestS = proj(up(BODY.chest));
        const wv = sph(s.w[0], s.w[1]), wx = wv[0] * ca - wv[1] * sa, wd = wv[0] * sa + wv[1] * ca, wy = -wv[2] + wd * TILT;
        const dR = proj(R[2])[2] - hipS[2], dL = proj(L[2])[2] - hipS[2];
        return {
            head: P(head), neck: P(up(BODY.neck)), shR: P(R[0]), elR: P(R[1]), haR: P(R[2]), shL: P(L[0]), elL: P(L[1]), haL: P(L[2]),
            hipR: P(lr[0]), knR: P(lr[1]), ftR: P(lr[2]), hipL: P(ll[0]), knL: P(ll[1]), ftL: P(ll[2]),
            torsoTop: chestS[1], torsoBottom: hipS[1] - 0.1, torsoX: hipS[0], lean: chestS[0] - hipS[0],
            weapon: (Math.atan2(wy, wx) * 180) / Math.PI, wScale: Math.max(0.58, Math.min(1.05, Math.hypot(wx, wy))),
            dR, dL, dW: dR + wd * 6, nearR: proj(lr[2])[2] >= proj(ll[2])[2], face: [ca, sa],
            eyes: s.eyes || 'open', parry: !!s.parry, shieldFront: !!s.shieldFront
        };
    }

    // Secondary motion. Hair and cloth are not posed: they follow. A damped spring is dragged behind the head (hair)
    // and the chest (cloth) through the whole motion, and how far it trails at each frame is what the painters bend
    // the hanging parts by. A run adds the drag of moving through the air; standing still adds a slow breeze.
    const SPRING = { h: { hz: 2.7, damp: 0.3, gain: 1.5 }, c: { hz: 1.9, damp: 0.42, gain: 1.9 } };
    const tracks = new Map();
    function swayTrack(facing, name) {
        const key = facing + ':' + name;
        if (tracks.has(key)) return tracks.get(key);
        const A = ANIMS[name], dt = 5, pre = A.loop ? A.ms * 2 : 300;
        const anchors = (t) => { const k = build(A.pose(A.loop ? ((t % A.ms) + A.ms) % A.ms : Math.max(0, t)), facing); return { h: k.head, c: [k.torsoX + k.lean, k.torsoTop], face: k.face }; };
        const st = {}, out = A.at.map(() => null);
        const a0 = anchors(-pre);
        for (const id of ['h', 'c']) st[id] = { x: [...a0[id]], v: [0, 0] };
        for (let t = -pre; t <= A.ms; t += dt) {
            const an = anchors(t);
            for (const id of ['h', 'c']) {
                const { hz, damp } = SPRING[id], w = (TAU * hz) / 1000, s = st[id];
                for (const j of [0, 1]) { s.v[j] += (w * w * (an[id][j] - s.x[j]) - 2 * damp * w * s.v[j]) * dt; s.x[j] += s.v[j] * dt; }
            }
            A.at.forEach((ft, i) => {
                if (out[i] || t < ft) return;
                const o = {};
                for (const id of ['h', 'c']) {
                    const g = SPRING[id].gain, ph = (ft / A.ms) * TAU - (id === 'c' ? 1.1 : 0);
                    o[id] = [(st[id].x[0] - an[id][0]) * g - an.face[0] * (A.drag || 0) + (A.wind || 0) * Math.sin(ph) * (id === 'c' ? 1 : 0.8),
                        (st[id].x[1] - an[id][1]) * g - an.face[1] * (A.drag || 0) * 0.8 + (A.wind || 0) * 0.25 * Math.cos(ph)];
                }
                for (const id of ["h", "c"]) { const m = Math.hypot(o[id][0], o[id][1]), cap = id === "c" ? 4.2 : 3.4; if (m > cap) o[id] = [(o[id][0] / m) * cap, (o[id][1] / m) * cap]; }   // cloth stretches only so far
                out[i] = o;
            });
        }
        tracks.set(key, out);
        return out;
    }

    /** The skeleton of one frame. */
    function skeleton(facing, name) {
        if (name in LYING) {
            // Lying on the ground, head to the left (all facings). down3 is the bounce on landing, down4 at rest.
            const lift = LYING[name], at = (x, y) => [x + CX - 32, y + FEET - 42.4 + lift];
            return { pose: 'lying', lying: true, eyes: 'shut', torsoX: 0, lean: 0, weaponBehind: true, wScale: 1, swH: [0, 0], swC: [0, 0], lift,
                head: at(18.4, 37.6), shR: at(24.6, 39.8), elR: at(28.8, 41.6), haR: at(33, 41.6), shL: at(24.6, 36.6), elL: at(28.8, 35.4), haL: at(32.6, 36),
                hipR: at(37.4, 40), knR: at(42.6, 40.4), ftR: at(48, 40.8), hipL: at(37.4, 38), knL: at(42.4, 36.8), ftL: at(47.6, 38.2),
                weapon: 8, weaponAt: at(37, 43) };
        }
        const fr = FRAMES[name], A = ANIMS[fr.anim];
        const k = build(A.pose(fr.t), facing), sw = swayTrack(facing, fr.anim)[fr.i];
        k.pose = fr.anim; k.swH = sw.h; k.swC = sw.c;
        k.weaponBehind = k.dW < -2.2;
        if (A.trail && A.trail.includes(fr.i)) {
            // The blade's trail: where the weapon was through the time since the last frame.
            const t0 = A.at[fr.i - 1];
            k.trail = Array.from({ length: 7 }, (_, j) => { const q = build(A.pose(lerp(t0, fr.t, j / 6)), facing); return { hand: q.haR, deg: q.weapon, scale: q.wScale }; });
        }
        return k;
    }

    // ---------------------------------------------------------------------
    // Parts
    // ---------------------------------------------------------------------
    /** Hanging things (a tail of hair, a scarf end): a tapering run of dots from a root, bent by the frame's sway. */
    function chain(p, x, y, dx, dy, len, r0, r1, sw, gain = 1) {
        const n = Math.ceil(len / 0.7);
        for (let i = 0; i <= n; i++) { const t = i / n, q = Math.pow(t, 1.5) * gain, r = lerp(r0, r1, t); ellipse(p, x + dx * len * t + sw[0] * q, y + dy * len * t + sw[1] * q * 0.6, r, r); }
        return p;
    }
    function drawLeg(grid, hip, kn, ft, style, side, near = true) {
        const robe = style === 3, dim = near ? 0 : -0.32;               // the far leg sits in shade
        const boot = part();
        // Boots: a rounded block at the foot, toe pointing the way the character faces (`side` 0..1: how far turned).
        const turn = +side || 0, toe = 1.4 * turn, top = [lerp(kn[0], ft[0], 0.32), lerp(kn[1], ft[1], 0.32)];
        ellipse(boot, ft[0] + toe * 0.5, ft[1] - 1.2, lerp(1.9, 2.6, turn), 1.7, dim);
        capsule(boot, top[0], top[1], ft[0], ft[1] - 1.4, lerp(1.65, 1.75, turn), dim);
        const leg = part();
        capsule(leg, hip[0], hip[1], kn[0], kn[1], 1.9, dim);
        capsule(leg, kn[0], kn[1], top[0], top[1], 1.65, dim);
        if (!robe) paint(grid, leg, 'cloth2');
        paint(grid, boot, 'leather');
        const cuff = part(); ellipse(cuff, top[0], top[1], 2.05, 0.95, near ? 0.5 : 0.1);   // the turned-down top of the boot
        paint(grid, cuff, style === 5 ? 'cloth2' : 'leather', { edge: false });
    }

    function drawArm(grid, sh, el, ha, style, back, opts = {}) {
        const dim = opts.far ? -0.32 : 0;
        const sleeve = part();
        capsule(sleeve, sh[0], sh[1], el[0], el[1], style === 3 ? 2 : 1.7, dim);
        capsule(sleeve, el[0], el[1], lerp(el[0], ha[0], 0.7), lerp(el[1], ha[1], 0.7), style === 3 ? 1.9 : 1.5, dim);
        const wide = style === 3;   // robe sleeves flare at the wrist
        if (wide) ellipse(sleeve, lerp(el[0], ha[0], 0.7), lerp(el[1], ha[1], 0.7), 2.1, 1.7, dim);
        paint(grid, sleeve, style === 2 ? 'cloth2' : style === 5 ? 'cloth2' : 'cloth');
        if (style === 2) { const pad = part(); ellipse(pad, sh[0], sh[1] - 0.2, 2.7, 2.2, 0.1 + dim); paint(grid, pad, 'metal'); }
        if (style === 4 || style === 0 || style === 2) {             // bracers: wrapped leather, or plate on the Ironclad
            const wrap2 = part(); capsule(wrap2, lerp(el[0], ha[0], 0.3), lerp(el[1], ha[1], 0.3), lerp(el[0], ha[0], 0.72), lerp(el[1], ha[1], 0.72), 1.55, dim);
            paint(grid, wrap2, style === 2 ? 'metal' : 'leather');
        }
        const hand = part();
        ellipse(hand, ha[0], ha[1], 1.55, 1.5, 0.1 + dim);
        paint(grid, hand, opts.glove ? 'leather' : 'skin');
    }

    function drawTorso(grid, k, style, facing) {
        const side = facing === 'right', back = facing === 'up';
        const t = k.torsoTop, b = k.torsoBottom, cx = k.torsoX, lean = (k.lean || 0) / 0.6, sw = k.swC || [0, 0];
        const turn = side ? 1 : k.turn || 0;
        // The shoulders are as wide as they really are in this pose: a body wound up for a swing shows its turn.
        const wTop = k.lying ? 5.4 : Math.max(3.6, Math.min(5.8, Math.abs(k.shR[0] - k.shL[0]) / 2 + 0.3));
        const wWaist = Math.max(3.1, wTop * 0.78), wHip = lerp(4.8, 3.6, turn);
        const chestF = 0.9 * turn;
        const fo = side ? 0 : (back ? -1 : 1) * turn * 1.6;   // a 3/4 view: the front (or back) details move round
        const waistY = lerp(t, b, 0.66);
        // Hem: how far the garment reaches below the hips.
        const hem = { 0: 3.6, 1: 9.6, 2: 3, 3: 10.6, 4: 2.2, 5: 1.6 }[style], hs = sw[0] * (hem > 5 ? 1.1 : 0.35);   // long hems swing
        const flare = { 0: 1.2, 1: 1.4, 2: 1.4, 3: 1.8, 4: 0.4, 5: 0.6 }[style];
        const hemY = Math.min(b + hem + (hem > 5 ? sw[1] * 0.4 : 0), FEET - 0.2);
        const body = part();
        poly(body, [[cx - wTop + lean * 0.6 + chestF * 0.2, t], [cx + wTop + lean * 0.6 + chestF, t], [cx + wWaist + lean * 0.3 + chestF * 0.5, waistY], [cx + wHip, b],
            [cx + wHip + flare + hs, hemY], [cx + hs * 1.1, hemY + (hem > 5 ? 0.9 : 0)], [cx - wHip - flare + hs, hemY], [cx - wHip, b], [cx - wWaist + lean * 0.3, waistY]]);
        // Round the shoulders.
        ellipse(body, cx - wTop + 1 + lean * 0.6, t + 1.3, 1.8, 1.6); ellipse(body, cx + wTop - 1 + lean * 0.6 + chestF, t + 1.3, 1.8, 1.6);
        paint(grid, body, 'cloth');
        const P = (pts) => pts.map(([x, y]) => [x + cx + fo + lean * 0.6 * Math.max(0, 1 - (y - t) / (b - t)), y]);
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
            if (!back && !side) for (let y = Math.ceil(t + 2); y < waistY; y += 1) dot(grid, cx + fo, y, MAT.metal[2]);
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
            else capsule(strap, cx + fo + 3.6, t + 0.8, cx + fo - 3.4, waistY + 0.6, 0.75);
            paint(grid, strap, 'leather', { edge: false });
        }
        // Belt or sash.
        const belt = part();
        poly(belt, [[cx - wWaist - 0.4, waistY + 0.4], [cx + wWaist + 0.4 + chestF * 0.5, waistY + 0.4], [cx + wHip, waistY + 2], [cx - wHip, waistY + 2]], 0, false);
        paint(grid, belt, style === 3 ? 'accent' : 'leather');
        if (!back && !side && style !== 3) { dot(grid, cx + fo - 0.5, waistY + 1, MAT.accent[0]); dot(grid, cx + fo + 0.5, waistY + 1, MAT.accent[1]); }
        if (side && style === 3) { const tail = part(); capsule(tail, cx - wWaist, waistY + 1.4, cx - wWaist - 0.6, waistY + 5, 0.8); paint(grid, tail, 'accent'); }
        // Neckline / collar.
        if (!back) {
            if (style === 0) { const sc = part(); poly(sc, side ? [[cx - 1.8, t - 0.6], [cx + 2.8, t - 0.6], [cx + 2.2, t + 2], [cx - 1.4, t + 2]] : P([[-4 + turn, t - 0.6], [4 - turn, t - 0.6], [2.6 - turn, t + 2.4], [-2.6 + turn, t + 2.4]]), 0.1); paint(grid, sc, 'accent'); }
            if (style === 4) { const sc = part(); ellipse(sc, cx + (side ? 0.8 : fo), t + 0.6, lerp(4.4, 3, turn), 1.9); paint(grid, sc, 'accent'); }
            if (style === 3 && !side) { for (let y = Math.ceil(t + 1); y < waistY; y++) dot(grid, cx + fo, y, MAT.accent[1]); }
        }
        // Cloth folds: a darker line down a long garment, swinging with the hem.
        if (hem > 5 && !side) for (const fx of [-0.42, 0.45]) for (let y = Math.ceil(b + 1); y < hemY - 0.5; y++) { const x = cx + fx * (wHip + flare) + hs * ((y - b) / hem); const i = Math.floor(y) * W + Math.floor(x); if (grid.mat[i] === 'cloth') grid.role[i] = MAT.cloth[2]; }
    }

    // Capes and scarf ends: cloth that hangs from the shoulders and follows the body a beat late (k.swC).
    const CAPE = { 0: { len: 15.5, mat: 'accent' }, 2: { len: 17, mat: 'cloth' }, 4: { len: 9.5, mat: 'accent' } };
    const SCARF = { 0: { len: 6.5 }, 4: { len: 10.5 } };
    function drawCape(grid, k, style, facing) {
        const c = CAPE[style];
        if (!c) return;
        const side = facing === 'right', back = facing === 'up', sw = k.swC || [0, 0];
        const t = k.torsoTop, cx = k.torsoX, lean = k.lean || 0, turn = k.turn || 0;
        const by = Math.min(t + c.len + sw[1] * 0.7, FEET - 1.4), sx = sw[0] * 1.5;
        const p = part();
        let folds = [];
        if (side) {
            poly(p, [[cx + lean - 2.4, t - 0.4], [cx + lean + 1.2, t - 0.2], [cx - 0.4 + lean * 0.4, t + c.len * 0.55], [cx - 1.4 + sx, by], [cx - 3.6 + sx * 1.15, by + 0.9],
                [cx - 5.8 + sx * 1.25, by - 0.6], [cx - 4.8 + sx * 0.5 + lean * 0.4, t + c.len * 0.5], [cx + lean - 4, t + 1.6]]);
            folds = [[[cx + lean - 2.6, t + 3], [cx - 3.6 + sx * 1.1, by - 1.5]]];
        } else {
            const w = Math.max(3.9, Math.abs(k.shR[0] - k.shL[0]) / 2 + 0.6), o = (back ? 1 : -1) * turn * 1.6, fl = w + 1.5;
            poly(p, [[cx + lean - w, t - 0.5], [cx + lean + w, t - 0.5], [cx + o + fl + sx * 0.8, by - 1.2], [cx + o + fl * 0.5 + sx, by + 0.7], [cx + o + sx, by - 0.9],
                [cx + o - fl * 0.5 + sx, by + 0.7], [cx + o - fl + sx * 0.8, by - 1.2]]);
            folds = [-0.5, 0.45].map((fx) => [[cx + lean + fx * w, t + 2.5], [cx + o + fx * fl + sx * 0.9, by - 1.6]]);
        }
        paint(grid, p, c.mat);
        for (const [[ax, ay], [bx, by2]] of folds) for (let y = Math.ceil(ay); y < by2; y++) {
            const i = y * W + Math.floor(lerp(ax, bx, (y - ay) / Math.max(1, by2 - ay)));
            if (p.has(i) && grid.mat[i] === c.mat) grid.role[i] = MAT[c.mat][2];
        }
    }
    function drawScarf(grid, k, style, facing) {
        const s = SCARF[style];
        if (!s) return;
        const side = facing === 'right', back = facing === 'up', sw = k.swC || [0, 0], t = k.torsoTop, cx = k.torsoX + (k.lean || 0);
        const p = part();
        if (side) chain(p, cx - 2.6, t + 0.8, -0.42, 0.9, s.len, 1.35, 0.8, sw, 2.3);
        else if (back) chain(p, cx + 1.8, t + 0.4, 0.14, 1, s.len, 1.35, 0.8, sw, 2.3);
        else chain(p, cx - 3.2 - (k.turn || 0) * 1.2, t + 1.8, -0.22, 1, s.len, 1.35, 0.8, sw, 2.3);
        paint(grid, p, 'accent');
    }

    /** How far (head-space px) the face has moved toward +x in a 3/4 view facing down; 0 otherwise. */
    const faceShift = (k, facing) => (facing === 'down' ? (k.turn || 0) * 3 : 0);

    // Hair: drawn round the head centre. `front` is everything over the face/head; `back` goes behind the body.
    const drawHairBack = inHead(function drawHairBack(grid, k, style, facing) {
        const [hx, hy] = k.head, back = facing === 'up', side = facing === 'right';
        const p = part(), sw = k.swH || [0, 0];
        const q = (x, y, g) => [x + sw[0] * g, y + sw[1] * g * 0.6];
        if (style === 1) {                                               // tied tail
            if (side) chain(p, hx - 4.6, hy - 1, -0.42, 0.9, 7.8, 1.7, 1.05, sw, 1.6);
            else if (back) chain(p, hx, hy + 2, 0, 1, 9.2, 1.8, 1.05, sw, 1.6);
            else chain(p, hx + 2, hy + 3, 0.1, 1, 7.4, 1.6, 1, sw, 1.8);
        } else if (style === 5) {                                        // long, loose
            if (side) poly(p, [[hx - 5.6, hy - 3], [hx - 1, hy - 2], q(hx - 0.6, hy + 11.6, 1.2), q(hx - 3.4, hy + 13, 1.5), q(hx - 6.8, hy + 11.2, 1.3)]);
            else poly(p, [[hx - 6.6, hy - 2], [hx + 6.6, hy - 2], q(hx + 6.9, hy + 11.2, 1.2), q(hx + 3.4, hy + 12.8, 1.45), q(hx, hy + 11.6, 1.3), q(hx - 3.4, hy + 12.8, 1.45), q(hx - 6.9, hy + 11.2, 1.2)]);
        } else if (style === 3) {                                        // braid
            const root = side ? [hx - 4.2, hy + 2.6, -0.26, 0.96] : back ? [hx, hy + 4, 0, 1] : null;
            if (root) for (let i = 0; i < 5; i++) { const t = i / 4, g = Math.pow(t, 1.5) * 1.7; ellipse(p, root[0] + root[2] * 9 * t + (i % 2 ? 0.5 : -0.5) + sw[0] * g, root[1] + root[3] * 9 * t + sw[1] * g * 0.6, 1.6 - t * 0.3, 1.4); }
        } else if (style === 2) {                                        // bob: back of the bob shows below the head
            if (back || side) poly(p, [[hx - 6.4 + (side ? 1 : 0), hy - 1], [hx + (side ? 0 : 6.4), hy - 1], q(hx + (side ? 0.4 : 6.6), hy + 5.6, 0.6), q(hx - 6.6, hy + 5.6, 0.6)]);
        } else if (style === 8) {                                        // curls
            if (!side && !back) { ellipse(p, ...q(hx - 6.2, hy + 3, 0.4), 2.4, 3.2); ellipse(p, ...q(hx + 6.2, hy + 3, 0.4), 2.4, 3.2); }
            if (side) ellipse(p, ...q(hx - 4.4, hy + 3, 0.5), 3.2, 3.6);
            if (back) ellipse(p, ...q(hx, hy + 3, 0.4), 7.4, 4.6);
        }
        if (p.size) paint(grid, p, 'hair');
    });
    const drawHairFront = inHead(function drawHairFront(grid, k, style, facing, hat) {
        const [hx, hy] = k.head, back = facing === 'up', side = facing === 'right', fo = faceShift(k, facing);
        const helmet = hat === 4, hood = hat === 1;
        if (style === 7) {                                               // shorn: a dark cap close to the skull
            const p = part(); ellipse(p, hx - (side ? 0.6 : 0), hy - 2.4, side ? 5.4 : 6.2, 3.8);
            for (const i of [...p.keys()]) { const y = un(i)[1]; if (y > hy - 1 && !back) p.delete(i); }
            if (!helmet && !hood) paint(grid, p, 'hair', { levels: [0.6, 0, -0.5] });
            return;
        }
        const cap = part();
        // The skull cover: a dome over the top of the head.
        const vol = style === 8 ? 1.2 : style === 4 || style === 6 ? 0.3 : 0.7;
        ellipse(cap, hx - (side ? 0.8 : 0), hy - 1.6, (side ? 5.6 : 6.6) + vol, 5.2 + vol * 0.6);
        // Cut the face out of the dome (front and side).
        for (const i of [...cap.keys()]) {
            const [x, y] = un(i);
            if (back) { if (y > hy + 4.4 + (style === 2 || style === 5 ? 3 : style === 1 || style === 4 || style === 6 ? -0.6 : 0)) cap.delete(i); continue; }
            if (side) { if (x > hx - 1.4 && y > hy - 1.6) cap.delete(i); if (y > hy + 2.6 && style !== 2 && style !== 5) cap.delete(i); continue; }
            const fringe = { 0: -0.6, 1: -1.6, 2: -1, 3: -1.8, 4: -2.2, 5: -1.4, 6: -1.6, 8: -0.8 }[style];
            if (y > hy + fringe && Math.abs(x + 0.5 - hx - fo) < 4.6 - Math.abs(fo) * 0.3) cap.delete(i);
            if (y > hy + 2.4 && style !== 2 && style !== 5 && style !== 8) cap.delete(i);
        }
        if (helmet) return;                                             // the helm covers it all
        paint(grid, cap, 'hair');
        const p = part();
        if (!back && !side) {
            if (style === 0) for (const dx of [-3.4, -0.8, 1.8]) poly(p, [[hx + dx - 1.2, hy - 2.6], [hx + dx + 1.8, hy - 2.6], [hx + dx + 0.4, hy + 0.4]]);
            if (style === 2) { capsule(p, hx - 5.8, hy - 1, hx - 5.4, hy + 4.6, 1.5); capsule(p, hx + 5.8, hy - 1, hx + 5.4, hy + 4.6, 1.5); }
            if (style === 5) { const sx = (k.swH || [0, 0])[0] * 0.9; capsule(p, hx - 6, hy - 1, hx - 6.2 + sx, hy + 8.4, 1.6); capsule(p, hx + 6, hy - 1, hx + 6.2 + sx, hy + 8.4, 1.6); }
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
        // Strands: thin darker lines fanning out from the crown break the dome into locks of hair.
        const cx = hx - (side ? 2 : 0), cy = hy - (back ? 6 : 8), step = 0.44;
        const [hl, base, shade] = MAT.hair;
        for (let i = 0; i < W * H; i++) {
            if (grid.mat[i] !== 'hair' || (grid.role[i] !== hl && grid.role[i] !== base)) continue;
            const x = i % W + 0.5, y = ((i / W) | 0) + 0.5, r = Math.hypot(x - cx, y - cy);
            if (r < 3.5 || y < cy + 1) continue;
            const t = Math.atan2(y - cy, x - cx) / step, d = Math.abs(t - Math.round(t)) * step * r;
            if (d < 0.5) grid.role[i] = grid.role[i] === hl ? base : shade;
        }
    });

    const drawHead = inHead(function drawHead(grid, k, facing) {
        const [hx, hy] = k.head, side = facing === 'right', back = facing === 'up', turn = k.turn || 0;
        const head = part();
        if (k.lying) ellipse(head, hx, hy, 5.6, 5.4);
        else ellipse(head, hx + (side ? 0.4 : turn * 0.4), hy + 0.3, side ? 5.6 : lerp(6.2, 5.6, turn), 6.2);
        if (side && !k.lying) { setPx(head, hx + 6, hy + 0.6, 0.2); setPx(head, hx + 5.6, hy + 1.6, 0); }   // nose
        // Ears. Turned 3/4, only the one on the far side of the face shows (behind the cheek facing down, by the cheek facing up).
        if (!side && !k.lying && !turn) { ellipse(head, hx - 6.2, hy + 0.8, 1, 1.4, -0.1); ellipse(head, hx + 6.2, hy + 0.8, 1, 1.4, -0.3); }
        if (turn && !k.lying) ellipse(head, hx + (back ? 5.2 : -4.8), hy + 0.8, 1, 1.4, -0.2);
        if (side) ellipse(head, hx - 1.4, hy + 0.8, 1.1, 1.4, -0.2);
        paint(grid, head, 'skin', { levels: [0.5, -0.7, -2], edge: false });          // soft: highlight, base and one shade
        if (back) return;
        const shut = k.eyes === 'shut';
        if (k.lying) { dot(grid, hx + 1, hy - 1, MAT.skin[3]); dot(grid, hx + 2, hy - 1, MAT.skin[3]); return; }
        // The face is placed pixel by pixel (big chibi eyes: a dark lid, a lit iris with a shine, a deeper iris below).
        XF = null;
        const ey = Math.floor(hy + 1.6), fx = Math.floor(hx);
        const eye = (x, front) => {
            if (shut) { dot(grid, x, ey, EYE); dot(grid, x + 1, ey, EYE); dot(grid, x + (front ? 1 : 0), ey - 1, MAT.skin[3]); return; }
            dot(grid, x, ey - 1, EYE); dot(grid, x + 1, ey - 1, EYE);
            dot(grid, x, ey, SHINE); dot(grid, x + 1, ey, IRIS);
            dot(grid, x, ey + 1, IRIS2); dot(grid, x + 1, ey + 1, IRIS);
        };
        if (side) {
            eye(fx + 3, true);
            dot(grid, fx + 5, ey + 3, MOUTH);
        } else if (turn) {                                               // 3/4: the face has turned toward +x
            eye(fx - 2, false); eye(fx + 3, true);
            dot(grid, fx + 1, ey + 3, MOUTH); dot(grid, fx + 2, ey + 3, MAT.skin[2]);
            dot(grid, fx + 6, ey + 1, MAT.skin[1]);                     // the cheek's edge
        } else {
            eye(fx - 4, false); eye(fx + 2, true);
            dot(grid, fx - 1, ey + 3, MOUTH); dot(grid, fx, ey + 3, MAT.skin[2]);
        }
    });

    const drawHat = inHead(function drawHat(grid, k, hat, facing, layer) {
        if (!hat) return;
        const [hx, hy] = k.head, side = facing === 'right', back = facing === 'up', fo = faceShift(k, facing);
        const p = part();
        if (hat === 1) {                                                 // hood: drawn in two layers
            if (layer === 'back') { if (!back) { poly(p, [[hx - 7.2, hy - 2], [hx + 7.2, hy - 2], [hx + 7.6, hy + 7.6], [hx - 7.6, hy + 7.6]]); paint(grid, p, 'hat'); } return; }
            ellipse(p, hx - (side ? 0.6 : 0), hy - 1.4, side ? 6.6 : 7.4, 6.4);
            if (back) { poly(p, [[hx - 7.4, hy], [hx + 7.4, hy], [hx + 7.6, hy + 7.4], [hx - 7.6, hy + 7.4]]); }
            for (const i of [...p.keys()]) {
                const [x, y] = un(i);
                if (back) continue;
                if (side) { if (x > hx - 0.4 && y > hy - 3) p.delete(i); continue; }
                if (y > hy - 3.6 && Math.abs(x + 0.5 - hx - fo) < 4.8) p.delete(i);
            }
            if (side) poly(p, [[hx - 6.4, hy - 1], [hx - 1, hy - 1], [hx - 0.4, hy + 7], [hx - 6.6, hy + 6]]);
            paint(grid, p, 'hat');
            return;
        }
        if (layer === 'back') return;
        if (hat === 2 || hat === 6) {                                    // wide brim / straw hat
            ellipse(p, hx - (side ? 0.4 : 0), hy - 4.4, side ? 9 : 10, 2.4, 0.1);
            const crown = part(); ellipse(crown, hx - (side ? 0.4 : 0), hy - 6.6, side ? 4.6 : 5.2, 3.4);
            for (const i of [...crown.keys()]) if (un(i)[1] > hy - 4.6) crown.delete(i);
            paint(grid, p, 'hat'); paint(grid, crown, 'hat');
            const band = part(); rect(band, Math.floor(hx - (side ? 4.4 : 5)), Math.floor(hy - 5.6), side ? 9 : 10, 1, 0); paint(grid, band, hat === 6 ? 'accent' : 'leather', { edge: false });
            return;
        }
        if (hat === 3) {                                                 // bandana
            if (back) { ellipse(p, hx, hy - 2, 6.6, 4.8); for (const i of [...p.keys()]) if (un(i)[1] > hy + 1) p.delete(i); capsule(p, hx, hy + 1, hx + 1.4, hy + 5, 1); capsule(p, hx, hy + 1, hx - 1.6, hy + 4.4, 1); }
            else if (side) { ellipse(p, hx - 0.6, hy - 2.4, 6, 4.4); for (const i of [...p.keys()]) if (un(i)[1] > hy - 1.6) p.delete(i); capsule(p, hx - 5, hy - 2, hx - 7.4, hy + 2.4, 1); }
            else { ellipse(p, hx, hy - 2.6, 6.8, 4.4); for (const i of [...p.keys()]) if (un(i)[1] > hy - 2) p.delete(i); }
            paint(grid, p, 'hat');
            return;
        }
        if (hat === 4) {                                                 // iron helm with a nasal guard
            ellipse(p, hx - (side ? 0.6 : 0), hy - 1.6, side ? 6.2 : 7, 5.8);
            for (const i of [...p.keys()]) {
                const [x, y] = un(i);
                if (back) { if (y > hy + 3.4) p.delete(i); continue; }
                if (side) { if (x > hx + 0.6 && y > hy - 0.6) p.delete(i); if (y > hy + 3) p.delete(i); continue; }
                if (y > hy - 0.6 && Math.abs(x + 0.5 - hx - fo) < 4.6) p.delete(i);
                if (y > hy + 3) p.delete(i);
            }
            if (!back) { if (side) rect(p, Math.floor(hx + 3.4), Math.floor(hy - 1), 1, 3, 0.2); else rect(p, Math.floor(hx + fo) - 0.5, Math.floor(hy - 1), 1, 3, 0.3); }
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
            if (!back) dot(grid, side ? hx + 3 : hx + fo * HEAD_S, y, MAT.shieldFace[0]);
        }
    });

    // Weapons: from the hand along `angle` (degrees, 0 = +x, 90 = down). Spear and mace are two-handed-length.
    function drawWeapon(grid, k, type, flags = {}) {
        if (type < 0) return;                                            // unarmed (villagers)
        const [hx, hy] = k.weaponAt || k.haR;
        const a = (k.weapon * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
        const sc = k.wScale || 1;                                         // a weapon pointing at or away from the camera is seen short
        const at = (t, o = 0) => [hx + ux * t * sc + px * o, hy + uy * t * sc + py * o];
        const grip = part(), blade = part(), guard = part();
        const ground = (q) => { for (const i of [...q.keys()]) if (((i / W) | 0) > FEET + 1.6) q.delete(i); return q; };
        if (type === 0) {                                                // sword
            const L = flags.short ? 7 : 12;
            capsule(grip, ...at(-2.6), ...at(0.6), 0.75);
            ellipse(grip, ...at(-3), 0.9, 0.9);
            capsule(guard, ...at(1.4, -2.4), ...at(1.4, 2.4), 0.75);
            capsule(blade, ...at(2), ...at(L), 1.05, 0.15);
            line(blade, ...at(2, -0.4), ...at(L - 0.6, -0.4), 0.9);
            paint(grid, ground(grip), 'leather'); paint(grid, ground(blade), 'metal', { levels: [0.6, -0.1, -0.7] }); paint(grid, ground(guard), 'accent');
            const [tx, ty] = at(L + 0.4); if (ty <= FEET + 1.6) dot(grid, tx, ty, MAT.metal[0]);
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
        } else if (type === 4) {                                         // staff: taller than its bearer, a caged stone on top
            // At rest (the pose points the weapon down) a staff is held upright like a walking stick, its foot on the
            // ground and its stone beside the head; swung or raised, it follows the arm like any weapon.
            const rest = uy > 0.25, ra = (-96 * Math.PI) / 180;
            const vx = rest ? Math.cos(ra) : ux, vy = rest ? Math.sin(ra) : uy, wx = -vy, wy = vx;
            const ss = rest ? 1 : sc, st = (t, o = 0) => [hx + vx * t * ss + wx * o, hy + vy * t * ss + wy * o];
            const T = rest ? 15 : 21, foot = rest ? -13 : -6;
            capsule(grip, ...st(foot), ...st(T - 2), 0.8);
            paint(grid, ground(grip), 'wood');
            const cage = part();
            for (const o of [-1, 1]) line(cage, ...st(T - 3, o * 0.9), ...st(T + 0.6, o * 2.4), 0.7);
            paint(grid, ground(cage), 'leather', { edge: false });
            const stone = part(); ellipse(stone, ...st(T + 0.4), 2.1, 2.1);
            paint(grid, ground(stone), 'metal', { levels: [0.7, 0, -0.6] });
            const [gx, gy] = st(T - 0.2, -0.7); if (gy <= FEET + 1.6) dot(grid, gx, gy, MAT.metal[0]);
        } else if (type === 5) {                                         // wand: short, tapered, a bright tip
            capsule(grip, ...at(-1.6), ...at(1), 0.8);
            capsule(blade, ...at(1), ...at(8.4), 0.75, 0.35);
            paint(grid, ground(grip), 'leather'); paint(grid, ground(blade), 'wood');
            const tip = part(); ellipse(tip, ...at(9.2), 1.2, 1.2);
            paint(grid, ground(tip), 'metal', { levels: [0.7, 0, -0.6] });
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
        const sq = 1 - (k.turn || 0) * 0.35;                            // turned 3/4, the face is seen a little edge-on
        if (type === 0) { ellipse(p, cx, cy, 5 * sq, 5); }
        else if (type === 1) poly(p, [[cx - 4.6 * sq, cy - 4.8], [cx + 4.6 * sq, cy - 4.8], [cx + 4.2 * sq, cy + 1.6], [cx, cy + 6.8], [cx - 4.2 * sq, cy + 1.6]]);
        else ellipse(p, cx, cy, 3.4 * sq, 3.4);
        paint(grid, p, 'shieldFace');
        // Rim and boss in metal.
        for (const i of p.keys()) {
            const x = i % W, y = (i / W) | 0;
            if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !p.has((y + dy) * W + x + dx))) rim.set(i, p.get(i));
        }
        paint(grid, rim, 'metal', { edge: false });
        if (type === 1) { for (let y = Math.ceil(cy - 3.6); y < cy + 5; y++) dot(grid, cx, y, MAT.accent[1]); for (let x = Math.ceil(cx - 3.4 * sq); x < cx + 3.4 * sq; x++) dot(grid, x, Math.floor(cy - 1), MAT.accent[1]); }
        else { ellipse(boss, cx, cy, 1.4, 1.4); paint(grid, boss, 'metal', { edge: false }); }
    }

    /** The blade's trail: the area the weapon swept since the last frame (k.trail), bright at the blade, thinning and
     *  breaking up toward where it started. Only drawn on empty pixels, so it never hides the figure. */
    const WLEN = [12.6, 11.6, 12.6, 17.6, 21, 9.6];
    function drawTrail(grid, k, type) {
        if (!k.trail || type < 0) return;
        const L = WLEN[type] || 12, n = k.trail.length;
        const pt = (s, t) => { const a = rad(s.deg); return [s.hand[0] + Math.cos(a) * t * s.scale, s.hand[1] + Math.sin(a) * t * s.scale]; };
        for (let j = 0; j + 1 < n; j++) {
            const age = 1 - (j + 1) / (n - 1), inner = L * (0.64 + 0.26 * age);
            const q = poly(part(), [pt(k.trail[j], inner), pt(k.trail[j], L + 0.6), pt(k.trail[j + 1], L + 0.6), pt(k.trail[j + 1], inner)], 0, true);
            for (const i of q.keys()) {
                if (grid.role[i]) continue;
                if (age > 0.6 && ((i % W) + ((i / W) | 0)) % 2) continue;
                grid.role[i] = age < 0.34 ? SMEAR : SMEAR2; grid.mat[i] = 'smear';
            }
        }
    }

    /** Draw one frame. Returns the frame's rows of roles ('.' = transparent). */
    function drawFrame(shape, facing, pose) {
        const k = skeleton(facing, pose);
        if (DIAG[facing]) { facing = DIAG[facing][0]; k.turn = TURN; }   // drawn as the front/back view, turned by k.turn
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
            drawHairLying(g, k, hair, hat);
            outline(g);
            return toRows(g);
        }
        const armL = (far) => drawArm(g, k.shL, k.elL, k.haL, outfit, back, { far });
        const armR = (far) => drawArm(g, k.shR, k.elR, k.haR, outfit, back, { far });
        const head = () => { drawHead(g, k, facing); drawHairFront(g, k, hair, facing, hat); drawHat(g, k, hat, facing, 'front'); };
        // Behind everything: what hangs at the back, and a weapon held away from the camera.
        if (back && hasShield && !k.parry) drawShield(g, { ...k, haL: [k.torsoX + k.lean, k.torsoTop + 4.4] }, shield, 'up');
        if (k.weaponBehind) drawWeapon(g, k, weapon);
        if (!back) { drawCape(g, k, outfit, facing); drawHairBack(g, k, hair, facing); }
        drawHat(g, k, hat, facing, 'back');
        if (side) {
            // Far side first: left leg, left arm (with the shield on it).
            drawLeg(g, k.hipL, k.knL, k.ftL, outfit, true, false);
            drawScarf(g, k, outfit, facing);
            if (!k.shieldFront) { armL(true); if (hasShield) drawShield(g, k, shield, facing); }
            drawLeg(g, k.hipR, k.knR, k.ftR, outfit, true, true);
            drawTorso(g, k, outfit, facing);
            if (k.shieldFront) { armL(false); if (hasShield) drawShield(g, k, shield, facing); }
            head();
            drawTrail(g, k, weapon);
            armR(false);
            if (!k.weaponBehind) drawWeapon(g, k, weapon);
            outline(g);
            return toRows(g);
        }
        // Front and back views: the leg nearer the camera over the other; an arm reaching away from the camera goes
        // behind the body, one raised over the head goes over it.
        const legs = [[k.hipR, k.knR, k.ftR, back ? !k.nearR : k.nearR], [k.hipL, k.knL, k.ftL, back ? k.nearR : !k.nearR]].sort((a, b) => a[3] - b[3]);
        for (const [hip, kn, ft, near] of legs) drawLeg(g, hip, kn, ft, outfit, k.turn || false, near || Math.abs(k.ftR[1] - k.ftL[1]) < 1.2);
        const hidden = (d) => (back ? d > 2.6 : d < -2.6), raised = (ha) => ha[1] < k.head[1] + 2;
        if (hidden(k.dL) && !raised(k.haL)) armL(true);
        if (hidden(k.dR) && !raised(k.haR)) armR(true);
        drawTorso(g, k, outfit, facing);
        if (back) {                                                      // seen from behind: cape and hair down the back, arms, then the head
            drawCape(g, k, outfit, facing); drawScarf(g, k, outfit, facing);
            if (!hidden(k.dL) && !raised(k.haL)) armL(false);
            if (!hidden(k.dR) && !raised(k.haR)) armR(false);
            drawHairBack(g, k, hair, facing);
            head();
            if (raised(k.haL)) armL(false);
            if (hasShield && k.parry) drawShield(g, k, shield, 'up');
            drawTrail(g, k, weapon);
            if (raised(k.haR)) armR(false);
            if (!k.weaponBehind) drawWeapon(g, k, weapon);
            outline(g);
            return toRows(g);
        }
        drawScarf(g, k, outfit, facing);
        head();
        if (!hidden(k.dL) || raised(k.haL)) armL(false);
        if (hasShield) drawShield(g, k, shield, facing);
        drawTrail(g, k, weapon);
        if (!hidden(k.dR) || raised(k.haR)) armR(false);
        if (!k.weaponBehind) drawWeapon(g, k, weapon);
        outline(g);
        return toRows(g);
    }
    function drawTorsoLying(g, k, style) {
        const p = part(), ox = CX - 32, oy = FEET - 42.4 + (k.lift || 0);
        const hem = style === 1 || style === 3 ? 6 : 2;
        poly(p, [[23.2, 35.4], [37.6, 36], [37.6 + hem, 36.4], [37.6 + hem, 41.4], [37.6, 41.6], [23.2, 41.8]].map(([x, y]) => [x + ox, y + oy]));
        ellipse(p, 24 + ox, 38.6 + oy, 2, 3.2);
        paint(g, p, 'cloth');
        const belt = part(); rect(belt, Math.round(34 + ox), Math.round(36 + oy), 2, 6); paint(g, belt, style === 3 ? 'accent' : 'leather');
    }
    const drawHairLying = inHead(function drawHairLying(g, k, hair, hat) {
        const [hx, hy] = k.head;
        const p = part();
        ellipse(p, hx - 2.2, hy, 4.2, 5.8 + (hair === 8 ? 1 : 0));
        for (const i of [...p.keys()]) if (un(i)[0] > hx - 0.6) p.delete(i);
        if (hair === 7) return;
        if (hat === 4) { paint(g, p, 'metal'); return; }
        if (hat === 1) { paint(g, p, 'hat'); return; }
        paint(g, p, 'hair');
    });
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
                    if (!rows) rows = MIRROR[facing] ? mirrorRows(sheets[id].frames[`${MIRROR[facing]}.${pose}`]) : drawFrame(shape, facing, pose);
                    return rows;
                }
            });
        }
        return { layer: 'body', frame: FRAME, frames, shape };
    }
    providers.push((id) => (ID.test(id) ? buildSheet(id) : null));

    /** An animation's steps: each frame of a motion, shown until the next one is due. */
    const play = (name, scale = 1) => { const A = ANIMS[name]; return A.at.map((t, i) => ({ pose: `${name}${i + 1}`, ms: Math.round(((i + 1 < A.at.length ? A.at[i + 1] : A.ms) - t) * scale), oy: 0 })); };
    const once = (name, then = 'ready', scale = 1) => ({ once: true, then, steps: play(name, scale) });
    manifest.enso = {
        classes: ['*'],                     // every player class; villagers use it too (ui/world-render.js person())
        frame: FRAME,
        anchor: { x: CX, y: Math.round(FEET + 0.6) },
        animations: {
            // docs/art/PLAYER_STYLE_SHEET.md (v3). Totals the fight depends on are unchanged: swing 350 ms, heavy 720 ms,
            // hurt 250 ms, dodge 250 ms.
            idle: play('idle'), walk: play('walk'), ready: play('ready'), guard: play('guard'),
            stop: once('stop', 'idle'),
            attack: once('slash', 'ready', 1.4), swing: once('slash'), heavy: once('heavy'), thrust: once('thrust'),
            cast: once('cast'),
            hit: once('hit', 'ready', 1.6), hurt: once('hit'),
            dodge: once('dash'),
            death: { once: true, steps: [...play('fall'), { pose: 'down3', ms: 110, oy: 0 }, { pose: 'down4', ms: 1, oy: 0 }] }
        },
        layerOrder: Object.fromEntries(FACINGS.map((f) => [f, ['body']])),
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
    ENSO.ensoPlayer = { drawFrame, skeleton, shapeOf, paletteFor, buildSheet, FACINGS, POSES, ANIMS, FRAME, ramp, MAT };
    if (typeof module !== 'undefined' && module.exports) module.exports = ENSO.ensoPlayer;
})(typeof window !== 'undefined' ? window : globalThis);
