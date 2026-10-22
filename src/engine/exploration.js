/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Exploration
 * Moving between rooms, looking, picking up and using items, resting.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const { cap, pretty } = isNode ? require('./util.js') : ENSO.engineUtil;

    class ExplorationMethods {
        // =====================================================================
        // Exploration
        // =====================================================================
        describeRoom(clearFirst = true) {
            const room = this.rooms[this.currentRoom];
            if (clearFirst) this.clear();
            this.say(`--- ${pretty(this.currentRoom).toUpperCase()} ---`, { important: true });
            this.say(room.description);
            this.say('What do you do?');

            const exits = Object.keys(room.exits);
            if (exits.length) {
                this.say('-- Exits --', { important: true });
                for (const dir of exits) this.say(`👣 Go ${dir}`);
            }
            if (room.enemies.length) {
                this.say('-- Enemies Present --', { important: true });
                for (const key of room.enemies) {
                    const e = this.data.enemies[key];
                    if (e) this.say(`Beware! ${cap(this.withArticle(e))} lurks here.`);
                }
                this.say('⚔️ Engage (start combat)');
            }
            if (room.items.length) {
                this.say('-- Items here --', { important: true });
                for (const item of room.items) this.say(`✋ Take ${item}`);
            }
        }

        move(direction) {
            const next = this.rooms[this.currentRoom].exits[direction];
            if (!next) { this.say("You can't go that way."); return; }
            this.currentRoom = next;
            this.say(`You move to the ${direction}.`);
            this.describeRoom(false);
        }

        takeItem(name) {
            const room = this.rooms[this.currentRoom];
            const idx = room.items.findIndex((i) => i.toLowerCase() === name.toLowerCase());
            if (idx === -1) { this.say(`You don't see a '${name}' here.`); return; }
            const generic = room.items.splice(idx, 1)[0];
            const swap = this.data.adaptiveLoot[generic];
            const received = (swap && swap[this.player.className]) || generic;
            this.player.inventory.push(received);
            this.say(`You pick up the ${received}.`);
        }

        findInventoryItem(name) {
            const lower = name.trim().toLowerCase();
            return this.player.inventory.find((i) => i.toLowerCase() === lower)
                || this.player.inventory.find((i) => i.toLowerCase().startsWith(lower)) || null;
        }

        /** Applies an item. Returns true if it was used up. */
        applyItem(item) {
            const def = this.data.itemDefinitions[item];
            const p = this.player;
            if (!def) { this.say(`You turn the ${item} over in your hands. There's nothing to use it for (yet).`); return false; }
            if (def.use === 'heal') {
                if (p.hp >= p.maxHp) { this.say("You're already at full health."); return false; }
                const healed = this.heal(p, def.value);
                this.say(`You use the ${item}. +${healed} HP (${p.hp}/${p.maxHp}).`, { important: true });
            }
            p.inventory.splice(p.inventory.indexOf(item), 1);
            return true;
        }

        useItem(name) {
            if (!name) { this.say('Use what? (e.g. use bandages)'); return; }
            const item = this.findInventoryItem(name);
            if (!item) { this.say(`You don't have a '${name}'.`); return; }
            this.applyItem(item);
        }

        showInventory() {
            const inv = this.player.inventory;
            if (!inv.length) { this.say('Your inventory is empty.'); return; }
            this.say('--- Inventory ---', { important: true });
            for (const item of inv) {
                const def = this.data.itemDefinitions[item];
                this.say(`- ${item}${def ? ` — ${def.description} (use: ${def.use} ${def.value})` : ''}`);
            }
        }

        engage() {
            const keys = this.rooms[this.currentRoom].enemies;
            if (!keys.length) { this.say('There are no enemies here.'); return; }
            this.startCombat(keys);
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['exploration'] = ExplorationMethods;
    if (isNode) module.exports = ExplorationMethods;
})(typeof window !== 'undefined' ? window : globalThis);
