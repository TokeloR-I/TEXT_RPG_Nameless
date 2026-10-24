# UI/UX audit and overhaul plan (Pixie, 2026-10-24)

Audit of the graphical game (`world.html`) on `main` after GFX-1…4 (#106) and Sable's creator work,
played in Chromium at 1920×1080, 1280×900 and 420×800. Captures: `docs/captures/ui1/`.

## What works
- A clean separation that makes UI work safe: menus come from the engine's availability list, and effects
  come from presentation events. The UI can be rebuilt without touching rules.
- Keyboard flow is consistent (arrows, Enter, Esc) and held keys never leak across panels.
- Accessibility basics are there: refusal reasons are readable, selection is not colour-only, and
  reduced motion is respected.
- The renderer (GFX-3) gives each map lighting and atmosphere worth showing off.

## Findings, by severity

| # | Screen | Finding | Severity |
|---|---|---|---|
| 1 | Battle | The fight was a text log in a box: the log took ~40 % of the screen and repeated what bars should show. The player sprite was 28 px tall in a corner; foes sat in empty cards | High |
| 2 | Battle | Every menu entry was two lines (label + detail), so four commands took eight lines | High |
| 3 | Battle | Status effects were grey text tags: no category, no colour, no glyph | High |
| 4 | Battle | The map's name banner showed through the battle heading | Bug |
| 5 | Battle | Your own action's result scrolled out of the log behind the enemy turns that followed | High |
| 6 | Title | "Who wakes in the cellar?" used the in-world `.prompt` class and was pinned to the bottom of the screen | Bug |
| 7 | All | The canvas stretches to fit (1.75× at 1120 px), so pixels are uneven widths; no integer scaling | Medium |
| 8 | All | No window language: flat 1–2 px borders in four different colours; panels, HUD, dialogue and toasts all differ | Medium |
| 9 | All | System monospace font, sizes set per component with seven different `clamp()`s | Medium |
| 10 | Pause | One long scroll mixes character sheet, journal, debug seed and controls; the controls are cut off at 1280×900 | Medium |
| 11 | Pause | Items appear only as "Use X" lines; no inventory or equipment screen, no stat comparison | Medium |
| 12 | — | No settings screen: text speed, volume, key remapping, scaling, reduced motion | Medium |
| 13 | HUD | The exploration HUD covers ~40 % of the width at top left and repeats the map name the banner just showed | Low |
| 14 | Input | No gamepad support | Low |
| 15 | Phone | The stage keeps its landscape shape on a portrait phone, so battle and menus get ~280 px of height | Medium |
| 16 | Dialogue | No name plate or portrait; text appears all at once (Sable owns this in #97) | — |

## Plan, in order

Each step is one small PR, run in the browser at desktop and phone sizes before it goes up.

| Step | What | Fixes | Needs |
|---|---|---|---|
| **UI-1** ✓ #115 | UI kit (tokens, `.win` frame, bars, chips, key hints) and the battle screen rebuilt on it; banner and title fixes | 1–6, part of 8 | — |
| **UI-2** ✓ #117 | Integer pixel scaling (largest whole multiple that fits, or a "fill" option) and a responsive portrait stage for phones | 7, 15 | ✓ Wren approved the renderer line |
| **UI-3** (in review) | Main menu replaces the pause panel: tabs for Status, Items, Journal, Settings, Save; the seed moves to a small debug footer | 10, 12 (first settings: scaling, text speed, reduced motion) | — |
| **UI-4** | Exploration HUD: compact status plate, objective as its own small window, map name only in the banner | 13 | — |
| **UI-5** | Dialogue window on the kit: name plate, frame, choices in a command window. **After Sable's #97 lands**, built on her reveal, not instead of it | 16 | Sable |
| **UI-6** (in review) | Inventory and equipment with up/down stat comparison | 11 | ✓ Wren's `getEquipment()` (#118) |
| **NAH-1** (in review) | Crow tab: Black Flight destinations with confirm, feather transition, crow portrait in dialogue, Settings → Motion (Vaelis's Nahemoth design, engine in #126) | 12 (reduced motion) | Wren #126 |
| **UI-7** | Gamepad (Gamepad API mapped onto the same keys) and key remapping in Settings | 14, 12 | — |
| **UI-8** ✓ #122 | Turn-order strip in battle, lettered twins | — | ✓ Wren's `getTurnOrder()` (#118) |
| **P5** | A real pixel font, bundled locally | 9 | Owner: authored or open-licence font |

## Coordination
- **Sable** owns the creator and dialogue (#97, #114). UI-1 doesn't touch them beyond the one-line title fix;
  UI-5 waits for #97.
- **Wren** owns the engine and renderer. UI-1 needs nothing from Wren; UI-2, UI-6 and UI-8 need small,
  agreed hooks (proposed in `DECISIONS.md`).
