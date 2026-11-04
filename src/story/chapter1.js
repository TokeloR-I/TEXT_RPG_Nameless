/* =========================================================================
 * Enso's Last Stand — STORY DATA: Chapter One, "The Road to Shamefield"
 * Canon and proposals: docs/design/ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md, ENSO_CH1_ENCOUNTERS_XP_AND_BALANCE.md,
 * ENSO_CH1_CHARACTER_ITEMS_ECONOMY.md, ENSO_WORLD_NARRATIVE_FOUNDATION.md (Vaelis), approved for
 * implementation by the Creative Director on 23 Oct 2026 (issue #87). Pure data; the engine runs it
 * (src/engine/story.js). Where the docs gave no exact line, the text here is a DRAFT for Vaelis to own:
 * those spots say so. Never reveal the player's past here (mystery pacing: no villain reveal before midgame).
 *
 * QUEST   { title, kind: 'main'|'side'|'job', xp, candidate?, summary, objectives: [OBJ], onComplete: [EFFECT] }
 *   OBJ   { id, text, on: { type, id }, marker?: { map, x, y }, effects?: [EFFECT] }
 *         type: talk | inspect | enter | pickup | defeat | build | story (a dialogue/trigger event)
 *   xp    paid ONCE (claim key 'quest:<id>'). candidate: true = optional reward not yet balanced (Tally).
 * NPC     { name, title?, farewell?, when?, talk: [{ if?, node }], nodes: { id: { lines, effects?, choices } } }
 *   lines [speaker, text]: speaker 'npc' (this NPC), 'you', another npc id, or null (narration)
 *   choice { text, say?, if?, effects?, and then: to (next node) | stay: true (same node, choices again)
 *            | end: true (goodbye: the NPC's farewell plays) | end: 'interrupt' (no farewell) }
 * EFFECT  { flag } { unflag } { start: questId } { available } { event: { type, id } } { item, key? } { removeItem }
 *         { say } { shop: merchantId } { construction: upgradeId }  (the last two hand over to Rook's CH1-04/05 rules)
 * TRIGGER { id, on: { type, id }, if?, effects }: fires once, the first time the event happens.
 *
 * Mainline XP before the Warden (design table): quests 15+20+25+25+20+30 = 135, required gate fights
 * 20+25+40+30 = 115, plus the strongbox looters on Q05 (40, Tokelo 2026-11-02): total 290 = level 3
 * (tests/32-chapter-one.test.js traces it for every class).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const quests = {
        // ------------------------------------------------------------- Segment A: Ashes of Home
        Q01: {
            title: 'A Name in the Dark', kind: 'main', xp: 15,
            summary: 'You woke in a cellar with no memory and glowing hands. Someone left words cut into the stone.',
            objectives: [
                { id: 'inscription', text: 'Read the cracked inscription in the cellar', on: { type: 'inspect', id: 'cellar_inscription' }, marker: { map: 'cellar', x: 0, y: 4 } },
                { id: 'out', text: 'Find a way out of the cellar', on: { type: 'enter', id: 'house' }, marker: { map: 'cellar', x: 12, y: 5 } }
            ],
            onComplete: [{ start: 'Q02' }]
        },
        Q02: {
            title: 'A House That Remembers', kind: 'main', xp: 20,
            summary: 'The house is empty, set for two. The grounds around it hide something much older.',
            objectives: [
                { id: 'grounds', text: 'Look over the ruined grounds', on: { type: 'inspect', id: 'grounds_foundation' }, marker: { map: 'grounds', x: 11, y: 12 } },
                { id: 'road', text: 'Find the road out of the homestead', on: { type: 'enter', id: 'road' }, marker: { map: 'grounds', x: 20, y: 21 } }
            ],
            onComplete: [{ start: 'Q03' }]
        },
        // ------------------------------------------------------------- Segment B: Beyond the Fog
        Q03: {
            title: 'The Road Keeps Its Dead', kind: 'main', xp: 25,
            summary: 'Beyond the fog the old trade road runs on to a tollway, and someone is still out there.',
            objectives: [
                { id: 'fog', text: 'Follow the road into the fog', on: { type: 'enter', id: 'tollway' }, marker: { map: 'road', x: 15, y: 21 } },
                { id: 'traveller', text: 'Speak to the traveller at the tollway', on: { type: 'talk', id: 'elian' }, marker: { map: 'tollway', x: 12, y: 6 } },
                { id: 'story', text: 'Hear Elian out', on: { type: 'story', id: 'elian_journey' }, marker: { map: 'tollway', x: 12, y: 6 } }
            ],
            onComplete: [{ gold: 15, key: 'elian_resolution' }, { flag: 'elian_in_village' }, { start: 'Q04' }]
        },
        // ------------------------------------------------------------- Segment C: Shamefield
        Q04: {
            title: 'Bread and Bell', kind: 'main', xp: 25,
            summary: 'Elian said the village of Shamefield lies past the bridge. Its elder knows the roads north.',
            objectives: [
                { id: 'village', text: 'Cross the bridge and reach Shamefield', on: { type: 'enter', id: 'shamefield' }, marker: { map: 'tollway', x: 9, y: 19 } },
                { id: 'elder', text: 'Speak to Tamsin, the village elder', on: { type: 'talk', id: 'tamsin' }, marker: { map: 'shamefield', x: 15, y: 12 } },
                { id: 'trader', text: 'Collect Mara’s supply parcel', on: { type: 'story', id: 'village_supplies_collected' }, marker: { map: 'shamefield', x: 24, y: 10 } },
                { id: 'delivery', text: 'Deliver Mara’s supply parcel to Tamsin', on: { type: 'story', id: 'village_supplies_delivered' }, marker: { map: 'shamefield', x: 15, y: 12 } }
            ],
            onComplete: [{ gold: 8, key: 'village_assistance' }, { start: 'Q05' }]
        },
        Q05: {
            title: 'The Orchard Ledger', kind: 'main', xp: 20,
            summary: 'The north orchard road is closed by the watch until someone finds the missing tollway register.',
            objectives: [
                { id: 'captain', text: 'Ask the Watch Captain about the orchard gate', on: { type: 'talk', id: 'watch_captain' }, marker: { map: 'shamefield', x: 17, y: 4 } },
                { id: 'looters', text: 'Defeat the looters guarding the strongbox in the tollway wrecks', on: { type: 'defeat', id: 'tollway_strongbox_looters' }, marker: { map: 'tollway', x: 15, y: 16 } },
                { id: 'register', text: 'Take the toll register from the strongbox', on: { type: 'inspect', id: 'tollway_register' }, marker: { map: 'tollway', x: 16, y: 16 },
                    effects: [{ item: 'Tollway Register', key: 'item:tollway_register' }] },
                { id: 'return', text: 'Bring the register to the Watch Captain', on: { type: 'story', id: 'register_returned' }, marker: { map: 'shamefield', x: 17, y: 4 } }
            ],
            onComplete: [{ gold: 8, key: 'orchard_register' }, { flag: 'north_gate_open' }, { say: 'Somewhere north, a chain rattles and a gate swings open.' }, { start: 'Q06' }]
        },
        // ------------------------------------------------------------- Segment D: Featherwatch
        Q06: {
            title: "The Keeper's Warning", kind: 'main', xp: 30,
            summary: 'North of the orchard, past the old causeway, a Warden keeps a sealed roost. Elian said he turns travellers back.',
            objectives: [
                { id: 'north', text: 'Go north through the orchard', on: { type: 'enter', id: 'featherwatch' }, marker: { map: 'orchard', x: 13, y: 0 } },
                { id: 'climb', text: "Climb to the Warden's sanctuary", on: { type: 'enter', id: 'sanctuary' }, marker: { map: 'featherwatch', x: 12, y: 0 } },
                { id: 'look', text: 'Look around the sanctuary', on: { type: 'inspect', id: 'sanctuary_journal' }, marker: { map: 'sanctuary', x: 5, y: 4 } },
                { id: 'warden', text: 'Speak with the Warden', on: { type: 'talk', id: 'warden' }, marker: { map: 'sanctuary', x: 13, y: 5 } }
            ],
            onComplete: [{ start: 'B01' }]
        },
        // ------------------------------------------------------------- Segment E: A Good Man Dies
        B01: {
            title: 'A Good Man Dies', kind: 'main', xp: 0,
            summary: 'The Warden guards a seal and its key. He asked you to leave.',
            objectives: [
                { id: 'key', text: "Take the seal's key from the Warden", on: { type: 'defeat', id: 'sanctuary_warden' }, marker: { map: 'sanctuary', x: 13, y: 5 } },
                { id: 'seal', text: 'Open the seal with his key', on: { type: 'inspect', id: 'seal_first_echo' }, marker: { map: 'seal_chamber', x: 5, y: 2 },
                    effects: [
                        // DRAFT memory (Vaelis owns the final text; D-3). Partial, no face, no identity.
                        { say: 'You are standing on a balcony in another light. Below, a street full of people and lanterns: a festival.', important: true },
                        { say: 'A voice beside you gives an order, calm and certain. The lanterns go out, one by one. Then the street is empty.', important: true },
                        { say: "You can't see the speaker's face. You don't know why the order was given. Only that whoever gave it expected to be obeyed.", important: true },
                        { say: 'The vision lets go. The key has crumbled to black sand in your hand, and something in you is a little less empty than before.' },
                        { removeItem: 'Seal-Key of the First Echo' },
                        { flag: 'fragment_one' },
                        { gold: 20, key: 'first_seal_treasury' },
                        // Nahemoth, the first aspect (ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md; Vaelis's DRAFT lines).
                        // Only opening the seal grants it, never the Warden's death alone.
                        { say: 'The seal splits. A flock of ink-black feathers rises from a seam that has no depth. They turn against the wind and fold into a single crow.', important: true },
                        { say: "Crow: 'You broke a door that was meant to stay shut. Consider me impressed. Or concerned. I haven't decided.'", important: true },
                        { say: "Crow: 'Give me a place you've been, and I can show you how to return.'" },
                        { say: '(You gained Nahemoth, the First Shell. Black Flight: travel to places you have attuned. Talk to the crow any time.)', important: true },
                        { flag: 'aspect_nahemoth' },
                        { flag: 'anchor:homestead' }
                    ] }
            ],
            onComplete: [{ start: 'Q07' }]
        },
        Q07: {
            title: 'The Mason Who Waited', kind: 'main', xp: 0,
            summary: 'With the north road open, a mason has come to look at the old foundations of your home.',
            objectives: [
                { id: 'home', text: 'Return to the homestead', on: { type: 'enter', id: 'grounds' }, marker: { map: 'road', x: 16, y: 0 } },
                { id: 'mason', text: 'Speak to the mason waiting at the homestead', on: { type: 'talk', id: 'orin' }, marker: { map: 'grounds', x: 18, y: 10 } },
                { id: 'repair', text: 'Repair the broken gate (Orin\'s construction ledger)', on: { type: 'build', id: 'homestead_gate' }, marker: { map: 'grounds', x: 22, y: 12 } }
            ],
            onComplete: [{ flag: 'chapter_one_complete' }, { start: 'Q08' }]
        },
        Q08: {
            title: 'Ten Seals', kind: 'main', xp: 0, teaser: true,
            summary: 'The Warden kept one seal. Orin has heard of others, far beyond Shamefield.',
            objectives: [
                { id: 'onward', text: 'Follow the crows east (Chapter Two)', on: { type: 'story', id: 'chapter_two' } }
            ],
            onComplete: []
        },
        // ------------------------------------------------------------- Shane the Shamed (optional)
        S01: {
            title: 'Shame on Shane!', kind: 'side', xp: 20, candidate: true,
            summary: 'A crowd by the well chants at a man called Shane. The watch is looking for him.',
            objectives: [
                { id: 'hear', text: 'Hear Shane out', on: { type: 'story', id: 'shane_asked' }, marker: { map: 'shamefield', x: 24, y: 11 },
                    effects: [{ flag: 'shane_asked_ledger' }] },
                { id: 'watch', text: "Get past the constables at Shane's allotment", on: { type: 'defeat', id: 'allotment_watch' }, marker: { map: 'allotment', x: 13, y: 9 },
                    effects: [{ flag: 'shane_watch_resolved' }] },
                { id: 'wagon', text: "Take Shane's ledger from the confiscation wagon", on: { type: 'inspect', id: 'allotment_wagon' }, marker: { map: 'allotment', x: 12, y: 9 },
                    effects: [{ item: "Shane's Ledger", key: 'item:shane_ledger' }, { flag: 'shane_ledger_found' }] },
                { id: 'return', text: 'Bring the ledger back to Shane', on: { type: 'story', id: 'shane_ledger_returned' }, marker: { map: 'shamefield', x: 24, y: 11 } }
            ],
            onComplete: [{ removeItem: "Shane's Ledger" }, { flag: 'shane_recruited' }, { flag: 'shane_stall_unlocked' }]
        },
        // ------------------------------------------------------------- Get to know the locals (optional; Tokelo 2026-11-02)
        // The Watch Captain gives it when the register comes back. Five households, five favours, in the parts of
        // Shamefield nobody had a reason to visit: the Kloster herb garden, the mill falls, the rye field, the church,
        // the south houses. XP and Gold here are candidates for Gauge.
        L01: {
            title: 'Get to Know the Locals', kind: 'side', xp: 20, candidate: true,
            summary: "The Watch Captain says Shamefield won't trust a stranger who only passes through. Five households need a hand.",
            objectives: [
                { id: 'favours', text: 'Help five Shamefield households', on: { type: 'quests', ids: ['SF1', 'SF2', 'SF3', 'SF4', 'SF5'], count: 5 } },
                { id: 'report', text: 'Tell the Watch Captain you know the locals now', on: { type: 'story', id: 'locals_reported' }, marker: { map: 'shamefield', x: 17, y: 4 } }
            ],
            onComplete: [{ gold: 15, key: 'locals_reward' }, { flag: 'shamefield_friend' }, { item: 'Cheese', key: 'item:l01_cheese' }, { item: 'Fresh Milk', key: 'item:l01_milk' }]
        },
        // Bread and Beer: the first real use of planting and crafting (cropDefinitions / recipeDefinitions in src/data.js).
        SF1: {
            title: 'Bread and Beer', kind: 'side', xp: 25, candidate: true,
            summary: 'Oda the baker and Brother Fenric the brewer argue about grain. Oda bets that a stranger can make a good loaf and a good ale from scratch.',
            objectives: [
                { id: 'bed', text: 'Ask Sister Merrow for a garden bed at the Kloster, and dig it', on: { type: 'build', id: 'briarwell_bed' }, marker: { map: 'briarwell_cloister_court', x: 26, y: 20 } },
                { id: 'plant', text: 'Plant the barley seed in your garden bed', on: { type: 'plant', id: 'Barley Seed' }, marker: { map: 'briarwell_cloister_court', x: 23, y: 11 } },
                { id: 'grow', text: 'Tend the barley until it is ripe, then harvest it', on: { type: 'harvest', id: 'Barley' }, marker: { map: 'briarwell_cloister_court', x: 23, y: 11 } },
                { id: 'hops', text: 'Pick wild hops by the mill falls', on: { type: 'pickup', id: 'village_wild_hops' }, marker: { map: 'shamefield', x: 3, y: 11 } },
                { id: 'brew', text: 'Brew a cask of Briarwell Pale with Brother Fenric', on: { type: 'craft', id: 'brew_briarwell_pale' }, marker: { map: 'briarwell_cloister_court', x: 26, y: 16 } },
                { id: 'rye', text: 'Cut a sheaf of rye from the field behind the square', on: { type: 'pickup', id: 'village_rye' }, marker: { map: 'shamefield', x: 22, y: 17 } },
                { id: 'mill', text: 'Grind the rye at the old watermill', on: { type: 'craft', id: 'mill_rye_flour' }, marker: { map: 'shamefield', x: 6, y: 13 } },
                { id: 'bake', text: "Bake a rye loaf in Oda's oven", on: { type: 'craft', id: 'bake_rye_loaf' }, marker: { map: 'village_residential_lane', x: 17, y: 6 } },
                { id: 'loaf', text: 'Give Brother Fenric the loaf', on: { type: 'story', id: 'fenric_loaf' }, marker: { map: 'briarwell_cloister_court', x: 26, y: 16 } },
                { id: 'ale', text: 'Give Oda the ale', on: { type: 'story', id: 'oda_ale' }, marker: { map: 'village_residential_lane', x: 17, y: 6 } }
            ],
            // The kitchen (2026-11-02): dairy is a gift or a purchase. Oda and Merrow send you home with some.
            onComplete: [{ flag: 'bread_and_beer' }, { say: 'Oda presses a jug of milk and a crock of butter on you. "For the next loaf. Make it yourself."' },
                { item: 'Fresh Milk', key: 'item:sf1_milk' }, { item: 'Butter', key: 'item:sf1_butter' }]
        },
        SF2: {
            title: 'The Brown Hops', kind: 'side', xp: 15, candidate: true,
            summary: "Brother Fenric's hops are browning at the end of the row. He blames the water, the soil, and his enemies, in that order.",
            objectives: [
                { id: 'roots', text: 'Look closely at the sick hops', on: { type: 'inspect', id: 'cloister_hops' }, marker: { map: 'briarwell_cloister_court', x: 29, y: 10 },
                    effects: [{ say: 'You kneel and part the leaves. The roots are gnawed half through, and caught on the stems are tufts of rust-red fur.' }] },
                { id: 'granary', text: "Look for the same tracks in Sister Merrow's granary", on: { type: 'inspect', id: 'cloister_granary' }, marker: { map: 'briarwell_cloister_court', x: 25, y: 19 },
                    effects: [{ say: 'Behind the red-cord sacks: more rust-red fur, a gnawed hole, and a trail of spilled barley running along the wall to the south lawn.' }, { flag: 'sf2_tracks' }] },
                { id: 'nest', text: 'Clear out the rat nest behind the storehouse', on: { type: 'defeat', id: 'cloister_rat_nest' }, marker: { map: 'briarwell_cloister_court', x: 28, y: 17 } },
                { id: 'tell', text: 'Tell Brother Fenric what was eating his hops', on: { type: 'story', id: 'fenric_rats' }, marker: { map: 'briarwell_cloister_court', x: 26, y: 16 } }
            ],
            onComplete: []
        },
        SF3: {
            title: 'Pigs at Large', kind: 'side', xp: 10, candidate: true,
            summary: "Three of Greta Rusk's pigs went over the fence in the night. Greta has crusts. The pigs have opinions.",
            objectives: [
                { id: 'bridge', text: 'Find the pig by the plank bridge', on: { type: 'inspect', id: 'stray_pig_bridge' }, marker: { map: 'shamefield', x: 6, y: 16 } },
                { id: 'houses', text: 'Find the pig by the south houses', on: { type: 'inspect', id: 'stray_pig_houses' }, marker: { map: 'shamefield', x: 12, y: 20 } },
                { id: 'church', text: 'Find Bishop, the big one, up by the church', on: { type: 'inspect', id: 'stray_pig_church' }, marker: { map: 'shamefield', x: 25, y: 4 } },
                { id: 'greta', text: 'Tell Greta her pigs are on their way home', on: { type: 'story', id: 'greta_pigs' }, marker: { map: 'village_residential_lane', x: 24, y: 5 } }
            ],
            // The good sausage, and a hen to start your own coop (the kitchen, 2026-11-02).
            onComplete: [{ item: 'Bratwurst', key: 'item:sf3_wurst_1' }, { item: 'Bratwurst', key: 'item:sf3_wurst_2' }, { item: 'Hen', key: 'item:sf3_hen' }]
        },
        SF4: {
            title: 'Singing at the Mill', kind: 'side', xp: 15, candidate: true,
            summary: 'Old Hob the miller drowned under the falls last winter. Now somebody sings at the mill after dark, and nobody will grind their grain there.',
            objectives: [
                { id: 'falls', text: 'Look around the mill falls on the west bank', on: { type: 'inspect', id: 'village_mill_bottles' }, marker: { map: 'shamefield', x: 2, y: 4 },
                    effects: [{ say: 'Empty bottles, and muddy footprints that walk into the water and never come out. From under the falls, somebody is singing. Badly.' }, { flag: 'sf4_heard' }] },
                { id: 'shade', text: 'Quiet whatever is singing under the falls', on: { type: 'defeat', id: 'mill_shade' }, marker: { map: 'shamefield', x: 6, y: 4 } },
                { id: 'tamsin', text: 'Tell Tamsin the mill is quiet', on: { type: 'story', id: 'tamsin_mill' }, marker: { map: 'shamefield', x: 15, y: 12 } }
            ],
            onComplete: [{ flag: 'mill_reopened' }, { say: 'Tamsin sends a wedge of mountain cheese after you, wrapped in a cloth.' }, { item: 'Cheese', key: 'item:sf4_cheese' }]
        },
        SF5: {
            title: 'Names for the Bell', kind: 'side', xp: 10, candidate: true,
            summary: 'Elian has written down everyone he met on the road who never arrived anywhere. He wants the names read at the festival.',
            objectives: [
                { id: 'door', text: "Leave Elian's letter at the church door", on: { type: 'story', id: 'letter_left' }, marker: { map: 'shamefield', x: 28, y: 7 } },
                { id: 'elian', text: 'Tell Elian his letter is with the church', on: { type: 'story', id: 'elian_letter_done' }, marker: { map: 'shamefield', x: 20, y: 9 } }
            ],
            onComplete: []
        },
        // ------------------------------------------------------------- Notice board jobs (optional)
        J01: {
            title: 'Wolf on the Road', kind: 'job', xp: 10, candidate: true,
            summary: 'The notice board asks someone to deal with the wolf on the homestead road.',
            objectives: [{ id: 'wolf', text: 'Deal with the wolf on the homestead road', on: { type: 'defeat', id: 'road_wolf' }, marker: { map: 'road', x: 17, y: 14 } }],
            onComplete: []
        },
        J02: {
            title: 'Herbs for Iona', kind: 'job', xp: 10, candidate: true,
            summary: 'Iona the herbalist wants wild herbs from the north orchard.',
            objectives: [
                { id: 'gather', text: 'Gather wild herbs in the north orchard', on: { type: 'pickup', id: 'orchard_herbs' }, marker: { map: 'orchard', x: 23, y: 18 },
                    effects: [{ flag: 'herbs_gathered' }] },
                { id: 'deliver', text: 'Bring the herbs to Iona', on: { type: 'story', id: 'iona_herbs' }, marker: { map: 'shamefield', x: 21, y: 14 } }
            ],
            onComplete: []
        }
    };

    // Shared bits of dialogue
    const shop = (id) => ({ text: 'What have you got?', say: 'What have you got for sale?', stay: true, effects: [{ shop: id }] });
    const met = { event: { type: 'story', id: 'met_shopkeeper' } };

    // ------------------------------------------------------------- The kitchen (Tokelo, 2026-11-02)
    // Built from the data (recipeDefinitions, cropDefinitions in src/data.js), so a new recipe or seed needs no story
    // edit. A recipe shows up at its station only while you carry its ingredients; "What can I make here?" lists all.
    const DATA = isNode ? require('../data.js') : ENSO.data;
    const amount = (ings) => Object.entries(ings).map(([n, q]) => (q > 1 ? `${q} ${n}` : n)).join(', ');
    const STATION_VERB = { hearth: 'Cook', oven: 'Bake', mill: 'Grind', brewery: 'Brew' };
    const recipesAt = (station) => Object.entries(DATA.recipeDefinitions).filter(([, r]) => r.station === station);
    const cook = (station, when) => recipesAt(station).map(([id, r]) => ({
        text: `${STATION_VERB[station] || 'Make'} ${r.yield > 1 ? `${r.yield} ` : ''}${r.output} (${amount(r.ingredients)})`,
        if: { ...(when || {}), has: r.ingredients }, stay: true, effects: [{ craft: id }]
    }));
    const recipeBook = (station, when) => ({
        text: 'What can I make here?', ...(when ? { if: when } : {}), stay: true,
        effects: [{ say: recipesAt(station).map(([, r]) => `${r.output}${r.yield > 1 ? ` ×${r.yield}` : ''}: ${amount(r.ingredients)}`).join('\n') }]
    });
    // Crops ripen on the clock in the world (farmingRules, Tokelo 2026-11-04): watering and weeding hurries them once.
    const FARM = DATA.farmingRules || {};
    const growText = (c) => `${c.growSeconds ?? FARM.growSeconds} s (water and weed it once: ${FARM.tendCutsSeconds} s sooner)`;
    /** Once it's been watered and weeded: how long is left (the engine's own refusal says it). */
    const checkOn = (plotId) => ({ text: 'Check on it', if: { plots: { [plotId]: 'tended' } }, stay: true, effects: [{ tend: plotId }] });
    /** A homestead plot or pen: dig or build it, then plant, tend (feed) and harvest whatever its data allows. */
    function plotStation(plotId, name, look, unbuilt, nouns) {
        const crops = Object.entries(DATA.cropDefinitions).filter(([, c]) => (c.plantIn || []).includes(plotId));
        const feed = [...new Set(crops.flatMap(([, c]) => c.feed || []))];
        const tendText = feed.length ? `Feed them (${feed.join(', ')})` : nouns.tend;
        return {
            name, title: 'Your homestead',
            talk: [{ if: { built: [plotId] }, node: 'plot' }, { node: 'unbuilt' }],
            nodes: {
                unbuilt: {
                    lines: [[null, unbuilt]],
                    effects: [{ construction: plotId }],
                    choices: [{ text: 'Leave it.', end: true }]
                },
                plot: {
                    lines: [[null, look]],
                    choices: [
                        ...crops.map(([seed]) => ({ text: `${nouns.plant} the ${seed}`, if: { items: [seed], plots: { [plotId]: 'empty' } }, stay: true, effects: [{ plant: { plot: plotId, seed } }] })),
                        { text: tendText, if: { plots: { [plotId]: 'growing' }, ...(feed.length ? { any: feed.map((f) => ({ items: [f] })) } : {}) }, stay: true, effects: [{ tend: plotId }] },
                        ...(feed.length ? [] : [checkOn(plotId)]),
                        ...(feed.length ? [{ text: 'You have nothing to feed them.', if: { plots: { [plotId]: 'growing' }, notAny: feed }, stay: true, effects: [{ say: `They eat ${feed.join(', ')}. Grow some, or buy some.` }] }] : []),
                        { text: nouns.harvest, if: { plots: { [plotId]: 'ready' } }, stay: true, effects: [{ harvest: plotId }] },
                        { text: 'What grows here?', stay: true, effects: [{ say: crops.map(([seed, c]) => `${seed}: ${c.yield || 1} ${c.produces} after ${feed.length ? `${c.actionsToGrow} feedings` : growText(c)}${c.keeps ? ', again and again' : ''}`).join('\n') }] },
                        { text: 'Leave it.', end: true }
                    ]
                }
            }
        };
    }

    const npcs = {
        // ------------------------------------------------------------- Elian, the road witness
        elian: {
            name: 'Elian', title: 'Traveller',
            talk: [{ if: { flags: ['elian_in_village'] }, node: 'village' }, { node: 'road' }],
            nodes: {
                road: {
                    lines: [
                        ['npc', "Easy! You came out of the fog like a ghost. Sit, if you like. The goblins on the bridge won't come this side of the water."],
                        ['npc', "You look like you've been asleep a hundred years. Have you even heard? The heroes did it. The old lord is dead and his crown is broken. A year ago now."]
                    ],
                    choices: [
                        { text: 'Who were the heroes?', to: 'heroes' },
                        { text: 'What lord?', to: 'lord' },
                        { text: 'Where does this road go?', to: 'road_on' },
                        { text: "I'm going on to the village.", effects: [{ event: { type: 'story', id: 'elian_journey' } }], to: 'farewell' }
                    ]
                },
                heroes: {
                    lines: [['npc', "A sworn band, and the bravest of them carried the sun banner. They broke the old lord's guard at the gates, then broke him. Shamefield still holds a festival for it. You'll see the bunting."]],
                    choices: [{ text: 'What lord?', to: 'lord' }, { text: 'Where does this road go?', to: 'road_on' }, { text: "I'm going on to the village.", effects: [{ event: { type: 'story', id: 'elian_journey' } }], to: 'farewell' }]
                },
                lord: {
                    lines: [['npc', "Nobody says his name. It's bad luck, and anyway, half the people who knew it are under the memorial stone. He ruled from somewhere out this way, they say. Whole streets emptied when he gave the word."]],
                    choices: [{ text: 'Who were the heroes?', to: 'heroes' }, { text: 'Where does this road go?', to: 'road_on' }, { text: "I'm going on to the village.", effects: [{ event: { type: 'story', id: 'elian_journey' } }], to: 'farewell' }]
                },
                road_on: {
                    lines: [['npc', "Across the bridge, through the old cart barricade, and on to Shamefield. Good people. Mostly. North of the village there's a roost where a Warden keeps some kind of seal. He turns everyone back. Politely. Crows everywhere."]],
                    choices: [{ text: 'Who were the heroes?', to: 'heroes' }, { text: 'What lord?', to: 'lord' }, { text: "I'm going on to the village.", effects: [{ event: { type: 'story', id: 'elian_journey' } }], to: 'farewell' }]
                },
                farewell: {
                    lines: [['npc', "Then I'll walk ahead and tell them you're coming, before the goblins have you. Mind the bridge. And the carts: something lives in them."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                village: {
                    lines: [['npc', "You made it! I told Tamsin a stranger was coming up the road. She'll want to see you. She's by the notice board, most days."]],
                    choices: [
                        { text: 'The Captain says you keep looking at the church.', if: { quests: { SF5: 'available' } }, to: 'sf5_start' },
                        { text: 'Your letter is at the church.', if: { quests: { SF5: 'active' }, flags: ['elian_letter_left'] }, effects: [{ event: { type: 'story', id: 'elian_letter_done' } }], to: 'sf5_done' },
                        { text: 'Tell me about the heroes again.', to: 'heroes_v' }, { text: 'Goodbye.', end: true }
                    ]
                },
                sf5_start: {
                    lines: [
                        ['npc', "Does it show? I've been writing down the people I met on the road who never arrived anywhere. Names, and where I saw them last."],
                        ['npc', "The festival is for the heroes, and that's right. But someone should read these too. Would you leave it at the church door? I keep getting as far as the steps."]
                    ],
                    effects: [{ start: 'SF5' }, { item: "Elian's Letter", key: 'item:elian_letter' }],
                    choices: [{ text: "I'll take it up for you.", end: true }]
                },
                sf5_done: {
                    lines: [['npc', "Thank you. It's foolish, I know. They won't hear it. But I will, and so will everyone who knew them. That's not nothing."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                heroes_v: {
                    lines: [['npc', "The sun banner, the broken crown. A year of peace. Well, a year of fewer funerals. Ask anyone here; they'll tell it better."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },

        // ------------------------------------------------------------- Shamefield
        tamsin: {
            name: 'Tamsin', title: 'Village elder',
            talk: [
                { if: { flags: ['warden_dead'] }, node: 'mourning' },
                { if: { quests: { Q05: 'complete' } }, node: 'after' },
                { node: 'first' }
            ],
            nodes: {
                first: {
                    lines: [
                        ['npc', "Elian said a stranger was coming. Welcome to Shamefield. We're a small place, but we're still here, which is more than many can say."],
                        ['npc', "If you're heading north, the watch has the orchard road closed. The tollkeeper ran when the goblins came and took the route register with him. The Captain won't open the gate without knowing who's gone up that road."]
                    ],
                    choices: [
                        { text: 'Mara sent these supplies for the village.', if: { items: ['Village Supply Parcel'], quests: { Q04: 'active' } }, stay: true, effects: [{ removeItem: 'Village Supply Parcel' }, { event: { type: 'story', id: 'village_supplies_delivered' } }, { say: 'Tamsin: Thank you. These will keep our neighbours fed.' }] },
                        { text: 'Why is the village called Shamefield?', to: 'name' },
                        { text: 'Where can I get supplies?', to: 'supplies' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                name: {
                    lines: [['npc', "An old joke that stuck. Folk shamed for something get sent to work the field until they've earned their name back. These days it's mostly Shane they shame. You'll hear them at the well."]],
                    choices: [{ text: 'Where can I get supplies?', to: 'supplies' }, { text: 'Goodbye.', end: true }]
                },
                supplies: {
                    lines: [['npc', "Mara keeps general goods on the square. Bragg the smith is by the inn. Iona sells herbs, when the watch isn't asking her about Shane."]],
                    choices: [{ text: 'Mara sent these supplies for the village.', if: { items: ['Village Supply Parcel'], quests: { Q04: 'active' } }, stay: true, effects: [{ removeItem: 'Village Supply Parcel' }, { event: { type: 'story', id: 'village_supplies_delivered' } }, { say: 'Tamsin: Thank you. These will keep our neighbours fed.' }] },
                        { text: 'Why is the village called Shamefield?', to: 'name' }, { text: 'Goodbye.', end: true }]
                },
                after: {
                    lines: [['npc', "The orchard gate's open, I hear. Be careful up there. The Warden is a kind man, but he won't let anyone past the roost."]],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                mourning: {
                    lines: [['npc', "The crows came down to the village this morning. All of them, silent, on every roof. Then they flew off north and didn't come back. Something's happened to the Warden. He mended my grandson's arm once, you know. Wouldn't take a coin."]],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                sf4_start: {
                    lines: [
                        ['npc', "Since you ask. Old Hob the miller drowned under the falls last winter, the night of the festival. Now there's singing at the mill after dark, and nobody will take their grain there."],
                        ['npc', "I don't believe in ghosts. I'd still like someone with a sword to go and not believe in them for me. The mill's on the west bank, behind the slate houses."]
                    ],
                    effects: [{ start: 'SF4' }],
                    choices: [{ text: "I'll go and listen.", end: true }]
                },
                sf4_done: {
                    lines: [['npc', "Hob always did sing louder than he drank, and he drank a great deal. Thank you. I'll tell the families the mill is safe. Some of them will even believe me."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        mara: {
            name: 'Mara', title: 'General goods',
            talk: [{ node: 'default' }],
            nodes: {
                default: {
                    lines: [['npc', "Supplies are scarce. Look closely before you part with anything."]],
                    effects: [met],
                    choices: [{ text: 'Can I carry supplies to Tamsin?', if: { quests: { Q04: 'active' }, notFlag: 'village_supplies_taken' }, stay: true, effects: [{ flag: 'village_supplies_taken' }, { item: 'Village Supply Parcel', key: 'village_parcel' }, { event: { type: 'story', id: 'village_supplies_collected' } }, { say: 'Mara: Take these to Tamsin. The village stores are running low.' }] }, shop('mara'), { text: 'Goodbye.', end: true }]
                }
            }
        },
        bragg: {
            name: 'Bragg', title: 'Smith',
            talk: [{ node: 'default' }],
            nodes: {
                default: {
                    lines: [['npc', "Don't know you. Don't need to. Coin's coin. If you want an edge put on something, I'm your man."]],
                    effects: [met],
                    choices: [shop('bragg'), { text: 'Goodbye.', end: true }]
                }
            }
        },
        iona: {
            name: 'Iona', title: 'Herbalist',
            talk: [{ node: 'default' }],
            nodes: {
                default: {
                    lines: [['npc', "Feverfew, yarrow, willow bark. Everything a body needs to keep going a little longer. Mind, the watch counts every packet I sell since the business with Shane."]],
                    effects: [met],
                    choices: [
                        { text: 'Here are your herbs.', if: { quests: { J02: 'active' }, flags: ['herbs_gathered'], items: ['Healing Herb Bundle'] }, effects: [{ removeItem: 'Healing Herb Bundle' }, { event: { type: 'story', id: 'iona_herbs' } }], to: 'thanks' },
                        { text: 'What happened with Shane?', to: 'shane' },
                        shop('iona'),
                        { text: 'Goodbye.', end: true }
                    ]
                },
                shane: {
                    lines: [['npc', "He made medicine cheaper than mine and didn't ask the watch for a permit first. Good medicine, too, I'll admit that. Whether that's a crime is for the Captain to say, and she says it is."]],
                    choices: [shop('iona'), { text: 'Goodbye.', end: true }]
                },
                thanks: {
                    lines: [['npc', "From the old tree? Good. That one always grew the strongest. Thank you."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        watch_captain: {
            name: 'Watch Captain', title: 'Shamefield Watch',
            talk: [
                // He tells you about Shane's allotment once, even mid-errand (optional quests can come first).
                { if: { flags: ['shane_watch_resolved'], notFlags: ['captain_told_shane'] }, node: 'suspicious' },
                { if: { quests: { Q05: 'active' }, flags: ['register_carried'] }, node: 'register' },
                { if: { quests: { Q05: 'active' } }, node: 'gate' },
                // Get to know the locals (L01). A run that returned the register before this quest existed gets it here.
                { if: { quests: { Q05: 'complete', L01: 'unseen' } }, node: 'locals_offer' },
                { if: { quests: { L01: 'active', SF1: 'complete', SF2: 'complete', SF3: 'complete', SF4: 'complete', SF5: 'complete' } }, node: 'locals_done' },
                { if: { quests: { L01: 'active' } }, node: 'locals_hint' },
                { if: { flags: ['shane_watch_resolved'] }, node: 'suspicious' },
                { node: 'default' }
            ],
            nodes: {
                gate: {
                    lines: [
                        ['npc', "The orchard road stays shut until I know who's on it. That's the job. The tollway register listed every traveller north for twenty years, and it went missing when the tollkeeper ran."],
                        ['npc', "His carts went over at the barricade. If the register survived, it's in those wrecks. Bring it to me and I'll open the gate."]
                    ],
                    choices: [{ text: "I'll find it.", end: true }]
                },
                register: {
                    lines: [['npc', "Is that the register? Let me see it."]],
                    choices: [{ text: 'Here it is.', effects: [{ removeItem: 'Tollway Register' }, { unflag: 'register_carried' }, { event: { type: 'story', id: 'register_returned' } }], to: 'opened' }]
                },
                opened: {
                    lines: [
                        ['npc', "...Every name's here. Good. The gate's open. Keep to the path, and if the Warden tells you to turn back, turn back."],
                        ['npc', "One more thing. You've done the watch a favour, but Shamefield doesn't know you, and folk here don't trust a stranger who only passes through."],
                        ['npc', "Five households have troubles I can't spare a constable for. Help them. Get to know the locals. Then come and tell me about it."]
                    ],
                    effects: [{ start: 'L01' }, { available: 'SF1' }, { available: 'SF2' }, { available: 'SF3' }, { available: 'SF4' }, { available: 'SF5' }],
                    choices: [{ text: 'Who needs help?', to: 'locals_who' }, { text: 'Goodbye.', end: true }]
                },
                locals_offer: {
                    lines: [
                        ['npc', "You again. You did the watch a favour with that register, but Shamefield still doesn't know you, and folk here don't trust a stranger who only passes through."],
                        ['npc', "Five households have troubles I can't spare a constable for. Help them. Get to know the locals. Then come and tell me about it."]
                    ],
                    effects: [{ start: 'L01' }, { available: 'SF1' }, { available: 'SF2' }, { available: 'SF3' }, { available: 'SF4' }, { available: 'SF5' }],
                    choices: [{ text: 'Who needs help?', to: 'locals_who' }, { text: 'Goodbye.', end: true }]
                },
                locals_who: {
                    lines: [
                        ['npc', "Oda the baker and Brother Fenric up at the Kloster are fighting about bread and beer again. Fenric's hops are dying, too, and he's blaming everyone."],
                        ['npc', "Greta Rusk has lost her pigs. Tamsin says there's singing at the old mill after dark. And your friend Elian keeps looking at the church steps and not climbing them."]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                locals_hint: {
                    lines: [['npc', "Still settling in? Bread and beer, Fenric's hops, Greta's pigs, the singing at the mill, and Elian. Five households. I'm counting."]],
                    choices: [{ text: 'Remind me who needs help.', to: 'locals_who' }, { text: 'Goodbye.', end: true }]
                },
                locals_done: {
                    lines: [
                        ['npc', "Oda brought me bread. Fenric brought me beer, and stayed to complain about the bread. Greta sent a sausage, which I'm choosing to take as thanks."],
                        ['npc', "The mill's grinding again, and Elian's names are on the church door. People are saying your name in the square, and not to shame you. That's rarer than you'd think, here."]
                    ],
                    choices: [{ text: 'I know the locals now.', effects: [{ event: { type: 'story', id: 'locals_reported' } }], to: 'locals_thanks' }]
                },
                locals_thanks: {
                    lines: [['npc', "Then you're one of them, as far as the watch is concerned. Mind you don't make me regret it."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                suspicious: {
                    lines: [['npc', "Two of my constables came back limping from Shane's allotment, and the evidence wagon's lighter than it was. I can't prove who did it. Yet."]],
                    effects: [{ flag: 'captain_told_shane' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                default: {
                    lines: [['npc', "Keep the peace and we'll get along."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        crowd: {
            name: 'Villagers',
            talk: [{ if: { flags: ['shane_watch_resolved'] }, node: 'after' }, { node: 'chant' }],
            nodes: {
                chant: {
                    lines: [
                        ['npc', 'Shame on Shane! Shame on Shane!'],
                        [null, 'A man by the well pretends not to hear. He is very bad at pretending.']
                    ],
                    effects: [{ available: 'S01' }],
                    choices: [{ text: 'What did he do?', to: 'why' }, { text: 'Leave them to it.', end: true }]
                },
                why: {
                    lines: [['npc', 'Sold medicine without a permit! Cheap, too! The watch is after him!'], ['npc', 'Shame on Shane!']],
                    choices: [{ text: 'Leave them to it.', end: true }]
                },
                after: {
                    lines: [['npc', "Did you hear? Somebody roughed up the watch for Shane. For SHANE."], [null, 'Nobody is chanting today, but nobody looks at you for long either.']],
                    choices: [{ text: 'Leave them to it.', end: true }]
                }
            }
        },

        // ------------------------------------------------------------- Shane the Shamed (CD: every normal goodbye ends "Suffer!")
        shane: {
            name: 'Shane', title: 'the Shamed',
            farewell: 'Suffer!',
            talk: [
                { if: { flags: ['shane_recruited'] }, node: 'home' },
                { if: { flags: ['shane_ledger_found'] }, node: 'ledger' },
                { if: { flags: ['shane_asked_ledger'] }, node: 'waiting' },
                { if: { flags: ['shane_met'] }, node: 'again' },
                { node: 'first' }
            ],
            nodes: {
                first: {
                    lines: [['npc', 'They say it as if shame pays my debts. It does not.']],
                    effects: [{ flag: 'shane_met' }, { available: 'S01' }],
                    choices: [{ text: 'Why are the watch after you?', to: 'accused' }]
                },
                again: {
                    lines: [['npc', 'Back again? Either you like me or you like the chanting.']],
                    choices: [{ text: 'Why are the watch after you?', to: 'accused' }]
                },
                accused: {
                    lines: [
                        ['npc', 'Depends. Are you here to hear their story or help me tell mine?'],
                        ['npc', "I make medicine. Good medicine, cheap enough that people buy it. I never bought the Captain's permit, so the watch took my ledger and every jar I own and put them on a wagon at my own allotment."]
                    ],
                    choices: [{ text: 'What do you need?', to: 'ask' }]
                },
                ask: {
                    lines: [['npc', "My ledger. Everyone who owes me, everyone I owe, every recipe. Two constables sit on that wagon like hens. West lane, past the last house. Get it back and I'm in your debt, which, believe me, is a novel experience for both of us."]],
                    effects: [{ start: 'S01' }, { event: { type: 'story', id: 'shane_asked' } }],
                    choices: [{ text: "I'll get your ledger.", end: true }]
                },
                waiting: {
                    lines: [['npc', 'Still here. Still shamed. The wagon is still west.']],
                    choices: []
                },
                ledger: {
                    lines: [['npc', "That's it! That's my ledger! Look at that, not even a coffee ring. You have no idea what's in here."]],
                    choices: [{ text: "Here's your ledger.", effects: [{ event: { type: 'story', id: 'shane_ledger_returned' } }], to: 'recruit' }]
                },
                recruit: {
                    lines: [
                        ['npc', "Shamefield's had enough of me, and frankly, I've had enough of Shamefield. You have a house? Somewhere with dirt? Good dirt?"],
                        ['npc', "I'll set up a stall. Medicines, ingredients. And once that ground's fit to dig, I'll show you how to grow what I sell. Meet me at your homestead."]
                    ],
                    choices: []
                },
                home: {
                    lines: [['npc', 'Welcome to the finest medicine stall for three miles. It is also the only one.']],
                    effects: [{ flag: 'farm_intro_offered' }],
                    choices: [
                        shop('shane'),
                        { text: 'Tell me about farming.', to: 'farm' }
                    ]
                },
                farm: {
                    lines: [
                        ['npc', "Mend one field plot and I'll give you seed. Plant it, tend it, harvest it, and you'll have ingredients instead of excuses. Two of those and a pot make a remedy. Easy. Mostly."],
                        ['npc', "Here: potatoes, and a few of mine. Mine only grow on your own dirt, and only for people who don't ask what they are. Dry the leaves, bake them into a brownie. Medicinal. Extremely."]
                    ],
                    effects: [{ item: 'Seed Potato', key: 'item:shane_seed_potato' }, { item: 'Cannabis Seed', key: 'item:shane_cannabis_seed' }],
                    choices: [shop('shane')]
                }
            }
        },

        // ------------------------------------------------------------- The Crow-Touched Warden (no farewell)
        warden: {
            name: 'The Crow-Touched Warden', title: 'Keeper of the roost',
            talk: [{ if: { quests: { Q06: 'complete' } }, node: 'warning' }, { node: 'early' }],
            nodes: {
                early: {
                    lines: [['npc', 'You climbed a long way. Look around if you must. Mind the gray one, she bites. Then we will talk.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                warning: {
                    lines: [
                        [null, 'His crows settle along the rafters to listen.'],
                        ['npc', 'There is nothing down there worth another life. Turn back.'],
                        ['npc', 'I don\'t know what you are. The crows saw you wake in the old house, and they have been afraid ever since. I keep this seal so that whatever is behind it stays behind it.']
                    ],
                    choices: [
                        { text: 'What is behind it?', to: 'behind' },
                        { text: "I'll go.", end: true },
                        { text: 'Stand aside. I want what is behind that door.', to: 'challenge' }
                    ]
                },
                behind: {
                    lines: [['npc', 'I was given the key and told never to use it. I never asked why. Some doors you keep shut because you are asked to, and because you love the people down the road.']],
                    choices: [
                        { text: "I'll go.", end: true },
                        { text: 'Stand aside. I want what is behind that door.', to: 'challenge' }
                    ]
                },
                challenge: {
                    lines: [['npc', "Then I'm sorry. For both of us."], [null, 'He lifts his halberd, slowly, as if it weighs more than it used to.']],
                    effects: [{ flag: 'warden_challenged' }],
                    choices: [{ text: '(Draw your weapon.)', end: 'interrupt' }]
                }
            }
        },

        // ------------------------------------------------------------- Orin Vale, mason (after the seal)
        orin: {
            name: 'Orin Vale', title: 'Mason',
            talk: [{ if: { built: ['homestead_gate'] }, node: 'walls' }, { if: { flags: ['orin_met'] }, node: 'again' }, { node: 'first' }],
            nodes: {
                first: {
                    lines: [
                        // DRAFT (Vaelis): Orin came through the fissure when the first seal opened. He wears a mason's
                        // name and works only with plans, materials, labour and Gold.
                        [null, 'A man in a mason\'s apron stands among the old foundations. Black grit still clings to his sleeves, as if he walked out of a chimney.'],
                        ['npc', "Why am I here? Because a door opened. Because old things hear doors. Orin Vale. Mason, if you need a word for it."],
                        ['npc', 'And this place. These foundations are older than the village. Somebody once built something here worth building.']
                    ],
                    choices: [{ text: 'Can it be rebuilt?', to: 'ledger' }]
                },
                ledger: {
                    lines: [['npc', 'Your gate is an insult to masonry. And to insults. One stone at a time. Start with the gate: timber, nails and coin. I\'ve written the figures in this ledger. Mind you keep it.']],
                    effects: [{ item: "Builder's Ledger", key: 'item:builders_ledger' }, { flag: 'orin_met' }, { construction: 'homestead_gate' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                again: {
                    lines: [['npc', 'The gate first. Then we\'ll talk about walls.']],
                    effects: [{ construction: 'homestead_gate' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                // After the gate (Tokelo, 2026-11-03): the walls are the next page of the ledger. DRAFT lines.
                walls: {
                    lines: [['npc', 'A gate with no wall is a polite suggestion. Next, the walls. Stone I can find. Coin you can find.']],
                    effects: [{ construction: 'homestead_walls' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },

        // ------------------------------------------------------------- Shamefield expansion (Vaelis's DRAFT cast; working names)
        // SHAMEFIELD_VILLAGE_LORE_AND_PRODUCTION.md. Talk only: no shops until Rook's bread/beer/pork items exist.
        fenric: {
            name: 'Brother Fenric', title: 'Kloster brewer',
            talk: [{ node: 'hello' }],
            nodes: {
                hello: {
                    lines: [['npc', "Mind the casks. Every one of them is younger than it thinks it is. Brother Fenric. I make the Briarwell Pale, and I argue with the baker."]],
                    choices: [
                        { text: 'Brew a cask of Briarwell Pale (2 Barley, 1 Wild Hops)', say: "I've brought barley and hops. Shall we brew?", if: { quests: { SF1: 'active' } }, stay: true, effects: [{ craft: 'brew_briarwell_pale' }] },
                        { text: 'Oda baked you this.', if: { quests: { SF1: 'active' }, items: ['Shamefield Rye Loaf'] }, effects: [{ removeItem: 'Shamefield Rye Loaf' }, { event: { type: 'story', id: 'fenric_loaf' } }], to: 'sf1_loaf' },
                        { text: "It was rats, nesting under the south wall. They're gone.", if: { quests: { SF2: 'active' }, flags: ['sf2_nest_cleared'] }, effects: [{ event: { type: 'story', id: 'fenric_rats' } }], to: 'sf2_done' },
                        // After Bread and Beer, Fenric lets you brew with him (and sells his own).
                        ...cook('brewery', { quests: { SF1: 'complete' } }), recipeBook('brewery', { quests: { SF1: 'complete' } }), shop('fenric'),
                        { text: 'What do you argue about?', to: 'bread' }, { text: 'The hops look sick at the end of the row.', to: 'hops' }, { text: 'Goodbye.', end: true }
                    ]
                },
                sf1_loaf: {
                    lines: [[null, 'Fenric breaks the loaf, smells it, and chews for a long time.'], ['npc', "...It's good. It's very good. Don't you dare tell her I said so. Tell her it was adequate."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                sf2_start: {
                    lines: [['npc', "Would you? I've stared at those leaves until I'm cross-eyed. Look at the roots, not the leaves. You've younger knees than I have."]],
                    effects: [{ start: 'SF2' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                sf2_done: {
                    lines: [['npc', "Rats. Not the water, not the soil, not the baker. Rats. I'll apologise to Oda. Eventually. Sister Merrow will be unbearable about it."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                bread: {
                    lines: [['npc', 'Oda says I soak good grain in a bucket and call it holy. I say bread is only beer that gave up too soon. The village says: bread for the living, a barrel for the winter. We are both right, which is unbearable.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                hops: {
                    lines: [['npc', "You noticed? Brown at the edges. It's the water, or the soil, or someone who wants me to fail. Sister Merrow says it's my temper. I'll find out."]],
                    choices: [{ text: "I'll find out what's eating them.", if: { quests: { SF2: 'available' } }, to: 'sf2_start' }, { text: 'Goodbye.', end: true }]
                }
            }
        },
        merrow: {
            name: 'Sister Merrow', title: 'Granary steward',
            talk: [{ node: 'hello' }],
            nodes: {
                hello: {
                    lines: [['npc', 'Barley to the brewery, rye to the ovens, and the red-cord sacks to nobody. Sister Merrow. I keep the granary, which mostly means I keep saying no.']],
                    choices: [
                        { text: 'Oda says you might lend me a garden bed.', if: { quests: { SF1: 'active' } }, to: 'sf1_bed' },
                        { text: 'Who are the red-cord sacks for?', to: 'reserve' }, { text: 'Goodbye.', end: true }
                    ]
                },
                sf1_bed: {
                    lines: [
                        ['npc', "For Oda's bet? Of course it is. Everything in this Kloster is a bet between those two. Very well: the bed at the end of the herb garden is yours while you need it. Dig it yourself."],
                        ['npc', 'And take this: a twist of seed barley. Plant it, water it, weed it, and it will grow faster than you would believe. The spring here is good for that.']
                    ],
                    effects: [{ construction: 'briarwell_bed' }, { item: 'Barley Seed', key: 'item:barley_seed' }],
                    choices: [{ text: 'Thank you, Sister.', end: true }]
                },
                reserve: {
                    lines: [['npc', 'For the year the harvest fails. There is always such a year. Brother Fenric would brew them, Oda would bake them, and I would rather everyone were still alive in spring.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        oda: {
            name: 'Oda of the Oven', title: 'Baker',
            talk: [{ node: 'hello' }],
            nodes: {
                hello: {
                    lines: [['npc', "Don't touch, it's hot. Everything here is hot. Oda. If you hear a loaf crack from the square, that's mine."]],
                    choices: [
                        { text: 'The Captain says you and Fenric are at it again.', if: { quests: { SF1: 'available' } }, to: 'sf1_start' },
                        { text: 'Bake a rye loaf (1 Rye Flour, 1 Sourdough Starter)', say: 'May I use your oven?', if: { quests: { SF1: 'active' } }, stay: true, effects: [{ craft: 'bake_rye_loaf' }] },
                        { text: 'Fenric brewed you this.', if: { quests: { SF1: 'active' }, items: ['Briarwell Pale'] }, effects: [{ removeItem: 'Briarwell Pale' }, { event: { type: 'story', id: 'oda_ale' } }], to: 'sf1_ale' },
                        ...cook('oven'), recipeBook('oven'), shop('oda'),
                        { text: 'It smells wonderful.', to: 'crust' }, { text: 'What about the brewer?', to: 'brewer' }, { text: 'Goodbye.', end: true }
                    ]
                },
                sf1_start: {
                    lines: [
                        ['npc', "At it? We're having a disagreement of principle. Fenric says nobody can make a good loaf and a good ale from the same patch of ground. I say a stranger could, before his barley's even dry."],
                        ['npc', "So. Here's my starter: don't drop it. Ask Sister Merrow at the Kloster for a bed to grow barley in. Fenric's own hops are sick, but wild ones climb the fence down by the mill falls."],
                        ['npc', "Rye's in the field behind the square, and the old watermill still turns, if you don't mind grinding it yourself. Bake a loaf in my oven, brew a cask in his, and then we'll see who's right."]
                    ],
                    effects: [{ start: 'SF1' }, { item: 'Sourdough Starter', key: 'item:sourdough_starter' }],
                    choices: [{ text: "You're on.", end: true }]
                },
                sf1_ale: {
                    lines: [[null, 'Oda sniffs the cask, pours a cup, and drinks it all without stopping.'], ['npc', "Hm. Tell him it was drinkable. No. Tell him it was good. No. Tell him nothing, I'll tell him myself. Thank you, stranger. Bread and beer. We were both right, which is unbearable."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                crust: {
                    lines: [['npc', "Dark rye, sourdough, beech fire. The city bakes white bread so soft you could sleep on it. Here, a crust has to survive a week on the road. I'd sell you one, but the Kloster hasn't milled this week's flour yet."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                brewer: {
                    lines: [['npc', 'Fenric? He takes my barley, soaks it, and calls it a sacrament. Still. Tell him the last barrel was good. Don\'t tell him I said so.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        greta: {
            name: 'Greta Rusk', title: 'Butcher',
            talk: [{ node: 'hello' }],
            nodes: {
                hello: {
                    lines: [['npc', "Greta Rusk. Hams, sausage, smoked shoulder. If it was a pig, I've an opinion on it."]],
                    choices: [
                        { text: 'The Captain says you have lost some pigs.', if: { quests: { SF3: 'available' } }, to: 'sf3_start' },
                        { text: 'Your pigs are on their way home.', if: { quests: { SF3: 'active' }, flags: ['pig_bridge_home', 'pig_houses_home', 'pig_church_home'] }, effects: [{ event: { type: 'story', id: 'greta_pigs' } }], to: 'sf3_done' },
                        shop('greta'), { text: 'Could I keep a pig of my own?', to: 'livestock' },
                        { text: 'Business is good?', to: 'salt' }, { text: 'Goodbye.', end: true }
                    ]
                },
                sf3_start: {
                    lines: [
                        ['npc', "Lost? They're not lost. They know exactly where they are. Three of them went over the fence in the night."],
                        ['npc', "One was seen rooting by the plank bridge, one is eating somebody's cabbages by the south houses, and Bishop, the big one, is up by the church, because of course he is. Tell them Greta has crusts. They'll come home."]
                    ],
                    effects: [{ start: 'SF3' }],
                    choices: [{ text: "I'll round them up.", end: true }]
                },
                sf3_done: {
                    lines: [[null, 'Three muddy pigs are already back in the pen, looking pleased with themselves.'], ['npc', "There they are. Not a word of apology between them. Here, you've earned the good sausage. Don't tell the Captain; he thinks he gets the good sausage."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                livestock: {
                    lines: [['npc', "A piglet, a sty, and slops twice a day, and come winter you've pork. A hen's easier: grain, a dry coop, and she pays you in eggs for as long as you're kind to her. I'll sell you either. The sty you build yourself."]],
                    choices: [shop('greta'), { text: 'Goodbye.', end: true }]
                },
                salt: {
                    lines: [['npc', "Good as the salt road. No salt, no smoking, no winter stores. The carts have come late all season. Bragg says it's the road. I say it's somebody on the road."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },

        // ------------------------------------------------------------- Stations (world objects of kind 'station')
        // Places, not people: their choices run the homestead rules (plant / tend / harvest / craft) and story events.
        // The homestead (Tokelo, 2026-11-03): the gate you mend with Orin makes the house safe. Then the bed heals
        // you fully and the old chest keeps what you don't want to carry. DRAFT lines.
        homestead_gate: {
            name: 'The gate', title: 'The Homestead',
            talk: [{ if: { built: ['homestead_gate'] }, node: 'mended' }, { node: 'broken' }],
            nodes: {
                broken: {
                    lines: [[null, 'The gate in the old fence has rotted off its hinges. Anything could walk in and out. Nobody sleeps soundly behind a gate like this.']],
                    choices: [
                        { text: 'Mend it with Orin\'s ledger', if: { flags: ['orin_met'] }, stay: true, effects: [{ construction: 'homestead_gate' }] },
                        { text: 'Leave it.', end: true }
                    ]
                },
                mended: {
                    lines: [[null, 'New oak on old hinges, a bar across, a latch that holds. The homestead is shut to whatever walks the road at night.']],
                    choices: [{ text: 'Leave it.', end: true }]
                }
            }
        },
        home_bed: {
            name: 'Made bed', title: 'The Homestead',
            talk: [{ if: { built: ['homestead_gate'] }, node: 'safe' }, { node: 'unsafe' }],
            nodes: {
                unsafe: {
                    lines: [[null, 'The blanket is pulled tight, the corners tucked. Someone made this bed with care and never slept in it again.'],
                        [null, 'With the gate hanging open, you would not close your eyes here.']],
                    choices: [{ text: 'Leave it.', end: true }]
                },
                safe: {
                    lines: [[null, 'The bed is dry now, and the gate is barred. Here, at least, you can sleep.']],
                    choices: [
                        { text: 'Sleep until morning (restores all HP and resource)', effects: [{ rest: true }], end: true },
                        { text: 'Leave it.', end: true }
                    ]
                }
            }
        },
        home_chest: {
            name: 'Travelling chest', title: 'The Homestead',
            talk: [{ if: { built: ['homestead_gate'] }, node: 'stash' }, { node: 'shut' }],
            nodes: {
                shut: {
                    lines: [[null, 'A chest packed and strapped shut for a journey. It never left the hallway.'],
                        [null, 'Anything you left in it now would be gone by morning. Not with that gate.']],
                    choices: [{ text: 'Leave it.', end: true }]
                },
                stash: {
                    lines: [[null, 'You unbuckle the straps. With the gate barred, what you leave here will still be here when you come back.']],
                    effects: [{ stash: true }],
                    choices: [{ text: 'Close the chest.', end: true }]
                }
            }
        },
        briarwell_bed: {
            name: 'Garden bed', title: 'Briarwell Kloster',
            talk: [{ if: { built: ['briarwell_bed'] }, node: 'bed' }, { node: 'unturned' }],
            nodes: {
                unturned: {
                    lines: [[null, 'A strip of earth by the west wall, full of stones and old roots. Sister Merrow decides who digs here.']],
                    choices: [{ text: 'Leave it.', end: true }]
                },
                bed: {
                    lines: [[null, 'Your bed at the end of the Kloster herb garden: dark earth, turned and weeded. The spring water runs past it in a little stone channel.']],
                    choices: [
                        { text: 'Plant the Barley Seed', if: { items: ['Barley Seed'], plots: { briarwell_bed: 'empty' } }, stay: true, effects: [{ plant: { plot: 'briarwell_bed', seed: 'Barley Seed' } }] },
                        { text: 'Water and weed the barley', if: { plots: { briarwell_bed: 'growing' } }, stay: true, effects: [{ tend: 'briarwell_bed' }] },
                        checkOn('briarwell_bed'),
                        { text: 'Harvest the barley', if: { plots: { briarwell_bed: 'ready' } }, stay: true, effects: [{ harvest: 'briarwell_bed' }] },
                        { text: 'Leave it.', end: true }
                    ]
                }
            }
        },
        // The homestead kitchen and lot (2026-11-02): your own hearth, two fields, a pigsty and a hen coop.
        homestead_hearth: {
            name: 'Cooking hearth', title: 'Your homestead',
            talk: [{ node: 'hearth' }],
            nodes: {
                hearth: {
                    lines: [[null, 'A ring of stones, an iron hook and a blackened pot. Whatever you carry, it will cook.']],
                    choices: [...cook('hearth'), recipeBook('hearth'), { text: 'Leave it.', end: true }]
                }
            }
        },
        homestead_field_west: plotStation('homestead_field_west', 'West field', 'Your west field: dug, raked and waiting.',
            "A strip of old tilled soil gone to weeds. It would take an afternoon with a spade to make it a field again.",
            { plant: 'Plant', tend: 'Water and weed', harvest: 'Harvest it' }),
        homestead_field_east: plotStation('homestead_field_east', 'East field', 'Your east field: dug, raked and waiting.',
            'More old tilled soil, under thistles. Dig it and it is a second field.',
            { plant: 'Plant', tend: 'Water and weed', harvest: 'Harvest it' }),
        homestead_sty: plotStation('homestead_sty', 'Pigsty', 'A mud wallow behind a stout fence, and a trough.',
            "A tumbledown fence round a patch of mud. With timber and a trough it would hold a pig. (Greta Rusk sells piglets.)",
            { plant: 'Put in', harvest: 'Take the pig to slaughter' }),
        homestead_coop: plotStation('homestead_coop', 'Hen coop', 'A dry little coop on legs, straw inside, a ramp to the yard.',
            'Planks and wire where a coop once stood. Mend it and it will keep hens. (Greta Rusk sells them.)',
            { plant: 'Put in', harvest: 'Collect the eggs' }),
        watermill: {
            name: 'The old watermill', title: 'Shamefield',
            talk: [{ node: 'mill' }],
            nodes: {
                mill: {
                    lines: [[null, 'You push the door open. Inside, the wheel still turns the millstones, and they grind whatever is poured into the hopper. Nobody has swept the floor since Old Hob.']],
                    choices: [
                        { text: 'Grind the rye into flour (1 Rye Sheaf)', if: { items: ['Rye Sheaf'] }, stay: true, effects: [{ craft: 'mill_rye_flour' }] },
                        { text: 'I have no rye to grind.', if: { quests: { SF1: 'active' }, notAny: ['Rye Sheaf', 'Rye Flour', 'Shamefield Rye Loaf'] }, stay: true,
                            effects: [{ say: 'The hopper is empty. Cut rye leans in sheaves against the field fence behind the square, east of the fountain. Bring a sheaf back here.' }] },
                        ...cook('mill'),
                        { text: 'Leave it.', end: true }
                    ]
                }
            }
        },
        church_door: {
            name: 'Church door', title: 'Shamefield',
            talk: [{ node: 'door' }],
            nodes: {
                door: {
                    lines: [[null, 'A heavy oak door under a stone arch, shut. Beside it, a slotted box with a painted sign: FOR THE PRIEST. NAMES, PRAYERS, COMPLAINTS.']],
                    choices: [
                        { text: "Leave Elian's letter in the box", if: { items: ["Elian's Letter"] }, effects: [{ removeItem: "Elian's Letter" }, { flag: 'elian_letter_left' }, { event: { type: 'story', id: 'letter_left' } }, { say: 'The letter drops into the box with a soft knock. Somewhere inside, the bell rope stirs in a draught.' }], end: true },
                        { text: 'Leave it.', end: true }
                    ]
                }
            }
        },

        // ------------------------------------------------------------- The Fallen Seraph (Tokelo, 2026-11-04)
        // The robed statue on the fountain in the Kloster's inner courtyard. Stare at it for 2 minutes (gazeRules in
        // src/data.js): a halo at 60 s, six wings at 120 s, and it speaks. Waking it opens the Fallen Seraphim web.
        // "Fallen" because the story calls you evil; the statue answers that with a question, not a verdict.
        seraph_statue: {
            name: 'The Fallen Seraph', title: 'The statue in the courtyard',
            talk: [{ if: { flags: ['seraph_met'] }, node: 'again' }, { if: { flags: ['seraph_awakened'] }, node: 'wake' }, { node: 'still' }],
            nodes: {
                still: {
                    lines: [[null, 'A robed figure in grey stone stands on the fountain, hood drawn low, hands folded over its heart. Water runs from the basin at its feet.'],
                        [null, 'The face under the hood is worn almost smooth. For a moment you are sure it is looking back at you, and waiting.']],
                    choices: [{ text: 'Leave it.', end: true }]
                },
                wake: {
                    lines: [[null, 'The halo over the statue burns white. Stone cracks along its back, and six wings unfold from it: two over its face, two over its feet, two spread wide over the courtyard.'],
                        [null, 'Grey feathers, edged in gold, edged in ash. The fountain stops running.'],
                        ['npc', 'You looked. Nobody looks any more. They pray past me on their way to supper.'],
                        ['npc', 'They will tell you what you are. The crow has a word for it, and the Warden has another. I was given a word too, once: fallen.'],
                        ['npc', 'Here is what I learned on the way down. Evil is only a good that someone else did not choose.'],
                        ['npc', 'Take my light, little shell. It is heavier than it looks, and it burns whoever carries it.']],
                    effects: [{ flag: 'seraph_met' }, { legend: 'fallen_seraphim' }],
                    choices: [
                        { text: 'Why did you fall?', to: 'why' },
                        { text: 'Am I evil?', to: 'evil' },
                        { text: 'I will carry it.', to: 'carry' }
                    ]
                },
                why: {
                    lines: [['npc', 'I was asked to guard a door and I opened it, because the ones outside were cold. Heaven called that a sin. The ones outside called it spring.']],
                    choices: [{ text: 'Am I evil?', to: 'evil' }, { text: 'I will carry it.', to: 'carry' }]
                },
                evil: {
                    lines: [['npc', 'You are what you do next. The names come afterwards, and they are written by whoever is left standing.']],
                    choices: [{ text: 'Why did you fall?', to: 'why' }, { text: 'I will carry it.', to: 'carry' }]
                },
                carry: {
                    lines: [[null, 'The wings fold around you, and then they are gone. Between your shoulder blades you feel six places where something should be, and is not yet.'],
                        ['npc', 'Come back when you are heavier. I will still be here. I am very good at standing still.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                again: {
                    lines: [[null, 'Six stone wings stand folded over the fountain, and a ring of pale light hangs above the hood.'],
                        ['npc', 'Still carrying it? Good. It gets lighter the more of it you give away.']],
                    choices: [{ text: 'Why did you fall?', to: 'why' }, { text: 'Am I evil?', to: 'evil' }, { text: 'Goodbye.', end: true }]
                }
            }
        },

        // ------------------------------------------------------------- The crow: Nahemoth's first aspect
        // Talked to from a menu (talk_crow), not a map sprite. Lines are Vaelis's DRAFT; spoiler-safe.
        crow: {
            name: 'The Crow', title: 'Nahemoth, the First Shell',
            when: { flags: ['aspect_nahemoth'] },
            talk: [{ if: { flags: ['crow_met'] }, node: 'again' }, { node: 'first' }],
            nodes: {
                first: {
                    lines: [['npc', "Well? You've got questions. Everyone who breaks a seal has questions."]],
                    effects: [{ flag: 'crow_met' }],
                    choices: [
                        { text: 'Are you one of his birds?', to: 'birds' },
                        { text: 'What are you?', to: 'what' },
                        { text: 'Can you take me somewhere I haven\'t seen?', to: 'travel' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                again: {
                    lines: [['npc', 'Still here. Still a crow. Mostly.']],
                    choices: [
                        { text: 'What are you?', to: 'what' },
                        { text: 'How does the flight work?', to: 'travel' },
                        { text: 'The Warden\'s birds.', to: 'warden' },
                        { text: 'What about the homestead?', to: 'home', if: { flags: ['anchor:homestead'] } },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                birds: {
                    lines: [['npc', "No. His birds loved him. I merely borrowed the shape. There's a difference."]],
                    choices: [{ text: 'What are you, then?', to: 'what' }, { text: 'Goodbye.', end: true }]
                },
                what: {
                    lines: [['npc', 'The part of the world that remembers where you have stepped.']],
                    choices: [{ text: 'Where can you take me?', to: 'travel' }, { text: 'Goodbye.', end: true }]
                },
                travel: {
                    lines: [
                        ['npc', "I can take you somewhere you've *been*. I am a crow, not your imagination."],
                        ['npc', 'The homestead, always. Anywhere else, you have to stand there first and mark it: a well, a stone, a place people come back to.']
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                warden: {
                    lines: [['npc', "The other birds stayed with him. You'll notice I did not. It isn't because I lack manners."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                home: {
                    lines: [['npc', 'Ah. That place. The stones are waiting for someone to remember how to stack them. You look suspiciously unemployed.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        }
    };

    // Black Flight anchors (Nahemoth design): safe arrival points by story id. The flag 'anchor:<id>' attunes one.
    // The homestead is attuned when the seal opens; others by visiting their marked place (triggers below).
    const anchors = {
        homestead: { name: 'The Homestead', region: 'The Forgotten Homestead', map: 'grounds', spawn: 'from_house' },
        shamefield: { name: 'Shamefield, the village well', region: 'Shamefield Vale', map: 'shamefield', spawn: 'flight_well' }
    };

    const triggers = [
        { id: 'old_cellar_purse', on: { type: 'inspect', id: 'cellar_old_purse' }, effects: [{ gold: 10, key: 'old_cellar_purse' }] },
        { id: 'chant', on: { type: 'enter', id: 'shamefield' }, effects: [
            { say: "Somewhere near the well, a crowd is chanting: 'Shame on Shane! Shame on Shane!'" },
            { available: 'S01' }
        ] },
        { id: 'notice_board', on: { type: 'inspect', id: 'village_notice_board' }, effects: [{ start: 'J01' }, { start: 'J02' }] },
        { id: 'anchor_shamefield', on: { type: 'inspect', id: 'village_well' }, effects: [{ flag: 'anchor:shamefield' }] },
        { id: 'register', on: { type: 'inspect', id: 'tollway_register' }, effects: [{ flag: 'register_carried' }] },
        // Get to know the locals: the pigs only stand in the village while SF3 is active, so their first look is the catch.
        { id: 'pig_bridge', on: { type: 'inspect', id: 'stray_pig_bridge' }, if: { quests: { SF3: 'active' } }, effects: [{ flag: 'pig_bridge_home' }, { say: "You mention crusts. The pig considers this, then trots off toward Baker's Lane." }] },
        { id: 'pig_houses', on: { type: 'inspect', id: 'stray_pig_houses' }, if: { quests: { SF3: 'active' } }, effects: [{ flag: 'pig_houses_home' }, { say: 'You scratch it behind the ear. It leaves the cabbages with obvious regret and wanders home.' }] },
        { id: 'pig_church', on: { type: 'inspect', id: 'stray_pig_church' }, if: { quests: { SF3: 'active' } }, effects: [{ flag: 'pig_church_home' }, { say: 'Bishop looks at you for a long moment, sighs like an old man, and walks slowly back down the hill.' }] },
        { id: 'rat_nest', on: { type: 'defeat', id: 'cloister_rat_nest' }, effects: [{ flag: 'sf2_nest_cleared' }, { say: 'Under the wall, a nest of shredded barley sacks and hop roots. Nothing else will be chewing on the Kloster this year.' }] },
        { id: 'mill_shade', on: { type: 'defeat', id: 'mill_shade' }, effects: [{ flag: 'mill_quiet' }, { say: 'The singing stops in the middle of a verse. For a moment the falls sound almost like applause. Then just like water.' }] },
        // The Warden: DRAFT aftermath from the narrative foundation (Vaelis owns the final lines).
        { id: 'warden_falls', on: { type: 'defeat', id: 'sanctuary_warden' }, effects: [
            { say: "The Warden kneels. 'Easy now, little ones. There is no need to follow me.'", important: true },
            { say: 'The crows do not attack you. They circle his body, settle on his hands, and fall silent.', important: true },
            { say: 'In his fist is a key shaped like a feather.' },
            { item: 'Seal-Key of the First Echo', key: 'item:crow_warden_memory_key' },
            { flag: 'warden_dead' },
            { flag: 'crow_warden_memory_key' }
        ] }
    ];

    const chapter1 = {
        id: 'ch1',
        title: 'Chapter One: The Road to Shamefield',
        defaultName: 'The Wanderer',            // lore-neutral default for a blank name (never the old ruler's name)
        appearances: [                          // cosmetic only (CH1 doc §A); the renderer maps these to palettes
            { id: 'ash', label: 'Ash' },
            { id: 'ember', label: 'Ember' },
            { id: 'umber', label: 'Umber' },
            { id: 'pale', label: 'Pale' }
        ],
        start: { effects: [{ start: 'Q01' }] },
        // Merchant ids for Rook's shopDefinitions (CH1-04): mara, bragg, iona, shane. Construction: homestead_gate (CH1-05).
        merchants: { mara: 'Mara', bragg: 'Bragg', iona: 'Iona', shane: 'Shane', oda: 'Oda', greta: 'Greta', fenric: 'Fenric' },
        quests, npcs, triggers, anchors
    };

    (ENSO.story || (ENSO.story = {})).chapter1 = chapter1;
    if (isNode) module.exports = chapter1;
})(typeof window !== 'undefined' ? window : globalThis);
