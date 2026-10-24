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
 * Mainline XP before the Warden (design table): quests 15+20+25+25+20+30 = 135, required fights
 * 20+25+40+30 = 115, total 250 = level 3 (tests/29-chapter-one.test.js traces it for every class).
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
                { id: 'fog', text: 'Follow the road into the fog', on: { type: 'enter', id: 'tollway' }, marker: { map: 'road', x: 12, y: 21 } },
                { id: 'traveller', text: 'Speak to the traveller at the tollway', on: { type: 'talk', id: 'elian' }, marker: { map: 'tollway', x: 12, y: 6 } },
                { id: 'story', text: 'Hear Elian out', on: { type: 'story', id: 'elian_journey' }, marker: { map: 'tollway', x: 12, y: 6 } }
            ],
            onComplete: [{ flag: 'elian_in_village' }, { start: 'Q04' }]
        },
        // ------------------------------------------------------------- Segment C: Shamefield
        Q04: {
            title: 'Bread and Bell', kind: 'main', xp: 25,
            summary: 'Elian said the village of Shamefield lies past the bridge. Its elder knows the roads north.',
            objectives: [
                { id: 'village', text: 'Cross the bridge and reach Shamefield', on: { type: 'enter', id: 'shamefield' }, marker: { map: 'tollway', x: 9, y: 19 } },
                { id: 'elder', text: 'Speak to Tamsin, the village elder', on: { type: 'talk', id: 'tamsin' }, marker: { map: 'shamefield', x: 9, y: 8 } },
                { id: 'trader', text: 'Meet one of the traders on the square', on: { type: 'story', id: 'met_shopkeeper' }, marker: { map: 'shamefield', x: 12, y: 7 } }
            ],
            onComplete: [{ start: 'Q05' }]
        },
        Q05: {
            title: 'The Orchard Ledger', kind: 'main', xp: 20,
            summary: 'The north orchard road is closed by the watch until someone finds the missing tollway register.',
            objectives: [
                { id: 'captain', text: 'Ask the Watch Captain about the orchard gate', on: { type: 'talk', id: 'watch_captain' }, marker: { map: 'shamefield', x: 6, y: 5 } },
                { id: 'register', text: 'Find the toll register in the tollway wrecks', on: { type: 'inspect', id: 'tollway_register' }, marker: { map: 'tollway', x: 16, y: 16 },
                    effects: [{ item: 'Tollway Register', key: 'item:tollway_register' }] },
                { id: 'return', text: 'Bring the register to the Watch Captain', on: { type: 'story', id: 'register_returned' }, marker: { map: 'shamefield', x: 6, y: 5 } }
            ],
            onComplete: [{ flag: 'north_gate_open' }, { say: 'Somewhere north, a chain rattles and a gate swings open.' }, { start: 'Q06' }]
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
                { id: 'home', text: 'Return to the homestead', on: { type: 'enter', id: 'grounds' }, marker: { map: 'road', x: 9, y: 0 } },
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
                { id: 'hear', text: 'Hear Shane out', on: { type: 'story', id: 'shane_asked' }, marker: { map: 'shamefield', x: 13, y: 10 },
                    effects: [{ flag: 'shane_asked_ledger' }] },
                { id: 'watch', text: "Get past the constables at Shane's allotment", on: { type: 'defeat', id: 'allotment_watch' }, marker: { map: 'allotment', x: 13, y: 9 },
                    effects: [{ flag: 'shane_watch_resolved' }] },
                { id: 'wagon', text: "Take Shane's ledger from the confiscation wagon", on: { type: 'inspect', id: 'allotment_wagon' }, marker: { map: 'allotment', x: 12, y: 9 },
                    effects: [{ item: "Shane's Ledger", key: 'item:shane_ledger' }, { flag: 'shane_ledger_found' }] },
                { id: 'return', text: 'Bring the ledger back to Shane', on: { type: 'story', id: 'shane_ledger_returned' }, marker: { map: 'shamefield', x: 13, y: 10 } }
            ],
            onComplete: [{ removeItem: "Shane's Ledger" }, { flag: 'shane_recruited' }, { flag: 'shane_stall_unlocked' }]
        },
        // ------------------------------------------------------------- Notice board jobs (optional)
        J01: {
            title: 'Wolf on the Road', kind: 'job', xp: 10, candidate: true,
            summary: 'The notice board asks someone to deal with the wolf on the homestead road.',
            objectives: [{ id: 'wolf', text: 'Deal with the wolf on the homestead road', on: { type: 'defeat', id: 'road_wolf' }, marker: { map: 'road', x: 13, y: 10 } }],
            onComplete: []
        },
        J02: {
            title: 'Herbs for Iona', kind: 'job', xp: 10, candidate: true,
            summary: 'Iona the herbalist wants wild herbs from the north orchard.',
            objectives: [
                { id: 'gather', text: 'Gather wild herbs in the north orchard', on: { type: 'pickup', id: 'orchard_herbs' }, marker: { map: 'orchard', x: 23, y: 18 },
                    effects: [{ flag: 'herbs_gathered' }] },
                { id: 'deliver', text: 'Bring the herbs to Iona', on: { type: 'story', id: 'iona_herbs' }, marker: { map: 'shamefield', x: 23, y: 13 } }
            ],
            onComplete: []
        }
    };

    // Shared bits of dialogue
    const shop = (id) => ({ text: 'What have you got?', say: 'What have you got for sale?', stay: true, effects: [{ shop: id }] });
    const met = { event: { type: 'story', id: 'met_shopkeeper' } };

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
                    choices: [{ text: 'Tell me about the heroes again.', to: 'heroes_v' }, { text: 'Goodbye.', end: true }]
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
                    choices: [{ text: 'Why is the village called Shamefield?', to: 'name' }, { text: 'Goodbye.', end: true }]
                },
                after: {
                    lines: [['npc', "The orchard gate's open, I hear. Be careful up there. The Warden is a kind man, but he won't let anyone past the roost."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                mourning: {
                    lines: [['npc', "The crows came down to the village this morning. All of them, silent, on every roof. Then they flew off north and didn't come back. Something's happened to the Warden. He mended my grandson's arm once, you know. Wouldn't take a coin."]],
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
                    choices: [shop('mara'), { text: 'Goodbye.', end: true }]
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
                { if: { quests: { Q05: 'active' }, flags: ['register_carried'] }, node: 'register' },
                { if: { quests: { Q05: 'active' } }, node: 'gate' },
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
                    lines: [['npc', "...Every name's here. Good. The gate's open. Keep to the path, and if the Warden tells you to turn back, turn back."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                suspicious: {
                    lines: [['npc', "Two of my constables came back limping from Shane's allotment, and the evidence wagon's lighter than it was. I can't prove who did it. Yet."]],
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
                    lines: [['npc', "Mend one field plot and I'll give you seed. Plant it, tend it, harvest it, and you'll have ingredients instead of excuses. Two of those and a pot make a remedy. Easy. Mostly."]],
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
            talk: [{ if: { flags: ['orin_met'] }, node: 'again' }, { node: 'first' }],
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
                }
            }
        },

        // ------------------------------------------------------------- Shamefield expansion (Vaelis's DRAFT cast; working names)
        // SHAMEFIELD_VILLAGE_LORE_AND_PRODUCTION.md. Talk only: no shops until Rook's bread/beer/pork items exist.
        fenric: {
            name: 'Brother Fenric', title: 'Cloister brewer',
            talk: [{ node: 'hello' }],
            nodes: {
                hello: {
                    lines: [['npc', "Mind the casks. Every one of them is younger than it thinks it is. Brother Fenric. I make the Briarwell Pale, and I argue with the baker."]],
                    choices: [{ text: 'What do you argue about?', to: 'bread' }, { text: 'The hops look sick at the end of the row.', to: 'hops' }, { text: 'Goodbye.', end: true }]
                },
                bread: {
                    lines: [['npc', 'Oda says I soak good grain in a bucket and call it holy. I say bread is only beer that gave up too soon. The village says: bread for the living, a barrel for the winter. We are both right, which is unbearable.']],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                hops: {
                    lines: [['npc', "You noticed? Brown at the edges. It's the water, or the soil, or someone who wants me to fail. Sister Merrow says it's my temper. I'll find out."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                }
            }
        },
        merrow: {
            name: 'Sister Merrow', title: 'Granary steward',
            talk: [{ node: 'hello' }],
            nodes: {
                hello: {
                    lines: [['npc', 'Barley to the brewery, rye to the ovens, and the red-cord sacks to nobody. Sister Merrow. I keep the granary, which mostly means I keep saying no.']],
                    choices: [{ text: 'Who are the red-cord sacks for?', to: 'reserve' }, { text: 'Goodbye.', end: true }]
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
                    choices: [{ text: 'It smells wonderful.', to: 'crust' }, { text: 'What about the brewer?', to: 'brewer' }, { text: 'Goodbye.', end: true }]
                },
                crust: {
                    lines: [['npc', "Dark rye, sourdough, beech fire. The city bakes white bread so soft you could sleep on it. Here, a crust has to survive a week on the road. I'd sell you one, but the cloister hasn't milled this week's flour yet."]],
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
                    choices: [{ text: 'Business is good?', to: 'salt' }, { text: 'Goodbye.', end: true }]
                },
                salt: {
                    lines: [['npc', "Good as the salt road. No salt, no smoking, no winter stores. The carts have come late all season. Bragg says it's the road. I say it's somebody on the road."]],
                    choices: [{ text: 'Goodbye.', end: true }]
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
        { id: 'chant', on: { type: 'enter', id: 'shamefield' }, effects: [
            { say: "Somewhere near the well, a crowd is chanting: 'Shame on Shane! Shame on Shane!'" },
            { available: 'S01' }
        ] },
        { id: 'notice_board', on: { type: 'inspect', id: 'village_notice_board' }, effects: [{ start: 'J01' }, { start: 'J02' }] },
        { id: 'anchor_shamefield', on: { type: 'inspect', id: 'village_well' }, effects: [{ flag: 'anchor:shamefield' }] },
        { id: 'register', on: { type: 'inspect', id: 'tollway_register' }, effects: [{ flag: 'register_carried' }] },
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
        merchants: { mara: 'Mara', bragg: 'Bragg', iona: 'Iona', shane: 'Shane' },
        quests, npcs, triggers, anchors
    };

    (ENSO.story || (ENSO.story = {})).chapter1 = chapter1;
    if (isNode) module.exports = chapter1;
})(typeof window !== 'undefined' ? window : globalThis);
