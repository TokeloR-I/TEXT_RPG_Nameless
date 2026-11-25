// Menu redesign (Tokelo 2026-11-25: "the UI looks all over the place"; docs/ui/MENU_REDESIGN.md). One shell for the
// Esc menu, the Skill Web screen and the stations, with a picture for every tab, gear slot and item.
const { test, assert, data } = require('./helpers.js');
const fs = require('fs');
const path = require('path');
const MI = require('../ui/menu-icons.js');

const ROOT = path.join(__dirname, '..');
const WORLD_UI = fs.readFileSync(path.join(ROOT, 'ui/world-ui.js'), 'utf8');

test('Menu icons: every item in the game gets a picture, and gear gets its slot\'s picture', () => {
    const slotKinds = { head: 'head', bodyArmor: 'bodyArmor', hands: 'hands', feet: 'feet', accessory: 'accessory', offHand: 'shield' };
    for (const [name, def] of Object.entries(data.itemDefinitions)) {
        const kind = MI.itemKind(name, def);
        assert.ok(MI.kinds.includes(kind), `${name} -> ${kind}`);
        if (slotKinds[def.slot]) assert.strictEqual(kind, slotKinds[def.slot], name);
        if (def.slot === 'mainHand') assert.ok(['sword', 'staff', 'wand', 'spear', 'scythe'].includes(kind), name);
        if (def.use === 'meal') assert.strictEqual(kind, 'meal', name);
    }
    assert.strictEqual(MI.itemKind('Pork', data.itemDefinitions.Pork), 'meat');
    assert.strictEqual(MI.itemKind('Wheat Seed', data.itemDefinitions['Wheat Seed']), 'seed');
    assert.strictEqual(MI.itemKind('Bog Iron', data.itemDefinitions['Bog Iron']), 'ore');
    assert.strictEqual(MI.itemKind('Something new', null), 'bundle', 'an unknown item still gets a picture');
});

test('Menu icons: markup is fixed art only (no item text gets in), and rarity falls back to common', () => {
    const svg = MI.item('<img src=x onerror=alert(1)>', { type: 'material' });
    assert.ok(svg.startsWith('<svg') && !svg.includes('<img'));
    assert.match(MI.slot('feet'), /data-icon="feet"/);
    assert.strictEqual(MI.rarity({ rarity: 'Rare' }), 'rare');
    assert.strictEqual(MI.rarity({ rarity: 'mythic' }), 'common');
    assert.strictEqual(MI.rarity(null), 'common');
});

test('Menu shell: every Esc menu tab has a picture of its own', () => {
    const ids = [...WORLD_UI.match(/const MM_TABS_ALL = \[([\s\S]*?)\n    \];/)[1].matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
    assert.ok(ids.length >= 10);
    for (const id of ids) assert.match(MI.tab(id), new RegExp(`data-icon="${id}"`), id);
});

test('Menu shell: the menu icons load before the world UI, and Q / R / Tab change tabs in the menu and at stations', () => {
    const html = fs.readFileSync(path.join(ROOT, 'world.html'), 'utf8');
    assert.ok(html.indexOf('ui/menu-icons.js') > 0 && html.indexOf('ui/menu-icons.js') < html.indexOf('ui/world-ui.js'));
    assert.match(WORLD_UI, /modal === 'pause' && menu && \/\^\(q\|Q\|r\|R\|Tab\)\$\/\.test\(ev\.key\)/);
    assert.match(WORLD_UI, /modal === 'talk' && menu && menu\.cycle/);
    assert.match(WORLD_UI, /els\.dialog\.className = 'dialog station cx shop'/);
    assert.match(WORLD_UI, /els\.dialog\.className = 'dialog station cx kitchen'/);
});
