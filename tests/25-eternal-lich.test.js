const {test,assert,newGame}=require('./helpers.js');
function lich(){
 const g=newGame(79).do('necromancer','n','engage');
 g.player.traits.push({name:'Undying Will'});
 g.player.skills.push('Eternal Lich Unmake','Soul Chain','Soul Feast');
 g.player.resource.current=10;g.player.resource.max=20;
 return g;
}
test('N-6: Eternal Lich and Hollow King Unmake keep separate costs',()=>{
 const g=lich();
 const eternal=g.data.skillDefinitions['Eternal Lich Unmake'];
 const hollow=g.data.skillDefinitions.Unmake;
 assert.strictEqual(eternal.cost,5);assert.strictEqual(eternal.resource,'Soul Energy');
 assert.strictEqual(eternal.oncePerFight,true);
 assert.strictEqual(hollow.cost,5);assert.strictEqual(hollow.resource,'Hollow Will');
});
test('N-6: Eternal Lich cannot erase boss or erase-immune targets',()=>{
 const g=lich(),skill=g.data.skillDefinitions['Eternal Lich Unmake'];
 const target=g.combat.enemies[0];
 target.specialFlags=['boss'];
 assert.match(g.effects.eternal_lich_unmake.requires({engine:g,caster:g.player,targets:[target],skill,effect:skill.effects[0]}),/boss/);
 target.specialFlags=['erase_immune'];
 assert.match(g.effects.eternal_lich_unmake.requires({engine:g,caster:g.player,targets:[target],skill,effect:skill.effects[0]}),/immune/);
 target.specialFlags=[];
 g.castSkill(g.player,skill,[target]);
 assert.strictEqual(target.erased,true);
});
test('N-6: Undying Will triggers exactly once and preserves resources and summons',()=>{
 const g=lich(); const m=g.summon('skeleton');
 g.player.maxHp=101;g.player.hp=0;
 g.player.resource.current=7;
 assert.strictEqual(g.tryUndyingWill(),true);
 assert.strictEqual(g.player.hp,51);
 assert.strictEqual(g.player.resource.current,7);
 assert.ok(g.combat.minions.includes(m));
 g.player.hp=0;
 assert.strictEqual(g.tryUndyingWill(),false);
});
test('N-6: free Soul Feast cost consumed once and save-state durable',()=>{
 const g=lich(),[a,b]=g.combat.enemies;
 g.castSkill(g.player,g.data.skillDefinitions['Soul Chain'],[a,b]);
 assert.strictEqual(g.skillCost(g.data.skillDefinitions['Soul Feast']),0);
 const snapshot=g.snapshot();
 g.combat.freeSoulFeastUsed=true;
 assert.strictEqual(g.skillCost(g.data.skillDefinitions['Soul Feast']),2);
 g.restore(snapshot);
 assert.strictEqual(g.skillCost(g.data.skillDefinitions['Soul Feast']),0);
});

test('QA-29 Undying Will preserves caster Soul Chain and Feast on lethal hit',()=>{
 const g=lich();const [a,b]=g.combat.enemies;
 g.castSkill(g.player,g.data.skillDefinitions['Soul Chain'],[a,b]);
 g.castSkill(g.player,g.data.skillDefinitions['Soul Feast'],[a,b]);
 const links=()=>g.combat.enemies.reduce((n,e)=>n+e.statusEffects.filter(s=>s.type==='soul_link').length,0);
 const drains=()=>g.combat.enemies.reduce((n,e)=>n+e.statusEffects.filter(s=>s.type==='soul_feast').length,0);
 assert.strictEqual(links(),2); assert.strictEqual(drains(),2);
 g.player.hp=1;
 g.damage(g.player,10,a);
 assert.strictEqual(g.player.hp,Math.ceil(g.player.maxHp/2));
 assert.strictEqual(g.player.dead,false);
 assert.strictEqual(links(),2,'lethal interception must not clear owned links');
 assert.strictEqual(drains(),2,'lethal interception must not clear active Feast');
});
test('QA-30 lethal one-round Poison revives before turn-skip and expires after the opportunity',()=>{
 const g=lich();const enemy=g.combat.enemies[0];
 g.player.hp=1;g.player.maxHp=10;
 g.applyStatus(enemy,g.player,{name:'Poison',type:'dot',value:50,duration:1});
 assert.strictEqual(g.startTurn(g.player),false,'revived player retains normal turn');
 assert.strictEqual(g.player.hp,5);
 g.tickStatusesEndOfRound();
 assert.strictEqual(g.findStatus(g.player,'Poison'),null,'the killing 1-round DoT expires');
 assert.strictEqual(g.combat.undyingWillUsed,true);
});
test('QA-31 unmake command resolves to Lich variant without changing Hollow King definition',()=>{
 const g=lich();
 assert.strictEqual(g.resolveSkillName('unmake'),'Eternal Lich Unmake');
 assert.strictEqual(g.data.skillDefinitions.Unmake.resource,'Hollow Will');
});
