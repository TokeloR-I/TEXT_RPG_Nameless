/* =========================================================================
 * Enso's Last Stand — WORLD UI (keyboard exploration front end)
 * Zone 1 design: docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md §3–§4.
 *
 * Screens: title (name -> class -> appearance) -> explore <-> combat, plus game over.
 * Over exploration: dialog, conversation (talk), pause menu with the journal, and the evolution
 * (branch) menu. Chapter One's story is the engine's (src/engine/story.js): this file shows its
 * dialogue, journal and tracked objective, and sends back choices; it never decides quest state.
 *
 * Movement is tile-step: hold a direction to keep walking. The world model
 * (src/world/world.js) decides where you can go; the engine (src/engine.js)
 * owns the character, pickups, fights and run flags. Walking never calls the
 * engine. Fights are the normal engine fights. Menus come from
 * engine.getAvailableActions() (via ui/battle-menu.js) and choices go back as
 * engine.act() actions with combatant ids; this file never decides what is
 * usable (Phase 1 spec §6A W3). The battle log is still the engine's text
 * until structured events land (Phase 1, slice 3).
 *
 * Keys: arrows / WASD move or choose · E / Enter / Space interact or confirm
 * · Esc menu or back. A held key never carries over a panel: closing one needs
 * a fresh press to walk again, so no key both closes a panel and moves you.
 * ========================================================================= */
