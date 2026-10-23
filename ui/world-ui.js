/* =========================================================================
 * Enso's Last Stand — WORLD UI (keyboard exploration front end)
 * Zone 1 design: docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md §3.
 *
 * Screens: title (class choice) -> explore, with modal dialog and pause panels.
 * Movement is tile-step: hold a direction to keep walking. The world model
 * (src/world/world.js) decides where you can go; the engine (src/engine.js)
 * owns the character. Walking never calls the engine.
 *
 * Keys: arrows / WASD move · E / Enter / Space interact · Esc menu.
 * A held key never carries over a modal: closing a dialog needs a fresh press
 * to walk again, so no key both closes a panel and moves you.
 * ========================================================================= */
(function () {
    const { WorldSession, validateWorld } = ENSO.worldModel;
    const WORLD = ENSO.world.zone1;
    const STEP_MS = 150;     // one tile step
    const FADE_MS = 220;     // each half of a map transition
    const BUMP_MS = 180;     // minimum gap between "blocked" bumps while a key is held

    const $ = (id) => document.getElementById(id);
    const canvas = $('world-canvas');
    const renderer = ENSO.worldRender.create(canvas, WORLD, { tile: 32 });
    const els = { title: $('title'), dialog: $('dialog'), pause: $('pause'), hud: $('hud'), banner: $('banner'), problems: $('problems') };

    // ---------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------
    let engine = null;
    let session = null;
    let screen = 'title';                 // title | explore
    let modal = null;                     // null | 'dialog' | 'pause'
    let dialogPages = [];
    let dialogTitle = null;
    let onDialogClose = null;
    let titleIndex = 0;
    const held = [];                      // directions currently held, most recent last
    const seen = new Set();               // inspected objects (presentation only: stops the glint)
    const view = { mapId: WORLD.start.map, x: 0, y: 0, facing: 'down', moving: false, className: null, fade: 0 };
    let anim = null;                      // tile-step tween { fx, fy, tx, ty, t0 }
    let fade = null;                      // { t0, phase: 'out'|'in', mid }
    let lastBump = 0;

    const problems = validateWorld(WORLD, ENSO.data);
    if (problems.length) {
        els.problems.hidden = false;
        els.problems.textContent = `World data has ${problems.length} problem(s):\n${problems.join('\n')}`;
        console.error('World data problems', problems);
    }

    // ---------------------------------------------------------------------
    // Title / class choice
    // ---------------------------------------------------------------------
    const classes = Object.keys(ENSO.data.basePlayerClasses);
    function renderTitle() {
        const items = classes.map((key, i) => {
            const c = ENSO.data.basePlayerClasses[key];
            return `<li class="${i === titleIndex ? 'selected' : ''}" data-i="${i}"><span class="cls-name">${c.name}</span><span class="cls-desc">${c.description}</span></li>`;
        }).join('');
        els.title.innerHTML = `
            <h1>Enso's Last Stand</h1>
            <p class="subtitle">${WORLD.zones[WORLD.maps[WORLD.start.map].zoneId].name}</p>
            <p class="prompt">Choose who wakes in the cellar</p>
            <ul class="class-list" role="listbox">${items}</ul>
            <p class="keys">↑ ↓ choose · Enter begin</p>`;
        els.title.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => { titleIndex = +li.dataset.i; startGame(classes[titleIndex]); }));
    }

    function startGame(cls) {
        engine = new ENSO.GameEngine();
        window.enso = engine;                 // handy from the browser console
        engine.start();
        engine.input(cls);
        session = new WorldSession(WORLD);
        window.ensoWorld = session;
        seen.clear();
        syncView();
        view.className = cls;
        screen = 'explore';
        els.title.hidden = true;
        els.hud.hidden = false;
        updateHud();
        showBanner(WORLD.maps[session.mapId].name);
        openDialog(WORLD.intro, null);
    }

    // ---------------------------------------------------------------------
    // HUD, banner, dialog, pause
    // ---------------------------------------------------------------------
    function bar(cur, max, cls) {
        const pct = max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
        return `<span class="bar ${cls}"><span style="width:${pct}%"></span></span>`;
    }
    function updateHud() {
        const s = engine.getState();
        const p = s.player;
        els.hud.innerHTML = `
            <div class="hud-name">${p.name} <span>Lv ${p.level}</span></div>
            <div class="hud-row">HP ${bar(p.hp, p.maxHp, 'hp')} <span>${p.hp}/${p.maxHp}</span></div>
            <div class="hud-row">${p.resource.type} ${bar(p.resource.current, p.resource.max, 'res')} <span>${p.resource.current}/${p.resource.max}</span></div>`;
    }

    let bannerTimer = null;
    function showBanner(text) {
        els.banner.textContent = text;
        els.banner.hidden = false;
        els.banner.classList.remove('show'); void els.banner.offsetWidth; els.banner.classList.add('show');
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => { els.banner.hidden = true; }, 2600);
    }

    function openDialog(pages, title, onClose) {
        dialogPages = [].concat(pages).filter(Boolean);
        dialogTitle = title;
        onDialogClose = onClose || null;
        modal = 'dialog';
        held.length = 0;
        renderDialog();
    }
    function renderDialog() {
        els.dialog.hidden = false;
        els.dialog.innerHTML = `${dialogTitle ? `<div class="dialog-title">${dialogTitle}</div>` : ''}
            <div class="dialog-text">${dialogPages[0]}</div>
            <div class="dialog-more">${dialogPages.length > 1 ? '▼' : '■'}</div>`;
    }
    function advanceDialog(all) {
        if (all) dialogPages = []; else dialogPages.shift();
        if (dialogPages.length) { renderDialog(); return; }
        els.dialog.hidden = true;
        modal = null;
        held.length = 0;
        const cb = onDialogClose; onDialogClose = null;
        if (cb) cb();
    }

    function openPause() {
        modal = 'pause';
        held.length = 0;
        const s = engine.getState(), p = s.player;
        const map = WORLD.maps[session.mapId];
        const branch = s.progression.branch ? ` · ${s.progression.evolutionName}` : '';
        els.pause.innerHTML = `
            <h2>Paused</h2>
            <section><h3>${map.name}</h3><p>${WORLD.zones[map.zoneId].name}</p></section>
            <section><h3>${p.name}${branch}</h3>
                <p>Level ${p.level} · XP ${p.xp}/${p.xpToNext}</p>
                <p>HP ${p.hp}/${p.maxHp} · ${p.resource.type} ${p.resource.current}/${p.resource.max}</p>
                <p>STR ${p.strength} · INT ${p.intelligence} · AGI ${p.agility} · DEF ${p.def}</p>
                <p>Inventory: ${p.inventory.length ? p.inventory.join(', ') : 'nothing'}</p></section>
            <section><h3>Controls</h3>
                <p>Arrow keys or WASD: walk · E, Enter or Space: inspect, open, talk · Esc: this menu</p></section>
            <p class="keys">Esc to resume</p>`;
        els.pause.hidden = false;
    }
    function closePause() { els.pause.hidden = true; modal = null; held.length = 0; }

    // ---------------------------------------------------------------------
    // World actions
    // ---------------------------------------------------------------------
    function syncView() { view.mapId = session.mapId; view.x = session.x; view.y = session.y; view.facing = session.facing; }

    function busy() { return !!(anim || fade || modal || screen !== 'explore'); }

    function tryStep(dir, now) {
        const fx = session.x, fy = session.y;
        const r = session.move(dir);
        view.facing = dir;
        if (r.type === 'blocked') { lastBump = now; return; }
        if (r.type === 'moved') { anim = { fx, fy, tx: r.x, ty: r.y, t0: now, then: null }; return; }
        if (r.type === 'transition') {
            const [dx, dy] = ENSO.worldModel.DIRS[dir];
            anim = { fx, fy, tx: fx + dx, ty: fy + dy, t0: now, then: () => startFade(r) };
        }
    }

    function startFade(result) {
        fade = { t0: performance.now(), phase: 'out', result };
    }

    function interact() {
        const r = session.interact();
        if (r.type === 'message') { seen.add(r.id); openDialog([r.text], r.title); return; }
        if (r.type === 'transition') startFade(r);
    }

    // ---------------------------------------------------------------------
    // Input
    // ---------------------------------------------------------------------
    const KEY_DIRS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    const ACT = new Set(['e', 'E', 'Enter', ' ']);

    window.addEventListener('keydown', (ev) => {
        const dir = KEY_DIRS[ev.key];
        if (dir || ACT.has(ev.key) || ev.key === 'Escape') ev.preventDefault();
        if (screen === 'title') {
            if (dir === 'up') titleIndex = (titleIndex + classes.length - 1) % classes.length;
            if (dir === 'down') titleIndex = (titleIndex + 1) % classes.length;
            if (dir) renderTitle();
            if (ACT.has(ev.key) && !ev.repeat) startGame(classes[titleIndex]);
            return;
        }
        if (modal === 'dialog') {
            if (ev.repeat) return;
            if (ACT.has(ev.key)) advanceDialog(false);
            else if (ev.key === 'Escape') advanceDialog(true);
            return;
        }
        if (modal === 'pause') {
            if (ev.key === 'Escape' && !ev.repeat) closePause();
            return;
        }
        if (dir) {
            if (!ev.repeat && !held.includes(dir)) held.push(dir);
            return;
        }
        if (ev.repeat || fade || anim) return;
        if (ACT.has(ev.key)) interact();
        else if (ev.key === 'Escape') openPause();
    });
    window.addEventListener('keyup', (ev) => {
        const dir = KEY_DIRS[ev.key];
        if (!dir) return;
        // releasing either case of a letter releases the direction
        const i = held.indexOf(dir);
        if (i !== -1) held.splice(i, 1);
    });
    window.addEventListener('blur', () => { held.length = 0; });

    // ---------------------------------------------------------------------
    // Frame loop
    // ---------------------------------------------------------------------
    function frame(now) {
        if (screen === 'explore') {
            if (anim) {
                const k = Math.min(1, (now - anim.t0) / STEP_MS);
                view.x = anim.fx + (anim.tx - anim.fx) * k;
                view.y = anim.fy + (anim.ty - anim.fy) * k;
                view.moving = true;
                if (k >= 1) {
                    const then = anim.then;
                    anim = null;
                    if (then) then(); else syncView();
                }
            }
            if (fade) {
                const k = Math.min(1, (now - fade.t0) / FADE_MS);
                view.fade = fade.phase === 'out' ? k : 1 - k;
                if (k >= 1 && fade.phase === 'out') {
                    syncView();
                    fade = { t0: now, phase: 'in', result: fade.result };
                    showBanner(WORLD.maps[session.mapId].name);
                    if (fade.result.text) openDialog([fade.result.text], null);
                } else if (k >= 1) { fade = null; view.fade = 0; }
            }
            if (!busy() && held.length && now - lastBump >= BUMP_MS) tryStep(held[held.length - 1], now);
            if (!anim) view.moving = false;
            const objects = (session.map.interactables || []).map((o) => ({ ...o, seen: seen.has(o.id) }));
            renderer.draw(view, objects, now);
        } else {
            renderer.draw({ ...view, mapId: WORLD.start.map, x: WORLD.maps[WORLD.start.map].spawns[WORLD.start.spawn].x, y: WORLD.maps[WORLD.start.map].spawns[WORLD.start.spawn].y, className: classes[titleIndex], fade: 0.35 }, [], now);
        }
        requestAnimationFrame(frame);
    }

    // Console helpers for testing and QA (not part of play): ensoDebug.goto('grounds', 'from_house')
    window.ensoDebug = {
        goto(mapId, spawn) { session.place(mapId, spawn); syncView(); showBanner(WORLD.maps[mapId].name); },
        start(cls) { startGame(cls || 'warrior'); advanceDialog(true); }
    };

    renderTitle();
    requestAnimationFrame(frame);
})();
