const {test,assert,data}=require('./helpers');
const {runRoute}=require('../tools/lib/chapter-one-loot-route');
// Q05's strongbox looters (Tokelo, 2026-11-02) add a fifth required fight: about +20 Gold and +40 XP before the Warden.
// The road to the Warden (Tokelo, 2026-11-04) adds four more groups: +208 XP (level 4) and about +70 Gold from the cultists.
// The Captain's gate (Tokelo, 2026-11-04) makes the six Shamefield favours required: +165 XP (still level 4), about +25 Gold.
test('LOOT-01: 200 seeded mandatory routes collect >=165 Gold and exactly 663 pre-Warden XP',()=>{
    const classes=Object.keys(data.basePlayerClasses), amounts=[];
    for(let seed=1;seed<=200;seed++) {
        const result=runRoute({cls:classes[(seed-1)%classes.length],seed,forced:true,buy:false,stopBeforeBoss:true});
        assert.strictEqual(result.where,null);
        assert.ok(result.preWardenGold>=165&&result.preWardenGold<=225,`${seed}: ${result.preWardenGold}`);
        assert.strictEqual(result.totalXp,663);
        assert.strictEqual(result.g.player.level,4);
        assert.strictEqual(result.g.data.constructionDefinitions.homestead_gate.goldCost,0);
        amounts.push(result.preWardenGold);
    }
    assert.ok(amounts.reduce((a,b)=>a+b,0)/amounts.length>175);
});
