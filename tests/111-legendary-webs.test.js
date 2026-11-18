// Legendary webs filled out (Tokelo 2026-11-18: "the fallen angel only has 2 skills on the tree, the fenrir legendary class
// doesn't even have visual effects"). Spec: docs/design/LEGENDARY_WEBS.md. Layout: src/engine/skill-web.js legendaryLayout;
// looks: data.skillVfx + ui/legend-fx.js; sim events: src/action/sim.js skillFx.
const { test, assert, GameEngine, data } = require('./helpers.js');
const SkillWeb = require('../src/engine/skill-web.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const ZONE1 = require('../src/world/zone1.js');
require('../ui/action-fx.js');
const LFX = require('../ui/legend-fx.js');
const WORLD = doubleWorld(ZONE1);

const LEGS = data.skillWeb.legendaryWebs;
const BUILT = ['fallen_seraphim', 'fenrirs_heir', 'deathlord_eternal', 'reality_breaker'];

test('Legendary web picture: every node has its own spot, none on top of another (was: all on two spots)', () => {
    const web = SkillWeb.buildSkillWeb(data);
    for (const id of Object.keys(LEGS)) {
        const list = web.list.filter((n) => n.region === id);
        for (const a of list) for (const b of list) {
            if (a === b) continue;
            assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 0.1, `${id}: ${a.id} and ${b.id} overlap`);
        }
        for (const n of list) assert.ok(Math.hypot(n.x, n.y) <= 1.1, `${n.id} stays on the picture`);
    }
});

test('Every built legendary web is a full web: three paths of actives and passives and a capstone of capstones', () => {
    const web = SkillWeb.buildSkillWeb(data);
    for (const id of BUILT) {
        const list = web.list.filter((n) => n.region === id && n.kind !== 'heart');
        const actives = list.filter((n) => n.kind === 'active'), passives = list.filter((n) => n.kind === 'passive');
        assert.ok(list.length >= 16, `${id} has ${list.length} nodes`);
        assert.ok(actives.length >= 11 && passives.length >= 4, `${id}: ${actives.length} actives, ${passives.length} passives`);
        assert.ok(list.some((n) => (n.needs || []).length >= 2), `${id} has a capstone that needs the paths`);
        assert.strictEqual((LEGS[id].gifts || []).length, 3, `${id}: one gift per path`);
        for (const n of actives) assert.ok(data.skillDefinitions[n.skill], n.skill);
    }
    assert.deepStrictEqual(SkillWeb.validateSkillWeb(data), []);
});

test('Every legendary web skill has its own look, and every look and palette exists', () => {
    for (const id of BUILT) for (const n of LEGS[id].nodes) if (n.skill) {
        const v = data.skillVfx[n.skill];
        assert.ok(v, `${n.skill} has a look`);
        assert.ok(LFX.STYLES[v.style], `${n.skill}: style ${v.style}`);
        assert.ok(LFX.PALETTES[v.palette], `${n.skill}: palette ${v.palette}`);
        const shape = (data.actionRules.skillShapes.bySkill || {})[n.skill];
        if (shape && shape.shape === 'projectile') assert.ok(LFX.STYLES[v.style].proj, `${n.skill} is thrown, so its style draws it in flight`);
    }
    for (const [id, st] of Object.entries(LEGS.fenrirs_heir.stances.list)) assert.ok(st.look && LFX.PALETTES[st.look.palette], `stance ${id} has a look`);
});

test('legend-fx draws every style through every phase without throwing (a recording canvas)', () => {
    const calls = [];
    const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && /^(fill|stroke|save|restore|beginPath|ellipse|arc|moveTo|lineTo)/.test(k) ? (...a) => calls.push(k) : undefined)), set: (t, k, v) => { t[k] = v; return true; } });
    const fx = LFX.createFx(data.skillVfx);
    for (const skill of Object.keys(data.skillVfx)) for (const phase of ['start', 'fire', 'impact']) {
        fx.event({ type: 'skill_fx', phase, skill, x: 100, y: 100, cx: 120, cy: 100, angle: 0.3, radius: 60, reach: 60, castMs: 300 }, 1000);
        LFX.projectile(g, { x: 50, y: 50, angle: 1, skill }, 1100, data.skillVfx);
    }
    for (const t of [1000, 1150, 1400, 1800, 2400, 3200]) fx.draw(g, t);
    assert.ok(calls.length > 1000, 'it drew');
    assert.strictEqual(fx.count(), 0, 'every effect ends');
    assert.strictEqual(fx.event({ type: 'skill_fx', phase: 'fire', skill: 'Slash', x: 0, y: 0 }, 0), false, 'a skill without a look is left to action-fx');
    for (const look of Object.values(LEGS.fenrirs_heir.stances.list).map((s) => s.look))
        for (const layer of ['ground', 'over']) LFX.stanceAura(g, 50, 50, { ...look, bond: 80 }, 1234, layer);
    fx.spawn(LFX.stanceSwitch, { x: 10, y: 10, P: LFX.PALETTES.sun }, 0); fx.draw(g, 300);
    for (const key of ['spectral_wolf', 'deathless_thrall', 'mirror_self']) assert.ok(require('../ui/action-fx.js').BODIES[key], `${key} has a body`);
});

