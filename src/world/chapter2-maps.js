/* =========================================================================
 * Enso's Last Stand — WORLD DATA: Chapter Two, Act I, "The Stranger from the South"
 * Lore: docs/design/CHAPTER_TWO_LORE.md (Hrimvald, the North; C2-01 The Frostspine Road, C2-02 Salt and Silver).
 * Tokelo, 2026-11-11: "get the team into reading chapter 2 lore md and start building the world for chapter 2".
 * Guide: docs/CHAPTER_TWO.md. Story: src/story/chapter2.js.
 *
 * Pure data, merged into the world by src/world/zone1.js (same format as chapter1-maps.js). What it adds:
 *   frostspine_pass   The way in. The Overgrown Road's east track ("follow the crows east", Q08) climbs out of the
 *                     Vale's firs into rock and snow. A funeral caravan lies overturned on the road; Wolf-Banner
 *                     raiders are going through it for a wooden name tablet. Eydis Namesinger hides by the fire.
 *                     The raiders' leader holds the one gap through the crags (a gate fight, as in Chapter One).
 *   skeldvik          Skeldvik Harbor, the first town of Hrimvald: a sheltered fjord, three jetties and two
 *                     clinker-built ships, fish racks and market stalls on the wharf, Leif's shipyard, turf-roofed
 *                     houses, the old Crown's customs stone, a memorial stone someone has been at with a chisel.
 *                     The harbour bell is a Black Flight anchor.
 *   hrafnholm         C2-03, the seat of the Jarl, after Tokelo's reference map (2026-11-13): the Great Hall, the Thing,
 *                     the noble houses, Guild Lane, the Training Yard, the War Memorial; up the south-west road from
 *                     Skeldvik. The north-east track to the Silent Field is a boundary until Tokelo sends its picture.
 *   hall_of_winter    Inside the Great Hall, after Tokelo's interior picture (2026-11-13): the empty high seat.
 * Every map is painted whole by ui/scene-hrimvald.js (no tile art; tests/63 requires a scene on every map).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const zones = {
        hrimvald_frostspine: { name: 'Frostspine Pass', mapIds: ['frostspine_pass'] },
        hrimvald_skeldvik: { name: 'Skeldvik', mapIds: ['skeldvik'] },
        hrimvald_hrafnholm: { name: 'Hrafnholm', mapIds: ['hrafnholm', 'hall_of_winter'] }
    };

    const maps = {
        // -----------------------------------------------------------------
        // C2-01 The Frostspine Road. West half: the last of the Vale's wood and the wrecked caravan. East half,
        // past the one gap in the crags: the high pass with its watch post, cairn and fallen mile marker.
        frostspine_pass: {
            zoneId: 'hrimvald_frostspine',
            name: 'Frostspine Pass',
            scene: 'frostspine_pass',          // painted whole: ui/scene-hrimvald.js
            ambient: { tint: 'rgba(150, 180, 220, 0.08)', particles: { kind: 'snow', count: 26 },
                grade: { ambient: 0.9, exposure: 1.02, highlights: [-0.02, 0.02, 0.07] } },
            legend: {
                ',': { name: 'ground' }, ':': { name: 'road' }, 'T': { name: 'fir', solid: true }, '^': { name: 'crag', solid: true },
                'o': { name: 'rock', solid: true }, 'H': { name: 'watch_post', solid: true }, 'M': { name: 'mile_marker', solid: true },
                'W': { name: 'caravan', solid: true }, 'q': { name: 'bier', solid: true }, 'F': { name: 'campfire', solid: true },
                'x': { name: 'crate', solid: true }, 'B': { name: 'wolf_banner', solid: true }, 'S': { name: 'cairn', solid: true },
                'l': { name: 'log', solid: true }
            },
            tiles: [
                'TTTTTTTTTTTTTTTT^^^^^^^^^^:^^^^^',
                'TTTTTTTT,,,TTTTT^^^^^,,,,,:,,^^^',
                'TTTTT,,,,,,,,TTT^^^^,,,,,::,,,^^',
                'TTT,,,,o,,,,,,TT^^^,,HHH,:,,,,^^',
                'TT,,,,,,,,,,,,,T^^^,,HHH,:,,o,^^',
                'TT,,,T,,,,,,,,,,^^^,,,,,::,,,,^^',
                'T,,,,,,,,,l,,,,,^^^,,,,::,,,,^^^',
                'T,,,o,,,,F,,x,,,^^^^,,,:,,S,,^^^',
                'TT,,,,,,,,,,,,,,,^^^,,::,,,,,^^^',
                'TT,,,,,,,,,,,qq,,^^^,,:,,,,^^^^^',
                'T,,,,,,,,,WWW,,B,^^^,::,M,,^^^^^',
                ':::::::::::::::::::::,,,,,,^^^^^',
                'T,,,,,,,,x,,q,,,,^^^,,,,,o,^^^^^',
                'TT,,,,,,,,,,,,,,,^^^^,,,,,,^^^^^',
                'TT,,T,,,,,,,o,,,,^^^^^,,,^^^^^^^',
                'TTT,,,,,,,,,,,,,^^^^^^^^^^^^^^^^',
                'TTTT,,,,,,,T,,,TT^^^^^^^^^^^^^^^',
                'TTTTTT,,,,TTTTTTTTT^^^^^^^^^^^^^',
                'TTTTTTTTTTTTTTTTTTTTT^^^^^^^^^^^'
            ],
            lights: [{ x: 9, y: 7, radius: 2.4, color: 'rgba(255, 150, 60, 0.3)' }],
            spawns: {
                from_road: { x: 1, y: 11, facing: 'right' },
                from_skeldvik: { x: 26, y: 1, facing: 'down' }
            },
            exits: [
                { id: 'frostspine_west', x: 0, y: 11, trigger: 'step', toMap: 'road', toSpawn: 'from_frostspine' },
                { id: 'frostspine_north', x: 26, y: 0, trigger: 'step', toMap: 'skeldvik', toSpawn: 'from_pass',
                    text: 'Over the top of the pass the wind changes. It smells of salt and woodsmoke. Far below, a fjord lies flat and grey between its cliffs, and there are ships on it.' }
            ],
            encounters: [
                // The inciting fight: three raiders going through the wreck. They sit on the tablet (guardedBy below).
                { id: 'frostspine_caravan_raiders', x: 15, y: 8, name: 'Wolf-Banner Raiders', detect: 150,
                    enemies: ['wolfbanner_raider', 'wolfbanner_raider', 'wolfbanner_skirmisher'], trigger: 'contact', sprite: 'constables',
                    text: 'Three men in madder-red wool are tipping the biers out onto the road and going through what falls. One of them holds a spear the way a man holds something he throws. They are not robbing the dead. They are looking for something.' },
                // The gate: Ulfrun holds the only gap in the crags (one tile wide), so the pass can't be walked.
                { id: 'frostspine_ulfrun', gate: true, x: 18, y: 11, name: 'Ulfrun Grey-Mantle',
                    enemies: ['wolfbanner_ringleader', 'wolfbanner_skirmisher'], trigger: 'contact', sprite: 'constables',
                    text: 'A broad woman with a wolf pelt over her mail stands in the gap where the road goes through the rock, a two-hand axe resting on her shoulder. "The pass is closed, southerner. Go home and tell them the North is counting its dead again."' }
            ],
            interactables: [
                { id: 'frostspine_eydis', kind: 'npc', npc: 'eydis', x: 8, y: 7, name: 'Eydis Namesinger', sprite: 'skald', when: { notFlags: ['eydis_in_skeldvik'] } },
                { id: 'frostspine_hakon', kind: 'npc', npc: 'hakon', x: 10, y: 7, name: 'Hakon', sprite: 'carter' },
                { id: 'frostspine_tablet', kind: 'inspect', x: 13, y: 9, name: 'Spilled bier',
                    guardedBy: 'frostspine_caravan_raiders',
                    guardedText: 'The raiders are standing over the bier. Whatever they want is under their hands.',
                    text: 'A bier of ash wood, tipped on its side. An old woman lies wrapped in undyed wool, her hands folded over a flat piece of oak the raiders did not find in time. It is carved on both faces with names, row on row, small and careful.' },
                { id: 'frostspine_caravan', kind: 'inspect', x: 11, y: 10, name: 'Overturned wagon',
                    text: 'A wagon on its side, one wheel still turning in the wind. It carried no cargo worth an axe: a loom frame, a cheese, a bundle of birch twigs tied with red thread for the grave.' },
                { id: 'frostspine_bier', kind: 'inspect', x: 12, y: 12, name: 'Grave goods',
                    text: 'A second bier, empty. Beside it the things that go in the ground with a weaver: her shuttle, a comb of antler, a cup. Someone has set them upright again, out of habit.' },
                { id: 'frostspine_banner', kind: 'inspect', x: 15, y: 10, name: 'Wolf banner',
                    text: 'A spear driven into the road with a strip of red cloth tied under the head. A running wolf is stitched on it in grey thread, well made. Whoever sewed it was proud of the work.' },
                { id: 'frostspine_fire', kind: 'inspect', x: 9, y: 7, name: 'Campfire',
                    text: 'A small fire, built low so the smoke does not show over the trees. Three people could sit round it. Two are.' },
                { id: 'frostspine_watch_post', kind: 'inspect', x: 22, y: 4, name: 'Watch post',
                    text: 'A watch post of logs on a stone footing, older than the war. The roof has gone but the beacon basket still has pitch in it. Nobody has lit it in years. Nobody has taken it down either.' },
                { id: 'frostspine_mile_marker', kind: 'inspect', x: 24, y: 10, name: 'Fallen mile marker',
                    text: 'A squared stone taller than you, lying where it was pushed over. The old Crown set one of these at every mile of every road it took. The number is still sharp. Somebody has cut a row of small notches along the edge, one for each winter since.' },
                { id: 'frostspine_cairn', kind: 'inspect', x: 26, y: 7, name: 'Travellers\' cairn',
                    text: 'A cairn at the top of the pass. Everyone who crosses adds a stone. You find you have picked one up without deciding to.' },
                { id: 'frostspine_herbs', kind: 'forage', forage: 'wild_herbs', x: 6, y: 14, name: 'Wild herbs', sprite: 'herbs',
                    text: 'Yarrow in the lee of the firs, the last green thing before the rock.' }
            ]
        },

        // -----------------------------------------------------------------
        // C2-02 Salt and Silver. Laid out after Tokelo's reference map (2026-11-11, "Skeldvik Harbor"): the
        // Upland Trail comes down a stair through the palisade in the north-west, past the memorial stones, to
        // the Stormtide Inn; the harbour bell stands on a stone terrace in the north-east; the market wharf, the
        // fish racks and the docks step down to the fjord in the east and south; the shipwright's yard fills the
        // south-west, and the road to the village and the hinterlands leaves by the south-west corner.
        // Rebuilt at full scale (Tokelo, playtest 2026-11-11: "the players are like giants... the houses are tiny"):
        // 52x40, with houses, the inn and the shipwright's hall at Baker's Lane proportions (doors taller than you).
        skeldvik: {
            zoneId: 'hrimvald_skeldvik',
            name: 'Skeldvik Harbor',
            scene: 'skeldvik',                 // painted whole: ui/scene-hrimvald.js
            relaid: 2,                         // re-laid at full scale in content revision 2: an older save here starts at the stair
            ambient: { tint: 'rgba(60, 80, 120, 0.08)', particles: { kind: 'snow', count: 14 },
                grade: { ambient: 0.92, exposure: 1.04, highlights: [0.04, 0.03, 0.0] } },
            legend: {
                ',': { name: 'snow' }, ':': { name: 'cobble' }, ';': { name: 'yard' }, '=': { name: 'wharf' }, 'S': { name: 'steps' }, 'B': { name: 'terrace' },
                '~': { name: 'water', solid: true }, '^': { name: 'cliff', solid: true }, 'T': { name: 'fir', solid: true }, 'o': { name: 'skerry', solid: true },
                'V': { name: 'waterfall', solid: true }, 'P': { name: 'palisade', solid: true }, 'W': { name: 'terrace_wall', solid: true },
                'I': { name: 'inn', solid: true }, 'h': { name: 'house', solid: true }, 'Y': { name: 'shipyard_hall', solid: true }, 'H': { name: 'shipyard', solid: true },
                'G': { name: 'harbour_bell', solid: true }, 'M': { name: 'memorial_stone', solid: true }, 's': { name: 'ring_stone', solid: true },
                'i': { name: 'brazier', solid: true }, 'F': { name: 'banner', solid: true }, 'K': { name: 'customs_stone', solid: true },
                'm': { name: 'stall', solid: true }, 'r': { name: 'fish_rack', solid: true }, 'n': { name: 'nets', solid: true }, 'c': { name: 'crane', solid: true },
                'b': { name: 'barrel', solid: true }, 'x': { name: 'crate', solid: true }, 'l': { name: 'log_pile', solid: true }, 't': { name: 'workbench', solid: true },
                'f': { name: 'fence', solid: true }, 'L': { name: 'longship', solid: true }, 'k': { name: 'rowboat', solid: true }
            },
            tiles: [
                '^^T^^T^^^SS^^^^^^^^^^T^^^^T^^^T^^^^^^^^^^^^^^^^^V^^^',
                '^T^T^^^^^SS^^^^^^^^^^^^^TT^^^T^^^T^^^^^^^^^^^^^^V^^^',
                '^^^PPPPPPSSPPPPP^^TT^TT^TT^TT^TT^^^^^^^^^^^^^^^^VT^^',
                ',,,PPPPPPSSPPPPPPIIIIIIIIIIIIIIII:^BBBBBBBBB^T^^V^^^',
                ',,,,,,,,,SS,,,,,,IIIIIIIIIIIIIIII:^BiBBGBBiB^^^^V^^^',
                ',hhhhhhh:::::::::IIIIIIIIIIIIIIII:^BBBBBBBBB^^T^V^^^',
                ',hhhhhhh::::::::FIIIIIIIIIIIIIIII:^BBBBBBBBB^^^^V^^^',
                ',hhhhhhh:::::::::IIIIIIIIIIIIIIII:SBBBBBBBBBT^^^V^^^',
                ',hhhhhhh::i:M:i::IIIIIIIIIIIIIIII:SBBBBBBBBB^^^^V^^^',
                ',hhhhhhh:::::::::IIIIIIIIIIIIIIII:^WWWWWWWWW^^^^V^^^',
                ',hhhhhhh::::::::b:b:::::::::::::::x:::::::::^^^^^^^^',
                ',,,::::::s:::::s::::::::::::::::::::::::::::~~~~~~~~',
                ',,,:::::::::::::::::::::F:::::::::i:hhhhhh::~~~~~~~~',
                ',hhhhhhh::::::hhhhhhhh:::mmm::mmm:::hhhhhh:c~LLLLLL~',
                ',hhhhhhh::::::hhhhhhhh:::mmm::mmm:::hhhhhh::~LLLLLL~',
                ',hhhhhhh:::::Fhhhhhhhh::::::::::::::hhhhhh::======~~',
                ',hhhhhhh::::::hhhhhhhh:::::::::::::xhhhhhh::======~~',
                ',hhhhhhh::::::hhhhhhhhx::mmm::mmm:::::::::::~~~~~~~~',
                ',hhhhhhh::::::hhhhhhhhb::mmm::mmm:::::::::::~~~~~~~~',
                ',,,:::::::::::::::::::::::::::::::::::::::::~~~~~~~~',
                ',,,,,,,,,,,,,,F::::::::::::::::::F:rrr:rrr::~~~~~~o~',
                ',,,,,,,,,,,,,,ffffffffSSffffffffff:rrr:rrr::~~~~~~~~',
                ',,YYYYYYYYYY::::::::::::::::b::x::::::::::::======~~',
                ',,YYYYYYYYYY::::b:::::::::::::::::::::::::::======~~',
                ',,YYYYYYYYYY::::==========================x=======k~',
                ',,YYYYYYYYYY::::===========================F======~~',
                ',,YYYYYYYYYY::=====nn~~~~~~~~~~~~===nn~~~===nn~~~~~~',
                ',,YYYYYYYYYY::=====~~~~~~~~~~~~~~===~~~~~===~~~~~~~~',
                ';;;;;;;;;;;;;;=====LLLLLLLLLL~~~~===~~~~~===~~k~~~~~',
                ';l;;;;;;;;;;;;=====LLLLLLLLLL~~~~===~~~~~===~~~~~~~~',
                ';;;;HHHHHH;;;;=====LLLLLLLLLL~~~~===~k~~~===~~~~~~~~',
                ';b;;HHHHHH;;;;=====~~~~~~~~~~~~~~===~~~~~~~~~~~~~~~~',
                ';;;;HHHHHH;;;;=====~~~~~~~~~~~~~~===~~~~~~~~~~~~~~~~',
                ';;t;;;;;;;;;;;=====~~~~~~~~~~~~~~===~~~k~~~~~~~~o~~~',
                ';;;;;;;;;;;;;;~~===~~~~~~~~~~~~~~===~~~~~~~~~~~~~~~~',
                'fffff:::::ffff~~===~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
                '::::::::::K,,,~~===~~~~~~~~~~~o~~~~~~~~~~~~~~~~~~~~~',
                '::::::::::,T,T~~===~~~~~~~~~~~~~~~~~~~~~o~~~~~~~~~~~',
                ':::::^^^^^^^^^~~~~~~~~~~~o~~~~~~~~~~~~~~~~~~~~~~~~~~',
                '^^T^^^T^^^^^^^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
            ],
            lights: [
                { x: 24, y: 10, radius: 2.6, color: 'rgba(255, 170, 80, 0.22)' }, { x: 12, y: 9, radius: 2.2, color: 'rgba(255, 160, 70, 0.2)' },
                { x: 39, y: 5, radius: 2.2, color: 'rgba(255, 170, 80, 0.18)' }, { x: 28, y: 15, radius: 3, color: 'rgba(255, 180, 90, 0.2)' },
                { x: 6, y: 28, radius: 2.6, color: 'rgba(255, 150, 60, 0.22)' }, { x: 38, y: 17, radius: 1.8, color: 'rgba(255, 170, 80, 0.18)' },
                { x: 4, y: 11, radius: 1.8, color: 'rgba(255, 170, 80, 0.18)' }, { x: 17, y: 19, radius: 1.8, color: 'rgba(255, 170, 80, 0.18)' }
            ],
            spawns: {
                from_pass: { x: 9, y: 1, facing: 'down' },
                flight_bell: { x: 39, y: 5, facing: 'up' },
                from_hrafnholm: { x: 1, y: 36, facing: 'right' },
                from_hrafnholm_2: { x: 1, y: 37, facing: 'right' }
            },
            exits: [
                { id: 'skeldvik_north', x: 9, y: 0, trigger: 'step', toMap: 'frostspine_pass', toSpawn: 'from_skeldvik' },
                // The road to the village and the hinterlands, and on up to Hrafnholm (C2-03; it was a boundary until Hrafnholm was built).
                { id: 'skeldvik_west_road', x: 0, y: 36, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_skeldvik',
                    text: 'The road leaves the harbour by the south-west, through a village of turf roofs and on up into the hinterlands. By evening there is a palisade on the ridge ahead, smoke over it, and a great roof above the smoke.' },
                { id: 'skeldvik_west_road_2', x: 0, y: 37, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_skeldvik_2',
                    text: 'The road leaves the harbour by the south-west, through a village of turf roofs and on up into the hinterlands. By evening there is a palisade on the ridge ahead, smoke over it, and a great roof above the smoke.' }
            ],
            encounters: [],
            interactables: [
                { id: 'skeldvik_eydis', kind: 'npc', npc: 'eydis', x: 11, y: 10, name: 'Eydis Namesinger', sprite: 'skald', when: { flags: ['eydis_in_skeldvik'] } },
                { id: 'skeldvik_leif', kind: 'npc', npc: 'leif', x: 8, y: 28, name: 'Leif Ropehand', sprite: 'shipwright' },
                { id: 'skeldvik_solveig', kind: 'npc', npc: 'solveig', x: 28, y: 15, name: 'Solveig', sprite: 'fishwife' },
                { id: 'skeldvik_thora', kind: 'npc', npc: 'thora', x: 37, y: 6, name: 'Thora Half-Oar', sprite: 'reeve' },
                { id: 'skeldvik_geir', kind: 'npc', npc: 'geir', x: 24, y: 23, name: 'Geir', sprite: 'wolfcrew' },
                // James the bard (CB1), playing outside the Stormtide Inn until you offer him a place at your homestead.
                { id: 'skeldvik_james', kind: 'npc', npc: 'james', x: 27, y: 10, name: 'James', sprite: 'bard', when: { notFlags: ['james_recruited'] } },
                { id: 'skeldvik_bell', kind: 'inspect', x: 39, y: 4, name: 'Harbour bell',
                    text: 'A bronze bell under its own small roof, green with salt, on a terrace of fitted stone above the wharf. It is rung for fog and for ships that are late. The rope is worn smooth at the height of a hand. You put yours where all the others have been.' },
                { id: 'skeldvik_memorial', kind: 'inspect', x: 12, y: 8, name: 'Memorial stone',
                    text: 'A standing stone twice your height, cut with knotwork older than the war, in a ring of smaller stones. A wooden board is pegged to its face: the names of Skeldvik\'s dead from the Silent Field, cut in rows. Half the board has been split away along the grain, lately, with something sharp. The pale wood underneath has not had time to grey.' },
                { id: 'skeldvik_customs_stone', kind: 'inspect', x: 10, y: 36, name: 'Customs stone',
                    text: 'A squat grey stone with a slot cut in the top for coin, and the old Crown\'s mark on the side. Skeldvik paid harbour dues here for six years. Nobody has moved it. Children sit on it. A gull has been using it for something else.' },
                { id: 'skeldvik_alehouse', kind: 'inspect', x: 24, y: 9, name: 'The Stormtide Inn',
                    text: 'The Stormtide Inn: a great hall with a steep roof, carved beasts on the gable ends, and smoke coming out of both chimneys. Through the door: a hearth down the middle, benches along the walls, and a table where two men are playing a board game with a king in the centre and losing patience with each other.' },
                { id: 'skeldvik_shipyard', kind: 'inspect', x: 6, y: 30, name: 'Ship on the stocks',
                    text: 'A hull on the stocks, half planked. Each strake overlaps the one below and is riveted through. You can count the rivets if you have a day. The keel is one piece of oak, and someone has cut a small mark near the stem that is not a shipwright\'s mark.' },
                { id: 'skeldvik_fish_racks', kind: 'inspect', x: 36, y: 20, name: 'Fish racks',
                    text: 'Cod split and hung in pairs by the tail, drying in the wind. They will keep until spring and travel as far as anyone will pay for them.' },
                { id: 'skeldvik_stall', kind: 'inspect', x: 26, y: 13, name: 'Market stall',
                    text: 'Amber beads, whetstones, a walrus-hide rope coiled like a sleeping thing, and combs. A lot of combs.' },
                { id: 'skeldvik_longship', kind: 'inspect', x: 46, y: 14, name: 'Moored ship',
                    text: 'A trading ship, broad in the beam, her sail furled along the yard. The men at the harbour mouth are not traders. Their ship is narrower, there are too many shields along her side, and nobody is unloading anything.' },
                { id: 'skeldvik_armed_ship', kind: 'inspect', x: 19, y: 29, name: 'Armed ship',
                    text: 'A narrow ship with shields hung along the rail and her red sail set, though she is going nowhere. Her crew sit on the wharf sharpening things that are already sharp. One of them watched you read the names on the memorial stone.' },
                { id: 'skeldvik_nets', kind: 'inspect', x: 19, y: 26, name: 'Nets',
                    text: 'Nets hung from the wharf to dry and to mend. A bone needle is still threaded in one, left mid-knot.' },
                { id: 'skeldvik_crane', kind: 'inspect', x: 43, y: 13, name: 'Wharf crane',
                    text: 'A crane of two timbers and a rope, with a net of cod swinging from it. It lifts a catch from a boat to the wharf and has lifted heavier things when asked.' },
                { id: 'skeldvik_waterfall', kind: 'inspect', x: 44, y: 11, name: 'The fjord',
                    text: 'Across the water a fall comes off the cliff in one white thread and is lost in mist before it lands. The fjord is so still under it that the gulls look as if they are flying over a second sky.' }
            ]
        },

        // -----------------------------------------------------------------
        // C2-03 The Hall of Winter. Laid out after Tokelo's reference map (2026-11-13, "Hrafnholm, Hrimvald Region"):
        // the Great Hall on its stone terrace across the top, the Thing (the assembly ring, its tiered benches and the
        // law rock) in the middle of the town, the noble houses on both sides, Guild Lane and the forge in the west,
        // the Training Yard behind its fence in the south-west, the War Memorial in the east, the palisade and the
        // south arch where the road comes up from Skeldvik, and the north-east track toward the Silent Field.
        // Built at Skeldvik's full scale (52x40, houses at z 2).
        hrafnholm: {
            zoneId: 'hrimvald_hrafnholm',
            name: 'Hrafnholm',
            scene: 'hrafnholm',                // painted whole: ui/scene-hrimvald.js
            ambient: { tint: 'rgba(60, 76, 116, 0.08)', particles: { kind: 'snow', count: 16 },
                grade: { ambient: 0.92, exposure: 1.04, highlights: [0.04, 0.03, 0.0] } },
            legend: {
                ',': { name: 'snow' }, ':': { name: 'cobble' }, ';': { name: 'yard' }, 'B': { name: 'paving' }, 'S': { name: 'steps' },
                '^': { name: 'cliff', solid: true }, 'T': { name: 'fir', solid: true }, 'o': { name: 'boulder', solid: true },
                'P': { name: 'palisade', solid: true }, 'U': { name: 'arch_post', solid: true }, 'j': { name: 'fence', solid: true },
                'G': { name: 'great_hall', solid: true }, 'w': { name: 'terrace_wall', solid: true }, 'h': { name: 'house', solid: true },
                'g': { name: 'guildhall', solid: true }, 'F': { name: 'forge', solid: true }, 'm': { name: 'stall', solid: true }, 'k': { name: 'shed', solid: true },
                'W': { name: 'ring_wall', solid: true }, 'n': { name: 'tier_bench', solid: true }, 'R': { name: 'law_rock', solid: true },
                'i': { name: 'brazier', solid: true }, 'f': { name: 'banner', solid: true }, 'e': { name: 'bench', solid: true }, 't': { name: 'feast_table', solid: true },
                'M': { name: 'war_memorial', solid: true }, 'q': { name: 'target', solid: true }, 'd': { name: 'dummy', solid: true }, 'r': { name: 'weapon_rack', solid: true },
                'A': { name: 'anvil', solid: true }, 'x': { name: 'crate', solid: true }, 'b': { name: 'barrel', solid: true }, 'l': { name: 'log_pile', solid: true }
            },
            tiles: [
                '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^::^^^^^^^',
                '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^::^^^^^^^',
                '^hhhhhT,,,,,^^,GGGGGGGGGGGGGGGGGGGGGGT,,,,,::TTTTTT^',
                '^hhhhh,hhhhhT:,GGGGGGGGGGGGGGGGGGGGGGThhhhh::TTTTTT^',
                '^hhhhh,hhhhh::,GGGGGGGGGGGGGGGGGGGGGGThhhhh::,hhhhh^',
                '^hhhhh,hhhhhSS,GGGGGGGGGGGGGGGGGGGGGGThhhhh::,hhhhh^',
                '^hhhhh,hhhhhSS,GGGGGGGGGGGGGGGGGGGGGGThhhhh::,hhhhh^',
                '^:::::fhhhhh::,GGGGGGGGGGGGGGGGGGGGGGThhhhh::,hhhhh^',
                '^:::::::::::::,GGGGGGGGGGGGGGGGGGGGGGT::::::::hhhhh^',
                '^:::::::::::::,GGGGGGGGGGGGGGGGGGGGGGT::::::::,T,,,^',
                '^:::::::::::::,BBBBBBBiBBBBBBiBBBBBBB,::::::::T,,T,^',
                '^::::::gggg:::,BBBBBBBBBBBBBBBBBBBBBB:::hhhh::hhhhh^',
                '^FFFFF:gggg:::,wwwwwwwwwSSSSwwwwwwwww:::hhhh::hhhhh^',
                '^FFFFFbggggmmm:::::::::::::::::::mmm::::::::::hhhhh^',
                '^FFFFF:ggggmmm:::::eee::::::::eeemmm::::::::::hhhhh^',
                '^FFFFF::::::::::::::::::SSSS:::::::::::::::::^^^^^^^',
                '^FFFFF:::::b:::::::::WWWSSSSWWW::tttt:::::::T^^^^^^^',
                '^l::::Axx::::::,,,,WWWBBBBBBBBWWW,,,,::::::::^^^^^^^',
                '^::::::::::::::,,WWWBBBBBBBBBBBBWWW,,:::MMMMMMMM,^^^',
                '^::::::::::::::,WWnnnnBBiBBiBBnnnnWW,::iMMMMMMMMi^^^',
                '^::::::::::::::,WBnnnnBBBRRBBBnnnnBW,::::::::::::^^^',
                '^::::::::::::::WWBnnnnBBBRRBBBnnnnBWW::::::::::::^^^',
                '^::::::::::::::WWBnnnnBiBBBBiBnnnnBWW::::::::,,,,^^^',
                '^jjjjj;;;jjjj::WWBBBBBBBBBBBBBBBBBBWW::::::::,,,,,,^',
                '^jkkkk;;;;;;j::,WBBBBBBBBBBBBBBBBBBW,:::^T^^^^^^^^^^',
                '^jkkkk;q;q;qj::,WWBfBBBBBBBBBBBBfBWW,:::^^^^^^^T^^^^',
                '^j;;;;;;;;;;j::,,WWWBBBBBBBBBBBBWWW,,:::^^^^^^^^^^^^',
                '^j;;;;;;;;;;j::,,,,WWWBiBBBBiBWWW,,,,:::^^^^T^^^^^^^',
                '^jr;;;;;;d;;j::,,,,,,WWWSSSSWWW,,,,,,:::^^^^^^^^^^^^',
                '^j;;;d;;;;;;;:::::::::::::::::::::::::::^^^^^^^^^T^^',
                '^jr;;;;d;;;;;:::::::::::::::::::::::::::^^T^^^^^^^^^',
                '^j;;;;;;;;;;;:::::::::::::::::::::::::::^^^^^^^^^^^^',
                '^j;;;;;;;ee;j:::::::::::::::::::::::::::^^^^^T^^^^^^',
                '^jjjjjjjjjjjj::::i::::f::::::f::::i:::o:^^^^^^^^^^^^',
                '^PPPPPPPPPPPPPPPPPPPPPPU::::UPPPPPPPPPPPPPPPPPPPPPP^',
                '^^^T^T^^T^T^^T^T^^T^T,,T::::T,T,^T^T^^T^T^^T^T^^T^T^',
                '^T^^T^T^^T^T^^T^T^^T,T,,::::,T,T^^T^T^^T^T^^T^T^^T^^',
                '^^T^^T^T^^T^T^^T^T^^T,T,::::,,T,T^^T^T^^T^T^^T^T^^T^',
                '^T^T^^T^T^^T^T^^T^T^,T,T::::T,,T^T^^T^T^^T^T^^T^T^^^',
                '^^T^T^^T^T^^T^T^^T^T,,T,::::,T,,T^T^^T^T^^T^T^^T^T^^',
            ],
            lights: [
                { x: 22, y: 10, radius: 2.4, color: 'rgba(255, 170, 80, 0.22)' }, { x: 29, y: 10, radius: 2.4, color: 'rgba(255, 170, 80, 0.22)' },
                { x: 25, y: 21, radius: 3.2, color: 'rgba(255, 170, 80, 0.22)' }, { x: 3, y: 17, radius: 2.8, color: 'rgba(255, 140, 50, 0.26)' },
                { x: 43, y: 20, radius: 2.4, color: 'rgba(255, 170, 80, 0.18)' }, { x: 25, y: 33, radius: 2.4, color: 'rgba(255, 170, 80, 0.2)' },
                { x: 35, y: 15, radius: 2.4, color: 'rgba(255, 180, 90, 0.2)' }
            ],
            spawns: {
                from_skeldvik: { x: 25, y: 38, facing: 'up' },
                from_skeldvik_2: { x: 26, y: 38, facing: 'up' },
                from_hall: { x: 25, y: 10, facing: 'down' },
                from_hall_2: { x: 26, y: 10, facing: 'down' }
            },
            exits: [
                { id: 'hrafnholm_south_road', x: 25, y: 39, trigger: 'step', toMap: 'skeldvik', toSpawn: 'from_hrafnholm' },
                { id: 'hrafnholm_south_road_2', x: 26, y: 39, trigger: 'step', toMap: 'skeldvik', toSpawn: 'from_hrafnholm_2' },
                { id: 'hrafnholm_hall_entry', x: 25, y: 9, trigger: 'interact', prompt: 'Go into the Hall of Winter', toMap: 'hall_of_winter', toSpawn: 'from_hrafnholm',
                    text: 'Inside, the heat and the smoke meet you together. A long hall under a high roof, a fire in the middle of it, tables down both sides, and at the far end a carved seat that nobody is sitting in.' },
                { id: 'hrafnholm_hall_entry_2', x: 26, y: 9, trigger: 'interact', prompt: 'Go into the Hall of Winter', toMap: 'hall_of_winter', toSpawn: 'from_hrafnholm_2',
                    text: 'Inside, the heat and the smoke meet you together. A long hall under a high roof, a fire in the middle of it, tables down both sides, and at the far end a carved seat that nobody is sitting in.' }
            ],
            encounters: [],
            interactables: [
                { id: 'hrafnholm_arnkel', kind: 'npc', npc: 'arnkel', x: 24, y: 22, name: 'Arnkel the Lawspeaker', sprite: 'lawspeaker' },
                { id: 'hrafnholm_torvald', kind: 'npc', npc: 'torvald', x: 6, y: 27, name: 'Torvald Redhand', sprite: 'warchief' },
                { id: 'hrafnholm_sigrun', kind: 'npc', npc: 'sigrun', x: 41, y: 21, name: 'Sigrun Frostmark', sprite: 'heir' },
                { id: 'hrafnholm_runa', kind: 'npc', npc: 'runa', x: 46, y: 21, name: 'Runa Hallvardsdottir', sprite: 'shieldmaiden' },
                { id: 'hrafnholm_osric', kind: 'npc', npc: 'osric', x: 12, y: 15, name: 'Osric Vane', sprite: 'factor' },
                { id: 'hrafnholm_law_rock', kind: 'inspect', x: 25, y: 21, name: 'The law rock',
                    text: 'A slab of grey stone set on end on a stepped dais, with four fire bowls round it. The Lawspeaker stands here to say the law aloud, all of it, from memory, one third each summer. The stone is worn smooth at the height of a hand.' },
                { id: 'hrafnholm_thing', kind: 'inspect', x: 21, y: 18, name: 'The Thing',
                    text: 'The assembly ring: a bowl of fitted stone, benches stepped up its sides, the hall\'s banners on the west and the free farmers\' on the east. Every free household has a place here. Twenty winters ago six hundred of the places were left empty, and they still are.' },
                { id: 'hrafnholm_memorial', kind: 'inspect', x: 43, y: 19, name: 'The War Memorial',
                    text: 'Three long boards under a turf roof, cut with names in rows: the six hundred, copied from every steading\'s board the year they did not come home. Someone has put fresh pine on the ledge below. There are gaps in the rows where a name has been cut and then shaved away again.' },
                { id: 'hrafnholm_forge', kind: 'inspect', x: 3, y: 16, name: 'The forge',
                    text: 'An open forge under a smoke hood, the fire banked red. Spearheads cooling in a row, a boy at the bellows who stops to look at you. The smith works bog iron from the south and complains about it at length.' },
                { id: 'hrafnholm_anvil', kind: 'inspect', x: 6, y: 17, name: 'Anvil',
                    text: 'An anvil on an oak stump. Somebody has scratched a small running wolf on the side, and somebody else has scratched it out.' },
                { id: 'hrafnholm_stall', kind: 'inspect', x: 13, y: 14, name: 'Wool stall',
                    text: 'Bolts of wool in madder red and woad blue, undyed grey for the poor and for mourning. The weaver is selling a great deal of the grey this winter.' },
                { id: 'hrafnholm_guildhall', kind: 'inspect', x: 8, y: 14, name: 'Guild Lane',
                    text: 'Guild Lane: the smith, the weavers, a comb-maker and a man who mends shields. Their houses share walls, and their arguments.' },
                { id: 'hrafnholm_targets', kind: 'inspect', x: 9, y: 25, name: 'Training Yard',
                    text: 'Straw butts painted with rings, a row of spears on the rack, dummies with their sacking torn to the frame. Most of the arrows in the butts are red-fletched. Torvald\'s crews practise here, and the hall\'s men have stopped coming.' },
                { id: 'hrafnholm_feast', kind: 'inspect', x: 34, y: 16, name: 'Feast tables',
                    text: 'Trestle tables set out in the snow under an awning, for the households who have come in for the Thing. Ale in horn cups, flatbread, smoked mutton. Nobody has poured the grave-ale. The cup for it stands on the end of the table, empty.' },
                { id: 'hrafnholm_noble_houses', kind: 'inspect', x: 9, y: 7, name: 'Noble houses',
                    text: 'The great households keep houses up here for the Thing, timber halls with their banners at the gable: a fork of blue, two crossed axes on gold, a green pine. Every one of them lost someone on the Silent Field.' },
                { id: 'hrafnholm_arch', kind: 'inspect', x: 23, y: 34, name: 'The south arch',
                    text: 'Two posts of whole pine and a beam across, carved with ravens. The road from Skeldvik comes up under it. Everyone who passes touches the left post, so it is darker and smoother than the right.' }
            ],
            boundaries: [
                { id: 'hrafnholm_silent_field_track', x: 43, y: 0, w: 2, h: 1, title: 'The track to the Silent Field',
                    text: 'The track climbs north-east out of the town, between the noble houses and up into the fells, toward the Silent Field. That way is not open yet. (Coming in a later part of Chapter Two.)' }
            ]
        },

        // -----------------------------------------------------------------
        // Inside the Great Hall, after Tokelo's reference picture (2026-11-13, "Hall of Winter"): the empty high seat
        // on its dais under the carved gable and red hangings, the house banners and weapon racks along the back wall,
        // the fire pit in the middle with its cauldrons on a timber frame, three feast tables down each side, the red
        // runner from the entrance to the dais steps, the skald's corner (west) and the Lawspeaker's table (east), and
        // by the entrance "The Six Hundred Remembered" with its candles (west) and the armoury (east).
        hall_of_winter: {
            zoneId: 'hrimvald_hrafnholm',
            name: 'The Hall of Winter',
            scene: 'hall_of_winter',           // painted whole: ui/scene-hrimvald.js
            ambient: { darkness: 0.2, lantern: 6, particles: { kind: 'embers', count: 10 } },
            legend: {
                '=': { name: 'floor' }, '-': { name: 'runner' }, 'B': { name: 'dais' }, 'S': { name: 'dais_steps' },
                'X': { name: 'wall', solid: true }, 'Y': { name: 'post', solid: true }, 'Z': { name: 'screen', solid: true },
                'J': { name: 'high_seat', solid: true }, 'j': { name: 'chair', solid: true }, 'u': { name: 'side_table', solid: true },
                'i': { name: 'brazier', solid: true }, 'O': { name: 'fire_pit', solid: true }, 't': { name: 'feast_table', solid: true },
                'K': { name: 'skald_corner', solid: true }, 'L': { name: 'law_table', solid: true }, 'N': { name: 'name_boards', solid: true },
                'q': { name: 'candle_table', solid: true }, 'p': { name: 'berry_jar', solid: true }, 'r': { name: 'weapon_rack', solid: true },
                's': { name: 'shield_stand', solid: true }, 'c': { name: 'fur_chest', solid: true }, 'b': { name: 'barrel', solid: true },
                'v': { name: 'shields', solid: true }, 'a': { name: 'wall_banner', solid: true }, 'x': { name: 'crate', solid: true }
            },
            tiles: [
                'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                'XX==v==br=cc=BBuBJJBjBB=cc=rb==v==XX',
                'XX===========BBBBJJBBBB===========XX',
                'XXKKKK=======iBBBBBBBBi=======LLLLXX',
                'XXKKKK========SSSSSSSS========LLLLXX',
                'XXKKKK===========--===========LLLLXX',
                'XX===============--===============XX',
                'XX====tttttt=====--=====tttttt====XX',
                'XX====tttttt=====--=====tttttt====XX',
                'XX===============--===============XX',
                'XXa=============OOOO=============aXX',
                'XX====tttttt====OOOO====tttttt====XX',
                'XX====tttttt===iOOOOi===tttttt====XX',
                'XX===============--===============XX',
                'XX===============--===============XX',
                'XXx===tttttt=====--=====tttttt===xXX',
                'XX====tttttt=====--=====tttttt====XX',
                'XX===============--===============XX',
                'XXZZZZZZZZZZZZ===--===ZZZZZZZZZZZZXX',
                'XX=NNNNNNNN==Z===--===Z=cc===rrr==XX',
                'XX==========pZ===--===Z====x====s=XX',
                'XX==qqqqq========--=============s=XX',
                'XX===============--===============XX',
                'XXXXXXXXXXXXXXXY====YXXXXXXXXXXXXXXX',
                'XXXXXXXXXXXXXXXXX==XXXXXXXXXXXXXXXXX',
            ],
            lights: [
                { x: 17, y: 13, radius: 4.5, color: 'rgba(255, 150, 60, 0.3)' }, { x: 13, y: 5, radius: 2.4, color: 'rgba(255, 170, 80, 0.22)' },
                { x: 22, y: 5, radius: 2.4, color: 'rgba(255, 170, 80, 0.22)' }, { x: 6, y: 22, radius: 2.6, color: 'rgba(255, 190, 110, 0.22)' },
                { x: 15, y: 24, radius: 2, color: 'rgba(255, 170, 80, 0.2)' }, { x: 20, y: 24, radius: 2, color: 'rgba(255, 170, 80, 0.2)' }
            ],
            spawns: {
                from_hrafnholm: { x: 17, y: 25, facing: 'up' },
                from_hrafnholm_2: { x: 18, y: 25, facing: 'up' }
            },
            exits: [
                { id: 'hall_of_winter_out', x: 17, y: 26, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_hall' },
                { id: 'hall_of_winter_out_2', x: 18, y: 26, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_hall_2' }
            ],
            encounters: [],
            interactables: [
                { id: 'hall_ragnhild', kind: 'npc', npc: 'ragnhild', x: 19, y: 5, name: 'Ragnhild Frostmark', sprite: 'jarl' },
                { id: 'hall_high_seat', kind: 'inspect', x: 17, y: 4, name: 'The high seat',
                    text: 'The jarl\'s seat: carved ash, a back like a gable end, the arms ending in ravens\' heads, a white fur folded on it that nobody has sat on. The step below it is where an heir sits until the grave-ale has been drunk. That step is empty too.' },
                { id: 'hall_names', kind: 'inspect', x: 6, y: 21, name: 'The Six Hundred Remembered',
                    text: 'Five boards along the screen, under a carved heading: THE SIX HUNDRED REMEMBERED. Rows of names, steading by steading, copied from the boards cut the morning the host marched. Candles burn on the table under them. Some of the rows have a name scratched out and cut again, more deeply, as if the first cut had not taken.' },
                { id: 'hall_fire', kind: 'inspect', x: 18, y: 14, name: 'The long fire',
                    text: 'A fire pit of fitted stone, three cauldrons hanging from a timber frame over it. One is mutton, one is barley, and one is only hot water for anyone who needs it. The fire has not been let go out in twenty years, and nobody here thinks that strange.' },
                { id: 'hall_skald_corner', kind: 'inspect', x: 5, y: 6, name: "The skald's corner",
                    text: 'A bench on a round of rugs, a harp in its case leaning against it, a stool. This was Hallvard\'s place when he was Eirik\'s skald. The harp has been kept tuned. Nobody plays it.' },
                { id: 'hall_law_table', kind: 'inspect', x: 30, y: 6, name: "The Lawspeaker's table",
                    text: 'A table of law-sticks and tally staves, a shelf of them behind it, every claim of the year notched on its own stick. One heap is taller than the rest, tied with grey wool: the inheritances that have waited twenty winters.' },
                { id: 'hall_banners', kind: 'inspect', x: 9, y: 2, name: 'House banners',
                    text: 'The banners of the great houses along the back wall, and in the middle, either side of the seat, the Frostmark banner: a white tree on madder red. It was woven the year Eirik took the seat. The colours have held.' },
                { id: 'hall_armoury', kind: 'inspect', x: 30, y: 21, name: 'Armoury',
                    text: 'Spears in a rack, round shields painted half and half, a chest under a fur. The hall\'s men keep their gear here. There is room on the rack for a great many more spears than there are.' },
                { id: 'hall_tables', kind: 'inspect', x: 8, y: 10, name: 'Feast table',
                    text: 'Bowls, a jug, candles burning down in their own wax, a runner of red-and-white weave down the middle. Places are laid all down the bench, more places than there are people in the hall.' }
            ]
        }

    };

    // The Overgrown Road's east track becomes the way on, once Chapter One is done (Q08: "Follow the crows east").
    const road = {
        dropBoundary: 'road_east_track',
        exit: { id: 'road_frostspine', x: 31, y: 9, trigger: 'step', toMap: 'frostspine_pass', toSpawn: 'from_road',
            requires: { flags: ['chapter_one_complete'] },
            lockedText: 'The track bends away east under the trees and is lost in the undergrowth. The crows go that way, when they go anywhere. You have unfinished business nearer home first.',
            text: 'The east track climbs for half a day. The oaks give way to firs and the firs to rock. Above you, the crows have company: two ravens, very large, riding the wind without moving their wings.' },
        spawn: { from_frostspine: { x: 30, y: 9, facing: 'left' } }
    };

    const chapter2Maps = { zones, maps, road };
    (ENSO.world || (ENSO.world = {})).chapter2Maps = chapter2Maps;
    if (isNode) module.exports = chapter2Maps;
})(typeof window !== 'undefined' ? window : globalThis);
