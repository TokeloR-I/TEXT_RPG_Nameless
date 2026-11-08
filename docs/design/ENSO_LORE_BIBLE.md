# ENSO's Last Stand — Lore Bible and Canon Audit

**Owner:** Ashby — Narrative Director · **With:** Wick — Writer (voice, in-game text), Cairn — World Builder (places,
factions) · **Requested by:** Tokelo, 2026-11-08 ("Have the team more on the lore") · **Status:** the audit (parts 1–3)
records what the game already says; the expansion (part 4) is **proposed canon** until Tokelo merges this PR. The
decisions only Tokelo can make are in part 6.

This is now the **first file to read for any story, dialogue, item text or map text**. The older lore documents stay
as they are; where they disagree with this one, part 2 says which wins and why.

| Older lore document | What it still owns |
|---|---|
| [ENSO_WORLD_NARRATIVE_FOUNDATION.md](ENSO_WORLD_NARRATIVE_FOUNDATION.md) | the Creative Director's premise and the mystery pacing (no villain reveal before midgame) |
| [ENSO_QLIPHOTH_TEN_BOSS_STORY_ARC.md](ENSO_QLIPHOTH_TEN_BOSS_STORY_ARC.md) | the ten guardians and their aspects |
| [ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md](ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md) | the crow, Black Flight, Orin's origin |
| [BLACKBRIAR_VALE_REGIONAL_LORE_BIBLE.md](BLACKBRIAR_VALE_REGIONAL_LORE_BIBLE.md) | the region's land, wildlife, hunters, homestead stages |
| [SHAMEFIELD_VILLAGE_LORE_AND_PRODUCTION.md](SHAMEFIELD_VILLAGE_LORE_AND_PRODUCTION.md) | the village, the Kloster's work, bread and beer |
| [FALLEN_SERAPHIM.md](FALLEN_SERAPHIM.md) | Caelith, Aurevain and the legendary web |

---

## 1. Audit: what the game already says

Shipped text is canon: a player has read it. Sources are `src/story/chapter1.js` (dialogue, quests) and
`src/world/chapter1-maps.js` / `src/world/zone1.js` (things you inspect).

| Fact the player can learn | Where |
|---|---|
| The player wakes in a cellar, no memory, **glowing hands**. The inscription reads "...WHO SLEEPS HERE IS NOT TO BE..."; someone tried to scratch it out. | Q01, `cellar_inscription` |
| The house's kitchen table is **set for two**. A cornerstone far too big for a farmhouse; old masonry runs under the grass. | Q02, zone1, `grounds_foundation` |
| "The old lord is dead and **his crown is broken**. A year ago now." **Nobody says his name**; it's bad luck. He "ruled from somewhere out this way". **Whole streets emptied when he gave the word.** | Elian |
| The heroes were **a sworn band**; the bravest **carried the sun banner**. They broke the lord's guard **at the gates**, then broke him. Emblem: **a sun breaking a crown**. | Elian, tollway post |
| Shamefield holds the **Festival of the Sun** for the victory, one year on. The orchard's oldest tree has **one ribbon**, one for each year since the crown fell. The Kloster bell once rang **for an hour without stopping**, a year ago. | notice board, orchard, Kloster bell |
| A memorial stone: "FOR THOSE TAKEN UNDER THE OLD CROWN". No names; the list was too long to carve. | `village_memorial` |
| Shamefield's name is **an old joke**: people shamed for something work the field until they earn their name back. | Tamsin |
| The Kloster (Briarwell, painted after Kloster Sankt Alban) keeps a charter to brew, bake and keep a granary "for the living, and against the winter", **older than the old crown**. Crosses, psalters, hooded saints whose hands are folded **like the courtyard statue**. | Kloster inspects |
| The library has a chained book, *On the Six-Winged Ones, and Why They Are Not Spoken Of*. **Most of its pages are cut out.** An armillary ring has been bent back by hand. | `kloster_inner` inspects |
| The statue is **Caelith**, a seraph who **kept the Cold Door**. Behind it the warm country, in front a winter that did not end. Caelith opened it; spring ran down the hill; Heaven called it a sin, and it fell. The monks built their walls around it. Someone carved **HE FELL FOR US** on the altar step. **Aurevain** keeps the door now. "The answer took a thousand years." | `seraph_statue`, QS1 |
| The **Broken Oath** cult wears grey robes, keeps bowls of ash, chants, and scrapes **a circle left open at the top** into stone. One acolyte looks at the player "almost hopeful. Then afraid." The same open circle is "in the cellar, on the dead tree, in the well". They chain ghouls with ritual cuts. | orchard and Featherwatch encounters |
| The seal is **a ring of black stone, a circle left open at the top**. | `seal_first_echo` |
| The Warden was **given the key and told never to use it**; he never asked why. His crows saw the player wake "in the old house" and have been afraid since. His cages are **rebuilt from old prison bars**. He mended Tamsin's grandson's arm and took no coin. | Warden, sanctuary inspects, Tamsin |
| The first memory: a balcony, **a festival street of lanterns**, a calm voice gives an order, the lanterns go out, the street is empty. | B01 |
| The crow is **Nahemoth, the First Shell**: "the part of the world that remembers where you have stepped". | B01, crow |
| Orin came through when the seal opened: "Because a door opened. Because old things hear doors." The foundations are older than the village. | Orin |
| Q08: "The Warden kept one seal. Orin has heard of others." **Follow the crows east** for Chapter Two. | Q08 |

