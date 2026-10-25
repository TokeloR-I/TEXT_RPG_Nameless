// Geometry audit of the 16 px world as played (scale16.doubleWorld), through the real WorldSession rules.
// (1) every NPC and enemy blocks every cell of the 2x2 block its sprite is drawn on;
// (2) every required fight (gate: true) still holds the only way on;
// (3) every person and enemy can be talked to / fought from each open side of its block.
//   node qa/scripts/geometry_16px.js
const path = require('path');
const R = path.join(__dirname, '..', '..');
const { WorldSession, DIRS } = require(path.join(R, 'src/world/world.js'));
const { doubleWorld } = require(path.join(R, 'src/world/scale16.js'));
const W = doubleWorld(require(path.join(R, 'src/world/zone1.js')));
let bad = 0, total = 0; const lines = [];
for (const [mid, m] of Object.entries(W.maps)) {
  if (!m.source32) continue;
  const s = new WorldSession(W, { map: mid, spawn: Object.keys(m.spawns)[0] });
  for (const o of [...(m.interactables || []), ...(m.encounters || [])]) {
    const enc = (m.encounters || []).includes(o);
    if (!enc && o.kind !== 'npc') continue;
    total++;
    const bx = o.x - (o.x % 2), by = o.y - (o.y % 2);
    const open = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => [bx + dx, by + dy]).filter(([x, y]) => !s.isBlocked(x, y));
    // sides: each cell next to the block that is walkable, facing into the block
    let sides = 0, ok = 0;
    for (const [x, y, f] of [[bx, by - 1, 'down'], [bx + 1, by - 1, 'down'], [bx, by + 2, 'up'], [bx + 1, by + 2, 'up'], [bx - 1, by, 'right'], [bx - 1, by + 1, 'right'], [bx + 2, by, 'left'], [bx + 2, by + 1, 'left']]) {
      if (s.isBlocked(x, y)) continue; sides++; s.x = x; s.y = y; s.facing = f; if (s.prompt()) ok++;
    }
    if (open.length || ok < sides) bad++;
    lines.push(`${mid.padEnd(26)} ${(enc ? 'ENEMY ' : 'NPC   ')}${o.id.padEnd(28)} open cells inside its block: ${open.length}; prompt from ${ok}/${sides} adjacent cells`);
  }
}
console.log(lines.join('\n'));
console.log(`\n${total - bad}/${total} NPCs+enemies: block their whole 2x2 and answer from every adjacent cell`);
// gates: with every non-gate object present, can you get past a living gate enemy?
for (const [mid, m] of Object.entries(W.maps)) for (const o of (m.encounters || []).filter((e) => e.gate)) {
  const s = new WorldSession(W, { map: mid, spawn: Object.keys(m.spawns)[0] });
  const reach = (sx, sy) => { const seen = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of Object.values(DIRS)) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || s.isBlocked(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } } return seen; };
  const res = Object.entries(m.spawns).map(([sid, sp]) => { const a = reach(sp.x, sp.y); const ex = [...new Set((m.exits || []).filter((e) => a.has(e.x + ',' + e.y)).map((e) => e.group || e.id))]; return `${sid} → [${ex}]`; });
  console.log(`GATE ${o.id} on ${mid}: ${res.join('; ')}`);
}
