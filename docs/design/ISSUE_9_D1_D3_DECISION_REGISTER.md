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

## D3 — Perspective and play flow: APPROVED

**Decision:** Option A — top-down keyboard-controlled exploration with a dedicated side-view turn-based battle presentation.

**Approval source:** Creative Director's explicit approval in the design discussion on 2026-10-22.

**Player-facing intent:** Explore a navigable top-down world with keyboard movement; initiate encounters; transition into a dedicated side-view combat scene; choose skills and targets using direct controls; present action results, statuses, summons and turn changes through ordered animations and readable feedback; then return to exploration with results and rewards. This is a presentation decision, **not** an authorization for new combat rules.

**Preserve:** D1's round-based, speed-ordered combat and D2's abstract/non-positional targeting. Side-view sprite placement is visual staging only; no implicit formation slots, distance or collision-based targeting. Character evolution and class-specific effects should remain identifiable in combat.

**Unresolved for subsequent UX specification:** exact keys and remapping, target cycling and confirmation/cancel UX, HUD and combat log, status readability, camera/transitions, animation timing and skip controls, inventory and class-evolution navigation, party/minion display, keyboard/gamepad accessibility, reduced motion and contrast, save/load UX.

**Not approved:** choice of Phaser/Godot or other runtime, art style or assets, animation timings, input bindings, engine interface changes, new combat mechanics, gameplay tuning, or Developer implementation.

## Issue #9 approved-direction summary

| Decision | Approved direction | Scope boundary |
|---|---|---|
| D1 | Keyboard exploration + turn-based hotkey combat | No ATB or real-time combat; preserve round-based rules |
| D2 | Abstract/non-positional battlefield | No slot/rank/distance geometry or targeting restrictions |
| D3 | Top-down exploration + side-view battle scene | Presentation only; no engine/framework or implementation authorization |

**Remaining decisions outside D1–D3:** D4 framework/dependency; D5 packaging/distribution; D6 asset sourcing; detailed interface and accessibility specification; abstract handling of spatially described abilities; QA-1 status-effective windows, QA-2 Shield Bash, QA-8 branch resources; pending status/CR numeric configuration and balance proposals. These require separate approval. The Developer Agent has received **no implementation authorization** from this document.

## QA and governance notes

- QA-1: marks, guards, counters and other reactive effects must have approved effective windows; do not change round-based DoT ticks by implication.
- QA-2: Shield Bash cannot silently become an unconditional stun because of graphical positioning.
- QA-8: branch-resource expenditure and regeneration remain pending and must not be changed as part of input/presentation conversion.
- Every design choice is presented separately for approval. Developer Agent receives implementation specifications only after Creative Director approval.
- Follow [AGENTS.md](../../AGENTS.md). This is a design-only record; no source code, tests or balance data changed.
