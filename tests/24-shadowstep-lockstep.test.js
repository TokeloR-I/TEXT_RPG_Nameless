const {test,assert,newGame}=require('./helpers.js');
test('D-10 Shadowstep emits presentation and retains guaranteed crit',()=>{
 const g=newGame(104).do('rogue','n','engage');
 const target=g.combat.enemies[0];
 g.player.skills.push('Shadowstep');
 g.castSkill(g.player,g.playerSkill('Shadowstep'),[target]);
 const entries=g.flush();
 assert.ok(entries.some(x=>x.type==='combat.presentation'&&x.kind==='dash'&&x.anchorId===target.id));
 assert.ok(g.findStatus(g.player,'Guaranteed Crit'));
 const enemy=g.combat.enemies[0];enemy.critChance=0;
 const h=g.newHit(enemy);
 g.rollDamage(g.player,enemy,{name:'Probe',base_damage:[8,8],damage_type:'physical'},h);
 assert.strictEqual(h.isCrit,true);
 assert.strictEqual(g.findStatus(g.player,'Guaranteed Crit'),null);
});
test('D-10 Shadowstep: no enemy anchor refuses before cost',()=>{
 const g=newGame(105).do('rogue','n','engage');
 const skill=g.data.skillDefinitions.Shadowstep;
 const err=g.effects.teleport_to_enemy.requires({engine:g,caster:g.player,skill,effect:skill.effects[0],targets:[]});
 assert.match(err,/living enemy/);
});
test('Lockstep: taunts player even when a summoned ally is taunting',()=>{
 const g=newGame(106).do('warrior','n','engage');
 const target=g.combat.enemies[0];
 const minion=g.summon('skeleton');
 g.applyStatus(g.player,minion,{name:'Taunt',type:'taunt',duration:2});
 g.castSkill(g.player,g.data.skillDefinitions.Lockstep,g.combat.enemies);
 assert.ok(g.statusOfType(target,'taunt_player'));
 const chosen=[];
 const cast=g.castSkill.bind(g);
 g.castSkill=(actor,skill,targets)=>{if(!actor.isPlayer&&!actor.isMinion) chosen.push(targets[0].id); return cast(actor,skill,targets);};
 g.enemyTurn(target);
 assert.deepStrictEqual(chosen,[g.player.id]);
 g.cleanse(target,{statuses:['Lockstep']});
 g.enemyTurn(target);
 assert.deepStrictEqual(chosen,[g.player.id,minion.id]);
});
