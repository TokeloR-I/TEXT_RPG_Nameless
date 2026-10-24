/* Generates the PLACEHOLDER player sprite sheets (assets/sprites/player-placeholder.js):
 *   node tools/gen-placeholder-sprites.js
 *
 * These are original, programmer-made test sprites for the GFX-1 pipeline (#106), not final art.
 * They exist so every cosmetic option has a real, distinct sprite while Sable authors the real sheets.
 * The output follows docs/SPRITES.md; replacing a sheet (same id) with an authored one needs no code change.
 *
 * Frames are 24x32, palette-indexed: each character in a row is a palette ROLE, '.' is transparent.
 *   k outline · e eye · s skin · S skin shade · h hair · H hair shade · L hair light
 *   c cloth · C cloth shade · a accent/trim · m metal · M metal shade · p trousers · b boots
 * Right-facing frames are stored as mirrors of the left-facing ones.
 */
const fs = require('fs');
const path = require('path');

const W = 24, H = 32;
const grid = () => Array.from({ length: H }, () => Array(W).fill('.'));
const put = (g, x, y, ch) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; };
const box = (g, x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, ch); };
const ellipse = (g, cx, cy, rx, ry, ch, keep = () => true) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && keep(x, y)) put(g, x, y, ch);
    }
};
/** Draw a 1px outline ('k') around everything filled on this layer. */
function outline(g) {
    const out = g.map((r) => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (g[y][x] !== '.') continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy] || [])[x + dx] && g[y + dy][x + dx] !== '.' && g[y + dy][x + dx] !== 'k')) out[y][x] = 'k';
    }
    return out;
}
const rows = (g) => g.map((r) => r.join(''));
const empty = (g) => g.every((r) => r.every((c) => c === '.'));

// Head geometry shared by every layer (so hair sits on the head whatever the style).
const HEAD = { cx: 12, cy: 9.5, rx: 5, ry: 5.5 };   // occupies about x 7..16, y 4..14
const inHead = (x, y) => { const dx = (x + 0.5 - HEAD.cx) / HEAD.rx, dy = (y + 0.5 - HEAD.cy) / HEAD.ry; return dx * dx + dy * dy <= 1; };

// ---------------------------------------------------------------------------
// Body: head, skin, eyes, arms, trousers, boots. Poses: stand, stepA, stepB.
// ---------------------------------------------------------------------------
/** Arms and legs seen from the front or back. Action poses (GFX-2) move the arms; 'kneel' folds the legs
 *  (the death animation also lowers the whole body with its bob, so every layer stays aligned). */
function frontArmsAndLegs(g, step, pose) {
    const arms = {
        // Action arms reach outside the sleeves and the hair so they read over every outfit and style.
        windup: [[6, 16, 2, 7], [18, 8, 2, 9]],      // weapon arm raised beside the head
        strike: [[6, 16, 2, 7], [18, 17, 2, 9]],     // ...and swung down and out
        cast: [[4, 8, 2, 9], [18, 8, 2, 9]],         // both hands up
        hit: [[3, 15, 2, 6], [19, 15, 2, 6]]         // thrown back
    }[pose] || [[6, 16 - step, 2, 7], [16, 16 + step, 2, 7]];   // arms swing opposite the legs
    for (const a of arms) box(g, ...a, 's');
    if (pose === 'kneel') { box(g, 8, 24, 3, 2, 'p'); box(g, 13, 24, 3, 2, 'p'); box(g, 8, 26, 3, 2, 'b'); box(g, 13, 26, 3, 2, 'b'); return; }
    box(g, 8, 24, 3, 5 - Math.max(0, step), 'p'); box(g, 13, 24, 3, 5 - Math.max(0, -step), 'p');
    box(g, 8, 29 - Math.max(0, step), 3, 2, 'b'); box(g, 13, 29 - Math.max(0, -step), 3, 2, 'b');
}

