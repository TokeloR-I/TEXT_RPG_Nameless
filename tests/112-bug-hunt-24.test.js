// Bug hunt, 2026-11-24 (Tokelo: "Go bug hunting"). Each test is one bug found in play and fixed.
const { test, assert, GameEngine } = require('./helpers.js');
const data = require('../src/data.js');
const SaveMethods = require('../src/engine/save.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;

test('Bug hunt 11-24: every learnable skill has a real name, not a code name like "mirrorImage"', () => {
    const bad = Object.keys(data.skillDefinitions).filter((k) => /^[a-z]/.test(k) || /[a-z][A-Z]/.test(k));
    assert.deepStrictEqual(bad, []);
    for (const path of Object.values(data.evolutionPaths)) for (const br of Object.values(path.branches || path)) for (const st of (br && br.stages) || [])
        if (st.skill) assert.ok(data.skillDefinitions[st.skill], `${st.name}: its skill '${st.skill}' exists`);
});

test('Bug hunt 11-24: a save made before the renames gets the new skill names (format 3 -> 4), and status types stay', () => {
    const g = new GameEngine({ seed: 3, combatMode: 'action' });
    g.start(); g.input('mage'); g.enterWorld();
    const save = JSON.parse(JSON.stringify(g.serialize()));
    save.formatVersion = 3;
    const p = save.state.player;
    p.skills.push('mirrorImage', 'haste', 'slow', 'freezeTime');
    p.skillBar = ['mirrorImage', 'haste', 'Arcane Bolt'];
    p.statusEffects.push({ name: 'Slow', type: 'slow', value: 0.5, duration: 1 });
    save.state.world.calm = { now: 10, cooldowns: { mirrorImage: 5000, Guard: 2000 } };
    const m = SaveMethods.migrateSave(save);
    assert.strictEqual(m.save.formatVersion, SaveMethods.FORMAT_VERSION);
    const q = m.save.state.player;
    assert.deepStrictEqual(q.skills.slice(-4), ['Mirror Image', 'Haste', 'Slow', 'Freeze Time']);
    assert.deepStrictEqual(q.skillBar.slice(0, 2), ['Mirror Image', 'Haste']);
    assert.strictEqual(q.statusEffects[q.statusEffects.length - 1].type, 'slow', 'a status type is not a skill name');
    assert.deepStrictEqual(m.save.state.world.calm.cooldowns, { 'Mirror Image': 5000, Guard: 2000 });
    const r = new GameEngine({ seed: 3, combatMode: 'action' }).load(save);
    assert.ok(r.ok, r.error && r.error.message);
});

test('Bug hunt 11-24: the old code names still work as typed skill names', () => {
    const g = new GameEngine({ seed: 1 });
    g.start(); g.input('mage');
    assert.strictEqual(g.resolveSkillName('mirrorImage'), 'Mirror Image');
    assert.strictEqual(g.resolveSkillName('freezetime'), 'Freeze Time');
    assert.strictEqual(g.resolveSkillName('haste'), 'Haste');
});

test('Bug hunt 11-24: Bjarki never gives up on a ranged hero standing where his body cannot follow; he comes as close as he can', () => {
    const g = new GameEngine({ seed: 24, combatMode: 'action' });
    g.start(); g.input('mage'); g.enterWorld();
    for (const f of ['barrow_anchors_1', 'barrow_anchors_2', 'barrow_anchors_3']) g.story.flags.push(f);
    const s = new WorldSession(WORLD, { engine: g });
    s.place('bjarki_barrow', Object.keys(WORLD.maps.bjarki_barrow.spawns)[0]);
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 24 });
    for (let i = 0; i < 5; i++) sim.update(STEP, {});
    g.player.hp = g.player.maxHp = 99999;
    const enc = 'barrow_bjarki_bare';
    sim.engageGroup(sim.groups[enc]);
    sim.update(STEP, {});
    const b = sim.actors.find((a) => a.encounterId === enc);
    // The hero steps into the one-tile strip at the top of the barrow (cell 34,7): too narrow for his radius-10 body.
    const spot = { x: 34.5 * sim.T, y: 7.5 * sim.T };
    assert.ok(!sim.bodyBlocked(spot.x, spot.y, sim.player.r) && sim.bodyBlocked(spot.x, spot.y, b.r), 'the strip fits the hero, not him');
    assert.strictEqual(sim.findPath(b, spot), null, 'he has no way to stand next to you there');
    const start = Math.hypot(b.x - spot.x, b.y - spot.y);
    for (let i = 0; i < 60 * 15; i++) { sim.player.x = spot.x; sim.player.y = spot.y; g.player.hp = g.player.maxHp; sim.update(STEP, {}); }
    assert.strictEqual(g.mode, 'combat', 'the fight goes on');
    assert.ok(g.actionGroups().includes(enc), 'Bjarki is still in it');
    assert.notStrictEqual(b.state, 'return');
    assert.ok(Math.hypot(b.x - spot.x, b.y - spot.y) < Math.min(start, 120), `he came as close as he could (${Math.round(Math.hypot(b.x - spot.x, b.y - spot.y))} px)`);
});

test('Bug hunt 11-24: the keepsakes each class starts with read as names in the bag ("Old Key", not "old key")', () => {
    for (const cls of ['warrior', 'mage', 'rogue', 'necromancer']) {
        const g = new GameEngine({ seed: 1, combatMode: 'action' });
        g.start(); g.input(cls); g.enterWorld();
        for (const id of g.player.inventory) assert.ok(/^[A-Z]/.test(g.itemName(id)), `${cls}: '${g.itemName(id)}'`);
    }
});
