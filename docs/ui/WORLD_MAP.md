# World map and more Black Flight anchors

Research round two, pick 3 (`docs/design/GAME_EXPERIENCE_RESEARCH_ROUND2_2026-11-25.md` #4), approved by Tokelo on
2026-11-25. Chapter 2 doubled the number of maps; the map and four more anchors cut the walking.

## The Map tab

- **M** opens the menu on the Map tab (M again or Esc closes it). Mute moved to **Shift+M** (Settings still has
  every sound slider). On touch and gamepad the Map tab is in the menu (☰ / Start), beside the Journal.
- One schematic map per region: **Blackbriar Vale** (the homestead at the foot, the Warden's sanctuary at the top),
  **Hrimvald**, and **The Underworld** once you have been below. The map opens on the region you are in; the other
  regions you have visited are rows at the end of the list.
- Areas you have entered are drawn with their name. An area one road away from them is a dim **?** with no name.
  Rooms and interiors (the house, the abbey church, the Stormtide Inn, the Hall of Winter, the seal chamber) are part
  of the area you enter them from. A road out to another region is drawn once you have taken it.
- Marks: a pulsing ring where you are (still with reduced motion off), a feather for a Black Flight anchor (gold once
  attuned), a gold flag for a tracked quest's objective. Anchors are not shown before the crow is yours.
- The right pane: the chosen area (its tracked quests, its anchor and whether you can fly there, or what to look at to
  attune it), then the list of places. Tap an area or a row to choose it; tap it again, Enter or **Fly here** asks
  "Fly to …?" and flies exactly as the Crow tab does.

Code: `ui/world-map-view.js` (view model and SVG, no DOM; layout table `LAYOUT`), the tab in `ui/world-ui.js`
(`mapItems`, `mapPage`, `openMap`), styles `.wm-*` in `world.css`. Data only from the engine: `getTravelState()`
(maps entered, from the story's own `enter:<map>` events, so older saves already have them; anchors and whether each
is attuned) and `getAvailableActions()` (every flight's yes or no). A new map must get a place in `LAYOUT`
(a test fails otherwise).

## New anchors

| Anchor | Where | Attuned by looking at | Arrival |
|---|---|---|---|
| `kloster` | Briarwell Kloster | the garth fountain (`cloister_cistern`) | `flight_fountain` |
| `featherwatch` | Featherwatch Path | the crow perch (`featherwatch_perch`) | `flight_perch` |
| `jarnmyr` | Járnmyr | the bloomers' stone hut (`jarnmyr_hut`) | `flight_hut` |
| `birkholt` | Birkholt | the standing stones (`birkholt_stones`) | `flight_stones` |

Like the Shamefield well, the two Chapter 1 anchors attune even before the crow is yours (quietly; the crow speaks
when it is). The Chapter 2 anchors need the crow, like the others there. Every anchor now names its `attune` object.

**Older saves:** a trigger fires only on the first look, so a save that already looked at one of these places gets it
attuned on load by a story `catchUp` entry with the new `seen` condition (`if: { seen: ['inspect:cloister_cistern'] }`).
The save layout did not change (anchors are story flags), so `FORMAT_VERSION` stays 4; `CONTENT_REVISION` is 23.
