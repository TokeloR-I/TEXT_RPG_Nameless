// GFX-4 (#106): combat presentation events and effect timing (ui/combat-fx.js). Rendering only:
// these tests also prove that building effects never changes the game.
const { test, assert, GameEngine, data } = require('./helpers.js');
const FX = require('../ui/combat-fx.js');

function fight(cls = 'mage', seed = 2) {
    const g = new GameEngine({ seed });
    g.start();
    g.act({ type: 'choose_class', classId: cls });
    g.input('e'); g.input('engage');
    return g;
}

test('Combat FX: an attack gives a cast toward its target, a damage number on it, and deaths when HP reaches 0', () => {
    const g = fight('warrior', 3);
    const before = g.getState();
    const target = before.combat.enemies[0].id;
    g.combat.enemies[0].hp = 1;                       // make sure this hit kills
    const b2 = g.getState();
    const r = g.act({ type: 'attack', targetId: target });
    assert.ok(r.ok);
    const ev = FX.eventsFromStates(b2, g.getState(), { type: 'attack', targetId: target }, data, r.events);
    assert.deepStrictEqual(ev[0], { type: 'cast', actorId: 'player', targetIds: [target], damageType: 'physical' });
    const hit = ev.find((e) => e.type === 'damage' && e.targetId === target);
    assert.ok(hit && hit.amount === 1 && hit.damageType === 'physical', 'a killing blow shows the HP it took');
    assert.ok(ev.some((e) => e.type === 'death' && e.targetId === target));
    assert.ok(ev.findIndex((e) => e.type === 'death') > ev.findIndex((e) => e.type === 'damage'), 'deaths come after hits');
});

test('Combat FX: a magic skill is a magical projectile; damage the player takes in the same round shows on the player', () => {
    const g = fight('mage', 2);
    const before = g.getState();
    const target = before.combat.enemies[0].id;
    const action = { type: 'skill', skillId: 'Arcane Bolt', targetId: target };
    const r = g.act(action);
    assert.ok(r.ok, JSON.stringify(r.error));
    const after = g.getState();
    const ev = FX.eventsFromStates(before, after, action, data, r.events);
    assert.strictEqual(ev[0].damageType, data.skillDefinitions['Arcane Bolt'].damage_type || 'magical');
    const tookHp = before.player.hp - after.player.hp;
    const onPlayer = ev.filter((e) => e.type === 'damage' && e.targetId === 'player').reduce((t, e) => t + e.amount, 0);
    assert.strictEqual(onPlayer, Math.max(0, tookHp));
    const enemyHp = before.combat.enemies.reduce((t, e) => t + e.hp, 0) - after.combat.enemies.reduce((t, e) => t + e.hp, 0);
    assert.strictEqual(ev.filter((e) => e.type === 'damage' && e.targetId !== 'player').reduce((t, e) => t + e.amount, 0), enemyHp);
});

test('Combat FX: status changes become applied/removed events with the category from the data', () => {
    const name = Object.keys(data.statusDefinitions).find((n) => data.statusDefinitions[n].category === 'dot');
    const st = (statuses) => ({ player: { hp: 10, statusEffects: [], resource: { type: 'Mana', current: 1 } }, combat: { enemies: [{ id: 'enemy_0', hp: 9, statusEffects: statuses }] } });
    const on = FX.eventsFromStates(st([]), st([{ name }]), null, data);
    assert.deepStrictEqual(on, [{ type: 'status.applied', targetId: 'enemy_0', status: name, category: 'dot' }]);
    const off = FX.eventsFromStates(st([{ name }]), st([]), null, data);
    assert.deepStrictEqual(off, [{ type: 'status.removed', targetId: 'enemy_0', status: name, category: 'dot' }]);
    const unknown = FX.eventsFromStates(st([]), st([{ name: 'Mystery' }]), null, data);
    assert.strictEqual(unknown[0].category, 'other');
});

test('Combat FX: hits land when the projectile arrives, and every effect ends on time', () => {
    const anchor = (id) => ({ player: { x: 0, y: 100 }, e: { x: 100, y: 0 } })[id];
    const ev = FX.schedule([{ type: 'cast', actorId: 'player', targetIds: ['e'], damageType: 'magical' }, { type: 'damage', targetId: 'e', amount: 7, damageType: 'magical' }, { type: 'death', targetId: 'e' }], 1000);
    const at = (t) => FX.frame(ev, t, anchor).map((s) => s.shape);
    assert.deepStrictEqual(at(1000), ['orb'], 'only the projectile at first');
    const land = ev[1].t0;
    assert.ok(land > 1000 && land <= 1000 + FX.STYLE.durations.cast);
    assert.ok(at(land + 1).includes('number') && at(land + 1).includes('flash') && at(land + 1).includes('shake'));
    const n = FX.frame(ev, land + 1, anchor).find((s) => s.shape === 'number');
    assert.strictEqual(n.text, '-7');
    assert.ok(at(ev[2].t0 + 10).includes('burst') && at(ev[2].t0 + 10).includes('fade'));
    assert.deepStrictEqual(at(1000 + 5000), [], 'all done');
    assert.deepStrictEqual(FX.frame(ev, land + 1, () => null).filter((s) => s.shape !== 'flash' && s.shape !== 'shake' && s.shape !== 'fade'), [], 'no anchor, nothing drawn');
});

test('Combat FX: the engine\'s own combat.presentation dash event is drawn as a streak', () => {
    const ev = FX.schedule([{ type: 'combat.presentation', kind: 'dash', actorId: 'player', anchorId: 'e' }], 0);
    const s = FX.frame(ev, 10, (id) => ({ player: { x: 0, y: 0 }, e: { x: 50, y: 50 } })[id]);
    assert.strictEqual(s[0].shape, 'streak');
    assert.deepStrictEqual(FX.eventsFromStates(null, null, null, data, [{ type: 'combat.presentation', kind: 'dash', actorId: 'player', anchorId: 'e' }]).map((e) => e.kind), ['dash']);
});

test('Combat FX: deriving effects never changes the game (same state and RNG before and after)', () => {
    const g = fight('rogue', 5);
    const before = g.getState();
    const snap = JSON.stringify(g.snapshot());
    FX.eventsFromStates(before, g.getState(), { type: 'attack', targetId: before.combat.enemies[0].id }, data, []);
    assert.strictEqual(JSON.stringify(g.snapshot()), snap);
});

test('Combat FX: fleeing is not a massacre (enemies that vanish because the fight ended without a win did not die)', () => {
    const before = { player: { hp: 10, statusEffects: [] }, combat: { enemies: [{ id: 'enemy_0', hp: 9, statusEffects: [] }] } };
    const fled = { player: { hp: 10, statusEffects: [] }, combat: null, world: { lastResult: 'fled' } };
    assert.deepStrictEqual(FX.eventsFromStates(before, fled, { type: 'flee' }, data), []);
    const won = { player: { hp: 10, statusEffects: [] }, combat: null, world: { lastResult: 'victory' } };
    assert.deepStrictEqual(FX.eventsFromStates(before, won, { type: 'attack', targetId: 'enemy_0' }, data).map((e) => e.type), ['cast', 'damage', 'death']);
});
