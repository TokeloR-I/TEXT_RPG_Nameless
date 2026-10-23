# Phase 1 engine interface — QA test plan (draft)

**Tally — QA & Balance Tester** · 2026-10-23 · **Status: DRAFT**, written against `architecture/PHASE1_ENGINE_INTERFACE_SPEC.md` **v0.2** (PR #51, not yet approved). It will be revised when the spec is approved, and each section is activated by the PR that delivers the feature it tests. Requested in the tech review (`TECH_REVIEW_2026-10-23.md`, Tally section) and spec §8, §10 (OQ7, OQ8).

## 1. Principles
- **Test against the spec, not the code.** Every check below cites a spec ID (C = compatibility, I = invariant, G = ordering, R = randomness, W = world).
- **No QA edits to `src/` or `tests/`** (AGENTS.md). QA checks live in `qa/scripts/`. Where a check belongs in `npm test`, QA proposes it and the Developer owns it.
- **Every phase PR is gated by the frozen baseline (§2)** plus the checks listed for it in §4. A PR is complete only once verified on `main` (AGENTS.md §2.7, stacked-PR rule).

## 2. Baseline freeze (spec PR-A) — **delivered in this PR**
`qa/scripts/golden.js` now separates behaviour from additive state (tech review F4) and covers the world (OQ7):

| Flag | Purpose |
|---|---|
| *(none)* | Combined hash, **same format and value as before** (continuity with reports #4–#5) |
| `--split` | Separate **events** hash (behaviour) and **state** hash |
| `--ignore a,b.c` | State hash without the listed `getState()` fields, for fields a PR adds on purpose (spec §6) |
| `--world` | +100 scripted world sessions: pickups (incl. repeats), each encounter, flee then re-engage, re-engaging a defeated encounter, forced defeat. Hashed separately; never changes the text hashes |
| `--sessions f.json` · `--diff a.json b.json` | Per-session hashes and a list of exactly which sessions changed, and whether in events or state only |

**Baseline on `main` 2215e87** (re-run 2026-10-23; identical to 95b0ab0, since no `src/` change landed in between):
| Corpus | Events | State |
|---|---|---|
| combined (legacy format) | `4e0ad69e73c80d38` (845,417 events, 0 engine errors) | — |
| text, 400 sessions | `e3fbefc0cf6e681e` | `5bd4c2dadfc7d69c` |
| text, ignoring `world`, `combat.awaitingContinue` | `e3fbefc0cf6e681e` | `a021e2c47dd8dbd9` (= pre-world `250a77b`: the Phase B fields were purely additive) |
| world, 100 sessions | `2758d6a8808faa56` | `1184ecf2b7f99400` |

Also frozen as baseline outputs: `npm run balance -- --runs 100`, `npm run backlog`, `npm run pending`, `node tools/play-cli.js --seed N` for 4 recorded command scripts, and every `qa/scripts/*` result (C4).

**Rule for every Phase 1 PR:** text events hash unchanged; world events hash unchanged; state hashes unchanged after `--ignore <fields the PR adds per §6>`. Any other change must be explained in the PR and located with `--diff`.

## 3. Compatibility checks (spec §7)
| # | How QA verifies | Tool / command |
|---|---|---|
| C1 | Existing tests pass; signatures unchanged | `npm test` |
| C2 | Golden events hash identical; state identical after `--ignore` §6 fields | `golden.js --split --world --ignore …` |
| C3 | `npm test` passes **with no edits to existing tests**; any edit listed and justified in the PR, then QA signs it off | `git diff main -- tests/` reviewed by QA |
| C4 | Every tool and `qa/scripts/*` gives identical output | diff against the frozen outputs |
| C5 | RNG draws unchanged: availability, events and serialize make no `rng()` calls | balance output identical; plus an RNG-counting wrapper around `engine.rng` during `getAvailableActions()` / `serialize()` (must be 0 draws) |
| C6 | Primitives still work on synthetic objects with no combat | existing tests + `qa/scripts/verify_s6.js` (hand-built units) |
| C7 | No `window`, `document`, timers or `Date` in `src/` | `grep -nE "window\.|document\.|setTimeout|setInterval|Date\(" src/ -r` (UI files excluded) |
| C8 | `index.html`, `world.html`, both single-file builds load and run | `npm run build`; `qa/scripts/world_browser.js` (headless Chromium, real key presses, 14 checks; uses a machine-wide Playwright if present, never a repo dependency); script order check like report #4 |
| C9 | Id formats unchanged | existing tests + golden state |
| C10 | Cheats via text and `{ type: 'cheat' }` | new QA check once `act()` exists |
| C11 | Transaction rollback covers `act()` and `load()` | report #1 repro C via `act()`; a `load()` that throws mid-way leaves the game intact |
| C12 | No gameplay change | golden events + balance + all rule scripts (`qa1_expiry`, `qa2_shieldbash`, `bonewall`, `riders`, `dominion`, `shield_discipline`, `soulbinder`) |

## 4. Gates per delivery PR (spec §9)
| Spec PR | Must pass | New QA work it unlocks |
|---|---|---|
| **PR-1** always-seeded RNG | C1–C5, C12; **R1**: an engine created without a seed reports one, and `new GameEngine({ seed: reported })` replays it exactly; world UI shows the seed (closes tech review F3, currently FAIL in `world_smoke.js` #6). **R2**: seeded runs unchanged (golden events + balance identical); two unseeded sessions differ, and each replays from its own reported seed | Browser bug reports become replayable |
| **PR-2** availability + `act()` + translator | C1–C5, C10–C12; I9, I10, I12, I15, I18 | `phase1_availability.js` (below) |
| **PR-3** events, modes, `seq`, cast ids | C2 (legacy stream byte-identical), C5; I1–I4, I7, I8, I11 (= C2), I16; **W4**: the world front end reads flee/victory/defeat from `combat.ended.outcome` (code review: no inference from `mode` / `world.lastResult`; `world_browser.js` B9, B10, B12 still pass) | `phase1_events.js` auditor |
| **PR-4** status / resource events | I5, I6, I8 (G5) | ledger checks extended |
| **PR-5** save / load | I13, I14, C11 (load), R3 | `phase1_saves.js` |

## 5. Invariant harness design (spec §8)
One QA auditor driven by three bots over the golden seeds, all in `qa/scripts/`:
- **Corpus bots:** (a) the golden text corpus; (b) the golden world corpus; (c) a fuzz bot that picks random **enabled** actions from `getAvailableActions()` (I15), with all-skills sessions to reach Soulbinder, Dominion, Bone Wall, QA-1/QA-2 paths.
- **Stream checks (PR-3/4):** after every call, check I2 (JSON round-trip, no `undefined`), I3 (`seq` +1, including across rollbacks and loads), G1–G6 ordering (I8), and at every `combat.awaiting_input` the **ledgers**: HP (I4), resource (I5), statuses (I6), deaths (I7). Run the same seeds in `legacy` and `full` mode and compare (I16).
- **Availability checks (PR-2):** I9: snapshot and RNG state unchanged, two calls deep-equal. I10: for every listed (action, target), run it on a `serialize`/`load` copy (or `snapshot`/`restore` until PR-5); enabled means accepted, disabled means rejected with the same `code`. I12: `input(text)` vs `act(parse(text))` give the same semantic events for every corpus command. I18: once the overlay reads availability, compare its enabled set headlessly.
- **Save checks (PR-5):** I13: at random points, serialize → load into a fresh engine → continue; the stream (incl. `seq`) must equal the uninterrupted run. I14: truncated, field-deleted, type-mutated, wrong-format and future-version saves; `ok: false` with the listed code, no exception, prior game intact. `DATA_CHANGED` warning when data is patched, refusal with `strictData`.
- **World checks:** I17 / **W2** (`rooms` deep-equal after any world fight, whatever the outcome; pickup and defeat flags at most once; per-encounter kill credit). W1: no rounds, statuses, resources or RNG draws from world intents. Covered today by `qa/scripts/world_smoke.js` (engine) and `qa/scripts/world_browser.js` (B4: walking adds no rounds, statuses or resource; B8: pickups once; B9/B10: flee cooldown and victory). An RNG-counting wrapper for W1 is added with PR-2.
- **Mutation testing:** for each invariant, break the matching rule in a scratch copy (e.g. emit `unit.died` before `unit.damaged`, skip a `resource.changed`) and confirm the auditor catches it. Same method as reports #2–#4.

## 6. Answers to the QA open questions
- **OQ7 — world sessions and the split.** **Yes, and done:** `golden.js --world` scripts 100 world sessions (pickups and repeats, every encounter, flee/re-engage, re-engaging defeated encounters, forced defeats). The split is a **flag** (`--split`, `--ignore`) on the same script, not a second script: one corpus, one baseline, one place to update. `--sessions` / `--diff` pinpoint which sessions moved. I used it to review PR #52: exactly 33 Soulbinder sessions changed events; everything else was an HP-display change.
- **OQ8 — where invariants I4–I7 run.** **A separate QA suite** (`qa/scripts/phase1_events.js`), for three reasons:
  1. The fuzz suites live in `tests/`, which QA must not edit.
  2. Ledgers need `full`-mode streams over hundreds of long sessions, which would slow `npm test` for every PR.
  3. QA should own the checker that grades the Developer's emitter: independence, as in the role split.

  **Proposal for Wren:** once the auditor is stable, add a 20-session smoke version to `tests/` so CI catches gross regressions. The full run stays a QA gate on each Phase 1 PR.

## 7. Conflicts spotted between spec v0.2 and open PR #52 (for Keel, Rook, Wren)

PR #52 itself is reviewed in QA report #6 (it predates the K1–K3 amendment, PR #54, and fails K1 and K3). The three spec-level conflicts below are separate from that.
1. **HP below 0.** §3.3 notes HP can go below 0 today and asks only that `damage()` *return* the actual HP removed. PR #52's `damage()` also caps HP itself at 0, so HP can no longer go below 0 through `damage()`. That's why 264 golden sessions changed **state only** on PR #52. Benign, but the spec's §3.3 note and the I4 ledger baseline need updating if #52 merges.
2. **`damage()` signature.** The spec asks for one optional **`cause`** argument (`'hit' | 'dot' | … | 'link' | 'drain' | 'aura'`) and the actual-HP return value. PR #52 returns actual HP (✓) but adds an options object `{ secondaryLink, alreadyScaled }` instead of `cause`. Reconcile before PR-3, or there will be two mechanisms.
3. **Multi-target text syntax.** The spec says `soul chain 1 3` (spaces); PR #52 implements `soul chain 1,2` (commas only; `1 3` is rejected). I12 parser parity needs one documented syntax, or the parser should accept both.

## 8. Not yet testable / open
- §3.4 event payload details and §3.6 emission sites: the checks are written once PR-3's catalogue (and `src/events.js`, if chosen per OQ5) exists.
- I18 needs the world overlay switched to availability (W3).
- Performance: `getState()` deep-clones per call. I'll add a timing smoke (events per second in `full` mode on the golden corpus) so regressions are visible, without a threshold until the Developer proposes one.
