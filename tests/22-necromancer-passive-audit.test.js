/* Rook — evidence-only audit of approved Necromancer progression effects.
 * No tuning or summon-damage override assumptions in these checks. */
const { test, assert, newGame } = require('./helpers.js');

function necro(branch = 'bone_warden') {
    const g = newGame(37).do('necromancer', 'add_xp 250', branch, 'n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    return g;
}
/** A Necromancer of `branch` levelled for real (dev cheat XP, so traits come from the stages) to `level`, in a fight. */
function necroAt(branch, level) {
    const g = newGame(37).do('necromancer', 'add_xp 250', branch);
    while (g.player.level < level) g.do('add_xp 10');
    g.do('n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    return g;
}

test('Necromancer audit: Bone Armor uses 2% per living minion up to 10%', () => {
    const g = necro();
    // True damage deliberately bypasses normal reductions; physical damage is used here.
    // summon() skips the minion cap: 4+ minions only happen from L14 (Black Pharaoh +3), so the 10% cap
    // can't bind in normal play before then (QA report #7 §3).
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

// Pins CURRENT behaviour only. The trait text reads "+1% dmg reduction per minion (max 15%)", but the engine only
// raises the cap from 10% to 15%; which reading is approved is open (QA report #7, QA-25, for Vaelis). Six minions
// are only reachable from L14 (Black Pharaoh +3 cap); before that the cap never binds, Fortress or not.
test('Necromancer audit: Bone Fortress currently only raises the minion-reduction cap to 15% (pending QA-25 ruling)', () => {
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

test('Necromancer audit: Plague Reservoir pays exactly +1 for your own kill of an infected enemy, and only that', () => {
    // Soul Energy gained by one kill, from 0, with a fresh fight each time.
    const gain = (level, infected, byMinion) => {
        const g = necroAt('plaguecaller', level);
        const enemy = g.combat.enemies[0];
        if (infected) g.infect(g.player, enemy, 1);
        g.player.resource.current = 0;
        g.damage(enemy, enemy.hp, byMinion ? g.summon('skeleton') : g.player);
        return g.player.resource.current;
    };
    assert.ok(necroAt('plaguecaller', 8).hasTrait('Plague Reservoir'), 'earned at L8 through the stages');
    assert.ok(!necroAt('plaguecaller', 7).hasTrait('Plague Reservoir'));
    assert.strictEqual(gain(8, true) - gain(8, false), 1, 'infected vs uninfected kill: +1');
    assert.strictEqual(gain(8, true) - gain(7, true), 1, 'with vs without the trait: +1');
    assert.strictEqual(gain(7, true), gain(7, false), 'no bonus before the trait');
    assert.strictEqual(gain(8, true, true), gain(8, false, true), "a minion's kill doesn't pay it (current rule; N-7 may change this)");
});

test('Necromancer audit: Harbinger bonus is additive to Infection tick', () => {
    const g = necro('plaguecaller');
    const enemy = g.combat.enemies[0];
    g.infect(g.player, enemy, 3);
    assert.strictEqual(g.dotTickDamage(g.infectionOn(enemy)), 6);
    g.player.traits.push({ name: 'All infections deal +2 dmg/turn' });
    assert.strictEqual(g.dotTickDamage(g.infectionOn(enemy)), 8);
});
