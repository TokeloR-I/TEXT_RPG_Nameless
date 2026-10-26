# Sprites: the layered character pipeline (GFX-1, #106)

The player is drawn from **sprite sheets**, stacked in layers and coloured by the cosmetics chosen in the
creator. The creator preview and the walking character call the same function
(`ENSO.sprites.drawCharacter`, `ui/sprites.js`), so what you pick is exactly what you play.

Everything still ships as plain scripts: `world.html` loads them, and `npm run build` inlines them into the
single-file game. No libraries, no build step for art.

| File | What it is | Owner |
|---|---|---|
| `ui/sprites.js` | Pipeline: manifest, composition, palettes, loading/caching, fallback, validation | Wren |
| `assets/sprites/player-placeholder.js` | **Placeholder** sheets (generated). Original programmer art for testing the pipeline | Wren (generator) |
| `tools/gen-placeholder-sprites.js` | Makes the placeholder file. Edit this and re-run, never the output | Wren |
| `assets/sprites/*.js` (new files) | Authored art, same format | Sable (art direction) |

`npm run world` and `npm test` (`tests/35-sprites.test.js`) validate every registered sheet.

## The character manifest

`ENSO.spriteManifest.player` (in `ui/sprites.js`):

- **frame** `{ w: 24, h: 32 }`. Every layer of a character uses the same frame size.
- **anchor** `{ x: 12, y: 30 }`. The pixel that stands on the ground point (centre of the feet).
- **animations**: steps, each `{ pose, ms, oy }`. `pose` names the frame to show, `ms` is how long,
  `oy` is a whole-pixel vertical offset for the whole body (bob, recoil, kneeling).
  - **Looping** (a plain list): `idle`, `walk`.
  - **One-shot** (`{ once: true, then?, steps }`), from GFX-2: `attack` (windup → strike), `cast` (hands up),
    `hit` (recoil), `death` (recoil → kneel, no `then`, so it holds the last step). After a one-shot animation
    with `then`, the character returns to that animation.
  - `animationDone(character, anim, elapsed)` tells a front end when a one-shot animation has finished, for
    example to chain `attack` → `hit`.
  - The renderer only looks names up and knows no game rules. **The front end decides when to play an
    animation.** In the world battle screen (`ui/world-ui.js`, `actorReacts`), an attack, or a skill whose
    data says `damage_type: 'physical'`, plays `attack`. Any other skill, or controlling an enemy, plays
    `cast`. Losing HP plays `hit` afterwards, and the game ending in defeat plays `death`. GFX-4 replaces this
    with structured combat events.
- **Body poses** in the placeholders: `stand`, `stepA`, `stepB`, `windup`, `strike`, `cast`, `hit`, `kneel`.
  Hair and clothes use one frame per facing and follow the body through `oy`.
- **layerOrder** per facing, bottom to top:
  - down, left, right: `hairBack → body → outfit → hairFront`
  - up: `body → outfit → hairBack → hairFront` (seen from behind, long hair falls over the clothes)
- **layers**: layer → sheet id template, filled in from the cosmetics:
  `body: player.body`, `outfit: player.outfit.{outfit}`, `hairBack: player.hair.{hairStyle}.back`
  (optional: short cuts have none), `hairFront: player.hair.{hairStyle}.front`.
- **fallbacks**: what to draw if a sheet is missing (`player.outfit.0`, `player.hair.0.front`).
  A missing sheet is reported once in the console and never leaves a hole.

The cosmetics indices follow `HAIR_STYLES`, `HAIR_COLOURS` and `OUTFITS` in `ui/world-ui.js`. Skin is
`appearance` (0–3). Saves already keep all of them.

## Sheets

`ENSO.spriteSheets[id] = { layer, name?, placeholder?, frames }`.

**Frame keys.** `"<facing>.<pose>"` (for example `down.stepA`), or just `"<facing>"` for a layer that looks the
same in every pose (hair, most clothes). The pipeline tries the specific key first. A layer with no frame for a
facing is skipped for that facing (for example rear hair facing up).

**Mirrors.** `"right": { "mirror": "left" }` reuses the left frame flipped. The placeholders store only
down, up and left.

### Palette sheets (what the placeholders use)

Each frame is 32 strings of 24 characters. Each character is a colour role and `.` is transparent:

| Role | Meaning | Coloured by |
|---|---|---|
| `k` | outline | fixed |
| `e` | eyes | fixed |
| `s` `S` | skin, skin shade | skin tone (`appearance`) |
| `h` `H` `L` | hair, shade, highlight | hair colour |
| `c` `C` | cloth, shade | outfit (Traveler and Armored use the class colour) |
| `a` | accent / trim | outfit |
| `m` `M` | metal, shade | outfit |
| `p` `b` | trousers, boots | fixed |

