// Shane's "A Cramping Experience" (S02) and his shout LEG CRAMP! (docs/design/SHANE_LEG_CRAMP_SIDE_QUEST_DESIGN.md,
// Tokelo 2026-11-17, PR #281; Gauge/Thorne numbers in the same doc): three ingredients, an ordinary confirmation, the
// training cramp on you for exactly 20 s, the approved line "HA! IT WORKS! SUFFER!", and the shout in every class web.
const { test, assert, GameEngine } = require('./helpers.js');
const { validateSkillWeb } = require('../src/engine/skill-web.js');

const INGREDIENTS = ['Wild Herbs', 'Chanterelles', 'Potato'];

function home(cls = 'rogue', opts = {}) {
    const g = new GameEngine({ seed: 109, ...opts });
    g.start(); g.act({ type: 'choose_class', classId: cls }); g.act({ type: 'enter_world' });
    g.story.quests.S01.state = 'complete';
    g.story.flags.push('shane_recruited', 'shane_stall_unlocked');
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
const cramp = (g) => g.player.statusEffects.find((s) => s.name === 'Leg Cramp') || null;
/** Start the quest, hand in the ingredients and take the demonstration. Returns the demonstration's text. */
function wholeQuest(g) {
    g.act({ type: 'talk', npcId: 'shane' });
    say(g, /pleased with yourself/);
    say(g, /find them/);
    g.player.inventory.push(...INGREDIENTS);
    g.act({ type: 'talk', npcId: 'shane' });
    say(g, /brought your herbs/);
    return text(say(g, /^What does it do\?$/));
}

test('Leg Cramp: Shane offers it only once he has his stall, and it is optional', () => {
    const g = home();
    g.story.flags = g.story.flags.filter((f) => f !== 'shane_recruited');
    g.act({ type: 'talk', npcId: 'shane' });
    assert.ok(!choices(g).some((c) => /pleased with yourself/.test(c.text)), 'not before he is recruited');
    const data = g.storyContent();
    assert.strictEqual(data.quests.S02.kind, 'side');
    for (const [id, q] of Object.entries(data.quests)) {
        for (const o of q.objectives) assert.ok(!(o.on && o.on.type === 'quests' && (o.on.ids || []).includes('S02')), `${id} must not wait on S02`);
    }
    const g2 = home();
    g2.act({ type: 'talk', npcId: 'shane' });
    say(g2, /pleased with yourself/);
    say(g2, /Not right now/);
    assert.strictEqual(g2.questState('S02'), 'available', 'saying no leaves it on offer');
});

test('Leg Cramp: the tracker names each ingredient and where it comes from, and every one can be had in Chapter One', () => {
    const g = home();
    const o = g.storyContent().quests.S02.objectives[0].text;
    for (const word of ['Wild Herbs', 'Chanterelles', 'Potato', 'Seed Potato', 'field', 'road']) assert.ok(o.includes(word), `objective names ${word}`);
    const forage = g.data.forageDefinitions || {};
    const forageItems = Object.values(forage).map((f) => f.item);
    assert.ok(forageItems.includes('Wild Herbs') && forageItems.includes('Chanterelles'), 'both can be foraged');
    assert.ok(g.data.shopDefinitions.shane.stock['Wild Herbs'] && g.data.shopDefinitions.shane.stock['Seed Potato'], 'Shane sells herbs and seed potatoes');
    assert.strictEqual(g.data.cropDefinitions['Seed Potato'].produces, 'Potato', 'a Seed Potato grows Potatoes');
});

test('Leg Cramp: the ingredients go in, the confirmation comes before the surprise, and the line is exact', () => {
    const g = home();
    g.act({ type: 'talk', npcId: 'shane' });
    say(g, /pleased with yourself/);
    say(g, /find them/);
    assert.strictEqual(g.questState('S02'), 'active');
    g.act({ type: 'talk', npcId: 'shane' });
    assert.ok(!choices(g).some((c) => /brought your herbs/.test(c.text)), 'no hand-in without all three');
    assert.ok(choices(g).some((c) => /What did you need/.test(c.text)), 'he says again what he needs');
    say(g, /Goodbye/);
    g.player.inventory.push(...INGREDIENTS, 'Wild Herbs');
    g.act({ type: 'talk', npcId: 'shane' });
    say(g, /brought your herbs/);
    assert.deepStrictEqual(g.player.inventory.filter((i) => INGREDIENTS.includes(i)), ['Wild Herbs'], 'one of each is used, the spare herb stays');
    assert.ok(!cramp(g), 'no cramp before you ask');
    assert.deepStrictEqual(choices(g).map((c) => c.text), ['What does it do?', 'Maybe later.']);
    say(g, /Maybe later/);
    assert.ok(!cramp(g) && g.questState('S02') === 'active', 'walking away is fine');
    g.act({ type: 'talk', npcId: 'shane' });
    const demo = text(say(g, /What does it do/));
    assert.ok(demo.includes('Shane: "LEG CRAMP!"'));
    assert.ok(demo.includes('Shane: "HA! IT WORKS! SUFFER!"'), 'the approved line, whole and unchanged');
    assert.ok(demo.indexOf('LEG CRAMP!"') < demo.indexOf('HA! IT WORKS! SUFFER!'));
    for (const l of ['AAAAARGH! MY LEG!', 'YOU BASTARD!', "Congratulations! You've learned Leg Cramp!", 'YOU COULD HAVE WARNED ME!', "Would've ruined the surprise."])
        assert.ok(demo.includes(l), l);
    assert.strictEqual(g.questState('S02'), 'complete');
    assert.ok(text(say(g, /Goodbye/)).includes('Shane: "Suffer!"'), 'his normal goodbye still ends in Suffer!');
    assert.ok(!g.story.dialogue);
});

test('Leg Cramp: the training cramp lasts exactly 20 s on the calm clock, slows you, and then really ends', () => {
    const g = home();
    wholeQuest(g);
    const c = cramp(g);
    assert.ok(c, 'you have the cramp');
    assert.strictEqual(c.type, 'slow');
    assert.strictEqual(c.rtTotalMs, 20000, 'exactly 20 seconds');
    assert.ok(Math.abs(g.playerMoveMult() - 0.65) < 1e-9, 'you walk 35% slower');
    g.actionCalmTick(19999);
    assert.ok(cramp(g), 'still there at 19.999 s');
    g.actionCalmTick(1);
    assert.ok(!cramp(g), 'gone at 20 s');
    assert.strictEqual(g.playerMoveMult(), 1, 'and your legs are yours again');
});

test('Leg Cramp: the shout is learned once, free, in your own class web, and never unlearned or bought', () => {
    for (const cls of ['warrior', 'rogue', 'mage', 'necromancer']) {
        const g = home(cls);
        const pts = g.webPoints();
        assert.strictEqual(g.webLearnProblem(`${cls}.leg_cramp`).code, 'NOT_TAUGHT', `${cls}: points can't buy it`);
        wholeQuest(g);
        assert.ok(g.player.skills.includes('LEG CRAMP!'), `${cls} knows LEG CRAMP!`);
        assert.ok(g.webOwns(`${cls}.leg_cramp`));
        assert.strictEqual(g.webPoints(), pts, 'it costs no Skill Web points');
        assert.strictEqual(g.webUnlearnProblem(`${cls}.leg_cramp`).code, 'NODE_FIXED');
        assert.strictEqual(g.player.skills.filter((s) => s === 'LEG CRAMP!').length, 1);
        // Talking to Shane again offers nothing more and grants nothing twice.
        g.act({ type: 'talk', npcId: 'shane' });
        assert.ok(!choices(g).some((c) => /pleased|brought|technique/.test(c.text)), `${cls}: no second round`);
        g.applyStoryEffects([{ teach: 'LEG CRAMP!' }, { event: { type: 'story', id: 'shane_cramp_demo' } }]);
        assert.strictEqual(g.player.skills.filter((s) => s === 'LEG CRAMP!').length, 1, 'never twice');
    }
    assert.deepStrictEqual(validateSkillWeb(new GameEngine({ seed: 1 }).data), [], 'the Skill Web still validates');
});

test('Leg Cramp: completion, the skill and a cramp mid-way survive a save, and the cramp still runs out', () => {
    const g = home();
    wholeQuest(g);
    say(g, /Goodbye/);
    g.actionCalmTick(5000);
    const copy = GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())));
    assert.strictEqual(copy.questState('S02'), 'complete');
    assert.ok(copy.player.skills.includes('LEG CRAMP!') && copy.webOwns('rogue.leg_cramp'));
    assert.ok(cramp(copy), 'the cramp comes along with 15 s left');
    copy.actionCalmTick(14999);
    assert.ok(cramp(copy));
    copy.actionCalmTick(1);
    assert.ok(!cramp(copy), 'and ends on time after the reload');
    assert.strictEqual(copy.story.claimed.filter((k) => k === 'quest:S02').length, 1, 'the XP was paid once');
});

