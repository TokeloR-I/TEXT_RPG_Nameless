# Engine decision (Keel)

## Revision 2 — 2026-10-24 (afternoon): the target look

**Asked by:** Tokelo, with a Sea of Stars–style reference image: "the game does not look like how I want it…
I feel the engine is slowing us down."

**Status:** Decided by Keel at the owner's request. It replaces the "Rules that follow from this" stage numbers
below (640×448 at 32 px) and adds the asset pipeline. The engine choice itself stands.

### Verdict: the gap is the art, not the engine

I captured the current game on `main` (`70b4ecb`) and compared it with the reference.

| What makes the reference look the way it does | Where it comes from | Do we have it? |
|---|---|---|
| Hand-painted pixel art: rock faces, roof tiles, foliage clusters, hue-shifted shading | **Artists, in an image editor** | No. Every tile, prop and foe is drawn by JS code (`fillRect`, `arc`) in `ui/tiles-hd.js`, `ui/world-render.js`, `ui/battle-hd.js`. The repo has **no image tiles at all** |
| Height: cliffs, stairs, multi-storey buildings, ledges over ledges | **Level design** on several map layers | No. Maps are one flat grid with one overhang rule |
| Characters about two tiles tall, with faces and clear silhouettes | **Art scale**: 16 px tiles, ~24×32 px characters | No. Our 24×32 characters stand on **32 px** tiles, so they are one tile tall and look tiny |
| Warm light, bloom, glow, grading | **Renderer** | **Yes.** `ui/postfx.js` (WebGL bloom, coloured point lights, grading) already does this |

Sea of Stars ships on Unity, and none of the first three rows come from Unity. Phaser, PixiJS or Godot would
draw our current procedural tiles exactly as flat as they look now. **Switching engines changes nothing on
screen until real art exists, and costs weeks.** What has been slowing us down is that every visual has to be
written as code. That is a pipeline problem, and we fix it here.

### Decision

1. **Engine: unchanged.** Custom JS rules engine, Canvas 2D world drawn into the WebGL post-processing
   compositor, DOM UI. No Phaser, PixiJS or Godot.
2. **Art becomes image files, not code.** Tiles, props, characters, foes and battle backdrops are authored PNG
   sprite sheets and tile atlases. Procedural painters stay only as fallbacks, one tile name at a time, and are
   deleted as art replaces them.
3. **Maps are made in [Tiled](https://www.mapeditor.org/)** (free, JSON output, the most widely documented
   tile editor, and what Phaser and Godot can also import if we ever move). Layers: `ground`, `detail`,
   `walls` (cliffs, building fronts), `overhead` (drawn over the player: roofs, canopies, cliff lips),
   `collision`, and an `objects` layer for NPCs, doors, triggers and lights. A loader turns a Tiled map into
   today's `src/world` format, so `validateWorld`, the engine and the tests don't change.
4. **New art scale:** **16×16 px tiles**, characters stay **24×32 px** (two tiles tall, like the reference).
   The stage becomes **480×270** (16:9, 30×17 tiles), scaled by whole numbers only: ×4 at 1920×1080, ×2 at
   960×540. A converter turns each existing 32 px map cell into 2×2 cells, so story and quest coordinates
   double automatically.
5. **Assets are packed into JS.** I tested it: Chrome treats a PNG opened from `file://` as another origin,
   and both `getImageData` and the WebGL upload in `ui/postfx.js` throw `SecurityError`. So
   `tools/pack-assets.js` turns `assets/src/**/*.png` (plus Tiled `.json`) into `assets/packed/*.js` with data
   URIs, the same way `assets/sprites/*.js` and the Black Flight atlas already work. Double-click play and the
   HD pipeline both keep working, and `npm run build` keeps making one file.

### Plan to reach the look