Recolouring is free: one sheet serves every skin tone, hair colour and class. Palettes live in
`paletteFor()` in `ui/sprites.js`.

### Image sheets (PNG art)

```js
ENSO.spriteSheets['player.hair.3.front'] = {
    layer: 'hair_front', src: 'assets/sprites/hair-straight-fringe.png',
    grid: { cols: 4 },                         // cells are frame-sized (24x32), numbered left to right, top to bottom
    frames: { down: 0, up: 1, left: 2, right: { mirror: 'left' } },
    fallback: 'player.hair.3.front.placeholder' // REQUIRED: drawn while the picture loads, or if it fails
};
```

An image is loaded once and cached, and it never blocks drawing. Until the image is ready, the character uses
its `fallback` sheet. Image sheets are drawn as authored: they are not recoloured, so you need one sheet per
colour variant, or use a palette sheet.

**Single-file build:** the build inlines scripts, not PNGs. For art that must work in the double-click file,
use a `data:image/png;base64,...` URL as `src`, or a palette sheet.

## The player: the ENSO doll (original, drawn by code)

`assets/sprites/enso-player.js` draws the player and every villager. Nothing is stored as pixels: each frame is
built on first use from a pose skeleton (head, shoulders, elbows, hands, hips, knees, feet, weapon angle) and
shapes on it, shaded from the top left, with darker edges where parts overlap and a coloured outline.
`node tools/preview-enso-player.js out.png 4 '{"outfit":2}'` writes a contact sheet for review.
This is the first step of `docs/art/ORIGINAL_ART_PLAN.md`; Sprite Forge art can replace or refine it later.

- **Frames:** 64×64, feet at (32, 43), the 19 poses `stand`, `walk1-6`, `ready1-4`, `slash1-4`, `parry`, `hit`,
  `down2`, `down3` in four facings (`left` mirrors `right`). Animations: `idle`, `walk`, `ready`, `attack`, `cast`,
  `hit`, `death` and the action-combat `swing`, `heavy`, `dodge`, `guard`, `hurt`.
- **One layer, generated per shape:** sheet ids are `enso.<hair>.<outfit>.<hat>.<weapon>.<shield>`; they come from
  `ENSO.sheetProviders` (a provider builds a sheet the first time its id is asked for). Colours are palette roles,
  so skin, hair colour, outfit colour and metal never need another sheet. The character brings its own
  `paletteFor` and `sheetFields`.
- **Choices** (`manifest.enso.options`): 4 skins, 9 hair styles × 12 colours, 6 outfits × 10 colours, 7 hats,
  20 weapons (sword, axe, mace, spear × 5 metals), 13 shields (none + 3 shapes × 4 colours). Cosmetics fields:
  `hairStyle`, `hairColor`, `outfit`, `outfitColor`, `hat`, `weapon`, `shield`. Any index wraps, so old saves load.
  Picking a class suggests a matching outfit, weapon and shield in the creator.
- **Villagers** (`person()` in `ui/world-render.js`) use the same doll, unarmed (`weapon: -1`), in their own colours.

## Mana Seed (removed 2026-10-26)

The Mana Seed paper doll and tiles were removed on Tokelo's decision to make ENSO's own art. Their permission
record is kept in `docs/art/history/LICENSE-manaseed.txt`. Never use that art, or screenshots that show it, as
input for any image generator.

## Drawing rules

- Whole pixels only: `imageSmoothingEnabled = false`, positions rounded, integer `scale`. No blur.
- Composites are cached per (layers, frame, palette), so each frame costs one `drawImage`.
- `drawCharacter(g, x, y, { appearance, cosmetics, className, facing, anim, scale }, time)`. (x, y) is the
  ground point under the feet.

## Replacing a placeholder

1. Make the art at 24×32 per frame, following the layer order above, so that hair, clothes and body line up
   on the same anchor.
2. Register it under the same id in a new `assets/sprites/<name>.js`. Load that file in `world.html` **after**
   `player-placeholder.js` and before `ui/sprites.js`. Authored sheets win over placeholders whatever the
   load order.
3. Run `npm run world` and `npm test`. They check the frame sizes, palette roles, mirrors and image fallbacks,
   that every hairstyle looks different, and that every cosmetic choice changes the picture.

## Licensing

The placeholder sprites are original and generated by `tools/gen-placeholder-sprites.js`, under the repository's
licence. Any external art added later needs its source and licence recorded here, in this table:

| Asset | Source | Licence |
|---|---|---|
| `assets/sprites/player-placeholder.js` | Generated in-repo | Repository licence |
| `assets/sprites/enso-player.js` | Drawn by code in-repo, no image input (`assets/LICENSE-enso-art.txt`) | Repository licence |
