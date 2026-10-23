/* Grave Command — Bone Warden owner-driven summon targeting. */
const { test, assert, newGame } = require('./helpers.js');

function fight() {
    const g = newGame(91).do('necromancer', 'add_xp 250', 'bone warden', 'n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    g.player.resource.current = 99;
    for (const enemy of g.combat.enemies) enemy.hp = enemy.maxHp = 500;
    const minion = g.summon('skeleton');
    assert.ok(minion);
    return { g, minion, enemies: g.combat.enemies };
}

test('Grave Command: owner attack redirects minion from default first enemy', () => {
    const { g, minion, enemies: [first, second] } = fight();
    const shots = [];
    const cast = g.castSkill.bind(g);
    g.castSkill = (caster, skill, targets) => {
        if (caster.isMinion) shots.push(targets[0].id);
        return cast(caster, skill, targets);
    };
    const skill = { name: 'Focus Probe', base_damage: [0, 0], damage_type: 'physical', effects: [] };
    g.castSkill(g.player, skill, [second]);
    g.minionTurn(minion);
    assert.deepStrictEqual(shots, [second.id]);
    g.castSkill(g.player, skill, [first]);
    g.minionTurn(minion);
    assert.deepStrictEqual(shots, [second.id, first.id]);
});

test('Grave Command: nonattack casts and summon attacks do not overwrite focus', () => {
    const { g, minion, enemies: [first, second] } = fight();
    g.castSkill(g.player, { name: 'Probe', base_damage: [0, 0], effects: [] }, [second]);
    g.castSkill(g.player, g.playerSkill('Bone Wall'), [g.player]);
    g.minionTurn(minion);
    assert.strictEqual(g.combat.graveCommandTargetId, second.id);
    assert.notStrictEqual(g.combat.graveCommandTargetId, first.id);
});

test('Grave Command: dead focus falls back to first living target', () => {
    const { g, minion, enemies: [first, second] } = fight();
    g.castSkill(g.player, { name: 'Probe', base_damage: [0, 0], effects: [] }, [second]);
    second.hp = 0;
    const selected = [];
    const cast = g.castSkill.bind(g);
    g.castSkill = (caster, skill, targets) => {
        if (caster.isMinion) selected.push(targets[0].id);
        return cast(caster, skill, targets);
    };
    g.minionTurn(minion);
    assert.deepStrictEqual(selected, [first.id]);
});

test('Grave Command: no trait leaves minion targeting unchanged', () => {
    const { g, minion, enemies: [first, second] } = fight();
    g.player.traits = g.player.traits.filter(t => t.name !== 'Grave Command');
    g.castSkill(g.player, { name: 'Probe', base_damage: [0, 0], effects: [] }, [second]);
    const selected = [];
    const cast = g.castSkill.bind(g);
    g.castSkill = (caster, skill, targets) => {
        if (caster.isMinion) selected.push(targets[0].id);
        return cast(caster, skill, targets);
    };
    g.minionTurn(minion);
    assert.deepStrictEqual(selected, [first.id]);
});

test('Grave Command: focus survives snapshot restore, resets on next battle', () => {
    const { g, enemies: [, second] } = fight();
    g.castSkill(g.player, { name: 'Probe', base_damage: [0, 0], effects: [] }, [second]);
    const saved = g.snapshot();
    g.combat.graveCommandTargetId = null;
    g.restore(saved);
    assert.strictEqual(g.combat.graveCommandTargetId, second.id);
    g.startCombat(['rust_rat', 'rust_rat']);
    assert.strictEqual(g.combat.graveCommandTargetId, null);
});
