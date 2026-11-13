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
| The Stormtide Inn | Map `stormtide_inn` (40x25), Skeldvik's meeting hall, entered under the inn's sign (exits `skeldvik_inn_entry`/`_2`), after Tokelo's interior picture (2026-11-13, `/mnt/project-files/references/stormtide-inn-interior.png`): Aslaug behind her bar (talk to her across the counter) with the casks down the west wall, the kitchen corner, the long fire (spit and cauldron; station `stormtide_hearth`, cooks Hrimvald's dishes), four feast tables, Halli and Sveinn at the tafl board, benches along the walls. Scene `stormtide_inn`. Content revision 9. | `src/world/chapter2-maps.js`, `src/story/chapter2.js` |
| The Hall of Winter | Map `hall_of_winter` (36x27), entered from the Great Hall's entrance, after Tokelo's interior picture (2026-11-13, `/mnt/project-files/chapter2/hall-of-winter-reference.png`): the empty high seat on its dais, the fire pit with three cauldrons, six feast tables, the red runner, the skald's corner (Hallvard's harp), the Lawspeaker's table, "The Six Hundred Remembered" and the armoury. Scene `hall_of_winter`. | same |
| C2-03 The Hall of Winter | Quest `C203`: take the road to Hrafnholm, present yourself to Jarl Ragnhild beside the empty seat (her greeting follows the tablet choice), find Torvald Redhand in the Training Yard (he remembers if Ulfrun was spared), then ask Arnkel at the law rock to blow the horn. **The Thing** (2026-11-13): Ragnhild asks it to declare the six hundred dead under the law of twenty winters, Torvald refuses and demands a march, Eydis reads the Birkholt board wherever C2-02 left it (or Thora's guards bring it, or you hold it up, or she reads from the Roll), Sigrun has the guest heard, and you take one of the three first positions: stand with the Jarl (`thing_backed_ragnhild`), stand with Torvald (`thing_backed_torvald`), or ask for the verdict to wait until someone has seen the Field (`thing_asked_inquiry`). Optional: ask Torvald in public about his silver (`southern_friends_heard` + `leif_told`) or about Arni (`wolfbanner_heard`). Arnkel's verdict is "not yet" whatever you said, and you become the Thing's witness (`thing_heard`), so no position closes the main road. Ragnhild, Torvald, Eydis, Ulfrun and Sigrun answer you afterwards by where you stood. Also in town: Sigrun and Runa at the War Memorial, Arnkel at the law rock, Osric Vane in Guild Lane, Ulfrun Grey-Mantle among the Wolf-Banner on the Thing's east benches. | `src/story/chapter2.js` |
| Járnmyr | Map `jarnmyr` (54x36), after Tokelo's picture (2026-11-13, `/mnt/project-files/chapter2/jarnmyr-reference.png`), down the west road from Hrafnholm (exit by the forge, open once `thing_heard` is set): the red bog with its boardwalks and the peat cuttings (west), the charcoal kilns and woodsheds (north), three bloomery furnaces, ore and slag heaps, the stone hut and its cookfire (a Hrimvald hearth), Bjorn Ironvein's great smithy and its weapon racks, the stepped quarry with two cranes (east), and the burial mound with its wedged-open stone mouth (north-east). The barrow mouth (C2-05), the boardwalk west to Birkholt and the track north to Rúnadal are exits. Scene `jarnmyr`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js` |
| C2-04 Iron for the Wolf | Quest `C204` (step ids kept from the pointer it was): take the west road; Bjorn Ironvein says he sells to buyers, not banners (`bjorn_met`); ask around the works, any three of Asger the collier (night carts up the mound path), Thyri at the bloomery (Skuli's two hundred blank spearheads and "old iron" melted at night), Vigdis at the quarry (wedges and a crane rope gone, kerbstones prised off the mound) and the ore cart (grave goods under the ore) (`jarnmyr_trail_found`); catch Skuli Tally-Hand's buyers on the barrow path (fight `jarnmyr_buyers`), who carry a **Bill of Sale** paid in old Crown plate under a seal of grey ash (Osric Vane's hand, if you know it); put it in front of Bjorn and say who gets it: Ragnhild (`iron_to_ragnhild`), Torvald (`iron_to_torvald`) or Arnkel for the Thing (`iron_to_thing`). Bjorn's forge then sells to you (shop `bjorn`, one bog-iron weapon per class), and `C205` A Chieftain Disturbed opens as a pointer at the barrow. 90 XP, 30 Gold. | `src/story/chapter2.js`, `src/data.js` |
| The Silent Field | Map `silent_field` (54x30), after Tokelo's picture (`silent-field-reference.png`), up the north-east track from Hrafnholm (open once `thing_heard` is set): pale grass under mist, the memorial ring of six stones round the carved round stone (dug at, this winter), graves and markers, the ruined field bell (Black Flight anchor `silent_field`), the rotted field hospital, a stream and its plank bridge. The west path to Hallvard's Barrow and the east path to the uplands are boundaries. Scene `silent_field`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js` |
| Birkholt | Map `birkholt` (54x36), after Tokelo's picture (`birkholt-reference.png`), west of Járnmyr by the boardwalk: turf-roofed longhouses, barley fields, sheep pens, weaving sheds, drying racks, herb gardens, three standing stones, a memorial cloth. Sigrid (Asta's daughter; her lines follow where the name board went) and the longhouse hearth (Hrimvald). Two tracks south are boundaries. Scene `birkholt`. | same |
| Rúnadal | Map `runadal` (54x36), after Tokelo's picture (`runadal-reference.png`), north of Járnmyr: three paths meet in the pines at a ring of rune stones round the offering table (Black Flight anchor `runadal`); Yrsa Thornstaff the völva at her lean-to and ring-fire. Her sight is limited and reveals nothing about the player. West and east paths are boundaries. Scene `runadal`. | same, `src/story/chapter2.js` |
| C2-05 A Chieftain Disturbed | Map `bjarki_barrow` (32x40), the inside of the Járnmyr mound after Tokelo's picture (`barrow-reference.png`), through the barrow mouth once C2-05 is active. Passage of grave slabs, the great chamber, three groups of barrow-dead (`draugr`; the passage group is led by the mini boss Hrolf Shield-Bearer, `draugr_champion`), and Bjarki the Grave-Bound (`bjarki_grave_bound`, boss) on his dais. The flame altar and the two pillar fires are the burial anchors: each one put out (optional) takes a `grave_ward` from his side (four encounter variants, one shown at a time). Win: `bjarki_laid`, Bjarki's Arm Ring, a chalk tally "for the field rites". 140 XP, 40 Gold, stats all candidates. Completing it starts C2-07. | `src/world/chapter2-maps.js`, `src/story/chapter2.js`, `src/data.js`, `assets/sprites/enso-enemies.js` |
| C2-07 Verse and Witness | Quest `C207` (lore doc C2-07). Hallgeir Spade (`grave_foreman`, mini boss) and two raiders dig on the Silent Field once `bjarki_laid` is set (fight `silent_field_diggers`, `field_diggers_beaten`); hear any three of four families of the six hundred, Sigrid (Birkholt), Ragna (Birkholt), Hild (Hrafnholm) and Thorvi (Rúnadal) (`witness_*` flags, then `witnesses_heard`); tell Yrsa, who hears it only after the diggers (`yrsa_witnessed`). Everyone remembers the man and not the name. 110 XP, 30 Gold, `verse_witnessed`. | `src/story/chapter2.js`, `src/world/chapter2-maps.js` |
| C2-S01 The Last Loom | Side quest from Sigrid ("Is there anything I can do?"). Madder yarn from Birkholt's drying rack and Asta's pattern stick from her house (both quest steps on the inspect itself, so looking early does no harm); the birch-bark on the stick says Asta's husband crossed from the Crown's levy. Weave it in (`loom_truth`) or leave it out (`loom_quiet`). 40 XP, 20 Gold, Memorial Cloth. | `src/story/chapter2.js` |
| C2-S06 The Bride of the Mound | Side quest from Ragna. A ribbon at the standing stones, Eyvind confesses he dug a hand deep into the little mound for the Járnmyr carters and hands over the Bride's Brooch. Give it back at the stones (fight the mini boss The Bride of the Mound, `mound_bride`, `bride_laid`, 25 Gold) or keep it (`bride_kept`; accessory, +4% crit, +2 magic). 45 XP. | `src/story/chapter2.js`, `src/data.js` |
| C2-S02 The Price of an Oath | Side quest at Hrafnholm, after the Thing. Hild of the Green Pine wants her missing husband's land settled before her daughter marries; his brother Kolgrim (Training Yard, Wolf-Banner) holds it "for him". Neither can say the man's name without his board. The oath-stick on the Lawspeaker's table in the Hall of Winter names him (Orm) and his oath; Arnkel then hears the guest at the law rock: Hild holds it (`oath_for_hild`), Kolgrim keeps it until the Field is seen (`oath_for_kolgrim`), or Hild holds it and Kolgrim farms the upper field (`oath_shared`). 35 XP, 20 Gold. | `src/story/chapter2.js`, `src/world/chapter2-maps.js` |
| C2-S04 The Fisherman's Debt | Side quest. Bersi Grimsson, master of the Sea-Hare on Skeldvik's north dock, owes Osric Vane thirty in silver and will lose his ship at the thaw. At Hrafnholm, pay Osric yourself (30 Gold, `debt_paid`: Bersi gives Mead and Gravlax from the cargo) or tell him the Thing might like to hear that he lends in the old Crown's plate (`debt_leaned`, `osric_wary`: he waits until the spring fair). Either way Bersi offers passage when the ice goes out (`bersi_passage`, for later chapters). 30 XP. New story rule: the condition `gold: n` and the effect `{ pay: n }` (`src/engine/story.js`). | `src/story/chapter2.js`, `src/engine/story.js` |
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
- **Act I is complete (2026-11-13):** the Thing closes C2-03, and its two Act I side quests on built maps (C2-S02, C2-S04)
  are in. XP (C2-03 60, C2-S02 35, C2-S04 30), Gold (30, 20) and Osric's 30 Gold debt are candidates for Gauge.
