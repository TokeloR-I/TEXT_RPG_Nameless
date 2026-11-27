/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Gear affixes that change how skills play
 * Tokelo approved pick 2 of docs/design/GAME_EXPERIENCE_RESEARCH_ROUND2_2026-11-25.md (2026-11-25): "loot worth
 * chasing", affixes like Grim Dawn's and Hades' boons. An affix in data `equipmentAffixes` may carry a `proc`:
 *
 *   { on: 'basic_hit' | 'spell_hit' | 'skill_hit' | 'crit' | 'hit', chance?, inflict? | heal? | fork? }
 *         after one of your hits lands (castSkillEffects): a condition through the shared 'inflict' effect, a heal,
 *         or an arc to a second foe for a share of the damage
 *   { on: 'damage', belowHpPct? | vsDot?, mult }   rollDamage: more damage against foes that qualify
 *   { on: 'cast', chance, refund? | resetCooldown? }   commitSkill: the skill was free, or its cooldown resets
 *   { on: 'dodge', decoyMs, radius }   the live sim (src/action/sim.js): a dodge leaves a decoy foes go for
 *
 * Procs belong to no class: any class wearing the item gets them. Randomness through engine.rng() only.
 * These are GameEngine methods (`this` is the engine).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    class AffixMethods {
        /** Pure: the procs of the gear you wear (optionally only those that fire `on`), each with its affix's name. */
        gearProcs(on = null) {
            const p = this.player;
            if (!p || !p.equipment) return [];
            const out = [];
            for (const id of new Set(Object.values(p.equipment))) {
                const d = id && this.itemDef(id);
                for (const a of (d && d.affixes) || []) {
                    const def = this.data.equipmentAffixes[a];
                    if (def && def.proc && (!on || def.proc.on === on)) out.push({ affix: a, name: def.name, ...def.proc });
                }
            }
            return out;
        }

        /** Pure: the first worn proc that fires `on` (the sim asks for 'dodge'), or null. */
        gearProc(on) { return this.gearProcs(on)[0] || null; }

        /** rollDamage(): what your gear multiplies a blow on this foe by. */
        gearDamageMult(attacker, target) {
            if (!attacker || !attacker.isPlayer || !target || target.isPlayer) return 1;
            let m = 1;
            for (const pr of this.gearProcs('damage')) {
                if (pr.belowHpPct != null && target.maxHp > 0 && target.hp / target.maxHp < pr.belowHpPct) m *= pr.mult || 1;
                else if (pr.vsDot && (target.statusEffects || []).some((s) => s.type === 'dot')) m *= pr.mult || 1;
            }
            return m;
        }

        /** castSkillEffects(): one of your hits landed for `actual` damage. */
        gearOnHit(caster, target, skill, hit, actual) {
            if (!caster || !caster.isPlayer || !target || target.isPlayer || target.isMinion || actual <= 0) return;
            const procs = this.gearProcs().filter((pr) => ['hit', 'basic_hit', 'spell_hit', 'skill_hit', 'crit'].includes(pr.on));
            if (!procs.length) return;
            const basic = skill.name === this.basicAttackName() || skill.name === 'Basic Attack';
            const spell = !basic && (this.data.gameRules.magicTypes || []).includes(skill.damage_type);
            const costly = !basic && this.skillCost(skill) > 0;
            for (const pr of procs) {
                const fits = pr.on === 'hit' || (pr.on === 'basic_hit' && basic) || (pr.on === 'spell_hit' && spell) ||
                    (pr.on === 'skill_hit' && costly) || (pr.on === 'crit' && hit && hit.isCrit);
                if (!fits || (pr.chance != null && pr.chance < 1 && !(this.rng() < pr.chance))) continue;
                if (pr.inflict && target.hp > 0 && !target.erased)
                    this.effects.inflict.apply({ engine: this, caster, targets: [target], skill, effect: { type: 'inflict', ...pr.inflict } });
                if (pr.heal && caster.hp > 0) {
                    const n = this.heal(caster, pr.heal);
                    if (n > 0) this.say(`${pr.name}: you take back ${n} HP.`);
                }
                if (pr.fork && (skill.target || 'enemy_single') === 'enemy_single' && this.combat) {
                    const other = this.alive(this.combat.enemies).find((e) => e !== target && !e.erased);
                    const n = Math.floor(actual * pr.fork);
                    if (other && n > 0) {
                        const dealt = this.secondaryDamage(other, n, caster, { kind: pr.name });
                        this.say(`${pr.name}: your ${skill.name} arcs on to ${other.name} for ${dealt}.`, { targetId: other.id });
                    }
                }
            }
        }

        /** commitSkill(): after a (non-basic) skill. Frugal hands the cost back; Echoing resets the cooldown. */
        gearAfterCast(skillName, cost, isBasic) {
            if (isBasic) return;
            const p = this.player;
            for (const pr of this.gearProcs('cast')) {
                if (pr.chance != null && pr.chance < 1 && !(this.rng() < pr.chance)) continue;
                if (pr.refund && cost > 0 && p.resource) {
                    p.resource.current = Math.min(p.resource.max, p.resource.current + cost);
                    this.say(`${pr.name}: your ${skillName} cost you nothing.`);
                }
                const rt = this.combat && this.combat.rt;
                if (pr.resetCooldown && rt && rt.cooldowns && rt.cooldowns[skillName]) {
                    rt.cooldowns[skillName].readyAt = rt.now;
                    this.say(`${pr.name}: ${skillName} is ready again.`);
                }
            }
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {})).affixes = AffixMethods;
    if (isNode) module.exports = AffixMethods;
})(typeof window !== 'undefined' ? window : globalThis);