function body(dir, pose) {
    const g = grid();
    const step = pose === 'stepA' ? 1 : pose === 'stepB' ? -1 : 0;
    ellipse(g, HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, 's');
    if (dir === 'down') {
        box(g, 7, 12, 10, 3, 's'); ellipse(g, HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, 's');
        for (let x = 8; x <= 15; x++) put(g, x, 14, 'S');            // jaw shadow
        put(g, 9, 10, 'e'); put(g, 10, 10, 'e'); put(g, 14, 10, 'e'); put(g, 13, 10, 'e');
        put(g, 11, 12, 'S'); put(g, 12, 12, 'S');
        box(g, 11, 15, 2, 1, 'S');                                     // neck
        box(g, 8, 16, 8, 8, 'p');                                      // undershirt / torso
        frontArmsAndLegs(g, step, pose);
    } else if (dir === 'up') {
        box(g, 11, 15, 2, 1, 'S');
        box(g, 8, 16, 8, 8, 'p');
        frontArmsAndLegs(g, -step, pose);
    } else { // left (right is mirrored)
        for (let y = 6; y <= 13; y++) put(g, 7, y, 's'); put(g, 6, 10, 's');   // nose bump
        put(g, 9, 10, 'e'); put(g, 9, 9, 'e');
        put(g, 8, 12, 'S');
        box(g, 11, 15, 3, 1, 'S');
        box(g, 9, 16, 6, 8, 'p');
        const arm = { windup: [15, 8, 2, 9], strike: [3, 18, 8, 2], cast: [5, 9, 2, 8], hit: [15, 15, 3, 2] }[pose];
        box(g, ...(arm || [11 - step * 2, 17, 2, 6]), 's');            // near arm
        if (pose === 'kneel') { box(g, 9, 24, 5, 2, 'p'); box(g, 12, 26, 3, 2, 'b'); }
        else {
            // legs: one forward, one back when walking
            box(g, 10 - step, 24, 2, 5, 'p'); box(g, 12 + step, 24, 2, 5, 'p');
            box(g, 9 - step, 29, 3, 2, 'b'); box(g, 12 + step, 29, 2, 2, 'b');
        }
    }
    return outline(g);
}

// ---------------------------------------------------------------------------
// Outfits (drawn over the body). Index = cosmetics.outfit. Same shape in every pose.
// ---------------------------------------------------------------------------
const OUTFITS = [
    { id: 'traveler', draw(g, dir) {   // belted tunic with sleeves
        if (dir === 'left') { box(g, 9, 16, 6, 9, 'c'); box(g, 9, 21, 6, 1, 'a'); box(g, 13, 16, 2, 9, 'C'); return; }
        box(g, 7, 16, 10, 9, 'c'); box(g, 6, 16, 2, 4, 'c'); box(g, 16, 16, 2, 4, 'c');
        box(g, 7, 21, 10, 1, 'a'); box(g, 15, 16, 2, 9, 'C');
        if (dir === 'down') { put(g, 11, 16, 'C'); put(g, 12, 17, 'C'); put(g, 11, 18, 'C'); put(g, 12, 21, 'm'); }
    } },
    { id: 'tattered', draw(g, dir) {   // short torn shirt, patches, ragged hem, bare arms
        const x0 = dir === 'left' ? 9 : 8, w = dir === 'left' ? 6 : 8;
        box(g, x0, 16, w, 8, 'c');
        for (let x = x0; x < x0 + w; x++) if (x % 2) put(g, x, 24, 'c'); else put(g, x, 23, 'C');
        if (dir === 'down') { box(g, 9, 18, 2, 2, 'a'); box(g, 13, 20, 2, 2, 'C'); }
        if (dir === 'up') box(g, 12, 17, 2, 3, 'a');
        if (dir === 'left') box(g, 10, 19, 2, 2, 'a');
    } },
    { id: 'armored', draw(g, dir) {    // breastplate, pauldrons, cloth skirt
        if (dir === 'left') { box(g, 9, 16, 6, 6, 'm'); box(g, 10, 15, 4, 2, 'M'); box(g, 9, 22, 6, 3, 'c'); box(g, 13, 16, 2, 6, 'M'); return; }
        box(g, 7, 16, 10, 6, 'm'); box(g, 5, 15, 4, 3, 'M'); box(g, 15, 15, 4, 3, 'M');
        box(g, 7, 22, 10, 3, 'c'); box(g, 7, 22, 10, 1, 'a');
        if (dir === 'down') { box(g, 11, 17, 2, 4, 'M'); }
        if (dir === 'up') { box(g, 8, 18, 8, 1, 'M'); }
    } },
    { id: 'ceremonial', draw(g, dir) { // long robe to the ankles, trim down the front and at the hem
        if (dir === 'left') { box(g, 9, 16, 6, 13, 'c'); box(g, 8, 26, 8, 3, 'c'); box(g, 8, 28, 8, 1, 'a'); box(g, 9, 16, 1, 12, 'a'); return; }
        box(g, 7, 16, 10, 13, 'c'); box(g, 6, 24, 12, 5, 'c'); box(g, 6, 16, 2, 6, 'c'); box(g, 16, 16, 2, 6, 'c');
        box(g, 6, 28, 12, 1, 'a');
        if (dir === 'down') { box(g, 11, 16, 2, 12, 'a'); box(g, 9, 16, 6, 1, 'a'); }
        if (dir === 'up') box(g, 8, 16, 8, 2, 'C');
    } }
];

