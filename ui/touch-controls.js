/* =========================================================================
 * Enso's Last Stand — TOUCH CONTROLS (Pixie, UI/UX; Tokelo's request 2026-11-13)
 * The on-screen controls for touch screens (coarse pointers only; desktop never sees them):
 *
 *   - a virtual joystick in place of the old four-button D-pad, with eight directions (diagonals too);
 *     pushed to the edge it sprints (holds Shift);
 *   - the skill bar as big touch buttons (basic attack + the six engine slots), with the same icons,
 *     cooldowns and ready states as the HUD bar, because they are painted from the same view model;
 *   - Dash (the dodge, Space), Guard (held, Q), Quick heal (H), Interact (E), Menu (Esc) and Full screen.
 *
 * Every control only sends the keyboard keys the game already listens for (the `fire(type, key)` callback),
 * so touch and keyboard share one input path and nothing here decides rules.
 *
 *   ENSO.touchControls.stickKeys(dx, dy, radius)   pure: the arrow keys a stick offset holds ([] in the dead zone)
 *   ENSO.touchControls.create(padEl, { fire })     builds the controls in padEl, returns { update(model), release() }
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    /** Share of the stick's radius that is dead centre (no movement). */
    const DEAD_ZONE = 0.28;
    /** Share of the stick's reach past which a push sprints (holds Shift), like a run on a game pad. */
    const SPRINT_AT = 0.9;
    /** Eight 45° sectors, clockwise from east (screen y points down). */
    const SECTORS = [
        ['ArrowRight'], ['ArrowDown', 'ArrowRight'], ['ArrowDown'], ['ArrowDown', 'ArrowLeft'],
        ['ArrowLeft'], ['ArrowUp', 'ArrowLeft'], ['ArrowUp'], ['ArrowUp', 'ArrowRight']
    ];
    /** Touch buttons for the engine's skill-bar slots 0–5 (the same keys as ENSO.actionHud.SLOT_KEYS). */
    const SLOT_KEYS = ['2', '3', '4', '5', '6', 'R'];

    /** The arrow keys a stick pushed by (dx, dy) holds: one key for a straight push, two for a diagonal. */
    function stickKeys(dx, dy, radius) {
        const r = Math.hypot(dx, dy);
        if (!(radius > 0) || r < radius * DEAD_ZONE) return [];
        const sector = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
        return SECTORS[sector].slice();
    }

    /** Whether a stick pushed by (dx, dy) sprints: pushed to the edge of its reach. */
    function stickSprints(dx, dy, radius) {
        return radius > 0 && Math.hypot(dx, dy) >= radius * SPRINT_AT;
    }

    function secondsText(ms) {
        if (!(ms > 0)) return '';
        return ms < 10000 ? (Math.ceil(ms / 100) / 10).toFixed(1) : String(Math.ceil(ms / 1000));
    }

    function create(pad, opts = {}) {
        const doc = pad.ownerDocument;
        const fire = opts.fire || (() => {});
        const h = (tag, cls, parent, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; };
        pad.textContent = '';
        pad.classList.add('touch-pad');

        // ---- left: joystick
        const stick = h('div', 'tc-stick', pad);
        stick.setAttribute('role', 'application');
        stick.setAttribute('aria-label', 'Move: drag in any direction');
        const knob = h('div', 'tc-knob', stick);
        let stickId = null, heldKeys = [];
        const setKeys = (next) => {
            for (const k of heldKeys) if (!next.includes(k)) fire('keyup', k);
            for (const k of next) if (!heldKeys.includes(k)) fire('keydown', k);
            heldKeys = next;
        };
        const moveStick = (e) => {
            const r = stick.getBoundingClientRect();
            const radius = r.width / 2;
            let dx = e.clientX - (r.left + radius), dy = e.clientY - (r.top + r.height / 2);
            const len = Math.hypot(dx, dy), max = radius * 0.62;
            if (len > max) { dx *= max / len; dy *= max / len; }
            knob.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
            const keys = stickKeys(dx, dy, max);
            const run = keys.length > 0 && stickSprints(dx, dy, max);
            stick.classList.toggle('sprint', run);
            setKeys(run ? ['Shift', ...keys] : keys);
        };
        const releaseStick = () => {
            stickId = null;
            knob.style.transform = '';
            stick.classList.remove('active', 'sprint');
            setKeys([]);
        };
        stick.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (stickId != null) return;
            stickId = e.pointerId;
            try { stick.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
            stick.classList.add('active');
            moveStick(e);
        });
        stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) { e.preventDefault(); moveStick(e); } });
        for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(t, (e) => { if (e.pointerId === stickId) releaseStick(); });

        // ---- right: skills, attack, dash, guard, heal, interact, menu
        const right = h('div', 'tc-buttons', pad);
        /** A button that holds `key` while pressed (keydown on touch, keyup on release). */
        const button = (cls, key, label, glyph) => {
            const b = h('button', `tc-btn ${cls}`, right);
            b.type = 'button';
            b.setAttribute('aria-label', label);
            const icon = h('span', 'tc-icon', b, glyph || '');
            icon.setAttribute('aria-hidden', 'true');
            const secs = h('span', 'tc-secs', b);
            const shutter = h('span', 'tc-shutter', b);
            let pid = null;
            b.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (pid != null) return;
                pid = e.pointerId;
                try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
                b.classList.add('pressed');
                fire('keydown', key);
            });
            const up = (e) => { if (e.pointerId !== pid) return; pid = null; b.classList.remove('pressed'); fire('keyup', key); };
            for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, up);
            b.addEventListener('contextmenu', (e) => e.preventDefault());
            return { b, icon, secs, shutter, key, release: () => { if (pid != null) up({ pointerId: pid }); } };
        };
        const slots = SLOT_KEYS.map((k, i) => button(`tc-skill tc-s${i}`, k, `Skill ${k}`, k));
        const menuBtn = button('tc-sys tc-menu', 'Escape', 'Menu', '☰');
        const useBtn = button('tc-sys tc-use', 'e', 'Interact', 'E');
        const healBtn = button('tc-combat tc-heal', 'h', 'Quick heal', '✚');
        const guardBtn = button('tc-combat tc-guard', 'q', 'Guard (hold)', '⛨');
        const dashBtn = button('tc-combat tc-dash', ' ', 'Dash', '»');
        h('span', 'tc-label', dashBtn.b, 'Dash');
        const attackBtn = button('tc-combat tc-attack', '1', 'Attack', '⚔');
        const all = [...slots, menuBtn, useBtn, healBtn, guardBtn, dashBtn, attackBtn];

        // Full screen: lets a phone in landscape use the whole screen (and locks landscape where the browser allows).
        const fsOk = !!(doc.documentElement.requestFullscreen || doc.documentElement.webkitRequestFullscreen);
        if (fsOk) {
            pad.classList.add('can-fullscreen');
            const fs = h('button', 'tc-btn tc-sys tc-full', right);
            fs.type = 'button';
            fs.setAttribute('aria-label', 'Full screen');
            h('span', 'tc-icon', fs, '⛶');
            fs.addEventListener('click', () => {
                const el = doc.documentElement;
                const on = doc.fullscreenElement || doc.webkitFullscreenElement;
                if (on) { (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc); return; }
                const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
                const lock = () => { const o = global.screen && global.screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); };
                if (p && p.then) p.then(lock, () => {}); else lock();
            });
        }

        const paintSlot = (el, s) => {
            if (!s) return;
            const icons = global.EnsoSkillIcons;
            const id = s.empty ? null : (s.icon || s.skillId);
            if (el.iconId !== id || el.iconDef !== s.definition) {
                el.iconId = id; el.iconDef = s.definition;
                const markup = id && icons ? icons.svg(id, s.definition) : '';
                if (markup) el.icon.innerHTML = markup; else el.icon.textContent = s.empty ? '' : (s.key || el.key);
            }
            if (el.title !== s.title) { el.title = s.title; el.b.setAttribute('aria-label', s.title || `Skill ${el.key}`); }
            el.b.classList.toggle('empty', !!s.empty);
            for (const st of ['ready', 'cooldown', 'gcd', 'nores', 'disabled']) el.b.classList.toggle(`is-${st}`, s.state === st);
            const t = s.cd || s.swing;
            const secs = t ? secondsText(t.remainingMs) : '';
            if (el.secsText !== secs) { el.secsText = secs; el.secs.textContent = secs; }
            el.shutter.style.height = t ? `${Math.round(t.frac * 100)}%` : '0%';
        };

        let dodgeTotal = 0;
        /** Paint from the action HUD's view model (ENSO.actionHud.viewModel): the bar's skills, cooldowns, dash and heal. */
        function update(m) {
            if (!m) return;
            pad.classList.add('has-combat');
            pad.classList.toggle('in-combat', !!m.inCombat);
            if (m.basic) attackBtn.b.classList.toggle('is-ready', m.basic.state === 'ready');
            (m.slots || []).forEach((s, i) => slots[i] && paintSlot(slots[i], s));
            dodgeTotal = m.dodgeReadyInMs > 0 ? Math.max(dodgeTotal, m.dodgeReadyInMs) : 0;
            dashBtn.shutter.style.height = dodgeTotal ? `${Math.round(m.dodgeReadyInMs / dodgeTotal * 100)}%` : '0%';
            dashBtn.b.classList.toggle('is-cooldown', m.dodgeReadyInMs > 0);
            guardBtn.b.classList.toggle('active', !!m.guarding);
            healBtn.b.classList.toggle('is-disabled', !(m.heal && m.heal.enabled));
            const n = m.heal && m.heal.count > 1 ? `×${m.heal.count}` : '';
            if (healBtn.secsText !== n) { healBtn.secsText = n; healBtn.secs.textContent = n; }
        }
        /** Let go of everything held (a panel opened, the page lost focus). */
        function release() { releaseStick(); all.forEach((b) => b.release()); }

        return { update, release, el: pad };
    }

    const api = { create, stickKeys, stickSprints, DEAD_ZONE, SPRINT_AT, SLOT_KEYS };
    ENSO.touchControls = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
