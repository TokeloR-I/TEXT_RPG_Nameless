// Golden master for refactors: replays 400 seeded sessions (all classes, cheats, every obtainable skill)
// and hashes every event + periodic state. Same hash on two commits = identical behaviour.
//   node qa/scripts/golden.js [repo root, default: this repo]
const root = require('path').resolve(process.argv[2] || require('path').join(__dirname, '..', '..'));
const { GameEngine } = require(root + '/src/engine.js');
const data = require(root + '/src/data.js');
const crypto = require('crypto');
const classes = Object.keys(data.basePlayerClasses);
const obtainable = {};
for (const [cls, def] of Object.entries(data.basePlayerClasses)) {
  obtainable[cls] = new Set(def.startingSkills);
  for (const br of Object.values(data.evolutionPaths[cls].branches)) for (const st of br.stages) if (st.skill) obtainable[cls].add(st.skill);
}
const explore = ['n', 's', 'e', 'w', 'look', 'i', 'engage', 'engage', 'take bandages', 'take moldy bread', 'cl', 'help', 'use bandages', 'unlock_events'];
const h = crypto.createHash('sha256'); let events = 0, errs = 0;
for (let seed = 1; seed <= 400; seed++) {
  const g = new GameEngine({ seed });
  const rec = (evs) => { events += evs.length; h.update(JSON.stringify(evs)); };
  rec(g.start());
  let r = seed * 7919; const pick = (a) => a[(r = (r * 48271) % 2147483647) % a.length];
  const cls = classes[seed % 4]; rec(g.input(cls));
  if (seed % 2) rec(g.input(`add_xp ${[250, 400, 2000, 99999][seed % 4]}`));
  if (seed % 5 === 0) rec(g.input('become_hollow_king'));
  for (let step = 0; step < 220; step++) {
    if (g.mode === 'game_over' || g.mode === 'won') { if (seed % 3 === 0 && step < 150) { rec(g.input('start')); rec(g.input(cls)); continue; } break; }
    if (g.mode === 'branch_select') { rec(g.input(Object.keys(data.evolutionPaths[g.player.className].branches)[seed % 3].replace(/_/g, ' '))); continue; }
    if (g.mode === 'combat') {
      if (seed % 4 === 0) g.player.resource.current = 99;
      const sk = [...(seed % 4 === 0 ? obtainable[g.player.className] || [] : g.player.skills)];
      if (seed % 4 === 0) g.player.skills = [...new Set([...g.player.skills, ...sk])];
      rec(g.input(pick(['attack 1', 'attack 2', 'attack 3', 'flee', ...sk.map((s) => `${s} ${1 + (r % 3)}`), ...sk])));
    } else rec(g.input(pick(explore)));
    if (step % 20 === 0) h.update(JSON.stringify(g.getState()));
  }
  h.update(JSON.stringify(g.getState())); errs += g.errors.length;
}
console.log(`${h.digest('hex').slice(0, 16)}  events=${events} engineErrors=${errs}`);
