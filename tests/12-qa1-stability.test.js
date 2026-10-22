// Tests moved verbatim from the old tests/run-tests.js (section: QA report #1 regressions (stability)).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('QA-3: an error mid-action rolls back and keeps control (repro C)', () => {
    const g = gameWith((d) => { d.skillDefinitions['Bad Purge'] = { name: 'Bad Purge', cost: 0, effects: [{ type: 'cleanse' }], target: 'self' }; });
    g.do('warrior', 'n', 'engage');
    g.player.skills.push('Bad Purge');
    const before = JSON.stringify({ p: g.player.hp, e: g.combat.enemies.map((e) => e.hp), r: g.combat.round });
    g.do('bad purge');
    assert.match(g.text(), /internal error stopped it, and nothing happened/);
    assert.strictEqual(JSON.stringify({ p: g.player.hp, e: g.combat.enemies.map((e) => e.hp), r: g.combat.round }), before, 'state rolled back');
    assert.ok(g.combat.awaitingPlayer, 'still your turn');
    const round = g.combat.round;
    g.do('attack 1');
    assert.doesNotMatch(g.text().split('bad purge').pop(), /Not your turn/);
    assert.strictEqual(g.combat.round, round + 1, 'a normal action works right after');
    g.do('flee');
    assert.strictEqual(g.mode, 'explore');
});

test('QA-3: rollback keeps the seeded RNG in step and re-links the turn order', () => {
    const run = (withError) => {
        const g = gameWith((d) => { d.skillDefinitions['Bad Purge'] = { name: 'Bad Purge', cost: 0, effects: [{ type: 'cleanse' }], target: 'self' }; }, 9);
        g.do('rogue', 'n', 'engage');
        g.player.skills.push('Bad Purge');
        if (withError) g.do('bad purge');
        g.do('attack 1', 'attack 1', 'attack 1');
        assert.ok(g.combat === null || g.combat.order.includes(g.player), 'order holds the live player object');
        return JSON.stringify([g.player.hp, g.player.xp, g.mode]);
    };
    assert.strictEqual(run(true), run(false), 'a failed command leaves no trace in the outcome');
});

test('QA-4: self-feeding reaction recipes are disabled, so no stack overflow (repro D)', () => {
    const loop = { name: 'Loop', pair: ['Bleed', 'Poison'], baseChance: 1, outcome: [{ type: 'apply_status', status: { name: 'Poison', type: 'dot', value: 1, duration: 2 } }] };
    const g = gameWith((d) => { d.statusReactions = [loop]; });
    g.do('warrior', 'n', 'engage');
    const t = g.combat.enemies[0];
    g.applyDot(g.player, t, { name: 'Poison', value: 1, duration: 3 });
    g.applyDot(g.player, t, { name: 'Bleed', value: 1, duration: 3 }); // threw "Maximum call stack size exceeded" before
    assert.strictEqual(g.errors.length, 0);
    assert.deepStrictEqual(g.unsafeReactionIndexes(), new Set([0]));
});

test('QA-4: loops through two recipes are caught; finite chains still run', () => {
    const find = require('../src/statuses.js').findUnsafeReactions;
    const ap = (name) => [{ type: 'apply_status', status: { name, type: 'dot', value: 1, duration: 1 } }];
    const twoLoop = [
        { name: 'A', pair: ['Bleed', 'Poison'], baseChance: 1, outcome: ap('Slow') },
        { name: 'B', pair: ['Slow', 'Blind'], baseChance: 1, outcome: ap('Bleed') }
    ];
    assert.deepStrictEqual(find(twoLoop).map((u) => u.name), ['A', 'B']);
    const chain = [
        { name: 'A', pair: ['Bleed', 'Poison'], baseChance: 1, outcome: ap('Slow') },
        { name: 'B', pair: ['Slow', 'Blind'], baseChance: 1, outcome: [{ type: 'damage', amount: 3 }] }
    ];
    assert.deepStrictEqual(find(chain), [], 'a chain that ends is not touched (chain policy is a pending design decision)');
    const g = gameWith((d) => { d.statusReactions = chain; });
    g.do('warrior', 'n', 'engage');
    const t = g.combat.enemies[0]; t.hp = t.maxHp = 500;
    g.applyStatus(g.player, t, { name: 'Blind', type: 'blind', value: 0.1, duration: 3 });
    g.applyDot(g.player, t, { name: 'Poison', value: 1, duration: 3 });
    g.applyDot(g.player, t, { name: 'Bleed', value: 1, duration: 3 }); // A fires -> applies Slow onto Blind -> B fires
    assert.strictEqual(t.hp, 497);
});

test('QA-5: a permanently stunned player gets bounded, recoverable turns (repro E)', () => {
    const g = gameWith((d) => { d.enemies.crow_touched_warden.skills = [{ name: 'Chain Lock', base_damage: [1, 1], effects: [{ type: 'stun', duration: 1 }] }]; });
    g.do('warrior');
    g.currentRoom = 'wardens_roost';
    g.do('engage'); // threw "Combat loop ran away" before
    assert.strictEqual(g.errors.length, 0);
    assert.ok(g.combat.awaitingContinue);
    const r0 = g.combat.round;
    for (let i = 0; i < 25; i++) g.do('continue');
    assert.strictEqual(g.errors.length, 0);
    assert.strictEqual(g.combat.round, r0 + 25, 'exactly one round per input: bounded work');
    assert.strictEqual(g.mode, 'combat', 'no invented stun immunity: still locked (CR is pending)');
    g.do('start', 'mage');
    assert.strictEqual(g.mode, 'explore', 'the game is recoverable');
});
