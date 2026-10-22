# ENSO's Last Stand — Status Effects: Approved Design Handoff

**Status:** Creative-director approved design principles; ready for coding-agent implementation planning.
**Basis:** `GAME_DESIGN_STATUS-1.md` (22 October 2026). This handoff does **not** replace existing working mechanics unless an approved rule below explicitly changes them.
**Scope:** Status-effect engine only. Do not implement new story content, encounters, character attributes, or unrelated combat changes in this batch.

## Approved decisions

1. **Tactical status system.** Support status stacking, resistance, immunities and tactical counters. Keep status behavior consistent and data-driven.
2. **Intensity stacking.** Reapplying a stackable effect increases its intensity up to its effect-specific cap and refreshes its duration. Not all statuses must stack; control effects may have different rules.
3. **Control Resistance (CR) meter.** Repeated hard crowd-control effects build target CR. At the 100 CR threshold, the control effect that reaches the threshold **still succeeds**; immunity to subsequent hard-control applications begins afterward. Soft debuffs and DoTs do not automatically contribute CR.
4. **Gradual CR recovery.** CR decreases over time, with hard-control immunity ending after resistance falls below a defined recovery threshold. Avoid instant resets.
5. **Enemy-tier CR scaling.** Regular, elite and boss enemies build CR at different rates; stronger tiers generally accumulate resistance faster. The first successful control is not automatically blocked merely because a target is a boss. Specific immunities may still exist.
6. **Individual enemy affinities.** Resistance, vulnerability and immunity to specific status effects are determined by enemy nature/type. CR remains a separate mechanic.
7. **Overflow at maximum stacks.** Reapplying a capped damage-over-time status **always refreshes duration** and has a chance to trigger an immediate **Overflow Burst**. Stacks never exceed the cap.
8. **Overflow luck protection.** Failed overflow rolls progressively increase the chance of a burst; a successful burst resets the chance to its initial value.
9. **Overflow burst scaling.** Burst damage scales with the status's current damage-per-tick value (rather than a flat amount or remaining total damage).
10. **Universal ownership.** Players, NPCs and summons use the same status application, duration, resistance, stacking, overflow and reaction rules. Specific skills and traits decide which statuses they can apply.
11. **Round-based duration.** Status duration decreases once per completed combat round, regardless of speed, stun or bonus turns. Ensure statuses get their intended number of effective ticks and turns.
12. **Selective cleansing.** Cleanses specify which effect types/categories they remove; there is no default 'remove every negative effect' behavior.
13. **Selective cross-status reactions.** Only explicitly defined compatible status combinations can cause a special reaction. Do not infer reactions for every possible pair.
14. **Chance-based reactions.** Applying a new status to a target with a compatible status gives a probability of triggering the defined reaction; coexistence alone does not continually trigger reactions.
15. **Character-driven reaction probability.** Reaction success probability depends on the applying character's relevant attributes and traits. **Attribute mapping/formula has not been approved**, so do not invent it.

## Preserve from the current status document

- Infection currently deals **2 damage per stack**, with a **3-stack cap** and **3-turn duration**. Preserve these base values pending balancing.
- The documented game already includes buffs, debuffs, marks, DoTs, turn order, owner/applier timing conventions, some implemented statuses, and an existing test suite. Adapt those behaviors to the approved round-based duration rule rather than creating conflicting parallel status systems.
- Abilities marked as working in the status report should not lose their effects while consolidating status logic.

## Open design parameters — DO NOT silently choose final values

- Which effects count as **hard** vs **soft** control, and how much CR each contributes.
- CR recovery amount per round, immunity release threshold, and exact regular/elite/boss CR multipliers.
- Individual enemy affinity tables and specific cleanse categories or abilities.
- Which damage-over-time effects permit overflow; initial overflow chance, increase per failed roll, max chance, and burst damage multiplier (a 200% example was shown, **not approved as final**).
- Specific cross-status reaction recipes, outcomes and base probabilities.
- Character-attribute mapping and formula for status reactions (**Design Decision 16 paused**).
- Stacking caps and tick damage for statuses other than the existing Infection definition.

## Implementation guidance

Build the shared status-effect infrastructure so these decisions can be expressed as configuration/data and so undecided parameters are easy to tune after director approval. For any behavior needing an unresolved design value, flag the decision rather than presenting a guessed value as approved. Keep existing tests green and add tests for the approved rule invariants (stack cap, duration refresh, overflow reset/increase, CR threshold success then immunity, recovery, universal NPC/player/summon behavior, round-based expiry and selective cleansing).

**Handoff boundary:** This document approves design direction, not permission to fabricate remaining balance numbers or to change unrelated systems.
