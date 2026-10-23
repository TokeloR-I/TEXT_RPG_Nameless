const {test,assert,newGame}=require('./helpers.js');
function march(){
 const g=newGame(95).do('necromancer','n','engage');
 g.player.skills.push('March of Endless Bones');
 g.player.traits.push({name:'+3 max minions; all summons gain AOE attacks'});
 g.player.resource.current=7;
 return g;
}
test('N-1 March: resurrects oldest fallen at half HP as new IDs and adds Ghoul',()=>{
 const g=march();
 const a=g.summon('skeleton'),b=g.summon('ghoul');
 g.damage(a,a.hp,g.combat.enemies[0]);g.damage(b,b.hp,g.combat.enemies[0]);
 g.castSkill(g.player,g.data.skillDefinitions['March of Endless Bones'],[g.player]);
 const alive=g.alive(g.combat.minions);
 assert.strictEqual(alive.length,3);
 assert.strictEqual(alive[0].resurrectedFrom,a.id);
 assert.strictEqual(alive[1].resurrectedFrom,b.id);
 assert.strictEqual(alive[0].hp,Math.ceil(a.maxHp/2));
 assert.strictEqual(alive[1].hp,Math.ceil(b.maxHp/2));
 assert.strictEqual(alive[2].summonType,'ghoul');
 assert.ok(a.resurrectionConsumed&&b.resurrectionConsumed);
 assert.ok(new Set(alive.map(m=>m.id)).size===3);
 assert.ok(!g.combat.order.includes(alive[0]),'resurrected minions join next round');
});
test('N-1 March: no fallen and full capacity refuses; no overflow',()=>{
 const g=march();
 for(let i=0;i<6;i++)g.summon('skeleton');
 const skill=g.data.skillDefinitions['March of Endless Bones'];
 const reason=g.effects.resurrect_all_minions.requires({engine:g,caster:g.player,targets:[g.player],skill,effect:skill.effects[0]});
 assert.match(reason,/no capacity/i);
 assert.strictEqual(g.alive(g.combat.minions).length,6);
});
test('N-1 March: splash spreads half actual minion damage without recursion',()=>{
 const g=march(),[a,b,c]=g.combat.enemies;
 for (const e of [a,b,c]){e.hp=e.maxHp=100;e.def=0;e.critChance=0;}
 const m=g.summon('skeleton');m.critChance=0;
 g.rng=()=>0.99;
 g.castSkill(m,{name:'Test Minion Attack',base_damage:[10,10],damage_type:'physical',effects:[]},[a]);
 assert.strictEqual(a.hp,90);
 assert.strictEqual(b.hp,95);
 assert.strictEqual(c.hp,95);
});
