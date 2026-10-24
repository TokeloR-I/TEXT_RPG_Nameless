#!/usr/bin/env node
/* =========================================================================
 * Enso's Last Stand — MANA SEED TILE ATLAS
 * Cuts the pieces listed in ui/tiles-manaseed.js (PARTS) out of the Mana Seed starter pack and writes them, laid
 * out by its layout(), to assets/src/tiles/manaseed.png; `npm run pack` then ships it as 'tiles/manaseed'.
 * Only these pieces go into the repository, never the pack's pictures. Licence: assets/LICENSE-manaseed.txt.
 *
 *   node tools/gen-manaseed-tiles.js [packDir] && npm run pack
 *   packDir defaults to $MANASEED_DIR, then the project files copy of "25.07 - Free Mana Seed RPG Starter Pack".
 * ========================================================================= */
const fs = require('fs');
const path = require('path');
const PNG = require('./lib/png.js');
const { PARTS, layout } = require('../ui/tiles-manaseed.js');

const root = path.join(__dirname, '..');
const pack = path.resolve(process.argv[2] || process.env.MANASEED_DIR || '/mnt/project-files/25.07 - Free Mana Seed RPG Starter Pack');
const SHEETS = { S: 'tilesets/seasonal sample (summer).png', T: 'tilesets/simplified full timber.png', H: 'tilesets/home interiors, timber roof.png', C: 'icons & objects/cozy furnishings sampler.png' };
const OUT = path.join(root, 'assets/src/tiles/manaseed.png');

const src = Object.fromEntries(Object.entries(SHEETS).map(([k, f]) => [k, PNG.decode(fs.readFileSync(path.join(pack, f)))]));
const { at, w, h } = layout();
const out = { w, h, data: Buffer.alloc(w * h * 4) };
for (const [name, [sheet, sx, sy, pw, ph]] of Object.entries(PARTS)) {
    const s = src[sheet], [dx, dy] = at[name];
    for (let y = 0; y < ph; y++) s.data.copy(out.data, ((dy + y) * w + dx) * 4, ((sy + y) * s.w + sx) * 4, ((sy + y) * s.w + sx + pw) * 4);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, PNG.encode(out));
console.log(`Wrote ${path.relative(root, OUT)} (${w}x${h}, ${Object.keys(PARTS).length} pieces). Run npm run pack next.`);
