# ENSO's Last Stand — Zone 1: Forgotten Homestead
**Implementation-ready design specification** · Vaelis, Lead Game Designer · 2026-10-23
**Status:** Creative Director APPROVED: cellar beneath a house; connected explorable world maps; Pokémon/classic-JRPG-style free exploration with separate turn-based combat; Zone 1 is larger than the cellar. This document authorizes design direction. Code work proceeds through normal developer assignment, PR and tests per AGENTS.md.

## 1. Design objective and boundaries
Replace the six-room, command-driven corridor as the *primary world experience* with a reusable **map → zone → region** hierarchy. Begin in the cellar of an abandoned house, walk through its interior and out into a connected homestead environment. Preserve the existing deterministic JavaScript rules engine, class evolution, status/damage/resource math, non-positional turn-based combat, seeded RNG and old text UI during migration. Do not replace the game with real-time combat, grid tactics or a giant open world.

**Map:** one contiguous navigable tile/collision space, e.g. cellar, house interior, grounds, shed, well.
**Zone:** connected set of maps with common theme and progression, e.g. Forgotten Homestead.
**Region:** collection of zones, future scope. Crow-Touched Warden remains the first regional boss, **not** the mandatory endpoint of the opening cellar or Zone 1 slice.

The original Collapsed Wine Cellar, Cellar Tunnels, Stagnant Chamber, Ritual Chamber and Warden's Roost are **legacy content to preserve and re-home**, not delete. Their new placement is a separate later content pass. Existing CLI/text runs must remain playable during implementation.

## 2. Zone 1 playable geography (first vertical slice)
Topology and required connections (this is **map adjacency**, not restricted movement along lines):

```
       [CELLAR]  (start; stair exit)
           |
    [HOUSE INTERIOR] (main floor; cellar stair, front door)
           |
    [HOMESTEAD GROUNDS] (central exterior hub)
       /      |       \
   [SHED]  [OLD WELL]  [OVERGROWN ROAD → zone boundary]
```

All five named maps must be freely navigable within their collision boundaries. The old well is a small explorable map or interaction area, **not** a mandatory second dungeon. The road ends at a clear **Zone 1 boundary / future-area transition**, not an invented fully playable Zone 2. No mandatory boss at that boundary in the first slice. The shed and well are optional branches; return to the grounds must work. Player can return to house and cellar after reaching exterior.

### 2.1 Cellar — start map
- Player begins on a navigable cellar floor, initially not in combat.
- Required: stairs to house, at least two inspectable objects (one environmental clue, one ordinary object), one visible obstruction/collision boundary, contextual movement/interact hints.
- No mandatory encounter before the player learns movement and interaction.
- Story hook: evidence that something unusual occurred; **do not establish a definitive origin, character identity or culprit** in placeholder copy.

### 2.2 House interior
- Navigable main floor with a recognizable kitchen/living area and at least one side room or alcove; furniture collision and doorways.
- Stairs return to cellar; front door leads to grounds. At least two optional inspectables.
- The house must feel like a physical dwelling, not a corridor labeled “house.”
- No required dialogue NPC for the first slice.

### 2.3 Homestead grounds
- Outdoor central hub with visible house, old shed, well and overgrown road entrances.
- Space to move around obstacles and choose route order; at least one optional encounter in a marked area, avoid unavoidable combat directly at the house exit.
- A clear landmark guides player toward the road without hard-locking optional areas.

### 2.4 Old shed
- Small optional explorable interior; one useful pickup using existing item rules (e.g. Bandages) and one lore inspectable.
- Backtrack to grounds. No new inventory/equipment system needed.

### 2.5 Old well
- Optional secret interaction or short inset map, accessible from grounds; discoverable clue and modest reward using an existing item, not a mandatory key.
- Do not require puzzle engine or scripted cutscene for the first slice.

### 2.6 Overgrown road
- Walkable approach with a clearly marked edge/exit; reaching the boundary displays a temporary “Beyond the Homestead — coming later” message or equivalent non-blocking transition notice.
- Do not fake a completed second zone; player can turn back and continue exploring.
- Future narrative direction: the road ultimately leads into the larger world, with the Crow's influence escalating across later zones.

## 3. Exploration interaction contract
- **WASD** and **arrow keys** move player on a top-down 2D map. Diagonal input is allowed if normalized; no faster diagonal travel. If tile-step movement is simpler for prototype, use consistent tile-step movement rather than a different game mechanic.
- **E / Enter** interact with an adjacent/facing object, pickup, doorway or NPC. Never require typing a command for the graphical flow.
- **Escape** opens/closes a minimal pause/help panel (do not introduce a new save feature without explicit assignment).
- Player movement is disabled during transitions, modal dialogue and combat.
- Camera follows player within map bounds; fixed camera on maps smaller than viewport is acceptable.
- Collidable: walls, solid furniture, boundaries. Walkable: floors, paths, open doorways. A doorway/trigger changes map when player enters or interacts according to its explicit trigger type.
- Transition places player at a **named spawn point** on destination map facing away from entry; guard against instant bounce-back. Return transitions must be symmetrical.
- Interactables expose proximity feedback, short text and optional one-time state. A collected pickup must not reappear on re-entry in the same run. An inspected clue may remain inspectable.
- Input focus must not leak exploration movement into combat menus. No key press should both close a modal and cause an unintended world step.
- **Exploration is not combat time:** movement and inspecting objects do not advance rounds, statuses or resource regeneration.

