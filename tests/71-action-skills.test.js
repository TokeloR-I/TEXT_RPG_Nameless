// Combat v3: skills behave the same in and out of a fight (Tokelo, 2026-10-31), and Quick Slash / Shadowstep move
// the player as docs/design/ENSO_ACTION_COMBAT_DESIGN.md §3 says (dash 32 px over 110 ms; teleport 16 px behind).
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;

function make(cls, { skills = [], seed = 71 } = {}) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    for (const k of skills) if (!g.player.skills.includes(k)) g.player.skills.push(k);
    const bar = g.ensureSkillBar();
    for (const k of skills) if (!bar.includes(k)) bar[bar.indexOf(null)] = k;
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    s.x = 13; s.y = 31;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    return { g, s, sim, slot: (name) => g.ensureSkillBar().indexOf(name) };
}
const frames = (sim, n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(STEP, input)); return out; };
const fxOf = (outs) => outs.flatMap((o) => o.fx);
const calm = (r) => { r.sim.groups = {}; r.sim.actors = []; r.sim.syncEncounters = () => {}; };   // nobody on the map

test('Out of a fight a bolt skill flies as a bolt (no sword swing), spends nothing and touches no rules', () => {
    const r = make('mage');
    calm(r);
    r.g.player.resource.current = r.g.player.resource.max;   // full, so the out-of-fight refill can't hide a spend
    const res = r.g.player.resource.current;
    const p = r.sim.player;
    const out = frames(r.sim, 1, { slot: r.slot('Arcane Bolt') });
    assert.strictEqual(p.attack.skill, 'Arcane Bolt');
    assert.strictEqual(p.attack.shape.shape, 'projectile', 'the HUD draws a cast, not the weapon arc');
    assert.ok(!fxOf(out).some((f) => f.type === 'swing' && f.shape && f.shape.kind), 'not the weapon swing');
    frames(r.sim, 20);
    assert.ok(r.sim.projectiles.length === 1 || fxOf(frames(r.sim, 60)).some((f) => f.type === 'fizzle'), 'a bolt flies');
    frames(r.sim, 90);
    assert.strictEqual(r.sim.projectiles.length, 0, 'and fizzles at its range');
    assert.strictEqual(r.g.player.resource.current, res);
    assert.strictEqual(r.g.combat, null, 'no fight started, no rules ran');
});

test('Out of a fight a self buff plays its cast glyph, not a swing', () => {
    const r = make('warrior');
    calm(r);
    const out = frames(r.sim, 1, { slot: r.slot('Guard') });
    assert.ok(fxOf(out).some((f) => f.type === 'cast' && f.skill === 'Guard'));
    assert.ok(!fxOf(out).some((f) => f.type === 'swing'));
});

test('Quick Slash dashes 32 px along your facing, then slashes (in a fight and out of one)', () => {
    for (const fight of [false, true]) {
        const r = make('rogue');
        if (!fight) calm(r);
        else { r.sim.engageGroup(r.sim.groups.grounds_weed_rats); for (const a of r.sim.actors) { a.x = 0; a.y = 0; } }   // rats far off: room to dash
        const p = r.sim.player;
        p.angle = Math.PI / 2;   // down the open grass
        const x0 = p.x, y0 = p.y;
        r.g.player.resource.current = 5;
        frames(r.sim, 1, { slot: r.slot('Quick Slash') });
        assert.ok(p.attack && p.attack.dash, `${fight ? 'fight' : 'calm'}: a dash started`);
        frames(r.sim, 12);
        const moved = Math.hypot(p.x - x0, p.y - y0);
        assert.ok(moved >= 26 && moved <= 36, `${fight ? 'fight' : 'calm'}: dashed ${moved.toFixed(1)} px`);
    }
});

test('Quick Slash in a fight reaches the rat the dash brings it to', () => {
    const r = make('rogue');
    r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
    const p = r.sim.player;
    const rat = r.sim.actors.find((a) => a.engineId);
    for (const a of r.sim.actors) if (a !== rat) { a.x = 0; a.y = 0; }
    rat.x = p.x; rat.y = p.y - 44;    // up the open grass: beyond the 20 px slash, inside dash + slash
    rat.prof = { ...rat.prof, speed: 0 };
    r.g.player.resource.current = 5;
    p.angle = -Math.PI / 2;
    const hp = r.g.combat.enemies.find((e) => e.id === rat.engineId).hp;
    frames(r.sim, 1, { slot: r.slot('Quick Slash'), aim: { x: rat.x, y: rat.y } });
    frames(r.sim, 20);
    assert.ok(r.g.combat.enemies.find((e) => e.id === rat.engineId).hp < hp, 'the slash after the dash landed');
});

