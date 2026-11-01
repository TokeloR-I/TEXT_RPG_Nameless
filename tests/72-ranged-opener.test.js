// Ranged opener (Tokelo, 2026-11-01): the mage and necromancer felt like melee because a shot out of a fight only
// started one within engageRadius (120 px) of the nearest group, inside most enemies' detect radius. A projectile
// attack or bolt skill now engages the group it is aimed at, as far as it flies, and its hit lands.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;

function make(cls, seed = 72) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    const s = new WorldSession(WORLD, { engine: g });
    s.place('road', Object.keys(WORLD.maps.road.spawns)[0]);
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    const wolf = sim.actors.find((a) => a.key === 'hungry_wolf');
    return { g, s, sim, wolf };
}
/** Stand `gap` px from the wolf on a free spot with a clear line to it (searching around it). */
function standOff(r, gap) {
    for (let deg = 0; deg < 360; deg += 10) {
        const x = r.wolf.x + Math.cos(deg * Math.PI / 180) * gap, y = r.wolf.y + Math.sin(deg * Math.PI / 180) * gap;
        r.sim.player.x = x; r.sim.player.y = y;
        if (!r.sim.bodyBlocked(x, y, r.sim.player.r) && r.sim.lineOfSight(r.sim.player, r.wolf)) return true;
    }
    return false;
}
const wolfHp = (r) => { const e = r.g.combat && r.g.combat.enemies.find((x) => x.key === 'hungry_wolf'); return e ? e.hp / e.maxHp : 1; };
function shoot(r, input) {
    let engagedAt = null, hitAt = null;
    for (let i = 0; i < 90; i++) {
        r.sim.update(STEP, { aim: { x: r.wolf.x, y: r.wolf.y }, ...(i === 0 ? input : {}) });
        if (engagedAt == null && r.g.mode === 'combat') engagedAt = i;
        if (hitAt == null && wolfHp(r) < 1) hitAt = i;
    }
    return { engagedAt, hitAt };
}

for (const cls of ['mage', 'necromancer']) {
    test(`Ranged opener (${cls}): a basic shot from beyond the wolf's detect radius starts the fight and lands`, () => {
        const r = make(cls);
        const range = r.g.data.actionRules.classes[cls].weapon.range;
        const gap = Math.min(range - 10, 140);
        assert.ok(gap > r.wolf.prof.detect, `standing ${gap} px off, outside the wolf's ${r.wolf.prof.detect} px detect radius`);
        assert.ok(standOff(r, gap), 'found a clear line to the wolf');
        const { engagedAt, hitAt } = shoot(r, { attack: true });
        assert.strictEqual(engagedAt, 0, 'the shot itself starts the fight');
        assert.ok(hitAt != null, 'and the bolt hits the wolf');
    });

    test(`Ranged opener (${cls}): the first bolt skill opens the fight too`, () => {
        const r = make(cls);
        assert.ok(standOff(r, 140), 'found a clear line to the wolf');
        const { engagedAt, hitAt } = shoot(r, { slot: 0 });
        assert.strictEqual(engagedAt, 0, 'the bolt skill starts the fight');
        assert.ok(hitAt != null, 'and lands');
    });
}

test('Ranged opener: a shot aimed away from the group, or past its range, starts nothing', () => {
    const r = make('mage');
    assert.ok(standOff(r, 140), 'found a clear line to the wolf');
    const p = r.sim.player;
    for (let i = 0; i < 30; i++) r.sim.update(STEP, { aim: { x: p.x - (r.wolf.x - p.x), y: p.y - (r.wolf.y - p.y) }, attack: i === 0 });
    assert.notStrictEqual(r.g.mode, 'combat', 'aimed the other way: no fight');
    const r2 = make('mage');
    assert.ok(standOff(r2, r2.g.data.actionRules.classes.mage.weapon.range + 30), 'found a clear line from beyond range');
    const { engagedAt } = shoot(r2, { attack: true });
    assert.strictEqual(engagedAt, null, 'out of range: the bolt fizzles and nobody notices');
});

test('Ranged opener: melee classes still engage the nearest group only within engageRadius', () => {
    const r = make('warrior');
    assert.ok(standOff(r, 140), 'found a clear line to the wolf');
    for (let i = 0; i < 10; i++) r.sim.update(STEP, { aim: { x: r.wolf.x, y: r.wolf.y }, attack: i === 0 });
    assert.notStrictEqual(r.g.mode, 'combat', 'a sword swing 140 px away starts nothing');
});
