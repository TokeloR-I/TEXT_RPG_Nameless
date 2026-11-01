/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Progression
 * XP, levelling, evolution branches, skill trees, the status screen.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const { clone, cap, pretty } = isNode ? require('./util.js') : ENSO.engineUtil;

    class ProgressionMethods {
        // =====================================================================
        // Progression
        // =====================================================================
        addExperience(amount, opts = {}) {
            const p = this.player;
            if (!p) return;
            p.xp += amount;
            if (!opts.quiet) this.say(`You gained ${amount} experience points!`);
            while (p.xp >= p.xpToNext) {
                p.xp -= p.xpToNext;
                p.level++;
                p.xpToNext = Math.floor(p.xpToNext * 1.5);
                const gains = this.applyLevelGrowth(p);
                this.say(`Congratulations! You have reached Level ${p.level}!`, { important: true });
                this.say(`Stats increased: ${gains.join(', ')}. HP and ${p.resource.type} refilled.`);
                this.evolve();
            }
        }

        /** Per-class stat growth for one level (`levelGrowth` on the class in src/data.js, Gauge's numbers).
         *  Returns the gains as short labels for the level-up line. Agility growth also raises speed. */
        levelGrowthFor(p) {
            const cls = this.data.basePlayerClasses[p.className] || {};
            return cls.levelGrowth || this.data.gameRules.defaultLevelGrowth;
        }

        applyLevelGrowth(p) {
            const g = this.levelGrowthFor(p), gains = [];
            // A rate below 1 (e.g. 0.5 = every other level) is paid as whole points: the gain at level L is
            // floor(L x rate) - floor((L - 1) x rate). Stateless, so a save needs nothing extra.
            const step = (rate) => Math.floor(p.level * (rate || 0) + 1e-9) - Math.floor((p.level - 1) * (rate || 0) + 1e-9);
            const add = (stat, label) => { const v = step(g[stat]); if (v) { p[stat] += v; gains.push(`+${v} ${label}`); } return v; };
            const hp = step(g.hp);
            if (hp) { p.maxHp += hp; gains.push(`+${hp} HP`); }
            p.hp = p.maxHp;
            add('strength', 'STR'); add('intelligence', 'INT'); p.spd += add('agility', 'AGI'); add('def', 'DEF');
            if (g.critChance) {
                const before = p.critChance;
                p.critChance = Math.min(this.data.gameRules.critChanceCap, p.critChance + g.critChance);
                const pts = Math.round((p.critChance - before) * 1000) / 10;
                if (pts > 0) gains.push(`+${pts}% crit`);
            }
            const res = step(g.resource);
            if (res) { p.resource.max += res; gains.push(`+${res} max ${p.resource.type}`); }
            p.resource.current = p.resource.max;
            return gains;
        }

        evolve() {
            if (this.player.isHollowKing) { this.say('Your form is beyond conventional evolution.', { important: true }); return; }
            if (!this.data.evolutionPaths[this.player.className]) return;
            if (!this.progression.branch) {
                if (this.player.level >= 3) this.pendingBranchChoice = true;
                return;
            }
            this.applyStages();
        }

        maybePromptBranch() {
            if (!this.pendingBranchChoice || this.mode === 'combat' || this.mode === 'game_over') return;
            const tree = this.data.evolutionPaths[this.player.className];
            this.mode = 'branch_select';
            this.say('You feel a surge of new power! It\'s time to specialize.', { important: true });
            this.say('Choose your path:');
            for (const key in tree.branches) this.say(`- ${pretty(key)}: ${tree.branches[key].theme}`);
            this.say('Type the name of a path (e.g., \'' + pretty(Object.keys(tree.branches)[0]) + '\').', { important: true });
        }

        chooseBranch(input) {
            const tree = this.data.evolutionPaths[this.player.className];
            const key = input.trim().replace(/\s+/g, '_');
            const match = Object.keys(tree.branches).find((k) => k === key || tree.branches[k].name.toLowerCase() === input.trim());
            if (!match) {
                this.refuse('INVALID_BRANCH', 'That is not one of your paths.');
                this.pendingBranchChoice = true;
                this.maybePromptBranch();
                return;
            }
            this.progression.branch = match;
            this.pendingBranchChoice = false;
            this.mode = 'explore';
            this.say(`You walk the path of the ${tree.branches[match].name}.`, { important: true });
            this.applyStages();
            if (!this.world) this.say("Type 'look' to see where you are.");
        }

        applyStages() {
            const prog = this.progression;
            const p = this.player;
            if (!p || !prog.branch || p.isHollowKing) return;
            const branch = this.data.evolutionPaths[p.className].branches[prog.branch];
            for (let i = prog.stageIndex + 1; i < branch.stages.length; i++) {
                const st = branch.stages[i];
                if (st.level > p.level) break;
                if (st.unlockTrigger && !this.flags.eventsUnlocked) {
                    this.say(`(${st.name} awaits — requires: ${st.unlockTrigger}.)`);
                    break;
                }
                this.enterStage(branch, st, i);
            }
        }

        enterStage(branch, stage, index) {
            const p = this.player;
            this.progression.stageIndex = index;
            this.progression.evolutionName = stage.name;
            this.say(`--- Your destiny unfolds! You become a ${stage.name}! ---`, { important: true });
            if (stage.lore) this.say(`"${stage.lore}"`);
            if (stage.skill && !p.skills.includes(stage.skill)) {
                p.skills.push(stage.skill);
                const info = this.describeSkill(stage.skill);
                this.say(`New Skill: ${stage.skill}!${info.implemented ? '' : ' (not implemented yet)'}`, { important: true });
            }
            if (stage.trait) {
                p.traits.push({ name: stage.trait, effect: stage.traitEffect, ...(stage.damageReductionOverride != null ? { damageReductionOverride: stage.damageReductionOverride } : {}) });
                this.say(`New Trait: ${stage.trait}!`, { important: true });
            }
            const resEvo = (branch.resourceEvolution || []).find((r) => r.level === stage.level);
            if (resEvo && resEvo.type !== p.resource.type) {
                this.say(`Your ${p.resource.type} becomes ${resEvo.type}.`);
                p.resource.type = resEvo.type;
                const rule = (this.data.resourceRules || {})[resEvo.type];
                if (rule && rule.regen != null) p.resource.regen = rule.regen;
            }
        }

        becomeHollowKing() {
            const hk = this.data.legendaryAndSecretClasses.the_hollow_king;
            const p = this.player;
            Object.assign(p, {
                name: hk.name, isHollowKing: true,
                maxHp: 500, hp: 500, originalMaxHp: 500, def: 50,
                strength: 20, intelligence: 20, agility: 15, spd: 15,
                critChance: 0.25, critMultiplier: 2.5,
                resource: { type: hk.coreResource.type, current: hk.coreResource.initial, max: 10, regen: 0 },
                skills: ['Void Rend', ...hk.skills, hk.overdrive.name],
                traits: clone(hk.passives)
            });
            this.progression.evolutionName = hk.name;
            this.clear();
            this.say(hk.uponUnlock, { important: true });
            this.say('You have become The Hollow King. Your previous self is gone.', { important: true });
            this.describeRoom(false);
        }

        showClassTree() {
            const p = this.player;
            this.clear();
            if (p.isHollowKing) {
                const hk = this.data.legendaryAndSecretClasses.the_hollow_king;
                this.say(`<strong>${hk.name}</strong>`, { html: true });
                this.say(`"${hk.uponUnlock}"`);
                this.say(`Identity: ${hk.identity}`);
                return;
            }
            const tree = this.data.evolutionPaths[p.className];
            this.say(`--- Evolution Tree for ${cap(p.className)} ---`, { important: true });
            for (const key in tree.branches) {
                const branch = tree.branches[key];
                this.say(`<strong>Branch: ${branch.name}</strong>`, { html: true });
                branch.stages.forEach((st, i) => {
                    const current = this.progression.branch === key && this.progression.stageIndex === i;
                    let name = st.name;
                    if (st.ascended) name = `<span style="color:#f6ad55">${st.name} (Ascended)</span>`;
                    else if (st.unlockTrigger) name = `<span style="color:#fc8181">${st.name} (Event)</span>`;
                    this.say(`&nbsp;&nbsp;L${st.level}: ${name}${current ? ' <strong>(CURRENT)</strong>' : ''}`, { html: true });
                });
            }
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['progression'] = ProgressionMethods;
    if (isNode) module.exports = ProgressionMethods;
})(typeof window !== 'undefined' ? window : globalThis);
