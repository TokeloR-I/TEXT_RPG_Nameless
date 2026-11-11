# Player style sheet (v2 chibi; v3 rig at the end)

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

## Animations (v2)

In-betweens (`TWEENS` in `enso-player.js`) blend two keyed skeletons, so new frames need no hand-keying.
Combat timings are unchanged (swing 350 ms, heavy 720 ms, hurt 250 ms).

| Animation | Before | Now | Notes |
|---|---|---|---|
| Idle | 1 (static) | 4, breathing | chest and shoulders rise 1 px, feet planted |
| Walk/run | 6 | 8 | arms counter-swing, 1 px body bob, 95 ms a frame |
| Attack (swing) | 4 | 6 | gather (`slash0`), wind-up, smear, impact, follow-through (`slash5`) |
| Hurt | 1 | 2 | flinch with eyes shut, recover (`hit2`), white hit flash |
| Death | 3 | 5 | flinch, stagger (`down1`), kneel, fall with a 1 px bounce (`down3`), rest (`down4`) |

## Attack VFX (Wren, v2)

The swing smear (bright core, cool falloff, dithered tail) now throws blade glints and a tip flare. A hit draws a
bright slash cut across the target over the sparks, a crit adds a shockwave ring, enemies flash white when hurt and
the player flashes white for 140 ms (off when motion is reduced). All pixel-crisp, in `ui/action-fx.js`;
`node tools/preview-action-fx.js out.png` renders the frames.

## Previews

`docs/captures/player-v2/`: before and after, key poses, animation GIFs (`anim-*.gif`), VFX frames and in-game shots.

## v3: the rig (2026-11-11)

**Decision:** Tokelo, 2026-11-11: the main character first, at the quality bar of a modern pixel-art action RPG
(named benchmark: Dimraeth by Mudtek, as a quality bar only; nothing of it is copied, traced or used as input).
Still drawn by code, so every creator option keeps working. v3 replaces the v2 numbers above where they differ.

| | v2 | v3 |
|---|---|---|
| Frame | 64×64, feet at (32, 43) | 96×96, feet at (48, 68); the world still places the feet, so hitboxes and saves are untouched |
| Figure | about 34 px, chibi | about 40 px: longer legs, torso and arms, the same head |
| Poses | keyed separately for front, back and side; diagonals blended in 2D | written once in the character's own space (forward, right, up) and projected for each facing |
| Limbs | hand-placed elbows and knees | solved from where the hands and feet are (two-bone IK) |
| Torso | fixed width | as wide as the shoulders really are in the pose, so a wound-up body shows its turn |
| Hair and cloth | painted on, never move | follow the head and chest through a damped spring (`swayTrack`): tails, braids, long hair, capes, scarf ends and long hems trail, bounce and settle |
| Swing trail | a fixed arc | the area the blade really swept since the last frame |
| Weapon | always full length | foreshortened when it points at or away from the camera |

### Motions

| Motion | Frames | Length | What happens |
|---|---|---|---|
| Idle | 8 | 2.4 s loop | breathing, weight on one leg, a slow breeze in hair and cloth |
| Run (`walk`) | 10 | 640 ms loop | planted and swinging foot, hips and shoulders counter-turn, the body drops on each landing, cape streams behind |
| Stop | 3 | 180 ms | a skid back onto the heels when you let go, then idle |
| Guard stance (`ready`) | 6 | loop | knees bent, left foot forward, blade up |
| Swing | 8 | 350 ms | coil onto the back foot, cut across the front with a step in, overshoot, settle |
| Heavy | 10 | 720 ms | both hands over the head on the toes, then the whole body drops into the blow |
| Thrust | 7 | 350 ms | hand drawn to the hip, long lunge behind the point |
| Cast | 8 | 540 ms | gather at the chest, raise, throw forward |
| Hurt | 4 | 250 ms | thrown back off the front foot, eyes shut, recover |
| Dodge | 4 | 250 ms | a low sprinting dive |
| Death | 6 | | recoil, knees, fall, a bounce, rest |

In the world an attack's animation is spread over the attack's real length, and which one plays follows the
attack's shape: the weapon's arc is the swing, a skill's arc the heavy blow, a line the thrust, a dash the dive,
and anything thrown, placed or called up the cast (`ui/world-ui.js` `syncFromSim`).

### Honest limits

- It is still code-drawn at about 40 px. The motion is now built the way an animator builds it (anticipation,
  follow-through, overlapping hair and cloth), but the surface detail (folds, faces, materials) is simpler than
  hand-pixelled art at the benchmark's level.
- Hair and cloth are a spring baked into each frame, not a live simulation: they do not react to wind in the scene
  or to a turn in the middle of a run.
- Turning snaps between the eight facings; there is no turn animation yet.
- Villagers use the same figure (taller now); enemies have not been touched.

Previews: `docs/captures/player-v3/` (`before-after-in-game.gif` is the same key presses on `main` and on v3).
`node tools/preview-enso-player.js out.png 4 '{}' 0 slash3,slash5,slash6 down,right,up` renders any frames.
