/* =========================================================================
 * Enso's Last Stand — EFFECT REGISTRY
 *
 * Every effect "type" used in skillDefinitions gets one entry here.
 * To implement a new effect: add an entry, add a test, done.
 * `node tools/missing-effects.js` lists every effect type with no entry.
 *
 * An entry can use any of these hooks:
 *   beforeHit(ctx, hit)  per hit, before damage is calculated
 *                        (set hit.forceCrit, hit.armorIgnore (0..1), hit.trueDamage)
 *   afterCalc(ctx, hit)  per hit, after damage is calculated (add hit.damage bonuses)
 *   onHit(ctx, hit)      per hit, after damage is applied (heals, resource gains)
 *   hits(ctx)            return how many times the skill hits (multi-hit)
 *   apply(ctx)           once per cast, after all hits (buffs, summons, stuns...)
 *   requires(ctx)        return an error string to refuse the cast (no cost spent, turn not used)
 *   replacesDamage       true = don't deal the skill's base_damage on cast (e.g. delayed bombs)
 *
 * ctx = { engine, caster, targets, skill, effect }   (+ ctx.target inside hit hooks)
 * hit = { target, damage, isCrit, forceCrit, armorIgnore, trueDamage }
 *
 * `partial: 'why'` marks an entry that runs but doesn't do everything the
 * skill text promises yet. missing-effects.js reports these too.
 * ========================================================================= */
