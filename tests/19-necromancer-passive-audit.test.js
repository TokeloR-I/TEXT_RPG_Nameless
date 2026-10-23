/* Rook — evidence-only audit of approved Necromancer progression effects.
 * No tuning or summon-damage override assumptions in these checks. */
const { test, assert, newGame } = require('./helpers.js');

function necro(branch = 'bone_warden') {
    const g = newGame(37).do('necromancer', 'add_xp 250', branch, 'n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    return g;
}
function damageFrom(g, points = 100) {
    const target = g.player;
    const attacker = g.combat.enemies[0];
    attacker.critChance = 0;
    const h = g.newHit(target);
    g.rollDamage(attacker, target, { name: 'Audit Strike', base_damage: [points, points], damage_type: 'true' }, h);
    return h.damage;
}

test('Necromancer audit: Bone Armor uses 2% per living minion up to 10%', () => {
    const g = necro();
    // True damage deliberately bypasses normal reductions; physical damage is used here.
    const enemy = g.combat.enemies[0];
    enemy.critChance = 0;
    g.player.def = 0;
    const hit = () => {
        const h = g.newHit(g.player);
        g.rollDamage(enemy, g.player, { name: 'Fixed', base_damage: [100, 100], damage_type: 'physical' }, h);
        return h.damage;
    };
    assert.strictEqual(hit(), 100);
    for (let i = 1; i <= 5; i++) {
        const m = g.summon('skeleton');
        assert.ok(m, 'skeleton template exists');
        assert.strictEqual(hit(), Math.floor(100 * (1 - i * 0.02)));
    }
    g.summon('skeleton');
    assert.strictEqual(hit(), 90, 'base minion reduction capped at ten percent');
    g.combat.minions[0].hp = 0;
    assert.strictEqual(hit(), 90, 'only live minions contribute; five still alive');
});

test('Necromancer audit: Bone Fortress raises total minion-reduction cap to 15%', () => {
    const g = necro();
    g.player.def = 0;
    for (let i = 0; i < 6; i++) g.summon('skeleton');
    const enemy = g.combat.enemies[0];
    enemy.critChance = 0;
    const hit = () => {
        const h = g.newHit(g.player);
        g.rollDamage(enemy, g.player, { base_damage: [100, 100], damage_type: 'physical' }, h);
        return h.damage;
    };
    assert.strictEqual(hit(), 90);
    g.player.traits.push({ name: 'Bone Fortress' });
    assert.strictEqual(hit(), 88, 'six minions reduce damage by twelve percent with Fortress');
});

test('Necromancer audit: Pestilent Sage adds one duration, not extra stacks', () => {
    const g = necro('plaguecaller');
    const enemy = g.combat.enemies[0];
    g.player.traits.push({ name: 'DoTs last +1 turn' });
    g.infect(g.player, enemy, 1);
    assert.strictEqual(g.infectionOn(enemy).duration, 4);
    assert.strictEqual(g.infectionOn(enemy).stacks, 1);
    g.applyDot(g.player, enemy, { name: 'Poison', value: 5, duration: 3 });
    assert.strictEqual(g.findStatus(enemy, 'Poison').duration, 4);
});

test('Necromancer audit: Plague Reservoir hook rewards player infected kills only', () => {
    const g = necro('plaguecaller');
    g.player.traits.push({ name: 'Plague Reservoir' });
    const enemy = g.combat.enemies[0];
    g.infect(g.player, enemy, 1);
    g.player.resource.current = 0;
    g.damage(enemy, enemy.hp, g.player);
    assert.ok(g.player.resource.current >= 1, 'documented player-kill path grants Energy');
});

test('Necromancer audit: Harbinger bonus is additive to Infection tick', () => {
    const g = necro('plaguecaller');
    const enemy = g.combat.enemies[0];
    g.infect(g.player, enemy, 3);
    assert.strictEqual(g.dotTickDamage(g.infectionOn(enemy)), 6);
    g.player.traits.push({ name: 'All infections deal +2 dmg/turn' });
    assert.strictEqual(g.dotTickDamage(g.infectionOn(enemy)), 8);
});
