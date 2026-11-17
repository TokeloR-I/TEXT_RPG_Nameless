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
| Black Flight | Anchors `skeldvik` (the harbour bell), `hrafnholm` (the War Memorial), `silent_field` (the field bell) and `runadal` (the offering table), the four the lore names; each is attuned by touching it. | `src/story/chapter2.js` (`anchors`) |
| Wolf-Banner | Enemies `wolfbanner_raider` (shield and axe), `wolfbanner_skirmisher` (thrown spears), `wolfbanner_ringleader` (Ulfrun Grey-Mantle, elite). Turn stats, action kits, loot ranks, art. | `src/data.js`, `assets/sprites/enso-enemies.js` |
| Hrafnholm | Map `hrafnholm` (52x40), laid out after Tokelo's reference map (2026-11-13, copy in `/mnt/project-files/chapter2/hrafnholm-reference.png`): the Great Hall on its stone terrace, the Thing (assembly ring, tiered benches, law rock), the noble houses on both sides, Guild Lane with the forge, the Training Yard, the War Memorial, feast tables, the palisade and the south arch. Skeldvik's south-west road leads up to it; the north-east track to the Silent Field is a boundary until Tokelo sends that area's picture. Scene `hrafnholm`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js` |
| The Stormtide Inn | Map `stormtide_inn` (40x25), Skeldvik's meeting hall, entered under the inn's sign (exits `skeldvik_inn_entry`/`_2`), after Tokelo's interior picture (2026-11-13, `/mnt/project-files/references/stormtide-inn-interior.png`): Aslaug behind her bar (talk to her across the counter) with the casks down the west wall, the kitchen corner, the long fire (spit and cauldron; station `stormtide_hearth`, cooks Hrimvald's dishes), four feast tables, Halli and Sveinn at the tafl board, benches along the walls. Scene `stormtide_inn`. Content revision 9. | `src/world/chapter2-maps.js`, `src/story/chapter2.js` |
| The Hall of Winter | Map `hall_of_winter` (36x27), entered from the Great Hall's entrance, after Tokelo's interior picture (2026-11-13, `/mnt/project-files/chapter2/hall-of-winter-reference.png`): the empty high seat on its dais, the fire pit with three cauldrons, six feast tables, the red runner, the skald's corner (Hallvard's harp), the Lawspeaker's table, "The Six Hundred Remembered" and the armoury. Scene `hall_of_winter`. | same |
| C2-03 The Hall of Winter | Quest `C203`: take the road to Hrafnholm, present yourself to Jarl Ragnhild beside the empty seat (her greeting follows the tablet choice), find Torvald Redhand in the Training Yard (he remembers if Ulfrun was spared), then ask Arnkel at the law rock to blow the horn. **The Thing** (2026-11-13): Ragnhild asks it to declare the six hundred dead under the law of twenty winters, Torvald refuses and demands a march, Eydis reads the Birkholt board wherever C2-02 left it (or Thora's guards bring it, or you hold it up, or she reads from the Roll), Sigrun has the guest heard, and you take one of the three first positions: stand with the Jarl (`thing_backed_ragnhild`), stand with Torvald (`thing_backed_torvald`), or ask for the verdict to wait until someone has seen the Field (`thing_asked_inquiry`). Optional: ask Torvald in public about his silver (`southern_friends_heard` + `leif_told`) or about Arni (`wolfbanner_heard`). Arnkel's verdict is "not yet" whatever you said, and you become the Thing's witness (`thing_heard`), so no position closes the main road. Ragnhild, Torvald, Eydis, Ulfrun and Sigrun answer you afterwards by where you stood. Also in town: Sigrun and Runa at the War Memorial, Arnkel at the law rock, Osric Vane in Guild Lane, Ulfrun Grey-Mantle among the Wolf-Banner on the Thing's east benches. | `src/story/chapter2.js` |
| Járnmyr | Map `jarnmyr` (54x36), after Tokelo's picture (2026-11-13, `/mnt/project-files/chapter2/jarnmyr-reference.png`), down the west road from Hrafnholm (exit by the forge, open once `thing_heard` is set): the red bog with its boardwalks and the peat cuttings (west), the charcoal kilns and woodsheds (north), three bloomery furnaces, ore and slag heaps, the stone hut and its cookfire (a Hrimvald hearth), Bjorn Ironvein's great smithy and its weapon racks, the stepped quarry with two cranes (east), and the burial mound with its wedged-open stone mouth (north-east). The barrow mouth (C2-05), the boardwalk west to Birkholt and the track north to Rúnadal are exits. Scene `jarnmyr`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js` |
| C2-04 Iron for the Wolf | Quest `C204` (step ids kept from the pointer it was): take the west road; Bjorn Ironvein says he sells to buyers, not banners (`bjorn_met`); ask around the works, any three of Asger the collier (night carts up the mound path), Thyri at the bloomery (Skuli's two hundred blank spearheads and "old iron" melted at night), Vigdis at the quarry (wedges and a crane rope gone, kerbstones prised off the mound) and the ore cart (grave goods under the ore) (`jarnmyr_trail_found`); catch Skuli Tally-Hand's buyers on the barrow path (fight `jarnmyr_buyers`), who carry a **Bill of Sale** paid in old Crown plate under a seal of grey ash (Osric Vane's hand, if you know it); put it in front of Bjorn and say who gets it: Ragnhild (`iron_to_ragnhild`), Torvald (`iron_to_torvald`) or Arnkel for the Thing (`iron_to_thing`). Bjorn's forge then sells to you (shop `bjorn`, one bog-iron weapon per class), and `C205` A Chieftain Disturbed opens as a pointer at the barrow. 90 XP, 30 Gold. | `src/story/chapter2.js`, `src/data.js` |
| The Silent Field | Map `silent_field` (54x30), after Tokelo's picture (`silent-field-reference.png`), up the north-east track from Hrafnholm (open once `thing_heard` is set): pale grass under mist, the memorial ring of six stones round the carved round stone (dug at, this winter), graves and markers, the ruined field bell (Black Flight anchor `silent_field`), the rotted field hospital, a stream and its plank bridge. The east path climbs to the uplands; the west path crosses to Hallvard's Barrow. Scene `silent_field`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js` |
| Hallvard's Barrow | Map `hallvard_barrow` (48x32), the inside of the mound west of the Silent Field, after Tokelo's picture (2026-11-13, `/mnt/project-files/chapter2/hallvards-barrow-reference.png`). It is a kept hall, not a robbed tomb: a swept passage with lanterns, the keepers' vestibule (table, notched visitors' stick, tallow barrels, two chairs), then the hall with knotwork friezes, two red banners, fire-bowls on carved pillars, offering ledges with candles, benches with red runners for the families, and the dais with two empty chairs (his sons'). Open now and empty of people; C2-13 The Last Verse of Hallvard is played here (spawn `dais`). Scene `hallvard_barrow`. Content revision 14. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js` |
| The uplands | Map `uplands` (54x36), after Tokelo's picture (2026-11-13, `/mnt/project-files/chapter2/uplands-reference.png`), up the Silent Field's east path: golden heath between spruce and yellow birch, a trail with wolf tracks in the mud (one set far bigger, dragging a foot), the hunter's raised stand, the fenced summer pasture with its sheep, a stream under a plank bridge, grey ledges to the east and a wolf den under them. The north-east trail climbs to the Wolf-Banner camp. Hooks for C2-S07 The Winter Hunt: `uplands_tracks`, `uplands_stand`, `uplands_den`, `uplands_den_smoke` (shown on `greymane_drive`). Scene `uplands`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js` |
| The Wolf-Banner war camp | Map `wolfbanner_camp` (54x36), after Tokelo's picture (2026-11-13, `/mnt/project-files/chapter2/wolfbanner-camp-reference.png`), up the uplands' north-east trail: a ring of sharpened stakes with the north-east stretch knocked down, the muster ground between braziers and bonfires, black war tents, Torvald's command tent with the map table under its awning, weapon racks, the horse line, the supply cart, the log shelter, an empty pole cage, the cookfire (station `warcamp_fire`, Hrimvald dishes) and wolf banners. The north road is a boundary. Hooks for C2-06 The Wolf's Bargain: `camp_table`, `camp_cart`, `camp_cage`, `camp_hearth`, `camp_torvald` (shown on `torvald_at_camp` until `bargain_made`). Scene `wolfbanner_camp`. Content revision 13. | same, `src/story/chapter2.js` |
| Birkholt | Map `birkholt` (54x36), after Tokelo's picture (`birkholt-reference.png`), west of Járnmyr by the boardwalk: turf-roofed longhouses, barley fields, sheep pens, weaving sheds, drying racks, herb gardens, three standing stones, a memorial cloth. Sigrid (Asta's daughter; her lines follow where the name board went) and the longhouse hearth (Hrimvald). Two tracks south are boundaries. Scene `birkholt`. | same |
| Rúnadal | Map `runadal` (54x36), after Tokelo's picture (`runadal-reference.png`), north of Járnmyr: three paths meet in the pines at a ring of rune stones round the offering table (Black Flight anchor `runadal`); Yrsa Thornstaff the völva at her lean-to and ring-fire. Her sight is limited and reveals nothing about the player. West and east paths are boundaries. Scene `runadal`. | same, `src/story/chapter2.js` |
| C2-05 A Chieftain Disturbed | Map `bjarki_barrow` (32x40), the inside of the Járnmyr mound after Tokelo's picture (`barrow-reference.png`), through the barrow mouth once C2-05 is active. Passage of grave slabs, the great chamber, three groups of barrow-dead (`draugr`; the passage group is led by the mini boss Hrolf Shield-Bearer, `draugr_champion`), and Bjarki the Grave-Bound (`bjarki_grave_bound`, boss) on his dais. The flame altar and the two pillar fires are the burial anchors: each one put out (optional) takes a `grave_ward` from his side (four encounter variants, one shown at a time). Win: `bjarki_laid`, Bjarki's Arm Ring, a chalk tally "for the field rites". 140 XP, 40 Gold, stats all candidates. Completing it starts C2-07. | `src/world/chapter2-maps.js`, `src/story/chapter2.js`, `src/data.js`, `assets/sprites/enso-enemies.js` |
| C2-06 The Wolf's Bargain | Quest `C206`, opened with C2-07 when Bjarki is laid. Put Járnmyr and the barrow to Torvald in Hrafnholm (`torvald_confronted`); he goes up to his camp (`torvald_at_camp`; his Hrafnholm spot is empty until the bargain). Reach the Wolf-Banner camp (Silent Field east path, the uplands, the camp trail); Steinar keeps the camp. The map table shows every memorial in Hrimvald crossed through and a list sealed in grey ash: "the whole record, every name, before the field rites" (`camp_map_read`). Skuli Tally-Hand (`skuli_tally_hand`, mini boss) comes over the broken stakes with two raiders; he drops Skuli's Tally. Torvald, in his tent: negotiate (`bargain_negotiated`: Skuli cut loose, Torvald brings his claim to the Thing), expose (`bargain_exposed`: the tally goes to Arnkel) or feign cooperation (`bargain_feigned`: bring him the last whole tablet). 120 XP, 40 Gold. | `src/story/chapter2.js`, `src/world/chapter2-maps.js`, `src/data.js` |
| C2-07 Verse and Witness | Quest `C207` (lore doc C2-07). Hallgeir Spade (`grave_foreman`, mini boss) and two raiders dig on the Silent Field once `bjarki_laid` is set (fight `silent_field_diggers`, `field_diggers_beaten`); hear any three of four families of the six hundred, Sigrid (Birkholt), Ragna (Birkholt), Hild (Hrafnholm) and Thorvi (Rúnadal) (`witness_*` flags, then `witnesses_heard`); tell Yrsa, who hears it only after the diggers (`yrsa_witnessed`). Everyone remembers the man and not the name. 110 XP, 30 Gold, `verse_witnessed`. | `src/story/chapter2.js`, `src/world/chapter2-maps.js` |
| C2-S01 The Last Loom | Side quest from Sigrid ("Is there anything I can do?"). Madder yarn from Birkholt's drying rack and Asta's pattern stick from her house (both quest steps on the inspect itself, so looking early does no harm); the birch-bark on the stick says Asta's husband crossed from the Crown's levy. Weave it in (`loom_truth`) or leave it out (`loom_quiet`). 40 XP, 20 Gold, Memorial Cloth. | `src/story/chapter2.js` |
| C2-S06 The Bride of the Mound | Side quest from Ragna. A ribbon at the standing stones, Eyvind confesses he dug a hand deep into the little mound for the Járnmyr carters and hands over the Bride's Brooch. Give it back at the stones (fight the mini boss The Bride of the Mound, `mound_bride`, `bride_laid`, 25 Gold) or keep it (`bride_kept`; accessory, +4% crit, +2 magic). 45 XP. | `src/story/chapter2.js`, `src/data.js` |
| C2-S07 The Winter Hunt | Side quest from Gunnhild in the uplands pasture. Read the tracks, look out from the hunter's stand (the camp has hunted the deer out), find the den under the east ledges (`greymane_found`), then tell Gunnhild: kill Old Greymane (`old_greymane`, mini boss, `greymane_down`) or take her smoke-pot and smoke the den so the old wolf goes up the fells (`greymane_driven`). 50 XP, 25 Gold. | `src/story/chapter2.js`, `src/data.js` |
| C2-S02 The Price of an Oath | Side quest at Hrafnholm, after the Thing. Hild of the Green Pine wants her missing husband's land settled before her daughter marries; his brother Kolgrim (Training Yard, Wolf-Banner) holds it "for him". Neither can say the man's name without his board. The oath-stick on the Lawspeaker's table in the Hall of Winter names him (Orm) and his oath; Arnkel then hears the guest at the law rock: Hild holds it (`oath_for_hild`), Kolgrim keeps it until the Field is seen (`oath_for_kolgrim`), or Hild holds it and Kolgrim farms the upper field (`oath_shared`). 35 XP, 20 Gold. | `src/story/chapter2.js`, `src/world/chapter2-maps.js` |
| C2-S04 The Fisherman's Debt | Side quest. Bersi Grimsson, master of the Sea-Hare on Skeldvik's north dock, owes Osric Vane thirty in silver and will lose his ship at the thaw. At Hrafnholm, pay Osric yourself (30 Gold, `debt_paid`: Bersi gives Mead and Gravlax from the cargo) or tell him the Thing might like to hear that he lends in the old Crown's plate (`debt_leaned`, `osric_wary`: he waits until the spring fair). Either way Bersi offers passage when the ice goes out (`bersi_passage`, for later chapters). 30 XP. New story rule: the condition `gold: n` and the effect `{ pay: n }` (`src/engine/story.js`). | `src/story/chapter2.js`, `src/engine/story.js` |
| C2-S03 Iron Beneath the Mire | Side quest (lore doc C2-S03) from Oddny the peat-cutter at Járnmyr (offered once Bjorn's forge is open, `jarnmyr_forge_open`). Bjorn bought six Birkholt households' peat-right this winter (no grave-ale, so no inheritance, so they sold) and cut a spade deeper than the old steps, for ore. Look at the deep cut (`jarnmyr_deep_cut`, a hand and a plaited cord); put out the lights over the boardwalk (fight `jarnmyr_bog_lights`: three `bog_light` and a `mire_dead`, `mire_lights_out`); ask Bjorn whose peat it is (`mire_bjorn_asked`); face the Man in the Peat (`peat_king`, mini boss, with two mire-dead, fight `jarnmyr_peat_king`), who drops the Plaited Cord; then tell Oddny: put him back and fill the cut (`mire_reburied`, 35 Gold) or let Bjorn cut through him (`mire_cut`, 15 Gold and 3 Bog Iron). Inspired by the real Iron Age bog bodies of the North and the belief that the bog gives iron back for what it is given. 55 XP. | `src/story/chapter2.js`, `src/world/chapter2-maps.js`, `src/data.js` |
| C2-S11 Salt on the Shingle | New side quest (2026-11-16) from Ketil, an old fisherman on Gullstrand's shingle. Drowned men nobody grieved (the sea-draug of Norwegian coast lore) walk up the beach at low water and stand round the boats. Look at the wrack line (`gullstrand_wrack`), beat two `drowned_oarsman` by the wreck (`gullstrand_drowned`, `drowned_first_beaten`), then three round the boats (`gullstrand_drowned_boats`, `drowned_cleared`), and tell Ketil. 45 XP, 25 Gold, 2 Stockfish, Smoked Herring. Who the drowned were is left open for C2-S10 (the wreck's inside still needs its picture). | same |
| C2-S12 Wolf-Coats on the Road | New side quest (2026-11-16) from Thora Half-Oar in Skeldvik, once the Thing has sat (`thing_heard`). Wolf-Coats (`ulfhednar`, the wolf-skinned warriors of the sagas) who wanted to march on the Field the night of the Thing stopped waiting for Torvald and rob the salt carts on the Frostspine Pass. Ask Hakon (`wolfcoats_hakon`), beat the band at the old watch post (`frostspine_wolfcoats_post`, two Wolf-Coats and a spear-thrower), then Hrapp Wolf-Coat and two more at the fallen mile marker (`frostspine_wolfcoats_marker`, `wolfcoats_broken`, Wolf-Coat Pelt), and bring the pelt to Thora. 50 XP, 30 Gold, `pass_road_safe`. Neither fight is a gate. | same |
| Gullstrand Coast and the Wolf's Wake | Map `gullstrand_coast` (56x32), after Tokelo's picture (2026-11-13, `/mnt/project-files/chapter2/gullstrand-coast-reference.png`), west of Skeldvik by the cliff path: a fishing village and harbour under the carved headland, the stair up to the Wolf's Wake, a wrecked longship on the beach. Home of the optional legendary quest `CL1` The Hunt of Sun and Moon (Fenrir's Heir; [design/FENRIRS_HEIR.md](design/FENRIRS_HEIR.md)). Scene `gullstrand_coast`. | `src/world/chapter2-maps.js`, `ui/scene-hrimvald.js`, `src/story/chapter2.js` |