(function () {
    const { WorldSession, validateWorld, DIRS } = ENSO.worldModel;
    // Keel rev 2: the world plays on 16 px tiles. Maps authored for 32 px are converted on load (each tile becomes a
    // 2x2 block, src/world/scale16.js); the data files and the headless tests keep the original coordinates.
    const WORLD = ENSO.scale16 ? ENSO.scale16.doubleWorld(ENSO.world.zone1) : ENSO.world.zone1;
    const markerScale = (mapId) => (WORLD.maps[mapId] && WORLD.maps[mapId].source32 ? 2 : 1);   // story markers use 32 px coordinates
    const DATA = ENSO.data;
    const CV = ENSO.crowView;
    const SYSTEM_REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let REDUCED = SYSTEM_REDUCED;   // Settings → Motion can override the system choice (applyMotion below)
    const STEP_MS = 150;     // one 32 px tile step; a 16 px map takes half as long per tile, so walking speed stays the same
    const fadeMs = () => (REDUCED ? 60 : 220);     // each half of a map transition
    const FEATHER_MS = 700;  // Black Flight: feathers rise before the fade
    const BUMP_MS = 180;     // minimum gap between "blocked" bumps while a key is held
    const LOG_LINES = 80;    // battle log kept on screen

    const $ = (id) => document.getElementById(id);
    const canvas = $('world-canvas');
    const renderer = ENSO.gfx.createView(canvas, WORLD, { tile: 32 });   // HD-2D when WebGL is there (ui/postfx.js)
    const els = {
        title: $('title'), dialog: $('dialog'), pause: $('pause'), hud: $('hud'), banner: $('banner'),
        problems: $('problems'), combat: $('combat'), toast: $('toast'), prompt: $('prompt'), pad: $('touch-pad'), notices: $('notices')
    };
    // ---------------------------------------------------------------------
    // Display: the stage is sized in whole screen pixels per canvas pixel when that fits well
    // (ui/display.js). The choice is a per-browser preference, kept outside any save.
    // ---------------------------------------------------------------------
    const TOUCH = !!(els.pad && ENSO.touchControls && typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
    const touch = TOUCH ? ENSO.touchControls.create(els.pad, { fire: (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true })) }) : null;
    if (TOUCH) { els.pad.hidden = false; document.body.classList.add('touch'); }
    const DISPLAY_KEY = 'enso.ui.display';
    let displayMode = (() => { try { const m = localStorage.getItem(DISPLAY_KEY); return ENSO.display.MODES.includes(m) ? m : 'auto'; } catch (e) { return 'auto'; } })();
    function fitStage() {
        const stage = $('world-stage'), shell = stage.parentElement;
        const help = shell.querySelector('.world-help');
        // A phone held sideways: the stage takes the whole screen and the touch controls lie over it.
        const landscape = TOUCH && window.innerWidth > window.innerHeight;
        document.body.classList.toggle('touch-landscape', landscape);
        const below = landscape ? 0 : (help && help.offsetParent ? help.offsetHeight + 10 : 0) + (els.pad && !els.pad.hidden ? els.pad.offsetHeight + 12 : 0);
        const f = landscape
            ? ENSO.display.fit(window.innerWidth, window.innerHeight, displayMode, ENSO.display.BASE, { wide: true })
            : ENSO.display.fit(window.innerWidth - 32, window.innerHeight - 24 - below, displayMode);
        shell.style.width = `${f.w}px`;
        Object.assign(stage.style, { width: `${f.w}px`, height: `${f.h}px`, aspectRatio: 'auto' });
        stage.classList.toggle('tall', f.tall);
        // A wide landscape stage is shorter than its width suggests: panels sized in cqw shrink by this much to fit.
        stage.style.setProperty('--wide-k', f.wide ? (f.h * 480 / 270 / f.w).toFixed(3) : '1');
        if (renderer.hd) renderer.resize(f.canvasW, f.canvasH);   // the scene; postfx sizes the visible canvas to the screen
        else if (canvas.width !== f.canvasW || canvas.height !== f.canvasH) { canvas.width = f.canvasW; canvas.height = f.canvasH; }   // the renderer follows (GFX-3 draw reads the size each frame)
        stage.dataset.scale = f.integer ? `${f.scale}x` : 'fill';
    }
    // Motion: follow the system's reduced-motion setting, or always reduce, or always animate.
    const MOTION_KEY = 'enso.ui.motion';
    const MOTION_MODES = ['system', 'reduce', 'full'];
    const MOTION_LABELS = { system: 'Follow system', reduce: 'Reduced', full: 'Full' };
    const MOTION_HELP = { system: `Uses your device setting (now ${SYSTEM_REDUCED ? 'reduced' : 'full'}).`, reduce: 'No feathers, flashes or bobbing cursors; map changes are quick fades.', full: 'All animations, whatever the device says.' };
    let motionMode = (() => { try { const m = localStorage.getItem(MOTION_KEY); return MOTION_MODES.includes(m) ? m : 'system'; } catch (e) { return 'system'; } })();
    function applyMotion() {
        REDUCED = motionMode === 'reduce' || (motionMode === 'system' && SYSTEM_REDUCED);
        document.body.classList.toggle('reduce-motion', REDUCED);
    }
    function cycleMotion() {
        motionMode = MOTION_MODES[(MOTION_MODES.indexOf(motionMode) + 1) % MOTION_MODES.length];
        try { localStorage.setItem(MOTION_KEY, motionMode); } catch (e) { /* private window: this session only */ }
        applyMotion();
        return `Motion: ${MOTION_LABELS[motionMode]}.`;
    }
    applyMotion();
    /** Wren's render quality (ENSO.gfx, stored under 'enso.gfx'); 'high' unless set. */
    const gfxQuality = () => { try { return localStorage.getItem('enso.gfx') === 'low' ? 'low' : 'high'; } catch (e) { return 'high'; } };
    function cycleDisplay() {
        displayMode = ENSO.display.nextMode(displayMode);
        try { localStorage.setItem(DISPLAY_KEY, displayMode); } catch (e) { /* private window: this session only */ }
        fitStage();
        return `Display: ${ENSO.display.LABELS[displayMode]}. ${ENSO.display.HELP[displayMode]}`;
    }
    window.addEventListener('resize', fitStage);
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------
    let engine = null;
    let session = null;
    let screen = 'title';                 // title | explore | combat | over
    let modal = null;                     // null | 'creator' | 'dialog' | 'talk' | 'pause' | 'branch'
    let creator = null;                   // name, class, skin, hairstyle, hair colour and outfit
    let menu = null;                      // the keyboard menu that currently has focus
    let dialog = null;                    // { pages, title, onClose }
    let battle = null;                    // { id, log, stack, ended, lastHp }
    const held = [];                      // directions currently held, most recent last
    const down = new Set();               // physical keys currently down
    const stale = new Set();              // keys held across a focus change: ignored until released
    const seen = new Set();               // inspected objects (presentation only: stops the glint)
    const view = { mapId: WORLD.start.map, x: 0, y: 0, facing: 'down', moving: false, className: null, appearance: 0, marker: null, markers: [], fade: 0 };
    const STORY = ENSO.story && ENSO.story.chapter1;
    let anim = null;                      // tile-step tween { fx, fy, tx, ty, t0, then }
    let fade = null;                      // { t0, phase: 'out'|'in', result }
    let lastBump = 0;

    const problems = validateWorld(WORLD, DATA, STORY);
    if (problems.length) {
        els.problems.hidden = false;
        els.problems.textContent = `World data has ${problems.length} problem(s):\n${problems.join('\n')}`;
        console.error('World data problems', problems);
    }

    // ---------------------------------------------------------------------
    // Keyboard menus (title, pause, battle, evolution, game over)
    //   { items: [{ label, sub, disabled, action }], index, back, render }
    // ---------------------------------------------------------------------
    function makeMenu(items, opts = {}) {
        const m = { items, index: 0, back: opts.back || null, render: opts.render || (() => {}) };
        m.index = Math.max(0, items.findIndex((i) => !i.disabled));
        return m;
    }
    function menuHtml(m, cls = '') {
        return `<ul class="menu ${cls}" role="listbox">${m.items.map((it, i) => `
            <li role="option" data-i="${i}" aria-selected="${i === m.index}" class="${i === m.index ? 'selected' : ''} ${it.disabled ? 'disabled' : ''}">
                <span class="m-label">${esc(it.label)}</span>${it.sub ? `<span class="m-sub">${esc(it.sub)}</span>` : ''}</li>`).join('')}</ul>`;
    }
    function bindMenuClicks(root, m) {
        root.querySelectorAll('.menu li').forEach((li) => li.addEventListener('click', () => {
            const i = +li.dataset.i;
            if (m.items[i].disabled) return;
            m.index = i; m.items[i].action();
        }));
    }
    /** Returns true if the key was used by the menu. */
    function menuKey(m, ev, dir) {
        if (dir === 'up' || dir === 'down') {
            // Greyed-out entries can be highlighted (their line says why they're unavailable); Enter ignores them.
            const n = m.items.length;
            m.index = (m.index + (dir === 'up' ? n - 1 : 1)) % n;
            m.render(); return true;
        }
        if (isAct(ev) && !ev.repeat) { if (screen === 'title' && creator && CREATOR_FLOW.includes(creator.step) && creator.step !== 'name') { if (creator.step === 'class') creatorNext(); else startGame(creator.cls, creator.name, creator.look, cosmeticsFromCreator()); return true; } const it = m.items[m.index]; if (it && !it.disabled) it.action(); return true; }
        if ((ev.key === 'Escape' || ev.key === 'Backspace') && !ev.repeat && m.back) { m.back(); return true; }
        return false;
    }

    // ---------------------------------------------------------------------
    // Title / class choice
    // ---------------------------------------------------------------------
    // Character creation (CH1-02): Name -> Class -> Appearance -> begin. Cosmetic only; the engine
    // validates the name (1–24 characters; blank = the chapter's default) and stores both.
    const classes = Object.keys(DATA.basePlayerClasses);
    const looks = (STORY && STORY.appearances) || [{ id: 'default', label: 'Default' }];
    const NAME_MAX = 24;
    // The choices come from the player character's art (its manifest's `options`); the lists below are for the
    // placeholder player when that art isn't loaded.
    const OPTS = (ENSO.sprites && ENSO.sprites.characterFor && ENSO.sprites.characterFor('*').options) || {};
    const HAIR_STYLES = OPTS.hairStyles || ['Wild Raven', 'Round Crop', 'Spiky', 'Straight Fringe', 'Long Side Strands', 'Swept', 'Soft Layers', 'Clean Crop', 'Side Part', 'Medium Layers', 'Braids', 'High Ponytail'];
    const HAIR_COLOURS = OPTS.hairColours ? OPTS.hairColours.map((c) => c.name) : ['Raven', 'Chestnut', 'Ash', 'Copper'];
    const OUTFITS = OPTS.outfits || ['Worn Traveler', 'Tattered', 'Armored', 'Ceremonial'];
    const HATS = OPTS.hats || ['None'], WEAPONS = OPTS.weapons || ['Sword'], SHIELDS = OPTS.shields || ['None'];
    const OUTFIT_COLOURS = OPTS.outfitColours ? OPTS.outfitColours.map((c) => c.name) : ['Default'];
    const CHOICES = { hairStyle: HAIR_STYLES, hairColor: HAIR_COLOURS, outfit: OUTFITS, outfitColor: OUTFIT_COLOURS, hat: HATS, weapon: WEAPONS, shield: SHIELDS };
    const defaultCosmetics = () => ({ hairStyle: 0, hairColor: 0, outfit: 0, outfitColor: 0, hat: 0, weapon: 0, shield: SHIELDS.length > 1 ? 1 : 0 });
    // A calling suggests a look (the player can change all of it): outfit style and colour, weapon and shield by
    // their names in the art's options, so this list never depends on index order.
    // Casters carry casters' weapons (Tokelo, 2026-11-09): a staff for the mage, a dark staff for the necromancer.
    const CLASS_LOOK = { warrior: ['Ironclad', 'Rust', 'Iron Sword', 'Oak Round'], mage: ['Robe', 'Indigo', 'Frost Staff', 'None'],
        rogue: ['Shadow Leathers', 'Crow', 'Iron Sword', 'None'], necromancer: ['Robe', 'Plum', 'Obsidian Staff', 'None'] };
    /** The kind of weapon actually in the main hand, so the sprite draws a staff or wand when one is equipped
     *  (assets/sprites/enso-player.js heldType). Older saves whose look was a spear or mace show their staff this way. */
    const HELD = { staff: 'staff', wand: 'wand', spear: 'spear', scythe: 'staff', 'one-hand': 'blade', 'two-hand': 'blade' };
    function heldWeapon() {
        const id = engine && engine.player && engine.player.equipment && engine.player.equipment.mainHand;
        const d = id && engine.itemDef ? engine.itemDef(id) : null;
        return (d && HELD[d.weaponType]) || null;
    }
    function suggestLook(cls) {
        const look = CLASS_LOOK[cls];
        if (!look) return;
        [['outfit', OUTFITS], ['outfitColor', OUTFIT_COLOURS], ['weapon', WEAPONS], ['shield', SHIELDS]].forEach(([field, list], i) => {
            const at = list.indexOf(look[i]);
            if (at >= 0) creator[field] = at;
        });
    }
    function showTitle() {
        screen = 'title';
        modal = 'creator'; syncActionHudVisibility();                    // the creation steps (Enter, Enter, Enter starts with the defaults)
        for (const el of [els.hud, els.dialog, els.pause, els.combat, els.prompt]) el.hidden = true;
        els.title.hidden = false;
        creator = { step: 'name', name: creator ? creator.name : '', cls: classes[0], look: 0, ...defaultCosmetics() };
        creatorStep(readSave() || readBackup() ? 'start' : 'name');
    }
    const CREATOR_FLOW = ['name', 'class', 'look', 'hairStyle', 'hairColor', 'outfit', 'outfitColor', 'hat', 'weapon', 'shield'];
    const LAST_STEP = CREATOR_FLOW[CREATOR_FLOW.length - 1];
    function creatorNext() {
        if (menu && CREATOR_FLOW.includes(creator.step)) {
            if (creator.step === 'class') { creator.cls = classes[menu.index]; suggestLook(creator.cls); }
            else if (creator.step === 'look') creator.look = menu.index;
            else if (CHOICES[creator.step]) creator[creator.step] = menu.index;
        }
        if (creator.step === 'name') {
            const input = els.title.querySelector('#hero-name');
            if (input) creator.name = input.value;
        }
        if (creator.step === LAST_STEP) {
            startGame(creator.cls, creator.name, creator.look, cosmeticsFromCreator());
            return;
        }
        const next = CREATOR_FLOW[CREATOR_FLOW.indexOf(creator.step) + 1];
        if (next) creatorStep(next);
    }
    function creatorBack() {
        const previous = CREATOR_FLOW[CREATOR_FLOW.indexOf(creator.step) - 1];
        if (previous) creatorStep(previous);
    }
    function creatorStep(step) {
        creator.step = step;
        menu = null;
        if (step === 'start') {
            const save = readSave();
            const backup = readBackup();
            const about = (sv) => {
                const when = sv && sv.meta && sv.meta.createdAt ? new Date(sv.meta.createdAt).toLocaleString() : '';
                return `${(sv && sv.meta && sv.meta.label) || 'Saved game'}${when ? ` · ${when}` : ''} · v${saveVersion(sv)}`;
            };
            menu = makeMenu([
                ...(save ? [{ label: 'Continue', sub: about(save), action: () => continueGame(save) }] : []),
                { label: 'New game', sub: save ? 'Your save is kept as the backup once the new game saves.' : 'Wake in the cellar.', action: () => creatorStep('name') },
                { label: 'Load save file', sub: 'A save file you exported (or drop it on this screen). Older versions load too.', action: pickSaveFile },
                ...(backup ? [{ label: 'Load backup', sub: about(backup), action: () => continueGame(backup) }] : [])
            ], { render: renderTitle });
        }
        const options = step === 'class' ? classes.map(key => DATA.basePlayerClasses[key].name)
            : step === 'look' ? looks.map(l => l.label)
            : CHOICES[step] || null;
        if (options) {
            menu = makeMenu(options.map((label, i) => ({
                label,
                sub: step === 'class' ? DATA.basePlayerClasses[classes[i]].description : null,
                action: () => {
                    if (step === 'class') { creator.cls = classes[i]; suggestLook(creator.cls); }
                    else if (step === 'look') creator.look = i;
                    else creator[step] = i;
                    menu.index = i;
                    renderTitle();
                }
            })), { back: creatorBack, render: renderTitle });
            menu.index = step === 'class' ? Math.max(0, classes.indexOf(creator.cls)) : step === 'look' ? creator.look : creator[step];
        }
        renderTitle();
    }
    function cosmeticsFromCreator() {
        return Object.fromEntries(Object.keys(CHOICES).map((k) => [k, creator[k] || 0]));
    }
    function renderTitle() {
        const sub = esc(WORLD.zones[WORLD.maps[WORLD.start.map].zoneId].name);
        if (creator.step === 'name') {
            const fallback = (STORY && STORY.defaultName) || 'The Wanderer';
            els.title.innerHTML = `
                <h1>Enso's Last Stand</h1>
                <p class="subtitle">${sub}</p>
                <p class="prompt">Who wakes in the cellar?</p>
                <label class="name-field">Name<input id="hero-name" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" placeholder="${esc(fallback)}" value="${esc(creator.name)}"></label>
                <div class="creator-nav"><button type="button" data-load-save>Load save file</button><button type="button" data-creator-next>Next →</button></div><p class="keys">Type a name (or leave it blank) · Enter continue · or drop a save file here</p>`;
            const input = els.title.querySelector('#hero-name');
            input.addEventListener('input', () => { creator.name = input.value; });
            input.addEventListener('keydown', (ev) => {
                ev.stopPropagation();                     // typing never walks, opens menus, or picks things
                if (ev.key === 'Enter') { ev.preventDefault(); creatorNext(); }
            });
            els.title.querySelector('[data-creator-next]').addEventListener('click', creatorNext);
            els.title.querySelector('[data-load-save]').addEventListener('click', pickSaveFile);
            setTimeout(() => input.focus(), 0);
            return;
        }
        if (creator.step === 'start') {
            els.title.innerHTML = `<h1>Enso's Last Stand</h1><p class="subtitle">${sub}</p>${menuHtml(menu, 'class-list')}<p class="keys">↑ ↓ choose · Enter</p>`;
            bindMenuClicks(els.title, menu);
            return;
        }
        const who = creator.name.trim() || (STORY && STORY.defaultName) || 'The Wanderer';
        const isClass = creator.step === 'class';
        const cosmetic = cosmeticsFromCreator();
        const field = creator.step;
        const skinSwatches = OPTS.skins ? OPTS.skins.map((c) => c.swatch) : ['#d9c3a5','#c69072','#8a5a40','#efd9c4'];
        const hairSwatches = OPTS.hairColours ? OPTS.hairColours.map((c) => c.swatch) : ['#2b2320','#6b4530','#a3a0a1','#b05b36'];
        const cycle = (key, label, values, index) => `<div class="vessel-control" data-editor-field="${key}">
            <span class="vessel-field-name">${label}</span>
            <button type="button" data-cycle="${key}" data-delta="-1" aria-label="Previous ${label}">‹</button>
            <strong>${esc(values[index])}</strong>
            <button type="button" data-cycle="${key}" data-delta="1" aria-label="Next ${label}">›</button>
        </div>`;
        const swatches = (key, label, values, selected) => `<div class="vessel-swatches"><span class="vessel-field-name">${label}</span>
            <div class="vessel-swatch-row">${values.map((color,i) => `<button type="button" class="vessel-swatch ${i===selected?'active':''}" style="--swatch:${color}" data-swatch="${key}" data-choice="${i}" aria-label="${label} ${i+1}" aria-pressed="${i===selected}"></button>`).join('')}</div>
        </div>`;
        const classOptions = isClass ? `<div class="vessel-class-list">${menuHtml(menu, 'class-list')}</div>` : '';
        els.title.innerHTML = `
            <div class="vessel-screen">
                <header class="vessel-header"><div class="vessel-brand">ENSO'S LAST STAND</div>
                    <div class="vessel-step">${isClass ? '01 · CALLING' : '02 · APPEARANCE'}</div>
                    <h1>${isClass ? 'Choose Your Calling' : 'Shape Your Vessel'}</h1>
                    <p>Every forgotten soul once had a face.</p></header>
                <div class="vessel-columns">
                    
                    <section class="vessel-preview" aria-label="Live player sprite preview">
                        <h2>${esc(who)}</h2>
                        <div class="vessel-preview-stage"><canvas id="creator-sprite" width="192" height="208" role="img" aria-label="Live in-game sprite preview"></canvas></div>
                        <div class="vessel-directions" role="group" aria-label="Preview direction">
                            ${['down','up','left','right'].map((direction,i) => `<button type="button" data-facing="${direction}" class="${(creator.facing||'down')===direction?'active':''}" aria-pressed="${(creator.facing||'down')===direction}">${['FRONT','BACK','LEFT','RIGHT'][i]}</button>`).join('')}
                        </div>
                        <p class="vessel-preview-caption">Your actual in-game sprite</p>
                    </section>
                    <section class="vessel-customize" aria-label="Appearance options">
                        <h2>${isClass ? 'CHOOSE A CLASS' : 'APPEARANCE OPTIONS'}</h2>
                        ${isClass ? classOptions : `
                        ${cycle('look','Skin tone',looks.map(l => l.label),creator.look)}
                        ${cycle('hairStyle','Hair style',HAIR_STYLES,creator.hairStyle)}
                        ${cycle('outfit','Outfit',OUTFITS,creator.outfit)}
                        ${cycle('hat','Hat',HATS,creator.hat || 0)}
                        ${cycle('weapon','Weapon',WEAPONS,creator.weapon || 0)}
                        ${cycle('shield','Shield',SHIELDS,creator.shield || 0)}
                        ${swatches('hairColor','Hair colour',hairSwatches,creator.hairColor)}
                        ${OPTS.outfitColours ? swatches('outfitColor','Outfit colour',OPTS.outfitColours.map((c) => c.swatch),creator.outfitColor || 0) : ''}
                        ${swatches('look','Skin tone',skinSwatches,creator.look)}
                        <div class="vessel-styles-heading">HAIRSTYLES <span>${HAIR_STYLES.length} STYLES</span></div>
                        <div class="vessel-hairstyles" role="group" aria-label="Choose hairstyle">
                        ${HAIR_STYLES.map((name,i) => `<button type="button" data-style="${i}" class="vessel-style ${i===creator.hairStyle?'active':''}" aria-label="${esc(name)}" aria-pressed="${i===creator.hairStyle}">
                            <canvas width="48" height="64" data-style-preview="${i}" aria-hidden="true"></canvas>
                            <small>${String(i+1).padStart(2,'0')}</small><span>${esc(name)}</span></button>`).join('')}
                        </div>`}
                    </section>
                </div>
                <footer class="vessel-footer">
                    <button type="button" data-creator-back>← Back</button>
                    <span>${isClass ? 'Choose a calling before shaping your vessel' : 'Preview and change every option before continuing'}</span>
                    <button type="button" data-creator-next>${creator.step === LAST_STEP ? 'Start Game →' : 'Continue →'}</button>
                </footer>
            </div>`;
        if (isClass) bindMenuClicks(els.title, menu);
        els.title.querySelector('[data-creator-back]').addEventListener('click', creatorBack);
        els.title.querySelector('[data-creator-next]').addEventListener('click', () => {
            // The appearance panel is a unified editor, so Continue confirms all cosmetics.
            if (!isClass) startGame(creator.cls, creator.name, creator.look, cosmeticsFromCreator());
            else creatorNext();
        });
        els.title.querySelectorAll('[data-facing]').forEach(button => button.addEventListener('click', () => {
            creator.facing = button.dataset.facing;
            renderTitle();
        }));
        els.title.querySelectorAll('[data-cycle]').forEach(button => button.addEventListener('click', () => {
            const field = button.dataset.cycle;
            const max = field === 'look' ? looks.length : CHOICES[field].length;
            creator[field] = ((creator[field] || 0) + Number(button.dataset.delta) + max) % max;
            renderTitle();
        }));
        els.title.querySelectorAll('[data-swatch]').forEach(button => button.addEventListener('click', () => {
            creator[button.dataset.swatch] = Number(button.dataset.choice);
            renderTitle();
        }));
        els.title.querySelectorAll('[data-style]').forEach(button => button.addEventListener('click', () => {
            creator.hairStyle = Number(button.dataset.style);
            renderTitle();
        }));
        drawCreatorSprite();
    }

    /** Identical renderer and cosmetic values are used in the creator and the playable world. */
    function drawCreatorSprite() {
        if (!ENSO.sprites) return;
        const cosmetic = cosmeticsFromCreator();
        const appearance = creator.look;
        const className = creator.step === 'class' && menu ? classes[menu.index] : creator.cls;
        const facing = creator.facing || 'down';
        const canvas = els.title.querySelector('#creator-sprite');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.imageSmoothingEnabled = false;
            const big = ENSO.sprites.characterFor && ENSO.sprites.characterFor(className).frame.h > 32 ? 4 : 5;   // 64 px frames: room for the weapon
            ENSO.sprites.drawCharacter(ctx, 96, 183, { appearance, cosmetics: cosmetic, className, facing, anim: 'ready', scale: big }, 0);
        }
        els.title.querySelectorAll('[data-style-preview]').forEach(tile => {
            const g = tile.getContext('2d');
            if (!g) return;
            g.imageSmoothingEnabled = false;
            ENSO.sprites.drawCharacter(g, 24, ENSO.sprites.characterFor(className).frame.h > 64 ? 86 : 76, {   // head and shoulders: the hair is what differs
                appearance, cosmetics: { ...cosmetic, hairStyle: Number(tile.dataset.stylePreview) },
                className, facing: 'down', anim: 'idle', scale: 2
            }, 0);
        });
    }

    /** Fights are real time (combat v2, src/engine/realtime.js); ?combat=turn in the address plays the legacy turn-based fights. */
    // Combat v3 (docs/ACTION_COMBAT.md) fights in the world: the default. ?combat=realtime is v2's battle overlay,
    // ?combat=turn the legacy turn-based screen.
    const COMBAT_MODE = /[?&]combat=turn(?:&|$)/.test(location.search || '') ? 'turn' : /[?&]combat=realtime(?:&|$)/.test(location.search || '') ? 'realtime' : 'action';
    const ACTION = COMBAT_MODE === 'action' && !!(ENSO.actionSim && ENSO.actionFx);

    /** ?seed=123 in the address replays a run; otherwise the engine picks a seed and the pause menu shows it. */
    function seedFromUrl() {
        const m = /[?&]seed=(\d+)/.exec(location.search || '');
        return m ? parseInt(m[1], 10) : undefined;
    }

    // Save / continue: the engine makes and checks the save (Phase 1 spec §5, src/engine/save.js); this page keeps
    // one slot in the browser plus one backup. Your place on the map travels in the save's attachments (the world
    // owns space). Saves outlive game updates: the engine migrates older formats and fills in new content on load.
    // A save file (export/import) carries a run between browsers, folders and new builds of the game, which
    // browser storage alone can't promise for a double-clicked file.
    const SAVE_KEY = 'enso.world.save.v1';            // the key never changes, so every older build's save is found
    const BACKUP_KEY = 'enso.world.save.v1.backup';   // the previous run, or this run as it was before a game update
    const AUTOSAVE_MS = 60000;
    let runId = null;                                 // one per new game, so the backup only takes another run's save
    let autosave = { at: 0, map: null, pending: false };
    const readKey = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
    function readSave() { return readKey(SAVE_KEY); }
    function readBackup() { return readKey(BACKUP_KEY); }
    const newRunId = () => `run-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    const saveVersion = (save) => (save && ((save.game && save.game.version) || (save.engine && save.engine.version))) || '?';
    function makeSave() {
        const p = engine.getState().player;
        return engine.serialize({ label: `${p.name} · Lv ${p.level} · ${WORLD.maps[session.mapId].name}`, createdAt: new Date().toISOString(),
            attachments: { world: session.getState(), seen: [...seen], cosmetics: view.cosmetics || defaultCosmetics(), runId } });
    }
    function saveGame({ auto = false } = {}) {
        const save = makeSave();
        try {
            // Keep the slot's old save as the backup when it is another run, or was made by another build of the game.
            const old = localStorage.getItem(SAVE_KEY);
            const prev = old && (() => { try { return JSON.parse(old); } catch (e) { return null; } })();
            if (prev && ((prev.attachments || {}).runId !== runId || (prev.data || {}).hash !== save.data.hash)) localStorage.setItem(BACKUP_KEY, old);
            localStorage.setItem(SAVE_KEY, JSON.stringify(save));
            return auto ? null : 'Saved. Continue from the title screen next time.';
        } catch (e) { return auto ? null : `Couldn't save in this browser (${e.message}). Export a save file instead.`; }
    }
    /** A quiet save whenever you're free to move: a new area, and every minute (never mid-fight or mid-talk). */
    function canAutosave() {
        if (!engine || screen !== 'explore' || modal || fade || anim || battle || engine.mode !== 'explore') return false;
        if (engine.story && engine.story.dialogue) return false;
        return !engine.canSave || engine.canSave().ok;
    }
    function autosaveTick(now) {
        if (!engine || !session || screen !== 'explore') return;
        if (session.mapId !== autosave.map) { if (autosave.map !== null) autosave.pending = true; autosave.map = session.mapId; }
        if (!autosave.pending && now - autosave.at < AUTOSAVE_MS) return;
        if (!canAutosave()) return;
        autosave = { at: now, map: session.mapId, pending: false };
        saveGame({ auto: true });
    }
    const resetAutosave = () => { autosave = { at: performance.now(), map: session ? session.mapId : null, pending: false }; };
    window.addEventListener('pagehide', () => { if (canAutosave()) saveGame({ auto: true }); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && canAutosave()) saveGame({ auto: true }); });

    /** Download the run as a file the player keeps (works from a double-clicked file too). */
    function exportSave() {
        const ok = engine.canSave ? engine.canSave() : { ok: true };
        let save;
        if (ok.ok) { save = makeSave(); saveGame({ auto: true }); } else save = readSave();
        if (!save) return ok.error ? ok.error.message : 'Nothing to export yet.';
        downloadSave(save);
        return ok.ok ? 'Save file downloaded. Load it from the title screen of this or any newer version of the game.' : `${ok.error.message} Your last save was exported instead.`;
    }
    function downloadSave(save) {
        const who = String((save.state && save.state.player && save.state.player.name) || 'save').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'save';
        const day = String((save.meta && save.meta.createdAt) || new Date().toISOString()).slice(0, 10);
        const url = URL.createObjectURL(new Blob([JSON.stringify(save, null, 1)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = `ensos-last-stand-${who}-${day}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    /** Read a save file the player picked (or dropped on the title screen), then continue it. */
    function importSaveFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onerror = () => toast("That file couldn't be read.");
        reader.onload = () => {
            let save;
            try { save = JSON.parse(String(reader.result)); } catch (e) { toast("That file isn't a save file."); return; }
            if (continueGame(save)) saveGame({ auto: true });   // keep it in this browser too
        };
        reader.readAsText(file);
    }
    function pickSaveFile() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json,application/json';
        input.addEventListener('change', () => importSaveFile(input.files && input.files[0]));
        input.click();
    }
    window.addEventListener('dragover', (ev) => { if (screen === 'title') ev.preventDefault(); });
    window.addEventListener('drop', (ev) => {
        if (screen !== 'title') return;
        ev.preventDefault();
        importSaveFile(ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]);
    });

    function continueGame(save) {
        let loaded;
        try { loaded = ENSO.GameEngine.fromSave(save, { combatMode: COMBAT_MODE }); } catch (e) {
            toast(`That save couldn't be loaded. ${String(e.message).replace(/^Can't load save: [A-Z_]+: /, '')}`);
            return false;
        }
        engine = loaded;
        window.enso = engine;
        session = new WorldSession(WORLD, { engine });
        session.restorePosition(((engine.lastLoad.attachments || {}).world) || null, { revision: (engine.lastLoad.game || {}).revision });
        window.ensoWorld = session;
        runId = (engine.lastLoad.attachments || {}).runId || newRunId();
        actionStart();
        seen.clear();
        for (const id of ((engine.lastLoad.attachments || {}).seen) || []) seen.add(id);
        enterExplore(engine.player.className, engine.player.appearance || 0, (engine.lastLoad.attachments || {}).cosmetics || defaultCosmetics());
        resetAutosave();
        // A save carried back to an older copy of the game says so, instead of claiming the game was updated
        // (Tokelo, playtest 2026-11-11). Unknown quests are kept aside and come back when you load it in the newer copy.
        const codes = new Set(engine.lastLoad.warnings.map((w) => w.code));
        const updated = codes.has('DATA_CHANGED') || codes.has('UPGRADED') || codes.has('CONTENT_UPDATED');
        const warn = codes.has('NEWER_SAVE')
            ? ["(This save was made in a newer version of the game than this one. Some places, quests or items in it don't exist here yet. Your progress is kept, but play it in the newest version to see everything.)"]
            : updated ? [`(This save is from version ${saveVersion(save)}. The game has been updated since, and your progress carried over.)`] : [];
        openDialog([`Welcome back, ${engine.player.name}.`, ...warn], null, afterStory);
        return true;
    }
    function enterExplore(cls, look, cosmetics = defaultCosmetics()) {
        battle = null;
        syncView();
        view.className = cls;
        view.appearance = look;
        view.cosmetics = cosmetics;
        screen = 'explore';
        modal = null; syncActionHudVisibility();
        menu = null;
        els.title.hidden = true;
        els.hud.hidden = false;
        updateHud();
        showBanner(WORLD.maps[session.mapId].name);
    }

    function startGame(cls, name, look, cosmetics = defaultCosmetics()) {
        engine = new ENSO.GameEngine({ seed: seedFromUrl(), combatMode: COMBAT_MODE });
        window.enso = engine;                 // handy from the browser console
        runId = newRunId();
        engine.start();
        engine.act({ type: 'choose_class', classId: cls });
        if (STORY) engine.act({ type: 'set_identity', name: name || '', appearance: look || 0 });
        engine.act({ type: 'enter_world' });
        session = new WorldSession(WORLD, { engine });
        window.ensoWorld = session;
        actionStart();
        seen.clear();
        enterExplore(cls, look || 0, cosmetics);
        resetAutosave();
        openDialog(WORLD.intro, null);
    }

    // ---------------------------------------------------------------------
    // HUD, banner, toast, dialog
    // ---------------------------------------------------------------------
    function bar(cur, max, cls) {
        const pct = max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
        return `<span class="bar ${cls}"><span style="width:${pct}%"></span></span>`;
    }
    function updateHud() {
        const p = engine.getState().player;
        const place = session ? WORLD.maps[session.mapId].name : '';
        // Compact HUD (HD-2D pass): face, name and slim gauges top left, the quest tracker top right, no boxes.
        els.hud.innerHTML = `
            <div class="hud-me">
                <span class="dia"><canvas class="face" width="32" height="32" data-face="player" aria-hidden="true"></canvas></span>
                <div class="hud-stats">
                    <div class="hud-name">${esc(p.name)} <span>Lv ${p.level}</span><span class="hud-place">${esc(place)}</span></div>
                    <div class="hud-row"><span class="k">HP</span>${bar(p.hp, p.maxHp, 'hp')}<span class="v">${p.hp}<small>/${p.maxHp}</small></span></div>
                    <div class="hud-row"><span class="k">${esc(p.resource.type)}</span>${bar(p.resource.current, p.resource.max, 'res')}<span class="v">${p.resource.current}<small>/${p.resource.max}</small></span></div>
                </div>
            </div>
            ${objectiveHtml()}`;
        const face = els.hud.querySelector('canvas.face'); if (face && view.className) drawFace(face);
        // A marker for every tracked objective on this map (the first one is the main quest's when it's tracked).
        const here = trackedQuests().filter((o) => o.marker && session && o.marker.map === session.mapId)
            .map((o) => ({ x: o.marker.x * markerScale(o.marker.map), y: o.marker.y * markerScale(o.marker.map) }));
        view.markers = here;
        view.marker = here[0] || null;
        placeNotices();
    }
    /** The quests the player tracks (engine.trackedObjectives(), chosen in the journal), with where each one is. */
    function trackedQuests() {
        if (!engine.story) return [];
        const list = typeof engine.trackedObjectives === 'function' ? engine.trackedObjectives() : [engine.trackedObjective()].filter(Boolean);
        return list.map((o) => ({ ...o, where: o.marker && session && o.marker.map !== session.mapId && WORLD.maps[o.marker.map] ? WORLD.maps[o.marker.map].name : null }));
    }
    /** The tracked objectives (top right) and where they are. */
    function objectiveHtml() {
        const list = trackedQuests();
        if (!list.length) return '';
        return `<div class="hud-obj">${list.map((o) => `<div class="hud-obj-row${o.kind === 'main' ? '' : ' side'}"><span class="hud-quest">${esc(o.title)}</span>◆ ${esc(o.text)}${o.where ? ` <span class="hud-where">→ ${esc(o.where)}</span>` : ''}</div>`).join('')}</div>`;
    }
    /** Notifications sit under the quest tracker, however many quests it shows (world.css reads --tracker-bottom). */
    let trackerBottom = null;
    function placeNotices() {
        const stage = els.notices && els.notices.offsetParent;
        if (!stage) return;
        const tracker = [hud && !hud.el.hidden ? hud.el.querySelector('.ahud-quest') : null, els.hud.hidden ? null : els.hud.querySelector('.hud-obj')]
            .find((el) => el && !el.hidden && el.offsetParent);
        const v = tracker ? `${Math.round(tracker.getBoundingClientRect().bottom - stage.getBoundingClientRect().top + 6)}px` : '0px';
        if (v !== trackerBottom) { trackerBottom = v; stage.style.setProperty('--tracker-bottom', v); }
    }

    let bannerTimer = null;
    function showBanner(text) {
        els.banner.textContent = text;
        els.banner.hidden = false;
        els.banner.classList.remove('show'); void els.banner.offsetWidth; els.banner.classList.add('show');
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => { els.banner.hidden = true; }, 2600);
    }
    let toastTimer = null;
    function toast(text) {
        els.toast.textContent = text;
        els.toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2200);
    }

    // ---------------------------------------------------------------------
    // Notifications (Pixie, docs/ui/DIALOGUE_BOX.md): quest started or complete, objectives, XP, level
    // ups, items and Gold stack top right, beside the dialogue box and never inside it. They stay
    // visible while a conversation is open, fade on their own, and never need a key press.
    // ---------------------------------------------------------------------
    const NOTIFY_MAX = 5;
    const NOTIFY_MS = { quest: 6000, level: 6000, objective: 5000 };
    function notify(text, kind = 'quest') {
        if (!els.notices || !text) return;
        const el = document.createElement('div');
        el.className = `notice n-${kind}`;
        el.innerHTML = `<i aria-hidden="true">${NOTICE_ICON[kind] || '◆'}</i><span>${esc(text)}</span>`;
        els.notices.appendChild(el);
        while (els.notices.children.length > NOTIFY_MAX) els.notices.firstChild.remove();
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), REDUCED ? 0 : 400); }, NOTIFY_MS[kind] || 4000);
    }
    const NOTICE_ICON = { quest: '!', objective: '◆', xp: '✦', level: '▲', loot: '◈' };

    // ---------------------------------------------------------------------
    // The dialogue box (Pixie, docs/ui/DIALOGUE_BOX.md). Text comes a page at a time: at most two
    // sentences (ui/dialogue-pages.js), typed out, with the speaker on a nameplate. Enter, Space, E or a
    // left click finishes the typing, then turns the page; Esc closes. System lines go to notify().
    // ---------------------------------------------------------------------
    const DP = ENSO.dialoguePages;
    /** Text plus engine events -> paged box + notifications. `lead` is the place's or object's own text. */
    function showStory(lead, events, title, onClose, fallback) {
        const lines = [].concat(lead || []).filter(Boolean).map((text) => ({ text })).concat(readable(events || []));
        const { pages, notices } = DP.arrange(lines, { skipSpeaker: engine.player && engine.player.name });
        for (const n of notices) notify(n.text, n.kind);
        if (!pages.length && fallback && !notices.length) pages.push({ speaker: null, text: fallback });
        openPages(pages, title, onClose);
    }
    function openDialog(pages, title, onClose) {
        openPages(DP.arrange([].concat(pages).filter(Boolean)).pages, title, onClose);
    }
    function openPages(pages, title, onClose) {
        dialog = { pages, i: 0, title, onClose: onClose || null };
        if (!dialog.pages.length) { dialog = null; if (onClose) onClose(); return; }
        modal = 'dialog'; syncActionHudVisibility();
        muteHeldKeys();
        renderDialog();
    }
    /** Nameplate + page text; the text types itself out (instantly when motion is reduced). */
    function pageHtml(page, title, last, hint) {
        const name = page.speaker || title;
        return `${name ? `<div class="dialog-title nameplate">${esc(name)}</div>` : ''}
            <div class="dialog-text dialog-page" data-full="${esc(page.text)}">${esc(REDUCED ? page.text : '')}</div>
            ${hint ? `<div class="dialog-more" aria-hidden="true">${last ? '■' : '▼'}</div>` : ''}`;
    }
    let typing = null;   // { el, text, t0, timer }
    let closedAt = 0;    // a quick double press that closes the box must not also talk to the NPC again
    function startTyping() {
        stopTyping();
        const el = els.dialog.querySelector('.dialog-page');
        if (!el) return;
        const text = el.dataset.full || '';
        el.setAttribute('aria-label', text);
        if (REDUCED) { el.textContent = text; return; }
        typing = { el, text, t0: performance.now(), timer: 0 };
        const step = () => {
            if (!typing) return;
            const n = DP.revealed(text, performance.now() - typing.t0);
            el.textContent = text.slice(0, n);
            if (n >= text.length) { typing = null; return; }
            typing.timer = requestAnimationFrame(step);
        };
        step();
    }
    function stopTyping() { if (typing) { cancelAnimationFrame(typing.timer); typing = null; } }
    /** First press: show the whole page. Returns true if it did (so the press doesn't also turn the page). */
    function finishTyping() {
        if (!typing) return false;
        const t = typing; stopTyping();
        t.el.textContent = t.text;
        return true;
    }
    function renderDialog() {
        els.dialog.hidden = false;
        els.dialog.className = 'dialog paged';
        const last = dialog.i >= dialog.pages.length - 1;
        els.dialog.innerHTML = `${pageHtml(dialog.pages[dialog.i], dialog.title, last, true)}
            <div class="dialog-count" aria-hidden="true">${dialog.pages.length > 1 ? `${dialog.i + 1}/${dialog.pages.length}` : ''}</div>`;
        startTyping();
    }
    function advanceDialog(all) {
        if (!dialog) return;
        if (!all && finishTyping()) return;
        if (!all && dialog.i < dialog.pages.length - 1) { dialog.i++; renderDialog(); return; }
        stopTyping();
        els.dialog.hidden = true;
        els.dialog.className = 'dialog';
        modal = null; syncActionHudVisibility();
        muteHeldKeys();
        closedAt = performance.now();
        const cb = dialog.onClose; dialog = null;
        if (cb) cb();
    }
    /** A left click on the box is the same as Enter (choices take their own clicks). */
    els.dialog.addEventListener('click', (ev) => {
        if (ev.button !== 0 || ev.target.closest('.menu')) return;
        if (modal === 'dialog') advanceDialog(false);
        else if (modal === 'talk' && talk && talk.reading) talkAdvance();
        else if (modal === 'talk') finishTyping();
    });

    /** Engine text lines worth showing in a dialog or the battle log (drops the text game's menus and prompts). */
    function readable(events) {
        const out = [];
        let menuBlock = false;
        for (const ev of events) {
            if (ev.type !== 'text') continue;
            let t = ev.text;
            if (t === '--- Enemies ---' || /^Turn .+ on its allies:$/.test(t) || t === 'Speed order:') { menuBlock = true; continue; }   // the text game's menus (incl. Possession and turn order)
            if (menuBlock) { if (/^Type (a command|a move|'order')/.test(t)) menuBlock = false; continue; }
            if (!t.trim() || /^> /.test(t) || t === '(Type anything to continue.)' || t === '--- Your Turn! ---' || /^--- COMBAT INITIATED/.test(t) || /appears! \(HP: \d+\)$/.test(t)) continue;
            if (/^Type the name of a path/.test(t) || /^- [a-z_ ]+: /.test(t) || t === 'Choose your path:') continue;  // evolution prompt: shown as a menu
            if (/^ {2}\d+\. /.test(t)) continue;                                     // the text game's numbered dialogue choices: shown as a menu
            if (/^\(To buy: '/.test(t)) continue;                                      // text-game hint; the shop menu does this
            t = t.replace(/ Type 'start' to play again\.?/, '').replace(/ Type 'look'.*$/, '').replace(/ To build: '[^']*'\./, '');
            out.push({ text: ev.html ? t.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ') : t, important: ev.important, notice: ev.notice });
        }
        return out;
    }

    // ---------------------------------------------------------------------
    // Conversations (Chapter One). The engine holds the dialogue; this shows it and sends choices back.
    // Esc is a normal goodbye (so Shane still says his line); the engine decides what that means.
    // ---------------------------------------------------------------------
    function openTalk(events) {
        modal = 'talk'; syncActionHudVisibility();
        muteHeldKeys();
        els.prompt.hidden = true;
        renderTalk(events);
    }
    function renderTalk(events, conversationOnly = false) {
        const avail = engine.getAvailableActions();
        if (avail.awaiting !== 'dialogue') { closeTalk(events); return; }
        if (avail.shop && !conversationOnly) { renderShop(avail); return; }
        if (avail.kitchen && !conversationOnly) { kitchenEvents(events); renderKitchen(avail); return; }
        const { pages, notices } = DP.arrange(readable(events), { skipSpeaker: engine.player.name });
        for (const n of notices) notify(n.text, n.kind);
        const choices = avail.actions.filter((a) => a.type === 'dialogue_choice');
        const leave = () => renderTalk(engine.act({ type: 'dialogue_leave' }).events);
        const keep = talk && talk.npcId === avail.dialogue.npcId ? talk.lastPage : null;
        talk = { npcId: avail.dialogue.npcId, avail, pages, i: 0, reading: pages.length > 1, lastPage: pages[pages.length - 1] || keep };
        menu = makeMenu(choices.map((c) => ({ label: c.text, action: () => renderTalk(engine.act({ type: 'dialogue_choice', choiceId: c.choiceId }).events) })),
            { back: leave, render: () => drawTalk(avail, false) });
        drawTalk(avail, true);
    }
    /** Conversation state: the pages still to read, then the choices under the last one. */
    let talk = null;   // { npcId, avail, pages, i, reading, lastPage }
    function talkAdvance() {
        if (finishTyping()) return;
        talk.i++;
        talk.reading = talk.i < talk.pages.length - 1;
        drawTalk(talk.avail, true);
    }
    function talkSkip() { stopTyping(); talk.i = Math.max(0, talk.pages.length - 1); talk.reading = false; drawTalk(talk.avail, false); }
    function talkKey(ev) {
        if (ev.repeat) return;
        if (isAct(ev)) talkAdvance();
        else if (ev.key === 'Escape') talkSkip();
    }
    /** Shop goods and refusals come from the same engine checks as buy(). A smith's forge adds a Temper page
     *  (weapon tempering, docs/design/ARMOR_AND_TEMPERING.md). `page` is 'buy', 'sell' or 'temper'
     *  (true/false are the older sell/buy flags). */
    function renderShop(avail, message = '', selected = 0, page = 'buy') {
        if (page === true) page = 'sell';
        if (page === false) page = 'buy';
        const back = () => renderTalk([], true);
        const tempering = avail.shop.tempering || [];
        const pages = ['buy', 'sell', ...(tempering.length ? ['temper'] : [])];
        if (!pages.includes(page)) page = 'buy';
        const goods = page === 'sell' ? avail.shop.selling : page === 'temper' ? tempering : avail.shop.goods;
        const title = { buy: 'Buy', sell: 'Sell', temper: 'Temper' }[page];
        const row = (good) => page === 'temper'
            ? { label: `${good.name}${good.equipped ? ' (in hand)' : ''} · to +${good.rank}${good.cost ? ` · ${good.cost.gold} Gold` : ''}`,
                sub: good.enabled ? Object.entries((good.cost && good.cost.materials) || {}).map(([m, n]) => `${n} ${m}`).join(', ') : good.reason.message }
            : { label: `${good.name || good.item} · ${good.price} Gold`,
                sub: `${page === 'sell' ? '' : `${good.remaining} left · `}Owned ${good.owned}${good.enabled ? '' : ` · ${good.reason.message}`}` };
        const done = (good, result) => {
            if (!result.ok) return result.error.message;
            if (page === 'temper') return `Tempered ${good.name} to +${good.rank}.`;
            return `${page === 'sell' ? 'Sold' : 'Purchased'} ${good.name || good.item} for ${good.price} Gold.`;
        };
        const others = pages.filter((p) => p !== page).map((p) => ({ label: { buy: 'Buy goods', sell: 'Sell from bag', temper: 'Temper a weapon' }[p], action: () => renderShop(avail, '', 0, p) }));
        menu = makeMenu([...goods.map((good, index) => ({
            ...row(good),
            disabled: !good.enabled,
            action: () => {
                const result = engine.act({ type: page, shopId: good.shopId, item: good.item });
                updateHud();
                renderShop(engine.getAvailableActions(), done(good, result), index, page);
            }
        })), ...others, { label: 'Back to conversation', action: back }], { back, render: draw });
        menu.index = Math.min(selected, menu.items.length - 1);
        draw();
        function draw() {
            const good = goods[menu.index];
            stopTyping();
            els.dialog.hidden = false;
            els.dialog.className = 'dialog';
            els.dialog.innerHTML = `<div class="dialog-title">${esc(avail.dialogue.name)} · ${title} <span class="dialog-role">${avail.shop.gold} Gold</span></div>
                ${menuHtml(menu, 'shop-goods')}
                <div class="shop-detail">${esc(good ? good.description : menu.items[menu.index].label)}</div>
                <div class="shop-message" role="status">${esc(message)}</div>
                <div class="dialog-keys">↑ ↓ choose · Enter ${page === 'temper' ? 'temper' : page === 'sell' ? 'sell one' : 'buy one'} · Esc back</div>`;
            bindMenuClicks(els.dialog, menu);
            const selectedRow = els.dialog.querySelector('.selected');
            if (selectedRow) selectedRow.scrollIntoView({ block: 'nearest' });
        }
    }

    // ---------------------------------------------------------------------
    // The cooking menu (Tokelo, playtest 2026-11-11: "crafting from a chat box is not a standard gaming mechanic").
    // A hearth opens a pantry, a pot with four slots and the recipe book. Drag (or click) ingredients into the pot;
    // when the pot holds exactly a recipe, Cook makes it. Clicking a recipe fills the pot for you. The engine's
    // kitchenView() says what can be cooked and act({ type: 'cook' }) does it, with the same check.
    // ---------------------------------------------------------------------
    const POT_SLOTS = 4;
    let kitchen = null;   // { npcId, pot: [{ item, qty }], message }
    const potCount = (item) => (kitchen.pot.find((x) => x.item === item) || { qty: 0 }).qty;
    /** The recipe the pot holds exactly (same ingredients, same amounts), or null. */
    function potRecipe(k) {
        const pot = kitchen.pot;
        return k.recipes.find((r) => r.ingredients.length === pot.length && r.ingredients.every((x) => potCount(x.item) === x.qty)) || null;
    }
    function kitchenEvents(events) {
        if (!events || !events.length) return '';
        const { pages, notices } = DP.arrange(readable(events), { skipSpeaker: engine.player.name });
        for (const n of notices) notify(n.text, n.kind);
        return pages.map((p) => p.text).join(' ');
    }
    function potAdd(item, k) {
        const have = (k.pantry.find((x) => x.item === item) || { owned: 0 }).owned;
        const slot = kitchen.pot.find((x) => x.item === item);
        if (slot) { if (slot.qty < have) slot.qty++; else kitchen.message = `You only have ${have} ${item}.`; }
        else if (kitchen.pot.length >= POT_SLOTS) kitchen.message = 'The pot is full. Take something out first.';
        else if (have > 0) kitchen.pot.push({ item, qty: 1 });
    }
    function potRemove(item) {
        const slot = kitchen.pot.find((x) => x.item === item);
        if (!slot) return;
        if (--slot.qty <= 0) kitchen.pot = kitchen.pot.filter((x) => x !== slot);
    }
    function potFill(r) {
        kitchen.pot = r.ingredients.slice(0, POT_SLOTS).map((x) => ({ item: x.item, qty: Math.min(x.qty, x.have) })).filter((x) => x.qty > 0);
        kitchen.message = r.enabled ? '' : (r.reason && r.reason.message) || '';
        kitchen.picked = r.id;
    }
    function kitchenCook(r) {
        const res = engine.act({ type: 'cook', recipeId: r.id });
        const said = kitchenEvents(res.events);
        updateHud();
        kitchen.message = res.ok ? (said || `${r.verb} ${r.yield > 1 ? `${r.yield} ` : ''}${r.output}.`) : res.error.message;
        const next = engine.getAvailableActions();
        if (next.awaiting !== 'dialogue' || !next.kitchen) { renderTalk([], true); return; }
        const again = next.kitchen.recipes.find((x) => x.id === r.id);
        if (!again || !again.enabled) kitchen.pot = [];   // keep the pot filled while there's enough for another
        renderKitchen(next);
    }
    function renderKitchen(avail) {
        const k = avail.kitchen;
        if (!kitchen || kitchen.npcId !== avail.dialogue.npcId) kitchen = { npcId: avail.dialogue.npcId, pot: [], message: '', picked: null };
        // The pot never holds more than you carry (you may have eaten or cooked since).
        kitchen.pot = kitchen.pot.map((x) => ({ ...x, qty: Math.min(x.qty, (k.pantry.find((p) => p.item === x.item) || { owned: 0 }).owned) })).filter((x) => x.qty > 0);
        const leave = () => { kitchen = null; renderTalk(engine.act({ type: 'dialogue_leave' }).events); };
        const match = potRecipe(k);
        const recipes = k.recipes.slice().sort((a, b) => (b.enabled - a.enabled));
        menu = makeMenu([
            ...recipes.map((r) => ({
                label: `${r.output}${r.yield > 1 ? ` ×${r.yield}` : ''}`,
                sub: r.ingredients.map((x) => `${x.qty} ${x.item}${x.have < x.qty ? ` (${x.have})` : ''}`).join(' · '),
                recipe: r,
                action: () => { if (match && match.id === r.id && r.enabled) kitchenCook(r); else { potFill(r); renderKitchen(engine.getAvailableActions()); } }
            })),
            { label: 'Leave the hearth', action: leave }
        ], { back: leave, render: draw });
        const keep = kitchen.picked ? menu.items.findIndex((it) => it.recipe && it.recipe.id === kitchen.picked) : -1;
        if (keep >= 0) menu.index = keep;
        draw();
        function draw() {
            stopTyping();
            const m = potRecipe(k);
            const sel = menu.items[menu.index] && menu.items[menu.index].recipe;
            const slots = Array.from({ length: POT_SLOTS }, (_, i) => kitchen.pot[i]);
            els.dialog.hidden = false;
            els.dialog.className = 'dialog kitchen';
            els.dialog.innerHTML = `<div class="dialog-title">${esc(avail.dialogue.name)} <span class="dialog-role">Cooking</span></div>
                <div class="kitchen-grid">
                  <section class="kitchen-pantry" aria-label="Your ingredients">
                    <div class="kitchen-head">Your bag</div>
                    <div class="kitchen-slots">${k.pantry.length ? k.pantry.map((p) => {
                        const left = p.owned - potCount(p.item);
                        return `<button type="button" class="k-slot k-item${left <= 0 ? ' used' : ''}" draggable="true" data-item="${esc(p.item)}" title="${esc(p.item)}${p.description ? ` · ${esc(p.description)}` : ''}">
                            <span class="k-name">${esc(p.item)}</span><span class="k-qty">×${left}</span></button>`;
                    }).join('') : '<div class="kitchen-empty">Nothing you carry cooks here. Buy or grow some ingredients.</div>'}</div>
                  </section>
                  <section class="kitchen-pot" aria-label="The pot">
                    <div class="kitchen-head">The pot</div>
                    <div class="kitchen-slots pot-slots">${slots.map((x, i) => x
                        ? `<button type="button" class="k-slot k-pot filled" data-slot="${i}" data-item="${esc(x.item)}" title="Take one out"><span class="k-name">${esc(x.item)}</span><span class="k-qty">×${x.qty}</span></button>`
                        : `<div class="k-slot k-pot empty" data-slot="${i}" aria-label="Empty slot"></div>`).join('')}</div>
                    <div class="kitchen-result${m ? (m.enabled ? ' ready' : ' blocked') : ''}">${m
                        ? `→ <b>${esc(m.output)}${m.yield > 1 ? ` ×${m.yield}` : ''}</b>${m.description ? `<span class="k-desc">${esc(m.description)}</span>` : ''}`
                        : kitchen.pot.length ? 'That makes nothing yet.' : 'Drag ingredients here, or pick a recipe.'}</div>
                    <div class="kitchen-actions">
                      <button type="button" class="k-btn k-cook"${m && m.enabled ? '' : ' disabled'}>Cook</button>
                      <button type="button" class="k-btn k-clear"${kitchen.pot.length ? '' : ' disabled'}>Empty pot</button>
                    </div>
                  </section>
                  <section class="kitchen-book" aria-label="Recipes">
                    <div class="kitchen-head">Recipes</div>
                    ${menuHtml(menu, 'kitchen-recipes')}
                  </section>
                </div>
                <div class="shop-message" role="status">${esc(kitchen.message || (sel && !sel.enabled && sel.reason ? sel.reason.message : ''))}</div>
                <div class="dialog-keys">Drag or click ingredients into the pot · ↑ ↓ recipe · Enter fill pot, Enter again cook · Esc leave</div>`;
            bindMenuClicks(els.dialog, menu);
            const again = () => { kitchen.message = ''; renderKitchen(engine.getAvailableActions()); };
            els.dialog.querySelectorAll('.k-item').forEach((b) => {
                b.addEventListener('click', () => { kitchen.message = ''; potAdd(b.dataset.item, k); kitchen.picked = null; renderKitchen(engine.getAvailableActions()); });
                b.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/plain', b.dataset.item); ev.dataTransfer.effectAllowed = 'copy'; });
            });
            els.dialog.querySelectorAll('.k-pot.filled').forEach((b) => {
                b.addEventListener('click', () => { potRemove(b.dataset.item); again(); });
                b.draggable = true;
                b.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('application/x-enso-pot', b.dataset.item); ev.dataTransfer.effectAllowed = 'move'; });
            });
            const pot = els.dialog.querySelector('.kitchen-pot');
            pot.addEventListener('dragover', (ev) => { ev.preventDefault(); pot.classList.add('drop'); });
            pot.addEventListener('dragleave', () => pot.classList.remove('drop'));
            pot.addEventListener('drop', (ev) => { ev.preventDefault(); const item = ev.dataTransfer.getData('text/plain'); if (item) { kitchen.message = ''; potAdd(item, k); kitchen.picked = null; renderKitchen(engine.getAvailableActions()); } });
            // Drag a pot ingredient back to the bag: it comes out of the pot.
            const bag = els.dialog.querySelector('.kitchen-pantry');
            bag.addEventListener('dragover', (ev) => { if ([...ev.dataTransfer.types].includes('application/x-enso-pot')) ev.preventDefault(); });
            bag.addEventListener('drop', (ev) => { const item = ev.dataTransfer.getData('application/x-enso-pot'); if (item) { ev.preventDefault(); const s = kitchen.pot.find((x) => x.item === item); if (s) kitchen.pot = kitchen.pot.filter((x) => x !== s); again(); } });
            els.dialog.querySelector('.k-cook').addEventListener('click', () => { const r = potRecipe(k); if (r && r.enabled) kitchenCook(r); });
            els.dialog.querySelector('.k-clear').addEventListener('click', () => { kitchen.pot = []; kitchen.picked = null; again(); });
            const selectedRow = els.dialog.querySelector('.kitchen-recipes .selected');
            if (selectedRow) selectedRow.scrollIntoView({ block: 'nearest' });
        }
    }

    /** One page of the conversation. While pages remain: the page and ▼. On the last page: the choices too.
     *  `type` restarts the typewriter (a new page); menu moves redraw without retyping. */
    function drawTalk(avail, type) {
        const d = avail.dialogue;
        if (!type) stopTyping();
        els.dialog.hidden = false;
        els.dialog.className = 'dialog paged talk';
        const page = talk.pages[talk.i] || talk.lastPage;
        const speaker = page && page.speaker && page.speaker !== d.name ? page.speaker : null;
        const title = `<div class="dialog-title nameplate">${esc(speaker || d.name)}${!speaker && d.title ? ` <span class="dialog-role">${esc(d.title)}</span>` : ''}</div>`;
        const portrait = !speaker && PORTRAITS[d.npcId];
        const text = page ? `<div class="dialog-text dialog-page talk-text" data-full="${esc(page.text)}">${esc(type && !REDUCED ? '' : page.text)}</div>` : '';
        const count = talk.pages.length > 1 ? `<div class="dialog-count" aria-hidden="true">${Math.min(talk.i + 1, talk.pages.length)}/${talk.pages.length}</div>` : '';
        els.dialog.innerHTML = `${portrait ? `<div class="talk-head"><canvas class="portrait" width="16" height="16" aria-hidden="true"></canvas>${title}</div>` : title}
            ${text}${count}
            ${talk.reading ? '<div class="dialog-more" aria-hidden="true">▼</div><div class="dialog-keys">Enter / click next · Esc skip</div>'
                : `${menuHtml(menu, 'talk-choices')}<div class="dialog-keys">↑ ↓ choose · Enter say · Esc goodbye</div>`}`;
        if (!talk.reading) bindMenuClicks(els.dialog, menu);
        if (portrait) drawPixels(els.dialog.querySelector('canvas.portrait'), portrait.rows, portrait.colours());
        if (type) startTyping();
    }
    /** Speaker portraits by npc id: pixel rows plus colours read from the palette tokens. */
    const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const PORTRAITS = {
        crow: { rows: CV.CROW_PORTRAIT, colours: () => ({ k: token('--c-crow'), s: token('--c-crow-sheen'), e: token('--c-gold'), b: token('--c-ink-mute'), p: token('--c-frame') }) }
    };
    function drawPixels(cv, rows, colours) {
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        rows.forEach((row, y) => [...row].forEach((c, x) => { if (colours[c]) { g.fillStyle = colours[c]; g.fillRect(x, y, 1, 1); } }));
    }
    function closeTalk(events) {
        stopTyping();
        els.dialog.hidden = true;
        els.dialog.className = 'dialog';
        modal = null; syncActionHudVisibility();
        menu = null;
        talk = null;
        kitchen = null;
        closedAt = performance.now();
        updateHud();
        showStory(null, events, null, afterStory);
    }
    /** After anything that can complete a quest: the HUD, and the evolution choice if one is due. */
    function afterStory() {
        updateHud();
        if (engine.mode === 'branch_select' && modal === null) openBranchMenu();
    }

    // ---------------------------------------------------------------------
    // Main menu (Esc; Pixie UI-3 / UI-6, docs/ui/STYLE_GUIDE.md): tabs on the left, the tab's page on the
    // right. ↑↓ choose a tab and preview it; Enter or → goes into its list; Esc or ← comes back out.
    // Items and Equipment show the engine's own answers (getAvailableActions, getEquipment) and send
    // its actions; this file never decides what can be used or worn.
    // ---------------------------------------------------------------------
    const MM = ENSO.mainMenu;
    const MM_TABS_ALL = [
        { id: 'status', label: 'Status', sub: 'Your character, stats and gear.' },
        { id: 'items', label: 'Items', sub: 'Use what you carry.' },
        { id: 'equipment', label: 'Equipment', sub: 'Change your gear and compare stats.' },
        { id: 'skillbar', label: 'Skill bar', sub: 'The six skills on keys 1-6 in a real-time fight.' },   // real-time fights only
        { id: 'web', label: 'Skill Web', sub: 'Spend points in your class web, and beyond its gateways.' },
        { id: 'journal', label: 'Journal', sub: 'Your quests and what to do next.' },
        { id: 'crow', label: 'Crow', sub: 'Black Flight and the crow\'s counsel.' },     // only once the engine offers it
        { id: 'settings', label: 'Settings', sub: 'Display, controls, save files and this run.' },
        { id: 'save', label: 'Save game', sub: 'Keeps your place in this browser. It also saves itself every minute and in each new area. Settings can export a save file.' },
        { id: 'quit', label: 'Quit to title', sub: 'Anything since your last save is lost.' }
    ];
    let mmTabs = MM_TABS_ALL;
    let mm = { tab: 0, focus: 'tabs', slot: null, note: '', fly: null };
    function openPause(note) {
        modal = 'pause'; syncActionHudVisibility();
        muteHeldKeys();
        els.hud.hidden = true;
        const crow = CV.crowView(engine.getAvailableActions()).any;     // the Crow tab exists once the seal is open
        const bar = engine.combatMode !== 'turn';
        mmTabs = MM_TABS_ALL.filter((t) => (t.id !== 'crow' || crow) && (t.id !== 'skillbar' || bar));
        mm = { tab: Math.min(mm.tab || 0, mmTabs.length - 1), focus: 'tabs', slot: null, barSlot: null, note: note || '', fly: null };
        focusTabs();
    }
    function focusTabs() {
        mm.focus = 'tabs'; mm.slot = null; mm.barSlot = null; mm.fly = null; mm.web = null; mm.webScreen = null;
        menu = makeMenu(mmTabs.map((t) => ({ label: t.label, sub: t.sub, action: () => runTab(t.id) })),
            { back: closePause, render: () => { if (mm.tab !== menu.index) mm.note = ''; mm.tab = menu.index; renderMain(); } });   // a note belongs to the tab it came from
        menu.index = mm.tab;
        renderMain();
    }
    function runTab(id) {
        if (id === 'save') { const ok = engine.canSave ? engine.canSave() : { ok: true }; mm.note = ok.ok ? saveGame() : ok.error.message; renderMain(); return; }
        if (id === 'quit') { showTitle(); return; }
        enterList(id, 0);
    }
    /** The list inside a tab (or, in Equipment, a slot's choices). `at` keeps the cursor after an action. */
    function enterList(id, at) {
        let items = null;
        const again = (fn) => () => { const i = menu.index; fn(); enterList(id, i); };
        if (id === 'items') {
            const v = MM.itemsView(engine.getAvailableActions(), engine.getState().player.inventory, engine.itemDefinitions());
            items = v.usable.map((u) => ({ label: `${u.item}${u.count > 1 ? ` ×${u.count}` : ''}`, sub: u.enabled ? u.description : (u.reason ? u.reason.message : ''), disabled: !u.enabled,
                action: (engine.itemDefinitions()[u.item] || {}).use === 'camp'
                    // Hakon's camp kit (C2S2): making camp opens its hearth, so the menu gives way to the cooking pot.
                    ? () => { const r = engine.act({ type: 'use_item', item: u.item }); updateHud();
                        if (engine.getAvailableActions().awaiting === 'dialogue') { closePause(); openTalk(r.events); }
                        else { mm.note = readable(r.events).map((l) => l.text).join(' '); enterList(id, menu.index); } }
                    : again(() => { mm.note = actLines({ type: 'use_item', item: u.item }); }) }));
        }
        if (id === 'items') {
            const claim = engine.getAvailableActions().actions.find(a => a.type === 'claim_loot');
            if (claim) items.push({ label: 'Collect pending loot', disabled: !claim.enabled, sub: claim.reason?.message, action: again(() => { mm.note = actLines({ type: 'claim_loot' }); }) });
        }
        if (id === 'equipment' && !mm.slot) {
            items = MM.slotsView(engine.getEquipment()).map((r) => ({ label: `${r.label}: ${r.item ? engine.itemName(r.item) : '—'}`, sub: r.candidates.length ? `${r.candidates.length} to choose from` : r.item ? 'Nothing else fits here' : 'Nothing that fits',
                disabled: !r.candidates.length && !r.item, action: () => { mm.slot = r.slot; enterList('equipment', 0); } }));
        }
        if (id === 'equipment' && mm.slot) {
            const row = MM.slotsView(engine.getEquipment()).find((r) => r.slot === mm.slot);
            items = row.candidates.map((c) => ({ label: c.name || c.item, sub: c.enabled ? `${c.diffText}${c.description ? ` · ${c.description}` : ''}` : c.reason.message, disabled: !c.enabled, diff: c.diff,
                action: () => { mm.note = actLines({ type: 'equip', item: c.item }); mm.slot = null; enterList('equipment', MM.SLOTS.findIndex((x) => x.slot === row.slot)); } }));
            if (row.item) items.push({ label: `Take off ${engine.itemName(row.item)}`, sub: 'Back into your bag.', action: () => { mm.note = actLines({ type: 'unequip', slot: row.slot }); mm.slot = null; enterList('equipment', MM.SLOTS.findIndex((x) => x.slot === row.slot)); } });
        }
        if (id === 'journal') items = journalItems();
        if (id === 'skillbar') items = skillBarItems();
        if (id === 'web') items = skillWebItems();
        if (id === 'settings') {
            items = [{ label: `Display: ${ENSO.display.LABELS[displayMode]}`, sub: ENSO.display.HELP[displayMode], action: again(() => { mm.note = cycleDisplay(); }) },
                { label: `Motion: ${MOTION_LABELS[motionMode]}`, sub: MOTION_HELP[motionMode], action: again(() => { mm.note = cycleMotion(); }) }];
            if (ENSO.gfx && ENSO.gfx.setQuality) items.push({ label: `Graphics: ${gfxQuality() === 'low' ? 'Low' : 'High'}`, sub: 'High: lighting, bloom and grading. Low: plain canvas for weak devices. Applies on next load.',
                action: again(() => { const q = gfxQuality() === 'low' ? 'high' : 'low'; ENSO.gfx.setQuality(q); mm.note = `Graphics: ${q === 'low' ? 'Low' : 'High'}. Reload the page to apply.`; }) });
            items.push({ label: 'Export save file', sub: 'Download your save. Load it from the title screen of a newer version of the game, or on another computer.', action: again(() => { mm.note = exportSave(); }) });
        }
        if (id === 'crow' && mm.fly) {
            const f = mm.fly;
            items = [{ label: `Fly to ${f.name}`, sub: f.region || 'Dissolve into feathers and return there.', action: () => blackFlight(f) },
                { label: 'Stay', sub: 'Back to the list.', action: () => { mm.fly = null; enterList('crow', 0); } }];
        }
        if (id === 'crow' && !mm.fly) {
            const v = CV.crowView(engine.getAvailableActions());
            items = [];
            if (v.talk) items.push({ label: 'Talk to the crow', sub: v.talk.enabled ? 'Ask about this place, your quest or where you have been.' : v.talk.reason, disabled: !v.talk.enabled, action: talkCrow });
            for (const f of v.flights) items.push({ label: `${f.here ? '◆ ' : ''}${f.name}`, sub: f.why, disabled: !f.enabled, action: () => { mm.fly = f; enterList('crow', 0); } });
        }
        if (!items || !items.length) { renderMain(); return; }          // Status (and a journal with nothing active) are pages, not lists
        mm.focus = 'list';
        const slotBack = mm.slot ? () => { const i = MM.SLOTS.findIndex((x) => x.slot === mm.slot); mm.slot = null; enterList('equipment', i); }
            : mm.barSlot != null ? () => { const i = mm.barSlot; mm.barSlot = null; enterList('skillbar', i); }
            : mm.web ? () => { mm.web = null; enterList('web', 0); }
            : mm.fly ? () => { mm.fly = null; enterList('crow', 0); } : null;
        menu = makeMenu(items, { back: slotBack || focusTabs, render: renderMain });
        if (at != null && at < items.length) menu.index = at;
        renderMain();
    }
    /** Skill bar (combat v2): the six slots, then for a chosen slot the learned skills that can go there.
     *  The engine keeps the bar and refuses anything it won't allow (set_skill_slot); a skill already on the bar swaps. */
    function skillBarInfo() {
        const p = engine.getState().player;
        const detail = Object.fromEntries(p.skills.map((k) => [k.name, k.detail || '']));
        const bar = typeof engine.getSkillBar === 'function' ? engine.getSkillBar() : [];
        const onBar = new Set(bar.map((b) => b.skillId).filter(Boolean));
        const bench = typeof engine.skillBarBench === 'function' ? engine.skillBarBench() : p.skills.map((k) => k.name).filter((n) => !onBar.has(n));
        return { bar, bench, detail };
    }
    function skillBarItems() {
        const { bar, bench, detail } = skillBarInfo();
        if (mm.barSlot == null) {
            return bar.map((b) => ({ label: `${b.slot + 1} · ${b.skillId || '— empty —'}`, sub: b.skillId ? (detail[b.skillId] || 'On the bar.') : 'Choose a skill for this key.',
                action: () => { mm.barSlot = b.slot; enterList('skillbar', 0); } }));
        }
        const slot = mm.barSlot;
        const set = (skillId) => () => { mm.note = actLines({ type: 'set_skill_slot', slot, skillId }); mm.barSlot = null; enterList('skillbar', slot); };
        const here = (bar[slot] || {}).skillId;
        const items = bench.map((name) => ({ label: name, sub: detail[name] || 'Learned, not on the bar.', action: set(name) }));
        for (const b of bar) if (b.skillId && b.slot !== slot) items.push({ label: `${b.skillId} (slot ${b.slot + 1})`, sub: `Swap: ${here ? `${here} goes to slot ${b.slot + 1}` : `slot ${b.slot + 1} is left empty`}.`, action: set(b.skillId) });
        if (here) items.push({ label: `Clear slot ${slot + 1}`, sub: `Take ${here} off the bar.`, action: set(null) });
        return items;
    }
    /** Skill Web (docs/design/SKILL_WEB.md): the webs you can open, then a web's skills; specialization and path.
     *  Everything comes from engine.getSkillWeb() and goes back as its actions (learn_node, unlearn_node, …). */
    const SW = ENSO.skillWebView;
    function skillWebItems() {
        const view = engine.getSkillWeb();
        if (!view) return [];
        const stay = (i) => enterList('web', i);
        if (mm.web && mm.web.webId) {
            return SW.rows(view, mm.web.webId).map((r, i) => ({ label: `${r.state === 'owned' ? '✓ ' : r.state === 'available' ? '+ ' : ''}${r.label}`, sub: r.sub, disabled: !r.action, nodeId: r.id,
                action: () => { mm.note = actLines({ type: r.action === 'learn' ? 'learn_node' : 'unlearn_node', nodeId: r.id }); stay(i); } }));
        }
        if (mm.web && mm.web.sub === 'spec') {
            return view.specializations.map((x) => ({ label: x.name, sub: view.specialization && view.specialization.branchId === x.branchId ? 'You walk as this now.' : 'Walk as this: its title, resource and mechanics.',
                action: () => { mm.note = actLines({ type: 'set_specialization', branchId: x.branchId }); mm.web = null; stay(0); } }));
        }
        if (mm.web && mm.web.sub === 'guide') {
            const tree = DATA.evolutionPaths[engine.getState().player.className] || { branches: {} };
            const items = Object.keys(tree.branches).map((b) => ({ label: tree.branches[b].name, sub: view.guide === b ? 'Guiding your points now.' : `Points follow this path as you level. ${tree.branches[b].theme}`,
                action: () => { mm.note = actLines({ type: 'set_web_guide', branchId: b }); mm.web = null; stay(0); } }));
            items.push({ label: 'Walk freely', sub: 'No path: you spend every point yourself.', action: () => { mm.note = actLines({ type: 'set_web_guide', branchId: null }); mm.web = null; stay(0); } });
            return items;
        }
        const items = SW.webs(view).map((w) => ({ label: `${w.kind === 'legendary' ? '★ ' : ''}${w.name} web${w.learnable ? ` (${w.learnable} to learn)` : ''}`, sub: w.why, webId: w.webId,
            action: () => openWebScreen(w.webId) }));
        if (view.specializations.length) items.push({ label: `Walk as: ${view.specialization ? view.specialization.name : 'none'}`, sub: 'Choose which of your specializations you walk as.', action: () => { mm.web = { sub: 'spec' }; stay(0); } });
        items.push({ label: `Path: ${view.guide ? (DATA.evolutionPaths[engine.getState().player.className].branches[view.guide] || { name: view.guide }).name : 'walking freely'}`, sub: 'A path learns its skills for you as you level.', action: () => { mm.web = { sub: 'guide' }; stay(0); } });
        return items;
    }
    // The full Skill Web screen (Tokelo's reference, 2026-11-02): the web as a radial picture around its emblem,
    // a wedge per branch, learned paths glowing; your attributes and the chosen node on the right.
    // Arrows travel between nodes, Enter learns or unlearns, [ ] or Q / R switch webs, Esc goes back to the menu.
    function openWebScreen(webId) {
        const view = engine.getSkillWeb();
        if (!view) return;
        const ids = SW.webs(view).map((w) => w.webId);
        const id = ids.includes(webId) ? webId : ids[0];
        mm.webScreen = { webId: id, sel: SW.startNode(SW.scene(view, id)), note: '' };
        renderWebScreen();
    }
    function closeWebScreen() {
        const webId = mm.webScreen && mm.webScreen.webId;
        mm.webScreen = null;
        mm.note = '';
        enterList('web', Math.max(0, SW.webs(engine.getSkillWeb()).findIndex((w) => w.webId === webId)));
    }
    function webBranchNames() {
        const out = {};
        for (const tree of Object.values(DATA.evolutionPaths)) for (const [k, b] of Object.entries(tree.branches)) out[k] = b.name;
        return out;
    }
    function switchWeb(step) {
        const ids = SW.webs(engine.getSkillWeb()).map((w) => w.webId);
        if (ids.length < 2) return;
        const i = ids.indexOf(mm.webScreen.webId);
        mm.webScreen = { webId: ids[(i + step + ids.length) % ids.length], sel: null, note: '' };
        mm.webScreen.sel = SW.startNode(SW.scene(engine.getSkillWeb(), mm.webScreen.webId));
        renderWebScreen();
    }
    function webAct() {
        const card = SW.nodeCard(engine.getSkillWeb(), mm.webScreen.sel, (n) => engine.describeSkill(n));
        if (!card || !card.action) return;
        mm.webScreen.note = actLines({ type: card.action === 'learn' ? 'learn_node' : 'unlearn_node', nodeId: card.id });
        renderWebScreen();
    }
    function webKey(ev, dir) {
        if (ev.repeat && !dir) return;
        if (dir) {
            const sc = SW.scene(engine.getSkillWeb(), mm.webScreen.webId);
            const next = SW.nearest(sc, mm.webScreen.sel, dir);
            if (next) { mm.webScreen.sel = next; mm.webScreen.note = ''; renderWebScreen(); }
            return;
        }
        if (ev.key === '[' || ev.key === 'q' || ev.key === 'Q' || ev.key === 'PageUp') { switchWeb(-1); return; }
        if (ev.key === ']' || ev.key === 'r' || ev.key === 'R' || ev.key === 'PageDown') { switchWeb(1); return; }
        if (isAct(ev)) { webAct(); return; }
        if (ev.key === 'Escape' || ev.key === 'Backspace') closeWebScreen();
    }
    function renderWebScreen() {
        const view = engine.getSkillWeb();
        const ws = mm.webScreen;
        const p = engine.getState().player;
        const all = SW.webs(view);
        const w = all.find((x) => x.webId === ws.webId) || all[0];
        const sc = SW.scene(view, ws.webId, webBranchNames());
        const card = SW.nodeCard(view, ws.sel, (n) => engine.describeSkill(n));
        const cls = (DATA.basePlayerClasses[p.className] || {}).name || p.className;
        const stat = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
        els.pause.className = 'panel swx-screen win';
        els.pause.innerHTML = `
            <header class="swx-head">
                <span class="swx-points"><b>${view.points}</b> point${view.points === 1 ? '' : 's'} to spend<small>${view.earned} earned</small></span>
                <span class="swx-title">${all.length > 1 ? '<button class="swx-arrow" data-step="-1" aria-label="Previous web">‹</button>' : ''}<h2>${esc(w ? `${w.name} web` : 'Skill Web')}</h2>${all.length > 1 ? '<button class="swx-arrow" data-step="1" aria-label="Next web">›</button>' : ''}</span>
                <span class="swx-webs">${all.map((x) => `<i class="${x.webId === ws.webId ? 'on' : ''}" title="${esc(x.name)}"></i>`).join('')}</span>
            </header>
            <div class="swx-body">
                <div class="swx-stage">${SW.screenSvg(sc, ws.sel, { title: w ? `${w.name} web` : '' })}</div>
                <aside class="swx-side">
                    <section><h3>${esc(p.name)}</h3><p class="mm-dim">Lv ${p.level} ${esc(cls)}${view.specialization ? ` · ${esc(view.specialization.name)}` : ''}</p>
                        <dl class="swx-stats">${stat('HP', p.maxHp)}${stat(esc(p.resource.type), p.resource.max)}${stat('STR', p.strength)}${stat('INT', p.intelligence)}${stat('AGI', p.agility)}${stat('DEF', p.def)}${stat('Crit', `${Math.round(p.critChance * 100)}%`)}</dl>
                        <p class="mm-dim swx-small">Stats grow with your class, whatever you learn.</p></section>
                    <section class="swx-card">${card ? `<h3>${esc(card.title)}</h3><p class="swx-kind">${esc(card.kind)}</p>${card.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
                        <p class="swx-state">${esc(card.state)}</p>${card.action ? `<button class="swx-do">${esc(card.actionText)}</button>` : ''}` : '<p class="mm-dim">Choose a node.</p>'}</section>
                    ${ws.note ? `<p class="note">${esc(ws.note)}</p>` : ''}
                </aside>
            </div>
            <footer class="mm-foot"><p class="keys"><kbd>←↑↓→</kbd> move <kbd>Enter</kbd> learn / unlearn${all.length > 1 ? ' <kbd>Q</kbd> <kbd>R</kbd> other webs' : ''} <kbd>Esc</kbd> back</p></footer>`;
        els.pause.hidden = false;
        els.pause.querySelectorAll('.swx-node').forEach((g) => g.addEventListener('click', () => {
            if (mm.webScreen.sel === g.dataset.node) webAct(); else { mm.webScreen.sel = g.dataset.node; mm.webScreen.note = ''; renderWebScreen(); }
        }));
        els.pause.querySelectorAll('.swx-arrow').forEach((b) => b.addEventListener('click', () => switchWeb(+b.dataset.step)));
        const doBtn = els.pause.querySelector('.swx-do'); if (doBtn) doBtn.addEventListener('click', webAct);
    }
    function skillWebPage(inList, list) {
        const view = engine.getSkillWeb();
        if (!view) return '<p class="mm-dim">The Skill Web is closed to you.</p>';
        const hl = inList && menu.items[menu.index];
        const webId = (mm.web && mm.web.webId) || (hl && hl.webId) || engine.getState().player.className;
        const w = SW.webs(view).find((x) => x.webId === webId);
        const sealed = SW.sealedLegends(view);
        return `<p>${esc(SW.summary(view))}</p>
            <div class="mm-cols sw-cols"><div>${inList ? list : '<p class="mm-dim">Press <kbd>Enter</kbd> to open your webs.</p>'}</div>
            <figure class="sw-figure"><figcaption>${esc(w ? `${w.name} web` : webId)}</figcaption>${SW.svg(view, webId, hl && hl.nodeId)}
            <p class="sw-legend mm-dim">◆ skill · ● passive · ▲ gateway · bright = known · ringed = can learn</p></figure></div>
            ${sealed.length && !mm.web ? `<p class="mm-dim">Legends sleeping: ${sealed.map((x) => `${esc(x.name)} (needs ${esc(x.needs.join(', '))})`).join(' · ')}</p>` : ''}
            <p class="mm-dim">Your stats keep growing as your starting class, whatever you learn.</p>`;
    }
    /** Run an engine action from the menu and return what it said, for the note line. */
    function actLines(action) {
        const lines = readable(engine.act(action).events).map((l) => l.text).filter((t) => !/ vs .*: \{/.test(t));   // drop the text game's compare dump
        updateHud();
        return lines.join(' ');
    }
    function statusHtml(p, s) {
        const map = WORLD.maps[session.mapId];
        const cls = (DATA.basePlayerClasses[p.className] || {}).name || p.className;
        const eq = MM.slotsView(engine.getEquipment());
        return `<div class="mm-status">
                <canvas class="mm-sprite" width="32" height="36" aria-hidden="true"></canvas>
                <div class="mm-who"><div class="u-name">${esc(p.name)}</div>
                    <div class="mm-dim">${esc(cls)}${s.progression.branch ? ` · ${esc(s.progression.evolutionName)}` : ''} · Lv ${p.level}</div>
                    <div class="mm-dim">${esc(map.name)} · ${esc(WORLD.zones[map.zoneId].name)}</div></div>
            </div>
            <div class="mm-bars">
                <div class="stat"><span class="k">HP</span>${bar(p.hp, p.maxHp, 'hp')}<span class="v">${p.hp}<small>/${p.maxHp}</small></span></div>
                <div class="stat"><span class="k">${esc(p.resource.type)}</span>${bar(p.resource.current, p.resource.max, 'res')}<span class="v">${p.resource.current}<small>/${p.resource.max}</small></span></div>
                <div class="stat"><span class="k">XP</span>${bar(p.xp, p.xpToNext, 'xp')}<span class="v">${p.xp}<small>/${p.xpToNext}</small></span></div>
            </div>
            ${statsHtml(p, null)}
            <ul class="mm-gear">${eq.map((r) => `<li><span class="mm-dim">${esc(r.label)}</span> ${esc(r.item ? engine.itemName(r.item) : '—')}</li>`).join('')}<li><span class="mm-dim">Gold</span> ${p.gold || 0}</li></ul>`;
    }
    /** The stat block; with a candidate's diff it becomes the comparison (▲ better, ▼ worse, never colour alone). */
    function statsHtml(p, diff) {
        return `<dl class="mm-stats">${MM.statPreview(p, diff).map((r) => `<div class="${r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : ''}"><dt>${r.label}</dt><dd>${esc(r.valueText)}${r.delta ? ` <span class="arrow">${r.delta > 0 ? '▲' : '▼'}</span> ${esc(r.afterText)}` : ''}</dd></div>`).join('')}</dl>`;
    }
    function renderMain() {
        const s = engine.getState(), p = s.player;
        const tab = mmTabs[mm.tab].id;
        const inList = mm.focus === 'list';
        const tabsHtml = `<ul class="menu mm-tabs" role="tablist" aria-label="Menu">${mmTabs.map((t, i) => {
            const cls = !inList && i === menu.index ? 'selected' : i === mm.tab ? 'active' : '';
            return `<li role="tab" data-tab="${i}" data-id="${t.id}" aria-selected="${i === mm.tab}" class="${cls}"><span class="m-label">${esc(t.label)}</span></li>`;
        }).join('')}</ul>`;
        const list = inList ? commandHtml(menu).replace('b-commands', 'mm-list') : '';
        let page = '';
        if (tab === 'status') page = statusHtml(p, s);
        if (tab === 'items') {
            const v = MM.itemsView(engine.getAvailableActions(), p.inventory, engine.itemDefinitions());
            page = `<h3>Use</h3>${inList ? list : v.usable.length ? `<ul class="mm-plain">${v.usable.map((u) => `<li>${esc(u.item)}${u.count > 1 ? ` ×${u.count}` : ''}</li>`).join('')}</ul>` : '<p class="mm-dim">Nothing to use.</p>'}
                ${v.carrying.length ? `<h3>Carrying</h3><ul class="mm-plain mm-dim">${v.carrying.map((c) => `<li>${esc(engine.itemName(c.item))}${c.count > 1 ? ` ×${c.count}` : ''}</li>`).join('')}</ul>` : ''}`;
        }
        if (tab === 'equipment') {
            const hl = inList && menu.items[menu.index];
            const slotLabel = mm.slot ? MM.SLOTS.find((x) => x.slot === mm.slot).label : null;
            page = `<div class="mm-cols"><div><h3>${slotLabel ? esc(slotLabel) : 'Gear'}</h3>${inList ? list : `<ul class="mm-plain">${MM.slotsView(engine.getEquipment()).map((r) => `<li><span class="mm-dim">${esc(r.label)}</span> ${esc(r.item ? engine.itemName(r.item) : '—')}</li>`).join('')}</ul>`}</div>
                <div><h3>${hl && hl.diff ? 'If you wear it' : 'Stats'}</h3>${statsHtml(p, hl && hl.diff)}</div></div>`;
        }
        if (tab === 'journal') page = journalHtml(inList, list) || '<p class="mm-dim">No journal in this game.</p>';
        if (tab === 'web') page = skillWebPage(inList, list);
        if (tab === 'skillbar') {
            const { bar, bench } = skillBarInfo();
            page = `<h3>${mm.barSlot != null ? `Slot ${mm.barSlot + 1}: choose a skill` : 'Keys 1-6'}</h3>${inList ? list : `<ul class="mm-plain">${bar.map((b) => `<li><kbd>${b.slot + 1}</kbd> ${b.skillId ? esc(b.skillId) : '<span class="mm-dim">— empty —</span>'}</li>`).join('')}</ul>`}
                <h3>Not on the bar</h3>${bench.length ? `<ul class="mm-plain mm-dim">${bench.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p class="mm-dim">Every skill you know is on the bar.</p>'}
                <p class="mm-dim">Your basic attack needs no slot: <kbd>F</kbd> in a fight. The bar can't change during a fight.</p>`;
        }
        if (tab === 'settings') {
            page = `<h3>Display and motion</h3>${inList ? list : `<p>Display: ${esc(ENSO.display.LABELS[displayMode])} <span class="mm-dim">· ${esc(ENSO.display.HELP[displayMode])}</span></p><p>Motion: ${esc(MOTION_LABELS[motionMode])} <span class="mm-dim">· ${esc(MOTION_HELP[motionMode])}</span></p>`}
                <h3>Controls</h3><ul class="mm-plain">${engine.combatMode === 'action' ? '<li><kbd>WASD</kbd> move and face (8 ways) · click aims · keyboard attacks face forward · <kbd>Shift</kbd> sprint</li><li>Click or <kbd>1</kbd> attack · <kbd>2</kbd>–<kbd>6</kbd> <kbd>R</kbd> skills</li><li><kbd>Space</kbd> dodge · right-click or <kbd>Q</kbd> guard (press just before a hit to parry)</li><li><kbd>Tab</kbd> lock on · <kbd>E</kbd> inspect, talk, pick up · <kbd>H</kbd> quick heal · <kbd>Esc</kbd> this menu</li><li>Enemies fight you where they stand: no battle screen. Run far enough and they give up.</li>' : '<li><kbd>Arrows</kbd> or <kbd>WASD</kbd> walk, choose</li><li><kbd>E</kbd> <kbd>Enter</kbd> <kbd>Space</kbd> inspect, talk, confirm</li><li><kbd>Esc</kbd> this menu, back</li><li><kbd>L</kbd> battle log · walk into an enemy to fight it</li>'}${engine.combatMode === 'realtime' ? '<li>In a fight: <kbd>1</kbd>–<kbd>6</kbd> skills <kbd>F</kbd> basic attack <kbd>Tab</kbd> next target <kbd>I</kbd> items <kbd>H</kbd> quick heal <kbd>Esc</kbd> pause</li>' : ''}</ul>
                <h3>This run</h3><p class="mm-dim">Seed ${engine.seed}. To replay it, open <code>world.html?seed=${engine.seed}</code> and make the same moves.</p>`;
        }
        if (tab === 'crow') {
            const v = CV.crowView(engine.getAvailableActions());
            page = mm.fly ? `<p>${esc(CV.confirmText(mm.fly))}</p>${list}<p class="mm-dim">You arrive at a safe spot, as if you had walked there.</p>`
                : inList ? `${list}<p class="mm-dim">Black Flight takes you anywhere you have rested at a marked safe place. ◆ is where you are.</p>`
                : `${v.talk ? `<p>Talk to the crow <span class="mm-dim">· ${esc(v.talk.enabled ? 'ask about this place, your quest or where you have been' : v.talk.reason)}</span></p>` : ''}<h3>Black Flight</h3>${v.flights.length ? `<ul class="mm-plain">${v.flights.map((f) => `<li>${f.here ? '◆ ' : ''}${esc(f.name)} <span class="mm-dim">· ${esc(f.why)}</span></li>`).join('')}</ul>` : '<p class="mm-dim">No perches yet.</p>'}
                    <p class="mm-dim">The crow can take you anywhere you have rested at a marked safe place. ◆ is where you are.</p>`;
        }
        if (tab === 'save' || tab === 'quit') page = `<p class="mm-dim">${esc(mmTabs[mm.tab].sub)}</p><p>Press <kbd>Enter</kbd> to ${tab === 'save' ? 'save' : 'quit'}.</p>`;
        const keys = inList ? '<kbd>↑↓</kbd> choose <kbd>Enter</kbd> confirm <kbd>Esc</kbd> back'
            : `<kbd>↑↓</kbd> tabs ${['items', 'equipment', 'skillbar', 'web', 'journal', 'settings', 'crow'].includes(tab) || tab === 'save' || tab === 'quit' ? '<kbd>Enter</kbd> open ' : ''}<kbd>Esc</kbd> close`;
        els.pause.className = 'panel mm win';
        els.pause.innerHTML = `
            <nav class="mm-nav"><h2>Menu</h2>${tabsHtml}</nav>
            <section class="mm-page" aria-live="polite"><h2>${esc(mmTabs[mm.tab].label)}</h2>${page}</section>
            <footer class="mm-foot">${mm.note ? `<p class="note">${esc(mm.note)}</p>` : inList ? '' : `<p class="b-help">${esc(mmTabs[mm.tab].sub)}</p>`}<p class="keys">${keys}</p></footer>`;
        els.pause.hidden = false;
        els.pause.querySelectorAll('.mm-tabs li').forEach((li) => li.addEventListener('click', () => { mm.tab = +li.dataset.tab; focusTabs(); runTab(mmTabs[mm.tab].id); }));
        if (inList) bindMenuClicks(els.pause.querySelector('.mm-page'), menu);
        const sel = els.pause.querySelector('.mm-list li.selected'); if (sel) sel.scrollIntoView({ block: 'nearest' });
        const sprite = els.pause.querySelector('canvas.mm-sprite');
        if (sprite) {
            const g = sprite.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, sprite.width, sprite.height);
            ENSO.sprites.drawCharacter(g, 16, ENSO.sprites.characterFor(view.className).frame.h > 64 ? 39 : 34, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className, facing: 'down', anim: 'idle', scale: 1 }, 0);
        }
    }
    /** ← leaves a list, → opens the highlighted tab (keyboard and pad). */
    function mainMenuSideways(dir) {
        if (dir === 'left' && mm.focus === 'list') { menu.back(); return true; }
        if (dir === 'right' && mm.focus === 'tabs') { const t = mmTabs[menu.index]; if (!['save', 'quit'].includes(t.id)) runTab(t.id); return true; }
        return false;
    }
    /** The engine's journal: active quests with their current objective (◆ = on screen), then what's done.
     *  In its list, Enter shows or hides a quest on the tracker (the engine's track_quest; it refuses a fifth). */
    function journalHtml(inList, list) {
        const j = engine.story ? engine.getJournal() : null;
        if (!j) return '';
        const active = j.quests.filter((q) => q.state !== 'complete');
        const done = j.quests.filter((q) => q.state === 'complete');
        const kind = (q) => (q.kind === 'main' ? '' : q.kind === 'job' ? ' <span class="j-kind">job</span>' : ' <span class="j-kind">side</span>');
        const max = (ENSO.engineModules && ENSO.engineModules.story && ENSO.engineModules.story.TRACK_MAX) || 4;
        const shown = active.filter((q) => q.tracked).length;
        const hl = inList && menu.items[menu.index] && j.quests.find((q) => q.id === menu.items[menu.index].questId);
        const body = inList
            ? `${list}${hl ? `<p class="j-quest"><b>${esc(hl.title)}</b>${kind(hl)}<br>${hl.objective ? `◆ ${esc(hl.objective.text)}` : ''}${hl.summary ? `<br><i>${esc(hl.summary)}</i>` : ''}</p>` : ''}`
            : active.map((q) => `<p class="j-quest${q.tracked ? ' tracked' : ''}"><b>${q.tracked ? '◆ ' : ''}${esc(q.title)}</b>${kind(q)}<br>${q.objective ? `◆ ${esc(q.objective.text)}` : `<i>${esc(q.summary)}</i>`}</p>`).join('') || '<p>Nothing to do right now.</p>';
        const hint = active.some((q) => q.state === 'active') ? `<p class="mm-dim">On screen: ${shown} of ${max}. ${inList ? '<kbd>Enter</kbd> shows or hides a quest.' : 'Press <kbd>Enter</kbd> to choose which quests show on screen.'}</p>` : '';
        return `<section class="journal"><h3>Journal · ${esc(j.chapter)}</h3>${hint}
            ${body}
            ${done.length ? `<p class="j-done">Done: ${done.map((q) => esc(q.title)).join(' · ')}</p>` : ''}</section>`;
    }
    /** One row per active quest: ◆ tracked (on screen), ◇ not. The engine's track_quest options say what's allowed. */
    function journalItems() {
        const j = engine.story ? engine.getJournal() : null;
        if (!j) return [];
        const opts = engine.getAvailableActions().actions.filter((a) => a.type === 'track_quest');
        return opts.map((o) => {
            const q = j.quests.find((x) => x.id === o.questId) || { title: o.questId };
            return { label: `${o.tracked ? '◆' : '◇'} ${q.title}`, questId: o.questId, disabled: !o.enabled,
                sub: !o.enabled && o.reason ? o.reason.message : o.tracked ? 'On screen. Enter hides it.' : 'Hidden. Enter shows it on screen.',
                action: () => { const i = menu.index; mm.note = actLines({ type: 'track_quest', questId: o.questId, track: o.track }); enterList('journal', i); } };
        });
    }
    function closePause() { els.pause.hidden = true; els.pause.className = 'panel'; els.hud.hidden = false; modal = null; syncActionHudVisibility(); menu = null; muteHeldKeys(); }

    // ---------------------------------------------------------------------
    // The crow (Nahemoth's first aspect, docs/design/ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md).
    // The engine owns the anchors and every refusal; the world session moves you (as walking does).
    // ---------------------------------------------------------------------
    function talkCrow() {
        const r = engine.act({ type: 'talk_crow' });
        closePause();
        if (engine.getAvailableActions().awaiting === 'dialogue') openTalk(r.events);
        else showStory(null, r.events, 'Crow', afterStory, '…');
    }
    function blackFlight(f) {
        closePause();
        const r = typeof session.blackFlight === 'function' ? session.blackFlight(f.anchorId) : { type: 'refused', events: [] };
        if (r.type !== 'transition') { updateHud(); openDialog(readable(r.events || []).map((l) => l.text).join('\n') || CV.reasonText({ code: 'UNREACHABLE' }), 'Black Flight', afterStory); return; }
        feathersThen(() => startFade(r));
    }
    /** Nahemoth's original 12-frame, transparent sprite atlas by Sable.
     *  This is presentation only: the world/engine already authorized travel.
     *  Frames 0–5 depart; initiate map fade at frame 6; frames 6–11 reassemble.
     *  The single-file build inlines the SVG into this URL.
     */
    const BLACK_FLIGHT_ATLAS = 'assets/vfx/nahemoth/black-flight-atlas.svg';
    const BLACK_FLIGHT_TIMING = [75, 65, 60, 55, 55, 70, 70, 55, 55, 60, 65, 75];
    let blackFlightImage = null;
    let feathering = false;
    function feathersThen(fn) {
        if (REDUCED) { fn(); return; }
        const image = blackFlightImage || (blackFlightImage = new Image());
        if (!image.src) image.src = BLACK_FLIGHT_ATLAS;
        const play = () => {
            const stage = $('world-stage');
            const overlay = document.createElement('canvas');
            overlay.width = canvas.width; overlay.height = canvas.height;
            overlay.className = 'black-flight-vfx';
            overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:12;';
            overlay.setAttribute('aria-hidden', 'true');
            const g = overlay.getContext('2d');
            if (!g) { fn(); return; }
            g.imageSmoothingEnabled = false;
            stage.appendChild(overlay);
            feathering = true;
            let frame = 0, invoked = false;
            const draw = () => {
                g.clearRect(0, 0, overlay.width, overlay.height);
                // 96-pixel frames, centered over the player on the stage.
                g.drawImage(image, frame * 96, 0, 96, 96, 256, 144, 128, 128);
                if (frame === 6 && !invoked) { invoked = true; fn(); }
                if (++frame === BLACK_FLIGHT_TIMING.length) {
                    overlay.remove(); feathering = false;
                    if (!invoked) fn();
                } else setTimeout(draw, BLACK_FLIGHT_TIMING[frame - 1]);
            };
            draw();
        };
        if (image.complete && image.naturalWidth) play();
        else {
            image.addEventListener('load', play, { once: true });
            image.addEventListener('error', () => { feathering = false; fn(); }, { once: true });
        }
    }

    // ---------------------------------------------------------------------
    // Evolution: the engine asks for a branch at level 3
    // ---------------------------------------------------------------------
    function openBranchMenu() {
        modal = 'branch'; syncActionHudVisibility();
        muteHeldKeys();
        els.hud.hidden = true;
        const tree = DATA.evolutionPaths[engine.getState().player.className];
        const items = engine.getAvailableActions().actions.filter((o) => o.type === 'choose_branch').map((o) => {
            const b = tree.branches[o.branchId];
            if (!b) return { label: o.name, sub: 'No path: spend every Skill Web point yourself (Esc, Skill Web). Your stats still grow as your class.', action: () => chooseBranch(o.branchId) };
            const res = ((b.resourceEvolution || [])[0] || {}).type;
            return { label: o.name, sub: `${b.theme}${res ? ` · Resource: ${res}` : ''}`, action: () => chooseBranch(o.branchId) };
        });
        menu = makeMenu(items, { render: renderBranch });
        renderBranch();
    }
    function renderBranch() {
        els.pause.className = 'panel win';
        els.pause.innerHTML = `<h2>A surge of new power</h2><p>It's time to specialise. Choose a path to guide your Skill Web, or walk freely:</p>${menuHtml(menu)}<p class="keys">↑ ↓ choose · Enter confirm</p>`;
        els.pause.hidden = false;
        bindMenuClicks(els.pause, menu);
    }
    function chooseBranch(key) {
        const events = engine.act({ type: 'choose_branch', branchId: key }).events;
        els.pause.hidden = true;
        els.hud.hidden = false;
        menu = null;
        modal = null; syncActionHudVisibility();
        updateHud();
        if (engine.mode === 'branch_select') { openBranchMenu(); return; }
        showStory(null, events, 'Evolution');
    }

    // ---------------------------------------------------------------------
    // Battle overlay. The fight is the engine's; menus come from its availability list.
    // ---------------------------------------------------------------------
    const BM = ENSO.battleMenu;
    // Real-time fights (combat v2): this page owns the clock and calls engine.tick() about every 100 ms
    // from the frame loop (rtFrame). The HUD model is ui/battle-realtime.js.
    const RT = ENSO.battleRealtime;
    const rtClock = RT.createClock({ stepMs: 100, maxMs: 250 });
    let rtLastFrame = 0;
    const isRealtime = () => !!(battle && battle.rt);
    const rtState = () => (typeof engine.getRealtimeState === 'function' ? engine.getRealtimeState() : null);

    function beginBattle(result) {
        screen = 'combat';
        modal = null; syncActionHudVisibility();
        muteHeldKeys();
        els.hud.hidden = true;
        els.banner.hidden = true; clearTimeout(bannerTimer);   // the map name never shows through the battle
        const live = engine.mode === 'combat' && engine.combatMode === 'realtime' && !!rtState();
        battle = { id: result.id, log: [], fresh: 0, logOpen: false, ended: null, lastHp: {}, targetIds: [], labels: {},
            rt: live ? { paused: false, running: false, now: 0, at: performance.now(), sig: '', hint: '' } : null };
        playActor('idle');
        fx.clear();
        rtClock.reset();
        addLog(result.events);
        if (engine.mode !== 'combat') battleOver(); else if (isRealtime()) rtLive(); else battleRoot();
    }
    function addLog(events) {
        const lines = readable(events);
        for (const l of lines) battle.log.push(l);
        // Turn-based: what the last action said is highlighted. Real time: the last few lines stay up, whatever said them.
        if (isRealtime()) { if (lines.length) battle.fresh = Math.min(2, battle.log.length); } else battle.fresh = Math.min(lines.length, LOG_LINES);
        if (battle.log.length > LOG_LINES) battle.log.splice(0, battle.log.length - LOG_LINES);
    }
    function send(action) {
        const hpBefore = engine.player.hp;
        const before = engine.getState();
        const rtBefore = isRealtime() ? rtState() : null;
        const slots = rtBefore ? RT.skillSlots(engine.getAvailableActions(), rtBefore) : null;
        const r = engine.act(action);
        if (isRealtime() && !r.ok) { rtHint(r.error ? r.error.message : ''); return; }   // a refusal (cooldown, stun...) is a hint, not a log line
        addLog(r.events);
        if (r.ok) {
            // Real time: a skill-bar press is drawn as the slot's skill, aimed at the held target.
            let shown = rtBefore ? RT.presentationAction(action, slots) : action;
            if (rtBefore && shown && (shown.type === 'skill' || shown.type === 'attack') && !shown.targetId && !shown.targetIds) {
                const def = shown.type === 'skill' ? DATA.skillDefinitions[shown.skillId] : null;
                if (!def || /^enemy/.test(def.target || 'enemy_single')) shown = { ...shown, targetId: rtBefore.targetId };
            }
            if (shown) actorReacts(shown, hpBefore);
            fx.push(ENSO.combatFx.eventsFromStates(before, engine.getState(), shown, DATA, r.events), performance.now());
        }
        if (engine.mode !== 'combat') battleOver(); else if (isRealtime()) rtLive(); else battleRoot();
    }

    // ---- Real-time fight: clock, keys and the pause menu ----
    /** Back to the live fight (no menu, the clock runs). */
    function rtLive() {
        battle.rt.paused = false;
        if (engine.getAvailableActions().awaiting !== 'realtime') { rtSync(); battleRoot(); return; }   // anything the engine asks outside the bar uses the normal menu
        battle.targetIds = [];
        menu = null;
        rtSync();
        renderBattle();
    }
    /** Esc / I: stop the clock and show Resume / Items / Flee (or the items list straight away). */
    function rtPause(sub) {
        battle.rt.paused = true;
        rtHint('', false);
        if (sub === 'items') { rtItems(); return; }
        menu = makeMenu(toItems(BM.entries(engine.getAvailableActions(), 'realtime'), (e) => {
            if (e.kind === 'resume') return rtLive();
            if (e.kind === 'items') return rtItems();
            send(BM.actionFor(e.option));
        }), { back: rtLive, render: renderBattle });
        renderBattle();
    }
    function rtItems() {
        battle.rt.paused = true;
        menu = makeMenu(toItems(BM.entries(engine.getAvailableActions(), 'items'), (e) => send(BM.actionFor(e.option))), { back: () => rtPause(), render: renderBattle });
        if (!menu.items.length) menu = makeMenu([{ label: 'Nothing to use', sub: 'Back to the fight.', action: rtLive }], { back: rtLive, render: renderBattle });
        renderBattle();
    }
    /** One line under the skill bar: why the last press did nothing. Updated in place (no re-render). */
    function rtHint(text, draw = true) {
        battle.rt.hint = text || '';
        const el = els.combat.querySelector('.rt-hint');
        if (el) { el.textContent = battle.rt.hint; el.classList.remove('flash'); void el.offsetWidth; if (battle.rt.hint) el.classList.add('flash'); } else if (draw) renderBattle();
    }
    /** Remember the engine's fight time at this moment (countdowns are drawn from it) and what the HUD shows. */
    function rtSync() {
        const v = rtState();
        battle.rt.now = v ? v.now : battle.rt.now;
        battle.rt.at = performance.now();
        battle.rt.sig = rtSignature(v);
    }
    /** What a full re-render depends on besides log lines: usable slots, resource, target, wind-ups. Timers update in place. */
    function rtSignature(v) {
        if (!v || engine.mode !== 'combat') return '';
        const avail = engine.getAvailableActions();
        const p = engine.player;
        return [(avail.actions || []).map((o) => (o.enabled ? 1 : 0)).join(''), p.resource.current, p.hp, v.targetId,
            Object.entries(v.actors).map(([id, a]) => `${id}:${a.windup ? a.windup.skill : '-'}`).join(',')].join('|');
    }
    /** Called every frame: feeds the engine clock while the fight runs, then moves the countdowns. */
    function rtFrame(now) {
        const dt = rtLastFrame ? now - rtLastFrame : 0;
        rtLastFrame = now;
        if (!isRealtime() || screen !== 'combat') { rtClock.reset(); return; }
        // The clock stops for the pause menu, the full log (it hides the field), a hidden tab, and once the fight is over.
        const running = !battle.ended && !battle.rt.paused && !battle.logOpen && !document.hidden && engine.mode === 'combat';
        if (running && !battle.rt.running) battle.rt.at = now;   // resuming: countdowns start from the engine's time again
        battle.rt.running = running;
        const ms = rtClock.feed(dt, running);
        if (ms > 0) rtTick(ms);
        if (isRealtime() && screen === 'combat') rtTimers(now);
    }
    function rtTick(ms) {
        const hpBefore = engine.player.hp;
        const before = engine.getState();
        const events = engine.tick(ms);
        if (events.length) {
            addLog(events);
            fx.push(ENSO.combatFx.eventsFromStates(before, engine.getState(), null, DATA, events), performance.now());
            if (engine.mode === 'game_over') playActor('death'); else if (engine.player.hp < hpBefore) playActor('hit');
        }
        if (engine.mode !== 'combat') { battleOver(); return; }
        const sig = battle.rt.sig;
        rtSync();
        if (events.length || battle.rt.sig !== sig) renderBattle();
    }
    /** Countdowns between ticks: fight time is the engine's last time plus what has passed since (at most one step). */
    function rtTimers(now) {
        const t = battle.rt.now + (battle.rt.running ? Math.min(250, Math.max(0, now - battle.rt.at)) : 0);
        els.combat.querySelectorAll('[data-rt-end]').forEach((el) => {
            const end = +el.dataset.rtEnd, total = +el.dataset.rtTotal;
            const k = RT.remaining({ endsAt: end, totalMs: total }, t);
            el.style.setProperty('--k', k.toFixed(3));
            el.classList.toggle('done', k <= 0);
            const sec = el.querySelector('.rt-sec');
            if (sec) sec.textContent = RT.secondsText(end - t);
        });
        els.combat.querySelectorAll('[data-rt-ends]').forEach((el) => { el.textContent = `${Math.max(0, Math.ceil((+el.dataset.rtEnds - t) / 1000))}s`; });
        const clock = els.combat.querySelector('[data-rt-clock]');
        if (clock) clock.textContent = RT.clockText(t);
    }
    /** Keys in a live real-time fight. Returns true if used. */
    function rtKey(ev) {
        const slot = RT.slotForKey(ev);
        if (slot >= 0) { send({ type: 'skill_slot', slot }); return true; }
        if (ev.key === 'f' || ev.key === 'F') { send({ type: 'attack' }); return true; }
        if (ev.key === 'Tab') { rtCycleTarget(ev.shiftKey ? -1 : 1); return true; }
        if (ev.repeat) return false;
        if (ev.key === 'Escape') { rtPause(); return true; }
        if (ev.key === 'i' || ev.key === 'I') { rtPause('items'); return true; }
        if (ev.key === 'h' || ev.key === 'H') { send({ type: 'quick_heal' }); return true; }
        return false;
    }
    function rtCycleTarget(dir) {
        const v = rtState();
        const s = engine.getState();
        const id = RT.cycleTarget(s.combat ? s.combat.enemies : [], v && v.targetId, dir);
        if (id && (!v || id !== v.targetId)) send({ type: 'set_target', targetId: id });
    }

    // The player's battle sprite (GFX-2, #106): which one-shot animation to play is a presentation
    // choice made from the action and the HP change. The engine's rules never look at it.
    const actor = { anim: 'idle', t0: 0, queue: [] };
    function playActor(name, ...then) { actor.anim = name; actor.t0 = performance.now(); actor.queue = then; }
    function actorReacts(action, hpBefore) {
        const def = action.type === 'skill' && DATA.skillDefinitions[action.skillId];
        const move = action.type === 'attack' || (def && def.damage_type === 'physical') ? 'attack'
            : action.type === 'skill' || action.type === 'control' ? 'cast' : null;
        const after = engine.mode === 'game_over' ? ['death'] : engine.player.hp < hpBefore ? ['hit'] : [];
        if (move) playActor(move, ...after); else if (after.length) playActor(...after);
    }
    // Battle effects (GFX-4): one overlay canvas above the battle panel, sized to it every frame.
    const fxCanvas = document.createElement('canvas');
    fxCanvas.className = 'fx-layer';
    fxCanvas.setAttribute('aria-hidden', 'true');
    Object.assign(fxCanvas.style, { position: 'fixed', pointerEvents: 'none', zIndex: 50, left: '0', top: '0' });
    fxCanvas.hidden = true;
    document.body.appendChild(fxCanvas);
    const fx = ENSO.combatFx.createFx(fxCanvas);
    function drawFx(now) {
        const box = els.combat.getBoundingClientRect();
        const on = !els.combat.hidden && box.width > 0;
        fxCanvas.hidden = !on;
        if (!on) return;
        if (fxCanvas.width !== Math.round(box.width) || fxCanvas.height !== Math.round(box.height)) { fxCanvas.width = Math.round(box.width); fxCanvas.height = Math.round(box.height); }
        fxCanvas.style.left = `${box.left}px`; fxCanvas.style.top = `${box.top}px`;
        const unit = (id) => els.combat.querySelector(`[data-unit-id="${CSS.escape(String(id))}"]`);
        const anchorOf = (id) => {
            const el = unit(id);
            if (!el) return null;
            const r = (el.querySelector('canvas') || el).getBoundingClientRect();
            return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
        };
        fx.draw(now, anchorOf, (id) => (id === undefined ? [...els.combat.querySelectorAll('[data-unit-id]')] : unit(id)));
    }
    /** Draw the battle sprite; called every frame while the battle overlay is up. */
    function drawActor(now) {
        if (ENSO.battleHD) els.combat.querySelectorAll('.foe canvas[data-key]').forEach((f) => ENSO.worldRender.drawCreature(f, f.dataset.key, now));   // HD foes breathe
        const c = els.combat.querySelector('canvas.me-sprite');
        if (!c) return;
        const S = ENSO.sprites, P = S.characterFor ? S.characterFor(view.className) : S.manifest.player;
        if (actor.queue.length && S.animationDone(P, actor.anim, now - actor.t0)) playActor(...actor.queue);
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        S.drawCharacter(g, c.width / 2, c.height - 2, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className, facing: 'right', anim: actor.anim === 'idle' ? 'ready' : actor.anim, scale: 1 }, now - actor.t0);   // weapon drawn in battle
    }
    /** Menu items from battle-menu entries; `go` runs when an enabled entry is chosen. */
    const toItems = (list, go) => list.map((e) => ({ label: e.label, sub: e.sub, disabled: e.disabled, action: () => go(e) }));

    function battleRoot() {
        battle.targetIds = [];
        const avail = engine.getAvailableActions();
        menu = makeMenu(toItems(BM.entries(avail, 'root'), (e) => {
            if (e.kind === 'skills') return listMenu('skills');
            if (e.kind === 'items') return listMenu('items');
            choose(e.option);
        }), { render: renderBattle });
        renderBattle();
    }
    function listMenu(view) {
        const avail = engine.getAvailableActions();
        const info = Object.fromEntries(engine.getState().player.skills.map((k) => [k.name, k.detail]));
        menu = makeMenu(toItems(BM.entries(avail, view, info), (e) => choose(e.option)), { back: battleRoot, render: renderBattle });
        renderBattle();
    }
    /** Pick targets if the option needs them, then act. */
    function choose(option) {
        const how = BM.targetMode(option);
        if (!how) { send(BM.actionFor(option)); return; }
        const parent = menu;
        const picked = [];
        const build = () => {
            const ents = BM.targetEntries(option, engine.getState()).map((t) => ({ ...t, label: battle.labels[t.id] || t.label })).map((t) => ({
                ...t, label: how !== 'multi' ? t.label
                    : option.type === 'turn_order' ? `${picked.includes(t.id) ? `${picked.indexOf(t.id) + 1}.` : '·'} ${t.label}`  // D-09: show the position
                        : `${picked.includes(t.id) ? '☑' : '☐'} ${t.label}`
            }));
            menu = makeMenu(toItems(ents, (t) => {
                if (how === 'single') { send(BM.actionFor(option, [t.id])); return; }
                const i = picked.indexOf(t.id);
                if (i === -1) picked.push(t.id); else picked.splice(i, 1);
                if (picked.length >= option.pick.max) { send(BM.actionFor(option, picked)); return; }
                const keep = menu.index; build(); menu.index = keep; renderBattle();
            }), {
                back: () => { menu = parent; battle.targetIds = []; renderBattle(); },
                render: () => { battle.targetIds = [...picked, ents[menu.index] && ents[menu.index].id]; renderBattle(); }
            });
            battle.targetIds = [...picked, ents[menu.index] && ents[menu.index].id];
        };
        build();
        renderBattle();
    }

    function battleOver() {
        const s = engine.getState();
        const result = engine.mode === 'game_over' ? 'defeat' : s.world.lastResult;
        battle.ended = result;
        if (result === 'fled') { endBattle('fled'); toast('You got away. It is still out there.'); return; }
        if (result === 'defeat') {
            screen = 'over';
            menu = makeMenu([{ label: 'Wake again', sub: 'Back to the title. This run is over.', action: showTitle }], { render: renderBattle });
        } else {
            menu = makeMenu([{ label: 'Continue', sub: 'Back to exploring', action: () => endBattle('victory') }], { render: renderBattle });
        }
        renderBattle();
    }
    function endBattle(result) {
        session.fightOver(battle.id, result);
        els.combat.hidden = true;
        delete $('world-stage').dataset.cam;
        screen = 'explore';
        menu = null;
        muteHeldKeys();
        els.hud.hidden = false;
        updateHud();
        if (engine.mode === 'branch_select') openBranchMenu();
    }

    // Battle screen (Pixie, docs/ui/STYLE_GUIDE.md): the fight plays on the dimmed map itself. Foes stand on
    // the right with name plates, you (and your summons) on the left; under them a short message window,
    // then your status window and the command window. The highlighted command explains itself in one help
    // line, so each entry is one line tall. L opens the full log.
    const BV = ENSO.battleView;
    function hpBar(id, cur, max, cls) {
        const now = BV.pct(cur, max);
        const was = battle.lastHp[id] != null ? BV.pct(battle.lastHp[id], max) : now;
        const trail = was > now ? `<span class="trail" style="--from:${was}%;--to:${now}%"></span>` : '';
        return `<span class="bar ${cls} tone-${BV.hpTone(cur, max)}" role="meter" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.max(0, cur)}">${trail}<span class="fill" style="width:${now}%"></span></span>`;
    }
    /** Status chips; in a real-time fight (`now` = fight time) timed ones count down their seconds in place. */
    function chips(list, now) {
        return (list || []).map((x) => {
            const c = BV.statusChip(x, DATA.statusDefinitions, now);
            const left = c.endsAt != null ? ` <b class="rt-left" data-rt-ends="${c.endsAt}">${c.seconds}s</b>` : '';
            return `<span class="chip st-${c.category}" title="${esc(c.title)}"><i aria-hidden="true">${c.glyph}</i>${esc(c.text)}${left}</span>`;
        }).join('');
    }
    /** A countdown element the frame loop moves (rtTimers): --k goes from 1 (just started) to 0 (done). */
    const rtTimer = (cls, t, inner = '') => (t ? `<span class="${cls}" data-rt-end="${t.endsAt}" data-rt-total="${t.totalMs || 0}" style="--k:1">${inner}</span>` : '');
    /** The skill bar (keys 1-6) and the basic attack (F). Usable or not, and why, is the engine's answer. */
    function skillBarHtml(avail, v) {
        const p = engine.player;
        const slotHtml = (sl) => {
            const timing = sl.reason && (sl.reason.code === 'ON_COOLDOWN' || sl.reason.code === 'GLOBAL_COOLDOWN');
            const cls = sl.empty ? 'empty' : sl.enabled ? 'ready' : timing ? 'cooling' : 'off';
            const cd = sl.cooldown && sl.cooldown.endsAt > v.now ? rtTimer('rt-cd', sl.cooldown, '<span class="rt-sec"></span>') : '';
            const gcd = !sl.empty && sl.gcd ? rtTimer('rt-gcd', sl.gcd) : '';
            return `<button type="button" tabindex="-1" class="rt-slot ${cls}" data-rt-slot="${sl.slot}" title="${esc(sl.title)}" aria-label="${esc(sl.title)}" aria-disabled="${!sl.enabled}">
                <kbd>${sl.key}</kbd><span class="rt-name">${esc(sl.label || '')}</span>${sl.empty ? '' : `<span class="rt-cost">${sl.cost ? `◆${sl.cost}` : 'free'}</span>`}${cd}${gcd}</button>`;
        };
        const b = RT.basicSlot(avail, v);
        const bcls = b.enabled ? 'ready' : b.reason && b.reason.code === 'ON_COOLDOWN' ? 'cooling' : 'off';
        return `<div class="rt-bar" role="toolbar" aria-label="Skill bar">
                <button type="button" tabindex="-1" class="rt-slot basic ${bcls}" data-rt-basic title="${esc(b.title)}" aria-label="${esc(b.title)}" aria-disabled="${!b.enabled}">
                    <kbd>${b.key}</kbd><span class="rt-name">${esc(b.label)}</span><span class="rt-cost">swing</span>${rtTimer('rt-cd', b.swing)}</button>
                ${RT.skillSlots(avail, v).map(slotHtml).join('')}
            </div>
            <p class="rt-hint" role="status">${esc(battle.rt.hint || '')}</p>
            <p class="keys"><kbd>1</kbd>–<kbd>6</kbd> skills <kbd>F</kbd> attack <kbd>Tab</kbd> target <kbd>I</kbd> items <kbd>H</kbd> heal <kbd>Esc</kbd> pause <kbd>L</kbd> ${battle.logOpen ? 'close log' : 'log'} <span class="rt-res">◆ ${esc(p.resource.type)}</span></p>`;
    }
    function commandHtml(m) {
        const items = m ? m.items : [];
        return `<ul class="menu b-commands" role="listbox" aria-label="Commands">${items.map((it, i) => `
            <li role="option" data-i="${i}" aria-selected="${i === m.index}" aria-disabled="${!!it.disabled}" class="${i === m.index ? 'selected' : ''} ${it.disabled ? 'disabled' : ''}">
                <span class="m-label">${esc(it.label)}</span></li>`).join('')}</ul>
            <p class="b-help" aria-live="polite">${esc(BV.helpText(items[m ? m.index : 0]))}</p>`;
    }
    function renderBattle() {
        const s = engine.getState();
        const p = s.player;
        const foes = s.combat ? s.combat.enemies : [];
        const minions = s.combat ? s.combat.minions : [];
        const avail = !battle.ended && engine.mode === 'combat' ? engine.getAvailableActions() : null;
        const rtv = isRealtime() && !battle.ended ? rtState() : null;   // real-time fight: clock, timers, held target
        const rtLiveBar = !!(rtv && avail && avail.awaiting === 'realtime' && !battle.rt.paused);
        const rtNow = rtv ? rtv.now : undefined;
        const controlled = avail && avail.awaiting === 'control' ? foes.find((e) => e.id === avail.controlledActorId) : null;
        const round = s.combat ? `Round ${s.combat.round}` : '';
        const heading = battle.ended === 'victory' ? 'Victory' : battle.ended === 'defeat' ? 'Defeat' : round;
        // Twins keep the letter they started the fight with ("Rust Rat B" stays B after A falls).
        battle.labels = { ...BV.unitLabels([...foes, ...minions]), ...battle.labels };
        const name = (u) => battle.labels[u.id] || u.name;
        const strip = BV.turnStrip(battle.ended || isRealtime() ? null : engine.getTurnOrder(), battle.labels);
        // Turn bar (HD-2D pass): the one acting sits in the big diamond, everyone after them rides the line.
        const units = Object.fromEntries([...foes, ...minions].map((u) => [u.id, u]));
        const face = (t, size) => `<canvas class="face" width="${size}" height="${size}" data-face="${esc(t.id)}" data-key="${esc((units[t.id] || {}).key || '')}" aria-hidden="true"></canvas>`;
        const queue = [...strip.now, ...strip.next];
        const actor = queue.find((t) => t.current) || null;
        const turnHtml = (list) => list.filter((t) => t !== actor).map((t) => `<li class="t-${esc(t.side)}${battle.targetIds.includes(t.id) ? ' aimed' : ''}" title="${esc(t.label)}">${face(t, 24)}<span class="t-name">${esc(t.label)}</span></li>`).join('');
        const mode = battle.ended ? '' : isRealtime() && battle.rt.paused ? 'Paused' : controlled ? `You control ${controlled.name}` : avail && avail.awaiting === 'turn_order' ? 'Set the turn order' : '';
        const n = battle.log.length;
        const logHtml = battle.log.map((l, i) => {
            const v = BV.logLine(l.text);
            return `<p class="lg-${v.kind}${l.important ? ' imp' : ''}${i >= n - battle.fresh ? ' fresh' : ''}">${esc(v.text)}</p>`;
        }).join('');
        els.combat.hidden = false;
        els.combat.classList.toggle('ended', !!battle.ended);
        els.combat.classList.toggle('log-open', battle.logOpen);
        els.combat.classList.toggle('rt', isRealtime());
        els.combat.innerHTML = `
            <header class="b-head">
                ${actor ? `<div class="b-now t-${esc(actor.side)}" aria-label="Acting now: ${esc(actor.label)}"><span class="dia">${face(actor, 32)}</span><span class="t-name">${esc(actor.label)}</span></div>` : ''}
                ${rtv ? `<div class="rt-clock" aria-label="Fight clock"><span class="rt-clock-t" data-rt-clock>${RT.clockText(rtv.now)}</span>${rtTimer('rt-pulse', { endsAt: rtv.now + rtv.pulseInMs, totalMs: ((DATA.realtimeRules || {}).pulseSeconds || 3) * 1000 }, '<span class="fill"></span>')}<span class="rt-pulse-k">pulse</span></div>` : ''}
                ${queue.length ? `<ol class="b-turns" aria-label="Turn order">${turnHtml(strip.now)}${strip.next.length ? `<li class="t-sep" aria-hidden="true">Next</li>${turnHtml(strip.next)}` : ''}</ol>` : ''}
                <span class="b-round ${battle.ended ? `b-${esc(battle.ended)}` : ''}">${esc(isRealtime() && !battle.ended ? 'Real time' : heading)}</span>${mode ? `<span class="b-mode">${esc(mode)}</span>` : ''}</header>
            <section class="b-field" aria-label="Battlefield">
                <div class="b-side b-allies">
                    <figure class="unit me" data-unit-id="player">
                        <canvas class="me-sprite" width="64" height="48" aria-hidden="true"></canvas>
                        <figcaption class="sr-only">${esc(p.name)}</figcaption>
                    </figure>
                    ${minions.map((m) => `<figure class="unit ally" data-unit-id="${esc(m.id)}">
                        <span class="ally-mark" aria-hidden="true">✦</span>
                        <figcaption class="plate"><span class="u-name">${esc(name(m))}</span>${hpBar(m.id, m.hp, m.maxHp, 'hp')}<span class="u-hp">${m.hp}/${m.maxHp}</span></figcaption></figure>`).join('')}
                </div>
                <div class="b-side b-foes">${foes.map((e) => {
                    const hit = battle.lastHp[e.id] != null && e.hp < battle.lastHp[e.id];
                    const aimed = battle.targetIds.includes(e.id) || !!(rtv && rtv.targetId === e.id);
                    const tm = rtv ? RT.actorTimers(rtv, e.id) : null;
                    // Real time: a wind-up bar with the move's name (stun it before it lands), else a thin timer to its next move.
                    const timers = !tm ? '' : tm.windup ? `<span class="rt-wind" title="${esc(name(e))} readies ${esc(tm.windup.skill)}">${rtTimer('rt-wbar', tm.windup, '<span class="fill"></span>')}<span class="rt-wname">${esc(tm.windup.skill)}</span></span>`
                        : tm.next ? `<span class="rt-next" title="Next move">${rtTimer('rt-nbar', tm.next, '<span class="fill"></span>')}</span>` : '';
                    return `<figure class="unit foe ${aimed ? 'targeted' : ''} ${hit ? 'hit' : ''}" data-unit-id="${esc(e.id)}"${rtv ? ` title="${esc(name(e))}: click to target"` : ''}>
                        <span class="b-cursor" aria-hidden="true">${aimed ? '▼' : ''}</span>
                        <canvas width="128" height="128" data-key="${esc(e.key)}"></canvas>
                        <figcaption class="plate"><span class="u-name">${esc(name(e))}</span>${hpBar(e.id, e.hp, e.maxHp, 'enemy')}<span class="u-hp">${e.hp}/${e.maxHp}</span>
                            ${timers}<span class="chips">${chips(e.statusEffects, rtNow)}</span></figcaption></figure>`;
                }).join('')}</div>
            </section>
            <section class="win b-log ${battle.logOpen ? 'open' : ''}" aria-live="polite" aria-label="Battle log">${logHtml}</section>
            <footer class="b-foot">
                <section class="b-party" aria-label="Your status">
                    <div class="u-name">${esc(p.name)} <span class="lv">Lv ${p.level}</span></div>
                    <div class="stat"><span class="k">HP</span>${hpBar('player', p.hp, p.maxHp, 'hp')}<span class="v">${Math.max(0, p.hp)}<small>/${p.maxHp}</small></span></div>
                    <div class="stat"><span class="k">${esc(p.resource.type)}</span>${hpBar('player.res', p.resource.current, p.resource.max, 'res')}<span class="v">${p.resource.current}<small>/${p.resource.max}</small></span></div>
                    <div class="chips">${chips(p.statusEffects, rtNow)}</div>
                </section>
                ${rtLiveBar ? `<section class="win b-cmd rt-cmd" aria-label="Skill bar">${skillBarHtml(avail, rtv)}</section>` : `<section class="win b-cmd" aria-label="Commands">
                    ${commandHtml(menu)}
                    ${isRealtime() && battle.rt.hint && battle.rt.paused ? `<p class="rt-hint" role="status">${esc(battle.rt.hint)}</p>` : ''}
                    <p class="keys"><kbd>↑↓</kbd> choose <kbd>Enter</kbd> confirm${menu && menu.back ? ' <kbd>Esc</kbd> back' : ''} <kbd>L</kbd> ${battle.logOpen ? 'close log' : 'log'}</p>
                </section>`}
            </footer>`;
        bindMenuClicks(els.combat, menu);
        if (rtLiveBar) {
            const press = (el, fn) => { el.addEventListener('mousedown', (e) => e.preventDefault()); el.addEventListener('click', fn); };   // no focus: keys stay with the fight
            els.combat.querySelectorAll('[data-rt-slot]').forEach((el) => press(el, () => send({ type: 'skill_slot', slot: +el.dataset.rtSlot })));
            els.combat.querySelectorAll('[data-rt-basic]').forEach((el) => press(el, () => send({ type: 'attack' })));
            els.combat.querySelectorAll('.foe[data-unit-id]').forEach((el) => el.addEventListener('click', () => { if (rtState() && rtState().targetId !== el.dataset.unitId) send({ type: 'set_target', targetId: el.dataset.unitId }); }));
        }
        const sel = els.combat.querySelector('.b-commands li.selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });                       // long skill lists scroll with the cursor
        els.combat.querySelector('.b-log').addEventListener('click', toggleBattleLog);
        els.combat.querySelectorAll('canvas[data-key]:not(.face)').forEach((c) => ENSO.worldRender.drawCreature(c, c.dataset.key, performance.now()));
        els.combat.querySelectorAll('canvas.face').forEach(drawFace);
        // Camera: lean in on the foes while you pick a target, pull back otherwise (CSS; off with reduced motion).
        $('world-stage').dataset.cam = battle.ended || isRealtime() ? 'wide' : battle.targetIds.length ? 'foes' : actor && actor.side === 'enemy' ? 'me' : 'wide';
        // Collapsed, the message window starts at the first line of what just happened (your own action),
        // not at the bottom, so enemy turns never push your result out of view. Open, it shows the latest.
        const log = els.combat.querySelector('.b-log');
        const first = !battle.logOpen && log.querySelector('p.fresh');
        log.scrollTop = first ? first.offsetTop - 4 : log.scrollHeight;   // .win is the offsetParent
        battle.lastHp = Object.fromEntries([...foes, ...minions].map((e) => [e.id, e.hp]));
        battle.lastHp.player = p.hp;
        battle.lastHp['player.res'] = p.resource.current;
        if (isRealtime()) rtTimers(performance.now());
    }
    /** A turn-bar face: Wren's portrait hook when it exists, else a crop of the sprite or creature. */
    function drawFace(c) {
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
        const id = c.dataset.face;
        if (id === 'player' && ENSO.sprites.drawPortrait) { ENSO.sprites.drawPortrait(g, 0, 0, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className }, c.width); return; }
        if (id === 'player') {
            const k = c.width / 20;   // head and shoulders of the 32x36 walking sprite
            g.save(); g.scale(k, k);
            ENSO.sprites.drawCharacter(g, 10, ENSO.sprites.characterFor(view.className).frame.h > 64 ? 38 : 33, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className, facing: 'down', anim: 'idle', scale: 1 }, 0);
            g.restore();
            return;
        }
        if (c.dataset.key) ENSO.worldRender.drawCreature(c, c.dataset.key, 0);
    }
    function toggleBattleLog() { battle.logOpen = !battle.logOpen; renderBattle(); }

    // ---------------------------------------------------------------------
    // Combat v3: fights in the world (docs/ACTION_COMBAT.md). src/action/sim.js owns space and time, the
    // engine the rules; this page turns keys and the mouse into sim input, and draws the sim's view with
    // ui/action-fx.js (telegraphs, swings, sparks, numbers) and ui/action-hud.js (Pixie's HUD).
    // WASD move and face · click aims · keyboard attacks face forward · LMB / 1 attack · 2–6, R skills · Space dodge · Shift sprint · RMB guard
    // (a fresh press = parry) · E interact · Tab lock on.
    // ---------------------------------------------------------------------
    let sim = null;
    let lastActionFrame = 0;
    const AFX = ENSO.actionFx;
    const afx = ACTION ? AFX.createFx() : null;
    const aim = { x: 0, y: 0, screenX: null, screenY: null, movedAt: 0 };
    const press = { attack: false, pointerAttack: false, dodge: false, interact: false, slot: null };
    let guardHeld = false;
    let lockId = null;
    let lastPlayerHp = null;
    let hud = null;
    let playerAnim = { name: null, t0: 0, key: '' };

    function actionStart() {
        if (!ACTION) return;
        sim = new ENSO.actionSim.ActionSim({ engine, session, rules: DATA.actionRules, seed: engine.seed });
        lastActionFrame = 0;
        lockId = null;
        lastPlayerHp = engine.player.hp;
        if (!hud && ENSO.actionHud) {
            hud = ENSO.actionHud.create($('world-stage'));
            hud.onSlot((i) => { press.slot = i; });
            hud.onAttack(() => { press.attack = true; });
            hud.onHeal(quickHeal);
            if (hud.onStance) hud.onStance(nextStance);
        }
    }

    /** Keys the world handles itself in action mode. True when the key was used. */
    function actionKey(ev) {
        if (screen !== 'explore' || modal || !sim) return false;
        if (ev.key === 'Tab') { ev.preventDefault(); if (!ev.repeat) cycleLock(ev.shiftKey ? -1 : 1); return true; }
        if (ev.repeat) return ev.key === ' ' || ev.key === 'Shift';
        if (ev.key === ' ') { press.dodge = true; return true; }
        const slot = ENSO.actionHud ? ENSO.actionHud.slotForKey(ev) : null;
        if (slot === 'basic') { press.attack = true; return true; }
        if (slot != null) { press.slot = slot; return true; }
        if ((ev.key === 'e' || ev.key === 'E' || ev.key === 'Enter') && !fade && !flash && !feathering) { press.interact = true; return true; }
        if (ev.code === 'KeyH' || ev.key === 'h' || ev.key === 'H') { quickHeal(); return true; }
        if ((ev.code === 'KeyT' || ev.key === 't' || ev.key === 'T') && engine.getStance && engine.getStance()) { nextStance(); return true; }
        return false;
    }

    /** T: Fenrir's Heir changes wolf, Sköll -> Hati -> Fenrir (switch_stance; free out of a fight, 8 s cooldown in one). */
    function nextStance() {
        if (screen !== 'explore' || modal) return;
        const cell = ENSO.actionHud && ENSO.actionHud.stanceCell ? ENSO.actionHud.stanceCell(engine) : null;
        if (!cell || !cell.next) return;
        const r = engine.act({ type: 'switch_stance', stance: cell.next });
        const line = (r.events || []).find((e) => e.type === 'text');
        toast(r.ok ? (line ? line.text : 'Stance changed.') : (r.error ? r.error.message : 'Not now.'));
        updateHud();
    }

    /** H: the engine picks and uses the best healing item (quick_heal), in a fight or out of one. */
    function quickHeal() {
        if (screen !== 'explore' || modal) return;
        const r = engine.act({ type: 'quick_heal' });
        const line = (r.events || []).find((e) => e.type === 'text' && /\+\d+ HP/.test(e.text || ''));
        toast(r.ok ? (line ? line.text : 'Healed.') : (r.error ? r.error.message : 'Nothing to heal with.'));
        updateHud();
    }

    function cycleLock(dir) {
        const live = sim.view().actors.filter((a) => a.engaged && a.state !== 'dead');
        if (!live.length) { lockId = null; return; }
        const p = sim.player;
        live.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
        const i = live.findIndex((a) => a.sid === lockId);
        lockId = live[(i + dir + live.length) % live.length].sid;
    }

    /** Where the map is on screen (the renderer's camera, ui/world-render.js draw()). */
    function camera() {
        const map = WORLD.maps[view.mapId], T = map.tileSize || 32;
        const mw = map.tiles[0].length * T, mh = map.tiles.length * T, W = canvas.width, H = canvas.height;
        const camX = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, view.x * T + T / 2 - W / 2));
        const camY = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, view.y * T + T / 2 - H / 2));
        return { ox: -Math.round(camX), oy: -Math.round(camY), T };
    }
    if (ACTION) {
        const toCanvas = (ev) => { const r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) * canvas.width / r.width, y: (ev.clientY - r.top) * canvas.height / r.height }; };
        canvas.addEventListener('mousemove', (ev) => { const c = toCanvas(ev); aim.screenX = c.x; aim.screenY = c.y; aim.movedAt = performance.now(); });
        canvas.addEventListener('mousedown', (ev) => {
            if (screen !== 'explore' || modal) return;
            const c = toCanvas(ev); aim.screenX = c.x; aim.screenY = c.y; aim.movedAt = performance.now();
            if (ev.button === 0) { press.attack = true; press.pointerAttack = true; }
            if (ev.button === 2) guardHeld = true;
            ev.preventDefault();
        });
        window.addEventListener('mouseup', (ev) => { if (ev.button === 2) guardHeld = false; });
        canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
        window.addEventListener('blur', () => { guardHeld = false; });
    }

    function actionInput() {
        const mv = { x: 0, y: 0 };
        for (const d of held) { mv.x += DIRS[d][0]; mv.y += DIRS[d][1]; }
        const len = Math.hypot(mv.x, mv.y);
        if (len) { mv.x /= len; mv.y /= len; }
        let target = null;
        const lock = lockId && sim.actors.find((a) => a.sid === lockId && !a.dead);
        if (!lock) lockId = null;
        const aiming = press.pointerAttack || guardHeld;
        // Pointer position is an action target, never passive facing input. Tab explicitly locks aim.
        if (lock) target = { x: lock.x, y: lock.y };
        else if (aiming && aim.screenX != null) { const c = camera(); target = { x: aim.screenX - c.ox, y: aim.screenY - c.oy }; }
        const input = { move: mv, aim: target, sprint: down.has('Shift'), guard: guardHeld || down.has('q') || down.has('Q'), attack: press.attack, dodge: press.dodge, interact: press.interact, slot: press.slot };
        press.attack = press.pointerAttack = press.dodge = press.interact = false;
        press.slot = null;
        return input;
    }

    function notice(text, kind = 'loot') { notify(text, kind); }

    function syncActionHudVisibility() {
        if (!hud) return;
        const blocked = screen !== 'explore' || !!modal || !!fade || !!flash || !!feathering;
        hud.el.hidden = blocked;
        hud.el.inert = blocked;
        hud.el.setAttribute('aria-hidden', String(blocked));
    }

    function actionFrame(now) {
        if (!sim) return;
        const dt = lastActionFrame ? Math.min(100, now - lastActionFrame) : 0;
        lastActionFrame = now;
        const live = screen === 'explore' && !modal && !fade && !flash && !feathering;
        if (sim.mapId !== session.mapId) sim.enterMap();
        if (live) {
            const out = sim.update(dt, actionInput());
            for (const ev of out.fx) actionFxEvent(ev, now);
            for (const ev of out.engineEvents) {
                if (ev.type === 'world.drop') notice(`${ev.drop.gold ? `${ev.drop.gold} Gold` : ''}${ev.drop.gold && ev.drop.items.length ? ' · ' : ''}${ev.drop.items.map((i) => i.name).join(', ')} dropped`, 'loot');
                if (ev.type === 'loot') notice(`Picked up ${[ev.gold ? `${ev.gold} Gold` : '', ...(ev.items || []).map((i) => i.name || i)].filter(Boolean).join(', ')}`, 'loot');
                if (ev.type === 'action.cleared') notice(`+${ev.xp} XP`, 'xp');
                if (ev.type === 'text' && ev.notice) notice(ev.text, DP.noticeKind(ev.notice));
                else if (ev.type === 'text' && /evolve|journal/.test(ev.text) && ev.important) notice(ev.text, 'quest');
            }
            for (const r of out.world) {
                if (r.type === 'transition') { sim.enterMap(); arriveAction(r); }
                else if (r.type === 'boundary') { syncFromSim(); openDialog([r.text], r.title); }
                else if (r.type === 'interact') interact();
                else if (r.type === 'respawn') { syncFromSim(); openDialog(['You fall… and come to where you entered, aching but alive.'], null, afterStory); }
            }
            if (out.engineEvents.some((e) => e.type === 'action.end')) { updateHud(); afterStory(); }
            // A gaze woke something (the Fallen Seraph): it speaks at once.
            if (out.engineEvents.some((e) => e.type === 'gaze' && e.stage === 'awake') && engine.getAvailableActions().awaiting === 'dialogue') { syncFromSim(); updateHud(); openTalk(out.engineEvents.filter((e) => !e.notice)); }   // its notices already showed above
        }
        syncFromSim(now);
        if (engine.player.hp < lastPlayerHp) afx.spawn('damage', { x: sim.player.x, y: sim.player.y - 18, amount: lastPlayerHp - engine.player.hp, taken: true }, now);
        lastPlayerHp = engine.player.hp;
        els.hud.hidden = true;
        els.prompt.hidden = true;
        if (hud) {
            syncActionHudVisibility();
            if (touch) els.pad.classList.toggle('hud-off', hud.el.hidden);
            const model = ENSO.actionHud.viewModel(engine, hudView(now), now);
            hud.update(model, now);
            if (touch) touch.update(model);
            placeNotices();
        }
    }

    /** A walked-through exit: the same arrival as a tile step's fade (banner, story pages, quests). */
    function arriveAction(r) {
        syncFromSim();
        fade = { t0: performance.now(), phase: 'in', result: r };
        showBanner(WORLD.maps[session.mapId].name);
        updateHud();
        showStory(r.text, r.events, null, afterStory);
    }

    function actionFxEvent(ev, now) {
        const P = sim.player;
        switch (ev.type) {
            case 'hit': afx.spawn('hit', { x: ev.x, y: ev.y, angle: ev.angle, damageType: 'physical' }, now); break;
            case 'damage': afx.spawn('damage', { x: ev.x, y: ev.y, amount: ev.amount, taken: !!ev.ally }, now); break;
            case 'summon': afx.spawn('aoe', { x: ev.x, y: ev.y, radius: 12, damageType: 'shadow', life: Math.max(420, ev.ms || 0) }, now); break;   // the grave opens where it rises
            case 'crumble': afx.spawn('death', { x: ev.x, y: ev.y }, now); break;
            case 'teleport': afx.spawn('death', { x: ev.x, y: ev.y }, now); afx.spawn('aoe', { x: ev.toX, y: ev.toY, radius: 10, damageType: 'shadow' }, now); break;
            case 'death': afx.spawn('death', { x: ev.x, y: ev.y }, now); break;
            case 'dodge': afx.spawn('dodge', { x: ev.x, y: ev.y, angle: ev.angle, distance: ev.distance, facing: P.facing }, now); break;
            case 'parry': afx.spawn('parry', { x: ev.x, y: ev.y - 8, shake: 2 }, now); break;
            case 'guard': afx.spawn('guard', { x: ev.x, y: ev.y - 8, angle: P.angle }, now); break;
            case 'pickup': afx.spawn('pickup', { x: ev.x, y: ev.y }, now); break;
            case 'aoe': afx.spawn('aoe', { x: ev.x, y: ev.y, radius: ev.radius, ...(ev.damageType ? { damageType: ev.damageType } : {}) }, now); break;
            case 'evade': afx.spawn('damage', { x: ev.x, y: ev.y - 20, text: ev.why === 'blind' ? 'MISS' : 'EVADE' }, now); break;   // Evasion, or a swing blinded by smoke
            case 'mines': afx.spawn('aoe', { x: ev.x, y: ev.y, radius: 10, damageType: 'physical' }, now); break;
            case 'cast': afx.spawn('cast', { x: ev.x, y: ev.y - 8, cls: engine.player.className }, now); break;
            case 'player_hit': afx.spawn('hit', { x: ev.x, y: ev.y - 8, damageType: 'physical', shake: 2 }, now); break;
            case 'perfect_dodge': afx.spawn('damage', { x: ev.x, y: ev.y - 20, text: 'DODGE' }, now); break;
            case 'stagger': afx.spawn('hit', { x: ev.x, y: ev.y - 8, damageType: 'true' }, now); break;
            case 'engage': notice(`${ev.name || 'Enemies'}: they've seen you!`, 'quest'); break;
            case 'disengage': notice('They give up the chase.', 'quest'); break;
            case 'phase': afx.spawn('aoe', { x: ev.x, y: ev.y, radius: 24, damageType: 'shadow', shake: 3 }, now); notice('The Warden changes his stance!', 'quest'); break;
            case 'resolve': afx.spawn('aoe', { x: ev.x, y: ev.y, radius: 20, damageType: 'holy', shake: 2 }, now); break;
            case 'resolve_end': afx.spawn('hit', { x: ev.x, y: ev.y - 8, damageType: 'true', shake: 1 }, now); break;
            case 'crow_mark': notice(ev.target === 'player' ? 'A crow marks you! Move before it dives.' : 'A crow marks one of your summons!', 'quest'); break;
            case 'crow_dive': afx.spawn('hit', { x: ev.x, y: ev.y - 4, damageType: 'shadow', shake: 1 }, now); break;
            case 'illusion_pop': afx.spawn('death', { x: ev.x, y: ev.y }, now); afx.spawn('aoe', { x: ev.x, y: ev.y, radius: 10, damageType: 'shadow' }, now); break;
            case 'crow_storm': afx.spawn('aoe', { x: P.x, y: P.y, radius: 6, damageType: 'shadow', shake: 3 }, now); break;
            case 'refused': if (!/cooldown|Recovering|mid-swing/i.test(ev.text || '')) toast(ev.text); break;
            case 'notice': toast(ev.text); break;
            default: break;
        }
    }

    /** The renderer's view from the sim: the player's body in tile units, the action pose, the actors. */
    function syncFromSim(now = performance.now()) {
        if (!sim) return;
        const v = sim.view();
        const T = sim.T;
        const p = v.player;
        view.mapId = session.mapId;
        view.x = p.x / T - 0.5;
        view.y = (p.y - T / 2 + 2) / T;   // drawPlayer puts the feet at y*T + T - 2: the body's centre is a little above the feet
        view.facing = p.facing;
        view.facing8 = p.facing8;   // the sprite turns 8 ways; view.facing stays the 4-way world facing
        view.moving = p.moving;
        // Which attack you see follows what the attack is: a cut for the weapon's arc, a two-handed blow for a skill's arc,
        // a lunge down a line, a dash, and a cast for everything thrown, placed or called up.
        const kind = p.state === 'attack' && p.attack ? (p.attack.shape && p.attack.shape.shape) || 'arc' : null;
        const pose = p.state === 'attack' ? (kind === 'arc' ? (p.attack.isBasic ? 'swing' : 'heavy') : kind === 'line' || kind === 'column' ? 'thrust' : kind === 'dash' ? 'dodge' : 'cast') : p.state === 'dodge' ? 'dodge' : p.state === 'hurt' ? 'hurt' : p.guarding ? 'guard' : null;
        const key = pose ? `${pose}:${p.state === 'attack' && p.attack ? p.attack.shape && p.attack.skill : ''}` : '';
        if (pose && (playerAnim.name !== pose || playerAnim.key !== key)) playerAnim = { name: pose, t0: now, key };
        if (!pose) playerAnim = { name: null, t0: 0, key: '' };
        view.anim = playerAnim.name;
        view.animT = playerAnim.name ? now - playerAnim.t0 : null;
        // An attack's animation is spread over the attack's real length (a hasted or slow weapon swings as fast as it hits).
        if (p.state === 'attack' && p.attack && p.attack.progress != null && ENSO.sprites.animationsOf) {
            const a = ENSO.sprites.animationsOf(ENSO.sprites.characterFor(view.className))[pose];
            if (a && a.once) view.animT = Math.min(0.999, p.attack.progress) * a.steps.reduce((t, s) => t + s.ms, 0);
        }
        view.reducedMotion = REDUCED;   // no hit flash on the player when motion is reduced
        view.actors = v.actors.map((a) => ({
            y: (a.y - T / 2 + 2) / T,
            draw: (g, time) => {
                const angel = a.key === 'heaven_doorwarden' && ENSO.gazeFx && a.state !== 'dead';   // Aurevain: wings behind, halo over the helm
                if (angel) ENSO.gazeFx.playerWings(g, Math.round(a.x), Math.round(a.y + (a.r || 5)) - 6, 'down', time);
                const visible = AFX.drawEnemy(g, a.key, Math.round(a.x), Math.round(a.y + (a.r || 5)), { facing: a.facing, angle: a.angle, attack: a.attack, progress: a.telegraph ? a.telegraph.progress : a.attack ? a.attack.progress : a.progress, state: a.state === 'chase' || a.state === 'return' ? 'move' : a.state === 'active' ? 'attack' : a.state === 'stunned' ? 'stagger' : a.state, t: a.t, now: time });
                if (angel) ENSO.gazeFx.playerHalo(g, Math.round(a.x), Math.round(a.y + (a.r || 5)) - 10, time);
                const barY = visible ? visible.y - 4 : a.y - 18;
                if (a.engaged && a.hp != null && a.state !== 'dead') AFX.enemyBar(g, Math.round(a.x), Math.round(barY), a.boss ? 26 : 16, a.hp, a.maxHp, { statuses: (a.statuses || []).map((s) => s.name), boss: a.boss, stunned: a.stunned });
                if (a.sid === lockId) AFX.targetRing(g, Math.round(a.x), Math.round(a.y + 4), 9, time);
            }
        })).concat((v.minions || []).map((m) => ({   // your summons: the same body art pipeline, an ally bar, rising out of the ground
            y: (m.y - T / 2 + 2) / T,
            draw: (g, time) => {
                if (m.state === 'dead') { AFX.crumble(g, m.key, Math.round(m.x), Math.round(m.y + (m.r || 5)), m.t); return; }   // the bones fall apart
                const rise = m.state === 'rise' ? Math.min(1, m.t / Math.max(1, m.riseMs || 1)) : 1;
                g.save();
                if (rise < 1) { g.globalAlpha *= 0.25 + 0.75 * rise; g.translate(0, Math.round((1 - rise) * 6)); }
                if (m.timeLeftMs != null && m.timeLeftMs < 5000 && Math.floor(time / 120) % 2) g.globalAlpha *= 0.55;   // its last 5 s out of a fight: it flickers
                const champion = m.key === 'skeleton_champion';   // March of Endless Bones: a bigger skeleton
                const visible = AFX.drawEnemy(g, champion ? 'skeleton' : m.key, Math.round(m.x), Math.round(m.y + (m.r || 5)), { facing: m.facing, angle: m.angle, scale: champion ? 1.35 : 1, state: m.state === 'move' ? 'move' : m.state === 'active' ? 'attack' : m.state === 'stunned' ? 'stagger' : m.state === 'rise' ? 'idle' : m.state, t: m.t, now: time });
                g.restore();
                const barY = visible ? visible.y - 4 : m.y - 18;
                if (m.state !== 'dead' && m.hp != null) AFX.enemyBar(g, Math.round(m.x), Math.round(barY), 14, m.hp, m.maxHp, { ally: true, statuses: (m.statuses || []).map((s) => s.name), stunned: m.stunned });
            }
        }))).concat(((engine.player && engine.player.statusEffects) || []).filter((s) => s.ghost).map((s, i, all) => ({   // Channel the Grave: the ghosts circle you
            y: (p.y - T / 2 + 3) / T,
            draw: (g, time) => {
                const a = time / 700 + (i * Math.PI * 2) / all.length;
                const x = Math.round(p.x + Math.cos(a) * 12), y = Math.round(p.y - 12 + Math.sin(a) * 4 + Math.sin(time / 260 + i) * 1.5);
                g.save();
                g.globalAlpha *= 0.6;
                g.fillStyle = GHOST_TINT[s.type] || '#d8ecff';
                g.beginPath(); g.arc(x, y, 3, Math.PI, 0); g.lineTo(x + 3, y + 4); g.lineTo(x + 1, y + 3); g.lineTo(x - 1, y + 4); g.lineTo(x - 3, y + 3); g.closePath(); g.fill();
                g.globalAlpha = 0.9; g.fillStyle = '#10141c'; g.fillRect(x - 2, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1);
                g.restore();
            }
        })));
    }

    /** Explosive Caltrops: a spiked iron charge on the ground; its fuse glows once armed and blinks in its last 3 s. */
    function drawMine(g, m, time) {
        const x = Math.round(m.x), y = Math.round(m.y);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 3, y + 1, 7, 2);
        g.fillStyle = '#3a3a44'; g.fillRect(x - 2, y - 2, 5, 4);
        g.fillStyle = '#8a8ea0'; g.fillRect(x, y - 4, 1, 2); g.fillRect(x - 4, y, 2, 1); g.fillRect(x + 3, y, 2, 1); g.fillRect(x, y + 2, 1, 1);   // spikes
        const blink = m.leftMs < 3000 && Math.floor(time / 150) % 2;
        if (m.armed && !blink) { g.fillStyle = Math.floor(time / 300) % 2 ? '#ff7a20' : '#ffd060'; g.fillRect(x, y - 1, 1, 1); }
    }

    /** Channel the Grave's ghosts, tinted by what they give (damage red, Soul Energy violet, speed cyan, poison green, bleed crimson). */
    const GHOST_TINT = { damage_boost: '#ffb0a0', resource_regen: '#d6b8ff', haste: '#b8f4ff', on_hit_dot: '#c8ffb0' };

    /** What Pixie's HUD reads from the world (ui/action-hud.js viewModel). */
    function hudView(now) {
        const v = sim.view();
        const p = v.player;
        const enemies = v.actors.filter((a) => a.engaged && a.state !== 'dead' && a.engineId).map((a) => ({ id: a.sid, name: a.name, hp: a.hp, maxHp: a.maxHp, boss: a.boss, phase: a.phase, phases: a.phases }));
        const boss = enemies.find((e) => e.boss);
        const pr = !v.engaged && screen === 'explore' && !modal && !fade && !flash ? session.prompt() : null;
        return {
            appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className,
            stamina: { cur: p.stamina, max: p.staminaMax },
            dodgeReadyInMs: Math.max(0, sim.player.dodgeReadyAt - sim.now),
            guarding: p.guarding,
            calmNow: engine.world && engine.world.calm ? engine.world.calm.now : null,   // pre-buff timers out of a fight
            lockTargetId: lockId,
            enemies,
            boss: boss ? { name: boss.name, hp: boss.hp, maxHp: boss.maxHp, phase: boss.phase, phases: boss.phases } : null,
            prompt: pr && pr.kind !== 'encounter' ? { key: 'E', verb: pr.verb, name: pr.name } : null,
            quests: trackedQuests(),
            notices: []   // reward notices show in the shared feed (notify), so they stay visible over dialogue
        };
    }

    if (ACTION) {
        // Under the bodies: wind-up telegraphs and loot on the ground.
        renderer.addHook('ground', (g, ctx) => {
            if (!sim || screen === 'title') return;
            for (const d of engine.getWorldDrops ? engine.getWorldDrops(session.mapId) : []) {
                const bob = Math.round(Math.sin(ctx.time / 300 + d.x) * 1);
                g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(Math.round(d.x) - 4, Math.round(d.y) + 2, 8, 2);
                g.fillStyle = d.items.length ? '#c9a2ff' : '#e8c860'; g.fillRect(Math.round(d.x) - 3, Math.round(d.y) - 4 + bob, 6, 5);
                g.fillStyle = '#fff6d0'; g.fillRect(Math.round(d.x) - 1, Math.round(d.y) - 3 + bob, 2, 1);
            }
            for (const a of sim.view().actors) if (a.telegraph) for (const sh of a.telegraph.kind === 'multi' ? a.telegraph.shapes : [a.telegraph]) AFX.telegraph(g, sh, a.telegraph.progress, ctx.time, { boss: a.boss });
            for (const a of sim.view().actors) if (a.resolve) AFX.resolveAura(g, a.x, a.y + (a.r || 5) - 2, a.r || 10, a.resolve, ctx.time);   // Guardian's Resolve
            for (const m of sim.view().mines || []) drawMine(g, m, ctx.time);   // Explosive Caltrops
        });
        // Over the bodies: the player's swing, projectiles, sparks and numbers.
        renderer.addHook('foreground', (g, ctx) => {
            if (!sim || screen === 'title') return;
            const v = sim.view();
            const p = v.player;
            if (p.attack && p.attack.shape && !['projectile', 'self', 'summon'].includes(p.attack.shape.shape || p.attack.shape.kind)) {   // a summon is a cast at the aim point, not a swing
                const s = p.attack.shape;
                AFX.swing(g, { x: Math.round(p.x), y: Math.round(p.y), angle: p.angle, arc: ((s.arcDeg || 100) * Math.PI) / 180, reach: s.reach || s.radius || 20, progress: p.attack.progress, cls: engine.player.className });
            }
            for (const pj of v.projectiles) AFX.projectile(g, { x: pj.x, y: pj.y, angle: pj.angle, kind: pj.kind, now: ctx.time });
            for (const a of v.actors) if (a.mark) AFX.crowMark(g, a.mark.x, a.mark.y, { locked: a.mark.locked, now: ctx.time });   // Marked Prey
            drawGaze(g, ctx.time);   // the Kloster statue's halo and wings (ui/gaze-fx.js)
            afx.draw(g, ctx.time);
        });
    }

    /** Objects with a gaze rule (the Fallen Seraph statue): draw what the engine says the gaze has woken. */
    function drawGaze(g, now) {
        if (!ENSO.gazeFx || !engine.gazeView) return;
        const rules = DATA.gazeRules || {};
        for (const o of session.map.interactables || []) {
            const r = rules[o.id];
            if (!r || !session.present(o)) continue;
            ENSO.gazeFx.draw(g, { id: o.id, view: engine.gazeView(o.id), x: (o.x + (o.w || 1) / 2) * sim.T, y: (o.y + (o.h || 1)) * sim.T - (r.anchorUp || 0) }, now);
        }
    }

    // ---------------------------------------------------------------------
    // World actions
    // ---------------------------------------------------------------------
    function syncView() { view.mapId = session.mapId; view.x = session.x; view.y = session.y; view.facing = session.facing; }
    function busy() { return !!(anim || fade || modal || screen !== 'explore'); }

    function tryStep(dir, now) {
        const fx = session.x, fy = session.y;
        const r = session.move(dir);
        view.facing = dir;
        if (r.type === 'blocked') {
            if (r.cooling && now - lastBump > 900) toast("It's still watching you. Step away first.");
            lastBump = now;
            return;
        }
        if (r.type === 'encounter') { muteHeldKeys(); flashThen(() => beginBattle(r)); return; }
        if (r.type === 'locked') { lastBump = now; openDialog([r.text], null); return; }
        if (r.type === 'moved' || r.type === 'boundary') {
            anim = { fx, fy, tx: r.x, ty: r.y, t0: now, then: r.type === 'boundary' ? () => { syncView(); openDialog([r.text], r.title); } : null };
            return;
        }
        if (r.type === 'transition') {
            const [dx, dy] = DIRS[dir];
            anim = { fx, fy, tx: fx + dx, ty: fy + dy, t0: now, then: () => startFade(r) };
        }
    }
    function startFade(result) { fade = { t0: performance.now(), phase: 'out', result }; }
    let flash = null;
    function flashThen(fn) { if (REDUCED) { fn(); return; } flash = { t0: performance.now(), fn }; }

    /** The "E: Inspect Scratched wall" hint for whatever you're facing (hidden while anything else is up). */
    let lastPrompt = '';
    function updatePrompt() {
        const p = screen === 'explore' && !modal && !fade && !flash && !feathering ? session.prompt() : null;
        const html = p ? `<kbd>E</kbd> ${esc(p.verb)}${p.name ? `: <b>${esc(p.name)}</b>` : ''}` : '';
        if (p && p.kind === 'encounter') { if (html !== lastPrompt) { els.prompt.innerHTML = `${esc(p.name)} · ${esc(p.verb)}`; lastPrompt = html; } els.prompt.hidden = false; return; }
        if (html !== lastPrompt) { els.prompt.innerHTML = html; lastPrompt = html; }
        els.prompt.hidden = !p;
    }

    function interact() {
        if (performance.now() - closedAt < 300) return;
        const r = session.interact();
        if (r.type === 'talk') { seen.add(r.id); updateHud(); if (engine.getAvailableActions().awaiting === 'dialogue') openTalk(r.events); else showStory(null, r.events, r.title, afterStory, '…'); return; }
        if (r.type === 'message') {
            seen.add(r.id);
            showStory(r.text, r.events, r.title, afterStory);
            return;
        }
        if (r.type === 'pickup') {
            updateHud();
            showStory(r.text, r.events, r.title, afterStory);
            return;
        }
        if (r.type === 'transition') startFade(r);
    }

    // ---------------------------------------------------------------------
    // Input
    // ---------------------------------------------------------------------
    const KEY_DIRS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    const ACT = new Set(['e', 'E', 'Enter', ' ']);
    const isAct = (ev) => ACT.has(ev.key);

    /** A key held while focus moves (map -> battle, map -> dialog, menu -> map) must be released before it
     *  counts again, so walking into an enemy can't also scroll the battle menu, and so on. */
    function muteHeldKeys() { held.length = 0; for (const k of down) stale.add(k); }

    window.addEventListener('keydown', (ev) => {
        const dir = KEY_DIRS[ev.key];
        if (dir || isAct(ev) || ev.key === 'Escape') ev.preventDefault();
        if (stale.has(ev.key)) return;
        down.add(ev.key);
        if (screen === 'title' || screen === 'combat' || screen === 'over' || modal === 'pause' || modal === 'branch' || modal === 'talk') {
            if ((screen === 'combat' || screen === 'over') && battle && (ev.key === 'l' || ev.key === 'L') && !ev.repeat) { toggleBattleLog(); return; }
            if (screen === 'combat' && isRealtime() && ev.key === 'Tab') ev.preventDefault();   // Tab cycles targets, never the page focus
            if (screen === 'combat' && isRealtime() && !battle.ended && !battle.rt.paused && !menu && engine.mode === 'combat') { rtKey(ev); return; }
            if (modal === 'pause' && mm.webScreen) { webKey(ev, dir); return; }
            if (modal === 'pause' && menu && (dir === 'left' || dir === 'right') && !ev.repeat && mainMenuSideways(dir)) return;
            if (modal === 'pause' && (ev.key === 'PageDown' || ev.key === 'PageUp')) { const pg = els.pause.querySelector('.mm-page'); if (pg) pg.scrollTop += (ev.key === 'PageDown' ? 1 : -1) * pg.clientHeight * 0.8; return; }
            if (modal === 'talk' && talk && talk.reading) { talkKey(ev); return; }
            if (modal === 'talk' && typing && isAct(ev) && !ev.repeat) { finishTyping(); return; }
            if (menu) menuKey(menu, ev, dir);
            return;
        }
        if (modal === 'dialog') {
            if (ev.repeat) return;
            if (isAct(ev)) advanceDialog(false);
            else if (ev.key === 'Escape') advanceDialog(true);
            return;
        }
        if (dir) {
            if (!ev.repeat && !held.includes(dir)) held.push(dir);
            return;
        }
        if (ACTION && actionKey(ev)) return;
        if (ev.repeat || fade || anim || flash || feathering) return;
        if (isAct(ev)) interact();
        else if (ev.key === 'Escape') openPause();
    });
    window.addEventListener('keyup', (ev) => {
        down.delete(ev.key);
        stale.delete(ev.key);
        const dir = KEY_DIRS[ev.key];
        if (!dir) return;
        const i = held.indexOf(dir);
        if (i !== -1) held.splice(i, 1);
    });
    window.addEventListener('blur', () => { held.length = 0; down.clear(); stale.clear(); });

    // On-screen controls for touch screens (coarse pointers only; ui/touch-controls.js): a joystick with
    // diagonals, the skill bar, dash, guard, heal, interact and menu. They send the same keys as the keyboard.
    if (touch) {
        window.addEventListener('blur', () => touch.release());
        document.addEventListener('visibilitychange', () => { if (document.hidden) touch.release(); });
    }

    // ---------------------------------------------------------------------
    // Frame loop
    // ---------------------------------------------------------------------
    function frame(now) {
        if (screen === 'title') {
            const sp = WORLD.maps[WORLD.start.map].spawns[WORLD.start.spawn];
            const cls = creator && creator.step === 'class' && menu ? classes[menu.index] : (creator ? creator.cls : classes[0]);
            const look = creator && creator.step === 'look' && menu ? menu.index : (creator ? creator.look : 0);
            if (creator && ['hairStyle','hairColor','outfit'].includes(creator.step) && menu) creator[creator.step] = menu.index;
            renderer.draw({ ...view, mapId: WORLD.start.map, x: sp.x, y: sp.y, className: cls, appearance: look, cosmetics: creator ? cosmeticsFromCreator() : defaultCosmetics(), marker: null, markers: [], fade: 0.35 }, [], now);
            requestAnimationFrame(frame);
            return;
        }
        autosaveTick(now);
        if (anim) {
            const k = Math.min(1, (now - anim.t0) / (STEP_MS * ((WORLD.maps[view.mapId].tileSize || 32) / 32)));
            view.x = anim.fx + (anim.tx - anim.fx) * k;
            view.y = anim.fy + (anim.ty - anim.fy) * k;
            view.moving = true;
            if (k >= 1) { const then = anim.then; anim = null; if (then) then(); else syncView(); }
        }
        if (fade) {
            const k = Math.min(1, (now - fade.t0) / fadeMs());
            view.fade = fade.phase === 'out' ? k : 1 - k;
            if (k >= 1 && fade.phase === 'out') {
                syncView();
                fade = { t0: now, phase: 'in', result: fade.result };
                showBanner(WORLD.maps[session.mapId].name);
                updateHud();
                showStory(fade.result.text, fade.result.events, null, afterStory);
            } else if (k >= 1) { fade = null; view.fade = 0; }
        }
        if (flash) {
            const k = (now - flash.t0) / 360;
            view.fade = k < 1 ? Math.abs(Math.sin(k * Math.PI * 2)) * 0.8 : 0;
            if (k >= 1) { const fn = flash.fn; flash = null; fn(); }
        }
        if (ACTION) actionFrame(now);   // combat v3: free movement and fights in the world
        else if (screen === 'explore' && !busy() && !flash && held.length && now - lastBump >= BUMP_MS) tryStep(held[held.length - 1], now);
        if (!ACTION && !anim) view.moving = false;
        if (screen !== 'title' && !ACTION) updatePrompt();
        rtFrame(now);   // before drawActor: a tick that re-renders the overlay gets its sprite drawn this same frame
        if (screen === 'combat' || screen === 'over') drawActor(now);
        drawFx(now);
        const objects = session.visibleObjects(view.mapId).filter((o) => !(ACTION && o.kind === 'encounter')).map((o) => ({ ...o, seen: seen.has(o.id), crop: cropOn(o) }));   // action enemies are sim actors
        const battle = (screen === 'combat' || screen === 'over') && !!ENSO.battleHD;   // HD-2D: a painted stage (ui/battle-hd.js)
        const dim = screen === 'combat' || screen === 'over' ? (battle ? 0 : 0.7) : view.fade;   // otherwise the dimmed map is the backdrop
        view.look = engine.legendaryLook ? engine.legendaryLook() : null;   // the Fallen Seraphim's halo, wings and red eyes
        if (view.cosmetics) { const held = heldWeapon(); if (view.cosmetics.held !== held) view.cosmetics = { ...view.cosmetics, held }; }
        renderer.draw({ ...view, battle, fade: Math.max(dim, view.fade) }, objects, now);
        requestAnimationFrame(frame);
    }

    /** What's growing on a field or garden bed (the engine's plotView), so the renderer can draw it. Pens draw their own animals. */
    function cropOn(o) {
        if (o.kind !== 'station' || typeof engine.plotView !== 'function') return null;
        const v = engine.plotView(o.station);
        return v && !v.livestock && v.produces ? v : null;
    }

    // Console helpers for testing and QA (not part of play): ensoDebug.goto('grounds', 'from_house')
    window.ensoDebug = {
        world: WORLD,   // the world as played (16 px tiles); ENSO.world.zone1 keeps the authored 32 px coordinates
        goto(mapId, spawn) { session.place(mapId, spawn); if (sim) sim.enterMap(); syncView(); showBanner(WORLD.maps[mapId].name); updateHud(); },
        sim() { return sim; },
        start(cls, name, look, cosmetics) { startGame(cls || 'warrior', name, look, cosmetics); advanceDialog(true); setTimeout(() => document.activeElement && document.activeElement.blur && document.activeElement.blur(), 0); },   // the name box's delayed focus would eat keys
        actor(name) { playActor(name); return actor.anim; },
        /** Stand next to a visible enemy on this map, facing it (then walk into it to fight). */
        nextTo(id) {
            const e = session.map.encounters.find((x) => x.id === id);
            for (const [dx, dy, f] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) {
                if (session.isBlocked(e.x + dx, e.y + dy)) continue;
                session.x = e.x + dx; session.y = e.y + dy; session.facing = f; syncView(); return f;
            }
            return null;
        },
        /** Stand next to a map object (an NPC, a sign, a station), facing it; then E talks or uses it. */
        nextToObject(id) {
            const o = (session.map.interactables || []).find((x) => x.id === id);
            if (!o) return null;
            for (const [dx, dy, f] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) {
                if (session.isBlocked(o.x + dx, o.y + dy)) continue;
                session.x = o.x + dx; session.y = o.y + dy; session.facing = f;
                if (sim) sim.enterMap();
                syncView(); return f;
            }
            return null;
        },
        state() { return { screen, modal, map: session && session.getState(), mode: engine && engine.mode, seed: engine && engine.seed }; }
    };

    showTitle();
    fitStage();
    requestAnimationFrame(frame);
})();
