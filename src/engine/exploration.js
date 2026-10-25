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
            return this.player.inventory.find(i => i === name) || this.player.inventory.find(i => this.itemDef(i) && i.toLowerCase() === lower) || this.player.inventory.find((i) => i.toLowerCase() === lower || this.itemName(i).toLowerCase() === lower)
                || this.player.inventory.find((i) => i.toLowerCase().startsWith(lower)) || null;
        }

        /** Applies an item. Returns true if it was used up. */
        applyItem(item) {
            const def = this.itemDef(item);
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
                const def = this.itemDef(item);
                this.say(`- ${item}${def ? ` — ${this.itemDetails(item)}` : ''}`);
            }
        }

        /** Keep typed merchant stock names case-insensitive. */
        stockName(shopId, item) {
            const stock = this.data.shopDefinitions[shopId]?.stock || {};
            return stock[item] ? item : Object.keys(stock).find(id => id.toLowerCase() === String(item).toLowerCase()) || item;
        }
        /** Shared, pure purchase validation for actions and merchant menus. */
        purchaseBlock(shopId, item) {
            const access = this.merchantBlock(shopId);
            if (access) return access;
            const shop = (this.data.shopDefinitions || {})[shopId];
            item = this.stockName(shopId, item);
            const entry = shop && shop.stock && shop.stock[item];
            const def = this.itemDef(item);
            if (!entry || !def || !Number.isSafeInteger(entry.buyPrice) || entry.buyPrice < 0 || !Number.isSafeInteger(entry.quantity) || entry.quantity < 1)
                return { code: 'NOT_FOR_SALE', message: 'This merchant cannot sell that item.' };
            if (this.player.gold < entry.buyPrice) return { code: 'NOT_ENOUGH_GOLD', message: 'Not enough Gold.' };
            const remaining = (this.player.shopStock || {})[`${shopId}:${item}`] ?? entry.quantity;
            if (remaining < 1) return { code: 'OUT_OF_STOCK', message: 'That item is sold out.' };
            return null;
        }

        /** Commerce is atomic: validations complete before either balance or inventory changes. */
        buyItem(shopId, item) {
            item = this.stockName(shopId, item);
            const block = this.purchaseBlock(shopId, item);
            if (block) { this.refuse(block.code, block.message); return false; }
            const entry = this.data.shopDefinitions[shopId].stock[item];
            if (!this.player.shopStock) this.player.shopStock = {};
            const key = `${shopId}:${item}`;
            const remaining = this.player.shopStock[key] ?? entry.quantity;
            this.player.gold -= entry.buyPrice;
            this.player.shopStock[key] = remaining - 1;
            this.player.inventory.push(item);
            this.say(`Purchased ${item} for ${entry.buyPrice} Gold.`);
            return true;
        }

        merchantBlock(shopId) {
            if (!this.story || !this.storyMerchantHere(shopId))
                return { code: 'NOT_AT_MERCHANT', message: 'Talk to this merchant on the current map first.' };
            return null;
        }
        sellBlock(shopId, item) {
            const access = this.merchantBlock(shopId);
            if (access) return access;
            const shop = this.data.shopDefinitions[shopId], def = this.itemDef(item);
            if (!shop || !this.player.inventory.includes(item) || !def || def.sellable !== true || def.bound || def.type === 'quest' || !Number.isSafeInteger(def.sellPrice) || def.sellPrice < 0)
                return { code: 'NOT_SELLABLE', message: 'This item cannot be sold.' };
            const buyPrices = Object.values(this.data.shopDefinitions).flatMap(s => Object.entries(s.stock || {}).filter(([id]) => id === item).map(([, e]) => e.buyPrice));
            if (buyPrices.some(price => def.sellPrice > price)) return { code: 'UNSAFE_PRICE', message: 'This item has an invalid resale price.' };
            if (!Number.isSafeInteger(this.player.gold + def.sellPrice)) return { code: 'GOLD_OVERFLOW', message: 'Gold limit reached.' };
            return null;
        }
        sellItem(shopId, name) {
            const item = this.findInventoryItem(name), block = this.sellBlock(shopId, item);
            if (block) { this.refuse(block.code, block.message); return false; }
            this.player.inventory.splice(this.player.inventory.indexOf(item), 1);
            this.player.gold += this.itemDef(item).sellPrice;
            this.say(`Sold ${this.itemName(item)} for ${this.itemDef(item).sellPrice} Gold.`);
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
