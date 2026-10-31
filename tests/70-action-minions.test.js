// Combat v3: Raise Skeleton in the world (docs/design/ENSO_ACTION_COMBAT_DESIGN.md §3 "Skeleton", the seamless
// direction: "a summon appears in the world, follows or defends its owner, and attacks nearby enemies").
// The sim gives the engine's minion a body; the engine keeps the rules (actionMinionStrike, actionEnemyStrike targetId).
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));

const STEP = 1000 / 60;
/** A necromancer beside the Grounds rats, sturdy enough to watch a whole fight, with Soul Energy to summon. */
function necro(seed = 70) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('necromancer'); g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    s.x = 13; s.y = 31;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    const slot = g.ensureSkillBar().indexOf('Raise Skeleton');
    return { g, s, sim, slot };
}
const frames = (sim, n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(STEP, input)); return out; };
const texts = (outs) => outs.flatMap((o) => o.engineEvents).map((e) => e.text || '').filter(Boolean);
const rats = (sim) => sim.actors.filter((a) => a.encounterId === 'grounds_weed_rats');
function summon(r, aim) {
    r.sim.engageGroup(r.sim.groups.grounds_weed_rats);
    r.g.player.resource.current = 5;
    const p = r.sim.player;
    const out = frames(r.sim, 1, { slot: r.slot, aim: aim || { x: p.x + 30, y: p.y } });
    return out.concat(frames(r.sim, 1, { aim: aim || { x: p.x + 30, y: p.y } }));
}

test('Raise Skeleton: a skeleton body rises in the world where you aim (≤ 40 px), with no weapon swing', () => {
    const r = necro();
    const p = r.sim.player;
    const x0 = p.x, y0 = p.y;
    const out = summon(r, { x: x0 + 300, y: y0 });   // aimed far: it rises at most 40 px away
    assert.strictEqual(r.g.combat.minions.length, 1, 'the engine has the skeleton');
    const v = r.sim.view();
    assert.strictEqual(v.minions.length, 1, 'and the world has its body');
    const m = v.minions[0];
    assert.strictEqual(m.key, 'skeleton');
    assert.strictEqual(m.engineId, r.g.combat.minions[0].id);
    assert.ok(Math.hypot(m.x - x0, m.y - y0) <= 40 + 0.01, `rose ${Math.hypot(m.x - x0, m.y - y0)} px away`);
    assert.strictEqual(m.state, 'rise', 'it climbs out of the ground during the 700 ms cast');
    assert.ok(out.some((o) => o.fx.some((f) => f.type === 'summon')), 'a summon effect plays');
    assert.ok(!out.some((o) => o.fx.some((f) => f.type === 'swing')), 'not a weapon swing');
    assert.strictEqual(v.player.attack.shape.shape, 'summon', 'the HUD sees a summon cast (ui/world-ui.js draws no swing arc for it)');
    assert.ok(r.sim.minions.every((x) => !r.sim.bodyBlocked(x.x, x.y, x.r)), 'on walkable ground');
});

test('Raise Skeleton: the skeleton fights the enemies near you through the engine (Bone Club), not on a hidden clock', () => {
    const r = necro();
    summon(r);
    // The engine alone never swings for it in an action fight: only the sim's actionMinionStrike does.
    const hpBefore = r.g.combat.enemies.map((e) => e.hp);
    const calls = [];
    const real = r.g.actionMinionStrike.bind(r.g);
    r.g.actionMinionStrike = (id, t) => { calls.push(t); return real(id, t); };
    const ticked = [];
    for (let i = 0; i < 300; i++) ticked.push(...r.g.tick(STEP));   // 5 s of the engine's clock alone
    assert.ok(!texts([{ engineEvents: ticked }]).some((t) => /Bone Club/.test(t)), 'engine.tick never runs a minion turn');
    assert.deepStrictEqual(r.g.combat.enemies.map((e) => e.hp), hpBefore);
    const log = texts(frames(r.sim, 900));
    assert.ok(calls.some((t) => t != null), 'the sim struck an enemy with the skeleton');
    assert.ok(log.some((t) => /Skeleton uses Bone Club on Rust Rat/.test(t)), log.filter((t) => /Skeleton/.test(t)).join(' | '));
});

test('Raise Skeleton: enemies go for the skeleton when it is the nearer body, and their blows land on it', () => {
    const r = necro();
    summon(r);
    frames(r.sim, 50);   // risen
    const m = r.sim.minions[0];
    const rat = rats(r.sim).find((a) => !a.dead && a.engineId);
    const p = r.sim.player;
    m.x = p.x + 40; m.y = p.y; rat.x = m.x + 8; rat.y = m.y; rat.foe = null;
    assert.strictEqual(r.sim.foeOf(rat), m, 'the rat picks the skeleton beside it over the player 48 px away');
    const hp = { player: r.g.player.hp, minion: r.g.combat.minions[0].hp };
    r.g.actionEnemyWindup(rat.engineId);
    rat.windup = { atk: {}, foe: m };
    r.sim.strikeBodies(rat, (b) => b === m, {});
    assert.strictEqual(r.g.player.hp, hp.player, 'the player was not hit');
    assert.ok(r.g.combat.minions[0].hp < hp.minion, 'the skeleton took the blow');
    // a blow that reaches only the player still hits the player
    r.g.actionEnemyWindup(rat.engineId);
    r.sim.strikeBodies(rat, (b) => b === p, {});
    assert.ok(r.g.player.hp < hp.player);
});

