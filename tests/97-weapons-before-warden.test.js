// Weapons before the Warden (Tokelo, 2026-11-09): players reached the Crow Warden with starter weapons, the holy weapon
// waited behind full Fallen Seraphim mastery, and the casters were drawn with a spear or a mace. Design:
// docs/design/WEAPONS_BEFORE_THE_WARDEN.md. Data: itemDefinitions, shopDefinitions.bragg; story: bragg, seraph_statue.
const { test, assert, GameEngine, data } = require('./helpers.js');

const CLASSES = ['warrior', 'rogue', 'mage', 'necromancer'];
const FORGE = { warrior: 'Tollgate Arming Sword', rogue: "Poacher's Hook-Knife", mage: 'Iron-Shod Ashwood Staff', necromancer: "Sexton's Bone Rod" };
const THANKS = { warrior: 'Sunbreak', rogue: 'Millrace Tanto', mage: 'Bell-Bronze Staff', necromancer: 'Nameless Stone' };
const HOLY = ['Emberward', 'Spear of the Altar Fire', 'Twin Pinions', 'Censer of Ash', 'Grey Feather Scythe'];

function game(cls, seed = 97) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    return g;
}
const levelTo = (g, level) => { while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true }); return g; };
const choose = (g, re) => {
    const c = g.getAvailableActions().actions.find((a) => a.type === 'dialogue_choice' && re.test(a.text));
    assert.ok(c, `no choice ${re}`);
    const r = g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
    assert.ok(r.ok, r.error && r.error.message);
};
const power = (g, id) => { const m = g.itemDef(id).statModifiers; return (m.physicalDamage || 0) + (m.magicDamage || 0); };
/** Everything a weapon gives, on one scale (a point of crit counts like a point of a stat, 5 Max HP like one). */
const worth = (g, id) => Object.entries(g.itemDef(id).statModifiers).reduce((n, [k, v]) => n + (k === 'critChance' ? v * 100 / 3 : k === 'maxHp' ? v / 5 : v), 0);

test('Weapons before the Warden: each class has a forge weapon and a thanks weapon, both better than its starter', () => {
    for (const cls of CLASSES) {
        const starter = data.starterEquipment[cls][0];
        for (const [id, level] of [[FORGE[cls], 2], [THANKS[cls], 3]]) {
            const d = data.itemDefinitions[id];
            assert.ok(d && d.type === 'weapon' && d.slot === 'mainHand', id);
            assert.deepStrictEqual(d.legalClasses, [cls], `${id} is for the ${cls}`);
            assert.strictEqual(d.requiredLevel, level, id);
            assert.ok(d.description && d.description.length > 40, `${id} has its lore line`);
            const g = game(cls);
            assert.ok(power(g, id) >= power(g, starter) && worth(g, id) > worth(g, starter) + 1, `${id} is a real step up from ${starter}`);
            assert.ok(Object.keys(d.statModifiers).length >= 2, `${id} also raises a stat`);
        }
        assert.ok(power(game(cls), THANKS[cls]) > power(game(cls), FORGE[cls]) && worth(game(cls), THANKS[cls]) > worth(game(cls), FORGE[cls]), `${THANKS[cls]} is the next step`);
        assert.ok(data.itemDefinitions[THANKS[cls]].bound && !data.itemDefinitions[THANKS[cls]].sellable, 'a gift is not for selling');
    }
    // The casters' weapons are casters' weapons.
    for (const cls of ['mage', 'necromancer']) for (const id of [data.starterEquipment[cls][0], FORGE[cls], THANKS[cls]])
        assert.ok(['staff', 'wand'].includes(data.itemDefinitions[id].weaponType), `${id}: a staff or a wand`);
});

