// Plaguecaller live rework (Tokelo 2026-11-01, docs/design/PLAGUECALLER_LIVE.md): the branch no longer needs a crowd.
// Infection builds on one enemy (Contagion, Virulent Touch), Withering Curse amplifies it, Plague Burst cashes it in,
// Plague Reservoir pays Soul Energy from ticks, Plague of Ages hits what is around you.
const { test, assert, newGame, assertHealthy } = require('./helpers.js');
const { GameEngine } = require('../src/engine.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;

function plague(seed = 90) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('necromancer'); g.input('add_xp 99999'); g.input('plaguecaller');
    g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    s.x = 41; s.y = 37;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    sim.engageGroup(sim.groups.grounds_weed_rats);
    const p = sim.player;
    const rats = sim.actors.filter((a) => a.encounterId === 'grounds_weed_rats' && !a.dead);
    rats.forEach((a, i) => { a.x = p.x + 30 + i * 6; a.y = p.y + (i % 2 ? 6 : -6); a.foe = null; });
    for (const e of g.combat.enemies) { e.hp = e.maxHp = 2000; }
    return { g, sim, rats };
}
const frames = (sim, n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(STEP, input)); return out; };
const texts = (outs) => outs.flatMap((o) => o.engineEvents).map((e) => e.text || '').filter(Boolean);
function cast(r, name, n = 60) {
    const p = r.g.player;
    p.skillBar = [name]; p.skillBarSeen = [...p.skills];
    p.resource.current = p.resource.max;
    const t = r.rats[0];
    return frames(r.sim, 1, { slot: 0, aim: { x: t.x, y: t.y } }).concat(frames(r.sim, n, { aim: { x: t.x, y: t.y } }));
}

test('Plaguecaller path: Plague Burst (L8) and Withering Curse (L11) replace the crowd skills; Plague of Ages stays the ascension', () => {
    const g = newGame();
    const stages = g.data.evolutionPaths.necromancer.branches.plaguecaller.stages;
    assert.deepStrictEqual(stages.map((s) => s.skill), ['Contagion', 'Black Spit', 'Plague Burst', 'Withering Curse', 'Plague of Ages']);
    const r = plague();
    for (const s of ['Contagion', 'Black Spit', 'Plague Burst', 'Withering Curse', 'Plague of Ages']) assert.ok(r.g.player.skills.includes(s), s);
});

test('Plague Burst on a lone enemy: stacks built by Contagion and basic attacks (Virulent Touch) burst for 5 each, consumed', () => {
    const r = plague();
    cast(r, 'Contagion');
    const t = r.rats[0];
    for (let i = 0; i < 4; i++) { frames(r.sim, 1, { attack: true, aim: { x: t.x, y: t.y } }); frames(r.sim, 40, { aim: { x: t.x, y: t.y } }); }
    const e = r.g.combat.enemies.find((x) => r.g.infectionOn(x) && x.id === t.engineId) || r.g.combat.enemies.find((x) => r.g.infectionOn(x));
    const stacks = r.g.infectionOn(e).stacks;
    assert.ok(stacks >= 2, `stacks built: ${stacks}`);
    const out = cast(r, 'Plague Burst', 40);
    assert.ok(texts(out).some((x) => new RegExp(`Infection bursts \\(${stacks} stacks\\) for ${stacks * 5} damage`).test(x)), texts(out).filter((x) => /burst/i.test(x)).join(' | '));
    assert.strictEqual(r.g.infectionOn(e), null, 'consumed');
    assertHealthy(r.g);
});

test('Plague Burst on a clean enemy is refused and costs nothing', () => {
    const r = plague();
    const out = cast(r, 'Plague Burst', 40);
    assert.ok(out.flatMap((o) => o.fx).some((f) => f.type === 'refused' && /needs an infected enemy/.test(f.text)));
    assert.strictEqual(r.g.player.resource.current, r.g.player.resource.max);
});

test('Withering Curse: DoT ticks on the cursed enemy deal +50%', () => {
    const g = newGame(7).do('necromancer', 'n', 'engage');
    const [a] = g.combat.enemies;
    a.hp = a.maxHp = 500;
    g.applyDot(g.player, a, { name: 'Poison', value: 10, duration: 3 });
    const dot = g.findStatus(a, 'Poison');
    assert.strictEqual(g.dotTickDamage(dot, a), 10);
    g.player.skills.push('Withering Curse');
    g.castSkill(g.player, g.playerSkill('Withering Curse'), [a]);
    assert.strictEqual(g.dotTickDamage(dot, a), 15);
});

test('Plague Reservoir: every 6th Infection tick of yours pays 1 Soul Energy, even with one enemy', () => {
    const r = plague();
    cast(r, 'Contagion', 40);   // the bolt lands (it is paid when it hits)
    r.g.player.resource.current = 0;
    const ticks = () => r.g.combat.reservoirTicks || 0;
    let out = [];
    for (let i = 0; i < 600 && ticks() < 6; i++) out = out.concat(frames(r.sim, 1));
    assert.ok(ticks() >= 6, texts(out).filter((x) => /Infection|infect|Reservoir/.test(x)).slice(0, 8).join(' | ') + ' ticks=' + ticks());
    assert.ok(texts(out).some((x) => /Plague Reservoir: \+1 Soul Energy/.test(x)));
});

test('Plague of Ages in a live fight: 10 true-damage stacks on the enemies around you, not the far ones', () => {
    const r = plague();
    r.rats[1].x += 400;
    cast(r, 'Plague of Ages', 30);
    const [near, far] = r.rats.map((a) => r.g.combat.enemies.find((e) => e.id === a.engineId));
    assert.strictEqual(r.g.infectionOn(near).stacks, 10);
    assert.strictEqual(r.g.infectionOn(near).trueDamage, true);
    assert.strictEqual(r.g.infectionOn(far), null);
    assertHealthy(r.g);
});
