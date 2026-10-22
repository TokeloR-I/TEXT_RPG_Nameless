// Tests moved verbatim from the old tests/run-tests.js (section: QA-1: opportunity-based expiry (approved Option A; handoff test matrix 1–14)).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('QA-1 #1: repro A — Marked for Death on a slower target survives to the Rogue\'s next attack', () => {
    const g = newGame(1).do('rogue', 'e', 'engage');
    g.player.skills.push('Marked for Death');
    g.player.hp = g.player.maxHp = 999;
    const shade = g.combat.enemies[2];
    g.do('marked for death 3');
    assert.ok(mfd(shade), 'still marked when your next turn comes (was: wore off first)');
    const n = g.log.length;
    g.do('attack 3');
    assert.match(since(g, n), /\[Marked for Death\] is consumed!/);
    assert.strictEqual(mfd(shade), null);
});

test('QA-1 #1–2: faster and slower appliers get the same single opportunity', () => {
    for (const spd of [40, 1]) for (const target of [1, 3]) { // vs Vermin (SPD 13) and Shade (SPD 7)
        const g = cellar(spd, 'Marked for Death');
        const t = g.alive(g.combat.enemies)[target - 1];
        g.do(`marked for death ${target}`);
        assert.ok(mfd(t), `spd ${spd} vs ${t.name}: available at your next turn`);
        const n = g.log.length;
        g.do(`attack ${target}`);
        assert.strictEqual((since(g, n).match(/\[Marked for Death\] is consumed!/g) || []).length, 1, `spd ${spd} vs ${t.name}: consumed exactly once`);
    }
});

test('QA-1 #3: misses, dodges and zero-damage hits do not consume; the window still ends on time', () => {
    const g = cellar(40, 'Marked for Death');
    const t = g.combat.enemies[0];
    g.do('marked for death 1');
    g.rng = () => 0.5;
    g.applyStatus(t, t, { name: 'Mirror Image', type: 'dodge', value: 1, duration: 3 });
    g.castSkill(g.player, g.playerSkill('Basic Attack'), [t]);
    assert.ok(mfd(t), 'dodged: kept');
    const def = t.def; t.def = 999;
    g.castSkill(g.player, g.playerSkill('Basic Attack'), [t]);
    assert.ok(mfd(t), 'zero damage: kept');
    t.def = def;
    g.castSkill(g.player, g.playerSkill('Basic Attack'), [t]);
    assert.strictEqual(mfd(t), null, 'first positive hit consumes');
    // window expiry without any hit: applied on turn N, gone at the end of turn N+1
    const h = cellar(40, 'Marked for Death');
    h.do('marked for death 1');
    h.do('evasion'); // turn N+1, no attack
    assert.strictEqual(mfd(h.combat.enemies[0]), null, 'expired at the end of the applier\'s next actionable turn');
    assert.match(h.text(), /\[Marked for Death\] wears off Cellar Vermin/);
});

test('QA-1 #4: multi-hit — only the first qualifying hit gets the bonus', () => {
    const g = cellar(40, 'Marked for Death', 'Flurry');
    const t = g.combat.enemies[0];
    g.do('marked for death 1');
    g.rng = () => 0.99; // no crits, max rolls: Flurry 8 + AGI 2 - DEF 1 = 9
    const n = g.log.length;
    g.do('flurry 1');
    const dmg = [...since(g, n).matchAll(/Rogue uses Flurry on Cellar Vermin for (\d+) damage/g)].map((m) => +m[1]);
    assert.deepStrictEqual(dmg, [13, 9, 9], 'first hit +50% (floor 13.5), the rest normal');
});

