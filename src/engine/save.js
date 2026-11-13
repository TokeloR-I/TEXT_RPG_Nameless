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
 * Saves outlive game updates (a playtester keeps one save while chapters ship):
 *   1. migrateSave(): a save from an older FORMAT_VERSION is upgraded one step at a time through
 *      MIGRATIONS (pure JSON -> JSON). A change to the save layout bumps FORMAT_VERSION and adds a step;
 *      never edit an old step. A save from a NEWER format is refused, not guessed at.
 *   2. reconcileSave(): after the state is restored, content added since the save was made is filled
 *      in (new quests, rooms, player fields, equipment slots), content that was removed is set aside,
 *      and a conversation that no longer exists is closed. A save made by this version is unchanged.
 *   3. catch-up: story data may list `catchUp: [{ id, if, effects }]`. An older save runs each one once
 *      on load if its condition holds (e.g. "Chapter 1 is done: start Chapter 2"), because a reward that
 *      was paid before the content existed will never fire again. New games mark them done at the start.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const FORMAT = 'enso-save';
    const FORMAT_VERSION = 3;
    // Which content release wrote a save. Bump it when a PR adds or removes story content (quests, NPCs, items,
    // maps), so a save carried back to an older copy of the game is recognised as newer, not "updated" (playtest
    // 2026-11-11). A save that names quests or items this build doesn't know is newer whatever the number says.
    const CONTENT_REVISION = 6;   // 5: the Hrimvald kitchen and Sour Herring (C2S1); 6: Gullstrand Coast and the Wolf's Wake
    const ENGINE_VERSION = '0.1.0';          // package.json "version" (kept in step by tests/33-save-load.test.js)
    const STATE_KEYS = ['rooms', 'currentRoom', 'mode', 'player', 'combat', 'pendingBranchChoice', 'flags', 'stats', 'progression', 'world', 'story'];
    // Fields a save must have to be loaded at all (story/world may be null: the text game).
    const REQUIRED = ['rooms', 'currentRoom', 'mode', 'flags', 'stats', 'progression'];
    const MODES = ['class_select', 'explore', 'branch_select', 'combat', 'game_over', 'won'];

    const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
    const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

    /** Upgrades a save of format n to n+1. Each step gets a deep copy and returns it. Never edit an old step. */
    const MIGRATIONS = {
        // v1 -> v2: the header says which game version (and chapter) wrote the save, so the title screen and an
        // exported file can tell the player what they're loading. Nothing in `state` moved.
        1: (save) => {
            save.game = { version: (save.engine && save.engine.version) || null, chapter: (save.state && save.state.story && save.state.story.chapter) || null };
            save.formatVersion = 2;
            return save;
        },
        // v2 -> v3: the Fallen Seraphim's door names became fire names (Tokelo, 2026-11-11: "I am still not liking
        // this door obsession"). Item and skill names are their own keys, so a save holding the old ones is renamed
        // wherever the exact name appears: inventory, equipment, skill bar, cooldowns, statuses, quest notes.
        2: (save) => {
            const RENAMED = { 'Doorward': 'Emberward', 'Spear of the Cold Door': 'Spear of the Altar Fire', 'The Door Held Open': 'The Coal Carried Down' };
            const fix = (x) => {
                if (typeof x === 'string') return Object.prototype.hasOwnProperty.call(RENAMED, x) ? RENAMED[x] : x;
                if (Array.isArray(x)) return x.map(fix);
                if (!isObj(x)) return x;
                const out = {};
                for (const k of Object.keys(x)) out[Object.prototype.hasOwnProperty.call(RENAMED, k) ? RENAMED[k] : k] = fix(x[k]);
                return out;
            };
            if (save.state) save.state = fix(save.state);
            save.formatVersion = 3;
            return save;
        }
    };

    /** A copy of `save` brought up to FORMAT_VERSION, or the save itself if it can't be (saveProblem says why). */
    function migrateSave(save) {
        if (!save || typeof save !== 'object' || !Number.isInteger(save.formatVersion) || save.formatVersion >= FORMAT_VERSION) return { save, from: save && save.formatVersion, steps: 0 };
        let out = clone(save);
        const from = out.formatVersion;
        while (out.formatVersion < FORMAT_VERSION) {
            const step = MIGRATIONS[out.formatVersion];
            if (!step) throw new Error(`No save migration from format ${out.formatVersion}.`);
            const v = out.formatVersion;
            out = step(out);
            if (out.formatVersion !== v + 1) throw new Error(`Save migration from format ${v} did not reach ${v + 1}.`);
        }
        return { save: out, from, steps: FORMAT_VERSION - from };
    }

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
                game: { version: ENGINE_VERSION, revision: CONTENT_REVISION, chapter: (this.story && this.story.chapter) || null },
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
            if (!Number.isInteger(save.formatVersion) || save.formatVersion < 1) return { code: 'CORRUPT', message: 'The save has no format version.' };
            if (save.formatVersion > FORMAT_VERSION) return { code: 'VERSION_UNSUPPORTED', message: `The save is from a newer version of the game (format ${save.formatVersion}). Update the game to load it.` };
            if (save.formatVersion < FORMAT_VERSION) {
                let m;
                try { m = migrateSave(save); } catch (e) { return { code: 'CORRUPT', message: `The save couldn't be upgraded (${e.message}).` }; }
                save = m.save;
            }
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
            const migrated = migrateSave(save);
            save = migrated.save;
            if (migrated.steps) warnings.push({ code: 'UPGRADED', message: `The save was upgraded from format ${migrated.from} to ${FORMAT_VERSION}.` });
            if (!save.data || save.data.hash !== this.dataHash()) {
                if (strictData) return { ok: false, warnings, events: [], attachments: null, error: { code: 'DATA_CHANGED', message: 'The game data has changed since this save was made.' } };
                warnings.push({ code: 'DATA_CHANGED', message: 'The game data has changed since this save was made; it was loaded anyway.' });
            }
            const ahead = this.saveAhead(save);   // read before reconcileSave() sets the unknown things aside
            if (ahead.length) warnings.push({ code: 'NEWER_SAVE', message: `This save was made by a newer version of the game: ${ahead.join('; ')}.`, details: ahead });
            let failure = null;
            let reconciled = [];
            const events = this.transact(() => {
                const state = {};
                for (const k of STATE_KEYS) state[k] = k in save.state ? save.state[k] : null;
                this.restore({ json: JSON.stringify(state), rng: save.rng.state });
                this.seed = save.rng.seed >>> 0;
                if (this.player) this.webState();   // older saves: build the Skill Web from the path they walked
                reconciled = this.reconcileSave();
                if (save.counters && Number.isInteger(save.counters.eventSeq)) this.eventSeq = save.counters.eventSeq;
                this.clear();
                this.say('Game loaded.', { important: true });
                this.runStoryCatchUp();             // content that shipped after this save (after the clear, so the player sees it)
                if (this.mode === 'combat') this.showCombatState();
                else if (this.mode === 'explore' && !this.world) this.describeRoom(false);
            }, (err) => { failure = err; });
            if (failure) return { ok: false, warnings, events, attachments: null, error: { code: 'CORRUPT', message: failure.message } };
            if (reconciled.length) warnings.push({ code: 'CONTENT_UPDATED', message: `New content was added to this save: ${reconciled.join('; ')}.`, details: reconciled });
            return { ok: true, warnings, events, attachments: save.attachments == null ? null : JSON.parse(JSON.stringify(save.attachments)), game: clone(save.game) || null };
        }

        /** Pure. What in `save` this build doesn't know (it came from a newer version), as short notes; [] if nothing. */
        saveAhead(save) {
            const notes = [];
            const rev = save && save.game && save.game.revision;
            if (Number.isInteger(rev) && rev > CONTENT_REVISION) notes.push(`content release ${rev}, this game is release ${CONTENT_REVISION}`);
            const st = save && save.state;
            const data = this.storyContent && this.storyContent();
            const quests = st && isObj(st.story) && isObj(st.story.quests) ? Object.keys(st.story.quests) : [];
            const unknownQuests = data && isObj(data.quests) ? quests.filter((id) => !data.quests[id]) : [];
            if (unknownQuests.length) notes.push(`${unknownQuests.length} quest${unknownQuests.length > 1 ? 's' : ''} this version doesn't have`);
            const inv = st && isObj(st.player) && Array.isArray(st.player.inventory) ? st.player.inventory : [];
            const defs = this.data.itemDefinitions || {};
            const unknownItems = [...new Set(inv.filter((i) => typeof i === 'string' && !defs[i] && !/ \[[^\]]+\]$/.test(i)))];   // "Name [id]" is generated gear
            if (unknownItems.length) notes.push(`${unknownItems.length} item${unknownItems.length > 1 ? 's' : ''} this version doesn't have`);
            return notes;
        }

        /** Fit a restored state to the content this version ships. Returns short notes on what changed
         *  (empty for a save made by this version, which it leaves exactly as it was). */
        reconcileSave() {
            const notes = [];
            // Text-game rooms added since (a room the save has keeps its own state: items taken, enemies cleared).
            if (isObj(this.rooms) && isObj(this.data.rooms)) {
                const added = Object.keys(this.data.rooms).filter((id) => !(id in this.rooms));
                for (const id of added) this.rooms[id] = clone(this.data.rooms[id]);
                if (added.length) notes.push(`${added.length} new room${added.length > 1 ? 's' : ''}`);
            }
            // Player fields and equipment slots added since: take the defaults a new character of this class starts with.
            const p = this.player;
            const cls = p && ((this.progression && this.progression.baseClass) || p.className);
            if (isObj(p) && cls && this.data.basePlayerClasses && this.data.basePlayerClasses[cls]) {
                const fresh = new this.constructor({ seed: 1, data: this.data, storyData: this.storyData, combatMode: this.combatMode });
                fresh.createPlayer(cls);
                const fp = fresh.player;
                let n = 0;
                for (const k of Object.keys(fp)) if (!(k in p)) { p[k] = clone(fp[k]); n++; }
                if (isObj(p.equipment) && isObj(fp.equipment)) for (const slot of Object.keys(fp.equipment)) if (!(slot in p.equipment)) { p.equipment[slot] = null; n++; }
                if (isObj(p.resource) && isObj(fp.resource)) for (const k of Object.keys(fp.resource)) if (!(k in p.resource)) { p.resource[k] = fp.resource[k]; n++; }
                if (n) notes.push(`${n} new character field${n > 1 ? 's' : ''}`);
            }
            // World run flags: the lists every world rule expects.
            if (isObj(this.world)) {
                for (const k of ['collected', 'defeated']) if (!Array.isArray(this.world[k])) this.world[k] = [];
                for (const k of ['encounter', 'lastEncounter', 'lastResult']) if (!(k in this.world)) this.world[k] = null;
            }
            // The chapter: quests added since start unseen, quests that were removed are set aside, and a
            // conversation with an NPC or node that no longer exists is closed.
            const data = this.storyContent && this.storyContent();
            const st = this.story;
            if (isObj(st) && data && isObj(data.quests)) {
                for (const k of ['flags', 'seen', 'claimed']) if (!Array.isArray(st[k])) st[k] = [];
                if (!isObj(st.quests)) st.quests = {};
                // A quest set aside by an older copy of the game (a save carried back and forth) comes back as it was.
                const back = isObj(st.retiredQuests) ? Object.keys(st.retiredQuests).filter((id) => data.quests[id] && !isObj(st.quests[id])) : [];
                for (const id of back) { st.quests[id] = st.retiredQuests[id]; delete st.retiredQuests[id]; }
                if (back.length) notes.push(`${back.length} quest${back.length > 1 ? 's' : ''} restored`);
                const added = Object.keys(data.quests).filter((id) => !isObj(st.quests[id]));
                for (const id of added) st.quests[id] = { state: 'unseen', step: 0 };
                if (added.length) notes.push(`${added.length} new quest${added.length > 1 ? 's' : ''}`);
                for (const id of Object.keys(st.quests)) {
                    if (data.quests[id]) continue;
                    (st.retiredQuests || (st.retiredQuests = {}))[id] = st.quests[id];
                    delete st.quests[id];
                }
                for (const [id, q] of Object.entries(st.quests)) {
                    const objectives = data.quests[id].objectives || [];
                    if (!Number.isInteger(q.step) || q.step < 0) q.step = 0;
                    if (q.state === 'active' && objectives.length && q.step >= objectives.length) q.step = objectives.length - 1;
                }
                if (Array.isArray(st.tracked)) st.tracked = st.tracked.filter((id) => data.quests[id]);
                const d = st.dialogue;
                const npc = d && data.npcs && data.npcs[d.npcId];
                if (d && (!npc || (d.node != null && !(npc.nodes && npc.nodes[d.node])))) st.dialogue = null;
            }
            return notes;
        }

        /** Story catch-up steps (story data `catchUp`) this save predates: each runs once, if its condition holds. */
        runStoryCatchUp() {
            const data = this.storyContent && this.storyContent();
            if (!this.story || !data || !Array.isArray(data.catchUp)) return;
            for (const c of data.catchUp) {
                const key = `catchup:${c.id}`;
                if (this.story.claimed.includes(key)) continue;
                this.story.claimed.push(key);
                if (this.storyAllows(c.if)) this.applyStoryEffects(c.effects || []);
            }
        }
    }

    SaveMethods.FORMAT = FORMAT;
    SaveMethods.FORMAT_VERSION = FORMAT_VERSION;
    SaveMethods.CONTENT_REVISION = CONTENT_REVISION;
    SaveMethods.ENGINE_VERSION = ENGINE_VERSION;
    SaveMethods.cyrb53 = cyrb53;
    SaveMethods.migrateSave = migrateSave;
    SaveMethods.MIGRATIONS = MIGRATIONS;
    (ENSO.engineModules || (ENSO.engineModules = {}))['save'] = SaveMethods;
    if (isNode) module.exports = SaveMethods;
})(typeof window !== 'undefined' ? window : globalThis);
