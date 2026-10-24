/* ENSO — Sable's first authored combat-pose art pass.
 * Overlay artwork keyed by facing and pose; drawn in the engine's 24×32 palette roles.
 * Original in-repository pixel art. No external references copied.
 * Preserves the GFX-2 motion states and supports every skin and class palette.
 */
(function(global) {
    const ENSO = global.ENSO || (global.ENSO = {});
    const sheets = ENSO.spriteSheets || (ENSO.spriteSheets = {});
    const body = sheets['player.body'];
    if (!body || !body.frames) return;
    const frames = Object.assign({}, body.frames);
    const W = 24, H = 32;
    const dot = (grid,x,y,c) => { if(x>=0&&x<W&&y>=0&&y<H) grid[y][x]=c; };
    const bar = (grid,x,y,w,h,c) => { for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) dot(grid,xx,yy,c); };
    const diag = (grid,x,y,dx,dy,len,c) => { for(let i=0;i<len;i++) dot(grid,x+dx*i,y+dy*i,c); };
    function poseArt(frame, facing, action) {
        const grid=frame.map(row=>Array.from(row));
        const side = facing==='left', rear=facing==='up';
        const shift = side ? -1 : 0;
        if (action==='windup') {
            // Strong overhead anticipation: raised fist and forearm with dark contour.
            bar(grid,17+shift,4,3,4,'s');
            bar(grid,18+shift,3,3,1,'k');
            diag(grid,18+shift,8,-1,1,6,'S');
            bar(grid,19+shift,3,2,2,'s');
            // planted opposite foot
            bar(grid,7,29,4,2,'b');
        } else if (action==='strike') {
            // Extended attack line, forward lunge and reaching hand.
            bar(grid,18+shift,17,4,3,'s');
            bar(grid,20+shift,16,2,2,'S');
            bar(grid,7,27,4,3,'p');
            bar(grid,6,30,5,1,'b');
            if (!rear) bar(grid,16+shift,15,4,2,'s');
        } else if (action==='cast') {
            // Open two-handed invocation; silhouette reaches beyond shoulders.
            for (const x of [3,19]) {
                bar(grid,x,5,3,5,'s');
                bar(grid,x,4,3,1,'S');
                dot(grid,x-1,6,'s'); dot(grid,x+3,6,'s');
            }
            // glowing magic is added by the effect renderer, not baked into the skin
        } else if (action==='hit') {
            // Knockback: shoulders open, guarded head and sideways recoil.
            bar(grid,2,13,4,3,'s');
            bar(grid,18,13,4,3,'s');
            bar(grid,2,12,3,1,'S');
            bar(grid,19,12,3,1,'S');
            bar(grid,7,28,3,2,'p');
            bar(grid,7,30,4,1,'b');
        } else if (action==='kneel') {
            // Fallen silhouette: ground support arm and collapsed knee.
            bar(grid,5,23,4,3,'s');
            bar(grid,4,25,5,2,'S');
            bar(grid,8,27,7,3,'p');
            bar(grid,6,30,10,1,'b');
            bar(grid,16,26,3,3,'p');
        }
        return grid.map(row=>row.join(''));
    }
    const actions=['windup','strike','cast','hit','kneel'];
    for (const facing of ['down','up','left']) for(const action of actions) {
        const key=facing+'.'+action;
        if(Array.isArray(frames[key])) frames[key]=poseArt(frames[key],facing,action);
    }
    // Retain all idle/walk frames; right-facing actions mirror left as in GFX-2.
    sheets['player.body']={...body, name:'Sable · Combat Pose Art v1', placeholder:false, frames};
})(typeof window!=='undefined'?window:globalThis);
