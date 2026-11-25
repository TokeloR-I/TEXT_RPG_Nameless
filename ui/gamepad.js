/* =========================================================================
 * Enso's Last Stand — GAMEPAD (Thorne + Hollis, game-feel pass 2026-11-25)
 * Any controller the browser sees (Xbox, PlayStation, Switch Pro, most USB/Bluetooth pads in the "standard" layout)
 * plays the game. Like the touch controls (ui/touch-controls.js), the pad only sends the keyboard keys the game
 * already listens for, so pad, touch and keyboard share one input path and nothing here decides rules.
 *
 *   Playing                                   Menus, dialogue, shops
 *   Left stick / D-pad   move (8 ways)        Left stick / D-pad   move the cursor
 *   A / Cross            attack (1)           A / Cross            confirm (Enter)
 *   B / Circle           dodge (Space)        B / Circle           back (Esc)
 *   X / Square           interact (E)         LB / RB              previous / next tab (Q / R)
 *   Y / Triangle         quick heal (H)       Start                close (Esc)
 *   LB (hold)            guard (Q)
 *   RB                   lock on (Tab)
 *   LT or L3 (hold)      sprint (Shift)
 *   RT (hold) + A/B/X/Y/RB/LB   skill slots 2, 3, 4, 5, 6, R
 *   Start                menu (Esc)   Back/Select: stance (T)
 *
 *   ENSO.gamepad.keysFor(pad, mode)   pure: the keys a pad state holds ({ buttons:[{pressed}], axes:[] }, 'play'|'menu')
 *   ENSO.gamepad.create({ fire, mode })  returns { poll(), release(), connected }
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const DEAD_ZONE = 0.35;
    const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
    const PLAY = { [B.A]: '1', [B.B]: ' ', [B.X]: 'e', [B.Y]: 'h', [B.LB]: 'q', [B.RB]: 'Tab', [B.LT]: 'Shift', [B.L3]: 'Shift', [B.START]: 'Escape', [B.BACK]: 't' };
    const SKILL = { [B.A]: '2', [B.B]: '3', [B.X]: '4', [B.Y]: '5', [B.RB]: '6', [B.LB]: 'r' };   // with RT held
    const MENU = { [B.A]: 'Enter', [B.B]: 'Escape', [B.START]: 'Escape', [B.LB]: 'q', [B.RB]: 'r' };

    const pressed = (pad, i) => { const b = pad.buttons && pad.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); };

    /** The arrow keys the stick and D-pad hold: up to two (a diagonal). */
    function moveKeys(pad) {
        const x = (pad.axes && pad.axes[0]) || 0, y = (pad.axes && pad.axes[1]) || 0;
        const keys = new Set();
        if (Math.hypot(x, y) >= DEAD_ZONE) {
            const sector = ((Math.round(Math.atan2(y, x) / (Math.PI / 4)) % 8) + 8) % 8;   // 8 ways, clockwise from east
            if ([7, 0, 1].includes(sector)) keys.add('ArrowRight');
            if ([3, 4, 5].includes(sector)) keys.add('ArrowLeft');
            if ([1, 2, 3].includes(sector)) keys.add('ArrowDown');
            if ([5, 6, 7].includes(sector)) keys.add('ArrowUp');
        }
        if (pressed(pad, B.UP)) keys.add('ArrowUp');
        if (pressed(pad, B.DOWN)) keys.add('ArrowDown');
        if (pressed(pad, B.LEFT)) keys.add('ArrowLeft');
        if (pressed(pad, B.RIGHT)) keys.add('ArrowRight');
        return [...keys];
    }

    /** Every key this pad state holds right now, for 'play' (the world) or 'menu' (anything with a cursor). */
    function keysFor(pad, mode) {
        if (!pad) return [];
        const keys = moveKeys(pad);
        if (mode === 'menu') {
            for (const [i, k] of Object.entries(MENU)) if (pressed(pad, +i)) keys.push(k);
            return [...new Set(keys)];
        }
        const skills = pressed(pad, B.RT);
        for (const [i, k] of Object.entries(PLAY)) {
            if (skills && SKILL[i] != null) { if (pressed(pad, +i)) keys.push(SKILL[i]); continue; }
            if (pressed(pad, +i)) keys.push(k);
        }
        return [...new Set(keys)];
    }

    function create(opts = {}) {
        const fire = opts.fire || (() => {});
        const mode = opts.mode || (() => 'play');
        let held = [], lastMode = null, connected = false, stale = new Set();
        function release() { for (const k of held) fire('keyup', k); held = []; }
        function poll() {
            const list = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
            const pad = list.find((p) => p.connected !== false) || null;
            connected = !!pad;
            const m = mode();
            let next = pad ? keysFor(pad, m) : [];
            // A menu opened or closed: nothing stays held across it, and a button still down from the other side (the A
            // that closed a dialogue) does nothing until it is let go, so it never also swings or confirms.
            if (m !== lastMode) { release(); stale = new Set(lastMode === null ? [] : next.filter((k) => !/^Arrow/.test(k))); lastMode = m; }
            for (const k of [...stale]) if (!next.includes(k)) stale.delete(k);
            next = next.filter((k) => !stale.has(k));
            for (const k of held) if (!next.includes(k)) fire('keyup', k);
            for (const k of next) if (!held.includes(k)) fire('keydown', k);
            held = next;
            return connected;
        }
        return { poll, release, get connected() { return connected; } };
    }

    const api = { keysFor, moveKeys, create, BUTTONS: B, DEAD_ZONE };
    ENSO.gamepad = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
