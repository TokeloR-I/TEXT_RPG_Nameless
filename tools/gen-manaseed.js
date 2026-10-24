#!/usr/bin/env node
/* =========================================================================
 * Enso's Last Stand — MANA SEED PLAYER CHARACTER
 * Builds assets/sprites/manaseed.js from the Mana Seed Character Base (Seliel the Shaper; used with the artist's
 * written permission, see assets/LICENSE-manaseed.txt). The pack itself is not in the repository.
 *
 *   node tools/gen-manaseed.js [packDir]
 *   packDir defaults to $MANASEED_DIR, then the project files copy of "25.07 - Free Mana Seed RPG Starter Pack".
 *
 * The pack is a paper doll: every layer (body, outfit, hair, hat, weapon, shield) has the same 512x512 pages of
 * 64x64 frames. Only the frames the game plays are kept, packed into one 512x640 atlas per layer, so every layer
 * shares one frame table. Weapons and shields switch between behind and in front of the body frame by frame; the
 * pack's layer-order guide images are compared with the sprites to find which, and each gear sheet is registered
 * as several sheets (behind, in front; shields also below or above the weapon) holding only their frames.
 * Edit this file and re-run; never edit the output.
 * ========================================================================= */
const fs = require('fs');
const path = require('path');
const PNG = require('./lib/png.js');

const root = path.join(__dirname, '..');
const pack = path.resolve(process.argv[2] || process.env.MANASEED_DIR || '/mnt/project-files/25.07 - Free Mana Seed RPG Starter Pack');
const base = path.join(pack, 'character_base');
const OUT = path.join(root, 'assets/sprites/manaseed.js');
const F = 64, COLS = 8;
const FACINGS = ['down', 'up', 'right', 'left'];          // page rows 0-3 (and 4-7 for walking) in this order

// ---------------------------------------------------------------------
// The frames the game uses: [pose, page, col, rowOffset] per facing (row = rowOffset + facing row).
// ---------------------------------------------------------------------
const POSES = [
    ['stand', 'p1', 0, 0],
    ...[0, 1, 2, 3, 4, 5].map((c) => [`walk${c + 1}`, 'p1', c, 4]),
    ...[0, 1, 2, 3].map((c) => [`ready${c + 1}`, 'pONE2', c, 0]),       // combat idle
    ...[0, 1, 2, 3].map((c) => [`slash${c + 1}`, 'pONE3', c, 0]),
    ['parry', 'pONE1', 3, 0],
    ['hit', 'pONE1', 5, 0], ['down2', 'pONE1', 6, 0], ['down3', 'pONE1', 7, 0]
];
const CELLS = [];                                          // { key, page, col, row }
for (const [pose, page, col, off] of POSES) FACINGS.forEach((f, r) => CELLS.push({ key: `${f}.${pose}`, page, col, row: off + r }));
const ROWS = Math.ceil(CELLS.length / COLS);

// ---------------------------------------------------------------------
// What the player can choose. Index = the cosmetics value saved with the game.
// ---------------------------------------------------------------------
const SKINS = [['Ash', 'v08'], ['Ember', 'v06'], ['Umber', 'v10'], ['Pale', 'v01']];             // = story appearances
const HAIR_STYLES = [['Bob', 'bob1'], ['Top Knot', 'dap1']];
const HAIR_COLOURS = ['Slate', 'Silver', 'Ash', 'Gold', 'Rose', 'Copper', 'Blossom', 'Violet', 'Teal', 'Azure', 'Grey', 'Chestnut', 'Magenta', 'Midnight'];
const OUTFITS = [
    ['Forester · Crimson', 'fstr_v01'], ['Forester · Plum', 'fstr_v02'], ['Forester · Moss', 'fstr_v03'], ['Forester · Amber', 'fstr_v04'], ['Forester · Pine', 'fstr_v05'],
    ['Farmer · Indigo', 'pfpn_v01'], ['Farmer · Rust', 'pfpn_v02'], ['Farmer · Dusk', 'pfpn_v03'], ['Farmer · Teal', 'pfpn_v04'], ['Farmer · Linen', 'pfpn_v05']
];
const METALS = ['Iron', 'Amethyst', 'Bronze', 'Frost', 'Gold'];
const HATS = [['None', null], ...['Rose', 'Cream', 'Grey', 'Brown', 'Sage'].map((c, i) => [`Hood · ${c}`, `pfht_v0${i + 1}`]),
    ...['Blue', 'Brown', 'Green', 'Violet', 'Yellow'].map((c, i) => [`Pointed Hat · ${c}`, `pnty_v0${i + 1}`])];
