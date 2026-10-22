# ENSO's Last Stand — QA-8: Evolution resource economy proposal

**Author:** Vaelis — Lead Game Designer & Narrative Designer  
**Date:** 2026-10-22  
**Status:** PROPOSAL FOR CREATIVE DIRECTOR APPROVAL — no implementation authorized  
**Evidence:** [QA Report #1](../../qa/QA_REPORT_2026-10-22_1.md), [game status](../GAME_DESIGN_STATUS.md), [AGENTS.md](../../AGENTS.md)

## Issue and design choice

At evolution, a character changes to a branch resource. The current engine charges inherited base skills from the **active branch resource**, but many descriptions still name the old resource. Several branch resources have zero passive regeneration, so formerly viable base skills become unaffordable: QA reports boss-only Assassin 0%, Illusionist 16%, Chronomancer 4% versus Elementalist 98% (with other differences also contributing).

**Proposed core rule:** Each character has **one active combat resource at a time**. After evolution, *all* their castable skills, including inherited base skills, pay their unchanged numerical costs in the active branch resource. Do **not** keep a hidden Momentum/Energy/Mana pool. Existing 'free attack' behavior is preserved. Descriptions and menu cost labels must use the resource actually charged. A resource change should be announced on evolution.

**Why:** Single-resource bookkeeping makes the class evolution meaningful and avoids an otherwise separate two-resource rebalance. It also supports a clean graphical HUD. Passive regeneration is a proposed reliability baseline, not a replacement for resource-earning class traits.

## Proposed resource tuning — NOT YET APPROVED

These are **candidate** per-round gains using QA's measured O-B rates, NOT proven in isolation. Start-of-fight values, maximum caps and on-event gain rules remain unchanged.

| Branch resource | Existing passive gain | Proposed passive gain | Preserve distinctive gain |
|---|---:|---:|---|
| Stealth Tokens (Assassin) | 0 | **3 / round** | +1 on dodge or kill |
| Combo Points (Duelist) | 0 | **3 / round** | +1 on basic attack |
| Deception Tokens (Illusionist) | 0 | **2 / round** | +1 on dodge |
| Time Charges (Chronomancer) | 1 | **2 / round** | Time-themed skill effects unchanged |

**Design rationale:** A predictable floor should prevent expensive inherited base spells from becoming dead buttons in single-target boss fights with few dodge/kill triggers. Earning points from tactical actions still accelerates stronger branch casts. These values are **recommendations for approval and retesting**, not established balanced numbers: QA's O-B includes simultaneous +2 DEF to three classes, so the results do not isolate regeneration.

**Do not change in this QA-8 assignment:** Oath Points (QA-2 coordination), Fury Gauge, Vigil, Trap Charges, Sin Marks, Mana, Energy, Soul Energy, ability costs, damage, DEF/HP or per-fight reset rules. Necromancer Soul Energy has a separate queued design investigation. This avoids changing unrelated branches before measurement.

## Deterministic gameplay contract (if later approved)

1. At a branch evolution, switch the combat resource identity, capacity/starting balance and earn rules to that branch. Inherited skills reference the **new** active resource for payment, using their *existing numerical costs*. No base-class pool survives for spending.
2. The universal `attack` remains available at zero resource. Zero-cost skills stay zero-cost. Insufficient resource refuses the cast without spending a turn or changing the resource.
3. Once per completed combat round, apply each branch's proposed passive regen, then existing event-specific gains according to current ordering and caps. Regeneration never exceeds the active resource maximum; don't multiply by Haste or extra actions.
4. Resource-earning events (dodge, kill, basic attack) continue to award points as already documented, without double-counting. Existing free class actions that replenish resources keep their **current mechanics** unless a discrepancy requires a separate design decision.
5. GUI/CLI, skill descriptions, menu costs and combat feedback must state the actual active resource. No stale references to Momentum/Energy/Mana after the resource changes.
6. On fight entry, apply the active resource's current `startOfFight` value; no resource is borrowed from the previous fight. Evolution at level-up must not accidentally grant a second spending pool.
7. Costs, gain, regeneration and refusal behavior remain deterministic for player, enemy and summon actors using the relevant data rules; no combat math or status lifecycle changes.

## Acceptance criteria for Developer and QA (after separate implementation authorization)

- **Single pool:** evolve Rogue → Assassin or Duelist, Mage → Illusionist or Chronomancer; inspect resource type, charged cost, tooltip text and affordability of every inherited base skill.
- **Start/regen:** force each target branch to 0 in a fixed-seed test, advance 1/2/3 normal combat rounds and assert exact balance and cap, including current event gains; no gain for extra Haste actions.
- **Costs:** a 1-, 2-, and 3-cost inherited skill charges the exact amount from the evolved resource. A refused cast charges 0 and leaves the action usable.
- **Events:** explicit dodge/kill/basic-attack cases earn their specified bonus exactly once, in addition to passive round regen.
- **Negative cases:** no branch can draw from old base resource; old names cannot appear in resource-dependent descriptions after evolution; no accidental regen for untouched branches.
- **Balance test:** run 100+ fixed seeds per class and per branch, especially the boss; compare against current baseline and independently compare (a) regen only, (b) DEF only, (c) combined. Report variance and any now-unlimited cast loops before treating the rates as final.
- **Regression:** `npm test`, CLI smoke checks, evolutionary progression, skill costs, free attack, status/CR pending configuration all unchanged in unrelated mechanics.

## Approval gates

**Decision 8A:** Confirm single active branch resource for all inherited skills (recommended).  
**Decision 8B:** Approve proposed passive rate candidates 3/3/2/2 **for initial balance implementation**, or request a numbers-only experiment first. Approval of 8A alone does not approve 8B.

**No developer authorization or code changes follow merely from merging this proposal.** The Creative Director must approve the selected model and any numbers, then separately authorize implementation. Repo workflow: small developer PR and QA verification.
