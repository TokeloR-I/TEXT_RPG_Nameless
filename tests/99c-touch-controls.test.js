// Touch controls (ui/touch-controls.js, Tokelo 2026-11-13): an 8-way joystick, and a landscape stage for phones (ui/display.js).
const { test, assert } = require('./helpers.js');
const T = require('../ui/touch-controls.js');
const D = require('../ui/display.js');
const HUD = require('../ui/action-hud.js');

test('Touch stick: straight pushes hold one arrow key, diagonals hold two (all eight directions)', () => {
    const r = 50;
    const cases = [
        [[40, 0], ['ArrowRight']], [[30, 30], ['ArrowDown', 'ArrowRight']], [[0, 40], ['ArrowDown']], [[-30, 30], ['ArrowDown', 'ArrowLeft']],
        [[-40, 0], ['ArrowLeft']], [[-30, -30], ['ArrowUp', 'ArrowLeft']], [[0, -40], ['ArrowUp']], [[30, -30], ['ArrowUp', 'ArrowRight']]
    ];
    for (const [[dx, dy], keys] of cases) assert.deepStrictEqual(T.stickKeys(dx, dy, r).sort(), keys.slice().sort(), `${dx},${dy}`);
});

test('Touch stick: a small push is dead zone, and a mostly-straight push stays straight', () => {
    assert.deepStrictEqual(T.stickKeys(5, 5, 50), []);
    assert.deepStrictEqual(T.stickKeys(0, 0, 50), []);
    assert.deepStrictEqual(T.stickKeys(40, 10, 50), ['ArrowRight']);    // 14° off east: still east
    assert.deepStrictEqual(T.stickKeys(40, 25, 50).sort(), ['ArrowDown', 'ArrowRight']);   // 32°: south-east
});

test('Touch skill buttons use the same keys as the HUD skill bar', () => {
    assert.deepStrictEqual(T.SLOT_KEYS, HUD.SLOT_KEYS);
    T.SLOT_KEYS.forEach((k, i) => assert.strictEqual(HUD.slotForKey({ key: k }), i));
    assert.strictEqual(HUD.slotForKey({ key: '1' }), 'basic');
});

test('Display: a landscape phone fills the screen height with a wider canvas (never past ~21:9)', () => {
    const f = D.fit(844, 390, 'auto', D.BASE, { wide: true });
    assert.ok(f.wide && !f.tall);
    assert.strictEqual(f.canvasH, 270);
    assert.strictEqual(f.h, 390);
    assert.ok(f.canvasW > 480 && f.canvasW % 2 === 0 && f.w <= 844 && f.w > 800, JSON.stringify(f));
    const ultra = D.fit(2400, 600, 'auto', D.BASE, { wide: true });
    assert.ok(ultra.canvasW / ultra.canvasH <= D.WIDE_MAX + 0.01);
    const normal = D.fit(844, 390, 'auto');
    assert.ok(!normal.wide && normal.canvasW === 480, 'desktop and portrait fits are unchanged');
});
