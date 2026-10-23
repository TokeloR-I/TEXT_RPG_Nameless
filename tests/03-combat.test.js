// Tests moved verbatim from the old tests/run-tests.js (section: combat).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('QA-18: Shield Discipline\'s Guard value comes from data, not engine code', () => {
    const stage = (d) => d.evolutionPaths.warrior.branches.vanguard.stages.find((s) => s.trait === 'Shield Discipline');
    assert.strictEqual(stage(data).damageReductionOverride, 0.35, 'the approved 35% lives in progression data');
    const g = gameWith((d) => { stage(d).damageReductionOverride = 0.5; });
    g.do('warrior', 'add_xp 250', 'vanguard', 'n', 'engage');
    g.castSkill(g.player, g.playerSkill('Guard'), [g.player]);
    assert.strictEqual(g.findStatus(g.player, 'Guard').value, 0.5, 'changing the data changes the game');
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'effects.js'), 'utf8');
    assert.doesNotMatch(src, /0\.35/, 'no hardcoded 35% left in effects.js');
    const other = gameWith((d) => { stage(d).damageReductionOverride = 0.5; });
    other.do('warrior', 'add_xp 250', 'berserker', 'n', 'engage');
    other.castSkill(other.player, other.playerSkill('Guard'), [other.player]);
    assert.strictEqual(other.findStatus(other.player, 'Guard').value, 0.25, 'other branches keep the base 25%');
});

test('Shield Discipline: Vanguard Guard replaces 25% reduction with 35%, without stacking', () => {
    const base = newGame(21).do('warrior', 'n', 'engage');
    const vanguard = newGame(21).do('warrior', 'add_xp 250', 'vanguard', 'n', 'engage');
    const guard = (g) => {
        g.castSkill(g.player, g.playerSkill('Guard'), [g.player]);
        return g.findStatus(g.player, 'Guard');
    };
    const warriorGuard = guard(base);
    const vanguardGuard = guard(vanguard);
    assert.strictEqual(warriorGuard.value, 0.25, 'base warrior retains 25%');
    assert.strictEqual(vanguardGuard.value, 0.35, 'Vanguard trait upgrades Guard to 35%');
    assert.strictEqual(guard(vanguard).value, 0.35, 'refresh does not compound');
    assert.strictEqual(vanguard.player.statusEffects.filter(s => s.name === 'Guard').length, 1);
    const strike = { name: 'Fixed Hit', base_damage: [20, 20], damage_type: 'physical' };
    const damage = (g) => {
        g.player.def = 0;
        const attacker = g.combat.enemies[0];
        attacker.critChance = 0;
        const hit = g.newHit(g.player);
        g.rollDamage(attacker, g.player, strike, hit);
        return hit.damage;
    };
    assert.strictEqual(damage(base), 15, '25% reduction');
    assert.strictEqual(damage(vanguard), 13, '35% reduction');
    vanguard.expireAtTurnStart(vanguard.player);
    assert.strictEqual(vanguard.findStatus(vanguard.player, 'Guard'), null, 'QA-1 next normal turn expiry unchanged');
    assert.strictEqual(damage(vanguard), 20, 'no reduction after expiry');
});

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

// Dragon's Dominion uses existing Fury cost, once-per-fight and round-based buff timing.
test("Dragon's Dominion: boss-only triple damage, no stacking, expiry and ordinary modifiers", () => {
    const g = newGame(19).do('warrior', 'engage');
    g.player.critChance = 0;
    g.player.strength = 0;
    const boss = { id: 'boss_dummy', name: 'Boss Dummy', hp: 9999, maxHp: 9999,
        def: 0, specialFlags: ['boss'], statusEffects: [], critChance: 0 };
    const ordinary = { id: 'ordinary_dummy', name: 'Ordinary Dummy', hp: 9999, maxHp: 9999,
        def: 0, specialFlags: [], statusEffects: [], critChance: 0 };
    const strike = { name: 'Fixed Strike', base_damage: [10, 10], damage_type: 'true' };
    const roll = (target) => {
        const hit = g.newHit(target);
        g.rollDamage(g.player, target, strike, hit);
        return hit.damage;
    };
    assert.strictEqual(roll(boss), 10);
    assert.strictEqual(roll(ordinary), 10);
    const dom = g.data.skillDefinitions['Dragon’s Dominion'];
    g.castSkill(g.player, { name: 'Dragon’s Dominion', ...dom }, [g.player]);
    assert.strictEqual(roll(boss), 30, '200% bonus means triple damage');
    assert.strictEqual(roll(ordinary), 10, 'non-boss unaffected');
    // Other damage modifiers continue working without being applied to non-bosses.
    g.applyStatus(g.player, boss, { name: 'Expose', type: 'mark', value: 0.2, duration: 2 });
    g.applyStatus(g.player, ordinary, { name: 'Expose', type: 'mark', value: 0.2, duration: 2 });
    assert.strictEqual(roll(boss), 36, 'Expose and Dominion compose on boss damage');
    assert.strictEqual(roll(ordinary), 12, 'Expose works normally on non-bosses');
    g.removeStatus(boss, g.findStatus(boss, 'Expose'));
    g.removeStatus(ordinary, g.findStatus(ordinary, 'Expose'));
    g.castSkill(g.player, { name: 'Dragon’s Dominion', ...dom }, [g.player]);
    assert.strictEqual(g.player.statusEffects.filter(s => s.name === 'Dragon’s Dominion').length, 1);
    assert.strictEqual(roll(boss), 30, 'reapplication refreshes instead of stacking');
    g.player.normalTurns = 1;
    g.armStatuses(g.player);
    g.tickStatusesEndOfRound();
    assert.strictEqual(roll(boss), 10, 'duration 1 wears off');
    assert.strictEqual(roll(ordinary), 10);
});

test("Dragon's Dominion: all Fury spent, once per fight and no carry-over", () => {
    const g = newGame(19).do('warrior', 'engage');
    const skillName = 'Dragon’s Dominion';
    g.player.skills.push(skillName);
    g.player.resource.type = 'Fury Gauge';
    g.player.resource.current = 5;
    g.player.resource.max = 10;
    g.do('dragon’s dominion');
    assert.match(g.text(), /Used 5 Fury Gauge/, 'all Fury was spent on activation');
    assert.strictEqual(g.combat.usedOncePerFight[skillName], true);
    assert.ok(g.findStatus(g.player, skillName), 'buff active after cast');
    g.player.resource.current = 5;
    g.do('dragon’s dominion');
    assert.match(g.text(), /only be used once per fight/);
    assert.strictEqual(g.player.resource.current, 5);
    g.mode = 'explore';
    g.combat = null;
    g.player.statusEffects = [];
    g.do('engage');
    assert.ok(!g.findStatus(g.player, skillName), 'no persistence across encounters');
    assert.ok(!g.combat.usedOncePerFight[skillName], 'usage resets per encounter');
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
    g.player.skills.push('Worldflame');
    const se = g.player.resource.current = 5;
    const round = g.combat.round;
    g.do('worldflame 1');
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