const WEAPONS = [['Sword', 'sw01'], ['Axe', 'ax01'], ['Mace', 'mc01']].flatMap(([n, id]) => METALS.map((m, i) => [`${m} ${n}`, `${id}_v0${i + 1}`]));
const SHIELDS = [['None', null], ...[['Round Shield', 'sh01'], ['Kite Shield', 'sh02'], ['Crystal Shield', 'sh03']].flatMap(([n, id]) => METALS.map((m, i) => [`${m} ${n}`, `${id}_v0${i + 1}`]))];

// ---------------------------------------------------------------------
const pages = new Map();
function page(file) {
    if (!pages.has(file)) pages.set(file, fs.existsSync(file) ? PNG.decode(fs.readFileSync(file)) : null);
    return pages.get(file);
}
const layerFile = (pg, layer, id) => path.join(base, `char_a_${pg}`, layer ? `${layer}` : '', `char_a_${pg}_${layer || '0bas'}_${id}.png`);
const px = (img, x, y) => (img ? img.data.readUInt32BE((y * img.w + x) * 4) : 0);
const alpha = (img, x, y) => (img ? img.data[(y * img.w + x) * 4 + 3] : 0);

/** One layer's atlas: the used frames of each page, in CELLS order. Returns null if the layer has no pixels. */
function atlas(layer, id) {
    const out = { w: COLS * F, h: ROWS * F, data: Buffer.alloc(COLS * F * ROWS * F * 4) };
    let any = false;
    CELLS.forEach((c, i) => {
        const src = page(layerFile(c.page, layer, id));
        if (!src) return;
        const dx = (i % COLS) * F, dy = Math.floor(i / COLS) * F;
        for (let y = 0; y < F; y++) {
            const s = ((c.row * F + y) * src.w + c.col * F) * 4;
            src.data.copy(out.data, ((dy + y) * out.w + dx) * 4, s, s + F * 4);
        }
        any = true;
    });
    return any ? out : null;
}
const uri = (img) => `data:image/png;base64,${PNG.encode(img).toString('base64')}`;

/** Average colour of a layer's visible pixels in the standing frame (creator swatches). */
function swatch(img) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
        const o = (y * img.w + x) * 4;
        if (img.data[o + 3] < 200) continue;
        const l = img.data[o] + img.data[o + 1] + img.data[o + 2];
        if (l < 120 || l > 700) continue;                  // skip outline and glints
        r += img.data[o]; g += img.data[o + 1]; b += img.data[o + 2]; n++;
    }
    const h = (v) => Math.round(v / Math.max(1, n)).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

// ---------------------------------------------------------------------
// Gear layer order, read from the guides: for each frame, is the sword / shield in front of the body, and is the
// sword above the shield? Where sprites overlap, the guide shows whose pixel wins; elsewhere its background says
// (red = in front, blue = behind) and the order doesn't show.
// ---------------------------------------------------------------------
function gearOrder() {
    const order = {};
    for (const c of CELLS) {
        if (!c.page.startsWith('pONE')) continue;
        const n = c.page.slice(4);
        const guide = page(path.join(base, 'guides', `layer order, page ONE-hand ${n} (sword).png`));
        const gShield = page(path.join(base, 'guides', `layer order, page ONE-hand ${n} (shield).png`));
        const body = page(layerFile(c.page, null, 'humn_v01'));
        const sword = page(layerFile(c.page, '6tla', 'sw01_v01')), shield = page(layerFile(c.page, '7tlb', 'sh01_v01'));
        const votes = { sword: 0, shield: 0, swordOver: 0 };
        for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
            const X = c.col * F + x, Y = c.row * F + y, G = px(guide, X, Y);
            const S = alpha(sword, X, Y) > 0, H = alpha(shield, X, Y) > 0, B = alpha(body, X, Y) > 0;
            if (S && B) votes.sword += G === px(sword, X, Y) ? 1 : G === px(body, X, Y) ? -1 : 0;
            if (H && B) votes.shield += G === px(shield, X, Y) ? 1 : G === px(body, X, Y) ? -1 : 0;
            if (S && H) votes.swordOver += G === px(sword, X, Y) ? 1 : G === px(shield, X, Y) ? -1 : 0;
        }
        const bg = (img) => { const v = px(img, c.col * F + 1, c.row * F + 1); return ((v >>> 24) & 255) > ((v >>> 8) & 255); };   // red > blue
        const swordFront = votes.sword ? votes.sword > 0 : bg(guide);
        const shieldFront = votes.shield ? votes.shield > 0 : bg(gShield);
        order[c.key] = { swordFront, shieldFront, swordOver: votes.swordOver >= 0 };
    }
    return order;
}

