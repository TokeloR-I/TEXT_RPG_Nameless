// Tests moved verbatim from the old tests/run-tests.js (section: Status system (Approved Design Handoff)).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('stacking: intensity rises to the cap, never beyond, and duration refreshes', () => {
    const g = hallway('necromancer');
    const ghoul = g.combat.enemies[0];
    for (let i = 0; i < 5; i++) g.infect(g.player, ghoul, 1);
    const inf = g.infectionOn(ghoul);
    assert.strictEqual(inf.stacks, 3);
    inf.duration = 1;
    g.infect(g.player, ghoul, 1);
    assert.strictEqual(inf.stacks, 3);
    assert.strictEqual(inf.duration, 3, 'refreshed to full duration');
    assert.strictEqual(ghoul.statusEffects.filter((s) => s.name === 'Infection').length, 1, 'one instance per status');
});

test('statuses without an approved cap refresh instead of stacking', () => {
    const g = hallway('warrior');
    const ghoul = g.combat.enemies[0];
    g.applyDot(g.player, ghoul, { name: 'Bleed', value: 3, duration: 3 });
    g.findStatus(ghoul, 'Bleed').duration = 1;
    g.applyDot(g.player, ghoul, { name: 'Bleed', value: 3, duration: 3 });
    assert.strictEqual(g.findStatus(ghoul, 'Bleed').stacks, 1);
    assert.strictEqual(g.findStatus(ghoul, 'Bleed').duration, 3);
});

test('overflow: OFF by default (all parameters pending)', () => {
    const g = hallway('necromancer');
    const ghoul = g.combat.enemies[0];
    for (let i = 0; i < 6; i++) g.infect(g.player, ghoul, 1);
    assert.strictEqual(g.infectionOn(ghoul).overflowChance, undefined);
    assert.doesNotMatch(g.flush().map((e) => e.text).join('\n'), /OVERFLOWS/);
});

test('overflow: chance rises on failure, resets on burst; burst = tick dmg x multiplier', () => {
    const g = gameWith((d) => { d.statusDefinitions.Infection.overflow = { baseChance: 0.2, chanceStep: 0.1, maxChance: 0.5, burstMultiplier: 2 }; });
    g.do('necromancer', 'n', 'engage');
    const ghoul = g.combat.enemies[0];
    ghoul.hp = ghoul.maxHp = 500;
    g.infect(g.player, ghoul, 3); // reaches cap: no roll yet
    const inf = g.infectionOn(ghoul);
    g.rng = () => 0.99; // fail
    g.infect(g.player, ghoul, 1); assert.strictEqual(inf.overflowChance.toFixed(2), '0.30');
    g.infect(g.player, ghoul, 1); assert.strictEqual(inf.overflowChance.toFixed(2), '0.40');
    g.infect(g.player, ghoul, 1); g.infect(g.player, ghoul, 1);
    assert.strictEqual(inf.overflowChance.toFixed(2), '0.50', 'capped at maxChance');
    inf.duration = 1;
    g.rng = () => 0; // success
    const hp = ghoul.hp;
    g.infect(g.player, ghoul, 1);
    assert.strictEqual(ghoul.hp, hp - 12, '6 dmg/tick x 2');
    assert.strictEqual(inf.overflowChance, 0.2, 'reset after burst');
    assert.strictEqual(inf.stacks, 3);
    assert.strictEqual(inf.duration, 3, 'duration always refreshes');
});

test('CR: OFF by default — repeated stuns all land', () => {
    const g = hallway('warrior');
    const ghoul = g.combat.enemies[0];
    for (let i = 0; i < 5; i++) assert.ok(stun(g, ghoul));
    assert.strictEqual(ghoul.cr, undefined);
});

test('CR: the application reaching 100 still succeeds; immunity applies to the next one', () => {
    const g = gameWith((d) => TEST_CR(d));
    g.do('warrior', 'n', 'engage');
    const ghoul = g.combat.enemies[0];
    assert.ok(stun(g, ghoul), '1st: CR 60');
    assert.ok(stun(g, ghoul), '2nd reaches 120 — still succeeds');
    assert.ok(ghoul.cr.immune);
    assert.strictEqual(stun(g, ghoul), null, '3rd is resisted');
    assert.match(g.flush().map((e) => e.text).join('\n'), /resists Stun/);
});

