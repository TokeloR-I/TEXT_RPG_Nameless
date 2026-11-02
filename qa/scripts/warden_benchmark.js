// Crow Warden class benchmark: every level 3 branch fights the Warden on the real ActionSim + engine.
// Gauge (balance), Tally (QA). Target (BALANCE_LEVEL_GROWTH.md): 60 to 90 s per kill, 70 to 90% wins.
//
// The bot is the same for every class: it holds its weapon range, casts every skill on its bar the moment the engine
// says it is available (else the basic attack), and dodges a Warden wind-up with probability --react, about 150 ms
// before it lands. It reads Marked Prey and the phase 3 crow storms only through that dodge, so it is a "decent
// player" stand-in, not a perfect one. It also logs the time each phase opened.
//   node qa/scripts/warden_benchmark.js [--seeds 20] [--react 0.6] [--max 240] [--only necromancer] [--json]
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
const ONLY = opt('--only', null);
const HP_MULT = opt('--hp', null);   // try a Warden hpMult without editing data.js
const STEP = 1000 / 60;

const SETUPS = [
    { cls: 'warrior', branch: 'vanguard', keep: 18 },
    { cls: 'warrior', branch: 'berserker', keep: 18 },
    { cls: 'rogue', branch: 'duelist', keep: 14 },
    { cls: 'rogue', branch: 'assassin', keep: 14 },
    { cls: 'mage', branch: 'illusionist', keep: 90 },
    { cls: 'mage', branch: 'elementalist', keep: 90 },
    { cls: 'necromancer', branch: 'bone_warden', keep: 80 },
    { cls: 'necromancer', branch: 'plaguecaller', keep: 80 }
].filter((s) => !ONLY || s.cls === ONLY || s.branch === ONLY);

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const freeNear = (s, x, y) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!s.solidForAction(x + dx, y + dy) && !s.exitAt(x + dx, y + dy)) return [x + dx, y + dy]; throw new Error('no free cell'); };

function setup(st, seed) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    if (HP_MULT != null) g.data.actionRules.bosses.crow_touched_warden.hpMult = parseFloat(HP_MULT);
    g.start(); g.input(st.cls); g.enterWorld();
    g.input('add_xp 250');
    if (g.pendingBranchChoice) g.chooseBranch(st.branch);
    if (!g.progression || g.progression.branch !== st.branch) throw new Error(`${st.cls}: branch ${st.branch} not chosen`);
    const s = new WorldSession(WORLD, { engine: g });
    s.place('sanctuary', Object.keys(WORLD.maps.sanctuary.spawns)[0]);
    const [x, y] = freeNear(s, 22, 18);
    s.x = x; s.y = y;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    return { g, s, sim };
}

function fight(st, seed) {
    const r = setup(st, seed);
    const R = rng(seed * 7919 + 3);
    r.g.story.flags.push('warden_challenged');
    for (let i = 0; i < 30; i++) r.sim.update(STEP, {});
    const wardenActor = () => r.sim.actors.find((a) => a.key === 'crow_touched_warden');
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);
    const bar = r.g.ensureSkillBar();
    const phaseAt = {};
    let decided = new Map(), slotTurn = 0;
    for (let i = 0; i < MAX_S * 60; i++) {
        const w = wardenActor();
        const we = r.g.combat && r.g.combat.enemies && r.g.combat.enemies.find((e) => e.key === 'crow_touched_warden');
        if (w && !phaseAt[w.phaseIdx + 1]) phaseAt[w.phaseIdx + 1] = i / 60;
        if (!w || w.dead || (we && we.hp <= 0) || (r.g.mode !== 'combat' && i > 30)) {
            const won = !!(w && w.dead) || !!(we && we.hp <= 0);
            return { won, s: i / 60, phaseAt };
        }
        const p = r.sim.player;
        // Crow's Illusion: the bot can't tell them apart either, so it goes for the nearest Warden it sees
        const t = r.sim.actors.filter((a) => a.key === 'crow_touched_warden' && !a.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] || w;
        const d = Math.hypot(t.x - p.x, t.y - p.y) || 1;
        const ux = (t.x - p.x) / d, uy = (t.y - p.y) / d;
        const input = { aim: { x: t.x, y: t.y }, move: { x: 0, y: 0 } };
        const threat = r.sim.actors.find((a) => a.key === 'crow_touched_warden' && !a.dead && a.state === 'windup' && a.windup && a.stateEnd - r.sim.now < 160 && !decided.has(a.sid + a.windup.start));
        if (threat) {
            const key = threat.sid + threat.windup.start;
            if (!decided.has(key)) decided.set(key, R() < REACT);
            if (decided.get(key) === true) {
                input.move = { x: -ux * 0.6 + -uy * 0.8, y: -uy * 0.6 + ux * 0.8 };
                input.dodge = true; decided.set(key, 'done');
            }
        }
        if (!input.dodge) {
            if (d > st.keep + 6) input.move = { x: ux, y: uy };
            else if (d < st.keep - 10) input.move = { x: -ux, y: -uy };
            let cast = null;
            if (i % 10 === 0 && r.g.mode === 'combat') {
                for (let k = 0; k < bar.length && cast == null; k++) {
                    const slot = (slotTurn + k) % bar.length, name = bar[slot];
                    if (!name) continue;
                    const av = r.g.skillAvailability(name, false);
                    if (av && av.enabled) { cast = slot; slotTurn = slot + 1; }
                }
            }
            if (cast != null) input.slot = cast; else input.attack = true;
        }
        const out = r.sim.update(STEP, input);
        if (out.engineEvents && out.engineEvents.some((e) => e.type === 'world.respawn')) return { won: false, s: i / 60, phaseAt };
    }
    return { won: false, timeout: true, s: MAX_S, phaseAt };
}

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const pct = (x) => `${Math.round(x * 100)}%`;
const f1 = (x) => (isNaN(x) ? '-' : `${x.toFixed(1)} s`);
console.log(`Crow Warden, level 3, ${SEEDS} seeds, react ${REACT}, cap ${MAX_S} s${HP_MULT != null ? `, hpMult ${HP_MULT}` : ''}\n`);
console.log('| class / branch | win | time to kill (wins) | phase 2 opens | phase 3 opens | timeouts |');
console.log('|---|---|---|---|---|---|');
const summary = [];
for (const st of SETUPS) {
    const rs = [];
    for (let k = 0; k < SEEDS; k++) rs.push(fight(st, 1000 + k));
    const wins = rs.filter((x) => x.won);
    const row = { cls: st.cls, branch: st.branch, win: wins.length / rs.length, ttk: mean(wins.map((x) => x.s)),
        p2: mean(rs.filter((x) => x.phaseAt[2] != null).map((x) => x.phaseAt[2])), p3: mean(rs.filter((x) => x.phaseAt[3] != null).map((x) => x.phaseAt[3])), timeouts: rs.filter((x) => x.timeout).length };
    summary.push(row);
    console.log(`| ${st.cls} / ${st.branch} | ${pct(row.win)} | ${f1(row.ttk)} | ${f1(row.p2)} | ${f1(row.p3)} | ${row.timeouts} |`);
}
if (args.includes('--json')) console.log(JSON.stringify(summary, null, 1));
