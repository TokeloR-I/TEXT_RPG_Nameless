/* =========================================================================
 * Enso's Last Stand — STORY DATA: Chapter Two, "The Feast of Empty Seats", Act I
 * Lore and quest outline: docs/design/CHAPTER_TWO_LORE.md (Hrimvald; C2-01 The Frostspine Road, C2-02 Salt and
 * Silver). Tokelo, 2026-11-11: "start building the world for chapter 2". Guide: docs/CHAPTER_TWO.md.
 *
 * Pure data in the Chapter One format (src/story/chapter1.js explains it). chapter1.js merges this file's
 * quests, NPCs, triggers and anchors into the one story the engine runs, and points Q08 "Ten Seals" at it, so a
 * save that finished Chapter One walks straight on.
 *
 * Rules this text keeps (lore doc, "Creative-direction guardrails"):
 *   - The player never learns here that they were the old sovereign. Nobody in Hrimvald says so, or knows.
 *   - The six hundred are people with names. Raiders are people too: Ulfrun is beaten, not butchered.
 *   - No door motif. The old Crown is remembered by roads, mile markers and customs stones.
 *   - Odin's two ravens only watch. The crow dislikes them and does not say why.
 *   - Names live in wood, not in people (lore bible 4.1): Hrimvald's families need the boards to say their missing
 *     ones' names and think it is grief. Seeded, never explained here (the why is a [mid] reveal).
 * Dialogue reviewed by Ashby, Wick and Cairn on 2026-11-11 (docs/design/CHAPTER_TWO_NARRATIVE_REVIEW.md, which also
 * sets out Hrafnholm's politics). XP and Gold are CANDIDATES for Gauge.
 * Quest ids: C201 = the lore doc's C2-01, C202 = C2-02, C203 = C2-03, C204 = C2-04; side quests keep the lore doc's
 * ids (C2-S02, C2-S04). Hrafnholm is built (Tokelo's reference maps, 2026-11-13): C203 takes you there, to Ragnhild in
 * the hall and Torvald in the yard, and ends Act I at the Thing (2026-11-13). C204 is a pointer until Járnmyr's picture.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const TABLET = 'Birkholt Name Tablet';
    // The three things Eydis asks you to find out in Skeldvik before the tablet is decided.
    const ASKED = ['skeldvik_memorial_seen', 'leif_told', 'solveig_told'];

    const quests = {
        C201: {
            title: 'The Frostspine Road', kind: 'main', xp: 40, candidate: true,
            summary: 'The crows led east and up, into the pass between Blackbriar Vale and the North. A funeral caravan lies wrecked on the road, and armed men are searching it.',
            objectives: [
                { id: 'caravan', text: 'Drive the raiders off the funeral caravan', on: { type: 'defeat', id: 'frostspine_caravan_raiders' }, marker: { map: 'frostspine_pass', x: 15, y: 8 } },
                { id: 'tablet', text: 'Find what the raiders were looking for', on: { type: 'inspect', id: 'frostspine_tablet' }, marker: { map: 'frostspine_pass', x: 13, y: 9 },
                    effects: [{ item: TABLET, key: 'item:birkholt_tablet' }, { say: 'You ease the tablet out from under her hands. It is warm from the sun on one face and cold on the other. Forty names. You do not know any of them.' }] },
                { id: 'eydis', text: 'Speak with the skald by the fire', on: { type: 'story', id: 'eydis_roll' }, marker: { map: 'frostspine_pass', x: 8, y: 7 } },
                { id: 'gap', text: 'Break through the gap in the crags', on: { type: 'defeat', id: 'frostspine_ulfrun' }, marker: { map: 'frostspine_pass', x: 18, y: 11 } },
                { id: 'harbor', text: 'Cross the pass and go down to Skeldvik', on: { type: 'enter', id: 'skeldvik' }, marker: { map: 'frostspine_pass', x: 26, y: 0 } }
            ],
            onComplete: [{ gold: 20, key: 'c201_reward' }, { start: 'C202' }]
        },
        C202: {
            title: 'Salt and Silver', kind: 'main', xp: 45, candidate: true,
            summary: 'Skeldvik trades with everyone and trusts nobody this season. Eydis says the Birkholt tablet is not the first to be taken. Find out who else has lost their names, and who is buying.',
            objectives: [
                { id: 'eydis', text: 'Find Eydis at the memorial stone in Skeldvik', on: { type: 'story', id: 'eydis_harbor' }, marker: { map: 'skeldvik', x: 11, y: 10 } },
                { id: 'memorial', text: "Look at Skeldvik's memorial stone", on: { type: 'inspect', id: 'skeldvik_memorial' }, marker: { map: 'skeldvik', x: 12, y: 8 } },
                { id: 'leif', text: 'Ask Leif Ropehand the shipwright about the armed crews', on: { type: 'story', id: 'leif_crews' }, marker: { map: 'skeldvik', x: 8, y: 28 } },
                { id: 'solveig', text: 'Ask Solveig at the fish stalls what she has seen', on: { type: 'story', id: 'solveig_witness' }, marker: { map: 'skeldvik', x: 28, y: 15 } },
                { id: 'decide', text: 'Tell Eydis what you learned, and decide who keeps the tablet', on: { type: 'story', id: 'tablet_decided' }, marker: { map: 'skeldvik', x: 11, y: 10 } }
            ],
            onComplete: [{ flag: 'skeldvik_evidence' }, { gold: 25, key: 'c202_reward' },
                { say: "Four boards since midsummer: two up the coast, Asta's on the road, Skeldvik's off its stone, and the running wolf at every one. Whoever leads the Wolf-Banner wants all six hundred names, and is not asking the families." },
                { start: 'C203' }]
        },
        // Fenrir's Heir (Tokelo 2026-11-13, PR #256; replaces Allfather's Chosen): the optional legendary unlock. It begins
        // when you read the wolf-carving at the Wolf's Wake on Gullstrand Coast (west of Skeldvik by the cliff path; the map
        // is laid out after Tokelo's picture, 2026-11-13). Brynja Net-Mender in the village gives the clues. Two hunts in
        // either order: wolves gone sun-mad lie across the bright cave; the dark hollow gives up its fang only to someone
        // who puts their light out, and then sends its wolves after them. Then the stone, the Binding Echo, and the choice.
        CL1: {
            title: 'The Hunt of Sun and Moon', kind: 'side', xp: 150, candidate: true,
            summary: 'Gullstrand fishers hear two howls that should not be: one at the brightest hour, one when the moon goes out. An old carving shows two wolves chasing two lights, their tracks bound by a broken chain.',
            objectives: [
                // The fangs can be taken in either order: a step whose fang you already hold gives way at once (skipIf).
                { id: 'sun', text: 'Take the Sun Fang from the bright cave (either fang first)', on: { type: 'story', id: 'fenrir_sun_fang' },
                    skipIf: { flags: ['fenrir_sun_fang'] }, marker: { map: 'gullstrand_coast', x: 21, y: 5 } },
                { id: 'moon', text: 'Take the Moon Fang from the dark hollow', on: { type: 'story', id: 'fenrir_moon_fang' },
                    skipIf: { flags: ['fenrir_moon_fang'] }, marker: { map: 'gullstrand_coast', x: 35, y: 5 } },
                { id: 'stone', text: "Lay both fangs in the binding stone at the Wolf's Wake", on: { type: 'story', id: 'fenrir_trial_called' }, marker: { map: 'gullstrand_coast', x: 32, y: 6 } },
                { id: 'trial', text: 'Survive what wakes on the ring', on: { type: 'defeat', id: 'wolfs_wake_trial' }, marker: { map: 'gullstrand_coast', x: 28, y: 8 } },
                { id: 'choose', text: 'Choose the wolf that runs with you first', on: { type: 'story', id: 'fenrir_heir_awakened' }, marker: { map: 'gullstrand_coast', x: 32, y: 6 } }
            ],
            onComplete: [{ say: "Press T to change wolf: Sköll, Hati, or Fenrir's own stance. Stay with one and its bond grows.", notice: 'quest' }]
        },
        C203: {
            title: 'The Hall of Winter', kind: 'main', xp: 60, candidate: true,
            summary: 'The assembly meets at Hrafnholm, where the Jarl keeps her hall. Eydis means to read the stolen names aloud there, in front of the man she thinks took them.',
            objectives: [
                { id: 'hrafnholm', text: 'Take the south-west road to Hrafnholm', on: { type: 'story', id: 'hrafnholm_reached' }, marker: { map: 'skeldvik', x: 0, y: 36 } },
                { id: 'ragnhild', text: 'Present yourself to Jarl Ragnhild in the Hall of Winter', on: { type: 'story', id: 'ragnhild_met' }, marker: { map: 'hall_of_winter', x: 19, y: 6 } },
                { id: 'torvald', text: 'Find Torvald Redhand at the Training Yard', on: { type: 'story', id: 'torvald_met' }, marker: { map: 'hrafnholm', x: 6, y: 28 } },
                // The Thing (2026-11-13; review doc 4.4). Ids kept from the pointer this step used to be, so a save waiting
                // here walks straight on: Arnkel blows the horn (`thing_sits`), and the player takes a side (`thing_position`).
                { id: 'thing', text: 'Ask Arnkel at the law rock to call the Thing', on: { type: 'story', id: 'thing_sits' }, marker: { map: 'hrafnholm', x: 24, y: 23 } },
                { id: 'position', text: 'Speak at the Thing: choose where you stand', on: { type: 'story', id: 'thing_position' }, marker: { map: 'hrafnholm', x: 24, y: 23 } }
            ],
            // Act I ends. Whatever you said, the Thing makes you its witness (no position can softlock the chapter).
            onComplete: [{ flag: 'thing_heard' }, { gold: 30, key: 'c203_reward' },
                { say: 'From the top of the ring wall, the crow watches the households file out.', important: true },
                { say: "'The Thing's witness,' it says. 'I'll try to keep a straight face.'" },
                { say: "The Jarl's household will keep a bench for you in the Hall of Winter.", when: { flags: ['thing_backed_ragnhild'] } },
                { say: "The Wolf-Banner's crews will let you walk among them now.", when: { flags: ['thing_backed_torvald'] } },
                { say: 'Arnkel will hear you at the law rock whenever you come back with something.', when: { flags: ['thing_asked_inquiry'] } },
                { start: 'C204' }]
        },
        // Act II begins at Járnmyr, which has no map yet: Tokelo's rule is no new area before its picture (2026-11-13).
        C204: {
            title: 'Iron for the Wolf', kind: 'main', xp: 0, teaser: true,
            summary: 'Name boards and iron are going missing from the North together, and the iron goes through Járnmyr, where the bog-iron is smelted. The Thing has made you its witness. Follow the iron.',
            objectives: [
                { id: 'jarnmyr', text: 'Follow the iron to Járnmyr (the next part of Chapter Two)', on: { type: 'story', id: 'jarnmyr_reached' } }
            ],
            onComplete: []
        },
        // ----- C2-S02 The Price of an Oath (lore doc section 7): a vanished warrior's land, after the Thing said "not yet".
        'C2-S02': {
            title: 'The Price of an Oath', kind: 'side', xp: 35, candidate: true,
            summary: "Hild of the Green Pine has waited twenty winters for the Thing, and her daughter marries at midsummer. Her husband's brother holds their land for a man who has not come home.",
            objectives: [
                { id: 'kolgrim', text: "Hear her husband's brother Kolgrim in the Training Yard", on: { type: 'story', id: 'oath_kolgrim' }, marker: { map: 'hrafnholm', x: 10, y: 27 } },
                { id: 'stick', text: "Find the oath-stick on the Lawspeaker's table in the Hall of Winter", on: { type: 'story', id: 'oath_stick' }, marker: { map: 'hall_of_winter', x: 29, y: 8 } },
                { id: 'judge', text: 'Bring the stick to Arnkel at the law rock, and say how the land should be held', on: { type: 'story', id: 'oath_judged' }, marker: { map: 'hrafnholm', x: 24, y: 23 } }
            ],
            onComplete: [{ gold: 20, key: 'c2s02_reward' },
                { say: 'Hild holds the Green Pine land in Orm\'s name, as he swore. Kolgrim has not spoken to her since.', when: { flags: ['oath_for_hild'] } },
                { say: 'Kolgrim holds the Green Pine land until someone has seen the Silent Field. Hild will marry her daughter off with a cow and a promise.', when: { flags: ['oath_for_kolgrim'] } },
                { say: "Hild holds the land in Orm's name, and Kolgrim farms the upper field. Neither of them thanked you; Arnkel says that is how you know it was fair.", when: { flags: ['oath_shared'] } }]
        },
        // ----- C2-S04 The Fisherman's Debt (lore doc section 7): a Skeldvik captain owes Osric Vane in the old Crown's plate.
        'C2-S04': {
            title: "The Fisherman's Debt", kind: 'side', xp: 30, candidate: true,
            summary: "Bersi Grimsson borrowed thirty in silver from a southern factor for a new mast. The herring never came, and the factor's paper says Bersi's ship is his at the thaw.",
            objectives: [
                { id: 'osric', text: "Ask Osric Vane in Hrafnholm about Bersi's debt", on: { type: 'story', id: 'debt_osric' }, marker: { map: 'hrafnholm', x: 12, y: 15 } },
                { id: 'settle', text: 'Settle the debt: pay Osric, or give him a reason to wait', on: { type: 'story', id: 'debt_settled' }, marker: { map: 'hrafnholm', x: 12, y: 15 } },
                { id: 'bersi', text: 'Tell Bersi at the north dock that his ship is his', on: { type: 'story', id: 'debt_told' }, marker: { map: 'skeldvik', x: 48, y: 16 } }
            ],
            onComplete: [{ flag: 'bersi_passage' },
                { item: 'Mead', key: 'item:c2s04_mead', when: { flags: ['debt_paid'] } }, { item: 'Gravlax', key: 'item:c2s04_gravlax', when: { flags: ['debt_paid'] } },
                { say: 'When the ice goes out, the Sea-Hare will carry you to any coast you like.', notice: 'quest' }]
        },
        // James the bard (Tokelo, 2026-11-13: "in chapter 2 introduce a bard that will join you at your homestead after
        // recruiting him"). A southerner who came north to learn the skalds' songs; met outside the Stormtide Inn in
        // Skeldvik (no new area: the inn's interior has no picture yet), he moves to the homestead grounds once asked.
        CB1: {
            title: 'A Bard in Skeldvik', kind: 'side', xp: 20, candidate: true,
            summary: 'A southern bard plays outside the Stormtide Inn for fishermen who do not tip. The skalds will not teach him, and he has nowhere in particular to be.',
            objectives: [
                { id: 'meet', text: 'Listen to the bard outside the Stormtide Inn', on: { type: 'story', id: 'james_met' }, marker: { map: 'skeldvik', x: 29, y: 10 } },
                { id: 'invite', text: 'Offer James a place at your homestead', on: { type: 'story', id: 'james_recruited' }, marker: { map: 'skeldvik', x: 29, y: 10 } },
                { id: 'home', text: 'Find James at your homestead', on: { type: 'story', id: 'james_home' }, marker: { map: 'grounds', x: 26, y: 9 } }
            ],
            onComplete: []
        },
        // PLACEHOLDER (Tokelo, 2026-11-13): "a quest he will give you where you get to make a deal with a dark being called
        // demonkore. I dont know how the quest goes but for now this is what I got". UNFINISHED ON PURPOSE: only James's
        // hook exists. Who or what Demonkore is, where the deal is made and what it costs are Tokelo's to decide; nobody
        // fires `demonkore_deal` yet, so the quest stays open in the Journal. Don't fill it in without Tokelo.
        CB2: {
            title: 'A Deal with Demonkore', kind: 'side', xp: 0, teaser: true, placeholder: true,
            summary: 'James has heard of a dark being called Demonkore, who makes deals. (This quest is not finished yet: what happens next is still being written.)',
            objectives: [
                { id: 'hear', text: 'Hear James out about Demonkore', on: { type: 'story', id: 'demonkore_heard' }, marker: { map: 'grounds', x: 26, y: 9 } },
                { id: 'deal', text: 'Make a deal with Demonkore (not written yet: the rest of this quest is coming)', on: { type: 'story', id: 'demonkore_deal' } }
            ],
            onComplete: []
        },
        // ----- A Fire of Your Own (Tokelo, 2026-11-13: "a portable hearth... someone on the road teaches the player").
        // Hakon the carter, wrist broken on the Frostspine Road, gives you his spare camp kit once you fetch the tinder.
        C2S2: {
            title: 'A Fire of Your Own', kind: 'side', xp: 15, candidate: true,
            summary: "Hakon has camped on every road from Birkholt to the sea and never waited for an inn. He'll give you his spare camp kit, if you fetch the tinder he can't reach with one good hand.",
            objectives: [
                { id: 'juniper', text: 'Gather juniper on the slope above the pass and bring it to Hakon', on: { type: 'story', id: 'hakon_camp' }, marker: { map: 'frostspine_pass', x: 7, y: 2 } }
            ],
            onComplete: [{ item: 'Camp Kit', key: 'item:c2s2_camp_kit' },
                { say: 'Use the Camp Kit from Esc, then Items, anywhere out of a fight: it opens a hearth that cooks the food of the region you are in.', notice: 'quest' }]
        },
        // ----- Sour Herring (Tokelo, 2026-11-13: "a prank quest for surströmming"; docs/design/NORSE_KITCHEN.md).
        // Comic relief in a grieving harbour: Solveig can't fight sixty oars, but she can make their ship stink until
        // midwinter. Nobody is hurt. Geir, who did not split the board, gets a mead out of it.
        C2S1: {
            title: 'Sour Herring', kind: 'side', xp: 30, candidate: true,
            summary: "Solveig can't fight sixty oars. She does have a cask of herring that has been souring since last spring, and she would like the Wolf-Banner ship to have it.",
            objectives: [
                { id: 'awl', text: "Borrow a cooper's awl from Leif Ropehand to tap the cask", on: { type: 'story', id: 'leif_awl' }, marker: { map: 'skeldvik', x: 8, y: 28 } },
                { id: 'geir', text: 'Get Geir the steersman off the gangplank (a Mead might do it)', on: { type: 'story', id: 'geir_distracted' }, marker: { map: 'skeldvik', x: 24, y: 23 } },
                { id: 'tap', text: 'Slip aboard the narrow ship and tap the cask under the rowing benches', on: { type: 'story', id: 'herring_tapped' }, marker: { map: 'skeldvik', x: 18, y: 28 } },
                { id: 'tell', text: 'Tell Solveig how it went', on: { type: 'story', id: 'solveig_prank_done' }, marker: { map: 'skeldvik', x: 28, y: 15 } }
            ],
            onComplete: [{ gold: 15, key: 'c2s1_reward' }, { item: 'Surströmming', key: 'item:c2s1_herring_1' }, { item: 'Surströmming', key: 'item:c2s1_herring_2' },
                { item: 'Gravlax', key: 'item:c2s1_gravlax' }]
        }
    };

    // ------------------------------------------------------------- The Hrimvald kitchen (Tokelo, 2026-11-13)
    // Station menus are built from the data (recipeDefinitions in src/data.js), as in Chapter One: a recipe shows up
    // while you carry its ingredients, and "What can I make here?" lists them all.
    const DATA = isNode ? require('../data.js') : ENSO.data;
    const amount = (ings) => Object.entries(ings).map(([n, q]) => (q > 1 ? `${q} ${n}` : n)).join(', ');
    const STATION_VERB = { hearth: 'Cook', meadery: 'Brew' };
    // Regional cooking (Tokelo, 2026-11-13): Hrimvald's hearths cook Hrimvald's dishes, plus rat goulash (region 'any');
    // the home hearth in Chapter One cooks every region's. `region: 'here'` (the camp kit) cooks where you stand.
    const HOME = (DATA.foodRules || {}).homeRegion;
    const regionOf = (r) => r.region || HOME;
    const recipesAt = (station, region) => Object.entries(DATA.recipeDefinitions)
        .filter(([, r]) => r.station === station && (!region || region === 'here' || r.region === 'any' || regionOf(r) === region));
    const cook = (station, region) => recipesAt(station, region).map(([id, r]) => ({
        text: `${STATION_VERB[station] || 'Make'} ${r.yield > 1 ? `${r.yield} ` : ''}${r.output} (${amount(r.ingredients)})`,
        if: { has: r.ingredients, ...(region === 'here' && r.region !== 'any' ? { inRegion: regionOf(r) } : {}) }, stay: true, effects: [{ craft: id }]
    }));
    const recipeBook = (station, region) => (region === 'here'
        ? Object.keys((DATA.foodRules || {}).regions || {}).concat(HOME).map((reg) => ({
            text: 'What can I make here?', if: { inRegion: reg }, stay: true,
            effects: [{ say: recipesAt(station, reg).map(([, r]) => `${r.output}${r.yield > 1 ? ` ×${r.yield}` : ''}: ${amount(r.ingredients)}`).join('\n') }]
        }))
        : [{
            text: 'What can I make here?', stay: true,
            effects: [{ say: recipesAt(station, region).map(([, r]) => `${r.output}${r.yield > 1 ? ` ×${r.yield}` : ''}: ${amount(r.ingredients)}`).join('\n') }]
        }]);
    const shop = (id) => ({ text: 'What have you got?', say: 'What have you got for sale?', stay: true, effects: [{ shop: id }] });
    /** A hearth: a public one cooks its region's dishes; region 'here' (a camp) cooks the region you stand in. */
    const hearth = (name, title, look, region) => ({
        name, title, kitchen: 'hearth', region,
        talk: [{ node: 'hearth' }],
        nodes: { hearth: { lines: [[null, look]], choices: [...cook('hearth', region), ...recipeBook('hearth', region), { text: 'Leave it.', end: true }] } }
    });

    // Each line below is one page of the dialogue box (docs/ui/DIALOGUE_BOX.md: at most two sentences, ~160
    // characters); tests/98-chapter-two.test.js checks it. Voices (Wick): Eydis exact and dry, Hakon plain,
    // Leif brusque, Solveig salt, Thora legal, Geir grieving and sure of himself.
    // The choices a conversation with Ragnhild or Torvald keeps coming back to.
    const RAGNHILD = [
        { text: 'Why is the high seat empty?', to: 'seat' },
        { text: 'Thora told me about the twenty winters.', if: { flags: ['heard_of_succession'] }, to: 'law_known' },
        { text: 'What will you ask the Thing?', if: { notFlags: ['heard_of_succession'] }, to: 'law' },
        { text: 'And Torvald Redhand?', to: 'redhand' },
        { text: 'Goodbye.', end: true }
    ];
    const TORVALD = [
        { text: 'Why take the name boards?', to: 'boards' },
        { text: 'Tell me about Arni.', if: { flags: ['wolfbanner_heard'] }, to: 'arni' },
        { text: 'Where does your silver come from?', if: { flags: ['southern_friends_heard', 'leif_told'] }, to: 'silver' },
        { text: 'Goodbye.', end: true }
    ];
    // The three first positions at the Thing (review doc 4.4); exactly one is ever set.
    const POSITIONS = ['thing_backed_ragnhild', 'thing_backed_torvald', 'thing_asked_inquiry'];
    // Osric's choices: C2-S04 The Fisherman's Debt is put to him here.
    const OSRIC = [
        { text: "Bersi Grimsson's debt.", if: { quests: { 'C2-S04': 'active' }, notFlags: ['debt_paid', 'debt_leaned'] }, to: 'debt' },
        { text: 'Where are you from?', to: 'south' },
        { text: 'Goodbye.', end: true }
    ];
    const npcs = {
        // ------------------------------------------------------------- Eydis Namesinger, keeper of the Roll
        eydis: {
            name: 'Eydis Namesinger', title: 'Skald',
            talk: [
                // Up at Hrafnholm once Act I's decision is made (C2-03): before the Thing, and after it by where you stood.
                { if: { flags: ['thing_backed_ragnhild'] }, node: 'thing_ragnhild' },
                { if: { flags: ['thing_backed_torvald'] }, node: 'thing_torvald' },
                { if: { flags: ['thing_asked_inquiry'] }, node: 'thing_inquiry' },
                { if: { quests: { C203: 'active+' } }, node: 'thing_before' },
                { if: { notFlags: ['caravan_saved', 'eydis_in_skeldvik'] }, node: 'hiding' },
                { if: { flags: ['eydis_in_skeldvik'], notFlags: ['eydis_harbor_met'] }, node: 'harbor' },
                { if: { notFlags: ['eydis_met'] }, node: 'meet' },
                { if: { flags: ['eydis_in_skeldvik'] }, node: 'harbor_again' },
                { node: 'pass_again' }
            ],
            nodes: {
                hiding: {
                    lines: [
                        ['npc', "Keep your voice down. They're still at the biers."],
                        ['npc', "They want something Asta was carrying. I have a harp, not a sword, and Hakon's wrist is broken."],
                        ['npc', "If you're going to do something, do it."]
                    ],
                    choices: [{ text: "Stay by the fire.", end: 'interrupt' }]
                },
                meet: {
                    lines: [
                        ['npc', "You fight like someone who's done it before and doesn't remember where. I'm Eydis, and I keep the Roll."],
                        ['npc', "Six hundred of ours marched to the Silent Field twenty years ago and never came home. No bodies, no graves, nothing to burn."],
                        ['npc', "The morning a host marches, every steading cuts its warriors' names on a board, to count them home. Ours became the only graves they have."]
                    ],
                    effects: [{ flag: 'eydis_met' }],
                    choices: [
                        { text: 'What is the Roll?', to: 'roll' },
                        { text: 'Why would raiders want a list of the dead?', to: 'why' },
                        { text: 'I found this under her hands.', if: { items: [TABLET] }, to: 'tablet' }
                    ]
                },
                roll: {
                    lines: [
                        ['npc', "Every board, copied into one book, and every name sung once a year so the count stays honest. I have four hundred and eleven of the six hundred."],
                        ['npc', "Some families swear their board is missing someone, and can't tell me who. I write that down too."],
                        ['npc', "A skald who keeps only the tidy version is a liar with a good voice."]
                    ],
                    choices: [
                        { text: 'Why would raiders want a list of the dead?', to: 'why' },
                        { text: 'I found this under her hands.', if: { items: [TABLET] }, to: 'tablet' },
                        { text: "I'll clear the pass.", effects: [{ event: { type: 'story', id: 'eydis_roll' } }], to: 'onward' }
                    ]
                },
                why: {
                    lines: [
                        ['npc', "I don't know, and that frightens me more than the axes. You can't ransom a name, and you can't sell one."],
                        ['npc', "They wore the running wolf, Torvald Redhand's banner. Asta's board is the third taken since midsummer."]
                    ],
                    choices: [
                        { text: 'What is the Roll?', to: 'roll' },
                        { text: 'I found this under her hands.', if: { items: [TABLET] }, to: 'tablet' },
                        { text: "I'll clear the pass.", effects: [{ event: { type: 'story', id: 'eydis_roll' } }], to: 'onward' }
                    ]
                },
                tablet: {
                    lines: [
                        ['npc', "Birkholt's. Forty names, and Asta recut the last eleven herself when the wood wore thin, by feel, in the old grooves."],
                        ['npc', "Carry it as far as Skeldvik for me. Nobody stops a stranger to ask what's in their pack, and everybody stops me."]
                    ],
                    choices: [
                        { text: 'What is the Roll?', to: 'roll' },
                        { text: 'Why would raiders want it?', to: 'why' },
                        { text: "I'll carry it. And I'll clear the pass.", effects: [{ event: { type: 'story', id: 'eydis_roll' } }], to: 'onward' }
                    ]
                },
                onward: {
                    lines: [
                        ['npc', "There's a woman in the gap with a wolf pelt on her shoulders, Ulfrun Grey-Mantle. She's kin to half of Birkholt, which is the worst of it."],
                        ['npc', "I'll bring Hakon down by the goat track once the road is quiet."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                pass_again: {
                    lines: [['npc', "Skeldvik is down the far side; ask for me at the memorial stone. Mind the tablet: it's the only copy of eleven of those names."]],
                    choices: [
                        { text: 'What is the Roll?', to: 'roll' },
                        { text: 'Why would raiders want it?', to: 'why' },
                        { text: "I'll clear the pass.", effects: [{ event: { type: 'story', id: 'eydis_roll' } }], to: 'onward' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                harbor: {
                    lines: [
                        ['npc', "You came through. Look at the stone behind me before you say anything."],
                        ['npc', "That board was whole at midsummer, so Skeldvik makes four. Somebody here watched it happen."],
                        ['npc', "Ask Leif at the shipyard about the armed crews. Ask Solveig at the fish stalls too; she misses nothing and forgives less."]
                    ],
                    effects: [{ flag: 'eydis_met' }, { flag: 'eydis_harbor_met' }, { event: { type: 'story', id: 'eydis_roll' } }, { event: { type: 'story', id: 'eydis_harbor' } }],
                    choices: [{ text: "I'll ask around.", end: true }]
                },
                harbor_again: {
                    lines: [['npc', "Well? What does Skeldvik say?"]],
                    choices: [
                        { text: 'I know who is taking the names.', if: { flags: ASKED, notFlags: ['tablet_decided'] }, to: 'report' },
                        { text: 'What happens now?', if: { flags: ['tablet_decided'] }, to: 'next' },
                        { text: 'Tell me about the Silent Field.', to: 'field' },
                        { text: 'Who is Hallvard?', if: { flags: ['heard_of_hallvard'] }, to: 'hallvard' },
                        { text: "I'm still asking.", if: { notFlags: ['tablet_decided'] }, end: true },
                        { text: 'Goodbye.', if: { flags: ['tablet_decided'] }, end: true }
                    ]
                },
                field: {
                    lines: [
                        ['npc', "A cold flat place past Hrafnholm. The old Crown came north up the road it had built, and our host stood across it."],
                        ['npc', "By evening they were gone: not dead on the grass, just gone. The old songs say the choosers of the slain came down that night and found nobody to choose."],
                        ['npc', "Hallvard the One-Handed is the only one who walked off that field. Everyone else who came home was a wagon boy, or a wife watching from the ridge."],
                        ['npc', "I have nine accounts from the ridge, and no two match. Hallvard won't give me his at all."]
                    ],
                    effects: [{ flag: 'heard_of_hallvard' }],
                    choices: [{ text: 'Who is Hallvard?', to: 'hallvard' }, { text: 'Back.', to: 'harbor_again' }]
                },
                hallvard: {
                    lines: [
                        ['npc', "The best skald the North had. He lost two sons and a hand on the Silent Field, and now he keeps a barrow beyond it and lets nobody near."],
                        ['npc', "His daughter Runa is sworn to the Jarl's daughter at Hrafnholm. She asks me what her father saw, as if I would know."]
                    ],
                    choices: [{ text: 'Back.', to: 'harbor_again' }]
                },
                report: {
                    lines: [
                        ['npc', "The wolf at every harbour, silver that isn't Torvald's own, and they want the names whole. Then it isn't spite: he needs the Roll for something."],
                        ['npc', "The Thing meets at Hrafnholm before the snow. I'm going to read every stolen name aloud there, with him standing in front of me."],
                        ['npc', "But the tablet can't travel an open road with me. Who keeps it?"]
                    ],
                    choices: [
                        { text: 'You. It belongs with the Roll.', effects: [{ removeItem: TABLET }, { flag: 'tablet_with_eydis' }, { flag: 'tablet_decided' }, { event: { type: 'story', id: 'tablet_decided' } }], to: 'chose_eydis' },
                        { text: "Thora's guard. It should sit behind a locked chest and a law.", effects: [{ removeItem: TABLET }, { flag: 'tablet_with_reeve' }, { flag: 'tablet_decided' }, { event: { type: 'story', id: 'tablet_decided' } }], to: 'chose_reeve' },
                        { text: "I'll keep carrying it. Nobody stops a stranger.", effects: [{ flag: 'tablet_kept' }, { flag: 'tablet_decided' }, { event: { type: 'story', id: 'tablet_decided' } }], to: 'chose_kept' }
                    ]
                },
                chose_eydis: {
                    lines: [['npc', "Then they'll have to come through me, and I am very loud. Thank you; I'll copy it twice tonight."]],
                    choices: [{ text: 'What happens now?', to: 'next' }, { text: 'Goodbye.', end: true }]
                },
                chose_reeve: {
                    lines: [
                        ['npc', "Thora is honest. She is also the Jarl's, and the Jarl would rather nobody read anything aloud this year."],
                        ['npc', "But it will be safe. I can live with safe."]
                    ],
                    choices: [{ text: 'What happens now?', to: 'next' }, { text: 'Goodbye.', end: true }]
                },
                chose_kept: {
                    lines: [
                        ['npc', "Hm. I asked you to carry it to Skeldvik, and here we are in Skeldvik."],
                        ['npc', "All right. But you'll stand beside me at Hrafnholm when I read it; that's the price."]
                    ],
                    choices: [{ text: 'What happens now?', to: 'next' }, { text: 'Goodbye.', end: true }]
                },
                thing_before: {
                    lines: [
                        ['npc', "Redhand is here, and so am I. When Arnkel blows the horn I'll read, and he can look me in the eye while I do it."],
                        ['npc', "Talk to the Jarl and to Redhand first. The Thing hears a guest better if both sides have looked at them."]
                    ],
                    choices: [{ text: 'Who is Hallvard?', if: { flags: ['heard_of_hallvard'] }, to: 'hallvard_up' }, { text: 'Goodbye.', end: true }]
                },
                hallvard_up: {
                    lines: [
                        ['npc', "Eirik's skald, and the only one who walked off the Silent Field. He keeps a barrow out past it now and lets nobody near."],
                        ['npc', "His daughter Runa is here, sworn to Sigrun. Be kind if you ask her about him; everybody else asks."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                thing_ragnhild: {
                    lines: [
                        ['npc', "You told them to bury the six hundred. I still can't decide whether that was kind."],
                        ['npc', "I'll go on reading the names either way. Buried or not, somebody has to say them."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                thing_torvald: {
                    lines: [
                        ['npc', "You stood with Redhand. I don't blame you; he's the only one in that ring who sounds as if he misses them."],
                        ['npc', "Just remember he still has four of my boards."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                thing_inquiry: {
                    lines: [
                        ['npc', "You asked them to look before they decide. I'd have asked the same, if anyone let a skald speak at the Thing."],
                        ['npc', "Go where the boards went. I'll be here, copying what's left."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                next: {
                    lines: [
                        ['npc', "West to Hrafnholm, when the road opens. Jarl Ragnhild holds the hall, Torvald Redhand wants it, and her daughter Sigrun is tired of being talked over."],
                        ['npc', "Arnkel the Lawspeaker will hear them all at the Thing. Look at each of them before you decide who you believe; I'd like to know what a stranger sees."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Hakon, who was driving the caravan
        hakon: {
            name: 'Hakon', title: 'Carter of Birkholt',
            talk: [{ if: { flags: ['caravan_saved'] }, node: 'after' }, { node: 'before' }],
            nodes: {
                before: {
                    lines: [['npc', "They turned the wagon over with her still in it. Sixty years she wove sailcloth for this coast, and they tipped her out like turnips."]],
                    choices: [{ text: 'Stay down.', end: 'interrupt' }]
                },
                after: {
                    lines: [['npc', "I'll right the wagon when my wrist lets me. She's going home to Birkholt if I have to carry her."]],
                    choices: [
                        { text: 'Who was she?', to: 'asta' },
                        { text: 'Did you know the raiders?', to: 'raiders' },
                        // A Fire of Your Own (C2S2, Tokelo 2026-11-13): a carter teaches you to cook on the road.
                        { text: "How do you eat out here, with no hearth?", if: { quests: { C2S2: 'unseen' } }, to: 'camp_offer' },
                        { text: 'Juniper, for your tinder.', if: { quests: { C2S2: 'active' }, items: ['Juniper Berries'] },
                            effects: [{ removeItem: 'Juniper Berries' }, { event: { type: 'story', id: 'hakon_camp' } }], to: 'camp_done' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                camp_offer: {
                    lines: [
                        ['npc', "Forty years on the roads, and I've never once waited for an inn. A carter carries his own hearth."],
                        ['npc', "Fire-pot, tripod, flint. I've a spare, but my wrist can't show you, so you'll fetch the tinder yourself."],
                        ['npc', "Juniper, from the bush up the slope. It catches wet, and it makes everything smell like smoked fish."]
                    ],
                    effects: [{ start: 'C2S2' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                camp_done: {
                    lines: [
                        [null, 'Hakon talks you through it one-handed: pot, coals, tripod, the juniper teased out thin. The spark takes the second time.'],
                        ['npc', "There: it's yours, so cook wherever you stop. It'll cook what the land around you cooks, mind; a pot has a sense of place."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                asta: {
                    lines: [
                        ['npc', "Asta, a weaver. Her man went to the Silent Field with a borrowed spear and a cloak she'd finished that morning."],
                        ['npc', "She could tell you every stitch of that cloak. His name she couldn't keep without the board, so every spring she read it with her thumbs."],
                        ['npc', "Ketil, eleventh from the top. I've said it for her since her eyes went."]
                    ],
                    choices: [{ text: 'Did you know the raiders?', to: 'raiders' }, { text: 'Goodbye.', end: true }]
                },
                raiders: {
                    lines: [
                        ['npc', "Knew one. Sold him a ewe last autumn; good lad, and his uncle's on that board."],
                        ['npc', "I don't understand people any more. I understand sheep."]
                    ],
                    choices: [{ text: 'Who was she?', to: 'asta' }, { text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Leif Ropehand, shipwright of Skeldvik
        leif: {
            name: 'Leif Ropehand', title: 'Shipwright',
            talk: [{ node: 'yard' }],
            nodes: {
                yard: {
                    lines: [['npc', "If it's passage, I build ships, I don't sail them. If it's money, I haven't any; if it's anything else, hold this end."]],
                    choices: [
                        { text: 'Eydis sent me. Who are the armed crews in the harbour?', if: { flags: ['eydis_harbor_met'], notFlags: ['leif_told'] }, to: 'crews' },
                        { text: 'Tell me about the crews again.', if: { flags: ['leif_told'] }, to: 'crews_again' },
                        { text: "Solveig says you owe her for cod. She wants your cooper's awl.", if: { quests: { C2S1: 'active' }, notFlags: ['leif_awl_lent'] }, to: 'awl' },
                        { text: 'What are you building?', to: 'ship' },
                        { text: 'There is a mark on the keel.', to: 'mark' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                awl: {
                    lines: [
                        [null, 'Leif looks at the cask under your arm, then at the narrow ship, then at the sky to see where the wind sits.'],
                        ['npc', "Wind's off the land tonight, so it'll blow out over the fjord and not up my yard. Here, take the awl."],
                        ['npc', "I never saw you, and I'll want it back without herring on it."]
                    ],
                    effects: [{ flag: 'leif_awl_lent' }, { event: { type: 'story', id: 'leif_awl' } }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                crews: {
                    lines: [
                        ['npc', "Wolf-Banner. Two ships since midsummer and a third coming, and they pay their mooring, which is the trouble."],
                        ['npc', "They paid me for that hull in hack-silver cut from southern plate, the old Crown's plate. I paid dues on that stamp for six years; I know it."],
                        ['npc', "I didn't ask where a northern war-chief gets it."]
                    ],
                    effects: [{ flag: 'leif_told' }, { event: { type: 'story', id: 'leif_crews' } }],
                    choices: [
                        { text: 'You took it anyway.', to: 'debt' },
                        { text: 'Thank you.', end: true }
                    ]
                },
                crews_again: {
                    lines: [['npc', "Wolf-Banner crews, paying in the old Crown's silver. That's all I know, and more than I wanted to."]],
                    choices: [{ text: 'You took it anyway.', to: 'debt' }, { text: 'Goodbye.', end: true }]
                },
                debt: {
                    lines: [
                        ['npc', "I owe three households, and a southern factor at Hrafnholm called Osric Vane, who counts on his fingers so you can watch him do it."],
                        ['npc', "He lends in the same old plate. Tell Eydis I took it anyway; she'll put it in a verse, and I'll deserve it."]
                    ],
                    effects: [{ flag: 'heard_of_osric' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                ship: {
                    lines: [['npc', "Twenty oars a side when she's done: oak keel, pine strakes, every plank split along the grain. A split plank bends; a sawn plank is a dead plank."]],
                    choices: [{ text: 'There is a mark on the keel.', to: 'mark' }, { text: 'Goodbye.', end: true }]
                },
                mark: {
                    lines: [
                        ['npc', "My brother's. He taught me the trade and went to the Silent Field."],
                        ['npc', "His name won't come to me any more, but my hands remember his mark. So he goes to sea on every keel I lay."]
                    ],
                    choices: [{ text: 'What are you building?', to: 'ship' }, { text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Solveig, who sells fish and notices things
        solveig: {
            name: 'Solveig', title: 'Fish-seller',
            talk: [{ node: 'stall' }],
            nodes: {
                stall: {
                    lines: [['npc', "Cod, dried, by the pair. Herring, salted, by the cask; opinions free."]],
                    choices: [
                        { text: 'Eydis says you miss nothing. Who split the memorial board?', if: { flags: ['eydis_harbor_met'], notFlags: ['solveig_told'] }, to: 'witness' },
                        { text: 'Tell me again what you saw.', if: { flags: ['solveig_told'] }, to: 'witness_again' },
                        shop('solveig'),
                        // Sour Herring (C2S1): offered once she has told you about the board.
                        { text: "You're smiling at that narrow ship. Why?", if: { flags: ['solveig_told'], quests: { C2S1: 'unseen' } }, to: 'prank_offer' },
                        { text: 'The cask is open. Their whole ship is weeping.', if: { quests: { C2S1: 'active' }, flags: ['herring_tapped'] }, to: 'prank_done' },
                        { text: 'What is that smell on your hands?', if: { quests: { C2S1: 'complete' } }, to: 'prank_after' },
                        { text: 'An opinion, then.', to: 'opinion' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                witness: {
                    lines: [
                        ['npc', "Four nights back, at the turn of the tide: three off the narrow ship, with a wedge and a mallet wrapped so it wouldn't ring."],
                        ['npc', "One carried the half-board under his cloak like a baby. When I shouted, he looked right at me and said, 'They'll thank us, mother.'"],
                        ['npc', "I'm not his mother. My son's name was on that half, and I can't say it without the board."]
                    ],
                    effects: [{ flag: 'solveig_told' }, { event: { type: 'story', id: 'solveig_witness' } }],
                    choices: [
                        { text: 'Did you tell Thora?', to: 'thora' },
                        { text: 'Thank you.', end: true }
                    ]
                },
                witness_again: {
                    lines: [['npc', "Three off the Wolf-Banner ship with a wedge and a muffled mallet, and that boy calling me mother. I hear him while I'm gutting."]],
                    choices: [{ text: 'Did you tell Thora?', to: 'thora' }, { text: 'Goodbye.', end: true }]
                },
                thora: {
                    lines: [['npc', "I told her, and she wrote it down. She has eight guards and they have sixty oars; writing it down is what she can do."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                prank_offer: {
                    lines: [
                        ['npc', "I can't fight sixty oars, and Thora can't either. But I've a cask of herring that's been souring since last spring."],
                        ['npc', "Surströmming, my mother called it. Tap it under their rowing benches, and they'll smell it until midwinter."],
                        ['npc', "Nobody gets hurt. Their pride, maybe, and their noses."]
                    ],
                    choices: [
                        { text: "Give me the cask.", effects: [{ start: 'C2S1' }, { item: 'Cask of Surströmming', key: 'item:c2s1_cask' }], to: 'prank_go' },
                        { text: 'Not today.', end: true }
                    ]
                },
                prank_go: {
                    lines: [
                        ['npc', "Don't open it here. You'll need an awl to tap it quietly: Leif has one, and he owes me for a winter of cod."],
                        ['npc', "Geir sits on the gangplank all day like a gull on a post. Get him off it somehow."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                prank_done: {
                    lines: [
                        [null, 'Solveig listens with her eyes shut, as if to music. Down the wharf, a man in a red cloak is being sick off the stern.'],
                        ['npc', "Ha! That's the first time I've laughed since midsummer."],
                        ['npc', "Here, take some for yourself, and some gravlax for the shock. It's good, I swear it."]
                    ],
                    effects: [{ event: { type: 'story', id: 'solveig_prank_done' } }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                prank_after: {
                    lines: [['npc', "Herring, and joy. Their crew have slept on the wharf for three nights, and Thora says there's no law against a smell."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                opinion: {
                    lines: [
                        ['npc', "The Jarl is careful and Redhand is angry, and folk here are tired of careful."],
                        ['npc', "That doesn't make him right. A man can be wrong and still be the only one saying what you feel."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Thora Half-Oar, harbour reeve
        thora: {
            name: 'Thora Half-Oar', title: 'Harbour reeve',
            talk: [{ if: { flags: ['tablet_with_reeve'] }, node: 'keeping' }, { if: { flags: ['tablet_decided'] }, node: 'after' }, { node: 'post' }],
            nodes: {
                post: {
                    lines: [
                        ['npc', "Harbour law is short: pay your mooring, keep your steel sheathed on the wharf, and ring the bell if you see fog before I do."],
                        ['npc', "You're on foot, so only two of those apply."]
                    ],
                    choices: [
                        { text: 'There are armed crews on your wharf.', to: 'crews' },
                        { text: 'Whose law is it?', to: 'law' },
                        { text: 'What is the bell for?', to: 'bell' },
                        { text: 'What is that smell on the wharf?', if: { flags: ['herring_tapped'] }, to: 'smell' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                smell: {
                    lines: [
                        ['npc', "Someone opened a cask of sour herring in the hold of the Wolf-Banner ship. Their crew sleep on the wharf now."],
                        ['npc', "There is no law against a smell; I checked, twice. I'm not looking for whoever did it, and I hope you aren't either."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                crews: {
                    lines: [
                        ['npc', "They've paid, and they've broken no law I can prove on the wharf. The board was cut at night, off the wharf."],
                        ['npc', "I know who did it. Knowing is not proving, and proving is not eight guards against sixty."]
                    ],
                    choices: [{ text: 'Whose law is it?', to: 'law' }, { text: 'What is the bell for?', to: 'bell' }, { text: 'Goodbye.', end: true }]
                },
                law: {
                    lines: [
                        ['npc', "The Jarl's. Ragnhild Frostmark has held Hrafnholm for twenty years, for a husband who marched to the Silent Field and never came back."],
                        ['npc', "No body, so no grave-ale, so no heir has ever taken Jarl Eirik's high seat. The law has been patient for twenty years."],
                        ['npc', "Redhand says a seat nobody has drunk the grave-ale for is an empty seat. The Lawspeaker says the Thing decides, and I say pay your mooring."]
                    ],
                    effects: [{ flag: 'heard_of_succession' }],
                    choices: [{ text: 'There are armed crews on your wharf.', to: 'crews' }, { text: 'What is the bell for?', to: 'bell' }, { text: 'Goodbye.', end: true }]
                },
                bell: {
                    lines: [
                        ['npc', "Fog, and late ships. Once a year we ring it forty-three times, once for each of Skeldvik's share of the six hundred."],
                        ['npc', "Put your hand on the rope if you like; everyone does. It brings you back, they say."]
                    ],
                    choices: [{ text: 'There are armed crews on your wharf.', to: 'crews' }, { text: 'Whose law is it?', to: 'law' }, { text: 'Goodbye.', end: true }]
                },
                keeping: {
                    lines: [
                        ['npc', "The Birkholt tablet is in the dues chest, under two locks and my bed."],
                        ['npc', "If the Jarl asks, I'll tell her I have it, and if Redhand asks, the same. Then we'll see what eight guards are worth."]
                    ],
                    choices: [{ text: 'Whose law is it?', to: 'law' }, { text: 'Goodbye.', end: true }]
                },
                after: {
                    lines: [['npc', "The skald says you can be trusted with things. I'd have locked it up myself, but I lock everything up; it's the job."]],
                    choices: [{ text: 'Whose law is it?', to: 'law' }, { text: 'What is the bell for?', to: 'bell' }, { text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Geir, steersman of the Wolf-Banner ship
        // The Wolf-Banner's own voice before Hrafnholm (lore doc 4.2: grieving families and opportunists, and
        // Torvald's grief is real). Optional: nothing in C2-02 waits on him.
        geir: {
            name: 'Geir', title: 'Wolf-Banner steersman',
            talk: [{ node: 'wharf' }],
            nodes: {
                wharf: {
                    lines: [['npc', "Mind the oars, stranger. You're the one who carried the Birkholt board down out of the pass."]],
                    choices: [
                        { text: 'Who are you people?', to: 'who' },
                        { text: "Your crew split Skeldvik's memorial board.", to: 'board' },
                        { text: "Who pays you in the old Crown's silver?", if: { flags: ['leif_told'] }, to: 'silver' },
                        // Sour Herring (C2S1): a mead and an honest toast, or a lie about the reeve.
                        { text: 'Drink with me. A mead, to the six hundred.', if: { quests: { C2S1: 'active' }, items: ['Mead'], notFlags: ['geir_distracted'] },
                            effects: [{ removeItem: 'Mead' }, { flag: 'geir_distracted' }, { flag: 'geir_toasted' }, { event: { type: 'story', id: 'geir_distracted' } }], to: 'toast' },
                        { text: 'Thora wants your mooring dues counted again. Now.', if: { quests: { C2S1: 'active' }, notFlags: ['geir_distracted'] },
                            effects: [{ flag: 'geir_distracted' }, { event: { type: 'story', id: 'geir_distracted' } }], to: 'dues' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                toast: {
                    lines: [
                        [null, 'Geir takes the horn and looks at it a long moment. Then he stands, and lifts it toward the memorial stone.'],
                        ['npc', "To the six hundred. And to my brother, whose name I can still say."],
                        ['npc', "That wasn't my wedge on your board, stranger; I steer. I'll drink this at the stern, out of the wind."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                dues: {
                    lines: [['npc', "Again? We paid her on the nail, but fine, I'll go and count it twice."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                who: {
                    lines: [
                        ['npc', "Torvald Redhand's crews. Half of us lost someone on the Silent Field, and Torvald lost his brother Arni."],
                        ['npc', "For twenty years the Jarl has said wait: wait for the law, wait for the gods, wait for spring. We've waited."]
                    ],
                    effects: [{ flag: 'wolfbanner_heard' }],
                    choices: [
                        { text: "Your crew split Skeldvik's memorial board.", to: 'board' },
                        { text: "Who pays you in the old Crown's silver?", if: { flags: ['leif_told'] }, to: 'silver' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                board: {
                    lines: [
                        ['npc', "We took it to keep it. Redhand is gathering every name, so that when he goes to the Field, nobody gets left behind."],
                        ['npc', "Ask the fish-seller whether she'd rather it rotted on a stone. Then ask her if she'd like her son home."]
                    ],
                    effects: [{ flag: 'wolfbanner_heard' }],
                    choices: [
                        { text: 'Home how?', to: 'how' },
                        { text: "Who pays you in the old Crown's silver?", if: { flags: ['leif_told'] }, to: 'silver' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                how: {
                    lines: [['npc', "I don't know, and I don't ask. Redhand has never lied to us, which is more than I can say for the hall."]],
                    choices: [{ text: "Who pays you in the old Crown's silver?", if: { flags: ['leif_told'] }, to: 'silver' }, { text: 'Goodbye.', end: true }]
                },
                silver: {
                    lines: [
                        ['npc', "Silver is silver. Redhand has friends in the south who say they remember how well the North fought."],
                        ['npc', "I don't love them. I love my brother more than I hate them."]
                    ],
                    effects: [{ flag: 'wolfbanner_heard' }, { flag: 'southern_friends_heard' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },

        // ============================================================= The Hrimvald kitchen (Tokelo, 2026-11-13)
        // Aslaug keeps the bar at the Stormtide Inn: mead to buy, and mead to brew with her. She stands at the inn door
        // until the inn's own hall is built (thread "Add an enterable meeting hall in Skeldvik"), then moves inside.
        aslaug: {
            name: 'Aslaug', title: 'Alewife of the Stormtide Inn',
            talk: [{ node: 'bar' }],
            nodes: {
                bar: {
                    lines: [['npc', "Mead, ale, or a seat by the fire? The mead's from my own casks; the fire's free, and so is the gossip."]],
                    choices: [
                        shop('aslaug'),
                        ...cook('meadery'), ...recipeBook('meadery'),
                        { text: 'How do you make mead?', to: 'mead' },
                        { text: "What's good to eat around here?", to: 'food' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                mead: {
                    lines: [
                        ['npc', "Honey, water and time. Bring me two crocks of honey and I'll brew it with you."],
                        ['npc', "Lingonberries make it red, and sharper."],
                        ['npc', "Barley and juniper make ale. Mind yourself: five horns inside an hour and the floor starts to tilt."]
                    ],
                    choices: [{ text: "What's good to eat around here?", to: 'food' }, { text: 'Goodbye.', end: true }]
                },
                food: {
                    lines: [
                        ['npc', "Solveig's fish, smoked or cured. Gudrun up at Hrafnholm sells mutton and skyr."],
                        ['npc', "Lingonberries grow on every fell and juniper in the pass. Cloudberries hide on the high bogs, if you can find them."],
                        ['npc', "The harbour cookfire by the racks is anyone's. Don't let Solveig talk you into the sour herring indoors."]
                    ],
                    choices: [{ text: 'How do you make mead?', to: 'mead' }, { text: 'Goodbye.', end: true }]
                }
            }
        },
        // Gudrun sells from the market stalls in Hrafnholm: her own mutton, dairy, flour and roots.
        gudrun: {
            name: 'Gudrun', title: 'Sheep-farmer',
            talk: [{ node: 'stall' }],
            nodes: {
                stall: {
                    lines: [['npc', "Mutton from my own fell, skyr from my own cows, and I came down for the Thing like everyone. Buy something, so the walk was worth it."]],
                    choices: [
                        shop('gudrun'),
                        { text: 'What do people cook here?', to: 'cook' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                cook: {
                    lines: [
                        ['npc', "Fårikål: mutton and cabbage, a fistful of pepper, and all day in the pot. Roast mutton under lingonberries, for a feast."],
                        ['npc', "And rømmegrøt when it's cold, which is always. The feast fire by the tables cooks anything, if you ask it nicely."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        harbour_cookfire: hearth('Harbour cookfire', 'Skeldvik',
            'A fire pit by the fish racks, ringed with stones, a pot on a chain and juniper on the coals for smoking. Anyone may cook here.', 'hrimvald'),
        feast_fire: hearth('Feast fire', 'Hrafnholm',
            'The fire beside the feast tables, fed day and night while the households are in for the Thing. The cooks wave you to it.', 'hrimvald'),
        // Hakon's camp kit (C2S2): opened by using the Camp Kit item. It cooks the dishes of the region you stand in.
        camp_hearth: { ...hearth('Your camp', 'Camp kit',
            "A fire-pot on the ground, Hakon's tripod over it and the pot on its chain. It cooks what the land around you cooks.", 'here'), portable: true },
        // Sour Herring (C2S1): the narrow ship's gangplank, once Geir has left it.
        herring_hatch: {
            name: 'Gangplank', title: 'The Wolf-Banner ship',
            talk: [{ if: { flags: ['herring_tapped'] }, node: 'after' }, { if: { notFlags: ['geir_distracted'] }, node: 'watched' }, { node: 'plank' }],
            nodes: {
                watched: {
                    lines: [[null, 'Geir sits on the plank with his boots across it, whittling. Nobody is getting past him without being seen.']],
                    choices: [{ text: 'Leave it.', end: true }]
                },
                plank: {
                    lines: [[null, "The plank is clear. Below the rowing benches, out of the wind, there's room for one small cask."]],
                    choices: [
                        { text: 'Tap the cask and leave it under the benches.', if: { items: ['Cask of Surströmming'], flags: ['leif_awl_lent'] },
                            effects: [{ removeItem: 'Cask of Surströmming' }, { flag: 'herring_tapped' }, { event: { type: 'story', id: 'herring_tapped' } }], to: 'tapped' },
                        { text: "You'd need an awl to tap it quietly.", if: { notFlags: ['leif_awl_lent'] }, stay: true, effects: [{ say: 'Leif Ropehand has one. Solveig says he owes her.' }] },
                        { text: 'Leave it.', end: true }
                    ]
                },
                tapped: {
                    lines: [
                        [null, 'The awl goes in with a soft pop. The smell comes out like something that has been waiting a year to be let out.'],
                        [null, 'You are back on the wharf before your eyes stop watering. Behind you: a shout, a splash, and a great deal of coughing.']
                    ],
                    choices: [{ text: 'Walk away. Do not run.', end: true }]
                },
                after: {
                    lines: [[null, 'The crew have hung their bedrolls on the wharf rail and sleep in the open; nobody goes below.'], [null, 'A gull lands on the rail, thinks better of it, and leaves.']],
                    choices: [{ text: 'Leave it.', end: true }]
                }
            }
        },

        // ============================================================= Hrafnholm (C2-03; review doc section 4)
        // Voices: Ragnhild careful and tired, Torvald hot and grieving, Sigrun dry, Runa loyal, Arnkel exact, Osric smooth.
        ragnhild: {
            name: 'Ragnhild Frostmark', title: 'Jarl of Hrafnholm',
            talk: [
                { if: { flags: ['tablet_with_reeve'], notFlags: ['ragnhild_met'] }, node: 'meet_reeve' },
                { if: { flags: ['tablet_with_eydis'], notFlags: ['ragnhild_met'] }, node: 'meet_eydis' },
                { if: { flags: ['tablet_kept'], notFlags: ['ragnhild_met'] }, node: 'meet_kept' },
                { if: { notFlags: ['ragnhild_met'] }, node: 'meet' },
                { if: { flags: ['thing_backed_ragnhild'] }, node: 'after_backed' },
                { if: { flags: ['thing_backed_torvald'] }, node: 'after_redhand' },
                { if: { flags: ['thing_asked_inquiry'] }, node: 'after_inquiry' },
                { node: 'again' }
            ],
            nodes: {
                meet_reeve: {
                    lines: [
                        ['npc', "Thora wrote to me about you. A stranger who handed a dead woman's board to the law, and not to the loudest voice in the room."],
                        ['npc', "I am Ragnhild Frostmark. I have held this hall for twenty winters, for a husband who did not come home."]
                    ],
                    effects: [{ flag: 'ragnhild_met' }, { event: { type: 'story', id: 'ragnhild_met' } }],
                    choices: RAGNHILD
                },
                meet_eydis: {
                    lines: [
                        ['npc', "You gave the Birkholt board to a skald and not to this hall. I would like to know why a foreigner trusts a song over a law."],
                        ['npc', "I am Ragnhild Frostmark. Eydis will read it at the Thing, and I will stand there and listen."]
                    ],
                    effects: [{ flag: 'ragnhild_met' }, { event: { type: 'story', id: 'ragnhild_met' } }],
                    choices: RAGNHILD
                },
                meet_kept: {
                    lines: [
                        ['npc', "They tell me you still carry the Birkholt board. I am Ragnhild Frostmark, and I ask you for it, formally, in front of my hall."],
                        ['npc', "You may say no. Here a thing is not taken from a guest, it is asked for."]
                    ],
                    effects: [{ flag: 'ragnhild_met' }, { event: { type: 'story', id: 'ragnhild_met' } }],
                    choices: RAGNHILD
                },
                meet: {
                    lines: [
                        ['npc', "You're the southerner who came up from Skeldvik. I am Ragnhild Frostmark, and I have held this hall for twenty winters."]
                    ],
                    effects: [{ flag: 'ragnhild_met' }, { event: { type: 'story', id: 'ragnhild_met' } }],
                    choices: RAGNHILD
                },
                again: {
                    lines: [['npc', "The Thing sits when the Lawspeaker calls it. Until then you are a guest of this hall, and you eat at its tables."]],
                    choices: RAGNHILD
                },
                after_backed: {
                    lines: [['npc', "There is a bench for you at my table, guest, the third from the fire. That is closer than most of my cousins get."]],
                    choices: RAGNHILD
                },
                after_redhand: {
                    lines: [['npc', "You stood on the Redhand's side of the ring. You may still eat at my tables; I punish noise, not honesty."]],
                    choices: RAGNHILD
                },
                after_inquiry: {
                    lines: [['npc', "You asked for a witness and were given the job. That is how the Thing works, and why nobody asks."]],
                    choices: RAGNHILD
                },
                seat: {
                    lines: [
                        ['npc', "Eirik's seat. My husband marched to the Silent Field with six hundred, and nobody has drunk his grave-ale, so nobody may sit there."],
                        ['npc', "No body, no grave-ale. No grave-ale, no heir: that is our law, and it has held this hall together."]
                    ],
                    choices: RAGNHILD
                },
                law: {
                    lines: [
                        ['npc', "This is the twentieth winter. Under the old law a person missing twenty winters may be declared dead, and their grave-ale drunk."],
                        ['npc', "I will ask the Thing to let us bury them. Six hundred households have waited long enough to mourn."]
                    ],
                    choices: RAGNHILD
                },
                law_known: {
                    lines: [
                        ['npc', "Then Thora told you the truth, which she always does, and at length."],
                        ['npc', "I will ask the Thing to let us bury them. Six hundred households have waited long enough to mourn."]
                    ],
                    choices: RAGNHILD
                },
                redhand: {
                    lines: [
                        ['npc', "Torvald thinks I want to forget them. His brother Arni marched with Eirik, and he wants to go out there and bring them home."],
                        ['npc', "I want that too. I have wanted it every night for twenty years, and wanting is not a law."]
                    ],
                    choices: RAGNHILD
                }
            }
        },
        // ------------------------------------------------------------- Torvald Redhand, the Wolf-Banner
        torvald: {
            name: 'Torvald Redhand', title: 'Wolf-Banner',
            talk: [
                { if: { flags: ['ulfrun_beaten'], notFlags: ['torvald_met'] }, node: 'meet_ulfrun' },
                { if: { notFlags: ['torvald_met'] }, node: 'meet' },
                { if: { flags: ['thing_backed_ragnhild'] }, node: 'after_hall' },
                { if: { flags: ['thing_backed_torvald'] }, node: 'after_backed' },
                { if: { flags: ['thing_asked_inquiry'] }, node: 'after_inquiry' },
                { node: 'again' }
            ],
            nodes: {
                meet_ulfrun: {
                    lines: [
                        ['npc', "Ulfrun says you put her down in the pass and let her walk away. I am Torvald Redhand, and I don't forget a thing like that."],
                        ['npc', "Those were my crews on the road. I won't pretend otherwise."]
                    ],
                    effects: [{ flag: 'torvald_met' }, { event: { type: 'story', id: 'torvald_met' } }],
                    choices: TORVALD
                },
                meet: {
                    lines: [
                        ['npc', "So you're the one with the Birkholt board. I am Torvald Redhand, and before you ask, yes, those were my crews."],
                        ['npc', "Ask the hall what it has done for the six hundred in twenty years. It has counted them."]
                    ],
                    effects: [{ flag: 'torvald_met' }, { event: { type: 'story', id: 'torvald_met' } }],
                    choices: TORVALD
                },
                again: {
                    lines: [['npc', "The Thing sits soon. Stand where you like, southerner, but stand somewhere."]],
                    choices: TORVALD
                },
                after_hall: {
                    lines: [['npc', "You handed the Jarl her spade. I'll still drink with you, southerner, but I won't tell you anything."]],
                    choices: TORVALD
                },
                after_backed: {
                    lines: [['npc', "My crews know your face now. Walk where you like among them, and if anyone asks, you're with the Redhand."]],
                    choices: TORVALD
                },
                after_inquiry: {
                    lines: [['npc', "A witness. Fine: go and look, and when you've seen that field, come back and tell me they're dead."]],
                    choices: TORVALD
                },
                boards: {
                    lines: [
                        ['npc', "Because Ragnhild means to read them out at the Thing and bury every name on them. You can't bury a man who isn't dead."],
                        ['npc', "When I go to the Field I'm taking all six hundred names with me. Nobody gets left behind."]
                    ],
                    choices: TORVALD
                },
                arni: {
                    lines: [
                        ['npc', "My little brother. He was nineteen, and he wanted Eirik's eye on him so badly he walked in the front rank."],
                        ['npc', "There were no bodies on that field. Think about what that means before you call him dead."]
                    ],
                    choices: TORVALD
                },
                silver: {
                    lines: [
                        ['npc', "Friends in the south, who remember how the North fought. Ask me again at the Thing if you want it said in front of everyone."],
                        ['npc', "You'll get the same answer."]
                    ],
                    choices: TORVALD
                }
            }
        },
        // ------------------------------------------------------------- Sigrun Frostmark, the heir who won't be
        sigrun: {
            name: 'Sigrun Frostmark', title: "The Jarl's daughter",
            talk: [{ if: { flags: ['thing_heard'] }, node: 'after' }, { node: 'memorial' }],
            nodes: {
                memorial: {
                    lines: [
                        ['npc', "My father's name is on the middle board, top row, cut by someone who spelled it wrong. I've never asked them to mend it."],
                        ['npc', "I'm Sigrun. Everyone will tell you I'm the heir; please don't."]
                    ],
                    choices: [{ text: 'What do you want from the Thing?', to: 'want' }, { text: 'Goodbye.', end: true }]
                },
                after: {
                    lines: [['npc', "I said 'hear them', and my mother looked at me as if I'd drawn a knife. Best day I've had in years."]],
                    choices: [{ text: 'What do you want from the Thing?', to: 'want' }, { text: 'Goodbye.', end: true }]
                },
                want: {
                    lines: [
                        ['npc', "To be chosen, if I'm chosen at all. Not to inherit a seat because my mother finally held a funeral."],
                        ['npc', "Make me jarl over a cup of grave-ale and I'll be Eirik's daughter for the rest of my life."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Runa Hallvardsdottir, sworn to Sigrun
        runa: {
            name: 'Runa Hallvardsdottir', title: 'Sworn to Sigrun',
            talk: [{ node: 'meet' }],
            nodes: {
                meet: {
                    lines: [['npc', "Runa Hallvardsdottir, sworn to Sigrun. If you've come to look at her, look at the memorial instead; she's tired of it."]],
                    choices: [{ text: 'Your father was at the Silent Field?', if: { flags: ['heard_of_hallvard'] }, to: 'father' }, { text: 'Goodbye.', end: true }]
                },
                father: {
                    lines: [
                        ['npc', "He's the only one who walked off it. He was Eirik's skald, and he hasn't sung a note since."],
                        ['npc', "He keeps the barrow out on the fells now. When I ask him what he saw, he asks me if I've eaten."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Arnkel the Lawspeaker, and the Thing (C2-03)
        // The Thing is spoken through Arnkel: he blows the horn, and the assembly's voices (Ragnhild, Torvald, Eydis, Sigrun,
        // Ulfrun) speak in his conversation. Review doc 4.4: three first positions, and whichever you take the Thing says
        // "not yet" and makes you its witness, so the main road (C2-04 on) never closes.
        arnkel: {
            name: 'Arnkel the Lawspeaker', title: 'Lawspeaker',
            talk: [
                { if: { flags: ['thing_heard'] }, node: 'after' },
                { if: { flags: ['thing_sat'] }, node: 'resume' },
                { if: { quests: { C203: 'active' }, flags: ['ragnhild_met', 'torvald_met'] }, node: 'call' },
                { node: 'meet' }
            ],
            nodes: {
                meet: {
                    lines: [
                        ['npc', "Arnkel, Lawspeaker. I say the law at this rock, all of it, from memory, and I take no sides, so there's no use offering me one."],
                        ['npc', "The Thing sits when the households are in. Not long now."]
                    ],
                    choices: [
                        { text: 'What is the law of twenty winters?', to: 'twenty' },
                        { text: 'Who may speak at the Thing?', to: 'speak' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                twenty: {
                    lines: [
                        ['npc', "Whoever is missing twenty winters, the Thing may declare dead, and then their grave-ale may be drunk and their goods divided."],
                        ['npc', "May, not must. Everything in this town is going to turn on that one word."]
                    ],
                    choices: [{ text: 'Who may speak at the Thing?', to: 'speak' }, { text: 'Goodbye.', end: true }]
                },
                speak: {
                    lines: [['npc', "Any free person with a claim, and any guest the Thing agrees to hear. You'll have to be heard, southerner, before you're listened to."]],
                    choices: [{ text: 'What is the law of twenty winters?', to: 'twenty' }, { text: 'Goodbye.', end: true }]
                },
                call: {
                    lines: [
                        ['npc', "The households are in and the benches are full. You've stood in front of the Jarl and the Redhand both, which is more than most guests manage."],
                        ['npc', "When I blow the horn, the Thing sits. Once it sits, it does not rise until it has heard every claim."]
                    ],
                    choices: [
                        { text: 'Blow the horn.', effects: [{ flag: 'thing_sat' }, { event: { type: 'story', id: 'thing_sits' } }], to: 'open' },
                        { text: 'What is the law of twenty winters?', to: 'twenty' },
                        { text: 'Not yet.', end: true }
                    ]
                },
                // Came back mid-assembly (a load, a closed window): the Thing is still sitting, and the guest is still to speak.
                resume: {
                    lines: [['npc', "The Thing is still sitting, guest, and it is waiting for you."]],
                    choices: [
                        { text: 'Step into the ring.', if: { notFlags: POSITIONS }, to: 'stand' },
                        { text: 'Hear the verdict.', if: { any: POSITIONS.map((f) => ({ flags: [f] })) }, to: 'verdict' }
                    ]
                },
                open: {
                    lines: [
                        [null, 'The horn goes twice across the town, and the households come down the benches into the ring.'],
                        [null, "The hall's banners on the west, the free farmers' on the east, and the red wolf among them."],
                        [null, 'Six hundred places on the benches stay empty. Nobody sits in them, and nobody has to be told.'],
                        ['npc', "This is the twentieth winter since the Silent Field. Under the law of twenty winters the Jarl has a claim, and the Thing will hear it."],
                        ['ragnhild', "I ask the Thing to declare the six hundred dead. Let us drink their grave-ale, settle what has waited, and let their widows mourn like widows."],
                        ['ragnhild', "I ask it for Eirik too. I have set his bowl at my table for twenty winters, and I would like to put it away."]
                    ],
                    choices: [{ text: 'Listen.', to: 'redhand' }]
                },
                redhand: {
                    lines: [
                        ['torvald', "And I say no. You can't drink the grave-ale of a man who isn't dead, and there wasn't one body on that field."],
                        ['torvald', "Give me the summer and every board in the North. I'll march to the Silent Field and bring them home, or come back and tell you why not."],
                        ['ragnhild', "With whose spears, Torvald? No host leaves this hall again without the law and the families behind it."],
                        [null, 'Half the benches shout for him. The other half shout at him, and some of them are the same people.']
                    ],
                    choices: [
                        { text: 'Listen.', if: { flags: ['tablet_with_eydis'] }, to: 'board_eydis' },
                        { text: 'Listen.', if: { flags: ['tablet_with_reeve'] }, to: 'board_reeve' },
                        { text: 'Listen.', if: { flags: ['tablet_kept'] }, to: 'board_kept' },
                        { text: 'Listen.', if: { notFlags: ['tablet_with_eydis', 'tablet_with_reeve', 'tablet_kept'] }, to: 'board_roll' }
                    ]
                },
                // Eydis reads the Birkholt board, wherever the stranger left it (C2-02's choice; review doc section 5).
                // Names live in wood: read off the board, a name comes back to someone who had lost it (bible 4.1, seeded only).
                board_eydis: {
                    lines: [
                        ['eydis', "Before the Thing decides who is dead, it can hear who they were. This is Birkholt's board, and a Wolf-Banner crew tipped a dead woman out of her wagon for it."],
                        [null, 'She reads all forty names, slowly, one breath each.'],
                        [null, "At the eleventh, a woman on the farmers' bench says 'Ketil' a beat after Eydis does, as if she had only just remembered."],
                        ['ulfrun', 'My brother is the twenty-third. Read him again.'],
                        [null, 'Eydis does. Nobody on either bench says a word until she has finished.']
                    ],
                    choices: [{ text: 'Go on.', to: 'guest' }]
                },
                board_reeve: {
                    lines: [
                        [null, "Two of Thora's guards carry a locked chest into the ring. Arnkel opens it with the reeve's key and lifts out Birkholt's board."],
                        ['npc', "Evidence held under the harbour's law, and brought here unopened. The Thing will hear its names."],
                        [null, "He reads the forty in the voice he uses for the law. At the eleventh, a woman on the farmers' bench says 'Ketil' a beat after him."],
                        ['eydis', "So the hall reads its own evidence now. At least it's read."]
                    ],
                    choices: [{ text: 'Go on.', to: 'guest' }]
                },
                board_kept: {
                    lines: [
                        ['eydis', "The stranger carries Birkholt's board, and stands with me. Hold it up, so the Thing can see I'm not making these names up."],
                        [null, 'You hold up the board, and Eydis reads it off the wood, all forty, one breath each.'],
                        [null, "At the eleventh, a woman on the farmers' bench says 'Ketil' a beat after her, as if she had only just remembered."],
                        ['ulfrun', "We'd have bought that board off you, southerner. I'm glad now that you wouldn't sell."],
                        ['ragnhild', 'The hall still asks for it, formally. Keep it until the Thing has finished; then we will talk.']
                    ],
                    choices: [{ text: 'Go on.', to: 'guest' }]
                },
                board_roll: {
                    lines: [
                        ['eydis', "I have the Roll, if not every board. Before the Thing decides who is dead, it can hear who they were."],
                        [null, "She reads Birkholt's forty from her book, slowly, one breath each."],
                        [null, "At the eleventh, a woman on the farmers' bench says 'Ketil' a beat after Eydis does, as if she had only just remembered."]
                    ],
                    choices: [{ text: 'Go on.', to: 'guest' }]
                },
                guest: {
                    lines: [
                        ['npc', "The Thing has heard the Jarl and the Redhand. The stranger who came down the Frostspine with the Birkholt board asks to be heard."],
                        ['npc', 'Will the Thing hear a guest?'],
                        [null, "A long silence. Then Sigrun Frostmark, on the hall's bench, says 'Hear them,' just loudly enough that it would be rude not to."],
                        ['sigrun', 'My mother and the Redhand have had twenty years to say this. Let somebody new say it badly.']
                    ],
                    choices: [{ text: 'Step into the ring.', to: 'stand' }]
                },
                stand: {
                    lines: [[null, 'The ring goes quiet. Ragnhild on the west, Torvald on the east, Arnkel at the law rock between them, and every empty place watching you.']],
                    choices: [
                        // What Skeldvik told you can be said here, in front of everyone (review doc section 5). Never required.
                        { text: 'Ask Torvald, in front of everyone, where his silver comes from.', if: { flags: ['southern_friends_heard', 'leif_told'], notFlags: ['thing_silver_asked'] },
                            effects: [{ flag: 'thing_silver_asked' }], to: 'silver' },
                        { text: 'Ask Torvald how old Arni was when he marched.', if: { flags: ['wolfbanner_heard'], notFlags: ['thing_arni_asked'] },
                            effects: [{ flag: 'thing_arni_asked' }], to: 'arni' },
                        { text: 'Stand with the Jarl: let the families bury them.', effects: [{ flag: 'thing_backed_ragnhild' }], to: 'pos_ragnhild' },
                        { text: 'Stand with Torvald: nobody is dead until someone has looked.', effects: [{ flag: 'thing_backed_torvald' }], to: 'pos_torvald' },
                        { text: 'Ask the Lawspeaker to hold the verdict until someone has seen the Field.', effects: [{ flag: 'thing_asked_inquiry' }], to: 'pos_inquiry' }
                    ]
                },
                silver: {
                    lines: [
                        [null, "At the edge of the farmers' bench, a man in a southern coat stops counting on his fingers."],
                        ['torvald', "Friends in the south, who remember how the North fought. I said I'd say it in front of everyone, and I have."],
                        ['ragnhild', "Friends who pay in the old Crown's plate. The Thing will remember that you said it, Torvald."]
                    ],
                    choices: [{ text: 'Go on.', to: 'stand' }]
                },
                arni: {
                    lines: [
                        ['torvald', 'Nineteen. He walked in the front rank, because he wanted Eirik to see him do it.'],
                        ['torvald', "I was fourteen, and too young to march. I've been old enough every day since."],
                        [null, 'Nobody shouts for a while after that, on either bench.']
                    ],
                    choices: [{ text: 'Go on.', to: 'stand' }]
                },
                pos_ragnhild: {
                    lines: [
                        ['ragnhild', 'Thank you. A hard thing is easier to say when a stranger has said it first.'],
                        ['torvald', 'So the south wants them buried too. Remember who handed you the spade, Jarl.'],
                        [null, "The Birkholt families on the farmers' bench nod, slowly. Ulfrun gets up and walks out of the ring."]
                    ],
                    choices: [{ text: 'Wait for the Lawspeaker.', to: 'verdict' }]
                },
                pos_torvald: {
                    lines: [
                        ['torvald', "There, a stranger with eyes. They aren't dead until somebody has gone and looked."],
                        ['ragnhild', 'Then you have chosen your bench, guest. The hall will still feed you; it will not listen to you as closely.'],
                        [null, 'The red cloaks on the east bench stamp on the stone until Arnkel lifts his staff.']
                    ],
                    choices: [{ text: 'Wait for the Lawspeaker.', to: 'verdict' }]
                },
                pos_inquiry: {
                    lines: [
                        ['npc', 'A guest asks the Thing not to decide what it cannot see. That is a lawful request, and an old one.'],
                        ['eydis', "Somebody should look before anyone is buried or brought home. I'd like it to be someone who doesn't need either answer."],
                        ['sigrun', "That's the first sensible thing anyone has said today."],
                        [null, "Ragnhild says nothing. Torvald laughs once, without much in it, and doesn't argue."]
                    ],
                    choices: [{ text: 'Wait for the Lawspeaker.', to: 'verdict' }]
                },
                verdict: {
                    lines: [
                        ['npc', 'Hear the Thing. The law of twenty winters says may, not must, and today the Thing says not yet.'],
                        ['npc', "The six hundred are not declared dead this summer. And no host marches to the Silent Field without the Thing's word."],
                        ['npc', 'Name boards and iron are going missing from the North together, and the iron goes through Járnmyr.'],
                        ['npc', 'The guest who carried the Birkholt board will follow both, as the Thing\'s witness, and say here what they find.'],
                        [null, 'The horn goes once. The Thing rises.']
                    ],
                    choices: [{ text: 'Leave the ring.', effects: [{ event: { type: 'story', id: 'thing_position' } }], end: true }]
                },
                after: {
                    lines: [['npc', "The Thing's witness. Come to the rock when you have something, and say it plainly; the law has no ear for adjectives."]],
                    choices: [
                        { text: "Orm's oath-stick, for the Green Pine land.", if: { quests: { 'C2-S02': 'active' }, flags: ['oath_stick_read'] }, to: 'oath_case' },
                        { text: 'What is the law of twenty winters?', to: 'twenty' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                // C2-S02 The Price of an Oath: the case is put to the rock, and the guest says how it should go.
                oath_case: {
                    lines: [
                        [null, 'Arnkel turns the stick over twice, and runs his thumb along the second row of cuts.'],
                        ['npc', "The old Lawspeaker's hand, and a sworn oath: Hild holds the land, in Orm's name. Kolgrim says he holds it in Orm's name too."],
                        ['npc', 'The law can read it either way, so the law will hear a witness. How should the Green Pine land be held?']
                    ],
                    choices: [
                        { text: 'Hild holds it, as Orm swore.', effects: [{ flag: 'oath_for_hild' }], to: 'oath_ruled' },
                        { text: 'Kolgrim keeps it until someone has seen the Field.', effects: [{ flag: 'oath_for_kolgrim' }], to: 'oath_ruled' },
                        { text: "Hild holds it in Orm's name, and Kolgrim farms the upper field.", effects: [{ flag: 'oath_shared' }], to: 'oath_ruled' }
                    ]
                },
                oath_ruled: {
                    lines: [['npc', "So it's said, and so I'll cut it. Neither of them will thank you; that's usually how you know it was the law."]],
                    choices: [{ text: 'Goodbye.', effects: [{ event: { type: 'story', id: 'oath_judged' } }], end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Osric Vane, a southern factor (the Broken Oath's money, hidden)
        osric: {
            name: 'Osric Vane', title: 'Factor',
            talk: [{ if: { flags: ['heard_of_osric'] }, node: 'known' }, { node: 'meet' }],
            nodes: {
                meet: {
                    lines: [
                        ['npc', "Osric Vane, factor, at your service and at everyone else's. I buy wool and amber, and sell the North what it forgets it needs."],
                        ['npc', "Hrafnholm is a fine place to do business in a bad year. Everyone owes someone."]
                    ],
                    choices: OSRIC
                },
                known: {
                    lines: [
                        ['npc', "You've heard my name already, I can see it. Leif Ropehand, I expect: he owes me and hates it, which is the usual arrangement."],
                        ['npc', "Osric Vane, factor. I lend, I buy, I keep accounts."]
                    ],
                    choices: OSRIC
                },
                south: {
                    lines: [['npc', "The south, which is a large place. I go where coin is thin and need is thick."]],
                    choices: OSRIC
                },
                // C2-S04 The Fisherman's Debt. Osric is the Broken Oath's money (review doc 4.2, hidden): he backs off from
                // anyone who says "the old Crown's plate" in a town full of people about to sit at the Thing.
                debt: {
                    lines: [
                        ['npc', "Bersi owes me thirty in silver, for a mast and a winter's cargo. I lent in good faith, and I'll take his ship in the same spirit."],
                        ['npc', "Pay it for him, if you like. I'm not particular whose purse it comes from."]
                    ],
                    effects: [{ event: { type: 'story', id: 'debt_osric' } }],
                    choices: [
                        { text: 'Pay the thirty. (30 Gold)', if: { gold: 30 },
                            effects: [{ pay: 30 }, { flag: 'debt_paid' }, { event: { type: 'story', id: 'debt_settled' } }], to: 'paid' },
                        { text: "You lend in the old Crown's plate. Should the Thing hear about that?", if: { flags: ['leif_told'] },
                            effects: [{ flag: 'debt_leaned' }, { flag: 'osric_wary' }, { event: { type: 'story', id: 'debt_settled' } }], to: 'leaned' },
                        { text: "I'll think about it.", end: true }
                    ]
                },
                paid: {
                    lines: [['npc', "A pleasure. I'll send his paper down with the next cart; tell him to mind the ice."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                leaned: {
                    lines: [
                        [null, "Osric smiles with his mouth, and counts something on his fingers that isn't money."],
                        ['npc', "The spring fair, then. Tell Bersi I'm a patient man; it's true more often than people think."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- Ulfrun Grey-Mantle, at the Thing among the Wolf-Banner
        // Beaten in the gap, not killed (C2-01), she remembers it (review doc section 5, `ulfrun_beaten`).
        ulfrun: {
            name: 'Ulfrun Grey-Mantle', title: 'Wolf-Banner',
            talk: [
                { if: { flags: ['thing_backed_ragnhild'] }, node: 'after_hall' },
                { if: { flags: ['thing_backed_torvald'] }, node: 'after_backed' },
                { if: { flags: ['thing_asked_inquiry'] }, node: 'after_inquiry' },
                { node: 'meet' }
            ],
            nodes: {
                meet: {
                    lines: [
                        ['npc', "You. You put me down in the gap and let me walk off the mountain."],
                        ['npc', "I've been trying to work out why for a week. Redhand says it's southern manners."]
                    ],
                    choices: [{ text: 'Your brother is on the Birkholt board?', to: 'brother' }, { text: 'Goodbye.', end: true }]
                },
                brother: {
                    lines: [
                        ['npc', "Twenty-third from the top. I can say his name with my thumb on the board, and not otherwise."],
                        ['npc', "So we take the boards. If the hall burns them at a grave-ale, who is going to remember him?"]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                after_hall: {
                    lines: [
                        ['npc', "You told them to bury him. I walked out, so I didn't hear the rest."],
                        ['npc', "I'm not angry. I just wanted one person in that ring to say no who wasn't a Redhand."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                after_backed: {
                    lines: [['npc', "'Nobody is dead until someone has looked.' I'm going to have that cut on my shield."]],
                    choices: [{ text: 'Your brother is on the Birkholt board?', to: 'brother' }, { text: 'Goodbye.', end: true }]
                },
                after_inquiry: {
                    lines: [['npc', "A witness, then. When you've seen the Field, tell me first, before you tell the hall."]],
                    choices: [{ text: 'Your brother is on the Birkholt board?', to: 'brother' }, { text: 'Goodbye.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- C2-S02 The Price of an Oath: Hild, Kolgrim, the stick
        // Orm of the Green Pine marched with the six hundred. Names live in wood: neither his wife nor his brother can say
        // his name without his board, so the stick is the first place the player reads it.
        hild: {
            name: 'Hild', title: 'Of the Green Pine',
            talk: [
                { if: { quests: { 'C2-S02': 'complete' } }, node: 'done' },
                { if: { quests: { 'C2-S02': 'active' } }, node: 'waiting' },
                { if: { flags: ['thing_heard'] }, node: 'case' },
                { node: 'before' }
            ],
            nodes: {
                before: {
                    lines: [['npc', "After the Thing, stranger. Everyone in this town is waiting for the Thing, and I've been waiting longest."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                case: {
                    lines: [
                        ['npc', "The Thing said not yet. I've heard 'not yet' for twenty winters, and my daughter marries at midsummer with no land to bring."],
                        ['npc', "My husband swore something before he marched. I remember that he did, and not what; I can't even say his name without the board."],
                        ['npc', "His brother Kolgrim holds our land 'for him', and won't let me sell a sheep. Will you hear us both?"]
                    ],
                    choices: [
                        { text: "I'll hear you both.", effects: [{ start: 'C2-S02' }], to: 'go' },
                        { text: 'Not now.', end: true }
                    ]
                },
                go: {
                    lines: [
                        ['npc', "Kolgrim drills with the Redhand's crews in the Training Yard."],
                        ['npc', "The old Lawspeaker cut every oath on a stick before the host marched. They're on the table in the hall, if anyone kept them."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                waiting: {
                    lines: [['npc', "Have you heard him yet? He'll tell you he's holding it for his brother, and he's been holding it for twenty years."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                done: {
                    lines: [['npc', "Orm. I said it this morning with the stick in my hand, and I said it again without."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        kolgrim: {
            name: 'Kolgrim', title: 'Of the Green Pine',
            talk: [
                { if: { quests: { 'C2-S02': 'complete' } }, node: 'done' },
                { if: { quests: { 'C2-S02': 'active' } }, node: 'case' },
                { node: 'drill' }
            ],
            nodes: {
                drill: {
                    lines: [['npc', "I'm drilling. If you want to fight, pick up a spear; if you want to talk, the Redhand's over there."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                case: {
                    lines: [
                        ['npc', "Hild sent you. She wants to sell my brother's land before he's home to stop her."],
                        ['npc', "I hold it for him, the way you'd hold a man's cloak while he swims. When the Redhand brings them back, he gets his land and his wife both."],
                        ['npc', "And if he doesn't come back, I'll have held it for nothing. I'd rather that than give it away."]
                    ],
                    effects: [{ event: { type: 'story', id: 'oath_kolgrim' } }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                done: {
                    lines: [['npc', "The Lawspeaker cut it, so that's the law. I don't have to like the law; I only have to keep it."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        orm_stick: {
            name: "Orm's oath-stick", title: "The Lawspeaker's table",
            talk: [{ node: 'stick' }],
            nodes: {
                stick: {
                    lines: [
                        [null, 'In the bundle tied with grey wool, one stick is cut with a pine and a ring, and a name: Orm of the Green Pine.'],
                        [null, 'Under the marks for his land, a second row, cut deeper: "If I am not home by the third winter, Hild holds the pine land, and holds it in my name."']
                    ],
                    effects: [{ flag: 'oath_stick_read' }, { event: { type: 'story', id: 'oath_stick' } }],
                    choices: [{ text: 'Take it to the Lawspeaker.', end: true }]
                }
            }
        },
        // ------------------------------------------------------------- C2-S04 The Fisherman's Debt: Bersi of the Sea-Hare
        bersi: {
            name: 'Bersi Grimsson', title: 'Master of the Sea-Hare',
            talk: [
                { if: { quests: { 'C2-S04': 'complete' } }, node: 'done' },
                { if: { quests: { 'C2-S04': 'active' } }, node: 'waiting' },
                { node: 'dock' }
            ],
            nodes: {
                dock: {
                    lines: [['npc', "Bersi Grimsson, master of the Sea-Hare. And the Sea-Hare isn't going anywhere."]],
                    choices: [{ text: 'Why not?', to: 'debt' }, { text: 'Goodbye.', end: true }]
                },
                debt: {
                    lines: [
                        ['npc', "I borrowed thirty in silver from a factor at Hrafnholm for a new mast. The herring never came, and now his paper says my ship is his at the thaw."],
                        ['npc', "I'd sell the cargo, but that's his too, apparently."],
                        ['npc', "Would you talk to him for me? He listens to strangers; he only lends to us."]
                    ],
                    choices: [
                        { text: "I'll talk to him.", effects: [{ start: 'C2-S04' }], to: 'who' },
                        { text: 'Not my business.', end: true }
                    ]
                },
                who: {
                    lines: [['npc', "Osric Vane, up at Hrafnholm. He counts on his fingers so you can watch him do it."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                waiting: {
                    lines: [['npc', "Well? Is she still mine?"]],
                    choices: [
                        { text: 'Your ship is yours. I paid him.', if: { flags: ['debt_paid'] }, effects: [{ event: { type: 'story', id: 'debt_told' } }], to: 'thanks_paid' },
                        { text: "Your ship is yours. He'll wait until the spring fair.", if: { flags: ['debt_leaned'] }, effects: [{ event: { type: 'story', id: 'debt_told' } }], to: 'thanks_leaned' },
                        { text: 'Not yet.', if: { notFlags: ['debt_paid', 'debt_leaned'] }, end: true }
                    ]
                },
                thanks_paid: {
                    lines: [
                        ['npc', "You paid it? Out of your own purse, for a man you met on a dock?"],
                        ['npc', "Then take this from the cargo he didn't get. And when the ice goes out, the Sea-Hare's deck is yours."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                thanks_leaned: {
                    lines: [
                        ['npc', "Osric Vane, waiting until spring? I'd give a lot to know what you said to him."],
                        ['npc', "I can't pay you, but I can carry you. When the ice goes out, the Sea-Hare's deck is yours."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                done: {
                    lines: [['npc', "New mast, old debt, same ship. When the ice goes out, you know where she's moored."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        }
    };

    // ------------------------------------------------------------- James, a bard from the south (CB1, CB2)
    // Voice: warm, quick, a little vain about his playing; an outsider in Hrimvald who knows he is one. He does not know
    // who the player was (lore guardrail), and he knows nothing about Demonkore beyond a story told at a fire.
    const JAMES_HOME = [
        { text: 'Play something.', to: 'song_home' },
        { text: 'You look like something is on your mind.', if: { notFlags: ['demonkore_heard'] }, to: 'demonkore' },
        { text: 'Tell me again about Demonkore.', if: { flags: ['demonkore_heard'] }, to: 'demonkore_again' },
        { text: 'Goodbye.', end: true }
    ];
    Object.assign(npcs, {
        james: {
            name: 'James', title: 'Bard',
            talk: [
                { if: { flags: ['james_recruited'], notFlags: ['james_settled'] }, node: 'arrive' },
                { if: { flags: ['james_settled'] }, node: 'home' },
                { if: { flags: ['james_met'] }, node: 'again' },
                { node: 'meet' }
            ],
            nodes: {
                meet: {
                    lines: [
                        ['npc', "James, a bard from the south. I came north on a wool ship to learn the skalds' songs, and not one skald will teach a southerner."],
                        ['npc', "So I play outside the Stormtide for whoever walks past. Mostly that's fishermen, and fishermen don't tip."]
                    ],
                    effects: [{ flag: 'james_met' }, { start: 'CB1' }, { event: { type: 'story', id: 'james_met' } }],
                    choices: [
                        { text: "Why won't they teach you?", to: 'skalds' },
                        { text: 'Play something.', to: 'song' },
                        { text: 'There is room at my homestead, if you want it.', to: 'invite' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                again: {
                    lines: [['npc', "Back for more? I take requests, as long as the request is something I already know."]],
                    choices: [
                        { text: "Why won't the skalds teach you?", to: 'skalds' },
                        { text: 'Play something.', to: 'song' },
                        { text: 'There is room at my homestead, if you want it.', to: 'invite' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                skalds: {
                    lines: [
                        ['npc', "A skald keeps names, and up here the names belong to the families. A stranger singing them would be a thief with a lute."],
                        ['npc', "Fair enough. But I'd like to know one song in this town that isn't about somebody missing."]
                    ],
                    choices: [{ text: 'Play something.', to: 'song' }, { text: 'There is room at my homestead, if you want it.', to: 'invite' }, { text: 'Goodbye.', end: true }]
                },
                song: {
                    lines: [
                        [null, 'He plays a southern tune, quick and bright, and lets it slow into something sadder that the harbour seems to know. Two fishermen stop mending nets to listen.'],
                        ['npc', "That's all you get for free. I learned the sad half here."]
                    ],
                    choices: [{ text: 'There is room at my homestead, if you want it.', to: 'invite' }, { text: 'Goodbye.', end: true }]
                },
                invite: {
                    lines: [
                        ['npc', "A homestead? With a roof, a hearth, and nobody asking me to stop playing at night?"],
                        ['npc', "I've said yes to worse offers from people I liked less. Tell me the way, and I'll be on the next cart south over the pass."]
                    ],
                    effects: [{ flag: 'james_recruited' }, { event: { type: 'story', id: 'james_recruited' } }],
                    choices: [{ text: 'See you there.', end: true }]
                },
                arrive: {
                    lines: [
                        ['npc', "You weren't lying, there is a roof. Most of one."],
                        ['npc', "I've claimed the spot by the well: good echo, and the crows make a polite audience. Come and listen when you're home."]
                    ],
                    effects: [{ flag: 'james_settled' }, { event: { type: 'story', id: 'james_home' } }],
                    choices: JAMES_HOME
                },
                home: {
                    lines: [['npc', "Sit down a moment. I'm halfway through a song, and I need someone to tell me it's good."]],
                    choices: JAMES_HOME
                },
                song_home: {
                    lines: [[null, 'James plays something new: half a southern dance, half a northern lament. It does not quite fit together yet, and he knows it.']],
                    choices: JAMES_HOME
                },
                // PLACEHOLDER hook for CB2 (see the quest): only what James heard. Nothing here says what Demonkore is.
                demonkore: {
                    lines: [
                        ['npc', "On the road south I shared a fire with a man who wouldn't stop talking about something called Demonkore. A dark thing, he said, that makes deals."],
                        ['npc', "It gives you what you ask for. Nobody would tell me what it takes in return."],
                        ['npc', "Every bard wants the song of a bargain like that, and I can't write it without someone to make one. When I learn more, you'll hear it first."]
                    ],
                    effects: [{ flag: 'demonkore_heard' }, { start: 'CB2' }, { event: { type: 'story', id: 'demonkore_heard' } }],
                    choices: JAMES_HOME
                },
                demonkore_again: {
                    lines: [['npc', "Demonkore makes deals; that's all I have, and a story told at a fire isn't much. I'm listening for the rest."]],
                    choices: JAMES_HOME
                }
            }
        }
    });

    // Fenrir's Heir (CL1). Spoken by stone, by the two wolves, and by Brynja in the village; the wolves never say what you were (lore bible).
    const BOTH = { flags: ['fenrir_sun_fang', 'fenrir_moon_fang'] };
    const FANG_BOTH = [{ flag: 'fenrir_fangs_both', when: BOTH }, { event: { type: 'story', id: 'fenrir_fangs_both' }, when: BOTH },
        { say: 'Both fangs. On the ring before the carving, the binding stone hums like a struck bell.', when: BOTH }];
    const AWAKEN = (stance, text) => ({ text, to: 'bond', effects: [
        { flag: 'fenrir_heir_awakened' }, { legend: 'fenrirs_heir' }, { stance }, { event: { type: 'story', id: 'fenrir_heir_awakened' } }, { flag: 'fenrir_first_bond_tutorial_done' }] });
    const HUNT = { quests: { CL1: 'active' } };
    Object.assign(npcs, {
        brynja: {
            name: 'Brynja Net-Mender', title: 'Gullstrand',
            talk: [{ if: { flags: ['fenrir_heir_awakened'] }, node: 'after' }, { if: HUNT, node: 'hunt' }, { node: 'mend' }],
            nodes: {
                mend: {
                    lines: [['npc', "Mind the net, it bites. Not many come down the cliff path who aren't selling salt."]],
                    choices: [
                        { text: 'What is the great carved rock above the village?', to: 'rock' },
                        { text: 'Why does every house here turn its back on it?', to: 'backs' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                rock: {
                    lines: [['npc', "The Wolf's Wake. Older than the village, older than the Crown's roads; my grandmother said older than the gods' names."],
                        ['npc', 'Two hunters cut in the rock, and a chain between them.'],
                        ['npc', "Go up the stair and read it if you like. We don't."]],
                    choices: [{ text: 'Why not?', to: 'backs' }, { text: 'Goodbye.', end: true }]
                },
                backs: {
                    lines: [['npc', 'So we needn\'t look at it when we step out. Twice a year the headland howls: once at the brightest hour, once when the moon goes out.'],
                        ['npc', "No wolf on this coast makes that sound. This year the real ones have started answering it."]],
                    choices: [{ text: 'Answering it?', to: 'wrong' }, { text: 'Goodbye.', end: true }]
                },
                wrong: {
                    lines: [['npc', "The grey wolves lie up by the bright cave, panting in the cold, fur gone white along the back. They took my neighbour's dog."],
                        ['npc', "And something comes out of the dark hollow on the moon side, after anyone who's been in. Nobody has, for a long while."]],
                    choices: [{ text: 'Something else.', to: 'mend' }, { text: 'Goodbye.', end: true }]
                },
                hunt: {
                    lines: [['npc', "You read it, then. You've the look of someone listening for a sound."]],
                    choices: [
                        { text: 'The bright cave?', if: { notFlags: ['fenrir_sun_fang'] }, to: 'sun_hint' },
                        { text: 'The dark hollow?', if: { notFlags: ['fenrir_moon_fang'] }, to: 'moon_hint' },
                        { text: 'And when I have both?', to: 'stone_hint' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                sun_hint: {
                    lines: [['npc', "Those wolves won't move for asking. Whatever's in that cave has hold of them, and you'll have to put them down to get by."]],
                    choices: [{ text: 'Something else.', to: 'hunt' }, { text: 'Goodbye.', end: true }]
                },
                moon_hint: {
                    lines: [['npc', 'My grandmother said the moon-hunter only comes when there is nothing left to see by. A torch is no use in there.'],
                        ['npc', "Put your light out and wait, she said. And don't turn round until you have to."]],
                    choices: [{ text: 'Something else.', to: 'hunt' }, { text: 'Goodbye.', end: true }]
                },
                stone_hint: {
                    lines: [['npc', 'There is a stone at the edge of the ring with two holes in its face, like a jaw with the teeth knocked out.'],
                        ['npc', "The verse says the chain is broken. I'd not want to be the one who finds out what that means."]],
                    choices: [{ text: 'Something else.', to: 'hunt' }, { text: 'Goodbye.', end: true }]
                },
                after: {
                    lines: [['npc', "The headland's quiet. First time in my life I've heard the sea from up there."],
                        ['npc', "You've two shadows, you know, one warm and one cold. I'll not ask."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        sun_marker: {
            name: 'The bright cave', title: "The Wolf's Wake",
            talk: [{ if: { flags: ['fenrir_sun_fang'] }, node: 'taken' }, { if: HUNT, node: 'cairn' }, { node: 'plain' }],
            nodes: {
                plain: {
                    lines: [[null, 'A cave mouth in the carved cliff, under the sun. There is gold light inside, though the real sun is behind cloud.'],
                        [null, 'The air coming out of it is hot as a bread oven. You do not go in.']],
                    choices: [{ text: 'Leave it.', end: true }]
                },
                cairn: {
                    lines: [[null, 'Inside, a cairn of black stones, the lichen on them burnt white. They are hot to the touch, and between two of them something catches the light.'],
                        [null, 'A tooth as long as your hand, wedged deep. When you pull it free, somewhere above the clouds a wolf howls at the sun.']],
                    effects: [{ flag: 'fenrir_sun_fang' }, { item: 'Sun Fang', key: 'item:sun_fang' }, { event: { type: 'story', id: 'fenrir_sun_fang' } }, ...FANG_BOTH],
                    choices: [{ text: 'Go on.', end: true }]
                },
                taken: { lines: [[null, 'The cairn is only warm now. Whatever it kept, you carry.']], choices: [{ text: 'Leave it.', end: true }] }
            }
        },
        moon_hollow: {
            name: 'The dark hollow', title: "The Wolf's Wake",
            talk: [{ if: { flags: ['fenrir_moon_fang'] }, node: 'taken' }, { if: HUNT, node: 'hollow' }, { node: 'plain' }],
            nodes: {
                plain: { lines: [[null, 'A hollow in the carved cliff, under the moon. It is darker inside than it ought to be at noon, and colder than the wind.']], choices: [{ text: 'Leave it.', end: true }] },
                hollow: {
                    lines: [[null, 'The hollow goes further back into the rock than it can. Your light makes no difference in here.']],
                    choices: [
                        { text: 'Hold your light up and look.', to: 'light' },
                        { text: 'Reach into the dark.', to: 'reach' },
                        { text: 'Put out your light and wait.', to: 'wait' },
                        { text: 'Leave it.', end: true }
                    ]
                },
                light: {
                    lines: [[null, 'The flame shrinks to a bead and goes blue. The dark leans on you the way water does at the bottom of a pool.'],
                        [null, 'You are standing outside again, and you do not remember the step.']],
                    choices: [{ text: 'Go back in.', to: 'hollow' }, { text: 'Leave it.', end: true }]
                },
                reach: {
                    lines: [[null, 'Your arm goes in to the elbow and finds nothing but cold. Something in there is waiting, and it is not waiting for your hand.']],
                    choices: [{ text: 'Try something else.', to: 'hollow' }, { text: 'Leave it.', end: true }]
                },
                wait: {
                    lines: [[null, 'You pinch out the light. For a long time there is nothing at all.'],
                        [null, 'Then the dark gets darker, and in it there is something pale: a tooth as long as your hand, cold as winter iron.'],
                        [null, 'When you take it, far away a wolf howls at a moon that is not there. Behind you, the dark gets up.']],
                    effects: [{ flag: 'fenrir_moon_fang' }, { item: 'Moon Fang', key: 'item:moon_fang' }, { event: { type: 'story', id: 'fenrir_moon_fang' } }, ...FANG_BOTH],
                    choices: [{ text: 'Turn round.', end: true }]
                },
                taken: { lines: [[null, 'Only an ordinary hollow now, wet and smelling of weed.']], choices: [{ text: 'Leave it.', end: true }] }
            }
        },
        wolfs_wake_stone: {
            name: "The Wolf's Wake", title: 'The binding stone',
            talk: [
                { if: { flags: ['fenrir_heir_awakened'] }, node: 'again' },
                { if: { flags: ['fenrir_trial_cleared'] }, node: 'wake' },
                { if: { flags: ['fenrir_trial_called'], notFlags: ['fenrir_trial_cleared'] }, node: 'waiting' },
                { if: { flags: ['fenrir_fangs_both'] }, node: 'stone' },
                { node: 'still' }],
            nodes: {
                still: {
                    lines: [[null, 'A standing stone at the edge of the ring, cut with the same chain as the cliff, broken in the same place.'],
                        [null, 'There are two hollows in its face, each the shape of a tooth.']],
                    choices: [{ text: 'Leave it.', end: true }]
                },
                stone: {
                    lines: [[null, 'The two hollows in the stone are the shape of the two teeth you carry. The sea goes quiet below the headland.']],
                    choices: [{ text: 'Lay the Sun Fang and the Moon Fang in the stone.', to: 'called',
                        effects: [{ flag: 'fenrir_trial_called' }, { removeItem: 'Sun Fang' }, { removeItem: 'Moon Fang' }, { event: { type: 'story', id: 'fenrir_trial_called' } }] },
                    { text: 'Not yet.', end: true }]
                },
                called: {
                    lines: [[null, 'The carved chain on the cliff splits along its crack. Links of light and dark climb out of the rock and wind together over the ring into something with no face.'],
                        [null, 'It is not a wolf. It is the thing that held one, and it remembers the shape of holding.']],
                    choices: [{ text: 'Face it.', end: true }]
                },
                waiting: { lines: [[null, 'The coil of broken chain turns slowly over the ring, waiting for you.']], choices: [{ text: 'Face it.', end: true }] },
                wake: {
                    lines: [[null, 'The last link falls and does not get up. Two shapes step down out of the carving: a wolf of embers, and a wolf of no light at all.'],
                        ['npc', 'We were made to chase: the sun, the moon, the end of things.'],
                        ['npc', 'Our father was bound so that we would run without him.'],
                        ['npc', 'You broke what was left of the binding, and that is enough to be an heir.'],
                        ['npc', 'Blood is only one kind of inheritance.'],
                        ['npc', 'Choose who runs at your side first. The other will not go far.'],
                        ['npc', 'And our father will hold us both, when you need us still.']],
                    choices: [
                        AWAKEN('skoll', 'Sköll, who chases the sun.'),
                        AWAKEN('hati', 'Hati, who chases the moon.'),
                        AWAKEN('fenrir', 'Neither yet. Fenrir, who holds you both.')
                    ]
                },
                bond: {
                    lines: [[null, 'The wolves run through you and are gone. Two shadows walk behind yours now, one warm and one cold.'],
                        ['npc', 'Stay with one of us and the bond grows, and it does not forget between fights. Change when you must; we need a breath to follow.']],
                    choices: [{ text: 'I will run with you.', end: true }]
                },
                again: {
                    lines: [[null, 'The stone is quiet, its two hollows empty. Far off over the sea, two howls answer each other, and you feel both of them in your teeth.']],
                    choices: [{ text: 'Leave it.', end: true }]
                }
            }
        }
    });

    // Black Flight (Nahemoth design): Skeldvik is attuned by standing at its bell, the place people come back to.
    const anchors = {
        skeldvik: { name: 'Skeldvik, the harbour bell', region: 'Hrimvald', map: 'skeldvik', spawn: 'flight_bell' }
    };

    const triggers = [
        // Crossing into the pass is "following the crows east": Q08 completes and Chapter Two begins.
        { id: 'c2_begin', on: { type: 'enter', id: 'frostspine_pass' }, effects: [
            { event: { type: 'story', id: 'chapter_two' } },
            { say: "The crow lands on a fir and looks up at the two ravens for a long moment. 'Wonderful. Two enormous birds, and neither has the decency to be ordinary.'", important: true },
            { say: 'Ahead on the road: an overturned wagon, shouting, the flat sound of an axe going into wood.' }
        ] },
        { id: 'c2_caravan_saved', on: { type: 'defeat', id: 'frostspine_caravan_raiders' }, effects: [
            { flag: 'caravan_saved' },
            { say: 'The last of them backs away up the road with his hand pressed to his side, still looking at the biers and not at you. By the fire, a young woman with a harp case on her back stands up slowly.' }
        ] },
        { id: 'c2_ulfrun', on: { type: 'defeat', id: 'frostspine_ulfrun' }, effects: [
            { flag: 'ulfrun_beaten' },
            { say: "Ulfrun goes down on one knee and stays there, leaning on the axe. 'My brother is on that board,' she says. 'I wasn't going to burn it.'", important: true },
            { say: "'I want him back. Redhand says there is a way, and the names are part of it.'" },
            { say: 'Her spear-thrower gets a shoulder under her arm and they go up the scree together. She does not look back. The two ravens watch them out of sight, then turn their heads to you.' }
        ] },
        // Eydis and Hakon come down by the goat track: she is at the memorial stone when you reach the harbour.
        { id: 'c2_skeldvik', on: { type: 'enter', id: 'skeldvik' }, effects: [{ flag: 'eydis_in_skeldvik' }] },
        // Up the south-west road: Hrafnholm, and C2-03 begins in earnest.
        { id: 'c2_hrafnholm', on: { type: 'enter', id: 'hrafnholm' }, effects: [
            { event: { type: 'story', id: 'hrafnholm_reached' } },
            { say: 'Hrafnholm: a palisade on a ridge of grey rock, the noble houses stepped up either side, and over all of it the long roof of the Hall of Winter. The town is full. The households are in for the Thing.', important: true },
            { say: "The two ravens are on the hall's gable, one at each end. The crow lands on a post well away from them. 'They're only birds,' it says, to nobody." }
        ] },
        { id: 'c2_memorial', on: { type: 'inspect', id: 'skeldvik_memorial' }, effects: [{ flag: 'skeldvik_memorial_seen' }] },
        // Fenrir's Heir (CL1). Coming down into Gullstrand, the first howl; the carving starts the hunt and wakes the sun-mad
        // wolves at the bright cave; each hunt's wolves beaten; beating the Binding Echo opens the waking.
        { id: 'cl1_arrive', on: { type: 'enter', id: 'gullstrand_coast' }, effects: [
            { say: 'As you come down into the village a howl rolls off the great rock above it, long and high. A second answers, lower, from nowhere at all.', important: true },
            { say: 'Down in the village, nobody looks up. Every house in Gullstrand turns its back on the rock.' }
        ] },
        { id: 'cl1_carving', on: { type: 'inspect', id: 'gullstrand_wolf_carving' }, effects: [
            { flag: 'fenrir_quest_discovered' },
            { say: 'Under the wolves, worn almost flat: "One hunts the day and one the night; the chain between them is broken."', important: true },
            { start: 'CL1' },
            { say: 'At the mouth of the bright cave, three grey shapes lift their heads.' }
        ] },
        { id: 'cl1_sun_hunt', on: { type: 'defeat', id: 'gullstrand_sun_hunt' }, effects: [
            { flag: 'fenrir_sun_wolves_beaten' },
            { say: 'The last wolf lies down in the cave mouth as if the heat had gone out of it. Inside, light moves on black stones.' }
        ] },
        { id: 'cl1_moon_hunt', on: { type: 'defeat', id: 'gullstrand_moon_hunt' }, effects: [
            { flag: 'fenrir_moon_wolves_beaten' },
            { say: 'The last of them comes apart like smoke in a wind. The hollow behind you is only a hollow.' }
        ] },
        { id: 'cl1_trial', on: { type: 'defeat', id: 'wolfs_wake_trial' }, effects: [
            { flag: 'fenrir_trial_cleared' },
            { say: 'The coil of chain comes apart link by link and sinks into the stone. The carved wolves on the cliff are not carved any more.', important: true }
        ] },
        { id: 'anchor_skeldvik', on: { type: 'inspect', id: 'skeldvik_bell' }, if: { flags: ['aspect_nahemoth'] }, effects: [
            { flag: 'anchor:skeldvik' },
            { say: "The crow settles on the bell post. 'Salt, tar and other people's fish. Fine. I'll remember it. Don't ask me to like it.'" },
            { say: '(Black Flight: Skeldvik is attuned.)', important: true }
        ] }
    ];

    const chapter2 = { id: 'ch2', title: 'Chapter Two: The Feast of Empty Seats', quests, npcs, triggers, anchors,
        merchants: { solveig: 'Solveig', aslaug: 'Aslaug', gudrun: 'Gudrun' },
        // Q08 "Ten Seals" was a pointer at a chapter that didn't exist. Now it has somewhere to go.
        q08: { objective: 'Follow the crows east: take the east track from the Overgrown Road', marker: { map: 'road', x: 31, y: 9 }, start: 'C201' } };

    (ENSO.story || (ENSO.story = {})).chapter2 = chapter2;
    if (isNode) module.exports = chapter2;
})(typeof window !== 'undefined' ? window : globalThis);
