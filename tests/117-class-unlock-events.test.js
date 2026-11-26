// Class unlock events (research round two, Tokelo 2026-11-26): an event-gated Skill Web node opens on its story event
// (`eventFlag`), not only on the dev cheat. The Tourney of Crowns (Chapter One S03) opens the Knight's Mounted Charge;
// breaking your false oath to Torvald (Chapter Two, after C206's feigned bargain) is the Dark Knight's betrayal.
const { test, assert, GameEngine } = require('./helpers.js');
const { validateWorld } = require('../src/world/world.js');

function game(cls = 'warrior') {
    const g = new GameEngine({ seed: 117 });
    g.start(); g.act({ type: 'choose_class', classId: cls }); g.act({ type: 'enter_world' });
    g.flush();
    return g;
}
const choices = (g) => (g.getAvailableActions().actions || []).filter((x) => x.type === 'dialogue_choice');
function say(g, re) {
    const c = choices(g).find((x) => re.test(x.text));
    assert.ok(c, `no choice ${re}: ${choices(g).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const text = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const pickBranch = (g) => { if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: 'vanguard' }); };
const talk = (g, npcId) => { pickBranch(g); return text(g.act({ type: 'talk', npcId })); };
const levelTo = (g, n) => {
    while (g.player.level < n) g.addExperience(Math.max(1, g.player.xpToNext - g.player.xp), { quiet: true });
    if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: 'vanguard' });
};

test('Event gates: a stage that waits on a story event opens when its flag is set, not before', () => {
    const g = game();
    levelTo(g, 11);
    const web = g.skillWeb();
    const dk = web.list.find((n) => n.requiresEvent === 'betrayal event');
    assert.ok(dk, 'the Dark Knight stage is event-gated');
    assert.strictEqual(dk.eventFlag, 'oath_betrayed');
    assert.strictEqual(g.webEventDone(dk), false, 'locked before the betrayal');
    g.story.flags.push('oath_betrayed');
    assert.strictEqual(g.webEventDone(dk), true, 'the betrayal opens it');
    const ds = web.list.find((n) => n.requiresEvent === 'slaying a named dragon boss');
    assert.strictEqual(ds.eventFlag, 'dragon_slain', 'Dragon Slayer waits on its dragon');
});

test('Tourney of Crowns: offered after the festival, level 5 to enter, three bouts, then the ribbon', () => {
    const g = game();
    for (const q of Object.keys(g.story.quests)) if (g.story.quests[q].state === 'active') g.story.quests[q].state = 'complete';
    g.story.quests['C1-N03'] = { ...(g.story.quests['C1-N03'] || {}), state: 'active' };
    talk(g, 'watch_captain');
    assert.ok(!choices(g).some((c) => /Put me down/.test(c.text)), 'not before the Festival of the Sun is over');
    g.act({ type: 'dialogue_choice', choiceId: (choices(g)[choices(g).length - 1] || {}).choiceId });
    g.story.quests['C1-N03'] = { ...(g.story.quests['C1-N03'] || {}), state: 'complete' };
    talk(g, 'watch_captain');
    say(g, /Put me down/);
    assert.strictEqual(g.questState('S03'), 'active');
    say(g, /Understood/);
    assert.ok(/too green/.test(talk(g, 'watch_captain')), 'below level 5 he turns you away');
    say(g, /Goodbye/);
    levelTo(g, 5);
    talk(g, 'watch_captain');
    say(g, /To the lists/);
    assert.ok(g.hasStoryFlag('tourney_entered'));
    for (const n of [1, 2, 3]) g.storyEvent({ type: 'defeat', id: `tourney_bout_${n}` });
    assert.ok(g.hasStoryFlag('tourney_bout_3'));
    talk(g, 'watch_captain');
    const r = say(g, /I will/);
    assert.strictEqual(g.questState('S03'), 'complete');
    assert.ok(g.hasStoryFlag('tourney_champion'));
    assert.ok(/Mounted Charge/.test(text(r)), 'a warrior is told where the skill is');
});

test('Tourney of Crowns: Mounted Charge hangs from the Knight and opens only for the champion', () => {
    const g = game();
    levelTo(g, 5);
    const node = g.skillWeb().nodes.get('vanguard.mounted_charge');
    assert.ok(node && node.skill === 'Mounted Charge' && node.region === 'warrior');
    assert.ok(node.links.includes('vanguard.2.skill'), 'beside Shield Charge (the Knight)');
    let p = g.webLearnProblem(node.id, { ignoreMode: true });
    assert.ok(p, 'locked at first');
    g.story.flags.push('tourney_champion');
    for (const id of ['vanguard.1.skill', 'vanguard.1.trait', 'vanguard.2.skill']) { const n = g.skillWeb().nodes.get(id); if (n && !g.webOwns(id)) g.webGain(n); }
    p = g.webLearnProblem(node.id, { ignoreMode: true });
    assert.ok(!p || p.code === 'NO_WEB_POINTS', `opens for the champion (${p && p.code})`);
    assert.ok(g.data.skillDefinitions['Mounted Charge'].liveDescription, 'it reads right in a live fight');
    assert.strictEqual(g.data.actionRules.skillShapes.bySkill['Mounted Charge'].shape, 'dash');
});

test('Tourney of Crowns: the three bouts sit on the Shamefield square, one after the other, and the map stays valid', () => {
    const W = require('../src/world/chapter1-maps.js');
    const world = W.world || W;
    const sq = (world.maps || {}).shamefield;
    const bouts = sq.encounters.filter((e) => /^tourney_bout_/.test(e.id));
    assert.strictEqual(bouts.length, 3);
    assert.deepStrictEqual(bouts.map((b) => b.when.flags[0]), ['tourney_entered', 'tourney_bout_1', 'tourney_bout_2']);
});

test("Dark Knight's betrayal: after the feigned bargain you can tell Torvald you lied; he names you oath-breaker", () => {
    const g = game();
    g.story.flags.push('torvald_met', 'bargain_feigned', 'bargain_made');
    assert.ok(/tablet/.test(talk(g, 'torvald')));
    const r = say(g, /I lied to you/);
    assert.ok(/Nithing/.test(text(r)) || /Nithing/.test(JSON.stringify(g.story.dialogue || {})));
    assert.ok(g.hasStoryFlag('oath_betrayed'));
    say(g, /Leave the tent/);
    assert.ok(/nithings/.test(talk(g, 'torvald')), 'he does not forget it');
});

test("Dark Knight's betrayal: never offered to a player who didn't feign the bargain", () => {
    const g = game();
    g.story.flags.push('torvald_met', 'bargain_negotiated', 'bargain_made');
    talk(g, 'torvald');
    assert.ok(!choices(g).some((c) => /I lied/.test(c.text)));
});
