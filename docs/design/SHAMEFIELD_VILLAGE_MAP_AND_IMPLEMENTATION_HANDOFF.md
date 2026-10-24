# Shamefield Expansion — Map Architecture, Art and Studio Handoff
**Vaelis / World and Narrative Design · 24 October 2026**  
**Creative brief:** [Shamefield Village Lore and Production](SHAMEFIELD_VILLAGE_LORE_AND_PRODUCTION.md) and [Blackbriar Vale Regional Bible](BLACKBRIAR_VALE_REGIONAL_LORE_BIBLE.md). This is an **implementation plan, not a code authorization or claim of current content**.

## Current code anchors — preserve them
The `shamefield` map currently lives in `src/world/chapter1-maps.js`. At review, its main tile area is about **30×24**, with three exits: south to `tollway`, north to `orchard` (gated `north_gate_open`), west to `allotment`. It already includes the well, memorial, houses, several market stalls and NPC locations:
- `village_tamsin` (9,8), `village_mara` (12,7), `village_bragg` (21,7), `village_iona` (23,13), `village_captain` (6,5), `village_elian` (24,5), `village_shane` (13,10), `village_crowd` (17,10).
- `village_notice_board` (8,7), `village_well` (15,9), `village_memorial` (26,15).
Coordinates above are *observed anchors*, not a license to place new solids on those tiles. Existing `src/world/world.js` reachability/transition validation, quest marker locations and scripted world events apply.

**No breaking map replacement**: preserve every active objective and the existing routes from tollway, orchard and Shane's allotment. Don't move named NPCs until markers and arrival scans are updated atomically. New art actors only render once player is in their map, respecting Director #96.

## Geographic layout — conceptual, not exact tile coords
```
                    FORESTED NORTH HILLS / ORCHARD GATE
                                   |
                  [Orchard lane / hop trellises]
                                   |
       [Kloster upper gate / stone cloister] ------ [Granary, barley drying, herb garden]
                     |                         [Brewery + cask yard]   [Millpond / stream sluice]
                     |                      |
       [Brewery shop]----[Cobbled market square + fountain]----[Bragg smith & tannery]
                    |                |            |
                [Beer garden]   [Village well]  [Iona herbs]
                    |                |
            [Bakery / Oda]----[Butcher / Greta]----[Inn and guest rooms]
                    |                |
       [West household lane]--[Shane's allotment road]--[Watchhouse and homes]
                                   |
                         [South trade road / tollway]
```
Keep the established east/west/north relationships as game data dictates. The cloister could sit **uphill beyond the square**, while the watermill sits by the lower stream and residential lanes flank the trade road. Don't require a continental map rewrite.

## Proposed map breakdown — incremental, with bounded new scopes
| Proposed map or subspace | Function and art | First implementation size | Dependencies |
|---|---|---|---|
| **shamefield** (existing) | Market square, fountain/well, notice board, public seating, core shops, NPC bustle and homes | Preserve 30×24 map and exits as first step; improve street tiles/facades only where validated | Renderer and world validator |
| **village_residential_lane** (new optional connected map) | 6–10 distinct houses/front gardens, smoke chimneys, wood piles, baker's yard, butcher smokehouse | Compact area, simple return exits | New bi-directional exits, NPC schedules |
| **briarwell_cloister_court** (new) | Stone arch, cloister square, bell, granary, malt yard, barrels and beer shop; conspicuous fountain-house | One outer playable courtyard; interiors later | Keep monastery faith lore neutral; no new quest gate |
| **village_millbank** (new) | Stream, turning waterwheel, small sluice, grain sacks and orchard-hops connection | One stream-side passage map; preserve approach | Requires water painter and reachable objects |
| **village_inn_yard** (optional later) | Beer garden, inn, stable and shaded table service | Could initially be part of central map to save scope | Stock/commerce availability |
| **kloster_brewery_interior** (later) | Kettles, mash room, barley bins, fermenting casks and cellar | Phase 2 after exterior validated | Interiors/draw depth, shop/inventory |
| **village_house_interior** (later) | Residential texture, not every door; exemplar home/baker backroom | Start with 1–2 authored interiors | Save flags, story purpose |

**Do not try to fit every building onto the 30×24 existing square** or create dozens of room transitions before player can see a meaningful village. Build reusable architecture modules: Fachwerk house, plaster facade, sloped tile roof, stacked barrel, drying hops, grain sack, stone fountain, bread oven, chimney, pig pen, fenced garden, brewery arch. Different function should be visible without opening a menu.

