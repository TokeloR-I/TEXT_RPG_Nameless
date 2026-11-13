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
 *   gullstrand_coast  Fenrir's Heir (CL1), after Tokelo's picture (2026-11-13): a fishing village and harbour under a carved
 *                     headland, the Wolf's Wake (the wolf-carving, the bright and dark caves, the binding stone and the ring),
 *                     a wrecked longship on the beach. West of Skeldvik by the cliff path.
 * Every map is painted whole by ui/scene-hrimvald.js (no tile art; tests/63 requires a scene on every map).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const BJARKI = "A big man sits up in the coffin on the dais, then stands, and keeps on standing: mail, a helm, a shield as broad as a cart wheel, a sword black with grave-earth. He says one word in a tongue older than the North's, and the fires lean toward him.";
    const zones = {
        hrimvald_frostspine: { name: 'Frostspine Pass', mapIds: ['frostspine_pass'] },
        hrimvald_skeldvik: { name: 'Skeldvik', mapIds: ['skeldvik'] },
        hrimvald_hrafnholm: { name: 'Hrafnholm', mapIds: ['hrafnholm', 'hall_of_winter'] },
        hrimvald_gullstrand: { name: 'Gullstrand Coast', mapIds: ['gullstrand_coast'] },
        hrimvald_jarnmyr: { name: 'Járnmyr', mapIds: ['jarnmyr'] },
        hrimvald_silent_field: { name: 'The Silent Field', mapIds: ['silent_field'] },
        hrimvald_birkholt: { name: 'Birkholt', mapIds: ['birkholt'] },
        hrimvald_runadal: { name: 'Rúnadal', mapIds: ['runadal'] },
        hrimvald_bjarki_barrow: { name: "Bjarki's Barrow", mapIds: ['bjarki_barrow'] }
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
                    text: 'Yarrow in the lee of the firs, the last green thing before the rock.' },
                // The Hrimvald kitchen (2026-11-13): berries and juniper on the fells; they grow back.
                { id: 'frostspine_lingonberries', kind: 'forage', forage: 'lingonberries', x: 3, y: 12, name: 'Lingonberries', sprite: 'lingonberries',
                    text: 'Low glossy leaves and red berries in clusters, right down to the road.' },
                { id: 'frostspine_juniper', kind: 'forage', forage: 'juniper', x: 7, y: 2, name: 'Juniper', sprite: 'juniper',
                    text: 'A juniper bush bent flat by the wind, blue with berries.' },
                { id: 'frostspine_cloudberries', kind: 'forage', forage: 'cloudberries', x: 24, y: 13, name: 'Cloudberries', sprite: 'cloudberries',
                    text: 'A wet hollow below the crags, and amber berries standing up out of the moss, one to a stem.' }
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
                from_hrafnholm_2: { x: 1, y: 37, facing: 'right' },
                from_gullstrand: { x: 1, y: 4, facing: 'right' }
            },
            exits: [
                { id: 'skeldvik_north', x: 9, y: 0, trigger: 'step', toMap: 'frostspine_pass', toSpawn: 'from_skeldvik' },
                // The road to the village and the hinterlands, and on up to Hrafnholm (C2-03; it was a boundary until Hrafnholm was built).
                // The cliff path west over the headland to Gullstrand Coast and the Wolf's Wake (Fenrir's Heir, CL1).
                { id: 'skeldvik_gullstrand', x: 0, y: 4, trigger: 'step', toMap: 'gullstrand_coast', toSpawn: 'from_skeldvik',
                    text: 'The cliff path goes west out of Skeldvik, over a headland of wind-bent firs, and down to a fishing village under a great grey rock. Every house in it has its back turned to the rock.' },
                { id: 'skeldvik_west_road', x: 0, y: 36, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_skeldvik',
                    text: 'The road leaves the harbour by the south-west, through a village of turf roofs and on up into the hinterlands. By evening there is a palisade on the ridge ahead, smoke over it, and a great roof above the smoke.' },
                { id: 'skeldvik_west_road_2', x: 0, y: 37, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_skeldvik_2',
                    text: 'The road leaves the harbour by the south-west, through a village of turf roofs and on up into the hinterlands. By evening there is a palisade on the ridge ahead, smoke over it, and a great roof above the smoke.' }
            ],
            encounters: [],
            interactables: [
                // Once the tablet is decided (C2-02 done, C2-03 begun) she goes up the road to read at the Thing.
                { id: 'skeldvik_eydis', kind: 'npc', npc: 'eydis', x: 11, y: 10, name: 'Eydis Namesinger', sprite: 'skald', when: { flags: ['eydis_in_skeldvik'], quests: { C203: 'unseen' } } },
                // C2-S04 The Fisherman's Debt: the trader's master, on the north dock beside his ship.
                { id: 'skeldvik_bersi', kind: 'npc', npc: 'bersi', x: 48, y: 16, name: 'Bersi Grimsson', sprite: 'skipper' },
                { id: 'skeldvik_leif', kind: 'npc', npc: 'leif', x: 8, y: 28, name: 'Leif Ropehand', sprite: 'shipwright' },
                { id: 'skeldvik_solveig', kind: 'npc', npc: 'solveig', x: 28, y: 15, name: 'Solveig', sprite: 'fishwife' },
                { id: 'skeldvik_thora', kind: 'npc', npc: 'thora', x: 37, y: 6, name: 'Thora Half-Oar', sprite: 'reeve' },
                { id: 'skeldvik_geir', kind: 'npc', npc: 'geir', x: 24, y: 23, name: 'Geir', sprite: 'wolfcrew' },
                // James the bard (CB1), playing outside the Stormtide Inn until you offer him a place at your homestead.
                { id: 'skeldvik_james', kind: 'npc', npc: 'james', x: 29, y: 10, name: 'James', sprite: 'bard', when: { notFlags: ['james_recruited'] } },
                { id: 'skeldvik_bell', kind: 'inspect', x: 39, y: 4, name: 'Harbour bell',
                    text: 'A bronze bell under its own small roof, green with salt, on a terrace of fitted stone above the wharf. It is rung for fog and for ships that are late. The rope is worn smooth at the height of a hand. You put yours where all the others have been.' },
                { id: 'skeldvik_memorial', kind: 'inspect', x: 12, y: 8, name: 'Memorial stone',
                    text: 'A standing stone twice your height, cut with knotwork older than the war, in a ring of smaller stones. A wooden board is pegged to its face: the names of Skeldvik\'s dead from the Silent Field, cut in rows. Half the board has been split away along the grain, lately, with something sharp. The pale wood underneath has not had time to grey.' },
                { id: 'skeldvik_gullstrand_post', kind: 'inspect', x: 3, y: 3, name: 'Waymark',
                    text: 'A board nailed to the palisade where the cliff path leaves the town: GULLSTRAND, and an arrow west along the cliffs. Under it someone has cut two small wolves, one with a sun over it and one with a moon, and a line through both.' },
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
                // The Hrimvald kitchen (Tokelo, 2026-11-13). Aslaug keeps the Stormtide's bar; she waits at the inn door until
                // the inn's hall is built, then moves inside. The harbour cookfire is a public hearth by the fish racks.
                { id: 'skeldvik_aslaug', kind: 'npc', npc: 'aslaug', x: 27, y: 10, name: 'Aslaug', sprite: 'alewife' },
                { id: 'skeldvik_cookfire', kind: 'station', station: 'harbour_cookfire', verb: 'Cook at', x: 35, y: 18, name: 'Harbour cookfire', sprite: 'cookfire' },
                { id: 'skeldvik_lingonberries', kind: 'forage', forage: 'lingonberries', x: 3, y: 20, name: 'Lingonberries', sprite: 'lingonberries',
                    text: 'Lingonberries in the snow by the road, red as sparks.' },
                // Sour Herring (C2S1): the narrow ship's gangplank, only while the prank is on.
                { id: 'skeldvik_gangplank', kind: 'station', station: 'herring_hatch', verb: 'Board', x: 18, y: 28, name: 'Gangplank',
                    when: { quests: { C2S1: 'active' } } },
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
                ':::::::::::::::,,WWWBBBBBBBBBBBBWWW,,:::MMMMMMMM,^^^',
                ':::::::::::::::,WWnnnnBBiBBiBBnnnnWW,::iMMMMMMMMi^^^',
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
                from_hall_2: { x: 26, y: 10, facing: 'down' },
                from_jarnmyr: { x: 1, y: 18, facing: 'right' },
                from_jarnmyr_2: { x: 1, y: 19, facing: 'right' },
                from_silent_field: { x: 43, y: 1, facing: 'down' },
                from_silent_field_2: { x: 44, y: 1, facing: 'down' }
            },
            exits: [
                { id: 'hrafnholm_south_road', x: 25, y: 39, trigger: 'step', toMap: 'skeldvik', toSpawn: 'from_hrafnholm' },
                { id: 'hrafnholm_south_road_2', x: 26, y: 39, trigger: 'step', toMap: 'skeldvik', toSpawn: 'from_hrafnholm_2' },
                // C2-04 (2026-11-13): the west road past the forge, to Járnmyr. Open once the Thing has made you its witness.
                { id: 'hrafnholm_west_road', x: 0, y: 18, trigger: 'step', toMap: 'jarnmyr', toSpawn: 'from_hrafnholm', requires: { flags: ['thing_heard'] },
                    lockedText: 'The west road runs down past the forge toward Járnmyr, where the bog iron is smelted. The Thing has not sat yet; whatever is going on at the forges, it is not your business until somebody makes it so.',
                    text: 'The west road drops off the ridge and follows a stream through birch and pine. Long before you see Járnmyr you smell it: woodsmoke, hot clay, and something like blood that turns out to be the bog.' },
                { id: 'hrafnholm_west_road_2', x: 0, y: 19, trigger: 'step', toMap: 'jarnmyr', toSpawn: 'from_hrafnholm_2', requires: { flags: ['thing_heard'] },
                    lockedText: 'The west road runs down past the forge toward Járnmyr, where the bog iron is smelted. The Thing has not sat yet; whatever is going on at the forges, it is not your business until somebody makes it so.',
                    text: 'The west road drops off the ridge and follows a stream through birch and pine. Long before you see Járnmyr you smell it: woodsmoke, hot clay, and something like blood that turns out to be the bog.' },
                // Act II (2026-11-13): the north-east track to the Silent Field, open once the Thing has sat.
                { id: 'hrafnholm_silent_field', x: 43, y: 0, trigger: 'step', toMap: 'silent_field', toSpawn: 'from_hrafnholm', requires: { flags: ['thing_heard'] },
                    lockedText: 'The track climbs north-east out of the town toward the Silent Field, where the six hundred lie. Nobody goes up there before the Thing has sat; it would be like reading a will before the funeral.',
                    text: 'The track climbs between the noble houses and up into the fells. The snow thins, the wind drops, and then there is nothing in front of you but pale grass and mist, and the stones.' },
                { id: 'hrafnholm_silent_field_2', x: 44, y: 0, trigger: 'step', toMap: 'silent_field', toSpawn: 'from_hrafnholm_2', requires: { flags: ['thing_heard'] },
                    lockedText: 'The track climbs north-east out of the town toward the Silent Field, where the six hundred lie. Nobody goes up there before the Thing has sat; it would be like reading a will before the funeral.',
                    text: 'The track climbs between the noble houses and up into the fells. The snow thins, the wind drops, and then there is nothing in front of you but pale grass and mist, and the stones.' },
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
                // The Thing (C2-03): Eydis by the law rock with the Roll, Ulfrun among the Wolf-Banner on the east benches.
                { id: 'hrafnholm_eydis', kind: 'npc', npc: 'eydis', x: 27, y: 22, name: 'Eydis Namesinger', sprite: 'skald', when: { quests: { C203: 'active+' } } },
                { id: 'hrafnholm_ulfrun', kind: 'npc', npc: 'ulfrun', x: 31, y: 24, name: 'Ulfrun Grey-Mantle', sprite: 'greymantle', when: { flags: ['ulfrun_beaten'] } },
                // C2-S02 The Price of an Oath: Hild by the noble houses, Kolgrim drilling in the Training Yard.
                { id: 'hrafnholm_hild', kind: 'npc', npc: 'hild', x: 10, y: 8, name: 'Hild', sprite: 'widow' },
                { id: 'hrafnholm_kolgrim', kind: 'npc', npc: 'kolgrim', x: 10, y: 27, name: 'Kolgrim', sprite: 'farmer' },
                // The Hrimvald kitchen (2026-11-13): Gudrun at the east stalls, the feast fire by the tables, berries on the slope.
                { id: 'hrafnholm_gudrun', kind: 'npc', npc: 'gudrun', x: 33, y: 15, name: 'Gudrun', sprite: 'shepherd' },
                { id: 'hrafnholm_feast_fire', kind: 'station', station: 'feast_fire', verb: 'Cook at', x: 38, y: 16, name: 'Feast fire', sprite: 'cookfire' },
                { id: 'hrafnholm_lingonberries', kind: 'forage', forage: 'lingonberries', x: 46, y: 9, name: 'Lingonberries', sprite: 'lingonberries',
                    text: 'Lingonberries under the firs above the houses.' },
                { id: 'hrafnholm_cloudberries', kind: 'forage', forage: 'cloudberries', x: 46, y: 23, name: 'Cloudberries', sprite: 'cloudberries',
                    text: 'Cloudberries in a boggy corner under the cliff. Someone has been here before you and left a few.' },
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
            boundaries: []
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
                // C2-S02: Orm's oath-stick, in the grey-wool bundle on the Lawspeaker's table, while the case is open.
                { id: 'hall_orm_stick', kind: 'npc', npc: 'orm_stick', x: 29, y: 8, name: "Orm's oath-stick", when: { quests: { 'C2-S02': 'active' } } },
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
        },
        // -----------------------------------------------------------------
        // Gullstrand Coast and the Wolf's Wake (Fenrir's Heir, quest CL1). Laid out after Tokelo's picture
        // (2026-11-13, "Gullstrand Coast, Wolf's Wake"): the cliff path comes down from Skeldvik in the north-west
        // into a fishing village of thatched houses, fish racks and a canvas awning; the quay, the pier, the
        // rowboats and the net shed sit in the harbour in the south-west. A path runs east under the headland; a
        // winding stair climbs it to the Wolf's Wake: a ring of flagstones before a cliff carved with a sun, a
        // running golden wolf, a broken chain, a running dark wolf and a crescent moon, a bright cave on the sun's
        // side and a dark one on the moon's. East, the path drops to a pebble beach and a wrecked longship;
        // sea stacks and a stormy sea fill the east and south.
        gullstrand_coast: {
            zoneId: 'hrimvald_gullstrand',
            name: 'Gullstrand Coast',
            scene: 'gullstrand_coast',         // painted whole: ui/scene-hrimvald.js
            ambient: { tint: 'rgba(70, 80, 110, 0.1)', particles: { kind: 'dust', count: 10 },
                grade: { ambient: 0.9, exposure: 1.02, highlights: [0.0, 0.02, 0.05] } },
            legend: {
                ',': { name: 'grass' }, ':': { name: 'path' }, 'B': { name: 'flagstones' }, 'S': { name: 'steps' }, '.': { name: 'shingle' }, '=': { name: 'wharf' },
                '~': { name: 'water', solid: true }, '^': { name: 'cliff', solid: true }, 'T': { name: 'fir', solid: true }, 'o': { name: 'rock', solid: true },
                'C': { name: 'wolf_carving', solid: true }, 'g': { name: 'sun_cave', solid: true }, 'v': { name: 'moon_cave', solid: true }, 'Z': { name: 'binding_stone', solid: true },
                'h': { name: 'house', solid: true }, 'a': { name: 'awning', solid: true }, 'n': { name: 'net_shed', solid: true }, 'r': { name: 'fish_rack', solid: true },
                'f': { name: 'fence', solid: true }, 'b': { name: 'barrel', solid: true }, 'x': { name: 'crate', solid: true }, 'k': { name: 'rowboat', solid: true },
                'L': { name: 'wreck', solid: true }
            },
            tiles: [
                '^^^^^^^^^^^^:^^^^^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~~',
                '^^^^^^^^^^^^:^^^^^^CCCCCCCCCCCCCCCCCC^^^^^~~~~~~~~~~~~~~',
                ',T,T,,,,,,,,:,,,^^^CCCCCCCCCCCCCCCCCC^^^^^~~~~~~~~~~~~~~',
                ',,,,,T,,,,,,:,,,^^^CCCCCCCCCCCCCCCCCC^^^^^~~~~~~~~~~~~~~',
                'T,,,,,,,,,,,:,,,^^^CgggCCCCCCCCCCCvvv^^^^^~~~~~~~~~~~~~~',
                ',hhhhhh,,,,:,,,T^^^CgggCCCCCCCCCCCvvv^^^^^~~~~~~~~~~~~~~',
                ',hhhhhh,,x,:,,,,^^^^BBBBBBBBBBBBZBBB^^^^^^~~~~~~~~~~~~~~',
                ',hhhhhh,,,,:,,,,^^^BBBBBBBBBBBBBBBBBB^^^^^....LLLLLL.~~~',
                ',hhhhhh,,,:,,,,,^^^BBBBBBBBBBBBBBBBBB^^^^.....LLLLLLL~~~',
                ',hhhhhhb,:,,,,,,^^^BBBBBBBBBBBBBBBBBB^^^......LLLLLLL~~~',
                'x,:::::::,,,hhhhhh^oBBBBBBBBBBBBBBBBo^^^......LLLLLLL~~~',
                ',,T,,,,,:,,,hhhhhh^^^^^^^^^SS^^^^^^^^^^.........LLLL.~~~',
                'Tffffff,:,,,hhhhhh^^^^^^^^^SS^^^^^^^^^^......o.......~~~',
                ',,,,,,,,:,,,hhhhhh^^^^^^^^SS^^^^^^^^^^::............o~~~',
                'hhhhhh,,,:,,,ff,,,^^^^^^^^SS^^^^^^^^^::..o.o.........~~~',
                'hhhhhhaa,:,,,,,rr,^^^^^^^SS^^^^^^^^^::^^~~~~~~~~~~~~~~~~',
                'hhhhhhaa,,:rr,,,,b^^^^^^^SS^^^^^^^^::^^^~~~~~~~~~~~~~~~~',
                'hhhhhh,,,,::,,,,,,o,,,o,,SS,,,,,,,,:^^^^~~o~~~~~~~~~~~~~',
                'hhhhhhbx,,,::::::::::::::::::::::::,^^^^~~~~~~~~~~~~~~~~',
                ',,,,,,,,,:::,nnnn,,,,,,,,^^^^^^^^^^^^^^^~~~~~~o~~~~~~~~~',
                ',,xb,,,::::,,nnnn^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~~',
                ',,,,:::::::xxnnnn^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~~',
                ',,,=============,^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~o~~~~~',
                '~~~=============~^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~~',
                '~~~~~~~~~~~~==~~~^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~~',
                '~~~~~k~k~~~~==~~~^^^^^^^^^^^^^^^^^^^^^^^~~~~o~~~~~~~~~~~',
                '^^~~~~~~~~~~==~~~^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~~~',
                '^^~~~~~~=========^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~o~~',
                '^^~~~~~~=========^^^^^^^^^^^^^~~~o~~~~~~~o~~~~~~~~~~~~~~',
                '^^^^~~~~~~~~~~~~~^^^^^^^^^^^^^~~~~~~~~~~~~~~~~~~o~~~~~~~',
                '^^^^~~~~~k~k~~~~~^^^^^^^^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
                '^^^^~~~~~~~~~~~~~^^^^^^^^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
            ],
            lights: [
                { x: 21, y: 5, radius: 3.2, color: 'rgba(255, 190, 80, 0.32)' }, { x: 35, y: 5, radius: 3.2, color: 'rgba(170, 110, 255, 0.3)' },
                { x: 3, y: 9, radius: 2.2, color: 'rgba(255, 170, 80, 0.2)' }, { x: 14, y: 13, radius: 2.2, color: 'rgba(255, 170, 80, 0.2)' },
                { x: 3, y: 18, radius: 2.4, color: 'rgba(255, 170, 80, 0.22)' }, { x: 15, y: 21, radius: 1.8, color: 'rgba(255, 170, 80, 0.18)' }
            ],
            spawns: {
                from_skeldvik: { x: 12, y: 1, facing: 'down' }
            },
            exits: [
                { id: 'gullstrand_north', x: 12, y: 0, trigger: 'step', toMap: 'skeldvik', toSpawn: 'from_gullstrand',
                    text: 'The cliff path climbs over the headland, through the firs, and comes down by the palisade into Skeldvik.' }
            ],
            encounters: [
                // The sun hunt (CL1): coast wolves gone wrong in a heat that isn't there, lying across the bright cave. They wake with the carving.
                { id: 'gullstrand_sun_hunt', x: 21, y: 7, name: 'Sun-Mad Wolves', enemies: ['sunscorched_wolf', 'sunscorched_wolf', 'sunscorched_wolf'], trigger: 'contact', sprite: 'wolf',
                    detect: 120, when: { flags: ['fenrir_quest_discovered'] },
                    text: 'Three grey coast wolves lie across the mouth of the bright cave, panting as if it were midsummer. Their fur is singed white along the back. When they lift their heads their eyes are the colour of noon.' },
                // The moon hunt: what comes out of the dark hollow once you've taken what it kept.
                { id: 'gullstrand_moon_hunt', x: 35, y: 8, name: 'Moonless Wolves', enemies: ['moonless_wolf', 'moonless_wolf', 'moonless_wolf'], trigger: 'contact', sprite: 'wolf',
                    detect: 120, when: { flags: ['fenrir_moon_fang'] },
                    text: 'The dark follows you out of the hollow, and has teeth. Three wolves with no light in them at all, only the shape of wolves cut out of the evening.' },
                // The Broken Binding: lay both fangs in the stone and what held Fenrir wakes on the ring.
                { id: 'wolfs_wake_trial', x: 28, y: 8, name: 'The Binding Echo', enemies: ['binding_echo'], trigger: 'contact', sprite: 'shade',
                    when: { flags: ['fenrir_trial_called'], notFlags: ['fenrir_trial_cleared'] },
                    text: 'A coil of chain turns slowly over the ring, links of sunlight and links of no light at all, wound into something with no face. It is not a wolf. It is the thing that held one.' }
            ],
            interactables: [
                { id: 'gullstrand_brynja', kind: 'npc', npc: 'brynja', x: 12, y: 20, name: 'Brynja Net-Mender', sprite: 'netmender' },
                { id: 'gullstrand_wolf_carving', kind: 'inspect', x: 28, y: 5, name: 'The wolf-carving',
                    text: 'The whole cliff face has been cut back flat and carved. On the left a sun, rayed like a wheel, and a wolf running at it with its jaws open. On the right a crescent moon and a second wolf, darker, running the other way. A chain crosses the rock between them, link by link, and breaks in the middle.' },
                { id: 'gullstrand_sun_cairn', kind: 'npc', npc: 'sun_marker', x: 21, y: 5, name: 'The bright cave',
                    guardedBy: 'gullstrand_sun_hunt',
                    guardedText: 'The wolves are lying across the cave mouth, and they are not asleep. Whatever is in the bright cave, you will have to go through them.' },
                { id: 'gullstrand_moon_hollow', kind: 'npc', npc: 'moon_hollow', x: 35, y: 5, name: 'The dark hollow' },
                { id: 'gullstrand_binding_stone', kind: 'npc', npc: 'wolfs_wake_stone', x: 32, y: 6, name: 'The binding stone' },
                { id: 'gullstrand_longhouse', kind: 'inspect', x: 3, y: 18, name: 'Longhouse',
                    text: 'The biggest house in Gullstrand, thatched in sea-grass weighted with stones on ropes against the wind. Every house in the village turns its back on the headland. You notice it here first.' },
                { id: 'gullstrand_fish_racks', kind: 'inspect', x: 11, y: 16, name: 'Fish racks',
                    text: 'Split cod hung by the tail in pairs. A gull sits on the top rail, considering its chances.' },
                { id: 'gullstrand_net_shed', kind: 'inspect', x: 15, y: 21, name: 'Net shed',
                    text: 'Nets in heaps, floats of cork and glass, a bone needle on every hook. Someone has nailed a horseshoe over the lintel the wrong way up, so that the luck runs out toward the headland.' },
                { id: 'gullstrand_wreck', kind: 'inspect', x: 48, y: 11, name: 'Wrecked longship',
                    text: 'A longship on her side on the pebbles, her back broken, the sail in red rags on a mast that has snapped twice. Nobody has stripped her for timber. The villagers say she came ashore on a night when there was no moon and no wind, and her crew went up the stair.' },
                { id: 'gullstrand_sea_stacks', kind: 'inspect', x: 45, y: 12, name: 'Sea stacks',
                    text: 'Pillars of grey rock standing out in the surf, green on top where the gulls nest. The sea goes white round every one of them.' },
                { id: 'gullstrand_stair', kind: 'inspect', x: 22, y: 17, name: 'Old boulder',
                    text: 'A stone at the foot of the stair, worn into a seat. Someone has scratched two small wolves on it, the way a child draws them, and then scratched them out.' },
                { id: 'gullstrand_herbs', kind: 'forage', forage: 'wild_herbs', x: 4, y: 3, name: 'Wild herbs', sprite: 'herbs',
                    text: 'Thyme and sea-pink in the turf above the village, where the wind keeps the grass short.' }
            ]
        },

        // -----------------------------------------------------------------
        // C2-04 Iron for the Wolf. Járnmyr, after Tokelo's picture (2026-11-13, "Járnmyr"): the bog in the west, red-brown
        // pools crossed by boardwalks, with the peat cuttings below them; the charcoal kilns smoking in the north with the
        // woodsheds under them; the work yard in the middle with its three bloomery furnaces, the bog-ore and slag heaps,
        // the stone hut and the ore cart; Bjorn Ironvein's great smithy and its weapon racks in the east; the stepped
        // quarry with its two cranes behind it; and up the north-east path, the burial mound with its stone entrance.
        // The road from Hrafnholm comes in from the south. The barrow's inside (C2-05), Birkholt across the bog and the
        // track to Rúnadal have no pictures yet, so they are boundaries (area-art-first rule, Tokelo 2026-11-13).
        jarnmyr: {
            zoneId: 'hrimvald_jarnmyr',
            name: 'Járnmyr',
            scene: 'jarnmyr',                  // painted whole: ui/scene-hrimvald.js
            ambient: { tint: 'rgba(120, 90, 60, 0.06)', particles: { kind: 'snow', count: 8 },
                grade: { ambient: 0.94, exposure: 1.04, highlights: [0.05, 0.02, -0.02] } },
            legend: {
                ',': { name: 'moor' }, ':': { name: 'path' }, ';': { name: 'yard' }, '=': { name: 'boardwalk' }, 'p': { name: 'peat' },
                'u': { name: 'quarry_floor' }, 'E': { name: 'barrow_mouth' },
                '~': { name: 'bog', solid: true }, '^': { name: 'crag', solid: true }, 'T': { name: 'fir', solid: true },
                'K': { name: 'kiln', solid: true }, 'w': { name: 'woodshed', solid: true }, 'c': { name: 'charcoal', solid: true }, 'L': { name: 'log_pile', solid: true },
                'F': { name: 'furnace', solid: true }, 's': { name: 'slag', solid: true }, 'r': { name: 'ore', solid: true }, 'H': { name: 'stone_hut', solid: true },
                'k': { name: 'shed', solid: true }, 'S': { name: 'smithy', solid: true }, 'W': { name: 'smithy_wing', solid: true }, 'R': { name: 'weapon_rack', solid: true }, 'A': { name: 'anvil', solid: true },
                'x': { name: 'ingots', solid: true }, 'v': { name: 'ore_cart', solid: true }, 'b': { name: 'barrel', solid: true }, 'j': { name: 'fence', solid: true },
                'Q': { name: 'quarry', solid: true }, 'n': { name: 'crane', solid: true }, 'q': { name: 'blocks', solid: true }, 'M': { name: 'barrow', solid: true },
                'P': { name: 'peat_stack', solid: true }
            },
            tiles: [
                '^^^^^^^^^^^^^^::^^^^^^^^^^^^^^^^^^^^^^MMMMMMMMMMM^^^^^',
                '^^^^^^^^^^^^^^::^^^^^^^^^^^^^^^^^^^^^^MMMMMMMMMMM^^^^^',
                '^,,~~~~~~~T~,^::^,,,,,,T,TT^,,,T,,T,T^MMMMMMMMMMM,,,T^',
                '~~~~~~~~~~~~,,:::::,,,,,,,,,,,,,,,T,,,MMMMMMMMMMMT,T,^',
                '~~~~~~~~~~~~,,::,,:,,,,,,,:KKK,,,,,,,,,,MMMEMMM,,,,,T^',
                '~~~~~~~~~~~,,,,T,,:,,KKK,,:KKK,,,,,,::::::::QQQQQQQQQ^',
                '~~~~~~~~~~,,,,,,,T:,,KKK,,:KKK,,,::::QQQQQQQQQQQQQQQQ^',
                '~~~~~~~~~~,,,,,,,,:,,KKK,,:,,,,,,:,,QQQQQQQQQQQQQQuuQ^',
                '~~,,,,~~~~=======,:,,,,,,,:,KKK,,:,,QQQQQQQQQQQQQQuuQ^',
                '~~~,,,~~~~=~~,,,,,:::::::::,KKK,,:,,QQQQQQQQQQQqQQunQ^',
                '~~~,,~~~~~=~~,,,,,,L,,,,,,:,KKK,,:,,QQQQQQQQQuuuuuuuQ^',
                '~~~,~~~~~~=~~~,,,wwwwwwww,:,,,,,,:,,QQQQQQQQQuuuuuuuQ^',
                '===========,,,,,,wwwwwwwwc:,,,,,,:,,QQQQQQQQquuQQQQQQ^',
                '~~~~~=~~~~~,,~,,T,,,,,,,,,:,,,,,,:,,QQQQuuuuuuuQQQQQQ^',
                '~~~~~=~~~~,,,,,,,,,,,,,,,,::::::::,,QQQQuuquuuuQQQQQQ^',
                '~~~~,=,~~~,,,;;;;;;;;;;;;;;:;;;;;;:::uuuuuuuuQqQQQQQQ^',
                '~~~,,=~~~~~,,;;wwwwww;;;;;;;;kkkkk:::uuuuuuuuuuuuuQQQ^',
                '~~~,,=~~~~~,,;;wwwwww;cccc;;;kkkkk;,QQQQQQQuuuuuuunQQ^',
                '~~~,,=~~~~,,,;bFF;;;;;ccccFF;kkkkk;,QQQQQQQQQQQQuqQQQ^',
                '~~~~~=~~~~,,,;;FF;;;;;;;;;FF;;;;;;;,QQQQQQQQQQQQuuQQQ^',
                '~~~~~=~~~~~,,;;;;;;;;;;;;;;;;;;;;SSSSSSSSSS,,,,,::,T,^',
                '~~~~~==pppppp;;;;;;;;;;;;;;;;;;;;SSSSSSSSSS,,,,,::,,,^',
                '~~~~~=pPppPpp;;;;HHHH;kkk;;;;;;;;SSSSSSSSSSWWWW,::,,T^',
                '~~~~,=ppppppp;;;;HHHH;kkk;;;;;;;;SSSSSSSSSSWWWW,::,,,^',
                '~~~,,=~~~p~~,;;;;HHHH;;;;;;;;FF;;SSSSSSSSSSWWWW,::,,,^',
                '~~~,,=ppPppPp;;;;;;;;;;;;;;;;FF;;;;,,A,,,,,:::::::,,,^',
                '~~~~~==pppppp;;;;rrrrb;;;;;;b;;;;;;,,,,,,xxRRRRRRR,,,^',
                '~~~~~=~~~p~~,;;;;rrrr;;;;;;;;;;;;;;,,,,,,,,RRRRRRR,T,^',
                '~~~~~=pPppPpp;;;;;;;;;;;;;;;;;;;;;;,,kkkk,,,,,,,,,,,T^',
                '~~~~~=ppppppp;;;;;sss;;v;;;;;;;;;;;,,kkkk,,,xxx,,,,,,^',
                '~~~~~=,~~~~~~;;;;;;;;;;;;;;::;;;;;;,T,,,,,,,,,,T,,,,T^',
                '~~~~,,,,,~~~~~,,,,,,,,,,,,,::,,,jjjjjjjjjjjjjjjj,,,,,^',
                '~~~~,,,,~~~~~~~,,,,,,,,,,,,::,,,,T,,,,,,,,,,,,,,,T,,,^',
                '^T^,^TT,^T,^,,,,,TT^^^^T,T^::^^,,T^^,,T^^,^,,,,T,,T^,^',
                '^^^^^^^^^^^^^^^^^^^^^^^^^^^::^^^^^^^^^^^^^^^^^^^^^^^^^',
                '^^^^^^^^^^^^^^^^^^^^^^^^^^^::^^^^^^^^^^^^^^^^^^^^^^^^^',
            ],
            lights: [
                { x: 15, y: 19, radius: 2.6, color: 'rgba(255, 140, 50, 0.28)' }, { x: 26, y: 19, radius: 2.6, color: 'rgba(255, 140, 50, 0.28)' },
                { x: 29, y: 25, radius: 2.6, color: 'rgba(255, 140, 50, 0.28)' }, { x: 38, y: 23, radius: 3, color: 'rgba(255, 150, 60, 0.26)' }
            ],
            spawns: {
                from_hrafnholm: { x: 27, y: 34, facing: 'up' },
                from_hrafnholm_2: { x: 28, y: 34, facing: 'up' },
                from_birkholt: { x: 1, y: 12, facing: 'right' },
                from_runadal: { x: 14, y: 1, facing: 'down' },
                from_runadal_2: { x: 15, y: 1, facing: 'down' },
                from_barrow: { x: 43, y: 5, facing: 'down' }
            },
            exits: [
                { id: 'jarnmyr_south_road', x: 27, y: 35, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_jarnmyr' },
                { id: 'jarnmyr_south_road_2', x: 28, y: 35, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_jarnmyr_2' },
                { id: 'jarnmyr_west_boardwalk', x: 0, y: 12, trigger: 'step', toMap: 'birkholt', toSpawn: 'from_jarnmyr',
                    text: "The boardwalk runs west over the mire on split logs, the red water lapping at them. Then birch, then a fence, then barley, and the smoke of Birkholt's longhouses." },
                // C2-05: the barrow's wedged-open mouth, once the buyers have shown you what came out of it.
                { id: 'jarnmyr_barrow_mouth', x: 43, y: 4, trigger: 'step', toMap: 'bjarki_barrow', toSpawn: 'from_jarnmyr', requires: { quests: { C205: 'active+' } },
                    lockedText: 'The stone mouth of the mound has been wedged open with quarry wedges. Cold air comes out of it, and a smell like old coins. Nothing has given you a reason to go in yet.',
                    text: 'You squeeze past the quarry wedges into the dark. The air is still and cold and tastes of iron, and somewhere ahead, very small, a fire is burning that nobody has fed.' },
                { id: 'jarnmyr_north_track', x: 14, y: 0, trigger: 'step', toMap: 'runadal', toSpawn: 'from_jarnmyr',
                    text: 'The track climbs north into the pines. The forge noise falls away behind you, and soon there is only wind in the needles and your own steps on the moss.' },
                { id: 'jarnmyr_north_track_2', x: 15, y: 0, trigger: 'step', toMap: 'runadal', toSpawn: 'from_jarnmyr_2',
                    text: 'The track climbs north into the pines. The forge noise falls away behind you, and soon there is only wind in the needles and your own steps on the moss.' }
            ],
            encounters: [
                // C2-04: the buyers, on the barrow path with an empty cart, once you know where the iron goes.
                { id: 'jarnmyr_buyers', x: 36, y: 6, name: 'Skuli Tally-Hand', detect: 150, when: { flags: ['jarnmyr_trail_found'] },
                    enemies: ['wolfbanner_ringleader', 'wolfbanner_raider', 'wolfbanner_raider'], trigger: 'contact', sprite: 'constables',
                    text: 'Three men with an empty cart on the path up to the mound, and a fourth with a tally-stick behind his ear. He sees you looking at the cart and sighs. "Bjorn sent you? No. Bjorn never sends anyone."' }
            ],
            interactables: [
                { id: 'jarnmyr_bjorn', kind: 'npc', npc: 'bjorn', x: 39, y: 25, name: 'Bjorn Ironvein', sprite: 'ironmaster' },
                { id: 'jarnmyr_asger', kind: 'npc', npc: 'asger', x: 24, y: 8, name: 'Asger', sprite: 'collier' },
                { id: 'jarnmyr_thyri', kind: 'npc', npc: 'thyri', x: 25, y: 20, name: 'Thyri', sprite: 'bloomer' },
                { id: 'jarnmyr_vigdis', kind: 'npc', npc: 'vigdis', x: 43, y: 13, name: 'Vigdis', sprite: 'quarrier' },
                { id: 'jarnmyr_hearth', kind: 'station', station: 'jarnmyr_hearth', verb: 'Cook at', x: 21, y: 25, name: 'Bloomers\' cookfire', sprite: 'cookfire' },
                { id: 'jarnmyr_ore_cart', kind: 'inspect', x: 23, y: 29, name: 'Ore cart',
                    text: 'A cart heaped with roasted bog ore, red as rust, waiting for the furnaces. It sits lower on its axle than ore alone would make it.' },
                { id: 'jarnmyr_furnace_one', kind: 'inspect', x: 16, y: 19, name: 'Bloomery furnace',
                    text: 'A furnace of clay and stone, taller than a man, built like a beehive with its top cut off. Charcoal and ore go in at the top in turns, all day, and at the end of it they break the front open and drag out a bloom of iron like a spongy loaf, spitting slag.' },
                { id: 'jarnmyr_furnace_two', kind: 'inspect', x: 26, y: 18, name: 'Bloomery furnace',
                    text: 'This one is running. The bellows wheeze at its foot and the mouth glows yellow. Somebody has scratched a tally on the clay: blooms this month. There are a great many.' },
                { id: 'jarnmyr_furnace_three', kind: 'inspect', x: 29, y: 24, name: 'Bloomery furnace',
                    text: 'The newest furnace, the clay still pale. Járnmyr has built a third this year to keep up with its orders, and has not yet asked itself why there are so many.' },
                { id: 'jarnmyr_kilns', kind: 'inspect', x: 23, y: 7, name: 'Charcoal kilns',
                    text: 'Mounds of stacked wood under turf and earth, smoking from the top. A kiln burns for days and must not flare, so somebody sits up with it every night. That somebody sees everything that goes up the path.' },
                { id: 'jarnmyr_woodshed', kind: 'inspect', x: 20, y: 12, name: 'Woodsheds',
                    text: 'Split birch and pine stacked to the roof beams, a winter of it, for the kilns. The forest round Járnmyr has gone back a mile in twenty years.' },
                { id: 'jarnmyr_ore', kind: 'inspect', x: 18, y: 26, name: 'Bog ore',
                    text: 'Lumps of bog iron, raked out of the mire and roasted on the fire till they go red and brittle. It is the bog that makes the iron here: the water carries it and the reeds catch it, a little every year.' },
                { id: 'jarnmyr_slag', kind: 'inspect', x: 19, y: 29, name: 'Slag heap',
                    text: 'Black glassy slag, knocked out of the blooms. Children pick the shiny pieces out for beads. One of them has left a row of them on the fence, lined up by size.' },
                { id: 'jarnmyr_hut', kind: 'inspect', x: 18, y: 24, name: 'Stone hut',
                    text: 'The bloomers\' hut, dry-stone with a turf roof, where the furnace crews eat and sleep in shifts. Boots in a row by the step, and a cat that belongs to all of them.' },
                { id: 'jarnmyr_smithy', kind: 'inspect', x: 38, y: 24, name: 'The great smithy',
                    text: 'Bjorn Ironvein\'s smithy: a long open hall of oak with three hearths and a dozen hammers going. Scythe blades, pot hooks, hinges, nails by the barrel, and down one wall, racked as neat as a shield-wall, spearheads.' },
                { id: 'jarnmyr_racks', kind: 'inspect', x: 45, y: 26, name: 'Weapon racks',
                    text: 'Axes, spears and seaxes cooling on the racks under an awning. Most carry Bjorn\'s mark, a vein of three strokes. Every fourth spearhead has a second mark under it, very small, filed off and not filed quite well enough: a running wolf.' },
                { id: 'jarnmyr_peat', kind: 'inspect', x: 7, y: 22, name: 'Peat cuttings',
                    text: 'Peat cut in long steps out of the bog and stacked in cross-piles to dry. The cuttings fill with red water as soon as the spade comes out. In one face, a hand\'s depth down, there is a cut stake older than anyone\'s grandmother.' },
                { id: 'jarnmyr_mire', kind: 'inspect', x: 12, y: 9, name: 'The mire',
                    text: 'Red-brown water under the reeds, so full of iron it leaves a skin on your boots. Járnmyr means the iron mire. It is the only reason anyone lives here.' },
                { id: 'jarnmyr_crane', kind: 'inspect', x: 51, y: 9, name: 'Quarry crane',
                    text: 'A crane of pine trunks with a windlass, for lifting cut stone out of the pit. One of its ropes is new, and the old one is missing.' },
                { id: 'jarnmyr_barrow', kind: 'inspect', x: 41, y: 4, name: 'The burial mound',
                    text: 'A long mound under turf and snow, older than the forges, older than the old Crown. The kerbstones round its foot have been dug out on the near side, and someone has wedged open the stone mouth at the end.' },
                { id: 'jarnmyr_cloudberries', kind: 'forage', forage: 'cloudberries', x: 12, y: 14, name: 'Cloudberries', sprite: 'cloudberries',
                    text: 'Cloudberries on the edge of the mire, where the moss is dry enough to hold them.' },
                { id: 'jarnmyr_lingonberries', kind: 'forage', forage: 'lingonberries', x: 50, y: 31, name: 'Lingonberries', sprite: 'lingonberries',
                    text: 'Lingonberries under the rocks below the smithy, red even under the snow.' },
                { id: 'jarnmyr_juniper', kind: 'forage', forage: 'juniper', x: 31, y: 3, name: 'Juniper', sprite: 'juniper',
                    text: 'A juniper bush above the kilns, smelling of smoke as much as of itself.' }
            ],
            boundaries: [
            ]
        },


        // -----------------------------------------------------------------
        // The Silent Field, after Tokelo's picture (2026-11-13): a wide field of pale grass under mist, bare trees, the
        // memorial ring of six standing stones on a patch of turned earth with a carved round stone at its heart, graves
        // and markers scattered through the grass, broken shields and spears where they fell, torn banners, the ruined
        // bell tower on its stone footing (north-east), the field hospital's rotten tent with its cots (south-west), and a
        // stream along the south crossed by a plank bridge. Up the north-east track from Hrafnholm. The west path to
        // Hallvard's Barrow and the east path to the uplands are boundaries until they are built.
        silent_field: {
            zoneId: 'hrimvald_silent_field',
            name: 'The Silent Field',
            scene: 'silent_field',             // painted whole: ui/scene-hrimvald.js
            ambient: { tint: 'rgba(110, 110, 130, 0.1)', particles: { kind: 'snow', count: 6 },
                grade: { ambient: 0.9, exposure: 1.0, highlights: [-0.02, 0.0, 0.04] } },
            legend: {
                ',': { name: 'tall_grass' }, ':': { name: 'path' }, ';': { name: 'torn_earth' }, '=': { name: 'bridge' }, 'c': { name: 'round_stone' },
                '~': { name: 'stream', solid: true }, 'o': { name: 'rock', solid: true }, 'Y': { name: 'dead_tree', solid: true }, 'G': { name: 'grave', solid: true },
                'I': { name: 'memorial_stone', solid: true }, 'B': { name: 'bell_tower', solid: true }, 'X': { name: 'field_tent', solid: true },
                'w': { name: 'relic', solid: true }, 'f': { name: 'war_banner', solid: true }
            },
            tiles: [
                ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,Y,,,,,,,,,,,,,,,,,,,',
                ',,Y,,,,,,,,Y,,,o,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,Y,,',
                ',,,,,,,,,,,,,,,,,,,,,f,,,,,,,,,,,,,,,,,,,,BBBB,,,,,,,,',
                ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,G,,,,,,,,,,BBBB,,,,,,,,',
                ',,,o,,G,,,,,,,,,,,G,,,,,,,,,,,,,,,,,,,,,,,BBBB,,,,,,,,',
                ',,,,o,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,f,,,,BBBB,,,,,,,,',
                ',,,,,,,,,,,,,,w,,,,,,,,,,,,,,,,,,,,,,,G,,,,,,,,,,,,,,,',
                '::,,,,,,,,,,,,,,,,,,,,,,;;;I;;;;;,,,,,,,,,,,,,,,,,,,,,',
                '::::::::,,,,,,,,,,,,,,;;;;;;;;;;;;;,,,,,,,,,,,,G,,,,,,',
                '::::::::,,G,,,,,,,,,,;;I;;;;;;;;I;;;,,,,,,,,,,,,,,,,,,',
                ',o,,,,::,,,,,,,,,,,,;;;;;;;;;;;;;;;;;,,,,,,,,,,,,,,f,,',
                ',,,,,,::::::::,,,,,;;;;;;;;;;;;;;;;;;;,,,,G,,,,,,,,,,,',
                ',,,,,,:::::::::::::::;;;;;;cc;;;;;;;;;,,,G,,,,,,,w,,,,',
                ',,,,,,,,,,,,:::::::::;;;;;;cc;;;;;;;;;,,,,,,,,,,,,,,,,',
                ',,f,,,,,,,,,G,,,,,,;;;I;;;;;;;;;;I;;;;,,,,,,,,,,,,,,,,',
                ',,,,,,w,,,,,,,,,,,,,;;;;;;;;;;;;;;;;;,,,,,,,,,,,,,,,,:',
                ',,,,,,,,,,,,,,,,::::::;;;;;;;;;;;;;;,,,,,,,,,,,,,,,,,:',
                ',,,,,,,,,,,,,::::,,,,,;;;;;;I;;;;;;,,,,,,,,,::::::::::',
                ',,,XXXXXXXXX,:,,,,,,,,,,;;;;::;;;,,,,,,,,,,,::::::::::',
                ',,,XXXXXXXXX,,,,,,,,,,,,,,,,::::,,,,,,,,w,,,::,,,,,,,,',
                ',,,XXXXXXXXX,,,,f,,,,,,,,,,,::::,,,,::::::::::,,,,,,,,',
                ',,,XXXXXXXXX,,,,,,,,,,,,,,,,,,::::::::::::::::,,,,,Y,,',
                ',,,XXXXXXXXX,,,,,,,,,,,G,G,,,,:::::::,,,,,,G,,,,,,,,,,',
                ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,,',
                ',Y,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,o,',
                ',,,,,,,,oo,,,,,,,,,,o,,,,,,,o,,,,,,:::,,,,o,,,o,,,,,,,',
                '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~==~~~~~~~~~~~~~~~~~',
                '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~==~~~~~~~~~~~~~~~~~',
                ',,,,,,,,,,,,,,,,,Y,,,,,,,,,,,,,,,,,::,,,,,,,o,,,,,,,,,',
                ',,,,,Y,,,,,,o,,,,,,,,,,,,,,,,,o,,,,::,,,,,,,,,,,,,Y,,,'
            ],
            lights: [],
            spawns: {
                from_hrafnholm: { x: 35, y: 28, facing: 'up' },
                from_hrafnholm_2: { x: 36, y: 28, facing: 'up' },
                flight_bell: { x: 43, y: 6, facing: 'up' }
            },
            exits: [
                { id: 'silent_field_south', x: 35, y: 29, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_silent_field' },
                { id: 'silent_field_south_2', x: 36, y: 29, trigger: 'step', toMap: 'hrafnholm', toSpawn: 'from_silent_field_2' }
            ],
            encounters: [],
            interactables: [
                { id: 'silent_ring', kind: 'inspect', x: 28, y: 17, name: 'The memorial ring',
                    text: 'Six stones stood up in a ring by the survivors, the first spring after, each one dragged here from a different steading. There are no names on them. The names are on the boards at home, where the families could reach them.' },
                { id: 'silent_round_stone', kind: 'inspect', x: 28, y: 12, name: 'The round stone',
                    text: 'A flat round stone at the heart of the ring, cut with a wheel of eight spokes. Someone has dug round its edge with a bar, not long ago, and given up. The earth they turned is still dark.' },
                { id: 'silent_bell', kind: 'inspect', x: 43, y: 5, name: 'The field bell',
                    text: 'A bell under a little roof on a footing of stone, half the timbers fallen in. It was rung on the morning of the battle and has been rung once a year since, on the day. The rope is new.' },
                { id: 'silent_tent', kind: 'inspect', x: 7, y: 22, name: 'The field hospital',
                    text: 'A long tent, the canvas rotted to rags on its frame, a red mark faded to brown on the roof. Cots in a row inside, a table with bowls on it. Nobody has moved anything in twenty winters. Nobody has had the heart to.' },
                { id: 'silent_graves', kind: 'inspect', x: 23, y: 22, name: 'Graves',
                    text: 'Two small stones in the grass with a name on each, cut by somebody who was not a carver. These ones came home, as far as here. Most did not come home at all.' },
                { id: 'silent_disturbed', kind: 'inspect', x: 41, y: 12, name: 'Disturbed grave',
                    text: 'The marker has been pulled up and laid on its face, and the turf cut back in a square. Whoever dug here was looking for something, and stopped at the first wood they hit. This was done this winter.' },
                { id: 'silent_relic', kind: 'inspect', x: 40, y: 19, name: 'A shield and a wheel',
                    text: 'A round shield, its paint gone to grey, leaning on a cart wheel where somebody propped it. Every year the families set the things they find upright again. Nobody takes them away.' },
                { id: 'silent_banner', kind: 'inspect', x: 37, y: 5, name: 'A torn banner',
                    text: 'A spear stood up in the grass with a strip of red cloth on it, faded almost white. Not a war banner: a marker, so the family can find their place again next year.' },
                { id: 'silent_stream', kind: 'inspect', x: 22, y: 26, name: 'The stream',
                    text: 'A slow brown stream between stones. The old Crown\'s host came across it at dawn, the songs say, and the North stood in the grass on this side and waited for them.' }
            ],
            boundaries: [
                { id: 'silent_field_west_path', x: 0, y: 7, w: 1, h: 2, title: "The path to Hallvard's Barrow",
                    text: "The path goes west across the field toward a great mound on the skyline: Hallvard's Barrow. That way is not open yet. (Coming in a later part of Chapter Two.)" },
                { id: 'silent_field_east_path', x: 53, y: 15, w: 1, h: 4, title: 'The path to the uplands',
                    text: 'The path climbs east out of the field into the uplands, where the herds go in summer. That way is not open yet. (Coming in a later part of Chapter Two.)' }
            ]
        },

        // -----------------------------------------------------------------
        // Birkholt, after Tokelo's picture (2026-11-13): a farming hamlet of turf-roofed longhouses with smoking chimneys,
        // two barley fields in their fences, two sheep pens with shelters and troughs, two weaving sheds with looms and a
        // memorial cloth hung out, a rack of drying wool, two herb gardens, and three standing stones in the middle where
        // the paths meet. West across the mire from Járnmyr by the boardwalk. The cart track south is a boundary.
        birkholt: {
            zoneId: 'hrimvald_birkholt',
            name: 'Birkholt',
            scene: 'birkholt',                 // painted whole: ui/scene-hrimvald.js
            ambient: { tint: 'rgba(120, 100, 60, 0.06)', particles: { kind: 'snow', count: 6 },
                grade: { ambient: 0.95, exposure: 1.05, highlights: [0.05, 0.03, -0.02] } },
            legend: {
                ',': { name: 'meadow' }, ':': { name: 'path' }, 'F': { name: 'barley', solid: true }, 'j': { name: 'fence', solid: true }, 'h': { name: 'house', solid: true },
                'k': { name: 'sheep_shelter', solid: true }, 's': { name: 'sheep', solid: true }, 't': { name: 'trough', solid: true }, 'l': { name: 'loom_shed', solid: true },
                'r': { name: 'drying_rack', solid: true }, 'I': { name: 'standing_stone', solid: true }, 'o': { name: 'rock', solid: true }, 'n': { name: 'memorial_cloth', solid: true },
                'g': { name: 'herbs', solid: true }, 'b': { name: 'barrel', solid: true }, 'v': { name: 'cart', solid: true }, 'T': { name: 'birch', solid: true }
            },
            tiles: [
                ',,,,jFFFFFFFFFFFFj,,T,,,,,,,,,,,,,,,j,,,,,,,,,,,,,,j,T',
                ',T,,jFFFFFFFFFFFFj,,,,hhhhhhhhhh,:,,j,t,,,,,,,,kkkkj,,',
                ',,,,jFFFFFFFFFFFFjb,,,hhhhhhhhhh,:,,j,,s,,,,s,,kkkkj,,',
                ',,,,jFFFFFFFFFFFFjb,,,hhhhhhhhhh,:,,j,,,,,s,,,,kkkkj,,',
                ',,,,jFFFFFFFFFFFFjb,,,hhhhhhhhhh,:,,j,,,,,,,,,,,,,,j,,',
                ',,,,jFFFFFFFFFFFFj,,,,hhhhhhhhhh,T,,j,,,,,,,,,,,,,,j,,',
                ',,T,jjjjjjjjjjjjjj,o,,hhhhhhhhhh,:,,jjjjjjj,,jjjjjjj,,',
                'o,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,:,,,,,,,,,,,,,,,,,,,,',
                ',,,,,,,,,,,,,,,,,,,,:::::::::::::::::,,,,,,,,,,,,,,,T,',
                'hhhhhhhhh,,lllllll,,::::::::::::::::::::llllllll,,,,,,',
                'hhhhhhhhh,,lllllll,rrrr,,,,,,,,I,,,,::::llllllll,,,,,,',
                'hhhhhhhhh,,lllllll,rrrr,,,,,,I,,,I,,,,::llllllll,n,,,,',
                'hhhhhhhhh,,lllllll,rrrr,,,,,o,,,,,o,,,::llllllll,,,,,o',
                'hhhhhhhhh,,lllllll,,::,,,,,,,,,,,,,,,,::llllllll,,,,,,',
                ',,,,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,',
                ',T,o,,,,,,::::::::::::::::::,,,,,,,:::::,,,,,,::::::::',
                ',,,,,,,,,,::::::::::::::::::,,,,,,,:::::::::::::::::::',
                ',hhhhhhhh,,,,,,hhhhhhhhhh,::,jjjjjjjjj::::::::::,,,,,,',
                ',hhhhhhhh,rrr,,hhhhhhhhhh,::,jgggggggj::,,hhhhhhhhhh,,',
                ',hhhhhhhh,rrr,,hhhhhhhhhh,::,jgggggggj::,,hhhhhhhhhh,,',
                ',hhhhhhhh,,,,,,hhhhhhhhhh,::,jgggggggjb:,,hhhhhhhhhh,,',
                ',hhhhhhhh,,,,,,hhhhhhhhhh,::,jjjjjjjjj::,,hhhhhhhhhh,,',
                ',,,,,,,,,,,,,,,,,,,,,,,,,,::,,,,,,,,,,::,,hhhhhhhhhh,,',
                'T,,,,,,,,,,::::::::::::::::::::::,,,,,::,,,,,,,,,,,,,,',
                ',,,,,,,,,,::::::::::::::::::::::::::::::,,,,,,,,,,,,o,',
                ',,,jjjjjjj:::,jjjjjjjjjjjjjjjj,:::jjjj,,jjjjjjjjjjjj,,',
                ',,,jgggggj::,,jFFFFFFFFFFFFFFj,::,j,,,,,,,,,,,,kkkkj,,',
                ',,,jgggggj::,,jFFFFFFFFFFFFFFj,::,j,t,,,,s,,,,,kkkkj,,',
                ',,,jjjjjjj::::jFFFFFFFFFFFFFFj,::,j,,,,,,,,,,,,kkkkj,,',
                ',,,,,,,,,,::::jFFFFFFFFFFFFFFj,::,j,,,s,,,,,,,,,,,,jT,',
                'hhhhhhhhh,,,::jFFFFFFFFFFFFFFj,::,j,,,,,,,,s,,,,,,,j,,',
                'hhhhhhhhh,,,::jFFFFFFFFFFFFFFj,::,j,,s,,,,,,,,,,,,,j,,',
                'hhhhhhhhh,,,:Tjjjjjjjjjjjjjjjj,::,j,,,,,,,,,,,,,,,,j,,',
                'hhhhhhhhh,,,::,,,,,,,,,,,,,,,vv::,jjjjjjjjjjjjjjjjjj,,',
                'hhhhhhhhh,,,::,,,,,,,,o,,T,,,,,::,,,o,,,,,,,,,,,,,,,,T',
                ',,,,,,,,,,T,::,,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,,,,,,'
            ],
            lights: [],
            spawns: {
                from_jarnmyr: { x: 52, y: 15, facing: 'left' }
            },
            exits: [
                { id: 'birkholt_east_boardwalk', x: 53, y: 15, trigger: 'step', toMap: 'jarnmyr', toSpawn: 'from_birkholt' }
            ],
            encounters: [],
            interactables: [
                { id: 'birkholt_sigrid', kind: 'npc', npc: 'sigrid', x: 31, y: 12, name: 'Sigrid', sprite: 'widow' },
                { id: 'birkholt_hearth', kind: 'station', station: 'birkholt_hearth', verb: 'Cook at', x: 21, y: 7, name: 'Longhouse hearth', sprite: 'cookfire' },
                { id: 'birkholt_stones', kind: 'inspect', x: 31, y: 10, name: 'The standing stones',
                    text: 'Three stones where the paths meet, cut with knotwork and one name each: the three families who cleared the birch wood here. Every steading\'s board hangs in a longhouse, but the stones are where you swear.' },
                { id: 'birkholt_loom', kind: 'inspect', x: 14, y: 13, name: 'Weaving shed',
                    text: 'An upright loom under an open roof, the warp weighted with rings of clay. Half the cloth on it is everyday grey wool. The other half is memorial cloth: a name worked into every hand\'s breadth.' },
                { id: 'birkholt_cloth', kind: 'inspect', x: 49, y: 11, name: 'Memorial cloth',
                    text: 'A finished cloth hung out to air, white wool with a red star of eight points in the middle and names round the border. It will go on a bench in the longhouse, for somebody who has been missing twenty winters.' },
                { id: 'birkholt_barley', kind: 'inspect', x: 10, y: 6, name: 'Barley field',
                    text: 'Barley, the last strips not yet cut, gone pale gold. Birkholt brews it and bakes it and sends the rest to Járnmyr for iron. The field-board at the corner has a name crossed out and the next one cut under it.' },
                { id: 'birkholt_sheep', kind: 'inspect', x: 39, y: 2, name: 'Sheep',
                    text: 'Short-tailed sheep with long fleeces, grey and brown and cream, all of them looking at you. The wool for every cloth in Birkholt grows here.' },
                { id: 'birkholt_herbs', kind: 'inspect', x: 33, y: 21, name: 'Herb garden',
                    text: 'Lavender, chamomile, angelica and yarrow behind a wattle fence. The cures for Birkholt\'s coughs, and the bitter herbs for its grave-ale, grow in the same bed.' },
                { id: 'birkholt_longhouse', kind: 'inspect', x: 26, y: 6, name: 'The longhouse',
                    text: 'The biggest house in Birkholt, turf on the roof and smoke from the ridge. Inside, a bench runs the length of the hall with a cloth folded on every seat that nobody sits on.' },
                { id: 'birkholt_rack', kind: 'inspect', x: 20, y: 12, name: 'Drying rack',
                    text: 'Fleeces and fresh-dyed wool hung over poles to dry: madder red, birch-leaf yellow, and a great deal of undyed grey.' },
                { id: 'birkholt_lingonberries', kind: 'forage', forage: 'lingonberries', x: 2, y: 24, name: 'Lingonberries',
                    sprite: 'lingonberries', text: 'Lingonberries under the birches at the edge of the hamlet.' }
            ],
            boundaries: [
                { id: 'birkholt_south_track', x: 31, y: 35, w: 2, h: 1, title: 'The cart track south',
                    text: 'The cart track runs south out of Birkholt toward the coast. The rest of that road is not built yet. (Coming in a later part of Chapter Two.)' },
                { id: 'birkholt_southwest_track', x: 12, y: 35, w: 2, h: 1, title: 'The lane south-west',
                    text: 'A lane between the birches, south-west to the outlying steadings. That way is not open yet. (Coming in a later part of Chapter Two.)' }
            ]
        },

        // -----------------------------------------------------------------
        // Rúnadal, after Tokelo's picture (2026-11-13): a crossroads deep in a pine wood, three paths meeting at a ring of rune
        // stones (three tall, the rest small) round a flat stone table with offerings on a woven cloth; north-east of it a
        // lean-to of poles and turf with a bench, a fleece, herbs hung to dry, two stumps and a ring-fire. Yrsa Thornstaff's.
        // Up the north track from Járnmyr. The west and east paths are boundaries.
        runadal: {
            zoneId: 'hrimvald_runadal',
            name: 'Rúnadal',
            scene: 'runadal',                  // painted whole: ui/scene-hrimvald.js
            ambient: { tint: 'rgba(90, 120, 70, 0.06)', particles: { kind: 'snow', count: 4 },
                grade: { ambient: 0.92, exposure: 1.04, highlights: [0.06, 0.04, -0.02] } },
            legend: {
                ',': { name: 'moss' }, ':': { name: 'path' }, 'T': { name: 'pine', solid: true }, 'o': { name: 'boulder', solid: true },
                'R': { name: 'rune_stone', solid: true }, 'r': { name: 'ring_stone', solid: true }, 'A': { name: 'offering_table', solid: true },
                'L': { name: 'lean_to', solid: true }, 'F': { name: 'campfire', solid: true }, 'u': { name: 'stump', solid: true }
            },
            tiles: [
                'TTT,TT,TT,,,T,TT,T,T,TTTT,T,,,oT,T,T,oT,To,,TTTTTToTTT',
                'T,,,,,T,,TTTT,oT,TT,TTTTTT,TTTT,,TTTTT,TTToTTTTTTTTTTT',
                'TT,TTTT,,T,T,T,,,,,,TT,oTTT,TTTTTTTTTo,T,TT,,TTTTTT,TT',
                ',T,TT,,,TTTTTT,TTo,TT,TTTTT,,oTTT,TT,T,,ToTT,TTT,TT,o,',
                'o,TTTTT,TTTTTT,,T,T,T,TTT,o,T,,TTT,TLLLLLLLLLTTTTT,,,,',
                'ToTTT,,TT,,,,,oTTTTTT,,,,,TTTT,,TTo,LLLLLLLLL,,T,TT,,T',
                'o,,o,T,,TTT,,TT,,TTTTT,,,,,,,,,,,,,,LLLLLLLLL,,,T,,,,,',
                'T,,o,,TTTTTTTT,T,,,,,,,,,,,,,,,,,T,,LLLLLLLLL,,,T,,,TT',
                ',ToTTTTT,,TTTTTT,oT,,,,r,R,,,r,,,,,,,,,,,,,,,,,T,,,TTT',
                'TTTT,,,T,TTToT,T,,,,,,,,,,,,,,,,,,,u,,F,,,,,,,,TTTTTTT',
                'T,,TT,ToTTTT,T,To,,,,R,,,,,,,,,R,,,,,,,,,u,,,,,TTTTTTT',
                ',,T,T,,TTTT,,T,,,,,,,,,,,,,,,,,,,,,,,,:,,,,,,,T,,TT,TT',
                ',,,,,,,,,,,,,TTTT,,,,,,,,,,,,,,,,,,,,,:,,,,,,,,TTTTTT,',
                '::::::::::::,,,TT,r,,,,,,,,,,,,,,r,,,,:,TTTTT,T,,TTTTT',
                '::::::::::::,,ToT,,,,,,,,AAA,,,,,,,,,,:,o,,,,,,,,,,,,,',
                ',,,,,,,,,,::,,,TT,,,,,,,,AAA,,,,,::::::,T,::::::::::::',
                'T,T,,To,T,::,,,,,,,r,,,,,,::,,,,,r,,,,,,T,::::::::::::',
                ',ToTTTo,T,:::::::::,,,,,,,::,,,,,,,,,,,,,,::,,,,,,,,,:',
                'TTTTTT,TT,:::::::::,,,,,,,::,,,,,,::::::::::,T,oTT,T,,',
                'T,T,,TTTT,,,,,,,,::,T,,,,,::,,,,,,::::::::::,TTT,TT,T,',
                'TTooT,,TTTTT,oTT,::,,,,,,,::::::::::,,,,,,,,,TT,TTo,TT',
                ',T,TT,,TT,,T,,To,:::::::::::::::::::,TTTT,T,TT,T,T,,TT',
                ',,,T,oTT,TTT,TTT,:::::::::::,,,,,,,,,T,,,T,TTT,ToTT,T,',
                ',To,,TT,T,T,TT,T,,,,,,,,,::,,TTTTTTTTT,,TTT,TTT,T,T,,T',
                'TTToTTTTTT,TTToTTTTTTToT,::,oT,,T,TT,,,TTTTTT,,T,,TTTo',
                'TTTT,T,,TT,,TT,TTToTTTTT,::,TTTTT,TTT,,,,T,TTo,,,TTTT,',
                'TT,oTT,TTTTTToTT,oT,,,T,,::,T,TT,TTo,,,TTTTTTT,TTT,,T,',
                ',ToTTTTTTTTTTT,TT,TTTT,,,::,T,TTTT,oTo,T,o,,T,,,TTT,,,',
                ',T,,TTTT,,,T,,TTTT,TT,,T,::,,,,,T,TTTTTo,T,TTTTT,TTT,,',
                'oT,,,T,To,,T,T,TTToTTTTT,::,T,T,TTTTTTT,TTTTTT,TTTTTTT',
                'T,To,T,TTTTo,,,TT,T,T,TT,::,T,oT,,TT,,TTT,,TTT,TT,TTTT',
                ',,oT,,TT,,T,oToTT,,TTTTT,::,T,TTT,,ToT,,T,TToT,TTT,,,,',
                'TT,T,T,TT,,TTTTTTTT,T,,,,::,TTT,TT,TTTTTTTT,,,TTTTTT,T',
                'TT,,T,TT,TT,,TT,TT,TTTT,,::,T,,TTTTToTTTTTTToT,TT,T,TT',
                'TTTT,o,ToT,TTTT,T,TTTTTT,::,TT,,TT,T,TTTT,TTTT,TT,,,,o',
                'TTTTTTTTTo,ToTTTTTTTTTT,,::,,TT,,,,T,TTTTTTTT,T,,TTTT,'
            ],
            lights: [{ x: 38, y: 9, radius: 2.6, color: 'rgba(255, 150, 60, 0.28)' }],
            spawns: {
                from_jarnmyr: { x: 25, y: 34, facing: 'up' },
                from_jarnmyr_2: { x: 26, y: 34, facing: 'up' },
                flight_table: { x: 24, y: 17, facing: 'up' }
            },
            exits: [
                { id: 'runadal_south_track', x: 25, y: 35, trigger: 'step', toMap: 'jarnmyr', toSpawn: 'from_runadal' },
                { id: 'runadal_south_track_2', x: 26, y: 35, trigger: 'step', toMap: 'jarnmyr', toSpawn: 'from_runadal_2' }
            ],
            encounters: [],
            interactables: [
                { id: 'runadal_yrsa', kind: 'npc', npc: 'yrsa', x: 40, y: 9, name: 'Yrsa Thornstaff', sprite: 'seeress' },
                { id: 'runadal_table', kind: 'inspect', x: 26, y: 15, name: 'The offering table',
                    text: 'A flat stone on three smaller ones, a woven cloth over it, and on the cloth a round loaf, a bowl of milk and a cup. The loaf is fresh. People come a long way to leave bread here.' },
                { id: 'runadal_stone', kind: 'inspect', x: 25, y: 8, name: 'Rune stone',
                    text: 'The tallest stone, lichen on its shoulders and one rune cut deep in the middle, a branching mark like a tree or a hand. The smaller stones round the ring carry names, worn almost smooth. Nobody here can read them all any more.' },
                { id: 'runadal_leanto', kind: 'inspect', x: 40, y: 7, name: 'The lean-to',
                    text: 'Poles and a turf roof against a fallen trunk. A bench with a fleece on it, a basket, a staff, and bunches of herbs hung to dry from the rafter: mugwort, yarrow, juniper.' },
                { id: 'runadal_fire', kind: 'inspect', x: 38, y: 9, name: 'Ring-fire',
                    text: 'A fire in a ring of stones, burning low and clean. Whoever keeps it has kept it a long time.' },
                { id: 'runadal_juniper', kind: 'forage', forage: 'juniper', x: 12, y: 11, name: 'Juniper', sprite: 'juniper',
                    text: 'Juniper under the pines, the berries blue-black and bitter.' },
                { id: 'runadal_lingonberries', kind: 'forage', forage: 'lingonberries', x: 45, y: 14, name: 'Lingonberries', sprite: 'lingonberries',
                    text: 'Lingonberries in the moss beside the east path.' }
            ],
            boundaries: [
                { id: 'runadal_west_path', x: 0, y: 13, w: 1, h: 2, title: 'The west path',
                    text: 'The west path goes on under the pines toward the high fells. That way is not open yet. (Coming in a later part of Chapter Two.)' },
                { id: 'runadal_east_path', x: 53, y: 15, w: 1, h: 2, title: 'The east path',
                    text: 'The east path climbs out of the trees toward the windy heights. That way is not open yet. (Coming in a later part of Chapter Two.)' }
            ]
        },

        // -----------------------------------------------------------------
        // Bjarki's Barrow, inside the Járnmyr mound, after Tokelo's picture (2026-11-13): a narrow passage lined with grave
        // slabs opens into a great chamber walled with knotwork stones. Two fire-bowls burn on carved pillars, side recesses
        // hold urns, weapons, shields and stone coffins, and a stepped dais carries Bjarki the Grave-Bound's coffin with a
        // flame altar behind it. The altar and the two pillar fires are the burial anchors (CHAPTER_TWO_LORE 6.1).
        bjarki_barrow: {
            zoneId: 'hrimvald_bjarki_barrow',
            name: "Bjarki's Barrow",
            scene: 'bjarki_barrow',            // painted whole: ui/scene-hrimvald.js
            ambient: { tint: 'rgba(30, 20, 14, 0.25)', particles: { kind: 'dust', count: 10 },
                grade: { ambient: 0.62, exposure: 0.95, highlights: [0.08, 0.03, -0.04] } },
            legend: {
                '.': { name: 'flagstones' }, ':': { name: 'rubble' }, 'm': { name: 'barrow_mouth' }, 'd': { name: 'dais_steps' },
                '#': { name: 'knot_wall', solid: true }, 'S': { name: 'grave_slab', solid: true }, 'D': { name: 'dais', solid: true }, 'K': { name: 'stone_coffin', solid: true },
                'A': { name: 'flame_altar', solid: true }, 'P': { name: 'fire_pillar', solid: true }, 'b': { name: 'candle_stand', solid: true }, 'u': { name: 'urn', solid: true },
                'c': { name: 'grave_coffin', solid: true }, 'w': { name: 'grave_goods', solid: true }
            },
            tiles: [
                '################################',
                '################################',
                '#########......AA:.....#########',
                '#########....b:AA.b....#########',
                '#####....:.DDDDDDDDDD......#####',
                '#####......DDKKKKKKDD.....:#####',
                '#####..:...DDKKKKKKDD.....:#####',
                '##.u:..:...DDDDDDDDDD::.....u.##',
                '##u........DDddddddDD:........##',
                '##........:DDddddddDD......cc.##',
                '##.:.:........................##',
                '####........................####',
                '####.:PP................PP..####',
                '####.bPPb..............bPPb.####',
                '####.:......:..:....:......:####',
                '####......:.................####',
                '####..:.....................####',
                '##.........:..................##',
                '##www.......:.....:........www##',
                '##.....:..............:....:..##',
                '##..:.............:...:.......##',
                '##u...:......................u##',
                '##.......:.:..................##',
                '##.ccc.........:.:...:....ccc.##',
                '##.ccc............:.......ccc.##',
                '##......:.................::..##',
                '##:.........:.:.:...::........##',
                '##############....##############',
                '##############S.:.##############',
                '##############...S##############',
                '##############...S##############',
                '##############S...##############',
                '##############S...##############',
                '##############...S##############',
                '##############...S##############',
                '##############S...##############',
                '##############S..:##############',
                '##############.:..##############',
                '###############..###############',
                '###############m################'
            ],
            lights: [
                { x: 15.5, y: 2, radius: 3.4, color: 'rgba(255, 150, 60, 0.32)' }, { x: 6.5, y: 12, radius: 3.2, color: 'rgba(255, 150, 60, 0.3)' },
                { x: 24.5, y: 12, radius: 3.2, color: 'rgba(255, 150, 60, 0.3)' }
            ],
            spawns: {
                from_jarnmyr: { x: 15, y: 38, facing: 'up' }
            },
            exits: [
                { id: 'barrow_out', x: 15, y: 39, trigger: 'step', toMap: 'jarnmyr', toSpawn: 'from_barrow',
                    text: 'Grey daylight, the smell of the bog, and the hammers of Járnmyr going on as if nothing were under the hill at all.' }
            ],
            encounters: [
                { id: 'barrow_passage_dead', x: 15, y: 31, name: 'Barrow-dead', enemies: ['draugr', 'draugr'], trigger: 'contact', sprite: 'ghoul', detect: 96,
                    text: 'Two of the slabs have been pulled out of the passage wall, and what was laid behind them has stood up. Grave-cloth, iron rings, and eyes like cold coals.' },
                { id: 'barrow_west_dead', x: 9, y: 20, name: 'Barrow-dead', enemies: ['draugr', 'draugr'], trigger: 'contact', sprite: 'ghoul', detect: 110,
                    text: 'Bjarki\'s hearth-men, still in their mail, with the shields they were buried with. They turn to face you together, the way they were taught.' },
                { id: 'barrow_east_dead', x: 22, y: 20, name: 'Barrow-dead', enemies: ['draugr', 'draugr'], trigger: 'contact', sprite: 'ghoul', detect: 110,
                    text: 'Bjarki\'s hearth-men, still in their mail, with the shields they were buried with. They turn to face you together, the way they were taught.' },
                // Bjarki the Grave-Bound: one grave-ward at his side for every burial anchor still burning (C2-05).
                { id: 'barrow_bjarki_warded', x: 14, y: 10, name: 'Bjarki the Grave-Bound', enemies: ['bjarki_grave_bound', 'grave_ward', 'grave_ward', 'grave_ward'], trigger: 'contact', sprite: 'warden',
                    detect: 120, when: { notFlags: ['barrow_anchors_1', 'bjarki_laid'] }, text: BJARKI },
                { id: 'barrow_bjarki_two', x: 15, y: 10, name: 'Bjarki the Grave-Bound', enemies: ['bjarki_grave_bound', 'grave_ward', 'grave_ward'], trigger: 'contact', sprite: 'warden',
                    detect: 120, when: { flags: ['barrow_anchors_1'], notFlags: ['barrow_anchors_2', 'bjarki_laid'] }, text: BJARKI },
                { id: 'barrow_bjarki_one', x: 16, y: 10, name: 'Bjarki the Grave-Bound', enemies: ['bjarki_grave_bound', 'grave_ward'], trigger: 'contact', sprite: 'warden',
                    detect: 120, when: { flags: ['barrow_anchors_2'], notFlags: ['barrow_anchors_3', 'bjarki_laid'] }, text: BJARKI },
                { id: 'barrow_bjarki_bare', x: 17, y: 10, name: 'Bjarki the Grave-Bound', enemies: ['bjarki_grave_bound'], trigger: 'contact', sprite: 'warden',
                    detect: 120, when: { flags: ['barrow_anchors_3'], notFlags: ['bjarki_laid'] }, text: BJARKI }
            ],
            interactables: [
                { id: 'barrow_anchor_altar', kind: 'inspect', x: 15, y: 2, name: 'The flame altar',
                    text: 'A pillar of knotwork stone with a fire-bowl on top, burning on nothing. Bones are packed into the bowl under the flame: a hand, wrapped in a strip of red cloth.' },
                { id: 'barrow_anchor_west', kind: 'inspect', x: 6, y: 12, name: 'Pillar fire',
                    text: 'A carved pillar on a stepped base, and on it a bowl of fire that gives no smoke. Iron nails have been driven into the stone round its foot in a ring.' },
                { id: 'barrow_anchor_east', kind: 'inspect', x: 25, y: 12, name: 'Pillar fire',
                    text: 'A carved pillar on a stepped base, and on it a bowl of fire that gives no smoke. Iron nails have been driven into the stone round its foot in a ring.' },
                { id: 'barrow_coffin', kind: 'inspect', x: 15, y: 7, name: "Bjarki's coffin",
                    text: 'A coffin of one stone, its lid carved with a man in a helm holding a sword on his chest. The lid has been levered askew with a quarry bar. The bar is still in the gap.' },
                { id: 'barrow_slabs', kind: 'inspect', x: 14, y: 32, name: 'Grave slabs',
                    text: 'Upright slabs along the passage, each with a worn figure cut on it. Behind every one is a niche, and somebody has been opening them one at a time with wedges.' },
                { id: 'barrow_goods_west', kind: 'inspect', x: 3, y: 18, name: 'Grave goods',
                    text: 'Spears and a sword laid in the recess with a round shield, and bare marks in the dust where more were laid. Whatever was bronze or silver has gone. The iron they left.' },
                { id: 'barrow_goods_east', kind: 'inspect', x: 28, y: 18, name: 'Grave goods',
                    text: 'A bearded axe and a red-and-white shield against the wall, an empty bowl, a cloak-pin dropped and left. The diggers were in a hurry here.' },
                { id: 'barrow_coffins', kind: 'inspect', x: 4, y: 23, name: 'Stone coffin',
                    text: 'A lesser coffin of the household, its lid knocked aside and cracked across. Empty. A drag mark goes from it toward the dais.' },
                { id: 'barrow_urns', kind: 'inspect', x: 3, y: 7, name: 'Urns',
                    text: 'Clay urns of ash and bone, sealed with wax, and one of them broken open. Someone looked inside, found ash, and kicked it over.' }
            ],
            boundaries: []
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
