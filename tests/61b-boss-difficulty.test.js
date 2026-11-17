// Boss difficulty (Tokelo, 2026-11-17: "make the bosses more difficult, think Dark Souls"; docs/design/BOSS_DIFFICULTY.md):
// the post-Warden standard in data, mob pursuit, and wide bosses that path only where their body fits.
const { test, assert, GameEngine } = require('./helpers.js');
const data = require('../src/data.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));
const STEP = 1000 / 60;
const A = data.actionRules;

const POST_WARDEN = ['bjarki_grave_bound', 'binding_echo', 'peat_king'];

test('Post-Warden bosses: each hits hard from the first blow, rages for good, and has a gap-closer that answers a heal', () => {
    const warden = A.bosses.crow_touched_warden;
    for (const key of POST_WARDEN) {
        const b = A.bosses[key];
        assert.ok(b, `${key} has a boss entry`);
        assert.ok(b.damageMult > 1 && b.hpMult > 1, `${key}: harder from the first blow`);
        const rg = b.rage;
        assert.ok(rg && rg.atHpPct > 0 && rg.atHpPct < 1, `${key}: rages`);
        assert.ok(b.damageMult * rg.damageMult >= (warden.damageMult || 1) * warden.rage.damageMult, `${key}: an enraged blow lands no softer than the Warden's`);
        const moves = (rg.add || []).filter((x) => typeof x === 'object');
        assert.ok(moves.length >= 2, `${key}: new moves in its rage`);
        const names = moves.map((x) => x.name).concat((A.enemies[key].attacks || []).map((x) => x.name));
        assert.ok(names.includes(rg.punishHeal), `${key}: punishHeal '${rg.punishHeal}' is one of its moves`);
        assert.ok(!rg.openWith || names.includes(rg.openWith), `${key}: openWith '${rg.openWith}' is one of its moves`);
        assert.ok(moves.some((x) => x.shape === 'line' && x.reach >= 250 && x.lunge >= 200), `${key}: a charge across its arena`);
        for (const m of moves) for (const step of m.combo || [m]) {
            const w = Math.max(rg.minWindupMs || 0, Math.round((step.windupMs || m.windupMs) * (rg.windupMult || 1)));
            assert.ok(w >= 480, `${key} ${m.name}: every tell stays readable (${w} ms)`);
            assert.ok(data.enemies[key].skills.some((s) => s.name === m.skill), `${key} ${m.name}: uses a skill it has (${m.skill})`);
        }
    }
});

/** A level 6 hero next to an encounter on a Chapter Two map, engaged. */
function bossFight(key, map, encounter, flags, seed = 61) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    for (const f of flags) g.story.flags.push(f);
    const s = new WorldSession(WORLD, { engine: g });
    s.place(map, Object.keys(WORLD.maps[map].spawns)[0]);
    const enc = WORLD.maps[map].encounters.find((e) => e.id === encounter);
    for (let r = 0; r < 10; r++) { let done = false; for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r && !done; dx++) if (!s.solidForAction(enc.x + 5 + dx, enc.y + 3 + dy) && !s.exitAt(enc.x + 5 + dx, enc.y + 3 + dy)) { s.x = enc.x + 5 + dx; s.y = enc.y + 3 + dy; done = true; } if (done) break; }
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    for (let i = 0; i < 20; i++) sim.update(STEP, {});
    g.player.hp = g.player.maxHp = 99999;
    sim.engageGroup(sim.groups[encounter]);
    for (let i = 0; i < 2; i++) sim.update(STEP, {});
    const b = sim.actors.find((a) => a.key === key && a.encounterId === encounter);
    const e = () => g.combat.enemies.find((x) => x.id === b.engineId);
    return { g, s, sim, b, e };
}

test('Bjarki: below his rage threshold the hearth-charge opens, his kit grows, and his blows land harder', () => {
    const r = bossFight('bjarki_grave_bound', 'bjarki_barrow', 'barrow_bjarki_bare', ['barrow_anchors_1', 'barrow_anchors_2', 'barrow_anchors_3']);
    const cfg = A.bosses.bjarki_grave_bound;
    assert.strictEqual(r.e().maxHp, Math.round(data.enemies.bjarki_grave_bound.maxHp * cfg.hpMult));
    assert.strictEqual(r.sim.strikeMult(r.b, {}), cfg.damageMult);
    assert.ok(!r.sim.attacksOf(r.b).some((x) => x.name === 'Hearth-Charge'));
    r.e().hp = Math.floor(r.e().maxHp * (cfg.rage.atHpPct - 0.01));
    r.sim.update(STEP, {});
    assert.ok(r.b.raged);
    assert.strictEqual(r.b.openWith, 'Hearth-Charge');
    assert.ok(r.sim.attacksOf(r.b).some((x) => x.name === 'Hearth-Charge') && r.sim.attacksOf(r.b).some((x) => x.name === 'Grave Blade'), 'new moves on top of the old ones');
    assert.ok(Math.abs(r.sim.strikeMult(r.b, {}) - cfg.damageMult * cfg.rage.damageMult) < 1e-9);
});

test('Pursuit: an engaged enemy far behind you runs you down faster than you walk; close in it keeps its own pace', () => {
    const pu = A.combat.pursuit;
    assert.ok(pu.speed > A.player.speed && pu.speed < A.player.speed * A.player.sprintMult, 'faster than a walk, slower than a sprint');
    const r = bossFight('bjarki_grave_bound', 'bjarki_barrow', 'barrow_bjarki_bare', ['barrow_anchors_3']);
    const slow = { prof: { speed: 40 }, speedMult: 1 };
    assert.strictEqual(r.sim.pursuitMult(slow, pu.beyondPx + 10), pu.speed / 40);
    assert.strictEqual(r.sim.pursuitMult(slow, pu.beyondPx - 10), 1, 'near its range: its own pace');
    assert.strictEqual(r.sim.pursuitMult({ prof: { speed: 92 }, speedMult: 1 }, 500), 1, 'a wolf is already faster');
    assert.strictEqual(r.sim.pursuitMult({ prof: { speed: 0 }, speedMult: 1 }, 500), 1, 'a body that does not walk stays put');
    assert.strictEqual(r.sim.pursuitMult({ prof: { speed: 40, boss: true }, speedMult: 1 }, 500), 1, 'bosses keep their own pace');
});

test('Wide bosses path only where their body fits (QA #18): no path through a one-tile gap', () => {
    const r = bossFight('bjarki_grave_bound', 'bjarki_barrow', 'barrow_bjarki_bare', ['barrow_anchors_3']);
    const T = r.sim.T;
    assert.ok(r.b.r > T / 2, 'Bjarki is wider than a tile');
    const path = r.sim.findPath(r.b, r.sim.player);
    for (const c of path || []) assert.ok(!r.sim.bodyBlocked(c.x, c.y, r.b.r, r.sim.gateCellOf(r.b)), `every step fits his body (${c.x},${c.y})`);
});
