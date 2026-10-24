// UI-2 display fit (ui/display.js, Pixie): whole-pixel scaling when it fits well, fill otherwise,
// and a taller canvas on portrait phones. The browser side only applies these numbers.
const { test, assert } = require('./helpers.js');
const D = require('../ui/display.js');

test('Display: auto picks a whole-number scale on big screens and fills on a laptop', () => {
    const fhd = D.fit(1920, 1080, 'auto');                             // full screen 1080p: ×4, as Keel's rev 2 says
    assert.strictEqual(fhd.scale, 4); assert.ok(fhd.integer);
    assert.deepStrictEqual([fhd.w, fhd.h, fhd.canvasW, fhd.canvasH], [1920, 1080, 480, 270]);
    const qhd = D.fit(2560 - 32, 1440 - 58, 'auto');
    assert.strictEqual(qhd.scale, 5);
    assert.ok(!D.fit(1904, 1050, 'auto').integer, 'a 1080p browser window: ×3 would waste a quarter of it, so auto fills');
    const laptop = D.fit(1280 - 32, 900 - 58, 'auto');                 // 1× would use barely half the space
    assert.ok(!laptop.integer);
    assert.ok(laptop.w > 1100 && laptop.w <= 1248 && laptop.h <= 842);
});

test('Display: pixel mode always uses a whole number (shrinking only below 1×); fill never does on its own', () => {
    const laptop = D.fit(1248, 842, 'pixel');
    assert.strictEqual(laptop.scale, 2); assert.ok(laptop.integer);
    const tiny = D.fit(400, 300, 'pixel');                             // smaller than 1×: shrink to fit
    assert.ok(!tiny.integer); assert.ok(tiny.w <= 400 && tiny.h <= 300);
    const fhd = D.fit(1888, 1022, 'fill');
    assert.ok(!fhd.integer); assert.ok(fhd.scale > 2.2);
});

test('Display: the stage always keeps the canvas shape outside portrait, and never exceeds the space', () => {
    for (const [w, h] of [[1248, 842], [1888, 1022], [2528, 1382], [1334, 710], [800, 600]]) {
        for (const mode of D.MODES) {
            const f = D.fit(w, h, mode);
            assert.ok(f.w <= w && f.h <= h, `${w}x${h} ${mode} fits`);
            assert.ok(!f.tall);
            assert.ok(Math.abs(f.w / f.h - 480 / 270) < 0.01, `${w}x${h} ${mode} keeps the shape`);
        }
    }
});

test('Display: a portrait phone gets a full-width stage and a taller, 18-tile-wide canvas', () => {
    const f = D.fit(358, 640, 'auto');
    assert.ok(f.tall);
    assert.strictEqual(f.canvasW, D.PORTRAIT_W);
    assert.strictEqual(f.canvasW / 16, 18);
    assert.ok(f.canvasH > 270 && f.canvasH % 2 === 0);
    assert.ok(f.w <= 358 && f.h <= 640);
    assert.ok(!D.fit(700, 500, 'auto').tall, 'landscape stays the normal layout');
});

test('Display: the setting cycles auto -> pixel -> fill -> auto, and each mode has a label and help text', () => {
    assert.strictEqual(D.nextMode('auto'), 'pixel');
    assert.strictEqual(D.nextMode('pixel'), 'fill');
    assert.strictEqual(D.nextMode('fill'), 'auto');
    for (const m of D.MODES) { assert.ok(D.LABELS[m]); assert.ok(D.HELP[m]); }
});
