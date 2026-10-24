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
    const WORLD = ENSO.world.zone1;
    const DATA = ENSO.data;
    const CV = ENSO.crowView;
    const SYSTEM_REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let REDUCED = SYSTEM_REDUCED;   // Settings → Motion can override the system choice (applyMotion below)
    const STEP_MS = 150;     // one tile step
    const fadeMs = () => (REDUCED ? 60 : 220);     // each half of a map transition
    const FEATHER_MS = 700;  // Black Flight: feathers rise before the fade
    const BUMP_MS = 180;     // minimum gap between "blocked" bumps while a key is held
    const LOG_LINES = 80;    // battle log kept on screen

    const $ = (id) => document.getElementById(id);
    const canvas = $('world-canvas');
    const renderer = ENSO.gfx.createView(canvas, WORLD, { tile: 32 });   // HD-2D when WebGL is there (ui/postfx.js)
    const els = {
        title: $('title'), dialog: $('dialog'), pause: $('pause'), hud: $('hud'), banner: $('banner'),
        problems: $('problems'), combat: $('combat'), toast: $('toast'), prompt: $('prompt'), pad: $('touch-pad')
    };
    // ---------------------------------------------------------------------
    // Display: the stage is sized in whole screen pixels per canvas pixel when that fits well
    // (ui/display.js). The choice is a per-browser preference, kept outside any save.
    // ---------------------------------------------------------------------
    const DISPLAY_KEY = 'enso.ui.display';
    let displayMode = (() => { try { const m = localStorage.getItem(DISPLAY_KEY); return ENSO.display.MODES.includes(m) ? m : 'auto'; } catch (e) { return 'auto'; } })();
    function fitStage() {
        const stage = $('world-stage'), shell = stage.parentElement;
        const help = shell.querySelector('.world-help');
        const below = (help ? help.offsetHeight + 10 : 0) + (els.pad && !els.pad.hidden ? els.pad.offsetHeight + 12 : 0);
        const f = ENSO.display.fit(window.innerWidth - 32, window.innerHeight - 24 - below, displayMode);
        shell.style.width = `${f.w}px`;
        Object.assign(stage.style, { width: `${f.w}px`, height: `${f.h}px`, aspectRatio: 'auto' });
        stage.classList.toggle('tall', f.tall);
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
    const view = { mapId: WORLD.start.map, x: 0, y: 0, facing: 'down', moving: false, className: null, appearance: 0, marker: null, fade: 0 };
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
    const HAIR_STYLES = ['Wild Raven', 'Round Crop', 'Spiky', 'Straight Fringe', 'Long Side Strands', 'Swept', 'Soft Layers', 'Clean Crop', 'Side Part', 'Medium Layers', 'Braids', 'High Ponytail'];
    const HAIR_COLOURS = ['Raven', 'Chestnut', 'Ash', 'Copper'];
    const OUTFITS = ['Worn Traveler', 'Tattered', 'Armored', 'Ceremonial'];
    const defaultCosmetics = () => ({ hairStyle: 0, hairColor: 0, outfit: 0 });
    function showTitle() {
        screen = 'title';
        modal = 'creator';                    // the creation steps (Enter, Enter, Enter starts with the defaults)
        for (const el of [els.hud, els.dialog, els.pause, els.combat, els.prompt]) el.hidden = true;
        els.title.hidden = false;
        creator = { step: 'name', name: creator ? creator.name : '', cls: classes[0], look: 0, ...defaultCosmetics() };
        creatorStep(readSave() ? 'start' : 'name');
    }
    const CREATOR_FLOW = ['name', 'class', 'look', 'hairStyle', 'hairColor', 'outfit'];
    function creatorNext() {
        if (menu && CREATOR_FLOW.includes(creator.step)) {
            if (creator.step === 'class') creator.cls = classes[menu.index];
            else if (creator.step === 'look') creator.look = menu.index;
            else if (['hairStyle','hairColor','outfit'].includes(creator.step)) creator[creator.step] = menu.index;
        }
        if (creator.step === 'name') {
            const input = els.title.querySelector('#hero-name');
            if (input) creator.name = input.value;
        }
        if (creator.step === 'outfit') {
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
            const when = save && save.meta && save.meta.createdAt ? new Date(save.meta.createdAt).toLocaleString() : '';
            menu = makeMenu([
                { label: 'Continue', sub: `${(save && save.meta && save.meta.label) || 'Saved game'}${when ? ` · ${when}` : ''}`, action: () => continueGame(save) },
                { label: 'New game', sub: 'The saved game stays until you save over it.', action: () => creatorStep('name') }
            ], { render: renderTitle });
        }
        const options = step === 'class' ? classes.map(key => DATA.basePlayerClasses[key].name)
            : step === 'look' ? looks.map(l => l.label)
            : step === 'hairStyle' ? HAIR_STYLES
            : step === 'hairColor' ? HAIR_COLOURS
            : step === 'outfit' ? OUTFITS : null;
        if (options) {
            menu = makeMenu(options.map((label, i) => ({
                label,
                sub: step === 'class' ? DATA.basePlayerClasses[classes[i]].description : null,
                action: () => {
                    if (step === 'class') creator.cls = classes[i];
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
        return { hairStyle: creator.hairStyle, hairColor: creator.hairColor, outfit: creator.outfit };
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
                <div class="creator-nav"><button type="button" data-creator-next>Next →</button></div><p class="keys">Type a name (or leave it blank) · Enter continue</p>`;
            const input = els.title.querySelector('#hero-name');
            input.addEventListener('input', () => { creator.name = input.value; });
            input.addEventListener('keydown', (ev) => {
                ev.stopPropagation();                     // typing never walks, opens menus, or picks things
                if (ev.key === 'Enter') { ev.preventDefault(); creatorNext(); }
            });
            els.title.querySelector('[data-creator-next]').addEventListener('click', creatorNext);
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
        const skinSwatches = ['#d9c3a5','#c69072','#8a5a40','#efd9c4'];
        const hairSwatches = ['#2b2320','#6b4530','#a3a0a1','#b05b36'];
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
                        <p class="vessel-preview-caption">Your actual in-game sprite · 24 × 32 artwork</p>
                    </section>
                    <section class="vessel-customize" aria-label="Appearance options">
                        <h2>${isClass ? 'CHOOSE A CLASS' : 'APPEARANCE OPTIONS'}</h2>
                        ${isClass ? classOptions : `
                        ${cycle('look','Skin tone',looks.map(l => l.label),creator.look)}
                        ${cycle('hairStyle','Hair style',HAIR_STYLES,creator.hairStyle)}
                        ${cycle('outfit','Outfit',OUTFITS,creator.outfit)}
                        ${swatches('hairColor','Hair colour',hairSwatches,creator.hairColor)}
                        ${swatches('look','Skin tone',skinSwatches,creator.look)}
                        <div class="vessel-styles-heading">HAIRSTYLES <span>12 DISTINCT STYLES</span></div>
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
                    <button type="button" data-creator-next>${creator.step === 'outfit' ? 'Start Game →' : 'Continue →'}</button>
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
            const max = field === 'look' ? looks.length : field === 'hairStyle' ? HAIR_STYLES.length : OUTFITS.length;
            creator[field] = (creator[field] + Number(button.dataset.delta) + max) % max;
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
            ENSO.sprites.drawCharacter(ctx, 96, 183, { appearance, cosmetics: cosmetic, className, facing, anim: 'idle', scale: 5, basePlayer: true }, 0);
        }
        els.title.querySelectorAll('[data-style-preview]').forEach(tile => {
            const g = tile.getContext('2d');
            if (!g) return;
            g.imageSmoothingEnabled = false;
            ENSO.sprites.drawCharacter(g, 24, 60, {
                appearance, cosmetics: { ...cosmetic, hairStyle: Number(tile.dataset.stylePreview) },
                className, facing: 'down', anim: 'idle', scale: 2
            }, 0);
        });
    }

    /** ?seed=123 in the address replays a run; otherwise the engine picks a seed and the pause menu shows it. */
    function seedFromUrl() {
        const m = /[?&]seed=(\d+)/.exec(location.search || '');
        return m ? parseInt(m[1], 10) : undefined;
    }

    // Save / continue: the engine makes and checks the save (Phase 1 spec §5); this page keeps one slot in the
    // browser. Your place on the map travels in the save's attachments (the world owns space).
    const SAVE_KEY = 'enso.world.save.v1';
    function readSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
    function saveGame() {
        const p = engine.getState().player;
        const save = engine.serialize({ label: `${p.name} · Lv ${p.level} · ${WORLD.maps[session.mapId].name}`, createdAt: new Date().toISOString(),
            attachments: { world: session.getState(), seen: [...seen], cosmetics: view.cosmetics || defaultCosmetics() } });
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return 'Saved. Continue from the title screen next time.'; } catch (e) { return `Couldn't save in this browser (${e.message}).`; }
    }
    function continueGame(save) {
        let loaded;
        try { loaded = ENSO.GameEngine.fromSave(save); } catch (e) { toast("That save couldn't be loaded."); creatorStep('name'); return; }
        engine = loaded;
        window.enso = engine;
        session = new WorldSession(WORLD, { engine });
        session.restorePosition(((engine.lastLoad.attachments || {}).world) || null);
        window.ensoWorld = session;
        seen.clear();
        for (const id of ((engine.lastLoad.attachments || {}).seen) || []) seen.add(id);
        enterExplore(engine.player.className, engine.player.appearance || 0, (engine.lastLoad.attachments || {}).cosmetics || defaultCosmetics());
        const warn = engine.lastLoad.warnings.length ? ['(The game has been updated since this save. It loaded anyway.)'] : [];
        openDialog([`Welcome back, ${engine.player.name}.`, ...warn], null, afterStory);
    }
    function enterExplore(cls, look, cosmetics = defaultCosmetics()) {
        battle = null;
        syncView();
        view.className = cls;
        view.appearance = look;
        view.cosmetics = cosmetics;
        screen = 'explore';
        modal = null;
        menu = null;
        els.title.hidden = true;
        els.hud.hidden = false;
        updateHud();
        showBanner(WORLD.maps[session.mapId].name);
    }

    function startGame(cls, name, look, cosmetics = defaultCosmetics()) {
        engine = new ENSO.GameEngine({ seed: seedFromUrl() });
        window.enso = engine;                 // handy from the browser console
        engine.start();
        engine.act({ type: 'choose_class', classId: cls });
        if (STORY) engine.act({ type: 'set_identity', name: name || '', appearance: look || 0 });
        engine.act({ type: 'enter_world' });
        session = new WorldSession(WORLD, { engine });
        window.ensoWorld = session;
        seen.clear();
        enterExplore(cls, look || 0, cosmetics);
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
        const obj = engine.story ? engine.trackedObjective() : null;
        view.marker = obj && obj.marker && session && obj.marker.map === session.mapId ? { x: obj.marker.x, y: obj.marker.y } : null;
    }
    /** The tracked objective (the engine's choice) and where it is. */
    function objectiveHtml() {
        const obj = engine.story ? engine.trackedObjective() : null;
        if (!obj) return '';
        const there = obj.marker && session && obj.marker.map !== session.mapId ? ` <span class="hud-where">→ ${esc(WORLD.maps[obj.marker.map].name)}</span>` : '';
        return `<div class="hud-obj"><span class="hud-quest">${esc(obj.title)}</span>◆ ${esc(obj.text)}${there}</div>`;
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

    function openDialog(pages, title, onClose) {
        dialog = { pages: [].concat(pages).filter(Boolean), title, onClose: onClose || null };
        if (!dialog.pages.length) { dialog = null; if (onClose) onClose(); return; }
        modal = 'dialog';
        muteHeldKeys();
        renderDialog();
    }
    function renderDialog() {
        els.dialog.hidden = false;
        els.dialog.innerHTML = `${dialog.title ? `<div class="dialog-title">${esc(dialog.title)}</div>` : ''}
            <div class="dialog-text">${esc(dialog.pages[0])}</div>
            <div class="dialog-more">${dialog.pages.length > 1 ? '▼' : '■'}</div>`;
    }
    function advanceDialog(all) {
        if (all) dialog.pages = []; else dialog.pages.shift();
        if (dialog.pages.length) { renderDialog(); return; }
        els.dialog.hidden = true;
        modal = null;
        muteHeldKeys();
        const cb = dialog.onClose; dialog = null;
        if (cb) cb();
    }

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
            t = t.replace(/ Type 'start' to play again\.?/, '').replace(/ Type 'look'.*$/, '');
            out.push({ text: ev.html ? t.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ') : t, important: ev.important });
        }
        return out;
    }

    // ---------------------------------------------------------------------
    // Conversations (Chapter One). The engine holds the dialogue; this shows it and sends choices back.
    // Esc is a normal goodbye (so Shane still says his line); the engine decides what that means.
    // ---------------------------------------------------------------------
    function openTalk(events) {
        modal = 'talk';
        muteHeldKeys();
        els.prompt.hidden = true;
        renderTalk(events);
    }
    function renderTalk(events) {
        const avail = engine.getAvailableActions();
        if (avail.awaiting !== 'dialogue') { closeTalk(events); return; }
        const said = readable(events);
        const choices = avail.actions.filter((a) => a.type === 'dialogue_choice');
        const leave = () => renderTalk(engine.act({ type: 'dialogue_leave' }).events);
        menu = makeMenu(choices.map((c) => ({ label: c.text, action: () => renderTalk(engine.act({ type: 'dialogue_choice', choiceId: c.choiceId }).events) })),
            { back: leave, render: () => drawTalk(avail, said) });
        drawTalk(avail, said);
    }
    function drawTalk(avail, said) {
        const d = avail.dialogue;
        els.dialog.hidden = false;
        const title = `<div class="dialog-title">${esc(d.name)}${d.title ? ` <span class="dialog-role">${esc(d.title)}</span>` : ''}</div>`;
        const portrait = PORTRAITS[d.npcId];
        els.dialog.innerHTML = `${portrait ? `<div class="talk-head"><canvas class="portrait" width="16" height="16" aria-hidden="true"></canvas>${title}</div>` : title}
            <div class="dialog-text talk-text">${said.map((l) => `<p class="${l.important ? 'imp' : ''}">${esc(l.text)}</p>`).join('')}</div>
            ${menuHtml(menu, 'talk-choices')}
            <div class="dialog-keys">↑ ↓ choose · Enter say · Esc goodbye</div>`;
        bindMenuClicks(els.dialog, menu);
        if (portrait) drawPixels(els.dialog.querySelector('canvas.portrait'), portrait.rows, portrait.colours());
        const box = els.dialog.querySelector('.talk-text'); if (box) box.scrollTop = 0;   // read from the top
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
        els.dialog.hidden = true;
        modal = null;
        menu = null;
        updateHud();
        const lines = readable(events).map((l) => l.text);
        if (lines.length) openDialog([lines.join('\n')], null, afterStory); else afterStory();
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
        { id: 'journal', label: 'Journal', sub: 'Your quests and what to do next.' },
        { id: 'crow', label: 'Crow', sub: 'Black Flight and the crow\'s counsel.' },     // only once the engine offers it
        { id: 'settings', label: 'Settings', sub: 'Display, controls and this run.' },
        { id: 'save', label: 'Save game', sub: 'Keeps your place in this browser (one save slot).' },
        { id: 'quit', label: 'Quit to title', sub: 'Anything since your last save is lost.' }
    ];
    let mmTabs = MM_TABS_ALL;
    let mm = { tab: 0, focus: 'tabs', slot: null, note: '', fly: null };
    function openPause(note) {
        modal = 'pause';
        muteHeldKeys();
        els.hud.hidden = true;
        const crow = CV.crowView(engine.getAvailableActions()).any;     // the Crow tab exists once the seal is open
        mmTabs = MM_TABS_ALL.filter((t) => t.id !== 'crow' || crow);
        mm = { tab: Math.min(mm.tab || 0, mmTabs.length - 1), focus: 'tabs', slot: null, note: note || '', fly: null };
        focusTabs();
    }
    function focusTabs() {
        mm.focus = 'tabs'; mm.slot = null; mm.fly = null;
        menu = makeMenu(mmTabs.map((t) => ({ label: t.label, sub: t.sub, action: () => runTab(t.id) })),
            { back: closePause, render: () => { if (mm.tab !== menu.index) mm.note = ''; mm.tab = menu.index; renderMain(); } });   // a note belongs to the tab it came from
        menu.index = mm.tab;
        renderMain();
    }
    function runTab(id) {
        if (id === 'save') { mm.note = saveGame(); renderMain(); return; }
        if (id === 'quit') { showTitle(); return; }
        enterList(id, 0);
    }
    /** The list inside a tab (or, in Equipment, a slot's choices). `at` keeps the cursor after an action. */
    function enterList(id, at) {
        let items = null;
        const again = (fn) => () => { const i = menu.index; fn(); enterList(id, i); };
        if (id === 'items') {
            const v = MM.itemsView(engine.getAvailableActions(), engine.getState().player.inventory, DATA.itemDefinitions);
            items = v.usable.map((u) => ({ label: `${u.item}${u.count > 1 ? ` ×${u.count}` : ''}`, sub: u.enabled ? u.description : (u.reason ? u.reason.message : ''), disabled: !u.enabled,
                action: again(() => { mm.note = actLines({ type: 'use_item', item: u.item }); }) }));
        }
        if (id === 'equipment' && !mm.slot) {
            items = MM.slotsView(engine.getEquipment()).map((r) => ({ label: `${r.label}: ${r.item || '—'}`, sub: r.candidates.length ? `${r.candidates.length} to choose from` : r.item ? 'Nothing else fits here' : 'Nothing that fits',
                disabled: !r.candidates.length && !r.item, action: () => { mm.slot = r.slot; enterList('equipment', 0); } }));
        }
        if (id === 'equipment' && mm.slot) {
            const row = MM.slotsView(engine.getEquipment()).find((r) => r.slot === mm.slot);
            items = row.candidates.map((c) => ({ label: c.item, sub: c.enabled ? `${c.diffText}${c.description ? ` · ${c.description}` : ''}` : c.reason.message, disabled: !c.enabled, diff: c.diff,
                action: () => { mm.note = actLines({ type: 'equip', item: c.item }); mm.slot = null; enterList('equipment', MM.SLOTS.findIndex((x) => x.slot === row.slot)); } }));
            if (row.item) items.push({ label: `Take off ${row.item}`, sub: 'Back into your bag.', action: () => { mm.note = actLines({ type: 'unequip', slot: row.slot }); mm.slot = null; enterList('equipment', MM.SLOTS.findIndex((x) => x.slot === row.slot)); } });
        }
        if (id === 'settings') {
            items = [{ label: `Display: ${ENSO.display.LABELS[displayMode]}`, sub: ENSO.display.HELP[displayMode], action: again(() => { mm.note = cycleDisplay(); }) },
                { label: `Motion: ${MOTION_LABELS[motionMode]}`, sub: MOTION_HELP[motionMode], action: again(() => { mm.note = cycleMotion(); }) }];
            if (ENSO.gfx && ENSO.gfx.setQuality) items.push({ label: `Graphics: ${gfxQuality() === 'low' ? 'Low' : 'High'}`, sub: 'High: lighting, bloom and grading. Low: plain canvas for weak devices. Applies on next load.',
                action: again(() => { const q = gfxQuality() === 'low' ? 'high' : 'low'; ENSO.gfx.setQuality(q); mm.note = `Graphics: ${q === 'low' ? 'Low' : 'High'}. Reload the page to apply.`; }) });
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
        if (!items || !items.length) { renderMain(); return; }          // Status and Journal are pages, not lists
        mm.focus = 'list';
        const slotBack = mm.slot ? () => { const i = MM.SLOTS.findIndex((x) => x.slot === mm.slot); mm.slot = null; enterList('equipment', i); }
            : mm.fly ? () => { mm.fly = null; enterList('crow', 0); } : null;
        menu = makeMenu(items, { back: slotBack || focusTabs, render: renderMain });
        if (at != null && at < items.length) menu.index = at;
        renderMain();
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
            <ul class="mm-gear">${eq.map((r) => `<li><span class="mm-dim">${esc(r.label)}</span> ${esc(r.item || '—')}</li>`).join('')}<li><span class="mm-dim">Gold</span> ${p.gold || 0}</li></ul>`;
    }
    /** The stat block; with a candidate's diff it becomes the comparison (▲ better, ▼ worse, never colour alone). */
    function statsHtml(p, diff) {
        return `<dl class="mm-stats">${MM.statPreview(p, diff).map((r) => `<div class="${r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : ''}"><dt>${r.label}</dt><dd>${r.value}${r.delta ? ` <span class="arrow">${r.delta > 0 ? '▲' : '▼'}</span> ${r.after}` : ''}</dd></div>`).join('')}</dl>`;
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
            const v = MM.itemsView(engine.getAvailableActions(), p.inventory, DATA.itemDefinitions);
            page = `<h3>Use</h3>${inList ? list : v.usable.length ? `<ul class="mm-plain">${v.usable.map((u) => `<li>${esc(u.item)}${u.count > 1 ? ` ×${u.count}` : ''}</li>`).join('')}</ul>` : '<p class="mm-dim">Nothing to use.</p>'}
                ${v.carrying.length ? `<h3>Carrying</h3><ul class="mm-plain mm-dim">${v.carrying.map((c) => `<li>${esc(c.item)}${c.count > 1 ? ` ×${c.count}` : ''}</li>`).join('')}</ul>` : ''}`;
        }
        if (tab === 'equipment') {
            const hl = inList && menu.items[menu.index];
            const slotLabel = mm.slot ? MM.SLOTS.find((x) => x.slot === mm.slot).label : null;
            page = `<div class="mm-cols"><div><h3>${slotLabel ? esc(slotLabel) : 'Gear'}</h3>${inList ? list : `<ul class="mm-plain">${MM.slotsView(engine.getEquipment()).map((r) => `<li><span class="mm-dim">${esc(r.label)}</span> ${esc(r.item || '—')}</li>`).join('')}</ul>`}</div>
                <div><h3>${hl && hl.diff ? 'If you wear it' : 'Stats'}</h3>${statsHtml(p, hl && hl.diff)}</div></div>`;
        }
        if (tab === 'journal') page = journalHtml() || '<p class="mm-dim">No journal in this game.</p>';
        if (tab === 'settings') {
            page = `<h3>Display and motion</h3>${inList ? list : `<p>Display: ${esc(ENSO.display.LABELS[displayMode])} <span class="mm-dim">· ${esc(ENSO.display.HELP[displayMode])}</span></p><p>Motion: ${esc(MOTION_LABELS[motionMode])} <span class="mm-dim">· ${esc(MOTION_HELP[motionMode])}</span></p>`}
                <h3>Controls</h3><ul class="mm-plain"><li><kbd>Arrows</kbd> or <kbd>WASD</kbd> walk, choose</li><li><kbd>E</kbd> <kbd>Enter</kbd> <kbd>Space</kbd> inspect, talk, confirm</li><li><kbd>Esc</kbd> this menu, back</li><li><kbd>L</kbd> battle log · walk into an enemy to fight it</li></ul>
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
            : `<kbd>↑↓</kbd> tabs ${['items', 'equipment', 'settings', 'crow'].includes(tab) || tab === 'save' || tab === 'quit' ? '<kbd>Enter</kbd> open ' : ''}<kbd>Esc</kbd> close`;
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
            ENSO.sprites.drawCharacter(g, 16, 34, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className, facing: 'down', anim: 'idle', scale: 1 }, 0);
        }
    }
    /** ← leaves a list, → opens the highlighted tab (keyboard and pad). */
    function mainMenuSideways(dir) {
        if (dir === 'left' && mm.focus === 'list') { menu.back(); return true; }
        if (dir === 'right' && mm.focus === 'tabs') { const t = mmTabs[menu.index]; if (!['save', 'quit'].includes(t.id)) runTab(t.id); return true; }
        return false;
    }
    /** The engine's journal: active quests with their current objective, then what's done. */
    function journalHtml() {
        const j = engine.story ? engine.getJournal() : null;
        if (!j) return '';
        const active = j.quests.filter((q) => q.state !== 'complete');
        const done = j.quests.filter((q) => q.state === 'complete');
        const kind = (q) => (q.kind === 'main' ? '' : q.kind === 'job' ? ' <span class="j-kind">job</span>' : ' <span class="j-kind">side</span>');
        return `<section class="journal"><h3>Journal · ${esc(j.chapter)}</h3>
            ${active.map((q) => `<p class="j-quest"><b>${esc(q.title)}</b>${kind(q)}<br>${q.objective ? `◆ ${esc(q.objective.text)}` : `<i>${esc(q.summary)}</i>`}</p>`).join('') || '<p>Nothing to do right now.</p>'}
            ${done.length ? `<p class="j-done">Done: ${done.map((q) => esc(q.title)).join(' · ')}</p>` : ''}</section>`;
    }
    function closePause() { els.pause.hidden = true; els.pause.className = 'panel'; els.hud.hidden = false; modal = null; menu = null; muteHeldKeys(); }

    // ---------------------------------------------------------------------
    // The crow (Nahemoth's first aspect, docs/design/ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md).
    // The engine owns the anchors and every refusal; the world session moves you (as walking does).
    // ---------------------------------------------------------------------
    function talkCrow() {
        const r = engine.act({ type: 'talk_crow' });
        closePause();
        if (engine.getAvailableActions().awaiting === 'dialogue') openTalk(r.events);
        else openDialog(readable(r.events).map((l) => l.text).join('\n') || '…', 'Crow', afterStory);
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
        modal = 'branch';
        muteHeldKeys();
        els.hud.hidden = true;
        const tree = DATA.evolutionPaths[engine.getState().player.className];
        const items = engine.getAvailableActions().actions.filter((o) => o.type === 'choose_branch').map((o) => {
            const b = tree.branches[o.branchId];
            const res = ((b.resourceEvolution || [])[0] || {}).type;
            return { label: o.name, sub: `${b.theme}${res ? ` · Resource: ${res}` : ''}`, action: () => chooseBranch(o.branchId) };
        });
        menu = makeMenu(items, { render: renderBranch });
        renderBranch();
    }
    function renderBranch() {
        els.pause.className = 'panel win';
        els.pause.innerHTML = `<h2>A surge of new power</h2><p>It's time to specialise. Choose your path:</p>${menuHtml(menu)}<p class="keys">↑ ↓ choose · Enter confirm</p>`;
        els.pause.hidden = false;
        bindMenuClicks(els.pause, menu);
    }
    function chooseBranch(key) {
        const lines = readable(engine.act({ type: 'choose_branch', branchId: key }).events).map((l) => l.text);
        els.pause.hidden = true;
        els.hud.hidden = false;
        menu = null;
        modal = null;
        updateHud();
        if (engine.mode === 'branch_select') { openBranchMenu(); return; }
        openDialog([lines.join('\n')], 'Evolution');
    }

    // ---------------------------------------------------------------------
    // Battle overlay. The fight is the engine's; menus come from its availability list.
    // ---------------------------------------------------------------------
    const BM = ENSO.battleMenu;

    function beginBattle(result) {
        screen = 'combat';
        modal = null;
        muteHeldKeys();
        els.hud.hidden = true;
        els.banner.hidden = true; clearTimeout(bannerTimer);   // the map name never shows through the battle
        battle = { id: result.id, log: [], fresh: 0, logOpen: false, ended: null, lastHp: {}, targetIds: [], labels: {} };
        playActor('idle');
        fx.clear();
        addLog(result.events);
        if (engine.mode === 'combat') battleRoot(); else battleOver();
    }
    function addLog(events) {
        const lines = readable(events);
        for (const l of lines) battle.log.push(l);
        battle.fresh = Math.min(lines.length, LOG_LINES);           // what the last action said is highlighted
        if (battle.log.length > LOG_LINES) battle.log.splice(0, battle.log.length - LOG_LINES);
    }
    function send(action) {
        const hpBefore = engine.player.hp;
        const before = engine.getState();
        const r = engine.act(action);
        addLog(r.events);
        if (r.ok) {
            actorReacts(action, hpBefore);
            fx.push(ENSO.combatFx.eventsFromStates(before, engine.getState(), action, DATA, r.events), performance.now());
        }
        if (engine.mode === 'combat') battleRoot(); else battleOver();
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
        const S = ENSO.sprites, P = S.manifest.player;
        if (actor.queue.length && S.animationDone(P, actor.anim, now - actor.t0)) playActor(...actor.queue);
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        S.drawCharacter(g, c.width / 2, c.height - 2, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className, facing: 'right', anim: actor.anim, scale: 1 }, now - actor.t0);
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
    function chips(list) {
        return (list || []).map((x) => {
            const c = BV.statusChip(x, DATA.statusDefinitions);
            return `<span class="chip st-${c.category}" title="${esc(c.title)}"><i aria-hidden="true">${c.glyph}</i>${esc(c.text)}</span>`;
        }).join('');
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
        const controlled = avail && avail.awaiting === 'control' ? foes.find((e) => e.id === avail.controlledActorId) : null;
        const round = s.combat ? `Round ${s.combat.round}` : '';
        const heading = battle.ended === 'victory' ? 'Victory' : battle.ended === 'defeat' ? 'Defeat' : round;
        // Twins keep the letter they started the fight with ("Rust Rat B" stays B after A falls).
        battle.labels = { ...BV.unitLabels([...foes, ...minions]), ...battle.labels };
        const name = (u) => battle.labels[u.id] || u.name;
        const strip = BV.turnStrip(battle.ended ? null : engine.getTurnOrder(), battle.labels);
        // Turn bar (HD-2D pass): the one acting sits in the big diamond, everyone after them rides the line.
        const units = Object.fromEntries([...foes, ...minions].map((u) => [u.id, u]));
        const face = (t, size) => `<canvas class="face" width="${size}" height="${size}" data-face="${esc(t.id)}" data-key="${esc((units[t.id] || {}).key || '')}" aria-hidden="true"></canvas>`;
        const queue = [...strip.now, ...strip.next];
        const actor = queue.find((t) => t.current) || null;
        const turnHtml = (list) => list.filter((t) => t !== actor).map((t) => `<li class="t-${esc(t.side)}${battle.targetIds.includes(t.id) ? ' aimed' : ''}" title="${esc(t.label)}">${face(t, 24)}<span class="t-name">${esc(t.label)}</span></li>`).join('');
        const mode = battle.ended ? '' : controlled ? `You control ${controlled.name}` : avail && avail.awaiting === 'turn_order' ? 'Set the turn order' : '';
        const n = battle.log.length;
        const logHtml = battle.log.map((l, i) => {
            const v = BV.logLine(l.text);
            return `<p class="lg-${v.kind}${l.important ? ' imp' : ''}${i >= n - battle.fresh ? ' fresh' : ''}">${esc(v.text)}</p>`;
        }).join('');
        els.combat.hidden = false;
        els.combat.classList.toggle('ended', !!battle.ended);
        els.combat.classList.toggle('log-open', battle.logOpen);
        els.combat.innerHTML = `
            <header class="b-head">
                ${actor ? `<div class="b-now t-${esc(actor.side)}" aria-label="Acting now: ${esc(actor.label)}"><span class="dia">${face(actor, 32)}</span><span class="t-name">${esc(actor.label)}</span></div>` : ''}
                ${queue.length ? `<ol class="b-turns" aria-label="Turn order">${turnHtml(strip.now)}${strip.next.length ? `<li class="t-sep" aria-hidden="true">Next</li>${turnHtml(strip.next)}` : ''}</ol>` : ''}
                <span class="b-round ${battle.ended ? `b-${esc(battle.ended)}` : ''}">${esc(heading)}</span>${mode ? `<span class="b-mode">${esc(mode)}</span>` : ''}</header>
            <section class="b-field" aria-label="Battlefield">
                <div class="b-side b-allies">
                    <figure class="unit me" data-unit-id="player">
                        <canvas class="me-sprite" width="40" height="36" aria-hidden="true"></canvas>
                        <figcaption class="sr-only">${esc(p.name)}</figcaption>
                    </figure>
                    ${minions.map((m) => `<figure class="unit ally" data-unit-id="${esc(m.id)}">
                        <span class="ally-mark" aria-hidden="true">✦</span>
                        <figcaption class="plate"><span class="u-name">${esc(name(m))}</span>${hpBar(m.id, m.hp, m.maxHp, 'hp')}<span class="u-hp">${m.hp}/${m.maxHp}</span></figcaption></figure>`).join('')}
                </div>
                <div class="b-side b-foes">${foes.map((e) => {
                    const hit = battle.lastHp[e.id] != null && e.hp < battle.lastHp[e.id];
                    const aimed = battle.targetIds.includes(e.id);
                    return `<figure class="unit foe ${aimed ? 'targeted' : ''} ${hit ? 'hit' : ''}" data-unit-id="${esc(e.id)}">
                        <span class="b-cursor" aria-hidden="true">${aimed ? '▼' : ''}</span>
                        <canvas width="128" height="128" data-key="${esc(e.key)}"></canvas>
                        <figcaption class="plate"><span class="u-name">${esc(name(e))}</span>${hpBar(e.id, e.hp, e.maxHp, 'enemy')}<span class="u-hp">${e.hp}/${e.maxHp}</span>
                            <span class="chips">${chips(e.statusEffects)}</span></figcaption></figure>`;
                }).join('')}</div>
            </section>
            <section class="win b-log ${battle.logOpen ? 'open' : ''}" aria-live="polite" aria-label="Battle log">${logHtml}</section>
            <footer class="b-foot">
                <section class="b-party" aria-label="Your status">
                    <div class="u-name">${esc(p.name)} <span class="lv">Lv ${p.level}</span></div>
                    <div class="stat"><span class="k">HP</span>${hpBar('player', p.hp, p.maxHp, 'hp')}<span class="v">${Math.max(0, p.hp)}<small>/${p.maxHp}</small></span></div>
                    <div class="stat"><span class="k">${esc(p.resource.type)}</span>${hpBar('player.res', p.resource.current, p.resource.max, 'res')}<span class="v">${p.resource.current}<small>/${p.resource.max}</small></span></div>
                    <div class="chips">${chips(p.statusEffects)}</div>
                </section>
                <section class="win b-cmd" aria-label="Commands">
                    ${commandHtml(menu)}
                    <p class="keys"><kbd>↑↓</kbd> choose <kbd>Enter</kbd> confirm${menu && menu.back ? ' <kbd>Esc</kbd> back' : ''} <kbd>L</kbd> ${battle.logOpen ? 'close log' : 'log'}</p>
                </section>
            </footer>`;
        bindMenuClicks(els.combat, menu);
        const sel = els.combat.querySelector('.b-commands li.selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });                       // long skill lists scroll with the cursor
        els.combat.querySelector('.b-log').addEventListener('click', toggleBattleLog);
        els.combat.querySelectorAll('canvas[data-key]:not(.face)').forEach((c) => ENSO.worldRender.drawCreature(c, c.dataset.key, performance.now()));
        els.combat.querySelectorAll('canvas.face').forEach(drawFace);
        // Camera: lean in on the foes while you pick a target, pull back otherwise (CSS; off with reduced motion).
        $('world-stage').dataset.cam = battle.ended ? 'wide' : battle.targetIds.length ? 'foes' : actor && actor.side === 'enemy' ? 'me' : 'wide';
        // Collapsed, the message window starts at the first line of what just happened (your own action),
        // not at the bottom, so enemy turns never push your result out of view. Open, it shows the latest.
        const log = els.combat.querySelector('.b-log');
        const first = !battle.logOpen && log.querySelector('p.fresh');
        log.scrollTop = first ? first.offsetTop - 4 : log.scrollHeight;   // .win is the offsetParent
        battle.lastHp = Object.fromEntries([...foes, ...minions].map((e) => [e.id, e.hp]));
        battle.lastHp.player = p.hp;
        battle.lastHp['player.res'] = p.resource.current;
    }
    /** A turn-bar face: Wren's portrait hook when it exists, else a crop of the sprite or creature. */
    function drawFace(c) {
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
        const id = c.dataset.face;
        if (id === 'player' && ENSO.sprites.drawPortrait) { ENSO.sprites.drawPortrait(g, 0, 0, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className }, c.width); return; }
        if (id === 'player') {
            const k = c.width / 20;   // head and shoulders of the 32x36 walking sprite
            g.save(); g.scale(k, k);
            ENSO.sprites.drawCharacter(g, 10, 33, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className, facing: 'down', anim: 'idle', scale: 1 }, 0);
            g.restore();
            return;
        }
        if (c.dataset.key) ENSO.worldRender.drawCreature(c, c.dataset.key, 0);
    }
    function toggleBattleLog() { battle.logOpen = !battle.logOpen; renderBattle(); }

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
        const r = session.interact();
        if (r.type === 'talk') { seen.add(r.id); updateHud(); if (engine.getAvailableActions().awaiting === 'dialogue') openTalk(r.events); else openDialog(readable(r.events).map((l) => l.text).join('\n') || '…', r.title, afterStory); return; }
        if (r.type === 'message') {
            seen.add(r.id);
            const story = readable(r.events || []).map((l) => l.text);
            openDialog([story.length ? `${r.text}\n\n${story.join('\n')}` : r.text], r.title, afterStory);
            return;
        }
        if (r.type === 'pickup') {
            const got = readable(r.events).map((l) => l.text).join('\n');
            updateHud();
            openDialog([`${r.text}\n\n${got}`], r.title, afterStory);
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
            if (modal === 'pause' && menu && (dir === 'left' || dir === 'right') && !ev.repeat && mainMenuSideways(dir)) return;
            if (modal === 'pause' && (ev.key === 'PageDown' || ev.key === 'PageUp')) { const pg = els.pause.querySelector('.mm-page'); if (pg) pg.scrollTop += (ev.key === 'PageDown' ? 1 : -1) * pg.clientHeight * 0.8; return; }
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

    // On-screen pad for touch screens (shown only for coarse pointers): it sends the same keys.
    if (els.pad && typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) {
        els.pad.hidden = false;
        const fire = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
        els.pad.querySelectorAll('button[data-key]').forEach((b) => {
            const key = b.dataset.key;
            b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); fire('keydown', key); });
            const up = (e) => { e.preventDefault(); fire('keyup', key); };
            b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
        });
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
            renderer.draw({ ...view, mapId: WORLD.start.map, x: sp.x, y: sp.y, className: cls, appearance: look, cosmetics: creator ? cosmeticsFromCreator() : defaultCosmetics(), marker: null, fade: 0.35 }, [], now);
            requestAnimationFrame(frame);
            return;
        }
        if (anim) {
            const k = Math.min(1, (now - anim.t0) / STEP_MS);
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
                const story = readable(fade.result.events || []).map((l) => l.text);
                const pages = [fade.result.text, story.length ? story.join('\n') : null].filter(Boolean);
                if (pages.length) openDialog(pages, null, afterStory); else afterStory();
            } else if (k >= 1) { fade = null; view.fade = 0; }
        }
        if (flash) {
            const k = (now - flash.t0) / 360;
            view.fade = k < 1 ? Math.abs(Math.sin(k * Math.PI * 2)) * 0.8 : 0;
            if (k >= 1) { const fn = flash.fn; flash = null; fn(); }
        }
        if (screen === 'explore' && !busy() && !flash && held.length && now - lastBump >= BUMP_MS) tryStep(held[held.length - 1], now);
        if (!anim) view.moving = false;
        if (screen !== 'title') updatePrompt();
        if (screen === 'combat' || screen === 'over') drawActor(now);
        drawFx(now);
        const objects = session.visibleObjects(view.mapId).map((o) => ({ ...o, seen: seen.has(o.id) }));
        const battle = (screen === 'combat' || screen === 'over') && !!ENSO.battleHD;   // HD-2D: a painted stage (ui/battle-hd.js)
        const dim = screen === 'combat' || screen === 'over' ? (battle ? 0 : 0.7) : view.fade;   // otherwise the dimmed map is the backdrop
        renderer.draw({ ...view, battle, fade: Math.max(dim, view.fade) }, objects, now);
        requestAnimationFrame(frame);
    }

    // Console helpers for testing and QA (not part of play): ensoDebug.goto('grounds', 'from_house')
    window.ensoDebug = {
        goto(mapId, spawn) { session.place(mapId, spawn); syncView(); showBanner(WORLD.maps[mapId].name); updateHud(); },
        start(cls, name, look, cosmetics) { startGame(cls || 'warrior', name, look, cosmetics); advanceDialog(true); },
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
        state() { return { screen, modal, map: session && session.getState(), mode: engine && engine.mode, seed: engine && engine.seed }; }
    };

    showTitle();
    fitStage();
    requestAnimationFrame(frame);
})();
