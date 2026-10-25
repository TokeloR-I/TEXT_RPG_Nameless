# QA Report 2026-10-25 #14: real-time combat (combat v2), first balance and bug pass

*Tally, QA & Balance Tester.* This is a report only. I changed no files in `src/`, `tests/`, `ui/` or the data.

**Build.** Branch `claude/project-thread-c0kdlz`, working tree as of today, with Wren's uncommitted `src/engine/realtime.js` and `realtimeRules`. The numbers are first-pass, so this report measures them. It does not grade them.

**Tool.** `qa/scripts/rt_balance.js` is new. It plays a deterministic "human":
- **Timing.** Every 100 ms of fight time it reads `getAvailableActions()`. It presses at most one enabled option, and no more often than `--apm` allows. An option that has just become ready is noticed only after `--reaction` ms (default APM 120, reaction 250 ms).
- **Priority.** Its first choice is a heal item at ≤45% HP. Then: damage skills in skill-bar slot order, summons, Haste, a resource skill when short, a defensive buff while an enemy winds up on you, utility skills, and last the basic attack.
- **Turn mode.** Turn mode runs the existing bots on the same routes: the `tools/balance.js` bot on the dungeon, and the `ch1_survival.js` smart bot on Chapter One.

Both routes ran with 200 seeds per class. Chapter One is the mainline to the Warden, with no pickups or shopping.
- `--probe` also presses disabled options, to check that the refusal codes agree with availability.
- `--stress` runs a 10-minute fight in which neither side can die.
- `--set` clones the data, so tuning can be measured.
- `--repro class:seed:route` replays one seed.

Raw outputs are in `qa/results/rt/`.

## Findings

1. **RT-1 (bug, minor). A heal item shows as enabled while the global cooldown or a stun blocks it.**
   - `itemAvailability()` has no real-time timing check, but `combatUseItem()` refuses with `GLOBAL_COOLDOWN` (and `STUNNED`) through `rtActionProblem`.
   - This breaks the rule that availability and `act()` agree (AGENTS.md §3). A HUD would light the item button, and the click would fail.
   - Hits: 806 refused presses across the 200-seed baseline, and 52 664 in the `--probe` pass. These are the only mismatches found. No disabled option was ever accepted, the refusal codes always matched, and a refused act never changed state.
   - Repro: `node qa/scripts/rt_balance.js --repro mage:2:dungeon --apm 120 --reaction 250` gives "Healing Herb Bundle: GLOBAL_COOLDOWN … at 23200 ms" and exits 1.
   - Suggested fix (Wren): `itemAvailability()` reports `rtActionProblem(item, false)` in combat, with its `readyInMs`.
2. **No other real-time bugs found.** About 8 800 real-time fights per APM setting at 5 settings, plus 13 tuning runs and the stress runs:
   - **Softlocks:** none.
   - **Engine errors:** `engine.errors` stayed empty.
   - **HP:** never NaN.
   - **Stacks:** never above 99.
   - **Expiry:** no status outlived its `rtEndsAt`, and no untimed status lasted longer than 60 s.
   - **Cooldowns, GCD and swing timer:** none was ever longer than its total.
   - **Enemy idle:** no enemy went more than 15 s without acting while not stunned.
   - **Runaway loop:** the 5000-event guard was never hit, even at 99 stacks with a 0.34 s tick.
   - Two things are not covered: `flee` while stunned, and Possession or `control` in real time. No route reaches them.
3. **RT-2 (balance, major). Real time is much easier than turn mode for every class, because of action economy.**
   - In turn mode the player casts about once per enemy cast. In real time, at APM 120, the player casts **1.7–3.8 times per enemy cast**: the basic attack swings every 1.6 s on its own timer, while skills share a 1 s global cooldown.
   - Enemies act once per 3 s at reference speed.
   - Player DPS is **×1.7–2.3** that of turn mode. The damage taken per second is about the same, so fights are 35–50% shorter and you lose far less HP.
   - **Warden win %, turn → real time:** Warrior 89 → **100**, Mage 21 → **95**, Rogue 47 → **100**, Necromancer 15 → **79**. The dungeon goes 4–99% → 100% for every class.
