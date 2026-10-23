/* Shared test helpers and the test registry. Test files: tests/NN-area.test.js.
 * Everything here was moved verbatim from the old single tests/run-tests.js. */
const assert = require('assert');
const { GameEngine } = require('../src/engine.js');
const data = require('../src/data.js');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

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

const warden = (seed = 1) => newGame(seed).do('warrior', 'add_xp 250', 'warden');
const dummyHit = (g, attackerMarks = [], targetMarks = []) => {
    const attacker = { id: 'player', isPlayer: true, critChance: 0, statusEffects: attackerMarks };
    const target = { id: 'dummy', name: 'Dummy', def: 0, statusEffects: targetMarks };
    const hit = g.newHit(target);
    g.rollDamage(attacker, target, { name: 'Test', base_damage: [10, 10] }, hit);
    return { hit, target };
};
const mark = (name, value, duration = 2) => ({ type: 'mark', name, value, duration, appliedBy: 'player' });

const newtonFight = (cls) => {
    const g = newGame().do(cls, 'engage'); // James Newton: 66 DEF, so direct hits do 0 — only DoTs land
    g.player.hp = g.player.maxHp = 9999;
    g.player.resource.current = g.player.resource.max = 99;
    return g;
};

const tanky = (cls, ...skills) => { const g = newtonFight(cls); g.player.skills.push(...skills); return g; };
const hallway = (cls, ...skills) => {
    const g = newGame().do(cls, 'n', 'engage');
    g.player.hp = g.player.maxHp = 9999;
    g.player.resource.current = g.player.resource.max = 99;
    g.player.skills.push(...skills);
    return g;
};

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
const stun = (g, target) => g.applyStatus(g.player, target, { name: 'Stun', type: 'skip_turn', duration: 1 });

// QA-14: riders on a hit that never reached its target must not land.
const riderFight = (effects, mutatePlayer) => {
    const g = gameWith((d) => {
        d.rooms.hallway_of_chains.enemies = ['shackled_ghoul'];
        d.enemies.shackled_ghoul.skills = [{ name: 'Rider Bite', base_damage: [5, 5], effects }];
    });
    g.do('necromancer', 'add_xp 250', 'bone warden', 'n');
    g.player.spd = 40; // act first, so the ghoul hasn't bitten yet
    g.do('engage');
    g.player.hp = g.player.maxHp = 500;
    if (mutatePlayer) mutatePlayer(g);
    const ghoul = g.combat.enemies[0];
    ghoul.critChance = 0;
    g.castSkill(ghoul, ghoul.skills[0], [g.player]);
    return g;
};
const RIDERS = [
    ['Stun', [{ type: 'stun', duration: 1 }]],
    ['Poison', [{ type: 'dot', dot_type: 'poison', value: 2, duration: 2 }]],
    ['Weaken', [{ type: 'apply_mark', mark: 'Weaken', value: 0.2, duration: 2 }]],
    ['Silence', [{ type: 'silence', duration: 1 }]]
];

const since = (g, n) => g.log.slice(n).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
/** Rogue in the wine cellar (Cellar Vermin SPD 13 ×2, Drunken Shade SPD 7), with a chosen player speed. */
const cellar = (spd, ...skills) => {
    const g = newGame(1).do('rogue', 'e');
    if (spd != null) g.player.spd = spd;
    g.do('engage');
    g.player.hp = g.player.maxHp = 9999;
    g.player.resource.current = g.player.resource.max = 99;
    g.player.skills.push(...skills);
    for (const e of g.combat.enemies) e.hp = e.maxHp = 500;
    return g;
};
const mfd = (t) => (t ? t.statusEffects.find((x) => x.name === 'Marked for Death') : null) || null;

/** Hallway with fixed 20-damage enemy hits on a 0-DEF player, so guarded hits read 15. */
const guardFight = (spd, ...skills) => {
    const g = gameWith((d) => { for (const k of ['shackled_ghoul', 'rust_rat']) { d.enemies[k].skills = [{ name: 'Test Hit', base_damage: [20, 20] }]; d.enemies[k].critChance = 0; d.enemies[k].hp = d.enemies[k].maxHp = 999; } });
    g.do('warrior', 'n');
    g.player.spd = spd;
    g.do('engage');
    g.player.hp = g.player.maxHp = 9999; g.player.def = 0;
    g.player.resource.current = g.player.resource.max = 99;
    g.player.skills.push(...skills);
    return g;
};
const hitsFor = (g, n, dmg) => (since(g, n).match(new RegExp(`Test Hit on Warrior for ${dmg} damage`, 'g')) || []).length;

module.exports = { test, tests, assert, GameEngine, data, newGame, assertHealthy, fightOut, warden, dummyHit, mark, newtonFight, tanky, hallway, boneWallFight, armBoneWall, incomingBoneWallHit, botRun, gameWith, stun, riderFight, RIDERS, since, cellar, mfd, guardFight, hitsFor };