// ---------------------------------------------------------------------
if (!fs.existsSync(base)) { console.error(`gen-manaseed: no character_base folder in ${pack}`); process.exit(1); }
const frames = Object.fromEntries(CELLS.map((c, i) => [c.key, i]));
const order = gearOrder();
const pick = (pred) => Object.fromEntries(CELLS.map((c, i) => [c.key, i]).filter(([k]) => order[k] && pred(order[k])));
const GEAR_FRAMES = {
    weaponBack: pick((o) => !o.swordFront), weaponFront: pick((o) => o.swordFront),
    shieldBackLow: pick((o) => !o.shieldFront && o.swordOver), shieldBackHigh: pick((o) => !o.shieldFront && !o.swordOver),
    shieldFrontLow: pick((o) => o.shieldFront && o.swordOver), shieldFrontHigh: pick((o) => o.shieldFront && !o.swordOver)
};

const images = [];                                         // [sheetId, uri]
const add = (id, img) => { if (!img) throw new Error(`gen-manaseed: no pixels for ${id}`); images.push([id, uri(img)]); return img; };
const options = { skins: [], hairStyles: HAIR_STYLES.map(([n]) => n), hairColours: [], outfits: OUTFITS.map(([n]) => n), hats: HATS.map(([n]) => n), weapons: WEAPONS.map(([n]) => n), shields: SHIELDS.map(([n]) => n) };
SKINS.forEach(([name, v], i) => options.skins.push({ name, swatch: swatch(add(`ms.body.${i}`, atlas(null, `humn_${v}`))) }));
options.outfitSwatches = OUTFITS.map(([, id], i) => swatch(add(`ms.outfit.${i}`, atlas('1out', id))));   // villagers pick by colour
HAIR_STYLES.forEach(([, style], s) => HAIR_COLOURS.forEach((name, c) => {
    const img = add(`ms.hair.${s}.${c}`, atlas('4har', `${style}_v${String(c).padStart(2, '0')}`));
    if (s === 0) options.hairColours.push({ name, swatch: swatch(img) });
}));
options.hatSwatches = HATS.map(([, id], i) => (id ? swatch(add(`ms.hat.${i}`, atlas('5hat', id))) : null));
WEAPONS.forEach(([, id], i) => add(`ms.weapon.${i}`, atlas('6tla', id)));
SHIELDS.forEach(([, id], i) => { if (id) add(`ms.shield.${i}`, atlas('7tlb', id)); });