**What the audit shows.** Chapter One's environmental writing is strong and already hints at a coherent world:
**doors and seals**, **an open circle**, **one year since the fall**, and a holy order that is older than the crown.
What is missing is the layer *under* it: the team has no shared answer to who the old lord was, who the heroes
are, who made the seals and how, or what the Broken Oath wants. Writers have been improvising lines one quest at a
time, and that is how contradictions start.

## 2. Contradictions found, and the ruling

| # | Conflict | Ruling (Ashby) |
|---|---|---|
| C1 | The region is **Blackbriar Vale** in the regional bible, but the Black Flight menu calls it **"Shamefield Vale"** (`anchors.shamefield.region`). | **Blackbriar Vale.** Shamefield is the village, not the valley. Fixed in this PR (anchor text and its test). |
| C2 | The regional bible says religion is "undecided; don't invent gods". Since then the game shipped a Kloster with crosses and saints, a seraph, and **Heaven** as a speaking power. | The game wins. Section 4.4 sets out the faith so later text stays consistent. |
| C3 | The foundation doc has Orin as an ordinary mason who tried to reach the Warden's records; the Nahemoth doc makes him something that came through the opened seal. | The game uses the second. **Orin came through the door.** The first version is retired. |
| C4 | `src/data.js` gives the Warden red eyes and chanting, which read as evil. | Already ruled (foundation doc): the red glow is the seal's weight on him. The **Hex-Eyed Crows** with "the wrong red" eyes are cult-fed birds, never his. Keep the two reds visibly different. |
| C5 | Boss slot 2 was "Nahemoth" in the first boss table, then Nahemoth moved to slot 1. | Slot 2 stays **unassigned** (the Hearthbound Sentinel is a working name only). |
| C6 | The studio role briefs in `.claude/agents/` still say "Art is Mana Seed only". Art went original and code-drawn on 2026-10-26/28. | Not a lore question. Flagged for Juniper to correct across all briefs in their own PR. |

No shipped line contradicts another shipped line. Every conflict above is between documents, or between a document
and the game.

## 3. Gaps the team kept hitting

1. **What "Enso" is.** It is the game's name and nothing in the game or the docs says what it means. *(Decision D1.)*
2. **The old lord** has no history beyond "streets emptied". His realm has no name.
3. **The heroes** are "a sworn band" with a sun banner. None has a name, a role or a reason; yet boss 10 and the
   late game hinge on them.
4. **The seals.** Who made ten seals out of a broken crown, how, and why guardians instead of a vault?
5. **The Broken Oath.** Their open circle is the strongest mystery in Chapter One and nobody has written who they are.
6. **Heaven and the Husks.** The seraph side (doors, light) and the Qliphoth side (shells, shadow) sit in one Kloster
   and one valley with no link between them.
