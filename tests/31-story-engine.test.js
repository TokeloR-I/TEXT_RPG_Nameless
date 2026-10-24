// CH1-01 story engine (src/engine/story.js): quests, flags, once-only rewards, dialogue waiting state,
// conditions, identity, journal, transactions. Uses a small fixture so the rules are tested apart from content.
const { test, assert, GameEngine } = require('./helpers.js');

const FIX = {
    id: 'fx', title: 'Fixture Chapter', defaultName: 'The Wanderer',
    appearances: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    start: { effects: [{ start: 'A' }] },
    quests: {
        A: { title: 'First', kind: 'main', xp: 15, objectives: [
            { id: 'look', text: 'Look at the stone', on: { type: 'inspect', id: 'stone' } },
            { id: 'go', text: 'Go outside', on: { type: 'enter', id: 'outside' }, effects: [{ flag: 'went_out' }] }
        ], onComplete: [{ start: 'B' }] },
        B: { title: 'Second', kind: 'main', xp: 100, objectives: [
            { id: 'talk', text: 'Talk to Sam', on: { type: 'talk', id: 'sam' } },
            { id: 'ok', text: 'Agree', on: { type: 'story', id: 'agreed' } }
        ], onComplete: [{ flag: 'b_done' }] },
        C: { title: 'Side', kind: 'side', xp: 5, objectives: [{ id: 'kill', text: 'Beat the rats', on: { type: 'defeat', id: 'rats' } }], onComplete: [] }
    },
    npcs: {
        sam: { name: 'Sam', farewell: 'Suffer!', talk: [{ if: { flags: ['b_done'] }, node: 'after' }, { node: 'hi' }], nodes: {
            hi: { lines: [['npc', 'Hello.'], [null, 'Sam waves.']], choices: [
                { text: 'Agree.', effects: [{ event: { type: 'story', id: 'agreed' } }], to: 'thanks' },
                { text: 'Shop?', stay: true, effects: [{ shop: 'sam' }] },
                { text: 'Secret', if: { flags: ['nope'] }, end: true },
                { text: 'Fight me.', end: 'interrupt' }
            ] },
            thanks: { lines: [['npc', 'Thanks.']], effects: [{ item: 'Token', key: 'item:token' }], choices: [] },
            after: { lines: [['npc', 'Again?']], choices: [{ text: 'Thank me again.', to: 'thanks' }, { text: 'Bye.', end: true }] }
        } },
        ghost: { name: 'Ghost', when: { flags: ['never'] }, talk: [{ node: 'x' }], nodes: { x: { lines: ['Boo'], choices: [] } } }
    },
    triggers: [{ id: 't1', on: { type: 'inspect', id: 'board' }, effects: [{ start: 'C' }, { say: 'Jobs!' }] }]
};

function story(seed = 1, storyData = FIX) {
    const g = new GameEngine({ seed, storyData });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    return g;
}
const text = (r) => r.events.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const ev = (g, type, id) => g.storyEvent({ type, id });
const choose = (g, re) => {
    const a = g.getAvailableActions();
    const c = a.actions.find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re} in ${a.actions.map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
};

test('Story: the chapter starts with enter_world (never in the text game); the first quest is active and journaled', () => {
    const t = new GameEngine({ seed: 1 }); t.start(); t.input('warrior');
    assert.strictEqual(t.story, null, 'text game: no story state');
    assert.strictEqual(t.getState().story, undefined, 'so its state hashes are unchanged');
    const g = story();
    assert.deepStrictEqual([g.questState('A'), g.questState('B')], ['active', 'unseen']);
    const j = g.getJournal();
    assert.deepStrictEqual(j.quests.map((q) => [q.id, q.state, q.objective.text]), [['A', 'active', 'Look at the stone']]);
    assert.deepStrictEqual(g.getState().story.objective, { questId: 'A', title: 'First', kind: 'main', text: 'Look at the stone', marker: null });
});

test('Story: objectives advance on their events, pay XP once, and start the next quest', () => {
    const g = story();
    const xp0 = g.player.xp;
    ev(g, 'enter', 'outside');                 // out of order: remembered
    assert.strictEqual(g.questState('A'), 'active');
    ev(g, 'inspect', 'stone');                 // completes 'look', then catches up 'go' at once
    assert.strictEqual(g.questState('A'), 'complete');
    assert.ok(g.hasStoryFlag('went_out'), 'objective effects ran');
    assert.strictEqual(g.player.xp, xp0 + 15);
    assert.strictEqual(g.questState('B'), 'active');
    // replays never pay again
    ev(g, 'inspect', 'stone'); ev(g, 'enter', 'outside');
    g.completeQuest('A');
    assert.strictEqual(g.player.xp, xp0 + 15, 'quest XP is claimed once');
    assert.ok(g.story.claimed.includes('quest:A'));
});

