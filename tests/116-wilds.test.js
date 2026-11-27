// A world that refills, elites and loot worth chasing (Tokelo approved pick 2 of
// docs/design/GAME_EXPERIENCE_RESEARCH_ROUND2_2026-11-25.md): src/engine/wilds.js, src/engine/affixes.js, the sim's
// drops and decoy (src/action/sim.js), and save format 5.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const ZONE1 = require('../src/world/zone1.js');

const copy = (mutate) => { const d = JSON.parse(JSON.stringify(data)); if (mutate) mutate(d); return d; };
function actionGame(cls = 'warrior', { seed = 116, mutate = null } = {}) {
    const g = new GameEngine({ seed, combatMode: 'action', data: copy(mutate) });
    g.start();
    g.input(cls);
    assert.ok(g.act({ type: 'enter_world' }).ok);
    g.flush();
    return g;
}
const AT = { mapId: 'grounds', x: 80, y: 240 };
const rats = (g) => g.actionEngage('grounds_weed_rats', ['rust_rat', 'rust_rat'], null, AT);
const hit = (g, id) => { const c = g.actionCast('attack'); assert.ok(c.ok, JSON.stringify(c.error)); const r = g.actionResolve(c.castId, [id]); g.tick(400); return r; };
const killAll = (g) => {
    for (let i = 0; i < 200 && g.mode === 'combat'; i++) {
        const e = g.combat.enemies.find((x) => x.hp > 0);
        if (!e) break;
        e.hp = 1;
        hit(g, e.id);
    }
};
const beat = (g, id = 'grounds_weed_rats', keys = ['rust_rat', 'rust_rat']) => { assert.ok(g.actionEngage(id, keys, null, AT).ok); killAll(g); assert.ok(g.isDefeated(id), `${id} beaten`); };
/** Wear a made-up charm with these affixes in `slot`. */
const wear = (g, affixes, slot = 'accessory') => {
    const id = `Test ${affixes.join('-')}`;
    g.player.itemInstances = g.player.itemInstances || {};
    g.player.itemInstances[id] = { name: id, type: 'accessory', slot, affixes, statModifiers: {} };
    g.player.equipment[slot] = id;
    return id;
};
const bossKeys = new Set(Object.keys(data.actionRules.bosses || {}));
const isBoss = (enc) => enc.enemies.some((k, i) => {
    const l = Array.isArray(enc.loot) ? enc.loot[i] : enc.loot;
    return (l && l.lootRank === 'boss') || (data.enemies[k] || {}).lootRank === 'boss' || bossKeys.has(k);
});

// ---------------------------------------------------------------- rest respawns
test('Wilds: restRespawns is every ordinary group on the maps (no `when`, no boss, no respawn: false), and nothing else', () => {
    const want = [];
    for (const map of Object.values(ZONE1.maps)) for (const enc of map.encounters || [])
        if (!enc.when && !isBoss(enc) && enc.respawn !== false) want.push(enc.id);
    assert.deepStrictEqual([...data.gameRules.restRespawns].sort(), want.sort(),
        'a new ordinary group goes in gameRules.restRespawns, or gets respawn: false on the map');
    assert.ok(want.length >= 14, `${want.length} groups refill`);
});

test('Wilds: a rest brings back every listed beaten group with a new life (fresh loot claims); story fights stay beaten', () => {
    const g = actionGame('warrior', { mutate: (d) => { d.eliteRules.chance = 0; } });
    beat(g);
    const first = Object.keys(g.stats.lootClaims).filter((k) => k.startsWith('world:grounds_weed_rats'));
    assert.deepStrictEqual(first.sort(), ['world:grounds_weed_rats#0', 'world:grounds_weed_rats#1']);
    g.world.defeated.push('tollway_strongbox_looters', 'sanctuary_warden');
    assert.ok(g.restAtHome());
    assert.ok(!g.isDefeated('grounds_weed_rats'), 'the rats are back');
    assert.ok(g.isDefeated('tollway_strongbox_looters') && g.isDefeated('sanctuary_warden'), 'story fights and bosses stay beaten');
    assert.strictEqual(g.world.respawns.grounds_weed_rats, 1);
    const ev = g.flush().find((e) => e.type === 'world.wilds_return');
    assert.deepStrictEqual(ev.ids, ['grounds_weed_rats']);
    assert.ok(rats(g).ok);
    assert.deepStrictEqual(g.combat.enemies.map((e) => e.lootClaimId), ['world:grounds_weed_rats@1#0', 'world:grounds_weed_rats@1#1']);
    killAll(g);
    assert.ok(g.isDefeated('grounds_weed_rats'));
    assert.ok(Object.keys(g.stats.lootClaims).some((k) => k.startsWith('world:grounds_weed_rats@1#')), 'the second life rolled its own loot');
});