/** A warrior in the action world with every legendary web open and learned. */
function legend(seed = 111, combatMode = 'action') {
    const g = new GameEngine({ seed, combatMode });
    g.start(); g.input('warrior'); g.enterWorld();
    g.act({ type: 'cheat', cheat: 'set_level', amount: 20 }); g.act({ type: 'cheat', cheat: 'web_points', amount: 300 });
    if (g.pendingBranchChoice || g.mode === 'branch_select') { g.maybePromptBranch && g.maybePromptBranch(); g.act({ type: 'choose_branch', branchId: 'free' }); }
    for (const c of ['warrior', 'necromancer', 'mage']) g.act({ type: 'cheat', cheat: 'learn_web', amount: c });   // Deathlord Eternal and Reality Breaker rest on evolutions
    for (const id of BUILT) { g.act({ type: 'cheat', cheat: 'awaken_legend', amount: id === 'fenrirs_heir' ? 'fenrirs_heir skoll' : id }); if (LEGS[id].trial) g.act({ type: 'cheat', cheat: 'pass_trial', amount: id }); g.act({ type: 'cheat', cheat: 'learn_web', amount: id }); }
    g.player.hp = g.player.maxHp = 9999;
    g.player.resource.max = g.player.resource.current = 99;   // whatever pool the build runs on: room for every cost
    return g;
}
function simFor(g, calm = false) {
    const s = new WorldSession(WORLD, { engine: g });
    if (calm) s.place('skeldvik', 'from_pass');   // a town: nothing to fight
    else { s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]); s.x = 41; s.y = 37; }
    return new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 111 });
}

test('Deathlord Eternal and Reality Breaker open (cheat) with their gifts and every node learnable', () => {
    const g = legend();
    for (const id of ['deathlord_eternal', 'reality_breaker']) {
        for (const n of LEGS[id].nodes) assert.ok(g.webOwns(n.id), `${n.id} learned`);
        for (const gift of LEGS[id].gifts) assert.ok(g.player.skills.includes(LEGS[id].nodes.find((n) => n.id === gift).skill));
    }
    const cap = g.minionCap();
    g.player.traits = g.player.traits.filter((t) => t.name !== 'Legion of the Dead');
    assert.strictEqual(cap - g.minionCap(), 2, 'Legion of the Dead: +2 max minions');
});

test("Death's Dominion can be cast now: every enemy hit kneels (hard control through CR)", () => {
    const g = legend(111, 'turn');
    g.startCombat(['hungry_wolf', 'rust_rat']);
    for (const e of g.combat.enemies) e.hp = e.maxHp = 999;
    const r = g.act({ type: 'skill', skillId: 'Death’s Dominion' });
    assert.ok(r.ok, r.error && r.error.message);
    assert.ok(g.combat.enemies.every((e) => e.statusEffects.some((s) => s.name === 'Dominated')), 'they kneel');
    assert.ok(g.combat.enemies.every((e) => e.hp < 999), 'and take the hit');
});

test('Every legendary skill plays its look in the world, in a fight and out of one (skill_fx events)', () => {
    for (const id of BUILT) for (const n of LEGS[id].nodes) {
        if (!n.skill) continue;
        for (const inFight of [false, true]) {
            const g = legend();
            const def = data.skillDefinitions[n.skill];
            if (def.stance) g.setStance(def.stance);
            const bar = g.ensureSkillBar(); bar[0] = n.skill;
            const sim = simFor(g, !inFight);
            if (inFight) sim.engageGroup(sim.groups.grounds_weed_rats);
            g.player.resource.current = g.player.resource.max;
            const fx = [];
            fx.push(...sim.update(1000 / 60, { slot: 0 }).fx);
            for (let i = 0; i < 90; i++) fx.push(...sim.update(1000 / 60, {}).fx);
            const mine = fx.filter((f) => f.type === 'skill_fx' && f.skill === n.skill);
            const refused = fx.find((f) => f.type === 'refused');
            if (!inFight && /only works in a fight/.test((fx.find((f) => f.type === 'notice') || {}).text || '')) continue;   // summons rise only in a fight
            assert.ok(mine.some((f) => f.phase === 'start'), `${n.skill} (${inFight ? 'fight' : 'calm'}) starts its look${refused ? `: refused ${refused.text}` : ''}`);
        }
    }
});

test('Out of a fight, a self heal or cleanse works for real (Mercy of the Fallen heals; Tokelo: skills usable out of combat)', () => {
    const g = legend();
    g.player.hp = 100;
    const bar = g.ensureSkillBar(); bar[0] = 'Mercy of the Fallen';
    const sim = simFor(g, true);
    sim.update(1000 / 60, { slot: 0 });
    for (let i = 0; i < 30; i++) sim.update(1000 / 60, {});
    assert.ok(g.player.hp > 100, `healed (${g.player.hp})`);
});
