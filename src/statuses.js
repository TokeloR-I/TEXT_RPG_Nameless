/* =========================================================================
 * Enso's Last Stand — STATUS EFFECT SYSTEM
 * Implements "ENSO Status Effects: Approved Design Handoff" (22 Oct 2026).
 *
 * ONE pipeline for everyone (approved rule 10): players, enemies and summons
 * all apply statuses through engine.applyStatus(source, target, spec).
 *
 *   applyStatus ─► affinity (immune / resist / vulnerable)       rule 6
 *               ─► Control Resistance gate (Package 2)          cap / halve / resist
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

        P.maxStacks = function (name, type) {
            const def = this.statusDef(name);
            // Real-time combat: every damage-over-time status stacks to realtimeRules.statuses.dotMaxStacks (99).
            const rt = this.rtActive && this.rtActive() && (this.data.realtimeRules || {}).statuses;
            if (rt && (def.category === 'dot' || (def.type || type) === 'dot') && isNum(rt.dotMaxStacks)) return rt.dotMaxStacks;
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
            if (c && c.rt) return (c.rt.actorId && this.findCombatant(c.rt.actorId)) || this.player;   // real-time: whoever is acting
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

            // --- Control Resistance gate (Package 2): cap, halve or resist from the pre-application CR
            const control = this.controlClass(name, spec.type || def.type);
            if (control) {
                const gate = this.controlGate(target, name, control, duration, spec.value);
                if (gate.blocked) { this.say(gate.message); return null; }
                if (gate.value !== spec.value) spec = { ...spec, value: gate.value };
                duration = gate.duration;
                if (gate.message) this.say(gate.message);
            }

            // --- rule 2: one instance per status per target; stack intensity up to cap, refresh duration
            const existingNames = target.statusEffects.map((s) => s.name);
            const cap = this.maxStacks(name, spec.type);
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
            if (this.rtActive && this.rtActive()) this.rtStatusApplied(inst);   // real-time: durations in ms (src/engine/realtime.js)

            // --- rules 7–9: Overflow Burst when re-applied while already capped
            if (wasAtCap) this.rollOverflow(source, target, inst);

            // --- CR-01: build CR after the control has succeeded
            if (control) this.gainControlResistance(target, name, control);

            // --- rules 13–15: reactions with statuses that were already there
            this.rollReactions(source, target, name, existingNames);
            return inst;
        };

        /** Compatibility shim: older code adds statuses with (target, status[, source]). */
        P.addStatus = function (target, status, source) {
            return this.applyStatus(source || this.currentActor(), target, status);
        };

        P.removeStatus = function (c, inst) {
            c.statusEffects = c.statusEffects.filter(s => s !== inst);
            if (inst && inst.type === 'soul_link' && this.combat) {
                const owner = this.findCombatant(inst.appliedBy);
                if (owner) this.activeSoulLinks(owner);
            }
        };

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
            }
            // A link whose members expired on different initiative turns never
            // survives as an orphaned, one-member group.
            for (const actor of [this.player, ...c.enemies, ...c.minions]) {
                if (actor.hp > 0) this.activeSoulLinks(actor);
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
            if (inst && source && source.isPlayer && this.hasTrait('All DoTs become true dmg, ignore resistances.')) inst.trueDamage = true;
            if (inst && inst.rtTotalMs != null) this.say(`${target.name} is afflicted with ${name}${inst.stacks > 1 ? ` x${inst.stacks}` : ''} (${this.dotTickDamage(inst)} dmg every ${this.rtTickMs(inst) / 1000}s for ${inst.rtTotalMs / 1000}s).`);
            else if (inst) this.say(`${target.name} is afflicted with ${name} (${this.dotTickDamage(inst)} dmg/turn for ${inst.duration} turns).`);
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
            if (inst && source && source.isPlayer && this.hasTrait('All DoTs become true dmg, ignore resistances.')) inst.trueDamage = true;
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
        // Control Resistance: Vaelis Package 2 (CR-01..03), one central policy.
        // Numbers live in data.statusRules.controlResistance; classes in statusDefinitions[*].control.
        //   x.cr = { value, controlled, protectNext, cast }   fight-local, plain JSON (saves/rolls back)
        //     value        0..max; starts by tier (created lazily, so crValue() is the reader)
        //     controlled   a control effect landed since the holder's last opportunity (blocks decay)
        //     protectNext  boss only: the last opportunity was a hard skip, so the next can't be
        //     cast         { id, before, gained }: one cast = one CR snapshot and one (largest) gain
        // Timing runs through the T-0 hooks (src/engine/timers.js): crBeginOpportunity / crEndOpportunity.
        // ---------------------------------------------------------------
        /** The Package 2 numbers, or null (CR off) if any is missing, so a partial or old-style config can't half-run. */
        P.crRules = function () {
            const r = this.statusRules().controlResistance;
            if (!r || !r.start || !r.gain) return null;
            const nums = [r.max, r.capAt, r.resistAt, r.capTurns, r.softStrength, r.decayPerOpportunity, r.gain.hard, r.gain.soft];
            return nums.every(isNum) ? r : null;
        };

        /** 'hard' | 'soft' | null. Anything that skips a turn is hard whatever its name (CR-03). */
        P.controlClass = function (name, type) {
            if (!this.crRules() || !this.combat) return null;
            if (type === 'skip_turn') return 'hard';
            const c = this.statusDef(name).control;
            return c === 'hard' || c === 'soft' ? c : null;
        };

        P.crStart = function (x) { return (this.crRules().start || {})[this.tierOf(x)] || 0; };
        P.crValue = function (x) {
            if (!this.crRules()) return 0;
            return x.cr ? x.cr.value : this.crStart(x);
        };
        P.crState = function (x) {
            if (!x.cr) x.cr = { value: this.crStart(x), controlled: false, protectNext: false, cast: null };
            return x.cr;
        };
        P.crProtects = function (x) { return (this.crRules().noConsecutiveHardSkip || []).includes(this.tierOf(x)); };

        /** Halve a soft-control strength, rounded toward zero (fractions such as Slow's 0.5 at 1% steps). */
        P.crWeaken = function (value) {
            const k = this.crRules().softStrength;
            return Number.isInteger(value) ? Math.trunc(value * k) : Math.trunc(Math.round(value * k * 1e6) / 1e4) / 100;
        };

        /**
         * CR-02 step 2: what the target's CR does to this application. Pure apart from the cast snapshot.
         * Returns { blocked, reason, message, duration, value, before }.
         */
        P.controlGate = function (target, name, control, duration, value) {
            const r = this.crRules();
            const st = this.crState(target);
            const castId = this.combat.currentCastId || null;
            if (castId && (!st.cast || st.cast.id !== castId)) st.cast = { id: castId, before: st.value, gained: 0 };
            const before = castId ? st.cast.before : st.value;
            const binary = !!this.statusDef(name).binary || typeof value !== 'number';
            const capped = typeof duration === 'number' ? Math.min(duration, r.capTurns) : r.capTurns;
            const out = { blocked: false, reason: null, message: null, duration, value, before };
            if (control === 'hard' && st.protectNext) {
                return { ...out, blocked: true, reason: 'protected', message: `${target.name} resists ${name}! (It can't lose two turns in a row.)` };
            }
            if (before >= r.resistAt) {
                if (control === 'hard' || binary) return { ...out, blocked: true, reason: 'control_resistance', message: `${target.name} resists ${name}! (Control Resistance ${before})` };
                return { ...out, duration: capped, value: this.crWeaken(value), message: `(Control Resistance ${before}: ${name} at half strength for ${capped} turn.)` };
            }
            if (before >= r.capAt) {
                const shortened = capped !== duration;
                return { ...out, duration: capped, message: shortened ? `(Control Resistance ${before}: ${name} lasts ${capped} turn.)` : null };
            }
            return out;
        };

        /** CR-01: after a successful control application. One cast gives each target its largest gain once. */
        P.gainControlResistance = function (target, name, control) {
            const r = this.crRules();
            const st = this.crState(target);
            const amount = r.gain[control] || 0;
            const castId = this.combat.currentCastId || null;
            let add = amount;
            if (castId && st.cast && st.cast.id === castId) {
                add = Math.max(0, amount - st.cast.gained);
                st.cast.gained = Math.max(st.cast.gained, amount);
            }
            st.controlled = true;
            const before = st.value;
            st.value = Math.min(r.max, st.value + add);
            if (st.value !== before) this.say(`(${target.name}: Control Resistance ${before} → ${st.value}.)`);
        };

        /** The holder's turn would be skipped. A protected boss keeps it (CR-01: no two hard skips in a row). */
        P.turnSkipped = function (actor) {
            if (!actor.statusEffects.some((s) => s.type === 'skip_turn')) return false;
            if (actor.cr && actor.cr.protectNext && this.crRules()) {
                this.say(`${actor.name} shakes it off: it can't lose two turns in a row.`);
                return false;
            }
            return true;
        };

        /** T-0 hook: an opportunity begins. A hard skip of a protected tier protects the next one. */
        P.crBeginOpportunity = function (actor, skipped) {
            if (skipped && this.crRules() && this.crProtects(actor)) this.crState(actor).protectNext = true;
        };

        /** T-0 hook: an opportunity ends (skipped ones too, never Haste bonus actions). CR-02 step 5. */
        P.crEndOpportunity = function (actor, skipped) {
            const r = this.crRules();
            if (!r) return;
            const st = actor.cr;
            if (st && !skipped) st.protectNext = false;
            if (st && st.controlled) { st.controlled = false; return; }
            const v = this.crValue(actor);
            const floor = r.decayFloor || 0;
            if (v > floor) this.crState(actor).value = Math.max(floor, v - r.decayPerOpportunity);
        };

        /** Availability hint for a control effect on a target: an on-hit outcome, never a refusal (matrix 11). */
        P.controlPreview = function (target, name, type, duration) {
            const control = this.controlClass(name, type);
            if (!control) return null;
            const r = this.crRules();
            const v = this.crValue(target);
            if (control === 'hard' && target.cr && target.cr.protectNext) return { code: 'CONTROL_RESISTED', message: `${target.name} can't lose two turns in a row: ${name} will be resisted.` };
            if (v >= r.resistAt) {
                if (control === 'hard' || this.statusDef(name).binary) return { code: 'CONTROL_RESISTED', message: `Control Resistance ${v}: ${name} will be resisted.` };
                return { code: 'CONTROL_WEAKENED', message: `Control Resistance ${v}: ${name} at half strength for ${r.capTurns} turn.` };
            }
            if (v >= r.capAt && typeof duration === 'number' && duration > r.capTurns) return { code: 'CONTROL_CAPPED', message: `Control Resistance ${v}: ${name} lasts ${r.capTurns} turn.` };
            return null;
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
            for (const s of removed.filter(s => s.type === 'soul_link')) {
                const owner = this.findCombatant(s.appliedBy);
                if (owner) this.activeSoulLinks(owner);
            }
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