test('Wilds: a hearth offers a rest by the fire, which refills the wild like the bed; anywhere else it is refused', () => {
    const g = actionGame('warrior', { mutate: (d) => { d.eliteRules.chance = 0; } });
    beat(g);
    assert.strictEqual(g.act({ type: 'rest_by_fire' }).error.code, 'UNKNOWN_ACTION', 'not a thing you do in the open');
    assert.ok(g.act({ type: 'talk', npcId: 'lane_hearth' }).ok);
    const avail = g.getAvailableActions();
    assert.ok(avail.kitchen, 'the cooking menu is open');
    assert.ok(avail.actions.some((a) => a.type === 'rest_by_fire' && a.enabled));
    g.player.hp = 1;
    const r = g.act({ type: 'rest_by_fire' });
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.strictEqual(g.player.hp, g.player.maxHp);
    assert.ok(!g.isDefeated('grounds_weed_rats'));
    assert.ok(r.events.some((e) => e.type === 'world.wilds_return'));
    assert.ok(g.act({ type: 'dialogue_leave' }).ok);
    assert.ok(g.act({ type: 'talk', npcId: 'lane_hearth' }).ok);
    assert.ok(g.getAvailableActions().actions.some((a) => a.type === 'rest_by_fire'), 'and again');
    assert.strictEqual(g.restByFireBlock(), null);
    g.act({ type: 'dialogue_leave' });
    assert.strictEqual(g.restByFireBlock().code, 'NO_FIRE');
});

// ---------------------------------------------------------------- elites
test('Elites: a rest may roll an elite; its leader gets the modifier, a coloured name, more HP and XP, and elite loot', () => {
    const g = actionGame('warrior', { mutate: (d) => { d.eliteRules.chance = 1; } });
    beat(g);
    g.restAtHome();
    const mod = g.world.elites.grounds_weed_rats;
    assert.ok(data.eliteRules.modifiers[mod], `rolled ${mod}`);
    assert.strictEqual(g.eliteOf('grounds_weed_rats').name, data.eliteRules.modifiers[mod].name);
    assert.ok(rats(g).ok);
    const [lead, other] = g.combat.enemies;
    const def = data.eliteRules.modifiers[mod];
    assert.strictEqual(lead.name, `${def.name} Rust Rat`);
    assert.strictEqual(lead.maxHp, Math.round(data.enemies.rust_rat.maxHp * data.eliteRules.hpMult));
    assert.strictEqual(lead.lootRank, 'elite');
    assert.strictEqual(lead.xp, Math.round(data.enemies.rust_rat.xp * data.eliteRules.xpMult));
    assert.ok(!other.elite && other.name === 'Rust Rat', 'only the leader');
    const view = g.actionView().enemies.find((e) => e.id === lead.id);
    assert.deepStrictEqual([view.elite.name, view.elite.color], [def.name, def.color]);
    killAll(g);
    assert.strictEqual(g.world.elites.grounds_weed_rats, undefined, 'the elite is gone with its group');
});

test('Elites: the leader is the member with the most HP (the Hungry Wolf leads his pack)', () => {
    const g = actionGame();
    assert.strictEqual(g.eliteIndex(['pack_wolf', 'hungry_wolf', 'pack_wolf']), 1);
    assert.strictEqual(g.eliteIndex(['rust_rat', 'rust_rat']), 0);
});

const eliteFight = (mod, cls = 'warrior') => {
    const g = actionGame(cls);
    g.world.elites.grounds_weed_rats = mod;
    assert.ok(rats(g).ok);
    return g;
};
test('Elites: Frenzied hits harder and moves faster; Venomous blows poison', () => {
    const f = eliteFight('frenzied');
    assert.strictEqual(f.combat.enemies[0].eliteDamageMult, data.eliteRules.modifiers.frenzied.damageMult);
    assert.ok(Math.abs(f.actionView().enemies[0].speedMult - data.eliteRules.modifiers.frenzied.speedMult) < 1e-9);
    const v = eliteFight('venomous');
    assert.ok(v.combat.enemies[0].skills.every((s) => s.effects.some((x) => x.type === 'inflict' && x.status === 'Poison')));
    assert.ok(v.combat.enemies[1].skills.every((s) => !(s.effects || []).some((x) => x.status === 'Poison' && x.chance === 0.6)), 'the others are plain');
});

