/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Skills & damage
 * Casting skills, the damage pipeline, and the primitives the effect registry calls.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const { clone } = isNode ? require('./util.js') : ENSO.engineUtil;

    class SkillMethods {
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
            final *= this.linkedDamageMultiplier(target);
            // Temporary, flag-scoped damage modifiers use the same round-based
            // status lifecycle as other combat buffs.
            for (const status of attacker.statusEffects) {
                if (status.type === 'bonus_damage_vs_flag_percent' &&
                    (target.specialFlags || []).includes(status.flag)) final *= 1 + status.value;
            }
            hit.damage = Math.max(0, Math.floor(final));
            // QA-1: consume only on positive final damage (after armor and defenses).
            // A zero-damage hit keeps the mark; misses, dodges and absorbs never get here.
            if (hit.consumeMarks.length && hit.damage > 0) {
                target.statusEffects = target.statusEffects.filter((s) => !hit.consumeMarks.includes(s));
                this.say(`[${hit.consumeMarks.map((m) => m.name).join(', ')}] is consumed!`);
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
                        const actual = this.damage(target, hit.damage, caster, { alreadyScaled: true });
                        if (caster.isMinion && this.hasTrait('+3 max minions; all summons gain AOE attacks') && actual > 0) {
                            for (const other of this.alive(this.combat.enemies).filter(enemy => enemy !== target)) {
                                this.secondaryDamage(other, Math.floor(actual * 0.5), this.player,
                                    { kind: 'Black Pharaoh Splash' });
                            }
                        }
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

        advanceSoulLinkClock(actor, skipped = false) {
            const clocks = this.combat && this.combat.soulLinkClocks;
            const clock = clocks && clocks[actor.id];
            if (!clock) return;
            // A cast during the current normal turn does not consume its own clock;
            // a later skipped normal opportunity still consumes one.
            if (!skipped && (actor.normalTurns || 0) <= clock.castTurn) return;
            if (--clock.remaining > 0) return;
            for (const t of this.combat.enemies) t.statusEffects = t.statusEffects.filter(s =>
                !(s.appliedBy === actor.id && (s.type === 'soul_link' || s.type === 'soul_feast')));
            delete clocks[actor.id];
        }

        // Soulbinder: memberships and drain snapshots live entirely in combat statuses.
        // Recomputing from IDs makes save/restore and enemy deaths deterministic.
        activeSoulLinks(caster) {
            if (!this.combat || !caster || caster.hp <= 0) return [];
            const members = this.alive(this.combat.enemies).filter(t =>
                t.statusEffects.some(s => s.type === 'soul_link' && s.appliedBy === caster.id));
            const groups = new Map();
            for (const t of members) for (const s of t.statusEffects) {
                if (s.type !== 'soul_link' || s.appliedBy !== caster.id) continue;
                if (!groups.has(s.linkGroup)) groups.set(s.linkGroup, []);
                groups.get(s.linkGroup).push(t);
            }
            const valid = [...groups.values()].find(items => items.length >= 2) || [];
            if (!valid.length) {
                for (const t of this.combat.enemies) t.statusEffects = t.statusEffects.filter(s =>
                    !(s.appliedBy === caster.id && (s.type === 'soul_link' || s.type === 'soul_feast')));
            }
            return valid;
        }

        linkedDamageMultiplier(target) {
            const link = target.statusEffects.find(s => s.type === 'soul_link');
            if (!link) return 1;
            const owner = this.findCombatant(link.appliedBy);
            if (!owner || !this.activeSoulLinks(owner).includes(target)) return 1;
            return owner.isPlayer && this.hasTrait('Wound Transfer') ? 1.1 : 1;
        }

        // Link damage is not a new attack: flat DEF, crit, attack riders and
        // stat scaling do not apply. The recipient still gets its own reductions.
        secondarySoulDamage(target, raw, owner, effectName = 'Soul Chain') {
            if (!target || target.hp <= 0 || raw <= 0) return 0;
            const affinities = target.statusAffinities || {};
            if (affinities[effectName] === 'immune' || affinities.magic === 'immune') return 0;
            const shield = this.statusOfType(target, 'absorb');
            if (shield) {
                this.removeStatus(target, shield);
                this.say(`${target.name}'s ${shield.name} absorbs the incoming soul damage!`);
                return 0;
            }
            // The owner/recipients were validated before the primary hit. Capture
            // Wound Transfer independently of later group cleanup or member deaths.
            let adjusted = raw * (owner && owner.isPlayer && this.hasTrait('Wound Transfer') ? 1.1 : 1);
            for (const status of target.statusEffects) {
                if (status.type === 'damage_reduction') adjusted *= 1 - status.value;
            }
            return this.damage(target, Math.floor(adjusted), owner, { secondaryLink: true, alreadyScaled: true });
        }

        // Shared mitigation, prevention and K3 side-effect suppression for secondary
        // link, drain and splash damage. No new attack, proc, crit or recursion.
        secondaryDamage(target, raw, owner, { kind = 'Soul Chain' } = {}) {
            return this.secondarySoulDamage(target, raw, owner, kind);
        }

        tickSoulFeast(actor) {
            const drains = actor.statusEffects.filter(s => s.type === 'soul_feast');
            for (const drain of drains) {
                if (actor.hp <= 0) break;
                const owner = this.findCombatant(drain.appliedBy);
                const members = this.activeSoulLinks(owner);
                const matching = actor.statusEffects.some(s => s.type === 'soul_link' &&
                    s.appliedBy === drain.appliedBy && s.linkGroup === drain.linkGroup);
                if (!owner || !matching || !members.includes(actor)) {
                    this.removeStatus(actor, drain);
                    continue;
                }
                // Only one normal-turn tick; secondaryLink suppresses chain propagation.
                const loss = this.secondarySoulDamage(actor, drain.value, owner, 'Soul Feast');
                this.say(`${actor.name} suffers ${loss} Soul Feast damage.`);
                if (loss > 0 && owner.isPlayer && this.hasTrait('You heal for 100% of Soul Feast dmg')) {
                    this.heal(owner, loss);
                }
            }
        }

        // ---------- primitives the effect registry uses ----------
        damage(target, amount, source, options = {}) {
            if (amount <= 0 || target.hp <= 0) return 0;
            // Attack hits were already multiplied in rollDamage; direct magical,
            // DoT and environmental damage must still receive Wound Transfer once.
            const adjusted = options.alreadyScaled ? amount :
                Math.floor(amount * this.linkedDamageMultiplier(target));
            if (adjusted <= 0) return 0;
            const actual = Math.min(target.hp, adjusted);
            // Capture eligible partners before the primary can die and shrink its group.
            const propagation = !options.secondaryLink && this.combat &&
                !target.isPlayer && !target.isMinion
                ? target.statusEffects.filter(s => s.type === 'soul_link').map(s => {
                    const owner = this.findCombatant(s.appliedBy);
                    return { owner, partners: owner ? this.activeSoulLinks(owner).filter(t =>
                        t !== target && t.statusEffects.some(link =>
                            link.type === 'soul_link' && link.linkGroup === s.linkGroup)) : [] };
                }) : [];
            target.hp -= actual;
            if (target.isPlayer && this.combat && source && source !== target) this.resourceEvent('onDamageTaken', 1, 'pain');
            if (!options.secondaryLink && source && source.isPlayer && this.combat) this.combat.dealtDamageThisRound = true;
            if (!options.secondaryLink && this.combat && this.isPlayerSide(source) && this.marksOn(target).length) this.combat.markedEnemyHitThisRound = true;
            if (target.hp <= 0 && !target.dead) this.onDeath(target, source, options);
            for (const { owner, partners } of propagation) {
                for (const partner of partners) {
                    if (partner.hp > 0 && !partner.erased) this.secondarySoulDamage(partner, Math.floor(actual * 0.5), owner);
                }
            }
            return actual;
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
            Object.assign(m, { id: `minion_${this.combat.nextMinionId++}`, summonType: type, ownerId: this.player.id, isPlayer: false, isMinion: true, statusEffects: [] });
            this.combat.minions.push(m);
            return m; // joins the turn order next round
        }

        erase(target) {
            target.hp = 0;
            target.erased = true;
            target.dead = true;
            this.orphanStatusesOf(target);
        }

        onDeath(target, source, options = {}) {
            target.dead = true;
            this.orphanStatusesOf(target);
            // A dead owner cannot retain links or Feast subscriptions. Removing a
            // member also immediately collapses any group with fewer than two survivors.
            if (this.combat) {
                for (const member of this.combat.enemies) {
                    member.statusEffects = member.statusEffects.filter(s =>
                        !(s.appliedBy === target.id &&
                            (s.type === 'soul_link' || s.type === 'soul_feast')));
                }
                for (const candidate of [this.player, ...this.combat.enemies, ...this.combat.minions]) {
                    if (candidate.hp > 0) this.activeSoulLinks(candidate);
                }
            }
            const p = this.player;
            if (target.isPlayer) return;
            this.say(`${target.name} has been defeated!`);
            if (target.isMinion) {
                target.fallenOrder = ++this.combat.nextFallenOrder;
                return;
            }
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
                if (!options.secondaryLink && source && source.isPlayer && this.hasTrait('Plague Reservoir') && this.gainResource(p, 1) > 0) this.say('Plague Reservoir: +1 Soul Energy.');
                if (inf.spreadOnDeath) {
                    const others = this.alive(this.combat.enemies).filter((e) => e !== target);
                    if (others.length) this.say(`The contagion bursts from ${target.name}'s body!`);
                    for (const e of others) this.infect(this.findCombatant(inf.appliedBy) || p, e, 1, { spreadOnDeath: true });
                }
            }
            if (!options.secondaryLink && source && source.isPlayer) this.resourceEvent('onKill', 1, 'kill');
            if (!options.secondaryLink && p.className === 'necromancer' && !p.isHollowKing && source) {
                const amount = source.isPlayer ? 2 : source.isMinion ? 1 : 0;
                if (amount && this.gainResource(p, amount) > 0) this.say(`You gained ${amount} Soul Energy from ${target.name}'s demise!`);
            }
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['skills'] = SkillMethods;
    if (isNode) module.exports = SkillMethods;
})(typeof window !== 'undefined' ? window : globalThis);
