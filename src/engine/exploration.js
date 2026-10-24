/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Exploration
 * Moving between rooms, looking, picking up and using items, resting.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const EQUIP_SLOTS = ['mainHand', 'bodyArmor', 'accessory'];
    const USABLE = new Set(['gold', 'heal']);   // item `use` values applyItem() handles; anything else is not usable
    const noUseMessage = (item) => `You turn the ${item} over in your hands. There's nothing to use it for (yet).`;
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
            if (!next) { this.refuse('NO_EXIT', "You can't go that way."); return; }
            this.currentRoom = next;
            this.say(`You move to the ${direction}.`);
            this.describeRoom(false);
        }

        takeItem(name) {
            const room = this.rooms[this.currentRoom];
            const idx = room.items.findIndex((i) => i.toLowerCase() === name.toLowerCase());
            if (idx === -1) { this.refuse('ITEM_NOT_HERE', `You don't see a '${name}' here.`); return; }
            const received = this.grantItem(room.items.splice(idx, 1)[0]);
            this.say(`You pick up the ${received}.`);
        }

        /** Put an item in the inventory, swapped per class if adaptiveLoot says so. Returns what you got. */
        grantItem(generic) {
            const swap = this.data.adaptiveLoot[generic];
            const received = (swap && swap[this.player.className]) || generic;
            this.player.inventory.push(received);
            return received;
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
            if (!def || !USABLE.has(def.use)) { this.refuse('ITEM_NO_USE', noUseMessage(item)); return false; }
            if (def.use === 'gold') {
                if (!Number.isSafeInteger(def.value) || def.value <= 0 ||
                    !Number.isSafeInteger(p.gold + def.value)) {
                    this.refuse('INVALID_GOLD', 'This purse cannot be opened.'); return false;
                }
                p.gold += def.value;
                this.say(`You open the ${item} and find ${def.value} Gold. (${p.gold} total)`);
            }
            if (def.use === 'heal') {
                if (p.hp >= p.maxHp) { this.refuse('FULL_HEALTH', "You're already at full health."); return false; }
                const healed = this.heal(p, def.value);
                this.say(`You use the ${item}. +${healed} HP (${p.hp}/${p.maxHp}).`, { important: true });
            }
            p.inventory.splice(p.inventory.indexOf(item), 1);
            return true;
        }

        useItem(name) {
            if (!name) { this.refuse('NO_ITEM', 'Use what? (e.g. use bandages)'); return; }
            const item = this.findInventoryItem(name);
            if (!item) { this.refuse('NO_ITEM', `You don't have a '${name}'.`); return; }
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

        /** Effective armor/weapon bonuses are reversible deltas, never permanent level stats. */
        equipmentModifiers() {
            const sum = {};
            for (const name of Object.values(this.player.equipment || {})) {
                const def = name && this.data.itemDefinitions[name];
                for (const [stat, delta] of Object.entries((def && def.statModifiers) || {}))
                    sum[stat] = (sum[stat] || 0) + delta;
            }
            return sum;
        }

        compareItem(name) {
            const item = this.findInventoryItem(name);
            const def = item && this.data.itemDefinitions[item];
            if (!def || !['mainHand', 'bodyArmor', 'accessory'].includes(def.slot)) {
                this.refuse('NOT_EQUIPMENT', 'Select a valid owned equipment item.'); return;
            }
            const current = this.player.equipment[def.slot];
            const differences = this.equipmentDiff(item);
            this.say(`${item} vs ${current || 'empty'}: ${JSON.stringify(differences)}`);
            return differences;
        }

        /** Stat change if `item` replaced what is in its slot now (pure). */
        equipmentDiff(item) {
            const def = this.data.itemDefinitions[item] || {};
            const prev = this.data.itemDefinitions[this.player.equipment[def.slot]] || {};
            const differences = {};
            for (const stat of new Set([...Object.keys(prev.statModifiers || {}), ...Object.keys(def.statModifiers || {})]))
                differences[stat] = (def.statModifiers?.[stat] || 0) - (prev.statModifiers?.[stat] || 0);
            return differences;
        }

        /**
         * UI-6: the equipment screen's data (pure). Each slot shows what is worn and every owned item that fits,
         * with its stat change and, if it can't be worn, the same code and message equipItem() refuses with.
         * The screen then sends act({ type: 'equip', item }) or act({ type: 'unequip', slot }).
         */
        getEquipment() {
            const p = this.player;
            if (!p) return null;
            const slots = {};
            for (const slot of EQUIP_SLOTS) slots[slot] = { item: (p.equipment && p.equipment[slot]) || null, candidates: [] };
            for (const item of new Set(p.inventory)) {
                const def = this.data.itemDefinitions[item];
                if (!def || !slots[def.slot]) continue;
                const c = { item, rarity: def.rarity || null, description: def.description || '', diff: this.equipmentDiff(item), enabled: true };
                if (!Object.entries(def.requirements || {}).every(([stat, min]) => (p[stat] || 0) >= min)) {
                    c.enabled = false; c.reason = { code: 'EQUIP_REQUIREMENTS', message: 'You do not meet that item’s requirements.' };
                }
                slots[def.slot].candidates.push(c);
            }
            return { slots, modifiers: this.equipmentModifiers() };
        }

        equipItem(name) {
            const item = this.findInventoryItem(name);
            const def = item && this.data.itemDefinitions[item];
            if (!def || !['mainHand','bodyArmor','accessory'].includes(def.slot)) {
                this.refuse('NOT_EQUIPMENT','That item cannot be equipped.'); return false;
            }
            if (this.player.equipment[def.slot] === item) return true;
            if (!Object.entries(def.requirements || {}).every(([stat, min]) => (this.player[stat] || 0) >= min)) {
                this.refuse('EQUIP_REQUIREMENTS','You do not meet that item’s requirements.'); return false;
            }
            const current = this.player.equipment[def.slot];
            const changes = this.compareItem(item);
            this.player.inventory.splice(this.player.inventory.indexOf(item), 1);
            if (current) this.player.inventory.push(current);
            this.player.equipment[def.slot] = item;
            for (const [stat, delta] of Object.entries(changes)) {
                if (!['def','strength','intelligence','agility'].includes(stat)) continue;
                this.player[stat] += delta;
            }
            this.say(`Equipped ${item}.`);
            return true;
        }

        unequipItem(slot) {
            const p = this.player;
            if (!p.equipment || !p.equipment[slot]) { this.refuse('EMPTY_SLOT','Nothing equipped in that slot.'); return false; }
            const item = p.equipment[slot], def = this.data.itemDefinitions[item];
            for (const [stat, delta] of Object.entries((def && def.statModifiers) || {})) {
                if (['def','strength','intelligence','agility'].includes(stat)) p[stat] -= delta;
            }
            p.equipment[slot] = null;
            p.inventory.push(item);
            this.say(`Unequipped ${item}.`);
            return true;
        }

        /** Commerce is atomic: validations complete before either balance or inventory changes. */
        buyItem(shopId, item) {
            const shop = (this.data.shopDefinitions || {})[shopId], entry = shop && shop.stock && shop.stock[item];
            const def = this.data.itemDefinitions[item];
            if (!entry || !def || !Number.isSafeInteger(entry.buyPrice) || entry.buyPrice < 0 || !Number.isSafeInteger(entry.quantity) || entry.quantity < 1) {
                this.refuse('NOT_FOR_SALE','This merchant cannot sell that item.'); return false;
            }
            if (this.player.gold < entry.buyPrice) { this.refuse('NOT_ENOUGH_GOLD','Not enough Gold.'); return false; }
            if (!this.player.shopStock) this.player.shopStock = {};
            const key = `${shopId}:${item}`;
            const remaining = this.player.shopStock[key] ?? entry.quantity;
            if (remaining < 1) { this.refuse('OUT_OF_STOCK','That item is sold out.'); return false; }
            this.player.gold -= entry.buyPrice;
            this.player.shopStock[key] = remaining - 1;
            this.player.inventory.push(item);
            this.say(`Purchased ${item} for ${entry.buyPrice} Gold.`);
            return true;
        }

        sellItem(shopId, name) {
            const shop = (this.data.shopDefinitions || {})[shopId], item = this.findInventoryItem(name);
            const def = item && this.data.itemDefinitions[item];
            if (!shop || !def || def.sellable !== true || def.type === 'quest' ||
                !Number.isSafeInteger(def.sellPrice) || def.sellPrice < 0) {
                this.refuse('NOT_SELLABLE','This item cannot be sold.'); return false;
            }
            if (!Number.isSafeInteger(this.player.gold + def.sellPrice)) { this.refuse('GOLD_OVERFLOW','Gold limit reached.'); return false; }
            this.player.inventory.splice(this.player.inventory.indexOf(item), 1);
            this.player.gold += def.sellPrice;
            this.say(`Sold ${item} for ${def.sellPrice} Gold.`);
            return true;
        }

        /** Data-driven homestead: nothing is buildable or craftable until authored. */
        buildUpgrade(id) {
            const rule = (this.data.constructionDefinitions || {})[id];
            const p = this.player;
            p.homestead = p.homestead || { built: {}, plots: {} };
            if (!rule || p.homestead.built[id]) {
                this.refuse('BUILD_UNAVAILABLE', 'This construction is unavailable.'); return false;
            }
            if ((rule.requires || []).some(pre => !p.homestead.built[pre])) {
                this.refuse('BUILD_LOCKED', 'A prerequisite has not been built.'); return false;
            }
            const cost = rule.goldCost;
            if (!Number.isSafeInteger(cost) || cost < 0) {
                this.refuse('BUILD_UNAVAILABLE', 'Construction cost is undefined.'); return false;
            }
            if (p.gold < cost) { this.refuse('NOT_ENOUGH_GOLD', 'Not enough Gold for construction.'); return false; }
            const materials = rule.materials || {};
            if (Object.entries(materials).some(([name, qty]) => !Number.isSafeInteger(qty) || qty < 0 ||
                p.inventory.filter(x=>x===name).length < qty)) {
                this.refuse('MISSING_MATERIALS', 'Construction materials are missing.'); return false;
            }
            p.gold -= cost;
            for (const [name, qty] of Object.entries(materials))
                for (let i = 0; i < qty; i++) p.inventory.splice(p.inventory.indexOf(name), 1);
            p.homestead.built[id] = true;
            this.say(`Built ${rule.name || id}.`);
            return true;
        }

        plantCrop(plotId, seed) {
            const p = this.player;
            p.homestead = p.homestead || { built: {}, plots: {} };
            const rule = (this.data.cropDefinitions || {})[seed];
            if (!rule || !rule.produces || !Number.isSafeInteger(rule.actionsToGrow) || rule.actionsToGrow < 1 ||
                !p.homestead.built[rule.requiresUpgrade || 'field_plot'] || p.homestead.plots[plotId] ||
                !p.inventory.includes(seed)) {
                this.refuse('CANNOT_PLANT', 'This seed or plot is unavailable.'); return false;
            }
            p.inventory.splice(p.inventory.indexOf(seed), 1);
            p.homestead.plots[plotId] = { seed, remaining: rule.actionsToGrow };
            this.say(`Planted ${seed} in ${plotId}.`);
            return true;
        }

        /** An explicit tending action advances one plot, never wall-clock timers. */
        tendPlot(plotId) {
            const plot = this.player.homestead?.plots?.[plotId];
            if (!plot) { this.refuse('EMPTY_PLOT', 'Nothing to tend.'); return false; }
            if (plot.remaining > 0) plot.remaining--;
            this.say(`${plotId}: ${plot.remaining} tending actions remain.`);
            return true;
        }

        harvestPlot(plotId) {
            const plot = this.player.homestead?.plots?.[plotId];
            const rule = plot && (this.data.cropDefinitions || {})[plot.seed];
            if (!rule || plot.remaining > 0) {
                this.refuse('CROP_NOT_READY', 'The crop is not ready.'); return false;
            }
            this.player.inventory.push(rule.produces);
            delete this.player.homestead.plots[plotId];
            this.say(`Harvested ${rule.produces}.`);
            return true;
        }

        craftRecipe(id) {
            const recipe = (this.data.recipeDefinitions || {})[id], p = this.player;
            if (!recipe || !recipe.output ||
                (recipe.requiresUpgrade && !p.homestead?.built?.[recipe.requiresUpgrade])) {
                this.refuse('RECIPE_LOCKED', 'This recipe or station is unavailable.'); return false;
            }
            const ingredients = recipe.ingredients || {};
            if (Object.entries(ingredients).some(([name, qty]) => !Number.isSafeInteger(qty) || qty < 1 ||
                p.inventory.filter(x=>x===name).length < qty)) {
                this.refuse('MISSING_INGREDIENTS', 'You lack crafting ingredients.'); return false;
            }
            for (const [name, qty] of Object.entries(ingredients))
                for (let i = 0; i < qty; i++) p.inventory.splice(p.inventory.indexOf(name), 1);
            p.inventory.push(recipe.output);
            this.say(`Crafted ${recipe.output}.`);
            return true;
        }

        engage() {
            const keys = this.rooms[this.currentRoom].enemies;
            if (!keys.length) { this.refuse('NO_ENEMIES', 'There are no enemies here.'); return; }
            this.startCombat(keys);
        }
    }

    (ENSO.engineModules || (ENSO.engineModules = {}))['exploration'] = ExplorationMethods;
    if (isNode) module.exports = ExplorationMethods;
})(typeof window !== 'undefined' ? window : globalThis);
