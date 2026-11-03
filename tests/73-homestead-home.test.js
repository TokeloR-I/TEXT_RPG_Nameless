// The homestead after the gate (Tokelo, 2026-11-03): the gate is drawn mended once it's built, the house
// becomes a safe home (the bed heals you fully, the old chest keeps what you don't carry), and Orin's ledger
// moves on to the walls. Through the real world model + engine, like the Chapter One tests.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const { inspect } = require('./world-helpers.js');

function home(map = 'house', spawn = 'from_grounds', { gate = false } = {}) {
    const g = new GameEngine({ seed: 7 });
    g.start();
    g.act({ type: 'choose_class', classId: 'mage' });
    g.act({ type: 'enter_world' });
    if (gate) g.player.homestead = { built: { homestead_gate: true }, plots: {} };
    const s = new WorldSession(ZONE1, { engine: g, map, spawn });
    return { g, s };
}
const texts = (g) => (g.getAvailableActions().actions || []).filter((a) => a.type === 'dialogue_choice').map((a) => a.text);
const pick = (g, re) => {
    const c = (g.getAvailableActions().actions || []).find((a) => a.type === 'dialogue_choice' && re.test(a.text));
    assert.ok(c, `no choice ${re}: ${texts(g).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
};

test('Homestead: the world still validates with the gate, bed and chest as stations', () => {
    assert.deepStrictEqual(validateWorld(ZONE1, data, STORY), []);
    const ids = ZONE1.maps.house.interactables.map((o) => o.id);
    assert.strictEqual(ids.filter((id) => id === 'house_bed').length, 1, 'Chapter One replaces the base bed, not a second one');
    assert.strictEqual(ids.filter((id) => id === 'house_chest').length, 1);
});

test('Homestead: a look may only change name, sprite and verb, and needs a condition', () => {
    const world = JSON.parse(JSON.stringify(ZONE1));
    world.maps.grounds.interactables.find((o) => o.id === 'grounds_gate').looks.push({ when: { flags: ['x'] }, kind: 'pickup' }, { name: 'no when' });
    const errs = validateWorld(world, data, STORY).join('\n');
    assert.match(errs, /grounds_gate has a look that changes 'kind'/);
    assert.match(errs, /grounds_gate has a look without a 'when'/);
});

test('Homestead: the gate is drawn broken until it is built, then mended (same object, same tile)', () => {
    const { g, s } = home('grounds', 'from_house');
    const gate = () => s.visibleObjects().find((o) => o.id === 'grounds_gate');
    assert.deepStrictEqual([gate().name, gate().sprite], ['Broken gate', 'broken_gate']);
    g.player.homestead = { built: { homestead_gate: true }, plots: {} };
    assert.deepStrictEqual([gate().name, gate().sprite], ['Mended gate', 'mended_gate']);
    assert.deepStrictEqual([gate().x, gate().y], [22, 12]);
    const r = inspect(s, 'grounds_gate');
    assert.strictEqual(r.type, 'talk');
    assert.strictEqual(r.title, 'Mended gate');
    assert.ok(r.events.some((e) => e.type === 'text' && /shut to whatever walks the road/.test(e.text)));
});

test('Homestead: once Orin has the ledger out, the gate itself offers the repair, which finishes Q07', () => {
    const { g, s } = home('grounds', 'from_house');
    g.story.flags.push('orin_met');
    g.story.quests.Q07 = { state: 'active', step: 2 };
    inspect(s, 'grounds_gate');
    pick(g, /Mend it/);
    pick(g, /Build Homestead Gate \(free\)/);
    assert.strictEqual(g.player.homestead.built.homestead_gate, true);
    assert.strictEqual(g.questState('Q07'), 'complete');
});

test('Homestead: before the gate, the bed will not let you rest and the chest stays shut', () => {
    const { g, s } = home();
    inspect(s, 'house_bed');
    assert.ok(!texts(g).some((t) => /Sleep/.test(t)), texts(g).join(' | '));
    g.act({ type: 'dialogue_leave' });
    g.player.inventory.push('Bandages');
    inspect(s, 'house_chest');
    assert.ok(!texts(g).some((t) => /Put away/.test(t)), texts(g).join(' | '));
});

test('Homestead: after the gate, the bed restores all HP and resource and clears statuses', () => {
    const { g, s } = home('house', 'from_grounds', { gate: true });
    const p = g.player;
    p.hp = 1; p.resource.current = 0; p.statusEffects = [{ name: 'Poison', duration: 3 }];
    inspect(s, 'house_bed');
    pick(g, /Sleep until morning/);
    assert.strictEqual(p.hp, p.maxHp);
    assert.strictEqual(p.resource.current, p.resource.max);
    assert.deepStrictEqual(p.statusEffects, []);
    assert.strictEqual(g.getAvailableActions().awaiting === 'dialogue', false, 'sleeping ends the conversation');
});

test('Homestead: the chest keeps items across save and load; story items stay with you', () => {
    const { g, s } = home('house', 'from_grounds', { gate: true });
    g.player.inventory.push('Bandages', 'Bandages', "Elian's Letter");
    inspect(s, 'house_chest');
    assert.ok(!texts(g).some((t) => /Elian's Letter/.test(t)), 'a quest item never goes in the chest');
    pick(g, /^Put away Bandages \(2\)/);
    pick(g, /^Put away Bandages$/);
    assert.ok(!g.player.inventory.includes('Bandages'));
    assert.deepStrictEqual(g.player.homestead.stash, ['Bandages', 'Bandages']);
    assert.ok(texts(g).some((t) => /^Take out Bandages \(2\)/.test(t)));
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    const h = home('house', 'from_grounds').g; h.restore(snap);
    assert.deepStrictEqual(h.player.homestead.stash, ['Bandages', 'Bandages']);
    pick(g, /^Take out Bandages/);
    assert.strictEqual(g.player.inventory.filter((i) => i === 'Bandages').length, 1);
    assert.strictEqual(g.act({ type: 'dialogue_choice', choiceId: 'stash:Nothing' }).ok, false, 'only offered choices work');
});

test('Homestead: after the gate, Orin puts the walls on the ledger; they need the gate and cost Gold', () => {
    const { g, s } = home('grounds', 'from_house');
    g.story.flags.push('fragment_one', 'orin_met');
    g.player.gold = 100;
    assert.strictEqual(g.act({ type: 'build', upgradeId: 'homestead_walls' }).ok, false, 'not before the gate');
    g.player.homestead = { built: { homestead_gate: true }, plots: {} };
    inspect(s, 'grounds_orin');
    assert.ok(texts(g).some((t) => /^Build Homestead Walls \(40 Gold\)/.test(t)), texts(g).join(' | '));
    pick(g, /Build Homestead Walls/);
    assert.strictEqual(g.player.homestead.built.homestead_walls, true);
    assert.strictEqual(g.player.gold, 60);
});
