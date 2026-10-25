// Action HUD view model (ui/action-hud.js, combat v3): the one persistent HUD, fed by the engine and the action sim.
const { test, assert, GameEngine } = require('./helpers.js');
const HUD = require('../ui/action-hud.js');

const player = (over = {}) => Object.assign({
    name: 'Kaelen', level: 3, hp: 60, maxHp: 120, resource: { type: 'Mana', current: 6, max: 20 }, statusEffects: [],
    skills: [{ name: 'Arcane Bolt', cost: 0, target: 'enemy_single' }, { name: 'Focus', cost: 0, target: 'self' }, { name: 'Mana Burst', cost: 4, target: 'enemy_all' }]
}, over);
const BAR = [{ slot: 0, skillId: 'Focus' }, { slot: 1, skillId: 'Mana Burst' }, { slot: 2, skillId: null }, { slot: 3, skillId: null }, { slot: 4, skillId: null }, { slot: 5, skillId: 'Frost Nova' }];
function fakeEngine({ p = {}, rt = null, actions = null, quest = null } = {}) {
    return {
        story: quest ? {} : null,
        trackedObjective: () => quest,
        getState: () => ({ mode: rt ? 'combat' : 'explore', player: player(p) }),
        getRealtimeState: () => rt,
        getSkillBar: () => BAR,
        getAvailableActions: () => (actions ? { mode: 'combat', awaiting: 'realtime', actions } : { mode: 'explore', awaiting: 'action', actions: [{ type: 'move', direction: 'north', enabled: true }] })
    };
}
const sk = (skillId, enabled, extra = {}) => Object.assign({ type: 'skill', skillId, enabled, cost: 0, resource: 'Mana', targeting: 'self', isBasic: false, cooldownMs: 8000 }, extra);

test('action HUD keys: LMB/1 basic, 2-6 = engine slots 0-4, R = slot 5 (digit and numpad codes too)', () => {
    assert.strictEqual(HUD.slotForKey({ key: '1' }), 'basic');
    assert.strictEqual(HUD.slotForKey({ key: '!', code: 'Digit1' }), 'basic');
    assert.strictEqual(HUD.slotForKey({ key: '2' }), 0);
    assert.strictEqual(HUD.slotForKey({ key: 'x', code: 'Numpad6' }), 4);
    assert.strictEqual(HUD.slotForKey({ key: 'r', code: 'KeyR' }), 5);
    assert.strictEqual(HUD.slotForKey({ key: '7', code: 'Digit7' }), null);
    assert.strictEqual(HUD.slotForKey({ key: 'w', code: 'KeyW' }), null);
    assert.deepStrictEqual(HUD.SLOT_KEYS, ['2', '3', '4', '5', '6', 'R']);
});

test('action HUD out of combat: every equipped slot is ready, nothing on cooldown, quest from the engine, sim bits pass through', () => {
    const quest = { questId: 'q', title: 'The Homestead', kind: 'main', text: 'Find the key', marker: null };
    const m = HUD.viewModel(fakeEngine({ quest }), { stamina: { cur: 100, max: 100 }, prompt: { verb: 'Pick up', name: 'Bandages' }, notices: [{ id: 7, text: 'Bandages', kind: 'loot' }] }, 0);
    assert.strictEqual(m.inCombat, false);
    assert.strictEqual(m.slots.length, 6);
    assert.deepStrictEqual(m.slots.map((s) => s.key), ['2', '3', '4', '5', '6', 'R']);
    for (const s of m.slots) {
        if (s.empty) { assert.strictEqual(s.state, 'empty'); continue; }
        assert.strictEqual(s.state, 'ready', s.skillId);
        assert.strictEqual(s.cd, null); assert.strictEqual(s.gcd, null); assert.strictEqual(s.reason, null);
    }
    assert.strictEqual(m.slots[1].cost, 4, 'cost from the known skill');
    assert.strictEqual(m.slots[0].glyph, '◈', 'self skill glyph');
    assert.strictEqual(m.basic.skillId, 'Arcane Bolt', "a free first skill is the class's basic attack");
    assert.strictEqual(m.basic.state, 'ready'); assert.strictEqual(m.basic.swing, null);
    assert.deepStrictEqual(m.quest, { title: 'The Homestead', text: 'Find the key', where: null, kind: 'main' });
    assert.deepStrictEqual(m.prompt, { key: 'E', verb: 'Pick up', name: 'Bandages' });
    assert.deepStrictEqual(m.notices, [{ id: '7', text: 'Bandages', kind: 'loot' }]);
    assert.deepStrictEqual(m.stamina, { cur: 100, max: 100 });
    assert.strictEqual(m.boss, null); assert.strictEqual(m.lock, null); assert.strictEqual(m.barNote, null);
    assert.deepStrictEqual(m.player.resource, { name: 'Mana', cur: 6, max: 20, kind: 'mana' });
});

