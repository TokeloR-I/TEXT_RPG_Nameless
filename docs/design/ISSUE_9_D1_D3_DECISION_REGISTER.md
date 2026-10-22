# ENSO's Last Stand — Issue #9 Design Decision Register (D1–D3)

**Updated:** 2026-10-22
**Authority:** Creative Director
**Sources:** [Issue #9](https://github.com/TokeloR-I/TEXT_RPG_Nameless/issues/9), [Technical Feasibility Assessment](../../architecture/TECHNICAL_FEASIBILITY.md), [approved status design](ENSO_Status_Effects_Approved_Design.md)
**Scope:** Design decisions only. This document is not an implementation authorization.

## D1 — Combat time model: APPROVED

**Decision:** Option A — free keyboard-controlled exploration combined with turn-based, hotkey-driven combat.

**Approval source:** Creative Director's explicit approval in the design discussion on 2026-10-22.

**Intent:** Players move freely during exploration using keyboard controls; when combat begins, skills and targets are selected through direct controls rather than typed commands. The engine resolves actions in existing speed-ordered turns, and the graphical front end presents results through animations and readable feedback.

**Preserve:** round-based status duration architecture (approved rule 11), speed-based initiative, turn-oriented resource rules, Chronomancer extra/skip/reorder-turn identity, existing class/evolution systems, summons and status application pipeline. QA-1's defective opportunity windows remain a **separate unresolved design issue**; this approval does not bless the regression.

**Not approved:** ATB, continuous-time combat, real-time attacks, Phaser or other framework, a particular input key layout, positions/ranks, movement during combat, reworked abilities, numerical balance, engine modifications, or any developer implementation assignment.

## D2 — Battlefield positioning: PENDING CREATIVE DIRECTOR APPROVAL

Options to compare:
- **A. Fixed ranks/slots (recommended for discussion):** distinct front/rear combat placements, with rules for targeting, flanking, taunts, teleports, traps, zones, summons and formation changes to be separately specified. Slot number and rule values are undecided.
- **B. Free-position tactical arena:** actual coordinates and movement in combat; supports geometry, pathing, and zones but adds a substantial spatial rules layer.
- **C. Abstract/non-positional:** graphical staging only; preserves most existing targeting but leaves Shadowstep, Flanked, zones and trap placement without satisfying spatial mechanics.

Recommendation for director consideration: **A**, contingent on ability-by-ability compatibility review and no loss of existing class identity.

**No approval yet** for fixed ranks, slot counts, player movement rules, area shapes, distance requirements, or targeting restrictions.

## D3 — Perspective and play flow: PENDING

Options for later decision: top-down WASD exploration plus side-view encounter presentation, versus one consistent visual perspective. Await D2 decision before selecting presentation. Proposed flow remains exploration → encounter → hotkey skill/target selection → ordered event playback → exploration; exact controls, transition behavior, UX and accessibility are undecided.

## QA and governance notes

- QA-1: marks, guards, counters and other reactive effects must have approved effective windows; do not change round-based DoT ticks by implication.
- QA-2: Shield Bash cannot silently become an unconditional stun because of graphical positioning.
- QA-8: branch-resource expenditure and regeneration remain pending and must not be changed as part of input/presentation conversion.
- Every design choice is presented separately for approval. Developer Agent receives implementation specifications only after Creative Director approval.
- Follow [AGENTS.md](../../AGENTS.md). This is a design-only record; no source code, tests or balance data changed.
