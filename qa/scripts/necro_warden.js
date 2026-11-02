// Necromancer vs the Crow Warden: a headless bot on the real ActionSim (same harness as warden_prebuff.js). Gauge, Tally.
// Benchmark (PR #207): 60-90 s fights with 70-90% wins at level 3. The bot keeps range, dodges a wind-up with
// probability --react, and fires the first castable skill in its branch's priority list (ROT), else attacks.
// Env: POOL=Wrath,Swift limits Channel the Grave's ghosts; NOCHANNEL=1 turns Channel off; TRACE=1 logs each second.
//   node qa/scripts/necro_warden.js [--root <checkout>] [--seeds 20] [--react 0.6] [--level 3] [--branch bone|plague]
const path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ROOT = path.resolve(opt('--root', path.join(__dirname, '..', '..')));
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const { doubleWorld } = require(path.join(ROOT, 'src/world/scale16.js'));
const { ActionSim } = require(path.join(ROOT, 'src/action/sim.js'));
const WORLD = doubleWorld(require(path.join(ROOT, 'src/world/zone1.js')));
const SEEDS = parseInt(opt('--seeds', '20'), 10), REACT = parseFloat(opt('--react', '0.6')), LEVEL = parseInt(opt('--level', '3'), 10), MAX_S = 240;
const BR = opt('--branch', 'bone');
const STEP = 1000 / 60;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const freeNear = (s, x, y) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!s.solidForAction(x + dx, y + dy) && !s.exitAt(x + dx, y + dy)) return [x + dx, y + dy]; throw new Error('no free cell'); };

// Priority list: [skill, when(g, warden)] — first known 6 go on the bar; the first castable whose condition holds fires.
const alive = (g) => g.combat ? g.alive(g.combat.minions) : [];
const st = (x, n) => x && x.statusEffects.find((s) => s.name === n);
const ROT = {
    bone: [
        ['Channel the Grave', (g) => !g.player.statusEffects.some((s) => s.ghost) && g.data.skillDefinitions['Channel the Grave'].effects[0].type === 'channel_ghosts'],
        ['March of Endless Bones', (g) => true],
        ['Raise Ghoul', (g) => true],
        ['Raise Skeleton', (g) => alive(g).filter((m) => !m.ghoul).length < g.minionCap()],
        ['Bone Wall', (g) => !st(g.player, 'Bone Wall')],
        ['Shield of the Dead', (g) => alive(g).length > 0],
        ['Reaper’s Charge', (g) => true],
        ['Bone Cage', (g) => true],
        ['Grave Bolt', (g) => true],
        ['Soul Leech', (g) => g.player.hp < g.player.maxHp * 0.7]
    ],
    plague: [
        ['Channel the Grave', (g) => !g.player.statusEffects.some((s) => s.ghost) && g.data.skillDefinitions['Channel the Grave'].effects[0].type === 'channel_ghosts'],
        ['Plague of Ages', (g) => true],
        ['Contagion', (g, w) => !st(w, 'Infection')],
        ['Withering Curse', (g, w) => !st(w, 'Withered') && st(w, 'Infection')],
        ['Plague Burst', (g, w) => (st(w, 'Infection') || {}).stacks >= 3],
        ['Black Spit', (g, w) => !st(w, 'Poison')],
        ['Corpse Bloom', (g) => g.combat.corpses > 0],
        ['Raise Skeleton', (g) => alive(g).length < 1],
        ['Grave Bolt', (g) => true],
        ['Soul Leech', (g) => g.player.hp < g.player.maxHp * 0.7]
    ]
};

function setup(seed) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('necromancer'); g.enterWorld();
    const ch = g.data.skillDefinitions['Channel the Grave'].effects[0];
    if (process.env.POOL && ch.pool) { const keep = process.env.POOL.split(','); ch.pool = ch.pool.filter((x) => keep.includes(x.name.split(' ')[0])); }
    if (process.env.NOCHANNEL) g.data.skillDefinitions['Channel the Grave'].cost = 999;
    for (let i = 0; i < 400 && g.player.level < LEVEL; i++) {
        g.input('add_xp 50');
        if (g.pendingBranchChoice) g.chooseBranch(BR === 'bone' ? 'bone warden' : 'plaguecaller');
    }
    const bar = ROT[BR].map((x) => x[0]).filter((k) => g.player.skills.includes(k)).slice(0, 6);
    g.player.skillBar = [...bar, ...Array(6 - bar.length).fill(null)]; g.player.skillBarSeen = [...g.player.skills];
    const s = new WorldSession(WORLD, { engine: g });
    s.place('sanctuary', Object.keys(WORLD.maps.sanctuary.spawns)[0]);
    const [x, y] = freeNear(s, 22, 18); s.x = x; s.y = y;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    return { g, s, sim, bar };
}

