// Post-Warden bosses on the real ActionSim + engine (Tokelo, 2026-11-17: "all the bosses going forward should shatter
// this illusion that the game is easy"; docs/design/BOSS_DIFFICULTY.md). Gauge (balance), Tally (QA).
//
// The bot is the warden_benchmark one: it holds its weapon range, casts what is ready, dodges a tell with probability
// --react about 150 ms before it lands, and quick-heals below 40% HP while it has a heal. It fights the nearest member
// of the group (adds first if they are closer), and wins when the boss falls. Standard for these bosses: 25-40% wins
// per branch at the expected level with a stocked heal kit (--heals 6), i.e. most first attempts die.
//   node qa/scripts/boss_benchmark.js [--boss bjarki|echo|peat|all] [--seeds 20] [--react 0.6] [--heals 6] [--level N] [--hp X] [--only warrior]
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
const HEALS = parseInt(opt('--heals', '6'), 10);
const MAX_S = parseInt(opt('--max', '300'), 10);
const ONLY = opt('--only', null);
const HP_MULT = opt('--hp', null);
const STEP = 1000 / 60;

// Expected level: the Warden leaves you at 5 (946 XP); the Binding Echo is a level 5-6 trial; Bjarki and the Man in the
// Peat sit in Chapter Two Act II, about level 6.
const BOSSES = {
    echo: { key: 'binding_echo', map: 'gullstrand_coast', encounter: 'wolfs_wake_trial', flags: ['fenrir_trial_called'], level: 5 },
    bjarki: { key: 'bjarki_grave_bound', map: 'bjarki_barrow', encounter: 'barrow_bjarki_bare', flags: ['barrow_anchors_1', 'barrow_anchors_2', 'barrow_anchors_3'], level: 6 },
    peat: { key: 'peat_king', map: 'jarnmyr', encounter: 'jarnmyr_peat_king', flags: ['mire_bjorn_asked'], level: 6 }
};
const SETUPS = [
    { cls: 'warrior', branch: 'vanguard', keep: 18 }, { cls: 'warrior', branch: 'berserker', keep: 18 },
    { cls: 'rogue', branch: 'duelist', keep: 14 }, { cls: 'rogue', branch: 'assassin', keep: 14 }, { cls: 'rogue', branch: 'saboteur', keep: 14 },
    { cls: 'mage', branch: 'illusionist', keep: 90 }, { cls: 'mage', branch: 'elementalist', keep: 90 },
    { cls: 'necromancer', branch: 'bone_warden', keep: 80 }, { cls: 'necromancer', branch: 'plaguecaller', keep: 80 }
].filter((s) => !ONLY || s.cls === ONLY || s.branch === ONLY);

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const freeNear = (s, x, y) => { for (let r = 0; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!s.solidForAction(x + dx, y + dy) && !s.exitAt(x + dx, y + dy)) return [x + dx, y + dy]; throw new Error('no free cell'); };

