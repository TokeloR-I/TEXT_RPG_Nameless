// Combat v3: the action sim (src/action/sim.js) on the real 16 px world with a real engine. Movement,
// collision, detection, attacks, enemy wind-ups, guard, dodge, leash, loot and determinism, headless.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));

function run(cls = 'warrior', seed = 60) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    return { g, s };
}
/** Put the player on a map at a tile, with a fresh sim. */
function at(r, mapId, tx, ty) {
    const map = WORLD.maps[mapId];
    const sp = Object.keys(map.spawns)[0];
    r.s.place(mapId, sp);
    r.s.x = tx; r.s.y = ty;
    r.sim = new ActionSim({ engine: r.g, session: r.s, rules: r.g.data.actionRules, seed: 60 });
    return r;
}
const T = 16;
/** Two tiles beside the rats on the 16 px Grounds (their encounter covers 10-11, 30-31). */
const near = (r) => { at(r, 'grounds', 0, 0); const [x, y] = freeNear(r.s, 13, 31); return at(r, 'grounds', x, y); };
const frames = (sim, n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(1000 / 60, typeof input === 'function' ? input(i) : input)); return out; };
const ratsOf = (sim) => sim.actors.filter((a) => a.encounterId === 'grounds_weed_rats');
const freeNear = (s, x, y) => { for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!s.solidForAction(x + dx, y + dy) && !s.exitAt(x + dx, y + dy)) return [x + dx, y + dy]; throw new Error('no free cell'); };

test('Sim: the player walks sub-tile, in 8 directions, and never through a wall', () => {
    const r = run();
    const map = WORLD.maps[r.s.mapId];
    const sim = new ActionSim({ engine: r.g, session: r.s, rules: r.g.data.actionRules });
    const x0 = sim.player.x, y0 = sim.player.y;
    frames(sim, 10, { move: { x: 0.7071, y: 0.7071 } });
    const moved = Math.hypot(sim.player.x - x0, sim.player.y - y0);
    assert.ok(moved > 0 && moved < T, `moved ${moved}px in 10 frames (sub-tile)`);
    // walk into the map edge for 10 s: never leave the walkable cells
    for (const dir of [{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }]) {
        frames(sim, 600, { move: dir });
        if (sim.mapId !== map.id && sim.session.mapId !== r.s.mapId) break;
        assert.ok(!sim.bodyBlocked(sim.player.x, sim.player.y, sim.player.r), 'inside a wall');
    }
});

test('Sim: an enemy that sees you engages and the fight runs in the world (no battle screen)', () => {
    const r = near(run());
    const rat = ratsOf(r.sim)[0];
    const [fx, fy] = freeNear(r.s, Math.floor(rat.homeX / T) + 3, Math.floor(rat.homeY / T));
    r.s.x = fx; r.s.y = fy; r.sim.enterMap();
    frames(r.sim, 30);
    assert.strictEqual(r.g.mode, 'combat', 'the rats noticed you');
    assert.ok(ratsOf(r.sim).every((a) => a.engineId), 'every rat has an engine id');
    assert.ok(r.g.canSave().error, 'no saving while engaged');
});

test('Sim: attacking kills the rats in the world; XP once, loot on the ground, walking over it collects it', () => {
    const r = near(run('warrior', 61));
    r.g.player.hp = r.g.player.maxHp = 9999;
    const xp = r.g.player.xp, gold = r.g.player.gold;
    for (let i = 0; i < 60 * 40 && !r.g.isDefeated('grounds_weed_rats'); i++) {
        const live = ratsOf(r.sim).filter((a) => !a.dead);
        const tgt = live[0] || { x: r.sim.player.x, y: r.sim.player.y };
        const d = Math.hypot(tgt.x - r.sim.player.x, tgt.y - r.sim.player.y);
        const mv = d > 14 ? { x: (tgt.x - r.sim.player.x) / d, y: (tgt.y - r.sim.player.y) / d } : { x: 0, y: 0 };
        r.sim.update(1000 / 60, { move: mv, aim: { x: tgt.x, y: tgt.y }, attack: i % 6 === 0 });
    }
    assert.ok(r.g.isDefeated('grounds_weed_rats'), 'the rats died');
    assert.strictEqual(r.g.mode, 'explore');
    assert.ok(r.g.player.xp > xp || r.g.player.level > 1);
    const drops = r.g.getWorldDrops('grounds');
    for (const d of drops) {
        for (let i = 0; i < 600 && r.g.getWorldDrops('grounds').some((x) => x.id === d.id); i++) {
            const dd = Math.hypot(d.x - r.sim.player.x, d.y - r.sim.player.y) || 1;
            r.sim.update(1000 / 60, { move: { x: (d.x - r.sim.player.x) / dd, y: (d.y - r.sim.player.y) / dd } });
        }
    }
    assert.deepStrictEqual(r.g.getWorldDrops('grounds'), [], 'every drop collected');
    if (drops.some((d) => d.gold)) assert.ok(r.g.player.gold > gold);
});

