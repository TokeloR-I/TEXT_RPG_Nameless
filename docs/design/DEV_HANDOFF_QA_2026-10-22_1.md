# ENSO's Last Stand — Developer handoff: QA report #1

**Date:** 2026-10-22  
**From:** Lead Game Designer / Narrative Designer  
**To:** Developer Agent  
**Source:** [QA report #1](../../qa/QA_REPORT_2026-10-22_1.md)  
**Status:** Proposed defect-correction handoff for Creative Director review. Not approval for new mechanics, numerical tuning, or changes to unresolved design rules.

## Scope: technical fixes that can be investigated immediately

| Finding | Developer task | Acceptance check |
|---|---|---|
| QA-3 | Restore a valid player-action state after a caught skill/effect exception; no permanent `Not your turn!` loop. | Run repro C; a valid next action or orderly fight termination is possible. |
| QA-4 | Ensure malformed or self-referential reaction definitions cannot cause stack overflow. Reject unsafe data safely if necessary; **do not decide whether valid reaction chains are allowed**. | Run repro D; no stack overflow or soft-lock. |
| QA-5 | Ensure repeated skipped player turns cannot cause a runaway engine loop/irrecoverable state. **Do not grant an invented stun immunity or adjust CR.** | Run repro E; bounded computation and recoverable game state. |
| QA-6 | Correct double counting of defeated enemies across flee/re-engage, without settling enemy persistence rules. Flag any design dependency. | Run repro F; one entity's death is not credited multiple times; no hidden flee mechanic changes. |
| QA-7 | Fix articles before proper names (`A The...`, `A James Newton`) and duplicate XP message lines, without changing XP. | Run repro G and a victory. |
| QA-9 | Show player HP, current resource, and statuses in combat CLI; don't alter mechanics. | CLI menu reflects actual combat state. |
| QA-10 | Update stale implementation comments and technical documentation (including `CLAUDE.md` reference, if applicable); keep approved design docs intact. | No references to removed `turnStatuses` or incorrect current applier-based expiry claims. |

## Hold: design-dependent changes

- **QA-1:** Do not change the common status duration pipeline or individual effect expiry rules until the Creative Director approves a precise design resolution.
- **QA-2:** Do not replace Momentum with Oath Points, remove the Shield Bash condition, add cooldowns, or assign CR numbers without approval.
- **QA-8:** Do not alter base-skill resource costs, branch resource regeneration, or gameplay descriptions that presume a selected resource model until the decision is approved.
- **Balancing:** QA's O-A/O-B/O-C/O-D experiments are evidence only. Do not change DEF, HP, damage, summon targeting, resource gains, boss statistics, or `null` status values.
- **Flee:** If preventing duplicate kill credit requires a design decision about reviving/persisting foes, stop that portion and report the dependency rather than choosing a rule.

## Implementation and review constraints

Follow [AGENTS.md](../../AGENTS.md): Developer owns code; design documents are design-owned. Do not edit `legacy/` or `dist/`. Keep `src/engine.js` DOM-free, effect handling data-driven, status changes in the unified pipeline, and randomness seeded.

1. Split changes into appropriately focused developer branches/PRs; do not push to `main`.
2. Add deterministic regression tests using the report's reproduction cases.
3. Run `npm test` and relevant CLI scenarios; note any inability to execute them.
4. Include before/after outcomes, CI results and remaining design dependencies in each PR.
5. Return issues requiring decisions to the Lead Designer and Creative Director.

**Priority:** QA-3 first, then QA-4 and QA-5; after stability work, QA-6/7/9/10. Coordinate changes without modifying the unresolved status design.
