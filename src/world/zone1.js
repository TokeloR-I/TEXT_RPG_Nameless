/* =========================================================================
 * Enso's Last Stand — WORLD DATA: Zone 1, the Forgotten Homestead
 * Design: docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md. Pure data, no logic.
 *
 * A map is a grid of one-character tiles (`tiles`, row by row, y downwards).
 * What a character means comes from `tileset` below, or from the map's own
 * `legend` if it overrides one. Coordinates are tile columns/rows from 0,0
 * at the top left. Things placed on a map:
 *   spawns        named arrival points { x, y, facing }
 *   exits         { id, x, y, trigger: 'step'|'interact', toMap, toSpawn, prompt?, text?, group? }
 *                 exits sharing a `group` are one doorway several tiles wide (checked as one)
 *                 'interact' exits need a `prompt` (the hint shown when you face them);
 *                 `text` is shown on arrival, the first time only (once per run, kept in saves)
 *   interactables { id, kind: 'inspect'|'pickup', x, y, name, text, item?, sprite? } (they block the tile;
 *                 a pickup gives `item` once per run through the engine, using the normal loot rules)
 *   encounters    { id, x, y, name, enemies: [enemy keys], trigger: 'contact', sprite, text? }
 *                 visible enemies: walking into one starts a normal fight; E on it shows `text`
 *   boundaries    { id, x, y, w, h, title, text } walkable area that shows a notice when you enter it
 *   lights        { x, y, radius, color? } for dark maps; `color` adds a flickering glow (presentation only)
 *   ambient       { darkness?, lantern?, tint?, fog?, particles?: { kind: dust|fireflies|embers|feathers|smoke, count } }
 *                 Any placed object may also carry `light: { radius, color? }` (ui/world-render.js, GFX-3)
 * Chapter One adds (src/world/chapter1-maps.js): npc objects, `when` story conditions, locked exits
 * (`requires` + `lockedText`) and `gate: true` on a required fight that holds the only way on.
 * Validate after any change: `npm test` (tests/18-world.test.js).
 * ========================================================================= */