test('action HUD with no sim view: still a full model (no stamina, no prompt)', () => {
    const m = HUD.viewModel(fakeEngine(), null, 0);
    assert.strictEqual(m.stamina, null); assert.strictEqual(m.prompt, null); assert.deepStrictEqual(m.notices, []);
    assert.strictEqual(m.quest, null);
});

test('action HUD in combat: cooldown math, GCD, swing timer and refusal reasons straight from the engine', () => {
    const rt = { now: 2000, gcd: { remainingMs: 600, totalMs: 1000 }, basic: { remainingMs: 300, totalMs: 1200 }, cooldowns: { Focus: { remainingMs: 6000, totalMs: 8000 } } };
    const actions = [
        { type: 'attack', skillId: 'Arcane Bolt', enabled: false, reason: { code: 'ON_COOLDOWN', message: 'Swing not ready.' } },
        sk('Focus', false, { reason: { code: 'ON_COOLDOWN', message: 'Focus is on cooldown.' }, readyInMs: 6000 }),
        sk('Mana Burst', false, { cost: 4, targeting: 'enemy_all', reason: { code: 'GLOBAL_COOLDOWN', message: 'Global cooldown.' } }),
        sk('Frost Nova', false, { cost: 9, reason: { code: 'NOT_ENOUGH_RESOURCE', message: 'Not enough Mana!' } })
    ];
    const m = HUD.viewModel(fakeEngine({ rt, actions }), null, 0);
    assert.strictEqual(m.inCombat, true);
    const [focus, burst, , , , nova] = m.slots;
    assert.strictEqual(focus.state, 'cooldown');
    assert.deepStrictEqual(focus.cd, { remainingMs: 6000, totalMs: 8000, frac: 0.75 });
    assert.strictEqual(focus.gcd, null, 'a skill on its own cooldown shows no GCD sweep');
    assert.strictEqual(burst.state, 'gcd');
    assert.strictEqual(burst.gcd.frac, 0.6);
    assert.strictEqual(burst.cost, 4);
    assert.strictEqual(burst.glyph, '✺');
    assert.strictEqual(nova.state, 'nores');
    assert.deepStrictEqual(nova.reason, { code: 'NOT_ENOUGH_RESOURCE', message: 'Not enough Mana!' });
    assert.ok(nova.title.includes('Not enough Mana!'), 'the reason is in the tooltip');
    assert.strictEqual(m.basic.state, 'cooldown');
    assert.deepStrictEqual(m.basic.swing, { remainingMs: 300, totalMs: 1200, frac: 0.25 });
    assert.strictEqual(m.barNote, null, 'mixed reasons: no whole-bar note');
});

test('action HUD: cooldown from readyInMs when the realtime view has none; a skill missing from the list is unavailable', () => {
    const rt = { now: 0, gcd: null, basic: null, cooldowns: {} };
    const actions = [{ type: 'attack', skillId: 'Arcane Bolt', enabled: true }, sk('Focus', false, { reason: { code: 'ON_COOLDOWN', message: 'cd' }, readyInMs: 2000, cooldownMs: 8000 })];
    const m = HUD.viewModel(fakeEngine({ rt, actions }), null, 0);
    assert.deepStrictEqual(m.slots[0].cd, { remainingMs: 2000, totalMs: 8000, frac: 0.25 });
    assert.strictEqual(m.slots[1].state, 'disabled');
    assert.strictEqual(m.slots[1].reason.code, 'UNAVAILABLE');
});

test('action HUD: one control refusal across the whole bar becomes a single note', () => {
    const stun = { code: 'STUNNED', message: 'You are stunned!' };
    const actions = [{ type: 'attack', skillId: 'Arcane Bolt', enabled: false, reason: stun }, sk('Focus', false, { reason: stun }), sk('Mana Burst', false, { reason: stun }), sk('Frost Nova', false, { reason: stun })];
    const m = HUD.viewModel(fakeEngine({ rt: { now: 0, cooldowns: {} }, actions }), null, 0);
    assert.strictEqual(m.barNote, 'You are stunned!');
    assert.ok(m.slots.filter((s) => !s.empty).every((s) => s.state === 'disabled'));
});

