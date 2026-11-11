# ENSO's Last Stand — Chapter One: Ashes Beneath the Sun
## The Broken Crown: Narrative Rework and Development Handoff

**Date:** 11 November 2026  
**Status:** PROPOSED — Creative Director and narrative-team review, NOT implemented or canonized.  
**Scope:** The playable Chapter One main quest, optional village stories, recurring cast, antagonist, Warden climax, consequences and Chapter Two setup.  
**Source baseline:** The current Chapter One implementation in src/story/chapter1.js; docs/CHAPTER_ONE.md; ENSO_LORE_BIBLE.md (including 11 November no-door ruling); World & Narrative Foundation; and proposed CHAPTER_TWO_LORE.md.

> A stranger wakes in a ruined house with no memory. Someone else has been searching the ruins. To learn why, the stranger becomes entangled with a village that survived a fallen empire, an oath-bound faction determined to restore it, and a kind guardian sworn to prevent its return. The stranger kills the guardian to recover a fragment of power—and their actions set both imperial loyalists and the victorious heroes in motion.

**The goal:** Chapter One must have cause and effect, an active opponent, sympathetic civilians, a reason to investigate, choices with reactions, and a dramatic ending. Not a six-errand checklist followed by a boss and a gate repair.

---

## 1. Existing content and required canon

These are CURRENT game elements to preserve, not new proposals:

- The player chooses an identity, awakens in a cellar without memory, has faintly glowing hands, sees a scratched warning and discovers an empty table set for two.
- Ruined Homestead in **Blackbriar Vale** is the permanent player base that can grow into an imperial stronghold.
- Existing route: Cellar → House → Grounds → Overgrown Road → Broken Tollway → Shamefield → Orchard / Featherwatch → Warden's Sanctuary → Seal Chamber → Orin and free Homestead gate repair.
- Main quests Q01–Q08 and B01 already exist. G1/G2, strongbox looters, G3 cultists, G4 ghoul and the Warden are integrated combat gates.
- Shamefield has Tamsin, Elian, Watch Captain, Mara, Bragg, Iona, Oda, Fenric, Sister Merrow and Greta. Its bakery, brewery, farming, cooking, market, Kloster, memorial and festival are assets, not filler to delete.
- All six SF1–SF6 household quests currently must be completed for L01 to open the orchard gate. They are valuable, but compulsory placement is a pacing problem; changing it requires quest/XP/routing tests.
- Shane's side quest is optional; recruitment establishes his merchant and farming role. Exact normal farewell remains **"Suffer!"**, not during interrupted dialogue.
- The **Crow-Touched Warden** is good. His ordinary crows love him and mourn his death. He protects the first seal, is killed by the player for access to the fragment, and drops the unique first key.
- **Opening the first seal**, NOT merely defeating the Warden, grants Fragment One, **Nahemoth** as an intelligent talking crow, and **Black Flight** between visited safe anchors. Nahemoth is not one of the Warden's ordinary birds.
- **Orin** appears at the Homestead only after the first seal is opened. First Homestead gate repair is **FREE: 0 Gold, 0 materials**.
- The Sworn Band genuinely defeated the old sovereign and are genuinely admired. The player secretly **was** the ruler but this identity is never stated before the wider campaign's middle.
- Caelith's separate hidden **Fallen Seraphim** arc currently concerns the **Live Coal**, not the discarded motif of the Cold Door. Do not undo the latest lore bible §4.8 ruling. Gates and cages remain ordinary architecture, not universal religious metaphors.

**Lore-sensitive reveal boundaries:**
- Before and during Chapter One, the player must NOT learn conclusively they were the former ruler. A scavenger can recognize an old mark; an acolyte may react strangely; a memory can show a faceless commanding figure. Nobody says "you are our emperor."
- Maren, the first person involved in the Keeping, is LATE GAME. Keep the table set for two unexplained here.
- The Keeping is the approved current direction: forbidden binding of lives/essences through the circle; it may be hinted via disappearances. Do not describe people as magical doors or reveal the full mechanism in early Chapter One.
- The Warden's proposed personal name **Bran Ashdown** first appears on his grave or in mourning AFTER his death, as established in the current lore bible's proposed staging.

---

## 2. The chapter's dramatic engine

