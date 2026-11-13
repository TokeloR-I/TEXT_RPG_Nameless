// James the bard (Tokelo, 2026-11-13: "in chapter 2 introduce a bard that will join you at your homestead after
// recruiting him ... add a place holder for a quest he will give you where you get to make a deal with a dark being
// called demonkore"). Met outside the Stormtide Inn in Skeldvik (no new area), recruited by asking, then lives on the
// homestead grounds. The Demonkore quest (CB2) is a placeholder on purpose: it starts and stays open.
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

test('James: met outside the Stormtide Inn, recruited by asking, and found again on the homestead grounds', () => {
    const { g, s } = run();
    const r = inspect(s, 'skeldvik_james');
    assert.strictEqual(r.type, 'talk', JSON.stringify(r).slice(0, 200));
    assert.ok(/bard from the south/.test(text(r)));
    assert.strictEqual(g.questState('CB1'), 'active', 'listening to him starts his quest');
    say(g, /Play something/);
    say(g, /room at my homestead/);
    say(g, /See you there/);
    assert.ok(g.hasStoryFlag('james_recruited'));
    assert.strictEqual(g.currentObjective('CB1').id, 'home');
    // He leaves Skeldvik and is on the grounds.
    const sk = ZONE1.maps.skeldvik.interactables.find((o) => o.id === 'skeldvik_james');
    const gr = ZONE1.maps.grounds.interactables.find((o) => o.id === 'grounds_james');
    assert.ok(!s.allows(sk.when), 'he is gone from the inn');
    s.place('grounds', 'from_house');
    const home = inspect(s, 'grounds_james');
    assert.strictEqual(home.type, 'talk', JSON.stringify(home).slice(0, 200));
    assert.ok(gr && gr.when.flags.includes('james_recruited'));
    assert.strictEqual(g.questState('CB1'), 'complete');
    // The Demonkore hook starts the placeholder quest, which stays open: nothing finishes it yet.
    assert.strictEqual(g.questState('CB2'), 'unseen');
    say(g, /something is on your mind/);
    assert.strictEqual(g.questState('CB2'), 'active');
    assert.strictEqual(g.currentObjective('CB2').id, 'deal');
    assert.ok(/not written yet/.test(g.currentObjective('CB2').text), 'the Journal says the rest is still to come');
    say(g, /Tell me again about Demonkore/);
    say(g, /Goodbye/);
    assert.strictEqual(g.questState('CB2'), 'active');
});

test('James: the Demonkore quest is a marked placeholder, and nothing in the game completes it', () => {
    const q = CH2.quests.CB2;
    assert.ok(q.placeholder && q.teaser);
    assert.strictEqual(q.xp, 0);
    assert.ok(!JSON.stringify([CH2.npcs, CH2.triggers]).includes('"id":"demonkore_deal"'), 'no line fires the deal until Tokelo writes it');
});

test('James: a save from before he existed loads with his quests unseen, and he is waiting in Skeldvik', () => {
    const { g, s } = run();
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
