# Legendary webs: full kits and their looks (2026-11-18)

Tokelo playtested the legendary classes through the dev cheats and found them thin: "the fallen angel only has 2 skills
on the tree, the fenrir legendary class doesn't even have visual effects", and switching Fenrir's stances "I just see
text". This pass (Thorne for the kits, Gauge for the first numbers, Quill for the looks) fixes that. Devil Union and the
Lucifero boss are handled in their own threads and are not touched here.

## What was wrong

| Web | Before | Cause |
|---|---|---|
| Fallen Seraphim | 20 nodes in data, the picture showed 2 | The web layout only fanned out evolution branches. Legendary nodes have none, so every one was put on the same two spots. |
| Fenrir's Heir | 18 nodes, same picture problem; no look on any skill or stance | Same layout bug; the action VFX were generic (class cast glyph and a plain ring), and a stance had no look at all. |
| Deathlord Eternal | 2 nodes; Death's Dominion could not be cast | Its effect `control_all_enemies` was never built. |
| Reality Breaker | heart only | Skills never designed. |

## Layout (all legendary webs)

`legendaryLayout()` in `src/engine/skill-web.js`: every node the heart leads to starts a path (a spoke at an even angle).
Every other node hangs from the node its first data link names and sits one ring further out; siblings fan beside each
other. A node that `needs` capstones from several paths sits on the rim between them. A node's own `pos` still wins.
Devil Union's picture is laid out the same way (no data change).

## Deathlord Eternal

Opens on Eternal Lich (`soulbinder.5`) + Abyssal King (`vanguard.5`) + the Throne of Bones, as before. Heart:
**Deathlord's Mantle** (+30% damage, 30% less taken). Gifts (free, owned when the heart opens, also when the heart is
learned in the web rather than by a story effect): Raise the Fallen Host, Abyssal Mantle, Soul Reap.
Ranks: Deathlord (1), Lord of the Kept (8 nodes, +1 point), Deathlord Ascendant.

| Path | Nodes (level) |
|---|---|
| The Legion | Raise the Fallen Host (gift; two Deathless Thralls, 15 s) · Legion of the Dead (14, passive: +2 max minions, `mods.minionCap`) · Banner of Bones (14, +25% damage 10 s) · Grave Tide (15, 12–16 necrotic around you, slow) · Marrow Pact (16, +10% damage) · **Death's Dominion** (18, once per fight: 24–32 necrotic to everything within 140 px, all of it kneels for 6 s; hard control through Control Resistance) |
| The Throne | Abyssal Mantle (gift; 30% less damage 9 s) · Crown of Bone (14, 10% less damage) · Sentence of Silence (14, 16–22 necrotic + silence) · Throne of Bones (15, absorb 2 hits + 40% less damage 6 s) · The Undying King (16, +40% damage under 30% HP) · **Fall of the Abyssal King** (18, once per fight: 26–34 necrotic around you + stun) |
| The Grave | Soul Reap (gift; 22–28 necrotic, heal 30% of it) · Withering Decree (15, rot + 50% more damage over time) · Hunger of the Grave (16, +20% vs bosses and Undead) · **Requiem** (18, 30–40 necrotic around you, doubled under 30% HP) |
| All three | **Deathlord Ascendant** (20, needs the three capstones: +15% damage, 10% less taken) |

## Reality Breaker

Opens on Arcane Hollow (`illusionist.5`) + a reality-breaking event that is still to be written (open item). Heart:
**Unreal** (+30% / 30% less). Gifts: Shatterpoint, Phase Shift, Prism Flash. Ranks: Cracked, Seam-Walker, Reality Unmade.

