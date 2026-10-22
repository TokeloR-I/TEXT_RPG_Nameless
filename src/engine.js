/* =========================================================================
 * Enso's Last Stand — GAME ENGINE
 *
 * All game rules live here. No DOM, no timers, no typing effects.
 *   const engine = new GameEngine({ seed: 42 });   // seed is optional
 *   engine.start();            -> [events]
 *   engine.input('warrior');   -> [events]
 *   engine.getState();         -> snapshot for HUDs / sprites
 *
 * An event is { type: 'clear' } or { type: 'text', text, important, html }.
 * Any front end (text UI, Phaser, terminal, test harness) just plays them.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const DATA = isNode ? require('./data.js') : ENSO.data;
    const EFFECTS = isNode ? require('./effects.js') : ENSO.effects;

    // ---------- small helpers ----------
    function mulberry32(seed) {
        let a = seed >>> 0;
        const rng = function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        // Snapshot support, so a rolled-back command doesn't shift seeded runs.
        rng.getState = () => a;
        rng.setState = (v) => { a = v; };
        return rng;
    }
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const pretty = (key) => key.replace(/_/g, ' ');
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

        // =====================================================================
        // Exploration
        // =====================================================================
        describeRoom(clearFirst = true) {
            const room = this.rooms[this.currentRoom];
            if (clearFirst) this.clear();
            this.say(`--- ${pretty(this.currentRoom).toUpperCase()} ---`, { important: true });
            this.say(room.description);
            this.say('What do you do?');

            const exits = Object.keys(room.exits);
            if (exits.length) {
                this.say('-- Exits --', { important: true });
                for (const dir of exits) this.say(`👣 Go ${dir}`);
            }
            if (room.enemies.length) {
                this.say('-- Enemies Present --', { important: true });
                for (const key of room.enemies) {
                    const e = this.data.enemies[key];
                    if (e) this.say(`Beware! ${cap(this.withArticle(e))} lurks here.`);
                }
                this.say('⚔️ Engage (start combat)');
            }
            if (room.items.length) {
                this.say('-- Items here --', { important: true });
                for (const item of room.items) this.say(`✋ Take ${item}`);
            }
        }

        move(direction) {
            const next = this.rooms[this.currentRoom].exits[direction];
            if (!next) { this.say("You can't go that way."); return; }
            this.currentRoom = next;
            this.say(`You move to the ${direction}.`);
            this.describeRoom(false);
        }

        takeItem(name) {
            const room = this.rooms[this.currentRoom];
            const idx = room.items.findIndex((i) => i.toLowerCase() === name.toLowerCase());
            if (idx === -1) { this.say(`You don't see a '${name}' here.`); return; }
            const generic = room.items.splice(idx, 1)[0];
            const swap = this.data.adaptiveLoot[generic];
            const received = (swap && swap[this.player.className]) || generic;
            this.player.inventory.push(received);
            this.say(`You pick up the ${received}.`);
        }

        findInventoryItem(name) {
            const lower = name.trim().toLowerCase();
            return this.player.inventory.find((i) => i.toLowerCase() === lower)
                || this.player.inventory.find((i) => i.toLowerCase().startsWith(lower)) || null;
        }

        /** Applies an item. Returns true if it was used up. */
        applyItem(item) {
            const def = this.data.itemDefinitions[item];
            const p = this.player;
            if (!def) { this.say(`You turn the ${item} over in your hands. There's nothing to use it for (yet).`); return false; }
            if (def.use === 'heal') {
                if (p.hp >= p.maxHp) { this.say("You're already at full health."); return false; }
                const healed = this.heal(p, def.value);
                this.say(`You use the ${item}. +${healed} HP (${p.hp}/${p.maxHp}).`, { important: true });
            }
            p.inventory.splice(p.inventory.indexOf(item), 1);
            return true;
        }

        useItem(name) {
            if (!name) { this.say('Use what? (e.g. use bandages)'); return; }
            const item = this.findInventoryItem(name);
            if (!item) { this.say(`You don't have a '${name}'.`); return; }
            this.applyItem(item);
        }

        showInventory() {
            const inv = this.player.inventory;
            if (!inv.length) { this.say('Your inventory is empty.'); return; }
            this.say('--- Inventory ---', { important: true });
            for (const item of inv) {
                const def = this.data.itemDefinitions[item];
                this.say(`- ${item}${def ? ` — ${def.description} (use: ${def.use} ${def.value})` : ''}`);
            }
        }

        engage() {
            const keys = this.rooms[this.currentRoom].enemies;
            if (!keys.length) { this.say('There are no enemies here.'); return; }
            this.startCombat(keys);
        }

        // =====================================================================
        // Combat flow
        // =====================================================================
        startCombat(enemyKeys) {
            this.say('--- COMBAT INITIATED! ---', { important: true });
            const enemies = enemyKeys.map((key, i) => {
                const e = clone(this.data.enemies[key]);
                Object.assign(e, { id: `enemy_${i}`, key, entityKey: `${this.currentRoom}#${i}`, isPlayer: false, isMinion: false, statusEffects: [], lastSkillUsed: null });
                return e;
            });
            this.combat = {
                enemies, minions: [], order: [], idx: 0, round: 0, corpses: 0,
                dealtDamageThisRound: false, playerActedThisRound: false, markedEnemyHitThisRound: false,
                usedOncePerFight: {}, awaitingPlayer: false, nextMinionId: 1,
                traps: [], delayed: [], extraTurn: false, hpHistory: []
            };
            this.player.statusEffects = [];
            this.mode = 'combat';
            const rule = this.resourceRule();
            if (rule.startOfFight != null) {
                const r = this.player.resource;
                r.current = Math.min(r.max, rule.startOfFight);
                this.say(`(${r.type}: ${r.current}/${r.max} to start the fight)`);
            }

            for (const e of enemies) this.say(`${cap(this.withArticle(e))} appears! (HP: ${e.hp})`);
            this.newRound();
            this.say('--- Battle Order ---', { important: true });
            for (const c of this.combat.order) this.say(`${c.name} (SPD: ${this.speedOf(c)})`);
            this.advance();
        }

        /** "a Rust Rat", "an Acolyte", but "The Crow-Touched Warden" / "James Newton" (QA-7). */
        withArticle(e) {
            if (e.properName || /^the\s/i.test(e.name)) return e.name;
            return `${/^[aeiou]/i.test(e.name) ? 'an' : 'a'} ${e.name}`;
        }

        alive(list) { return list.filter((c) => c.hp > 0 && !c.erased); }

        newRound() {
            const c = this.combat;
            c.round++;
            c.idx = 0;
            c.playerActedThisRound = false;
            c.freeMarkUsedThisRound = false;
            c.order = [this.player, ...this.alive(c.enemies), ...this.alive(c.minions)]
                .sort((a, b) => this.speedOf(b) - this.speedOf(a));
        }

        /** Effective speed this round ([Pin] slows). */
        speedOf(c) {
            let spd = c.spd;
            for (const st of c.statusEffects) {
                if (st.name === 'Pin' || st.type === 'slow') spd *= 1 - Math.min(0.9, this.intensity(st));
            }
            return Math.max(1, Math.floor(spd));
        }

        endRound() {
            const c = this.combat;
            const p = this.player;
            this.say('--- End of Round ---', { important: true });
            if (p.className === 'necromancer' && !p.isHollowKing && c.dealtDamageThisRound) {
                if (this.gainResource(p, 1) > 0) this.say('You gained 1 Soul Energy!');
            }
            if (p.resource.regen > 0) {
                const g = this.gainResource(p, p.resource.regen);
                if (g > 0) this.say(`You regenerate ${g} ${p.resource.type}.`);
            }
            const rule = this.resourceRule();
            if (rule.onMarkedHitRound && c.markedEnemyHitThisRound) {
                if (this.gainResource(p, rule.onMarkedHitRound) > 0) this.say(`A marked foe bleeds. Your ${p.resource.type} grows (+${rule.onMarkedHitRound}).`);
            }
            c.dealtDamageThisRound = false;
            c.markedEnemyHitThisRound = false;
            this.tickStatusesEndOfRound(); // round-based durations (approved rule 11)
        }

        /** Runs NPC turns until the player must act or the fight ends. */
        advance() {
            const c = this.combat;
            let safety = 0;
            while (this.mode === 'combat') {
                if (++safety > 2000) throw new Error('Combat loop ran away (no one can act?)');
                if (this.checkBattleEnd()) return;
                if (c.idx >= c.order.length) { this.endRound(); this.newRound(); continue; }

                const actor = c.order[c.idx];
                if (actor.hp <= 0 || actor.erased) { c.idx++; continue; }

                if (this.startTurn(actor)) {
                    if (actor.hp > 0 && actor.isPlayer) {
                        // QA-5: pause on the player's skipped turn instead of simulating on by itself.
                        // Each command now runs at most ~one round, so a stun-lock can't run away.
                        if (this.checkBattleEnd()) return;
                        c.awaitingPlayer = true;
                        c.awaitingContinue = true;
                        this.say(`${actor.name} is unable to act this turn!`, { important: true });
                        this.say('(Type anything to continue.)');
                        return;
                    }
                    if (actor.hp > 0) this.say(`${actor.name} is unable to act this turn!`);
                    c.idx++;
                    continue;
                }
                if (actor.isPlayer) {
                    c.hpHistory.push(actor.hp);
                    this.detonateBombs();
                    if (this.checkBattleEnd()) return;
                    c.awaitingPlayer = true;
                    this.say('--- Your Turn! ---', { important: true });
                    this.showCombatState();
                    return;
                }
                this.say(`--- ${actor.name}'s Turn! ---`, { important: true });
                if (actor.isMinion) this.minionTurn(actor); else this.enemyTurn(actor);
                c.idx++;
            }
        }

        /** Start of a turn: traps, DoT ticks, statuses become effective. Returns true if the turn is skipped.
         *  Durations are NOT reduced here — they tick once per completed round (see statuses.js). */
        startTurn(actor) {
            if (!actor.isPlayer && !actor.isMinion) this.springTrap(actor);
            this.tickDots(actor);
            if (actor.hp <= 0) return true;
            this.armStatuses(actor);
            return actor.statusEffects.some((s) => s.type === 'skip_turn');
        }

        resourceRule() { return (this.data.resourceRules || {})[this.player.resource.type] || {}; }

        resourceEvent(event, amount = 1, label = '') {
            const rule = this.resourceRule()[event];
            if (!rule) return;
            const g = this.gainResource(this.player, rule * amount);
            if (g > 0) this.say(`+${g} ${this.player.resource.type}${label ? ` (${label})` : ''}.`);
        }

        springTrap(enemy) {
            const c = this.combat;
            const trap = c.traps.shift();
            if (!trap) return;
            this.say(`${enemy.name} steps on your ${trap.name}!`, { important: true });
            this.applyDot(this.player, enemy, { name: trap.dot.charAt(0).toUpperCase() + trap.dot.slice(1), value: trap.value, duration: trap.duration });
        }

        detonateBombs() {
            const c = this.combat;
            const ready = c.delayed.filter((b) => --b.turns <= 0);
            c.delayed = c.delayed.filter((b) => b.turns > 0);
            for (const bomb of ready) {
                this.say(`💥 Your ${bomb.skill.name} explodes!`, { important: true });
                for (const t of this.alive(c.enemies)) {
                    const hit = this.newHit(t);
                    this.rollDamage(this.player, t, bomb.skill, hit);
                    this.say(`${t.name} takes ${hit.damage} damage!${hit.isCrit ? ' (CRITICAL HIT!)' : ''}`);
                    this.damage(t, hit.damage, this.player);
                }
            }
        }

        findCombatant(id) {
            if (id === 'player') return this.player;
            const c = this.combat;
            return c ? [...c.enemies, ...c.minions].find((x) => x.id === id) || null : null;
        }

        // ---------- marks ----------
        applyMark(source, target, effect) {
            const inst = this.applyStatus(source, target, { name: effect.mark, type: 'mark', value: effect.value, duration: effect.duration });
            if (inst) this.say(`${target.name} is marked: [${effect.mark}]${effect.duration ? ` for ${effect.duration} turn${effect.duration > 1 ? 's' : ''}` : ''}.`);
            return inst;
        }

        hasTrait(name) {
            const norm = (x) => x.replace(/[’‘]/g, "'").toLowerCase();
            return this.player.traits.some((t) => norm(t.name) === norm(name));
        }

        isPlayerSide(c) { return !!c && (c.isPlayer || c.isMinion); }

        /** Damage multipliers from marks and mark-related traits. */
        markModifiers(attacker, target, hit) {
            let mult = 1;
            for (const m of this.marksOn(target)) {
                if (m.name === 'Expose') mult *= 1 + this.intensity(m);
                if (m.name === 'Marked for Death') { mult *= 1 + this.intensity(m); hit.consumeMarks.push(m); }
            }
            for (const m of this.marksOn(attacker)) {
                if (m.name === 'Weaken') mult *= 1 - Math.min(0.9, this.intensity(m));
            }
            if (this.isPlayerSide(attacker) && this.marksOn(target).length && this.hasTrait('Synergy Marks')) mult *= 1.1;
            return mult;
        }

        checkBattleEnd() {
            const c = this.combat;
            const p = this.player;

            if (p.hp <= 0) {
                if (this.tryCrownOfTheUndying()) return false;
                this.say('--- DEFEAT! ---', { important: true });
                this.say("You have been defeated! Game Over. Type 'start' to play again.");
                this.mode = 'game_over';
                this.combat = null;
                return true;
            }
            if (this.alive(c.enemies).length === 0) {
                const rules = this.data.gameRules;
                const xp = c.enemies.reduce((sum, e) => sum + (e.xp != null ? e.xp : rules.defaultEnemyXp), 0);
                this.say('--- VICTORY! ---', { important: true });
                this.mode = 'explore';
                this.combat = null;
                this.stats.fights++;
                this.stats.rounds += c.round;
                p.statusEffects = [];
                const room = this.rooms[this.currentRoom];
                room.enemies = [];
                const healed = this.heal(p, Math.floor(p.maxHp * rules.postFightHealPct));
                if (healed > 0) this.say(`You catch your breath. +${healed} HP (${p.hp}/${p.maxHp}).`);
                this.say(`You defeated all enemies and gained ${xp} XP!`);
                this.addExperience(xp, { quiet: true });
                if (room.onClear && room.onClear.type === 'win') { this.win(room.onClear); return true; }
                this.say('');
                this.describeRoom(false);
                this.maybePromptBranch();
                return true;
            }
            return false;
        }

        win(ending) {
            const p = this.player;
            this.mode = 'won';
            this.pendingBranchChoice = false;
            this.say('');
            for (const line of ending.text.split('\n')) this.say(line, { important: true });
            this.say('');
            this.say('=== YOU ESCAPED THE CELLAR ===', { important: true });
            this.say(`${p.name} — Level ${p.level} ${this.progression.evolutionName}`);
            this.say(`Fights won: ${this.stats.fights} · Enemies slain: ${this.stats.kills} · Rounds fought: ${this.stats.rounds}`);
            this.say("Thanks for playing! Type 'start' to play again.");
        }

        tryCrownOfTheUndying() {
            const p = this.player;
            if (!p.isHollowKing || !p.traits.some((t) => t.name === 'Crown of the Undying')) return false;
            const newMax = Math.floor(p.maxHp * 0.9);
            if (newMax < p.originalMaxHp * 0.25) return false;
            p.maxHp = newMax;
            p.hp = Math.floor(p.maxHp * 0.3);
            p.dead = false;
            p.resource.current = 0;
            this.say('Your form dissolves into nothingness... but the crown remains.', { important: true });
            this.say(`Silence reigns, and from it, you are remade. (Max HP is now ${p.maxHp}.)`, { important: true });
            return true;
        }

        enemyTurn(enemy) {
            const c = this.combat;
            const taunter = this.alive(c.minions).find((m) => m.statusEffects.some((s) => s.type === 'taunt'));
            const target = taunter || this.player;
            let skill = enemy.skills.length
                ? enemy.skills[Math.floor(this.rng() * enemy.skills.length)]
                : this.data.skillDefinitions['Basic Attack'];
            if (this.statusOfType(enemy, 'silence')) {
                skill = this.data.skillDefinitions['Basic Attack'];
                this.say(`${enemy.name} is silenced and can only flail.`);
            }
            enemy.lastSkillUsed = skill.name;
            this.castSkill(enemy, skill, [target]);
        }

        minionTurn(minion) {
            const target = this.alive(this.combat.enemies)[0];
            if (!target) { this.say(`${minion.name} has no target to attack.`); return; }
            this.castSkill(minion, minion.skills[0], [target]);
        }

        /** Before a hit lands: the attacker's Blind and the target's dodge buffs. Returns false if the hit misses. */
        hitConnects(attacker, target) {
            const blind = this.statusOfType(attacker, 'blind');
            if (blind && this.rng() < this.intensity(blind)) {
                this.say(`${attacker.name} swings blindly and misses ${target.name}!`);
                return false;
            }
            const dodge = this.statusOfType(target, 'dodge');
            if (dodge) {
                this.removeStatus(target, dodge);
                if (this.rng() < dodge.value) {
                    this.say(`${attacker.name} attacks — but ${target.name} ${dodge.name === 'Mirror Image' ? 'was an illusion' : 'dodges'}! (${dodge.name})`, { important: true });
                    if (target.isPlayer) this.resourceEvent('onDodge', 1, 'dodge');
                    this.counterAttack(target, attacker);
                    return false;
                }
                this.say(`(${dodge.name} fails — ${attacker.name} connects.)`);
            }
            // A missed attack never consumes an absorb. A connecting attack does,
            // even if another defense would have reduced its damage.
            const absorb = this.statusOfType(target, 'absorb');
            if (absorb) {
                this.removeStatus(target, absorb);
                this.say(`${target.name}'s ${absorb.name} absorbs ${attacker.name}'s hit entirely!`, { important: true });
                return false;
            }
            return true;
        }

        /** Riposte (any holder): answer the attacker with your basic attack, boosted. */
        counterAttack(holder, attacker) {
            const counter = this.statusOfType(holder, 'counter');
            if (!counter || attacker.hp <= 0 || holder.hp <= 0) return;
            this.removeStatus(holder, counter);
            const skill = holder.isPlayer ? this.playerSkill(this.basicAttackName()) : (holder.skills && holder.skills[0]) || this.data.skillDefinitions['Basic Attack'];
            const hit = this.newHit(attacker);
            this.rollDamage(holder, attacker, skill, hit);
            hit.damage = Math.floor(hit.damage * (1 + counter.value));
            this.say(`Riposte! ${holder.name} counters ${attacker.name} for ${hit.damage} damage!${hit.isCrit ? ' (CRITICAL HIT!)' : ''}`, { important: true });
            this.damage(attacker, hit.damage, holder);
        }

        // =====================================================================
        // Player combat input
        // =====================================================================
        combatCommand(raw) {
            const c = this.combat;
            const p = this.player;
            this.clear();
            this.say(`> ${raw}`);

            if (!c.awaitingPlayer) { this.say('Not your turn!'); return; }
            if (c.awaitingContinue) {
                // The player's turn was skipped (stun etc.): any input just moves on.
                c.awaitingContinue = false;
                c.awaitingPlayer = false;
                c.idx++;
                this.advance();
                return;
            }

            const { command, targetNum } = this.parseCombatInput(raw);

            if (command === 'use' || command.startsWith('use ')) {
                const name = command.slice(3).trim();
                const item = name && this.findInventoryItem(name);
                if (!item) { this.combatError(name ? `You don't have a '${name}'.` : 'Use what? (e.g. use bandages)', null); return; }
                c.awaitingPlayer = false;
                if (!this.applyItem(item)) { c.awaitingPlayer = true; this.showCombatState(); return; }
                c.playerActedThisRound = true;
                c.idx++;
                this.advance();
                return;
            }

            if (command === 'flee') {
                this.mode = 'explore';
                this.combat = null;
                p.statusEffects = [];
                this.say('You fled!');
                this.describeRoom(false);
                return;
            }

            const skillName = command === 'attack' ? this.basicAttackName() : this.resolveSkillName(command);
            if (!skillName || (!p.skills.includes(skillName) && skillName !== this.basicAttackName())) {
                this.combatError(skillName ? `You don't know the skill '${skillName}'.` : `Unknown combat command '${command}'.`, command);
                return;
            }
            const skill = this.playerSkill(skillName);

            if (this.statusOfType(p, 'silence') && skillName !== this.basicAttackName()) {
                this.combatError(`You are silenced — only your basic attack works this turn.`, null);
                return;
            }
            if (!this.isCastable(skill)) {
                this.combatError(`${skillName} isn't implemented yet (missing: ${this.missingEffects(skill).join(', ')}).`, null);
                return;
            }
            if (skill.oncePerFight && c.usedOncePerFight[skillName]) {
                this.combatError(`${skillName} can only be used once per fight!`, null);
                return;
            }
            const cost = this.skillCost(skill);
            if (p.resource.current < cost) {
                this.combatError(`Not enough ${p.resource.type}! (${skillName} needs ${cost}, you have ${p.resource.current})`, null);
                return;
            }

            const targets = this.pickTargets(skill, targetNum);
            if (!targets) {
                const living = this.alive(c.enemies);
                this.combatError(`Invalid target '${targetNum || 'none specified'}'. Valid targets: ${living.map((e, i) => i + 1).join(', ')}. Example: '${command} 1'`, null);
                return;
            }
            for (const effect of skill.effects || []) {
                const h = this.effects[effect.type];
                const problem = h && h.requires && h.requires({ engine: this, caster: p, targets, skill, effect });
                if (problem) { this.combatError(problem, null); return; }
            }

            if (cost > 0) {
                p.resource.current -= cost;
                this.say(`Used ${cost} ${p.resource.type}.`);
            }
            if (skill.oncePerFight) c.usedOncePerFight[skillName] = true;
            if (this.isMarkSkill(skill) && this.hasTrait('Hunter\'s Instinct') && !c.freeMarkUsedThisRound && skill.cost !== 'all') {
                c.freeMarkUsedThisRound = true;
                if (skill.cost) this.say("Hunter's Instinct: your first mark this turn is free.");
            }

            c.awaitingPlayer = false;
            const isBasic = command === 'attack' || skillName === this.basicAttackName();
            this.castSkill(p, skill, targets);
            if (isBasic) {
                this.resourceEvent('onBasicAttack', 1, 'combo');
                if (this.hasTrait('Virulent Touch')) for (const t of targets) if (t.hp > 0 && !t.isPlayer) this.infect(p, t, 1);
            }
            c.playerActedThisRound = true;
            if (this.mode === 'combat' && c.extraTurn && !this.checkBattleEnd()) {
                c.extraTurn = false;
                c.awaitingPlayer = true;
                this.say('--- You act again! ---', { important: true });
                this.showCombatState();
                return;
            }
            c.extraTurn = false;
            c.idx++;
            this.advance();
        }

        combatError(message, attempted) {
            this.say(`Error: ${message}`, { important: true });
            if (attempted) {
                const suggestions = this.findSimilarSkills(attempted);
                if (suggestions.length) this.say(`Did you mean: ${suggestions.join(', ')}?`);
            }
            this.showCombatState();
        }

        parseCombatInput(raw) {
            const cleaned = raw.toLowerCase().replace(/[’‘]/g, "'").trim().replace(/\s+/g, ' ');
            const m = cleaned.match(/^(.+?)\s*[#@]?(\d+)$/);
            return m ? { command: m[1].trim(), targetNum: parseInt(m[2], 10) } : { command: cleaned, targetNum: null };
        }

        /** Skill definition as the player uses it (Basic Attack uses the class's own damage range). */
        playerSkill(name) {
            const def = this.data.skillDefinitions[name];
            const p = this.player;
            if (name === 'Basic Attack' && p.baseDamageMin != null) return { ...def, base_damage: [p.baseDamageMin, p.baseDamageMax] };
            return def;
        }

        isMarkSkill(skill) { return (skill.effects || []).some((e) => e.type === 'apply_mark'); }

        /** What a skill costs right now (Hunter's Instinct makes the first mark each turn free). */
        skillCost(skill) {
            const p = this.player;
            if (skill.cost === 'all') return p.resource.current;
            const c = this.combat;
            if (c && this.isMarkSkill(skill) && this.hasTrait('Hunter\'s Instinct') && !c.freeMarkUsedThisRound) return 0;
            return skill.cost || 0;
        }

        /** 'attack' = your class's first skill if it's free, otherwise the universal free Basic Attack.
         *  (A basic attack must never cost resource, or resource-starved builds get stuck.) */
        basicAttackName() {
            if (this.player.isHollowKing) return 'Void Rend';
            const first = this.data.basePlayerClasses[this.player.className].startingSkills[0];
            const def = this.data.skillDefinitions[first];
            return def && !def.cost ? first : 'Basic Attack';
        }

        resolveSkillName(input) {
            const lower = input.toLowerCase().replace(/[’‘]/g, "'");
            if (this.data.skillAliases[lower]) return this.data.skillAliases[lower];
            for (const name in this.data.skillDefinitions) {
                if (name.toLowerCase().replace(/[’‘]/g, "'") === lower) return name;
            }
            return null;
        }

        findSimilarSkills(input) {
            const lower = input.toLowerCase();
            const known = this.player.skills;
            const starts = known.filter((s) => s.toLowerCase().startsWith(lower));
            const contains = known.filter((s) => s.toLowerCase().includes(lower) && !starts.includes(s));
            return [...starts, ...contains].slice(0, 3);
        }

        pickTargets(skill, targetNum) {
            const living = this.alive(this.combat.enemies);
            const kind = skill.target || 'enemy_single';
            if (kind === 'self' || kind === 'minions' || kind === 'ground') return [this.player];
            if (kind === 'ally_single' && !skill.base_damage) return [this.player];
            if (kind === 'corpse') return living; // Corpse Bloom: the blast hits everyone
            if (kind === 'enemy_aoe' || kind === 'all_enemies' || kind === 'all_combatants') return living;
            // Everything else needs one enemy (ally/corpse/ground targeting isn't modelled yet).
            if (targetNum == null) return living.length === 1 ? [living[0]] : null;
            return targetNum >= 1 && targetNum <= living.length ? [living[targetNum - 1]] : null;
        }

        showCombatState() {
            const c = this.combat;
            this.say('--- Enemies ---', { important: true });
            this.alive(c.enemies).forEach((e, i) => this.say(`${i + 1}. ${e.name} (${e.hp}/${e.maxHp} HP)${this.statusTag(e)}`));
            const minions = this.alive(c.minions);
            if (minions.length) {
                this.say('--- Your Minions ---', { important: true });
                minions.forEach((m) => this.say(`${m.name} (${m.hp}/${m.maxHp} HP)${this.statusTag(m)}`));
            }
            const p = this.player;
            this.say('--- You ---', { important: true });
            this.say(`${p.name} (${Math.max(0, p.hp)}/${p.maxHp} HP) · ${p.resource.type}: ${p.resource.current}/${p.resource.max}${this.statusTag(p)}`);
            this.say('---------------------');
            this.say('What will you do?');
            this.say(`> Attack (${this.basicAttackName()})`);
            for (const name of this.player.skills) {
                const info = this.describeSkill(name);
                let line = `> ${name}`;
                const def = this.data.skillDefinitions[name];
                const cost = def ? this.skillCost(def) : 0;
                if (def && def.cost === 'all') line += ` [Cost: all ${this.player.resource.type}]`;
                else if (cost) line += ` [Cost: ${cost} ${this.player.resource.type}]`;
                else if (info.cost) line += ` [Free this turn]`;
                if (!info.implemented) line += ' [not implemented]';
                else if (info.missing.length) line += ' [partial]';
                this.say(line);
            }
            const usable = [...new Set(this.player.inventory.filter((i) => this.data.itemDefinitions[i]))];
            for (const item of usable) {
                const n = this.player.inventory.filter((i) => i === item).length;
                this.say(`> Use ${item}${n > 1 ? ` (x${n})` : ''}`);
            }
            this.say('> Flee');
            this.say("Type a command (e.g., 'attack 1', 'grave bolt 2', 'use bandages').");
        }

        statusTag(c) {
            return c.statusEffects.length
                ? ` [${c.statusEffects.map((s) => `${s.name}${s.stacks > 1 ? ` x${s.stacks}` : ''}${typeof s.duration === 'number' ? ` ${s.duration}` : ''}`).join(', ')}]` + (c.cr && c.cr.value > 0 ? ` (CR ${Math.round(c.cr.value)}${c.cr.immune ? ' IMMUNE' : ''})` : '') : '';
        }

        // =====================================================================
        // Skills & damage
        // =====================================================================
        missingEffects(skill) {
            return (skill.effects || []).filter((e) => !this.effects[e.type]).map((e) => e.type);
        }

        isCastable(skill) {
            if (skill.base_damage) return true;
            return (skill.effects || []).some((e) => this.effects[e.type]);
        }

        describeSkill(name) {
            const s = this.data.skillDefinitions[name];
            if (!s) return { name, description: '(missing from skillDefinitions)', cost: 0, implemented: false, missing: [] };
            const cost = s.cost === 'all' ? 'all' : (s.cost || 0);
            let detail = '';
            if (s.base_damage) detail = `${s.base_damage[0]}-${s.base_damage[1]} dmg`;
            else if ((s.effects || []).some((e) => e.type === 'summon')) detail = 'Summon';
            else if (s.effects) detail = 'Effect';
            return { name, description: s.description, cost, detail, target: s.target, implemented: this.isCastable(s), missing: this.missingEffects(s) };
        }

        newHit(target) {
            return { target, damage: 0, isCrit: false, forceCrit: false, armorIgnore: 0, trueDamage: false, consumeMarks: [] };
        }

        randInt(min, max) { return Math.floor(this.rng() * (max - min + 1)) + min; }

        /** Bonus damage from the attacker's stats (player only: enemies and minions have no str/int). */
        statBonus(attacker, damageType) {
            const r = this.data.gameRules;
            let stat = null;
            if (damageType === 'physical' || damageType == null) stat = r.physicalStat[attacker.className] || r.physicalStat.default;
            else if (r.magicTypes.includes(damageType)) stat = r.magicStat;
            const value = stat ? attacker[stat] : 0;
            return value ? Math.floor(value / r.statDamagePer) : 0;
        }

        rollDamage(attacker, target, skill, hit) {
            let dmg = this.randInt(skill.base_damage[0], skill.base_damage[1]);
            if (attacker.isPlayer) dmg += this.statBonus(attacker, skill.damage_type);
            const gcIdx = attacker.statusEffects.findIndex((s) => s.name === 'Guaranteed Crit');
            if (gcIdx !== -1) { hit.forceCrit = true; attacker.statusEffects.splice(gcIdx, 1); }
            hit.isCrit = hit.forceCrit || this.rng() < (attacker.critChance || 0);
            if (hit.isCrit) dmg = Math.floor(dmg * (attacker.critMultiplier || 1.5));

            let final;
            if (skill.damage_type === 'true' || hit.trueDamage) {
                final = dmg;
            } else {
                const def = (target.def || 0) * (1 - hit.armorIgnore);
                final = Math.max(0, dmg - def);
                for (const s of target.statusEffects) if (s.type === 'damage_reduction') final *= (1 - s.value);
                if (target.isPlayer && this.progression.branch === 'bone_warden') {
                    const cap = target.traits.some((t) => t.name === 'Bone Fortress') ? 0.15 : 0.10;
                    final *= 1 - Math.min(this.alive(this.combat.minions).length * 0.02, cap);
                }
            }
            final *= this.markModifiers(attacker, target, hit);
            hit.damage = Math.max(0, Math.floor(final));
            if (hit.consumeMarks.length) {
                target.statusEffects = target.statusEffects.filter((s) => !hit.consumeMarks.includes(s));
                if (hit.damage > 0) this.say(`[${hit.consumeMarks.map((m) => m.name).join(', ')}] is consumed!`);
            }
            return hit;
        }

        castSkill(caster, skill, targets) {
            const entries = (skill.effects || []).map((effect) => ({ effect, handler: this.effects[effect.type] }));
            const active = entries.filter((x) => x.handler);
            const base = { engine: this, caster, targets, skill };
            // QA-14: riders (stun, poison, marks...) only reach targets the attack actually hit.
            // An absorbed (Bone Wall), dodged or missed hit carries none of them.
            const reached = new Set();
            let attacked = false;

            if (skill.base_damage && !active.some((x) => x.handler.replacesDamage)) {
                attacked = true;
                let hits = 1;
                for (const x of active) if (x.handler.hits) hits = x.handler.hits({ ...base, effect: x.effect });
                for (let h = 1; h <= hits; h++) {
                    if (hits > 1) this.say(`--- Hit ${h}/${hits} ---`);
                    for (const target of targets) {
                        if (target.hp <= 0 || target.erased) continue;
                        if (caster.hp <= 0) break;
                        if (!this.hitConnects(caster, target)) continue;
                        reached.add(target);
                        const hit = this.newHit(target);
                        const ctx = { ...base, target };
                        for (const x of active) if (x.handler.beforeHit) x.handler.beforeHit({ ...ctx, effect: x.effect }, hit);
                        this.rollDamage(caster, target, skill, hit);
                        for (const x of active) if (x.handler.afterCalc) x.handler.afterCalc({ ...ctx, effect: x.effect }, hit);
                        const hpNote = target.isPlayer ? ` ${target.name} HP: ${Math.max(0, target.hp - hit.damage)}/${target.maxHp}` : '';
                        this.say(`${caster.name} uses ${skill.name} on ${target.name} for ${hit.damage} damage!${hit.isCrit ? ' (CRITICAL HIT!)' : ''}${hpNote}`, { important: !!caster.isPlayer });
                        this.damage(target, hit.damage, caster);
                        for (const x of active) if (x.handler.onHit) x.handler.onHit({ ...ctx, effect: x.effect }, hit);
                        if (target.hp > 0) this.counterAttack(target, caster);
                    }
                }
            }
            const riderBase = attacked ? { ...base, targets: targets.filter((t) => reached.has(t)) } : base;
            for (const x of active) if (x.handler.apply) x.handler.apply({ ...riderBase, effect: x.effect });
            if (caster.isPlayer && active.some((x) => x.effect.type === 'damage_reduction')) this.resourceEvent('onGuard', 1, 'oath kept');

            const missing = entries.filter((x) => !x.handler).map((x) => x.effect.type);
            if (missing.length && caster.isPlayer) this.say(`(Not implemented yet: ${missing.join(', ')})`);
        }

        // ---------- primitives the effect registry uses ----------
        damage(target, amount, source) {
            if (amount <= 0 || target.hp <= 0) return;
            target.hp -= amount;
            if (target.isPlayer && this.combat && source && source !== target) this.resourceEvent('onDamageTaken', 1, 'pain');
            if (source && source.isPlayer && this.combat) this.combat.dealtDamageThisRound = true;
            if (this.combat && this.isPlayerSide(source) && this.marksOn(target).length) this.combat.markedEnemyHitThisRound = true;
            if (target.hp <= 0 && !target.dead) this.onDeath(target, source);
        }

        heal(target, amount) {
            const before = target.hp;
            target.hp = Math.min(target.maxHp, target.hp + Math.max(0, amount));
            return target.hp - before;
        }

        gainResource(target, amount) {
            if (!target.resource) return 0;
            const before = target.resource.current;
            target.resource.current = Math.min(target.resource.max, before + amount);
            return target.resource.current - before;
        }

        minionCap() {
            const bonus = this.player.traits.some((t) => /\+3 max minions/i.test(t.name)) ? 3 : 0;
            return this.data.gameRules.baseMinionCap + bonus;
        }

        summon(type) {
            const tpl = this.data.minionDefinitions[type];
            if (!tpl) return null;
            const m = clone(tpl);
            Object.assign(m, { id: `minion_${this.combat.nextMinionId++}`, isPlayer: false, isMinion: true, statusEffects: [] });
            this.combat.minions.push(m);
            return m; // joins the turn order next round
        }

        erase(target) {
            target.hp = 0;
            target.erased = true;
            target.dead = true;
        }

        onDeath(target, source) {
            target.dead = true;
            const p = this.player;
            if (target.isPlayer) return;
            this.say(`${target.name} has been defeated!`);
            if (target.isMinion) return;
            // QA-6: credit each enemy once, even if it comes back after you flee (whether it should come
            // back is a pending design question; this only fixes the count).
            if (this.isPlayerSide(source) && !this.stats.credited.includes(target.entityKey)) {
                this.stats.kills++;
                this.stats.credited.push(target.entityKey);
            }
            if (!p.isHollowKing) {
                this.combat.corpses++;
                this.say(`A corpse is left on the battlefield. Total corpses: ${this.combat.corpses}`);
            }
            const inf = this.infectionOn(target);
            if (inf) {
                if (source && source.isPlayer && this.hasTrait('Plague Reservoir') && this.gainResource(p, 1) > 0) this.say('Plague Reservoir: +1 Soul Energy.');
                if (inf.spreadOnDeath) {
                    const others = this.alive(this.combat.enemies).filter((e) => e !== target);
                    if (others.length) this.say(`The contagion bursts from ${target.name}'s body!`);
                    for (const e of others) this.infect(this.findCombatant(inf.appliedBy) || p, e, 1, { spreadOnDeath: true });
                }
            }
            if (source && source.isPlayer) this.resourceEvent('onKill', 1, 'kill');
            if (p.className === 'necromancer' && !p.isHollowKing && source) {
                const amount = source.isPlayer ? 2 : source.isMinion ? 1 : 0;
                if (amount && this.gainResource(p, amount) > 0) this.say(`You gained ${amount} Soul Energy from ${target.name}'s demise!`);
            }
        }

        // =====================================================================
        // Progression
        // =====================================================================
        addExperience(amount, opts = {}) {
            const p = this.player;
            if (!p) return;
            p.xp += amount;
            if (!opts.quiet) this.say(`You gained ${amount} experience points!`);
            while (p.xp >= p.xpToNext) {
                p.xp -= p.xpToNext;
                p.level++;
                p.xpToNext = Math.floor(p.xpToNext * 1.5);
                p.strength++; p.intelligence++; p.agility++; p.spd++; p.def++;
                p.maxHp += 10; p.hp = p.maxHp;
                p.critChance = Math.min(0.5, p.critChance + 0.01);
                p.resource.max += 2; p.resource.current = p.resource.max;
                this.say(`Congratulations! You have reached Level ${p.level}!`, { important: true });
                this.say(`Stats increased! HP and ${p.resource.type} refilled.`);
                this.evolve();
            }
        }

        evolve() {
            if (this.player.isHollowKing) { this.say('Your form is beyond conventional evolution.', { important: true }); return; }
            if (!this.data.evolutionPaths[this.player.className]) return;
            if (!this.progression.branch) {
                if (this.player.level >= 3) this.pendingBranchChoice = true;
                return;
            }
            this.applyStages();
        }

        maybePromptBranch() {
            if (!this.pendingBranchChoice || this.mode === 'combat' || this.mode === 'game_over') return;
            const tree = this.data.evolutionPaths[this.player.className];
            this.mode = 'branch_select';
            this.say('You feel a surge of new power! It\'s time to specialize.', { important: true });
            this.say('Choose your path:');
            for (const key in tree.branches) this.say(`- ${pretty(key)}: ${tree.branches[key].theme}`);
            this.say('Type the name of a path (e.g., \'' + pretty(Object.keys(tree.branches)[0]) + '\').', { important: true });
        }

        chooseBranch(input) {
            const tree = this.data.evolutionPaths[this.player.className];
            const key = input.trim().replace(/\s+/g, '_');
            const match = Object.keys(tree.branches).find((k) => k === key || tree.branches[k].name.toLowerCase() === input.trim());
            if (!match) {
                this.say('That is not one of your paths.');
                this.pendingBranchChoice = true;
                this.maybePromptBranch();
                return;
            }
            this.progression.branch = match;
            this.pendingBranchChoice = false;
            this.mode = 'explore';
            this.say(`You walk the path of the ${tree.branches[match].name}.`, { important: true });
            this.applyStages();
            this.say("Type 'look' to see where you are.");
        }

        applyStages() {
            const prog = this.progression;
            const p = this.player;
            if (!p || !prog.branch || p.isHollowKing) return;
            const branch = this.data.evolutionPaths[p.className].branches[prog.branch];
            for (let i = prog.stageIndex + 1; i < branch.stages.length; i++) {
                const st = branch.stages[i];
                if (st.level > p.level) break;
                if (st.unlockTrigger && !this.flags.eventsUnlocked) {
                    this.say(`(${st.name} awaits — requires: ${st.unlockTrigger}.)`);
                    break;
                }
                this.enterStage(branch, st, i);
            }
        }

        enterStage(branch, stage, index) {
            const p = this.player;
            this.progression.stageIndex = index;
            this.progression.evolutionName = stage.name;
            this.say(`--- Your destiny unfolds! You become a ${stage.name}! ---`, { important: true });
            if (stage.lore) this.say(`"${stage.lore}"`);
            if (stage.skill && !p.skills.includes(stage.skill)) {
                p.skills.push(stage.skill);
                const info = this.describeSkill(stage.skill);
                this.say(`New Skill: ${stage.skill}!${info.implemented ? '' : ' (not implemented yet)'}`, { important: true });
            }
            if (stage.trait) {
                p.traits.push({ name: stage.trait, effect: stage.traitEffect });
                this.say(`New Trait: ${stage.trait}!`, { important: true });
            }
            const resEvo = (branch.resourceEvolution || []).find((r) => r.level === stage.level);
            if (resEvo && resEvo.type !== p.resource.type) {
                this.say(`Your ${p.resource.type} becomes ${resEvo.type}.`);
                p.resource.type = resEvo.type;
                const rule = (this.data.resourceRules || {})[resEvo.type];
                if (rule && rule.regen != null) p.resource.regen = rule.regen;
            }
        }

        becomeHollowKing() {
            const hk = this.data.legendaryAndSecretClasses.the_hollow_king;
            const p = this.player;
            Object.assign(p, {
                name: hk.name, isHollowKing: true,
                maxHp: 500, hp: 500, originalMaxHp: 500, def: 50,
                strength: 20, intelligence: 20, agility: 15, spd: 15,
                critChance: 0.25, critMultiplier: 2.5,
                resource: { type: hk.coreResource.type, current: hk.coreResource.initial, max: 10, regen: 0 },
                skills: ['Void Rend', ...hk.skills, hk.overdrive.name],
                traits: clone(hk.passives)
            });
            this.progression.evolutionName = hk.name;
            this.clear();
            this.say(hk.uponUnlock, { important: true });
            this.say('You have become The Hollow King. Your previous self is gone.', { important: true });
            this.describeRoom(false);
        }

        showClassTree() {
            const p = this.player;
            this.clear();
            if (p.isHollowKing) {
                const hk = this.data.legendaryAndSecretClasses.the_hollow_king;
                this.say(`<strong>${hk.name}</strong>`, { html: true });
                this.say(`"${hk.uponUnlock}"`);
                this.say(`Identity: ${hk.identity}`);
                return;
            }
            const tree = this.data.evolutionPaths[p.className];
            this.say(`--- Evolution Tree for ${cap(p.className)} ---`, { important: true });
            for (const key in tree.branches) {
                const branch = tree.branches[key];
                this.say(`<strong>Branch: ${branch.name}</strong>`, { html: true });
                branch.stages.forEach((st, i) => {
                    const current = this.progression.branch === key && this.progression.stageIndex === i;
                    let name = st.name;
                    if (st.ascended) name = `<span style="color:#f6ad55">${st.name} (Ascended)</span>`;
                    else if (st.unlockTrigger) name = `<span style="color:#fc8181">${st.name} (Event)</span>`;
                    this.say(`&nbsp;&nbsp;L${st.level}: ${name}${current ? ' <strong>(CURRENT)</strong>' : ''}`, { html: true });
                });
            }
        }
    }

    const installStatusSystem = isNode ? require('./statuses.js') : ENSO.installStatusSystem;
    installStatusSystem(GameEngine);

    ENSO.GameEngine = GameEngine;
    if (isNode) module.exports = { GameEngine, mulberry32 };
})(typeof window !== 'undefined' ? window : globalThis);
