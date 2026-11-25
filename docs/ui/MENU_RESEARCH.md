# Menu research brief: how good RPG menus are structured

*Pixie — UI/UX Lead. Status: research input, not an approved spec. We take patterns from these games, not their look. Visual style still comes from `docs/ui/STYLE_GUIDE.md`.*

Why we're doing this: Tokelo says the menus "look all over the place." Every game below that does menus well has the same underlying fix. Every screen sits inside one shared frame and uses a small, fixed set of layouts, so players learn the menu once and reuse it everywhere.

## 1. Common structure

- **One hub, many tabs.** Diablo IV, Grim Dawn, Elden Ring, Hollow Knight and Sea of Stars all open a single pause hub. Inventory, Skills, Journal, Map and so on are tabs inside it, not separate windows. Shops and crafting stations are the exception. They open from the world, but they still reuse the hub frame.
- **Tab bar across the top** with icon and label. Shoulder buttons cycle the tabs (LB/RB on pad; Q/E or Tab on keyboard). Hollow Knight, Elden Ring and Diablo IV all do this. Side lists appear *inside* a tab for categories, not for switching between top-level screens.
- **Same frame every time.** Header: tab bar plus the current tab title. Body: one of 2–3 layout templates. Footer: a key-hint strip for the current context ("E Equip · X Drop · Esc Back"). The footer changes with focus. Where it sits never changes.
- **Back always works.** Esc, the B button or a tap on a fixed close button goes back one level, then closes. No screen traps the player.

## 2. Inventory and equipment

- **Paper doll.** Equipment slots sit around a figure of the character (head top, weapon left, offhand right, rings and amulet at the sides). Diablo II/IV, Grim Dawn and PoE all use it. Empty slots show a faint silhouette icon so the player can see what goes where.
- **Item grid.** Square cells with the icon centred. Rarity shows as a coloured frame or corner gem *plus* a name colour or a text tier. A stack count sits bottom-right. Diablo IV moved from Tetris-style sizing to uniform cells because it's faster to read, and it's easier to tap.
- **Detail / compare panel.** Selecting an item opens a fixed side panel, not only a floating tooltip. It shows the item card next to the equipped item's card (the Diablo IV and PoE compare pattern).
- **Stat deltas.** Show a green ▲ or red ▼ with a signed number, e.g. "+12 ▲". Never colour alone. Elden Ring previews the full stat sheet with arrows when you hover gear, and that's the gold standard.

## 3. Crafting and cooking stations

- **Three-column template:** recipe list (left) → ingredients (middle) → result and action (right). Stardew's cooking menu, Moonlighter's forge and Graveyard Keeper's benches all have the same pieces, even when their layouts differ.
- **Have vs need** for each ingredient, written as "2/3" in red until it's met, then a check. A recipe you can't make stays visible but dimmed, with the reason it's blocked.
- **Filters and categories** sit above the list: All / Craftable now / Weapons / Armor / Food. Default to "Craftable now" first.
- **One shared station layout.** Forge, hearth (cooking) and shop are the same template with different headers and verbs (Forge / Cook / Buy). Moonlighter's shop and forge are already close to this, and it cuts both build and learning cost.
- **Result card** uses the same compare panel as the inventory, so the player sees "+8 ▲ Armor" before they craft.

## 4. Skill trees and webs

- **Full-screen canvas** with drag to pan, wheel or pinch to zoom, and a "centre on me" button (PoE, Grim Dawn constellations, Last Epoch).
- **Node detail side panel**, docked rather than hover-only: name, rank, effect now → next rank, cost, requirements.
- **Points counter** stays in the header ("Skill points: 3"). Points go into a pending state, then **Confirm / Reset** (PoE 2 and Diablo IV allow undo before commit).
- **Three node states that don't rely on colour alone:** learned (filled, bright border), learnable (outlined, pulsing or glowing edge, connected path lit), locked (dim plus a lock glyph). The PoE forums show that a dense web becomes unreadable when these states blur together.

## 5. Journal and quests

- Categories in a left list: **Main / Side / Completed**. Hollow Knight's and Elden Ring's minimal journals show that fewer categories read better.
- One quest is **tracked (pinned)** and mirrored on the HUD. A pin toggle sits on each row.
- The detail pane shows title, giver and location, the current objective as a checklist (done struck through), and the reward.

## 6. Touch and phone

