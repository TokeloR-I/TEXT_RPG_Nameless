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
 * Every map is painted whole by ui/scene-hrimvald.js (no tile art; tests/63 requires a scene on every map).
 * The road on to Hrafnholm is a boundary for now: Act I ends at Skeldvik.
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const zones = {
        hrimvald_frostspine: { name: 'Frostspine Pass', mapIds: ['frostspine_pass'] },
        hrimvald_skeldvik: { name: 'Skeldvik', mapIds: ['skeldvik'] }
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
                flight_bell: { x: 39, y: 5, facing: 'up' }
            },
            exits: [
                { id: 'skeldvik_north', x: 9, y: 0, trigger: 'step', toMap: 'frostspine_pass', toSpawn: 'from_skeldvik' }
            ],
            encounters: [],
            interactables: [
                { id: 'skeldvik_eydis', kind: 'npc', npc: 'eydis', x: 11, y: 10, name: 'Eydis Namesinger', sprite: 'skald', when: { flags: ['eydis_in_skeldvik'] } },
                { id: 'skeldvik_leif', kind: 'npc', npc: 'leif', x: 8, y: 28, name: 'Leif Ropehand', sprite: 'shipwright' },
                { id: 'skeldvik_solveig', kind: 'npc', npc: 'solveig', x: 28, y: 15, name: 'Solveig', sprite: 'fishwife' },
                { id: 'skeldvik_thora', kind: 'npc', npc: 'thora', x: 37, y: 6, name: 'Thora Half-Oar', sprite: 'reeve' },
                { id: 'skeldvik_geir', kind: 'npc', npc: 'geir', x: 24, y: 23, name: 'Geir', sprite: 'wolfcrew' },
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
            ],
            boundaries: [
                { id: 'skeldvik_west_road', x: 0, y: 36, w: 1, h: 2, title: 'The road to the village and the hinterlands',
                    text: 'The road leaves the harbour by the south-west, through the village and on into the hinterlands, toward Hrafnholm, where the Jarl keeps her hall and the assembly meets. That way is not open yet. (Coming in the next part of Chapter Two.)' }
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
