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

const FS = data.skillWeb.legendaryWebs.fallen_seraphim;
const PATHS = {   // docs/design/FALLEN_SERAPHIM.md: one path per pair of wings, six nodes each, a capstone at 14
    face: ['judgement', 'grace', 'brand', 'rain_of_feathers', 'burning_grace', 'verdict'],
    feet: ['halo_of_ash', 'feather_ward', 'mercy', 'what_is_evil', 'communion', 'door'],
    wings: ['wingstep', 'gale', 'wings_of_sorrow', 'weightless', 'from_above', 'descent']
};
const trait = (id) => FS.nodes.find((n) => n.id === `fallen_seraphim.${id}`).trait;
const GIFTS = ['judgement', 'halo_of_ash', 'wingstep'];   // the statue's gift: owned free the moment it wakes
const won = (g) => { g.applyStoryEffects([{ flag: 'seraph_trial_won' }]); return g; };   // as if the Trial of the Live Coal were won
/** Wake the statue, level to `level`, and learn these nodes (short ids) in order (the gifts are already owned). */
function seraph(level, ids = [], cls = 'mage', seed = 96) {
    const g = world(cls, seed);
    gaze(g, 120); g.act({ type: 'dialogue_leave' });
    levelTo(g, level);
    if (g.pendingBranchChoice) { g.maybePromptBranch(); g.act({ type: 'choose_branch', branchId: 'free' }); }   // walk freely: no guide spends the points
    for (const id of ids) { if (!g.webOwns(`fallen_seraphim.${id}`)) g.act({ type: 'learn_node', nodeId: `fallen_seraphim.${id}` }); assert.ok(g.webOwns(`fallen_seraphim.${id}`), id); }
    return g;
}

test('Fallen Seraphim: a legendary web of three wing paths (six nodes each) and Seraph Unbound; every skill defined and every effect built', () => {
    assert.deepStrictEqual(SkillWeb.validateSkillWeb(data), []);
    const web = SkillWeb.buildSkillWeb(data);
    assert.ok(web.legendary.includes('fallen_seraphim'));
    const nodes = web.list.filter((n) => n.region === 'fallen_seraphim' && n.kind !== 'heart');
    assert.strictEqual(nodes.length, 19);
    assert.deepStrictEqual(nodes.map((n) => n.id.split('.')[1]).sort(), [...PATHS.face, ...PATHS.feet, ...PATHS.wings, 'unbound'].sort());
    assert.strictEqual(nodes.filter((n) => n.kind === 'active').length, 14);
    for (const path of Object.values(PATHS)) assert.strictEqual(web.nodes.get(`fallen_seraphim.${path[5]}`).minLevel, 14, `${path[5]} is a capstone`);
    // The six original nodes keep their ids (saves own them).
    for (const id of ['halo_of_ash', 'judgement', 'grace', 'wings_of_sorrow', 'what_is_evil', 'descent']) assert.ok(web.nodes.get(`fallen_seraphim.${id}`), id);
    const { registry } = require('../src/effects.js');
    for (const n of nodes.filter((x) => x.skill)) {
        const def = data.skillDefinitions[n.skill];
        assert.strictEqual(def.resource, 'any', `${n.skill} is paid from your own class resource`);
        assert.ok(def.liveDescription, `${n.skill} says what it does in a live fight`);
        for (const e of def.effects || []) assert.ok(registry[e.type] && !registry[e.type].partial, `${n.skill}: ${e.type}`);
    }
    for (const n of nodes.filter((x) => x.kind === 'passive')) assert.ok(n.trait.mods, `${n.trait.name} does what it says through data`);
    assert.strictEqual(data.legendaryAndSecretClasses.fallen_seraphim.name, 'Fallen Seraphim');
    assert.deepStrictEqual(data.legendaryAndSecretClasses.fallen_seraphim.ranks, FS.ranks.map((r) => r.name));
});

