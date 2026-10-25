// Tests moved verbatim from the old tests/run-tests.js (section: Tier 1: core game loop).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

test('use: healing items heal, get used up, and refuse at full HP', () => {
    const g = newGame().do('warrior', 'e', 'take bandages');
    g.do('use bandages');
    assert.match(g.text(), /already at full health/);
    assert.ok(g.player.inventory.includes('Bandages'));
    g.player.hp = 50;
    g.do('use band');
    assert.strictEqual(g.player.hp, 75);
    assert.ok(!g.player.inventory.includes('Bandages'));
    g.do('use old key');
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