test("Bragg's forge: he offers only your own class's weapon; it needs level 2 to wield", () => {
    for (const cls of CLASSES) {
        const g = game(cls);
        g.player.gold = 100;
        g.act({ type: 'talk', npcId: 'bragg' });
        choose(g, /What have you got/);
        const goods = g.getAvailableActions().shop.goods.map((x) => x.item);
        assert.ok(goods.includes(FORGE[cls]), `${cls} sees ${FORGE[cls]}`);
        for (const other of CLASSES.filter((c) => c !== cls)) {
            assert.ok(!goods.includes(FORGE[other]), `${cls} is not offered ${FORGE[other]}`);
            const r = g.act({ type: 'buy', shopId: 'bragg', item: FORGE[other] });
            assert.strictEqual(r.ok, false);
            assert.strictEqual(r.error.code, 'NOT_FOR_SALE');
        }
        const good = g.getAvailableActions().shop.goods.find((x) => x.item === FORGE[cls]);
        assert.ok(/damage/.test(good.description), 'the shop shows what the weapon does');
        assert.ok(g.act({ type: 'buy', shopId: 'bragg', item: FORGE[cls] }).ok);
        assert.strictEqual(g.player.gold, 100 - data.shopDefinitions.bragg.stock[FORGE[cls]].buyPrice);
        g.act({ type: 'dialogue_leave' });
        const early = g.act({ type: 'equip', item: FORGE[cls] });
        assert.strictEqual(early.ok, false);
        assert.strictEqual(early.error.code, 'EQUIP_LEVEL');
        levelTo(g, 2);
        assert.ok(g.act({ type: 'equip', item: FORGE[cls] }).ok);
        assert.strictEqual(g.player.equipment.mainHand, FORGE[cls]);
    }
});

test("Shamefield's Thanks: once the six households are helped, Bragg hands over a weapon made for your class, once", () => {
    for (const cls of CLASSES) {
        const g = game(cls);
        g.act({ type: 'talk', npcId: 'bragg' });
        assert.ok(!g.getAvailableActions().actions.some((a) => /left something with you/.test(a.text || '')), 'nothing before L01 is done');
        g.act({ type: 'dialogue_leave' });
        g.story.quests.L01.state = 'complete';
        g.act({ type: 'talk', npcId: 'bragg' });
        choose(g, /left something with you/);
        const takes = g.getAvailableActions().actions.filter((a) => a.type === 'dialogue_choice' && /^Take the/.test(a.text));
        assert.strictEqual(takes.length, 1, 'only your own class\'s weapon is on the bench');
        choose(g, /Take the/);
        assert.ok(g.player.inventory.includes(THANKS[cls]), `${cls} gets ${THANKS[cls]}`);
        for (const other of CLASSES.filter((c) => c !== cls)) assert.ok(!g.player.inventory.includes(THANKS[other]));
        g.act({ type: 'dialogue_leave' });
        g.act({ type: 'talk', npcId: 'bragg' });
        assert.ok(!g.getAvailableActions().actions.some((a) => /left something with you/.test(a.text || '')), 'paid once');
        g.act({ type: 'dialogue_leave' });
        levelTo(g, 3);
        assert.ok(g.act({ type: 'equip', item: THANKS[cls] }).ok);
    }
});

test("A caster's staff or wand powers the bolts it fires, not just the spells", () => {
    const g = game('mage');
    assert.strictEqual(g.player.equipment.mainHand, 'Wooden Staff');
    assert.strictEqual(g.equipmentDamageBonus('physical'), 1, 'the starter staff adds to the free bolt');
    levelTo(g, 3);
    g.player.inventory.push('Bell-Bronze Staff');
    assert.ok(g.act({ type: 'equip', item: 'Bell-Bronze Staff' }).ok);
    assert.strictEqual(g.equipmentDamageBonus('physical'), 3);
    assert.strictEqual(g.equipmentDamageBonus('magic'), 3);
    // A blade's physical damage is unchanged and a warrior's sword adds nothing to magic.
    const w = game('warrior');
    assert.strictEqual(w.equipmentDamageBonus('physical'), 1);
    assert.strictEqual(w.equipmentDamageBonus('magic'), 0);
});

