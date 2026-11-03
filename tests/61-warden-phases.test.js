// Crow Warden phases 2 and 3 (Tokelo, 2026-11-02; docs/design/CROW_WARDEN_PHASES.md): Guardian's Resolve,
// Reaper's Dance, Marked Prey and the phase 3 crow storms, on the real sim + engine + data.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));

const STEP = 1000 / 60;
const freeNear = (s, x, y) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!s.solidForAction(x + dx, y + dy) && !s.exitAt(x + dx, y + dy)) return [x + dx, y + dy]; throw new Error('no free cell'); };
const frames = (sim, n, input = {}) => { for (let i = 0; i < n; i++) sim.update(STEP, typeof input === 'function' ? input(i) : input); };

/** A level 1 hero in the sanctuary, engaged with the Warden. */
function fight(cls = 'warrior', seed = 61, { illusions = false } = {}) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    s.place('sanctuary', Object.keys(WORLD.maps.sanctuary.spawns)[0]);
    const [x, y] = freeNear(s, 22, 18);
    s.x = x; s.y = y;
    g.story.flags.push('warden_challenged');
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    frames(sim, 20);
    g.player.hp = g.player.maxHp = 99999;
    sim.engageGroup(sim.groups.sanctuary_warden);
    frames(sim, 2);
    const w = sim.actors.find((a) => a.key === 'crow_touched_warden');
    const e = () => g.combat.enemies.find((en) => en.key === 'crow_touched_warden');
    w.illusionUsed = !illusions;   // Crow's Illusion only in the tests about it (its false Wardens would muddle the rest)
    return { g, s, sim, w, e };
}
const boss = (g) => g.data.actionRules.bosses.crow_touched_warden;
/** Put the Warden at a share of his HP and let the sim see it. */
function setHpPct(r, pct) { r.e().hp = Math.floor(r.e().maxHp * pct); frames(r.sim, 1); }
/** Start one of his attacks now (as pickAttack would). */
function startAttack(r, name) {
    Object.assign(r.w, { state: 'chase', windup: null });
    delete r.g.combat.action.windups[r.e().id];
    r.sim.enemyWindup(r.w, { name, ...boss(r.g).attacks[name] });
}

test('Warden phases: phase 2 opens at 50% and keeps every base attack; phase 3 opens at 25% with the crow storms', () => {
    const r = fight();
    const names = () => r.sim.attacksOf(r.w).map((x) => x.name);
    for (const n of ['halberd_sweep', 'reaping_thrust', 'chain_lock', 'summon_crows']) assert.ok(names().includes(n), `phase 1 has ${n}`);
    assert.ok(!names().includes('reapers_dance') && !names().includes('crow_storm'));
    setHpPct(r, 0.49);
    assert.strictEqual(r.w.phaseIdx, 1);
    for (const n of ['halberd_sweep', 'reaping_thrust', 'chain_lock', 'summon_crows', 'murder_of_crows', 'reapers_dance', 'marked_prey']) assert.ok(names().includes(n), `phase 2 has ${n}`);
    assert.ok(!names().includes('crow_storm'), 'no crow storm before 25%');
    setHpPct(r, 0.26);
    assert.strictEqual(r.w.phaseIdx, 1, 'still phase 2 at 26%');
    setHpPct(r, 0.24);
    assert.strictEqual(r.w.phaseIdx, 2);
    assert.ok(names().includes('crow_storm') && names().includes('halberd_sweep') && names().includes('reapers_dance'));
    assert.ok(!names().includes('chain_lock'), 'the desperation stage still drops Chain Lock');
    assert.strictEqual(r.sim.bossPhase(r.w).sweepCombo.hits, 2, 'phase 3 keeps the 2-hit sweep from phase 2');
    assert.strictEqual(r.w.openWith, 'crow_storm', 'phase 3 opens with a crow storm');
});

