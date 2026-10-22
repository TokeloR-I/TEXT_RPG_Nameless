/* =========================================================================
 * Enso's Last Stand — STATUS EFFECT SYSTEM
 * Implements "ENSO Status Effects: Approved Design Handoff" (22 Oct 2026).
 *
 * ONE pipeline for everyone (approved rule 10): players, enemies and summons
 * all apply statuses through engine.applyStatus(source, target, spec).
 *
 *   applyStatus ─► affinity (immune / resist / vulnerable)       rule 6
 *               ─► Control Resistance gate for hard control      rules 3–5
 *               ─► stack (intensity, cap) + refresh duration     rule 2
 *               ─► Overflow Burst roll when re-applied at cap    rules 7–9
 *               ─► cross-status reaction rolls                   rules 13–15
 *
 * Durations are ROUND-BASED (rule 11): a status loses 1 duration at the end of
 * each completed round in which its holder had a turn after it was applied.
 * So "N turns" = N of the HOLDER's turns, regardless of speed order, stuns or
 * bonus turns. That gives DoTs and turn-skips exactly N ticks/skipped turns.
 * EXCEPTION (QA-1, approved Option A): statuses that declare an `expiry` policy in
 * statusDefinitions (Marked for Death, Expose, Guard) expire by opportunity instead;
 * see "opportunity-based expiry" below. Evasion, Riposte and Taunt are NOT covered
 * (not approved) and keep the round-based rule.
 *
 * Every undecided design value lives in data.js (statusDefinitions,
 * statusRules, statusReactions) as `null` = PENDING. A pending value keeps
 * its feature switched OFF; nothing here invents a number.
 * `node tools/pending-decisions.js` lists them all.
 * ========================================================================= */