test('Shadowstep teleports you 16 px behind the enemy you aim at, facing its back, with i-frames', () => {
    const r = make('rogue', { skills: ['Shadowstep'] });
    r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
    const p = r.sim.player;
    const rat = r.sim.actors.find((a) => a.engineId);
    rat.x = p.x + 70; rat.y = p.y; rat.angle = Math.PI;   // facing the player
    rat.prof = { ...rat.prof, speed: 0 };
    r.g.player.resource.current = 5;
    const out = frames(r.sim, 1, { slot: r.slot('Shadowstep'), aim: { x: rat.x, y: rat.y } });
    assert.ok(fxOf(out).some((f) => f.type === 'teleport'));
    assert.ok(p.x > rat.x, 'now on the far side of it');
    const d = Math.hypot(p.x - rat.x, p.y - rat.y);
    assert.ok(d >= 14 && d <= 24, `${d.toFixed(1)} px behind`);
    assert.ok(Math.abs(p.angle - Math.PI) < 0.3 || Math.abs(Math.abs(p.angle) - Math.PI) < 0.3, 'facing its back');
    assert.ok(r.sim.now < p.iframesUntil);
    const log = fxOf([]).length;
    const after = frames(r.sim, 15);
    const texts = after.flatMap((o) => o.engineEvents).map((e) => e.text || '');
    assert.ok(texts.some((t) => /vanishes and reappears beside Rust Rat/.test(t)), texts.join(' | '));
    assert.ok(r.g.player.statusEffects.some((s) => s.name === 'Guaranteed Crit'));
});

test('Shadowstep with nobody in reach (or out of a fight): a notice, you stay put, nothing paid', () => {
    for (const fight of [true, false]) {
        const r = make('rogue', { skills: ['Shadowstep'] });
        if (fight) { r.sim.engageGroup(r.sim.groups.grounds_weed_rats); for (const a of r.sim.actors) { a.x = 0; a.y = 0; } } else calm(r);
        r.g.player.resource.current = 5;
        const p = r.sim.player;
        const x0 = p.x, y0 = p.y;
        const out = frames(r.sim, 1, { slot: r.slot('Shadowstep') });
        assert.ok(fxOf(out).some((f) => f.type === 'notice' && /Shadowstep/.test(f.text)));
        assert.strictEqual(p.x, x0); assert.strictEqual(p.y, y0);
        assert.strictEqual(r.g.player.resource.current, 5);
    }
});

// ---- Pre-buffing (Tokelo, 2026-10-31): self buffs cast out of a fight are real, timed, and come into the next fight
test('Pre-buff: Guard out of a fight puts the real status on you, timed as in a fight, then wears off', () => {
    const r = make('warrior');
    calm(r);
    const out = frames(r.sim, 1, { slot: r.slot('Guard') });
    const st = r.g.player.statusEffects.find((x) => x.name === 'Guard');
    assert.ok(st, 'Guard is on you');
    assert.strictEqual(st.type, 'damage_reduction');
    const secs = r.g.data.realtimeRules.statuses.buffs.Guard.seconds;
    assert.strictEqual(st.rtTotalMs, secs * 1000, 'the same timing a fight gives it');
    assert.ok(fxOf(out).some((f) => f.type === 'cast' && f.skill === 'Guard'));
    const again = frames(r.sim, 30, { slot: r.slot('Guard') });
    assert.ok(fxOf(again).some((f) => f.type === 'refused' && f.code === 'ON_COOLDOWN'), 'its cooldown runs out of a fight too');
    const texts = frames(r.sim, Math.ceil(secs * 60) + 5).flatMap((o) => o.engineEvents).map((e) => e.text || '');
    assert.ok(!r.g.player.statusEffects.some((x) => x.name === 'Guard'), 'it wore off');
    assert.ok(texts.some((t) => /\[Guard\] wears off/.test(t)));
});