The player is no longer merely curious about their identity. Someone searched their home, someone paid for old imperial artifacts, and a faction is trying to obtain the first fragment. The player wants to discover why their body and the Homestead respond to these relics before the faction reaches them.

Three interests collide.

### Ordinary Shamefield — survival over ideology
Tamsin remembers disappearances and respects the Sworn Band. Bragg remembers stable imperial contracts and good roads while knowing the cost. Iona remembers medicine diverted for war. Fenric, Oda, Merrow and Greta care about winter provisions and the safety of families. Watch Captain is often drunk and avoids work, but has buried travelers lost on the northern road.

**The villagers disagree about the old empire.** Some recall safety and trade; others recall oppression. Nobody is forced to praise or condemn it in one scripted monologue. Characters' memories emerge through daily work.

### The Broken Oath — restorative zeal and personal disgrace
This is a former-imperial loyalist movement of surrendered soldiers, officials and opportunists. It believes the old Crown can return and the old oaths can be restored. Its open-circle symbol stays; the symbol is recognizable but not explained as a portal.

**NEW PROPOSED CHARACTER: Corvin Sere**, former imperial supply officer, local Broken Oath organizer. He surrendered to save his own life and now tries to erase that shame by restoring the Crown. His practical plan:
1. Pay scavengers to recover Homestead artifacts and imperial records.
2. Intercept the route register and identify surviving sealed sites.
3. Use stolen supplies, cultists and ritual-chained undead to approach Featherwatch.
4. Take the first fragment before local watch or rival loyalists can control it.
5. Test whether the mysterious stranger with the mark can be used as a tool.

Corvin **does not know the player is the sovereign**. He is the human antagonist who advances the plot, not another Qliphoth boss. His outcome can be arrest, flight or a tenuous bargain; avoid killing him automatically, because his faction can matter later.

### The Sworn Band — heroes who still act
Use existing sun-banner festival imagery and a new courier bulletin about imperial relic seizures. The Sunbearer appears in a short closing scene: news of the first guardian's death makes her order an investigation, without identifying the wanderer. The heroes cannot remain passive until the final boss.

---

## 3. Revised playable story — five acts

### ACT I: THE HOUSE THAT SHOULD HAVE BEEN EMPTY
**Locations:** Cellar, House, Grounds, Overgrown Road  
**Current quests retained:** Q01 A Name in the Dark; Q02 A House That Remembers.

The player wakes without memory. Their hands briefly glow. The scratched cellar inscription is unsettling but does not explain anything. Upstairs the table is set for two. In the grounds, ancient foundations run beneath grass and collapsed buildings.

**New inciting incident:** Someone has recently searched the property: wet footprints, a broken lock, scattered mortar dust, a salvage notice and the stamp of an anonymous buyer. A scavenger lookout reacts to the mark on the player's hand.

> Scavenger: "I saw that mark on the stone. Didn't think I'd see it on skin."

**Crucial:** This is not a loyalist recognizing the Emperor; merely someone noticing a repeated old symbol. It creates an external investigative need: Who has been searching the property, and why does the same mark appear there and on the player's body?

**Lowest-cost implementation:** environmental inspection plus a brief conflict or reuse of a nearby existing fight. Do NOT require a new difficult compulsory boss for level-one players.

**Act payoff:** The player takes a torn order pointing toward the tollway and village contacts, and heads along the road not only to learn their identity but to investigate whoever is hunting artifacts from this estate.

### ACT II: THE ROAD THAT REMEMBERS
**Locations:** Road, Broken Tollway  
**Retain:** Q03 The Road Keeps Its Dead, Elian, G1 Ragpickers, G2 Root-Chewers, and the existing traversal.

Elian describes the fallen ruler, the Sworn Band's genuine victory one year before, the sun-banner emblem and entire streets that vanished under the Crown. He is an ordinary survivor and reliable witness, not a secret messenger.

**New contrast:** He recalls guarded roads and regular trade under the empire, but says a safe road means nothing to someone whose loved one never came home.

> Elian: "There were roads you could travel without fear under the Crown. Then there were people who walked those roads and never arrived. I'd trade the whole road to have one of them back."

He recognizes the salvagers as former soldiers or deserters trading in imperial records. They have been seeking the missing toll register. He recommends asking Shamefield's Watch Captain and merchants.

**Encounters have purpose:** G1 is a desperate scavenger pair at the bridge; G2 occupies neglected carts and carries traces of recent ritual disturbance. The player sees evidence of the Broken Oath's movements in the environment rather than simply encountering creatures standing in the way.

