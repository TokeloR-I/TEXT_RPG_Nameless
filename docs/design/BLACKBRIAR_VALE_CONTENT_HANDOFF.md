# Blackbriar Vale — Cross-Team Content Handoff
**Prepared by Vaelis · 24 October 2026**  
**Source of truth:** [Blackbriar Vale Regional Lore Bible](BLACKBRIAR_VALE_REGIONAL_LORE_BIBLE.md). Reference [Chapter One design](ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md), [world narrative foundation](ENSO_WORLD_NARRATIVE_FOUNDATION.md) and [current implementation guide](../CHAPTER_ONE.md).

## Intent
The Creative Director wants the **Forgotten Homestead to become the player's permanent base** in a lived-in, forested mountain region populated by huntable wildlife, threatening creatures, tradespeople and villagers. Start turning Chapter One into a world **worth exploring and returning to**. Keep established gameplay and approved story intact.

## Current versus planned
**Existing:** cellar/house/grounds/shed/well/Overgrown Road, Broken Tollway, Shamefield, allotment, orchard, Featherwatch, Warden sanctuary, named village NPCs, first Qliphoth key narrative, quest framework. Check actual `src/world/` and `src/story/chapter1.js` before planning edits.
**New regional design only:** geographical label Blackbriar Vale, Graypine woodland, Thornmeadow slopes, Coldwater stream fringe, hunting traditions and ambient game, proposed Harlan Voss, additional side quests and growth into full dark castle. **These are not existing maps, creatures, NPC implementations or approved balance tables.**

## Actionable content work packets — **proposals, not automatic code assignments**
| ID | Story/gameplay increment | Minimum player-visible deliverable | Readiness |
|---|---|---|---|
| **BV-01** | Recognizable homestead ecology | Mossy ridge, timber stand, game trail, water source and blocked future construction sites; environmental inspectables express permanence | Lore baseline ready; Sable/world review |
| **BV-02** | Shamefield feels inhabited | Visible daily work states for smith, hunter, orchard keeper, herbalist and watch; villagers react to events, no premature map NPC rendering | Content brief ready; scope/technical review |
| **BV-03** | Wildlife presence | Nonhostile hare, deer, wild birds and roaming predators with distinct alert/flight states; **no free XP for hunting by default** | Requires Keel/Wren AI boundaries and Tally QA |
| **BV-04** | Hunter culture pilot | Hunter NPC (Harlan Voss working name), one tracking quest, lore about hunting ethics and wildlife changes | Quest dialogue + NPC name signoff needed |
| **BV-05** | Gathering and trade identity | Herbs/berries/skins/wood/scrap illustrated and inspectable, consistent with live inventory, Gold and stocked vendors | Depends on real item/economy implementation; Tally tests loot value |
| **BV-06** | Homestead visual progression | Ruin → first restored gate → early productive field → later fortified estate/citadel silhouette in concept | First gate depends on Q07 economy and build feature |
| **BV-07** | New regional side locations | Graypine grove / stream bank / upland meadow each supports one reason to visit and one re-entry reaction | Relative map names proposed; no unapproved XP |
| **BV-08** | Warden consequence | Sanctuary reflects crow caretaker's kindness, after death village/hunters and birds visibly grieve; preserve identity mystery | Existing story direction ready |

## Interface to the rest of the studio
- **Veyr:** incorporate this content stream into the existing Chapter One schedule, prioritize core region landmarks and living Shamefield over speculative continent-sized expansion.
- **Sable:** distinguish pine forest, upland meadow, stream, farming, ruins and village with actual silhouettes, ambient activity and interaction cues; no cosmetic-only substitutes for requested item/character customization.
- **Wren / Rook:** review current map IDs and actor implementations before building new scenes. Only take assigned code modules; do not overlap economy fixes, chase AI or builder systems other agents own.
- **Keel:** review save/persistent region flags, wildlife NPC types (peaceful/hostile/harvestable), movement boundary and future construction art without new engine refactors.
- **Tally:** assess new roaming wildlife and hunter quests for trivial XP farms, collision/softlocks, progression timing, healing/Gold economy and reliable backtracking to homestead.
- **Vaelis:** own local cultural writing, lore descriptions, quest scripts and consistency with hidden-tyrant reveal.
- **Creative Director:** retain final say over new major story canon and functional balance. Acceptance of this lore PR establishes region/worldbuilding direction, not numerical tuning or automatic implementation of BV-01..08.

## Non-negotiable acceptance checks for future implementation PRs
1. Player can leave and return to homestead from Shamefield and new subareas without softlocking or repeated one-time intro dialogue.
2. New maps don't spawn next-area NPCs early and pass world validation; no mandatory hidden path through deadly wildlife.
3. Wildlife is not universally aggressive; peaceful fauna can move or flee without combat; deliberate predator encounters are signaled.
4. Tally verifies Gold/loot/XP reward pathways independently; optional hunting does not grant unlimited repeatable Gold or XP.
5. Village NPCs show ordinary occupations and local reactions; Shane's ordinary goodbye remains exactly **"Suffer!"**
6. Visual changes to homestead persist and track valid construction events; dark castle is future growth, not instantly built.
7. No early dialogue spoils the playable character's former rule; Warden remains a sympathetic good guardian.
8. Any new weapon, armor, consumable, merchant stock, profession or crafting recipe respects separate economy/equipment design and numeric approvals.

## Writing-ready description snippets — proposed regional barks
**Entering Graypine:** “The pines close together here. You can hear water, though no stream is in sight. Something large has passed between the trunks recently.”

**Shamefield market:** “Smoke curls over the smithy. A hunter hangs a fresh hide beside the well, and a woman argues over its weight. Everyone pauses when the stranger crosses the square.”

**Hunting track:** “Two narrow hoof marks bend downhill toward the reeds. Beside them: pawprints, older but following the same line.”

**Approach to Featherwatch:** “The air thins. A crow watches from the wall, one wing bound with a clean strip of cloth.”

**Homestead return:** “The broken stones have not moved. Yet it is becoming easier to imagine walls where the weeds now grow.”

Snippets may be edited by Vaelis before scripting; these are **not already placed in the game**.
