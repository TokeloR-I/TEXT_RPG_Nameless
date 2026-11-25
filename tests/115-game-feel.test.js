// Game-feel pass (Tokelo 2026-11-25, studio research: Thorne, Hawk, Echo, Wick): sound recipes, the gamepad map,
// ambient barks, and the sim's input buffer, combo strings, aim assist and crit/wind-up cues.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const AUDIO = require('../ui/audio.js');
const PAD = require('../ui/gamepad.js');
const BARKS = require('../src/story/barks.js');
const CH1 = require('../src/story/chapter1.js');
const CH2 = require('../src/story/chapter2.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));

function sim(cls = 'warrior', seed = 115) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    return { g, s, sim: new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed }) };
}
const frames = (sm, n, input = {}) => { for (let i = 0; i < n; i++) sm.update(1000 / 60, typeof input === 'function' ? input(i) : input); };

// ---------- sound ----------
test('Sound: every recipe is well formed and on a known bus', () => {
    const waves = new Set(['sine', 'square', 'triangle', 'sawtooth', 'noise']);
    for (const [name, def] of Object.entries(AUDIO.SOUNDS)) {
        assert.ok(['sfx', 'ui', 'music'].includes(def.bus), `${name}: bus`);
        assert.ok(def.layers.length > 0, `${name}: layers`);
        for (const l of def.layers) {
            assert.ok(waves.has(l.wave), `${name}: wave ${l.wave}`);
            assert.ok(l.ms > 0 && l.ms <= 1000 && l.gain > 0 && l.gain <= 1, `${name}: envelope`);
            if (l.wave !== 'noise') assert.ok(l.f0 > 20 && l.f0 < 20000, `${name}: pitch`);
        }
    }
});

test('Sound: repeats are throttled (gap and voice cap) and settings are clamped', () => {
    const st = { last: {}, voices: {} };
    assert.ok(AUDIO.admit(st, 'hit', 0));
    assert.ok(!AUDIO.admit(st, 'hit', 10), 'inside the gap');
    assert.ok(AUDIO.admit(st, 'hit', 50));
    assert.ok(!AUDIO.admit(st, 'nope', 0), 'unknown sound');
    const s = AUDIO.readSettings('{"master":3,"sfx":-1,"muted":true,"evil":1}');
    assert.deepStrictEqual(s, { ...AUDIO.DEFAULTS, master: 1, sfx: 0, muted: true });
    assert.deepStrictEqual(AUDIO.readSettings('not json'), AUDIO.DEFAULTS);
    assert.strictEqual(AUDIO.nextLevel(1), 0);
    assert.strictEqual(AUDIO.nextLevel(0), 0.25);
    const quiet = AUDIO.create({ storage: null, AudioContext: null });
    assert.strictEqual(quiet.start(), false);
    assert.strictEqual(quiet.play('hit'), false, 'no Web Audio: a silent no-op');
});

// ---------- gamepad ----------
const pad = (buttons = [], axes = [0, 0]) => ({ axes, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })) });
test('Gamepad: face buttons map to the same keys as the keyboard; RT turns them into skills; menus confirm and go back', () => {
    const B = PAD.BUTTONS;
    assert.deepStrictEqual(PAD.keysFor(pad([B.A]), 'play'), ['1']);
    assert.deepStrictEqual(PAD.keysFor(pad([B.B]), 'play'), [' ']);
    assert.deepStrictEqual(PAD.keysFor(pad([B.RT, B.A]), 'play'), ['2']);
    assert.deepStrictEqual(PAD.keysFor(pad([B.RT, B.LB]), 'play'), ['r']);
    assert.deepStrictEqual(PAD.keysFor(pad([B.A]), 'menu'), ['Enter']);
    assert.deepStrictEqual(PAD.keysFor(pad([B.B]), 'menu'), ['Escape']);
    assert.deepStrictEqual(PAD.keysFor(pad([], [0.9, -0.9]), 'play').sort(), ['ArrowRight', 'ArrowUp']);
    assert.deepStrictEqual(PAD.keysFor(pad([], [0.2, 0.1]), 'play'), [], 'dead zone');
});

