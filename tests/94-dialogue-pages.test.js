// Dialogue box pages and notifications (Pixie, docs/ui/DIALOGUE_BOX.md; QA Tally). NPC words show at most
// two sentences per page; quest, objective, XP, level, item and Gold lines are tagged by the engine and go
// to notifications instead of the box. The DOM is checked in the browser; these are the rules it follows.
const { test, assert, GameEngine } = require('./helpers.js');
const DP = require('../ui/dialogue-pages.js');

test('Dialogue pages: at most two sentences and about 160 characters per page, nothing lost', () => {
    const text = 'The road is long. The crows are watching. Bring me the register, and I will pay you well. Do not dawdle!';
    const pages = DP.paginate(text);
    assert.deepStrictEqual(pages, ['The road is long. The crows are watching.', 'Bring me the register, and I will pay you well. Do not dawdle!']);
    const long = `${'word '.repeat(90)}end.`;
    const cut = DP.paginate(long);
    assert.ok(cut.length >= 3);
    for (const p of cut) assert.ok(p.length <= DP.LIMITS.maxChars + 2, `${p.length}: ${p}`);
    assert.strictEqual(cut.join(' ').replace(/…/g, '').split(/\s+/).filter(Boolean).length, 91);   // every word kept
    for (const p of DP.paginate('One. Two. Three. Four. Five.')) assert.ok(DP.splitSentences(p).length <= 2);
});

test('Dialogue pages: ellipses, abbreviations and quoted endings do not split sentences wrongly', () => {
    assert.deepStrictEqual(DP.splitSentences('You fall… and come to. Ask Dr. Hale. "Run!" He ran.'), ['You fall… and come to.', 'Ask Dr. Hale.', '"Run!"', 'He ran.']);
    assert.deepStrictEqual(DP.splitSentences(''), []);
});

test('Dialogue pages: speakers go on the nameplate, the player\'s echoed choice is skipped, system lines become notices', () => {
    const r = DP.arrange([
        { text: 'Tok: "I found your register."' },
        { text: 'Mira: "You did? Thank you. The Watch owes you. Sit, eat, rest a while."' },
        { text: 'Side quest complete: Bread and Beer (+40 XP)', notice: 'quest' },
        { text: 'Received: Bread.', notice: 'item' },
        { text: 'The fire crackles.' }
    ], { skipSpeaker: 'Tok' });
    assert.deepStrictEqual(r.pages, [
        { speaker: 'Mira', text: 'You did? Thank you.' },
        { speaker: 'Mira', text: 'The Watch owes you. Sit, eat, rest a while.' },
        { speaker: null, text: 'The fire crackles.' }
    ]);
    assert.deepStrictEqual(r.notices, [{ text: 'Side quest complete: Bread and Beer (+40 XP)', kind: 'quest' }, { text: 'Received: Bread.', kind: 'loot' }]);
});

test('Dialogue pages: the typewriter reveals over time and is instant when motion is reduced', () => {
    assert.strictEqual(DP.revealed('Hello there.', 0), 0);
    assert.strictEqual(DP.revealed('Hello there.', 100, { cps: 50 }), 5);
    assert.strictEqual(DP.revealed('Hello there.', 99999), 12);
    assert.strictEqual(DP.revealed('Hello there.', 0, { instant: true }), 12);
});

test('Engine: quest, objective, XP, level and reward lines carry a notice tag; NPC speech does not', () => {
    const g = new GameEngine({ seed: 1 });
    g.start();
    g.act({ type: 'choose_class', classId: 'warrior' });
    g.act({ type: 'enter_world' });
    g.flush();
    g.startQuest('Q01');
    g.completeQuest('Q01');
    g.addExperience(10000);
    const ev = g.flush().filter((e) => e.type === 'text');
    const tag = (re) => (ev.find((e) => re.test(e.text)) || {}).notice;
    assert.strictEqual(tag(/^Quest complete: /), 'quest');
    assert.strictEqual(tag(/^Quest started: /), 'quest');
    assert.strictEqual(tag(/^Objective: /), 'objective');
    assert.strictEqual(tag(/^You gained 10000 experience/), 'xp');
    assert.strictEqual(tag(/^Congratulations! You have reached Level/), 'level');
    // The whole stream through the box rules: nothing above lands in a page.
    const { pages, notices } = DP.arrange(ev.map((e) => ({ text: e.text, notice: e.notice })));
    assert.ok(notices.length >= 5);
    assert.ok(!pages.some((p) => /Quest (complete|started)|Objective:|experience points|reached Level/.test(p.text)));
    // Untagged events keep their old shape (the text game and the older tests are unchanged).
    g.say('A plain line.');
    assert.deepStrictEqual(g.flush(), [{ type: 'text', text: 'A plain line.', important: false, html: false }]);
});
