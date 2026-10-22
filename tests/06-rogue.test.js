// Tests moved verbatim from the old tests/run-tests.js (section: batch 3: Rogue).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('Evasion: dodge the next attack (and it can fail)', () => {
    const g = tanky('rogue');
    g.rng = () => 0;
    const hp = g.player.hp;
    g.do('evasion');
    assert.match(g.text(), /Rogue dodges! \(Evasion\)/);
    assert.strictEqual(g.player.hp, hp);
    const g2 = tanky('rogue');
    g2.rng = () => 0.99;
    g2.do('evasion');
    assert.match(g2.text(), /Evasion fails/);
});

test('Mirror Image: the next hit always misses', () => {
    const g = tanky('mage', 'mirrorImage');
    g.rng = () => 0.999;
    g.do('mirrorimage');
    assert.match(g.text(), /was an illusion/);
});

test('Assassin: Stealth Tokens come from dodges', () => {
    const g = newGame().do('rogue', 'add_xp 250', 'assassin', 'engage');
    assert.strictEqual(g.player.resource.type, 'Stealth Tokens');
    assert.strictEqual(g.player.resource.regen, 0);
    g.player.hp = 9999;
    g.player.resource.current = 0;
    g.player.skills.push('Evasion');
    g.rng = () => 0;
    g.do('evasion');
    assert.match(g.text(), /\+1 Stealth Tokens \(dodge\)/);
});

test('Duelist: Combo Points from basic attacks, Riposte counters', () => {
    const g = newGame().do('rogue', 'add_xp 250', 'duelist', 'engage');
    assert.strictEqual(g.player.resource.type, 'Combo Points');
    g.player.hp = 9999;
    g.player.resource.current = 0;
    g.do('attack 1');
    assert.match(g.text(), /\+1 Combo Points \(combo\)/);
    g.do('riposte');
    assert.match(g.text(), /Riposte! Rogue counters James Newton/);
});

test('Shadowstep: next hit is a guaranteed crit', () => {
    const g = hallway('rogue', 'Shadowstep');
    g.rng = () => 0.99; // no natural crits
    g.do('shadowstep 1', 'attack 1');
    assert.match(g.text(), /next hit will be a critical strike/);
    assert.match(g.text(), /Rogue uses Basic Attack on .* \(CRITICAL HIT!\)/);
    assert.match(g.text(), /Not implemented yet: teleport_to_enemy/);
});

test('Garrote: silenced enemies fall back to a basic attack', () => {
    const g = tanky('rogue', 'Garrote');
    g.do('garrote');
    assert.match(g.text(), /James Newton is silenced!/);
    assert.match(g.text(), /silenced and can only flail/);
    assert.match(g.text(), /James Newton uses Basic Attack/);
});

test('Assassinate: refused above 20% HP (free), kills below', () => {
    const g = tanky('rogue', 'Assassinate');
    const res = g.player.resource.current;
    g.do('assassinate');
    assert.match(g.text(), /too healthy to assassinate/);
    assert.strictEqual(g.player.resource.current, res);
    g.combat.enemies[0].hp = 100;
    g.do('assassinate');
    assert.match(g.text(), /VICTORY/);
});

test('Caltrops: all enemies slowed 50%', () => {
    const g = hallway('rogue', 'Caltrops');
    g.do('caltrops');
    const rat = g.combat.enemies.find((e) => e.key === 'rust_rat');
    assert.strictEqual(g.speedOf(rat), 8);
});

test('Smoke Bomb: blinded enemies can miss', () => {
    const g = tanky('rogue', 'Smoke Bomb');
    g.rng = () => 0.1; // under the 25% miss chance
    g.do('smoke bomb', 'evasion'); // Newton's next turn happens inside this command
    assert.match(g.text(), /swings blindly and misses/);
});

test('Poison Trap: next enemy to act is poisoned; max 3 traps', () => {
    const g = tanky('rogue', 'Poison Trap');
    g.do('poison trap');
    assert.match(g.text(), /James Newton steps on your poison trap/);
    assert.match(g.text(), /afflicted with Poison \(4 dmg\/turn/);
    g.combat.traps = [{}, {}, {}];
    g.do('poison trap');
    assert.match(g.text(), /already have 3 traps/);
});

test('Clockwork Bomb: no damage on cast, explodes on your next turn', () => {
    const g = hallway('rogue', 'Clockwork Bomb');
    const before = g.combat.enemies.map((e) => e.hp);
    g.do('clockwork bomb');
    assert.match(g.text(), /Tick\.\.\. tick/);
    assert.match(g.text(), /💥 Your Clockwork Bomb explodes!/);
    assert.ok(g.combat === null || g.combat.enemies.some((e, i) => e.hp < before[i]));
});
