/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Combat flow
 * Starting and ending fights, round and turn order, enemy and minion turns, marks.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const { clone, cap } = isNode ? require('./util.js') : ENSO.engineUtil;

    class CombatMethods {
        // =====================================================================
        // Combat flow
        // =====================================================================
        startCombat(enemyKeys, scope = this.currentRoom) {
            this.say('--- COMBAT INITIATED! ---', { important: true });
            const enemies = enemyKeys.map((key, i) => {
                const e = clone(this.data.enemies[key]);
                Object.assign(e, { id: `enemy_${i}`, key, entityKey: `${scope}#${i}`, isPlayer: false, isMinion: false, statusEffects: [], lastSkillUsed: null });
                return e;
            });
            this.combat = {
                enemies, minions: [], order: [], idx: 0, round: 0, corpses: 0,
                dealtDamageThisRound: false, playerActedThisRound: false, markedEnemyHitThisRound: false,
                usedOncePerFight: {}, awaitingPlayer: false, nextMinionId: 1,
                traps: [], delayed: [], extraTurn: false, hpHistory: []
            };
            this.player.statusEffects = [];
            this.player.shieldBashRecovery = null; // QA-2 #11: lockout bookkeeping never leaks between fights
            this.mode = 'combat';
            const rule = this.resourceRule();
            if (rule.startOfFight != null) {
                const r = this.player.resource;
                r.current = Math.min(r.max, rule.startOfFight);
                this.say(`(${r.type}: ${r.current}/${r.max} to start the fight)`);
            }

            for (const e of enemies) this.say(`${cap(this.withArticle(e))} appears! (HP: ${e.hp})`);
            this.newRound();
            this.say('--- Battle Order ---', { important: true });
            for (const c of this.combat.order) this.say(`${c.name} (SPD: ${this.speedOf(c)})`);
            this.advance();
        }

        /** "a Rust Rat", "an Acolyte", but "The Crow-Touched Warden" / "James Newton" (QA-7). */
        withArticle(e) {
            if (e.properName || /^the\s/i.test(e.name)) return e.name;
            return `${/^[aeiou]/i.test(e.name) ? 'an' : 'a'} ${e.name}`;
        }

        alive(list) { return list.filter((c) => c.hp > 0 && !c.erased); }

        newRound() {
            const c = this.combat;
            c.round++;
            c.idx = 0;
            c.playerActedThisRound = false;
            c.freeMarkUsedThisRound = false;
            c.order = [this.player, ...this.alive(c.enemies), ...this.alive(c.minions)]
                .sort((a, b) => this.speedOf(b) - this.speedOf(a));
        }

        /** Effective speed this round ([Pin] slows). */
        speedOf(c) {
            let spd = c.spd;
            for (const st of c.statusEffects) {
                if (st.name === 'Pin' || st.type === 'slow') spd *= 1 - Math.min(0.9, this.intensity(st));
            }
            return Math.max(1, Math.floor(spd));
        }

        endRound() {
            const c = this.combat;
            const p = this.player;
            this.say('--- End of Round ---', { important: true });
            if (p.className === 'necromancer' && !p.isHollowKing && c.dealtDamageThisRound) {
                if (this.gainResource(p, 1) > 0) this.say('You gained 1 Soul Energy!');
            }
            if (p.resource.regen > 0) {
                const g = this.gainResource(p, p.resource.regen);
                if (g > 0) this.say(`You regenerate ${g} ${p.resource.type}.`);
            }
            const rule = this.resourceRule();
            if (rule.onMarkedHitRound && c.markedEnemyHitThisRound) {
                if (this.gainResource(p, rule.onMarkedHitRound) > 0) this.say(`A marked foe bleeds. Your ${p.resource.type} grows (+${rule.onMarkedHitRound}).`);
            }
            c.dealtDamageThisRound = false;
            c.markedEnemyHitThisRound = false;
            this.tickStatusesEndOfRound(); // round-based durations (approved rule 11)
        }

        /** Runs NPC turns until the player must act or the fight ends. */
        advance() {
            const c = this.combat;
            let safety = 0;
            while (this.mode === 'combat') {
                if (++safety > 2000) throw new Error('Combat loop ran away (no one can act?)');
                if (this.checkBattleEnd()) return;
                if (c.idx >= c.order.length) { this.endRound(); this.newRound(); continue; }

                const actor = c.order[c.idx];
                if (actor.hp <= 0 || actor.erased) { c.idx++; continue; }

                if (this.startTurn(actor)) {
                    if (actor.shieldBashRecovery === 'await_skip') actor.shieldBashRecovery = 'await_recovery';
                    if (actor.hp > 0 && actor.isPlayer) {
                        // QA-5: pause on the player's skipped turn instead of simulating on by itself.
                        // Each command now runs at most ~one round, so a stun-lock can't run away.
                        if (this.checkBattleEnd()) return;
                        c.awaitingPlayer = true;
                        c.awaitingContinue = true;
                        this.say(`${actor.name} is unable to act this turn!`, { important: true });
                        this.say('(Type anything to continue.)');
                        return;
                    }
                    if (actor.hp > 0) this.say(`${actor.name} is unable to act this turn!`);
                    c.idx++;
                    continue;
                }
                // QA-2: a Shield Bash stun that never caused a skip (e.g. cleansed) doesn't start a lockout.
                if (actor.shieldBashRecovery === 'await_skip') actor.shieldBashRecovery = null;
                this.beginNormalTurn(actor);
                if (actor.isPlayer) {
                    c.hpHistory.push(actor.hp);
                    this.detonateBombs();
                    if (this.checkBattleEnd()) return;
                    c.awaitingPlayer = true;
                    this.say('--- Your Turn! ---', { important: true });
                    this.showCombatState();
                    return;
                }
                this.say(`--- ${actor.name}'s Turn! ---`, { important: true });
                if (actor.isMinion) this.minionTurn(actor); else this.enemyTurn(actor);
                this.endNormalTurn(actor);
                if (actor.shieldBashRecovery === 'await_recovery') actor.shieldBashRecovery = null;
                c.idx++;
            }
        }

        /** Start of a turn: traps, DoT ticks, statuses become effective. Returns true if the turn is skipped.
         *  Durations are NOT reduced here — they tick once per completed round (see statuses.js). */
        startTurn(actor) {
            this.expireAtTurnStart(actor); // QA-1: Guard ends as the next scheduled turn begins, even if skipped
            if (!actor.isPlayer && !actor.isMinion) this.springTrap(actor);
            this.tickDots(actor);
            if (actor.hp <= 0) return true;
            this.armStatuses(actor);
            return actor.statusEffects.some((s) => s.type === 'skip_turn');
        }

        resourceRule() { return (this.data.resourceRules || {})[this.player.resource.type] || {}; }

        resourceEvent(event, amount = 1, label = '') {
            const rule = this.resourceRule()[event];
            if (!rule) return;
            const g = this.gainResource(this.player, rule * amount);
            if (g > 0) this.say(`+${g} ${this.player.resource.type}${label ? ` (${label})` : ''}.`);
        }

        springTrap(enemy) {
            const c = this.combat;
            const trap = c.traps.shift();
            if (!trap) return;
            this.say(`${enemy.name} steps on your ${trap.name}!`, { important: true });
            this.applyDot(this.player, enemy, { name: trap.dot.charAt(0).toUpperCase() + trap.dot.slice(1), value: trap.value, duration: trap.duration });
        }

        detonateBombs() {
            const c = this.combat;
            const ready = c.delayed.filter((b) => --b.turns <= 0);
            c.delayed = c.delayed.filter((b) => b.turns > 0);
            for (const bomb of ready) {
                this.say(`💥 Your ${bomb.skill.name} explodes!`, { important: true });
                for (const t of this.alive(c.enemies)) {
                    const hit = this.newHit(t);
                    this.rollDamage(this.player, t, bomb.skill, hit);
                    this.say(`${t.name} takes ${hit.damage} damage!${hit.isCrit ? ' (CRITICAL HIT!)' : ''}`);
                    this.damage(t, hit.damage, this.player);
                }
            }
        }

        findCombatant(id) {
            if (id === 'player') return this.player;
            const c = this.combat;
            return c ? [...c.enemies, ...c.minions].find((x) => x.id === id) || null : null;
        }

        // ---------- marks ----------
        applyMark(source, target, effect) {
            const inst = this.applyStatus(source, target, { name: effect.mark, type: 'mark', value: effect.value, duration: effect.duration });
            if (inst) this.say(`${target.name} is marked: [${effect.mark}]${effect.duration ? ` for ${effect.duration} turn${effect.duration > 1 ? 's' : ''}` : ''}.`);
            return inst;
        }

        hasTrait(name) {
            const norm = (x) => x.replace(/[’‘]/g, "'").toLowerCase();
            return this.player.traits.some((t) => norm(t.name) === norm(name));
        }

        isPlayerSide(c) { return !!c && (c.isPlayer || c.isMinion); }

        /** Damage multipliers from marks and mark-related traits. */
        markModifiers(attacker, target, hit) {
            let mult = 1;
            for (const m of this.marksOn(target)) {
                if (m.name === 'Expose') mult *= 1 + this.intensity(m);
                if (m.name === 'Marked for Death' && this.markEligible(attacker, m)) { mult *= 1 + this.intensity(m); hit.consumeMarks.push(m); }
            }
            for (const m of this.marksOn(attacker)) {
                if (m.name === 'Weaken') mult *= 1 - Math.min(0.9, this.intensity(m));
            }
            if (this.isPlayerSide(attacker) && this.marksOn(target).length && this.hasTrait('Synergy Marks')) mult *= 1.1;
            return mult;
        }

        checkBattleEnd() {
            const c = this.combat;
            const p = this.player;

            if (p.hp <= 0) {
                if (this.tryCrownOfTheUndying()) return false;
                this.say('--- DEFEAT! ---', { important: true });
                this.say("You have been defeated! Game Over. Type 'start' to play again.");
                this.mode = 'game_over';
                this.combat = null;
                this.worldFightEnded('defeat');
                return true;
            }
            if (this.alive(c.enemies).length === 0) {
                const rules = this.data.gameRules;
                const xp = c.enemies.reduce((sum, e) => sum + (e.xp != null ? e.xp : rules.defaultEnemyXp), 0);
                this.say('--- VICTORY! ---', { important: true });
                this.mode = 'explore';
                this.combat = null;
                this.stats.fights++;
                this.stats.rounds += c.round;
                p.statusEffects = [];
                const worldFight = this.world && this.world.encounter;
                const room = worldFight ? null : this.rooms[this.currentRoom];
                if (room) room.enemies = [];
                const healed = this.heal(p, Math.floor(p.maxHp * rules.postFightHealPct));
                if (healed > 0) this.say(`You catch your breath. +${healed} HP (${p.hp}/${p.maxHp}).`);
                this.say(`You defeated all enemies and gained ${xp} XP!`);
                this.addExperience(xp, { quiet: true });
                if (worldFight) { this.worldFightEnded('victory'); this.maybePromptBranch(); return true; }
                if (room.onClear && room.onClear.type === 'win') { this.win(room.onClear); return true; }
                this.say('');
                this.describeRoom(false);
                this.maybePromptBranch();
                return true;
            }
            return false;
        }

        win(ending) {
            const p = this.player;
            this.mode = 'won';
            this.pendingBranchChoice = false;
            this.say('');
            for (const line of ending.text.split('\n')) this.say(line, { important: true });
            this.say('');
            this.say('=== YOU ESCAPED THE CELLAR ===', { important: true });
            this.say(`${p.name} — Level ${p.level} ${this.progression.evolutionName}`);
            this.say(`Fights won: ${this.stats.fights} · Enemies slain: ${this.stats.kills} · Rounds fought: ${this.stats.rounds}`);
            this.say("Thanks for playing! Type 'start' to play again.");
        }

        tryCrownOfTheUndying() {
            const p = this.player;
            if (!p.isHollowKing || !p.traits.some((t) => t.name === 'Crown of the Undying')) return false;
            const newMax = Math.floor(p.maxHp * 0.9);
            if (newMax < p.originalMaxHp * 0.25) return false;
            p.maxHp = newMax;
            p.hp = Math.floor(p.maxHp * 0.3);
            p.dead = false;
            p.resource.current = 0;
            this.say('Your form dissolves into nothingness... but the crown remains.', { important: true });
            this.say(`Silence reigns, and from it, you are remade. (Max HP is now ${p.maxHp}.)`, { important: true });
            return true;
        }

        enemyTurn(enemy) {
            const c = this.combat;
            const taunter = this.alive(c.minions).find((m) => m.statusEffects.some((s) => s.type === 'taunt'));
            const target = taunter || this.player;
            let skill = enemy.skills.length
                ? enemy.skills[Math.floor(this.rng() * enemy.skills.length)]
                : this.data.skillDefinitions['Basic Attack'];
            if (this.statusOfType(enemy, 'silence')) {
                skill = this.data.skillDefinitions['Basic Attack'];
                this.say(`${enemy.name} is silenced and can only flail.`);
            }
            enemy.lastSkillUsed = skill.name;
            this.castSkill(enemy, skill, [target]);
        }

        minionTurn(minion) {
            const target = this.alive(this.combat.enemies)[0];
            if (!target) { this.say(`${minion.name} has no target to attack.`); return; }
            this.castSkill(minion, minion.skills[0], [target]);
        }

        /** Before a hit lands: the attacker's Blind and the target's dodge buffs. Returns false if the hit misses. */
        hitConnects(attacker, target) {
            const blind = this.statusOfType(attacker, 'blind');
            if (blind && this.rng() < this.intensity(blind)) {
                this.say(`${attacker.name} swings blindly and misses ${target.name}!`);
                return false;
            }
            const dodge = this.statusOfType(target, 'dodge');
            if (dodge) {
                this.removeStatus(target, dodge);
                if (this.rng() < dodge.value) {
                    this.say(`${attacker.name} attacks — but ${target.name} ${dodge.name === 'Mirror Image' ? 'was an illusion' : 'dodges'}! (${dodge.name})`, { important: true });
                    if (target.isPlayer) this.resourceEvent('onDodge', 1, 'dodge');
                    this.counterAttack(target, attacker);
                    return false;
                }
                this.say(`(${dodge.name} fails — ${attacker.name} connects.)`);
            }
            // A missed attack never consumes an absorb. A connecting attack does,
            // even if another defense would have reduced its damage.
            const absorb = this.statusOfType(target, 'absorb');
            if (absorb) {
                this.removeStatus(target, absorb);
                this.say(`${target.name}'s ${absorb.name} absorbs ${attacker.name}'s hit entirely!`, { important: true });
                return false;
            }
            return true;
        }

        /** Riposte (any holder): answer the attacker with your basic attack, boosted. */
        counterAttack(holder, attacker) {
            const counter = this.statusOfType(holder, 'counter');
            if (!counter || attacker.hp <= 0 || holder.hp <= 0) return;
            this.removeStatus(holder, counter);
            const skill = holder.isPlayer ? this.playerSkill(this.basicAttackName()) : (holder.skills && holder.skills[0]) || this.data.skillDefinitions['Basic Attack'];
            const hit = this.newHit(attacker);
            this.rollDamage(holder, attacker, skill, hit);
            hit.damage = Math.floor(hit.damage * (1 + counter.value));
            this.say(`Riposte! ${holder.name} counters ${attacker.name} for ${hit.damage} damage!${hit.isCrit ? ' (CRITICAL HIT!)' : ''}`, { important: true });
            this.damage(attacker, hit.damage, holder);
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['combat'] = CombatMethods;
    if (isNode) module.exports = CombatMethods;
})(typeof window !== 'undefined' ? window : globalThis);
