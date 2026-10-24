# Technical Feasibility Assessment — Graphical 2D ENSO's Last Stand

**Author:** Technical Director & Game Systems Architect
**Date:** 2026-10-22
**For:** Creative Director (approval) · cc Lead Game Designer, Developer, QA & Balance, Documentation & Lore
**Superseded on the engine choice (2026-10-24):** see [ENGINE_DECISION.md](ENGINE_DECISION.md). The project stays on its own Canvas renderer; Phaser is not adopted. The rest of this assessment stands.
**Status:** Assessment only. No code, data, dependencies or project structure were changed.
**Build reviewed:** `main` @ `14033bf` (merge of PR #4, 2026-10-22 18:35), which matches **BUILD_MANIFEST 2026-10-22.1** byte for byte (13/13 code hashes checked; 92/92 tests). **Re-checked against `main` @ `2ef13b2`** (PRs #5–#7: QA-3/4/5/6/7/9/10 fixes and the QA retest kit). `npm test`: **100/100 passed** on Node 22. Findings below reflect `2ef13b2`.

---

## 0. Bottom line

| Question | Short answer |
|---|---|
| Can the existing JS engine support a graphical 2D RPG? | **Yes.** The rules engine is headless, deterministic and data-driven. That is exactly the shape a graphical front end needs. What it lacks is an *interface* for graphics (structured events and actions) and a *spatial* layer, not better rules. |
| Can keyboard movement and active skill activation be integrated? | **Yes, with one caveat.** Keyboard movement during exploration and hotkey-driven skills in turn-based combat fit the engine with modest changes. **Real-time** skill combat does not: the combat core is built on rounds and would be redesigned in *any* engine. |
| Which systems can be reused unchanged? | Game data, effect registry, status pipeline, damage formula, progression/evolution, resources, seeded RNG, test suite, balance bot (§4.1). |
| Which need architectural changes? | Output events, input/action API, battlefield positions, world/exploration space, save/load surface, packaging (§4.2). Error recovery was fixed on `main` today (PR #6). |
| Is Phaser appropriate? | **Yes, it's the best fit** of the JS options for this game and this team (§6). |
| What would Godot require? | A full port of ~1,950 lines of rules and ~1,150 lines of tests to GDScript, new test/CI infrastructure, and a less agent-friendly workflow, while the rules are still changing weekly (§7). |
| Risks: stay vs migrate? | Staying risks are manageable engineering risks. Migration risks hit the project's two strongest assets: the verified rules and the multi-agent workflow (§8). |

**Recommendation: Direction A.** Keep the JavaScript engine. Add a Phaser front end with **real-time keyboard exploration and turn-based combat driven by hotkeys** (no typing). Do the engine-interface work first, then prove it with a one-room vertical slice before committing further. Revisit Godot only if the Creative Director chooses real-time action combat or one of the triggers in §9 occurs.

The single most important decision is not the engine. It is **how combat handles time** (turn-based, active-time or real-time, §5). That decision changes cost far more than JS vs Godot does.

---

## 1. What I reviewed

- **GitHub** `TokeloR-I/TEXT_RPG_Nameless` (canonical; the Project's `enso/` copy is the same code in an older folder layout).
- Code: `src/engine.js` (1,193 lines), `src/statuses.js` (353), `src/effects.js` (408), `src/data.js` (748), `ui/text-ui.js` (138), `tests/run-tests.js` (1,167), `tools/*`, `index.html`, CI workflow.
- Docs: `AGENTS.md`, `README.md`, `docs/GAME_DESIGN_STATUS.md`, `docs/REVIEW.md`, `docs/STATUS_ENGINE_REPORT.md`, `docs/design/*` (approved status design, QA response, dev handoff), `qa/QA_REPORT_2026-10-22_1.md`.
- Ran: test suite, hash check against the manifest, a JSON round-trip of `data.js`, and an engine session to inspect the event stream.

---

## 2. Current architecture

```
              ┌──────────────────────────── ENGINE (no DOM, no timers) ─────────────────────────────┐
 "attack 1" ─►│ input(text) ─► parser ─► combatCommand / handle ─► castSkill ─► effects registry    │
              │                                    │                      └─► statuses pipeline    │
              │   data.js (pure data, 54 KB) ◄─────┘   rng = mulberry32(seed)                       │
              │                                                                                     │
              │   say(text) ×176 ─► [{type:'text'}, {type:'clear'}]   getState() ─► snapshot        │
              └─────────────────────────────────────────────────────────────────────────────────────┘
                                │ events                          │ snapshot
                       ui/text-ui.js (typing effect, HUD)   tools/play-cli.js, tests, balance bot
```

### What is already right for a graphical game
| Strength | Evidence | Why it matters for graphics |
|---|---|---|
| Rules are UI-free | `engine.js` header; AGENTS.md §3 | A Phaser scene can host the engine as-is. No logic lives in the text UI. |
| Content is data | `data.js` is **100% JSON-serialisable** (verified round-trip) | Portable to any engine or tool, including Tiled properties or Godot resources. |
| Effects are a registry with hooks | `effects.js` (`beforeHit`, `afterCalc`, `onHit`, `apply`, `requires`) | New mechanics don't touch the combat loop. Animation hooks can attach at the same points. |
| One status pipeline | `statuses.js` `applyStatus()` | One place to emit "status applied/expired" visuals. |
| Seeded, reproducible | `mulberry32`, `engine.rng()` | Replays, bug repros and deterministic animation tests. |
| Synchronous resolution, event list out | `advance()` runs NPC turns until the player must act, then returns | Ideal for a "play the event queue, then wait for input" presentation (Darkest Dungeon / Slay the Spire style). The text UI already does exactly this with the typing effect. |
| Strong safety net | 100 tests incl. 300 random playthroughs, 200 skill-spam fights, balance bot, CI | Lets us refactor the interface without breaking rules. |

---

## 3. Gaps between this engine and a graphical game

| # | Gap | Evidence | Impact | Fix (scope) |
|---|---|---|---|---|
| **G1** | **Output is prose only.** The engine emits only `text` and `clear` events. Who hit whom, for how much, crits, deaths, summons and status changes exist only inside sentences. | 176 `say()` calls (134 engine, 32 effects, 10 statuses); session sample shows 2 event types | A sprite front end can't animate "Skeleton hits Ghoul for 7 (crit)" without parsing English. `getState()` diffs lose ordering. | Add **typed semantic events** that also carry their text line. Text UI keeps working unchanged. **Medium**, mechanical, testable headless. |
| **G2** | **Input is a text command parser.** `input('grave bolt 2')` is the only action API; targets are list positions (1..n) that shift when enemies die. | `combatCommand()`, `parseCombatInput()`, `pickTargets()` | Hotkeys and target cycling would have to synthesise strings. Index-based targets are fragile for a UI. | Add `engine.act({type, skill, targetId})` and `engine.getAvailableActions()`; make the text parser a thin translator onto it. Combatants already have stable ids. **Small–Medium.** |
| **G3** | **No spatial world.** Rooms are a graph with n/s/e/w exits and no coordinates; enemies and items are room-wide lists; fights start with `engage`. | `data.js` rooms; `move()`, `engage()` | Keyboard movement needs maps, collision, entity placement and triggers. | Front end owns space (tilemaps, collision); engine stays authoritative for rules and receives intents: `enterRoom`, `engage(group)`, `take(item)`. A small `world` data extension (map key, spawn points) per room. **Medium–Large**, mostly new front-end work. |
| **G4** | **No battlefield positions.** Several skills already assume them: Lockstep/Shield Charge (taunt in zone), Fortress, Total Lockdown, Shadowstep (teleport), Backstab vs [Flanked], traps "the next enemy to act" as a stand-in for "walks into it". | `data.js` L220–298; GAME_DESIGN_STATUS §8 Tier 3, Open question #2 | A graphical combat screen must place units somewhere. If placement affects rules, the **engine** must own it. | Depends on the design answer to ranks (§10, D2). If ranks: add `position` to combatants plus rank rules in the engine. **Medium**, design-dependent. |
| **G5** | **Time is rounds.** Turn order by speed per round; durations, resource regen, DoT ticks and Control Resistance recovery are all per round/turn (approved rule 11). | `newRound()`, `endRound()`, `tickStatusesEndOfRound()` | Perfect for turn-based or ATB. Incompatible with real-time combat without redesign (§5). | None for turn-based. ATB: add a time layer. Real-time: redesign. |
| **G6** | ~~Error recovery depends on typing `start`.~~ **Resolved on `main` (PR #6).** Every command is now a transaction: on an exception the engine restores a snapshot and returns control (QA-3); reaction recursion is bounded (QA-4); a stunned player's turn pauses for input instead of simulating on (QA-5). | `input()`, `snapshot()` / `restore()`, `awaitingContinue` | One residue: the QA-5 pause prompts "Type anything to continue." A graphical front end needs that as a structured "turn skipped" event it can auto-advance or show as a "Continue" button. | Covered by G1/G2 work. |
| **G7** | **No save/load surface yet.** Mostly unblocked by PR #6: game state is JSON-serialisable via `snapshot()` and the RNG exposes `getState()`/`setState()`. | `engine.js` `snapshot()`, `mulberry32` | Graphical sessions are longer; save/load becomes an expectation. | Expose public `serialize()` / `load()` on top of the existing snapshot, plus a save-format version number. **Small.** |
| **G8** | **"Double-click to play" breaks once there are image/audio files.** Browsers restrict pages opened from `file://`, and Phaser's own setup guide says to serve the game from a local web server for this reason. Also, `index.html` already pulls Tailwind from a CDN, so today's single file needs internet. | `index.html` L7; [Phaser dev environment docs](https://docs.phaser.io/phaser/getting-started/set-up-dev-environment) | Distribution story must be decided before art arrives. | Options: embed assets as data URIs in the single-file build (fine for a small game), host on itch.io/GitHub Pages, or wrap as a desktop app (Tauri/Electron). §6.3. |
| **G9** | **Code organisation.** IIFE modules on a global `ENSO`, loaded by `<script>` tags in order; no bundler. | `index.html`, every `src/` file | Fine for 5 files. A graphical front end will add 20–40 files (scenes, sprites, UI widgets, input maps). | Keep script tags for the engine; decide whether the front end may use ES modules + a bundler (a dev dependency → owner approval per AGENTS.md §7). |

Minor: `getState()` deep-clones traits and statuses via JSON on every call. Fine per event, wasteful per frame. Front ends should refresh on events, not every frame.

---

## 4. Reuse

### 4.1 Reusable unchanged
| System | Notes |
|---|---|
| `data.js` — classes, evolutions, skills, enemies, items, resource rules, status definitions, balance knobs | Add fields (sprite keys, map ids, positions); never restructure. |
| Effect registry (`effects.js`) | Hooks unchanged. Effects call `engine.say()` today; they'll also call the typed emitter (additive). |
| Status pipeline (`statuses.js`) | Unchanged for turn-based and for a hybrid that keeps rounds. |
| Damage formula, crits, armor, marks | `rollDamage()`, `markModifiers()`. |
| Progression: XP, levels, branch choice, stage unlocks, Hollow King | Branch selection needs a menu instead of typed text, but the rules don't change. |
| Combat loop: speed order, `advance()`, extra turns, skips, traps, delayed bombs | Unchanged for turn-based. |
| Seeded RNG, tests, fuzzers, balance bot, pending-decisions and backlog tools | These are the team's regression net during the front-end build. |

### 4.2 Needs architectural change
| Change | Size | Breaks existing tests? |
|---|---|---|
| Typed event stream (G1) | M | No, if text stays on each event |
| Structured action API + action list (G2) | S–M | No, parser routes through it |
| ~~Error recovery (G6 = QA-3/QA-5)~~ | Done (PR #6) | — |
| Public save/load on the existing snapshot (G7) | S | No |
| World/room → map integration (G3) | M–L | No, engine side is small |
| Battlefield positions/ranks (G4) | M | Possibly a few, design-dependent |
| Time model for ATB (only if Direction B) | M–L | Yes, touches approved rule 11 |

---

## 5. Turn-based, hybrid or real-time

"Active skill controls" can mean two very different things. This choice decides the cost more than the engine does.

| Engine system | Turn-based + keyboard exploration | Active-time (ATB) | Real-time action |
|---|---|---|---|
| Speed (SPD) | Turn order (as now) | Gauge fill rate | Move/attack speed |
| Durations (rule 11, round-based) | Unchanged | Re-expressed as actor turns or time units → **design re-approval** | Seconds → **redesign** |
| Resource regen per round | Unchanged | Per actor turn | Per second |
| DoT ticks at turn start | Unchanged | Unchanged | Per second |
| Haste / Freeze Time / Confuse / skip turn / rearrange turn order | Unchanged | Mostly works | **Chronomancer branch loses its meaning**; Illusionist and stuns need redesign |
| Traps "next enemy to act" | Positional rule possible | Same | Real hitboxes |
| Enemy AI (random attack) | Adequate for now | Adequate | Needs movement, aggro, pathing (far more work) |
| Balance bot and tests | Keep working | Need time-stepped harness | Largely rewritten |
| Engine reuse estimate | **~90%+ of rules** | ~75% | Data and progression only; combat core rewritten (~40%) |

**Reading the table:** turn-based combat with live exploration (Sea of Stars, Octopath, Darkest Dungeon) keeps everything the team has built and tested. ATB is a reasonable later upgrade. Real-time action combat is a different game whose combat would be rewritten in JS or in Godot alike. Hotkeys (1–6 for skills, Tab/arrows to cycle targets, Enter to confirm) deliver "active controls" without leaving turn-based.

---

## 6. JavaScript framework evaluation

### 6.1 Candidates
| Framework | What it is | Fit for ENSO |
|---|---|---|
| **Phaser 4** | Full 2D game framework: scenes, cameras, tilemaps (Tiled), arcade physics, keyboard/gamepad input, sprite animation, tweens, audio. v4.0.0 shipped in **April 2026** with a rebuilt WebGL renderer, keeping most of the v3 API ([announcement](https://github.com/phaserjs/phaser/discussions/7274)). | **Best fit.** Covers movement, collision, maps, animation and UI out of the box; the README already names it as the target. |
| Phaser 3 | Previous major; largest body of examples and tutorials. | Viable, but starting a new front end on the superseded major creates migration debt. Use only if a v4 spike hits a blocker. |
| PixiJS | Fast 2D renderer only. | We'd build scenes, input, physics and tilemaps ourselves. Not worth it. |
| Excalibur.js | TypeScript-first engine with tilemap and collision support. | Capable, smaller community and fewer examples, so weaker for AI-agent development. |
| KAPLAY | Lightweight, playful API. | Great for jams; thinner tooling for a long RPG. |
| three.js | 3D library (used for the earlier 3D prototype). | Wrong tool for 2D. |

**Why ecosystem size matters here:** this project is built mainly by AI agents working from text. The more documented examples a framework has, the more reliably agents write correct code for it. Phaser leads the JS field on that measure. Phaser 4 is new, so agents may default to v3 patterns; the Dev agent should pin v4 and use the official migration guide.

### 6.2 How Phaser would host the engine
```
Phaser game
├─ ExploreScene   tilemap + player sprite (WASD/arrows) + enemy/item sprites
│                 collisions → engine.enterRoom / engine.take / engine.engage
├─ CombatScene    ranks/slots, sprites, HP bars; hotkeys → engine.act(...)
│                 plays engine events in order: animate → wait → next
├─ UI scenes      class select, branch select, inventory, evolution tree
└─ EventPlayer    maps typed events → animations / sfx / floating numbers / log line
ENSO engine       unchanged rules; typed events + action API added
```
The engine stays the single authority. Phaser only shows and asks.

### 6.3 Distribution options (needs a decision, D5)
| Option | Double-click? | Cost |
|---|---|---|
| Single HTML with assets embedded as data URIs (extend `build-single.js`) | Yes | Works for a small art budget; file grows with art. No new dependency. |
| Hosted (itch.io / GitHub Pages) | Link, not file | Free, simplest for playtesters. |
| Desktop wrapper (Tauri or Electron) | Yes, real app | New build dependency and toolchain. Electron bundles Chromium (large); Tauri is smaller but needs a Rust toolchain in CI. |

---

## 7. What migrating to Godot would require

Godot is a strong 2D engine. The current line is **4.7** (released June 2026; 4.7.2 maintenance on 18 Aug 2026, [OpenSourceForU](https://www.opensourceforu.com/2026/08/godot-4-7-2-released/)). It brings a scene editor, TileMap layers, AnimationPlayer, physics bodies and native desktop exports, which suits the Creative Director's preference for a double-click app.

**Work required:**
1. **Port the rules:** ~1,950 lines (`engine.js` + `statuses.js` + `effects.js`) to GDScript. Data is already JSON-safe, so `data.js` → JSON is the easy part.
2. **Rebuild the safety net:** 100 tests, two fuzz suites, balance bot, pending-decisions and backlog tools, using a Godot test add-on and `godot --headless` in CI. Until this exists, every ported rule is unverified.
3. **Prove parity:** run old and new engines side by side on seeded scenarios. Godot's RNG differs from `mulberry32`, so seeded repros in QA reports stop matching unless mulberry32 is ported too.
4. **Change the workflow:** scene (`.tscn`) and resource files are editor-centric. Chat-based agents can write them, but less reliably than plain code, and can't run the editor. Visual work shifts toward a human with Godot open.
5. **Choose the language carefully:** C# is attractive, but **Godot 4 C# projects still can't be exported to the web officially**; as of April 2026 there was no maintainer timeline ([Godot Forum](https://forum.godotengine.org/t/is-there-an-update-on-exporting-c-projects-to-web/128821)). Browser builds would require GDScript.
6. **Keeping the JS engine inside Godot** (embedding a JS runtime via an extension) is technically possible but exotic and fragile. Not recommended.

**Timing problem:** the rules are a moving target. Six engine files changed on `main` on the day of this review alone; QA-1, QA-2 and QA-8 await design decisions, and there are 12 open design questions and a set of `null` pending status values. A port now means porting twice, or freezing design work during the port.

**When Godot would be the right call** is in §9.

*(Unity was also considered: heavier editor, C#-only, more than this 2D project needs. Not recommended.)*

---

## 8. Risk comparison

| Risk | Continue in JS (Phaser) | Migrate (Godot) |
|---|---|---|
| Losing verified rules | Low: engine untouched, tests keep running | **High:** every rule re-implemented, parity must be re-proven |
| Schedule | Front end is new work either way | Port + new front end; design changes stall during the port |
| Tooling | No visual editor; use **Tiled** for maps (Phaser loads Tiled JSON) | Excellent editor and animation tools |
| Multi-agent workflow | Plain-text JS; agents read, write and test everything headless | Editor-centric scenes; agents less effective; more human editor time |
| Distribution | Needs a decision (§6.3); desktop app needs a wrapper | Native exports built in; web export fine with GDScript |
| Performance | Ample for a 2D turn-based RPG | Ample |
| Framework churn | Phaser 4 is six months old; examples skew to v3 | Godot minor releases are frequent but stable |
| Code organisation | Must introduce structure for 20–40 front-end files (G9) | Engine enforces scene/node structure |
| Real-time action later | Possible in Phaser, but tooling is weaker | Stronger fit |

---

## 9. Technical directions

Relative complexity uses the current engine (rules + tests, ~3,100 lines) as **1 unit**. Rough order of magnitude only; art production is excluded because it costs the same in every direction and is probably the largest real cost.

### Direction A — Keep the engine, Phaser front end, live exploration + turn-based combat ✅ recommended
- **What changes:** typed events, action API, public save/load (engine prep; error recovery is already done); then Phaser scenes for exploration and combat; ranks if approved.
- **Advantages:** ~90%+ of the rules reused; all 100 tests stay valid; design work continues in parallel; agents stay effective; the prep work is useful in every direction, including a later Godot port (the event contract becomes the port spec).
- **Disadvantages:** no visual editor (Tiled fills the map gap); distribution needs a choice; Phaser 4 is young.
- **Complexity:** engine prep **~0.2** · front end **~1–1.5** · total **Medium**.

### Direction B — Direction A plus active-time combat (ATB)
- **What changes:** everything in A, then a time layer in the engine (`tick(dt)`, action gauges driven by SPD), with durations and regen re-expressed per actor turn.
- **Advantages:** livelier combat with real-time pressure, still deterministic and testable; same stack.
- **Disadvantages:** reopens approved rule 11 (round-based durations), which QA-1 shows is already sensitive to speed; balance bot and some tests need a time-stepped harness; Chronomancer skills need re-reading.
- **Complexity:** A **+ ~0.4–0.6**, plus design re-approval · **Medium–Large**. Best done *after* A ships a playable slice, as an upgrade.

### Direction C — Migrate to Godot 4 (GDScript)
- **What changes:** port rules, tests and tools; build the front end in Godot scenes; data moves to JSON resources.
- **Advantages:** best 2D tooling and animation; native desktop exports; strongest base if combat becomes real-time action.
- **Disadvantages:** re-implementation risk; months without a regression net equal to today's; design work stalls or gets ported twice; agent workflow degrades; C# can't target the browser officially.
- **Complexity:** port **~1** · test/CI rebuild **~0.3–0.5** · front end **~0.8–1.2** · total **Large–Extra Large**.

**Triggers to re-evaluate Direction C:** the Creative Director chooses real-time action combat; the project gains a human developer who works in Godot; console release becomes a goal; or the Phaser vertical slice (Phase 2 below) exposes a blocking problem.

---

## 10. Recommendation and phased plan

**Adopt Direction A**, gated so nothing large is committed before it's proven. Nothing below starts without the Creative Director's approval.

| Phase | Goal | Contents | Gate to next phase |
|---|---|---|---|
| **0. Stabilise** ✅ *done on `main` (PRs #6, #7)* | Engine can't soft-lock | QA-3, QA-4, QA-5 fixes with regression tests | QA retest of repros C/D/E (QA's `qa/scripts/retest.js`) |
| **1. Engine interface** *(no new dependencies)* | Engine speaks "graphics" | Typed event contract (spec written by me, reviewed by Dev and QA); `act()` + `getAvailableActions()`; id-based targets; "turn skipped" as an event; public `serialize()`/`load()`; text UI and CLI rebuilt on top. All headless | 100+ tests green; text game plays identically; event-contract tests added |
| **2. Vertical slice** *(needs Phaser approval)* | Prove the stack | One room from Tiled, WASD movement, collision, touch an enemy group → combat scene, sprites in slots, skills on 1–6, target cycling, event-driven animations, victory back to the room. Placeholder CC0 art | Creative Director plays it and approves the feel; QA test pass |
| **3. Production front end** | Full dungeon | All rooms, menus (class, branch, inventory, evolution tree), HUD, save/load, packaging per D5 | Per-milestone QA |
| **4. Optional: ATB** | Direction B | Only if approved after playing Phase 3 | Design re-approval of rule 11 |

Phase 1 is worth doing even if Direction C is chosen later: the event contract and action API are the clearest possible specification for a port.

---

## 11. Decisions requested from the Creative Director

1. **D1 — Combat time model:** turn-based with hotkeys (recommended) · ATB later · real-time action. *Biggest single cost driver.*
2. **D2 — Battlefield ranks** (Darkest Dungeon-style slots): yes/no. Already Open Question #2; graphics now force it. *Lead Designer owns the rules.*
3. **D3 — Perspective:** side-view combat (README's original intent) and top-down exploration, or one view throughout.
4. **D4 — Phaser 4 as a dependency** (vendored file, no npm runtime dependency), per AGENTS.md §7.
5. **D5 — Distribution:** single file with embedded assets, hosted web build, or desktop app wrapper.
6. **D6 — Art source for the slice:** CC0 placeholder packs vs commissioned or self-made art.
7. **D7 — Governance:** add the Technical Director to the AGENTS.md ownership table, owning `architecture/`, with no write access to `src/` or `docs/design/`. (I've written this file there on your instruction; the table doesn't list the role yet.)

---

## 12. Coordination notes (no ownership changes)

- **Lead Game Designer:** D1 and D2 are gameplay decisions; I've only described their technical consequences. QA-1 (speed-sensitive statuses) interacts with D1 if ATB is ever chosen.
- **Developer:** nothing to implement yet. Phase 0 is done (PRs #6, #7); the transaction/snapshot design there is exactly what save/load and a graphical front end need. If Phase 1 is approved, I'll write the event-contract and action-API spec first.
- **QA & Balance:** Phase 1 adds a new test surface (event-contract tests). Graphical phases will need a visual QA checklist; the seeded engine means bugs stay reproducible from the CLI even after graphics land.
- **Documentation & Lore:** `GAME_DESIGN_STATUS.md` says a side-scroller "can reuse [the engine] unchanged". That's true of the rules but not of the interface (G1, G2). Worth correcting when docs are next updated.

---

## Appendix A — Incidental findings
- `index.html` loads Tailwind from `cdn.tailwindcss.com`, so the "self-contained" single-file build needs internet. Unrelated to graphics; flagging for the Developer.
- The Project copy (`enso/…`) predates the GitHub layout (`docs/`, `qa/`, `AGENTS.md`); the code is identical. GitHub should be treated as canonical.

## Appendix B — Sources
- [Phaser v4.0.0 release announcement (GitHub discussion)](https://github.com/phaserjs/phaser/discussions/7274)
- [Phaser docs — set up a dev environment (local web server requirement)](https://docs.phaser.io/phaser/getting-started/set-up-dev-environment)
- [Godot 4.7.2 released — OpenSourceForU, Aug 2026](https://www.opensourceforu.com/2026/08/godot-4-7-2-released/)
- [Godot Forum — status of C# web export (thread through Apr 2026)](https://forum.godotengine.org/t/is-there-an-update-on-exporting-c-projects-to-web/128821)
- [Godot 4.6 release page](https://godotengine.org/releases/4.6/)
