// QA evidence lane for issues #29 (QA-8B regen) and #40 (P1 balance recovery).
// Isolated factorial on scratch data copies only: nothing in src/, tests/ or data is changed.
// The engine is only WRAPPED to observe (resource, income, actions); behaviour is untouched
// (checked: win counts with and without the wrappers are identical, see --selfcheck).
//
//   node qa/scripts/balance_lane.js [seeds=100] [--json out.json] [--selfcheck] [--stunlock]
//
// Scenarios
//   boss  = QA report #1 setup: add_xp 250, pick the branch (level 3), + Bandages, Half-full Wine Bottle,
//           Healing Herb Bundle, straight into the Crow-Touched Warden at full HP.
//   full  = the real dungeon, no cheats (same path as tools/balance.js); branch picked at level 3.
// Bots
//   smart  = qa/scripts/smartbot.js choose() (expected damage, summons, Haste first)
//   simple = the shipped tools/balance.js policy (biggest affordable damage skill on the weakest enemy)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const BASE = require(path.join(ROOT, 'src/data.js'));
const { choose: smartChoose } = require('./smartbot.js');

const argv = process.argv.slice(2);
const SEEDS = parseInt(argv.find((a) => /^\d+$/.test(a)) || '100', 10);
const JSON_OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const SELFCHECK = argv.includes('--selfcheck');
const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];

// ------------------------------------------------------------------ variants (scratch data copies)
const clone = (o) => JSON.parse(JSON.stringify(o));
const mk = (...muts) => { const d = clone(BASE); for (const m of muts) m(d); return d; };
const regen = (map) => (d) => { for (const [k, v] of Object.entries(map)) d.resourceRules[k].regen = v; };
const def = (n) => (d) => { for (const c of ['mage', 'rogue', 'necromancer']) d.basePlayerClasses[c].baseStats.def += n; };
const R4 = { 'Stealth Tokens': 3, 'Combo Points': 3, 'Deception Tokens': 2, 'Time Charges': 2 };
const VARIANTS = {
    'B': mk(),
    'R:Stealth3': mk(regen({ 'Stealth Tokens': 3 })),
    'R:Combo3': mk(regen({ 'Combo Points': 3 })),
    'R:Decep2': mk(regen({ 'Deception Tokens': 2 })),
    'R:Time2': mk(regen({ 'Time Charges': 2 })),
    'R4': mk(regen(R4)),
    'D+1': mk(def(1)),
    'D+2': mk(def(2)),
    'R4+D1': mk(regen(R4), def(1)),
    'R4+D2': mk(regen(R4), def(2)),
};
const BRANCHES = [];
for (const [cls, t] of Object.entries(BASE.evolutionPaths)) for (const br of Object.keys(t.branches)) BRANCHES.push([cls, br]);

// ------------------------------------------------------------------ bots
function simpleChoose(g) {
    const p = g.player;
    if (p.hp <= p.maxHp * 0.45) { const it = HEALS.find((h) => p.inventory.includes(h)); if (it) return `use ${it}`; }
    const opts = p.skills.map((n) => g.playerSkill(n)).filter((s) => s && s.base_damage && g.isCastable(s) && s.cost !== 'all' && !s.oncePerFight && g.skillCost(s) <= p.resource.current).sort((a, b) => (b.cost || 0) - (a.cost || 0));
    const living = g.alive(g.combat.enemies); const t = 1 + living.indexOf(living.reduce((a, b) => (b.hp < a.hp ? b : a)));
    return opts.length ? `${opts[0].name} ${t}` : `attack ${t}`;
}
const BOTS = { smart: smartChoose, simple: simpleChoose };