**Act payoff:** Shamefield celebrates the heroes' victory beneath sun-and-broken-crown banners while a nearby memorial honors people never seen again. Ordinary life and historical cost are juxtaposed.

### ACT III: SHAMEFIELD UNDER THE SUN
**Locations:** Village, Kloster, residential lanes, allotment, tollway revisited, orchard  
**Retain:** Q04 Bread and Bell, Q05 Orchard Ledger, L01, SF1–SF6, S01 Shane, village trading/cooking/farming content.

Tamsin welcomes the player cautiously. Supplies are strained by unsafe roads; Mara's parcel still introduces trade and food logistics. The Watch Captain refuses to allow unaccounted travel north because cult activity and deaths have made the old Featherwatch route genuinely risky.

The current strongbox looters still hold the stolen toll register. Its contents now matter: names of travelers, official patrol routes and **forged clearance orders** showing that someone used imperial supply knowledge to direct armed people toward Featherwatch.

**New story event — The Ash on the Register:** A Broken Oath courier tries to seize the record or Elian's names letter during the Festival of the Sun preparations. Whether the player stops the courier or tracks the thief, a trail leads to Corvin's operation in the north. This is the same evidence objective on two viable paths, not a fail state that locks the entire campaign.

**The festival makes the place worth protecting:** Oda bakes, Fenric brews, Merrow manages the granary, Greta tends livestock, Bragg prepares trade tools, families bring names to Elian. Some praise the heroes; some resent lost imperial trade; nobody agrees that victory solved every problem.

**Change the gate requirement:** It is poor dramatic pacing to demand all six household favors before the main story proceeds. The Captain should open the northern route after Q05 register return **and** credible evidence of the Broken Oath's northern operation. Alternatively a player can earn meaningful village trust through local activities and get the same permission. The six SF quests remain accessible, complete and rewarded but not universally mandatory. **A new conditional main-route objective must replace the six-favor soft gate; do not just delete L01 and break Q06.**

**Shane:** Keep "Shame on Shane!" chanting, the pursuers and his medicine stall. A few lines show he knows battlefield treatment too well; he does NOT confess his full imperial past yet. The Watch's concerns remain plausible. Normal farewell "Suffer!" exactly.

**Caelith / Briarwell:** The Kloster's work, hidden gaze unlock, holy weapon gifts and Trial of the Live Coal remain. A discreet reference to Sister Wenna or missing pages can foreshadow the Sworn Band. Avoid turning Caelith into the answer to the ruler's secrets. Caelith's myth of taking fire to GIVE to freezing people should stand on its own.

**Act payoff:** The player knows a cult cell is seeking something at Featherwatch and has a reason to reach it. Villagers have stakes in whether the cult succeeds.

### ACT IV: THE OATH THAT WOULD NOT DIE
**Locations:** North Orchard, old causeway, Featherwatch Path, Warden's Sanctuary  
**Retain:** G3 Broken Oath cultists, G4 ritual-scarred ghoul, Q06 Keeper's Warning, sanctuary care journal and bird encounter.

The Broken Oath is operating: recovered weapons, supply lists, ritual chains, improvised patrols and preparations to strike the Warden. They are not simply worshipping in empty wilderness.

**Corvin's confrontation:** The player can challenge his men, deceive them with a plausible credential, or attempt a brief bargain, while the main story continues. Corvin looks at the old mark with fascination and suspicion:

> Corvin: "That's an old sign. You shouldn't carry it where anyone can see."  
> Player: "What does it mean?"  
> Corvin: "I know men who died for less."

He is NOT allowed to identify the wanderer as the old ruler. He can flee or be captured depending on outcomes. His agents' cult affiliation explains G3.

**The ritual-scarred ghoul:** A dead person has been chained and desecrated for the cult's failed attack. Give it a former name, old clothing or family keepsake to show the consequences of the faction's ideology, without making it one of the sacred six hundred from Chapter Two.

**At the Sanctuary:** The Warden has been tending injured crows, protecting visitors and preparing against the cult. He repairs damaged cages made from old prison bars and offers the player food or a place to rest. His old prisoner-keeper history can be hinted, but the proposed personal name **Bran Ashdown** is withheld until after death.

