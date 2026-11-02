/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Kitchen (food, drink, foraging)
 * Design: docs/design/COOKING_AND_FOOD.md (Thorne mechanics, Gauge numbers in foodRules, src/data.js).
 *
 * Food is data: an item with use 'meal' or 'drink' names what it heals, how long its buff lasts (seconds, never
 * more than foodRules.maxSeconds) and its `mods`. Eating applies one status named after the dish through the one
 * status pipeline (applyStatus). Different dishes stack with each other; the same dish again refreshes its timer
 * and adds a stack up to its cap. Meal buffs are timed like every buff in a timed fight: on the fight clock in a
 * fight and on the calm clock out of one (src/engine/action.js), and they carry across fights.
 *
 *   mods.damage   +share of outgoing damage            mods.defence  share of incoming damage removed
 *   mods.crit     +crit chance                         mods.speed    +share of walking speed (the sim reads it)
 *   mods.regen    HP per second (pulses in a fight, calm ticks out of one; fractions carry)
 *
 * Beer (use 'drink') also adds a Tipsy stack. Drinking past foodRules.drunk.beersBeforeDrunk turns Tipsy into
 * Drunk: the controls are inverted for drunk.seconds. The sim asks controlsInverted() (src/action/sim.js).
 *
 * Foraging: a world object of kind 'forage' names a forageDefinitions entry. Picking it gives its yield and it
 * grows back after regrowSeconds on the calm clock (world.foraged holds when, so it's saved).
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies them onto GameEngine.prototype.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const FOOD_USES = new Set(['meal', 'drink']);
    const MOD_KEYS = ['damage', 'defence', 'crit', 'speed', 'regen'];

    class KitchenMethods {
        foodRules() { return this.data.foodRules || {}; }
        isFood(def) { return !!def && FOOD_USES.has(def.use); }

        /** Food statuses on a combatant (pure). */
        foodStatuses(c) { return ((c && c.statusEffects) || []).filter((s) => s.food && s.mods); }

        /** Sum of one food modifier over every meal and drink you have up (× stacks), capped by foodRules.caps (pure). */
        foodMod(c, key) {
            if (!c || !c.isPlayer) return 0;
            let sum = 0;
            for (const s of this.foodStatuses(c)) sum += (Number(s.mods[key]) || 0) * (s.stacks || 1);
            const cap = (this.foodRules().caps || {})[key];
            return typeof cap === 'number' ? Math.min(cap, sum) : sum;
        }

        /** Why this food can't be eaten or drunk right now, or null (pure). availability and eatFood share it. */
        foodBlock(item) {
            const def = this.itemDef(item);
            if (!this.isFood(def)) return null;
            if (def.use !== 'meal' || !def.mods) return null;
            const fullAt = this.foodRules().fullAt;
            const meals = this.foodStatuses(this.player).filter((s) => s.meal);
            if (typeof fullAt === 'number' && meals.length >= fullAt && !meals.some((s) => s.name === item))
                return { code: 'TOO_FULL', message: `You're too full for another dish (${meals.length} meals still working).` };
            return null;
        }

        /** Seconds a food buff lasts, clamped to foodRules.maxSeconds. */
        foodSeconds(def) {
            const max = this.foodRules().maxSeconds || 180;
            return Math.max(1, Math.min(max, Number(def.seconds) || max));
        }

        /** Apply a timed status to the player: the fight clock in a fight, the calm clock out of one, turns otherwise. */
        applyTimedPlayerStatus(spec) {
            const p = this.player;
            const inFight = this.mode === 'combat' && this.combat;
            const timed = { ...spec };
            if (inFight && !this.combat.rt) timed.duration = Math.max(1, Math.ceil(spec.seconds / ((this.rtRules().secondsPerTurn) || 3)));
            const inst = this.applyStatus(p, p, timed);
            if (!inst) return null;
            const calm = !inFight && this.actionCalm && this.actionCalm();
            if (calm) {
                inst.calm = true;
                inst.rtTotalMs = Math.round(spec.seconds * 1000);
                inst.rtEndsAt = calm.now + inst.rtTotalMs;
            }
            return inst;
        }

        /** Eat a meal or drink a beer: heal, then the dish's buff. Returns true if it was used up. */
        eatFood(item) {
            const def = this.itemDef(item);
            const p = this.player;
            const block = this.foodBlock(item);
            if (block) { this.refuse(block.code, block.message); return false; }
            const verb = def.use === 'drink' ? 'drink' : 'eat';
            const healed = def.heal > 0 ? this.heal(p, def.heal) : 0;
            this.say(`You ${verb} the ${item}.${healed > 0 ? ` +${healed} HP (${p.hp}/${p.maxHp}).` : ''}`, { important: true });
            if (def.mods && Object.keys(def.mods).length) {
                const seconds = this.foodSeconds(def);
                const mods = {};
                for (const k of MOD_KEYS) if (Number(def.mods[k])) mods[k] = Number(def.mods[k]);
                const inst = this.applyTimedPlayerStatus({ name: item, type: 'food', seconds, food: true, meal: def.use === 'meal', mods });
                if (inst) this.say(`[${item}] ${this.foodModText(mods)} for ${seconds} s${(inst.stacks || 1) > 1 ? ` (×${inst.stacks})` : ''}.`);
            }
            if (def.use === 'drink') this.drinkBeer();
            p.inventory.splice(p.inventory.indexOf(item), 1);
            this.storyEvent({ type: 'eat', id: item });
            return true;
        }

        /** "+12% damage, +1 HP/s" (pure). */
        foodModText(mods) {
            const pct = (v) => `${Math.round(v * 100)}%`;
            const parts = [];
            if (mods.damage) parts.push(`+${pct(mods.damage)} damage`);
            if (mods.defence) parts.push(`-${pct(mods.defence)} damage taken`);
            if (mods.crit) parts.push(`+${pct(mods.crit)} crit`);
            if (mods.speed) parts.push(`+${pct(mods.speed)} speed`);
            if (mods.regen) parts.push(`+${mods.regen} HP/s`);
            return parts.join(', ');
        }

        /** One more beer: Tipsy gains a stack; past the limit you're Drunk and the controls invert. */
        drinkBeer() {
            const r = this.foodRules().drunk || {};
            const limit = r.beersBeforeDrunk ?? 4;
            const p = this.player;
            const tipsy = this.applyTimedPlayerStatus({ name: 'Tipsy', type: 'tipsy', seconds: r.tipsySeconds || 120, food: true });
            if (!tipsy || (tipsy.stacks || 1) <= limit) return;
            this.removeStatus(p, tipsy);
            this.applyTimedPlayerStatus({ name: 'Drunk', type: 'drunk', seconds: r.seconds || 20, food: true });
            this.say(`One beer too many. The world tilts: left is right and up is down. (Drunk for ${r.seconds || 20} s)`, { important: true });
            this.out.push({ type: 'player.drunk', seconds: r.seconds || 20 });
        }

        /** Pure. Are the player's movement controls inverted (Drunk)? */
        controlsInverted() { return !!this.player && this.player.statusEffects.some((s) => s.type === 'drunk'); }

        /** Pure. The player's walking speed multiplier from food. */
        playerMoveMult() { return 1 + this.foodMod(this.player, 'speed'); }

        /** Food regeneration for `ms` of time (fight pulses, calm ticks). Quiet; fractions carry on the player. */
        foodRegen(ms) {
            const p = this.player;
            if (!p || p.hp <= 0 || !(ms > 0)) return 0;
            const perSec = this.foodMod(p, 'regen');
            if (!(perSec > 0)) { p.foodRegenCarry = 0; return 0; }
            if (p.hp >= p.maxHp) { p.foodRegenCarry = 0; return 0; }
            p.foodRegenCarry = (p.foodRegenCarry || 0) + perSec * ms / 1000;
            const whole = Math.floor(p.foodRegenCarry + 1e-9);
            if (whole < 1) return 0;
            p.foodRegenCarry -= whole;
            return this.heal(p, whole);
        }

        // =====================================================================
        // Foraging (world objects of kind 'forage')
        // =====================================================================
        /** Pure. Has this forage spot grown back? */
        forageReady(nodeId) {
            const at = this.world && this.world.foraged && this.world.foraged[nodeId];
            if (at == null) return true;
            const calm = this.actionCalm ? this.actionCalm() : null;
            return !!calm && calm.now >= at;
        }

        /** Pick a forage spot: its yield now, and it grows back after regrowSeconds of calm time. */
        forage(nodeId, forageId) {
            const rule = (this.data.forageDefinitions || {})[forageId];
            if (!rule || !this.itemDef(rule.item)) { this.refuse('NOTHING_TO_FORAGE', 'There is nothing to gather here.'); return false; }
            if (!this.forageReady(nodeId)) { this.refuse('NOT_GROWN_BACK', 'Picked clean. It will grow back.'); return false; }
            const n = Number.isSafeInteger(rule.yield) && rule.yield > 0 ? rule.yield : 1;
            for (let i = 0; i < n; i++) this.player.inventory.push(rule.item);
            const calm = this.actionCalm();
            const foraged = this.world.foraged || (this.world.foraged = {});
            foraged[nodeId] = calm.now + Math.round((rule.regrowSeconds || 120) * 1000);
            this.say(`You gather ${n > 1 ? `${n} ` : ''}${rule.item}.`, { important: true });
            this.storyEvent({ type: 'forage', id: forageId });
            return true;
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['kitchen'] = KitchenMethods;
    if (isNode) module.exports = KitchenMethods;
})(typeof window !== 'undefined' ? window : globalThis);
