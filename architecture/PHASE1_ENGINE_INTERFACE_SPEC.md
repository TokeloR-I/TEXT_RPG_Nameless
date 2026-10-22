# Phase 1 — Engine Interface Specification

**Author:** Technical Director & Game Systems Architect
**Date:** 2026-10-22
**Version:** 0.1 — **draft for review**
**Status:** For Developer review and QA test planning. **Not approved for implementation.** No code was changed.
**Baseline:** `main` @ `ff49d5c` (100/100 tests). Every code reference below is to that commit.
**Builds on:** [`TECHNICAL_FEASIBILITY.md`](TECHNICAL_FEASIBILITY.md) §3 gaps G1 (prose-only output), G2 (text-only input), G7 (save/load) and §10 Phase 1.

---

## 0. Purpose and scope

The engine's rules are ready for a graphical front end; its interface isn't. Today a front end can only send typed strings and read English sentences back. This spec defines the interface layer that lets any front end (Phaser, a test bot, a future port) drive the engine with structured data, **without changing a single game rule and without breaking the text game**.

| In scope | Out of scope |
|---|---|
| Structured events: combat flow, attacks, damage, healing, deaths, statuses, resources, plus the progression events needed for HP/resource bookkeeping | Positions/ranks, tilemaps, world movement |
| Structured action API with an "available actions" query | Combat time model (turn-based / ATB / real-time) |
| Stable identifiers | Phaser, rendering, animation mapping, art |
| Save/load interface and file format | UX and layout decisions (UX report pending) |
| Compatibility requirements for the text game, CLI, tests and tools | Any rule, balance or `null` design value change; QA-1/2/8 fixes |

### Combat-style neutrality
This interface works for every combat style still under consideration, so it doesn't force the D1 decision:
- **Turn-based:** fully covered.
- **ATB:** every event and action stays valid; ATB would *add* timing events (e.g. gauge updates) later.
- **Real-time action:** `act()` remains the intent API and the damage/heal/death/status events stay valid; only the round and turn events would no longer apply.

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

**DamageCause** — why HP went down: `'hit' | 'dot' | 'overflow' | 'reaction' | 'instant_kill' | 'self_cost' | 'revert'`.

**HealCause** — why HP went up: `'item' | 'leech' | 'breather' | 'level_up' | 'revert' | 'revive'`.

### 3.4 Event catalogue

#### Combat flow
| Type | When | Payload |
|---|---|---|
| `combat.started` | `engage` | `encounterId, roomId, units: UnitInfo[], order: id[]` |
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
| `combat.hit` | a hit's damage is calculated (**also when it's 0**) | `castId, attackerId, targetId, skillId, kind, hitIndex, hitCount, amount, raw, crit, damageType, trueDamage, armorIgnore` |
| `combat.trap_placed` | Poison Trap etc. | `castId, trapName, value, duration, trapsSet` |
| `combat.trap_sprung` | an enemy starts its turn on a trap | `targetId, trapName` |
| `combat.bomb_set` | Clockwork Bomb | `castId, skillId, turns` |
| `combat.bomb_exploded` | at the start of the player's turn | `castId` (new), `originCastId, skillId` |
| `combat.corpses_changed` | a kill, or Corpse Bloom consuming one | `count, delta, cause: 'death' \| 'consumed'` |

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
| `status.applied` | `applyStatus()` succeeds (new or refreshed) | `targetId, sourceId, name, statusType, category, value, stacks, stacksAdded, duration, refreshed, castId \| null` |
| `status.blocked` | `applyStatus()` refuses | `targetId, sourceId, name, reason: 'immune' \| 'control_resistance' \| 'target_dead'` |
| `status.duration_changed` | end-of-round tick on a status that stays | `targetId, name, duration` |
| `status.removed` | **any** removal | `targetId, name, reason` |
| `status.overflow` | Overflow Burst (rules 7–9; currently off, pending values) | `targetId, name, damage` |
| `status.reaction` | a reaction recipe fires (rules 13–15; currently off) | `targetId, recipe, pair` |
| `status.cr_changed` | Control Resistance changes (currently off) | `unitId, value, immune` |

