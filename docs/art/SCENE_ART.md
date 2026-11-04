# Scene art: maps painted whole (original, drawn by code)

`ui/scene-art.js` paints an outdoor map as one picture instead of tile by tile, so grass, earth and water meet in
organic shapes and buildings are drawn as buildings. A map opts in with `scene: '<name>'`; its tiles still decide
collision, exits and where each thing stands, and the scene paints what the tiles say is there.

- **Layers:** `base` (under everyone) and `over` (tree crowns and the well roof, over people standing behind
  them). Trees with nobody able to walk behind them stay in `base`, so buildings in front still cover them.
- **Water** gets a moving shimmer each frame (`animate`).
- **No image input.** Every pixel comes from shapes, noise and the palette at the top of the file
  (`docs/art/ORIGINAL_ART_PLAN.md` §0; licence note in `assets/LICENSE-enso-art.txt`).
- **Review:** `node tools/preview-scene.js grounds out.png 2` renders the scene to a PNG in Node.

## Scenes

| Scene | Map | What it paints |
|---|---|---|
| `homestead` | `grounds` (Zone 1) | Tokelo's reference (2026-10-26): ruined two-storey stone and timber farmhouse with a collapsed roof, chimney and ivy; the smithy with its forge wall and anvil; the well; tilled plots behind a fence; the overgrown weed field; dry-stone wall with gateposts; the river with shore stones, lily pads, the dock and the footbridge to the road; a dense wood round the edge. |

| `shamefield` | `shamefield` (Chapter One village) | Tokelo's reference (2026-10-31), painted in `ui/scene-shamefield.js`: a dark autumn town on a shelf between cliffs. The dead raven tree on its stone ring in the cobbled square, the church with its bell tower and red windows (NE), the watermill and wheel on the river with two falls (W), the plank bridge (SW, west exit), the stair up the cliff to the chained orchard gate (N), the south gate between raven banners and torches, the well, the covered trough, the market stall, the notice board, the memorial pillar, a fenced bean field with hens, ruins on the ledge, red-leaved trees. Animated: falling water, torch flames, chimney smoke. |

| `overgrown_road` | `road` (Zone 1) | Tokelo's reference (2026-11-01), painted in `ui/scene-road.js`: a bright crossroads in a green wood. The stream down the west side between mossy boulders, with a waterfall at each end and the plank bridge carrying the west track over it; a travellers' camp (stained canvas tent, campfire under a cooking pot, barrel, crate, log seat, lantern posts); three crow banners on posts with hanging lanterns; broken stone walls with ivy (NE and SE, a small one SW); the stone arch on a quiet corner to the east; the covered wagon left by the east track; the signpost at the crossing; green trees with a few red-leaved ones, bushes, stumps, flowers and reeds. Animated: falling water, the campfire and its smoke, lantern flicker. |

