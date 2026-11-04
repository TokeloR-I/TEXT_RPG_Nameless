// The Fallen Seraphim (Tokelo, 2026-11-04): a legendary web that opens when you stare at the robed statue in the
// Kloster's inner courtyard for 120 s (halo at 60 s, six wings and it speaks at 120 s). Engine: src/engine/gaze.js;
// data: gazeRules and skillWeb.legendaryWebs.fallen_seraphim; map: kloster_inner; art: ui/scene-kloster-inner.js.
const crypto = require('crypto');
const { test, assert, GameEngine, data } = require('./helpers.js');
const SkillWeb = require('../src/engine/skill-web.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const ZONE1 = require('../src/world/zone1.js');
const WORLD = doubleWorld(ZONE1);
const { walkTo, takeExit } = require('./world-helpers.js');

const STATUE = 'kloster_seraph_statue';
const rule = data.gazeRules[STATUE];
function world(cls = 'mage', seed = 96) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    return g;
}
const levelTo = (g, level) => { while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true }); return g; };
const legend = (g) => g.getSkillWeb().legendaryWebs.find((w) => w.webId === 'fallen_seraphim');
/** Gaze for `seconds` in 100 ms steps; returns every event. */
const gaze = (g, seconds, id = STATUE) => { const out = []; for (let t = 0; t < seconds * 10; t++) out.push(...g.gazeTick(id, 100)); return out; };
const stages = (events) => events.filter((e) => e.type === 'gaze').map((e) => e.stage);

test('Fallen Seraphim: a legendary web of six nodes (one per wing), every skill defined and every effect built', () => {
    assert.deepStrictEqual(SkillWeb.validateSkillWeb(data), []);
    const web = SkillWeb.buildSkillWeb(data);
    assert.ok(web.legendary.includes('fallen_seraphim'));
    const nodes = web.list.filter((n) => n.region === 'fallen_seraphim' && n.kind !== 'heart');
    assert.strictEqual(nodes.length, 6);
    assert.strictEqual(nodes.filter((n) => n.kind === 'active').length, 4);
    const { registry } = require('../src/effects.js');
    for (const n of nodes.filter((x) => x.skill)) for (const e of data.skillDefinitions[n.skill].effects || []) assert.ok(registry[e.type], `${n.skill}: ${e.type}`);
    for (const n of nodes.filter((x) => x.kind === 'passive')) assert.ok(n.trait.mods, `${n.trait.name} does what it says through data`);
    assert.strictEqual(data.legendaryAndSecretClasses.fallen_seraphim.name, 'Fallen Seraphim');
});

test('Fallen Seraphim: sealed until the statue wakes; the heart refuses with the reason the web view shows', () => {
    const g = world();
    assert.strictEqual(legend(g).open, false);
    assert.deepStrictEqual(legend(g).missing, [rule.flag && 'the statue in the Kloster courtyard wakes']);
    g.act({ type: 'learn_node', nodeId: 'heart.fallen_seraphim' });
    const heart = g.getSkillWeb().nodes.find((n) => n.id === 'heart.fallen_seraphim');
    assert.strictEqual(heart.state, 'locked'); assert.strictEqual(heart.reason.code, 'LEGEND_LOCKED');
    assert.ok(!g.webOwns('heart.fallen_seraphim'));
});

