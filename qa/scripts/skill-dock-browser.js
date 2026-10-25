// Optional local Playwright QA. ENSO_BASE_URL=<served repo root> node qa/scripts/skill-dock-browser.js [captures] [--baseline]
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=process.env.ENSO_BASE_URL||'http://127.0.0.1:8876/enso-skill-icons';
const baseline=process.argv.includes('--baseline');
const output=path.resolve(process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:'qa/results/skill-ui');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try{
  for(const[device,width,height]of[['desktop',1920,1080],['phone',390,844]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`${base}/world.html?seed=170`);
   await page.waitForFunction(()=>window.ensoDebug);
   await page.evaluate(()=>{
    ensoDebug.start('necromancer','Playtester');enso.addExperience(100,{quiet:true});
    enso.story.quests.Q05={state:'active',step:1};ensoDebug.goto('tollway','from_road');
    const o=ensoWorld.map.interactables.find(o=>o.id==='tollway_register');
    for(const[dx,dy,f]of[[0,1,'up'],[0,-1,'down'],[1,0,'left'],[-1,0,'right']])if(!ensoWorld.isBlocked(o.x+dx,o.y+dy)){ensoWorld.x=o.x+dx;ensoWorld.y=o.y+dy;ensoWorld.facing=f;break;}
    ensoDebug.sim().enterMap();
   });
   await page.waitForTimeout(200);
   const dock=await page.locator('.ahud-skills').boundingBox();
   const slots=await page.locator('.ahud-slot[role="button"]').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).map(n=>({label:n.getAttribute('aria-label'),svg:n.querySelector('.skill-icon svg')?.outerHTML||null,width:n.getBoundingClientRect().width,text:n.textContent})));
   if(!baseline){
    assert.equal(slots.length,4,`${device}: necromancer basic plus three equipped skills`);
    assert.ok(slots.every(s=>s.svg&&!/<text[ >]/i.test(s.svg)),`${device}: real pictograms, not text artwork`);
    assert.equal(new Set(slots.map(s=>s.svg.replace(/data-icon="[^"]*"/g,''))).size,4,`${device}: distinct necromancer artwork`);
    assert.ok(slots.every(s=>s.width>=32&&s.width<=53),`${device}: compact, usable button sizes`);
    assert.ok(dock.height<=80,`${device}: compact dock height`);
   }
   await page.screenshot({path:path.join(output,`${baseline?'before':'after'}-${device}-skills.png`)});
   await page.keyboard.press('e');
   await page.waitForFunction(()=>ensoDebug.state().modal==='dialog');
   await page.waitForTimeout(100);
   assert.ok((await page.locator('#dialog').textContent()).includes('strongbox wedged'));
   const blocked=await page.locator('.ahud').evaluate(el=>({hidden:el.hidden,inert:el.inert,aria:el.getAttribute('aria-hidden')}));
   if(!baseline){assert.equal(await page.locator('.ahud-skills').isVisible(),false);assert.equal(blocked.inert,true);assert.equal(blocked.aria,'true');}
   const resource=await page.evaluate(()=>enso.player.resource.current);
   await page.keyboard.press('2');await page.waitForTimeout(150);
   assert.equal(await page.evaluate(()=>enso.player.resource.current),resource,`${device}: modal blocks skill hotkeys`);
   await page.screenshot({path:path.join(output,`${baseline?'before':'after'}-${device}-dialogue.png`)});
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>ensoDebug.state().modal===null);
   await page.waitForTimeout(100);
   assert.equal(await page.locator('.ahud-skills').isVisible(),true,`${device}: dock restored after close`);
   if(!baseline){
    const first=page.locator('.ahud-slot[role="button"]').first();
    await first.hover();
    await page.waitForFunction(()=>!document.querySelector('.ahud-skill-tooltip').hidden);
    const tip=page.locator('.ahud-skill-tooltip');
    assert.ok((await tip.textContent()).includes('Basic Attack'));
    const box=await tip.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width,`${device}: tooltip stays on screen`);
    await page.screenshot({path:path.join(output,`after-${device}-tooltip.png`)});
    await page.keyboard.press('Escape');await page.waitForTimeout(50);
    assert.equal(await page.locator('.ahud').isVisible(),false,`${device}: menu also hides dock`);
    await page.keyboard.press('Escape');await page.waitForTimeout(50);
    assert.equal(await page.locator('.ahud-skills').isVisible(),true,`${device}: menu close restores dock`);
    assert.deepStrictEqual(errors,[]);
   }
   results.push({device,dock,slots:slots.map(s=>({...s,svg:s.svg?'pictogram':null})),blocked,errors});
   await page.close();
  }
  fs.writeFileSync(path.join(output,`${baseline?'before':'after'}-results.json`),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
