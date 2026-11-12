# Chapter Two narrative review: C2-01, C2-02 and the politics of Hrafnholm

**Who:** Ashby (narrative director), Wick (writer), Cairn (world builder). **When:** 2026-11-11.
**Asked by Tokelo:** "Review the first two implemented quests against the proposal, refine dialogue and establish the
political relationships needed for Hrafnholm."
**Read against:** [CHAPTER_TWO_LORE.md](CHAPTER_TWO_LORE.md) (the proposal), [ENSO_LORE_BIBLE.md](ENSO_LORE_BIBLE.md)
(canon, sections 4.1, 4.8, 8 and 9), [docs/ui/DIALOGUE_BOX.md](../ui/DIALOGUE_BOX.md) (two sentences a page).
**Built on:** PR #242 (Act I, merged) and PR #246 (Skeldvik rebuilt after Tokelo's reference map, open when this was written).

## 1. Verdict

Both quests do what the proposal asks. C2-01 has the caravan, Eydis, the Roll, the stolen tablet and a fight every
class can win, and the crow's raven line is word for word. C2-02 has Eydis, Leif, a witness and a merchant, a tablet
choice with three outcomes that never block the story, and the evidence pointing at the Wolf-Banner. The draft voices
were already good. Eydis, Hakon, Leif and Solveig each sound like one person, and nobody explains the plot to the
player.

The review found **four places where the draft contradicts canon or itself**. It also found that **the succession
dispute the proposal asks C2-02 to set up was almost absent**. It was there in one line from Solveig and half a line
from Eydis, and Hrafnholm cannot open without it. Both are fixed in this change. Section 4 then sets out the
political map C2-03 needs.

## 2. Quest by quest

### C2-01 The Frostspine Road

| The proposal asks for | In the game | Verdict |
|---|---|---|
| Q08 sends the player east with Nahemoth | Q08's objective points at the east track and finishes when you enter the pass | Done |
| A funeral caravan overturned, raiders searching for a name tablet | Wrecked wagon, biers, Wolf-Banner raiders over Asta's body | Done |
| Introduce Eydis and the Roll of the Six Hundred | Eydis hides by the fire, then explains the Roll | Done. Her account of where the names come from contradicted canon (ruling R1) |
| Rescue survivors, recover the tablet, a combat route for every class | Two fights, the second is the gate, and the tablet is picked up from the bier | Done |
| Payoff: memorial records are being stolen, and the road to Skeldvik opens | Eydis: "the third taken since midsummer"; Ulfrun holds the gap | Done |
| Crow beat and Odin's ravens begin observing | The crow's line on entering, and the ravens watch Ulfrun leave | Done |

Ulfrun is the strongest beat in the quest: the gate boss is a grieving cousin of the caravan's own village. Her last
line was three sentences in one box and is now split. Her new last words ("the names are part of it") are the first
hint of why Torvald wants the Roll (section 4.3).

### C2-02 Salt and Silver

