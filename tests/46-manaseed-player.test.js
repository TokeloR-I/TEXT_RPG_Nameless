// The Mana Seed player (assets/sprites/manaseed.js, tools/gen-manaseed.js): a 64x64 paper doll used for every
// class, with skin, hair, outfit, hat, weapon and shield layers and gear that moves in front of / behind the body.
const { test, assert } = require('./helpers.js');
const SPRITES = require('../ui/sprites.js');
require('../assets/sprites/player-placeholder.js');
require('../assets/sprites/manaseed.js');

const MS = SPRITES.manifest.manaseed;
// Node never loads images, so characterLayers() would show the loading sheet; this resolves the templates against
// the registered sheets instead: the layers that have a frame for this facing and pose, bottom to top.
const fill = (tpl, f) => tpl.replace(/\{(\w+)\}/g, (_, k) => (Number.isInteger(f[k]) ? f[k] : 0));
function drawn({ appearance = 0, cosmetics = {}, facing = 'down', anim = 'idle', time = 0 }) {
    const pose = SPRITES.animationStep(MS, anim, time).pose, f = { appearance, ...cosmetics };
    return MS.layerOrder[facing].flatMap((layer) => {
        const spec = MS.layers[layer], tpl = typeof spec === 'string' ? spec : spec.sheet;
        let id = fill(tpl, f);
        if (!SPRITES.sheets[id] && !(spec.optional)) id = fill(MS.fallbacks[layer], f);
        return SPRITES.sheets[id] && SPRITES.frameKey(SPRITES.sheets[id], facing, pose) ? [{ layer, sheetId: id }] : [];
    });
}

test('Mana Seed: sheets are valid alongside the palette player sheets', () => {
    assert.deepStrictEqual(SPRITES.validateSheets(), []);
});

test('Mana Seed: drawn for every class; villagers keep the palette player', () => {
    for (const cls of ['warrior', 'necromancer', 'rogue', null]) assert.strictEqual(SPRITES.characterFor(cls), MS);
    assert.ok(SPRITES.manifest.player && SPRITES.manifest.player !== MS);
    assert.deepStrictEqual(MS.frame, { w: 64, h: 64 });
});

test('Mana Seed: every option has its sheets, and skin follows appearance', () => {
    const o = MS.options;
    assert.strictEqual(o.skins.length, 4);
    o.skins.forEach((_, i) => assert.ok(SPRITES.sheets[`ms.body.${i}`]));
    o.outfits.forEach((_, i) => assert.ok(SPRITES.sheets[`ms.outfit.${i}`]));
    o.hairStyles.forEach((_, s) => o.hairColours.forEach((_, c) => assert.ok(SPRITES.sheets[`ms.hair.${s}.${c}`])));
    o.hats.forEach((n, i) => assert.strictEqual(!!SPRITES.sheets[`ms.hat.${i}`], n !== 'None'));
    const body = drawn({ appearance: 2 }).find((l) => l.layer === 'body');
    assert.strictEqual(body.sheetId, 'ms.body.2');
});

test('Mana Seed: walking shows no weapon; in combat each gear piece is drawn once, behind or in front', () => {
    const gear = { weapon: 3, shield: 6 };
    for (const facing of SPRITES.FACINGS) {
        const walk = drawn({ cosmetics: gear, facing, anim: 'walk' }).map((l) => l.layer);
        assert.deepStrictEqual(walk, ['body', 'outfit', 'hair'], facing);
        for (const anim of ['ready', 'attack', 'cast', 'hit', 'death']) for (let t = 0; t < 900; t += 30) {
            const names = drawn({ cosmetics: gear, facing, anim, time: t }).map((l) => l.layer);
            assert.strictEqual(names.filter((n) => n.startsWith('weapon')).length, 1, `${facing} ${anim} ${t}`);
            assert.strictEqual(names.filter((n) => n.startsWith('shield')).length, 1, `${facing} ${anim} ${t}`);
        }
    }
    const none = drawn({ cosmetics: { shield: 0 }, facing: 'down', anim: 'ready' }).map((l) => l.layer);
    assert.ok(!none.some((n) => n.startsWith('shield')));
});

test('Mana Seed: old saves with placeholder cosmetics still draw (missing styles fall back)', () => {
    const layers = drawn({ cosmetics: { hairStyle: 11, hairColor: 3, outfit: 3 }, facing: 'down' });
    assert.ok(layers.find((l) => l.layer === 'hair' && l.sheetId === 'ms.hair.0.0'));
    assert.ok(layers.find((l) => l.layer === 'outfit' && l.sheetId === 'ms.outfit.3'));
});
