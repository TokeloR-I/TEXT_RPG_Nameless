// HD-2D pipeline (ui/postfx.js, ui/tiles-hd.js): pure parts. The WebGL compositor itself is checked in the
// browser (docs/captures/hd2d); here, grading, colours, the quality switch and the HD tile set.
const { test, assert } = require('./helpers.js');
const PF = require('../ui/postfx.js');
const HD = require('../ui/tiles-hd.js');
const ZONE1 = require('../src/world/zone1.js');

test('HD-2D: dark places grade darker and bloom more; maps can override any grade field', () => {
    const day = PF.gradeFor({}), cellar = PF.gradeFor({ darkness: 0.72 });
    assert.strictEqual(day.ambient, 1);
    assert.ok(cellar.ambient < 0.7 && cellar.bloom > day.bloom);
    assert.strictEqual(PF.gradeFor({ grade: { ambient: 0.78 } }).ambient, 0.78);
});

test('HD-2D: light colours parse from hex, rgb() and rgba() map data', () => {
    assert.deepStrictEqual(PF.parseColour('#ff0000'), [1, 0, 0]);
    assert.deepStrictEqual(PF.parseColour('rgba(255, 0, 255, 0.3)'), [1, 0, 1]);
    assert.deepStrictEqual(PF.parseColour([0.5, 0.5, 0.5]), [0.5, 0.5, 0.5]);
});

test('HD-2D: without a browser there is no WebGL, so the compositor steps aside (plain canvas)', () => {
    assert.strictEqual(PF.create({}), null);
    assert.strictEqual(PF.quality(), 'high');
});

test('HD-2D: every tile in the world has a painter, and every HD light tile exists in the world', () => {
    const names = new Set();
    for (const map of Object.values(ZONE1.maps)) for (const row of map.tiles) for (const ch of row) {
        const def = (map.legend && map.legend[ch]) || ZONE1.tileset[ch];
        if (def) names.add(def.name);
    }
    assert.ok(names.has('lantern'), 'lanterns are placed');
    for (const n of Object.keys(HD.lights)) assert.ok(names.has(n), `${n} is used`);
    for (const n of Object.keys(HD.TALL)) assert.ok(names.has(n), `${n} is used`);
});
