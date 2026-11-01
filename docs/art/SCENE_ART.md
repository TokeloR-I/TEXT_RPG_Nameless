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