- **Minimum 44×44 CSS px targets** (Apple HIG 44pt; WCAG 2.5.5 AAA is 44px, 2.5.8 AA is 24px) with at least 8px gaps.
- Landscape first. Tabs go in a **top bar** (or a bottom bar on narrow phones), and the close button sits in a fixed corner inside thumb reach.
- **No hover-only information.** Tap selects and shows the detail panel. A second tap or a dedicated button does the action. Long-press is optional, never required.
- The side panel becomes a bottom sheet under about 700px width. The grid shrinks its column count, not its cell size.

## 7. Rules for ENSO

1. **One menu shell.** Every menu (hub, station, shop) uses the same frame: header with tabs and title, body, footer key hints, fixed close.
2. **Three body templates only:** *List + Detail*, *Doll + Grid + Detail*, *Recipe 3-column*. The skill canvas is the one exception.
3. **Q/E (pad LB/RB) cycles tabs. Esc/B goes back one level.** No exceptions.
4. **Footer key hints always show** and update with focus. On touch they become tappable buttons.
5. **Selection → detail panel, never hover-only.** Tooltips are extra.
6. **Rarity = frame colour + text tier**, and the stat delta = arrow + signed number + colour. Never colour alone.
7. **Forge, hearth and shop share the station template.** Only the title, verb and filters change.
8. **Show what you can't do yet:** dimmed recipes or nodes with the reason ("Need 1 Iron Ore", "Requires Lv 5").
9. **Commit actions get confirm/undo** (skill points, selling, salvaging rare items).
10. **Touch targets ≥ 44px**, landscape layout, the side panel becomes a bottom sheet on narrow screens.
11. **One spacing scale and one type scale** from `STYLE_GUIDE.md`. No per-screen magic numbers.
12. **Keyboard/pad focus is always visible** and starts on the most useful item (equipped slot, first craftable recipe, tracked quest).

## Sources

- Game UI Database (Aftermath coverage) — https://aftermath.site/game-ui-database.md
- Game UI Database relaunch, Game Developer — https://gamedeveloper.com/design/game-ui-database-relaunches-with-new-features-video-support-and-over-55-000-screenshots
- System Design in Diablo IV (Part I), Blizzard — https://news.blizzard.com/article/23232022/iv-1
- Diablo IV Quarterly Update, Feb 2020 (UI/itemization) — https://news.blizzard.com/en-us/article/23308274/diablo-iv-quarterly-updatefebruary-2020
- Diablo 4 developer update showcases UI changes, PC Gamer — https://pcgamer.com/diablo-4-developer-update-showcases-ui-changes-and-darker-more-gritty-monsters
- Diablo Inventory UI Fan Redesign — https://medium.com/@superscott597/diablo-inventory-ui-fan-redesign-figma-ue4-part-i-ae967d6c4917
- How To Unlock the Secrets of Video Game Inventory UX Design, Acagamic — https://acagamic.com/newsletter/2023/03/21/how-to-unlock-the-secrets-of-video-game-inventory-ux-design/
- The UX and UI of Elden Ring, UX Collective — https://uxdesign.cc/the-ux-and-ui-of-elden-ring-42036ad0e24c
- Passive skill, PoE Wiki — https://www.poewiki.net/wiki/Passive
- Passive Tree Visuals: A bit of a mess, PoE forum — https://www.pathofexile.com/forum/view-thread/3631742
- PoE 2's huge passive tree…, PC Gamer — https://pcgamer.com/games/rpg/path-of-exile-2s-huge-passive-skill-tree-used-to-scare-me-but-now-ive-started-treating-it-as-open-world-character-creation-ive-fallen-in-love-with-the-whole-thing
- Somehow the worst part of crafting games is the crafting, PC Gamer — https://pcgamer.com/games/survival-crafting/somehow-the-worst-part-of-crafting-games-is-the-crafting
- Cooking, Stardew Valley Wiki — https://www.stardewvalleywiki.com/Cooking
- Clearly and considerately: UX designing of quest, Game Developer — https://www.gamedeveloper.com/design/clearly-and-considerately-ux-designing-of-quest
- How to make an intuitive navigation, Indieklem — https://indieklem.substack.com/p/how-to-make-an-intuitive-navigation
- Make your game's interface clearer, Indieklem — https://indieklem.substack.com/p/make-your-games-interface-clearer
- Designing for games, Apple HIG — https://developer.apple.com/design/human-interface-guidelines/designing-for-games.md
- Minimum WCAG-conformant interactive element size, Smashing Magazine — https://smashingmagazine.com/2024/07/getting-bottom-minimum-wcag-conformant-interactive-element-size/
- Xbox Accessibility Guideline 114: UI context — https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/114
- Xbox Accessibility Guideline 101: Text display — https://learn.microsoft.com/da-dk/gaming/accessibility/xbox-accessibility-guidelines/101