**The true clash:** The Warden recognizes that the fragment reacts to the wanderer but does not know why. He offers assistance with the player's missing past, **except** surrendering the fragment. He has seen what people are willing to do to obtain it.

> Warden: "I fed the smallest one this morning. She bit me. Good. Means she'll live."  
> Player: "I need the fragment."  
> Warden: "So did the men with their circles and chains. They had a thousand reasons. I didn't hear one that put a life before power."

The player can leave safely, prepare, help the Sanctuary, or demand the key. On the current mainline, obtaining the first aspect still requires killing the Warden. **Do not retroactively claim the player was defending themselves or that the Warden was secretly wicked.**

**Act payoff:** The player chooses to kill someone whose reasons are clearly understandable, for a power they only partially understand. The cult's violence does not erase the player's responsibility.

### ACT V: A GOOD MAN DIES; THE FIRST STONE RISES
**Locations:** Sanctuary, Seal Chamber, Shamefield reaction, Homestead  
**Retain:** B01, memory vision, Nahemoth, Black Flight, Q07 and Q08.

**Warden defeat:** Ordinary crows settle upon him and fall silent. He leaves the first key once. A later epitaph or Tamsin's mourning reveals his personal name as **Bran Ashdown**, a former jailer who released people when the Crown fell. He died protecting the world and the birds he loved.

**First memory:** Keep the faceless balcony, the festival lanterns, the calm command and the street emptied. Add sensory details—a bell, a fallen ribbon, a last scrap of song—but no new factual revelation that conclusively identifies the player as the sovereign. The first fragment is disturbing, not explanatory.

**First seal:** The intelligent crow of Nahemoth emerges from broken binding magic, distinct from Bran's birds. It grants Black Flight to visited safe anchors only. It is perceptive, sarcastic and not omniscient. It should not mock the Warden's grief away.

**Orin:** With the seal opened, an old architect formerly bound within the Keeping begins to exist separately again. He appears at the Homestead, recognizes the foundation's masonry but cannot explain why, and offers the existing Builder's Ledger. **First gate repair is free** and must produce a real visible world change.

**New aftermath, at least three concrete consequences:**
1. **Shamefield mourns:** Tamsin speaks about what the Warden did for her grandson. The player can admit responsibility, deny it or remain silent. Different reactions persist. Do not hard-lock indispensable shops or access.
2. **The Broken Oath responds:** Corvin or surviving cultists learn that the fragment is gone. They abandon their immediate plan and begin investigating the mysterious stranger.
3. **The Sworn Band responds:** A courier reaches the Sunbearer with news of the Warden's death, a missing fragment and someone returning to the old estate. The Sunbearer orders a quiet investigation; she does not know the player's identity.

**Closing scene:**

> Orin brushes soil from a restored foundation.  
> Orin: "I know this cut."  
> Player: "The stone?"  
> Orin: "The hand that laid it. That's the troubling part."  
> Nahemoth perches on the new wall.  
> Nahemoth: "There are more pieces of what you lost. The northern roads still remember your footsteps."  
> Cut to a sun-banner encampment. A messenger delivers the report.  
> Sunbearer: "Send someone to the vale. Quietly."

**What the chapter achieves:** The first Qliphoth aspect has been recovered; a good guardian is dead; a ruined home has visibly changed; villagers, cultists and heroes react; the player can follow the crow east into Chapter Two's proposed Hrimvald conflict.

---

## 4. Character bibles and continuity

### The player: an unknown stranger with dangerous potential
The player can help people while concealing unsettling reactions to imperial objects, or act opportunistically and intimidate enemies. **This does not automatically reveal their identity or force a global Good/Evil score.** Different behavior earns different relationships, but the Warden's murder and first fragment remain the established arc.

### Elian: the human record of loss
He is a road witness, not an omniscient lore announcer. His missing-person letter (SF5 Names for the Bell) should be seeded in Q03 and recognized by villagers. His story connects directly to Chapter Two's Eydis and her Roll of the Six Hundred without magically sharing new characters in both regions.

### Tamsin and the Watch Captain: two ways of protecting a village
Tamsin's priority is food, human lives and dignity. She speaks bluntly but doesn't ignore a stranger's help. The Watch Captain is frequently drunk and unwilling to work, but his decision to close a dangerous road is understandable. Discovering real cult evidence gives him a reason to change that decision without six household jobs.

