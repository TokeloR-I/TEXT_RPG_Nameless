// Optional browser smoke test. Requires Playwright and a local HTTP server; no runtime game dependency.
const {chromium}=require('playwright');
const assert=require('assert'),fs=require('fs'),path=require('path');
const output=path.resolve(process.argv[2]||'qa/results/loot-browser');fs.mkdirSync(output,{recursive:true});
const base=process.env.ENSO_BASE_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  for(const [label,width,height] of [['desktop',1280,900],['phone',390,844]]) {
   const page=await browser.newPage({viewport:{width,height}}), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`${base}/world.html?seed=170`);
   await page.waitForFunction(()=>window.ensoDebug);
   await page.evaluate(()=>{
    ensoDebug.start('warrior');ensoDebug.goto('shamefield','from_tollway');
    enso.player.gold=100;enso.player.inventory.push('Scrap Metal','Scrap Metal','Bone Fragment');
    const item=enso.generateEquipment('Wooden Staff',4,'rare','browser:staff',['focused','arcanist']);
    enso.player.itemInstances['Rare Wooden Staff [browser:staff]']=item;enso.player.inventory.push('Rare Wooden Staff [browser:staff]');
    const o=ensoWorld.map.interactables.find(o=>o.id==='village_mara');
    for(const [dx,dy,facing] of [[0,1,'up'],[0,-1,'down'],[1,0,'left'],[-1,0,'right']]) {
     if(!ensoWorld.isBlocked(o.x+dx,o.y+dy)){ensoWorld.x=o.x+dx;ensoWorld.y=o.y+dy;ensoWorld.facing=facing;break;}
    }
   });
   await page.keyboard.press('e');
   await page.locator('#dialog .menu li').filter({hasText:'What have you got?'}).click();
   await page.locator('#dialog .menu li').filter({hasText:'Padded Jerkin'}).click();
   assert.equal(await page.evaluate(()=>enso.player.gold),88);
   await page.screenshot({path:path.join(output,`loot-shop-${label}.png`)});
   await page.locator('#dialog .menu li').filter({hasText:'Sell from bag'}).click();
   await page.locator('#dialog .menu li').filter({hasText:'Scrap Metal'}).click();
   assert.equal(await page.evaluate(()=>enso.player.gold),91);
   assert.equal(await page.evaluate(()=>enso.player.inventory.filter(i=>i==='Scrap Metal').length),1);
   await page.locator('#dialog .menu li').filter({hasText:'Rare Wooden Staff'}).click();
   assert.ok((await page.evaluate(()=>enso.player.gold))>91);
   await page.screenshot({path:path.join(output,`loot-selling-${label}.png`)});
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>ensoDebug.state().modal),'talk');
   await page.keyboard.press('Escape');await page.keyboard.press('Escape');
   await page.locator('[data-id="equipment"]').click();
   await page.screenshot({path:path.join(output,`loot-equipment-${label}.png`)});
   assert.deepStrictEqual(errors,[]);
   console.log(`${label}: purchase, material sale, incompatible gear sale, Escape and equipment UI passed`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
