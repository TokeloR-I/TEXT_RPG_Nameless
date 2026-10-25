# Combat v3: the world is the battlefield

**Owner:** Wren (dev lead) · **Direction:** Creative Director, *ENSO Seamless Action RPG Gameplay Direction* (2026-10-25)
**Status:** in production. The workstreams run in parallel; this file is the contract between them. Change it in the same
PR as the code it describes.

Combat v2 (PR #176) put a clock, cooldowns and a skill bar on the old encounter screen. The Creative Director's verdict:
the right rules, the wrong experience. Combat v3 removes the battle screen from the graphical game. Enemies stand in the
world before a fight, the player moves, aims, attacks, dodges and guards on the map, and loot drops on the ground.

## Architecture

```
ui/world-ui.js ── input (keys, mouse) ──► src/action/sim.js  (ActionSim: space + time, headless)
      ▲                                       │  sub-tile movement, collision, attacks, hitboxes,
      │ draw actors, fx, HUD                  │  projectiles, dodge/guard/stamina, enemy AI
      │                                       ▼
ui/world-render.js ◄── sim.view() ──   engine (src/engine/action.js + realtime.js)  RULES
ui/action-fx.js                         damage, skills, resources, cooldowns, statuses,
                                        XP, loot, quests, save
```

- **`src/action/sim.js` owns space and time** for the current map: positions in map pixels (sub-tile), a fixed 60 Hz
  step that doesn't depend on frame rate, collision against the map's tiles and solid objects, attack state machines
  (startup → active → recovery), hit tests (arcs, circles, projectiles), dodge, guard/parry, stamina, and enemy AI
  (idle/wander, detect with range + line of sight, pursue with grid pathfinding, wind up, strike, recover, leash home).
  Headless: no DOM, no timers. Deterministic: its own seeded RNG, fixed step. `sim.update(ms, input)` → events.
- **The engine owns rules.** It never sees coordinates. The sim tells it *who* was hit by *what*; the engine resolves
  damage, effects, statuses, resources, cooldowns, XP, loot and quests through the same functions turn-based and v2
  fights use (`castSkill`, `applyStatus`, `useSkill` checks, `awardVictoryLoot`, `storyEvent`).
- **Combat state is world state.** The engine is in `mode: 'combat'` while any enemy group is engaged. Groups join and
  leave that fight one by one; the fight ends when none is left. There is no battle screen, transition or result screen.
- **One combat implementation.** v3 runs on v2's real-time engine (`combatMode: 'action'` is real time with the enemy
  schedules switched off, because the sim decides when an enemy attacks). The turn-based mode stays as the legacy and
  test reference (`combatMode: 'turn'`, the text game, the balance bot). v2's battle overlay stays reachable for testing
  at `world.html?combat=realtime`; `world.html?combat=turn` is the legacy screen. The default is `action`.

## Engine API (src/engine/action.js)

All return `{ ok, events, error? }` like `act()` and run as transactions.

| Call | What it does |
|---|---|
| `actionEngage(encounterId, enemyKeys, loot)` → `{ ok, ids }` | The group enters the fight (starts one, or joins the current one). `ids[i]` is the engine id of `enemyKeys[i]`. Refused for a defeated encounter. |
| `actionCast(skillId \| 'attack', { slot })` → `{ ok, castId, skill, shape }` | The player starts an attack or skill: same refusals as v2 (`ON_COOLDOWN`, `GLOBAL_COOLDOWN`, `STUNNED`, `NOT_ENOUGH_RESOURCE`, `SILENCED`, …). Pays the cost and starts the cooldown now. Self skills resolve at once. |
| `actionResolve(castId, targetIds)` | The cast's hit landed on these engine ids (the sim decided who was inside the arc / circle / projectile path). Runs the skill's effects on them. `[]` = a whiff. |
| `actionEnemyStrike(enemyId, skillName, { guarded, parried })` | An enemy's attack connected with the player. Guard multiplies the damage by `actionRules.guard.damageTaken`; a parry blocks it and staggers the attacker. |
| `actionDisengage(encounterId)` | The group gave up (leash). Its enemies leave the fight and reset. |
| `actionView()` | Pure. Per engaged enemy `{ id, encounterId, key, hp, maxHp, stunned, speedMult, statuses }`, the player's stun/slow, and `getRealtimeState()`. |
| `tick(ms)` | v2's clock: DoT ticks, status expiry, the resource pulse, cooldowns. The sim calls it every step while in combat. |

When the last enemy of a group dies, the engine clears the group: XP, `world.defeated`, the quest event, and loot through
`dropVictoryLoot(enemies, { encounterId, mapId, x, y })` (Rook: the loot becomes a world drop the player walks over, see
below). When the player dies: `world.respawn` event, the fight ends, the player comes back at the map's safe spawn with
half HP and the enemies reset (no broken quest state). Saving is refused while a group is engaged (`IN_COMBAT`).

## World drops (Rook)

`dropVictoryLoot()` rolls the same once-only loot claims as before but leaves them pending and records a drop in
`engine.world.drops` (`{ id, mapId, x, y, claimIds, gold, items }`, saved with the run). `getWorldDrops(mapId)` (pure)
lists them; `act({ type: 'collect_drop', dropId })` claims them (allowed in combat too) and removes the drop. A drop is
collected once; reloading, retreating or re-entering a map never duplicates it.

## Numbers (`actionRules` in src/data.js)

First pass by Wren, replaced by Vaelis's tables (`docs/design/ENSO_ACTION_COMBAT_DESIGN.md`) as they land. Movement,
stamina, dodge, guard, parry, sprint, per-class weapon profiles (reach, arc, startup/active/recovery, swing speed), skill
shapes (projectile / arc / circle / self / summon / dash, by target kind with per-skill overrides), enemy archetypes
(speed, detect range, attack reach, wind-up, leash), boss patterns.

## Controls (default, rebindable later)

WASD move (8 directions, sub-tile) · mouse aims · LMB or 1 basic attack · 2–6 skills · Space dodge · Shift sprint ·
RMB guard (tap at the right moment = parry) · E interact / talk / collect · Tab cycle target lock · I / J / Esc.
The arrow keys still walk. Touch pad: unchanged walk buttons plus attack and dodge.

## Workstreams (parallel, no gates)

| Who (studio role) | Owns | Files |
|---|---|---|
| Wren (lead-programmer) | sim, engine bridge, world-ui integration, enemy AI core | `src/action/`, `src/engine/action.js`, `ui/world-ui.js` (game loop), `ui/world-render.js` (actor drawing) |
| Vaelis (systems/game designer) | class feel, weapon profiles, skill shapes, enemy behaviours, Crow Warden pattern | `docs/design/ENSO_ACTION_COMBAT_DESIGN.md` |
| Rook (gameplay-programmer) | world drops, equipment effects on attacks, quest rewards | `src/engine/loot.js`, `performWorld` in `src/engine/actions.js`, `tests/56-*` |
| Sable, Vesper (technical-artist) | telegraphs, hit sparks, projectiles, damage numbers, attack/dodge/guard poses | `ui/action-fx.js`, `ui/sprites.js`, `assets/sprites/` |
| Pixie (ui-programmer) | persistent action HUD: skill bar, stamina, enemy and boss bars, prompts, reward notices | `ui/world-ui.js` HUD parts, `world.css` |
| Keel (technical-director) | architecture review: persistence, performance, engine decision | `architecture/ACTION_COMBAT_REVIEW.md` |
| Tally (qa-tester) | real-browser playtests of movement, combat, loot, quests | `qa/` |
