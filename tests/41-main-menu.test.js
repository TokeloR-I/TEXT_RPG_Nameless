// UI-3 / UI-6 main menu view model (ui/main-menu.js, Pixie): the Items and Equipment tabs show the engine's
// own answers. The DOM is checked in the browser; these are the rules it follows.
const { test, assert, GameEngine, data } = require('./helpers.js');
const MM = require('../ui/main-menu.js');

function explorer() {
    const g = new GameEngine({ seed: 7 });
    g.start();
    g.act({ type: 'choose_class', classId: 'warrior' });
    g.player.inventory.push('Roadworn Blade', 'Padded Jerkin', 'Bandages', 'Bandages', 'Wild Herbs', 'Small Coin Purse');
    return g;
}

test('Main menu: the Use list is the engine\'s use_item options for things with a use, with its reasons; the rest is "carrying"', () => {
    const g = explorer();
    const v = MM.itemsView(g.getAvailableActions(), g.player.inventory, data.itemDefinitions);
    assert.deepStrictEqual(v.usable.map((u) => [u.item, u.count, u.enabled]), [['Bandages', 2, false], ['Small Coin Purse', 1, true]]);
    assert.strictEqual(v.usable[0].reason.code, 'FULL_HEALTH', 'the engine\'s own refusal travels with it');
    const carrying = v.carrying.map((c) => c.item);
    for (const item of ['Roadworn Blade', 'Padded Jerkin', 'Wild Herbs']) assert.ok(carrying.includes(item), `${item} is carried, not "used"`);
    assert.ok(!carrying.includes('Bandages'));
});

test('Main menu: equipment slots and choices come from getEquipment(), with readable stat changes', () => {
    const g = explorer();
    const rows = MM.slotsView(g.getEquipment());
    assert.deepStrictEqual(rows.map((r) => r.label), ['Weapon', 'Armor', 'Accessory']);
    const weapon = rows[0];
    assert.strictEqual(weapon.item, null);
    assert.deepStrictEqual(weapon.candidates.map((c) => [c.item, c.diffText]), [['Roadworn Blade', '+1 STR']]);
    g.act({ type: 'equip', item: 'Roadworn Blade' });
    assert.strictEqual(MM.slotsView(g.getEquipment())[0].item, 'Roadworn Blade');
    assert.deepStrictEqual(MM.slotsView(null), []);
});

test('Main menu: diff text and the comparison preview', () => {
    assert.strictEqual(MM.diffText({ strength: 2, def: -1, agility: 0 }), '+2 STR · −1 DEF');
    assert.strictEqual(MM.diffText({}), 'no stat change');
    const p = { strength: 10, intelligence: 5, agility: 7, def: 3 };
    const rows = MM.statPreview(p, { def: 2 });
    assert.deepStrictEqual(rows.map((r) => [r.label, r.value, r.delta, r.after]), [['STR', 10, 0, 10], ['INT', 5, 0, 5], ['AGI', 7, 0, 7], ['DEF', 3, 2, 5]]);
    assert.ok(MM.statPreview(p, null).every((r) => r.delta === 0));
});
