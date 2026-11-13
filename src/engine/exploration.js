/* =========================================================================
 * Enso's Last Stand — ENGINE MODULE: Exploration
 * Moving between rooms, looking, picking up and using items, resting.
 *
 * These are GameEngine methods (`this` is the engine). src/engine.js copies
 * them onto GameEngine.prototype, so callers just use engine.method().
 * ========================================================================= */
(function (global) {
    const EQUIP_SLOTS = ['mainHand', 'bodyArmor', 'accessory'];
    const USABLE = new Set(['gold', 'heal', 'meal', 'drink', 'camp']);   // item `use` values applyItem() handles; anything else is not usable
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
            if (this.isFood(def)) return this.eatFood(item);   // meals and beer: src/engine/kitchen.js
            if (def.use === 'camp') return this.makeCamp(item);  // Hakon's camp kit: src/engine/kitchen.js
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
        /** A stock entry with `classes` is only offered to those classes (Bragg's class weapons). */
        stockForPlayer(entry) {
            return !entry || !entry.classes || (!!this.player && entry.classes.includes(this.player.className));
        }
        /** Shared, pure purchase validation for actions and merchant menus. */
        purchaseBlock(shopId, item) {
            const access = this.merchantBlock(shopId);
            if (access) return access;
            const shop = (this.data.shopDefinitions || {})[shopId];
            item = this.stockName(shopId, item);
            const entry = shop && shop.stock && shop.stock[item];
            const def = this.itemDef(item);
            if (!entry || !def || !this.stockForPlayer(entry) || !Number.isSafeInteger(entry.buyPrice) || entry.buyPrice < 0 || !Number.isSafeInteger(entry.quantity) || entry.quantity < 1)
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

        // -----------------------------------------------------------------
        // A safe home (Tokelo, 2026-11-03): once the gate is mended, the homestead bed heals you fully and
        // the old chest keeps what you don't want to carry. Both are used from their stations' choices.
        // -----------------------------------------------------------------
        /** A full night's rest: all HP and resource back, lingering statuses gone. Out of fights only. */
        restAtHome() {
            const p = this.player;
            if (this.mode !== 'explore') { this.refuse('WRONG_MODE', 'Not now.'); return false; }
            p.hp = p.maxHp;
            if (p.resource) p.resource.current = p.resource.max;
            p.statusEffects = [];
            this.say(`You bar the gate and sleep under your own roof. You wake rested. (${p.hp}/${p.maxHp} HP${p.resource ? `, ${p.resource.current}/${p.resource.max} ${p.resource.type}` : ''})`, { important: true });
            // Hunting grounds: the beaten encounters listed in gameRules.restRespawns come back overnight.
            const w = this.world, back = new Set(this.data.gameRules.restRespawns || []);
            if (w && w.defeated.some((id) => back.has(id))) {
                w.defeated = w.defeated.filter((id) => !back.has(id));
                this.say('In the night you hear the wild creep back: rats in the grass, wolves on the road.');
            }
            return true;
        }

        stashContents() { const h = this.player.homestead; return (h && h.stash) || []; }
        countOf(list, item) { const n = list.filter((x) => x === item).length; return n > 1 ? ` (${n})` : ''; }

        /** Why this item can't go in the stash, or null (pure). Story items stay with you so no quest is stranded. */
        stashBlock(item) {
            if (!this.player.inventory.includes(item)) return { code: 'NOT_CARRIED', message: "You aren't carrying that." };
            const def = this.itemDef(item);
            if (!def || def.type === 'quest' || def.bound) return { code: 'KEEP_ITEM', message: 'You keep that on you.' };
            return null;
        }

        stashItem(item) {
            const block = this.stashBlock(item);
            if (block) { this.refuse(block.code, block.message); return false; }
            const p = this.player;
            p.homestead = p.homestead || { built: {}, plots: {} };
            p.homestead.stash = p.homestead.stash || [];
            p.inventory.splice(p.inventory.indexOf(item), 1);
            p.homestead.stash.push(item);
            this.say(`Put ${this.itemName(item)} in the chest.`);
            return true;
        }

        unstashItem(item) {
            const stash = this.stashContents();
            const i = stash.indexOf(item);
            if (i === -1) { this.refuse('NOT_STASHED', "That isn't in the chest."); return false; }
            stash.splice(i, 1);
            this.player.inventory.push(item);
            this.say(`Took ${this.itemName(item)} from the chest.`);
            return true;
        }

        plantCrop(plotId, seed) {
            const p = this.player;
            p.homestead = p.homestead || { built: {}, plots: {} };
            const rule = (this.data.cropDefinitions || {})[seed];
            // plantIn: the plots this seed (or animal) may go in, each a construction you have built. Without it, the
            // older rule: any plot id once requiresUpgrade (default field_plot) is built.
            const plotOk = Array.isArray(rule && rule.plantIn) ? rule.plantIn.includes(plotId) && !!p.homestead.built[plotId]
                : !!(rule && p.homestead.built[rule.requiresUpgrade || 'field_plot']);
            if (!rule || !rule.produces || !Number.isSafeInteger(rule.actionsToGrow) || rule.actionsToGrow < 1 ||
                !plotOk || p.homestead.plots[plotId] ||
                !p.inventory.includes(seed)) {
                this.refuse('CANNOT_PLANT', 'This seed or plot is unavailable.'); return false;
            }
            p.inventory.splice(p.inventory.indexOf(seed), 1);
            const grow = this.cropGrowMs(rule);
            if (grow != null) {   // the world: it ripens on the calm clock (farmingRules)
                p.homestead.plots[plotId] = { seed, remaining: 1, plantedAt: this.actionCalm().now, readyAt: this.actionCalm().now + grow, growMs: grow, tends: 0 };
                this.say(`${rule.plantVerb || 'Planted'} ${seed} in the ${this.plotName(plotId)}. Ready in ${Math.round(grow / 1000)} s; water and weed it to hurry it along.`);
                this.storyEvent({ type: 'plant', id: seed });
                return true;
            }
            p.homestead.plots[plotId] = { seed, remaining: rule.actionsToGrow };
            this.say(`${rule.plantVerb || 'Planted'} ${seed} in the ${this.plotName(plotId)}.`);
            this.storyEvent({ type: 'plant', id: seed });   // quests that teach planting (no-op without a story)
            return true;
        }

        // -----------------------------------------------------------------
        // Crops in the world grow on the calm clock (Tokelo, 2026-11-04): farmingRules.growSeconds to ripen, and
        // watering and weeding takes tendCutsSeconds off, tendsPerCrop times. The clock is the action sim's calm
        // clock (src/engine/action.js), so the engine still never reads a timer. Without it (the text game, the
        // turn-based world) and for livestock, a crop counts tendings (actionsToGrow) as before.
        // -----------------------------------------------------------------
        farmRules() { return this.data.farmingRules || {}; }

        /** ms this crop takes to ripen on the calm clock, or null when it counts tendings instead (pure). */
        cropGrowMs(rule) {
            if (!rule || Array.isArray(rule.feed) || this.combatMode !== 'action' || !this.world || !this.actionCalm) return null;
            const secs = Number(rule.growSeconds ?? this.farmRules().growSeconds);
            return secs > 0 ? Math.round(secs * 1000) : null;
        }

        /** Pure. How a plot is doing: { seed, produces, timed, ready, progress 0..1, leftMs, canTend } or null if empty. */
        plotView(plotId) {
            const plot = this.player && this.player.homestead && this.player.homestead.plots && this.player.homestead.plots[plotId];
            if (!plot) return null;
            const rule = (this.data.cropDefinitions || {})[plot.seed] || {};
            const base = { seed: plot.seed, produces: rule.produces || null, livestock: Array.isArray(rule.feed) };
            if (plot.readyAt != null) {
                const now = (this.actionCalm() || { now: 0 }).now;
                const leftMs = Math.max(0, plot.readyAt - now);
                const total = Math.max(1, plot.readyAt - plot.plantedAt);
                const limit = this.farmRules().tendsPerCrop ?? 1;
                return { ...base, timed: true, ready: leftMs === 0, leftMs, progress: Math.min(1, 1 - leftMs / total),
                    canTend: leftMs > 0 && (plot.tends || 0) < limit, tended: (plot.tends || 0) > 0 };
            }
            const steps = Math.max(1, rule.actionsToGrow || 1);
            return { ...base, timed: false, ready: plot.remaining <= 0, leftMs: null, progress: Math.min(1, 1 - plot.remaining / steps),
                canTend: plot.remaining > 0, tended: false };
        }

        /** An explicit tending action. A timed crop ripens sooner (once); a counted one advances one step. */
        tendPlot(plotId) {
            const plot = this.player.homestead?.plots?.[plotId];
            if (!plot) { this.refuse('EMPTY_PLOT', 'Nothing to tend.'); return false; }
            if (plot.readyAt != null) {
                const v = this.plotView(plotId);
                if (v.ready) { this.refuse('CROP_READY', `The ${this.plotName(plotId)} is ripe. Harvest it.`); return false; }
                if (!v.canTend) { this.refuse('ALREADY_TENDED', `You've already watered and weeded the ${this.plotName(plotId)}. Now it just needs time (${Math.ceil(v.leftMs / 1000)} s).`); return false; }
                const cut = Math.round((Number(this.farmRules().tendCutsSeconds) || 0) * 1000);
                const now = this.actionCalm().now;
                plot.readyAt = Math.max(now, plot.readyAt - cut);
                plot.tends = (plot.tends || 0) + 1;
                const left = Math.ceil((plot.readyAt - now) / 1000);
                this.say(left > 0 ? `You water and weed the ${this.plotName(plotId)}. It will be ready in ${left} s.` : `You water and weed the ${this.plotName(plotId)}. It is ready to harvest.`);
                this.storyEvent({ type: 'tend', id: plotId });
                return true;
            }
            // Livestock eats: a rule with `feed` takes one of those items per tending (the first one you carry).
            const rule = (this.data.cropDefinitions || {})[plot.seed] || {};
            if (Array.isArray(rule.feed) && plot.remaining > 0) {
                const food = rule.feed.find((f) => this.player.inventory.includes(f));
                if (!food) { this.refuse('NO_FEED', `Nothing to feed them. (${rule.feed.join(', ')})`); return false; }
                this.player.inventory.splice(this.player.inventory.indexOf(food), 1);
                this.say(`You feed them ${food}.`);
            }
            if (plot.remaining > 0) plot.remaining--;
            this.say(plot.remaining > 0 ? `The ${this.plotName(plotId)}: ${plot.remaining} more tending to go.` : `The ${this.plotName(plotId)} is ready to harvest.`);
            this.storyEvent({ type: 'tend', id: plotId });
            return true;
        }

        harvestPlot(plotId) {
            const plot = this.player.homestead?.plots?.[plotId];
            const rule = plot && (this.data.cropDefinitions || {})[plot.seed];
            const view = plot && this.plotView(plotId);
            if (!rule || !view.ready) {
                this.refuse('CROP_NOT_READY', view && view.timed ? `The crop is not ready (${Math.ceil(view.leftMs / 1000)} s to go).` : 'The crop is not ready.'); return false;
            }
            const n = Number.isSafeInteger(rule.yield) && rule.yield > 0 ? rule.yield : 1;
            for (let i = 0; i < n; i++) this.player.inventory.push(rule.produces);
            // `keeps`: the animal stays and starts over (hens lay again); anything else leaves the plot empty.
            if (rule.keeps) plot.remaining = rule.actionsToGrow;
            else delete this.player.homestead.plots[plotId];
            this.say(`${rule.harvestVerb || 'Harvested'} ${n > 1 ? `${n} ` : ''}${rule.produces}.`, { notice: 'item' });
            this.storyEvent({ type: 'harvest', id: rule.produces });
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
            const n = Number.isSafeInteger(recipe.yield) && recipe.yield > 1 ? recipe.yield : 1;
            for (let i = 0; i < n; i++) p.inventory.push(recipe.output);
            this.say(`${recipe.verb || 'Crafted'} ${n > 1 ? `${n} ` : ''}${recipe.output}.`, { notice: 'item' });
            this.storyEvent({ type: 'craft', id });
            return true;
        }

        /** A plot's display name: the construction that made it (constructionDefinitions), else its id. */
        plotName(plotId) {
            const rule = (this.data.constructionDefinitions || {})[plotId];
            return (rule && rule.name) || plotId;
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
