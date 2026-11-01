// Tests moved verbatim from the old tests/run-tests.js (section: progression).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

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

test('level-ups grow each class by its own levelGrowth, not a flat increase (Gauge 2026-11-01)', () => {
    // s = the same class at level 1 (starter gear already on), so only growth differs
    const at = (cls, xp) => { const g = newGame().do(cls, `add_xp ${xp}`); const s = { ...newGame().do(cls).player }; s.hp = s.maxHp; return { g, p: g.player, s }; };
    // warrior L2: +12 HP, STR every other level (0.5) lands at L2, DEF +1; INT never grows
    let { g, p, s } = at('warrior', 100);
    assert.strictEqual(p.level, 2);
    assert.deepStrictEqual([p.maxHp, p.strength, p.intelligence, p.def], [s.hp + 12, s.strength + 1, s.intelligence, s.def + 1]);
    assert.match(g.text(), /Stats increased: \+12 HP, \+1 STR, \+1 AGI, \+1 DEF, \+1 max Momentum/);
    ({ p, s } = at('warrior', 250));   // L3: the half-rate stats skip this level
    assert.deepStrictEqual([p.maxHp, p.strength, p.agility, p.spd, p.def], [s.hp + 24, s.strength + 1, s.agility + 1, s.agility + 1, s.def + 2]);
    // casters grow INT, the rogue grows AGI and crit; nobody's off-stat moves like the old +1-to-everything
    ({ p, s } = at('necromancer', 250));
    assert.deepStrictEqual([p.intelligence, p.strength, p.maxHp], [s.intelligence + 4, s.strength, s.hp + 16]);
    ({ p, s } = at('mage', 250));
    assert.deepStrictEqual([p.intelligence, p.def, p.resource.max], [s.intelligence + 4, s.def + 1, s.resource.max + 6]);
    ({ p, s } = at('rogue', 250));
    assert.deepStrictEqual([p.agility, p.spd, p.strength], [s.agility + 4, s.agility + 4, s.strength + 1]);
    assert.ok(Math.abs(p.critChance - (s.critChance + 0.04)) < 1e-9);
    assert.strictEqual(p.hp, p.maxHp, 'a level-up refills HP');
});

test('level-up crit growth stops at the cap; a class without levelGrowth uses the default table', () => {
    const g = gameWith((d) => { delete d.basePlayerClasses.rogue.levelGrowth; d.basePlayerClasses.rogue.baseStats.critChance = 0.495; });
    g.do('rogue', 'add_xp 250');
    const s = g.data.basePlayerClasses.rogue.baseStats, def = g.data.gameRules.defaultLevelGrowth;
    assert.strictEqual(g.player.critChance, g.data.gameRules.critChanceCap);
    assert.deepStrictEqual([g.player.maxHp, g.player.intelligence], [s.hp + 2 * def.hp, s.intelligence + 2 * def.intelligence]);
});

test('caster staff bolts (Basic Attack) scale with INT; melee with STR, rogue with AGI', () => {
    const g = newGame().do('necromancer');
    assert.strictEqual(g.statBonus(g.player, 'physical'), Math.floor(g.player.intelligence / g.data.gameRules.statDamagePer));
    const w = newGame().do('warrior');
    assert.strictEqual(w.statBonus(w.player, 'physical'), Math.floor(w.player.strength / w.data.gameRules.statDamagePer));
});