test('LEG CRAMP!: Gauge\'s numbers, a no-damage shout that slows every enemy near you, movement only', () => {
    const g = new GameEngine({ seed: 1 });
    const sk = g.data.skillDefinitions['LEG CRAMP!'];
    assert.deepStrictEqual({ cost: sk.cost, cooldown: sk.cooldown, resource: sk.resource, target: sk.target, damage: sk.base_damage || null },
        { cost: 0, cooldown: 20, resource: 'any', target: 'enemy_aoe', damage: null });
    assert.deepStrictEqual(sk.effects, [{ type: 'slow', status: 'Leg Cramp', value: 0.35, duration: 2 }]);
    assert.deepStrictEqual(g.data.actionRules.skillShapes.bySkill['LEG CRAMP!'], { shape: 'circle', radius: 64, castMs: 250 });
    assert.strictEqual(g.data.statusDefinitions['Leg Cramp'].control, 'soft', 'Control Resistance treats it as a Slow');

    const t = home('warrior');
    wholeQuest(t);
    say(t, /Goodbye/);
    t.startCombat(['rust_rat', 'rust_rat']);
    const foes = t.alive(t.combat.enemies);
    const hp = foes.map((e) => e.hp);
    const r = t.act({ type: 'skill', skillId: 'LEG CRAMP!', targetIds: foes.map((e) => e.id) });
    assert.ok(r.ok, r.error && r.error.message);
    for (const [i, e] of foes.entries()) {
        const s = e.statusEffects.find((x) => x.name === 'Leg Cramp');
        assert.ok(s && s.type === 'slow' && Math.abs(s.value - 0.35) < 1e-9, `${e.name} has Leg Cramp`);
        assert.strictEqual(e.hp, hp[i], 'it does no damage');
    }
    assert.strictEqual(t.rtTurnsToMs ? t.rtTurnsToMs(2) : 6000, 6000, '2 turns are 6 s in a timed fight');
});
