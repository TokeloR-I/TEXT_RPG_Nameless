// QA-2: Shield Bash acceptance matrix (docs/design/QA_2_SHIELD_BASH_PROPOSAL.md, criteria 1–11).
// The basic gate/no-payment/lockout-state test is Rook's, in 03-combat; these drive the rest through
// real turn order.
const { test, assert, data, gameWith, TEST_CR, stun, since, assertHealthy } = require('./helpers.js');

/** Level-3 Vanguard in the hallway (ghoul, ghoul, Rust Rat). Enemies have 999 HP and a fixed 5-damage hit. */
const vanguard = (spd, mutate) => {
    const g = gameWith((d) => {
        for (const k of ['shackled_ghoul', 'rust_rat']) {
            const e = d.enemies[k];
            e.skills = [{ name: 'Test Hit', base_damage: [5, 5] }];
            e.critChance = 0; e.hp = e.maxHp = 999;
        }
        if (mutate) mutate(d);
    });
    g.do('warrior', 'add_xp 250', 'vanguard', 'n');
    if (spd != null) g.player.spd = spd;
    g.do('engage');
    g.player.hp = g.player.maxHp = 99999;
    g.player.critChance = 0;
    return g;
};
const RAT = 3; // menu index of the Rust Rat
const rat = (g) => g.combat.enemies[2];
const bash = (g, target, oath) => {
    g.player.resource.current = oath;
    const hp = target.hp;
    g.castSkill(g.player, g.playerSkill('Shield Bash'), [target]);
    return hp - target.hp;
};
/** The rat's scheduled turns in log order: 'act' or 'skip'. */
const ratTurns = (text) => (text.match(/Rust Rat (uses|is unable to act)/g) || []).map((x) => (/uses/.test(x) ? 'act' : 'skip'));

test('QA-2 #1–3: Vanguard pays nothing and stuns only from 3 Oath Points up; damage always lands', () => {
    const g = vanguard();
    assert.strictEqual(g.player.resource.type, 'Oath Points', 'Vanguard runs on Oath Points, not Momentum');
    const skill = g.playerSkill('Shield Bash');
    assert.strictEqual(skill.cost, 0);
    assert.match(skill.description, /Oath Points ≥ 3 \(not spent\)/, 'the text states the threshold');
    for (const oath of [0, 1, 2, 3, 5]) {
        const t = rat(g);
        t.statusEffects = []; t.shieldBashRecovery = null;
        const dealt = bash(g, t, oath);
        assert.ok(dealt >= 10, `${oath} Oath: the hit still deals its damage (${dealt})`);
        assert.strictEqual(!!g.findStatus(t, 'Stun'), oath >= 3, `${oath} Oath: stun ${oath >= 3 ? 'lands' : 'does not land'}`);
        assert.strictEqual(g.player.resource.current, oath, `${oath} Oath: nothing is spent`);
    }
});

test('QA-2 #4: a dodged bash applies no stun, starts no lockout and costs nothing', () => {
    const g = vanguard();
    const t = rat(g);
    g.applyStatus(t, t, { name: 'Evasion', type: 'dodge', value: 1, duration: 1 });
    assert.strictEqual(bash(g, t, 5), 0, 'dodged');
    assert.ok(!g.findStatus(t, 'Stun'));
    assert.ok(!t.shieldBashRecovery, 'no eligibility used up');
    assert.strictEqual(g.player.resource.current, 5);
});

test('QA-2 #5: one bash denies exactly the next scheduled turn, faster or slower', () => {
    for (const spd of [40, 1]) {
        const g = vanguard(spd);
        const n = g.log.length;
        g.player.resource.current = 3;
        g.do(`shield bash ${RAT}`, 'guard', 'guard');
        const turns = ratTurns(since(g, n));
        // faster: the rat's turn this round is skipped. Slower: it already acted this round, so next round's is.
        // Either way its very next scheduled turn after the bash is the one denied.
        assert.deepStrictEqual(turns, ['skip', 'act', 'act'], `spd ${spd}`);
        assert.strictEqual(turns.filter((x) => x === 'skip').length, 1, `spd ${spd}: exactly one turn denied`);
    }
});

