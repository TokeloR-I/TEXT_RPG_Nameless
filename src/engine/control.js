/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Player-controlled turns (Possession)
 * Vaelis Package 1 N-5 (docs/design/VAELIS_PACKAGE_1_NECROMANCER_COMPLETION.md),
 * scheduling per architecture/REVIEW_DESIGN_PACKAGES_1-3.md §3.1.
 *
 * Possession puts a 'Possessed' status on one enemy. When that enemy's next
 * normal turn comes up, advance() PAUSES (like the QA-5 Continue pause):
 *   getAvailableActions() -> { awaiting: 'control', controlledActorId, actions }
 *     with the CONTROLLED ACTOR's own moves, targets = its living former allies
 *   act({ type: 'control', actorId, skillId, targetId })   or, in the CLI,
 *   '<move name> <n>' against the numbered list printed for that actor.
 * The move runs through castSkill(enemy, …), so the source is the enemy: no
 * player kill credit, Soul Energy or on-kill resource (contract: the kill is
 * the controlled actor's). No usable move: the engine does a no-op itself and
 * moves on; it never picks a move for the player.
 * Possession ends when the holder's opportunity ends (T-0 hook), acted or
 * skipped; death, cleanse and the end of the fight end it too.
 * State (combat.controlledActorId, the Possessed status) is plain JSON.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

    class ControlMethods {
        // =====================================================================
        // Casting Possession
        // =====================================================================
        /** Pre-cast refusal for one target (no cost, no turn used), or null. Rules live on statusDefinitions.Possessed. */
        possessionProblem(target) {
            const def = this.statusDef('Possessed');
            if ((def.refuseTiers || []).includes(this.tierOf(target))) return `${target.name} is too powerful to possess.`;
            if ((target.statusAffinities || {}).Possessed === 'immune') return `${target.name} can't be possessed.`;
            const cr = this.crValue(target);
            if (isNum(def.refuseAtCr) && cr >= def.refuseAtCr) return `${target.name}'s Control Resistance is too high to possess (${cr}; it must be below ${def.refuseAtCr}).`;
            return null;
        }

        /** One possessed target per caster: a recast releases the previous one. */
        possess(caster, target, effect) {
            for (const e of this.combat.enemies) {
                const s = e !== target && this.findStatus(e, 'Possessed');
                if (s && s.appliedBy === caster.id) {
                    this.removeStatus(e, s);
                    if (e.hp > 0) this.say(`${e.name} is released from your will.`);
                }
            }
            const inst = this.applyStatus(caster, target, { name: 'Possessed', type: 'possessed', duration: effect.duration || 1 });
            if (inst) this.say(`${target.name}'s will is yours: you choose its next move.`);
            return inst;
        }

        isPossessed(actor) { return !!this.statusOfType(actor, 'possessed'); }

        // =====================================================================
        // The controlled turn
        // =====================================================================
        /** advance(): a possessed actor's normal turn. Returns true when the engine pauses for the player. */
        startControlledTurn(actor) {
            const c = this.combat;
            if (!this.controlOptions(actor).some((o) => o.enabled)) {
                this.say(`${actor.name} has no move it can make. Your hold on it fades.`); // contract no-op
                return false;
            }
            c.controlledActorId = actor.id;
            c.awaitingPlayer = true;
            this.showControlState();
            return true;
        }

        controlledActor() {
            const c = this.combat;
            return c && c.controlledActorId ? this.findCombatant(c.controlledActorId) : null;
        }

        /** Its living former allies, in enemy-list order (the CLI numbers them 1..n). Never itself. */
        controlTargets(actor) { return this.alive(this.combat.enemies).filter((e) => e !== actor); }

        /** The controlled actor's moves as options (pure). Same checks as performControl(), same messages. */
        controlOptions(actor) {
            const basic = this.data.skillDefinitions['Basic Attack'];
            const moves = actor.skills && actor.skills.length ? [...actor.skills] : [basic];
            const silenced = !!this.statusOfType(actor, 'silence');
            if (silenced && !moves.some((m) => m.name === basic.name)) moves.push(basic);
            const targets = this.controlTargets(actor);
            return moves.map((move) => {
                const opt = { type: 'control', actorId: actor.id, skillId: move.name, targeting: 'enemy_single', enabled: false };
                opt.targets = targets.map((t) => ({ id: t.id, enabled: true }));
                if (silenced && move.name !== basic.name) opt.reason = { code: 'SILENCED', message: `${actor.name} is silenced: only a basic attack works.` };
                else if (!targets.length) opt.reason = { code: 'INVALID_TARGET', message: `${actor.name} has no one to turn on.` };
                else opt.enabled = true;
                return opt;
            });
        }

        /** act({ type: 'control', actorId, skillId, targetId }) while awaiting 'control'. */
        performControl(a) {
            const c = this.combat;
            const actor = this.controlledActor();
            if (a.type !== 'control') { this.refuseCombat('WRONG_MODE', `You are controlling ${actor.name}: choose its move.`); return; }
            if (a.actorId != null && a.actorId !== actor.id) { this.refuseCombat('WRONG_MODE', `You are controlling ${actor.name}, not '${a.actorId}'.`); return; }
            const opt = this.controlOptions(actor).find((o) => o.skillId === a.skillId);
            if (!opt) { this.refuseCombat('UNKNOWN_SKILL', `${actor.name} has no move called '${a.skillId}'.`); return; }
            if (!opt.enabled) { this.refuseCombat(opt.reason.code, opt.reason.message); return; }
            const targets = this.controlTargets(actor);
            const target = a.targetId != null ? targets.find((t) => t.id === a.targetId)
                : targets.length === 1 ? targets[0] : null;
            if (!target) {
                this.refuseCombat('INVALID_TARGET', `Invalid target '${a.targetId != null ? a.targetId : 'none specified'}'. Valid targets: ${targets.map((t) => t.id).join(', ')}.`);
                return;
            }
            const move = (actor.skills || []).find((m) => m.name === opt.skillId) || this.data.skillDefinitions['Basic Attack'];
            c.controlledActorId = null;
            c.awaitingPlayer = false;
            actor.lastSkillUsed = move.name;
            this.castSkill(actor, move, [target]);
            this.endOpportunity(actor);
            c.idx++;
            this.advance();
        }

        /** T-0 hook: the possessed holder's opportunity is over (acted, no-op or skipped). */
        possessionEndOpportunity(actor, skipped) {
            const s = this.findStatus(actor, 'Possessed');
            if (!s) return;
            this.removeStatus(actor, s);
            if (actor.hp > 0) this.say(skipped ? `${actor.name} lost its turn, and your hold on it with it.` : `${actor.name} shakes off your control.`);
        }

        // =====================================================================
        // Text interface
        // =====================================================================
        showControlState() {
            const actor = this.controlledActor();
            const opts = this.controlOptions(actor);
            const targets = this.controlTargets(actor);
            this.say(`--- You control ${actor.name}! ---`, { important: true });
            this.say(`Turn ${actor.name} on its allies:`);
            targets.forEach((t, i) => this.say(`${i + 1}. ${t.name} (${t.hp}/${t.maxHp} HP)${this.statusTag(t)}`));
            this.say('Its moves:');
            for (const o of opts) this.say(`> ${o.skillId}${o.enabled ? '' : ` (${o.reason.message})`}`);
            const first = opts.find((o) => o.enabled);
            this.say(`Type a move and a target (e.g., '${first.skillId.toLowerCase()} 1').`);
        }

        /** CLI while awaiting 'control': '<move> <n>' against the list showControlState() printed. */
        controlCommand(command, targetNum) {
            const actor = this.controlledActor();
            const norm = (x) => x.toLowerCase().replace(/[’‘]/g, "'");
            const opts = this.controlOptions(actor);
            const opt = command === 'attack' ? opts.find((o) => o.enabled) : opts.find((o) => norm(o.skillId) === norm(command));
            if (!opt) { this.refuseCombat('UNKNOWN_SKILL', `${actor.name} has no move called '${command}'.`); return; }
            const targets = this.controlTargets(actor);
            const n = Array.isArray(targetNum) ? NaN : targetNum;
            let targetId = null;
            if (targetNum != null) {
                if (!(n >= 1 && n <= targets.length)) {
                    this.refuseCombat('INVALID_TARGET', `Invalid target '${Array.isArray(targetNum) ? targetNum.join(',') : targetNum}'. Valid targets: ${targets.map((t, i) => i + 1).join(', ')}. Example: '${norm(opt.skillId)} 1'`);
                    return;
                }
                targetId = targets[n - 1].id;
            } else if (targets.length > 1 && opt.enabled) {
                this.refuseCombat('INVALID_TARGET', `Invalid target 'none specified'. Valid targets: ${targets.map((t, i) => i + 1).join(', ')}. Example: '${norm(opt.skillId)} 1'`);
                return;
            }
            this.performControl({ type: 'control', actorId: actor.id, skillId: opt.skillId, targetId });
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['control'] = ControlMethods;
    if (isNode) module.exports = ControlMethods;
})(typeof window !== 'undefined' ? window : globalThis);
