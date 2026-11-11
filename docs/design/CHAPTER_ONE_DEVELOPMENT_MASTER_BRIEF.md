# ENSO's Last Stand — Chapter One Development Master Brief
## ASHES BENEATH THE SUN: Complete Narrative, Gameplay and Onboarding Upgrade

**Date:** 11 November 2026  
**Requested by:** Creative Director  
**Status:** DIRECTOR-REQUESTED DEVELOPMENT DIRECTION / IMPLEMENTATION BRIEF. Features described below are **not automatically implemented**. This document directs scoped review and task breakdown; source-code changes require the team's development and QA workflow.  
**Priority:** Chapter One uplift before its narrative is declared production-ready.  
**Audience:** Narrative (Ashby/Wick/Cairn or current authorized narrative owners), Game Design (Thorne), Balance (Gauge), Development (Wren/Rook and assigned developers), UI/UX (Pixie), QA (Tally), Art and Producer.  
**Canonical baseline:** Chapter One currently exists; this is a design for extending and reworking it, not a description of shipped behavior.

### READ FIRST — Source-of-truth and related documents

1. [Chapter One Narrative Rework — Ashes Beneath the Sun](CHAPTER_ONE_NARRATIVE_REWORK.md): story, Broken Oath, Corvin Sere, Warden aftermath, mystery pacing. Already merged through PR #243.
2. [Chapter One implementation guide](../CHAPTER_ONE.md): **actual implemented route**, encounter/quest IDs, source files, save/integration rules and QA warnings.
3. [ENSO Lore Bible](ENSO_LORE_BIBLE.md): authoritative shipped lore audit, proposed late reveals, 11 November **NO DOOR MOTIF** ruling, Caelith's **Live Coal**.
4. [World & Narrative Foundation](ENSO_WORLD_NARRATIVE_FOUNDATION.md): player is defeated ruler; midgame reveal only; Sworn Band actually heroic; first guardian is kind and loved by his crows.
5. [Blackbriar Vale Regional Bible](BLACKBRIAR_VALE_REGIONAL_LORE_BIBLE.md) and [Shamefield Village Lore](SHAMEFIELD_VILLAGE_LORE_AND_PRODUCTION.md): region geography, crafts, beer, bread, livestock, monastery, village character.
6. [Cooking and Food](COOKING_AND_FOOD.md), game data (src/data.js), and story (src/story/chapter1.js): actual recipes, foods, buffs, money, existing objectives.
7. [Chapter Two — The Feast of Empty Seats](CHAPTER_TWO_LORE.md): **proposed** Nordic sequel, the Silent Field, Hallvard and Odin; create a coherent lead but do not import Chapter Two's entire plot into Chapter One.

**Reconciliation rule:** The engine and implemented story are the reference for what exists today. The merged narrative rework is the story-direction baseline. This master brief adds **specific actionable game-design layers**. If any detail disagrees with a current shipped line or approved lore, route it through current narrative ownership for explicit reconciliation and test the change. Do not silently overwrite past work or mark proposed mechanics as shipped.

---

# 1. Chapter promise and what the player actually does

**Opening promise:** Someone has been searching the player's ruined estate and is after the same imperial sign that reacts to the player's body. The player goes to Shamefield seeking answers.

**Act I:** Find a recent salvage clue and meet an ordinary witness to the Crown's fall.  
**Act II:** Learn that a Broken Oath cell is following old military records toward Featherwatch.  
**Act III:** Live among Shamefield's people; learn to cook/use a real buff; defend the Festival of the Sun against an organized raid.  
**Act IV:** Expose the cult's operation, confront a named lieutenant and see how its actions have harmed innocent people.  
**Act V:** Meet a genuinely good Warden and knowingly kill him to take a first fragment; awaken Nahemoth; return home to Orin, mourners, and consequences.

The repaired first Homestead gate is the **beginning** of a returning seat of power. Its first repair remains **0 Gold / 0 materials**, exactly as decided.

**Player-facing dramatic questions by stage:**
- Early: Who searched the Homestead, and why do the markings react to me?
- Road: Why does the victorious world still contain defenders of the former Crown?
- Village: How can I gain supplies, skills, friends and access without surrendering my independence?
- Festival: Which people and evidence will I protect when both cannot be immediately secured?
- North: Are the cultists pursuing the same power I want, and what will I do to claim it?
- After Warden: What kind of person takes something a good man died protecting?

**Non-negotiable:** No character, quest reward, tooltip, cutscene or inner monologue states the player was the ruler in Chapter One. The first memory stays incomplete and faceless. Maren, the ultimate true history of the Keeping and the Emperor's identity remain later reveals.

---

# 2. Summary of ALL improvements authorized for design

This brief incorporates the Creative Director's approval of the earlier eight-part improvement assessment **plus** the Festival set piece.

| Workstream | Exact upgrade | Status today |
|---|---|---|
| **01 — Quest objectives** | Explicit objective states, optional clues, journal clarity, no false completion/no softlocks | Needs implementation and test |
| **02 — Food/buffs onboarding** | ONE short mandatory meal-use lesson; all six full household arcs remain optional | Needs quest and UI wiring |
| **03 — Encounter teaching** | Ragpickers, mixed gnawers, looters, cultists and ghoul teach distinct attack/counterplay patterns | Mechanics must be verified; not all behaviors exist yet |
| **04 — Shamefield lives** | NPC-to-NPC dialogue, errands with context, personal disagreements and consequences; **drunk/lazy captain preserved** | Dialogue/ambient and state changes pending |
| **05 — Exploration secrets** | Four authored optional discoveries; real lore, loot and return value | Locations and rewards pending |
| **06 — Cult threat** | Corvin's ongoing operation and one named lieutenant mini-boss before Warden | Story and fight design pending |
| **07 — Meaningful choices** | Festival protect/pursue and smaller faction/relationship decisions with persistent outcomes | State, branches, consequences pending |
| **08 — Homestead continuity** | Repair scene, Orin/Shane presence, trophies, visitors, evolving atmosphere | Visual/state/persistence pending |
| **09 — Festival of the Sun** | Playable celebration followed by cult record raid; Captain takes reluctant action | New centerpiece quest/event pending |

