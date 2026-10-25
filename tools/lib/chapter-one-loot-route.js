/* Reproducible QA route. Forced victory mode measures accounting, never combat balance. */
const {GameEngine} = require('../../src/engine');
const data = require('../../src/data');
const {WorldSession} = require('../../src/world/world');
const world = require('../../src/world/zone1');
const H = require('../../tests/world-helpers');
const {choose} = require('../../qa/scripts/smartbot');
function runRoute({cls='warrior',seed=1,branch=0,forced=false,buy=true,equipment=true,stopBeforeBoss=false}={}) {
    const g=new GameEngine({seed});g.start();
    if(!equipment) g.equipStarters=()=>{};
    g.input(cls);
    g.act({type:'enter_world'});
    const s=new WorldSession(world,{engine:g}), result={cls,seed,branch,won:false,where:null,bought:0};
    if(forced) g.player.hp=g.player.maxHp=99999;
    const say=re=>{
        const c=g.getAvailableActions().actions.find(a=>a.type==='dialogue_choice'&&re.test(a.text));
        if(!c) throw new Error(`No choice ${re}`);
        const r=g.act({type:'dialogue_choice',choiceId:c.choiceId});if(!r.ok)throw new Error(r.error.message);
    };
    const bye=()=>g.act({type:'dialogue_leave'});
    const autoEquip=()=>{
        if(!equipment)return;
        for(const row of Object.values(g.getEquipment().slots)) {
            const options=row.candidates.filter(c=>c.enabled);
            options.sort((a,b)=>score(b.diff)-score(a.diff));
            if(options[0]&&score(options[0].diff)>0)g.act({type:'equip',item:options[0].item});
        }
    };
    const score=d=>(d.physicalDamage||0)+(d.magicDamage||0)+(d.def||0)*1.5+(d.maxHp||0)*.1+(d.intelligence||0)*.25+(d.strength||0)*.25+(d.critChance||0)*5;
    const fight=id=>{
        const encounter=H.contact(s,id);if(encounter.type!=='encounter')throw new Error(`No encounter ${id}`);
        for(let i=0;i<400&&g.mode==='combat';i++) {
            if(forced)for(const e of g.combat.enemies)if(e.hp>1)e.hp=1;
            const a=g.getAvailableActions();
            if(a.awaiting==='turn_order')g.act({type:'turn_order',order:null});
            else if(a.awaiting==='continue')g.act({type:'continue'});
            else g.input(forced?'attack 1':choose(g));
        }
        if(g.world.lastResult!=='victory'){result.where=id;return false;}
        s.fightOver(id,'victory');autoEquip();return true;
    };
    H.inspect(s,'cellar_old_purse');H.inspect(s,'cellar_inscription');H.travel(s,'house');
    H.travel(s,'grounds');H.inspect(s,'grounds_foundation');H.travel(s,'road');H.travel(s,'tollway');
    H.inspect(s,'tollway_elian');say(/going on to the village/);say(/Goodbye/);
    if(!fight('tollway_ragpickers')||!fight('tollway_root_chewers'))return {...result,g,s};
    H.takeExit(s,'tollway_south');H.inspect(s,'village_tamsin');bye();
    H.inspect(s,'village_mara');say(/carry supplies/);bye();H.inspect(s,'village_tamsin');say(/Mara sent/);bye();
    H.inspect(s,'village_captain');bye();H.travel(s,'tollway');H.inspect(s,'tollway_register');H.travel(s,'shamefield');
    H.inspect(s,'village_captain');say(/Here it is/);bye();
    if(buy) {
        H.inspect(s,'village_iona');say(/What have you got/);
        for(const item of ['Healing Herb Bundle','Bandages']) while(g.act({type:'buy',shopId:'iona',item}).ok)result.bought++;
        bye();
    }
    H.travel(s,'orchard');if(!fight('orchard_cultists'))return {...result,g,s};
    H.takeExit(s,'orchard_north');if(!fight('featherwatch_ghoul'))return {...result,g,s};
    H.takeExit(s,'featherwatch_north');H.inspect(s,'sanctuary_journal');H.inspect(s,'sanctuary_warden_npc');
    result.preWardenGold=g.player.gold;
    result.totalXp=250; // caller verifies the actual level/xp below
    let xp=g.player.xp,need=100;for(let level=1;level<g.player.level;level++){xp+=need;need=Math.floor(need*1.5);}result.totalXp=xp;
    if(stopBeforeBoss)return {...result,g,s};
    say(/What is behind it/);say(/I'll go/);
    if(g.mode==='branch_select')g.act({type:'choose_branch',branchId:Object.keys(data.evolutionPaths[cls].branches)[branch]});
    autoEquip();H.inspect(s,'sanctuary_warden_npc');say(/Stand aside/);say(/Draw your weapon/);
    result.won=fight('sanctuary_warden');
    result.errors=g.errors.map(e=>e.message);
    return {...result,g,s};
}
module.exports={runRoute};
