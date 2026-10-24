#!/usr/bin/env node
/* Converts the world to 16 px tiles (src/world/scale16.js) and checks the result.
 *   node tools/convert-maps-16.js            validate the converted world and print each map's new size
 *   node tools/convert-maps-16.js out.json   also write the converted world and story markers as JSON
 * Exit code 1 if validateWorld finds problems in the converted world. */
const fs = require('fs');
const { validateWorld } = require('../src/world/world.js');
const { doubleWorld, doubleStory } = require('../src/world/scale16.js');
const world = require('../src/world/zone1.js');
const story = require('../src/story/chapter1.js');
const data = require('../src/data.js');

const w16 = doubleWorld(world), s16 = doubleStory(story);
for (const [id, m] of Object.entries(w16.maps)) console.log(`${id.padEnd(28)} ${world.maps[id].tiles[0].length}x${world.maps[id].tiles.length} -> ${m.tiles[0].length}x${m.tiles.length}`);
const problems = validateWorld(w16, data, s16);
if (process.argv[2]) {
    fs.writeFileSync(process.argv[2], JSON.stringify({ maps: w16.maps, start: w16.start, markers: Object.fromEntries(Object.entries(s16.quests).map(([q, v]) => [q, v.objectives.map((o) => o.marker || null)])) }, null, 1));
    console.log(`Wrote ${process.argv[2]}`);
}
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nThe 16 px world is valid.');
process.exit(problems.length ? 1 : 0);
