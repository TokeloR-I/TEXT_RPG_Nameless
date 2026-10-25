# Combat v3 architecture review (Keel)

**Reviewer:** Keel — Technical Director (Claude Gaming Studio, architecture specialist) · **Date:** 2026-10-25
**Reviews:** `docs/ACTION_COMBAT.md` (Wren) against `docs/design/ENSO_SEAMLESS_ACTION_RPG_DIRECTION.md` (Creative Director)
**Reopens:** `architecture/ENGINE_DECISION.md` trigger 1 ("design chooses real-time action combat")

## Decisions

| # | Question | Verdict |
|---|---|---|
| 1 | Engine | **Stay custom** (JS rules engine + headless `ActionSim` + Canvas 2D → WebGL postfx). No Phaser, Godot or other engine. |
| 2 | Sim/engine split | **Approved as written.** Sim owns space and time, engine owns rules, the sim passes engine ids. Add a fast path to `tick()` (below). |
| 3 | Timing | **Fixed 60 Hz** with an accumulator. **Separate sim RNG**, seeded from `engine.seed`. Golden replay of turn mode is not affected. |
| 4 | Persistence | **Refusing saves while engaged and resetting enemies on load is sound**, with four fixes (cooldowns, map exits, drops, ids). |
| 5 | Performance | Budget below. Grid A* on 16 px tiles is enough; a shared flow field once 4+ enemies chase. |

## 1. Engine decision, revisited

Trigger 1 has fired, so I compared again. **Verdict: stay custom.**

- **What action combat needs is small and already half-built.** Sub-tile movement, circle-vs-tile collision, arc,
  circle and capsule hit tests, projectiles, a fixed step and A* come to roughly 1,000–1,500 lines of plain JS. Phaser's
  Arcade physics gives us AABB bodies and overlap callbacks, which is about the easiest 20% of that list. Attack state
  machines, guard, parry, telegraphs and leash AI are game code in every engine.
- **The expensive part, the rules, stays in JS either way.** Damage, 60+ effect types, statuses, Control Resistance,
  loot, story and save are ~10k lines with ~56 test files. Godot would mean porting them to GDScript (months, and two
  combat implementations, which direction §11 forbids) or running JS inside Godot (not practical). Phaser would keep them,
  but adds a 1 MB runtime that needs the owner's OK (AGENTS.md §7). It also brings its own loop, scenes and renderer,
  which would replace `ui/world-render.js`, the Tiled layer pipeline and `ui/postfx.js`, all of which work today.
- **Headless matters more now, not less.** A sim with no DOM can be unit-tested and replayed in Node from an input
  log. That is how we prove spatial fairness (direction §5) without a browser. Engine physics mostly can't.
- **Delivery constraint holds.** `tools/build-single.js` inlines plain scripts into one double-clickable file. A
  headless `src/action/*.js` drops straight into it.
- **Cost of staying:** Wren writes collision, hit tests and pathfinding by hand. That is about one to two weeks and
  is covered by tests. Switching costs 6–10 weeks to get back to where we are now.

**New triggers to reopen** (these replace trigger 1; triggers 2–4 stand):
(a) the sim plus the world frame goes over **8 ms** on a mid-range laptop with the 1.0 entity budget below, and
profiling can't fix it. The first step would then be PixiJS for drawing only, not a different engine. (b) Design
asks for **rigid-body physics** (ragdolls, pushable stacks, rope) or **online co-op**.

## 2. The sim/engine split

The boundary is right. Coordinates never enter the engine, and the engine never decides who was hit. One rules path
is kept, because `actionResolve` runs `castSkill`'s effects. Points to watch:

- **Ids are a contract.** `buildEnemies(…, firstId)` numbers `enemy_N` across groups. Never reuse an id after a group
  leaves or dies in the same fight; the sim may still hold it for one step. Summons get engine ids too, and the sim must
  learn them from events, not guess them.
- **Group start must not reset the player.** `startCombat` clears `player.statusEffects` and `cr`. That is correct for
  the first group, but a second group joining must go through a join path that leaves them alone. `maybePromptBranch`
  already waits while `mode === 'combat'`; keep it that way, and make sure clearing one group never sets `explore`
  while others are still engaged.
- **Transaction cost, measured.** Scratch script `bench-transact.js` (normal state) and `bench-heavy.js` (late-game
  size) in Keel's scratchpad. Node 22, world game, story on, real-time fight on the Road:

| Call | Early run (7.4 KB state, 1 enemy) | Late-game size (78 KB: 6 enemies, 80 items, 40 drops, 300 claims) |
|---|---|---|
| `snapshot()` alone | 0.022 ms | 0.53 ms |
| `engine.tick(16)` | 0.027 ms | 0.61 ms |
| `act({type:'attack'})` refused (`ON_COOLDOWN`) | 0.028 ms | 0.55 ms |
| `act({type:'attack'})` that lands | 0.069 ms | — |
| `getState()` | 0.017 ms | 0.21 ms |
| `getAvailableActions()` | 0.011 ms | 0.033 ms |

  Today it's fine. Cost grows **linearly with save size**: at late-game size, a 60 Hz `tick()` costs ~0.6 ms of a
  16.7 ms frame (×2–3 on a mid laptop), and it throws away ~4.7 MB/s of JSON strings, which shows up as GC hitches.
  `stats.lootClaims` and `world.drops` only ever grow.
- **Fix, in order:**
  1. **`tick()` fast path.** If `rtNextEventAt() > now + ms`, just advance `rt.now` with no transaction. Plain
     arithmetic can't throw. Most 16 ms steps have nothing due, so this removes over 90% of snapshots.
  2. The sim calls `actionView()`/`getRealtimeState()` per frame, **never** `getState()`, which clones the world.
  3. If profiling still shows a cost: a **scoped transaction** for hot calls (`actionResolve`, `actionEnemyStrike`,
     refused casts) that snapshots only `player`, `combat`, `stats`, `world`, `story` plus the RNG. Those hold
     everything a combat effect can touch. Inventory changes go through `collect_drop`, which keeps the full one.
     Don't drop the transaction itself: QA-3 soft-lock safety is worth keeping.
  4. Release a refusal early: check cooldown, GCD and stun before the snapshot, so cast-spam with a held key is free.

## 3. Determinism and fixed timestep

- **Fixed 60 Hz** (`STEP = 1000 / 60`) with an accumulator in `world-ui.js`. Run at most 5 steps per frame, and
  drop the backlog after a hidden tab. Draw by interpolating between the previous and current sim positions. Call
  `engine.tick(STEP)` once per sim step, always with the same constant, so the engine and the sim share one timeline.
- **The sim has its own RNG:** `mulberry32(hash(engine.seed, 'sim'))`. Sharing `engine.rng` would let an AI wander
  roll shift every damage, crit and loot roll after it. That would make loot depend on how long you walked, and the
  engine's replay tests would become fragile. The two streams are only ever joined through ids passed to engine calls.
- **Replay:** seed + per-step input record (`{ step, keys, aim, buttons }`) → identical sim and engine. Add an
  action-mode golden test: a scripted input log on the Road, hashing `engine.getState()` and `sim.view()` at the end.
  The existing turn-mode golden hash is unchanged, because `combatMode: 'action'` is opt-in in the engine and the
  default stays `'turn'`.
- No `Math.random`, `Date.now` or `performance.now` inside `src/action/` (the same rule as the engine).

## 4. Persistence

Refusing saves (`IN_COMBAT`) while engaged and putting enemies back home at full HP on load is **sound**. It is the
same rule Souls games and GW2 use, and it means the save format never needs positions, velocities, wind-ups or
projectiles. What must persist, and what to fix:

- **Saved:** `world.defeated` (per encounter), `world.drops` with their pending `lootClaims`, story/quest state,
  player HP, resource and inventory. Enemy positions, AI state, projectiles and the sim RNG are **not** saved. On
  load, enemies are rebuilt at their home tiles from map data minus `defeated`, and the sim RNG is re-seeded from
  (seed, map, entry count).
- **Cooldowns are fight-local today** (`combat.rt.cooldowns`, gone when `combat` is null). In a seamless world that is
  an exploit: cast the big skill, leash, re-engage, and the cooldown is ready again. **Move cooldowns, GCD and the
  basic swing timer to a player-level clock that runs out of combat too** (the sim drives it). Out of combat it may stay
  unsaved, but leaving combat must not reset it.
- **Ongoing effects:** all statuses are wiped at fight start and end. That is acceptable for v3.0 (no poison while
  walking), but it is a design call. Flag it to the systems designer before shipping a status meant to outlast a fight.