const js = (v) => JSON.stringify(v);
const lines = [
    `/* GENERATED by tools/gen-manaseed.js from the Mana Seed Character Base by Seliel the Shaper. Do not edit.`,
    ` * Used with the artist's written permission (assets/LICENSE-manaseed.txt): never use this art as input for AI image generation.`,
    ` * The player character: a paper doll of 64x64 frames, ${CELLS.length} frames per layer. See docs/SPRITES.md. */`,
    '(function (global) {',
    '    const ENSO = global.ENSO || (global.ENSO = {});',
    '    const sheets = ENSO.spriteSheets || (ENSO.spriteSheets = {});',
    '    const manifest = ENSO.spriteManifest || (ENSO.spriteManifest = {});',
    `    const FRAMES = ${js(frames)};`,
    `    const GEAR = ${js(GEAR_FRAMES)};`,
    `    const GRID = { cols: ${COLS} }, FRAME = { w: ${F}, h: ${F} };`,
    `    const steps = (poses, ms) => poses.map((pose, i) => ({ pose, ms: Array.isArray(ms) ? ms[i] : ms, oy: 0 }));`,
    '    manifest.manaseed = {',
    "        classes: ['*'],                       // every player class; villagers keep manifest.player",
    '        frame: FRAME,',
    `        anchor: { x: 32, y: 43 },`,
    '        animations: {',
    "            idle: steps(['stand'], 1000),",
    "            walk: steps(['walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6'], 135),",
    "            ready: steps(['ready1', 'ready2', 'ready3', 'ready4'], 200),           // weapon drawn (battle)",
    "            attack: { once: true, then: 'ready', steps: steps(['slash1', 'slash2', 'slash3', 'slash4'], [160, 65, 65, 200]) },",
    "            cast: { once: true, then: 'ready', steps: steps(['parry', 'parry'], [160, 380]) },",
    "            hit: { once: true, then: 'ready', steps: steps(['hit', 'ready1'], [300, 100]) },",
    "            death: { once: true, steps: steps(['hit', 'down2', 'down3'], [160, 220, 1]) }",
    '        },',
    "        layerOrder: Object.fromEntries(['down', 'up', 'left', 'right'].map((f) => [f, ['shieldBackLow', 'weaponBack', 'shieldBackHigh', 'body', 'outfit', 'hair', 'hat', 'shieldFrontLow', 'weaponFront', 'shieldFrontHigh']])),",
    '        layers: {',
    "            body: 'ms.body.{appearance}', outfit: 'ms.outfit.{outfit}', hair: 'ms.hair.{hairStyle}.{hairColor}',",
    "            hat: { sheet: 'ms.hat.{hat}', optional: true },",
    "            weaponBack: { sheet: 'ms.weapon.{weapon}.weaponBack', optional: true }, weaponFront: { sheet: 'ms.weapon.{weapon}.weaponFront', optional: true },",
    "            shieldBackLow: { sheet: 'ms.shield.{shield}.shieldBackLow', optional: true }, shieldBackHigh: { sheet: 'ms.shield.{shield}.shieldBackHigh', optional: true },",
    "            shieldFrontLow: { sheet: 'ms.shield.{shield}.shieldFrontLow', optional: true }, shieldFrontHigh: { sheet: 'ms.shield.{shield}.shieldFrontHigh', optional: true }",
    '        },',
    "        fallbacks: { body: 'ms.body.0', outfit: 'ms.outfit.0', hair: 'ms.hair.0.0' },",
    `        options: ${js(options)}`,
    '    };',
    `    const blank = Array(${F}).fill('.'.repeat(${F}));`,
    "    sheets['ms.loading'] = { layer: 'body', frame: FRAME, frames: { down: blank, up: { mirror: 'down' }, left: { mirror: 'down' }, right: { mirror: 'down' } } };",
    '    const image = (id, layer, src, frames) => { if (Object.keys(frames).length) sheets[id] = { layer, frame: FRAME, src, grid: GRID, frames, fallback: \'ms.loading\' }; };   // a gear part with no frames is left out',
    '    const SRC = {',
    ...images.map(([id, u]) => `        ${js(id)}: '${u}',`),
    '    };',
    '    for (const [id, src] of Object.entries(SRC)) {',
    "        const kind = id.split('.')[1];",
    "        if (kind === 'weapon') for (const part of ['weaponBack', 'weaponFront']) image(`${id}.${part}`, part, src, GEAR[part]);",
    "        else if (kind === 'shield') for (const part of ['shieldBackLow', 'shieldBackHigh', 'shieldFrontLow', 'shieldFrontHigh']) image(`${id}.${part}`, part, src, GEAR[part]);",
    '        else image(id, kind, src, FRAMES);',
    '    }',
    "    if (typeof module !== 'undefined' && module.exports) module.exports = sheets;",
    "})(typeof window !== 'undefined' ? window : globalThis);",
    ''
];
fs.writeFileSync(OUT, lines.join('\n'));
const swapped = Object.values(order).filter((o) => o.swordFront).length;
console.log(`Wrote ${path.relative(root, OUT)}: ${images.length} layers, ${CELLS.length} frames each, ${Math.round(fs.statSync(OUT).size / 1024)} KB (sword in front on ${swapped} combat frames)`);
