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
            // Timed fights (real-time, action) show the skill in seconds when it has a liveDescription.
            const description = (this.combatMode !== 'turn' && s.liveDescription) || s.description;
            return { name, description, cost, detail, target: s.target, implemented: this.isCastable(s), missing: this.missingEffects(s) };
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
            if (attacker.isPlayer) dmg += this.statBonus(attacker, skill.damage_type) + this.equipmentDamageBonus(skill.damage_type, attacker.equipment || {});
            const gcIdx = attacker.statusEffects.findIndex((s) => s.name === 'Guaranteed Crit');
            if (gcIdx !== -1) { hit.forceCrit = true; attacker.statusEffects.splice(gcIdx, 1); }
            hit.isCrit = hit.forceCrit || this.rng() < ((attacker.critChance || 0) + (attacker.isPlayer ? (this.equipmentModifiers(attacker.equipment || {}).critChance || 0) : 0));
            if (hit.isCrit) dmg = Math.floor(dmg * (attacker.critMultiplier || 1.5));

            let final;
            if (skill.damage_type === 'true' || hit.trueDamage) {
                final = dmg;
            } else {
                const def = (target.def || 0) * (1 - hit.armorIgnore);
                final = Math.max(0, dmg - def);
                // Action fights only: DEF blocks at most (1 - minDamageShare) of a blow that lands on the player (Gauge).
                if (target.isPlayer && this.combat && this.combat.action) final = Math.max(final, dmg * ((this.actionRules().defence || {}).minDamageShare || 0));
                for (const s of target.statusEffects) if (s.type === 'damage_reduction') final *= Math.pow(1 - s.value, s.stacks || 1);   // each stack multiplies
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
            for (const status of attacker.statusEffects) if (status.type === 'damage_boost') final *= 1 + (Number(status.value) || 0);   // Wrath Ghost
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
            // One cast = one castId (Phase 1 spec §2.1). Control Resistance uses it for "one gain per cast".
            const c = this.combat;
            const outerCast = c ? c.currentCastId : null;
            if (c) { c.nextCastId = (c.nextCastId || 0) + 1; c.currentCastId = `c${c.nextCastId}`; }
            this.castSkillEffects(caster, skill, targets);
            if (c) c.currentCastId = outerCast;
        }

        castSkillEffects(caster, skill, targets) {
            const entries = (skill.effects || []).map((effect) => ({ effect, handler: this.effects[effect.type] }));
            const active = entries.filter((x) => x.handler);
            const base = { engine: this, caster, targets, skill };
            // QA-14: riders (stun, poison, marks...) only reach targets the attack actually hit.
            // An absorbed (Bone Wall), dodged or missed hit carries none of them.
            const reached = new Set();
            let attacked = false;

            // Grave Command tracks the owner's last attempted damaging attack,
            // including misses, without redirecting minions on defensive casts.
            if (caster.isPlayer && this.combat && this.hasTrait('Grave Command') && skill.base_damage) {
                const selected = targets.filter(t => t && !t.isPlayer && !t.isMinion && t.hp > 0 && !t.erased);
                if (selected.length) this.combat.graveCommandTargetId = selected[selected.length - 1].id;
            }

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
                        const hpNote = target.isPlayer && !this.statusOfType(target, 'ghoul_shield') ? ` ${target.name} HP: ${Math.max(0, target.hp - hit.damage)}/${target.maxHp}` : '';
                        this.say(`${caster.name} uses ${skill.name} on ${target.name} for ${hit.damage} damage!${hit.isCrit ? ' (CRITICAL HIT!)' : ''}${hpNote}`, { important: !!caster.isPlayer });
                        const actual = this.damage(target, hit.damage, caster, { alreadyScaled: true });
                        if (caster.isMinion && this.hasTrait('+3 max minions; all summons gain AOE attacks') && actual > 0) {
                            for (const other of this.alive(this.combat.enemies).filter(enemy => enemy !== target)) {
                                this.secondaryDamage(other, Math.floor(actual * 0.5), this.player,
                                    { kind: 'Black Pharaoh Splash' });
                            }
                        }
                        if (caster.isPlayer && actual > 0 && target.hp > 0) {   // Venom / Rend Ghost: your hits poison or bleed
                            for (const st of caster.statusEffects.filter((x) => x.type === 'on_hit_dot')) this.applyDot(caster, target, { name: st.dot, value: st.value, duration: st.dotDuration || 1 });
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

        /** Soul Chain's caster clock is a combat timer now (T-0, src/engine/timers.js); kept for callers and tests.
         *  The cast turn doesn't count; a later skipped opportunity does. */
        advanceSoulLinkClock(actor, skipped = false) {
            this.tickTimers(actor, { skipped, kinds: ['soul_link'] });
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
                this.consumeStatusStack(target, shield);
                this.say(`${target.name}'s ${shield.name} absorbs the incoming soul damage!`);
                return 0;
            }
            // The owner/recipients were validated before the primary hit. Capture
            // Wound Transfer independently of later group cleanup or member deaths.
            let adjusted = raw * (owner && owner.isPlayer && this.hasTrait('Wound Transfer') ? 1.1 : 1);
            for (const status of target.statusEffects) {
                if (status.type === 'damage_reduction') adjusted *= Math.pow(1 - status.value, status.stacks || 1);
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
            if (target.ghoul) return this.ghoulAbsorb(target, amount), 0;   // Raise Ghoul: it stores what it takes, it never loses HP
            if (target.isPlayer && this.combat) {
                const taken = this.ghoulAbsorb(target, amount);
                if (taken >= amount) return 0;
                amount -= taken;
            }
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
            // Intercept lethal damage before onDeath can strip Soulbinder links/marks.
            if (target.isPlayer && target.hp <= 0 && !target.erased && this.tryUndyingWill()) {
                // The damage event occurred, but the actor never entered the dead state.
            }
            if (target.isPlayer && this.combat && source && source !== target) this.resourceEvent('onDamageTaken', 1, 'pain');
            if (!options.secondaryLink && source && source.isPlayer && this.combat) this.combat.dealtDamageThisRound = true;
            if (!options.secondaryLink && this.combat && this.isPlayerSide(source) && this.marksOn(target).length) this.combat.markedEnemyHitThisRound = true;
            // Undying Will intercepts the lethal hit before death cleanup can
            // orphan marks or dissolve Soul Chain / Soul Feast memberships.
            if (target.hp <= 0 && target.isPlayer && !target.erased) this.tryUndyingWill();
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

        // ---------- Necromancer live kit (Tokelo 2026-11-01, docs/design/NECROMANCER_LIVE_KIT.md) ----------
        /** Channel the Grave: dismiss your ghosts, then call `count` different random ones from the pool (one buff each). */
        channelGhosts(caster, effect) {
            caster.statusEffects = caster.statusEffects.filter((s) => !s.ghost);
            const pool = [...(effect.pool || [])];
            const picks = [];
            for (let i = 0; i < (effect.count || 2) && pool.length; i++) picks.push(pool.splice(Math.floor(this.rng() * pool.length), 1)[0]);
            for (const g of picks) {
                const { name, type, value, text, ...rest } = g;
                this.applyStatus(caster, caster, { ...rest, name, type, value, text, duration: effect.duration, ghost: true });
            }
            if (picks.length) this.say(`${picks.length > 1 ? 'Ghosts answer' : 'A ghost answers'} your call: ${picks.map((g) => `${g.name} (${g.text})`).join(' and ')}.`, { important: true });
        }

        /** Raise Ghoul: a ghoul rises beside you and takes the damage meant for you (the 'Ghoul Shield' status on you). */
        raiseGhoulShield(caster, effect) {
            const m = this.summon(effect.summon_type || 'ghoul');
            if (!m) return;
            m.ghoul = { phase: 'shield', stored: 0, capacity: effect.capacity || 60, effect };
            this.applyStatus(caster, caster, { name: 'Ghoul Shield', type: 'ghoul_shield', minionId: m.id, duration: effect.duration || 3, seconds: effect.seconds });
            this.say(`${caster.name} raises a Ghoul! It throws itself in front of every blow meant for you.`, { important: true });
        }

        /** The guarding ghoul (if any) that takes damage aimed at `target`, and how much of `amount` it took. */
        ghoulAbsorb(target, amount) {
            let g = null;
            if (target.ghoul) g = target;
            else if (target.isPlayer && this.combat) {
                const s = this.statusOfType(target, 'ghoul_shield');
                g = s && this.alive(this.combat.minions).find((m) => m.id === s.minionId);
            }
            if (!g || !g.ghoul || g.ghoul.phase !== 'shield') return 0;
            const take = Math.min(Math.max(0, g.ghoul.capacity - g.ghoul.stored), amount);
            if (take <= 0) return 0;
            g.ghoul.stored += take;
            this.say(`${g.name} takes ${take} for you (${g.ghoul.stored}/${g.ghoul.capacity} stored).`);
            if (g.ghoul.stored >= g.ghoul.capacity) this.ghoulShieldEnds(g);
            return take;
        }

        /** The shield is over (time up, or the ghoul is full): it charges an enemy. Action fights let the sim run it there. */
        ghoulShieldEnds(g) {
            if (!g.ghoul || g.ghoul.phase !== 'shield') return;
            const p = this.player;
            const s = p.statusEffects.find((x) => x.type === 'ghoul_shield' && x.minionId === g.id);
            if (s) this.removeStatus(p, s);
            g.ghoul.phase = 'charging';
            this.say(`${g.name} has soaked up ${g.ghoul.stored} damage and charges!`, { important: true });
            if (this.combat && this.combat.action && g.hp > 0) {
                // the sim runs it at an enemy (actionGhoulBurst); if it never gets there, it bursts when this runs out
                this.applyStatus(p, g, { name: 'Ghoul Charge', type: 'ghoul_charge', duration: 1, seconds: g.ghoul.effect.chargeSeconds || 4 });
                return;
            }
            const target = this.combat ? this.alive(this.combat.enemies)[0] : null;
            this.ghoulBurst(g, target ? [target] : []);
        }

        /**
         * The ghoul bursts on `targets`: burstBase + burstShare of what it stored at once (no DEF, like a DoT), and
         * bleedShare as 'Grave Bleed' spread over bleedTurns. Then it's gone.
         */
        ghoulBurst(g, targets) {
            if (!g.ghoul || g.ghoul.phase === 'spent') return;
            const e = g.ghoul.effect || {};
            const stored = g.ghoul.stored;
            g.ghoul.phase = 'spent';
            g.statusEffects = [];
            const hit = (targets || []).filter((t) => t && t.hp > 0 && !t.erased);
            const burst = (e.burstBase || 0) + Math.floor(stored * (e.burstShare != null ? e.burstShare : 0.5));
            const bleed = Math.floor(stored * (e.bleedShare != null ? e.bleedShare : 0.5));
            this.say(hit.length ? `${g.name} bursts in a spray of rot and bone!` : `${g.name} collapses with nothing to burst on.`, { important: true });
            const turns = e.bleedTurns || 2;
            const ticks = this.rtActive && this.rtActive() ? Math.max(1, Math.round(turns * (this.rtRules().secondsPerTurn || 3) / (((this.rtRules().statuses || {}).tickSeconds) || 1))) : turns;
            for (const t of hit) {
                this.say(`The blast hits ${t.name} for ${burst} damage!`);
                this.damage(t, burst, this.player);
                if (bleed > 0 && t.hp > 0) this.applyDot(this.player, t, { name: 'Grave Bleed', value: Math.max(1, Math.ceil(bleed / ticks)), duration: turns });
            }
            g.hp = 0;
            g.dead = true;
            if (this.combat) g.fallenOrder = ++this.combat.nextFallenOrder;
            this.out.push({ type: 'action.ghoul_burst', minionId: g.id, targets: hit.map((t) => t.id), burst, bleed });
        }

        /** A timed status ran out (both clocks call this after removing it): the ghoul's shield and charge. */
        statusExpired(holder, s) {
            if (!this.combat) return;
            if (s.type === 'ghoul_shield') {
                const g = this.alive(this.combat.minions).find((m) => m.id === s.minionId);
                if (g) this.ghoulShieldEnds(g);
            } else if (s.type === 'ghoul_charge' && holder.ghoul && holder.ghoul.phase === 'charging') {
                const target = this.alive(this.combat.enemies)[0];
                this.ghoulBurst(holder, target ? [target] : []);
            }
        }

        erase(target) {
            target.hp = 0;
            target.erased = true;
            target.dead = true;
            this.orphanStatusesOf(target);
        }

        onDeath(target, source, options = {}) {
            target.lootEligible = this.isPlayerSide(source) && !target.isMinion;
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
