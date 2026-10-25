/* Issues #169–170 acceptance measurements; no game data tuning. node tools/loot-acceptance.js [seeds=200] [output.json] */
const fs=require('fs');
const data=require('../src/data');
const {runRoute}=require('./lib/chapter-one-loot-route');
const n=Number(process.argv[2]||200), output=process.argv[3];
const results={seeds:n,accounting:{},survival:[],limitations:[
    'Accounting uses forced victories to isolate rewards and XP; it is not a combat win-rate test.',
    'Survival uses the existing smart bot, mandatory route only, no forced HP, purchases at Iona, and automatic positive-score equipment choices.',
    'Both survival arms use the new economy and identical seeds. The control omits equipment; the combined arm equips starters and eligible drops. No player base stats were changed.',
    'Historical QA #12 Warden reference (Warrior 55%, Mage 15%, Rogue 28%, Necromancer 0%) used a different economy/route; these observations are not a reproduction or a balance sign-off.',
    'Same seed pairs are reproducible, but damage and loot consume a different RNG sequence when fights differ.'
]};
const gold=[];
for(let seed=1;seed<=n;seed++) {
    const r=runRoute({seed,cls:Object.keys(data.basePlayerClasses)[(seed-1)%4],forced:true,buy:false,stopBeforeBoss:true});
    if(r.where||r.totalXp!==250||r.preWardenGold<65)throw new Error(`Accounting failed at seed ${seed}`);
    gold.push(r.preWardenGold);
}
gold.sort((a,b)=>a-b);
results.accounting={routes:n,min:gold[0],mean:gold.reduce((a,b)=>a+b,0)/n,p10:gold[Math.floor(n*.1)],max:gold[gold.length-1],preWardenXp:250,gateGold:0,gateMaterials:0};
console.log('Accounting:',JSON.stringify(results.accounting));
for(const cls of Object.keys(data.basePlayerClasses))for(let branch=0;branch<3;branch++)for(const equipment of [false,true]) {
    const row={cls,branch:Object.keys(data.evolutionPaths[cls].branches)[branch],equipment,seeds:n,reachedWarden:0,won:0,deaths:{},errors:[],bought:0};
    for(let seed=1;seed<=n;seed++) {
        try {
            const r=runRoute({seed,cls,branch,equipment,buy:true});
            if(r.preWardenGold!==undefined)row.reachedWarden++;
            if(r.won)row.won++;
            else row.deaths[r.where||'unknown']=(row.deaths[r.where||'unknown']||0)+1;
            row.bought+=r.bought;
            if(r.g.errors.length)throw new Error(r.g.errors.map(e=>e.message).join('; '));
        }catch(err){row.errors.push({seed,error:err.message});}
    }
    row.winRate=row.won/n;
    results.survival.push(row);console.log(JSON.stringify(row));
    if(output)fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');
}
if(results.survival.some(r=>r.errors.length))process.exitCode=1;
