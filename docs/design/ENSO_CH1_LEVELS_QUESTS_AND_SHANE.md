# ENSO — Chapter One: The Road to Shamefield and the Crow's Roost
**Vaelis / Lead Game Designer** · 23 Oct 2026  
**Status:** Content design proposal extending [world foundation](ENSO_WORLD_NARRATIVE_FOUNDATION.md) and [vertical slice](ENSO_CHAPTER_ONE_STORY_VERTICAL_SLICE.md). Director-established premise, Shane, Warden morality and memory-key reward remain authoritative. **Locations, names, quest payouts/dialogue and order below are proposed, not implemented or canon until reviewed.**

## Core dramatic contract
The player wakes in a forgotten cellar, explores a ruined estate, learns that heroes recently vanquished a tyrant, becomes entangled in a village scandal, and kills an essentially good Crow-Touched Warden to claim a memory key. **Do not reveal the player is the tyrant before the midgame**. Friendly villagers and the celebrated hero are not secretly villains just to excuse the player's deeds. Class choice does not reveal identity or force a moral alignment.

## Traversal map — bidirectional except encounter-specific gates
```
[Cellar] → [House] ↔ [Ruined Homestead] ↔ [Overgrown Road]
                                               ↕
                                         [Broken Tollway]
                                               ↕
                                     [Village: Shamefield]
                                        ↙           ↘
                            [Shane's Allotment]  [North Orchard]
                                                    ↕
                                          [Featherwatch Path]
                                                    ↕
                                         [Warden's Sanctuary]
                                                    ↕
                                           [Crow Warden]
                                   victory → [Seal Chamber / Memory Key]
                                               ↕
                                         [Builder's Workshop]
                                               ↕
                                    [Homestead: first repair]
```
**Working name Shamefield**, a village where a nickname became public punishment. Direction and names are adjustable. The existing `world.html` Zone 1 ends at the road's fog boundary; text dungeon and Warden exist separately. **The diagram describes new world content, not existing world map links.** The Warden fight must stop being a terminal win screen on the expanded story route; preserve the legacy text-mode test ending until a new story handoff is implemented.

## Level-by-level design and objectives

### Segment A — Ashes of Home (current zone, L1)
**Main quest Q01: A Name in the Dark.** Character setup: enter chosen name, select class and restricted cosmetics; inspect the cracked cellar inscription. Reward proposed 15 quest XP upon first completion; journal objective: *Find a way out of the cellar*. No spoiler of the former ruler's name.
**Q02: A House That Remembers.** Explore grounds, inspect ruined keep masonry/old construction ledger, locate passable road. Proposed 20 XP. A silent visual of the once-grand foundation seeds the castle loop. Show locked/unbuilt repair points but no cost yet.
**Optional side Q01:** retrieve bandages from shed / water from well; existing pickups remain; give no required XP. Existing optional Rust Rats ×2 and Hungry Wolf persist (total 35 combat XP) and are **not** included in guaranteed progression.
**Visuals:** charred beam, collapsed arch, vine-wrapped walls, three distinctive landmarks; don't substitute dozens of empty decoration tiles.

### Segment B — Beyond the Fog (L1→L2)
**Q03: The Road Keeps Its Dead.** The Broken Tollway contains scattered trade goods and roadside warning posts bearing the heroes' emblems. A roadside traveler **Elian** (working name, ordinary reliable witness) says the beloved heroes defeated a cruel lord recently and warns that the Crow Warden keeps a sealed route. Proposed 25 quest XP on hearing full story and accepting journey; player can ask questions and recover dialogue via journal. Elian does not know who the player is.
**Required encounter G1: Ragpicker Pair** (two existing Weak Goblins, 10 XP each = 20), guarding the only passable bridge. Present as desperate scavengers, not intrinsically malicious. Player can return to village afterward; defeat flag persists. Give opening tell and room to retreat.
**Required encounter G2: Root-Chewers** (existing Bone Gnawer 15 + Rust Rat 10 = 25), among ruined carts. Distinct melee speed/undead tags. At this point main route yields 15+20+25+20+25 = **105 XP** (at least L2 after last encounter, assuming cumulative XP from 0).