test("Guardian's Resolve: once at 50%, 6 s of 20% less damage from every source (DoTs and summons too), then he can be staggered", () => {
    const r = fight();
    const en = r.e();
    const before = en.hp;
    assert.strictEqual(r.g.damage(en, 10, r.g.player), 10, 'full damage before the stance');
    setHpPct(r, 0.49);
    assert.ok(r.w.resolve && r.sim.resolveState(r.w) === 'stance');
    assert.ok(r.g.actionView().enemies[0].statuses.some((s) => s.name === "Guardian's Resolve"), 'the HUD sees the stance');
    // 20% off, exactly, even over small ticks (the fraction carries)
    let dealt = 0;
    for (let i = 0; i < 10; i++) dealt += r.g.damage(en, 10, r.g.player);
    assert.strictEqual(dealt, 80);
    let ticks = 0;
    for (let i = 0; i < 10; i++) ticks += r.g.damage(en, 2, null);   // a DoT tick has no attacker
    assert.strictEqual(ticks, 16);
    // slower steps and deliberate (slower) wind-ups
    assert.ok(r.w.speedMult <= 0.61, `slowed (${r.w.speedMult})`);
    startAttack(r, 'halberd_sweep');
    assert.strictEqual(r.w.stateEnd - r.sim.now, Math.round(700 * 1.4), 'wind-up × 1.4 in the stance');
    Object.assign(r.w, { state: 'chase', windup: null }); delete r.g.combat.action.windups[en.id];
    // after 6 s: full damage again, and the first hit staggers him
    r.w.attackReadyAt = Infinity;
    frames(r.sim, 6 * 60 + 2);
    assert.strictEqual(r.sim.resolveState(r.w), 'vulnerable');
    assert.strictEqual(r.g.damage(en, 10, r.g.player), 10, 'full damage after the stance');
    r.sim.bossHit(r.w);
    assert.strictEqual(r.w.state, 'stagger', 'staggered by the first hit in the window');
    assert.strictEqual(r.sim.resolveState(r.w), null, 'only one stagger');
    // never again in this fight
    en.hp = Math.floor(en.maxHp * 0.9); frames(r.sim, 1);
    setHpPct(r, 0.45);
    assert.ok(!r.w.resolve, 'Guardian\'s Resolve is once per fight');
    assert.ok(before > 0);
});

test("Reaper's Dance: wide sweep, reverse sweep, then a heavy thrust at you with a long recovery", () => {
    const r = fight();
    setHpPct(r, 0.49);
    frames(r.sim, 6 * 60 + 2.5 * 60);   // let the stance and its window pass
    r.w.attackReadyAt = Infinity;
    startAttack(r, 'reapers_dance');
    const steps = [];
    let recovery = null;
    for (let i = 0; i < 60 * 8 && recovery == null; i++) {
        if (r.w.state === 'windup' && (!steps.length || steps[steps.length - 1].step !== r.w.windup.step)) steps.push({ step: r.w.windup.step, shape: r.w.windup.atk.shape, reverse: !!r.w.windup.atk.reverse });
        frames(r.sim, 1);
        if (r.w.state === 'recover') recovery = r.w.stateEnd - r.sim.now;
    }
    assert.deepStrictEqual(steps.map((x) => x.shape), ['arc', 'arc', 'line']);
    assert.ok(steps[1].reverse, 'the second sweep goes back the other way');
    assert.ok(recovery >= 1700, `long recovery after the thrust (${recovery} ms)`);
});

test('Marked Prey: the crow follows its prey, locks, then three crows dive at the locked spot; stepping out dodges it', () => {
    const run = (moveAfterLock) => {
        const r = fight('warrior', 62);
        setHpPct(r, 0.49);
        frames(r.sim, 9 * 60);
        r.w.attackReadyAt = Infinity;
        startAttack(r, 'marked_prey');
        assert.strictEqual(r.w.windup.foe, r.sim.player, 'no summons: the player is marked');
        const hp0 = r.g.player.hp;
        const p = r.sim.player;
        frames(r.sim, 20, { move: { x: 1, y: 0 } });   // the mark follows while it isn't locked
        assert.ok(Math.abs(r.w.windup.mark.x - p.x) < 1, 'the mark follows');
        while (!r.w.windup.mark.locked) frames(r.sim, 1);
        const lockedAt = { x: r.w.windup.mark.x, y: r.w.windup.mark.y };
        const dives = [];
        for (let i = 0; i < 60 && r.w.state === 'windup'; i++) { r.sim.update(STEP, moveAfterLock ? { move: { x: -1, y: 0 } } : {}); }
        assert.deepStrictEqual({ x: r.w.windup.mark.x, y: r.w.windup.mark.y }, lockedAt, 'locked: it no longer follows');
        const out = r.sim.update(STEP, {});
        dives.push(...out.fx.filter((f) => f.type === 'crow_dive'));
        return { lost: hp0 - r.g.player.hp, moved: Math.hypot(p.x - lockedAt.x, p.y - lockedAt.y), dives };
    };
    const stay = run(false), dodge = run(true);
    assert.ok(stay.lost > 0, 'standing in it hurts');
    assert.strictEqual(dodge.lost, 0, `stepping out after the lock is safe (moved ${dodge.moved.toFixed(0)} px)`);
});

