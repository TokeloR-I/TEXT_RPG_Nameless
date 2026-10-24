/* Checks the world map data and prints each map with what's placed on it.
 *   node tools/world-check.js            all maps
 *   node tools/world-check.js grounds    one map
 * Exit code 1 if validateWorld finds problems (the same check the tests and world.html run). */
const { validateWorld } = require('../src/world/world.js');
const world = require('../src/world/zone1.js');
const data = require('../src/data.js');

const only = process.argv[2];
const problems = validateWorld(world, data);
for (const [id, map] of Object.entries(world.maps)) {
    if (only && id !== only) continue;
    const grid = map.tiles.map((row) => [...row]);
    const mark = (x, y, ch) => { if (grid[y] && grid[y][x] != null) grid[y][x] = ch; };
    for (const e of map.exits || []) mark(e.x, e.y, 'E');
    for (const o of map.interactables || []) mark(o.x, o.y, o.kind === 'pickup' ? '$' : '?');
    for (const e of map.encounters || []) mark(e.x, e.y, '!');
    for (const b of map.boundaries || []) for (let y = b.y; y < b.y + (b.h || 1); y++) for (let x = b.x; x < b.x + (b.w || 1); x++) mark(x, y, '|');
    for (const [name, sp] of Object.entries(map.spawns || {})) mark(sp.x, sp.y, name === 'start' ? '@' : 's');
    console.log(`\n${id} — ${map.name} (${map.tiles[0].length}x${map.tiles.length}, zone ${map.zoneId})`);
    console.log(grid.map((r) => '  ' + r.join('')).join('\n'));
    for (const e of map.exits || []) console.log(`  E ${e.id} (${e.x},${e.y}) ${e.trigger} -> ${e.toMap}.${e.toSpawn}`);
    for (const o of map.interactables || []) console.log(`  ${o.kind === 'pickup' ? '$' : '?'} ${o.id} (${o.x},${o.y}) ${o.kind}${o.item ? `: ${o.item}` : ''}`);
    for (const e of map.encounters || []) console.log(`  ! ${e.id} (${e.x},${e.y}) ${e.enemies.join(', ')}`);
    for (const b of map.boundaries || []) console.log(`  | ${b.id} (${b.x},${b.y} ${b.w || 1}x${b.h || 1})`);
}
console.log('\nLegend: @ start  s spawn  E exit  ? inspect  $ pickup  ! enemy  | boundary');
// Sprite sheets (GFX-1, docs/SPRITES.md) are checked here too.
require('../assets/sprites/player-placeholder.js');
require('../assets/sprites/manaseed.js');
const spriteProblems = require('../ui/sprites.js').validateSheets().map((e) => `sprites: ${e}`);
problems.push(...spriteProblems);
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nWorld data and sprite sheets are valid.');
process.exit(problems.length ? 1 : 0);
