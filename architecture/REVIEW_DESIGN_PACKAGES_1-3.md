# Architecture Review — Vaelis Design Packages 1–3 and K1–K3

**Keel — Technical Director & Game Systems Architect** · 2026-10-23
**Reviews:** [`VAELIS_PACKAGE_1_NECROMANCER_COMPLETION.md`](../docs/design/VAELIS_PACKAGE_1_NECROMANCER_COMPLETION.md) (#71), [`VAELIS_PACKAGE_2_CONTROL_RESISTANCE.md`](../docs/design/VAELIS_PACKAGE_2_CONTROL_RESISTANCE.md) (#72), [`VAELIS_PACKAGE_3_REMAINING_CLASS_MECHANICS.md`](../docs/design/VAELIS_PACKAGE_3_REMAINING_CLASS_MECHANICS.md) (#73), and the K1–K3 rulings in [`SOULBINDER_N3_N4_IMPLEMENTATION_CONTRACT.md`](../docs/design/SOULBINDER_N3_N4_IMPLEMENTATION_CONTRACT.md) (#54, issue #50).
**Baseline:** `main` @ `4559d31` (200/200 tests).
**Scope:** integration and scheduling only. No gameplay rule or number is changed or questioned here, except where the engine can't express a rule as written (Q1–Q3).

---

## 0. Verdict: developers can start

There are **no architectural blockers** in any of the three packages. One small piece of shared groundwork (**T-0**, below) should land first, because 6 of the 10 items depend on it. Possession and Eternal Architect need two new waiting states in the action API, which are defined in §3.

| # | Item | Owner | Can start | Depends on |
|---|---|---|---|---|
| **T-0** | One shared turn-opportunity hook and a generic owner-scoped timer (§1) | **Wren** | **now** | — |
| 1 | N-2 Plague of Ages + Plague Sovereign | Rook | **now** | — (but read Q1) |
| 2 | N-6 Eternal Lich: Unmake variant, Undying Will, free Soul Feast | Rook | **now** | — |
| 3 | N-1 March of Endless Bones + Black Pharaoh splash | Rook | **now** | — |
| 4 | D-10 Shadowstep presentation event + Lockstep taunt | Rook | **now** | — |
| 5 | D-08 Overchannel + Burnout | Rook | after T-0 | T-0 |
| 6 | D-07 Fortress | Rook | after T-0 | T-0; Q1, Q2 have defaults |
| 7 | CR-01/02/03 Control Resistance (one central policy) | Wren | after T-0 | T-0 |
| 8 | D-09 Steal Skill | Rook | after T-0 **and Q3** | T-0, **Q3** |
| 9 | N-5 Possession | Wren (engine + CLI), Sable (overlay) | after #7 | CR (75+ CR gate), §3.1 |
| 10 | D-09 Eternal Architect (turn order) | Wren (scheduler + CLI), Sable (selector) | after T-0 | §3.2 |

**K1–K3 (issue #50): confirmed implemented** by Rook's Soulbinder work, with regression tests:
- K1, one caster-owned link clock: test QA-19;
- K2, lethal primary hit propagates from a snapshot: test QA-21;
- K3, secondary damage never grants Soul Energy, kill rewards or mark effects: test QA-20.

All are in `tests/18-soulbinder.test.js`. Issue #50 can close.

---

## 1. T-0: one turn-opportunity hook (the main finding)

The packages define most durations in **normal turn opportunities**: "skipped turns count, bonus actions don't, the cast turn doesn't". That's a good, consistent rule. The engine already has three separate clocks of this kind, though, and the end-of-turn bookkeeping is copy-pasted at **four call sites**:

| Call site | What it advances today |
|---|---|
| `engine/combat.js` `advance()`: enemy/minion turn ends | `endNormalTurn()`, `advanceSoulLinkClock()`, Shield Bash recovery |
| `engine/combat.js` `advance()`: skipped turn | `advanceSoulLinkClock(actor, true)`, Shield Bash recovery (deliberately **not** `endNormalTurn()`) |
| `engine/actions.js` `combatUseItem()`: player turn ends | `endNormalTurn()`, `advanceSoulLinkClock()`, Shield Bash recovery |
| `engine/actions.js` `useSkill()`: player turn ends, after Haste | `endNormalTurn()`, `advanceSoulLinkClock()`, Shield Bash recovery |

Packages 2 and 3 add six more clocks of the same kind:
- Fortress duration;
- Burnout;
- Steal Skill window;
- CR decay;
- the boss "no two consecutive hard skips" protection;
- Eternal Architect's round window.

Copied into four places each, a single missed site becomes a silent duration bug of the QA-1 kind.

**T-0 (Wren, small, no gameplay change):**
1. **Two hooks.** Add `beginOpportunity(actor, { skipped })` and `endOpportunity(actor, { skipped, actionable })`, called from exactly one place per path. Move the existing bookkeeping into them.
2. **A generic timer list.** Add `combat.timers[]`, entries like `{ id, ownerId, kind, remaining, countSkipped, startedAtTurn }`. Plain JSON, so it saves and rolls back for free. Migrate the Soul Chain clock onto it; Fortress, Burnout, Steal Skill and the Architect window then become new `kind`s, not new code paths.
3. **Keep both counting rules.** QA-1 windows (Marked for Death, Expose, Guard) count only *actionable* turns. That's the approved QA-1 Option A, and it's why the skipped path doesn't call `endNormalTurn()`. The new packages count skipped turns. The hook carries `skipped`, and each timer declares `countSkipped`. **Don't merge the two rules.** Vaelis: if you did intend them to match, say so (FYI, not a blocker).
4. **Acceptance:** Tally's golden events and state hashes are unchanged (`golden.js --split`), plus the existing QA-1/QA-2/QA-19 tests.

---

## 2. Package notes

### Package 1 — Necromancer
- **N-1 March / resurrection.** The fallen roster already exists: dead minions stay in `combat.minions`. Each resurrected minion should be a **new** `summon()` with a new id and `resurrectedFrom: <old id>`. That gives "can't resurrect twice from one death" and never reuses ids (spec §2.1). Joining next round is automatic, because `newRound()` rebuilds the order from living units.
- **Black Pharaoh splash.** It has the same "secondary effect damage" profile as Soul Chain (no procs, mitigation applied once, no recursion). Please **generalize `secondarySoulDamage()`** into one `secondaryDamage(target, raw, owner, { kind })` rather than adding a second copy. Then K3's exclusions apply to splash automatically.
- **N-6 Undying Will.** Use **one lethal-interception point** shared with Crown of the Undying, which is checked today in `checkBattleEnd()`. Only one interceptor can apply per lethal event; the two belong to different classes, so precedence never matters in practice. It must also fire for DoT and self-damage deaths. Those already reach `checkBattleEnd()` through `advance()`.
- **N-6 Unmake (Eternal Lich).** Add a separate skill key in data, as the contract says. `erase()` already skips corpses and kill rewards.
- **N-2.** The true-damage flag lives on the Infection status instance, so it saves and expires with it. See **Q1**: today DoT ticks already bypass armor *and* damage reduction, so the flag has no visible effect yet.
- **N-5 Possession:** see §3.1.

### Package 2 — Control Resistance
- **This replaces the existing CR code; it doesn't configure it.** `statuses.js` has a different, unused CR model: per-round recovery, tier multipliers, an immunity flag and a release threshold, all `null` and switched off. Package 2 decays per **holder opportunity**, starts by tier (0 / 25 / 60), and caps or halves instead of a binary immunity. Since the old model never shipped, replacing it is safe. In the same PR, replace its `null` values in `src/data.js` (`statusDefinitions[*].control` / `crGain`, `statusRules.controlResistance`) with Package 2's values, so `npm run pending` stops listing them.
- **"One gain per cast"** needs a cast identity. Use the `castId` from spec §2.1 (allocated in `castSkill()`); it's needed for Phase 1 events anyway.
- **Classification against today's engine** (no surprises):
  - Stun, Freeze Time, and a Confuse that actually skips: hard, through `skip_turn`.
  - Silence: soft.
  - Slow: soft. It changes speed only and never skips a turn, so the CR-03 slow clause doesn't trigger.
  - Minion Taunt: not control.
- **QA-2 always wins.** Run the Shield Bash recovery check **before** CR, so CR never weakens it.
- **Visibility:** CR outcomes use the spec's `status.blocked { reason: 'control_resistance' }` and `status.cr_changed` events. The CLI shows them as text.

### Package 3 — Remaining mechanics
- **D-07 Fortress.** "Covers allies summoned after the cast" means a **side-wide field** owned by the caster (a `combat.timers` entry plus a beneficiary rule), not per-ally statuses. That's option (b) from my earlier review §A4, and it saves cleanly. Reduction order matches the engine: DEF, then reductions, then floor. See Q1 and Q2.
- **D-08 Overchannel.** Straightforward. The HP cost goes through `damage()` with the caster as source and `cause: 'self_cost'`. `damage()` already excludes self-damage from "when you get hit" resource rules. Burnout is a T-0 timer: active for the next opportunity, gone after it.
- **D-09 Steal Skill.** Enemy attacks are inline objects in the enemy templates, not `skillDefinitions` keys. The copied action needs its own id, for example `stolen:<attackName>`, so `getAvailableActions()` / `act()` can address it. `enemy.lastSkillUsed` already exists. **Q3 blocks this item.**
- **D-09 Eternal Architect:** see §3.2.
- **D-10 Shadowstep.** It already behaves as the contract says. `Guaranteed Crit` is consumed in `rollDamage()`, which runs only after the hit connects, so misses, DoTs and minion hits don't consume it. All that's missing is a presentation event, `combat.presentation { kind: 'dash', actorId, anchorId }`, added to spec §3.4 in this PR, and the anchor target.
- **Lockstep (`taunt_aoe`).** Enemies already target the player unless a minion taunts. So taunting all enemies means "ignore taunting minions and attack the Warden for one turn". Small; no positions involved.

---

## 3. Two new waiting states in the action API

The merged action API (`src/engine/actions.js`) already has `awaiting: 'action' | 'continue' | 'choice'`, `targetIds`, and one rules path shared by `input()` and `act()`. Both features below fit it. Neither needs a new mechanism, only a new pause point in `advance()`, handled like the QA-5 `continue` pause.

### 3.1 N-5 Possession: action authority, **approved**
- When the possessed enemy's normal turn comes up in `advance()`, the engine **pauses**: `awaiting: 'control'`, `combat.controlledActorId = <enemy id>`.
- `getAvailableActions()` returns **that actor's** actions: its own skill list, with targets limited to living opponents of its *temporary* side, never itself, and reasons for anything disabled.
- New action: `{ type: 'control', actorId, skillId, targetId }`. The engine validates it with the same rule path and runs it through `castSkill(enemy, …)`. `act()` rejects anything else with `WRONG_MODE`.
- **CLI:** while `awaiting === 'control'`, `input()` resolves `quick swipe 2` against the *controlled actor's* skills and the numbered list it prints. Same translator, different actor.
- **No usable action:** the engine itself performs the contract's no-op and moves on, without pausing.
- **Kill attribution matches the contract with no special code:** the source is the enemy, so `isPlayerSide()` is false, so there's no Necromancer kill credit or Soul Energy.
- **State** (`controlledActorId`, the Possessed status) is plain JSON, so rollback and save work.
- **UI:** the overlay already renders `getAvailableActions()`. It needs only a "Controlling ⟨name⟩" header (Sable).

Per the contract, ship only when both the CLI and the overlay can make the choice. No automatic fallback.

### 3.2 Eternal Architect: scheduler, **approved**
- At the **start** of each of the next 3 rounds, `newRound()` pauses with `awaiting: 'turn_order'`. Availability lists the living combatant ids in default speed order.
- Action: `{ type: 'turn_order', order: [ids] }`. It must be an exact permutation of the living ids; otherwise reject with `INVALID_ORDER` and a reason, at no cost. The player can also confirm the default order unchanged (`{ type: 'turn_order', order: null }`), which is the contract's "no order provided" fallback.
- **CLI:** `order 3 1 2 4` (positions in the printed list) or `order` alone to keep the default.
- `newRound()` applies the override instead of sorting by speed. Summons that join mid-window go last; dead actors drop out.
- The window is a T-0 timer counting rounds. State: `combat.turnOrder = { remainingRounds, pending }`, which is JSON-safe.
- DoTs still tick once per actual turn, because ticking stays in `startTurn()`.

---

## 4. Design questions (one sentence each; defaults let work continue)

| # | Question | Blocks | Default if unanswered |
|---|---|---|---|
| **Q1** | Do damage-reduction effects (Fortress, Guard) apply to **DoT ticks**? Today `tickDots()` bypasses armor *and* all reductions. As a result, Plague of Ages' "true damage" makes no visible difference unless DoTs become reducible. | Fortress DoT test cases only | DoTs stay unreduced (current behaviour). The Plague of Ages true-damage flag is still stored and tested, so it starts mattering if DoTs ever become reducible. |
| **Q2** | Fortress plus Guard on the same hit: multiply, or strongest only? The contract covers two Fortresses but not Fortress plus Guard. | — | **Multiply**, like every other reduction in `rollDamage()`. A 10-damage hit after DEF becomes 10 × 0.75 (Guard) × 0.8 (Fortress) = 6. |
| **Q3** | Steal Skill's copied action "pays its original numeric cost". **Enemy attacks have no cost field at all**, so every copied attack would be free: two free uses per steal. | **Steal Skill** | None. This changes Illusionist power, so it needs a ruling (e.g. a fixed Deception Token cost per use). |
| Q4 | *(FYI)* QA-1 windows count only actionable turns; the new packages count skipped turns too. Both are kept (§1.3). | — | Keep both as written. |

---

## 5. For QA (Tally)
- T-0 is a pure refactor: `golden.js --split` events and state hashes unchanged.
- Each package item ships with its contract's deterministic cases, plus save/rollback checks for every new piece of combat state: `combat.timers`, `controlledActorId`, `turnOrder`, CR fields.
- Possession and Eternal Architect add two waiting states. Extend the parity checks (spec I12, I18) so the CLI and `act()` drive both identically.
