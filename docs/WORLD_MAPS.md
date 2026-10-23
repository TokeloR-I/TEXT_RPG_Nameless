# Adding maps and encounters to the world

How the explorable world (`world.html`) is put together, and how to add to it.
Design: [docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md](design/ZONE_1_FORGOTTEN_HOMESTEAD.md).

## Who owns what

| Part | File | Job |
|---|---|---|
| Map data | `src/world/zone1.js` | Zones, maps, tiles, spawns, exits, objects, enemies. Pure data. |
| World model | `src/world/world.js` | Collision, tile-step movement, facing, transitions, pickups, contact fights, validation. No DOM. |
| Engine | `src/engine/world.js` + the rest of the engine | Inventory, fights, XP, and the run's flags (`collected`, `defeated`). The rules never change for the world. |
| Front end | `ui/world-ui.js`, `ui/world-render.js`, `world.html`, `world.css` | Keyboard input, drawing, dialogs, the battle overlay. |

Walking never calls the engine, so exploring can't advance rounds, statuses or resource regen.

## The quick loop

1. Edit `src/world/zone1.js`.
2. `npm run world` prints every map with its objects and runs the validator (`npm run world -- grounds` for one map).
3. `npm test` runs the same validator plus the walk-through tests.
4. Open `world.html`. If the data is broken, the page shows the problem list instead of the game.
   Console helpers: `ensoDebug.start('rogue')` skips the title, `ensoDebug.goto('road', 'from_grounds')` jumps to a spawn.

## A map

```js
shed: {
    zoneId: 'forgotten_homestead',   // must also be listed in zones.<zone>.mapIds
    name: 'The Old Shed',            // shown in the banner, HUD and pause menu
    ambient: { darkness: 0.55, lantern: 4.5 },   // optional: darkness 0–1, lantern = light radius in tiles
    legend: { 't': { name: 'workbench', solid: true } },  // optional per-map overrides of the tileset
    tiles: [                         // one string per row, all the same width; (0,0) is top left
        'WWWWWWWWW',
        'WSS==xx=W',
        'W=t===b=W',
        'WWWWDWWWW'
    ],
    lights: [{ x: 4, y: 5, radius: 2 }],      // optional fixed light in dark maps
    spawns:   { from_grounds: { x: 4, y: 2, facing: 'up' } },
    exits:    [{ id: 'shed_door', x: 4, y: 3, trigger: 'step', toMap: 'grounds', toSpawn: 'from_shed' }],
    interactables: [ ... ],
    encounters:    [ ... ],
    boundaries:    [ ... ]
}
```

