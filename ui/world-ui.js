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
    const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const STEP_MS = 150;     // one tile step
    const FADE_MS = REDUCED ? 60 : 220;     // each half of a map transition
    const BUMP_MS = 180;     // minimum gap between "blocked" bumps while a key is held
    const LOG_LINES = 80;    // battle log kept on screen

    const $ = (id) => document.getElementById(id);
    const canvas = $('world-canvas');
    const renderer = ENSO.worldRender.create(canvas, WORLD, { tile: 32 });
    const els = {
        title: $('title'), dialog: $('dialog'), pause: $('pause'), hud: $('hud'), banner: $('banner'),
        problems: $('problems'), combat: $('combat'), toast: $('toast'), prompt: $('prompt'), pad: $('touch-pad')
    };
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
        if (isAct(ev) && !ev.repeat) { const it = m.items[m.index]; if (it && !it.disabled) it.action(); return true; }
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
    const HAIR_STYLES = ['Messy Short', 'Round Crop', 'Spiky', 'Straight Fringe', 'Long Side Strands', 'Swept', 'Soft Layers', 'Clean Crop', 'Side Part', 'Medium Layers', 'Braids', 'High Ponytail'];
    const HAIR_COLOURS = ['Raven', 'Chestnut', 'Ash', 'Copper'];
    const OUTFITS = ['Traveler', 'Tattered', 'Armored', 'Ceremonial'];
    const defaultCosmetics = () => ({ hairStyle: 0, hairColor: 0, outfit: 0 });
    function showTitle() {
        screen = 'title';
        modal = 'creator';                    // the creation steps (Enter, Enter, Enter starts with the defaults)
        for (const el of [els.hud, els.dialog, els.pause, els.combat, els.prompt]) el.hidden = true;
        els.title.hidden = false;
        creator = { step: 'name', name: creator ? creator.name : '', cls: classes[0], look: 0, ...defaultCosmetics() };
        creatorStep(readSave() ? 'start' : 'name');
    }
    function creatorStep(step) {
        creator.step = step;
        menu = null;
        if (step === 'start') {            // a saved game in this browser: continue it, or start a new one
            const save = readSave();
            const when = save && save.meta && save.meta.createdAt ? new Date(save.meta.createdAt).toLocaleString() : '';
            menu = makeMenu([
                { label: 'Continue', sub: `${(save && save.meta && save.meta.label) || 'Saved game'}${when ? ` · ${when}` : ''}`, action: () => continueGame(save) },
                { label: 'New game', sub: 'The saved game stays until you save over it.', action: () => creatorStep('name') }
            ], { render: renderTitle });
        }
        if (step === 'class') {
            menu = makeMenu(classes.map((key) => ({ label: DATA.basePlayerClasses[key].name, sub: DATA.basePlayerClasses[key].description,
                action: () => { creator.cls = key; creatorStep('look'); } })), { back: () => creatorStep('name'), render: renderTitle });
            menu.index = Math.max(0, classes.indexOf(creator.cls));
        }
        if (step === 'look') {
            menu = makeMenu(looks.map((l, i) => ({ label: l.label, sub: 'Appearance (no effect on stats)', action: () => { creator.look = i; creatorStep('hairStyle'); } })),
                { back: () => creatorStep('class'), render: renderTitle });
            menu.index = creator.look;
        }
        const cosmeticSteps = [
            ['hairStyle', HAIR_STYLES, 'hairColor', 'look'],
            ['hairColor', HAIR_COLOURS, 'outfit', 'hairStyle'],
            ['outfit', OUTFITS, null, 'hairColor']
        ];
        for (const [field, labels, next, previous] of cosmeticSteps) {
            if (step !== field) continue;
            menu = makeMenu(labels.map((label, i) => ({
                label, sub: field === 'outfit' ? 'Outfit appearance only; no stat changes' : 'Visible on your character',
                action: () => {
                    creator[field] = i;
                    if (next) creatorStep(next);
                    else startGame(creator.cls, creator.name, creator.look, cosmeticsFromCreator());
                }
            })), { back: () => creatorStep(previous), render: renderTitle });
            menu.index = creator[field];
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
                <p class="keys">Type a name (or leave it blank) · Enter continue</p>`;
            const input = els.title.querySelector('#hero-name');
            input.addEventListener('input', () => { creator.name = input.value; });
            input.addEventListener('keydown', (ev) => {
                ev.stopPropagation();                     // typing never walks, opens menus, or picks things
                if (ev.key === 'Enter') { ev.preventDefault(); creator.name = input.value; creatorStep('class'); }
            });
            setTimeout(() => input.focus(), 0);
            return;
        }
        if (creator.step === 'start') {
            els.title.innerHTML = `<h1>Enso's Last Stand</h1><p class="subtitle">${sub}</p>${menuHtml(menu, 'class-list')}<p class="keys">↑ ↓ choose · Enter</p>`;
            bindMenuClicks(els.title, menu);
            return;
        }
        const who = creator.name.trim() || (STORY && STORY.defaultName) || 'The Wanderer';
        els.title.innerHTML = `
            <h1>Enso's Last Stand</h1>
            <p class="subtitle">${sub}</p>
            <p class="prompt">${creator.step === 'class' ? `Choose ${esc(who)}'s calling` : `Customize ${esc(who)} · ${({look:'Skin tone',hairStyle:'Hair style',hairColor:'Hair colour',outfit:'Clothing'})[creator.step] || 'Appearance'}`}</p>
            ${menuHtml(menu, creator.step === 'hairStyle' ? 'class-list hairstyle-grid' : 'class-list')}
            <p class="keys">↑ ↓ choose · Enter ${creator.step === 'outfit' ? 'begin' : 'continue'} · Esc back</p>`;
        bindMenuClicks(els.title, menu);
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
        els.hud.innerHTML = `
            <div class="hud-place">${esc(place)}</div>
            <div class="hud-name">${esc(p.name)} <span>Lv ${p.level}</span></div>
            <div class="hud-row">HP ${bar(p.hp, p.maxHp, 'hp')} <span>${p.hp}/${p.maxHp}</span></div>
            <div class="hud-row">${esc(p.resource.type)} ${bar(p.resource.current, p.resource.max, 'res')} <span>${p.resource.current}/${p.resource.max}</span></div>
            ${objectiveHtml()}`;
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
        els.dialog.innerHTML = `<div class="dialog-title">${esc(d.name)}${d.title ? ` <span class="dialog-role">${esc(d.title)}</span>` : ''}</div>
            <div class="dialog-text talk-text">${said.map((l) => `<p class="${l.important ? 'imp' : ''}">${esc(l.text)}</p>`).join('')}</div>
            ${menuHtml(menu, 'talk-choices')}
            <div class="dialog-keys">↑ ↓ choose · Enter say · Esc goodbye</div>`;
        bindMenuClicks(els.dialog, menu);
        const box = els.dialog.querySelector('.talk-text'); if (box) box.scrollTop = 0;   // read from the top
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
    // Pause menu: character, journal, inventory (use healing items), controls
    // ---------------------------------------------------------------------
    function openPause(note) {
        modal = 'pause';
        muteHeldKeys();
        els.hud.hidden = true;
        const p = engine.getState().player;
        const usable = [...new Set(p.inventory.filter((i) => DATA.itemDefinitions[i]))];
        const items = [{ label: 'Resume', action: closePause }];
        for (const item of usable) {
            const n = p.inventory.filter((i) => i === item).length;
            const def = DATA.itemDefinitions[item];
            items.push({ label: `Use ${item}${n > 1 ? ` (x${n})` : ''}`, sub: `${def.description} Heals ${def.value}.`, action: () => useItem(item) });
        }
        items.push({ label: 'Save game', sub: 'Keeps your place in this browser (one save slot).', action: () => openPause(saveGame()) });
        items.push({ label: 'Quit to title', sub: 'Anything since your last save is lost.', action: showTitle });
        menu = makeMenu(items, { back: closePause, render: () => renderPause(note) });
        renderPause(note);
    }
    function renderPause(note) {
        const s = engine.getState(), p = s.player;
        const map = WORLD.maps[session.mapId];
        const branch = s.progression.branch ? ` · ${s.progression.evolutionName}` : '';
        const other = p.inventory.filter((i) => !DATA.itemDefinitions[i]);
        els.pause.innerHTML = `
            <h2>Paused</h2>
            <div class="pause-cols">
                <div>
                    <section><h3>${esc(map.name)}</h3><p>${esc(WORLD.zones[map.zoneId].name)}</p></section>
                    <section><h3>${esc(p.name)}${esc(branch)}</h3>
                        <p>Level ${p.level} · XP ${p.xp}/${p.xpToNext}</p>
                        <p>HP ${p.hp}/${p.maxHp} · ${esc(p.resource.type)} ${p.resource.current}/${p.resource.max}</p>
                        <p>STR ${p.strength} · INT ${p.intelligence} · AGI ${p.agility} · DEF ${p.def}</p>
                        ${other.length ? `<p>Also carrying: ${esc(other.join(', '))}</p>` : ''}</section>
                    ${journalHtml()}
                    <section><h3>Run seed</h3>
                        <p>${engine.seed} · to replay this run, open <code>world.html?seed=${engine.seed}</code> and make the same moves</p></section>
                    <section><h3>Controls</h3>
                        <p>Arrows / WASD: walk · E, Enter, Space: inspect, pick up, climb · Esc: this menu · Walk into an enemy to fight it</p></section>
                </div>
                <div>${menuHtml(menu)}${note ? `<p class="note">${esc(note)}</p>` : ''}</div>
            </div>`;
        els.pause.hidden = false;
        bindMenuClicks(els.pause, menu);
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
    function useItem(item) {
        const lines = readable(engine.act({ type: 'use_item', item }).events).map((l) => l.text);
        updateHud();
        openPause(lines.join(' '));
    }
    function closePause() { els.pause.hidden = true; els.hud.hidden = false; modal = null; menu = null; muteHeldKeys(); }

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
        battle = { id: result.id, log: [], ended: null, lastHp: {}, targetIds: [] };
        playActor('idle');
        fx.clear();
        addLog(result.events);
        if (engine.mode === 'combat') battleRoot(); else battleOver();
    }
    function addLog(events) {
        for (const l of readable(events)) battle.log.push(l);
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
        const c = els.combat.querySelector('canvas.me-sprite');
        if (!c) return;
        const S = ENSO.sprites, P = S.manifest.player;
        if (actor.queue.length && S.animationDone(P, actor.anim, now - actor.t0)) playActor(...actor.queue);
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        S.drawCharacter(g, c.width / 2, c.height - 4, { appearance: view.appearance, cosmetics: view.cosmetics || {}, className: view.className, facing: 'right', anim: actor.anim, scale: 2 }, now - actor.t0);
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
            const ents = BM.targetEntries(option, engine.getState()).map((t) => ({
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
        screen = 'explore';
        menu = null;
        muteHeldKeys();
        els.hud.hidden = false;
        updateHud();
        if (engine.mode === 'branch_select') openBranchMenu();
    }

    function renderBattle() {
        const s = engine.getState();
        const p = s.player;
        const foes = s.combat ? s.combat.enemies : [];
        const minions = s.combat ? s.combat.minions : [];
        const tags = (list) => (list || []).map((x) => `<span class="tag">${esc(x.name)}${x.stacks > 1 ? ` x${x.stacks}` : ''}${typeof x.duration === 'number' ? ` ${x.duration}` : ''}</span>`).join('');
        const avail = !battle.ended && engine.mode === 'combat' ? engine.getAvailableActions() : null;
        const controlled = avail && avail.awaiting === 'control' ? foes.find((e) => e.id === avail.controlledActorId) : null;
        const heading = battle.ended === 'victory' ? 'Victory' : battle.ended === 'defeat' ? 'Defeat'
            : controlled ? `Round ${s.combat.round} · You control ${controlled.name}`
                : avail && avail.awaiting === 'turn_order' ? `Round ${s.combat.round} · Set the turn order` : `Round ${s.combat ? s.combat.round : ''}`;
        els.combat.hidden = false;
        els.combat.innerHTML = `
            <div class="battle-head">${esc(heading)}</div>
            <div class="foes">${foes.map((e) => {
                const hit = battle.lastHp[e.id] != null && e.hp < battle.lastHp[e.id];
                return `<div class="foe ${battle.targetIds.includes(e.id) ? 'targeted' : ''} ${hit ? 'hit' : ''}" data-unit-id="${esc(e.id)}">
                    <canvas width="64" height="64" data-key="${esc(e.key)}"></canvas>
                    <div class="foe-name">${esc(e.name)}</div>
                    <div class="foe-hp">${bar(e.hp, e.maxHp, 'enemy')}<span>${e.hp}/${e.maxHp}</span></div>
                    <div class="tags">${tags(e.statusEffects)}</div></div>`;
            }).join('')}${minions.map((m) => `<div class="foe ally" data-unit-id="${esc(m.id)}"><div class="foe-name">${esc(m.name)}</div><div class="foe-hp">${bar(m.hp, m.maxHp, 'hp')}<span>${m.hp}/${m.maxHp}</span></div></div>`).join('')}</div>
            <div class="battle-log" aria-live="polite">${battle.log.map((l) => `<p class="${l.important ? 'imp' : ''} ${/^--- .* ---$/.test(l.text) ? 'sep' : ''}">${esc(l.text)}</p>`).join('')}</div>
            <div class="battle-foot">
                <div class="me" data-unit-id="player">
                    <canvas class="me-sprite" width="56" height="72" aria-hidden="true"></canvas>
                    <div class="hud-name">${esc(p.name)} <span>Lv ${p.level}</span></div>
                    <div class="hud-row">HP ${bar(p.hp, p.maxHp, 'hp')} <span>${Math.max(0, p.hp)}/${p.maxHp}</span></div>
                    <div class="hud-row">${esc(p.resource.type)} ${bar(p.resource.current, p.resource.max, 'res')} <span>${p.resource.current}/${p.resource.max}</span></div>
                    <div class="tags">${tags(p.statusEffects)}</div>
                </div>
                <div class="battle-menu">${menuHtml(menu)}<p class="keys">↑ ↓ choose · Enter confirm${menu && menu.back ? ' · Esc back' : ''}</p></div>
            </div>`;
        bindMenuClicks(els.combat, menu);
        els.combat.querySelectorAll('canvas[data-key]').forEach((c) => ENSO.worldRender.drawCreature(c, c.dataset.key, performance.now()));
        const log = els.combat.querySelector('.battle-log');
        log.scrollTop = log.scrollHeight;
        battle.lastHp = Object.fromEntries(foes.map((e) => [e.id, e.hp]));
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
        const p = screen === 'explore' && !modal && !fade && !flash ? session.prompt() : null;
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
        if (ev.repeat || fade || anim || flash) return;
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
            const k = Math.min(1, (now - fade.t0) / FADE_MS);
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
        const dim = screen === 'combat' || screen === 'over' ? 0.6 : view.fade;
        renderer.draw({ ...view, fade: Math.max(dim, view.fade) }, objects, now);
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
    requestAnimationFrame(frame);
})();