- **Map transitions while engaged:** the sim must call `actionDisengage` for every group before `session.transition()`,
  or the engine stays in `mode: 'combat'` with no enemies left in the world. Alternatively, block exits while engaged
  (the boss-arena seal). Test both.
- **Drops never expire silently.** A drop holds pending claims. If a drop is ever removed by anything other than
  `collect_drop`, its claims are lost forever. If drops must expire, release the claims back to `claimed` and credit
  them to the player.
- **Quest safety:** XP, `defeated` and `storyEvent('defeat')` fire only when the **whole group** is cleared, and a
  partial group resets on leash or death. Nothing is half-credited, so this is correct. Keep XP per group, not per
  kill, or leash-farming becomes possible. Boss arena seals must be story flags that the defeat/respawn path clears.
- `engine.mode === 'combat'` routes every non-world action to `performCombat` (`actions.js:80`). Talk, inspect and
  take are refused while engaged. Decide case by case (direction §7) and give each refusal its own code.

## 5. Performance budget (480×270 stage, WebGL postfx, mid laptop at 60 fps)

| Slice | Budget | Notes |
|---|---|---|
| Sim step | ≤ 1.5 ms | 1.0 target: **12 active enemies, 8 summons, 24 projectiles**. Pre-allocated arrays; no per-step object churn |
| Engine calls | ≤ 0.5 ms | with the `tick()` fast path |
| Canvas draw | ≤ 5 ms | static layer is cached already; ≤ 400 particles (pooled, `fillRect`, no `shadowBlur`/`ctx.filter`); cache radial gradients for actor glows |
| postfx (GPU) | ≤ 3 ms | 24 lights max (`MAX_LIGHTS`); the scene is uploaded twice per frame (`sceneTex`, `sceneSoft`), which is fine at 480×270 but should stay at one stage-sized upload |
| Headroom | ~6 ms | DOM HUD: update on change, not every frame |

**Pathfinding:** maps are at most ~64×48 cells at 16 px (~3k nodes). Use A* with an octile heuristic on typed arrays,
with blocked cells taken from the same `isSolidTile` the world uses, and limit each search to 2,000 expansions. Repath
at most every 250 ms, or when the target moves more than one tile. Allow 4 searches per step and queue the rest. Smooth
paths by line of sight, and steer enemies apart so they don't stack. When **4 or more enemies chase the player**, swap
to one Dijkstra flow field from the player's tile, refreshed every 250 ms and shared by all of them. Line of sight uses
a DDA walk on the same grid. Leash radius limits how far a chase can go, which keeps searches local.

## 6. Must-dos for Wren

1. Add the `tick()` fast path (no transaction when nothing is due), plus a test that it produces the same events as before.
2. Keep cooldowns, GCD and the swing timer on a player-level clock that survives disengage. Test: cast, leash, re-engage → still on cooldown.
3. Add a join path for a second group that doesn't clear player statuses or CR, and never sets `explore` while another group is engaged.
4. Make leaving a map while engaged always disengage first (or block the exit). Test that it can never leave `mode: 'combat'` stranded.
5. Give the sim its own seeded RNG, use a fixed 60 Hz accumulator, and add an action-mode golden replay test from an input log.
6. Never reuse engine enemy ids within a fight. Report summon ids to the sim through events.
7. Drops only leave through `collect_drop`. Test save → load → collect once, and that leash, death and re-entry don't duplicate a drop.
8. Profile one Road fight in Chrome with 12 enemies and full particles. Commit the numbers to `qa/`, and open the scoped transaction only if the engine goes over its 0.5 ms slice.

## Summary

- Engine: **stay custom.** Reopen only if the frame goes over 8 ms and can't be fixed, or design asks for rigid-body physics or online co-op.
- Split: **approved.** The sim owns space and time, the engine owns rules and is passed ids. Add the `tick()` fast path; moving cooldowns to the player and fixing the join path are required.
- Timing: **fixed 60 Hz, separate seeded sim RNG**, plus an action-mode golden replay. Turn-mode golden hash unaffected.
- Persistence: **no saves while engaged, enemies reset on load: sound.** Fix cooldown reset, map-exit stranding and drop expiry.
- Measured (Node 22): early 7.4 KB state, `tick(16)` **0.027 ms**, `act()` **0.028 ms** refused / **0.069 ms** landing, `snapshot()` 0.022 ms. Late-game 78 KB state: `tick` **0.61 ms**, `act` **0.55 ms**, `snapshot` 0.53 ms.
