# Balance: level-up stat growth

Owner: Gauge — Systems & Balance Designer. Last change: 2026-11-01.

## Problem
Every class gained the same thing on every level-up: +10 HP, +1 STR, INT, AGI, DEF and SPD, +1% crit and +2 max resource.
A mage got as much STR as a warrior, and a rogue got as much INT as a necromancer. Growth did not reflect the class.

## Rule
Each class in `basePlayerClasses` has a `levelGrowth` table, applied once per level (`applyLevelGrowth`,
`src/engine/progression.js`). Classes without one use `gameRules.defaultLevelGrowth`, which is the old flat increase.

- A rate under 1 lands as whole points: the gain at level L is `floor(L × rate) − floor((L − 1) × rate)`, so `0.5`
  means +1 every other level (levels 2, 4, 6 and so on). It is stateless, so saves need nothing extra.
- `critChance` grows continuously and stops at `gameRules.critChanceCap` (0.5).
- AGI growth also raises SPD.
- HP and resource refill on level-up, as before.

## Numbers (per level)

| class | HP | STR | INT | AGI | DEF | crit | max resource | identity |
|---|---|---|---|---|---|---|---|---|
| warrior | 12 | 0.5 | – | 0.5 | 1 | – | 1 Momentum | tank: grows HP and armour, damage comes from kit |
| rogue | 8 | 0.5 | – | 2 | 1 | +2% | 2 Energy | precision: AGI (its damage stat) and crit |
| mage | 6 | – | 2 | 0.5 | 0.5 | +1% | 3 Mana | glass cannon: INT and a deep mana pool |
| necromancer | 8 | – | 2 | 0.5 | 1 | – | 2 Soul Energy | sturdy caster: INT, some armour |
| old (all) | 10 | 1 | 1 | 1 | 1 | +1% | 2 | – |

Over 10 levels, the warrior gains +120 HP and +10 DEF but only +5 STR. The rogue gains +20 AGI and +20% crit.
The mage gains +20 INT and +30 Mana. The necromancer gains +20 INT, +10 DEF and +80 HP.

## Companion change: caster staff bolts scale with INT
`gameRules.physicalStat` now maps `mage` and `necromancer` to `intelligence`. Their Basic Attack is a staff bolt
whose damage type is "physical", so it used to scale with STR. The Crow Warden has 8 DEF and a necromancer bolt deals
about 2 damage after DEF, so one point of the scaling stat roughly halves or doubles fight length. Without this
change, INT growth would do nothing for a caster's main attack.

## Target and measurement
The target is the Crow Warden at level 3: 60 to 90 s to kill and 70 to 90% wins per class (QA #16, PR #205).
Measured with `node qa/scripts/warden_prebuff.js --seeds 40 --react 0.6`, with cold pulls and no pre-buff.

| class / branch | before: win, time to kill | after: win, time to kill |
|---|---|---|
| warrior / Vanguard | 100%, 42 s | 100%, 51 s |
| rogue / Duelist | 75%, 57 s | 78%, 53 s |
| necromancer / Bone Warden | 95%, 105 s | 95%, 78 s |
| mage / Illusionist | 85%, 88 s | 93%, 66 s |

The necromancer and mage now land in the band. The warrior is closer, but growth alone cannot slow it further
without making STR growth meaningless. The remaining gap is Vanguard's kit. The rogue's win rate is now in the band,
but it still kills a little fast while losing about half its HP. Both are follow-ups for the per-branch pass.

The legacy turn-based bot (`npm run balance`, 60 runs) barely moves: warrior 95% to 100%, mage 3% to 5%, rogue 28%
to 27%, necromancer 17% to 12%.
