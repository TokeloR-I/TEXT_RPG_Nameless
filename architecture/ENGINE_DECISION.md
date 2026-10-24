# Engine decision: stay custom (Keel, 2026-10-24)

**Status:** Decided by Keel at the owner's request (Tokelo, 2026-10-24). Merging this file makes it the
project's engine of record. It settles D4 from `TECHNICAL_FEASIBILITY.md` §11 and confirms R2 in
`TECH_REVIEW_2026-10-23.md`.

## Decision

The Nameless RPG stays on its **own engine**. No third-party game engine or framework.

| Layer | Technology | Where | Owner |
|---|---|---|---|
| Rules | ENSO headless engine: plain JS, no DOM, seeded RNG | `src/engine.js`, `src/engine/*.js`, `src/*.js` | Wren |
| World space | Maps, collision, movement, transitions | `src/world/` | Wren |
| World and sprite rendering | Vanilla **HTML5 Canvas 2D**, nearest-neighbour | `ui/world-render.js`, `ui/sprites.js` | Wren |
| Combat effects | Canvas 2D overlay driven by presentation events | `ui/combat-fx.js` | Wren |
| Menus, HUD, battle commands, dialogue, text | **DOM + CSS** on Pixie's UI kit | `ui/`, `style.css`, `world.css` | Pixie |
| Delivery | Plain `<script>` tags, no bundler, no npm runtime dependencies; `npm run build` makes the single-file game | `world.html`, `tools/build-single.js` | Wren |

**Not adopted:** Phaser (3 or 4), PixiJS, Excalibur, Godot, Unity.

This replaces the Phaser part of Direction A in `TECHNICAL_FEASIBILITY.md`. The rest of Direction A stands:
keep the JS rules engine, live exploration, turn-based combat on hotkeys.

## Why

1. **The custom renderer already does the job a framework would.** GFX-1 to GFX-4 (#107, #108, #111, #112)
   shipped layered sprite sheets with palettes, one-shot animations, depth ordering, foreground overhangs,
   coloured flickering lights, deterministic particles, render hooks and event-driven combat effects, in about
   1,250 lines with tests. Switching to Phaser now means rewriting that work to get roughly the same result.
2. **The game doesn't need what an engine is best at.** It is top-down, grid-based, turn-based. There is no
   physics, no real-time combat and no large scene graph. A framework's physics, cameras and scene manager
   would go unused.
3. **The UI is better in the DOM.** Menus, equipment comparison, dialogue and settings are mostly text and
   lists. The DOM gives text layout, focus, keyboard navigation, screen readers and responsive layout for
   free. In a canvas engine Pixie would have to rebuild all of that by hand.
4. **It keeps the project's rules.** AGENTS.md §7: no npm dependencies without the owner's OK, and the game
   stays double-click playable. Today the single-file build opens from disk with no server and no internet.
5. **Agents stay effective.** Plain JS and Canvas 2D are the best-documented web APIs there are. Every agent
   on the team (Claude, ChatGPT, Gemini) writes them reliably, and the headless tests cover the pipeline.
   Godot's editor-centric scene files and a second language would cut that, as `TECHNICAL_FEASIBILITY.md`
   §7 found.

## What we give up, and how we cover it

A framework would hand us these. Each is small enough to build in place, and most are already planned.

| Framework feature | Our version | Plan step |
|---|---|---|
| Scale manager | Integer scaling of the 640×448 stage, plus a portrait phone layout | UI-2 |
| Gamepad input | Gamepad API mapped onto the existing keys | UI-7 |
| Tweens | CSS transitions for UI; timed steps in `STYLE.durations` for canvas effects | done (GFX-4) |
| Audio | A thin Web Audio wrapper (`ui/audio.js`), when sound arrives | not yet planned |
| Tiled maps | Maps stay JS data checked by `validateWorld`; a Tiled importer is a tool, not a runtime dependency | only if needed |

## Rules that follow from this

- **Canvas draws the world, sprites and effects. The DOM draws windows, menus, HUD and text.** Don't render
  menu text into the canvas, and don't paint world tiles in the DOM.
- **Pixel rules:** the stage's internal resolution is 640×448 (20×14 tiles of 32 px). Scale by whole
  multiples only, `imageSmoothingEnabled = false` on every context, `image-rendering: pixelated` on every
  scaled canvas, and snap positions to whole pixels.
- **Assets work offline from disk.** Art follows the pattern in `docs/SPRITES.md`. Fonts and any other
  files are bundled in the repo, never loaded from a CDN, and must survive `npm run build`.
- **The UI never reaches into engine state.** It reads `getState()` and `getAvailableActions()`, sends
  `act()`, plays presentation events, and draws on the canvas only through `renderer.addHook()`. When the UI
  needs something new, propose the hook and agree it with Wren (for example `combat.order` for UI-8).
- **A new library needs the owner's OK** (AGENTS.md §7), even a small one. Vendored files count.

## When to revisit

Reopen this decision only if one of these happens:

1. Design chooses **real-time action combat**. Then compare Godot 4 (GDScript) against staying in JS.
2. **Console release** becomes a goal. Desktop alone doesn't count: Tauri or Electron can wrap the current game.
3. A **human developer who works in Godot** joins the team.
4. **Canvas 2D runs out of speed**: the world frame takes more than 16 ms on a mid-range laptop and profiling
   can't fix it. The first step then is PixiJS (WebGL) for the world layer only, keeping the DOM UI and the
   engine. It would not be a full engine switch.

## Follow-ups (not done here)

- `README.md` line 7 still says "a Phaser side-scroller later". It should say the game uses its own Canvas
  renderer (Wren's file).
- `TECHNICAL_FEASIBILITY.md` §6 and §9 still describe Phaser as the plan. That history is kept as written,
  with this file taking precedence.