| `bakers_lane` | `village_residential_lane` (Baker's Lane, Shamefield) | Tokelo's reference (2026-11-03), painted in `ui/scene-bakers-lane.js`: a dusk lane of timber-framed houses with dark slate roofs and cross gables inside the town wall. The cobbled road from the west gate (round towers either side, raven banners on the wall) with a ring-laid drain where the lane turns south; Oda's bakery with its cream awning, shelves of loaves and bread sign; the domed stone oven with a brick mouth, fire and tall brick chimney; the woodshed stacked with logs; a table of flour and loaves; a cabbage and kale plot under a washing line; Greta's plank smokehouse; a fenced hen yard with a coop and hay; the pig pen with two pigs, a trough and a lean-to; the well; rose beds; lantern posts; bare autumn trees. Animated: the oven fire, lantern flicker, chimney smoke. |
| `kloster` | `briarwell_cloister_court` (Chapter One, above Shamefield) | Tokelo's reference (2026-11-03, "Kloster Sankt Alban"), painted in `ui/scene-kloster.js`: a walled German monastery (Kloster, not a cloister walk). The abbey church with buttresses, pinnacles, lit lancets and a rose window over the great door; the bell tower with its bell; the cloister garth (Kreuzgang) with arcades, hedged rose beds, cypresses and a fountain with a cross; the monks' cells; the refectory; the abbot's house with a cross gable; the cemetery behind a low wall; the herb garden and hop poles; the timber brewery with its copper kettle and fire; the storehouse and woodpile; round corner towers on the curtain wall; the gatehouse with two towers, banners and a cross; a field with a scarecrow outside. Animated: torches, the brewing fire, chimney smoke, the fountain. |

| `cellar`, `farmhouse`, `old_shed`, `well_bottom` | `cellar`, `house`, `shed`, `well` (Zone 1) | Tokelo (2026-11-04, "bring the other areas up to the graphic overhaul"), painted in `ui/scene-homestead-rooms.js`: the cellar's fieldstone vault with barrels, crates, fallen stone, the jar shelf, the bedroll and its candle, black feathers under a crack of grey light, the tallies and the scratched-out inscription, steps up; the house's oak boards and limewashed walls over a timber dado, the kitchen counter, dresser, table set for two, the stone hearth with banked embers, red rug, armchair, books turned to the wall, the travelling chest, the made bed, steps down and the front door; the shed's boards, tool rack with the upside-down shears, seed crates, workbench and rain barrel; the round wet shaft of the well with rubble, the seep pool, the rope in daylight and the carved open circle. Animated: candles and embers. |
| `tollway`, `allotment`, `orchard`, `featherwatch` | Chapter One maps of the same names | Same request, painted in `ui/scene-ch1-wilds.js` with the road's painters (`SA.roadKit`): the tollway at dusk (toll booth with its shutter hanging, the warning post with the sun breaking a crown, scattered goods, the river with bank stones and reeds, the plank bridge, the chained barricade of overturned carts); Shane's raised beds of mint, yarrow and the purple one, his patched shack with the seizure notice and mint pots, the watch's evidence wagon with the ledger tied on top, a scarecrow; the orchard's rows of apple trees, windfalls, the old causeway wall with buttresses, the paved causeway and the scraped circle, the ribbon on the oldest tree; the Featherwatch climb at night through firs and crags, stone steps, the broken cage, the roost cage with its crow and the axle perch. |
| `warden_sanctuary`, `seal_chamber` | `sanctuary`, `seal_chamber` (Featherwatch) | Same request, painted in `ui/scene-featherwatch-roost.js` with the room painters (`SA.roomKit`): the Warden's hall of an old hill prison with straw and feathers, arrow slits and moonlight, perches, cages rebuilt from prison bars (the gray crow with the splinted wing, the empty one with a water dish), his table with the log and candle, feed barrel, splint shelf, bedroll, a crow-circle in the floor, torch brackets and the black seal door with its glowing feather hollow; the Seal Chamber's basalt floor with ember veins running in to the First Seal, a ring of black stone left open at the top. Animated: candles, torches, embers. |

These ten maps keep their tiles exactly as before, so exits, spawns, NPCs, quests, forage spots and fights stand where they
did. Where one tile name means different things on different maps, the scene picks by the interactable standing there
(`featherwatch`: a `cage` with a `*perch*` id is the axle perch; in the sanctuary, `rug` is the Warden's bedroll).

Tile names the homestead adds (map `legend`): `tilled_soil`, `drystone_wall`, `dock`, `footbridge`, `cart`, `stump`,
`bush`, `anvil`.

Tile names Shamefield adds (its map `legend`): `cobble`, `waterfall`, `cliff` (a ledge above the village in the top half
of the map, a drop below it in the bottom half), `ruin`, `stone_stairs`, `raven_tree`, `banner`, `crops`, `chickens`,
`hen_hut`, `house` (shingle roof), `slate_house`, `watermill`, `mill_wheel`, `church`. A building is one solid block of
its tile; the painter finds the block and draws the whole building over it.

Tile names the Overgrown Road adds (its map `legend`): `waterfall`, `bridge` (a block; the painter draws the whole bridge), `bank_rocks`,
`reeds`, `flowers`, `red_tree`, `bush`, `stump`, `ruin`, `arch` (two piers two cells apart; the arch spans the cell between and hangs over
anyone walking through), `tent`, `campfire`, `log`, `banner` (a crow banner with a lantern), `lantern`, `wagon`, `signpost`.

Scenes kept in their own file use `ENSO.sceneArt.kit` (the shared painters) and add themselves to `scenes`; load the file
after `ui/scene-art.js` in `world.html`, and in `tools/preview-scene.js` and the tests.

To give another map a scene: add a function to `scenes` in `ui/scene-art.js` (reuse the painters there), set
`scene` on the map, and preview it.

Tile names Baker's Lane adds (its map `legend`): `cobble`, `drain`, `town_wall`, `wall_banner`, `house`, `bakery`, `smokehouse`, `oven`,
`woodshed`, `bread_table`, `sacks`, `laundry`, `cabbages`, `coop`, `chickens`, `hay`, `pig_mud`, `pig_shed`, `mounting_stone`, `rose_bed`
(plus the common `grass`, `dirt_path`, `fence`, `well`, `lantern`, `tree`, `dead_tree`, `bush`, `stump`, `barrel`, `crate`). Buildings and
yards are blocks; the painter finds each block and draws it whole.

Tile names the Kloster adds (its map `legend`): `flagstones`, `gate` (walkable; the gatehouse hangs over it), `kloster_wall` (curtain wall:
a front face in a row, a wall walk seen from above in a column), `wall_tower`, `gatehouse`, `abbey_church`, `bell_tower`, `monks_cells`
(a range seen along its ridge), `refectory`, `abbots_house`, `brewery`, `storehouse` (ranges seen from the front), `arcade` (the
cloister walk; a flagstone gap in the south arcade is the way into the garth and the roof hangs over it), `hedge_bed`, `cypress`,
`cloister_fountain`, `herb_bed`, `hop_trellis`, `grave`, `grave_cross`, `low_wall`, `woodpile`, `bench`, `crops`, `scarecrow`.
