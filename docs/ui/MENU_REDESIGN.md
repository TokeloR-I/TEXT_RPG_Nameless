# Menu redesign: one shell for every menu (Pixie, 2026-11-25)

Tokelo (2026-11-25): "have the team research more into how a RPG UI looks, at the moment it looks all over the
place, and design a new menu UI especially for things like crafting, cooking, armor, skill tree."
Research: [MENU_RESEARCH.md](MENU_RESEARCH.md). This page is what was built from it.

## The shell
Every menu (the Esc menu, the Skill Web screen, the cooking hearth, shops and the forge) uses the same frame:

| Part | What it holds |
|---|---|
| Header | Name and level (or the station's name), HP, Gold, unspent Skill Web points, a ✕ close button |
| Tab strip | One picture and a name per tab (`ui/menu-icons.js`); short names on narrow screens, pictures only on portrait phones. A badge counts unspent points on Skill Web |
| Page | Framed panes: what you choose from on the left, what you chose on the right |
| Footer | Key hints that are also buttons (Q / R tabs, Enter, Esc), so a touch screen needs no keyboard |

Keys: **Q / R** (or Tab / Shift+Tab) change tabs from anywhere in the menu; ←→ move along the tabs, ↓ or Enter
open one; in a page the arrows move to the nearest tile or row on screen, so the bag grid and the gear figure work
like a gamepad; Esc goes back one level. Stations use Q / R for their own tabs (Buy, Sell, Temper).

## Page templates
1. **List + detail** (Journal, Settings, Crow, Devil Union, Cheats, Skill bar choices, shops).
2. **Figure + grid + detail** (Equipment: your character in the middle with a tile per slot, the slot's choices,
   then the stat comparison with ▲/▼ and the new value; Bag: a grid of item tiles with counts, the chosen item on the right).
3. **Station** (hearth: recipes | pot and result with have/need chips | your ingredients; forge and shops: goods | detail with price and a button).
4. **Skill Web canvas**, the one exception: the radial web full screen inside the shell, with the node card on the right.

## Visual rules
- Item tiles are framed by rarity (common, uncommon green, rare blue, epic violet, legendary orange); the detail pane
  also names the rarity, so colour is never the only cue. Usable items carry a ✦.
- Focus is an accent frame plus a tinted fill, on tabs, tiles, rows and cards alike.
- Colours are tokens at the top of `world.css` (`--c-r-*`, `--c-pane`, `--c-focus-fill`); spacing and type follow STYLE_GUIDE.md.
- While the menu or a station is open the touch controls are hidden; the shell's own buttons replace them.

## What did not change
Everything the menus show still comes from the engine (`getAvailableActions`, `getEquipment`, `getSkillWeb`,
`getJournal`, `kitchen`, `shop`) and every choice still goes back through `engine.act()`. No rules, numbers or saves changed.

## Left for later
- A confirm step before spending a Skill Web point or selling a rare item (research rule 9).
- Gamepad support (UI-7) can reuse the Q / R and arrow navigation as is.
- Drawn armor on the character figure needs the layered sprite (Rebuild the main character sprite thread).
