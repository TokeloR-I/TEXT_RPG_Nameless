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

## D2 — Battlefield positioning: APPROVED

**Decision:** Option C — abstract/non-positional graphical combat.

**Approval source:** Creative Director's explicit approval in the design discussion on 2026-10-22.

**Intent:** Combatants may be visually arranged and animated on a graphical battlefield, but rendered positions do **not** define combat ranks, distance, movement range, cover, collision, flanking geometry, attack reach, or targeting eligibility. Existing engine targeting and combat calculations remain authoritative.

**Preserve:** Class identities, available attacks, their existing targeting and status rules, summons and turn order, without introducing spatial costs or formation restrictions.

**Design follow-ups, not authorized rules:**
- **Backstab / [Flanked]:** existing conditional damage still needs a non-positional source/trigger definition. Do not infer adjacency.
- **Shadowstep:** can be presented as a dash/teleport animation, but any mechanical requirement for physical movement is undecided.
- **Shield Charge, Lockstep, Fortress, Total Lockdown:** zone/ally-protection/taunt language must be reviewed and specified in abstract terms; do not silently remove or fabricate effects.
- **Traps:** preserve the existing abstract trigger until a separately approved change. No floor-based hitboxes.
- **Summons and targeting:** visually readable but not limited by slot occupancy or range.

**Not approved:** spatial ranks/slots, free combat movement, geometric attack shapes, adjacency, flanking by coordinates, changed ability numbers, new targeting restrictions, or Developer implementation. Ability-specific clarification remains pending Creative Director approval.

## D3 — Perspective and play flow: PENDING

Options for later decision: top-down WASD exploration plus side-view encounter presentation, versus one consistent visual perspective. Await D2 decision before selecting presentation. Proposed flow remains exploration → encounter → hotkey skill/target selection → ordered event playback → exploration; exact controls, transition behavior, UX and accessibility are undecided.

## QA and governance notes

- QA-1: marks, guards, counters and other reactive effects must have approved effective windows; do not change round-based DoT ticks by implication.
- QA-2: Shield Bash cannot silently become an unconditional stun because of graphical positioning.
- QA-8: branch-resource expenditure and regeneration remain pending and must not be changed as part of input/presentation conversion.
- Every design choice is presented separately for approval. Developer Agent receives implementation specifications only after Creative Director approval.
- Follow [AGENTS.md](../../AGENTS.md). This is a design-only record; no source code, tests or balance data changed.
