// Runs every repro exactly as written in the report. Run from anywhere: node qa/scripts/repros.js
const path = require('path');
const { GameEngine } = require(path.join(__dirname, '../../src/engine.js'));
const DATA = require(path.join(__dirname, '../../src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const ok = (id, cond, note) => console.log(`${cond ? 'REPRODUCES' : 'DOES NOT REPRODUCE'}  ${id}  ${note}`);
const copy = () => JSON.parse(JSON.stringify(DATA));

{ // QA-1
  const g = new GameEngine({ seed: 1 }); g.start();
  ['rogue', 'e', 'engage'].forEach((c) => g.input(c));
  g.player.skills.push('Marked for Death');
  const a = T(g.input('marked for death 3'));   // Drunken Shade, SPD 7 (Rogue SPD 10)
  const b = T(g.input('attack 3'));
  ok('QA-1a', /\[Marked for Death\] wears off Drunken Shade/.test(a + b) && !/is consumed/.test(b), 'MfD expires before your next attack');
  const g2 = new GameEngine({ seed: 1 }); g2.start();
  ['rogue', 'e', 'engage'].forEach((c) => g2.input(c));
  g2.player.skills.push('Marked for Death');
  g2.input('marked for death 1');               // Cellar Vermin, SPD 13 (faster than you)
  ok('QA-1b', /is consumed/.test(T(g2.input('attack 1'))), 'control: works vs a faster target');
}
{ // QA-2
  const g = new GameEngine({ seed: 1 }); g.start();
  ['warrior', 'add_xp 250', 'vanguard'].forEach((c) => g.input(c));
  g.currentRoom = 'wardens_roost';
  let log = T(g.input('engage'));
  for (let i = 0; i < 40 && g.mode === 'combat'; i++) log += T(g.input('shield bash'));
  const acts = (log.match(/Warden uses/g) || []).length, skips = (log.match(/Warden is unable to act/g) || []).length;
  ok('QA-2', g.mode === 'won' && acts === 1 && skips > 15, `mode=${g.mode}, boss actions=${acts}, boss skipped=${skips}, Oath/Momentum=${g.player.resource.type}`);
}
{ // QA-3
  const data = copy();
  data.skillDefinitions['Bad Purge'] = { name: 'Bad Purge', cost: 0, effects: [{ type: 'cleanse' }], target: 'self' };
  const g = new GameEngine({ seed: 1, data }); g.start();
  ['warrior', 'n', 'engage'].forEach((c) => g.input(c));
  g.player.skills.push('Bad Purge');
  const e = T(g.input('bad purge'));
  const after = T(g.input('attack 1')) + T(g.input('flee'));
  ok('QA-3', /Internal error/.test(e) && (after.match(/Not your turn!/g) || []).length === 2, 'error then attack+flee both refused');
}
{ // QA-4
  const data = copy();
  data.statusReactions = [{ name: 'Loop', pair: ['Bleed', 'Poison'], baseChance: 1, outcome: [{ type: 'apply_status', status: { name: 'Poison', type: 'dot', value: 1, duration: 2 } }] }];
  const g = new GameEngine({ seed: 1, data }); g.start();
  ['warrior', 'n', 'engage'].forEach((c) => g.input(c));
  const t = g.combat.enemies[0];
  g.applyDot(g.player, t, { name: 'Poison', value: 1, duration: 3 });
  let msg = 'no error';
  try { g.applyDot(g.player, t, { name: 'Bleed', value: 1, duration: 3 }); } catch (e) { msg = e.message; }
  ok('QA-4', /call stack/.test(msg), msg);
}
{ // QA-5
  const data = copy();
  data.enemies.crow_touched_warden.skills = [{ name: 'Chain Lock', base_damage: [1, 1], effects: [{ type: 'stun', duration: 1 }] }];
  const g = new GameEngine({ seed: 1, data }); g.start();
  g.input('warrior'); g.currentRoom = 'wardens_roost';
  const out = T(g.input('engage'));
  ok('QA-5', /Combat loop ran away/.test(out) && /Not your turn/.test(T(g.input('flee'))), 'player permastunned -> runaway guard throws -> soft-lock');
}
{ // QA-6
  const g = new GameEngine({ seed: 3 }); g.start();
  ['warrior', 'n', 'engage'].forEach((c) => g.input(c));
  g.player.hp = g.player.maxHp = 999;
  const rat = g.combat.enemies.find((e) => e.key === 'rust_rat');
  for (let i = 0; i < 20 && rat.hp > 0; i++) g.input('attack 3');
  const k1 = g.stats.kills;
  g.input('flee'); g.input('engage');
  const back = g.combat.enemies.find((e) => e.key === 'rust_rat');
  ok('QA-6', k1 === 1 && back.hp === back.maxHp && g.alive(g.combat.enemies).length === 3, `kills after rat dies=${k1}; after flee+engage the rat is back at ${back.hp}/${back.maxHp}`);
}
{ // QA-7/8 text
  const g = new GameEngine({ seed: 1 }); g.start(); g.input('warrior'); g.currentRoom = 'wardens_roost';
  const out = T(g.input('look')) + T(g.input('engage'));
  ok('QA-7', /Beware! A The Crow-Touched Warden/.test(out) && /A The Crow-Touched Warden appears/.test(out), 'article bug');
  const v = new GameEngine({ seed: 1 }); v.start(); ['warrior', 'add_xp 250', 'vanguard', 'n', 'engage'].forEach((c) => v.input(c));
  const menu = T(v.input('help me'));
  ok('QA-8', /Power Strike \[Cost: 2 Oath Points\]/.test(menu) && /Momentum/.test(DATA.skillDefinitions['Power Strike'].description), 'Power Strike text says Momentum, charges Oath Points');
}
{ // QA-9: CLI combat menu has no player HP/resource/status line
  const g = new GameEngine({ seed: 1 }); g.start(); ['warrior', 'n', 'engage'].forEach((c) => g.input(c));
  const menu = T(g.input('guard'));
  const tail = menu.slice(menu.lastIndexOf('--- Your Turn! ---'));
  ok('QA-9', !/Warrior \(\d+\/\d+ HP\)|Momentum: \d|Guard/.test(tail.replace('> Guard', '')), 'your HP/resource/[Guard] are absent from the turn prompt');
}