test('CR: recovers gradually; immunity ends below the release threshold', () => {
    const g = gameWith((d) => TEST_CR(d));
    g.do('warrior', 'n', 'engage');
    const ghoul = g.combat.enemies[0];
    stun(g, ghoul); stun(g, ghoul); // CR 120, immune
    g.tickStatusesEndOfRound(); assert.ok(ghoul.cr.immune && ghoul.cr.value === 100);
    g.tickStatusesEndOfRound(); assert.ok(ghoul.cr.immune && ghoul.cr.value === 80);
    g.tickStatusesEndOfRound(); assert.ok(ghoul.cr.immune && ghoul.cr.value === 60, 'still immune at 60');
    g.tickStatusesEndOfRound(); assert.ok(!ghoul.cr.immune && ghoul.cr.value === 40, 'released once below 50');
    assert.ok(stun(g, ghoul), 'can be controlled again');
});

test('CR: bosses build it faster but their first control still lands', () => {
    const g = gameWith((d) => TEST_CR(d));
    g.do('warrior');
    g.currentRoom = 'wardens_roost';
    g.do('engage');
    const boss = g.combat.enemies[0];
    assert.strictEqual(g.tierOf(boss), 'boss');
    assert.ok(stun(g, boss), 'first control succeeds');
    assert.strictEqual(boss.cr.value, 120, '60 x boss multiplier 2');
    assert.strictEqual(stun(g, boss), null);
});

test('CR: soft control and DoTs never build CR', () => {
    const g = gameWith((d) => { TEST_CR(d); d.statusDefinitions.Slow = { ...d.statusDefinitions.Slow, control: 'soft', crGain: 50 }; });
    g.do('warrior', 'n', 'engage');
    const ghoul = g.combat.enemies[0];
    for (let i = 0; i < 4; i++) g.applyStatus(g.player, ghoul, { name: 'Slow', type: 'slow', value: 0.5, duration: 2 });
    g.applyDot(g.player, ghoul, { name: 'Bleed', value: 1, duration: 2 });
    assert.ok(!ghoul.cr);
});

test('affinity: an immune enemy ignores that status', () => {
    const g = hallway('warrior', 'Hemorrhage');
    g.combat.enemies[0].statusAffinities = { Bleed: 'immune' };
    g.do('hemorrhage 1');
    assert.match(g.text(), /is immune to Bleed/);
    assert.ok(!g.findStatus(g.combat.enemies[0], 'Bleed'));
});

test('round-based duration: speed order does not change the number of effective ticks', () => {
    for (const [cls, label] of [['rogue', 'fast'], ['necromancer', 'slow']]) {
        const g = hallway(cls);
        const rat = g.combat.enemies.find((e) => e.key === 'rust_rat'); // SPD 16, acts first
        rat.hp = rat.maxHp = 999;
        g.player.spd = label === 'fast' ? 30 : 1; // act before vs after the poisoned rat
        g.newRound();
        g.applyDot(g.player, rat, { name: 'Poison', value: 1, duration: 3 });
        const hp = rat.hp;
        g.player.skills.push('Focus'); // harmless self-cast, so only the poison touches the rat
        for (let i = 0; i < 6 && g.mode === 'combat'; i++) g.do('focus');
        assert.strictEqual(hp - rat.hp, 3, `${label} player: exactly 3 poison ticks`);
    }
});

test('round-based duration: bonus turns (Haste) do not consume extra duration', () => {
    const g = tanky('mage', 'haste');
    g.applyStatus(g.player, g.player, { name: 'Evasion Debuff', type: 'status', duration: 2 });
    g.armStatuses(g.player);
    g.do('haste');
    assert.strictEqual(g.findStatus(g.player, 'Evasion Debuff').duration, 2, 'no tick for the bonus action');
    g.do('focus'); // round completes
    assert.strictEqual(g.findStatus(g.player, 'Evasion Debuff').duration, 1);
});

