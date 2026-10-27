// Original art (Tokelo, 2026-10-26: Mana Seed removed, ENSO makes its own): the ENSO doll (assets/sprites/enso-player.js)
// and scene art (ui/scene-art.js). Both are drawn by code, so these check what the code promises.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { test, assert } = require('./helpers.js');
const SPRITES = require('../ui/sprites.js');
const ENSO_PLAYER = require('../assets/sprites/enso-player.js');
const SCENE = require('../ui/scene-art.js');
const ZONE1 = require('../src/world/zone1.js');

const nameAt = (m, x, y) => {
    if (y < 0 || y >= m.tiles.length || x < 0 || x >= m.tiles[0].length) return null;
    const ch = m.tiles[y][x], def = (m.legend && m.legend[ch]) || ZONE1.tileset[ch];
    return def ? def.name : null;
};

test('Original art: no Mana Seed file or reference is left in the game', () => {
    const root = path.join(__dirname, '..');
    for (const f of ['assets/sprites/manaseed.js', 'assets/src/tiles/manaseed.png', 'ui/tiles-manaseed.js']) assert.ok(!fs.existsSync(path.join(root, f)), f);
    for (const page of ['world.html', 'index.html']) assert.ok(!/manaseed/i.test(fs.readFileSync(path.join(root, page), 'utf8')), page);
    assert.ok(!SPRITES.manifest.manaseed);
});

test('ENSO doll: every frame of every shape choice is 64x64 with known colours, and left mirrors right', () => {
    const m = SPRITES.manifest.enso, o = m.options;
    const known = new Set(Object.keys(m.paletteFor()));
    const shapes = [{}, { hairStyle: 5, outfit: 3, hat: 1, weapon: 3, shield: 2 }, { hairStyle: 8, outfit: 2, hat: 4, weapon: 2, shield: 5 }, { hairStyle: 3, outfit: 4, hat: 3, weapon: -1 }];
    for (const c of shapes) {
        const sheet = SPRITES.getSheet(`enso.${m.sheetFields(c).shape}`);
        for (const f of ENSO_PLAYER.FACINGS) for (const p of ENSO_PLAYER.POSES) {
            const rows = sheet.frames[`${f}.${p}`];
            assert.strictEqual(rows.length, 64); rows.forEach((r) => assert.strictEqual(r.length, 64));
            for (const ch of new Set(rows.join('').replace(/\./g, ''))) assert.ok(known.has(ch), `role ${ch}`);
        }
        const r = sheet.frames['right.walk2'], l = sheet.frames['left.walk2'];
        assert.deepStrictEqual(l, r.map((s) => [...s].reverse().join('')));
    }
    assert.ok(o.hairStyles.length >= 8 && o.outfits.length >= 6 && o.hats.length >= 6 && o.weapons.length >= 16 && o.shields.length >= 10);
});

test('ENSO doll: the feet stand on the anchor row and each shape choice changes the picture', () => {
    const m = SPRITES.manifest.enso;
    const frame = (c, key = 'down.stand') => SPRITES.getSheet(`enso.${m.sheetFields(c).shape}`).frames[key];
    const lowest = (rows) => rows.reduce((y, r, i) => (/[^.]/.test(r) ? i : y), -1);
    assert.ok(Math.abs(lowest(frame({ weapon: -1 })) - m.anchor.y) <= 1, `feet at row ${lowest(frame({ weapon: -1 }))}`);
    const base = frame({}).join('');
    for (const k of ['hairStyle', 'outfit', 'hat', 'shield']) assert.notStrictEqual(frame({ [k]: 1 }).join(''), base, k);
    assert.notStrictEqual(frame({ weapon: 1 }, 'down.slash3').join(''), frame({}, 'down.slash3').join(''), 'weapon type');
    // Colour choices are palette roles, not new sheets.
    assert.strictEqual(m.sheetFields({ hairColor: 3, outfitColor: 4 }).shape, m.sheetFields({}).shape);
    assert.notDeepStrictEqual(m.paletteFor({ cosmetics: { outfitColor: 4 } }), m.paletteFor({}));
    // Saves made with the old doll (bigger indices) still resolve.
    assert.ok(SPRITES.getSheet(`enso.${m.sheetFields({ hairStyle: 27, outfit: 9, hat: 10, weapon: 14, shield: 15 }).shape}`));
});

