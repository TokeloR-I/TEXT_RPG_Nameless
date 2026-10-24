// HD-2D battle stage (ui/battle-hd.js): which backdrop each map fights on, and a 64px painter for every foe.
const { test, assert } = require('./helpers.js');
const BH = require('../ui/battle-hd.js');
const ZONE1 = require('../src/world/zone1.js');

const theme = (id) => {
    const map = ZONE1.maps[id], names = {};
    for (const [ch, def] of Object.entries({ ...ZONE1.tileset, ...(map.legend || {}) })) names[ch] = def && def.name;
    return BH.themeFor(map, names);
};

test('HD-2D battle: each map fights on a stage that matches it', () => {
    assert.strictEqual(theme('cellar').stage, 'crypt');
    assert.strictEqual(theme('sanctuary').stage, 'crypt');
    assert.strictEqual(theme('house').stage, 'interior');
    assert.strictEqual(theme('shamefield').stage, 'village');
    assert.strictEqual(theme('road').stage, 'forest');
    assert.ok(theme('road').night && !theme('shamefield').night);
    for (const id of Object.keys(ZONE1.maps)) assert.ok(['crypt', 'interior', 'village', 'forest', 'field'].includes(theme(id).stage), id);
});

test('HD-2D battle: every foe met in the world has its own HD painter', () => {
    const keys = new Set();
    for (const m of Object.values(ZONE1.maps)) for (const e of m.encounters || []) for (const k of e.enemies || []) keys.add(k);
    assert.ok(keys.size > 0);
    for (const k of keys) assert.ok(BH.creatures[BH.CREATURE_FOR[k]], k);
});
