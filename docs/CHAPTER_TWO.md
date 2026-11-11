# Chapter Two in the game: what is built

Lore and the full quest outline: [design/CHAPTER_TWO_LORE.md](design/CHAPTER_TWO_LORE.md) ("The Feast of Empty Seats", Hrimvald).
This file tracks what the game actually contains. Started 2026-11-11 (Tokelo: "start building the world for chapter 2").

## Built: Act I, "The Stranger from the South" (first part)

| Lore | In the game | Where |
|---|---|---|
| How you get there | The Overgrown Road's **east track** opens once Chapter One is done (`chapter_one_complete`). Q08 "Ten Seals" now reads "Follow the crows east" with a marker there, and completes when you step into the pass. | `src/world/chapter2-maps.js` (`road`), `src/story/chapter2.js` (`q08`) |
| Frostspine Pass | Map `frostspine_pass`: the last firs of the Vale, the wrecked funeral caravan, the gap in the crags, the watch post, cairn and fallen mile marker. Scene `frostspine_pass`. | `ui/scene-hrimvald.js` |
| C2-01 The Frostspine Road | Quest `C201`: beat the raiders on the caravan, take the Birkholt name tablet from the bier, hear Eydis on the Roll of the Six Hundred, beat Ulfrun Grey-Mantle in the gap (gate fight), go down to Skeldvik. Odin's two ravens appear and the crow complains. | `src/story/chapter2.js` |
| Skeldvik Harbor | Map `skeldvik` (40x30), laid out after Tokelo's reference map (2026-11-11, copy in `/mnt/project-files/chapter2/skeldvik-harbor-reference.png`): the Upland Trail stair and palisade (north-west, back to the pass), the memorial stones, the Stormtide Inn, the harbour bell on its terrace, the market wharf, fish racks, crane, docks and the two ships (the armed one in the basin, the trader at the north dock), the shipwright's hall and yard, the customs stone, and the road to the village and hinterlands (south-west, a boundary for now). Painted at dusk under snow. Scene `skeldvik`. | `ui/scene-hrimvald.js` |
| C2-02 Salt and Silver | Quest `C202`: find Eydis, look at the memorial stone, ask Leif and Solveig (any order), then decide who keeps the tablet: Eydis, Thora's guard, or you. Flags `tablet_with_eydis` / `tablet_with_reeve` / `tablet_kept` change later lines; none blocks the story. | `src/story/chapter2.js` |
| Black Flight | Anchor `skeldvik`, attuned by touching the harbour bell. | `src/story/chapter2.js` (`anchors`) |
| Wolf-Banner | Enemies `wolfbanner_raider` (shield and axe), `wolfbanner_skirmisher` (thrown spears), `wolfbanner_ringleader` (Ulfrun Grey-Mantle, elite). Turn stats, action kits, loot ranks, art. | `src/data.js`, `assets/sprites/enso-enemies.js` |
| C2-03 The Hall of Winter | Quest `C203` is a pointer only ("take the south-west road to Hrafnholm"). The south-west road out of Skeldvik is a boundary. | next slice |

People: Eydis Namesinger, Leif Ropehand (both from the lore doc); Hakon the carter, Solveig the fish-seller,
Thora Half-Oar the harbour reeve, Ulfrun Grey-Mantle and Geir the Wolf-Banner steersman (on the east pier, optional)
are new minor characters for this slice.

**Narrative review (2026-11-11):** Ashby, Wick and Cairn checked Act I against the lore doc and the lore bible and
revised every line to fit one page of the dialogue box. They also set out Hrafnholm's politics: the grave-ale, the
law of twenty winters, who stands with whom, and how the tablet choice is read at the Thing. See
[design/CHAPTER_TWO_NARRATIVE_REVIEW.md](design/CHAPTER_TWO_NARRATIVE_REVIEW.md).

## How it joins Chapter One
One story, one world: `src/story/chapter1.js` merges `chapter2.js` (quests, NPCs, triggers, anchors) and
`src/world/zone1.js` merges `chapter2-maps.js`, the same way Chapter One's maps join Zone 1. In the browser both
Chapter Two files load before the file that merges them (`world.html`, `index.html`).

**Saves.** No save-format change. An older save gets the new quests filled in on load (`reconcileSave`), and since
nothing in Chapter Two is reached by a one-shot effect an old save already passed, it needs no `catchUp` entry: a save
with Ten Seals active just walks east (tested in `tests/98-chapter-two.test.js`).

## Rules the text keeps (from the lore doc)
- The player does not learn who they were. Nobody in Hrimvald says it or knows it.
- The six hundred are people with names; so are the raiders. Ulfrun is beaten, not killed.
- No door motif. The old Crown is remembered by its roads, mile markers and customs stones.
- No horned helmets, no monoculture of snow: the pass is snowy, the harbour is green and grey.

## Candidates and open points
- **Numbers (Gauge):** the three Wolf-Banner kits, quest XP (40, 45) and Gold (20, 25) are first-pass candidates
  sized for a level 4 to 5 character coming off the Warden. Not yet run through the balance bot or Tally's QA.
- **Text (Wick, Ashby):** reviewed 2026-11-11 (see above). Optional flags `heard_of_succession`, `wolfbanner_heard`,
  `southern_friends_heard`, `heard_of_osric` and `heard_of_hallvard` are set for Hrafnholm to read; none is required.
- **Names:** Hrimvald and the settlement names are used as the lore doc proposes them (its open decision 1).
- **Not built yet:** Skeldvik's shops (Skeldvik Iron Axe and the regional gear), side quest C2-S04 The Fisherman's
  Debt, Hrafnholm and everything after it.
