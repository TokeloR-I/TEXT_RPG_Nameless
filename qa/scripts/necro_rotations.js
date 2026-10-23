// Issue #40 Necromancer isolation: Bone Wall / summon / direct-damage rotations on matched fights.
// Bone Warden level 3 (the level a no-cheat run has at the boss; Bone Wall is learned at level 3, so the
// boss is the only fight in today's dungeon where it exists). Same seeds, items and bot for every rotation.
// Scratch data copies only. The engine is wrapped to OBSERVE damage and Soul Energy income.
//   node qa/scripts/necro_rotations.js [seeds=200]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const BASE = require(path.join(ROOT, 'src/data.js'));
const { choose } = require('./smartbot.js');
const SEEDS = parseInt(process.argv[2] || '200', 10);

const clone = (o) => JSON.parse(JSON.stringify(o));
const VARIANTS = {
    'shipped': clone(BASE),
    'SE regen +1 (scratch)': (() => { const d = clone(BASE); d.basePlayerClasses.necromancer.startingResource.regen = 1; return d; })(),
    'DEF +2 (scratch)': (() => { const d = clone(BASE); d.basePlayerClasses.necromancer.baseStats.def += 2; return d; })(),
};
const HIDE = ['Raise Skeleton', 'Raise Ghoul', 'Bone Wall'];
/** The smart bot, with some skills hidden for this decision only. */
const without = (g, hidden) => { const p = g.player, saved = p.skills; p.skills = saved.filter((s) => !hidden.includes(s)); try { return choose(g); } finally { p.skills = saved; } };
const healing = (g) => g.player.hp <= g.player.maxHp * 0.45;
const ROTATIONS = {
    'direct damage': (g) => without(g, HIDE),
    // banks with the free attack (which still earns the +1) until it can afford the summon
    'summon-first (banks for it)': (g) => { const p = g.player; if (healing(g) || g.alive(g.combat.minions).length >= g.minionCap()) return without(g, HIDE); return p.resource.current >= 2 ? 'raise skeleton' : 'attack 1'; },
    'Bone Wall every round': (g) => { const p = g.player; if (!healing(g) && p.resource.current >= 1 && !g.findStatus(p, 'Bone Wall')) return 'bone wall'; return without(g, HIDE); },
    'Bone Wall every other round': (g) => { const p = g.player; if (!healing(g) && p.resource.current >= 1 && !g.findStatus(p, 'Bone Wall') && g.combat.round % 2 === 0) return 'bone wall'; return without(g, HIDE); },
    // banks with the free attack until it has 2, walls, keeps 1 for a bolt
    'Bone Wall, keeping 1 SE for a bolt (banks for it)': (g) => { const p = g.player; if (healing(g)) return without(g, HIDE); if (!g.findStatus(p, 'Bone Wall')) return p.resource.current >= 2 ? 'bone wall' : 'attack 1'; return without(g, HIDE); },
};

function fight(data, rotation, seed, room, extra = []) {
    const g = new GameEngine({ seed, data }); g.start();
    ['necromancer', 'add_xp 250', 'bone warden', ...extra].forEach((c) => g.input(c));
    g.player.inventory.push('Bandages', 'Half-full Wine Bottle', 'Healing Herb Bundle');
    g.currentRoom = room;
    const m = { won: false, rounds: 0, playerDmg: 0, minionDmg: 0, taken: 0, hitsTaken: 0, absorbed: 0, walls: 0, summons: 0, damaging: 0, earned: 0, forfeited: 0, seStart: [], actions: 0 };
    const dmg = g.damage.bind(g), endRound = g.endRound.bind(g);
    g.damage = (t, amount, src) => {
        if (amount > 0 && t.hp > 0) {
            if (src && src.isPlayer && !t.isPlayer) m.playerDmg += Math.min(amount, t.hp);
            else if (src && src.isMinion && !t.isPlayer) m.minionDmg += Math.min(amount, t.hp);
            else if (t.isPlayer && src && !src.isPlayer && !src.isMinion) { m.taken += amount; m.hitsTaken++; }
        }
        return dmg(t, amount, src);
    };
    g.endRound = function () {
        const c = this.combat;
        if (c.dealtDamageThisRound) m.earned++; else if (c.playerActedThisRound) m.forfeited++;
        return endRound();
    };
    g.input('engage');
    for (let i = 0; i < 300 && g.mode === 'combat'; i++) {
        const c = g.combat;
        if (c.awaitingPlayer && !c.awaitingContinue) m.seStart.push(g.player.resource.current);
        const cmd = rotation(g);
        if (cmd === 'bone wall') m.walls++; else if (cmd === 'raise skeleton') m.summons++; else if (!/^use /.test(cmd)) m.damaging++;
        m.actions++;
        const out = g.input(cmd).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
        m.absorbed += (out.match(/Bone Wall absorbs/g) || []).length;
        if (g.combat) m.rounds = g.combat.round;
    }
    if (g.errors.length) throw g.errors[0];
    m.won = g.mode === 'won' || g.mode === 'explore';   // the boss win ends the game; other fights return to exploring
    m.capped = g.mode === 'combat';
    m.level = g.player.level;
    return m;
}

