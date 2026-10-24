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
