const {test,assert}=require('./helpers.js');
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const mod=require('vm');
test('Base player: original unarmed atlases use 64px cells with four facing rows',()=>{
 const spec=[
 ['Idle',12],['Walk',6],['Run',8],['Hurt',5],['Death',7]
 ];
 for(const [anim,count] of spec){
   const file=path.join(root,'assets/basesprite/PNG/Unarmed/Without_shadow/Unarmed_'+anim+'_without_shadow.png');
   const b=fs.readFileSync(file);
   assert.strictEqual(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.strictEqual(b.readUInt32BE(16),count*64,anim+' width');
   assert.strictEqual(b.readUInt32BE(20),4*64,anim+' 4 facing rows');
 }
});
test('Base player: sprite registration is loaded before renderer; both use same entry',()=>{
 const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
 assert.ok(html.indexOf('base-player-unarmed.js')<html.indexOf('ui/sprites.js'));
 const src=fs.readFileSync(path.join(root,'ui/sprites.js'),'utf8');
 assert.match(src,/ENSO\.basePlayerSprite\.draw\(g, x, y, opts, time\)/);
 const art=fs.readFileSync(path.join(root,'assets/sprites/base-player-unarmed.js'),'utf8');
 assert.match(art,/ENSO\.basePlayerSprite =/);
 assert.match(art,/imageSmoothingEnabled = false/);
});
test('Base player: bundler references all five art atlases and embeds them',()=>{
 const build=fs.readFileSync(path.join(root,'tools/build-single.js'),'utf8');
 assert.match(build,/\['Idle', 'Walk', 'Run', 'Hurt', 'Death'\]/);
 assert.match(build,/baseSpriteData/);
});
