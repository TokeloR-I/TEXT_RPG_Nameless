/* ENSO original enemy art. Authored pixel geometry, no image inputs or third-party references.
 * Reproducible source and runtime asset in one file. 64x64, anchor (32,54).
 * Anatomy is projected per compass direction, never a rotated flat picture. Eight gait keys,
 * four breathing keys and eight combat keys articulate limbs, heads, tails and equipment.
 * Copyright ENSO project (Tokelo), repository licence. */
(function (global) {
    'use strict';
    const ENSO = global.ENSO || (global.ENSO = {});
    const facings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const keys = ['James_Newton', 'weak_goblin', 'hungry_wolf', 'shackled_ghoul', 'rust_rat', 'cellar_vermin', 'drunken_shade', 'bone_gnawer', 'mire_lurker', 'cult_acolyte', 'shackled_ghoul_stronger', 'watch_constable', 'crow_touched_warden'];
    // Independently authored material ramps, darkest outline first, warm top-left lighting.
    const M = {
        fur: ['#221e29','#4b3940','#795345','#a37658','#d6ad7a'],
        wolf: ['#191d29','#353744','#555861','#81858b','#bec1b8'],
        skin: ['#202a25','#3d513a','#647c4d','#94a765','#c6ce8a'],
        ghoul: ['#22232c','#444551','#74766c','#a5ac8c','#d6d8ad'],
        bone: ['#35313a','#6a625a','#a79a7b','#d0c5a1','#f1e7c9'],
        cloth: ['#1c1929','#332740','#513a56','#79566f','#aa7a88'],
        watch: ['#171f30','#2b3c55','#465d78','#758ba0','#abb5bc'],
        feather: ['#141522','#262738','#3f4054','#616278','#9294a4'],
        metal: ['#202634','#43505c','#6e818b','#a8b9bc','#e0e5d7'],
        rust: ['#30212a','#624033','#9b6342','#c49159','#e2bb7c'],
        slime: ['#1b2a2a','#2b4740','#426c53','#73a46a','#b9cd8d'],
        shade: ['#201b31','#342a4a','#514366','#76688c','#aaa0bd'],
        leather: ['#251e27','#44302e','#74503e','#a47a53','#c9a876']
    };
    const config = {
        James_Newton: {kind:'knight', body:'metal', coat:'cloth', tall:39, wide:8},
        weak_goblin: {kind:'goblin', body:'skin', coat:'leather', tall:29, wide:7},
        hungry_wolf: {kind:'wolf', body:'wolf'},
        shackled_ghoul: {kind:'ghoul', body:'ghoul', coat:'leather', tall:34, wide:7},
        rust_rat: {kind:'rat', body:'fur'}, cellar_vermin: {kind:'rat', body:'wolf', large:true},
        drunken_shade: {kind:'shade', body:'shade', tall:37, wide:9},
        bone_gnawer: {kind:'gnawer', body:'bone'}, mire_lurker: {kind:'mire', body:'slime'},
        cult_acolyte: {kind:'cult', body:'bone', coat:'cloth', tall:36, wide:8},
        shackled_ghoul_stronger: {kind:'ghoul', body:'ghoul', coat:'cloth', tall:38, wide:9, scar:true},
        watch_constable: {kind:'watch', body:'metal', coat:'watch', tall:37, wide:8},
        crow_touched_warden: {kind:'warden', body:'metal', coat:'feather', tall:41, wide:11}
    };
    const aliases = {up:'N',right:'E',down:'S',left:'W',north:'N',northeast:'NE',east:'E',southeast:'SE',south:'S',southwest:'SW',west:'W',northwest:'NW'};
    function direction(o) {
        if (Number.isFinite(o.angle)) return (Math.round(o.angle / (Math.PI / 4)) + 2 + 80) % 8;
        const f = aliases[o.facing] || String(o.facing || 'S').toUpperCase();
        return Math.max(0, facings.indexOf(f));
    }
    function pose(o) {
        let state = o.state || 'idle';
        if (state === 'chase' || state === 'return' || state === 'walk') state = 'move';
        if (state === 'active') state = 'attack';
        if (state === 'stunned') state = 'stagger';
        const t = Math.max(0, o.t || 0), now = Math.max(0, o.now || 0);
        let n = state === 'move' ? Math.floor(now / 85) % 8 : Math.floor(now / 200) % 4;
        if (state === 'windup') n = Math.min(3, Math.floor(t / 100));
        if (state === 'attack') n = Math.min(3, Math.floor(t / 55));
        if (state === 'recover') n = Math.min(3, Math.floor(t / 75));
        if (state === 'hurt' || state === 'stagger') n = Math.min(1, Math.floor(t / 100));
        if (state === 'dead') n = Math.min(3, Math.floor(t / 130));
        const progress = o.attack && o.attack.progress != null ? o.attack.progress : o.progress;
        if (Number.isFinite(progress) && ['windup','attack','recover'].includes(state)) n = Math.min(3, Math.floor(Math.max(0, Math.min(1, progress)) * 4));
        return {state, n};
    }
    function pixels(key, dir, p, attack) {
        const c = config[key], out = new Uint8ClampedArray(64 * 64 * 4);
        const a = (dir - 2) * Math.PI / 4, fx = Math.cos(a), fy = Math.sin(a), sx = -fy, sy = fx;
        const front = fy > -0.45, phase = p.n * Math.PI / 4;
        const walk = p.state === 'move', stride = walk ? Math.sin(phase) : 0;
        const wind = p.state === 'windup', strike = p.state === 'attack', recovery = p.state === 'recover';
        const power = wind ? -(0.5 + p.n * 0.16) : strike ? [0.45,1,0.85,0.55][p.n] : recovery ? 0.4 * (1-p.n/3) : 0;
        const hurt = p.state === 'hurt' || p.state === 'stagger';
        const dead = p.state === 'dead' ? p.n / 3 : 0;
        const bob = walk ? -Math.abs(Math.sin(phase * 2)) : Math.sin(p.n * Math.PI / 2) * 0.5;
        const lean = power * 4 - (hurt ? 2 : 0);
        // lateral, forward and height are world-aligned anatomy, projected before rasterisation.
        function pt(l, f, z) {
            const zz = z * (1-dead*0.78);
            f *= 1-dead*0.28;
            return [32 + sx*l + fx*(f+lean*(z/35)) + dead*z*0.10, 53 + sy*l*0.40 + fy*(f+lean*(z/35))*0.48 - zz + bob];
        }
        function dot(x,y,color) {
            x=Math.round(x);y=Math.round(y); if(x<0||y<0||x>63||y>63)return;
            const i=(y*64+x)*4;out[i]=parseInt(color.slice(1,3),16);out[i+1]=parseInt(color.slice(3,5),16);out[i+2]=parseInt(color.slice(5,7),16);out[i+3]=255;
        }
        function ellipse2(x,y,rx,ry,mat,detail=0) {
            const ramp=M[mat] || M.bone;
            for(let yy=Math.floor(y-ry-1);yy<=y+ry+1;yy++)for(let xx=Math.floor(x-rx-1);xx<=x+rx+1;xx++){
                const dx=(xx-x)/rx,dy=(yy-y)/ry,d=dx*dx+dy*dy;
                if(d>1)continue;
                const light=-dx*0.38-dy*0.52+Math.sqrt(Math.max(0,1-d))*0.25;
                let v=d>0.78?0:light>0.54?4:light>0.15?3:light>-.35?2:1;
                if(detail && d<0.7 && ((xx*7+yy*11+detail)%19===0))v=Math.max(1,v-1);
                dot(xx,yy,ramp[v]);
            }
        }
        function ell(l,f,z,rx,ry,mat,detail) {const q=pt(l,f,z);ellipse2(q[0],q[1],rx,ry,mat,detail);}
        function line2(a,b,r,mat){const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*1.5));for(let i=0;i<=n;i++)ellipse2(a[0]+dx*i/n,a[1]+dy*i/n,r,r,mat);}
        function limb(a,b,r,mat){line2(pt(...a),pt(...b),r,mat);}
        function poly(points,mat){
            const q=points.map(v=>pt(...v)),r=M[mat]||M.metal;
            const ymin=Math.max(0,Math.floor(Math.min(...q.map(v=>v[1])))), ymax=Math.min(63,Math.ceil(Math.max(...q.map(v=>v[1]))));
            for(let y=ymin;y<=ymax;y++){const xs=[];for(let i=0,j=q.length-1;i<q.length;j=i++)if((q[i][1]>y)!==(q[j][1]>y))xs.push(q[i][0]+(y-q[i][1])*(q[j][0]-q[i][0])/(q[j][1]-q[i][1]));xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)for(let x=Math.ceil(xs[i]);x<=xs[i+1];x++)dot(x,y,r[x<xs[i]+1||x>xs[i+1]-1?0:x<(xs[i]+xs[i+1])/2?3:2]);}
            for(let i=0;i<q.length;i++)line2(q[i],q[(i+1)%q.length],0.65,mat);
        }
        function eye(l,f,z){const q=pt(l,f,z);dot(q[0],q[1],'#161723');dot(q[0]+1,q[1],'#c6ce8a');}
        function claws(l,f,z){for(let j=-1;j<=1;j++)limb([l+j*1.4,f,z],[l+j*1.7,f+3,z-1],0.65,'bone');}
        const beast = ['rat','wolf','gnawer','mire'].includes(c.kind);
        if(beast){
            const wolf=c.kind==='wolf', bone=c.kind==='gnawer', mire=c.kind==='mire';
            const length=wolf?13:mire?10:9, width=wolf?7:mire?12:c.large?8:6;
            const height=wolf?14:mire?12:8;
            // Tail is segmented, trails opposite travel and curls with the gait.
            if(!mire){let last=[0,-length+2,height-2];for(let i=1;i<=7;i++){const next=[Math.sin(i*.6+phase)*2,-length-i*2,height-2-i*.45];limb(last,next,wolf?2.1:0.9,wolf?'wolf':bone?'bone':'rust');last=next;}}
            for(const f of [-length*.65,length*.60])for(const side of [-1,1]){
                const s=stride*side*(f>0?1:-1),l=side*width*.8, lift=walk?Math.max(0,Math.cos(phase+(side*(f>0?1:-1)>0?0:Math.PI)))*3:0;
                limb([l,f,height],[l,f+s*3,4+lift],mire?3:2,c.body);
                ell(l,f+s*3+1,2+lift,mire?4:2.8,1.6,c.body);claws(l,f+s*3+1,2);
            }
            ell(0,0,height,width,length*.51,c.body,1);
            ell(0,length*.45,height+2,width*.83,width*.8,c.body,2);
            // A dorsal ridge, individual fur tufts or exposed vertebrae.
            for(let i=0;i<7;i++)ell(Math.sin(i)*.7,-length*.65+i*length*.2,height+4+(i%2),bone?2:1.5,bone?1.4:2,bone?'bone':c.body);
            const hz=height+3+power*2, hf=length*.9+power*3;
            ell(0,hf,hz,width*.76,width*.71,c.body,2);
            if(mire){for(let i=-1;i<=1;i++)ell(i*5,hf+1,hz+3,2,3,'slime');}
            else for(const side of [-1,1])poly([[side*width*.55,hf-2,hz+2],[side*width*.8,hf-1,hz+8],[side*width*.25,hf+2,hz+3]],bone?'bone':c.body);
            // Nose, cheek and long muzzle project with the compass heading.
            ell(0,hf+4,hz-2,width*.50,3,bone?'bone':c.body);
            ell(0,hf+6,hz-2,2,1.7,bone?'bone':'leather');
            if(front || Math.abs(fx)>.5){eye(-width*.40,hf+3,hz+1);eye(width*.40,hf+3,hz+1);}
            if(strike || wind){limb([-3,hf+5,hz-3],[-3,hf+7,hz-6-Math.max(0,power)*2],1,'bone');limb([3,hf+5,hz-3],[3,hf+7,hz-6-Math.max(0,power)*2],1,'bone');}
            if(bone){for(let i=0;i<4;i++)for(const s of [-1,1])limb([s*2,-5+i*3,height+2],[s*(width-1),-4+i*3,height-2],.9,'bone');}
            if(mire){for(let i=0;i<9;i++)ell(Math.sin(i*2)*8,Math.cos(i*2)*7,11+i%3,1.4,1.8,i%3?'slime':'bone');}
        } else {
            const h=c.tall,w=c.wide,shade=c.kind==='shade',robe=c.kind==='cult'||shade,warden=c.kind==='warden';
            const ghoul=c.kind==='ghoul',goblin=c.kind==='goblin';
            const head=h-7,shoulder=h-16,hip=14;
            const order = sx>0?[-1,1]:[1,-1];
            // Cloaks hang behind articulated legs; torn strips move out of phase.
            if(robe||warden||c.kind==='knight'){
                poly([[-w,0,shoulder],[w,0,shoulder],[w+3,-3,5],[0,-5,9],[-w-3,-3,5]],c.coat||c.body);
                for(let i=-2;i<=2;i++)limb([i*3,-3,shoulder-3],[i*4+Math.sin(phase+i)*1.5,-4,5+i%2*2],.9,c.coat||c.body);
            }
            for(const side of order){
                const gait=stride*side, lift=walk?Math.max(0,Math.cos(phase+(side>0?0:Math.PI)))*3:0;
                limb([side*3,0,hip],[side*4,gait*3,8+lift],ghoul?2:2.8,c.coat||c.body);
                limb([side*4,gait*3,8+lift],[side*4,gait*5,2+lift],2.1,ghoul?c.body:'leather');
                ell(side*4,gait*5+1,1+lift,3.7,2,ghoul?c.body:'leather');
            }
            ell(0,0,23,w,10,c.coat||c.body,1);
            // Belt, buckle, visible chest seams and separate shoulder pieces.
            limb([-w+1,1,16],[w-1,1,16],1.4,'leather');ell(0,3,16,1.5,1.5,'metal');
            if(!ghoul&&!shade){for(let i=0;i<3;i++)ell(-2,3,24+i*3,0.8,0.8,'bone');limb([-w+2,2,30],[w-2,2,30],.8,'leather');}
            if(ghoul){for(let i=0;i<4;i++)for(const s of [-1,1])limb([s,2,21+i*2],[s*5,3,22+i*2],.7,'bone');}
            for(const side of order){
                let f=-stride*side*3+power*(side===1?8:3),z=shoulder-8+(wind?side===1?8:3:strike?3:0);
                if(warden && /crow|summon|burst/i.test(attack||'')){f=2;z=shoulder+6+(wind?3:0);}
                if(warden && /chain/i.test(attack||'')){f=side===1?-2:wind?-5:strike?8:4;z=side===1?shoulder-7:shoulder+(wind?5:0);}
                ell(side*(w-1),0,shoulder,3.8,3.6,warden||c.kind==='watch'||c.kind==='knight'?'metal':c.coat||c.body);
                limb([side*w,0,shoulder-2],[side*(w+2),f*.4,z+3],ghoul?2:2.4,c.coat||c.body);
                limb([side*(w+2),f*.4,z+3],[side*(w+1),f,z],2,c.body);
                ell(side*(w+1),f,z,2.4,2.5,c.body);
                if(ghoul||shade)claws(side*(w+1),f,z);
                if(side===1 && !ghoul&&!shade){
                    const hand=[w+1,f,z];
                    if(warden){
                        const tip=[w+1+(strike?-8:wind?3:0),f+(strike&&!/chain/i.test(attack||'')?15:-1),Math.min(35,z+20-(strike?10:0))];
                        limb([w+1,f-4,z-12],tip,1.15,'rust');
                        poly([[tip[0]-1,tip[1],tip[2]-2],[tip[0]+7,tip[1]+1,tip[2]-5],[tip[0]+5,tip[1]+1,tip[2]+3],[tip[0],tip[1],tip[2]+5]],'metal');
                    }else{
                        const long=c.kind==='knight'?17:goblin?10:c.kind==='watch'?10:12;
                        const tip=[w+1+(strike?-3:wind?4:0),f+(strike?long*.8:wind?-4:2),z+(strike?2:long)];
                        limb(hand,tip,c.kind==='watch'?2:1.1,c.kind==='watch'?'leather':'metal');
                        if(c.kind!=='watch'){limb([w-2,f,z+2],[w+4,f,z+2],.9,'rust');ell(...tip,1,1,'bone');}
                    }
                }
                if(warden && side===-1 && /chain/i.test(attack||'')){for(let i=0;i<9;i++)ell(-w-1+Math.sin(i*1.2)*1.6,f+i*(strike?1.3:0.5),z-i*(strike?1:2),1.2,1.5,'metal');}
                if(side===-1&&(c.kind==='watch'||c.kind==='knight')){
                    poly([[-w-4,f+2,z+5],[-w+2,f+2,z+5],[-w+3,f+2,z-3],[-w-1,f+2,z-7],[-w-5,f+2,z-3]],c.kind==='watch'?'watch':'metal');ell(-w-1,f+3,z,1.8,2,'metal');
                }
            }
            ell(0,0,head,goblin?8:ghoul?6:7,ghoul?7:7,c.body,ghoul?2:0);
            if(robe){poly([[-8,-1,head-6],[-8,-1,head+3],[0,-1,head+10],[8,-1,head+3],[8,-1,head-6],[4,3,head+3],[-4,3,head+3]],c.coat||c.body);}
            if(goblin){for(const side of [-1,1])poly([[side*5,0,head+2],[side*14,-1,head+5],[side*8,1,head-2]],'skin');}
            if(c.kind==='watch'||c.kind==='knight'||warden){
                ell(0,-1,head+3,8,5,'metal');limb([-8,1,head+1],[8,1,head+1],1.1,'metal');
                if(warden){for(let i=-3;i<=3;i++)poly([[i*2,-2,head+5],[i*3,-3,head+11-Math.abs(i)],[i*2+2,-2,head+4]],'feather');}
            }
            if(front){
                ell(0,3,head-1,4,3,c.body);
                eye(-3,4,head+1);eye(3,4,head+1);limb([-2,5,head-3],[2,5,head-3],.6,'leather');
                if(ghoul){for(let i=-2;i<=2;i+=2)ell(i,5,head-4,.7,1.3,'bone');}
                if(warden){const q=pt(-3,4,head+1),r=pt(3,4,head+1);dot(q[0],q[1],'#c49159');dot(r[0],r[1],'#c49159');}
            }else{for(let i=-2;i<=2;i++)limb([i*2,-2,head+3],[i*2,-2,head-3],.6,warden?'feather':c.coat||c.body);}
            if(ghoul){for(const side of [-1,1]){ell(side*(w+1),power*3,shoulder-8,3,1.2,'metal');for(let i=0;i<4;i++)ell(side*(w+2)+Math.sin(i)*2,-1,shoulder-11-i*2,1,1.2,'metal');}if(c.scar)for(let i=0;i<4;i++)limb([-5+i,4,head+2-i],[i,4,head-1-i],.7,'rust');}
            if(shade){for(let i=-3;i<=3;i++)limb([i*2,-1,12],[i*3+Math.sin(phase+i)*2,-1,2+(i%2)*2],1.4,'shade');}
            // Warden's independently flapping crows: separate wing/head silhouettes from the halberd.
            if(warden){for(const side of [-1,1]){const z=shoulder+4+(wind?2:0),l=side*18;ell(l,-3,z,3,2,'feather');ell(l+side*2,-1,z+1,1.5,1.6,'feather');poly([[l,-3,z],[l+side*7,-5,z+3+(p.n%2)*3],[l+side*5,-2,z-1]],'feather');}}
        }
        return out;
    }
    const cache = new Map(), MAX_CACHE=384;
    function cachedFrame(key,o={}){
        if(!config[key])return null;
        const d=direction(o),p=pose(o),attack=typeof o.attack==='string'?o.attack:(o.attack&&o.attack.skill)||'';
        const variant=/crow|summon|burst/i.test(attack)?'crows':/chain/i.test(attack)?'chain':'weapon';
        const id=[key,d,p.state,p.n,variant].join(':');
        let frame=cache.get(id);
        if(!frame){
            const data=pixels(key,d,p,variant);
            let left=64,top=64,right=-1,bottom=-1;
            for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(data[(y*64+x)*4+3]){
                left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
            }
            const bounds=Object.freeze(right<0?{x:0,y:0,w:0,h:0}:{x:left,y:top,w:right-left+1,h:bottom-top+1});
            let canvas=null;
            if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(64,64);
            else if(typeof document!=='undefined'&&document.createElement){canvas=document.createElement('canvas');canvas.width=canvas.height=64;}
            if(canvas){const ctx=canvas.getContext('2d');const image=ctx.createImageData(64,64);image.data.set(data);ctx.putImageData(image,0,0);frame={canvas,bounds};}
            else frame={data,bounds};
            if(cache.size>=MAX_CACHE)cache.delete(cache.keys().next().value);
            cache.set(id,frame);
        }
        return frame;
    }
    // Bounds and draw share one lazy frame, including its single alpha scan. Browser RGBA buffers
    // are discarded after upload; only the canvas and four immutable bounds numbers are retained.
    function bounds(key,o={}){const frame=cachedFrame(key,o);return frame?frame.bounds:null;}
    function draw(g,key,o={}){
        const frame=cachedFrame(key,o);if(!frame)return false;
        if(frame.canvas){g.imageSmoothingEnabled=false;g.drawImage(frame.canvas,0,0);}
        else {let last='';for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;if(!frame.data[i+3])continue;const color=`rgb(${frame.data[i]},${frame.data[i+1]},${frame.data[i+2]})`;if(color!==last){g.fillStyle=color;last=color;}g.fillRect(x,y,1,1);}}
        return true;
    }
    function frameFor(key,o={}){if(!config[key])return null;const d=direction(o),p=pose(o);return {key,facing:facings[d],direction:d,state:p.state,index:p.n,frameKey:`${facings[d]}.${p.state}${p.n+1}`,width:64,height:64,anchor:{x:32,y:54}};}
    const api={frame:{w:64,h:64},anchor:{x:32,y:54},keys,facings,draw,bounds,direction,pose,frameFor,
        states:{idle:4,move:8,windup:4,attack:4,recover:4,hurt:2,stagger:2,dead:4},
        // Offline QA/export entry, returns a fresh RGBA buffer with no DOM or random state.
        raster(key,o={}){if(!config[key])return null;return pixels(key,direction(o),pose(o),typeof o.attack==='string'?o.attack:(o.attack&&o.attack.skill)||'');},
        cacheInfo(){return {frames:cache.size,maxFrames:MAX_CACHE,maximumBytes:MAX_CACHE*64*64*4};}};
    ENSO.enemySprites=api;
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
