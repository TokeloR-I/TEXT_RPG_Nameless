// Armor sets and weapon tempering (Tokelo, 2026-11-13: "New weapons upgrade also we are missing armor sets").
// Design: docs/design/ARMOR_AND_TEMPERING.md. Data: itemDefinitions (`set`), armorSets, smithingRules, shopDefinitions
// bragg/bjorn. Engine: src/engine/equipment.js (armorSetBonuses, temper*).
const { test, assert, GameEngine, data } = require('./helpers.js');

const CLASSES = ['warrior', 'rogue', 'mage', 'necromancer'];
const SLOTS = ['head', 'bodyArmor', 'hands', 'feet'];

function game(cls, seed = 104) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    return g;
}
// Only the level requirement matters here; levelling for real would stop at the specialization choice.
const levelTo = (g, level) => { g.player.level = level; return g; };
const choose = (g, re) => {
    const c = g.getAvailableActions().actions.find((a) => a.type === 'dialogue_choice' && re.test(a.text));
    assert.ok(c, `no choice ${re}`);
    const r = g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
    assert.ok(r.ok, r.error && r.error.message);
};
const openShop = (g, npc) => { g.act({ type: 'talk', npcId: npc }); choose(g, /What have you got/); return g.getAvailableActions().shop; };
const setPieces = (set) => Object.entries(data.itemDefinitions).filter(([, d]) => d.set === set).map(([id]) => id);
const setFor = (cls, chapter) => Object.keys(data.armorSets).find((id) => data.armorSets[id].chapter === chapter && data.itemDefinitions[setPieces(id)[0]].legalClasses.includes(cls));

test('Armor sets: every class has a four-piece set in each chapter, one piece per new slot, with lore', () => {
    for (const cls of CLASSES) for (const chapter of [1, 2]) {
        const set = setFor(cls, chapter);
        assert.ok(set, `${cls} has a chapter ${chapter} set`);
        const pieces = setPieces(set);
        assert.deepStrictEqual(pieces.map((id) => data.itemDefinitions[id].slot).sort(), [...SLOTS].sort(), `${set}: head, body, hands, feet`);
        for (const id of pieces) {
            const d = data.itemDefinitions[id];
            assert.deepStrictEqual(d.legalClasses, [cls], id);
            assert.strictEqual(d.type, 'armor');
            assert.ok(d.description.length > 40 && d.description.split(/[.!?](\s|$)/).length <= 7, `${id} has a short lore line`);
            assert.ok(Object.keys(d.statModifiers).length >= 1);
            if (chapter === 2) assert.ok(!/\b(gate|threshold|door)s?\b/i.test(d.description), `${id}: chapter 2 lore guardrail`);
        }
        assert.ok(data.armorSets[set].bonuses[2] && data.armorSets[set].bonuses[4], `${set} has 2- and 4-piece bonuses`);
    }
});

