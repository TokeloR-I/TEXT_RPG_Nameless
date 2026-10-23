/* =========================================================================
 * Enso's Last Stand — WORLD DATA: Zone 1, the Forgotten Homestead
 * Design: docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md. Pure data, no logic.
 *
 * A map is a grid of one-character tiles (`tiles`, row by row, y downwards).
 * What a character means comes from `tileset` below, or from the map's own
 * `legend` if it overrides one. Coordinates are tile columns/rows from 0,0
 * at the top left. Things placed on a map:
 *   spawns        named arrival points { x, y, facing }
 *   exits         { id, x, y, trigger: 'step'|'interact', toMap, toSpawn }
 *   interactables { id, kind: 'inspect'|'pickup', x, y, name, text, item?, sprite? } (they block the tile;
 *                 a pickup gives `item` once per run through the engine, using the normal loot rules)
 *   encounters    { id, x, y, name, enemies: [enemy keys], trigger: 'contact', sprite, text? }
 *                 visible enemies: walking into one starts a normal fight; E on it shows `text`
 *   boundaries    { id, x, y, w, h, title, text } walkable area that shows a notice when you enter it
 *   lights        { x, y, radius } for dark maps (presentation only)
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
            ambient: { darkness: 0.72, lantern: 4.5 },
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
            ambient: { darkness: 0.5, lantern: 5.5 },
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
            ambient: { darkness: 0.22, tint: 'rgba(40, 46, 92, 0.28)' },
            tiles: [
                'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
                'T,,,,,,,,,hhhhhhhhhh,,,,T,,,,T',
                'T,,T,,,,,,hhhhhhhhhh,,,,,,,,,T',
                'T,,,,,,,,,HnHHDHHnHH,,,,,,,,,T',
                'T,,,,,,,,,,,,,:,,,,,,,,,o,,,,T',
                'T,,,ppppp,,,,,:,,,,,,,,,,,,,,T',
                'T,,,ppppp,,,,,:,,,,,,,,,,,,,,T',
                'T,,,PPDPP,,,,,:,,,,,,,,O,,,,,T',
                'T,,,,,:,,,,,,,:,,,,,,,,:,,,,,T',
                'T,,,,,::::::::::::::::::,,,,,T',
                'T,,T,,,,,,,,,,:,,,,,,,,,,,T,,T',
                'T,,,,,,,,,,,,,:,,,,,,,,,,,,,,T',
                'T,,,,,,,,,,o,,:,,,,ffffff,ff,T',
                'T,"""""""",,,,:,,,,,,,,,,,,,,T',
                'T,"""""""",,,,:,,,,,,,,,,,,,,T',
                'T,"""""""",,,,:,Q,,,,,,,,,,,,T',
                'T,"""""""",,,,:,,,,,,,,,,,,,,T',
                'T,,"""""",,,Y,:,,,,,,,,,~~~~,T',
                'T,,,,,,,,,,,,,:,,,,,,,,,~~~~,T',
                'T,,T,,,,,,,,,,::::::,,,,,~~,,T',
                'T,,,,,,,,,,,,,,,,,,,:,,,,,,,,T',
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
                { id: 'grounds_well', x: 23, y: 7, trigger: 'interact', toMap: 'well', toSpawn: 'from_top',
                    text: 'You test the rope, then climb down, hand over hand, into the cold.' },
                { id: 'grounds_road', x: 20, y: 21, trigger: 'step', toMap: 'road', toSpawn: 'from_grounds' }
            ],
            encounters: [
                { id: 'grounds_weed_rats', x: 5, y: 15, name: 'Rust Rats', enemies: ['rust_rat', 'rust_rat'], trigger: 'contact', sprite: 'rats',
                    text: 'Something rustles in the weeds: rats, two of them, with rust-coloured fur. They haven\'t seen you. Walk into them to fight.' }
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
            ambient: { darkness: 0.78, lantern: 3.5 },
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
                { id: 'well_rope', x: 4, y: 1, trigger: 'interact', toMap: 'grounds', toSpawn: 'from_well',
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
            ambient: { darkness: 0.3, tint: 'rgba(58, 62, 80, 0.32)', fog: 'bottom' },
            tiles: [
                'TTTTTTTTT:TTTTTTTTTT',
                'TTTTT,,,,:,,,T,TTTTT',
                'TTTTT,T,,::,,,,TTTTT',
                'TTTTT,,,,,:,,,,TTTTT',
                'TTTTTT,,,,:,,,TTTTTT',
                'TTTTT,,,,::,,o,TTTTT',
                'TTTTT,,,,:,,,,,TTTTT',
                'TTTTT,Y,,:,,,,,TTTTT',
                'TTTTT,,,,::,,,,TTTTT',
                'TTTTT,,,,,::,,,TTTTT',
                'TTTTT,,,o,,:,,,TTTTT',
                'TTTTT,,,,,,:,,TTTTTT',
                'TTTTT,T,,,::,,,TTTTT',
                'TTTTT,,,,,:,,,,TTTTT',
                'TTTTT,,,,::,,,,TTTTT',
                'TTTTT,,x,:,I,,,TTTTT',
                'TTTTT,,,,:,,,,,TTTTT',
                'TTTTTT,,,::,,,,TTTTT',
                'TTTTT,,,,,::,,,TTTTT',
                'TTTTT,,T,,,:,,,TTTTT',
                'TTTTT,,,,,,::,,TTTTT',
                'TTTTT,,,,,,,:,,TTTTT'
            ],
            spawns: { from_grounds: { x: 9, y: 1, facing: 'down' } },
            exits: [
                { id: 'road_back', x: 9, y: 0, trigger: 'step', toMap: 'grounds', toSpawn: 'from_road' }
            ],
            encounters: [
                { id: 'road_wolf', x: 13, y: 10, name: 'Hungry Wolf', enemies: ['hungry_wolf'], trigger: 'contact', sprite: 'wolf',
                    text: 'A gaunt wolf, nosing at the verge. It hasn\'t seen you. You could walk on by, or walk into it.' }
            ],
            interactables: [
                { id: 'road_signpost', kind: 'inspect', x: 11, y: 15, name: 'Signpost',
                    text: 'The letters have weathered away. One arrow is left, pointing on down the road.' },
                { id: 'road_cart', kind: 'inspect', x: 7, y: 15, name: 'Overturned handcart',
                    text: 'A handcart tipped on its side. Whatever it carried was taken, or walked off on its own.' }
            ],
            boundaries: [
                { id: 'road_zone_edge', x: 5, y: 21, w: 10, h: 1, title: 'Beyond the Homestead',
                    text: 'The road runs on into the fog, toward the wider world. The way beyond isn\'t open yet. (Coming later.)' }
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

    (ENSO.world || (ENSO.world = {})).zone1 = zone1;
    if (isNode) module.exports = zone1;
})(typeof window !== 'undefined' ? window : globalThis);
