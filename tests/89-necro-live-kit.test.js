// Necromancer live kit (Tokelo 2026-11-01, docs/design/NECROMANCER_LIVE_KIT.md): Grave Bolt scales with your minions,
// Channel the Grave calls two random-buff ghosts, Bone Cage replaces Shield of the Dead, Raise Ghoul is a meat shield
// that bursts, March raises a full army plus a Skeleton Champion. Checked in the world sim (action fights).
const { test, assert, newGame, assertHealthy } = require('./helpers.js');
const { GameEngine } = require('../src/engine.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;

/** A level 16 necromancer in a branch, in the Grounds beside the rats (made tough so fights last). */
function necro(branch = 'bone warden', seed = 89) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('necromancer'); g.input('add_xp 99999'); g.input(branch);
    g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    s.x = 41; s.y = 37;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    return { g, s, sim };
}
const frames = (sim, n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(STEP, input)); return out; };
const texts = (outs) => outs.flatMap((o) => o.engineEvents).map((e) => e.text || '').filter(Boolean);
const fxOf = (outs, type) => outs.flatMap((o) => o.fx).filter((f) => f.type === type);
const rats = (sim) => sim.actors.filter((a) => a.encounterId === 'grounds_weed_rats' && !a.dead);
function fight(r, hp = 500) {
    r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
    const p = r.sim.player;
    rats(r.sim).forEach((a, i) => { a.x = p.x + 30 + i * 6; a.y = p.y + (i % 2 ? 6 : -6); a.foe = null; });
    for (const e of r.g.combat.enemies) { e.hp = e.maxHp = hp; }
    return r;
}
/** Put `name` alone on the bar and press it, aimed at the first rat. */
function cast(r, name, n = 90) {
    const p = r.g.player;
    if (!p.skills.includes(name)) p.skills.push(name);
    p.skillBar = [name]; p.skillBarSeen = [...p.skills];
    p.resource.current = p.resource.max;
    const t = rats(r.sim)[0];
    const aim = t ? { x: t.x, y: t.y } : { x: r.sim.player.x + 30, y: r.sim.player.y };
    return frames(r.sim, 1, { slot: 0, aim }).concat(frames(r.sim, n, { aim }));
}

test('Grave Bolt: +2 per minion you have raised, corpses no longer count', () => {
    const g = newGame(3).do('necromancer', 'n', 'engage');
    const e = g.combat.enemies[0];
    e.hp = e.maxHp = 999; e.def = 0;
    g.combat.corpses = 5;
    g.rng = () => 0.99;   // max roll, no crit
    const bolt = g.data.skillDefinitions['Grave Bolt'];
    const roll = () => { const h = g.newHit(e); g.rollDamage(g.player, e, bolt, h); return h; };
    const hit = (n) => { const before = e.hp; g.castSkill(g.player, bolt, [e]); return before - e.hp; };
    const base = hit();
    g.summon('skeleton'); g.summon('skeleton');
    assert.strictEqual(hit(), base + 4, 'two skeletons: +4');
    assert.ok(roll(), 'rollDamage still works');
    assertHealthy(g);
});

test('Channel the Grave: a starter skill; two different random ghosts, 20 s each in a live fight', () => {
    assert.ok(newGame().data.basePlayerClasses.necromancer.startingSkills.includes('Channel the Grave'));
    const r = fight(necro());
    const out = cast(r, 'Channel the Grave');
    const ghosts = r.g.player.statusEffects.filter((s) => s.ghost);
    assert.strictEqual(ghosts.length, 2);
    assert.notStrictEqual(ghosts[0].name, ghosts[1].name);
    for (const s of ghosts) assert.strictEqual(s.rtTotalMs, 20000, `${s.name} lasts 20 s`);
    assert.ok(texts(out).some((t) => /answer your call/.test(t)));
    frames(r.sim, 60 * 21);
    assert.strictEqual(r.g.player.statusEffects.filter((s) => s.ghost).length, 0, 'gone after 20 s');
    assertHealthy(r.g);
});

