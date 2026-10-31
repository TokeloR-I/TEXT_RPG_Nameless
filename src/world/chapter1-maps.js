/* =========================================================================
 * Enso's Last Stand — WORLD DATA: Chapter One beyond the fog (CH1-03)
 * Design: docs/design/ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md (traversal map, segments B–E).
 * Pure data, merged into the Zone 1 world by src/world/zone1.js. Same format as zone1.js, plus:
 *   interactables kind 'npc'  { id, kind: 'npc', npc: '<story npc id>', x, y, name, sprite, when? }
 *                             E talks; the conversation lives in src/story/chapter1.js
 *   when      (any placed thing) a story condition: present only while it holds
 *   requires  (exits) a story condition; until it holds the way is shut and `lockedText` says why
 * Story conditions: { flags: [...], notFlags: [...], quests: { Q05: 'complete' | 'active+' } }.
 * Every required fight stands in a one-tile gap, so the route can't skip it (XP guarantee:
 * 135 quest XP + 115 enemy XP = 250 before the Warden; tests/29-chapter-one.test.js traces it).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    // New tiles (painters in ui/world-render.js).
    const tiles = {
        '_': { name: 'bridge' },
        '+': { name: 'cobble' },
        'm': { name: 'stall', solid: true },
        'N': { name: 'notice_board', solid: true },
        'A': { name: 'fruit_tree', solid: true },
        'Z': { name: 'seal_door', solid: true },
        'k': { name: 'cage', solid: true },
        'M': { name: 'memorial', solid: true },
        'w': { name: 'wagon', solid: true },
        'C': { name: 'cart', solid: true },
        // Shamefield expansion (SHAMEFIELD_VILLAGE_MAP_AND_IMPLEMENTATION_HANDOFF.md)
        'U': { name: 'fountain', solid: true },
        'V': { name: 'oven', solid: true },
        'j': { name: 'hops', solid: true },
        'X': { name: 'timber_wall', solid: true },
        'g': { name: 'sacks', solid: true },
        'e': { name: 'pig', solid: true },
        'u': { name: 'cask', solid: true },
        'J': { name: 'bell', solid: true },
        'l': { name: 'lantern', solid: true }
    };

    const zones = {
        broken_tollway: { name: 'The Broken Tollway', mapIds: ['tollway'] },
        shamefield_vale: { name: 'Shamefield', mapIds: ['shamefield', 'allotment', 'orchard', 'briarwell_cloister_court', 'village_residential_lane'] },
        featherwatch_heights: { name: 'Featherwatch', mapIds: ['featherwatch', 'sanctuary', 'seal_chamber'] }
    };

    const maps = {
        // -----------------------------------------------------------------
        // Segment B: Beyond the Fog. Elian, the Ragpickers on the only bridge, the Root-Chewers in the carts.
        tollway: {
            zoneId: 'broken_tollway',
            name: 'The Broken Tollway',
            ambient: { darkness: 0.18, tint: 'rgba(70, 72, 90, 0.25)' },
            tiles: [
                'TTTTTTTTTT:TTTTTTTTTTT',
                'TT,,,,,,,,:,,,,,,,,,TT',
                'TT,ppp,,,,:,,,,o,,,,TT',
                'TT,PdP,,,,:,,,,,,,,,TT',
                'TT,,,,,,,::,,I,,,,,,TT',
                'TT,x,,,,,:,,,,,,,Y,,TT',
                'TT,,,,,,,:,,,,,,,,,,TT',
                'TT,,,o,,,:,,,,,,,,,,TT',
                'TT,,,,,,,:,,,,,,,o,,TT',
                '~~~~~~~~~_~~~~~~~~~~~~',
                '~~~~~~~~~_~~~~~~~~~~~~',
                'TT,,,,,,,:,,,,,,,,,,TT',
                'TT,,C,,,,:,,,,,C,,,,TT',
                'TTCCoCCCC:CCCCCoCCCCTT',
                'TT,,,,,,,:,,,,,,,,,,TT',
                'TT,,Y,,,,:,,,,,,,o,,TT',
                'TT,,,,,,,:,,,,,,,,,,TT',
                'TT,,,,,,,:,,,,C,,,,,TT',
                'TT,,,,,,,:,,,,,,,,,,TT',
                'TTTTTTTTT:TTTTTTTTTTTT'
            ],
            spawns: {
                from_road: { x: 10, y: 1, facing: 'down' },
                from_village: { x: 9, y: 18, facing: 'up' }
            },
            exits: [
                { id: 'tollway_north', x: 10, y: 0, trigger: 'step', toMap: 'road', toSpawn: 'from_tollway' },
                { id: 'tollway_south', x: 9, y: 19, trigger: 'step', toMap: 'shamefield', toSpawn: 'from_tollway',
                    text: 'Past the last of the carts the road widens. Smoke rises from chimneys ahead: a village.' }
            ],
            encounters: [
                { id: 'tollway_ragpickers', gate: true, x: 9, y: 9, name: 'Ragpicker Pair', enemies: ['weak_goblin', 'weak_goblin'], trigger: 'contact', sprite: 'goblins',
                    text: 'Two thin goblins squat on the bridge, picking through a dead traveller\'s pack. They look more hungry than cruel. They won\'t let you pass, though. Walk into them to fight, or come back later.' },
                { id: 'tollway_root_chewers', gate: true, x: 9, y: 13, name: 'Root-Chewers', enemies: ['bone_gnawer', 'rust_rat'], trigger: 'contact', sprite: 'gnawer',
                    text: 'Something bony is gnawing at the cart wheels in the only gap through the wreckage, a rust-furred rat at its heels.' }
            ],
            interactables: [
                { id: 'tollway_elian', kind: 'npc', npc: 'elian', x: 12, y: 6, name: 'Elian', sprite: 'traveller', when: { notFlags: ['elian_in_village'] } },
                { id: 'tollway_warning_post', kind: 'inspect', x: 13, y: 4, name: 'Warning post',
                    text: 'A post painted with the heroes\' emblem: a sun breaking a crown. Under it, newer paint: THE NORTH ROOST IS SEALED. TRAVELLERS KEEP TO THE ROAD.' },
                { id: 'tollway_goods', kind: 'inspect', x: 3, y: 5, name: 'Scattered goods',
                    text: 'Bolts of cloth, a cracked jar of honey, a child\'s wooden horse. Whoever owned them left in a hurry, or didn\'t leave at all.' },
                { id: 'tollway_booth', kind: 'inspect', x: 4, y: 3, name: 'Toll booth',
                    text: 'The toll booth\'s shutter hangs open. A ledger shelf inside is empty except for a ring of dust where a book once sat.' },
                { id: 'tollway_register', kind: 'inspect', x: 16, y: 16, name: 'Strongbox', sprite: 'strongbox', when: { quests: { Q05: 'active' } },
                    text: 'A strongbox wedged under a broken axle, its lock smashed and its coins long gone. Nobody wanted the heavy book inside: the tollway register.' },
                { id: 'tollway_cart', kind: 'inspect', x: 4, y: 12, name: 'Wrecked cart',
                    text: 'The cart was pushed over on purpose and chained to the others: a barricade, once. Whatever it was meant to keep out got in anyway.' }
            ]
        },

        // -----------------------------------------------------------------
        // Segment C: Shamefield village (Q04, Q05, Shane's S01, the notice-board jobs).
        shamefield: {
            zoneId: 'shamefield_vale',
            name: 'Shamefield',
            // Original scene art (ui/scene-shamefield.js, Saffron/Quill) paints this map whole after Tokelo's reference
            // (2026-10-31): the raven tree in the cobbled square, the church to the north-east, the watermill and the
            // falls to the west, the plank bridge, the north stair, the south gate. Its tiles still decide collision.
            scene: 'shamefield',
            ambient: { darkness: 0.15, tint: 'rgba(80, 50, 40, 0.12)', particles: { kind: 'embers', count: 10 },
                grade: { ambient: 0.74, exposure: 1.02, highlights: [0.1, 0.04, -0.04] } },
            legend: {
                ',': { name: 'grass' }, ':': { name: 'dirt_path' }, '+': { name: 'cobble' }, '_': { name: 'bridge' },
                '~': { name: 'water', solid: true }, 'W': { name: 'waterfall', solid: true }, 'c': { name: 'cliff', solid: true },
                'R': { name: 'ruin', solid: true }, 's': { name: 'stone_stairs' }, 'T': { name: 'tree', solid: true },
                'Y': { name: 'dead_tree', solid: true }, 'Q': { name: 'raven_tree', solid: true }, 'B': { name: 'banner', solid: true },
                'l': { name: 'lantern', solid: true }, 'N': { name: 'notice_board', solid: true }, 'm': { name: 'stall', solid: true },
                'O': { name: 'well', solid: true }, 'U': { name: 'fountain', solid: true }, 'M': { name: 'memorial', solid: true },
                'C': { name: 'cart', solid: true }, 'x': { name: 'crate', solid: true }, 'b': { name: 'barrel', solid: true },
                'f': { name: 'fence', solid: true }, 'j': { name: 'crops', solid: true }, 'e': { name: 'chickens', solid: true },
                'p': { name: 'hen_hut', solid: true }, 'h': { name: 'house', solid: true }, 'k': { name: 'slate_house', solid: true },
                'q': { name: 'watermill', solid: true }, 'w': { name: 'mill_wheel', solid: true }, 'G': { name: 'church', solid: true }
            },
            tiles: [
                'RRRRRRRccccccccccccscccccccGGGcc',
                'RRRRRRRcccccccccccssscccccGGGGGT',
                'TcccccccTchhhhhh,,sss,,,,,GGGGGc',
                'WWcccccccchhhhhh,B:::,,,,,GGGGGT',
                'WW,,,,,,,,hhhhhh,,:::,,Y,,GGGGGc',
                'WW,,Ykkkkkhhhhhh,,:b:,,,,,GGGGGc',
                '~~~,,kkkkkhhhhhh,,:::NN,,,GGGGGc',
                '~~~,,kkkkk+++++l++++l+++++GGGGGc',
                '~~~,,kkkkk+C++++b++++++mmm+sss,c',
                '~~~,qqqq+x+++++++++++++mmml+::::',
                '~~~,qqqqY+++++++++++++++++++::::',
                '~~~,qqqq++++++++QQQQ++++++++,hhh',
                '~~wwqqqql+++++++QQQQ++++++O+,hhh',
                '~~wwqqqq++++B+++QQQQ++++U+++Mhhh',
                'TWWWW,,,+hhhhhh++++++++++++++hhh',
                'TWWWW,,,+hhhhhhY++++++ffffff,hhh',
                '~~~~~~:::hhhhhh++++++Yfjjjjf::::',
                '~~~~~~:::hhhhhhl++++++fjjjjfppe,',
                '______:::hhhhhh,,,,,hhhhh,bxppeT',
                '~~~~~~,kkkk,,,,,::,,hhhhhccccccT',
                '~~~~~~,kkkk,,,,B::B,hhhhhCcccccc',
                '~~~~~~ckkkkcccc,::,chhhhhccccccc',
                '~~~~~~TccccTcccl::lccccccccccccc',
                '~~~~~~cccccccccc:ccccccccccccccc'
            ],
            // Warm light from the windows and the church glass (the torches light themselves).
            lights: [
                { x: 12, y: 6, radius: 1.3, color: 'rgba(255, 170, 80, 0.22)' }, { x: 7, y: 8, radius: 1.2, color: 'rgba(255, 170, 80, 0.2)' },
                { x: 6, y: 13, radius: 1.3, color: 'rgba(255, 170, 80, 0.22)' }, { x: 11, y: 18, radius: 1.3, color: 'rgba(255, 170, 80, 0.22)' },
                { x: 8, y: 21, radius: 1.1, color: 'rgba(255, 170, 80, 0.2)' }, { x: 22, y: 21, radius: 1.2, color: 'rgba(255, 170, 80, 0.2)' },
                { x: 30, y: 15, radius: 1.1, color: 'rgba(255, 170, 80, 0.2)' }, { x: 28, y: 5, radius: 1.8, color: 'rgba(255, 80, 50, 0.22)' }
            ],
            spawns: {
                from_tollway: { x: 16, y: 22, facing: 'up' },
                from_orchard: { x: 19, y: 1, facing: 'down' },
                from_allotment: { x: 1, y: 18, facing: 'right' },
                flight_well: { x: 26, y: 13, facing: 'up' },      // Black Flight arrival, beside the well
                from_cloister: { x: 30, y: 9, facing: 'left' },
                from_lane: { x: 30, y: 16, facing: 'left' }
            },
            exits: [
                { id: 'shamefield_south', x: 16, y: 23, trigger: 'step', toMap: 'tollway', toSpawn: 'from_village' },
                { id: 'shamefield_north_gate', x: 19, y: 0, trigger: 'step', toMap: 'orchard', toSpawn: 'from_village',
                    requires: { flags: ['north_gate_open'] },
                    lockedText: 'The orchard gate is chained shut. A painted board on it reads: CLOSED BY ORDER OF THE WATCH. ASK THE WATCH CAPTAIN.' },
                { id: 'shamefield_west', x: 0, y: 18, trigger: 'step', toMap: 'allotment', toSpawn: 'from_village' },
                { id: 'shamefield_cloister', x: 31, y: 9, trigger: 'step', toMap: 'briarwell_cloister_court', toSpawn: 'from_village',
                    text: 'The lane climbs past the last houses to a stone arch. Beyond it, a bell, a courtyard, and the warm, sour smell of malt.' },
                { id: 'shamefield_lane', x: 31, y: 16, trigger: 'step', toMap: 'village_residential_lane', toSpawn: 'from_village',
                    text: 'Behind the square, the houses lean together over a narrow cobbled lane. Bread, woodsmoke and pigs, in roughly that order.' }
            ],
            interactables: [
                { id: 'village_tamsin', kind: 'npc', npc: 'tamsin', x: 15, y: 12, name: 'Tamsin', sprite: 'elder' },
                { id: 'village_mara', kind: 'npc', npc: 'mara', x: 24, y: 10, name: 'Mara', sprite: 'trader' },
                { id: 'village_bragg', kind: 'npc', npc: 'bragg', x: 12, y: 8, name: 'Bragg', sprite: 'smith' },
                { id: 'village_iona', kind: 'npc', npc: 'iona', x: 21, y: 14, name: 'Iona', sprite: 'herbalist' },
                { id: 'village_captain', kind: 'npc', npc: 'watch_captain', x: 17, y: 4, name: 'Watch Captain', sprite: 'captain' },
                { id: 'village_elian', kind: 'npc', npc: 'elian', x: 20, y: 9, name: 'Elian', sprite: 'traveller', when: { flags: ['elian_in_village'] } },
                { id: 'village_shane', kind: 'npc', npc: 'shane', x: 24, y: 11, name: 'Shane', sprite: 'shane', when: { notFlags: ['shane_recruited'] } },
                { id: 'village_crowd', kind: 'npc', npc: 'crowd', x: 22, y: 11, name: 'Villagers', sprite: 'crowd', when: { notFlags: ['shane_watch_resolved'] } },
                { id: 'village_notice_board', kind: 'inspect', x: 21, y: 6, name: 'Notice board',
                    text: 'FESTIVAL OF THE SUN: the heroes\' victory, one year on! Below the bunting, two handwritten requests: "Wolf on the homestead road. Someone see to it." and "Herbs wanted from the north orchard. Ask Iona."' },
                { id: 'village_well', kind: 'inspect', x: 26, y: 12, name: 'Village well',
                    text: 'The well\'s stones are carved with names: everyone who helped rebuild the bridge last spring. Someone has chalked SHAME ON SHANE across the bucket.' },
                { id: 'village_fountain', kind: 'inspect', x: 24, y: 13, name: 'Market fountain',
                    text: 'Three stone basins, one above the other, splashing into each other. Names are chiselled round the rim: the families who paid to bring the cloister spring down to the square. The well is for drawing water; the fountain is for meeting people.' },
                { id: 'village_cloister_sign', kind: 'inspect', x: 30, y: 10, name: 'Signpost',
                    text: 'East, uphill: BRIARWELL CLOISTER. Someone has added in chalk: AND BEER.' },
                { id: 'village_memorial', kind: 'inspect', x: 28, y: 13, name: 'Memorial stone',
                    text: 'FOR THOSE TAKEN UNDER THE OLD CROWN. Fresh flowers. No names: the list was too long to carve.' }
            ]
        },

        // -----------------------------------------------------------------
        // Shamefield expansion (SHAMEFIELD_VILLAGE_MAP_AND_IMPLEMENTATION_HANDOFF.md, Vaelis): the cloister
        // courtyard and a residential lane. Flavour and inspection only: no new quest gates, no shops yet
        // (bread, beer and pork stock wait for Rook's real item definitions).
        briarwell_cloister_court: {
            zoneId: 'shamefield_vale',
            name: 'Briarwell Cloister',
            ambient: { tint: 'rgba(90, 80, 60, 0.12)', particles: { kind: 'smoke', count: 8 }, grade: { ambient: 0.78, exposure: 1.05, highlights: [0.08, 0.04, -0.03] } },
            tiles: [
                '########################',
                '#hhhhhhhh######hhhhhhhh#',
                '#XXXnXXXX######XXXnXXXX#',
                '#++++++++++J+++++++++++#',
                '#+gg+++++++++++++++uuu+#',
                '#+gg+++++++++++++++uuu+#',
                '#++++++++++U+++++++++++#',
                '#+++++l+++++++++l++++++#',
                '#,,,,,,,,,,::,,,,,jjjj,#',
                '#,,,,,,,,,l::,,,,,,,,,,#',
                '#,,,,,,,,,,::,,,,,jjjj,#',
                '#,,,,,,,,,,::,,,,,,,,,,#',
                ':::::::::::::,,,,,jjjj,#',
                '#,,,,,,,,,,,,,,,,,,,,,,#',
                '#,,T,,,,,,,,,,,,,,,T,,,#',
                '########################'
            ],
            spawns: { from_village: { x: 1, y: 12, facing: 'right' } },
            exits: [
                { id: 'cloister_west', x: 0, y: 12, trigger: 'step', toMap: 'shamefield', toSpawn: 'from_cloister' }
            ],
            interactables: [
                { id: 'cloister_fenric', kind: 'npc', npc: 'fenric', x: 17, y: 6, name: 'Brother Fenric', sprite: 'monk' },
                { id: 'cloister_merrow', kind: 'npc', npc: 'merrow', x: 4, y: 6, name: 'Sister Merrow', sprite: 'steward' },
                { id: 'cloister_charter', kind: 'inspect', x: 4, y: 2, name: 'Cloister charter',
                    text: 'A board behind glass, the ink brown with age: the cloister may brew, bake and keep a granary "for the living, and against the winter". Older than the old crown. Nobody tore it down, so nobody had to put it back up.' },
                { id: 'cloister_casks', kind: 'inspect', x: 19, y: 4, name: 'Casks',
                    text: 'Chalk on every cask: BRIARWELL PALE, a date, and a small cross for each time the brewer tasted it. Some have a great many crosses.' },
                { id: 'cloister_granary', kind: 'inspect', x: 2, y: 4, name: 'Granary sacks',
                    text: 'Barley for the brewery, rye for the ovens, and a row set apart, tied with red cord: the reserve. A slate says DO NOT TOUCH in two different hands.' },
                { id: 'cloister_cistern', kind: 'inspect', x: 11, y: 6, name: 'Fountain house',
                    text: 'The spring comes up cold under a little stone roof. From here it runs to the brewery, to the gardens, and down the hill to the square. A cup on a chain. The water tastes of stone.' },
                { id: 'cloister_bell', kind: 'inspect', x: 11, y: 3, name: 'Cloister bell',
                    text: 'Its rope is worn smooth. It rings for dawn, for meals, and once, a year ago, for an hour without stopping.' },
                { id: 'cloister_hops', kind: 'inspect', x: 18, y: 8, name: 'Hop trellis',
                    text: 'Green cones hang in rows, sticky and bitter-smelling. A few leaves at the end have gone brown at the edges.' }
            ]
        },

        village_residential_lane: {
            zoneId: 'shamefield_vale',
            name: "Baker's Lane",
            ambient: { tint: 'rgba(90, 70, 50, 0.12)', particles: { kind: 'smoke', count: 10 }, grade: { ambient: 0.78, exposure: 1.05, highlights: [0.08, 0.04, -0.03] } },
            tiles: [
                'TTTTTTTTTTTTTTTTTTTTTTTT',
                'T,hhhhhh,,hhhhhh,,hhhhhT',
                'T,XXnXXX,,XnXXXX,,XXnXXT',
                'T,,,,,,,,,,,,,,,,,,,,,,T',
                'T,V,,,,,l,,,,,,,l,,,,o,T',
                'T++++++++++++++++++++++T',
                'T++++++++++++++++++++++T',
                ':++++++++++++++++++++++T',
                'T,,,,,,,l,,,,,,,l,,,,,,T',
                'T,hhhhh,,ffffff,,hhhhh,T',
                'T,XXnXX,,f,e,,f,,XXnXX,T',
                'T,,,,,,,,f,,e,f,,,,,,,,T',
                'T,,,,x,,,ffffff,,,,,,,,T',
                'TTTTTTTTTTTTTTTTTTTTTTTT'
            ],
            spawns: { from_village: { x: 1, y: 7, facing: 'right' } },
            exits: [
                { id: 'lane_west', x: 0, y: 7, trigger: 'step', toMap: 'shamefield', toSpawn: 'from_lane' }
            ],
            interactables: [
                { id: 'lane_oda', kind: 'npc', npc: 'oda', x: 3, y: 4, name: 'Oda of the Oven', sprite: 'baker' },
                { id: 'lane_greta', kind: 'npc', npc: 'greta', x: 19, y: 3, name: 'Greta Rusk', sprite: 'butcher' },
                { id: 'lane_oven', kind: 'inspect', x: 2, y: 4, name: 'Bread oven',
                    text: 'A domed oven of blackened brick, still warm. Dark rye loaves cool on a board beside it. The crust cracks when you so much as look at it.' },
                { id: 'lane_smokehouse', kind: 'inspect', x: 20, y: 2, name: 'Smokehouse',
                    text: 'Beechwood smoke seeps out between the boards. Inside, in the dark, hams and long sausages hang in rows like bells.' },
                { id: 'lane_pigs', kind: 'inspect', x: 9, y: 10, name: 'Pig pen',
                    text: 'Two pigs, very pleased with the mud. A bucket of bran and bakery crusts stands by the gate: nothing in this lane is wasted.' },
                { id: 'lane_woodpile', kind: 'inspect', x: 5, y: 12, name: 'Woodpile',
                    text: 'Split beech for the oven, oak for the smokehouse. They are stacked apart, and you get the feeling that matters to someone.' },
                { id: 'lane_stone', kind: 'inspect', x: 21, y: 4, name: 'Mounting stone',
                    text: 'A worn stone for climbing onto carts. Children have scratched a game board into the top.' }
            ]
        },

        // -----------------------------------------------------------------
        // Shane's side quest: the watch pursuers by the confiscation wagon (S01).
        allotment: {
            zoneId: 'shamefield_vale',
            name: "Shane's Allotment",
            ambient: { tint: 'rgba(60, 80, 50, 0.15)' },
            tiles: [
                'TTTTTTTTTTTTTTTTTTTT',
                'T,,,,,,,,,,,ppppp,,T',
                'T,""""""",,,pppppo,T',
                'T,""""""",,,PPdPP,,T',
                'T,""""""",,,,,,,,,,T',
                'T,""""""",,,,,,,,,,T',
                'T,,,,,,,,,::::::::::',
                'T,,,,,,,,,,,,,,,,,,T',
                'T,""""""",,,,,,,,,,T',
                'T,""""""",,ww,,,,,,T',
                'T,""""""",,,,,,,Q,,T',
                'T,""""""",,,,,,,,,,T',
                'T,,,,,,,,o,,,,,,,,,T',
                'TTTTTTTTTTTTTTTTTTTT'
            ],
            spawns: { from_village: { x: 18, y: 6, facing: 'left' } },
            exits: [
                { id: 'allotment_east', x: 19, y: 6, trigger: 'step', toMap: 'shamefield', toSpawn: 'from_allotment' }
            ],
            encounters: [
                { id: 'allotment_watch', x: 13, y: 9, name: 'Watch Pursuers', enemies: ['watch_constable', 'watch_constable'], trigger: 'contact', sprite: 'constables',
                    when: { flags: ['shane_asked_ledger'] },
                    text: 'Two constables stand guard over the wagon, truncheons out. They are doing their job. "Move along, friend. This is evidence."' }
            ],
            interactables: [
                { id: 'allotment_wagon', kind: 'inspect', x: 12, y: 9, name: 'Confiscation wagon',
                    text: 'A watch wagon stacked with seized goods: jars, packets, a doctor\'s case. Tied to the top with string is a battered ledger.' },
                { id: 'allotment_shack', kind: 'inspect', x: 14, y: 3, name: "Shane's shack",
                    text: 'Nailed to the door: a notice of seizure, and under it, in a neater hand, "BACK SOON. DON\'T TOUCH THE MINT."' },
                { id: 'allotment_beds', kind: 'inspect', x: 9, y: 12, name: 'Garden beds',
                    text: 'Overgrown beds of mint, yarrow and something purple you don\'t recognise. Whoever planted them knew what they were doing.' }
            ]
        },

        // -----------------------------------------------------------------
        // Q05 opens the gate; the Broken Oath Cultists hold the old causeway north (G3).
        orchard: {
            zoneId: 'shamefield_vale',
            name: 'The North Orchard',
            ambient: { tint: 'rgba(80, 60, 40, 0.18)', particles: { kind: 'fireflies', count: 12 } },
            tiles: [
                'TTTTTTTTTTTTT.TTTTTTTTTTTT',
                'T#####r######.###########T',
                'T############.###########T',
                'T############.###########T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,A,A,A,A,,,:,,,A,A,A,A,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,A,A,A,A,,,:,,,A,A,A,A,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,A,A,A,A,,,:,,,A,A,A,A,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,A,A,A,A,,,:,,,A,A,A,A,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'T,,,o,,,,,,,,:,,,,,,,Y,,,T',
                'T,,,,,,,,,,,,:,,,,,,,,,,,T',
                'TTTTTTTTTTTTT:TTTTTTTTTTTT'
            ],
            spawns: {
                from_village: { x: 13, y: 18, facing: 'up' },
                from_featherwatch: { x: 13, y: 1, facing: 'down' }
            },
            exits: [
                { id: 'orchard_south', x: 13, y: 19, trigger: 'step', toMap: 'shamefield', toSpawn: 'from_orchard' },
                { id: 'orchard_north', x: 13, y: 0, trigger: 'step', toMap: 'featherwatch', toSpawn: 'from_orchard',
                    text: 'Beyond the causeway the ground climbs. Crows watch you from every branch.' }
            ],
            encounters: [
                { id: 'orchard_cultists', gate: true, x: 13, y: 3, name: 'Broken Oath Cultists', enemies: ['cult_acolyte', 'cult_acolyte'], trigger: 'contact', sprite: 'cultists',
                    text: 'Two figures in grey robes chant in the old causeway, scraping a circle into the stones. One looks up at you, and for a moment seems almost hopeful. Then afraid.' }
            ],
            interactables: [
                { id: 'orchard_ritual_marks', kind: 'inspect', x: 12, y: 3, name: 'Scraped circle',
                    text: 'A circle scraped into the causeway stones, left open at the top. You have seen this mark before: in the cellar, on the dead tree, in the well.' },
                { id: 'orchard_herbs', kind: 'pickup', x: 23, y: 18, item: 'Healing Herb Bundle', name: 'Wild herbs', sprite: 'bundle',
                    text: 'A clump of yarrow and feverfew growing in the shade of the last tree. Iona would want these.' },
                { id: 'orchard_old_tree', kind: 'inspect', x: 9, y: 15, name: 'Old apple tree',
                    text: 'The oldest tree in the orchard. Someone tied a ribbon round it for every year since the old crown fell. There is only one ribbon.' }
            ]
        },

        // -----------------------------------------------------------------
        // Segment D: the climb. The Ritual-Scarred Ghoul the Warden was keeping penned (G4).
        featherwatch: {
            zoneId: 'featherwatch_heights',
            name: 'Featherwatch Path',
            ambient: { darkness: 0.25, tint: 'rgba(40, 40, 70, 0.25)', particles: { kind: 'feathers', count: 10 } },
            tiles: [
                'TTTTTTTTTTTT:TTTTT',
                'TTTTTTTTTTTT:TTTTT',
                'TTTTTTTTTTTT:TTTTT',
                'TTTTTTTTTTTT:,,,TT',
                'TTTTTTTTTTTT:,k,TT',
                'TTTTTTTTTTTT:,,,TT',
                'TTTTTTTTTTTT:TTTTT',
                'TTTTTTTTTTTT:TTTTT',
                'TTTTTTTTTTTT:kTTTT',
                'TTTTT::::::::TTTTT',
                'T,,,,:TTTTTTTTTTTT',
                'T,,,,:TTTTTTTTTTTT',
                'T,k,,:TTTTTTTTTTTT',
                'T,,,,:TTTTTTTTTTTT',
                'TTTTT:TTTTTTTTTTTT',
                'TTTTT:::::TTTTTTTT',
                'TT,,,,,,,:,,,,,,TT',
                'TT,,,,,,,:,,,Y,,TT',
                'TT,,o,,,,:,,,,,,TT',
                'TT,,,,,,,:,,,,,,TT',
                'TTTTTTTTT:TTTTTTTT',
                'TTTTTTTTT:TTTTTTTT'
            ],
            spawns: {
                from_orchard: { x: 9, y: 20, facing: 'up' },
                from_sanctuary: { x: 12, y: 1, facing: 'down' }
            },
            exits: [
                { id: 'featherwatch_south', x: 9, y: 21, trigger: 'step', toMap: 'orchard', toSpawn: 'from_featherwatch' },
                { id: 'featherwatch_north', x: 12, y: 0, trigger: 'step', toMap: 'sanctuary', toSpawn: 'from_featherwatch' }
            ],
            encounters: [
                { id: 'featherwatch_ghoul', gate: true, x: 12, y: 7, name: 'Ritual-Scarred Ghoul', enemies: ['shackled_ghoul_stronger'], trigger: 'contact', sprite: 'ghoul',
                    text: 'A ghoul, scarred with ritual cuts, strains at a snapped chain in the narrow path. It got loose from somewhere above.' }
            ],
            interactables: [
                { id: 'featherwatch_cage', kind: 'inspect', x: 13, y: 8, name: 'Broken cage',
                    text: 'A heavy cage, its door bent outward. The lock was mended many times, by someone patient, before it finally gave.' },
                { id: 'featherwatch_perch', kind: 'inspect', x: 2, y: 12, name: 'Crow perch',
                    text: 'A perch built from a broken cart axle, with a dish of water and a few scraps of meat. The crows here are fat and unafraid.' },
                { id: 'featherwatch_roost', kind: 'inspect', x: 14, y: 4, name: 'Splinted crow',
                    text: 'A crow with a neatly splinted wing hops along a rail and croaks at you. The splint is good work.' }
            ]
        },

        // -----------------------------------------------------------------
        // Segment E: the Warden's roost, his warning, the boss, and the seal.
        sanctuary: {
            zoneId: 'featherwatch_heights',
            name: "The Warden's Sanctuary",
            ambient: { darkness: 0.45, lantern: 5.5, particles: { kind: 'feathers', count: 8 } },
            tiles: [
                '######################',
                '##########ZZ##########',
                '#....................#',
                '#.k................k.#',
                '#....t...........b...#',
                '#....................#',
                '#.k................k.#',
                '#....................#',
                '#....................#',
                '#.k................k.#',
                '#....................#',
                '#...............S....#',
                '#...R................#',
                '#....................#',
                '###########.##########',
                '###########.##########'
            ],
            lights: [{ x: 5, y: 4, radius: 2.5 }, { x: 11, y: 2, radius: 2 }],
            spawns: {
                from_featherwatch: { x: 11, y: 14, facing: 'up' },
                from_seal: { x: 11, y: 2, facing: 'down' }
            },
            exits: [
                { id: 'sanctuary_south', x: 11, y: 15, trigger: 'step', toMap: 'featherwatch', toSpawn: 'from_sanctuary' },
                { id: 'sanctuary_seal', x: 11, y: 1, trigger: 'interact', toMap: 'seal_chamber', toSpawn: 'from_sanctuary', prompt: 'Open the seal',
                    requires: { flags: ['crow_warden_memory_key'] },
                    lockedText: 'A door of black stone with no handle and no keyhole, only a hollow the shape of a feather. It is warm to the touch.',
                    text: 'The key fits the hollow. The stone sighs open, and the crows go quiet.' }
            ],
            encounters: [
                { id: 'sanctuary_warden', x: 11, y: 5, name: 'The Crow-Touched Warden', enemies: ['crow_touched_warden'], trigger: 'contact', sprite: 'warden',
                    when: { flags: ['warden_challenged'] },
                    text: 'The Warden stands between you and the seal. His crows settle on his shoulders and arms. He doesn\'t raise his halberd until you do.' }
            ],
            interactables: [
                { id: 'sanctuary_warden_npc', kind: 'npc', npc: 'warden', x: 13, y: 5, name: 'The Crow-Touched Warden', sprite: 'warden_npc',
                    when: { notFlags: ['warden_challenged'] } },
                { id: 'sanctuary_journal', kind: 'inspect', x: 5, y: 4, name: "Warden's log",
                    text: '"Mended the gray one\'s wing today. It bit me twice. Good. It wants to live." Page after page: feedings, splints, names for every bird. The last entry: "Someone has woken in the old house. The crows saw. Keep the seal."' },
                { id: 'sanctuary_cage_grey', kind: 'inspect', x: 2, y: 3, name: 'Rebuilt cage',
                    text: 'A cage rebuilt from old prison bars, its door tied open with a ribbon. Inside, a nest, and a gray crow with a crooked wing.' },
                { id: 'sanctuary_cage_empty', kind: 'inspect', x: 19, y: 6, name: 'Empty cage',
                    text: 'Clean straw and a full water dish. Waiting for the next one that needs it.' },
                { id: 'sanctuary_bedroll', kind: 'inspect', x: 4, y: 12, name: 'Bedroll',
                    text: 'A thin bedroll by the cages, close enough to hear them in the night.' }
            ]
        },

        // -----------------------------------------------------------------
        seal_chamber: {
            zoneId: 'featherwatch_heights',
            name: 'The Seal Chamber',
            ambient: { darkness: 0.7, lantern: 4, particles: { kind: 'embers', count: 16 } },
            tiles: [
                '###########',
                '#.........#',
                '#.r..Z....#',
                '#.........#',
                '#.........#',
                '#.........#',
                '#.......r.#',
                '#.........#',
                '#####.#####'
            ],
            lights: [{ x: 5, y: 2, radius: 2.2 }],
            spawns: { from_sanctuary: { x: 5, y: 7, facing: 'up' } },
            exits: [
                { id: 'seal_chamber_out', x: 5, y: 8, trigger: 'step', toMap: 'sanctuary', toSpawn: 'from_seal' }
            ],
            interactables: [
                { id: 'seal_first_echo', kind: 'inspect', x: 5, y: 2, name: 'The First Seal',
                    text: 'A ring of black stone set into the floor, a circle left open at the top. When you reach toward it, the room goes away.' }
            ]
        }
    };

    // Changes to the Forgotten Homestead maps (zone1.js keeps the base maps).
    const homestead = {
        // the fog edge becomes a road on
        roadExit: { id: 'road_tollway', x: 12, y: 21, trigger: 'step', toMap: 'tollway', toSpawn: 'from_road',
            text: 'You walk into the fog. It thins, and the road goes on: broken, but passable.' },
        roadSpawn: { from_tollway: { x: 12, y: 20, facing: 'up' } },
        interactables: {
            cellar: [
                { id: 'cellar_inscription', kind: 'inspect', x: 0, y: 4, name: 'Cracked inscription',
                    text: 'Words are cut into the stone, half lost to a crack: "...WHO SLEEPS HERE IS NOT TO BE..." The rest has crumbled. Someone tried hard to scratch it out.' }
            ],
            grounds: [
                { id: 'grounds_foundation', kind: 'inspect', x: 11, y: 12, name: 'Old foundation stone',
                    text: 'A cornerstone far too big for a farmhouse. Old masonry runs under the grass in straight lines, out toward the trees: the footprint of something much larger, long gone.' },
                { id: 'grounds_gate', kind: 'inspect', x: 22, y: 12, name: 'Broken gate',
                    text: 'The gate in the old fence has rotted off its hinges. It could be mended, with the right hands and the right materials.' },
                { id: 'grounds_orin', kind: 'npc', npc: 'orin', x: 18, y: 10, name: 'Orin Vale', sprite: 'mason', when: { flags: ['fragment_one'] } },
                { id: 'grounds_shane', kind: 'npc', npc: 'shane', x: 9, y: 11, name: 'Shane', sprite: 'shane', when: { flags: ['shane_recruited'] } }
            ]
        }
    };

    const chapter1Maps = { tiles, zones, maps, homestead };
    (ENSO.world || (ENSO.world = {})).chapter1Maps = chapter1Maps;
    if (isNode) module.exports = chapter1Maps;
})(typeof window !== 'undefined' ? window : globalThis);
