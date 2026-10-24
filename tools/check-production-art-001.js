#!/usr/bin/env node
/* Production Art 001 import gate.
 * This is a readiness check, NOT sprite generation or a substitute for Vesper's PNGs.
 * Run after unpacking ENSO_Production_Art_001_Vesper_WIP.zip.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'art/production-art-001');
const manifest = JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
const expected = {layers:52,atlases:7,openRaster:4};
if (manifest.current_frame.width !== 24 || manifest.current_frame.height !== 32 ||
    manifest.anchor.x !== 12 || manifest.anchor.y !== 30 ||
    manifest.facings.join(',') !== 'down,up,left,right' ||
    manifest.poses.join(',') !== 'stand,stepA,stepB') {
    throw new Error('Production Art 001 metadata no longer matches the approved 24x32 (12,30) contract.');
}
const walk = (dir) => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    return e.isDirectory()?walk(p):[p];
});
const all=walk(base).filter(x=>!x.endsWith('manifest.json'));
const png=all.filter(x=>x.toLowerCase().endsWith('.png'));
const ora=all.filter(x=>x.toLowerCase().endsWith('.ora'));
const counts={png:png.length,ora:ora.length};
if (counts.png < expected.layers+expected.atlases || counts.ora < expected.openRaster) {
    console.error('BLOCKED: Vesper binary artwork has not been imported.');
    console.error('Found '+counts.png+' PNG / '+counts.ora+' ORA; expected at least 59 PNG and 4 ORA.');
    console.error('Restore the actual files from ENSO_Production_Art_001_Vesper_WIP.zip before enabling production sprites.');
    process.exitCode=1;
} else {
    // PNG signature and IHDR dimensions ensure these are real frames, not text placeholders.
    for(const file of png){
        const buf=fs.readFileSync(file);
        if(buf.length<24 || buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw Error('Invalid PNG: '+file);
        const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);
        if(w%24 || h%32) throw Error('PNG not on 24x32 frame grid: '+file+' '+w+'x'+h);
    }
    console.log('Production Art 001 import inventory and PNG grid: PASS. Renderer registration and visual review still required.');
}
