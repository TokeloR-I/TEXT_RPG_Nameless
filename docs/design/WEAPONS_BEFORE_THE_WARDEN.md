# Weapons before the Warden

**Owners:** Thorne (mechanics), Gauge (numbers, first pass) · **Requested by:** Tokelo, 2026-11-09 · **Lore:** checked
against [ENSO_LORE_BIBLE.md](ENSO_LORE_BIBLE.md)

> "they go from the basic weapon to defeating the warden with litteraly broken or starter weapons, the only weapon I
> know off is the holy sword and that also we have yet to see a player use it cause of the level lock" /
> "for mage and necromancer we dont even have wand or staff they start with either a spear or mace" (Tokelo)

## What was wrong

- The only authored weapons before the Warden were the four starters (+1 damage) and Bragg's Roadworn Blade (+1 STR).
  Random drops roll "Uncommon Rusty Sword" style copies of the starters at +1 to +2.
- The holy weapons came only with every Fallen Seraphim skill learned (level 18 and the trial), far past Chapter One.
- A staff's magic damage never reached the mage's or necromancer's free attack (a physical, INT-scaled bolt), so a
  caster's weapon did almost nothing.
- Mage and Necromancer were *drawn* with a spear and a mace (the suggested look in character creation); the code-drawn
  player had no staff or wand.

## The ladder (one weapon per class per step)

| Step | Where | Level | Warrior | Rogue | Mage | Necromancer |
|---|---|---|---|---|---|---|
| Starter | equipped at the start | 1 | Rusty Sword: +1 phys | Short Sword: +1 phys | Wooden Staff: +1 magic | Cracked Bone Staff: +1 magic |
| Bragg's forge | Bragg, Shamefield smith, 24 Gold; he lists only your class's weapon | 2 | **Tollgate Arming Sword**: +2 phys, +1 STR, +1 DEF | **Poacher's Hook-Knife**: +1 phys, +1 AGI, +3% crit | **Iron-Shod Ashwood Staff**: +2 magic, +1 INT, +5 Max HP | **Sexton's Bone Rod** (wand): +1 magic, +1 INT, +8 Max HP |
| Shamefield's Thanks | Bragg, once Get to Know the Locals (L01) is done, free, bound | 3 | **Sunbreak**: +3 phys, +2 STR, +1 DEF | **Millrace Tanto**: +2 phys, +1 AGI, +5% crit | **Bell-Bronze Staff**: +3 magic, +2 INT, +10 Max HP | **Nameless Stone**: +2 magic, +2 INT, +15 Max HP |
| Holy weapon (any class) | Caelith, when the statue wakes; dormant | 1 | see [FALLEN_SERAPHIM.md](FALLEN_SERAPHIM.md) | | | |

L01 finishes just before the Captain opens the orchard road, so the Thanks weapon arrives for the last stretch
(orchard, Featherwatch, the Warden). Pre-Warden Gold is about 170, so the forge weapon is affordable with food left over.

**Lore.** Each name is Chapter One canon: the tollgate of the old crown (bars that "spent twenty years as a door"),
the Vale hunters, Kloster ash, the Kloster burial ground, the festival mark "a sun breaking a crown" (worn, without
knowing it, by the old lord himself), the mill falls of SF4, the bell that rang for an hour (SF5), and the memorial
stone with no names, under which "something hums, like a crowd behind a door" (the Kept, [mid] hint only).

## Rules added

- **Class stock:** a shop entry with `classes: [...]` is listed and sold only to those classes
  (`stockForPlayer`, `src/engine/exploration.js`).
- **Class conditions:** story conditions take `className` (one id or a list), for class-specific gifts.
- **A caster's weapon powers its bolts:** a main-hand weapon with `damageType: 'magic'` adds its `magicDamage` to
  physical (weapon) attacks too (`equipmentDamageBonus`). Spells were already counting it.
- **Dormant weapons:** an item with `kindle: { flag, dormant }` uses `dormant` stats until the story flag is set;
  setting the flag re-applies worn gear, so stats never drift.
- **Shop detail:** equipment in a shop shows its stats, not only its flavour line.
- **Art:** the code-drawn player has a **staff** (upright at rest, the stone above the head) and a **wand**, in every
  metal, appended after the old twenty looks so saved looks keep their index. The sprite draws what is actually in
  the main hand: a staff or wand when one is equipped, so older mage and necromancer saves show their staff with no
  migration. Creation now suggests Frost Staff (mage) and Obsidian Staff (necromancer). The casters' free attack key
  shows a staff-bolt icon.

## Measured (Crow Warden, level 4, 12 seeds, the Warden benchmark bot, react 0.6)

Time to kill, wins only; win rate in brackets.

| | Starter | Bragg's forge | Shamefield's Thanks |
|---|---|---|---|
| Warrior (vanguard / berserker) | 67 / 66 s (100%) | 61 / 60 s (100%) | 53 / 53 s (100%) |
| Rogue (duelist / assassin / saboteur) | 42 / 52 / 44 s (92-100%) | 37 / 45 / 38 s (100%) | 37 / 45 / 38 s (100%) |
| Mage (illusionist / elementalist) | 59 / 59 s (92% / 67%) | 53 / 51 s (92% / 83%) | 47 / 47 s (92% / 83%) |
| Necromancer (bone warden / plaguecaller) | 79 / 43 s (92-100%) | 59 / 41 s (92-100%) | 51 / 35 s (100%) |

The starter column already includes the staff-bolt rule (it cut about 8 s off the mage's kill). The full ladder takes
about 20 to 35% off the fight, which is the point of an upgrade; with it most kills land under BALANCE_LEVEL_GROWTH's
60-90 s band. **Open for Gauge:** keep the band as "with starter gear" or raise the Warden's `hpMult` slightly once
players have the Thanks weapon. Rogue numbers were trimmed (+1/+2 phys) because the rogue was already fastest.