test('QA-2 #6: spamming Shield Bash on the boss at full Oath never denies two turns in a row (repro from QA report #1)', () => {
    for (const spd of [40, 1]) {
        const g = gameWith(() => {});
        g.do('warrior', 'add_xp 250', 'vanguard');
        g.player.spd = spd;
        g.currentRoom = 'wardens_roost';
        g.do('engage');
        g.player.hp = g.player.maxHp = 99999;
        const n = g.log.length;
        for (let i = 0; i < 30 && g.mode === 'combat'; i++) {
            g.player.resource.current = g.player.resource.max;   // always well above the threshold
            g.do('shield bash 1');
        }
        const seq = (since(g, n).match(/Warden (uses|is unable to act)/g) || []).map((x) => (/uses/.test(x) ? 'A' : 'S')).join('');
        assert.ok(!seq.includes('SS'), `spd ${spd}: two denied turns in a row: ${seq}`);
        assert.ok((seq.match(/S/g) || []).length >= 5, `spd ${spd}: Shield Bash still stuns regularly: ${seq}`);
        assertHealthy(g);
    }
});

test('QA-2 #7–9: with test CR values, bash stuns build CR; nothing else does; a boss\'s first stun lands', () => {
    const g = vanguard(40, (d) => TEST_CR(d));
    const t = rat(g);
    bash(g, t, 3);
    assert.ok(g.findStatus(t, 'Stun')); assert.strictEqual(t.cr.value, 60, 'successful stun: +60 (regular)');
    bash(g, t, 3);                                   // lockout: damage only
    assert.strictEqual(t.cr.value, 60, 'lockout adds no CR');
    t.shieldBashRecovery = null; t.statusEffects = [];
    bash(g, t, 2);
    assert.strictEqual(t.cr.value, 60, 'threshold failure adds no CR');
    bash(g, t, 3);
    assert.ok(g.findStatus(t, 'Stun'), 'the application reaching 100 still lands');
    assert.ok(t.cr.immune);
    t.shieldBashRecovery = null; t.statusEffects = [];
    bash(g, t, 3);
    assert.ok(!g.findStatus(t, 'Stun'), 'immune: resisted');
    assert.ok(!t.shieldBashRecovery, 'a resisted bash starts no lockout');
    // boss: first control is not pre-blocked
    const b = gameWith((d) => TEST_CR(d));
    b.do('warrior', 'add_xp 250', 'vanguard');
    b.currentRoom = 'wardens_roost';
    b.do('engage');
    const boss = b.combat.enemies[0];
    bash(b, boss, 3);
    assert.ok(b.findStatus(boss, 'Stun'), "boss's first stun lands");
    assert.strictEqual(boss.cr.value, 120, '60 x boss multiplier 2');
});

test('QA-2 #8: a resisted bash on a target already stunned by something else uses up no eligibility', () => {
    const g = vanguard(40, (d) => TEST_CR(d));
    const t = rat(g);
    stun(g, t); stun(g, t);                          // another source: CR 120 -> immune, still stunned
    assert.ok(t.cr.immune && g.findStatus(t, 'Stun'));
    bash(g, t, 3);
    assert.ok(!t.shieldBashRecovery, 'Shield Bash did not stun, so no lockout');
});

test('QA-2: a bash stun that is cleansed before it bites starts no lockout', () => {
    const g = vanguard(40);                          // faster than the rat: its turn this round is next
    bash(g, rat(g), 3);
    assert.strictEqual(rat(g).shieldBashRecovery, 'await_skip');
    g.cleanse(rat(g), { statuses: ['Stun'] });
    const n = g.log.length;
    g.do('guard');                                   // the rat's turn comes round without a stun
    assert.deepStrictEqual(ratTurns(since(g, n)), ['act']);
    assert.ok(!rat(g).shieldBashRecovery, 'eligible again');
    bash(g, rat(g), 3);
    assert.ok(g.findStatus(rat(g), 'Stun'), 'the next bash can stun');
});

test('QA-2 #10–11: Guard still earns Oath; lockout bookkeeping never reaches the next fight', () => {
    const g = vanguard(40);
    g.player.resource.current = 0;
    g.do('guard');
    assert.ok(g.player.resource.current > 0, 'Guard still earns Oath Points');
    bash(g, rat(g), 3);
    g.player.shieldBashRecovery = 'await_recovery';  // e.g. an enemy Shield Bash had locked you
    g.do('flee');
    assert.strictEqual(g.mode, 'explore');
    g.do('engage');
    assert.strictEqual(g.player.shieldBashRecovery, null, 'player bookkeeping reset');
    assert.ok(!rat(g).shieldBashRecovery && !g.findStatus(rat(g), 'Stun'), 'enemies start clean');
    assert.ok(data.skillDefinitions['Shield Bash'], 'shipped data untouched');
});