test('Fallen Seraphim: Seraph Unbound needs all three capstones, and holds them in place', () => {
    // The cheapest way there: every capstone's path, without Grace (5 + 6 + 4 through What Is Evil?) and Seraph Unbound.
    const g = won(seraph(18));
    g.webState().bonusPoints += 10;   // spare points; this test is about the rule, not the budget
    for (const id of ['brand', 'rain_of_feathers', 'burning_grace', 'verdict', ...PATHS.feet.slice(1, 5), 'wings_of_sorrow', 'weightless', 'from_above', 'descent'])
        { g.act({ type: 'learn_node', nodeId: `fallen_seraphim.${id}` }); assert.ok(g.webOwns(`fallen_seraphim.${id}`), id); }
    const unbound = () => g.getSkillWeb().nodes.find((n) => n.id === 'fallen_seraphim.unbound');
    assert.strictEqual(unbound().reason.code, 'NEEDS_NODES');
    assert.match(unbound().reason.message, /The Coal Carried Down/);
    assert.deepStrictEqual(unbound().needs, ['fallen_seraphim.verdict', 'fallen_seraphim.door', 'fallen_seraphim.descent']);
    g.act({ type: 'learn_node', nodeId: 'fallen_seraphim.door' });
    g.act({ type: 'learn_node', nodeId: 'fallen_seraphim.unbound' });
    assert.ok(g.webOwns('fallen_seraphim.unbound'));
    // Unlearning a capstone it rests on is refused (it is still linked to the other two, so links alone would allow it).
    assert.strictEqual(g.webUnlearnProblem('fallen_seraphim.verdict').code, 'NODE_ANCHORS_OTHERS');
});

test('Fallen Seraphim: five ranks (Fallen, Watcher, Ashen Seraph, Seraph Unbound, The Six-Winged), each announced once and answered by the statue', () => {
    const g = seraph(18);
    g.webState().bonusPoints += 10;
    assert.strictEqual(legend(g).rank, 'Fallen');
    const out = [];
    const learn = (id) => { if (g.webOwns(`fallen_seraphim.${id}`)) return; const r = g.act({ type: 'learn_node', nodeId: `fallen_seraphim.${id}` }); assert.ok(r.ok, `${id}: ${r.error && r.error.message}`); out.push(...r.events); };
    for (const id of ['feather_ward', 'mercy']) learn(id);   // heart + 3 gifts + 2
    assert.strictEqual(legend(g).rank, 'Fallen');
    const before = g.webPoints();
    learn('gale');   // heart + 6 nodes
    assert.strictEqual(legend(g).rank, 'Watcher');
    assert.strictEqual(g.webPoints(), before, 'the rank gives back the point the node cost');
    // Unlearn and learn again: the title is lost and won back, the gift is not paid twice.
    g.act({ type: 'unlearn_node', nodeId: 'fallen_seraphim.gale' });
    assert.strictEqual(legend(g).rank, 'Fallen');
    learn('gale');
    assert.strictEqual(g.webPoints(), before, 'paid for again, no second gift (the refund covered it)');
    assert.ok(out.some((e) => e.type === 'text' && /You rise: Watcher/.test(e.text)));
    assert.ok(g.hasStoryFlag('seraph_rank_watcher'));
    // The statue has something new to say, once: its name. Then it offers the trial.
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.story.dialogue.node, 'watcher');
    g.act({ type: 'dialogue_leave' });
    assert.ok(g.hasStoryFlag('seraph_heard_watcher'));
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.story.dialogue.node, 'trial');
    g.act({ type: 'dialogue_leave' });
    const view = legend(g).ranks;
    assert.deepStrictEqual(view.map((r) => r.reached), [true, true, false, false, false]);
    won(g);
    for (const id of [...PATHS.face, ...PATHS.feet, ...PATHS.wings]) learn(id);
    assert.strictEqual(legend(g).rank, 'Ashen Seraph');
    learn('unbound');   // the last node: Seraph Unbound and The Six-Winged at once
    assert.strictEqual(legend(g).rank, 'The Six-Winged');
    assert.strictEqual(out.filter((e) => e.type === 'text' && /You rise:/.test(e.text)).length, 5, 'each rank once (Watcher twice: it was lost and won back)');
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.story.dialogue.node, 'six', 'the last rank is heard first; the others wait for the next visits');
});

