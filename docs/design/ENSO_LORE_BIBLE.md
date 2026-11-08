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

1. **What "Enso" is.** It is the game's name and nothing in the game or the docs says what it means. *(Answered in 4.1.)*
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

### 4.1 The core: the Keeping (rewritten 2026-11-08 after research; supersedes "the Unwritten")

> "But the door just a cold wind??? ... do research on gaming, RPG and anime lore and come back to me with actual
> good lore." (Tokelo)

The first answer ("behind the door is a cold blank") failed because it was **impersonal**: nothing behind the door
mattered to anyone in the game. The research (part 7) points at one rule shared by the lore people remember:
**what is behind the door has to be about people the player already met, and it has to cost the player something.**
Fullmetal Alchemist's Gate takes the thing you love, Hollow Knight's seal is a living child, Planescape: Torment's
amnesiac hero finds that the price of his power was paid by others, and Berserk's power comes from sacrificing the
people closest to you. So:

**Behind every door are the missing.**

**The old lord could open people.** He would draw the open circle (the ensō, the brushstroke) on a person, and the
circle became a door. Through it he could take what was inside: their life, their memories, their name. He did not
kill them. He **kept** them, inside himself. Every person he took became part of his power: their strength in his
arm, their memories in his head, their skills in his hands. His soldiers called them **the Kept**.

**Why he did it (his reason must make sense).** It started with one person. The one he loved fell ill, and he would
not let them die, so he learned how to open a door in them and keep them. The table in the old house is set for
two because **that was their house**. Once he knew how, he could not stop: nobody he loved would ever be lost again,
then nobody he ruled. His law was **"Under the crown, nobody is lost."** He believed he was ending death. To everyone
else, whole streets simply emptied.

**What this explains in shipped text (nothing has to be rewritten):**

| Chapter One line | What it really means | Spoiler |
|---|---|---|
| "Whole streets emptied when he gave the word." | He took them, alive, into himself. | [mid] |
| Memorial: "No names: the list was too long to carve." | Nobody can *remember* the names. Taking a person takes their name out of other people's memories too. The villagers think they forgot; they were robbed. | [mid] |
| Elian's letter of people "who never arrived anywhere" | Elian wrote names down on the road before the Night of Lanterns, which is why he still has some. His letter is the only list of the Kept in the world. | [Ch1] the letter; [mid] why it matters |
| First memory: the lanterns go out one by one | Each lantern is a person being taken. | [Ch1] the image; [mid] the meaning |
| Glowing hands; "...WHO SLEEPS HERE IS NOT TO BE..." | His hands are where the circle is drawn. The inscription ends "...WOKEN". | [Ch1] |
| The table set for two | The beloved, the first of the Kept. | [late] |
| The crows are afraid of him | Animals can hear the Kept. | [mid] |
| The Warden "was given the key and told never to use it" | His seal holds a tenth of the Kept. Opening it lets them back into the player, and the player gets stronger. | [mid] |

**What the heroes did.** At the gates, the Sworn Band could not kill him without killing everyone inside him. So
the Sealwright cut him into ten pieces, each piece a **husk** holding part of his power and part of the Kept, and
locked each behind a seal drawn in his own circle. He lost his memory because **his memories were the Kept**: their
lives had filled the place where his own should be. Each seal the player opens gives back power and a fragment of
memory because it gives back a crowd of people.

**Why the Qliphoth fit.** In Kabbalah (Lurianic tradition), the *qlippot* are **shells that trap sparks of light**,
born when the vessels holding that light shattered; the work of repair is to free the sparks. ENSO borrows that
shape, not the religion: each husk is a shell holding the Kept. The player can **free the sparks or swallow them**,
and that is the moral question of the whole game, put in mechanical terms.

**The choice the game is built toward.** Every seal opened makes the player stronger because the Kept flow back in.
Late in the game the player learns they can also **let them go** through the open circle, and each person let go
is gone from the player's power for good. The beloved is the last one inside. **Enso's Last Stand** (placeholder
title) is that final door: keep everyone and rule as the old lord did, or open the circle and lose them all,
including the one he did it for. The Sunbearer's whole quest is to free the Kept; that is what makes the hero right
without making the player a cartoon. Endings stay Tokelo's call.

