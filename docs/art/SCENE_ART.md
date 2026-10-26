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

Tile names the homestead adds (map `legend`): `tilled_soil`, `drystone_wall`, `dock`, `footbridge`, `cart`, `stump`,
`bush`, `anvil`.

To give another map a scene: add a function to `scenes` in `ui/scene-art.js` (reuse the painters there), set
`scene` on the map, and preview it.