test('Fallen Seraphim at unlock: the statue gives one skill from each pair of wings and Fallen Grace, free and for good', () => {
    const g = world();
    const points = g.webPoints();
    const wake = gaze(g, 120);
    g.act({ type: 'dialogue_leave' });
    for (const id of GIFTS) assert.ok(g.webOwns(`fallen_seraphim.${id}`), id);
    for (const sk of ['Fallen Judgement', 'Halo of Ash', 'Wingstep']) assert.ok(g.player.skills.includes(sk), sk);
    assert.ok(g.player.traits.some((t) => t.name === 'Fallen Grace'));
    assert.strictEqual(g.webPoints(), points, 'no point spent, at level 1');
    assert.strictEqual(g.player.level, 1, 'no level gate on a gift');
    assert.ok(wake.some((e) => e.type === 'text' && /first gifts are already yours/.test(e.text)));
    assert.strictEqual(g.webUnlearnProblem('fallen_seraphim.judgement').code, 'NODE_FIXED');
    for (const sk of ['Fallen Judgement', 'Halo of Ash', 'Wingstep']) assert.strictEqual(data.skillDefinitions[sk].cost, 0, `${sk} runs on its cooldown, not your class resource`);
    const fg = g.player.traits.find((t) => t.name === 'Fallen Grace');
    assert.ok(Math.abs(g.traitDamageMult(g.player, {}) - (1 + fg.mods.damageDealt)) < 1e-9);
    // An older save that woke the statue before the gifts existed gets them on load (story catch-up).
    const old = world('warrior', 97);
    gaze(old, 120); old.act({ type: 'dialogue_leave' });
    const s = old.webState();
    s.nodes = s.nodes.filter((id) => !GIFTS.map((x) => `fallen_seraphim.${x}`).includes(id));
    old.player.skills = old.player.skills.filter((x) => !['Fallen Judgement', 'Halo of Ash', 'Wingstep'].includes(x));
    old.story.claimed = old.story.claimed.filter((k) => k !== 'catchup:seraph_gifts');
    old.runStoryCatchUp();
    for (const id of GIFTS) assert.ok(old.webOwns(`fallen_seraphim.${id}`), `${id} after catch-up`);
});

test('Fallen Seraphim: the second half is sealed until the Trial of the Live Coal is won (Caelith calls Aurevain)', () => {
    const g = seraph(18, ['feather_ward', 'mercy', 'gale']);
    g.webState().bonusPoints += 10;
    const node = (id) => g.getSkillWeb().nodes.find((n) => n.id === `fallen_seraphim.${id}`);
    for (const n of FS.nodes.filter((x) => x.trial)) assert.ok(n.minLevel >= 10, `${n.id} is the second half`);
    assert.strictEqual(node('what_is_evil').reason.code, 'TRIAL_LOCKED');
    assert.match(node('what_is_evil').reason.message, /Trial of the Live Coal/);
    assert.notStrictEqual((node('wings_of_sorrow').reason || {}).code, 'TRIAL_LOCKED', 'the first half stays open');
    // Caelith offers the trial after its name.
    g.act({ type: 'talk', npcId: 'seraph_statue' }); g.act({ type: 'dialogue_leave' });
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.story.dialogue.node, 'trial');
    const accept = g.getAvailableActions().actions.find((x) => x.type === 'dialogue_choice' && /Let it come/.test(x.text));
    g.act({ type: 'dialogue_choice', choiceId: accept.choiceId });
    g.act({ type: 'dialogue_leave' });
    assert.strictEqual(g.questState('QS1'), 'active');
    // Aurevain waits by the fountain while the quest is open.
    const s = new WorldSession(WORLD, { engine: g });
    s.place('kloster_inner', 'from_garth');
    const enc = s.map.encounters.find((e) => e.id === 'kloster_trial');
    assert.ok(enc && s.present(enc), 'the boss is in the courtyard');
    assert.deepStrictEqual(enc.enemies, ['heaven_doorwarden']);
    const boss = data.enemies.heaven_doorwarden;
    assert.ok(boss.maxHp >= 10 * data.enemies.crow_touched_warden.maxHp && boss.specialFlags.includes('boss'), 'ridiculously strong');
    assert.ok(data.actionRules.enemies.heaven_doorwarden.attacks.length >= 4);
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.story.dialogue.node, 'trial_wait');
    g.act({ type: 'dialogue_leave' });
    // Beat it: the quest completes, the seal lifts.
    g.storyEvent({ type: 'defeat', id: 'kloster_trial' });
    assert.strictEqual(g.questState('QS1'), 'complete');
    assert.ok(g.hasStoryFlag('seraph_trial_won'));
    assert.ok(!s.present(enc), 'it does not come back');
    assert.notStrictEqual((node('what_is_evil').reason || {}).code, 'TRIAL_LOCKED');
    g.act({ type: 'learn_node', nodeId: 'fallen_seraphim.what_is_evil' });
    assert.ok(g.webOwns('fallen_seraphim.what_is_evil'));
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.story.dialogue.node, 'trial_won');
});