test('Armor sets: the smith lists only your class\'s pieces, which fill the new slots and add the set bonus', () => {
    for (const cls of CLASSES) {
        const g = levelTo(game(cls), 2);
        g.player.gold = 500;
        const set = setFor(cls, 1), pieces = setPieces(set);
        const goods = openShop(g, 'bragg').goods.map((x) => x.item);
        for (const id of pieces) assert.ok(goods.includes(id), `${cls} sees ${id}`);
        for (const other of CLASSES.filter((c) => c !== cls)) for (const id of setPieces(setFor(other, 1))) assert.ok(!goods.includes(id), `${cls} is not offered ${id}`);
        const before = { def: g.player.def, maxHp: g.player.maxHp };
        for (const id of pieces) assert.ok(g.act({ type: 'buy', shopId: 'bragg', item: id }).ok);
        g.act({ type: 'dialogue_leave' });
        let sum = {};
        for (const [n, id] of pieces.entries()) {
            assert.ok(g.act({ type: 'equip', item: id }).ok, id);
            const worn = g.armorSetBonuses().find((s) => s.id === set);
            assert.strictEqual(worn.count, n + 1);
            assert.deepStrictEqual(worn.active, Object.keys(data.armorSets[set].bonuses).filter((k) => n + 1 >= Number(k)));
        }
        for (const id of pieces) for (const [k, v] of Object.entries(data.itemDefinitions[id].statModifiers)) sum[k] = (sum[k] || 0) + v;
        for (const mods of Object.values(data.armorSets[set].bonuses)) for (const [k, v] of Object.entries(mods)) sum[k] = (sum[k] || 0) + v;
        assert.strictEqual(g.player.def - before.def, sum.def || 0, `${cls}: DEF from pieces and bonuses`);
        assert.strictEqual(g.player.maxHp - before.maxHp, sum.maxHp || 0, `${cls}: Max HP from pieces and bonuses`);
        // Taking a piece off drops the 4-piece bonus and gives back exactly what it gave.
        const head = pieces.find((id) => data.itemDefinitions[id].slot === 'head');
        assert.ok(g.act({ type: 'unequip', slot: 'head' }).ok);
        assert.deepStrictEqual(g.armorSetBonuses().find((s) => s.id === set).active, ['2']);
        assert.ok(g.act({ type: 'equip', item: head }).ok);
        assert.strictEqual(g.player.def - before.def, sum.def || 0, 'round trip leaves no drift');
        assert.ok(/set \(2 pieces/.test(g.itemDetails(head)), 'the item line names its set bonuses');
    }
});

test('Armor sets: Bjorn sells the chapter 2 sets once his forge is open; they are a step above Bragg\'s', () => {
    const worth = (id) => Object.entries(data.itemDefinitions[id].statModifiers).reduce((n, [k, v]) => n + (k === 'critChance' ? v * 100 / 2 : k === 'maxHp' ? v / 5 : v), 0);
    for (const cls of CLASSES) {
        const g = levelTo(game(cls), 5);
        g.player.gold = 500;
        g.story.flags.push('jarnmyr_forge_open');
        const goods = openShop(g, 'bjorn').goods;
        for (const id of setPieces(setFor(cls, 2))) assert.ok(goods.find((x) => x.item === id && x.enabled), `${cls} can buy ${id}`);
        assert.ok(goods.find((x) => x.item === 'Bog Iron'), 'Bjorn sells bog iron');
        const total = (chapter) => setPieces(setFor(cls, chapter)).reduce((n, id) => n + worth(id), 0);
        assert.ok(total(2) > total(1) * 1.5, `${cls}: chapter 2 set is a real step up`);
    }
});

test('Tempering: Bragg tempers to +2 with scrap metal, Bjorn on to +5 with bog iron; holy weapons cannot be tempered', () => {
    const g = levelTo(game('warrior'), 3);
    g.player.gold = 1000;
    g.player.inventory.push('Sunbreak', 'Scrap Metal', 'Scrap Metal');
    // Not at a smith: refused with the merchant code.
    let r = g.act({ type: 'temper', shopId: 'bragg', item: 'Sunbreak' });
    assert.strictEqual(r.error.code, 'NOT_AT_MERCHANT');
    let shop = openShop(g, 'bragg');
    const offer = (item) => g.getAvailableActions().shop.tempering.find((t) => t.item === item);
    assert.ok(offer('Sunbreak').enabled && offer('Sunbreak').rank === 1);
    assert.ok(shop.tempering.find((t) => t.equipped), 'the weapon in hand is offered too');
    r = g.act({ type: 'temper', shopId: 'bragg', item: 'Sunbreak' });
    assert.ok(r.ok, r.error && r.error.message);
    assert.ok(g.player.inventory.includes('Sunbreak [+1]') && !g.player.inventory.includes('Sunbreak'));
    assert.strictEqual(g.itemName('Sunbreak [+1]'), 'Sunbreak +1');
    assert.strictEqual(g.itemDef('Sunbreak [+1]').statModifiers.physicalDamage, data.itemDefinitions.Sunbreak.statModifiers.physicalDamage + 1);
    assert.ok(!g.player.inventory.includes('Scrap Metal'), 'materials are used up');
    // +2 needs four scrap metal: the menu and the action give the same refusal.
    const blocked = offer('Sunbreak [+1]');
    assert.ok(!blocked.enabled);
    r = g.act({ type: 'temper', shopId: 'bragg', item: 'Sunbreak [+1]' });
    assert.strictEqual(r.error.code, blocked.reason.code);
    assert.strictEqual(r.error.message, blocked.reason.message);
    g.player.inventory.push('Scrap Metal', 'Scrap Metal', 'Scrap Metal', 'Scrap Metal');
    assert.ok(g.act({ type: 'temper', shopId: 'bragg', item: 'Sunbreak +1' }).ok, 'by its shown name too');
    const plus2 = g.itemDef('Sunbreak [+2]').statModifiers;
    assert.strictEqual(plus2.strength, data.itemDefinitions.Sunbreak.statModifiers.strength + 1, 'rank 2 also adds the main attribute');
    // Bragg stops at +2.
    g.player.inventory.push('Bog Iron', 'Bog Iron');
    r = g.act({ type: 'temper', shopId: 'bragg', item: 'Sunbreak [+2]' });
    assert.strictEqual(r.error.code, 'TEMPER_FORGE_MAX');
    g.act({ type: 'dialogue_leave' });
    // Bjorn takes it to +5. Equip it first: tempering the weapon in hand changes your stats in place.
    r = g.act({ type: 'equip', item: 'Sunbreak [+2]' }); assert.ok(r.ok, r.error && r.error.message);
    g.story.flags.push('jarnmyr_forge_open');
    openShop(g, 'bjorn');
    for (let i = 0; i < 10; i++) g.player.inventory.push('Bog Iron');
    for (const rank of [3, 4, 5]) {
        const str = g.player.strength;
        r = g.act({ type: 'temper', shopId: 'bjorn', item: g.player.equipment.mainHand });
        assert.ok(r.ok, r.error && r.error.message);
        assert.strictEqual(g.player.equipment.mainHand, `Sunbreak [+${rank}]`);
        assert.strictEqual(g.player.strength - str, rank === 4 ? 1 : 0, `rank ${rank}: worn stats follow`);
    }
    const plus5 = g.itemDef('Sunbreak [+5]');
    assert.strictEqual(plus5.statModifiers.physicalDamage, data.itemDefinitions.Sunbreak.statModifiers.physicalDamage + 5);
    assert.ok(plus5.bound && !plus5.sellable, 'a gift stays a gift');
    r = g.act({ type: 'temper', shopId: 'bjorn', item: 'Sunbreak [+5]' });
    assert.strictEqual(r.error.code, 'TEMPER_MAX');
    // Holy steel grows with the web, not at the anvil.
    g.player.inventory.push('Emberward');
    r = g.act({ type: 'temper', shopId: 'bjorn', item: 'Emberward' });
    assert.strictEqual(r.error.code, 'NOT_TEMPERABLE');
    assert.ok(!g.getAvailableActions().shop.tempering.some((t) => t.item === 'Emberward'));
});

test('Tempering: a merchant without a forge cannot temper; the text command works at the smith', () => {
    const g = levelTo(game('mage'), 2);
    g.player.gold = 100;
    g.player.inventory.push('Scrap Metal', 'Scrap Metal');
    openShop(g, 'mara');
    assert.strictEqual(g.act({ type: 'temper', shopId: 'mara', item: 'Wooden Staff' }).error.code, 'NOT_A_FORGE');
    g.act({ type: 'dialogue_leave' });
    openShop(g, 'bragg');
    g.input('temper bragg wooden staff');
    assert.strictEqual(g.player.equipment.mainHand, 'Wooden Staff [+1]');
    assert.strictEqual(g.itemDef('Wooden Staff [+1]').statModifiers.magicDamage, 2, 'a staff tempers its magic damage');
});

test('Saves: armor slots are added to older saves, and set bonuses and tempered weapons survive save and load', () => {
    const g = levelTo(game('rogue'), 5);
    g.player.gold = 1000;
    const pieces = setPieces(setFor('rogue', 2));
    g.story.flags.push('jarnmyr_forge_open');
    openShop(g, 'bjorn');
    for (const id of pieces) assert.ok(g.act({ type: 'buy', shopId: 'bjorn', item: id }).ok);
    for (let i = 0; i < 6; i++) g.player.inventory.push('Scrap Metal');
    assert.ok(g.act({ type: 'temper', shopId: 'bjorn', item: g.player.equipment.mainHand }).ok);
    g.act({ type: 'dialogue_leave' });
    for (const id of pieces) assert.ok(g.act({ type: 'equip', item: id }).ok);
    const stats = ['def', 'agility', 'maxHp', 'strength'].map((k) => g.player[k]);
    const save = g.serialize();
    const back = GameEngine.fromSave(JSON.parse(JSON.stringify(save)), { combatMode: 'action' });
    assert.deepStrictEqual(['def', 'agility', 'maxHp', 'strength'].map((k) => back.player[k]), stats);
    assert.deepStrictEqual(back.equipmentModifiers(), g.equipmentModifiers());
    assert.strictEqual(back.itemName(back.player.equipment.mainHand), 'Short Sword +1');
    assert.deepStrictEqual(back.saveAhead(save), [], 'a tempered weapon is not mistaken for newer content');

    // A save from before the armor slots existed: the slots are filled in on load, nothing else moves.
    const old = JSON.parse(JSON.stringify(game('warrior').serialize()));
    for (const slot of ['head', 'hands', 'feet']) delete old.state.player.equipment[slot];
    const loaded = GameEngine.fromSave(old, { combatMode: 'action' });
    for (const slot of ['head', 'hands', 'feet']) assert.strictEqual(loaded.player.equipment[slot], null, `${slot} slot added`);
    assert.strictEqual(loaded.player.equipment.mainHand, 'Rusty Sword');
});
