// Rogue ninja rework (Tokelo 2026-11-02, docs/design/ROGUE_NINJA_KIT.md): every path runs on Energy; Evasion is a
// window; Shadow Clone and the Assassin's shadow creatures are timed bodies that draw attacks; Smoke Bomb blinds
// (and the miss shows); the Saboteur's bombs burst where they land and its caltrops are real charges on the ground.
// Checked in the world sim (action fights) where it matters.
const { test, assert, newGame, assertHealthy } = require('./helpers.js');
const { GameEngine } = require('../src/engine.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;

/** A rogue in a branch at `xp`, in the Grounds beside the rats (made tough so fights last). */
function rogue(branch = 'assassin', xp = 99999, seed = 93) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('rogue'); g.input(`add_xp ${xp}`); g.input(branch);
    g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    s.x = 13; s.y = 31;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    return { g, s, sim };
}
const frames = (sim, n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(STEP, input)); return out; };
const texts = (outs) => outs.flatMap((o) => o.engineEvents).map((e) => e.text || '').filter(Boolean);
const fxOf = (outs, type) => outs.flatMap((o) => o.fx).filter((f) => f.type === type);
const rats = (sim) => sim.actors.filter((a) => a.encounterId === 'grounds_weed_rats' && !a.dead);
function fight(r, hp = 500, dx = 30) {
    r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
    const p = r.sim.player;
    rats(r.sim).forEach((a, i) => { a.x = p.x + dx + i * 6; a.y = p.y + (i % 2 ? 6 : -6); a.foe = null; });
    for (const e of r.g.combat.enemies) { e.hp = e.maxHp = hp; }
    return r;
}
function cast(r, name, n = 90) {
    const p = r.g.player;
    if (!p.skills.includes(name)) p.skills.push(name);
    p.skillBar = [name]; p.skillBarSeen = [...p.skills];
    p.resource.current = p.resource.max;
    const t = rats(r.sim)[0];
    const aim = t ? { x: t.x, y: t.y } : { x: r.sim.player.x + 30, y: r.sim.player.y };
    return frames(r.sim, 1, { slot: 0, aim }).concat(frames(r.sim, n, { aim }));
}

test('Ninja kit: the base rogue throws shuriken, dashes, evades and splits a shadow clone; Smoke Bomb replaces Second Wind', () => {
    const g = newGame().do('rogue');
    assert.deepStrictEqual(g.player.skills, ['Shuriken Volley', 'Quick Slash', 'Evasion', 'Shadow Clone']);
    const web = g.getSkillWeb();
    assert.ok(web.nodes.some((n) => n.id === 'rogue.smoke_bomb' && n.skill === 'Smoke Bomb'));
    assert.ok(!web.nodes.some((n) => n.skill === 'Second Wind'), 'Second Wind is gone from the web');
    for (const [br, skills] of Object.entries({
        assassin: ['Shadow Hounds', 'Shadowstep', 'Shadow Serpent', 'Assassinate', 'Shade Legion'],
        duelist: ['Iaido Draw', 'Blade Focus', 'Riposte', 'Thousand Cuts', 'Blade Storm'],
        saboteur: ['Fire Bomb', 'Explosive Caltrops', 'Poison Flask', 'Thunder Charge', 'Cataclysm Barrage']
    })) {
        assert.deepStrictEqual(g.data.evolutionPaths.rogue.branches[br].stages.map((s) => s.skill), skills, br);
        for (const s of skills) assert.ok(g.isCastable(g.data.skillDefinitions[s]), `${s} is built`);
    }
    assert.ok(!g.data.evolutionPaths.rogue.branches.duelist.stages.some((s) => s.name === 'Swashbuckler'));
});

test('Evasion: every attack while it lasts rolls to miss (not one charge); turn fights get 2 turns of it', () => {
    const g = newGame().do('rogue', 'engage');
    g.player.hp = g.player.maxHp = 9999;
    const e = g.combat.enemies[0];
    g.castSkill(g.player, g.data.skillDefinitions.Evasion, [g.player]);
    const dodge = g.statusOfType(g.player, 'dodge');
    assert.ok(dodge && dodge.persistent);
    g.rng = () => 0;
    for (let i = 0; i < 3; i++) assert.strictEqual(g.hitConnects(e, g.player), false, `attack ${i + 1} misses`);
    assert.ok(g.statusOfType(g.player, 'dodge'), 'still up after three attacks');
});