| Step | What | Who | Gate |
|---|---|---|---|
| **P0 Pipeline** | `pack-assets.js`; Tiled loader + tests; renderer draws atlas tiles by layer with fallback to painters; stage 480×270 at 16 px; 32→16 map converter | Wren (Pixie for the 480×270 HUD/UI scale, UI-2) | `npm test` green; current maps look the same through the new path |
| **P1 One-screen slice** | Shamefield square rebuilt in Tiled with real art and height (a raised terrace, stairs, a building front with overhead roof); player and two villagers at 24×32 in the same style | Art source (decision below) + Wren | Side-by-side capture against the reference; **Tokelo approves the look** |
| **P2 Chapter 1 rollout** | Remaining maps, interiors, foes and painted battle backdrops; delete procedural painters as each is replaced | Same | Per-map capture review |
| **P3 Polish** | Animated tiles (water, torches), more light sources, weather; timed-hit feedback in battle | Wren, Pixie | — |

P0 is engine work and starts now. P1 cannot reach the reference without art of that standard, so **the real
decision is the art source**: licensed commercial pixel-art packs (fastest; must allow commercial use and
editing), a commissioned human pixel artist (best fit, slowest, costs most), or AI agents drawing the art
(cheapest, and in my judgement won't reach the reference). Tokelo decides this.

### When to revisit the engine

Unchanged from below, with one addition: if a **human artist or level designer** joins and wants to work in
Godot's editor, a port becomes worth its cost, because the Tiled maps, PNG atlases and the Phase 1 engine
interface would all carry over.

---

## Revision 1 — 2026-10-24 (morning): stay custom

**Status:** Decided by Keel at the owner's request (Tokelo, 2026-10-24). Merging this file makes it the
project's engine of record. It settles D4 from `TECHNICAL_FEASIBILITY.md` §11 and confirms R2 in
`TECH_REVIEW_2026-10-23.md`.

### Decision

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

### Why

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

### What we give up, and how we cover it

A framework would hand us these. Each is small enough to build in place, and most are already planned.

| Framework feature | Our version | Plan step |
|---|---|---|
| Scale manager | Integer scaling of the 640×448 stage, plus a portrait phone layout | UI-2 |
| Gamepad input | Gamepad API mapped onto the existing keys | UI-7 |
| Tweens | CSS transitions for UI; timed steps in `STYLE.durations` for canvas effects | done (GFX-4) |
| Audio | A thin Web Audio wrapper (`ui/audio.js`), when sound arrives | not yet planned |
| Tiled maps | Maps stay JS data checked by `validateWorld`; a Tiled importer is a tool, not a runtime dependency | only if needed |

### Rules that follow from this

- **Canvas draws the world, sprites and effects. The DOM draws windows, menus, HUD and text.** Don't render
  menu text into the canvas, and don't paint world tiles in the DOM.
- **Pixel rules** (stage size superseded by Revision 2: 480×270 at 16 px): the stage's internal resolution was 640×448 (20×14 tiles of 32 px). Scale by whole
  multiples only, `imageSmoothingEnabled = false` on every context, `image-rendering: pixelated` on every
  scaled canvas, and snap positions to whole pixels.
- **Assets work offline from disk.** Art follows the pattern in `docs/SPRITES.md`. Fonts and any other
  files are bundled in the repo, never loaded from a CDN, and must survive `npm run build`.
- **The UI never reaches into engine state.** It reads `getState()` and `getAvailableActions()`, sends
  `act()`, plays presentation events, and draws on the canvas only through `renderer.addHook()`. When the UI
  needs something new, propose the hook and agree it with Wren (for example `combat.order` for UI-8).
- **A new library needs the owner's OK** (AGENTS.md §7), even a small one. Vendored files count.

### When to revisit

Reopen this decision only if one of these happens:

1. Design chooses **real-time action combat**. Then compare Godot 4 (GDScript) against staying in JS.
2. **Console release** becomes a goal. Desktop alone doesn't count: Tauri or Electron can wrap the current game.
3. A **human developer who works in Godot** joins the team.
4. **Canvas 2D runs out of speed**: the world frame takes more than 16 ms on a mid-range laptop and profiling
   can't fix it. The first step then is PixiJS (WebGL) for the world layer only, keeping the DOM UI and the
   engine. It would not be a full engine switch.

### Follow-ups (not done here)

- `README.md` line 7 still says "a Phaser side-scroller later". It should say the game uses its own Canvas
  renderer (Wren's file).
- `TECHNICAL_FEASIBILITY.md` §6 and §9 still describe Phaser as the plan. That history is kept as written,
  with this file taking precedence.