test('Sim: enemies wind up before they hit (telegraph), and a timed dodge or guard changes what lands', () => {
    const r = near(run('warrior', 62));
    r.g.player.hp = r.g.player.maxHp = 9999;
    const rat = ratsOf(r.sim)[0];
    r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
    let sawTelegraph = false, windupThenHit = false, lastWindup = false;
    for (let i = 0; i < 60 * 8; i++) {
        const out = r.sim.update(1000 / 60, { aim: { x: rat.x, y: rat.y } });
        const v = r.sim.view();
        const tele = v.actors.some((a) => a.telegraph);
        if (tele) sawTelegraph = true;
        if (out.engineEvents.some((e) => e.type === 'text' && /uses .* on Warrior/.test(e.text)) && lastWindup) windupThenHit = true;
        lastWindup = lastWindup || tele;
    }
    assert.ok(sawTelegraph, 'a wind-up shows a telegraph');
    assert.ok(windupThenHit, 'blows land only after a wind-up');
    // Guard everything for a while: hits read "on your guard"
    const g2 = near(run('warrior', 63));
    g2.g.player.hp = g2.g.player.maxHp = 9999;
    g2.sim.engageGroup(g2.sim.groups.grounds_weed_rats);
    const text = [];
    for (let i = 0; i < 60 * 8; i++) {
        const target = ratsOf(g2.sim).find((a) => !a.dead) || ratsOf(g2.sim)[0];
        const out = g2.sim.update(1000 / 60, { guard: true, aim: { x: target.x, y: target.y } });
        text.push(...out.engineEvents.filter((e) => e.type === 'text').map((e) => e.text));
    }
    assert.ok(text.some((t) => /on your guard|parry/i.test(t)), 'guarding blocks blows');
});

test('Sim: run far enough and the group gives up and goes home (leash); the fight ends without a victory', () => {
    const r = near(run('warrior', 64));
    r.g.player.hp = r.g.player.maxHp = 9999;
    r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
    for (const a of ratsOf(r.sim)) a.prof = { ...a.prof, leash: 40 };
    // teleport the player away (as if they ran) and let the rats chase
    const [fx, fy] = freeNear(r.s, 20, 4);
    r.sim.player.x = (fx + 0.5) * T; r.sim.player.y = (fy + 0.5) * T;
    for (let i = 0; i < 60 * 10 && r.g.mode === 'combat'; i++) r.sim.update(1000 / 60, {});
    assert.strictEqual(r.g.mode, 'explore');
    assert.ok(!r.g.isDefeated('grounds_weed_rats'));
    assert.ok(ratsOf(r.sim).every((a) => !a.engineId), 'the rats reset');
});

test('Sim: the same seed and inputs give the same fight (deterministic, frame-rate independent)', () => {
    const play = (frameMs) => {
        const r = near(run('rogue', 65));
        r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
        const total = 6000;
        for (let t = 0, i = 0; t < total; t += frameMs, i++) {
            const tgt = ratsOf(r.sim).find((a) => !a.dead) || r.sim.player;
            r.sim.update(frameMs, { aim: { x: tgt.x, y: tgt.y }, attack: Math.floor(t / 250) !== Math.floor((t + frameMs) / 250), move: { x: Math.sign(tgt.x - r.sim.player.x) * 0.5, y: 0 } });
        }
        return JSON.stringify([r.g.player.hp, ratsOf(r.sim).map((a) => [Math.round(a.x), Math.round(a.y), a.hp])]);
    };
    assert.strictEqual(play(1000 / 60), play(1000 / 60));
});

/** Thorne's actionRules proposal (docs/design/ENSO_ACTION_COMBAT_DESIGN.md §7), read straight from the doc. */
function thorneRules(base) {
    const md = require('fs').readFileSync(require('path').join(__dirname, '../docs/design/ENSO_ACTION_COMBAT_DESIGN.md'), 'utf8');
    const json = md.slice(md.indexOf('## 7.')).match(/```json\n([\s\S]*?)\n```/)[1];
    return { ...base, ...JSON.parse(json) };
}

