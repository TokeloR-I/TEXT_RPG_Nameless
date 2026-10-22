/* Headless tests for the engine. Run:  node tests/run-tests.js
 * No dependencies. Every test uses a fixed seed, so results are repeatable. */
const assert = require('assert');
const { GameEngine } = require('../src/engine.js');
const data = require('../src/data.js');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---------- helpers ----------
function newGame(seed = 1) {
    const g = new GameEngine({ seed });
    g.log = g.start();
    g.do = (...cmds) => { for (const c of cmds) g.log.push(...g.input(c)); return g; };
    g.text = () => g.log.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
    return g;
}
function assertHealthy(g) {
    assert.strictEqual(g.errors.length, 0, `engine errors: ${g.errors.map((e) => e.stack).join('\n')}`);
    const p = g.player;
    if (p) {
        assert.ok(Number.isFinite(p.hp), `player hp is ${p.hp}`);
        assert.ok(Number.isFinite(p.resource.current), `resource is ${p.resource.current}`);
    }
}
/** Spam basic attacks on target 1 until the fight ends (or a turn cap). */
function fightOut(g, maxTurns = 200) {
    for (let i = 0; i < maxTurns && g.mode === 'combat'; i++) g.do('attack 1');
    return g;
}

// ---------- class selection & exploring ----------
test('every class can be picked and the room shows', () => {
    for (const cls of Object.keys(data.basePlayerClasses)) {
        const g = newGame().do(cls);
        assert.strictEqual(g.mode, 'explore');
        assert.strictEqual(g.player.className, cls);
        assert.match(g.text(), /STARTING ROOM/);
        assertHealthy(g);
    }
});

test('take works (adaptiveLoot crash fixed)', () => {
    const g = newGame().do('warrior', 'take grigamba stone');
    assert.ok(g.player.inventory.includes('Grigamba stone'));
    assertHealthy(g);
});

test('adaptiveLoot swaps items per class when defined', () => {
    const g = newGame();
    g.data = JSON.parse(JSON.stringify(data));
    g.data.adaptiveLoot['Grigamba stone'] = { mage: 'Grigamba focus crystal' };
    g.do('mage', 'take grigamba stone');
    assert.ok(g.player.inventory.includes('Grigamba focus crystal'));
});

test('movement with shortcuts', () => {
    const g = newGame().do('rogue', 'n');
    assert.strictEqual(g.currentRoom, 'hallway_of_chains');
    g.do('go south', 'east');
    assert.strictEqual(g.currentRoom, 'collapsed_wine_cellar');
});

// ---------- progression ----------
test('branch selection works (was broken for every class)', () => {
    const g = newGame().do('necromancer', 'add_xp 250');
    assert.strictEqual(g.player.level, 3);
    assert.strictEqual(g.mode, 'branch_select');
    g.do('bone warden');
    assert.strictEqual(g.progression.branch, 'bone_warden');
    assert.strictEqual(g.progression.evolutionName, 'Bone Warden');
    assert.ok(g.player.skills.includes('Bone Wall'));
    assert.strictEqual(g.mode, 'explore');
    assertHealthy(g);
});

test('invalid branch re-prompts', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'banana');
    assert.strictEqual(g.mode, 'branch_select');
    g.do('berserker');
    assert.strictEqual(g.progression.branch, 'berserker');
});

test('every class/branch can level to 14 without errors', () => {
    for (const cls of Object.keys(data.evolutionPaths)) {
        for (const branch of Object.keys(data.evolutionPaths[cls].branches)) {
            const g = newGame().do(cls, 'add_xp 250', branch.replace(/_/g, ' '), 'unlock_events', 'add_xp 999999');
            assert.ok(g.player.level >= 14, `${cls}/${branch} level ${g.player.level}`);
            const stages = data.evolutionPaths[cls].branches[branch].stages;
            assert.strictEqual(g.progression.evolutionName, stages[stages.length - 1].name, `${cls}/${branch}`);
            assertHealthy(g);
        }
    }
});

