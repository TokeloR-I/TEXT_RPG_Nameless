# Balance: skills written in turns, adapted to live combat

Gauge — Systems & Balance Designer, 2026-10-31. Follows `BALANCE_BUFFS.md`.

Tokelo: "we still have some skills listed as turn based, find them and adapt them to what we have now."

## What was turn-based
45 skills in `skillDefinitions` described themselves in turns ("for 2 turns", "next turn", "extra turn"). Turn mode is
still the legacy mode and keeps those texts. Live fights (real-time and action) already ran every duration on a clock
(turns × `secondsPerTurn` = 3 s), but the player still read "turns", and a few mechanics had no live meaning.

## The conversion rule (why most numbers stay)
An enemy acts about every 2.5 s (`realtimeRules.enemy.actionSeconds`, 1.2 to 5 s by speed). In turn mode a 1-turn
stun, silence, blind or mark costs the enemy **one action**. At 3 s per turn it still costs one action live, so for
control, debuffs, marks and DoTs `turns × 3 s` is the right live number and doesn't change. What was wrong:

- **Self buffs** protected you "next turn", which is not a 3 s window. Fixed in `BALANCE_BUFFS.md` (8 to 15 s, stacking).
- **Haste ("ally takes an extra turn")**: live fights have no turns, so it only skipped a 1 s global cooldown. Now it is
  a timed buff: **8 s of 30% faster skill cooldowns and basic swings** (`liveSpeedup: 0.3`, `buffs.Haste`), with its own
  20 s `cooldown` (40% uptime), and Haste never speeds up its own cooldown. It works as a pre-buff and carries out of a fight like every buff.
  Turn mode still grants the extra turn.
- **Rearrange Turn Order** (Eternal Architect ultimate): live fights have no turn order, so it did nothing
  and still cost all Time Charges. It now refuses in live fights. It needs a live redesign (a mechanic decision for Thorne).

## What the player sees
Each of the 45 skills has a `liveDescription` in seconds. `describeSkill()` shows it in real-time and action modes,
and turn mode keeps `description`. A test fails if a skill's `description` mentions turns and it has no turn-free
`liveDescription`.

| Turn wording | Live wording | Seconds |
|---|---|---|
| stun / skip / lose 1 turn | stunned | 3 s (one enemy action) |
| 2 turns (Pin, Expose, Caltrops, Echo of Nothing, steal) | — | 6 s |
| 3 turns (bleed, poison, Infection, Weaken, Soul Feast, zones) | — | 9 s |
| "dmg/turn" on a DoT | dmg/s (DoTs tick every second) | |
| "dmg/turn" on a summon | dmg per hit | |
| "each turn" bookkeeping (Soul Feast drain, revert HP, bombs, Quick Slash "first in turn") | the 2 s pulse | 2 s |

## Not changed here
- **Trait texts** (24 mention turns, e.g. "Links last 1 extra turn", "First Mark each turn is free"). Trait names are
  rule keys in the engine (`hasTrait('…')`), so they need a separate pass. Live, "a turn" in a trait means the 2 s pulse.
- **DoT strength**: live DoTs tick every second for value × seconds (Black Spit: 5/s for 9 s = 45 against 15 in turn
  mode). That is a separate DoT pass for Tally to measure.
- **Overchannel**: it has no handler yet in either mode. Its live text describes the intended 3 s window.

## Measured
`node qa/scripts/rt_balance.js` (200 seeds/class): within noise of `main` (mage route win 95 → 96%). No bot casts Haste,
so Tally should measure a Time Mage at level 3+ with Haste on cooldown: expect about 12% more skill casts per minute
(30% faster for 8 s of every 20 s).