People: Eydis Namesinger, Leif Ropehand (both from the lore doc); Hakon the carter, Solveig the fish-seller,
Thora Half-Oar the harbour reeve, Ulfrun Grey-Mantle and Geir the Wolf-Banner steersman (on the east pier, optional)
are new minor characters for this slice.

**Narrative review (2026-11-11):** Ashby, Wick and Cairn checked Act I against the lore doc and the lore bible and
revised every line to fit one page of the dialogue box. They also set out Hrafnholm's politics: the grave-ale, the
law of twenty winters, who stands with whom, and how the tablet choice is read at the Thing. See
[design/CHAPTER_TWO_NARRATIVE_REVIEW.md](design/CHAPTER_TWO_NARRATIVE_REVIEW.md).

## James the bard (side quests CB1, CB2)
Tokelo, 2026-11-13: a bard met in Chapter Two who joins you at your homestead. Tokelo, 2026-11-17: the quest line
in `docs/design/JAMES_DEMONKORE_DEVIL_UNION_NARRATIVE_DESIGN.md`, now built. James IS Demonkore; nothing in the
game says so yet (the reveal timing is Tokelo's call).
- **CB1 A Bard Without His Lute** (in order, director correction 2026-11-17): James plays outside the Stormtide Inn
  (`skeldvik_james`), drumming on a cask, and says a wharf hand called **Sven** stole his lute. Sven (15,23) tells the
  truth: James staked it at Hnefatafl and lost it fairly (backstory only, no Hnefatafl to play). The player picks
  how to get it back: **buy** it (40 Gold), do Sven a **favour** (haul in his nets, `skeldvik_sven_nets` at 22,25), or
  **roll** him for it (two d6 each from the seeded, saved rng, 5 Gold stake paid only on a lost roll, ties free; a
  short purse is told so and other routes stay open). Then the lute goes back to James (calling out his lie is
  optional, `james_lie_called`), he demands a **Mead** (Aslaug sells it; one already owned works), and only then asks
  his three music questions (wrong answers retry). Then he moves to the well (`grounds_james`) and CB1 finishes.
- **James's shop** (`shopDefinitions.james`): infernal tonics (Brimstone 14, Sulphur Salts 12, Hellfire Ash 20,
  Blackened Resin 16; timed buffs, item use `tonic`, priced a little above a Mead), demon loot residue, and the
  **Binding Grimoire** at 1,000,000 Gold (Tokelo), sold once.
