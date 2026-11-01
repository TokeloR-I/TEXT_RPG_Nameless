const {test,assert,newGame}=require('./helpers.js');
// March of Endless Bones (Tokelo 2026-11-01, docs/design/NECROMANCER_LIVE_KIT.md): skeletons up to the minion cap plus one
// Skeleton Champion (double a skeleton); costed and on a cooldown instead of once per fight.
function march(){
 const g=newGame(95).do('necromancer','n','engage');
 g.player.skills.push('March of Endless Bones');
 g.player.traits.push({name:'+3 max minions; all summons gain AOE attacks'});
 g.player.resource.current=10;
 return g;
}
const skill=(g)=>g.data.skillDefinitions['March of Endless Bones'];
test('March: fills the army to the cap and adds a Skeleton Champion with double a skeleton\'s stats',()=>{
 const g=march();
 g.summon('skeleton');
 g.castSkill(g.player,skill(g),[g.player]);
 const alive=g.alive(g.combat.minions);
 const champs=alive.filter(m=>m.summonType==='skeleton_champion');
 assert.strictEqual(champs.length,1);
 assert.strictEqual(alive.length-1,g.minionCap(),'skeletons up to the cap, the champion on top');
 const sk=g.data.minionDefinitions.skeleton, ch=g.data.minionDefinitions.skeleton_champion;
 assert.strictEqual(ch.maxHp,sk.maxHp*2); assert.strictEqual(ch.atk,sk.atk*2); assert.strictEqual(ch.def,sk.def*2);
 assert.deepStrictEqual(ch.skills[0].base_damage,sk.skills[0].base_damage.map(x=>x*2));
});
test('March: costed with a cooldown, not once per fight or all Soul Energy',()=>{
 const s=newGame().data.skillDefinitions['March of Endless Bones'];
 assert.ok(!s.oncePerFight); assert.strictEqual(typeof s.cost,'number'); assert.ok(s.cooldown>=30);
});
test('March: a full army with its champion refuses; no overflow',()=>{
 const g=march();
 g.castSkill(g.player,skill(g),[g.player]);
 const n=g.alive(g.combat.minions).length;
 const reason=g.effects.raise_army.requires({engine:g,caster:g.player,targets:[g.player],skill:skill(g),effect:skill(g).effects[0]});
 assert.match(reason,/full strength/i);
 assert.strictEqual(g.alive(g.combat.minions).length,n);
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
