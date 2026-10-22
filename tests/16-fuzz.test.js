// Tests moved verbatim from the old tests/run-tests.js (section: fuzz).
const { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, TEST_CR, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor } = require('./helpers.js'); // eslint-disable-line no-unused-vars

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
