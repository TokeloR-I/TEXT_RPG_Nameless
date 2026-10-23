/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Player combat input
 * Parsing what the player types in a fight, menus, targeting, turn prompts.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    class CombatInputMethods {
        // =====================================================================
        // Player combat input
        // =====================================================================
        combatCommand(raw) {
            const c = this.combat;
            const p = this.player;
            this.clear();
            this.say(`> ${raw}`);

            if (!c.awaitingPlayer) { this.say('Not your turn!'); return; }
            if (c.awaitingContinue) {
                // The player's turn was skipped (stun etc.): any input just moves on.
                c.awaitingContinue = false;
                c.awaitingPlayer = false;
                c.idx++;
                this.advance();
                return;
            }

            const { command, targetNum } = this.parseCombatInput(raw);

            if (command === 'use' || command.startsWith('use ')) {
                const name = command.slice(3).trim();
                const item = name && this.findInventoryItem(name);
                if (!item) { this.combatError(name ? `You don't have a '${name}'.` : 'Use what? (e.g. use bandages)', null); return; }
                c.awaitingPlayer = false;
                if (!this.applyItem(item)) { c.awaitingPlayer = true; this.showCombatState(); return; }
                c.playerActedThisRound = true;
                this.endNormalTurn(p);
                this.advanceSoulLinkClock(p);
                if (p.shieldBashRecovery === 'await_recovery') p.shieldBashRecovery = null;
                c.idx++;
                this.advance();
                return;
            }

            if (command === 'flee') {
                this.mode = 'explore';
                this.combat = null;
                p.statusEffects = [];
                this.say('You fled!');
                this.describeRoom(false);
                return;
            }

            const skillName = command === 'attack' ? this.basicAttackName() : this.resolveSkillName(command);
            if (!skillName || (!p.skills.includes(skillName) && skillName !== this.basicAttackName())) {
                this.combatError(skillName ? `You don't know the skill '${skillName}'.` : `Unknown combat command '${command}'.`, command);
                return;
            }
            const skill = this.playerSkill(skillName);

            if (this.statusOfType(p, 'silence') && skillName !== this.basicAttackName()) {
                this.combatError(`You are silenced — only your basic attack works this turn.`, null);
                return;
            }
            if (!this.isCastable(skill)) {
                this.combatError(`${skillName} isn't implemented yet (missing: ${this.missingEffects(skill).join(', ')}).`, null);
                return;
            }
            if (skill.oncePerFight && c.usedOncePerFight[skillName]) {
                this.combatError(`${skillName} can only be used once per fight!`, null);
                return;
            }
            const cost = this.skillCost(skill);
            if (p.resource.current < cost) {
                this.combatError(`Not enough ${p.resource.type}! (${skillName} needs ${cost}, you have ${p.resource.current})`, null);
                return;
            }

            const targets = this.pickTargets(skill, targetNum);
            if (!targets) {
                const living = this.alive(c.enemies);
                this.combatError(skill.target === 'enemy_multiple'
                    ? "Invalid target selection. Choose distinct enemies (e.g. 'soul chain 1,2' or 'soul chain 1,2,3')."
                    : `Invalid target '${targetNum || 'none specified'}'. Valid targets: ${living.map((e, i) => i + 1).join(', ')}. Example: '${command} 1'`, null);
                return;
            }
            for (const effect of skill.effects || []) {
                const h = this.effects[effect.type];
                const problem = h && h.requires && h.requires({ engine: this, caster: p, targets, skill, effect });
                if (problem) { this.combatError(problem, null); return; }
            }

            if (cost > 0) {
                p.resource.current -= cost;
                this.say(`Used ${cost} ${p.resource.type}.`);
            }
            if (skill.oncePerFight) c.usedOncePerFight[skillName] = true;
            if (this.isMarkSkill(skill) && this.hasTrait('Hunter\'s Instinct') && !c.freeMarkUsedThisRound && skill.cost !== 'all') {
                c.freeMarkUsedThisRound = true;
                if (skill.cost) this.say("Hunter's Instinct: your first mark this turn is free.");
            }

            c.awaitingPlayer = false;
            const isBasic = command === 'attack' || skillName === this.basicAttackName();
            this.castSkill(p, skill, targets);
            if (isBasic) {
                this.resourceEvent('onBasicAttack', 1, 'combo');
                if (this.hasTrait('Virulent Touch')) for (const t of targets) if (t.hp > 0 && !t.isPlayer) this.infect(p, t, 1);
            }
            c.playerActedThisRound = true;
            if (this.mode === 'combat' && c.extraTurn && !this.checkBattleEnd()) {
                c.extraTurn = false;
                c.awaitingPlayer = true;
                this.say('--- You act again! ---', { important: true });
                this.showCombatState();
                return;
            }
            c.extraTurn = false;
            this.endNormalTurn(p); // the normal turn ends here, after any Haste bonus actions
            this.advanceSoulLinkClock(p);
            if (p.shieldBashRecovery === 'await_recovery') p.shieldBashRecovery = null;
            c.idx++;
            this.advance();
        }

        combatError(message, attempted) {
            this.say(`Error: ${message}`, { important: true });
            if (attempted) {
                const suggestions = this.findSimilarSkills(attempted);
                if (suggestions.length) this.say(`Did you mean: ${suggestions.join(', ')}?`);
            }
            this.showCombatState();
        }

        parseCombatInput(raw) {
            const cleaned = raw.toLowerCase().replace(/[’‘]/g, "'").trim().replace(/\s+/g, ' ');
            const multi = cleaned.match(/^(.+?)\s+(\d+(?:\s*,\s*\d+)+)$/);
            if (multi) return { command: multi[1].trim(), targetNum: multi[2].split(',').map(Number) };
            const m = cleaned.match(/^(.+?)\s*[#@]?(\d+)$/);
            return m ? { command: m[1].trim(), targetNum: parseInt(m[2], 10) } : { command: cleaned, targetNum: null };
        }

        /** Skill definition as the player uses it (Basic Attack uses the class's own damage range). */
        playerSkill(name) {
            const def = this.data.skillDefinitions[name];
            const p = this.player;
            if (name === 'Basic Attack' && p.baseDamageMin != null) return { ...def, base_damage: [p.baseDamageMin, p.baseDamageMax] };
            return def;
        }

        isMarkSkill(skill) { return (skill.effects || []).some((e) => e.type === 'apply_mark'); }

        /** What a skill costs right now (Hunter's Instinct makes the first mark each turn free). */
        skillCost(skill) {
            const p = this.player;
            if (skill.cost === 'all') return p.resource.current;
            const c = this.combat;
            if (c && this.isMarkSkill(skill) && this.hasTrait('Hunter\'s Instinct') && !c.freeMarkUsedThisRound) return 0;
            return skill.cost || 0;
        }

        /** 'attack' = your class's first skill if it's free, otherwise the universal free Basic Attack.
         *  (A basic attack must never cost resource, or resource-starved builds get stuck.) */
        basicAttackName() {
            if (this.player.isHollowKing) return 'Void Rend';
            const first = this.data.basePlayerClasses[this.player.className].startingSkills[0];
            const def = this.data.skillDefinitions[first];
            return def && !def.cost ? first : 'Basic Attack';
        }

        resolveSkillName(input) {
            const lower = input.toLowerCase().replace(/[’‘]/g, "'");
            if (this.data.skillAliases[lower]) return this.data.skillAliases[lower];
            for (const name in this.data.skillDefinitions) {
                if (name.toLowerCase().replace(/[’‘]/g, "'") === lower) return name;
            }
            return null;
        }

        findSimilarSkills(input) {
            const lower = input.toLowerCase();
            const known = this.player.skills;
            const starts = known.filter((s) => s.toLowerCase().startsWith(lower));
            const contains = known.filter((s) => s.toLowerCase().includes(lower) && !starts.includes(s));
            return [...starts, ...contains].slice(0, 3);
        }

        pickTargets(skill, targetNum) {
            const living = this.alive(this.combat.enemies);
            const kind = skill.target || 'enemy_single';
            if (kind === 'enemy_multiple') {
                const count = this.hasTrait('Wound Transfer') ? Math.min(3, living.length) : 2;
                if (!Array.isArray(targetNum) || targetNum.length !== count ||
                    new Set(targetNum).size !== count ||
                    targetNum.some(n => !Number.isInteger(n) || n < 1 || n > living.length)) return null;
                return targetNum.map(n => living[n - 1]);
            }
            if (kind === 'linked_enemies') return this.activeSoulLinks(this.player);
            if (kind === 'self' || kind === 'minions' || kind === 'ground') return [this.player];
            if (kind === 'ally_single' && !skill.base_damage) return [this.player];
            if (kind === 'corpse') return living; // Corpse Bloom: the blast hits everyone
            if (kind === 'enemy_aoe' || kind === 'all_enemies' || kind === 'all_combatants') return living;
            // Everything else needs one enemy (ally/corpse/ground targeting isn't modelled yet).
            if (targetNum == null) return living.length === 1 ? [living[0]] : null;
            return targetNum >= 1 && targetNum <= living.length ? [living[targetNum - 1]] : null;
        }

        showCombatState() {
            const c = this.combat;
            this.say('--- Enemies ---', { important: true });
            this.alive(c.enemies).forEach((e, i) => this.say(`${i + 1}. ${e.name} (${e.hp}/${e.maxHp} HP)${this.statusTag(e)}`));
            const minions = this.alive(c.minions);
            if (minions.length) {
                this.say('--- Your Minions ---', { important: true });
                minions.forEach((m) => this.say(`${m.name} (${m.hp}/${m.maxHp} HP)${this.statusTag(m)}`));
            }
            const p = this.player;
            this.say('--- You ---', { important: true });
            this.say(`${p.name} (${Math.max(0, p.hp)}/${p.maxHp} HP) · ${p.resource.type}: ${p.resource.current}/${p.resource.max}${this.statusTag(p)}`);
            this.say('---------------------');
            this.say('What will you do?');
            this.say(`> Attack (${this.basicAttackName()})`);
            for (const name of this.player.skills) {
                const info = this.describeSkill(name);
                let line = `> ${name}`;
                const def = this.data.skillDefinitions[name];
                const cost = def ? this.skillCost(def) : 0;
                if (def && def.cost === 'all') line += ` [Cost: all ${this.player.resource.type}]`;
                else if (cost) line += ` [Cost: ${cost} ${this.player.resource.type}]`;
                else if (info.cost) line += ` [Free this turn]`;
                if (!info.implemented) line += ' [not implemented]';
                else if (info.missing.length) line += ' [partial]';
                this.say(line);
            }
            const usable = [...new Set(this.player.inventory.filter((i) => this.data.itemDefinitions[i]))];
            for (const item of usable) {
                const n = this.player.inventory.filter((i) => i === item).length;
                this.say(`> Use ${item}${n > 1 ? ` (x${n})` : ''}`);
            }
            this.say('> Flee');
            this.say("Type a command (e.g., 'attack 1', 'grave bolt 2', 'use bandages').");
        }

        statusTag(c) {
            return c.statusEffects.length
                ? ` [${c.statusEffects.map((s) => `${s.name}${s.stacks > 1 ? ` x${s.stacks}` : ''}${typeof s.duration === 'number' ? ` ${s.duration}` : ''}`).join(', ')}]` + (c.cr && c.cr.value > 0 ? ` (CR ${Math.round(c.cr.value)}${c.cr.immune ? ' IMMUNE' : ''})` : '') : '';
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['combat-input'] = CombatInputMethods;
    if (isNode) module.exports = CombatInputMethods;
})(typeof window !== 'undefined' ? window : globalThis);
