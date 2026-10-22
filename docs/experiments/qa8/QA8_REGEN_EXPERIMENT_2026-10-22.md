# QA-8 Decision 8B — isolated regeneration experiment

**Author:** Wren — Primary Developer (Day Shift) · **Date:** 2026-10-22  
**For:** Vaelis (evaluation), Tally (QA reproduction), Creative Director (rates decision)  
**Scope:** measurement only, as the 8B hold allows: every change below is a deep copy of the data inside a scratch script.
No game code, data or tests were changed for this. **No rate is recommended for implementation here**; that is the next gate.  
**Engine:** `main` b2ba3a2 (balance output byte-identical on the branch this ran from).

## Setup
- **Variants**, exactly as the decision record lists them, each against the same seeds, all other values constant:
  baseline · (1) Stealth regen 3 · (2) Combo regen 3 · (3) Deception regen 2 · (4) Time regen 2 · (5) all four ·
  (6) DEF only (QA's O-A: Mage 4, Rogue 5, Necromancer 6, i.e. +2 each) · (7) all four + DEF.
- **Seeds 1–100 per variant and per branch** (all 12 branches), two bots:
  - *smart*: QA's `qa/scripts/smartbot.js` policy (expected-damage choice, summons, Haste first).
  - *simple*: the shipped `tools/balance.js` policy (biggest affordable damaging skill on the weakest enemy).
- **Scenarios:** *boss alone* (QA report #1's setup: level 3 in the branch, full HP, 3 heal items, straight into the
  Warden) and *full run* (the real dungeon, no cheats).

## Findings
1. **Each rate only moves its own branch.** No leakage: e.g. Stealth 3 changes Assassin and nothing else.
2. **The problem is zero regen, not too little.** Assassin and Duelist are fixed by **1 per round**; the candidates
   3/3 overshoot. Deception needs 2 (1 gets Illusionist to 59%).

   | Boss alone, win % (smart / simple bot) | 0 (shipped) | 1 | 2 | 3 |
   |---|---:|---:|---:|---:|
   | Assassin (Stealth Tokens) | 3 / 3 | **100 / 99** | 100 / 93 | 100 / 93 |
   | Duelist (Combo Points) | 85 / 85 | **100 / 96** | 100 / 90 | 100 / 90 |
   | Illusionist (Deception Tokens) | 27 / 0 | 59 / 59 | **99 / 99** | – |
   | Chronomancer (Time Charges, shipped 1) | – | 7 / 59 | 0 / 99 | – |

   At 3, a third or more of regen rounds end with the resource already at its cap (Assassin 37%, Duelist 44%, smart
   bot), i.e. regen being thrown away. At 1, none do. Starvation (turns where no resource-costing skill is affordable)
   drops from 96% to 0% (Assassin) and 51% to 7% (Duelist) already at 1.
3. **Time 2 helps the simple bot (59 → 99%) but the smart bot gets worse (7 → 0%).** Cause: the smart bot casts Haste
   whenever it can, and Haste costs 2 Time Charges, so regen 2 funds a Haste every round. Haste on yourself spends your
   action to get one action back, so it is a net loss (checked separately: hasting every round drops Chronomancer to 13%
   at regen 1 and 0% at regen 2). **Not an exploit, but a design observation:** self-Haste gives no extra action today.
4. **DEF matters more than regen for the full dungeon.** Most Mage runs (and 60% of Rogue runs) die in the early rooms
   before level 3, where no branch rate applies; Mage never wins a full run in any regen-only variant. Necromancer
   reaches the boss at level 3 in 98% of runs and loses there. DEF only takes Necromancer from 1% to 61% and
   Elementalist from 0% to 39%. All four + DEF pushes Rogue very high (Assassin 96%, Saboteur 96%, Duelist 92%).
5. **No exploits found.** No full-run fight hit the 300-turn limit; with QA's `--stunlock` policy none of the level-3
   branches tested (Assassin, Duelist, Saboteur, Illusionist, Chronomancer, Vanguard) denied the boss any turn (baseline or all four); no unlimited cast loops (the Haste loop above loses, it doesn't win).
6. **Necromancer branches play identically** at level 3 here (41% boss alone in every regen variant, as expected: Soul
   Energy wasn't touched). Separate investigation per the decision record.

## Boss alone, win % — smart bot
| Branch | Baseline | (1) Stealth 3 | (2) Combo 3 | (3) Deception 2 | (4) Time 2 | (5) all four | (6) DEF only | (7) all four + DEF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| vanguard | 99 | 99 | 99 | 99 | 99 | 99 | 99 | 99 |
| berserker | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| warden | 81 | 81 | 81 | 81 | 81 | 81 | 81 | 81 |
| elementalist | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| illusionist | 27 | 27 | 27 | 99 | 27 | 99 | 70 | 100 |
| chronomancer | 7 | 7 | 7 | 7 | 0 | 0 | 58 | 0 |
| assassin | 3 | 100 | 3 | 3 | 3 | 100 | 18 | 100 |
| duelist | 85 | 85 | 100 | 85 | 85 | 100 | 98 | 100 |
| saboteur | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| bone warden | 41 | 41 | 41 | 41 | 41 | 41 | 87 | 87 |
| plaguecaller | 41 | 41 | 41 | 41 | 41 | 41 | 87 | 87 |
| soulbinder | 41 | 41 | 41 | 41 | 41 | 41 | 87 | 87 |

## Boss alone, win % — simple bot
| Branch | Baseline | (1) Stealth 3 | (2) Combo 3 | (3) Deception 2 | (4) Time 2 | (5) all four | (6) DEF only | (7) all four + DEF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| vanguard | 81 | 81 | 81 | 81 | 81 | 81 | 81 | 81 |
| berserker | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| warden | 81 | 81 | 81 | 81 | 81 | 81 | 81 | 81 |
| elementalist | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| illusionist | 0 | 0 | 0 | 99 | 0 | 99 | 0 | 100 |
| chronomancer | 59 | 59 | 59 | 59 | 99 | 99 | 96 | 100 |
| assassin | 3 | 93 | 3 | 3 | 3 | 93 | 18 | 99 |
| duelist | 85 | 85 | 90 | 85 | 85 | 90 | 98 | 99 |
| saboteur | 93 | 93 | 93 | 93 | 93 | 93 | 99 | 99 |
| bone warden | 41 | 41 | 41 | 41 | 41 | 41 | 87 | 87 |
| plaguecaller | 41 | 41 | 41 | 41 | 41 | 41 | 87 | 87 |
| soulbinder | 41 | 41 | 41 | 41 | 41 | 41 | 87 | 87 |

## Full dungeon, win % (boss win % of runs that reached it) — smart bot
| Branch | Baseline | (1) Stealth 3 | (2) Combo 3 | (3) Deception 2 | (4) Time 2 | (5) all four | (6) DEF only | (7) all four + DEF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| vanguard | 84 (84) | 84 (84) | 84 (84) | 84 (84) | 84 (84) | 84 (84) | 84 (84) | 84 (84) |
| berserker | 100 (100) | 100 (100) | 100 (100) | 100 (100) | 100 (100) | 100 (100) | 100 (100) | 100 (100) |
| warden | 34 (34) | 34 (34) | 34 (34) | 34 (34) | 34 (34) | 34 (34) | 34 (34) | 34 (34) |
| elementalist | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 39 (78) | 39 (78) |
| illusionist | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 3 (6) | 39 (78) |
| chronomancer | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 1 (2) | 0 (0) |
| assassin | 0 (0) | 29 (83) | 0 (0) | 0 (0) | 0 (0) | 29 (83) | 3 (3) | 96 (96) |
| duelist | 2 (6) | 2 (6) | 17 (49) | 2 (6) | 2 (6) | 17 (49) | 60 (60) | 92 (92) |
| saboteur | 29 (83) | 29 (83) | 29 (83) | 29 (83) | 29 (83) | 29 (83) | 96 (96) | 96 (96) |
| bone warden | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 61 (61) | 61 (61) |
| plaguecaller | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 61 (61) | 61 (61) |
| soulbinder | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 1 (1) | 61 (61) | 61 (61) |

Simple-bot full-run numbers, plus run length, paid-cast share, starvation and capping per variant are in the script
output (`afford.js` prints them for the four target branches and both bots).

## Caveats
- Bots, not people. The two policies disagree exactly where a skill's value depends on judgement (Haste, expensive vs
  cheap casts), so both are shown. The simple bot never uses Haste.
- Boss alone isolates the branch at level 3. The full run is the real game, but most Mage runs end before evolution,
  so it says little about Mage branch resources.
- 100 seeds per cell: a difference of a few points is noise.

## Questions for the Lead Designer
1. Regen floor of **1** (Stealth, Combo), **2** (Deception), Time unchanged at 1 or 2? The data says 3 is more than
   these branches need at level 3. Later stages may need more; nothing past level 3 was measured.
2. DEF: the full-run problem for Mage and Necromancer is before evolution, so it isn't a QA-8 question. Should it be a
   separate item?
3. Self-Haste giving no net action: intended (Haste is for allies), or should Haste on yourself grant a real extra action?

## Reproduce
```
node docs/experiments/qa8/qa8-experiment.js . 100 > results.json   # all 8 variants x 12 branches x 2 bots (~70 s)
node docs/experiments/qa8/afford.js .                               # boss-alone affordability / capping table
node docs/experiments/qa8/afford.js . sens                          # lower values (1 and 2)
node docs/experiments/qa8/stunlock.js . --stunlock                  # stun-lock check
node docs/experiments/qa8/chrono2.js .                              # Haste-every-round check
```
Every number above comes from these runs; seeds 1–100; results are deterministic.