7. **The Warden** has no name and no past, though his cages hint at one.
8. **The table set for two.** A strong hook with no owner.
9. **The calendar.** "A year ago", "a thousand years", "a hundred years knocking": no timeline holds them.

## 4. Proposed lore (expansion)

Everything in this part is **proposed canon**. It is built only from what part 1 already shows, so it adds depth
without overwriting a shipped line. Spoiler level is marked **[Ch1]** (fine to hint at now), **[mid]** (not before
the midgame reveal, boss 5 or 6) or **[late]**.

### 4.1 Enso and the open circle (keystone; Decision D1)

An *ensō* is a circle drawn in one brushstroke, often left open. The game already uses that exact image four
times: the cult's mark, the cellar, the dead tree, the well, and the seal itself.

**Proposal:** *Enso* is the old lord's true name, the name nobody says. The open circle was his mark: a crown that
is never closed, a rule that is never finished. Every seal the heroes made is that mark turned against him, a door
drawn in his own sign. *Enso's Last Stand* is not the heroes' victory: it is the player's story, the stand he makes
after he has already lost.

- **[Ch1]** The circle may appear anywhere old. Nobody in Chapter One may connect it to a name.
- **[mid]** The reveal (boss 5, Thagirion, "The Face") is where the player first hears the name spoken, and it is
  their own.
- Folk speech always says **"the old lord"** or **"the old crown"**, never the name. Educated speech (scholars,
  the Sworn Band) says **"the Unclosed"**, the polite way to point at the circle without saying the word.

### 4.2 A short history of the world

| When (from now) | What happened | Spoiler |
|---|---|---|
| ~1000 years | **The Cold Door.** Blackbriar Vale lies behind a door Heaven built against an endless winter. Caelith, its keeper, opens it for the people freezing outside; spring runs down the hill. Caelith falls and the hill closes over it. The Vale is green because a seraph disobeyed. | [Ch1] (Caelith says it) |
| ~700 years | **Sankt Alban**, a hermit, digs a spring on the hill and finds a hooded stone figure in it. He builds a chapel round it; the brothers who follow him become **the Order of Briarwell**. They take the statue for a nameless saint and copy its folded hands on every saint they carve. Their rule: "for the living, and against the winter", a phrase none of them can explain. | [Ch1] hints |
| ~60 years | **The rise of the old crown.** A ruler from nowhere unites the valley lands and those beyond, by law first and by fear after. Roads, tollways, watchposts and checkpoints: the ruins on the Overgrown Road are his. He builds a seat on the ridge above Blackbriar Vale. The Kloster's charter, older than him, is the one thing in the Vale he never tears down. | [Ch1] ruins; [mid] the seat is the homestead |
| ~25 years | **The Night of Lanterns.** In the old crown's capital, a street festival is emptied by a single order. Nobody agrees why. This is the first memory fragment. | [Ch1] the image only; [mid] who gave it |
| ~25 to 2 years | **The long fear.** Requisitions, missing households, the memorial with no names. Some prosper: roads are safe, tolls are fair, bread is cheap. Some remember the order fondly; most don't. | [Ch1] |
| ~2 years | **The Sworn Band** forms (4.3). The Sealwright steals the cut pages of *On the Six-Winged Ones* from the Kloster library. | [mid] |
| 1 year | **The Breaking of the Crown.** The Sworn Band breaks the guard at the gates and breaks the old lord. They cannot kill what he is, so they split it into ten **husks**, seal each behind a door in his own sign, and give each door a keeper. The Kloster bell rings for an hour. The body is never shown. | [Ch1] the bell, the festival; [mid] the husks |
| now | The Festival of the Sun. A year of fewer funerals. Someone wakes in the old house. | [Ch1] |

### 4.3 Factions and people

**The Old Crown** (folk name; [mid] formally *the Circle Dominion*). Gone, but its stone is everywhere: tollways,
milestones, prison-towers like Featherwatch. Its officials kept good records and burned them at the end.

**The Sworn Band.** Five who swore an oath on the Kloster's altar step to end the old crown. Working names, all
open to change (Decision D3):