// ---------------------------------------------------------------------------
// Hairstyles. Index = cosmetics.hairStyle (the order of HAIR_STYLES in ui/world-ui.js).
// Each style has a FRONT layer (over the head) and a BACK layer (behind the body when facing
// down or sideways; drawn over the clothing when facing up, see docs/SPRITES.md).
// ---------------------------------------------------------------------------
/** The cap: hair over the head down to `line`. Sideways it covers the back half of the head down to `sideLine`. */
function cap(g, dir, line, { sideLine = line + 3, wide = 0, ch = 'h' } = {}) {
    if (dir === 'up') { ellipse(g, HEAD.cx, HEAD.cy, HEAD.rx + wide, HEAD.ry + 0.5, ch, (x, y) => y <= line + 5); return; }   // from behind: the nape shows under short cuts
    if (dir === 'down') { ellipse(g, HEAD.cx, HEAD.cy - 0.5, HEAD.rx + 0.5 + wide, HEAD.ry, ch, (x, y) => y <= line); return; }
    ellipse(g, HEAD.cx, HEAD.cy - 0.5, HEAD.rx + 0.5 + wide, HEAD.ry, ch, (x, y) => y <= line || (x >= 11 && y <= sideLine));
}
const shade = (g, ch = 'H') => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === 'h' && (y + 1 >= H || g[y + 1][x] === '.' || x >= 15)) g[y][x] = ch; };
const light = (g, pts) => { for (const [x, y] of pts) if (g[y] && g[y][x] === 'h') g[y][x] = 'L'; };

