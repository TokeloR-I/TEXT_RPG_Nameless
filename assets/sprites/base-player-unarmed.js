/* Authored naked player base from assets/basesprite/PNG/Unarmed/Without_shadow.
 * 64x64 cells; 4 direction rows; original artwork is kept byte-for-byte.
 * Draws as player body in both creator and world; old sprite pipeline remains
 * the fallback while images load. No combat rules or equipment stats change.
 */
(function (global) {
    const ENSO = global.ENSO || (global.ENSO = {});
    const prefix = 'assets/basesprite/PNG/Unarmed/Without_shadow/';
    const clips = {
        idle: { file: 'Unarmed_Idle_without_shadow.png', count: 12, ms: 100 },
        walk: { file: 'Unarmed_Walk_without_shadow.png', count: 6, ms: 110 },
        run: { file: 'Unarmed_Run_without_shadow.png', count: 8, ms: 80 },
        hit: { file: 'Unarmed_Hurt_without_shadow.png', count: 5, ms: 90, once: true },
        death: { file: 'Unarmed_Death_without_shadow.png', count: 7, ms: 110, once: true }
    };
    const rows = { down: 0, left: 1, right: 2, up: 3 };
    const cache = {};
    function draw(g, x, y, opts = {}, time = 0) {
        // Shared drawCharacter also renders villagers, enemy portraits and cosmetic thumbnails.
        // Only the actual protagonist opts into the naked body art.
        if (opts.basePlayer !== true || (opts.character && opts.character !== ENSO.spriteManifest.player)) return false;
        const anim = opts.anim === 'walk' || opts.anim === 'run' ? opts.anim
            : opts.anim === 'death' ? 'death' : opts.anim === 'hit' ? 'hit' : 'idle';
        const clip = clips[anim], url = (ENSO.baseSpriteData && ENSO.baseSpriteData[clip.file]) || prefix + clip.file;
        let image = cache[url];
        if (!image && typeof Image !== 'undefined') {
            image = new Image();
            cache[url] = image;
            image.src = url;
        }
        if (!image || !image.complete || !image.naturalWidth) return false;
        const frame = clip.once
            ? Math.min(clip.count - 1, Math.floor(Math.max(0, time) / clip.ms))
            : Math.floor(Math.max(0, time) / clip.ms) % clip.count;
        const row = rows[opts.facing] ?? 0;
        const scale = (opts.scale || 1) * 0.5; // align 64px source art with existing 24x32 player footprint
        const prior = g.imageSmoothingEnabled;
        g.imageSmoothingEnabled = false;
        g.drawImage(image, frame * 64, row * 64, 64, 64,
            Math.round(x - 32 * scale), Math.round(y - 58 * scale),
            64 * scale, 64 * scale);
        g.imageSmoothingEnabled = prior;
        return true;
    }
    ENSO.basePlayerSprite = { draw, clips, rows, frame: { w: 64, h: 64 }, anchor: { x: 32, y: 58 } };
})(typeof window !== 'undefined' ? window : globalThis);
