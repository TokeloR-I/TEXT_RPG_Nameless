const {test,assert,data}=require('./helpers');
const {runRoute}=require('../tools/lib/chapter-one-loot-route');
test('LOOT-01: 200 seeded mandatory routes collect >=65 Gold and exactly 250 pre-Warden XP',()=>{
    const classes=Object.keys(data.basePlayerClasses), amounts=[];
    for(let seed=1;seed<=200;seed++) {
        const result=runRoute({cls:classes[(seed-1)%classes.length],seed,forced:true,buy:false,stopBeforeBoss:true});
        assert.strictEqual(result.where,null);
        assert.ok(result.preWardenGold>=65&&result.preWardenGold<=83,`${seed}: ${result.preWardenGold}`);
        assert.strictEqual(result.totalXp,250);
        assert.strictEqual(result.g.player.level,3);
        assert.strictEqual(result.g.data.constructionDefinitions.homestead_gate.goldCost,0);
        amounts.push(result.preWardenGold);
    }
    assert.ok(amounts.reduce((a,b)=>a+b,0)/amounts.length>72);
});