function fight(seed) {
    const r = setup(seed);
    const R = rng(seed * 7919);
    r.g.story.flags.push('warden_challenged');
    for (let i = 0; i < 30; i++) r.sim.update(STEP, {});
    const wA = () => r.sim.actors.find((a) => a.key === 'crow_touched_warden');
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);
    let taken = 0, lastHp = r.g.player.hp, decided = new Map(); const casts = {};
    for (let i = 0; i < MAX_S * 60; i++) {
        const w = wA();
        const we = r.g.combat && r.g.combat.enemies.find((e) => e.key === 'crow_touched_warden');
        if (!w || w.dead || (we && we.hp <= 0) || (r.g.mode !== 'combat' && i > 30)) return { won: !!(w && w.dead) || !!(we && we.hp <= 0), s: i / 60, taken, hpLeft: r.g.player.hp / r.g.player.maxHp, casts };
        const p = r.sim.player;
        const d = Math.hypot(w.x - p.x, w.y - p.y) || 1, ux = (w.x - p.x) / d, uy = (w.y - p.y) / d;
        const input = { aim: { x: w.x, y: w.y }, move: { x: 0, y: 0 } };
        if (w.state === 'windup' && w.windup && w.stateEnd - r.sim.now < 160) {
            const key = w.windup.start;
            if (!decided.has(key)) decided.set(key, R() < REACT);
            if (decided.get(key) === true) { input.move = { x: -ux * 0.6 - uy * 0.8, y: -uy * 0.6 + ux * 0.8 }; input.dodge = true; decided.set(key, 'done'); }
        }
        if (!input.dodge) {
            if (d > 86) input.move = { x: ux, y: uy }; else if (d < 70) input.move = { x: -ux, y: -uy };
            let cast = null;
            if (i % 6 === 0 && p.state !== 'attack') for (const [k, when] of ROT[BR]) {
                const slot = r.bar.indexOf(k);
                if (slot < 0) continue;
                const a = r.g.skillAvailability(k, false);
                if (a.enabled && when(r.g, we)) { cast = slot; casts[k] = (casts[k] || 0) + 1; break; }
            }
            if (cast != null) input.slot = cast; else input.attack = true;
        }
        if (process.env.TRACE && i % 60 === 0 && we) { const inf = st(we, 'Infection'); console.error(`t=${i/60}s warden=${we.hp} inf=${inf ? inf.stacks : 0} minions=${alive(r.g).length} ghosts=${r.g.player.statusEffects.filter((x)=>x.ghost).map((x)=>x.name)} wst=${we.statusEffects.map((x)=>x.name+":"+(x.stacks||1)+"/"+(x.value||x.damage||""))}`); }
        const out = r.sim.update(STEP, input);
        if (out.engineEvents.some((e) => e.type === 'world.respawn') || r.g.player.hp <= 0) return { won: false, s: i / 60, taken: taken + lastHp, hpLeft: 0, casts };
        if (r.g.player.hp < lastHp) taken += lastHp - r.g.player.hp;
        lastHp = r.g.player.hp;
    }
    return { won: false, timeout: true, s: MAX_S, taken, hpLeft: r.g.player.hp / r.g.player.maxHp, casts };
}
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const rs = []; for (let k = 0; k < SEEDS; k++) rs.push(fight(1000 + k));
const wins = rs.filter((x) => x.won);
const casts = {}; for (const r of rs) for (const [k, v] of Object.entries(r.casts)) casts[k] = (casts[k] || 0) + v / rs.length;
console.log(JSON.stringify({ root: path.basename(ROOT), branch: BR, level: LEVEL, bar: setup(1000).bar, win: wins.length / rs.length, ttk: +mean(wins.map((x) => x.s)).toFixed(1), hpLost: Math.round(mean(rs.map((x) => x.taken))), hpLeft: +mean(wins.map((x) => x.hpLeft)).toFixed(2), timeouts: rs.filter((x) => x.timeout).length, castsPerFight: Object.fromEntries(Object.entries(casts).map(([k, v]) => [k, +v.toFixed(1)])) }));