test('Fallen Seraphim: a halo at 60 s, then at 120 s the statue wakes, speaks and opens the web, its heart free', () => {
    const g = world();
    assert.deepStrictEqual(stages(gaze(g, 59.9)), []);
    assert.strictEqual(g.gazeView(STATUE).halo, false);
    const halo = gaze(g, 0.1);
    assert.deepStrictEqual(stages(halo), ['halo']);
    assert.ok(halo.some((e) => e.type === 'text' && e.notice && /ring of light/.test(e.text)), 'a notice says what happened');
    assert.ok(g.gazeView(STATUE).halo && !g.gazeView(STATUE).awake);
    const points = g.webPoints();
    const wake = gaze(g, 60);
    assert.deepStrictEqual(stages(wake), ['awake']);
    assert.ok(g.hasStoryFlag('seraph_awakened'));
    const avail = g.getAvailableActions();
    assert.strictEqual(avail.awaiting, 'dialogue');
    assert.strictEqual(avail.dialogue.npcId, 'seraph_statue');
    assert.ok(wake.some((e) => e.type === 'text' && /six wings unfold/.test(e.text)), 'six wings come out');
    assert.ok(wake.some((e) => e.type === 'text' && /Evil is only a good/.test(e.text)), 'it talks to the player');
    assert.ok(g.webOwns('heart.fallen_seraphim'), 'the path begins');
    assert.strictEqual(g.webPoints(), points, 'the heart was the statue\'s gift');
    assert.strictEqual(legend(g).entered, true);
    assert.strictEqual(g.gazeView(STATUE).awake, true);
    // It is woken once: later gazes do nothing, and talking to it again is the short greeting.
    g.act({ type: 'dialogue_leave' });
    assert.deepStrictEqual(stages(gaze(g, 130)), []);
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.getAvailableActions().dialogue.npcId, 'seraph_statue');
});

test('Fallen Seraphim: looking away starts the count again; nothing counts in a conversation', () => {
    const g = world();
    gaze(g, 70);
    assert.ok(g.gazeView(STATUE).halo);
    const away = g.gazeTick(null, 100);
    assert.deepStrictEqual(stages(away), ['broken']);
    assert.strictEqual(g.gazeView(STATUE).ms, 0);
    assert.deepStrictEqual(stages(gaze(g, 119)), ['halo'], 'the full two minutes again');
    gaze(g, 0.5, null);
    // In a conversation the gaze holds still and resets.
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.getAvailableActions().awaiting, 'dialogue');
    assert.deepStrictEqual(stages(gaze(g, 130)), []);
    assert.ok(!g.hasStoryFlag('seraph_awakened'));
    g.act({ type: 'dialogue_leave' });
    assert.deepStrictEqual(stages(gaze(g, 0.1, 'kloster_inner_altar')), [], 'objects without a gaze rule do nothing');
});

test('Fallen Seraphim: its skills are learned with points and levels like any web node; the dev cheat still opens it', () => {
    const g = world();
    gaze(g, 120);
    g.act({ type: 'dialogue_leave' });
    levelTo(g, 3);
    g.act({ type: 'learn_node', nodeId: 'Halo of Ash' });
    g.act({ type: 'learn_node', nodeId: 'Fallen Judgement' });
    assert.ok(g.player.skills.includes('Halo of Ash') && g.player.skills.includes('Fallen Judgement'));
    const wings = g.getSkillWeb().nodes.find((n) => n.id === 'fallen_seraphim.wings_of_sorrow');
    assert.strictEqual(wings.reason.code, 'LEVEL_TOO_LOW');
    const cheat = world('warrior', 97);
    cheat.flags.eventsUnlocked = true;
    assert.strictEqual(legend(cheat).open, true);
});

test('Fallen Seraphim: Grace of the Fallen hits the Undead and the Void 20% harder; What Is Evil? takes 10% off every blow', () => {
    const g = world();
    const grace = data.skillWeb.legendaryWebs.fallen_seraphim.nodes.find((n) => n.id === 'fallen_seraphim.grace').trait;
    const evil = data.skillWeb.legendaryWebs.fallen_seraphim.nodes.find((n) => n.id === 'fallen_seraphim.what_is_evil').trait;
    const me = { traits: [grace, evil], specialFlags: [] };
    assert.strictEqual(g.traitDamageMult(me, { specialFlags: ['undead'] }), 1.2);
    assert.strictEqual(g.traitDamageMult(me, { specialFlags: ['beast'] }), 1);
    assert.ok(Math.abs(g.traitDamageMult({ specialFlags: [] }, me) - 0.9) < 1e-9);
    assert.strictEqual(g.traitDamageMult({}, {}), 1, 'enemies without traits are untouched');
});

