// Chapter One out-of-order routes to the orchard gate (logic only, 32 px world; fights forced to 1 HP).
const R = require('path').join(__dirname, '..', '..');
const { GameEngine } = require(R + '/src/engine.js');
const { WorldSession } = require(R + '/src/world/world.js');
const Z = require(R + '/src/world/zone1.js');
const H = require(R + '/tests/world-helpers.js');
function setup() { const g = new GameEngine({ seed: 3 }); g.start(); g.act({ type: 'choose_class', classId: 'mage' }); g.act({ type: 'enter_world' }); g.player.hp = g.player.maxHp = 99999; return { g, s: new WorldSession(Z, { engine: g }) }; }
function win(g) { for (let i = 0; i < 100 && g.mode === 'combat'; i++) { for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1; const a = g.getAvailableActions(); if (a.awaiting === 'continue') g.act({ type: 'continue' }); else g.act({ type: 'attack', targetId: g.alive(g.combat.enemies)[0].id }); } }
const txt = (r) => (r && r.events || []).filter((e) => e.type === 'text').map((e) => e.text).join(' / ');
function run(name, plan) {
  const { g, s } = setup(); const out = [];
  const A = {
    t: (m) => H.travel(s, m), i: (id) => out.push(id + ': ' + txt(H.inspect(s, id)).slice(0, 110)),
    talk: (id, re) => { const r = H.inspect(s, id); out.push(id + ': ' + txt(r).slice(0, 110)); if (re) { const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text)); if (c) g.act({ type: 'dialogue_choice', choiceId: c.choiceId }); else out.push('  (no choice ' + re + ')'); } if (g.getAvailableActions().awaiting === 'dialogue') g.act({ type: 'dialogue_leave' }); },
    f: (id) => { const r = H.contact(s, id); win(g); s.fightOver(id, 'victory'); },
    save: () => { const sv = JSON.parse(JSON.stringify(g.serialize({ attachments: { world: s.getState() } }))); const g2 = GameEngine.fromSave(sv); const s2 = new WorldSession(Z, { engine: g2 }); s2.restorePosition(sv.attachments.world); return [g2, s2]; }
  };
  let ctx = { g, s };
  try { plan(A, (gs) => { ctx = gs; }); } catch (e) { out.push('ERR ' + e.message); }
  const gate = ctx.g ? g.storyAllows({ flags: ['north_gate_open'] }) : null;
  console.log(`\n== ${name}: Q03 ${g.questState('Q03')} Q04 ${g.questState('Q04')} Q05 ${g.questState('Q05')} gate open: ${gate} | HUD: ${JSON.stringify(g.trackedObjective && g.trackedObjective())}`);
  out.forEach((l) => console.log('   ' + l));
}
const toVillage = (A) => { A.i('cellar_inscription'); A.t('house'); A.t('grounds'); A.i('grounds_foundation'); A.t('road'); A.t('tollway'); };
run('captain before the trader', (A) => { toVillage(A); A.talk('tollway_elian', /village/); A.f('tollway_ragpickers'); A.f('tollway_root_chewers'); A.t('shamefield'); A.talk('village_captain'); A.talk('village_tamsin'); A.talk('village_captain'); A.talk('village_mara'); A.talk('village_captain'); A.t('tollway'); A.i('tollway_register'); A.t('shamefield'); A.talk('village_captain', /Here it is/); });
run('Elian skipped, village first', (A) => { toVillage(A); A.f('tollway_ragpickers'); A.f('tollway_root_chewers'); A.t('shamefield'); A.talk('village_tamsin'); A.talk('village_mara'); A.talk('village_captain'); A.t('tollway'); A.talk('tollway_elian', /village/); A.t('shamefield'); A.talk('village_captain'); A.t('tollway'); A.i('tollway_register'); A.t('shamefield'); A.talk('village_captain', /Here it is/); });
run('Elian: chat first, then leave via Esc', (A) => { toVillage(A); A.talk('tollway_elian', /heroes/); A.f('tollway_ragpickers'); A.f('tollway_root_chewers'); A.t('shamefield'); A.talk('village_tamsin'); A.talk('village_mara'); A.talk('village_captain'); });
run('Shane talked to before the traders', (A) => { toVillage(A); A.talk('tollway_elian', /village/); A.f('tollway_ragpickers'); A.f('tollway_root_chewers'); A.t('shamefield'); A.talk('village_shane', /watch/); A.talk('village_shane', /watch/); A.talk('village_shane', /need/); A.t('allotment'); A.f('allotment_watch'); A.i('allotment_wagon'); A.t('shamefield'); A.talk('village_shane', /ledger/); A.talk('village_tamsin'); A.talk('village_bragg'); A.talk('village_captain'); A.t('tollway'); A.i('tollway_register'); A.t('shamefield'); A.talk('village_captain', /Here it is/); });
run('register, decline once, then hand in', (A, set) => { toVillage(A); A.talk('tollway_elian', /village/); A.f('tollway_ragpickers'); A.f('tollway_root_chewers'); A.t('shamefield'); A.talk('village_tamsin'); A.talk('village_iona'); A.talk('village_captain'); A.t('tollway'); A.i('tollway_register'); A.t('shamefield'); A.talk('village_captain', /Goodbye/); A.talk('village_captain', /Here it is/); });
