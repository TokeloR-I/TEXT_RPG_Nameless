// Tests moved verbatim from the old tests/run-tests.js (section: damage over time).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('Hemorrhage: Bleed ignores armor, 3 dmg x 3 turns, then wears off', () => {
    const g = newtonFight('warrior');
    g.player.skills.push('Hemorrhage');
    g.do('hemorrhage', 'guard', 'guard');
    const newton = g.combat.enemies[0];
    assert.strictEqual(newton.hp, 666 - 9, 'exactly 3 ticks');
    g.do('guard');
    assert.strictEqual(newton.hp, 657, 'no 4th tick');
    assert.ok(!newton.statusEffects.some((s) => s.type === 'dot'));
});

test('Black Spit poison: 5 dmg x 3 turns', () => {
    const g = newtonFight('necromancer');
    g.player.skills.push('Black Spit');
    g.do('black spit', 'black spit 1');
    // second cast refreshes instead of stacking
    const newton = g.combat.enemies[0];
    assert.strictEqual(newton.statusEffects.filter((s) => s.name === 'Poison').length, 1);
});

test('DoT kills give corpses and Soul Energy to the applier', () => {
    const g = newGame().do('necromancer', 'n', 'engage');
    const rat = g.combat.enemies.find((e) => e.key === 'rust_rat');
    g.player.resource.current = 0;
    g.applyDot(g.player, rat, { name: 'Poison', value: 50, duration: 3 });
    g.startTurn(rat);
    assert.ok(rat.hp <= 0);
    assert.match(g.flush().map((e) => e.text).join('\n'), /Rust Rat has been defeated![\s\S]*Total corpses: 1[\s\S]*gained 2 Soul Energy/);
});

test('Pestilent Sage trait: DoTs last +1 turn', () => {
    const g = newGame().do('necromancer', 'n', 'engage');
    g.player.traits.push({ name: 'DoTs last +1 turn' });
    const ghoul = g.combat.enemies[0];
    g.applyDot(g.player, ghoul, { name: 'Poison', value: 1, duration: 3 });
    assert.strictEqual(ghoul.statusEffects.find((s) => s.name === 'Poison').duration, 4);
});

test('a stunned enemy still takes DoT damage', () => {
    const g = newGame().do('warrior', 'engage');
    const newton = g.combat.enemies[0];
    g.addStatus(newton, { name: 'Stun', type: 'skip_turn', duration: 1 });
    g.applyDot(g.player, newton, { name: 'Bleed', value: 4, duration: 2 });
    assert.strictEqual(g.startTurn(newton), true);
    assert.strictEqual(newton.hp, 662);
});

test("'attack' is always free (falls back to Basic Attack when the class skill costs resource)", () => {
    const g = newGame().do('necromancer', 'n', 'engage');
    g.player.resource.current = 0;
    g.do('attack 1');
    assert.match(g.text(), /Necromancer uses Basic Attack on/);
    assert.strictEqual(newGame().do('warrior').basicAttackName(), 'Slash');
});
