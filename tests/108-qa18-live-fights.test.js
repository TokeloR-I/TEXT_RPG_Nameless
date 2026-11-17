// QA report #18 (Tally, 2026-11-17): bugs the Chapter One and Two pass found in live fights and story data.
//   1. A group with roles (ranged_keeps_distance: Wolf-Banner skirmishers, cult acolytes) held its "blade" member at the
//      caster's distance, out of reach of its only attack, so it never swung and could hold a fight open forever.
//   2. A member placed round its group's centre could start half inside a wall (Járnmyr's buyers, two Warden-approach
//      zealots) and never move again.
//   3. Three quest goods the story hands out had no item entry.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');

/** The 16 px world with every group on its map (story conditions stripped). `only`: keep just that group on its map. */
function worldWith(only = null) {
    const raw = JSON.parse(JSON.stringify(ZONE1));
    for (const m of Object.values(raw.maps)) {
        if (only && (m.encounters || []).some((e) => e.id === only)) m.encounters = m.encounters.filter((e) => e.id === only);
        for (const e of m.encounters || []) delete e.when;
    }
    return doubleWorld(raw);
}
function simOn(world, mapId, seed = 18) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    const s = new WorldSession(world, { engine: g });
    s.place(mapId, Object.keys(world.maps[mapId].spawns)[0]);
    return { g, s, sim: () => new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed }) };
}

test('QA #18: in a group with roles, the blade closes to knife reach and swings; the hexer keeps its distance', () => {
    const W = worldWith('frostspine_caravan_raiders');
    const r = simOn(W, 'frostspine_pass');
    const enc = W.maps.frostspine_pass.encounters[0];
    // stand on open ground a few tiles from the group, joined to it on foot
    const seen = new Set([`${enc.x},${enc.y}`]), q = [[enc.x, enc.y, 0]];
    let spot = null;
    while (q.length && !spot) { const [x, y, d] = q.shift(); if (d === 5) spot = [x, y]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`; if (!seen.has(k) && !r.s.solidForAction(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy, d + 1]); } } }
    [r.s.x, r.s.y] = spot;
    const sim = r.sim();
    sim.engageGroup(sim.groups[enc.id]);
    const skirm = sim.actors.find((a) => a.encounterId === enc.id && a.key === 'wolfbanner_skirmisher');
    assert.strictEqual(sim.roleOf(skirm), 'blade', 'third in the group: the blade');
    assert.ok(sim.keepRange(skirm)[1] <= 26, `the blade keeps to its jab reach, not the caster's band (${sim.keepRange(skirm)})`);
    // kill the two raiders so only the skirmisher is left, then stand still: it must come and use its jab
    for (const a of sim.actors) if (a.encounterId === enc.id && a !== skirm) { const e = r.g.combat.enemies.find((x) => x.id === a.engineId); e.hp = 0; }
    let jabbed = false;
    for (let i = 0; i < 60 * 20 && !jabbed; i++) { sim.update(1000 / 60, {}); if (skirm.state === 'windup' && skirm.windup.atk.name === 'Spear Jab') jabbed = true; }
    assert.ok(jabbed, 'the lone blade walks in and jabs within 20 s');
    // the same enemy in the hexer role keeps the caster's band
    const hexer = { ...skirm, roleIdx: 1 };
    assert.strictEqual(sim.roleOf(hexer), 'hexer');
    assert.deepStrictEqual(sim.keepRange(hexer), data.actionRules.enemies.wolfbanner_skirmisher.keepDistance);
});

test('QA #18: no enemy starts a fight half inside a wall, on any map', () => {
    const W = worldWith();
    const stuck = [];
    for (const [mid, m] of Object.entries(W.maps)) {
        if (!(m.encounters || []).length) continue;
        const sim = simOn(W, mid).sim();
        for (const enc of m.encounters) if (!sim.groups[enc.id]) sim.addGroup(enc);
        for (const a of sim.actors) {
            const enc = m.encounters.find((e) => e.id === a.encounterId);
            const gate = enc && enc.gate ? (tx, ty) => tx >= enc.x && ty >= enc.y && tx < enc.x + (enc.w || 1) && ty < enc.y + (enc.h || 1) : null;
            if (sim.bodyBlocked(a.x, a.y, a.r, gate)) stuck.push(`${mid}.${a.sid} ${a.key}`);
        }
    }
    assert.deepStrictEqual(stuck, []);
});

test('QA #18: Járnmyr\'s buyers all come for you (the ringleader used to stand in the wall at home)', () => {
    const W = worldWith('jarnmyr_buyers');
    const r = simOn(W, 'jarnmyr');
    const enc = W.maps.jarnmyr.encounters[0];
    [r.s.x, r.s.y] = [enc.x - 6, enc.y + 4];
    assert.ok(!r.s.solidForAction(r.s.x, r.s.y));
    const sim = r.sim();
    sim.engageGroup(sim.groups[enc.id]);
    const lead = sim.actors.find((a) => a.encounterId === enc.id && a.key === 'wolfbanner_ringleader');
    const x0 = lead.x, y0 = lead.y;
    for (let i = 0; i < 60 * 3; i++) sim.update(1000 / 60, {});
    assert.ok(Math.hypot(lead.x - x0, lead.y - y0) > 16, 'the ringleader leaves his spot');
});

test('QA #18: every item the story hands out has an item entry (name, description, not sellable if it is a quest good)', () => {
    const missing = [];
    (function walk(v) {
        if (Array.isArray(v)) return v.forEach(walk);
        if (!v || typeof v !== 'object') return;
        if (typeof v.item === 'string' && !data.itemDefinitions[v.item]) missing.push(v.item);
        Object.values(v).forEach(walk);
    })([STORY.quests, STORY.npcs, STORY.triggers || [], Object.values(ZONE1.maps).map((m) => m.interactables || [])]);
    assert.deepStrictEqual([...new Set(missing)], []);
    for (const it of ['Tollway Register', "Shane's Ledger", "Builder's Ledger"]) {
        const d = data.itemDefinitions[it];
        assert.ok(d.type === 'quest' && d.bound && d.sellable === false && d.description, it);
    }
    // and a quest good stays with you: the homestead chest won't take it
    const g = new GameEngine({ seed: 1 }); g.start(); g.input('warrior'); g.enterWorld();
    g.player.inventory.push('Tollway Register');
    assert.ok(g.stashBlock('Tollway Register'), 'the register is not offered to the chest');
});
