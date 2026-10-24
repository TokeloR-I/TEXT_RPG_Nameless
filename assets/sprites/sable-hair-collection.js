/* ENSO · Sable character artwork, first original hair collection.
 * Red-sheet-inspired silhouettes: tousled, round crop, spiked, straight fringe.
 * Authored palette-index art overrides four programmer-placeholder sheets;
 * stays compatible with skin/hair recolouring, 24x32 anchors and four facings.
 * No external images, copied sprites or licensed dependencies.
 */
(function (global) {
    const ENSO = global.ENSO || (global.ENSO = {});
    const sheets = ENSO.spriteSheets || (ENSO.spriteSheets = {});
    const W = 24, H = 32;
    const pixel = (a,x,y,c) => { if (x>=0 && x<W && y>=0 && y<H) a[y][x]=c; };
    const line = (a,x,y,w,h,c) => { for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++)pixel(a,xx,yy,c); };
    const points = (a,entries,c) => { for(const [x,y] of entries)pixel(a,x,y,c); };
    const edits = [
        // A deliberately uneven fluffy/tousled fringe, inspired by the red-hair reference.
        (a,dir) => {
            line(a,7,3,10,2,'h');
            points(a,[[6,6],[6,7],[7,4],[8,2],[10,1],[12,3],[14,2],[16,3],[17,5],[18,7]],'h');
            line(a,8,5,3,2,'H');line(a,14,4,2,3,'H');
            points(a,[[8,3],[11,2],[15,4],[9,7],[13,5]],'L');
            if(dir==='down') {line(a,7,8,4,2,'h');line(a,13,7,4,2,'h');}
        },
        // Rounded volume, a tidy crown with an uninterrupted curved fringe.
        (a,dir) => {
            line(a,8,2,8,2,'h');line(a,6,4,12,4,'h');
            line(a,7,3,2,2,'H');line(a,15,3,2,2,'H');
            line(a,9,3,5,1,'L');line(a,8,5,8,1,'H');
            if(dir==='down')line(a,7,8,10,2,'h');
        },
        // Long, clearly separated red-sheet-inspired spike tips.
        (a,dir) => {
            points(a,[[5,6],[6,5],[7,3],[8,2],[9,4],[11,1],[12,2],[14,1],[15,4],[17,2],[18,5],[19,6]],'h');
            line(a,7,5,10,3,'h');
            line(a,8,5,2,3,'H');line(a,14,4,2,3,'H');
            points(a,[[8,3],[11,2],[15,3],[17,5]],'L');
            if(dir==='down')points(a,[[8,9],[9,9],[14,8],[15,8]],'h');
        },
        // Angular straight fringe with clean parted highlights.
        (a,dir) => {
            line(a,8,3,8,2,'h');line(a,6,5,12,3,'h');
            line(a,7,8,10,2,'h');line(a,11,9,2,2,'H');
            line(a,9,4,4,1,'L');line(a,15,5,1,3,'H');
            if(dir==='left')line(a,6,7,3,5,'h');
        }
    ];
    function stylize(source,fn,dir) {
        const a=source.map(row=>row.split(''));
        fn(a,dir);
        // A controlled one-pixel dark silhouette around added top hair.
        const b=a.map(row=>row.slice());
        for(let y=0;y<13;y++)for(let x=2;x<22;x++) {
            if(a[y][x]!=='.')continue;
            if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>['h','H','L'].includes((a[y+dy]||[])[x+dx])))b[y][x]='k';
        }
        return b.map(row=>row.join(''));
    }
    for(let style=0;style<edits.length;style++) {
        const id='player.hair.'+style+'.front';
        const original=sheets[id];
        if(!original || !original.frames)continue;
        const frames={...original.frames};
        for(const dir of ['down','up','left'])if(Array.isArray(frames[dir]))frames[dir]=stylize(frames[dir],edits[style],dir);
        sheets[id]={...original,frames,placeholder:false,name:['Tousled Ember','Rounded Ember','Wild Spikes','Straight Fringe'][style]+' · Sable art v1'};
    }
})(typeof window!=='undefined'?window:globalThis);
