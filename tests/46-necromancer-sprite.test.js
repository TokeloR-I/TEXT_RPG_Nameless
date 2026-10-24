// Necromancer test sprite (PixelLab, assets/sprites/necromancer-art.js): a whole-body 48x48 image character
// that the Necromancer class is drawn with instead of the layered 24x32 player.
const { test, assert } = require('./helpers.js');
const SPRITES = require('../ui/sprites.js');
require('../assets/sprites/player-placeholder.js');
require('../assets/sprites/necromancer-art.js');

test('Necromancer sprite: sheets valid next to the 24x32 player sheets', () => {
    assert.deepStrictEqual(SPRITES.validateSheets(), []);
});

test('Necromancer sprite: the class picks the 48x48 character, other classes keep the layered player', () => {
    const n = SPRITES.characterFor('necromancer');
    assert.strictEqual(n, SPRITES.manifest.necromancer);
    assert.strictEqual(SPRITES.characterFor('Necromancer'), n);
    assert.deepStrictEqual(n.frame, { w: 48, h: 48 });
    assert.strictEqual(SPRITES.characterFor('rogue'), SPRITES.manifest.player);
    assert.strictEqual(SPRITES.characterFor(null), SPRITES.manifest.player);
});

test('Necromancer sprite: every facing shows its own cell, including cell 0', () => {
    const sheet = SPRITES.sheets['necromancer.body'];
    assert.ok(sheet.src.startsWith('data:image/png;base64,'));
    assert.deepStrictEqual(SPRITES.FACINGS.map((f) => SPRITES.frameKey(sheet, f, 'stand')), SPRITES.FACINGS);
    for (const anim of ['idle', 'walk', 'attack', 'cast', 'hit', 'death']) {
        const { layers } = SPRITES.characterLayers({ character: SPRITES.manifest.necromancer, facing: 'down', anim });
        assert.deepStrictEqual(layers.map((l) => l.frame), ['down']);
    }
});
