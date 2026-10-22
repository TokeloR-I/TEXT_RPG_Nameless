// QA reproduction of Wren's QA-8 Decision 8B experiment (docs/experiments/qa8/), with an independent harness.
// Boss alone = report #1 setup: level 3 in the branch, full HP, + Bandages, Wine, Herb, straight into the Warden.
//   node qa/scripts/qa8_repro.js [seeds=100]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const BASE = require(path.join(ROOT, 'src/data.js'));
const { choose: smart } = require('./smartbot.js');
const SEEDS = parseInt(process.argv[2] || '100', 10);
const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];

function simple(g) { // the shipped tools/balance.js policy
    const p = g.player;
    if (p.hp <= p.maxHp * 0.45) { const it = HEALS.find((h) => p.inventory.includes(h)); if (it) return `use ${it}`; }
    const opts = p.skills.map((n) => g.playerSkill(n)).filter((s) => s && s.base_damage && g.isCastable(s) && s.cost !== 'all' && !s.oncePerFight && g.skillCost(s) <= p.resource.current).sort((a, b) => (b.cost || 0) - (a.cost || 0));
    const living = g.alive(g.combat.enemies); const t = 1 + living.indexOf(living.reduce((a, b) => (b.hp < a.hp ? b : a)));
    return opts.length ? `${opts[0].name} ${t}` : `attack ${t}`;
}
const variant = (mut) => { const d = JSON.parse(JSON.stringify(BASE)); mut(d); return d; };
const regen = (map) => (d) => { for (const [k, v] of Object.entries(map)) d.resourceRules[k].regen = v; };
const DEF = (d) => { d.basePlayerClasses.mage.baseStats.def = 4; d.basePlayerClasses.rogue.baseStats.def = 5; d.basePlayerClasses.necromancer.baseStats.def = 6; };
const ALL4 = { 'Stealth Tokens': 3, 'Combo Points': 3, 'Deception Tokens': 2, 'Time Charges': 2 };
const VARIANTS = {
    baseline: variant(() => {}),
    'Stealth3': variant(regen({ 'Stealth Tokens': 3 })), 'Combo3': variant(regen({ 'Combo Points': 3 })),
    'Decep2': variant(regen({ 'Deception Tokens': 2 })), 'Time2': variant(regen({ 'Time Charges': 2 })),
    'all4': variant(regen(ALL4)), 'DEF': variant(DEF), 'all4+DEF': variant((d) => { regen(ALL4)(d); DEF(d); }),
};
const BRANCHES = []; for (const [cls, t] of Object.entries(BASE.evolutionPaths)) for (const br of Object.keys(t.branches)) BRANCHES.push([cls, br]);

function bossAlone(data, cls, br, seed, bot) {
    const g = new GameEngine({ seed, data }); g.start();
    [cls, 'add_xp 250', br.replace(/_/g, ' ')].forEach((c) => g.input(c));
    g.player.inventory.push('Bandages', 'Half-full Wine Bottle', 'Healing Herb Bundle');
    g.currentRoom = 'wardens_roost'; g.input('engage');
    let rounds = 0, starved = 0, capped = 0;
    for (let i = 0; i < 300 && g.mode === 'combat'; i++) {
        const p = g.player;
        const paid = p.skills.map((n) => g.playerSkill(n)).filter((s) => s && s.cost && s.cost !== 'all' && g.isCastable(s));
        if (paid.length && !paid.some((s) => g.skillCost(s) <= p.resource.current)) starved++;
        if (p.resource.current >= p.resource.max) capped++;
        rounds++;
        g.input(bot(g));
    }
    if (g.errors.length) throw g.errors[0];
    return { won: g.mode === 'won', rounds, starved, capped };
}
function fullRun(data, cls, br, seed, bot) {
    const g = new GameEngine({ seed, data }); g.start(); g.input(cls);
    const path = ['n', 'engage', 's', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage'];
    let reached = false;
    for (const step of path) {
        if (g.mode === 'branch_select') g.input(br.replace(/_/g, ' '));
        if (g.mode === 'game_over' || g.mode === 'won') break;
        for (const it of [...g.rooms[g.currentRoom].items]) g.input(`take ${it}`);
        g.input(step);
        if (g.currentRoom === 'wardens_roost' && g.mode === 'combat') reached = true;
        for (let i = 0; i < 300 && g.mode === 'combat'; i++) g.input(bot(g));
    }
    if (g.errors.length) throw g.errors[0];
    return { won: g.mode === 'won', reached };
}

const pct = (n) => String(Math.round((n / SEEDS) * 100)).padStart(4);
for (const [label, fn] of [['Boss alone', bossAlone], ['Full dungeon', fullRun]]) {
    for (const [botName, bot] of [['smart', smart], ['simple', simple]]) {
        console.log(`\n${label} — ${botName} bot — win % (${SEEDS} seeds)`);
        console.log('branch        ' + Object.keys(VARIANTS).map((v) => v.padStart(9)).join(''));
        for (const [cls, br] of BRANCHES) {
            const row = Object.values(VARIANTS).map((data) => { let w = 0; for (let s = 1; s <= SEEDS; s++) if (fn(data, cls, br, s, bot).won) w++; return pct(w).padStart(9); });
            console.log(br.padEnd(14) + row.join(''));
        }
    }
}
// Sensitivity: regen 0..3 for the four branches, boss alone, both bots; also starvation and capping share.
console.log('\nSensitivity, boss alone: win % smart/simple · starved% · capped% (smart bot)');
for (const [cls, br, res] of [['rogue', 'assassin', 'Stealth Tokens'], ['rogue', 'duelist', 'Combo Points'], ['mage', 'illusionist', 'Deception Tokens'], ['mage', 'chronomancer', 'Time Charges']]) {
    const cells = [0, 1, 2, 3].map((r) => {
        const data = variant(regen({ [res]: r }));
        let ws = 0, wp = 0, rounds = 0, starved = 0, capped = 0;
        for (let s = 1; s <= SEEDS; s++) { const a = bossAlone(data, cls, br, s, smart); ws += a.won; rounds += a.rounds; starved += a.starved; capped += a.capped; wp += bossAlone(data, cls, br, s, simple).won; }
        return `r${r}: ${pct(ws).trim()}/${pct(wp).trim()} st${Math.round(100 * starved / rounds)} cap${Math.round(100 * capped / rounds)}`;
    });
    console.log(`${br.padEnd(13)} ${cells.join(' | ')}`);
}
