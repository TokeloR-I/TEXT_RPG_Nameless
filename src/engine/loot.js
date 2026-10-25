/* Universal victory loot (#169). Rolled claims and pending errors live in the transactional run state. */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    class LootMethods {
        storyGold(gold, key) {
            if (!Number.isSafeInteger(gold) || gold < 0 || !key) throw new Error('Invalid authored Gold reward');
            const id = `story:${key}`;
            const claims = this.stats.lootClaims || (this.stats.lootClaims = {});
            if (!claims[id]) claims[id] = { status: 'pending', result: { lootClaimId: id, gold, items: [], notes: [] } };
            this.claimLoot([id]);
        }
        weightedLoot(entries) {
            const valid = entries.filter(e => Number.isFinite(e.weight) && e.weight > 0);
            const total = valid.reduce((n, e) => n + e.weight, 0);
            if (!total) return null;
            let roll = this.rng() * total;
            for (const entry of valid) { roll -= entry.weight; if (roll < 0) return entry; }
            return valid[valid.length - 1];
        }
        rollEnemyLoot(enemy) {
            const result = { lootClaimId: enemy.lootClaimId, gold: 0, items: [], notes: [] };
            const profile = this.data.lootProfiles[enemy.lootProfile], level = enemy.lootLevel;
            if (!profile || !Number.isSafeInteger(level) || level < 1 || !['common', 'elite', 'boss'].includes(enemy.lootRank))
                throw new Error('Invalid authored loot metadata');
            const rank = enemy.lootRank;
            if (profile.gold) result.gold = Math.floor(this.randInt(3 + 2 * level, 6 + 3 * level) * ({ common: 1, elite: 2, boss: 3 }[rank]) * profile.gold);
            if (enemy.materialDrops !== false && this.rng() < profile.material) {
                const count = rank === 'boss' ? this.randInt(2, 3) : rank === 'elite' ? 2 : 1;
                const pool = profile.materials.map(([item, weight]) => ({ item, weight })).filter(e => this.data.itemDefinitions[e.item]);
                if (!pool.length) result.notes.push('No eligible material is authored for this profile.');
                for (let i = 0; i < count && pool.length; i++) result.items.push({ item: this.weightedLoot(pool).item });
            }
            const table = this.data.lootTables[enemy.lootTable];
            if (!table) throw new Error(`Unknown loot table: ${enemy.lootTable}`);
            if (rank === 'boss') {
                if (!Array.isArray(enemy.bossDrops) || enemy.bossDrops.length !== 1) throw new Error('Boss requires exactly one authored special reward');
                result.items.push({ ...enemy.bossDrops[0] });
            } else if (this.rng() < Math.min(.75, profile.equipment * (rank === 'elite' ? 1.5 : 1))) {
                const rolled = this.weightedLoot(Object.entries(this.data.equipmentRarities).map(([rarity, d]) => ({ rarity, weight: d.weight }))).rarity;
                let rarity = this.rarityForLevel(rolled, level), pool = this.equipmentPool(enemy.lootTable, level, rarity);
                // No placeholder legendary: fall back to an implemented tier and report the change.
                const tiers = Object.keys(this.data.equipmentRarities);
                while (!pool.length && tiers.indexOf(rarity) > 0) { rarity = tiers[tiers.indexOf(rarity) - 1]; pool = this.equipmentPool(enemy.lootTable, level, rarity); }
                if (!pool.length) throw new Error('Equipment roll has no eligible authored item');
                if (rarity !== this.rarityForLevel(rolled, level)) result.notes.push(`No eligible ${rolled} equipment is authored here; awarded ${rarity}.`);
                const base = this.weightedLoot(pool).itemBaseId;
                const instanceId = `${enemy.lootClaimId}:equipment`;
                const record = this.generateEquipment(base, level, rarity, instanceId);
                result.items.push({ item: `${record.name} [${instanceId}]`, record });
            }
            const consumableChance = enemy.lootProfile === 'humanoid' && rank === 'elite' ? .20 : profile.consumable;
            if (this.rng() < consumableChance) {
                const pool = (table.consumables || []).filter(e => this.data.itemDefinitions[e.item]?.use === 'heal');
                if (!pool.length) throw new Error('Consumable roll has no working authored consumable');
                result.items.push({ item: this.weightedLoot(pool).item });
            }
            return result;
        }
        /** Roll each eligible enemy's once-only claim (recorded before credit) and return the claim ids. */
        rollVictoryClaims(enemies) {
            this.stats.lootClaims = this.stats.lootClaims || {};
            const ids = [];
            for (const enemy of enemies) {
                if (!enemy.lootClaimId || !enemy.lootEligible || enemy.isMinion || enemy.summoned || enemy.isSummoned || enemy.hallucination || enemy.illusion || enemy.noLoot || enemy.erased) continue;
                const id = enemy.lootClaimId;
                if (!this.stats.lootClaims[id]) {
                    // Store a permanent error rather than silently losing malformed content or rerolling it.
                    try { this.stats.lootClaims[id] = { status: 'pending', result: this.rollEnemyLoot(enemy) }; }
                    catch (err) { this.stats.lootClaims[id] = { status: 'error', error: err.message }; }
                }
                ids.push(id);
            }
            return ids;
        }
        /** Record rolls before credit. A failed credit remains pending and can be retried without RNG. */
        awardVictoryLoot(enemies) {
            return this.claimLoot(this.rollVictoryClaims(enemies));
        }
        /**
         * Combat v3 (docs/ACTION_COMBAT.md "World drops"): roll the same claims, but leave them pending in a drop on the
         * ground at (x, y) that the player collects with act({ type: 'collect_drop', dropId }). Nothing is credited here.
         */
        dropVictoryLoot(enemies, { encounterId, mapId, x, y } = {}) {
            if (!this.world) throw new Error('dropVictoryLoot before enter_world');
            const drops = this.world.drops || (this.world.drops = []);   // created on first use, so older saves load unchanged
            const held = new Set(drops.flatMap(d => d.claimIds));
            const claims = this.stats.lootClaims || {};
            const ids = this.rollVictoryClaims(enemies).filter(id => !held.has(id) && claims[id] && claims[id].status !== 'claimed');
            const live = ids.filter(id => claims[id].status === 'error' || claims[id].result.gold > 0 || claims[id].result.items.length);
            // A claim that rolled nothing is settled at once, so it never lingers as pending.
            for (const id of ids) if (!live.includes(id)) { claims[id].status = 'claimed'; delete claims[id].error; }
            if (!live.length) return null;
            const results = live.map(id => claims[id]).filter(c => c.status !== 'error').map(c => c.result);
            const gold = results.reduce((n, r) => n + r.gold, 0);
            const items = results.flatMap(r => r.items).map(e => {
                const d = e.record || this.data.itemDefinitions[e.item] || {};
                return { item: e.item, name: d.name || e.item, rarity: d.rarity || null };
            });
            const base = `drop:${encounterId != null ? encounterId : live[0]}`;
            let id = base;
            for (let n = 2; drops.some(d => d.id === id); n++) id = `${base}:${n}`;
            const drop = { id, mapId: mapId == null ? null : String(mapId), x: Number(x) || 0, y: Number(y) || 0, claimIds: live, gold, items };
            drops.push(drop);
            const names = [...new Set(enemies.filter(e => e.lootClaimId && live.includes(e.lootClaimId)).map(e => e.name).filter(Boolean))];
            const counts = {};
            for (const e of items) counts[e.name] = (counts[e.name] || 0) + 1;
            const parts = [...(gold ? [`${gold} Gold`] : []), ...Object.entries(counts).map(([name, n]) => n > 1 ? `${n} × ${name}` : name)];
            const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] || 'something');
            const who = names.length ? `The ${names.join(' and the ')}` : 'The fallen';
            this.say(`${who} ${names.length > 1 ? 'drop' : 'drops'} ${list}.`);
            this.out.push({ type: 'world.drop', drop: JSON.parse(JSON.stringify(drop)) });
            return drop;
        }
        /** Pure: the uncollected drops on a map (copies). */
        getWorldDrops(mapId) {
            const drops = (this.world && this.world.drops) || [];
            return JSON.parse(JSON.stringify(drops.filter(d => mapId == null || d.mapId === String(mapId))));
        }
        /** act({ type: 'collect_drop', dropId }): credit a drop's claims once and remove it. A refused credit keeps it. */
        collectDrop(dropId) {
            const drops = (this.world && this.world.drops) || [];
            const index = drops.findIndex(d => d.id === String(dropId));
            if (index < 0) { this.refuse('NO_DROP', 'There is nothing here to pick up.'); return null; }
            const drop = drops[index];
            const owed = this.pendingLoot(drop.claimIds).length;
            const result = this.claimLoot(drop.claimIds);
            if (owed && !result) return null;   // refused (GOLD_OVERFLOW / INVALID_LOOT): the drop stays on the ground
            drops.splice(index, 1);
            this.out.push({ type: 'world.drop_collected', dropId: drop.id, mapId: drop.mapId });
            return result;
        }
        pendingLoot(ids = Object.keys(this.stats.lootClaims || {})) {
            return [...new Set(ids)].map(id => (this.stats.lootClaims || {})[id]).filter(c => c && c.status !== 'claimed');
        }
        lootCreditBlock(pending = this.pendingLoot()) {
            const errors = pending.filter(c => c.status === 'error');
            if (errors.length) return { code: 'INVALID_LOOT', message: `Loot retained for repair: ${errors.map(c => c.error).join('; ')}` };
            const gold = pending.reduce((n, c) => n + c.result.gold, 0);
            if (!Number.isSafeInteger(gold) || !Number.isSafeInteger(this.player.gold + gold))
                return { code: 'GOLD_OVERFLOW', message: 'Gold limit reached; loot is saved. Spend Gold, then use claim_loot.' };
            for (const entry of pending.flatMap(c => c.result.items)) if (!(entry.record || this.data.itemDefinitions[entry.item]))
                return { code: 'INVALID_LOOT', message: `Undefined loot item: ${entry.item}. Rewards remain pending.` };
            return null;
        }
        claimLoot(ids = null) {
            // claim_loot (no ids) retries stuck claims, but never reaches loot lying on the ground in the world.
            if (ids == null) {
                const held = new Set(((this.world && this.world.drops) || []).flatMap(d => d.claimIds));
                ids = Object.keys(this.stats.lootClaims || {}).filter(id => !held.has(id));
            }
            const pending = this.pendingLoot(ids);
            if (!pending.length) return null;
            const block = this.lootCreditBlock(pending);
            if (block) {
                for (const claim of pending) claim.error = block.message;
                this.refuse(block.code, block.message); return null;
            }
            const gold = pending.reduce((n, c) => n + c.result.gold, 0);
            const items = pending.flatMap(c => c.result.items);
            this.player.itemInstances = this.player.itemInstances || {};
            this.player.gold += gold;
            const awarded = [];
            for (const entry of items) {
                if (entry.storyKey && this.story?.claimed.includes(entry.storyKey)) continue;
                if (entry.storyKey && this.story) this.story.claimed.push(entry.storyKey);
                if (entry.record) this.player.itemInstances[entry.item] = entry.record;
                this.player.inventory.push(entry.item);
                awarded.push(entry.item);
            }
            for (const c of pending) { c.status = 'claimed'; delete c.error; }
            const counts = {};
            for (const id of awarded) counts[id] = (counts[id] || 0) + 1;
            const summary = Object.entries(counts).map(([id, n]) => `${n} × ${this.itemName(id)} (${this.itemDetails(id)})`);
            const notes = pending.flatMap(c => c.result.notes);
            this.say(`Loot: ${gold} Gold${summary.length ? ` · ${summary.join(' · ')}` : ''}.`, { important: true });
            for (const note of notes) this.say(note);
            this.out.push({ type: 'loot', gold, items: awarded.map(id => ({ id, name: this.itemName(id), ...this.itemDef(id) })), claims: ids });
            return { gold, items: awarded };
        }
    }
    (ENSO.engineModules || (ENSO.engineModules = {})).loot = LootMethods;
    if (isNode) module.exports = LootMethods;
})(typeof window !== 'undefined' ? window : globalThis);
