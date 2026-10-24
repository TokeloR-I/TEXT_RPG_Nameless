# UI decisions log (Pixie, UI/UX)

One entry per change to an existing screen: what was kept, what was replaced, and why.

## 2026-10-24 · Battle screen rebuilt on a shared UI kit (UI-1)

**Kept**
- The battle's rules path: menus still come only from `engine.getAvailableActions()` through
  `ui/battle-menu.js`, choices still go back through `engine.act()`. Nothing in the UI decides what is usable.
- Wren's GFX-2 battle sprite (`drawActor`) and GFX-4 effects (`ui/combat-fx.js`): units keep `data-unit-id`,
  and the effects overlay finds them exactly as before.
- Sable's accessibility rules for the battle menu: disabled entries stay selectable so their reason can be read,
  and selection is shown by a cursor and a border, not colour alone.
- Every other screen. The creator and dialogue are Sable's (#97, #114) and were not touched, apart from one
  CSS line (below).

**Replaced**
- *Full-screen box → battlefield.* The fight now plays on the dimmed map (Chrono Trigger's "no jarring
  transition"): foes on the right on name plates, you on the left at the creatures' pixel scale, then a message
  window, then status and command windows. Before, a 40 %-of-screen text log was the main element and the
  player sprite was 28 px tall in a corner.
- *Two-line menu entries → one line plus a help line.* Each entry's detail (cost, damage, or the engine's
  refusal reason) shows in one help line for the highlighted entry (FF-style). Four entries now take four lines.
- *Grey text tags → status chips* with a category glyph, colour, stacks and rounds left.
- *Flat bars → segmented bars* with HP tone at 50 % / 25 % and a drain trail after a hit.
- *Always-at-bottom log → message window that starts at what just happened.* The collapsed window scrolls to
  the first line of the latest action, so your own result is never pushed out by the enemy turns that follow.
  `L` (or a click) opens the whole log.
- *Ad-hoc colours → palette tokens* at the top of `world.css`. Old variable names remain as aliases.

**Fixed along the way**
- The map's name banner showed through the battle heading ("HOMESTEAD GROUNDS" over "ROUND 1").
- Title screen: "Who wakes in the cellar?" used the in-world `.prompt` class, so it was pinned to the bottom
  of the screen, away from the name field. One CSS rule undoes the absolute placement on the title screen.

**Needs Wren (proposed, not done)**
- `getState().combat.order`: the living units in acting order, as ids (`'player'`, `'enemy_0'`, …), so the
  battle can show a turn-order strip without reading the log.
- Structured battle events (Phase 1 PR-3) so the log can be styled from data instead of matching text.

## 2026-10-24 · Whole-pixel scaling and the phone layout (UI-2)

**Kept**
- The 640×448 canvas and every renderer layer, on desktop and tablet.

**Replaced**
- *Stretch to 1120 px → fitted stage.* The stage was 100 % of a shell capped at 1120 px, so the canvas ran at
  1.75× on most screens with uneven pixels. `fitStage()` now sizes it from the window with `ENSO.display.fit`
  (Auto / Pixel-perfect / Fill, a per-browser preference in the pause menu).
- *Stage border → outline,* so the border no longer eats 4 px of the canvas area and breaks whole-number scales.
- *Landscape box on a phone → portrait stage.* On a portrait phone the canvas is 384 px wide and as tall as fits,
  instead of a 280 px-tall strip with the battle squeezed over it.

**Renderer touch (for Wren)**
- `ui/world-render.js` `draw()`: when the canvas size changes, the darkness layer is resized to match and image
  smoothing is switched off again (resizing a canvas resets its context). One line; nothing else in the
  renderer changed. The renderer already read the canvas size every frame.

## 2026-10-24 · Turn-order strip and lettered twins (UI-8)

**Added**
- A turn-order strip in the battle header from Wren's `engine.getTurnOrder()` (#118): the rest of this round
  (the one acting now highlighted), then the next round. Each entry has a side glyph (◇ you, ✦ ally, ✕ foe) as
  well as a frame colour, and the unit being aimed at is outlined in the strip too.
- Twins are lettered: two "Rust Rat"s become "Rust Rat A" and "Rust Rat B" on their plates, in the strip and in
  the target menu, so "which rat" is never a guess. A letter sticks for the whole fight.

**Kept**
- The log still prints the engine's "Battle Order" text; the strip is the at-a-glance version.

## 2026-10-24 · Main menu with Items, Equipment and Settings (UI-3 / UI-6)

**Replaced**
- *One long pause scroll → tabbed main menu.* Esc opens tabs on the left (Status, Items, Equipment, Journal,
  Settings, then Save and Quit set apart) and the tab's page on the right. Moving through the tabs previews each
  page; Enter or → goes into its list; Esc or ← comes back. PageUp/PageDown scroll a long page (the journal).
- *"Use Roadworn Blade · Heals undefined" → a Use list of consumables.* The old menu offered every item that has
  a definition, including gear and materials. The Use list now shows only the engine's `use_item` options for
  items that have a `use`, with the engine's reason when one can't be used (e.g. full health). Everything else is
  listed under Carrying.