test('Pre-buff: a buff still running when a fight starts comes into it with the time it had left', () => {
    const r = make('rogue');
    const p = r.sim.player;
    // stand away from the rats, buff, then walk into them
    for (const a of r.sim.actors) { a.x = p.x + 400; a.y = p.y; }
    const out = frames(r.sim, 1, { slot: r.slot('Evasion') });
    assert.ok(r.g.player.statusEffects.some((x) => x.name === 'Evasion'), JSON.stringify(fxOf(out)));
    const total = r.g.player.statusEffects.find((x) => x.name === 'Evasion').rtTotalMs;
    frames(r.sim, 60);   // 1 s later
    for (const a of r.sim.actors) { a.x = a.homeX; a.y = a.homeY; }
    const res = r.g.actionEngage('grounds_weed_rats', r.sim.groups.grounds_weed_rats.keys, null, null);
    assert.ok(res.ok);
    const st = r.g.player.statusEffects.find((x) => x.name === 'Evasion');
    assert.ok(st, 'Evasion came into the fight');
    const left = st.rtEndsAt - r.g.combat.rt.now;
    assert.ok(Math.abs(left - (total - 1000)) < 50, `${left} ms left of ${total}`);
    assert.ok(res.events.some((e) => /You go in with Evasion up/.test(e.text || '')));
    // and it works in the fight: the dodge status is there for the next blow
    assert.strictEqual(st.type, 'dodge');
});

test('Pre-buff: a self skill that needs a fight (Haste) only plays its cast and says so; costs and statuses untouched', () => {
    const r = make('mage', { skills: ['haste'] });
    calm(r);
    r.g.player.resource.current = r.g.player.resource.max;   // full, so the out-of-fight refill can't hide a spend
    const res = r.g.player.resource.current;
    const out = frames(r.sim, 1, { slot: r.slot('haste') });
    assert.ok(fxOf(out).some((f) => f.type === 'notice' && /only works in a fight/.test(f.text)));
    assert.strictEqual(r.g.player.resource.current, res);
    assert.strictEqual(r.g.player.statusEffects.length, 0);
});

test('Buffs outlive the fight on the calm clock with the time they had left; a fall still clears them', () => {
    const r = make('rogue');
    const p = r.sim.player;
    for (const a of r.sim.actors) { a.x = p.x + 400; a.y = p.y; }
    frames(r.sim, 1, { slot: r.slot('Evasion') });
    r.g.actionEngage('grounds_weed_rats', r.sim.groups.grounds_weed_rats.keys, null, null);
    r.g.tick(2000);
    const inFight = r.g.player.statusEffects.find((x) => x.name === 'Evasion');
    const left = inFight.rtEndsAt - r.g.combat.rt.now;
    r.g.player.statusEffects.push({ name: 'Poison', type: 'dot', value: 1, duration: 3, stacks: 1, rtEndsAt: r.g.combat.rt.now + 9000 });
    const res = r.g.actionDisengage('grounds_weed_rats');
    assert.strictEqual(r.g.mode, 'explore');
    assert.deepStrictEqual(r.g.player.statusEffects.map((x) => x.name), ['Evasion'], 'the buff stays, the debuff ends with the fight');
    const st = r.g.player.statusEffects[0];
    assert.ok(st.calm);
    assert.strictEqual(st.rtEndsAt - r.g.actionCalm().now, left, 'same time left, now on the calm clock');
    assert.ok(res.events.some((e) => /Still up: Evasion/.test(e.text || '')));
    r.g.actionCalmTick(left + 10);
    assert.strictEqual(r.g.player.statusEffects.length, 0, 'and it runs out out of combat');
    // a buff carried out can come back into the next fight, and a fall clears everything
    frames(r.sim, 600);
    frames(r.sim, 1, { slot: r.slot('Evasion') });
    r.g.actionEngage('grounds_weed_rats', r.sim.groups.grounds_weed_rats.keys, null, null);
    assert.ok(r.g.player.statusEffects.some((x) => x.name === 'Evasion'));
    r.g.actionRespawn();
    assert.strictEqual(r.g.player.statusEffects.length, 0, 'a fall clears every status');
});
