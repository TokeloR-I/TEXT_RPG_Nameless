#!/usr/bin/env node
/* Offline original-enemy art review. No third-party art is loaded.
 * node tools/preview-enemies.js [out.html]
 * Open the HTML: eight directions, eight movement keys and held combat phases;
 * the live row can be paused, scrubbed, and shown at 1x or 2x.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/sprites/enso-enemies.js'), 'utf8');
const output = path.resolve(process.argv[2] || '/tmp/enso-enemies.html');
const html = `<!doctype html><meta charset="utf-8"><title>ENSO original enemy animation review</title>
<style>body{margin:24px;background:#25232c;color:#eee7d6;font:14px monospace}h1{font-size:22px}h2{font-size:16px;margin:26px 0 8px}p{max-width:1000px;line-height:1.5}canvas{image-rendering:pixelated;display:block}section{border-top:1px solid #655965;padding-top:6px}label{margin-right:20px}button,select,input{font:inherit}header{position:sticky;top:0;background:#25232c;padding:10px 0;z-index:2}.strip{overflow:auto}.small{color:#bcada9}</style>
<h1>ENSO · original 64 × 64 enemy art</h1><p>Eight authored facing views. Feet anchor (32, 54). Contact cells show the exact 64px frame at 2× nearest neighbour. Combat rows progress once from anticipation through strike and recovery. No gameplay data or collision sizes change.</p>
<header><button id="play">Pause</button> <label>Time <input id="time" type="range" min="0" max="1999" value="0"></label><label>Live scale <select id="scale"><option>1</option><option selected>2</option></select></label><label><input id="grey" type="checkbox"> Greyscale</label><label><input id="night" type="checkbox"> Night 25%</label></header>
<main></main><script>${source.replace(/<\/script/gi, '<\\/script')}</script><script>
const A=ENSO.enemySprites, main=document.querySelector('main'), live=[];
const directions=['N','NE','E','SE','S','SW','W','NW'];
function strip(parent,title,cells){const text=document.createElement('p');text.className='small';text.textContent=title;parent.append(text);const wrap=document.createElement('div');wrap.className='strip';parent.append(wrap);const c=document.createElement('canvas');c.width=cells.length*132;c.height=150;wrap.append(c);const g=c.getContext('2d');g.imageSmoothingEnabled=false;cells.forEach((o,i)=>{g.fillStyle=i%2?'#39333f':'#302c36';g.fillRect(i*132,0,132,132);g.save();g.translate(i*132+2,2);g.scale(2,2);A.draw(g,parent.dataset.key,o);g.restore();g.fillStyle='#d9cdbc';g.fillText(o.label||o.facing,i*132+8,145)});}
for(const key of A.keys){const s=document.createElement('section');s.dataset.key=key;const h=document.createElement('h2');h.textContent=key.replaceAll('_',' ');s.append(h);main.append(s);
strip(s,'DIRECTION · N / NE / E / SE / S / SW / W / NW',directions.map(facing=>({facing,state:'idle',now:0})));
strip(s,'GAIT · eight successive 85ms movement frames',Array.from({length:8},(_,i)=>({facing:'SE',state:'move',now:i*85,t:i*85,label:'move '+(i+1)})));
strip(s,'COMBAT · gather, hold, strike, follow through, recover (held phases)',[{state:'windup',p:0},{state:'windup',p:.5},{state:'windup',p:1},{state:'attack',p:0},{state:'attack',p:.5},{state:'attack',p:1},{state:'recover',p:.5},{state:'recover',p:1}].map(o=>({facing:'SE',state:o.state,t:o.p*600,now:0,attack:{progress:o.p,duration:600,skill:key==='crow_touched_warden'?'Halberd Sweep':null},label:o.state+' '+o.p})));
if(key==='crow_touched_warden')for(const skill of ['Halberd Sweep','Summon Crows','Chain Lock'])strip(s,skill+' · distinct anticipation and strike',Array.from({length:8},(_,i)=>({facing:'SE',state:i<4?'windup':'attack',now:0,t:(i%4)*100,attack:{skill,progress:(i%4)/3},label:(i<4?'windup ':'strike ')+(i%4+1)})));
const c=document.createElement('canvas');c.width=8*132;c.height=140;s.append(c);live.push({key,c});}
let playing=true,start=performance.now(),clock=0;document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play';start=performance.now()-clock};document.querySelector('#time').oninput=e=>{clock=+e.target.value;start=performance.now()-clock};
function frame(now){if(playing)clock=(now-start)%2000;document.querySelector('#time').value=clock;const scale=+document.querySelector('#scale').value;main.style.filter=(document.querySelector('#grey').checked?'grayscale(1) ':'')+(document.querySelector('#night').checked?'brightness(.25)':'');for(const {key,c}of live){const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);directions.forEach((facing,i)=>{g.save();g.translate(i*132+66-32*scale,110-54*scale);g.scale(scale,scale);let state='move',p=0;if(clock>=800&&clock<1300){state='windup';p=(clock-800)/500}else if(clock>=1300&&clock<1500){state='attack';p=(clock-1300)/200}else if(clock>=1500){state='recover';p=(clock-1500)/500}A.draw(g,key,{facing,state,t:p*500,now:clock,attack:{progress:p,skill:key==='crow_touched_warden'?'Halberd Sweep':null}});g.restore()})}requestAnimationFrame(frame)}requestAnimationFrame(frame);
</script>`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
