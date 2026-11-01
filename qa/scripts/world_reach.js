// Every map (Shamefield first, after the #204 rebuild): every spawn, exit and interactable must be reachable on foot (action collision,
// solidForAction) from its spawns. Headless; Tally, QA.   node qa/scripts/world_reach.js [mapId ...]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const { doubleWorld } = require(path.join(ROOT, 'src/world/scale16.js'));
const WORLD = doubleWorld(require(path.join(ROOT, 'src/world/zone1.js')));
const MAPS = process.argv.length > 2 ? process.argv.slice(2) : ['shamefield'];
let failed = 0;
for (const MAP of MAPS) {
const g = new GameEngine({ seed: 1, combatMode: 'action' });
g.start(); g.input('warrior'); g.enterWorld();
const s = new WorldSession(WORLD, { engine: g });
const map = WORLD.maps[MAP];
s.place(MAP, Object.keys(map.spawns)[0]);
const H = map.tiles.length, Wd = map.tiles[0].length;
const key = (x, y) => y * Wd + x;
// a gate encounter (a fight standing in the only gap) blocks until it's beaten: count its tiles as the way on
const inGate = (x, y) => (map.encounters || []).some((e) => e.gate && x >= e.x && y >= e.y && x < e.x + (e.w || 1) && y < e.y + (e.h || 1));
const open = (x, y) => x >= 0 && y >= 0 && x < Wd && y < H && (!s.solidForAction(x, y) || inGate(x, y));
// seed from every spawn (gate encounters are solid until fought, so one side alone is not the whole map)
const seen = new Set(); const q = [];
for (const sp of Object.values(map.spawns)) if (open(sp.x, sp.y)) { seen.add(key(sp.x, sp.y)); q.push([sp.x, sp.y]); }
while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (open(nx, ny) && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); q.push([nx, ny]); } } }
const near = (x, y, w = 1, h = 1) => { for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (seen.has(key(xx, yy))) return true; return false; };
const bad = [];
for (const [id, sp] of Object.entries(map.spawns)) if (!seen.has(key(sp.x, sp.y)) && !near(sp.x, sp.y)) bad.push(`spawn ${id} (${sp.x},${sp.y})`);
// the 16 px world doubles each exit into 4 tiles (id, id__2..__4): an exit is reachable if any of its tiles is
const exitGroups = {};
for (const e of map.exits || []) (exitGroups[String(e.id || e.to).replace(/__\d+$/, '')] ||= []).push(e);
for (const [id, es] of Object.entries(exitGroups)) if (!es.some((e) => near(e.x, e.y))) bad.push(`exit ${id} (${es[0].x},${es[0].y})`);
for (const o of map.interactables || []) if (!near(o.x, o.y, o.w || 1, o.h || 1)) bad.push(`interactable ${o.id} (${o.x},${o.y})`);
for (const o of map.encounters || []) if (!near(o.x, o.y, o.w || 1, o.h || 1)) bad.push(`encounter ${o.id} (${o.x},${o.y})`);
console.log(`${MAP}: ${seen.size} walkable tiles reached; ${Object.keys(map.spawns).length} spawns, ${Object.keys(exitGroups).length} exits, ${(map.interactables || []).length} interactables, ${(map.encounters || []).length} encounters checked`);
console.log(bad.length ? `UNREACHABLE:\n  ${bad.join('\n  ')}` : 'all reachable');
if (bad.length) failed++;
}
process.exit(failed ? 1 : 0);
