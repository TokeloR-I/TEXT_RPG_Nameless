// Minimal repro for the quest-chain cascade (report #12, QA-41): leave the cellar without reading the inscription,
// walk to the road and back, then inspect the foundation stone. catchUpChain targets Q02 and advances Q01; starting
// Q02 runs catchUpQuest, which finishes Q02 itself (its steps are all in story.seen), so the loop never sees
// cur === target and force-advances every main quest after it, through Q08.
//   node qa/scripts/repro_chain_skip.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const H = require(path.join(ROOT, 'tests/world-helpers.js'));
const g = new GameEngine({ seed: 1 }); g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
const s = new WorldSession(require(path.join(ROOT, 'src/world/zone1.js')), { engine: g });
const st = () => Object.entries(g.story.quests).map(([k, v]) => `${k}:${v.state}`).join(' ');
H.travel(s, 'house'); H.travel(s, 'grounds'); H.travel(s, 'road'); H.travel(s, 'grounds');
console.log('before:', st());
H.inspect(s, 'grounds_foundation');
console.log('after: ', st());
console.log('flags: ', (g.story.flags || []).join(', '), '| level', g.player.level, 'xp', g.player.xp);
const skipped = ['Q06', 'B01', 'Q07', 'Q08'].filter((q) => g.story.quests[q].state === 'complete');
console.log(skipped.length ? `FAIL  one inspect completed ${skipped.join(', ')} (Warden, seal and Chapter One skipped)` : 'PASS  the chain stopped at Q02');
process.exitCode = skipped.length ? 1 : 0;
