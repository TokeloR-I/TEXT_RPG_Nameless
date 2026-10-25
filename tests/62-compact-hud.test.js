// Persistent HUD identity, resource and direct skill activation without a browser dependency.
const { test, assert } = require('./helpers.js');
const HUD = require('../ui/action-hud.js');
function fixture() {
    const nodes = [];
    const doc = { createElement(tag) {
        const el = { tag, children: [], attrs: {}, listeners: {}, style: { setProperty() {} },
            classList: { toggle() {}, add() {} },
            setAttribute(k, v) { this.attrs[k] = v; },
            appendChild(child) { this.children.push(child); },
            addEventListener(k, fn) { this.listeners[k] = fn; },
            remove() {}, getContext() { return { clearRect() {} }; } };
        nodes.push(el); return el;
    } };
    const root = doc.createElement('main'); root.ownerDocument = doc;
    const player = { name: 'Kaelen', level: 7, hp: 31, maxHp: 80, appearance: 2, className: 'Mage',
        resource: { type: 'Mana', current: 9, max: 30 }, skills: [{ name: 'Focus', cost: 0, target: 'self' }] };
    const engine = { getState: () => ({ mode: 'explore', player }), getSkillBar: () => [{ slot: 0, skillId: 'Focus' }] };
    return { root, nodes, engine };
}
test('compact HUD preserves authoritative identity and cosmetics without mutating state', () => {
    const { engine } = fixture();
    const cosmetics = { hairStyle: 3 };
    const m = HUD.viewModel(engine, { appearance: 4, cosmetics, className: 'Warrior' });
    assert.deepStrictEqual(m.player.portrait, { appearance: 4, cosmetics, className: 'Warrior' });
    assert.strictEqual(engine.getState().player.appearance, 2);
    assert.deepStrictEqual(m.player.resource, { name: 'Mana', cur: 9, max: 30, kind: 'mana' });
    assert.strictEqual(m.slots[0].enabled, true);
});
test('compact HUD mounts portrait, level and resource together and keeps equipped skills keyboard and pointer accessible', () => {
    const { root, nodes, engine } = fixture();
    const previous = globalThis.ENSO.sprites;
    globalThis.ENSO.sprites = { drawPortrait() { return true; } };
    try {
        const hud = HUD.create(root);
        hud.update(HUD.viewModel(engine, null));
        const vitals = nodes.find((n) => n.className === 'ahud-vitals');
        assert.ok(vitals.children.some((n) => n.className === 'ahud-portrait' && n.tag === 'canvas'));
        assert.strictEqual(nodes.find((n) => n.className === 'lv').textContent, 'Lv 7');
        assert.strictEqual(nodes.find((n) => n.className === 'ahud-row res').hidden, false);
        const slots = nodes.filter((n) => n.attrs.role === 'button');
        assert.strictEqual(slots[1].tabIndex, 0);
        assert.strictEqual(slots[2].tabIndex, -1, 'empty slots do not take keyboard focus');
        let fired = [];
        hud.onSlot((i) => fired.push(i));
        const event = (key) => ({ key, preventDefault() {}, stopPropagation() {} });
        slots[1].listeners.keydown(event('Enter'));
        slots[1].listeners.keydown(event(' '));
        slots[1].listeners.pointerdown(event());
        assert.deepStrictEqual(fired, [0, 0, 0]);
        hud.destroy();
    } finally { globalThis.ENSO.sprites = previous; }
});

test('compact HUD retries a loading portrait, caches successful draws and redraws changed identity', () => {
    const { root, engine } = fixture();
    const previous = globalThis.ENSO.sprites;
    let calls = 0;
    globalThis.ENSO.sprites = { drawPortrait() { calls++; return calls > 1; } };
    try {
        const hud = HUD.create(root);
        const model = HUD.viewModel(engine, null);
        hud.update(model);
        assert.strictEqual(calls, 1);
        hud.update(model);
        assert.strictEqual(calls, 2, 'a loading portrait is retried');
        hud.update(model);
        assert.strictEqual(calls, 2, 'a successful portrait is cached');
        hud.update(HUD.viewModel(engine, { appearance: 4 }));
        assert.strictEqual(calls, 3, 'identity changes redraw the portrait');
        hud.destroy();
    } finally { globalThis.ENSO.sprites = previous; }
});