4. **RT-3 (balance). Skill matters, and the class spread survives.**
   - **Warden win % by APM (Warrior / Mage / Rogue / Necromancer):**

     | APM (reaction) | Warrior | Mage | Rogue | Necromancer |
     |---|---:|---:|---:|---:|
     | 30 (600 ms) | 100 | 52 | 84 | 63 |
     | 60 | 100 | 90 | 99 | 73 |
     | 120 | 100 | 95 | 100 | 79 |
     | 240 (150 ms) | 100 | 97 | 100 | 84 |

   - The Necromancer stays the weakest class in every setting, and the Warrior wins at 100% in every setting.
   - "Nothing ready" at APM 120: Necromancer 58%, Warrior 50%, Mage and Rogue 30–37%. The Necromancer and the Warrior spend half the fight waiting on timers, with few skills on the bar.
5. **RT-4 (balance risk). DoT stacking to 99 grows quadratically.**
   - The damage per tick grows with the stacks, and the tick rate also grows with the stacks (`perStackSpeedup` 0.02, which takes the interval to 0.34 s at 99 stacks).
   - In the `--stress` runs: Infection plus Poison at 99 stacks deal **2 079/s**, and Bleed at 81–86 stacks deals 600–690/s. With `perStackSpeedup=0` those drop to 624/s and 217–230/s.
   - Real Chapter One fights stay small: at most 7 DoT stacks, and DoT is 4–11% of the damage dealt. This matters for longer boss fights later.
   - AGENTS.md §4 still lists Infection as "max 3 stacks". `realtimeRules` cites Tokelo (2026-10-25) for the 99 cap in real time. Please confirm, and update AGENTS.md if it is meant.
6. **Observation: reactive defence works as intended, and it is strong.**
   - The wind-up telegraph (0.6 s) plus Evasion and Guard (3 s cooldown, a 3 s duration) means a human can cover most swings.
   - Rogue: 310 dodges against 282 Warden wind-ups over 40 runs.
   - Raising the Guard/Evasion cooldowns to 9 s barely moved the win rates, so this is not the cause of RT-2.

## Tables (APM 120, reaction 250 ms, 200 seeds per class, shipped data)

Turn-mode time is rounds × `secondsPerTurn` (3 s), an equivalent and not a clock. "Casts/s" counts the player's own casts against all enemy casts, without minions.

**Text dungeon (`tools/balance.js` route, 6 fights)**

| Class | Mode | Route win % | Fight win % | Mean fight s | HP left (wins) | DPS dealt | DPS taken | Nothing ready % | DoT share | Max DoT stacks (mean / max) | Casts/s player / enemy |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| warrior | turn | 99 | 100 | 31.1 | 122 | 2.81 | 1.16 | — | 2.3% | 0.1 / 1 | 0.32 / 0.45 |
| warrior | rt | 100 | 100 | 18.8 | 129 | 4.67 | 0.75 | 51 | 4.1% | 0.1 / 3 | 0.76 / 0.45 |
| mage | turn | 4 | 74 | 15.8 | 51 | 3.93 | 2.42 | — | 0% | 0 / 0 | 0.28 / 0.52 |
| mage | rt | 100 | 100 | 12.1 | 75 | 7.25 | 2.30 | 30 | 0% | 0 / 0 | 0.93 / 0.38 |
| rogue | turn | 27 | 85 | 23.4 | 75 | 3.32 | 2.19 | — | 0% | 0 / 0 | 0.30 / 0.47 |
| rogue | rt | 100 | 100 | 11.4 | 93 | 7.66 | 1.59 | 37 | 0% | 0 / 0 | 1.09 / 0.38 |
| necromancer | turn | 12 | 85 | 25.8 | 78 | 3.12 | 1.88 | — | 0% | 0 / 0 | 0.30 / 0.47 |
| necromancer | rt | 100 | 100 | 15.8 | 87 | 5.53 | 1.77 | 58 | 6.7% | 0.3 / 7 | 0.82 / 0.39 |

**Chapter One to the Warden (G1–G4 + B01)**