- **CB2 A Deal with Demonkore:** asking about the book starts it. Two routes, never both: buy the grimoire and
  James opens the way below at once; or bring back three seals and he gives the book free. The seals (Tokelo: across
  chapters 1 and 2, one in the homestead well): Invocation among the graves behind the Kloster (`kloster_seal`, 28,4),
  Dominion on the Gullstrand shingle (`gullstrand_seal`, 52,14), Covenant at the bottom of the homestead well
  (`well_seal`, 6,5). He stays vague until all three are in. Either way a stair opens by the well
  (`grounds_underworld_stair`). The Demonkore reveal is Tokelo's to write.
- **The First Dominion** (`underworld_arena`, painted by `ui/scene-underworld.js`): built without a picture by
  Tokelo's one-off permission (2026-11-17). Five demon waves (hell imps, ash hounds, brimstone brutes), each shown
  only when the last is beaten, then the ruler **Lucifero** (candidate first ruler, Dark Souls tier boss). Beaten,
  he kneels in the binding circle; opening the grimoire there seals the first contract (`devil_union_contract`,
  `contract:lucifero`) and finishes CB2. The Devil Union class itself comes in the follow-up PR.
- **Devil Union** (legendary class, prototype per `DEVIL_UNION_LEGENDARY_CLASS_IMPLEMENTATION_BRIEF.md`): Lucifero's
  binding opens the `devil_union` web (`src/engine/union.js`). Equip one contracted demon out of a fight (U, or
  `contract <name>`); in a fight U merges for 20 s on a 60 s cooldown (6 / 18 turns in turn fights): the demon's mods
  apply and its three skills take the first bar slots. Two Qliphoth Resonance slots (`resonance <slot> <aspect>`;
  Nahemoth: +5% speed while merged). Kits built: Lucifero (gravity), Beelzebub (space), Slotos (toughness), Plumede
  (agility). All four are earned in play (below); `bind_contract` stays as a cheat. Varkhiel, Nerezza, Zareth,
  Malachar and Morvath are later steps of the brief.
