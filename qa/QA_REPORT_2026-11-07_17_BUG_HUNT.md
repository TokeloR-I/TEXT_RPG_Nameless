# QA report #17: bug hunt over the 1–5 Nov systems

**Tally (QA) with Wren (dev fixes)** · 2026-11-07 · `main` at `0d07cf5` (#232). Requested by Tokelo ("Can the team do bug hunting").

Covered: live action combat, Skill Web and the skill bar, kitchen and beer, farming and foraging, saves across
updates, the quest tracker, the Warden approach, the Fallen Seraphim gaze, and the Captain's gate.

## Summary

- **Three bugs found and fixed** in the same PR (below). None breaks a save or the golden replays.
- **No crashes, page errors or stuck states found.** Tests 703/703 before the fixes (706/706 after). A new action-mode fuzzer (`qa/scripts/action_fuzz.js`)
  (16 runs × 40 000 frames, all four classes, random walking, fights, food, beer and a save → load every few hundred
  frames) broke no invariant. A browser tour of every map and menu logged no errors.
- **Every map is reachable on foot** (`world_reach.js` over all 16 maps).
- **Golden replays unchanged** (text `be89cdc1d3a9fbf1 / 34650620362b96a9`, world `25bd9d37c1ac8c77 / d7a52021b79e211d`).

## Bugs fixed

| # | Where | What the player saw | Fix |
|---|---|---|---|
| BH-1 | Quick heal (`H`) | With only beer left, mashing `H` drank it. The 5th beer made you **Drunk** (inverted controls) in the middle of a fight. | Quick heal now picks potions, then meals only. Beer is still drunk on purpose from Items. Test in `93-kitchen`. |
| BH-2 | Menu: Status and Equipment | Crit chance read **`0.05`** instead of 5%. After a level-up it could read **`0.15000000000000002`**, which spilled out of its box. Gear diffs read `+0.05 Crit chance`. | `ui/main-menu.js` formats crit chance as a percentage and rounds every stat. Test in `41-main-menu`. |
| BH-3 | A Proper Meal (SF6) on older saves | A save that finished Get to Know the Locals on five favours (before #232) could never be offered SF6. Only the Captain's deal and his reminder offer it, and both need L01 still open. | A story `catchUp` makes SF6 available on load for those saves, so Oda offers it. Test in `92-shamefield-locals`. |

## Seen, not changed (for the owners named)

- **Pixie / Thorne: the hearth lists "Cook 2 Bratwurst (Pork)" first.** When Oda hands you Pork and a Brötchen for SF6,
  pressing Enter on the first choice uses the Pork on Bratwurst. You can recover by buying Pork from Greta (5 Gold).
  One option is to list the active quest's recipe first.
- **Classic text game: meal buffs never tick out of a fight there** (no calm clock), and a fight start clears them.
  Tipsy only clears on rest. This is harmless (inverted controls mean nothing in the text game), so it is left as it is.
- **Stale QA harnesses (Tally's own, no game bug behind them):**
  - `action_browser.js` checks i, l and n fail. l: the road wolf is now a pack of 4 further down the road, so the 10 s
    walk never reaches it. A headless check confirms that death respawns at 60/120 HP with the pack reset. i: the 3-tile "home" radius is
    tighter than the rats' spawn spread. n: the exit is barred while enemies are close, which is the design.
  - `ch1_checks.js` X6 still returns the register for the gate. Since #232 the gate needs the six favours.
  - `world_smoke.js` [2] and [4] expect level-1 wins over the later encounters and older wording.
  - `world_reach.js` and `world_smoke.js` take map ids or a seed count, not `.`.

## How to rerun

```
npm test
node qa/scripts/world_reach.js $(node -e "console.log(Object.keys(require('./src/world/zone1.js').maps).join(' '))")
node qa/scripts/golden.js . --split --world
node qa/scripts/action_fuzz.js 16 40000
node qa/scripts/action_browser.js
```
