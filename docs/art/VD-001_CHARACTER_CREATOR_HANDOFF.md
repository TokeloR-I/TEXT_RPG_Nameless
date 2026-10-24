# VD-001 — Character Creator Visual Production Handoff
**Author:** Morrigan · **Artist/Animator:** Vesper · **Frontend:** Sable/Pixie · **Renderer:** Wren  
**Status:** DEVELOPMENT HANDOFF / visual direction proposed, not final art approval  
**Priority:** P0 · **2026-10-24**

## Objective
Deliver one believable protagonist visual language and testable appearance options for the existing character creation flow. Do **not** redesign mechanics. Existing `ui/world-ui.js` flow is `name → class → look → hairStyle → hairColor → outfit`; a combined appearance-screen layout is a **UI proposal**, not implemented behavior.

## Visual target
A weathered traveler with lived-in clothing: asymmetric worn burgundy outer tunic, charcoal underlayer, patched leather seams and boots, no premature monarch/regalia clues. Character silhouette must remain convincing across skin tones and every class; proposed default **Wild Raven + Worn Traveler**. Skin and hair choices should never imply class or stat changes.

### Existing option keys — must preserve ordering/index
**12 hairstyles** (current `HAIR_STYLES`):
| Index | Existing label | Proposed distinguishing silhouette — artist interpretation |
|---:|---|---|
| 0 | Wild Raven | layered untamed side/back volume, irregular ends |
| 1 | Round Crop | smooth tight domed outline |
| 2 | Spiky | angular asymmetric spikes |
| 3 | Straight Fringe | blunt eyebrow-length front line |
| 4 | Long Side Strands | narrow long cheek-framing sections |
| 5 | Swept | lifted sideward crest |
| 6 | Soft Layers | rounded staggered shoulder-length masses |
| 7 | Clean Crop | close clipped head contour |
| 8 | Side Part | distinct asymmetrical neat crown |
| 9 | Medium Layers | chin-to-neck multi-step shape |
| 10 | Braids | segmented/plaited cords readable from back |
| 11 | High Ponytail | tied crown with visible rear trailing mass |

**Hair colors:** 0 Raven, 1 Chestnut, 2 Ash, 3 Copper.  
**Outfits:** 0 Worn Traveler, 1 Tattered, 2 Armored, 3 Ceremonial.  
**Skin:** existing `appearance` range 0–3; do not rename or conflate with hair/outfit.  
Exact colors and final silhouettes require Director review; avoid making hair styles differ *only* by palette.

## Original art deliverables — Vesper
1. Base character exploratory sheet: 3 distinct silhouettes at a comparable height, front/side/back and clothing-material notes; propose one selection for Director approval.
2. One approved full 4-way turnaround (down/up/left/right) with neutral stance and a 1× sprite readability comparison.
3. Hairstyle contact sheet: all 12 styles with index and label, 4 facings each. Clearly mark which require hairBack vs hairFront.
4. Outfit sheet: all 4 families with separable body, clothing and hair layers; clothing and hair never baked into the skin layer.
5. Test sprites or asset sheets for idle/walk; attack/cast/hit/death can be staged after creator/world parity, aligned with Wren's manifest.
6. Manifest of filenames, frame counts, directions, palette roles and what is concept vs production-ready.

## Frontend acceptance — Sable/Pixie
- Visible live preview; selection updates immediately, keyboard and pointer accessible; rotation down/up/left/right.
- 12 **visibly different** hairstyles, 4 color options, 4 outfit options and available skin options.
- Back/Continue works inside existing identity flow; no loss of earlier choices.
- Preview and in-world avatar resolve to identical layers. Cosmetics survive save/reload according to current code.
- Mobile/small viewports remain readable; do not invent a fake game persistence API.
- Until Vesper's authored sheets arrive, explicitly label interim procedural art as placeholders; DO NOT pass it off as approved original art.

## Technical acceptance — Wren
- Maintain `docs/SPRITES.md` 24×32 frame, (12,30) foot anchor, 4 facings and layer order.
- Original layers registered in sprite manifest / sheet loader. Check transparency, compositing, nearest-neighbor and no fallback collapsing different silhouettes.
- Reference the existing tests (`tests/35-sprites.test.js`) and add capture evidence for all 12 hairstyles at gameplay resolution.
- Final pixel sprites must be assessed at native 1× and actual stage scale, not only zoomed concept art.

## Handoff and signoff
Morrigan: brief + visual QA; Vesper: asset production; Sable/Pixie: UX; Wren: integration; Vaelis: lore checks; Creative Director: final visual direction approval. No agent may claim a suggested look is Director-approved before explicit signoff.

**Blocker:** Production assets and final visual approval still outstanding. This document is a buildable scope, not a claim of completed artwork.