**Do not convert every side activity into main story.** Food onboarding is short, purposeful and mandatory; the **rest** of the six household quest arcs are optional with meaningful XP/Gold/ingredients/cooking recipes. Their rewards are not abolished.

---

# 3. Main quest architecture — five NEW layers, fourteen total entries

**Today:** Q01–Q08 plus B01 are nine named main entries (Q08 currently the Chapter Two lead).  
**Target:** retain those nine and add **five** meaningful main-story quest entries. This matches Chapter Two's currently proposed **14** main quest entries, although time, quality and reactivity matter more than numeric equality.

New IDs below are PROVISIONAL namespaces, to avoid collision with existing engine content. Developers must check live IDs before adding them.

| Sequence | ID | Entry | What changes / player-facing outcome |
|---|---|---|---|
| 1 | **Q01** | A Name in the Dark | Wake in cellar; discover or knowingly skip inscription clue without softlock |
| 2 | **Q02** | A House That Remembers | Leave house, see grand foundations and evidence of recent intrusion |
| 3 | **C1-N01** | **The Price of the Ruins** | Trace an imperial salvage payment; first credible antagonist action |
| 4 | **Q03** | The Road Keeps Its Dead | Survive tollway, speak to Elian, learn conflicting accounts of the Crown |
| 5 | **Q04** | Bread and Bell | Arrive Shamefield, meet Tamsin/Mara, see living village |
| 6 | **Q05** | The Orchard Ledger | Recover register from existing strongbox looters |
| 7 | **C1-N02** | **The Ash on the Register** | Prove cult misuse of routes; stop or trace a courier |
| 8 | **C1-N03** | **The Festival in Ash** | Short **food-buff lesson**, festival culture, Broken Oath raid, defend/pursue choice |
| 9 | **C1-N04** | **An Oath in Ash** | Raid/infiltrate cult operation; Corvin and named lieutenant; obtain threat evidence |
| 10 | **C1-N05** | **A Sanctuary Under Siege** | Witness the cult endangering crows/refuge; intervene before Warden talks |
| 11 | **Q06** | The Keeper's Warning | Meet Warden, inspect care journal, learn why he refuses |
| 12 | **B01** | A Good Man Dies | Deliberate fight; first key; seal opened; first memory and Nahemoth |
| 13 | **Q07** | The Mason Who Waited | Return, meet Orin, repair **free** first gate, real consequence sequence |
| 14 | **Q08** | Ten Seals | Clear earned lead east, carry consequences into Chapter Two |

The table represents **quest entries**, not necessarily 14 separate loading screens or 14 mandatory fights. All five new entries need **nontrivial action and narrative payoff**; do not merely relabel two dialogue clicks as new quests to hit a quota.

## 3.1 Full specifications for new quests

### C1-N01: THE PRICE OF THE RUINS — Investigation / first antagonist clue
**Start:** Q02 completion or during the final Homestead grounds beat; order must not conflict with the existing Q02 inspection objective.  
**Primary locations:** Homestead grounds, Overgrown Road edge, existing tollway approach.  
**Premise:** Someone entered the estate before the protagonist awoke, moved stone slabs and searched for an imperial relic.

