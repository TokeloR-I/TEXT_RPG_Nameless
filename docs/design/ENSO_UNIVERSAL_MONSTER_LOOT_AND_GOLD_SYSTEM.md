# ENSO — Universal Monster Loot and Gold Economy Specification (LOOT-001)
**Vaelis, Lead Game Designer · 25 October 2026**
**Status:** Director-ordered immediate **game-wide** loot design and implementation handoff. These are implementation-ready first-pass numerical values, not measured balance results. Wren and Rook implement; Tally validates; Director merges. **No game code changed by Vaelis.**
**Supersedes:** Gold-by-individual-G1/G2/G3/G4 reward schedule and the Chapter-One-only loot patch proposed in [QA #12 numeric handoff PR #167](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/167). Retain that handoff's separate class and starter-equipment proposals for independent testing. **First Orin Homestead gate remains FREE** by Director instruction (0 Gold / 0 materials).

## 0. Core decision: build the system, not Warden-only payments
- All enemies have reusable **loot profile**, **loot level**, **rank**, **loot table**, **coin eligibility** and one-time **loot claim ID**. The same calculation operates in Chapter One, later regions, generated encounters, optional hunts and bosses.
- On legitimate **victory**, roll drops using only seeded engine RNG; grant them as part of the authoritative fight reward event after victory and before clearing encounter state. Never hardcode an enemy name in loot-engine logic; content mappings in `src/data.js` and future content files.
- One killed enemy generates one base Gold roll (or no Gold if wildlife/undead with no purse) and one material roll (if profile supports it), plus an optional independent equipment roll. A multi-enemy encounter aggregates the rolls into one **loot summary**; not one roll for the whole battle, and not both per-enemy + duplicate encounter Gold.
- Loot and XP are separate: existing enemy XP remains unchanged; no bonus XP from collecting loot, teleporting, re-entering areas or searching empty corpses.

## 1. Explicit enemy loot levels and ranks
Every enemy type should specify `lootLevel` (integer >=1), `lootProfile` (enum), and `lootRank` (`common` / `elite` / `boss`). **Do not derive loot level from player level** (prevents level-up shopping inflation). Future area encounters can author fixed level or a spawn-band level, which is persisted when spawned.

**Initial Chapter One mapping, **content only**, not global special cases:**
| Enemy | lootLevel | lootProfile | rank | Notes |
|---|---:|---|---|---|
| Weak Goblin (G1) | 1 | humanoid | common | Pouches and scavenged goods |
| Bone Gnawer (G2) | 1 | undead | common | Mostly bones / corpse remnants, no natural coin |
| Rust Rat (G2, optional) | 1 | beast | common | No coins, mostly salvage/gland material |
| Hungry Wolf | 1 | beast | common | Meat, hide, fangs; no coins |
| Cellar Vermin | 1 | beast | common | No coins |
| Drunken Shade | 1 | undead | common | Spectral residue; no natural coins |
| Shackled Ghoul | 1 | undead | common | Bone/ectoplasm; no natural coins |
| Mire Lurker | 2 | monstrosity | common | Glands / corrosive material |
| Cult Acolyte (G3) | 2 | humanoid | common | Gold/potions/gear eligible |
| Ritual-Scarred Ghoul (G4) | 2 | undead | elite | Better materials, but **no free money from an undead animal-like foe** |
| Watch Constable (optional) | 2 | humanoid | common | Gold only if defeated in authorized encounter; preserve moral consequence |
| Crow-Touched Warden | 3 | guardian | boss | **0 purse Gold on body**; First Echo key and Nahemoth story drop stay their own guaranteed narrative effects. Sealed chamber cache is a separately keyed container; see §6 |
| Any other existing default goblin/rat | 1 | humanoid/beast as appropriate | common | Content author assigns sensible profile and level explicitly |

## 2. Gold — scalable formula
The `humanoid` base range by **enemy loot level L** is:
```
minGold(L) = 3 + 2×L
maxGold(L) = 6 + 3×L
baseGold = seeded integer uniform[minGold(L), maxGold(L)]
gold = floor(baseGold × rankGoldMultiplier × profileGoldMultiplier)
```
**Multipliers** applied exactly once, no stacking nested reward triggers:
| Rank | Gold multiplier | Equipment roll chance | Notes |
|---|---:|---:|---|
| common | **1.00** | profile base chance | Most enemies |
| elite | **2.00** | profile base chance ×1.5, capped at 75% | Lootable valuables; not all elites carry money |
| boss | **3.00** | separate guaranteed boss-table item; see §5 | No guarantee that a beast/guardian carries coins |

| Profile | Gold multiplier | Material roll chance | Base equipment roll chance |
|---|---:|---:|---:|
| `humanoid` | **1.00** | **35%** | **12%** |
| `beast` | **0.00** | **85%** | **0%** |
| `undead` | **0.00** | **70%** | **3%** (grave goods) |
| `monstrosity` | **0.00** | **75%** | **4%** |
| `construct` | **0.00** | **80%** | **5%** (embedded components) |
| `demon` | **0.20** | **65%** | **15%** |
| `guardian` | **0.00** | **25%** | **0% normal**; guaranteed boss reward separately |
| `sentient_looter` | **0.75** | **45%** | **10%** |

**Arithmetic examples (before equipment/material chances):**
| Encounter/enemy | Gold range |
|---|---:|
| L1 common goblin (`humanoid`) | **5–9** |
| G1 two L1 goblins combined | **10–18** total; seeded roll per enemy |
| L2 common acolyte (`humanoid`) | **7–12** |
| G3 two L2 acolytes combined | **14–24** total |
| L2 common ghoul (`undead`) | **0** |
| L3 elite humanoid | **18–30** (base 9–15 ×2) |
| L5 common demon | **2–4** (`floor((13–21)×0.2)`) |
| L10 common humanoid | **23–36** |
| L10 elite humanoid | **46–72** |
| Warden corpse (`guardian`) | **0**; separate story cache |

**Currency remains meaningful:** undead, predators and most monsters drop *sellable materials*, not implausible purses of coins. The material value is still part of the game's economy but requires a trader. Some demons may carry recovered currency. Later unique profile overrides may be explicitly authored (e.g. corrupted tax collector).

**Event output:** `Won: 25 XP · Loot: 11 Gold, 2 Bone Fragments, 1 Tarnished Knife`. No "you got 2 coins from each kill" on top. Combat rewards are generated once from defeated combatants, not copied on room return.

## 3. Materials — independent roll, item pool weighted by profile
A successful material roll grants **1 item** at common rank, **2 items** at elite rank, **2–3 items** at boss rank if the boss uses the material system. Material names are **real inventory IDs, sellable only if item definition exists**, with these initial reusable tables:

| Profile | material candidates (weights total 100) | Sell value per item |
|---|---|---|
| beast | **Raw Meat 45**, **Rough Hide 35**, **Fang/Bone 20** | 2 / 3 / 1 Gold |
| humanoid | **Scrap Metal 40**, **Worn Cloth 30**, **Damaged Leather 30** | 3 / 1 / 2 |
| undead | **Bone Fragment 50**, **Grave Dust 30**, **Tattered Remnant 20** | 1 / 3 / 1 |
| monstrosity | **Strange Gland 50**, **Carapace Shard 30**, **Tainted Residue 20** | 4 / 3 / 2 |
| construct | **Scrap Metal 50**, **Mechanism Part 35**, **Charged Fragment 15** | 3 / 5 / 6 |
| demon | **Abyssal Ash 50**, **Demon Horn Shard 30**, **Otherworld Residue 20** | 4 / 6 / 5 |
| guardian | **not rolled generically for story-critical benevolent Warden** | — |
| sentient_looter | humanoid materials | same |

**Implementation:** all names require actual item definitions, categories and sell prices; do not display inert "You found X" strings. Meat/hides feed future hunting, cooking, leatherworking systems without waiting for those mechanics to exist. Materials currently lacking a crafting recipe may be sold and labeled as crafting materials, rather than promising currently unimplemented recipes. A profile with no eligible item definitions returns no item safely.

## 4. Normal equipment drops — chance and rarity
An independent equipment chance is checked **once per defeated enemy** only after victory; boss reward is separate. If the normal equipment roll succeeds, draw one rarity using:

| Eligible gear rarity | Weighted odds on successful equipment roll |
|---|---:|
| Common | **65.0%** |
| Uncommon | **25.0%** |
| Rare | **8.0%** |
| Epic | **1.8%** |
| Legendary | **0.2%** |
| Total | **100.0%** |

**Level gates:** eligible rarity at loot level **1–3** = Common/Uncommon only; **4–6** = up to Rare; **7–9** = up to Epic; **10+** = all rarities, including Legendary. When a rolled rarity is above the cap, **downgrade to the highest permitted rarity** (do not reroll indefinitely; no empty-roll exploit). A legendary is thus a truly late-game occurrence, not something a cellar rat drops.

**Examples:** L1 humanoid common has **12% chance** of dropping one piece of gear after a fight; conditional on gear, the rarity choice yields common/uncommon after level cap. L2 undead has **3% chance** of grave gear (not a guaranteed wand). Elite humanoid gear chance = **18%**. Bosses skip this independent normal gear roll and instead consult a designer-specified unique table.

**Eligibility:** choose item from that enemy/area's `lootTable` filtered by its level and rarity; avoid randomly giving mages sword-only items because all generated items must define slot, class compatibility and numeric effect. Loot may be unusable by the current player but must be sellable; **no class-adaptive replacement without an authored rule**. Crafting materials never roll from equipment rarity table.

**Inventory policy:** Gold auto-collected on victory; rolled goods added to inventory and summarized with name, quantity, rarity, sell value and effective gear stats. Full inventory rules should be decided by engine owner; until finite inventory exists, do not invent a capacity cap or delete loot silently.

## 5. Boss and elite rewards (global contract)
- **Every authored boss** guarantees **1 boss-specific meaningful non-currency item** (unique equipment, upgrade material, aspect key, special trophy, etc). What qualifies and whether it can be sold is authored in that boss's `bossDrops`, not invented by engine.
- **Story bosses** may award an irreplaceable aspect/key (e.g. Warden's First Echo key) rather than a sword. **Keep normal equipment optional**; don't automatically grant legendary gear to all first bosses.
- Any scripted first-defeat rewards are **one-time per boss ID**, with key/fragment/Nahemoth flags remaining story effects. Defeating Warden ≠ opening seal: talking crow and Black Flight unlock on first seal opening, **not kill alone**.
- **Elite** monsters use standard profile materials/equipment with rank modifiers and may have an explicitly authored guaranteed elite material. This does not force a magical weapon drop each fight.

## 6. Chapter One = validation fixture, not hardcoded system
Existing Tally QA #12: **14 Gold before Warden, 16 after**, too low. A proper game-wide loot table should fix the core; **do not script fixed Gold into G1/G2/G3/G4.**

**Quest/container complements, separate from monster drop engine:**
| Meaningful noncombat source | Gold | Claim only when |
|---|---:|---|
| Abandoned old coin purse in cellar/house | **10** | Picked up/inspected once |
| Elian's 'Where Am I?' quest completed through actual substantive dialogue | **15** | Resolution, once; no walking XP |
| Q04 real village assistance completion | **8** | Actual objective resolution |
| Q05 watch/orchard ledger completion | **8** | Actual objective resolution |
| First seal chamber treasury cache | **20** | Warden killed **and seal opened**, once |
| First Homestead gate | **0 Gold, 0 materials** | Orin's ledger once, after seal; Director decision |

**Real encounter income early:** G1 2 goblins gives **10–18 Gold**, G3 2 acolytes gives **14–24 Gold**; G2 undead/rat and G4 ghoul give **0 coin**, but valuable materials with probability. Total **mandatory route minimum before boss**: `10+15+8+8+10+14=65 Gold` plus sellable materials; maximum without items `10+15+8+8+18+24=83 Gold`. **Expected** (uniform integer): G1 14 + G3 19 +41 fixed = **74 Gold** before Warden; after first seal: **94 expected Gold** before spending or selling. The exact amount varies with actual loot rolls and is legitimately coupled to enemies rather than fixed map reward hacks.

**Fairness invariant:** minimum pre-Warden Gold **65** permits at least **two Healing Herb Bundles (2×12=24), one Padded Jerkin (12) and one Roadworn Blade (10)** = 46, leaving 19 for more supplies, assuming the class can use the blade; Mages and Necromancers may instead buy the Apprentice Charm (9) and additional healing. This is a spending *capacity* statement, not a win-rate claim. The first gate is free even at 0 remaining Gold.

**Do not pay Gold for 'enter village', 'visit road', 'read trivial sign'**, nor double-credit ordinary quest XP. These Gold rewards attach only to actual task completion. If current Q04/Q05 narrative lacks a meaningful condition, revise that quest objective rather than paying for a map transition.

## 7. Expansion and level scaling (beyond Chapter One)
**Gold scaling without level cap:** formula keeps growing linearly with authored loot level. A level 20 common humanoid drops **43–66 Gold** (not millions); world prices can scale with item quality only, **not player level**. Equipment price floor per quality tier is a **later independent economy decision**, so do not pretend NPC prices currently scale.
- Future regular wildlife may be hunted for meat/hide, with no Gold until materials are sold.
- Blackbriar hunters' goods and Shamefield baker/brewery inputs can be traded/crafted through future recipes, using actual materials with sell values; villages are economies, not reskinned loot boxes.
- Player class does not determine Gold chance. Stat bonuses do not affect rarity odds unless a distinct future magic-find attribute is explicitly approved.
- World zones can define additional eligible items in `lootTable` without writing new loot engine logic.
- Future fixed/story pickups are separate and can be guaranteed for progression, but **do not solve every new boss's economy with custom 70 Gold payouts**.

## 8. Anti-duplication and anti-farming contract
- For finite world spawns, **claim once per unique encounter instance and once per defeated enemy instance**. Once defeated, the corresponding group remains cleared across backtracking/Black Flight/save-load.
- Roll RNG **once on victory/loot creation**, immediately record `lootClaimId` and actual rolled items in persistent state atomically. Reopen a loot screen or repeat the event shows same result; it never rerolls. No save-scum reroll through an unreconciled cached UI event; seed determinism and serialized RNG/state mandatory.
- For future legitimate repeatable spawns, use **new unique spawn instance IDs** and their full normal profile; such encounters can produce loot only if an explicitly designed respawn source exists. Do not artificially resummon static enemies when entering their map. Boss instances **never** become repeatable simply because the player re-enters.
- Player-raised minions, summoned reinforcements, illusions, control-created allies, self-destroyed objects and enemies killed during enemy-on-enemy battles **do not award independent Gold, items or XP** unless a future authored exception is approved. This prevents summon farms.
- Quest Gold from same kill and encounter Gold from that kill must not both be paid unknowingly. Quest completion may separately reward a contract, but it must show a distinct source line and be one-time.
- Store buy/sell cannot generate currency by cycling purchases; first sell value for new materials is as in §3. No forced sell access while away from a merchant.

## 9. Engine/data/UI implementation boundary
**Rook (engine and economy):** reusable roll/award logic data-driven from `data.lootProfiles` / `data.lootTables` and enemy `lootProfile, lootLevel, lootRank`. Do not put bespoke `G1` cases in generic engine. Use RNG helpers `engine.rng()/randInt()`; integrate on authoritative `src/engine/combat.js` victory flow with careful save timing. Do not invent separate ad-hoc handling in text vs browser. Existing `src/data.js` has `adaptiveLoot={}`, existing item definitions and old `goldReward` 2/kill elsewhere: **replace or reconcile so players are not double paid**.
**Wren (story/world):** annotate actual spawn groups with persistent IDs and appropriate loot metadata, author noncombat one-time caches/quest rewards, maintain Warden kind guardian/seal key story and free Orin gate; world only handles encounter triggers, engine handles roll/award.
**Pixie (sole UI owner):** result popup/loot message displays Gold + distinct material/equipment loot with rarity and stats; purchases in real merchant dialogue use same engine items/stocks; keyboard/text parity. Sable is VFX, not shop UI.
**Keel:** review deterministic reward atomicity, save/load, spawn identity, WorldSession integration, RNG sequence, engine/DOM separation.
**Tally:** fixed-seed probabilities, economy affordability, exploits and 200+ Warden-balance seeds after new loot/merchants are functioning. Don't claim expected values as tested observations.

## 10. Concrete acceptance plan
1. Simulate **10,000 L1 humanoid** loot outcomes: min/max per drop 5..9, expected about 7; normal gear success about 12% (±1 percentage point); material success about 35% (±1pp). 10,000 L2 humanoids: 7..12; no above-cap rarities. Same seed -> exact same sequence, including after save/restore.
2. Simulate **10,000 L1 beasts**: **0 Gold all**, material roll about 85% ±1pp, equipment 0. Undead level 1 **0 Gold**, material ~70%, equipment ~3%.
3. Simulate **10,000 L2 elites** for rank Gold ×2 only when their profiles allow Gold; gear chance ×1.5 within cap. Verify boss guaranteed special is present even if all optional rolls fail.
4. Run 200 distinct seeded Chapter One mandatory runs **without optional farming**, log pre-Warden minimum and mean and 10th percentile; design floor **≥65 Gold** *when all actual mandatory payouts are collected*, excluding sales; validate merchant affordability for all classes and all stock gates.
5. Gold/item claim once even after 10 map exits, Black Flights, save/loads, dialogue repeats; never award on flee, defeat or merely touching encounter. A two-enemy battle rolls exactly two sets, not one plus duplicates.
6. Each newly dropped item is defined and either immediately usable/equippable or accurately labeled trade/crafting material; sellable goods have explicit sell value, quest items bound. No phantom loot.
7. Warden kill gives key and current XP, opening seal unlocks Nahemoth talking crow and fixed one-time cache; Warden corpse grants 0 arbitrary coins; **first gate repair remains free**.
8. Shop and Q07 browser play works with PRs #164/#165 or merged descendants; QA-41 story catch-up never bypasses fight/loot.
9. Tally compares **existing Warden 55/15/28/0** baseline to Gold+healing only, base stat changes only, gear only, and combined. Test every L3 branch (minimum 200 matched seeds per class), report explicit confidence/limitations. Do not assert the fix is balanced until measured.
10. Run `npm test`, `npm run world`, `npm run build`, and future-loot-level fixture tests on main after merges.

## Decision ledger
**Director:** universal level/category/rarity loot system must be built now; not postponed and not scoped to boss one.
**Vaelis numeric defaults:** §§1–7 are actionable initial values for implementation and QA, subject to measured refinements. Director may revise them.
**Not authorized:** direct Vaelis source-code modifications, random new player drop-rate stat, generic legendary Warden sword, Gold from ordinary wolves, per-map scripted fight payouts, replacing free gate with paid fee.