const STYLES = [
    { id: 'messy_short', front(g, d) {
        cap(g, d, 7);
        for (const [x, y] of [[8, 3], [10, 2], [11, 2], [13, 3], [14, 2], [16, 4], [7, 5]]) put(g, x, y, 'h');
        if (d === 'down') { put(g, 9, 8, 'h'); put(g, 12, 8, 'h'); put(g, 13, 9, 'h'); }
        light(g, [[10, 4], [12, 4]]);
    } },
    { id: 'round_crop', front(g, d) { cap(g, d, 8, { wide: 1, sideLine: 11 }); if (d === 'down') { box(g, 6, 8, 2, 3, 'h'); box(g, 16, 8, 2, 3, 'h'); } light(g, [[9, 5], [10, 4], [11, 4]]); } },
    { id: 'spiky', front(g, d) {
        cap(g, d, 6);
        const tips = d === 'left' ? [[9, 0], [12, 1], [15, 2], [17, 4]] : [[7, 2], [10, 0], [13, 0], [16, 2]];
        for (const [x, y] of tips) for (let j = y; j < 5; j++) { put(g, x, j, 'h'); put(g, x + 1, j + 1, 'h'); }
        light(g, [[10, 2], [13, 2]]);
    } },
    { id: 'straight_fringe', front(g, d) {
        cap(g, d, 9, { sideLine: 12 });
        if (d === 'down') { box(g, 7, 9, 10, 1, 'h'); box(g, 6, 9, 1, 3, 'h'); box(g, 17, 9, 1, 3, 'h'); }
        light(g, [[9, 6], [10, 6], [11, 6]]);
    } },
    { id: 'long_side_strands', front(g, d) {
        cap(g, d, 7);
        if (d === 'down') { box(g, 6, 7, 2, 12, 'h'); box(g, 16, 7, 2, 12, 'h'); }
        if (d === 'left') box(g, 14, 8, 3, 10, 'h');
        if (d === 'up') box(g, 7, 9, 10, 9, 'h');
    }, back(g, d) { if (d !== 'up') box(g, d === 'left' ? 13 : 7, 9, d === 'left' ? 4 : 10, 10, 'H'); } },
    { id: 'swept', front(g, d) {
        cap(g, d, 7);
        if (d === 'down') for (let i = 0; i < 7; i++) { put(g, 7 + i, 6 + Math.floor(i / 2), 'h'); put(g, 8 + i, 6 + Math.floor(i / 2), 'h'); }
        put(g, d === 'left' ? 6 : 17, 4, 'h'); put(g, d === 'left' ? 5 : 18, 3, 'h');
        light(g, [[9, 4], [10, 4], [11, 5]]);
    } },
    { id: 'soft_layers', front(g, d) {
        cap(g, d, 8, { sideLine: 12 });
        if (d === 'down') { for (const x of [7, 9, 11, 13, 15]) put(g, x, 9, 'h'); box(g, 6, 8, 1, 6, 'h'); box(g, 17, 8, 1, 6, 'h'); }
        if (d === 'up') { box(g, 7, 13, 10, 2, 'h'); for (let x = 7; x < 17; x += 2) put(g, x, 15, 'h'); }
    }, back(g, d) {
        if (d === 'up') return;
        const x0 = d === 'left' ? 13 : 6, w = d === 'left' ? 5 : 12;
        box(g, x0, 9, w, 7, 'H'); for (let x = x0; x < x0 + w; x += 2) put(g, x, 16, 'H');
    } },
    { id: 'clean_crop', front(g, d) { cap(g, d, 5, { sideLine: 9, ch: 'H' }); if (d === 'down') { put(g, 7, 7, 'H'); put(g, 16, 7, 'H'); } } },
    { id: 'side_part', front(g, d) {
        cap(g, d, 7);
        if (d === 'down') { for (let y = 4; y <= 6; y++) put(g, 10, y, 'H'); box(g, 11, 7, 6, 2, 'h'); put(g, 16, 9, 'h'); }
        if (d === 'up') for (let y = 4; y <= 8; y++) put(g, 13, y, 'H');
        light(g, [[12, 5], [13, 5]]);
    } },
    { id: 'medium_layers', front(g, d) {
        cap(g, d, 8, { sideLine: 14 });
        if (d === 'down') { box(g, 6, 8, 2, 7, 'h'); box(g, 16, 8, 2, 7, 'h'); put(g, 9, 9, 'h'); put(g, 14, 9, 'h'); }
        if (d === 'up') box(g, 7, 10, 10, 6, 'h');
    }, back(g, d) { if (d !== 'up') box(g, d === 'left' ? 13 : 7, 10, d === 'left' ? 4 : 10, 6, 'H'); } },
    { id: 'braids', front(g, d) {
        cap(g, d, 7);
        if (d === 'down') for (let y = 4; y <= 7; y++) put(g, 12, y, 'H');
        if (d === 'up') { box(g, 8, 13, 2, 11, 'h'); box(g, 14, 13, 2, 11, 'h'); for (const y of [16, 19, 22]) { box(g, 8, y, 2, 1, 'H'); box(g, 14, y, 2, 1, 'H'); } box(g, 8, 24, 2, 1, 'a'); box(g, 14, 24, 2, 1, 'a'); }
        if (d === 'left') { box(g, 14, 10, 2, 12, 'h'); for (const y of [13, 16, 19]) box(g, 14, y, 2, 1, 'H'); box(g, 14, 22, 2, 1, 'a'); }
    }, back(g, d) {
        if (d !== 'down') return;
        for (const x of [5, 17]) { box(g, x, 10, 2, 13, 'h'); for (const y of [13, 16, 19]) box(g, x, y, 2, 1, 'H'); box(g, x, 23, 2, 1, 'a'); }
    } },
    { id: 'high_ponytail', front(g, d) {
        cap(g, d, 7);
        if (d === 'down') { box(g, 10, 1, 4, 3, 'h'); box(g, 11, 3, 2, 1, 'a'); }
        if (d === 'up') { box(g, 10, 1, 4, 3, 'h'); box(g, 11, 4, 2, 1, 'a'); box(g, 11, 5, 3, 13, 'h'); box(g, 12, 17, 2, 2, 'H'); }
        if (d === 'left') { box(g, 13, 2, 3, 3, 'h'); put(g, 14, 5, 'a'); }
    }, back(g, d) {
        if (d === 'down') { box(g, 16, 4, 3, 12, 'H'); box(g, 17, 16, 2, 3, 'H'); }
        if (d === 'left') { box(g, 16, 3, 3, 13, 'H'); box(g, 17, 16, 2, 3, 'H'); }
    } }
];

