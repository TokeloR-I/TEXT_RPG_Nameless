# Player style sheet (v2, chibi)

**Owner:** Saffron (Art Director) · **Pipeline:** Quill (Technical Artist) · **Engine/VFX:** Wren
**Decision:** Tokelo, 2026-10-27: player sprites come first, "up to standard with fluid animations and attack VFX",
after a reference picture Tokelo supplied of what a good sprite looks like.

The reference picture is used **as a description only**. Its source is unknown, so it is not committed, traced,
sampled for colours or given to any generator. Everything below is written in words and numbers, and the art is
drawn by code in `assets/sprites/enso-player.js` (no image input of any kind, see `ORIGINAL_ART_PLAN.md` §0).

## What makes the reference read well

1. **Chibi proportions.** The head is about 45% of the figure's height and as wide as the shoulders. The body is
   compact and the legs short.
2. **Big eyes.** Each eye is 2 px wide and 3 px tall: a dark upper lid, a coloured iris with a white shine on the
   side the light comes from, and a deeper iris below. The eyes sit low on the face with a 4 px gap between them.
3. **One bold dark outline** round the whole figure, close to black, so the sprite reads on any floor.
4. **Soft faces.** Skin uses highlight, base and one shade. There is no deep shadow on the face, so it never looks
   dirty or bearded.
5. **Hair in locks, not a helmet.** Thin darker strands fan out from the crown and a highlight band catches the
   top-left light.
6. **Clear separation between overlapping parts** (arm over torso, head over collar) with a darker edge, never a
   second outline colour.

## The ENSO rules (numbers)

| | Value |
|---|---|
| Frame | 64×64, feet at (32, 43), unchanged so hitboxes, camera and saves need no change |
| Figure height | about 34 px from crown to sole (2 tiles plus a little on the 16 px grid) |
| Head | drawn on the head centre and scaled by `HEAD_S` = 1.16 (all hair styles and hats scale with it) |
| Light | from the top left (`LIGHT`), ramps hue-shift warm in light and cool violet in shadow |
| Skin ramp | `ramp(hex, soft)`: half the hue shift and less saturation, so skin shadows stay skin-coloured |
| Outline | each material's ramp ends in a near-black of its own hue (lightness at most 11%) |
| Eyes | roles `e` lid, `r` shine, `u` iris, `s` deep iris; iris colour `#3f86c4` (a palette `eye` override is allowed) |
| Palette | every colour is a palette role, so one sheet serves every colour choice in the creator |

## Animation targets (next step, after Tokelo approves the master)

| Animation | Frames now | Target | Notes |
|---|---|---|---|
| Idle | 1 (static) | 4, breathing | shoulders and head bob 1 px, hair follows a frame late |
| Run | 6 | 8 | contact, down, pass, up; arms counter-swing; 1 px body bob |
| Attack (swing) | 4 | 6 | anticipation, wind-up, smear, impact, follow-through, recover |
| Hurt | 1 | 2 | squash back, eyes shut, recover |
| Death | 3 | 5 | stagger, kneel, fall, settle |

## Attack VFX targets (Wren)

Slash arc that follows the weapon (bright core, cool falloff, dithered tail), impact sparks at the hit point, and a
1 to 2 frame white hit flash on the target. All pixel-crisp and drawn by `ui/action-fx.js`.

## Previews

`docs/captures/player-v2/`: before and after, key poses and the sprite in the game.
