// The kitchen (Tokelo, 2026-11-02): German dishes cooked or bought, meal buffs of up to 3 minutes that stack,
// semi-OP beer with a drunk penalty (controls inverted), farmed and foraged ingredients, livestock, goulash from
// rats and wolves, dairy from shops and quests, and Shane's cannabis brownies. Spec: docs/design/COOKING_AND_FOOD.md.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const { inspect, travel } = require('./world-helpers.js');

const FOOD = data.foodRules;
const items = data.itemDefinitions;
const meals = Object.entries(items).filter(([, d]) => d.use === 'meal');
const drinks = Object.entries(items).filter(([, d]) => d.use === 'drink');
const count = (g, item) => g.player.inventory.filter((i) => i === item).length;

/** A world run with a calm clock (action combat), standing on the homestead grounds. */
function world(cls = 'warrior', seed = 93) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    const s = new WorldSession(ZONE1, { engine: g });
    g.player.gold = 500;
    return { g, s };
}
const give = (g, item, n = 1) => { for (let i = 0; i < n; i++) g.player.inventory.push(item); };
const eat = (g, item) => g.act({ type: 'use_item', item });
const calm = (g, ms) => { for (let t = 0; t < ms; t += 500) g.actionCalmTick(500); };
function say(g, re) {
    const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(g.getAvailableActions().actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const has = (g, re) => (g.getAvailableActions().actions || []).some((x) => x.type === 'dialogue_choice' && re.test(x.text));

// ---------------------------------------------------------------- data
test('Kitchen data: at least ten German dishes, every buff at most 3 minutes, beer buffs stronger per stack', () => {
    assert.ok(meals.length >= 10, `${meals.length} dishes`);
    for (const [name, d] of [...meals, ...drinks]) {
        if (d.mods) assert.ok(d.seconds > 0 && d.seconds <= FOOD.maxSeconds, `${name}: ${d.seconds} s`);
        assert.ok(data.statusDefinitions[name] || !d.mods, `${name} has its own status`);
    }
    assert.strictEqual(FOOD.maxSeconds, 180);
    const best = (key, list) => Math.max(...list.map(([, d]) => (d.mods || {})[key] || 0));
    assert.ok(best('damage', drinks) > best('damage', meals), 'a beer hits harder than any one dish (semi-OP)');
    for (const name of ['Rattengulasch', 'Wolfsgulasch']) {
        const m = items[name].mods;
        for (const [k, v] of Object.entries(m)) assert.ok(v <= (k === 'regen' ? 0.5 : 0.05), `${name} is low tier (${k} ${v})`);
        assert.ok(items[name].heal < items.Schnitzel.heal, `${name} heals less than a schnitzel`);
    }
});

test('Kitchen data: every recipe can be made, and every ingredient has somewhere to come from', () => {
    const sources = new Set();
    for (const c of Object.values(data.cropDefinitions)) sources.add(c.produces);
    for (const f of Object.values(data.forageDefinitions)) sources.add(f.item);
    for (const s of Object.values(data.shopDefinitions)) for (const it of Object.keys(s.stock)) sources.add(it);
    for (const r of Object.values(data.recipeDefinitions)) sources.add(r.output);
    for (const e of Object.values(data.enemies)) for (const d of e.foodDrops || []) sources.add(d.item);
    for (const q of Object.values(STORY.quests)) for (const e of q.onComplete || []) if (e.item) sources.add(e.item);
    ['Wild Hops', 'Rye Sheaf', 'Sourdough Starter', 'Barley Seed'].forEach((x) => sources.add(x));   // Bread and Beer's own
    for (const [id, r] of Object.entries(data.recipeDefinitions).filter(([, x]) => x.station)) {   // the kitchen's (other tests add their own)
        assert.ok(items[r.output], `${id}: unknown output ${r.output}`);
        for (const ing of Object.keys(r.ingredients)) assert.ok(items[ing] && sources.has(ing), `${id}: no source for ${ing}`);
    }
    for (const [seed, c] of Object.entries(data.cropDefinitions)) assert.ok(sources.has(seed) || c.requiresUpgrade, `no way to get ${seed}`);
    // Dairy is store-bought or a quest gift, never farmed (Tokelo)
    for (const d of ['Fresh Milk', 'Cheese', 'Butter']) {
        assert.ok(!Object.values(data.cropDefinitions).some((c) => c.produces === d), `${d} is not farmed`);
        assert.ok(data.shopDefinitions.mara.stock[d], `Mara sells ${d}`);
    }
    assert.ok(STORY.quests.SF4.onComplete.some((e) => e.item === 'Cheese') && STORY.quests.SF1.onComplete.some((e) => e.item === 'Fresh Milk'), 'quests give dairy');
    assert.ok(data.shopDefinitions.shane.stock['Cannabis Seed'], 'Shane sells cannabis seeds');
    for (const shop of ['oda', 'greta', 'fenric']) assert.ok(STORY.npcs[shop].nodes.hello.choices.some((c) => (c.effects || []).some((e) => e.shop === shop)), `${shop} has a shop`);
});

test('Kitchen world: every forage spot and homestead station validates and can be reached', () => {
    const { validateWorld } = require('../src/world/world.js');
    assert.deepStrictEqual(validateWorld(ZONE1, data, STORY), []);
    const forage = Object.values(ZONE1.maps).flatMap((m) => (m.interactables || []).filter((o) => o.kind === 'forage'));
    assert.ok(forage.length >= 8, `${forage.length} forage spots`);
    assert.ok(forage.some((o) => o.forage === 'chanterelles'), 'mushrooms on the maps');
    const bad = JSON.parse(JSON.stringify(ZONE1));
    bad.maps.orchard.interactables.find((o) => o.kind === 'forage').forage = 'nowhere';
    assert.ok(validateWorld(bad, data, STORY).some((e) => /unknown forage 'nowhere'/.test(e)));
});

// ---------------------------------------------------------------- eating
test('Eating: a meal heals, buffs for its seconds on the calm clock, and wears off', () => {
    const { g } = world();
    g.player.hp = 50;
    give(g, 'Schnitzel');
    const r = eat(g, 'Schnitzel');
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.strictEqual(g.player.hp, 80);
    const st = g.findStatus(g.player, 'Schnitzel');
    assert.ok(st && st.calm && st.rtTotalMs === 180000, 'three minutes on the calm clock');
    assert.strictEqual(g.foodMod(g.player, 'damage'), 0.12);
    calm(g, 179000);
    assert.ok(g.findStatus(g.player, 'Schnitzel'), 'still up at 2:59');
    calm(g, 1500);
    assert.ok(!g.findStatus(g.player, 'Schnitzel'), 'gone after 3 minutes');
    assert.strictEqual(count(g, 'Schnitzel'), 0, 'eaten');
});

test('Eating: different dishes stack, the same dish adds a stack (cap 2), and four dishes is full', () => {
    const { g } = world();
    give(g, 'Schnitzel', 3); give(g, 'Bratwurst'); give(g, 'Käsespätzle'); give(g, 'Kartoffelsalat'); give(g, 'Pilzsuppe');
    eat(g, 'Schnitzel'); eat(g, 'Schnitzel'); eat(g, 'Schnitzel');
    assert.strictEqual(g.findStatus(g.player, 'Schnitzel').stacks, FOOD.sameDishStacks);
    eat(g, 'Bratwurst');
    assert.ok(Math.abs(g.foodMod(g.player, 'damage') - (0.12 * 2 + 0.06)) < 1e-9, 'Schnitzel ×2 + Bratwurst');
    eat(g, 'Käsespätzle'); eat(g, 'Kartoffelsalat');
    const opt = g.getAvailableActions().actions.find((a) => a.type === 'use_item' && a.item === 'Pilzsuppe');
    assert.strictEqual(opt.enabled, false);
    assert.strictEqual(opt.reason.code, 'TOO_FULL');
    const r = eat(g, 'Pilzsuppe');
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error.code, 'TOO_FULL', 'availability and the refusal agree');
    give(g, 'Helles');
    assert.ok(eat(g, 'Helles').ok, 'beer never fills you up');
});

test('Eating: food changes damage dealt and taken, and regen heals over time', () => {
    const { g } = world();
    const foe = { name: 'Dummy', hp: 999, maxHp: 999, def: 0, statusEffects: [], isPlayer: false };
    const skill = { name: 'Test', base_damage: [100, 100], damage_type: 'true' };
    const base = g.rollDamage(g.player, foe, { ...skill, damage_type: 'physical' }, g.newHit(foe)).damage;
    give(g, 'Helles', 2);
    eat(g, 'Helles'); eat(g, 'Helles');
    g.player.critChance = 0;
    const buffed = g.rollDamage(g.player, foe, { ...skill, damage_type: 'physical' }, g.newHit(foe)).damage;
    assert.ok(buffed > base * 1.25, `${base} -> ${buffed} with two Helles`);
    const taken = (x) => g.rollDamage(foe, g.player, { name: 'Bite', base_damage: [100, 100], damage_type: 'physical' }, g.newHit(g.player)).damage;
    const before = taken();
    give(g, 'Käsespätzle'); eat(g, 'Käsespätzle');
    assert.ok(taken() < before, 'Käsespätzle takes the edge off');
    give(g, 'Semmelknödel'); eat(g, 'Semmelknödel');
    g.player.hp = 10;
    calm(g, 10000);
    assert.ok(g.player.hp >= 19, `regen over 10 s: ${g.player.hp}`);
});

test('Eating: meal buffs come into an action fight and keep running out of it', () => {
    const { g } = world();
    give(g, 'Jägerschnitzel'); eat(g, 'Jägerschnitzel');
    calm(g, 60000);
    const carried = g.actionCarriedBuffs().find((b) => b.inst.name === 'Jägerschnitzel');
    assert.ok(carried && Math.abs(carried.leftMs - 120000) <= 500, 'two minutes left going in');
    g.combat = { rt: { now: 5000 } };
    const kept = g.actionBuffsLeavingFight(g.combat);
    g.combat = null;
    assert.ok(kept.some((b) => b.inst.name === 'Jägerschnitzel'), 'food runs on after the fight like a fight buff');
});

// ---------------------------------------------------------------- beer
test('Beer: four is fine, the fifth makes you Drunk and inverts the controls for 20 s', () => {
    const { g } = world();
    give(g, 'Helles', 3); give(g, 'Dunkel', 1); give(g, 'Weizen', 1);
    for (const b of ['Helles', 'Helles', 'Dunkel', 'Weizen']) assert.ok(eat(g, b).ok);
    assert.strictEqual(g.findStatus(g.player, 'Tipsy').stacks, 4);
    assert.strictEqual(g.controlsInverted(), false);
    const r = eat(g, 'Helles');
    assert.ok(r.events.some((e) => e.type === 'player.drunk'));
    assert.strictEqual(g.controlsInverted(), true);
    assert.ok(!g.findStatus(g.player, 'Tipsy'), 'the count starts over');
    assert.strictEqual(g.findStatus(g.player, 'Helles').stacks, 3, 'the same beer stacks to 3');
    calm(g, FOOD.drunk.seconds * 1000 + 500);
    assert.strictEqual(g.controlsInverted(), false, 'sober after 20 s');
    assert.ok(g.findStatus(g.player, 'Helles'), 'the beer buff lasts longer than the drunk');
});

test('Beer: Tipsy wears off, so beers spread over time never make you drunk', () => {
    const { g } = world();
    give(g, 'Helles', 6);
    for (let i = 0; i < 6; i++) { assert.ok(eat(g, 'Helles').ok); calm(g, FOOD.drunk.tipsySeconds * 1000 + 500); }
    assert.strictEqual(g.controlsInverted(), false);
});

test('Beer: the action sim walks you backwards while Drunk', () => {
    const W = doubleWorld(ZONE1);
    const g = new GameEngine({ seed: 5, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    const s = new WorldSession(W, { engine: g });
    s.place('grounds', 'from_house'); s.x = 30; s.y = 18;
    const step = (sim) => { const x = sim.player.x; for (let i = 0; i < 20; i++) sim.update(1000 / 60, { move: { x: 1, y: 0 } }); return sim.player.x - x; };
    assert.ok(step(new ActionSim({ engine: g, session: s, rules: g.data.actionRules })) > 0, 'sober: right is right');
    s.x = 30; s.y = 18;
    give(g, 'Helles', 5); for (let i = 0; i < 5; i++) eat(g, 'Helles');
    assert.ok(step(new ActionSim({ engine: g, session: s, rules: g.data.actionRules })) < 0, 'drunk: right walks left');
});

// ---------------------------------------------------------------- farming, livestock, foraging
test('Homestead: dig a field, grow Shane\'s cannabis on your own lot only, and bake brownies at the hearth', () => {
    const { g } = world();
    give(g, 'Cannabis Seed', 2);
    assert.strictEqual(g.act({ type: 'plant', plotId: 'homestead_field_west', seed: 'Cannabis Seed' }).ok, false, 'dig it first');
    assert.ok(g.act({ type: 'build', upgradeId: 'homestead_field_west' }).ok);
    g.player.homestead.built.briarwell_bed = true;
    assert.strictEqual(g.act({ type: 'plant', plotId: 'briarwell_bed', seed: 'Cannabis Seed' }).ok, false, 'not in the cloister garden');
    assert.ok(g.act({ type: 'plant', plotId: 'homestead_field_west', seed: 'Cannabis Seed' }).ok);
    calm(g, data.farmingRules.growSeconds * 1000);
    assert.ok(g.act({ type: 'harvest', plotId: 'homestead_field_west' }).ok);
    assert.strictEqual(count(g, 'Cannabis Leaf'), 3);
    give(g, 'Flour'); give(g, 'Egg'); give(g, 'Butter');
    assert.ok(g.act({ type: 'craft', recipeId: 'bake_brownies' }).ok);
    assert.strictEqual(count(g, "Shane's Brownie"), 2);
    eat(g, "Shane's Brownie");
    const st = g.findStatus(g.player, "Shane's Brownie");
    assert.ok(Object.keys(st.mods).length >= 4, 'extra buffs: more at once than any other dish');
});

test('Homestead: the pigsty costs Gold, a piglet eats one feed per tending, and becomes pork', () => {
    const { g } = world();
    g.player.gold = 5;
    assert.strictEqual(g.act({ type: 'build', upgradeId: 'homestead_sty' }).ok, false, 'not enough Gold');
    g.player.gold = 100;
    assert.ok(g.act({ type: 'build', upgradeId: 'homestead_sty' }).ok);
    give(g, 'Piglet'); give(g, 'Potato', 2);
    assert.ok(g.act({ type: 'plant', plotId: 'homestead_sty', seed: 'Piglet' }).ok);
    assert.ok(g.act({ type: 'tend', plotId: 'homestead_sty' }).ok);
    assert.ok(g.act({ type: 'tend', plotId: 'homestead_sty' }).ok);
    assert.strictEqual(count(g, 'Potato'), 0, 'two feedings, two potatoes');
    const r = g.act({ type: 'tend', plotId: 'homestead_sty' });
    assert.strictEqual(r.error.code, 'NO_FEED');
    give(g, 'Apple');
    assert.ok(g.act({ type: 'tend', plotId: 'homestead_sty' }).ok);
    assert.ok(g.act({ type: 'harvest', plotId: 'homestead_sty' }).ok);
    assert.strictEqual(count(g, 'Pork'), 3);
    assert.strictEqual(g.plotState('homestead_sty'), 'empty', 'the sty is empty again');
});

test('Homestead: a hen keeps laying', () => {
    const { g } = world();
    g.act({ type: 'build', upgradeId: 'homestead_coop' });
    give(g, 'Hen'); give(g, 'Wheat', 4);
    g.act({ type: 'plant', plotId: 'homestead_coop', seed: 'Hen' });
    for (let round = 0; round < 2; round++) {
        g.act({ type: 'tend', plotId: 'homestead_coop' }); g.act({ type: 'tend', plotId: 'homestead_coop' });
        assert.ok(g.act({ type: 'harvest', plotId: 'homestead_coop' }).ok);
    }
    assert.strictEqual(count(g, 'Egg'), 4);
    assert.strictEqual(g.plotState('homestead_coop'), 'growing', 'she is still there');
});

test('Homestead in the world: hearth and field stations run the same rules through their dialogue', () => {
    const { g, s } = world();
    travel(s, 'grounds');
    let r = inspect(s, 'grounds_field_east');
    assert.strictEqual(r.type, 'talk');
    say(g, /Dig east field \(free\)/);
    g.act({ type: 'dialogue_leave' });
    give(g, 'Seed Potato');
    inspect(s, 'grounds_field_east');
    say(g, /Plant the Seed Potato/);
    say(g, /Water and weed/);
    assert.ok(!has(g, /Water and weed/) && has(g, /Check on it/), 'watered and weeded once is all it takes');
    calm(g, (data.farmingRules.growSeconds - data.farmingRules.tendCutsSeconds) * 1000);
    say(g, /Harvest/);
    assert.strictEqual(count(g, 'Potato'), 3);
    g.act({ type: 'dialogue_leave' });
    give(g, 'Onion');
    inspect(s, 'grounds_hearth');
    assert.ok(!has(g, /Cook .*Schnitzel/), 'only what you can make is offered');
    say(g, /Cook 2 Kartoffelsalat/);
    assert.strictEqual(count(g, 'Kartoffelsalat'), 2);
    say(g, /What can I make here/);
});

test('Eating and healing in a fight (Tokelo, 2026-11-04): no waiting; items skip the 1 s recovery and never start it', () => {
    const g = new GameEngine({ seed: 4, combatMode: 'realtime' });
    g.start(); g.input('warrior'); g.input('engage');
    g.player.hp = g.player.maxHp = 99999;
    assert.ok(g.combat && g.combat.rt, 'a real-time fight');
    give(g, 'Schnitzel'); give(g, 'Bratwurst'); give(g, 'Brezel'); give(g, 'Bandages', 2);
    g.player.hp -= 500;
    assert.ok(g.act({ type: 'skill', skillId: 'Guard' }).ok, 'a skill starts the global cooldown');
    const opt = (item) => g.getAvailableActions().actions.find((o) => o.type === 'use_item' && o.item === item);
    assert.ok(opt('Schnitzel').enabled && opt('Bandages').enabled, 'items are not held up by it');
    for (const dish of ['Schnitzel', 'Bratwurst', 'Brezel']) assert.ok(eat(g, dish).ok, `${dish} straight after the last`);
    assert.strictEqual(['Schnitzel', 'Bratwurst', 'Brezel'].filter((d) => g.findStatus(g.player, d)).length, 3, 'three meal buffs up at once');
    assert.ok(g.act({ type: 'use_item', item: 'Bandages' }).ok);
    assert.ok(g.act({ type: 'use_item', item: 'Bandages' }).ok, 'bandage after bandage');
});

test('Quick heal (Tokelo, 2026-11-04): one key uses the best healing item; availability and act() agree', () => {
    const g = new GameEngine({ seed: 5, combatMode: 'realtime' });
    g.start(); g.input('warrior'); g.input('engage');
    const qh = () => g.getAvailableActions().actions.find((o) => o.type === 'quick_heal');
    assert.strictEqual(qh(), undefined, 'not listed while you carry nothing that heals');
    const potions = Object.entries(items).filter(([, d]) => d.use === 'heal' && d.value > 0).sort((a, b) => a[1].value - b[1].value);
    const [small, big] = [potions[0], potions[potions.length - 1]];
    assert.ok(small[1].value < big[1].value, 'two sizes of healing item to choose between');
    give(g, small[0]); give(g, big[0]); give(g, 'Schnitzel');
    g.player.hp = g.player.maxHp;
    assert.strictEqual(qh().reason.code, 'FULL_HEALTH');
    assert.strictEqual(g.act({ type: 'quick_heal' }).error.code, 'FULL_HEALTH');
    g.player.hp = g.player.maxHp - small[1].value;
    assert.strictEqual(qh().item, small[0], 'the smallest that heals all you lost');
    assert.ok(g.act({ type: 'quick_heal' }).ok);
    assert.strictEqual(g.player.hp, g.player.maxHp);
    assert.ok(!g.player.inventory.includes(small[0]));
    g.player.hp = 1;
    assert.strictEqual(qh().item, big[0], 'else the biggest');
    g.act({ type: 'quick_heal' });
    g.player.hp = 1;
    assert.strictEqual(qh().item, 'Schnitzel', 'no potions left: the dish that heals most');
    assert.ok(g.act({ type: 'quick_heal' }).ok);
    assert.ok(g.findStatus(g.player, 'Schnitzel'), 'eaten, buff and all');
    // Out of a fight, and in the text game, too.
    const t = new GameEngine({ seed: 5 }); t.start(); t.input('warrior');
    give(t, 'Bandages'); t.player.hp -= 5;
    t.input('qh');
    assert.ok(!t.player.inventory.includes('Bandages'), 'qh in the text game');
});

test('Quick heal never pours a beer (bug hunt 2026-11-07: mashing H with only beer left made you Drunk)', () => {
    const { g } = world();
    g.player.inventory = [];
    give(g, 'Helles', 6);
    g.player.hp = 10;
    assert.strictEqual(g.getAvailableActions().actions.find((o) => o.type === 'quick_heal'), undefined, 'beer alone is not a heal');
    for (let i = 0; i < 6; i++) g.act({ type: 'quick_heal' });
    assert.strictEqual(count(g, 'Helles'), 6, 'no beer drunk');
    assert.ok(!g.controlsInverted(), 'not drunk');
    give(g, 'Brezel');
    const qh = g.getAvailableActions().actions.find((o) => o.type === 'quick_heal');
    assert.strictEqual(qh.item, 'Brezel', 'a meal next to the beer is picked');
    assert.ok(eat(g, 'Helles').ok, 'beer still drinks on purpose');
});

test('Farming (Tokelo, 2026-11-04): a crop takes 120 s to ripen; watering and weeding takes 60 s off, once', () => {
    const { g } = world();
    assert.strictEqual(data.farmingRules.growSeconds, 120);
    assert.strictEqual(data.farmingRules.tendCutsSeconds, 60);
    g.act({ type: 'build', upgradeId: 'homestead_field_west' });
    g.act({ type: 'build', upgradeId: 'homestead_field_east' });
    give(g, 'Wheat Seed', 2);
    // Left alone: 120 s, and not a moment sooner.
    assert.ok(g.act({ type: 'plant', plotId: 'homestead_field_west', seed: 'Wheat Seed' }).ok);
    assert.strictEqual(g.plotState('homestead_field_west'), 'growing');
    calm(g, 119000);
    const early = g.act({ type: 'harvest', plotId: 'homestead_field_west' });
    assert.strictEqual(early.error.code, 'CROP_NOT_READY');
    assert.match(early.error.message, /1 s to go/);
    calm(g, 1000);
    assert.strictEqual(g.plotState('homestead_field_west'), 'ready');
    assert.ok(g.act({ type: 'harvest', plotId: 'homestead_field_west' }).ok);
    assert.strictEqual(count(g, 'Wheat'), 2);
    // Watered and weeded: 60 s. A second watering changes nothing and says how long is left.
    g.act({ type: 'plant', plotId: 'homestead_field_east', seed: 'Wheat Seed' });
    calm(g, 10000);
    assert.ok(g.act({ type: 'tend', plotId: 'homestead_field_east' }).ok);
    assert.strictEqual(g.plotView('homestead_field_east').leftMs, 50000);
    assert.strictEqual(g.plotState('homestead_field_east'), 'tended');
    const again = g.act({ type: 'tend', plotId: 'homestead_field_east' });
    assert.strictEqual(again.error.code, 'ALREADY_TENDED');
    assert.match(again.error.message, /50 s/);
    assert.strictEqual(g.plotView('homestead_field_east').leftMs, 50000, 'only once');
    calm(g, 50000);
    assert.ok(g.plotView('homestead_field_east').ready);
    assert.ok(g.act({ type: 'harvest', plotId: 'homestead_field_east' }).ok);
});

test('Farming: growth stages for the field art, saved with the run; livestock and the text game still count feedings', () => {
    const { g } = world();
    g.act({ type: 'build', upgradeId: 'homestead_field_west' });
    give(g, 'Cabbage Seed');
    g.act({ type: 'plant', plotId: 'homestead_field_west', seed: 'Cabbage Seed' });
    calm(g, 60000);
    const v = g.plotView('homestead_field_west');
    assert.strictEqual(v.produces, 'Cabbage');
    assert.ok(Math.abs(v.progress - 0.5) < 0.01 && !v.ready);
    const back = GameEngine.fromSave(g.serialize(), { combatMode: 'action' });
    assert.strictEqual(back.plotView('homestead_field_west').leftMs, 60000, 'the clock and the plot come back from a save');
    // A hen is fed, not timed.
    g.player.homestead.built.homestead_coop = true;
    give(g, 'Hen'); give(g, 'Wheat', 2);
    g.act({ type: 'plant', plotId: 'homestead_coop', seed: 'Hen' });
    assert.strictEqual(g.plotView('homestead_coop').timed, false);
    // The text game (no world clock) counts tendings as before.
    const t = new GameEngine({ seed: 3 });
    t.start(); t.input('warrior');
    t.player.homestead = { built: { homestead_field_west: true }, plots: {} };
    t.player.inventory.push('Onion Set');
    t.act({ type: 'plant', plotId: 'homestead_field_west', seed: 'Onion Set' });
    assert.strictEqual(t.plotView('homestead_field_west').timed, false);
    t.act({ type: 'tend', plotId: 'homestead_field_west' }); t.act({ type: 'tend', plotId: 'homestead_field_west' });
    assert.ok(t.act({ type: 'harvest', plotId: 'homestead_field_west' }).ok);
});

test('Foraging: mushrooms come off the map and grow back on the calm clock', () => {
    const { g, s } = world();
    travel(s, 'road');
    const o = s.map.interactables.find((x) => x.id === 'road_chanterelles');
    assert.ok(s.visibleObjects().some((x) => x.id === o.id));
    const r = inspect(s, o.id);
    assert.strictEqual(r.type, 'pickup');
    assert.strictEqual(count(g, 'Chanterelles'), 2);
    assert.ok(!s.visibleObjects().some((x) => x.id === o.id), 'picked');
    assert.strictEqual(g.act({ type: 'world_forage', nodeId: o.id, forageId: 'chanterelles' }).error.code, 'NOT_GROWN_BACK');
    calm(g, data.forageDefinitions.chanterelles.regrowSeconds * 1000);
    assert.ok(s.visibleObjects().some((x) => x.id === o.id), 'grown back');
    g.act({ type: 'world_forage', nodeId: o.id, forageId: 'chanterelles' });
    assert.ok(g.serialize().state.world.foraged[o.id] != null, 'saved with the world');
});

test('Goulash: rats and wolves always drop meat, which cooks into low-tier goulash', () => {
    const { g } = world();
    const rat = { ...JSON.parse(JSON.stringify(data.enemies.rust_rat)), lootClaimId: 'x:1' };
    assert.ok(g.rollEnemyLoot(rat).items.some((i) => i.item === 'Rat Meat'));
    const wolf = { ...JSON.parse(JSON.stringify(data.enemies.hungry_wolf)), lootClaimId: 'x:2' };
    assert.ok(g.rollEnemyLoot(wolf).items.some((i) => i.item === 'Wolf Meat'));
    give(g, 'Rat Meat', 2);
    assert.ok(g.act({ type: 'craft', recipeId: 'cook_rattengulasch' }).ok);
    g.player.hp = 10;
    assert.ok(eat(g, 'Rattengulasch').ok);
    assert.strictEqual(g.player.hp, 22);
});

test("Playtest 2026-11-11: a public hearth in Baker's Lane, and every hearth has a cooking menu the engine checks", () => {
    const { g, s } = world();
    s.place('village_residential_lane', 'from_village');
    const r = inspect(s, 'lane_hearth');
    assert.strictEqual(r.type, 'talk', 'the lane hearth answers E');
    let k = g.getAvailableActions().kitchen;
    assert.ok(k && k.station === 'hearth', 'it is a kitchen');
    const leber = k.recipes.find((x) => x.id === 'cook_leberkaese');
    assert.ok(leber && !leber.enabled && leber.reason.code === 'MISSING_INGREDIENTS');
    assert.ok(!g.act({ type: 'cook', recipeId: 'cook_leberkaese' }).ok, 'refused without the pork and roll');
    assert.ok(!g.act({ type: 'cook', recipeId: 'bake_broetchen' }).ok, "the oven's recipes aren't cooked at a hearth");
    give(g, 'Pork'); give(g, 'Brötchen');
    k = g.getAvailableActions().kitchen;
    assert.deepStrictEqual(k.pantry.map((p) => p.item).sort(), ['Brötchen', 'Pork']);
    const opt = g.getAvailableActions().actions.find((a) => a.type === 'cook' && a.recipeId === 'cook_leberkaese');
    assert.ok(opt.enabled, 'availability agrees with the rule');
    assert.ok(g.act({ type: 'cook', recipeId: 'cook_leberkaese' }).ok);
    assert.strictEqual(count(g, 'Leberkäsbrötchen'), 1);
    assert.strictEqual(g.getAvailableActions().awaiting, 'dialogue', 'you stay at the hearth');
    g.act({ type: 'dialogue_leave' });
    for (const id of ['grounds_hearth']) { s.place('grounds', Object.keys(s.world.maps.grounds.spawns)[0]); inspect(s, id); assert.ok(g.getAvailableActions().kitchen, `${id} has the menu`); g.act({ type: 'dialogue_leave' }); }
});
