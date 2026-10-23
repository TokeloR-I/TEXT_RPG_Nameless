# Vaelis — Package 2: Control Resistance and Turn-Denial Safety
**Authority:** Creative Director delegated gameplay numeric decisions to Vaelis, 2026-10-23. **State:** Approved design; Keel must validate scheduling integration, then developers implement in separate PRs. No engine edits here.

## Purpose and invariants
Prevent infinite stun/slow/silence/confuse/freeze/possession chains without erasing distinct class control identities. Keep **non-positional** deterministic combat. No retroactive changes to QA-2 Shield Bash's mandatory one unstunned normal target turn. Do not introduce a second resource pool or change existing damage/cost values.

## CR-01 Numeric model
- Each combatant has a **fight-local Control Resistance (CR) integer from 0 to 100**. Ordinary enemies and player begin at **0**; elite enemies begin at **25**; bosses begin at **60**. CR persists across normal turn opportunities in the same fight, not across fights.
- **Hard control:** stun, full action skip/freeze, possession, forced complete turn denial. Successful hard control adds **35 CR** after application.
- **Soft control:** silence, slow, confusion, forced restricted action. Successful soft control adds **20 CR** after application. If a confuse roll does not actually restrict an action, do not add CR.
- At **CR 50–79 before application**, hard control that would last more than one normal target turn is capped at **one**; soft control duration also capped to one.
- At **CR 80–100 before application**, **hard control is resisted entirely** (no cost-free refund if a legal cast lands but target resists; resistance is an outcome, not invalid targeting); soft control applies with **50% of its numerical strength**, rounded toward zero, and at most one turn. For binary soft control such as silence, it is resisted entirely at 80+ (no half-silence).
- **Bosses:** possession always invalid (refused before cost); boss-specific explicit immunities remain authoritative. Other hard control may affect a boss at CR below 80, but cannot deny **two consecutive normal boss turn opportunities**: if its preceding normal opportunity was skipped by hard control, the next is protected against hard control even if CR fell. Soft control may apply subject to CR and existing immunities.
- At end of each normal holder turn opportunity, CR decreases **10** only if no control effect successfully applied to that holder since the previous holder normal opportunity. A skipped normal turn counts for decay eligibility; bonus turns do not cause gain/decay. CR gain precedes decay evaluation. No negative CR. Every control application is attributed to an origin actor and unique application event; a multi-effect cast against one actor applies the **largest single category gain once**, not multiple gains.
- Explicit status immunity blocks application without CR gain. Cleansing a control effect does **not** clear accrued CR. No control can create duplicate turns or indefinite faction changes.

## CR-02 Ordering
1. Validate legal target and cast cost using normal engine rules. Explicit permanent immunity and Possession-on-boss are pre-cast refusal; CR threshold resistance is an **on-resolution result**, not a free cast.
2. Snapshot pre-application CR and previous skipped-turn protection. Resolve success chance and target immunity. Apply cap/strength/resistance from snapshot.
3. Apply shared status pipeline for successful control, add CR once, log applied/resisted result and update per-target application flag.
4. At normal target opportunity, resolve hard-control skip/restricted-action state, tick existing status timing as defined by `src/statuses.js` (do **not** invent a second status-duration decrement), update previous-skip protection.
5. On opportunity completion, decay CR if no successful control since last opportunity, then clear that flag. Haste/bonus actions neither decay nor consume protected normal opportunity.

## CR-03 Compatibility and balancing
- QA-2 Shield Bash anti-chain rule **always wins** if stricter than CR; CR cannot weaken it.
- `slow` may change initiative order or restrict speed as existing engine defines, but must **not** deny an enemy's entire turn repeatedly without hard-control classification. If the current `slow` implementation actually skips a turn, classify that effect as **hard** for CR, not soft by its name.
- Silence that forces Basic Attack is soft control, unless a skill completely prevents any action (then hard). Confuse's actual skip result is hard; merely retargeting an action is soft. Freeze Time that denies all enemies a normal turn is hard **per affected target**.
- Control resistance is not armor, not a chance to miss and not a universal reduction to DoT duration. It does not affect Soul Chain, ordinary marks, damage-only debuffs or taunt unless taunt denies all agency.
- Existing control skills keep their resource costs and base durations; this package changes effective duration/strength after CR mitigation.
- Possession uses Package 1's legal action/target ownership contract; the target's own turn slot remains authoritative. Do not substitute AI if no player-controlled action interface exists.
- Control on player or friendly summons follows same CR model, except boss-only immunity does not apply. Show CR/resistance outcome in CLI and GUI event logs.

## Deterministic acceptance matrix
1. Normal 0 CR hard success → 35; next hard success → 70; third hard success at 70 capped one turn; next attempt at 100 resisted. Verify exact ordering.
2. Normal 0 CR soft success → 20; repeat 20 → 40; repeat 40 → 60; at 60 duration capped one; at 80 binary silence resisted.
3. Elite starts 25, boss 60, normal 0; fight reset returns these values.
4. Boss cannot be possessed at any CR; ordinary non-immune target at 0 can be possessed; 80 CR hard control resists.
5. Boss hard skip at opportunity N prevents hard skip at N+1 even if source changed; N+2 may be eligible after normal opportunity.
6. Soft slow that *actually skips* target's normal opportunity classified hard; no 299-turn slow lock under Time Charges 2 scratch scenario.
7. Failed confuse roll does not add CR; successful skip adds hard 35; retarget-only confuse adds soft 20.
8. CR decay 10 after a normal opportunity with no new control, including stun-skipped; no decay from bonus turns; never below 0.
9. One cast with two control effects gives one max gain, not two; distinct later casts each apply gain.
10. Cleanse clears status but not CR; explicit immunity blocks gain; damage/DoT not affected.
11. `getAvailableActions()` and `act()` agree on boss Possession refusal; target CR resistance is reported as an on-hit outcome, not false eligibility.
12. Save/load, deterministic replay, simultaneous multi-target freeze and Haste/extra-action interactions preserve CR and protection flags.

## Integration and QA gate
Keel verifies no conflict with round-based status expiry, normal/bonus action distinctions and event ownership. Rook or Wren implements one central data-driven CR policy in combat/status engine, not per-skill hardcoding. Tally runs 100+ matched seeds and targeted control-loop harness (`qa/scripts/control_loops.js`) including Time 1 vs hypothetical 2, Stealth 1 vs 2 and Deception 2; flag lock streaks and boss-action denial. Any threshold adjustments must be recorded in a follow-up Vaelis design revision.
