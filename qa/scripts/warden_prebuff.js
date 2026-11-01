// Crow Warden vs stacked pre-buffs: a headless bot on the real ActionSim + engine. Gauge (balance), Tally (QA).
// Question (2026-11-01): since buffs stack (#202), outlive a fight and refill out of one (#200, #201), can a player
// stack up before the pull and trivialise the chapter boss? Each class at level 3 on its buff branch fights the
// Warden twice per seed: once walking in cold, once after pre-buffing every self buff to max stacks.
//
// The bot is deliberately simple and the same in both runs: it keeps its weapon range, attacks on cooldown, keeps
// its in-fight buffs up, and dodges a Warden wind-up with probability --react (a stand-in for player skill).
//   node qa/scripts/warden_prebuff.js [--seeds 20] [--react 0.6] [--max 240] [--class warrior]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const { doubleWorld } = require(path.join(ROOT, 'src/world/scale16.js'));
const { ActionSim } = require(path.join(ROOT, 'src/action/sim.js'));
const WORLD = doubleWorld(require(path.join(ROOT, 'src/world/zone1.js')));

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SEEDS = parseInt(opt('--seeds', '20'), 10);
const REACT = parseFloat(opt('--react', '0.6'));
const MAX_S = parseInt(opt('--max', '240'), 10);
const ONLY = opt('--class', null);
const STEP = 1000 / 60;

// class -> level 3 branch with a stacking self buff, the buffs to keep up, and how far to stand
const SETUPS = [
    { cls: 'warrior', branch: 'Vanguard', buffs: ['Guard'], keep: 18 },
    { cls: 'rogue', branch: 'Duelist', buffs: ['Evasion', 'Riposte'], keep: 14 },
    { cls: 'necromancer', branch: 'Bone Warden', buffs: ['Bone Wall'], summon: 'Raise Skeleton', keep: 80 },
    { cls: 'mage', branch: 'Illusionist', buffs: ['mirrorImage'], keep: 90 }
].filter((s) => !ONLY || s.cls === ONLY);
const STATUS_OF = { mirrorImage: 'Mirror Image' };

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const freeNear = (s, x, y) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!s.solidForAction(x + dx, y + dy) && !s.exitAt(x + dx, y + dy)) return [x + dx, y + dy]; throw new Error('no free cell'); };

function setup(st, seed) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(st.cls); g.enterWorld();
    g.input('add_xp 250');
    if (g.pendingBranchChoice) g.chooseBranch(st.branch.toLowerCase());
    if (!g.progression || !g.progression.branch) throw new Error(`${st.cls}: branch ${st.branch} not chosen`);
    const bar = g.ensureSkillBar();
    for (const k of [...st.buffs, st.summon].filter(Boolean)) {
        if (!g.player.skills.includes(k)) throw new Error(`${st.cls} lacks ${k} (skills: ${g.player.skills.join(', ')})`);
        if (!bar.includes(k)) bar[bar.indexOf(null)] = k;
    }
    const s = new WorldSession(WORLD, { engine: g });
    s.place('sanctuary', Object.keys(WORLD.maps.sanctuary.spawns)[0]);
    const [x, y] = freeNear(s, 22, 18);
    s.x = x; s.y = y;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    return { g, s, sim, slot: (k) => g.ensureSkillBar().indexOf(k) };
}

const stacksOf = (g, name) => { const x = g.player.statusEffects.find((e) => e.name === (STATUS_OF[name] || name)); return x ? (x.stacks || 1) : 0; };
const maxStacks = (g, name) => ((g.data.realtimeRules.statuses.buffs[STATUS_OF[name] || name] || {}).maxStacks || 1);

/** Out of the fight: cast every buff to max stacks (and the summon), waiting out cooldowns on the calm clock. */
function prebuff(r, st) {
    const want = [...st.buffs.flatMap((b) => Array(maxStacks(r.g, b)).fill(b)), ...(st.summon ? [st.summon] : [])];
    let t = 0;
    for (const k of want) {
        const before = k === st.summon ? (r.g.world.followers || []).length : stacksOf(r.g, k);
        for (let i = 0; i < 60 * 30; i++, t++) {   // up to 30 s per cast (cooldown + resource refill)
            const ready = k === st.summon || !r.g.actionPrebuffProblem(k);
            r.sim.update(STEP, ready && i % 10 === 0 ? { slot: r.slot(k) } : {});
            const now = k === st.summon ? (r.g.world.followers || []).length : stacksOf(r.g, k);
            if (now > before) break;
        }
    }
    return { seconds: t / 60, stacks: Object.fromEntries(st.buffs.map((b) => [b, stacksOf(r.g, b)])), followers: (r.g.world.followers || []).length };
}

