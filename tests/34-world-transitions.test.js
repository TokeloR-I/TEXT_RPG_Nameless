// #98 (Director playtest #96): what a front end draws during a map transition, and arrival narration
// (an exit's `text`) playing once per run, through backtracking and save/load.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const { takeExit, travel } = require('./world-helpers.js');

function run(seed = 1) {
    const g = new GameEngine({ seed });
    g.start();
    g.act({ type: 'choose_class', classId: 'warrior' });
    g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    return { g, s: new WorldSession(ZONE1, { engine: g }) };
}
const ids = (objs) => objs.map((o) => o.id).sort();
const roundTrip = (save) => JSON.parse(JSON.stringify(save));

test('Transitions: the map being shown keeps its own things while the player is already on the next one (#98)', () => {
    const { s } = run();
    travel(s, 'house'); travel(s, 'grounds'); travel(s, 'road');
    const road = ids(s.visibleObjects());
    travel(s, 'tollway');
    assert.strictEqual(s.mapId, 'tollway');
    // The front end is still fading out of the road: it asks for that map's objects and gets no tollway ones.
    assert.deepStrictEqual(ids(s.visibleObjects('road')), road);
    const tollway = ids(s.visibleObjects());
    assert.ok(tollway.includes('tollway_elian'), 'Elian is on the tollway');
    assert.ok(!ids(s.visibleObjects('road')).some((id) => tollway.includes(id)), 'nothing from the tollway drawn on the road');
    assert.deepStrictEqual(tollway, ids(s.visibleObjects('tollway')));
});

test('Transitions: visibleObjects(mapId) never mixes maps, with or without an engine', () => {
    for (const s of [run().s, new WorldSession(ZONE1)]) {
        for (const [mid, map] of Object.entries(ZONE1.maps)) {
            const own = new Set([...(map.interactables || []), ...(map.encounters || [])].map((o) => o.id));
            for (const o of s.visibleObjects(mid)) assert.ok(own.has(o.id), `${o.id} drawn on ${mid}`);
        }
        assert.deepStrictEqual(s.visibleObjects('no_such_map'), []);
    }
});

test('Transitions: an exit narration plays the first time only, including after backtracking (#98)', () => {
    const { g, s } = run();
    travel(s, 'house'); travel(s, 'grounds');
    const down = takeExit(s, 'grounds_well');
    assert.strictEqual(down.type, 'transition');
    assert.match(down.text, /climb down/);
    const up = takeExit(s, 'well_rope');
    assert.match(up.text, /climb back up/);
    assert.strictEqual(takeExit(s, 'grounds_well').text, null, 'second trip down: no narration');
    assert.strictEqual(takeExit(s, 'well_rope').text, null, 'second trip up: no narration');
    assert.deepStrictEqual(g.world.narrated, ['grounds_well', 'well_rope']);
});

test('Transitions: narration already seen stays seen after save/load into a fresh engine (#98)', () => {
    const { g, s } = run();
    travel(s, 'house'); travel(s, 'grounds');
    takeExit(s, 'grounds_well');
    const save = roundTrip(g.serialize({ attachments: { world: s.getState() } }));
    const g2 = new GameEngine({ seed: 99 });
    g2.start();
    assert.ok(g2.load(save).ok);
    const s2 = new WorldSession(ZONE1, { engine: g2 });
    s2.restorePosition(save.attachments.world);
    assert.strictEqual(s2.mapId, 'well');
    const up = takeExit(s2, 'well_rope');
    assert.match(up.text, /climb back up/, 'not seen before the save');
    assert.strictEqual(takeExit(s2, 'grounds_well').text, null, 'seen before the save');
});

test('Transitions: a save from before #98 (no narration record) loads and plays every narration once', () => {
    const { g, s } = run();
    travel(s, 'house'); travel(s, 'grounds');
    const save = roundTrip(g.serialize());
    assert.ok(!('narrated' in save.state.world), 'the record is only created on first use');
    const g2 = new GameEngine({ seed: 1 });
    g2.start();
    assert.ok(g2.load(save).ok);
    const s2 = new WorldSession(ZONE1, { engine: g2, map: 'grounds', spawn: 'from_house' });
    assert.match(takeExit(s2, 'grounds_well').text, /climb down/);
    assert.strictEqual(takeExit(s2, 'well_rope').type, 'transition');
    assert.strictEqual(takeExit(s2, 'grounds_well').text, null);
});

test('Transitions: without an engine the session remembers narration itself', () => {
    const s = new WorldSession(ZONE1, { map: 'grounds', spawn: 'from_house' });
    assert.match(takeExit(s, 'grounds_well').text, /climb down/);
    takeExit(s, 'well_rope');
    assert.strictEqual(takeExit(s, 'grounds_well').text, null);
});
