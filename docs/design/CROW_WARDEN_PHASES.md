# Crow Warden: phase 2 and phase 3 moves

Asked for by Tokelo on 2026-11-02. The aim is to balance the overpowered Warrior and Necromancer by making the boss
stronger instead of nerfing the classes. The Necromancer poison and bleed stack cap is **not** part of this work
(Tokelo: "not yet"). Every number is a first pass for Gauge to tune in `actionRules.bosses.crow_touched_warden`
(`src/data.js`).

The Warden keeps his whole base pattern in every phase. His new moves sit on top of it: with `alternateSpecials`,
a special move (crows, Reaper's Dance) is always followed by a base blow when one fits, and the specials take turns
(the one that has waited longest goes first).

| Phase | From | Adds |
|---|---|---|
| 1 | 100% | Halberd Sweep, Reaping Thrust, Chain Lock, Summon Crows (unchanged) |
| 2 | 50% | Guardian's Resolve (once), Reaper's Dance, Marked Prey. Murder of Crows and the 2-hit sweep stay as before. |
| 3 | 25% (was the 20% desperation stage) | Crow storms (5 arena patterns). It still drops Chain Lock and recovers 20% faster. |

A later phase now keeps what an earlier one set unless it overrides it, so phase 3 keeps the 2-hit sweep and the
5 crow shadows from phase 2.

## Guardian's Resolve (phase 2, once)
- When phase 2 opens, the Warden braces for **6 s**. He takes **20% less damage from every source**: hits, skills,
  summons, damage over time and links. The engine applies it in `damage()` (`actionBossStance`), and the fraction
  carries over, so small DoT ticks lose 20% too.
- During the stance he moves at **60%** speed and his wind-ups are **1.4×** longer (deliberate halberd attacks).
- When it ends, there is a **2.5 s** window. The first hit in that window, from the player or a summon, staggers him
  for **1.5 s**.
- It happens only once per fight. A reset (leash, or the player falling) brings it back.
- Visuals: a pale shield ring while it lasts, then a flickering gold ring while he can be staggered. The HUD lists
  it as a status.

## Reaper's Dance (phase 2+)
This grows his existing 2-hit combo into 3 hits. Cooldown 8 s, used from 0 to 44 px.
1. Wide sweep: a 150° arc, reach 36, wind-up 650 ms.
2. Reverse sweep, back the other way: the same arc, wind-up 500 ms.
3. Heavy thrust aimed at the player: a line 64 px long, 14 px wide, with a 20 px lunge and ×1.3 damage. It aims
   until 250 ms before it lands.
4. A **1.8 s recovery** afterwards. This is the counterattack window.

## Murder of Crows: Marked Prey (phase 2+)
- A black crow appears over the marked body. With summons out, it alternates between a summon (the one on the
  Warden) and the player. Without summons, it always marks the player.
- The mark follows its prey for 1.05 s and then **locks**. For the last 550 ms it stays where it was. Three crows then
  dive at the locked spot (radius 22, ×4 damage). They don't follow a target that moves, so the player can bait
  them away from the Warden or step out of the way.
- He conducts the dive himself, so for those 1.6 s he doesn't swing. Cooldown 11 s.

## Crow storms (phase 3)
- The Warden calls one arena-wide pattern. The crows rush the marked areas, and the player has to stand on safe
  ground. Wind-up 1.8 s, then ×5 damage on whoever is still in a zone.
- There are **5 patterns, always in this order**, and the cycle loops:
  1. **Cross**: a horizontal band and a vertical band through the middle. The four quarters are safe.
  2. **Ring**: a ring of crow spots around the Warden. It is safe close to him or well away from him.
  3. **Rows**: three horizontal bands. The two stripes between them are safe.
  4. **Columns**: four vertical bands. The gaps between them are safe.
  5. **Corners**: four corner spots and the centre. The edges between them are safe.
- **It can't be spammed.** A storm has a 12 s cooldown. For 4 s after a storm lands, none of his other crow
  specials or Reaper's Dance can start. After it lands he also recovers for 2.2 s and then waits his usual 1.2 s
  gap, so the player gets a window to hit back.
- Zones are fractions of the boss's `arena` rectangle, which is now the real sanctuary floor in sim pixels.

## Harder phase 3 (Tokelo, 2026-11-02, second pass)
Tokelo found the crow storms too easy.
- **Storm chains.** A storm now comes as a chain of **2 to 3 patterns back to back** (`crow_storm.chain`). Each one is
  the next pattern in the cycle. The first has the full 1.8 s wind-up. The ones after it have a 1.3 s wind-up, follow
  a 350 ms gap, and carry a **crow mark on the player**. The mark follows the player and locks 450 ms before landing,
  then dives with the storm, so the safe spot the player picks also has to be off the mark. Only after the last storm
  does the 2.2 s recovery come, followed by a 3.5 s quiet window with no crow specials. The storm cooldown stays 12 s.
- **Crows below 25%** (`phases[2].attackOverrides`):
  - Murder of Crows: cooldown 15 s to 7 s, wind-up 1.3 s to 1.0 s.
  - Marked Prey: cooldown 11 s to 5.5 s, wind-up 1.6 s to 1.2 s.
  - Both come right after the storms in his priority list, so they mix in between storm chains.

## Crow's Illusion (30%, once)
- At 30% HP he bursts into crows and steps out as **one of 5 identical Wardens** spread on a ring around the middle of
  the arena. Which spot is real is random.
- The 4 false Wardens have **2 HP**. Their stats and skills are the real one's, so they **hit as hard as he does**.
  They use only his halberd blows (no crows) and wait 2.4 s between swings. They give no XP or loot.
- The false ones look the same in every way: same sprite, same name in the log, and the same boss bar showing his
  HP. One hit pops a false one into crows.
- They scatter after 20 s, or when the real Warden falls.
