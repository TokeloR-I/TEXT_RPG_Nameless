// James the bard (Tokelo, 2026-11-13: "in chapter 2 introduce a bard that will join you at your homestead after
// recruiting him ... add a place holder for a quest he will give you where you get to make a deal with a dark being
// called demonkore"). Reworked 2026-11-17 after docs/design/JAMES_DEMONKORE_DEVIL_UNION_NARRATIVE_DESIGN.md: three music
// questions and his lute back from Sven before he moves home; a homestead shop; CB2's paid and free routes to the way below.
// The Underworld arena and the Devil Union class are not built here (the arena waits on Tokelo's picture).
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const CH2 = require('../src/story/chapter2.js');
const { inspect } = require('./world-helpers.js');

function run() {
    const g = new GameEngine({ seed: 101 });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07', 'Q08', 'C201']) g.story.quests[q].state = 'complete';
    g.story.flags.push('chapter_one_complete', 'aspect_nahemoth', 'anchor:homestead', 'north_gate_open');
    g.story.quests.C202.state = 'active';
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('skeldvik', 'from_pass');
    return { g, s };
}
function say(g, re) {
    const a = g.getAvailableActions(), c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(a.actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const text = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');

const { walkTo } = require('./world-helpers.js');
const SEALS = ['Seal of Invocation', 'Seal of Dominion', 'Seal of Covenant'];
const choices = (g) => (g.getAvailableActions().actions || []).filter((x) => x.type === 'dialogue_choice').map((x) => x.text);
/** Answer all three of James's questions, getting the first one wrong once (it must be retryable). */
function riddles(g) {
    say(g, /Ask me your questions/);
    say(g, /angel calling/); assert.ok(!g.hasStoryFlag('james_riddle_1'), 'a wrong answer counts for nothing');
    say(g, /Ask me again/);
    say(g, /join the dead in their dance/); say(g, /Next question/);
    say(g, /Double-bass drum/); say(g, /Last question/);
    say(g, /^A lute/);
    assert.ok(g.hasStoryFlag('james_riddles_done'));
}
/** CB1 from the first word to James standing by your well. `luteFirst`: fetch the lute before the questions. `pay`: buy it back. */
function recruit(g, s, { luteFirst = false, pay = false } = {}) {
    assert.strictEqual(inspect(s, 'skeldvik_james').type, 'talk');
    assert.strictEqual(g.questState('CB1'), 'active');
    say(g, /room at my homestead/);
    say(g, /What will convince you/);
    assert.ok(!choices(g).some((c) => /See you there/.test(c)), 'no longer recruited just by asking');
    const lute = () => {
        assert.strictEqual(inspect(s, 'skeldvik_sven').type, 'talk');
        say(g, /belongs to James/);
        if (pay) { g.player.gold = Math.max(g.player.gold, 40); const before = g.player.gold; say(g, /forty Gold/); assert.strictEqual(g.player.gold, before - 40); }
        else say(g, /fetch Thora/);
        say(g, /Goodbye/);
        assert.ok(g.player.inventory.includes("James's Lute"));
    };
    if (luteFirst) { say(g, /Goodbye/); lute(); inspect(s, 'skeldvik_james'); say(g, /Here is your lute/); say(g, /Ask me your questions/); 
        say(g, /join the dead/); say(g, /Next question/); say(g, /Double-bass/); say(g, /Last question/); say(g, /^A lute/); say(g, /So, the homestead/); }
    else { riddles(g); say(g, /Where is your lute/); say(g, /Goodbye/); assert.ok(!g.hasStoryFlag('james_recruited'), 'riddles alone are not enough');
        lute(); inspect(s, 'skeldvik_james'); say(g, /Here is your lute/); say(g, /So, the homestead/); }
    say(g, /The homestead/); say(g, /See you there/);
    assert.ok(g.hasStoryFlag('james_recruited'));
    assert.ok(!g.player.inventory.includes("James's Lute"), 'the lute goes back to him');
    s.place('grounds', 'from_house');
    assert.strictEqual(inspect(s, 'grounds_james').type, 'talk');
    assert.strictEqual(g.questState('CB1'), 'complete');
}

test('CB1: James wants three right answers and his lute back from Sven, in either order, before he moves home', () => {
    for (const opts of [{}, { luteFirst: true }, { pay: true }]) {
        const { g, s } = run();
        recruit(g, s, opts);
        const sk = ZONE1.maps.skeldvik.interactables.find((o) => o.id === 'skeldvik_james');
        assert.ok(!s.allows(sk.when), 'he is gone from the inn');
        say(g, /Goodbye/);
    }
});

test('James at home: a shop of infernal wares that work like timed tonics; the grimoire is for sale at an absurd price', () => {
    const { g, s } = run();
    recruit(g, s);
    say(g, /What have you got/);
    g.player.gold = 100;
    g.act({ type: 'buy', shopId: 'james', item: 'Brimstone' });
    assert.ok(g.player.inventory.includes('Brimstone'));
    say(g, /Goodbye/);
    g.act({ type: 'use_item', item: 'Brimstone' });
    assert.ok(!g.player.inventory.includes('Brimstone'), 'used up');
    assert.ok(g.player.statusEffects.some((x) => x.name === 'Brimstone' && x.mods && x.mods.damage > 0), 'a damage buff');
    const book = g.data.shopDefinitions.james.stock['Binding Grimoire'];
    assert.ok(book.buyPrice >= 10000 && book.quantity === 1);
    assert.strictEqual(g.itemDef('Binding Grimoire').bound, true, 'never sold back or duplicated');
});

test('CB2 paid route: buy the grimoire and James opens the way below at once, with no seals', () => {
    const { g, s } = run();
    recruit(g, s);
    say(g, /What have you got/);
    g.player.gold = 100000;
    g.act({ type: 'buy', shopId: 'james', item: 'Binding Grimoire' });
    assert.ok(g.player.inventory.includes('Binding Grimoire'));
    say(g, /Goodbye/);
    inspect(s, 'grounds_james');
    say(g, /Where do I go/); say(g, /Stand back/);
    assert.ok(g.hasStoryFlag('underworld_opened'));
    assert.ok(!g.hasStoryFlag('seal_hunt'), 'no seals asked for');
    assert.strictEqual(g.questState('CB2'), 'active');
    assert.strictEqual(g.currentObjective('CB2').id, 'arena', 'next: the Underworld, which waits on its picture');
    assert.ok(s.allows(ZONE1.maps.grounds.interactables.find((o) => o.id === 'grounds_underworld_stair').when), 'the stair is by the well');
    // The shop never sells a second book.
    say(g, /Goodbye/); inspect(s, 'grounds_james'); say(g, /What have you got/);
    g.player.gold = 100000;
    g.act({ type: 'buy', shopId: 'james', item: 'Binding Grimoire' });
    assert.strictEqual(g.player.inventory.filter((i) => i === 'Binding Grimoire').length, 1);
    assert.strictEqual(g.player.gold, 100000);
});

test('CB2 free route: three seals, any order, James vague until all three are in; then the book and the way below, no Gold', () => {
    const { g, s } = run();
    recruit(g, s);
    say(g, /book cost more than a house/); say(g, /What does it do/); say(g, /afford it/);
    assert.strictEqual(g.questState('CB2'), 'active');
    say(g, /What are these seals for/);
    const vague = text(say(g, /not an answer/));
    assert.ok(!/Underworld|contract|Devil|Demonkore/i.test(vague), 'nothing explained before all three');
    say(g, /Where do I look/); say(g, /Goodbye/);
    assert.ok(g.hasStoryFlag('seal_hunt'));
    const gold = g.player.gold;
    for (const [map, id] of [['hrafnholm', 'hrafnholm_seal'], ['frostspine_pass', 'frostspine_seal'], ['gullstrand_coast', 'gullstrand_seal']]) {
        s.place(map, Object.keys(ZONE1.maps[map].spawns)[0]);
        inspect(s, id);
    }
    for (const seal of SEALS) assert.ok(g.player.inventory.includes(seal), seal);
    s.place('grounds', 'from_house');
    inspect(s, 'grounds_james');
    say(g, /what I earned/);
    say(g, /Stand back/);
    assert.ok(g.player.inventory.includes('Binding Grimoire'));
    for (const seal of SEALS) assert.ok(!g.player.inventory.includes(seal), `${seal} handed over`);
    assert.strictEqual(g.player.gold, gold, 'no Gold paid');
    assert.ok(g.hasStoryFlag('underworld_opened'));
    assert.strictEqual(g.currentObjective('CB2').id, 'arena');
});

test('CB2: the arena and the contract wait on the Underworld picture, and nothing in the game reveals who James is', () => {
    const q = CH2.quests.CB2;
    for (const id of ['arena', 'contract']) assert.strictEqual(q.objectives.find((o) => o.id === id).awaitsArea, 'underworld_arena');
    assert.ok(!JSON.stringify([CH2.npcs, CH2.triggers]).includes('"id":"devil_union_contract"'), 'no contract until the arena exists');
    const said = JSON.stringify([CH2.npcs.james, CH2.npcs.sven]);
    assert.ok(!/Devil Union|nine (rulers|demons|unions)|I am Demonkore|You already have/i.test(said), 'no early class dump or Demonkore reveal');
});

test('James: an old save that recruited him on the old easy invitation keeps him at home; one that met him meets the new terms', () => {
    const { g, s } = run();
    inspect(s, 'skeldvik_james');
    say(g, /Goodbye/);
    g.story.flags.push('james_recruited', 'james_settled', 'demonkore_heard');   // the 2026-11-13 version
    g.story.quests.CB1.state = 'complete';
    g.story.quests.CB2 = { state: 'active', step: 1 };
    const save = JSON.parse(JSON.stringify(g.serialize()));
    save.state.story.claimed = save.state.story.claimed.filter((c) => c !== 'catchup:james_terms_kept');
    save.game.revision = 16;
    const again = GameEngine.fromSave(save);
    for (const f of ['james_riddles_done', 'james_lute_returned']) assert.ok(again.hasStoryFlag(f), f);
    assert.strictEqual(again.currentObjective('CB2').id, 'grimoire');
    const s2 = new WorldSession(ZONE1, { engine: again });
    s2.place('grounds', 'from_house');
    assert.strictEqual(inspect(s2, 'grounds_james').type, 'talk');
    assert.ok(choices(again).some((c) => /book on your shelf/.test(c)), 'his job offer is waiting');
});

test('James: a save from before he existed loads with his quests unseen, and he is waiting in Skeldvik', () => {
    const { g } = run();
    const save = JSON.parse(JSON.stringify(g.serialize()));
    delete save.state.story.quests.CB1; delete save.state.story.quests.CB2;   // made before James was added
    save.game.revision = 4;
    const again = GameEngine.fromSave(save);
    assert.strictEqual(again.questState('CB1'), 'unseen');
    assert.strictEqual(again.questState('CB2'), 'unseen');
    const s2 = new WorldSession(ZONE1, { engine: again });
    s2.place('skeldvik', 'from_pass');
    assert.strictEqual(inspect(s2, 'skeldvik_james').type, 'talk');
    assert.strictEqual(again.questState('CB1'), 'active');
});