function fight(B, st, seed) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    if (HP_MULT != null) ((g.data.actionRules.bosses || {})[B.key] || {}).hpMult = parseFloat(HP_MULT);
    g.start(); g.input(st.cls); g.enterWorld();
    const level = parseInt(opt('--level', String(B.level)), 10);
    while (g.player.level < 3) g.addExperience(g.player.xpToNext, { quiet: true });
    if (g.pendingBranchChoice) g.chooseBranch(st.branch);
    while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true });
    if (!g.progression || g.progression.branch !== st.branch) throw new Error(`${st.cls}: branch ${st.branch} not chosen`);
    for (const f of B.flags) g.story.flags.push(f);
    for (let k = 0; k < HEALS; k++) g.player.inventory.push(k % 2 ? 'Bandages' : 'Healing Herb Bundle');
    const s = new WorldSession(WORLD, { engine: g });
    const map = WORLD.maps[B.map];
    s.place(B.map, Object.keys(map.spawns)[0]);
    const enc = map.encounters.find((e) => e.id === B.encounter);
    const [x, y] = freeNear(s, enc.x + 5, enc.y + 3);
    s.x = x; s.y = y;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    for (let i = 0; i < 30; i++) sim.update(STEP, {});
    const grp = sim.groups[B.encounter];
    if (!grp) throw new Error(`no group ${B.encounter}`);
    sim.engageGroup(grp);
    const R = rng(seed * 7919 + 3), decided = new Map(), bar = g.ensureSkillBar();
    let slotTurn = 0, healsUsed = 0;
    const boss = () => sim.actors.find((a) => a.key === B.key && a.encounterId === B.encounter);
    for (let i = 0; i < MAX_S * 60; i++) {
        const b = boss();
        if (!b || b.dead) return { won: true, s: i / 60, healsUsed };
        if (g.mode !== 'combat' && i > 30) return { won: false, s: i / 60, healsUsed, left: true };
        const p = sim.player;
        const foes = sim.actors.filter((a) => a.encounterId === B.encounter && !a.dead && a.engineId);
        const t = foes.sort((u, v) => Math.hypot(u.x - p.x, u.y - p.y) - Math.hypot(v.x - p.x, v.y - p.y))[0] || b;
        const d = Math.hypot(t.x - p.x, t.y - p.y) || 1, ux = (t.x - p.x) / d, uy = (t.y - p.y) / d;
        const input = { aim: { x: t.x, y: t.y }, move: { x: 0, y: 0 } };
        const threat = foes.find((a) => a.state === 'windup' && a.windup && a.stateEnd - sim.now < 160 && !decided.has(a.sid + a.windup.start));
        if (threat) {
            const key = threat.sid + threat.windup.start;
            decided.set(key, R() < REACT);
            if (decided.get(key)) { input.move = { x: -ux * 0.6 - uy * 0.8, y: -uy * 0.6 + ux * 0.8 }; input.dodge = true; }
        }
        if (!input.dodge && HEALS && g.player.hp < g.player.maxHp * 0.4 && g.mode === 'combat') { const n = g.player.inventory.length; g.act({ type: 'quick_heal' }); if (g.player.inventory.length < n) healsUsed++; }
        if (!input.dodge) {
            if (d > st.keep + 6) input.move = { x: ux, y: uy }; else if (d < st.keep - 10) input.move = { x: -ux, y: -uy };
            let cast = null;
            if (i % 10 === 0 && g.mode === 'combat') for (let k = 0; k < bar.length && cast == null; k++) { const slot = (slotTurn + k) % bar.length, name = bar[slot]; if (!name) continue; const av = g.skillAvailability(name, false); if (av && av.enabled) { cast = slot; slotTurn = slot + 1; } }
            if (cast != null) input.slot = cast; else input.attack = true;
        }
        const out = sim.update(STEP, input);
        if (out.engineEvents && out.engineEvents.some((e) => e.type === 'world.respawn')) return { won: false, s: i / 60, healsUsed, died: true };
        if (g.mode === 'game_over') return { won: false, s: i / 60, healsUsed, died: true };
    }
    return { won: false, timeout: true, s: MAX_S, healsUsed };
}

const which = opt('--boss', 'all');
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
for (const [name, B] of Object.entries(BOSSES)) {
    if (which !== 'all' && which !== name) continue;
    console.log(`\n${B.key} (${B.encounter}), level ${opt('--level', B.level)}, ${HEALS} heals, ${SEEDS} seeds, react ${REACT}${HP_MULT != null ? `, hpMult ${HP_MULT}` : ''}\n`);
    console.log('| class / branch | win | time to win | died | heals used | timeouts |');
    console.log('|---|---|---|---|---|---|');
    for (const st of SETUPS) {
        const rs = []; for (let k = 0; k < SEEDS; k++) rs.push(fight(B, st, 5000 + k));
        const wins = rs.filter((x) => x.won);
        const ttk = wins.length ? `${mean(wins.map((x) => x.s)).toFixed(1)} s` : '-';
        console.log(`| ${st.cls} / ${st.branch} | ${Math.round(100 * wins.length / rs.length)}% | ${ttk} | ${rs.filter((x) => x.died).length} | ${mean(rs.map((x) => x.healsUsed)).toFixed(1)} | ${rs.filter((x) => x.timeout).length} |`);
    }
}
