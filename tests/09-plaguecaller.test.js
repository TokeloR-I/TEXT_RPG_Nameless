// Tests moved verbatim from the old tests/run-tests.js (section: batch 3: Plaguecaller infections).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('Infection stacks to 3 at 2 dmg per stack', () => {
    const g = hallway('necromancer');
    const ghoul = g.combat.enemies[0];
    for (let i = 0; i < 5; i++) g.infect(g.player, ghoul, 1);
    const inf = g.infectionOn(ghoul);
    assert.strictEqual(inf.stacks, 3);
    assert.strictEqual(g.dotTickDamage(inf), 6);
});

test('Contagion spreads to every other enemy on death', () => {
    const g = hallway('necromancer', 'Contagion');
    g.do('contagion 3'); // rust rat
    const rat = g.combat.enemies.find((e) => e.key === 'rust_rat');
    g.damage(rat, 999, g.player);
    assert.match(g.flush().map((e) => e.text).join('\n'), /contagion bursts/);
    for (const e of g.alive(g.combat.enemies)) assert.ok(g.infectionOn(e), `${e.name} infected`);
});

test('Corpse Bloom: needs a corpse, consumes it, hits and infects all', () => {
    const g = hallway('necromancer', 'Corpse Bloom');
    g.do('corpse bloom');
    assert.match(g.text(), /no corpse on the battlefield/);
    g.combat.corpses = 1;
    g.do('corpse bloom');
    assert.match(g.text(), /A corpse bursts/);
    assert.strictEqual((g.text().match(/uses Corpse Bloom on/g) || []).length, 3);
});

test('Plague Wind: spreads the worst infection to everyone', () => {
    const g = hallway('necromancer', 'Plague Wind');
    g.do('plague wind');
    assert.match(g.text(), /nothing to spread/);
    g.infect(g.player, g.combat.enemies[0], 3);
    g.do('plague wind');
    for (const e of g.alive(g.combat.enemies)) assert.strictEqual(g.infectionOn(e).stacks, 3, e.name);
});

test('Virulent Touch + Harbinger: basic attacks infect, infections +2 dmg', () => {
    const g = hallway('necromancer');
    g.player.traits.push({ name: 'Virulent Touch' }, { name: 'All infections deal +2 dmg/turn' });
    g.do('attack 1');
    const ghoul = g.combat.enemies[0];
    if (ghoul.hp > 0) assert.strictEqual(g.dotTickDamage(g.infectionOn(ghoul)), 4);
    assert.match(g.text(), /is infected \(1\/3 stacks, 4 dmg\/turn\)/);
});
