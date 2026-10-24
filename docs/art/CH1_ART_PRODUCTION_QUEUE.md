# Chapter One — Visual Asset Production Queue
**Owner:** Morrigan · **Game artist/animator:** Vesper · **Coordinator:** Veyr  
**Status:** Proposed production priorities · 2026-10-24

| Order | Package | Lead | Concrete acceptance artifact | Dependencies |
|---|---|---|---|---|
| P0-1 | Base protagonist | Vesper | 3 exploratory silhouettes + 4-way turnaround + 1× readability | Director chooses silhouette |
| P0-2 | Hairstyles and cosmetics | Vesper | 12 × 4-facing hairstyle contact sheet, hair-back/front separation, 4 outfit concepts | Base protagonist, `docs/SPRITES.md` |
| P0-3 | Character creator visual integration | Sable/Pixie + Wren | actual preview↔world parity captures, all 12 distinct styles | Vesper's assets, current creator API |
| P0-4 | Shamefield square art kit | Vesper | 1 village style frame + modular facade/roof/fountain/stall/bakery/brewery props | `docs/design/SHAMEFIELD_VILLAGE_MAP_AND_IMPLEMENTATION_HANDOFF.md` |
| P0-5 | Crow-Touched Warden | Vesper | kind caretaker silhouette, face sheet, ordinary-crow companion studies, sanctuary key art | Vaelis continuity review |
| P1-6 | Supporting faces | Vesper | Shane, Tamsin, Orin Vale and **separate** post-seal aspect crow design studies | existing NPC dialogue; Orin origin unfinalized |
| P1-7 | Standard enemies | Vesper | ragpicker goblin + ritual-scarred ghoul readable sprites / telegraph poses | existing monster IDs only |
| P1-8 | Battle style frame | Vesper | one sanctuary battle backdrop with placement guides, combatant contrast | Warden design, existing battle layout |

## Shamefield first-pass boundaries
Start with *existing* ~30×24 Shamefield map and its existing exits/positions. Vesper paints reusable materials and recognizable storefronts; Wren/Sable integrate without moving quest-critical NPCs or blockers. Historic south-German town cues interpreted for mountainous Blackbriar: timber frame, plaster, sandstone, dark roof, steep lane; cloister/brewery economies visible in props. Proposed new lanes, cloister map and interiors are out of this first art package.

## Warden and aspect distinction
The first boss is a caretaker, not a cult leader. The ordinary crows mourn him. When the **seal opens** (not merely when Warden dies), Nahemoth's talking crow emerges as a supernatural shadow-bird. Color, eye treatment and contour language must distinguish it from actual animals; no spoilers of the player's hidden past.

## Review checklist before marking any asset 'implementation-ready'
- Exact dimensions, visible alpha edges, palette and source-file format supplied.
- Native 1× readability and 2× game screenshot tested; collision/walkable paths and UI text remain clear.
- Direction/facing variants and layer-order documented; filename↔manifest indices match existing data.
- Preview/world parity confirmed where relevant, with captured evidence.
- No unapproved lore, mechanics, world transitions or character reveal.
- Credit/licensing included for any third-party reference or derived material; original ENSO art preferred.

## Constraints / non-goals
No gameplay rule changes, no map rewrite, no new statistics or items, no broad future-region art production. Documentation alone is *not* a completed art asset.
