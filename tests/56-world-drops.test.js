// Combat v3 world drops (docs/ACTION_COMBAT.md "World drops"): victory loot lands on the ground as a drop with
// pending once-only claims; collect_drop credits it once, in explore or mid-fight, and it survives save/load.
const { test, assert, newGame, GameEngine } = require('./helpers');
const foe = (id, extra = {}) => ({ name: 'Rust Rat', lootProfile: 'humanoid', lootLevel: 1, lootRank: 'common', lootTable: 'chapter1', lootClaimId: id, lootEligible: true, ...extra });
function worldGame(seed = 56) {
    const g = newGame(seed).do('warrior');
    assert.ok(g.act({ type: 'enter_world' }).ok);
    g.flush();
    return g;
}
const at = { encounterId: 'grounds_weed_rats', mapId: 'grounds', x: 12, y: 7 };
const roundTrip = (g) => GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())));

test('Drops: dropVictoryLoot records a drop with pending claims and credits nothing', () => {
    const g = worldGame(), gold = g.player.gold, inv = g.player.inventory.length;
    const drop = g.dropVictoryLoot([foe('w#0'), foe('w#1')], at);
    const events = g.flush();
    assert.strictEqual(drop.id, 'drop:grounds_weed_rats');
    assert.deepStrictEqual([drop.mapId, drop.x, drop.y, drop.claimIds], ['grounds', 12, 7, ['w#0', 'w#1']]);
    assert.ok(drop.gold >= 10 && drop.gold <= 18, `humanoid gold ${drop.gold}`);
    for (const e of drop.items) assert.ok(e.item && e.name && 'rarity' in e);
    assert.strictEqual(g.player.gold, gold);
    assert.strictEqual(g.player.inventory.length, inv);
    assert.deepStrictEqual(g.pendingLoot(drop.claimIds).map(c => c.status), ['pending', 'pending']);
    const ev = events.find(e => e.type === 'world.drop');
    assert.deepStrictEqual(ev.drop, drop);
    assert.ok(events.some(e => e.type === 'text' && /^The Rust Rat drops \d+ Gold/.test(e.text)));
    assert.deepStrictEqual(g.getWorldDrops('grounds'), [drop]);
    assert.deepStrictEqual(g.getWorldDrops('road'), []);
    g.getWorldDrops('grounds')[0].gold = 999999;   // copies: callers can't edit the run
    assert.strictEqual(g.world.drops[0].gold, drop.gold);
});

test('Drops: collect credits once, removes the drop, and a second collect is refused (NO_DROP)', () => {
    const g = worldGame(), gold = g.player.gold;
    const drop = g.dropVictoryLoot([foe('c#0')], at);
    const r = g.act({ type: 'collect_drop', dropId: drop.id });
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.strictEqual(g.player.gold, gold + drop.gold);
    for (const e of drop.items) assert.ok(g.player.inventory.includes(e.item));
    assert.ok(r.events.some(e => e.type === 'loot' && e.gold === drop.gold));
    assert.deepStrictEqual(g.getWorldDrops('grounds'), []);
    const again = g.act({ type: 'collect_drop', dropId: drop.id });
    assert.strictEqual(again.error.code, 'NO_DROP');
    assert.strictEqual(g.act({ type: 'collect_drop', dropId: 'drop:nope' }).error.code, 'NO_DROP');
    assert.strictEqual(g.player.gold, gold + drop.gold);
    // Rolling the same enemies again never makes a second drop or rerolls the claim.
    assert.strictEqual(g.dropVictoryLoot([foe('c#0')], at), null);
    assert.deepStrictEqual(g.world.drops, []);
});

test('Drops: claim_loot never reaches loot on the ground; a refused credit keeps the drop', () => {
    const g = worldGame();
    const drop = g.dropVictoryLoot([foe('o#0')], at);
    g.act({ type: 'claim_loot' });
    assert.strictEqual(g.player.gold, 0);
    assert.strictEqual(g.pendingLoot(drop.claimIds).length, 1);
    g.player.gold = Number.MAX_SAFE_INTEGER;
    assert.strictEqual(g.act({ type: 'collect_drop', dropId: drop.id }).error.code, 'GOLD_OVERFLOW');
    assert.strictEqual(g.getWorldDrops('grounds').length, 1);
    g.player.gold = 0;
    assert.ok(g.act({ type: 'collect_drop', dropId: drop.id }).ok);
    assert.strictEqual(g.player.gold, drop.gold);
});

