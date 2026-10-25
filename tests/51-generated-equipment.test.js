const { test, assert, newGame, GameEngine, data } = require('./helpers');
function game(cls = 'warrior', seed = 170) { return newGame(seed).do(cls); }
function store(g, base, level, rarity, id, affixes) {
    const record = g.generateEquipment(base, level, rarity, id, affixes);
    g.player.itemInstances[id] = record; g.player.inventory.push(id);
    return record;
}
test('LOOT-02: fixed-seed snapshots at levels 1, 3, 4, 7, 10, 20 have numeric stats, affixes and prices', () => {
    const samples = [];
    for (const level of [1,3,4,7,10,20]) for (const rarity of ['common','uncommon','rare','epic']) {
        const g = game('mage', 170);
        if (g.rarityForLevel(rarity, level) !== rarity) continue;
        const record = g.generateEquipment('Wooden Staff', level, rarity, `snapshot:${level}:${rarity}`);
        const h = game('mage',170);
        assert.deepStrictEqual(record, h.generateEquipment('Wooden Staff', level, rarity, `snapshot:${level}:${rarity}`));
        const rule = data.equipmentRarities[rarity];
        const expectedBase = Math.max(1, Math.floor((1 + Math.floor(level / 3)) * rule.multiplier));
        assert.strictEqual(record.statModifiers.magicDamage, expectedBase + (record.affixes.includes('arcanist') ? 1 : 0));
        assert.strictEqual(record.affixes.length, rule.affixes);
        assert.strictEqual(new Set(record.affixes).size, rule.affixes);
        const price = Math.ceil((6 + 2 * level + 3 * (1 + Math.floor(level / 3))) * rule.price);
        assert.strictEqual(record.shopPrice, price);
        assert.strictEqual(record.sellPrice, Math.floor(price / 2));
        assert.strictEqual(record.requiredLevel, level);
        samples.push([level,rarity,record.statModifiers.magicDamage]);
    }
    assert.deepStrictEqual(samples.filter(x => x[1] === 'common'), [[1,'common',1],[3,'common',2],[4,'common',2],[7,'common',3],[10,'common',4],[20,'common',7]]);
    assert.throws(() => game().generateEquipment('Rusty Sword', 1, 'rare', 'bad'), /Invalid/);
    assert.throws(() => game().generateEquipment('Rusty Sword', 20, 'legendary', 'bad'), /No functional legendary/);
});
test('LOOT-02: cautious armor scaling and fixed magnitude affixes match the candidate contract', () => {
    const g = game();
    for (const [level, common, rare, epic] of [[1,1,1,1],[10,2,2,3],[20,3,4,4]]) {
        assert.strictEqual(g.generateEquipment('Padded Jerkin',level,'common',`armor:${level}`).statModifiers.def, common);
        if (level >= 4) {
            const coat = g.generateEquipment('Padded Jerkin',level,'rare',`rare:${level}`,['stalwart','guarding']);
            assert.strictEqual(coat.statModifiers.def, rare + 1); assert.strictEqual(coat.statModifiers.maxHp,5);
        }
        assert.strictEqual(Math.floor((1 + Math.floor((level - 1) / 8)) * 1.65), epic);
    }
});
test('LOOT-02: 1000 legal generated records resolve item IDs and effect IDs without class-biased luck', () => {
    const g = game('mage', 123);
    for (let i = 0; i < 1000; i++) {
        const level = [1,3,4,7,10,20][i % 6];
        const rarity = g.rarityForLevel(['common','uncommon','rare','epic'][i % 4], level);
        const pool = g.equipmentPool('chapter1',level,rarity);
        const base = g.weightedLoot(pool).itemBaseId;
        const item = g.generateEquipment(base,level,rarity,`instance:${i}`);
        assert.ok(data.itemDefinitions[item.itemBaseId]); assert.ok(item.legalClasses.length);
        assert.ok(['mainHand','offHand','bodyArmor','accessory'].includes(item.slot));
        assert.ok(item.sellPrice < item.shopPrice);
        assert.ok(item.affixes.every(id => data.equipmentAffixes[id]));
        assert.ok(Object.values(item.statModifiers).every(Number.isFinite));
    }
    const a = game('mage',19), b = game('warrior',19);
    for (let i = 0; i < 100; i++) {
        const e = {...data.enemies.weak_goblin,lootClaimId:`equal:${i}`};
        assert.deepStrictEqual(a.rollEnemyLoot(e), b.rollEnemyLoot(e));
    }
});
test('LOOT-02: functional starters replace lower-case keepsakes exactly once at first world entry', () => {
    for (const cls of Object.keys(data.basePlayerClasses)) {
        const g = game(cls); g.act({type:'enter_world'});
        for (const id of data.starterEquipment[cls]) {
            assert.ok(Object.values(g.player.equipment).includes(id), `${cls}: ${id}`);
            assert.ok(!g.player.inventory.some(name => name.toLowerCase() === id.toLowerCase()));
        }
        const before = g.snapshot().json; g.act({type:'enter_world'});
        assert.strictEqual(g.snapshot().json,before);
    }
});
test('LOOT-02: physical and magical flat bonuses apply only to compatible direct hits', () => {
    const g = game('warrior'); g.player.level=10;
    store(g,'Rusty Sword',10,'rare','blade',['keen','brutal']);
    const before = g.player.strength;
    assert.ok(g.act({type:'equip',item:'blade'}).ok);
    assert.strictEqual(g.player.strength,before, 'damage bonus does not inflate STR');
    assert.strictEqual(g.equipmentDamageBonus('physical'),6);
    assert.strictEqual(g.equipmentDamageBonus('magic'),0);
    assert.strictEqual(g.equipmentDamageBonus('true'),0);
    const attacker = {...g.player,critChance:0,statusEffects:[]}, target = {id:'target',def:0,statusEffects:[]};
    const hit = g.newHit(target); hit.forceCrit=true;
    g.rollDamage(attacker,target,{base_damage:[1,1],damage_type:'physical'},hit);
    const expected = Math.floor((1 + Math.floor(before / data.gameRules.statDamagePer) + 6) * g.player.critMultiplier);
    assert.strictEqual(hit.damage,expected);
    const h = game('mage'); h.player.level=10;
    store(h,'Wooden Staff',10,'epic','staff',['keen','focused','arcanist']);
    assert.ok(h.act({type:'equip',item:'staff'}).ok);
    assert.strictEqual(h.equipmentDamageBonus('magic'),7);
    assert.strictEqual(h.equipmentDamageBonus('physical'),0);
});
test('LOOT-02: equip/unequip/save cycles preserve distinct instances and never heal or stack modifiers', () => {
    const g = game('warrior'); g.player.level=10;
    const base = {def:g.player.def,maxHp:g.player.maxHp,critChance:g.player.critChance};
    store(g,'Padded Jerkin',10,'rare','coat:1',['stalwart','guarding']);
    store(g,'Padded Jerkin',10,'rare','coat:2',['guarding','stalwart']);
    g.player.hp=20;
    for(let i=0;i<5;i++) {
        assert.ok(g.act({type:'equip',item:'coat:1'}).ok);
        assert.strictEqual(g.player.def,base.def+3); assert.strictEqual(g.player.maxHp,base.maxHp+5);
        assert.strictEqual(g.player.hp,20);
        assert.ok(g.act({type:'equip',item:'coat:1'}).ok);
        assert.ok(g.act({type:'unequip',slot:'bodyArmor'}).ok);
        assert.strictEqual(g.player.def,base.def); assert.strictEqual(g.player.maxHp,base.maxHp);
    }
    assert.ok(g.act({type:'equip',item:'coat:2'}).ok);
    const h=GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())));
    assert.deepStrictEqual(h.player.itemInstances,g.player.itemInstances);
    assert.deepStrictEqual(h.getEquipment(),g.getEquipment());
    assert.strictEqual(h.player.equipment.bodyArmor,'coat:2');
    assert.strictEqual(h.player.inventory.filter(i=>i==='coat:1').length,1);
});
test('LOOT-02: class/level refusals match availability, two-handed gear displaces offhand atomically', () => {
    const g=game('warrior'); g.player.level=10;
    store(g,'Wooden Staff',10,'common','wrong-class');
    const candidate=g.getEquipment().slots.mainHand.candidates.find(c=>c.item==='wrong-class');
    assert.strictEqual(candidate.enabled,false);
    assert.deepStrictEqual(g.act({type:'equip',item:'wrong-class'}).error,candidate.reason);
    const h=game('mage'); store(h,'Wooden Staff',10,'common','high-level');
    const c=h.getEquipment().slots.mainHand.candidates.find(c=>c.item==='high-level');
    assert.deepStrictEqual(h.act({type:'equip',item:'high-level'}).error,c.reason);
    // A fixture permits a shield for a caster; actual authored shields remain Warrior-only.
    const d=JSON.parse(JSON.stringify(data)); d.itemDefinitions['Wooden Shield'].legalClasses.push('mage');
    const f=new GameEngine({seed:1,data:d}); f.start(); f.input('mage');
    f.player.inventory.push('Wooden Shield','Wooden Staff');
    assert.ok(f.act({type:'equip',item:'Wooden Shield'}).ok);
    const baseDef=f.player.def-1;
    assert.ok(f.act({type:'equip',item:'Wooden Staff'}).ok);
    assert.strictEqual(f.player.equipment.offHand,null); assert.strictEqual(f.player.def,baseDef);
    assert.ok(f.player.inventory.includes('Wooden Shield'));
    assert.ok(f.act({type:'equip',item:'Wooden Shield'}).ok);
    assert.strictEqual(f.player.equipment.mainHand,null); assert.ok(f.player.inventory.includes('Wooden Staff'));
});
test('LOOT-02: generated gear sells while incompatible, quest items stay bound, no buy/sell minting', () => {
    const g=game('warrior'); g.act({type:'enter_world'});
    const record=store(g,'Wooden Staff',4,'rare','foreign-staff',['focused','arcanist']);
    assert.strictEqual(g.act({type:'sell',shopId:'mara',item:'foreign-staff'}).ok,false,'away from a merchant');
    g.act({type:'talk',npcId:'mara'});
    const choice=g.dialogueChoices().find(c=>c.text==='What have you got?');g.act({type:'dialogue_choice',choiceId:choice.choiceId});
    const before=g.player.gold;
    assert.ok(g.act({type:'sell',shopId:'mara',item:'foreign-staff'}).ok);
    assert.strictEqual(g.player.gold,before+record.sellPrice);
    assert.ok(!g.player.inventory.includes('foreign-staff'));
    g.player.inventory.push('Seal-Key of the First Echo');
    assert.strictEqual(g.act({type:'sell',shopId:'mara',item:'Seal-Key of the First Echo'}).ok,false);
    for(const shop of Object.values(data.shopDefinitions)) for(const [id,entry] of Object.entries(shop.stock)) {
        const d=data.itemDefinitions[id];if(d.sellable) assert.ok(d.sellPrice<=entry.buyPrice);
    }
});
test('LOOT-02: Keen crit chance and Focused INT work without permanent stat drift',()=>{
    const g=game('mage');g.player.level=10;
    store(g,'Wooden Staff',10,'rare','keen-staff',['keen','focused']);
    const original=g.player.intelligence;
    assert.ok(g.act({type:'equip',item:'keen-staff'}).ok);
    assert.strictEqual(g.player.intelligence,original+1);
    const target={def:0,statusEffects:[]},skill={base_damage:[10,10],damage_type:'magic'};
    g.player.critChance=.05;g.rng=()=>.06;
    assert.strictEqual(g.rollDamage(g.player,target,skill,g.newHit(target)).isCrit,true);
    assert.ok(g.act({type:'unequip',slot:'mainHand'}).ok);
    assert.strictEqual(g.player.intelligence,original);
    assert.strictEqual(g.rollDamage(g.player,target,skill,g.newHit(target)).isCrit,false);
});
test('LOOT-02: text and graphical actions share sale prices, persisted rolled items and refusals',()=>{
    const setup=()=>{
        const g=game('warrior',70);g.act({type:'enter_world'});g.player.gold=50;
        g.act({type:'talk',npcId:'mara'});
        const c=g.dialogueChoices().find(c=>c.text==='What have you got?');g.act({type:'dialogue_choice',choiceId:c.choiceId});
        store(g,'Wooden Staff',4,'rare','typed-staff',['focused','arcanist']);return g;
    };
    const a=setup(),b=setup();
    a.input('buy mara padded jerkin');b.act({type:'buy',shopId:'mara',item:'Padded Jerkin'});
    assert.strictEqual(a.snapshot().json,b.snapshot().json);
    a.input('sell mara typed-staff');b.act({type:'sell',shopId:'mara',item:'typed-staff'});
    assert.strictEqual(a.snapshot().json,b.snapshot().json);
    a.input('bye');b.act({type:'dialogue_leave'});
    a.input('equip Padded Jerkin');b.act({type:'equip',item:'Padded Jerkin'});
    assert.strictEqual(a.snapshot().json,b.snapshot().json);
});
test('LOOT-02: committed fixed-seed item snapshots remain unchanged across supported tiers',()=>{
    const snapshots=require('./fixtures/generated-equipment.json');
    for(const sample of snapshots) {
        const g=game('mage',170);
        assert.deepStrictEqual(g.generateEquipment(...sample.args),sample.expected);
    }
});
