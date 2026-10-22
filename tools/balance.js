/* Balance simulator: a bot plays the real dungeon (no cheats) many times per class.
 *   node tools/balance.js                       current data
 *   node tools/balance.js --runs 100
 *   node tools/balance.js --set gameRules.postFightHealPct=0.35 --set basePlayerClasses.mage.baseStats.def=4
 * --set paths point into data.js; try ideas here before changing the data for real. */
const { GameEngine } = require('../src/engine.js');
const baseData = require('../src/data.js');

const args = process.argv.slice(2);
const runs = args.includes('--runs') ? parseInt(args[args.indexOf('--runs') + 1], 10) : 60;
const data = JSON.parse(JSON.stringify(baseData));
args.forEach((a, i) => {
    if (a !== '--set') return;
    const [path, raw] = args[i + 1].split('=');
    const keys = path.split('.');
    let obj = data;
    for (const k of keys.slice(0, -1)) obj = obj[k];
    obj[keys[keys.length - 1]] = JSON.parse(raw);
    console.log(`set ${path} = ${raw}`);
});

const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];

function botRun(cls, seed) {
    const g = new GameEngine({ seed, data });
    g.start();
    const do_ = (c) => g.input(c);
    const branch = () => { if (g.mode === 'branch_select') do_(Object.keys(data.evolutionPaths[cls].branches)[seed % 3]); };
    const grab = () => { for (const item of [...g.rooms[g.currentRoom].items]) do_(`take ${item}`); };
    do_(cls);
    const path = ['n', 'engage', 's', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage'];
    let fightsWon = 0;
    for (const step of path) {
        branch();
        if (g.mode === 'game_over' || g.mode === 'won') break;
        grab();
        do_(step);
        for (let i = 0; i < 300 && g.mode === 'combat'; i++) {
            const p = g.player;
            if (p.hp <= p.maxHp * 0.45) {
                const item = HEALS.find((h) => p.inventory.includes(h));
                if (item) { do_(`use ${item}`); continue; }
            }
            const opts = p.skills.map((n) => g.playerSkill(n))
                .filter((s) => s && s.base_damage && g.isCastable(s) && s.cost !== 'all' && !s.oncePerFight && g.skillCost(s) <= p.resource.current)
                .sort((a, b) => (b.cost || 0) - (a.cost || 0));
            const living = g.alive(g.combat.enemies);
            const t = 1 + living.indexOf(living.reduce((a, b) => (b.hp < a.hp ? b : a)));
            do_(opts.length ? `${opts[0].name} ${t}` : `attack ${t}`);
            if (g.mode !== 'combat' && g.mode !== 'game_over') fightsWon++;
        }
    }
    if (g.errors.length) throw g.errors[0];
    return { won: g.mode === 'won', room: g.currentRoom, fightsWon, level: g.player.level };
}

console.log(`\n${runs} runs per class — bot: biggest affordable skill on the weakest enemy, heals below 45% HP\n`);
console.log('class         win%   avg fights won (of 6)   most deaths in');
for (const cls of Object.keys(data.basePlayerClasses)) {
    let wins = 0, fights = 0; const deaths = {};
    for (let seed = 1; seed <= runs; seed++) {
        const r = botRun(cls, seed);
        if (r.won) wins++; else deaths[r.room] = (deaths[r.room] || 0) + 1;
        fights += r.fightsWon;
    }
    const worst = Object.entries(deaths).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} (${v})`).join(', ');
    console.log(`${cls.padEnd(12)} ${String(Math.round((wins / runs) * 100)).padStart(4)}%   ${(fights / runs).toFixed(1).padStart(10)}              ${worst || '—'}`);
}