- *No equipment screen → Equipment tab* on Wren's `getEquipment()` (#118): each slot, what fits it, and a stat
  comparison for the highlighted choice (▲/▼ plus colour, never colour alone). It sends the engine's `equip` and
  `unequip` actions.
- *Seed and controls in the main scroll → Settings tab,* with Display (UI-2) and a controls list.

**Kept**
- The evolution (branch) choice keeps its own panel; it now uses the same window frame.

**For Wren**
- `getAvailableActions()` in exploration lists `use_item` as *enabled* for items without a `use` (gear,
  Wild Herbs), and `act()` then does nothing. The menu no longer offers them, but the engine probably should
  report them as disabled (e.g. `NOT_USABLE`) so every front end agrees.

## Crow tab, Black Flight and the Motion setting (Vaelis's Nahemoth design)
Source: `docs/design/ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md` (UI handoff: crow conversation portrait,
Black Flight destination list, optional feather transition, reduced motion, keyboard focus). Engine side is Wren's
#126 (anchors, refusals, `WorldSession.blackFlight`, `talk_crow`).

**Changed**
- *New Crow tab* in the main menu, shown only when the engine offers `talk_crow` or `black_flight` (so it does not
  exist before the seal opens). It lists "Talk to the crow" and every attuned anchor in the engine's order, with the
  one you are at first and marked ◆. Refused destinations stay in the list, disabled, with the engine's reason
  ("The crow cannot reach that perch yet"). View model: `ui/crow-view.js`.
- *Fly needs a confirm step* ("Fly to X (Region)?" → Fly / Stay), per the design's "confirm or cancel before moving".
- *Feather transition:* dark feather shapes rise for 0.7 s, then the normal map fade. With reduced motion it is
  just the fade. Input is held during it.
- *Speaker portraits:* the dialogue window shows a 16×16 pixel portrait (3×, palette tokens) when the speaker has
  one. The crow is the first; no overworld crow sprite, as the design asks.
- *Settings → Motion* (Follow system / Reduced / Full), saved per browser. It drives `body.reduce-motion`, which
  replaces the old `prefers-reduced-motion` media query, and the fades, flashes and feathers in `world-ui.js`.

**Not yet**
- Combat FX (screen shake, damage pop) do not follow the Motion setting yet.
- No pursuit or forced-scene refusal codes exist in the engine yet; the UI already has words for `PURSUED` and
  `STORY_SCENE` and shows the engine's own message first.

## HD-2D pass, UI lane (Tokelo's HD-2D brief; Wren owns the renderer, lighting, tiles, sprites and effects)
References: Octopath Traveler and Sea of Stars battle and town shots (owner-supplied).

**Changed**
- *Battle HUD sits on the scene*, with no boxes over the field. The turn bar runs along the top: the unit acting now
  is in a big diamond with its face, and the rest of the queue rides a gold line, with "Next" marking the next round.
  The latest action shows as a small banner, and the whole log is still on L. Foes get slim name and gauge tags.
  Your HP and resource sit on a fading strip at bottom left, and the command window is at bottom right.
- *Gauges* are slim bars with a lit edge: HP green, resource blue, foes red. They keep the tone shift and the
  drain trail.
- *Battle camera:* the scene and field lean in on the foes while you pick a target, and on you during an enemy turn.
  It is a CSS transform on the stage, off with reduced motion.
- *Faces* in the turn bar come from `ENSO.sprites.drawPortrait` once Wren ships it. Until then they are a crop of the
  walking sprite, or the creature.
- *Pixel 9-slice frame* (12×12 art, drawn at 2×) on every window: battle, dialogue, menus, HUD, prompt and toast.
- *Pixel font:* DotGothic16 (SIL OFL, `assets/fonts/`). Pixelify Sans was tried and dropped: its 5/S, B/8 and fi
  glyphs misread at UI sizes. It has a single weight, so fake bold is off (`font-synthesis: none`). The
  single-file build inlines the font.

## Compact exploration HUD (HD-2D pass, on Wren's lit scenes from #132)
- *The boxed HUD panel became an unboxed strip.* Top left holds your face in a diamond, your name, level and place,
  and slim HP and resource gauges. Top right holds the quest tracker. Each sits on a fading dark gradient with
  outlined text, so it stays readable over lit or dark scenes and covers less of the map.

## UI-2 revision: 480×270 stage (Keel's engine decision rev 2, #146)
- *Stage base 640×448 → 480×270* (16:9, 30×17 tiles of 16 px) in `ui/display.js`, `world.html` and the stage's aspect
  ratio. Whole-number scaling still applies: full-screen 1080p is exactly ×4, 1440p is ×5, and a browser window
  that ×N would leave mostly empty fills instead (auto mode, unchanged rule).
- *Portrait phones:* the canvas column is 288 px wide (18 tiles of 16 px), replacing 384.
- *UI sizes:* HUD, prompt, banner, dialogue, menus and battle text no longer stop growing at 15–20 px. They now scale
  with the stage (a minimum only), so ×4 at 1080p reads at the same proportion as ×2.
- *Battle on 16:9:* the stage is shorter for its width, so battle text drops to 1.45cqw, the field ends higher, the
  help line is one line, and the command window still shows all four root commands.
- The Black Flight effects overlay follows the canvas size instead of a fixed 640×448.