test('universal: enemy skills can apply statuses to the player (same pipeline)', () => {
    const g = gameWith((d) => { d.enemies.rust_rat.skills = [{ name: 'Venom Bite', base_damage: [1, 1], effects: [{ type: 'dot', dot_type: 'poison', value: 2, duration: 2 }] }]; });
    g.do('warrior', 'n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    assert.ok(g.findStatus(g.player, 'Poison'), 'the rat poisoned the player in round 1');
    g.do('guard');
    assert.match(g.text(), /Warrior suffers 2 Poison damage/);
});

test('universal: the player can be stunned and loses exactly one turn', () => {
    const g = hallway('warrior');
    const rat = g.combat.enemies.find((e) => e.key === 'rust_rat');
    g.applyStatus(rat, g.player, { name: 'Stun', type: 'skip_turn', duration: 1 });
    const round = g.combat.round;
    g.do('guard');
    assert.match(g.text(), /Warrior is unable to act this turn/);
    assert.ok(g.combat.awaitingContinue, 'the skipped turn pauses for input (QA-5)');
    assert.strictEqual(g.combat.round, round + 1);
    g.do('ok');
    assert.ok(!g.combat.awaitingContinue && g.combat.awaitingPlayer);
    assert.strictEqual(g.combat.round, round + 2, 'skipped exactly one turn, now acting in the round after');
});

test('universal: enemies can mark the player — Weaken lowers the player\'s damage', () => {
    const g = hallway('warrior');
    const target = { name: 'Dummy', def: 0, statusEffects: [] };
    const roll = () => { const h = g.newHit(target); g.rollDamage(g.player, target, { base_damage: [10, 10], damage_type: 'true' }, h); return h.damage; };
    g.player.critChance = 0;
    const before = roll();
    g.applyMark(g.combat.enemies[0], g.player, { mark: 'Weaken', value: 0.2, duration: 2 });
    assert.strictEqual(roll(), Math.floor(before * 0.8));
});

test('selective cleansing: removes only the named categories/statuses; no default', () => {
    const g = hallway('warrior');
    const p = g.player;
    g.applyDot(g.combat.enemies[0], p, { name: 'Poison', value: 1, duration: 3 });
    g.applyDot(g.combat.enemies[0], p, { name: 'Bleed', value: 1, duration: 3 });
    g.applyStatus(p, p, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    g.applyMark(g.combat.enemies[0], p, { mark: 'Weaken', value: 0.2, duration: 2 });
    assert.deepStrictEqual(g.cleanse(p, { categories: ['dot'] }).map((s) => s.name).sort(), ['Bleed', 'Poison']);
    assert.ok(g.findStatus(p, 'Guard') && g.findStatus(p, 'Weaken'));
    g.cleanse(p, { statuses: ['Weaken'] });
    assert.ok(!g.findStatus(p, 'Weaken') && g.findStatus(p, 'Guard'));
    assert.throws(() => g.cleanse(p, {}), /no default/);
});

test('cleanse works as a skill effect', () => {
    const g = gameWith((d) => { d.skillDefinitions['Test Purge'] = { name: 'Test Purge', cost: 0, effects: [{ type: 'cleanse', categories: ['dot'] }], target: 'self' }; });
    g.do('warrior', 'n', 'engage');
    g.player.skills.push('Test Purge');
    g.applyDot(g.combat.enemies[0], g.player, { name: 'Poison', value: 1, duration: 5 });
    g.do('test purge');
    assert.match(g.text(), /cleansed of Poison/);
});

test('reactions: only defined pairs, only on application, chance-based', () => {
    const recipe = { name: 'Test Reaction', pair: ['Bleed', 'Poison'], baseChance: 1, outcome: [{ type: 'damage', amount: 7 }] };
    const g = gameWith((d) => { d.statusReactions = [recipe]; });
    g.do('warrior', 'n', 'engage');
    const ghoul = g.combat.enemies[0];
    ghoul.hp = ghoul.maxHp = 500;
    g.applyDot(g.player, ghoul, { name: 'Poison', value: 1, duration: 3 });
    assert.strictEqual(ghoul.hp, 500, 'one status alone: no reaction');
    g.applyDot(g.player, ghoul, { name: 'Bleed', value: 1, duration: 3 });
    assert.strictEqual(ghoul.hp, 493, 'Bleed applied onto Poison: reaction');
    g.flush();
    g.tickStatusesEndOfRound(); g.tickStatusesEndOfRound();
    assert.strictEqual(ghoul.hp, 493, 'coexisting does not keep triggering');
    g.applyDot(g.player, ghoul, { name: 'Slow', value: 1, duration: 3 });
    assert.strictEqual(ghoul.hp, 493, 'undefined pair: nothing');
    const g0 = gameWith((d) => { d.statusReactions = [{ ...recipe, baseChance: 0 }]; });
    g0.do('warrior', 'n', 'engage');
    const t = g0.combat.enemies[0]; t.hp = t.maxHp = 500;
    g0.applyDot(g0.player, t, { name: 'Poison', value: 1, duration: 3 });
    g0.applyDot(g0.player, t, { name: 'Bleed', value: 1, duration: 3 });
    assert.strictEqual(t.hp, 500, '0% chance never reacts');
});

test('reactions: none ship by default and the attribute modifier is inert (Decision 16 paused)', () => {
    assert.strictEqual(data.statusReactions.length, 0);
    assert.strictEqual(newGame().reactionChanceModifier({}, {}), 0);
});