(function (global) {
    const isNode = typeof module !== 'undefined' && module.exports;
    const ENSO = global.ENSO || (global.ENSO = {});

    const tileset = {
        // stone / cellar
        '#': { name: 'stone_wall', solid: true },
        '.': { name: 'stone_floor' },
        'b': { name: 'barrel', solid: true },
        'x': { name: 'crate', solid: true },
        'r': { name: 'rubble', solid: true },
        'S': { name: 'shelf', solid: true },
        '^': { name: 'stairs_up' },
        'v': { name: 'stairs_down' },
        // house interior
        'W': { name: 'wood_wall', solid: true },
        '=': { name: 'wood_floor' },
        'D': { name: 'doorway' },
        'K': { name: 'counter', solid: true },
        't': { name: 'table', solid: true },
        'c': { name: 'chair', solid: true },
        'a': { name: 'armchair', solid: true },
        'B': { name: 'bed', solid: true },
        'F': { name: 'fireplace', solid: true },
        'R': { name: 'rug' },
        // outdoors
        ',': { name: 'grass' },
        '"': { name: 'tall_weeds' },
        ':': { name: 'dirt_path' },
        'T': { name: 'tree', solid: true },
        'Y': { name: 'dead_tree', solid: true },
        'f': { name: 'fence', solid: true },
        'o': { name: 'rock', solid: true },
        '~': { name: 'water', solid: true },
        'H': { name: 'house_wall', solid: true },
        'n': { name: 'house_window', solid: true },
        'h': { name: 'roof', solid: true },
        'P': { name: 'shed_wall', solid: true },
        'd': { name: 'shed_door_shut', solid: true },
        'p': { name: 'shed_roof', solid: true },
        'O': { name: 'well', solid: true },
        'Q': { name: 'scarecrow', solid: true },
        'I': { name: 'signpost', solid: true },
        'L': { name: 'rope', solid: true }
    };

    const maps = {
        // -----------------------------------------------------------------
        cellar: {
            zoneId: 'forgotten_homestead',
            name: 'The Cellar',
            scene: 'cellar',                                   // painted whole: ui/scene-homestead-rooms.js
            ambient: { darkness: 0.72, lantern: 4.5, particles: { kind: 'dust', count: 18 } },
            legend: { 'R': { name: 'bedroll' } },
            tiles: [
                '##############',
                '#bx..#....S..#',
                '#b...#.......#',
                '#....r.......#',
                '#..........###',
                '#.R........#^#',
                '#.........x#.#',
                '#rr..........#',
                '#xb.....b....#',
                '##############'
            ],
            lights: [{ x: 8, y: 3, radius: 2.5 }],
            spawns: {
                start: { x: 3, y: 5, facing: 'down' },
                from_house: { x: 12, y: 6, facing: 'down' }
            },
            exits: [
                { id: 'cellar_stairs', x: 12, y: 5, trigger: 'step', toMap: 'house', toSpawn: 'from_cellar' }
            ],
            interactables: [
                { id: 'cellar_old_purse', kind: 'inspect', x: 2, y: 5, name: 'Abandoned coin purse', sprite: 'bag', text: 'An old purse lies beside the bedroll. Ten coins remain inside.' },
                { id: 'cellar_feathers', kind: 'inspect', x: 8, y: 3, name: 'Black feathers', sprite: 'feathers',
                    text: 'A drift of black feathers lies under the crack in the ceiling. Far too many for one bird. None of them are broken.' },
                { id: 'cellar_tallies', kind: 'inspect', x: 5, y: 2, name: 'Scratched wall',
                    text: 'Rows of short scratches are cut into the stone. Not words. Tallies. The last row stops halfway through a mark.' },
                { id: 'cellar_jars', kind: 'inspect', x: 10, y: 1, name: 'Shelf of jars',
                    text: 'Preserve jars, their labels peeled away. Whatever was inside has dried to a black film.' }
            ]
        },

        // -----------------------------------------------------------------
        house: {
            zoneId: 'forgotten_homestead',
            name: 'The House',
            scene: 'farmhouse',                                   // painted whole: ui/scene-homestead-rooms.js
            ambient: { darkness: 0.5, lantern: 5.5, particles: { kind: 'dust', count: 14 } },
            tiles: [
                'WWWWWWWWWWWWWWWWWWWW',
                'WKKKS===W====FFF=SSW',
                'W=======W==========W',
                'W=ctc===D===RRRR===W',
                'W=======W===RRRR=a=W',
                'Wv======W==========W',
                'W=======W==========W',
                'WWWW=WWWWW=WWWWWWWWW',
                'W===========W======W',
                'W=x=========D====BBW',
                'W===========W====BBW',
                'W=S=========W=x====W',
                'WWWWWWDWWWWWWWWWWWWW'
            ],
            lights: [{ x: 6, y: 11, radius: 2.5 }],
            spawns: {
                from_cellar: { x: 2, y: 5, facing: 'right' },
                from_grounds: { x: 6, y: 11, facing: 'up' }
            },
            exits: [
                { id: 'house_cellar_stairs', x: 1, y: 5, trigger: 'step', toMap: 'cellar', toSpawn: 'from_house' },
                { id: 'house_front_door', x: 6, y: 12, trigger: 'step', toMap: 'grounds', toSpawn: 'from_house' }
            ],
            interactables: [
                { id: 'house_table', kind: 'inspect', x: 3, y: 3, name: 'Kitchen table',
                    text: 'Two places are set. One plate is scraped clean. The other was never touched, and the dust on it is thick and even.' },
                { id: 'house_fireplace', kind: 'inspect', x: 14, y: 1, name: 'Fireplace',
                    text: 'Cold ash, packed hard. Pressed into it is a single bird track, as if something landed here once and left on foot.' },
                { id: 'house_books', kind: 'inspect', x: 17, y: 1, name: 'Bookshelf',
                    text: 'Every book has been turned to face the wall.' },
                { id: 'house_bed', kind: 'inspect', x: 17, y: 9, name: 'Made bed',
                    text: 'The blanket is pulled tight, the corners tucked. Someone made this bed with care and never slept in it again.' },
                { id: 'house_chest', kind: 'inspect', x: 2, y: 9, name: 'Travelling chest',
                    text: 'A chest packed and strapped shut for a journey. It never left the hallway.' }
            ]
        },

        // -----------------------------------------------------------------
        grounds: {
            zoneId: 'forgotten_homestead',
            name: 'Homestead Grounds',
            // Original scene art (ui/scene-art.js) paints this map whole: the ruined farmhouse, the smithy, the well,
            // the plots, the dry-stone wall and the river. Its tiles still decide collision.
            scene: 'homestead',
            ambient: { darkness: 0.08, tint: 'rgba(40, 46, 92, 0.12)', particles: { kind: 'fireflies', count: 14 } },
            legend: {
                'm': { name: 'tilled_soil' }, 'w': { name: 'drystone_wall', solid: true }, 'k': { name: 'dock' },
                '_': { name: 'footbridge' }, 'C': { name: 'cart', solid: true }, 'u': { name: 'stump', solid: true },
                'e': { name: 'bush', solid: true }, 'A': { name: 'anvil', solid: true }
            },
            tiles: [
                'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
                'TTo,,,,,,hhhhhhhhhhhh,,,,,TTTT',
                'T,,,,,,,,hhhhhhhhhhhh,,,,,ooTT',
                'T,,,,,,,bHHnHHDHHnHHH,,,,,,,oT',
                'T,,,,,,,b,x,,,:,,,,,,u,,,,,,,T',
                'T,,,ppppp,,,,,:,,,,,,,,,,,,,,T',
                'T,x,ppppp,,,,,:,,,,,,Y,,,,,,,T',
                'T,,APPDPP,,,,,:,,,,,,,,O,,,,eT',
                'T,,,,,:,,,,,,,:,,,,,,,,:,,,,,T',
                'T,,,,,::::::::::::::::::,,,,,T',
                'T,fffffff,,,,,:,,,,,,,,,,,,,,T',
                'T,mmmmmmm,,,,,:,,,,,,,,,,,,,,T',
                'T,mmmmmmm,,,o,:,,,,ffffff,ff,T',
                'T,"""""""",,,,:,,,,,,,,,,,,,,T',
                'T,"""""""",,,,:,,,,,,,,,C,,,,T',
                'T,"""""""",,,,:,Q,,,,,,,,,,,,T',
                'T,,"""""",,,,,:,,,,,,,,,,,,xbT',
                'TwwwwwwwwwwwYw:wwwww:wwwwwwwwT',
                'T,o,,,,,,,,,,,:,,,,,:,,,,,,,oT',
                'T~~~~~~~~~~~~kk~~~~~_~~~~~~~~T',
                'T~~~~~~~~~~~~kk~~~~~_~~~~~~~~T',
                'TTTTTTTTTTTTTTTTTTTT:TTTTTTTTT'
            ],
            spawns: {
                from_house: { x: 14, y: 4, facing: 'down' },
                from_shed: { x: 6, y: 8, facing: 'down' },
                from_well: { x: 23, y: 8, facing: 'down' },
                from_road: { x: 20, y: 20, facing: 'up' }
            },
            exits: [
                { id: 'grounds_house_door', x: 14, y: 3, trigger: 'step', toMap: 'house', toSpawn: 'from_grounds' },
                { id: 'grounds_shed_door', x: 6, y: 7, trigger: 'step', toMap: 'shed', toSpawn: 'from_grounds' },
                { id: 'grounds_well', x: 23, y: 7, trigger: 'interact', toMap: 'well', toSpawn: 'from_top', prompt: 'Climb down the well',
                    text: 'You test the rope, then climb down, hand over hand, into the cold.' },
                { id: 'grounds_road', x: 20, y: 21, trigger: 'step', toMap: 'road', toSpawn: 'from_grounds' }
            ],
            encounters: [
                // Tokelo 2026-11-04: by the gaps in the wall on the way to the footbridge, the only way to the road.
                { id: 'grounds_weed_rats', x: 19, y: 18, name: 'Rust Rats', enemies: ['rust_rat', 'rust_rat'], trigger: 'contact', sprite: 'rats',
                    text: 'Something rustles in the long grass by the footbridge: rats, two of them, with rust-coloured fur. They are between you and the road.' }
            ],
            interactables: [
                { id: 'grounds_scarecrow', kind: 'inspect', x: 16, y: 15, name: 'Scarecrow',
                    text: "A scarecrow in a farmer's coat, arms spread wide. Crows line its arms and don't stir as you come close. Its sack-cloth face is turned toward the road." },
                { id: 'grounds_window', kind: 'inspect', x: 11, y: 3, name: 'Window',
                    text: 'Through the grime you can just make out the kitchen table, set for two.' },
                { id: 'grounds_dead_tree', kind: 'inspect', x: 12, y: 17, name: 'Dead tree',
                    text: 'Someone carved a mark into the bark: a single brushstroke of a circle, left open where it should close.' },
                { id: 'grounds_pond', kind: 'inspect', x: 25, y: 19, name: 'Still pond',
                    text: 'Black water, perfectly still. Your reflection looks back at you, and its hands are glowing too.' }
            ]
        }
    };

    Object.assign(maps, {
        // -----------------------------------------------------------------
        shed: {
            zoneId: 'forgotten_homestead',
            name: 'The Old Shed',
            scene: 'old_shed',                                   // painted whole: ui/scene-homestead-rooms.js
            ambient: { darkness: 0.55, lantern: 4.5 },
            legend: { 't': { name: 'workbench', solid: true } },
            tiles: [
                'WWWWWWWWW',
                'WSS==xx=W',
                'W=======W',
                'W=t===b=W',
                'W=======W',
                'W==x====W',
                'WWWWDWWWW'
            ],
            lights: [{ x: 4, y: 5, radius: 2 }],
            spawns: { from_grounds: { x: 4, y: 5, facing: 'up' } },
            exits: [
                { id: 'shed_door', x: 4, y: 6, trigger: 'step', toMap: 'grounds', toSpawn: 'from_shed' }
            ],
            interactables: [
                { id: 'shed_bandages', kind: 'pickup', x: 2, y: 3, item: 'Bandages', name: 'Bandages', sprite: 'bundle',
                    text: 'A roll of clean bandages under a tarp, as if someone meant to come back for them.' },
                { id: 'shed_hooks', kind: 'inspect', x: 1, y: 1, name: 'Tool hooks',
                    text: 'A row of tool hooks. Every tool is gone except a pair of shears, hung upside down.' },
                { id: 'shed_crates', kind: 'inspect', x: 5, y: 1, name: 'Seed crates',
                    text: 'Crates of seed packets, every one sorted and labelled. None of them were ever planted.' }
            ]
        },

        // -----------------------------------------------------------------
        well: {
            zoneId: 'forgotten_homestead',
            name: 'Bottom of the Well',
            scene: 'well_bottom',                                   // painted whole: ui/scene-homestead-rooms.js
            ambient: { darkness: 0.78, lantern: 3.5, particles: { kind: 'dust', count: 10 } },
            tiles: [
                '#########',
                '#rr.L..~#',
                '#......~#',
                '#.o...~~#',
                '#.......#',
                '#.......#',
                '#########'
            ],
            lights: [{ x: 4, y: 1, radius: 2.2 }],
            spawns: { from_top: { x: 4, y: 2, facing: 'down' } },
            exits: [
                { id: 'well_rope', x: 4, y: 1, trigger: 'interact', toMap: 'grounds', toSpawn: 'from_well', prompt: 'Climb the rope',
                    text: 'You climb back up into the grey evening air.' }
            ],
            interactables: [
                { id: 'well_carving', kind: 'inspect', x: 0, y: 4, name: 'Carved stone',
                    text: 'A circle is cut into the stone, the stroke left open at the top. Beneath it, newer scratches: tallies, like the ones in the cellar.' },
                { id: 'well_bottle', kind: 'pickup', x: 3, y: 5, item: 'Half-full Wine Bottle', name: 'Corked bottle', sprite: 'bottle',
                    text: 'A bottle wedged between two stones, corked tight. Someone hid it down here.' }
            ]
        },

        // -----------------------------------------------------------------
        road: {
            zoneId: 'forgotten_homestead',
            name: 'The Overgrown Road',
            // Original scene art (ui/scene-road.js, Saffron/Quill) paints this map whole after Tokelo's reference
            // (2026-11-01): a crossroads in the wood, the stream with its two falls and the plank bridge to the west,
            // a travellers' camp, crow banners with lanterns, broken walls, a stone arch and a covered wagon.
            // Its tiles still decide collision.
            scene: 'overgrown_road',
            ambient: { tint: 'rgba(70, 80, 40, 0.06)', particles: { kind: 'fireflies', count: 8 },
                grade: { ambient: 0.92, exposure: 1.04, highlights: [0.06, 0.05, -0.02] } },
            legend: {
                ',': { name: 'grass' }, ':': { name: 'dirt_path' }, '~': { name: 'water', solid: true }, 'W': { name: 'waterfall', solid: true },
                '_': { name: 'bridge' }, 'c': { name: 'bank_rocks', solid: true }, 'r': { name: 'reeds' }, '*': { name: 'flowers' },
                'T': { name: 'tree', solid: true }, 'A': { name: 'red_tree', solid: true }, 'h': { name: 'bush', solid: true },
                'o': { name: 'rock', solid: true }, 'u': { name: 'stump', solid: true }, 'R': { name: 'ruin', solid: true },
                'G': { name: 'arch', solid: true }, 'N': { name: 'tent', solid: true }, 'F': { name: 'campfire', solid: true },
                'b': { name: 'barrel', solid: true }, 'x': { name: 'crate', solid: true }, 'l': { name: 'log', solid: true },
                'B': { name: 'banner', solid: true }, 'L': { name: 'lantern', solid: true }, 'f': { name: 'fence', solid: true },
                'V': { name: 'wagon', solid: true }, 'I': { name: 'signpost', solid: true }
            },
            tiles: [
                'TcWWcTTTTTTTTTTT:TTTTTTTTTTTTTTT',
                'TcWWcTTTATTAATT,::,TTTTTTTTTAATT',
                'Tc~~cTTT,,T,,,,,::ffff,TTT,,,*AT',
                'Tc~~cT,,,,,,,B,:::,,,,**,TT*,,,T',
                'Tc~~ch,,,bL,,,o::,,RRRR,,,,,,,*T',
                'Tc~~r,NNN,,**,,::,,RRRRRR,,G:GTT',
                'Tc~~,,NNN,,,T,,::,,RRRRRR,,G:GTT',
                'Tc~~c,NNN,,,TT,::,,h,,,,fffh:,TT',
                'Tc~~c,,,,F,,T,,:::::::::::,,:,TT',
                'Tc~~r,ll,,,L,h,:::::::::::::::::',
                'Tc~~,,,,,x,T,,,::,B,,TT,,,*T,,TT',
                'Tc~~cT,,,,,,ff,::,,,TTTVVV,,TTTT',
                'Tc~~cTT,***,,::::I,*,llVVVb,,TTT',
                ':____:::::::::::::o,,,,,,,u,TTTT',
                ':____:::::::::::::,T,*,,,,,**,TT',
                'Tc~~r,,,h*A,,u:::h,fff,h,,T,,ATT',
                'Tc~~rT,,,,,,o,::,,,RRRRR,uTT,,AT',
                'Tc~~cTT,,TRRR,::,,,RRRRR,,T,,,,T',
                'Tc~~cTT,,,RRRB::,T,RRRRR,,,TTTTT',
                'TcWWcTTh,,,,,,f:,TT,,,*,,,TTTTTT',
                'TcWWcTTTTThhhh,:hhTTTTTTTTTTTTTT',
                'Tc~~cTTTTTTTTTh:hTTTTTTTTTTTTTTT'
            ],
            // The campfire and the lanterns on the banner posts glow warm (presentation only).
            lights: [
                { x: 9, y: 8, radius: 2.2, color: 'rgba(255, 150, 60, 0.3)' }, { x: 10, y: 4, radius: 1.2, color: 'rgba(255, 180, 80, 0.2)' },
                { x: 11, y: 9, radius: 1.2, color: 'rgba(255, 180, 80, 0.2)' }, { x: 13, y: 3, radius: 1.2, color: 'rgba(255, 180, 80, 0.2)' },
                { x: 18, y: 10, radius: 1.2, color: 'rgba(255, 180, 80, 0.2)' }, { x: 13, y: 18, radius: 1.2, color: 'rgba(255, 180, 80, 0.2)' }
            ],
            spawns: { from_grounds: { x: 16, y: 1, facing: 'down' } },
            exits: [
                { id: 'road_back', x: 16, y: 0, trigger: 'step', toMap: 'grounds', toSpawn: 'from_road' }
            ],
            encounters: [
                // Tokelo 2026-11-04: a pack at the crossroads, beside the road itself, so walking on means meeting it.
                // The Hungry Wolf leads it (the mini boss); its three Pack Wolves are smaller and lighter.
                { id: 'road_wolf', x: 17, y: 14, name: 'Hungry Wolf Pack', enemies: ['hungry_wolf', 'pack_wolf', 'pack_wolf', 'pack_wolf'], trigger: 'contact', sprite: 'wolf',
                    text: 'A gaunt grey wolf stands at the crossroads, three leaner wolves at its flanks. The big one lifts its head and tests the air. They have your scent.' }
            ],
            interactables: [
                { id: 'road_signpost', kind: 'inspect', x: 17, y: 12, name: 'Signpost',
                    text: 'The letters have weathered away. One arrow is left, pointing on down the road.' },
                { id: 'road_cart', kind: 'inspect', x: 23, y: 12, name: 'Abandoned wagon',
                    text: 'A covered wagon, its canvas torn and its horse long gone. Whatever it carried was taken, or walked off on its own.' },
                { id: 'road_campfire', kind: 'inspect', x: 9, y: 8, name: 'Campfire',
                    text: 'A fire still burns under the pot, and the stew in it is warm. Whoever made camp here meant to come back.' },
                { id: 'road_banner', kind: 'inspect', x: 18, y: 10, name: 'Crow banner',
                    text: 'A red banner with a black crow on it, hung beside a lantern someone keeps lit. It marks the road, or claims it.' }
            ],
            boundaries: [
                { id: 'road_zone_edge', x: 15, y: 21, w: 1, h: 1, title: 'Beyond the Homestead',
                    text: 'The road runs on into the fog, toward the wider world. The way beyond isn\'t open yet. (Coming later.)' },
                { id: 'road_west_track', x: 0, y: 13, w: 1, h: 2, title: 'The west track',
                    text: 'Past the bridge the track sinks into bramble and dark trees. There is nothing that way yet.' },
                { id: 'road_east_track', x: 31, y: 9, w: 1, h: 1, title: 'The east track',
                    text: 'The track bends away east under the trees and is lost in the undergrowth. There is nothing that way yet.' }
            ]
        }
    });

    const zone1 = {
        start: { map: 'cellar', spawn: 'start' },
        tileset,
        zones: {
            forgotten_homestead: { name: 'The Forgotten Homestead', mapIds: ['cellar', 'house', 'grounds', 'shed', 'well', 'road'] }
        },
        maps,
        intro: [
            'Cold stone under your cheek. The smell of earth and old wine.',
            "You don't remember how you got here. Your hands are glowing faintly, and you don't know why.",
            'Somewhere above you, a crow calls once, then goes quiet.'
        ]
    };

    // Chapter One beyond the fog (src/world/chapter1-maps.js, loaded before this file in the browser):
    // new tiles, zones and maps, the road's fog edge opened into a way on, and story objects at home.
    const ch1 = isNode ? require('./chapter1-maps.js') : (ENSO.world && ENSO.world.chapter1Maps);
    if (ch1) {
        Object.assign(tileset, ch1.tiles);
        Object.assign(zone1.zones, ch1.zones);
        Object.assign(maps, ch1.maps);
        const road = maps.road;
        road.boundaries = (road.boundaries || []).filter((b) => b.id !== 'road_zone_edge');
        road.exits.push(ch1.homestead.roadExit);
        Object.assign(road.spawns, ch1.homestead.roadSpawn);
        for (const [mid, list] of Object.entries(ch1.homestead.interactables)) for (const o of list) {
            const at = maps[mid].interactables.findIndex((x) => x.id === o.id);   // same id: Chapter One's version replaces the base one
            if (at === -1) maps[mid].interactables.push(o); else maps[mid].interactables[at] = o;
        }
    }

    // Chapter Two, Act I (src/world/chapter2-maps.js, loaded before this file in the browser): Hrimvald's first two
    // maps, and the road's east track opened into the way there once Chapter One is done.
    const ch2 = isNode ? require('./chapter2-maps.js') : (ENSO.world && ENSO.world.chapter2Maps);
    if (ch2) {
        Object.assign(zone1.zones, ch2.zones);
        Object.assign(maps, ch2.maps);
        const road = maps.road;
        road.boundaries = (road.boundaries || []).filter((b) => b.id !== ch2.road.dropBoundary);
        road.exits.push(ch2.road.exit);
        Object.assign(road.spawns, ch2.road.spawn);
    }

    (ENSO.world || (ENSO.world = {})).zone1 = zone1;
    if (isNode) module.exports = zone1;
})(typeof window !== 'undefined' ? window : globalThis);
