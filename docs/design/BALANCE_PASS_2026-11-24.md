# Balance pass, chapters 1 and 2 (2026-11-24)

Owner: Gauge (numbers). Requested by Tokelo: "Balance the numbers".

Standing rules kept: no class is nerfed; food and healing keep no cap and no cooldown; side-quest XP is unchanged;
fight buffs stay 6-15 s and stacking; necromancer stack caps stay at 2; the Crow Warden stays the "easy" boss
(50-65% wins per branch); every boss after him should beat most first attempts (25-40%); bosses are hard through
their blows and moves, not extra HP (no `hpMult` was raised); Dominion bosses still scale to the player's level.

## What the sims found

Measured with `qa/scripts/warden_benchmark.js --level 4 --heals 4` (24-40 seeds) and
`qa/scripts/boss_benchmark.js --heals 6` (16 seeds for the Echo, Bjarki and the Man in the Peat, 12 for the
Dominions), the "decent first attempt" bot with no gear and no food.

1. **Post-Warden bosses split by class, not by skill.** Rogues won 80-100% and the Plaguecaller 65-92% on the
   Binding Echo, Bjarki, the Man in the Peat, Lucifero, Beelzebub and Plumede, while warriors won 0-40% and mages 0-10%.
   - Warriors were too slow. STR grew 0.5 a level and STR pays +1 damage per 4 points, so a level 6 warrior hit only
     about 1 harder than at level 1, and boss DEF (5-11) ate most of each Slash. Fights ran 105-160 s against the
     rogue's 50-60 s, so the warrior stood in the rage twice as long.
   - Mages were too fragile: 94 HP at level 5 against boss blows of 25-45 in rage.
2. **Slotos was a wall for everyone** (0-33%, most branches 0%): 760 HP behind DEF 11 at level 7.
3. **The Warden** averaged 58% but elementalist (40%) and vanguard (48%) sat under the band.
4. **XP curve: no change needed.** Chapter One is pinned at 746 XP (level 4) before the Warden and 946 (level 5) after
   him. Chapter Two's main line (605 quest XP plus about 1,600 from its fights) reaches Bjarki and the Peat at
   level 6-7 and ends around level 8; with every side quest and fight, about level 9. The Dominion arenas
   (about 4,000 XP, optional) and the Kloster trial lead toward Aurevain's level 10 gate. The x1.5 curve fits that.
5. **Gold and gear: no change needed.** Chapter One pays at least 210 Gold before the Warden (test LOOT-01) against
   24 for a forge weapon and 58 for a set. Chapter Two pays about 215 Gold on the main line and 280 more from side
   quests, plus about 290 from Wolf-Banner fights; Bjorn's full kit (48 weapon, 124 set, about 280 to temper to +5)
   costs about 450, so it is the chapter's main sink and reachable by its end. Heals stay cheap (8-12 Gold).
6. **Food: no change.** Caps (75% damage, 50% less damage taken) are reachable only with several stacked dishes and
   beers; that preparation is the intended reward (Tokelo, kitchen design), and the boss targets assume no food.

## Changes (`src/data.js`)

| What | Before | After | Why |
|---|---|---|---|
| Warrior base STR | 10 | 14 | +1 damage on every hit from level 1, so DEF doesn't swallow the Slash |
| Warrior STR growth | 0.5 / level | 1.5 / level | warriors now gain damage as they level, like the other classes |
| Warrior HP growth | 12 / level | 14 / level | longer fights need the tank's buffer |
| Mage base HP | 70 | 80 | survives one more boss blow |
| Mage HP growth | 6 / level | 10 / level | 130 HP at level 6 instead of 100 |
| Mage DEF growth | 0.5 / level | 1 / level | |
| Crow Warden rage blows | x1.7 | x1.85 | keeps him in the band after the warrior and mage buffs |
| Binding Echo blows | x2.0 | x2.45 | the buffs above made the field too strong |
| Bjarki blows | x1.8 | x2.25 | same |
| Man in the Peat blows | x3.0 | x3.6 | same |
| Lucifero blows | x2.3 | x2.45 | same |
| Beelzebub blows | x2.0 | x2.15 | same |
| Plumede blows | x2.0 | x2.15 | same |
| Slotos blows | x2.0 | x1.8 | he was a wall for every class |
| Slotos DEF | 11 | 8 | same; still the toughest Dominion |

