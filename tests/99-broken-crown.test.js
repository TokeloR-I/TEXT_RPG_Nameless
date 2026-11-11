// The Broken Crown rework of Chapter One (docs/design/CHAPTER_ONE_NARRATIVE_REWORK.md, Tokelo 2026-11-11), through the
// real world model + engine: the salvage clue and the scavenger (Act I), the villagers' two memories of the old crown,
// the forged register and both ways to deal with the courier (C1-N02), Corvin Sere's three approaches (C1-N04), the
// Warden's kindness before the fight, Bran Ashdown's name only after it, Tamsin's mourning, and an ending where the
// Broken Oath and the Sworn Band both answer. Plus old saves. Fights are forced wins: this checks story, not balance.
const { test, assert, GameEngine, data } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const ZONE1 = require('../src/world/zone1.js');
const STORY = require('../src/story/chapter1.js');
const { takeExit, inspect, contact, travel } = require('./world-helpers.js');
const { storyRouteNorth, meetCorvin } = require('../tools/lib/broken-oath-route.js');

const lines = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text);
function settle(g) { if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: Object.keys(data.evolutionPaths[g.player.className].branches)[0] }); }
function win(g) {
    for (let i = 0; i < 200 && g.mode === 'combat'; i++) {
        for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1;
        const a = g.getAvailableActions();
        if (a.awaiting === 'continue') g.act({ type: 'continue' });
        else if (a.awaiting === 'turn_order') g.act({ type: 'turn_order', order: null });
        else g.act({ type: 'attack', targetId: g.alive(g.combat.enemies)[0].id });
    }
}
function fight(g, s, id) { settle(g); const r = contact(s, id); assert.strictEqual(r.type, 'encounter', `${id}: ${JSON.stringify(r).slice(0, 200)}`); win(g); s.fightOver(id, 'victory'); settle(g); return r; }
function talk(s, objId) { settle(s.engine); const r = inspect(s, objId); assert.strictEqual(r.type, 'talk', `${objId}: ${JSON.stringify(r).slice(0, 200)}`); return r; }
function say(g, re) {
    const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `no choice ${re}: ${(g.getAvailableActions().actions || []).map((x) => x.text).join(' | ')}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
}
const has = (g, re) => ((g.getAvailableActions().actions) || []).some((x) => x.type === 'dialogue_choice' && re.test(x.text));
const bye = (g) => { const r = g.act({ type: 'dialogue_leave' }); settle(g); return r; };
const spoken = (g) => g.getAvailableActions().dialogue.lines.map((l) => l.text).join(' ');
const io = (g) => ({ say: (re) => say(g, re), bye: () => bye(g), settle: () => settle(g) });

function start(cls = 'warrior', seed = 5) {
    const g = new GameEngine({ seed });
    g.start();
    g.act({ type: 'choose_class', classId: cls });
    g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    return { g, s: new WorldSession(ZONE1, { engine: g }) };
}
/** From waking to the register handed over (Q05 complete), mainline only. */
function toRegister(ctx) {
    const { g, s } = ctx;
    inspect(s, 'cellar_inscription'); travel(s, 'house'); travel(s, 'grounds'); inspect(s, 'grounds_foundation'); travel(s, 'road');
    travel(s, 'tollway');
    talk(s, 'tollway_elian'); say(g, /going on to the village/); say(g, /Goodbye/);
    fight(g, s, 'tollway_ragpickers'); fight(g, s, 'tollway_root_chewers');
    takeExit(s, 'tollway_south');
    talk(s, 'village_tamsin'); bye(g);
    talk(s, 'village_mara'); say(g, /carry supplies/); bye(g);
    talk(s, 'village_tamsin'); say(g, /Mara sent/); bye(g);
    talk(s, 'village_captain'); bye(g);
    travel(s, 'tollway'); fight(g, s, 'tollway_strongbox_looters'); inspect(s, 'tollway_register');
    travel(s, 'shamefield');
    talk(s, 'village_captain'); say(g, /Here it is/);
    return ctx;
}
/** On from the open gate to the Warden's warning, meeting Corvin with `approach`. */
function toWarden(ctx, approach = 'challenge') {
    const { g, s } = ctx;
    travel(s, 'orchard');
    for (const id of ['orchard_east_lookouts', 'orchard_west_lookouts', 'orchard_cultists']) fight(g, s, id);
    takeExit(s, 'orchard_north');
    meetCorvin(g, s, io(g), approach);
    for (const id of ['featherwatch_rearguard', 'featherwatch_crows', 'featherwatch_ghoul']) fight(g, s, id);
    takeExit(s, 'featherwatch_north');
    inspect(s, 'sanctuary_journal');
    talk(s, 'sanctuary_warden_npc');
    return ctx;
}
/** Kill the Warden, open the seal, go home and mend the gate. Returns the lines of the ending. */
function toEnding(ctx) {
    const { g, s } = ctx;
    say(g, /Stand aside/); say(g, /Draw your weapon/);
    fight(g, s, 'sanctuary_warden');
    takeExit(s, 'sanctuary_seal'); inspect(s, 'seal_first_echo');
    travel(s, 'grounds');
    talk(s, 'grounds_orin'); say(g, /rebuilt/);
    const build = g.dialogueChoices().find((c) => c.choiceId === 'build:homestead_gate');
    const r = g.act({ type: 'dialogue_choice', choiceId: build.choiceId });
    bye(g);
    return lines(r).join('\n');
}

test('Broken Crown, Act I: the required look at the grounds is the clue; the scavenger knows the mark, not the man', () => {
    const { g, s } = start();
    inspect(s, 'cellar_inscription'); travel(s, 'house'); travel(s, 'grounds');
    const look = lines(inspect(s, 'grounds_foundation')).join('\n');
    assert.match(look, /cut with a spade[\s\S]*salvage notice/);
    assert.ok(g.player.inventory.includes('Torn Salvage Order'));
    assert.strictEqual(g.data.itemDefinitions['Torn Salvage Order'].sellable, false, 'a real, bound quest item');
    inspect(s, 'grounds_foundation');
    assert.strictEqual(g.player.inventory.filter((i) => i === 'Torn Salvage Order').length, 1, 'once');
    travel(s, 'road');
    assert.ok(s.visibleObjects().some((o) => o.id === 'road_scavenger'), 'someone is sorting stones on the road');
    talk(s, 'road_scavenger');
    assert.match(spoken(g), /I saw that mark on the stone\. Didn't think I'd see it on skin\./);
    say(g, /Who paid you/);
    assert.match(spoken(g), /Saw his seal\. And his coin\./);
    bye(g);
    assert.ok(!s.visibleObjects().some((o) => o.id === 'road_scavenger'), 'he ran');
    // Elian: show him the notice, or keep it (both go on to the village).
    travel(s, 'tollway');
    talk(s, 'tollway_elian'); say(g, /digging at my house/);
    assert.match(spoken(g), /Deserters dig up anything with the old crown's stamp/);
    assert.ok(g.hasStoryFlag('salvage_shown_elian'));
    say(g, /going on to the village/); say(g, /Goodbye/);
    assert.strictEqual(g.questState('Q03'), 'complete');
    fight(g, s, 'tollway_ragpickers');
    assert.ok(g.story.claimed.includes('trigger:ragpicker_notice'), 'the ragpickers carried a buyer\'s notice');
});

test('Broken Crown: the villagers remember the old crown differently, and nobody is excused', () => {
    const ctx = toRegister(start('mage', 6));
    const { g, s } = ctx;
    bye(g);
    talk(s, 'village_bragg'); say(g, /under the old crown/);
    assert.match(spoken(g), /Steady work[\s\S]*Iona will tell you what it cost/);
    bye(g);
    talk(s, 'village_iona'); say(g, /good for business/);
    assert.match(spoken(g), /took my medicine for the war/);
    bye(g);
    talk(s, 'village_shane'); say(g, /Why are the watch/); say(g, /learn medicine/);
    assert.match(spoken(g), /when there are a lot of bodies/);
    const out = bye(g);
    assert.match(lines(out).join('\n'), /Shane: "Suffer!"/, 'his farewell is still exactly "Suffer!"');
});

test('C1-N02: the forged register leads through Elian to the courier; grab him or follow him, the Captain remembers which', () => {
    for (const how of ['grab', 'follow']) {
        const ctx = toRegister(start('rogue', how === 'grab' ? 7 : 8));
        const { g, s } = ctx;
        assert.match(spoken(g), /forged papers/);
        say(g, /find out who forged/); bye(g);
        assert.strictEqual(g.questState('C1-N02'), 'active');
        assert.ok(!s.visibleObjects().some((o) => o.id === 'village_oath_courier'), 'nobody to chase before Elian names the seal');
        talk(s, 'village_elian'); say(g, /Do you know this seal/);
        assert.match(spoken(g), /quartermasters[\s\S]*Grey cloak, ash on his sleeves/);
        bye(g);
        assert.ok(s.visibleObjects().some((o) => o.id === 'village_oath_courier'));
        talk(s, 'village_oath_courier'); say(g, how === 'grab' ? /Grab him/ : /Let him run/); bye(g);
        assert.ok(g.player.inventory.includes('Ash-Marked Orders'));
        assert.ok(g.hasStoryFlag(how === 'grab' ? 'oath_courier_caught' : 'oath_courier_tracked'));
        assert.ok(!s.visibleObjects().some((o) => o.id === 'village_oath_courier'), 'he is gone');
        talk(s, 'village_captain');
        assert.match(spoken(g), how === 'grab' ? /knocked a man down in my square/ : /found his drop instead/);
        assert.match(spoken(g), /Corvin Sere/);
        say(g, /go north/); bye(g);
        assert.ok(!g.player.inventory.includes('Ash-Marked Orders'), 'the Captain keeps the proof');
        assert.ok(g.hasStoryFlag('north_gate_open'));
        assert.strictEqual(g.questState('C1-N02'), 'complete');
        assert.strictEqual(g.questState('C1-N04'), 'active');
        assert.strictEqual(g.questState('Q06'), 'unseen', 'the Warden waits behind the Broken Oath');
        // Nothing twice: the Captain has nothing new, and the quest paid once.
        talk(s, 'village_captain'); bye(g);
        assert.strictEqual(g.story.claimed.filter((k) => k === 'quest:C1-N02').length, 1);
    }
});

test('C1-N04: Corvin Sere looks at the mark, never names you, and remembers which approach you took at the end', () => {
    const endings = {};
    for (const [approach, seed] of [['challenge', 21], ['deceive', 22], ['bargain', 23]]) {
        const ctx = toRegister(start('necromancer', seed));
        const { g, s } = ctx;
        say(g, /find out who forged/); bye(g);
        storyRouteNorth(g, s, io(g));
        travel(s, 'orchard');
        for (const id of ['orchard_east_lookouts', 'orchard_west_lookouts', 'orchard_cultists']) fight(g, s, id);
        takeExit(s, 'orchard_north');
        assert.ok(s.visibleObjects().some((o) => o.id === 'featherwatch_corvin'));
        talk(s, 'featherwatch_corvin');
        assert.match(spoken(g), /That's an old sign\. You shouldn't carry it where anyone can see\./);
        assert.ok(has(g, /courier didn't get far/), 'he knows about the courier you grabbed');
        say(g, /What does it mean/);
        assert.match(spoken(g), /I know men who died for less/);
        say(g, { challenge: /won't reach the Warden/, deceive: /watch sent me/, bargain: /want with the Warden/ }[approach]);
        assert.doesNotMatch(spoken(g), /majesty|emperor|my lord|you were (the|our)/i, 'he does not know what you are');
        bye(g);
        assert.ok(g.hasStoryFlag(`corvin_${approach === 'challenge' ? 'challenged' : approach === 'deceive' ? 'deceived' : 'bargained'}`));
        assert.ok(!s.visibleObjects().some((o) => o.id === 'featherwatch_corvin'), 'he leaves');
        assert.strictEqual(g.currentObjective('C1-N04').id, 'rearguard');
        fight(g, s, 'featherwatch_rearguard');
        assert.strictEqual(g.questState('Q06'), 'active');
        assert.strictEqual(g.currentObjective('Q06').id, 'climb', 'already on the climb: the first step caught up');
        for (const id of ['featherwatch_crows', 'featherwatch_ghoul']) fight(g, s, id);
        assert.ok(g.story.claimed.includes('trigger:ghoul_name'), 'the ghoul had a name once');
        takeExit(s, 'featherwatch_north'); inspect(s, 'sanctuary_journal'); talk(s, 'sanctuary_warden_npc');
        endings[approach] = toEnding(ctx);
        assert.strictEqual(g.questState('Q07'), 'complete');
    }
    assert.match(endings.challenge, /Corvin Sere is asking who stopped his men/);
    assert.match(endings.deceive, /claimed to speak for the watch/);
    assert.match(endings.bargain, /WHERE IS IT\?/);
    for (const text of Object.values(endings)) {
        assert.match(text, /I know this cut[\s\S]*The hand that laid it/);
        assert.match(text, /The roads east still remember your footsteps/);
        assert.match(text, /The Sunbearer reads it twice[\s\S]*Send someone to the vale\. Quietly\./);
        assert.doesNotMatch(text, /Ilsabet/, 'the Sunbearer is not named in Chapter One');
    }
    assert.doesNotMatch(endings.challenge, /WHERE IS IT/, 'one faction reply per approach');
});

test('The Warden: food and a seat first, an honest refusal, and his name only after he dies (Bran Ashdown)', () => {
    const ctx = toRegister(start('warrior', 31));
    const { g, s } = ctx;
    say(g, /find out who forged/); bye(g);
    storyRouteNorth(g, s, io(g), 'follow');
    travel(s, 'orchard');
    for (const id of ['orchard_east_lookouts', 'orchard_west_lookouts', 'orchard_cultists']) fight(g, s, id);
    takeExit(s, 'orchard_north');
    for (const id of ['featherwatch_rearguard', 'featherwatch_crows', 'featherwatch_ghoul']) fight(g, s, id);
    takeExit(s, 'featherwatch_north');
    // Skipping Corvin is allowed: the sanctuary catches the chain up (QA-36/39), and he isn't waiting for ever.
    talk(s, 'sanctuary_warden_npc');
    say(g, /rest here/);
    assert.match(spoken(g), /She bit me\. Good\. Means she'll live\./);
    assert.ok(g.player.inventory.includes('Brötchen'));
    bye(g);
    inspect(s, 'sanctuary_journal');
    assert.strictEqual(g.questState('C1-N04'), 'complete', 'caught up by the next main step');
    talk(s, 'sanctuary_warden_npc');
    say(g, /I need what is behind that seal/);
    assert.match(spoken(g), /So did the men with their circles and chains/);
    say(g, /I'll go/);
    talk(s, 'sanctuary_warden_npc');
    toEnding({ g, s });
    // Back to the sanctuary by Black Flight? Not attuned; walk. His grave is where he fell, and burying him names him.
    travel(s, 'sanctuary');
    talk(s, 'sanctuary_grave');
    assert.match(spoken(g), /The Warden lies where he fell/);
    say(g, /Bury him/);
    assert.match(spoken(g), /BRAN ASHDOWN/);
    bye(g);
    assert.ok(g.hasStoryFlag('bran_buried'));
    assert.strictEqual(s.visibleObjects().find((o) => o.id === 'sanctuary_grave').name, 'Cairn');
    // Tamsin mourns, and remembers what you told her.
    travel(s, 'shamefield');
    talk(s, 'village_tamsin');
    assert.match(spoken(g), /Every roof\. Not a sound\.[\s\S]*Bran Ashdown[\s\S]*Wouldn't take a coin/);
    say(g, /I killed him/);
    assert.match(spoken(g), /Thank you for not lying to me/);
    bye(g);
    talk(s, 'village_tamsin');
    assert.match(spoken(g), /Bran would have fed you/);
    bye(g);
    talk(s, 'village_elian');
    assert.match(spoken(g), /you told her yourself/);
    bye(g);
});

test('Broken Crown lore: no line in Chapter One names the player as the old ruler, and Bran is named only after his death', () => {
    const texts = [];
    const walk = (v, path) => {
        if (typeof v === 'string') texts.push([path, v]);
        else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
        else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk({ quests: STORY.quests, npcs: STORY.npcs, triggers: STORY.triggers }, 'ch1');
    for (const [, m] of Object.entries(ZONE1.maps)) walk(m, 'map');
    for (const [path, t] of texts) {
        assert.doesNotMatch(t, /your majesty|you were (the|our) (lord|ruler|emperor|king)|our emperor/i, path);
        if (/\bBran\b/.test(t)) assert.match(path, /npcs\.(tamsin\.nodes\.(mourning|after_admit)|warden_grave\.nodes\.(bury|cairn))/, `Bran named early at ${path}`);
    }
    // Every new person stands on a real map with a story entry; every new quest marker points at a real map.
    for (const id of ['C1-N02', 'C1-N04']) for (const o of STORY.quests[id].objectives) assert.ok(ZONE1.maps[o.marker.map], `${id}.${o.id}`);
});

test('Old saves: a run still waiting at the shut gate on the old six-favour deal gets the new way north, and its favours count', () => {
    const ctx = toRegister(start('warrior', 41));
    const { g, s } = ctx;
    say(g, /I'll help them/); bye(g);
    // Two households done the old way.
    talk(s, 'village_tamsin'); say(g, /troubling the village/); bye(g);
    inspect(s, 'village_mill_bottles'); fight(g, s, 'mill_shade');
    talk(s, 'village_tamsin'); say(g, /mill is quiet/); bye(g);
    travel(s, 'village_residential_lane'); talk(s, 'lane_greta'); say(g, /lost some pigs/); bye(g);
    travel(s, 'shamefield');
    for (const id of ['stray_pig_bridge', 'stray_pig_houses', 'stray_pig_church']) inspect(s, id);
    travel(s, 'village_residential_lane'); talk(s, 'lane_greta'); say(g, /on their way home/); bye(g);
    // As a save from before the rework had it: no C1-N02 (reconcile adds it unseen) and the catch-up not yet run.
    const save = JSON.parse(JSON.stringify(g.serialize()));
    const st = save.state.story;
    delete st.quests['C1-N02']; delete st.quests['C1-N04'];
    st.claimed = st.claimed.filter((k) => !/^catchup:broken_oath_route|^quest:C1-N0/.test(k));
    const c = GameEngine.fromSave(save);
    assert.strictEqual(c.questState('C1-N02'), 'active', 'the new way north starts on load');
    assert.strictEqual(c.questState('L01'), 'active', 'the old deal carries on as the village route');
    assert.strictEqual(c.questState('SF3'), 'complete');
    const s2 = new WorldSession(ZONE1, { engine: c, map: 'shamefield', spawn: 'flight_well' });
    talk(s2, 'village_captain');
    assert.ok(has(c, /Open the gate/), 'two favours already done: he vouches');
    say(c, /Open the gate/); c.act({ type: 'dialogue_leave' });
    assert.ok(c.hasStoryFlag('north_gate_open'));
    assert.strictEqual(c.questState('C1-N04'), 'active');
});

test('Old saves: a run already past the gate (on to the Warden) keeps going, and never meets the new quests by mistake', () => {
    const ctx = toRegister(start('mage', 42));
    const { g, s } = ctx;
    say(g, /find out who forged/); bye(g);
    storyRouteNorth(g, s, io(g));
    travel(s, 'orchard');
    for (const id of ['orchard_east_lookouts', 'orchard_west_lookouts', 'orchard_cultists']) fight(g, s, id);
    takeExit(s, 'orchard_north');
    for (const id of ['featherwatch_rearguard', 'featherwatch_crows', 'featherwatch_ghoul']) fight(g, s, id);
    // As an older save had it: the gate opened by the old L01, Q06 active, the Broken Oath quests never seen.
    const save = JSON.parse(JSON.stringify(g.serialize()));
    const st = save.state.story;
    st.quests['C1-N02'] = { state: 'unseen', step: 0 }; st.quests['C1-N04'] = { state: 'unseen', step: 0 };
    st.quests.L01 = { state: 'complete', step: 2 };
    st.quests.Q06 = { state: 'active', step: 1 };
    st.claimed = st.claimed.filter((k) => !/^catchup:broken_oath_route/.test(k));
    const c = GameEngine.fromSave(save);
    assert.strictEqual(c.questState('C1-N02'), 'unseen', 'past the gate: the catch-up stays out of the way');
    assert.strictEqual(c.questState('Q06'), 'active');
    const s2 = new WorldSession(ZONE1, { engine: c, map: 'featherwatch', spawn: 'from_orchard' });
    takeExit(s2, 'featherwatch_north');
    assert.strictEqual(c.currentObjective('Q06').id, 'look', 'the climb counts');
});
