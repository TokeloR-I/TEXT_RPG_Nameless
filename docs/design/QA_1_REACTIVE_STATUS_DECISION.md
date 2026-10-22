# ENSO's Last Stand — QA-1 Reactive Status Duration Decision

**Decision ID:** QA-1 / RSD-01  
**Creative Director approval:** 22 October 2026 — **Option A, opportunity-based reactive status expiration**  
**Status:** **APPROVED QA-1 DESIGN**; additional applier-death ruling approved 22 October 2026. This clarification does not expand implementation authorization.  
**Designer:** Vaelis — Lead Game Designer & Narrative Designer  
**Evidence:** [QA report](../../qa/QA_REPORT_2026-10-22_1.md), [Approved Status Effects design](ENSO_Status_Effects_Approved_Design.md), [Status Engine Report](../STATUS_ENGINE_REPORT.md).

## Decision

For **Marked for Death, Expose and Guard**, duration is determined by the relevant **useful action/defense opportunity**, not by decrementing solely on the holder's end-of-round tick. Their existing strength and skill costs are unchanged. Other statuses, particularly DoTs, retain the already-approved round-based lifecycle. This is a *targeted interpretation* of approved rule 11's requirement to deliver intended effective windows despite speed, not wholesale replacement of rule 11.

### Locked gameplay outcomes

| Status | Existing strength | Opportunity window / termination |
|---|---|---|
| Marked for Death | +50% next eligible attack damage | Available immediately on application. First **successful positive-damage allied hit** against the marked target benefits and consumes the mark. Otherwise expires at the **end of the applier's next actionable normal turn** after the application turn. |
| Expose (Expose Weakness) | +20% damage taken | Available immediately; lasts through the **next two actionable normal turns of its applier**, expiring at the end of the second such turn. All qualifying damage within the window benefits, without consuming it. |
| Guard | -25% incoming damage; Vanguard's approved trait increases it to -35% | Available immediately; protects against attacks until **the start of the defender's next normal turn**, when it expires. It is not extended to a second defensive cycle because the defender happens to act first. |

**Normal turn** means the scheduled action in a speed-ordered combat round, not a Haste/extra action. **Actionable normal turn** means the actor actually receives an opportunity to issue/execute an action; a stun-forced skip is not actionable. If an actor's next scheduled turn is skipped, Marked for Death and Expose do not lose a promised action window. Guard ends when the next scheduled normal turn **begins**, including if that turn is skipped, since the preceding enemy attack opportunity has already occurred. Dead/erased actors cannot create new opportunities; combat end clears combat-local statuses.

### Ordering, refresh and edge cases

- Marked for Death: evaluate hit validity and positive final damage before committing consumption; a miss, dodge, immunity, zero-damage hit or otherwise unsuccessful damage event does **not** consume it. Only attacks from the applier or allies are eligible (same side), not enemies; a summon counts as allied. Multi-hit consumes on the first qualifying hit only. A hit with positive damage applies the +50% modifier using the existing damage pipeline, then consumes exactly once.
- Expose: damage bonus applies to all eligible hits while active, including allied and summoned attacks and other eligible damage sources per the existing mark/damage pipeline; there is **no added stacking or new damage category**. Refresh restarts the full two-opportunity window, without multiplying Expose by itself.
- Guard: damage reduction remains active during all incoming attacks until the next scheduled normal turn starts, including multi-hit attacks. An enemy action already completed earlier in the casting round is not retroactively protected. Guard is not consumed on first hit. Recasting refreshes/overwrites its window without stacking magnitude.
- Applying/refreshing any of these on a bonus action establishes a new application event, but bonus turns do not count as expiry opportunities. Reapplying Marked for Death refreshes rather than adds a second charge. Retain status identity through cleanse, immunity, death, save/restore and display; no shadow parallel status pipeline.
- All three effects are eligible for selective cleanse and appropriate immunity under the shared status pipeline. A cleansed status expires immediately; ordinary natural expiry and consumption must not be conflated.
- **Creative Director ruling — applier death mid-fight:** When an applier dies during combat, its active **Marked for Death** and **Expose** marks remain effective **until the end of the current combat round**, then expire regardless of remaining opportunity counters. Eligible allied hits before that boundary may still benefit; Marked for Death can still be consumed on the first qualifying hit. This applies even if the applier dies before acting in that round. Do not expire immediately on death or let marks persist into the following round. Combat-end cleanup still applies. If the applier is revived within that same round, the already-triggered end-of-round expiry remains scheduled (no automatic cancellation). This rule is specific to these two marks, not a universal death rule for all statuses.
- **Shield Discipline — existing design, missing implementation:** The Vanguard evolution trait in `src/data.js` describes Guard reduction of **35%**, versus the base Warrior's **25%**. Wren reports the trait is description-only and not currently applied. Track as a **separate existing-design implementation gap**; do not quietly add it to the QA-1 developer's scope or authorize unrelated code changes here.
- Existing pending Control Resistance, DoT overflow, reaction probabilities, branch resources and other status balances remain pending.

## Design boundaries

**Approved:** the Option A opportunity-based model and the three named abilities as described above.  
**Not approved:** modifying other reactive statuses (Riposte, Evasion, Taunt), any numerical balancing, additional charges, reworked target legality, a new global duration model, or implementation.  
**Release gate:** the Creative Director must separately authorize developer implementation after reviewing the handoff.

## QA acceptance intent

Both faster and slower appliers receive identical intended opportunities; Marked for Death cannot evaporate before the Rogue's next valid strike solely because the target is slower; Expose gets two full applier opportunities; Guard gets the enemy response window before the defender's next scheduled turn. Fixed-seed coverage is specified in [the developer handoff](QA_1_REACTIVE_STATUS_DEV_HANDOFF.md).