**What the open circle means now.** It is his brushstroke: one stroke, never closed, because there was always one
more person. Ensō in Zen is the circle of a single breath; his is the circle of a single appetite. The Broken Oath
scrape it to call him home; the Kloster carves the *closed* circle on its graves, the sign of a life that ended and
was let go.

### 4.2 A short history of the world

| When (from now) | What happened | Spoiler |
|---|---|---|
| ~1000 years | **The Cold Door.** Heaven keeps its warm country shut behind a door; outside, a winter that does not end. Caelith, its keeper, opens it for the freezing; spring runs down the hill. Caelith falls and the hill closes over it. The Vale is green because a seraph disobeyed. | [Ch1] (Caelith says it) |
| ~700 years | **Sankt Alban**, a hermit, digs a spring on the hill and finds a hooded stone figure in it. He builds a chapel round it; the brothers who follow him become **the Order of Briarwell**. They take the statue for a nameless saint and copy its folded hands on every saint they carve. Their rule: "for the living, and against the winter". | [Ch1] hints |
| ~60 years | **The house on the ridge.** Two people live in a small house above Blackbriar Vale. One falls ill. The other finds, in the hill's old doors, a way to keep them. | [late] |
| ~50 years | **The rise of the old crown.** The one who kept his beloved learns to keep soldiers' strength, then scholars' knowledge, and conquers with it. Roads, tollways, prison-towers: his. A mason named Orin lays the foundations of a great seat around the little house, and is later kept himself. | [Ch1] ruins; [mid] the seat; [late] Orin |
| ~25 years | **The Night of Lanterns.** In the capital, a festival street is taken in one night: the first time thousands are kept at once. The first memory fragment. | [Ch1] the image; [mid] the truth |
| ~25 to 2 years | **"Nobody is lost."** No funerals under the crown, and no one can say where the missing went. Some loved the safety: roads safe, tolls fair, bread cheap. | [Ch1] |
| ~2 years | **The Sworn Band** forms (4.3). The Sealwright steals the cut pages of *On the Six-Winged Ones*: the seraphim's way to make a door that stays shut. | [mid] |
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

### 4.4 The cosmology: Heaven, the husks and the Kept