test('Fallen Seraphim on you: a halo once the web opens; six wings and red eyes once every skill is learned', () => {
    const g = world();
    assert.deepStrictEqual(g.legendaryLook(), {}, 'nothing before the statue wakes');
    const s = won(seraph(18));
    assert.deepStrictEqual(s.legendaryLook(), { halo: true });
    s.webState().bonusPoints += 10;
    const all = [...PATHS.face, ...PATHS.feet, ...PATHS.wings, 'unbound'];
    for (const id of all.slice(0, -1)) if (!s.webOwns(`fallen_seraphim.${id}`)) s.act({ type: 'learn_node', nodeId: `fallen_seraphim.${id}` });
    assert.deepStrictEqual(s.legendaryLook(), { halo: true }, 'one skill short');
    s.act({ type: 'learn_node', nodeId: 'fallen_seraphim.unbound' });
    assert.deepStrictEqual(s.legendaryLook(), { halo: true, wings: true, redEyes: true });
    assert.deepStrictEqual(s.getSkillWeb().look, { halo: true, wings: true, redEyes: true });
});

test('Fallen Seraphim mastered: Caelith offers five holy weapons; you take the one you choose, once', () => {
    const g = seraph(18);
    g.webState().bonusPoints += 10;
    won(g);
    for (const id of [...PATHS.face, ...PATHS.feet, ...PATHS.wings, 'unbound']) if (!g.webOwns(`fallen_seraphim.${id}`)) g.act({ type: 'learn_node', nodeId: `fallen_seraphim.${id}` });
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.strictEqual(g.story.dialogue.node, 'six');
    const HOLY = ['Emberward', 'Spear of the Altar Fire', 'Twin Pinions', 'Censer of Ash', 'Grey Feather Scythe'];
    for (const w of HOLY) { const d = data.itemDefinitions[w]; assert.ok(d.holy && d.type === 'weapon' && d.slot === 'mainHand' && d.bound && !d.sellable, w); assert.ok(!d.legalClasses, `${w}: any class`); }
    const choices = g.getAvailableActions().actions.filter((x) => x.type === 'dialogue_choice');
    assert.strictEqual(choices.length, 6, 'five weapons, or not yet');
    const pick = choices.find((c) => /Censer of Ash/.test(c.text));
    const r = g.act({ type: 'dialogue_choice', choiceId: pick.choiceId });
    assert.ok(r.ok, r.error && r.error.message);
    assert.ok(g.player.inventory.includes('Censer of Ash'));
    assert.ok(HOLY.filter((w) => w !== 'Censer of Ash').every((w) => !g.player.inventory.includes(w)), 'the others go back to the water');
    g.act({ type: 'dialogue_leave' });
    const eq = g.act({ type: 'equip', item: 'Censer of Ash' });
    assert.ok(eq.ok, eq.error && eq.error.message);
    assert.strictEqual(g.player.equipment.mainHand, 'Censer of Ash', 'a mage wields it');
    // Heard once; the gift is never paid twice.
    g.act({ type: 'talk', npcId: 'seraph_statue' });
    assert.notStrictEqual(g.story.dialogue.node, 'six');
    assert.ok(g.story.claimed.includes('seraph_holy_weapon'));
});