### Bragg and Iona: disagreement without moral equivalence
Bragg remembers stable metalwork contracts under imperial occupation. Iona remembers medical requisitions and missing patients. They may argue openly. This makes the empire's legacy complex but does NOT excuse its taking of lives.

### Shane: damaged, funny and potentially useful
His medical talents and trouble with constables hint at a compromised wartime history. Do not disclose the full field-hospital backstory in Chapter One. Recruitment remains optional, and his normal farewell is **"Suffer!"** regardless of chosen business topic.

### Corvin Sere: the human antagonist
A former imperial logistics officer whose cowardly surrender became religious guilt. He collects old records and scavenged relics to restore the Crown. He can manipulate people, not conjure unlimited cult soldiers. His plan creates current events and ties the Homestead to Featherwatch. His identity and fate are PROPOSED, not shipped.

### The Warden: compassion with a hard line
He is still good, and his birds are still ordinary birds. He understands enough to fear the fragment, and his refusal is sincere. His former role as a prison keeper can be conveyed through physical traces. If retained, his personal name appears only after death for emotional effect.

### Nahemoth and Orin: fragments, not convenient exposition
Nahemoth knows paths and some old impressions. Orin knows stone, construction and traces of his forgotten work. Neither speaks the sovereign's identity or immediately reveals a throne beneath the Homestead.

---

## 5. Existing quest routing: implementation mapping

| Existing quest / encounter | Keep | Narrative work |
|---|---|---|
| Q01 A Name in the Dark | Yes | Inciting evidence in cellar; mark and warning remain |
| Q02 A House That Remembers | Yes | Recent Homestead search; recovered salvage order |
| Q03 The Road Keeps Its Dead | Yes | Elian testimony, sun-banner versus disappearances, cult supply link |
| G1 / G2 | Yes | Scavenger and ritual-disturbance context; no fixed Gold patches |
| Q04 Bread and Bell | Yes | Tamsin/Mara supply problem linked to unsafe roads, introduce festival |
| Q05 Orchard Ledger | Yes | Register has strategic value, forged permissions, old patrol route |
| Strongbox looters | Yes | Keep the combat gate and real register pickup |
| **New proposal: The Ash on the Register** | Add if useful | Short mainline evidence/recovery sequence; stop or track courier |
| L01 Get to Know the Locals | Yes | **Optional village-standing route or alternate path**, not six mandatory favors |
| SF1–SF6 | **All preserved** | Village life / craft tutorials / local depth; may be completed after north route opens |
| S01 Shame on Shane! | Yes | Stronger medical/history hints; still optional and recruitable |
| G3 cultists / G4 ritual-scarred ghoul | Yes | Corvin operation and personhood of chained victim |
| **New proposal: An Oath in Ash** | Add if useful | Corvin encounter on existing north route; possible escape/arrest |
| Q06 Keeper's Warning | Yes | Sanctuary under pressure; truthful Warden warning and leave/return |
| B01 A Good Man Dies | Yes | Name revealed only after death, mourning and distinct consequences |
| Q07 The Mason Who Waited | Yes | Orin and free gate; recognition of imperial foundation |
| Q08 Ten Seals | Yes | Sunbearer investigative response; clear north/east sequel hook |
| QS1 Fallen Seraphim | Yes, optional | Preserve Live Coal current canon, free legendary unlock and later trial |

**Scope control:** The new evidence quest and Corvin confrontation may be implemented as additions to existing Q05/Q06 rather than new engine quest IDs. The goal is coherent dramatic causality, not maximized quest count.

### Orchard road alternative, the most important quest logic change
- **Still required:** Q05 register returned and a genuine route to learning about the north threat.
- **Story-focused route:** Retrieve cult evidence and report it to Captain; orchard passage opens.
- **Community-focused alternative:** Gain Captain's confidence through meaningful village assistance, with a low enough threshold that the six favors are not universally compulsory. **Suggested two** substantial household favors, not six; this number is a design proposal and depends on XP QA.
- Whichever is chosen, road unlock flag is **idempotent** and Q06 starts once. A player may still complete SF1–SF6 for their own stories, XP, food, farming and craft rewards.
- Do not remove recipes, animals, merchant NPCs or player progression when migrating saves. Existing saves where L01 was completed or partly progressed must continue cleanly.

