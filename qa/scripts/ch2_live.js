// Chapter Two in live combat (Tally, QA report #18): every enemy group on every Hrimvald map, fought on the real
// ActionSim + engine by the same "decent player" bot as warden_benchmark.js (holds range, casts what the bar allows,
// dodges a wind-up with probability --react). Looks for broken fights, not balance: a group that never engages,
// an enemy that never lands a hit, a fight that cannot end, an exception. Win rates are reported for Gauge.
//   node qa/scripts/ch2_live.js [--seeds 4] [--react 0.6] [--level 6] [--only jarnmyr_peat_king]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const { doubleWorld } = require(path.join(ROOT, 'src/world/scale16.js'));
const { ActionSim } = require(path.join(ROOT, 'src/action/sim.js'));
const ZONE1 = require(path.join(ROOT, 'src/world/zone1.js'));
const CH2MAPS = require(path.join(ROOT, 'src/world/chapter2-maps.js'));

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const CLSONLY = opt("--class", null);
const SEEDS = +opt('--seeds', '4'), REACT = +opt('--react', '0.6'), LEVEL = +opt('--level', '6'), ONLY = opt('--only', null), MAX_S = 180;
const STEP = 1000 / 60;
const CLASSES = [['warrior', 18], ['rogue', 14], ['mage', 90], ['necromancer', 80]];
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Hrimvald maps: everything chapter2-maps.js adds. Strip `when` so every group is on the map for the test.
const ch2Ids = new Set(Object.keys(CH2MAPS.maps || CH2MAPS));
const RAW = JSON.parse(JSON.stringify(ZONE1));
// One world per group: that group alone on its map, always there (its `when` stripped), so groups never pile in together.
const worlds = new Map();
function worldFor(map, encId) {
    if (!worlds.has(encId)) {
        const raw = JSON.parse(JSON.stringify(ZONE1));
        raw.maps[map].encounters = raw.maps[map].encounters.filter((e) => e.id === encId).map((e) => { delete e.when; return e; });
        worlds.set(encId, doubleWorld(raw));
    }
    return worlds.get(encId);
}
const groups = [];
for (const id of ch2Ids) for (const e of (RAW.maps[id] && RAW.maps[id].encounters) || []) if (!ONLY || e.id === ONLY) groups.push({ map: id, enc: e });

