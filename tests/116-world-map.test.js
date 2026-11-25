// World map and more Black Flight anchors (research round two, pick 3; Tokelo approved 2026-11-25): anchors at the
// Kloster fountain, the Featherwatch crow perch, the Járnmyr bloomers' hut and Birkholt's standing stones; an older
// save that already looked at them is attuned on load; the map tab's view model (ui/world-map-view.js).
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const WMV = require('../ui/world-map-view.js');

function world(seed = 116) {
    const g = new GameEngine({ seed });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    return { g, s: new WorldSession(ZONE1, { engine: g }) };
}
const flights = (g) => g.getAvailableActions().actions.filter((a) => a.type === 'black_flight');
const look = (g, id) => g.act({ type: 'world_inspect', objectId: id });
const text = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');

test('World map anchors: every anchor lands on a real spawn and names a real thing to look at', () => {
    const anchors = new GameEngine({ seed: 1 }).storyData.anchors;
    for (const id of ['kloster', 'featherwatch', 'jarnmyr', 'birkholt']) assert.ok(anchors[id], id);
    for (const [id, an] of Object.entries(anchors)) {
        const map = ZONE1.maps[an.map];
        assert.ok(map && map.spawns[an.spawn], `${id}: lands on ${an.map}.${an.spawn}`);
        if (id === 'homestead') continue;      // the seal attunes it
        assert.ok((map.interactables || []).some((o) => o.id === an.attune), `${id}: ${an.attune} is on ${an.map}`);
    }
});

test('World map anchors: the Kloster fountain and the crow perch attune by a look, quietly before the crow and aloud after', () => {
    const { g, s } = world();
    let r = look(g, 'cloister_cistern');
    assert.ok(g.hasStoryFlag('anchor:kloster'));
    assert.ok(!/attuned/.test(text(r)), 'no crow yet, so no crow line');
    g.story.flags.push('aspect_nahemoth');
    r = look(g, 'featherwatch_perch');
    assert.ok(g.hasStoryFlag('anchor:featherwatch') && /Featherwatch Path is attuned/.test(text(r)));
    const k = flights(g).find((f) => f.anchorId === 'kloster');
    assert.ok(k && k.enabled);
    assert.strictEqual(s.blackFlight('kloster').type, 'transition');
    assert.strictEqual(s.mapId, 'briarwell_cloister_court');
    assert.ok(!s.isBlocked(s.x, s.y));
    assert.strictEqual(s.blackFlight('featherwatch').to, 'featherwatch');
    assert.ok(!s.isBlocked(s.x, s.y));
});

test('World map anchors: Járnmyr and Birkholt attune with the crow, and Black Flight lands there', () => {
    const { g, s } = world();
    g.story.flags.push('aspect_nahemoth');
    assert.ok(/Járnmyr is attuned/.test(text(look(g, 'jarnmyr_hut'))));
    assert.ok(/Birkholt is attuned/.test(text(look(g, 'birkholt_stones'))));
    for (const [id, map] of [['jarnmyr', 'jarnmyr'], ['birkholt', 'birkholt']]) {
        assert.strictEqual(s.blackFlight(id).to, map);
        assert.ok(!s.isBlocked(s.x, s.y), `${id}: a walkable arrival`);
    }
});

test('World map anchors: an older save that already looked at those places is attuned on load, once', () => {
    const { g } = world();
    g.story.flags.push('aspect_nahemoth');
    for (const id of ['cloister_cistern', 'featherwatch_perch', 'jarnmyr_hut', 'birkholt_stones', 'kloster_church']) look(g, id);
    const save = JSON.parse(JSON.stringify(g.serialize()));
    const st = save.state.story;
    st.flags = st.flags.filter((f) => !/^anchor:(kloster|featherwatch|jarnmyr|birkholt)$/.test(f));
    st.claimed = st.claimed.filter((k) => !/^(catchup|trigger):anchor_/.test(k));
    const c = GameEngine.fromSave(save);
    for (const id of ['kloster', 'featherwatch', 'jarnmyr', 'birkholt']) assert.ok(c.hasStoryFlag(`anchor:${id}`), id);
    // A save that never looked keeps them unattuned, and a new game never runs the catch-up at all.
    const { g: g2 } = world(2);
    const s2 = JSON.parse(JSON.stringify(g2.serialize()));
    s2.state.story.claimed = s2.state.story.claimed.filter((k) => !/^catchup:anchor_/.test(k));
    assert.ok(!GameEngine.fromSave(s2).hasStoryFlag('anchor:kloster'));
});

