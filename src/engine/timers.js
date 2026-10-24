/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Turn opportunities and timers (T-0)
 * architecture/REVIEW_DESIGN_PACKAGES_1-3.md §1.
 *
 * Every combatant's scheduled turn is one "opportunity". Exactly one place per
 * path calls the two hooks:
 *   beginOpportunity(actor, { skipped })   the turn starts (after DoTs/arming)
 *   endOpportunity(actor, { skipped })     the turn is over (after any Haste
 *                                          bonus actions)
 * A skipped turn (stun etc.) begins and ends at once. The hooks hold all the
 * per-turn bookkeeping that used to be copied at four call sites.
 *
 * Two counting rules exist on purpose (§1.3), so don't merge them:
 *   - QA-1 windows (Marked for Death, Expose, Guard) count ACTIONABLE turns
 *     only: endNormalTurn() runs on non-skipped turns only.
 *   - combat.timers count skipped turns too when the timer says countSkipped.
 *
 * combat.timers: plain JSON entries, so they save and roll back with the rest:
 *   { id, ownerId, kind, remaining, countSkipped, startedAtTurn, ...data }
 * A timer is not consumed by the owner turn it was started in. On reaching 0
 * it is removed and its kind's expire() runs (TIMER_KINDS below).
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    /** What happens when a timer of each kind runs out. New mechanics add a kind here, not a new code path. */
    const TIMER_KINDS = {
        // Soulbinder (K1, QA-19): one caster-owned clock ends the caster's link group and its Feast.
        soul_link: {
            expire(engine, timer) {
                for (const t of engine.combat.enemies) t.statusEffects = t.statusEffects.filter((s) =>
                    !(s.appliedBy === timer.ownerId && (s.type === 'soul_link' || s.type === 'soul_feast')));
            }
        }
    };

    class TimerMethods {
        // =====================================================================
        // The two hooks
        // =====================================================================
        beginOpportunity(actor, { skipped = false } = {}) {
            this.crBeginOpportunity(actor, skipped); // Package 2: boss "no two hard skips in a row"
            if (skipped) {
                // QA-2: the skip a Shield Bash stun caused; the target now owes one unstunned turn.
                if (actor.shieldBashRecovery === 'await_skip') actor.shieldBashRecovery = 'await_recovery';
                return;
            }
            // QA-2: a Shield Bash stun that never caused a skip (e.g. cleansed) doesn't start a lockout.
            if (actor.shieldBashRecovery === 'await_skip') actor.shieldBashRecovery = null;
            this.beginNormalTurn(actor);            // QA-1 counter
        }

        endOpportunity(actor, { skipped = false } = {}) {
            if (!skipped) this.endNormalTurn(actor);  // QA-1 windows: actionable turns only
            this.tickTimers(actor, { skipped });
            if (!skipped && actor.shieldBashRecovery === 'await_recovery') actor.shieldBashRecovery = null;
            this.crEndOpportunity(actor, skipped);   // Package 2: CR decay, protection ends
            this.possessionEndOpportunity(actor, skipped); // N-5: Possession lasts one holder opportunity
        }

        // =====================================================================
        // combat.timers
        // =====================================================================
        /** Start a timer owned by `owner`. Returns the entry. */
        addTimer(owner, kind, remaining, { countSkipped = true, replace = false, ...data } = {}) {
            const c = this.combat;
            if (!c.timers) c.timers = [];
            if (replace) c.timers = c.timers.filter((t) => !(t.ownerId === owner.id && t.kind === kind));
            c.nextTimerId = (c.nextTimerId || 0) + 1;
            const timer = { id: `t${c.nextTimerId}`, ownerId: owner.id, kind, remaining, countSkipped, startedAtTurn: owner.normalTurns || 0, ...data };
            c.timers.push(timer);
            return timer;
        }

        timersOf(ownerId, kind) {
            return ((this.combat && this.combat.timers) || []).filter((t) => t.ownerId === ownerId && (!kind || t.kind === kind));
        }

        /** One of the owner's opportunities ended: count its timers down and expire the finished ones. */
        tickTimers(actor, { skipped = false, kinds = null } = {}) {
            const c = this.combat;
            if (!c || !c.timers || !c.timers.length) return;
            const done = [];
            for (const t of c.timers) {
                if (t.ownerId !== actor.id || (kinds && !kinds.includes(t.kind))) continue;
                if (skipped ? !t.countSkipped : (actor.normalTurns || 0) <= t.startedAtTurn) continue; // the start turn never counts
                if (--t.remaining <= 0) done.push(t);
            }
            if (!done.length) return;
            c.timers = c.timers.filter((t) => !done.includes(t));
            for (const t of done) if (TIMER_KINDS[t.kind] && TIMER_KINDS[t.kind].expire) TIMER_KINDS[t.kind].expire(this, t);
        }
    }

    TimerMethods.KINDS = TIMER_KINDS;
    (ENSO.engineModules || (ENSO.engineModules = {}))['timers'] = TimerMethods;
    if (isNode) module.exports = TimerMethods;
})(typeof window !== 'undefined' ? window : globalThis);
