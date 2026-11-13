/* Issues #169–170: item records and equipment rules. No DOM; IDs stay strings for legacy saves. */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    // head, hands and feet came with the armor sets (2026-11-13); reconcileSave() adds them to older saves.
    const SLOTS = ['mainHand', 'offHand', 'head', 'bodyArmor', 'hands', 'feet', 'accessory'];
    const ATTRIBUTES = ['strength', 'agility', 'intelligence'];
    const APPLIED = ['def', 'strength', 'intelligence', 'agility', 'maxHp'];
    class EquipmentMethods {
        itemDef(id) {
            const d = (this.player && this.player.itemInstances || {})[id] || this.data.itemDefinitions[id];
            // A dormant weapon (`kindle`: the Fallen Seraphim's holy weapons) has its `dormant` stats until the story flag
            // is set, then its full ones. applyStoryEffects re-applies worn gear when that flag lands.
            if (d && d.kindle && !(this.hasStoryFlag && this.hasStoryFlag(d.kindle.flag)))
                return { ...d, statModifiers: d.kindle.dormant, effectText: d.kindle.dormantText || 'Dormant: it wakes to full strength later.' };
            return d;
        }
        itemDefinitions() { return { ...this.data.itemDefinitions, ...((this.player && this.player.itemInstances) || {}) }; }
        itemName(id) { return (this.itemDef(id) || {}).name || id; }
        /** "+2 physical damage, +1 STR" */
        modifiersText(mods) {
            const labels = { physicalDamage: 'physical damage', magicDamage: 'magic damage', maxHp: 'Max HP', critChance: 'crit chance', def: 'DEF', intelligence: 'INT', strength: 'STR', agility: 'AGI' };
            return Object.entries(mods || {}).map(([k, n]) => `${n >= 0 ? '+' : ''}${k === 'critChance' ? `${Math.round(n * 100)}%` : n} ${labels[k] || k}`).join(', ');
        }
        itemDetails(id) {
            const d = this.itemDef(id);
            if (!d) return '';
            const fmt = (mods) => this.modifiersText(mods);
            const set = d.set && (this.data.armorSets || {})[d.set];
            const setText = set ? `${set.name} set (${Object.entries(set.bonuses).map(([n, mods]) => `${n} pieces: ${fmt(mods)}`).join('; ')})` : '';
            return [d.rarity, d.itemLevel ? `item level ${d.itemLevel}` : '', d.tempered ? `tempered +${d.tempered}` : '', fmt(d.statModifiers),
                (d.affixes || []).map(a => this.data.equipmentAffixes[a].name).join(', '),
                setText, d.effectText, d.sellable ? `Sell: ${d.sellPrice} Gold` : 'Cannot sell', d.description].filter(Boolean).join(' · ');
        }
        rarityForLevel(rarity, level) {
            const names = Object.keys(this.data.equipmentRarities);
            const index = names.indexOf(rarity);
            if (index < 0 || !Number.isSafeInteger(level) || level < 1) throw new Error('Invalid equipment level/rarity');
            return names.slice(0, index + 1).filter(r => this.data.equipmentRarities[r].minLevel <= level).pop();
        }
        affixPool(base) {
            return Object.entries(this.data.equipmentAffixes).filter(([, a]) => a.types.includes(base.weaponType));
        }
        equipmentPool(tableId, level, rarity) {
            const table = this.data.lootTables[tableId];
            return ((table && table.equipment) || []).filter(entry => {
                const base = this.data.itemDefinitions[entry.itemBaseId];
                if (!base || !SLOTS.includes(base.slot) || !base.legalClasses || base.requiredLevel > level ||
                    (entry.minLevel && entry.minLevel > level) || (entry.maxLevel && entry.maxLevel < level) ||
                    (entry.rarities && !entry.rarities.includes(rarity))) return false;
                if (rarity === 'legendary') return base.rarity === 'legendary' && base.uniqueEffect && this.data.equipmentUniqueEffects?.[base.uniqueEffect];
                return this.affixPool(base).length >= this.data.equipmentRarities[rarity].affixes;
            });
        }
        /** Generates a record, not an inventory mutation. Instance identity belongs to the persisted loot claim. */
        generateEquipment(itemBaseId, itemLevel, rarity, instanceId, affixIds = null) {
            const base = this.data.itemDefinitions[itemBaseId];
            if (!base || !SLOTS.includes(base.slot) || !['weapon', 'armor', 'accessory'].includes(base.type) ||
                !Array.isArray(base.legalClasses) || !base.legalClasses.length || !Number.isInteger(base.hands) || base.hands < 0 || base.hands > 2 ||
                !['one-hand', 'staff', 'wand', 'shield', 'armor', 'arcane-accessory'].includes(base.weaponType) ||
                !instanceId || this.rarityForLevel(rarity, itemLevel) !== rarity)
                throw new Error('Invalid generated equipment request');
            if (rarity === 'legendary') throw new Error('No functional legendary equipment is authored yet');
            const tier = this.data.equipmentRarities[rarity];
            const pool = this.affixPool(base).map(([id]) => id);
            if (pool.length < tier.affixes) throw new Error('Insufficient legal affix families for this equipment');
            const affixes = affixIds ? [...affixIds] : [];
            if (!affixIds) while (affixes.length < tier.affixes) affixes.push(pool.splice(this.randInt(0, pool.length - 1), 1)[0]);
            if (affixes.length !== tier.affixes || new Set(affixes.map(id => this.data.equipmentAffixes[id]?.family)).size !== affixes.length ||
                affixes.some(id => !this.affixPool(base).some(([key]) => key === id))) throw new Error('Invalid equipment affixes');
            const armor = base.type === 'armor';
            const baseStatBonus = armor ? 1 + Math.floor((itemLevel - 1) / 8) : 1 + Math.floor(itemLevel / 3);
            const statModifiers = {};
            if (armor) statModifiers.def = Math.max(1, Math.floor(baseStatBonus * tier.multiplier));
            else if (base.type === 'weapon') statModifiers[base.damageType === 'physical' ? 'physicalDamage' : 'magicDamage'] = Math.max(1, Math.floor(baseStatBonus * tier.multiplier));
            else Object.assign(statModifiers, base.statModifiers || {});
            for (const id of affixes) for (const [stat, amount] of Object.entries(this.data.equipmentAffixes[id].modifiers)) statModifiers[stat] = (statModifiers[stat] || 0) + amount;
            const shopPrice = Math.ceil((6 + 2 * itemLevel + 3 * baseStatBonus) * tier.price);
            if (!Number.isSafeInteger(shopPrice)) throw new Error('Generated item price exceeds the Gold limit');
            return { ...JSON.parse(JSON.stringify(base)), itemBaseId, itemLevel, requiredLevel: itemLevel, baseStatBonus, rank: rarity,
                rarity, affixes, statModifiers, shopPrice, sellPrice: Math.max(1, Math.floor(shopPrice / 2)),
                sellable: !base.bound, instanceId, seed: this.seed, unique: false,
                name: `${rarity[0].toUpperCase() + rarity.slice(1)} ${itemBaseId}` };
        }
        equipmentModifiers(loadout = this.player.equipment) {
            const sum = {};
            const add = (mods) => { for (const [stat, n] of Object.entries(mods || {})) sum[stat] = (sum[stat] || 0) + n; };
            for (const id of Object.values(loadout || {})) add(this.itemDef(id)?.statModifiers);
            for (const s of this.armorSetBonuses(loadout)) for (const n of s.active) add(s.bonuses[n]);
            return sum;
        }
        /** The armor sets worn in `loadout` (data `armorSets`): pieces worn and which piece-count bonuses are active.
         *  Bonuses are part of equipmentModifiers(), so equipping, the stat preview and save/load all count them. */
        armorSetBonuses(loadout = this.player && this.player.equipment) {
            const sets = this.data.armorSets || {}, worn = {};
            for (const id of new Set(Object.values(loadout || {}))) {
                const set = id && this.itemDef(id)?.set;
                if (set && sets[set]) worn[set] = (worn[set] || 0) + 1;
            }
            return Object.entries(worn).map(([id, count]) => {
                const set = sets[id], pieces = Object.values(this.data.itemDefinitions).filter((d) => d.set === id).length;
                return { id, name: set.name, count, pieces, bonuses: set.bonuses, active: Object.keys(set.bonuses).filter((n) => count >= Number(n)) };
            });
        }

        // ----- Weapon tempering (docs/design/ARMOR_AND_TEMPERING.md). A smith (smithingRules.forges) raises a main-hand
        // weapon one rank: the tempered weapon is a new item record in player.itemInstances, id "<base> [+n]" (the
        // generated-gear naming the save checks already know), so saves need no new layout.
        /** The weapon id a temper request names: the main hand first, then the bag. */
        temperTarget(name) {
            const p = this.player, main = p && p.equipment && p.equipment.mainHand, lower = String(name || '').trim().toLowerCase();
            if (!lower) return null;
            if (main && (main.toLowerCase() === lower || this.itemName(main).toLowerCase() === lower)) return main;
            return this.findInventoryItem(String(name));
        }
        temperBase(id) { const d = this.itemDef(id); return (d && d.temperBase) || id; }
        /** Pure: why `item` cannot be tempered at `shopId` now, or null. Same check for the action and the menu. */
        temperBlock(shopId, item) {
            const access = this.merchantBlock(shopId);
            if (access) return access;
            const forge = ((this.data.smithingRules || {}).forges || {})[shopId];
            if (!forge) return { code: 'NOT_A_FORGE', message: 'This merchant does not temper weapons.' };
            const p = this.player, d = item && this.itemDef(item);
            const owned = item && (p.inventory.includes(item) || (p.equipment || {}).mainHand === item);
            if (!d || !owned || d.type !== 'weapon' || d.slot !== 'mainHand') return { code: 'NOT_TEMPERABLE', message: 'Only a weapon you carry can be tempered.' };
            if (d.holy || d.kindle) return { code: 'NOT_TEMPERABLE', message: 'No smith can work holy steel. It grows with you instead.' };
            const rank = (d.tempered || 0) + 1, rules = this.data.smithingRules.temper, cost = rules.ranks[rank - 1];
            if (!cost) return { code: 'TEMPER_MAX', message: 'That weapon is tempered as far as it will go.' };
            if (rank > forge.maxRank) return { code: 'TEMPER_FORGE_MAX', message: `This forge can only temper to +${forge.maxRank}.` };
            if (p.gold < cost.gold) return { code: 'NOT_ENOUGH_GOLD', message: 'Not enough Gold.' };
            const short = Object.entries(cost.materials || {}).find(([m, n]) => p.inventory.filter((i) => i === m).length < n);
            if (short) return { code: 'TEMPER_MATERIALS', message: `Needs ${short[1]} ${short[0]}.` };
            return null;
        }
        /** The record of `item` tempered one rank higher (pure). */
        temperedRecord(item) {
            const d = this.itemDef(item), base = this.temperBase(item), baseDef = this.itemDef(base) || d;
            const rank = (d.tempered || 0) + 1, rules = this.data.smithingRules.temper;
            const mods = { ...(baseDef.statModifiers || {}) };
            const dmg = baseDef.damageType === 'magic' ? 'magicDamage' : 'physicalDamage';
            mods[dmg] = (mods[dmg] || 0) + rules.damagePerRank * rank;
            const attr = ATTRIBUTES.find((a) => (baseDef.statModifiers || {})[a]) || (dmg === 'magicDamage' ? 'intelligence' : 'strength');
            const extra = (rules.attributeRanks || []).filter((r) => r <= rank).length;
            if (extra) mods[attr] = (mods[attr] || 0) + extra;
            return { ...JSON.parse(JSON.stringify(baseDef)), name: `${baseDef.name || base} +${rank}`, statModifiers: mods, tempered: rank, temperBase: base };
        }
        /** Pure: the tempering offers at a forge, for every weapon carried or held. */
        temperOptions(shopId) {
            const forge = ((this.data.smithingRules || {}).forges || {})[shopId];
            if (!forge || !this.player) return [];
            const p = this.player, ids = [...new Set([p.equipment && p.equipment.mainHand, ...p.inventory].filter(Boolean))];
            return ids.filter((id) => { const d = this.itemDef(id); return d && d.type === 'weapon' && d.slot === 'mainHand' && !d.holy && !d.kindle; }).map((item) => {
                const d = this.itemDef(item), rank = (d.tempered || 0) + 1, cost = this.data.smithingRules.temper.ranks[rank - 1] || null;
                const reason = this.temperBlock(shopId, item);
                const next = cost ? this.temperedRecord(item) : null;
                const diff = next ? Object.fromEntries(Object.keys(next.statModifiers).map((k) => [k, next.statModifiers[k] - ((d.statModifiers || {})[k] || 0)]).filter(([, n]) => n)) : {};
                return { type: 'temper', shopId, item, name: this.itemName(item), rank, cost, diff, equipped: p.equipment.mainHand === item,
                    description: next ? `${next.name}: ${this.modifiersText(diff)}. Costs ${[`${cost.gold} Gold`, ...Object.entries(cost.materials || {}).map(([m, n]) => `${n} ${m}`)].join(', ')}.` : 'Fully tempered.',
                    enabled: !reason, ...(reason ? { reason } : {}) };
            });
        }
        temperWeapon(shopId, name) {
            const item = this.temperTarget(name), block = this.temperBlock(shopId, item);
            if (block) { this.refuse(block.code, block.message); return false; }
            const p = this.player, record = this.temperedRecord(item), cost = this.data.smithingRules.temper.ranks[record.tempered - 1];
            const id = `${record.temperBase} [+${record.tempered}]`;
            p.gold -= cost.gold;
            for (const [m, n] of Object.entries(cost.materials || {})) for (let i = 0; i < n; i++) p.inventory.splice(p.inventory.indexOf(m), 1);
            p.itemInstances = p.itemInstances || {};
            p.itemInstances[id] = record;
            if (p.equipment.mainHand === item) {
                const before = this.equipmentModifiers();
                p.equipment.mainHand = id;
                this.reapplyEquipment(before);
            } else p.inventory.splice(p.inventory.indexOf(item), 1, id);
            this.say(this.data.smithingRules.forges[shopId].line);
            this.say(`Tempered: ${record.name} (${cost.gold} Gold). ${this.itemDetails(id)}`, { important: true, notice: 'item' });
            return true;
        }
        equipmentAfter(item) {
            const def = this.itemDef(item), next = { ...this.player.equipment, [def.slot]: item };
            if (def.slot === 'mainHand' && def.hands === 2) next.offHand = null;
            if (def.slot === 'offHand' && this.itemDef(next.mainHand)?.hands === 2) next.mainHand = null;
            return next;
        }
        equipmentDiff(item) {
            const before = this.equipmentModifiers(), after = this.equipmentModifiers(this.equipmentAfter(item));
            return Object.fromEntries([...new Set([...Object.keys(before), ...Object.keys(after)])].map(stat => [stat, (after[stat] || 0) - (before[stat] || 0)]));
        }
        compareItem(name) {
            const item = this.findInventoryItem(name);
            if (!item || !this.itemDef(item)?.slot) { this.refuse('NOT_EQUIPMENT', 'Select a valid owned equipment item.'); return; }
            const diff = this.equipmentDiff(item);
            this.say(`${this.itemName(item)}: ${this.itemDetails(item)} · Change: ${JSON.stringify(diff)}`);
            return diff;
        }
        equipBlock(item) {
            const d = item && this.itemDef(item), p = this.player;
            if (!d || !SLOTS.includes(d.slot) || !p.inventory.includes(item)) return { code: 'NOT_EQUIPMENT', message: 'That item cannot be equipped.' };
            if (d.legalClasses && !d.legalClasses.includes(p.className)) return { code: 'EQUIP_CLASS', message: 'Your class cannot equip that item.' };
            if (d.requiredLevel && p.level < d.requiredLevel) return { code: 'EQUIP_LEVEL', message: `Requires level ${d.requiredLevel}.` };
            if (!Object.entries(d.requirements || {}).every(([stat, min]) => (p[stat] || 0) >= min)) return { code: 'EQUIP_REQUIREMENTS', message: 'You do not meet that item’s requirements.' };
            return null;
        }
        applyEquipmentChange(next) {
            const before = this.equipmentModifiers(), after = this.equipmentModifiers(next), p = this.player;
            for (const stat of APPLIED) p[stat] = (p[stat] || 0) + (after[stat] || 0) - (before[stat] || 0);
            p.hp = Math.min(p.hp, p.maxHp); // increasing Max HP does not provide repeatable healing
            p.equipment = next;
        }
        /** Worn gear's stats can change in place (a dormant weapon wakes): re-apply the difference from `before`. */
        reapplyEquipment(before) {
            const after = this.equipmentModifiers(), p = this.player;
            for (const stat of APPLIED) p[stat] = (p[stat] || 0) + (after[stat] || 0) - (before[stat] || 0);
            p.hp = Math.min(p.hp, p.maxHp);
        }
        equipItem(name) {
            if (Object.values(this.player.equipment || {}).includes(name)) return true;
            const item = this.findInventoryItem(name), block = this.equipBlock(item);
            if (block) { this.refuse(block.code, block.message); return false; }
            const next = this.equipmentAfter(item), p = this.player;
            p.inventory.splice(p.inventory.indexOf(item), 1);
            for (const [slot, id] of Object.entries(p.equipment)) if (id && next[slot] !== id) p.inventory.push(id);
            this.applyEquipmentChange(next);
            this.say(`Equipped ${this.itemName(item)}. ${this.itemDetails(item)}`);
            return true;
        }
        unequipItem(slot) {
            const id = this.player.equipment[slot];
            if (!id) { this.refuse('EMPTY_SLOT', 'Nothing equipped in that slot.'); return false; }
            this.applyEquipmentChange({ ...this.player.equipment, [slot]: null });
            this.player.inventory.push(id);
            this.say(`Unequipped ${this.itemName(id)}.`);
            return true;
        }
        getEquipment() {
            if (!this.player) return null;
            const slots = Object.fromEntries(SLOTS.map(slot => [slot, { item: this.player.equipment[slot] || null, candidates: [] }]));
            for (const item of new Set(this.player.inventory)) {
                const d = this.itemDef(item);
                if (!d || !slots[d.slot]) continue;
                const reason = this.equipBlock(item);
                slots[d.slot].candidates.push({ item, name: this.itemName(item), rarity: d.rarity || null,
                    description: this.itemDetails(item), diff: this.equipmentDiff(item), enabled: !reason, ...(reason ? { reason } : {}) });
            }
            return { slots, modifiers: this.equipmentModifiers(), sets: this.armorSetBonuses() };
        }
        equipStarters() {
            if (this.player.startersEquipped) return;
            this.player.startersEquipped = true;
            for (const item of this.data.starterEquipment[this.player.className] || []) {
                this.player.inventory = this.player.inventory.filter(id => id.toLowerCase() !== item.toLowerCase());
                this.player.inventory.push(item);
                this.equipItem(item);
            }
        }
        equipmentDamageBonus(type, loadout = this.player.equipment) {
            const mods = this.equipmentModifiers(loadout);
            // A caster's staff or wand puts its magic into the bolts it fires too (the free attack is physical, scaled by
            // INT): before 2026-11-09 a mage's weapon did nothing for the attack they make most (WEAPONS_BEFORE_THE_WARDEN.md).
            if (!type || type === 'physical') {
                const hand = loadout && loadout.mainHand && this.itemDef(loadout.mainHand);
                const focus = hand && hand.damageType === 'magic' ? (hand.statModifiers || {}).magicDamage || 0 : 0;
                return (mods.physicalDamage || 0) + focus;
            }
            // Necrotic/poison direct spells use magical gear too; true damage and DoT ticks do not.
            if (['magic', 'fire', 'ice', 'lightning', 'radiant', 'necrotic', 'poison', 'shadow'].includes(type)) return mods.magicDamage || 0;
            return 0;
        }
    }
    (ENSO.engineModules || (ENSO.engineModules = {})).equipment = EquipmentMethods;
    if (isNode) module.exports = EquipmentMethods;
})(typeof window !== 'undefined' ? window : globalThis);
