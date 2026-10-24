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
