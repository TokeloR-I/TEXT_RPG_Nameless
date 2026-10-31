/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Real-time combat (combat v2)
 * docs/REALTIME_COMBAT.md. Numbers: realtimeRules in src/data.js.
 *
 * The engine still owns no clock. A front end that runs a real-time fight
 * calls engine.tick(ms) as time passes (world-ui calls it ~10 times a second);
 * tick() simulates exactly that much fight time and returns its events. The
 * same seed and the same tick/act sequence always give the same fight.
 *
 *   new GameEngine({ combatMode: 'realtime' })   real-time fights
 *   new GameEngine()                             legacy turn-based fights (default;
 *                                                tests, text game, balance bot)
 *
 * What changes in a real-time fight:
 *   - No turns. The player acts whenever a skill is ready: each skill has its own
 *     cooldown (seconds) and skills share a short global cooldown. The basic attack
 *     has its own swing timer (from SPD) and ignores the global cooldown.
 *   - Enemies and minions act on their own clocks (from SPD). An enemy winds up
 *     first ("readies Heavy Slash"), so a stun during the wind-up interrupts it.
 *   - Every status is timed: a duration written in turns lasts secondsPerTurn per
 *     turn. DoTs tick on their own clock and stack to 99; each stack above 1
 *     shortens the tick interval (realtimeRules.statuses).
 *   - A "pulse" every pulseSeconds does what the end of a round did: resource
 *     regen, Soul Energy, bombs, round counter.
 *   - Up to 6 skills sit on the skill bar (player.skillBar). New skills fill an
 *     empty slot; set_skill_slot swaps them outside combat.
 * Every action is still one opportunity (beginOpportunity / endOpportunity), so
 * Control Resistance, combat timers and Possession keep one rules path.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    class RealtimeMethods {
        // =====================================================================
        // Mode and rules
        // =====================================================================
        /** Is the current fight a real-time one? */
        rtActive() { return this.mode === 'combat' && !!(this.combat && this.combat.rt); }
        rtRules() { return this.data.realtimeRules || {}; }
        rtTurnsToMs(turns) { return Math.round(turns * (this.rtRules().secondsPerTurn || 3) * 1000); }

        /** Seconds between two actions of this combatant (faster SPD, shorter interval). */
        rtIntervalMs(actor) {
            const r = this.rtRules();
            const rule = actor.isPlayer ? r.basicAttack : actor.isMinion ? r.minion : r.enemy;
            const base = rule.swingSeconds != null ? rule.swingSeconds : rule.actionSeconds;
            const s = base * (rule.referenceSpeed || 10) / this.speedOf(actor);
            return Math.round(clamp(s, rule.minSeconds || 0.5, rule.maxSeconds || 10) * 1000);
        }

        /** A skill's cooldown in ms: its own `cooldown` (seconds), else from its cost. */
        rtCooldownMs(name) {
            const skill = this.data.skillDefinitions[name] || {};
            const r = this.rtRules().cooldowns || {};
            if (isNum(skill.cooldown)) return Math.round(skill.cooldown * 1000);
            if (skill.cost === 'all') return Math.round((r.allCostSeconds || 15) * 1000);
            return Math.round(((r.baseSeconds || 3) + (r.perCostSeconds || 2) * (Number(skill.cost) || 0)) * 1000);
        }

        /** DoT tick interval: each stack above 1 shortens it, down to the floor. */
        rtTickMs(status) {
            const r = this.rtRules().statuses || {};
            const stacks = Math.max(1, status.stacks || 1);
            const s = (r.tickSeconds || 1) / (1 + (r.perStackSpeedup || 0) * (stacks - 1));
            return Math.round(Math.max(r.minTickSeconds || 0.25, s) * 1000);
        }

        // =====================================================================
        // Skill bar (up to realtimeRules.skillBar.slots active skills)
        // =====================================================================
        skillBarSlots() { return ((this.rtRules().skillBar || {}).slots) || 6; }

        /** The bar cleaned up (pure): unknown skills removed, newly learned skills in the first empty slots. */
        computeSkillBar() {
            const p = this.player;
            const n = this.skillBarSlots();
            const basic = this.basicAttackName();
            const bar = Array.isArray(p.skillBar) ? p.skillBar.slice(0, n) : [];
            while (bar.length < n) bar.push(null);
            for (let i = 0; i < n; i++) if (bar[i] && (!p.skills.includes(bar[i]) || bar[i] === basic || bar.indexOf(bar[i]) !== i)) bar[i] = null;
            // A newly learned skill takes the first empty slot, once: a skill you took off the bar stays off.
            const seen = Array.isArray(p.skillBarSeen) ? [...p.skillBarSeen] : [];
            for (const name of p.skills) {
                if (name === basic || bar.includes(name) || seen.includes(name)) continue;
                const free = bar.indexOf(null);
                if (free < 0) break;
                bar[free] = name;
            }
            for (const name of bar) if (name && !seen.includes(name)) seen.push(name);
            return { bar, seen };
        }

        /** Store the cleaned-up bar on the player and return it. */
        ensureSkillBar() {
            if (!this.player) return [];
            const { bar, seen } = this.computeSkillBar();
            this.player.skillBar = bar;
            this.player.skillBarSeen = seen;
            return bar;
        }

        /** For HUDs (pure): [{ slot, skillId }] with null skillId for an empty slot. */
        skillBarView() {
            if (!this.player) return [];
            return this.computeSkillBar().bar.map((skillId, slot) => ({ slot, skillId: skillId || null }));
        }

        /** Learned skills that are not on the bar (what a swap can bring in). */
        skillBarBench() {
            const p = this.player;
            const { bar } = this.computeSkillBar();
            return p.skills.filter((s) => s !== this.basicAttackName() && !bar.includes(s));
        }

        /** Put a learned skill in a slot (or clear it with skillId null). Out of combat only. */
        setSkillSlot(slot, skillId) {
            const p = this.player;
            const n = this.skillBarSlots();
            if (this.mode === 'combat') { this.refuse('IN_COMBAT', "You can't change your skill bar during a fight."); return; }
            if (!Number.isInteger(slot) || slot < 0 || slot >= n) { this.refuse('INVALID_SLOT', `Skill bar slots are 1 to ${n}.`); return; }
            const bar = this.ensureSkillBar();
            if (skillId == null) {
                bar[slot] = null;
                this.say(`Slot ${slot + 1} cleared.`);
                return;
            }
            if (!p.skills.includes(skillId)) { this.refuse('SKILL_NOT_KNOWN', `You don't know the skill '${skillId}'.`); return; }
            if (skillId === this.basicAttackName()) { this.refuse('INVALID_SLOT', `${skillId} is your basic attack; it is always ready and needs no slot.`); return; }
            const from = bar.indexOf(skillId);
            if (from >= 0) bar[from] = bar[slot];   // already on the bar: the two slots swap
            bar[slot] = skillId;
            this.say(`${skillId} is in slot ${slot + 1}.`);
        }

        // =====================================================================
        // Starting a real-time fight (startCombat calls this instead of the round loop)
        // =====================================================================
        rtBegin() {
            const c = this.combat;
            const r = this.rtRules();
            c.round = 1;
            c.rt = { now: 0, nextPulseAt: Math.round((r.pulseSeconds || 3) * 1000), cooldowns: {}, gcdUntil: 0, gcdMs: 0, basicReadyAt: 0, basicMs: 0, actors: {}, actorId: null, targetId: null };
            c.order = [this.player, ...this.alive(c.enemies), ...this.alive(c.minions)].sort((a, b) => this.speedOf(b) - this.speedOf(a));
            c.idx = 0;
            c.rt.targetId = (this.alive(c.enemies)[0] || {}).id || null;
            this.ensureSkillBar();
            c.awaitingPlayer = true;
            if (this.combatMode === 'action') {   // combat v3: the action sim decides when enemies and minions attack (action.js)
                c.rt.external = true;
                c.action = { groups: {}, casts: {}, nextCastId: 0, nextEnemyId: c.enemies.length, windups: {} };
                return;
            }
            const opening = Math.round(((r.enemy || {}).openingSeconds || 1) * 1000);
            this.alive(c.enemies).forEach((e, i) => this.rtSchedule(e, opening + i * 250));
            this.say('--- Real-time battle! Skills 1-6, basic attack any time. ---', { important: true });
        }

        rtActor(actor) {
            const rt = this.combat.rt;
            return rt.actors[actor.id] || (rt.actors[actor.id] = { nextActionAt: null, intervalMs: 0, windup: null });
        }

        /** Book this combatant's next action `delay` ms from now (default: one interval). */
        rtSchedule(actor, delay = null) {
            const a = this.rtActor(actor);
            a.intervalMs = this.rtIntervalMs(actor);
            a.nextActionAt = this.combat.rt.now + (delay != null ? delay : a.intervalMs);
            return a;
        }

        // =====================================================================
        // Time
        // =====================================================================
        /** Public API: simulate `ms` of fight time. Returns events. Does nothing outside a real-time fight. */
        tick(ms) {
            if (!this.rtActive()) return this.flush();
            const step = clamp(Number(ms) || 0, 0, this.rtRules().maxStepMs || 1000);
            if (step <= 0) return this.flush();
            if (this.rtQuietUntil(step)) { this.combat.rt.now += step; return this.flush(); }   // nothing due: skip the transaction (60 Hz callers)
            return this.transact(() => this.rtAdvance(step));
        }

        rtAdvance(ms) {
            const rt = this.combat.rt;
            const end = rt.now + ms;
            let safety = 0;
            while (this.rtActive()) {
                if (++safety > 5000) throw new Error('Real-time loop ran away (an event that never moves forward?)');
                const next = this.rtNextEventAt();
                if (next == null || next > end) { this.combat.rt.now = end; return; }
                this.combat.rt.now = Math.max(this.combat.rt.now, next);
                if (this.rtProcessDue()) return;
            }
        }

        /** Pure: is nothing due in the next `ms`? (Every living non-player already has its clock, so rtNextEventAt won't book one.) */
        rtQuietUntil(ms) {
            const rt = this.combat.rt;
            for (const x of this.rtLiving()) if (!x.isPlayer && !rt.external && !rt.actors[x.id]) return false;
            const next = this.rtNextEventAt();
            return next != null && next > rt.now + ms;
        }

        rtLiving() { const c = this.combat; return [this.player, ...this.alive(c.enemies), ...this.alive(c.minions)].filter((x) => x.hp > 0); }

        /** The earliest pending event (status tick or expiry, wind-up, action, pulse). */
        rtNextEventAt() {
            const rt = this.combat.rt;
            let t = rt.nextPulseAt;
            const take = (v) => { if (isNum(v) && v < t) t = v; };
            for (const x of this.rtLiving()) {
                for (const s of x.statusEffects) { take(s.rtEndsAt); if (s.type === 'dot') take(s.rtNextTickAt); }
                if (x.isPlayer || rt.external) continue;
                const a = rt.actors[x.id];
                if (!a) { this.rtSchedule(x); take(rt.actors[x.id].nextActionAt); continue; }   // a new summon
                take(a.windup ? a.windup.landsAt : a.nextActionAt);
            }
            return t;
        }

        /** Everything due now, in a fixed order. Returns true if the fight ended. */
        rtProcessDue() {
            const rt = this.combat.rt;
            const now = rt.now;
            const ended = () => !this.rtActive() || this.checkBattleEnd();
            // 1. statuses: DoT ticks, then expiries
            for (const x of this.rtLiving()) {
                for (const s of x.statusEffects.filter((st) => st.type === 'dot' && isNum(st.rtNextTickAt) && st.rtNextTickAt <= now)) {
                    if (x.hp <= 0 || !x.statusEffects.includes(s)) break;
                    s.rtNextTickAt = now + this.rtTickMs(s);
                    this.rtTickDot(x, s);
                    if (ended()) return true;
                }
                const gone = x.statusEffects.filter((st) => isNum(st.rtEndsAt) && st.rtEndsAt <= now);
                for (const s of gone) {
                    this.removeStatus(x, s);
                    if (x.hp > 0) this.say(`[${s.name}] wears off ${x.name}.`);
                }
            }
            // 2. wind-ups that land, 3. actions that start
            for (const x of this.rtLiving()) {
                if (x.isPlayer || rt.external) continue;
                const a = rt.actors[x.id];
                if (!a) continue;
                if (a.windup && a.windup.landsAt <= now) { this.rtLand(x); if (ended()) return true; }
                else if (!a.windup && isNum(a.nextActionAt) && a.nextActionAt <= now) { this.rtAct(x); if (ended()) return true; }
            }
            // 4. the pulse (what the end of a round did)
            if (rt.nextPulseAt <= now) { this.rtPulse(); if (ended()) return true; }
            return false;
        }

        rtTickDot(actor, dot) {
            const dmg = this.dotTickDamage(dot);
            const after = Math.max(0, actor.hp - dmg);
            this.say(`${actor.name} suffers ${dmg} ${dot.name} damage${dot.stacks > 1 ? ` (x${dot.stacks})` : ''}. (${after}/${actor.maxHp} HP)`);
            this.damage(actor, dmg, this.findCombatant(dot.appliedBy));
        }

        rtPulse() {
            const c = this.combat;
            const rt = c.rt;
            this.endRoundResources();
            // QA-1 applier-death ruling: an orphaned mark lasts to the end of this pulse
            for (const x of this.rtLiving()) for (const s of x.statusEffects.filter((st) => st.orphaned)) {
                this.removeStatus(x, s);
                this.say(`[${s.name}] wears off ${x.name}.`);
            }
            c.hpHistory.push(this.player.hp);
            this.detonateBombs();
            for (const x of this.rtLiving()) if (x.hp > 0) this.tickSoulFeast(x);
            c.round++;
            c.playerActedThisRound = false;
            c.freeMarkUsedThisRound = false;
            rt.nextPulseAt += Math.round((this.rtRules().pulseSeconds || 3) * 1000);
        }

        // =====================================================================
        // Enemy and minion actions
        // =====================================================================
        /** A combatant's clock came up: skipped (stunned), a minion's attack, or an enemy's wind-up. */
        rtAct(actor) {
            const c = this.combat;
            c.rt.actorId = actor.id;
            if (!actor.isMinion) this.springTrap(actor);
            if (actor.hp <= 0) return;
            if (this.turnSkipped(actor)) {
                this.beginOpportunity(actor, { skipped: true });
                this.endOpportunity(actor, { skipped: true });
                this.say(`${actor.name} is unable to act!`);
                this.rtSchedule(actor);
                return;
            }
            this.beginOpportunity(actor);
            if (actor.isMinion) {
                this.minionTurn(actor);
                this.endOpportunity(actor);
                this.rtSchedule(actor);
                return;
            }
            if (this.isPossessed(actor)) { this.rtPossessedAct(actor); return; }
            const skill = actor.skills.length ? actor.skills[Math.floor(this.rng() * actor.skills.length)] : this.data.skillDefinitions['Basic Attack'];
            const windupMs = Math.round(((this.rtRules().enemy || {}).windupSeconds || 0) * 1000);
            const a = this.rtActor(actor);
            a.nextActionAt = null;
            a.windup = { skill: skill.name, targetId: this.rtEnemyTarget(actor).id, startedAt: c.rt.now, landsAt: c.rt.now + windupMs };
            this.say(`${actor.name} readies ${skill.name}!`);
        }

        /** Taunt and taunt_player decide who an enemy hits (same rule as enemyTurn). */
        rtEnemyTarget(enemy) {
            const taunter = this.alive(this.combat.minions).find((m) => m.statusEffects.some((s) => s.type === 'taunt'));
            return this.statusOfType(enemy, 'taunt_player') ? this.player : (taunter || this.player);
        }

        /** The wind-up ends: the blow lands, unless a stun interrupted it. */
        rtLand(enemy) {
            const c = this.combat;
            const a = this.rtActor(enemy);
            const w = a.windup;
            a.windup = null;
            c.rt.actorId = enemy.id;
            if (enemy.statusEffects.some((s) => s.type === 'skip_turn')) {
                this.say(`${enemy.name}'s ${w.skill} is interrupted!`, { important: true });
                this.endOpportunity(enemy);
                this.rtSchedule(enemy);
                return;
            }
            let skill = enemy.skills.find((s) => s.name === w.skill) || this.data.skillDefinitions['Basic Attack'];
            if (this.statusOfType(enemy, 'silence')) {
                skill = this.data.skillDefinitions['Basic Attack'];
                this.say(`${enemy.name} is silenced and can only flail.`);
            }
            enemy.lastSkillUsed = skill.name;
            this.castSkill(enemy, skill, [this.rtEnemyTarget(enemy)]);
            if (this.rtActive()) { this.endOpportunity(enemy); this.rtSchedule(enemy); }
        }

        /** N-5 in real time there's no pause to choose: a possessed enemy turns on one of its allies. */
        rtPossessedAct(enemy) {
            const allies = this.alive(this.combat.enemies).filter((e) => e !== enemy);
            const skill = enemy.skills[0] || this.data.skillDefinitions['Basic Attack'];
            if (allies.length) {
                this.say(`${enemy.name} turns on its allies!`, { important: true });
                this.castSkill(enemy, skill, [allies[Math.floor(this.rng() * allies.length)]]);
            } else this.say(`${enemy.name} stands still, fighting your will.`);
            if (this.rtActive()) { this.endOpportunity(enemy); this.rtSchedule(enemy); }
        }

        // =====================================================================
        // Player actions
        // =====================================================================
        /** Real-time combat actions (performCombat sends them here). */
        rtPerformCombat(a) {
            const c = this.combat;
            const ids = Array.isArray(a.targetIds) ? a.targetIds : a.targetId != null ? [a.targetId] : this.rtDefaultTarget();
            switch (a.type) {
                case 'attack': this.useSkill(this.basicAttackName(), { ids }, { viaAttack: true }); return;
                case 'skill': {
                    const name = a.skillId;
                    if (!name || !this.data.skillDefinitions[name]) { this.refuseCombat('UNKNOWN_SKILL', `Unknown skill '${name}'.`); return; }
                    if (!this.player.skills.includes(name) && name !== this.basicAttackName()) { this.refuseCombat('SKILL_NOT_KNOWN', `You don't know the skill '${name}'.`); return; }
                    this.useSkill(name, { ids }, {});
                    return;
                }
                case 'skill_slot': {
                    const bar = this.ensureSkillBar();
                    const name = Number.isInteger(a.slot) ? bar[a.slot] : null;
                    if (!name) { this.refuseCombat('EMPTY_SLOT', `Skill bar slot ${Number(a.slot) + 1} is empty.`); return; }
                    this.useSkill(name, { ids }, {});
                    return;
                }
                case 'set_target': {
                    const t = this.alive(c.enemies).find((e) => e.id === a.targetId);
                    if (!t) { this.refuseCombat('INVALID_TARGET', `Invalid target '${a.targetId}'.`); return; }
                    c.rt.targetId = t.id;
                    return;
                }
                case 'use_item':
                    if (!a.item || !this.player.inventory.includes(a.item)) { this.refuseCombat('NO_ITEM', a.item ? `You don't have a '${a.item}'.` : 'Use what? (e.g. use bandages)'); return; }
                    this.combatUseItem(a.item);
                    return;
                case 'flee':
                    if (c.action) { this.refuseCombat('WRONG_MODE', 'Run! Out of their reach, they give up the chase.'); return; }   // combat v3: you flee by moving
                    this.doFlee(); return;
                default: this.refuseCombat('WRONG_MODE', `You can't do '${a.type}' in a real-time fight.`);
            }
        }

        /** The held target if it still lives, else the first living enemy (pure). */
        rtDefaultTarget() {
            const c = this.combat;
            const living = this.alive(c.enemies);
            const t = (c.rt.targetId && living.find((e) => e.id === c.rt.targetId)) || living[0];
            return t ? [t.id] : null;
        }

        /** Why the player can't use this right now (stun, cooldowns), or null. Used by useSkill() and availability. */
        rtActionProblem(name, isBasic) {
            if (!this.rtActive()) return null;
            const rt = this.combat.rt;
            const p = this.player;
            if (p.statusEffects.some((s) => s.type === 'skip_turn')) return { code: 'STUNNED', message: "You're stunned and can't act yet." };
            const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
            if (isBasic) {
                if (rt.external) return null;   // combat v3: the weapon's startup and recovery pace the basic attack (the sim)
                if (rt.basicReadyAt > rt.now) return { code: 'ON_COOLDOWN', message: `${name} is ready in ${secs(rt.basicReadyAt - rt.now)}.`, remainingMs: rt.basicReadyAt - rt.now };
                return null;
            }
            const cd = rt.cooldowns[name];
            if (cd && cd.readyAt > rt.now) return { code: 'ON_COOLDOWN', message: `${name} is ready in ${secs(cd.readyAt - rt.now)}.`, remainingMs: cd.readyAt - rt.now };
            if (rt.gcdUntil > rt.now) return { code: 'GLOBAL_COOLDOWN', message: `Recovering: ready in ${secs(rt.gcdUntil - rt.now)}.`, remainingMs: rt.gcdUntil - rt.now };
            return null;
        }

        /** The player's action is one opportunity (T-0 hooks), like an enemy's. useSkill() / combatUseItem() call these. */
        rtBeginPlayerAction() {
            this.combat.rt.actorId = this.player.id;
            this.beginOpportunity(this.player);
        }

        rtEndPlayerAction(name, isBasic, { item = false } = {}) {
            if (!this.rtActive()) return;   // that blow ended the fight
            this.endOpportunity(this.player);
            if (item) this.rtStartGcd(); else this.rtStartCooldowns(name, isBasic);
            this.checkBattleEnd();
        }

        /** The player's skill (or basic attack) resolved: start its cooldown. */
        rtStartCooldowns(name, isBasic) {
            const c = this.combat;
            const rt = c.rt;
            if (isBasic) {
                if (rt.external) return;
                rt.basicMs = this.rtIntervalMs(this.player);
                rt.basicReadyAt = rt.now + rt.basicMs;
            } else {
                const ms = this.rtCooldownMs(name);
                rt.cooldowns[name] = { readyAt: rt.now + ms, totalMs: ms };
                this.rtStartGcd();
            }
            if (c.extraTurn) { rt.gcdUntil = rt.now; rt.basicReadyAt = rt.now; c.extraTurn = false; }   // Haste: act again at once
        }

        rtStartGcd() {
            const rt = this.combat.rt;
            rt.gcdMs = Math.round((this.rtRules().globalCooldownSeconds || 1) * 1000);
            rt.gcdUntil = rt.now + rt.gcdMs;
        }

        // =====================================================================
        // Timed statuses (applyStatus calls this on every successful application)
        // =====================================================================
        rtStatusApplied(inst) {
            const rt = this.combat.rt;
            const r = this.rtRules().statuses || {};
            let total = null;
            if (inst.policy === 'holder_next_turn_start') total = Math.round((r.guardSeconds || 3) * 1000);
            else if (isNum(inst.duration) && inst.duration > 0) total = this.rtTurnsToMs(inst.duration);
            if (inst.policy) { inst.rtPolicy = inst.policy; inst.policy = null; }   // timed now, not by opportunity
            inst.rtTotalMs = total;
            inst.rtEndsAt = total != null ? rt.now + total : null;
            if (inst.type === 'dot' && !(isNum(inst.rtNextTickAt) && inst.rtNextTickAt > rt.now)) inst.rtNextTickAt = rt.now + this.rtTickMs(inst);
        }

        /** Public API (pure): the skill bar, in and out of combat. Kept out of getState() (golden replay hash). */
        getSkillBar() { return this.skillBarView(); }

        /** Public API (pure): the real-time fight clock and timers, or null outside a real-time fight. */
        getRealtimeState() { return this.rtStateView(); }

        /** For HUDs: the fight clock and every timer, in ms. */
        rtStateView() {
            const c = this.combat;
            if (!this.rtActive()) return null;
            const rt = c.rt;
            const cds = {};
            for (const [name, cd] of Object.entries(rt.cooldowns)) if (cd.readyAt > rt.now) cds[name] = { remainingMs: cd.readyAt - rt.now, totalMs: cd.totalMs };
            const actors = {};
            for (const x of this.rtLiving()) {
                if (x.isPlayer) continue;
                const a = rt.actors[x.id];
                if (!a) continue;
                actors[x.id] = {
                    nextActionInMs: isNum(a.nextActionAt) ? Math.max(0, a.nextActionAt - rt.now) : null, intervalMs: a.intervalMs,
                    windup: a.windup ? { skill: a.windup.skill, targetId: a.windup.targetId, remainingMs: Math.max(0, a.windup.landsAt - rt.now), totalMs: a.windup.landsAt - a.windup.startedAt } : null
                };
            }
            return {
                now: rt.now, pulseInMs: rt.nextPulseAt - rt.now, targetId: (this.rtDefaultTarget() || [null])[0],
                gcd: rt.gcdUntil > rt.now ? { remainingMs: rt.gcdUntil - rt.now, totalMs: rt.gcdMs } : null,
                basic: rt.basicReadyAt > rt.now ? { remainingMs: rt.basicReadyAt - rt.now, totalMs: rt.basicMs } : null,
                cooldowns: cds, actors,
                skillBar: this.skillBarView().map((s) => ({ ...s, cooldown: s.skillId && cds[s.skillId] ? cds[s.skillId] : null }))
            };
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['realtime'] = RealtimeMethods;
    if (isNode) module.exports = RealtimeMethods;
})(typeof window !== 'undefined' ? window : globalThis);
