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
 * Quest ids: C201 = the lore doc's C2-01, C202 = C2-02, C203 = C2-03 (a pointer only, until Hrafnholm is built).
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
        C203: {
            title: 'The Hall of Winter', kind: 'main', xp: 0, teaser: true,
            summary: 'The assembly meets at Hrafnholm, where the Jarl keeps her hall. Eydis means to read the stolen names aloud there, in front of the man she thinks took them.',
            objectives: [
                { id: 'hrafnholm', text: 'Take the south-west road to Hrafnholm (the next part of Chapter Two)', on: { type: 'story', id: 'hrafnholm_reached' }, marker: { map: 'skeldvik', x: 0, y: 36 } }
            ],
            onComplete: []
        }
    };

    // Each line below is one page of the dialogue box (docs/ui/DIALOGUE_BOX.md: at most two sentences, ~160
    // characters); tests/98-chapter-two.test.js checks it. Voices (Wick): Eydis exact and dry, Hakon plain,
    // Leif brusque, Solveig salt, Thora legal, Geir grieving and sure of himself.
    const npcs = {
        // ------------------------------------------------------------- Eydis Namesinger, keeper of the Roll
        eydis: {
            name: 'Eydis Namesinger', title: 'Skald',
            talk: [
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
                        { text: 'Goodbye.', end: true }
                    ]
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
                        { text: 'What are you building?', to: 'ship' },
                        { text: 'There is a mark on the keel.', to: 'mark' },
                        { text: 'Goodbye.', end: true }
                    ]
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
                        { text: 'Goodbye.', end: true }
                    ]
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
                        { text: 'Goodbye.', end: true }
                    ]
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
        }
    };

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
        { id: 'c2_memorial', on: { type: 'inspect', id: 'skeldvik_memorial' }, effects: [{ flag: 'skeldvik_memorial_seen' }] },
        { id: 'anchor_skeldvik', on: { type: 'inspect', id: 'skeldvik_bell' }, if: { flags: ['aspect_nahemoth'] }, effects: [
            { flag: 'anchor:skeldvik' },
            { say: "The crow settles on the bell post. 'Salt, tar and other people's fish. Fine. I'll remember it. Don't ask me to like it.'" },
            { say: '(Black Flight: Skeldvik is attuned.)', important: true }
        ] }
    ];

    const chapter2 = { id: 'ch2', title: 'Chapter Two: The Feast of Empty Seats', quests, npcs, triggers, anchors,
        // Q08 "Ten Seals" was a pointer at a chapter that didn't exist. Now it has somewhere to go.
        q08: { objective: 'Follow the crows east: take the east track from the Overgrown Road', marker: { map: 'road', x: 31, y: 9 }, start: 'C201' } };

    (ENSO.story || (ENSO.story = {})).chapter2 = chapter2;
    if (isNode) module.exports = chapter2;
})(typeof window !== 'undefined' ? window : globalThis);