test('Elites: Shielded takes a third less from the same blow; Thorned cuts you back', () => {
    const plain = actionGame('warrior', { seed: 5 }), shield = actionGame('warrior', { seed: 5 });
    shield.world.elites.grounds_weed_rats = 'shielded';
    rats(plain); rats(shield);
    for (const g of [plain, shield]) { g.combat.enemies[0].hp = g.combat.enemies[0].maxHp = 500; }
    hit(plain, 'enemy_0'); hit(shield, 'enemy_0');
    const lost = (g) => 500 - g.combat.enemies[0].hp;
    assert.ok(lost(plain) > 0 && lost(shield) < lost(plain), `shielded ${lost(shield)} < plain ${lost(plain)}`);
    const t = eliteFight('thorned');
    t.combat.enemies[0].hp = t.combat.enemies[0].maxHp = 500;
    t.flush();
    const hp = t.player.hp;
    const r = hit(t, 'enemy_0');
    assert.ok(t.player.hp < hp, 'the thorns hurt');
    assert.ok(r.events.some((e) => e.type === 'text' && /Thorns!/.test(e.text)));
});

// ---------------------------------------------------------------- affixes
const NEW_AFFIXES = ['hale', 'mighty', 'nimble', 'sage', 'honed', 'warded', 'steady', 'kindling', 'serrated', 'venom_etched', 'rimebound',
    'forked', 'leeching', 'echoing', 'frugal', 'headsmans', 'opportunists', 'tricksters'];
test('Affixes: 18 new affixes, 11 that change how a skill plays; each is legal, has its own family and a known proc', () => {
    const A = data.equipmentAffixes;
    for (const id of NEW_AFFIXES) assert.ok(A[id], `${id} defined`);
    assert.strictEqual(NEW_AFFIXES.length, 18);
    const procs = NEW_AFFIXES.filter((id) => A[id].proc);
    assert.strictEqual(procs.length, 11);
    const families = Object.values(A).map((a) => a.family);
    assert.strictEqual(new Set(families).size, families.length, 'one family per affix');
    const TYPES = ['one-hand', 'staff', 'wand', 'shield', 'armor', 'arcane-accessory'];
    const ON = ['hit', 'basic_hit', 'spell_hit', 'skill_hit', 'crit', 'damage', 'cast', 'dodge'];
    for (const [id, a] of Object.entries(A)) {
        assert.ok(a.types.length && a.types.every((t) => TYPES.includes(t)), `${id} types`);
        if (!a.proc) continue;
        assert.ok(ON.includes(a.proc.on), `${id} fires on ${a.proc.on}`);
        assert.ok(a.text, `${id} says what it does`);
        if (a.proc.inflict) assert.ok(['Bleed', 'Poison', 'Burn', 'Slow'].includes(a.proc.inflict.status), `${id} inflicts a known condition`);
    }
});

test('Affixes: a generated item with a skill-changing affix is named for it and says what it does', () => {
    const g = actionGame('mage');
    const rec = g.generateEquipment('Wooden Staff', 1, 'uncommon', 'test:1', ['kindling']);
    assert.strictEqual(rec.name, 'Uncommon Kindling Wooden Staff');
    g.player.itemInstances[rec.name] = rec;
    assert.ok(/Kindling: Your spells can set what they hit Burning/.test(g.itemDetails(rec.name)));
    const plain = g.generateEquipment('Wooden Staff', 4, 'rare', 'test:2', ['sage', 'keen']);
    assert.strictEqual(plain.name, 'Rare Wooden Staff');
    assert.strictEqual(plain.statModifiers.intelligence, 2);
});

test('Affixes: Serrated basic attacks make foes bleed, Leeching ones heal you', () => {
    const g = actionGame('warrior', { mutate: (d) => { d.equipmentAffixes.serrated.proc.chance = 1; } });
    wear(g, ['serrated', 'leeching']);
    rats(g);
    g.combat.enemies[0].hp = g.combat.enemies[0].maxHp = 500;
    g.player.hp = 10;
    const r = hit(g, 'enemy_0');
    assert.ok(g.combat.enemies[0].statusEffects.some((s) => s.name === 'Bleed'), 'it bleeds');
    assert.ok(g.player.hp >= 12 || r.events.some((e) => e.type === 'text' && /Leeching: you take back 2 HP/.test(e.text)));
});

