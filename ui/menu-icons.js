/* Menu pictograms (Pixie, menu redesign 2026-11-25; docs/ui/MENU_REDESIGN.md). Original ENSO art: 16×16
 * integer-grid paths, no external images. One picture per menu tab, per gear slot and per kind of item, so the
 * bag, the gear figure, the shop and the hearth all show the same thing for the same item.
 * Decorative only: the tile or button around an icon carries the item's name. Item names never enter markup here. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) { root.ENSO = root.ENSO || {}; root.ENSO.menuIcons = api; }
}(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    const C = {
        ink: '#10151d', bone: '#e2d4af', steel: '#aabcc4', dark: '#5f6b74', gold: '#d2a463', wood: '#8a5a32',
        leather: '#6e4a30', green: '#91c5a0', leaf: '#5f9a5a', violet: '#b59cdb', red: '#dc8577', blood: '#a8483c',
        blue: '#86bed6', cream: '#f2e6c4', amber: '#e8a417', cloth: '#7d6a9a'
    };
    const p = (d, fill) => `<path fill="${fill}" d="${d}"/>`;

    const ART = {
        // ---- tabs ----
        status: p('M5 1h6v1h1v5h-1v1H5V7H4V2h1z', C.bone) + p('M6 4h1v1H6zM9 4h1v1H9z', C.ink) + p('M3 9h10v1h1v5H2v-5h1z', C.cloth) + p('M7 9h2v6H7z', C.gold),
        items: p('M5 2h6v2H5z', C.leather) + p('M3 4h10v1h1v9h-1v1H3v-1H2V5h1z', C.wood) + p('M3 6h10v1H3z', C.leather) + p('M7 7h2v2H7z', C.gold),
        equipment: p('M2 2h12v6l-1 3-5 4-5-4-1-3z', C.steel) + p('M4 4h8v4l-1 2-3 3-3-3-1-2z', C.dark) + p('M7 4h2v9H7z', C.gold),
        skillbar: p('M1 5h4v4H1zM6 5h4v4H6zM11 5h4v4h-4z', C.dark) + p('M2 6h2v2H2z', C.gold) + p('M7 6h2v2H7z', C.blue) + p('M12 6h2v2h-2z', C.violet) + p('M1 11h14v1H1z', C.bone),
        web: p('M7 1h2v14H7zM1 7h14v2H1z', C.dark) + p('M3 3l1-1 9 9 0 0-1 1z M12 2l1 1-9 9-1-1z', C.dark) + p('M6 6h4v4H6z', C.gold) + p('M1 7h2v2H1zM13 7h2v2h-2zM7 1h2v2H7zM7 13h2v2H7z', C.bone) + p('M2 2h2v2H2zM12 12h2v2h-2zM12 2h2v2h-2zM2 12h2v2H2z', C.violet),
        union: p('M2 1h1v2h1v2h1v1h6V5h1V3h1V1h1v4h-1v2h-1v6l-2 2H6l-2-2V7H3V5H2z', C.blood) + p('M6 8h1v1H6zM9 8h1v1H9z', C.amber) + p('M6 11h4v1H6z', C.ink),
        journal: p('M3 1h9v1h1v13H3z', C.leather) + p('M5 3h6v10H5z', C.cream) + p('M6 5h4v1H6zM6 7h4v1H6zM6 9h3v1H6z', C.wood) + p('M3 1h2v14H3z', C.blood),
        map: p('M1 3l4-2 6 2 4-2v12l-4 2-6-2-4 2z', C.cream) + p('M5 1h1v12H5zM10 3h1v12h-1z', C.wood) + p('M3 9h1v1H3zM4 8h2v1H4zM7 6h2v1H7zM9 5h1v1H9z', C.blood) + p('M11 4h2v2h-2z', C.blood) + p('M12 10h1v1h-1z', C.ink),
        crow: p('M4 5h5v1h2v1h3v1h-3v1h1v1H9v1H7v2H6v-2H4V9H2V8h2z', C.ink) + p('M5 6h3v2H5z', '#3a2f4a') + p('M5 6h1v1H5z', C.gold) + p('M3 6h1v1H3z', C.gold),
        cheats: p('M3 3h10v10H3z', C.bone) + p('M5 5h2v2H5zM9 9h2v2H9zM9 5h2v2H9zM5 9h2v2H5zM7 7h2v2H7z', C.ink),
        settings: p('M7 1h2v2h2l1-1 2 2-1 1v2h2v2h-2v2l1 1-2 2-1-1H9v2H7v-2H5l-1 1-2-2 1-1V9H1V7h2V5L2 4l2-2 1 1h2z', C.steel) + p('M6 6h4v4H6z', C.ink),
        save: p('M2 2h10l2 2v10H2z', C.blue) + p('M4 2h7v4H4z', C.bone) + p('M4 9h8v5H4z', C.cream) + p('M9 3h1v2H9z', C.ink),
        quit: p('M3 1h8v14H3z', C.wood) + p('M4 2h6v12H4z', C.leather) + p('M8 8h1v1H8z', C.gold) + p('M12 7h3v2h-3z', C.red),

        // ---- gear (also the empty-slot pictures, drawn dim by CSS) ----
        sword: p('M11 1h4v4l-7 7-3-3z', C.steel) + p('M12 2h2v2l-6 6-1-1z', C.bone) + p('M2 8l1-1 6 6-1 1z', C.gold) + p('M1 13h2v-1h1v1h1v1H4v1H2v-1H1z', C.wood),
        staff: p('M2 13l9-9 1 1-9 9z', C.wood) + p('M10 1h4v4h-4z', C.violet) + p('M11 2h2v2h-2z', C.bone) + p('M1 14h2v1H1z', C.gold),
        wand: p('M3 12l7-7 1 1-7 7z', C.bone) + p('M10 2h3v3h-3z', C.green) + p('M14 1h1v1h-1zM8 2h1v1H8zM13 6h1v1h-1z', C.gold),
        spear: p('M2 13l10-10 1 1-10 10z', C.wood) + p('M11 1h4v4l-2 1-3-3z', C.steel) + p('M12 2h2v2h-1z', C.bone),
        scythe: p('M4 15V5h1v10z', C.wood) + p('M2 2h9l3 2v1h-3l-3-1H5v2H4V3H2z', C.steel) + p('M5 3h6v1H5z', C.bone),
        shield: p('M2 2h12v6l-1 3-5 4-5-4-1-3z', C.wood) + p('M4 4h8v4l-1 2-3 3-3-3-1-2z', C.gold) + p('M7 3h2v11H7zM3 6h10v2H3z', C.leather),
        head: p('M4 3h8v1h1v4h1v3h-3V8h-6v3H2V8h1V4h1z', C.steel) + p('M5 4h6v2H5z', C.bone) + p('M7 1h2v2H7z', C.gold),
        bodyArmor: p('M3 2h3v1h4V2h3l2 2v4h-2v7H3V8H1V4z', C.steel) + p('M6 3h4v2H6z', C.dark) + p('M5 6h6v1H5zM5 9h6v1H5zM5 12h6v1H5z', C.dark),
        hands: p('M4 6V3h1v3h1V2h1v4h1V2h1v4h1V3h1v6l-1 3H5L4 9z', C.leather) + p('M4 12h7v3H4z', C.steel),
        feet: p('M4 1h5v9h4l2 2v3H4z', C.leather) + p('M4 13h11v2H4z', C.ink) + p('M4 4h5v1H4z', C.steel),
        accessory: p('M5 3h6v1h1v1h1v6h-1v1h-1v1H5v-1H4v-1H3V5h1V4h1z', C.gold) + p('M6 5h4v1h1v4h-1v1H6v-1H5V6h1z', C.ink) + p('M6 1h4v3H6z', C.blue) + p('M7 2h1v1H7z', C.bone),

        // ---- things in the bag ----
        heal: p('M2 5h12v6H2z', C.cream) + p('M6 5h4v6H6z', C.bone) + p('M7 6h2v4H7zM6 7h4v2H6z', C.red),
        meal: p('M5 1h1v1H5zM6 2h1v1H6zM9 1h1v1H9zM10 2h1v1h-1z', C.bone) + p('M3 5h10v1H3z', C.amber) + p('M4 5h2v1H4zM9 5h1v1H9z', C.gold) + p('M1 6h14v1H1z', C.cream) + p('M1 7h14v2H1zM2 9h12v1H2z', C.wood) + p('M3 10h10v1H3zM5 11h6v1H5z', C.leather),
        drink: p('M3 2h8v2H3z', C.cream) + p('M3 4h8v10H3z', C.amber) + p('M4 5h1v8H4z', C.gold) + p('M11 5h3v6h-3v-1h2V6h-2z', C.steel) + p('M2 4h1v10H2zM3 14h8v1H3z', C.steel),
        tonic: p('M6 1h4v2H9v3l4 5v3H3v-3l4-5V3H6z', C.steel) + p('M4 10h8v3H4z', C.violet) + p('M7 3h1v5H7z', C.bone),
        gold: p('M5 2h6v2H5z', C.leather) + p('M3 4h10v1h1v8h-1v1H3v-1H2V5h1z', C.wood) + p('M6 7h4v1h1v3h-1v1H6v-1H5V8h1z', C.gold) + p('M7 8h2v2H7z', C.amber),
        camp: p('M8 2l6 11H2z', C.leather) + p('M8 5l3 8H5z', C.ink) + p('M1 13h14v1H1z', C.wood) + p('M7 1h2v2H7z', C.red),
        quest: p('M3 2h10v1h1v11H4v-1H3z', C.cream) + p('M2 2h2v3H2zM12 13h2v2h-2z', C.wood) + p('M5 5h6v1H5zM5 7h6v1H5zM5 9h4v1H5z', C.leather) + p('M10 10h3v3h-3z', C.blood),
        key: p('M2 4h5v5H2z', C.gold) + p('M3 5h3v3H3z', C.ink) + p('M7 6h8v1H7zM12 7h1v2h-1zM14 7h1v3h-1z', C.gold),
        book: p('M2 2h12v12H2z', C.blood) + p('M4 2h1v12H4z', C.gold) + p('M7 5h5v3H7z', C.cream) + p('M8 6h3v1H8z', C.violet),
        seed: p('M6 2h4v1h1v2h1v5h-1v2h-1v1H6v-1H5v-2H4V5h1V3h1z', C.cream) + p('M7 3h2v1H7z', C.leather) + p('M8 4h1v6H8z', C.wood) + p('M6 14h4v1H6z', C.leaf),
        herb: p('M7 6h1v9H7z', C.leaf) + p('M2 3h4v1h1v3H6v1H4V7H3V5H2z', C.green) + p('M9 1h4v1h1v3h-1v1h-3V5H9z', C.green) + p('M9 7h4v1h1v2h-2v1H9z', C.leaf),
        mushroom: p('M3 3h10v1h1v3H2V4h1z', C.amber) + p('M5 4h1v1H5zM9 5h2v1H9z', C.cream) + p('M6 7h4v7H6z', C.cream) + p('M5 14h6v1H5z', C.leaf),
        meat: p('M5 2h6v1h2v2h1v5h-1v2h-2v1H5v-1H3v-2H2V5h1V3h2z', C.blood) + p('M5 4h5v1h1v4h-1v1H5V9H4V5h1z', C.red) + p('M1 12h3v3H1z', C.bone) + p('M3 11h2v2H3z', C.bone),
        grain: p('M7 3h2v12H7z', C.gold) + p('M5 2h2v2H5zM9 2h2v2H9zM4 5h3v2H4zM9 5h3v2H9zM4 8h3v2H4zM9 8h3v2H9z', C.amber) + p('M7 1h2v2H7z', C.cream),
        dairy: p('M5 1h4v2h1v1h1v10H3V4h1V3h1z', C.cream) + p('M4 7h6v4H4z', C.blue) + p('M5 1h4v1H5z', C.steel),
        egg: p('M6 2h4v1h1v2h1v6h-1v2h-1v1H6v-1H5v-2H4V5h1V3h1z', C.cream) + p('M6 4h1v2H6z', '#ffffff'),
        produce: p('M7 1h2v3H7z', C.leaf) + p('M9 2h3v1H9z', C.green) + p('M4 4h8v1h1v7h-1v1h-2v1H6v-1H4v-1H3V5h1z', C.amber) + p('M5 6h1v5H5z', C.cream),
        ore: p('M3 6h3V4h5v2h2v2h1v5H2V8h1z', C.dark) + p('M5 5h2v2H5zM9 8h3v2H9zM4 10h2v2H4z', C.steel) + p('M10 5h1v1h-1z', C.bone),
        fish: p('M2 6h2v1h2V6h5v1h2v1h1v1h-1v1h-2v1H6v-1H4v1H2V9h1V7H2z', C.blue) + p('M10 7h1v1h-1z', C.ink) + p('M6 8h3v1H6z', C.steel),
        bundle: p('M3 4h10v10H3z', C.wood) + p('M3 4h10v2H3z', C.leather) + p('M7 4h2v10H7z', C.gold),
        coin: p('M5 3h6v1h1v1h1v6h-1v1h-1v1H5v-1H4v-1H3V5h1V4h1z', C.gold) + p('M7 5h2v6H7z', C.amber)
    };

    const WEAPON = { 'one-hand': 'sword', 'two-hand': 'sword', staff: 'staff', wand: 'wand', spear: 'spear', scythe: 'scythe' };
    const USE = { heal: 'heal', meal: 'meal', drink: 'drink', tonic: 'tonic', gold: 'gold', camp: 'camp' };
    const SLOT = { mainHand: 'sword', offHand: 'shield', head: 'head', bodyArmor: 'bodyArmor', hands: 'hands', feet: 'feet', accessory: 'accessory' };
    // Raw materials by what they are called (ingredients, forage, ore). Checked in order; the first match wins.
    const MATERIAL = [
        [/seed|set$|cutting|sprout/i, 'seed'], [/mushroom|chanterelle|cep|morel|porcini|fungus/i, 'mushroom'],
        [/herb|leaf|leaves|nettle|thyme|garlic|moss|root|flower|berry|berries|juniper|lingon|hops?\b|angelica/i, 'herb'],
        [/pork|meat|beef|mutton|bacon|sausage|venison|haunch|loin|lamb|rat\b|ham\b|liver/i, 'meat'],
        [/fish|herring|cod|salmon|eel|trout|surstr/i, 'fish'],
        [/flour|wheat|barley|rye|oat|grain|malt|bread|brötchen|dough/i, 'grain'],
        [/milk|cream|butter|cheese|quark|skyr|whey/i, 'dairy'], [/egg/i, 'egg'],
        [/potato|cabbage|onion|carrot|turnip|apple|pear|beet|kale|leek|pea|bean|plum|honey/i, 'produce'],
        [/iron|metal|scrap|ore|steel|bronze|copper|ingot|slag|nail/i, 'ore']
    ];
    const UTILITY = [[/key/i, 'key'], [/book|journal|grimoire|tome|page/i, 'book'], [/lockpick/i, 'key']];

    /** Which picture an item gets: from its definition (slot, weapon type, use), then its name for raw materials. */
    function itemKind(name, def) {
        const d = def || {};
        if (d.slot === 'mainHand') return WEAPON[d.weaponType] || 'sword';
        if (d.slot && SLOT[d.slot]) return SLOT[d.slot];
        if (d.use && USE[d.use]) return USE[d.use];
        const n = String(name || '');
        if (d.type === 'utility' || d.type === 'quest') {
            for (const [re, k] of UTILITY) if (re.test(n)) return k;
            return d.type === 'quest' ? 'quest' : 'bundle';
        }
        for (const [re, k] of MATERIAL) if (re.test(n)) return k;
        if (/purse|coin/i.test(n)) return 'gold';
        return 'bundle';
    }
    function svg(kind, size) {
        const k = ART[kind] ? kind : 'bundle';
        const s = size ? ` width="${size}" height="${size}"` : '';
        return `<svg class="mi" viewBox="0 0 16 16"${s} shape-rendering="crispEdges" aria-hidden="true" focusable="false" data-icon="${k}">${ART[k]}</svg>`;
    }
    const item = (name, def, size) => svg(itemKind(name, def), size);
    const slot = (slotId, size) => svg(SLOT[slotId] || 'bundle', size);
    const tab = (tabId, size) => svg(ART[tabId] ? tabId : 'status', size);
    const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'holy'];
    /** The rarity tier a tile frame shows (CSS .r-<tier>); unknown or missing tiers read as common. */
    function rarity(def) {
        const r = def && typeof def.rarity === 'string' ? def.rarity.toLowerCase() : 'common';
        return RARITY.includes(r) ? r : 'common';
    }
    return Object.freeze({ svg, item, slot, tab, itemKind, rarity, kinds: Object.freeze(Object.keys(ART)) });
}));
