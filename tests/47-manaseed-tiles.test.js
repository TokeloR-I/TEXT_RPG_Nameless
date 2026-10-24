// Mana Seed tiles (ui/tiles-manaseed.js, tools/gen-manaseed-tiles.js): the packed atlas matches the layout of
// PARTS, and every painter hands back to the old one while the atlas loads.
const { test, assert } = require('./helpers.js');
require('../assets/packed/assets.js');
const PACK = require('../ui/tiles-manaseed.js');

test('Mana Seed tiles: the packed atlas has the size the layout expects', () => {
    const a = globalThis.ENSO.packedAssets[PACK.KEY], L = PACK.layout();
    assert.ok(a && a.type === 'png');
    assert.deepStrictEqual([a.w, a.h], [L.w, L.h]);
    for (const [name, [x, y, w, h]] of Object.entries(L.at)) assert.ok(x + w <= L.w && y + h <= L.h, name);
});

test('Mana Seed tiles: without a loaded atlas every function returns false (renderer falls back)', () => {
    const c = { tx: 0, ty: 0, above: 'grass', below: 'grass', left: 'grass', right: 'grass' };
    for (const fn of [...Object.values(PACK.ground), ...Object.values(PACK.painters), ...Object.values(PACK.overhangs)]) assert.strictEqual(fn(null, 0, 0, 32, c), false);
    assert.strictEqual(PACK.decorPass(null, { tiles: ['T'] }, () => 'tree', 32), false);
});
