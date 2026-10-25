/* =========================================================================
 * Enso's Last Stand — REAL-TIME BATTLE HUD MODEL (no DOM)
 * Presentation rules for the real-time fight HUD in ui/world-ui.js (combat v2, src/engine/realtime.js):
 * the UI clock that feeds engine.tick(), the skill bar slots, enemy wind-ups, timed status chips and
 * target cycling. Kept DOM-free so it is tested headlessly (tests/54-realtime-hud.test.js).
 *
 * Nothing here decides game rules. Whether a slot can be used, and why not, comes from the engine's
 * availability list (getAvailableActions()); every timer comes from getState().combat.realtime.
 * The only thing this file adds is smoothing: between two ticks a countdown may be drawn a little
 * further along (`sinceMs`), never past what the engine said.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const num = (v) => typeof v === 'number' && Number.isFinite(v);

    /** Keys for the six slots, then the basic attack. */
    const SLOT_KEYS = ['1', '2', '3', '4', '5', '6'];
    const BASIC_KEY = 'F';

    /**
     * The UI owns the fight clock. feed(frameMs) collects frame time and says how much fight time to
     * tick now: 0 until `stepMs` has built up, then the collected time, at most `maxMs` per call. A long
     * frame (a hidden tab, a debugger pause) is cut to `maxMs`, so time lost while away is not simulated.
     * Pass running=false while the fight is paused: the time is dropped.
     */
    function createClock({ stepMs = 100, maxMs = 250 } = {}) {
        let acc = 0;
        return {
            feed(frameMs, running = true) {
                if (!running || !num(frameMs) || frameMs <= 0) { if (!running) acc = 0; return 0; }
                acc = Math.min(maxMs, acc + Math.min(frameMs, maxMs));
                if (acc < stepMs) return 0;
                const out = Math.round(acc);
                acc = 0;
                return out;
            },
            reset() { acc = 0; },
            get pending() { return acc; }
        };
    }

    /** "0:07", "1:23" for the fight clock. */
    function clockText(ms) {
        const s = Math.max(0, Math.floor((ms || 0) / 1000));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }

    /** "1.4" under 10 s, else whole seconds ("12"); '' when nothing is left. */
    function secondsText(ms) {
        if (!num(ms) || ms <= 0) return '';
        return ms < 10000 ? (Math.ceil(ms / 100) / 10).toFixed(1) : String(Math.ceil(ms / 1000));
    }

    /** A timer { remainingMs, totalMs } as the fraction still to run (1 = just started, 0 = ready). */
    function fraction(timer, sinceMs = 0) {
        if (!timer || !num(timer.remainingMs) || !num(timer.totalMs) || timer.totalMs <= 0) return 0;
        return clamp01((timer.remainingMs - Math.max(0, sinceMs || 0)) / timer.totalMs);
    }

    /** A short label for a slot: the whole name if it fits, else initial-trimmed words ("Shield Bash" stays, "March of Endless Bones" -> "March Endless Bones" -> cut). */
    function shortName(name, max = 12) {
        if (!name) return '';
        if (name.length <= max) return name;
        const words = name.split(/\s+/).filter((w) => !/^(of|the|a|an)$/i.test(w));
        const joined = words.join(' ');
        if (joined.length <= max) return joined;
        return `${joined.slice(0, max - 1).trimEnd()}…`;
    }

    /**
     * The six slots for the HUD, from getAvailableActions() (awaiting 'realtime') and the state's realtime view.
     * Each: { slot, key, skillId, label, empty, enabled, cost, resource, reason, title, cooldown, gcd }
     * where cooldown / gcd are { endsAt, totalMs } on the fight clock (absolute ms), or null.
     */
    function skillSlots(avail, rt) {
        const bar = (avail && avail.skillBar) || (rt && rt.skillBar) || [];
        const options = new Map(((avail && avail.actions) || []).filter((o) => o.type === 'skill').map((o) => [o.skillId, o]));
        const now = (rt && rt.now) || 0;
        const at = (timer) => (timer && num(timer.remainingMs) ? { endsAt: now + timer.remainingMs, totalMs: timer.totalMs } : null);
        const out = [];
        for (let slot = 0; slot < SLOT_KEYS.length; slot++) {
            const entry = bar.find((b) => b.slot === slot) || { slot, skillId: null };
            const key = SLOT_KEYS[slot];
            if (!entry.skillId) { out.push({ slot, key, skillId: null, label: '', empty: true, enabled: false, cost: null, resource: null, reason: null, title: `Slot ${key} is empty. Set it in the menu (Skill bar) outside a fight.`, cooldown: null, gcd: null }); continue; }
            const o = options.get(entry.skillId) || null;
            const cd = rt && rt.cooldowns ? rt.cooldowns[entry.skillId] : null;
            const reason = o && !o.enabled ? (o.reason || null) : o ? null : { code: 'UNAVAILABLE', message: `${entry.skillId} can't be used right now.` };
            const cost = o && num(o.cost) ? o.cost : null;
            const costText = cost ? `${cost} ${o.resource}` : 'free';
            const cdSec = o && num(o.cooldownMs) ? ` · ${secondsText(o.cooldownMs)}s cooldown` : '';
            out.push({
                slot, key, skillId: entry.skillId, label: shortName(entry.skillId), empty: false,
                enabled: !!(o && o.enabled), cost, resource: o ? o.resource : null, reason,
                title: `${key} · ${entry.skillId} · ${costText}${cdSec}${reason ? ` · ${reason.message}` : ''}`,
                cooldown: at(cd), gcd: at(rt && rt.gcd)
            });
        }
        return out;
    }

    /** The basic attack button: { key, skillId, enabled, reason, title, swing: { endsAt, totalMs } | null }. */
    function basicSlot(avail, rt) {
        const o = ((avail && avail.actions) || []).find((x) => x.type === 'attack') || null;
        const now = (rt && rt.now) || 0;
        const swing = rt && rt.basic ? { endsAt: now + rt.basic.remainingMs, totalMs: rt.basic.totalMs } : null;
        const reason = o && !o.enabled ? (o.reason || null) : null;
        const name = o ? o.skillId : 'Attack';
        return { key: BASIC_KEY, skillId: name, label: shortName(name), enabled: !!(o && o.enabled), reason, swing,
            title: `${BASIC_KEY} · ${name} · free, ignores the global cooldown${reason ? ` · ${reason.message}` : ''}` };
    }

    /**
     * An enemy's timers for its plate: { windup: { skill, endsAt, totalMs } | null, next: { endsAt, totalMs } | null }.
     * `next` counts down to its next action (the wind-up starts then).
     */
    function actorTimers(rt, id) {
        const a = rt && rt.actors ? rt.actors[id] : null;
        if (!a) return { windup: null, next: null };
        const now = rt.now || 0;
        const windup = a.windup ? { skill: a.windup.skill, targetId: a.windup.targetId, endsAt: now + a.windup.remainingMs, totalMs: a.windup.totalMs } : null;
        const next = !a.windup && num(a.nextActionInMs) ? { endsAt: now + a.nextActionInMs, totalMs: a.intervalMs || a.nextActionInMs } : null;
        return { windup, next };
    }

    /** What's left of a timed status: { endsAt, totalMs } on the fight clock, or null for one with no end. */
    function statusTimer(status) {
        return status && num(status.rtEndsAt) ? { endsAt: status.rtEndsAt, totalMs: status.rtTotalMs || null } : null;
    }

    /** Fraction of an { endsAt, totalMs } timer still to run at fight time `now` (0..1). */
    function remaining(timer, now) {
        if (!timer || !num(timer.endsAt)) return 0;
        if (!num(timer.totalMs) || timer.totalMs <= 0) return timer.endsAt > now ? 1 : 0;
        return clamp01((timer.endsAt - now) / timer.totalMs);
    }

    /** The next living enemy after `currentId` (dir 1) or before it (dir -1), wrapping. `enemies` in the engine's order. */
    function cycleTarget(enemies, currentId, dir = 1) {
        const ids = (enemies || []).filter((e) => e.hp > 0).map((e) => e.id);
        if (!ids.length) return null;
        const i = ids.indexOf(currentId);
        if (i < 0) return ids[0];
        return ids[(i + (dir < 0 ? ids.length - 1 : 1)) % ids.length];
    }

    /** Which slot a key press fires: 0-5 for '1'..'6' (also numpad codes), else -1. */
    function slotForKey(ev) {
        if (!ev) return -1;
        const i = SLOT_KEYS.indexOf(ev.key);
        if (i >= 0) return i;
        const m = /^(?:Digit|Numpad)([1-6])$/.exec(ev.code || '');
        return m ? Number(m[1]) - 1 : -1;
    }

    /** What a skill-bar action means for presentation (the cast effect): the slot's skill as a plain skill action. */
    function presentationAction(action, slots) {
        if (!action || action.type !== 'skill_slot') return action;
        const s = (slots || []).find((x) => x.slot === action.slot);
        return s && s.skillId ? { type: 'skill', skillId: s.skillId, targetId: action.targetId } : null;
    }

    const api = { SLOT_KEYS, BASIC_KEY, createClock, clockText, secondsText, fraction, shortName, skillSlots, basicSlot, actorTimers, statusTimer, remaining, cycleTarget, slotForKey, presentationAction };
    ENSO.battleRealtime = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
