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
| The statue is **Caelith**, a seraph ("the burning one") who **kept Heaven's altar fire**. Above, warmth; below, a winter that did not end. Caelith carried **one live coal** down; spring ran down the hill; Heaven called it a sin and threw it after the coal. The monks built their walls around it. Someone carved **HE FELL FOR US** on the altar step. **Aurevain** keeps the altar now. "The answer took a thousand years." *(Renamed 2026-11-11 from "the Cold Door", see 4.8.)* | `seraph_statue`, QS1 |
| The **Broken Oath** cult wears grey robes, keeps bowls of ash, chants, and scrapes **a circle left open at the top** into stone. One acolyte looks at the player "almost hopeful. Then afraid." The same open circle is "in the cellar, on the dead tree, in the well". They chain ghouls with ritual cuts. | orchard and Featherwatch encounters |
| The seal is **a ring of black stone, a circle left open at the top**. | `seal_first_echo` |
| The Warden was **given the key and told never to use it**; he never asked why. His crows saw the player wake "in the old house" and have been afraid since. His cages are **rebuilt from old prison bars**. He mended Tamsin's grandson's arm and took no coin. | Warden, sanctuary inspects, Tamsin |
| The first memory: a balcony, **a festival street of lanterns**, a calm voice gives an order, the lanterns go out, the street is empty. | B01 |
| The crow is **Nahemoth, the First Shell**: "the part of the world that remembers where you have stepped". | B01, crow |
| Orin came through when the seal opened: "Because a seal broke. Old things hear that sort of noise." The foundations are older than the village. | Orin |
| Q08: "The Warden kept one seal. Orin has heard of others." **Follow the crows east** for Chapter Two. | Q08 |

**What the audit shows.** Chapter One's environmental writing is strong and already hints at a coherent world:
**seals**, **an open circle**, **one year since the fall**, and a holy order that is older than the crown.
What is missing is the layer *under* it: the team has no shared answer to who the old lord was, who the heroes
are, who made the seals and how, or what the Broken Oath wants. Writers have been improvising lines one quest at a
time, and that is how contradictions start.

## 2. Contradictions found, and the ruling

| # | Conflict | Ruling (Ashby) |
|---|---|---|
| C1 | The region is **Blackbriar Vale** in the regional bible, but the Black Flight menu calls it **"Shamefield Vale"** (`anchors.shamefield.region`). | **Blackbriar Vale.** Shamefield is the village, not the valley. Fixed in this PR (anchor text and its test). |
| C2 | The regional bible says religion is "undecided; don't invent gods". Since then the game shipped a Kloster with crosses and saints, a seraph, and **Heaven** as a speaking power. | The game wins. Section 4.4 sets out the faith so later text stays consistent. |
| C3 | The foundation doc has Orin as an ordinary mason who tried to reach the Warden's records; the Nahemoth doc makes him something that came through the opened seal. | The game uses the second. **Orin came out of the broken seal.** The first version is retired. |
| C4 | `src/data.js` gives the Warden red eyes and chanting, which read as evil. | Already ruled (foundation doc): the red glow is the seal's weight on him. The **Hex-Eyed Crows** with "the wrong red" eyes are cult-fed birds, never his. Keep the two reds visibly different. |
| C5 | Boss slot 2 was "Nahemoth" in the first boss table, then Nahemoth moved to slot 1. | Slot 2 stays **unassigned** (the Hearthbound Sentinel is a working name only). |
| C6 | The studio role briefs in `.claude/agents/` still say "Art is Mana Seed only". Art went original and code-drawn on 2026-10-26/28. | Not a lore question. Flagged for Juniper to correct across all briefs in their own PR. |

No shipped line contradicts another shipped line. Every conflict above is between documents, or between a document
and the game.

## 3. Gaps the team kept hitting

1. **What "Enso" is.** It is the game's name and nothing in the game or the docs says what it means. *(Answered in 4.1.)*
2. **The old lord** has no history beyond "streets emptied". His realm has no name.
3. **The heroes** are "a sworn band" with a sun banner. None has a name, a role or a reason; yet boss 10 and the
   late game hinge on them.
4. **The seals.** Who made ten seals out of a broken crown, how, and why guardians instead of a vault?
5. **The Broken Oath.** Their open circle is the strongest mystery in Chapter One and nobody has written who they are.
6. **Heaven and the Husks.** The seraph side (fire, light) and the Qliphoth side (shells, shadow) sit in one Kloster
   and one valley with no link between them.
7. **The Warden** has no name and no past, though his cages hint at one.
8. **The table set for two.** A strong hook with no owner.
9. **The calendar.** "A year ago", "a thousand years", "a hundred years knocking": no timeline holds them.

## 4. Proposed lore (expansion)

