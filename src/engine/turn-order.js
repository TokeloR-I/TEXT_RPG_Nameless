/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Player-set turn order (Eternal Architect)
 * Vaelis Package 3 D-09 (docs/design/VAELIS_PACKAGE_3_REMAINING_CLASS_MECHANICS.md),
 * scheduling per architecture/REVIEW_DESIGN_PACKAGES_1-3.md §3.2.
 *
 * Casting opens a window of N rounds (combat.turnOrder.remainingRounds; a
 * recast refreshes it, never stacks). At the START of each of those rounds,
 * right after newRound() has built the usual speed order, advance() PAUSES:
 *   getAvailableActions() -> { awaiting: 'turn_order', actions }
 *   act({ type: 'turn_order', order: [ids] })   an exact permutation of the
 *                                               living combatants, or
 *   act({ type: 'turn_order', order: null })    keep the speed order.
 *   CLI: 'order 3 1 2' (positions in the printed list) or 'order'.
 * A bad order is refused (INVALID_ORDER) at no cost and the round keeps
 * waiting. Everyone still gets exactly one normal turn per round; nothing is
 * skipped or duplicated, DoTs still tick once per actual turn (startTurn), and
 * Haste bonus actions are untouched. Summons made mid-round join next round,
 * as always; the dead drop out. State is plain JSON (combat.turnOrder).
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    class TurnOrderMethods {
        /** The effect: open (or refresh) the window. */
        openTurnOrderWindow(caster, rounds) {
            const c = this.combat;
            const refresh = !!(c.turnOrder && c.turnOrder.remainingRounds > 0);
            c.turnOrder = { remainingRounds: rounds, pending: false, casterId: caster.id };
            this.say(refresh
                ? `Your design is renewed: you set the turn order for the next ${rounds} rounds.`
                : `Time is clay in your hands: you set the turn order at the start of each of the next ${rounds} rounds.`, { important: true });
        }

        turnOrderPending() { const c = this.combat; return !!(c && c.turnOrder && c.turnOrder.pending); }

        /** advance(), right after newRound(): pause for the player's order if the window is open. */
        beginTurnOrderChoice() {
            const c = this.combat;
            if (!c.turnOrder || c.turnOrder.remainingRounds <= 0) { if (c.turnOrder) c.turnOrder = null; return false; }
            c.turnOrder.remainingRounds--;
            c.turnOrder.pending = true;
            c.awaitingPlayer = true;
            this.showTurnOrderState();
            return true;
        }

        /** The speed order newRound() built (living only), as ids. */
        defaultTurnOrder() { return this.combat.order.filter((x) => x.hp > 0 && !x.erased).map((x) => x.id); }

        /** Availability while awaiting 'turn_order' (pure): choose a permutation, or keep the speed order. */
        turnOrderOptions() {
            const ids = this.defaultTurnOrder();
            return [
                { type: 'turn_order', mode: 'choose', enabled: true, defaultOrder: ids, roundsLeft: this.combat.turnOrder.remainingRounds,
                    pick: { min: ids.length, max: ids.length }, targets: ids.map((id) => ({ id, enabled: true })) },
                { type: 'turn_order', mode: 'default', order: null, enabled: true, defaultOrder: ids }
            ];
        }

        /** Why an order is not acceptable, or null. */
        turnOrderProblem(order) {
            const ids = this.defaultTurnOrder();
            if (!Array.isArray(order)) return 'The order must be a list of every living combatant.';
            if (new Set(order).size !== order.length) return 'Each combatant can appear only once.';
            const unknown = order.filter((id) => !ids.includes(id));
            if (unknown.length) return `Not a living combatant: ${unknown.join(', ')}.`;
            const missing = ids.filter((id) => !order.includes(id));
            if (missing.length) return `Everyone must act once. Missing: ${missing.join(', ')}.`;
            return null;
        }

        /** act({ type: 'turn_order', order }) while awaiting 'turn_order'. */
        performTurnOrder(a) {
            const c = this.combat;
            if (a.type !== 'turn_order') { this.refuseCombat('WRONG_MODE', "Set this round's turn order first."); return; }
            const order = a.order == null ? null : a.order;
            if (order !== null) {
                const problem = this.turnOrderProblem(order);
                if (problem) { this.refuseCombat('INVALID_ORDER', problem); return; }
                c.order = order.map((id) => this.findCombatant(id));
                this.say(`The turn order bends: ${c.order.map((x) => x.name).join(' → ')}.`, { important: true });
            } else {
                this.say('You let time run its usual course this round.');
            }
            c.turnOrder.pending = false;
            if (c.turnOrder.remainingRounds <= 0) c.turnOrder = null; // that was the last affected round
            c.awaitingPlayer = false;
            this.advance();   // newRound() already set idx = 0
        }

        // =====================================================================
        // Text interface
        // =====================================================================
        showTurnOrderState() {
            const c = this.combat;
            const left = c.turnOrder.remainingRounds;
            this.say(`--- Round ${c.round}: you set the turn order${left ? ` (${left} more round${left > 1 ? 's' : ''} after this)` : ' (last round)'} ---`, { important: true });
            this.say('Speed order:');
            c.order.filter((x) => x.hp > 0 && !x.erased).forEach((x, i) => this.say(`${i + 1}. ${x.name}${x.isPlayer ? ' (you)' : ''} (SPD: ${this.speedOf(x)})`));
            this.say("Type 'order' and the numbers in the order they should act (e.g., 'order 2 1 3'), or just 'order' to keep it.");
        }

        /** CLI while awaiting 'turn_order': 'order 3 1 2' or 'order'. */
        turnOrderCommand(command, targetNum) {
            if (command !== 'order') { this.refuseCombat('WRONG_MODE', "Set this round's turn order first: 'order 2 1 3', or 'order' to keep it."); return; }
            if (targetNum == null) { this.performTurnOrder({ type: 'turn_order', order: null }); return; }
            const ids = this.defaultTurnOrder();
            const nums = Array.isArray(targetNum) ? targetNum : [targetNum];
            const bad = nums.filter((n) => !(n >= 1 && n <= ids.length));
            if (bad.length) { this.refuseCombat('INVALID_ORDER', `No combatant number ${bad.join(', ')}. Use the numbers 1–${ids.length} from the list.`); return; }
            this.performTurnOrder({ type: 'turn_order', order: nums.map((n) => ids[n - 1]) });
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['turn-order'] = TurnOrderMethods;
    if (isNode) module.exports = TurnOrderMethods;
})(typeof window !== 'undefined' ? window : globalThis);