// A free cell 3 to 11 tiles from the group that is joined to the group's own cell on foot (not a pocket over a wall).
function freeNear(s, x, y) {
    const seen = new Set([`${x},${y}`]), q = [[x, y, 0]], ok = [];
    while (q.length) {
        const [cx, cy, d] = q.shift();
        if (d >= 3 && !s.exitAt(cx, cy)) ok.push([cx, cy]);
        if (d >= 11) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`; if (!seen.has(k) && !s.solidForAction(nx, ny)) { seen.add(k); q.push([nx, ny, d + 1]); } }
    }
    return ok.find(([cx, cy]) => Math.max(Math.abs(cx - x), Math.abs(cy - y)) >= 3) || ok[0] || null;
}

function fight(map, enc, cls, keep, seed) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    let xp = 0; for (let l = 1; l < LEVEL; l++) xp += Math.round(100 * Math.pow(1.5, l - 1));
    g.input(`add_xp ${xp}`);
    for (let i = 0; i < 10 && g.mode === 'branch_select'; i++) { const b = (g.getAvailableActions().actions || []).filter((x) => x.type === 'choose_branch'); g.act(b[seed % b.length]); }
    const WORLD = worldFor(map, enc.id);
    const s = new WorldSession(WORLD, { engine: g });
    s.place(map, Object.keys(WORLD.maps[map].spawns)[0]);
    const e16 = WORLD.maps[map].encounters.find((x) => x.id === enc.id);
    const spot = freeNear(s, e16.x, e16.y);
    if (!spot) return { err: 'no free cell near the group' };
    [s.x, s.y] = spot;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    for (let i = 0; i < 20; i++) sim.update(STEP, {});
    const grp = sim.groups[enc.id];
    if (!grp) return { err: 'no sim group' };
    if (g.mode !== 'combat') sim.engageGroup(grp);
    if (g.mode !== 'combat') return { err: 'fight never started' };
    const R = rng(seed * 31 + 7), bar = g.ensureSkillBar(), decided = new Map();
    const hp0 = g.player.maxHp; let hits = 0, lastHp = g.player.hp, slotTurn = 0;
    for (let i = 0; i < MAX_S * 60; i++) {
        if (g.mode !== 'combat') {
            const won = g.world && g.world.lastResult === "victory"; if (process.env.DBG) console.log(g.world.lastResult, i);
            return { won, s: i / 60, hits, lost: hp0 - g.player.hp };
        }
        if (g.player.hp < lastHp) hits++;
        lastHp = g.player.hp;
        const p = sim.player;
        const foes = sim.actors.filter((a) => !a.dead && a.encounterId === enc.id);
        const t = (foes.length ? foes : []).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        const input = { move: { x: 0, y: 0 } };
        if (t) {
            const d = Math.hypot(t.x - p.x, t.y - p.y) || 1, ux = (t.x - p.x) / d, uy = (t.y - p.y) / d;
            input.aim = { x: t.x, y: t.y };
            const threat = foes.find((a) => a.state === 'windup' && a.windup && a.stateEnd - sim.now < 160 && !decided.has(a.sid + ':' + a.windup.start));
            if (threat) { decided.set(threat.sid + ':' + threat.windup.start, 1); if (R() < REACT) { input.move = { x: -ux * 0.6 - uy * 0.8, y: -uy * 0.6 + ux * 0.8 }; input.dodge = true; } }
            if (!input.dodge) {
                if (d > keep + 6) input.move = { x: ux, y: uy }; else if (d < keep - 10) input.move = { x: -ux, y: -uy };
                let cast = null;
                if (i % 10 === 0) for (let k = 0; k < bar.length && cast == null; k++) { const slot = (slotTurn + k) % bar.length; if (bar[slot]) { const av = g.skillAvailability(bar[slot], false); if (av && av.enabled) { cast = slot; slotTurn = slot + 1; } } }
                if (cast != null) input.slot = cast; else input.attack = true;
            }
        }
        if (g.player.hp < g.player.maxHp * 0.3 && i % 60 === 0) input.heal = true;
        const out = sim.update(STEP, input);
        if (out.engineEvents && out.engineEvents.some((e) => e.type === 'world.respawn')) return { won: false, s: i / 60, hits, lost: hp0 };
    }
    if (process.env.DBG) console.log("engine", JSON.stringify((g.combat.enemies||[]).map((e) => [e.key, e.hp])), "sim", JSON.stringify(sim.actors.filter((a) => a.encounterId === enc.id).map((a) => [a.key, a.dead, a.hp, Math.round(a.x), Math.round(a.y), a.state])), "player", Math.round(sim.player.x), Math.round(sim.player.y));
    return { won: false, timeout: true, s: MAX_S, hits, alive: sim.actors.filter((a) => !a.dead && a.encounterId === enc.id).map((a) => `${a.key}@${Math.round(a.x)},${Math.round(a.y)} hp${a.hp}`) };
}

const pct = (x) => `${Math.round(x * 100)}%`;
console.log(`Chapter Two live fights, level ${LEVEL}, ${SEEDS} seeds per class, react ${REACT}\n`);
console.log('| map | group | enemies | warrior | rogue | mage | necro | mean time | notes |');
console.log('|---|---|---|---|---|---|---|---|---|');
const problems = [];
for (const { map, enc } of groups) {
    const cells = [], notes = new Set(); let tsum = 0, tn = 0;
    for (const [cls, keep] of CLASSES.filter(([c]) => !CLSONLY || c === CLSONLY)) {
        let w = 0;
        for (let k = 0; k < SEEDS; k++) {
            let r;
            try { r = fight(map, enc, cls, keep, 500 + k); } catch (e) { r = { err: 'EXC ' + e.message.split('\n')[0] }; }
            if (r.err) { notes.add(r.err); continue; }
            if (process.env.DBG) console.log(cls, JSON.stringify(r));
            if (r.won) { w++; tsum += r.s; tn++; }
            if (r.timeout) notes.add(`timeout (${(r.alive || []).join(' ')})`);
            if (!r.hits && r.s > 20) notes.add(`${cls}: never hit in ${r.s.toFixed(0)} s`);
        }
        cells.push(pct(w / SEEDS));
    }
    const note = [...notes].join('; ');
    if (note) problems.push(`${map}.${enc.id}: ${note}`);
    console.log(`| ${map} | ${enc.id} | ${enc.enemies.join(', ')} | ${cells.join(' | ')} | ${tn ? (tsum / tn).toFixed(0) + ' s' : '-'} | ${note.slice(0, 160)} |`);
}
console.log(problems.length ? '\nPROBLEMS:\n  ' + problems.join('\n  ') : '\nno broken fights');
