const {test,assert,data}=require('./helpers');
const {runRoute}=require('../tools/lib/chapter-one-loot-route');
// Q05's strongbox looters (Tokelo, 2026-11-02) add a fifth required fight: about +20 Gold and +40 XP before the Warden.
// The road to the Warden (Tokelo, 2026-11-04) adds four more groups: +208 XP (level 4) and about +70 Gold from the cultists.
// The Captain's gate (Tokelo, 2026-11-04) made the six Shamefield favours required: +165 XP (still level 4), about +25 Gold.
// The Broken Crown rework (2026-11-11) makes them optional again; the story route north (C1-N02, C1-N04) adds 45 XP
// and no Gold (Gauge to decide any quest Gold), so the Gold band is back to the one before the favours.
// The rest of the master brief (2026-11-11) adds the festival raid, Sergeant Kess and the sanctuary siege (+168 XP,
// still level 4) and the festival's 10 Gold: measured 223 to 269 Gold, average 248 (candidate band for Gauge).
test('LOOT-01: 200 seeded mandatory routes collect >=210 Gold and exactly 746 pre-Warden XP',()=>{
    const classes=Object.keys(data.basePlayerClasses), amounts=[];
    for(let seed=1;seed<=200;seed++) {
        const result=runRoute({cls:classes[(seed-1)%classes.length],seed,forced:true,buy:false,stopBeforeBoss:true});
        assert.strictEqual(result.where,null);
        assert.ok(result.preWardenGold>=210&&result.preWardenGold<=290,`${seed}: ${result.preWardenGold}`);
        assert.strictEqual(result.totalXp,746);
        assert.strictEqual(result.g.player.level,4);
        assert.strictEqual(result.g.data.constructionDefinitions.homestead_gate.goldCost,0);
        amounts.push(result.preWardenGold);
    }
    assert.ok(amounts.reduce((a,b)=>a+b,0)/amounts.length>230);
});
