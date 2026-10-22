# QA note 2026-10-22 — review of the design response and Dev handoff for report #1

Reviewed: `docs/design/QA_RESPONSE_2026-10-22_1.md` and `docs/design/DEV_HANDOFF_QA_2026-10-22_1.md` at `main` 14033bf.
`main` is byte-identical to build 2026-10-22.1 (the build report #1 tested), so every bug is still open. `npm test` 92/92.

## What QA will do (the "QA follow-up requested" section)
| Request | QA action | Tool |
|---|---|---|
| Retain fixed-seed repros for QA-1–QA-5 | Kept. They run from the repo as-is | `node qa/scripts/repros.js` |
| Retest after Developer fixes, using the handoff's acceptance checks | Run on every Dev PR; each bug reads FIXED / STILL OPEN, design-held bugs read HELD | `node qa/scripts/retest.js` (new) |
| Retest status expiry across speed orders | Matrix of 10 statuses × applier faster/slower, counting how often each one actually does its job | `node qa/scripts/speed_matrix.js` (new) |
| Per-class and per-branch baselines only after foundational fixes | Rerun once QA-3/4/5 are FIXED, before any tuning is discussed. Options stay labelled as measurements | `npm run balance -- --runs 100`, `node qa/scripts/smartbot.js 100` |

Today `retest.js` reports QA-3, 4, 5, 6, 7, 9, 10 as STILL OPEN and QA-1, 2, 8 as HELD, which is the expected starting point.

## Corrections and flags for the designer
1. **QA-5: report #1's "Expected" was wrong; the fix needs a design rule.** In repro E the stun hits for 0 (Chain Lock 1 dmg − Warrior DEF 5), so nobody can ever die. The handoff's acceptance ("bounded computation and a recoverable game state") can't be met without choosing how such a fight ends: give the player a turn, declare a draw/defeat, or allow flee. That choice is a design rule, not a technical fix. A permanent stun that *does* damage already ends in a normal defeat (player dies in 14 rounds; guarded as `QA-5b` in `retest.js`).
2. **QA-1 is narrower than the six statuses listed in Decision 1.** With one enemy, only **Marked for Death** (0 uses if you're faster, 1 if slower), **Expose** (1 vs 2) and **Guard** (2 vs 1) depend on speed order. Evasion, Riposte and Taunt get their intended uses either way, because the first two are used up on the first attack and Taunt counts the minion's own turns. Stun, Silence, Blind and Bleed are speed-independent. Source: `speed_matrix.js`.
3. **QA-1 regression test: the two docs disagree.** The design response says "add reproductions to regression suite"; the Dev handoff says hold. A test can only assert the *approved* behaviour, so it can't be written until Decision 1 is made. Until then the evidence lives in `qa/scripts/`, not in `tests/`.
4. **QA-6 acceptance depends on the persistence question.** "One entity's death is not credited multiple times": today the killed rat comes back at full HP after flee, and killing it again makes Enemies slain 2. Whether the returned rat is "the same entity" is exactly the open persistence decision. `retest.js` uses the strict reading (count stays 1); it should be revisited once persistence is decided.
5. **QA-10 is partly done already.** `CLAUDE.md` now points to `AGENTS.md`, so the `turnStatuses` reference is gone. Still stale: the comment above `apply_mark` in `src/effects.js` (marks count the "APPLIER's" turns) and "73 automated tests" in `docs/GAME_DESIGN_STATUS.md`.
