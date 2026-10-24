const {test,assert}=require('./helpers.js');
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const file=(p)=>fs.readFileSync(path.join(root,p),'utf8');
test('Regression #151: only protagonist draws imported naked body; NPCs and thumbnails keep layering',()=>{
 const context={ENSO:{spriteManifest:{player:{}}},Image:class{constructor(){this.complete=true;this.naturalWidth=768}set src(s){this._src=s}},console};
 context.globalThis=context;vm.createContext(context);
 vm.runInContext(file('assets/sprites/base-player-unarmed.js'),context);
 const calls=[],g={imageSmoothingEnabled:true,drawImage(...args){calls.push(args)}};
 const art=context.ENSO.basePlayerSprite;
 assert.strictEqual(art.draw(g,32,32,{className:'warrior',facing:'down'},0),false,'ordinary NPC/no flag');
 assert.strictEqual(art.draw(g,32,32,{basePlayer:true,character:{}},0),false,'other manifest');
 assert.strictEqual(calls.length,0,'must not draw naked body for non-player');
 assert.strictEqual(art.draw(g,32,32,{basePlayer:true,character:context.ENSO.spriteManifest.player,facing:'down'},0),true);
 assert.strictEqual(calls.length,1);
 assert.strictEqual(g.imageSmoothingEnabled,true);
});
test('Regression #151: world player and main creator opt-in; villagers and cosmetic thumbnails do not',()=>{
 const render=file('ui/world-render.js'),ui=file('ui/world-ui.js');
 assert.match(render,/basePlayer: true, facing: view\.facing/);
 assert.match(ui,/anim: 'idle', scale: 5, basePlayer: true/);
 const npc=render.slice(render.indexOf('ENSO.sprites.drawCharacter(g, cx, base'));
 assert.ok(!npc.split('}, t + seed * 37)')[0].includes('basePlayer: true'),'villagers must not get naked base');
 const thumbs=ui.slice(ui.indexOf('tile.dataset.stylePreview'));
 assert.ok(!thumbs.split('}, 0);')[0].includes('basePlayer: true'),'hairstyle swatches must keep their layers');
});
