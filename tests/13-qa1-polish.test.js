// Tests moved verbatim from the old tests/run-tests.js (section: QA report #1 regressions (polish)).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

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
    const g = newGame().do('warrior', 'n', 'engage');
    g.applyMark(g.combat.enemies[0], g.player, { mark: 'Weaken', value: 0.2, duration: 3 });
    g.do('guard');
    const prompt = g.text().slice(g.text().lastIndexOf('--- Your Turn! ---'));
    assert.match(prompt, /--- You ---\nWarrior \(\d+\/120 HP\) · Momentum: \d+\/10 \[Weaken \d\]/);
});