Everything in this part is **proposed canon**. It is built only from what part 1 already shows, so it adds depth
without overwriting a shipped line. Spoiler level is marked **[Ch1]** (fine to hint at now), **[mid]** (not before
the midgame reveal, boss 5 or 6) or **[late]**.

### 4.1 The fallen sovereign, the empire and the Keeping (reconciled 2026-11-11)

**Director-approved core:** The player once ruled a vast, feared empire. The Sworn Band genuinely saved kingdoms by defeating that ruler. The former sovereign survives without memories, recovers ten Qliphoth aspects and gradually rebuilds a seat of power from the ruined Homestead. Their true identity remains a **midgame reveal (approximately Guardian Five or Six)**, never a Chapter One or Two explanation.

**What the empire was:** An actual military and political state. It conquered territories, recruited officers, negotiated surrender, enforced laws, collected taxes, built roads and fortresses, supported trade, and punished resistance. Many subjects suffered enslavement, massacres or disappearances; other families remember stability and safe commerce. Both memories can be sincerely held **without excusing what the empire did**. The Sworn Band are not secret villains, and the old ruler is not a misunderstood saint. Their pride, strategy, hunger for power, decisions and responsibility matter as much as any private pain. The Broken Oath and surviving imperial officers are people with competing agendas, not merely worshippers of a magic symbol.

**The Keeping — approved as a starting direction (8 November), specific mechanisms still reviewable:** The old ruler learned forbidden soul-binding. Finishing an open-circle mark on a living person could bind that person's life, memories, skills and essence into the sovereign's power rather than simply killing them. Those so bound are remembered in the lore proposal as **the Kept**. Some were taken violently, others volunteered or capitulated. The moral and military horror is that the sovereign's growing might depended on people deprived of freedom.

**Crucial creative distinction:** The Keeping is **one terrible tool of the imperial regime**, and the force behind the protagonists' ten fragments. It is **not** the universal origin of every myth, god, monster, haunting, legendary class or historical event in ENSO. Norse, Chinese, Egyptian, Japanese and other traditions predate the empire and have independent meanings.

**Proposed private history, not sole motive or approved ending:** The table set for two at the Homestead may belong to a person the sovereign loved (working name **Maren**), perhaps the first life bound by the Keeping. Fear of losing that person is a **late-game personal explanation under review**. It must **not** turn fifty years of conquest, oppression and political ambition into an involuntary attempt to save a spouse. The sovereign made deliberate choices. Maren's status, the last Kept, and the final release/keep ending are **not yet locked**.

**What Chapter One actually hints:**

| Shipped or established clue | Possible future meaning | Spoiler boundary |
|---|---|---|
| Streets emptied under the old Crown | The Keeping may have been used on a large scale | The image [Ch1]; its precise mechanism [mid] |
| Memorial without a complete list of names | Many victims are missing, some records contradictory; extraordinary memory erasure is **proposed**, not proven | [Ch1] memorial; larger explanation [mid] |
| Elian's handwritten names and the Night of Lanterns | A surviving human record may contradict official claims | [Ch1] letter; its ultimate importance [mid] |
| First memory: lanterns extinguish and the street falls silent | An atrocity committed under imperial command, without showing the person's face | [Ch1] image; identity [mid] |
| Glowing hands, old mark and scratched cellar warning | A connection to older imperial power, not a full identity reveal | [Ch1] signs, [mid] answer |
| Table set for two | A missing personal bond; Maren explanation remains [late] proposal | [late] |
| The Warden's ordinary crows recoil | They sense something dangerous, exact reason unconfirmed | [Ch1] behavior; explanation [mid] |
| Ten Qliphoth fragments protected by guardians | The Sworn Band separated the sovereign's memory and might to prevent return | [Ch1] first fragment; [mid] complete account |

**The breaking of the Crown:** The Sworn Band's Sealwright devised bindings to split the sovereign's former power into ten guarded aspects. One working explanation is that killing the ruler outright endangered lives imprisoned through the Keeping. Each recovered aspect restores something the protagonist has lost and attracts political or spiritual consequences. The **Qlipoth/qlippot shell symbolism** is inspiration for ENSO's original magic, not a claim that real-world religions contain this campaign's ten bosses. Precise origins, aspect order and costs belong to individual approved designs.

**Future choices:** The player may seek dominion, negotiate loyalty, seize power or surrender stolen souls, but the campaign must not assume one correct "redemption" path. Whether and how releasing bound people affects combat power, the final fate of Maren, and possible empire endings are open creative decisions. Chapter Two proposes the first major decision about the six hundred; do not pre-decide every later ending here.

**The open circle:** A mark tied to the ruler's art and to the Broken Oath. It is a symbol and potential working of binding, **not a portal, threshold or metaphysical doorway**. Ordinary buildings have ordinary doors. The game is about a broken Crown and its consequences, not an overarching door allegory.

### 4.2 A short history of the world