test('Raise Skeleton: it follows you, and catches up by teleporting when left 220 px behind', () => {
    const r = necro();
    summon(r);
    const m = r.sim.minions[0];
    for (const a of rats(r.sim)) a.dead = true;   // nothing to fight: just follow
    r.sim.liveActors = () => [];
    frames(r.sim, 60);
    const p = r.sim.player;
    m.x = p.x + 60; m.y = p.y;
    if (r.sim.bodyBlocked(m.x, m.y, m.r)) { m.x = p.x; m.y = p.y + 60; }
    frames(r.sim, 120);
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    assert.ok(d <= 45, `walked back to within the follow band (${d.toFixed(1)} px)`);
    m.x = p.x + 400; m.y = p.y;
    const out = frames(r.sim, 1);
    assert.ok(out[0].fx.some((f) => f.type === 'teleport'));
    assert.ok(Math.hypot(m.x - p.x, m.y - p.y) <= 30);
});

test('Raise Skeleton: when it dies its bones fall apart', () => {
    const r = necro();
    summon(r);
    frames(r.sim, 50);
    r.g.combat.minions[0].hp = 0;
    const out = frames(r.sim, 1);
    assert.ok(out[0].fx.some((f) => f.type === 'crumble' && f.key === 'skeleton'));
    assert.strictEqual(r.sim.liveMinions().length, 0);
    assert.strictEqual(r.sim.view().minions[0].state, 'dead', 'the body stays to fall apart (ui: AFX.crumble)');
    frames(r.sim, 100);
    assert.strictEqual(r.sim.view().minions.length, 0, 'gone once it has turned to dust');
});

/** Win the rats fight with the skeleton alive: kill them through the engine. */
function winFight(r) {
    for (const e of r.g.combat.enemies) { e.hp = 1; }
    for (const e of r.g.combat.enemies.slice()) if (r.g.actionActive()) r.g.actionMinionStrike(r.g.combat.minions[0].id, e.id);
    frames(r.sim, 2);
}

test('Followers: the skeleton outlives the fight, follows you, then crumbles after 60 s without a fight', () => {
    const r = necro();
    summon(r);
    frames(r.sim, 50);
    const id = r.g.combat.minions[0].id;
    r.g.combat.minions[0].atk = 999;   // one club per rat
    winFight(r);
    assert.strictEqual(r.g.mode, 'explore', 'the fight is over');
    assert.deepStrictEqual(r.g.world.followers.map((m) => m.id), [id], 'kept in world.followers (saved, snapshotted)');
    const v = r.sim.view();
    assert.strictEqual(v.minions.length, 1);
    assert.strictEqual(v.minions[0].engineId, id);
    assert.ok(v.minions[0].state !== 'dead');
    const linger = r.g.data.actionRules.summons.lingerOutOfCombatMs;
    assert.strictEqual(linger, 60000);
    assert.ok(Math.abs(v.minions[0].timeLeftMs - linger) < 100, `timer started (${v.minions[0].timeLeftMs})`);
    frames(r.sim, Math.floor((linger - 1000) / STEP));
    assert.strictEqual(r.sim.liveMinions().length, 1, 'still there at 59 s');
    assert.ok(r.sim.view().minions[0].timeLeftMs <= 1100);
    const out = frames(r.sim, 90);
    assert.ok(out.some((o) => o.fx.some((f) => f.type === 'crumble')), 'it falls apart');
    assert.ok(texts(out).some((t) => /Skeleton crumbles to dust/.test(t)));
    assert.strictEqual(r.g.world.followers.length, 0);
    assert.strictEqual(r.sim.liveMinions().length, 0);
});

test('Followers: a new fight brings the same skeleton back in (same id and HP) and resets its timer', () => {
    const r = necro();
    summon(r);
    frames(r.sim, 50);
    const m0 = r.g.combat.minions[0];
    m0.atk = 999; m0.hp = 9;
    winFight(r);
    frames(r.sim, 600);   // 10 s of calm
    const g = r.g;
    // engage another group: the follower joins it
    const res = g.actionEngage('test_group', ['rust_rat'], null, null);
    assert.ok(res.ok, JSON.stringify(res.error));
    assert.deepStrictEqual(g.combat.minions.map((m) => [m.id, m.hp]), [[m0.id, 9]]);
    assert.ok(texts([{ engineEvents: res.events }]).some((t) => /Skeleton joins the fight/.test(t)));
    assert.strictEqual(g.world.followers.length, 0, 'in the fight it lives in combat.minions');
    frames(r.sim, 1);
    assert.strictEqual(r.sim.liveMinions().length, 1, 'the same body carries on');
    assert.strictEqual(r.sim.view().minions[0].timeLeftMs, null, 'no timer in a fight');
    // a fresh summon in that fight gets a new id
    g.player.resource.current = 5;
    g.combat.rt.cooldowns = {}; g.combat.rt.gcdUntil = 0;
    const cast = g.actionCast('Raise Skeleton');
    assert.ok(cast.ok, JSON.stringify(cast.error));
    const ids = g.combat.minions.map((m) => m.id);
    assert.strictEqual(new Set(ids).size, ids.length, `ids never repeat (${ids})`);
    assert.strictEqual(g.actionDismissFollowers().error.code, 'IN_COMBAT');
});

