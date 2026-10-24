/* =========================================================================
 * Enso's Last Stand — SPRITE PIPELINE (GFX-1, #106)
 * Asset-driven, layered character sprites. Format and how to add art: docs/SPRITES.md.
 *
 *   ENSO.spriteSheets[id]  sheets, registered by asset files (assets/sprites/*.js)
 *   ENSO.spriteManifest    characters: frame size, anchor, animations, layer order per facing
 *   ENSO.sprites           this module: pure composition + a canvas cache for drawing
 *
 * Composition is pure (no DOM) so tests can check it in Node: characterLayers() says which sheet
 * frames to stack and in which colours; rasterize() turns one frame into RGBA pixels. Only
 * drawCharacter() touches a canvas. The creator preview and the world both call drawCharacter(),
 * so what you pick is exactly what walks around.
 * Presentation only: it reads cosmetics and facing, it never changes game state.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const sheets = ENSO.spriteSheets || (ENSO.spriteSheets = {});

    // ---------------------------------------------------------------------
    // Palettes: role letter -> colour. Cosmetic choices pick a ramp per role group.
    // ---------------------------------------------------------------------
    const SKIN = [['#d9c3a5', '#b89f82'], ['#c69072', '#a2715a'], ['#8a5a40', '#6c4430'], ['#efd9c4', '#d2b9a3']];
    const HAIR = [['#2b2320', '#1a1412', '#4a3c36'], ['#6b4530', '#4c2f20', '#8e6248'], ['#a3a0a1', '#7c797b', '#c8c6c6'], ['#b05b36', '#86401f', '#d47d52']];
    const CLASS_CLOTH = { warrior: ['#8a3b2e', '#64291f'], mage: ['#35548a', '#253c64'], rogue: ['#3d6640', '#2b4a2d'], necromancer: ['#5a3b7a', '#402956'] };
    // Outfits: cloth ramp (null = the class colour), accent, metal.
    const OUTFIT = [
        { cloth: null, accent: '#6a4a2a', metal: ['#c8b070', '#8a7440'] },                   // Traveler
        { cloth: ['#7a6a52', '#5a4c3a'], accent: '#9a8a6a', metal: ['#8a8a90', '#5c5c64'] },  // Tattered
        { cloth: null, accent: '#3a3a40', metal: ['#a8a8b2', '#72727c'] },                    // Armored
        { cloth: ['#e0d4b8', '#b8aa8e'], accent: '#c8a040', metal: ['#e8d070', '#b0963c'] }   // Ceremonial
    ];
    const FIXED = { k: '#14100e', e: '#1a1412', p: '#3a3430', b: '#2a2018' };

    /** Role -> colour for one character's cosmetics. Unknown indices fall back to option 0. */
    function paletteFor({ appearance = 0, cosmetics = {}, className, palette } = {}) {
        const skin = SKIN[appearance] || SKIN[0];
        const hair = HAIR[cosmetics.hairColor] || HAIR[0];
        const fit = OUTFIT[cosmetics.outfit] || OUTFIT[0];
        const cloth = fit.cloth || CLASS_CLOTH[className] || ['#6a6a6a', '#4a4a4a'];
        const base = { ...FIXED, s: skin[0], S: skin[1], h: hair[0], H: hair[1], L: hair[2], c: cloth[0], C: cloth[1], a: fit.accent, m: fit.metal[0], M: fit.metal[1] };
        return palette ? { ...base, ...palette } : base;   // villagers recolour any role (ui/world-render.js PEOPLE)
    }

    // ---------------------------------------------------------------------
    // The player character: animations, layer order, which sheet each layer uses.
    // ---------------------------------------------------------------------
    const manifest = ENSO.spriteManifest || (ENSO.spriteManifest = {});
    manifest.player = manifest.player || {
        frame: { w: 24, h: 32 },
        anchor: { x: 12, y: 30 },              // the pixel that stands on the ground point (feet centre)
        // Each step: which pose frame to use, how long it shows (ms), and a vertical body offset (bob).
        animations: {
            idle: [{ pose: 'stand', ms: 520, oy: 0 }, { pose: 'stand', ms: 520, oy: 1 }],
            walk: [{ pose: 'stepA', ms: 110, oy: 1 }, { pose: 'stand', ms: 110, oy: 0 }, { pose: 'stepB', ms: 110, oy: 1 }, { pose: 'stand', ms: 110, oy: 0 }],
            // One-shot actions (GFX-2). `once` plays through once and then rests on `then` (or holds its last
            // step when `then` is absent: death). Front ends choose WHEN to play them; no rules live here.
            attack: { once: true, then: 'idle', steps: [{ pose: 'windup', ms: 140, oy: 0 }, { pose: 'strike', ms: 120, oy: 1 }, { pose: 'strike', ms: 160, oy: 0 }, { pose: 'stand', ms: 80, oy: 0 }] },
            cast: { once: true, then: 'idle', steps: [{ pose: 'cast', ms: 160, oy: 0 }, { pose: 'cast', ms: 220, oy: -1 }, { pose: 'cast', ms: 160, oy: 0 }, { pose: 'stand', ms: 80, oy: 0 }] },
            hit: { once: true, then: 'idle', steps: [{ pose: 'hit', ms: 90, oy: -1 }, { pose: 'hit', ms: 140, oy: 0 }, { pose: 'stand', ms: 90, oy: 0 }] },
            death: { once: true, steps: [{ pose: 'hit', ms: 160, oy: -1 }, { pose: 'kneel', ms: 220, oy: 2 }, { pose: 'kneel', ms: 1, oy: 3 }] }
        },
        // Bottom to top. Facing up, long hair falls over the back, so the rear hair goes above the clothing.
        layerOrder: {
            down: ['hairBack', 'body', 'outfit', 'hairFront'],
            left: ['hairBack', 'body', 'outfit', 'hairFront'],
            right: ['hairBack', 'body', 'outfit', 'hairFront'],
            up: ['body', 'outfit', 'hairBack', 'hairFront']
        },
        // Sheet id per layer; {field} is filled from the character's cosmetics.
        layers: {
            body: 'player.body',
            outfit: 'player.outfit.{outfit}',
            hairBack: { sheet: 'player.hair.{hairStyle}.back', optional: true },   // short styles have no rear hair
            hairFront: 'player.hair.{hairStyle}.front'
        },
        // When a requested sheet doesn't exist: try these (same fill-in), so nothing is ever drawn blank.
        fallbacks: { outfit: 'player.outfit.0', hairFront: 'player.hair.0.front' }
    };

    const FACINGS = ['down', 'up', 'left', 'right'];
    const missing = new Set();                // sheet ids asked for but absent (reported once each)
    const warn = (id) => { if (missing.has(id)) return; missing.add(id); if (typeof console !== 'undefined') console.warn(`[sprites] missing sheet '${id}', using fallback`); };
    const fill = (tpl, c) => tpl.replace(/\{(\w+)\}/g, (_, k) => (Number.isInteger(c[k]) ? c[k] : 0));

    /** An animation as { steps, once, then }. Plain arrays are looping animations. */
    const animDef = (character, anim) => { const a = character.animations[anim] || character.animations.idle; return Array.isArray(a) ? { steps: a, once: false } : a; };
    const duration = (steps) => steps.reduce((t, s) => t + s.ms, 0);
    /** Has a one-shot animation finished after `elapsed` ms? (Looping ones never do.) */
    function animationDone(character, anim, elapsed) { const a = animDef(character, anim); return !!a.once && elapsed >= duration(a.steps); }

    /** Which animation step is showing at `time` (ms). Looping animations wrap; a one-shot one that has
     *  finished shows its `then` animation (time counted from the end) or holds its last step. */
    function animationStep(character, anim, time) {
        const a = animDef(character, anim);
        const total = duration(a.steps);
        if (a.once && time >= total) return a.then ? animationStep(character, a.then, time - total) : a.steps[a.steps.length - 1];
        let t = a.once ? Math.max(0, time) : ((time % total) + total) % total;
        for (const s of a.steps) { if (t < s.ms) return s; t -= s.ms; }
        return a.steps[0];
    }

    /** The frame key a sheet has for (facing, pose): `${facing}.${pose}` first, then `${facing}`. */
    function frameKey(sheet, facing, pose) {
        if (!sheet || !sheet.frames) return null;
        if (sheet.frames[`${facing}.${pose}`] != null) return `${facing}.${pose}`;
        if (sheet.frames[facing] != null) return facing;   // image cell 0 counts
        return null;
    }

    /** A registered sheet, or null. An IMAGE sheet whose picture isn't ready (still loading, failed, or no
     *  DOM) stands in as its `fallback` sheet, so the character is never drawn with a hole in it. */
    function sheetById(id, seen = 0) {
        const sheet = sheets[id];
        if (!sheet) return null;
        if (!sheet.src) return sheet;
        if (imageReady(sheet)) return sheet;
        return sheet.fallback && seen < 4 ? sheetById(sheet.fallback, seen + 1) : null;
    }
    // Image sheets (PNG sprite sheets): loaded once, cached, never block drawing.
    const images = new Map();   // src -> { img, state: 'loading' | 'ready' | 'failed' }
    function imageReady(sheet) {
        if (typeof Image === 'undefined') return false;
        let e = images.get(sheet.src);
        if (!e) {
            e = { img: new Image(), state: 'loading' };
            e.img.onload = () => { e.state = 'ready'; cache.clear(); };
            e.img.onerror = () => { e.state = 'failed'; warn(sheet.src); };
            e.img.src = sheet.src;
            images.set(sheet.src, e);
        }
        return e.state === 'ready';
    }
    /** The real sheet id to draw for `id` right now (itself, or its fallback while its image isn't ready). */
    function resolveId(id) {
        for (let i = 0, cur = id; i < 5 && cur; i++) { const s = sheets[cur]; if (!s) return null; if (!s.src || imageReady(s)) return cur; cur = s.fallback; }
        return null;
    }

    /**
     * The layers to stack for one character, bottom to top:
     * [{ layer, sheetId, frame, fallback }]. Pure: tests use it to check composition.
     */
    function characterLayers({ cosmetics = {}, facing = 'down', anim = 'idle', time = 0, character = manifest.player } = {}) {
        const dir = FACINGS.includes(facing) ? facing : 'down';
        const step = animationStep(character, anim, time);
        const out = [];
        for (const layer of character.layerOrder[dir]) {
            const spec = typeof character.layers[layer] === 'string' ? { sheet: character.layers[layer] } : character.layers[layer];
            const want = fill(spec.sheet, cosmetics);
            let id = resolveId(want), fallback = id !== want;
            if (!id) {
                if (spec.optional && !sheets[want]) continue;          // e.g. a short style has no rear hair
                warn(want);
                const fb = character.fallbacks[layer] && resolveId(fill(character.fallbacks[layer], cosmetics));
                if (!fb) continue;
                id = fb; fallback = true;
            }
            const frame = frameKey(sheetById(id), dir, step.pose);
            if (!frame) continue;                                     // this layer has nothing to show facing this way
            out.push({ layer, sheetId: id, frame, fallback });
        }
        return { layers: out, oy: step.oy, pose: step.pose };
    }

    const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

    /** One frame of a palette sheet as RGBA pixels: { w, h, data } (data: Uint8ClampedArray). Mirrors resolved. */
    function rasterize(sheetId, frame, palette, character = manifest.player) {
        const sheet = sheets[sheetId];
        let src = sheet.frames[frame];
        let mirror = false;
        if (src && src.mirror) { mirror = true; src = sheet.frames[src.mirror]; }
        const { w, h } = character.frame;
        const data = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) {
            const row = src[y] || '';
            for (let x = 0; x < w; x++) {
                const ch = row[mirror ? w - 1 - x : x];
                if (!ch || ch === '.') continue;
                const colour = palette[ch];
                if (!colour) continue;
                const [r, g, b] = hexRgb(colour);
                const i = (y * w + x) * 4;
                data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
            }
        }
        return { w, h, data };
    }

    /** Stack layers into one RGBA image (pure; used by tests and by the canvas cache). */
    function composite(opts) {
        const character = opts.character || manifest.player;
        const { layers, oy, pose } = characterLayers(opts);
        const palette = paletteFor(opts);
        const { w, h } = character.frame;
        const data = new Uint8ClampedArray(w * h * 4);
        for (const l of layers) {
            if (sheets[l.sheetId].src) continue;                      // image layers only exist on a canvas
            const img = rasterize(l.sheetId, l.frame, palette, character);
            for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3]) data.set(img.data.subarray(i, i + 4), i);
        }
        return { w, h, data, oy, pose, layers };
    }

    // ---------------------------------------------------------------------
    // Canvas side: cached composites, drawn at whole pixels (nearest neighbour, no blur).
    // ---------------------------------------------------------------------
    /** The character drawn for a player class: a manifest entry that lists it in `classes`, else the layered
     *  player (e.g. the Necromancer test sprite, assets/sprites/necromancer-art.js). */
    function characterFor(className) {
        const k = String(className || '').toLowerCase();
        return Object.values(manifest).find((c) => c.classes && c.classes.includes(k)) || manifest.player;
    }

    const cache = new Map();
    function drawCharacter(g, x, y, opts, time) {
        const character = opts.character || characterFor(opts.className);
        const o = { ...opts, time, character };
        const { layers, oy } = characterLayers(o);
        const palette = paletteFor(o);
        const key = JSON.stringify([layers.map((l) => l.sheetId + '#' + l.frame), palette]);
        let c = cache.get(key);
        if (!c) {
            const { w, h } = character.frame;
            c = document.createElement('canvas');
            c.width = w; c.height = h;
            const cg = c.getContext('2d');
            cg.imageSmoothingEnabled = false;
            for (const l of layers) {
                const sheet = sheets[l.sheetId];
                if (sheet.src) {                                       // PNG sheet: frames are cells of a grid
                    const ref = sheet.frames[l.frame];
                    const cell = ref && ref.mirror ? sheet.frames[ref.mirror] : ref;
                    const cols = (sheet.grid && sheet.grid.cols) || 1;
                    const img = images.get(sheet.src).img;
                    cg.save();
                    if (ref && ref.mirror) { cg.translate(w, 0); cg.scale(-1, 1); }
                    cg.drawImage(img, (cell % cols) * w, Math.floor(cell / cols) * h, w, h, 0, 0, w, h);
                    cg.restore();
                    continue;
                }
                const tmp = document.createElement('canvas');
                tmp.width = w; tmp.height = h;
                const img = rasterize(l.sheetId, l.frame, palette, character);
                tmp.getContext('2d').putImageData(new ImageData(img.data, w, h), 0, 0);
                cg.drawImage(tmp, 0, 0);
            }
            if (cache.size > 400) cache.clear();
            cache.set(key, c);
        }
        const scale = opts.scale || 1;
        const prev = g.imageSmoothingEnabled;
        g.imageSmoothingEnabled = false;
        g.drawImage(c, Math.round(x - character.anchor.x * scale), Math.round(y - (character.anchor.y - oy) * scale), c.width * scale, c.height * scale);
        g.imageSmoothingEnabled = prev;
    }

    /** Problems with the registered sheets for a character; [] = valid (tests and `npm run world`). */
    function validateSheets(character = manifest.player) {
        const errs = [];
        for (const [id, sheet] of Object.entries(sheets)) {
            const { w, h } = sheet.frame || character.frame;   // a sheet for another character says its own frame size
            if (!sheet.frames || !Object.keys(sheet.frames).length) { errs.push(`${id}: no frames`); continue; }
            if (sheet.src) {
                if (!sheet.fallback || !sheets[sheet.fallback]) errs.push(`${id}: an image sheet needs a fallback sheet (drawn while it loads or if it fails)`);
                for (const [k, f] of Object.entries(sheet.frames)) if (!(Number.isInteger(f) || (f && sheet.frames[f.mirror] !== undefined))) errs.push(`${id}.${k}: image frames are grid cell numbers`);
                continue;
            }
            for (const [k, f] of Object.entries(sheet.frames)) {
                if (f && f.mirror) { if (!Array.isArray(sheet.frames[f.mirror])) errs.push(`${id}.${k}: mirrors missing frame '${f.mirror}'`); continue; }
                if (!Array.isArray(f) || f.length !== h) { errs.push(`${id}.${k}: needs ${h} rows`); continue; }
                f.forEach((row, y) => { if (row.length !== w) errs.push(`${id}.${k}: row ${y} is ${row.length} wide, expected ${w}`); });
                const roles = new Set(f.join('').replace(/\./g, ''));
                for (const r of roles) if (!(r in paletteFor())) errs.push(`${id}.${k}: unknown palette role '${r}'`);
            }
        }
        for (const ch of new Set([character, ...Object.values(manifest)])) for (const dir of FACINGS) for (const layer of ['body']) {
            const id = fill(typeof ch.layers[layer] === 'string' ? ch.layers[layer] : ch.layers[layer].sheet, {});
            for (const anim of Object.keys(ch.animations)) for (const s of animDef(ch, anim).steps) if (!frameKey(sheets[id], dir, s.pose)) errs.push(`${id}: no frame for ${dir} ${s.pose}`);
        }
        return errs;
    }

    /**
     * Head-and-shoulders portrait (HD-2D HUD: turn bar, party plates). Draws the same composition as the
     * walking character, facing the camera, and crops the top of it into a size x size square at (x, y).
     * opts are drawCharacter's ({ appearance, cosmetics, className }).
     */
    function drawPortrait(g, x, y, opts, size = 32) {
        const character = opts.character || characterFor(opts.className);
        const { w, h } = character.frame;
        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const tg = tmp.getContext('2d');
        drawCharacter(tg, character.anchor.x, character.anchor.y, { ...opts, facing: 'down', anim: 'idle', scale: 1 }, 0);
        const px = tg.getImageData(0, 0, w, h).data;
        let top = 0;
        while (top < h && ![...Array(w).keys()].some((i) => px[(top * w + i) * 4 + 3] > 0)) top++;
        const crop = Math.min(w, 20), sx = Math.round((w - crop) / 2), sy = Math.max(0, Math.min(h - crop, top + 2));
        const prev = g.imageSmoothingEnabled;
        g.imageSmoothingEnabled = false;
        g.drawImage(tmp, sx, sy, crop, crop, Math.round(x), Math.round(y), size, size);
        g.imageSmoothingEnabled = prev;
    }

    const api = { characterFor, drawPortrait, paletteFor, characterLayers, animationStep, animationDone, frameKey, rasterize, composite, drawCharacter, validateSheets, missing, manifest, sheets, FACINGS };
    ENSO.sprites = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
