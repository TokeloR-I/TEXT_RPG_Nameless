const { test, assert, newGame, GameEngine, data } = require('./helpers');
const game = seed => newGame(seed).do('warrior');
const enemy = (profile = 'humanoid', level = 1, rank = 'common', id = 'fixture#0') => ({
    lootProfile: profile, lootLevel: level, lootRank: rank, lootTable: 'chapter1', lootClaimId: id, lootEligible: true
});
const chance = (count, total, expected, tolerance = .01) => assert.ok(Math.abs(count / total - expected) <= tolerance, `${count}/${total} outside ${expected} ±${tolerance}`);
function defeat(g, id, keys) {
    assert.ok(g.act({ type: 'world_encounter', encounterId: id, enemies: keys }).ok);
    const foes = [...g.combat.enemies];
    for (const e of foes) g.damage(e, e.hp, g.player);
    g.checkBattleEnd(); g.flush();
    return foes;
}
test('LOOT-01: 10,000 seeded rolls per profile obey Gold, material, gear and consumable distributions', () => {
    for (const [profile, config] of Object.entries(data.lootProfiles)) {
        const g = game(169), counts = { material: 0, equipment: 0, consumable: 0 }, n = 10000;
        let min = Infinity, max = 0, sum = 0;
        for (let i = 0; i < n; i++) {
            const drop = g.rollEnemyLoot(enemy(profile));
            min = Math.min(min, drop.gold); max = Math.max(max, drop.gold); sum += drop.gold;
            for (const e of drop.items) {
                const d = e.record || data.itemDefinitions[e.item]; assert.ok(d, e.item);
                if (d.type === 'material') counts.material++;
                if (e.record) { counts.equipment++; assert.ok(['common', 'uncommon'].includes(d.rarity)); }
                if (d.use === 'heal') counts.consumable++;
            }
        }
        if (!config.gold) assert.strictEqual(sum, 0);
        if (profile === 'humanoid') { assert.strictEqual(min, 5); assert.strictEqual(max, 9); assert.ok(Math.abs(sum / n - 7) < .05); }
        chance(counts.material, n, config.materials.length ? config.material : 0);
        chance(counts.equipment, n, config.equipment);
        chance(counts.consumable, n, config.consumable);
    }
});
test('LOOT-01: 10,000 rolls per rarity tier use capped weights, with no above-level gear', () => {
    for (const level of [1, 3, 4, 7, 10, 20]) {
        const g = game(170), counts = {}, n = 10000;
        const entries = Object.entries(data.equipmentRarities).map(([rarity, d]) => ({ rarity, weight: d.weight }));
        for (let i = 0; i < n; i++) {
            const rarity = g.rarityForLevel(g.weightedLoot(entries).rarity, level);
            assert.ok(data.equipmentRarities[rarity].minLevel <= level);
            counts[rarity] = (counts[rarity] || 0) + 1;
        }
        const expected = {};
        for (const [rarity, d] of Object.entries(data.equipmentRarities)) { const capped = g.rarityForLevel(rarity, level); expected[capped] = (expected[capped] || 0) + d.weight / 1000; }
        for (const [rarity, rate] of Object.entries(expected)) chance(counts[rarity] || 0, n, rate);
    }
});
test('LOOT-01: elites scale Gold and gear exactly once; boss guarantee is independent of optional rolls', () => {
    const g = game(43); let gear = 0, material = 0, consumable = 0;
    for (let i = 0; i < 10000; i++) {
        const d = g.rollEnemyLoot(enemy('humanoid', 2, 'elite'));
        assert.ok(d.gold >= 14 && d.gold <= 24 && d.gold % 2 === 0);
        gear += d.items.some(e => e.record);
        const mats = d.items.filter(e => data.itemDefinitions[e.item]?.type === 'material');
        if (mats.length) { material++; assert.strictEqual(mats.length, 2); }
        consumable += d.items.some(e => data.itemDefinitions[e.item]?.use === 'heal');
    }
    chance(gear, 10000, .18); chance(material, 10000, .35); chance(consumable, 10000, .20);
    const boss = g.rollEnemyLoot({ ...data.enemies.crow_touched_warden, lootClaimId: 'warden' });
    assert.strictEqual(boss.gold, 0);
    assert.deepStrictEqual(boss.items, [{ item: 'Seal-Key of the First Echo', storyKey: 'item:crow_warden_memory_key' }]);
});
test('LOOT-01: Gold formula scales with authored level rather than player level', () => {
    for (const [level, min, max] of [[1,5,9],[2,7,12],[10,23,36],[20,43,66]]) {
        const g = game(10); g.player.level = 99;
        const rolls = Array.from({ length: 1000 }, () => g.rollEnemyLoot(enemy('humanoid', level)).gold);
        assert.strictEqual(Math.min(...rolls), min); assert.strictEqual(Math.max(...rolls), max);
    }
});
test('LOOT-01: seed repeatability, victory aggregation, persistent results and ten return trips', () => {
    const g = game(96), h = game(96);
    for (let i = 0; i < 50; i++) assert.deepStrictEqual(g.rollEnemyLoot(enemy()), h.rollEnemyLoot(enemy()));
    g.act({ type: 'enter_world' });
    const foes = defeat(g, 'fixture_goblins', ['weak_goblin', 'weak_goblin']);
    assert.ok(g.player.gold >= 10 && g.player.gold <= 18);
    assert.strictEqual(Object.keys(g.stats.lootClaims).length, 2);
    for (let i = 0; i < 10; i++) {
        const before = g.snapshot();
        assert.ok(!g.act({ type: 'world_encounter', encounterId: 'fixture_goblins', enemies: ['weak_goblin','weak_goblin'] }).ok);
        assert.strictEqual(g.snapshot().json, before.json);
        const restored = GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())));
        g.restore(restored.snapshot());
        g.awardVictoryLoot(foes);
        assert.strictEqual(g.snapshot().json, before.json);
        assert.strictEqual(g.snapshot().rng, before.rng);
    }
});
test('LOOT-01: no rewards on flee, defeat, summons, hallucinations or enemy-on-enemy deaths', () => {
    const g = game(97); g.act({ type: 'enter_world' });
    g.act({ type: 'world_encounter', encounterId: 'flee', enemies: ['weak_goblin','weak_goblin'] });
    g.damage(g.combat.enemies[0], 999, g.player);
    assert.strictEqual(g.player.gold, 0);
    g.doFlee(); assert.deepStrictEqual(g.stats.lootClaims, {});
    g.act({ type: 'world_encounter', encounterId: 'defeat', enemies: ['weak_goblin'] });
    g.damage(g.combat.enemies[0], 999, g.player); g.player.hp = 0;
    g.checkBattleEnd(); assert.deepStrictEqual(g.stats.lootClaims, {});
    const h = game(98);
    h.awardVictoryLoot([
        {...enemy(),isMinion:true}, {...enemy(),summoned:true}, {...enemy(),hallucination:true}, {...enemy(),lootEligible:false}
    ]);
    assert.strictEqual(h.player.gold, 0); assert.deepStrictEqual(h.stats.lootClaims, {});
    h.startCombat(['weak_goblin','weak_goblin']);
    h.damage(h.combat.enemies[0], 999, h.combat.enemies[1]);
    h.damage(h.combat.enemies[1], 999, h.player); h.checkBattleEnd();
    assert.strictEqual(Object.keys(h.stats.lootClaims).length, 1);
});
test('LOOT-01: overflow and invalid drops retain a durable error and do not silently discard goods', () => {
    const g = game(99); g.player.gold = Number.MAX_SAFE_INTEGER;
    g.awardVictoryLoot([enemy()]);
    const pending = JSON.stringify(g.stats.lootClaims), state = g.snapshot().rng;
    assert.strictEqual(g.player.gold, Number.MAX_SAFE_INTEGER);
    const h = GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())));
    assert.strictEqual(JSON.stringify(h.stats.lootClaims), pending);
    h.claimLoot(); assert.strictEqual(h.snapshot().rng, state);
    h.player.gold = 0; assert.ok(h.act({ type:'claim_loot' }).ok);
    assert.ok(h.player.gold >= 5 && h.player.gold <= 9);
    h.stats.lootClaims.bad = { status: 'pending', result: { gold: 1, items: [{ item:'undefined reward' }], notes:[] } };
    const before = JSON.stringify(h.player); h.claimLoot(['bad']);
    assert.strictEqual(JSON.stringify(h.player), before);
    assert.match(h.stats.lootClaims.bad.error, /Undefined loot/);
    h.awardVictoryLoot([{...enemy(),lootClaimId:'bad-metadata',lootTable:'missing'}]);
    assert.strictEqual(h.stats.lootClaims['bad-metadata'].status, 'error');
});
test('LOOT-01: boss key and seal are separate; no duplicate story key or treasury', () => {
    const g = game(101); g.act({ type:'enter_world' });
    defeat(g, 'sanctuary_warden', ['crow_touched_warden']);
    assert.strictEqual(g.player.gold, 0);
    assert.strictEqual(g.player.inventory.filter(i => i === 'Seal-Key of the First Echo').length, 1);
    assert.ok(!g.hasStoryFlag('aspect_nahemoth'));
    g.storyGold(20, 'first_seal_treasury'); const before = g.player.gold;
    g.storyGold(20, 'first_seal_treasury'); assert.strictEqual(g.player.gold, before);
});
test('LOOT-01: pending loot availability reports the same error as retry without rerolling',()=>{
    const g=game(103);g.player.gold=Number.MAX_SAFE_INTEGER;g.awardVictoryLoot([enemy()]);
    const before=g.snapshot().rng,option=g.getAvailableActions().actions.find(a=>a.type==='claim_loot');
    assert.strictEqual(option.enabled,false);
    assert.deepStrictEqual(g.act({type:'claim_loot'}).error,option.reason);
    assert.strictEqual(g.snapshot().rng,before);
    g.player.gold=0;
    assert.strictEqual(g.getAvailableActions().actions.find(a=>a.type==='claim_loot').enabled,true);
});
test('LOOT-01: encounter metadata supports future region tables and persists fixed spawn levels',()=>{
    const g=game(104);g.act({type:'enter_world'});
    const result=g.act({type:'world_encounter',encounterId:'future-region:spawn1',enemies:['weak_goblin'],loot:{lootLevel:10,lootRank:'elite',lootTable:'chapter1'}});
    assert.ok(result.ok);
    const e=g.combat.enemies[0];
    assert.strictEqual(e.lootLevel,10);assert.strictEqual(e.lootRank,'elite');
    const h=GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())));
    assert.strictEqual(h.combat.enemies[0].lootLevel,10);
    assert.strictEqual(h.combat.enemies[0].lootClaimId,'world:future-region:spawn1#0');
});
test('LOOT-01: ten Black Flight return trips and reloads preserve claimed Gold and rolled item identities',()=>{
    const g=game(105);g.act({type:'enter_world'});
    const foes=defeat(g,'flight-encounter',['weak_goblin','weak_goblin']);
    g.story.flags.push('aspect_nahemoth','anchor:homestead','anchor:shamefield');
    const original={gold:g.player.gold,items:[...g.player.inventory],claims:JSON.stringify(g.stats.lootClaims),rng:g.snapshot().rng};
    for(let i=0;i<10;i++) {
        assert.ok(g.act({type:'black_flight',anchorId:i%2?'homestead':'shamefield'}).ok);
        const h=GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())));g.restore(h.snapshot());
        g.awardVictoryLoot(foes);
        assert.strictEqual(g.player.gold,original.gold);
        assert.deepStrictEqual(g.player.inventory,original.items);
        assert.strictEqual(JSON.stringify(g.stats.lootClaims),original.claims);
        assert.strictEqual(g.snapshot().rng,original.rng);
    }
});
