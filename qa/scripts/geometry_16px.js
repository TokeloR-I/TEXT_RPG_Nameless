// Geometry audit of the 16 px world as played: object footprint vs collision, and gate fights.
const R = require('path').join(__dirname, '..', '..');
const { doubleWorld } = require(R + '/src/world/scale16.js');
const { tileAt } = require(R + '/src/world/world.js');
const Z = require(R + '/src/world/zone1.js');
const W = doubleWorld(Z);
const solid = (m, x, y) => { const t = tileAt(W, m, x, y); return !t || !!t.solid; };
let walkIn = 0, total = 0;
const gates = [];
for (const [mid, m] of Object.entries(W.maps)) {
  if (!m.source32) continue;
  const objs = [...(m.interactables || []).map((o) => ({ ...o, enc: false })), ...(m.encounters || []).map((o) => ({ ...o, enc: true }))];
  const occ = new Set(objs.map((o) => o.x + ',' + o.y));
  for (const o of objs) {
    if (!o.enc && o.kind !== 'npc') continue;
    total++;
    const bx = o.x - (o.x % 2), by = o.y - (o.y % 2);
    const free = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => [bx + dx, by + dy]).filter(([x, y]) => !(x === o.x && y === o.y) && !solid(m, x, y) && !occ.has(x + ',' + y));
    if (free.length) walkIn++;
    if (o.gate) gates.push({ mid, o, m });
    console.log(`${mid.padEnd(26)} ${(o.enc ? 'ENEMY ' : 'NPC   ')}${o.id.padEnd(28)} walkable cells of its own 2x2 block: ${free.length}`);
  }
}
console.log(`\n${walkIn}/${total} NPCs+enemies have walkable cells inside the 32px block their sprite is drawn on`);
// Gate bypass: with all non-gate objects blocked and the gate cell blocked, can you still reach every exit from every spawn?
for (const { mid, o, m } of gates) {
  const blocked = new Set([...(m.interactables || []), ...(m.encounters || [])].map((q) => q.x + ',' + q.y));
  const sp = Object.entries(m.spawns);
  const reach = (sx, sy) => { const seen = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) { const k = nx + ',' + ny; if (seen.has(k) || solid(m, nx, ny) || blocked.has(k)) continue; seen.add(k); q.push([nx, ny]); } } return seen; };
  // Does the gate split the map in the original 32 px version?
  const m32 = m.source32;
  const solid32 = (x, y) => { const t = tileAt(Z, m32, x, y); return !t || !!t.solid; };
  const blocked32 = new Set([...(m32.interactables || []), ...(m32.encounters || [])].map((q) => q.x + ',' + q.y));
  const reach32 = (sx, sy) => { const seen = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) { const k = nx + ',' + ny; if (seen.has(k) || solid32(nx, ny) || blocked32.has(k)) continue; seen.add(k); q.push([nx, ny]); } } return seen; };
  const [n0, s0] = sp; const s32 = Object.values(m32.spawns);
  const a32 = reach32(s32[0].x, s32[0].y).size, a16 = reach(s0[1].x, s0[1].y);
  const exitsReached = (m.exits || []).filter((e) => a16.has(e.x + ',' + e.y) || [[e.x+1,e.y],[e.x-1,e.y],[e.x,e.y+1],[e.x,e.y-1]].some(([x,y]) => a16.has(x+','+y))).map((e) => e.group || e.id);
  const reached32 = (m32.exits || []).filter((e) => { const s = reach32(s32[0].x, s32[0].y); return s.has(e.x + ',' + e.y); }).map((e) => e.id);
  console.log(`GATE ${o.id} on ${mid}: from spawn ${s0[0]}, 32px reaches exits [${reached32}], 16px reaches [${[...new Set(exitsReached)]}]`);
}