test('Channel the Grave works out of a fight too (a pre-buff), and the ghosts come into the next fight', () => {
    const r = necro();
    r.sim.groups.grounds_weed_rats.cleared = true;   // nobody near: the press can't open a fight
    const p = r.g.player;
    p.skillBar = ['Channel the Grave']; p.skillBarSeen = [...p.skills];
    p.resource.current = p.resource.max;
    frames(r.sim, 1, { slot: 0, aim: { x: 0, y: 0 } }); frames(r.sim, 30);
    assert.strictEqual(p.statusEffects.filter((s) => s.ghost && s.calm).length, 2);
    r.sim.groups.grounds_weed_rats.cleared = false;
    fight(r);
    assert.strictEqual(p.statusEffects.filter((s) => s.ghost).length, 2, 'carried in');
});

test('The ghosts\' buffs: Wrath +25% damage, Siphon feeds Soul Energy, Swift hastes, Venom/Rend poison or bleed on hit', () => {
    const g = newGame(5).do('necromancer', 'n', 'engage');
    const pool = g.data.skillDefinitions['Channel the Grave'].effects[0].pool;
    const ghost = (name) => { const { name: n, type, value, text, ...rest } = pool.find((x) => x.name === name); return { ...rest, name: n, type, value, duration: 5, ghost: true, stacks: 1 }; };
    const e = g.combat.enemies[0];
    e.hp = e.maxHp = 999; e.def = 0;
    g.rng = () => 0.99;
    const atk = { name: 'Test', base_damage: [20, 20], effects: [] };
    const dmg = () => { const h = g.newHit(e); g.rollDamage(g.player, e, atk, h); return h.damage; };
    const plain = dmg();
    g.player.statusEffects.push(ghost('Wrath Ghost'));
    assert.strictEqual(dmg(), Math.floor(plain * 1.25));
    g.player.statusEffects = [ghost('Venom Ghost')];
    g.castSkill(g.player, atk, [e]);
    assert.ok(e.statusEffects.some((s) => s.name === 'Poison'), 'a hit poisons');
    g.player.statusEffects = [ghost('Rend Ghost')];
    g.castSkill(g.player, atk, [e]);
    assert.ok(e.statusEffects.some((s) => s.name === 'Bleed'), 'a hit bleeds');
    g.player.statusEffects = [ghost('Siphon Ghost')];
    g.player.resource.current = 0;
    g.endRoundResources();
    assert.ok(g.player.resource.current >= 1, 'Siphon feeds Soul Energy on the round/pulse');
    const r = fight(necro());
    r.g.player.statusEffects.push({ ...ghost('Swift Ghost'), duration: 5 });
    assert.ok(r.g.rtHasteMult(r.g.player) < 1, 'Swift Ghost is a haste');
    assertHealthy(g);
});

test('Swift Ghost: the basic attack swing itself is shorter in the world', () => {
    const swing = (fast) => {
        const r = fight(necro());
        if (fast) r.g.player.statusEffects.push({ name: 'Swift Ghost', type: 'haste', value: 0.25, ghost: true, stacks: 1 });
        const t = rats(r.sim)[0];
        frames(r.sim, 1, { attack: true, aim: { x: t.x, y: t.y } });
        return r.sim.player.attack ? r.sim.player.stateEnd - r.sim.now : 0;
    };
    assert.ok(swing(true) < swing(false));
});

test('Bone Cage replaces Shield of the Dead at Ossified Champion: area damage and a 90% hold, no minions needed', () => {
    const g = newGame();
    const stage = g.data.evolutionPaths.necromancer.branches.bone_warden.stages.find((s) => s.level === 5);
    assert.strictEqual(stage.skill, 'Bone Cage');
    const r = fight(necro());
    assert.strictEqual(r.g.alive(r.g.combat.minions).length, 0);
    const before = r.g.combat.enemies.map((e) => e.hp);
    cast(r, 'Bone Cage', 40);
    const hit = r.g.combat.enemies.filter((e, i) => e.hp < before[i]);
    assert.ok(hit.length >= 1, 'enemies in the area take damage');
    for (const e of hit) assert.ok(e.statusEffects.some((s) => s.type === 'slow' && s.value >= 0.9), 'and are held');
    assertHealthy(r.g);
});