- **Heaven** (the Kloster's One Light) keeps order by keeping doors. Its doorkeepers are the six-winged **seraphim**.
  Heaven is not evil and not kind: it is *orderly*, and it believes the dead belong behind a door.
- **Caelith and the old lord are mirror images.** Both learned to open doors. Caelith opened one to **give** (spring
  to the freezing) and fell for it. The old lord opened people to **keep** them. A player who wakes the Fallen
  Seraph and breaks the seals carries both kinds of opening, and the web's question "what is evil?" lands on them.
- **The husks** (the Qliphoth) are the ten pieces the heroes cut him into: shells, each holding a crowd of the Kept
  and one of his powers. Each boss guards one. Nahemoth is the crowd of everyone who was **taken on the road**:
  travellers, carters, tollkeepers. That is why the crow knows every route, and why it took the shape of a road bird.
- **The seals** are door-craft learned from Heaven's stolen pages, drawn in the old lord's own circle. That is why
  Aurevain watches the player.
- **Orin** was a real mason, kept by the old lord after building his seat. When the first seal opened, he came out
  of it, wearing what is left of himself. He recognises the foundations because **his own hands laid them**. He does
  not know that yet.
- **The Broken Oath** know what the circle does. They believe the Kept are alive and happy inside him, and that the
  heroes murdered them all by sealing him. They are wrong about the happy part.

**Lore rule:** a door, gate or seal that matters must have a written answer: who is behind it, and what it costs to
open. The player can wait for the answer; the team never does.

### 4.5 People who need a past

- **The Crow-Touched Warden: Bran Ashdown.** [Ch1, but only after his death] A jailer at Featherwatch when it was
  the old crown's prison-tower. On the night the crown fell he opened every cell and let the prisoners walk, then
  stayed behind to feed the crows that had always roosted on the walls. The Sealwright chose him for that. His cages
  are the old cells' bars. His name should appear for the first time **on his grave or in Tamsin's mourning line**,
  never before the fight: the player kills "the Warden" and buries Bran.
- **The table set for two.** [late] Answered in 4.1: the beloved, the first of the Kept, who is still inside the
  player at the end. Working name **Maren**. Whoever laid the empty sleeper in the cellar (most likely the Sunbearer
  or the Sealwright) carved the warning, then tried to scratch it out so nobody would come looking.
- **The crow.** It refuses a name until the second seal opens, then picks one it likes ([mid]; suggested: **Mourn**).
- **Shane the Shamed.** He ran the old crown's field hospital in the Vale, which is why his medicines work and why the
  watch has a file on him. He has never told anyone. His farewell stays exactly **"Suffer!"**.
- **Elian.** Lost his sister on the Night of Lanterns. His letter of names (SF5) is the only list of the Kept anyone
  has. Later, a name on it can answer from inside the player.

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
| the open circle, the ensō | the old lord's brushstroke; drawn on a person, it opens them | the Broken Oath, scholars |
| the Kept | the people he took, alive, into himself | his soldiers, the Broken Oath |
| "Nobody is lost" | the old crown's law | old officials |
| Enso's Last Stand | placeholder title: the final door, the choice to keep the Kept or let them go | nobody, until [late] |
| the Keeper | scholars' name for the old lord | scholars, the Sworn Band |
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
| D1 | What is "Enso"? | ENSO stays a placeholder title (Tokelo, 2026-11-08). In-world, the open circle is the old lord's brushstroke and *Enso's Last Stand* is the final door (4.1). |
| D2 | Adopt **the Keeping** (4.1): behind every door are the missing, kept alive inside the old lord, and the player's power is made of them? | **Approved as the direction** (Tokelo, 2026-11-08: "Yes this is a good start"). It replaces "the Unwritten". The team builds on it and deepens it. |
| D3 | The Sworn Band's five roles and working names (4.3) | Keep the roles; the names are easy to swap. |
| D4 | The beloved at the table (Maren) is the last of the Kept, and the final choice | Yes; the endings themselves stay open. |

Until these are answered, the team builds on the recommendations and keeps them out of shipped text where they are
marked [mid] or [late].

## 7. Research: what the lore people remember has in common (Ashby, Wick, Cairn, 2026-11-08)

| Work | What is behind its "door" | What ENSO takes from it |
|---|---|---|
| *Fullmetal Alchemist* — the Gate of Truth | Knowledge, paid for with a toll of what you value; each person's Gate looks different | A door must **cost** something personal |
| *Hollow Knight* — the Pale King's seal | A forgotten god, sealed inside a living child; the seal fails because the child loved its father | The seal can be a **person**; love breaks seals (the Warden) |
| *Planescape: Torment* — the Nameless One | An amnesiac immortal whose earlier selves did terrible things; his lost mortality became his enemy | The amnesia is **caused by the crime**, not by accident |
| *Berserk* — the Sacrificial Ceremony | Power bought by giving up the people dearest to you; they bear the Brand | The power has to be **made of people** |
| *Dark Souls* — the First Flame | An age kept alive past its time; the last choice is whether to keep it burning | The ending is a choice between **holding on and letting go** |
| *Elden Ring* — the Shattering | A broken order whose shards (Great Runes) are held by demigods the player hunts down | Ten shards, ten holders, one player putting it back together |
| *The Elder Scrolls* | The title names an in-world artifact nobody fully understands, and reading one costs your sight | The title can name a thing in the world (D1) |
| *Frieren* | The story starts after the heroes have won; the hero's statues stand while his memory fades | A post-victory world where remembering is the theme |
| Kabbalah (Lurianic), *qlippot* | Shells that trap sparks of light after the vessels shattered; repair means freeing the sparks | The husks hold the Kept; free them or swallow them |

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