### Mandatory XP caveat
Current docs report mainline level guarantees with a changing fight list; they also state that older integration tests cheat HP/enemy HP. Removing six mandatory favors affects XP and may change encounter order. **Gauge/Tally must recompute baseline mandatory route XP** and demonstrate first evolution before the Warden without optional farming or cheat fights. Do not invent XP grants just for entering locations.

---

## 6. Choices and regional consequences

Track **authored decisions**, not a global numeric morality meter:
- **Broken Oath approach:** confronted / infiltrated / bargained; Corvin arrested or escaped if implemented.
- **Village assistance:** helped households or declined; enables alternate trust dialogue, not permanent punishment.
- **Shane recruited:** reuse existing authoritative shane_recruited flag.
- **Warden responsibility:** player admitted / denied / stayed silent after death; dialogue and trust change.
- **Names for the Bell:** the optional memorial was completed or not; alters mourning, not the Qliphoth reward.
- **First seal and Nahemoth:** reuse actual fragment/aspect/anchor flags and unique item claims.
- **First gate repair:** reuse existing build state; no paid resubmission.

Concrete reactions:
- Tamsin mourns Bran even if she likes the player; she cannot simultaneously celebrate his murder.
- Elian's tone reflects the player's honesty and his letter's completion.
- Corvin's circle regards the player as either dangerous obstacle or useful contact, without identifying them.
- Sunbearer's report responds to the death and fragment, not to an omniscient morality score.
- Chapter Two Hrimvald hears only ambiguous southern rumors, never the player's confirmed ancient title.

---

## 7. Cultural and mythological integration

**Shamefield is a working German-inspired frontier village**, not merely a marketplace of quest markers. Its chapel, monks, brewery, bakery, pork trades, grain, herbs and crafts should appear in background action, dialogue and economy. The Lost are mourned while families still eat, quarrel and trade.

Existing side stories do not need to be made grim:
- SF1 Bread and Beer: joyful cooking/crafting, helps a strained supply economy.
- SF2 Brown Hops: genuine rat infestation and farming care, **not secretly cult-related**.
- SF3 Pigs at Large: warmth and comic relief.
- SF4 Singing at the Mill: independent local ghost story, not part of the sovereign's plan.
- SF5 Names for the Bell: important emotional memorial; echoes Chapter Two's Names We Carry.
- SF6 A Proper Meal: actual food tutorial with Oda's personality.
- S01 Shane: absurd public shame masking an uncertain past.
- Hunting and herbs: functional ecology and trade.

**Fallen Seraphim:** Caelith's myth is a seraph carrying a live coal from the heavenly altar to warm freezing mortals; Heaven condemns that gift. The mystery is a distinct ethical challenge, not another aspect of the sovereign. The hidden legendary web, weapon choice, trial and visual milestones remain unchanged unless Thorne/Gauge separately design changes.

**Qliphoth:** The first fragment is Nahemoth, not a literal Norse or Christian deity. Later aspects draw from fictionalized later Hermetic associations and are not a historical set of "ten bosses" in Jewish Kabbalah.

---

## 8. Suggested dialogue and signature moments

### The first question
> Scavenger: "Whoever paid for these stones will pay twice for that scrap in your hand."  
> Player: "Who paid you?"  
> Scavenger: "Didn't see his face. Saw his seal. And his coin."

### Elian on the old empire
> "The roads were safe under the old Crown. People would tell you that. But entire streets vanished. A safe road is cold comfort when nobody comes home."

### Corvin on surrender
> "I put down my sword to live. They called me sensible. I've been trying to forgive myself for it ever since."

### Tamsin after the Warden
> "The crows came to the village this morning. Every roof. Not a sound. Bran mended my grandson's arm once. Wouldn't take a coin."

### Orin at the first repaired stone
> "I know this cut."  
> Player: "The stone?"  
> Orin: "The hand that laid it. That's the troubling part."

### End scene, sun-banner camp
> Companion: "You think it's the Broken Oath?"  
> Sunbearer: "They would have taken the key for themselves."  
> Companion: "Then who?"  
> Sunbearer: "Someone was at the old estate. Find out who."

**Writing direction:** Wick owns final wording. Keep NPC lines short, distinct and concrete. Let objects, ledgers, inscriptions, memorials and reactions carry information rather than lore speeches.

---

## 9. Development slices and acceptance criteria

