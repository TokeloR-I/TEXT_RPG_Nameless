#!/usr/bin/env node
/* Render a map's scene art (ui/scene-art.js) to a PNG for review: base layer with the over layer on top.
 *   node tools/preview-scene.js [mapId=grounds] [out.png] [scale=1] */
const fs = require('fs');
const zone = require('../src/world/zone1.js');
const SCENE = require('../ui/scene-art.js');
const { encode } = require('./lib/png.js');
const [mapId = 'grounds', out = 'scene.png', scaleArg = '1'] = process.argv.slice(2);
const S = Number(scaleArg);
const map = zone.maps[mapId];
const nameAt = (m, x, y) => {
    if (y < 0 || y >= m.tiles.length || x < 0 || x >= m.tiles[0].length) return null;
    const ch = m.tiles[y][x], def = (m.legend && m.legend[ch]) || zone.tileset[ch];
    return def ? def.name : null;
};
const t0 = Date.now();
const p = SCENE.paint(map, nameAt);
const W = p.w * S, H = p.h * S, data = Buffer.alloc(W * H * 4);
for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = (y * p.w + x) * 4, a = p.over[i + 3] / 255;
    const c = [0, 1, 2].map((k) => p.base[i + k] * (1 - a) + p.over[i + k] * a);
    for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) { const o = ((y * S + j) * W + x * S + k) * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255; }
}
fs.writeFileSync(out, encode({ w: W, h: H, data }));
console.log(`wrote ${out} (${W}x${H}) in ${Date.now() - t0} ms`);