test('Marked Prey: with summons out it alternates between one of them and you', () => {
    const r = fight('necromancer', 63);
    r.g.player.resource.current = 99;
    r.sim.input.aim = { x: r.sim.player.x + 10, y: r.sim.player.y };
    r.sim.update(STEP, { slot: r.g.ensureSkillBar().indexOf('Raise Skeleton') });
    frames(r.sim, 90);
    assert.ok(r.sim.liveMinions().length >= 1, 'a skeleton rose');
    setHpPct(r, 0.49);
    r.w.attackReadyAt = Infinity;
    const picks = [];
    for (let k = 0; k < 2; k++) { startAttack(r, 'marked_prey'); picks.push(r.w.windup.foe === r.sim.player ? 'player' : 'minion'); }
    assert.deepStrictEqual(picks, ['minion', 'player']);
});

test('Crow storms: 5 patterns in a fixed cycle, each leaves somewhere safe, and a rest follows each one', () => {
    const r = fight();
    setHpPct(r, 0.24);
    const b = boss(r.g);
    assert.strictEqual(b.crowStorms.length, 5);
    const seen = [];
    const R = r.sim.arenaRect(r.w);
    for (let k = 0; k < 7; k++) {
        startAttack(r, 'crow_storm');
        const st = r.w.windup.storm;
        seen.push(st.name);
        // somewhere on the floor no zone touches a body (radius 6)
        const body = { r: 6 };
        let safe = 0;
        for (let y = R.y0 + 8; y < R.y1; y += 16) for (let x = R.x0 + 8; x < R.x1; x += 16) {
            if (r.s.solidForAction(Math.floor(x / 16), Math.floor(y / 16))) continue;
            if (!st.shapes.some((sh) => r.sim.inShape(sh, { ...body, x, y }))) safe++;
        }
        assert.ok(safe >= 20, `${st.name} leaves safe ground (${safe} cells)`);
        assert.ok(st.shapes.length >= 1 && r.sim.enemyShape(r.w).kind === 'multi', 'the telegraph shows the zones');
    }
    assert.deepStrictEqual(seen, [...b.crowStorms.map((x) => x.name), b.crowStorms[0].name, b.crowStorms[1].name], 'cycles in order');
    // not spammable: the storm's own cooldown, and every other crow special waits out its quiet time
    startAttack(r, 'crow_storm');
    const atk = b.attacks.crow_storm;
    assert.ok(r.w.atkReady.crow_storm - r.sim.now >= atk.cooldownMs);
    for (const n of ['marked_prey', 'murder_of_crows', 'summon_crows', 'reapers_dance']) assert.ok(r.w.atkReady[n] - r.sim.now >= atk.windupMs + atk.quietMs - 1, `${n} waits after a storm`);
});

test('Crow storm: a body in a zone is hit when it lands, a body on safe ground is not', () => {
    const hit = (safe) => {
        const r = fight('warrior', 64);
        setHpPct(r, 0.24);
        frames(r.sim, 8 * 60);
        r.w.attackReadyAt = Infinity;
        r.w.stormIdx = 4;   // Corners: four corner spots and the centre
        startAttack(r, 'crow_storm');
        const R = r.sim.arenaRect(r.w);
        const p = r.sim.player;
        const spot = safe ? { x: R.x0 + 0.5 * (R.x1 - R.x0), y: R.y0 + 0.2 * (R.y1 - R.y0) } : { x: R.x0 + 0.15 * (R.x1 - R.x0), y: R.y0 + 0.2 * (R.y1 - R.y0) };
        p.x = spot.x; p.y = spot.y;
        const hp0 = r.g.player.hp;
        for (let i = 0; i < 60 * 3 && r.w.state !== 'recover'; i++) { p.x = spot.x; p.y = spot.y; r.sim.update(STEP, {}); }
        return hp0 - r.g.player.hp;
    };
    assert.ok(hit(false) > 0, 'standing in a corner spot is hit');
    assert.strictEqual(hit(true), 0, 'the top edge between the spots is safe');
});

test('Crow storms chain: 2-3 patterns back to back (the later ones with a crow mark on you), then the rest window', () => {
    const lengths = new Set();
    for (const seed of [70, 71, 72, 73, 74, 75]) {
        const r = fight('warrior', seed);
        setHpPct(r, 0.24);
        frames(r.sim, 8 * 60);
        r.w.attackReadyAt = Infinity;
        startAttack(r, 'crow_storm');
        const storms = [];
        let lastStep = -1, rec = null;
        for (let i = 0; i < 60 * 12 && rec == null; i++) {
            if (r.w.state === 'windup' && r.w.windup.step !== lastStep) { lastStep = r.w.windup.step; storms.push({ name: r.w.windup.storm.name, rider: !!r.w.windup.mark }); }
            frames(r.sim, 1);
            if (r.w.state === 'recover' && r.w.windup.step === r.w.windup.base.combo.length - 1) rec = r.w.stateEnd - r.sim.now;
        }
        assert.ok(storms.length >= 2 && storms.length <= 3, `chain of ${storms.length}`);
        lengths.add(storms.length);
        assert.strictEqual(new Set(storms.map((x) => x.name)).size, storms.length, 'each link is the next pattern in the cycle');
        assert.ok(!storms[0].rider && storms.slice(1).every((x) => x.rider), 'the later storms carry a crow mark');
        assert.ok(rec >= 1700, `the rest after the chain (${rec} ms)`);
        for (const n of ['marked_prey', 'murder_of_crows']) assert.ok(r.w.atkReady[n] - r.sim.now >= 3000, `${n} waits during the rest`);
    }
    assert.ok(lengths.has(2) && lengths.has(3), `both chain lengths happen (${[...lengths]})`);
});

