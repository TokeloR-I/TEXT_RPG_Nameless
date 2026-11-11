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
 * 20+25+40+30 = 115, plus the strongbox looters on Q05 (40, Tokelo 2026-11-02): total 290 = level 3.
 * The road to the Warden (Tokelo 2026-11-04) adds the climb's gates (68+24) and the orchard lookouts (116):
 * total 498 = level 4. The Broken Crown rework (2026-11-11, CHAPTER_ONE_NARRATIVE_REWORK.md) adds C1-N02 and C1-N04
 * (25 + 20) and keeps the six Shamefield favours optional: total 543 = level 4. The rest of the master brief adds
 * C1-N03 and C1-N05 (20 + 15), the festival raid (48), Sergeant Kess (80) and the sanctuary siege (40): total 746,
 * still level 4 (tests/32-chapter-one.test.js traces it).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const LOCALS = ['SF1', 'SF2', 'SF3', 'SF4', 'SF5', 'SF6'];   // the households Get to Know the Locals counts
    // Households that must vouch for you before the Captain opens the north road on the village route (Broken Crown
    // rework 2026-11-11: never all six; two is the doc's working number, a candidate for Gauge).
    const VOUCH = 2;
    // What Oda's festival meal does, read from the item itself (C1-N03 explains the buff in its own numbers).
    const FESTIVAL_MEAL = (((isNode ? require('../data.js') : ENSO.data) || {}).itemDefinitions || {})['Leberkäsbrötchen']?.effectText || 'a meal buff';
    // Caelith's five holy weapons and how he names them (Fallen Seraphim; offered at waking since 2026-11-09).
    const HOLY = [['Emberward', 'The greatsword. I guarded the fire with it, once.'], ['Spear of the Altar Fire', 'The spear. It reaches further than you think.'],
        ['Twin Pinions', 'The two feather blades. Quick, like falling.'], ['Censer of Ash', 'The censer staff. Light, given away as smoke.'],
        ['Grey Feather Scythe', 'The scythe. Even the holy have harvests.']];
    // Asked for at the statue until you have one (never after the full-mastery offer has been heard).
    const GIFT_CHOICE = { text: 'You said the light was heavy. Is there anything to carry it in?', if: { notFlags: ['seraph_weapon_chosen', 'seraph_heard_six'] }, to: 'gift' };
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
            summary: 'The house is empty, set for two. The grounds around it hide something much older, and someone has been digging at it.',
            objectives: [
                // The Broken Crown rework (CHAPTER_ONE_NARRATIVE_REWORK.md, Act I): the required look is also the clue, so
                // nobody can miss it. Someone searched the grounds before you woke, and left a salvage notice behind.
                { id: 'grounds', text: 'Look over the ruined grounds', on: { type: 'inspect', id: 'grounds_foundation' }, marker: { map: 'grounds', x: 11, y: 12 },
                    effects: [
                        { say: 'Around the stone the turf has been cut with a spade, and not long ago. Mortar dust lies where someone pried at the old footing.' },
                        { say: 'Footprints lead off toward the road. Under a loose block, someone has left a scrap of paper behind: a salvage notice, stamped with a seal you do not know.' },
                        { item: 'Torn Salvage Order', key: 'item:salvage_order' }
                    ] },
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
            // The Broken Crown rework (2026-11-11): the register is evidence now. Its forged clearances start the hunt for
            // whoever is sending armed men north (C1-N02), and the households can be helped any time, before or after.
            onComplete: [{ gold: 8, key: 'orchard_register' }, ...LOCALS.map((q) => ({ available: q })), { start: 'C1-N02' }]
        },
        // ------------------------------------------------------------- The Broken Oath (Broken Crown rework, 2026-11-11)
        // CHAPTER_ONE_NARRATIVE_REWORK.md Acts III-IV and CHAPTER_ONE_DEVELOPMENT_MASTER_BRIEF.md §3 (its provisional ids).
        // Two ways north, and either opens the gate once: the story route (Elian names the seal, the courier, the orders)
        // or the village route (two households vouch for you; the Captain's L01 deal). XP is a candidate for Gauge.
        'C1-N02': {
            title: 'The Ash on the Register', kind: 'main', xp: 25, candidate: true,
            summary: 'The tollway register is full of forged clearances for the north road, all under one seal. The Captain will open the gate for proof of who sent them, or for the word of the village.',
            objectives: [
                { id: 'seal', text: 'Ask Elian whose seal is on the forged clearances', on: { type: 'story', id: 'oath_seal_named' }, marker: { map: 'shamefield', x: 20, y: 9 },
                    skipIf: { flags: ['village_vouched'] } },
                { id: 'courier', text: 'Find the man in the grey cloak who was asking after the register', on: { type: 'story', id: 'oath_orders_taken' }, marker: { map: 'shamefield', x: 24, y: 5 },
                    skipIf: { flags: ['village_vouched'] } },
                { id: 'report', text: 'Bring the Watch Captain proof, or the word of two households you helped', on: { type: 'story', id: 'north_route_cleared' }, marker: { map: 'shamefield', x: 17, y: 4 } }
            ],
            // The Captain keeps his word, the day after the festival (C1-N03 opens the gate).
            onComplete: [{ start: 'C1-N03' }]
        },
        // C1-N03 (master brief §3, §4, §11): Oda's cooking lesson, the memorial, and the raid. Protect the people or
        // chase the roll: both reach Corvin, and Shamefield remembers which you chose. Skipped lesson steps: a run that
        // already finished A Proper Meal (SF6) has had the lesson. XP and rewards are candidates for Gauge.
        'C1-N03': {
            title: 'The Festival in Ash', kind: 'main', xp: 20, candidate: true,
            summary: 'Shamefield keeps the Festival of the Sun: one year since the heroes broke the old crown. The Captain will open the gate after it. Oda wants a hand at the tables.',
            objectives: [
                { id: 'lesson', text: 'Help Oda with the festival tables', on: { type: 'story', id: 'festival_lesson' }, marker: { map: 'village_residential_lane', x: 17, y: 6 },
                    skipIf: { quests: { SF6: 'complete' } } },
                { id: 'cook', text: 'Cook a Leberkäsbrötchen at the festival hearth in the square (Pork and a Brötchen)', on: { type: 'craft', id: 'cook_leberkaese' }, marker: { map: 'shamefield', x: 13, y: 10 },
                    skipIf: { quests: { SF6: 'complete' } } },
                { id: 'eat', text: 'Eat it (Esc, then Items) and feel the buff', on: { type: 'eat', id: 'Leberkäsbrötchen' }, marker: { map: 'shamefield', x: 13, y: 10 },
                    skipIf: { quests: { SF6: 'complete' } },
                    effects: [{ flag: 'festival_fed' }, { say: `(Leberkäsbrötchen: ${FESTIVAL_MEAL}. A meal buff runs out, so eat just before a hard fight.)`, important: true }] },
                { id: 'memorial', text: 'Join Tamsin at the memorial stone for the names', on: { type: 'story', id: 'raid_choice' }, marker: { map: 'shamefield', x: 15, y: 12 } },
                { id: 'stalls', text: 'Drive the raiders away from the stalls', on: { type: 'defeat', id: 'festival_raiders' }, marker: { map: 'shamefield', x: 26, y: 10 },
                    skipIf: { flags: ['festival_pursue'] } },
                { id: 'thief', text: 'Catch the thief with the memorial roll before the north stair', on: { type: 'defeat', id: 'festival_thief' }, marker: { map: 'shamefield', x: 22, y: 4 },
                    skipIf: { flags: ['festival_protect'] } },
                { id: 'captain', text: 'Find the Watch Captain', on: { type: 'story', id: 'festival_debrief' }, marker: { map: 'shamefield', x: 17, y: 4 } }
            ],
            onComplete: [
                { gold: 10, key: 'festival_supplies' },
                { when: { flags: ['festival_protect'] }, item: 'Bratwurst', key: 'item:festival_greta' },
                { flag: 'north_gate_open' }, { say: 'Somewhere north, a chain rattles and a gate swings open.' }, { start: 'C1-N04' }]
        },
        'C1-N04': {
            title: 'An Oath in Ash', kind: 'main', xp: 20, candidate: true,
            summary: 'The Broken Oath are moving men and chains up the climb to Featherwatch, where the Warden keeps his seal. Someone is giving the orders.',
            objectives: [
                // Sergeant Kess, the Ash-Marked (master brief §3): the supply post in the orchard, an elite fight.
                { id: 'kess', text: 'Break the Broken Oath supply post in the orchard', on: { type: 'defeat', id: 'orchard_kess' }, marker: { map: 'orchard', x: 16, y: 5 } },
                { id: 'corvin', text: 'Find whoever leads the Broken Oath at the foot of the climb', on: { type: 'talk', id: 'corvin' }, marker: { map: 'featherwatch', x: 11, y: 18 } },
                { id: 'rearguard', text: 'Break the Oathbound rearguard holding the climb', on: { type: 'defeat', id: 'featherwatch_rearguard' }, marker: { map: 'featherwatch', x: 5, y: 14 } }
            ],
            onComplete: [{ start: 'C1-N05' }]
        },
        // C1-N05 (master brief §3): the Broken Oath reached the roost first. The Warden is not weakened by it.
        'C1-N05': {
            title: 'A Sanctuary Under Siege', kind: 'main', xp: 15, candidate: true,
            summary: "Corvin's men went up the climb ahead of you. The Warden's sanctuary, and the birds he keeps there, are paying for it.",
            objectives: [
                { id: 'siege', text: 'Drive the Oathbound out of the sanctuary', on: { type: 'defeat', id: 'sanctuary_siege' }, marker: { map: 'sanctuary', x: 11, y: 10 } },
                { id: 'cages', text: 'See what they did to the cages', on: { type: 'inspect', id: 'sanctuary_broken_cages' }, marker: { map: 'sanctuary', x: 16, y: 8 } }
            ],
            onComplete: [{ start: 'Q06' }]
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
                        { say: "Crow: 'You broke a seal that was meant to hold. Consider me impressed. Or concerned. I haven't decided.'", important: true },
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
            // The Broken Crown rework, Act V: the gate is the beginning of something, and two factions notice.
            onComplete: [
                { say: 'Orin brushes soil from the new footing and frowns at the old stone beneath it. "I know this cut."', important: true },
                { say: 'You ask him whether he means the stone. "The hand that laid it," Orin says. "That\'s the troubling part."', important: true },
                { say: 'The crow lands on the new gatepost. "There are more pieces of what you lost. The roads east still remember your footsteps."', important: true },
                // The Broken Oath answer what you did on the climb (C1-N04).
                { when: { flags: ['corvin_challenged'] }, say: 'Word comes up from Shamefield: the grey robes have left the causeway. Corvin Sere is asking who stopped his men, and where they sleep.' },
                { when: { flags: ['corvin_deceived'] }, say: 'Word comes up from Shamefield: a quartermaster in an old coat is asking after a stranger who claimed to speak for the watch.' },
                { when: { flags: ['corvin_bargained'] }, say: 'Someone has pushed a note under your new gate: an open circle drawn in ash, and three words. WHERE IS IT?' },
                { when: { notFlags: ['corvin_challenged', 'corvin_deceived', 'corvin_bargained'] }, say: 'Word comes up from Shamefield: the grey robes have left the causeway, and are asking about a stranger instead.' },
                // Sergeant Kess, as you left the sergeant in the orchard.
                { when: { flags: ['kess_captured'] }, say: 'The watch has Sergeant Kess in the tavern cellar. The Captain calls it the best-guarded beer in the vale.' },
                { when: { flags: ['kess_released'] }, say: 'Nobody has seen Sergeant Kess since the orchard. Somebody left a Crown sergeant\'s badge on the memorial stone.' },
                // The Sworn Band answer the Warden's death. The Sunbearer stays unnamed in Chapter One (lore bible 4.3).
                { say: 'Far to the south, in a camp under the sun banner, a rider hands over a report: a Warden dead at Featherwatch, a seal broken, someone living in the old house in the vale.', important: true },
                { say: 'The Sunbearer reads it twice. "Not the Broken Oath. They would have kept the key." She folds it away. "Send someone to the vale. Quietly."', important: true },
                { flag: 'chapter_one_complete' }, { start: 'Q08' }]
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
            // Main path from Tokelo 2026-11-04 until the Broken Crown rework (2026-11-11): all six favours are optional now.
            // Two of them are enough for the Captain to trust you with the road (C1-N02); all six earn the village's thanks.
            // The six favours teach farming, brewing, baking, cooking and eating along the way.
            title: 'Get to Know the Locals', kind: 'side', xp: 20, candidate: true,
            summary: "Half of Shamefield is on the Watch Captain's back. Help two households and he'll trust you with the north road; help all six and the whole village will thank you.",
            objectives: [
                { id: 'favours', text: 'Help six Shamefield households', on: { type: 'quests', ids: LOCALS, count: LOCALS.length } },
                { id: 'report', text: 'Tell the Watch Captain you know the locals now', on: { type: 'story', id: 'locals_reported' }, marker: { map: 'shamefield', x: 17, y: 4 } }
            ],
            onComplete: [{ gold: 15, key: 'locals_reward' }, { flag: 'shamefield_friend' }, { item: 'Cheese', key: 'item:l01_cheese' }, { item: 'Fresh Milk', key: 'item:l01_milk' },
                { say: 'Word goes round the village. Bragg the smith wants a word with you: Shamefield has paid him for something.' }]
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
        // A Proper Meal (Tokelo 2026-11-04: buying bread and not knowing what to do with it). Teaches the hearth and eating.
        SF6: {
            title: 'A Proper Meal', kind: 'side', xp: 10, candidate: true,
            summary: "Oda caught you eating a plain Brötchen in the street and took it personally. A roll is half a meal: she wants to see you cook the other half.",
            objectives: [
                { id: 'hearth', text: 'Cook a Leberkäsbrötchen at the hearth on your homestead (Pork and a Brötchen)', on: { type: 'craft', id: 'cook_leberkaese' }, marker: { map: 'grounds', x: 17, y: 6 } },
                { id: 'eat', text: 'Eat it (Esc, then Items) and feel the buff', on: { type: 'eat', id: 'Leberkäsbrötchen' }, marker: { map: 'grounds', x: 17, y: 6 }, effects: [{ flag: 'sf6_ate' }] },
                { id: 'oda', text: 'Tell Oda you ate properly', on: { type: 'story', id: 'oda_meal' }, marker: { map: 'village_residential_lane', x: 17, y: 6 } }
            ],
            onComplete: [{ item: 'Brezel', key: 'item:sf6_brezel_1' }, { item: 'Brezel', key: 'item:sf6_brezel_2' }]
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
        // The Trial of the Live Coal (Fallen Seraphim, Tokelo 2026-11-04): the second half of the legendary web is earned.
        // Caelith offers it once you are a Watcher; heaven's altar-warden waits in the courtyard. Winning opens the sealed
        // nodes (skillWeb.legendaryWebs.fallen_seraphim.trial) and with them the capstones and the six wings.
        QS1: {
            title: 'The Trial of the Live Coal', kind: 'side', xp: 300,
            summary: 'Caelith says heaven has noticed the light it gave you. Its altar-warden is coming to take it back. Beat it, and the rest of your wings are yours.',
            objectives: [
                { id: 'face', text: 'Defeat Aurevain, Warden of the Altar, in the Kloster courtyard', on: { type: 'defeat', id: 'kloster_trial' }, marker: { map: 'kloster_inner', x: 19, y: 15 } }
            ],
            onComplete: [
                { flag: 'seraph_trial_won' },
                { say: 'Aurevain falls to one knee, and the light goes out of its spear. "Then carry it," it says, "and see how heavy it gets." It is gone. On the stones, four grey feathers.', important: true },
                { say: 'The rest of the Fallen Seraphim web is open to you.', notice: 'quest' }
            ]
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
    // Elian in Shamefield: SF5, and the seal on the forged clearances (C1-N02).
    const ELIAN_VILLAGE = [
        { text: 'Do you know this seal? It is on every forged clearance in the register.', if: { quests: { 'C1-N02': 'active' }, notFlags: ['oath_courier_seen', 'salvage_shown_elian'] }, to: 'seal' },
        { text: 'Do you know this seal? It is on every forged clearance in the register.', if: { quests: { 'C1-N02': 'active' }, flags: ['salvage_shown_elian'], notFlags: ['oath_courier_seen'] }, to: 'seal_known' },
        { text: 'The Captain says you keep looking at the church.', if: { quests: { SF5: 'available' } }, to: 'sf5_start' },
        { text: 'Your letter is at the church.', if: { quests: { SF5: 'active' }, flags: ['elian_letter_left'] }, effects: [{ event: { type: 'story', id: 'elian_letter_done' } }], to: 'sf5_done' },
        { text: 'Tell me about the heroes again.', to: 'heroes_v' }, { text: 'Goodbye.', end: true }
    ];
    // C1-N02: either way you deal with the courier, his orders come with you (once) and the step is done.
    const ORDERS = (how) => [{ flag: how }, { flag: 'oath_orders_taken' }, { item: 'Ash-Marked Orders', key: 'item:ash_marked_orders' }, { event: { type: 'story', id: 'oath_orders_taken' } }];
    // C1-N04: what you can say to Corvin Sere until he leaves. Each approach ends the talk and is remembered (Q07).
    const CORVIN = [
        { text: 'What does it mean?', if: { notFlags: ['corvin_gone'] }, to: 'mark' },
        { text: 'Who are you?', if: { notFlags: ['corvin_gone'] }, to: 'who' },
        { text: "Your courier didn't get far.", if: { flags: ['oath_courier_caught'], notFlags: ['corvin_gone'] }, to: 'courier' },
        { text: 'Your courier led me straight to his drop.', if: { flags: ['oath_courier_tracked'], notFlags: ['corvin_gone'] }, to: 'courier_followed' },
        { text: "Your men won't reach the Warden. I'll stop them.", if: { notFlags: ['corvin_gone'] }, to: 'challenge' },
        { text: 'The watch sent me. Your clearances are good.', if: { notFlags: ['corvin_gone'] }, to: 'deceive' },
        { text: 'What do you want with the Warden?', if: { notFlags: ['corvin_gone'] }, to: 'bargain' },
        { text: 'Goodbye.', end: true }
    ];
    // Sergeant Kess, beaten in the orchard (C1-N04): hand the sergeant to the watch, or let the sergeant go.
    const KESS = [
        { text: 'Why follow Corvin?', to: 'why' },
        { text: 'Tie Kess up for the watch.', effects: [{ flag: 'kess_captured' }, { flag: 'kess_resolved' }], to: 'bound' },
        { text: "Get up. Go, and don't come back.", effects: [{ flag: 'kess_released' }, { flag: 'kess_resolved' }], to: 'released' }
    ];
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
            talk: [
                { if: { flags: ['elian_in_village', 'warden_admitted'] }, node: 'after_admit' },
                { if: { flags: ['elian_in_village', 'warden_dead'] }, node: 'after_warden' },
                { if: { flags: ['elian_in_village'] }, node: 'village' }, { node: 'road' }],
            nodes: {
                road: {
                    lines: [
                        ['npc', "Easy! You came out of the fog like a ghost. Sit, if you like. The goblins on the bridge won't come this side of the water."],
                        ['npc', "You look like you've been asleep a hundred years. Have you even heard? The heroes did it. The old lord is dead and his crown is broken. A year ago now."]
                    ],
                    choices: [
                        { text: 'Who were the heroes?', to: 'heroes' },
                        { text: 'What lord?', to: 'lord' },
                        { text: 'Was it all bad, under the old crown?', to: 'crown' },
                        // Act I clue (Broken Crown rework): show him the salvage notice, or keep it to yourself.
                        { text: 'Someone has been digging at my house. They left this.', if: { items: ['Torn Salvage Order'], notFlags: ['salvage_shown_elian'] }, effects: [{ flag: 'salvage_shown_elian' }], to: 'salvage' },
                        { text: 'Where does this road go?', to: 'road_on' },
                        { text: "I'm going on to the village.", effects: [{ event: { type: 'story', id: 'elian_journey' } }], to: 'farewell' }
                    ]
                },
                // The Broken Crown rework: an honest witness, not a lore speech. Roads were safe; people still vanished.
                crown: {
                    lines: [['npc', "There were roads you could travel without fear under the crown. And there were people who walked them and never arrived."],
                        ['npc', "I keep a list of their names. I'd trade the whole road to have one of them back."]],
                    choices: [{ text: 'Who were the heroes?', to: 'heroes' }, { text: 'Where does this road go?', to: 'road_on' }, { text: "I'm going on to the village.", effects: [{ event: { type: 'story', id: 'elian_journey' } }], to: 'farewell' }]
                },
                salvage: {
                    lines: [[null, 'Elian turns the notice to the light, and his mouth goes thin.'],
                        ['npc', "Salvage. Deserters dig up anything with the old crown's stamp on it and sell it: records, seals, dressed stone. Someone pays well for it."],
                        ['npc', "Ask the Watch Captain in Shamefield who's buying. Or Mara: she knows every cart on this road."]],
                    choices: [{ text: 'What lord?', to: 'lord' }, { text: 'Where does this road go?', to: 'road_on' }, { text: "I'm going on to the village.", effects: [{ event: { type: 'story', id: 'elian_journey' } }], to: 'farewell' }]
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
                    choices: ELIAN_VILLAGE
                },
                // C1-N02, the story route: he knows the seal on the forged clearances. Remembers your salvage notice if you showed it.
                seal: {
                    lines: [['npc', "That's a supply office stamp. The old crown's quartermasters put it on every wagon going north."],
                        ['npc', "And someone was asking after that register this morning. Grey cloak, ash on his sleeves. He's still about, up by the church."]],
                    effects: [{ flag: 'oath_courier_seen' }, { event: { type: 'story', id: 'oath_seal_named' } }],
                    choices: [{ text: "I'll find him.", end: true }]
                },
                seal_known: {
                    lines: [['npc', "That's the stamp from your salvage notice. A quartermaster's seal: the old crown put it on every wagon going north."],
                        ['npc', "And someone was asking after that register this morning. Grey cloak, ash on his sleeves. He's still about, up by the church."]],
                    effects: [{ flag: 'oath_courier_seen' }, { event: { type: 'story', id: 'oath_seal_named' } }],
                    choices: [{ text: "I'll find him.", end: true }]
                },
                // After the Warden: his tone follows what you told Tamsin.
                after_admit: {
                    lines: [['npc', "Tamsin says you told her yourself. About the Warden."], ['npc', "That's more than most would do. I don't know what else to say to you yet."]],
                    choices: ELIAN_VILLAGE
                },
                after_warden: {
                    lines: [['npc', "The crows went north and didn't come back. Nobody knows what happened up there."], ['npc', "Or nobody's saying."]],
                    choices: ELIAN_VILLAGE
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
                // C1-N03: the memorial names, once you've eaten (or had Oda's lesson before), then the raid.
                { if: { quests: { 'C1-N03': 'active' }, notFlags: ['raid_started'], any: [{ flags: ['festival_fed'] }, { quests: { SF6: 'complete' } }] }, node: 'festival' },
                { if: { quests: { 'C1-N03': 'active' }, notFlags: ['raid_started'] }, node: 'festival_early' },
                { if: { quests: { 'C1-N03': 'active' }, notFlags: ['raid_over'] }, node: 'festival_raid' },
                { if: { flags: ['raid_over', 'festival_protect'], notFlags: ['tamsin_festival_after', 'warden_dead'] }, node: 'festival_after_protect' },
                { if: { flags: ['raid_over'], notFlags: ['tamsin_festival_after', 'warden_dead'] }, node: 'festival_after_pursue' },
                // Overheard, once (master brief §7.1): before the Warden's death, and never by name.
                { if: { quests: { Q05: 'complete' }, notFlags: ['warden_dead', 'heard_tamsin_children'], any: [{ flags: ['raid_over'] }, { quests: { 'C1-N03': 'unseen' } }] }, node: 'children' },
                { if: { flags: ['warden_dead'], notFlags: ['tamsin_mourned'] }, node: 'mourning' },
                { if: { flags: ['warden_admitted'] }, node: 'after_admit' },
                { if: { flags: ['warden_dead'] }, node: 'after_other' },
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
                        { text: 'What was it like, under the old crown?', to: 'crown' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                crown: {
                    lines: [['npc', "Depends who you ask. Bragg had steady work, and Iona had empty beds."],
                        ['npc', "I remember the bell ringing for people who didn't come home. We hold the festival anyway. You have to hold something."]],
                    choices: [{ text: 'Where can I get supplies?', to: 'supplies' }, { text: 'Goodbye.', end: true }]
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
                // C1-N03, the Festival of the Sun (master brief §11). DRAFT lines for Wick.
                festival_early: {
                    lines: [['npc', "Not yet. Nobody hears the names hungry: that's the rule."],
                        ['npc', "Oda's at her oven in the lane. Go and be useful, then come back to the stone."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                festival: {
                    lines: [
                        [null, 'Bunting hangs from the raven tree. Somebody has hung a sun banner over the memorial stone, and Fenric has rolled a cask down from the Kloster.'],
                        ['npc', "The Festival of the Sun. One year since the heroes broke the old crown. We eat, we drink, and then we read the names."],
                        ['npc', "Elian brought more. People nobody here remembers. That's why they need reading."]
                    ],
                    choices: [{ text: 'Read them.', to: 'festival_names' }]
                },
                festival_names: {
                    lines: [
                        [null, 'Tamsin reads from the memorial roll. Elian stands by the stone and mouths each name a moment before she says it.'],
                        [null, 'Halfway down the list, the church bell starts ringing the wrong way: fast, and all at once.'],
                        ['npc', "Ash on their sleeves. They're at the stalls!"],
                        [null, 'Across the square the Watch Captain drops his mug. "Put that down! Not the mug, the crossbow. Gods, I need a better posting."'],
                        [null, 'Grey robes are shoving people away from the stalls. One snatches the roll out of Tamsin\'s hands and runs for the north stair.']
                    ],
                    choices: [
                        { text: 'Protect the people at the stalls.', effects: [{ flag: 'raid_started' }, { flag: 'festival_protect' }, { event: { type: 'story', id: 'raid_choice' } }], end: 'interrupt' },
                        { text: 'Go after the one with the roll.', effects: [{ flag: 'raid_started' }, { flag: 'festival_pursue' }, { event: { type: 'story', id: 'raid_choice' } }], end: 'interrupt' }
                    ]
                },
                festival_raid: {
                    lines: [['npc', "Don't stand there talking to an old woman. Go!"]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                festival_after_protect: {
                    lines: [['npc', "We celebrated being free. They chose tonight to remind us what we survived."],
                        ['npc', "You stood between them and the stalls. People saw. Now go and get our names back."]],
                    effects: [{ flag: 'tamsin_festival_after' }],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                festival_after_pursue: {
                    lines: [['npc', "We celebrated being free. They chose tonight to remind us what we survived."],
                        ['npc', "You brought the names back. Greta will forgive you for her stall. Eventually. Maybe."]],
                    effects: [{ flag: 'tamsin_festival_after' }],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                children: {
                    lines: [[null, 'Tamsin is telling three children to stop throwing crab apples at the raven tree.'],
                        ['npc', "...and the Warden set your cousin's arm himself, up at the roost, and wouldn't take a coin. So no. He does not eat children."],
                        [null, 'The smallest child looks deeply disappointed.']],
                    effects: [{ flag: 'heard_tamsin_children' }],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                after: {
                    lines: [['npc', "Be careful if you go north. The Warden is a kind man, but he won't let anyone past the roost."]],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                // The Broken Crown rework (Act V): his name, Bran Ashdown, first comes here or on his grave, never before the
                // fight (lore bible 4.5). She mourns whatever you did for her; what you tell her is remembered.
                mourning: {
                    lines: [['npc', "The crows came down to the village this morning. Every roof. Not a sound."],
                        ['npc', "Then they flew off north and didn't come back. Something's happened to the Warden."],
                        ['npc', "Bran, his name was. Bran Ashdown. He kept the old prison at Featherwatch, and the night the crown fell he opened every cell."],
                        ['npc', "He mended my grandson's arm once. Wouldn't take a coin."]],
                    choices: [
                        { text: 'I killed him.', effects: [{ flag: 'tamsin_mourned' }, { flag: 'warden_admitted' }], to: 'admit' },
                        { text: "I don't know what happened up there.", effects: [{ flag: 'tamsin_mourned' }, { flag: 'warden_denied' }], to: 'deny' },
                        { text: '(Say nothing.)', say: '...', effects: [{ flag: 'tamsin_mourned' }, { flag: 'warden_silent' }], to: 'silent' }
                    ]
                },
                admit: {
                    lines: [[null, 'Tamsin looks at you for a long time.'],
                        ['npc', "I know. The crows told everyone, the way crows do. Thank you for not lying to me."],
                        ['npc', "Don't ask me to forgive you. Not yet."]],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                deny: {
                    lines: [['npc', "No? Then the crows are lying, and I've never known a crow to lie."],
                        ['npc', "Go on, then. The village still needs what it needs."]],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                silent: {
                    lines: [[null, 'Tamsin waits. When you say nothing, she nods, as if that were an answer.'],
                        ['npc', "He'd have said nothing too. He was better at it than you."]],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                after_admit: {
                    lines: [['npc', "You came back. That's something. Bran would have fed you, you know. He fed everyone."]],
                    choices: [{ text: 'Is anything troubling the village?', if: { quests: { SF4: 'available' } }, to: 'sf4_start' },
                        { text: 'The mill is quiet now.', if: { quests: { SF4: 'active' }, flags: ['mill_quiet'] }, effects: [{ event: { type: 'story', id: 'tamsin_mill' } }], to: 'sf4_done' },
                        { text: 'Goodbye.', end: true }]
                },
                after_other: {
                    lines: [['npc', "Stranger. The mill's grinding and the bell still rings. Ask what you need."]],
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
                    choices: [
                        // Shamefield's Thanks (2026-11-09, WEAPONS_BEFORE_THE_WARDEN.md): once all six households are helped.
                        { text: 'The Captain says the village left something with you.', if: { quests: { L01: 'complete' }, notFlag: 'shamefield_thanks_taken' }, to: 'thanks' },
                        shop('bragg'), { text: 'What was it like, under the old crown?', to: 'crown' }, { text: 'Goodbye.', end: true }]
                },
                // The Broken Crown rework: villagers disagree about the old crown. Neither of them is excused.
                crown: {
                    lines: [['npc', "Steady work. Crown contracts, good iron, and roads you could cart it down without a crossbow."],
                        ['npc', "Iona will tell you what it cost. She's not wrong. I'm not either."]],
                    choices: [shop('bragg'), { text: 'Goodbye.', end: true }]
                },
                thanks: {
                    lines: [
                        ['npc', "Huh. So you're the one. Oda paid in bread, Fenric in beer, Greta in a ham I'm still eating. Tamsin paid in coin, which I liked best."],
                        ['npc', "Elian paid nothing. He just stood in the door and read me names until I agreed. Here. Made for your hand, nobody else's."]
                    ],
                    choices: [
                        { text: 'Take the sword.', if: { className: 'warrior' }, effects: [{ item: 'Sunbreak', key: 'item:shamefield_thanks' }, { flag: 'shamefield_thanks_taken' }], to: 'thanks_given' },
                        { text: 'Take the knife.', if: { className: 'rogue' }, effects: [{ item: 'Millrace Tanto', key: 'item:shamefield_thanks' }, { flag: 'shamefield_thanks_taken' }], to: 'thanks_given' },
                        { text: 'Take the staff.', if: { className: 'mage' }, effects: [{ item: 'Bell-Bronze Staff', key: 'item:shamefield_thanks' }, { flag: 'shamefield_thanks_taken' }], to: 'thanks_given' },
                        { text: 'Take the staff.', if: { className: 'necromancer' }, effects: [{ item: 'Nameless Stone', key: 'item:shamefield_thanks' }, { flag: 'shamefield_thanks_taken' }], to: 'thanks_given' }
                    ]
                },
                thanks_given: {
                    lines: [['npc', "Don't thank me. Thank the village. Then go north and use it, so they stop asking me whether you've used it."]],
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
                        { text: 'Bragg says the old crown was good for business.', to: 'crown' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                crown: {
                    lines: [['npc', "For his. Every spring the crown's men took my medicine for the war, and my patients went without."],
                        ['npc', "Bragg misses the contracts. I miss the people who never came back for their second dose."]],
                    choices: [shop('iona'), { text: 'Goodbye.', end: true }]
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
                // C1-N03, the Festival of the Sun: he dodges it, then (after the raid) opens the gate as promised.
                { if: { quests: { 'C1-N03': 'active' }, flags: ['raid_over', 'festival_protect'] }, node: 'debrief_protect' },
                { if: { quests: { 'C1-N03': 'active' }, flags: ['raid_over'] }, node: 'debrief_pursue' },
                { if: { quests: { 'C1-N03': 'active' }, flags: ['raid_started'] }, node: 'raid' },
                { if: { quests: { 'C1-N03': 'active' } }, node: 'festival' },
                // C1-N02 (Broken Crown rework): the courier's orders are proof. What you did to get them is remembered.
                { if: { quests: { 'C1-N02': 'active' }, items: ['Ash-Marked Orders'], flags: ['oath_courier_caught'] }, node: 'evidence_caught' },
                { if: { quests: { 'C1-N02': 'active' }, items: ['Ash-Marked Orders'] }, node: 'evidence_tracked' },
                // Get to know the locals (L01): all six, the village's thanks (and the road, if it's still shut).
                { if: { quests: { L01: 'active', SF1: 'complete', SF2: 'complete', SF3: 'complete', SF4: 'complete', SF5: 'complete', SF6: 'complete' } }, node: 'locals_done' },
                // The village route: two households vouch for you, and he trusts you with the road.
                { if: { quests: { 'C1-N02': 'active' }, questCount: { ids: LOCALS, min: VOUCH } }, node: 'vouch' },
                { if: { quests: { 'C1-N02': 'active', L01: 'unseen' } }, node: 'oath_offer' },
                { if: { quests: { 'C1-N02': 'active' } }, node: 'oath_hint' },
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
                // Tokelo (2026-11-04): a lazy Captain who makes you do his job before he opens the gate. The Broken Crown
                // rework (2026-11-11): the register is evidence, and he reads it. Proof, or two households, opens the road.
                opened: {
                    lines: [
                        [null, 'He flicks through the register, stops, and flicks back. Then he reads it properly, which takes him a while.'],
                        ['npc', "Oh. Thanks for the ledger. ...Hang on. A dozen clearances for the north road, all under the same seal, and it isn't mine."],
                        ['npc', "Somebody's been sending armed men up my road on forged papers. Find out who, and I'll open the gate."],
                        ['npc', "Or. Half the village is on my back: pigs, hops, singing, bread, a bell. Help a couple of them and I'll trust you with the road. Deal?"]
                    ],
                    choices: [
                        { text: "I'll find out who forged them.", to: 'oath_go' },
                        { text: "Fine. I'll help them.", to: 'locals_deal' },
                        { text: 'Just open the gate.', to: 'locals_refuse' }
                    ]
                },
                oath_go: {
                    lines: [['npc', "Start with Elian. He's walked that road more than anyone, and he notices things. Annoyingly."]],
                    choices: [{ text: "Fine. I'll help the village too.", if: { quests: { L01: 'unseen' } }, to: 'locals_deal' }, { text: 'Goodbye.', end: true }]
                },
                // A run that returned the register before the deal (or never took it) is offered both ways here.
                oath_offer: {
                    lines: [
                        ['npc', "You again. Found out who forged those clearances yet? No? Then here's the other way."],
                        ['npc', "Half the village is on my back. Help a couple of them and I'll trust you with the road. Deal?"]
                    ],
                    choices: [
                        { text: "Fine. I'll help them.", to: 'locals_deal' },
                        { text: 'Just open the gate.', to: 'locals_refuse' },
                        { text: "I'm still looking for the forger.", to: 'oath_go' }
                    ]
                },
                oath_hint: {
                    effects: LOCALS.map((q) => ({ available: q })),   // older runs that took the deal before A Proper Meal existed
                    lines: [['npc', "Gate's shut. Bring me whoever forged those clearances, or get two households to stop shouting at me. Either. I'm not fussy. *hic*"]],
                    choices: [{ text: 'Remind me who needs help.', to: 'locals_who' }, { text: 'Goodbye.', end: true }]
                },
                locals_refuse: {
                    lines: [['npc', "And have Greta Rusk shouting at me about pigs for another week? No. Bring me the forger, or help my villagers. Then we talk."]],
                    choices: [
                        { text: "Fine. I'll help them.", if: { quests: { L01: 'unseen' } }, to: 'locals_deal' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                // The two ways north close here (C1-N02's last step). Either fires once; the gate opens with the quest.
                evidence_caught: {
                    lines: [
                        ['npc', "You knocked a man down in my square? People saw. Good: let them talk about it."],
                        [null, 'The Captain reads the orders and, for once, stays sober all the way to the end.'],
                        ['npc', "Corvin Sere. Quartermaster to the old crown. He surrendered at the gates, and they let him walk."],
                        ['npc', "Now he's moving men and chains up to the roost, and the Warden's alone up there. Fine. I'll open the gate."]
                    ],
                    choices: [{ text: "I'll go north.", effects: [{ removeItem: 'Ash-Marked Orders' }, { event: { type: 'story', id: 'north_route_cleared' } }], to: 'gate_opened' }]
                },
                evidence_tracked: {
                    lines: [
                        ['npc', "You let him run and found his drop instead? Sneaky. I'd have just shouted."],
                        [null, 'The Captain reads the orders and, for once, stays sober all the way to the end.'],
                        ['npc', "Corvin Sere. Quartermaster to the old crown. He surrendered at the gates, and they let him walk."],
                        ['npc', "Now he's moving men and chains up to the roost, and the Warden's alone up there. Fine. I'll open the gate."]
                    ],
                    choices: [{ text: "I'll go north.", effects: [{ removeItem: 'Ash-Marked Orders' }, { event: { type: 'story', id: 'north_route_cleared' } }], to: 'gate_opened' }]
                },
                vouch: {
                    lines: [
                        ['npc', "People keep coming in here saying nice things about you. It's very disturbing. *hic*"],
                        ['npc', "That's two households off my back. Fine: I trust you with the road. Don't make me regret it; regret is a lot of work."]
                    ],
                    choices: [{ text: 'Open the gate, then.', effects: [{ flag: 'village_vouched' }, { event: { type: 'story', id: 'north_route_cleared' } }], to: 'gate_opened' }]
                },
                // The road opens the day after the Festival of the Sun (C1-N03), not before: he has a festival to avoid.
                gate_opened: {
                    lines: [['npc', "Tomorrow. Today's the Festival of the Sun, and I'm not opening anything but a cask."],
                        ['npc', "Go and find Oda. She's been asking for you, and she frightens me."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                festival: {
                    lines: [['npc', "Festival security? I inspected the tavern. Thoroughly. Twice."],
                        ['npc', "The gate opens after the festival. Go and eat something. Tamsin reads the names at the memorial stone."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                raid: {
                    lines: [['npc', "Why are you talking to me? GO! I've got the crossbow. Mostly the right way round."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                debrief_protect: {
                    lines: [
                        [null, 'The Captain is sitting on an upturned barrel with a crossbow across his knees, and nothing in his mug at all.'],
                        ['npc', "Everyone's breathing. I counted them. Twice, like the tavern."],
                        ['npc', "The one with the memorial roll went over the wall by the north stair. The tracks run up to the orchard. Corvin's people."],
                        ['npc', "Fine. FINE. The gate's open. Get our names back, and find out what Corvin wants with the Warden. Somebody bring me a drink."]
                    ],
                    choices: [{ text: "I'll go north.", effects: [{ event: { type: 'story', id: 'festival_debrief' } }], end: true }]
                },
                debrief_pursue: {
                    lines: [
                        [null, 'The Captain is sitting on an upturned barrel with a crossbow across his knees, and nothing in his mug at all.'],
                        ['npc', "You left my square to chase one man? Greta's stall is kindling, and Mara needed stitches."],
                        ['npc', "...But you got the roll back, and the orders in his boot. Corvin's people go up to the roost tonight. Tactical. I hate it."],
                        ['npc', "Fine. FINE. The gate's open. Go, before I sober up and change my mind."]
                    ],
                    choices: [{ text: "I'll go north.", effects: [{ event: { type: 'story', id: 'festival_debrief' } }], end: true }]
                },
                locals_deal: {
                    lines: [
                        ['npc', "Cool. Cool cool cool. Two households and I'll trust you with the road. All six and the whole village owes you. I'm counting."],
                        ['npc', "Now, if you'll excuse me, this beer isn't going to drink itself. *hic*"],
                        [null, 'He leans back until his chair creaks, and closes his eyes.']
                    ],
                    effects: [{ start: 'L01' }, ...LOCALS.map((q) => ({ available: q }))],
                    choices: [{ text: 'Who needs help?', to: 'locals_who' }, { text: 'Goodbye.', end: true }]
                },
                locals_who: {
                    lines: [
                        ['npc', "Oda the baker and Brother Fenric up at the Kloster are fighting about bread and beer again. Fenric's hops are dying, too, and he's blaming everyone."],
                        ['npc', "Greta Rusk has lost her pigs. Tamsin says there's singing at the old mill after dark. And your friend Elian keeps looking at the church steps and not climbing them."],
                        ['npc', "Oh, and Oda says strangers in this village eat like animals. That one's your problem. *hic*"]
                    ],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                locals_hint: {
                    // A run that took the deal before A Proper Meal existed gets it offered here.
                    effects: LOCALS.map((q) => ({ available: q })),
                    lines: [['npc', "Bread and beer, Fenric's hops, Greta's pigs, the singing at the mill, Elian, and Oda wants to watch you eat. Six. I'm counting. Mostly. *hic*"]],
                    choices: [{ text: 'Remind me who needs help.', to: 'locals_who' }, { text: 'Goodbye.', end: true }]
                },
                locals_done: {
                    lines: [
                        ['npc', "Oda brought me bread. Fenric brought me beer, and stayed to complain about the bread. Greta sent a sausage, which I'm choosing to take as thanks."],
                        ['npc', "The mill's grinding again, Elian's names are on the church door, and Oda says you finally eat like a person. Nobody's shouted at me all week. Wonderful."]
                    ],
                    // All six: the village's thanks, and (if the road is somehow still shut) the road too.
                    choices: [{ text: 'I know the locals now.', effects: [{ flag: 'village_vouched' }, { event: { type: 'story', id: 'locals_reported' } }, { event: { type: 'story', id: 'north_route_cleared' } }], to: 'locals_thanks' }]
                },
                locals_thanks: {
                    lines: [['npc', "A deal's a deal. Bragg has something for you from the whole village. Now let me sleep."]],
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
                    choices: [{ text: 'What do you need?', to: 'ask' }, { text: 'Where did you learn medicine?', to: 'learned' }]
                },
                learned: {
                    lines: [['npc', "Here and there. Mostly there."],
                        ['npc', "You learn fast what a body can live without, when there are a lot of bodies. Next question."]],
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
                    choices: [
                        // C1-N05: helping earns his thanks and his care journal, never the key (master brief §3).
                        { text: 'Let me help with the broken cages.', if: { flags: ['siege_broken'], notFlags: ['warden_helped'] }, to: 'mend' },
                        { text: 'Can I rest here a while?', to: 'rest' }, { text: 'Goodbye.', end: true }]
                },
                mend: {
                    lines: [[null, 'He hands you one end of a bent bar without a word. Together you work it straight, and lash a snapped perch back to its post.'],
                        ['npc', "They wanted the key. They broke whatever was in the way, and the birds were in the way."],
                        ['npc', "Thank you. It changes nothing about the key. But thank you."]],
                    effects: [{ flag: 'warden_helped' }],
                    choices: [{ text: 'Can I rest here a while?', to: 'rest' }, { text: 'Goodbye.', end: true }]
                },
                // The Broken Crown rework (Act IV): he offers food and a seat before he ever has to refuse you.
                rest: {
                    lines: [['npc', "Sit. There's bread from the village, when the road is clear enough for Oda to send it."],
                        ['npc', "I fed the smallest one this morning. She bit me. Good. Means she'll live."]],
                    effects: [{ item: 'Brötchen', key: 'item:warden_bread' }],
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
                        { text: 'Do you know who I am?', to: 'who' },
                        { text: 'I need what is behind that seal.', to: 'need' },
                        { text: "I'll go.", end: true },
                        { text: 'Stand aside. I want what is behind that seal.', to: 'challenge' }
                    ]
                },
                // He knows the seal stirs for you, not why. He will help with anything but the key.
                who: {
                    lines: [['npc', "No. The crows saw you wake, and the seal stirs when you come up the hill. I don't know why."],
                        ['npc', "Stay, and I'll tell you everything they saw. But the key stays with me."]],
                    choices: [{ text: 'What is behind it?', to: 'behind' }, { text: "I'll go.", end: true }, { text: 'Stand aside. I want what is behind that seal.', to: 'challenge' }]
                },
                need: {
                    lines: [['npc', "So did the men with their circles and chains. They had a thousand reasons."],
                        ['npc', "I didn't hear one that put a life before power."]],
                    choices: [{ text: "I'll go.", end: true }, { text: 'Stand aside. I want what is behind that seal.', to: 'challenge' }]
                },
                behind: {
                    lines: [['npc', 'I was given the key and told never to use it. I never asked why. Some things you keep shut because you are asked to, and because you love the people down the road.']],
                    choices: [
                        { text: "I'll go.", end: true },
                        { text: 'Stand aside. I want what is behind that seal.', to: 'challenge' }
                    ]
                },
                challenge: {
                    lines: [['npc', "Then I'm sorry. For both of us."], [null, 'He lifts his halberd, slowly, as if it weighs more than it used to.']],
                    effects: [{ flag: 'warden_challenged' }],
                    choices: [{ text: '(Draw your weapon.)', end: 'interrupt' }]
                }
            }
        },

        // ------------------------------------------------------------- The Broken Crown rework (2026-11-11), DRAFT lines for Wick
        // CHAPTER_ONE_NARRATIVE_REWORK.md. Nobody here knows what the player was. They know the mark, and that it matters.
        // Act I: a scavenger on the road who dug at your house. A confrontation, not a fight (rework decision 7).
        scavenger: {
            name: 'Scavenger', title: 'On the homestead road',
            talk: [{ node: 'first' }],
            nodes: {
                first: {
                    lines: [[null, 'A thin man with a sack and a pry bar is crouched by the road, sorting through dressed stones. He sees your hand, and goes still.'],
                        ['npc', "I saw that mark on the stone. Didn't think I'd see it on skin."]],
                    choices: [
                        { text: 'Who paid you to dig at my house?', to: 'paid' },
                        { text: 'Put the stones back and get out of here.', to: 'gone' }
                    ]
                },
                paid: {
                    lines: [['npc', "Whoever paid for those stones will pay twice for that scrap in your hand."],
                        ['you', 'Who paid you?'],
                        ['npc', "Didn't see his face. Saw his seal. And his coin."],
                        [null, 'He snatches up his sack and runs south, toward the tollway.']],
                    effects: [{ flag: 'scavenger_fled' }],
                    choices: [{ text: 'Let him go.', end: true }]
                },
                gone: {
                    lines: [['npc', "Keep them. They're your stones, I suppose. Everyone says so, the way you look at them."],
                        [null, 'He leaves the sack and runs south, toward the tollway.']],
                    effects: [{ flag: 'scavenger_fled' }],
                    choices: [{ text: 'Let him go.', end: true }]
                }
            }
        },
        // C1-N02: the man in the grey cloak. Catch him, or let him run and follow: both end with his orders in your hand.
        oath_courier: {
            name: 'Man in a grey cloak', title: 'Shamefield',
            talk: [{ node: 'first' }],
            nodes: {
                first: {
                    lines: [[null, 'A man in a grey cloak, ash on his sleeves, is edging along the wall toward the orchard gate. He clutches a satchel to his chest.'],
                        ['npc', 'Not you. Not now.']],
                    choices: [
                        { text: 'Grab him.', effects: ORDERS('oath_courier_caught'), to: 'caught' },
                        { text: 'Let him run, and follow him.', effects: ORDERS('oath_courier_tracked'), to: 'tracked' }
                    ]
                },
                caught: {
                    lines: [[null, 'You catch his collar before he reaches the gate. He twists free and runs, but the satchel stays in your hands. Half the square saw it.'],
                        [null, 'Inside: orders on grey paper, signed with a circle drawn in ash and left open at the top.']],
                    choices: [{ text: 'Take them to the Captain.', end: true }]
                },
                tracked: {
                    lines: [[null, 'You let him go, and follow at a distance. Under the mill bridge he pushes the satchel into a gap in the stones for someone else to collect, and walks off whistling.'],
                        [null, 'Nobody collects it but you. Orders on grey paper, signed with a circle drawn in ash and left open at the top.']],
                    choices: [{ text: 'Take them to the Captain.', end: true }]
                }
            }
        },
        // C1-N04: Corvin Sere, the human antagonist (rework 2.2). He does not know what you are, and never says it.
        // Three approaches, each remembered at the end of the chapter; he always leaves (capture needs a fight Gauge hasn't sized).
        corvin: {
            name: 'Corvin Sere', title: 'The Broken Oath',
            talk: [{ if: { flags: ['corvin_met'] }, node: 'again' }, { node: 'first' }],
            nodes: {
                first: {
                    lines: [[null, "A grey-haired man in an old quartermaster's coat sits on a crate at the foot of the climb, counting chains. Two acolytes stand behind him, staring at your hand."],
                        ['npc', "That's an old sign. You shouldn't carry it where anyone can see."]],
                    effects: [{ flag: 'corvin_met' }],
                    choices: CORVIN
                },
                again: {
                    lines: [['npc', "Still here? So am I. Not for long."]],
                    choices: CORVIN
                },
                mark: {
                    lines: [['npc', 'I know men who died for less.']],
                    choices: CORVIN
                },
                who: {
                    lines: [['npc', "Corvin Sere. I kept the old crown's wagons rolling, once."],
                        ['npc', "I put down my sword at the gates to live. They called me sensible. I've been trying to forgive myself for it ever since."]],
                    choices: CORVIN
                },
                courier: {
                    lines: [['npc', "So you're the one who knocked him down in the square. He says you hit like a soldier."]],
                    choices: CORVIN
                },
                courier_followed: {
                    lines: [['npc', "And you followed him instead of hitting him. Patient. Patience is rarer than courage, in my experience."]],
                    choices: CORVIN
                },
                challenge: {
                    lines: [['npc', "Then you'll have to stop all of them. They're waiting up the path."],
                        [null, 'He whistles. The acolytes gather up the chains, and the three of them go over the far side of the hill without hurrying.']],
                    effects: [{ flag: 'corvin_challenged' }, { flag: 'corvin_gone' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                deceive: {
                    lines: [['npc', "The watch doesn't send anyone anywhere. It sleeps."],
                        ['npc', "But you came anyway, so go on up and see what we're dying for."],
                        [null, 'He waves you past and starts packing the chains. When you look back, he is gone.']],
                    effects: [{ flag: 'corvin_deceived' }, { flag: 'corvin_gone' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                bargain: {
                    lines: [['npc', "What he keeps. Not for me: for everyone who was taken."],
                        ['npc', "Bring me what's behind his seal, and I'll tell you what your mark means. I'll find you."],
                        [null, 'He tips his hat and walks off over the hill. The acolytes follow with the chains.']],
                    effects: [{ flag: 'corvin_bargained' }, { flag: 'corvin_gone' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        // After the fight: the player kills "the Warden" and buries Bran (lore bible 4.5). His name is in his collar.
        warden_grave: {
            name: 'The Warden', title: "The Warden's Sanctuary",
            talk: [{ if: { flags: ['bran_buried'] }, node: 'cairn' }, { node: 'body' }],
            nodes: {
                body: {
                    lines: [[null, 'The Warden lies where he fell. His crows sit on his hands and on the haft of his halberd, and they will not leave him.']],
                    choices: [{ text: 'Bury him under the old cage stones.', to: 'bury' }, { text: 'Leave him.', end: true }]
                },
                bury: {
                    lines: [[null, 'It takes a long time. The crows watch every stone you lay.'],
                        [null, 'Stitched inside his collar, small and careful, is a name: BRAN ASHDOWN. You scratch it into the top stone.']],
                    effects: [{ flag: 'bran_buried' }],
                    choices: [{ text: 'Leave him.', end: true }]
                },
                cairn: {
                    lines: [[null, 'A cairn of old prison stones. On the top one, in your own hand: BRAN ASHDOWN. A gray crow with a crooked wing sits on it.']],
                    choices: [{ text: 'Leave him.', end: true }]
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
                        ['npc', "Why am I here? Because a seal broke. Old things hear that sort of noise. Orin Vale. Mason, if you need a word for it."],
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
                        // C1-N03: the festival lesson. One set of ingredients, and one restock if they went astray.
                        { text: 'Need a hand with the festival tables?', if: { quests: { 'C1-N03': 'active', SF6: 'active' }, notFlags: ['festival_lesson'] }, effects: [{ flag: 'festival_lesson' }, { event: { type: 'story', id: 'festival_lesson' } }], to: 'festival_sf6' },
                        { text: 'Need a hand with the festival tables?', if: { quests: { 'C1-N03': 'active' }, notFlags: ['festival_lesson'] }, effects: [{ flag: 'festival_lesson' }, { event: { type: 'story', id: 'festival_lesson' } }], to: 'festival_lesson' },
                        { text: "I've lost the roll and the pork.", if: { quests: { 'C1-N03': 'active' }, flags: ['festival_lesson'], notFlags: ['festival_fed', 'festival_restock'], notAny: ['Leberkäsbrötchen'], any: [{ notAny: ['Pork'] }, { notAny: ['Brötchen'] }] }, effects: [{ flag: 'festival_restock' }], to: 'festival_restock' },
                        { text: 'The Captain says you think I eat like an animal.', if: { quests: { SF6: 'available' } }, to: 'sf6_start' },
                        { text: 'I cooked, and I ate it. Properly.', if: { quests: { SF6: 'active' }, flags: ['sf6_ate'] }, effects: [{ event: { type: 'story', id: 'oda_meal' } }], to: 'sf6_done' },
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
                sf6_start: {
                    lines: [
                        ['npc', "I saw you. Standing in the square, chewing a plain Brötchen like a goat. A roll on its own is half a meal. You eat the other half too, or you don't eat."],
                        ['npc', "Here: a roll, and a slice of Greta's pork. Take them to that hearth on your homestead and cook a Leberkäsbrötchen. Then eat it, sit down, and notice that you feel stronger. Then come back and thank me."],
                        ['npc', "Any hearth recipe works the same way: carry what it needs, stand at the fire, cook. Ask the fire what it can make if you forget."]
                    ],
                    effects: [{ start: 'SF6' }, { item: 'Brötchen', key: 'item:sf6_roll' }, { item: 'Pork', key: 'item:sf6_pork' }],
                    choices: [{ text: 'Yes, Oda.', end: true }]
                },
                festival_lesson: {
                    lines: [
                        ['npc', "A hand? I need ten. Fenric's brought the beer, so somebody has to bring the food, and that somebody is you."],
                        ['npc', "Here: a roll, and a slice of Greta's pork. There's a hearth by the raven tree for the festival. Cook a Leberkäsbrötchen on it."],
                        ['npc', "Then eat it, and notice you feel stronger. Food is how this village gets through a winter, and how you'll get through a fight."]
                    ],
                    effects: [{ item: 'Brötchen', key: 'item:festival_roll' }, { item: 'Pork', key: 'item:festival_pork' }],
                    choices: [{ text: 'Yes, Oda.', end: true }]
                },
                festival_sf6: {
                    lines: [['npc', "You've still got my roll and pork? Good. Cook them at the festival hearth by the raven tree, then eat. Two birds, one oven."]],
                    choices: [{ text: 'Yes, Oda.', end: true }]
                },
                festival_restock: {
                    lines: [['npc', "Lost them. On festival day. ...Here. One more of each, and if you lose these I'm telling Greta."]],
                    effects: [{ item: 'Brötchen', key: 'item:festival_roll_again' }, { item: 'Pork', key: 'item:festival_pork_again' }],
                    choices: [{ text: 'Thank you, Oda.', end: true }]
                },
                sf6_done: {
                    lines: [['npc', "There. You're standing up straighter already. Take a pretzel for the road, and stop eating bread in the street like a stray."]],
                    choices: [{ text: 'Goodbye.', end: true }]
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
            // Each rank of the web (skillWeb.legendaryWebs.fallen_seraphim.ranks sets the flag) has one new talk, heard once;
            // the lore comes out a rank at a time (docs/design/FALLEN_SERAPHIM.md). Spoiler-safe: it never names what you were.
            talk: [
                // You already chose your weapon when it woke (2026-11-09): the Six-Winged talk wakes the weapon instead.
                { if: { flags: ['seraph_rank_six', 'seraph_weapon_chosen'], notFlags: ['seraph_heard_six'] }, node: 'six_kindle' },
                { if: { flags: ['seraph_rank_six'], notFlags: ['seraph_heard_six'] }, node: 'six' },
                { if: { flags: ['seraph_rank_unbound'], notFlags: ['seraph_heard_unbound'] }, node: 'unbound' },
                { if: { flags: ['seraph_rank_ashen'], notFlags: ['seraph_heard_ashen'] }, node: 'ashen' },
                { if: { flags: ['seraph_rank_watcher'], notFlags: ['seraph_heard_watcher'] }, node: 'watcher' },
                { if: { flags: ['seraph_trial_won'], notFlags: ['seraph_heard_trial'] }, node: 'trial_won' },
                { if: { flags: ['seraph_heard_watcher'], notFlags: ['seraph_trial_called'] }, node: 'trial' },
                { if: { flags: ['seraph_trial_called'], notFlags: ['seraph_trial_won'] }, node: 'trial_wait' },
                { if: { flags: ['seraph_met'] }, node: 'again' }, { if: { flags: ['seraph_awakened'] }, node: 'wake' }, { node: 'still' }],
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
                    lines: [['npc', 'I was asked to guard a fire, and I carried some of it down, because the ones below were cold. Heaven called that a sin. The ones below called it spring.']],
                    choices: [{ text: 'Am I evil?', to: 'evil' }, { text: 'I will carry it.', to: 'carry' }]
                },
                evil: {
                    lines: [['npc', 'You are what you do next. The names come afterwards, and they are written by whoever is left standing.']],
                    choices: [{ text: 'Why did you fall?', to: 'why' }, { text: 'I will carry it.', to: 'carry' }]
                },
                carry: {
                    lines: [[null, 'The wings fold around you, and then they are gone. Between your shoulder blades you feel six places where something should be, and is not yet.'],
                        ['npc', 'Come back when you are heavier. I will still be here. I am very good at standing still.']],
                    choices: [GIFT_CHOICE, { text: 'Goodbye.', end: true }]
                },
                // The holy weapon at waking (Tokelo 2026-11-09: nobody ever saw it at full mastery). Dormant until The Six-Winged.
                gift: {
                    lines: [[null, 'Five shapes rise out of the fountain, dripping, their light banked low like coals: a greatsword, a spear, two feather blades, a censer staff, a scythe.'],
                        ['npc', 'They were mine, when I had hands for them. They are asleep, as I was. Take the one that fits yours; it wakes when the last of my light is yours.']],
                    choices: [...HOLY.map(([item, text]) => ({ text: `${item}: ${text}`, effects: [{ item, key: 'seraph_holy_weapon' }, { flag: 'seraph_weapon_chosen' }], to: 'gift_taken' })),
                        { text: 'Not yet.', end: true }]
                },
                gift_taken: {
                    lines: [[null, 'The other four sink back into the fountain. The one you chose is cold, and heavier than it looks.'],
                        ['npc', 'Carry it a while. It will warm to you, the way I did.']],
                    choices: [{ text: 'Goodbye, Caelith.', end: true }]
                },
                six_kindle: {   // The Six-Winged, for those who already carry a weapon from the fountain
                    lines: [[null, 'Your shadow on the courtyard stones has six wings. The statue\'s halo turns towards you, the way a flower turns to the sun.'],
                        ['npc', 'All of it. Every feather. Even I never held all of it at once.'],
                        ['npc', 'Your eyes have gone red. Mine did too, on the way down. It is only the light, burning from the inside.'],
                        [null, 'The weapon at your side wakes. It is warm now, and lighter than it looks.']],
                    effects: [{ flag: 'seraph_heard_six' }],
                    choices: [{ text: 'Goodbye, Caelith.', end: true }]
                },
                watcher: {   // rank 2: its name, and the altar fire
                    lines: [[null, 'The halo brightens as you come close. The stone face turns, very slowly, to follow you.'],
                        ['npc', 'You are heavier. Good. Then you can carry my name as well: Caelith. I kept the altar fire.'],
                        ['npc', 'Seraph means the burning one. We kept Heaven\'s fire on its altar. Up there, warmth. Down here, a winter that did not end.'],
                        ['npc', 'My orders were to keep the fire above and the world below. The ones below froze for a hundred years.']],
                    effects: [{ flag: 'seraph_heard_watcher' }],
                    choices: [{ text: 'And you took some down.', to: 'opened' }, { text: 'Goodbye.', end: true }]
                },
                opened: {
                    lines: [['npc', 'One live coal, carried in my hands. Spring ran down this hill for the first time. The water at my feet is the last of it.'],
                        ['npc', 'Then Heaven threw me down after it, and the hill closed over me. Stone is patient. So am I.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                trial: {   // after Watcher: the Trial of the Live Coal (QS1), which opens the second half of the web
                    lines: [[null, 'The halo over the statue flickers, like a candle in a draught.'],
                        ['npc', 'They have noticed you. Heaven does not like its light walking about in someone else\'s shoes.'],
                        ['npc', 'It will send the one who keeps the altar now: Aurevain. It will come here, to my courtyard, and ask for the light back.'],
                        ['npc', 'Half of my wings I can give you without asking anyone. The other half you will have to keep from it.']],
                    choices: [
                        { text: 'Let it come.', effects: [{ flag: 'seraph_trial_called' }, { start: 'QS1' }], to: 'trial_go' },
                        { text: 'Not yet.', end: true }
                    ]
                },
                trial_go: {
                    lines: [['npc', 'It will be waiting by the fountain. It is stronger than anything you have fought. Come ready, and do not come alone in your head.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                trial_wait: {
                    lines: [['npc', 'Aurevain is waiting by the fountain. It is patient too. We were made by the same hands.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                trial_won: {
                    lines: [[null, 'Four grey feathers lie on the fountain\'s rim. The statue\'s halo burns steady.'],
                        ['npc', 'You kept it. Then it is yours, all of it, and nobody can ask for it back. Not even me.']],
                    effects: [{ flag: 'seraph_heard_trial' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                ashen: {   // rank 3: the monks, the carving, and the question turned on you
                    lines: [[null, 'Ash drifts off your shoulders and settles on the water. The fountain runs warm.'],
                        ['npc', 'The monks found me in the hill and built their walls around me. They do not know what I am. One of them guessed.'],
                        ['npc', 'He carved it on the altar step: he fell for us. Heaven wrote sin. A boy with a knife wrote that. Both are true.'],
                        ['npc', 'Someone is writing your name down too, little shell. Make sure there is a second hand on the page.']],
                    effects: [{ flag: 'seraph_heard_ashen' }],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                unbound: {   // rank 4: all six wings
                    lines: [[null, 'The statue does not move. You do: six wings open behind you, and the courtyard goes quiet.'],
                        ['npc', 'There. Now you are what I was, before the fall. Six wings, and nobody left to tell you where to point them.'],
                        ['npc', 'I will not ask what you will do with them. I was asked that once, and the answer took a thousand years.'],
                        ['npc', 'Go on. Give something away.']],
                    effects: [{ flag: 'seraph_heard_unbound' }],
                    choices: [{ text: 'Goodbye, Caelith.', end: true }]
                },
                six: {   // every skill of the web (Tokelo 2026-11-04): six wings, red eyes, and a holy weapon of your choosing
                    lines: [[null, 'Your shadow on the courtyard stones has six wings. The statue\'s halo turns towards you, the way a flower turns to the sun.'],
                        ['npc', 'All of it. Every feather. Even I never held all of it at once.'],
                        ['npc', 'Your eyes have gone red. Mine did too, on the way down. It is only the light, burning from the inside.'],
                        [null, 'Five shapes rise out of the fountain, dripping and bright: a greatsword, a spear, two feather blades, a censer staff, a scythe.'],
                        ['npc', 'They were mine, when I had hands for them. Take the one that fits yours. The others go back to the water.']],
                    choices: [
                        { text: 'Emberward: The greatsword. I guarded the fire with it, once.', effects: [{ item: 'Emberward', key: 'seraph_holy_weapon' }, { flag: 'seraph_weapon_chosen' }, { flag: 'seraph_heard_six' }], to: 'armed' },
                        { text: 'Spear of the Altar Fire: The spear. It reaches further than you think.', effects: [{ item: 'Spear of the Altar Fire', key: 'seraph_holy_weapon' }, { flag: 'seraph_weapon_chosen' }, { flag: 'seraph_heard_six' }], to: 'armed' },
                        { text: 'Twin Pinions: The two feather blades. Quick, like falling.', effects: [{ item: 'Twin Pinions', key: 'seraph_holy_weapon' }, { flag: 'seraph_weapon_chosen' }, { flag: 'seraph_heard_six' }], to: 'armed' },
                        { text: 'Censer of Ash: The censer staff. Light, given away as smoke.', effects: [{ item: 'Censer of Ash', key: 'seraph_holy_weapon' }, { flag: 'seraph_weapon_chosen' }, { flag: 'seraph_heard_six' }], to: 'armed' },
                        { text: 'Grey Feather Scythe: The scythe. Even the holy have harvests.', effects: [{ item: 'Grey Feather Scythe', key: 'seraph_holy_weapon' }, { flag: 'seraph_weapon_chosen' }, { flag: 'seraph_heard_six' }], to: 'armed' },
                        { text: 'Not yet.', end: true }
                    ]
                },
                armed: {
                    lines: [[null, 'The other four sink back into the fountain. The one you chose is warm, and lighter than it looks.'],
                        ['npc', 'Holy, they will call it. Or cursed. It will be both, depending on who you point it at.']],
                    choices: [{ text: 'Goodbye, Caelith.', end: true }]
                },
                again: {
                    lines: [[null, 'Six stone wings stand folded over the fountain, and a ring of pale light hangs above the hood.'],
                        ['npc', 'Still carrying it? Good. It gets lighter the more of it you give away.']],
                    choices: [GIFT_CHOICE, { text: 'Why did you fall?', to: 'why' }, { text: 'Am I evil?', to: 'evil' }, { text: 'Goodbye.', end: true }]
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
        },

        // ------------------------------------------------------------- The rest of the master brief (2026-11-11)
        // The festival hearth by the raven tree (C1-N03): a public hearth, so the cooking lesson needs no trip home.
        square_hearth: {
            name: 'Festival hearth', title: 'Shamefield',
            talk: [{ node: 'hearth' }],
            nodes: {
                hearth: {
                    lines: [[null, 'A trestle, an iron grill and a fire the whole village feeds. Anyone may cook here; Oda keeps an eye on it.']],
                    choices: [...cook('hearth'), recipeBook('hearth'), { text: 'Leave it.', end: true }]
                }
            }
        },
        // Sergeant Kess, the Ash-Marked (C1-N04, master brief §3): beaten, not killed. Custody or release is real.
        kess: {
            name: 'Sergeant Kess', title: 'the Ash-Marked',
            talk: [{ node: 'first' }],
            nodes: {
                first: {
                    lines: [[null, "Kess is down on one knee in the trampled grass, sword out of reach, breathing hard. The ash on the sergeant's sleeve has smeared."],
                        [null, 'Kess looks at your hand and frowns, like someone trying to place a face from a long way off.'],
                        ['npc', "Twenty-two years a Crown sergeant. I signed the surrender at the gates with my own hand. Worst thing I ever wrote."],
                        ['npc', "You want the timetable? Corvin waits at the foot of the climb. The chains go up to the roost at dusk. That's all you get."]],
                    choices: KESS
                },
                why: {
                    lines: [['npc', "When the crown fell, the heroes went home. Corvin fed us. He says the old order can be put back together."],
                        ['npc', "Some days I believe him. Today isn't one of them."]],
                    choices: KESS
                },
                bound: {
                    lines: [['npc', "The Captain? He'll put me in the tavern cellar and forget about me. Fine. It's warm."],
                        [null, 'You tie Kess to an apple tree for the watch to collect.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                released: {
                    lines: [['npc', "The last people who let me walk away were the heroes, at the gates. Look how that turned out."],
                        [null, 'Kess goes off through the trees to the west, and does not look back.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
    };

    // Shamefield talks among itself (master brief §7.1): short scenes you overhear once, the first time you go up to
    // someone after they happen, then the usual greeting. The overheard node keeps that greeting's choices, so it
    // never hides a quest. DRAFT lines for Wick.
    function overheard(npcId, flag, cond, lines, entry) {
        const npc = npcs[npcId];
        const from = npc.nodes[entry];
        npc.nodes[flag] = { lines, effects: [...(from.effects || []), { flag }], choices: from.choices };
        npc.talk.unshift({ if: { ...cond, notFlags: [...(cond.notFlags || []), flag] }, node: flag });
    }
    overheard('bragg', 'heard_bragg_mara', { quests: { Q04: 'complete' } }, [
        [null, 'Bragg is arguing across the square with Mara, who is not looking up from her ledger.'],
        ['npc', "Iron's three times what it was. Under the crown a cart came up that road every week, and nobody robbed it."],
        ['mara', "Under the crown they robbed it before it left, Bragg. They just called it tax."],
        ['npc', "...Well. At least it arrived."]
    ], 'default');
    overheard('oda', 'heard_oda_fenric', { quests: { Q04: 'complete' }, notFlags: ['raid_over'] }, [
        [null, "Brother Fenric is leaning in at Oda's door with a cask on his shoulder, and both of them are pointing at the same sack of barley."],
        ['fenric', "It's malting barley. It wants to be beer. You can hear it."],
        ['npc', "It wants to be bread, and so do the festival tables. Put it down before I bake you."]
    ], 'hello');
    overheard('greta', 'heard_greta_captain', { quests: { Q04: 'complete' } }, [
        [null, 'The Watch Captain has come all the way down the lane, and Greta is making him regret it.'],
        ['npc', "Pigs over the fence, men in grey on the north road, and you're sitting in the tavern!"],
        ['watch_captain', "Walking is outside my job description, Greta. I've checked. Twice."]
    ], 'hello');
    overheard('iona', 'heard_iona_shane', { flags: ['shane_recruited'] }, [
        [null, 'Iona is turning a jar of salve over in her hands. The label says SHANE in large, proud letters.'],
        ['npc', "He sent it down with the carter. It's good. Better than mine, for burns."],
        ['npc', "I'd still like to know where a man learns to treat that many burns. I sent him willow bark back. We're not friends."]
    ], 'default');
    overheard('merrow', 'heard_merrow_elian', { flags: ['elian_in_village'] }, [
        [null, 'Elian is sitting on the granary step beside Sister Merrow, turning his letter over in his hands.'],
        ['elian', "Can a bell name someone nobody else remembers? If I'm the last one who knew them?"],
        ['npc', "A bell doesn't remember anyone, Elian. People do. Ring it, and say the names out loud. Then you won't be the last."]
    ], 'hello');
    // After the raid, Greta remembers what you chose (master brief §3, C1-N03: no morality meter, just people).
    overheard('greta', 'greta_after_protect', { flags: ['raid_over', 'festival_protect'] }, [
        ['npc', "You stood in front of my stall when the robes came. Didn't even look at the sausages."],
        ['npc', "There's a Bratwurst with your name on it. Don't argue."]
    ], 'hello');
    overheard('greta', 'greta_after_pursue', { flags: ['raid_over', 'festival_pursue'] }, [
        ['npc', "My stall's firewood. Mara's got six stitches. And you were off chasing a roll of paper."],
        ['npc', "...Tamsin says the names on it are ours. Fine. You can still buy pork. I'm charging you full price."]
    ], 'hello');

    // Black Flight anchors (Nahemoth design): safe arrival points by story id. The flag 'anchor:<id>' attunes one.
    // The homestead is attuned when the seal opens; others by visiting their marked place (triggers below).
    const anchors = {
        homestead: { name: 'The Homestead', region: 'The Forgotten Homestead', map: 'grounds', spawn: 'from_house' },
        shamefield: { name: 'Shamefield, the village well', region: 'Blackbriar Vale', map: 'shamefield', spawn: 'flight_well' }
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
        // The Broken Crown rework: fights with a reason. The ragpickers carried a buyer's notice; the ghoul had a name.
        { id: 'ragpicker_notice', on: { type: 'defeat', id: 'tollway_ragpickers' }, effects: [
            { say: "In the dead traveller's pack the goblins were picking through: a salvage notice. OLD CROWN GOODS BOUGHT. RECORDS, SEALS, DRESSED STONE. ASK FOR THE QUARTERMASTER." }
        ] },
        { id: 'ghoul_name', on: { type: 'defeat', id: 'featherwatch_ghoul' }, effects: [
            { say: "When it falls, the chain goes slack. Under the ritual cuts, round its wrist, is a carter's leather cuff stamped HENNER, TOLLWAY CARTS." },
            { say: 'Somebody was a carter on the south road once. The Broken Oath made him into this.' }
        ] },
        // C1-N03, the raid on the Festival of the Sun: what each choice cost, and what it saved.
        { id: 'raid_protected', on: { type: 'defeat', id: 'festival_raiders' }, effects: [
            { say: 'The last grey robe goes down among the overturned benches. The stallholders are shaken, but every one of them is standing.' },
            { say: 'Up at the north stair, the one with the memorial roll is long gone over the wall.' },
            { flag: 'raid_over' }
        ] },
        { id: 'raid_pursued', on: { type: 'defeat', id: 'festival_thief' }, effects: [
            { say: "You catch him under the chained orchard gate. The memorial roll is safe, and there's a folded order in his boot with an ash circle on it." },
            { say: "Behind you, down in the square, Greta's stall is on its side and Mara is holding a cloth to her head." },
            { flag: 'raid_over' }, { flag: 'memorial_roll_saved' }
        ] },
        // C1-N04: Sergeant Kess yields (and, if the thief got away at the festival, had the memorial roll).
        { id: 'kess_beaten', on: { type: 'defeat', id: 'orchard_kess' }, effects: [
            { say: 'Kess goes down to one knee and stays there. "Enough. Enough."', important: true },
            { when: { flags: ['festival_protect'] }, say: "In the sergeant's satchel, wrapped in oilcloth: Shamefield's memorial roll, every name still on it." },
            { when: { flags: ['festival_protect'] }, flag: 'memorial_roll_saved' },
            { flag: 'kess_beaten' }
        ] },
        // C1-N05: the siege broken, and what it left behind.
        { id: 'siege_broken', on: { type: 'defeat', id: 'sanctuary_siege' }, effects: [
            { say: 'The last of them runs for the climb. Feathers everywhere, a perch snapped in two, and the cages along the wall pried open with crowbars.' },
            { flag: 'siege_broken' }
        ] },
        // Four exploration secrets (master brief §8): a clue sets a flag, the flag shows the cache, the cache pays once.
        { id: 'hunter_note', on: { type: 'inspect', id: 'road_hunter_note' }, effects: [{ flag: 'hunter_note_read' }] },
        { id: 'hunter_cache', on: { type: 'inspect', id: 'road_hunter_cache' }, effects: [
            { item: 'Pork', key: 'item:hunter_pork' }, { item: 'Rough Hide', key: 'item:hunter_hide' }, { item: 'Padded Jerkin', key: 'item:hunter_jerkin' }
        ] },
        { id: 'quartermaster_marks', on: { type: 'inspect', id: 'tollway_quartermaster_marks' }, effects: [{ flag: 'quartermaster_marks_read' }] },
        { id: 'quartermaster_cache', on: { type: 'inspect', id: 'tollway_supply_cache' }, effects: [
            { item: 'Scrap Metal', key: 'item:qm_scrap' }, { item: 'Apprentice Charm', key: 'item:qm_charm' }, { flag: 'corvin_invoice_found' }
        ] },
        { id: 'miller_note', on: { type: 'inspect', id: 'village_miller_note' }, effects: [{ flag: 'miller_note_read' }] },
        { id: 'miller_recess', on: { type: 'inspect', id: 'village_mill_recess' }, effects: [
            { item: 'Flour', key: 'item:hob_flour' }, { item: 'Small Coin Purse', key: 'item:hob_purse' }
        ] },
        { id: 'ridge_rope', on: { type: 'inspect', id: 'featherwatch_ridge_rope' }, effects: [{ flag: 'ridge_rope_found' }] },
        { id: 'ridge_lookout', on: { type: 'inspect', id: 'featherwatch_lookout' }, effects: [
            { item: 'Bandages', key: 'item:lookout_bandages' }, { item: 'Wild Herbs', key: 'item:lookout_herbs' }
        ] },
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
        quests, npcs, triggers, anchors,
        // Older saves (save.js runStoryCatchUp): a statue woken before the Fallen gifts existed hands them over on load.
        catchUp: [
            { id: 'seraph_gifts', if: { flags: ['seraph_awakened'] }, effects: [{ legend: 'fallen_seraphim' }] },
            // A run that finished Get to Know the Locals on five favours, before A Proper Meal existed, never hears of it
            // (only the Captain's deal and his reminder offer it, and both need L01 still open): Oda offers it instead.
            { id: 'sf6_offer', if: { quests: { L01: 'complete', SF6: 'unseen' } }, effects: [{ available: 'SF6' }] },
            // The Broken Crown rework (2026-11-11): a run that returned the register but is still waiting at the shut gate
            // (the old six-favour deal) gets the new way north as well, and keeps its favours: two of them already count.
            { id: 'broken_oath_route', if: { quests: { Q05: 'complete', 'C1-N02': 'unseen' }, notFlags: ['north_gate_open'] },
                effects: [...LOCALS.map((q) => ({ available: q })), { start: 'C1-N02' }] }
        ]
    };

    // Chapter Two (src/story/chapter2.js, loaded before this file in the browser) joins the same story: one set of
    // quests, flags and NPCs, so a save carries straight on. Q08 "Ten Seals" stops being a pointer and leads there.
    const ch2 = isNode ? require('./chapter2.js') : (ENSO.story && ENSO.story.chapter2);
    if (ch2) {
        Object.assign(quests, ch2.quests);
        Object.assign(npcs, ch2.npcs);
        Object.assign(anchors, ch2.anchors);
        triggers.push(...ch2.triggers);
        const q08 = quests.Q08;
        delete q08.teaser;
        Object.assign(q08.objectives[0], { text: ch2.q08.objective, marker: ch2.q08.marker });
        q08.onComplete = [{ start: ch2.q08.start }];
    }

    (ENSO.story || (ENSO.story = {})).chapter1 = chapter1;
    if (isNode) module.exports = chapter1;
})(typeof window !== 'undefined' ? window : globalThis);
