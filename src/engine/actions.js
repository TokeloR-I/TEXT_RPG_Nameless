/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Structured actions (Phase 1, slice 2)
 * architecture/PHASE1_ENGINE_INTERFACE_SPEC.md §4 and §6A; authorized in #64.
 *
 *   engine.getAvailableActions()  -> what the player can do now, with reasons
 *                                    (pure: no state change, no RNG use)
 *   engine.act(action)            -> { ok, events, error? } (a transaction,
 *                                    like input())
 *
 * There is one rules path. input() is a text translator: it parses, resolves
 * target numbers to the current living-enemy list, adds "I don't understand"
 * and "Did you mean…", then runs the same rule functions act() runs (useSkill,
 * combatUseItem, doFlee, doContinue, move, takeItem, …). Refusals record a code
 * (spec §4.4) next to the message they already printed, so the text game's
 * output is unchanged.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    // Targeting kinds that don't take a chosen enemy (pickTargets decides who is affected).
    const NO_CHOICE = new Set(['self', 'minions', 'ground', 'corpse', 'enemy_aoe', 'all_enemies', 'all_combatants', 'linked_enemies']);
    const DIRECTION_NAMES = { n: 'north', s: 'south', e: 'east', w: 'west' };
    const WORLD_ACTIONS = new Set(['enter_world', 'world_pickup', 'world_encounter']);

    class ActionMethods {
        // =====================================================================
        // Refusals
        // =====================================================================
        /** Refuse with a plain message (exploration, menus). Records the code for act(). */
        refuse(code, message, opts) {
            this.say(message, opts);
            this.rejection = { code, message };
        }
        /** Refuse a combat action the way the text game always has: "Error: …" plus the menu. */
        refuseCombat(code, message, attempted = null) {
            this.combatError(message, attempted);
            this.rejection = { code, message };
        }

        // =====================================================================
        // act()
        // =====================================================================
        /** Run one structured action as a transaction. Returns { ok, events, error? }. */
        act(action) {
            this.rejection = null;
            let failure = null;
            const events = this.transact(() => this.perform(action), (err) => { failure = err; });
            const rejection = this.rejection;
            this.rejection = null;
            if (failure) return { ok: false, events, error: { code: 'INTERNAL_ERROR', message: failure.message } };
            if (rejection) return { ok: false, events, error: rejection };
            return { ok: true, events };
        }

        /** The rules path behind act() (and, through the same functions, behind input()). */
        perform(action) {
            const a = action && typeof action === 'object' ? action : {};
            const type = a.type;
            if (type === 'restart') { this.out.push(...this.start()); return; }
            if (this.performStory(a)) return;   // Chapter One: talk, dialogue, identity, story events (src/engine/story.js)
            if (WORLD_ACTIONS.has(type)) { this.performWorld(a); return; }
            if (this.mode === 'game_over' || this.mode === 'won') {
                this.refuse('WRONG_MODE', "The game is over. Type 'start' to play again.", { important: true });
                return;
            }
            if (this.mode === 'class_select') {
                if (type !== 'choose_class') { this.refuse('WRONG_MODE', 'Choose a class first.'); return; }
                this.chooseClass(String(a.classId || ''));
                return;
            }
            if (this.mode === 'branch_select') {
                if (type !== 'choose_branch') { this.refuse('WRONG_MODE', 'Choose your path first.'); return; }
                this.chooseBranch(String(a.branchId || ''));
                return;
            }
            if (this.mode === 'combat') { this.performCombat(a); return; }
            this.performExplore(a);
            // Chapter One: a homestead construction that succeeded is a story event (Q07's first repair).
            if (a.type === 'build' && !this.rejection) this.storyEvent({ type: 'build', id: String(a.upgradeId || '') });
        }

        performExplore(a) {
            switch (a.type) {
                case 'move': this.move(DIRECTION_NAMES[a.direction] || a.direction || ''); return;
                case 'take': this.takeItem(String(a.item || '')); return;
                case 'use_item': this.useItem(String(a.item || '')); return;
                case 'equip': this.equipItem(String(a.item || '')); return;
                case 'unequip': this.unequipItem(String(a.slot || '')); return;
                case 'buy': this.buyItem(String(a.shopId || ''), String(a.item || '')); return;
                case 'sell': this.sellItem(String(a.shopId || ''), String(a.item || '')); return;
                case 'compare_item': this.compareItem(String(a.item || '')); return;
                case 'build': this.buildUpgrade(String(a.upgradeId || '')); return;
                case 'plant': this.plantCrop(String(a.plotId || ''), String(a.seed || '')); return;
                case 'tend': this.tendPlot(String(a.plotId || '')); return;
                case 'harvest': this.harvestPlot(String(a.plotId || '')); return;
                case 'craft': this.craftRecipe(String(a.recipeId || '')); return;
                case 'engage': this.engage(); return;
                case 'describe': this.describe(a.subject); return;
                case 'quit': this.mode = 'game_over'; this.say('Thanks for playing! Type \'start\' to play again.', { important: true }); return;
                case 'cheat': this.cheat(a.cheat, a.amount); return;
                case 'attack': case 'skill': case 'flee': case 'continue': case 'choose_class': case 'choose_branch':
                    this.refuse('WRONG_MODE', 'Not now.'); return;
                default: this.refuse('UNKNOWN_ACTION', `Unknown action '${a.type}'.`);
            }
        }

        describe(subject) {
            switch (subject) {
                case 'room': this.describeRoom(); return;
                case 'inventory': this.showInventory(); return;
                case 'help': this.showHelp(); return;
                case 'class_tree': this.showClassTree(); return;
                case 'journal': this.showJournal(); return;
                default: this.refuse('UNKNOWN_ACTION', `Nothing to describe called '${subject}'.`);
            }
        }

        cheat(name, amount) {
            switch (name) {
                case 'add_xp': this.addExperience(parseInt(amount, 10) || 50); this.maybePromptBranch(); return;
                case 'become_hollow_king': this.becomeHollowKing(); return;
                case 'unlock_events': this.flags.eventsUnlocked = true; this.say('[cheat] Story-event evolutions unlocked.'); this.applyStages(); return;
                default: this.refuse('UNKNOWN_ACTION', `Unknown cheat '${name}'.`);
            }
        }

        performCombat(a) {
            const c = this.combat;
            const p = this.player;
            if (!c.awaitingPlayer) { this.refuse('NOT_YOUR_TURN', 'Not your turn!'); return; }
            if (this.turnOrderPending()) { this.performTurnOrder(a); return; }   // D-09 (src/engine/turn-order.js)
            if (c.awaitingContinue) {
                if (a.type === 'continue') this.doContinue();
                else this.refuse('WRONG_MODE', "You can't act this turn. Continue first.");
                return;
            }
            if (c.controlledActorId) { this.performControl(a); return; }   // N-5 (src/engine/control.js)
            const ids = Array.isArray(a.targetIds) ? a.targetIds : a.targetId != null ? [a.targetId] : null;
            switch (a.type) {
                case 'attack':
                    this.useSkill(this.basicAttackName(), { ids }, { viaAttack: true });
                    return;
                case 'skill': {
                    const name = a.skillId;
                    if (!name || !this.data.skillDefinitions[name]) { this.refuseCombat('UNKNOWN_SKILL', `Unknown skill '${name}'.`); return; }
                    if (!p.skills.includes(name) && name !== this.basicAttackName()) { this.refuseCombat('SKILL_NOT_KNOWN', `You don't know the skill '${name}'.`); return; }
                    this.useSkill(name, { ids }, {});
                    return;
                }
                case 'use_item':
                    if (!a.item || !p.inventory.includes(a.item)) { this.refuseCombat('NO_ITEM', a.item ? `You don't have a '${a.item}'.` : 'Use what? (e.g. use bandages)'); return; }
                    this.combatUseItem(a.item);
                    return;
                case 'flee': this.doFlee(); return;
                case 'continue': this.refuseCombat('WRONG_MODE', 'There is nothing to continue; it is your turn.'); return;
                case 'control': this.refuseCombat('WRONG_MODE', "You aren't controlling anyone right now."); return;
                case 'turn_order': this.refuseCombat('WRONG_MODE', 'The turn order can only be set at the start of a round, while Eternal Architect is active.'); return;
                default: this.refuseCombat('WRONG_MODE', `You can't do '${a.type}' in a fight.`);
            }
        }

        // =====================================================================
        // Combat rules (shared by act() and the text parser)
        // =====================================================================
        /** The player's skipped turn (stun etc.): move on. */
        doContinue() {
            const c = this.combat;
            c.awaitingContinue = false;
            c.awaitingPlayer = false;
            c.idx++;
            this.advance();
        }

        doFlee() {
            const p = this.player;
            this.mode = 'explore';
            this.combat = null;
            p.statusEffects = [];
            this.say('You fled!');
            if (this.world && this.world.encounter) { this.worldFightEnded('fled'); return; }
            this.describeRoom(false);
        }

        combatUseItem(item) {
            const c = this.combat;
            const p = this.player;
            c.awaitingPlayer = false;
            if (!this.applyItem(item)) { c.awaitingPlayer = true; this.showCombatState(); return; }
            c.playerActedThisRound = true;
            this.endOpportunity(p);
            c.idx++;
            this.advance();
        }

        /**
         * Use a skill the player knows. `spec` is { num } from the text parser (a list position, or an array
         * of them) or { ids } from act() (combatant ids). Checks run in the order the text game always used,
         * with the same messages.
         */
        useSkill(skillName, spec, opts = {}) {
            const c = this.combat;
            const p = this.player;
            const skill = this.playerSkill(skillName);
            const basic = this.basicAttackName();

            if (this.statusOfType(p, 'silence') && skillName !== basic) {
                this.refuseCombat('SILENCED', 'You are silenced — only your basic attack works this turn.');
                return;
            }
            if (!this.isCastable(skill)) {
                this.refuseCombat('NOT_IMPLEMENTED', `${skillName} isn't implemented yet (missing: ${this.missingEffects(skill).join(', ')}).`);
                return;
            }
            if (skill.oncePerFight && c.usedOncePerFight[skillName]) {
                this.refuseCombat('ONCE_PER_FIGHT', `${skillName} can only be used once per fight!`);
                return;
            }
            const cost = this.skillCost(skill);
            if (p.resource.current < cost) {
                this.refuseCombat('NOT_ENOUGH_RESOURCE', `Not enough ${p.resource.type}! (${skillName} needs ${cost}, you have ${p.resource.current})`);
                return;
            }

            const targets = 'num' in spec ? this.pickTargets(skill, spec.num) : this.targetsFromIds(skill, spec.ids);
            if (!targets) { this.refuseCombat('INVALID_TARGET', this.invalidTargetMessage(skill, skillName, spec)); return; }
            const problem = this.requirementProblem(skill, targets);
            if (problem) { this.refuseCombat('REQUIREMENT_FAILED', problem); return; }

            if (cost > 0) {
                p.resource.current -= cost;
                this.say(`Used ${cost} ${p.resource.type}.`);
            }
            if (skill.oncePerFight) c.usedOncePerFight[skillName] = true;
            if (skillName === 'Soul Feast' && cost === 0 && this.hasTrait('Undying Will'))
                c.freeSoulFeastUsed = true;
            if (this.isMarkSkill(skill) && this.hasTrait('Hunter\'s Instinct') && !c.freeMarkUsedThisRound && skill.cost !== 'all') {
                c.freeMarkUsedThisRound = true;
                if (skill.cost) this.say("Hunter's Instinct: your first mark this turn is free.");
            }

            c.awaitingPlayer = false;
            const isBasic = !!opts.viaAttack || skillName === basic;
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
            this.endOpportunity(p); // the normal turn ends here, after any Haste bonus actions
            c.idx++;
            this.advance();
        }

        /** First requires() refusal for these targets, or null. Hooks are side-effect free (effects.js). */
        requirementProblem(skill, targets) {
            for (const effect of skill.effects || []) {
                const h = this.effects[effect.type];
                const problem = h && h.requires && h.requires({ engine: this, caster: this.player, targets, skill, effect });
                if (problem) return problem;
            }
            return null;
        }

        /** act() targets: ids -> the same list positions the text parser would use -> pickTargets (one targeting rule). */
        targetsFromIds(skill, ids) {
            const living = this.alive(this.combat.enemies);
            const kind = skill.target || 'enemy_single';
            if (!ids || !ids.length || NO_CHOICE.has(kind) || (kind === 'ally_single' && !skill.base_damage)) return this.pickTargets(skill, null);
            const nums = ids.map((id) => living.findIndex((e) => e.id === id) + 1);
            if (nums.some((n) => n < 1)) return null;
            return this.pickTargets(skill, kind === 'enemy_multiple' ? nums : (nums.length === 1 ? nums[0] : nums));
        }

        invalidTargetMessage(skill, skillName, spec) {
            const living = this.alive(this.combat.enemies);
            const text = 'num' in spec;
            if (skill.target === 'enemy_multiple') {
                // QA-24b: say how many targets are needed right now
                const n = this.multiTargetCount ? this.multiTargetCount() : 2;
                const eg = text ? Array.from({ length: n }, (_, i) => i + 1).join(',') : living.slice(0, n).map((e) => e.id).join(', ');
                return text ? `${skillName} needs exactly ${n} different enemies right now (e.g. '${spec.command} ${eg}').`
                    : `${skillName} needs exactly ${n} different living enemies right now (targetIds, e.g. ${eg}).`;
            }
            if (text) {
                const shown = Array.isArray(spec.num) ? spec.num.join(',') : spec.num;
                return `Invalid target '${shown || 'none specified'}'. Valid targets: ${living.map((e, i) => i + 1).join(', ')}. Example: '${spec.command} 1'`;
            }
            const shown = spec.ids && spec.ids.length ? spec.ids.join(',') : 'none specified';
            return `Invalid target '${shown}'. Valid targets: ${living.map((e) => e.id).join(', ')}.`;
        }

        // =====================================================================
        // Availability (pure)
        // =====================================================================
        getAvailableActions() {
            const mode = this.mode;
            const out = { mode, awaiting: null, actions: [] };
            if (mode === 'class_select') {
                out.awaiting = 'choice';
                out.actions = Object.keys(this.data.basePlayerClasses).map((classId) => ({ type: 'choose_class', classId, enabled: true }));
            } else if (mode === 'branch_select') {
                out.awaiting = 'choice';
                const tree = this.data.evolutionPaths[this.player.className];
                out.actions = Object.keys(tree.branches).map((branchId) => ({ type: 'choose_branch', branchId, name: tree.branches[branchId].name, enabled: true }));
            } else if (mode === 'explore' && this.story && this.story.dialogue) {
                out.awaiting = 'dialogue';                    // Chapter One conversation (src/engine/story.js)
                Object.assign(out, this.dialogueAvailability());
            } else if (mode === 'explore') {
                out.awaiting = 'action';
                out.actions = this.exploreAvailability();
            } else if (mode === 'combat') {
                const c = this.combat;
                if (c.awaitingPlayer && this.turnOrderPending()) {
                    out.awaiting = 'turn_order';                  // D-09: choose this round's order
                    out.actions = this.turnOrderOptions();
                } else if (c.awaitingPlayer && c.awaitingContinue) { out.awaiting = 'continue'; out.actions = [{ type: 'continue', enabled: true }]; } else if (c.awaitingPlayer && c.controlledActorId) {
                    out.awaiting = 'control';                     // N-5: the controlled actor's own moves
                    out.controlledActorId = c.controlledActorId;
                    out.actions = this.controlOptions(this.controlledActor());
                } else if (c.awaitingPlayer) { out.awaiting = 'action'; out.actions = this.combatAvailability(); }
            } else {
                out.actions = [{ type: 'restart', enabled: true }];
            }
            return out;
        }

        exploreAvailability() {
            const actions = [];
            if (!this.world) {   // the text game's rooms; the graphical world uses its own map objects
                const room = this.rooms[this.currentRoom];
                for (const dir of Object.keys(room.exits)) actions.push({ type: 'move', direction: dir, enabled: true });
                for (const item of room.items) actions.push({ type: 'take', item, enabled: true });
                if (room.enemies.length) actions.push({ type: 'engage', enabled: true });
            }
            actions.push(...this.itemAvailability());
            return actions;
        }

        itemAvailability() {
            const p = this.player;
            const items = [...new Set(p.inventory.filter((i) => this.data.itemDefinitions[i]))];
            return items.map((item) => {
                const def = this.data.itemDefinitions[item];
                const opt = { type: 'use_item', item, count: p.inventory.filter((i) => i === item).length, enabled: true };
                if (def.use === 'heal' && p.hp >= p.maxHp) { opt.enabled = false; opt.reason = { code: 'FULL_HEALTH', message: "You're already at full health." }; }
                return opt;
            });
        }

        combatAvailability() {
            const p = this.player;
            const basic = this.basicAttackName();
            const attack = this.skillAvailability(basic, true);
            attack.type = 'attack';
            const skills = p.skills.map((name) => this.skillAvailability(name, false));
            return [attack, ...skills, ...this.itemAvailability(), { type: 'flee', enabled: true }];
        }

        /** One skill's option: same checks, same order and same messages as useSkill(). */
        skillAvailability(name, viaAttack) {
            const c = this.combat;
            const p = this.player;
            const def = this.data.skillDefinitions[name];
            const opt = { type: 'skill', skillId: name, targeting: (def && def.target) || 'enemy_single', enabled: false };
            if (!def) { opt.reason = { code: 'UNKNOWN_SKILL', message: `Unknown skill '${name}'.` }; return opt; }
            const skill = this.playerSkill(name);
            const cost = this.skillCost(skill);
            Object.assign(opt, { cost, resource: p.resource.type, isBasic: viaAttack || name === this.basicAttackName() });
            const fail = (code, message) => { opt.reason = { code, message }; return opt; };
            if (this.statusOfType(p, 'silence') && name !== this.basicAttackName()) return fail('SILENCED', 'You are silenced — only your basic attack works this turn.');
            if (!this.isCastable(skill)) return fail('NOT_IMPLEMENTED', `${name} isn't implemented yet (missing: ${this.missingEffects(skill).join(', ')}).`);
            if (skill.oncePerFight && c.usedOncePerFight[name]) return fail('ONCE_PER_FIGHT', `${name} can only be used once per fight!`);
            if (p.resource.current < cost) return fail('NOT_ENOUGH_RESOURCE', `Not enough ${p.resource.type}! (${name} needs ${cost}, you have ${p.resource.current})`);

            const living = this.alive(c.enemies);
            const kind = opt.targeting;
            const notes = this.skillNotes(skill);
            if (notes.length) opt.notes = notes;
            if (kind === 'enemy_multiple') {
                const n = this.multiTargetCount ? this.multiTargetCount() : 2;
                opt.pick = { min: n, max: n };
                opt.targets = this.notedTargets(skill, living);
                if (living.length < n) return fail('INVALID_TARGET', this.invalidTargetMessage(skill, name, { ids: [] }));
                const problem = this.requirementProblem(skill, living.slice(0, n));
                if (problem) return fail('REQUIREMENT_FAILED', problem);
                opt.enabled = true;
                return opt;
            }
            if (NO_CHOICE.has(kind) || (kind === 'ally_single' && !skill.base_damage)) {
                const affected = this.pickTargets(skill, null) || [];
                opt.targets = this.notedTargets(skill, affected);
                const problem = this.requirementProblem(skill, affected);
                if (problem) return fail('REQUIREMENT_FAILED', problem);
                opt.enabled = true;
                return opt;
            }
            // one chosen enemy: requires() per candidate (e.g. Assassinate: too healthy on one, fine on another)
            opt.targets = living.map((e) => {
                const t = { id: e.id, enabled: true };
                const problem = this.requirementProblem(skill, [e]);
                if (problem) { t.enabled = false; t.reason = { code: 'REQUIREMENT_FAILED', message: problem }; }
                const tn = this.targetNotes(skill, e);
                if (tn.length) t.notes = tn;
                return t;
            });
            const firstOk = opt.targets.find((t) => t.enabled);
            if (!firstOk) return opt.targets.length ? fail('REQUIREMENT_FAILED', opt.targets[0].reason.message) : fail('INVALID_TARGET', 'There is no one to target.');
            opt.enabled = true;
            return opt;
        }

        /** Non-blocking hints for a skill as a whole (e.g. Shield Bash below its stun threshold). */
        skillNotes(skill) {
            const notes = [];
            const res = this.player.resource;
            for (const e of skill.effects || []) {
                const gate = e.condition;
                if (gate && (res.type !== gate.stat || res.current < gate.value)) notes.push({ code: 'STUN_NEEDS_RESOURCE', message: `No stun: needs ${gate.value} ${gate.stat}.` });
            }
            return notes;
        }

        /** Non-blocking hints for one target (QA-2: still recovering from the last Shield Bash stun). */
        targetNotes(skill, target) {
            if ((skill.effects || []).some((e) => e.shieldBashRecovery) && target.shieldBashRecovery) {
                return [{ code: 'STUN_NOT_ELIGIBLE', message: `No stun: ${target.name} is still recovering from the last one.` }];
            }
            // Package 2: what Control Resistance will do on a hit. An outcome, never a refusal (matrix 11).
            const notes = [];
            for (const e of skill.effects || []) {
                const applies = this.effects[e.type] && this.effects[e.type].applies;
                const note = applies && this.controlPreview(target, applies.name, applies.type, e.duration);
                if (note && !notes.some((n) => n.message === note.message)) notes.push(note);
            }
            return notes;
        }

        /** Target entries with their non-blocking notes. */
        notedTargets(skill, list) {
            return list.map((t) => {
                const entry = { id: t.id, enabled: true };
                const tn = t.isPlayer || t.isMinion ? [] : this.targetNotes(skill, t);
                if (tn.length) entry.notes = tn;
                return entry;
            });
        }

        // =====================================================================
        // World intents as actions (§6A.1)
        // =====================================================================
        performWorld(a) {
            if (a.type === 'enter_world') {
                this.world = { collected: [], defeated: [], encounter: null, lastEncounter: null, lastResult: null };
                this.storyBegin();                 // the chapter runs in the world (src/engine/story.js)
                return;
            }
            if (!this.world) throw new Error(`${a.type} before enter_world`);
            if (this.mode !== 'explore') { this.refuse('WRONG_MODE', 'Not now.'); return; }
            if (a.type === 'world_pickup') {
                if (this.isCollected(a.pickupId)) { this.refuse('ALREADY_COLLECTED', 'There is nothing left here.'); return; }
                this.world.collected.push(a.pickupId);
                const received = this.grantItem(a.item);
                this.say(`You pick up the ${received}.`, { important: true });
                this.storyEvent({ type: 'pickup', id: a.pickupId });
                return;
            }
            if (this.isDefeated(a.encounterId)) { this.refuse('ALREADY_DEFEATED', 'Nothing stirs here any more.'); return; }
            this.world.encounter = a.encounterId;
            this.world.lastEncounter = null;
            this.world.lastResult = null;
            this.startCombat(a.enemies, `world:${a.encounterId}`);
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['actions'] = ActionMethods;
    if (isNode) module.exports = ActionMethods;
})(typeof window !== 'undefined' ? window : globalThis);
