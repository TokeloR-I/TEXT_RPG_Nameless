/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Action combat bridge (combat v3)
 * docs/ACTION_COMBAT.md. Numbers: actionRules in src/data.js.
 *
 * In the graphical game the fight happens in the world. src/action/sim.js owns
 * space and time (positions, hitboxes, dodges, enemy AI) and tells the engine
 * who was hit by what; the engine keeps every rule: damage, statuses,
 * resources, cooldowns, XP, loot and quests, through the same functions the
 * turn-based and v2 real-time fights use. The engine never sees a coordinate
 * except the spot a group's loot drops on.
 *
 *   new GameEngine({ combatMode: 'action' })
 *
 * An action fight is a v2 real-time fight (realtime.js) with the enemy
 * schedules switched off (`combat.rt.external`): the sim decides when an enemy
 * winds up and strikes. Enemy groups (world encounters) join and leave one
 * fight; each clears on its own (XP, quest event, loot on the ground), and
 * the fight ends when none is left. The player dying is not game over: they
 * wake at the map's safe spawn with half HP (the front end moves them).
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const { cap } = isNode ? require('./util.js') : ENSO.engineUtil;

    // Target kinds the caster doesn't aim: they resolve the moment they're cast.
    const AT_ONCE = new Set(['self', 'minions', 'ground', 'corpse', 'linked_enemies']);
    // Effect types a self skill may run out of a fight (pre-buffing): ones that only give the caster a status or
    // touch its own HP and resource. A skill with any other handled effect works in a fight only.
    const CALM_EFFECTS = new Set(['damage_reduction', 'apply_status', 'absorb_hit', 'dodge_chance', 'counter_attack', 'avoid_next_hit',
        'bonus_damage_vs_flag_percent', 'gain_resource', 'take_true_damage']);

    class ActionCombatMethods {
        /** Is the current fight an action (in-world) one? */
        actionActive() { return this.mode === 'combat' && !!(this.combat && this.combat.action); }
        actionRules() { return this.data.actionRules || {}; }

        /** Run `fn` as one transaction; returns act()'s shape plus whatever fields `fn` returns. */
        actionRun(fn) {
            this.rejection = null;
            let failure = null;
            let extra = null;
            const events = this.transact(() => { extra = fn(); }, (err) => { failure = err; });
            const rejection = this.rejection;
            this.rejection = null;
            if (failure) return { ok: false, events, error: { code: 'INTERNAL_ERROR', message: failure.message } };
            if (rejection) return { ok: false, events, error: rejection };
            return { ok: true, events, ...(extra || {}) };
        }

        // =====================================================================
        // Groups
        // =====================================================================
        /** A world encounter's group enters the fight (starts one, or joins the running one). */
        actionEngage(encounterId, enemyKeys, loot = null, at = null) {
            return this.actionRun(() => {
                const id = String(encounterId || '');
                if (this.combatMode !== 'action') { this.refuse('WRONG_MODE', 'Action combat is off.'); return null; }
                if (!this.world) { this.refuse('WRONG_MODE', 'Enter the world first.'); return null; }
                if (this.isDefeated(id)) { this.refuse('ALREADY_DEFEATED', 'Nothing stirs here any more.'); return null; }
                if (!Array.isArray(enemyKeys) || !enemyKeys.length || enemyKeys.some((k) => !this.data.enemies[k])) { this.refuse('INVALID_ENCOUNTER', `Unknown enemies for '${id}'.`); return null; }
                const scope = `world:${id}`;
                let enemies;
                if (this.mode === 'explore') {
                    const buffs = this.actionCarriedBuffs();     // startCombat clears statuses: your pre-buffs come along
                    this.startCombat(enemyKeys, scope, loot);   // combatMode 'action': rtBegin() sets combat.action
                    enemies = this.combat.enemies;
                    this.actionRestoreFollowers();
                    this.actionRestoreBuffs(buffs);
                } else if (this.actionActive()) {
                    if (this.combat.action.groups[id]) { this.refuse('ALREADY_ENGAGED', 'They are already on you.'); return null; }
                    // A second group joins without startCombat(): that would wipe the player's statuses and CR.
                    enemies = this.buildEnemies(enemyKeys, scope, loot, this.combat.action.nextEnemyId);
                    this.combat.enemies.push(...enemies);
                    for (const e of enemies) this.say(`${cap(this.withArticle(e))} joins the fight! (HP: ${e.hp})`);
                } else { this.refuse('WRONG_MODE', 'Not now.'); return null; }
                const a = this.combat.action;
                a.nextEnemyId = Math.max(a.nextEnemyId, ...enemies.map((e) => Number(e.id.split('_')[1]) + 1));   // ids never repeat in a fight
                for (const e of enemies) {
                    e.encounterId = id;
                    const hpMult = (((this.actionRules().bosses || {})[e.key]) || {}).hpMult;   // action play hits far more often than a v2 swing (Gauge)
                    if (hpMult > 0 && hpMult !== 1) e.hp = e.maxHp = Math.round(e.maxHp * hpMult);
                }
                a.groups[id] = { encounterId: id, ids: enemies.map((e) => e.id), at: at ? { mapId: at.mapId, x: at.x, y: at.y } : null };
                this.out.push({ type: 'action.engage', encounterId: id, ids: a.groups[id].ids.slice() });
                return { ids: a.groups[id].ids.slice() };
            });
        }

        /** The group gave up (leash): its living enemies leave the fight, unhurt next time. */
        actionDisengage(encounterId) {
            return this.actionRun(() => {
                const id = String(encounterId || '');
                const c = this.combat;
                if (!this.actionActive() || !c.action.groups[id]) { this.refuse('NOT_ENGAGED', `'${id}' isn't in the fight.`); return null; }
                this.actionDropGroup(id);
                const names = [...new Set(c.enemies.filter((e) => e.encounterId === id).map((e) => e.name))];
                c.enemies = c.enemies.filter((e) => e.encounterId !== id || e.hp <= 0);
                for (const eid of Object.keys(c.rt.actors)) if (!c.enemies.some((e) => e.id === eid) && !c.minions.some((m) => m.id === eid)) delete c.rt.actors[eid];
                if (names.length) this.say(`${names.join(', ')} ${names.length > 1 ? 'give' : 'gives'} up the chase.`);
                this.out.push({ type: 'action.disengage', encounterId: id });
                this.actionMaybeEnd();
                return null;
            });
        }

        /** Forget a group and anything it was doing. */
        actionDropGroup(id) {
            const a = this.combat.action;
            for (const eid of a.groups[id].ids) delete a.windups[eid];
            delete a.groups[id];
        }

        /** Every group engaged in the fight. */
        actionGroups() { return this.actionActive() ? Object.keys(this.combat.action.groups) : []; }

        // =====================================================================
        // Player attacks and skills
        // =====================================================================
        /**
         * The player starts an attack ('attack') or a skill (name, or { slot }). Same refusals as v2.
         * Skills the player doesn't aim (self, summons, ground) resolve at once; others wait for actionResolve().
         */
        actionCast(skillId, { slot = null } = {}) {
            return this.actionRun(() => {
                if (!this.actionActive()) { this.refuse('NOT_IN_COMBAT', 'Nothing to fight here.'); return null; }
                const c = this.combat;
                let name = skillId;
                if (slot != null) {
                    name = this.ensureSkillBar()[slot];
                    if (!name) { this.refuseCombat('EMPTY_SLOT', `Skill bar slot ${Number(slot) + 1} is empty.`); return null; }
                }
                const isBasic = name === 'attack' || name === this.basicAttackName();
                if (isBasic) name = this.basicAttackName();
                if (!name || !this.data.skillDefinitions[name]) { this.refuseCombat('UNKNOWN_SKILL', `Unknown skill '${name}'.`); return null; }
                if (!isBasic && !this.player.skills.includes(name)) { this.refuseCombat('SKILL_NOT_KNOWN', `You don't know the skill '${name}'.`); return null; }
                if (Object.values(c.action.casts).length) { this.refuseCombat('BUSY', 'You are already mid-swing.'); return null; }
                const opt = this.skillAvailability(name, isBasic);
                if (!opt.enabled) { this.refuseCombat(opt.reason.code, opt.reason.message); return null; }
                const skill = this.playerSkill(name);
                const kind = skill.target || 'enemy_single';
                const shape = this.actionShape(name, isBasic, kind);
                if (AT_ONCE.has(kind) || (kind === 'ally_single' && !skill.base_damage)) {
                    this.commitSkill(name, skill, this.pickTargets(skill, null) || [this.player], this.skillCost(skill), { viaAttack: isBasic });
                    return { castId: null, skill: name, shape, resolved: true };
                }
                const castId = `cast_${c.action.nextCastId++}`;
                c.action.casts[castId] = { castId, skill: name, isBasic, kind, startedAt: c.rt.now };
                return { castId, skill: name, shape, resolved: false };
            });
        }

        /** The cast's hit landed on these engine ids (nearest first). [] is a whiff: paid, on cooldown, no effect. */
        actionResolve(castId, targetIds = []) {
            return this.actionRun(() => {
                const c = this.combat;
                const cast = this.actionActive() && c.action.casts[castId];
                if (!cast) { this.refuse('NO_CAST', `No cast '${castId}'.`); return null; }
                delete c.action.casts[castId];
                const p = this.player;
                const skill = this.playerSkill(cast.skill);
                if (p.statusEffects.some((s) => s.type === 'skip_turn')) { this.refuseCombat('STUNNED', `You're stunned: your ${cast.skill} is interrupted.`); return null; }
                const cost = this.skillCost(skill);
                if (p.resource.current < cost) { this.refuseCombat('NOT_ENOUGH_RESOURCE', `Not enough ${p.resource.type}! (${cast.skill} needs ${cost}, you have ${p.resource.current})`); return null; }
                const living = this.alive(c.enemies);
                const hit = (Array.isArray(targetIds) ? targetIds : []).map((id) => living.find((e) => e.id === id)).filter(Boolean)
                    .filter((e, i, all) => all.indexOf(e) === i);
                let targets = hit;
                if (cast.kind === 'enemy_multiple') {
                    const n = this.multiTargetCount();
                    targets = hit.length >= n ? hit.slice(0, n) : [];
                    if (hit.length && !targets.length) this.say(`${cast.skill} needs ${n} enemies in reach.`);
                } else if (!['enemy_aoe', 'all_enemies', 'all_combatants'].includes(cast.kind)) targets = hit.slice(0, 1);
                if (!targets.length) { this.actionWhiff(cast, skill, cost); return { hit: [] }; }
                const problem = this.requirementProblem(skill, targets);
                if (problem) { this.refuseCombat('REQUIREMENT_FAILED', problem); return null; }
                this.commitSkill(cast.skill, skill, targets, cost, { viaAttack: cast.isBasic });
                return { hit: targets.map((t) => t.id) };
            });
        }

        /** The player let go of a cast before it landed (dodged out of it, got stunned): nothing paid. */
        actionCancel(castId) {
            return this.actionRun(() => {
                if (this.actionActive()) delete this.combat.action.casts[castId];
                return null;
            });
        }

        /** A swing that hit nothing still costs and cools down (no free spam). */
        actionWhiff(cast, skill, cost) {
            const p = this.player;
            const c = this.combat;
            if (cost > 0) { p.resource.current -= cost; this.say(`Used ${cost} ${p.resource.type}.`); }
            if (skill.oncePerFight) c.usedOncePerFight[cast.skill] = true;
            this.rtBeginPlayerAction();
            this.say(`Your ${cast.skill} hits nothing.`);
            this.rtEndPlayerAction(cast.skill, cast.isBasic);
        }

        /** Where and how a cast hits (the sim reads it). Basic attacks use the class weapon. */
        actionShape(name, isBasic, kind) {
            const r = this.actionRules();
            const shapes = r.skillShapes || {};
            if (isBasic) {
                const w = ((r.classes || {})[this.player.className] || {}).weapon;
                if (w) return { ...w, shape: w.kind };
            }
            return { ...((shapes.byTarget || {})[kind] || { shape: 'arc', reach: 20, arcDeg: 90, castMs: 150 }), ...((shapes.bySkill || {})[name] || {}) };
        }

        // =====================================================================
        // Enemy attacks (the sim decides when)
        // =====================================================================
        /** An enemy starts an attack: the engine picks the skill (as v2 does) and it reads "readies X". */
        actionEnemyWindup(enemyId, { skill: wanted = null } = {}) {
            return this.actionRun(() => {
                const e = this.actionEnemy(enemyId);
                if (!e) return null;
                const c = this.combat;
                if (c.action.windups[e.id]) { this.refuse('BUSY', `${e.name} is already attacking.`); return null; }
                if (e.statusEffects.some((s) => s.type === 'skip_turn')) { this.refuse('STUNNED', `${e.name} is unable to act!`); return null; }
                c.rt.actorId = e.id;
                this.springTrap(e);
                if (e.hp <= 0) { this.checkBattleEnd(); return { skill: null }; }
                this.beginOpportunity(e);
                // The sim's attack table names the skill (Thorne's patterns); otherwise one at random, as v2 does.
                const skill = (wanted && e.skills.find((x) => x.name === wanted)) || (e.skills.length ? e.skills[Math.floor(this.rng() * e.skills.length)] : this.data.skillDefinitions['Basic Attack']);
                c.action.windups[e.id] = { skill: skill.name, startedAt: c.rt.now };
                this.say(`${e.name} readies ${skill.name}!`);
                return { skill: skill.name };
            });
        }

        /**
         * The enemy's attack comes out. `hit`: it reached the player (not dodged). `guarded`: the player's guard
         * faced it (damage × actionRules.guard.damageTaken). `parried`: blocked, and the sim staggers the enemy.
         * `targetId`: whose body it reached (the player's id or a minion's); guard and parry only ever apply to the player.
         */
        actionEnemyStrike(enemyId, { hit = true, guarded = false, parried = false, damageMult = 1, targetId = null } = {}) {
            return this.actionRun(() => {
                const e = this.actionEnemy(enemyId);
                if (!e) return null;
                const c = this.combat;
                const w = c.action.windups[e.id];
                if (!w) { this.refuse('NO_WINDUP', `${e.name} isn't attacking.`); return null; }
                delete c.action.windups[e.id];
                c.rt.actorId = e.id;
                const end = () => { if (this.actionActive()) this.endOpportunity(e); };
                if (e.statusEffects.some((s) => s.type === 'skip_turn')) {
                    this.say(`${e.name}'s ${w.skill} is interrupted!`, { important: true });
                    end();
                    return { result: 'interrupted' };
                }
                if (!hit) { this.say(`${e.name}'s ${w.skill} misses.`); end(); return { result: 'miss' }; }
                if (parried) {
                    this.say(`You parry ${e.name}'s ${w.skill}!`, { important: true });
                    this.out.push({ type: 'action.parry', enemyId: e.id });
                    end();
                    return { result: 'parried' };
                }
                let skill = e.skills.find((s) => s.name === w.skill) || this.data.skillDefinitions['Basic Attack'];
                if (this.statusOfType(e, 'silence')) { skill = this.data.skillDefinitions['Basic Attack']; this.say(`${e.name} is silenced and can only flail.`); }
                e.lastSkillUsed = skill.name;
                // The sim says whose body the blow reached (the player, or a minion standing in it). Without one, taunt decides.
                const target = (targetId != null && (targetId === this.player.id ? this.player : this.alive(c.minions).find((m) => m.id === targetId))) || this.rtEnemyTarget(e);
                let guard = null, heavy = null;
                if (damageMult > 0 && damageMult !== 1) {   // an attack table's damageMult (Murder of Crows): after DEF, like a damage_reduction below 0
                    heavy = { name: 'Heavy Blow', type: 'damage_reduction', value: 1 - damageMult, duration: null, stacks: 1, appliedBy: e.id };
                    target.statusEffects.push(heavy);
                }
                if (guarded && target === this.player) {   // the guard is a short damage_reduction around this one hit
                    guard = { name: 'Guarding', type: 'damage_reduction', value: 1 - (((((this.actionRules().classes || {})[this.player.className] || {}).guard || {}).damageTaken) ?? ((this.actionRules().guard || {}).damageTaken ?? 0.3)), duration: null, stacks: 1, appliedBy: this.player.id };
                    this.player.statusEffects.push(guard);
                    this.say('You take it on your guard.');
                }
                try { this.castSkill(e, skill, [target]); } finally {
                    for (const s of [guard, heavy]) if (s) { const i = target.statusEffects.indexOf(s); if (i >= 0) target.statusEffects.splice(i, 1); }
                }
                end();
                this.checkBattleEnd();
                return { result: guard ? 'guarded' : 'hit' };
            });
        }

        // =====================================================================
        // Minions (the sim moves them and decides when their attack lands)
        // =====================================================================
        /**
         * A minion's attack comes out (Raise Skeleton's Bone Club). `targetId`: the engaged enemy it reached, or null
         * for a swing that hit nothing. Same rules path as a turn-based minion turn: castSkill with its first skill.
         */
        actionMinionStrike(minionId, targetId = null) {
            return this.actionRun(() => {
                if (!this.actionActive()) { this.refuse('NOT_IN_COMBAT', 'Nothing to fight here.'); return null; }
                const c = this.combat;
                const m = this.alive(c.minions).find((x) => x.id === minionId);
                if (!m) { this.refuse('INVALID_TARGET', `No living minion '${minionId}'.`); return null; }
                if (m.statusEffects.some((s) => s.type === 'skip_turn')) { this.refuse('STUNNED', `${m.name} is unable to act!`); return null; }
                const target = targetId != null ? this.alive(c.enemies).find((e) => e.id === targetId && e.encounterId && c.action.groups[e.encounterId]) : null;
                if (targetId != null && !target) { this.refuse('INVALID_TARGET', `No engaged enemy '${targetId}'.`); return null; }
                c.rt.actorId = m.id;
                this.beginOpportunity(m);
                if (!target) this.say(`${m.name}'s ${(m.skills[0] || {}).name || 'attack'} hits nothing.`);
                else this.castSkill(m, m.skills[0] || this.data.skillDefinitions['Basic Attack'], [target]);
                if (this.actionActive()) this.endOpportunity(m);
                this.checkBattleEnd();
                return { result: target ? 'hit' : 'miss' };
            });
        }

        actionEnemy(enemyId) {
            if (!this.actionActive()) { this.refuse('NOT_IN_COMBAT', 'Nothing to fight here.'); return null; }
            const e = this.alive(this.combat.enemies).find((x) => x.id === enemyId);
            if (!e) { this.refuse('INVALID_TARGET', `No living enemy '${enemyId}'.`); return null; }
            return e;
        }

        // =====================================================================
        // Ending: groups clear one by one; death respawns
        // =====================================================================
        /** checkBattleEnd() for action fights. True if the fight ended. */
        actionCheckEnd() {
            const c = this.combat;
            const p = this.player;
            if (p.hp <= 0) {
                if (this.tryCrownOfTheUndying()) return false;
                this.actionRespawn();
                return true;
            }
            for (const id of Object.keys(c.action.groups)) {
                const g = c.action.groups[id];
                const members = c.enemies.filter((e) => g.ids.includes(e.id));
                if (members.some((e) => e.hp > 0)) continue;
                this.actionClearGroup(g, members);
            }
            return this.actionMaybeEnd();
        }

        /** Every enemy of a group is down: XP, quest event, loot on the ground. XP is per group, never per kill. */
        actionClearGroup(g, members) {
            const rules = this.data.gameRules;
            this.actionDropGroup(g.encounterId);
            const xp = members.filter((e) => e.lootEligible !== false && !e.isMinion && !e.summoned && !e.isSummoned && !e.hallucination && !e.illusion && !e.noLoot).reduce((sum, e) => sum + (e.xp != null ? e.xp : rules.defaultEnemyXp), 0);
            if (g.at && this.dropVictoryLoot) this.dropVictoryLoot(members, { encounterId: g.encounterId, mapId: g.at.mapId, x: g.at.x, y: g.at.y });
            else this.awardVictoryLoot(members);
            this.world.defeated.push(g.encounterId);
            this.world.lastEncounter = g.encounterId;
            this.world.lastResult = 'victory';
            this.say(`You defeated ${members.length > 1 ? 'them' : this.withArticle(members[0])} and gained ${xp} XP!`, { important: true });
            this.out.push({ type: 'action.cleared', encounterId: g.encounterId, xp });
            this.addExperience(xp, { quiet: true });
            this.storyEvent({ type: 'defeat', id: g.encounterId });
        }

        /** No group left: the fight is over (victory heal only if something was beaten). */
        actionMaybeEnd() {
            const c = this.combat;
            if (!this.actionActive() || Object.keys(c.action.groups).length) return false;
            const p = this.player;
            const won = c.enemies.some((e) => e.hp <= 0 && e.encounterId);
            this.mode = 'explore';
            this.combat = null;
            this.stats.fights++;
            this.stats.rounds += c.round;
            const kept = this.actionBuffsLeavingFight(c);   // your buffs run on out of the fight (Tokelo, 2026-10-31)
            p.statusEffects = [];
            this.actionKeepFollowers(c);
            this.actionCalmBuffs(kept);
            if (won) {
                const healed = this.heal(p, Math.floor(p.maxHp * this.data.gameRules.postFightHealPct));
                if (healed > 0) this.say(`You catch your breath. +${healed} HP (${p.hp}/${p.maxHp}).`);
            }
            this.out.push({ type: 'action.end', result: won ? 'victory' : 'escaped' });
            this.maybePromptBranch();
            return true;
        }

        /** Defeat: not game over. The fight ends, every group resets, the player wakes with half HP. */
        actionRespawn() {
            const p = this.player;
            const c = this.combat;
            const groups = Object.keys(c.action.groups);
            this.say('--- You fall... ---', { important: true });
            this.mode = 'explore';
            this.combat = null;
            p.statusEffects = [];
            if (this.world) this.world.followers = [];   // a fall scatters your summons
            p.hp = Math.max(1, Math.floor(p.maxHp * ((this.actionRules().respawn || {}).hpPct ?? 0.5)));
            if (this.world) { this.world.lastEncounter = groups[0] || null; this.world.lastResult = 'defeat'; }
            this.say(`You wake somewhere safe, aching. (${p.hp}/${p.maxHp} HP)`, { important: true });
            this.out.push({ type: 'world.respawn', encounters: groups, hp: p.hp });
        }

        // =====================================================================
        // Followers: summons that outlive a fight (Tokelo, 2026-10-31)
        // =====================================================================
        /**
         * The fight is over: living minions follow you out of it (HP kept, statuses cleared) in world.followers,
         * so they're in the save and in every transaction snapshot. The sim dismisses them after
         * actionRules.summons.lingerOutOfCombatMs without a fight (actionDismissFollowers).
         */
        actionKeepFollowers(c) {
            if (!this.world) return;
            this.world.followers = this.alive(c.minions).map((m) => ({ ...m, statusEffects: [] }));
        }

        /** A new fight starts: your followers join it with the ids they had (their bodies don't change). */
        actionRestoreFollowers() {
            const f = (this.world && this.world.followers) || [];
            if (!f.length || !this.combat) return;
            const c = this.combat;
            c.minions.push(...f);
            c.nextMinionId = Math.max(c.nextMinionId || 1, ...f.map((m) => Number(String(m.id).split('_')[1]) + 1 || 1));
            this.world.followers = [];
            const names = [...new Set(f.map((m) => m.name))];
            this.say(`Your ${names.join(' and ')} ${f.length > 1 ? 'join' : 'joins'} the fight.`);
        }

        /** Out of a fight: your followers fall apart (the sim calls this when their time without a fight runs out). */
        actionDismissFollowers() {
            return this.actionRun(() => {
                if (this.actionActive()) { this.refuse('IN_COMBAT', 'Your summons stay while you fight.'); return null; }
                const f = (this.world && this.world.followers) || [];
                if (!f.length) return { ids: [] };
                this.world.followers = [];
                for (const m of f) this.say(`Your ${m.name} crumbles to dust.`);
                this.out.push({ type: 'action.followers_gone', ids: f.map((m) => m.id) });
                return { ids: f.map((m) => m.id) };
            });
        }

        /**
         * Pure. A skill pressed out of a fight: is it yours, and what shape does it have? The sim plays it for real
         * (a bolt flies, a dash moves you, a summon rises) with nothing to hit, so it never looks like a weapon swing.
         */
        actionSkillPreview(name) {
            const sk = name && this.data.skillDefinitions[name];
            if (!sk) return { ok: false, error: { code: 'UNKNOWN_SKILL', message: `Unknown skill '${name}'.` } };
            if (!this.player || !this.player.skills.includes(name)) return { ok: false, error: { code: 'SKILL_NOT_KNOWN', message: `You don't know the skill '${name}'.` } };
            const skill = this.playerSkill(name);
            return { ok: true, skill: name, shape: this.actionShape(name, false, skill.target || 'enemy_single'), summon: (skill.effects || []).some((x) => x.type === 'summon') };
        }

        /**
         * A summon skill cast out of a fight: pay its cost and the minion follows you (world.followers) until the
         * linger timer runs out or the next fight starts, which it joins. Same cap as in a fight.
         */
        actionSummonFollower(name) {
            return this.actionRun(() => {
                if (this.actionActive()) { this.refuse('IN_COMBAT', 'Cast it with actionCast in a fight.'); return null; }
                if (!this.world || this.mode !== 'explore') { this.refuse('WRONG_MODE', 'Not now.'); return null; }
                const pre = this.actionSkillPreview(name);
                if (!pre.ok) { this.refuse(pre.error.code, pre.error.message); return null; }
                const skill = this.playerSkill(name);
                const eff = (skill.effects || []).find((x) => x.type === 'summon');
                if (!eff) { this.refuse('NOT_A_SUMMON', `${name} doesn't summon.`); return null; }
                const p = this.player;
                const cost = this.skillCost(skill);
                if (p.resource.current < cost) { this.refuse('NOT_ENOUGH_RESOURCE', `Not enough ${p.resource.type}! (${name} needs ${cost}, you have ${p.resource.current})`); return null; }
                const f = this.world.followers || (this.world.followers = []);
                if (f.filter((m) => m.hp > 0).length >= this.minionCap()) { this.refuse('REQUIREMENT_FAILED', `You can't control more than ${this.minionCap()} minions.`); return null; }
                const tpl = this.data.minionDefinitions[eff.summon_type];
                if (!tpl) { this.refuse('INVALID_SUMMON', `No minion '${eff.summon_type}'.`); return null; }
                const id = `minion_${this.world.nextFollowerId || 1001}`;   // apart from a fight's own minion_1, 2, … (restore keeps ids unique)
                this.world.nextFollowerId = (this.world.nextFollowerId || 1001) + 1;
                const m = { ...JSON.parse(JSON.stringify(tpl)), id, summonType: eff.summon_type, ownerId: p.id, isPlayer: false, isMinion: true, statusEffects: [] };
                if (eff.apply_effect && m.skills[0]) m.skills[0] = { ...m.skills[0], effects: [...(m.skills[0].effects || []), eff.apply_effect] };   // as the summon effect does
                if (cost > 0) { p.resource.current -= cost; this.say(`Used ${cost} ${p.resource.type}.`); }
                f.push(m);
                this.say(`${p.name} summons a ${m.name}!`);
                return { id, shape: pre.shape };
            });
        }

        // =====================================================================
        // Pre-buffing: self buffs cast out of a fight (Tokelo, 2026-10-31)
        // =====================================================================
        /**
         * The calm clock: time out of a fight (world.calm.now, ms), which the sim advances with actionCalmTick. A buff
         * cast out of a fight lasts as long as it would in one (turns × secondsPerTurn) on this clock, and skills
         * cool down on it. Only `world` holds it, so it's saved and in every transaction snapshot.
         */
        actionCalm() {
            if (!this.world) return null;
            return this.world.calm || (this.world.calm = { now: 0, cooldowns: {} });
        }

        /** Out of a fight: advance the calm clock; pre-buffs and cooldowns run out. Returns the events (like tick). */
        actionCalmTick(ms) {
            const calm = this.actionCalm();
            if (!calm || this.mode === 'combat' || !this.player) return [];
            calm.now += Math.max(0, Number(ms) || 0);
            for (const k of Object.keys(calm.cooldowns)) if (calm.cooldowns[k] <= calm.now) delete calm.cooldowns[k];
            const gone = this.player.statusEffects.filter((x) => x.calm && x.rtEndsAt != null && x.rtEndsAt <= calm.now);
            if (!gone.length) return [];
            this.player.statusEffects = this.player.statusEffects.filter((x) => !gone.includes(x));
            for (const x of gone) this.say(`[${x.name}] wears off ${this.player.name}.`);
            return this.flush();
        }

        /** Why this skill can't be cast as a pre-buff right now, or null. Pure. */
        actionPrebuffProblem(name) {
            const pre = this.actionSkillPreview(name);
            if (!pre.ok) return pre.error;
            const skill = this.playerSkill(name);
            const kind = skill.target || 'enemy_single';
            const handled = (skill.effects || []).filter((x) => this.effects[x.type]);
            if (!(kind === 'self' || (kind === 'ally_single' && !skill.base_damage)) || !handled.length || handled.some((x) => !CALM_EFFECTS.has(x.type)))
                return { code: 'FIGHT_ONLY', message: `${name} only works in a fight.` };
            const calm = this.actionCalm();
            const ready = calm && calm.cooldowns[name];
            if (ready != null && ready > calm.now) return { code: 'ON_COOLDOWN', message: `${name} is on cooldown (${Math.ceil((ready - calm.now) / 1000)}s).` };
            const cost = this.skillCost(skill);
            if (this.player.resource.current < cost) return { code: 'NOT_ENOUGH_RESOURCE', message: `Not enough ${this.player.resource.type}! (${name} needs ${cost}, you have ${this.player.resource.current})` };
            return null;
        }

        /**
         * Cast a self buff out of a fight: same cost, same effects (castSkill) and same duration as in a fight, timed on
         * the calm clock. What's still running when a fight starts comes into it (actionRestoreBuffs).
         */
        actionPrebuff(name) {
            return this.actionRun(() => {
                if (this.actionActive()) { this.refuse('IN_COMBAT', 'Cast it with actionCast in a fight.'); return null; }
                if (!this.world || this.mode !== 'explore') { this.refuse('WRONG_MODE', 'Not now.'); return null; }
                const problem = this.actionPrebuffProblem(name);
                if (problem) { this.refuse(problem.code, problem.message); return null; }
                const p = this.player;
                const skill = this.playerSkill(name);
                const calm = this.actionCalm();
                const cost = this.skillCost(skill);
                const before = new Map(p.statusEffects.map((x) => [x, JSON.stringify(x)]));
                if (cost > 0) { p.resource.current -= cost; this.say(`Used ${cost} ${p.resource.type}.`); }
                this.say(`${p.name} uses ${name}.`);
                this.castSkill(p, skill, [p]);
                for (const x of p.statusEffects) {
                    if (before.has(x) && before.get(x) === JSON.stringify(x)) continue;   // untouched by this cast
                    const total = this.rtStatusTotalMs(x);   // the same timing rtStatusApplied gives it in a fight
                    if (x.policy) { x.rtPolicy = x.policy; x.policy = null; }
                    x.calm = true; x.rtTotalMs = total; x.rtEndsAt = total != null ? calm.now + total : null;
                }
                calm.cooldowns[name] = calm.now + this.rtCooldownMs(name);
                return { skill: name };
            });
        }

        /** Pure. Your pre-buffs with the time they have left (null: until used), before startCombat clears them. */
        actionCarriedBuffs() {
            const calm = this.actionCalm();
            if (!calm || !this.player) return [];
            return this.player.statusEffects.filter((x) => x.calm).map((x) => ({ inst: x, leftMs: x.rtEndsAt != null ? Math.max(0, x.rtEndsAt - calm.now) : null }))
                .filter((b) => b.leftMs == null || b.leftMs > 0);
        }

        /**
         * Pure. The player's buffs still running as an action fight ends, with the time they have left (null: until
         * used). Only buffs in realtimeRules.statuses.buffs carry: debuffs, control and fight bookkeeping end with it.
         */
        actionBuffsLeavingFight(c) {
            if (!c || !c.rt || !this.player) return [];
            return this.player.statusEffects.filter((x) => this.rtBuffRule(x.name))
                .map((x) => ({ inst: x, leftMs: x.rtEndsAt != null ? Math.max(0, x.rtEndsAt - c.rt.now) : null }))
                .filter((b) => b.leftMs == null || b.leftMs > 0);
        }

        /** Out of a fight: put buffs on the calm clock with the time they had left, so they keep ticking down. */
        actionCalmBuffs(buffs) {
            const calm = this.actionCalm();
            if (!buffs.length || !calm) return;
            for (const { inst, leftMs } of buffs) this.player.statusEffects.push({ ...inst, calm: true, rtEndsAt: leftMs != null ? calm.now + leftMs : null });
            this.say(`Still up: ${buffs.map((b) => b.inst.name).join(', ')}.`);
        }

        /** The fight started: put the pre-buffs back on its clock with the time they had left. */
        actionRestoreBuffs(buffs) {
            if (!buffs.length || !this.combat) return;
            const now = this.combat.rt.now;
            for (const { inst, leftMs } of buffs) {
                const x = { ...inst, rtEndsAt: leftMs != null ? now + leftMs : null };
                delete x.calm;
                this.player.statusEffects.push(x);
            }
            this.say(`You go in with ${buffs.map((b) => b.inst.name).join(', ')} up.`);
        }

        // =====================================================================
        // Skill resource recovery (Tokelo, 2026-10-31): numbers in actionRules.resources
        // =====================================================================
        /** Pure. The recovery rule for a resource type, or null (not listed: the old reset-each-fight rule). */
        actionResourcePool(type) {
            const pools = (this.actionRules().resources || {}).pools || {};
            return pools[type] || null;
        }

        /** Add `perSec` × `ms` to the player's pool, keeping the fraction in `holder.regenCarry`, up to `cap`. Returns the gain. */
        actionRegen(holder, perSec, ms, cap) {
            const r = this.player && this.player.resource;
            if (!r || !(perSec > 0) || !(ms > 0)) return 0;
            const top = Math.min(r.max, cap != null ? cap : r.max);
            if (r.current >= top) { holder.regenCarry = 0; return 0; }
            holder.regenCarry = (holder.regenCarry || 0) + perSec * ms / 1000;
            const whole = Math.floor(holder.regenCarry + 1e-9);
            if (whole < 1) return 0;
            holder.regenCarry -= whole;
            const g = Math.min(whole, top - r.current);
            r.current += g;
            return g;
        }

        /** In an action fight, on each pulse: the pool's passive trickle (combatPerSec). */
        actionCombatRegen(ms) {
            if (!this.player || this.player.isHollowKing) return 0;
            const pool = this.actionResourcePool(this.player.resource.type);
            if (!pool || !this.combat || !this.combat.action) return 0;
            const g = this.actionRegen(this.combat.action, pool.combatPerSec, ms);
            if (g > 0) this.say(`You recover ${g} ${this.player.resource.type}.`);
            return g;
        }

        /**
         * Out of a fight: the pool refills (calmPerSec, up to calmTo or max) so you walk into the next fight ready.
         * The sim calls it every step it isn't fighting; quiet (the HUD shows the bar fill). Returns the events.
         */
        actionCalmRegen(ms) {
            if (this.mode !== 'explore' || !this.world || !this.player || this.player.isHollowKing) return [];
            const pool = this.actionResourcePool(this.player.resource.type);
            if (!pool) return [];
            const g = this.actionRegen(this.world, pool.calmPerSec, ms, pool.calmTo);
            if (g > 0) this.out.push({ type: 'action.resource_regen', resource: this.player.resource.type, amount: g, current: this.player.resource.current });
            return this.flush();
        }

        /** Pure. Your summons out of a fight, in actionView().minions' shape (none in a fight: actionView has them). */
        actionFollowers() {
            if (this.actionActive() || !this.world) return [];
            return (this.world.followers || []).filter((m) => m.hp > 0).map((m) => ({
                id: m.id, name: m.name, summonType: m.summonType, hp: m.hp, maxHp: m.maxHp, stunned: false, speedMult: 1, statuses: [], taunting: false
            }));
        }

        // =====================================================================
        // Views (pure)
        // =====================================================================
        /** Saving is refused while a group is engaged. */
        canSave() {
            if (this.actionActive()) return { ok: false, error: { code: 'IN_COMBAT', message: "You can't save during a fight." } };
            return { ok: true };
        }

        /** What the sim and HUD need: engaged enemies, the player's stun/slow, the casts in flight, the v2 clock. */
        actionView() {
            if (!this.actionActive()) return null;
            const c = this.combat;
            const speedMult = (x) => x.statusEffects.filter((s) => s.type === 'slow' || s.type === 'speed_down').reduce((m, s) => m * (1 - Math.min(0.9, Number(s.value) || 0.3)), 1);
            const stunned = (x) => x.statusEffects.some((s) => s.type === 'skip_turn');
            const statuses = (x) => x.statusEffects.map((s) => ({ name: s.name, type: s.type, stacks: s.stacks || 1, remainingMs: s.rtEndsAt != null ? Math.max(0, s.rtEndsAt - c.rt.now) : null }));
            return {
                enemies: c.enemies.filter((e) => e.encounterId && c.action.groups[e.encounterId]).map((e) => ({
                    id: e.id, encounterId: e.encounterId, key: e.key, name: e.name, hp: e.hp, maxHp: e.maxHp,
                    stunned: stunned(e), speedMult: speedMult(e), statuses: statuses(e), windup: c.action.windups[e.id] ? c.action.windups[e.id].skill : null
                })),
                minions: this.alive(c.minions).map((m) => ({
                    id: m.id, name: m.name, summonType: m.summonType, hp: m.hp, maxHp: m.maxHp,
                    stunned: stunned(m), speedMult: speedMult(m), statuses: statuses(m), taunting: m.statusEffects.some((s) => s.type === 'taunt')
                })),
                minionFocusId: (this.hasTrait('Grave Command') && c.graveCommandTargetId) || null,   // Bone Warden: minions focus your last target
                player: { stunned: stunned(this.player), speedMult: speedMult(this.player), statuses: statuses(this.player) },
                groups: Object.keys(c.action.groups),
                casts: Object.values(c.action.casts).map((x) => ({ castId: x.castId, skill: x.skill })),
                realtime: this.getRealtimeState()
            };
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['action'] = ActionCombatMethods;
    if (isNode) module.exports = ActionCombatMethods;
})(typeof window !== 'undefined' ? window : globalThis);
