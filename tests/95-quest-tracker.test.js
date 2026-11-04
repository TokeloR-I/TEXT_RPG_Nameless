// Quest tracker (Tokelo's playtest, 2026-11-04): up to 4 active quests on screen at once, and the player
// chooses in the journal which ones show. Engine: src/engine/story.js (track_quest); HUD: ui/action-hud.js.
const { test, assert, GameEngine } = require('./helpers.js');
const HUD = require('../ui/action-hud.js');

const side = (id) => ({ title: `Side ${id}`, kind: 'side', xp: 1, objectives: [{ id: 'x', text: `Do ${id}`, on: { type: 'inspect', id: `thing_${id}` } }], onComplete: [] });
const FIX = {
    id: 'fx', title: 'Fixture Chapter', defaultName: 'The Wanderer',
    appearances: [{ id: 'a', label: 'A' }],
    start: { effects: [{ start: 'M' }] },
    quests: {
        M: { title: 'Main', kind: 'main', xp: 1, objectives: [{ id: 'go', text: 'Walk on', on: { type: 'enter', id: 'far' }, marker: { map: 'here', x: 1, y: 2 } }], onComplete: [] },
        S1: side('S1'), S2: side('S2'), S3: side('S3'), S4: side('S4'), S5: side('S5')
    },
    npcs: {},
    triggers: ['S1', 'S2', 'S3', 'S4', 'S5'].map((id) => ({ id: `t_${id}`, on: { type: 'inspect', id: `board_${id}` }, effects: [{ start: id }] }))
};
function story() {
    const g = new GameEngine({ seed: 3, storyData: FIX });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    return g;
}
const startSide = (g, id) => g.storyEvent({ type: 'inspect', id: `board_${id}` });
const ids = (g) => g.trackedObjectives().map((o) => o.questId);
const toggles = (g) => g.getAvailableActions().actions.filter((a) => a.type === 'track_quest');

test('Tracker: a new side quest shows beside the main quest, up to 4; the fifth waits in the journal', () => {
    const g = story();
    assert.deepStrictEqual(ids(g), ['M']);
    startSide(g, 'S1');
    assert.deepStrictEqual(ids(g), ['M', 'S1'], 'the playtest bug: a started side quest is on screen too');
    startSide(g, 'S2'); startSide(g, 'S3'); startSide(g, 'S4');
    assert.deepStrictEqual(ids(g), ['M', 'S1', 'S2', 'S3'], 'four at most');
    assert.strictEqual(g.getJournal().quests.find((q) => q.id === 'S4').tracked, false);
    assert.deepStrictEqual(g.trackedObjective().questId, 'M', 'the marker still follows the main quest');
    assert.strictEqual(g.getState().story.tracked.length, 4);
});

test('Tracker: the journal hides and shows quests; a fifth is refused with the same reason availability gives', () => {
    const g = story();
    for (const id of ['S1', 'S2', 'S3', 'S4']) startSide(g, id);
    const s4 = toggles(g).find((a) => a.questId === 'S4');
    assert.deepStrictEqual([s4.tracked, s4.track, s4.enabled, s4.reason.code], [false, true, false, 'TRACK_FULL']);
    const r = g.act({ type: 'track_quest', questId: 'S4', track: true });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.error.code, 'TRACK_FULL');
    assert.strictEqual(r.error.message, s4.reason.message, 'same message');

    assert.ok(g.act({ type: 'track_quest', questId: 'M', track: false }).ok, 'even the main quest can be hidden');
    assert.deepStrictEqual(ids(g), ['S1', 'S2', 'S3']);
    assert.ok(toggles(g).find((a) => a.questId === 'S4').enabled, 'room again');
    assert.ok(g.act({ type: 'track_quest', questId: 'S4' }).ok, 'no `track` toggles');
    assert.deepStrictEqual(ids(g), ['S1', 'S2', 'S3', 'S4']);
    assert.ok(g.act({ type: 'track_quest', questId: 'S4' }).ok);
    assert.deepStrictEqual(ids(g), ['S1', 'S2', 'S3']);
});

test('Tracker: finished quests leave it and free their row; unknown or unstarted quests are refused', () => {
    const g = story();
    for (const id of ['S1', 'S2', 'S3', 'S4']) startSide(g, id);
    g.storyEvent({ type: 'inspect', id: 'thing_S2' });
    assert.strictEqual(g.questState('S2'), 'complete');
    assert.deepStrictEqual(ids(g), ['M', 'S1', 'S3']);
    startSide(g, 'S5');
    assert.deepStrictEqual(ids(g), ['M', 'S1', 'S3', 'S5'], 'a new quest takes the free row');
    assert.strictEqual(g.act({ type: 'track_quest', questId: 'S2' }).error.code, 'QUEST_NOT_ACTIVE');
    assert.strictEqual(g.act({ type: 'track_quest', questId: 'nope' }).error.code, 'UNKNOWN_QUEST');
    assert.ok(!toggles(g).some((a) => a.questId === 'S2'), 'only active quests get a toggle');
});

test('Tracker: the choice is saved; an older save without a list tracks the first 4 active quests', () => {
    const g = story();
    for (const id of ['S1', 'S2']) startSide(g, id);
    g.act({ type: 'track_quest', questId: 'S1', track: false });
    const back = GameEngine.fromSave(g.serialize(), { storyData: FIX });
    assert.deepStrictEqual(ids(back), ['M', 'S2']);

    const old = story();
    for (const id of ['S1', 'S2', 'S3', 'S4']) startSide(old, id);
    delete old.story.tracked;
    assert.deepStrictEqual(ids(old), ['M', 'S1', 'S2', 'S3']);
    assert.ok(old.act({ type: 'track_quest', questId: 'S1', track: false }).ok);
    assert.deepStrictEqual(old.story.tracked, ['M', 'S2', 'S3']);
});

test('Tracker HUD: every tracked quest gets a row (4 max), with where it is; one quest still works', () => {
    const g = story();
    for (const id of ['S1', 'S2', 'S3', 'S4']) startSide(g, id);
    const fake = { story: {}, trackedObjectives: () => g.trackedObjectives(), getState: () => g.getState(), getRealtimeState: () => null, getSkillBar: () => [], getAvailableActions: () => ({ actions: [] }) };
    const m = HUD.viewModel(fake, {}, 0);
    assert.deepStrictEqual(m.quests.map((q) => q.title), ['Main', 'Side S1', 'Side S2', 'Side S3']);
    assert.strictEqual(m.quest.title, 'Main');
    const where = HUD.viewModel(fake, { quests: [{ title: 'Main', text: 'Walk on', kind: 'main', where: 'Far Field' }, ...Array(6).fill({ title: 'x', text: 'y', kind: 'side' })] }, 0);
    assert.strictEqual(where.quests.length, 4);
    assert.strictEqual(where.quests[0].where, 'Far Field');
});