function fight(st, seed, pre) {
    const r = setup(st, seed);
    const R = rng(seed * 7919 + (pre ? 1 : 0));
    let preInfo = null;
    if (pre) preInfo = prebuff(r, st);
    r.g.story.flags.push('warden_challenged');
    for (let i = 0; i < 30; i++) r.sim.update(STEP, {});
    const wardenActor = () => r.sim.actors.find((a) => a.key === 'crow_touched_warden');
    if (!wardenActor()) throw new Error('no Warden in the sim');
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);
    const startHp = r.g.player.hp;
    let taken = 0, lastHp = r.g.player.hp, decided = new Map(), dodges = 0;
    for (let i = 0; i < MAX_S * 60; i++) {
        const w = wardenActor();
        const we = r.g.combat && r.g.combat.enemies && r.g.combat.enemies.find((e) => e.key === 'crow_touched_warden');
        if (!w || w.dead || (we && we.hp <= 0) || (r.g.mode !== 'combat' && i > 30)) {
            const won = !!(w && w.dead) || !!(we && we.hp <= 0) || r.g.mode !== 'combat' && r.g.player.hp > 0 && !r.respawned;
            return { won, s: i / 60, taken, hpLeftPct: r.g.player.hp / r.g.player.maxHp, startHp, dodges, preInfo };
        }
        const p = r.sim.player;
        const d = Math.hypot(w.x - p.x, w.y - p.y) || 1;
        const ux = (w.x - p.x) / d, uy = (w.y - p.y) / d;
        const input = { aim: { x: w.x, y: w.y }, move: { x: 0, y: 0 } };
        // react to a wind-up once, ~150 ms before it lands
        if (w.state === 'windup' && w.windup && w.stateEnd - r.sim.now < 160) {
            const key = w.windup.start;
            if (!decided.has(key)) decided.set(key, R() < REACT);
            if (decided.get(key) === true) {
                input.move = { x: -ux * 0.6 + -uy * 0.8, y: -uy * 0.6 + ux * 0.8 };   // back and to the side (clears arcs and crow shadows)
                input.dodge = true; decided.set(key, 'done'); dodges++;
            }
        }
        if (!input.dodge) {
            if (d > st.keep + 6) input.move = { x: ux, y: uy };
            else if (d < st.keep - 10) input.move = { x: -ux, y: -uy };
            // keep buffs up in the fight; otherwise attack
            const low = st.buffs.find((b) => stacksOf(r.g, b) === 0 && !(r.g.getAvailableActions && false));
            if (low && i % 30 === 0) input.slot = r.slot(low);
            else if (st.summon && !(r.g.combat.minions || []).some((m) => m.hp > 0) && i % 60 === 0) input.slot = r.slot(st.summon);
            else input.attack = true;
        }
        const out = r.sim.update(STEP, input);
        if (out.engineEvents && out.engineEvents.some((e) => e.type === 'world.respawn')) return { won: false, s: i / 60, taken: taken + lastHp, hpLeftPct: 0, startHp, dodges, preInfo };
        if (r.g.player.hp < lastHp) taken += lastHp - r.g.player.hp;
        lastHp = r.g.player.hp;
        if (r.g.player.hp <= 0) return { won: false, s: i / 60, taken, hpLeftPct: 0, startHp, dodges, preInfo };
    }
    return { won: false, timeout: true, s: MAX_S, taken, hpLeftPct: r.g.player.hp / r.g.player.maxHp, startHp, dodges, preInfo };
}

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const pct = (x) => `${Math.round(x * 100)}%`;
console.log(`Crow Warden, level 3, ${SEEDS} seeds, react ${REACT}, cap ${MAX_S} s\n`);
console.log('| class / branch | pre-buff | win | time to kill (wins) | HP lost per fight | HP left (wins) | timeouts | pre-buff state |');
console.log('|---|---|---|---|---|---|---|---|');
const summary = [];
for (const st of SETUPS) for (const pre of [false, true]) {
    const rs = [];
    for (let k = 0; k < SEEDS; k++) rs.push(fight(st, 1000 + k, pre));
    const wins = rs.filter((x) => x.won);
    const p0 = rs[0].preInfo;
    const row = { cls: st.cls, branch: st.branch, pre, win: wins.length / rs.length, ttk: mean(wins.map((x) => x.s)), taken: mean(rs.map((x) => x.taken)), hpLeft: mean(wins.map((x) => x.hpLeftPct)), timeouts: rs.filter((x) => x.timeout).length, preInfo: p0 };
    summary.push(row);
    console.log(`| ${st.cls} / ${st.branch} | ${pre ? 'yes' : 'no'} | ${pct(row.win)} | ${isNaN(row.ttk) ? '-' : row.ttk.toFixed(1) + ' s'} | ${row.taken.toFixed(0)} | ${isNaN(row.hpLeft) ? '-' : pct(row.hpLeft)} | ${row.timeouts} | ${p0 ? `${JSON.stringify(p0.stacks)}${p0.followers ? ` +${p0.followers} follower` : ''}, ${p0.seconds.toFixed(0)} s to set up` : '-'} |`);
}
if (args.includes('--json')) console.log(JSON.stringify(summary, null, 1));
