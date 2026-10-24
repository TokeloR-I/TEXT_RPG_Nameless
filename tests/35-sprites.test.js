// GFX-1 (#106): the layered player sprite pipeline (ui/sprites.js, docs/SPRITES.md). Composition is pure,
// so it is checked here pixel for pixel; the canvas side only caches and draws these composites.
const { test, assert } = require('./helpers.js');
const SPRITES = require('../ui/sprites.js');
const SHEETS = require('../assets/sprites/player-placeholder.js');
const fs = require('fs');
const path = require('path');

const HAIR_STYLES = 12, HAIR_COLOURS = 4, OUTFITS = 4, SKINS = 4;
const pixels = (opts) => Buffer.from(SPRITES.composite(opts).data).toString('base64');
const mask = (opts) => { const d = SPRITES.composite(opts).data; let m = ''; for (let i = 3; i < d.length; i += 4) m += d[i] ? '1' : '0'; return m; };

test('Sprites: every registered sheet is valid (frame size, rows, palette roles, mirrors)', () => {
    assert.deepStrictEqual(SPRITES.validateSheets(), []);
});

test('Sprites: all 12 hairstyles have their own sheet and look different in every facing (and a different outline facing the camera)', () => {
    for (let h = 0; h < HAIR_STYLES; h++) assert.ok(SHEETS[`player.hair.${h}.front`], `hair ${h} has a front sheet`);
    for (const facing of SPRITES.FACINGS) {
        const shapes = new Map();
        for (let h = 0; h < HAIR_STYLES; h++) {
            const { layers } = SPRITES.characterLayers({ cosmetics: { hairStyle: h }, facing });
            assert.ok(!layers.some((l) => l.fallback), `hair ${h} ${facing}: no fallback`);
            // Facing the camera every cut has its own outline; from the side and behind some short cuts differ
            // only inside the head's outline (where the hairline stops), so those compare pixels.
            const m = facing === 'down' ? mask({ cosmetics: { hairStyle: h }, facing }) : pixels({ cosmetics: { hairStyle: h }, facing });
            assert.ok(!shapes.has(m), `hair ${h} ${facing} looks the same as hair ${shapes.get(m)}`);
            shapes.set(m, h);
        }
    }
});

test('Sprites: skin, hair colour and outfit each change the picture; the same choices always give the same picture', () => {
    const base = { appearance: 0, cosmetics: { hairStyle: 0, hairColor: 0, outfit: 0 }, className: 'warrior', facing: 'down' };
    const seen = new Set([pixels(base)]);
    for (let i = 1; i < SKINS; i++) seen.add(pixels({ ...base, appearance: i }));
    for (let i = 1; i < HAIR_COLOURS; i++) seen.add(pixels({ ...base, cosmetics: { ...base.cosmetics, hairColor: i } }));
    for (let i = 1; i < OUTFITS; i++) seen.add(pixels({ ...base, cosmetics: { ...base.cosmetics, outfit: i } }));
    assert.strictEqual(seen.size, 1 + (SKINS - 1) + (HAIR_COLOURS - 1) + (OUTFITS - 1), 'every option is visibly different');
    for (let o = 1; o < OUTFITS; o++) assert.notStrictEqual(mask({ ...base, cosmetics: { outfit: o } }), mask(base), `outfit ${o} has its own shape`);
    assert.strictEqual(pixels(base), pixels(JSON.parse(JSON.stringify(base))), 'deterministic');
});

test('Sprites: layer order is body, then clothes, then front hair; rear hair goes behind facing down and over the back facing up', () => {
    const order = (facing) => SPRITES.characterLayers({ cosmetics: { hairStyle: 4 }, facing }).layers.map((l) => l.layer);
    assert.deepStrictEqual(order('down'), ['hairBack', 'body', 'outfit', 'hairFront']);
    assert.deepStrictEqual(order('left'), ['hairBack', 'body', 'outfit', 'hairFront']);
    // Long Side Strands has no separate rear layer facing up (it's all on the front sheet).
    assert.deepStrictEqual(order('up'), ['body', 'outfit', 'hairFront']);
    const pony = SPRITES.characterLayers({ cosmetics: { hairStyle: 11 }, facing: 'down' }).layers.map((l) => l.layer);
    assert.deepStrictEqual(pony, ['hairBack', 'body', 'outfit', 'hairFront']);
    const crop = SPRITES.characterLayers({ cosmetics: { hairStyle: 7 }, facing: 'down' }).layers.map((l) => l.layer);
    assert.deepStrictEqual(crop, ['body', 'outfit', 'hairFront'], 'a short style simply has no rear hair');
});