| The proposal asks for | In the game | Verdict |
|---|---|---|
| Speak with Eydis, Leif, harbour witnesses and a merchant | Eydis, Leif (shipwright), Solveig (fish-seller and witness), Thora (reeve) | Done |
| Confirm other memorial thefts | The split board on Skeldvik's stone and Solveig's account | Done. The count of thefts disagreed with itself (R4) |
| Choice: guards, Eydis or keep the tablet; trust and dialogue change, nothing breaks | `tablet_with_reeve`, `tablet_with_eydis`, `tablet_kept`; Thora and Eydis react | Done. Section 5 says what each one does at Hrafnholm |
| Evidence ties the attacks to the Wolf-Banner **and the growing succession dispute** | The Wolf-Banner link was strong (Leif's old Crown silver). The succession was almost missing | **Fixed**: Thora explains the high seat, Geir makes Torvald's case, Eydis names everyone the player will meet |
| Skeldvik shows repaired ships, an old imperial customs stone and more armed private crews (2.2) | All three are on the map | Done |

## 3. Rulings where the text disagreed with canon

**R1. Names live in wood, not in people.** Canon (bible 4.1, a [mid] secret): when the old lord keeps someone,
their name is taken out of other people's memories too. In Chapter One the village memorial has no names: "the list
was too long to carve." The draft had Northern families cutting the names *after* the battle from memory. Under
canon they could not have done that. **Ruling:** in Hrimvald, *the morning a host marches, every steading cuts its
warriors' names on a board to count them home.* The boards were cut before the Keeping, so they still hold the
names (the same reason Elian's list survives in Chapter One). The families cannot say the names without the boards,
and they blame grief. That is now in the text as a symptom, never as an explanation:
- Asta could describe every stitch of her husband's cloak, but read his name off the board with her thumbs.
- Solveig "can't say it without the board". Leif's hands remember his brother's mark but not his name.
- Some families "swear their board is missing someone, and can't tell me who".

This also gives the theft a cold logic that the player can work out later: a stolen board is a name nobody in the
world can say any more. Asta "recut" the worn names in the old grooves; she did not cut them new.

**R2. Hallvard is the only one who walked off the Silent Field** (bible 9). The draft had Eydis talk about "the ones
who came back". **Ruling:** Hallvard is the only fighter who came back. The other witnesses were wagon boys and
wives watching from the ridge, which is why their nine accounts disagree. Eydis now says so. The line introduces
Hallvard and Runa early and shows that he refuses to give his own account. C2-11 and C2-13 depend on that.

**R3. No bodies.** The proposal's logline says the six hundred's "bodies died". Canon says the old lord kept people
alive inside himself and the valkyries "found the field empty". **Ruling:** canon wins; there were no bodies. Eydis
says "not dead on the grass, just gone", and the old songs say the choosers of the slain "found nobody to choose".
Proposal 3.1 should be read that way.

**R4. How many boards have been stolen.** Eydis said Asta's was the third and Skeldvik's the fourth, but C2-02's
closing line said "three harbours, three boards". **Ruling:** there are four: two up the coast, Asta's on the road
and Skeldvik's. The closing line now says that.

**R5. The "dying ruler".** The proposal's logline speaks of "a dying ruler's succession", but its cast list has
Ragnhild ruling, healthy, into the endings. **Ruling:** nobody is dying. The crisis comes from a ruler who was
never buried (section 4.1). That fits the chapter's question better: *who has the right to command the dead?*

**Smaller fixes.**
- **Two sentences a page.** Every spoken line in both quests now fits one page of the dialogue box: at most two
  sentences and about 160 characters. A test checks it. Before, about a third of the lines ran to three or four
  sentences and were split mid-thought by the box.
- **"The Thing".** The assembly is called *the Thing*, from the Old Norse *þing*. We keep the þ glyph out of player
  text so that every font can show it.
- **Valhalla.** Nobody in these quests says the six hundred belonged to Odin's hall. The proposal (3.2) has
  Freyja and Hel contest Odin's claim, so the neutral "choosers of the slain" is used.
- **No door motif.** None is used, and the test from #242 still checks for it. **No identity reveal.** None is
  made: nobody in Hrimvald knows who the player is, and Eydis's "doesn't remember where" stays ambiguous.

## 4. Hrafnholm: the political map (Cairn, for C2-03)

### 4.1 The seat and the law

**Jarl Eirik Frostmark** led the host to the Silent Field and did not come back. His skald, **Hallvard**, marched
beside him. **Ragnhild Frostmark**, his wife, has held Hrafnholm for twenty years.

The custom the whole conflict turns on is the **grave-ale** (Old Norse *erfi*), the inheritance feast. In the sagas,
an heir sits on the step below the high seat and takes the seat only once the memorial cup has been drunk for the
dead man. With no body, no one has drunk Eirik's grave-ale, so no heir has taken his seat. It is the same for
six hundred households: there has been no grave-ale, no inheritance and no widow free to remarry. Birkholt's farms
have waited twenty years to be divided (proposal 2.2).

**The law of twenty winters** (invented for ENSO, inspired by the real *erfi*, inheritance law and the Thing): a
person missing for twenty winters may be declared dead by the Thing, and then their grave-ale can be drunk. This is
the twentieth winter, which is why everything comes to a head now.

| Party | What they want the Thing to do | Why |
|---|---|---|
| **Ragnhild** | Declare the six hundred dead. Drink the grave-ale, settle the inheritances and pass the high seat. | Peace, law and trade. She wants to bury her husband at last. She is the careful one, and what she asks for is an ending. |
| **Torvald Redhand** | Refuse. They are not dead, they are *gone*, and the North should march to the Silent Field and bring them home. | His brother Arni is among them. He believes there is a way back, and southern friends have told him the names are needed for it. |
| **Sigrun Frostmark** | Not be made jarl by her father's funeral. She wants the Thing to choose her for herself, or not at all. | She resents being the heir everyone talks over. Runa Hallvardsdottir is sworn to her. |
| **Arnkel the Lawspeaker** | Hear every claim and recite the law; he has no side. | He is the believable authority for "independent investigation" at C2-03 and for legal judgment at C2-10 and C2-12. |
| **The families** | Both answers, which is the point. | Hakon wants Asta's Ketil buried. Ulfrun, from the same village, wants her brother back. Solveig is "tired of careful". |

This reversal is the backbone of Act I. The careful ruler is the one asking to let the dead go, and the angry
war-chief is the one refusing to. It sets up the chapter's spiritual choice (keep the host or release it) without
saying a word about it. The two axes stay independent, as the proposal requires: a player can back Ragnhild's law
and still keep the host, or march with Torvald and still let them go.

### 4.2 Who is tied to whom

| Person | Bloc | Ties | What they hide (spoiler tier) |
|---|---|---|---|
| Ragnhild Frostmark | Hall | Eirik's widow; Sigrun's mother; Thora is her reeve at Skeldvik | Has kept quiet a rumour that Hallvard tried to surrender the host, to protect his legend and the peace [Ch2, C2-11] |
| Sigrun Frostmark | Hall, her own way | Runa is sworn to her; she likes Eydis | Has been talking to Torvald behind her mother's back [Ch2, C2-06] |
| Torvald Redhand | Wolf-Banner | Brother Arni among the six hundred; Ulfrun and Geir follow him; paid through Osric Vane | Knows his silver is the old Crown's and has decided not to care [Ch2, C2-04/06] |
| Osric Vane | Broken Oath (hidden) | A southern factor in Hrafnholm; lends to Leif and pays the Wolf-Banner crews in old Crown plate | The Broken Oath's money and "rituals" for Torvald. The alliance is tactical and will break [Ch2, C2-04] |
| Arnkel the Lawspeaker | None | Recites the law at the Thing; both sides court him | None. He is the one honest instrument, and that is his use |
| Eydis Namesinger | Independent | The Roll; the families trust her; Ragnhild wants her quiet this year | Her records contradict the official war songs (proposal 4.1) |
| Hallvard the One-Handed | None (Keeper) | Was Eirik's skald; Runa's father; keeps the barrow | The surrender he tried to negotiate; the seal [Ch2, C2-13] |
| Runa Hallvardsdottir | Hall (Sigrun's) | Sworn to Sigrun; asks Eydis what her father saw | Doesn't know why he changed |
| Thora Half-Oar | Hall | Ragnhild's reeve; eight guards against sixty oars | None |
| Leif Ropehand | Skeldvik | Owes three households and Osric Vane; built a hull for the Wolf-Banner | His brother's mark on every keel |
| Bjorn Ironvein | Járnmyr | Sells iron to middlemen who sell to both sides | That the iron goes to raiders [Ch2, C2-04] |
| Yrsa Thornstaff | Rúnadal | Both sides consult her | Her visions contradict each other |

### 4.3 Why Torvald wants the names (layered, so each act reveals more)

1. **What Act I shows:** "Redhand is gathering every name, so that when he goes to the Field, nobody gets left
   behind" (Geir), and "the names are part of it" (Ulfrun).
2. **Politics (C2-03):** the Roll is the legal list of whom the Thing would declare dead. Whoever holds the boards
   decides whose grave-ale can be drunk. Without them, Ragnhild cannot settle a single inheritance.
3. **Broken Oath (C2-04 to C2-06):** Osric Vane told Torvald that the names are needed to call the six hundred
   back. That is half true, and it is the Broken Oath's own interest [Ch2].
4. **The truth ([mid], not in Chapter Two):** a name cut before the Keeping is one of the few things that still
   points at a kept person (bible 4.1). Chapter Two never explains this.

### 4.4 The three first positions at C2-03 (proposal C2-03)

| Position | At the Thing | Who warms to the player | Who cools |
|---|---|---|---|
| **Support Ragnhild** | Declare the six hundred dead and let the families bury them | Ragnhild, Thora, Hakon's Birkholt | Torvald, Geir, Ulfrun; Sigrun if the player treats her as an heir-shaped object |
| **Sympathise with Torvald** | Refuse the verdict and send people to the Field | Torvald, the Wolf-Banner, Solveig | Ragnhild; Arnkel if the player is threatening |
| **Ask for an independent investigation** | Ask Arnkel to put off the verdict until someone has seen the Field and the barrow | Arnkel, Eydis, Sigrun | Neither side fully. This is the main road and never closes |

The main story goes through the investigation whatever the player chose (C2-04 onward), so no position can
softlock the chapter. The position decides who welcomes the player in Hrafnholm (a bench in the hall, lodging,
the Lawspeaker's ear), and what each of them says.

## 5. What C2-02 already decided, as Hrafnholm will read it

No new save fields are needed. Hrafnholm reads the flags Act I already writes, so every existing save works.

| Flag (already in saves) | At Hrafnholm |
|---|---|
| `tablet_with_reeve` | Thora has written to Ragnhild about the stranger who trusted the law. The hall receives the player first, and Eydis is cool at the Thing. |
| `tablet_with_eydis` | Eydis reads Birkholt's names first, and the families greet the player. Ragnhild asks why a foreigner gave evidence to a skald and not to her. |
| `tablet_kept` | Eydis expects the player at her side when she reads. Torvald's people try to buy the board, then to take it, and Ragnhild asks for it formally. It stays a choice. |

Optional flags added by this review let the player say things at the Thing they could only know from Skeldvik.
None of them is ever required:

| Flag | Set by | Opens at Hrafnholm |
|---|---|---|
| `heard_of_succession` | Thora, "Whose law is it?" | The player can raise the grave-ale and the twenty winters before anyone explains them |
| `wolfbanner_heard` | Geir | The player can speak to Torvald about Arni |
| `southern_friends_heard` | Geir, about the silver | With `leif_told`: the player can ask Torvald in public where his silver comes from (the first thread to Osric) |
| `heard_of_osric` | Leif's debt | The player recognises Osric Vane's name when they meet him |
| `heard_of_hallvard` | Eydis on the Silent Field | Runa can be asked about her father |
| `ulfrun_beaten` (from #242) | The gap fight | Ulfrun is at the Thing among the Wolf-Banner and remembers being spared |

## 6. What changed in the game

- `src/story/chapter2.js`: all Act I dialogue was revised to the rulings above, one page per line. New conversation
  branches: Eydis on Hallvard and on who the player will meet at Hrafnholm, Thora's "Whose law is it?", and
  Leif naming Osric Vane. There is a new NPC, **Geir**, Wolf-Banner steersman, on the east pier by the armed ship. He
  is the Wolf-Banner's own voice before Hrafnholm, and he is optional. C2-02's closing line and Ulfrun's last words
  were rewritten.
- `src/world/chapter2-maps.js`: Geir stands at (25,21). `ui/world-render.js`: his figure (madder red wool, grey
  hood, spear).
- `tests/98-chapter-two.test.js`: every line fits one page; the new branches set their flags and stay off the
  quest's path.
- No save-format change; quest ids, objective ids and the three tablet flags are unchanged.

## 7. Decisions (approved by Tokelo, 2026-11-11: "All three creative decisions are approved")

1. **The law of twenty winters and the reversal** (Ragnhild asks to bury the dead and Torvald refuses). This is the
   main political idea Hrafnholm will be built on.
2. **New names:** Jarl Eirik Frostmark, Arnkel the Lawspeaker, Osric Vane, Geir, and Arni (Torvald's brother).
3. **Hallvard was Eirik's skald**, and Ragnhild kept quiet the rumour of his surrender. This links the hall to the
   barrow.

## 8. Research notes

- **Grave-ale (*erfi*):** the funeral and inheritance feast. In *Heimskringla* (Ynglinga saga), the heir sits on
  the step before the high seat until the memorial cup (*bragarfull*) is brought, then drinks, makes a vow and
  takes the seat. [Wikipedia: Erfi](https://en.wikipedia.org/wiki/Erfi) ·
  [Heimskringla, Ynglinga saga](https://en.wikisource.org/wiki/Heimskringla/Ynglinga_Saga).
- **The Thing and the lawspeaker:** a free assembly that judged cases and made law; in Iceland and Sweden the
  lawspeaker recited the law from memory. [Wikipedia: Thing](https://en.wikipedia.org/wiki/Thing_(assembly)) ·
  [Wikipedia: Lawspeaker](https://en.wikipedia.org/wiki/Lawspeaker).
- **Valkyrie** means "chooser of the slain" (Old Norse *valkyrja*); Freyja takes half the battle-slain to
  Fólkvangr. [Wikipedia: Valkyrie](https://en.wikipedia.org/wiki/Valkyrie) ·
  [Wikipedia: Fólkvangr](https://en.wikipedia.org/wiki/F%C3%B3lkvangr).
- **Hack-silver** paid by weight, and **clinker-built** ships with split (cleft) planks, as Leif says, are both
  Viking Age practice. [National Museum of Denmark: The Viking Age](https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/).
- The muster board and the law of twenty winters are **ENSO inventions**, not historical claims.