test('Story: talking opens a dialogue waiting state; only dialogue actions work; goodbye plays the farewell, an interruption does not', () => {
    const g = story();
    ev(g, 'inspect', 'stone'); ev(g, 'enter', 'outside');
    const r = g.act({ type: 'talk', npcId: 'sam' });
    assert.ok(r.ok);
    assert.match(text(r), /Sam: "Hello\."\nSam waves\./);
    const a = g.getAvailableActions();
    assert.strictEqual(a.awaiting, 'dialogue');
    assert.deepStrictEqual(a.dialogue.lines, [{ speaker: 'Sam', text: 'Hello.' }, { speaker: null, text: 'Sam waves.' }]);
    assert.deepStrictEqual(a.actions.map((x) => x.text || x.type), ['Agree.', 'Shop?', 'Fight me.', 'dialogue_leave'], 'conditional choices hidden');
    assert.strictEqual(a.actions.find((x) => x.type === 'dialogue_leave').farewell, 'Suffer!');
    for (const x of [{ type: 'move', direction: 'north' }, { type: 'world_pickup', pickupId: 'p', item: 'Bandages' }, { type: 'talk', npcId: 'sam' }]) {
        assert.strictEqual(g.act(x).error.code, 'WRONG_MODE', JSON.stringify(x));
    }
    assert.strictEqual(g.act({ type: 'dialogue_choice', choiceId: 'zzz' }).error.code, 'INVALID_CHOICE');
    const shopped = choose(g, /Shop/);
    assert.match(text(shopped), /Nothing is for sale here yet/);
    assert.strictEqual(g.getAvailableActions().awaiting, 'dialogue', 'a stay choice keeps the conversation');
    const agreed = choose(g, /Agree/);
    assert.match(text(agreed), /Quest complete: Second \(\+100 XP\)/);
    assert.match(text(agreed), /Received: Token/);
    assert.strictEqual(g.mode, 'explore', 'no branch prompt mid-conversation');
    const bye = g.act({ type: 'dialogue_leave' });
    assert.match(text(bye), /Sam: "Suffer!"/);
    g.act({ type: 'talk', npcId: 'sam' });
    const twice = choose(g, /Thank me again/);
    assert.doesNotMatch(text(twice), /Received/, 'a story item is given once, however often its node is visited');
    assert.strictEqual(g.player.inventory.filter((i) => i === 'Token').length, 1);
    g.act({ type: 'dialogue_leave' });
    assert.strictEqual(g.getAvailableActions().awaiting, 'action');
    // the second time Sam has another node; an interruption has no farewell
    const h = story();
    h.act({ type: 'talk', npcId: 'sam' });
    const fight = choose(h, /Fight me/);
    assert.doesNotMatch(text(fight), /Suffer/);
    assert.strictEqual(h.story.dialogue, null);
});

test('Story: a level-up from quest XP prompts the branch only after the conversation ends', () => {
    const g = story();
    g.player.xp = 0; g.player.level = 2; g.player.xpToNext = 110;
    ev(g, 'inspect', 'stone'); ev(g, 'enter', 'outside');         // +15
    g.act({ type: 'talk', npcId: 'sam' });
    choose(g, /Agree/);                                             // +100 -> level 3
    assert.strictEqual(g.player.level, 3);
    assert.strictEqual(g.mode, 'explore', 'still talking');
    g.act({ type: 'dialogue_leave' });
    assert.strictEqual(g.mode, 'branch_select', 'evolution prompt at the next safe moment');
});

