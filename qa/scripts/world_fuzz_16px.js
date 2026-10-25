// Random walker on the 16 px world as played: random moves, interacts, dialogue picks, fights (real combat with a random
// legal action), level-up branch picks, Black Flight when offered, save/load every 500 steps. Checks invariants each step.
//   node qa/scripts/world_fuzz_16px.js [runs=40] [steps=4000]
const path = require('path');
const R = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(R, 'src/engine.js'));
const { WorldSession } = require(path.join(R, 'src/world/world.js'));
const { doubleWorld } = require(path.join(R, 'src/world/scale16.js'));
const W = doubleWorld(require(path.join(R, 'src/world/zone1.js')));
const RUNS = +process.argv[2] || 40, STEPS = +process.argv[3] || 4000;
const problems = new Map(); const bad = (k, v) => { if (!problems.has(k)) problems.set(k, v); };
let mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const classes = ['warrior', 'mage', 'rogue', 'necromancer'];
const { DIRS } = require(path.join(R, 'src/world/world.js'));
/** First step of a shortest walk to any cell next to / on (gx, gy). */
function towards(s, gx, gy) {
  const key = (x, y) => x + ',' + y, prev = new Map([[key(s.x, s.y), null]]), q = [[s.x, s.y]];
  while (q.length) { const [x, y] = q.shift(); if (Math.abs(x - gx) + Math.abs(y - gy) <= 1) { let k = key(x, y), d = null; while (prev.get(k)) { const [pk, dd] = prev.get(k); d = dd; k = pk; } return d || Object.keys(DIRS).find((dd) => x + DIRS[dd][0] === gx && y + DIRS[dd][1] === gy); }
    for (const [d, [dx, dy]] of Object.entries(DIRS)) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (prev.has(k) || s.isBlocked(nx, ny)) continue; prev.set(k, [key(x, y), d]); q.push([nx, ny]); } }
  return null;
}
const tally = { fights: 0, wins: 0, deaths: 0, flights: 0, saves: 0, maps: new Set(), quests: {} };
for (let run = 0; run < RUNS; run++) {
  const rnd = mulberry(run * 7919 + 1); const pick = (a) => a[Math.floor(rnd() * a.length)];
  let g = new GameEngine({ seed: run + 1 }); g.start(); g.act({ type: 'choose_class', classId: classes[run % 4] }); g.act({ type: 'enter_world' });
  g.player.hp = g.player.maxHp = g.player.maxHp * 20;   // survive long enough to see the whole map set
  let s = new WorldSession(W, { engine: g }); let cur = null;
  for (let i = 0; i < STEPS; i++) {
    try {
      const a = g.getAvailableActions();
      if (g.mode === 'combat') {
        if (a.awaiting === 'continue') g.act({ type: 'continue' });
        else if (a.awaiting === 'turn_order') g.act({ type: 'turn_order', order: null });
        else { const opts = (a.actions || []).filter((x) => x.enabled !== false && x.type !== 'flee'); const x = pick(opts.length ? opts : a.actions); const t = x.targets && x.targets.length ? pick(x.targets) : null; g.act({ ...x, targetId: t && (t.id || t) }); }
        if (g.mode !== 'combat') { tally.fights++; const res = g.world && g.world.lastResult; if (res === 'victory') tally.wins++; if (cur) s.fightOver(cur, res); cur = null; }
        continue;
      }
      if (g.mode === 'game_over') { tally.deaths++; break; }
      if (g.mode === 'branch_select') { const br = Object.keys(g.data.evolutionPaths[g.player.className].branches); g.act({ type: 'choose_branch', branchId: pick(br) }); continue; }
      if (a.awaiting === 'dialogue') { const cs = (a.actions || []).filter((x) => x.type === 'dialogue_choice'); if (cs.length && rnd() < 0.85) g.act({ type: 'dialogue_choice', choiceId: pick(cs).choiceId }); else g.act({ type: 'dialogue_leave' }); continue; }
      const fly = (a.actions || []).filter((x) => x.type === 'black_flight' && x.enabled !== false);
      if (fly.length && rnd() < 0.01) { const r = s.blackFlight(pick(fly).anchorId); if (r.type === 'transition') tally.flights++; continue; }
      if (!s.goal || s.goal.map !== s.mapId || rnd() < 0.01) { const m = s.map; const ts = [...(m.exits || []), ...s.visibleObjects()]; const t = pick(ts); s.goal = { map: s.mapId, x: t.x, y: t.y }; }
      const dir = rnd() < 0.75 ? towards(s, s.goal.x, s.goal.y) : null;
      const r = rnd() < 0.12 ? s.interact() : s.move(dir || pick(['up', 'down', 'left', 'right']));
      if (dir && Math.abs(s.x - s.goal.x) + Math.abs(s.y - s.goal.y) <= 1) { s.interact(); s.goal = null; }
      if (r.type === 'encounter') cur = r.id;
      tally.maps.add(s.mapId);
      // invariants
      const p = g.player;
      if (s.isBlocked(s.x, s.y) && !s.objectAt(s.x, s.y)) bad('player in a wall', `${s.mapId} ${s.x},${s.y} run ${run} step ${i}`);
      if (s.objectAt(s.x, s.y)) bad('player standing on an object', `${s.mapId} ${s.x},${s.y} on ${s.objectAt(s.x, s.y).id} run ${run} step ${i}`);
      if (!Number.isFinite(p.hp) || !Number.isFinite(p.xp) || !Number.isSafeInteger(p.gold) || p.gold < 0) bad('bad number', JSON.stringify({ hp: p.hp, xp: p.xp, gold: p.gold }));
      if (p.resource && (p.resource.current < 0 || p.resource.current > p.resource.max)) bad('resource out of range', JSON.stringify(p.resource));
      if (i % 500 === 499) { const sv = JSON.parse(JSON.stringify(g.serialize({ attachments: { world: s.getState() } }))); const g2 = GameEngine.fromSave(sv); const s2 = new WorldSession(W, { engine: g2 }); if (!s2.restorePosition(sv.attachments.world)) bad('save/load lost the position', JSON.stringify(sv.attachments.world)); if (g2.player.xp !== p.xp || g2.player.gold !== p.gold) bad('save/load changed xp/gold', ''); g = g2; s = s2; s.goal = null; tally.saves++; }
    } catch (e) { bad('exception: ' + e.message.split('\n')[0], `run ${run} step ${i} map ${s.mapId} mode ${g.mode}\n${e.stack.split('\n').slice(1, 4).join('\n')}`); break; }
  }
  for (const q of ['Q01','Q02','Q03','Q04','Q05','Q06','B01','Q07','S01','J01','J02']) { const st = g.questState(q); tally.quests[q] = tally.quests[q] || {}; tally.quests[q][st] = (tally.quests[q][st] || 0) + 1; }
}
console.log(`${RUNS} runs × ${STEPS} steps: fights ${tally.fights} (won ${tally.wins}), deaths ${tally.deaths}, Black Flights ${tally.flights}, save/loads ${tally.saves}`);
console.log('maps reached:', [...tally.maps].join(', '));
console.log('quest states at the end:', JSON.stringify(tally.quests));
console.log(problems.size ? 'PROBLEMS:\n' + [...problems].map(([k, v]) => `  ${k}: ${v}`).join('\n') : 'no invariant broken, no exception');
