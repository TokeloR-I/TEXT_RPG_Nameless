# ENSO's Last Stand — QA-1 Developer Implementation Handoff (Prepared, Not Authorized)

**Author:** Vaelis — Lead Game Designer & Narrative Designer  
**Design approval:** QA-1 Option A, 22 October 2026  
**Implementation status:** **HOLD — Creative Director has NOT authorized code changes.**  
**Canonical decision:** [QA-1 Reactive Status Decision](QA_1_REACTIVE_STATUS_DECISION.md)

## Scope after explicit implementation authorization

Correct the opportunity/expiry semantics of **only** Marked for Death, Expose (Expose Weakness) and Guard, without changing numeric values, skill costs, resources, damage formula, general DoT/control ticking, UI framework, or other skills. QA-1 is distinct from QA-2 Shield Bash and QA-8 branch resource issues.

### Formal event contracts

| Status | Begin | Valid opportunity counter | End |
|---|---|---|---|
| Marked for Death | Immediately upon successful mark application | One **future actionable normal turn of the applier**, excluding the application turn and extra/Haste turns | First positive-damage eligible allied hit (consume) **or** completion of that future normal turn (expire) |
| Expose | Immediately upon application | Two **future actionable normal turns of the applier**, excluding application turn and extra/Haste turns | End of second future actionable normal turn; no consumption by hit |
| Guard | Immediately upon application | Interval from cast through **beginning of defender's next scheduled normal turn** (excluding any immediate extra turn) | At start of that next scheduled normal turn, before action/skip, even if stunned |

**Definitions:** An actionable turn is one where the applier is permitted to choose/execute a normal action. A stunned skipped scheduled turn does not count for mark/Expose expiration. A bonus/extra turn does not advance the expiry counter or prematurely end Guard. Effects apply immediately after successful cast (no same-cast retroactivity). For these three statuses only, holder round-end ticking must not independently decrement/expire their opportunity windows.

### Ability behavior

**Marked for Death:** Existing `+0.5` modifier, no stacking or extra charges. Only the applier or allied side may use the mark. On a hit, determine successful positive damage *after* existing damage modifiers/armor/defenses, then commit consumption once; miss/evade/zero damage leaves it. On multi-hit, only first qualifying hit gets the bonus. If no qualifying hit arrives, expire after the applier's next actionable normal turn completes. Reapplication resets the single pending opportunity window.

**Expose:** Existing `+0.2` taken modifier remains active for all eligible damage events between application and the completion of two subsequent actionable normal turns of the applier, independent of target speed. No consume-on-hit or self-stacking. Reapplication refreshes the complete two-turn opportunity window. Retain existing damage-pipeline scope; do not introduce new DoT/true-damage interactions without separate approval.

**Guard:** Existing 25% reduction (35% with existing Vanguard trait). Applied immediately; protects against any number of eligible incoming hits until the start of the defender's next *scheduled normal turn*, regardless of initiative order. Doesn't expire after first incoming hit; doesn't persist to a second defensive window. Reapplication refreshes without additive stacking. Haste extra actions do not end it early. Expire before a stunned scheduled turn is processed.

### Technical constraints

- Respect [AGENTS.md](../../AGENTS.md): shared `engine.applyStatus(source,target,spec)` pipeline, seeded RNG, no DOM in engine, data-driven effect policies.
- Current candidate touchpoints are `src/statuses.js` (`armed` and `tickStatusesEndOfRound`), `src/engine.js` (normal vs extra/skipped turn boundaries, mark damage/consumption), `src/effects.js` and `src/data.js` (effect metadata, **not** numeric changes). These are *investigation hints*, not instructions to code yet.
- Keep a status's actor identity and opportunity bookkeeping serializable through existing snapshot/restore; do not create UI-side timing state.
- Don't use a catch-all `holder turn` change that breaks DoTs, Infection (2/tick, max 3 stacks, 3 turns), hard controls, Control Resistance, or reaction refresh.
- An existing `markModifiers` / damage path appears to remove marks before checking whether final damage is positive; verify this, then enforce actual consumption only on qualifying damage.
- If death of an applier causes uncertainty about how active opportunities terminate mid-fight, surface a specific proposed rule to Vaelis/Creative Director; do not invent one.

### Deterministic test matrix (after authorization)

1. **Marked faster:** Rogue marks slower Drunken Shade (QA repro A), enemy acts, Rogue's next successful positive-damage hit gains +50%, consumed once.
2. **Marked slower:** target acts before applier; same next-attack opportunity and single consumption.
3. **Marked unsuccessful hit:** miss/dodge and zero final damage do not consume; next qualifying hit inside window does.
4. **Marked multi-hit:** first eligible hit consumes; subsequent hits receive no Marked for Death bonus.
5. **Marked ally/summon:** friendly hit can consume; hostile hit cannot. Reapplication gives no duplicate charge.
6. **Expose faster/slower:** identical two subsequent *applier* actionable normal turns of +20% vulnerability, independent of target's turns.
7. **Expose multiple hits:** several eligible hits within active windows benefit; last-window hit benefits before expiry; following hit does not.
8. **Guard faster/slower:** attacks between Guard cast and next scheduled normal turn are reduced, with no second-round extension based on SPD.
9. **Guard multiple attacks:** all hits in the protected window reduced; nothing after window.
10. **Haste:** extra turns do not tick/expire any of the three policies early.
11. **Stun:** skipped applier turns don't burn Marked/Expose windows; Guard expires on defender's next scheduled turn even if skipped.
12. **Refresh, cleanse, death, victory:** refreshing resets single instance and full window; cleanse removes immediately; end-of-combat cleanup unchanged.
13. **Regressions:** unchanged DoT/Poison/Infection tick counts regardless of speed; approved round-based invariant tests and seeded status-engine suites remain green.
14. **State restoration:** snapshot and replay mid-window preserve deterministic expiry and consumption.

### Required handover (only after authorization)

Use a focused developer feature branch and PR into main, no direct main pushes. Include fixed-seed repro outcomes, before/after evidence, tests, `npm test`, relevant CLI scenarios and QA review. Escalate rules ambiguity rather than guessing. No code work is assigned by this document.