// ---------- barks ----------
test('Barks: every speaker is a story person, lines are short, and every condition names real quests', () => {
    const npcs = { ...CH1.npcs, ...CH2.npcs };
    const quests = { ...CH1.quests, ...CH2.quests };
    for (const [id, lines] of Object.entries(BARKS)) {
        assert.ok(npcs[id], `unknown npc ${id}`);
        assert.ok(lines.some((l) => !l.if), `${id} needs one line that always plays`);
        for (const l of lines) {
            assert.ok(l.say && l.say.length <= 60, `${id}: "${l.say}"`);
            for (const q of Object.keys((l.if && l.if.quests) || {})) assert.ok(quests[q], `${id}: unknown quest ${q}`);
        }
    }
    const g = new GameEngine({ seed: 1, combatMode: 'action' }); g.start(); g.input('warrior');
    for (const lines of Object.values(BARKS)) for (const l of lines) assert.strictEqual(typeof g.storyAllows(l.if), 'boolean');
});

// ---------- the sim ----------
test('Feel: a second attack pressed mid-swing is buffered and comes out as soon as the swing ends', () => {
    const r = sim('warrior');
    const swings = [];
    const orig = r.sim.startAttack.bind(r.sim);
    r.sim.startAttack = (slot) => { swings.push(r.sim.now); return orig(slot); };
    r.sim.update(1000 / 60, { attack: true });
    frames(r.sim, 20);                                  // ~350 ms into a ~480 ms swing: still swinging
    r.sim.update(1000 / 60, { attack: true });          // pressed inside the buffer window (player.inputBufferMs)
    frames(r.sim, 60);
    assert.strictEqual(swings.length, 2, 'the early press was kept, not dropped');
});

test('Feel: the warrior chains a three-hit string; a pause starts it again', () => {
    const r = sim('warrior');
    const steps = [];
    for (let i = 0; i < 3; i++) { r.sim.update(1000 / 60, { attack: true }); steps.push(r.sim.player.attack && r.sim.player.attack.comboStep); frames(r.sim, 40); }
    assert.deepStrictEqual(steps, [0, 1, 2]);
    frames(r.sim, 120);                                 // 2 s: the string resets
    r.sim.update(1000 / 60, { attack: true });
    assert.strictEqual(r.sim.player.attack.comboStep, 0);
});

test('Feel: in a fight an unaimed swing turns to a nearly-faced enemy (aim assist)', () => {
    const r = sim('warrior', 7);
    const map = WORLD.maps.grounds;
    r.s.place('grounds', Object.keys(map.spawns)[0]);
    r.sim = new ActionSim({ engine: r.g, session: r.s, rules: r.g.data.actionRules, seed: 7 });
    const rats = r.sim.actors.filter((a) => a.encounterId === 'grounds_weed_rats');
    assert.ok(rats.length, 'the rats');
    const p = r.sim.player;
    p.x = rats[0].x - 30; p.y = rats[0].y;
    r.sim.engageNearest();
    assert.ok(r.sim.engaged, 'engaged');
    r.sim.syncFromEngine();
    for (const a of rats.slice(1)) { a.x += 200; }   // only the first rat is near
    p.angle = 25 * Math.PI / 180;
    r.sim.assistAim(r.g.data.actionRules.classes.warrior.weapon);
    assert.ok(Math.abs(p.angle - Math.atan2(rats[0].y - p.y, rats[0].x - p.x)) < 1e-6, `turned to the rat (angle ${p.angle})`);
    p.angle = Math.PI / 2;                            // facing well away: no snap
    r.sim.assistAim(r.g.data.actionRules.classes.warrior.weapon);
    assert.strictEqual(p.angle, Math.PI / 2);
});

test('Feel: the engine marks a player crit on its hit line, so the sim can show and sound it', () => {
    const g = new GameEngine({ seed: 3, combatMode: 'action' }); g.start(); g.input('rogue'); g.enterWorld();
    g.actionEngage('grounds_weed_rats', ['rust_rat'], null, { mapId: 'grounds', x: 80, y: 240 });
    g.player.critChance = 1;
    const c = g.actionCast('attack');
    const r = g.actionResolve(c.castId, ['enemy_0']);
    const line = r.events.find((e) => e.type === 'text' && e.crit);
    assert.ok(line && line.targetId === 'enemy_0', JSON.stringify(r.events.filter((e) => e.type === 'text')));
});