test('Travel state: visited maps come from the story\'s own arrivals, so older saves already have them', () => {
    const { g } = world();
    g.act({ type: 'world_enter', mapId: 'shamefield' });
    const t = g.getTravelState();
    assert.strictEqual(t.at, 'shamefield');
    assert.ok(t.visited.includes('shamefield'));
    assert.ok(t.anchors.some((a) => a.anchorId === 'kloster' && !a.attuned && a.attune === 'cloister_cistern'));
    g.story.flags.push('aspect_nahemoth');
    const v = WMV.view(ZONE1, { ...g.getTravelState(), visited: ['briarwell_cloister_court'], at: 'briarwell_cloister_court' }, g.getAvailableActions(), []);
    const kl = v.region.areas.find((a) => a.id === 'briarwell_cloister_court').anchors[0];
    assert.strictEqual(kl.hint, 'Look at the fountain to attune it.', 'the map says where to attune');
});

test('World map view: entered areas, unexplored neighbours without names, rooms folded into their area', () => {
    const travel = { at: 'house', visited: ['cellar', 'house', 'grounds', 'road'], aspect: false, anchors: [] };
    const v = WMV.view(ZONE1, travel, { actions: [] }, []);
    assert.deepStrictEqual(v.regions.map((r) => r.id), ['vale']);
    assert.strictEqual(v.here, 'grounds', 'the house is part of the homestead');
    const byId = Object.fromEntries(v.region.areas.map((a) => [a.id, a]));
    assert.ok(byId.grounds.known && byId.grounds.here && byId.road.known);
    assert.ok(byId.tollway && !byId.tollway.known && byId.tollway.name === 'Unexplored', 'the next area on the road is a question mark');
    assert.ok(!byId.shamefield, 'two roads away is not shown');
    assert.ok(v.region.links.some((l) => l.includes('grounds') && l.includes('road')));
    assert.deepStrictEqual(v.region.gates, [], 'roads to regions you have never seen are not drawn');
    assert.deepStrictEqual(WMV.places(v).map((a) => a.id), ['road', 'grounds'].sort((a, b) => (a === 'road' ? -1 : 1)));
    const svg = WMV.svg(v.region, 'grounds');
    assert.ok(/<svg[^>]*class="wm-svg"/.test(svg) && /The Homestead/.test(svg) && !/Broken Tollway/.test(svg));
});

test('World map view: every map in the world has a place on the map, and every place is a real map', () => {
    for (const id of Object.keys(ZONE1.maps)) assert.ok(WMV.placeOf(id), `${id} has a place on the world map`);
    for (const r of WMV.LAYOUT) for (const [id, , , , inner] of r.areas) for (const m of [id, ...(inner || [])]) assert.ok(ZONE1.maps[m], `${m} exists`);
});

test('World map view: anchors show the engine\'s flight answers, tracked quests sit on their area, regions switch', () => {
    const { g } = world();
    g.story.flags.push('aspect_nahemoth', 'anchor:homestead');
    look(g, 'village_well');
    for (const m of ['road', 'tollway', 'shamefield', 'frostspine_pass', 'skeldvik', 'grounds']) g.act({ type: 'world_enter', mapId: m });
    const tracked = [{ questId: 'X', title: 'A test', text: 'Go to the well', marker: { map: 'shamefield', x: 1, y: 1 } }];
    const v = WMV.view(ZONE1, g.getTravelState(), g.getAvailableActions(), tracked);
    assert.strictEqual(v.region.id, 'vale', 'opens on the region you are in');
    assert.deepStrictEqual(v.regions.map((r) => r.id), ['vale', 'hrimvald']);
    const sh = v.region.areas.find((a) => a.id === 'shamefield');
    assert.strictEqual(sh.quests[0].title, 'A test');
    assert.ok(sh.anchors[0].attuned && sh.anchors[0].enabled, 'fly to the well');
    const home = v.region.areas.find((a) => a.id === 'grounds').anchors[0];
    assert.ok(home.here && !home.enabled && home.why === 'You are here');
    const kl = v.region.areas.find((a) => a.id === 'briarwell_cloister_court');
    assert.ok(!kl || !kl.known, 'the Kloster was never entered');
    const h = WMV.view(ZONE1, g.getTravelState(), g.getAvailableActions(), tracked, 'hrimvald');
    assert.strictEqual(h.region.id, 'hrimvald');
    assert.ok(h.region.areas.find((a) => a.id === 'skeldvik').known);
    assert.ok(h.region.gates.some((gt) => gt.toRegion === 'vale' && gt.name === 'Blackbriar Vale'));
    assert.ok(v.region.gates.some((gt) => gt.area === 'road' && gt.toRegion === 'hrimvald'));
    // Before the crow, anchors are not shown at all (Black Flight does not exist for you yet).
    const pre = WMV.view(ZONE1, { ...g.getTravelState(), aspect: false }, { actions: [] }, []);
    assert.ok(pre.region.areas.every((a) => a.anchors.length === 0));
});
