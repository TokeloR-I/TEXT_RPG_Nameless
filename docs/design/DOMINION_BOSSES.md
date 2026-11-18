# The Dominion rulers: real boss fights

Owner: Thorne (mechanics), Gauge (numbers). Requested by Tokelo, 2026-11-18, after playing the Devil Union content:

> the luficero boss is just a tank that has 2 moves really not difficult the dark souls part is a giant health bar and
> no move threatening the player in any way ....

Builds on `BOSS_DIFFICULTY.md` (rage, the post-Warden standard). Constraints kept: no class is nerfed, healing stays
uncapped, every tell is 480 ms or longer, and the telegraph is the hitbox.

## 1. Why he felt like two moves

Lucifero had four base moves and two rage moves on paper, but the move picker throws the first special that is ready.
From range only Gravity Well and Falling Star fit, so a player who kept their distance saw those two, over and over,
both easy to side-step, while 1,664 HP (`hpMult` 3.2) drained. Beelzebub, Slotos and Plumede were built from the same
template and had the same problem.

## 2. Three acts for every ruler

* **`alternateSpecials`**: a special is followed by a base blow when one fits, and the special that has waited longest
  goes next, so the whole kit comes out (tested: four or more different moves in a minute at range).
* **Phase 2 at 70%** (`phases[1].add`): new signature moves on top of the old ones, opened with one of them and
  announced on screen.
* **Phase 3 is the rage, at 35%**: the rage moves, faster and harder, heal punish.
* **Less health bar**: `hpMult` 3.2 -> 2.4 (Lucifero), 2.6 (Beelzebub, Plumede), 2.3 (Slotos). The danger is in the moves.
* **`scaleToLevel`**: past level 7 each level you have adds 5% HP, 10% attack and 4% defence to the ruler, so coming
  back strong (or with the cheat panel) does not turn him into a tank that can't hurt you. Tokelo's call (see the PR).

## 3. Lucifero, gravity

| Act | Moves |
|---|---|
| 1 (100-70%) | Crushing Weight (2-hit), Gravity Well (roots and pulls) **always followed by Pressed Flat** (raise your guard), Falling Star (3 marked circles), Infernal Brand (burning ring) |
| 2 (70-35%) | **The floor leans toward him** for the rest of the fight (18 px/s). **Event Horizon**: 1.6 s of pull (64 px/s, so with the lean walking away loses ground; sprint or dodge out of 54 px), then a nova. **Descent** (a fall across the arena), **Starfall** (two stars, the second where you stepped), **Weight of the Fallen** (two cuts and a slam all round him) |
| 3 rage (35-0%) | The lean grows (26 px/s) and Event Horizon pulls harder and wider. **Collapse of the Dominion**: the floor caves in two patterns back to back (inner rings: get away; outer rings: get close; a cross; the sides), then a 3 s rest. **Black Sun**: a dark star follows you, locks, falls. Healing in sight brings Descent |

Gravity is drawn: violet motes spiral in toward him, sparse for the lean, thick while a pull winds up.

## 4. The other three

| Ruler | Phase 2 (70%) |
|---|---|
| Beelzebub (space) | **Behind You**: he steps out of a fold at your back, already swinging (0.62 s to turn and guard or dodge). **Spatial Anchor**: a fold follows you, locks, snaps shut. **Shattered Distance**: two arena patterns of glass. |
| Slotos (toughness) | **Iron Rampage**: three charges running, each re-aimed at you. **Aftershock**: the floor heaves near him, then far from him. |
| Plumede (agility) | **Talon Cascade**: three dives running, each re-aimed. **Owl's Eye**: a mark that follows and stoops. **Gale Wall**: rows, then columns of wind. |

Their rages are unchanged apart from the threshold (60% -> 35%) and faster phase-2 moves.

## 5. Engine (generic, data-driven)

* `bosses[key].phases[].add / drop / attackOverrides` work for a boss with an attack list (before only the Warden's
  table form had phases); a re-used name replaces the old move; a rage `add` replaces by name too.
* `phases[].notice`: the line shown when the phase opens.
* `phases[].gravity` / `rage.gravity` `{ pxPerS, radius }` and an attack's `pull` `{ pxPerS, radius }`: px/s toward the boss.
* An attack's `blink { px, at: 'behind'|'side' }`: the boss steps out of space next to its target as the wind-up starts.
* `followUpAlways`: an attack's `followUp` fires outside the rage too.
* `arenaPatterns` (same format as the Warden's `crowStorms`) and `arena` per boss; `markText` for a mark's warning.
* `scaleToLevel { level, hp, atk, def }`: applied when the group engages.

## 6. Measured (`node qa/scripts/boss_benchmark.js --boss lucifero|beelzebub|slotos|plumede`, level 7, 6 heals)

Lucifero, react 0.6, 10 seeds: warriors 0-10%, rogues 60-100%, mages 0-10%, necromancers 30-70% (average 40%). The
class spread is the one `BOSS_DIFFICULTY.md` already lists (Tokelo's call, no class nerfs). The bot stands still and
never sprints or guards, so it under-rates the pull and over-rates the ranged circles; it is a floor, not a human.
