# QA report #15: combat v3 baseline in a real browser

**Tally, QA & Balance Tester** · 2026-10-25 · branch `claude/project-thread-c0kdlz` at `6fc3f49` (rebased on main `63e7175`
with PR #184), working tree. Headless Chromium, real keys and mouse. Direction §13: gameplay is observed in a browser,
not inferred from unit tests.

## Harnesses

| Script | What it checks | Output |
|---|---|---|
| `qa/scripts/action_browser.js` (new) | 16 checks against the **target** combat v3 behaviour (a–p below) | table, `qa/results/action/*.png`, `results.json`, exit 1 on any FAIL |
| `qa/scripts/world_browser.js` (fixed) | exploration: keys, collision, dialogue, pickups, transitions, the road on | exit 1 on any FAIL |

```
node qa/scripts/action_browser.js                      # all checks (about 8 min)
node qa/scripts/action_browser.js --check g,k          # a subset; --class rogue, --headed, --strict (NOT YET counts as a fail)
node qa/scripts/action_browser.js --root /path/to/copy # test another checkout (e.g. `git archive` of a commit)
node qa/scripts/world_browser.js                       # exploration (about 9 min)
node qa/scripts/world_browser.js --legacy-battle       # plus the old battle-menu checks on world.html?combat=turn
```

`action_browser.js` builds its probes from `ensoDebug.sim()`. It uses `ensoDebug.action.*` instead if that is added.
Debug calls only set things up (placement, an HP buffer for long observations, the Q06 quest state). Every player
action is a real key press or mouse click.

**world_browser.js fixes:** BFS routes are null-safe (the cause of the "(intermediate value) is not iterable" crash).
The walker re-routes after every step, and in free movement it re-centres on the tile and ends a step on a tile change
only. B11 now walks road → Broken Tollway → road, because Chapter One removed the old fog notice. The battle-menu checks
(B9, B10, B12, B14) are legacy-only (`--legacy-battle`, `?combat=turn`), with the menu selector updated to `#combat .menu li`.

## Results today

**Exploration (default build): 10/10 pass, 4 legacy skipped.** **Legacy (`--legacy-battle`): 14/14 pass.**
No exploration regressions. Logs: `qa/results/action/world/`.

**Combat v3: 14 pass · 2 fail · 0 not yet** (`qa/results/action/action_browser.txt`):

| id | check | result | evidence |
|---|---|---|---|
| a | sub-tile + diagonal WASD | PASS: 4.8 tiles in 1 s, fractional; W+A moves on both axes | 02, 03 |
| b | no battle overlay; rats approach | PASS | 04–06 |
| c | 1/LMB lowers HP; move mid-fight | PASS: 15 → 5 | 07, 08 |
| d | Space dodge | PASS: 3.5 tiles vs 1.4 walking | 09 |
| e | loot drop collected once | PASS: drop gone, inventory +1 once, nothing on a second walk-over | 10–13 |
| f | no console errors | PASS | — |
| g | Crow Warden: challenge by dialogue, fight in the map | **FAIL** (D1) | 14–16 |
| h | save/load keeps the dead dead | PASS | 19, 20 |
| i | leash | PASS: the fight ends and the rats return home | 21 |
| j | guard | PASS: 0.10 HP/s guarding vs 1.56 HP/s open | 22 |
| k | ranged acolytes | **FAIL** (D2) | 25–27 |
| l | death → respawn | PASS: half HP, the wolf resets, no game over | 31, 32 |
| m | save refused mid-fight | PASS: "You can't save during a fight." | 28 |
| n | map exit mid-fight | PASS: the fight ends cleanly and the rats are reset | 29, 30 |
| o | parry | PASS: the attacker staggers, 0 damage | 23 |
| p | collision | PASS: 0/153 samples inside a solid tile | 24 |

Before the action build (commit `2e1d757`, `qa/results/action/pre_action_2e1d757/`), a–e, g and h were all NOT YET,
because the old build still had grid steps and the battle overlay.

## Defects

**D1 (S1, blocks the chapter boss): the Crow Warden can't be fought after the challenge.** Choosing "Stand aside…"
sets `warden_challenged` and the encounter becomes visible. The sim, though, has no actor for it, even after 4 s.
`ActionSim.enterMap()` builds the groups only on map entry (`src/action/sim.js:90`), so a story flag never adds a group.
Leaving and re-entering the sanctuary makes the fight work: it starts in the map, with no overlay.
*Repro:* sanctuary, with Q06 complete → talk to the Warden → "Stand aside…" → "(Draw your weapon.)" → walk up to him.
Nothing engages. `ensoDebug.sim().actors` is `[]`.
*Evidence:* `qa/results/action/defects/warden_no_actor_after_challenge.png`, check g.

**D2 (S2): the orchard acolytes (a gate encounter) detect the player unreliably and never land a ranged attack from the gateway.**
In 3 trials the player stood 3 tiles south of the gateway with a clear line of sight. Trial 1 never engaged in 4 s, and
the others engaged after 0.35 s and 2.9 s. All three trials had 0 projectiles and 0 damage. The acolytes cycle
chase → windup → recover inside the gate cells. *Likely cause:* `lineOfSight()` without `wide` uses `solidPx`, which has
no exemption for the gate cells (`sim.js:758-766`), and projectiles die in solid cells (`sim.js:778`). The gate's own
cells are solid, so they block the acolytes' sight and kill their shots. One earlier run did see 1 projectile and 6
damage, after an acolyte had stepped out of the gate. The other gate fights, the tollway goblins and gnawers, are melee
but share the sight rule.
*Repro:* `node qa/scripts/action_browser.js --check k`.
*Evidence:* `qa/results/action/defects/acolytes_*.png`.

**D3 (S3, feel): no corner slide.** If the body overlaps a wall row by a few pixels while walking along it, it stops
dead. *Repro:* grounds, with the player at (21, 15.72) → hold A → stuck at (17.85, 15.72), against the shed wall row.
A player would have to nudge down to get free.
*Evidence:* `qa/results/action/defects/corner_snag_grounds.png`.

## Notes (not defects yet)

- The first E after walking up to the Warden was sometimes ignored, and a second E opened the talk. The harness retries
  E once. Not confirmed outside the harness.
- `ensoDebug.goto()` during an engaged fight rebuilds the sim but leaves the engine fight engaged, so the new groups
  never join. This affects the debug path only; a real exit (check n) is clean.
- Guarded hits still cost 1–4 HP each, against 3–5 open. For Gauge: confirm the DEF floor (`minDamageShare` 0.35) is
  meant to apply after guard's 0.25 multiplier.