(function (global) {
    const registry = {};
    function register(type, entry) { registry[type] = entry; }

    // ---------- Damage modifiers ----------
    register('true_damage', {
        beforeHit(ctx, hit) { hit.trueDamage = true; }
    });

    register('ignore_armor', {
        beforeHit(ctx, hit) { hit.armorIgnore = 1; }
    });

    register('ignore_armor_percent', {
        beforeHit(ctx, hit) { hit.armorIgnore = Math.max(hit.armorIgnore, ctx.effect.value); }
    });

    register('guaranteed_crit_first_turn', {
        // "Always crits if used first in turn" — first player action of the round.
        beforeHit(ctx, hit) { if (!ctx.engine.combat.playerActedThisRound) hit.forceCrit = true; }
    });

    register('bonus_damage_per_corpse', {
        afterCalc(ctx, hit) {
            const bonus = ctx.engine.combat.corpses * ctx.effect.value;
            if (bonus > 0) {
                hit.damage += bonus;
                ctx.engine.say(`(${ctx.skill.name} gains ${bonus} bonus damage from the dead!)`);
            }
        }
    });

    register('bonus_damage_vs_flag_percent', {
        // Temporary self-buff; the shared status lifecycle handles its one-turn expiry.
        apply(ctx) {
            const status = ctx.engine.applyStatus(ctx.caster, ctx.caster, {
                name: ctx.skill.name, type: 'bonus_damage_vs_flag_percent',
                flag: ctx.effect.flag, value: ctx.effect.value, duration: ctx.effect.duration
            });
            if (status) ctx.engine.say(`${ctx.caster.name} invokes ${ctx.skill.name}!`);
        }
    });

    register('bonus_damage_vs_flag', {
        afterCalc(ctx, hit) {
            if ((hit.target.specialFlags || []).includes(ctx.effect.flag)) {
                hit.damage += ctx.effect.value;
                ctx.engine.say(`(+${ctx.effect.value} vs ${ctx.effect.flag})`);
            }
        }
    });

    register('multi_hit', {
        hits(ctx) { return ctx.effect.count || 1; }
    });

    // ---------- On-hit effects ----------
    register('heal_from_damage', {
        onHit(ctx, hit) {
            const amount = Math.floor(hit.damage * ctx.effect.ratio);
            const healed = ctx.engine.heal(ctx.caster, amount);
            if (healed > 0) ctx.engine.say(`${ctx.caster.name} leeches ${healed} HP!`);
        }
    });

    register('gain_resource_on_hit', {
        onHit(ctx, hit) {
            const amount = hit.isCrit && ctx.effect.critValue ? ctx.effect.critValue : ctx.effect.value;
            const gained = ctx.engine.gainResource(ctx.caster, amount);
            if (gained > 0) ctx.engine.say(`You generated ${gained} ${ctx.caster.resource.type}!`);
        }
    });

    // ---------- Applied effects ----------
    register('gain_resource', {
        apply(ctx) {
            const gained = ctx.engine.gainResource(ctx.caster, ctx.effect.value);
            ctx.engine.say(`${ctx.caster.name} gains ${gained} ${ctx.caster.resource.type}.`);
        }
    });

    register('take_true_damage', {
        apply(ctx) {
            ctx.engine.damage(ctx.caster, ctx.effect.value, ctx.caster);
            ctx.engine.say(`${ctx.caster.name} pays ${ctx.effect.value} HP.`);
        }
    });

    register('apply_status', {
        partial: 'status is stored but has no gameplay effect yet (cooldowns, enemy accuracy buffs)',
        apply(ctx) {
            ctx.engine.applyStatus(ctx.caster, ctx.caster, {
                name: ctx.effect.status, type: 'status', value: ctx.effect.value, duration: ctx.effect.duration
            });
        }
    });

    register('damage_reduction', {
        apply(ctx) {
            // Trait overrides are authored in progression data, never balanced here.
            const trait = ctx.caster.isPlayer && ctx.effect.traitOverride &&
                ctx.caster.traits.find(t => t.name === ctx.effect.traitOverride);
            const value = trait && trait.damageReductionOverride != null
                ? trait.damageReductionOverride : ctx.effect.value;
            const ok = ctx.engine.applyStatus(ctx.caster, ctx.caster, {
                name: ctx.skill.name, type: 'damage_reduction', value, duration: ctx.effect.duration
            });
            if (ok) ctx.engine.say(`${ctx.caster.name} braces for impact!`);
        }
    });

    function skipTurns(ctx, label) {
        const hit = ctx.targets.filter((t) => t.hp > 0 && ctx.engine.applyStatus(ctx.caster, t, { name: label, type: 'skip_turn', duration: ctx.effect.duration }));
        if (hit.length) ctx.engine.say(`${hit.map(t => t.name).join(', ')} ${hit.length > 1 ? 'are' : 'is'} stunned!`);
        return hit;
    }

    register('stun', {
        applies: { name: 'Stun', type: 'skip_turn' }, // control status (Control Resistance hints in getAvailableActions)
        apply(ctx) {
            const gate = ctx.effect.condition;
            const live = ctx.targets.filter((t) => t.hp > 0);
            if (gate && (!ctx.caster.resource || ctx.caster.resource.type !== gate.stat ||
                gate.operator !== '>=' || ctx.caster.resource.current < gate.value)) {
                // QA-16: say why there's no stun instead of withholding it silently
                if (live.length && ctx.caster.isPlayer) ctx.engine.say(`(No stun: needs ${gate.value} ${gate.stat}.)`);
                return;
            }
            const eligible = ctx.effect.shieldBashRecovery
                ? ctx.targets.filter((t) => !t.shieldBashRecovery) : ctx.targets;
            if (ctx.effect.shieldBashRecovery) {
                for (const t of live.filter((x) => x.shieldBashRecovery)) ctx.engine.say(`(No stun: ${t.name} is still recovering from the last one.)`);
            }
            const stunned = skipTurns({ ...ctx, targets: eligible }, 'Stun');
            // QA-2 lockout starts only when THIS bash's stun landed (a resisted bash on a target that
            // is already stunned by something else doesn't use up the target's eligibility).
            if (ctx.effect.shieldBashRecovery) for (const t of stunned) t.shieldBashRecovery = 'await_skip';
        }
    });

    register('skip_turn', {
        applies: { name: 'Frozen in time', type: 'skip_turn' }, // control status (Control Resistance hints in getAvailableActions)
        apply(ctx) {
            for (const t of ctx.targets.filter(t => t.hp > 0)) {
                const inst = ctx.engine.applyStatus(ctx.caster, t, { name: 'Frozen in time', type: 'skip_turn', duration: ctx.effect.duration });
                if (!inst) continue;
                ctx.engine.say(`${t.name} loses ${inst.duration > 1 ? inst.duration + ' turns' : 'its next turn'}!`); // after Control Resistance
            }
        }
    });

    register('summon', {
        partial: 'per-summon damage override is ignored (minion template damage is used)',
        requires(ctx) {
            const e = ctx.engine;
            return e.alive(e.combat.minions).length >= e.minionCap() ? `You can't control more than ${e.minionCap()} minions.` : null;
        },
        apply(ctx) {
            const minion = ctx.engine.summon(ctx.effect.summon_type);
            if (!minion) return;
            // e.g. Raise Ghoul: the ghoul's hits apply [Weaken] — added to the minion's own attack,
            // so it goes through the same status pipeline as everyone else.
            if (ctx.effect.apply_effect && minion.skills[0]) {
                minion.skills[0] = { ...minion.skills[0], effects: [...(minion.skills[0].effects || []), ctx.effect.apply_effect] };
            }
            ctx.engine.say(`${ctx.caster.name} summons a ${minion.name}!`);
        }
    });

    // ---------- Damage over time ----------
    // A DoT is a status { type: 'dot', name, value, duration, appliedBy } on the target.
    // It deals `value` damage at the start of each of the target's turns (ignores armor),
    // then ticks down like any other status. Kill credit goes to whoever applied it.
    function applyDot(ctx, name, value, duration) {
        for (const t of ctx.targets.filter((t) => t.hp > 0)) ctx.engine.applyDot(ctx.caster, t, { name, value, duration });
    }

    register('bleed', {
        apply(ctx) { applyDot(ctx, 'Bleed', ctx.effect.value, ctx.effect.duration); }
    });

    // Soulbinder N-3/N-4: status-backed memberships and drain snapshots.
    register('link_targets', {
        requires(ctx) {
            const count = ctx.engine.hasTrait('Wound Transfer') ? 3 : ctx.effect.count;
            const live = ctx.targets.filter(t => t && t.hp > 0 && !t.erased);
            if (live.length < 2 || new Set(live.map(t => t.id)).size !== live.length)
                return 'Soul Chain needs at least two different living enemies.';
            if (live.some(t => (t.statusAffinities || {})['Soul Chain'] === 'immune'))
                return 'Soul Chain cannot link an immune enemy.';
            if (live.length !== count && !(count === 3 && live.length === 2 &&
                ctx.engine.alive(ctx.engine.combat.enemies).length === 2))
                return 'Select the required number of distinct enemies for Soul Chain.';
            return null;
        },
        apply(ctx) {
            const e = ctx.engine;
            const previous = e.combat.enemies.filter(t =>
                t.statusEffects.some(s => s.type === 'soul_link' && s.appliedBy === ctx.caster.id));
            for (const t of previous) {
                t.statusEffects = t.statusEffects.filter(s =>
                    !(s.type === 'soul_link' && s.appliedBy === ctx.caster.id));
            }
            const group = ++e.combat.nextSoulLinkId;
            const duration = 2 + (ctx.caster.isPlayer && e.hasTrait('Binding Will') ? 1 : 0);
            // K1: one caster-owned clock (a combat timer; a recast replaces it).
            e.addTimer(ctx.caster, 'soul_link', duration, { replace: true, countSkipped: true, group });
            for (const t of ctx.targets) e.applyStatus(ctx.caster, t, {
                name: 'Soul Chain', type: 'soul_link', duration: 'permanent', linkGroup: group
            });
            e.say(`Soul Chain binds ${ctx.targets.map(t => t.name).join(' and ')}!`);
        }
    });

    register('drain_hp_from_linked', {
        requires(ctx) {
            return ctx.engine.activeSoulLinks(ctx.caster).length
                ? null : 'Soul Feast requires living linked enemies.';
        },
        apply(ctx) {
            const e = ctx.engine;
            const links = e.activeSoulLinks(ctx.caster);
            for (const t of e.combat.enemies) {
                t.statusEffects = t.statusEffects.filter(s =>
                    !(s.type === 'soul_feast' && s.appliedBy === ctx.caster.id));
            }
            for (const t of links) {
                const link = t.statusEffects.find(s =>
                    s.type === 'soul_link' && s.appliedBy === ctx.caster.id);
                e.applyStatus(ctx.caster, t, {
                    name: 'Soul Feast', type: 'soul_feast', category: 'dot',
                    duration: ctx.effect.duration, value: ctx.effect.value,
                    linkGroup: link.linkGroup
                });
            }
            e.say(`Soul Feast begins draining ${links.length} linked enemies.`);
        }
    });

    register('dot', {
        apply(ctx) {
            const type = ctx.effect.dot_type || 'damage';
            applyDot(ctx, type.charAt(0).toUpperCase() + type.slice(1), ctx.effect.value, ctx.effect.duration);
        }
    });

    // =====================================================================
    // Batch 3 — Rogue, Mage, Plaguecaller
    // New hooks used here:
    //   requires(ctx)      return an error string to refuse the cast (no cost, no turn used)
    //   replacesDamage     true = the skill's base_damage is NOT dealt on cast (e.g. delayed bombs)
    // =====================================================================
    const living = (ctx) => ctx.targets.filter((t) => t.hp > 0 && !t.erased);
    const chance = (ctx, p) => ctx.engine.rng() < p;

    // ---------- defensive buffs (player) ----------
    register('dodge_chance', { // Evasion: 50% to dodge the next attack
        apply(ctx) {
            if (!ctx.engine.applyStatus(ctx.caster, ctx.caster, { name: ctx.skill.name, type: 'dodge', value: ctx.effect.value, duration: ctx.effect.duration })) return;
            ctx.engine.say(`${ctx.caster.name} gets light on their feet (${Math.round(ctx.effect.value * 100)}% to dodge the next attack).`);
        }
    });

    register('avoid_next_hit', { // Mirror Image: the next hit always misses
        apply(ctx) {
            if (!ctx.engine.applyStatus(ctx.caster, ctx.caster, { name: 'Mirror Image', type: 'dodge', value: 1, duration: ctx.effect.duration })) return;
            ctx.engine.say('Shimmering copies of you fill the air. The next hit will strike an illusion.');
        }
    });

    register('absorb_hit', { // Bone Wall: absorb the next connecting attack
        apply(ctx) {
            if (!ctx.engine.applyStatus(ctx.caster, ctx.caster, {
                name: ctx.skill.name, type: 'absorb', duration: ctx.effect.duration
            })) return;
            ctx.engine.say(`${ctx.caster.name} raises a wall of bone against the next hit.`);
        }
    });

    register('counter_attack', { // Riposte: counter the next attack for +50%
        apply(ctx) {
            if (!ctx.engine.applyStatus(ctx.caster, ctx.caster, { name: 'Riposte', type: 'counter', value: ctx.effect.bonus_damage, duration: ctx.effect.duration })) return;
            ctx.engine.say(`${ctx.caster.name} takes a dueling stance, ready to riposte.`);
        }
    });

    register('guaranteed_crit_next_hit', { // Shadowstep: next hit crits (lasts until used, this fight)
        apply(ctx) {
            if (!ctx.engine.applyStatus(ctx.caster, ctx.caster, { name: 'Guaranteed Crit', type: 'buff', duration: 'permanent' })) return;
            ctx.engine.say('Your next hit will be a critical strike.');
        }
    });

    // ---------- disables & debuffs (enemies) ----------
    register('silence', { // Garrote: enemy can only use a basic attack
        applies: { name: 'Silence', type: 'silence' }, // control status (Control Resistance hints in getAvailableActions)
        apply(ctx) {
            for (const t of living(ctx)) {
                if (ctx.engine.applyStatus(ctx.caster, t, { name: 'Silence', type: 'silence', duration: ctx.effect.duration })) ctx.engine.say(`${t.name} is silenced!`);
            }
        }
    });

    function slow(ctx, t, value, duration) {
        const inst = ctx.engine.applyStatus(ctx.caster, t, { name: 'Slow', type: 'slow', value, duration });
        if (inst) ctx.engine.say(`${t.name} is slowed (-${Math.round(inst.value * 100)}% speed).`); // after Control Resistance
    }
    register('slow', { // Caltrops
        applies: { name: 'Slow', type: 'slow' }, // control status (Control Resistance hints in getAvailableActions)
        apply(ctx) { for (const t of living(ctx)) slow(ctx, t, ctx.effect.value, ctx.effect.duration); }
    });
    register('slow_chance', { // Ice Lance: 30% chance to slow (by 50%)
        applies: { name: 'Slow', type: 'slow' }, // control status (Control Resistance hints in getAvailableActions)
        apply(ctx) {
            for (const t of living(ctx)) if (chance(ctx, ctx.effect.value)) slow(ctx, t, 0.5, ctx.effect.duration);
        }
    });

    register('blind', { // Smoke Bomb: -25% hit chance
        apply(ctx) {
            const hit = living(ctx).filter((t) => ctx.engine.applyStatus(ctx.caster, t, { name: 'Blind', type: 'blind', value: ctx.effect.value, duration: ctx.effect.duration }));
            if (hit.length) ctx.engine.say(`Smoke fills the room! Enemies have -${Math.round(ctx.effect.value * 100)}% hit chance.`);
        }
    });

    function skip(ctx, t, duration, label) {
        return !!ctx.engine.applyStatus(ctx.caster, t, { name: label, type: 'skip_turn', duration });
    }
    register('skip_turn_chance', { // Confuse: 50% chance the enemy skips its turn
        applies: { name: 'Confused', type: 'skip_turn' }, // control status (Control Resistance hints in getAvailableActions)
        apply(ctx) {
            for (const t of living(ctx)) {
                if (chance(ctx, ctx.effect.value)) { if (skip(ctx, t, ctx.effect.duration, 'Confused')) ctx.engine.say(`${t.name} is confused and will lose its next turn!`); }
                else ctx.engine.say(`${t.name} shakes off the confusion.`);
            }
        }
    });
    register('skip_turn_aoe', { // Multi-target illusions: up to N enemies skip
        applies: { name: 'Entranced', type: 'skip_turn' }, // control status (Control Resistance hints in getAvailableActions)
        apply(ctx) {
            const hit = living(ctx).slice(0, ctx.effect.count || 3).filter((t) => skip(ctx, t, ctx.effect.duration, 'Entranced'));
            if (hit.length) ctx.engine.say(`${hit.map((t) => t.name).join(', ')} ${hit.length > 1 ? 'are' : 'is'} lost in illusions and will skip a turn!`);
        }
    });
    register('control_enemy', { // Possession (N-5): you choose the target's next move (src/engine/control.js)
        applies: { name: 'Possessed', type: 'possessed' }, // control status (Control Resistance hints in getAvailableActions)
        requires(ctx) {
            for (const t of ctx.targets || []) {
                const problem = t && ctx.engine.possessionProblem(t);
                if (problem) return problem;
            }
            return null;
        },
        apply(ctx) { for (const t of living(ctx)) ctx.engine.possess(ctx.caster, t, ctx.effect); }
    });
    register('freeze_enemies', { // Freeze Time
        applies: { name: 'Frozen in time', type: 'skip_turn' }, // control status (Control Resistance hints in getAvailableActions)
        apply(ctx) {
            for (const t of living(ctx)) skip(ctx, t, ctx.effect.duration, 'Frozen in time');
            ctx.engine.say('Time stops.');
        }
    });

    register('instant_kill_if_low_hp', { // Assassinate
        requires(ctx) {
            const t = ctx.targets[0];
            if (t && t.hp / t.maxHp >= ctx.effect.threshold) return `${t.name} is too healthy to assassinate (${Math.round((t.hp / t.maxHp) * 100)}% HP, needs < ${Math.round(ctx.effect.threshold * 100)}%).`;
            return null;
        },
        apply(ctx) {
            for (const t of living(ctx)) {
                ctx.engine.say(`${ctx.caster.name} finds the gap in ${t.name}'s guard. One strike. It's over.`, { important: true });
                ctx.engine.damage(t, t.hp, ctx.caster);
            }
        }
    });

    // ---------- area & timing ----------
    register('chain_lightning', { // Lightning Arc: arcs to N more enemies
        onHit(ctx, hit) {
            if (ctx.chained) return;
            const others = ctx.engine.alive(ctx.engine.combat.enemies).filter((e) => e !== hit.target).slice(0, ctx.effect.count);
            for (const t of others) {
                const h = ctx.engine.newHit(t);
                ctx.engine.rollDamage(ctx.caster, t, ctx.skill, h);
                ctx.engine.say(`  ...lightning arcs to ${t.name} for ${h.damage} damage!${h.isCrit ? ' (CRITICAL HIT!)' : ''}`);
                ctx.engine.damage(t, h.damage, ctx.caster, { alreadyScaled: true });
            }
        }
    });

    register('delayed_aoe', { // Clockwork Bomb: explodes at the start of your next turn
        replacesDamage: true,
        apply(ctx) {
            ctx.engine.combat.delayed.push({ skill: ctx.skill, turns: ctx.effect.delay });
            ctx.engine.say(`You set the ${ctx.skill.name}. Tick... tick...`);
        }
    });

    register('place_trap', { // Poison Trap: the next enemy to act springs it (max 3 traps)
        requires(ctx) {
            return ctx.engine.combat.traps.length >= 3 ? 'You already have 3 traps set (max 3).' : null;
        },
        apply(ctx) {
            let value = ctx.effect.value;
            if (ctx.engine.hasTrait('Traps deal +50% dmg')) value = Math.floor(value * 1.5);
            ctx.engine.combat.traps.push({ name: `${ctx.effect.trap_type} trap`, dot: ctx.effect.trap_type, value, duration: ctx.effect.duration });
            ctx.engine.say(`You hide a ${ctx.effect.trap_type} trap. (${ctx.engine.combat.traps.length}/3 set)`);
        }
    });

    // ---------- time ----------
    register('extra_turn', { // Haste: act again immediately
        apply(ctx) {
            ctx.engine.combat.extraTurn = true;
            ctx.engine.say('Time bends around you. You may act again!', { important: true });
        }
    });

    register('revert_hp', { // Revert HP to what it was N turns ago
        apply(ctx) {
            const p = ctx.engine.player;
            const hist = ctx.engine.combat.hpHistory;
            const old = hist[Math.max(0, hist.length - 1 - ctx.effect.turns)];
            const before = p.hp;
            p.hp = Math.min(p.maxHp, old);
            ctx.engine.say(`The wounds of the last ${ctx.effect.turns} turns unravel. HP ${before} → ${p.hp}.`);
        }
    });

    // ---------- infections (Plaguecaller) ----------
    // An infection is a stacking DoT: 2 dmg per stack per turn, max 3 stacks, lasts 3 turns,
    // refreshed by new stacks. When an infected enemy dies it spreads 1 stack to every other enemy.
    register('infect', { // Contagion
        apply(ctx) { for (const t of living(ctx)) ctx.engine.infect(ctx.caster, t, 1, { spreadOnDeath: !!ctx.effect.spread_on_death, duration: ctx.effect.duration }); }
    });

    register('apply_infection_aoe', { // Corpse Bloom: +N stacks to everything hit
        apply(ctx) { for (const t of living(ctx)) ctx.engine.infect(ctx.caster, t, ctx.effect.stacks || 1); }
    });

    register('aoe_damage_from_corpse', { // Corpse Bloom: needs (and consumes) a corpse
        requires(ctx) { return ctx.engine.combat.corpses > 0 ? null : 'There is no corpse on the battlefield to bloom.'; },
        apply(ctx) {
            ctx.engine.combat.corpses--;
            ctx.engine.say(`A corpse bursts in a cloud of rot! (Corpses left: ${ctx.engine.combat.corpses})`);
        }
    });

    register('spread_all_infections', { // Plague Wind: every enemy gets the worst infection on the field
        requires(ctx) {
            return ctx.engine.alive(ctx.engine.combat.enemies).some((e) => ctx.engine.infectionOn(e)) ? null : 'No enemy is infected — there is nothing to spread.';
        },
        apply(ctx) {
            const enemies = ctx.engine.alive(ctx.engine.combat.enemies);
            const worst = Math.max(...enemies.map((e) => (ctx.engine.infectionOn(e) || { stacks: 0 }).stacks));
            ctx.engine.say('A foul wind howls through the room...', { important: true });
            for (const e of enemies) {
                const cur = ctx.engine.infectionOn(e);
                ctx.engine.infect(ctx.caster, e, worst - (cur ? cur.stacks : 0), { quietIfZero: true });
            }
        }
    });

    // ---------- Cleansing (approved rule 12) ----------
    // { type: 'cleanse', categories: ['dot', ...] } and/or { statuses: ['Poison', ...] }. No "remove all" default.
    register('cleanse', {
        apply(ctx) {
            for (const t of living(ctx)) {
                const removed = ctx.engine.cleanse(t, ctx.effect);
                ctx.engine.say(removed.length ? `${t.name} is cleansed of ${removed.map((s) => s.name).join(', ')}.` : `${t.name} has nothing to cleanse.`);
            }
        }
    });

    // ---------- Marks ----------
    // A mark is a status { type: 'mark', name, value, duration, appliedBy } on any combatant.
    // What each mark DOES lives in engine.markModifiers (damage) and engine.speedOf (Pin).
    // Durations are round-based (holder's turns), except marks with an `expiry` policy in data:
    // Marked for Death and Expose count the APPLIER's actionable normal turns (QA-1, Option A).
    register('apply_mark', {
        apply(ctx) {
            for (const t of ctx.targets.filter((t) => t.hp > 0)) ctx.engine.applyMark(ctx.caster, t, ctx.effect);
        }
    });

    register('minion_taunt', {
        apply(ctx) {
            const minions = ctx.engine.combat.minions.filter(m => m.hp > 0 && ctx.engine.applyStatus(ctx.caster, m, { name: 'Taunt', type: 'taunt', duration: ctx.effect.duration }));
            ctx.engine.say(minions.length ? 'Your minions are now taunting enemies!' : 'You have no minions to taunt with.');
        }
    });

    register('remove_from_fight_permanent', {
        apply(ctx) {
            for (const t of ctx.targets) {
                ctx.engine.say(`The Hollow King gestures at ${t.name}. It flickers and is GONE.`, { important: true });
                ctx.engine.erase(t);
            }
        }
    });

    const ENSO = global.ENSO || (global.ENSO = {});
    ENSO.effects = { registry, register };
    if (typeof module !== 'undefined' && module.exports) module.exports = ENSO.effects;
})(typeof window !== 'undefined' ? window : globalThis);