**Tiles.** Each character maps to `{ name, solid }` through the shared `tileset` at the top of `zone1.js` (or the map's `legend`).
The `name` picks the painter in `ui/world-render.js`. A new tile needs a tileset entry and a painter. Without a painter it is drawn bright magenta, so you can't miss it.
Objects drawn on a floor (barrels, beds, trees) need a `BASE` entry naming their usual floor. The renderer uses the floor around them.

**Spawns** are named arrival points. Face the player *away* from the door they came through.

**Exits** connect maps:
- `trigger: 'step'`: walking onto the tile (doorways, stairs, map edges). Must be on a walkable tile.
- `trigger: 'interact'`: pressing E while facing it (the well, the rope). Needs a `prompt` (the hint text, e.g. `'Climb down the well'`).
- Optional `text` is shown when you arrive.

Every exit needs a partner going back. The landing spawn must be next to the partner, and the partner's landing spawn must be next to this exit. The validator enforces this, so transitions are always symmetrical and you can never land on an exit.

## Things on a map

All of them occupy one tile and block movement while they're there.

```js
// look at it
{ id: 'cellar_tallies', kind: 'inspect', x: 5, y: 2, name: 'Scratched wall', text: '...' }
// take it once per run (an item that exists in src/data.js itemDefinitions; adaptiveLoot still applies)
{ id: 'shed_bandages', kind: 'pickup', x: 2, y: 3, item: 'Bandages', name: 'Bandages', sprite: 'bundle', text: '...' }
// a visible enemy: walking into it starts a normal fight; E on it shows `text`
{ id: 'road_wolf', x: 13, y: 10, name: 'Hungry Wolf', enemies: ['hungry_wolf'], trigger: 'contact', sprite: 'wolf', text: '...' }
```

- `sprite` is optional and draws something on top of the tile (`feathers`, `bundle`, `bottle`, `rats`, `wolf`). Objects on solid furniture (a shelf, a table) usually don't need one.
- Encounters use existing enemy keys from `src/data.js`. Not `James_Newton` (test dummy). Not next to a spawn: a fight must never be unavoidable at an entrance.
- Beaten encounters and taken pickups stay gone for the run. The engine keeps those flags in `engine.world`.
- After you **flee**, that enemy ignores contact until you step out of reach (not adjacent, diagonals included).
- Battle cards pick a creature drawing by enemy key (`CREATURE_FOR` in `ui/world-render.js`). Unknown keys get a generic shade.

**Boundaries** are walkable areas that show a notice once each time you enter them. Use one at the edge of a zone whose next area isn't built yet:

```js
{ id: 'road_zone_edge', x: 5, y: 21, w: 10, h: 1, title: 'Beyond the Homestead', text: '... (Coming later.)' }
```

## What the validator checks

`validateWorld(world, data)` in `src/world/world.js` covers:
- Ids are unique across the whole world.
- Every map is listed in its zone, and every map is reachable from `start`.
- Rows are the same width, and every tile character is known.
- Spawns are in bounds, not in collision, not on an object and not on an exit.
- From every spawn you can reach every other spawn, every exit and every object.
- Exits point at real maps and spawns, `step` exits are walkable, and `interact` exits have a prompt.
- Transitions are reversible and symmetrical.
- Objects have known kinds and text, and pickup items exist.
- Encounters use real enemies with `trigger: 'contact'`, aren't the test dummy and aren't next to a spawn.
- Boundaries are reachable.

## Placing a new encounter, step by step

1. Pick existing enemies (`node -e "console.log(Object.keys(require('./src/data.js').enemies))"`).
   Don't change their stats: balance numbers need a design decision.
2. Add the entry to the map's `encounters` on a walkable, reachable tile, away from spawns.
3. `npm run world` and `npm test`.
4. Optional: check it's beatable at the level players will meet it, e.g. at level 1 with QA's smart bot:
   ```js
   const { GameEngine } = require('./src/engine.js'), { choose } = require('./qa/scripts/smartbot.js');
   let wins = 0;
   for (let seed = 1; seed <= 100; seed++) {
       const g = new GameEngine({ seed }); g.start(); g.input('mage'); g.enterWorld();
       g.worldEncounter('road_wolf', ['hungry_wolf']);
       for (let i = 0; i < 200 && g.mode === 'combat'; i++) g.input(g.combat.awaitingContinue ? 'c' : choose(g));
       if (g.world.lastResult === 'victory') wins++;
   }
   console.log(wins + '%');
   ```

## Known limits (deliberately deferred)

- **Battle text.** The battle overlay shows the engine's prose and strips the text game's own menu lines. Typed events (gap G1 in `architecture/TECHNICAL_FEASIBILITY.md`) would replace that filter.
- **Commands (done, Phase 1 slice 2).** The battle, evolution and item menus come from `engine.getAvailableActions()` through `ui/battle-menu.js`, and choices go back as `engine.act()` actions with combatant ids. The overlay never decides what is usable and never derives rules from map coordinates.
- **Not built yet.** No saving, NPC dialogue or random encounters (design §10). Legacy rooms (`src/data.js` `rooms`) still drive the text game and aren't placed in the world yet; re-homing them is a later content pass.
