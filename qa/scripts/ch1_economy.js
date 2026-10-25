// Chapter One economy checks on main: Gold sources on the real route, shops, buy/sell/equip rules, exploits, Q07.
// Compares with the candidate fixture in docs/design/ENSO_CH1_GOLD_ECONOMY_COMPLETION.md. Fights forced to 1 HP (economy, not balance).
//   node qa/scripts/ch1_economy.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const ZONE1 = require(path.join(ROOT, 'src/world/zone1.js'));
const H = require(path.join(ROOT, 'tests/world-helpers.js'));
const out = []; const rec = (id, ok, what, note) => out.push(`${ok === null ? 'INFO' : ok ? 'PASS' : 'FAIL'}  [${id}] ${what}\n        ${note}`);
const txt = (r) => (Array.isArray(r) ? r : (r && r.events) || []).filter((e) => e.type === 'text').map((e) => e.text).join(' / ');
function run(cls = 'warrior') { const g = new GameEngine({ seed: 7 }); g.start(); g.act({ type: 'choose_class', classId: cls }); g.act({ type: 'enter_world' }); g.player.hp = g.player.maxHp = 99999; return { g, s: new WorldSession(ZONE1, { engine: g }) }; }
const pick = (g, re) => { const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text)); return c ? g.act({ type: 'dialogue_choice', choiceId: c.choiceId }) : null; };
const bye = (g) => { if (g.getAvailableActions().awaiting === 'dialogue') g.act({ type: 'dialogue_leave' }); };
const win = (g) => { for (let i = 0; i < 200 && g.mode === 'combat'; i++) { for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1; const a = g.getAvailableActions(); if (a.awaiting === 'continue') g.act({ type: 'continue' }); else if (a.awaiting === 'turn_order') g.act({ type: 'turn_order', order: null }); else g.act({ type: 'attack', targetId: g.alive(g.combat.enemies)[0].id }); } };
const branch = (g) => { if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: Object.keys(g.data.evolutionPaths[g.player.className].branches)[0] }); };
const fight = (g, s, id) => { H.contact(s, id); win(g); s.fightOver(id, 'victory'); branch(g); return g.player.gold; };
function mainline(ctx, optional, log) {
  const { g, s } = ctx; const at = (k) => log && log.push(`${k} ${g.player.gold}`);
  H.inspect(s, 'cellar_inscription'); H.travel(s, 'house'); H.travel(s, 'grounds');
  if (optional) { fight(g, s, 'grounds_weed_rats'); at('rats'); }
  H.inspect(s, 'grounds_foundation'); H.travel(s, 'road');
  if (optional) { fight(g, s, 'road_wolf'); at('wolf'); }
  H.travel(s, 'tollway'); H.inspect(s, 'tollway_elian'); pick(g, /going on to the village/); bye(g); at('Elian');
  fight(g, s, 'tollway_ragpickers'); at('G1'); fight(g, s, 'tollway_root_chewers'); at('G2');
  H.takeExit(s, 'tollway_south'); H.inspect(s, 'village_tamsin'); bye(g); H.inspect(s, 'village_mara'); bye(g); at('Q04');
  if (optional) { H.inspect(s, 'village_shane'); pick(g, /watch/); pick(g, /need/); pick(g, /ledger/); bye(g); H.travel(s, 'allotment'); fight(g, s, 'allotment_watch'); H.inspect(s, 'allotment_wagon'); H.travel(s, 'shamefield'); H.inspect(s, 'village_shane'); pick(g, /ledger/); bye(g); at('S01'); }
  H.inspect(s, 'village_captain'); bye(g); H.travel(s, 'tollway'); H.inspect(s, 'tollway_register'); H.travel(s, 'shamefield'); H.inspect(s, 'village_captain'); pick(g, /Here it is/); bye(g); at('Q05');
  H.travel(s, 'orchard'); fight(g, s, 'orchard_cultists'); at('G3'); H.takeExit(s, 'orchard_north'); fight(g, s, 'featherwatch_ghoul'); at('G4');
  H.takeExit(s, 'featherwatch_north'); H.inspect(s, 'sanctuary_journal'); H.inspect(s, 'sanctuary_warden_npc'); pick(g, /What is behind it/); pick(g, /I'll go/);
  branch(g);
  ctx.preWarden = g.player.gold;
  H.inspect(s, 'sanctuary_warden_npc'); pick(g, /Stand aside/); pick(g, /Draw your weapon/); fight(g, s, 'sanctuary_warden'); at('Warden');
}
// E1 Gold timeline
{ const c = run(); const log = []; mainline(c, false, log); rec('E1', c.preWarden >= 78, 'Gold on the mandatory path (fixture: 78 before the Warden, +70 guaranteed after, gate 60)', `${log.join(' · ')} · before Warden ${c.preWarden}`);
  const o = run(); const l2 = []; mainline(o, true, l2); rec('E1b', null, 'Gold with every optional fight and Shane', `${l2.join(' · ')}`);
  // E2 Q07
  const { g, s } = c; H.travel(s, 'seal_chamber'); const seal = H.inspect(s, 'seal_first_echo'); c.afterSeal = g.player.gold;
  let q7 = ''; try { H.travel(s, 'sanctuary'); H.travel(s, 'featherwatch'); H.travel(s, 'orchard'); H.travel(s, 'shamefield'); H.travel(s, 'tollway'); H.travel(s, 'road'); H.travel(s, 'grounds'); const r = H.inspect(s, 'grounds_orin'); const r2 = pick(g, /rebuilt/); q7 = (txt(r) + ' // ' + txt(r2)).slice(0, 220); bye(g); } catch (e) { q7 = 'route: ' + e.message; }
  const b = g.act({ type: 'build', upgradeId: 'homestead_gate' });
  rec('E2', g.questState('Q07') === 'complete', 'Q07: build the homestead gate after the Warden and the seal (the only way to finish Chapter One)', `Gold after the Warden ${c.afterSeal}; Q07 ${g.questState('Q07')}; ledger: ${g.player.inventory.includes("Builder's Ledger")}; Orin: "${q7}"; build → ${txt(b) || JSON.stringify(b.refusal || b).slice(0, 100)}; Gold ${g.player.gold}; constructionDefinitions: ${JSON.stringify(g.data.constructionDefinitions)}`); }
// E3 buying from anywhere / anyone
{ const { g, s } = run(); g.player.gold = 100;
  const r1 = g.act({ type: 'buy', shopId: 'shane', item: 'Healing Herb Bundle' });
  rec('E3', !g.player.inventory.includes('Healing Herb Bundle'), "Buying needs the merchant: buy from Shane's stall in the cellar, before Shane is recruited", `in ${s.mapId}, Shane recruited: ${g.storyAllows({ flags: ['shane_recruited'] })}; act(buy shane) → "${txt(r1)}"; inventory has it: ${g.player.inventory.includes('Healing Herb Bundle')}`);
  const r2 = g.input('buy iona Bandages'); rec('E3b', !/Purchased/.test(txt(r2)), "Text command: buy from Iona while standing in the cellar", `"${txt(r2)}"`);
  H.inspect(s, 'cellar_inscription'); H.travel(s, 'house'); H.travel(s, 'grounds'); H.contact(s, 'grounds_weed_rats');
  const r3 = g.act({ type: 'buy', shopId: 'mara', item: 'Bandages' }); rec('E3c', !/Purchased/.test(txt(r3)), 'Buying during a fight', `mode ${g.mode}; "${txt(r3).slice(0, 100)}"`); win(g); }
// E4 sell rules and arbitrage
{ const { g } = run(); g.player.gold = 0; const prices = [];
  for (const [shop, def] of Object.entries(g.data.shopDefinitions)) for (const [item, e] of Object.entries(def.stock)) { const d = g.data.itemDefinitions[item]; prices.push(`${shop} ${item} buy ${e.buyPrice} sell ${d.sellable ? d.sellPrice : '—'}${d.sellable && d.sellPrice >= e.buyPrice ? ' ARBITRAGE' : ''}`); }
  rec('E4', !prices.some((p) => /ARBITRAGE/.test(p)), 'No buy-low/sell-high loop', prices.join(' · '));
  g.player.inventory.push('Tollway Register', 'Seal-Key of the First Echo', "Shane's Ledger");
  const res = ['Tollway Register', 'Seal-Key of the First Echo', "Shane's Ledger", 'Bandages'].map((it) => { g.player.inventory.push(it); const before = g.player.gold; g.act({ type: 'sell', shopId: 'mara', item: it }); return `${it}: ${g.player.gold > before ? 'SOLD' : 'refused'}`; });
  rec('E4b', !res.some((r) => /Register|Seal|Ledger/.test(r) && /SOLD/.test(r)), 'Quest items cannot be sold', res.join(' · ')); }
// E5 equip/unequip stat drift
{ const { g } = run(); const p = g.player; const base = { str: p.strength, def: p.def, int: p.intelligence };
  p.inventory.push('Roadworn Blade', 'Padded Jerkin', 'Apprentice Charm', 'Roadworn Blade');
  for (let i = 0; i < 5; i++) { g.act({ type: 'equip', item: 'Roadworn Blade' }); g.act({ type: 'equip', item: 'Padded Jerkin' }); g.act({ type: 'equip', item: 'Apprentice Charm' }); g.act({ type: 'unequip', slot: 'mainHand' }); g.act({ type: 'unequip', slot: 'bodyArmor' }); g.act({ type: 'unequip', slot: 'accessory' }); }
  const after = { str: p.strength, def: p.def, int: p.intelligence };
  g.act({ type: 'equip', item: 'Roadworn Blade' }); const one = p.strength; g.act({ type: 'equip', item: 'Roadworn Blade' }); const two = p.strength;
  rec('E5', JSON.stringify(base) === JSON.stringify(after) && two === one, 'Equip/unequip x5 leaves stats unchanged; equipping a second copy does not stack', `before ${JSON.stringify(base)} after ${JSON.stringify(after)}; blade once STR ${one}, twice ${two}`);
  // value of gear: statDamagePer
  rec('E5b', null, 'What gear is worth in combat', `gameRules.statDamagePer ${g.data.gameRules.statDamagePer}: +1 STR/INT (Blade, Charm) is +0.25 damage per hit, i.e. +1 only on every 4th point; +1 DEF (Jerkin) is -1 per enemy hit. Fixture asked for "+1 physical attack damage"`); }
// E6 save/load keeps Gold, stock, equipment
{ const { g } = run(); g.player.gold = 50; g.act({ type: 'buy', shopId: 'mara', item: 'Padded Jerkin' }); g.act({ type: 'equip', item: 'Padded Jerkin' });
  const g2 = GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize({})))); const p2 = g2.player;
  rec('E6', p2.gold === g.player.gold && p2.equipment.bodyArmor === 'Padded Jerkin' && p2.def === g.player.def && (p2.shopStock || {})['mara:Padded Jerkin'] === 1, 'Save/load keeps Gold, shop stock, equipment and its stat', `gold ${g.player.gold}→${p2.gold}; armor ${p2.equipment.bodyArmor}; DEF ${g.player.def}→${p2.def}; mara jerkins left ${(p2.shopStock || {})['mara:Padded Jerkin']}`); }