### Segment C — Shamefield Village (L2)
**Q04: Bread and Bell.** Village elder/carter explains blocked northern orchard path and points to a missing route register. Player explores the square and speaks to one shopkeeper and Elian or alternate villager; proposed 25 quest XP. Local residents work, argue, close shops in evenings (if day/night isn't implemented, use simple schedule state rather than live simulation).
**Q05: The Orchard Ledger.** Resolve blocked northern crossing; see how the village protects travelers. Proposed 20 quest XP for identifying the lawful route (no required crime). This quest is mainline and must work if Shane is ignored.
**Required encounter G3: Broken Oath Cultists** (two existing Cult Acolytes, 20 XP each = 40) hiding an old passage; these are a fringe opportunist cult, not Warden's own protectors. Their affiliation with ancient power should be hinted but not identify player.
**Shane side quest opens** (full spec below), explicitly optional and not counted toward L3 mainline guarantee.

### Segment D — Featherwatch Sanctuary (L2→L3 before boss)
**Q06: The Keeper's Warning.** Discover the Warden's crow-care journal and rescued birds, meet him outside the seal, and understand he is protecting something he fears released. Reward proposed 30 quest XP **only after the boss staging checkpoint before combat** (not after killing Warden). The Warden offers a sincere final opportunity to leave. A player can go back to village to heal, shop, choose branch.
**Required encounter G4: Ritual-Scarred Ghoul** (existing `shackled_ghoul_stronger`, 30 XP), threatens the sanctuary outer route; Warden has been containing it, not collaborating with it. His kindness becomes evident by its containment. Mainline total **250 XP** *before entering boss combat* if all required quests/encounters credited. Evolution selection appears before boss; no quest requires surviving the Warden while still L2.

### Segment E — A Good Man Dies (boss and aftermath)
**Boss B01: Crow-Touched Warden.** Existing boss profile currently 150 HP, DEF 8, 200 XP; preserve unless Tally/Director change balance. He fears releasing the sealed aspect; he refuses the player passage and is killed for their gain. His crows are pets and friends, not sinister familiars. Before fight: recovery log, birds' recognition, Warden dialogue. After fight: birds circle the body and fall silent. **Do not award villain labels**, only action/consequence.
**Loot/quest flag:** singular `crow_warden_memory_key` (quest object) awarded once; opening seal gives **Fragment One** (unresolved identity, terrifying order). First Qliphoth aspect of ten is tentatively A'arab Zaraq as proposed in preceding doc; do not attach numeric bonuses yet.
**Q07: The Mason Who Waited.** Seal/road access allows construction specialist **Orin Vale (working name)** to inspect the homestead. He offers building ledger, gold/material quote and first repair. No assumed default gold payout/cost.
**Chapter endpoint:** repair one visible homestead feature (e.g. broken gate or builder's shelter), receive clear new objective toward next region; Warden no longer ends the campaign. Shane may become merchant/farming resident at any later time after his optional quest.

## Shane the Shamed — side-quest character bible and exact farewell
**Canonical:** villagers shame him, authorities seek him, player completes confrontation/quest, Shane moves to homestead as merchant and initiates farming, and **when the conversation ends, he says "Suffer!"** This exact sign-off is a signature line, not a quest-only gag.
**Working personality:** anxious, clever, melodramatic, intermittently generous; resents his notorious nickname but insists on taking charge of his own fate. Other townspeople call him "Shane the Shamed"; *Shame on Shane!* chants may follow him down a street. His name is not a secret villain identity.
**Quest S01: Shame on Shane!**
1. The player hears a small crowd chanting "Shame on Shane!" near the village well. Interactive three-line exchange introduces rumors; avoid humiliating an NPC through an endless loop.
2. Shane explains an accusation related to **missing apothecary permits / untaxed medicine** (working premise; actual guilt and legality pending). Local watch officers are searching for him. They are not automatically corrupt; their duty makes the player's interference morally interesting.
3. Shane asks the player to retrieve his ledger and medicines from a confiscation wagon. Offer investigative talk/inspection as build-out, but **the core approved path includes defeating his pursuers**. Suggested dedicated encounter **Watch Pursuers**: two new Watch Constables with predictable defensive/ranged roles; their stats/XP TBD and not needed for mandatory evolution math.
4. After victory, Shane claims his pack, changes from fugitive to recruit, offers to meet at the homestead. The villagers have reactions; consequence is not immediately erased.
5. **Recruitment resolution:** return to homestead; interact with Shane at a stall. Merchant can trade medicines/ingredients and explain how growing food/herbs will work once field repair is available.
6. **Mandatory exit line on each completed talk interaction:** Shane says, **"Suffer!"** in text dialogue, with optional later portrait/emote. This must trigger on normal goodbye after greeting, shopping, quests or farming discussion, **not** for combat interruptions/game-over. Preserve exact spelling, capitalization and exclamation point. He might intend it as a catchphrase, a nervous farewell, or an inside joke; reason remains expandable.

**Short draft dialogue** (not final approved script):
- Villagers: "Shame on Shane! Shame on Shane!"
- Shane: "They say it as if shame pays my debts. It does not."
- Player: "Why are the watch after you?"
- Shane: "Depends. Are you here to hear their story or help me tell mine?"
- On departure, always: **Shane: "Suffer!"**

**Quest completion flags:** `shane_met`, `shane_ledger_found`, `shane_watch_resolved`, `shane_recruited`, `shane_stall_unlocked`, `farm_intro_offered`. NPC only relocates when recruitment resolution is committed; revisiting village doesn't create copies. Keep optional quest separate from Warden gating.

## Village life, social systems and dialogue beats
**Shamefield layout proposal:** square with well and notice board; general store; smithy; apothecary stand; north orchard; two residential lanes; watch post; road inn. At least six named talkable people (Elian traveler, Tamsin village elder, Bragg smith, Iona herbalist, watch captain, Shane) each has a useful reason to exist. Merchants react to opening hours or a simple interaction state, **no city simulator required**.
- Notice board: 2 repeat-free introductory jobs/requests (fetch supplies, clear roadside vermin) plus main objective pointer. These are quests, **not** the later player profession/job system pending approval.
- Village greetings change after watch quest, Crow Warden's death, and revelation of dark ruler later. Villagers may mourn Warden; shouldn't celebrate just because boss rewards XP.
- Early world history: hero's festival notices, repaired bridge tributes, a memorial to the vanished ruler's victims. No indication the player's face matches tyrant before reveal.
- NPC bark/event budgets for minimum slice: 1 entry line, 2 context lines, 1 completed state, 1 exit line for major NPCs; journal summarizes rather than requiring repeated dialogue.
- Honest merchants, working guards, daily laborers and crowds make the village credible. No forced worship of player; trust must be earned and can be lost.

## Quest mechanics and anti-soft-lock
Unique quest IDs, states `unseen → available → active → complete` (and `failed` only when explicit), objective counters, idempotent XP and reward claims. Main quests can be re-read in a journal with visible destination and map marker; optional tasks distinguished. No quest XP on repeated dialogue/reloads. Story path must remain possible if Shane declined, player flees, or optional rats ignored. If a required combat encounter can be bypassed or failed, alternate earned XP routes must keep first evolution accessible; validate with Tally. When player reaches L3, branch menu happens at next safe opportunity before Warden confrontation, preserving existing class trees.

## Story and implementation dependencies
- Approved *vision*: ten guardians, benevolent first Warden, fragment key, empire recovery, village, Shane's phrase.
- *Pending content approvals*: village name, travel NPC name, constables' moral specifics, builder name, exact quest text, required encounter composition and XP payouts.
- Do not overwrite legacy combat/XP values silently. Story content changes belong to appropriate authored data and engine/world modules only after developer assignment.
