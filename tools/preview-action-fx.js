#!/usr/bin/env node
/* Frame strip of the attack VFX (ui/action-fx.js) as a PNG, for art review: rows hit, crit hit, warrior swing.
 *   node tools/preview-action-fx.js out.png */
const repo=require('path').join(__dirname,'..'); const AFX=require(repo+'/ui/action-fx.js'); const {encode}=require(repo+'/tools/lib/png.js'); const fs=require('fs');
const CW=56, CH=56, S=5, steps=[0.05,0.15,0.3,0.45,0.6,0.8];
const rows=3, W=CW*steps.length*S, H=CH*rows*S, data=Buffer.alloc(W*H*4);
for(let i=0;i<W*H;i++){data[i*4]=0x3a;data[i*4+1]=0x38;data[i*4+2]=0x48;data[i*4+3]=255;}
function ctx(ox,oy){ const g={fillStyle:'#fff',globalAlpha:1,save(){},restore(){},
  fillRect(x,y,w,h){const n=parseInt(String(this.fillStyle).slice(1,7),16); for(let j=0;j<h;j++)for(let i=0;i<w;i++){const X=Math.round(x+i),Y=Math.round(y+j); if(X<0||Y<0||X>=CW||Y>=CH)continue; for(let b=0;b<S;b++)for(let a=0;a<S;a++){const o=(((oy+Y)*S+b)*W+(ox+X)*S+a)*4; data[o]=n>>16;data[o+1]=(n>>8)&255;data[o+2]=n&255;}}}}; return g;}
steps.forEach((t,i)=>{
  const fx=AFX.createFx(); fx.spawn('hit',{x:28,y:28,angle:0.3,damageType:'physical'},0); fx.draw(ctx(i*CW,0),t*AFX.LIFE.hit);
  const fx2=AFX.createFx(); fx2.spawn('hit',{x:28,y:28,angle:0.3,damageType:'physical',crit:true},0); fx2.draw(ctx(i*CW,CH),t*AFX.LIFE.hit);
  AFX.swing(ctx(i*CW,2*CH),{x:28,y:30,angle:0,arc:Math.PI*0.8,reach:20,progress:t,cls:'warrior'});
});
fs.writeFileSync(process.argv[2]||'action-fx.png',encode({w:W,h:H,data})); console.log('ok');