test('Kloster inside: through the abbey church door and back; the statue stands in the middle of the court', () => {
    const g = new GameEngine({ seed: 96 }); g.start(); g.act({ type: 'choose_class', classId: 'rogue' }); g.act({ type: 'enter_world' });
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('briarwell_cloister_court', 'from_village');
    // The outside Kloster is unchanged; the abbey church's great door leads in (Tokelo: the interior is the church's).
    assert.strictEqual(s.map.scene, 'kloster');
    assert.strictEqual(takeExit(s, 'kloster_church_door').to, 'kloster_inner');
    const statue = s.map.interactables.find((o) => o.id === STATUE);
    const cw = s.map.tiles[0].length;
    assert.strictEqual(statue.x + statue.w / 2, cw / 2, 'centred');
    assert.strictEqual(walkTo(s, 19, 22).to, 'briarwell_cloister_court');
});

test('Kloster inside: standing still in front of the statue in the live world wakes it at 120 s; walking breaks the gaze', () => {
    const g = world('rogue', 98);
    const s = new WorldSession(WORLD, { engine: g });
    s.place('kloster_inner', 'from_garth');
    const statue = s.map.interactables.find((o) => o.id === STATUE);
    s.x = statue.x + 2; s.y = statue.y + statue.h + 2; s.facing = 'up';   // two cells below it, looking up
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 96 });
    const run = (seconds, input = {}) => { const ev = []; for (let i = 0; i < seconds * 20; i++) ev.push(...sim.update(50, input).engineEvents); return ev; };
    assert.strictEqual(sim.gazeTarget(), STATUE);
    assert.deepStrictEqual(stages(run(61)), ['halo']);
    run(0.3, { move: { x: 1, y: 0 } });   // a step aside breaks it
    assert.strictEqual(g.gazeView(STATUE).ms < 1000, true);
    s.x = statue.x + 2; s.y = statue.y + statue.h + 2; sim.enterMap();
    sim.player.angle = -Math.PI / 2;
    assert.deepStrictEqual(stages(run(121)), ['halo', 'awake']);
    assert.strictEqual(g.getAvailableActions().awaiting, 'dialogue');
    // Facing away, or from across the court, nothing counts.
    sim.player.angle = Math.PI / 2;
    assert.strictEqual(sim.gazeTarget(), null);
});

test('Scene art: inside the Kloster paints whole after the reference, the same every time, every tile named', () => {
    const SCENE = require('../ui/scene-art.js');
    require('../ui/scene-kloster-inner.js');
    const map = ZONE1.maps.kloster_inner;
    const nameAt = (m, x, y) => {
        if (y < 0 || y >= m.tiles.length || x < 0 || x >= m.tiles[0].length) return null;
        const ch = m.tiles[y][x], def = (m.legend && m.legend[ch]) || ZONE1.tileset[ch];
        return def ? def.name : null;
    };
    assert.ok(SCENE.has(map));
    const a = SCENE.paint(map, nameAt), b = SCENE.paint(map, nameAt);
    const sha = (d) => crypto.createHash('sha1').update(Buffer.from(d.buffer)).digest('hex');
    assert.strictEqual(sha(a.base), sha(b.base)); assert.strictEqual(sha(a.over), sha(b.over));
    for (let i = 3; i < a.base.length; i += 4) if (a.base[i] !== 255) assert.fail(`base pixel ${(i - 3) / 4} is not opaque`);
    assert.ok(a.water.length > 5 && typeof a.animate === 'function');
    const painted = new Set(Object.values(map.legend).map((t) => t.name));
    for (let y = 0; y < map.tiles.length; y++) for (let x = 0; x < map.tiles[0].length; x++) assert.ok(painted.has(nameAt(map, x, y)), `${x},${y}`);
    // The halo hangs where the scene put the statue's hood.
    const st = map.interactables.find((o) => o.id === STATUE);
    assert.strictEqual(a.anchors.seraph.y, (st.y + st.h) * 32 - rule.anchorUp);
    assert.strictEqual(a.anchors.seraph.x, (st.x + st.w / 2) * 32);
    const at = (x, y) => a.over[(y * a.w + x) * 4 + 3];
    assert.ok(at(19 * 32 + 16, 11 * 32 - 20) > 0, 'the statue reaches over the court behind it');
});
