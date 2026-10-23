// QA-8B exploit check: can the candidate regen rates fund a permanent control loop on the boss?
// Not reachable in today's dungeon (players reach level 3 at the boss), but the rates apply all game.
// Level 5 per branch (Timebinder `slow`, Shadowmind `confuse`, Shadowblade `Garrote`), boss alone,
// CR off (shipped). Policy: re-apply the control whenever affordable and the boss isn't already under it;
// otherwise the smart bot plays normally. Scratch data copies only.
//   node qa/scripts/control_loops.js [seeds=100]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const BASE = require(path.join(ROOT, 'src/data.js'));
const { choose } = require('./smartbot.js');
const SEEDS = parseInt(process.argv[2] || '100', 10);

const CASES = [
    { cls: 'mage', br: 'chronomancer', skill: 'slow', res: 'Time Charges', rates: [1, 2, 3], status: 'skip_turn' },
    { cls: 'mage', br: 'illusionist', skill: 'confuse', res: 'Deception Tokens', rates: [0, 1, 2], status: 'skip_turn' },
    { cls: 'rogue', br: 'assassin', skill: 'Garrote', res: 'Stealth Tokens', rates: [0, 1, 2, 3], status: 'silence' },
];
const BOSS = 'The Crow-Touched Warden';

function run(c, rate, seed, lock = true) {
    const d = JSON.parse(JSON.stringify(BASE)); d.resourceRules[c.res].regen = rate;
    const g = new GameEngine({ seed, data: d }); g.start();
    [c.cls, 'add_xp 250', c.br.replace(/_/g, ' '), 'add_xp 562'].forEach((x) => g.input(x)); // level 5
    g.player.inventory.push('Bandages', 'Half-full Wine Bottle', 'Healing Herb Bundle');
    g.currentRoom = 'wardens_roost'; g.input('engage');
    const boss = g.combat.enemies[0];
    let acted = 0, skipped = 0, silencedTurns = 0, run = 0, maxRun = 0, casts = 0;
    const scan = (evs) => { for (const e of evs) if (e.type === 'text') {
        if (e.text.includes(`${BOSS}'s Turn!`)) { acted++; run = 0; if (g.findStatus(boss, 'Silence') || /silenced/.test(e.text)) silencedTurns++; }
        else if (e.text.includes(`${BOSS} is unable to act`)) { skipped++; run++; maxRun = Math.max(maxRun, run); }
        else if (e.text.includes(`${BOSS} is silenced and can only flail`)) silencedTurns++;
    } };
    for (let i = 0; i < 300 && g.mode === 'combat'; i++) {
        const p = g.player, sk = g.playerSkill(c.skill);
        const under = c.status === 'skip_turn' ? g.statusOfType(boss, 'skip_turn') : g.findStatus(boss, 'Silence');
        let cmd;
        if (lock && p.hp > p.maxHp * 0.45 && sk && g.skillCost(sk) <= p.resource.current && !under) { cmd = c.skill; casts++; } else cmd = choose(g);
        scan(g.input(cmd));
    }
    if (g.errors.length) throw g.errors[0];
    return { won: g.mode === 'won', acted, skipped, silencedTurns, maxRun, casts, learned: g.player.skills.includes(c.skill), level: g.player.level };
}

console.log(`Control-loop check, level 5, boss alone, CR off, ${SEEDS} seeds`);
console.log('| Branch (skill, cost) | regen | win % (lock policy) | win % (normal smart bot) | boss turns denied | boss turns silenced | longest denial streak | fights hitting the 300-action cap |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const c of CASES) for (const rate of c.rates) {
    let w = 0, wn = 0, A = 0, S = 0, Si = 0, M = 0, capped = 0, learned = true, lvl = 0;
    for (let s = 1; s <= SEEDS; s++) {
        const r = run(c, rate, s); w += r.won; A += r.acted; S += r.skipped; Si += r.silencedTurns; M = Math.max(M, r.maxRun); learned = learned && r.learned; lvl = r.level;
        if (!r.won && r.acted + r.skipped >= 250) capped++;
        wn += run(c, rate, s, false).won;
    }
    const tot = A + S;
    console.log(`| ${c.br} (${c.skill}, ${BASE.skillDefinitions[c.skill].cost} ${c.res})${learned ? '' : ' NOT LEARNED'} L${lvl} | ${rate}${rate === BASE.resourceRules[c.res].regen ? ' (shipped)' : ''} | ${Math.round((100 * w) / SEEDS)} | ${Math.round((100 * wn) / SEEDS)} | ${Math.round((100 * S) / tot)}% | ${Math.round((100 * Si) / tot)}% | ${M} | ${capped} |`);
}
