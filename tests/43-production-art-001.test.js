const {test,assert}=require('./helpers.js');
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
test('Production Art 001 manifest retains 24x32 frame and foot anchor',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'art/production-art-001/manifest.json'),'utf8'));
 assert.deepStrictEqual(m.current_frame,{width:24,height:32});
 assert.deepStrictEqual(m.anchor,{x:12,y:30});
 assert.deepStrictEqual(m.facings,['down','up','left','right']);
 assert.deepStrictEqual(m.poses,['stand','stepA','stepB']);
});
test('Production Art 001 never silently registers absent binary sprites',()=>{
 const s=fs.readFileSync(path.join(root,'world.html'),'utf8');
 assert.ok(!s.includes('vesper-production-art-001.js'),'do not register phantom production artwork');
 const gate=fs.readFileSync(path.join(root,'tools/check-production-art-001.js'),'utf8');
 assert.match(gate,/BLOCKED: Vesper binary artwork has not been imported/);
 assert.match(gate,/89504e470d0a1a0a/);
});