**Authority:** The current AGENTS.md assigns narrative to Ashby/Wick/Cairn, mechanics to Thorne/Gauge, game code to Wren/dev, UI to Pixie, QA to Tally. This is a proposed handoff for their review, not an unreviewed command to modify another team's source. New scenes/flags/values need normal implementation PRs and tests after the Creative Director approves direction.

### Slice A — Maximum dramatic gain, small changes
1. Homestead environmental salvage clue and short first threat.
2. Elian and major village characters' opposed memories of imperial times.
3. Earlier setup of Elian's missing names list and the Broken Oath.
4. Stronger Warden history: bird journal, cages and former prison context.
5. Bran's postmortem identification and a village mourning scene.
6. Sunbearer report/epilogue after actual first-seal opening or gate repair.
7. Confirm the existing Live Coal / no-door canonical language remains consistent.

### Slice B — Repair main story structure
1. Develop cult evidence and Corvin Sere as active antagonist, reusing G3 and existing maps.
2. Provide a story-investigation way north; convert L01/SF1–SF6 to optional or alternative progression without deleting them.
3. Add guarded/optional choices and persistent but bounded consequences.
4. Ensure Warden offers a real chance to leave; challenging him remains deliberate and later consequential.

### Slice C — Chapter-end consequence and sequel handoff
1. Visual gate repair and Orin's foundation recognition.
2. Black Flight/world-safe anchor usability and no duplicate grant.
3. Lore journal entries for inspected story fragments, available only once seen.
4. Q08 lead east to Hrimvald and modest setup of the Sworn Band response.

### Mandatory QA
- Every class reaches the Warden on at least **one legitimate route without completing all six household favors**, then reaches Q08 after Warden, first seal, crow and real free build.
- A player who completes SF1–SF6 still gets all existing rewards and can progress; no ghost flags, repeated XP, duplicate items or retroactive softlocks.
- Save/load and map re-entry do not auto-complete B01 or open the first seal, especially via stale out-of-order inspect events.
- Warden cannot be bypassed by malformed quest catch-up; Nahemoth exists only after first seal opened.
- First evolution occurs before Warden via **ordinary real combat** across four base classes; story integration tests alone are not sufficient.
- Shops, farming, cooking, Shane farewell, Fallen Seraphim, Black Flight and construction are not broken.
- The guardian's birds mourn, his first name is not prematurely revealed and the player is never unambiguously identified as the old sovereign.
- Players observe at least two meaningful faction reactions after the first fragment and clear next-region direction.
- No regressions to no-door lore ruling (Live Coal, Caelith, current seraph item names).
- npm test, npm run build, npm run world and Tally's real-combat routes pass for implementation PRs.

### Narrative playtest questions
- By ten to fifteen minutes, do players have a reason to pursue the Homestead search beyond "find my memory"?
- Can players explain the Broken Oath's objective before killing the Warden?
- Do players care that the Warden dies because they have witnessed his kindness and relationship with Shamefield?
- Does the village feel like an actual place whose people are affected by events?
- Does the repaired gate feel like the beginning of a returning power and a coming response rather than an empty task?
- Do players know what they want to do next (follow the crows east), without knowing the main twist?

---

## 10. Creative decisions for review

1. **Working title:** Approve "Ashes Beneath the Sun" or keep current "The Road to Shamefield"?
2. **Corvin Sere:** Approve as a named Broken Oath officer/antagonist? Should he always survive or be capturable?
3. **Orchard permission:** Is cult investigation plus register sufficient, or should two substantial household favors be a fully viable alternative? Never require all six.
4. **Bran naming:** Keep reveal after death, as the lore bible suggests?
5. **Sunbearer epilogue:** Show her personally on-screen or only through a courier report and voice?
6. **Player agency:** Should Chapter One already have an irreversible major moral branch, or smaller relationship choices ahead of Chapter Two's first soul-choice? Recommendation: smaller relationships here; irreversible choice with the host in Hrimvald.
7. **Inciting scavenger:** New brief combat, or new inspection/confrontation tied to existing road encounter? Recommendation: reuse existing encounter first to prevent low-level balance regressions.

**End state:** The player has killed a good guardian, taken a first aspect, awakened Nahemoth, made ordinary people react, drawn the interest of cult loyalists and the Sworn Band, and taken the first visible step toward an imperial stronghold. That is a chapter conclusion with consequences, not merely a gate repair.
