const {test,assert,data}=require('./helpers');
const {runRoute}=require('../tools/lib/chapter-one-loot-route');
// Q05's strongbox looters (Tokelo, 2026-11-02) add a fifth required fight: about +20 Gold and +40 XP before the Warden.
test('LOOT-01: 200 seeded mandatory routes collect >=80 Gold and exactly 290 pre-Warden XP',()=>{
    const classes=Object.keys(data.basePlayerClasses), amounts=[];
    for(let seed=1;seed<=200;seed++) {
        const result=runRoute({cls:classes[(seed-1)%classes.length],seed,forced:true,buy:false,stopBeforeBoss:true});
        assert.strictEqual(result.where,null);
        assert.ok(result.preWardenGold>=80&&result.preWardenGold<=110,`${seed}: ${result.preWardenGold}`);
        assert.strictEqual(result.totalXp,290);
        assert.strictEqual(result.g.player.level,3);
        assert.strictEqual(result.g.data.constructionDefinitions.homestead_gate.goldCost,0);
        amounts.push(result.preWardenGold);
    }
    assert.ok(amounts.reduce((a,b)=>a+b,0)/amounts.length>90);
});
