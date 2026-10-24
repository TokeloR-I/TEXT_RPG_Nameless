# ENSO's Last Stand — Chapter One Visual Direction
**Owner:** Morrigan (Concept Artist & Visual Development Lead)  
**Art production:** Vesper (Game Artist & Animator)  
**Frontend:** Sable/Pixie; **rendering:** Wren  
**State:** REVIEW PROPOSAL — not Director-approved canon or final artwork  
**Scope:** Chapter One only · 2026-10-24

## Core direction — Blackbriar Gothic
Dark romantic, grounded, lived-in pixel fantasy. Civilization is warm and useful; wilderness is cold and watchful; old seals feel otherworldly and wrong. **Do not make every surface black or every ordinary villager sinister.** The moral weight of killing the good Crow-Touched Warden relies on an inviting human world that remains believable.

### Proposed environment color roles (concept only)
| Role | Candidate hex | Usage |
|---|---|---|
| Deep ink | `#171923` | Night shadows, negative space |
| Slate | `#343D43` | Cold stone / woods |
| Moss | `#58685B` | Forest midtone |
| Sandstone | `#897867` | Village masonry |
| Aged brass | `#B38B52` | Select fittings, UI/art reference |
| Hearth | `#CF985D` | Bakery, windows, lanterns |
| Dried crimson | `#7A3545` | Select costumes and emphasis |
| Parchment | `#B9B4A4` | Highlights, faded plaster |

Color suggestions, NOT replacements for Pixie's existing CSS tokens; accessibility and contrast remain UI-owned. Lighting hierarchy: readable playable ground first; props and detail second; dramatic glow last.

### Shape language
- **Homestead:** recognizable timber-and-stone structure with uneven roofline, collapsed edges, worn but salvageable. Its later castle expansion must have a credible structural footprint, without showing the protagonist's secret.
- **Shamefield:** functional late-medieval German-inspired Fachwerk, steep slate/tile roofs, irregular sandstone foundation, cobblestone, cooper/baker/butcher/brewery props; a real bread-and-barrel village, not a gothic necropolis.
- **Blackbriar road/forest:** tall fir/pine spires, root silhouettes, fractured waystones, cold mist; main traversable path must always be legible.
- **Sanctuary:** gentler rounded worn masonry, nests, small offerings and cared-for spaces; it is protected by a compassionate man, not an evil cult temple.
- **Nahemoth supernatural:** unnatural broken-feather gaps, interrupted contour, shadow within shadow; visually distinct from ordinary crows.

### Character and enemy readability
At gameplay scale, identify entities by *shape before palette*. Protagonist has a readable head/shoulder silhouette; ordinary villagers vary by vocation; Warden carries burden and compassion, not monstrous intent. Ragpicker goblins are wiry, scavenged, asymmetric; ritual ghoul has distorted limbs and ritual scars (not interchangeable with goblins). Reserve high-contrast glow for interactive cues, magic and the aspect.

### Pixel pipeline contract (existing repo, not new implementation)
See `docs/SPRITES.md`: player frame 24×32, foot anchor (12,30), 4 facings; layers hairBack/body/outfit/hairFront with facing-specific ordering. Preview and world use `ENSO.sprites.drawCharacter`. Wren owns sheet loading/animation. Vesper supplies original production art following the manifest; Morrigan reviews silhouette, palette and style parity. Never silently overwrite generated placeholder files.

### Director review gates
1. Choose/adjust one style frame (player + village + sanctuary mood) before mass authoring.
2. Approve base player silhouette, 12 hairstyle silhouettes and the 4 outfit families.
3. Approve Warden interpretation and Shamefield architectural modules.
4. After Vesper delivers originals, compare actual 1× sprites (all 4 facings) and 2× game captures for consistency.

### Continuity safeguards
- Player identity as the defeated ruler is a **Chapter One secret**: no crowns, sigils or portraits exposing the twist.
- Warden is genuinely compassionate; his crows are ordinary animals. Post-seal talking crow is an aspect, NOT the Warden's pet.
- Shamefield's brewery, bread, pork, cloister and farms are ordinary livelihoods. No invented buffs, deity, rituals or gameplay changes.
- Art does not authorize story, equipment stats or new maps.

**Related references:** `docs/CHAPTER_ONE.md`, `docs/design/BLACKBRIAR_VALE_REGIONAL_LORE_BIBLE.md`, `docs/design/SHAMEFIELD_VILLAGE_LORE_AND_PRODUCTION.md`, `docs/design/ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md`, `docs/ui/STYLE_GUIDE.md`.
