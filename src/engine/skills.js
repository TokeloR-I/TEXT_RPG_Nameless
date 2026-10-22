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
            this.orphanStatusesOf(target);
        }

        onDeath(target, source) {
            target.dead = true;
            this.orphanStatusesOf(target);
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
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['skills'] = SkillMethods;
    if (isNode) module.exports = SkillMethods;
})(typeof window !== 'undefined' ? window : globalThis);
