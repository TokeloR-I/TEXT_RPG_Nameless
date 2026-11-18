// The Dominion rulers as real boss fights (Tokelo 2026-11-18: "the luficero boss is just a tank that has 2 moves really
// not difficult the dark souls part is a giant health bar and no move threatening the player in any way";
// docs/design/DOMINION_BOSSES.md). Three acts each, Lucifero's gravity, Beelzebub's folds, and rulers that grow with you.
const { test, assert, GameEngine } = require('./helpers.js');
const data = require('../src/data.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;
const A = data.actionRules;
const RULERS = { lucifero: ['underworld_arena', 'underworld_arena_ruler'], beelzebub: ['dominion_beelzebub', 'beelzebub_ruler'], slotos: ['dominion_slotos', 'slotos_ruler'], plumede: ['dominion_plumede', 'plumede_ruler'] };

/** A hero on a ruler's floor, engaged with it; god HP unless `mortal`. */
function rulerFight(key, { seed = 111, level = 1, mortal = false } = {}) {
    const [map, enc] = RULERS[key];
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    while (g.player.level < level) { g.addExperience(g.player.xpToNext, { quiet: true }); if (g.pendingBranchChoice) g.chooseBranch('vanguard'); }
    g.story.flags.push('underworld_wave_5', 'contract:lucifero', `${key}_wave_5`);
    const s = new WorldSession(WORLD, { engine: g });
    s.place(map, Object.keys(WORLD.maps[map].spawns)[0]);
    const e0 = WORLD.maps[map].encounters.find((e) => e.id === enc);
    s.x = e0.x + 5; s.y = e0.y + 3;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    for (let i = 0; i < 20; i++) sim.update(STEP, {});
    if (!mortal) g.player.hp = g.player.maxHp = 99999;
    sim.engageGroup(sim.groups[enc]);
    for (let i = 0; i < 2; i++) sim.update(STEP, {});
    const b = sim.actors.find((a) => a.key === key && a.encounterId === enc);
    const e = () => g.combat.enemies.find((x) => x.id === b.engineId);
    return { g, s, sim, b, e };
}
const setHpPct = (r, pct) => { r.e().hp = Math.floor(r.e().maxHp * pct); r.sim.update(STEP, {}); };
const tells = (m) => (m.combo || [m]).map((st) => st.windupMs || m.windupMs);

test('Dominion rulers: three acts each, a phase 2 of new signature moves, every tell readable, all on skills they have', () => {
    for (const key of Object.keys(RULERS)) {
        const b = A.bosses[key];
        assert.ok(b.alternateSpecials, `${key}: cycles its specials instead of throwing the same two`);
        const p2 = b.phases.find((x) => x.fromHpPct < 1);
        assert.ok(p2 && p2.notice && p2.openWith, `${key}: phase 2 announces itself and opens with a move`);
        const adds = p2.add.filter((x) => typeof x === 'object');
        assert.ok(adds.length >= 2, `${key}: phase 2 adds moves`);
        assert.ok(adds.some((x) => x.name === p2.openWith), `${key}: opens phase 2 with one of its own moves`);
        assert.ok(b.rage.atHpPct < p2.fromHpPct, `${key}: the rage is the third act`);
        assert.ok(b.arenaPatterns && b.arenaPatterns.length >= 2 && b.arena, `${key}: has arena-wide patterns on its own floor`);
        const all = adds.concat(b.rage.add.filter((x) => typeof x === 'object'));
        assert.ok(all.some((x) => x.shape === 'arena' || x.shape === 'mark'), `${key}: a move that reaches you anywhere in the arena`);
        for (const m of all) {
            assert.ok(data.enemies[key].skills.some((s) => s.name === m.skill), `${key} ${m.name}: uses a skill it has (${m.skill})`);
            for (const w of tells(m)) assert.ok(Math.max(b.rage.minWindupMs || 0, Math.round(w * (b.rage.windupMult || 1))) >= 480, `${key} ${m.name}: tell ${w} ms stays readable in the rage`);
        }
        assert.ok(b.hpMult <= 2.6, `${key}: less of a health bar than before (was 3.2)`);
    }
});

test('Lucifero: from range he uses his whole kit, not two moves', () => {
    const r = rulerFight('lucifero');
    const seen = new Set();
    for (let i = 0; i < 60 * 60; i++) {
        const p = r.sim.player, d = Math.hypot(r.b.x - p.x, r.b.y - p.y) || 1;
        const move = d < 90 ? { x: (p.x - r.b.x) / d, y: (p.y - r.b.y) / d } : { x: 0, y: 0 };   // keep back, like a caster
        r.sim.update(STEP, { move, aim: { x: r.b.x, y: r.b.y } });
        if (r.b.state === 'windup' && r.b.windup) seen.add(r.b.windup.base.name);
    }
    assert.ok(seen.size >= 4, `four or more different moves in a minute at range (saw ${[...seen].join(', ')})`);
});

test('Lucifero phase 2: the floor leans toward him, and Event Horizon drags you in', () => {
    const r = rulerFight('lucifero');
    setHpPct(r, 0.69);
    assert.strictEqual(r.b.phaseIdx, 1);
    assert.strictEqual(r.b.openWith, 'Event Horizon');
    assert.ok(r.sim.attacksOf(r.b).some((x) => x.name === 'Weight of the Fallen') && r.sim.attacksOf(r.b).some((x) => x.name === 'Crushing Weight'), 'new moves on top of the old ones');
    // Standing still away from him, the lean alone moves you toward him.
    const p = r.sim.player;
    r.b.state = 'recover'; r.b.stateEnd = r.sim.now + 100000; r.b.windup = null; r.b.openWith = null;
    const d0 = Math.hypot(r.b.x - p.x, r.b.y - p.y);
    for (let i = 0; i < 30; i++) r.sim.update(STEP, {});
    const d1 = Math.hypot(r.b.x - p.x, r.b.y - p.y);
    assert.ok(d1 < d0 - 5, `the lean pulls you in (${d0.toFixed(1)} -> ${d1.toFixed(1)})`);
    // Event Horizon pulls harder than walking away can outrun.
    const eh = r.sim.attacksOf(r.b).find((x) => x.name === 'Event Horizon');
    assert.ok(eh.pull.pxPerS + A.bosses.lucifero.phases[1].gravity.pxPerS > A.player.speed, 'walking out of the pull fails; sprint or dodge');
    assert.ok(eh.pull.pxPerS + A.bosses.lucifero.phases[1].gravity.pxPerS < A.player.speed * A.player.sprintMult, 'a sprint gets you out');
    r.b.stateEnd = r.sim.now; r.b.state = 'chase'; r.b.attackReadyAt = 0; r.b.openWith = 'Event Horizon'; r.b.atkReady['Event Horizon'] = 0;
    r.sim.update(STEP, {});
    assert.strictEqual(r.b.windup && r.b.windup.base.name, 'Event Horizon');
    const v = r.sim.view().actors.find((a) => a.sid === r.b.sid);
    assert.ok(v.pull && v.pull.strong, 'the pull is shown while it winds up');
    const before = Math.hypot(r.b.x - p.x, r.b.y - p.y);
    const leanOnly = A.bosses.lucifero.phases[1].gravity.pxPerS;
    for (let i = 0; i < 30; i++) r.sim.update(STEP, { move: { x: (p.x - r.b.x), y: (p.y - r.b.y) } });   // walking straight away
    const after = Math.hypot(r.b.x - p.x, r.b.y - p.y);
    assert.ok(after < before + (A.player.speed - leanOnly) * 0.5 - 10, `walking away you lose ground to the pull (${before.toFixed(1)} -> ${after.toFixed(1)})`);
});

test('Lucifero: a Gravity Well that roots you is followed by Pressed Flat in every phase', () => {
    const r = rulerFight('lucifero');
    const gw = r.sim.attacksOf(r.b).find((x) => x.name === 'Gravity Well');
    assert.ok(gw.followUp === 'Pressed Flat' && gw.followUpAlways);
    assert.ok(!r.b.raged);
    r.b.windup = { atk: gw, base: gw, step: 0, start: r.sim.now, end: r.sim.now, foe: r.sim.player };
    r.sim.engine.actionEnemyWindup(r.b.engineId, { skill: gw.skill });
    r.sim.strikePlayer(r.b, true, gw);
    assert.strictEqual(r.b.openWith, 'Pressed Flat');
});

test('Lucifero phase 3 (rage): the Dominion collapses, a black sun follows you, the lean grows', () => {
    const r = rulerFight('lucifero');
    setHpPct(r, 0.34);
    assert.ok(r.b.raged);
    assert.strictEqual(r.b.openWith, 'Collapse of the Dominion');
    const names = r.sim.attacksOf(r.b).map((x) => x.name);
    for (const n of ['Collapse of the Dominion', 'Black Sun', 'Event Horizon', 'Descent']) assert.ok(names.includes(n), `${n} in his rage kit`);
    assert.strictEqual(names.filter((n) => n === 'Descent').length, 1, 'the rage Descent replaces the phase 2 one');
    assert.ok(r.sim.attacksOf(r.b).find((x) => x.name === 'Event Horizon').pull.pxPerS > A.bosses.lucifero.phases[1].add[0].pull.pxPerS, 'a stronger pull');
    r.b.state = 'chase'; r.b.attackReadyAt = 0;
    r.sim.update(STEP, {});
    assert.strictEqual(r.b.windup.base.name, 'Collapse of the Dominion');
    const shape = r.sim.enemyShape(r.b);
    assert.ok(shape.kind === 'multi' && shape.shapes.length >= 8, 'the collapse covers the floor in a pattern');
    const ar = A.bosses.lucifero.arena;
    for (const c of shape.shapes) if (c.kind === 'line') assert.ok(c.x >= ar.x0 - 1 && c.x <= ar.x1 + 1, 'on his floor');
});

test('Beelzebub phase 2: he steps out of a fold behind you, already swinging', () => {
    const r = rulerFight('beelzebub');
    setHpPct(r, 0.69);
    assert.strictEqual(r.b.openWith, 'Behind You');
    const p = r.sim.player;
    p.angle = 0;   // facing east: behind is west
    r.b.state = 'chase'; r.b.attackReadyAt = 0;
    r.sim.update(STEP, {});
    assert.strictEqual(r.b.windup.base.name, 'Behind You');
    assert.ok(r.b.x < p.x && Math.hypot(r.b.x - p.x, r.b.y - p.y) < 40, `he is at your back (${(r.b.x - p.x).toFixed(1)}, ${(r.b.y - p.y).toFixed(1)})`);
});

test('Slotos and Plumede phase 2: three-charge rampage, three-dive cascade, each one re-aimed', () => {
    for (const [key, move] of [['slotos', 'Iron Rampage'], ['plumede', 'Talon Cascade']]) {
        const r = rulerFight(key);
        setHpPct(r, 0.69);
        assert.strictEqual(r.b.openWith, move, `${key} opens phase 2 with ${move}`);
        const m = r.sim.attacksOf(r.b).find((x) => x.name === move);
        assert.strictEqual(m.combo.length, 3);
        assert.ok(m.combo.every((st) => st.lockMs > 0), 'each charge tracks you, then locks');
    }
});

test('Dominion rulers grow with your level: no softer when you come back strong', () => {
    for (const key of Object.keys(RULERS)) {
        const sc = A.bosses[key].scaleToLevel;
        const at = rulerFight(key, { level: sc.level, mortal: true }).e();
        const hi = rulerFight(key, { level: sc.level + 5, mortal: true }).e();
        assert.strictEqual(at.maxHp, Math.round(data.enemies[key].maxHp * A.bosses[key].hpMult), `${key}: at its level, as built`);
        assert.strictEqual(hi.maxHp, Math.round(at.maxHp * (1 + sc.hp * 5)), `${key}: +${sc.hp * 100}% HP a level`);
        assert.strictEqual(hi.atk, Math.round(data.enemies[key].atk * (1 + sc.atk * 5)), `${key}: harder blows`);
    }
});
