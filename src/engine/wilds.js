/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: A world that refills (rest respawns and elites)
 * Tokelo approved pick 2 of docs/design/GAME_EXPERIENCE_RESEARCH_ROUND2_2026-11-25.md (2026-11-25):
 *   - Resting (the homestead bed, or by any hearth) brings back every ordinary group listed in
 *     gameRules.restRespawns, like a Dark Souls bonfire. Story fights, bosses and one-shot groups stay beaten.
 *   - A group that comes back lives a new "life": its loot claims are `world:<id>@<n>`, so it drops fresh loot.
 *     Quest credit and story triggers stay once-only (story.js), as before.
 *   - Some returning groups bring an elite (data eliteRules): the leader gets one visible modifier.
 *
 * world.respawns { id: lives } and world.elites { id: modifier } are created on first use (save format 5 adds them
 * up front, src/engine/save.js). These are GameEngine methods (`this` is the engine).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    class WildsMethods {
        /** The loot scope of a world encounter's current life: `world:<id>`, then `world:<id>@<n>` after n rests. */
        encounterScope(id) {
            const n = this.world && this.world.respawns && this.world.respawns[id];
            return n ? `world:${id}@${n}` : `world:${id}`;
        }

        /** Pure: the beaten groups a rest would bring back now. */
        restReturns() {
            const back = new Set(this.data.gameRules.restRespawns || []);
            return this.world ? [...new Set(this.world.defeated.filter((id) => back.has(id)))] : [];
        }

        /** A rest: every listed group that was beaten comes back, and some bring an elite. Returns the ids. */
        wildsRespawn() {
            const w = this.world;
            const ids = this.restReturns();
            if (!ids.length) return [];
            w.defeated = w.defeated.filter((id) => !ids.includes(id));
            w.respawns = w.respawns || {};
            w.elites = w.elites || {};
            const rules = this.data.eliteRules || {};
            const mods = Object.keys(rules.modifiers || {});
            const elites = {};
            for (const id of ids) {
                w.respawns[id] = (w.respawns[id] || 0) + 1;
                delete w.elites[id];
                if (mods.length && this.rng() < (rules.chance || 0)) elites[id] = w.elites[id] = mods[this.randInt(0, mods.length - 1)];
            }
            const n = Object.keys(elites).length;
            this.say(`While you rest, the wild creeps back: ${ids.length} beaten ${ids.length > 1 ? 'groups are' : 'group is'} out there again.${n ? ` ${n > 1 ? `${n} of them follow` : 'One of them follows'} something stronger.` : ''}`, { important: true, notice: 'quest' });
            this.out.push({ type: 'world.wilds_return', ids: ids.slice(), elites: { ...elites } });
            return ids;
        }

        /** The elite modifier a group carries this life ({ id, name, color, ... }), or null. Pure. */
        eliteOf(encounterId) {
            const id = this.world && this.world.elites && this.world.elites[encounterId];
            const def = id && ((this.data.eliteRules || {}).modifiers || {})[id];
            return def ? { id, ...def } : null;
        }

        /** Which member of a group leads it (the elite): the one with the most HP, the first on a tie. Pure. */
        eliteIndex(enemyKeys) {
            let best = 0, hp = -1;
            (enemyKeys || []).forEach((k, i) => { const e = this.data.enemies[k]; const h = e ? e.maxHp || e.hp || 0 : 0; if (h > hp) { hp = h; best = i; } });
            return best;
        }

        /** buildEnemies(): make the group's leader its elite, if this life rolled one. */
        applyElite(enemies, scope) {
            if (!this.world || typeof scope !== 'string' || !scope.startsWith('world:') || !enemies.length) return;
            const encounterId = scope.slice(6).replace(/@\d+$/, '');
            const mod = this.eliteOf(encounterId);
            if (!mod) return;
            const rules = this.data.eliteRules;
            const e = enemies[this.eliteIndex(enemies.map((x) => x.key))];
            e.elite = { id: mod.id, name: mod.name, color: mod.color, text: mod.text };
            e.name = `${mod.name} ${e.name}`;
            e.hp = e.maxHp = Math.round((e.maxHp || e.hp) * (rules.hpMult || 1));
            e.xp = Math.round((e.xp != null ? e.xp : this.data.gameRules.defaultEnemyXp) * (rules.xpMult || 1));
            if (!e.lootRank || e.lootRank === 'common') e.lootRank = 'elite';
            if (mod.damageMult) e.eliteDamageMult = mod.damageMult;
            if (mod.speedMult) e.eliteSpeedMult = mod.speedMult;
            if (mod.damageTakenMult) e.damageTakenMult = mod.damageTakenMult;
            if (mod.thorns) e.thorns = mod.thorns;
            if (mod.inflict) e.skills = (e.skills || []).map((sk) => ({ ...sk, effects: [...(sk.effects || []), { ...mod.inflict }] }));
        }

        /** A Thorned elite cuts whoever hits it: a share of the damage dealt comes back to the player. */
        eliteThorns(attacker, target, dealt) {
            if (!target || !target.thorns || !attacker || !attacker.isPlayer || dealt <= 0 || attacker.hp <= 0) return;
            const back = Math.max(1, Math.floor(dealt * target.thorns));
            const taken = this.damage(attacker, back, target);
            if (taken > 0) this.say(`Thorns! ${target.name} cuts you back for ${taken}.`);
        }

        /** A group was beaten: its elite (if any) is gone with it until the next rest. */
        wildsCleared(encounterId) {
            if (this.world && this.world.elites) delete this.world.elites[encounterId];
        }

        /**
         * Space only (the world owns where things lie): put a fresh drop where its enemy fell, instead of at the group's
         * home. The sim calls it as the drop appears; nothing about the drop's loot changes. Returns true if moved.
         */
        placeDrop(dropId, x, y) {
            const d = ((this.world && this.world.drops) || []).find((o) => o.id === String(dropId));
            if (!d || !Number.isFinite(x) || !Number.isFinite(y)) return false;
            d.x = Math.round(x); d.y = Math.round(y);
            return true;
        }

        /** Pure: the best rarity in a drop (for its glint), or null for gold and plain goods. */
        dropRarity(drop) {
            const order = Object.keys(this.data.equipmentRarities || {});
            let best = null;
            for (const e of (drop && drop.items) || []) if (e.rarity && order.indexOf(e.rarity) > order.indexOf(best)) best = e.rarity;
            return best;
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {})).wilds = WildsMethods;
    if (isNode) module.exports = WildsMethods;
})(typeof window !== 'undefined' ? window : globalThis);