test('Affixes: Kindling spells set foes Burning and Forked spells arc to a second foe; a basic swing does neither', () => {
    const g = actionGame('mage', { mutate: (d) => { d.equipmentAffixes.kindling.proc.chance = 1; } });
    wear(g, ['kindling', 'forked'], 'mainHand');
    rats(g);
    for (const e of g.combat.enemies) e.hp = e.maxHp = 500;
    hit(g, 'enemy_0');
    assert.ok(!g.combat.enemies[0].statusEffects.some((s) => s.name === 'Burn'), 'a staff swing is not a spell');
    const spell = g.player.skills.find((s) => { const d = g.playerSkill(s); return d.base_damage && (d.target || 'enemy_single') === 'enemy_single' && data.gameRules.magicTypes.includes(d.damage_type); });
    assert.ok(spell, 'the mage knows a single-target spell');
    g.player.resource.current = g.player.resource.max;
    g.combat.rt.gcdUntil = 0; g.combat.rt.cooldowns = {};
    const c = g.actionCast(spell);
    assert.ok(c.ok, JSON.stringify(c.error));
    const r = c.resolved ? c : g.actionResolve(c.castId, ['enemy_0']);
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.ok(g.combat.enemies[0].statusEffects.some((s) => s.name === 'Burn'), `${spell} set it burning`);
    assert.ok(g.combat.enemies[1].hp < 500, `${spell} arced on to the second rat`);
});

test('Affixes: Frugal hands a skill\'s cost back and Echoing resets its cooldown', () => {
    const g = actionGame('warrior', { mutate: (d) => { d.equipmentAffixes.frugal.proc.chance = 1; d.equipmentAffixes.echoing.proc.chance = 1; } });
    wear(g, ['frugal', 'echoing']);
    rats(g);
    for (const e of g.combat.enemies) e.hp = e.maxHp = 500;
    const skill = g.player.skills.find((s) => { const d = g.playerSkill(s); return d.base_damage && g.skillCost(d) > 0 && g.skillCost(d) <= g.player.resource.max; });
    assert.ok(skill, 'a skill with a cost');
    g.player.resource.current = g.player.resource.max;
    const before = g.player.resource.current;
    const c = g.actionCast(skill);
    assert.ok(c.ok, JSON.stringify(c.error));
    if (!c.resolved) assert.ok(g.actionResolve(c.castId, ['enemy_0']).ok);
    assert.strictEqual(g.player.resource.current, before, 'it cost nothing');
    const cd = g.combat.rt.cooldowns[skill];
    assert.ok(!cd || cd.readyAt <= g.combat.rt.now, 'its cooldown reset');
});

test("Affixes: Headsman's and Opportunist's add damage only against the foes they name", () => {
    const g = actionGame();
    wear(g, ['headsmans', 'opportunists']);
    const foe = { hp: 100, maxHp: 100, statusEffects: [] };
    assert.strictEqual(g.gearDamageMult(g.player, foe), 1);
    foe.hp = 20;
    assert.strictEqual(g.gearDamageMult(g.player, foe), 1.25);
    foe.hp = 100; foe.statusEffects = [{ type: 'dot', name: 'Bleed' }];
    assert.strictEqual(g.gearDamageMult(g.player, foe), 1.2);
    assert.strictEqual(g.gearDamageMult(foe, g.player), 1, 'never on blows against you');
});

// ---------------------------------------------------------------- saves
test('Saves: format 5 keeps lives and elites; a format-4 save gets empty ones and still refills on a rest', () => {
    const g = actionGame();
    beat(g);
    g.restAtHome();
    g.world.elites.grounds_weed_rats = 'thorned';
    const save = g.serialize();
    assert.strictEqual(save.formatVersion, 5);
    const back = GameEngine.fromSave(save, { combatMode: 'action' });
    assert.deepStrictEqual([back.world.respawns, back.world.elites], [{ grounds_weed_rats: 1 }, { grounds_weed_rats: 'thorned' }]);
    const old = JSON.parse(JSON.stringify(save));
    old.formatVersion = 4;
    delete old.state.world.respawns; delete old.state.world.elites;
    old.state.world.defeated.push('road_wolf');
    const loaded = GameEngine.fromSave(old, { combatMode: 'action' });
    assert.deepStrictEqual([loaded.world.respawns, loaded.world.elites], [{}, {}]);
    loaded.restAtHome();
    assert.ok(!loaded.isDefeated('road_wolf'));
});

