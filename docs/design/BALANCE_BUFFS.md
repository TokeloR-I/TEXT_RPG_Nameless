# Balance: buff durations and stacking (timed fights)

Gauge — Systems & Balance Designer, 2026-10-31. Numbers live in `realtimeRules.statuses.buffs` (`src/data.js`).

## Problem
Every buff is written in turns, and timed fights turn a turn into `secondsPerTurn` = 3 s. Nearly every Chapter One
buff is 1 turn, so Guard, Evasion, Bone Wall, Riposte and Mirror Image lasted 3 s. That is shorter than one enemy
attack cycle plus a reaction (a wolf lunge is 2.2 s cooldown + 0.48 s windup), so a buff often expired before the blow
it was cast for. A pre-buff (PR #200) was gone before you reached the enemy. None of them stacked: a recast only
reset the 3 s.

## Target (player terms)
- A defensive buff covers **2 to 4 enemy attacks** (enemy cycle about 2.5 s), so **8 to 15 s**.
- A pre-buff cast on approach is still up for the first exchange: at least **6 s** for any buff.
- Uptime stays a choice: a buff is worth recasting, never free forever. Stack caps are small (2, or 3 for Mirror
  Image), so banking pre-buffs before a boss gives a head start, not an invulnerable opening.
- Chapter One fights: trash 7 to 40 s, the Warden 35 to 75 s (`qa/scripts/rt_balance.js`, ENSO_ACTION_COMBAT_BALANCE §2.3).
  A 10 s buff is a quarter of a trash fight and roughly one boss phase.

## Research (one line each)
- Diablo IV, Rallying Cry: 4 s base, 7 s upgraded ([PureDiablo](https://www.purediablo.com/diablo4/Rallying_Cry)). Its other short shouts and Barrier sit in the same few-second band.
- Path of Exile: most skill buffs run a few seconds; a recast of the same buff refreshes it, it doesn't add a copy ([PoE wiki: Buff](https://www.poewiki.net/wiki/buff), [PoE2 wiki: Duration](https://www.poe2wiki.net/wiki/Duration)).
- Elden Ring: Flame, Grant Me Strength 30 s, Golden Vow 80 s; recasting the same buff refreshes, different buffs stack ([Fextralife](https://eldenring.wiki.fextralife.com/Golden+Vow)).

Reading: fast ARPGs with 1 to 2 s attack cycles use 4 to 8 s; slower, deliberate action RPGs use 30 s and up.
ENSO's enemy cycle (about 2.5 s) and short cooldowns (4 to 7 s) sit between the two, so 8 to 15 s.

## Rules
1. In a timed fight (real-time or action, pre-buffs included) a buff in the table lasts `seconds`, whatever its turn
   duration says. Buffs not in the table keep turns × `secondsPerTurn`. Turn mode never reads the table.
2. A recast adds **one stack** up to `maxStacks` and **refreshes the timer to full**. All stacks share one timer and
   run out together (the PoE and Diablo refresh rule; no per-stack timers to track on the HUD).
3. **Damage reduction multiplies per stack**: 25% Guard at 2 stacks is 1 − 0.75² = 44%, never 50%. Multiplying keeps
   any stack count below 100%.
4. **Charge buffs** (dodge, absorb, counter) spend **one stack per use**, so stacks are charges. The timer is not reset by a use.
5. Once-per-fight and setup buffs don't stack (cap 1): stacking them would only bank them.

## Values (old → new)
| Buff | Class | Effect per stack | Old | New | Stacks | Why |
|---|---|---|---|---|---|---|
| Guard | Warrior | −25% damage taken | 3 s, 1 | **8 s** | **2** (44%) | Covers 3 attacks. Cooldown 4 s, so holding 2 stacks takes a recast every 4 to 8 s: a tank's rotation, not a toggle. |
| Bone Wall | Necromancer | absorbs one hit | 3 s, 1 | **12 s** | **2** | Costs 1 Soul Energy, so it should outlive the hit it was paid for. Two charges cover a pre-buff plus one recast. |
| Evasion | Rogue | 50% to dodge one attack | 3 s, 1 | **10 s** | **2** | Coin-flip charge; two charges make it one expected dodge. |
| Riposte | Rogue branch | counter one attack, +50% | 3 s, 1 | **10 s** | **2** | Must survive until a melee enemy actually swings. |
| Mirror Image | Mage branch | one hit misses | 3 s, 1 | **15 s** | **3** | Three images (genre convention); costs a Deception Token, so the longest window. |
| Guaranteed Crit | Rogue (Shadowstep) | next hit crits | until used | until used | **1** | A setup crit; banking several before a boss would trivialise the opener. |
| Dragon’s Dominion | Warrior ultimate | ×3 damage vs bosses | 3 s | **10 s** | 1 | Once per fight; 3 s fit one swing. 10 s is a real burst window. |
| Taunt | Shield of the Dead | minions hold aggro | 6 s | **6 s** | 1 | Already 2 turns; listed so it is explicit. Taunt doesn't scale with stacks. |

Not changed: War Cry's and Second Wind's statuses are drawbacks on the caster, not buffs. Fortress is a zone.
Haste is an instant extra action, not a duration.

## Measured (`node qa/scripts/rt_balance.js`, 200 seeds/class, v2 real-time bot, before → after)
- Warrior damage taken per second 0.86 → 0.57 (−34%, Guard now covers the next blows). Warden fight HP left 126 → 136. Win rate unchanged (100%).
- Rogue: within noise (the bot rarely casts Evasion). Mage, necromancer: unchanged. Turn mode: unchanged (the table isn't read).

## For Tally to verify
The v2 bot is the only headless measurement today. Once the action-sim bot exists (ENSO_ACTION_COMBAT_BALANCE §2.6):
warrior holding 2 Guard stacks against the Warden should stay inside the 60 to 90 s TTK and not reach 100% wins with
basic play; rogue Evasion uptime with 2 charges; necromancer Bone Wall casts per fight.