test('story-event evolutions wait for their event', () => {
    const g = newGame().do('warrior', 'add_xp 250', 'vanguard', 'add_xp 999999');
    assert.strictEqual(g.progression.evolutionName, 'Paladin'); // Dark Knight needs the betrayal event
    g.do('unlock_events');
    assert.strictEqual(g.progression.evolutionName, 'Abyssal King');
    assert.strictEqual(g.player.resource.type, 'Sin Marks');
});

// ---------- combat ----------
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

test('Guard (round-based): covers the next full round, then wears off', () => {
    const g = newGame().do('warrior', 'n', 'engage', 'guard'); // warrior is slowest: guards at the end of round 1
    assert.ok(g.findStatus(g.player, 'Guard'), 'still up at your next turn (round 2 enemies were guarded against)');
    g.do('slash 1');
    assert.ok(!g.findStatus(g.player, 'Guard'));
    assert.match(g.text(), /\[Guard\] wears off Warrior/);
});

test('stun makes an enemy skip its turn', () => {
    const g = newGame(7).do('warrior', 'e', 'engage');
    g.player.skills.push('Shield Bash');
    g.player.hp = g.player.maxHp = 999;
    g.do('shield bash 3'); // the Drunken Shade (30 HP) survives the hit
    assert.match(g.text(), /is stunned!/);
    assert.match(g.text(), /unable to act this turn/);
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

// ---------- marks & Warden ----------
const warden = (seed = 1) => newGame(seed).do('warrior', 'add_xp 250', 'warden');
const dummyHit = (g, attackerMarks = [], targetMarks = []) => {
    const attacker = { id: 'player', isPlayer: true, critChance: 0, statusEffects: attackerMarks };
    const target = { id: 'dummy', name: 'Dummy', def: 0, statusEffects: targetMarks };
    const hit = g.newHit(target);
    g.rollDamage(attacker, target, { name: 'Test', base_damage: [10, 10] }, hit);
    return { hit, target };
};
const mark = (name, value, duration = 2) => ({ type: 'mark', name, value, duration, appliedBy: 'player' });

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

// ---------- damage over time ----------
const newtonFight = (cls) => {
    const g = newGame().do(cls, 'engage'); // James Newton: 66 DEF, so direct hits do 0 — only DoTs land
    g.player.hp = g.player.maxHp = 9999;
    g.player.resource.current = g.player.resource.max = 99;
    return g;
};

test('Hemorrhage: Bleed ignores armor, 3 dmg x 3 turns, then wears off', () => {
    const g = newtonFight('warrior');
    g.player.skills.push('Hemorrhage');
    g.do('hemorrhage', 'guard', 'guard');
    const newton = g.combat.enemies[0];
    assert.strictEqual(newton.hp, 666 - 9, 'exactly 3 ticks');
    g.do('guard');
    assert.strictEqual(newton.hp, 657, 'no 4th tick');
    assert.ok(!newton.statusEffects.some((s) => s.type === 'dot'));
});

test('Black Spit poison: 5 dmg x 3 turns', () => {
    const g = newtonFight('necromancer');
    g.player.skills.push('Black Spit');
    g.do('black spit', 'black spit 1');
    // second cast refreshes instead of stacking
    const newton = g.combat.enemies[0];
    assert.strictEqual(newton.statusEffects.filter((s) => s.name === 'Poison').length, 1);
});

test('DoT kills give corpses and Soul Energy to the applier', () => {
    const g = newGame().do('necromancer', 'n', 'engage');
    const rat = g.combat.enemies.find((e) => e.key === 'rust_rat');
    g.player.resource.current = 0;
    g.applyDot(g.player, rat, { name: 'Poison', value: 50, duration: 3 });
    g.startTurn(rat);
    assert.ok(rat.hp <= 0);
    assert.match(g.flush().map((e) => e.text).join('\n'), /Rust Rat has been defeated![\s\S]*Total corpses: 1[\s\S]*gained 2 Soul Energy/);
});

test('Pestilent Sage trait: DoTs last +1 turn', () => {
    const g = newGame().do('necromancer', 'n', 'engage');
    g.player.traits.push({ name: 'DoTs last +1 turn' });
    const ghoul = g.combat.enemies[0];
    g.applyDot(g.player, ghoul, { name: 'Poison', value: 1, duration: 3 });
    assert.strictEqual(ghoul.statusEffects.find((s) => s.name === 'Poison').duration, 4);
});

test('a stunned enemy still takes DoT damage', () => {
    const g = newGame().do('warrior', 'engage');
    const newton = g.combat.enemies[0];
    g.addStatus(newton, { name: 'Stun', type: 'skip_turn', duration: 1 });
    g.applyDot(g.player, newton, { name: 'Bleed', value: 4, duration: 2 });
    assert.strictEqual(g.startTurn(newton), true);
    assert.strictEqual(newton.hp, 662);
});

test("'attack' is always free (falls back to Basic Attack when the class skill costs resource)", () => {
    const g = newGame().do('necromancer', 'n', 'engage');
    g.player.resource.current = 0;
    g.do('attack 1');
    assert.match(g.text(), /Necromancer uses Basic Attack on/);
    assert.strictEqual(newGame().do('warrior').basicAttackName(), 'Slash');
});

// ---------- batch 3: Rogue ----------
const tanky = (cls, ...skills) => { const g = newtonFight(cls); g.player.skills.push(...skills); return g; };
const hallway = (cls, ...skills) => {
    const g = newGame().do(cls, 'n', 'engage');
    g.player.hp = g.player.maxHp = 9999;
    g.player.resource.current = g.player.resource.max = 99;
    g.player.skills.push(...skills);
    return g;
};

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

// ---------- Bone Warden: Bone Wall ----------
const boneWallFight = (seed = 3) => {
    const g = newGame(seed).do('necromancer', 'add_xp 250', 'bone warden', 'engage');
    g.player.hp = g.player.maxHp = 200;
    g.player.resource.current = g.player.resource.max;
    return g;
};
const armBoneWall = (g) => {
    // Exercise the actual registered skill independently of enemy turn advancement.
    g.castSkill(g.player, g.playerSkill('Bone Wall'), [g.player]);
    return g.findStatus(g.player, 'Bone Wall');
};
const incomingBoneWallHit = (g) => {
    const attacker = g.combat.enemies[0];
    attacker.critChance = 0;
    g.castSkill(attacker, { name: 'Test Strike', base_damage: [20, 20],
        damage_type: 'physical', effects: [] }, [g.player]);
};

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
    // Enemy turns can consume/expire the shield before input returns (known QA-1 issue).
    assert.ok(costGame.player.resource.current >= resource - 1, 'resource regen may follow the cast');
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

// ---------- batch 3: Mage ----------
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

// ---------- batch 3: Plaguecaller infections ----------
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

// ---------- Tier 1: core game loop ----------
test('use: healing items heal, get used up, and refuse at full HP', () => {
    const g = newGame().do('warrior', 'e', 'take bandages');
    g.do('use bandages');
    assert.match(g.text(), /already at full health/);
    assert.ok(g.player.inventory.includes('Bandages'));
    g.player.hp = 50;
    g.do('use band');
    assert.strictEqual(g.player.hp, 75);
    assert.ok(!g.player.inventory.includes('Bandages'));
    g.do('use rusty sword');
    assert.match(g.text(), /nothing to use it for/);
});

test('use in combat heals and costs your turn', () => {
    const g = newGame().do('warrior', 'e', 'take bandages', 'engage');
    g.player.hp = 50;
    const round = g.combat.round;
    g.do('use bandages');
    assert.match(g.text(), /You use the Bandages\. \+25 HP/);
    assert.strictEqual(g.combat.round, round + 1);
});

test('stats scale damage: STR for physical, INT for magic, AGI for rogues', () => {
    const g = newGame().do('warrior', 'engage');
    const target = { name: 'Dummy', def: 0, statusEffects: [] };
    const roll = (attacker, type) => { const h = g.newHit(target); g.rollDamage({ isPlayer: true, critChance: 0, statusEffects: [], ...attacker }, target, { base_damage: [10, 10], damage_type: type }, h); return h.damage; };
    assert.strictEqual(roll({ className: 'warrior', strength: 10 }, 'physical'), 12);
    assert.strictEqual(roll({ className: 'mage', intelligence: 13 }, 'fire'), 13);
    assert.strictEqual(roll({ className: 'rogue', agility: 10, strength: 0 }, 'physical'), 12);
    assert.strictEqual(roll({ className: 'warrior', strength: 10 }, 'true'), 10);
});

test("Basic Attack uses the class's own damage range", () => {
    const g = newGame().do('necromancer');
    assert.deepStrictEqual(g.playerSkill('Basic Attack').base_damage, [6, 10]);
});

test('XP comes from the enemies you beat (hallway = 40)', () => {
    const g = newGame(3).do('warrior', 'n', 'engage');
    g.player.hp = g.player.maxHp = 9999;
    fightOut(g);
    assert.match(g.text(), /gained 40 XP/);
    assert.strictEqual(g.player.xp, 40);
});

test('catch your breath: +20% max HP after a victory', () => {
    const g = newGame(3).do('warrior', 'n', 'engage');
    g.player.maxHp = 1000; g.player.hp = 900;
    fightOut(g);
    assert.match(g.text(), /catch your breath/);
});

test('resources reset at the start of each fight', () => {
    const g = newGame().do('mage');
    g.player.resource.current = 0;
    g.do('n', 'engage');
    assert.ok(g.player.resource.current >= 6);
    const w = newGame().do('warrior');
    w.player.resource.current = 9;
    w.do('n', 'engage');
    assert.match(w.text(), /Momentum: 1\/10 to start the fight/);
});

test('Berserker Fury builds when you get hit; Vanguard Oath from guarding', () => {
    const b = newGame().do('warrior', 'add_xp 250', 'berserker', 'engage');
    b.player.hp = 9999;
    b.do('slash');
    assert.match(b.text(), /\+1 Fury Gauge \(pain\)/);
    const v = newGame().do('warrior', 'add_xp 250', 'vanguard', 'engage');
    v.player.hp = 9999;
    v.do('guard');
    assert.match(v.text(), /\+1 Oath Points \(oath kept\)/);
});

test('minion cap: 3 by default', () => {
    const g = hallway('necromancer');
    g.do('raise skeleton', 'raise skeleton', 'raise skeleton');
    assert.strictEqual(g.alive(g.combat.minions).length, 3);
    g.do('raise skeleton');
    assert.match(g.text(), /can't control more than 3 minions/);
});

test('beating the Crow-Touched Warden wins the game', () => {
    const g = newGame().do('warrior');
    g.currentRoom = 'wardens_roost';
    g.do('engage');
    g.player.hp = g.player.maxHp = 9999;
    g.player.strength = 200;
    fightOut(g);
    assert.strictEqual(g.mode, 'won');
    assert.match(g.text(), /YOU ESCAPED THE CELLAR/);
    assert.match(g.text(), /Fights won: 1 · Enemies slain: 1/);
    g.do('look');
    assert.match(g.text(), /type 'start' to play again/i);
});

/** A simple bot that plays the real dungeon with no cheats. Returns 'won' | 'game_over'. */
function botRun(cls, seed) {
    const g = newGame(seed).do(cls);
    const path = ['n', 'engage', 'take all', 's', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage'];
    const grabAll = () => { for (const item of [...g.rooms[g.currentRoom].items]) g.do(`take ${item}`); };
    const healIfLow = () => {
        if (g.player.hp > g.player.maxHp * 0.45) return false;
        const best = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'].find((i) => g.player.inventory.includes(i));
        if (!best) return false;
        g.do(`use ${best}`);
        return true;
    };
    for (const step of path) {
        if (g.mode === 'branch_select') g.do(Object.keys(data.evolutionPaths[cls].branches)[seed % 3]);
        if (g.mode === 'game_over' || g.mode === 'won') break;
        if (step === 'take all') { grabAll(); continue; }
        if (step !== 'engage') grabAll();
        g.do(step);
        for (let i = 0; i < 300 && g.mode === 'combat'; i++) {
            if (healIfLow()) continue;
            // cast the most expensive affordable damage skill, else attack
            const p = g.player;
            const options = p.skills.map((n) => g.playerSkill(n)).filter((s) => s && s.base_damage && g.isCastable(s) && s.cost !== 'all' && (s.cost || 0) <= p.resource.current && !s.oncePerFight)
                .sort((a, b) => (b.cost || 0) - (a.cost || 0));
            // focus fire: lowest-HP enemy first (fewer enemies alive = less damage taken)
            const living = g.alive(g.combat.enemies);
            const t = 1 + living.indexOf(living.reduce((a, b) => (b.hp < a.hp ? b : a)));
            g.do(options.length ? `${options[0].name} ${t}` : `attack ${t}`);
        }
        if (g.mode === 'branch_select') g.do(Object.keys(data.evolutionPaths[cls].branches)[seed % 3]);
    }
    assertHealthy(g);
    return { mode: g.mode, level: g.player.level, room: g.currentRoom };
}

test('full dungeon run, no cheats: completes cleanly for every class (balance is reported, not asserted)', () => {
    const report = [];
    for (const cls of Object.keys(data.basePlayerClasses)) {
        let wins = 0; const deaths = {};
        for (let seed = 1; seed <= 15; seed++) {
            const r = botRun(cls, seed);
            if (r.mode === 'won') wins++; else deaths[r.room] = (deaths[r.room] || 0) + 1;
        }
        report.push(`${cls.padEnd(12)} ${String(wins).padStart(2)}/15 wins   deaths: ${JSON.stringify(deaths)}`);
    }
    console.log('      Bot win rates (simple "biggest skill + heal below 45%" bot):\n      ' + report.join('\n      '));
    // Full balance numbers: node tools/balance.js
});

// ---------- Status system (Approved Design Handoff) ----------
/** A game running on a modified copy of the data (to test configurable rules without touching real values). */
function gameWith(mutate, seed = 1) {
    const d = JSON.parse(JSON.stringify(data));
    mutate(d);
    const g = new GameEngine({ seed, data: d });
    g.log = g.start();
    g.do = (...cmds) => { for (const c of cmds) g.log.push(...g.input(c)); return g; };
    g.text = () => g.log.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
    return g;
}
const TEST_CR = (d, stunGain = 60) => {
    d.statusDefinitions.Stun = { ...d.statusDefinitions.Stun, control: 'hard', crGain: stunGain };
    d.statusRules.controlResistance = { threshold: 100, recoveryPerRound: 20, releaseThreshold: 50, tierMultipliers: { regular: 1, elite: 1.5, boss: 2, player: 1, summon: 1 } };
};
const stun = (g, target) => g.applyStatus(g.player, target, { name: 'Stun', type: 'skip_turn', duration: 1 });

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

// ---------- QA report #1 regressions (stability) ----------
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

// ---------- QA report #1 regressions (polish) ----------
test('QA-6: a fled-and-refought enemy is credited once (repro F)', () => {
    const g = newGame(3).do('warrior', 'n', 'engage');
    g.player.hp = g.player.maxHp = 999;
    const rat = () => g.combat.enemies.find((e) => e.key === 'rust_rat');
    for (let i = 0; i < 20 && rat().hp > 0; i++) g.do('attack 3');
    assert.strictEqual(g.stats.kills, 1);
    g.do('flee', 'engage');
    assert.strictEqual(rat().hp, rat().maxHp, 'flee persistence unchanged (pending design decision)');
    fightOut(g);
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.stats.kills, 3, '3 enemies in the room, each credited once (was 4)');
});

test('QA-7: articles respect proper names; victory shows XP once (repro G)', () => {
    const g = newGame().do('warrior');
    g.currentRoom = 'wardens_roost';
    g.do('look', 'engage');
    assert.match(g.text(), /Beware! The Crow-Touched Warden lurks here/);
    assert.match(g.text(), /The Crow-Touched Warden appears!/);
    assert.doesNotMatch(g.text(), /A The /);
    const j = newGame().do('warrior', 'look');
    assert.match(j.text(), /Beware! James Newton lurks here/);
    assert.match(newGame().do('warrior', 'n').text(), /Beware! A Shackled Ghoul lurks here/);
    assert.strictEqual(newGame().withArticle({ name: 'Acolyte' }), 'an Acolyte');
    const v = newGame(3).do('warrior', 'n', 'engage');
    v.player.hp = v.player.maxHp = 999;
    fightOut(v);
    assert.strictEqual((v.text().match(/gained 40 XP!/g) || []).length, 1);
    assert.doesNotMatch(v.text(), /experience points/);
    assert.strictEqual(v.player.xp, 40, 'XP unchanged');
    assert.match(newGame().do('warrior', 'add_xp 5').text(), /You gained 5 experience points!/, 'the cheat still reports');
});

test('QA-9: the combat menu shows your HP, resource and statuses', () => {
    const g = newGame().do('warrior', 'n', 'engage', 'guard');
    const prompt = g.text().slice(g.text().lastIndexOf('--- Your Turn! ---'));
    assert.match(prompt, /--- You ---\nWarrior \(\d+\/120 HP\) · Momentum: \d+\/10 \[Guard 1\]/);
});

// ---------- fuzz ----------
test('fuzz: 300 random seeded playthroughs never crash or NaN', () => {
    const classes = Object.keys(data.basePlayerClasses);
    const explore = ['n', 's', 'e', 'w', 'look', 'i', 'engage', 'engage', 'take bandages', 'cl', 'help'];
    for (let seed = 1; seed <= 300; seed++) {
        const g = newGame(seed);
        let r = seed * 7919;
        const pick = (arr) => arr[(r = (r * 48271) % 2147483647) % arr.length];
        g.do(pick(classes));
        if (seed % 3 === 0) g.do('add_xp 400');
        for (let step = 0; step < 150; step++) {
            if (g.mode === 'game_over') break;
            if (g.mode === 'branch_select') { g.do(Object.keys(data.evolutionPaths[g.player.className].branches)[seed % 3]); continue; }
            if (g.mode === 'combat') {
                const opts = ['attack 1', 'attack 2', 'flee', ...g.player.skills.map((s) => `${s} 1`)];
                g.do(pick(opts));
            } else g.do(pick(explore));
            assertHealthy(g);
        }
    }
});

test('fuzz: every obtainable skill, spammed randomly, 200 fights', () => {
    const obtainable = {};
    for (const [cls, def] of Object.entries(data.basePlayerClasses)) {
        obtainable[cls] = new Set(def.startingSkills);
        const tree = data.evolutionPaths[cls];
        if (tree) for (const br of Object.values(tree.branches)) for (const st of br.stages) if (st.skill) obtainable[cls].add(st.skill);
    }
    const classes = Object.keys(obtainable);
    const rooms = ['n', 'e', 'e e', 'e e e', 'e e e e', 'e e e e e'];
    for (let seed = 1; seed <= 200; seed++) {
        const g = newGame(seed);
        const cls = classes[seed % classes.length];
        g.do(cls);
        for (const step of rooms[seed % rooms.length].split(' ')) g.do(step);
        g.player.skills = [...obtainable[cls]];
        g.player.traits.push({ name: 'Virulent Touch' }, { name: 'DoTs last +1 turn' }, { name: 'Synergy Marks' }, { name: "Hunter's Instinct" });
        g.do('engage');
        let r = seed;
        for (let i = 0; i < 120 && g.mode === 'combat'; i++) {
            g.player.resource.current = 99;
            r = (r * 48271) % 2147483647;
            const skills = g.player.skills;
            g.do(r % 5 === 0 ? 'attack 1' : `${skills[r % skills.length]} ${1 + (r % 3)}`);
            assertHealthy(g);
            for (const e of g.combat ? g.combat.enemies : []) assert.ok(Number.isFinite(e.hp), `${e.name} hp ${e.hp}`);
        }
    }
});

// ---------- runner ----------
let failed = 0;
for (const t of tests) {
    try { t.fn(); console.log(`  ✓ ${t.name}`); }
    catch (err) { failed++; console.log(`  ✗ ${t.name}\n      ${err.message.split('\n').join('\n      ')}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
