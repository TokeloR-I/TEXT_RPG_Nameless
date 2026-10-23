// Tests moved verbatim from the old tests/run-tests.js (section: marks & Warden).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('Warden resource is now Vigil (was "Mark Tokens"/"Marks")', () => {
    const g = warden();
    assert.strictEqual(g.player.resource.type, 'Vigil');
    for (const s of ['Pincushion', 'Lockstep', 'Expose Weakness', 'Fortress', 'Total Lockdown']) {
        assert.strictEqual(data.skillDefinitions[s].resource, 'Vigil', s);
    }
});

test('[Pin] halves speed and changes turn order next round', () => {
    const g = warden().do('n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    g.do('pincushion 3'); // Rust Rat, SPD 16
    const rat = g.combat.enemies.find((e) => e.key === 'rust_rat');
    assert.ok(rat.statusEffects.some((s) => s.name === 'Pin'));
    assert.strictEqual(g.speedOf(rat), 8);
    const order = g.combat.order.map((c) => c.id);
    assert.ok(order.indexOf('player') < order.indexOf(rat.id), 'player (SPD 9) should now act before the pinned rat (SPD 8)');
});

test('marks (round-based): "2 turns" = 2 of the holder\'s turns, then wear off', () => {
    const g = warden().do('n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    g.do('pincushion 1', 'guard'); // ghoul already acted in round 1, so rounds 2 and 3 count
    const ghoul = g.combat.enemies[0];
    assert.strictEqual(g.findStatus(ghoul, 'Pin').duration, 1, 'one effective turn used');
    g.do('guard');
    assert.ok(!g.findStatus(ghoul, 'Pin'), 'gone after 2 effective turns');
    assert.match(g.text(), /\[Pin\] wears off Shackled Ghoul/);
});

test('re-applying a mark refreshes it instead of stacking', () => {
    const g = warden().do('n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    g.do('pincushion 1', 'pincushion 1');
    assert.strictEqual(g.combat.enemies[0].statusEffects.filter((s) => s.name === 'Pin').length, 1);
});

test('[Expose] +20% damage taken, [Weaken] -20% damage dealt', () => {
    const g = warden().do('n', 'engage');
    assert.strictEqual(dummyHit(g).hit.damage, 10);
    assert.strictEqual(dummyHit(g, [], [mark('Expose', 0.2)]).hit.damage, 12);
    assert.strictEqual(dummyHit(g, [mark('Weaken', 0.2)]).hit.damage, 8);
});

test('[Marked for Death] +50% on the next hit only, then consumed', () => {
    const g = warden().do('n', 'engage');
    const { hit, target } = dummyHit(g, [], [mark('Marked for Death', 0.5, 1)]);
    assert.strictEqual(hit.damage, 15);
    assert.strictEqual(target.statusEffects.length, 0);
});

test('Synergy Marks trait: +10% vs any marked enemy', () => {
    const g = warden().do('n', 'engage');
    g.player.traits.push({ name: 'Synergy Marks' });
    assert.strictEqual(dummyHit(g, [], [mark('Pin', 0.5)]).hit.damage, 11);
    assert.strictEqual(dummyHit(g).hit.damage, 10);
});

test('Vigil: +1 at end of a round where a marked enemy took damage', () => {
    const g = warden(2).do('n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    g.player.resource.current = 0;
    g.do('pincushion 1');
    assert.strictEqual(g.player.resource.current, 0, 'marking alone gives nothing');
    g.do('attack 1');
    assert.match(g.text(), /Your Vigil grows/);
    assert.ok(g.player.resource.current >= 1);
});

test("Hunter's Instinct: the first mark each turn is free", () => {
    const g = warden().do('n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    g.player.skills.push('Expose Weakness');
    g.player.resource.current = 0;
    g.do('expose weakness 1'); // costs 1 normally
    assert.ok(g.combat.enemies[0].statusEffects.some((s) => s.name === 'Expose'));
    assert.match(g.text(), /first mark this turn is free/);
    assert.strictEqual(g.player.resource.current, 0);
});

test('Raise Ghoul: the ghoul\'s hits apply [Weaken]', () => {
    const g = newGame(4).do('necromancer', 'n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    g.player.resource.current = 10;
    g.player.skills.push('Raise Ghoul');
    g.do('raise ghoul');
    for (let i = 0; i < 4 && g.mode === 'combat'; i++) g.do('soul leech 1');
    assert.match(g.text(), /Ghoul uses Claw Attack/);
    assert.match(g.text(), /is marked: \[Weaken\]/);
    assertHealthy(g);
});

test('Black Spit: applies [Weaken] and Poison', () => {
    const g = newGame().do('necromancer', 'n', 'engage');
    g.player.skills.push('Black Spit');
    g.player.resource.current = 5;
    g.do('black spit 1');
    assert.match(g.text(), /marked: \[Weaken\]/);
    assert.match(g.text(), /afflicted with Poison \(5 dmg\/turn for 3 turns\)/);
    assert.doesNotMatch(g.text(), /Not implemented yet/);
});