| When (from now) | What happened | Spoiler |
|---|---|---|
| ~1000 years | **The Live Coal.** Heaven keeps its fire on its altar; below, a winter that does not end. Caelith, a seraph of the altar, carries one live coal down to the freezing; spring runs down the hill. Heaven throws Caelith after it and the hill closes over it. The Vale is green because a seraph disobeyed. | [Ch1] (Caelith says it) |
| ~700 years | **Sankt Alban**, a hermit, digs a spring on the hill and finds a hooded stone figure in it. He builds a chapel round it; the brothers who follow him become **the Order of Briarwell**. They take the statue for a nameless saint and copy its folded hands on every saint they carve. Their rule: "for the living, and against the winter". | [Ch1] hints |
| ~60 years | **The house on the ridge.** An old domestic history remains beneath the future imperial seat. A loved one's illness and an early Keeping experiment are **late-game proposals**, not confirmed causes of the empire's rise. | [late] |
| ~50 years | **The rise of the old crown.** A brilliant and ruthless ruler unifies and conquers territories through armies, diplomacy, administration and forbidden power. Roads, tollways, supply stations and prison-towers are built. Orin's work on the future imperial seat and later binding remain proposed late reveals. | [Ch1] ruins; [mid] empire and seat; [late] Orin |
| ~25 years | **The Night of Lanterns.** In the capital, a festival street is taken in one night: the first time thousands are kept at once. The first memory fragment. | [Ch1] the image; [mid] the truth |
| ~25 to 2 years | **Imperial rule and resistance.** The Crown imposes roads, levies, military administration and harsh punishments; whole communities disappear. Some inhabitants remember stability and cheap provisions, others massacres and forced service. The slogan **"Under the Crown, nobody is lost"** is a proposed imperial justification for the Keeping, not proof it solved death. | [Ch1] contested memories; [mid] source of power |
| ~2 years | **The Sworn Band** forms (4.3). The Sealwright steals the cut pages of *On the Six-Winged Ones*: the seraphim's way to bind something so it stays bound. | [mid] |
| 1 year | **The Breaking of the Crown.** The Band cuts the old lord into ten husks at the gates, seals each in his own circle, and gives each seal a keeper. What is left, empty, is laid in the cellar of the house on the ridge, and someone carves a warning and tries to scratch it out. The Kloster bell rings for an hour. | [Ch1] bell, festival; [mid] the husks |
| now | The Festival of the Sun. Someone wakes in the old house. | [Ch1] |

### 4.3 Factions and people

**The Old Crown** (folk name; [mid] formally *the Circle Dominion*). Gone, but its stone is everywhere: tollways,
milestones, prison-towers like Featherwatch. Its officials kept good records and burned them at the end.

**The Sworn Band.** Five who swore an oath on the Kloster's altar step to end the old crown. Working names, all
open to change (Decision D3):

| Role | Working name | Who they are | Spoiler |
|---|---|---|---|
| **The Sunbearer** (the beloved champion, final confrontation) | **Ilsabet Rowe** | A tollkeeper's daughter from the south roads who carried the sun banner through the gates. Genuinely good, tired, and the only one who still doubts the seals will hold. Must stay admirable (foundation doc). | [Ch1] the banner; the name [late] |
| **The Sealwright** | **Master Odran Quell** | A scholar who learned seal-craft from the stolen pages and invented the seals. Chooses the keepers. Carries the guilt of the theft. | [mid] |
| **The Shield** | **Sir Hamund Gale** | A former officer of the old crown who turned. Proof that the crown's own people ended it. | [mid] |
| **The Lantern** | **Sister Wenna of Briarwell** | A Briarwell sister who left the Kloster to march; her name is on the altar step oath. Brother Fenric and Sister Merrow knew her. | [Ch1] a hint at the Kloster |
| **The Scout** | **Tam Fletch** | A Vale hunter who led the band over the high passes. Harlan Voss's apprentice, if Harlan is built. | [mid] |

**The Keepers.** The ten guardians (the Qliphoth table) are not the Sworn Band. The Sealwright chose people who
*would not break a seal they were told to keep*: steady, kind, unambitious. That is why so many of them are good,
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

### 4.4 The cosmology: Heaven, the husks and the Kept