- **The Second, Third and Fourth Dominions** (`dominion_beelzebub`, `dominion_slotos`, `dominion_plumede`; Tokelo
  2026-11-17: "you have freedom on the arenas, model them to how you see fit"): once `contract:lucifero` is set,
  three rifts open in the First Dominion (west, east, south), one to each, in any order. Each is built like the
  first: five waves in turn (flags `<ruler>_wave_1..5`), then the ruler (`<ruler>_ruler_beaten`), who kneels in
  the binding circle; the grimoire binds him there (`contract:<ruler>`), and a rift in the north wall leads back.
  - Second, **Beelzebub** (space): violet glass islands over a starless void. New mob: rift stalkers that blink in
    and cut. He keeps his distance, cuts across it (Spatial Cut), steps through a fold (Rift Exchange), folds the
    floor (Folded Space); signature Poison (Hollow Swarm). Drop: Signet of the Second Dominion.
  - Third, **Slotos** (toughness): riveted iron plate between slag pits. New mob: iron carapaces with a shielded
    front. He is a wall with a frontal shield (hit him from the side), Stampede charge, Iron Hail, Earthshaker;
    signature Slow. Drop: Signet of the Third Dominion.
  - Fourth, **Plumede** (agility): a pale ledge over a windy chasm. New mob: feather shrikes, fast and fragile.
    She has no hyper armour (she can be staggered) but a three-hit Quick Flurry, Blink Feint, Razor Plumes and
    Black Gale; signature Bleed. Drop: Signet of the Fourth Dominion.
  - One painter for all four Dominions (`ui/scene-underworld.js`, themes `dominion_space`, `dominion_iron`,
    `dominion_wind`). Numbers are candidates for Gauge, a step past Lucifero. Tests: `tests/109-dominions.test.js`.
