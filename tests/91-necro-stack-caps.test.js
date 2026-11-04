// Necromancer stack caps (Tokelo 2026-11-02: "nerf Necro to add stack caps"). On-hit DoTs from the Venom and Rend ghosts
// and Virulent Touch's Infection stop stacking at a per-source cap and only refresh after it. Other sources still stack
// past it, and a capped source never strips stacks it didn't add. Benchmark: Necro vs the Crow Warden (PR #211).
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


test('Venom and Rend ghosts: on-hit Poison and Bleed stop at their cap (dotStackCap) and only refresh', () => {
    const r = plague();
    const g = r.g;
    const pool = g.data.skillDefinitions['Channel the Grave'].effects[0].pool;
    const ghost = (name) => { const { name: n, type, value, text, ...rest } = pool.find((x) => x.name === name); return { ...rest, name: n, type, value, ghost: true, stacks: 1 }; };
    const cap = pool.find((x) => x.name === 'Venom Ghost').dotStackCap;
    assert.ok(cap >= 1 && cap < g.maxStacks('Poison', 'dot'), `cap ${cap} is below the live DoT cap`);
    const e = g.combat.enemies[0];
    g.player.statusEffects.push(ghost('Venom Ghost'), ghost('Rend Ghost'));
    const atk = { name: 'Test', base_damage: [1, 1], effects: [] };
    for (let i = 0; i < 6; i++) g.castSkill(g.player, atk, [e]);
    assert.strictEqual(g.findStatus(e, 'Poison').stacks, cap);
    assert.strictEqual(g.findStatus(e, 'Bleed').stacks, cap);
    // another source stacks past the cap, and the ghost's next hit keeps those stacks
    g.applyDot(g.player, e, { name: 'Poison', value: 2, duration: 1 });
    g.applyDot(g.player, e, { name: 'Poison', value: 2, duration: 1 });
    const before = g.findStatus(e, 'Poison').stacks;
    assert.strictEqual(before, cap + 2);
    g.castSkill(g.player, atk, [e]);
    assert.strictEqual(g.findStatus(e, 'Poison').stacks, before, 'a capped source never strips stacks');
    assertHealthy(g);
});

test('Virulent Touch: basic attacks stack Infection only to virulentTouchMaxStacks; Contagion and Plague of Ages still go past it', () => {
    const r = plague();
    const g = r.g;
    const cap = g.data.realtimeRules.statuses.virulentTouchMaxStacks;
    assert.ok(cap >= 1 && cap < g.maxStacks('Infection', 'dot'));
    const t = r.rats[0];
    for (let i = 0; i < 8; i++) { frames(r.sim, 1, { attack: true, aim: { x: t.x, y: t.y } }); frames(r.sim, 40, { aim: { x: t.x, y: t.y } }); }
    const e = g.combat.enemies.find((x) => g.infectionOn(x));
    assert.ok(e, 'basics infect');
    assert.strictEqual(g.infectionOn(e).stacks, cap);
    g.infect(g.player, e, 10);
    assert.strictEqual(g.infectionOn(e).stacks, cap + 10, 'other sources are not capped');
    frames(r.sim, 1, { attack: true, aim: { x: t.x, y: t.y } }); frames(r.sim, 40, { aim: { x: t.x, y: t.y } });
    assert.ok(g.infectionOn(e).stacks >= cap + 10 - 1, 'basics never strip stacks (a tick may expire nothing here)');
    assertHealthy(g);
});
