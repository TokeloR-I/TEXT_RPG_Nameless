// QA-8 Decision 8B isolated experiment (scratch only: data changes go on deep copies, nothing in the repo changes).
// node docs/experiments/qa8/qa8-experiment.js . [seeds=100]  -> JSON on stdout
const path = require('path');
const ROOT = path.resolve(process.argv[2] || '.');
const SEEDS = parseInt(process.argv[3] || '100', 10);
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const baseData = require(path.join(ROOT, 'src/data.js'));
const { choose } = require(path.join(ROOT, 'qa/scripts/smartbot.js')); // QA's smart bot (read-only use)

const REGEN = { 'Stealth Tokens': 3, 'Combo Points': 3, 'Deception Tokens': 2, 'Time Charges': 2 };
const DEF = { mage: 4, rogue: 5, necromancer: 6 }; // QA's O-A: +2 DEF (from 2/3/4)
const regen = (names) => (d) => { for (const n of names) d.resourceRules[n].regen = REGEN[n]; };
const def = (d) => { for (const [c, v] of Object.entries(DEF)) d.basePlayerClasses[c].baseStats.def = v; };
const VARIANTS = {
    baseline: () => {},
    'stealth3': regen(['Stealth Tokens']),
    'combo3': regen(['Combo Points']),
    'deception2': regen(['Deception Tokens']),
    'time2': regen(['Time Charges']),
    'all4': regen(Object.keys(REGEN)),
    'def_only': def,
    'all4+def': (d) => { regen(Object.keys(REGEN))(d); def(d); },
};
const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];
const PATH = ['n', 'engage', 's', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage'];

/** Shipped balance-bot policy (tools/balance.js): biggest affordable damaging skill on the weakest enemy. */
function simpleChoice(g) {
    const p = g.player;
    if (p.hp <= p.maxHp * 0.45) { const it = HEALS.find((h) => p.inventory.includes(h)); if (it) return `use ${it}`; }
    const opts = p.skills.map((n) => g.playerSkill(n))
        .filter((s) => s && s.base_damage && g.isCastable(s) && s.cost !== 'all' && !s.oncePerFight && g.skillCost(s) <= p.resource.current)
        .sort((a, b) => (b.cost || 0) - (a.cost || 0));
    const living = g.alive(g.combat.enemies);
    const t = 1 + living.indexOf(living.reduce((a, b) => (b.hp < a.hp ? b : a)));
    return opts.length ? `${opts[0].name} ${t}` : `attack ${t}`;
}

function newStats() {
    return { runs: 0, wins: 0, reachedBoss: 0, bossWins: 0, turns: 0, paidCasts: 0, starvedTurns: 0, cappedRounds: 0, rounds: 0, wastedRegen: 0, fightCap: 0, maxBossSkipRun: 0, bossSkips: 0, bossTurns: 0 };
}

function run(data, cls, branch, seed, policy, s) {
    const g = new GameEngine({ seed, data });
    const evs = []; const input = (c) => { const e = g.input(c); for (const x of e) if (x.type === 'text') evs.push(x.text); return e; };
    g.start();
    input(cls);
    let bossRun = 0;
    for (const step of PATH) {
        if (g.mode === 'branch_select') input(branch);
        if (g.mode === 'game_over' || g.mode === 'won') break;
        for (const it of [...g.rooms[g.currentRoom].items]) input(`take ${it}`);
        input(step);
        const isBoss = g.mode === 'combat' && g.currentRoom === 'wardens_roost';
        if (isBoss) s.reachedBoss++;
        let i = 0;
        for (; i < 300 && g.mode === 'combat'; i++) {
            if (g.combat.awaitingContinue) { input('continue'); continue; }
            const p = g.player;
            // starved: no resource-costing skill affordable this turn (free attack only)
            const costly = p.skills.map((n) => g.playerSkill(n)).filter((k) => k && g.isCastable(k) && g.skillCost(k) > 0 && k.cost !== 'all');
            const affordable = costly.filter((k) => g.skillCost(k) <= p.resource.current);
            if (costly.length && !affordable.length) s.starvedTurns++;
            const before = p.resource.current;
            const roundBefore = g.combat.round;
            const cmd = policy === 'smart' ? choose(g) : simpleChoice(g);
            const n = evs.length;
            input(cmd);
            s.turns++;
            const out = evs.slice(n).join('\n');
            if (/Used \d+ /.test(out) || (g.player && g.player.resource.current < before && !/use /.test(cmd))) s.paidCasts++;
            if (g.combat) {
                const roundsDone = g.combat.round - roundBefore;
                s.rounds += Math.max(0, roundsDone);
                if (p.resource.regen > 0 && roundsDone > 0 && p.resource.current >= p.resource.max) { s.cappedRounds++; }
            }
            if (isBoss) {
                for (const m of out.match(/Warden (uses|is unable to act)/g) || []) {
                    s.bossTurns++;
                    if (/unable/.test(m)) { s.bossSkips++; bossRun++; s.maxBossSkipRun = Math.max(s.maxBossSkipRun, bossRun); } else bossRun = 0;
                }
            }
        }
        if (i >= 300) s.fightCap++;
        if (isBoss && g.mode === 'won') s.bossWins++;
    }
    if (g.errors.length) throw g.errors[0];
    s.runs++;
    if (g.mode === 'won') s.wins++;
}

/** Boss alone, as in QA report #1: level 3 in the chosen branch, full HP, 3 heal items. */
function bossAlone(data, cls, branch, seed, policy) {
    const g = new GameEngine({ seed, data });
    g.start(); g.input(cls); g.input('add_xp 250');
    if (g.mode === 'branch_select') g.input(branch);
    g.player.hp = g.player.maxHp;
    g.player.inventory.push('Healing Herb Bundle', 'Bandages', 'Bandages');
    g.currentRoom = 'wardens_roost';
    g.input('engage');
    for (let i = 0; i < 300 && g.mode === 'combat'; i++) g.input(g.combat.awaitingContinue ? 'continue' : policy === 'smart' ? choose(g) : simpleChoice(g));
    if (g.errors.length) throw g.errors[0];
    return g.mode === 'won';
}

const results = [];
for (const [vname, mutate] of Object.entries(VARIANTS)) {
    const data = JSON.parse(JSON.stringify(baseData));
    mutate(data);
    for (const cls of Object.keys(data.basePlayerClasses)) {
        for (const br of Object.keys(data.evolutionPaths[cls].branches)) {
            const branch = br.replace(/_/g, ' ');
            for (const policy of ['smart', 'simple']) {
                const s = newStats();
                let alone = 0;
                for (let seed = 1; seed <= SEEDS; seed++) {
                    run(data, cls, branch, seed, policy, s);
                    if (bossAlone(data, cls, branch, seed, policy)) alone++;
                }
                results.push({ variant: vname, cls, branch: br, policy, ...s, bossAloneWins: alone, resource: ((data.evolutionPaths[cls].branches[br].resourceEvolution || [])[0] || {}).type || null });
            }
        }
    }
    process.stderr.write(`done ${vname}\n`);
}
console.log(JSON.stringify(results));