- **Act II has started (2026-11-13):** Járnmyr and C2-04 are in. C2-04's 90 XP and 30 Gold, Skuli's group (the Ulfrun
  ringleader kit plus two raiders) and Bjorn's four bog-iron weapons (level 5, 48 Gold) are candidates for Gauge.
- **Act II places (2026-11-13):** the Silent Field, Birkholt, Rúnadal and Bjarki's Barrow are built from Tokelo's
  pictures, and C2-05 is playable. Enemy numbers (draugr, grave-ward, Bjarki) and the arm ring are candidates for Gauge.
- **Waits on its story:** Hallvard's Barrow (Tokelo's picture `hallvards-barrow-reference.png`, Act IV) behind the
  Silent Field's west path. **Waits on a picture:** the uplands (C2-S07), C2-06's Wolf-Banner camp.
- **Not built yet on built maps:** Skeldvik's shops (Skeldvik Iron Axe and the regional gear); C2-S05 A Song Worth
  Remembering (needs Hallvard, who keeps a barrow beyond the Silent Field); C2-S08 The Names We Carry (spans every
  settlement, mostly unbuilt); C2-S10 The Ship That Never Returned at the Gullstrand wreck (needs a new boss, the
  Salt-Dead Captain, with numbers from Gauge and art).
- **Saves:** no layout change. C2-03 keeps its step ids (`thing` / `thing_sits`) and adds `position` after it, so a save
  waiting on the old "wait for the Thing" step walks straight on. `CONTENT_REVISION` is 11 (10 is Járnmyr, 9 the Stormtide Inn).
  Tests: `tests/102-the-thing.test.js`, `tests/103-jarnmyr.test.js`, `tests/104-act-two-places.test.js`.
