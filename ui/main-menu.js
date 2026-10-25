/* =========================================================================
 * Enso's Last Stand — MAIN MENU VIEW MODEL (no DOM)
 * What the main menu's Items and Equipment tabs show (Pixie, UI-3 / UI-6, docs/ui/STYLE_GUIDE.md),
 * built from the engine's own answers: getAvailableActions() for using items, getEquipment() (#118)
 * for what fits each slot, the stat change and why something can't be worn. Nothing here decides
 * whether an action is allowed. Tested in tests/40-main-menu.test.js.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const SLOTS = [
        { slot: 'mainHand', label: 'Weapon' },
        { slot: 'offHand', label: 'Offhand' },
        { slot: 'bodyArmor', label: 'Armor' },
        { slot: 'accessory', label: 'Accessory' }
    ];
    const STATS = [
        { stat: 'strength', label: 'STR' },
        { stat: 'intelligence', label: 'INT' },
        { stat: 'agility', label: 'AGI' },
        { stat: 'def', label: 'DEF' },
        { stat: 'physicalDamage', label: 'Physical dmg', optional: true },
        { stat: 'magicDamage', label: 'Magic dmg', optional: true },
        { stat: 'maxHp', label: 'Max HP', optional: true },
        { stat: 'critChance', label: 'Crit chance', optional: true }
    ];
    const statLabel = (stat) => (STATS.find((s) => s.stat === stat) || { label: stat.toUpperCase() }).label;

    /** "+1 STR · −2 DEF", or "no stat change". Zero changes are left out. */
    function diffText(diff) {
        const parts = Object.entries(diff || {}).filter(([, d]) => d).map(([stat, d]) => `${d > 0 ? '+' : '−'}${Math.abs(d)} ${statLabel(stat)}`);
        return parts.length ? parts.join(' · ') : 'no stat change';
    }

    /**
     * The Items tab: { usable, carrying }.
     *   usable   : the engine's use_item options for things that have a use (consumables), with its reason
     *              when one can't be used right now.
     *   carrying : everything else in the bag, once each with a count (equipment, materials, keys).
     * `defs` is data.itemDefinitions.
     */
    function itemsView(avail, inventory, defs) {
        const usable = [];
        const listed = new Set();
        for (const o of (avail && avail.actions) || []) {
            if (o.type !== 'use_item') continue;
            const def = defs[o.item];
            if (!def || !def.use) continue;                      // only things with a use go on the Use list
            listed.add(o.item);
            usable.push({ item: o.item, count: o.count || 1, enabled: !!o.enabled, reason: o.reason || null, description: def.description || '' });
        }
        const counts = new Map();
        for (const i of inventory || []) if (!listed.has(i)) counts.set(i, (counts.get(i) || 0) + 1);
        const carrying = [...counts].map(([item, count]) => ({ item, count, description: (defs[item] && defs[item].description) || '' }));
        return { usable, carrying };
    }

    /** The Equipment tab's slot rows from engine.getEquipment(): [{ slot, label, item, candidates }]. */
    function slotsView(equipment) {
        if (!equipment) return [];
        return SLOTS.map(({ slot, label }) => {
            const s = equipment.slots[slot] || { item: null, candidates: [] };
            return { slot, label, item: s.item, candidates: s.candidates.map((c) => ({ ...c, diffText: diffText(c.diff) })) };
        });
    }

    /** Stat rows for the comparison panel: [{ stat, label, value, delta, after }]. `diff` is a candidate's. */
    function statPreview(player, diff) {
        return STATS.filter(s => !s.optional || s.stat in player || s.stat in (diff || {})).map(({ stat, label }) => {
            const delta = (diff && diff[stat]) || 0;
            return { stat, label, value: player[stat], delta, after: player[stat] + delta };
        });
    }

    const api = { SLOTS, STATS, diffText, itemsView, slotsView, statPreview };
    ENSO.mainMenu = api;
    if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
