/* =========================================================================
 * Enso's Last Stand — WORLD DATA: Chapter One beyond the fog (CH1-03)
 * Design: docs/design/ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md (traversal map, segments B–E).
 * Pure data, merged into the Zone 1 world by src/world/zone1.js. Same format as zone1.js, plus:
 *   interactables kind 'npc'  { id, kind: 'npc', npc: '<story npc id>', x, y, name, sprite, when? }
 *                             E talks; the conversation lives in src/story/chapter1.js
 *                 kind 'station' { id, kind: 'station', station: '<story npc id>', verb?, ... }: a place you use
 *                             (the watermill, a garden bed); E opens its choices like a talk, with no face
 *   guardedBy (any object) an encounter id on the same map: until it's beaten, E only shows `guardedText`
 *   when      (any placed thing) a story condition: present only while it holds
 *   requires  (exits) a story condition; until it holds the way is shut and `lockedText` says why
 * Story conditions: { flags: [...], notFlags: [...], quests: { Q05: 'complete' | 'active+' } }.
 * Every required fight stands in a one-tile gap, so the route can't skip it (XP guarantee:
 * 135 quest XP + 115 gate XP + 40 for Q05's strongbox looters = 290 before the Warden; tests/32-chapter-one.test.js).
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
        shamefield_vale: { name: 'Shamefield', mapIds: ['shamefield', 'allotment', 'orchard', 'briarwell_cloister_court', 'kloster_inner', 'village_residential_lane'] },
        featherwatch_heights: { name: 'Featherwatch', mapIds: ['featherwatch', 'sanctuary', 'seal_chamber'] }
    };

    const maps = {
        // -----------------------------------------------------------------
        // Segment B: Beyond the Fog. Elian, the Ragpickers on the only bridge, the Root-Chewers in the carts.
        tollway: {
            zoneId: 'broken_tollway',
            name: 'The Broken Tollway',
            scene: 'tollway',                 // painted whole: ui/scene-ch1-wilds.js
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
                    text: 'Something bony is gnawing at the cart wheels in the only gap through the wreckage, a rust-furred rat at its heels. Ash is smeared round one wheel rim in a circle, left open at the top.' },
                // Q05 (Tokelo, 2026-11-02): the register is guarded. Four looters sit on the strongbox, and the box
                // won't open (guardedBy) until they are beaten, so the player has to fight for it.
                { id: 'tollway_strongbox_looters', x: 15, y: 16, name: 'Strongbox Looters', enemies: ['weak_goblin', 'weak_goblin', 'weak_goblin', 'rust_rat'], trigger: 'contact', sprite: 'goblins',
                    when: { quests: { Q05: 'active' } },
                    text: 'Three goblins have dragged a strongbox out from under the wreck and are taking turns hitting the lock with a rock. A rust-furred rat sits on the lid like it owns it. They have not noticed you. They will.' }
            ],
            interactables: [
                { id: 'tollway_elian', kind: 'npc', npc: 'elian', x: 12, y: 6, name: 'Elian', sprite: 'traveller', when: { notFlags: ['elian_in_village'] } },
                { id: 'tollway_warning_post', kind: 'inspect', x: 13, y: 4, name: 'Warning post',
                    text: 'A post painted with the heroes\' emblem: a sun breaking a crown. Under it, newer paint: THE NORTH ROOST IS SEALED. TRAVELLERS KEEP TO THE ROAD.' },
                { id: 'tollway_goods', kind: 'inspect', x: 3, y: 5, name: 'Scattered goods',
                    text: 'Bolts of cloth, a cracked jar of honey, a child\'s wooden horse. Whoever owned them left in a hurry, or didn\'t leave at all.' },
                { id: 'tollway_booth', kind: 'inspect', x: 4, y: 3, name: 'Toll booth',
                    text: 'The toll booth\'s shutter hangs open. A ledger shelf inside is empty except for a ring of dust where a book once sat.' },
                { id: 'tollway_chanterelles', kind: 'forage', forage: 'chanterelles', x: 18, y: 15, name: 'Chanterelles', sprite: 'mushrooms',
                    text: 'Chanterelles pushing up between the old toll stones.' },
                { id: 'tollway_herbs', kind: 'forage', forage: 'wild_herbs', x: 3, y: 17, name: 'Wild herbs', sprite: 'herbs',
                    text: 'Wild thyme in the cracks of the road.' },
                { id: 'tollway_register', kind: 'inspect', x: 16, y: 16, name: 'Strongbox', sprite: 'strongbox', when: { quests: { Q05: 'active' } },
                    guardedBy: 'tollway_strongbox_looters',
                    guardedText: 'The looters are crowded round the strongbox. You won\'t get the lid open with them on top of it.',
                    text: 'A strongbox wedged under a broken axle, its lock smashed and its coins long gone. Nobody wanted the heavy book inside: the tollway register.' },
                { id: 'tollway_cart', kind: 'inspect', x: 4, y: 12, name: 'Wrecked cart',
                    text: 'The cart was pushed over on purpose and chained to the others: a barricade, once. Whatever it was meant to keep out got in anyway.' },
                // Secret (master brief §8): the old crown's supply cache under the embankment, and Corvin's invoice.
                { id: 'tollway_quartermaster_marks', kind: 'inspect', x: 16, y: 12, name: 'Old wagon',
                    text: 'This wreck is older than the barricade. Burnt into its tailboard: the old crown\'s quartermaster mark. Chalk tallies lead from it along the embankment, toward the east trees.' },
                { id: 'tollway_supply_cache', kind: 'inspect', x: 19, y: 14, name: 'Buried supply box', sprite: 'crate', when: { flags: ['quartermaster_marks_read'] },
                    text: 'A crown supply box, half buried under the embankment. Under the oilcloth, a fresh invoice: FORTY CHAINS. TWENTY BLANKETS. ONE CART. TO THE OLD CAUSEWAY. C. SERE, QUARTERMASTER. Somebody is still drawing on the old crown\'s stores.' }
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
                '~~~,,,,,,,+C++++b++++++mmm+sss,c',
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
                { x: 12, y: 6, radius: 1.3, color: 'rgba(255, 170, 80, 0.22)' }, { x: 7, y: 7, radius: 1.2, color: 'rgba(255, 170, 80, 0.2)' },
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
                    lockedText: 'The orchard gate is chained shut. A painted board on it reads: CLOSED BY ORDER OF THE WATCH. ASK THE WATCH CAPTAIN. Under it, in smaller letters: HE IS PROBABLY ASLEEP.' },
                { id: 'shamefield_west', x: 0, y: 18, trigger: 'step', toMap: 'allotment', toSpawn: 'from_village' },
                { id: 'shamefield_cloister', x: 31, y: 9, trigger: 'step', toMap: 'briarwell_cloister_court', toSpawn: 'from_village',
                    text: 'The lane climbs past the last houses to the Kloster gate: two towers, a cross, and beyond them a bell and the warm, sour smell of malt.' },
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
                // C1-N02 (Broken Crown rework): the Broken Oath courier, once Elian has pointed him out.
                { id: 'village_oath_courier', kind: 'npc', npc: 'oath_courier', x: 24, y: 5, name: 'Man in a grey cloak', sprite: 'oath_courier',
                    when: { flags: ['oath_courier_seen'], notFlags: ['oath_orders_taken', 'north_gate_open'] } },
                { id: 'village_notice_board', kind: 'inspect', x: 21, y: 6, name: 'Notice board',
                    text: 'FESTIVAL OF THE SUN: the heroes\' victory, one year on! Below the bunting, two handwritten requests: "Wolf on the homestead road. Someone see to it." and "Herbs wanted from the north orchard. Ask Iona."' },
                { id: 'village_well', kind: 'inspect', x: 26, y: 12, name: 'Village well',
                    text: 'The well\'s stones are carved with names: everyone who helped rebuild the bridge last spring. Someone has chalked SHAME ON SHANE across the bucket.' },
                { id: 'village_fountain', kind: 'inspect', x: 24, y: 13, name: 'Market fountain',
                    text: 'Three stone basins, one above the other, splashing into each other. Names are chiselled round the rim: the families who paid to bring the Kloster spring down to the square. The well is for drawing water; the fountain is for meeting people.' },
                { id: 'village_cloister_sign', kind: 'inspect', x: 30, y: 10, name: 'Signpost',
                    text: 'East, uphill: BRIARWELL KLOSTER. Someone has added in chalk: AND BEER.' },
                { id: 'village_memorial', kind: 'inspect', x: 28, y: 13, name: 'Memorial stone',
                    text: 'FOR THOSE TAKEN UNDER THE OLD CROWN. Fresh flowers. No names: the list was too long to carve.' },
                // Get to know the locals (Tokelo, 2026-11-02): the corners of the village nothing used before.
                // The mill falls (west bank, reached by the lane behind the slate house):
                { id: 'village_mill_bottles', kind: 'inspect', x: 2, y: 4, name: 'Empty bottles', sprite: 'bottle',
                    text: 'A heap of empty bottles in the spray of the falls, every one stamped BRIARWELL PALE. Somebody drank here, often, and alone.' },
                // The whole lower mill answers E (Tokelo, 2026-11-04: "I dont see any interactable thing"): before, one
                // cell on the back wall over the river did. Face the front door, either side, and you go in.
                { id: 'village_watermill', kind: 'station', station: 'watermill', x: 4, y: 10, w: 4, h: 4, name: 'Old watermill', verb: 'Go into' },
                { id: 'village_wild_hops', kind: 'pickup', x: 3, y: 11, item: 'Wild Hops', name: 'Wild hops', sprite: 'bundle', when: { quests: { SF1: 'active' } },
                    text: 'Wild hops climb the old mill-race fence, green and sticky and nothing like Fenric\'s brown ones.' },
                // After Bread and Beer the hops keep growing on the falls bank (the kitchen: Fenric brews with you).
                { id: 'village_hops_vine', kind: 'forage', forage: 'wild_hops', x: 2, y: 5, name: 'Wild hops', sprite: 'hops', when: { quests: { SF1: 'complete' } },
                    text: 'The hops have climbed back up the mill-race fence.' },
                { id: 'village_chanterelles', kind: 'forage', forage: 'chanterelles', x: 5, y: 14, name: 'Chanterelles', sprite: 'mushrooms',
                    text: 'Chanterelles under the bridge willows.' },
                // The rye field behind the square:
                { id: 'village_rye', kind: 'pickup', x: 22, y: 17, item: 'Rye Sheaf', name: 'Rye sheaves', sprite: 'bundle', when: { quests: { SF1: 'active' } },
                    text: 'Cut rye leans against the field fence in sheaves, waiting for someone with the patience to take it to the mill.' },
                // C1-N03, the Festival of the Sun: the public hearth stays after the festival (master brief §4.1, step 5).
                { id: 'square_hearth', kind: 'station', station: 'square_hearth', verb: 'Cook at', x: 13, y: 10, name: 'Festival hearth', sprite: 'cookfire',
                    when: { any: [{ quests: { 'C1-N03': 'active+' } }, { flags: ['north_gate_open'] }] } },
                { id: 'village_festival_cask', kind: 'inspect', x: 14, y: 8, name: 'Festival cask', sprite: 'cask',
                    when: { quests: { 'C1-N03': 'active' }, notFlags: ['raid_started'] },
                    text: 'Fenric\'s cask, rolled down from the Kloster with a sun painted on the head. Sun banners on the raven tree, bread on every trestle, and somebody tuning a fiddle badly.' },
                { id: 'village_wrecked_stall', kind: 'inspect', x: 22, y: 9, name: 'Wrecked stall', sprite: 'rubble',
                    when: { flags: ['raid_over', 'festival_pursue'], notFlags: ['warden_dead'] },
                    text: 'Greta\'s festival stall, kicked over in the raid. The sausages are gone. So, Greta says loudly, is any reason to trust you.' },
                // Secret (master brief §8): the miller's cellar. Not every haunting is the old crown's doing.
                { id: 'village_miller_note', kind: 'inspect', x: 9, y: 12, name: 'Note in the door frame',
                    text: 'A note folded into the mill\'s door frame, in careful letters: "Hob. I put the good flour by under the west boards, like every festival. You never came home to bake it. I can\'t go in there. L."' },
                { id: 'village_mill_recess', kind: 'inspect', x: 3, y: 7, name: 'Loose board', sprite: 'sacks', when: { flags: ['miller_note_read'] },
                    text: 'Behind a loose board in the mill\'s west wall: a crock of fine flour sealed with wax, and a purse with a wedding ring in it. You take the flour and the coins, and leave the ring on the doorstep where L. will find it.' },
                // The church:
                { id: 'village_church_door', kind: 'station', station: 'church_door', x: 28, y: 7, name: 'Church door', verb: 'Inspect' },
                // Greta's runaway pigs (SF3): only out while she's missing them.
                { id: 'stray_pig_bridge', kind: 'inspect', x: 6, y: 16, name: 'Pig', sprite: 'pig', when: { quests: { SF3: 'active' }, notFlags: ['pig_bridge_home'] },
                    text: 'A muddy pig is rooting by the plank bridge. It looks at you as if you owe it money.' },
                { id: 'stray_pig_houses', kind: 'inspect', x: 12, y: 20, name: 'Pig', sprite: 'pig', when: { quests: { SF3: 'active' }, notFlags: ['pig_houses_home'] },
                    text: 'A pig has found somebody\'s cabbages behind the south houses, and is making the most of it.' },
                { id: 'stray_pig_church', kind: 'inspect', x: 25, y: 4, name: 'Bishop', sprite: 'pig', when: { quests: { SF3: 'active' }, notFlags: ['pig_church_home'] },
                    text: 'An enormous pig sits by the church wall with the dignity of a bishop. This must be Bishop.' }
            ],
            encounters: [
                // C1-N03, the raid on the Festival of the Sun: the robes at the stalls, or the thief at the chained gate.
                { id: 'festival_raiders', x: 26, y: 10, name: 'Broken Oath Raiders', enemies: ['cult_zealot', 'cult_acolyte'], trigger: 'contact', sprite: 'cultists',
                    when: { quests: { 'C1-N03': 'active' }, flags: ['festival_protect'] },
                    text: 'A zealot in ash-red is dragging a trestle across the square to pin a family against the fountain. An acolyte keeps the crowd back with a hexed blade.' },
                { id: 'festival_thief', x: 22, y: 4, name: 'Broken Oath Thief', enemies: ['cult_acolyte', 'cult_zealot'], trigger: 'contact', sprite: 'cultists',
                    when: { quests: { 'C1-N03': 'active' }, flags: ['festival_pursue'] },
                    text: 'The thief has reached the north stair and found the orchard gate chained shut above it. A zealot turns to cover him, flail already swinging.' },
                // Singing at the Mill (SF4): Old Hob and his drinking partner, under the falls, once you've heard them.
                { id: 'mill_shade', x: 6, y: 4, name: 'Singing Shades', enemies: ['drunken_shade', 'drunken_shade'], trigger: 'contact', sprite: 'shade',
                    when: { quests: { SF4: 'active' }, flags: ['sf4_heard'] },
                    text: 'Two pale shapes sway in the spray of the falls, arm in arm, singing a festival song with most of the words wrong. One of them wears a miller\'s apron.' }
            ]
        },

        // -----------------------------------------------------------------
        // Briarwell Kloster (map id kept from the Shamefield expansion so saves and quests still find it). Tokelo
        // meant "Kloster", a German monastery, not a cloister walk: rebuilt 2026-11-03 after Tokelo's reference
        // ("Kloster Sankt Alban") and painted whole by ui/scene-kloster.js. The walled grounds hold the abbey church
        // and its bell tower, the cloister garth, the monks' cells, the refectory, the abbot's house, the cemetery,
        // the herb garden and hops, the brewery, the storehouse and the gatehouse down to the village. The "get to
        // know the locals" side quests (L01, SF1-SF5) still use Fenric, Merrow and the garden bed here.
        briarwell_cloister_court: {
            zoneId: 'shamefield_vale',
            name: 'Briarwell Kloster',
            scene: 'kloster',
            ambient: { darkness: 0.08, tint: 'rgba(90, 70, 50, 0.1)', particles: { kind: 'smoke', count: 6 },
                grade: { ambient: 0.8, exposure: 1.04, highlights: [0.08, 0.04, -0.03] } },
            legend: {
                ',': { name: 'grass' }, ':': { name: 'dirt_path' }, '+': { name: 'flagstones' }, 'g': { name: 'gate' },
                '#': { name: 'kloster_wall', solid: true }, 'O': { name: 'wall_tower', solid: true }, 'H': { name: 'gatehouse', solid: true },
                'A': { name: 'abbey_church', solid: true }, 'K': { name: 'bell_tower', solid: true }, 'Z': { name: 'monks_cells', solid: true },
                'F': { name: 'refectory', solid: true }, 'P': { name: 'abbots_house', solid: true }, 'V': { name: 'brewery', solid: true },
                'L': { name: 'storehouse', solid: true }, 'a': { name: 'arcade', solid: true }, 'h': { name: 'hedge_bed', solid: true },
                'i': { name: 'cypress', solid: true }, 'U': { name: 'cloister_fountain', solid: true }, 'q': { name: 'herb_bed', solid: true },
                'r': { name: 'hop_trellis', solid: true }, 'e': { name: 'grave', solid: true }, 'X': { name: 'grave_cross', solid: true },
                'w': { name: 'low_wall', solid: true }, 'T': { name: 'tree', solid: true }, 'Y': { name: 'dead_tree', solid: true },
                'b': { name: 'barrel', solid: true }, 'x': { name: 'crate', solid: true }, 'C': { name: 'cart', solid: true },
                'W': { name: 'woodpile', solid: true }, 'l': { name: 'lantern', solid: true }, 'j': { name: 'crops', solid: true },
                's': { name: 'scarecrow', solid: true }, 'f': { name: 'fence', solid: true }, 'n': { name: 'bench', solid: true }
            },
            tiles: [
                'TTTTT,TTT,TTTTTTTTTTTTTTTT,TTTTT',
                'TO#####KKK#AAAAAAAAAA#########OT',
                'T#,,,T,KKK:AAAAAAAAAA,w,,,,,,,#T',
                'T#,T,,,KKK:AAAAAAAAAA,we,e,X,e#T',
                'T#,,,,,KKK:AAAAAAAAAA,w,,,e,,,#T',
                'T#T,,T,KKK:AAAAAAAAAA,wee,,,eY#T',
                ',#,Y,,,KKK:AAAAAAAAAA,wwww:www#T',
                'T#:::::::::AAAAAAAAAA,:,,,,,,,#T',
                'T#:ZZZZZ,a++l++++++l+a:qq:qq:r#,',
                'T#:ZZZZZ,a+++++++++++a:qq:qq:r#T',
                'T#:ZZZZZ,a+hhh+++hhh+a:qq:qq:r#T',
                'TO:ZZZZZ,a+hhhi+ihhh+a:,,:qq:rOT',
                'T#:ZZZZZ,a+++++U+++++a::::::::#T',
                ',#:ZZZZZ,a+hhhi+ihhh+a:VVVVVVV#T',
                'T#:ZZZZZ,a+hhh+++hhh+a:VVVVVVV#T',
                'T#:ZZZZZ,a+++++++++++a:VVVVVVV#,',
                'T#:,,,T,,aaaaa+++aaaaa:bb,,,Cx#T',
                ',#:Y,,,,FFFFFF+++PPPPP:,,,,,,,#T',
                'T#:,,Y,,FFFFFF+++PPPPP:bLLLL,,#T',
                'T#:,,,,,FFFFFF+++PPPPP:xLLLLWW#T',
                'T#:,,,n,,,,n,,+++:::::::::::::#T',
                'TO###########HHHgHHH##########OT',
                'Tfjjsjjjf,,C,,l:::l,,,T,,,,,T,,,',
                ',fjjjjjjf,T,,T,,:,,,T,,,,T,,,,,T'
            ],
            // Warm light from the windows, the rose window and the brewing fire (the torches light themselves).
            lights: [
                { x: 15, y: 5, radius: 2, color: 'rgba(255, 150, 60, 0.2)' }, { x: 26, y: 15, radius: 1.6, color: 'rgba(255, 150, 60, 0.24)' },
                { x: 10, y: 18, radius: 1.4, color: 'rgba(255, 170, 80, 0.2)' }, { x: 19, y: 18, radius: 1.2, color: 'rgba(255, 170, 80, 0.2)' },
                { x: 5, y: 13, radius: 1.3, color: 'rgba(255, 170, 80, 0.2)' }
            ],
            spawns: { from_village: { x: 16, y: 22, facing: 'up' }, from_church: { x: 15, y: 8, facing: 'down' } },
            exits: [
                { id: 'cloister_west', x: 16, y: 23, trigger: 'step', toMap: 'shamefield', toSpawn: 'from_cloister' },
                // The abbey church's great door, under the rose window (Tokelo, 2026-11-04: the interior reference is the
                // inside of the church). E on the door goes in: map kloster_inner.
                { id: 'kloster_church_door', x: 15, y: 7, trigger: 'interact', prompt: 'Enter the abbey church', toMap: 'kloster_inner', toSpawn: 'from_garth',
                    text: 'The great door swings open under the rose window. Inside it is cool and quiet, and it smells of candle wax, old books and malt.' }
            ],
            interactables: [
                { id: 'cloister_fenric', kind: 'npc', npc: 'fenric', x: 26, y: 16, name: 'Brother Fenric', sprite: 'monk' },
                { id: 'cloister_merrow', kind: 'npc', npc: 'merrow', x: 26, y: 20, name: 'Sister Merrow', sprite: 'steward' },
                { id: 'cloister_charter', kind: 'inspect', x: 19, y: 19, name: 'Kloster charter',
                    text: 'A board behind glass by the abbot\'s door, the ink brown with age: the Kloster may brew, bake and keep a granary "for the living, and against the winter". Older than the old crown. Nobody tore it down, so nobody had to put it back up.' },
                { id: 'cloister_casks', kind: 'inspect', x: 24, y: 16, name: 'Casks',
                    text: 'Chalk on every cask: BRIARWELL PALE, a date, and a small cross for each time the brewer tasted it. Some have a great many crosses.' },
                { id: 'cloister_granary', kind: 'inspect', x: 25, y: 19, name: 'Granary sacks',
                    text: 'Inside the storehouse door: barley for the brewery, rye for the ovens, and a row set apart, tied with red cord: the reserve. A slate says DO NOT TOUCH in two different hands.' },
                { id: 'cloister_cistern', kind: 'inspect', x: 15, y: 12, name: 'Fountain',
                    text: 'The spring comes up cold in the middle of the cloister garth, under a little stone cross. From here it runs to the brewery, to the gardens, and down the hill to the square. A cup on a chain. The water tastes of stone.' },
                { id: 'cloister_bell', kind: 'inspect', x: 8, y: 6, name: 'Bell tower',
                    text: 'The bell rope hangs inside the door, worn smooth. It rings for dawn, for meals, and once, a year ago, for an hour without stopping.' },
                { id: 'cloister_hops', kind: 'inspect', x: 29, y: 10, name: 'Hop poles',
                    text: 'Green cones hang in rows, sticky and bitter-smelling. A few leaves at the end have gone brown at the edges.' },
                { id: 'kloster_church', kind: 'inspect', x: 13, y: 7, name: 'Abbey church',
                    text: 'The great door stands under the rose window. Inside it is cool and dim, and smells of candle smoke and old stone. Someone has left a sprig of hops on the altar.' },
                { id: 'kloster_cemetery', kind: 'inspect', x: 27, y: 3, name: 'Cemetery cross',
                    text: 'The brothers and sisters of Briarwell lie here under plain stones, and a good many villagers with them. Fresh candles burn on the newest graves.' },
                { id: 'kloster_refectory', kind: 'inspect', x: 10, y: 19, name: 'Refectory',
                    text: 'Through the tall windows: long tables, a reading desk and a kitchen hatch. It smells of rye bread and barley soup. Nobody talks while the reader reads.' },
                { id: 'kloster_cells', kind: 'inspect', x: 5, y: 15, name: 'Monks\' cells',
                    text: 'A row of small doors, one for each brother and sister. Each cell has a bed, a candle and a window onto the garth.' },
                // Bread and Beer (SF1): the bed Sister Merrow lends you, at the end of the herb garden. Planting, tending and harvesting happen here.
                { id: 'cloister_garden_bed', kind: 'station', station: 'briarwell_bed', x: 23, y: 11, name: 'Garden bed', sprite: 'garden_bed', verb: 'Tend' }
            ],
            encounters: [
                // The Brown Hops (SF2): what's been eating Fenric's roots and Merrow's sacks.
                { id: 'cloister_rat_nest', x: 28, y: 17, name: 'Granary Rats', enemies: ['rust_rat', 'rust_rat', 'rust_rat'], trigger: 'contact', sprite: 'rats',
                    when: { quests: { SF2: 'active' }, flags: ['sf2_tracks'] },
                    text: 'Behind the storehouse, by the woodpile, three fat rust-red rats sit on a nest of shredded sacking and hop roots. They do not look sorry.' }
            ]
        },

        // -----------------------------------------------------------------
        // Inside the abbey church (Tokelo's reference, 2026-11-04: "Pixel-Art Monastery Cloister Map"), entered by the
        // church's great door from the garth outside; the outside Kloster stays as it is. Painted whole by ui/scene-kloster-inner.js.
        // North: the abbey chapel (stained glass, altar, pews, robed saints in niches). West: the library with its
        // armillary sphere, the study, the infirmary and a herb garden. East: the refectory, the brewery with its copper
        // vats, the cellar and the dormitory cells. Two corridors run down either side. In the middle the cloister
        // court: four flower beds with cypresses and benches round the fountain of the robed statue, which wakes as the
        // Fallen Seraph if you stare at it for two minutes (gazeRules in src/data.js). South: the entrance hall.
        kloster_inner: {
            zoneId: 'shamefield_vale',
            name: 'Briarwell Kloster, abbey church',
            scene: 'kloster_inner',
            ambient: { darkness: 0.22, tint: 'rgba(80, 55, 30, 0.14)', particles: { kind: 'dust', count: 10 },
                grade: { ambient: 0.74, exposure: 1.06, highlights: [0.1, 0.05, -0.04] } },
            legend: {
                '#': { name: 'klausur_wall', solid: true }, '.': { name: 'stone_floor' }, '=': { name: 'red_carpet' }, ',': { name: 'court_paving' },
                's': { name: 'stairs' }, 'B': { name: 'bookshelf', solid: true }, 'k': { name: 'desk', solid: true }, 'O': { name: 'armillary', solid: true },
                'p': { name: 'pew', solid: true }, 'A': { name: 'altar', solid: true }, 'S': { name: 'saint_statue', solid: true }, 'l': { name: 'candelabra', solid: true },
                'T': { name: 'long_table', solid: true }, 'F': { name: 'hearth', solid: true }, 'V': { name: 'copper_vat', solid: true }, 'b': { name: 'barrel', solid: true },
                'R': { name: 'barrel_rack', solid: true }, 'D': { name: 'cell_bed', solid: true }, 'h': { name: 'planter', solid: true }, 'x': { name: 'brazier', solid: true },
                'a': { name: 'court_pillar', solid: true }, 'g': { name: 'flower_bed', solid: true }, 'i': { name: 'cypress', solid: true }, 'n': { name: 'bench', solid: true },
                'U': { name: 'seraph_fountain', solid: true }
            },
            tiles: [
                '#######################################',
                '#BBBBB.BBB#.#S.l..lAl..l.S#.#l.......F#',
                '#.........#.#......=......#.#.TTT.TTT.#',
                '#.k...O.......pppp.=.pppp.............#',
                '#.kk......#.#.pppp.=.pppp.#.#.TTT.TTT.#',
                '#.........#.#......=......#.#.........#',
                '###########.#######=#######.###########',
                '#BBB..BBB.#.#a.a.a.=.a.a.a#.#.VV..VV.b#',
                '#.........#.#,,,,,,,,,,,,,#.#.VV..VV.b#',
                '#.kk..kk....#,iggg,,,gggi,#...........#',
                '#.........#.#,ggng,,,gngg,#.#bb.....bb#',
                '###########.#,,,,,UUU,,,,,#.###########',
                '#D..BBB...#..,,,,,UUU,,,,,..#RRR.RRR.R#',
                '#D........#.#,iggg,,,gggi,#.#.........#',
                '#.....kk....#,ggng,,,gngg,#...RRR.RRR.#',
                '#.........#.#,,,,,,,,,,,,,#.#.........#',
                '###########.#,,,,,,,,,,,,,#.###########',
                '#hhh.hhh..#.#######.#######.#D.D.D.D.l#',
                '#.........#.#.............#.#D.D.D.D..#',
                '#hhh.hhhh.............................#',
                '#.........#.#....S...S....#.#.........#',
                '#hhhh.hhh.#.#.....x.x.....#.#.........#',
                '###################s###################'
            ],
            lights: [
                { x: 19, y: 1, radius: 2.6, color: 'rgba(255, 170, 80, 0.26)' }, { x: 6, y: 3, radius: 2, color: 'rgba(255, 170, 80, 0.2)' },
                { x: 33, y: 3, radius: 2.4, color: 'rgba(255, 160, 70, 0.24)' }, { x: 37, y: 1, radius: 1.6, color: 'rgba(255, 120, 40, 0.3)' },
                { x: 33, y: 8, radius: 2, color: 'rgba(255, 150, 60, 0.2)' }, { x: 33, y: 13, radius: 1.8, color: 'rgba(255, 160, 70, 0.16)' },
                { x: 33, y: 19, radius: 2, color: 'rgba(255, 170, 80, 0.18)' }, { x: 5, y: 9, radius: 1.8, color: 'rgba(255, 170, 80, 0.18)' },
                { x: 5, y: 13, radius: 1.8, color: 'rgba(255, 170, 80, 0.16)' }, { x: 19, y: 20, radius: 2.2, color: 'rgba(255, 150, 60, 0.26)' },
                { x: 19, y: 12, radius: 2.4, color: 'rgba(255, 220, 150, 0.16)' }
            ],
            spawns: { from_garth: { x: 19, y: 21, facing: 'up' } },
            exits: [
                { id: 'kloster_inner_out', x: 19, y: 22, trigger: 'step', toMap: 'briarwell_cloister_court', toSpawn: 'from_church' }
            ],
            // The Trial of the Live Coal (quest QS1, Fallen Seraphim): heaven's altar-warden waits before the fountain.
            encounters: [
                { id: 'kloster_trial', x: 19, y: 15, name: 'Aurevain, Warden of the Altar', enemies: ['heaven_doorwarden'], trigger: 'contact', sprite: 'warden',
                    when: { quests: { QS1: 'active' } },
                    text: 'The courtyard goes white. Something in gilded plate stands between you and the fountain, four wings folded, a spear of light across its knees. "Give it back," it says. "It was never yours to carry."' }
            ],
            interactables: [
                // The robed statue on the fountain: a station, so E always gets an answer; staring wakes it (gazeRules).
                { id: 'kloster_seraph_statue', kind: 'station', station: 'seraph_statue', x: 18, y: 11, w: 3, h: 2, name: 'Robed statue', verb: 'Look at' },
                { id: 'kloster_inner_altar', kind: 'inspect', x: 19, y: 1, name: 'Altar',
                    text: 'White linen, a golden cross and seven candles. Above it the three windows throw red and blue light across the pews. On the altar step someone has carved, very small: HE FELL FOR US.' },
                { id: 'kloster_inner_saints', kind: 'inspect', x: 13, y: 1, name: 'Saint in a niche',
                    text: 'A hooded saint in a niche, hands folded like the statue in the courtyard. Its face is worn smooth where people touch it for luck.' },
                { id: 'kloster_inner_globe', kind: 'inspect', x: 6, y: 3, name: 'Armillary sphere',
                    text: 'Brass rings for the sun, the moon and the wandering stars, on a star-patterned rug. One ring has been bent back by hand, as if someone wanted a star to go where it was not meant to.' },
                { id: 'kloster_inner_books', kind: 'inspect', x: 2, y: 7, name: 'Study shelves',
                    text: 'Psalters, herbals and brewing ledgers. One thin book is chained to the shelf: "On the Six-Winged Ones, and Why They Are Not Spoken Of". Most of its pages are cut out.' },
                { id: 'kloster_inner_infirmary', kind: 'inspect', x: 5, y: 12, name: 'Apothecary shelves',
                    text: 'Jars of comfrey, yarrow, willow bark and something labelled only FOR THE ABBOT. A bed by the wall, made up tight.' },
                { id: 'kloster_inner_herbs', kind: 'inspect', x: 1, y: 17, name: 'Herb planters',
                    text: 'Lavender, sage and rue in stone troughs under the windows, and the sour green smell of hops drying on strings.' },
                { id: 'kloster_inner_refectory', kind: 'inspect', x: 30, y: 2, name: 'Refectory table',
                    text: 'Long tables laid for the evening meal: bread, cheese, a jug of Briarwell Pale at every place, and a candle in the middle of each. Nobody talks while the reader reads.' },
                { id: 'kloster_inner_vats', kind: 'inspect', x: 30, y: 7, name: 'Copper vats',
                    text: 'Two great copper vats, still warm. The mash smells of bread and honey. Brother Fenric has chalked a tally of every brew on the wall.' },
                { id: 'kloster_inner_cellar', kind: 'inspect', x: 29, y: 12, name: 'Barrel racks',
                    text: 'Casks on racks, nose to tail, in the cool of the cellar. Each has a date, a cross, and a name: who it is to be opened for.' },
                { id: 'kloster_inner_cells', kind: 'inspect', x: 29, y: 17, name: 'Dormitory cell',
                    text: 'A narrow bed, a wooden cross on the wall, a candle and a pair of worn sandals. Every cell is the same, on purpose.' },
                { id: 'kloster_inner_hall', kind: 'inspect', x: 17, y: 20, name: 'Hall statue',
                    text: 'A robed saint by the door, a brazier at its feet. The hood hides its face; the hands are folded like the statue in the courtyard.' }
            ]
        },

        village_residential_lane: {
            zoneId: 'shamefield_vale',
            name: "Baker's Lane",
            // Original scene art (ui/scene-bakers-lane.js, Saffron/Quill) paints this map whole after Tokelo's reference
            // (2026-11-03): timber-framed houses inside the town wall, the cobbled road from the west gate with a drain
            // where the lane turns south, Oda's bakery, oven and woodshed, Greta's smokehouse and hen yard, the pig pen,
            // the well, washing lines and lantern posts. Its tiles still decide collision.
            scene: 'bakers_lane',
            ambient: { darkness: 0.12, tint: 'rgba(90, 70, 50, 0.12)', particles: { kind: 'smoke', count: 10 }, grade: { ambient: 0.78, exposure: 1.05, highlights: [0.08, 0.04, -0.03] } },
            legend: {
                ',': { name: 'grass' }, ':': { name: 'dirt_path' }, '+': { name: 'cobble' }, 'd': { name: 'drain' },
                '#': { name: 'town_wall', solid: true }, 'B': { name: 'wall_banner', solid: true },
                'h': { name: 'house', solid: true }, 'K': { name: 'bakery', solid: true }, 'Z': { name: 'smokehouse', solid: true },
                'O': { name: 'oven', solid: true }, 'S': { name: 'woodshed', solid: true }, 'm': { name: 'bread_table', solid: true },
                'k': { name: 'sacks', solid: true }, 'L': { name: 'laundry', solid: true }, 'j': { name: 'cabbages', solid: true },
                'f': { name: 'fence', solid: true }, 'c': { name: 'coop', solid: true }, 'e': { name: 'chickens', solid: true },
                'H': { name: 'hay', solid: true }, 'P': { name: 'pig_mud', solid: true }, 'y': { name: 'pig_shed', solid: true },
                'o': { name: 'well', solid: true }, 'l': { name: 'lantern', solid: true }, 'n': { name: 'mounting_stone', solid: true },
                'T': { name: 'tree', solid: true }, 'Y': { name: 'dead_tree', solid: true }, 'v': { name: 'bush', solid: true },
                'r': { name: 'rose_bed', solid: true }, 'u': { name: 'stump', solid: true }, 'b': { name: 'barrel', solid: true },
                'x': { name: 'crate', solid: true }
            },
            tiles: [
                '##TTvvvvvvTTTvvTvvKKKKKKTTTTTTTT',
                '##,,hhhhhh,,,,,,v,KKKKKKZZfffffT',
                '##,,hhhhhh,,,SSOOOKKKKKKZZf,ccfT',
                '##,,hhhhhhLLLSSOOOKKKKKKZZfeccfT',
                '#B,,hhhhhhjjjSSOOOKKKKKKZZf,,HfT',
                '##,,hhhhhhjjjSSOOOKKKKKK,,fe,efT',
                '##,,hhhhhhjjj,mm++++++kk,,fffffT',
                '##,l,,,bx,,,n+++++,,,,,,,l,,,,,T',
                '##++++++++++++++++++++++++++++++',
                '+++++++++++++++d++++++++++++++++',
                '##++++++++++++++++++++++++++++++',
                '##,hhhhhhY,l,+++++,hhhhhhhhh,,T,',
                '##,hhhhhh,fff,::,ffhhhhhhhhh,,TT',
                '##,hhhhhh,,,,,::,bbhhhhhhhhh,,,T',
                '#Bvhhhhhh,,o,,::,,,hhhhhhhhh,v,T',
                '##,hhhhhh,,,b,::,,,hhhhhhhhh,,,,',
                '##yyfffff,,,,,::,,,hhhhhhhhhbx,,',
                '##yyPPPPf,u,,,::,Y,hhhhhhhhh,LL,',
                '##fPPPPPf,,,,,,:::,,rr,,,,,,b,,,',
                '##fPPPPPf,hhhhhh,::::::::::::,,,',
                '##fffffff,hhhhhh,,:::::::::::,,,',
                '##,,,v,LL,hhhhhh,,,,,,,,,,,,,hhh',
                '#######vv,hhhhhh,Tffffffffffvhhh',
                '#######vvvhhhhhhvvvvTvvvvTvvvhhh'
            ],
            // Warm light from the oven mouth and the bigger windows (the lantern posts light themselves).
            lights: [
                { x: 16, y: 5, radius: 1.8, color: 'rgba(255, 140, 60, 0.3)' }, { x: 7, y: 6, radius: 1.2, color: 'rgba(255, 170, 80, 0.2)' },
                { x: 20, y: 5, radius: 1.3, color: 'rgba(255, 170, 80, 0.22)' }, { x: 6, y: 15, radius: 1.2, color: 'rgba(255, 170, 80, 0.2)' },
                { x: 23, y: 17, radius: 1.4, color: 'rgba(255, 170, 80, 0.22)' }, { x: 12, y: 22, radius: 1.1, color: 'rgba(255, 170, 80, 0.2)' }
            ],
            spawns: { from_village: { x: 1, y: 9, facing: 'right' } },
            exits: [
                { id: 'lane_west', x: 0, y: 9, trigger: 'step', toMap: 'shamefield', toSpawn: 'from_lane' }
            ],
            interactables: [
                { id: 'lane_oda', kind: 'npc', npc: 'oda', x: 17, y: 6, name: 'Oda of the Oven', sprite: 'baker' },
                { id: 'lane_greta', kind: 'npc', npc: 'greta', x: 24, y: 5, name: 'Greta Rusk', sprite: 'butcher' },
                { id: 'lane_oven', kind: 'inspect', x: 16, y: 5, name: 'Bread oven',
                    text: 'A domed oven of blackened brick, still warm. Dark rye loaves cool on a board beside it. The crust cracks when you so much as look at it.' },
                { id: 'lane_smokehouse', kind: 'inspect', x: 25, y: 4, name: 'Smokehouse',
                    text: 'Beechwood smoke seeps out between the boards. Inside, in the dark, hams and long sausages hang in rows like bells.' },
                { id: 'lane_pigs', kind: 'inspect', x: 8, y: 18, name: 'Pig pen',
                    text: 'Two pigs, very pleased with the mud. A bucket of bran and bakery crusts stands by the gate: nothing in this lane is wasted.' },
                { id: 'lane_woodpile', kind: 'inspect', x: 13, y: 5, name: 'Woodpile',
                    text: 'Split beech for the oven, oak for the smokehouse. They are stacked apart, and you get the feeling that matters to someone.' },
                { id: 'lane_stone', kind: 'inspect', x: 12, y: 7, name: 'Mounting stone',
                    text: 'A worn stone for climbing onto carts. Children have scratched a game board into the top.' }
            ]
        },

        // -----------------------------------------------------------------
        // Shane's side quest: the watch pursuers by the confiscation wagon (S01).
        allotment: {
            zoneId: 'shamefield_vale',
            name: "Shane's Allotment",
            scene: 'allotment',               // painted whole: ui/scene-ch1-wilds.js
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
            scene: 'orchard',                 // painted whole: ui/scene-ch1-wilds.js
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
                // Tokelo 2026-11-04 ("add more enemy NPCs leading up to the Warden"): two Broken Oath lookouts across the
                // orchard's open middle rows. Each spots you from `detect` px, and between them they cover every column of
                // rows 10-11, so the way north always meets one of them.
                { id: 'orchard_east_lookouts', x: 19, y: 10, detect: 200, name: 'Broken Oath Lookouts', enemies: ['cult_zealot', 'cult_acolyte', 'cult_acolyte'], trigger: 'contact', sprite: 'cultists',
                    text: 'Three grey robes among the apple trees, one of them twice the size of the others and dragging a chain flail. "The orchard is closed," the big one says. "By oath."' },
                { id: 'orchard_west_lookouts', x: 7, y: 11, detect: 200, name: 'Broken Oath Watch', enemies: ['cult_zealot', 'cult_acolyte'], trigger: 'contact', sprite: 'cultists',
                    text: 'A zealot and an acolyte keep watch from the west rows, a bowl of ash between them. The acolyte points at you. The zealot is already walking.' },
                // Sergeant Kess, the Ash-Marked (C1-N04, master brief §3): the supply post's elite, with one acolyte.
                { id: 'orchard_kess', x: 16, y: 5, name: 'Sergeant Kess', enemies: ['oath_sergeant', 'cult_acolyte'], trigger: 'contact', sprite: 'cultists',
                    when: { quests: { 'C1-N04': 'active' } },
                    text: 'A grey-haired sergeant in an old Crown coat with an ash circle on the sleeve looks up from a ledger of crates. "Hold the line," Kess says to the acolyte, quite calmly, and draws.' },
                { id: 'orchard_cultists', gate: true, x: 13, y: 3, name: 'Broken Oath Cultists', enemies: ['cult_acolyte', 'cult_acolyte'], trigger: 'contact', sprite: 'cultists',
                    text: 'Two figures in grey robes chant in the old causeway, scraping a circle into the stones. One looks up at you, and for a moment seems almost hopeful. Then afraid.' }
            ],
            interactables: [
                { id: 'orchard_ritual_marks', kind: 'inspect', x: 12, y: 3, name: 'Scraped circle',
                    text: 'A circle scraped into the causeway stones, left open at the top. You have seen this mark before: in the cellar, on the dead tree, in the well.' },
                { id: 'orchard_herbs', kind: 'pickup', x: 23, y: 18, item: 'Healing Herb Bundle', name: 'Wild herbs', sprite: 'bundle',
                    text: 'A clump of yarrow and feverfew growing in the shade of the last tree. Iona would want these.' },
                { id: 'orchard_apples', kind: 'forage', forage: 'apples', x: 6, y: 7, name: 'Windfall apples', sprite: 'apples',
                    text: 'Windfalls in the grass under the trees, most of them sound.' },
                { id: 'orchard_apples_east', kind: 'forage', forage: 'apples', x: 20, y: 10, name: 'Windfall apples', sprite: 'apples',
                    text: 'Apples the wasps have not found yet.' },
                { id: 'orchard_chanterelles', kind: 'forage', forage: 'chanterelles', x: 2, y: 11, name: 'Chanterelles', sprite: 'mushrooms',
                    text: 'Chanterelles in the shade along the orchard wall.' },
                { id: 'orchard_chanterelles_east', kind: 'forage', forage: 'chanterelles', x: 24, y: 14, name: 'Chanterelles', sprite: 'mushrooms',
                    text: 'A clump of chanterelles at the foot of the wall.' },
                { id: 'orchard_old_tree', kind: 'inspect', x: 9, y: 15, name: 'Old apple tree',
                    text: 'The oldest tree in the orchard. Someone tied a ribbon round it for every year since the old crown fell. There is only one ribbon.' },
                { id: 'orchard_supply_post', kind: 'inspect', x: 19, y: 4, name: 'Supply post', sprite: 'crate', when: { quests: { 'C1-N04': 'active+' } },
                    text: 'Crates stamped with the old crown\'s quartermaster mark: chains, blankets, rations for forty. A tally board lists them by the hour, and the last hour is DUSK, THE ROOST.' },
                { id: 'orchard_kess_npc', kind: 'npc', npc: 'kess', x: 17, y: 5, name: 'Sergeant Kess', sprite: 'oath_sergeant',
                    when: { flags: ['kess_beaten'], notFlags: ['kess_resolved'] } }
            ]
        },

        // -----------------------------------------------------------------
        // Segment D: the climb. The Ritual-Scarred Ghoul the Warden was keeping penned (G4).
        featherwatch: {
            zoneId: 'featherwatch_heights',
            name: 'Featherwatch Path',
            scene: 'featherwatch',            // painted whole: ui/scene-ch1-wilds.js
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
                // Tokelo 2026-11-04: more on the climb. Both hold a one-tile pass (row 14 and the row 9 ledge), so they are fought.
                { id: 'featherwatch_rearguard', gate: true, x: 5, y: 14, name: 'Oathbound Rearguard', enemies: ['cult_zealot', 'cult_acolyte', 'cult_acolyte'], trigger: 'contact', sprite: 'cultists',
                    text: 'The last of the Broken Oath hold the foot of the climb. They have scraped their circle into the rock here too, and they will not let you step over it.' },
                { id: 'featherwatch_crows', gate: true, x: 8, y: 9, name: 'Hex-Eyed Crows', enemies: ['carrion_crow', 'carrion_crow', 'carrion_crow'], trigger: 'contact', sprite: 'crows',
                    text: 'Three crows on the ledge, picking at something the cult left behind. Their eyes are the wrong red. They are not the Warden\'s birds any more.' },
                { id: 'featherwatch_ghoul', gate: true, x: 12, y: 7, name: 'Ritual-Scarred Ghoul', enemies: ['shackled_ghoul_stronger'], trigger: 'contact', sprite: 'ghoul',
                    text: 'A ghoul, scarred with ritual cuts, strains at a snapped chain in the narrow path. It got loose from somewhere above.' }
            ],
            interactables: [
                // C1-N04 (Broken Crown rework): Corvin Sere at the foot of the climb, until he leaves or the Warden dies.
                { id: 'featherwatch_corvin', kind: 'npc', npc: 'corvin', x: 11, y: 18, name: 'Corvin Sere', sprite: 'oath_officer',
                    when: { notFlags: ['corvin_gone', 'warden_dead'], any: [{ quests: { 'C1-N04': 'active' } }, { flags: ['corvin_met'] }] } },
                { id: 'featherwatch_cage', kind: 'inspect', x: 13, y: 8, name: 'Broken cage',
                    text: 'A heavy cage, its door bent outward. The lock was mended many times, by someone patient, before it finally gave.' },
                { id: 'featherwatch_chanterelles', kind: 'forage', forage: 'chanterelles', x: 3, y: 10, name: 'Chanterelles', sprite: 'mushrooms',
                    text: 'Mushrooms in the cold moss of the climb.' },
                { id: 'featherwatch_chanterelles_low', kind: 'forage', forage: 'chanterelles', x: 15, y: 17, name: 'Chanterelles', sprite: 'mushrooms',
                    text: 'A golden cluster against the rock.' },
                { id: 'featherwatch_perch', kind: 'inspect', x: 2, y: 12, name: 'Crow perch',
                    text: 'A perch built from a broken cart axle, with a dish of water and a few scraps of meat. The crows here are fat and unafraid.' },
                { id: 'featherwatch_roost', kind: 'inspect', x: 14, y: 4, name: 'Splinted crow',
                    text: 'A crow with a neatly splinted wing hops along a rail and croaks at you. The splint is good work.' },
                // Secret (master brief §8): the Warden's own way up, and his lookout over the vale.
                { id: 'featherwatch_ridge_rope', kind: 'inspect', x: 1, y: 11, name: 'Knotted rope',
                    text: 'A knotted rope hangs down the rock, the knots worn smooth by one pair of hands. It leads up to a ledge over the roost.' },
                { id: 'featherwatch_lookout', kind: 'inspect', x: 15, y: 5, name: 'Lookout ledge', sprite: 'bundle', when: { flags: ['ridge_rope_found'] },
                    text: 'A ledge with the whole vale below it, and the old fortress beyond the roost. In a tin: bandages, dried herbs, and a torn page of a care journal. "Gray one: wing splinted. Bites. Feed twice. Three travellers on the south road. Left bread at the stair."' }
            ]
        },

        // -----------------------------------------------------------------
        // Segment E: the Warden's roost, his warning, the boss, and the seal.
        sanctuary: {
            zoneId: 'featherwatch_heights',
            name: "The Warden's Sanctuary",
            scene: 'warden_sanctuary',        // painted whole: ui/scene-featherwatch-roost.js
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
                    lockedText: 'A ring of black stone set in the wall, open at the top, with no handle and no keyhole, only a hollow the shape of a feather. It is warm to the touch.',
                    text: 'The key fits the hollow. The stone sighs open, and the crows go quiet.' }
            ],
            encounters: [
                { id: 'sanctuary_warden', x: 11, y: 5, name: 'The Crow-Touched Warden', enemies: ['crow_touched_warden'], trigger: 'contact', sprite: 'warden',
                    when: { flags: ['warden_challenged'] },
                    text: 'The Warden stands between you and the seal. His crows settle on his shoulders and arms. He doesn\'t raise his halberd until you do.' },
                // C1-N05: the Broken Oath got here first. Two cage-breakers, not a boss: the Warden is not weakened by them.
                { id: 'sanctuary_siege', x: 11, y: 10, name: 'Oathbound Cage-Breakers', enemies: ['cult_acolyte', 'cult_acolyte'], trigger: 'contact', sprite: 'cultists',
                    when: { quests: { 'C1-N05': 'active' } },
                    text: 'Two acolytes are prying at the cages with crowbars while the crows scream from the rafters. Across the hall, the Warden is holding the seal stair alone.' }
            ],
            interactables: [
                { id: 'sanctuary_warden_npc', kind: 'npc', npc: 'warden', x: 13, y: 5, name: 'The Crow-Touched Warden', sprite: 'warden_npc',
                    when: { notFlags: ['warden_challenged'] } },
                { id: 'sanctuary_journal', kind: 'inspect', x: 5, y: 4, name: "Warden's log",
                    text: '"Mended the gray one\'s wing today. It bit me twice. Good. It wants to live." Page after page: feedings, splints, names for every bird. Near the end: "Grey robes on the causeway again, with chains. Doubled the watch on the seal." The last entry: "Someone has woken in the old house. The crows saw. Keep the seal."' },
                // After the fight (Broken Crown rework, Act V): you bury the Warden, and learn his name.
                { id: 'sanctuary_grave', kind: 'station', station: 'warden_grave', x: 9, y: 6, name: 'The Warden', sprite: 'fallen_warden', verb: 'Kneel by',
                    when: { flags: ['warden_dead'] }, looks: [{ when: { flags: ['bran_buried'] }, name: 'Cairn', sprite: 'cairn' }] },
                { id: 'sanctuary_cage_grey', kind: 'inspect', x: 2, y: 3, name: 'Rebuilt cage',
                    text: 'A cage rebuilt from old prison bars, its door tied open with a ribbon. Inside, a nest, and a gray crow with a crooked wing.' },
                { id: 'sanctuary_cage_empty', kind: 'inspect', x: 19, y: 6, name: 'Empty cage',
                    text: 'Clean straw and a full water dish. Waiting for the next one that needs it.' },
                { id: 'sanctuary_bedroll', kind: 'inspect', x: 4, y: 12, name: 'Bedroll',
                    text: 'A thin bedroll by the cages, close enough to hear them in the night.' },
                // C1-N05, A Sanctuary Under Siege: what the Broken Oath did to his refuge.
                { id: 'sanctuary_broken_cages', kind: 'inspect', x: 16, y: 8, name: 'Broken cages', sprite: 'cage', when: { quests: { 'C1-N05': 'active+' } },
                    text: 'Three cages pried open, a perch snapped, a sack of grain slit and kicked across the floor. In the last cage, a crow with a splinted leg watches you and does not make a sound.' }
            ]
        },

        // -----------------------------------------------------------------
        seal_chamber: {
            zoneId: 'featherwatch_heights',
            name: 'The Seal Chamber',
            scene: 'seal_chamber',            // painted whole: ui/scene-featherwatch-roost.js
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
        roadExit: { id: 'road_tollway', x: 15, y: 21, trigger: 'step', toMap: 'tollway', toSpawn: 'from_road',
            text: 'You walk into the fog. It thins, and the road goes on: broken, but passable.' },
        roadSpawn: { from_tollway: { x: 15, y: 20, facing: 'up' } },
        interactables: {
            cellar: [
                { id: 'cellar_inscription', kind: 'inspect', x: 0, y: 4, name: 'Cracked inscription',
                    text: 'Words are cut into the stone, half lost to a crack: "...WHO SLEEPS HERE IS NOT TO BE..." The rest has crumbled. Someone tried hard to scratch it out.' }
            ],
            // Replaces the base house's bed and chest (same ids, same tiles): a safe home once the gate is mended.
            house: [
                { id: 'house_bed', kind: 'station', station: 'home_bed', x: 17, y: 9, name: 'Made bed', verb: 'Use' },
                { id: 'house_chest', kind: 'station', station: 'home_chest', x: 2, y: 9, name: 'Travelling chest', verb: 'Open' }
            ],
            grounds: [
                { id: 'grounds_foundation', kind: 'inspect', x: 11, y: 12, name: 'Old foundation stone',
                    text: 'A cornerstone far too big for a farmhouse. Old masonry runs under the grass in straight lines, out toward the trees: the footprint of something much larger, long gone.' },
                // The gate (Tokelo, 2026-11-03): drawn broken, then mended once Orin's first job is built.
                { id: 'grounds_gate', kind: 'station', station: 'homestead_gate', x: 22, y: 12, name: 'Broken gate', sprite: 'broken_gate', verb: 'Inspect',
                    looks: [{ when: { built: ['homestead_gate'] }, name: 'Mended gate', sprite: 'mended_gate' }] },
                { id: 'grounds_orin', kind: 'npc', npc: 'orin', x: 18, y: 10, name: 'Orin Vale', sprite: 'mason', when: { flags: ['fragment_one'] } },
                { id: 'grounds_shane', kind: 'npc', npc: 'shane', x: 9, y: 11, name: 'Shane', sprite: 'shane', when: { flags: ['shane_recruited'] } },
                // The kitchen (Tokelo, 2026-11-02): your hearth, two fields on the old tilled soil, a pigsty and a hen coop.
                { id: 'grounds_hearth', kind: 'station', station: 'homestead_hearth', verb: 'Cook at', x: 17, y: 6, name: 'Cooking hearth', sprite: 'cookfire' },
                { id: 'grounds_field_west', kind: 'station', station: 'homestead_field_west', verb: 'Tend', x: 3, y: 11, name: 'West field', sprite: 'garden_bed' },
                { id: 'grounds_field_east', kind: 'station', station: 'homestead_field_east', verb: 'Tend', x: 6, y: 11, name: 'East field', sprite: 'garden_bed' },
                { id: 'grounds_sty', kind: 'station', station: 'homestead_sty', verb: 'Look at', x: 20, y: 14, name: 'Pigsty', sprite: 'sty' },
                { id: 'grounds_coop', kind: 'station', station: 'homestead_coop', verb: 'Look at', x: 26, y: 14, name: 'Hen coop', sprite: 'coop' }
            ],
            // Things that grow back (forageDefinitions): mushrooms and herbs along the homestead road.
            road: [
                { id: 'road_chanterelles', kind: 'forage', forage: 'chanterelles', x: 7, y: 3, name: 'Chanterelles', sprite: 'mushrooms',
                    text: 'Golden chanterelles in the moss under the trees, smelling faintly of apricot.' },
                { id: 'road_chanterelles_east', kind: 'forage', forage: 'chanterelles', x: 28, y: 3, name: 'Chanterelles', sprite: 'mushrooms',
                    text: 'A ring of chanterelles where nobody walks.' },
                { id: 'road_herbs', kind: 'forage', forage: 'wild_herbs', x: 7, y: 10, name: 'Wild herbs', sprite: 'herbs',
                    text: 'Yarrow and thyme growing wild along the verge.' },
                // The Broken Crown rework (Act I): the man who dug at your house, until he runs or the story moves on.
                { id: 'road_scavenger', kind: 'npc', npc: 'scavenger', x: 13, y: 4, name: 'Scavenger', sprite: 'scavenger',
                    when: { notFlags: ['scavenger_fled'], quests: { Q04: 'unseen' } } },
                // Secret (master brief §8): the hunter's abandoned cabin in the ruins, and the winter store he never collected.
                { id: 'road_hunter_note', kind: 'inspect', x: 18, y: 17, name: 'Field note',
                    text: 'A field note nailed to the ruin\'s doorpost, curled with damp: "Wolves down from the ridge. Boarded the cabin, left the winter store under the brush by the east trees. Back when the road is safe. Jost." The road never was.' },
                { id: 'road_hunter_cache', kind: 'inspect', x: 29, y: 17, name: 'Heap of brush', sprite: 'bundle', when: { flags: ['hunter_note_read'] },
                    text: 'Under a heap of cut brush: a hunter\'s winter store, wrapped in waxed hide. Jost never came back for it.' }
            ]
        }
    };

    const chapter1Maps = { tiles, zones, maps, homestead };
    (ENSO.world || (ENSO.world = {})).chapter1Maps = chapter1Maps;
    if (isNode) module.exports = chapter1Maps;
})(typeof window !== 'undefined' ? window : globalThis);
