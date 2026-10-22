// QA scratch bot: expected-damage skill choice, summons, haste, optional stun-lock.
// Usage: node smartbot.js [runs] [--stunlock] [--set path=value ...]
const { GameEngine, baseData } = require('./lib.js');

const args = process.argv.slice(2);
const RUNS = parseInt(args.find((a) => /^\d+$/.test(a)) || '100', 10);
const STUNLOCK = args.includes('--stunlock');
const data = JSON.parse(JSON.stringify(baseData));
args.forEach((a, i) => {
    if (a !== '--set') return;
    const [p, raw] = args[i + 1].split('='); const ks = p.split('.'); let o = data;
    for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = JSON.parse(raw);
});
const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];

function expected(g, skill, target) {
    const p = g.player, c = g.combat;
    const eff = (t) => (skill.effects || []).find((e) => e.type === t);
    let avg = (skill.base_damage[0] + skill.base_damage[1]) / 2 + g.statBonus(p, skill.damage_type);
    const forced = (eff('guaranteed_crit_first_turn') && !c.playerActedThisRound) || g.findStatus(p, 'Guaranteed Crit');
    const critF = forced ? p.critMultiplier : 1 + p.critChance * (p.critMultiplier - 1);
    const one = (t) => {
        let d = avg * critF;
        let def = t.def || 0;
        if (skill.damage_type === 'true' || eff('ignore_armor') || eff('true_damage')) def = 0;
        else if (eff('ignore_armor_percent')) def *= 1 - eff('ignore_armor_percent').value;
        d = Math.max(0, d - def);
        if (eff('bonus_damage_per_corpse')) d += c.corpses * eff('bonus_damage_per_corpse').value;
        const fl = (skill.effects || []).filter((e) => e.type === 'bonus_damage_vs_flag' && (t.specialFlags || []).includes(e.flag));
        for (const f of fl) d += f.value;
        if (eff('multi_hit')) d *= eff('multi_hit').count;
        if (eff('bleed')) d += eff('bleed').value * eff('bleed').duration * 0.8;
        return Math.min(d, t.hp + 3);
    };
    const living = g.alive(c.enemies);
    if (['enemy_aoe', 'all_enemies', 'corpse'].includes(skill.target)) return living.reduce((s, t) => s + one(t), 0);
    let d = one(target);
    if (eff('chain_lightning')) d += living.filter((t) => t !== target).slice(0, 2).reduce((s, t) => s + one(t), 0);
    return d;
}

function choose(g) {
    const p = g.player, c = g.combat;
    const living = g.alive(c.enemies);
    const idx = (t) => 1 + living.indexOf(t);
    const can = (name) => p.skills.includes(name) && g.isCastable(g.playerSkill(name)) && g.skillCost(g.playerSkill(name)) <= p.resource.current;
    const weakest = living.reduce((a, b) => (b.hp < a.hp ? b : a));
    const threat = (e) => (e.skills.reduce((s, k) => s + (k.base_damage[0] + k.base_damage[1]) / 2, 0) / e.skills.length) - (p.def || 0);
    const biggest = living.reduce((a, b) => (threat(b) > threat(a) ? b : a));
    const enemyHp = living.reduce((s, e) => s + e.hp, 0);

    if (p.hp <= p.maxHp * 0.45) { const it = HEALS.find((h) => p.inventory.includes(h)); if (it) return `use ${it}`; }
    // summons first while the fight is long enough to pay off
    for (const s of ['Raise Ghoul', 'Raise Skeleton']) if (can(s) && g.alive(c.minions).length < g.minionCap() && enemyHp > 35) return s;
    if (can('haste') && !c.extraTurn) return 'haste';
    if (STUNLOCK) {
        for (const s of ['Shield Bash', "Reaper's Charge", 'Garrote', 'slow']) {
            if (!can(s)) continue;
            const tgt = living.find((e) => (e.specialFlags || []).includes('boss')) || biggest;
            if (!g.statusOfType(tgt, 'skip_turn') && !g.statusOfType(tgt, 'silence')) return `${s} ${idx(tgt)}`;
        }
    }
    let best = null;
    for (const name of [g.basicAttackName(), ...p.skills]) {
        const sk = g.playerSkill(name);
        if (!sk || !sk.base_damage || !g.isCastable(sk) || sk.cost === 'all' || sk.oncePerFight) continue;
        if (g.skillCost(sk) > p.resource.current) continue;
        if (sk.effects && sk.effects.some((e) => e.type === 'stun') && !STUNLOCK && name !== g.basicAttackName()) {
            // without --stunlock, treat stuns as damage only (as the shipped bot effectively does)
        }
        const single = !['enemy_aoe', 'all_enemies', 'corpse'].includes(sk.target);
        for (const t of single ? living : [weakest]) {
            const dmg = expected(g, sk, t);
            // prefer kills on the weakest, then raw damage, then cheaper
            const score = dmg + (dmg >= t.hp ? 6 : 0) + (t === weakest ? 1 : 0) - g.skillCost(sk) * 0.3;
            if (!best || score > best.score) best = { score, cmd: single ? `${name} ${idx(t)}` : name };
        }
    }
    if (p.className === 'mage' && p.resource.current < 1 && p.skills.includes('Focus') && best && best.score < 8) return 'focus';
    return best ? best.cmd : `attack ${idx(weakest)}`;
}

function run(cls, seed, branch) {
    const g = new GameEngine({ seed, data });
    g.start();
    const do_ = (x) => { g.cmds.push(x); g.input(x); };
    g.cmds = [];
    const pickBranch = () => { if (g.mode === 'branch_select') do_(branch); };
    do_(cls);
    const path = ['n', 'engage', 's', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage'];
    for (const step of path) {
        pickBranch();
        if (g.mode === 'game_over' || g.mode === 'won') break;
        for (const it of [...g.rooms[g.currentRoom].items]) do_(`take ${it}`);
        do_(step);
        for (let i = 0; i < 300 && g.mode === 'combat'; i++) do_(choose(g));
    }
    if (g.errors.length) throw g.errors[0];
    return { won: g.mode === 'won', room: g.currentRoom, level: g.player.level, cmds: g.cmds };
}

if (require.main === module) {
    console.log(`smart bot, ${RUNS} runs per class/branch${STUNLOCK ? ', STUN-LOCK on' : ''}`);
    for (const cls of Object.keys(data.basePlayerClasses)) {
        const row = [];
        let total = 0;
        for (const br of Object.keys(data.evolutionPaths[cls].branches)) {
            let w = 0; const deaths = {};
            for (let s = 1; s <= RUNS; s++) { const r = run(cls, s, br.replace(/_/g, ' ')); if (r.won) w++; else deaths[r.room] = (deaths[r.room] || 0) + 1; }
            total += w;
            const top = Object.entries(deaths).sort((a, b) => b[1] - a[1])[0];
            row.push(`${br} ${Math.round((w / RUNS) * 100)}%${top ? ` (dies: ${top[0]})` : ''}`);
        }
        console.log(`${cls.padEnd(12)} ${String(Math.round((total / (RUNS * 3)) * 100)).padStart(3)}%  | ${row.join(' · ')}`);
    }
}
module.exports = { run, choose };
