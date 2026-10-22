// QA-14 rider checks: riders blocked by absorb/dodge/blind, and nothing that should still land is lost.
//   node qa/scripts/riders.js
const path = require('path').join(__dirname, '..', '..');
const { GameEngine } = require(path + '/src/engine.js');
const DATA = require(path + '/src/data.js');
const { registry } = require(path + '/src/effects.js');
const out = []; const ok = (id, c, note) => out.push(`${c ? 'PASS' : 'FAIL'}  ${id}  ${note}`);
const mk = (cls, mutate, room = 'n', branch) => {
  const d = JSON.parse(JSON.stringify(DATA)); if (mutate) mutate(d);
  const g = new GameEngine({ seed: 4, data: d }); g.start(); g.input(cls); if (branch) { g.input('add_xp 250'); g.input(branch); }
  g.player.spd = 40; g.input(room); g.input('engage');
  g.player.hp = g.player.maxHp = 9999; g.player.resource.current = g.player.resource.max = 99;
  for (const e of g.combat.enemies) { e.hp = e.maxHp = 999; e.critChance = 0; }
  return g;
};
const dodge = (g, t, v = 1) => g.applyStatus(t, t, { name: 'Mirror Image', type: 'dodge', value: v, duration: 5 });

// 1. multi-hit: hit 1 absorbed, hit 2 connects -> rider lands
{ const g = mk('necromancer', (d) => { d.rooms.hallway_of_chains.enemies = ['shackled_ghoul']; d.enemies.shackled_ghoul.skills = [{ name: 'Double Stun', base_damage: [5, 5], effects: [{ type: 'multi_hit', count: 2 }, { type: 'stun', duration: 1 }] }]; }, 'n', 'bone warden');
  g.applyStatus(g.player, g.player, { name: 'Bone Wall', type: 'absorb', duration: 3 });
  const gh = g.combat.enemies[0]; g.castSkill(gh, gh.skills[0], [g.player]);
  ok('multi-hit', !!g.findStatus(g.player, 'Stun'), `hit 1 absorbed, hit 2 connects -> stun lands: ${!!g.findStatus(g.player, 'Stun')}`); }
// 2. AoE: riders per target reached (player Soul Rend-like AoE with bleed, one enemy dodges)
{ const g = mk('warrior', (d) => { d.skillDefinitions['Test Rend'] = { name: 'Test Rend', cost: 0, base_damage: [1, 1], effects: [{ type: 'bleed', value: 1, duration: 2 }], target: 'enemy_aoe', damage_type: 'physical' }; });
  g.player.skills.push('Test Rend'); const [a, b, c] = g.combat.enemies; dodge(g, b);
  g.input('test rend');
  const got = [a, b, c].map((e) => !!g.findStatus(e, 'Bleed'));
  ok('aoe per target', got.join() === 'true,false,true', `bleed on [${got}] (middle enemy dodged)`); }
// 3. Blind miss blocks the rider
{ const g = mk('necromancer', (d) => { d.rooms.hallway_of_chains.enemies = ['shackled_ghoul']; d.enemies.shackled_ghoul.skills = [{ name: 'Stun Bite', base_damage: [5, 5], effects: [{ type: 'stun', duration: 1 }] }]; });
  const gh = g.combat.enemies[0]; g.applyStatus(g.player, gh, { name: 'Blind', type: 'blind', value: 1, duration: 3 });
  g.castSkill(gh, gh.skills[0], [g.player]);
  ok('blind miss', !g.findStatus(g.player, 'Stun'), `blinded miss -> no stun: ${!g.findStatus(g.player, 'Stun')}`); }
// 4. caster-side effects still happen on a dodged attack (Lunge +2 Fury, Mounted Charge +1)
for (const [skill, br] of [['Lunge', 'berserker'], ['Mounted Charge', 'vanguard']]) {
  const g = mk('warrior', null, 'n', br); g.player.skills.push(skill);
  const t = g.combat.enemies[0]; dodge(g, t); g.player.resource.current = 5;
  const before = g.player.resource.current; const cost = DATA.skillDefinitions[skill].cost;
  g.castSkill(g.player, g.playerSkill(skill), [t]); // direct: no cost, no round end
  const gain = g.player.resource.current - before;
  ok(`caster-side ${skill}`, gain === DATA.skillDefinitions[skill].effects.find((e) => e.type === 'gain_resource').value, `missed attack still grants +${gain} ${g.player.resource.type}`);
}
// 5. Shipped riders still land on normal connecting hits (incl. a 0-damage hit through armor)
const shipped = [['warrior', 'berserker', 'Hemorrhage', 'Bleed'], ['warrior', 'vanguard', 'Shield Bash', 'Stun'], ['rogue', 'assassin', 'Garrote', 'Silence'], ['necromancer', 'bone warden', "Reaper’s Charge", 'Stun']];
for (const [cls, br, sk, st] of shipped) {
  const g = mk(cls, null, 'n', br); g.player.skills.push(sk);
  const t = g.combat.enemies[0]; t.def = 999; // the hit connects for 0
  g.castSkill(g.player, g.playerSkill(sk), [t]);
  ok(`shipped ${sk}`, !!g.findStatus(t, st), `${st} applied on a connecting 0-damage hit: ${!!g.findStatus(t, st)}`);
}
{ const g = mk('mage', null); g.player.skills.push('Ice Lance'); g.rng = () => 0.1; const t = g.combat.enemies[0];
  g.castSkill(g.player, g.playerSkill('Ice Lance'), [t]); ok('shipped Ice Lance', !!g.findStatus(t, 'Slow'), 'slow on a connecting hit'); }
// 6. Ghoul minion's Weaken rider (summon pipeline)
{ const g = mk('necromancer', null, 'n', 'bone warden'); g.player.skills.push('Raise Ghoul'); g.input('raise ghoul');
  for (let i = 0; i < 3; i++) g.input('attack 1');
  const any = g.alive(g.combat.enemies).some((e) => g.findStatus(e, 'Weaken'));
  ok('ghoul Weaken rider', any, `minion hit applies Weaken: ${any}`); }
// 7. Corpse Bloom: corpse consumed and infection applied to every enemy it hit
{ const g = mk('necromancer', null); g.player.skills.push('Corpse Bloom'); g.combat.corpses = 1; const b = g.combat.enemies[1]; dodge(g, b);
  g.input('corpse bloom');
  const inf = g.combat.enemies.map((e) => !!g.infectionOn(e));
  ok('Corpse Bloom', g.combat.corpses === 0 && inf.join() === 'true,false,true', `corpse used; infected [${inf}] (middle dodged)`); }
// 8. inventory: every damaging skill with an apply-type effect, to make sure none is caster-side but reads ctx.targets
const list = [];
for (const [n, s] of Object.entries(DATA.skillDefinitions)) {
  if (!s.base_damage) continue;
  const applies = (s.effects || []).filter((e) => registry[e.type] && registry[e.type].apply && !registry[e.type].replacesDamage).map((e) => e.type);
  if (applies.length) list.push(`${n}: ${applies.join('+')}`);
}
console.log(out.join('\n'));
console.log('\nDamaging skills whose apply-effects are now filtered to reached targets:\n  ' + list.join('\n  '));
