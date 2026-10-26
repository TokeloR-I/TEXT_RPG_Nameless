#!/usr/bin/env node
/* Contact sheet of the ENSO player (assets/sprites/enso-player.js) as a PNG, for art review.
 *   node tools/preview-enso-player.js out.png [scale=3] [json cosmetics] [appearance] [poses,comma,separated]
 * Rows: facings; columns: the 19 poses. */
const fs = require('fs');
const P = require('../assets/sprites/enso-player.js');
const { encode } = require('./lib/png.js');
const out = process.argv[2] || 'enso-player.png', S = Number(process.argv[3] || 3);
const cos = JSON.parse(process.argv[4] || '{}'), appearance = Number(process.argv[5] || 0);
const POSES = process.argv[6] ? process.argv[6].split(',') : P.POSES;
const pal = P.paletteFor({ appearance, cosmetics: cos });
const shape = P.shapeOf(cos);
const facings = ['down', 'up', 'right', 'left'];
const W = 64 * POSES.length * S, H = 64 * facings.length * S;
const data = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { const x = (i % W) / S, y = Math.floor(i / W) / S; const c = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2) ? 0x5a : 0x66; data[i * 4] = c; data[i * 4 + 1] = c + 6; data[i * 4 + 2] = c - 4; data[i * 4 + 3] = 255; }
facings.forEach((f, fy) => POSES.forEach((pose, px) => {
    let rows = P.drawFrame(shape, f === 'left' ? 'right' : f, pose);
    if (f === 'left') rows = rows.map((r) => [...r].reverse().join(''));
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        const hex = pal[ch]; if (!hex) throw new Error('no colour for ' + ch);
        const n = parseInt(hex.slice(1), 16);
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const o = (((fy * 64 + y) * S + j) * W + (px * 64 + x) * S + i) * 4; data[o] = n >> 16; data[o + 1] = (n >> 8) & 255; data[o + 2] = n & 255; }
    }));
}));
fs.writeFileSync(out, encode({ w: W, h: H, data }));
console.log(`wrote ${out} (${W}x${H})`);
