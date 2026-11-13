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
| Hrafnholm | Map `hrafnholm` (52x40), laid out after Tokelo's reference map (2026-11-13, copy in `/mnt/project-files/chapter2/hrafnholm-reference.png`): the Great Hall on its stone terrace, the Thing (assembly ring, tiered benches, law rock), the noble houses on both sides, Guild Lane with the forge, the Training Yard, the War Memorial, feast tables, the palisade and the south arch. Skeldvik's south-west road leads up to it; the north-east track to the Silent Field is a boundary until Tokelo sends that area's picture. Scene `hrafnholm`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js` |
| The Stormtide Inn | Map `stormtide_inn` (40x25), Skeldvik's meeting hall, entered under the inn's sign (exits `skeldvik_inn_entry`/`_2`), after Tokelo's interior picture (2026-11-13, `/mnt/project-files/references/stormtide-inn-interior.png`): Aslaug behind her bar (talk to her across the counter) with the casks down the west wall, the kitchen corner, the long fire (spit and cauldron; station `stormtide_hearth`, cooks Hrimvald's dishes), four feast tables, Halli and Sveinn at the tafl board, benches along the walls. Scene `stormtide_inn`. Content revision 8. | `src/world/chapter2-maps.js`, `src/story/chapter2.js` |
| The Hall of Winter | Map `hall_of_winter` (36x27), entered from the Great Hall's entrance, after Tokelo's interior picture (2026-11-13, `/mnt/project-files/chapter2/hall-of-winter-reference.png`): the empty high seat on its dais, the fire pit with three cauldrons, six feast tables, the red runner, the skald's corner (Hallvard's harp), the Lawspeaker's table, "The Six Hundred Remembered" and the armoury. Scene `hall_of_winter`. | same |
| C2-03 The Hall of Winter (opening) | Quest `C203`: take the road to Hrafnholm, present yourself to Jarl Ragnhild beside the empty seat (her greeting follows the tablet choice), find Torvald Redhand in the Training Yard (he remembers if Ulfrun was spared), then "wait for the Thing to sit": the Thing's verdict and the three first positions are the next slice. Also in town: Sigrun and Runa at the War Memorial, Arnkel at the law rock, Osric Vane in Guild Lane. | `src/story/chapter2.js` |
| Gullstrand Coast and the Wolf's Wake | Map `gullstrand_coast` (56x32), after Tokelo's picture (2026-11-13, `/mnt/project-files/chapter2/gullstrand-coast-reference.png`), west of Skeldvik by the cliff path: a fishing village and harbour under the carved headland, the stair up to the Wolf's Wake, a wrecked longship on the beach. Home of the optional legendary quest `CL1` The Hunt of Sun and Moon (Fenrir's Heir; [design/FENRIRS_HEIR.md](design/FENRIRS_HEIR.md)). Scene `gullstrand_coast`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js`, `src/story/chapter2.js` |

People: Eydis Namesinger, Leif Ropehand (both from the lore doc); Hakon the carter, Solveig the fish-seller,
Thora Half-Oar the harbour reeve, Ulfrun Grey-Mantle and Geir the Wolf-Banner steersman (on the east pier, optional)
are new minor characters for this slice.

**Narrative review (2026-11-11):** Ashby, Wick and Cairn checked Act I against the lore doc and the lore bible and
revised every line to fit one page of the dialogue box. They also set out Hrafnholm's politics: the grave-ale, the
law of twenty winters, who stands with whom, and how the tablet choice is read at the Thing. See
[design/CHAPTER_TWO_NARRATIVE_REVIEW.md](design/CHAPTER_TWO_NARRATIVE_REVIEW.md).

## James the bard (side quests CB1, CB2)
Tokelo, 2026-11-13: a bard met in Chapter Two who joins you at your homestead once recruited, and a placeholder
quest he gives about a deal with a dark being called Demonkore.
- **CB1 A Bard in Skeldvik:** James, a southern bard, plays outside the Stormtide Inn (`skeldvik_james`, 27,10).
  Talking to him starts the quest; offering him a place at your homestead recruits him (`james_recruited`). He
  leaves Skeldvik and stands by the well on the homestead grounds (`grounds_james`, 26,9). Talking to him there
  finishes CB1 (20 XP, a Gauge candidate). No new area: the inn's interior has no picture yet.
- **CB2 A Deal with Demonkore (placeholder, unfinished on purpose):** at the homestead, James tells what he heard
  at a fire on the road: Demonkore is a dark thing that makes deals, and nobody would say what it takes. That
  starts CB2. Its second step, "Make a deal with Demonkore", is marked as not written yet and nothing fires it, so
  the quest stays open in the Journal. Who Demonkore is, where the deal happens and what it costs wait on Tokelo.
- Saves: no layout change. Older saves get CB1/CB2 on load (`reconcileSave`) and find James at the inn;
  `CONTENT_REVISION` is 5. Tests: `tests/101-james-bard.test.js`.

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
  Debt, the Thing itself (C2-03's verdict and positions) and everything after it.
