/* =========================================================================
 * Enso's Last Stand — GAME ENGINE (core)
 *
 * The game rules. No DOM, no timers, no typing effects.
 *   const engine = new GameEngine({ seed: 42 });   // seed is optional
 *   engine.start();            -> [events]
 *   engine.input('warrior');   -> [events]
 *   engine.getState();         -> snapshot for HUDs / sprites
 *
 * An event is { type: 'clear' } or { type: 'text', text, important, html }.
 * Any front end (text UI, Phaser, terminal, test harness) just plays them.
 *
 * This file holds the class core: constructor, public API, output, state and
 * command routing. The rest of the rules live in src/engine/:
 *   exploration.js    Exploration
 *   combat.js         Combat flow
 *   combat-input.js   Player combat input
 *   skills.js         Skills & damage
 *   progression.js    Progression
 *   world.js          World intents (graphical Zone 1): pickups, encounters, run flags
 *   actions.js        Structured actions: getAvailableActions(), act() (Phase 1 spec §4)
 *   timers.js         Turn-opportunity hooks and combat timers (T-0)
 *   control.js        Player-controlled enemy turns (Possession, N-5)
 *   turn-order.js     Player-set turn order (Eternal Architect, D-09)
 *   story.js          Chapter story: quests, flags, journal, NPC dialogue, identity (CH1-01)
 *   save.js           Save/load: serialize(), load(), GameEngine.fromSave() (Phase 1 spec §5)
 *   util.js           small shared helpers (seeded RNG, clone, ...)
 * Each module is a set of GameEngine methods copied onto the prototype below.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const DATA = isNode ? require('./data.js') : ENSO.data;
    const EFFECTS = isNode ? require('./effects.js') : ENSO.effects;
    const STORY = isNode ? require('./story/chapter1.js') : (ENSO.story && ENSO.story.chapter1) || null;
    const UTIL = isNode ? require('./engine/util.js') : ENSO.engineUtil;
    const { mulberry32, clone, cap, mixin } = UTIL;
    const DIRECTIONS = { n: 'north', s: 'south', e: 'east', w: 'west' };
    // Text commands outside combat -> structured actions (Phase 1 spec §4.3). Combat text is parsed in combat-input.js.
    const TEXT_COMMANDS = {
        go: (arg) => ({ type: 'move', direction: DIRECTIONS[arg] || arg }),
        take: (arg) => ({ type: 'take', item: arg }), get: (arg) => ({ type: 'take', item: arg }),
        inventory: () => ({ type: 'describe', subject: 'inventory' }), i: () => ({ type: 'describe', subject: 'inventory' }),
        use: (arg) => ({ type: 'use_item', item: arg }),
        look: () => ({ type: 'describe', subject: 'room' }), l: () => ({ type: 'describe', subject: 'room' }),
        help: () => ({ type: 'describe', subject: 'help' }),
        quit: () => ({ type: 'quit' }),
        engage: () => ({ type: 'engage' }), fight: () => ({ type: 'engage' }),
        class_lore: () => ({ type: 'describe', subject: 'class_tree' }), cl: () => ({ type: 'describe', subject: 'class_tree' }),
        journal: () => ({ type: 'describe', subject: 'journal' }), j: () => ({ type: 'describe', subject: 'journal' }),
        talk: (arg) => ({ type: 'talk', npcId: arg }),
        // dev cheats
        add_xp: (arg) => ({ type: 'cheat', cheat: 'add_xp', amount: arg }),
        become_hollow_king: () => ({ type: 'cheat', cheat: 'become_hollow_king' }),
        unlock_events: () => ({ type: 'cheat', cheat: 'unlock_events' })
    };

    class GameEngine {
        constructor(options = {}) {
            this.data = options.data || DATA;
            this.effects = options.effects || EFFECTS.registry;
            this.storyData = options.storyData !== undefined ? options.storyData : STORY; // Chapter One content (src/story/)
            // Always seeded (spec R1, tech review F3): without a seed, pick one once and keep it, so any
            // run (including a browser playtest) can be replayed from its reported seed.
            this.seed = options.seed != null ? options.seed >>> 0 : Math.floor(Math.random() * 4294967296);
            this.rng = mulberry32(this.seed);
            this.debug = !!options.debug; // print internal errors to the console
            this.out = [];
            this.errors = [];
            this.reset();
        }

        // =====================================================================
        // Public API
        // =====================================================================
        start() {
            this.reset();
            this.clear();
            this.say("Welcome to Enso's Last Stand!", { important: true });
            this.say('To begin your journey, choose your path. Available classes:');
            for (const key in this.data.basePlayerClasses) {
                this.say(`- ${cap(key)}: ${this.data.basePlayerClasses[key].description}`);
            }
            this.say("Type the name of the class you wish to play (e.g., 'warrior', 'mage', 'rogue', 'necromancer').", { important: true });
            return this.flush();
        }

        /**
         * Every command is a transaction (QA-3): if anything throws, the game rolls back to
         * the state before the command and the player keeps control. A broken skill or bad
         * data can refuse an action, but can never soft-lock the game.
         */
        input(raw) {
            const text = String(raw || '').trim();
            if (!text) return this.flush();
            this.rejection = null;
            const events = this.transact(() => this.handle(text));
            this.rejection = null;
            return events;
        }

        /** Run one player action as a transaction and return its events (used by input() and act()). */
        transact(action, onError) {
            const snap = this.snapshot();
            try {
                action();
            } catch (err) {
                if (onError) onError(err);
                this.errors.push(err);
                this.restore(snap);
                this.out = [];
                this.say(`That didn't work — an internal error stopped it, and nothing happened. (${err.message})`, { important: true });
                if (this.mode === 'combat' && this.combat && this.combat.awaitingPlayer) this.showCombatState();
                if (this.debug && typeof console !== 'undefined') console.error(err);
            }
            return this.flush();
        }

        /** Everything a command can change. */
        snapshot() {
            const state = {
                rooms: this.rooms, currentRoom: this.currentRoom, mode: this.mode, player: this.player,
                combat: this.combat, pendingBranchChoice: this.pendingBranchChoice, flags: this.flags,
                stats: this.stats, progression: this.progression, world: this.world, story: this.story
            };
            return {
                json: JSON.stringify(state),
                rng: typeof this.rng.getState === 'function' ? this.rng.getState() : null
            };
        }

        restore(snap) {
            const s = JSON.parse(snap.json);
            Object.assign(this, s);
            if (snap.rng != null && typeof this.rng.setState === 'function') this.rng.setState(snap.rng);
            // JSON breaks shared references: re-link the turn order to the live combatant objects.
            if (this.combat) {
                const byId = new Map([this.player, ...this.combat.enemies, ...this.combat.minions].map((x) => [x.id, x]));
                this.combat.order = this.combat.order.map((x) => byId.get(x.id)).filter(Boolean);
            }
        }

        getState() {
            const p = this.player;
            const c = this.combat;
            return {
                mode: this.mode,
                room: this.currentRoom,
                progression: { ...this.progression },
                world: this.world && clone(this.world),
                story: this.storyState(),                   // undefined in the text game, so its state is unchanged
                player: p && {
                    name: p.name, className: p.className, level: p.level,
                    hp: p.hp, maxHp: p.maxHp, def: p.def, spd: p.spd,
                    strength: p.strength, intelligence: p.intelligence, agility: p.agility,
                    xp: p.xp, xpToNext: p.xpToNext,
                    resource: { ...p.resource },
                    inventory: [...p.inventory],
                    traits: clone(p.traits),
                    statusEffects: clone(p.statusEffects),
                    appearance: p.appearance,               // CH1-02 cosmetic preset (absent in the text game)
                    cr: c ? this.crValue(p) : 0,
                    isHollowKing: p.isHollowKing,
                    skills: p.skills.map((name) => this.describeSkill(name))
                },
                combat: c && {
                    round: c.round,
                    corpses: c.corpses,
                    awaitingContinue: !!c.awaitingContinue,
                    enemies: c.enemies.filter((e) => e.hp > 0).map((e) => ({ id: e.id, key: e.key, name: e.name, hp: e.hp, maxHp: e.maxHp, tier: this.tierOf(e), cr: this.crValue(e), statusEffects: clone(e.statusEffects) })),
                    minions: c.minions.filter((m) => m.hp > 0).map((m) => ({ id: m.id, name: m.name, hp: m.hp, maxHp: m.maxHp, cr: this.crValue(m) }))
                }
            };
        }

        // =====================================================================
        // Output
        // =====================================================================
        say(text, opts = {}) {
            this.out.push({ type: 'text', text: String(text), important: !!opts.important, html: !!opts.html });
        }
        clear() { this.out.push({ type: 'clear' }); }
        flush() { const events = this.out; this.out = []; return events; }

        // =====================================================================
        // State
        // =====================================================================
        reset() {
            this.rooms = clone(this.data.rooms);
            this.currentRoom = 'starting_room';
            this.mode = 'class_select'; // class_select | explore | branch_select | combat | game_over
            this.player = null;
            this.combat = null;
            this.pendingBranchChoice = false;
            this.flags = { eventsUnlocked: false };
            this.stats = { fights: 0, kills: 0, rounds: 0, credited: [] };
            this.progression = { baseClass: null, branch: null, evolutionName: null, stageIndex: -1 };
            this.world = null; // graphical world run flags (src/engine/world.js); null in the text game
            this.story = null; // Chapter One story state (src/engine/story.js); null in the text game
        }

        createPlayer(className) {
            const def = this.data.basePlayerClasses[className];
            const s = def.baseStats;
            this.player = {
                id: 'player', isPlayer: true, isMinion: false,
                name: def.name, className,
                hp: s.hp, maxHp: s.hp, originalMaxHp: s.hp,
                strength: s.strength, intelligence: s.intelligence, agility: s.agility, spd: s.agility,
                baseDamageMin: s.baseDamageMin, baseDamageMax: s.baseDamageMax,
                def: s.def, critChance: s.critChance, critMultiplier: s.critMultiplier,
                level: 1, xp: 0, xpToNext: 100,
                resource: { type: def.startingResource.type, current: def.startingResource.initial, max: def.startingResource.max, regen: def.startingResource.regen || 0 },
                inventory: [...def.startingItems],
                gold: 0, equipment: { mainHand: null, bodyArmor: null, accessory: null },
                skills: [...def.startingSkills],
                traits: clone(def.startingTraits),
                statusEffects: [],
                isHollowKing: false
            };
            this.progression = { baseClass: className, branch: null, evolutionName: def.name, stageIndex: -1 };
        }

        // =====================================================================
        // Command routing
        // =====================================================================
        handle(text) {
            const lower = text.toLowerCase();

            // A text translator onto the action rules (src/engine/actions.js): parse, then perform().
            if (lower === 'start') { this.perform({ type: 'restart' }); return; }
            if (this.mode === 'combat') { this.combatCommand(text); return; }
            if (this.story && this.story.dialogue) {     // a conversation: '2' picks a choice, 'bye' is a normal goodbye
                this.clear();
                this.say(`> ${text}`);
                const n = parseInt(lower, 10);
                const choices = this.dialogueChoices();
                if (/^(bye|leave|goodbye|exit)$/.test(lower)) this.perform({ type: 'dialogue_leave' });
                else if (String(n) === lower && n >= 1 && n <= choices.length) this.perform({ type: 'dialogue_choice', choiceId: choices[n - 1].choiceId });
                else if (/^(journal|j)$/.test(lower)) this.perform({ type: 'describe', subject: 'journal' });
                else { this.refuse('INVALID_CHOICE', `Type a number from 1 to ${choices.length}, or 'bye'.`); this.showDialogueChoices(); }
                return;
            }
            if (this.mode === 'game_over' || this.mode === 'won') { this.perform({ type: 'describe' }); return; }

            this.clear();
            this.say(`> ${text}`);

            if (this.mode === 'class_select') { this.perform({ type: 'choose_class', classId: lower }); return; }
            if (this.mode === 'branch_select') { this.perform({ type: 'choose_branch', branchId: lower }); return; }

            // Chapter One equipment and commerce text commands share the same
            // authoritative rules as UI act(), without requiring an NPC UI.
            const trade = /^(equip|unequip|compare|buy|sell)\s+(.+)$/i.exec(text.trim());
            if (trade) {
                const command = trade[1].toLowerCase(), value = trade[2].trim();
                if (command === 'equip') this.perform({ type: 'equip', item: value });
                else if (command === 'unequip') this.perform({ type: 'unequip', slot: value });
                else if (command === 'compare') this.perform({ type: 'compare_item', item: value });
                else {
                    const space = value.indexOf(' ');
                    if (space === -1) this.refuse('INVALID_TRADE', 'Enter merchant ID and item name.');
                    else this.perform({ type: command, shopId: value.slice(0, space), item: value.slice(space + 1) });
                }
                return;
            }

            const home = /^(build|plant|tend|harvest|craft)\s+(.+)$/i.exec(text.trim());
            if (home) {
                const command = home[1].toLowerCase(), value = home[2].trim();
                if (command === 'build') this.perform({ type: 'build', upgradeId: value });
                else if (command === 'craft') this.perform({ type: 'craft', recipeId: value });
                else if (command === 'tend' || command === 'harvest')
                    this.perform({ type: command, plotId: value });
                else {
                    const space = value.indexOf(' ');
                    if (space === -1) this.refuse('INVALID_PLANT','Enter a plot ID and seed name.');
                    else this.perform({ type: 'plant', plotId: value.slice(0, space), seed: value.slice(space + 1) });
                }
                return;
            }
            const parts = lower.split(/\s+/);
            let cmd = parts[0];
            let arg = parts.slice(1).join(' ');
            if (DIRECTIONS[cmd] || Object.values(DIRECTIONS).includes(cmd)) { arg = cmd; cmd = 'go'; }

            if (cmd === 'name') { this.perform({ type: 'set_identity', name: text.trim().slice(4) }); return; } // keep the player's capitals
            const build = Object.prototype.hasOwnProperty.call(TEXT_COMMANDS, cmd) ? TEXT_COMMANDS[cmd] : null;
            if (!build) { this.say("I don't understand that command. Type 'help' for a list."); return; }
            this.perform(build(arg));
        }

        chooseClass(name) {
            if (!this.data.basePlayerClasses[name]) {
                this.refuse('INVALID_CLASS', 'That is not a valid class. Please choose again.');
                return;
            }
            this.createPlayer(name);
            this.mode = 'explore';
            this.say(`You have chosen to be a ${name}!`, { important: true });
            this.describeRoom(false);
        }

        showHelp() {
            this.say('Commands: go <dir> (or n/s/e/w), take <item>, use <item>, inventory (i), look, engage, class_lore (cl), quit, start', { important: true });
            this.say('Combat: attack <n>, <skill name or alias> <n>, use <item>, flee');
            this.say('Dev cheats: add_xp <amount>, become_hollow_king, unlock_events');
        }
    }

    // Behaviour modules (src/engine/*.js). In the browser they are loaded by
    // <script> tags before this file; in Node they are required here.
    const MODULES = ['exploration', 'combat', 'combat-input', 'skills', 'progression', 'world', 'actions', 'timers', 'control', 'turn-order', 'story', 'save'];
    for (const name of MODULES) {
        const Module = isNode ? require(`./engine/${name}.js`) : (ENSO.engineModules || {})[name];
        mixin(GameEngine, Module, name);
    }

    const installStatusSystem = isNode ? require('./statuses.js') : ENSO.installStatusSystem;
    installStatusSystem(GameEngine);

    /** A new engine with `save` loaded (spec §5.1). Throws if the save can't be loaded; use load() to inspect why. */
    GameEngine.fromSave = function (save, options = {}) {
        const g = new GameEngine({ ...options, seed: save && save.rng ? save.rng.seed : options.seed });
        const r = g.load(save, options);
        if (!r.ok) throw new Error(`Can't load save: ${r.error.code}: ${r.error.message}`);
        g.lastLoad = r;
        return g;
    };

    ENSO.GameEngine = GameEngine;
    if (isNode) module.exports = { GameEngine, mulberry32 };
})(typeof window !== 'undefined' ? window : globalThis);
