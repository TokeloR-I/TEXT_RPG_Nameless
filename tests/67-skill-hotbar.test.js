// Exercise the actual visibility controller against every modal and transition state.
const { test, assert } = require('./helpers.js');
const fs = require('fs');
const vm = require('vm');
const HUD = require('../ui/action-hud.js');

test('skill hotbar hides and becomes inert for every modal, story transition and other screen, then restores', () => {
    const source = fs.readFileSync(require.resolve('../ui/world-ui.js'), 'utf8');
    const body = source.match(/    function syncActionHudVisibility\(\) \{[\s\S]*?\n    \}/)[0];
    const attrs = {};
    const context = { hud: { el: { setAttribute(k, v) { attrs[k] = v; } } }, screen: 'explore', modal: null, fade: null, flash: null, feathering: null };
    vm.createContext(context);
    vm.runInContext(body, context);
    const check = (blocked) => {
        vm.runInContext('syncActionHudVisibility()', context);
        assert.strictEqual(context.hud.el.hidden, blocked);
        assert.strictEqual(context.hud.el.inert, blocked);
        assert.strictEqual(attrs['aria-hidden'], String(blocked));
    };
    check(false);
    for (const modal of ['creator', 'dialog', 'talk', 'pause', 'branch', 'future-menu']) {
        context.modal = modal; check(true);
        context.modal = null; check(false);
    }
    for (const field of ['fade', 'flash', 'feathering']) {
        context[field] = {}; check(true);
        context[field] = null; check(false);
    }
    for (const screen of ['title', 'combat', 'over']) {
        context.screen = screen; check(true);
        context.screen = 'explore'; check(false);
    }
    context.hud = null;
    vm.runInContext('syncActionHudVisibility()', context);
});

test('skill hotbar renders provider art and exposes full names on keyboard focus, including subsecond cooldowns', () => {
    const nodes = [];
    const doc = { createElement(tag) {
        const el = { tag, children: [], attrs: {}, listeners: {}, style: { setProperty() {} }, classList: { toggle() {}, add() {} },
            setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
            appendChild(child) { this.children.push(child); }, addEventListener(k, fn) { this.listeners[k] = fn; }, remove() {} };
        nodes.push(el); return el;
    } };
    const root = doc.createElement('main'); root.ownerDocument = doc;
    const previous = globalThis.EnsoSkillIcons;
    const previousSprites = globalThis.ENSO.sprites;
    globalThis.ENSO.sprites = null;
    const calls = [];
    globalThis.EnsoSkillIcons = { svg(id) { calls.push(id); return '<svg aria-hidden="true" viewBox="0 0 32 32"></svg>'; } };
    try {
        const engine = { getState: () => ({ mode: 'explore', player: { skills: [{ name: 'Focus', cost: 3 }] } }), getSkillBar: () => [{ slot: 0, skillId: 'Focus' }] };
        const hud = HUD.create(root);
        const model = HUD.viewModel(engine);
        model.slots[0].cd = { remainingMs: 400, frac: .1 };
        hud.update(model);
        assert.ok(calls.includes('Focus'));
        assert.ok(nodes.filter((n) => n.className === 'skill-icon').every((n) => n.attrs['aria-hidden'] === 'true'));
        assert.ok(!nodes.some((n) => n.className === 'abbr'));
        const slot = nodes.filter((n) => n.attrs.role === 'button')[1];
        const tooltip = nodes.find((n) => n.className === 'ahud-skill-tooltip');
        slot.listeners.focus();
        assert.strictEqual(tooltip.hidden, false);
        assert.ok(tooltip.textContent.includes('Focus'));
        assert.ok(slot.attrs['aria-label'].includes('3'));
        assert.ok(nodes.some((n) => n.className === 'secs' && n.textContent === '0.4'));
        slot.listeners.blur();
        assert.strictEqual(tooltip.hidden, true);
    } finally { globalThis.EnsoSkillIcons = previous; globalThis.ENSO.sprites = previousSprites; }
});


test('skill hotbar passes full damage and effect definitions to art while retaining public rule summaries', () => {
    const fire = { name: 'Future Ember', damage_type: 'fire', effects: [{ type: 'damage' }] };
    const control = { name: 'Future Prison', effects: [{ type: 'stun' }] };
    const summary = { name: 'Future Ember', cost: 0 };
    const engine = {
        data: { skillDefinitions: { 'Future Ember': fire, 'Future Prison': control } },
        getState: () => ({ mode: 'explore', player: { skills: [summary, { name: 'Future Prison', cost: 4 }] } }),
        getSkillBar: () => [{ slot: 0, skillId: 'Future Prison' }]
    };
    const model = HUD.viewModel(engine);
    assert.strictEqual(model.basic.definition, fire);
    assert.strictEqual(model.slots[0].definition, control);
    assert.strictEqual(model.slots[0].cost, 4, 'art metadata never supplies gameplay costs');
    const previous = globalThis.ENSO.data;
    try {
        delete engine.data;
        globalThis.ENSO.data = { skillDefinitions: { 'Future Ember': fire } };
        const fallback = HUD.viewModel(engine);
        assert.strictEqual(fallback.basic.definition, fire);
        assert.strictEqual(fallback.slots[0].definition.name, 'Future Prison');
        assert.strictEqual(fallback.slots[0].definition.effects, undefined);
    } finally { globalThis.ENSO.data = previous; }
});