test('Drops: nothing is recorded when nothing would drop; drop ids stay unique', () => {
    const g = worldGame();
    assert.strictEqual(g.dropVictoryLoot([foe('m#0', { isMinion: true }), foe('m#1', { lootEligible: false })], at), null);
    assert.strictEqual(g.dropVictoryLoot([], at), null);
    assert.deepStrictEqual(g.world.drops || [], []);
    assert.ok(!g.flush().some(e => e.type === 'world.drop'));
    const a = g.dropVictoryLoot([foe('u#0')], at), b = g.dropVictoryLoot([foe('u#1')], at);
    assert.deepStrictEqual([a.id, b.id], ['drop:grounds_weed_rats', 'drop:grounds_weed_rats:2']);
});

test('Drops: a drop survives a save/load round trip and is still collected exactly once', () => {
    const g = worldGame();
    const drop = g.dropVictoryLoot([foe('s#0'), foe('s#1')], at);
    const copy = roundTrip(g);
    assert.deepStrictEqual(copy.getWorldDrops('grounds'), [drop]);
    assert.ok(copy.act({ type: 'collect_drop', dropId: drop.id }).ok);
    assert.strictEqual(copy.player.gold, drop.gold);
    const later = roundTrip(copy);
    assert.deepStrictEqual(later.getWorldDrops('grounds'), []);
    assert.strictEqual(later.act({ type: 'collect_drop', dropId: drop.id }).error.code, 'NO_DROP');
    assert.strictEqual(later.player.gold, drop.gold);
});

test('Drops: old saves without world.drops load and play fine', () => {
    const g = worldGame();
    const save = JSON.parse(JSON.stringify(g.serialize()));
    delete save.state.world.drops;
    const old = GameEngine.fromSave(save);
    assert.deepStrictEqual(old.getWorldDrops('grounds'), []);
    assert.strictEqual(old.act({ type: 'collect_drop', dropId: 'drop:x' }).error.code, 'NO_DROP');
    assert.ok(old.dropVictoryLoot([foe('old#0')], at));
});

test('Drops: collect_drop works mid-fight (engine.mode === "combat")', () => {
    const g = worldGame();
    const drop = g.dropVictoryLoot([foe('f#0')], at);
    assert.ok(g.act({ type: 'world_encounter', encounterId: 'second_group', enemies: ['weak_goblin'] }).ok);
    assert.strictEqual(g.mode, 'combat');
    const r = g.act({ type: 'collect_drop', dropId: drop.id });
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.strictEqual(g.mode, 'combat');
    assert.strictEqual(g.player.gold, drop.gold);
    assert.deepStrictEqual(g.getWorldDrops('grounds'), []);
});

test('Drops: the turn-based victory still credits loot at once (awardVictoryLoot unchanged)', () => {
    const g = worldGame(96);
    assert.ok(g.act({ type: 'world_encounter', encounterId: 'fixture_goblins', enemies: ['weak_goblin', 'weak_goblin'] }).ok);
    for (const e of [...g.combat.enemies]) g.damage(e, e.hp, g.player);
    g.checkBattleEnd(); g.flush();
    assert.ok(g.player.gold >= 10 && g.player.gold <= 18);
    assert.ok(Object.values(g.stats.lootClaims).every(c => c.status === 'claimed'));
    assert.ok(!g.world.drops, 'the turn-based path never creates world drops');
    // Same RNG stream as before the refactor: rolling claims then crediting is one awardVictoryLoot.
    const a = worldGame(7), b = worldGame(7);
    a.awardVictoryLoot([foe('r#0'), foe('r#1')]);
    b.claimLoot(b.rollVictoryClaims([foe('r#0'), foe('r#1')]));
    assert.strictEqual(a.player.gold, b.player.gold);
    assert.strictEqual(a.snapshot().rng, b.snapshot().rng);
});