| Role | Working name | Who they are | Spoiler |
|---|---|---|---|
| **The Sunbearer** (the beloved champion, final confrontation) | **Ilsabet Rowe** | A tollkeeper's daughter from the south roads who carried the sun banner through the gates. Genuinely good, tired, and the only one who still doubts the seals will hold. Must stay admirable (foundation doc). | [Ch1] the banner; the name [late] |
| **The Sealwright** | **Master Odran Quell** | A scholar who learned door-craft from the stolen pages and invented the seals. Chooses the keepers. Carries the guilt of the theft. | [mid] |
| **The Shield** | **Sir Hamund Gale** | A former officer of the old crown who turned. Proof that the crown's own people ended it. | [mid] |
| **The Lantern** | **Sister Wenna of Briarwell** | A Briarwell sister who left the Kloster to march; her name is on the altar step oath. Brother Fenric and Sister Merrow knew her. | [Ch1] a hint at the Kloster |
| **The Scout** | **Tam Fletch** | A Vale hunter who led the band over the high passes. Harlan Voss's apprentice, if Harlan is built. | [mid] |

**The Keepers.** The ten guardians (the Qliphoth table) are not the Sworn Band. The Sealwright chose people who
*would not open a door they were told to keep shut*: steady, kind, unambitious. That is why so many of them are good,
and why killing them should hurt.

**The Broken Oath.** Soldiers, clerks and jailers of the old crown who **broke their oath** to him when he fell,
surrendering to save their lives. Their shame turned to a creed: the oath can be mended only by bringing him back.
They scrape his open circle on every road to show him the way home, burn their own names into ash bowls, and chain
the ghouls they make from the war dead. They are **fringe, frightened and few**; the village fears them and the
watch hunts them. When an acolyte looks at the player "hopeful, then afraid", it is because the circle is answering.
[Ch1] the behaviour; [mid] what they recognise.

**The Order of Briarwell (the Kloster).** Brothers and sisters who brew, bake, mill and bury. Village life runs on
their spring, their granary and their beer. They serve **the One Light** (4.4) and know almost nothing about the
statue they built around. One of their own marched with the Sworn Band; the order is proud of it and does not talk
about the stolen pages.

**Shamefield, the Watch and the Vale Hunters.** As in the regional bible. The Watch Captain is lazy and drunk, but
he closes the orchard road because he has buried people who walked it.

### 4.4 The cosmology: doors, light and husks

One rule ties the Kloster, the seraph and the Qliphoth together: **everything that matters in ENSO is a door.**

- **Heaven** (the Kloster calls it the One Light) keeps order by keeping doors: between seasons, between the living
  and the dead, between what is and what was. Its doorkeepers are the **six-winged ones**, the seraphim. Caelith
  kept the Cold Door; Aurevain keeps it now. Heaven is not evil and not kind: it is *orderly*.
- **The Husks** (the Qliphoth) are what lies on the other side of a closed door: shells, shadows, the underside of
  the real. They are not demons in a hell; they are what a thing becomes when it is shut away. Nahemoth is the shadow
  of every path ever walked, so it took the shape of a crow, the bird of roads.
- **The old lord** was, before anything else, someone who could **open any door**. That is what the open circle
  means, and it is why a sworn band could not simply kill him: they had to shut ten doors on him instead.
- **The seals** are door-craft learned from Heaven: the cut pages of *On the Six-Winged Ones* teach how the seraphim
  shut a door so it stays shut. The heroes used Heaven's own method. This is why Aurevain takes such an interest in
  the player, and why the Fallen Seraphim web can be found by the same person who is breaking the seals.
- **Orin** is a Husk too: something old that heard a door open and walked through it wearing a mason's apron.

**Lore rule:** a closed door in ENSO is never just scenery. If a writer adds a door, gate or seal that matters, it
should be because someone was asked to keep it shut.

### 4.5 People who need a past

- **The Crow-Touched Warden: Bran Ashdown.** [Ch1, but only after his death] A jailer at Featherwatch when it was
  the old crown's prison-tower. On the night the crown fell he opened every cell and let the prisoners walk, then
  stayed behind to feed the crows that had always roosted on the walls. The Sealwright chose him for that. His cages
  are the old cells' bars. His name should appear for the first time **on his grave or in Tamsin's mourning line**,
  never before the fight: the player kills "the Warden" and buries Bran.
