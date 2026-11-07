// Action-mode fuzzer (Tally, QA report #17): real engine (action), 16 px world, ActionSim, random play with food, beer,
// dialogue and a save -> load round trip every few hundred frames. Prints any broken invariant or exception.
//   node qa/scripts/action_fuzz.js [runs=12] [frames=20000]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const { doubleWorld } = require(path.join(ROOT, 'src/world/scale16.js'));
const { ActionSim } = require(path.join(ROOT, 'src/action/sim.js'));
const WORLD = doubleWorld(require(path.join(ROOT, 'src/world/zone1.js')));
const RUNS = +process.argv[2] || 12, FRAMES = +process.argv[3] || 20000;
const classes = ['warrior', 'mage', 'rogue', 'necromancer'];
const issues = new Map();
const report = (k, d) => { if (!issues.has(k)) issues.set(k, { n: 0, d }); issues.get(k).n++; };
for (let run = 0; run < RUNS; run++) {
  let seed = run * 7919 + 13; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  let g = new GameEngine({ seed: run + 1, combatMode: 'action' }); g.start(); g.input(classes[run % 4]); g.enterWorld();
  g.player.hp = g.player.maxHp = 400; g.player.gold = 300;
  let s = new WorldSession(WORLD, { engine: g });
  let sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: run });
  let move = { x: 0, y: 0 }, hold = 0, stage = 'init';
  const maps = new Set(); let fights = 0;
  try {
    for (let f = 0; f < FRAMES; f++) {
      stage = 'menu';
      const a = g.getAvailableActions();
      if (g.mode === 'branch_select') { const br = (a.actions || []).filter((x) => x.type === 'choose_branch'); g.act(pick(br)); continue; }
      if (a.awaiting === 'dialogue') { const cs = (a.actions || []).filter((x) => x.type === 'dialogue_choice' && x.enabled !== false); if (cs.length && rnd() < 0.9) g.act({ type: 'dialogue_choice', choiceId: pick(cs).choiceId }); else g.act({ type: 'dialogue_leave' }); continue; }
      if (g.mode === 'game_over' || g.mode === 'won') { report('mode ' + g.mode, ''); break; }
      if (f % 1500 === 0 && f && g.mode === 'explore' && rnd() < 0.6) { const ids = Object.keys(WORLD.maps); const m = pick(ids); const sp = pick(Object.keys(WORLD.maps[m].spawns)); s.place(m, sp); sim.enterMap(); }
      if (hold-- <= 0 && rnd() < 0.5) { const objs = s.visibleObjects().filter((o) => o.x != null); if (objs.length) { const o = pick(objs); const T = sim.T; const dx = (o.x + 0.5) * T - sim.player.x, dy = (o.y + 0.5) * T - sim.player.y; const d = Math.hypot(dx, dy) || 1; move = { x: dx / d, y: dy / d }; hold = 120; } }
      if (hold-- <= 0) { const ang = rnd() * Math.PI * 2; move = rnd() < 0.15 ? { x: 0, y: 0 } : { x: Math.cos(ang), y: Math.sin(ang) }; hold = Math.floor(rnd() * 90); }
      const inp = { move, attack: rnd() < 0.05, dodge: rnd() < 0.01, interact: rnd() < 0.03, guard: rnd() < 0.02, sprint: rnd() < 0.3 };
      if (rnd() < 0.01) inp.slot = Math.floor(rnd() * 6);
      stage = 'update';
      if (sim.mapId !== s.mapId) sim.enterMap();
      const out = sim.update(1000 / 60, inp);
      for (const r of out.world) { if (r.type === 'transition') sim.enterMap(); else if (r.type === 'interact') { stage = 'interact'; const ir = s.interact(); if (ir && ir.type === 'transition') sim.enterMap(); } }
      maps.add(s.mapId); for (const ev of out.engineEvents) { if (ev.type === 'action.end') fights++; }
      stage = 'items';
      if (rnd() < 0.002) { // use a random usable item
        const ua = (g.getAvailableActions().actions || []).filter((x) => x.type === 'use_item' && x.enabled !== false);
        if (ua.length) g.act(pick(ua));
      }
      if (rnd() < 0.001 && g.mode === 'explore') { for (const it of ['Beer', 'Schnitzel', 'Dark Lager']) if (g.data.itemDefinitions[it]) g.player.inventory.push(it); }
      stage = 'save';
      if (rnd() < 0.0015 && !g.canSave().error) {
        const save = JSON.parse(JSON.stringify(g.serialize({ attachments: { world: s.getState() } })));
        const before = JSON.stringify(g.serialize().state);
        const c = GameEngine.fromSave(save, { combatMode: 'action' });
        const after = JSON.stringify(c.serialize().state);
        if (before !== after) report('save roundtrip changes state', diff(before, after));
        g = c; const s2 = new WorldSession(WORLD, { engine: g }); if (!s2.restorePosition(c.lastLoad.attachments.world)) report('restorePosition failed', JSON.stringify(s.getState())); s = s2;
        sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: run + f });
      }
      stage = 'check';
      const p = g.player;
      if (!Number.isFinite(p.hp) || p.hp > p.maxHp || p.hp < 0) report('bad hp', `${p.hp}/${p.maxHp}`);
      if (p.hp <= 0 && g.mode !== 'game_over') { report('hp 0 alive', `${g.mode}`); }
      if (p.resource && !Number.isFinite(p.resource.current)) report('bad resource', JSON.stringify(p.resource));
      if (!Number.isFinite(sim.player.x) || !Number.isFinite(sim.player.y)) report('NaN pos', '');
      if (sim.bodyBlocked(sim.player.x, sim.player.y, sim.player.r)) report('player in wall on ' + s.mapId, `${sim.player.x},${sim.player.y}`);
      for (const it of p.inventory) if (!g.itemDef(it)) report('unknown item', String(it));
      for (const a of sim.actors) if (!a.dead && (!Number.isFinite(a.x) || !Number.isFinite(a.y))) report('NaN actor', a.key);
      if (g.story && g.story.tracked && g.story.tracked.length > 4) report('tracked > 4', g.story.tracked.join());
      if (g.mode === 'combat' && g.combat && g.combat.enemies && g.alive(g.combat.enemies).length === 0 && f % 600 === 0) report('combat w/ no enemies alive (sample)', g.combat.enemies.map((e) => e.name).join());
      if (p.hp < 50) p.hp = Math.min(p.maxHp, p.hp + 200);
    }
  } catch (e) { report('EXC@' + stage + ': ' + e.message, e.stack.split('\n').slice(0, 4).join(' | ')); }
  console.log(`run ${run} ${g.player.className} L${g.player.level} fights ${fights} maps ${maps.size}`);
}
function diff(a, b) { let i = 0; while (i < a.length && a[i] === b[i]) i++; return `@${i}: ${a.slice(Math.max(0, i - 120), i + 80)}  ||  ${b.slice(Math.max(0, i - 120), i + 80)}`; }
if (!issues.size) console.log("no invariant broken, no exception");
for (const [k, v] of issues) console.log(`ISSUE x${v.n}: ${k}\n    ${String(v.d).slice(0, 600)}`);