- **Heaven** (the Kloster's One Light) keeps order by keeping its fire. The six-winged **seraphim** tend it; the word
  means "the burning ones", and in Isaiah 6 a seraph takes a live coal from the altar with tongs. Heaven is not evil
  and not kind: it is *orderly*, and it believes its light is not for the world below.
- **Caelith's mythology stands independently.** He carried a live coal from Heaven's altar to warm freezing people; the Kloster and Vale remember the consequences of his defiance long before the empire existed. Players may compare sacrifice, care or power to the sovereign's choices, but **Caelith is not a coded retelling of the Keeping** and no universal mythic analogy is mandated.
- **The husks** (the Qliphoth) are the ten pieces the heroes cut him into: shells, each holding a crowd of the Kept
  and one of his powers. Each boss guards one. Nahemoth is the crowd of everyone who was **taken on the road**:
  travellers, carters, tollkeepers. That is why the crow knows every route, and why it took the shape of a road bird.
- **The seals** are binding-craft learned from Heaven's stolen pages, drawn in the old lord's own circle. That is why
  Aurevain watches the player.
- **Orin** was a real mason, kept by the old lord after building his seat. When the first seal opened, he came out
  of it, wearing what is left of himself. He recognises the foundations because **his own hands laid them**. He does
  not know that yet.
- **The Broken Oath** are divided in motives. Some believe the Kept endure within the Crown and romanticize its return; other surviving officers care about renewed political control. They are not reliable witnesses about whether bound people are happy.

**Lore rule:** a seal that matters must have a written answer: who is inside it, and what it costs to break. The
player can wait for the answer; the team never does. **Doors are not a motif** (Tokelo, 2026-11-11, see 4.8): a door
in ENSO is just a door.

### 4.5 People who need a past

- **The Crow-Touched Warden: Bran Ashdown.** [Ch1, but only after his death] A jailer at Featherwatch when it was
  the old crown's prison-tower. On the night the crown fell he opened every cell and let the prisoners walk, then
  stayed behind to feed the crows that had always roosted on the walls. The Sealwright chose him for that. His cages
  are the old cells' bars. His name should appear for the first time **on his grave or in Tamsin's mourning line**,
  never before the fight: the player kills "the Warden" and buries Bran.
- **The table set for two.** [late] May point to a lost loved one, working name **Maren**, possibly the first Kept. **Unapproved late-game proposal**, not a required answer or the sovereign's only motive. Who laid the body in the cellar and carved the scratched warning remains an open mystery.
- **Nahemoth, the first aspect.** This is the talking crow awakened by opening the first seal, distinct from the Warden's living birds. It is already named **Nahemoth**. Any later nickname is optional; do not claim the crow is nameless through Chapter One.
- **Shane the Shamed.** He ran the old crown's field hospital in the Vale, which is why his medicines work and why the
  watch has a file on him. He has never told anyone. His farewell stays exactly **"Suffer!"**.
- **Elian.** The proposed personal history is that he lost his sister on the Night of Lanterns. His letter of names (SF5) is a vital **local surviving record**, not the only record of people taken anywhere: Hrimvald's Eydis separately compiles the names of the six hundred. A later voice answering from within the player is a **[mid] proposal**, not a Chapter One fact.

### 4.6 Places to come

These are named so Moss and Cairn can plan around them; none is promised content.

- **The Lantern City** (working name): old Crown capital associated with the Night of Lanterns, a **future** major destination. Chapter Two first follows the eastward route over Frostspine Pass into **Hrimvald**, the Norse-inspired north; the capital need not be Chapter Two's endpoint.
- **The Altar**: Heaven's altar above the Kloster hill. Aurevain came from somewhere and will go back there; this is
  a place, not a door, and it is [late] at the earliest.
- **The ridge seat**: what the homestead was. The five homestead stages (regional bible) slowly uncover it; Orin
  recognises a throne room's footings at stage 4.

### 4.7 Glossary

| Term | Meaning | Who says it |
|---|---|---|
| the old lord, the old crown | the ruler and his realm | everyone |
| the open circle, the ensō | the old lord's brushstroke; closed on a person, it keeps them | the Broken Oath, scholars |
| the Kept | the people he took, alive, into himself | his soldiers, the Broken Oath |
| "Nobody is lost" | the old crown's law | old officials |
| Enso's Last Stand | working game title; possible in-world "last circle" meaning is a **late-game proposal**, not established canon | nobody, until approved |
| the Keeper | scholars' name for the old lord | scholars, the Sworn Band |
| the Breaking of the Crown | the victory, one year ago | heroes, festival |
| the Sworn Band | the five heroes | everyone |
| the Sunbearer | the champion | everyone |
| the Keepers | the ten guardians | the Sealwright, scholars |
| husk, shell | a sealed aspect (a Qliphah) | the crow, scholars |
| the One Light | Heaven, in the Kloster's prayers | the Order |
| six-winged ones | seraphim | old books |
| the Broken Oath | the cult | the watch, villagers |

### 4.8 No door motif (Tokelo, 2026-11-11)

> "I am still not liking this door obsession." (Tokelo)

The first pass of this bible made doors the theme of everything ("everything in ENSO is a door someone was told to
keep shut"), and Chapter One's text followed it: the Cold Door, Doorward, The Door Held Open, the Warden of the Shut
Door, a crow line about breaking a door, Orin hearing doors. Tokelo pushed back on 2026-11-08 and again on
2026-11-11. The ruling:

- **The mystery is carried by the circle and the seals, not by doors.** The old lord *closes* circles on people;
  the heroes *seal* him; the player *breaks* seals. None of those is a door.
- **The seraph's story is about fire.** Seraph means "the burning one"; Caelith carried one live coal down from
  Heaven's altar (Isaiah 6 has a seraph carry a coal from the altar). Renamed in game: the Trial of the Live Coal
  (QS1), Aurevain, Warden of the Altar, Caelith, Keeper of the Altar Fire, Emberward (greatsword), Spear of the Altar
  Fire, and The Coal Carried Down (capstone). Old saves are renamed on load (save format 3).
- **Ordinary doors stay ordinary.** Church doors, cellar doors and cage doors are furniture. Don't give one meaning,
  don't name a weapon, skill, boss or quest after a door or gate, and don't use "behind the door" as a figure of
  speech for the mystery. The Captain's orchard gate and the homestead gate are gameplay, not lore, and stay.
- Internal ids (`heaven_doorwarden`, `fallen_seraphim.door`, the `seal_door` tile) keep their names; players never
  see them.

## 5. How the team works on lore from now on

- **Ownership follows the current AGENTS.md.** Historical named narrative authors may no longer be active; the current narrative owner or assigned studio reviews lore changes. Any PR that adds story, dialogue, item text or map text checks this Bible and updates the appropriate shipped-fact or proposed-lore section without conflating them.
- **The assigned narrative/dialogue writer** keeps voice: short sentences, concrete things, dry humour, no exposition dumps.
  Lore is found in objects (a ledger, a ribbon, a ring of dust) more than told by NPCs.
- **The assigned worldbuilder** checks each new location against world geography and keeps map inspection text in continuity.
- **The assigned QA owner** checks spoiler levels, name consistency, quest routing and whether proposed text is inadvertently marked as shipped.
- **Current chapter briefs:** [Chapter One Development Master Brief](CHAPTER_ONE_DEVELOPMENT_MASTER_BRIEF.md) and [Chapter Two Hrimvald Lore](CHAPTER_TWO_LORE.md) replace this document's older three-item task list. Review their open implementation requirements separately. Any newly shipped fact must be added to the audit in part 1 after verifying source code, not merely because a design PR was merged.

## 6. Decisions for Tokelo

| # | Question | Recommendation |
|---|---|---|
| D1 | What is "Enso"? | ENSO stays a placeholder title (Tokelo, 2026-11-08). In-world, the open circle is the old lord's brushstroke and *Enso's Last Stand* is the last circle (4.1). |
| D2 | Adopt **the Keeping** (4.1): inside every seal are the missing, kept alive inside the old lord, and the player's power is made of them? | **Approved as the direction** (Tokelo, 2026-11-08: "Yes this is a good start"). It replaces "the Unwritten". The team builds on it and deepens it. |
| D3 | The Sworn Band's five roles and working names (4.3) | Keep the roles; the names are easy to swap. |
| D4 | The beloved at the table (Maren) is the last of the Kept, and the final choice | **Unapproved late-game possibility.** Do not make this the sole motive for conquest or preselect a redemption ending. |

Until these are answered, the team builds on the recommendations and keeps them out of shipped text where they are
marked [mid] or [late].

## 7. Research: what the lore people remember has in common (Ashby, Wick, Cairn, 2026-11-08)

| Work | What is sealed away | What ENSO takes from it |
|---|---|---|
| *Fullmetal Alchemist* — the Gate of Truth | Knowledge, paid for with a toll of what you value; each person's Gate looks different | Breaking a seal must **cost** something personal |
| *Hollow Knight* — the Pale King's seal | A forgotten god, sealed inside a living child; the seal fails because the child loved its father | The seal can be a **person**; love breaks seals (the Warden) |
| *Planescape: Torment* — the Nameless One | An amnesiac immortal whose earlier selves did terrible things; his lost mortality became his enemy | The amnesia is **caused by the crime**, not by accident |
| *Berserk* — the Sacrificial Ceremony | Power bought by giving up the people dearest to you; they bear the Brand | The power has to be **made of people** |
| *Dark Souls* — the First Flame | An age kept alive past its time; the last choice is whether to keep it burning | The ending is a choice between **holding on and letting go** |
| *Elden Ring* — the Shattering | A broken order whose shards (Great Runes) are held by demigods the player hunts down | Ten shards, ten holders, one player putting it back together |
| *The Elder Scrolls* | The title names an in-world artifact nobody fully understands, and reading one costs your sight | The title can name a thing in the world (D1) |
| *Frieren* | The story starts after the heroes have won; the hero's statues stand while his memory fades | A post-victory world where remembering is the theme |
| Kabbalah (Lurianic), *qlippot* | Shells that trap sparks of light after the vessels shattered; repair means freeing the sparks | The husks hold the Kept; free them or swallow them |

**Research-history note:** The comparison table above records inspirations considered in the earlier lore research; it is **not** a rule requiring every chapter to be about souls, sacrifice, circles or seals. The regional mythologies stand independently.

**Rules for good reveals** (Jane Friedman, "When and why reveals don't work"): the audience must care about the
characters first; the reveal needs stakes; it must be grounded in clues laid earlier; and it should change what
those earlier clues meant. The Keeping is built to do the last one: it gives a second meaning to the memorial, Elian's
letter, the lanterns, the table, the crows and the Warden's key without changing a word of them.

Sources: [FMA Wiki: The Gate](https://fma.fandom.com/wiki/The_Gate) ·
[Wikipedia: Nameless One](https://en.wikipedia.org/wiki/Nameless_One) ·
[Hollow Knight lore explained](https://rogueranker.com/hollow-knight-lore/) ·
[Berserk Wiki: Sacrificial Ceremony](https://berserk.fandom.com/wiki/Sacrificial_Ceremony) ·
[Dark Souls Wiki: The First Flame](https://darksouls.fandom.com/wiki/The_First_Flame) ·
[Elden Ring Wiki: Lore](https://eldenring.fandom.com/wiki/Lore) ·
[UESP: Elder Scrolls](https://app.uesp.net/wiki/Lore:Elder_Scrolls) ·
[Jane Friedman: when and why reveals don't work](https://janefriedman.com/when-and-why-reveals-dont-work/)

## 8. One mythology per chapter — independent worlds, not Keeping allegories

**Creative Director's direction (9 and 11 November):** Each major land draws on a recognisable cultural and mythological tradition, with distinct characters, local conflicts, architecture, food, worship, monsters, craft, politics, equipment and an optional hidden legendary class. Geography is free to serve the game. The world's actual link across chapters is the **player's return as a former sovereign**, ten guarded Qliphoth aspects and the lasting human/political consequences of the empire's expansion and fall.

**Critical correction:** Do **NOT** make every pantheon another version of the Keeping. Odin, Freyja and Hel are not defined by the old ruler's victims. Sun Wukong's defiance of Heaven is not secretly an interpretation of the ensō. Egypt's divine judgment is not a code for imperial soul-binding. Japanese mythic stories of Yomi are not mandatory "letting go" lessons for the protagonist. Mythic worlds may react to the sovereign **when they genuinely intersect with the chapter's events**, but have histories and motives of their own.

| Chapter/region | Independent world and mythic conflict | Relation to fallen empire | Legendary progression | Status |
|---|---|---|---|---|
| **1: Blackbriar Vale** | Germanic village life, Briarwell Kloster, **Caelith's Live Coal**, faith, food and trade | Shamefield remembers both order and disappearances; Broken Oath pursues the first fragment; Warden protects it | **Fallen Seraphim**, existing hidden web | Caelith and much of Ch1 shipped; expansion [proposed] |
| **2: Hrimvald / the North** | Norse-inspired fjords, families, assemblies, feuds, skalds; Odin, Freyja, Hel, draugar and jötnar have distinct roles | The Silent Field lost six hundred to the Keeping; Hallvard protects the second fragment; regional politics continue independently | **Allfather's Chosen** [proposed] | Full [chapter design](CHAPTER_TWO_LORE.md), only implemented elements verified in code count as shipped |
| **Later: Chinese-inspired region** | The celestial bureaucracy, local kingdoms, rival schools, Sun Wukong and other myths have their own stakes | Former Crown officials/forces may reach or oppose it; define a specific plot rather than forcing a Keeping reflection | **Great Sage** [proposed] | Broad concept only |
| **Later: Egyptian-inspired region** | Duat, divine kingship, ancestral beliefs, deserts, trade, judgment and independent factions | Imperial campaigns or alliances are one possible source of conflict | **Black Pharaoh** [proposed; already appears in class concepts] | Broad concept only |
| **Later: Japanese-inspired region** | Yomi, kami, local courtly and martial traditions, distinct histories and spirit stories | Establish a natural political or personal link if the campaign visits | To design | Broad concept only |

**Mythology writing rule:** Start with **what the region's people want, fear, trade, worship, celebrate, disagree about and remember**, then build the conflicts. Only afterwards ask how the player's actions and Qliphoth hunt interrupt their lives. Do not invent ten similar rulers, ten identical tragic guardians or ten magical corridors. Keep legendary classes independently attractive to every base class, with unlocks appropriate to the local myth and trial/balance checks.

**Historical and cultural note:** Research the real traditions; ENSO remains original fiction and should not present flattened game mechanics as authoritative religious history. See Chapter Two lore §3 and §13 for the Norse research guardrails.

## 9. Chapter Two — Hrimvald / The Feast of Empty Seats (current design reference)

**The full proposed Chapter Two story is [CHAPTER_TWO_LORE.md](CHAPTER_TWO_LORE.md).** It supersedes the older one-boss outline previously stored here. This is a lore-bible **summary of proposed narrative**, not a declaration that 14 quests, six bosses and all locations are already playable. Consult current world, quest and test files for the subset that has shipped.

**Arrival:** Following Nahemoth east after Q08, the player crosses Frostspine Pass into the Norse-inspired Hrimvald, arriving near **Skeldvik Harbor**. Odin's two ravens begin observing the stranger, but Nahemoth is not their subordinate.

**The North is alive:** Hrimvald has independent fjord trade, fishing fleets, farms, smithies, burial customs, law assemblies, feasting, poetry and unresolved kinship disputes. The core places are **Skeldvik**, **Hrafnholm** (jarl's hall), **Birkholt**, **Járnmyr**, **Gullstrand Coast**, **Rúnadal**, **Nine-Winds Ash**, **the Silent Field** and **Hallvard's Barrow**. These people have their own quarrels and histories, including older supernatural threats unrelated to the old Crown.

**The principal human conflict:** **Jarl Ragnhild Frostmark** tries to hold regional stability while **Torvald Redhand**, grieving his brother and craving military power, courts aggressive factions and Broken Oath remnants. **Eydis Namesinger** collects the names of the vanished; **Yrsa Thornstaff** is a seeress, not an infallible exposition machine; **Runa** is Hallvard's surviving daughter. A regional assembly and a memorial feast become the chapter's political and emotional center.

**The imperial wound:** At the **Silent Field**, twenty years earlier, the former sovereign's forces bound **six hundred northern warriors**. Their losses upset families, current succession politics and the expected afterlives. The central mystery concerns their missing souls, but not every barrow, draugr or god in Hrimvald is caused by the Keeping.

**The second guardian:** **Hallvard the One-Handed**, a respected skald and survivor, was entrusted with the second fragment and resists the player. He bears grief and a secret: he tried to negotiate a surrender that failed to save his men. Unlike Chapter One's Bran, he is proud, compromised and burdened by shame. He is genuinely motivated to protect others; his role is not another identical kind Warden.

**Act structure, 14 proposed main quests:** (I) Frostspine and Skeldvik, (II) political confrontation at Hrafnholm and the Járnmyr burial mound, (III) **the Feast of Empty Seats** and Broken Oath raid, (IV) the Silent Field, Torvald confrontation and Hallvard's Barrow, (V) the fate of the six hundred, Hrimvald's political aftermath and a Sunbearer epilogue. The design targets **ten substantial side quests**, three main combat bosses (**Bjarki, Torvald, Hallvard**) and three optional/legendary bosses (**Hrimhild, Skögul, the Salt-Dead Captain**).

**Independent Norse myth:** **Odin, Freyja and Hel** do not form one identical afterlife system; each responds from their own traditions. Odin's ravens, a seeress, jötnar, draugar and skalds belong to Hrimvald's own world, not an imperial symbolic apparatus. The optional **Allfather's Chosen** legendary web proposes nine varied trials with genuine sacrifice, not nine identical rest actions. Its exact mechanics are pending review.

**The first large branching consequence proposed:** The player may retain the power of the bound six hundred, angering local families and gods; or release them to different appropriate fates at genuine cost and gain a distinct blessing. **A separate political outcome** determines who rules and how Hrimvald will relate to the player. These must remain independent choices, not one simplistic good/evil slider. Aspect Two's working name is **A'arab Zaraq**; neither exact power, permanent loss numbers nor subsequent aspects are finalized here.

**Identity rule:** Chapter Two must NOT reveal the player was the former emperor. The recovered memory may show the crime and hint at familiarity, but cannot unambiguously show the player issuing the order.

**Sequel consequence:** The Sunbearer investigates evidence that guardians are dying and the ruined Homestead is stirring. This is the continuing story of the Crown's possible return, not the revelation that every northern god was secretly guarding one metaphor.

**Status note:** All new personal names, settlements, political branches, quest counts and regional boss additions listed here derive from the **Director-requested Chapter Two design** and remain **proposed until approved/implemented**. Existing shipped first-stage route and world updates must be verified in the repository before moving their facts to Part 1.

Sources for 8 and 9: [Wikipedia: Einherjar](https://en.wikipedia.org/wiki/Einherjar) ·
[Wikipedia: Þökk](https://en.wikipedia.org/wiki/%C3%9E%C3%B6kk) ·
[Journey to the West Research: the register of births and deaths](https://journeytothewestresearch.com/tag/underworld/) ·
[World History Edu: Sun Wukong](https://worldhistoryedu.com/sun-wukong-in-chinese-mythology-origin-story-powers-abilities-importance/)


## 10. Chapter One — Ashes Beneath the Sun (director-requested development direction)

**Full reference:** [Chapter One Narrative Rework](CHAPTER_ONE_NARRATIVE_REWORK.md) and [Chapter One Development Master Brief](CHAPTER_ONE_DEVELOPMENT_MASTER_BRIEF.md). The current shipped route remains the separate [Chapter One implementation guide](../CHAPTER_ONE.md). A merged design document is **not evidence that the quest or dialogue is live**.

**Dramatic spine proposed:** A stranger wakes at a recently searched Homestead; imperial salvagers and a missing toll register point to a **Broken Oath** operation. **Shamefield** is a working German-inspired village whose people disagree honestly about the old Crown. A **Festival of the Sun** celebration and memorial become the stage for a cult attack on records and people. The player investigates, confronts an ex-imperial supply officer, reaches Featherwatch, then knowingly defeats a genuinely protective Warden for the first aspect.

**Character additions / continuity:** **Corvin Sere** is the proposed cult organizer (former logistics officer who surrendered and now seeks restored authority); **Sergeant Kess, the Ash-Marked** is a proposed named lieutenant. Neither knows the player's identity. The **Watch Captain remains drunk, lazy and frequently aggravating**, while taking genuine road safety and village defense seriously at crisis points. **Shane** stays optional, medically skilled and darkly comic: his normal farewell remains **"Suffer!"**. Tamsin remembers the Warden's kindness; Elian remembers ordinary victims. Bran's personal name is first revealed **after death**, and ordinary crows mourn him.

**Five new proposed quest layers:** The Price of the Ruins; The Ash on the Register; The Festival in Ash; An Oath in Ash; A Sanctuary Under Siege. With the existing nine named main entries, this is **14 proposed entries**, **not 14 newly shipped quests**. The festival is both culture and a meaningful attack with protect-people versus pursue-courier consequences.

**Cooking / economy principle:** Keep **all six SF1–SF6** household favors, farming, baking, brewing, food buffs and Gold/XP opportunities. A **short practical food-buff tutorial** belongs in the story; the longer household arcs should be optional, not a mandatory six-step barrier to Featherwatch. The current meal example is **Leberkäsbrötchen**, crafted from Pork and Brötchen; exact live values belong to game data. A story-investigation route and optional village-trust route should open the orchard, with mandatory XP, class survival, save migration and old SF6 state tested before implementation.

**Other approved design areas (not yet shipped by this Bible):** Readable quest objectives and reliable inspection events; combat encounters teaching distinct counterplay; short NPC-to-NPC scenes; four optional exploration secrets with genuine loot; visible Homestead rebuilding, conditional Shane stall, Orin's growing presence and future visitors. The first Homestead gate repair remains **free**.

**End of Chapter One:** The Warden is dead; the first seal was opened, triggering Nahemoth/Black Flight; Orin begins rebuilding; Shamefield, the Broken Oath and the Sunbearer respond; Q08 sends the player east toward Hrimvald. The player's former identity remains hidden.

## 11. Cross-chapter rules and canon status (11 November 2026)

1. **Central throughline:** Fall and possible return of the sovereign, the empire's legacy, the ten aspects and their guardians, human and divine repercussions, alliances, ambition and the cost of power.
2. **Independent places and mythology:** Every realm existed before this character and will exist afterward. Caelith, Norse gods and future Chinese/Japanese/Egyptian figures are not alternate masks of a single Keeping/door story.
3. **Canon layers:** Part 1 of this Bible records verified shipped dialogue/quest facts; part 4 and §§8–10 include proposals and director-endorsed design directions. Do not move an event into shipped canon merely because its design PR merged. Verify code and tests.
4. **Spoiler thresholds:** [Ch1] = currently safe to hint, [Ch2] = safe to discuss in the North; [mid] = first unambiguous ruler reveal at Guardian Five/Six; [late] = personal origin / Maren / final decisions. No earlier quest, NPC or UI tooltip may disclose a later reveal.
5. **Political agency:** Helping civilians, rebuilding a base and entering faction bargains can all be tools of a future dark ruler. The protagonist is not required to seek redemption, and heroes are not retroactively made monsters.
6. **Guardian variety:** Bran is compassionate, Hallvard grieving and compromised; later guardians need different personalities, obligations and reasons to resist.
7. **Continuity ownership:** Check active AGENTS.md, source code and merged PRs; historical agents named in this lore bible may no longer own live work.
8. **No door allegory:** §4.8 remains controlling. Ordinary doors and gates are just architecture; art, equipment, quests and myth should not reintroduce universal threshold metaphysics.

**Current source documents:** [CHAPTER_ONE_NARRATIVE_REWORK.md](CHAPTER_ONE_NARRATIVE_REWORK.md) · [CHAPTER_ONE_DEVELOPMENT_MASTER_BRIEF.md](CHAPTER_ONE_DEVELOPMENT_MASTER_BRIEF.md) · [CHAPTER_TWO_LORE.md](CHAPTER_TWO_LORE.md).