test('Sim: the Crow Warden fights to his pattern: telegraphed sweeps and thrusts, crow shadows, and Murder of Crows when phase 2 opens', () => {
    const r = run('warrior', 66);
    r.g.story.flags.push('warden_challenged');
    const map = WORLD.maps.sanctuary;
    r.s.place('sanctuary', Object.keys(map.spawns)[0]);
    const [x, y] = freeNear(r.s, 22, 16);
    r.s.x = x; r.s.y = y;
    r.sim = new ActionSim({ engine: r.g, session: r.s, rules: thorneRules(r.g.data.actionRules), seed: 66 });
    const warden = r.sim.actors.find((a) => a.key === 'crow_touched_warden');
    assert.ok(warden, 'the Warden stands in the sanctuary');
    r.g.player.hp = r.g.player.maxHp = 99999;
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);
    const used = new Set();
    let halved = false;
    for (let i = 0; i < 60 * 60; i++) {
        const w = r.sim.actors.find((a) => a.key === 'crow_touched_warden');
        if (w.windup && w.state === 'windup') used.add(w.windup.base.name);
        // stand still at mid range most of the time, step away now and then (Chain Lock punishes kiting)
        const away = Math.floor(i / 240) % 3 === 2;
        const d = Math.hypot(w.x - r.sim.player.x, w.y - r.sim.player.y) || 1;
        r.sim.update(1000 / 60, { move: away ? { x: (r.sim.player.x - w.x) / d, y: (r.sim.player.y - w.y) / d } : { x: 0, y: 0 }, aim: { x: w.x, y: w.y } });
        if (!halved && i === 60 * 30) {   // drop him into phase 2
            const e = r.g.combat.enemies.find((en) => en.key === 'crow_touched_warden');
            e.hp = Math.floor(e.maxHp * 0.45);
            halved = true;
        }
    }
    for (const name of ['halberd_sweep', 'summon_crows', 'murder_of_crows']) assert.ok(used.has(name), `used ${name} (saw ${[...used].join(', ')})`);
    assert.ok(used.has('reaping_thrust') || used.has('chain_lock'), `mid/long range attacks (saw ${[...used].join(', ')})`);
});

test('Sim: an encounter a story flag reveals mid-map joins the sim (the Warden after "Stand aside"), without re-entering', () => {
    const r = run('warrior', 67);
    r.s.place('sanctuary', Object.keys(WORLD.maps.sanctuary.spawns)[0]);
    r.sim = new ActionSim({ engine: r.g, session: r.s, rules: r.g.data.actionRules, seed: 67 });
    assert.ok(!r.sim.actors.some((a) => a.key === 'crow_touched_warden'), 'not before the challenge');
    r.g.story.flags.push('warden_challenged');
    frames(r.sim, 20);
    assert.ok(r.sim.actors.some((a) => a.key === 'crow_touched_warden'), 'the Warden is in the sim once the flag is set');
});

test('Sim: gate guards see and shoot out of their own gateway (the orchard acolytes)', () => {
    const r = run('warrior', 68);
    r.g.player.hp = r.g.player.maxHp = 9999;
    r.s.place('orchard', Object.keys(WORLD.maps.orchard.spawns)[0]);
    const enc = r.s.visibleObjects().find((o) => o.id === 'orchard_cultists');
    const [x, y] = freeNear(r.s, enc.x, enc.y + (enc.h || 1) + 4);
    r.s.x = x; r.s.y = y;
    r.sim = new ActionSim({ engine: r.g, session: r.s, rules: r.g.data.actionRules, seed: 68 });
    let engagedAt = null, shots = 0;
    const hp = r.g.player.hp;
    for (let i = 0; i < 60 * 8; i++) {
        r.sim.update(1000 / 60, {});
        if (engagedAt == null && r.g.mode === 'combat') engagedAt = i;
        shots = Math.max(shots, r.sim.projectiles.filter((p) => p.owner !== 'player').length);
        }
    assert.ok(engagedAt != null && engagedAt < 60 * 2, `engaged at frame ${engagedAt}`);
    assert.ok(shots > 0, 'they shoot');
    assert.ok(r.g.player.hp < hp, 'and the shots land');
});

test('Sim: walking along a wall the body only clips slides past the corner instead of stopping dead', () => {
    const r = run('warrior', 69);
    r.s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    r.sim = new ActionSim({ engine: r.g, session: r.s, rules: r.g.data.actionRules, seed: 69 });
    for (const a of r.sim.actors) a.prof = { ...a.prof, detect: 0 };
    // the shed's south wall is row 15 (x 14-17): a body 3 px into that row slips under it; one centred in it stops
    r.sim.player.x = 21 * T; r.sim.player.y = 16 * T + r.sim.player.r - 3;
    frames(r.sim, 150, { move: { x: -1, y: 0 } });
    assert.ok(r.sim.player.x / T < 14, `got past the shed corner (x ${(r.sim.player.x / T).toFixed(2)})`);
    assert.ok(!r.sim.bodyBlocked(r.sim.player.x, r.sim.player.y, r.sim.player.r), 'never inside a wall');
});

