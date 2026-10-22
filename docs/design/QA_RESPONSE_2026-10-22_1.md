# ENSO's Last Stand — Design response to QA Report #1

**Date:** 2026-10-22  
**Author:** Lead Game Designer / Narrative Designer (ChatGPT)  
**Source:** [QA report](../../qa/QA_REPORT_2026-10-22_1.md)  
**Status:** Review and recommendations; **not Creative Director approval**

## Assessment
QA reports 92/92 tests passing and independent verification of all 21 status-engine invariants, but correctly flags user-facing regressions and serious balance disparities. Passing tests do not supersede approved design intent. No class values, status parameters, or new rules are authorized by this document.

## Triage

| Finding | Design response | Status |
|---|---|---|
| QA-1 — speed-sensitive marks/defenses | Valid discrepancy against the approved intent of effective status windows. DoTs already provide consistent ticks, but reactive statuses can expire before they are usable. Preserve approved round-based duration architecture; **exact per-effect eligibility/expiry semantics require director approval**. | Design decision pending; add reproductions to regression suite |
| QA-2 — Shield Bash stun-lock | Unconditional repeated boss suppression contradicts the skill's stated condition. The skill references Momentum although Vanguard switches to Oath Points. **No replacement condition, threshold, or CR values are approved.** | Design decision pending; keep reproducer |
| QA-3 — action-exception input soft-lock | Technical robustness defect. Rejecting an invalid action should leave combat recoverable; do not invent balance rules to fix it. | Developer investigation |
| QA-4 — recursive reactions | Technical robustness defect. Prevent unbounded recursion without selecting unapproved reaction-chain gameplay semantics. | Developer investigation; policy pending |
| QA-5 — repeated player stuns | Technical liveness defect; resolve infinite execution safely without selecting arbitrary stun immunity. CR remains disabled pending approved parameters. | Developer investigation; policy pending |
| QA-6 — fleeing/kills | Duplicate lifetime kill count is erroneous. Whether killed enemies stay dead after fleeing, and survivor HP persistence, are **unresolved design questions**. | Fix stat integrity; persistence pending |
| QA-7 — articles / duplicate XP | Presentation defects; correct without changing rewards. | Developer fix |
| QA-8 — resource texts | Cost descriptions disagree with actual branch-resource charges. Resource behavior must not silently change; descriptions should ultimately reflect approved rules. | Design decision pending; text correction after decision |
| QA-9 — CLI player stats | Show player HP, current resource, and statuses during combat; no mechanic changes. | Developer UX fix |
| QA-10 — stale docs/comments | Bring technical documentation into line with implementation; avoid rewriting approved design intent to justify a regression. | Developer documentation fix |

## Balance findings
The reported 100-run baseline is **Warrior 56%, Mage 0%, Rogue 8%, Necromancer 2%**. The boss-only results are heavily skewed by branch resources and Shield Bash. QA's O-A through O-D runs are **measurements only**, not approved tuning. Fix correctness issues and obtain a fresh baseline before recommending numerical changes. Keep existing Infection values unchanged (2 per stack; 3 stacks; 3 turns).

## Decisions requiring Creative Director review, one at a time
1. **First:** QA-1 reactive-status effective windows (Marked for Death, Expose Weakness, Guard, Evasion, Riposte, Taunt). Recommendation: a status should survive long enough for its intended attack/defensive opportunity without violating round-based DoT ticks. Details require approval.
2. QA-2 Shield Bash threshold and interaction with Oath Points and future Control Resistance.
3. QA-8 base-skill costs after branch evolution and resource earn rates.
4. DoT refresh value precedence; reaction refresh/chaining; CR parameters; fleeing persistence; visibility of James Newton in normal play.

**No implementation specification is issued for these pending decisions.** The Creative Director has final authority.

## QA follow-up requested
Retain fixed-seed repros for QA-1–QA-5. After Developer fixes, retest stability, status application, and status expiry across speed orders. Rerun per-class and per-branch balance baselines only after foundational fixes; report discrepancies without treating experimental options as approvals.

## Authority
Read [the approved status design](ENSO_Status_Effects_Approved_Design.md), [the status implementation report](../STATUS_ENGINE_REPORT.md), and [AGENTS.md](../../AGENTS.md) before implementing gameplay changes.