test('Below 25% Murder of Crows and Marked Prey come faster and more often', () => {
    const r = fight();
    setHpPct(r, 0.4);
    const p2 = Object.fromEntries(r.sim.attacksOf(r.w).map((x) => [x.name, x]));
    setHpPct(r, 0.24);
    const p3 = Object.fromEntries(r.sim.attacksOf(r.w).map((x) => [x.name, x]));
    for (const n of ['murder_of_crows', 'marked_prey']) {
        assert.ok(p3[n].cooldownMs < p2[n].cooldownMs, `${n} cooldown ${p2[n].cooldownMs} -> ${p3[n].cooldownMs}`);
        assert.ok(p3[n].windupMs < p2[n].windupMs, `${n} wind-up ${p2[n].windupMs} -> ${p3[n].windupMs}`);
    }
});

test("Crow's Illusion: at 30% four identical false Wardens appear; they have 2 HP, hit as hard as him, give nothing, and go when he falls", () => {
    const r = fight('warrior', 80, { illusions: true });
    setHpPct(r, 0.35);
    assert.strictEqual(r.sim.actors.filter((a) => a.illusionOf).length, 0, 'none above 30%');
    setHpPct(r, 0.29);
    const fakes = r.sim.actors.filter((a) => a.illusionOf === r.w);
    assert.strictEqual(fakes.length, 4);
    const real = r.e();
    const clones = r.g.combat.enemies.filter((e) => e.illusion);
    assert.strictEqual(clones.length, 4);
    for (const c of clones) {
        assert.strictEqual(c.hp, 2);
        assert.strictEqual(c.name, real.name, 'same name in the log');
        assert.deepStrictEqual([c.atk, c.def, c.critChance, c.skills.map((s) => s.name)], [real.atk, real.def, real.critChance, real.skills.map((s) => s.name)], 'same damage as the real one');
    }
    // in the view they look the same: same key, boss bar with his HP
    const view = r.sim.view().actors.filter((a) => a.key === 'crow_touched_warden' && a.state !== 'dead');
    assert.strictEqual(view.length, 5);
    for (const v of view) assert.deepStrictEqual([v.boss, v.hp, v.maxHp], [true, real.hp, real.maxHp]);
    // the real one stands on one of 5 separate spots
    const pts = [r.w, ...fakes];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) assert.ok(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) > 20, 'spread out');
    // a false one dies to a single hit and gives no XP; the real one barely notices
    const xp0 = r.g.player.xp;
    r.g.damage(clones[0], 50, r.g.player);
    frames(r.sim, 2);
    assert.ok(fakes[0].dead, 'one hit pops it');
    assert.strictEqual(r.g.player.xp, xp0);
    assert.strictEqual(r.g.mode, 'combat');
    // they swing, they don't call crows
    assert.deepStrictEqual(r.sim.attacksOf(fakes[1]).map((x) => x.name).sort(), ['halberd_sweep', 'reaping_thrust']);
    // only once per fight
    r.e().hp = Math.floor(r.e().maxHp * 0.5); frames(r.sim, 1); setHpPct(r, 0.28);
    assert.strictEqual(r.g.combat.enemies.filter((e) => e.illusion).length, 4, 'no second set');
    // he falls: the rest scatter and the fight is won
    r.g.damage(r.e(), 99999, r.g.player);
    r.g.checkBattleEnd();
    frames(r.sim, 3);
    assert.notStrictEqual(r.g.mode, 'combat', 'the fight ends with him');
    assert.ok(r.g.isDefeated('sanctuary_warden'));
});

test("Crow's Illusion: the false Wardens scatter after their time runs out", () => {
    const r = fight('warrior', 81, { illusions: true });
    setHpPct(r, 0.29);
    assert.strictEqual(r.sim.actors.filter((a) => a.illusionOf && !a.dead).length, 4);
    frames(r.sim, 26 * 60);
    assert.strictEqual(r.sim.actors.filter((a) => a.illusionOf && !a.dead).length, 0);
    assert.strictEqual(r.g.combat.enemies.filter((e) => e.illusion && e.hp > 0).length, 0);
});
