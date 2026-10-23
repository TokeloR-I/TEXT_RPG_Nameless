# Technical Review — 2026-10-23

**Keel — Technical Director & Game Systems Architect**
**For:** Creative Director (Tokelo) · Veyr · Vaelis · Wren · Rook · Tally · UX Designer *(seat open)* · Documentation & Lore Archivist *(seat open)*
**Status:** Review and recommendations. No source, test, data or design files were changed. Decisions marked **R** need the Creative Director.
**Baseline:** `main` @ `0a6d760` (147/147 tests). Also reviewed: `claude/world-c-polish` @ `45e34e6` (162/162 tests).

---

## 0. Top actions

| # | Action | Owner | Why |
|---|---|---|---|
| 1 | **Land Zone 1 Phases B and C on `main`:** merge [PR #49](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/49) ([§2 F1](#f1)). | Tokelo (merge), Wren (confirm) | 1,489 lines of approved, tested work are stranded on stacked branches. GitHub shows those PRs as merged, but none of it is on `main`. |
| 2 | Decide **D4: no framework for Zone 1** (keep vanilla canvas) and **D5: single-file builds for playtests**. | Tokelo | The vanilla canvas front end works. Making that official stops the Phaser question from blocking work. |
| 3 | Authorize **Phase 1 engine interface** work, starting with the smallest slice (seeded engine + available actions). | Tokelo → Wren | The battle screen now depends on engine *sentences*; any wording change breaks it silently ([F2](#f2)). |
| 4 | Stop the stacked-PR trap from happening again (one rule in AGENTS.md). | Veyr | It's a process gap, not anyone's mistake ([F1](#f1)). |
| 5 | Answer K1–K3 on the Soul Chain contract ([PR #48](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/48)), then release it to Rook. Use [§3](#3-architecture-reviews-requested-by-design) for N-5 and N-1. | Vaelis | K1 is a real conflict: as specified, link length would depend on enemy speed. |

---

## 1. What I checked

- Every commit since my last review (48 commits, PRs #13–#47), all design docs in `docs/design/`, QA reports #2–#5, open issues #29, #33 and #40.
- `npm test` on `main` (147/147) and on the stranded branch (162/162). CI on `main` is green.
- **Text-game regression check:** I ran Tally's `qa/scripts/golden.js` (400 seeded sessions, 845,417 events) on `main` and on the stranded branch, with events and state hashed separately ([F4](#f4)).
- **Integration probe:** I started a world fight through the engine's existing combat entry point, to see what Phase B would hit.
- **Browser check:** I opened the built `EnsosLastStand-World.html` from a plain file in Chromium, picked a class and walked around. It ran with no console errors and no network requests.

**What's working well:**
- The world model (`src/world/world.js`) is headless, data-driven and validated. `validateWorld()` checks reachability, symmetric transitions and bounce-back.
- World intents in the engine are transactional, so a failure rolls back like a typed command does.
- The engine split into `src/engine/` modules has a duplicate-method guard. The tests are split by area.
- QA-1, QA-2 and Bone Wall each landed with regression tests.
- The text game is byte-identical after all of it.
- The single-file world build needs no internet.

This is a healthy codebase. The findings below are about *seams*, not quality.

---

## 2. Findings

### F1 — Zone 1 Phases B and C never reached `main` · **P0, process** <a id="f1"></a>
The three world PRs were stacked: #46 targeted `claude/world-a-foundation`, and #47 targeted `claude/world-b-zone1`. They were merged in this order:

| PR | Merged into | Time (UTC) |
|---|---|---|
| #45 (Phase A) | `main` | 06:59:12 |
| #46 (Phase B) | `claude/world-a-foundation` | 06:59:31 |
| #47 (Phase C) | `claude/world-b-zone1` | 06:59:47 |

#45 merged first, so #46 and #47 landed on branches that were already finished. GitHub marks all three "merged", but `main` has only Phase A.

**Missing from `main`:** the shed, well and road maps; pickups; encounters and the battle overlay; the engine world module; `docs/WORLD_MAPS.md`; `tools/world-check.js`; and 15 tests. That's 23 files and 1,489 lines.

**Verified safe to land:**
- It merges cleanly into `main` (merge base `f2820f5`).
- 162/162 tests pass.
- The text-game **event** stream is byte-identical to `main` (golden events hash `e0beb733…` on both).
- State is identical apart from two new additive `getState()` fields.

→ **[PR #49](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/49)** lands `claude/world-c-polish` on `main`. Wren should confirm it's the intended final state; Tokelo merges.

**Process fix (Veyr):** add to AGENTS.md §2: *"Stacked PRs: merge the top of the stack first, or retarget each child PR to `main` before merging its parent. A PR counts as done only when its commits are on `main`."*

### F2 — The battle screen drives the engine through English text · **P1, architecture** <a id="f2"></a>
On the stranded branch, `ui/world-ui.js` does four fragile things:
- **Sends typed commands.** It builds strings like `send(\`${skillName} ${n}\`)`, where `n` is a list position, the fragile targeting the spec's ID-2 warns about.
- **Builds the battle log by filtering engine sentences** with regexes and exact phrases (`'--- Enemies ---'`, `/^Type a command/`, `'(Type anything to continue.)'`, `/appears! \(HP: \d+\)$/`). Any wording change in the engine silently breaks the graphical log.
- **Re-implements castability.** Skills are disabled only for "not implemented" or "can't afford". The UI doesn't know about silence, once-per-fight, the QA-2 Shield Bash recovery state, or `requires()` refusals (Corpse Bloom with no corpse, Assassinate on a healthy target, traps full, minion cap). The player can pick an option the engine then rejects with an `Error:` line.
- **Infers hits from HP differences** between snapshots. That can't show per-hit order, which D3's "ordered animations and readable feedback" requires.

None of this is a bug today, and the world-vs-text log test passes. It's exactly the debt `PHASE1_ENGINE_INTERFACE_SPEC.md` was written to prevent: G1 (structured events) and G2 (structured actions). It grows with every new skill and every engine message edit. **Recommendation:** authorize Phase 1, with `getAvailableActions()` + `act()` first. That alone removes the command strings, the index targeting and the duplicated rules.

### F3 — The graphical game is unseeded · **P1, small fix** <a id="f3"></a>
`world-ui.js` creates `new ENSO.GameEngine()` with no seed, so the engine uses `Math.random`. Confirmed in the browser: `rng.getState` is missing. A playtester's bug can't be replayed, and a run can't be saved later. The fix is spec rule R1: always use `mulberry32`, pick a seed once, and show it, for example in the pause menu.

### F4 — `golden.js` treats new state fields as behaviour changes · **P2, QA tooling** <a id="f4"></a>
`main` and the stranded branch give different golden hashes (`d6277fbe…` vs `4e0ad69e…`). Hashed separately:
- **Events:** identical, `e0beb733…` on both.
- **State:** identical, `d6277fbe…`, once the two new fields `world` and `combat.awaitingContinue` are removed.

Phase 1 adds more `getState()` fields on purpose, so the tool needs a mode that separates the two. My scratch variant is three lines and is described in the spec (C2).

### F5 — Spec v0.1 was stale and unreviewed · **P2** <a id="f5"></a>
Since v0.1:
- the engine was split into modules (every line reference broke);
- Bone Wall added absorbed hits;
- QA-1 added two new expiry paths;
- the world added engine intents.

No one has answered OQ1–OQ8, and nothing references the spec. **This PR revises it to v0.2:**
- references now name modules and functions instead of lines;
- new events: `combat.absorbed`, plus QA-1 expiry reasons;
- a new §6A maps the world intents onto `act()`;
- Tally's golden master is adopted for the PR-A baseline.

### F6 — More state changes are bypassing the shared functions · **P2, guardrail** <a id="f6"></a>
Direct writes outside `damage()` / `heal()` / `gainResource()` / `removeStatus()`:
- **HP:** 5 sites (Crown revive, level-up refill, Revert HP, erase, Hollow King cheat)
- **Resources:** 4 sites (skill cost, Crown, level-up, Hollow King cheat)
- **Status removal:** 9 sites, up from 7 in v0.1. QA-1 added two expiry paths.

Each one is a place a structured event can be missed later. **Rule for new code (Wren, Rook):** change HP, resources and statuses only through those four functions. Exceptions are listed in spec §3.6.

### F7 — Stale docs and an online-only text build · **P3** <a id="f7"></a>
- `README.md:7` still says "a Phaser side-scroller later". D3 says top-down exploration plus a side-view battle scene, and Phaser isn't approved.
- `docs/GAME_DESIGN_STATUS.md` L353, L395 and L421 still treat ranks and a side-scroller as open. D2 and D3 settled that.
- `index.html` loads Tailwind from a CDN, so the text single-file build needs internet. The world build doesn't.

---

## 3. Architecture reviews requested by Design
The blocker audit (§Findings 5) and the Necromancer register ask me to review links, control authority, resurrection and non-positional zones. These are **technical constraints and costs to design around**, not behaviour or number decisions.

### A1 — Soul Chain links (D-01 / N-3)
> **Update:** Vaelis's final N-3/N-4 contract ([PR #48](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/48)) arrived during this review. It settles points 2–5 below: secondary damage is re-mitigated with no crit and bypasses DEF, DoTs trigger, there's single-pass recursion, and kills credit the caster. My [review of #48](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/48#pullrequestreview-5625465492) found:
> - **one concrete conflict, verified on the engine:** per-holder status ticking makes members of the same link group expire in different rounds;
> - **two missing rules:** the order of a lethal primary hit vs group dissolution, and which Soul Energy / mark effects secondary damage triggers;
> - **seven implementation notes for Rook.**
>
> Points 1–5 below are kept as the reasoning behind that review.

1. **Store links by id, never by object reference.** Every command is a transaction: `snapshot()` / `restore()` round-trip state through JSON, and `restore()` re-links only `combat.order`. A link holding object references would point at dead copies after any rollback, and later after save/load. Model membership as a status applied through `applyStatus()` on each member, e.g. `{ name: 'Soul Chain', groupId, memberIds }`. Duration, cleansing, Control Resistance and saving then come from the existing pipeline.
2. **Where propagated damage enters decides what it means. This is the key design choice:**

   | Entry point | Receiver's armor / marks / Bone Wall | Crit | Seeded RNG | Cost |
   |---|---|---|---|---|
   | (a) `damage()`, copying the post-mitigation amount | not applied | no | unchanged | lowest |
   | (b) `rollDamage()`, re-mitigated per receiver | applied | **rolls again** | **every seeded run after the first link shifts** (balance baselines and golden runs change) | medium |
   | (b′) re-mitigated without a crit roll | applied | no | unchanged | medium |

   I recommend (a) or (b′). Avoid (b) unless a second crit is intended.
3. **Recursion:** single pass. Propagated damage carries a `propagated` cause and never propagates again. The engine already does this twice: `chain_lightning` uses `ctx.chained`, and the QA-4 reaction guard stops loops. Cost is low.
4. **DoTs:** `tickDots()` calls `damage()`, so with option (a) DoTs propagate automatically unless the design excludes them by cause. Vaelis should state this explicitly either way.
5. **Attribution:** propagated damage should credit the *original* attacker, the same way DoT `appliedBy` works. That decides kill credit and Soul Energy on kill.

### A2 — Possession (D-03 / N-5)
1. **Today an enemy always targets the taunting minion or the player** (`enemyTurn()`) and picks its skill with `rng()`. There are two implementation models:
   - **(i) Automatic:** a deterministic rule picks the possessed enemy's skill and a target among its own allies. Small change.
   - **(ii) Player-chosen:** the engine must pause on the *enemy's* turn and wait for input. That needs a new waiting state and an action like `{ type: 'control', actorId, skillId, targetId }`, which is exactly what Phase 1 `act()` provides. Without Phase 1 it means more typed-command hacks in the UI.

   **Recommendation:** use (i) now. Choose (ii) only after Phase 1 lands and the UX spec asks for it.
2. **Allegiance cascades.** `isPlayerSide()` gates three rules: kill credit, the Synergy Marks bonus, and the Warden's "marked enemy hit" Vigil gain. Design must say whether a possessed enemy counts as player-side during its controlled turn. Technically it's one `controlledBy` flag, but the rules consequence is real.
3. Possession should be a **hard-control status through `applyStatus()`**, so immunities and Control Resistance apply. "Expires exactly once" fits the existing `holder_next_turn_start` expiry policy from QA-1.

### A3 — Resurrection (N-1 March of Endless Bones, N-6 Eternal Lich)
1. **The fallen roster already exists.** Dead minions stay in `combat.minions`; `alive()` just filters them out.
2. **Resurrect as new summons with new ids**, recording which minion each replaces (`resurrectedFrom`). Don't revive the same object. Reusing ids would break the spec's identifier rule (ids are never reused) and drag stale statuses along. This matches Vaelis's "fresh live instances" proposal.
3. They join the turn order next round automatically, because `newRound()` rebuilds the order from living units.
4. **One lethal-interception point.** Crown of the Undying is checked in `checkBattleEnd()`, after the lethal damage. Eternal Lich's first-death resurrection should use the same hook, with a defined precedence and a data-driven trait, not a second special case. DoT deaths reach the same check, so ordering stays consistent.

### A4 — Fortress and other zones without positions (D-07)
A "zone" with no positions is a **field effect on one side**. Two technical options:
- **(a) Statuses on each current ally,** applied through `applyStatus()`. No new machinery; it saves, expires and cleanses like any status. A minion summoned *after* the cast isn't covered.
- **(b) A combat-level field list** (`combat.fields[]`) that ticks at round end. It covers late joiners, but needs new code, a save field and new events.

**Design question that decides it:** is a minion summoned mid-Fortress protected? If yes, (b); if no, (a).

Total Lockdown's "can't leave zones" has no meaning without positions. It needs re-expressing, for example as blocking flee or blocking a swap, before any engineering estimate.

### A5 — Rearranging the turn order (D-09)
`newRound()` re-sorts the order by speed every round. A three-round rearrangement must therefore be stored as a combat-level override that `newRound()` applies, or it's lost after one round. That's low cost once the design defines the new order.

---

## 4. Feedback by role

**Tokelo — Creative Director**
- **R1:** Merge [PR #49](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/49) (Phases B and C), after Wren confirms.
- **R2 (D4):** Recommend "no framework for Zone 1". Vanilla canvas is proven, offline and dependency-free. Revisit when side-view battle animation needs sprite sheets and tweening.
- **R3 (D5):** Recommend the single-file builds (already produced by CI) as the playtest format. A desktop wrapper can wait.
- **R4:** Authorize Phase 1 in slices:
  1. seeded engine
  2. `getAvailableActions()` + `act()`
  3. structured events
  4. save/load
- **R5:** The UX Designer and Documentation & Lore Archivist seats are still open. Both have concrete work waiting (below).

**Veyr — Chief of Staff**
- Add the stacked-PR rule (F1) to AGENTS.md §2.
- On your routing board, track "on `main`" separately from "PR merged".
- Route spec v0.2 review to Wren (OQ1–OQ6) and Tally (OQ7–OQ8, test plan).
- Keep a Keel review step on D-01, D-03 and N-1 specs before they're released to developers.

**Vaelis — Lead Game Designer**
- **PR #48 (N-3/N-4):** please add one sentence each for K1 (one clock for the link group), K2 (a lethal primary hit still propagates; recipients are captured before death) and K3 (which Soul Energy and mark effects `link` / `drain` / `aura` damage triggers). Details are in my [review on #48](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/48#pullrequestreview-5625465492). After that, I have no architectural objection to Rook starting.
- §3 A1–A5 lists the technical consequences of each open choice. The ones that change cost or determinism:
  - Soul Chain: where propagated damage enters (A1.2) and whether DoTs propagate (A1.4)
  - Possession: automatic vs player-chosen (A2.1) and allegiance (A2.2)
  - Fortress: whether late summons are covered (A4)
- Your proposals in N-1 (fresh instances, rejoin next round) and N-5 (keep the initiative slot, revert after one action) are technically sound as written.

**Wren — Primary Developer**
- The world work is strong; the engine world module solved the kill-credit and room-coupling problems my probe found. Please confirm [PR #49](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/49) (F1).
- Next candidates, in order:
  1. always-seeded engine (F3, small; spec PR-1)
  2. `getAvailableActions()` + `act()` (spec PR-2, which removes F2's command strings and duplicated rules)
- Please review spec v0.2 §3.6, §4.5 and §6A and answer OQ1–OQ6. Until `act()` lands, please avoid adding more rule logic to `world-ui.js`.

**Rook — Night Shift Developer**
- Dragon's Dominion and Shield Discipline went through the status pipeline, which is right.
- For new effects, change HP, resources and statuses only through the shared functions (F6).
- Stay off D-blocked mechanics (D-01–D-10) until Vaelis's specs are released.
- **Soul Chain / Soul Feast (PR #48), once K1–K3 are answered:** my review lists seven implementation notes. The most important are: there's no multi-target selection yet (`enemy_multiple` falls back to single-target); `damage()` must return actual HP removed; and secondary/drain damage must **not** go through `rollDamage()`, which draws RNG. Implement the recursion guard as the `cause` argument on `damage()` defined in spec v0.2, so it's built once.

**Tally — QA & Balance**
- `golden.js` is effectively spec PR-A; v0.2 adopts it. Please add an events-only / state-only split (F4), so Phase 1's added `getState()` fields don't hide or fake regressions.
- Please draft the Phase 1 test plan from spec §7–§8.
- Consider adding scripted world fights (`worldEncounter`) to the golden corpus once F1 lands.
- Browser-reported bugs can't be reproduced until F3 is fixed.

**UX Designer *(seat open)***
- Your inputs: D3's "unresolved for UX" list (keys, target cycling, HUD, log, status readability, transitions, skip, accessibility, save/load UX), the stranded battle overlay as a working baseline, and spec v0.2.
- Design the battle menu around `getAvailableActions()`: every option has an `enabled` flag and a `reason`. Design animation pacing around the event catalogue (spec §3.4).

**Documentation & Lore Archivist *(seat open)***
- Stale references to fix: F7's `README.md` line and the `GAME_DESIGN_STATUS.md` sections (L353, L395, L421), which are superseded by D2/D3.
- After F1 lands, add `docs/WORLD_MAPS.md` to the docs index.
- Record D1–D3 and (once decided) D4/D5 in one place.

---

## 5. What this PR contains
- This review.
- `architecture/PHASE1_ENGINE_INTERFACE_SPEC.md` revised to **v0.2** (changelog at the top). Still a draft for review; no implementation authorized.

Also posted: an architecture review on [PR #48](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/48#pullrequestreview-5625465492) (Soul Chain / Soul Feast contract).

Separately: [PR #49](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/49) lands `claude/world-c-polish` on `main` (F1). That's Wren's code, unchanged; I only opened the PR.
