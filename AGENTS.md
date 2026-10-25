# AGENTS.md — rules for every AI agent on Enso's Last Stand

Several AI agents (Claude, ChatGPT, Gemini) and humans work on this repo. **None of you can see each other's chats.**
This file, the code, the tests and the docs are the only shared memory. Read this file fully before changing anything.

## 1. Team & ownership
| Role | Who | Owns (may change) | Must not change |
|---|---|---|---|
| Owner / producer | Tokelo (human) | everything, merges PRs | — |
| Lead Game Designer | Thorne (`.claude/agents/thorne.md`) | `docs/design/` mechanics; `null` pending values and mechanic fields in `src/data.js` | engine logic |
| Systems & Balance Designer | Gauge (`.claude/agents/gauge.md`) | `docs/design/` balance specs; balance values in `src/data.js` | engine logic, `qa/` |
| Historical narrative authors | Retired; existing canon remains authoritative | Existing `docs/design/` story, lore and dialogue as reference | No retired-personnel assignments |
| Dev | Claude (dev chat) | `src/`, `ui/`, `tests/`, `tools/`, `index.html`, `style.css`, `world.html`, `world.css` | `docs/design/` |
| QA & Balance | Claude (QA chat) | `qa/` reports | `src/`, `tests/`, data values |
| Codex Studio | Orion and ten Codex specialists (`.codex/roles.json`) | Assigned design, data, engine, UI, art, tools and QA work on separate `codex/` branches | `.claude/` configurations, unmerged work owned by others, merging/pushing `main` |
| *(to assign)* | Gemini | *(owner decides)* | |

If your role isn't in the table, ask the owner before editing. **When in doubt, propose in a PR description or a
`qa/` note instead of changing files you don't own.**

### Independent Codex Studio (owner mandate, 2026-10-25)
Codex is authorized to work independently through its coordinator and specialists; see `.codex/STUDIO.md` and
`docs/agents/CODEX_STUDIO.md`. For Codex work, this current mandate supersedes historical "unassigned" and
per-file approval text. Routine mechanics, pending values and balance decisions are delegated to Codex's own
Game Designer and Systems Designer, researched, documented and tested; they do not wait for Claude availability.
Only fundamental creative-direction changes escalate to the owner. Technical invariants below still apply.

Claude remains independent: Wren leads development, Pixie UI/UX, Tally QA, Thorne game design and Gauge systems.
Retired Sable, Morrigan, Vesper and Vaelis references in older material are historical, not active assignments;
Codex must not reactivate them. Rook is owner-assigned backup only. Codex does not edit Claude's configurations.
Check issues, branches and PRs before starting; preserve other studios' unmerged work and use separate worktrees.
The owner remains the only person who merges `main`.

## 2. Workflow
1. Branch from `main`: `<agent>/<short-topic>`, e.g. `claude/soul-chain`, `gemini/enemy-ai`, `chatgpt/item-designs`.
2. Small, focused changes. One topic per branch.
3. `npm test` must pass locally before you push (no dependencies; Node 18+).
4. Open a pull request into `main`. CI runs the tests on every PR. **A red PR is never merged.**
5. PR description: what changed, why, which design doc it implements, and anything left undecided.
6. The owner merges. Agents never push directly to `main`.
7. **Stacked PRs:** Merge the top of a dependent stack first, or retarget each child PR to `main` before merging its parent. A PR is only complete once its intended changes are verified on `main`; a GitHub “merged” label alone is insufficient. After merging, check the final files and test results on `main`.
   CI enforces this: the `pr-base` check is **red on any PR whose base isn't `main`** (so it falls under rule 4). Merge the parent, then retarget the child to `main` (Edit, next to the PR title). `node tools/stranded-check.js` lists merged PRs whose work never reached `main`.

Commit messages: `area: what changed`, e.g. `statuses: add Soul Chain link`, `qa: report #3`.

## 3. Architecture rules (don't break these)
- The engine (`src/engine.js` + `src/engine/*.js`) never touches the DOM, timers or `window`. It returns events;
  front ends (`ui/`) play them.
- `src/engine.js` is the core (API, output, state, routing). Other rules go in the matching `src/engine/` module as
  plain `GameEngine` methods; the core copies them onto the prototype and throws if two modules define the same name.
  A new module must be added to `MODULES` in `src/engine.js` **and** as a `<script>` in `index.html` and `world.html` before engine.js.
- **Player actions have one rules path** (`src/engine/actions.js`): `act()` and the text parser (`input()`) run the same
  functions. A new player-facing refusal must record a code (`refuse()` / `refuseCombat()`), and `getAvailableActions()`
  must report the same check with the same message (tests check they agree). Front ends never re-derive castability.
- **Per-turn bookkeeping goes in the two opportunity hooks** (`beginOpportunity` / `endOpportunity`, `src/engine/timers.js`),
  never at the call sites. A duration counted in turn opportunities is a `combat.timers` entry with a `kind`
  (plus an expiry rule in `TIMER_KINDS`), not a new counter. QA-1 windows count actionable turns only; timers say
  whether skipped turns count (`countSkipped`). Don't merge the two rules.