test('Fallen Seraphim: the new passives (Burning Grace, Weightless, Seraph Unbound) work through data', () => {
    const g = world();
    const low = { traits: [trait('burning_grace')], hp: 40, maxHp: 100, specialFlags: [] };
    assert.ok(Math.abs(g.traitDamageMult(low, { specialFlags: [] }) - 1.25) < 1e-9, 'under half HP');
    assert.strictEqual(g.traitDamageMult({ ...low, hp: 60 }, { specialFlags: [] }), 1, 'over half HP');
    assert.ok(Math.abs(g.traitDamageMult({ traits: [trait('weightless')] }, {}) - 1.1) < 1e-9);
    const unbound = { traits: [trait('unbound')], specialFlags: [] };
    assert.ok(Math.abs(g.traitDamageMult(unbound, {}) - 1.15) < 1e-9);
    assert.ok(Math.abs(g.traitDamageMult({}, unbound) - 0.9) < 1e-9);
});

test('Fallen Seraphim: Mercy of the Fallen heals a quarter of max HP and burns poison away; The Coal Carried Down heals 40%', () => {
    const { registry } = require('../src/effects.js');
    const g = world();
    const p = g.player;
    p.hp = 10;
    p.statusEffects.push({ name: 'Poison', type: 'dot', category: 'dot', value: 3, duration: 3 });
    const mercy = data.skillDefinitions['Mercy of the Fallen'];
    for (const effect of mercy.effects) registry[effect.type].apply({ engine: g, caster: p, targets: [p], skill: { name: 'Mercy of the Fallen', ...mercy }, effect });
    assert.strictEqual(p.hp, Math.min(p.maxHp, 10 + Math.floor(p.maxHp * 0.25)));
    assert.ok(!p.statusEffects.some((x) => x.name === 'Poison'), 'poison burned away');
    p.hp = 1;
    registry.heal_percent.apply({ engine: g, caster: p, targets: [p], skill: { name: 'The Coal Carried Down' }, effect: { type: 'heal_percent', value: 0.4 } });
    assert.strictEqual(p.hp, 1 + Math.floor(p.maxHp * 0.4));
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

test('Fallen Seraphim: every skill casts cleanly, in a turn fight and in a live action fight', () => {
    const { hallway } = require('./helpers.js');
    const { doubleWorld: dw } = require('../src/world/scale16.js');
    const skills = FS.nodes.filter((n) => n.skill).map((n) => n.skill);
    assert.strictEqual(skills.length, 14);
    for (const name of skills) {
        const t = hallway('mage', name);
        t.player.hp = Math.floor(t.player.maxHp / 2);   // room to heal
        const single = data.skillDefinitions[name].target === 'enemy_single';
        const r = t.act({ type: 'skill', skillId: name, ...(single ? { targetIds: ['enemy_0'] } : {}) });
        assert.ok(r.ok, `${name} (turn): ${r.error && r.error.message}`);
        // Live: on the skill bar, in a fight with the grounds rats.
        const g = new GameEngine({ seed: 96, combatMode: 'action' });
        g.start(); g.input('warrior'); g.enterWorld();
        g.player.hp = g.player.maxHp = 9999;
        g.player.skills.push(name);
        const bar = g.ensureSkillBar(); bar[bar.indexOf(null) === -1 ? 5 : bar.indexOf(null)] = name;
        const s = new WorldSession(dw(ZONE1), { engine: g });
        s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
        s.x = 41; s.y = 37;
        const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 96 });
        sim.engageGroup(sim.groups.grounds_weed_rats);
        g.player.resource.current = g.player.resource.max;
        const outs = [];
        outs.push(sim.update(1000 / 60, { slot: g.ensureSkillBar().indexOf(name) }));
        const fx = outs[0].fx || [];
        assert.ok((sim.player.attack && sim.player.attack.skill === name) || fx.some((f) => f.type === 'cast' && f.skill === name), `${name} (live) is cast`);
        for (let i = 0; i < 90; i++) outs.push(sim.update(1000 / 60, {}));
        const said = outs.flatMap((o) => o.engineEvents || []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
        assert.ok(!/INTERNAL|Error/.test(said), `${name} (live): ${said.slice(0, 200)}`);
    }
});
