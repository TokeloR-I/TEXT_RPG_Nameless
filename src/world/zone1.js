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
 *   interactables { id, kind: 'inspect', x, y, name, text } (they block the tile)
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
        'Q': { name: 'scarecrow', solid: true }
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
                'T,,,PPdPP,,,,,:,,,,,,,,O,,,,,T',
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
                'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
            ],
            spawns: {
                from_house: { x: 14, y: 4, facing: 'down' }
            },
            exits: [
                { id: 'grounds_house_door', x: 14, y: 3, trigger: 'step', toMap: 'house', toSpawn: 'from_grounds' }
            ],
            interactables: [
                { id: 'grounds_scarecrow', kind: 'inspect', x: 16, y: 15, name: 'Scarecrow',
                    text: "A scarecrow in a farmer's coat, arms spread wide. Crows line its arms and don't stir as you come close. Its sack-cloth face is turned toward the road." },
                { id: 'grounds_window', kind: 'inspect', x: 11, y: 3, name: 'Window',
                    text: 'Through the grime you can just make out the kitchen table, set for two.' },
                { id: 'grounds_shed_door', kind: 'inspect', x: 6, y: 7, name: 'Shed door',
                    text: 'The shed door is swollen tight in its frame.' },
                { id: 'grounds_well', kind: 'inspect', x: 23, y: 7, name: 'Old well',
                    text: 'A dark shaft. Cold air breathes up out of it. A rope is still tied to the crank.' }
            ]
        }
    };

    const zone1 = {
        start: { map: 'cellar', spawn: 'start' },
        tileset,
        zones: {
            forgotten_homestead: { name: 'The Forgotten Homestead', mapIds: ['cellar', 'house', 'grounds'] }
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
