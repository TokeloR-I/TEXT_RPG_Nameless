// Nahemoth, the first aspect (docs/design/ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md): the seal grants the crow
// and Black Flight; anchors are attuned by visiting; travel is refused in fights and talks, and moves the player
// exactly as walking in would.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');

function world(seed = 1) {
    const g = new GameEngine({ seed });
    g.start();
    g.act({ type: 'choose_class', classId: 'warrior' });
    g.act({ type: 'enter_world' });
    return { g, s: new WorldSession(ZONE1, { engine: g }) };
}
const flights = (g) => g.getAvailableActions().actions.filter((a) => a.type === 'black_flight');
/** Open the seal the way the quest does: B01 waiting on its second objective, then inspect the seal. */
function openSeal(g) {
    g.story.quests.B01 = { state: 'active', step: 1 };
    g.player.inventory.push('Seal-Key of the First Echo');
    return g.act({ type: 'world_inspect', objectId: 'seal_first_echo' });
}

test('Black Flight: nothing before the seal; the Warden dying alone grants nothing', () => {
    const { g } = world();
    assert.deepStrictEqual(flights(g), []);
    assert.ok(!g.getAvailableActions().actions.some((a) => a.type === 'talk_crow'));
    g.story.flags.push('warden_dead');
    assert.deepStrictEqual(flights(g), []);
    const r = g.act({ type: 'black_flight', anchorId: 'homestead' });
    assert.ok(!r.ok && r.error.code === 'NO_ASPECT');
    assert.strictEqual(g.act({ type: 'talk_crow' }).error.code, 'NOT_HERE');
});

test('Black Flight: opening the seal grants the aspect, the crow and the homestead anchor, once', () => {
    const { g } = world();
    const r = openSeal(g);
    assert.ok(r.ok);
    assert.ok(r.events.some((e) => e.type === 'text' && /fold into a single crow/.test(e.text)));
    assert.ok(g.hasStoryFlag('aspect_nahemoth') && g.hasStoryFlag('anchor:homestead'));
    const f = flights(g);
    assert.deepStrictEqual(f.map((x) => x.anchorId), ['homestead'], 'only attuned anchors are listed');
    assert.strictEqual(f[0].name, 'The Homestead');
    const again = g.act({ type: 'world_inspect', objectId: 'seal_first_echo' });
    assert.ok(!again.events.some((e) => /single crow/.test(e.text || '')), 'the seal opens exactly once');
});

test('Black Flight: an anchor is attuned by visiting it; travel moves the player like walking in', () => {
    const { g, s } = world();
    openSeal(g);
    assert.ok(!flights(g).some((x) => x.anchorId === 'shamefield'));
    g.act({ type: 'world_inspect', objectId: 'village_well' });
    const sh = flights(g).find((x) => x.anchorId === 'shamefield');
    assert.ok(sh && sh.enabled && sh.region === 'Shamefield Vale');
    const r = s.blackFlight('shamefield');
    assert.strictEqual(r.type, 'transition');
    assert.strictEqual(s.mapId, 'shamefield');
    assert.ok(!s.isBlocked(s.x, s.y), 'arrives on a walkable tile');
    const here = flights(g).find((x) => x.anchorId === 'shamefield');
    assert.ok(!here.enabled && here.here && here.reason.code === 'HERE');
    assert.strictEqual(s.blackFlight('shamefield').type, 'refused');
    assert.strictEqual(s.blackFlight('homestead').to, 'grounds');
    assert.ok(g.storyState().flags.includes('anchor:shamefield'), 'kept in the run state (saved)');
});

test('Black Flight: refused while talking or fighting, with no state change', () => {
    const { g, s } = world();
    openSeal(g);
    assert.ok(g.act({ type: 'talk_crow' }).ok);
    assert.strictEqual(g.getAvailableActions().awaiting, 'dialogue');
    const before = s.getState();
    const r = s.blackFlight('homestead');
    assert.strictEqual(r.type, 'refused');
    assert.deepStrictEqual(s.getState(), before);
    assert.strictEqual(g.act({ type: 'black_flight', anchorId: 'homestead' }).error.code, 'IN_DIALOGUE');
    g.act({ type: 'dialogue_leave' });
    g.act({ type: 'world_encounter', encounterId: 'road_wolf', enemies: ['hungry_wolf'] });
    assert.strictEqual(g.mode, 'combat');
    assert.strictEqual(g.act({ type: 'black_flight', anchorId: 'homestead' }).error.code, 'IN_COMBAT');
});

test('Black Flight: an unknown or unattuned place is refused; availability and refusal agree', () => {
    const { g } = world();
    openSeal(g);
    assert.strictEqual(g.act({ type: 'black_flight', anchorId: 'shamefield' }).error.code, 'UNKNOWN_ANCHOR');
    g.storyData.anchors.homestead.requires = { flags: ['never_set'] };
    try {
        const opt = flights(g)[0];
        assert.strictEqual(opt.reason.code, 'UNREACHABLE');
        const r = g.act({ type: 'black_flight', anchorId: 'homestead' });
        assert.deepStrictEqual(r.error, opt.reason);
        assert.ok(g.hasStoryFlag('anchor:homestead'), 'kept in discovery history');
    } finally { delete g.storyData.anchors.homestead.requires; }
});
