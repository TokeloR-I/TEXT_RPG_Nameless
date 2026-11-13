// Legendary power check (Gauge, 2026-11-04; Tokelo: "at unlock it should be at least 60 to 70% of a peak-level
// evolved class"). Every setup fights a Crow Warden made very tough (hpMult) for --secs seconds on the real ActionSim
// and engine, with the player kept alive, so the numbers are steady output, not a race:
//   dps       damage you deal per second (skills, basic attacks, summons, DoTs: everything the Warden loses)
//   taken/s   damage that reaches you per second (after armour, reductions, dodges and absorbs)
//   power     sqrt(dps x survival), survival = max HP / taken per s (seconds you last, capped at 300: past five minutes
//             a fight doesn't care): one number for both
// The bot is the warden_benchmark one: hold range, cast whatever the engine says is ready, else basic attack.
//   node qa/scripts/legendary_power.js [--seeds 6] [--secs 60] [--fenrir]   (--fenrir adds Fenrir's Heir rows)
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
const SEEDS = parseInt(opt('--seeds', '6'), 10), SECS = parseInt(opt('--secs', '60'), 10);

const KEEP = { warrior: 18, rogue: 14, mage: 90, necromancer: 80 };
const freeNear = (s, x, y) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!s.solidForAction(x + dx, y + dy) && !s.exitAt(x + dx, y + dy)) return [x + dx, y + dy]; throw new Error('no free cell'); };
const levelTo = (g, level) => { while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true }); };

/** st: { label, cls, branch, level, fallen: [node short ids] | 'unlock' | null, bar: [skill names] (else the guide's) } */
function setup(st, seed) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.data.actionRules.bosses.crow_touched_warden.hpMult = 60;
    g.start(); g.input(st.cls); g.enterWorld();
    if (st.level >= 14) g.flags.eventsUnlocked = true;   // peak: the stage events (Dark Knight, Dragon Slayer...) done
    levelTo(g, 3);
    if (g.pendingBranchChoice) g.chooseBranch(st.branch);
    levelTo(g, st.level);
    if (st.fallen) {
        for (let t = 0; t < 1200; t++) g.gazeTick('kloster_seraph_statue', 100);
        if (g.story.dialogue) g.act({ type: 'dialogue_leave' });
        if (Array.isArray(st.fallen)) for (const id of st.fallen) g.act({ type: 'learn_node', nodeId: `fallen_seraphim.${id}` });
        // A full bar keeps your class kit; the gifts take the last slots (what a player swapping them in would do).
        const gifts = (g.data.skillWeb.legendaryWebs.fallen_seraphim.gifts || []).map((id) => g.skillWeb().nodes.get(id).skill);
        const bar = g.ensureSkillBar();
        gifts.slice(0, st.giftSlots || gifts.length).forEach((n, k) => { if (!bar.includes(n)) bar[bar.length - 1 - k] = n; });
    }
    if (st.fallen) g.flags.eventsUnlocked = false;
    // Fenrir's Heir (2026-11-13): awakened in a stance, the gifts on the bar's last slots, bond preset (0 = just woken).
    if (st.fenrir) {
        g.act({ type: 'cheat', cheat: 'awaken_fenrir', amount: st.fenrir });
        if (st.bond != null && g.player.stance.bond[st.fenrir] != null) g.player.stance.bond[st.fenrir] = st.bond;
        const leg = g.data.skillWeb.legendaryWebs.fenrirs_heir;
        const gifts = leg.gifts.map((id) => g.skillWeb().nodes.get(id).skill)
            .filter((n) => { const d = g.data.skillDefinitions[n]; return !d.stance || d.stance === st.fenrir; });
        const bar = g.ensureSkillBar();
        gifts.forEach((n, k) => { if (!bar.includes(n)) bar[bar.length - 1 - k] = n; });
    }
    if (st.bar) { const bar = g.ensureSkillBar(); st.bar.forEach((n, i) => { if (g.player.skills.includes(n)) bar[i] = n; }); }
    const s = new WorldSession(WORLD, { engine: g });
    s.place('sanctuary', Object.keys(WORLD.maps.sanctuary.spawns)[0]);
    const [x, y] = freeNear(s, 22, 18); s.x = x; s.y = y;
    return { g, s, sim: new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed }) };
}

