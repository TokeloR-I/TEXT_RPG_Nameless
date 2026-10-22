// Tests moved verbatim from the old tests/run-tests.js (section: progression).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

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