(function (global) {
    /**
     * QA-4: find reaction recipes that can trigger themselves again, directly or through
     * other recipes (a cycle in "outcome applies status X" -> "X is part of a recipe's pair").
     * Such data would recurse forever. Acyclic chains always end, so they are left alone:
     * whether chains are allowed at all is a pending design decision, not decided here.
     * Returns [{ index, name, reason }].
     */
    function findUnsafeReactions(recipes) {
        const list = (recipes || []).map((r, index) => ({ r, index }))
            .filter(({ r }) => r && Array.isArray(r.pair) && typeof r.baseChance === 'number');
        const applies = (r) => [].concat(r.outcome || []).filter((o) => o && o.type === 'apply_status' && o.status).map((o) => o.status.name);
        const next = new Map(list.map(({ r, index }) => [index,
            list.filter((o) => applies(r).some((n) => o.r.pair.includes(n))).map((o) => o.index)]));
        const unsafe = [];
        for (const { r, index } of list) {
            // can we get from this recipe back to itself?
            const seen = new Set(); const stack = [...next.get(index)];
            let loops = false;
            while (stack.length) {
                const i = stack.pop();
                if (i === index) { loops = true; break; }
                if (seen.has(i)) continue;
                seen.add(i); stack.push(...next.get(i));
            }
            if (loops) unsafe.push({ index, name: r.name || r.pair.join(' + '), reason: 'its outcome can re-trigger itself (directly or via other recipes), which would loop forever' });
        }
        return unsafe;
    }

    function install(GameEngine) {
        const P = GameEngine.prototype;
        const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

        // ---------------------------------------------------------------
        // Definitions & helpers
        // ---------------------------------------------------------------
        P.statusDef = function (name) {
            return (this.data.statusDefinitions || {})[name] || {};
        };
        P.statusRules = function () { return this.data.statusRules || {}; };

        P.maxStacks = function (name) {
            const def = this.statusDef(name);
            return isNum(def.maxStacks) ? def.maxStacks : (this.statusRules().defaultMaxStacks || 1);
        };

        /** Effective strength of a status (value × stacks). */
        P.intensity = function (s) { return (s.value || 0) * (s.stacks || 1); };

        P.findStatus = function (c, name) { return c.statusEffects.find((s) => s.name === name) || null; };
        P.statusOfType = function (c, type) { return c.statusEffects.find((s) => s.type === type) || null; };
        P.marksOn = function (c) { return c.statusEffects.filter((s) => s.type === 'mark'); };
        P.infectionOn = function (c) { return this.findStatus(c, 'Infection'); };

        /** Who is acting right now (default source for statuses applied without one). */
        P.currentActor = function () {
            const c = this.combat;
            return (c && c.order[c.idx]) || this.player;
        };

        P.tierOf = function (c) {
            if (c.isPlayer) return 'player';
            if (c.isMinion) return 'summon';
            if (c.tier) return c.tier;
            return (c.specialFlags || []).includes('boss') ? 'boss' : 'regular';
        };

        // ---------------------------------------------------------------
        // The single entry point
        // ---------------------------------------------------------------
        /**
         * spec = { name, type, value, duration, stacks = 1, ...extra }
         * Returns the status instance on success, or null if blocked (the reason is printed).
         * Callers print their own success message.
         */
        P.applyStatus = function (source, target, spec) {
            if (!target || target.hp <= 0 || target.erased) return null;
            source = source || this.currentActor();
            const def = this.statusDef(spec.name);
            const name = spec.name;

            // --- rule 6: individual affinities (immune is unambiguous; resist/vulnerable need config)
            const affinity = (target.statusAffinities || {})[name];
            if (affinity === 'immune') { this.say(`${target.name} is immune to ${name}.`); return null; }
            let duration = spec.duration;
            if (affinity === 'resist' || affinity === 'vulnerable') {
                const mod = (this.statusRules().affinityEffects || {})[affinity];
                if (mod && isNum(mod.durationMult) && isNum(duration)) duration = Math.max(1, Math.round(duration * mod.durationMult));
            }

            // --- rules 3–5: Control Resistance gate (hard control only, only when configured)
            const hard = this.isHardControl(name);
            if (hard && target.cr && target.cr.immune) {
                this.say(`${target.name} resists ${name}! (Control Resistance ${Math.round(target.cr.value)})`);
                return null;
            }

            // --- rule 2: one instance per status per target; stack intensity up to cap, refresh duration
            const existingNames = target.statusEffects.map((s) => s.name);
            const cap = this.maxStacks(name);
            const add = Math.max(1, spec.stacks || 1);
            let inst = this.findStatus(target, name);
            let wasAtCap = false;
            if (inst) {
                wasAtCap = (inst.stacks || 1) >= cap;
                inst.stacks = Math.min(cap, (inst.stacks || 1) + add);
                if (spec.value != null) inst.value = spec.value;
                if (duration != null) inst.duration = duration;       // refresh to full duration
                inst.appliedBy = source.id;                            // latest applier gets kill credit
                inst.armed = false;                                    // full duration counts again from now
                for (const k of Object.keys(spec)) if (!['name', 'type', 'value', 'duration', 'stacks'].includes(k)) inst[k] = spec[k] || inst[k];
            } else {
                inst = {
                    ...spec, name, type: spec.type || def.type || 'status', category: def.category || 'uncategorized',
                    value: spec.value != null ? spec.value : def.value, duration: duration != null ? duration : def.duration,
                    stacks: Math.min(cap, add), appliedBy: source.id, armed: false
                };
                target.statusEffects.push(inst);
            }

            // --- QA-1: opportunity-based expiry for the statuses that declare a policy
            this.initExpiryPolicy(source, inst, duration);

            // --- rules 7–9: Overflow Burst when re-applied while already capped
            if (wasAtCap) this.rollOverflow(source, target, inst);

            // --- rule 3: build CR after the control has succeeded
            if (hard) this.addControlResistance(target, name);

            // --- rules 13–15: reactions with statuses that were already there
            this.rollReactions(source, target, name, existingNames);
            return inst;
        };

        /** Compatibility shim: older code adds statuses with (target, status[, source]). */
        P.addStatus = function (target, status, source) {
            return this.applyStatus(source || this.currentActor(), target, status);
        };

        P.removeStatus = function (c, inst) { c.statusEffects = c.statusEffects.filter((s) => s !== inst); };

        // ---------------------------------------------------------------
        // Round-based duration (rule 11)
        // ---------------------------------------------------------------
        /** Called at the start of every turn (including skipped turns): statuses present now become "effective". */
        P.armStatuses = function (actor) {
            for (const s of actor.statusEffects) s.armed = true;
        };

        /** Called once at the end of every round. */
        P.tickStatusesEndOfRound = function () {
            const c = this.combat;
            for (const x of [this.player, ...c.enemies, ...c.minions]) {
                if (x.hp <= 0) continue;
                x.statusEffects = x.statusEffects.filter((s) => {
                    if (s.orphaned) {                   // QA-1 applier-death ruling: its applier died this round
                        this.say(`[${s.name}] wears off ${x.name}.`);
                        return false;
                    }
                    if (s.policy) return true;          // QA-1: expires by opportunity, not by round
                    if (s.duration === 'permanent' || s.duration == null) return true;
                    if (!s.armed) return true;          // holder hasn't had a turn with it yet
                    if (--s.duration > 0) return true;
                    if (s.type !== 'dodge' && s.type !== 'counter') this.say(`[${s.name}] wears off ${x.name}.`);
                    return false;
                });
                this.recoverControlResistance(x);
            }
        };

        // ---------------------------------------------------------------
        // QA-1: opportunity-based expiry (Option A, docs/design/QA_1_REACTIVE_STATUS_DECISION.md)
        //   applier_turns          lasts through N of the APPLIER's actionable normal turns after the
        //                          application turn (N = the skill's duration). Skipped (stunned) turns
        //                          and Haste bonus actions don't count. Marked for Death, Expose.
        //   holder_next_turn_start ends when the HOLDER's next scheduled normal turn begins, even if
        //                          that turn is skipped. Guard.
        //   onApplierDeath: 'end_of_round'  (Creative Director ruling, 22 Oct 2026) if the applier dies
        //                          mid-fight, the status keeps working until the end of THAT round, then
        //                          goes, whatever its window had left. A same-round revival doesn't cancel
        //                          it; a refresh by a living applier does (it's a new application).
        // Declared per status in data (statusDefinitions[name].expiry). Everything else keeps the
        // round-based lifecycle.
        // ---------------------------------------------------------------
        P.sideOf = function (c) { return c && (c.isPlayer || c.isMinion) ? 'player' : 'enemy'; };

        P.initExpiryPolicy = function (source, inst, duration) {
            const pol = this.statusDef(inst.name).expiry;
            if (!pol) return;
            inst.policy = pol.type;
            inst.consumeOn = pol.consumeOn || null;
            inst.onApplierDeath = pol.onApplierDeath || null;
            inst.orphaned = false;                                         // a (re)application has a living applier
            if (pol.type === 'applier_turns') {
                inst.duration = duration != null ? duration : pol.turns;   // full window again on refresh
                inst.appliedSeq = source.normalTurns || 0;                 // the application turn never counts
                inst.applierSide = this.sideOf(source);
            } else if (pol.type === 'holder_next_turn_start') {
                inst.duration = null;
            }
        };

        /** An actionable normal turn begins (not a skipped turn, not a Haste bonus action). */
        P.beginNormalTurn = function (actor) { actor.normalTurns = (actor.normalTurns || 0) + 1; };

        /** An actionable normal turn ends: count down this actor's applier_turns windows. */
        P.endNormalTurn = function (actor) {
            if (!this.combat) return;
            for (const x of [this.player, ...this.combat.enemies, ...this.combat.minions]) {
                x.statusEffects = x.statusEffects.filter((s) => {
                    if (s.policy !== 'applier_turns' || s.appliedBy !== actor.id) return true;
                    if (s.appliedSeq >= (actor.normalTurns || 0)) return true; // applied during this turn
                    if (--s.duration > 0) return true;
                    if (x.hp > 0) this.say(`[${s.name}] wears off ${x.name}.`);
                    return false;
                });
            }
        };

        /** The holder's next scheduled turn begins (acting or skipped): end holder_next_turn_start statuses. */
        P.expireAtTurnStart = function (actor) {
            actor.statusEffects = actor.statusEffects.filter((s) => {
                if (s.policy !== 'holder_next_turn_start') return true;
                this.say(`[${s.name}] wears off ${actor.name}.`);
                return false;
            });
        };

        /** QA-1 applier-death ruling: `actor` just died; its marks expire at the end of this round. */
        P.orphanStatusesOf = function (actor) {
            if (!this.combat || !actor) return;
            for (const x of [this.player, ...this.combat.enemies, ...this.combat.minions]) {
                for (const s of x.statusEffects) if (s.appliedBy === actor.id && s.onApplierDeath === 'end_of_round') s.orphaned = true;
            }
        };

        /** Can this attacker use (and consume) the mark? Only the applier's side, if the policy says so. */
        P.markEligible = function (attacker, mark) {
            if (mark.consumeOn !== 'positive_allied_hit') return true;
            const side = mark.applierSide || this.sideOf(this.findCombatant(mark.appliedBy));
            return this.sideOf(attacker) === side;
        };

        // ---------------------------------------------------------------
        // Damage over time
        // ---------------------------------------------------------------
        P.dotTickDamage = function (s) {
            let dmg = this.intensity(s);
            if (s.name === 'Infection' && this.player && this.hasTrait('All infections deal +2 dmg/turn')) dmg += 2;
            return Math.floor(dmg);
        };

        P.tickDots = function (actor) {
            for (const dot of actor.statusEffects.filter((s) => s.type === 'dot')) {
                if (actor.hp <= 0) break;
                const dmg = this.dotTickDamage(dot);
                const after = Math.max(0, actor.hp - dmg);
                this.say(`${actor.name} suffers ${dmg} ${dot.name} damage${dot.stacks > 1 ? ` (x${dot.stacks})` : ''}. (${after}/${actor.maxHp} HP)`);
                this.damage(actor, dmg, this.findCombatant(dot.appliedBy));
            }
        };

        P.applyDot = function (source, target, { name, value, duration }) {
            if (source && source.isPlayer && this.hasTrait('DoTs last +1 turn')) duration += 1;
            const inst = this.applyStatus(source, target, { name, type: 'dot', value, duration });
            if (inst) this.say(`${target.name} is afflicted with ${name} (${this.dotTickDamage(inst)} dmg/turn for ${inst.duration} turns).`);
            return inst;
        };

        /** Infection keeps its preserved base values from statusDefinitions (2/stack, cap 3, 3 turns). */
        P.infect = function (source, target, stacks, opts = {}) {
            if (!target || target.hp <= 0 || stacks <= 0) return null;
            const def = this.statusDef('Infection');
            let duration = opts.duration || def.duration;
            if (source && source.isPlayer && this.hasTrait('DoTs last +1 turn')) duration += 1;
            const before = this.infectionOn(target);
            const spread = !!opts.spreadOnDeath || !!(before && before.spreadOnDeath);
            const inst = this.applyStatus(source, target, { name: 'Infection', type: 'dot', value: def.value, duration, stacks, spreadOnDeath: spread });
            if (inst) this.say(`${target.name} is infected (${inst.stacks}/${this.maxStacks('Infection')} stacks, ${this.dotTickDamage(inst)} dmg/turn).`);
            return inst;
        };

        // ---------------------------------------------------------------
        // Overflow Burst (rules 7–9)
        // ---------------------------------------------------------------
        P.overflowConfig = function (name) {
            const o = this.statusDef(name).overflow;
            if (!o || !['baseChance', 'chanceStep', 'maxChance', 'burstMultiplier'].every((k) => isNum(o[k]))) return null;
            return o;
        };

        P.rollOverflow = function (source, target, inst) {
            const o = this.overflowConfig(inst.name);
            if (!o || inst.type !== 'dot') return;
            if (!isNum(inst.overflowChance)) inst.overflowChance = o.baseChance;
            if (this.rng() < inst.overflowChance) {
                const dmg = Math.floor(this.dotTickDamage(inst) * o.burstMultiplier);
                inst.overflowChance = o.baseChance;                       // rule 8: success resets
                this.say(`${inst.name} OVERFLOWS on ${target.name}! Burst for ${dmg} damage.`, { important: true });
                this.damage(target, dmg, source);
            } else {
                inst.overflowChance = Math.min(o.maxChance, inst.overflowChance + o.chanceStep); // rule 8: failure raises
            }
        };

        // ---------------------------------------------------------------
        // Control Resistance (rules 3–5)
        // ---------------------------------------------------------------
        P.crConfig = function () {
            const cr = this.statusRules().controlResistance || {};
            const tiers = cr.tierMultipliers || {};
            const ok = isNum(cr.threshold) && isNum(cr.recoveryPerRound) && isNum(cr.releaseThreshold)
                && ['regular', 'elite', 'boss', 'player', 'summon'].every((t) => isNum(tiers[t]));
            return ok ? cr : null;
        };

        P.isHardControl = function (name) {
            const def = this.statusDef(name);
            return def.control === 'hard' && isNum(def.crGain) && !!this.crConfig();
        };

        P.addControlResistance = function (target, name) {
            const cr = this.crConfig();
            target.cr = target.cr || { value: 0, immune: false };
            target.cr.value += this.statusDef(name).crGain * cr.tierMultipliers[this.tierOf(target)];
            if (!target.cr.immune && target.cr.value >= cr.threshold) {
                target.cr.immune = true; // this application already succeeded; immunity starts with the next one
                this.say(`${target.name} has built up Control Resistance — immune to further hard control for now.`);
            }
        };

        P.recoverControlResistance = function (x) {
            const cr = this.crConfig();
            if (!cr || !x.cr) return;
            x.cr.value = Math.max(0, x.cr.value - cr.recoveryPerRound);
            if (x.cr.immune && x.cr.value < cr.releaseThreshold) {
                x.cr.immune = false;
                this.say(`${x.name}'s Control Resistance fades.`);
            }
        };

        // ---------------------------------------------------------------
        // Selective cleansing (rule 12)
        // ---------------------------------------------------------------
        /** spec = { categories: [...] } and/or { statuses: [...] }. There is deliberately no "remove all" default. */
        P.cleanse = function (target, spec) {
            const cats = spec.categories || [];
            const names = spec.statuses || [];
            if (!cats.length && !names.length) throw new Error('cleanse needs `categories` or `statuses` — there is no default "remove everything"');
            const removed = target.statusEffects.filter((s) => cats.includes(s.category) || names.includes(s.name));
            target.statusEffects = target.statusEffects.filter((s) => !removed.includes(s));
            return removed;
        };

        // ---------------------------------------------------------------
        // Cross-status reactions (rules 13–15)
        // ---------------------------------------------------------------
        /** Rule 15: character-driven probability. Design Decision 16 is PAUSED, so this adds nothing yet. */
        P.reactionChanceModifier = function (/* source, recipe */) { return 0; };

        P.unsafeReactionIndexes = function () {
            if (!this._unsafeReactions) this._unsafeReactions = new Set(findUnsafeReactions(this.data.statusReactions).map((u) => u.index));
            return this._unsafeReactions;
        };

        P.rollReactions = function (source, target, appliedName, existingNames) {
            const unsafe = this.unsafeReactionIndexes();
            const recipes = this.data.statusReactions || [];
            // Technical backstop only (cycles are already filtered out): a chain can't be longer than the recipe list.
            this._reactionDepth = (this._reactionDepth || 0) + 1;
            try {
                if (this._reactionDepth > recipes.length + 1) throw new Error('reaction chain longer than the recipe list — invalid reaction data');
                this.rollReactionsInner(source, target, appliedName, existingNames, unsafe, recipes);
            } finally {
                this._reactionDepth--;
            }
        };

        P.rollReactionsInner = function (source, target, appliedName, existingNames, unsafe, recipes) {
            for (const [i, r] of recipes.entries()) {
                if (unsafe.has(i)) continue;                                     // QA-4: self-looping recipes are disabled
                if (!Array.isArray(r.pair) || !isNum(r.baseChance)) continue; // incomplete recipes stay off
                const [a, b] = r.pair;
                const other = appliedName === a ? b : appliedName === b ? a : null;
                if (!other || !existingNames.includes(other)) continue;       // needs BOTH: new + already present
                const chance = r.baseChance + this.reactionChanceModifier(source, r);
                if (this.rng() >= chance) continue;
                this.say(`Reaction! ${r.name || r.pair.join(' + ')} on ${target.name}.`, { important: true });
                this.runReactionOutcome(source, target, r);
            }
        };

        /** Generic building blocks for reaction outcomes; designers compose them in statusReactions. */
        P.runReactionOutcome = function (source, target, r) {
            for (const o of [].concat(r.outcome || [])) {
                if (o.type === 'damage' && isNum(o.amount)) this.damage(target, o.amount, source);
                else if (o.type === 'remove_statuses') for (const n of o.statuses || []) { const s = this.findStatus(target, n); if (s) this.removeStatus(target, s); }
                else if (o.type === 'apply_status' && o.status) this.applyStatus(source, target, o.status);
            }
        };
    }

    const ENSO = global.ENSO || (global.ENSO = {});
    install.findUnsafeReactions = findUnsafeReactions;
    ENSO.installStatusSystem = install;
    if (typeof module !== 'undefined' && module.exports) module.exports = install;
})(typeof window !== 'undefined' ? window : globalThis);
