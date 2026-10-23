// Tests moved verbatim from the old tests/run-tests.js (section: batch 3: Mage).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('Ice Lance: 30% chance to slow', () => {
    const g = hallway('mage', 'Ice Lance');
    g.rng = () => 0.1;
    g.do('ice lance 2');
    assert.match(g.text(), /is slowed/);
});

test('Lightning Arc: chains to 2 more enemies', () => {
    const g = hallway('mage', 'Lightning Arc');
    g.do('lightning arc 1');
    assert.strictEqual((g.text().match(/lightning arcs to/g) || []).length, 2);
});

test('Confuse: 50% chance the enemy loses its turn', () => {
    const g = tanky('mage', 'confuse');
    g.rng = () => 0.1;
    g.do('confuse');
    assert.match(g.text(), /confused and will lose its next turn/);
    assert.match(g.text(), /James Newton is unable to act this turn/);
});

test('Multi-target illusions: up to 3 enemies skip', () => {
    const g = hallway('mage', 'multiTargetIllusions');
    g.do('multitargetillusions');
    assert.strictEqual((g.text().match(/is unable to act this turn/g) || []).length, 3);
});

test('Haste: act again in the same round', () => {
    const g = tanky('mage', 'haste');
    const round = g.combat.round;
    g.do('haste');
    assert.match(g.text(), /You act again!/);
    assert.strictEqual(g.combat.round, round);
    assert.ok(g.combat.awaitingPlayer);
});

test('Revert HP: back to your HP from 2 turns ago', () => {
    const g = tanky('mage', 'revertHp');
    g.do('focus', 'focus');
    const hist = g.combat.hpHistory;
    const expected = hist[hist.length - 3];
    g.do('reverthp');
    assert.match(g.text(), /wounds of the last 2 turns unravel/);
    assert.ok(g.text().includes(`→ ${expected}`));
});

test('Freeze Time: no enemy acts next turn', () => {
    const g = hallway('mage', 'freezeTime');
    g.do('freezetime');
    assert.strictEqual((g.text().match(/is unable to act this turn/g) || []).length, 3);
});

test('Chronomancer: Time Charges regen 1 per round', () => {
    const g = newGame().do('mage', 'add_xp 250', 'chronomancer');
    assert.strictEqual(g.player.resource.type, 'Time Charges');
    assert.strictEqual(g.player.resource.regen, 1);
});
