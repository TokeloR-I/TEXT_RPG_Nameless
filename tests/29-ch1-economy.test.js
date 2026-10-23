const { test, assert, newGame }=require('./helpers.js');
function setup(){
 const g=newGame(123).do('warrior');
 g.data.itemDefinitions['Practice Coat']={type:'armor',slot:'bodyArmor',statModifiers:{def:1},sellable:true,sellPrice:2,description:'test gear'};
 g.data.itemDefinitions['Village Key']={type:'quest',sellable:false};
 g.data.shopDefinitions.test={stock:{'Practice Coat':{buyPrice:5,quantity:1}}};
 g.player.gold=8;
 return g;
}
test('CH1 economy: equip/unequip never duplicates inventory or DEF',()=>{
 const g=setup(),base=g.player.def;
 g.player.inventory.push('Practice Coat');
 for(let i=0;i<4;i++){g.do('equip Practice Coat');assert.strictEqual(g.player.def,base+1);g.do('unequip bodyArmor');assert.strictEqual(g.player.def,base);}
 assert.strictEqual(g.player.inventory.filter(x=>x==='Practice Coat').length,1);
 assert.strictEqual(g.player.equipment.bodyArmor,null);
});
test('CH1 economy: buy atomically reduces Gold and stock; reselling adds correct money',()=>{
 const g=setup();
 const result=g.act({type:'buy',shopId:'test',item:'Practice Coat'});
 assert.strictEqual(result.ok,true);
 assert.strictEqual(g.player.gold,3);
 assert.strictEqual(g.player.shopStock['test:Practice Coat'],0);
 assert.strictEqual(g.player.inventory.filter(x=>x==='Practice Coat').length,1);
 assert.strictEqual(g.act({type:'buy',shopId:'test',item:'Practice Coat'}).ok,false);
 assert.strictEqual(g.player.gold,3);
 assert.strictEqual(g.act({type:'sell',shopId:'test',item:'Practice Coat'}).ok,true);
 assert.strictEqual(g.player.gold,5);
 assert.strictEqual(g.player.inventory.includes('Practice Coat'),false);
});
test('CH1 economy: quest key cannot be sold; JSON snapshot preserves equipment & purse',()=>{
 const g=setup();g.player.inventory.push('Village Key','Practice Coat');
 assert.strictEqual(g.act({type:'sell',shopId:'test',item:'Village Key'}).ok,false);
 g.do('equip Practice Coat');
 const snap=JSON.parse(JSON.stringify(g.snapshot())),h=setup();h.restore(snap);
 assert.strictEqual(h.player.gold,8);
 assert.strictEqual(h.player.equipment.bodyArmor,'Practice Coat');
 assert.strictEqual(h.player.def,g.player.def);
 assert.strictEqual(h.player.inventory.includes('Village Key'),true);
});
test('CH1 economy: shop definitions are immutable across two new games',()=>{
 const g=setup();g.do('buy test Practice Coat');
 assert.strictEqual(g.data.shopDefinitions.test.stock['Practice Coat'].quantity,1);
 const h=setup();
 assert.strictEqual(h.act({type:'buy',shopId:'test',item:'Practice Coat'}).ok,true);
});
