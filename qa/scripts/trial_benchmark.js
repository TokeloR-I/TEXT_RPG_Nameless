// The Trial of the Cold Door (Fallen Seraphim): Aurevain on the real ActionSim + engine, the player NOT kept alive.
// Gauge (2026-11-04; Tokelo: "a quest with a ridiculously strong boss ... so that going forward is earned"). Target: an
// ordinary level 10 build almost never wins; a level 10 Fallen build (the gifts and the first half of the web) wins
// about half the time in a long fight. Bot: the warden_benchmark one (hold range, cast what is ready, dodge a tell
// with probability --react about 150 ms before it lands; it steps out of nothing else).
//   node qa/scripts/trial_benchmark.js [--seeds 10] [--react 0.6] [--max 300] [--level 10]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const { doubleWorld } = require(path.join(ROOT, 'src/world/scale16.js'));
const { ActionSim } = require(path.join(ROOT, 'src/action/sim.js'));
const WORLD = doubleWorld(require(path.join(ROOT, 'src/world/zone1.js')));
const STEP = 1000 / 60;
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SEEDS = parseInt(opt('--seeds', '10'), 10), REACT = parseFloat(opt('--react', '0.6')), MAX_S = parseInt(opt('--max', '300'), 10), LEVEL = parseInt(opt('--level', '10'), 10);
const KEEP = { warrior: 18, rogue: 14, mage: 90, necromancer: 80 };
const FIRST_HALF = ['feather_ward', 'gale', 'grace', 'mercy', 'brand', 'wings_of_sorrow', 'rain_of_feathers'];
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const levelTo = (g, level) => { while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true }); };

function fight(st, seed) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(st.cls); g.enterWorld();
    levelTo(g, 3); if (g.pendingBranchChoice) g.chooseBranch(st.branch); levelTo(g, LEVEL);
    if (st.fallen) {
        for (let t = 0; t < 1200; t++) g.gazeTick('kloster_seraph_statue', 100);
        if (g.story.dialogue) g.act({ type: 'dialogue_leave' });
        // The guide spent the class points; a Fallen player spends theirs on the web instead (unlearning the latest class picks).
        g.webState().bonusPoints = (g.webState().bonusPoints || 0) + FIRST_HALF.length;
        for (const id of FIRST_HALF) g.act({ type: 'learn_node', nodeId: `fallen_seraphim.${id}` });
        const bar = g.ensureSkillBar();
        ['Fallen Judgement', 'Wings of Sorrow', 'Halo of Ash', 'Mercy of the Fallen'].forEach((n, k) => { if (g.player.skills.includes(n) && !bar.includes(n)) bar[bar.length - 1 - k] = n; });
    }
    g.applyStoryEffects([{ start: 'QS1' }]);
    g.player.inventory.push('Healing Herb Bundle', 'Healing Herb Bundle', 'Bandages', 'Bandages');
    const s = new WorldSession(WORLD, { engine: g });
    s.place('kloster_inner', 'from_garth');
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    for (let i = 0; i < 30; i++) sim.update(STEP, {});
    sim.engageGroup(sim.groups.kloster_trial);
    const R = rng(seed * 7919 + 3), decided = new Map(), bar = g.ensureSkillBar();
    const casts = {}; if (process.env.ONE) { const say = g.say.bind(g); g.say = (t, o) => { const m = /^(\S+) uses (.+?) on .*for (\d+) damage/.exec(t); if (m) { const k = m[1] + ':' + m[2]; const c = casts[k] || (casts[k] = [0, 0]); c[0]++; c[1] += +m[3]; } else if (/can't|not enough|refuse/i.test(t)) casts[t] = (casts[t] || 0) + 1; return say(t, o); }; process.on('exit', () => console.log(JSON.stringify(bar), casts)); }
    let slotTurn = 0;
    for (let i = 0; i < MAX_S * 60; i++) {
        const w = sim.actors.find((a) => a.key === 'heaven_doorwarden' && !a.dead);
        if (!w || g.mode !== 'combat') return { won: !w || g.questState('QS1') === 'complete', s: i / 60, hpLeft: g.player.hp };
        const p = sim.player, d = Math.hypot(w.x - p.x, w.y - p.y) || 1, ux = (w.x - p.x) / d, uy = (w.y - p.y) / d;
        const input = { aim: { x: w.x, y: w.y }, move: { x: 0, y: 0 } };
        const threat = w.state === 'windup' && w.windup && w.stateEnd - sim.now < 160 ? w : null;
        if (threat) {
            const key = threat.sid + ':' + threat.windup.start;
            if (!decided.has(key)) decided.set(key, R() < REACT);
            if (decided.get(key) === true) { input.move = { x: -ux * 0.6 - uy * 0.8, y: -uy * 0.6 + ux * 0.8 }; input.dodge = true; decided.set(key, 'done'); }
        }
        if (!input.dodge) {
            if (p.hp !== undefined && g.player.hp < g.player.maxHp * 0.4) { const h = ['Healing Herb Bundle', 'Bandages'].find((x) => g.player.inventory.includes(x)); if (h) g.act({ type: 'use_item', item: h }); }
            const keep = KEEP[st.cls];
            if (d > keep + 6) input.move = { x: ux, y: uy }; else if (d < keep - 10) input.move = { x: -ux, y: -uy };
            let cast = null;
            for (let k = 0; k < bar.length && cast == null; k++) { const slot = (slotTurn + k) % bar.length, name = bar[slot]; if (!name) continue; const av = g.skillAvailability(name, false); if (av && av.enabled) { cast = slot; slotTurn = slot + 1; } }
            if (cast != null) input.slot = cast; else input.attack = true;
        }
        const out = sim.update(STEP, input);
        if (out.engineEvents && out.engineEvents.some((e) => e.type === 'world.respawn')) return { won: false, s: i / 60, died: true };
        if (g.mode === 'game_over') return { won: false, s: i / 60, died: true };
    }
    return { won: false, timeout: true, s: MAX_S, mode: g.mode, bossHp: (sim.actors.find((a) => a.key === 'heaven_doorwarden') || {}).hp, hp: g.player.hp };
}
if (process.env.ONE) { const [c, b, f] = process.env.ONE.split(','); console.log(fight({ cls: c, branch: b, fallen: !!f }, +(process.env.SEED || 3000))); process.exit(0); }
const SETUPS = [];
for (const [cls, branch] of [['warrior', 'vanguard'], ['warrior', 'berserker'], ['rogue', 'assassin'], ['rogue', 'duelist'], ['necromancer', 'bone_warden'], ['necromancer', 'plaguecaller']])   // the bot can't kite the mage round the fountain; Tokelo asked about these three
    for (const fallen of [false, true]) SETUPS.push({ cls, branch, fallen });
console.log(`Aurevain (Trial of the Cold Door), level ${LEVEL}, ${SEEDS} seeds, react ${REACT}, cap ${MAX_S} s\n`);
console.log('| build | win | time to win | died | timeouts |');
console.log('|---|---|---|---|---|');
for (const st of SETUPS) {
    const rs = []; for (let k = 0; k < SEEDS; k++) rs.push(fight(st, 3000 + k));
    const wins = rs.filter((x) => x.won);
    const ttk = wins.length ? (wins.reduce((a, b) => a + b.s, 0) / wins.length).toFixed(0) + ' s' : '-';
    console.log(`| ${st.cls} / ${st.branch}${st.fallen ? ' + Fallen (gifts + first half)' : ''} | ${Math.round(100 * wins.length / rs.length)}% | ${ttk} | ${rs.filter((x) => x.died).length} | ${rs.filter((x) => x.timeout).length} |`);
}
