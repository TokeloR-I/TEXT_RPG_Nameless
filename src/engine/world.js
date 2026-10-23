/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: World intents
 * The graphical world (src/world/, ui/world-ui.js) owns space; the engine stays
 * authoritative for inventory, fights and the run's persistent flags
 * (docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md §4–§5). These are the only things
 * the world asks of the engine. Each returns events, like input(), and runs as
 * a transaction. The text game never calls them, so this.world stays null there.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    class WorldMethods {
        /** Start keeping world run flags. Call once after choosing a class. */
        enterWorld() {
            this.world = { collected: [], defeated: [], encounter: null, lastEncounter: null, lastResult: null };
            return this.flush();
        }

        isCollected(id) { return !!this.world && this.world.collected.includes(id); }
        isDefeated(id) { return !!this.world && this.world.defeated.includes(id); }

        /** Pick up a world object once per run. Uses the same loot rules as `take`. */
        worldPickup(id, item) {
            return this.transact(() => {
                if (!this.world) throw new Error('worldPickup before enterWorld');
                if (this.mode !== 'explore') { this.say('Not now.'); return; }
                if (this.isCollected(id)) { this.say('There is nothing left here.'); return; }
                this.world.collected.push(id);
                const received = this.grantItem(item);
                this.say(`You pick up the ${received}.`, { important: true });
            });
        }

        /** Start the fight for a visible map encounter. Normal combat rules from here on. */
        worldEncounter(id, enemyKeys) {
            return this.transact(() => {
                if (!this.world) throw new Error('worldEncounter before enterWorld');
                if (this.mode !== 'explore') { this.say('Not now.'); return; }
                if (this.isDefeated(id)) { this.say('Nothing stirs here any more.'); return; }
                this.world.encounter = id;
                this.world.lastEncounter = null;
                this.world.lastResult = null;
                this.startCombat(enemyKeys, `world:${id}`);
            });
        }

        /** Called by the combat code when a world encounter ends: 'victory' | 'fled' | 'defeat'. */
        worldFightEnded(result) {
            if (!this.world || !this.world.encounter) return;
            if (result === 'victory') this.world.defeated.push(this.world.encounter);
            this.world.lastEncounter = this.world.encounter;
            this.world.lastResult = result;
            this.world.encounter = null;
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['world'] = WorldMethods;
    if (isNode) module.exports = WorldMethods;
})(typeof window !== 'undefined' ? window : globalThis);