test('Evasion in a live fight: 6 s, the miss shows as EVADE and the rogue does not flinch; Shadow Veil makes it 65% and pays Energy', () => {
    const r = fight(rogue('assassin', 250));
    const out = cast(r, 'Evasion', 5);
    const ev = r.g.findStatus(r.g.player, 'Evasion');
    assert.ok(ev, 'Evasion is up');
    assert.strictEqual(ev.value, 0.65, 'Shadow Veil: 65%');
    assert.ok(Math.abs(ev.rtTotalMs - 6000) < 1, 'lasts 6 s');
    r.g.rng = () => 0;   // every roll evades
    const hp = r.g.player.hp;
    r.g.player.resource.current = 0;
    const later = frames(r.sim, 240, {});
    assert.strictEqual(r.g.player.hp, hp, 'nothing landed');
    assert.ok(fxOf(later, 'evade').length >= 1, 'EVADE shows');
    assert.ok(texts(later).some((t) => /Shadow Veil: \+1 Energy/.test(t)));
    assert.ok(!fxOf(later, 'player_hit').length);
    assert.ok(out);
    assertHealthy(r.g);
});

test('Smoke Bomb: enemies in the smoke are blinded for 4 s at 50%; a blinded swing shows MISS; Toxic Smoke poisons', () => {
    const r = fight(rogue('saboteur'), 500, 20);
    cast(r, 'Smoke Bomb', 12);
    const blinded = r.g.combat.enemies.filter((e) => r.g.statusOfType(e, 'blind'));
    assert.ok(blinded.length >= 1, 'at least one rat in the smoke');
    const b = r.g.statusOfType(blinded[0], 'blind');
    assert.strictEqual(b.value, 0.5);
    assert.ok(Math.abs(b.rtTotalMs - 4000) < 1, '4 s');
    assert.ok(r.g.findStatus(blinded[0], 'Poison'), 'Smoke Phantom (level 8+): Toxic Smoke poisons');
    r.g.rng = () => 0;
    const later = frames(r.sim, 200, {});
    assert.ok(fxOf(later, 'evade').some((f) => f.why === 'blind'), 'MISS shows');
});

test('Shadow Clone: a timed body that fights and draws attacks, then melts away; it never follows you out of the fight', () => {
    const r = fight(rogue('assassin', 250));
    const out = cast(r, 'Shadow Clone', 30);
    const clone = r.g.combat.minions.find((m) => m.summonType === 'shadow_clone');
    assert.ok(clone && clone.timed, 'a timed clone');
    assert.ok(r.sim.minions.some((m) => m.key === 'shadow_clone'), 'it has a body in the world');
    assert.ok(texts(out).some((t) => /Shadow Clone rises out of your shadow/.test(t)));
    const later = frames(r.sim, 60 * 11, {});
    assert.ok(texts(later).some((t) => /Shadow Cut/.test(t)), 'it fought');
    assert.ok(!r.g.alive(r.g.combat.minions).some((m) => m.summonType === 'shadow_clone'), 'gone after 10 s');
    assert.ok(texts(later).some((t) => /melts back into the shadows/.test(t)));
    // A fresh clone does not follow you out of the fight.
    cast(r, 'Shadow Clone', 20);
    r.g.actionKeepFollowers(r.g.combat);
    assert.ok(!(r.g.world.followers || []).some((m) => m.summonType === 'shadow_clone'));
    assertHealthy(r.g);
});

test('Shadow Hounds: two hounds for 15 s (20 s with Long Shadows); out of a fight they refuse instead of following', () => {
    const r = fight(rogue('assassin'));
    cast(r, 'Shadow Hounds', 10);
    const hounds = r.g.alive(r.g.combat.minions).filter((m) => m.summonType === 'shadow_hound');
    assert.strictEqual(hounds.length, 2);
    assert.ok(r.g.hasTrait('Long Shadows'));
    const life = r.g.findStatus(hounds[0], 'Shadow-bound');
    assert.ok(Math.abs(life.rtTotalMs - 20000) < 1, '15 s + 5 s');
    // Out of a fight: not a follower summon (the sim shows "only works in a fight"), and the engine refuses it too.
    const calm = rogue('assassin', 250);
    const pre = calm.g.actionSkillPreview('Shadow Hounds');
    assert.ok(pre.ok && pre.shape.shape === 'summon' && !pre.summon);
    assert.ok(!calm.g.actionSummonFollower('Shadow Hounds').ok);
    assert.ok(!(calm.g.world.followers || []).length);
});

test('Shade Legion: hounds up to the minion limit plus a Shadow Stag, 20 s each', () => {
    const r = fight(rogue('assassin'));
    cast(r, 'Shade Legion', 20);
    const live = r.g.alive(r.g.combat.minions);
    assert.ok(live.some((m) => m.summonType === 'shadow_stag'));
    assert.strictEqual(live.filter((m) => m.summonType === 'shadow_hound').length, r.g.minionCap());
    assert.ok(Math.abs(r.g.findStatus(live[0], 'Shadow-bound').rtTotalMs - 25000) < 1, '20 s + Long Shadows');
});