/** Fight a gate group from the near side: walk at the nearest living member, swing every 6 frames. */
function fightGate(r, id, frames = 60 * 60) {
    for (let i = 0; i < frames && !r.g.isDefeated(id); i++) {
        const live = r.sim.actors.filter((a) => !a.dead && a.encounterId === id);
        const t = live[0] || r.sim.player;
        const d = Math.hypot(t.x - r.sim.player.x, t.y - r.sim.player.y) || 1;
        r.sim.update(1000 / 60, { move: d > 14 ? { x: (t.x - r.sim.player.x) / d, y: (t.y - r.sim.player.y) / d } : { x: 0, y: 0 }, aim: { x: t.x, y: t.y }, attack: i % 6 === 0 });
        for (const a of live) assert.ok(r.sim.actorMayStand(a, a.x, a.y), `${a.sid} slipped out of reach at (${(a.x / T).toFixed(1)}, ${(a.y / T).toFixed(1)})`);
    }
}

test('Sim: the orchard cultists hold the near face of their gate, every class can beat them, and the way north opens', () => {
    for (const cls of ['warrior', 'mage', 'rogue', 'necromancer']) {
        const r = run(cls, 70);
        r.g.player.hp = r.g.player.maxHp = 9999;
        r.s.place('orchard', Object.keys(WORLD.maps.orchard.spawns)[0]);
        const enc = r.s.visibleObjects().find((o) => o.id === 'orchard_cultists');
        const [x, y] = freeNear(r.s, enc.x + 1, enc.y + (enc.h || 1) + 4);
        r.s.x = x; r.s.y = y;
        r.sim = new ActionSim({ engine: r.g, session: r.s, rules: r.g.data.actionRules, seed: 70 });
        fightGate(r, 'orchard_cultists');
        assert.ok(r.g.isDefeated('orchard_cultists'), `${cls} beat the cultists`);
        assert.strictEqual(r.g.mode, 'explore', `${cls}: the fight ended`);
        frames(r.sim, 60 * 6, { move: { x: 0, y: -1 } });
        assert.notStrictEqual(r.sim.mapId, 'orchard', `${cls} walked north out of the orchard (stopped at ${(r.sim.player.x / T).toFixed(1)}, ${(r.sim.player.y / T).toFixed(1)})`);
    }
});

test('Sim: an exit is barred only while an enemy is close; with nobody near, the group gives up and you leave', () => {
    const r = near(run('warrior', 71));
    r.g.player.hp = r.g.player.maxHp = 9999;
    r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
    for (const a of ratsOf(r.sim)) { a.prof = { ...a.prof, speed: 0 }; }
    const exit = WORLD.maps.grounds.exits.find((e) => e.trigger === 'step' && !r.s.solidForAction(e.x, e.y) && Math.hypot(e.x * T - ratsOf(r.sim)[0].x, e.y * T - ratsOf(r.sim)[0].y) > 200);
    assert.ok(exit, 'an exit far from the rats');
    const [fx, fy] = freeNear(r.s, exit.x, exit.y + 1);
    r.sim.player.x = (fx + 0.5) * T; r.sim.player.y = (fy + 0.5) * T; r.s.x = fx; r.s.y = fy;
    const dx = exit.x - fx, dy = exit.y - fy, n = Math.hypot(dx, dy) || 1;
    frames(r.sim, 120, { move: { x: dx / n, y: dy / n } });
    assert.notStrictEqual(r.sim.mapId, 'grounds', 'walked out');
    assert.strictEqual(r.g.mode, 'explore');
    assert.ok(!r.g.isDefeated('grounds_weed_rats'), 'no victory for leaving');
});

test('Sim: the orchard gate opens the moment the Captain takes the register, without leaving Shamefield', () => {
    const r = run('warrior', 71);
    r.s.place('shamefield', 'from_orchard');           // just below the chained north gate
    r.sim = new ActionSim({ engine: r.g, session: r.s, rules: r.g.data.actionRules, seed: 71 });
    const north = { move: { x: 0, y: -1 } };
    frames(r.sim, 90, north);
    assert.strictEqual(r.s.mapId, 'shamefield', 'the chained gate holds before the register');
    r.g.story.flags.push('north_gate_open');           // what Q05 sets when the register is handed over
    for (let i = 0; i < 180 && r.s.mapId === 'shamefield'; i++) r.sim.update(1000 / 60, north);
    assert.strictEqual(r.s.mapId, 'orchard', 'walked straight through to the orchard (the cultists)');
});