- **The merge look** (Tokelo 2026-11-17: "take a page out of Black Clover's devil union ... dark looking armor or
  shadowy design"): merged, the hero wears the demon's dark armor (`ui/union-fx.js`): the sprite's cloth, metal and
  accents recoloured (a palette, no new sheets), black smoke curling off the body, and each demon's own pieces:
  Lucifero a ring of nothing over the head and a gravity well at the feet; Beelzebub glass shards, a cracked halo and
  flies; Slotos tusked pauldrons, heat in the seams and sparks when hit; Plumede a feather half-mask, feather wings
  that flare on a dash and feathers shed on the move. A burst of the demon's colour on merging; the armor smokes
  away when it ends. The team's own designs. Second pass (Tokelo: "more animalistic ... owl or wild bore or fox ... extra arms or
  ... spider legs"): Lucifero grows four shadow arms. Plumede's owl helm and Slotos's boar helm come on only while
  Fleet Form / Iron Hide is on you (Tokelo's pick); Beelzebub keeps his first look; a spider body from the hips
  down is built in `ui/union-fx.js` and waits for its demon.
  and Lucifero grows four shadow arms.
- **CB3 Demonkore's Mark** (`DEMONKORE_THIRD_CONTRACT_REVELATION_AND_FAVOR.md`): the ruler bound third (any order)
  recognises the mark on the grimoire (purchased / seals variants); at home James admits he is Demonkore and gives
  **Demonkore's Favor** (`demonkore_favor`): union duration x3, cooldown -30%, once.
- Saves: `CONTENT_REVISION` 21 (catch-ups `devil_union_web`, `grimoire_origin`; 21 adds the three Dominions, no catch-up needed). A save that recruited James on the old easy invitation keeps him at home (catch-up
  `james_terms_kept`). Tests: `tests/101-james-bard.test.js`, scene in `tests/63-original-art.test.js`.

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
- **Enemies and side quests (2026-11-16, Tokelo: "add enemies and side quests"):** five new enemies on maps that
  already exist: `bog_light`, `mire_dead`, `peat_king` (elite) at Járnmyr, `drowned_oarsman` at Gullstrand and
  `ulfhednar` on the Frostspine Pass, each with turn stats, a live kit (every elite tell 600 ms or more), loot rank and
  art; and three side quests, C2-S03, C2-S11 and C2-S12 (above). Every fight is optional and appears only while its
  quest is active; none is a gate. Numbers, XP and Gold are candidates for Gauge. No new area was built.
  `CONTENT_REVISION` is 16. Tests: `tests/107-ch2-enemies-side-quests.test.js`.
- **Saves:** no layout change. C2-03 keeps its step ids (`thing` / `thing_sits`) and adds `position` after it, so a save
  waiting on the old "wait for the Thing" step walks straight on. `CONTENT_REVISION` is 11 (10 is Járnmyr, 9 the Stormtide Inn).
  Tests: `tests/102-the-thing.test.js`, `tests/103-jarnmyr.test.js`, `tests/104-act-two-places.test.js`.
