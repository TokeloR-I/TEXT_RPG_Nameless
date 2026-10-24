// Black Flight transparent atlas wiring stays aligned with Sable's authored metadata.
const {test,assert}=require('./helpers.js');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'ui/world-ui.js'),'utf8');
const bundler=fs.readFileSync(path.join(root,'tools/build-single.js'),'utf8');
const meta=require('../assets/vfx/nahemoth/black-flight.json');
const atlas=fs.readFileSync(path.join(root,'assets/vfx/nahemoth/black-flight-atlas.svg'),'utf8');
test('VFX: Black Flight uses all 12 authored 96px transparent frames',()=>{
 assert.strictEqual(meta.frame.count,12);
 assert.strictEqual(meta.frame.width,96);
 assert.strictEqual(meta.frame.height,96);
 assert.strictEqual(meta.durationMs.reduce((a,b)=>a+b,0),760);
 assert.match(atlas,/<svg/);
 assert.match(source,/BLACK_FLIGHT_ATLAS = 'assets\/vfx\/nahemoth\/black-flight-atlas.svg'/);
 assert.match(source,/frame \* 96, 0, 96, 96/);
 assert.match(source,/frame === 6/);
 assert.match(source,/if \(REDUCED\) \{ fn\(\); return; \}/);
});
test('VFX: offline world bundler inlines the source atlas',()=>{
 assert.match(bundler,/fs\.readFileSync\(path\.join\(root, atlasPath\)\)\.toString\('base64'\)/);
 assert.match(bundler,/html = html\.replace\(atlasPath, atlasData\)/);
});