// ---------------------------------------------------------------------------
// Assemble the sheets
// ---------------------------------------------------------------------------
const DIRS = ['down', 'up', 'left'];
const POSES = ['stand', 'stepA', 'stepB', 'windup', 'strike', 'cast', 'hit', 'kneel'];
const sheets = {};
const mirrorFrames = (frames) => { for (const k of Object.keys(frames)) if (k.startsWith('left')) frames[k.replace('left', 'right')] = { mirror: k }; };

{
    const frames = {};
    for (const d of DIRS) for (const p of POSES) frames[`${d}.${p}`] = rows(body(d, p));
    mirrorFrames(frames);
    sheets['player.body'] = { layer: 'body', placeholder: true, frames };
}
OUTFITS.forEach((o, i) => {
    const frames = {};
    for (const d of DIRS) { const g = grid(); o.draw(g, d); frames[d] = rows(outline(g)); }
    mirrorFrames(frames);
    sheets[`player.outfit.${i}`] = { layer: 'outfit', name: o.id, placeholder: true, frames };
});
STYLES.forEach((s, i) => {
    for (const part of ['front', 'back']) {
        const frames = {};
        for (const d of DIRS) {
            const g = grid();
            if (s[part]) s[part](g, d);
            if (part === 'front') shade(g);
            if (!empty(g)) frames[d] = rows(outline(g));
        }
        mirrorFrames(frames);
        if (Object.keys(frames).length) sheets[`player.hair.${i}.${part}`] = { layer: `hair_${part}`, name: s.id, placeholder: true, frames };
    }
});

const out = `/* GENERATED by tools/gen-placeholder-sprites.js — do not edit by hand; edit the generator and re-run.
 * PLACEHOLDER player sprites for the GFX-1 pipeline (#106). Original programmer art, no external sources,
 * same licence as this repository. Format: docs/SPRITES.md. Replace a sheet by registering an authored
 * one under the same id (assets/sprites/*.js); the renderer prefers non-placeholder sheets. */
(function (global) {
    const ENSO = global.ENSO || (global.ENSO = {});
    const sheets = ${JSON.stringify(sheets, null, 1).replace(/\n\s*/g, '\n        ').replace(/\[\n\s*"/g, '["').replace(/",\n\s*"/g, '",\n         "')};
    for (const [id, sheet] of Object.entries(sheets)) (ENSO.spriteSheets || (ENSO.spriteSheets = {}))[id] = ENSO.spriteSheets[id] && !ENSO.spriteSheets[id].placeholder ? ENSO.spriteSheets[id] : sheet;
    if (typeof module !== 'undefined' && module.exports) module.exports = sheets;
})(typeof window !== 'undefined' ? window : globalThis);
`;
const file = path.join(__dirname, '..', 'assets', 'sprites', 'player-placeholder.js');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, out);
console.log(`Wrote ${path.relative(process.cwd(), file)}: ${Object.keys(sheets).length} sheets, ${(out.length / 1024).toFixed(0)} KB`);