// ------------------------------------------------------------------ instrumentation (observe only)
function instrument(g, m) {
    if (SELFCHECK && instrument.off) return;
    const endRound = g.endRound.bind(g), gain = g.gainResource.bind(g);
    let inEnd = false;
    g.endRound = function () {
        const c = this.combat; m.rounds++;
        if (this.player.className === 'necromancer' && c.playerActedThisRound && !c.dealtDamageThisRound) m.seForfeit++;
        inEnd = true; try { return endRound(); } finally { inEnd = false; }
    };
    g.gainResource = function (t, amount) {
        const got = gain(t, amount);
        if (inEnd && t === this.player && amount > 0) { m.incomeAsked += amount; m.incomeGot += got; }
        return got;
    };
}
function observeTurn(g, m, cls, cmd) {
    const p = g.player, c = g.combat;
    if (!c || !c.awaitingPlayer || c.awaitingContinue) return;
    m.turns++;
    m.resSum += p.resource.current;
    if (p.resource.current >= p.resource.max) m.atCap++;
    const paid = p.skills.map((n) => g.playerSkill(n)).filter((s) => s && typeof s.cost === 'number' && s.cost > 0 && g.isCastable(s));
    if (paid.length) { m.paidTurns++; if (!paid.some((s) => g.skillCost(s) <= p.resource.current)) m.starved++; }
    for (const n of BASE.basePlayerClasses[cls].startingSkills) {
        const s = g.playerSkill(n);
        if (!s || typeof s.cost !== 'number' || s.cost <= 0) continue;
        m.inhTurns++; if (g.skillCost(s) <= p.resource.current) m.inhAfford++;
    }
    // action mix
    const name = /^use /.test(cmd) ? null : g.resolveSkillName(cmd.replace(/\s*\d+$/, '')) || (/^attack/.test(cmd) ? g.basicAttackName() : null);
    let cat = 'other';
    if (/^use /.test(cmd)) cat = 'item';
    else if (/^attack/.test(cmd) || name === g.basicAttackName()) cat = 'basic';
    else if (name && BASE.basePlayerClasses[cls].startingSkills.includes(name)) cat = (g.playerSkill(name).cost ? 'inheritedPaid' : 'inheritedFree');
    else if (name) cat = 'branch';
    m.mix[cat] = (m.mix[cat] || 0) + 1;
}
const newMetrics = () => ({ runs: 0, wins: 0, turns: 0, resSum: 0, atCap: 0, paidTurns: 0, starved: 0, inhTurns: 0, inhAfford: 0, mix: {}, rounds: 0, incomeAsked: 0, incomeGot: 0, seForfeit: 0, deaths: {}, fightsWon: 0, bossRounds: 0, bossHpLeft: 0, losses: 0, capHits: 0, maxBossSkipRun: 0, reachedBoss: 0, endLevel: 0 });

