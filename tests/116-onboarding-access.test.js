// Onboarding + accessibility (Tokelo's pick 4, round-two research 2026-11-25): first-time tips (ui/tutor.js) and the
// accessibility options (ui/access.js): key and controller rebinding, text size, colour-blind safe telegraphs,
// screen shake strength, hold or toggle for guard and sprint.
const fs = require('fs');
const path = require('path');
const { test, assert } = require('./helpers.js');
const AX = require('../ui/access.js');
const TUTOR = require('../ui/tutor.js');
const PAD = require('../ui/gamepad.js');
const FX = require('../ui/action-fx.js');

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const padState = (down = [], axes = [0, 0]) => ({ buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })), axes });

// ---------- settings ----------
test('Access: defaults, bad stored values fall back, and settings survive a save and load', () => {
    const d = AX.normalise(null);
    assert.deepStrictEqual(d, { text: 'normal', colourSafe: false, shake: null, guard: 'hold', sprint: 'hold', tips: true, keys: {}, pad: {} });
    const bad = AX.normalise({ text: 'huge', shake: 'wild', guard: 'maybe', keys: { dodge: 'Escape', heal: 'ArrowUp' }, pad: { dodge: 9 } });
    assert.strictEqual(bad.text, 'normal'); assert.strictEqual(bad.shake, null); assert.strictEqual(bad.guard, 'hold');
    assert.deepStrictEqual(bad.keys, {}, 'reserved keys are never bound'); assert.deepStrictEqual(bad.pad, {}, 'Start stays the menu');
    const store = memory();
    AX.save({ ...d, text: 'largest', colourSafe: true, shake: 'half', guard: 'toggle', sprint: 'toggle', tips: false }, store);
    const back = AX.load(store);
    assert.strictEqual(back.text, 'largest'); assert.ok(back.colourSafe); assert.strictEqual(back.shake, 'half');
    assert.strictEqual(back.guard, 'toggle'); assert.strictEqual(back.sprint, 'toggle'); assert.strictEqual(back.tips, false);
    assert.deepStrictEqual(AX.load({ getItem: () => '{not json' }), d, 'a broken store is the defaults');
});

test('Access: rebinding a key swaps with the action that had it, so no key ever does two things', () => {
    let s = AX.normalise(null);
    s = AX.bindKey(s, 'dodge', 'F');
    assert.strictEqual(AX.keyMap(s).dodge, 'f');
    s = AX.bindKey(s, 'heal', 'e');   // e was interact
    const m = AX.keyMap(s);
    assert.strictEqual(m.heal, 'e'); assert.strictEqual(m.interact, 'h', 'interact takes heal\'s old key');
    assert.strictEqual(new Set(Object.values(m)).size, AX.KEY_ACTIONS.length);
    assert.strictEqual(AX.bindKey(s, 'heal', 'Escape'), s, 'Esc stays the menu');
    assert.strictEqual(AX.bindKey(s, 'heal', 'ArrowLeft'), s, 'arrows always move');
    assert.deepStrictEqual(AX.normalise({ keys: { dodge: 'f', heal: 'f' } }).keys, { dodge: 'f' }, 'one key, one action');
    assert.deepStrictEqual(AX.normalise({ keys: { dodge: 'e' } }).keys, {}, 'a stored layout that clashes with a default falls back');
    // Binding a key back to its own action clears the change.
    assert.deepStrictEqual(AX.bindKey(AX.bindKey(AX.normalise(null), 'dodge', 'f'), 'dodge', ' ').keys, {});
});

test('Access: a rebound key sends the key the game listens for, and the freed default key does nothing in play', () => {
    let s = AX.bindKey(AX.normalise(null), 'dodge', 'f');
    s = AX.bindKey(s, 'sprint', 'c');
    const t = AX.keyTable(s);
    assert.deepStrictEqual(AX.translateKey(t, 'F'), { key: ' ', changed: true }, 'caps lock or not');
    assert.deepStrictEqual(AX.translateKey(t, 'c'), { key: 'Shift', changed: true });
    assert.strictEqual(AX.translateKey(t, ' ').key, null, 'Space no longer dodges');
    assert.strictEqual(AX.translateKey(t, 'Shift').key, null);
    assert.deepStrictEqual(AX.translateKey(t, 'e'), { key: 'e', changed: false }, 'untouched keys pass straight through');
    // A swap: both keys translate.
    const sw = AX.keyTable(AX.bindKey(AX.normalise(null), 'attack', '2'));
    assert.strictEqual(AX.translateKey(sw, '2').key, '1'); assert.strictEqual(AX.translateKey(sw, '1').key, '2');
    assert.deepStrictEqual(AX.keyTable(AX.normalise(null)), {}, 'default layout: nothing translated');
});