No rogue or necromancer number changed.

## Before and after (win %)

### Crow Warden, level 4, 4 heals (target 50-65)

| branch | before (40 seeds) | after (24 seeds) |
|---|---|---|
| warrior / vanguard | 48 | 54 |
| warrior / berserker | 53 | 58 |
| rogue / duelist | 68 | 63 |
| rogue / assassin | 50 | 54 |
| rogue / saboteur | 68 | 50 |
| mage / illusionist | 53 | 50 |
| mage / elementalist | 40 | 50 |
| necromancer / bone warden | 65 | 54 |
| necromancer / plaguecaller | 78 | 71 |

Every branch is now in the band except the Plaguecaller, whose fast Warden kill Tokelo accepted (2026-11-02).

### Bosses after the Warden, 6 heals (target 25-40)

before -> after

| branch | Echo (L5) | Bjarki (L6) | Peat (L6) | Lucifero (L7) | Beelzebub (L7) | Slotos (L7) | Plumede (L7) |
|---|---|---|---|---|---|---|---|
| warrior / vanguard | 30 -> 63 | 30 -> 38 | 25 -> 25 | 0 -> 25 | 8 -> 33 | 0 -> 17 | 17 -> 33 |
| warrior / berserker | 30 -> 25 | 40 -> 31 | 17 -> 19 | 8 -> 25 | 0 -> 17 | 0 -> 17 | 8 -> 42 |
| rogue / duelist | 80 -> 50 | 100 -> 94 | 100 -> 88 | 100 -> 92 | 92 -> 100 | 33 -> 67 | 83 -> 83 |
| rogue / assassin | 85 -> 44 | 80 -> 50 | 100 -> 69 | 75 -> 58 | 75 -> 75 | 17 -> 42 | 92 -> 67 |
| rogue / saboteur | 85 -> 56 | 85 -> 69 | 100 -> 81 | 58 -> 50 | 92 -> 92 | 8 -> 58 | 83 -> 75 |
| mage / illusionist | 0 -> 25 | 5 -> 13 | 8 -> 31 | 8 -> 25 | 0 -> 8 | 0 -> 0 | 0 -> 25 |
| mage / elementalist | 5 -> 19 | 10 -> 6 | 0 -> 31 | 0 -> 0 | 0 -> 8 | 0 -> 0 | 0 -> 33 |
| necromancer / bone warden | 80 -> 44 | 25 -> 19 | 75 -> 56 | 25 -> 25 | 17 -> 8 | 0 -> 33 | 67 -> 58 |
| necromancer / plaguecaller | 80 -> 81 | 65 -> 31 | 92 -> 81 | 75 -> 92 | 67 -> 58 | 17 -> 75 | 92 -> 83 |
| **mean** | 55 -> 45 | 49 -> 39 | 55 -> 53 | 39 -> 44 | 39 -> 44 | 8 -> 45 | 49 -> 56 |

12-16 seeds per cell, so a single cell moves about +-15 points between runs; read the rows, not one number.

## Still open

- **The class gap is smaller but still there.** Warriors and mages now win about 15-40% (were 0-40%), which is the
  Dark Souls band. Rogues (duelist above all) and the Plaguecaller still win 50-100%: they kill in 50-60 s, half the
  warrior's time. Closing that without touching them would mean making every boss brutal for the other classes.
  Tokelo's call (asked in the thread): keep the rogue as the class that has it easier, or trim rogue boss damage.
- **Mages on Slotos and Beelzebub** still win 0-8%. Slotos' charge and Beelzebub's rift cuts out-range the mage's
  teleport dodge; that is a move-set question (Thorne), not a number.
- **Bug for the bug hunt:** in Bjarki's barrow a mage fighting from range makes Bjarki give up the fight (he walks
  back, combat ends at full HP) in about 4 of 6 seeds. It depresses the mage's Bjarki numbers above.

Re-measure: `node qa/scripts/warden_benchmark.js --level 4 --heals 4 --seeds 40` and
`node qa/scripts/boss_benchmark.js --boss all --seeds 16`.