test('Assassinate never kills a boss outright: a healthy Crow Warden at 19% HP takes a doubled cut and lives', () => {
    const g = newGame().do('rogue', 'add_xp 99999', 'assassin');
    g.startCombat(['crow_touched_warden']);
    const w = g.combat.enemies[0];
    w.hp = w.maxHp = 1000; w.hp = 190;
    g.player.resource.current = 20;
    g.rng = () => 0.5;
    g.castSkill(g.player, g.data.skillDefinitions.Assassinate, [w]);
    assert.ok(w.hp > 0 && w.hp < 190, `still alive at ${w.hp}`);
});

test('Ronin: Blade Focus is +30% damage and 20% haste for 10 s; Crimson Edge crits bleed; Masterless +15%', () => {
    const r = fight(rogue('duelist'));
    cast(r, 'Blade Focus', 5);
    const focus = r.g.findStatus(r.g.player, 'Blade Focus');
    assert.ok(focus && focus.type === 'damage_boost' && focus.value === 0.3);
    assert.ok(Math.abs(focus.rtTotalMs - 10000) < 1);
    assert.ok(Math.abs(r.g.rtHasteMult(r.g.player) - 0.8) < 1e-9, 'swings and cooldowns 20% faster');
    const g = newGame().do('rogue', 'add_xp 99999', 'duelist', 'engage');
    const e = g.combat.enemies[0];
    e.hp = e.maxHp = 9999; e.def = 0;
    g.rng = () => 0;   // a crit
    g.castSkill(g.player, g.data.skillDefinitions['Iaido Draw'], [e]);
    assert.ok(g.findStatus(e, 'Bleed'), 'Crimson Edge');
    assert.strictEqual(g.ninjaTraitMods(null).damageMult, 1.15);
    assert.strictEqual(g.ninjaTraitMods(null).critChance, 0.1, 'Keen Edge');
});

test('Fire Bomb bursts on the first rat it hits and catches everyone in 32 px; Shrapnel makes them bleed', () => {
    const r = fight(rogue('saboteur', 250), 500, 60);
    const out = cast(r, 'Fire Bomb', 60);
    const hit = r.g.combat.enemies.filter((e) => e.hp < 500);
    assert.ok(hit.length >= 2, `the blast caught ${hit.length}`);
    assert.ok(fxOf(out, 'aoe').some((f) => f.radius === 32 && f.damageType === 'fire'));
    assert.ok(hit.every((e) => r.g.findStatus(e, 'Bleed')), 'Shrapnel');
});

test('Explosive Caltrops: charges wait on the ground and blow up under the first enemy to step close (damage + Bleed)', () => {
    const r = fight(rogue('saboteur', 2000), 500, 140);   // level 8: Mad Chemist
    for (const a of rats(r.sim)) { a.prof = { ...a.prof, speed: 0 }; }
    const p = r.g.player;
    p.skills.push('Explosive Caltrops');
    p.skillBar = ['Explosive Caltrops']; p.skillBarSeen = [...p.skills];
    p.resource.current = p.resource.max;
    const spot = { x: r.sim.player.x + 60, y: r.sim.player.y };
    frames(r.sim, 1, { slot: 0, aim: spot });
    frames(r.sim, 30, { aim: spot });
    assert.strictEqual(r.sim.mines.length, 3, 'three charges');
    assert.ok(r.sim.view().mines.every((m) => m.armed));
    assert.ok(r.g.combat.enemies.every((e) => e.hp === 500), 'nothing blew yet');
    const rat = rats(r.sim)[0];
    rat.x = spot.x; rat.y = spot.y;
    const out = frames(r.sim, 2, {});
    assert.ok(texts(out).some((t) => /spiked charge explodes/.test(t)));
    const e = r.g.combat.enemies.find((x) => x.id === rat.engineId);
    assert.ok(e.hp < 500 && r.g.findStatus(e, 'Bleed'));
    assert.ok(r.sim.mines.length < 3, 'that charge is spent');
    assertHealthy(r.g);
});

test('Explosive Caltrops in a turn fight: the charges wait as traps and blow up on the next enemies to act', () => {
    const g = newGame().do('rogue', 'add_xp 2000', 'saboteur', 'engage');
    g.player.hp = 9999;
    const e = g.combat.enemies[0];
    e.def = 0;
    g.player.resource.current = 20;
    g.castSkill(g.player, g.data.skillDefinitions['Explosive Caltrops'], [g.player]);
    assert.strictEqual(g.combat.traps.length, 3);
    const hp = e.hp;
    g.springTrap(e);
    assert.ok(e.hp < hp && g.findStatus(e, 'Bleed'));
});

test('Poison Flask: a burst of Poison (stacks to 2) on everyone in the splash; Alchemist\'s Blood makes it 50% stronger', () => {
    const r = fight(rogue('saboteur'), 500, 60);
    cast(r, 'Poison Flask', 60);
    const poisoned = r.g.combat.enemies.filter((e) => r.g.findStatus(e, 'Poison'));
    assert.ok(poisoned.length >= 2);
    assert.strictEqual(r.g.findStatus(poisoned[0], 'Poison').value, 6, '4 × 1.5');
});