- **The table set for two.** [late] Someone lived in the old house with the sleeper, and set the table the last
  evening. Two options for Tokelo (Decision D4): **(a)** the old lord's steward, alive somewhere and still loyal,
  later a recruitable or rival; **(b)** the person who put him to sleep in the cellar and carved the inscription,
  then tried to scratch it out. Recommendation: **(b)**: it explains the inscription, the scratching, and why the
  crows saw him wake.
- **The crow.** It refuses a name until the second seal opens, then picks one it likes ([mid]; suggested: **Mourn**).
- **Shane the Shamed.** He ran the old crown's field hospital in the Vale, which is why his medicines work and why the
  watch has a file on him. He has never told anyone. His farewell stays exactly **"Suffer!"**.
- **Elian.** Lost his sister on the Night of Lanterns. His letter of names (SF5) is the only list of the missing
  anyone has written.

### 4.6 Places to come

These are named so Moss and Cairn can plan around them; none is promised content.

- **The Lantern City** (working name): the old crown's capital, east, where the Night of Lanterns happened. Chapter
  Two follows the crows east, so this is the natural long-range destination.
- **The Cold Door**: the hill under the Kloster. Aurevain came from somewhere; a door should exist to come back to.
- **The ridge seat**: what the homestead was. The five homestead stages (regional bible) slowly uncover it; Orin
  recognises a throne room's footings at stage 4.

### 4.7 Glossary

| Term | Meaning | Who says it |
|---|---|---|
| the old lord, the old crown | the ruler and his realm | everyone |
| the Unclosed | polite name for the ruler | scholars, the Sworn Band |
| Enso | his true name | nobody, until [mid] |
| the Breaking of the Crown | the victory, one year ago | heroes, festival |
| the Sworn Band | the five heroes | everyone |
| the Sunbearer | the champion | everyone |
| the Keepers | the ten guardians | the Sealwright, scholars |
| husk, shell | a sealed aspect (a Qliphah) | the crow, scholars |
| the One Light | Heaven, in the Kloster's prayers | the Order |
| six-winged ones | seraphim | old books |
| the Broken Oath | the cult | the watch, villagers |

## 5. How the team works on lore from now on

- **Ashby** owns this file. Any PR that adds story, dialogue, item text or map text checks it first and adds new facts
  to part 1 (shipped) or part 4 (proposed) in the same PR.
- **Wick** writes the in-game text and keeps voice: short sentences, concrete things, dry humour, no exposition dumps.
  Lore is found in objects (a ledger, a ribbon, a ring of dust) more than told by NPCs.
- **Cairn** checks every new place against 4.2 and 4.6 and keeps maps' inspect text in the same world.
- **Tally** adds a lore check to content QA: no spoiler before its marked level, no name the doc doesn't know.
- Next lore work, in order, once part 6 is answered:
  1. **In-game lore pass on Chapter One** (Wick): Bran's grave and name, one Broken Oath note on the Featherwatch
     climb, one line from Fenric or Merrow about Sister Wenna, the cut-out pages noted as stolen "two winters ago".
     Spoiler-safe, text only, no new mechanics.
  2. **A Lore page in the Journal** (Pixie, Wren): collects inspected texts the player has read, so the world's story
     can be re-read. Needs a small UI brief.
  3. **Chapter Two story outline** (Ashby): the road east, the second Keeper, and what the second fragment shows.

## 6. Decisions for Tokelo

| # | Question | Recommendation |
|---|---|---|
| D1 | What is "Enso"? | **The old lord's forbidden name, which is the player's own** (4.1). Alternatives: the world's name; the realm's name; leave it unexplained. |
| D2 | Adopt the cosmology "everything is a door" (4.4) linking Heaven, the seals and the Husks? | Yes. It costs nothing in shipped text and connects the Fallen Seraphim to the main plot. |
| D3 | The Sworn Band's five roles and working names (4.3) | Keep the roles; the names are easy to swap. |
| D4 | Who set the table for two? | (b) the one who put the sleeper there. |

Until these are answered, the team builds on the recommendations and keeps them out of shipped text where they are
marked [mid] or [late].