function wilson(k, n, z = 1.96) { const p = k / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n)); return [Math.round(100 * Math.max(0, (c - r) / d)), Math.round(100 * Math.min(1, (c + r) / d))]; }
const avg = (xs, f) => xs.reduce((s, x) => s + f(x), 0) / xs.length;

for (const [room, label] of [['wardens_roost', 'Boss fight (the Crow-Touched Warden)'], ['ritual_chamber', 'Ritual Chamber at level 3 (3 enemies; not reachable at L3 in normal play, shown for contrast)']]) {
    console.log(`\n### ${label} — Bone Warden L3, ${SEEDS} matched seeds`);
    for (const [vName, data] of Object.entries(VARIANTS)) {
        console.log(`\n**${vName}**\n`);
        console.log('| Rotation | Win % (95% CI) | Rounds | Walls cast | Hits absorbed | Your damage | Minion damage | Damage taken | SE income earned / forfeited per fight | Avg SE at your turn |');
        console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
        for (const [rName, rot] of Object.entries(ROTATIONS)) {
            const runs = []; for (let s = 1; s <= SEEDS; s++) runs.push(fight(data, rot, s, room));
            const w = runs.filter((r) => r.won).length, ci = wilson(w, SEEDS);
            const f = (k, dp = 1) => avg(runs, (r) => r[k]).toFixed(dp);
            const se = avg(runs, (r) => (r.seStart.length ? r.seStart.reduce((a, b) => a + b, 0) / r.seStart.length : 0)).toFixed(2);
            console.log(`| ${rName} | ${Math.round((100 * w) / SEEDS)} (${ci[0]}–${ci[1]}) | ${f('rounds')} | ${f('walls')} | ${f('absorbed')} | ${f('playerDmg', 0)} | ${f('minionDmg', 0)} | ${f('taken', 0)} | ${f('earned')} / ${f('forfeited')} | ${se} |`);
            if (room === 'wardens_roost' && vName === 'shipped' && rName === 'direct damage') {
                const hit = avg(runs, (r) => (r.hitsTaken ? r.taken / r.hitsTaken : 0)), perAction = avg(runs, (r) => (r.damaging ? r.playerDmg / r.damaging : 0));
                console.log(`|  ↳ unit values (direct damage, shipped) | avg boss hit that lands: **${hit.toFixed(1)} HP** · avg damage per damaging action: **${perAction.toFixed(1)}** |||||||||`);
            }
        }
    }
}

// ------------------------------------------------------------------ exploit check
// Level 8 Gravekeeper (has Raise Ghoul). Raise one ghoul, then keep Bone Wall up every round; the ghoul does the damage.
// Under the shipped economy Soul Energy only comes from YOUR damage, so this can't be sustained; with a flat +1 regen it can.
console.log(`\n### Exploit check — level 8 Gravekeeper vs the boss: one ghoul, then Bone Wall every round (${SEEDS} seeds)\n`);
console.log('| Economy | Win % | Fights stuck at the 300-action cap | Rounds | Walls | Hits absorbed | Damage taken | Ghoul damage | Your damage |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
const turtle = (g) => { const p = g.player; if (healing(g)) return without(g, HIDE);
    if (!g.alive(g.combat.minions).length) return p.resource.current >= 3 ? 'raise ghoul' : 'attack 1';
    if (!g.findStatus(p, 'Bone Wall') && p.resource.current >= 1) return 'bone wall';
    return 'attack 1'; };
for (const [vName, data] of Object.entries(VARIANTS)) {
    const runs = []; for (let s = 1; s <= SEEDS; s++) runs.push(fight(data, turtle, s, 'wardens_roost', ['add_xp 2959']));
    const w = runs.filter((r) => r.won).length, cap = runs.filter((r) => r.capped).length;
    const f = (k, dp = 1) => avg(runs, (r) => r[k]).toFixed(dp);
    console.log(`| ${vName} (level ${runs[0].level}) | ${Math.round((100 * w) / SEEDS)} | ${cap} | ${f('rounds')} | ${f('walls')} | ${f('absorbed')} | ${f('taken', 0)} | ${f('minionDmg', 0)} | ${f('playerDmg', 0)} |`);
}
