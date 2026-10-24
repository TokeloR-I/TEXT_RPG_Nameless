// GFX-2 (#106): one-shot action animations (attack, cast, hit, death) in the sprite pipeline.
const { test, assert } = require('./helpers.js');
const SPRITES = require('../ui/sprites.js');
require('../assets/sprites/player-placeholder.js');

const P = SPRITES.manifest.player;
const ACTIONS = ['attack', 'cast', 'hit', 'death'];
const total = (a) => P.animations[a].steps.reduce((t, s) => t + s.ms, 0);
const pixels = (opts) => Buffer.from(SPRITES.composite(opts).data).toString('base64');

test('Sprite actions: attack, cast, hit and death exist, play once, and have a body frame for every pose in every facing', () => {
    for (const a of ACTIONS) {
        assert.ok(P.animations[a] && P.animations[a].once, `${a} is a one-shot animation`);
        for (const facing of SPRITES.FACINGS) for (const s of P.animations[a].steps) {
            assert.ok(SPRITES.frameKey(SPRITES.sheets['player.body'], facing, s.pose), `${a} ${facing} ${s.pose}`);
        }
    }
    assert.deepStrictEqual(SPRITES.validateSheets(), []);
});

test('Sprite actions: a one-shot animation runs its steps in order, then settles (idle afterwards, death holds its last step)', () => {
    for (const a of ACTIONS) {
        let t = 0;
        for (const s of P.animations[a].steps) { assert.deepStrictEqual(SPRITES.animationStep(P, a, t), s); t += s.ms; }
        assert.ok(!SPRITES.animationDone(P, a, total(a) - 1));
        assert.ok(SPRITES.animationDone(P, a, total(a)));
    }
    assert.deepStrictEqual(SPRITES.animationStep(P, 'attack', total('attack')), P.animations.idle[0], 'back to idle');
    assert.deepStrictEqual(SPRITES.animationStep(P, 'attack', total('attack') + P.animations.idle[0].ms), P.animations.idle[1], 'and idle keeps looping');
    const last = P.animations.death.steps[P.animations.death.steps.length - 1];
    for (const t of [total('death'), total('death') + 5000]) assert.deepStrictEqual(SPRITES.animationStep(P, 'death', t), last, 'death holds');
    assert.ok(!SPRITES.animationDone(P, 'idle', 1e9) && !SPRITES.animationDone(P, 'walk', 1e9), 'looping animations never finish');
});

test('Sprite actions: every action pose changes the picture from standing, for all 12 hairstyles and 4 outfits, facing the camera', () => {
    for (let h = 0; h < 12; h++) for (let o = 0; o < 4; o++) {
        const base = { cosmetics: { hairStyle: h, outfit: o }, facing: 'down' };
        const stand = pixels({ ...base, anim: 'idle', time: 0 });
        for (const [a, t] of [['attack', 0], ['attack', 150], ['cast', 0], ['hit', 0], ['death', total('death')]]) {
            assert.notStrictEqual(pixels({ ...base, anim: a, time: t }), stand, `${a}@${t} hair ${h} outfit ${o}`);
        }
    }
});

test('Sprite actions: death lowers the whole body (every layer moves together) and kneels', () => {
    const end = SPRITES.characterLayers({ anim: 'death', time: total('death') });
    assert.strictEqual(end.pose, 'kneel');
    assert.ok(end.oy > 0, 'lowered');
    assert.ok(end.layers.every((l) => l.sheetId), 'all layers still drawn');
});
