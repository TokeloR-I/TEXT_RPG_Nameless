# Rendering: world layers and combat effects (GFX-3 and GFX-4, #106)

Presentation only. Nothing here changes game state, and both are vanilla Canvas with no libraries.
For sprites, see [SPRITES.md](SPRITES.md).

## World frame order (`ui/world-render.js`, GFX-3)

1. Floor and static tiles (cached per map), then animated tiles.
2. **Hook `ground`**: decals, footprints and extra shadows.
3. **People, enemies, objects and the player, back to front** (`drawOrder`). Whoever stands lower on the screen
   is drawn later, so they overlap whoever stands behind them. The player goes in front of an object on the same row.
4. **Foreground overhangs** (`OVERHANGS`). The crowns of `tree`, `fruit_tree` and `dead_tree` reach into the
   tile above and are drawn over whoever stands there. These tiles are solid (tested), so no one ever stands
   inside one.
5. **Hook `foreground`**: weather or overhead effects, in map pixels.
6. Objective marker.
7. Tint, darkness with light holes, **coloured glow** (with flicker), and **ambient particles**.
8. **Hook `light`**: screen-space flashes, in screen pixels.
9. Vignette and transition fade.

**Hooks.** `renderer.addHook(stage, fn)` returns a function that removes the hook.
`fn(g, { map, time, ox, oy, view, dark })` runs inside `save()`/`restore()`.

### Map data (`src/world/*.js`)

- `ambient.particles: { kind, count }`. `kind` is `dust`, `fireflies`, `embers` or `feathers`, and `count` is at
  most 60. Particles are deterministic for a given time, so replays and captures match.
- `lights: [{ x, y, radius, color? }]`. A `color` (an `rgba(...)` string) adds a warm, flickering glow.
- Any placed object can carry `light: { radius, color? }`. A lantern-carrying NPC is one line of data.
- Tiles listed in `TILE_LIGHTS` (today: `fireplace`) give light wherever they are placed.

## Combat effects (`ui/combat-fx.js`, GFX-4)

Effects are driven by **presentation events**, named after the Phase 1 structured events. When the engine
emits those (spec PR-3), they can be fed in directly:

| Event | Effect |
|---|---|
| `cast { actorId, targetIds, damageType }` | Slash (physical) or orb (magic) travelling from actor to each target |
| `damage { targetId, amount, damageType }` | Number coloured by damage type, card flash and shake |
| `heal { targetId, amount }` | Green number and ring |
| `resource { targetId, amount, resource }` | Small blue number (gains only) |
| `death { targetId }` | Burst; the card fades |
| `status.applied` / `status.removed { targetId, status, category }` | Ring in the category's colour; the name floats up when applied |
| `combat.presentation { kind: 'dash', actorId, anchorId }` | Streak (the engine already emits this one) |

**Until the engine emits these events**, `eventsFromStates(before, after, action, data, engineEvents)` derives
them from two `getState()` snapshots taken around each `act()`. The engine drops dead units from its lists:
a unit that disappears while the fight goes on, or after a win, counts as killed. One that disappears after
fleeing does not.

**Timing.** Hits land when the projectile arrives (`STYLE.durations.cast`), and deaths follow the hit.
**Looks.** Every colour and duration is in `STYLE`, so restyling needs no code change.

**On screen.** One overlay canvas sits above the battle panel (`pointer-events: none`). Units are found by
`data-unit-id` (`player`, `enemy_0`, …). Flash, shake and fade are applied as styles on the unit's card.

## HD-2D pipeline (2026-10-24, Tokelo's HD-2D brief)

Tokelo pre-approved changing the stack to reach the HD-2D target (*Sea of Stars*, *Octopath Traveler*).
**Decision:** we keep the custom Canvas renderer and add a **WebGL compositor** on top of it. We don't adopt
an engine. This keeps the single double-click file and the headless engine, and it gives real lighting
and post-processing. It extends Keel's 2026-10-24 decision ("Canvas 2D for the world") and doesn't reverse it.

| File | Role |
|---|---|
| `ui/world-render.js` | Draws the pixel-art scene on an offscreen 2D canvas at native size. With `post: true`, it returns `{ lights, grade, fade }` instead of painting darkness and a vignette. |
| `ui/postfx.js` | WebGL compositor (see below). Also provides `ENSO.gfx.createView`, the world view the front end uses. |
| `ui/tiles-hd.js` | Detailed painters: grass, cobbles, paths, flagstones, clay roofs, half-timber walls, lit windows, trees, stone walls, water, fences, lanterns. Also the cast-shadow and contact-occlusion pass. |

`ui/postfx.js` does the following:
- The scene is sampled nearest-neighbour at full display resolution, so the pixels stay crisp.
- Up to 24 coloured point lights are applied as smooth falloff.
- Bloom: a bright pass, then a half-resolution and a quarter-resolution blur.
- Tilt-shift depth of field: the top and bottom of the screen soften.
- Colour grading: exposure, contrast, saturation, and split toning (cool shadows, warm highlights).
- A vignette and fades.

- **Per-map look:** `ambient.grade` in map data sets the grade, for example `{ ambient: 0.78 }` for a lantern-lit
  evening. Dark maps (`ambient.darkness`) get a lower ambient level, colder shadows and stronger bloom automatically.
- **Lights:** these come from tiles (`TILE_LIGHTS` plus `ENSO.tilesHD.lights`: fireplaces, ovens, lanterns, windows),
  `map.lights`, objects with `light`, the player's lantern in dark places, and the glowing hands.
- **Quality:** `ENSO.gfx.setQuality('high' | 'low')`, stored in `localStorage['enso.gfx']`. It applies on the next
  load, because a canvas can't switch back from WebGL to 2D. `low`, or no WebGL, draws plain canvas as before.
- **Replacing painters with PNG tilesets:** this works one tile name at a time. Map data doesn't change.

Captures are in `docs/captures/hd2d/`.