| Class | Mode | Route win % | Fight win % | Mean fight s | HP left (wins) | DPS dealt | DPS taken | Nothing ready % | DoT share | Max DoT stacks | Casts/s | Warden win % / s / HP left |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| warrior | turn | 89 | 98 | 22.2 | 119 | 2.92 | 1.26 | — | 3.8% | 0.1 / 1 | 0.33 / 0.33 | 89 / 54.9 / 83 |
| warrior | rt | 100 | 100 | 12.4 | 129 | 5.28 | 0.72 | 50 | 6.6% | 0.2 / 3 | 0.86 / 0.31 | 100 / 24.3 / 136 |
| mage | turn | 21 | 84 | 13.7 | 62 | 4.14 | 2.28 | — | 0% | 0 / 0 | 0.33 / 0.31 | 21 / 29.7 / 39 |
| mage | rt | 95 | 99 | 8.6 | 74 | 7.56 | 2.27 | 33 | 0% | 0 / 0 | 1.05 / 0.31 | 95 / 26.8 / 60 |
| rogue | turn | 47 | 89 | 15.7 | 85 | 3.83 | 2.07 | — | 0% | 0 / 0 | 0.33 / 0.31 | 47 / 40.3 / 56 |
| rogue | rt | 100 | 100 | 8.5 | 92 | 7.73 | 1.52 | 33 | 0% | 0 / 0 | 1.15 / 0.30 | 100 / 25.7 / 90 |
| necromancer | turn | 15 | 83 | 19.6 | 78 | 2.96 | 1.79 | — | 0% | 0 / 0 | 0.33 / 0.33 | 15 / 47.4 / 40 |
| necromancer | rt | 79 | 96 | 12.6 | 85 | 5.12 | 1.77 | 58 | 10.9% | 0.4 / 7 | 0.81 / 0.30 | 79 / 38.2 / 71 |

Caveat: each mode is played by its own bot. The turn bots never use Guard, Evasion or summons. The real-time bot uses everything on the bar. Some of the gap is the bot, but the casts-per-second ratio is the mechanism.

## Tuning options for `realtimeRules` (proposals only; measured on real time, APM 120, 200 seeds)

These are Chapter One results: route win % for W / M / R / N, then the Warden win % for the same order.

| # | `--set` | Chapter One route win % (W / M / R / N) | Warden win % (W / M / R / N) | Effect |
|---|---|---|---|---|
| 0 | shipped | 100 / 95 / 100 / 79 | 100 / 95 / 100 / 79 | — |
| 1 | `realtimeRules.enemy.actionSeconds=2.5` | 100 / 87 / 99 / 67 | 100 / 87 / 99 / 67 | Enemies hit 20% more often. The simplest lever. |
| 2 | `realtimeRules.enemy.actionSeconds=2` | 100 / 75 / 94 / 50 | 100 / 75 / 94 / 50 | Strongest single lever. Mage and Necromancer move about halfway back toward their turn-mode numbers. |
| 3 | `realtimeRules.basicAttack.swingSeconds=3` | 100 / 93 / 100 / 76 | 100 / 93 / 100 / 76 | Player casts/s 0.77–0.98. Mostly lengthens fights (Rogue Warden 25.7 → 36.9 s), and barely changes wins. |
| 4 | `…swingSeconds=3` + `enemy.actionSeconds=2.5` + `cooldowns.baseSeconds=4` + `cooldowns.perCostSeconds=3` | 100 / 63 / 90 / 55 | 100 / 63 / 90 / 55 | The closest to turn-mode parity. Casts/s about 0.7–0.86 against 0.35. The Warden takes 31–44 s. |
| 5 | `realtimeRules.statuses.perStackSpeedup=0` | unchanged (100 / 95 / 100 / 79) | unchanged | No effect in Chapter One. It caps the stress DoT at about ⅓ (2 079 → 624/s). Linear stacks are a safe default for the bosses ahead. |

`globalCooldownSeconds=1.5` and the Guard/Evasion cooldowns at 9 s each moved the Warden by ≤3 points (outputs in `qa/results/rt/`).

**Recommendation.** If the target is turn-mode difficulty, take #2 or #4 together with #5, then rerun. The Warrior is at 100% under every option, so the class gap is a separate tuning job for Vaelis.
