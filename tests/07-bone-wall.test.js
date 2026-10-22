// Tests moved verbatim from the old tests/run-tests.js (section: Bone Warden: Bone Wall).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('Bone Wall: L3 cast registers one timed absorb; command charges Soul Energy', () => {
    const g = boneWallFight();
    const wall = armBoneWall(g);
    assert.ok(wall, 'Bone Wall should be active immediately after cast');
    assert.strictEqual(wall.type, 'absorb');
    assert.strictEqual(wall.duration, 1);
    assert.doesNotMatch(g.flush().map(e => e.text || '').join('\\n'), /Not implemented yet: absorb_hit/);
    const costGame = boneWallFight();
    const resource = costGame.player.resource.current;
    costGame.do('bone wall');
    // QA-12: exact cost. A wall turn deals no damage, so no Soul Energy can come back before input returns.
    assert.strictEqual(costGame.player.resource.current, resource - 1, 'Bone Wall costs exactly 1 Soul Energy');
    assert.match(costGame.text(), /Used 1 Soul Energy/);
    assert.doesNotMatch(costGame.text(), /Not implemented yet: absorb_hit/);
    assert.match(costGame.text(), /raises a wall of bone/);
});

test('Bone Wall: one connecting enemy hit is fully absorbed, then next hit deals damage', () => {
    const g = boneWallFight();
    g.rng = () => 0.99;
    assert.ok(armBoneWall(g));
    g.flush();
    const hp = g.player.hp;
    incomingBoneWallHit(g);
    assert.strictEqual(g.player.hp, hp, 'first hit must deal no damage');
    assert.strictEqual(g.findStatus(g.player, 'Bone Wall'), null, 'wall is consumed');
    assert.match(g.flush().map(e => e.text || '').join('\\n'), /Bone Wall absorbs/);
    incomingBoneWallHit(g);
    assert.ok(g.player.hp < hp, 'next hit must land normally');
});

test('Bone Wall: missed attacks do not consume it and existing dodge still takes priority', () => {
    const g = boneWallFight();
    assert.ok(armBoneWall(g));
    const attacker = g.combat.enemies[0];
    g.applyStatus(g.player, attacker, { name: 'Blind', type: 'blind', value: 1, duration: 1 });
    g.rng = () => 0;
    incomingBoneWallHit(g);
    assert.ok(g.findStatus(g.player, 'Bone Wall'), 'blind miss did not consume wall');
    g.removeStatus(attacker, g.findStatus(attacker, 'Blind'));
    g.applyStatus(g.player, g.player, { name: 'Mirror Image', type: 'dodge', value: 1, duration: 1 });
    incomingBoneWallHit(g);
    assert.ok(g.findStatus(g.player, 'Bone Wall'), 'dodge protected wall');
    assert.ok(!g.findStatus(g.player, 'Mirror Image'), 'dodge was consumed');
    incomingBoneWallHit(g);
    assert.ok(!g.findStatus(g.player, 'Bone Wall'), 'next connecting hit consumes wall');
});

test('Bone Wall: failed dodge falls through to absorb; guarding stays independent', () => {
    const g = boneWallFight();
    assert.ok(armBoneWall(g));
    g.applyStatus(g.player, g.player, { name: 'Evasion', type: 'dodge', value: 0, duration: 1 });
    g.applyStatus(g.player, g.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    const hp = g.player.hp;
    g.rng = () => 0.99;
    incomingBoneWallHit(g);
    assert.strictEqual(g.player.hp, hp);
    assert.ok(!g.findStatus(g.player, 'Evasion'));
    assert.ok(!g.findStatus(g.player, 'Bone Wall'));
    assert.ok(g.findStatus(g.player, 'Guard'), 'Guard remains independent');
});
