// Battle screen view rules (ui/battle-view.js, Pixie). The DOM itself is checked in the browser;
// these are the pure rules it follows: chips never rely on colour alone, bar tones, log line kinds.
const { test, assert } = require('./helpers.js');
const BV = require('../ui/battle-view.js');
const DATA = require('../src/data.js');

test('Battle view: every status category in the data has its own glyph, so chips never rely on colour alone', () => {
    const defs = DATA.statusDefinitions;
    const cats = new Set(Object.values(defs).map((d) => d.category));
    for (const c of cats) assert.ok(BV.CATEGORY_GLYPH[c], `category ${c} has a glyph`);
    const glyphs = Object.values(BV.CATEGORY_GLYPH);
    assert.strictEqual(new Set(glyphs).size, glyphs.length, 'glyphs are distinct');
});

test('Battle view: a status chip shows name, stacks and rounds left, and falls back to "other"', () => {
    const defs = DATA.statusDefinitions;
    const bleed = BV.statusChip({ name: 'Bleed', stacks: 2, duration: 3 }, defs);
    assert.strictEqual(bleed.category, 'dot');
    assert.strictEqual(bleed.text, 'Bleed ×2 3');
    assert.match(bleed.title, /2 stacks, 3 rounds left/);
    const one = BV.statusChip({ name: 'Stun', duration: 1 }, defs);
    assert.strictEqual(one.category, 'control');
    assert.match(one.title, /1 round left/);
    const odd = BV.statusChip({ name: 'Something New' }, defs);
    assert.strictEqual(odd.category, 'other');
    assert.strictEqual(odd.text, 'Something New');
});

test('Battle view: HP tone and bar percentage', () => {
    assert.strictEqual(BV.hpTone(70, 70), 'ok');
    assert.strictEqual(BV.hpTone(35, 70), 'mid');
    assert.strictEqual(BV.hpTone(17, 70), 'low');
    assert.strictEqual(BV.hpTone(0, 0), 'low');
    assert.strictEqual(BV.pct(-3, 10), 0);
    assert.strictEqual(BV.pct(15, 10), 100);
    assert.strictEqual(BV.pct(1, 3), 33);
});

test('Battle view: log separators become turn and round headers; hits and heals are tagged', () => {
    assert.deepStrictEqual(BV.logLine('--- Your Turn! ---'), { kind: 'turn', text: 'Your turn' });
    assert.deepStrictEqual(BV.logLine("--- Rust Rat's Turn! ---"), { kind: 'turn', text: "Rust Rat's turn" });
    assert.deepStrictEqual(BV.logLine('--- End of Round ---'), { kind: 'round', text: 'End of Round' });
    assert.strictEqual(BV.logLine('Rust Rat uses Corroding Bite on Ayla for 2 damage! Ayla HP: 67/70').kind, 'dmg');
    assert.strictEqual(BV.logLine('You heal 5 HP.').kind, 'heal');
    assert.strictEqual(BV.logLine('Used 1 Mana.').kind, 'plain');
});

test('Battle view: the help line explains the highlighted command, or why it is unavailable', () => {
    assert.strictEqual(BV.helpText({ sub: '10-14 dmg · 1 Mana' }), '10-14 dmg · 1 Mana');
    assert.strictEqual(BV.helpText({ disabled: true, sub: 'nothing usable' }), 'Unavailable · nothing usable');
    assert.strictEqual(BV.helpText(null), '');
});
