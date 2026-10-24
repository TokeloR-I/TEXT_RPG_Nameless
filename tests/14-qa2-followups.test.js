// Tests moved verbatim from the old tests/run-tests.js (section: QA report #2 follow-ups).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('QA-12: an enemy\'s own turn is absorbed through real turn order, both speed orders', () => {
    for (const [label, spd] of [['player faster', 40], ['player slower', 1]]) {
        const g = newGame(3).do('necromancer', 'add_xp 250', 'bone warden');
        g.player.spd = spd;
        g.do('engage'); // James Newton (SPD 20): Heavy Slash 20–30, far above necro DEF
        g.player.hp = g.player.maxHp = 500;
        g.player.resource.current = 5;
        const hp = g.player.hp;
        const n = g.log.length;
        g.do('bone wall'); // the next Newton turn happens inside this command in both orders
        const after = g.log.slice(n).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
        assert.match(after, /Bone Wall absorbs James Newton's hit entirely!/, label);
        assert.strictEqual(g.player.hp, hp, `${label}: the absorbed Heavy Slash dealt no damage`);
        assert.ok(!g.findStatus(g.player, 'Bone Wall'), `${label}: wall used up`);
        g.do('soul leech');
        assert.ok(g.player.hp < hp + 10, `${label}: the next Newton hit lands normally`);
        assert.match(g.text().slice(g.text().lastIndexOf('> soul leech')), /James Newton uses Heavy Slash on Necromancer for \d+ damage/);
    }
});

test('QA-11: Bone Wall is a categorised buff, so a buff cleanse sees it', () => {
    assert.strictEqual(data.statusDefinitions['Bone Wall'].category, 'buff');
    const g = boneWallFight();
    armBoneWall(g);
    assert.strictEqual(g.findStatus(g.player, 'Bone Wall').category, 'buff');
    assert.deepStrictEqual(g.cleanse(g.player, { categories: ['buff'] }).map((s) => s.name), ['Bone Wall']);
});

test('QA-14: an absorbed hit carries none of its riders (repro A)', () => {
    for (const [status, effects] of RIDERS) {
        const g = riderFight(effects, (x) => x.applyStatus(x.player, x.player, { name: 'Bone Wall', type: 'absorb', duration: 3 }));
        assert.match(g.flush().map((e) => e.text).join('\n'), /absorbs Shackled Ghoul's hit entirely/);
        assert.strictEqual(g.findStatus(g.player, status), null, `${status} must not land through Bone Wall`);
        assert.strictEqual(g.player.hp, 500);
    }
});

test('QA-14: dodged and blind-missed hits carry no riders either', () => {
    for (const [status, effects] of RIDERS) {
        const dodged = riderFight(effects, (x) => { x.rng = () => 0.5; x.applyStatus(x.player, x.player, { name: 'Mirror Image', type: 'dodge', value: 1, duration: 2 }); });
        assert.strictEqual(dodged.findStatus(dodged.player, status), null, `${status} must not land through a dodge`);
        const missed = riderFight(effects, (x) => { x.rng = () => 0; x.applyStatus(x.player, x.combat.enemies[0], { name: 'Blind', type: 'blind', value: 1, duration: 2 }); });
        assert.strictEqual(missed.findStatus(missed.player, status), null, `${status} must not land on a blind miss`);
    }
});

test('QA-14: a connecting hit still applies its riders (control)', () => {
    for (const [status, effects] of RIDERS) {
        const g = riderFight(effects, (x) => { x.rng = () => 0.99; });
        assert.ok(g.findStatus(g.player, status), `${status} lands on a normal hit`);
    }
});

test('QA-14: area attacks apply riders only to the targets they reached', () => {
    const g = hallway('rogue', 'Hemorrhage');
    const [a, b] = g.combat.enemies;
    g.rng = () => 0.5;
    g.applyStatus(b, b, { name: 'Mirror Image', type: 'dodge', value: 1, duration: 2 });
    g.castSkill(g.player, { name: 'Test Sweep', base_damage: [1, 1], damage_type: 'physical', effects: [{ type: 'bleed', value: 1, duration: 2 }] }, [a, b]);
    assert.ok(g.findStatus(a, 'Bleed'), 'the target that was hit bleeds');
    assert.strictEqual(g.findStatus(b, 'Bleed'), null, 'the one that dodged does not');
});

test('QA-14: self-effects of an attack still happen when the target avoids it (Lunge Fury)', () => {
    const g = hallway('warrior', 'Lunge');
    g.player.resource.current = 5;
    g.rng = () => 0.5;
    const t = g.combat.enemies[0];
    g.applyStatus(t, t, { name: 'Mirror Image', type: 'dodge', value: 1, duration: 2 });
    g.castSkill(g.player, g.playerSkill('Lunge'), [t]);
    assert.strictEqual(g.player.resource.current, 7, 'Lunge still grants +2 Fury to the caster');
});
