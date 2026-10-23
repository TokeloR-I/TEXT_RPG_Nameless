/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Save / load (Phase 1 spec §5, SaveGame v1)
 * architecture/PHASE1_ENGINE_INTERFACE_SPEC.md §5.
 *
 *   engine.serialize({ label, createdAt, attachments })  -> SaveGame (plain JSON)
 *   engine.load(save, { strictData = false })            -> { ok, warnings, events, attachments, error? }
 *   GameEngine.fromSave(save, options)                   -> a new engine with that save loaded
 *
 * `state` is exactly what snapshot() captures (one definition of "everything a command can
 * change"), so a save is a transaction snapshot plus a header. The RNG state is saved too:
 * serialize -> load -> continue gives the identical future (I13). Storage, slots and clocks are
 * the front end's job; the engine never reads the time. A failed load changes nothing.
 * load() never evaluates anything from a save: JSON in, plain assignment out.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const FORMAT = 'enso-save';
    const FORMAT_VERSION = 1;
    const ENGINE_VERSION = '0.1.0';          // package.json "version" (kept in step by tests/33-save-load.test.js)
    const STATE_KEYS = ['rooms', 'currentRoom', 'mode', 'player', 'combat', 'pendingBranchChoice', 'flags', 'stats', 'progression', 'world', 'story'];
    // Fields a save must have to be loaded at all (story/world may be null: the text game).
    const REQUIRED = ['rooms', 'currentRoom', 'mode', 'flags', 'stats', 'progression'];
    const MODES = ['class_select', 'explore', 'branch_select', 'combat', 'game_over', 'won'];

    /** cyrb53: a small, deterministic, dependency-free string hash (spec §5.2 data.hash). */
    function cyrb53(str, seed = 0) {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }

    class SaveMethods {
        /** Hash of the game data and story content this save was made with (a mismatch is a warning). */
        dataHash() { return cyrb53(JSON.stringify([this.data, this.storyData || null])); }

        serialize({ label = null, createdAt = null, attachments = null } = {}) {
            const snap = this.snapshot();
            return {
                format: FORMAT,
                formatVersion: FORMAT_VERSION,
                engine: { version: ENGINE_VERSION, eventSchema: 1 },
                data: { hash: this.dataHash() },
                meta: { label, createdAt },
                rng: { algorithm: 'mulberry32', seed: this.seed, state: snap.rng },
                counters: { eventSeq: this.eventSeq || 0, encounters: (this.stats && this.stats.encounters) || 0 },
                state: JSON.parse(snap.json),
                attachments: attachments == null ? null : JSON.parse(JSON.stringify(attachments))
            };
        }

        /** Why a save can't be loaded, or null. */
        saveProblem(save) {
            if (!save || typeof save !== 'object' || save.format !== FORMAT) return { code: 'FORMAT_UNKNOWN', message: "That isn't an Enso's Last Stand save." };
            if (!Number.isInteger(save.formatVersion)) return { code: 'CORRUPT', message: 'The save has no format version.' };
            if (save.formatVersion > FORMAT_VERSION) return { code: 'VERSION_UNSUPPORTED', message: `The save is from a newer version (format ${save.formatVersion}).` };
            const st = save.state;
            if (!st || typeof st !== 'object') return { code: 'CORRUPT', message: 'The save has no game state.' };
            const missing = REQUIRED.filter((k) => !(k in st));
            if (missing.length) return { code: 'CORRUPT', message: `The save is missing: ${missing.join(', ')}.` };
            if (!MODES.includes(st.mode)) return { code: 'CORRUPT', message: `Unknown mode '${st.mode}'.` };
            if (st.mode !== 'class_select' && (!st.player || typeof st.player !== 'object')) return { code: 'CORRUPT', message: 'The save has no character.' };
            if (st.mode === 'combat' && (!st.combat || !Array.isArray(st.combat.order))) return { code: 'CORRUPT', message: 'The save is mid-fight but has no fight.' };
            if (!save.rng || !Number.isFinite(save.rng.state) || !Number.isFinite(save.rng.seed)) return { code: 'CORRUPT', message: 'The save has no random-number state.' };
            return null;
        }

        load(save, { strictData = false } = {}) {
            const problem = this.saveProblem(save);
            if (problem) return { ok: false, warnings: [], events: [], attachments: null, error: problem };
            const warnings = [];
            if (!save.data || save.data.hash !== this.dataHash()) {
                if (strictData) return { ok: false, warnings, events: [], attachments: null, error: { code: 'DATA_CHANGED', message: 'The game data has changed since this save was made.' } };
                warnings.push({ code: 'DATA_CHANGED', message: 'The game data has changed since this save was made; it was loaded anyway.' });
            }
            let failure = null;
            const events = this.transact(() => {
                const state = {};
                for (const k of STATE_KEYS) state[k] = k in save.state ? save.state[k] : null;
                this.restore({ json: JSON.stringify(state), rng: save.rng.state });
                this.seed = save.rng.seed >>> 0;
                if (save.counters && Number.isInteger(save.counters.eventSeq)) this.eventSeq = save.counters.eventSeq;
                this.clear();
                this.say('Game loaded.', { important: true });
                if (this.mode === 'combat') this.showCombatState();
                else if (this.mode === 'explore' && !this.world) this.describeRoom(false);
            }, (err) => { failure = err; });
            if (failure) return { ok: false, warnings, events, attachments: null, error: { code: 'CORRUPT', message: failure.message } };
            return { ok: true, warnings, events, attachments: save.attachments == null ? null : JSON.parse(JSON.stringify(save.attachments)) };
        }
    }

    SaveMethods.FORMAT = FORMAT;
    SaveMethods.FORMAT_VERSION = FORMAT_VERSION;
    SaveMethods.ENGINE_VERSION = ENGINE_VERSION;
    SaveMethods.cyrb53 = cyrb53;
    (ENSO.engineModules || (ENSO.engineModules = {}))['save'] = SaveMethods;
    if (isNode) module.exports = SaveMethods;
})(typeof window !== 'undefined' ? window : globalThis);