## 4. Encounters and combat handoff
- First slice uses **visible encounter actors** on the map; no random encounter frequency system yet.
- At least one optional encounter on grounds or road, using an existing enemy and existing battle rules. Avoid reusing the 666 HP James Newton test dummy as ordinary content.
- Encounter begins on player contact or deliberate interaction (developer chooses one consistently, documented in map data), locks exploration and opens separate battle presentation.
- Combat remains **non-positional, speed-ordered, round-based**. Existing effects, damage, status durations, resource and progression rules are unchanged. Target selection uses combatant IDs where available; do not derive battle mechanics from world-map coordinates.
- Victory: return to the same map near the encounter location, remove/mark encounter cleared for the run, award normal rewards, restore exploration input. Defeat: existing game-over behavior. Flee: return to exploration, keep encounter available, prevent immediate retrigger until player moves clear / cooldown by leaving trigger bounds (no automatic instant re-engage).
- Combat screen should expose basic attack, available skills, target choice, items and flee using keyboard/menu controls. Graphical combat can initially be a simple overlay with textual event log and distinct actors; do **not** block the zone slice on bespoke animation assets.
- Evolution choice remains accessible at level 3 via menu; no progression/balance number changes in this task.

## 5. World data schema — developer contract
World geometry belongs to front end / world map data; engine remains authoritative for gameplay, inventory, encounter results and persistent run flags. Use **data-defined maps**; no hardcoded per-map logic. Suggested minimal structure (field names may follow existing conventions if documented):

```js
world: {
  zones: { forgotten_homestead: { mapIds: ['cellar','house','grounds','shed','well','road'] } },
  maps: {
    cellar: {
      zoneId: 'forgotten_homestead',
      tileSize: 32,
      tiles: /* grid or asset-backed tilemap */,
      collision: /* collision layer */,
      spawns: { start: { x: 4, y: 5 }, from_house: { x: 4, y: 2 } },
      exits: [{ id: 'cellar_stairs', toMap: 'house', toSpawn: 'from_cellar', trigger: /* interaction or overlap */ }],
      interactables: [{ id: 'cellar_clue', kind: 'inspect', text: '...' }],
      encounters: []
    }
  }
}
```

Required invariants: unique IDs for zones/maps/exits/spawns/objects/encounters; valid destinations; reachable exit tiles; no spawn in collision; reversible transitions; no direct UI/DOM in engine. Map flags include collected item IDs and defeated encounter IDs, scoped to a run. Legacy room IDs and current tests remain supported via adapter/compatibility path until migration is approved. Do not overwrite `src/data.js` room graph wholesale.

## 6. Art direction and presentation
- **Perspective:** top-down 2D exploration with readable characters, doors, props and walkable paths; classic JRPG navigation language, original ENSO visual identity.
- **Tone:** eerie, abandoned, atmospheric; a plausible domestic home above an unsettling cellar. Outdoor space should feel like a world beyond the house.
- Prototype art may use consistent simple tiles/shapes and placeholder sprites. No requirement to license or copy Pokémon/other JRPG assets.
- Separate world scene and battle scene; reusable HUD/menu components. Do not create a unique hand-coded scene for every doorway.

## 7. Implementation phases and acceptance tests
### Phase A — world foundation (first PR)
1. Map/zone schema, loader/validation, collision, movement, camera and named-spawn transitions.
2. Cellar → house → grounds, bidirectional, with an inspectable and blocked geometry on each relevant map.
3. Existing text UI, `npm test`, `npm run play` and old game start remain functional.
**Acceptance:** player can move without text commands; cannot walk through walls; enter/exit house and cellar repeatedly; no transition loop; no status ticks from movement; all map IDs validate.

### Phase B — complete Zone 1 (second PR)
1. Add shed, well and road; optional pickups and persistent run flags; at least one clue in each optional area.
2. At least one visible optional encounter, battle scene handoff and correct victory/flee/defeat returns.
3. Show boundary notice for future zone; allow backtracking.
**Acceptance:** reach all maps and return; pickups cannot be farmed by re-entry; no instant flee retrigger; battle uses current round rules; zone does not require a boss or force every encounter.

### Phase C — polish and compatibility (third PR)
1. Interaction prompts, map labels, clear movement/combat input focus, basic presentation and accessibility considerations.
2. Deterministic integration tests for transition graph, encounter persistence, fight lifecycle and legacy compatibility.
3. Add a brief developer note on adding maps and placing encounters.
**Acceptance:** no game-breaking regressions, existing CLI/test path green, no invented balance changes, documented map authoring workflow.

## 8. Technical coordination and constraints
- **Keel** reviews integration boundaries (G1 typed events, G2 structured actions, G3 spatial world) before deep implementation; use existing `architecture/TECHNICAL_FEASIBILITY.md`.
- **Wren** is held back by Director for world expansion planning; **do not assume Wren is immediately assigned**. Veyr can schedule implementation when Director releases developer capacity.
- Phaser is a **recommended framework, not approved dependency**. Per AGENTS.md, adding dependencies requires Owner approval. Phase A can use vanilla canvas/DOM or another already-available rendering approach; do not silently add npm packages or a bundler.
- Keep game double-click-playable where feasible and document asset loading constraints before changing packaging.
- Follow AGENTS.md: branch from main, focused PRs, no direct main edits, test green. Design does not authorize modifying existing combat mechanics.
- Do not expand the entire world, invent additional regions or make Crow-Touched Warden Zone 1 boss under this handoff.

## 9. Definition of done
A player can wake in a house cellar, walk upstairs, explore the dwelling and outside grounds, choose to inspect the shed/well, approach the overgrown road, engage at least one visible enemy, complete an unchanged turn-based battle, and return to exploration with consistent world state. They can freely backtrack. The first region feels like a **place**, not six successive encounter menus.

## 10. Deferred (not blockers)
Zone 2 and 3 layout/names; final story and Warden placement; NPC dialogue and quests; save/load UI; elaborate animations; random encounters; equipment overhaul; new enemies and balance; puzzle framework; expanded class mechanics; full overworld. Those receive separate design and implementation approvals.