test('QA-1 #5: allied and summoned hits can use the mark; hostile hits cannot; no second charge', () => {
    const g = hallway('necromancer', 'Marked for Death');
    const t = g.combat.enemies[0];
    g.applyMark(g.player, t, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    g.applyMark(g.player, t, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    assert.strictEqual(t.statusEffects.filter((x) => x.name === 'Marked for Death').length, 1, 'reapply refreshes, never a 2nd charge');
    // hostile: another enemy hitting the marked enemy gets nothing and doesn't consume
    const foe = g.combat.enemies[1]; foe.critChance = 0;
    const h1 = g.newHit(t); g.rollDamage(foe, t, { base_damage: [10, 10], damage_type: 'true' }, h1);
    assert.strictEqual(h1.damage, 10); assert.ok(mfd(t), 'hostile hit does not consume');
    // summon (allied) hit uses it
    const sk = g.summon('skeleton'); sk.critChance = 0;
    const h2 = g.newHit(t); g.rollDamage(sk, t, { base_damage: [10, 10], damage_type: 'true' }, h2);
    assert.strictEqual(h2.damage, 15); assert.strictEqual(mfd(t), null, 'allied summon consumes');
});

test('QA-1 #6: Expose lasts two applier turns, faster or slower', () => {
    for (const spd of [40, 1]) {
        const g = newGame(2).do('warrior', 'n');
        g.player.spd = spd;
        g.do('engage');
        g.player.hp = g.player.maxHp = 9999;
        g.player.resource.current = g.player.resource.max = 99;
        g.player.skills.push('Expose Weakness');
        for (const e of g.combat.enemies) e.hp = e.maxHp = 500;
        const t = g.combat.enemies[0];
        g.do('expose weakness 1');            // turn N (doesn't count)
        assert.strictEqual(g.findStatus(t, 'Expose').duration, 2, `spd ${spd}`);
        g.do('guard');                        // N+1
        assert.strictEqual(g.findStatus(t, 'Expose').duration, 1, `spd ${spd}: one window used`);
        g.do('guard');                        // N+2
        assert.strictEqual(g.findStatus(t, 'Expose'), null, `spd ${spd}: gone after the second applier turn`);
    }
});

test('QA-1 #7: every hit in the Expose window benefits, none after it', () => {
    const g = hallway('warrior');
    const t = g.combat.enemies[0]; t.def = 0;
    g.player.critChance = 0; g.player.strength = 0;
    const roll = () => { const h = g.newHit(t); g.rollDamage(g.player, t, { base_damage: [10, 10], damage_type: 'physical' }, h); return h.damage; };
    g.player.normalTurns = 5;
    g.applyMark(g.player, t, { mark: 'Expose', value: 0.2, duration: 2 });
    assert.deepStrictEqual([roll(), roll(), roll()], [12, 12, 12], 'several hits, no consumption');
    g.player.normalTurns = 6; g.endNormalTurn(g.player);
    assert.strictEqual(roll(), 12, 'last-window hit still benefits');
    g.player.normalTurns = 7; g.endNormalTurn(g.player);
    assert.strictEqual(roll(), 10, 'after the window: no bonus');
});

test('QA-1 #8–9: Guard covers every hit until your next turn starts — one volley, faster or slower', () => {
    for (const spd of [40, 1]) {
        const g = guardFight(spd, 'War Cry');
        const n = g.log.length;
        g.do('guard', 'war cry', 'war cry');
        assert.strictEqual(hitsFor(g, n, 15), 3, `spd ${spd}: all 3 enemies' hits in the window are reduced`);
        assert.ok(hitsFor(g, n, 20) >= 3, `spd ${spd}: hits after the window land in full`);
        assert.match(since(g, n), /\[Guard\] wears off Warrior/);
    }
});

test('QA-1 #10: Haste bonus actions do not tick Marked/Expose or end Guard', () => {
    // Expose: turn N apply; turn N+1 = bonus action + normal action -> only one window used
    const g = cellar(40, 'Expose Weakness', 'haste');
    const t = g.combat.enemies[0];
    g.do('expose weakness 1');
    g.do('haste');
    assert.strictEqual(g.findStatus(t, 'Expose').duration, 2, 'the bonus action did not count');
    g.do('evasion');
    assert.strictEqual(g.findStatus(t, 'Expose').duration, 1, 'only the normal turn counted');
    // Marked for Death applied ON a bonus action: the turn it was applied in still doesn't count
    const h = cellar(40, 'Marked for Death', 'haste');
    const u = h.combat.enemies[0];
    h.do('haste', 'marked for death 1');
    assert.ok(mfd(u), 'available on the next turn after a bonus-action application');
    // Guard active during a bonus action is not ended by it
    const k = cellar(40, 'haste');
    k.applyStatus(k.player, k.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    k.do('haste');
    assert.ok(k.findStatus(k.player, 'Guard'), 'a bonus action does not end Guard');
});

test('QA-1 #11: a skipped (stunned) applier turn does not burn the window', () => {
    const g = guardFight(40, 'War Cry'); // player acts first every round
    const ghoul = g.combat.enemies[0];
    g.applyMark(ghoul, g.player, { mark: 'Expose', value: 0.2, duration: 2 }); // enemy applier
    g.applyStatus(g.player, ghoul, { name: 'Stun', type: 'skip_turn', duration: 1 });
    g.do('war cry');            // the ghoul's turn this round is skipped
    assert.match(g.text(), /Shackled Ghoul is unable to act/);
    assert.strictEqual(g.findStatus(g.player, 'Expose').duration, 2, 'skipped turn: window kept');
    g.do('war cry');            // ghoul's first actionable turn after application
    assert.strictEqual(g.findStatus(g.player, 'Expose').duration, 1);
    g.do('war cry');            // second
    assert.strictEqual(g.findStatus(g.player, 'Expose'), null);
});

test('QA-1 #11: Guard ends when the next turn begins even if that turn is skipped', () => {
    const g = guardFight(40, 'War Cry');
    g.applyStatus(g.player, g.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    g.applyStatus(g.combat.enemies[0], g.player, { name: 'Stun', type: 'skip_turn', duration: 1 });
    const n = g.log.length;
    g.do('war cry');            // enemies hit (guarded), then your next turn starts stunned
    const out = since(g, n);
    assert.strictEqual(hitsFor(g, n, 15), 3, 'the enemy response window was guarded');
    assert.ok(g.combat.awaitingContinue, 'your next turn is skipped');
    assert.ok(out.indexOf('[Guard] wears off Warrior') < out.indexOf('Warrior is unable to act'), 'Guard ends before the skip');
    assert.strictEqual(g.findStatus(g.player, 'Guard'), null);
});

test('QA-1 #12: refresh restarts the window; cleanse removes at once; victory clears', () => {
    const g = cellar(40, 'Marked for Death', 'Expose Weakness');
    const t = g.combat.enemies[0];
    g.do('expose weakness 1');      // N
    g.do('evasion');                // N+1: 1 left
    g.do('expose weakness 1');      // N+2: refresh -> full window again, this turn doesn't count
    assert.strictEqual(g.findStatus(t, 'Expose').duration, 2);
    g.do('evasion');
    assert.strictEqual(g.findStatus(t, 'Expose').duration, 1, 'counts from the refresh');
    g.do('marked for death 1');
    assert.deepStrictEqual(g.cleanse(t, { statuses: ['Marked for Death'] }).map((x) => x.name), ['Marked for Death'], 'cleanse removes immediately');
    assert.doesNotMatch(g.text().slice(-200), /Marked for Death\] wears off/, 'cleanse is not natural expiry');
    const v = newGame(3).do('warrior', 'n', 'engage');
    v.player.hp = v.player.maxHp = 999;
    v.applyStatus(v.player, v.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 1 });
    fightOut(v);
    assert.strictEqual(v.mode, 'explore');
    assert.deepStrictEqual(v.player.statusEffects, [], 'combat end clears combat statuses');
});

test('QA-1 #13: DoTs and other statuses keep the round-based lifecycle', () => {
    const g = hallway('warrior');
    const t = g.combat.enemies[0];
    g.applyMark(g.player, t, { mark: 'Pin', value: 0.5, duration: 2 });
    g.applyDot(g.player, t, { name: 'Bleed', value: 1, duration: 3 });
    assert.strictEqual(g.findStatus(t, 'Pin').policy, undefined, 'Pin has no opportunity policy');
    assert.strictEqual(g.findStatus(t, 'Bleed').policy, undefined, 'DoTs have no opportunity policy');
    assert.strictEqual(data.statusDefinitions.Infection.expiry, undefined);
    for (const name of ['Riposte', 'Evasion', 'Taunt']) assert.strictEqual((data.statusDefinitions[name] || {}).expiry, undefined, `${name} unchanged (not approved)`);
});

test('QA-1 #14: a rolled-back command mid-window leaves expiry and consumption identical', () => {
    const run = (withError) => {
        const g = gameWith((d) => { d.skillDefinitions['Bad Purge'] = { name: 'Bad Purge', cost: 0, effects: [{ type: 'cleanse' }], target: 'self' }; }, 1);
        g.do('rogue', 'e');
        g.player.spd = 1;
        g.do('engage');
        g.player.hp = g.player.maxHp = 9999;
        g.player.skills.push('Marked for Death', 'Bad Purge');
        g.do('marked for death 3');
        if (withError) g.do('bad purge');
        g.do('attack 3', 'evasion');
        return JSON.stringify([g.combat.enemies.map((e) => [e.hp, e.statusEffects.map((x) => `${x.name}:${x.duration}`)]), g.player.normalTurns]);
    };
    assert.strictEqual(run(true), run(false));
});

// QA-1 applier-death ruling (Creative Director, 22 Oct 2026; handoff matrix #12):
// a mark whose applier dies mid-fight keeps working until the end of that round, then goes.
/** Hallway (ghoul A, ghoul B, rat). Only ghoul A's hit puts `markName` on the player; B and the rat
 *  always hit for 20. Speeds: player 30 > ghouls 20 > rat 1, so you can kill A before it acts again. */
const markingFoes = (markName, value) => {
    const hit20 = [{ name: 'Test Hit', base_damage: [20, 20] }];
    const g = gameWith((d) => {
        const ghoul = d.enemies.shackled_ghoul, rat = d.enemies.rust_rat;
        ghoul.skills = [{ name: 'Marking Hit', base_damage: [1, 1], effects: [{ type: 'apply_mark', mark: markName, value, duration: 2 }] }];
        rat.skills = hit20;
        ghoul.spd = 20; rat.spd = 1;
        for (const e of [ghoul, rat]) { e.critChance = 0; e.hp = e.maxHp = 999; }
    });
    g.do('warrior', 'n');
    g.player.spd = 30;
    g.do('engage');
    g.player.hp = g.player.maxHp = 9999; g.player.def = 0; g.player.critChance = 0;
    g.combat.enemies[1].skills = hit20;               // ghoul B doesn't mark
    return g;
};
const at = (g, enemy) => 1 + g.alive(g.combat.enemies).indexOf(enemy);
const rat = (g) => g.combat.enemies[2];

test('QA-1 death: Expose outlives its applier until the end of that round, then goes before anyone acts', () => {
    const g = markingFoes('Expose', 0.2);
    const applier = g.combat.enemies[0];
    g.do(`attack ${at(g, rat(g))}`);                 // round 1: ghoul A marks you
    assert.strictEqual(g.findStatus(g.player, 'Expose').appliedBy, applier.id);
    applier.hp = 1;
    const n = g.log.length;
    g.do(`attack ${at(g, applier)}`);                // round 2: A dies before it can act again
    const [round2, after] = since(g, n).split('--- End of Round ---');
    assert.ok(applier.dead, 'the applier died');
    assert.strictEqual((round2.match(/Test Hit on Warrior for 24 damage/g) || []).length, 2, 'both later hits that round still get +20%');
    assert.match(after, /^\s*\[Expose\] wears off Warrior/, 'removed at the round boundary');
    assert.strictEqual(g.findStatus(g.player, 'Expose'), null, 'gone, though its window had turns left');
    const m = g.log.length;
    g.do(`attack ${at(g, rat(g))}`);                 // round 3
    assert.strictEqual((since(g, m).match(/Test Hit on Warrior for 20 damage/g) || []).length, 2, 'no Expose next round');
    assertHealthy(g);
});

test('QA-1 death: Marked for Death can still be consumed before the boundary, once', () => {
    const g = markingFoes('Expose', 0.2);
    g.combat.enemies[0].skills = g.combat.enemies[1].skills;   // nobody marks by attacking here
    const applier = g.combat.enemies[0];
    // (marked directly, or ghoul B's very next hit would consume it before the test starts)
    g.applyMark(applier, g.player, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    assert.strictEqual(mfd(g.player).appliedBy, applier.id);
    applier.hp = 1;
    const n = g.log.length;
    g.do(`attack ${at(g, applier)}`);
    const round2 = since(g, n).split('--- End of Round ---')[0];
    assert.match(round2, /Shackled Ghoul uses Test Hit on Warrior for 30 damage[\s\S]*Rust Rat uses Test Hit on Warrior for 20 damage/,
        "the dead applier's ally uses it on the first hit; the next hit gets nothing");
    assert.strictEqual(mfd(g.player), null, 'consumed');
    assert.doesNotMatch(since(g, n), /Marked for Death\] wears off/, 'consumed, not expired');
});

test('QA-1 death: revival does not cancel it; a living re-applier does; other statuses ignore death', () => {
    const g = hallway('warrior');
    const [a, b] = g.combat.enemies;
    const p = g.player;
    // revived in the same round: still expires at round end
    g.applyMark(a, p, { mark: 'Expose', value: 0.2, duration: 2 });
    g.applyMark(a, b, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    g.applyDot(a, p, { name: 'Poison', value: 1, duration: 3 });
    g.damage(a, 9999, p);
    assert.ok(g.findStatus(p, 'Expose') && mfd(b), 'still there after the death');
    a.hp = 10; a.dead = false;                       // same-round revival
    g.endRound();
    assert.strictEqual(g.findStatus(p, 'Expose'), null, 'revival does not cancel the round-end expiry');
    assert.strictEqual(mfd(b), null, 'applies to Marked for Death too');
    assert.ok(g.findStatus(p, 'Poison'), "DoTs keep their round-based life (not a universal death rule)");
    // a living applier refreshing the mark makes it a fresh application
    g.applyMark(a, p, { mark: 'Expose', value: 0.2, duration: 2 });
    g.damage(a, 9999, p);
    g.applyMark(b, p, { mark: 'Expose', value: 0.2, duration: 2 });
    g.endRound();
    assert.ok(g.findStatus(p, 'Expose'), 'refreshed by a living applier: stays');
    // erased (Unmake) counts as a death too
    const c = g.summon('skeleton');
    g.applyMark(c, b, { mark: 'Expose', value: 0.2, duration: 2 });
    g.erase(c);
    g.endRound();
    assert.strictEqual(g.findStatus(b, 'Expose'), null, 'erased applier');
});
