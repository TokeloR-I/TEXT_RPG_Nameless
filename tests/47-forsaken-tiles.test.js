// Outdoor tiles from the Forsaken Pixels pack (ui/tiles-forsaken.js): packed sheet present, sprite boxes inside it,
// and every painter hands back to the old one while the sheet loads.
const { test, assert } = require('./helpers.js');
require('../assets/packed/assets.js');
const PACK = require('../ui/tiles-forsaken.js');

test('Forsaken tiles: the sheet is packed at 160x272', () => {
    const a = globalThis.ENSO.packedAssets[PACK.KEY];
    assert.ok(a && a.type === 'png');
    assert.deepStrictEqual([a.w, a.h], [160, 272]);
});

test('Forsaken tiles: without a loaded sheet every function returns false (renderer falls back)', () => {
    const c = { tx: 0, ty: 0, above: 'dirt_path', below: null, left: null, right: null };
    for (const fn of [...Object.values(PACK.ground), ...Object.values(PACK.painters), ...Object.values(PACK.overhangs)]) assert.strictEqual(fn(null, 0, 0, 32, c), false);
    assert.strictEqual(PACK.decorPass(null, { tiles: ['T'] }, () => 'tree', 32), false);
});
