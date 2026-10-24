const {test,assert,newGame}=require('./helpers.js');
function homestead(){
 const g=newGame(124).do('necromancer');
 g.player.gold=10;
 g.data.constructionDefinitions.field_plot={name:'Field Plot',goldCost:3,materials:{'Plank':1}};
 g.data.cropDefinitions['Herb Seeds']={requiresUpgrade:'field_plot',actionsToGrow:2,produces:'Fresh Herb'};
 g.data.recipeDefinitions['herbal_food']={requiresUpgrade:'field_plot',ingredients:{'Fresh Herb':1,'Moldy Bread':1},output:'Herbal Meal'};
 g.player.inventory.push('Plank','Herb Seeds','Moldy Bread');
 return g;
}
test('CH1 home: one-time construction consumes Gold and materials without duplication',()=>{
 const g=homestead();
 assert.strictEqual(g.act({type:'build',upgradeId:'field_plot'}).ok,true);
 assert.strictEqual(g.player.gold,7);
 assert.strictEqual(g.player.inventory.includes('Plank'),false);
 assert.strictEqual(g.act({type:'build',upgradeId:'field_plot'}).ok,false);
 assert.strictEqual(g.player.gold,7);
});
test('CH1 home: planting, tending, harvesting and crafting consume finite resources',()=>{
 const g=homestead();g.act({type:'build',upgradeId:'field_plot'});
 assert.strictEqual(g.act({type:'plant',plotId:'plot1',seed:'Herb Seeds'}).ok,true);
 assert.strictEqual(g.act({type:'harvest',plotId:'plot1'}).ok,false);
 g.act({type:'tend',plotId:'plot1'});g.act({type:'tend',plotId:'plot1'});
 assert.strictEqual(g.act({type:'harvest',plotId:'plot1'}).ok,true);
 assert.strictEqual(g.act({type:'harvest',plotId:'plot1'}).ok,false);
 assert.strictEqual(g.act({type:'craft',recipeId:'herbal_food'}).ok,true);
 assert.strictEqual(g.player.inventory.includes('Herbal Meal'),true);
 assert.strictEqual(g.act({type:'craft',recipeId:'herbal_food'}).ok,false);
});
test('CH1 home: save and restore preserves construction and plot progress',()=>{
 const g=homestead();g.act({type:'build',upgradeId:'field_plot'});g.act({type:'plant',plotId:'plot1',seed:'Herb Seeds'});
 g.act({type:'tend',plotId:'plot1'});
 const snap=JSON.parse(JSON.stringify(g.snapshot()));
 const h=homestead();h.restore(snap);
 assert.strictEqual(h.player.homestead.built.field_plot,true);
 assert.strictEqual(h.player.homestead.plots.plot1.remaining,1);
 assert.strictEqual(h.act({type:'tend',plotId:'plot1'}).ok,true);
 assert.strictEqual(h.act({type:'harvest',plotId:'plot1'}).ok,true);
});