- **Control Resistance is one central policy** (`src/statuses.js`, numbers in `statusRules.controlResistance`, classes in
  `statusDefinitions[*].control`). Control effects just call `applyStatus()`; never special-case CR in a skill or effect.
  Anything with `type: 'skip_turn'` is hard control automatically. A new control effect declares `applies: { name, type }`
  in `src/effects.js` so availability can show the CR outcome.
- The world (`src/world/`) owns space only: maps, collision, movement, transitions. Walking never calls the engine.
  The engine stays authoritative for rules, inventory, fights and run flags. Map data must pass `validateWorld` (tested).
- Game content is data in `src/data.js`. Never hardcode a skill, class or enemy name in engine logic when a data
  field or effect entry can express it.
- Every skill effect type is one entry in `src/effects.js` plus tests.
- **Statuses always go through `engine.applyStatus(source, target, spec)`** (`src/statuses.js`). Players, enemies and
  summons share one pipeline. Durations are **round-based** in turn-based fights (timed in real-time fights, see combat v2 below): −1 at the end of each round in which the holder had a
  turn after the status was applied. Never tick durations anywhere else. **Only exception:** statuses with an
  `expiry` policy in `statusDefinitions` (QA-1: Marked for Death, Expose, Guard) expire by opportunity
  (`applier_turns` / `holder_next_turn_start`, see `src/statuses.js`). Adding a policy to another status needs design approval.
- **Combat v2 is real-time** (`src/engine/realtime.js`, `docs/REALTIME_COMBAT.md`, numbers in `realtimeRules`).
  `new GameEngine({ combatMode: 'realtime' })` fights on a clock the front end drives with `engine.tick(ms)`; the
  engine still never reads a timer. Turn-based is the **legacy mode** and stays the default (`combatMode: 'turn'`), so
  the text game, the balance bot and the older tests are unchanged; `legacy/turn-based-combat-v1` is the snapshot.
  In a real-time fight every status is timed (turns × `secondsPerTurn`) and every action is still one opportunity
  (the T-0 hooks), so both modes share one rules path. Don't add a third timing rule; extend `realtimeRules`.
- Randomness only through `engine.rng()` / `engine.randInt()` so runs are reproducible from a seed.

## 4. Design authority
- **Approved design lives in `docs/design/`.** Implement what it says. If code and design disagree, the design wins.
- **Thorne** (mechanics) and **Gauge** (numbers) are the designers. They decide routine design and balance themselves and
  escalate to Tokelo only major changes to the game's creative direction.
- Values that are `null` in `src/data.js` are **PENDING designer decisions**. Never fill them with guesses.
  `npm run pending` lists them. To test a configurable rule, use a modified data copy (`gameWith` in the tests).
- Don't change balance numbers in `src/data.js` unless the owner or a designer (Thorne, Gauge) asked; Gauge may change them directly. Measure with `npm run balance`
  and report options instead.
- Decided combat rules (don't silently change):
  - `attack` is always free: the class's first skill if it costs nothing, else the universal Basic Attack.
  - Branch resources earn via `resourceRules` in `src/data.js`.
  - Infection: stacking DoT, 2 dmg per stack, max 3 stacks, 3 turns, spreads on death when flagged.
- Open questions live in `docs/REVIEW.md` and `docs/STATUS_ENGINE_REPORT.md`. Ask before resolving them.

## 5. Adding a skill effect (Dev)
1. `npm run backlog` and pick a missing or partial effect type.
2. Read the skill descriptions that use it in `src/data.js` and the relevant design doc.
3. Add the registry entry in `src/effects.js`. Hooks are documented at the top of that file.
4. Add at least one fixed-seed test in the matching `tests/NN-area.test.js` (shared builders: `tests/helpers.js`).
5. `npm test` green, including the fuzz tests.

## 6. Commands
| | |
|---|---|
| `npm test` | all tests (required before every PR). One area only: `node tests/run-tests.js rogue qa1` |
| `npm run balance` | bot plays the dungeon per class, prints win rates (`-- --set path=value` to try a change) |
| `npm run backlog` | skill effects not built yet |
| `npm run pending` | design values still awaiting approval |
| `npm run play` | play in the terminal (`-- --seed 42` for a repeatable run) |
| `npm run build` | single-file builds in `dist/` (CI also produces them on every PR) |
| `npm run world` | print and validate the world maps (`docs/WORLD_MAPS.md` explains the format) |

## 7. Don't
- Don't remove the dev cheats (`add_xp`, `become_hollow_king`, `unlock_events`).
- Don't add npm dependencies without the owner's OK. The game must stay double-click playable.
- Don't commit `dist/`; CI builds it.
- Don't edit `legacy/`. It's the original game, kept for reference only.
- Don't rewrite another agent's work wholesale. Small PRs, explained.
