# Morrigan — VD-002 HD-2D graphics review and proposed art gates
**Date:** 2026-10-24 · **Author:** Morrigan — Concept Artist & Visual Development Lead
**Status:** REVIEW / PROPOSALS ONLY. No production authorization or Director-approved concepts.
**Applicable studio decision:** [#140](https://github.com/TokeloR-I/TEXT_RPG_Nameless/issues/140) and merged roster PR #141.

## Evidence and limits
Reviewed current main-branch source (`ui/tiles-hd.js`, `ui/battle-hd.js`, `docs/SPRITES.md`, `docs/AGENT_ROSTER.md`, and prior `docs/art/VD-001_CHARACTER_CREATOR_HANDOFF.md`) and recent merged HD-2D delivery reports:
- #129 / #130: character creator concept implemented, sidebar removed.
- #131: HD-2D battle UI.
- #132: postprocessing, lighting, outdoor tile detail.
- #133 / #134: portraits, battle anchors, layered villagers.
- #135: reduced exploration HUD.
- #138: distinct layered battle stages and procedural 64px foes.
- #139: detailed house/cellar/sanctuary indoor tiles.
Existing capture paths in `docs/captures/hd2d/` include `square.png`, `cloister.png`, `interior-sanctuary.png`, `battle-village.png`, `battle-crypt.png`, `phone-battle.png`, etc. **These captures have NOT been visually inspected in this review session.** Observations below are source/release-note-supported design risks, not asserted screenshot defects. In-game browser playtest remains a required subsequent QA gate.

## Conclusion
The technical graphics layer has advanced. Additional procedural detail should no longer be mistaken for the final visual identity. Prioritize authored art and comparative play captures, while protecting UI readability and performance. Preserve Wren's functioning Canvas/HD pipeline rather than restarting the renderer.

## Strengths verified from code / merged deliveries
1. Separated HD tile painters, battle backgrounds, detailed enemies, compositing and sprite hooks support incremental art replacement.
2. Existing 24×32 layered protagonist contract supports customization parity.
3. UI has portrait hooks, battle anchors, compact HUD and new stage variants; work should complement, not override, these.
4. Shamefield's architecture has a robust narrative brief; the first asset set can tie craft economy to visible buildings.

## Priority visual risks to validate in browser
- **Detail density:** `ui/tiles-hd.js` draws grain, joints, stones and foliage at sub-tile scale. Compare path legibility and interactable/NPC contrast at 1×, 2×, phone and in night scenes.
- **Painter style mismatch:** `ui/battle-hd.js` procedurally shades 64px foes while exploration avatars are 24×32 pixel layered. Test whether shape and lighting language actually match (do not claim mismatch without side-by-side capture).
- **Palette/lighting consistency:** compare exterior, cellar, sanctuary and battle stage in one presentation board; watch for loss of silhouette from grade/bloom.
- **Character creator continuity:** verify existing 12 hairstyles and 4 outfits in world, including rear hair and profile views; do not assume the old VD-001 layout describes the current screen.
- **Narrative signposting:** Warden must read as compassionate guardian, Nahemoth aspect crow as explicitly unnatural and distinct from his beloved ordinary birds.

## Proposed concept signoff sequence (Morrigan → Director → Vesper/Sable)
### Gate A — Unified art sample (FIRST; no mass production)
Morrigan prepares an **original**, clearly labelled exploratory reference board consisting of:
1. protagonist front/back/side concept;
2. one recognizable Shamefield house/bakery/cobble segment with a warm/cold lighting note;
3. Crow-Touched Warden + ordinary crow + separate post-seal aspect crow silhouette comparison;
4. one battle-stage lighting and focal hierarchy sketch, mapped to current HD-2D stage.
For each, show a 1× sprite-scale translation target (not just painted key art), palette, material breakdown and contrast checks. Submit to Creative Director for explicit review/approval.

### Gate B — Vesper (2D Game Artist & Pixel Animator): **PROPOSAL, NOT START ORDER**
Only **after Gate A Director approval**, first implementation-ready asset batch:
- **Player:** one approved base silhouette; four direction idle/walk export and layered head/body/outfit/hair; a sample of three maximally contrasting hairstyles first. Only then complete all 12 styles and four outfits.
- **Shamefield:** a micro-tileset for one recognizable segment (timber facade, sandstone, clay/slate roof, cobble, bakery sign/oven, barrels); must align with tile IDs and not change quest/NPC coordinates.
- **Warden:** one neutral/battle silhouette and ordinary crows, then a separate Nahemoth crow AFTER lore check; no identity-twist symbols.
- **Enemy proof:** one goblin and one ghoul silhouette at actual combat-stage pixel footprint, with 1× screenshots next to protagonist for scale coherence.
Production package requires editable source, individual transparent exports/sheet layout, indices/facings, footprints/anchors, filenames, preview captures, licensing/credit statement.

### Gate C — Sable (2D VFX Artist): **CONCEPT DIRECTION ONLY, HOLD FOR DIRECTOR AUTHORIZATION**
No interface, character sprites or tiles. First proposed VFX style sampler has **three alternatives per effect**, evaluated as *still storyboards*, not production assets:
1. **Black Flight:** feather silhouettes gather → character dissolves into a negative-space flutter → reappears at known anchor; readable without high-frequency flashing.
2. **Nahemoth crow manifestation:** tiny dark interruptions around the seal → feather swirl → intelligent crow form; clearly different from ordinary birds.
3. **One ordinary magic impact:** crisp anticipation / impact / decay timed to engine events; ensure target, damage numbers and statuses remain legible.
Each storyboard defines frames/timing candidates, palette, bounds, alpha blend, layering relative to actors, low-motion substitute and on-phone visibility. Await explicit Director-approved concepts **and specific work assignment** before Sable animates.

### Pixie (sole UI/UX lead) — no Sable UI work
Continue existing assigned #97 only; verify creator-world appearance match, dialogue line advance/skip, exploration HUD legibility in brightest village/night forest, portrait consistency and touch controls. Review proposed art *placement/contrast* only; Pixie remains the only owner of menu/control/layout changes. If sprite manifest or event hooks are missing, request exact API from Wren through issue threads.

### Wren
Owns renderer compositing/asset registration, sprite manifests, gameplay rendering and visual capture tooling. No request to invent approved character, tileset or VFX concepts. Keep shader toggle/reduced motion and gameplay unaffected where present.

## Acceptance presentation board for Director
At minimum side-by-side **current build** vs **proposed concept** at: creator, Shamefield square, sanctuary, forest battle, village battle, and one narrow phone view. Mark concept and implementation separately; show overlays with walkable routes, NPC and objective/interaction readability. Do not declare a visual fix based on documentation alone.

## Corrections to VD-001
Old VD-001 names “Sable/Pixie” jointly as frontend. This is historical and **superseded** by #140: **Pixie alone owns frontend; Sable VFX only**. VD-001 has no approval to commence Vesper or Sable production. Its default costume and palette are unapproved suggestions.

## Blockers / approval request
- Need actual visual inspection of committed HD-2D captures and browser playthrough before final grading.
- Director to decide the first visual reference target after Morrigan's updated original exploration.
- No sprite/VFX production is authorized by this document or PR.
