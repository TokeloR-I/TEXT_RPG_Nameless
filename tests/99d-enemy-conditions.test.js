// Enemy condition attacks (Tokelo 2026-11-17: "the enemies also have their specific condition attack like the wolf bite
// causing bleed"): the 'inflict' rider on enemy skills (src/effects.js), guarded blows, and the items that cure them.
const { test, assert, GameEngine } = require('./helpers.js');

function actionGame(cls = 'warrior', seed = 58) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start();
    g.input(cls);
    assert.ok(g.act({ type: 'enter_world' }).ok);
    g.flush();
    return g;
}
const engage = (g, keys) => g.actionEngage('test_group', keys, null, { mapId: 'grounds', x: 80, y: 240 });
const strike = (g, id = 'enemy_0', opts = {}) => { assert.ok(g.actionEnemyWindup(id).ok); return g.actionEnemyStrike(id, opts); };
const status = (g, name) => g.player.statusEffects.find((s) => s.name === name) || null;

test('Enemy conditions: every inflict rider names a known condition with sane numbers', () => {
    const g = new GameEngine({ seed: 1 });
    const defs = g.data.statusDefinitions;
    let n = 0;
    for (const [key, e] of Object.entries(g.data.enemies)) for (const sk of e.skills) for (const f of sk.effects || []) {
        if (f.type !== 'inflict') continue;
        n++;
        assert.ok(['Bleed', 'Poison', 'Burn', 'Slow'].includes(f.status) && defs[f.status], `${key} ${sk.name}: ${f.status}`);
        assert.ok(f.chance > 0 && f.chance <= 1, `${key} ${sk.name}: chance`);
        assert.ok(f.seconds > 0 && f.duration >= 1, `${key} ${sk.name}: durations`);
        if (f.status === 'Slow') assert.ok(f.value > 0 && f.value < 1, `${key} ${sk.name}: slow share`);
        else assert.ok(Number.isInteger(f.value) && f.value > 0 && f.stackCap >= 1, `${key} ${sk.name}: DoT value and cap`);
    }
    assert.ok(n >= 30, `${n} condition attacks`);
    const bite = (k) => g.data.enemies[k].skills[0].effects[0];
    assert.strictEqual(bite('hungry_wolf').status, 'Bleed', 'the wolf bite bleeds');
    assert.strictEqual(bite('rust_rat').status, 'Poison');
    assert.strictEqual(g.data.enemies.cult_zealot.skills[0].effects[0].status, 'Burn');
});

test('Enemy conditions: a wolf bite that lands makes you bleed on the fight clock, and it ticks you down', () => {
    const g = actionGame();
    engage(g, ['hungry_wolf']);
    g.rng = () => 0;   // every roll lands (the bite's 50%)
    g.player.hp = g.player.maxHp = 9999;
    const r = strike(g);
    assert.strictEqual(r.result, 'hit');
    assert.deepStrictEqual(r.inflicted, ['Bleed'], 'the sim is told, to float BLEED over you');
    const b = status(g, 'Bleed');
    assert.ok(b && b.type === 'dot' && b.category === 'dot');
    assert.strictEqual(b.rtTotalMs, 5000, 'its live seconds, not turns x 3 s');
    const hp = g.player.hp;
    g.tick(1000);
    assert.ok(g.player.hp < hp, 'the bleed ticks');
    for (let i = 0; i < 6; i++) strike(g);
    assert.strictEqual(status(g, 'Bleed').stacks, 3, 'the wolf stacks it only to its own cap');
    assert.ok(g.actionView().player.statuses.some((s) => s.name === 'Bleed' && s.stacks === 3), 'the HUD sees it');
});

test('Enemy conditions: a blow taken on the guard, dodged or missed carries no condition', () => {
    const g = actionGame();
    engage(g, ['hungry_wolf']);
    g.rng = () => 0;
    g.player.hp = g.player.maxHp = 9999;
    const r = strike(g, 'enemy_0', { guarded: true });
    assert.strictEqual(r.result, 'guarded');
    assert.deepStrictEqual(r.inflicted, []);
    assert.strictEqual(strike(g, 'enemy_0', { hit: false }).result, 'miss');
    assert.strictEqual(status(g, 'Bleed'), null);
    assert.ok(!('guardedStrike' in g.combat) && !('inflicted' in g.combat), 'no bookkeeping left on the fight');
});

test('Enemy conditions: grasping things slow you, and the slow reaches the sim', () => {
    const g = actionGame();
    engage(g, ['mire_dead']);
    g.rng = () => 0;
    g.player.hp = g.player.maxHp = 9999;
    assert.ok(g.actionEnemyWindup('enemy_0', { skill: 'Peat Grip' }).ok);
    const r = g.actionEnemyStrike('enemy_0');
    assert.deepStrictEqual(r.inflicted, ['Slow']);
    assert.ok(g.actionView().player.speedMult < 1);
});

test('Enemy conditions: Bandages stop a bleed, herbs draw out poison, even at full HP; quick heal reaches for the cure', () => {
    const g = actionGame();
    engage(g, ['hungry_wolf']);
    g.rng = () => 0;
    g.player.hp = g.player.maxHp = 9999;
    strike(g);
    g.player.hp = g.player.maxHp;
    g.player.inventory.push('Healing Herb Bundle', 'Bandages');
    assert.strictEqual(g.quickHealChoice().item, 'Bandages', 'bleeding: the bandage, though the herbs heal more');
    g.player.statusEffects = g.player.statusEffects.filter((s) => s.name !== 'Bleed');
    assert.strictEqual(g.quickHealChoice().reason.code, 'FULL_HEALTH', 'nothing to cure, nothing lost');

    const t = new GameEngine({ seed: 3 });
    t.start(); t.input('mage');
    t.player.inventory.push('Bandages', 'Healing Herb Bundle');
    t.applyStatus(t.player, t.player, { name: 'Poison', type: 'dot', value: 1, duration: 2 });
    assert.ok(t.applyItem('Healing Herb Bundle'), 'usable at full HP while poisoned');
    assert.strictEqual(t.findStatus(t.player, 'Poison'), null);
    assert.ok(!t.applyItem('Bandages'), 'a bandage at full HP with nothing to bind is refused');
});