`duration` is a number, `'permanent'` or `null`. `status.removed` reasons are `'expired' | 'consumed' | 'cleansed' | 'reaction' | 'combat_start' | 'combat_end' | 'fled'`. `status.duration_changed` and `status.removed { expired }` together carry what the text shows as countdown numbers, so a front end can draw status timers without reading `getState()`.

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
| `game.item_taken` | `takeItem()` | `roomItem, received` (after `adaptiveLoot`) |
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
- **G6 — Within one hit:** `combat.hit` → `status.removed { consumed }` (marks, Guaranteed Crit) → `unit.damaged` → (`unit.died` → death consequences) → on-hit effects (e.g. leech `unit.healed`) → counter-attack. This mirrors `castSkill()` L944–958 and `rollDamage()` L905–931 today.

The relative order of **text** events and semantic events isn't contractual. Only the legacy text stream's own order is (C2).

### 3.6 Emission map (Developer checklist)
Where each event comes from in the current code (`main` @ `ff49d5c`).

| Code site | Events |
|---|---|
| `engine.js` `start()` L52 | `game.started`, `game.mode_changed` |
| `chooseClass()` L222, `move()` L268 | `game.mode_changed`, `game.room_entered` |
| `takeItem()` L276, `applyItem()` L294 | `game.item_taken`, `game.item_used`, `unit.healed { item }` |
| `startCombat()` L333 | `combat.started`, `resource.changed { fight_start }`, `status.removed { combat_start }` (if any), `game.mode_changed` |
| `newRound()` L370 | `combat.round_started` |
| `endRound()` L389 | `resource.changed { class_rule \| regen \| rule }`, `combat.round_ended` |
| `advance()` L410 | `combat.turn_started`, `combat.turn_skipped`, `combat.awaiting_input` |
| `springTrap()` L470 | `combat.trap_sprung`, then `status.applied` |
| `detonateBombs()` L478 | `combat.bomb_exploded`, `combat.hit { bomb }`, `unit.damaged` |
| `checkBattleEnd()` L527 | `unit.revived`, `unit.max_hp_changed`, `combat.ended`, `status.removed { combat_end }`, `unit.healed { breather }`, `progression.*`, `game.ended` |
| `enemyTurn()` L590, `minionTurn()` L605 | `skill.used` (`forced`), `combat.no_action` |
| `hitConnects()` L612 | `combat.miss`, `status.removed { consumed }` (dodge used, hit or miss), `resource.changed { rule: onDodge }` |
| `counterAttack()` L632 | `status.removed { consumed }`, `skill.used` + `combat.hit { counter }`, `unit.damaged` |
| `combatCommand()` L647 | `action.*`, `resource.changed { skill_cost }`, `combat.extra_turn`; flee → `combat.ended { fled }`, `status.removed { fled }` |
| `rollDamage()` L905 | `status.removed { consumed }` for Guaranteed Crit and marks |
| `castSkill()` L934 | `skill.used` (castId allocated here or just before cost), `combat.hit` |
| `damage()` L969 | `unit.damaged` |
| `onDeath()` L1011 | `unit.died`, `combat.corpses_changed`, kill-related `resource.changed`, infection spread `status.applied` |
| `heal()` L978 / `gainResource()` L984 | `unit.healed` / `resource.changed`. Callers pass the cause as a new optional last argument. |
| `summon()` L996, `erase()` L1005 | `unit.summoned`, `unit.erased` |
| `addExperience()`, `maybePromptBranch()`, `chooseBranch()`, `applyStages()`, `enterStage()`, `becomeHollowKing()` | `progression.*`, `resource.type_changed`, `resource.max_changed`, `unit.max_hp_changed`, `unit.healed { level_up }` |
| `effects.js` `chain_lightning` L280 | `combat.hit { chain }`, `unit.damaged` |
| `delayed_aoe` L293, `place_trap` L301, `extra_turn` L314 | `combat.bomb_set`, `combat.trap_placed`, `combat.extra_turn` |
| `revert_hp` L321 | `unit.healed` or `unit.damaged`, `cause: 'revert'` |
| `aoe_damage_from_corpse` L343 | `combat.corpses_changed { consumed }` |
| `statuses.js` `applyStatus()` | `status.applied` / `status.blocked`; `status.cr_changed` |
| `tickStatusesEndOfRound()`, `tickDots()` | `status.duration_changed`, `status.removed { expired }`, `unit.damaged { dot }` |
| `rollOverflow()`, `cleanse()`, reaction outcomes | `status.overflow`, `status.removed { cleansed \| reaction }`, `status.reaction`, `unit.damaged` |

**State changes that bypass the primitives today.** Each must be routed through a primitive or emit its event explicitly, or the ledgers (I4–I6) won't close:

