# Boss difficulty: win rates (2026-11-17)

Spec: `docs/design/BOSS_DIFFICULTY.md`. Bot: hold range, cast what's ready, dodge a tell 60% of the time, quick-heal
below 40% HP. All runs after the wide-body pathing fix (QA #18) and with the heal punish live.

## Crow Warden: level 4, 4 heals, 40 seeds (target 50-65%)

`node qa/scripts/warden_benchmark.js --level 4 --heals 4 --seeds 40`

| class / branch | before (L3, 0 heals, 20 seeds) | after (L4, 4 heals) | time to kill |
|---|---|---|---|
| warrior / vanguard | 80% | 60% | 70.9 s |
| warrior / berserker | 80% | 48% | 72.0 s |
| rogue / duelist | 85% | 78% | 44.2 s |
| rogue / assassin | 75% | 57% | 50.0 s |
| rogue / saboteur | 90% | 68% | 47.6 s |
| mage / illusionist | 65% | 50% | 68.0 s |
| mage / elementalist | 70% | 43% | 64.4 s |
| necromancer / bone_warden | 95% | 68% | 78.1 s |
| necromancer / plaguecaller | 100% | 78% | 52.1 s |

Before the change, the same level 4 + 4 heals bot won 90-100% with every branch. Average now 61%. Duelist and
Plaguecaller sit above the band, Elementalist below it; at 40 seeds the noise is about ±8%.

Under-prepared (level 3, no heals, 40 seeds): 0-25%. A player who rushes him without food dies.

## After the Warden: 6 heals, 20 seeds (target 25-40%)

`node qa/scripts/boss_benchmark.js --seeds 20` (before the change every branch won 60-100% using 0-1 heals)

| class / branch | Binding Echo (L5) | Bjarki, all anchors out (L6) | Man in the Peat (L6) |
|---|---|---|---|
| warrior / vanguard | 40% | 40% | 25% |
| warrior / berserker | 50% | 35% | 25% |
| rogue / duelist | 90% | 100% | 100% |
| rogue / assassin | 85% | 75% | 85% |
| rogue / saboteur | 90% | 85% | 95% |
| mage / illusionist | 15% | 20% | 40% |
| mage / elementalist | 10% | 10% | 5% |
| necromancer / bone_warden | 80% | 20% | 90% |
| necromancer / plaguecaller | 90% | 65% | 100% |

Finding for Gauge/Tokelo: the class gap decides these fights. Rogues (evasion) and the Plaguecaller still win most
attempts; warriors and mages die most of the time. More boss damage would only push the mages to 0%. Evening this out
needs class work, which Tokelo has ruled out for now.

## Aurevain (unchanged boss, pathing fix only), level 10, 10 seeds

Fallen builds 50-60% (warrior, rogue), necromancer 10%; ordinary builds 0-30%. Same shape as its design target.
