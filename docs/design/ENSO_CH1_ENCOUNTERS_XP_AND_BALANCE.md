# ENSO Chapter One — Enemy Roster, XP Guarantee and Tally QA Test Plan
**Vaelis — gameplay design proposal** · 2026-10-23 · **New XP and enemy values require balancing approval before implementation**.

## Verified starting-point mechanics
As of main inspection, `docs/GAME_DESIGN_STATUS.md`: the player needs **100 XP for level 2 and 150 additional XP for level 3 = 250 cumulative XP** to choose first branch. The visible graphical zone contains optional **Rust Rats ×2 (20 XP) + Hungry Wolf (15 XP) = 35 XP**; they cannot meet L3 alone. The text dungeon and its boss are a separate route; don't accidentally double-reward transferred encounters. `src/data.js` contains existing enemy XP: weak goblin 10, rust rat 10, bone gnawer 15, cult acolyte 20, ritual-scarred ghoul 30, Warden 200. No per-class level gate change proposed.

## Mainline XP budget: guaranteed evolution BEFORE Warden
Proposed new *quest XP grants* supplement existing defeated-enemy XP. **The totals below are design targets and require Tally to test balance and implementation feasibility**.

| Sequence | Guarantee source | XP gained | Cumulative |
|---|---|---:|---:|
| 1 | Q01 A Name in the Dark (main quest) | 15 | 15 |
| 2 | Q02 A House That Remembers (main quest) | 20 | 35 |
| 3 | Q03 Road Keeps Its Dead (main quest) | 25 | 60 |
| 4 | G1 Ragpicker Pair: Weak Goblin ×2 | 20 | 80 |
| 5 | G2 Root-Chewers: Bone Gnawer + Rust Rat | 25 | **105 (L2)** |
| 6 | Q04 Bread and Bell (main quest) | 25 | 130 |
| 7 | Q05 Orchard Ledger (main quest) | 20 | 150 |
| 8 | G3 Broken Oath Cultists: Cult Acolyte ×2 | 40 | 190 |
| 9 | G4 Ritual-Scarred Ghoul | 30 | 220 |
| 10 | Q06 Keeper's Warning (pre-boss objective) | 30 | **250 (L3)** |
| Optional | Existing rats 20 and wolf 15 | +35 | 285 if both |
| Optional | Shane / jobs / other encounters | TBD (not counted) | ≥250 |

Arithmetic: mandatory quest XP **135** (=15+20+25+25+20+30); mandatory enemy XP **115** (=20+25+40+30); **250 total**. No grinding, Shane quest, lucky drops, gold purchases or Warden kill XP required. XP grant is exactly once per story/encounter flag. A player who skips *all optional combat and side quests* reaches the first branch before boss. If world gating allows avoiding any 'required' encounter, provide a different guaranteed quest XP source or reclassify XP source to retain the invariant—never secretly force farm.

**Pacing concern:** 150 XP obtained by midway village; players should not enter boss unprepared if quest events are easy to rush. Tally must test Mage/Rogue/Necro with current DEF and resources, not simply assert four mandatory fights are trivial. Existing goblins/ghouls and cult acolytes may be too lethal; composition is **candidate**, and the success invariant is more important than this exact roster.