## Immediate MVP — convincing Shamefield, not a massive town simulator
1. Make the existing square recognizable: layered cobblestone, **distinct fountain next to existing well** (don't delete well), at least 3 different roof/façade styles, village notice board, lanterns, market awnings, baker's sign, smokehouse frontage, tavern/beer-garden tables.
2. Connect one **cloister courtyard** map and one short **residential/shop lane** using reversible exits, with clear signs and no dead ends. Preserve all existing gates.
3. Add **4 meaningful exterior NPCs** *only if* they support actual dialogue/inspect/trade, e.g. baker, monk/brewer, butcher, hunter; generic villagers may use nonblocking ambient animations but **do not duplicate core NPC IDs**.
4. Make physical production visible: mill or sacks → oven → bread stall; barley/hops → cloister casks → tavern; pigs → smokehouse → sausages. At least two complete visual chains identifiable without reading this document.
5. Provide interactable lore at oven, beer cask labels, fountain repair names, cloister charter, granary and smokehouse. Interactions are short, progressive text per Director #96; no XP solely for clicking scenery.
6. Integrate with working merchant contract: existing Mara/Bragg/Iona/Shane retain functioning inventory and don't become fake stores. New bread/butcher/brewery stock should wait for or connect to **real engine item definitions and shop stock**, not placeholder "buy" buttons. Food and beer can appear as narrative furnishings before inventory rules exist, **clearly not advertised as purchasable**.
7. Show village life without a full clock: chimney smoke, idling customers, water wheel, moving cart, carry-sack / draw-water barks, hens and crows. If a schedule exists, NPCs must remain reachable for required quests at all times.
8. Add village atmosphere audio only as appropriate to project art/audio scope; no external assets without license review.

## Studio handoffs — review responsibilities rather than unauthorized simultaneous code work
| Owner lane | Expected concrete output after work assignment | Acceptance |
|---|---|---|
| **Veyr / production** | Separate art/map work from item data and story scripts; track dependencies | Clear owner/PR per component; no duplicated changes to `src/world/chapter1-maps.js` |
| **Sable / Pixie depending on current UI assignment** | Village architectural style guide and mockups, re-usable tiles/sprites, legible market/streets, dialogue readability | Clearly distinct Fachwerk/stone monastery/inn visuals; no next-map NPC bleed |
| **Wren / world** | Validated extensions to existing maps, new bilateral transitions, inspectables and NPC placements | `npm run world` and `npm test`; quest markers remain reachable |
| **Rook / economy/items** | Bread, food, beer-trade, pork products and materials mapped into item categories; shops with actual stock, Gold and stable buy/sell | No inert purchased items, no fake stores or empty stock; numbers tested with Tally |
| **Keel** | Review map composition / NPC states / actor visibility when needed | Avoid engine rewrites; no brittle hardcoded coords |
| **Tally / QA** | Map path/re-entry tests, shop usability, reward economy and save/load regressions | Normal gameplay from start to Warden still accessible; no XP granted for mere scene change |
| **Vaelis** | NPC dialogue, village history, production quest briefs and religious consistency | No midgame protagonist reveal; Warden and Shane continuity preserved |

## Suggested future quest entries, no numerical rewards yet
- `SHAME_BREAD_01`: **The Last Sack** — find delayed flour/cause of mill stoppage; meaningful village production recovery, not walking XP.
- `SHAME_BEER_01`: **Bitter Hops** — inspect trellis and water source, help brewer and growers.
- `SHAME_PORK_01`: **Salt for the Smokehouse** — trade route supplies and butcher's stock.
- `SHAME_KLOSTER_01`: **The First Loaf** — tension over reserve grain in difficult year.
- `SHAME_MARKET_01`: **The Fallen Barrel** — retrieve casks lost on a road, restock inn and cloister.
- `SHAME_WARDEN_01`: **Ashes on the Feast Day** — villagers' grief when a good guardian dies.
All are **optional**, so Shane recruitment, Q04/Q05, first evolution and Warden route cannot depend on them. Create proper quest scripts and quest XP approvals separately.

## Acceptance checklist for first village improvement PR
- [ ] Market square now visually reads as a German-influenced medieval village (not bare colored rectangles)
- [ ] Kloster is visible and can be reached; water/fields/hops/bakery/brewery/pork trades are legible
- [ ] Distinct home area with ordinary villagers and at least one short interaction
- [ ] Fountain AND old well remain, with different purposes
- [ ] Bragg/Mara/Iona, Tamsin, watch and Shane interactions still work
- [ ] No destination-only NPC appears before player changes maps
- [ ] Flavor text once per area entry per playthrough (where specified); scene/object dialogue appears progressively
- [ ] No mandatory quest XP changes or early-player identity spoilers
- [ ] Real shop stocks and equipability handled in economy/item PR, not disguised with scenery
- [ ] Backtracking, save/reload and world validation pass
- [ ] Art and assets reviewed for consistency and permission

## Research references (for art team only)
- Maulbronn site architecture and courtyard water infrastructure: https://www.kloster-maulbronn.de/en/monastery and https://whc.unesco.org/en/list/546/
- Maulbronn working court and storehouses: https://www.kloster-maulbronn.de/en/visitor-experience/the-monastery/the-buildings/
- Ettal monastery brewing: https://www.kloster-ettal.de/en/betriebe-produkte/brauerei/
- Ettal monastery hospitality: https://kloster-ettal.de/en/ettal-erleben/essen-und-trinken/
- German half-timber squares and fountains: architectural reference from Erbach and Eltville am Rhein; source photographs used as reference only, not copied assets.
