// Chapter Two, the end of Act I (Tokelo, 2026-11-13: "get started with the quests for act 1 if they are not done, you
// have the locations now"). C2-03's Thing sits at Hrafnholm: the Jarl's claim, the Redhand's answer, Eydis reads the
// Birkholt board wherever C2-02 left it, the guest takes one of three first positions (review doc 4.4), and the Thing
// says "not yet" and makes the guest its witness, so C2-04 always opens. Then the two side quests that live on maps
// already built: C2-S02 The Price of an Oath (Hrafnholm) and C2-S04 The Fisherman's Debt (Skeldvik and Hrafnholm).
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const CH2 = require('../src/story/chapter2.js');
const { takeExit, inspect } = require('./world-helpers.js');

/** Act I's first two quests done (the tablet decided as `tablet`), standing in Skeldvik with C2-03 just begun. */
function run(tablet = 'tablet_with_eydis', extra = []) {
    const g = new GameEngine({ seed: 102 });
    g.start(); g.act({ type: 'choose_class', classId: 'warrior' }); g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    for (const q of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'L01', 'Q06', 'B01', 'Q07', 'Q08', 'C201', 'C202']) g.story.quests[q].state = 'complete';
    g.story.flags.push('chapter_one_complete', 'aspect_nahemoth', 'anchor:homestead', 'north_gate_open', 'caravan_saved', 'ulfrun_beaten',
        'eydis_met', 'eydis_in_skeldvik', 'eydis_harbor_met', 'leif_told', 'solveig_told', 'skeldvik_memorial_seen', 'skeldvik_evidence', ...extra);
    if (tablet) g.story.flags.push(tablet, 'tablet_decided');
    if (tablet === 'tablet_kept') g.player.inventory.push('Birkholt Name Tablet');
    g.startQuest('C203', { quiet: true });
    const s = new WorldSession(ZONE1, { engine: g });
    s.place('skeldvik', 'from_hrafnholm');
    return { g, s };
}
function say(g, re) {
    const a = g.getAvailableActions(), c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(a.actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const choices = (g) => (g.getAvailableActions().actions || []).filter((x) => x.type === 'dialogue_choice').map((x) => x.text);
const text = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
function talk(s, id) { const r = inspect(s, id); assert.strictEqual(r.type, 'talk', `${id}: ${JSON.stringify(r).slice(0, 200)}`); return r; }

/** Up to Hrafnholm, the Jarl in her hall, Torvald in the yard: C2-03 waits at the law rock. */
function arrive(g, s) {
    takeExit(s, 'skeldvik_west_road');
    takeExit(s, 'hrafnholm_hall_entry');
    talk(s, 'hall_ragnhild'); say(g, /Goodbye/);
    takeExit(s, 'hall_of_winter_out');
    talk(s, 'hrafnholm_torvald'); say(g, /Goodbye/);
    assert.strictEqual(g.currentObjective('C203').id, 'thing');
}
/** The Thing from the horn to the board reading; returns everything said, standing in the ring. */
function sit(g, s) {
    let all = text(talk(s, 'hrafnholm_arnkel'));
    for (const re of [/Blow the horn/, /Listen/, /Listen/, /Go on/, /Step into the ring/]) all += '\n' + text(say(g, re));
    return all;
}
const POS = [[/Stand with the Jarl/, 'thing_backed_ragnhild'], [/Stand with Torvald/, 'thing_backed_torvald'], [/hold the verdict/, 'thing_asked_inquiry']];

for (const [choice, flag] of POS) {
    test(`The Thing: the claims, the board, the guest's position (${flag}), "not yet", and Act II opens`, () => {
        const { g, s } = run();
        arrive(g, s);
        // Eydis has gone up the road ahead of you, and waits by the law rock.
        assert.ok(s.visibleObjects('hrafnholm').some((o) => o.id === 'hrafnholm_eydis'));
        assert.ok(/when Arnkel blows the horn/i.test(text(talk(s, 'hrafnholm_eydis')))); say(g, /Goodbye/);
        const xp = g.player.xp + g.player.level * 1e6, gold = g.player.gold;
        const heard = sit(g, s);
        assert.ok(/declare the six hundred dead/.test(heard) && /isn't dead/.test(heard), 'the Jarl claims and the Redhand answers');
        assert.ok(/Birkholt's board/.test(heard) && /Ketil/.test(heard), 'Eydis reads the board she was given');
        assert.ok(/Hear them/.test(heard), 'Sigrun has the guest heard');
        assert.strictEqual(g.currentObjective('C203').id, 'position');
        let r = say(g, choice);
        assert.ok(g.hasStoryFlag(flag));
        r = say(g, /Wait for the Lawspeaker/);
        assert.ok(/not yet/.test(text(r)) && /Járnmyr/.test(text(r)));
        say(g, /Leave the ring/);
        // Act I is over, paid once, and Act II waits for Járnmyr's picture (no position closes the main road).
        assert.strictEqual(g.questState('C203'), 'complete');
        assert.ok(g.hasStoryFlag('thing_heard'));
        assert.ok(g.player.xp + g.player.level * 1e6 > xp && g.player.gold === gold + 30);
        assert.strictEqual(g.questState('C204'), 'active');
        assert.ok(CH2.quests.C204.teaser && /next part/.test(g.currentObjective('C204').text));
        // Exactly one position, and the town remembers it.
        assert.deepStrictEqual(POS.map(([, f]) => g.hasStoryFlag(f)), POS.map(([, f]) => f === flag));
        const lines = [text(talk(s, 'hrafnholm_torvald')), (say(g, /Goodbye/), text(talk(s, 'hrafnholm_ulfrun'))), (say(g, /Goodbye/), text(talk(s, 'hrafnholm_eydis')))];
        say(g, /Goodbye/);
        const want = { thing_backed_ragnhild: [/her spade/, /bury him/, /kind/], thing_backed_torvald: [/know your face/, /my shield/, /misses them/], thing_asked_inquiry: [/go and look/, /tell me first/, /copying/] }[flag];
        want.forEach((re, i) => assert.ok(re.test(lines[i]), `${re} in: ${lines[i]}`));
        takeExit(s, 'hrafnholm_hall_entry');
        assert.ok(/bench for you|Redhand's side|given the job/.test(text(talk(s, 'hall_ragnhild')))); say(g, /Goodbye/);
    });
}

test('The Thing: the board is read wherever C2-02 left it, and a save that never decided still hears the Roll', () => {
    for (const [tablet, re] of [['tablet_with_reeve', /locked chest/], ['tablet_kept', /You hold up the board/], [null, /from her book/]]) {
        const { g, s } = run(tablet);
        arrive(g, s);
        assert.ok(re.test(sit(g, s)), `${tablet}: ${re}`);
        say(g, /hold the verdict/); say(g, /Wait/); say(g, /Leave the ring/);
        assert.strictEqual(g.questState('C203'), 'complete');
        assert.strictEqual(g.player.inventory.includes('Birkholt Name Tablet'), tablet === 'tablet_kept', 'the kept board is still a choice for later');
    }
});

test("The Thing: what Skeldvik told you can be said in the ring, once each, and never decides anything", () => {
    const plain = run();
    arrive(plain.g, plain.s); sit(plain.g, plain.s);
    assert.ok(!choices(plain.g).some((c) => /silver|Arni/.test(c)), 'nothing to raise without having heard it');
    const { g, s } = run('tablet_with_eydis', ['southern_friends_heard', 'wolfbanner_heard']);
    arrive(g, s); sit(g, s);
    assert.ok(/old Crown's plate/.test(text(say(g, /where his silver comes from/))));
    say(g, /Go on/);
    assert.ok(/fourteen/.test(text(say(g, /how old Arni was/))));
    say(g, /Go on/);
    assert.ok(!choices(g).some((c) => /silver|Arni/.test(c)), 'asked once each');
    assert.strictEqual(g.currentObjective('C203').id, 'position');
    say(g, /Stand with Torvald/); say(g, /Wait/); say(g, /Leave the ring/);
    assert.strictEqual(g.questState('C203'), 'complete');
});

test('The Thing: a save made mid-assembly comes back to the ring, and can never take a second position', () => {
    const { g, s } = run();
    arrive(g, s); sit(g, s);
    const save = JSON.parse(JSON.stringify(g.serialize()));
    const again = GameEngine.fromSave(save);
    const s2 = new WorldSession(ZONE1, { engine: again });
    s2.place('hrafnholm', 'from_hall');
    again.story.dialogue = null;                                 // the window was closed mid-assembly
    assert.ok(/still sitting/.test(text(talk(s2, 'hrafnholm_arnkel'))));
    say(again, /Step into the ring/); say(again, /Stand with the Jarl/);
    again.story.dialogue = null;                                 // closed before the verdict
    talk(s2, 'hrafnholm_arnkel');
    assert.ok(choices(again).includes('Hear the verdict.') && !choices(again).some((c) => /Step into the ring/.test(c)));
    say(again, /Hear the verdict/); say(again, /Leave the ring/);
    assert.strictEqual(again.questState('C203'), 'complete');
    assert.deepStrictEqual(POS.map(([, f]) => again.hasStoryFlag(f)), [true, false, false]);
});

test('The Thing: a save from before it was built, waiting on the old "wait for the Thing" step, walks straight on', () => {
    const { g, s } = run();
    arrive(g, s);
    const save = JSON.parse(JSON.stringify(g.serialize()));
    save.game.revision = 7;                                      // James the bard, the release before the Thing
    const again = GameEngine.fromSave(save);
    assert.strictEqual(again.currentObjective('C203').id, 'thing', 'the step and its id are unchanged');
    const s2 = new WorldSession(ZONE1, { engine: again });
    s2.place('hrafnholm', 'from_hall');
    sit(again, s2); say(again, /hold the verdict/); say(again, /Wait/); say(again, /Leave the ring/);
    assert.strictEqual(again.questState('C203'), 'complete');
    assert.strictEqual(again.questState('C204'), 'active');
});

/** The Thing done, with the inquiry asked for: standing in Hrafnholm. */
function afterThing(gold = 0) {
    const r = run();
    arrive(r.g, r.s); sit(r.g, r.s); say(r.g, /hold the verdict/); say(r.g, /Wait/); say(r.g, /Leave the ring/);
    r.g.player.gold = gold;
    return r;
}

for (const [choice, flag, line] of [[/Hild holds it, as Orm swore/, 'oath_for_hild', /Hild holds the Green Pine land/],
    [/Kolgrim keeps it/, 'oath_for_kolgrim', /Kolgrim holds the Green Pine land/], [/upper field/, 'oath_shared', /upper field/]]) {
    test(`C2-S02 The Price of an Oath: Hild, Kolgrim, the stick, and the case at the law rock (${flag})`, () => {
        const plain = run();
        takeExit(plain.s, 'skeldvik_west_road');
        assert.ok(/After the Thing/.test(text(talk(plain.s, 'hrafnholm_hild'))), 'the case waits for the Thing');
        const { g, s } = afterThing();
        talk(s, 'hrafnholm_hild'); say(g, /hear you both/); say(g, /Goodbye/);
        assert.strictEqual(g.questState('C2-S02'), 'active');
        assert.ok(s.visibleObjects('hall_of_winter').some((o) => o.id === 'hall_orm_stick'), 'the stick is on the table while the case is open');
        talk(s, 'hrafnholm_kolgrim'); say(g, /Goodbye/);
        assert.strictEqual(g.currentObjective('C2-S02').id, 'stick');
        takeExit(s, 'hrafnholm_hall_entry');
        assert.ok(/Orm of the Green Pine/.test(text(talk(s, 'hall_orm_stick')))); say(g, /Take it/);
        takeExit(s, 'hall_of_winter_out');
        talk(s, 'hrafnholm_arnkel'); say(g, /oath-stick/); say(g, choice);
        const r = say(g, /Goodbye/);
        assert.strictEqual(g.questState('C2-S02'), 'complete');
        assert.ok(g.hasStoryFlag(flag) && line.test(text(r)));
        assert.strictEqual(g.player.gold, 20);
        assert.ok(!s.visibleObjects('hall_of_winter').some((o) => o.id === 'hall_orm_stick'), 'the stick goes back in its bundle');
    });
}

test("C2-S04 The Fisherman's Debt: pay Osric from your own purse, and Bersi gives you his deck and some cargo", () => {
    const { g, s } = afterThing(10);
    takeExit(s, 'hrafnholm_south_road');
    talk(s, 'skeldvik_bersi'); say(g, /Why not/); say(g, /talk to him/); say(g, /Goodbye/);
    assert.strictEqual(g.questState('C2-S04'), 'active');
    takeExit(s, 'skeldvik_west_road');
    talk(s, 'hrafnholm_osric'); say(g, /Bersi Grimsson's debt/);
    assert.ok(!choices(g).some((c) => /Pay the thirty/.test(c)), 'not offered with 10 Gold in the purse');
    say(g, /think about it/);
    g.player.gold = 45;
    talk(s, 'hrafnholm_osric'); say(g, /Bersi Grimsson's debt/); say(g, /Pay the thirty/); say(g, /Goodbye/);
    assert.strictEqual(g.player.gold, 15);
    assert.ok(g.hasStoryFlag('debt_paid') && !g.hasStoryFlag('osric_wary'));
    takeExit(s, 'hrafnholm_south_road');
    talk(s, 'skeldvik_bersi'); say(g, /I paid him/); say(g, /Goodbye/);
    assert.strictEqual(g.questState('C2-S04'), 'complete');
    assert.ok(g.hasStoryFlag('bersi_passage') && g.player.inventory.includes('Mead') && g.player.inventory.includes('Gravlax'));
});

test("C2-S04 The Fisherman's Debt: or say 'the old Crown's plate' to Osric, and he decides he is a patient man", () => {
    const { g, s } = afterThing(0);
    takeExit(s, 'hrafnholm_south_road');
    talk(s, 'skeldvik_bersi'); say(g, /Why not/); say(g, /talk to him/); say(g, /Goodbye/);
    takeExit(s, 'skeldvik_west_road');
    talk(s, 'hrafnholm_osric'); say(g, /Bersi Grimsson's debt/);
    assert.ok(/patient man/.test(text(say(g, /old Crown's plate/)))); say(g, /Goodbye/);
    assert.ok(g.hasStoryFlag('debt_leaned') && g.hasStoryFlag('osric_wary'));
    talk(s, 'hrafnholm_osric');
    assert.ok(!choices(g).some((c) => /Bersi/.test(c)), 'settled once');
    say(g, /Goodbye/);
    takeExit(s, 'hrafnholm_south_road');
    talk(s, 'skeldvik_bersi'); say(g, /spring fair/); say(g, /Goodbye/);
    assert.strictEqual(g.questState('C2-S04'), 'complete');
    assert.strictEqual(g.player.gold, 0);
    assert.ok(g.hasStoryFlag('bersi_passage') && !g.player.inventory.includes('Mead'));
});

test('The story pays out of the purse only through `pay`, gated by `gold`, and never below zero', () => {
    const { g } = run();
    g.player.gold = 5;
    assert.ok(!g.storyAllows({ gold: 30 }) && g.storyAllows({ gold: 5 }));
    g.applyStoryEffects([{ pay: 30 }]);
    assert.strictEqual(g.player.gold, 5, 'a short purse pays nothing');
    g.applyStoryEffects([{ pay: 5 }]);
    assert.strictEqual(g.player.gold, 0);
});