// ------------------------------------------------------------------ one run
function playFight(g, m, cls, bot, onText) {
    let i = 0;
    for (; i < 300 && g.mode === 'combat'; i++) {
        const cmd = bot(g);
        observeTurn(g, m, cls, cmd);
        onText(g.input(cmd));
    }
    if (g.mode === 'combat') m.capHits++;
}
function bossSkipTracker(m) {
    let run = 0;
    return (evs) => {
        for (const e of evs) {
            if (e.type !== 'text') continue;
            if (e.text.includes("The Crow-Touched Warden's Turn!")) run = 0;
            else if (e.text.includes('The Crow-Touched Warden is unable to act')) { run++; if (run > m.maxBossSkipRun) m.maxBossSkipRun = run; }
        }
    };
}
function runBoss(data, cls, br, seed, bot, m) {
    const g = new GameEngine({ seed, data }); g.start();
    [cls, 'add_xp 250', br.replace(/_/g, ' ')].forEach((c) => g.input(c));
    g.player.inventory.push('Bandages', 'Half-full Wine Bottle', 'Healing Herb Bundle');
    g.currentRoom = 'wardens_roost';
    instrument(g, m);
    const track = bossSkipTracker(m);
    track(g.input('engage'));
    const boss = g.combat.enemies[0];          // keep the reference: on defeat the engine clears g.combat
    let lastRound = g.combat.round;
    playFight(g, m, cls, bot, (evs) => { track(evs); if (g.combat) lastRound = g.combat.round; });
    m.runs++;
    m.bossRounds += lastRound;
    if (g.mode === 'won') m.wins++;
    else { m.losses++; m.bossHpLeft += Math.max(0, boss.hp); }
    if (g.errors.length) throw g.errors[0];
}
function runFull(data, cls, br, seed, bot, m) {
    const g = new GameEngine({ seed, data }); g.start(); g.input(cls);
    instrument(g, m);
    const track = bossSkipTracker(m);
    const steps = ['n', 'engage', 's', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage'];
    for (const step of steps) {
        if (g.mode === 'branch_select') g.input(br.replace(/_/g, ' '));
        if (g.mode === 'game_over' || g.mode === 'won') break;
        for (const it of [...g.rooms[g.currentRoom].items]) g.input(`take ${it}`);
        track(g.input(step));
        if (g.mode === 'combat' && g.currentRoom === 'wardens_roost') m.reachedBoss++;
        const before = g.mode;
        playFight(g, m, cls, bot, track);
        if (before === 'combat' && (g.mode === 'explore' || g.mode === 'won' || g.mode === 'branch_select')) m.fightsWon++;
    }
    m.runs++;
    m.endLevel += g.player.level;
    if (g.mode === 'won') m.wins++; else m.deaths[g.currentRoom] = (m.deaths[g.currentRoom] || 0) + 1;
    if (g.errors.length) throw g.errors[0];
}

// ------------------------------------------------------------------ statistics
function wilson(k, n, z = 1.96) {
    if (!n) return [0, 0];
    const p = k / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    return [Math.max(0, (c - r) / d), Math.min(1, (c + r) / d)];
}
function summarize(m) {
    const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
    const [lo, hi] = wilson(m.wins, m.runs);
    const mixTotal = Object.values(m.mix).reduce((a, b) => a + b, 0);
    return {
        n: m.runs, wins: m.wins, winPct: pct(m.wins, m.runs), ci95: [Math.round(lo * 100), Math.round(hi * 100)],
        avgRes: m.turns ? +(m.resSum / m.turns).toFixed(2) : null, atCapPct: pct(m.atCap, m.turns),
        starvedPct: pct(m.starved, m.paidTurns), inheritedAffordPct: pct(m.inhAfford, m.inhTurns),
        incomeWastePct: pct(m.incomeAsked - m.incomeGot, m.incomeAsked), incomeAsked: m.incomeAsked,
        seForfeitPerRun: m.runs ? +(m.seForfeit / m.runs).toFixed(2) : 0,
        mix: Object.fromEntries(Object.entries(m.mix).map(([k, v]) => [k, pct(v, mixTotal)])),
        avgBossRounds: m.runs && m.bossRounds ? +(m.bossRounds / m.runs).toFixed(1) : null,
        avgBossHpLeftOnLoss: m.losses ? Math.round(m.bossHpLeft / m.losses) : null,
        avgFightsWon: m.fightsWon ? +(m.fightsWon / m.runs).toFixed(2) : null,
        reachedBossPct: pct(m.reachedBoss, m.runs), avgEndLevel: m.endLevel ? +(m.endLevel / m.runs).toFixed(2) : null,
        deaths: m.deaths, capHits: m.capHits, maxBossSkipRun: m.maxBossSkipRun,
    };
}

// ------------------------------------------------------------------ main
if (SELFCHECK) {
    // instrumentation must not change outcomes
    const pick = [['rogue', 'assassin'], ['necromancer', 'bone_warden'], ['mage', 'chronomancer'], ['warrior', 'vanguard']];
    let same = true;
    for (const [cls, br] of pick) for (const sc of [runBoss, runFull]) for (const [bn, bot] of Object.entries(BOTS)) {
        instrument.off = false; const a = newMetrics(); for (let s = 1; s <= 30; s++) sc(VARIANTS.B, cls, br, s, bot, a);
        instrument.off = true; const b = newMetrics(); for (let s = 1; s <= 30; s++) sc(VARIANTS.B, cls, br, s, bot, b);
        if (a.wins !== b.wins) { same = false; console.log(`DIFF ${cls}/${br} ${sc.name} ${bn}: ${a.wins} vs ${b.wins}`); }
    }
    console.log(same ? 'selfcheck OK: instrumentation does not change any outcome' : 'selfcheck FAILED');
    process.exit(same ? 0 : 1);
}

if (argv.includes('--sensitivity')) {
    // Per-branch regen sweep, all other data shipped. Plus the smart bot with Haste removed, to isolate
    // whether "more Time Charges -> worse Chronomancer" is the regen or the bot's self-Haste habit.
    const noHaste = (g) => { const p = g.player, i = p.skills.indexOf('haste'); if (i < 0) return smartChoose(g); p.skills.splice(i, 1); try { return smartChoose(g); } finally { p.skills.splice(i, 0, 'haste'); } };
    const sweeps = [['rogue', 'assassin', 'Stealth Tokens', [0, 1, 2, 3]], ['rogue', 'duelist', 'Combo Points', [0, 1, 2, 3]], ['mage', 'illusionist', 'Deception Tokens', [0, 1, 2, 3]], ['mage', 'chronomancer', 'Time Charges', [0, 1, 2, 3]]];
    const bots = { smart: smartChoose, simple: simpleChoose, 'smart-noHaste': noHaste };
    console.log(`### Regen sensitivity (${SEEDS} seeds) — win % [starved% / at-cap% / income wasted%]`);
    for (const sc of [['boss', runBoss], ['full', runFull]]) {
        console.log(`\n${sc[0] === 'boss' ? 'Boss alone' : 'Full dungeon'}`);
        console.log('| Branch | bot | ' + [0, 1, 2, 3].map((r) => `regen ${r}`).join(' | ') + ' |'); console.log('|---|---|---:|---:|---:|---:|');
        for (const [cls, br, res, vals] of sweeps) for (const [bn, bot] of Object.entries(bots)) {
            if (bn === 'smart-noHaste' && br !== 'chronomancer') continue;
            const row = vals.map((r) => { const data = mk(regen({ [res]: r })); const m = newMetrics(); for (let s = 1; s <= SEEDS; s++) sc[1](data, cls, br, s, bot, m); const x = summarize(m); return `${x.winPct} [${x.starvedPct}/${x.atCapPct}/${x.incomeWastePct ?? 0}]`; });
            console.log(`| ${br} | ${bn} | ${row.join(' | ')} |`);
        }
    }
    process.exit(0);
}

const results = { meta: { commit: null, seeds: `1-${SEEDS}`, bots: Object.keys(BOTS), variants: Object.keys(VARIANTS) }, cells: [] };
try { results.meta.commit = require('child_process').execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch (e) {}
const t0 = Date.now();
for (const [scName, sc] of [['boss', runBoss], ['full', runFull]]) {
    for (const [botName, bot] of Object.entries(BOTS)) {
        for (const [vName, data] of Object.entries(VARIANTS)) {
            for (const [cls, br] of BRANCHES) {
                const m = newMetrics();
                for (let s = 1; s <= SEEDS; s++) sc(data, cls, br, s, bot, m);
                results.cells.push({ scenario: scName, bot: botName, variant: vName, cls, branch: br, ...summarize(m) });
            }
        }
    }
}
results.meta.seconds = Math.round((Date.now() - t0) / 1000);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 1));

// ------------------------------------------------------------------ tables
const cell = (sc, bot, v, br) => results.cells.find((c) => c.scenario === sc && c.bot === bot && c.variant === v && c.branch === br);
const VN = Object.keys(VARIANTS);
for (const sc of ['boss', 'full']) for (const bot of Object.keys(BOTS)) {
    console.log(`\n### ${sc === 'boss' ? 'Boss alone' : 'Full dungeon'} — ${bot} bot — win % (${SEEDS} seeds)`);
    console.log(`| Branch | ${VN.join(' | ')} |`); console.log(`|---|${VN.map(() => '---:').join('|')}|`);
    for (const [, br] of BRANCHES) console.log(`| ${br} | ${VN.map((v) => cell(sc, bot, v, br).winPct).join(' | ')} |`);
}
console.log(`\n(${results.cells.length} cells, ${results.meta.seconds}s, commit ${results.meta.commit})`);