function run(st, seed) {
    const r = setup(st, seed);
    r.g.story.flags.push('warden_challenged');
    for (let i = 0; i < 30; i++) r.sim.update(STEP, {});
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);
    const p0 = r.g.player, maxHp = p0.maxHp;
    let taken = 0;
    const dmg = r.g.damage.bind(r.g);
    r.g.damage = (t, amount, src, o) => { const before = t.hp; const out = dmg(t, amount, src, o); if (t === r.g.player) { taken += Math.max(0, before - t.hp); t.hp = t.maxHp; } return out; };
    const we = () => r.g.combat && r.g.combat.enemies.find((e) => e.key === 'crow_touched_warden');
    const hp0 = we().hp;
    const bar = r.g.ensureSkillBar();
    let slotTurn = 0;
    const casts = {}; const say = r.g.say.bind(r.g);
    r.g.say = (t, o) => { const m = /uses (.+?) on .*for (\d+) damage/.exec(t); if (m) { const c = casts[m[1]] || (casts[m[1]] = [0, 0]); c[0]++; c[1] += +m[2]; } return say(t, o); };
    for (let i = 0; i < SECS * 60; i++) {
        const w = r.sim.actors.find((a) => a.key === 'crow_touched_warden' && !a.dead);
        if (!w || r.g.mode !== 'combat') break;
        const p = r.sim.player, d = Math.hypot(w.x - p.x, w.y - p.y) || 1, ux = (w.x - p.x) / d, uy = (w.y - p.y) / d;
        const input = { aim: { x: w.x, y: w.y }, move: { x: 0, y: 0 } };
        const keep = KEEP[st.cls];
        if (d > keep + 6) input.move = { x: ux, y: uy }; else if (d < keep - 10) input.move = { x: -ux, y: -uy };
        let cast = null;
        for (let k = 0; k < bar.length && cast == null; k++) {   // every frame: a skill the moment one is ready
            const slot = (slotTurn + k) % bar.length, name = bar[slot];
            if (!name) continue;
            const av = r.g.skillAvailability(name, false);
            if (av && av.enabled) { cast = slot; slotTurn = slot + 1; }
        }
        if (cast != null) input.slot = cast; else input.attack = true;
        r.sim.update(STEP, input);
    }
    const e = we();
    const dealt = hp0 - (e ? e.hp : 0);
    if (process.env.DIAG) console.log(st.label, JSON.stringify(casts));
    return { dps: dealt / SECS, taken: taken / SECS, maxHp };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function measure(st) {
    const rs = []; for (let k = 0; k < SEEDS; k++) rs.push(run(st, 2000 + k));
    const dps = mean(rs.map((x) => x.dps)), taken = mean(rs.map((x) => x.taken)), maxHp = rs[0].maxHp;
    const survival = Math.min(300, maxHp / Math.max(0.1, taken));
    return { ...st, dps, taken, maxHp, survival, power: Math.sqrt(dps * survival) };
}
module.exports = { measure, SEEDS, SECS };

if (require.main === module) {
    const PEAK = [['warrior', 'vanguard'], ['warrior', 'berserker'], ['rogue', 'assassin'], ['rogue', 'duelist'], ['necromancer', 'bone_warden'], ['necromancer', 'plaguecaller']];
    const rows = [];
    for (const [cls, branch] of PEAK) rows.push(measure({ label: `${cls} / ${branch} L14 (peak)`, cls, branch, level: 14 }));
    for (const [cls, branch] of PEAK.filter((_, i) => i % 2 === 0)) rows.push(measure({ label: `${cls} / ${branch} L5 (no legend)`, cls, branch, level: 5 }));
    // A player puts the gifts where they help: try 1 (Fallen Judgement only) and all 3 on the bar, keep the better.
    for (const [cls, branch] of PEAK.filter((_, i) => i % 2 === 0)) {
        const tries = [1, 3].map((n) => measure({ label: `${cls} / ${branch} L5 + Fallen at unlock (${n} gift${n > 1 ? 's' : ''} on the bar)`, cls, branch, level: 5, fallen: 'unlock', giftSlots: n }));
        rows.push(tries.sort((a, b) => b.power - a.power)[0]);
    }
    if (args.includes('--fenrir')) for (const [cls, branch] of PEAK.filter((_, i) => i % 2 === 0)) for (const [fenrir, bond] of [['skoll', 0], ['skoll', 100], ['hati', 0], ['hati', 100]])
        rows.push(measure({ label: `${cls} / ${branch} L5 + Fenrir's Heir at unlock (${fenrir}, bond ${bond})`, cls, branch, level: 5, fenrir, bond }));
    const peak = mean(rows.filter((r) => /peak/.test(r.label)).map((r) => r.power));
    console.log(`Crow Warden x60 HP, ${SECS} s, ${SEEDS} seeds; player kept alive. Peak average power ${peak.toFixed(1)}.\n`);
    const classPeak = (cls) => mean(rows.filter((r) => r.cls === cls && /peak/.test(r.label)).map((r) => r.power));
    console.log('| setup | dps | taken/s | max HP | power | % of its class at peak | % of all peaks |');
    console.log('|---|---|---|---|---|---|---|');
    for (const r of rows) console.log(`| ${r.label} | ${r.dps.toFixed(1)} | ${r.taken.toFixed(1)} | ${r.maxHp} | ${r.power.toFixed(1)} | ${Math.round((r.power / classPeak(r.cls)) * 100)}% | ${Math.round((r.power / peak) * 100)}% |`);
}