| Bypass | Where |
|---|---|
| HP set directly | `revert_hp` (effects L327); Crown revive (engine L582); level-up refill (L1056); `erase()` (L1006); Hollow King cheat (L1146) |
| Resource set directly | skill cost (L724); Crown (L584); level-up refill (L1058); Hollow King cheat (L1151) |
| Status removal outside `removeStatus()` | combat start (L346); victory (L547); flee (L680); Guaranteed Crit (L909); mark consumption (L928); end-of-round tick (statuses L179); `cleanse()` (statuses L297) |

### 3.7 Worked example (real run, seed 2)
`new GameEngine({ seed: 2, events: 'full' })`, then `necromancer`, `e`, `engage`, `grave bolt 1`. This is the **second** `grave bolt 1`, which kills `enemy_0`. HP, damage, resource, round and cast numbers come from the actual run (`engage` already caused casts c1–c3, the first bolt round c4–c7). `seq` values are illustrative.

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
  awaiting: 'action',                     // 'action' | 'continue' | 'choice' | null
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
- **`targeting`** is the skill's data `target` value: `enemy_single, enemy_aoe, all_enemies, all_combatants, self, minions, ground, ally_single, corpse`. For anything other than `enemy_single`, `targets` lists the units that *will be affected*, for display only.
- **Requirement on the effect registry:** `requires()` hooks must stay side-effect free. All current ones are; this becomes a documented rule in `effects.js`.

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
| `{ type: 'skill', skillId, targetId? }` | `combat` | `grave bolt 2`, `gb 2` |
| `{ type: 'flee' }` | `combat` | `flee` |
| `{ type: 'continue' }` | `combat`, awaiting `continue` | any input after a skipped turn |
| `{ type: 'describe', subject: 'room' \| 'inventory' \| 'help' \| 'class_tree' }` | any (text output only) | `look`, `i`, `help`, `cl` |
| `{ type: 'restart' }` | any | `start` |
| `{ type: 'quit' }` | `explore` | `quit` |
| `{ type: 'cheat', cheat: 'add_xp' \| 'become_hollow_king' \| 'unlock_events', amount? }` | as today | `add_xp 250`, … |

Rules:
- `targetId` is optional only when the skill isn't `enemy_single`, or exactly one valid target exists (today's rule in `pickTargets()` L813).
- **Basic-attack semantics are preserved.** `{ type: 'attack' }` resolves to `basicAttackName()`. A `{ type: 'skill' }` whose `skillId` equals the basic attack counts as basic too (`isBasic` L734). That drives `onBasicAttack`, Combo Points and Virulent Touch.
- Hunter's Instinct, once-per-fight, silence, extra turns and the QA-5 `continue` pause behave exactly as in `combatCommand()` today. The action API exposes them; it doesn't redefine them.
- `describe` exists so `input()` can route **every** command through `act()`. Graphical clients use `getState()` and the data instead.

### 4.4 Rejection codes
Each comes from a current message, so text output is unchanged.