test('action HUD statuses: seconds left on the fight clock, stacks, drain fraction', () => {
    const p = { statusEffects: [{ name: 'Infection', stacks: 3, rtEndsAt: 4500, rtTotalMs: 9000 }, { name: 'Guard', stacks: 1, rtEndsAt: 3200, rtTotalMs: 3000 }, { name: 'Old', stacks: 1, duration: 2 }] };
    const m = HUD.viewModel(fakeEngine({ p, rt: { now: 2000, cooldowns: {} }, actions: [] }), null, 0);
    const [inf, guard, old] = m.statuses;
    assert.strictEqual(inf.seconds, 3); assert.strictEqual(inf.left, '3s'); assert.strictEqual(inf.stacks, 3);
    assert.ok(Math.abs(inf.frac - 2500 / 9000) < 1e-9);
    assert.strictEqual(inf.category, 'dot');
    assert.strictEqual(guard.seconds, 2); assert.strictEqual(guard.stacks, 0);
    assert.strictEqual(old.seconds, null); assert.strictEqual(old.left, '2t', 'a turn-based status falls back to turns');
});

test('action HUD boss and lock-on: boss bar from the sim, lock plate names the target (not the boss twice)', () => {
    const enemies = [{ id: 'w', name: 'Wolf', hp: 8, maxHp: 20 }, { id: 'b', name: 'The Crow Warden', hp: 400, maxHp: 900, boss: true }];
    let m = HUD.viewModel(fakeEngine(), { enemies, lockTargetId: 'w', boss: { name: 'The Crow Warden', hp: 400, maxHp: 900, phase: 2 } }, 0);
    assert.deepStrictEqual(m.boss, { name: 'The Crow Warden', hp: 400, maxHp: 900, phase: 2, phases: null });
    assert.deepStrictEqual(m.lock, { id: 'w', name: 'Wolf', hp: 8, maxHp: 20 });
    m = HUD.viewModel(fakeEngine(), { enemies, lockTargetId: 'b', boss: { name: 'The Crow Warden', hp: 400, maxHp: 900, phase: 2 } }, 0);
    assert.strictEqual(m.lock.boss, true);
    m = HUD.viewModel(fakeEngine(), { enemies, lockTargetId: 'gone' }, 0);
    assert.strictEqual(m.lock, null);
});

test('action HUD on a real engine: pure, and matches getAvailableActions in and out of a realtime fight', () => {
    const g = new GameEngine({ seed: 3, combatMode: 'realtime' });
    g.start();
    g.act({ type: 'choose_class', classId: 'warrior' });
    let m = HUD.viewModel(g, null, 0);
    assert.strictEqual(m.inCombat, false);
    assert.ok(m.slots.filter((s) => !s.empty).every((s) => s.state === 'ready'));
    g.input('e'); g.input('engage');
    const before = g.snapshot().json;
    m = HUD.viewModel(g, null, 0);
    assert.strictEqual(g.snapshot().json, before, 'viewModel is pure');
    assert.strictEqual(m.inCombat, true);
    const avail = g.getAvailableActions();
    for (const s of m.slots.filter((x) => !x.empty)) {
        const o = avail.actions.find((a) => a.type === 'skill' && a.skillId === s.skillId);
        assert.strictEqual(s.enabled, o.enabled, s.skillId);
        if (!o.enabled) assert.deepStrictEqual(s.reason, o.reason);
    }
    const ready = m.slots.find((s) => s.enabled);
    assert.ok(g.act({ type: 'skill_slot', slot: ready.slot }).ok);
    g.tick(500);
    m = HUD.viewModel(g, null, 0);
    const fired = m.slots[ready.slot];
    assert.strictEqual(fired.state, 'cooldown');
    assert.ok(fired.cd.remainingMs > 0 && fired.cd.frac > 0 && fired.cd.frac < 1);
});

test('action HUD helpers: abbreviations and seconds', () => {
    assert.strictEqual(HUD.abbrev('Power Strike'), 'PS');
    assert.strictEqual(HUD.abbrev('March of the Endless Bones'), 'MEB');
    assert.strictEqual(HUD.abbrev('guard'), 'Gua');
    assert.strictEqual(HUD.secondsText(1420), '1.5');
    assert.strictEqual(HUD.secondsText(12001), '13');
    assert.strictEqual(HUD.secondsText(0), '');
});
