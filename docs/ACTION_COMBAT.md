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
| `actionEngage(encounterId, enemyKeys, loot, { mapId, x, y })` → `{ ok, ids }` | The group enters the fight (starts one, or joins the current one without resetting the player's statuses). `ids[i]` is the engine id of `enemyKeys[i]`; ids never repeat in a fight. The position is where its loot drops. Refused: `ALREADY_DEFEATED`, `ALREADY_ENGAGED`. |
| `actionCast(skillId \| 'attack', { slot })` → `{ ok, castId, skill, shape, resolved }` | The player starts an attack or skill: same refusals as v2 (`ON_COOLDOWN`, `GLOBAL_COOLDOWN`, `STUNNED`, `NOT_ENOUGH_RESOURCE`, `SILENCED`, …) plus `BUSY` (a cast is in flight). Skills nobody aims (self, summons, ground, corpse) resolve at once (`resolved: true`). The basic attack has no v2 swing timer here: the weapon's startup and recovery pace it. |
| `actionResolve(castId, targetIds)` → `{ ok, hit }` | The cast's hit landed on these engine ids, nearest first. Single-target skills hit the first body only (v2 damage balance); circles hit all; `enemy_multiple` needs its count. Pays the cost, runs the effects, starts the cooldown. `[]` = a whiff: paid and on cooldown anyway. |
| `actionCancel(castId)` | The cast never came out (dodged out of it, stunned): nothing paid. |
| `actionEnemyWindup(enemyId, { skill })` → `{ ok, skill }` | An enemy starts an attack. The sim's attack table names the skill (`actionRules.enemies[key].attacks[]`, `bosses[key]`); without one the engine picks at random (as v2 does) and says "readies X". Refused while stunned (`STUNNED`) or already winding up (`BUSY`). |
| `actionEnemyStrike(enemyId, { hit, guarded, parried, damageMult })` → `{ ok, result }` | The wind-up comes out (`damageMult`, from the attack table, scales the blow after DEF): `result` is `hit`, `guarded` (damage × `actionRules.guard.damageTaken`), `parried` (no damage, an `action.parry` event; the sim staggers the enemy), `miss` (`hit: false`: dodged or out of reach) or `interrupted` (stunned during the wind-up). |
| `actionDisengage(encounterId)` | The group gave up (leash). Its enemies leave the fight and reset. |
| `actionView()` | Pure. Per engaged enemy `{ id, encounterId, key, name, hp, maxHp, stunned, speedMult, statuses, windup }`, minions, the player's stun/slow/statuses, casts in flight, and `getRealtimeState()`. |
| `canSave()` | Pure. `{ ok: false, error: { code: 'IN_COMBAT' } }` while a group is engaged. |
| `tick(ms)` | v2's clock: DoT ticks, status expiry, the resource pulse, cooldowns. The sim calls it every step while in combat. |

When the last enemy of a group dies, the engine clears the group: XP, `world.defeated`, the quest event, and loot through
`dropVictoryLoot(enemies, { encounterId, mapId, x, y })` (the loot becomes a world drop the player walks over, see
below). When the player dies: `world.respawn` event, the fight ends, the player comes back at the map's safe spawn with
half HP and the enemies reset (no broken quest state). Saving is refused while a group is engaged (`IN_COMBAT`).
Events: `action.engage`, `action.cleared` (`{ encounterId, xp }`), `action.disengage`, `action.end` (`victory` /
`escaped`), `action.parry`, `world.respawn` (`{ encounters, hp }`). v2's `flee` is refused: you flee by running.

`tick()` skips the transaction when no engine event is due before the step ends (Keel's review), so a 60 Hz sim can call
it every step.

## World drops

`dropVictoryLoot()` rolls the same once-only loot claims as before but leaves them pending and records a drop in
`engine.world.drops` (`{ id, mapId, x, y, claimIds, gold, items }`, saved with the run). `getWorldDrops(mapId)` (pure)
lists them; `act({ type: 'collect_drop', dropId })` claims them (allowed in combat too) and removes the drop. A drop is
collected once; reloading, retreating or re-entering a map never duplicates it.

## Enemy patterns (the sim)

Gates and exits: an enemy never steps out of the cells the player can reach, except into the near face of its own gate, so gate guards fight from the gateway and can always be hit there. A map exit is barred mid-fight only while an engaged enemy is within `actionRules.combat.exitBlockPx` (default 96 px); with nobody that close, the groups give up (no victory) and the player leaves.

Action-only tuning (Gauge) lives in the tables, not the engine: `bosses[key].hpMult` multiplies a boss's HP when an action fight engages it (the Warden ×2.5), and an attack's `damageMult` scales that blow (Summon Crows ×3, Murder of Crows ×6). `defence.minDamageShare` (0.35) is a floor on blows that land on the player: DEF never blocks more than 65% of one, so Chapter One trash still hurts a DEF 8 Warrior (applied in `rollDamage`, before guard). Turn and v2 fights never read any of them.

Each enemy fights from its attack table: `actionRules.enemies[key].attacks[]` (skill, shape `arc` / `line` /
`circle` / `projectile` / `ground`, reach, arc, width, lunge, wind-up / active / recovery, cooldown, `useAt`
[min, max] distance, `combo` steps, `blockCost`, `parryable`, `guardable`, `onHit`). The telegraph is the hitbox; it
tracks the player and locks for the last `lockMs`. At most `combat.maxSimultaneousAttackers` wind up at once. Bosses
read `actionRules.bosses[key]`: named attacks, `phases` by HP (`openWith`, `speed`, `recoveryMult`, `drop`,
`sweepCombo`, `summonCrowsCount`), `attackGapMs`, `minWindupMs`. Ground attacks (crow shadows) drop circles on the
player and where they're heading. Chain Lock roots and pulls (sim-side for now).

## Numbers (`actionRules` in src/data.js)

First pass by Wren, replaced by the studio design tables (`docs/design/ENSO_ACTION_COMBAT_DESIGN.md`) as they land. Movement,
stamina, dodge, guard, parry, sprint, per-class weapon profiles (reach, arc, startup/active/recovery, swing speed), skill
shapes (projectile / arc / circle / self / summon / dash, by target kind with per-skill overrides), enemy archetypes
(speed, detect range, attack reach, wind-up, leash), boss patterns.

## Controls (default, rebindable later)

WASD move and face (8 directions, sub-tile) · LMB aims a basic attack · 1 attacks forward · 2–6 / R skills · Space dodge · Shift sprint ·
Q guards forward / RMB aims guard (tap at the right moment = parry) · E interact / talk / collect · Tab cycle target lock · I / J / Esc.
Keyboard/HUD actions use facing unless Tab lock is explicitly active. Passive mouse motion does not turn the player.
The compact player portrait, name, level, HP and resource stay at top left; the quest tracker is top right. Empty skill slots collapse while exploring.
Skill buttons use compact original pictograms (32–52 CSS pixels), with names and costs on hover or keyboard focus.
The action HUD hides and becomes inert during dialogue, shops, menus and story transitions, then returns on close.
The arrow keys still walk. Touch pad: unchanged walk buttons plus attack and dodge.

## Delivery team (direction §12: phases A–E are a planning aid, not gates)

The Claude Gaming Studio delivers, led by Wren (development), Pixie (UI/UX) and Tally (QA). The studio's specialist
agents (design, AI, animation, VFX, art, architecture) work inside it. Rook is backup and gets no assignments from this
work; the world drops Rook had finished before that are kept and owned by Wren.

| Who | Owns | Files |
|---|---|---|
| Wren (development lead) | sim, engine bridge, enemy AI, world drops, world-ui game loop, actor drawing | `src/action/`, `src/engine/action.js`, `src/engine/loot.js` drops, `ui/world-ui.js`, `ui/world-render.js` |
| Pixie (UI/UX lead) | the whole action interface: skill bar, stamina, enemy and boss bars, aim/target cues, prompts, reward notices | `ui/action-hud.js`, `world.css` |
| Tally (QA lead) | continuous real-browser playtests of movement, combat, loot, quests; regressions; balance evidence | `qa/` |
| Studio specialists: Thorne (game design), Gauge (balance), technical art, architecture | class feel (Thorne), numbers and win rates (Gauge), telegraphs/VFX/poses (technical art), architecture review | `docs/design/ENSO_ACTION_COMBAT_DESIGN.md`, `ui/action-fx.js`, `ui/sprites.js`, `architecture/ACTION_COMBAT_REVIEW.md` |
