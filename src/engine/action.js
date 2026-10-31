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
                    this.startCombat(enemyKeys, scope, loot);   // combatMode 'action': rtBegin() sets combat.action
                    enemies = this.combat.enemies;
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
            p.statusEffects = [];
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
            p.hp = Math.max(1, Math.floor(p.maxHp * ((this.actionRules().respawn || {}).hpPct ?? 0.5)));
            if (this.world) { this.world.lastEncounter = groups[0] || null; this.world.lastResult = 'defeat'; }
            this.say(`You wake somewhere safe, aching. (${p.hp}/${p.maxHp} HP)`, { important: true });
            this.out.push({ type: 'world.respawn', encounters: groups, hp: p.hp });
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
