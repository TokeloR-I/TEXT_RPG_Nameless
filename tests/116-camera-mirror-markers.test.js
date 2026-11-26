// Tokelo 2026-11-25, second game-experience batch: "!" / "?" over people (engine.npcMarker, pure), and the homestead
// mirror that reopens the appearance editor (a map object with `wardrobe: true`). The camera is presentation only.
const { test, assert, GameEngine } = require('./helpers.js');
const WORLD = require('../src/world/zone1.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const CH1 = require('../src/story/chapter1.js');

const fresh = () => { const g = new GameEngine({ seed: 116, combatMode: 'action' }); g.start(); g.input('warrior'); g.enterWorld(); return g; };

test('Markers: "?" over the person an active quest sends you to, and it clears once that talk is done', () => {
    const g = fresh();
    g.story.quests.Q03 = { state: 'active', step: 1 };                        // Q03's second objective: talk to Elian
    assert.strictEqual(g.currentObjective('Q03').on.id, 'elian');
    assert.strictEqual(g.npcMarker('elian'), '?');
    g.story.quests.Q03 = { state: 'active', step: 2 };
    assert.notStrictEqual(g.npcMarker('elian'), '?');
});

test('Markers: "!" over someone whose talk would offer a quest you have not started; gone once it starts', () => {
    const g = fresh();
    const givers = Object.keys(CH1.npcs).filter((id) => g.npcMarker(id) === '!');
    assert.ok(givers.length > 0, 'somebody in chapter one has a quest to offer at the start');
    const id = givers[0];
    // every quest that giver could start, started: the "!" goes
    for (const n of Object.values(CH1.npcs[id].nodes)) for (const c of [n, ...(n.choices || [])]) for (const e of c.effects || []) if (e.start) g.story.quests[e.start] = { state: 'active', step: 0 };
    assert.notStrictEqual(g.npcMarker(id), '!');
    assert.strictEqual(g.npcMarker('nobody_at_all'), null);
});

test('Markers: npcMarker is pure (no events, no state change)', () => {
    const g = fresh();
    const before = JSON.stringify(g.story);
    for (const id of Object.keys(CH1.npcs)) g.npcMarker(id);
    assert.strictEqual(JSON.stringify(g.story), before);
    assert.strictEqual(g.flush().length, 0);
});

test('Mirror: the homestead house has a standing mirror you can use, on a free tile, and the world still validates', () => {
    const house = WORLD.maps.house;
    const m = house.interactables.find((o) => o.id === 'house_mirror');
    assert.ok(m && m.wardrobe && m.sprite === 'mirror');
    assert.notStrictEqual(house.tiles[m.y][m.x], 'W', 'not inside a wall');
    assert.deepStrictEqual(validateWorld(WORLD, require('../src/data.js'), CH1), []);
    const g = fresh();
    const s = new WorldSession(WORLD, { engine: g });
    s.place('house', Object.keys(house.spawns)[0]);
    s.x = m.x; s.y = m.y + 1; s.facing = 'up';
    const r = s.interact();
    assert.strictEqual(r.type, 'message');
    assert.strictEqual(r.id, 'house_mirror');
});