test('Access: controller rebinding swaps buttons, and the default layout is the pad\'s own map', () => {
    assert.deepStrictEqual(AX.padLayout(AX.normalise(null)), Object.fromEntries(Object.entries(PAD.PLAY).map(([b, k]) => [String(b), k])));
    const s = AX.bindPad(AX.normalise(null), 'dodge', 0);   // dodge on A, attack moves to B
    const map = AX.padMap(s);
    assert.strictEqual(map.dodge, 0); assert.strictEqual(map.attack, 1);
    const L = AX.padLayout(s);
    assert.deepStrictEqual(PAD.keysFor(padState([0]), 'play', L), [' '], 'A now dodges');
    assert.deepStrictEqual(PAD.keysFor(padState([1]), 'play', L), ['1'], 'B now attacks');
    assert.deepStrictEqual(PAD.keysFor(padState([7, 0]), 'play', L), ['2'], 'RT + A is still skill slot 1, by place');
    assert.deepStrictEqual(PAD.keysFor(padState([0]), 'menu', L), ['Enter'], 'menus keep A = confirm');
    assert.strictEqual(AX.bindPad(s, 'dodge', 9), s, 'Start stays the menu');
    // Attack moved onto L3: RT + A still fires slot 1 though A holds no play action now.
    const l3 = AX.padLayout(AX.bindPad(AX.normalise(null), 'attack', 10));
    assert.deepStrictEqual(PAD.keysFor(padState([7, 0]), 'play', l3), ['2']);
    assert.deepStrictEqual(PAD.keysFor(padState([10]), 'play', l3), ['1']);
});

test('Access: prompts name the keys, controller buttons or touch controls you use, as you bound them', () => {
    const s = AX.bindKey(AX.normalise(null), 'heal', 'g');
    assert.strictEqual(AX.labels(s, 'keys').heal, 'G');
    assert.strictEqual(AX.labels(s, 'keys').dodge, 'Space');
    assert.strictEqual(AX.labels(AX.bindPad(s, 'heal', 2), 'pad').heal, 'X');
    assert.strictEqual(AX.labels(s, 'touch').heal, '✚');
    assert.strictEqual(AX.labels({ ...s, colourSafe: true }, 'keys').danger, 'Striped ground');
    assert.strictEqual(AX.labels(s, 'keys').danger, 'Red ground');
});

test('Access: screen shake is full, half or off, and auto follows reduced motion', () => {
    assert.strictEqual(AX.shakeScale(AX.normalise(null), false), 1);
    assert.strictEqual(AX.shakeScale(AX.normalise(null), true), 0);
    assert.strictEqual(AX.shakeScale({ shake: 'half' }, true), 0.5, 'an explicit choice beats reduced motion');
    assert.strictEqual(AX.shakeScale({ shake: 'off' }, false), 0);
    // The fx asks for shake on crits, parries and big blows.
    const fx = FX.createFx();
    fx.spawn('parry', { x: 0, y: 0, shake: 2 }, 0);
    const o = fx.shakeOffset(10);
    assert.ok(Math.abs(o.x) <= 2 && Math.abs(o.y) <= 2);
});

test('Access: colour-blind safe telegraphs use other colours plus stripes, and switch back', () => {
    const paint = () => {
        const cells = new Map();
        const g = { fillStyle: '', globalAlpha: 1, fillRect(x, y, w) { for (let i = 0; i < w; i++) cells.set(`${x + i},${y}`, this.fillStyle); }, save() {}, restore() {} };
        FX.telegraph(g, { kind: 'circle', x: 20, y: 20, radius: 12 }, 0.5, 0);
        return [...cells.values()];
    };
    const normal = new Set(paint());
    FX.setColourSafe(true, AX.SAFE_STATUS);
    const safe = paint();
    assert.ok(safe.includes('#f0e442') && safe.includes('#ffffff'), 'yellow fill and a white edge');
    assert.ok(!safe.includes('#c83a1c'), 'no red fill');
    assert.strictEqual(FX.statusColour('Poison'), '#009e73');
    FX.setColourSafe(false);
    assert.deepStrictEqual(new Set(paint()), normal);
    assert.strictEqual(FX.statusColour('Poison'), '#9ade4a');
});