test('Story: npc presence, unknown npcs and triggers that fire once', () => {
    const g = story();
    assert.strictEqual(g.act({ type: 'talk', npcId: 'ghost' }).error.code, 'NOT_HERE');
    assert.strictEqual(g.act({ type: 'talk', npcId: 'nobody' }).error.code, 'UNKNOWN_NPC');
    const r = g.act({ type: 'world_inspect', objectId: 'board' });
    assert.match(text(r), /Side quest started: Side[\s\S]*Jobs!/);
    const again = g.act({ type: 'world_inspect', objectId: 'board' });
    assert.doesNotMatch(text(again), /Jobs!/, 'a trigger fires once');
    const xp = g.player.xp;
    ev(g, 'defeat', 'rats');
    assert.strictEqual(g.player.xp, xp + 5);
    assert.ok(g.storyAllows({ quests: { C: 'complete', A: 'active+' } }));
    assert.ok(!g.storyAllows({ quests: { B: 'active+' } }));
    assert.ok(g.storyAllows({ any: [{ flags: ['nope'] }, { quests: { C: 'complete' } }] }));
});

test('Story: identity: name rules (blank -> default, 24 characters, international), cosmetic appearance only', () => {
    const g = story();
    const before = JSON.stringify([g.player.strength, g.player.def, g.player.maxHp, g.player.spd]);
    assert.ok(g.act({ type: 'set_identity', name: '  Zoë   Ō\u0007kami ', appearance: 1 }).ok);
    assert.strictEqual(g.player.name, 'Zoë Ōkami');
    assert.strictEqual(g.getState().player.appearance, 1);
    assert.strictEqual(JSON.stringify([g.player.strength, g.player.def, g.player.maxHp, g.player.spd]), before, 'no stat effect');
    assert.strictEqual(g.act({ type: 'set_identity', name: 'x'.repeat(25) }).error.code, 'INVALID_NAME');
    assert.strictEqual(g.act({ type: 'set_identity', appearance: 7 }).error.code, 'INVALID_APPEARANCE');
    assert.ok(g.act({ type: 'set_identity', name: '   ' }).ok);
    assert.strictEqual(g.player.name, 'The Wanderer', 'blank: the lore-neutral default');
    assert.ok(g.act({ type: 'set_identity', name: '日本語の名前' }).ok);
    // the text game can name its hero too, and fights use the name
    const t = new GameEngine({ seed: 3 }); t.start(); t.input('rogue'); t.input('name Sable Quill');
    assert.strictEqual(t.player.name, 'Sable Quill');
    assert.strictEqual(t.getState().player.appearance, undefined, 'no appearance in the text game unless chosen');
});

test('Story: CLI parity: numbers pick choices, "bye" is a normal goodbye, "journal" lists quests', () => {
    const a = story(5), b = story(5);
    for (const g of [a, b]) { ev(g, 'inspect', 'stone'); ev(g, 'enter', 'outside'); }
    a.input('talk sam'); a.input('1'); a.input('bye');
    b.act({ type: 'talk', npcId: 'sam' }); choose(b, /Agree/); b.act({ type: 'dialogue_leave' });
    assert.strictEqual(a.snapshot().json, b.snapshot().json);
    const c = story();
    c.input('talk sam');
    const bad = c.input('9');
    assert.match(bad.map((e) => e.text).join('\n'), /Type a number from 1 to 3, or 'bye'/);
    const j = c.input('journal');
    assert.match(j.map((e) => e.text).join('\n'), /--- Journal: Fixture Chapter ---\n› First: Look at the stone/);
});

test('Story: state is plain JSON: it survives snapshot/restore and rolls back with a failed action', () => {
    const g = story();
    ev(g, 'inspect', 'stone');
    g.act({ type: 'world_enter', mapId: 'outside' });
    g.act({ type: 'talk', npcId: 'sam' });
    const copy = new GameEngine({ seed: 1, storyData: FIX });
    copy.restore(g.snapshot());
    assert.strictEqual(copy.getAvailableActions().awaiting, 'dialogue');
    for (const x of [g, copy]) { choose(x, /Agree/); x.act({ type: 'dialogue_leave' }); }
    assert.strictEqual(copy.snapshot().json, g.snapshot().json);
    const h = story();
    const before = h.snapshot().json;
    const orig = h.addExperience;
    h.addExperience = () => { throw new Error('boom'); };
    ev(h, 'enter', 'outside');
    const r = h.act({ type: 'world_inspect', objectId: 'stone' });
    h.addExperience = orig;
    assert.strictEqual(r.error.code, 'INTERNAL_ERROR');
    assert.strictEqual(JSON.parse(h.snapshot().json).story.quests.A.state, 'active', 'rolled back');
    assert.notStrictEqual(h.snapshot().json, before, '(the earlier enter event stays: it was its own action)');
});