test('ENSO doll v2 (chibi): big eyes with iris and shine facing front and side, none from behind', () => {
    const m = SPRITES.manifest.enso, sheet = SPRITES.getSheet(`enso.${m.sheetFields({}).shape}`);
    const count = (key, ch) => sheet.frames[key].join('').split(ch).length - 1;
    assert.strictEqual(count('down.stand', 'r'), 2, 'two shines');
    assert.ok(count('down.stand', 'u') >= 4 && count('down.stand', 's') >= 2, 'two irises');
    assert.ok(count('right.stand', 'u') >= 2, 'one eye in profile');
    assert.strictEqual(count('up.stand', 'u'), 0);
    assert.strictEqual(count('down.hit', 'u'), 0, 'shut when hit');
    // The head is chibi-sized: at least 14 px across facing front.
    const rows = sheet.frames['down.stand'], widest = Math.max(...rows.slice(8, 22).map((r) => r.replace(/^\.+|\.+$/g, '').length));
    assert.ok(widest >= 14, `head ${widest} px`);
});

test('ENSO doll v2: fluid animation set, every step a real pose, combat timings unchanged', () => {
    const m = SPRITES.manifest.enso, sheet = SPRITES.getSheet(`enso.${m.sheetFields({}).shape}`);
    const stepsOf = (a) => (Array.isArray(a) ? a : a.steps);
    for (const [name, a] of Object.entries(m.animations)) for (const s of stepsOf(a)) assert.ok(ENSO_PLAYER.POSES.includes(s.pose), `${name}: ${s.pose}`);
    const len = (n) => stepsOf(m.animations[n]).length, total = (n) => stepsOf(m.animations[n]).reduce((t, s) => t + s.ms, 0);
    assert.ok(len('idle') >= 4 && len('walk') >= 8 && len('swing') >= 6 && len('hurt') >= 2 && len('death') >= 5);
    assert.strictEqual(total('swing'), 350); assert.strictEqual(total('heavy'), 720); assert.strictEqual(total('hurt'), 250);
    // Breathing moves the figure; the in-betweens differ from both of their ends.
    assert.notDeepStrictEqual(sheet.frames['down.idle3'], sheet.frames['down.idle1']);
    for (const [p, a, b] of [['slash5', 'slash4', 'ready1'], ['hit2', 'hit', 'ready1']]) for (const f of ['down', 'right', 'up']) {
        const k = (x) => sheet.frames[`${f}.${x}`].join('');
        assert.ok(k(p) !== k(a) && k(p) !== k(b), `${f}.${p}`);
    }
});

test('Scene art: the homestead grounds paint whole, the same every time, with a crown layer over people', () => {
    const map = ZONE1.maps.grounds;
    assert.ok(SCENE.has(map) && !SCENE.has(ZONE1.maps.house));
    const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
    assert.strictEqual(a.w, map.tiles[0].length * 32); assert.strictEqual(a.h, map.tiles.length * 32);
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    assert.strictEqual(sha(a.base), sha(b.base), 'deterministic');
    for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`base pixel ${(i - 3) / 4} is not opaque`);
    // The crown layer is empty where people walk in the open (the middle of the yard).
    const at = (x, y) => a.over[(y * a.w + x) * 4 + 3];
    assert.strictEqual(at(15 * 32 + 16, 12 * 32 + 16), 0);
    assert.ok(a.water.length > 50, 'the river shimmers');
});
