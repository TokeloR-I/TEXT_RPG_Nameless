# Vaelis — Chapter One QA #12: Numeric Decisions & Wren Handoff
**Date:** 2026-10-24 · **Owner:** Vaelis, Lead Game Designer · **Status:** actionable first-pass **design values** for implementation and Tally measurement. **No gameplay code changed by this document.**
**Evidence:** Tally [PR #162](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/162) / `qa/QA_REPORT_2026-10-24_12.md` on main `df62612`, plus [PR #70](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/70) / `VAELIS_BALANCE_DECISIONS_2026-10-23.md`.
**Current leadership decision overrides old economy memo:** FIRST `homestead_gate` REPAIR IS **FREE** (0 Gold, 0 materials) through Orin's ledger, **exactly once**, after the first seal. Do **not** resurrect the superseded 60-Gold fee. Wren's [PR #165](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/165) supplies this implementation as of review; check whether merged before acting.

## 1. QA evidence and decisions — separate bugs from balance
| ID | Tally measured / reproduced | Owner handoff |
|---|---|---|
| QA-41 | Unread cellar inscription → foundation inspect advances Q01→Q08 without Warden and grants aspect | **Wren:** merge/verify [PR #163](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/163); no Gold or aspect on forced catch-up |
| QA-32 | Missing gate construction prevents finishing Chapter One | **Wren:** 0-Gold one-time gate, verify [PR #165](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/165) |
| QA-42/44/46 | Browser has no shop UI; buy allowed from elsewhere; case-sensitive | **Wren:** verify [PR #164](https://github.com/TokeloR-I/TEXT_RPG_Nameless/pull/164) (location/recruitment gating, dialogue purchase and name normalization) |
| **QA-43** | **14 Gold before boss, 16 after; 26 with all optionals**, versus old 78/+70/60-gate fixture | **Vaelis values below:** 78 guaranteed before Warden, **+20** sealed treasury after; gate **free** |
| **QA-45** | Boss win rate Warrior 55%, Mage 15%, Rogue 28%, Necromancer **0%** (100 seeds per class); old B01+B02 scratch 55/44/86/1 | **Vaelis candidate class/base adjustments below**, Tally retest before declaring win-rate success |
| **QA-47** | Starter items are inert strings and not equipment | **Vaelis definitions below**: stats, slots, class compatibility; Rook gear/engine, Wren reward and UI integration |
| QA-48 | Two optional inspect objects appear blocked in initial BFS | Wren says accessible after required fights defeated per #164; **Tally recheck post-clear**, no balance changes |
| QA-49 | Text HTML relies on Tailwind CDN, fails style offline | Wren: inline/bundle local CSS; no numerical ruling |
| QA-50 | Trees cropped into dark squares | Wren: verify #163 visual correction, asset ownership per current roles |

**Already measured to preserve:** G1–G4 **100% survival** in all classes, 250 XP / level 3 before Warden, no infinite Gold buy/sell, quest items not sellable, save/load Gold/stock/gear passes. Baseline current level thresholds **100/250/475 XP**; first-boss **200 XP** unchanged. Do not award XP for merely walking between maps.

## 2. Gold payouts — exact one-time fixture; supersedes previous 70 post-boss because gate is free
| Event | New *total* Gold award | Scope / ID |
|---|---:|---|
| Abandoned purse: cellar/house discovery | **10** | `gold:cellar_purse`; one-time inspect/pickup, not awarded simply for walking |
| G1 Ragpickers clear | **6** | `gold:G1` once per encounter |
| G2 Root-Chewers clear | **6** | `gold:G2` |
| Elian's substantive 'Where Am I?' dialogue resolution | **20** | `gold:elian_discovery`; not for exit/enter XP; don't duplicate if current quest structure differs |
| Q04 Bread and Bell *meaningful* completion | **10** | `gold:Q04` |
| Q05 orchard/ledger resolution | **10** | `gold:Q05` |
| G3 causeway cultists clear | **8** | `gold:G3` |
| G4 Featherwatch ghoul clear | **8** | `gold:G4` |
| **Subtotal BEFORE Warden** | **78** | deterministic even skipping all optional fights |
| First seal chamber treasury, after defeating Warden **and opening first seal** | **20** | `gold:seal1_treasury`, one-time; cache from old sealed reserves **NOT coins looted from the kind Warden** |
| **Total mandatory Gold income after seal** | **98** | lifetime Gold acquired, before player purchases |

**Critical contract:** These amounts are **total awards for their trigger**, not additions to the current automatic 2 Gold per killed enemy. Disable/exclude default 2/kill in these encounter groups or calculate and award only the **difference**, so G1 pays 6 rather than 6 plus 4. Warden's normal enemy 2-Gold drop should be suppressed: the one-time +20 comes from the sealed treasury; 78+20=98. Grant exactly once across reload, death/restart, reenter, NPC re-talk and teleport. Optional encounters can retain current **2 Gold per creature**, but are **not required** for affordability; no infinite farming if repeatable enemies are introduced.

**Why 20 after boss:** old 70 Gold was primarily needed to guarantee a **60-Gold gate**; first repair now costs **0**. Retaining the old 70 windfall inflates the first region without funding a necessary project. 20 is a meaningful boss narrative cache and seed capital for the next region. Revisit only after Tally's shopping tests.

**Merchants:** Keep currently shipped first-chapter price table while Gold payouts change (do not change two variables simultaneously):
- Mara: Moldy Bread **3**, Bandages **8**, Padded Jerkin **12**.
- Bragg: Roadworn Blade **10**, Padded Jerkin **12**.
- Iona: Healing Herb Bundle **12**, Bandages **8**, Wild Herbs **3**.
- Shane (recruited only): Healing Herb Bundle **10**, Wild Herbs **2**, Apprentice Charm **9**.
Healing values retained: Moldy Bread **8 HP**, Half-full Wine Bottle **12 HP**, Bandages **25 HP**, Healing Herb Bundle **40 HP**. Cap healing at max HP, consume each item once. Caster-accessible Apprentice Charm offers **+1 INT** (not +1 guaranteed spell damage). Merchant stocks/restrictions are existing data; no new prices should be invented without a design pass.

**Affordability:** 78 Gold can buy **6 Healing Herb Bundles at 12** with **6 Gold remaining** if available stock/restock permits; currently Iona stocks 5, so practical example is **5 bundles (60) + 2 Bandages (16) = 76**, leaving **2 Gold** (confirm Iona stock includes at least 2 Bandages). Thus even Mage/Necromancer can prepare in a real shop; no mandatory grind. This is a *theoretical buy profile*, not a measured win rate.

## 3. Class balance — class-wide starting-stat candidate, rather than inventing future win rates
**Keep boss HP 150 / DEF 8 / ATK 15 / boss XP 200 unchanged in this pass. Keep Warrior base stats unchanged.** First implement the approved +1 Rogue DEF, but **do not apply the three B-01 Rogue regen buffs blindly in the same measurement**: old combined B-01/B-02 gave Rogue **86%** vs Warrior 55%. Tally measures split variants by class and branch.

| Stat or rule | Warrior | Rogue | Mage | Necromancer |
|---|---:|---:|---:|---:|
| Base HP | 120 unchanged | 85 unchanged | **90** (from 70) | **110** (from 80) |
| Base DEF | 5 unchanged | **4** (from 3; B-02 approved) | **3** (from 2; B-02 approved) | **6** (from 4; one extra above original B-02) |
| Strength | 10 | 8 | 6 | 6 |
| Intelligence | 5 | 6 | **12** (from 10) | **12** (from 9) |
| Agility | 7 | 10 | 7 | 6 |
| Start fight resource | 1 Momentum | 6 Energy | **8 Mana** (from 6) | **3 Soul Energy** (from 1) |
| Base Mana regen | — | — | **3/round** (from 2) | — |
| Soul Energy passive regen | — | — | — | **0** (unchanged; do NOT give unconditional +1) |

**Necromancer resource guidance:** The approved B-03 restriction stands: Soul Energy stays damage-earned per existing rules. Changing fight-start from 1 → 3 gives **+2 early Soul Energy once per fight**, without perpetual Bone Wall spam. Do NOT change Bone Wall's cost (1), summon cost (2), cooldowns or grant 1 Soul Energy for merely guarding. `Channel the Grave` still grants +1 Soul Energy at a cost of **2 true HP** with the approved next-opportunity cooldown. This first-pass buff raises survivability and the capacity to actually summon early. It does **not** claim all three Necro paths are solved.

**Mage:** larger HP, +1 DEF, +2 INT, initial Mana +2 and per-round Mana +1 improve low-level survivability and spell access. **Illusionist's Deception Tokens +2/round is an existing B-01 decision**; allow isolated Tally test of that one option after base Mage buff. **Chronomancer's Time Charges stay +1/round**, because Time +2 previously risked a Slow loop. Review Chronomancer's L3 action availability if it remains unable to win, not a generic buff to every Time skill.

**Rogue:** B-02 alone +1 DEF (3→4). Test Assassin Stealth Tokens +1, Duelist Combo +1, Illusionist Deception +2 **individually** against the new base changes before shipping; don't assume 86% Rogue is desired because the old combined variant overshadowed Warrior. B-01's already-approved regen numbers remain the agreed candidate, but staging is a QA dependency, not a silent rescission.

**Balance objective (not measured result):** each class and each L3 branch should reach **≥60% Warden wins** by smart bot over **at least 200 matched seeds** with reasonable bought healing and no optional farming; no class >90% by default unless boss intended trivial. Collect branch-by-branch and gear purchase profile. If this initial Mage/Necro pass is too strong in earlier encounters, target L3 defensive traits rather than blanket HP again.

## 4. Starter gear must exist and work — concrete equipment fixture
Current beginning inventory strings must be normalized to itemDefinitions with matching IDs or names. Starter equipment should be **automatically equipped on world entry** (or prompted with unmistakable equip UI before G1); never keep inert string items. One-handed weapon occupies `mainHand`; shield `offHand`; armor `bodyArmor`; talisman `accessory`. Existing data engine uses `statModifiers` for stats, but **flat attack bonuses require explicit separate `flatPhysicalDamage`/`flatMagicDamage` support (or matching proven effect semantics)**; +1 STR is only approximately +0.25 damage under `statDamagePer:4`.

| Item / inventory spelling | Class compatibility | Slot | Numeric benefit while equipped | Buy Gold (if stocked) |
|---|---|---|---|---:|
| **Rusty Sword** (current `rusty sword`) | Warrior, Rogue | mainHand | **+1 flat physical damage** | **10** |
| **Wooden Shield** (current `wooden shield`) | Warrior | offHand | **+1 DEF** | **10** |
| **Wooden Staff** (current `wooden staff`) | Mage, Necromancer | mainHand | **+1 flat magic damage** | **10** |
| **Short Sword** (current `short sword`) | Rogue, Warrior | mainHand | **+1 flat physical damage** | **10** |
| **Cracked Bone Staff** (current `cracked bone staff`) | Necromancer | mainHand | **+1 flat magic damage** | **10** |
| **Tarnished Dagger** (new basic) | Rogue, Mage, Necromancer | mainHand | **+1 flat physical damage** | **10** |
| **Hunting Bow** (new optional) | Rogue | mainHand | **+2 flat physical damage** to supported ranged basic attack; requires the engine to support a valid ranged attack, otherwise do **not** stock yet | **20** |
| **Hunting Spear** (new optional) | Warrior, Rogue | mainHand | **+2 flat physical damage** | **20** |
| **Old Greatsword** (new optional) | Warrior | twoHand | **+3 flat physical damage**, **−1 DEF** while wielded; cannot use shield | **25** |
| **Apprentice Wand** (new optional) | Mage | mainHand | **+2 flat magic damage** | **20** |
| **Magus Bracellets** (new optional; retain Director's spelling until naming pass) | Mage, Necromancer | offHand | **+1 flat magic damage**, 0 DEF; stacks with staff/wand only if this offHand item slot is genuinely supported | **20** |
| **Padded Jerkin** (already sold) | All | bodyArmor | **+1 DEF** (existing) | **12** |
| **Roadworn Blade** (already sold) | Warrior, Rogue | mainHand | Change to **+1 flat physical damage**, rather than +1 STR | **10** |
| **Apprentice Charm** (already sold) | All | accessory | **+1 INT** (existing; not +1 spell damage) | **9** |

**Starter loads:** Warrior = Rusty Sword + Wooden Shield equipped; Mage = Wooden Staff equipped; Rogue = Short Sword equipped; Necromancer = Cracked Bone Staff equipped. Old key, spellbook, lockpicks and small black journal are **quest/utility inventory**, not sellable or misrepresented as combat equipment. Weapons above beyond existing starter and shop stock are **first expansion candidates**: add to real vendor stock only after combat/equipment slot mechanics support them. Two-hand/off-hand constraints cannot be bypassed via quick swapping or save/load. No stat drift on equip→unequip→equip; bonuses don't permanently modify base stats. Numeric flat damage must affect valid damage effects in actual engine (including magical casts, not just universal Basic Attack) and not DoT ticks/summon hits unless independently specified.

## 5. Wren/Rook/Tally priority order and acceptance
**Wren first:** merge/test #163 quest catch-up, #164 shop use/location, then #165 free gate *according to actual base branches*; QA report #12's blocking engine defects take priority over tuning. Coordinate with Rook for equipment and transaction logic, don't duplicate modules.
**Numbers to implement next:** gold awards table (98 lifetime mandatory with free first repair), class stats/resource defaults, actual starter gear stat definitions and equip; prepare a single integration candidate and pass to Tally. If engine/API cannot support flat damage without a feature change, mark the item as blocked and obtain Rook implementation; do not substitute +1 STR and claim the balance goal achieved.
**Tally:** rerun 200 fixed seeds per class; report Warden and branch win %, low HP, player healing purchases, Gold left at each checkpoint, free Q07 completion, all 4 mandatory fights; compare baseline vs *class-only* vs *gear-only* vs *Gold/shop healing-only* vs *combined* to avoid claiming a specific buff caused an observed improvement. Test no class can force the boss by free infinite resources, no duplicate awards/fast-travel farming, no early aspect unlock via catch-up.
**Pixie** is the sole current UI/UX owner (per studio issue #140); Sable now VFX. Do not assign shop UI changes to Sable.

## 6. Conflict resolution / what supersedes what
- **Earlier Vaelis economy memo 70 post-Warden / 60 gate:** superseded here by **20 post-seal / 0 first gate** (new Director decision).
- **Earlier chat proposal unconditional Soul Energy 1/round:** explicitly withdrawn; [approved B-03](VAELIS_BALANCE_DECISIONS_2026-10-23.md) prohibits it pending redesign. **3 Soul Energy starting each fight** is the finite alternative to test.
- **QA #10 baseline** is historical; **QA #12 Warden 55/15/28/0** is latest observed fixture.
- **No code changes made by Vaelis in this PR.** Exact numeric proposals have not been measured in combination. Tally's results may require focused revision.
