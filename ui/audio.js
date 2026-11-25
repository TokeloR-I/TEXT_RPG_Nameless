/* =========================================================================
 * Enso's Last Stand — SOUND (Echo's plan, game-feel pass 2026-11-25)
 * Every sound is synthesised with Web Audio: no audio files, so the game stays double-click playable and every
 * sound is ENSO's own. A sound is a recipe (SOUNDS below): one or more layers, each an oscillator or a noise burst
 * with a pitch sweep, an envelope, an optional filter and a delay. The recipes are plain data, so the tests check
 * them headlessly; only `create()` touches the browser's AudioContext.
 *
 * Signal chain: layer → bus (sfx | ui | music) → master → compressor → speakers. Volumes and mute are a per-browser
 * preference (localStorage 'enso.ui.audio'), never part of a save. The context starts on the first key, click or tap
 * (browsers block sound before that); until then `play()` does nothing.
 * Repeats: each sound waits at least `gapMs` after its last play and never has more than MAX_VOICES copies at once,
 * and each play is pitched ±6% and loudness ±2 dB at random (Math.random: sound must never touch the seeded engine rng).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const SETTINGS_KEY = 'enso.ui.audio';
    const DEFAULTS = { master: 0.8, sfx: 1, ui: 0.7, music: 0.6, muted: false };
    const MAX_VOICES = 4;
    const LEVELS = [0, 0.25, 0.5, 0.75, 1];   // the Settings rows step through these

    // layer: { wave: sine|square|triangle|sawtooth|noise, f0, f1? (sweep target Hz), ms, attack? ms, gain (0..1),
    //          filter? { type: lowpass|highpass|bandpass, f, f1? (sweep), q? }, at? (delay ms) }
    const SOUNDS = {
        // Combat (sfx bus)
        hit:        { bus: 'sfx', gapMs: 40, layers: [{ wave: 'noise', ms: 40, gain: 0.55, filter: { type: 'bandpass', f: 1800, q: 1.2 } }, { wave: 'sine', f0: 170, f1: 60, ms: 70, gain: 0.6 }] },
        crit:       { bus: 'sfx', gapMs: 60, layers: [{ wave: 'noise', ms: 60, gain: 0.6, filter: { type: 'bandpass', f: 2400, q: 1 } }, { wave: 'sine', f0: 140, f1: 45, ms: 120, gain: 0.75 }, { wave: 'triangle', f0: 1050, ms: 220, gain: 0.25, at: 10 }] },
        stagger:    { bus: 'sfx', gapMs: 80, layers: [{ wave: 'noise', ms: 50, gain: 0.5, filter: { type: 'bandpass', f: 2600, q: 2 } }, { wave: 'square', f0: 330, f1: 220, ms: 90, gain: 0.18 }] },
        swing:      { bus: 'sfx', gapMs: 70, layers: [{ wave: 'noise', ms: 110, gain: 0.22, filter: { type: 'bandpass', f: 900, f1: 2600, q: 0.9 } }] },
        cast:       { bus: 'sfx', gapMs: 90, layers: [{ wave: 'triangle', f0: 420, f1: 880, ms: 180, gain: 0.22 }, { wave: 'sine', f0: 630, f1: 1320, ms: 160, gain: 0.12, at: 30 }] },
        hurt:       { bus: 'sfx', gapMs: 90, layers: [{ wave: 'noise', ms: 120, gain: 0.5, filter: { type: 'lowpass', f: 900 } }, { wave: 'sawtooth', f0: 150, f1: 70, ms: 180, gain: 0.3 }] },
        windup:     { bus: 'sfx', gapMs: 120, layers: [{ wave: 'square', f0: 220, f1: 330, ms: 130, attack: 5, gain: 0.14 }] },
        bossWindup: { bus: 'sfx', gapMs: 160, layers: [{ wave: 'sawtooth', f0: 110, f1: 165, ms: 260, attack: 10, gain: 0.2, filter: { type: 'lowpass', f: 900 } }, { wave: 'square', f0: 220, f1: 330, ms: 160, gain: 0.1, at: 60 }] },
        parry:      { bus: 'sfx', gapMs: 80, layers: [{ wave: 'triangle', f0: 1200, ms: 420, attack: 4, gain: 0.35 }, { wave: 'triangle', f0: 1900, ms: 360, attack: 4, gain: 0.22 }, { wave: 'noise', ms: 30, gain: 0.4, filter: { type: 'highpass', f: 3000 } }] },
        guard:      { bus: 'sfx', gapMs: 80, layers: [{ wave: 'triangle', f0: 600, f1: 520, ms: 120, gain: 0.3 }, { wave: 'noise', ms: 40, gain: 0.3, filter: { type: 'bandpass', f: 1200 } }] },
        dodge:      { bus: 'sfx', gapMs: 100, layers: [{ wave: 'noise', ms: 150, gain: 0.3, filter: { type: 'highpass', f: 2000, f1: 6000 } }] },
        perfectDodge: { bus: 'sfx', gapMs: 150, layers: [{ wave: 'sine', f0: 1568, ms: 260, gain: 0.2 }, { wave: 'sine', f0: 2093, ms: 260, gain: 0.14, at: 70 }] },
        kill:       { bus: 'sfx', gapMs: 60, layers: [{ wave: 'noise', ms: 260, gain: 0.45, filter: { type: 'lowpass', f: 2400, f1: 200 } }, { wave: 'sine', f0: 120, f1: 40, ms: 220, gain: 0.45 }] },
        explode:    { bus: 'sfx', gapMs: 90, layers: [{ wave: 'noise', ms: 320, gain: 0.5, filter: { type: 'lowpass', f: 1600, f1: 150 } }, { wave: 'sine', f0: 90, f1: 35, ms: 300, gain: 0.5 }] },
        phase:      { bus: 'sfx', gapMs: 400, layers: [{ wave: 'sawtooth', f0: 55, f1: 110, ms: 700, attack: 60, gain: 0.25, filter: { type: 'lowpass', f: 600 } }, { wave: 'noise', ms: 500, gain: 0.25, filter: { type: 'lowpass', f: 500 } }] },
        engage:     { bus: 'sfx', gapMs: 800, layers: [{ wave: 'square', f0: 294, ms: 90, gain: 0.12 }, { wave: 'square', f0: 392, ms: 140, gain: 0.12, at: 90 }] },
        cleared:    { bus: 'sfx', gapMs: 400, layers: [{ wave: 'triangle', f0: 523, ms: 120, gain: 0.25 }, { wave: 'triangle', f0: 659, ms: 120, gain: 0.25, at: 90 }, { wave: 'triangle', f0: 784, ms: 260, gain: 0.25, at: 180 }] },
        levelUp:    { bus: 'sfx', gapMs: 800, layers: [523, 659, 784, 1047, 1319].map((f, i) => ({ wave: 'triangle', f0: f, ms: i === 4 ? 420 : 150, gain: 0.24, at: i * 95 })) },
        pickup:     { bus: 'sfx', gapMs: 60, layers: [{ wave: 'sine', f0: 1300, ms: 60, gain: 0.25 }, { wave: 'sine', f0: 1700, ms: 90, gain: 0.25, at: 55 }] },
        heal:       { bus: 'sfx', gapMs: 200, layers: [{ wave: 'sine', f0: 660, f1: 990, ms: 260, gain: 0.22 }, { wave: 'triangle', f0: 990, f1: 1320, ms: 220, gain: 0.12, at: 80 }] },
        quest:      { bus: 'ui', gapMs: 300, layers: [{ wave: 'triangle', f0: 784, ms: 110, gain: 0.25 }, { wave: 'triangle', f0: 1175, ms: 220, gain: 0.25, at: 100 }] },
        // Menus and dialogue (ui bus)
        tick:       { bus: 'ui', gapMs: 25, layers: [{ wave: 'square', f0: 1400, ms: 18, gain: 0.08, filter: { type: 'lowpass', f: 3000 } }] },
        select:     { bus: 'ui', gapMs: 40, layers: [{ wave: 'triangle', f0: 880, ms: 50, gain: 0.18 }, { wave: 'triangle', f0: 1320, ms: 70, gain: 0.14, at: 40 }] },
        back:       { bus: 'ui', gapMs: 40, layers: [{ wave: 'triangle', f0: 660, f1: 440, ms: 80, gain: 0.16 }] },
        open:       { bus: 'ui', gapMs: 80, layers: [{ wave: 'noise', ms: 90, gain: 0.12, filter: { type: 'bandpass', f: 1400, f1: 700, q: 1.5 } }, { wave: 'triangle', f0: 520, ms: 70, gain: 0.12 }] },
        blip:       { bus: 'ui', gapMs: 45, layers: [{ wave: 'square', f0: 600, ms: 22, gain: 0.05, filter: { type: 'lowpass', f: 2200 } }] },
        refuse:     { bus: 'ui', gapMs: 200, layers: [{ wave: 'square', f0: 180, ms: 90, gain: 0.1, filter: { type: 'lowpass', f: 1200 } }] },
        step:       { bus: 'sfx', gapMs: 120, layers: [{ wave: 'noise', ms: 26, gain: 0.1, filter: { type: 'lowpass', f: 700 } }] }
    };

    /** A sound's level knob: the settings row it belongs to. */
    const busOf = (name) => (SOUNDS[name] ? SOUNDS[name].bus : null);

    /** Clean stored settings: unknown keys dropped, numbers clamped to 0..1. Pure. */
    function readSettings(raw) {
        let s = {};
        try { s = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch (e) { s = {}; }
        const out = { ...DEFAULTS };
        for (const k of ['master', 'sfx', 'ui', 'music']) if (typeof s[k] === 'number' && isFinite(s[k])) out[k] = Math.max(0, Math.min(1, s[k]));
        if (typeof s.muted === 'boolean') out.muted = s.muted;
        return out;
    }

    /** The next step of a volume row (0 → 25% → … → 100% → 0). Pure. */
    function nextLevel(v) { const i = LEVELS.findIndex((x) => x > v + 1e-6); return i < 0 ? LEVELS[0] : LEVELS[i]; }

    /** Throttle: may `name` play at `now`? `state` = { last: {name: t}, voices: {name: [endTimes]} }. Pure apart from state. */
    function admit(state, name, now) {
        const def = SOUNDS[name];
        if (!def) return false;
        const last = state.last[name];
        if (last != null && now - last < (def.gapMs || 0)) return false;
        const live = (state.voices[name] || []).filter((t) => t > now);
        if (live.length >= MAX_VOICES) { state.voices[name] = live; return false; }
        const len = Math.max(...def.layers.map((l) => (l.at || 0) + l.ms));
        live.push(now + len);
        state.voices[name] = live;
        state.last[name] = now;
        return true;
    }

    /** The player for this page. With no Web Audio (Node, old browsers) every call is a quiet no-op. */
    function create(opts = {}) {
        const store = opts.storage !== undefined ? opts.storage : (typeof localStorage !== 'undefined' ? localStorage : null);
        const Ctx = opts.AudioContext || (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
        let settings = readSettings(store ? (() => { try { return store.getItem(SETTINGS_KEY); } catch (e) { return null; } })() : null);
        let ctx = null, master = null, buses = {}, noise = null;
        const state = { last: {}, voices: {} };
        const rand = opts.random || Math.random;

        function save() { if (store) try { store.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* private window */ } }
        function applyLevels() {
            if (!ctx) return;
            const t = ctx.currentTime;
            master.gain.setTargetAtTime(settings.muted ? 0 : settings.master, t, 0.02);
            for (const b of Object.keys(buses)) buses[b].gain.setTargetAtTime(settings[b], t, 0.02);
        }
        function start() {
            if (!Ctx) return false;
            if (!ctx) {
                try { ctx = new Ctx(); } catch (e) { ctx = null; return false; }
                const comp = ctx.createDynamicsCompressor();
                comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4;
                master = ctx.createGain(); master.connect(comp); comp.connect(ctx.destination);
                for (const b of ['sfx', 'ui', 'music']) { buses[b] = ctx.createGain(); buses[b].connect(master); }
                // One second of white noise, reused by every noise layer.
                noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
                const d = noise.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                applyLevels();
            }
            if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
            return true;
        }
        function layer(l, t0, pitch, vol, bus) {
            const t = t0 + (l.at || 0) / 1000, dur = l.ms / 1000, att = Math.min(dur * 0.5, (l.attack != null ? l.attack : 3) / 1000);
            let src;
            if (l.wave === 'noise') { src = ctx.createBufferSource(); src.buffer = noise; src.playbackRate.value = pitch; }
            else {
                src = ctx.createOscillator(); src.type = l.wave;
                src.frequency.setValueAtTime(l.f0 * pitch, t);
                if (l.f1) src.frequency.exponentialRampToValueAtTime(Math.max(1, l.f1 * pitch), t + dur);
            }
            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, t);
            env.gain.exponentialRampToValueAtTime(Math.max(0.0002, l.gain * vol), t + att);
            env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            let out = src;
            if (l.filter) {
                const f = ctx.createBiquadFilter(); f.type = l.filter.type;
                f.frequency.setValueAtTime(l.filter.f, t);
                if (l.filter.f1) f.frequency.exponentialRampToValueAtTime(l.filter.f1, t + dur);
                if (l.filter.q) f.Q.value = l.filter.q;
                src.connect(f); out = f;
            }
            out.connect(env); env.connect(bus);
            src.start(t, l.wave === 'noise' ? rand() * 0.5 : 0); src.stop(t + dur + 0.02);
        }
        /** Play a sound by name. opts: { pitch (×), gain (×) }. Returns whether it played. */
        function play(name, o = {}) {
            if (!ctx || settings.muted || ctx.state !== 'running') return false;
            const def = SOUNDS[name];
            if (!def || !settings[def.bus] || !settings.master) return false;
            if (!admit(state, name, ctx.currentTime * 1000)) return false;
            const pitch = (o.pitch || 1) * (1 + (rand() * 2 - 1) * 0.06);
            const vol = (o.gain || 1) * Math.pow(10, ((rand() * 2 - 1) * 2) / 20);
            const t0 = ctx.currentTime + 0.005;
            try { for (const l of def.layers) layer(l, t0, pitch, vol, buses[def.bus]); } catch (e) { return false; }
            return true;
        }
        function set(key, value) { settings = readSettings({ ...settings, [key]: value }); save(); applyLevels(); return settings; }
        return {
            start, play, set,
            get settings() { return { ...settings }; },
            get running() { return !!ctx && ctx.state === 'running'; },
            toggleMute() { return set('muted', !settings.muted); },
            cycle(key) { return set(key, nextLevel(settings[key])); }
        };
    }

    const api = { SOUNDS, DEFAULTS, LEVELS, MAX_VOICES, SETTINGS_KEY, busOf, readSettings, nextLevel, admit, create };
    ENSO.audio = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
