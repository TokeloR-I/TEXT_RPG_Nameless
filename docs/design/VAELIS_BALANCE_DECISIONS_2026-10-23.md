# Vaelis — Authorized Balance Decisions
**Date:** 2026-10-23
**Owner:** Vaelis, Lead Game Designer
**Authority:** Creative Director delegated routine numeric gameplay balance decisions to Vaelis.
**Status:** Design-approved for scoped implementation and independent QA. No source code changed in this PR.

## Decision B-01: Resource regeneration
| Evolution | Resource | Passive regeneration per normal combat round |
|---|---|---:|
| Assassin | Stealth Tokens | **1** |
| Duelist | Combo Points | **1** |
| Illusionist | Deception Tokens | **2** |
| Chronomancer | Time Charges | **1 (unchanged)** |

Regeneration occurs once per normal combat round, subject to the existing resource cap. Bonus actions and Haste do not grant additional regeneration. Existing event-based gains, costs and start-of-fight values remain unchanged. Preserve QA-8A's single active resource after evolution. Do not implement the earlier 3/3/2/2 candidate.

**Evidence:** Tally's QA report #5 (PR #43) measured Stealth 1 and Combo 1 as sufficient to prevent resource starvation without the cap waste at 3. Deception 2 significantly improved skill access. Time 2 allowed a permanent Slow loop at level 5 without Control Resistance.

## Decision B-02: Base defense
- Mage: **current base DEF +1**
- Rogue: **current base DEF +1**
- Necromancer: **current base DEF +1**
- Warrior: **unchanged**

This is a deliberately conservative initial tuning pass. Tally's QA #5 showed +2 DEF substantially improved full-run outcomes but combined improvements risked overtaking Warrior; +1 alone will not solve every survival problem. Do not silently increase to +2. Do not change HP, armor formulas, enemy stats or unrelated skills.

## Decision B-03: Necromancer Soul Energy
Retain existing income: +1 at end of a round where the Necromancer player personally dealt qualifying primary damage, plus existing kill rewards. **Do not add unconditional passive Soul Energy regeneration.** Tally measured Bone Wall's opportunity-cost problem, but also a nearly invulnerable minion-and-wall loop when unconditional +1 was added. Defensive redesign remains a separate follow-up; do not mask the issue with an untested economy change.

## Decision N-7: Bone Fortress and passives
- **Bone Armor** remains 2% physical/magical damage reduction per living allied minion, capped at 10%.
- **Bone Fortress (Gravekeeper L8)** upgrades this to **3% total per living allied minion, capped at 15%** (not 2% plus 3%). At 1, 2, 3, 5, 6 living minions, reduction is 3%, 6%, 9%, 15%, 15%. True damage bypasses it. This fixes QA-25, where the L8 passive did nothing until the L14 minion-cap upgrade.
- **Grave Command:** summons prioritize the last **living enemy deliberately targeted by the owner's damaging action**, including an attempted attack that misses. Defensive casts, DoT ticks, automatic secondary damage and minion attacks do not change focus. If focused enemy dies, revert to existing first-living target selection until a new deliberate damaging action. Focus is fight-local, reset on new combat and included in snapshot/restore. This confirms the design interpretation used in Rook PR #68; Tally PR #69 is the independent QA handoff.
- **Plague Reservoir:** +1 Soul Energy on an infected enemy killed by the player's direct damage or the player's own Infection/Poison DoT; no bonus on a minion final blow. Once per enemy death. Existing ordinary kill rewards are unchanged. Secondary link/Feast/Lash damage exclusions from the Soulbinder contract still apply.
- **Harbinger of Decay:** Infection damage increases by **flat +2 per tick**, not +2 per stack. With 1/2/3 stacks, normal ticks deal 4/6/8 damage before applicable mitigation.
- **Channel the Grave:** +1 Soul Energy, 2 true self-damage. After successful use, unavailable on the **next normal caster turn opportunity**, then available again; skipped/stunned turns count, bonus actions do not. Refused casts never start cooldown. Self-damage may be lethal under normal engine rules. No hidden resource pool.

## Developer acceptance and QA
1. Fixed-seed resource tests for each evolved branch: regen at 0, 1, 2, 3 normal round ends; cap handling; bonus-action exclusion; inherited skills charge the active branch resource.
2. DEF tests on each base class, including Warrior unchanged; no unrelated stat drift.
3. Bone Fortress tests at levels 7, 8, 13 and 14 with **legal summon caps**, against physical, magical and true damage.
4. Grave Command: owner target focus on hit/miss; defensive cast does not change focus; dead-target fallback; multiple minions; snapshot/restore.
5. Plague Reservoir: exact infected versus uninfected kill difference, direct/DoT/minion attribution. A mutation test removing the bonus must fail the test.
6. Harbinger: 1/2/3 stacks yield exactly 4/6/8; preserve existing Infection stack cap/duration.
7. Channel cooldown: consecutive turns blocked, following turn available, skipped-turn behavior, lethal self-cost.
8. Tally: at least 100 matched seeds, boss-alone and full dungeon, both smart/simple bots; compare shipped baseline, regen-only, DEF-only, combined. Check Silence/Slow/Confuse denial streaks, resource starvation and Bone Wall exploit.
9. Run `npm test` and single-file build; owner merges only. Coordinate Wren-owned summon damage overrides separately.

## Follow-on design work (not silently authorized by this PR)
Possession; March of Endless Bones; Plague of Ages; Eternal Lich/Unmake; Fortress zone; Mage Overchannel; Steal Skill; turn-order manipulation; Shadowstep; Control Resistance numeric rules. Vaelis owns publishing separate complete implementation contracts and numeric decisions for these. Do not infer implementation approval from this list.