// ---------- first-time tips ----------
test('Tips: each shows once, one at a time, and finishes when you do the thing it teaches', () => {
    const t = TUTOR.create();
    t.signal('engage', 0); t.signal('windup', 10);
    let cur = t.tick(20);
    assert.strictEqual(cur.tip.id, 'fight'); assert.strictEqual(cur.state, 'show');
    t.signal('dodge', 500);
    assert.strictEqual(t.tick(510).state, 'done');
    assert.strictEqual(t.tick(510 + TUTOR.DONE_MS), null, 'the tick clears it');
    cur = t.tick(510 + TUTOR.DONE_MS + TUTOR.GAP_MS);
    assert.strictEqual(cur.tip.id, 'parry', 'the wind-up prompt waited its turn');
    t.dismiss(9000);
    t.signal('engage', 20000);
    assert.strictEqual(t.tick(30000), null, 'never twice');
    assert.deepStrictEqual([...t.seen].sort(), ['fight', 'parry']);
});

test('Tips: a prompt fades on its own, tips can be off, and the seen list is kept per browser', () => {
    let on = true;
    const t = TUTOR.create({ enabled: () => on });
    t.signal('hearth', 0);
    assert.strictEqual(t.tick(0).tip.id, 'cook');
    assert.strictEqual(t.tick(TUTOR.SHOW_MS), null);
    on = false;
    t.signal('lowhp', 0);
    assert.strictEqual(t.tick(TUTOR.SHOW_MS * 3), null, 'off: nothing queues');
    const store = memory();
    TUTOR.saveSeen(t.seen, store);
    assert.deepStrictEqual(TUTOR.loadSeen(store), ['cook']);
    assert.deepStrictEqual(TUTOR.loadSeen({ getItem: () => '["cook","nonsense"]' }), ['cook']);
    t.reset();
    assert.strictEqual(t.seen.size, 0);
});

test('Tips: every prompt reads well for keys, controller and touch, and covers what the research asked for', () => {
    const ids = TUTOR.TIPS.map((x) => x.id);
    for (const want of ['fight', 'parry', 'heal', 'skillbar', 'cook', 'web']) assert.ok(ids.includes(want), want);
    for (const device of ['keys', 'pad', 'touch']) {
        const k = AX.labels(AX.normalise(null), device);
        for (const tip of TUTOR.TIPS) {
            const text = tip.text(k);
            assert.ok(text && !/undefined|null/.test(text), `${tip.id} on ${device}: ${text}`);
            assert.ok(text.split(/[.!?] /).length <= 3, `${tip.id}: short`);
        }
    }
    const keys = AX.labels(AX.normalise(null), 'keys');
    assert.ok(/H/.test(TUTOR.TIPS.find((x) => x.id === 'heal').text(keys)), 'heal names H');
    assert.ok(/Space/.test(TUTOR.TIPS.find((x) => x.id === 'fight').text(keys)), 'fight names Space');
    assert.ok(/LB/.test(TUTOR.TIPS.find((x) => x.id === 'parry').text(AX.labels(AX.normalise(null), 'pad'))), 'parry names LB on a pad');
});

// ---------- wiring ----------
test('Onboarding + accessibility are loaded by the game and reachable from Settings', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'world.html'), 'utf8');
    const at = (f) => html.indexOf(`src="${f}"`);
    for (const f of ['ui/access.js', 'ui/tutor.js']) assert.ok(at(f) > 0 && at(f) < at('ui/world-ui.js'), `${f} before world-ui`);
    const ui = fs.readFileSync(path.join(__dirname, '..', 'ui', 'world-ui.js'), 'utf8');
    for (const line of ['Text size', 'Colour-blind safe', 'Screen shake', 'Guard:', 'Sprint:', 'First-time tips', 'Keyboard keys', 'Controller buttons']) assert.ok(ui.includes(line), line);
    for (const sig of ["tip('engage')", "tip('windup')", "tip('heal')", "tip('hearth')", "tip('lowhp')", "tip('skillbar')", "tip('points')"]) assert.ok(ui.includes(sig), sig);
    const css = fs.readFileSync(path.join(__dirname, '..', 'world.css'), 'utf8');
    assert.ok(/body\.text-largest \{ --tk: 1\.4; \}/.test(css) && /\.dialog \{[^}]*var\(--tk, 1\)/.test(css), 'text size reaches the dialogue box');
});
