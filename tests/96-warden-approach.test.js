// The road to the Warden (Tokelo, 2026-11-04: "add more enemy NPCs leading up to the Warden, currently it's just 2
// cultists and 1 other"). The orchard gets two Broken Oath lookout groups that spot you across its open rows, and the
// Featherwatch climb gets a cultist rearguard and a flock of hex-eyed crows, each holding a one-tile pass.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const ZONE1 = require('../src/world/zone1.js');
const art = require('../assets/sprites/enso-enemies.js');
const WORLD = doubleWorld(ZONE1);
const STEP = 1000 / 60;
const enc = (map, id) => ZONE1.maps[map].encounters.find((e) => e.id === id);

test('Road to the Warden: the new groups mix the Broken Oath, a heavy zealot and a crow flock, all with action kits and art', () => {
    const groups = [['orchard', 'orchard_east_lookouts'], ['orchard', 'orchard_west_lookouts'], ['featherwatch', 'featherwatch_rearguard'], ['featherwatch', 'featherwatch_crows']];
    for (const [m, id] of groups) assert.ok(enc(m, id), `${id} is placed`);
    const route = ['orchard', 'featherwatch'].flatMap((m) => ZONE1.maps[m].encounters).flatMap((e) => e.enemies);
    assert.ok(route.length >= 14, `14+ enemies before the Warden (was 3), got ${route.length}`);
    assert.ok(new Set(route).size >= 4, 'acolytes, zealots, crows and the ghoul');
    for (const key of ['cult_zealot', 'carrion_crow']) {
        const e = data.enemies[key], prof = data.actionRules.enemies[key];
        assert.ok(e && prof, `${key}: stats and an action profile`);
        for (const atk of prof.attacks) assert.ok(e.skills.some((s) => s.name === atk.skill), `${key}: ${atk.name} uses a skill it has`);
        assert.ok(art.keys.includes(key), `${key}: code-drawn art`);
        assert.ok(e.lootTable && e.lootProfile, `${key}: loot like any enemy`);
    }
    assert.ok(data.enemies.cult_zealot.maxHp > data.enemies.cult_acolyte.maxHp, 'the zealot is the heavy of the group');
    assert.ok(data.enemies.carrion_crow.maxHp < data.enemies.cult_acolyte.maxHp, 'crows are many and fragile');
});

/** Walk the action player through waypoints given in original (32 px) tiles; returns the first group that engages, or null. */
function walkEngages(mapId, spawn, points) {
    const g = new GameEngine({ seed: 96, combatMode: 'action' });
    g.start(); g.input('rogue'); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    s.place(mapId, spawn);
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 96 });
    for (const [ox, oy] of points) {
        const tx = (ox * 2 + 1) * 16, ty = (oy * 2 + 1) * 16;
        for (let i = 0; i < 60 * 20; i++) {
            const hit = Object.values(sim.groups).find((x) => x.engaged);
            if (hit) return hit.encounterId;
            const p = sim.player, d = Math.hypot(tx - p.x, ty - p.y);
            if (d < 4) break;
            sim.update(STEP, { move: { x: (tx - p.x) / d, y: (ty - p.y) / d } });
        }
    }
    return null;
}

test('Orchard: no way north skirts the lookouts, down either wall, up the middle or zig-zagging between them', () => {
    const routes = {
        'west wall': [[1, 17], [1, 4], [12, 4]],
        'east wall': [[24, 17], [24, 4], [14, 4]],
        'middle path': [[13, 16], [13, 5]],
        'zig-zag': [[11, 17], [11, 12], [15, 9], [15, 5]],
        'reverse zig-zag': [[15, 17], [15, 12], [11, 9], [11, 5]]
    };
    for (const [name, pts] of Object.entries(routes)) assert.match(String(walkEngages('orchard', 'from_village', pts)), /_lookouts$/, name);
});

test('Orchard: the lookouts leave you alone at the gate you came in by', () => {
    const g = new GameEngine({ seed: 96, combatMode: 'action' });
    g.start(); g.input('rogue'); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    s.place('orchard', 'from_village');
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 96 });
    for (let i = 0; i < 60 * 5; i++) sim.update(STEP, {});
    assert.strictEqual(g.mode, 'explore', 'arriving is not an ambush');
});

test('Featherwatch: the rearguard, the crows and the ghoul each hold the only way up, in that order', () => {
    const g = new GameEngine({ seed: 96, combatMode: 'action' });
    g.start(); g.input('rogue'); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    s.place('featherwatch', 'from_orchard');
    const map = s.map, exit = map.exits.find((e) => e.id === 'featherwatch_north');
    const reach = () => {   // flood fill over cells free for action movement
        const seen = new Set([`${s.x},${s.y}`]), q = [[s.x, s.y]];
        while (q.length) {
            const [x, y] = q.shift();
            if (x === exit.x && y === exit.y) return true;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
                if (seen.has(k) || nx < 0 || ny < 0 || ny >= map.tiles.length || nx >= map.tiles[0].length) continue;
                if (s.solidForAction(nx, ny) && !(nx === exit.x && ny === exit.y)) continue;
                seen.add(k); q.push([nx, ny]);
            }
        }
        return false;
    };
    const order = ['featherwatch_rearguard', 'featherwatch_crows', 'featherwatch_ghoul'];
    for (const id of order) {
        assert.ok(!reach(), `the way up is held while ${id} stands`);
        g.world.defeated.push(id);
    }
    assert.ok(reach(), 'open once all three are beaten');
    assert.strictEqual(walkEngages('featherwatch', 'from_orchard', [[9, 17], [9, 15], [5, 15], [5, 13]]), 'featherwatch_rearguard', 'walking up meets the rearguard first');
});

test('Saves: an older save that is already past the orchard loads with the new groups waiting, nothing broken', () => {
    const g = new GameEngine({ seed: 96 });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    g.world.defeated.push('orchard_cultists', 'featherwatch_ghoul');
    const save = JSON.parse(JSON.stringify(g.serialize()));
    const back = GameEngine.fromSave(save);
    for (const id of ['orchard_east_lookouts', 'orchard_west_lookouts', 'featherwatch_rearguard', 'featherwatch_crows']) assert.ok(!back.isDefeated(id), `${id} is there to fight`);
    assert.ok(back.isDefeated('orchard_cultists') && back.isDefeated('featherwatch_ghoul'), 'what was beaten stays beaten');
});
