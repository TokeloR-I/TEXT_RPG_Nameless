# ENSO's Last Stand — QA-2: Shield Bash stun condition

**Author:** Vaelis — Lead Game Designer & Narrative Designer  
**Status:** PROPOSAL — **Creative Director approval required**; implementation NOT authorized  
**Date:** 2026-10-22  
**Reference:** [QA report](../../qa/QA_REPORT_2026-10-22_1.md), [approved status design](ENSO_Status_Effects_Approved_Design.md), [status implementation report](../STATUS_ENGINE_REPORT.md)

## Problem

At level 3, Vanguard replaces Momentum with **Oath Points**, but Shield Bash still describes `Momentum >= 3`. Its stun effect ignores that condition and currently refreshes one-turn Stun unconditionally. Repeated free Shield Bash can suppress the boss indefinitely while Control Resistance (CR) is disabled pending designer values.

## Proposed skill contract — approval requested

**Shield Bash:** existing single-target physical hit (10–14 base damage); **0 Oath Points cost**, unchanged. Its **stun is attempted only if the caster has at least 3 Oath Points at the moment of the hit**. This is a **minimum threshold**, **not an expenditure**: neither the attack nor the stun subtracts the 3 points. An unsuccessful threshold check does not prevent the damage portion or consume extra resources. A miss/no valid hit cannot apply Stun. No hidden use limit or new numerical damage adjustment.

**Reason:** a defender must establish an oath-driven defensive stance before controlling an enemy; spending three points for a free skill would quietly redesign resource economy, currently an independent QA-8 decision. Retaining the existing numeric threshold of 3 avoids speculative tuning. The resource's existing on-Guard acquisition remains unchanged; no new regeneration is approved here.

### Anti-permanent-stun safeguard — approval requested

**Do not permit consecutive target-turn denial from repeated Shield Bash casts**, even before CR is configured. After Stun makes a target skip one *scheduled normal turn*, that target must complete **one subsequent scheduled normal turn in which it is not stunned by Shield Bash** before Shield Bash may apply Stun to that target again. During this temporary per-target lockout, Shield Bash still deals its ordinary damage but has no Stun effect. This lockout is specific to Shield Bash's reapplication, **not global stun immunity** and not an added universal cooldown. An unsuccessful cast does not consume an eligibility window; a target's extra action does not count as its normal recovery turn. The lockout resets at combat end.

This additional anti-chain rule is proposed explicitly because the CR engine is currently disabled. **The 3-point threshold alone cannot guarantee prevention of a permanent stun-lock** once the caster maintains >=3 Oath Points.

### Interaction with future Control Resistance

- Classify **Stun** as hard control *subject to the separately approved CR classification/parameters*. A successful Shield Bash stun uses the **existing unified `applyStatus` pipeline**, including affinity/immunity and CR gates; no special CR bypass for bosses.
- Sequence: validate hit -> evaluate Oath threshold -> verify Shield Bash-specific re-stun eligibility -> check target status immunity/CR -> apply one-turn Stun -> accrue CR on successful application only.
- As already approved, a hard-control application that reaches CR 100 **still succeeds**; later hard-control applications are resisted until CR falls below its approved release threshold.
- A bash blocked by the threshold, target eligibility, immunity or CR does **not** apply Stun and does **not** add CR. Its hit damage is unaffected.
- **No CR numbers are approved here:** `Stun.control`, `Stun.crGain`, recovery, release threshold, player/summon/regular/elite/boss multipliers remain pending the separate CR assignment. No boss-specific immunity or guaranteed number of stuns is implied.
- Other stun sources use their approved definitions and the shared CR system. This proposal does **not** silently add lockouts to other stun skills.

## Deterministic Developer + QA acceptance criteria (after separate code authorization)

1. **Evolution:** level-3 Vanguard has Oath Points, not Momentum; Shield Bash checks current Oath Points and the skill menu describes the correct threshold.
2. **Threshold:** at 0, 1, 2 Oath Points, a successful Shield Bash hit deals ordinary damage but applies no Stun. At exactly 3, and at >3, it may stun if all other checks pass.
3. **No expenditure:** after a threshold-satisfying Shield Bash, Oath Points are unchanged except any separately evidenced existing resource rules; no hidden 3-point payment.
4. **Failed attacks:** miss/dodge/no live target prevents Stun; no resource charge or CR gain from a failed Stun.
5. **One-turn control:** qualifying unresisted Stun denies exactly the target's next scheduled normal action, regardless of speed or Haste; existing status rules remain intact.
6. **Anti-lock:** fixed seed with CR disabled and Vanguard repeatedly casting Shield Bash at >=3 Oath Points: target cannot have **two consecutive scheduled normal turns denied by Shield Bash**, and it completes one normal action between successive Shield Bash stun skips.
7. **CR simulated, data-copy only:** when the existing CR system is deliberately configured with test-only values, successful stuns accrue scaled CR and the application reaching threshold still lands; subsequent ones are blocked until below release threshold.
8. **Non-success CR:** threshold failure, lockout, immunity, miss and CR denial contribute no additional CR and do not refresh Stun.
9. **Enemy tiers:** exercise regular and boss via cloned configurations; boss's first otherwise valid control must not be pre-blocked merely due to boss classification.
10. **Regressions:** Guard's existing resource gain is unchanged; all existing statuses, DoT ticks, damage and non-Shield-Bash stuns retain their independently approved behavior. Run fixed-seed boss scenario from QA report, `npm test`, and relevant CLI/fuzz runs.
11. **Combat cleanup:** target-specific Shield Bash recovery bookkeeping clears upon encounter end and cannot leak to future fights.

## Boundaries and coordination

- **Not approved yet:** any of the above proposed changes, other ability tuning, CR numeric values, modifications to resource regeneration/cost economy (QA-8), code changes or implementation assignment.
- This proposal preserves the existing 10–14 damage, cost 0, one skipped turn, threshold value 3, and approved CR threshold behavior. It **proposes** changing the threshold's resource name and adding per-target anti-chain protection.
- Developer implementation requires a **separate explicit Creative Director authorization after approval of this design PR**. Until then, no developer code changes.
- Follow [AGENTS.md](../../AGENTS.md): only design files changed in this PR, not `src/`, `tests/` or `qa/`.