// E7 kill gold can't be farmed by fleeing
{ const { g, s } = run(); H.inspect(s, 'cellar_inscription'); H.travel(s, 'house'); H.travel(s, 'grounds');
  H.contact(s, 'grounds_weed_rats');
  for (let i = 0; i < 20 && g.mode === 'combat' && g.alive(g.combat.enemies).length > 1; i++) { g.combat.enemies[0].hp = 1; const a = g.getAvailableActions(); if (a.awaiting === 'continue') g.act({ type: 'continue' }); else g.act({ type: 'attack', targetId: g.combat.enemies[0].id }); }
  for (let i = 0; i < 30 && g.mode === 'combat'; i++) { const a = g.getAvailableActions(); if (a.awaiting === 'continue') g.act({ type: 'continue' }); else g.act({ type: 'flee' }); }
  const after1 = g.player.gold; s.fightOver('grounds_weed_rats', 'fled');
  const e = s.map.encounters.find((x) => x.id === 'grounds_weed_rats'); H.walkTo(s, e.x, e.y + 3); const r = H.contact(s, 'grounds_weed_rats'); const back = r.type; win(g); s.fightOver('grounds_weed_rats', 'victory');
  rec('E7', after1 === 2 && g.player.gold === 4, 'Kill one rat, flee, come back and win: each rat pays its 2 Gold once (4 in all)', `after the flee ${after1}; re-engage ${back}; after the win ${g.player.gold}; kills credited ${g.stats.kills}`); }
// E8 text commands
{ const { g } = run(); g.player.gold = 50; const a = txt(g.input('buy iona bandages')); const b = txt(g.input('buy iona Bandages'));
  rec('E8', !/cannot sell/.test(a), "Text version: 'buy iona bandages' (lower case, as players type it)", `lower case → "${a.replace(/^> [^/]*\/ /, '')}"; exact case → "${b.replace(/^> [^/]*\/ /, '')}"`);
  rec('E8b', null, 'Starting inventory on the world route', JSON.stringify(g.player.inventory.filter((i) => i !== 'Bandages')) + ' (none of these are in itemDefinitions: not usable, equippable or sellable)'); }
console.log(out.join('\n')); console.log(`\n${out.filter((l) => l.startsWith('PASS')).length}/${out.filter((l) => /^(PASS|FAIL)/.test(l)).length} pass`);