test('Sprites: idle and walk animate in all four facings with the manifest timings; right is the mirror of left', () => {
    const P = SPRITES.manifest.player;
    for (const anim of ['idle', 'walk']) {
        let t = 0;
        for (const step of P.animations[anim]) {
            assert.deepStrictEqual(SPRITES.animationStep(P, anim, t), step);
            assert.deepStrictEqual(SPRITES.animationStep(P, anim, t + step.ms - 1), step);
            t += step.ms;
        }
        assert.deepStrictEqual(SPRITES.animationStep(P, anim, t), P.animations[anim][0], 'loops');
    }
    for (const facing of SPRITES.FACINGS) {
        const frames = new Set(P.animations.walk.map((s, i) => pixels({ facing, anim: 'walk', time: P.animations.walk.slice(0, i).reduce((a, x) => a + x.ms, 0) })));
        assert.ok(frames.size >= 2, `walking ${facing} moves the legs`);
    }
    const flip = (opts) => { const { w, h, data } = SPRITES.composite(opts); const out = Buffer.alloc(data.length); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) Buffer.from(data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)).copy(out, (y * w + (w - 1 - x)) * 4); return out.toString('base64'); };
    for (let h = 0; h < HAIR_STYLES; h++) assert.strictEqual(flip({ cosmetics: { hairStyle: h }, facing: 'left' }), pixels({ cosmetics: { hairStyle: h }, facing: 'right' }));
});

test('Sprites: a missing sheet falls back to a real one (never blank) and is reported once', () => {
    const { layers } = SPRITES.characterLayers({ cosmetics: { hairStyle: 99, outfit: 42 }, facing: 'down' });
    const front = layers.find((l) => l.layer === 'hairFront'), outfit = layers.find((l) => l.layer === 'outfit');
    assert.ok(front.fallback && front.sheetId === 'player.hair.0.front');
    assert.ok(outfit.fallback && outfit.sheetId === 'player.outfit.0');
    assert.ok(SPRITES.missing.has('player.hair.99.front') && SPRITES.missing.has('player.outfit.42'));
    assert.ok(mask({ cosmetics: { hairStyle: 99 } }).includes('1'));
});

test('Sprites: an image sheet stands in as its fallback until its picture has loaded (no DOM here, so never)', () => {
    const id = 'player.hair.3.front';
    const placeholder = SPRITES.sheets[id];
    SPRITES.sheets['test.authored'] = { layer: 'hair_front', src: 'assets/sprites/none.png', grid: { cols: 4 }, frames: { down: 0, up: 1, left: 2, right: { mirror: 'left' } }, fallback: id };
    try {
        assert.deepStrictEqual(SPRITES.validateSheets(), []);
        const saved = SPRITES.manifest.player.layers.hairFront;
        SPRITES.manifest.player.layers.hairFront = 'test.authored';
        try {
            const l = SPRITES.characterLayers({ facing: 'down' }).layers.find((x) => x.layer === 'hairFront');
            assert.strictEqual(l.sheetId, id, 'drawn with the placeholder');
            assert.ok(l.fallback);
        } finally { SPRITES.manifest.player.layers.hairFront = saved; }
        delete SPRITES.sheets['test.authored'].fallback;
        assert.ok(SPRITES.validateSheets().some((e) => /needs a fallback/.test(e)));
    } finally { delete SPRITES.sheets['test.authored']; }
    assert.strictEqual(SPRITES.sheets[id], placeholder);
});

test('Sprites: world.html and the single-file build load the sprite files before the renderer', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'world.html'), 'utf8');
    const at = (f) => html.indexOf(`src="${f}"`);
    assert.ok(at('assets/sprites/player-placeholder.js') > 0 && at('assets/sprites/player-placeholder.js') < at('ui/sprites.js') && at('ui/sprites.js') < at('ui/world-render.js'));
    const build = fs.readFileSync(path.join(__dirname, '..', 'tools', 'build-single.js'), 'utf8');
    assert.ok(/src\|ui\|assets/.test(build), 'the build inlines assets/ scripts too');
});
