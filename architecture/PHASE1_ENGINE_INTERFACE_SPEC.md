# Phase 1 — Engine Interface Specification

**Author:** Keel — Technical Director & Game Systems Architect
**Date:** 2026-10-22 (v0.1) · 2026-10-23 (v0.2)
**Version:** 0.2.1 — **canonical reference** (Phase 1 approved in #64; slices land incrementally)
**Status:** **Approved for implementation in slices** (Creative Director decision, #64). Seeded engine (#63) and slice 2, available actions + `act()` (#65), have landed. This document is the canonical technical reference for the remaining slices: structured events, then save/load.
**Baseline:** `main` @ `0a6d760` (147/147 tests) plus the Zone 1 Phase B/C world work on `claude/world-c-polish` @ `45e34e6` (162/162), which is being landed on `main`. Code references name the **module and function**, not line numbers, so they survive edits.
**Builds on:** [`TECHNICAL_FEASIBILITY.md`](TECHNICAL_FEASIBILITY.md) §3 gaps G1 (prose-only output), G2 (text-only input), G3 (spatial world), G7 (save/load) and §10 Phase 1. Approved direction: D1–D3 in [`docs/design/ISSUE_9_D1_D3_DECISION_REGISTER.md`](../docs/design/ISSUE_9_D1_D3_DECISION_REGISTER.md).

### Changes in v0.2.1
- Added for Design Packages 1–3: the `combat.presentation` event, the waiting states `control` (Possession) and `turn_order` (Eternal Architect) with their actions, and the matching `getState()` fields. Rationale in [`REVIEW_DESIGN_PACKAGES_1-3.md`](REVIEW_DESIGN_PACKAGES_1-3.md).

### Changes in v0.2
- Re-based on the engine split into `src/engine/*.js`. Every line reference is now a `module` + `function()` reference.
- New event `combat.absorbed` (Bone Wall). New `status.removed` reasons for the QA-1 opportunity-based expiry: `window_closed` and `holder_turn_start`.
- New **§6A World integration**. It maps the Zone 1 world intents (`enterWorld`, `worldPickup`, `worldEncounter`) onto the action API and event stream, and makes the encounter id part of identity.
- §5: saves include the engine's world run flags, plus an opaque `attachments` block for front-end state such as the player's map position.
- §7 C2 / §9: Tally's `qa/scripts/golden.js` **is** the PR-A baseline, with an events-only / state-only split, because `getState()` gains fields by design.
- §9: re-ordered by value to the graphical front end. The seeded engine and `getAvailableActions()` + `act()` now come first, because the world battle screen already needs them ([`TECH_REVIEW_2026-10-23.md`](TECH_REVIEW_2026-10-23.md) F2/F3).
- §8 adds invariants I17 (world flags) and I18 (availability matches the world battle menu).
- Soulbinder readiness ([PR #48](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/48)): `enemy_multiple` targeting with `targetIds`, the damage causes `link` / `drain` / `aura`, and `damage()` returning the actual HP removed.

---

## 0. Purpose and scope

The engine's rules are ready for a graphical front end; its interface isn't. Today a front end can only send typed strings and read English sentences back, and the Zone 1 world front end does exactly that. This spec defines the interface layer that lets any front end (the `world.html` canvas UI, a test bot, a future port) drive the engine with structured data, **without changing a single game rule and without breaking the text game**.

| In scope | Out of scope |
|---|---|
| Structured events: combat flow, attacks, damage, healing, deaths, statuses, resources, plus the progression events needed for HP/resource bookkeeping | Tilemaps, collision and movement (owned by `src/world/`) |
| Structured action API with an "available actions" query, including the world intents (§6A) | Any change to the combat time model or targeting |
| Stable identifiers | Framework choice (D4), rendering, animation mapping, art |
| Save/load interface and file format | UX and layout decisions (UX spec pending) |
| Compatibility requirements for the text game, world front end, CLI, tests and tools | Any rule, balance or `null` design value change |

### Fit with the approved direction (D1–D3)
- **D1, turn-based combat with hotkeys:** fully covered. `getAvailableActions()` is the hotkey menu, and `act()` is the key press.
- **D2, no battlefield positions:** nothing here introduces positions. Targets are ids (§2), never coordinates.
- **D3, side-view battle scene:** the event catalogue (§3.4) and ordering guarantees (§3.5) are what "ordered animations and readable feedback" are built on.
- If ATB is ever approved, every event and action stays valid; ATB would only *add* timing events.

---

## 1. Design principles

1. **The engine stays authoritative.** Front ends request actions and display outcomes; they never compute rules.
2. **Events describe outcomes, not presentation.** "enemy_1 took 15 damage, lethal" — never "play the slash animation".
3. **Everything is referenced by id**, never by object reference or list position.
4. **Additive and opt-in.** Existing calls keep their exact behaviour; new output appears only when a front end asks for it.
5. **One rules path.** The text parser becomes a translator onto the action API; there are never two implementations of "cast a skill".
6. **Deterministic and pure where it matters.** Emitting events never consumes randomness; queries never change state.
7. **JSON everywhere.** Events, actions, availability lists and saves are plain JSON-safe data.

---

## 2. Stable identifiers

### 2.1 Identifier table
| Thing | Id | Source today | Stability rule |
|---|---|---|---|
| Player combatant | `'player'` | `createPlayer()` | Fixed for the whole game. |
| Enemy combatant | `enemy_<n>` | `startCombat()`: `n` = spawn index in the room's enemy list | Unique within an encounter; **never reassigned or shifted when others die**. Already true; becomes a contract. |
| Minion combatant | `minion_<n>` | `summon()`: per-encounter counter `combat.nextMinionId` | Unique within an encounter; never reused even after the minion dies. Already true; becomes a contract. |
| Encounter | `enc_<n>` | **new**: counter in `stats.encounters`, incremented by each `startCombat()` | Unique for the whole game, persisted in saves. `(encounterId, unitId)` is globally unique. |
| Cast (one skill use) | `c<n>` | **new**: per-encounter counter `combat.nextCastId` | Unique within an encounter. Links a skill use to its hits, damage and statuses. |
| Event sequence | `seq` | **new**: engine counter `eventSeq` | Strictly increasing by 1 for the life of the game; included in transactions and saves; **not** reset by `start`. |
| World identity of a spawned enemy | `entityKey` = `<roomId>#<n>` | added by PR #7 (QA-6) | Stays the key for kill credit and, later, world persistence. |
| Room | key of `data.rooms` | e.g. `starting_room` | Data keys are ids. Display text uses `pretty()`. |
| Class | key of `data.basePlayerClasses` | e.g. `necromancer` | Data key. |
| Branch | key of `evolutionPaths[class].branches` | e.g. `bone_warden` | Data key. |
| Evolution stage | `<branchId>:<index>` | `progression.stageIndex` | Index into the branch's `stages` array. |
| Skill | key of `data.skillDefinitions` | e.g. `Grave Bolt`, `mirrorImage`, `Dragon’s Dominion` | **Exact key**, including capitals, camelCase and curly quotes. Normalisation (`’`→`'`, lower-case, aliases) happens only in the text parser. Enemy and minion attacks aren't in `skillDefinitions`; for them the id is the attack's `name` from the template. |
| Status instance | `(holderId, name)` | approved status rule 2: one instance per status name per holder | No separate instance id is needed; re-application refreshes the same instance. |
| Item | item name string | inventory and room item arrays | Names are ids in Phase 1 (duplicates are interchangeable). Instance ids are deferred until equipment exists (OQ3). |
| Minion template | `key` on the minion | **new, additive**: `summon(type)` stores `type` as `key` | Mirrors `key` on enemies, so a front end can choose a sprite. |

### 2.2 Rules
- **ID-1** Front ends and the action API address combatants **only** by id.
- **ID-2** Text target numbers (`attack 2`) are a text-parser feature: the parser resolves the number against the **current living-enemy list**, at parse time, to an id. This is exactly today's behaviour.

  *Why it matters (real run, seed 2, necromancer vs. the wine cellar):* after `grave bolt 1` kills `enemy_0`, the next menu shows `1. Cellar Vermin`, which is now **`enemy_1`**. A graphical client holding "target 1" across that kill would hit the wrong enemy.
- **ID-3** Display names (`name`) are never used as identity by front ends. The engine still matches some traits by name internally; that's outside this spec.
- **ID-4** Existing id formats (`player`, `enemy_<n>`, `minion_<n>`) don't change. Tests reference them.

---

## 3. Structured events

### 3.1 Envelope
```js
{ seq: 1042, type: 'unit.damaged', round: 3, ...payload }
```
| Field | Rule |
|---|---|
| `seq` | Engine-wide counter (§2.1). Present on every event in `full` mode, **including text events**. |
| `type` | Dot-namespaced, lower snake case: `combat.*`, `skill.*`, `unit.*`, `status.*`, `resource.*`, `progression.*`, `game.*`, `action.*`, plus the existing `text` and `clear`. |
| `round` | Present on events emitted during combat; omitted otherwise. |
| payload | JSON-safe: ids, numbers, strings, booleans, `null`, arrays and objects of those. **No `undefined`** (use `null`), no functions, no engine objects. |

The schema version is exposed as `ENSO.EVENT_SCHEMA_VERSION = 1`. Adding a type or an optional field doesn't bump it. Renaming or removing does.

### 3.2 Event modes (the key compatibility mechanism)
```js
new GameEngine({ seed, events: 'legacy' })   // default in Phase 1
new GameEngine({ seed, events: 'full' })
```
- **`legacy`** — `start()`, `input()`, `act()` and `load()` return **only** `text` and `clear` events, **byte-identical to today** (no `seq`, same fields, same order).
- **`full`** — semantic events and text events, interleaved in emission order, all with `seq`.
- The engine always generates the full stream internally and filters on return. Both modes therefore run the same code, and the legacy stream equals the full stream filtered to `text`/`clear` with `seq` removed (invariant I16).

Why this is required rather than nice-to-have: `tools/play-cli.js` prints `e.text` for every event that isn't `clear`, so any new event type in the default stream would print `undefined` lines. `ui/text-ui.js` and the QA scripts already ignore unknown types.

### 3.3 Shared payload shapes
**UnitInfo** — full description of a combatant, used when a unit enters a fight:
```js
{ id: 'enemy_2', side: 'enemy', kind: 'enemy', key: 'drunken_shade', name: 'Drunken Shade',
  hp: 30, maxHp: 30, def: 4, spd: 7, tier: 'regular', flags: ['undead'], entityKey: 'collapsed_wine_cellar#2' }
```
- `side`: `'player' | 'ally' | 'enemy'`
- `kind`: `'player' | 'minion' | 'enemy'`
- `key`: enemy template / minion type / class id
- `entityKey`: enemies only, otherwise `null`

**DamageCause** — why HP went down: `'hit' | 'dot' | 'overflow' | 'reaction' | 'instant_kill' | 'self_cost' | 'revert' | 'link' | 'drain' | 'aura'`.
- `link`, `drain` and `aura` are reserved for Soul Chain secondary damage, Soul Feast and Spirit Lash ([PR #48](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/48)). The contract's "guard recursion by origin metadata" is exactly this `cause`. Implement it **once**, as the optional cause argument on `damage()` (§3.6), so Soulbinder work and Phase 1 don't each invent their own.
- `damage()` should also **return the actual HP removed**, `min(amount, hpBefore)`. HP can go below 0 today, and the Soul Chain amount, Eidolon King healing and `unit.damaged.amount` all need that real loss figure.

**HealCause** — why HP went up: `'item' | 'leech' | 'breather' | 'level_up' | 'revert' | 'revive'`.

### 3.4 Event catalogue

#### Combat flow
| Type | When | Payload |
|---|---|---|
| `combat.started` | `engage`, or a world encounter | `encounterId, source: { kind: 'room', roomId } \| { kind: 'world', encounterId }, units: UnitInfo[], order: id[]` |
| `combat.round_started` | `newRound()` | `round, order: id[]` (sorted by effective speed) |
| `combat.turn_started` | an actor's turn begins, after traps/DoTs, before acting | `actorId` |
| `combat.turn_skipped` | stun/freeze/confuse etc. | `actorId, statuses: name[]` |
| `combat.no_action` | an actor has nothing to do | `actorId, reason: 'no_target'` |
| `combat.extra_turn` | Haste | `actorId` |
| `combat.awaiting_input` | the engine stops for the player | `actorId: 'player', kind: 'action' \| 'continue'` (`continue` = the QA-5 pause on a skipped player turn) |
| `combat.round_ended` | `endRound()`, after regen and status ticks | `round` |
| `combat.ended` | victory, defeat or flee | `encounterId, outcome: 'victory' \| 'defeat' \| 'fled', rounds, xp` (`xp` is 0 unless victory) |

#### Skills, attacks and hits
| Type | When | Payload |
|---|---|---|
| `skill.used` | every cast by anyone: player, enemy or minion | `castId, casterId, skillId, targetIds, cost, resource, isBasic, forced` (`forced`: `'silence'` when an enemy is forced into Basic Attack, else `null`) |
| `combat.miss` | a hit fails to connect | `castId, attackerId, targetId, reason: 'blind' \| 'dodge' \| 'illusion', statusName` |
| `combat.absorbed` | a hit **connects** but an absorb status (Bone Wall) cancels it entirely | `castId, attackerId, targetId, statusName`. No `combat.hit` or `unit.damaged` follows, and no on-hit riders run (current Bone Wall rule). The absorb is removed with `status.removed { consumed }` |
| `combat.hit` | a hit's damage is calculated (**also when it's 0**) | `castId, attackerId, targetId, skillId, kind, hitIndex, hitCount, amount, raw, crit, damageType, trueDamage, armorIgnore` |
| `combat.trap_placed` | Poison Trap etc. | `castId, trapName, value, duration, trapsSet` |
| `combat.trap_sprung` | an enemy starts its turn on a trap | `targetId, trapName` |
| `combat.bomb_set` | Clockwork Bomb | `castId, skillId, turns` |
| `combat.bomb_exploded` | at the start of the player's turn | `castId` (new), `originCastId, skillId` |
| `combat.corpses_changed` | a kill, or Corpse Bloom consuming one | `count, delta, cause: 'death' \| 'consumed'` |
| `combat.presentation` | flavour with no rule effect, e.g. Shadowstep's dash (Package 3 D-10) | `kind: 'dash', actorId, anchorId, castId`. Never changes state; front ends may ignore it |

Notes on `combat.hit`:
- `kind` is `'normal' | 'counter' | 'chain' | 'bomb'`.
- `amount` is the final value after armor, damage reduction and marks; it can be 0.
- `raw` is the value after the stat bonus and crit, before armor.

**Why `combat.hit` and `unit.damaged` are separate:** "Drunken Shade uses Disorienting Whisper for 0 damage! (CRITICAL HIT!)" happens in the real seed-2 run. The front end must show the attack and the "0", but no HP changed. So `combat.hit` is emitted and `unit.damaged` isn't.

#### HP, death and units
| Type | When | Payload |
|---|---|---|
| `unit.damaged` | **any** HP decrease | `targetId, sourceId \| null, amount, hpBefore, hpAfter, lethal, cause: DamageCause, castId \| null, statusName \| null` |
| `unit.healed` | **any** HP increase (0-HP heals aren't emitted) | `targetId, sourceId \| null, amount, hpBefore, hpAfter, cause: HealCause, item \| null, castId \| null` |
| `unit.max_hp_changed` | level-up, Crown of the Undying | `unitId, before, after, cause: 'level_up' \| 'revive'` |
| `unit.died` | HP reaches 0 (players, enemies and minions) | `unitId, killerId \| null, cause: DamageCause, corpse: boolean, killCredited: boolean` |
| `unit.revived` | Crown of the Undying | `unitId, hp, maxHp` |
| `unit.erased` | Unmake (`remove_from_fight_permanent`) | `unitId, sourceId` |
| `unit.summoned` | a summon effect | `unit: UnitInfo, summonerId, castId, joinsRound` |

Rules for this group:
- **Player death:** today `onDeath()` returns early for the player. Phase 1 emits `unit.died` for the player. If Crown of the Undying triggers, `unit.revived` follows; otherwise `combat.ended { outcome: 'defeat' }`.
- **Erase is not a death.** `erase()` doesn't run `onDeath()`, so there's no corpse and no kill credit. That's current rule behaviour and stays unchanged. The event says what happened: `unit.erased`, never `unit.died`.

#### Statuses
| Type | When | Payload |
|---|---|---|
| `status.applied` | `applyStatus()` succeeds (new or refreshed) | `targetId, sourceId, name, statusType, category, value, stacks, stacksAdded, duration, expiry, refreshed, castId \| null` |
| `status.blocked` | `applyStatus()` refuses | `targetId, sourceId, name, reason: 'immune' \| 'control_resistance' \| 'target_dead'` |
| `status.duration_changed` | end-of-round tick on a status that stays | `targetId, name, duration` |
| `status.removed` | **any** removal | `targetId, name, reason` |
| `status.overflow` | Overflow Burst (rules 7–9; currently off, pending values) | `targetId, name, damage` |
| `status.reaction` | a reaction recipe fires (rules 13–15; currently off) | `targetId, recipe, pair` |
| `status.cr_changed` | Control Resistance changes (currently off) | `unitId, value, immune` |

`duration` is a number, `'permanent'` or `null`. `status.removed` reasons are `'expired' | 'window_closed' | 'holder_turn_start' | 'consumed' | 'cleansed' | 'reaction' | 'combat_start' | 'combat_end' | 'fled'`.

The QA-1 reasons: statuses with an `expiry` policy in `statusDefinitions` (Marked for Death, Expose, Guard) don't expire at round end:
- `window_closed` — an `applier_turns` window ran out, in `endNormalTurn()`.
- `holder_turn_start` — a `holder_next_turn_start` status ended when its holder's next turn began, in `expireAtTurnStart()`.

For these statuses `duration` counts the applier's remaining turns. `status.applied` carries `expiry: 'applier_turns' | 'holder_next_turn_start' | null` so a UI can label the timer correctly. `status.duration_changed` and `status.removed { expired }` together carry what the text shows as countdown numbers, so a front end can draw status timers without reading `getState()`.

#### Resources (player)
| Type | When | Payload |
|---|---|---|
| `resource.changed` | any change to `player.resource.current` | `unitId, resource, before, after, delta, max, cause, rule \| null, castId \| null` |
| `resource.max_changed` | level-up | `unitId, resource, before, after` |
| `resource.type_changed` | evolution resource swap (e.g. Momentum → Oath Points) | `unitId, from, to, regen` |

`cause` is one of `'skill_cost' | 'regen' | 'rule' | 'effect' | 'class_rule' | 'fight_start' | 'level_up' | 'revive' | 'cheat'`. When `cause` is `'rule'`, `rule` names the `resourceRules` key (`onKill`, `onDodge`, `onGuard`, `onBasicAttack`, `onDamageTaken`, `onMarkedHitRound`).

#### Progression and game
Only what the HP and resource ledgers need, plus the mode changes a menu needs.

| Type | When | Payload |
|---|---|---|
| `progression.xp_gained` | `addExperience()` | `amount, xp, xpToNext` |
| `progression.level_up` | each level gained | `level, stats: { strength, intelligence, agility, spd, def, critChance }` (new values) |
| `progression.branch_required` | `maybePromptBranch()` | `options: branchId[]` |
| `progression.branch_chosen` | `chooseBranch()` | `branchId` |
| `progression.stage_entered` | `enterStage()` | `stageId, name, skillId \| null, trait \| null` |
| `progression.stage_locked` | a story-gated stage blocks progress | `stageId, requires` |
| `progression.transformed` | `become_hollow_king` cheat | `unit: UnitInfo` (ledgers restart from here) |
| `game.started` | `start()` / restart | `seed, classes: classId[]` |
| `game.mode_changed` | `mode` changes | `from, to` |
| `game.room_entered` | `move()`, `chooseClass()` | `roomId, exits: { direction: roomId }` |
| `game.item_taken` | `takeItem()` / `world_pickup` | `roomItem, received` (after `adaptiveLoot`), `pickupId \| null` |
| `game.world_entered` | `enter_world` (§6A) | `worldId` |
| `game.world_flag` | a world run flag is set (§6A) | `kind: 'collected' \| 'defeated', id` |
| `game.item_used` | `applyItem()` succeeded | `item` (its effect follows as `unit.healed { cause: 'item' }`) |
| `game.ended` | win epilogue, defeat, `quit` | `outcome: 'won' \| 'defeat' \| 'quit', stats` |
| `game.loaded` | `load()` succeeded | `saveFormatVersion, warnings` |

#### Action results
| Type | When | Payload |
|---|---|---|
| `action.accepted` | `act()` starts executing | `action` (normalised) |
| `action.rejected` | refused by a rule; no turn used, no cost paid | `action, code, message` |
| `action.failed` | internal error; state rolled back (QA-3 transaction) | `action, code: 'INTERNAL_ERROR', message` |

### 3.5 Ordering and causality guarantees
Phase 1 **must not reorder rule execution**. Events are emitted at the moment each rule runs. The contract between semantic events:

- **G1 — Cause before effect.** `skill.used` precedes its `resource.changed { skill_cost }`, which precedes its hits. Every `combat.hit`/`combat.miss` carries the `castId` of a `skill.used` emitted earlier in the same encounter. Counters, chain arcs and bomb explosions get their own `castId` with the relevant `kind`.
- **G2 — A death follows its blow.** `unit.died` comes after the `unit.damaged` with `lethal: true` that caused it, before any other `unit.damaged`.
- **G3 — Turn framing.** `combat.turn_started { actorId }` precedes any `skill.used` by that actor in that turn.
- **G4 — Input boundary.** An `act()` or `input()` that leaves combat waiting for the player ends with exactly one `combat.awaiting_input` as its **last semantic event**. If the fight ended instead, it ends with `combat.ended` (possibly followed by `progression.*` / `game.*` events).
- **G5 — Status lifecycle.** For a `(holderId, name)`, `status.removed` never precedes its `status.applied`.
- **G6 — Within one hit:** `combat.hit` → `status.removed { consumed }` (marks, Guaranteed Crit) → `unit.damaged` → (`unit.died` → death consequences) → on-hit effects (e.g. leech `unit.healed`) → counter-attack. This mirrors `castSkill()` and `rollDamage()` in `src/engine/skills.js` today. An absorbed hit ends at `combat.absorbed` → `status.removed { consumed }`.

The relative order of **text** events and semantic events isn't contractual. Only the legacy text stream's own order is (C2).

### 3.6 Emission map (Developer checklist)
Where each event comes from in the current code. Paths are relative to `src/`.

| Module · function | Events |
|---|---|
| `engine.js` · `start()`, `chooseClass()` | `game.started`, `game.mode_changed`, `game.room_entered` |
| `engine/exploration.js` · `move()` | `game.room_entered` |
| `engine/exploration.js` · `takeItem()` / `grantItem()`\*, `applyItem()` | `game.item_taken`, `game.item_used`, `unit.healed { item }` |
| `engine/combat.js` · `startCombat()` | `combat.started`, `resource.changed { fight_start }`, `status.removed { combat_start }` (if any), `game.mode_changed` |
| `engine/combat.js` · `newRound()` / `endRound()` | `combat.round_started` / `resource.changed { class_rule \| regen \| rule }`, `combat.round_ended` |
| `engine/combat.js` · `advance()` | `combat.turn_started`, `combat.turn_skipped`, `combat.awaiting_input` |
| `engine/combat.js` · `springTrap()`, `detonateBombs()` | `combat.trap_sprung` → `status.applied`; `combat.bomb_exploded`, `combat.hit { bomb }`, `unit.damaged` |
| `engine/combat.js` · `checkBattleEnd()`, `tryCrownOfTheUndying()` | `unit.revived`, `unit.max_hp_changed`, `combat.ended`, `status.removed { combat_end }`, `unit.healed { breather }`, `progression.*`, `game.ended` |
| `engine/combat.js` · `enemyTurn()`, `minionTurn()` | `skill.used` (`forced`), `combat.no_action` |
| `engine/combat.js` · `hitConnects()` | `combat.miss`; **`combat.absorbed`** (Bone Wall); `status.removed { consumed }` (dodge used, hit or miss; absorb used); `resource.changed { rule: onDodge }` |
| `engine/combat.js` · `counterAttack()` | `status.removed { consumed }`, `skill.used` + `combat.hit { counter }`, `unit.damaged` |
| `engine/combat-input.js` · `combatCommand()` | `action.*`, `resource.changed { skill_cost }`, `combat.extra_turn`; flee → `combat.ended { fled }`, `status.removed { fled }` |
| `engine/skills.js` · `rollDamage()` | `status.removed { consumed }` for Guaranteed Crit and marks |
| `engine/skills.js` · `castSkill()` | `skill.used` (castId allocated here or just before cost), `combat.hit` |
| `engine/skills.js` · `damage()` / `heal()` / `gainResource()` | `unit.damaged` / `unit.healed` / `resource.changed`. Callers pass the cause as a new optional last argument. |
| `engine/skills.js` · `onDeath()` | `unit.died`, `combat.corpses_changed`, kill-related `resource.changed`, infection spread `status.applied` |
| `engine/skills.js` · `summon()`, `erase()` | `unit.summoned`, `unit.erased` |
| `engine/progression.js` · `addExperience()`, `maybePromptBranch()`, `chooseBranch()`, `applyStages()`, `enterStage()`, `becomeHollowKing()` | `progression.*`, `resource.type_changed`, `resource.max_changed`, `unit.max_hp_changed`, `unit.healed { level_up }` |
| `engine/world.js`\* · `enterWorld()`, `worldPickup()`, `worldEncounter()`, `worldFightEnded()` | see §6A |
| `effects.js` · `chain_lightning` | `combat.hit { chain }`, `unit.damaged` |
| `effects.js` · `delayed_aoe`, `place_trap`, `extra_turn` | `combat.bomb_set`, `combat.trap_placed`, `combat.extra_turn` |
| `effects.js` · `revert_hp` | `unit.healed` or `unit.damaged`, `cause: 'revert'` |
| `effects.js` · `aoe_damage_from_corpse` | `combat.corpses_changed { consumed }` |
| `effects.js` · `absorb_hit`, `bonus_damage_vs_flag_percent` (Dragon's Dominion) | `status.applied` only. Both are ordinary statuses through `applyStatus()`. |
| `statuses.js` · `applyStatus()` | `status.applied` / `status.blocked`; `status.cr_changed` |
| `statuses.js` · `tickStatusesEndOfRound()`, `tickDots()` | `status.duration_changed`, `status.removed { expired }`, `unit.damaged { dot }` |
| `statuses.js` · `endNormalTurn()`, `expireAtTurnStart()` (QA-1) | `status.duration_changed`, `status.removed { window_closed \| holder_turn_start }` |
| `statuses.js` · `rollOverflow()`, `cleanse()`, reaction outcomes | `status.overflow`, `status.removed { cleansed \| reaction }`, `status.reaction`, `unit.damaged` |

\* On `claude/world-c-polish` until Zone 1 Phase B/C lands on `main`.

**State changes that bypass the primitives today.** Each must be routed through a primitive or emit its event explicitly, or the ledgers (I4–I6) won't close. **For new code, the rule is: change HP, resources and statuses only through `damage()` / `heal()` / `gainResource()` / `applyStatus()` / `removeStatus()`.**

| Bypass | Where |
|---|---|
| HP set directly (5) | `effects.js` `revert_hp`; `engine/combat.js` `tryCrownOfTheUndying()`; `engine/progression.js` `addExperience()` (level-up refill) and `becomeHollowKing()`; `engine/skills.js` `erase()` |
| Resource set directly (4) | `engine/combat-input.js` `combatCommand()` (skill cost); `engine/combat.js` `tryCrownOfTheUndying()`; `engine/progression.js` `addExperience()` and `becomeHollowKing()` |
| Status removal outside `removeStatus()` (9) | `engine/combat.js` `startCombat()` and `checkBattleEnd()` (victory); `engine/combat-input.js` `combatCommand()` (flee); `engine/skills.js` `rollDamage()` (Guaranteed Crit, consumed marks); `statuses.js` `tickStatusesEndOfRound()`, `endNormalTurn()`, `expireAtTurnStart()`, `cleanse()` |

**Not an event, but UI-visible:** the QA-2 Shield Bash recovery state (`shieldBashRecovery` on a combatant) decides whether Shield Bash will stun. Expose it in `getState()` (§6) and as an availability note on Shield Bash (§4.2). It never makes the skill unusable.

### 3.7 Worked example (real run, seed 2)
`new GameEngine({ seed: 2, events: 'full' })`, then `necromancer`, `e`, `engage`, `grave bolt 1`. This is the **second** `grave bolt 1`, which kills `enemy_0`. HP, damage, resource, round and cast numbers come from the actual run (`engage` already caused casts c1–c3, the first bolt round c4–c7). `seq` values are illustrative. Re-verified on `main` @ `0a6d760` (v0.2): same HP, damage, Soul Energy, round and turn order.

```js
{ seq: 211, type: 'action.accepted', action: { type: 'skill', skillId: 'Grave Bolt', targetId: 'enemy_0' } }
{ seq: 212, type: 'skill.used', round: 2, castId: 'c8', casterId: 'player', skillId: 'Grave Bolt',
  targetIds: ['enemy_0'], cost: 1, resource: 'Soul Energy', isBasic: false, forced: null }
{ seq: 213, type: 'resource.changed', round: 2, unitId: 'player', resource: 'Soul Energy',
  before: 1, after: 0, delta: -1, max: 10, cause: 'skill_cost', rule: null, castId: 'c8' }
{ seq: 215, type: 'combat.hit', round: 2, castId: 'c8', attackerId: 'player', targetId: 'enemy_0',
  skillId: 'Grave Bolt', kind: 'normal', hitIndex: 1, hitCount: 1, amount: 15, raw: 16, crit: false,
  damageType: 'magic', trueDamage: false, armorIgnore: 0 }
{ seq: 216, type: 'unit.damaged', round: 2, targetId: 'enemy_0', sourceId: 'player', amount: 15,
  hpBefore: 14, hpAfter: -1, lethal: true, cause: 'hit', castId: 'c8', statusName: null }
{ seq: 217, type: 'unit.died', round: 2, unitId: 'enemy_0', killerId: 'player', cause: 'hit', corpse: true, killCredited: true }
{ seq: 219, type: 'combat.corpses_changed', round: 2, count: 1, delta: 1, cause: 'death' }
{ seq: 221, type: 'resource.changed', round: 2, unitId: 'player', resource: 'Soul Energy',
  before: 0, after: 2, delta: 2, max: 10, cause: 'class_rule', rule: null, castId: 'c8' }
{ seq: 223, type: 'resource.changed', round: 2, ... cause: 'class_rule' ... before: 2, after: 3 }  // dealt damage this round
{ seq: 224, type: 'status.duration_changed', ... }   // only if statuses are ticking
{ seq: 225, type: 'combat.round_ended', round: 2 }
{ seq: 226, type: 'combat.round_started', round: 3, order: ['enemy_1', 'enemy_2', 'player'] }
{ seq: 227, type: 'combat.turn_started', round: 3, actorId: 'enemy_1' }
{ seq: 229, type: 'skill.used', round: 3, castId: 'c9', casterId: 'enemy_1', skillId: 'Quick Swipe', targetIds: ['player'], ... }
{ seq: 230, type: 'combat.hit', round: 3, castId: 'c9', ... amount: 3, crit: true }
{ seq: 231, type: 'unit.damaged', round: 3, targetId: 'player', amount: 3, hpBefore: 71, hpAfter: 68, ... }
{ seq: 233, type: 'combat.turn_started', round: 3, actorId: 'enemy_2' }
{ seq: 235, type: 'skill.used', round: 3, castId: 'c10', casterId: 'enemy_2', skillId: 'Disorienting Whisper', ... }
{ seq: 236, type: 'combat.hit', round: 3, castId: 'c10', ... amount: 0 }                 // no unit.damaged
{ seq: 237, type: 'combat.turn_started', round: 3, actorId: 'player' }
{ seq: 239, type: 'combat.awaiting_input', round: 3, actorId: 'player', kind: 'action' }
// seq gaps = interleaved text events ("Used 1 Soul Energy.", "Cellar Vermin has been defeated!", …)
```

Notes on the example:
- `hpAfter: -1` is the real engine value: HP can go below 0 today. Front ends clamp for display. Changing that is a rule change and out of scope.
- `raw: 16` is illustrative. The real value is whatever `rollDamage()` computed before armor.

---

## 4. Structured action API

### 4.1 Surface
```js
engine.getAvailableActions()          // -> Availability   (pure: no state change, no RNG use)
engine.act(action)                    // -> ActionResult   (transactional, like input())
engine.input(text)                    // unchanged signature; parses text -> act()
```
```js
// ActionResult
{ ok: true,  events: [...] }
{ ok: false, events: [...], error: { code: 'NOT_ENOUGH_RESOURCE', message: 'Not enough Soul Energy! (…)' } }
```
`events` follows the engine's event mode (§3.2). On rejection the engine emits the same text a typed command produces today (`Error: …` plus the combat menu), so the text game and act-driven front ends share one path.

### 4.2 Availability
```js
{
  mode: 'combat',                         // class_select | explore | branch_select | combat | game_over | won
  awaiting: 'action',                     // 'action' | 'continue' | 'choice' | 'control' (N-5, + controlledActorId) | 'turn_order' (D-09) | null
  actions: [
    { type: 'attack', skillId: 'Basic Attack', targeting: 'enemy_single', enabled: true,
      targets: [{ id: 'enemy_1', enabled: true }, { id: 'enemy_2', enabled: true }] },
    { type: 'skill', skillId: 'Grave Bolt', cost: 1, resource: 'Soul Energy', targeting: 'enemy_single',
      enabled: true, targets: [{ id: 'enemy_1', enabled: true }, { id: 'enemy_2', enabled: true }] },
    { type: 'skill', skillId: 'Corpse Bloom', cost: 2, resource: 'Soul Energy', targeting: 'corpse',
      enabled: false, reason: { code: 'REQUIREMENT_FAILED', message: 'There is no corpse on the battlefield to bloom.' } },
    { type: 'use_item', item: 'Bandages', count: 2, enabled: true },
    { type: 'flee', enabled: true }
  ]
}
```
- **Every known skill is listed**, including disabled ones with a `reason`, so a UI can grey it out and explain why. The text menu shows the same information today (`[not implemented]`, `[Cost: …]`).
- **Per-target checks.** A skill's `requires()` hook is evaluated per candidate target for single-target skills (e.g. Assassinate: "too healthy" on one enemy, allowed on another), and once with the full set for area skills.
- **`targeting`** is the skill's data `target` value: `enemy_single, enemy_multiple, enemy_aoe, all_enemies, all_combatants, self, minions, ground, ally_single, corpse, linked_enemies`. For `enemy_single` and `enemy_multiple`, `targets` lists the choosable units. For everything else it lists the units that *will be affected*, for display only.
- **`enemy_multiple`** (Soul Chain) adds `pick: { min, max }`, for example `{ min: 2, max: 2 }` at Soulbinder and `{ min: 2, max: 3 }` at Chain of Woe. The action carries `targetIds: [...]`, distinct and living. The engine has **no** multi-target selection today: the text parser reads one number and `pickTargets()` falls back to single-target. The text syntax `soul chain 1 3` is a parser addition.
- **Requirement on the effect registry:** `requires()` hooks must stay side-effect free. All current ones are; this becomes a documented rule in `effects.js`.
- **Notes:** an enabled option can carry `notes: [{ code, message }]` that don't block it. For example, Shield Bash on a target in QA-2 recovery gets `{ code: 'STUN_NOT_ELIGIBLE', message: '… must act once before it can be stunned again' }`. The skill still deals damage.
- **Why this comes first:** the Zone 1 battle overlay currently re-derives "can I use this?" itself, from implementation status and cost only. It misses silence, once-per-fight, QA-2 recovery and every `requires()` refusal ([`TECH_REVIEW_2026-10-23.md`](TECH_REVIEW_2026-10-23.md) F2). `getAvailableActions()` is the single source of that answer.

### 4.3 Action catalogue
| Action | Valid when | Text equivalent today |
|---|---|---|
| `{ type: 'choose_class', classId }` | `class_select` | `warrior` |
| `{ type: 'choose_branch', branchId }` | `branch_select` | `bone warden` |
| `{ type: 'move', direction }` | `explore` | `go east`, `e` |
| `{ type: 'take', item }` | `explore` | `take bandages` |
| `{ type: 'use_item', item }` | `explore`, `combat` (awaiting action) | `use bandages` |
| `{ type: 'engage' }` | `explore` | `engage`, `fight` |
| `{ type: 'attack', targetId? }` | `combat` | `attack 2` |
| `{ type: 'skill', skillId, targetId? }` or `{ type: 'skill', skillId, targetIds }` for `enemy_multiple` | `combat` | `grave bolt 2`, `gb 2`, `soul chain 1 3` *(new)* |
| `{ type: 'flee' }` | `combat` | `flee` |
| `{ type: 'continue' }` | `combat`, awaiting `continue` | any input after a skipped turn |
| `{ type: 'control', actorId, skillId, targetId? }` *(N-5, Keel review §3.1)* | `combat`, awaiting `control` (a possessed enemy's turn); anything else is `WRONG_MODE` | `test hit 2` (the controlled actor's move; numbers index the list printed for it) |
| `{ type: 'turn_order', order: [ids] \| null }` *(D-09, Keel review §3.2)* | `combat`, awaiting `turn_order` (round start inside an Eternal Architect window). `order` must be an exact permutation of the living combatant ids, else `INVALID_ORDER` at no cost; `null` keeps the speed order | `order 3 1 2 4` (positions in the printed list), `order` |
| `{ type: 'describe', subject: 'room' \| 'inventory' \| 'help' \| 'class_tree' }` | any (text output only) | `look`, `i`, `help`, `cl` |
| `{ type: 'restart' }` | any | `start` |
| `{ type: 'quit' }` | `explore` | `quit` |
| `{ type: 'cheat', cheat: 'add_xp' \| 'become_hollow_king' \| 'unlock_events', amount? }` | as today | `add_xp 250`, … |

Rules:
- `targetId` is optional only when the skill isn't `enemy_single`, or exactly one valid target exists (today's rule in `engine/combat-input.js` `pickTargets()`).
- **Basic-attack semantics are preserved.** `{ type: 'attack' }` resolves to `basicAttackName()`. A `{ type: 'skill' }` whose `skillId` equals the basic attack counts as basic too (the `isBasic` check in `combatCommand()`). That drives `onBasicAttack`, Combo Points and Virulent Touch.
- Hunter's Instinct, once-per-fight, silence, extra turns and the QA-5 `continue` pause behave exactly as in `combatCommand()` today. The action API exposes them; it doesn't redefine them.
- `describe` exists so `input()` can route **every** command through `act()`. Graphical clients use `getState()` and the data instead.

### 4.4 Rejection codes
Each comes from a current message, so text output is unchanged. Unless noted, the triggers are checks in `engine/combat-input.js` `combatCommand()`, in this order.

| Code | Current trigger |
|---|---|
| `WRONG_MODE` | action not valid in the current mode (world intents: `'Not now.'`) |
| `NOT_YOUR_TURN` | `Not your turn!` |
| `UNKNOWN_SKILL` / `SKILL_NOT_KNOWN` | unknown command / skill not learned (`Did you mean…` suggestions stay in the text parser) |
| `SILENCED` | silenced, non-basic skill |
| `NOT_IMPLEMENTED` | skill has no implemented effect |
| `ONCE_PER_FIGHT` | already used this fight |
| `NOT_ENOUGH_RESOURCE` | cost above current resource |
| `INVALID_TARGET` | target missing or not alive |
| `INVALID_ORDER` | D-09: a `turn_order` that isn't an exact permutation of the living combatants (no cost; the round keeps waiting) |
| `ALREADY_COLLECTED` / `ALREADY_DEFEATED` | world intents (§6A): `'There is nothing left here.'` / `'Nothing stirs here any more.'` |
| `REQUIREMENT_FAILED` | any `requires()` refusal (no corpse, too healthy, traps full, minion cap…) |
| `NO_ITEM` / `ITEM_NO_USE` / `FULL_HEALTH` | `useItem()` / `applyItem()` |
| `NO_EXIT` / `NO_ENEMIES` / `ITEM_NOT_HERE` | `move()` / `engage()` / `takeItem()` |
| `INVALID_CLASS` / `INVALID_BRANCH` | `chooseClass()` / `chooseBranch()` |
| `INTERNAL_ERROR` | exception → rollback (QA-3 transaction) |

### 4.5 `input()` as a translator
`input(text)` keeps doing what only the text game needs:
1. Echo `> text` and `clear`.
2. Parse the command, aliases and curly quotes.
3. Resolve target numbers to ids (ID-2).
4. Produce "I don't understand" and "Did you mean…" messages.
5. Call `act()` with the parsed action.

There is no second rules path.

---

## 5. Save/load

### 5.1 Surface
```js
engine.serialize({ label, createdAt, attachments })   // -> SaveGame (plain JSON-safe object)
engine.load(save, { strictData = false })   // -> { ok, warnings, events, error? }
GameEngine.fromSave(save, options)          // -> new engine with that save loaded (throws only on misuse)
```
- **When:** at any point **between** commands, in any mode, **including mid-combat** while the engine awaits input. The engine is synchronous, so every point between calls is consistent.
- **Transactional:** a failed `load()` leaves the current game untouched (same mechanism as the QA-3 rollback).
- **Not the engine's job:** storage, slots, file dialogs, `localStorage` or timestamps. The engine stays DOM-, timer- and clock-free; `createdAt` is supplied by the caller or left `null`.
- **On success:** `load()` emits `game.loaded` followed by the normal text a player needs (room description, or the combat menu if mid-fight).

### 5.2 SaveGame format v1
```json
{
  "format": "enso-save",
  "formatVersion": 1,
  "engine": { "version": "0.1.0", "eventSchema": 1 },
  "data": { "hash": "9f2c…" },
  "meta": { "label": "Before the Warden", "createdAt": null },
  "rng": { "algorithm": "mulberry32", "seed": 2, "state": 1832291023 },
  "counters": { "eventSeq": 239, "encounters": 2 },
  "state": {
    "rooms": {}, "currentRoom": "collapsed_wine_cellar", "mode": "combat",
    "player": {}, "combat": {}, "pendingBranchChoice": false,
    "flags": {}, "stats": {}, "progression": {},
    "world": { "collected": [], "defeated": [], "encounter": null, "lastEncounter": null, "lastResult": null }
  },
  "attachments": { "world": { "map": "grounds", "x": 9, "y": 6, "facing": "down" } }
}
```
- **`state`** has exactly the fields `snapshot()` in `src/engine.js` already captures, so the transaction and the save share one definition of "everything a command can change". With Zone 1 Phase B that includes `world`, the engine-owned run flags, which is `null` in the text game. `combat.nextCastId` and the minion `key` live inside `state.combat`.
- **`attachments`** is opaque front-end state the engine stores and returns untouched, so it's never validated as game rules. The world front end puts the `WorldSession` position there (`session.getState()`). Space stays out of the engine, matching the AGENTS.md rule that the world owns space, but one save file still restores the whole game. `load()` returns `attachments` in its result.
- **`data.hash`** is a deterministic, dependency-free string hash of `JSON.stringify(data)` (e.g. FNV-1a or cyrb53).
- **`engine.version`** comes from `package.json`, injected as a constant.

### 5.3 Randomness
- **R1** The engine **always** uses `mulberry32`. Without an explicit seed it picks one once (`Math.random()`), stores it as `engine.seed`, and reports it in `game.started`. Today an unseeded engine uses `Math.random` directly, and its state can't be saved. **This affects every graphical player now:** `world.html` creates an unseeded engine, so no browser run can be replayed from a bug report. Front ends should show the seed, for example in the pause menu.
- **R2** Seeded behaviour is unchanged: same seed, same draws (C5). Unseeded games stay random per session, but every session becomes reproducible from its reported seed. Bug reports get easier as a side effect.
- **R3** Loading restores the RNG state, so serialize → load → continue gives the **identical** future (I13).

### 5.4 Validation and versions
| Situation | Result |
|---|---|
| Not an object / wrong `format` | `ok: false`, `FORMAT_UNKNOWN` |
| `formatVersion` newer than supported | `ok: false`, `VERSION_UNSUPPORTED` |
| `formatVersion` older | run migrations `1 → 2 → …` (none exist in Phase 1) |
| Missing or invalid required fields | `ok: false`, `CORRUPT` |
| `data.hash` differs from current data | **warning** `DATA_CHANGED` and load proceeds; with `strictData: true`, `ok: false` |

During development, balance numbers change constantly. Refusing saves on every data edit would make saves useless for playtesters, hence the default warning. Mid-combat saves keep the enemy stats they were spawned with, because enemies are cloned in `startCombat()`. That's expected.

`load()` never evaluates code from a save. It's `JSON` in, plain assignment out.

---

## 6. `getState()` additions
All additive. Existing fields keep their shape: `combat.enemies` and `combat.minions` still list **living** units only.

| New field | Content |
|---|---|
| `seed`, `eventSeq` | as in §2.1 / §5.3 |
| `awaiting` | `'action' \| 'continue' \| 'choice' \| 'control' \| 'turn_order' \| null` |
| `combat.controlledActorId`, `combat.turnOrder`, `combat.timers` | Possession, Eternal Architect and the shared opportunity timers ([`REVIEW_DESIGN_PACKAGES_1-3.md`](REVIEW_DESIGN_PACKAGES_1-3.md) §1, §3) |
| `combat.encounterId` | `enc_<n>` |
| `combat.units` | every unit in the encounter, **including dead and erased**, as UnitInfo plus `alive`, `erased`, `statusEffects` |
| `combat.order` | ids in this round's order |
| `combat.currentActorId` | id or `null` |
| `combat.traps`, `combat.bombs` | counts / `{ skillId, turns }` |
| `combat.minions[].key` | minion template |
| `combat.enemies[].shieldBashRecovery` | QA-2 recovery state, or `null` |

Already added by Zone 1 Phase B, and kept: `world` (run flags; `null` in the text game) and `combat.awaitingContinue`. `awaiting` above supersedes `awaitingContinue` for new code.

`getState()` deep-clones on every call, which is fine per event and wasteful per frame. Front ends should refresh on events, not on every frame.

---

## 6A. World integration (Zone 1 and later zones)
The world model (`src/world/`) owns **space**: maps, collision, movement and transitions. The engine owns **rules, inventory, fights and run flags** (AGENTS.md §3; Zone 1 spec §5). Zone 1 Phase B added three engine intents in `src/engine/world.js`. Each is already a transaction that returns text events. This section folds them into the action API and the event stream. Their behaviour is unchanged.

### 6A.1 Intents become actions
| Today (Phase B) | Phase 1 action | Events (in `full` mode) |
|---|---|---|
| `engine.enterWorld()` | `{ type: 'enter_world', worldId }` | `game.world_entered { worldId }` |
| `engine.worldPickup(id, item)` | `{ type: 'world_pickup', pickupId, item }` | `game.item_taken { roomItem: item, received, pickupId }` or `action.rejected { ALREADY_COLLECTED }` |
| `engine.worldEncounter(id, enemyKeys)` | `{ type: 'world_encounter', encounterId, enemies }` | `combat.started { …, source: { kind: 'world', encounterId } }`, then normal combat events, or `action.rejected { ALREADY_DEFEATED }` |
| `worldFightEnded(result)` (internal) | — | `game.world_flag { kind: 'defeated', id }` on victory; `combat.ended` already carries `outcome` |

The old method names stay as thin wrappers for compatibility (C1).

### 6A.2 Identity
- `combat.started.source` is `{ kind: 'room', roomId }` for the text game and `{ kind: 'world', encounterId }` for world fights.
- `entityKey` is already `world:<encounterId>#<n>` for world enemies (Phase B passes the scope into `startCombat()`), so kill credit is per encounter. This is now a contract (ID table §2.1): **an `entityKey` is unique across both room and world fights in one run.**
- World object ids (`pickupId`, `encounterId`) are the ids validated by `validateWorld()`, which already enforces uniqueness across the whole world.

### 6A.3 Rules
- **W1** World intents never advance rounds, statuses, resources or RNG. Walking already doesn't (tested in Phase A). `world_pickup` and a rejected `world_encounter` make no RNG draws.
- **W2** A world fight never touches the legacy room graph: no `rooms[currentRoom].enemies` clearing and no room description. Phase B already guarantees this. It becomes invariant I17.
- **W3** The world front end drives combat **only** through `getAvailableActions()` and `act()`, and builds its battle log from events, not by filtering engine sentences. This retires F2 in the tech review. Until `act()` exists, the current text bridge is accepted.
- **W4** Flee, victory and defeat are reported by `combat.ended.outcome`. The world front end must not infer them from `mode` and `world.lastResult`. Those fields stay readable for compatibility.

---

---

## 7. Compatibility requirements
Each requirement has a check QA can run.

| # | Requirement | Verification |
|---|---|---|
| **C1** | `start()`, `input()`, `getState()` keep their signatures and return types. | Existing tests |
| **C2** | In `legacy` mode (default), every text/clear event is **byte-identical** to the pre-Phase-1 baseline, in the same order. | Tally's `qa/scripts/golden.js` (400 seeded sessions) with **separate hashes**: the **events** hash must not change; the **state** hash must match after removing the `getState()` fields this spec adds (§6). One combined hash can't tell additive state from changed behaviour. Seen on 2026-10-23: the Phase B world fields changed the combined hash while events were byte-identical. |
| **C3** | All existing tests (147 on `main`; 162 with Zone 1 B/C) pass **without edits**. Any unavoidable edit is listed and justified in the PR, and QA signs off on it. | `npm test` |
| **C4** | `tools/play-cli.js`, `balance.js`, `missing-effects.js`, `pending-decisions.js`, `build-single.js`, `world-check.js` and `qa/scripts/*` run unchanged with identical output. | Run each; diff output |
| **C5** | Seeded RNG draw sequences are unchanged: emitting events, building availability and serialising never call `rng()`. | `npm run balance -- --runs 30` win rates identical; golden transcripts |
| **C6** | Internal primitives stay callable **with synthetic objects and without an active combat**. Tests call `rollDamage`, `applyDot`, `infect`, `applyStatus`, `damage`, `tickStatusesEndOfRound` and `newRound` directly, some with hand-built attackers (the `dummyHit` builder in `tests/helpers.js`). Emission must be null-safe: missing `combat` → no `round`; missing `id` → `null`. | Existing tests |
| **C7** | The engine stays DOM-free, timer-free, clock-free and dependency-free (AGENTS.md §3, §7). | Code review; `grep` for `window`, `document`, `setTimeout`, `Date` in `src/` |
| **C8** | `index.html`, `world.html` and both single-file builds keep working. Any new `src/` file goes into `MODULES` in `src/engine.js` (for engine modules) and as a `<script>` in **both** HTML files, in load order (AGENTS.md §3). | Open both pages from a plain file; `npm run build` |
| **C9** | Existing id formats unchanged (`player`, `enemy_<n>`, `minion_<n>`, `world:<encounterId>#<n>` entity keys). | Existing tests that reference ids |
| **C10** | Dev cheats keep working through text and through `{ type: 'cheat' }`. | Tests |
| **C11** | QA-3 transaction semantics cover `act()` and `load()`: an exception rolls back, returns `ok: false`, and the game stays playable. | Repro C from QA report #1, via `act()` |
| **C12** | **No gameplay change.** No rule, balance number, `null` pending value or approved status behaviour (including QA-1) changes. This spec only describes the engine. | Golden transcripts + balance output |

---

## 8. Invariants for QA test planning
QA owns the test plan. These are the properties this spec promises; each can be checked mechanically across the existing fuzz runs.

| # | Invariant |
|---|---|
| **I1** | **Determinism.** Same seed + same actions → deep-equal full event streams. |
| **I2** | **JSON safety.** Every event, availability object and save survives `JSON.parse(JSON.stringify(x))` unchanged; no `undefined`. |
| **I3** | **Sequence.** `seq` increases by exactly 1 across all calls, rollbacks and save/load. Rolled-back events are discarded together with their numbers. |
| **I4** | **HP ledger.** For every unit: starting `hp` (from `combat.started` / `unit.summoned` / `progression.transformed`) + Σ `unit.healed` − Σ `unit.damaged` = `hp` in `getState()`, at every `combat.awaiting_input`. |
| **I5** | **Resource ledger.** Same rule for `player.resource.current` via `resource.changed`; `max` and `type` via their events. |
| **I6** | **Status ledger.** Replaying `status.applied` / `duration_changed` / `removed` reconstructs every unit's `(name, stacks, duration)` set at every `combat.awaiting_input`. |
| **I7** | **Deaths.** At most one `unit.died` per unit per life (a `unit.revived` starts a new life). Every unit at `hp ≤ 0` after a command has `unit.died` or `unit.erased`. Erased units never get `unit.died`. |
| **I8** | **Causality.** G1–G6 (§3.5) hold on every stream. |
| **I9** | **Pure availability.** `getAvailableActions()` leaves `snapshot()` and RNG state unchanged; two calls in a row are deep-equal. |
| **I10** | **Availability agrees with `act()`.** Every enabled (action, target) is accepted; every disabled one is rejected with the listed `code`. (Test on copies made with `serialize`/`load`.) |
| **I11** | **Text parity.** Golden transcripts match (C2). |
| **I12** | **Parser equivalence.** For every command in the transcript corpus, `input(text)` and `act(parsed)` produce the same semantic events. |
| **I13** | **Save round-trip.** At random points in fuzz runs: serialize → load into a fresh engine → continue → stream (including `seq`) identical to the uninterrupted run. |
| **I14** | **Save robustness.** Truncated, mutated, wrong-format or future-version saves → `ok: false` with a code; no exception escapes; the prior game is intact. |
| **I15** | **Liveness.** Fuzz bots choosing random *enabled* actions from `getAvailableActions()` never hit `INTERNAL_ERROR`, and every combat command ends per G4. |
| **I16** | **Mode filter.** The `legacy` stream equals the `full` stream filtered to `text`/`clear` with `seq` removed. |
| **I17** | **World isolation.** A world fight (any outcome) leaves `rooms` deep-equal to before. Each `pickupId` and each defeated `encounterId` is recorded at most once per run. Kill credit for distinct encounters never collides. |
| **I18** | **One source of truth for the battle menu.** Every option the world battle overlay shows as enabled is enabled in `getAvailableActions()`, and every disabled one carries the same `reason.code`. Testable headlessly once the overlay reads availability (§6A W3). |

---

## 9. Suggested delivery order (for Developer review, not a work order)
Small PRs per AGENTS.md §2; each one is independently green.

Re-ordered in v0.2. The world battle screen exists now, so ordering is by what it needs first.

| PR | Content | Why this order |
|---|---|---|
| **PR-A** ✅ *mostly done* | Baseline = Tally's `qa/scripts/golden.js`. **Remaining:** an events-only / state-only split (C2), and scripted world fights in the corpus once Zone 1 B/C is on `main`. **No engine change.** | Freezes the baseline that C2/C5/C12 are checked against. |
| **PR-1** | **Always-seeded RNG** (R1) + seed shown in `world.html`. | Tiny. Makes browser bugs reproducible immediately. |
| **PR-2** | `getAvailableActions()`, `act()`, rejection codes, world actions (§6A.1); `input()` rebuilt as the translator; world battle overlay switched to availability + `act()` (W3). | Removes the overlay's command strings, index targeting and duplicated rules (review F2). The largest refactor of `combatCommand()`; the golden events hash guards it. |
| **PR-3** | Event emitter + modes + `seq`, `encounterId`, `castId`; combat-flow, hit/absorb, HP and death events; route the HP bypass sites. Overlay log built from events. | Enables ordered animations (D3); I1–I4, I7. |
| **PR-4** | Status and resource events (incl. QA-1 expiry reasons); route the resource and status-removal bypass sites. | Closes I5–I6; status timers in the UI. |
| **PR-5** | `serialize()` / `load()` / `fromSave()` with `attachments`; `getState()` additions. | Builds on `snapshot()`/`restore()`. Save **UX** is deferred (Zone 1 §10); the engine side can land without it. |

A dev-only `src/events.js` (event catalogue + `validateEvent()` for tests) is recommended, but it's the Developer's call (OQ5).

---

## 10. Open questions

### For the Developer's review
- **OQ1 — Default mode.** I recommend `legacy` for Phase 1. Flip to `full` only after `play-cli` and the text UI are taught to skip semantic events.
- **OQ2 — Where to emit.** I recommend inside the primitives, with a small context stack (current `castId`, cause) set by `castSkill()`, `tickDots()` etc., rather than wrapping callers. Better ideas welcome.
- **OQ3 — Item identity.** Are names enough until equipment arrives?
- **OQ4 — Hit breakdown.** Is `raw` enough, or should `combat.hit` carry the full mitigation breakdown (armor, reduction, mark multiplier)? Useful for UI tooltips and QA balance work.
- **OQ5 — Catalogue file.** A separate `src/events.js` with a validator used by tests, or inline?
- **OQ6 — Effort and risk.** Please flag any part of §3.6 that's harder than it looks, especially the cost/castId ordering in `combatCommand()`.

### For QA
- **OQ7** `golden.js` covers the text game well (400 sessions, all classes and obtainable skills). Should it also script world sessions: pickups, each encounter, flee/re-engage, defeat? Should the events/state split be a flag on `golden.js` or a second script?
- **OQ8** Should invariants I4–I7 run inside the existing fuzz suites, or as a separate QA suite?

### For Design / Creative Director
**None blocking.** This spec makes no design decision. Three current behaviours are described rather than changed, so Design knows they're visible in events:
- HP can drop below 0.
- Erase isn't a death (no corpse, no kill credit).
- The player gets a `unit.died` event before Crown of the Undying revives them.

---

## 11. Review and sign-off
| Role | Asked to | Sign-off |
|---|---|---|
| Wren — Primary Developer | Review feasibility, effort and §3.6/§4.5/§6A; answer OQ1–OQ6; propose changes as PR comments | ☐ |
| Rook — Night Shift Developer | Review §3.6's bypass rule for new effects | ☐ |
| Tally — QA & Balance | Draft a test plan from §7–§8; answer OQ7–OQ8 | ☐ |
| Vaelis — Lead Game Designer | FYI only: confirm the three behaviours in §10 are described correctly | ☐ |
| UX Designer *(seat open)* | Use §4.2 (availability with reasons) and §3.4 (event catalogue) as the basis for battle-menu and animation specs | ☐ |
| Tokelo — Creative Director | Approve implementation, in slices (§9), after Developer and QA review | ☐ |
