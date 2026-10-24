const {test,assert,newGame}=require('./helpers.js');
test('feedback #96: Mara, Bragg, Iona and Shane stock purchasable goods',()=>{
 const g=newGame(68).do('warrior');
 for(const id of ['mara','bragg','iona','shane']) {
   const shop=g.data.shopDefinitions[id];
   assert.ok(shop && Object.keys(shop.stock).length > 0,id);
   for(const [name,entry] of Object.entries(shop.stock)) {
     assert.ok(g.data.itemDefinitions[name],name);
     assert.ok(Number.isInteger(entry.buyPrice)&&entry.buyPrice>0);
   }
 }
});
test('feedback #96: merchant buy and equip applies reversible bonuses',()=>{
 const g=newGame(69).do('warrior');
 g.player.gold=20;
 const base=g.player.def;
 assert.strictEqual(g.act({type:'buy',shopId:'mara',item:'Padded Jerkin'}).ok,true);
 assert.strictEqual(g.player.gold,8);
 assert.strictEqual(g.act({type:'equip',item:'Padded Jerkin'}).ok,true);
 assert.strictEqual(g.getState().player.equipment.bodyArmor,'Padded Jerkin');
 assert.strictEqual(g.getState().player.gold,8);
 assert.strictEqual(g.player.def,base+1);
 assert.strictEqual(g.act({type:'unequip',slot:'bodyArmor'}).ok,true);
 assert.strictEqual(g.player.def,base);
});
test('feedback #96: coin purse is consumed once and adds fixed Gold',()=>{
 const g=newGame(70).do('rogue');
 g.player.inventory.push('Small Coin Purse');
 const old=g.player.gold;
 assert.strictEqual(g.act({type:'use_item',item:'Small Coin Purse'}).ok,true);
 assert.strictEqual(g.player.gold,old+6);
 assert.strictEqual(g.act({type:'use_item',item:'Small Coin Purse'}).ok,false);
 assert.strictEqual(g.player.gold,old+6);
});
test('feedback #96: enemy kill Gold is credited once and persists across restore',()=>{
 const g=newGame(71).do('warrior','n','engage');
 const e=g.combat.enemies[0];
 const before=g.player.gold;
 g.damage(e,e.hp,g.player);
 assert.strictEqual(g.player.gold,before+2);
 const snap=JSON.parse(JSON.stringify(g.snapshot()));
 const h=newGame(72).do('warrior');h.restore(snap);
 assert.strictEqual(h.player.gold,before+2);
 g.onDeath(e,g.player);
 assert.strictEqual(g.player.gold,before+2);
});