## Candidate enemy content to make the world feel inhabited
| Encounter archetype | Placement / purpose | AI telegraph and class interaction | Numerical status |
|---|---|---|---|
| Ragpicker (reuse Weak Goblin) | broken bridge, opportunistic loot thieves | moves between waypoints; shouts and advances when player seen | Reuse existing stats/10 XP |
| Root-Chewer (reuse Bone Gnawer) | cart grave near tollway | short patrol, faster movement, reveals undead | Reuse 15 XP |
| Road Rust Rat | roadside, low-risk creature | huddles, flees to ambush position; 10 XP | Reuse 10 XP |
| Broken Oath Cult Acolyte | hidden causeway to orchard | protects ritual site, slow warning radius | Reuse 20 XP |
| Ritual-Scarred Ghoul | Warden's outer prison | contained roaming creature, breaks patrol only when triggered | Reuse 30 XP |
| Mire Lurker (reuse) | marsh side trail / optional | stationary camouflage, status pressure | Existing 20 XP; optional |
| Hungry Wolf (reuse) | road pack / optional | sight/hunt but disengages if outrun | Existing 15 XP; optional |
| **Carrion Crow Swarm (new)** | Warden sanctuary, **optional environmental hazard** | startles, circles and warns Warden; not villain by default; no compelled killing | XP, damage, flags TBD; avoid extra boss ads |
| **Watch Constable (new)** | Shane side quest | pursuit/watch patrol, warnings before encounter; guards' legal duty acknowledged | HP/DEF/XP/damage TBD; Tally proposal |
| **Roadside Poacher (new)** | village outskirts | traps and shot telegraph, interacts with villagers | Stats and XP TBD |
| **Cinder Beetle (new)** | optional hollow stump | armored, slow, alternate damage resistance | Stats, XP, drops TBD |
| **Crow-Roost Sentinel (new)** | non-hostile initially | posture changes as sanctuary threatened; avoid mandatory innocent-animal slaughter | Stats, XP, aggression TBD |

**Design variety:** enemy behavior differences should matter more than sheer sprite count: patrol vs stationary, chase vs flee, warning vs ambush, ranged/telegraph vs melee, honest guards vs malicious cultists. Hostility is not moral alignment. Reuse existing battle engine and species stats first; reserve new numbers for Tally.

## Overworld encounter contract
- Exploration remains tile/step based; **turn-based battles on trigger**. The enemy's line-of-sight/pursuit should occur in world movement logic, *not* in engine combat time. No stealth-stat/sight-radius numbers approved.
- Patrol actor state: `idle | patrol | alerted | pursuing | resetting | defeated`, with deterministic waypoints and event notification. Alert shows **visual cue before irreversible contact**; fleeing should allow a grace disengage and avoid re-trigger loops.
- Sight requires unobstructed corridor/appropriate map obstruction; no detection through walls. NPCs/merchants are not automatically hostility targets. Separate peaceful crows from hostile mobs.
- Enemy XP awarded by defeated entity once, not every time player re-enters map; defeating two units in one encounter grants each unit's existing XP once. Flee grants no kill XP. Optional spawns cannot be infinitely farmed absent explicit respawn design.
- Progression reward display should clearly show `+XP`, current cumulative XP, next-level threshold and selected class stage. A 'class evolution ready' prompt fires upon >=250 XP, then pauses until branch choice under existing system (safe entry before Warden).
- First boss is a **level-3 benchmark**, not a gate required for obtaining level 3. Do not level-cap player or disable ordinary XP to preserve the exact target.

## Explicit Tally balance/QA assignment request (not an automatic delegation)
1. Verify current `levelUps` threshold source and XP accounting; confirm 250 cumulative under live code and whether quest XP callback exists.
2. Record ten-step mainline XP trace for each class with all optional content skipped. Enforce **>=250 XP before Warden**; no double grants after save/reload/travel.
3. Compare seeded *100+ simulations per class* at stage segments, with and without proposed early gear, **holding DEF/resources fixed** and then testing approved future balance variants separately. Report encounter death location, damage sources, healing used, resources on entry, evolution timing.
4. Specifically test Mage 0%, Necro 2%, Rogue 8% previously reported baseline as *historic*, not guaranteed current rates; explain bot vs human tactical divergence, and test world encounters separate from full text dungeon.
5. Evaluate optional encounter experience and expected player L3 timing; distinguish XP adequacy from combat difficulty; **do not grant +2 DEF or QA-8B regeneration without Director ruling**.
6. Test long chase/patrols, escape and resuming to prevent enemy griefing/soft-lock, including village watch interactions.
7. Publish a QA result table: encounter, candidate composition, class, trial count, win%, resource remaining, XP earned, highest damage, failure mode, recommended alternative.

## Approvals pending
Quest XP values, new creature stats and loot, enemy patrol detection specifics, watch encounter ethics/outcomes, optional side quest rewards. Existing enemy base stats remain unchanged. No gameplay code edits authorized by this doc.
