/* =========================================================================
 * Enso's Last Stand — FIRST-TIME PROMPTS (Pixie + Hollis; Tokelo's pick 4, round-two research 2026-11-25)
 * docs/design/GAME_EXPERIENCE_RESEARCH_ROUND2_2026-11-25.md #5: teach the game in play, once, the first time each
 * thing matters, for the device you are using (keys, controller or touch), and switchable off in Settings.
 *
 *   trigger      when                                         taught                       done when you…
 *   engage       enemies first see you                        attack + dodge               dodge
 *   windup       first enemy wind-up (red ground)             guard just before = parry    parry or block
 *   lowhp        first time under 40% HP with food on you     quick heal (H)               quick heal
 *   skillbar     first fight with a skill on your bar         the skill bar keys           use a skill
 *   hearth       first hearth or cooking pot                  cooking                      cook something
 *   points       first unspent Skill Web point (out of fights) where to spend it          open the Skill Web
 *
 * A prompt is a small card over the game; it never pauses or takes a key. One at a time: a trigger that comes
 * while another prompt shows waits its turn. Each is shown once per browser (seen list in localStorage, never in
 * the save). Pure state machine (create); ui/world-ui.js renders it. Node-testable.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const SEEN_KEY = 'enso.ui.tips';
    const SHOW_MS = 14000;     // a prompt fades on its own after this long
    const DONE_MS = 1400;      // after you do the thing it shows a tick this long
    const GAP_MS = 900;        // pause between two prompts

    /** `k` is ENSO.access.labels(): key, button or touch names for the device in use. */
    const TIPS = [
        { id: 'fight', on: 'engage', done: ['dodge', 'perfect_dodge'], title: 'Fight',
            text: (k) => k.device === 'touch'
                ? `Tap ${k.attack} to attack. Tap ${k.dodge} to roll: nothing hits you mid-roll.`
                : `${k.attack} attacks. ${k.dodge} dodges: nothing hits you mid-roll.` },
        { id: 'parry', on: 'windup', done: ['parry', 'guard'], title: 'Guard and parry',
            text: (k) => `${k.danger || 'Red ground'} means a blow is coming. Step or dodge out of it, or press ${k.guard} just before it lands to parry.` },
        { id: 'heal', on: 'lowhp', done: ['heal'], title: 'Quick heal',
            text: (k) => `Low on health! ${k.device === 'touch' ? `Tap ${k.heal}` : `Press ${k.heal}`} to eat or drink your best healing item. No cooldown.` },
        { id: 'skillbar', on: 'skillbar', done: ['skill'], title: 'Skills',
            text: (k) => k.device === 'touch'
                ? 'Your skills are the round buttons around attack. Change which ones in the menu (☰), Skill bar.'
                : `Skills: ${k.skills}. Change which ones in the menu (${k.menu}), Skill bar.` },
        { id: 'cook', on: 'hearth', done: ['cook'], title: 'Cooking',
            text: () => 'Pick a dish: what it needs goes in the pot, then Cook. Meals give buffs for up to 3 minutes, and they stack.' },
        { id: 'web', on: 'points', done: ['web'], title: 'Skill Web',
            text: (k) => `You have a point to spend. Open the menu (${k.menu}) and choose Skill Web.` }
    ];

    /**
     * create({ seen?: iterable of tip ids, enabled?: () => bool }) — the prompt queue.
     *   signal(name, now)   a trigger (engage, windup, …) or a done event (dodge, parry, …)
     *   tick(now)           ages the current prompt; returns it ({ tip, state: 'show'|'done', t0 }) or null
     *   dismiss(now)        close the current prompt now
     *   seen                Set of tip ids already shown
     */
    function create(opts = {}) {
        const seen = new Set(opts.seen || []);
        const enabled = opts.enabled || (() => true);
        const queue = [];
        let current = null, nextAt = 0;
        const byTrigger = (name) => TIPS.find((t) => t.on === name);
        function signal(name, now = 0) {
            if (current && current.state === 'show' && current.tip.done.includes(name)) { current = { ...current, state: 'done', t0: now }; return true; }
            const tip = byTrigger(name);
            if (!tip || !enabled() || seen.has(tip.id) || queue.includes(tip) || (current && current.tip === tip)) return false;
            queue.push(tip);
            return true;
        }
        function tick(now = 0) {
            if (current && now - current.t0 >= (current.state === 'done' ? DONE_MS : SHOW_MS)) { current = null; nextAt = now + GAP_MS; }
            if (!enabled()) { queue.length = 0; if (current && current.state === 'show') current = null; }
            if (!current && queue.length && now >= nextAt) {
                const tip = queue.shift();
                if (!seen.has(tip.id)) { seen.add(tip.id); current = { tip, state: 'show', t0: now }; }
            }
            return current;
        }
        function dismiss(now = 0) { if (current) { current = null; nextAt = now + GAP_MS; } }
        function reset() { seen.clear(); queue.length = 0; current = null; }
        return { signal, tick, dismiss, reset, seen, get current() { return current; } };
    }

    function loadSeen(storage) {
        try { const v = JSON.parse((storage || global.localStorage).getItem(SEEN_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => TIPS.some((t) => t.id === x)) : []; } catch (e) { return []; }
    }
    function saveSeen(seen, storage) {
        try { (storage || global.localStorage).setItem(SEEN_KEY, JSON.stringify([...seen])); } catch (e) { /* private window: this session only */ }
    }

    const api = { TIPS, SEEN_KEY, SHOW_MS, DONE_MS, GAP_MS, create, loadSeen, saveSeen };
    ENSO.tutor = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
