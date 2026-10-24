// Tokelo's route: never read the cellar inscription, walk past the tollway fights, talk to everyone, do Shane's quest.
const R = require('path').join(__dirname, '..', '..');
const { GameEngine } = require(R + '/src/engine.js');
const { WorldSession } = require(R + '/src/world/world.js');
const { doubleWorld } = require(R + '/src/world/scale16.js');
const H = require(R + '/tests/world-helpers.js');
const W = doubleWorld(require(R + '/src/world/zone1.js'));
const g = new GameEngine({ seed: 1 }); g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
g.player.hp = g.player.maxHp = 99999;
const s = new WorldSession(W, { engine: g });
const txt = (r) => (r && r.events || []).filter((e) => e.type === 'text').map((e) => e.text).join(' / ');
const Q = () => ['Q01','Q02','Q03','Q04','Q05','S01'].map((q) => q + ':' + g.questState(q)).join(' ') + ` | L${g.player.level} xp ${g.player.xp} | HUD: ${(g.trackedObjective() || {}).text}`;
const pick = (re) => { const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text)); if (!c) return 'no ' + re; return txt(g.act({ type: 'dialogue_choice', choiceId: c.choiceId })); };
const talk = (id, ...res) => { const r = H.inspect(s, id); const o = [txt(r)]; for (const re of res) o.push(pick(re)); if (g.getAvailableActions().awaiting === 'dialogue') g.act({ type: 'dialogue_leave' }); console.log('TALK', id, '::', o.join(' // ').slice(0, 260)); };
const win = () => { for (let i = 0; i < 100 && g.mode === 'combat'; i++) { for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1; const a = g.getAvailableActions(); if (a.awaiting === 'continue') g.act({ type: 'continue' }); else g.act({ type: 'attack', targetId: g.alive(g.combat.enemies)[0].id }); } };
for (const m of ['house', 'grounds', 'road', 'tollway']) H.travel(s, m);
console.log('at tollway:', Q());
talk('tollway_elian', /going on to the village/);
console.log('after Elian:', Q());
H.takeExit(s, 'tollway_south');                     // walks past both gate fights (QA-33)
console.log('in Shamefield, fights fought:', g.isDefeated('tollway_ragpickers'), Q());
talk('village_tamsin'); talk('village_mara'); talk('village_captain');
console.log('after Tamsin/Mara/Captain:', Q());
talk('village_shane', /watch/, /need/, /ledger/);
H.travel(s, 'allotment'); const c = H.contact(s, 'allotment_watch'); win(); s.fightOver('allotment_watch', 'victory');
H.inspect(s, 'allotment_wagon'); H.travel(s, 'shamefield');
talk('village_shane', /ledger/);
console.log('after Shane:', Q(), 'recruited', g.storyAllows({ flags: ['shane_recruited'] }));
// Going back to read the inscription: does the chain catch up?
H.travel(s, 'tollway'); H.travel(s, 'road'); H.travel(s, 'grounds'); H.travel(s, 'house'); H.travel(s, 'cellar');
console.log('inscription:', txt(H.inspect(s, 'cellar_inscription')));
console.log('after inscription:', Q());
for (const m of ['house', 'grounds']) H.travel(s, m);
console.log('after leaving the cellar again:', Q());
H.inspect(s, 'grounds_foundation'); H.travel(s, 'road');
console.log('after foundation + road:', Q());
H.travel(s, 'tollway'); console.log('back at tollway:', Q());