| Code | Current trigger |
|---|---|
| `WRONG_MODE` | action not valid in the current mode |
| `NOT_YOUR_TURN` | `Not your turn!` (L653) |
| `UNKNOWN_SKILL` / `SKILL_NOT_KNOWN` | L688 (`Did you mean…` suggestions stay in the text parser) |
| `SILENCED` | L694 |
| `NOT_IMPLEMENTED` | L698 |
| `ONCE_PER_FIGHT` | L702 |
| `NOT_ENOUGH_RESOURCE` | L707 |
| `INVALID_TARGET` | L714 |
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
engine.serialize({ label, createdAt })      // -> SaveGame (plain JSON-safe object)
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
    "flags": {}, "stats": {}, "progression": {}
  }
}
```
- **`state`** has exactly the fields `snapshot()` already captures (L87–97), so the transaction and the save share one definition of "everything a command can change". `combat.nextCastId` and the minion `key` live inside `state.combat`.
- **`data.hash`** is a deterministic, dependency-free string hash of `JSON.stringify(data)` (e.g. FNV-1a or cyrb53).
- **`engine.version`** comes from `package.json`, injected as a constant.

### 5.3 Randomness
- **R1** The engine **always** uses `mulberry32`. Without an explicit seed it picks one once (`Math.random()`), stores it as `engine.seed`, and reports it in `game.started`. Today an unseeded engine uses `Math.random` directly, and its state can't be saved.
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

During development, balance numbers change constantly. Refusing saves on every data edit would make saves useless for playtesters, hence the default warning. Mid-combat saves keep the enemy stats they were spawned with, because enemies are cloned at `startCombat()` (L336). That's expected.

`load()` never evaluates code from a save. It's `JSON` in, plain assignment out.

---

## 6. `getState()` additions
All additive. Existing fields keep their shape: `combat.enemies` and `combat.minions` still list **living** units only.

| New field | Content |
|---|---|
| `seed`, `eventSeq` | as in §2.1 / §5.3 |
| `awaiting` | `'action' \| 'continue' \| 'choice' \| null` |
| `combat.encounterId` | `enc_<n>` |
| `combat.units` | every unit in the encounter, **including dead and erased**, as UnitInfo plus `alive`, `erased`, `statusEffects` |
| `combat.order` | ids in this round's order |
| `combat.currentActorId` | id or `null` |
| `combat.traps`, `combat.bombs` | counts / `{ skillId, turns }` |
| `combat.minions[].key` | minion template |

`getState()` deep-clones on every call, which is fine per event and wasteful per frame. Front ends should refresh on events, not on every frame.

---

## 7. Compatibility requirements
Each requirement has a check QA can run.

| # | Requirement | Verification |
|---|---|---|
| **C1** | `start()`, `input()`, `getState()` keep their signatures and return types. | Existing tests |
| **C2** | In `legacy` mode (default), every text/clear event is **byte-identical** to `main` @ `ff49d5c`, in the same order. | **Golden transcripts**: recorded from the baseline *before* any Phase 1 change (§9, PR-A) and compared after |
| **C3** | All 100 existing tests pass **without edits**. Any unavoidable edit is listed and justified in the PR, and QA signs off on it. | `npm test` |
| **C4** | `tools/play-cli.js`, `balance.js`, `missing-effects.js`, `pending-decisions.js`, `build-single.js` and `qa/scripts/*` run unchanged with identical output. | Run each; diff output |
| **C5** | Seeded RNG draw sequences are unchanged: emitting events, building availability and serialising never call `rng()`. | `npm run balance -- --runs 30` win rates identical; golden transcripts |
| **C6** | Internal primitives stay callable **with synthetic objects and without an active combat**. Tests call `rollDamage`, `applyDot`, `infect`, `applyStatus`, `damage`, `tickStatusesEndOfRound` and `newRound` ~45 times, some with hand-built attackers (`dummyHit`, tests L211). Emission must be null-safe: missing `combat` → no `round`; missing `id` → `null`. | Existing tests |
| **C7** | The engine stays DOM-free, timer-free, clock-free and dependency-free (AGENTS.md §3, §7). | Code review; `grep` for `window`, `document`, `setTimeout`, `Date` in `src/` |
| **C8** | `index.html` and the single-file build keep working. Any new `src/` file is added to `index.html` in load order; `build-single.js` already inlines `src/`. | Open `index.html`; `npm run build` |
| **C9** | Existing id formats unchanged (`player`, `enemy_<n>`, `minion_<n>`). | Tests L212, L236 |
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

---

## 9. Suggested delivery order (for Developer review, not a work order)
Small PRs per AGENTS.md §2; each one is independently green.

| PR | Content | Why this order |
|---|---|---|
| **PR-A** | Golden-transcript generator + fixtures recorded from `main` before any change (seeds × scripted command lists covering all four classes, branches, cheats, flee, defeat, win). **No engine change.** | Freezes the baseline that C2/C5/C12 are checked against. Must land first. |
| **PR-B** | Event emitter + modes + `seq`, `encounterId`, `castId`; combat-flow, hit, HP and death events; route the HP bypass sites. | Highest value for a front end; enables I1–I4, I7. |
| **PR-C** | Status and resource events; route the resource and status-removal bypass sites. | Closes I5–I6. |
| **PR-D** | `getAvailableActions()`, `act()`, rejection codes; `input()` rebuilt as the translator. | Largest refactor of `combatCommand()`; golden transcripts guard it. |
| **PR-E** | Always-seeded RNG, `serialize()` / `load()` / `fromSave()`, `getState()` additions. | Builds on existing `snapshot()`/`restore()`. |

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
- **OQ7** Which seeds and command scripts should PR-A's golden corpus contain? QA's `smartbot.js` and the repro scripts are natural sources.
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
| Developer | Review feasibility, effort and §3.6/§4.5; answer OQ1–OQ6; propose changes as PR comments | ☐ |
| QA & Balance | Draft a test plan from §7–§8; answer OQ7–OQ8 | ☐ |
| Lead Game Designer | FYI only: confirm the three behaviours in §10 are described correctly | ☐ |
| Creative Director | Approve implementation after Developer and QA review | ☐ |
