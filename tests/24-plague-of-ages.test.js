const { test, assert, newGame } = require('./helpers.js');
function plague() {
  const g = newGame(83).do('necromancer', 'n', 'engage');
  g.player.skills.push('Plague of Ages');
  g.player.resource.current = 7;
  return g;
}
test('N-2: Plague of Ages fills existing and empty Infection to max without immediate damage', () => {
  const g=plague(), [a,b,c]=g.combat.enemies;
  for (const e of [a,b,c]) e.hp=e.maxHp=100;
  g.infect(g.player,a,2);
  g.infect(g.player,b,1);
  g.castSkill(g.player,g.playerSkill('Plague of Ages'),g.combat.enemies);
  for (const e of [a,b,c]) {
    const s=g.infectionOn(e);
    assert.strictEqual(s.stacks,3);
    assert.strictEqual(s.duration,3);
    assert.strictEqual(s.trueDamage,true);
    assert.strictEqual(e.hp,100,'no extra cast tick');
    assert.strictEqual(g.dotTickDamage(s),6);
  }
});
test('N-2: immunity, cleanse, empowered refresh and Harbinger 8-point tick', () => {
  const g=plague(), [a,b,c]=g.combat.enemies;
  b.statusAffinities={Infection:'immune'};
  g.castSkill(g.player,g.playerSkill('Plague of Ages'),[a,b,c]);
  assert.strictEqual(g.infectionOn(b),null);
  g.infect(g.player,a,1);
  assert.strictEqual(g.infectionOn(a).trueDamage,true,'ordinary refresh retains empowerment');
  g.player.traits.push({name:'All infections deal +2 dmg/turn'});
  assert.strictEqual(g.dotTickDamage(g.infectionOn(a)),8);
  g.cleanse(a,{statuses:['Infection']});
  g.infect(g.player,a,1);
  assert.notStrictEqual(g.infectionOn(a).trueDamage,true,'new ordinary Infection not empowered');
});
test('N-2: Plague Sovereign passive empowers other owned DoTs without bypassing immunity', () => {
  const g=plague(), [a,b]=g.combat.enemies;
  g.player.traits.push({name:'All DoTs become true dmg, ignore resistances.'});
  g.applyDot(g.player,a,{name:'Poison',value:5,duration:3});
  assert.strictEqual(g.findStatus(a,'Poison').trueDamage,true);
  b.statusAffinities={Poison:'immune'};
  g.applyDot(g.player,b,{name:'Poison',value:5,duration:3});
  assert.strictEqual(g.findStatus(b,'Poison'),null);
});

test('N-2: all-resource cast refuses at zero without spending a turn',()=>{
  const g=plague();g.player.resource.current=0;
  const skill=g.data.skillDefinitions['Plague of Ages'];
  const refusal=g.effects.apply_max_infection_aoe.requires({engine:g,caster:g.player,targets:g.combat.enemies,skill,effect:skill.effects[0]});
  assert.match(refusal,/at least 1 Soul Energy/);
  assert.ok(g.combat.enemies.every(e=>!g.infectionOn(e)));
});
