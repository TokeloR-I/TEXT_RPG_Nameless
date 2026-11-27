/* =========================================================================
 * Enso's Last Stand — ACCESSIBILITY OPTIONS (Hollis + Pixie; Tokelo's pick 4, round-two research 2026-11-25)
 * docs/design/GAME_EXPERIENCE_RESEARCH_ROUND2_2026-11-25.md #6. Per-browser preferences, never part of a save:
 *
 *   text        'normal' | 'large' | 'largest'     text in menus, dialogue, the HUD and notices (CSS --tk)
 *   colourSafe  true | false                       telegraphs and conditions in a colour-blind safe palette
 *                                                  (Okabe-Ito), with stripes so a wind-up reads by shape too
 *   shake       null (auto) | 'full' | 'half' | 'off'   screen shake strength; auto = off with reduced motion
 *   guard       'hold' | 'toggle'                  guard (and parry) by holding, or press once to raise/lower
 *   sprint      'hold' | 'toggle'                  sprint by holding, or press once (stops when you stand still)
 *   tips        true | false                       first-time prompts (ui/tutor.js)
 *   keys        { action: key }                    keyboard rebinding, only the keys you changed
 *   pad         { action: button }                 controller rebinding, only the buttons you changed
 *
 * Rebinding works at the input boundary: a pressed key is translated to the key the game already listens for
 * (translateKey), so the rest of the game, the touch controls and the gamepad keep one input path. Moving an
 * action onto a key another action has swaps the two, so two actions never share a key.
 * Pure functions here; ui/world-ui.js applies them. Node-testable.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const STORE_KEY = 'enso.ui.access';

    /** Keyboard actions you can rebind in play, with the key the game listens for (its default). */
    const KEY_ACTIONS = [
        { id: 'up', label: 'Move up', key: 'w' },
        { id: 'left', label: 'Move left', key: 'a' },
        { id: 'down', label: 'Move down', key: 's' },
        { id: 'right', label: 'Move right', key: 'd' },
        { id: 'attack', label: 'Attack', key: '1' },
        { id: 'skill1', label: 'Skill slot 1', key: '2' },
        { id: 'skill2', label: 'Skill slot 2', key: '3' },
        { id: 'skill3', label: 'Skill slot 3', key: '4' },
        { id: 'skill4', label: 'Skill slot 4', key: '5' },
        { id: 'skill5', label: 'Skill slot 5', key: '6' },
        { id: 'skill6', label: 'Skill slot 6', key: 'r' },
        { id: 'dodge', label: 'Dodge', key: ' ' },
        { id: 'guard', label: 'Guard / parry', key: 'q' },
        { id: 'sprint', label: 'Sprint', key: 'Shift' },
        { id: 'interact', label: 'Interact', key: 'e' },
        { id: 'heal', label: 'Quick heal', key: 'h' },
        { id: 'lock', label: 'Lock on', key: 'Tab' },
        { id: 'stance', label: 'Change stance', key: 't' },
        { id: 'union', label: 'Devil Union', key: 'u' },
        { id: 'map', label: 'World map (Shift + it mutes)', key: 'm' }
    ];
    /** Keys that stay fixed: they run menus and back out of anything. Arrows always move as well. */
    const RESERVED = new Set(['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Meta', 'OS', 'ContextMenu', 'Dead', 'Unidentified', 'Process']);
    const NAMED_OK = new Set(['Shift', 'Tab', 'Control', 'Alt', 'CapsLock', 'Backspace', 'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown']);

    /** Controller actions you can rebind (ui/gamepad.js), with their standard buttons. Start stays the menu and
     *  RT stays the skill chord. */
    const PAD_ACTIONS = [
        { id: 'attack', label: 'Attack', key: '1', button: 0 },
        { id: 'dodge', label: 'Dodge', key: ' ', button: 1 },
        { id: 'interact', label: 'Interact', key: 'e', button: 2 },
        { id: 'heal', label: 'Quick heal', key: 'h', button: 3 },
        { id: 'guard', label: 'Guard / parry', key: 'q', button: 4 },
        { id: 'lock', label: 'Lock on', key: 'Tab', button: 5 },
        { id: 'sprint', label: 'Sprint', key: 'Shift', button: 6 },
        { id: 'stance', label: 'Change stance', key: 't', button: 8 }
    ];
    const PAD_BUTTONS = [0, 1, 2, 3, 4, 5, 6, 8, 10];
    const PAD_NAMES = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Back', 9: 'Start', 10: 'L3', 11: 'R3' };

    const TEXT = ['normal', 'large', 'largest'];
    const TEXT_LABELS = { normal: 'Normal', large: 'Large', largest: 'Largest' };
    const TEXT_SCALE = { normal: 1, large: 1.2, largest: 1.4 };
    const SHAKE = ['full', 'half', 'off'];
    const SHAKE_LABELS = { full: 'Full', half: 'Half', off: 'Off' };
    const SHAKE_SCALE = { full: 1, half: 0.5, off: 0 };

    const DEFAULTS = { text: 'normal', colourSafe: false, shake: null, guard: 'hold', sprint: 'hold', tips: true, keys: {}, pad: {} };

    /** One key, the way we store and compare it: letters lower case, everything else as the browser names it. */
    function norm(key) {
        if (key == null) return '';
        if (key === 'Spacebar') return ' ';
        return String(key).length === 1 ? String(key).toLowerCase() : String(key);
    }
    /** Can this key be bound to an action? */
    function bindable(key) {
        const k = norm(key);
        if (!k || RESERVED.has(k)) return false;
        return k.length === 1 || NAMED_OK.has(k);
    }
    /** How a key is written on screen. */
    function keyName(key) {
        const k = norm(key);
        if (k === ' ') return 'Space';
        if (k === 'Control') return 'Ctrl';
        if (k.length === 1) return k.toUpperCase();
        return { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', CapsLock: 'Caps', Backspace: 'Bksp', PageUp: 'PgUp', PageDown: 'PgDn', Delete: 'Del', Insert: 'Ins' }[k] || k;
    }
    const padName = (b) => PAD_NAMES[b] || `Button ${b}`;

    /** Settings with every field valid (bad or missing values fall back to the defaults). */
    function normalise(raw) {
        const s = raw && typeof raw === 'object' ? raw : {};
        const keys = {};
        const seenKeys = new Set();
        for (const a of KEY_ACTIONS) {
            const k = s.keys && s.keys[a.id] != null ? norm(s.keys[a.id]) : null;
            if (k && bindable(k) && k !== a.key && !seenKeys.has(k)) { keys[a.id] = k; seenKeys.add(k); }
        }
        const pad = {};
        for (const a of PAD_ACTIONS) {
            const b = s.pad && s.pad[a.id] != null ? +s.pad[a.id] : null;
            if (b != null && PAD_BUTTONS.includes(b) && b !== a.button) pad[a.id] = b;
        }
        return {
            text: TEXT.includes(s.text) ? s.text : DEFAULTS.text,
            colourSafe: !!s.colourSafe,
            shake: SHAKE.includes(s.shake) ? s.shake : null,
            guard: s.guard === 'toggle' ? 'toggle' : 'hold',
            sprint: s.sprint === 'toggle' ? 'toggle' : 'hold',
            tips: s.tips !== false,
            keys: fixKeyClashes(keys),
            pad: fixPadClashes(pad)
        };
    }
    /** Every action's key with your changes applied: { action: key }. */
    function keyMap(settings) {
        const out = {};
        for (const a of KEY_ACTIONS) out[a.id] = (settings && settings.keys && settings.keys[a.id]) || a.key;
        return out;
    }
    function padMap(settings) {
        const out = {};
        for (const a of PAD_ACTIONS) out[a.id] = settings && settings.pad && settings.pad[a.id] != null ? settings.pad[a.id] : a.button;
        return out;
    }
    // A stored layout that gives two actions one key (an old browser copy, a hand edit) falls back to the defaults.
    function fixKeyClashes(keys) {
        return new Set(Object.values(keyMap({ keys }))).size === KEY_ACTIONS.length ? keys : {};
    }
    function fixPadClashes(pad) {
        const full = padMap({ pad });
        return new Set(Object.values(full)).size === PAD_ACTIONS.length ? pad : {};
    }

    /** Bind `action` to `key`. The action that had that key takes this action's old key (a swap). Returns new settings. */
    function bindKey(settings, action, key) {
        const k = norm(key);
        const def = KEY_ACTIONS.find((a) => a.id === action);
        if (!def || !bindable(k)) return settings;
        const map = keyMap(settings);
        const old = map[action];
        const other = KEY_ACTIONS.find((a) => a.id !== action && map[a.id] === k);
        map[action] = k;
        if (other) map[other.id] = old;
        return { ...settings, keys: diff(map, KEY_ACTIONS, 'key') };
    }
    function bindPad(settings, action, button) {
        const b = +button;
        if (!PAD_ACTIONS.some((a) => a.id === action) || !PAD_BUTTONS.includes(b)) return settings;
        const map = padMap(settings);
        const old = map[action];
        const other = PAD_ACTIONS.find((a) => a.id !== action && map[a.id] === b);
        map[action] = b;
        if (other) map[other.id] = old;
        return { ...settings, pad: diff(map, PAD_ACTIONS, 'button') };
    }
    function diff(map, list, field) {
        const out = {};
        for (const a of list) if (map[a.id] !== a[field]) out[a.id] = map[a.id];
        return out;
    }

    /**
     * The translation table for keys pressed in play: { physical key: game key | null }. A key you moved an action
     * onto sends that action's default key; a default key whose action moved away (and that nothing else uses now)
     * sends nothing (null). Keys not in the table pass through unchanged.
     */
    function keyTable(settings) {
        const map = keyMap(settings), table = {};
        for (const a of KEY_ACTIONS) if (map[a.id] !== a.key) table[map[a.id]] = a.key;
        for (const a of KEY_ACTIONS) if (map[a.id] !== a.key && !(a.key in table)) table[a.key] = null;
        return table;
    }
    /** What a pressed key means in play: { key } to send (maybe the same key), or { key: null } to drop it. */
    function translateKey(table, key) {
        const k = norm(key);
        if (!(k in table)) return { key, changed: false };
        return { key: table[k], changed: true };
    }

    /** The gamepad's play layout ({ button: key }) for ui/gamepad.js: Start = menu, L3 sprints unless it's taken. */
    function padLayout(settings) {
        const map = padMap(settings), out = {};
        for (const a of PAD_ACTIONS) out[map[a.id]] = a.key;
        if (out[10] == null) out[10] = 'Shift';
        out[9] = 'Escape';
        return out;
    }

    /** Names for the prompts and help: keys, pad buttons or touch buttons, for the device you are using. */
    function labels(settings, device) {
        return { danger: settings && settings.colourSafe ? 'Striped ground' : 'Red ground', ...deviceLabels(settings, device) };
    }
    function deviceLabels(settings, device) {
        if (device === 'pad') {
            const p = padMap(settings);
            return { device, attack: padName(p.attack), dodge: padName(p.dodge), guard: padName(p.guard), heal: padName(p.heal), interact: padName(p.interact),
                lock: padName(p.lock), sprint: padName(p.sprint), skills: `RT + A, B, X, Y, RB or LB`, menu: 'Start', move: 'the left stick' };
        }
        if (device === 'touch') {
            return { device, attack: '⚔', dodge: '» Dash', guard: '⛨ (hold)', heal: '✚', interact: 'E', lock: '', sprint: 'the stick pushed to its edge',
                skills: 'the skill buttons', menu: '☰', move: 'the stick' };
        }
        const m = keyMap(settings), n = (id) => keyName(m[id]);
        return { device: 'keys', attack: `Click or ${n('attack')}`, dodge: n('dodge'), guard: `${n('guard')} or right-click`, heal: n('heal'), interact: n('interact'),
            lock: n('lock'), sprint: n('sprint'), skills: ['skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'skill6'].map(n).join(' '), menu: 'Esc',
            move: [n('up'), n('left'), n('down'), n('right')].join('') };
    }

    /** Screen shake multiplier: 1, 0.5 or 0. Auto follows reduced motion. */
    function shakeScale(settings, reducedMotion) {
        const s = settings && settings.shake;
        if (s && s in SHAKE_SCALE) return SHAKE_SCALE[s];
        return reducedMotion ? 0 : 1;
    }
    function shakeMode(settings, reducedMotion) { return settings && settings.shake ? settings.shake : reducedMotion ? 'off' : 'full'; }

    // Okabe-Ito: a palette people with the common colour-vision deficiencies can tell apart. Conditions also keep
    // their own pictures on the HUD and their words over your head, so colour is never the only cue.
    const SAFE_CONDITIONS = { Bleed: '#d55e00', Poison: '#009e73', Burn: '#e69f00', Slow: '#56b4e9' };
    const SAFE_STATUS = { bleed: '#d55e00', bleeding: '#d55e00', poison: '#009e73', poisoned: '#009e73', burn: '#e69f00', burning: '#e69f00',
        slow: '#56b4e9', slowed: '#56b4e9', stun: '#f0e442', stunned: '#f0e442', freeze: '#ffffff', frozen: '#ffffff', mark: '#cc79a7', marked: '#cc79a7',
        expose: '#cc79a7', exposed: '#cc79a7', infection: '#0072b2', infected: '#0072b2' };

    function load(storage) {
        try { return normalise(JSON.parse((storage || global.localStorage).getItem(STORE_KEY) || 'null')); } catch (e) { return normalise(null); }
    }
    function save(settings, storage) {
        try { (storage || global.localStorage).setItem(STORE_KEY, JSON.stringify(normalise(settings))); return true; } catch (e) { return false; }   // private window: this session only
    }

    const api = { KEY_ACTIONS, PAD_ACTIONS, PAD_BUTTONS, PAD_NAMES, TEXT, TEXT_LABELS, TEXT_SCALE, SHAKE, SHAKE_LABELS, SHAKE_SCALE, DEFAULTS, STORE_KEY,
        SAFE_CONDITIONS, SAFE_STATUS, norm, bindable, keyName, padName, normalise, keyMap, padMap, bindKey, bindPad, keyTable, translateKey, padLayout,
        labels, shakeScale, shakeMode, load, save };
    ENSO.access = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
