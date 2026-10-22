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
 *   util.js           small shared helpers (seeded RNG, clone, ...)
 * Each module is a set of GameEngine methods copied onto the prototype below.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const DATA = isNode ? require('./data.js') : ENSO.data;
    const EFFECTS = isNode ? require('./effects.js') : ENSO.effects;
    const UTIL = isNode ? require('./engine/util.js') : ENSO.engineUtil;
    const { mulberry32, clone, cap, mixin } = UTIL;
    const DIRECTIONS = { n: 'north', s: 'south', e: 'east', w: 'west' };

    class GameEngine {
        constructor(options = {}) {
            this.data = options.data || DATA;
            this.effects = options.effects || EFFECTS.registry;
            this.rng = options.seed != null ? mulberry32(options.seed) : Math.random;
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
            const snap = this.snapshot();
            try {
                this.handle(text);
            } catch (err) {
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
                stats: this.stats, progression: this.progression
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
                player: p && {
                    name: p.name, className: p.className, level: p.level,
                    hp: p.hp, maxHp: p.maxHp, def: p.def, spd: p.spd,
                    strength: p.strength, intelligence: p.intelligence, agility: p.agility,
                    xp: p.xp, xpToNext: p.xpToNext,
                    resource: { ...p.resource },
                    inventory: [...p.inventory],
                    traits: clone(p.traits),
                    statusEffects: clone(p.statusEffects),
                    isHollowKing: p.isHollowKing,
                    skills: p.skills.map((name) => this.describeSkill(name))
                },
                combat: c && {
                    round: c.round,
                    corpses: c.corpses,
                    enemies: c.enemies.filter((e) => e.hp > 0).map((e) => ({ id: e.id, key: e.key, name: e.name, hp: e.hp, maxHp: e.maxHp, tier: this.tierOf(e), cr: e.cr ? { ...e.cr } : null, statusEffects: clone(e.statusEffects) })),
                    minions: c.minions.filter((m) => m.hp > 0).map((m) => ({ id: m.id, name: m.name, hp: m.hp, maxHp: m.maxHp }))
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

            if (lower === 'start') { this.out.push(...this.start()); return; }
            if (this.mode === 'combat') { this.combatCommand(text); return; }
            if (this.mode === 'game_over' || this.mode === 'won') { this.say("The game is over. Type 'start' to play again.", { important: true }); return; }

            this.clear();
            this.say(`> ${text}`);

            if (this.mode === 'class_select') { this.chooseClass(lower); return; }
            if (this.mode === 'branch_select') { this.chooseBranch(lower); return; }

            const parts = lower.split(/\s+/);
            let cmd = parts[0];
            let arg = parts.slice(1).join(' ');
            if (DIRECTIONS[cmd] || Object.values(DIRECTIONS).includes(cmd)) { arg = cmd; cmd = 'go'; }

            switch (cmd) {
                case 'go': this.move(DIRECTIONS[arg] || arg); break;
                case 'take': case 'get': this.takeItem(arg); break;
                case 'inventory': case 'i': this.showInventory(); break;
                case 'use': this.useItem(arg); break;
                case 'look': case 'l': this.describeRoom(); break;
                case 'help': this.showHelp(); break;
                case 'quit': this.mode = 'game_over'; this.say('Thanks for playing! Type \'start\' to play again.', { important: true }); break;
                case 'engage': case 'fight': this.engage(); break;
                case 'class_lore': case 'cl': this.showClassTree(); break;
                // --- dev cheats ---
                case 'add_xp': this.addExperience(parseInt(arg, 10) || 50); this.maybePromptBranch(); break;
                case 'become_hollow_king': this.becomeHollowKing(); break;
                case 'unlock_events': this.flags.eventsUnlocked = true; this.say('[cheat] Story-event evolutions unlocked.'); this.applyStages(); break;
                default: this.say("I don't understand that command. Type 'help' for a list."); break;
            }
        }

        chooseClass(name) {
            if (!this.data.basePlayerClasses[name]) {
                this.say('That is not a valid class. Please choose again.');
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
    const MODULES = ['exploration', 'combat', 'combat-input', 'skills', 'progression'];
    for (const name of MODULES) {
        const Module = isNode ? require(`./engine/${name}.js`) : (ENSO.engineModules || {})[name];
        mixin(GameEngine, Module, name);
    }

    const installStatusSystem = isNode ? require('./statuses.js') : ENSO.installStatusSystem;
    installStatusSystem(GameEngine);

    ENSO.GameEngine = GameEngine;
    if (isNode) module.exports = { GameEngine, mulberry32 };
})(typeof window !== 'undefined' ? window : globalThis);