**Objectives:**
1. Recognize fresh intrusion evidence: new shovel cuts, footprints or a discarded invoice.
2. Recover one usable lead (a salvage payment slip / torn officer's notice). A suspicious human lookout may flee or challenge the player; use existing fight if early-class survival is an issue.
3. Connect the lead to a buyer or shipping mark associated with people traveling toward Shamefield.

**Design details:** Object clues can be inspected for extra lines; player should be able to complete the **minimum trail** by entering the critical spot and receiving an unavoidable clue, not by clicking a tiny undetectable rock. Detailed inspection reveals extra lore/treasure, never a hidden hard progress requirement.

**Choice:** Keep the salvage invoice privately or show it to Elian when met. This changes later conversation, not progression.  
**Reward:** Credible first quest reward + minor salvage/material, using existing engine rewards and universal loot—not arbitrary cash from every animal. Gauge sets XP/Gold after balancing.  
**Payoff:** "Someone else was here, and they are looking for the same lost history."

### C1-N02: THE ASH ON THE REGISTER — Crime / investigation
**Start:** Q05 returned register, or same encounter sequence with proper one-time objective event.  
**Primary locations:** Shamefield and one real investigative stop between village and tollway.  
**Premise:** The ledger lists forged clearances and a suspicious journey toward Featherwatch. A Broken Oath courier attempts to seize it or Elian's memorial records.

**Objectives:**
1. Compare Watch Captain's official list with forged entries.
2. Interview at least one credible witness (merchant, road traveler or village watch).
3. Pursue a courier or locate his dropped ash-marked orders; the failure branch has a recoverable trail so an escaped courier cannot softlock the story.
4. Return evidence to the Captain or Tamsin.

**Choice:** Deliver the physical document to Watch / keep a copy while protecting witnesses. The Captain may distrust concealment, but north access remains possible via later evidence.  
**Payoff:** Named link to **Corvin Sere**, an ex-imperial supply officer now organizing Broken Oath agents. The old register is a real story object, not only a reason to defeat four goblins.  
**Reward:** Actual XP and Gold/loot justified by recovery/assistance and authorized by Gauge; no overlapping duplicate Q05 reward.

### C1-N03: THE FESTIVAL IN ASH — Playable village set piece / food onboarding
**Start:** The village prepares the Festival of the Sun after the register incident; starts before entry to Featherwatch and plays **once per save**.  
**Primary locations:** Shamefield square, village residential lane, Kloster, memorial, north exit.  
**Required experiences:**
1. Receive a short, practical **food preparation and buff lesson** from Oda (with Iona as optional adviser). See section 4 for full working-food contract.
2. Enter the active festival: decorated square, traders, music, background chatter, memorial speech, Watch Captain publicly trying to avoid his duties.
3. Interact with one human story beat (e.g. Tamsin's welcome, Elian's names or a memorial token); don't require all festival minigames.
4. **Inciting attack:** A small Broken Oath strike group targets the register and memorial records.
5. Pick a response: **protect villagers** or **pursue the courier**. Both converge on an *actual* evidence route, but their world consequences differ.
6. Finish the village reaction and receive the lead toward Corvin's northern operation.

**Festival stages** should be event-driven (quest flag / safe short scene), **not** require a clock/time-of-day system. Once the celebration begins it must not repeat after teleport or save/load. Optional festival activities may be replayable separately if truly supported.

**Distinct branch A — PROTECT PEOPLE:**
- Defend civilians; modest damage to trade stalls, record thief escapes initially.
- Survivors trust the player; Elian/Tamsin note who was protected.
- Retrieve stolen records by tracking footprints/orders in C1-N04. No lost quest-critical evidence.

**Distinct branch B — PURSUE THE THIEF:**
- Cut off courier and secure evidence promptly, but a specific stall or supply store is damaged, or a wounded NPC needs recovery.
- Watch Captain grudgingly approves tactical initiative; an affected villager questions the player's priorities.
- Optional village help quest repairs harm and restores trust. No permanently broken indispensable merchant.

**The Captain's moment:** He is still drunk, lazy, evasive and grumpy. When a genuine attack occurs he can pull himself together briefly to defend people; he does not become a spotless hero overnight.

**Examples, not final Wick dialogue:**
- Watch Captain before: "Festival security? I inspected the tavern. Thoroughly. Twice."
- Captain during raid: "Put that down! Not the mug—the crossbow. Gods, I need a better posting."
- Tamsin after: "We celebrated being free. They chose tonight to remind us what we survived."

**Reward:** First earned festival supplies and one-time main quest XP; choice-dependent small social/merchant reaction, not an arbitrary morality counter. QA must confirm both branches, failure recovery and festival once-only payouts.

### C1-N04: AN OATH IN ASH — Faction dungeon / named lieutenant
**Start:** Festival evidence; opens legitimate north operation path without requiring six SF quests.  
**Primary locations:** North Orchard, cult supply post / old causeway / Featherwatch approach.  
**Premise:** The Broken Oath is moving arms, chained ghouls and recovered imperial papers to overwhelm Guardian One.

**Objectives:**
1. Enter and examine the supply operation.
2. Recover proof tying orders to Corvin's former imperial logistics office.
3. Choose **frontal attack / infiltration / bargaining** using actually implementable rules. All choices have an escape/return route if a stealth/social condition fails.
4. Confront a named field lieutenant and learn the strike's immediate timetable.
5. Shut down or redirect the operation and make the route to the Sanctuary accessible.

**New named lieutenant: Sergeant Kess, the Ash-Marked** (PROPOSED). Former Crown sergeant who resents having surrendered, and works for Corvin. Kess fights with methodical melee pressure and coordinates with one acolyte rather than acting as a second overpowered boss. Kess can be an elite encounter or a major human miniboss, determined by class viability tests. Allow nonlethal custody/escape if engine and writing can support it; do not fake a mercy option with a death flag behind the scenes.

**Corvin's role:** A planner who can escape, bargain or be arrested, depending on realistic route. He does not reveal the player as the old ruler. His agents react to the hand-mark with uncertainty, not "Your Majesty!"

**Reward:** Evidence, an authored field officer's personal item, Gold/material/equipment through the **universal loot system**, not hardcoded per encounter; Gauge handles levels and quantities. The player feels they stopped a real adversary operation.

### C1-N05: A SANCTUARY UNDER SIEGE — Consequence / Warden setup
**Start:** C1-N04 completed or reliable evidence that the cult has reached the Sanctuary.  
**Primary locations:** Featherwatch Path and Warden's Sanctuary.  
**Premise:** Broken Oath remnants are trying to seize the first guardian's fragment, jeopardizing injured birds and a refuge once used by travelers.

**Objectives:**
1. Observe visible consequences of the attack: damaged perches, injured birds, scattered supplies, old prison-bar cages.
2. Protect refugees/birds or neutralize the remaining cult threat in a short scenario.
3. Learn why the Warden has refused access: he was entrusted with a fragment that could return terrible power to the world.
4. Reach the Warden's conversation **without** authoritatively identifying him as Bran Ashdown beforehand.

**Choice:** Help repair the Sanctuary's immediate damage or go directly to the fragment confrontation. Helping earns care-journal/contextual dialogue but **does not** make the Warden surrender the sealed power.  
**Payoff:** The player sees a compassionate person doing difficult good, then must decide whether they will demand the first aspect anyway.  
**Caution:** The final guardian should NOT be weakened by an unseen cult boss to force a hollow fight. Preserve authored combat test and ensure all class builds have a plausible fair path.

---

# 4. FOOD, COOKING AND BUFF TUTORIAL — DO NOT REMOVE THE SIX JOBS

The Director intentionally introduced the household favors to teach **cooking, crafting, buffs, farming, brewery goods and earning some Gold**. Retain that intent. Only remove the **universal six-quest main-story gate**.

### 4.1 Exact food capability already present

The current game data has a working candidate food:
- **Leberkäsbrötchen**: consumable meal, **heal 22 HP**, **6% defence modifier for 150 seconds**, sellable in the existing food catalogue.
- Current recipe ID: **cook_leberkaese**; recipe station: **hearth**; ingredients: **Pork ×1 and Brötchen ×1**; output: **Leberkäsbrötchen**.
- Current SF6 **A Proper Meal** gives the player a **Brötchen** and **Pork**, sends them to **the Homestead hearth** to cook the dish, tells them to eat it, then report to Oda.
- Food rules include a **180-second maximum** for meal/drink buffs, caps and same-dish stacking; don't create a competing buff engine or a different recipe name.

**Proposed onboarding cutover:**
1. Put a **short main-quest tutorial encounter** with Oda at the Festival preparation stage. She gives precisely the ingredients the recipe requires, once.
2. Teach the player to open the craft interaction, select **cook_leberkaese**, confirm one Leberkäsbrötchen was produced, then consume it.
3. The HUD/journal must explain **what happened**: healing and active temporary **+6% defence**, its remaining duration, and that it expires; UI must show the effect rather than burying it in flavor text.
4. A quick nearby demonstration fight or clear combat-preparation prompt shows why the buff matters. Do not require the buff to last until the distant Warden.
5. If cooking must occur at the existing **Homestead hearth**, plan the short return trip intentionally with Black Flight not yet available. **Preferred enhancement:** add an accessible public hearth in Shamefield using the existing hearth recipe/station mechanics, so this mandatory lesson doesn't require an uninteresting round trip. This is a proposed new station; **do not claim it exists yet**.
6. Inventory is full / ingredients lost / meal consumed early? One-time safeguards, cookbook help and restock or "already cooked/ate" catch-up ensure the player is not stuck.
7. No alcohol is required to pass onboarding. A brew lesson may remain SF1 optional; no consumption of beer must be demanded.

### 4.2 What happens to SF1–SF6

**All six remain actual quests**, with their original people, locations, recipes, rewards and XP/Gold subject to Gauge's balance. They can be completed before or after the main festival, including after the Warden if their characters still exist.

| Quest | Player learns / receives | Story function and status |
|---|---|---|
| **SF1 — Bread and Beer** | Cultivation, milling, baking, brewing, exchanging goods | Optional craft/farm progression; supports village winter economy |
| **SF2 — Brown Hops** | Crop care and pest cleanup | Optional problem-solving and gathering |
| **SF3 — Pigs at Large** | Animal interactions, livestock humor, food/ingredients | Optional; keep Greta's pigs and their personalities |
| **SF4 — Singing at the Mill** | Supernatural side encounter | Optional independent local ghost tale |
| **SF5 — Names for the Bell** | Memorial quest, writing and character empathy | Optional high-value lore linking emotionally to Ch2 Names We Carry |
| **SF6 — A Proper Meal** | Detailed cooking/eating lesson and follow-up with Oda | **Optional expanded mastery/second recipe challenge** after the short mandatory lesson, preserving unique rewards and not duplicating the first tutorial XP/items |

**SF6 migration caveat:** Its existing objective is already "cook Leberkäsbrötchen at Homestead → eat → speak to Oda." After the mandatory tutorial, avoid forcing a pointless identical quest and avoid falsely auto-paying all SF6 rewards. Recommended: leave SF6 as a repeat *optional extended cook-at-home lesson* with Oda's dialogue acknowledging that the player has cooked once already; optionally vary the second recipe with an explicitly supported recipe if the Director approves. Save migration must honor existing SF6 started/completed state.

**Gold reward principle:** Cooking and village jobs reward authored quest assistance; do not replace their income with generic monster coin or remove rewards merely because tasks become optional.

---

# 5. QUEST OBJECTIVES, INVESTIGATION AND JOURNAL PRESENTATION

**Existing engine rules:** src/engine/story.js records seen events, one-time XP/items, current quest steps and catch-up for out-of-order actions. A required inspect objective does not by itself mean a physical exit is blocked; the player's observation about being able to walk away from cellar inscriptions may be correct while the quest remains incomplete. QA must test **actual state**, not infer from objective definition.

### 5.1 Mandatory vs optional clue contract

**Must-have progress evidence:**
- Delivered automatically by a contextual event in the critical space, or through a clearly highlighted, accessible objective, without requiring pixel-perfect clicking.
- Quest journal displays which main objective remains incomplete, why the next place matters, and where the next step is.
- If the player physically leaves a space, the quest either continues logically with a fallback clue or provides an honest "return and inspect" objective; **do not softlock**.

**Optional discoveries:**
- Damaged cellar inscription's full text, table set for two, old foundation carvings, extra ledger names, a ragpicker badge, isolated environmental relics.
- Reward extra journal lore, an item or alternate NPC dialogue; never mandatory to understand basic plot or beat the Warden.
- Inspected object lore remains accessible after discovering it in a **Lore Journal**.

### 5.2 Implementation/QA requirements
- Audit Q01 cellar_inscription and Q02 grounds_foundation: test leaving those locations uninspected and returning; ensure the player cannot be stuck with impossible objectives.
- Test quest tracked objective markers, story waiting states, journal target text and actual map IDs.
- No pre-emptive "quest complete" or extra XP simply from passing a room if the authored required action was not performed.
- Optional objectives must look optional in UI; no fake objective marker that silently has no effect.
- No alternate path should inadvertently make Q06/B01 or first seal resolve before Warden defeat.
- Quests and rewards must be once-only across save/reload, Black Flight and re-entering map locations.

---

# 6. ENEMY PROGRESSION — TEACH THE COMBAT SYSTEM THROUGH FIGHTS

This chapter must teach the mechanics of all **four base classes** (Warrior, Mage, Rogue, Necromancer) and their available first evolutions, not just provide XP gates. Use existing combat systems where possible; new telegraphs/status effects require supported mechanics and separate balance work.

| Existing encounter | Player lesson | Enemy behavior candidate | Counterplay expectation |
|---|---|---|---|
| **G1 Ragpicker Pair** | Position, target choice, dodge/guard | One melee raider pressures, another prepares a readable strike | Move/guard/interrupt or clear attack window; no invisible unavoidable damage |
| **G2 Root-Chewers** | Mixed creature priorities, sustain, managing more than one target | Rat harasses while gnawer commits to heavier attack | Switch targets, use ability, retreat from danger; no new impossible status |
| **Q05 Strongbox Looters** | Multi-enemy crowd and reward control | Leader guards strongbox; weaker followers flank | AoE/control, priority order, separation, ranged spacing |
| **G3 Broken Oath Cultists** | Tell recognition, interrupt or avoidance | One chants a readable cast while partner shields them | Classes with no interrupt can avoid / block / break line-of-sight; no single-class hard gate |
| **G4 Ritual-Scarred Ghoul** | Dangerous telegraph, healing and buff use | Distinct windup/charge pattern and recovery opening | Dodge, potion/food preparation, recover between combos |
| **NEW Sergeant Kess** | Human elite test / learned mixed techniques | Signals cult reinforcement, feint, heavy measured strike | Recognizable cues; limited support; no untested damage wall |
| **Warden** | Culmination of movement, defense and tactical decision | Existing guardian kit plus readable patterns | Tested fair for ordinary class builds with and without optional Fallen Seraphim |

**Cross-class requirement:** Necromancer can use summons but cannot trivialize encounters by farming generated minions; Mage must have a valid Mana strategy; Rogue must have viable evasion/spacing; Warrior must have a valid guard/damage strategy. No mandated ability that a particular class cannot unlock.

**Do not overstuff:** Better three understandable enemy behaviors than ten status icons nobody reads.

**Progression:** Removing six compulsory village favors will alter mandatory XP and supplies. Gauge must recompute actual XP and the first evolution gate for **a route that skips every optional SF/S01/J quest**, and Tally must verify it in real combat, not the test harness with inflated HP and weakened enemies. Do not patch XP by invisible grants. Preserve universal monster loot formula and rarity eligibility.

---

# 7. SHAMEFIELD — DAILY LIFE AND REACTIVE NPC CAST

Keep the village's existing German-inspired architecture, brewing, baking, meat, mill, fields, and Kloster. It must feel like a settlement **that exists without player input**.

### 7.1 Short NPC-to-NPC scenes (authored, not ambient essay)
- **Bragg and Mara:** Debate the cost of scarce iron and whether old imperial trade protections were better than today's highway theft.
- **Oda and Fenric:** Argue over sourdough, barley and ale while preparing festival tables; banter draws the player toward the cooking lesson.
- **Greta and the Watch Captain:** Greta demands action on pigs or raiders. Captain complains that being asked to walk is outside his job description.
- **Iona and Shane (if recruited):** His military medical expertise is undeniable; she distrusts his past, but they can exchange ingredients.
- **Elian and Sister Merrow:** Quietly discuss whether the memorial bell can name people nobody else remembers.
- **Tamsin and village children:** Mention that the Warden once treated her grandson without asking for payment, well before his final boss fight.

Use brief overheard lines, changing NPC barks, schedule/event swaps if the engine supports them; do **not require full time-of-day simulation** for ambience.

### 7.2 Watch Captain: DO NOT "FIX" HIS PERSONALITY
The Director specifically wants the **drunk, lazy guard/captain kept**. He drinks, evades responsibility, complains, delegates work and has funny excuses. He also has a practical reason to close a route where people have disappeared. When cultists attack, he can display brief competence, then promptly demand a drink afterward. He is **not** secretly a flawless heroic commander.

### 7.3 Before/during/after Festival state
- **Before:** Banner preparations, food stalls, active casks, livestock, gossip, mourning names.
- **During:** Music, decorated square, optional festival contests, memorial ritual and small character interactions. Introduce a few unique nonessential traders if feasible.
- **Attack:** Broken Oath raid; civilians move/take cover, alarm bell and effects, fight in a controlled arena that doesn't damage essential stations irreparably.
- **After:** Visible repair or damage, warnings from Tamsin, Captain's changed attitude, grieving/hospital work, optional follow-up assistance. Reentering the map should not reset all banners or duplicate attack enemies.

**Performance:** Use authored state changes, overlays and NPC text variants before building a costly simulation of dozens of villagers.

---

# 8. EXPLORATION — FOUR AUTHORED OPTIONAL DISCOVERIES

Players who ignore these can finish Chapter One. Each rewards purposeful exploration and contributes to the region's identity.

| Secret / location | Discovery and challenge | Real reward concept | Larger meaning |
|---|---|---|---|
| **Hunter's Abandoned Cabin** — side of Overgrown Road | Follow tracks, inspect an abandoned field note, find an animal or territorial creature in nearby brush | Early working food ingredients, hide, modest gear or usable tool | Hunters once traveled freely; road safety now matters |
| **Imperial Supply Cache** — old tollway embankment | Notice old quartermaster marks on wagon wreckage; locate a concealed box | Sellable material, a **real defined** low-level equipment item and a Corvin-related invoice | The empire had a supply infrastructure and people still scavenge it |
| **Miller's Old Cellar** — beside the watermill | Read a grieving note and investigate a sealed storage recess near the independent Singing at the Mill ghost story | Rare recipe ingredient / local memorial item | Not every haunting originates in the sovereign's actions |
| **Ridge Watch Lookout** — alternate Featherwatch climb | Climb an overlooked perch, find bird traces and a view of the old fortress | Sanctuary care journal preview, temporary resource cache or safe approach information | Warden has been looking after travelers and birds |

**Integration rules:** These are distinct small spaces or side areas using current map footprint where possible, not a demand for four large bespoke maps. Each has an actual discoverable clue, at least one interaction with narrative result, one genuine eligible item/reward, persistent completion and no replayable legendary farm.

**No phantom loot:** Every item and rare material must already exist in game data or be added as a proper defined item in an implementation PR. Coordinate with universal loot/equipment systems; do not award class-incompatible fake weapons that cannot equip or sell.

---

# 9. CHOICES, CONSEQUENCES AND AUTHORED STATE

Do **not** add a generic morality meter unless the Director approves one. The game needs a small set of **consequential remembered decisions**.

| Decision | Choices | Persistent consequence | What MUST remain possible |
|---|---|---|---|
| Salvage invoice | Show to Elian / keep | Early dialogue and one alternate hint | Main investigation |
| Festival defense | Protect people / pursue records | Villager gratitude versus faster intel; different repairs and follow-up | Both paths to Corvin and Warden |
| Broken Oath camp | Attack / deceive / bargain | Corvin attitude, cult patrol variants and dialogue | Warden and seal still reachable |
| Sergeant Kess | Capture / defeat / let escape (only where mechanics support) | Future cult witness/enemy variant | No resurrected boss dupes |
| Shane | Help or ignore optional quest | Homestead merchant presence / personal loyalty | Main story without him |
| Villager aid | Help or skip SF arcs | NPC warmth, village goods and rewards | Orchard passage |
| Warden aftermath | Admit / conceal / remain silent | Tamsin/Elian reaction and Sunbearer report tone | Shops and Chapter Two route |
| First seal | Open after acquiring key | Nahemoth and first memory are granted once | Must not claim solely on Warden kill |

**Implementation notes:**
- Use existing **authoritative quest and story flag** infrastructure; don't create duplicates of current fragment, aspect, anchor, or Homestead state.
- Unique state flags must be defined/registered before writing them to saves, with default behavior for older saves.
- Branch scenes should reflect a *specific cause*: if the player chased a thief, the record is recovered; if they saved civilians, a named villager remembers it. No purely decorative button that gives exactly the same consequence.
- Don't make an incomplete optional quest prevent returning to the village or proceeding to Chapter Two.
- After Warden defeat, Tamsin should mourn no matter whether the player previously helped her; her trust can vary, but her grief is not erased.

---

# 10. HOMESTEAD: A GROWING PERSONAL PLACE

The Homestead is the permanent base and eventual imperial seat. Chapter One should establish its emotional and functional value without granting a free castle.

### Before first fragment
- Ruins visibly retain old foundations; the cellar/table/foundation carry controlled lore hints.
- The Homestead cooking hearth, beds/fields/animal spaces and stash are useful before the Warden.
- Optional salvage secret or first supply storage encourages return before completing the chapter.

### After first fragment, before first build
- **Orin** surveys foundations, builder's ledger gives real plan.
- Nahemoth appears as a separate talking crow, provides Black Flight to discovered safe anchors.
- Shane stall visible only if recruited (no phantom merchants).
- Reactions to the Warden's death can be carried into the Homestead through NPC conversations or journal entries.

### After the FREE first gate repair
- The first gate **actually appears repaired** in the world scene; construction menu marks it done.
- Orin points out a familiar masonry cut, not a fully identified throne. The player sees the beginnings of a seat of power.
- Trophy space can display a **named story keepsake** from an actual claimed quest, once, without inventory duplication.
- Optional visitor near future stage: peddler, injured traveler or watch courier; no fake army instantly materializes.
- A Chapter Two route hint appears through Nahemoth and map/journal after Q08.

### Forward compatibility
- Future construction layers can include outer walls, workshops, kitchen/stores, followers and a throne room as separately approved upgrades.
- Stage 1 must **not** consume Gold or materials; later costs are separate specifications.
- Visual improvements must reflect underlying build state in **both** live reload and save restore.

---

# 11. FESTIVAL SCENE: PRODUCTION-BY-PRODUCTION EVENT DESIGN

**Why it exists:** Not just spectacle. It combines regional culture, player food-buff learning, plot escalation, an active antagonist, village investment and a consequence of choice.

### Beat board
1. **Set-up** — Market decorations, food stalls and rehearsed songs; an anniversary of the Sworn Band's victory.
2. **Welcome** — Tamsin explains the day; Elian looks uncomfortable beside the memorial.
3. **Practical lesson** — Oda feeds the player the necessary ingredients and teaches one complete recipe / food buff.
4. **Optional breathing space** — Player can watch contests, browse merchants, talk to Bragg/Fenric/Greta or help the memorial.
5. **Memorial** — A name from Elian's letter is read. The celebration is also remembrance.
6. **Raid** — Sudden cult attempt on records; the Watch Captain spills his drink and acts.
7. **Player choice** — Defend civilians or chase raider, with real world changes.
8. **Resolve** — Recover a usable lead either way; village reacts differently; next goal becomes Corvin.
9. **Transition** — North expedition now urgent and politically justified.

**Do not implement as a mandatory 30-minute sequence or an unskippable long cutscene.** Provide normal dialogue pace, fast-forward of known lines, combat-pause safety, and clear objective markers. Separate festival event flags from optional ambient festivities to avoid stalling players who want to pursue the main story.

### Visual/audio minimum
- Festival bunting / Sun banner, food tables, lit lamps or lanterns, lively crowds, distinctive village ambient music.
- Emergency alarm and environmental damage state for raid.
- Village post-raid repairs and mourning contrast.
- Distinct short sounds for cooking success, food buff activation, cult alarm and distant crows.
- Accessibility: important warnings and ability telegraphs also visible without audio. No mandatory color-only clues.

---

# 12. Orchard route, XP, economy and chapter safety

## 12.1 Replace the six-favor bottleneck SAFELY

**Today:** The captain in src/story/chapter1.js checks six SF quest completions for L01; that gates the north route. This is implemented behavior.

**Target:** Gate opens after **Q05 register genuinely returned** and either:
- **Story route:** tangible cult operation evidence from C1-N02 / C1-N03 / C1-N04 as designed; or
- **Village trust alternative:** substantial local help (working candidate: **two** household quest resolutions) plus reporting known danger.

**Sequence caution:** The Festival is itself north of Q05 but north road should not already be open before its raid unless an authored early-branch exception exists. Make C1-N04 the north expedition following Festival / trust; do not accidentally make the player required to visit the inaccessible cult camp to gain permission to visit it. The same event must not require and grant itself.

**Every side quest remains completable** even after gate opens, if its NPC/items are still present. Existing save states L01 active/complete, partially completed SF chains, and SF6 completed before the new mandatory cooking beat need migration/catch-up so they do not re-pay ingredients and quest rewards.

## 12.2 Required XP and combat solvability

The live implementation documentation reports a Warden path of **663 XP with all six household favors and their fights**, and earlier route tables vary as new gates were added. These are not safe baselines after changing what is mandatory.

Gauge must produce:
- The **shortest ordinary legal story route** XP/Gold/usable food tally; equipment available and class evolution before Warden.
- The **all-six-SF route** tally, including side quest XP, farming outputs and time-to-play.
- Four base class normal-combat Warden win/loss and resource-readiness results; test with and without optional Fallen Seraphim, and with new Sergeant Kess.
- A check that the universal monster loot system, once implemented, distributes realistic rewards; **no scripted per-fight Gold override**.

Food buffs should be helpful, not mandatory to avoid impossible boss stats. A player who eats early must still be able to buy/craft supplies by normal gameplay.

## 12.3 Save and encounter invariants
- Story effects, boss drops, festival raid, unique salvage caches, recipe ingredient gifts and specific quest rewards happen **once only**.
- Map reentry, re-talk, game reload and Black Flight do not regenerate quest-critical enemies or Gold.
- Missing optional journal entries do not prevent entering mandatory maps.
- If the player dies during the festival attack, recover through established death rules; no endless attack loop.
- Chapter Two Q08 access uses actual chapter transition and only valid story flags.
- Browser world mode and text interface use the same engine events and rewards.

---

# 13. Team implementation sequence — WORK FROM THIS SECTION

Do not assign nine teams to change the same story file simultaneously. Use small PR slices with explicit boundaries and acceptance tests.

### P0 / Slice 0 — Narrative & technical integration review
**Narrative:** Verify Corvin, Kess, Bran reveal, village cultures, no-door ruling, Sunbearer staging and Chapter Two handoff.  
**Systems:** Confirm actual cooking/eating/buff contract, objective events and recipe station availability; determine what festival gameplay can be authored as data and what needs engine behavior.  
**Balance:** Recalculate XP path and classes with optional SF content; estimate new combat load.  
**QA:** Establish baseline from current main for quest routing, boss survival, saves and item use.  
**Deliverable:** A short decision/contract note linked in implementation issue: adopted quest IDs, flags, encounter IDs, XP acceptance, UI requirements.

### P0 / Slice 1 — Quest clarity and functional onboarding
- Audit Q01/Q02 inspect objectives and actual exit behavior.
- Introduce once-only meal cooking/eating tutorial and make active buff legible.
- Keep SF1–SF6 accessible; make SF6 compatible with prior tutorial.
- Add village introduction dialogue with real festival preparation.
- Tests for quest completion, objective marker clarity, eating and effect duration, save catch-up.

### P1 / Slice 2 — Full plot backbone
- Inciting Homestead salvage evidence and C1-N01.
- Register cult evidence C1-N02 and actual antagonist Corvin thread.
- Festival event C1-N03, branch flags, authored civilian/thief result and one-time loot.
- Orchard route rework: story/trust alternatives; no six-favor bottleneck.
- Real XP and class viability testing before changing the Warden baseline.

### P1 / Slice 3 — Enemy and antagonist craft
- Retell G1/G2/strongbox/G3/G4 through environmental context and readable patterns.
- Implement Kess and C1-N04 through existing systems; add combat mechanics only when supported in engine.
- C1-N05 Sanctuary under siege, Warden care-journal and interactions.
- Ordinary class survival, encounter fairness, proper loot and status effect QA.

### P1 / Slice 4 — Regional reactivity, Homestead and ending
- NPC ambient interactions and post-festival world changes.
- Warden's post-death personal name, village mourning and reaction flags.
- Real first gate repair visual state, Orin dialogue, Nahemoth persistence.
- Sunbearer investigation teaser and seamless Q08 / Chapter Two link.

### P2 / Slice 5 — Optional richness
- Hunter cabin, supply cache, mill cellar and ridge lookout.
- Festival minigames, additional trader conversations, memorial variations, trophies, visitor cameo.
- Extra animations, environmental cues, audio polish and Lore Journal.

### Approval roles (current AGENTS.md is controlling)
- **Creative Director:** narrative direction and scope decisions; no last-minute invented monarch reveal.
- **Narrative owner/editor:** Ashby/Wick if still authorized, or the actual current narrative assignee; dialog and lore bible updates.
- **Cairn/worldbuilder:** location and geographic continuity if still assigned.
- **Thorne/Gauge:** quest interactions, economy, XP and food/combat balance.
- **Wren/Rook/developers:** authoritative engine, story, map and UI implementation using assigned scopes.
- **Pixie/UI/UX:** journal, inspection clarity, food status, festival presentation and accessibility.
- **Tally:** progression, combat, narrative continuity and regression reports.

**Repository note:** If agents/ownership in AGENTS.md changes, use the *live file*, not historical names embedded in older documents. Work should proceed through issue breakdown and reviewed PRs.

---

# 14. Definition of Done — all green before marking Chapter One uplift finished

## Narrative
- [ ] Player has a reason to investigate by the Homestead/first road sequence, even if optional rock/inscription lore was skipped.
- [ ] Broken Oath has an observable operation, a named human antagonist and credible threats to villagers and Warden.
- [ ] Festival is playable, reflects regional culture and ends with a consequence.
- [ ] Warden remains genuinely good; his compassion is seen before battle; his postmortem name and mourning land afterward.
- [ ] Nahemoth remains separate from normal birds, only grants Black Flight on the first seal opening, with no player-as-tyrant reveal.
- [ ] Orin's return and gate repair are a dramatic chapter endpoint; Sunbearer visibly begins investigating.
- [ ] No pre-midgame sovereign identity reveal, no revived magical-door cosmology, and no contradiction with the Live Coal.

## Gameplay
- [ ] Main story reaches Warden **without all six SF household quests**.
- [ ] All six SF quests remain playable with their own XP, rewards, systems and NPC personalities.
- [ ] The core food tutorial cooks/eats a **real existing meal**, correctly shows 22 HP / 6% defence / 150 seconds for Leberkäsbrötchen under existing caps and actual gameplay behavior.
- [ ] The drunken/lazy Watch Captain still drinks, complains and delegates; one crisis response does not erase his personality.
- [ ] Five new main-quest layers contain meaningful action; festival raid, Corvin/Kess and Sanctuary siege are not merely reskinned repeated fights.
- [ ] Optional exploration provides real authored items and lore without forced visits.
- [ ] Homestead gate is **free** and visually changes; Shane stall only appears when recruited.
- [ ] New combat patterns are clear and available to all four base classes; no class hardlock.
- [ ] New routes preserve first evolution before Warden with minimum actual XP and normal survivability.
- [ ] World and text mode use one authoritative rules path, no phantom loot or status.

## Integrity
- [ ] All quest/inspect/enter/talk/defeat/build events resolve, correct markers shown, no "can skip required action yet quest silently completes" bug.
- [ ] Both Festival response branches complete and persist different visible aftermath; rescued civilians are not suddenly dead in next dialogue.
- [ ] Orchard has two viable routes; no prerequisite cycle or unreachable story object.
- [ ] Every old save including partial L01, SF6, quest flags and prior Warden completion migrates without duplication, replay or softlock.
- [ ] One-time rewards, boss/aspect, festival, caches and first repair cannot be farmed by save/load, reentry or Black Flight.
- [ ] No arbitrary shop lock for a normal story choice.
- [ ] All implemented story, data, build, map integrity, class/seeded fair-combat and save/migration tests pass; QA signs off.

---

# 15. Deliberate exclusions and open approvals

**Not being mandated:** A fully dynamic calendar, permanent NPC routines, a morality meter, extra player character classes, free rare weapons, ten new maps, the complete Castle, Norse gods appearing in Chapter One, or a new engine built specifically for festival events.

**Open decisions to settle before individual implementation PRs:**
1. Canon title: retain *The Road to Shamefield* in game UI or rename to *Ashes Beneath the Sun*?
2. Exact implemented IDs/branching outcomes for Corvin and Sergeant Kess.
3. Public village hearth (preferred) versus existing Homestead hearth for mandatory tutorial.
4. Whether the community route should require **two** household favors, and whether those can be SF6 or any of SF1–SF6; Gauge balances.
5. How strongly festival protect-versus-pursue affects local reputation without introducing a general reputation engine.
6. How much of Chapter Two's proposed Hrimvald is shown at Q08; prefer only a northern route clue, not a spoilery lecture.
7. Whether the optional secrets use current map sizes or small additional subareas.

**Final creative standard:** At Chapter One's end, the player has **learned core survival/crafting systems**, protected or disappointed real villagers, stopped a cult operation, deliberately killed a good guardian, claimed their first aspect, awakened Nahemoth, met Orin and begun rebuilding a stronghold. The people around them respond. The story feels like the first move in the return of a sovereign—not a tutorial checklist.

**This file is the proposed implementation entry point for all Chapter One uplift work. The existing chapter and lore documents remain historical and canonical references. Do not equate this document with already shipped gameplay.**