| Path | Nodes (level) |
|---|---|
| Fracture | Shatterpoint (gift; 22–28 magic, half armour ignored) · Fault Line (14, line, slow) · Fractured Mind (14, +10% damage) · Shatter Cascade (15, splits to 3 more) · **Unwrite** (18, once per fight: 40–52 true, doubled under 30% HP) |
| Paradox | Phase Shift (gift; 45% to dodge every attack 6 s) · Paradox Skin (14, 10% less damage) · Borrowed Time (14, 30% faster 8 s) · Null Moment (15, freeze everything near for 3 s) · **Rewind** (18, once per fight: HP back to ~6 s ago, DoTs and debuffs undone) |
| Mirror | Prism Flash (gift; 8–12 magic around you, blind 40%) · Mirror Self (14, two mirror selves 12 s) · Lie Made Real (15, 18–24 magic + stun) · Unseen Seams (16, +20% vs Void and bosses) · **Reality Collapse** (18, 28–36 magic on a spot + stun) |
| All three | **Reality Unmade** (20: +15% damage, 10% less taken) |

Both webs use only existing effect types, except `control_all_enemies` (built now, `src/effects.js`).
All numbers are Gauge's first pass, in line with Fallen Seraphim and Fenrir's Heir; tune in data.

## Looks (every legendary skill)

Data: `skillVfx[skill] = { style, palette }` in `src/data.js`; drawing: `ui/legend-fx.js` (48 code-drawn pixel styles,
8 palettes). The sim reports `skill_fx` events (`start` on cast, `fire` when the shape comes out, `impact` where a
projectile lands) in a fight and out of one alike; a styled projectile is drawn by its skill in flight, and the generic
ring is left out for a styled skill.

- Fallen Seraphim (radiant: white-gold light, ash, red accent): spear of light, the Watcher's eye sigil, burning feathers,
  a falling blade of light, the halo, a wing folding round you, rising grace, ashfall, the live coal coming down, wing
  beats, six wings opening, columns of light from above, the six-winged descent.
- Fenrir's Heir: Sköll in amber-gold flame (sunfire wolf head, howl rings, a burning rush, falling sparks, the sun
  swallowed by jaws), Hati in black-violet (an inward maw, a moon howl, closing jaws, draining tendrils, the moon
  swallowed and everything pulled in), Fenrir (two wolves leaping out, Gleipnir's links breaking, a sun-and-moon eclipse).
- Deathlord Eternal (grave-green and bone; the Throne in abyss violet): graves cracking, a bone banner, hands from the
  ground, the abyssal cloak, a skull word, bone pillars and a crown, the king's fall, a grave-light scythe, rot, souls
  rising in the requiem, the kneeling sigil.
- Reality Breaker (prism: split colour, cracks, frozen grey): shards, a tearing fault, erasure, colour ghosts, a stopped
  clock, a spinning clock, a backwards spiral, prism rays, a mirror that cracks, a lie's eye, the world folding in.
- New summoned bodies: spirit wolves (sun or moon), Deathless Thralls, mirror selves.

### Fenrir's stances on you

Each stance has a `look` in `stances.list.<id>` (palette, motes, companion). While a stance is held: a turning ring under
you that brightens with the bond, embers rising (Sköll), shadow sinking (Hati) or chain links turning (Fenrir), and the
wolf itself running at your side, a ghost at first and more solid as the bond grows. Changing stance (T, the HUD cell,
touch or a menu) sets off a burst in the new wolf's colour with its head over you.

## Out of a fight

Tokelo (2026-11-18): every skill should be usable out of combat. A legendary skill pressed with no fight on now always
plays its look. Self heals and cleanses now work for real out of a fight too (`cleanse` joins the calm effects, so Mercy
of the Fallen and Gleipnir's Bane heal and cleanse). Shadow summons (Call of the Pack, Raise the Fallen Host, Mirror Self)
still only rise in a fight, but show their cast.

## Open

- Reality Breaker's unlock event is not written yet (Ashby/Cairn). The cheat opens it today.
- The Hollow King is a transformation outside the webs, unchanged; its Oblivion's Call (`erase_enemies`) is still unbuilt.
