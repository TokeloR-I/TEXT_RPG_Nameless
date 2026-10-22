// Tests moved verbatim from the old tests/run-tests.js (section: combat).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('fights end in victory, give XP and clear the room', () => {
    const g = newGame(3).do('warrior', 'add_xp 20000', 'vanguard', 'n', 'engage');
    fightOut(g);
    assert.strictEqual(g.mode, 'explore');
    assert.match(g.text(), /VICTORY/);
    assert.strictEqual(g.rooms.hallway_of_chains.enemies.length, 0);
    g.do('engage');
    assert.match(g.text(), /no enemies here/);
    assertHealthy(g);
});

test('Raise Skeleton summons a skeleton that actually attacks', () => {
    const g = newGame(5).do('necromancer', 'n', 'engage');
    g.player.resource.current = 10;
    g.player.hp = g.player.maxHp = 999;
    g.do('raise skeleton');
    assert.strictEqual(g.combat.minions.length, 1);
    fightOut(g);
    assert.match(g.text(), /Skeleton uses Bone Club on/);
    assertHealthy(g);
});

test('Soul Leech heals and HP stays a number (was NaN)', () => {
    const g = newGame(2).do('necromancer', 'n', 'engage');
    g.player.hp = 40;
    g.player.resource.current = 5;
    g.do('soul leech 1');
    assert.match(g.text(), /leeches \d+ HP/);
    assertHealthy(g);
});

test('Focus gives Mana (gain_resource implemented)', () => {
    const g = newGame().do('mage', 'n', 'engage');
    const before = g.player.resource.current;
    g.do('focus');
    // +2 from Focus, +2 regen at end of round, minus nothing spent
    assert.ok(g.player.resource.current >= Math.min(before + 2, g.player.resource.max));
    assertHealthy(g);
});

test('Guard (QA-1): protects until your next turn starts, then wears off', () => {
    const g = newGame().do('warrior', 'n', 'engage', 'guard'); // warrior is slowest: guards at the end of round 1
    assert.ok(!g.findStatus(g.player, 'Guard'), 'gone at your next turn: no second defensive cycle');
    assert.match(g.text(), /\[Guard\] wears off Warrior/);
    assert.match(g.text(), /braces for impact/);
});

test('stun makes an enemy skip its turn', () => {
    const g = newGame(7).do('warrior', 'add_xp 250', 'vanguard', 'e', 'engage');
    g.player.resource.current = 3;
    g.player.hp = g.player.maxHp = 999;
    g.do('shield bash 3'); // the Drunken Shade (30 HP) survives the hit
    assert.match(g.text(), /is stunned!/);
    assert.match(g.text(), /unable to act this turn/);
});

test('QA-2: Shield Bash Oath gate, no payment, recovery exclusion', () => {
    const g = newGame(7).do('warrior', 'add_xp 250', 'vanguard', 'e', 'engage');
    const foe = g.combat.enemies[2];
    foe.hp = foe.maxHp = 999;
    const bash = g.playerSkill('Shield Bash');
    g.player.resource.current = 2;
    g.castSkill(g.player, bash, [foe]);
    assert.ok(!g.findStatus(foe, 'Stun'), 'below threshold');
    g.player.resource.current = 3;
    g.castSkill(g.player, bash, [foe]);
    assert.ok(g.findStatus(foe, 'Stun'), 'exactly three can stun');
    assert.strictEqual(g.player.resource.current, 3, 'no cost for threshold');
    assert.strictEqual(foe.shieldBashRecovery, 'await_skip');
    g.removeStatus(foe, g.findStatus(foe, 'Stun'));
    g.castSkill(g.player, bash, [foe]);
    assert.ok(!g.findStatus(foe, 'Stun'), 'blocked before recovery');
    foe.shieldBashRecovery = 'await_recovery';
    g.castSkill(g.player, bash, [foe]);
    assert.ok(!g.findStatus(foe, 'Stun'), 'blocked during recovery');
    foe.shieldBashRecovery = null;
    g.castSkill(g.player, bash, [foe]);
    assert.ok(g.findStatus(foe, 'Stun'), 'eligible after recovery');
});

test('multi-hit skills hit the right number of times', () => {
    const g = newGame().do('rogue', 'engage'); // James Newton: tanky, perfect dummy
    g.player.skills.push('Flurry');
    g.player.resource.current = 15;
    g.do('flurry 1');
    assert.match(g.text(), /Hit 3\/3/);
});

test('unimplemented skills are refused and do not waste the turn', () => {
    const g = newGame().do('necromancer', 'n', 'engage');
    g.player.skills.push('Possession');
    const se = g.player.resource.current = 5;
    const round = g.combat.round;
    g.do('possession 1');
    assert.match(g.text(), /isn't implemented yet/);
    assert.strictEqual(g.player.resource.current, se);
    assert.strictEqual(g.combat.round, round);
});

test('bad targets and unknown commands give helpful errors', () => {
    const g = newGame().do('mage', 'n', 'engage', 'arcane bolt 9', 'arcne');
    assert.match(g.text(), /Valid targets: 1, 2, 3/);
    assert.match(g.text(), /Unknown combat command/);
    assertHealthy(g);
});

test('Hollow King: Unmake erases, Void Rend builds Hollow Will', () => {
    const g = newGame().do('warrior', 'become_hollow_king', 'n', 'engage');
    g.do('attack 1');
    assert.match(g.text(), /Hollow Will/);
    g.player.resource.current = 10;
    g.do('unmake 1');
    assert.match(g.text(), /is GONE/);
    fightOut(g);
    assert.strictEqual(g.mode, 'explore');
    assertHealthy(g);
});

test('defeat ends the game and start resets the world', () => {
    const g = newGame().do('mage', 'engage'); // James Newton
    fightOut(g);
    assert.strictEqual(g.mode, 'game_over');
    g.do('start', 'warrior');
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.rooms.starting_room.enemies.length, 1);
});
