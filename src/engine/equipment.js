/* Issues #169–170: item records and equipment rules. No DOM; IDs stay strings for legacy saves. */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});
    const SLOTS = ['mainHand', 'offHand', 'bodyArmor', 'accessory'];
    const APPLIED = ['def', 'strength', 'intelligence', 'agility', 'maxHp'];
    class EquipmentMethods {
        itemDef(id) { return (this.player && this.player.itemInstances || {})[id] || this.data.itemDefinitions[id]; }
        itemDefinitions() { return { ...this.data.itemDefinitions, ...((this.player && this.player.itemInstances) || {}) }; }
        itemName(id) { return (this.itemDef(id) || {}).name || id; }
        itemDetails(id) {
            const d = this.itemDef(id);
            if (!d) return '';
            const labels = { physicalDamage: 'physical damage', magicDamage: 'magic damage', maxHp: 'Max HP', critChance: 'crit chance', def: 'DEF', intelligence: 'INT', strength: 'STR', agility: 'AGI' };
            const stats = Object.entries(d.statModifiers || {}).map(([k, n]) => `${n >= 0 ? '+' : ''}${k === 'critChance' ? `${Math.round(n * 100)}%` : n} ${labels[k] || k}`).join(', ');
            return [d.rarity, d.itemLevel ? `item level ${d.itemLevel}` : '', stats,
                (d.affixes || []).map(a => this.data.equipmentAffixes[a].name).join(', '),
                d.sellable ? `Sell: ${d.sellPrice} Gold` : 'Cannot sell', d.description].filter(Boolean).join(' · ');
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
            for (const id of Object.values(loadout || {})) for (const [stat, n] of Object.entries(this.itemDef(id)?.statModifiers || {})) sum[stat] = (sum[stat] || 0) + n;
            return sum;
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
            return { slots, modifiers: this.equipmentModifiers() };
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
            if (!type || type === 'physical') return mods.physicalDamage || 0;
            // Necrotic/poison direct spells use magical gear too; true damage and DoT ticks do not.
            if (['magic', 'fire', 'ice', 'lightning', 'radiant', 'necrotic', 'poison', 'shadow'].includes(type)) return mods.magicDamage || 0;
            return 0;
        }
    }
    (ENSO.engineModules || (ENSO.engineModules = {})).equipment = EquipmentMethods;
    if (isNode) module.exports = EquipmentMethods;
})(typeof window !== 'undefined' ? window : globalThis);
