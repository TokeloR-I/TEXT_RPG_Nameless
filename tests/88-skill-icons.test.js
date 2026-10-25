const { test, assert } = require('./helpers');
const icons = require('../ui/skill-icons');
const data = require('../src/data');
const fs = require('fs');
const vm = require('vm');

test('skill pictograms cover every data skill with safe decorative fixed SVG', () => {
    for (const [id, definition] of Object.entries(data.skillDefinitions)) {
        const svg = icons.svg(id, definition);
        assert.ok(svg.startsWith('<svg '), id);
        assert.ok(svg.includes('viewBox="0 0 32 32"'), id);
        assert.ok(svg.includes('aria-hidden="true"'), id);
        assert.ok(svg.includes('<path '), id);
        assert.ok(!/undefined|<text|<image|<script|onload|href=/.test(svg), id);
    }
});
test('starter skills have separate authored silhouettes and normalized aliases', () => {
    const starters = ['necroBasicAttack', 'necroGraveBolt', 'necroRaiseSkeleton', 'necroSoulLeech', 'Channel the Grave', 'Slash', 'Guard', 'Power Strike', 'War Cry', 'Backstab', 'Evasion', 'Quick Slash', 'Second Wind', 'Arcane Bolt', 'Focus', 'Mana Burst', 'Overchannel'];
    const artwork = id => icons.svg(id).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    assert.strictEqual(new Set(starters.map(artwork)).size, starters.length, 'starter path artwork must be distinct independently of SVG metadata');
    assert.strictEqual(icons.svg('necroGraveBolt'), icons.svg('Grave Bolt'));
    assert.strictEqual(icons.svg('necroRaiseSkeleton'), icons.svg('Raise Skeleton'));
});
test('effect and damage fallback reflects new skills without markup injection', () => {
    assert.strictEqual(icons.resolve('Future ally', { effects: [{ type: 'summon' }] }), 'summon');
    assert.strictEqual(icons.resolve('Future remedy', { effects: [{ type: 'heal' }] }), 'heal');
    assert.strictEqual(icons.resolve('Future spell', { damage_type: 'ice' }), 'ice');
    assert.strictEqual(icons.resolve('Future ward', { effects: [{ type: 'absorb_hit' }] }), 'guard');
    assert.strictEqual(icons.resolve('Future hit', { damage_type: 'physical' }), 'attack');
    assert.strictEqual(icons.svg('<script>alert(1)</script>', { name: '\"><img src=x onerror=alert(1)>' }), icons.svg('unknown'));
    assert.ok(icons.svg('__proto__').includes('<path'));
    assert.ok(icons.svg(null, null).includes('<path'));
});
test('pictograms expose the same offline browser API without CommonJS', () => {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(require.resolve('../ui/skill-icons'), 'utf8'), context);
    assert.strictEqual(context.window.EnsoSkillIcons.svg('Grave Bolt'), icons.svg('Grave Bolt'));
    assert.ok(Object.isFrozen(context.window.EnsoSkillIcons));
});
