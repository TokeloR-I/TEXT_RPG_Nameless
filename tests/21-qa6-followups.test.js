// QA report #6 / #4 follow-ups: F3 (seeded browser runs), QA-15 (Dragon's Dominion category),
// QA-16 (Shield Bash says why it didn't stun).
const { test, assert, GameEngine, data, newGame } = require('./helpers.js');

test('F3: an engine without a seed picks one, keeps it, and replays exactly from it', () => {
    const a = new GameEngine();
    assert.ok(Number.isInteger(a.seed) && a.seed >= 0, 'a seed is chosen and exposed');
    assert.strictEqual(typeof a.rng.getState, 'function', 'always the seeded generator (snapshots can restore it)');
    const play = (g) => { const out = [...g.start(), ...g.input('rogue'), ...g.input('n'), ...g.input('engage')];
        for (let i = 0; i < 30 && g.mode === 'combat'; i++) out.push(...g.input('attack 1'));
        return JSON.stringify(out) + JSON.stringify(g.getState()); };
    assert.strictEqual(play(a), play(new GameEngine({ seed: a.seed })), 'the reported seed reproduces the run');
    assert.strictEqual(new GameEngine({ seed: 7 }).seed, 7);
    assert.ok(new Set(Array.from({ length: 5 }, () => new GameEngine().seed)).size > 1, 'unseeded runs still differ from each other');
});

test('QA-15: Dragon’s Dominion is a categorised buff, so a buff cleanse sees it', () => {
    assert.strictEqual(data.statusDefinitions['Dragon’s Dominion'].category, 'buff');
    const g = newGame(19).do('warrior', 'engage');
    const dom = g.data.skillDefinitions['Dragon’s Dominion'];
    g.castSkill(g.player, { name: 'Dragon’s Dominion', ...dom }, [g.player]);
    assert.strictEqual(g.findStatus(g.player, 'Dragon’s Dominion').category, 'buff');
    assert.deepStrictEqual(g.cleanse(g.player, { categories: ['buff'] }).map((s) => s.name), ['Dragon’s Dominion']);
});

test('QA-16: Shield Bash says why it did not stun (threshold, recovery); a stun stays silent about it', () => {
    const g = newGame(7).do('warrior', 'add_xp 250', 'vanguard', 'e', 'engage');
    const foe = g.combat.enemies[2];
    foe.hp = foe.maxHp = 999;
    const bash = g.playerSkill('Shield Bash');
    const say = (oath) => { g.player.resource.current = oath; g.castSkill(g.player, bash, [foe]); return g.flush().filter((e) => e.type === 'text').map((e) => e.text).join('\n'); };
    assert.match(say(2), /\(No stun: needs 3 Oath Points\.\)/);
    const landed = say(3);
    assert.match(landed, /is stunned!/);
    assert.doesNotMatch(landed, /No stun/);
    assert.match(say(5), new RegExp(`\\(No stun: ${foe.name} is still recovering from the last one\\.\\)`));
    assert.strictEqual(g.player.resource.current, 5, 'still no cost');
});
