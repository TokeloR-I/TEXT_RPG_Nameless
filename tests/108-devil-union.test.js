// Devil Union (Tokelo 2026-11-17, prototype authorized; docs/design/DEVIL_UNION_LEGENDARY_CLASS_IMPLEMENTATION_BRIEF.md) and the
// third-contract Demonkore reveal (docs/design/DEMONKORE_THIRD_CONTRACT_REVELATION_AND_FAVOR.md).
// Engine: src/engine/union.js; data: skillWeb.legendaryWebs.devil_union; story: CB2's binding circle, CB3, src/story/chapter2.js.
const { test, assert, GameEngine, data } = require('./helpers.js');
const SkillWeb = require('../src/engine/skill-web.js');
const CH2 = require('../src/story/chapter2.js');

const DU = data.skillWeb.legendaryWebs.devil_union;
const KITS = { lucifero: ['Gravity Well', 'Heavy Field', 'Gravity Crush'], beelzebub: ['Spatial Step', 'Rift Exchange', 'Spatial Cut'],
    slotos: ['Iron Hide', 'Brace', 'Stampede'], plumede: ['Fleet Form', 'Blink Feint', 'Quick Flurry'] };

function world(mode = 'turn', cls = 'warrior', seed = 108) {
    const g = new GameEngine({ seed, combatMode: mode });
    g.start(); g.input(cls); g.enterWorld();
    while (g.player.level < 6) g.addExperience(g.player.xpToNext, { quiet: true });
    if (g.pendingBranchChoice) { g.maybePromptBranch(); g.act({ type: 'choose_branch', branchId: 'free' }); }
    return g;
}
const bind = (g, id = 'lucifero') => { const r = g.act({ type: 'cheat', cheat: 'bind_contract', amount: id }); assert.ok(r.ok, r.error && r.error.message); return g; };
const fight = (g) => { g.startCombat(['hungry_wolf', 'rust_rat']); g.player.hp = g.player.maxHp = 999; for (const e of g.combat.enemies) e.hp = e.maxHp = 999; return g; };
const say = (g, re) => {
    const c = g.getAvailableActions().actions.find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `a choice matching ${re}: ${g.getAvailableActions().actions.filter((x) => x.type === 'dialogue_choice').map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
};

test('Devil Union: a legendary web with a branch per demon; every union skill is defined, gated to its demon, and has a live shape', () => {
    assert.deepStrictEqual(SkillWeb.validateSkillWeb(data), []);
    const web = SkillWeb.buildSkillWeb(data);
    assert.ok(web.legendary.includes('devil_union'));
    const { registry } = require('../src/effects.js');
    for (const [id, skills] of Object.entries(KITS)) {
        assert.deepStrictEqual(DU.unions.list[id].skills, skills);
        for (const name of skills) {
            const def = data.skillDefinitions[name];
            assert.ok(def, name);
            assert.strictEqual(def.union, id, `${name} belongs to ${id}`);
            assert.ok(def.liveDescription && def.cooldown > 0, `${name}: live text and a cooldown`);
            for (const e of def.effects || []) assert.ok(registry[e.type], `${name}: effect ${e.type} is built`);
            assert.ok(data.actionRules.skillShapes.bySkill[name], `${name} has a live shape`);
        }
        for (const rank of ['awakened', 'dominant', 'perfect']) assert.strictEqual(web.nodes.get(`devil_union.${id}_${rank}`).contract, `contract:${id}`);
    }
    assert.strictEqual(DU.unions.durationSeconds, 20);
    assert.strictEqual(DU.unions.cooldownSeconds, 60);
    assert.strictEqual(DU.unions.resonanceSlots, 2);
});

test("Devil Union: Lucifero's binding circle opens the web, and the union is equipped; a save that sealed it before the class gets it too", () => {
    const g = world();
    assert.strictEqual(g.getUnion(), null, 'nothing before a contract');
    g.applyStoryEffects(CH2.npcs.lucifero_bound.nodes.ceremony.effects);
    assert.ok(g.webOwns('heart.devil_union'));
    assert.strictEqual(g.getUnion().equipped, 'lucifero');
    // A PR #276 save: the contract flags, but no web.
    const old = world();
    old.story.flags.push('devil_union_contract', 'contract:lucifero');
    const save = JSON.parse(JSON.stringify(old.serialize()));
    save.state.story.claimed = save.state.story.claimed.filter((c) => c !== 'catchup:devil_union_web');
    save.game.revision = 17;
    const again = GameEngine.fromSave(save);
    assert.ok(again.webOwns('heart.devil_union'), 'the catch-up opens the web');
    assert.strictEqual(again.getUnion().equipped, 'lucifero');
});

test('Devil Union: merge in a fight for 20 s with a 60 s cooldown; the demon\'s skills take the first slots and your bar comes back', () => {
    const g = fight(bind(world('realtime')));
    const own = [...g.ensureSkillBar()];
    assert.strictEqual(g.act({ type: 'skill', skillId: 'Gravity Crush', targetIds: [g.alive(g.combat.enemies)[0].id] }).ok, false, 'not before the union');
    assert.ok(g.getAvailableActions().actions.some((a) => a.type === 'union' && a.enabled));
    assert.ok(g.act({ type: 'union' }).ok);
    assert.strictEqual(g.activeUnion(), 'lucifero');
    assert.deepStrictEqual(g.ensureSkillBar().slice(0, 3), KITS.lucifero);
    assert.deepStrictEqual(g.player.skillBar, own, 'the stored bar is untouched');
    const r = g.act({ type: 'skill', skillId: 'Gravity Crush', targetIds: g.alive(g.combat.enemies).map((e) => e.id) });
    assert.ok(r.ok, r.error && r.error.message);
    assert.strictEqual(g.act({ type: 'union' }).error.code, 'ALREADY_IN_UNION');
    for (let t = 0; t < 199; t++) g.tick(100);
    assert.strictEqual(g.activeUnion(), 'lucifero', 'still merged at 19.9 s');
    g.tick(100);
    assert.strictEqual(g.activeUnion(), null, 'over at 20 s');
    assert.deepStrictEqual(g.ensureSkillBar(), own, 'your own bar is back');
    const cd = g.act({ type: 'union' });
    assert.strictEqual(cd.error.code, 'UNION_COOLDOWN');
    assert.match(cd.error.message, /40\.0s/);
    for (let t = 0; t < 400; t++) g.tick(100);
    assert.ok(g.act({ type: 'union' }).ok, 'ready again 60 s after it began');
});

test('Devil Union: the union\'s power and resonance apply only while merged; one contract equipped at a time, chosen any time you are not merged', () => {
    const g = bind(bind(world('realtime')), 'slotos');
    assert.deepStrictEqual(g.getUnion().unions.filter((u) => u.contract).map((u) => u.id), ['lucifero', 'slotos']);
    assert.ok(g.act({ type: 'equip_union', union: 'Slotos' }).ok);
    assert.strictEqual(g.act({ type: 'equip_union', union: 'plumede' }).error.code, 'NO_CONTRACT');
    g.story.flags.push('aspect_nahemoth');
    assert.ok(g.act({ type: 'set_resonance', slot: 0, aspect: 'nahemoth' }).ok);
    assert.strictEqual(g.act({ type: 'set_resonance', slot: 1, aspect: 'nahemoth' }).error.code, 'ALREADY_RESONATING', 'never the same aspect twice');
    assert.strictEqual(g.act({ type: 'set_resonance', slot: 2, aspect: null }).error.code, 'INVALID_SLOT', 'two slots');
    const walk = g.playerMoveMult();
    fight(g);
    assert.ok(g.act({ type: 'equip_union', union: 'lucifero' }).ok, 'you choose your demon in a fight too (Tokelo 2026-11-18)');
    assert.ok(g.act({ type: 'equip_union', union: 'slotos' }).ok);
    assert.strictEqual(g.unionMod(g.player, 'defence'), 0);
    g.act({ type: 'union' });
    assert.strictEqual(g.activeUnion(), 'slotos');
    assert.strictEqual(g.act({ type: 'equip_union', union: 'lucifero' }).error.code, 'ALREADY_IN_UNION', 'not while merged');
    assert.strictEqual(g.act({ type: 'set_resonance', slot: 1, aspect: null }).error.code, 'ALREADY_IN_UNION');
    assert.ok(g.unionMod(g.player, 'defence') >= 0.25, 'Slotos: toughness');
    assert.ok(g.playerMoveMult() > walk, 'Nahemoth resonance: faster while merged');
    g.combat.union = null;
    assert.strictEqual(g.unionMod(g.player, 'speed'), 0, 'nothing once it ends');
    // Saved choices survive a save; nothing half-merged is saved.
    const out = world('realtime');
    bind(bind(out), 'slotos'); out.act({ type: 'equip_union', union: 'slotos' });
    const again = GameEngine.fromSave(JSON.parse(JSON.stringify(out.serialize())));
    assert.strictEqual(again.getUnion().equipped, 'slotos');
});

test('Devil Union: turn fights merge for the turn you call it and 6 more, on an 18-turn cooldown; the text game takes "union"', () => {
    const g = fight(bind(world('turn')));
    g.input('union');
    assert.strictEqual(g.activeUnion(), 'lucifero');
    assert.ok(g.combat.awaitingPlayer, 'it never uses the turn');
    for (let i = 0; i < 6; i++) g.act({ type: 'attack', targetIds: [g.alive(g.combat.enemies)[0].id] });
    assert.strictEqual(g.activeUnion(), 'lucifero', 'still merged');
    g.act({ type: 'attack', targetIds: [g.alive(g.combat.enemies)[0].id] });
    assert.strictEqual(g.activeUnion(), null, 'over after six more of your turns');
    assert.strictEqual(g.act({ type: 'union' }).error.code, 'UNION_COOLDOWN');
});

test('Devil Union in the world sim: Gravity Well drags enemies toward the spot it lands on', () => {
    const { WorldSession } = require('../src/world/world.js');
    const { doubleWorld } = require('../src/world/scale16.js');
    const { ActionSim } = require('../src/action/sim.js');
    const WORLD = doubleWorld(require('../src/world/zone1.js'));
    const STEP = 1000 / 60;
    const g = bind(world('action', 'rogue'));
    g.player.hp = g.player.maxHp = 9999;
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    s.x = 41; s.y = 37;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 108 });
    const rats = () => sim.actors.filter((a) => a.encounterId === 'grounds_weed_rats' && !a.dead);
    sim.engageGroup(sim.groups.grounds_weed_rats);
    const p = sim.player;
    rats().forEach((a, i) => { a.x = p.x + 60 + i * 20; a.y = p.y + (i % 2 ? 14 : -14); a.foe = null; });
    for (const e of g.combat.enemies) e.hp = e.maxHp = 500;
    assert.ok(g.act({ type: 'union' }).ok);
    const frames = (n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(STEP, input)); return out; };
    const spot = { x: p.x + 70, y: p.y };
    rats().forEach((a, i) => { a.x = spot.x + 30; a.y = spot.y + (i ? 20 : -20); });
    // Watch each rat frame by frame: walking moves a rat a pixel or two a frame; the well yanks it toward the spot at once.
    let yanked = false, cast = false;
    for (let f = 0; f < 50 && !yanked; f++) {
        const before = rats().map((a) => Math.hypot(a.x - spot.x, a.y - spot.y));
        const out = sim.update(STEP, f === 0 ? { slot: 0, aim: spot } : { aim: spot });
        if (out.engineEvents.some((e) => /Gravity Well/.test(e.text || ''))) cast = true;
        rats().forEach((a, i) => { if (before[i] - Math.hypot(a.x - spot.x, a.y - spot.y) > 8) yanked = true; });
    }
    assert.ok(cast, 'cast from slot 1 while merged');
    assert.ok(yanked, 'a rat is dragged toward the spot');
    const HUD = require('../ui/action-hud.js');
    const cell = HUD.unionCell(g);
    assert.ok(cell && cell.active && cell.id === 'lucifero', 'the U cell shows the union');
    assert.strictEqual(g.errors.length, 0);
});

/** Three contracts in, at the third ruler's circle: the mark scene, then James at home. */
function thirdContract(g, { seals = false } = {}) {
    g.story.flags.push('james_recruited', 'james_settled', 'demonkore_heard', 'grimoire_obtained', 'underworld_opened');
    if (seals) g.story.flags.push('grimoire_from_seals');
    g.player.inventory.push('Binding Grimoire');
    bind(g, 'beelzebub'); bind(g, 'slotos');
    g.startTalk('lucifero_bound');
    say(g, /Open the grimoire/);
    assert.ok(!g.hasStoryFlag('demonkore_mark_recognized'), 'two contracts: no mark yet');
    return g;
}

test("Demonkore's mark: the ruler bound third sees it (once), CB3 starts; with fewer than three nothing happens", () => {
    const two = world();
    two.story.flags.push('grimoire_obtained'); two.player.inventory.push('Binding Grimoire');
    bind(two, 'beelzebub');
    two.startTalk('lucifero_bound');
    say(two, /Open the grimoire/);
    assert.ok(two.getAvailableActions().actions.some((a) => a.type === 'dialogue_choice' && /Goodbye/.test(a.text)));
    assert.ok(!two.getAvailableActions().actions.some((a) => a.type === 'dialogue_choice' && /Close the grimoire/.test(a.text)));
    for (const seals of [false, true]) {
        const g = world();
        g.story.flags.push('grimoire_obtained'); g.player.inventory.push('Binding Grimoire');
        if (seals) g.story.flags.push('grimoire_from_seals');
        bind(g, 'beelzebub'); bind(g, 'slotos');
        g.startTalk('lucifero_bound');
        say(g, /Open the grimoire/);
        say(g, /Close the grimoire/); say(g, /What about it/);
        say(g, seals ? /bard gave it to me/ : /From a merchant/);
        say(g, /Explain yourself/); say(g, /Demonkore\?/);
        assert.ok(g.hasStoryFlag('demonkore_mark_recognized'));
        assert.strictEqual(g.questState('CB3'), 'active');
        say(g, /Goodbye/);
        g.startTalk('lucifero_bound');
        assert.ok(!g.getAvailableActions().actions.some((a) => a.type === 'dialogue_choice' && /What about it/.test(a.text)), 'the scene plays once');
    }
});

test("Demonkore revealed at home: James admits it, gives Demonkore's Favor once (union x3, cooldown -30%), and keeps his shop", () => {
    const g = world('realtime');
    thirdContract(g);
    say(g, /Close the grimoire/); say(g, /What about it/); say(g, /From a merchant/); say(g, /Explain yourself/); say(g, /Demonkore\?/); say(g, /Goodbye/);
    g.startTalk('james');
    say(g, /Who is Demonkore/); say(g, /recognised your grimoire/); say(g, /Demonkore's book/);
    say(g, /bought it from a merchant/); say(g, /so funny/); say(g, /For some time/);
    assert.ok(g.hasStoryFlag('demonkore_revealed'));
    assert.strictEqual(g.questState('CB3'), 'complete');
    say(g, /joking/); say(g, /\.\.\./); say(g, /knew what waited/); say(g, /sent me anyway/); say(g, /Hand him the grimoire/);
    assert.ok(g.hasStoryFlag('demonkore_favor'));
    assert.strictEqual(g.player.inventory.filter((i) => i === 'Binding Grimoire').length, 1, 'the book is not duplicated');
    say(g, /What did you do/);
    assert.ok(g.getAvailableActions().actions.some((a) => a.type === 'dialogue_choice' && /What have you got/.test(a.text)), 'the shop stays open');
    assert.ok(!g.getAvailableActions().actions.some((a) => a.type === 'dialogue_choice' && /Who is Demonkore/.test(a.text)), 'asked once');
    say(g, /Goodbye/);
    const t = g.unionTiming();
    assert.strictEqual(t.durationSeconds, 60); assert.strictEqual(t.cooldownSeconds, 42);
    fight(g);
    g.act({ type: 'union' });
    for (let i = 0; i < 590; i++) g.tick(100);
    assert.ok(g.activeUnion(), 'still merged at 59 s with the Favor');
});

// Tokelo 2026-11-18: "the devil union doesn't even allow the player to select a demon ... why cant I use devil union out
// of combat?" You choose the demon as you call it, and a union works out of a fight on the calm clock.
test('Devil Union out of a fight: call it with the demon you choose; it runs on the calm clock, lends its skills, then the cooldown', () => {
    const g = bind(bind(world('action')), 'plumede');
    assert.ok(g.getAvailableActions().actions.some((a) => a.type === 'union' && a.enabled), 'offered out of a fight');
    const r = g.act({ type: 'union', union: 'plumede' });
    assert.ok(r.ok, r.error && r.error.message);
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.activeUnion(), 'plumede');
    assert.strictEqual(g.getUnion().equipped, 'plumede', 'the choice is kept');
    assert.deepStrictEqual(g.ensureSkillBar().slice(0, 3), KITS.plumede);
    assert.ok(r.events.some((e) => e.type === 'union' && e.active));
    assert.ok(g.unionMod(g.player, 'speed') > 0, "Plumede's agility out of a fight");
    // Its own skills work out of a fight too: Fleet Form is a real pre-buff.
    g.player.resource.current = g.player.resource.max;
    const ff = g.actionPrebuff('Fleet Form');
    assert.ok(ff.ok, ff.error && ff.error.message);
    assert.ok(g.player.statusEffects.some((s) => s.name === 'Fleet Form'));
    g.actionCalmTick(19900);
    assert.strictEqual(g.activeUnion(), 'plumede', 'still merged at 19.9 s');
    const end = g.actionCalmTick(200);
    assert.strictEqual(g.activeUnion(), null);
    assert.ok(end.some((e) => e.type === 'union' && !e.active), 'the end is an event (the armor fades)');
    const cd = g.act({ type: 'union' });
    assert.strictEqual(cd.error.code, 'UNION_COOLDOWN');
    g.actionCalmTick(40000);
    assert.ok(g.act({ type: 'union', union: 'lucifero' }).ok, 'ready after 60 s, and a different demon');
    assert.strictEqual(g.activeUnion(), 'lucifero');
    assert.strictEqual(g.act({ type: 'union', union: 'plumede' }).error.code, 'ALREADY_IN_UNION');
});

test('Devil Union carries: called out of a fight it comes into the fight with its time left, and back out; a fall ends it', () => {
    const g = bind(world('action'));
    assert.ok(g.act({ type: 'union' }).ok);
    g.actionCalmTick(5000);
    assert.ok(g.actionEngage('du_rats', ['rust_rat']).ok);
    assert.strictEqual(g.mode, 'combat');
    assert.strictEqual(g.activeUnion(), 'lucifero', 'merged in the fight');
    assert.strictEqual(g.getUnion().endsInMs, 15000, '15 s left');
    assert.strictEqual(g.act({ type: 'union' }).error.code, 'ALREADY_IN_UNION');
    for (let i = 0; i < 50; i++) g.tick(100);
    assert.ok(g.actionDisengage('du_rats').ok);
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.activeUnion(), 'lucifero', 'still merged out of the fight');
    assert.strictEqual(g.getUnion().endsInMs, 10000);
    g.actionCalmTick(10000);
    assert.strictEqual(g.activeUnion(), null);
    // The cooldown kept counting through the fight: 60 s from the call, 20 s gone.
    assert.ok(Math.abs(g.getUnion().readyInMs - 40000) < 1, `cooldown carried: ${g.getUnion().readyInMs}`);
    // A new fight doesn't reset the cooldown either.
    assert.ok(g.actionEngage('du_rats2', ['rust_rat']).ok);
    assert.strictEqual(g.act({ type: 'union' }).error.code, 'UNION_COOLDOWN');
    for (let i = 0; i < 400; i++) g.tick(100);
    assert.ok(g.act({ type: 'union' }).ok);
    g.player.hp = 0;
    g.actionRespawn();
    assert.strictEqual(g.activeUnion(), null, 'falling ends it');
    // The text game (turn fights) has no calm clock: out of a fight it says so.
    const t = bind(world('turn'));
    assert.strictEqual(t.act({ type: 'union' }).error.code, 'WRONG_MODE');
});

// Tokelo 2026-11-18: "the armor only has one side ... we dont have front back left right NW SW NE SE".
test('Devil Union armor turns 8 ways: every facing has its own helm and plate grid, and pieces move between behind and in front', () => {
    const FX = require('../ui/union-fx.js');
    const facings = Object.keys(FX.YAW);
    assert.strictEqual(facings.length, 8);
    const sets = [FX.PLATE, ...Object.values(FX.HELMS)];
    for (const set of sets) {
        const seen = new Set();
        for (const f of facings) {
            const rows = FX.gridAt(set, FX.pose({ facing8: f }));
            assert.strictEqual(rows.length, set.rows.length, `${f}: same height`);
            assert.ok(rows.every((r) => r.length === rows[0].length), `${f}: a rectangle`);
            seen.add(rows.join('/'));
        }
        assert.strictEqual(seen.size, 8, 'eight different looks');
        const right = FX.gridAt(set, FX.pose({ facing8: 'right' })), left = FX.gridAt(set, FX.pose({ facing8: 'left' }));
        assert.deepStrictEqual(left, right.map((r) => [...r].reverse().join('')), 'left mirrors right');
    }
    // A recording canvas: how much each layer draws.
    const ctx = () => { const g = { n: 0, fillRect() { g.n++; }, beginPath() {}, ellipse() {}, fill() {}, save() {}, restore() {}, createRadialGradient: () => ({ addColorStop() {} }) }; return g; };
    const layers = (id, f) => {
        const b = ctx(), fr = ctx(), st = { id, k: 1, burst: 0 }, view = { facing8: f, statuses: [] };
        FX.behind(b, 40, 64, st, view, 1000); FX.front(fr, 40, 64, st, view, 1000);
        return { back: b.n, front: fr.n };
    };
    // Plumede's wings are on your back: behind you facing the camera, over you facing away.
    const down = layers('plumede', 'down'), up = layers('plumede', 'up');
    assert.ok(up.front > down.front + 100 && down.back > up.back + 100, `wings: ${JSON.stringify({ down, up })}`);
    for (const id of Object.keys(FX.LOOKS)) for (const f of facings) { const l = layers(id, f); assert.ok(l.front > 0 && l.back > 0, `${id} ${f}`); }
});

test('Devil Union U cell: with more than one contract it asks which demon (Tokelo 2026-11-18), with one it just merges', () => {
    const HUD = require('../ui/action-hud.js');
    const one = bind(world('action'));
    assert.strictEqual(HUD.unionCell(one).choose, false);
    assert.ok(HUD.unionCell(one).enabled, 'usable out of a fight');
    const two = bind(bind(world('action')), 'beelzebub');
    assert.strictEqual(HUD.unionCell(two).choose, true);
    assert.deepStrictEqual(HUD.unionCell(two).owned, ['lucifero', 'beelzebub']);
    assert.ok(two.act({ type: 'union', union: 'beelzebub' }).ok);
    assert.strictEqual(HUD.unionCell(two).choose, false, 'merged: nothing to choose');
    assert.strictEqual(HUD.unionCell(two).id, 'beelzebub');
});
