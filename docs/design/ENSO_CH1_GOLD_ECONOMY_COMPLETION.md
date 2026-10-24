# ENSO Chapter One — Gold Economy Completion / G-1 + G-2
**Vaelis — Lead Game Designer** · 24 October 2026 · **P0 design completion**  
**Source:** [Creative Director playtest #96](https://github.com/TokeloR-I/TEXT_RPG_Nameless/issues/96); [Tally Chapter One QA](../../qa/QA_REPORT_2026-10-24_10.md); [Chapter One guide](../CHAPTER_ONE.md).
**Status:** Complete *candidate economic rules and fixtures* for Rook, with numeric tuning by Tally and Director approval before balance values become canonical. **The current game does not implement this. This document is not code authorization.**

## Failure / required player experience
Current `src/data.js` contains `shopDefinitions: {}` and `constructionDefinitions: {}`; `itemDefinitions` only recognizes four healing consumables. Tally verified no Gold source and no stocked merchants, and reports `build homestead_gate` cannot complete Q07 even on the version with building actions. Relevant PR #91's changes were reportedly stranded by branch-merge ordering; **Rook must verify the build implementation exists on main**, not rely on a merged label. Chapter One's successful integration test manually emits a build event and therefore does **not** establish economy playability.

**Mandatory player experience:** before Warden, acquire actual Gold by exploring/defeating enemies/completing meaningful jobs, buy effective healing and one gear upgrade; after Warden, receive enough non-random Gold for first homestead gate repair regardless of previous optional purchases. The merchant must stock goods, offer prices and let player buy/sell. A defeated enemy cannot be looted infinitely via backtracking.

## Design invariants — authoritative goal, no numeric improvisation
- Single player currency **Gold**, visible in inventory and shop/building screens. Integer nonnegative; no debt, fractional Gold, negative stock or infinite arbitrage.
- **Story reward, monster reward, lootable pouch and merchant sale are distinct sources**, each claimed exactly once as appropriate. No gold granted merely for entering/leaving maps.
- The mandatory **first repair cannot be permanently blocked because a player spent all their pre-boss Gold on healing**. Chapter boss payoff covers gate fee on its own, or a separate guaranteed dedicated builder grant covers any shortfall. No unexplained free construction.
- Fixed coins from scripted encounters/quests are deterministic and not chance-gated. Optional enemy loot can have chance rolls but must never be required for Chapter One.
- Four functional stock lists: Mara (general), Bragg (weapons/armor), Iona (healing), Shane (medicine/ingredients after recruitment). All accessible vendors offer inspect, buy and sell; items already in inventory can be traded if sellable. Quest/seal keys, builder ledger and story flags are never sellable.
- Items must **work**: purchasing healing permits use; purchasing equipment permits equip and reflected stat changes; buying a crafting material without a built station must explain its eventual use. Stock and player Gold must persist through exit/re-entry and saves.
- No arbitrary global +2 DEF or unapproved regeneration applied through this feature. Tally measures gear and medicine in isolation from class balance fixes.

## Candidate economy fixture — numbers NOT yet approved
These figures form one concrete playable *test configuration*, not a final balance decision. Rook can implement as **data fixtures after Creative Director authorization**, Tally may test in scratch copies first. Do **not** silently publish as approved live balance.

### Gold on the mandatory path
| Event/source | Source type | Candidate Gold | Before Warden cumulative |
|---|---|---:|---:|
| Abandoned purse in cellar/house, one-time pickup | guaranteed discovery | 10 | 10 |
| First scavenger bridge fight G1 | fixed encounter victory reward | 6 | 16 |
| Cart barricade G2 | fixed encounter victory reward | 6 | 22 |
| Talk to Elian / complete meaningful 'Where Am I?' quest | story reward, NOT walking XP | 20 | 42 |
| Village welcome / Q04 Bread and Bell | story reward | 10 | 52 |
| Orchard ledger return / Q05 | story reward | 10 | 62 |
| G3 cultist causeway encounter | fixed victory reward | 8 | 70 |
| G4 ghoul encounter | fixed victory reward | 8 | **78** |
| **Warden killed — recovered abandoned treasury pouch in seal chamber** | **guaranteed post-boss story reward, once** | **70** | **148 total lifetime** |

**Ordering:** Elian, G1 and G2 may occur in different order; awards are keyed to their own independent claim IDs. **Warden reward 70 Gold is provided after victory** and independent of any earlier spend. Once gained, it stays with player until spent. Boss kill XP remains governed by existing enemy XP; Gold does not create XP.
**Quest XP:** this Gold sheet respects separate #96 directive to consolidate Q01/Q02/Q03 XP into Elian's single discovery quest. Do not reintroduce travel XP.

### First construction project
| Upgrade ID | Proposed first fee | Additional materials | Availability | Result |
|---|---:|---|---|---|
| `homestead_gate` | **60 Gold** | **0 required for first repair** (Orin supplies salvage; flavor only) | Orin + builder ledger + Warden memory-key quest flag | Restore ruined estate gate visually, commit `build:homestead_gate`, finish Q07, start Q08. Cannot build twice. |

**Affordability proof:** player may spend **all 78 pre-Warden Gold** on useful equipment and medicine; guaranteed **70** boss reward still funds **60** gate repair and leaves 10 Gold. Therefore no grinding, Shane quest, random drop or shop sale needed for Q07. If user reaches gate without boss victory, construction remains story-gated even with wealth. If gold >0 but below cost, show `60 Gold needed; N Gold held` and mark the source of post-boss guaranteed reward. This guarantee is required even if candidate prices later change (retest invariant after any tweak).

### Candidate merchants
| Vendor id | Available when | Stock / **buy price in Gold** | Intent |
|---|---|---|---|
| `mara` | first Shamefield visit | Moldy Bread **4**; Bandages **12**; Half-full Wine Bottle **8**; Tarnished Knife **20** | accessible utility and cheap first upgrade |
| `bragg` | first Shamefield visit | Rusty Sword **20**; Leather Vest **25**; Wooden Shield **20** (only if off-hand mechanics available) | actual weapon/armor choice |
| `iona` | first Shamefield visit | Bandages **12**; Healing Herb Bundle **20**; Half-full Wine Bottle **8** | predictable pre-boss healing |
| `shane` | after `shane_recruited` and relocation | Bandages **12**; Healing Herb Bundle **20**; Feverfew Herb **5** | medicine trader and ingredient/farming tutorial; normal goodbye says **Suffer!** |

**Reuse current healing values**: Bandages heal 25, Healing Herb Bundle heals 40, Bottle heals 12, Bread heals 8. Proposed gear stats (Tally to check): **Tarnished Knife +1 physical attack damage; Rusty Sword +1 physical attack damage; Leather Vest +1 DEF** (not additive permanent growth); caster alternatives require a class-usable `Cracked Apprentice Focus +1 magic attack damage` at Bragg or Mara at comparable **20** price so Mage/Necromancer are not forced into useless purchases. No new buffs are **required** to unblock the economy; add at least one supported buff item only once its effect and numbers are separately specified, never as an inert shop prop.

**Selling (candidate policy):** sell price = `floor(buyPrice/2)`, minimum 1 for sellable goods; *only* actual owned goods can be sold; no sale of the first memory key, quest ledger, quest-critical items, or class starter quest objects. No repurchasing items at below sell price; no merchant Gold mint by equip/sell loops. Narrative junk to make looting meaningful: scrap metal buy-equivalent value 6/sell 3, old leather scrap buy-equivalent 4/sell 2, cracked trinket buy-equivalent 8/sell 4. Their drop sources must be fixed/once-per-enemy group or Tally-reviewed randomized optional rewards. Reuse existing inert keepsakes as sellable only if no quest references depend on them.

### Enemy Gold behavior
**Required encounters** G1/G2/G3/G4: award **fixed per-encounter Gold** listed above, exactly once (not once for each creature and again from a chest). Display as post-victory loot and record `encounter_gold:<id>`. Existing optional wolves/rats may yield only sellable salvage, not guaranteed meaningful Gold; bosses/quest rewards should be thematically credible, so Warden's 70 Gold is **from a sealed pre-existing treasury/purse beyond him**, not coins on the animal-caregiver's corpse.

**Optional content:** Shane watch quest, herbs and wolf jobs may award separate candidate gold after QA; none count toward gate affordability. If optional enemies respawn someday, only explicit controlled loot rules can permit repeat rewards; do not create infinite Gold farming accidentally.

## Implementation contract / event sequencing
- Quest completion Gold and XP are separate independently keyed idempotent grant effects. Re-talking to Elian, reading Orin's ledger, reentering map, save/load or death/reload must not grant again.
- Encounter reward is payable **after normal victory**, not on flee, failed encounter or mere enemy spawn/despawn. Defeating units in one encounter does not create duplicate grouped Gold.
- Shop contract: menu always shows price, stock, Gold remaining, heal/gear effect and item comparison. Insufficient funds fails without consuming action/stock; successful buy transfers item and deducts Gold **atomically**. Sell reverses one owned item at sale price, rejects bound/equipped quest key, and cannot leave negative item count. Price shown must equal actual amount.
- Gear UI/engine must provide `equip`, `unequip`, `compare`; effective DEF stats calculated from base + equipment once. Weapons must be class compatible; insufficient/out-of-class use provides a clear refusal.
- Building: evaluate `Warden cleared + ledger received + sufficient Gold + not already built` against one authoritative contract, deduct Gold and set built state atomically, update visual map and Q07 via real build event. Duplicate build attempt does not debit again. No design-side shortcut firing event without real purchase.
- If restock is not implemented, choose **unlimited fixed-stock merchant catalogue with per-transaction items created only when purchased** as provisional Chapter One UX, rather than empty stock. Do not introduce daily resets or time system as prerequisite.
- Economy schema belongs in data, engine rules/commands own transactions, GUI reflects engine state; preserve legacy CLI parity under AGENTS architecture.
- Progression must be playable with no developer cheats, including full mainline shop purchase, equip, heal, Warden victory, return to Orin and completed first repair.

## Isolated balance request to Tally
1. Test four base classes into first L3 branches, with **unchanged combat stats**, realistic purchase profiles (zero purchases, 1–2 heals, 1 weapon, 1 armor, all affordable combinations). Report survival at Warden and Gold left.
2. Independently test +1 DEF vest *without* pending global DEF variant, then compare with separately approved #70 balance changes; don't conflate.
3. Verify all classes receive >=78 guaranteed Gold before Warden, >=70 post-boss even if earlier Gold spent, can afford 60 repair, have heal choice at Iona; no optional fights or grinding.
4. Make sure store pricing cannot generate Gold by buying/reselling or repeated Gold grants through reload, transition, conversation, build/craft loop.
5. Confirm three healing pickups remain optional, with deterministic merchant supply as additional source. Compare actual Warden survival and recommended price/stock variants.
6. Report candidate data changes with recommended adjustments; Creative Director approves final economy values as **one coherent package**, not endless small approvals.

## Rook handoff / blocker
**Rook is implementation owner for Gold/shops/building/gear; Wren owns story reward triggers and Elian quest XP change; Sable owns visible shop/inventory UI; Tally owns quantitative QA.**
P0: Verify **PR #91** build/craft commits are actually on `main`; if stranded, recover with a focused PR. Then populate `shopDefinitions`, `constructionDefinitions.homestead_gate`, item stat/price/sale data and encounter/quest Gold sources, using the approved version of this fixture. Author deterministic tests for Q07 end-to-end real build, not injected `build` event. **Do not silently assume this documentation authorizes code changes or numerical balancing.**