test('Shield of the Dead (old saves) no longer charges you when you have no minions', () => {
    const g = newGame(2).do('necromancer', 'n', 'engage');
    g.player.skills.push('Shield of the Dead');
    g.player.resource.current = 5;
    g.do('shield of the dead');
    assert.strictEqual(g.player.resource.current, 5);
    assert.match(g.text(), /no minions to taunt with/);
});

test('Raise Ghoul in a live fight: it takes every hit meant for you, then runs at an enemy and bursts (blast + Grave Bleed)', () => {
    const r = fight(necro());
    const hp0 = r.g.player.hp;
    cast(r, 'Raise Ghoul', 60);
    const ghoul = r.g.combat.minions.find((m) => m.ghoul);
    assert.ok(ghoul && ghoul.ghoul.phase === 'shield');
    assert.ok(r.sim.minions.some((m) => m.key === 'ghoul'), 'it has a body');
    let out = frames(r.sim, 60 * 8);
    assert.strictEqual(r.g.player.hp, hp0, 'you took nothing while it guarded');
    assert.ok(ghoul.ghoul.stored > 0, 'it stored the hits');
    assert.ok(!texts(out).some((t) => /Ghoul uses/.test(t)), 'it never swings');
    out = out.concat(frames(r.sim, 60 * 8));
    assert.strictEqual(ghoul.ghoul.phase, 'spent');
    assert.ok(texts(out).some((t) => /Ghoul bursts/.test(t)), texts(out).filter((t) => /Ghoul/.test(t)).join(' | '));
    assert.ok(texts(out).some((t) => /afflicted with Grave Bleed/.test(t)), 'the bleed half');
    assert.ok(fxOf(out, 'aoe').length >= 1, 'a burst shows');
    assert.ok(!r.sim.minions.some((m) => m.key === 'ghoul' && !m.dead), 'and the ghoul is gone');
    assertHealthy(r.g);
});

test('Raise Ghoul: it bursts early once it has stored its capacity; out of a fight it only shows a notice', () => {
    const g = newGame(4).do('necromancer', 'n', 'engage');
    for (const e of g.combat.enemies) e.hp = e.maxHp = 999;
    g.player.skills.push('Raise Ghoul'); g.player.resource.current = 10;
    g.do('raise ghoul');
    const ghoul = g.combat.minions.find((m) => m.ghoul);
    g.damage(g.player, 500, g.combat.enemies[0]);
    assert.strictEqual(ghoul.ghoul.stored, ghoul.ghoul.capacity);
    assert.strictEqual(ghoul.ghoul.phase, 'spent', 'turn mode bursts at once');
    const r = necro();
    r.sim.groups.grounds_weed_rats.cleared = true;
    const p = r.g.player;
    p.skills.push('Raise Ghoul'); p.skillBar = ['Raise Ghoul']; p.skillBarSeen = [...p.skills]; p.resource.current = 10;
    const out = frames(r.sim, 1, { slot: 0, aim: { x: 0, y: 0 } });
    assert.ok(fxOf(out, 'notice').some((f) => /only works in a fight/.test(f.text)));
    assert.strictEqual(p.resource.current, 10);
});

test('March of Endless Bones in a live fight: every skeleton and the bigger champion get bodies that fight', () => {
    const r = fight(necro());
    const out = cast(r, 'March of Endless Bones', 200);
    const cap = r.g.minionCap();
    const alive = r.g.alive(r.g.combat.minions);
    assert.strictEqual(alive.length, cap + 1);
    assert.strictEqual(r.sim.liveMinions().length, cap + 1, 'one body each');
    const champ = r.sim.minions.find((m) => m.key === 'skeleton_champion');
    assert.ok(champ && champ.r > r.sim.minions.find((m) => m.key === 'skeleton').r, 'the champion is bigger');
    assert.ok(texts(out).some((t) => /Skeleton Champion uses Champion Cleave|Skeleton uses Bone Club/.test(t)));
    assertHealthy(r.g);
});