test('Followers: falling in battle scatters them', () => {
    const r = necro();
    summon(r);
    frames(r.sim, 50);
    r.g.combat.minions[0].atk = 999;
    winFight(r);
    assert.strictEqual(r.g.world.followers.length, 1);
    r.g.actionEngage('test_group', ['rust_rat'], null, null);
    r.g.player.hp = 0;
    r.g.checkBattleEnd();
    assert.strictEqual(r.g.mode, 'explore');
    assert.strictEqual(r.g.world.followers.length, 0);
});

test('Raise Skeleton out of a fight: it rises and follows you (paid, no swing); without Soul Energy it is refused', () => {
    const r = necro();
    r.sim.groups = {}; r.sim.actors = [];   // nobody near
    r.g.player.resource.current = 1;
    let out = frames(r.sim, 1, { slot: r.slot });
    assert.ok(out[0].fx.some((f) => f.type === 'refused' && f.code === 'NOT_ENOUGH_RESOURCE'));
    assert.strictEqual(r.sim.player.attack, null);
    r.g.player.resource.current = 5;
    out = frames(r.sim, 2, { slot: r.slot });
    assert.strictEqual(r.g.player.resource.current, 3, 'paid 2 Soul Energy');
    assert.strictEqual(r.g.world.followers.length, 1);
    assert.strictEqual(r.sim.liveMinions().length, 1, 'its body rose');
    assert.ok(out.some((o) => o.fx.some((f) => f.type === 'summon')));
    assert.ok(!out.some((o) => o.fx.some((f) => f.type === 'swing')), 'no weapon swing');
    assert.strictEqual(r.sim.player.attack.shape.shape, 'summon');
    assert.ok(r.sim.view().minions[0].timeLeftMs > 59000, 'the follower timer runs');
});

test('actionMinionStrike: the same rules path, with refusals for a bad minion or target', () => {
    const r = necro();
    summon(r);
    const id = r.g.combat.minions[0].id;
    assert.strictEqual(r.g.actionMinionStrike('minion_99', null).error.code, 'INVALID_TARGET');
    assert.strictEqual(r.g.actionMinionStrike(id, 'enemy_99').error.code, 'INVALID_TARGET');
    const miss = r.g.actionMinionStrike(id, null);
    assert.ok(miss.ok && miss.result === 'miss');
    const foe = r.g.combat.enemies.find((e) => e.hp > 0);
    const before = foe.hp;
    const hit = r.g.actionMinionStrike(id, foe.id);
    assert.ok(hit.ok && hit.result === 'hit');
    assert.ok(foe.hp < before);
    const v = r.g.actionView();
    assert.deepStrictEqual(Object.keys(v.minions[0]).sort(), ['hp', 'id', 'maxHp', 'name', 'speedMult', 'statuses', 'stunned', 'summonType', 'taunting'].sort());
});

test('Minion bodies: a summon type without its own profile (Raise Ghoul) borrows the skeleton profile; the art knows both', () => {
    const r = necro();
    const prof = r.sim.minionProfile('ghoul');
    assert.strictEqual(prof, r.g.data.actionRules.skillShapes.bySkill['Raise Skeleton'].minion);
    const HD = require('../ui/battle-hd.js');
    assert.strictEqual(HD.CREATURE_FOR.skeleton, 'skeleton');
    assert.strictEqual(typeof HD.creatures.skeleton, 'function');
    assert.strictEqual(HD.CREATURE_FOR.ghoul, 'ghoul');
});

test('Crumble art: the bones drop, lie in a heap, then turn to dust and are gone (headless canvas probe)', () => {
    const AFX = require('../ui/action-fx.js');
    const rects = [];
    const g = { save() {}, restore() {}, set fillStyle(v) {}, set globalAlpha(v) { this.a = v; }, get globalAlpha() { return this.a; }, fillRect(x, y, w, h) { rects.push({ x, y, w, h, a: this.a }); } };
    const at = (t) => { rects.length = 0; AFX.crumble(g, 'skeleton', 100, 100, t); return rects.filter((r) => r.a > 0).slice(); };
    const start = at(0), lying = at(700), dust = at(1300), end = at(AFX.CRUMBLE_MS);
    assert.ok(Math.min(...start.map((r) => r.y)) <= 100 - 20, 'it starts as a standing skeleton');
    assert.ok(Math.min(...lying.map((r) => r.y)) >= 100 - 8, 'then lies in a heap on the ground');
    assert.ok(dust.length > lying.length, 'dust rises off the bones');
    assert.strictEqual(end.length, 0, 'nothing left at the end');
});