// ---------------------------------------------------------------- the sim: drops pop out, decoys
const WORLD = doubleWorld(ZONE1);
function simAt(g, mapId, tx, ty) {
    const s = new WorldSession(WORLD, { engine: g });
    const map = WORLD.maps[mapId];
    s.place(mapId, Object.keys(map.spawns)[0]);
    s.x = tx; s.y = ty;
    return new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 116 });
}
test('Sim: loot pops out where the last enemy fell (not at the group home), and lands before it can be picked up', () => {
    const g = actionGame();
    const sim = simAt(g, 'grounds', 30, 30);
    const g0 = sim.groups.grounds_weed_rats;
    assert.ok(g0, 'the rats are on the map');
    sim.engageGroup(g0);
    const [a, b] = sim.actors.filter((x) => x.encounterId === 'grounds_weed_rats');
    a.x += 40; b.x += 40; a.y += 8;
    for (const e of g.combat.enemies) e.hp = 1;
    g.combat.enemies[0].hp = 0;
    sim.kill(a);
    a.deadAt = sim.now;
    const fakeDrop = { id: 'drop:test', mapId: 'grounds', x: g0.home.x, y: g0.home.y, claimIds: ['world:grounds_weed_rats#0'], gold: 3, items: [] };
    g.world.drops = [fakeDrop];
    sim.popDrop(fakeDrop);
    const d = g.getWorldDrops('grounds')[0];
    assert.ok(Math.abs(d.x - b.x) <= 7 && Math.abs(d.y - b.y) <= 5, `lands by the last one standing (${d.x},${d.y} vs ${Math.round(b.x)},${Math.round(b.y)})`);
    assert.ok(sim.fx.some((f) => f.type === 'loot_pop' && f.x === d.x && f.y === d.y));
    assert.ok(sim.dropReadyAt['drop:test'] > sim.now, 'not collectable mid-hop');
});

test("Sim: Trickster's dodge leaves a decoy the nearby foes go for, until it fades", () => {
    const g = actionGame();
    wear(g, ['tricksters'], 'bodyArmor');
    const sim = simAt(g, 'grounds', 30, 30);
    sim.engageGroup(sim.groups.grounds_weed_rats);
    sim.engaged = true;
    const p = sim.player;
    p.stamina = 100; p.dodgeReadyAt = 0;
    const [x0, y0] = [p.x, p.y];
    sim.update(1000 / 60, { dodge: true, move: { x: 1, y: 0 } });
    assert.ok(sim.decoy, 'a decoy is left behind');
    assert.ok(Math.abs(sim.decoy.x - x0) < 4 && Math.abs(sim.decoy.y - y0) < 4);
    const rat = sim.actors.find((x) => x.encounterId === 'grounds_weed_rats');
    rat.x = sim.decoy.x + 20; rat.y = sim.decoy.y;
    assert.strictEqual(sim.foeOf(rat), sim.decoy);
    assert.ok(sim.view().decoy);
    sim.now = sim.decoy.until + 1;
    assert.strictEqual(sim.foeOf(rat), sim.player, 'it fades');
});

test('Sim: a rest by a fire on the same map stands a beaten group up again, elite mark and all', () => {
    const g = actionGame('warrior', { mutate: (d) => { d.eliteRules.chance = 1; } });
    const sim = simAt(g, 'grounds', 30, 30);
    sim.groupCleared('grounds_weed_rats');
    g.world.defeated.push('grounds_weed_rats');
    sim.syncEncounters();
    assert.ok(sim.groups.grounds_weed_rats.cleared, 'still beaten before the rest');
    g.restAtHome();
    sim.syncEncounters();
    const back = sim.groups.grounds_weed_rats;
    assert.ok(back && !back.cleared && back.life === 1, 'back for a new life');
    const lead = sim.actors.find((a) => a.encounterId === 'grounds_weed_rats' && a.elite);
    assert.ok(lead && !lead.dead, 'its elite shows before the fight');
    assert.strictEqual(sim.view().actors.find((a) => a.sid === lead.sid).elite.name, g.eliteOf('grounds_weed_rats').name);
});
