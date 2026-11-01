# QA report #16: browser pass after the 25–31 Oct merges, and the Warden vs stacked pre-buffs

**Tally (QA) with Gauge (balance)** · 2026-11-01 · `main` at `9d4d475` (#204). Requested by Tokelo (recommendations 1 and 2).

Since report #15 (25 Oct) these merged without a full browser pass: 8-direction facing (#194), class guard profiles
(#195), summon bodies and followers (#196, #198), story-locked ways opening (#197), real out-of-fight casts (#199),
pre-buffing (#200), resource recovery (#201), buff durations and stacking (#202), live skill texts (#203) and the
Shamefield rebuild (#204).

## Summary

- **No regressions found.** Unit tests 540/540. Action combat 16/16 for the warrior; the class subset is green for
  rogue, mage and necromancer after reruns (two harness flakes, below). Exploration 10/10 (4 legacy checks skipped
  as designed). Every map is reachable on foot; Shamefield walks clean from all six spawns with no page errors.
- **Pre-buffing does not break the Crow Warden.** Stacking up before the pull changes little for the warrior, rogue and
  necromancer. The mage's 3-stack Mirror Image is the one buff that matters (about 40% less damage taken), and it
  still leaves a real fight. No tuning recommended for pre-buffing.
- **New balance finding (for Gauge): the classes are far apart on the Warden.** Warrior kills him in ~40 s and never
  loses; the rogue wins 40–80%; the necromancer takes ~100–115 s. Target (ENSO_ACTION_COMBAT_BALANCE.md): 60–90 s, 70–90% wins.

## 1. Browser pass (Tally)

| Run | Result |
|---|---|
| `npm test` | 540/540 |
| `action_browser.js` (warrior, all checks a–p) | **16/16 PASS**, including g (Warden challenged by dialogue, fought in the map) and k (ranged acolytes), the two #15 defects |
| `action_browser.js --class rogue/mage/necromancer --check b,c,d,f,j,l,o` | all PASS after reruns; o is now **N/A** for mage and necromancer (see harness fix) |
| `world_browser.js` | 10/10 PASS, 4 legacy-battle checks skipped (default build) |
| `world_reach.js` (new, 15 maps) | every spawn, exit, interactable and encounter reachable on foot (gate fights count as the way on) |
| `shamefield_browser.js` (new) | 6/6 spawns walk, 0/288 samples inside a solid tile, no page errors |

**Harness flakes (not game defects).** In the first class run, rogue l (death → respawn) and necromancer c (attack
lowers HP) failed once each; both passed 2/2 on rerun. The rogue l fail still had the new-game intro open, which looks
like timing while three browser runs and the bot shared the CPU. Run browser checks one at a time.

**Harness fix.** Check o (parry) expected every class to parry, but #195 gave the mage and necromancer guards no parry
window (`actionRules.classes.<cls>.guard.parry: null`) on purpose. The check now reports N/A for those classes
instead of FAIL, and the summary counts N/A.

### Shamefield (#204)

Walked from all six spawns with real keys; screenshots in `qa/results/shamefield/`. The square, the gate, the banners
and the torches read well. Small notes for Saffron/Pixie, not blockers:

- At the south gate entrance (`from_tollway`) the player stands under the skill bar until they walk north, because the
  camera can't scroll past the map's bottom edge.
- On the `flight_well` screenshot a hooded villager stands drawn over the trunk of the dead tree west of the wells.
  Worth a look in the scene layout.
- Already open from #204: the river is wider than in the reference, and the ground is slightly green.

## 2. Crow Warden vs stacked pre-buffs (Gauge)

`qa/scripts/warden_prebuff.js` (new) fights the Warden on the real ActionSim and engine, level 3, each class on the
branch that gets a stacking self buff. Each seed is fought twice: walking in cold, then after pre-buffing every buff to
max stacks out of the fight (plus a follower for the necromancer). The bot keeps its weapon range, attacks on cooldown,
keeps its buffs up in the fight, and dodges a wind-up with probability `--react`. It is the same in both runs, so the
difference between rows is the pre-buff. It is simple, so absolute numbers are rough; a skilled player does better.

**React 0.6 (dodges 60% of wind-ups), 20 seeds:**

| class / branch | pre-buff | win | time to kill (wins) | HP lost per fight | pre-buff state |
|---|---|---|---|---|---|
| warrior / Vanguard | no | 100% | 42.3 s | 59 | |
| warrior / Vanguard | yes | 100% | 43.1 s | 57 | Guard ×2 |
| rogue / Duelist | no | 75% | 58.0 s | 88 | |
| rogue / Duelist | yes | 80% | 54.5 s | 85 | Evasion ×2, Riposte ×2 |
| necromancer / Bone Warden | no | 95% | 103.6 s | 35 | |
| necromancer / Bone Warden | yes | 100% | 113.6 s | 27 | Bone Wall ×2, 1 skeleton |
| mage / Illusionist | no | 85% | 87.6 s | 44 | |
| mage / Illusionist | yes | 95% | 86.4 s | 25 | Mirror Image ×3 |

**React 0.3 (a weaker player):**

| class / branch | pre-buff | win | time to kill (wins) | HP lost per fight |
|---|---|---|---|---|
| warrior / Vanguard | no / yes | 100% / 100% | 37.8 / 36.2 s | 86 / 85 |
| rogue / Duelist | no / yes | 40% / 45% | 38.1 / 40.0 s | 100 / 95 |
| necromancer / Bone Warden | no / yes | 60% / 55% | 99.8 / 100.8 s | 61 / 60 |
| mage / Illusionist | no / yes | 55% / 75% | 65.5 / 76.2 s | 59 / 43 |

Full output: `qa/results/warden_prebuff/`.

**Reading.** Guard (8 s), Evasion/Riposte (10 s) and Bone Wall (12 s) mostly run out or get spent in the first seconds
of a fight that lasts 40–110 s, and the bot recasts them in the fight anyway, so walking in pre-buffed is worth little.
Mirror Image is 15 s and three hits, which is most of the opening exchange, so it is the one pre-buff that pays: about
40% less damage and +10 to +20 points of win rate. That is a reward for preparation rather than a trivialised boss.
**No change recommended** to `realtimeRules.statuses.buffs` for pre-buffing.

### New finding: class spread on the Warden (for Gauge to decide)

| | target | warrior | rogue | necromancer | mage |
|---|---|---|---|---|---|
| time to kill | 60–90 s | ~40 s (too fast) | 40–58 s (fast) | 100–115 s (too slow) | 65–88 s (on target) |
| win % | 70–90% | 100% at both skill levels (too safe) | 40–80% | 55–100% | 55–95% |

The warrior out-damages and out-survives everyone (the Vanguard's 35% Guard, a 3-hit combo at 26 px reach). The
necromancer's bolts and one skeleton take nearly twice the target time. The bot's caveats apply (a real rogue parries,
a real necromancer uses Soul Leech and more skeletons), so the next step is the 200-seed per-branch run that
`ENSO_ACTION_COMBAT_BALANCE.md` §222 already calls for, before any number moves. Not changed in this pass.

## Not covered

- Branches other than one per class, and levels other than 3.
- The five skills not yet ported to live combat (Backstab flank, Caltrops, Soul Chain break distance, Mirror Image
  decoy, Possession): the bot's Mirror Image counts the status stacks only.
- Audio (the game has none).
