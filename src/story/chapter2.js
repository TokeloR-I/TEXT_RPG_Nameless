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
 * Lines here are first-pass DRAFTS for Wick and Ashby to own. XP and Gold are CANDIDATES for Gauge.
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
                { id: 'eydis', text: 'Find Eydis at the memorial stone in Skeldvik', on: { type: 'story', id: 'eydis_harbor' }, marker: { map: 'skeldvik', x: 8, y: 7 } },
                { id: 'memorial', text: "Look at Skeldvik's memorial stone", on: { type: 'inspect', id: 'skeldvik_memorial' }, marker: { map: 'skeldvik', x: 7, y: 6 } },
                { id: 'leif', text: 'Ask Leif Ropehand the shipwright about the armed crews', on: { type: 'story', id: 'leif_crews' }, marker: { map: 'skeldvik', x: 8, y: 20 } },
                { id: 'solveig', text: 'Ask Solveig at the fish stalls what she has seen', on: { type: 'story', id: 'solveig_witness' }, marker: { map: 'skeldvik', x: 20, y: 10 } },
                { id: 'decide', text: 'Tell Eydis what you learned, and decide who keeps the tablet', on: { type: 'story', id: 'tablet_decided' }, marker: { map: 'skeldvik', x: 8, y: 7 } }
            ],
            onComplete: [{ flag: 'skeldvik_evidence' }, { gold: 25, key: 'c202_reward' },
                { say: 'Three harbours, three boards split off their stones, and one banner at every one of them. Whoever leads the Wolf-Banner wants the names of the six hundred, all of them, and is not asking the families.' },
                { start: 'C203' }]
        },
        C203: {
            title: 'The Hall of Winter', kind: 'main', xp: 0, teaser: true,
            summary: 'The assembly meets at Hrafnholm, where the Jarl keeps her hall. Eydis means to read the stolen names aloud there, in front of the man she thinks took them.',
            objectives: [
                { id: 'hrafnholm', text: 'Take the south-west road to Hrafnholm (the next part of Chapter Two)', on: { type: 'story', id: 'hrafnholm_reached' }, marker: { map: 'skeldvik', x: 0, y: 28 } }
            ],
            onComplete: []
        }
    };

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
                        ['npc', "They want something Asta was carrying. I don't have a sword, I have a harp, and Hakon has a broken wrist. If you're going to do something, do it."]
                    ],
                    choices: [{ text: "Stay by the fire.", end: 'interrupt' }]
                },
                meet: {
                    lines: [
                        ['npc', "You fight like someone who's done it before and doesn't remember where. I'm Eydis. I keep the Roll."],
                        ['npc', "Six hundred of ours went to the Silent Field twenty years ago and did not come home. No bodies. Every village cut its own names into wood, so somebody would still say them."]
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
                        ['npc', "All of the tablets, copied into one book, and every name sung once a year so the count stays honest. I have four hundred and eleven."],
                        ['npc', "Some families cut a name in that the next valley swears was never there. I write both down. A skald who only keeps the tidy version is a liar with a good voice."]
                    ],
                    choices: [
                        { text: 'Why would raiders want a list of the dead?', to: 'why' },
                        { text: 'I found this under her hands.', if: { items: [TABLET] }, to: 'tablet' },
                        { text: "I'll clear the pass.", effects: [{ event: { type: 'story', id: 'eydis_roll' } }], to: 'onward' }
                    ]
                },
                why: {
                    lines: [
                        ['npc', "I don't know, and that frightens me more than the axes. You can't ransom a name. You can't sell it."],
                        ['npc', "They wore the running wolf. That's Torvald Redhand's banner, and Torvald doesn't do things for no reason. Asta's tablet is the third taken since midsummer."]
                    ],
                    choices: [
                        { text: 'What is the Roll?', to: 'roll' },
                        { text: 'I found this under her hands.', if: { items: [TABLET] }, to: 'tablet' },
                        { text: "I'll clear the pass.", effects: [{ event: { type: 'story', id: 'eydis_roll' } }], to: 'onward' }
                    ]
                },
                tablet: {
                    lines: [
                        ['npc', "Birkholt's. Forty names. Asta cut the last eleven herself, after her eyes went, by feel."],
                        ['npc', "Carry it for me as far as Skeldvik. Nobody stops a stranger to ask what's in their pack. Everybody stops me."]
                    ],
                    choices: [
                        { text: 'What is the Roll?', to: 'roll' },
                        { text: 'Why would raiders want it?', to: 'why' },
                        { text: "I'll carry it. And I'll clear the pass.", effects: [{ event: { type: 'story', id: 'eydis_roll' } }], to: 'onward' }
                    ]
                },
                onward: {
                    lines: [['npc', "There's a woman in the gap with a wolf on her shoulders. Ulfrun. She's kin to half of Birkholt, which is the worst of it. I'll bring Hakon down by the goat track once the road is quiet."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                pass_again: {
                    lines: [['npc', "Skeldvik is down the far side. Ask for me at the memorial stone. And mind the tablet: it's the only copy of eleven of those names."]],
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
                        ['npc', "That board was whole at midsummer. Skeldvik is the fourth, then. Somebody here watched it happen. Ask Leif at the yard about the crews, and Solveig at the fish stalls. She misses nothing and forgives less."]
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
                        { text: "I'm still asking.", if: { notFlags: ['tablet_decided'] }, end: true },
                        { text: 'Goodbye.', if: { flags: ['tablet_decided'] }, end: true }
                    ]
                },
                field: {
                    lines: [
                        ['npc', "A cold flat place past Hrafnholm. The old Crown's army came up the road it had built, and ours stood in its way. By evening ours were gone."],
                        ['npc', "Not dead on the grass. Gone. The ones who came back don't agree on what they saw. I have nine accounts and no two match. I've stopped asking which is true. I ask which hurts to tell."]
                    ],
                    choices: [{ text: 'Back.', to: 'harbor_again' }]
                },
                report: {
                    lines: [
                        ['npc', "The wolf at every harbour, silver that isn't Torvald's own, and they want the names whole. Then it isn't spite. He needs the Roll for something."],
                        ['npc', "The assembly meets at Hrafnholm before the snow. I'm going to read every stolen name out loud with him standing there. But the tablet can't come with me on an open road. Who keeps it?"]
                    ],
                    choices: [
                        { text: 'You. It belongs with the Roll.', effects: [{ removeItem: TABLET }, { flag: 'tablet_with_eydis' }, { flag: 'tablet_decided' }, { event: { type: 'story', id: 'tablet_decided' } }], to: 'chose_eydis' },
                        { text: "Thora's guard. It should sit behind a locked chest and a law.", effects: [{ removeItem: TABLET }, { flag: 'tablet_with_reeve' }, { flag: 'tablet_decided' }, { event: { type: 'story', id: 'tablet_decided' } }], to: 'chose_reeve' },
                        { text: "I'll keep carrying it. Nobody stops a stranger.", effects: [{ flag: 'tablet_kept' }, { flag: 'tablet_decided' }, { event: { type: 'story', id: 'tablet_decided' } }], to: 'chose_kept' }
                    ]
                },
                chose_eydis: {
                    lines: [['npc', "Then they'll have to come through me, and I am very loud. Thank you. I'll copy it tonight, twice."]],
                    choices: [{ text: 'What happens now?', to: 'next' }, { text: 'Goodbye.', end: true }]
                },
                chose_reeve: {
                    lines: [['npc', "Thora's honest. She's also the Jarl's, and the Jarl would rather nobody read anything aloud this year. But it will be safe. I can live with safe."]],
                    choices: [{ text: 'What happens now?', to: 'next' }, { text: 'Goodbye.', end: true }]
                },
                chose_kept: {
                    lines: [['npc', "Hm. I asked you to carry it to Skeldvik and here we are in Skeldvik. All right. But you'll stand next to me at Hrafnholm when I read it. That's the price."]],
                    choices: [{ text: 'What happens now?', to: 'next' }, { text: 'Goodbye.', end: true }]
                },
                next: {
                    lines: [['npc', "West, to Hrafnholm, when the road is open. Jarl Ragnhild holds the hall and Torvald Redhand wants it. Go and look at them both before you decide which one you believe. I'd like to know what a stranger sees."]],
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
                    lines: [['npc', "They turned the wagon over with her still in it. Sixty years she wove sailcloth for that coast and they tipped her out like turnips."]],
                    choices: [{ text: 'Stay down.', end: 'interrupt' }]
                },
                after: {
                    lines: [['npc', "I'll set the wagon up when my wrist lets me. She's going home to Birkholt if I have to carry her."]],
                    choices: [
                        { text: 'Who was she?', to: 'asta' },
                        { text: 'Did you know the raiders?', to: 'raiders' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                asta: {
                    lines: [
                        ['npc', "Asta. A weaver. Her man Ketil went to the Silent Field with a borrowed spear and a new cloak she'd finished that morning."],
                        ['npc', "She kept the tablet after the old keeper died. Every spring she'd take it down and read it with her thumbs. She never once said his name out loud. She said the wood could do it."]
                    ],
                    choices: [{ text: 'Did you know the raiders?', to: 'raiders' }, { text: 'Goodbye.', end: true }]
                },
                raiders: {
                    lines: [['npc', "Knew one. Sold him a ewe last autumn. Good lad, his uncle's on that tablet. I don't understand people any more. I understand sheep."]],
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
                    lines: [['npc', "If you've come about passage, I build them, I don't sail them. If you've come about money, I haven't any. If it's anything else, hold this end."]],
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
                        ['npc', "Wolf-Banner. Two ships since midsummer, a third coming. They pay for their mooring, which is the trouble. Thora can't turn away a crew that pays."],
                        ['npc', "They paid me too, for that hull. In hack-silver cut from southern plate. The old Crown's plate. I know the stamp, I paid dues on it for six years. I didn't ask where a northern war-chief gets that."]
                    ],
                    effects: [{ flag: 'leif_told' }, { event: { type: 'story', id: 'leif_crews' } }],
                    choices: [
                        { text: 'You took it anyway.', to: 'debt' },
                        { text: 'Thank you.', end: true }
                    ]
                },
                crews_again: {
                    lines: [['npc', "Wolf-Banner crews, paying in the old Crown's silver. That's all I know and more than I wanted to."]],
                    choices: [{ text: 'You took it anyway.', to: 'debt' }, { text: 'Goodbye.', end: true }]
                },
                debt: {
                    lines: [['npc', "I owe three households and a man in Hrafnholm who counts on his fingers so you can watch him do it. Yes. I took it. Tell Eydis I said so, she'll put it in a verse and I'll deserve it."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                ship: {
                    lines: [['npc', "Twenty oars a side when she's done. Oak keel, pine strakes, every plank split along the grain so it bends and doesn't break. A sawn plank is a dead plank."]],
                    choices: [{ text: 'There is a mark on the keel.', to: 'mark' }, { text: 'Goodbye.', end: true }]
                },
                mark: {
                    lines: [['npc', "My brother's. He taught me the trade and went to the Silent Field. I cut it into every keel so he gets to sea one way or another. Don't tell the buyers."]],
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
                    lines: [['npc', "Cod, dried, by the pair. Herring, salted, by the cask. Opinions, free."]],
                    choices: [
                        { text: 'Eydis says you miss nothing. Who split the memorial board?', if: { flags: ['eydis_harbor_met'], notFlags: ['solveig_told'] }, to: 'witness' },
                        { text: 'Tell me again what you saw.', if: { flags: ['solveig_told'] }, to: 'witness_again' },
                        { text: 'An opinion, then.', to: 'opinion' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                witness: {
                    lines: [
                        ['npc', "Four nights ago, at the turn of the tide. Three of them off the narrow ship, with a wedge and a mallet wrapped in cloth so it wouldn't ring. They knew which half they wanted."],
                        ['npc', "One had it under his cloak like a baby. I shouted. He looked right at me and said, 'They'll thank us, mother.' I'm not his mother. My son's name was on that half."]
                    ],
                    effects: [{ flag: 'solveig_told' }, { event: { type: 'story', id: 'solveig_witness' } }],
                    choices: [
                        { text: 'Did you tell Thora?', to: 'thora' },
                        { text: 'Thank you.', end: true }
                    ]
                },
                witness_again: {
                    lines: [['npc', "Three men off the Wolf-Banner ship, a wedge, a muffled mallet. 'They'll thank us, mother.' I hear it when I'm gutting."]],
                    choices: [{ text: 'Did you tell Thora?', to: 'thora' }, { text: 'Goodbye.', end: true }]
                },
                thora: {
                    lines: [['npc', "I told her. She wrote it down. She's got eight guards and they've got sixty oars. Writing it down is what she can do."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                opinion: {
                    lines: [['npc', "The Jarl is careful and Redhand is angry, and people round here are tired of careful. Doesn't make him right. A man can be wrong and still be the only one saying what you feel."]],
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
                    lines: [['npc', "Harbour law is short. Pay your mooring, keep your steel in its sheath on the wharf, and ring that bell if you see fog before I do. You're on foot, so only two of those apply."]],
                    choices: [
                        { text: 'There are armed crews on your wharf.', to: 'crews' },
                        { text: 'What is the bell for?', to: 'bell' },
                        { text: 'Goodbye.', end: true }
                    ]
                },
                crews: {
                    lines: [['npc', "There are. They've paid and they've broken no law I can prove on the wharf. The board on the stone was cut at night, off the wharf. I know who. Knowing is not proving, and proving is not eight guards against sixty."]],
                    choices: [{ text: 'What is the bell for?', to: 'bell' }, { text: 'Goodbye.', end: true }]
                },
                bell: {
                    lines: [['npc', "Fog. Late ships. And once a year we ring it forty-three times for Skeldvik's share of the six hundred. Put your hand on the rope if you like. Everyone does. It brings you back, they say."]],
                    choices: [{ text: 'There are armed crews on your wharf.', to: 'crews' }, { text: 'Goodbye.', end: true }]
                },
                keeping: {
                    lines: [['npc', "The Birkholt tablet is in the dues chest under two locks and my bed. If the Jarl asks, I'll tell her I have it. If Redhand asks, I'll tell him the same, and then we'll see what eight guards are worth."]],
                    choices: [{ text: 'Goodbye.', end: true }]
                },
                after: {
                    lines: [['npc', "The skald says you can be trusted with things. I'd have locked it up, myself. But I lock everything up. It's the job."]],
                    choices: [{ text: 'What is the bell for?', to: 'bell' }, { text: 'Goodbye.', end: true }]
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
            { say: "Ulfrun goes down on one knee and stays there, leaning on the axe. 'My brother is on that tablet,' she says. 'I wasn't going to burn it. I want him back. Redhand says there is a way.'", important: true },
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