test('The holy weapon: offered when the statue wakes, dormant until every web skill is learned, and its stats never drift', () => {
    const g = game('warrior');
    g.applyStoryEffects([{ flag: 'seraph_awakened' }]);
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    choose(g, /I will carry it/);
    choose(g, /anything to carry it in/);
    const offered = g.getAvailableActions().actions.filter((a) => a.type === 'dialogue_choice');
    assert.strictEqual(offered.length, 6, 'five weapons, or not yet');
    choose(g, /^Emberward/);
    g.act({ type: 'dialogue_leave' });
    assert.ok(g.player.inventory.includes('Emberward'));
    const str0 = g.player.strength, hp0 = g.player.maxHp;
    assert.ok(g.act({ type: 'equip', item: 'Emberward' }).ok, 'no level lock: a level 1 warrior wields it');
    const full = data.itemDefinitions.Emberward.statModifiers, dormant = data.itemDefinitions.Emberward.kindle.dormant;
    assert.strictEqual(g.equipmentDamageBonus('physical'), dormant.physicalDamage);
    assert.strictEqual(g.player.strength, str0 + dormant.strength);
    assert.ok(/Dormant/.test(g.itemDetails('Emberward')));
    // Not offered again.
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.ok(!g.getAvailableActions().actions.some((a) => /anything to carry it in/.test(a.text || '')));
    g.act({ type: 'dialogue_leave' });
    // The Six-Winged: the worn weapon wakes, and its stats are applied at once.
    g.applyStoryEffects([{ flag: 'seraph_rank_six' }]);
    assert.strictEqual(g.equipmentDamageBonus('physical'), full.physicalDamage);
    assert.strictEqual(g.player.strength, str0 + full.strength);
    assert.strictEqual(g.player.def, game('warrior').player.def - 1 + full.def, 'Emberward is two-handed: the shield came off, its DEF with it');
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.story.dialogue.node, 'six_kindle', 'Caelith wakes it instead of offering five more');
    g.act({ type: 'dialogue_leave' });
    assert.ok(g.act({ type: 'unequip', slot: 'mainHand' }).ok);
    assert.strictEqual(g.player.strength, str0, 'no stat left behind');
    assert.strictEqual(g.player.maxHp, hp0);
    for (const w of HOLY) assert.ok(data.itemDefinitions[w].kindle, `${w} wakes too`);
});

test('Caster art: staves and wands are drawn, older weapon looks keep their index, and the held weapon decides the shape', () => {
    const P = require('../assets/sprites/enso-player.js');
    global.ENSO = global.ENSO || {};
    const W = global.ENSO.spriteManifest.enso.options.weapons;
    const OLD = ['Iron', 'Bronze', 'Frost', 'Gold', 'Obsidian'].flatMap((m) => ['Sword', 'Axe', 'Mace', 'Spear'].map((t) => `${m} ${t}`));
    assert.deepStrictEqual(W.slice(0, OLD.length), OLD, 'a saved weapon index still means the same look');
    for (const n of ['Frost Staff', 'Obsidian Staff', 'Iron Wand']) assert.ok(W.includes(n), n);
    const at = (name) => W.indexOf(name);
    assert.strictEqual(P.shapeOf({ weapon: at('Frost Staff') }).weapon, 4);
    assert.strictEqual(P.shapeOf({ weapon: at('Obsidian Wand') }).weapon, 5);
    assert.strictEqual(P.shapeOf({ weapon: at('Iron Spear'), held: 'staff' }).weapon, 4, "an old mage save's spear look shows the staff in hand");
    assert.strictEqual(P.shapeOf({ weapon: at('Obsidian Mace'), held: 'wand' }).weapon, 5);
    assert.strictEqual(P.shapeOf({ weapon: at('Frost Staff'), held: 'blade' }).weapon, 0, 'a blade is never drawn as a staff');
    assert.strictEqual(P.shapeOf({ weapon: at('Gold Axe'), held: 'blade' }).weapon, 1, "a warrior's chosen blade look stays");
    assert.ok(P.paletteFor({ cosmetics: { weapon: at('Frost Staff') } }), 'the caster weapons have a metal colour');
});
