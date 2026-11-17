# Boss difficulty: the Warden's rage and the Dark Souls standard

Owner: Gauge (numbers), Thorne (mechanics). Requested by Tokelo, 2026-11-17, after a friend's playtest:

> the game is a bit too easy cause you can run away from certain mobs ... there's not much pressure to staying alive.
> He killed the Crow Warden with warrior ... going forward I want to make the bosses more difficult, think Dark Souls
> difficult, have the player prepare to die ... add more move sets and speed buff and make the boss unforgiving,
> basically have the boss be in a rage, all the classes must have a 50-65% chance of winning ... let the Warden still be
> "easily" beatable, but all the bosses going forward should shatter this illusion that the player built up that the
> game is easy.

> Also the charging or dashing range of the Warden is short: make it so he can do his spear dashing attack up to the end
> of the room.

Constraints kept: no class is nerfed; healing keeps no cooldown and no cap (Tokelo 2026-11-04); no distance leash
(Tokelo 2026-11-12); every tell stays readable (480 ms or more).

## 1. How difficulty is measured

A "decent first attempt" bot (`qa/scripts/warden_benchmark.js`, `qa/scripts/boss_benchmark.js`): holds its weapon
range, casts what is ready, dodges a tell with probability 0.6 about 150 ms before it lands, and quick-heals below 40%
HP while it carries a heal. Healing is unlimited by rule, so the bot carries a realistic kit instead: 4 heals at the
Warden (Iona's and Shane's stock), 6 after it.

| Boss | Level | Heals | Target wins per branch |
|---|---|---|---|
| Crow Warden | 4 (746 XP, the quest line) | 4 | 50-65% |
| Every boss after him | expected level | 6 | 25-40% ("prepare to die") |

The Warden stays the easy one: the first half of his fight is unchanged and learnable; the rage only comes for the
second half. A player who learns his tells beats him easily; a careless first attempt dies about half the time.

## 2. Rage (any boss: `actionRules.bosses[key].rage`)

Once, when the boss drops below `atHpPct`, it rages until it dies (healing it does not calm it):

| Field | Effect |
|---|---|
| `speedMult` | moves faster (catches a walking player) |
| `windupMult`, `minWindupMs` | shorter wind-ups, never below the floor |
| `recoveryMult`, `minRecoveryMs`, `attackGapMs` | shorter rests between blows |
| `damageMult` | harder blows (times the boss's own `damageMult`, times the attack's) |
| `add` | new moves: names from the boss's `attacks` table, or whole attack objects for a boss with an attack list |
| `attackOverrides` | retunes moves while it rages |
| `keepDistance` | presses in instead of hanging back |
| `windupStepSpeed` | walks its close blows in after you during the wind-up (the telegraph moves with it) |
| `huntsPlayer` | steps past your summons (taunt or not) to get at you |
| `punishHeal` | if it sees you heal (8+ HP in one step), that move comes at once |
| `openWith` | the move that announces the rage |
| `cleanse`, `cleanseEveryMs` | tears off statuses in these categories when it starts raging, then again on this timer |
| `notice` | the line the player reads |

An attack can name `followUp` (and `followUpMs`): while the boss rages, a blow of it that lands is followed straight up
by that move. `followUpOnly` moves are never picked on their own.

## 3. The Crow Warden

* **Crow Charge** (all phases, Tokelo's ask): a spear charge 420 px long, the length of the sanctuary. 900 ms wind-up
  (800 in rage), 6.5 s cooldown (4.5 in rage). The line drawn during the wind-up is the whole path.
* **Rage below 70%**: speed ×1.5, wind-ups ×0.85 (floor 480 ms), recoveries ×0.75, 500 ms between blows, blows ×1.7
  (his halberd sweep ×1.6, Reaper's Dance ×1.5 and Gallows Spin ×1.7 on top: getting greedy up close is what kills).
  He hunts you past your summons, walks his close blows in at 48 px/s, tears DoTs off himself when the rage starts and
  every 15 s, and charges you when you heal.
* **Gallows Spin** (rage): the halberd all the way round, 46 px, 650 ms wind-up. Hugging him isn't safe.
* **Gallows Drop** (rage): a Chain Lock that lands is followed by a heavy thrust 200 ms later. Raise your guard.
* `hpMult` 3.2 -> 3.6.
* Phases 2 and 3, Guardian's Resolve, the crow storms and Crow's Illusion are unchanged.

## 4. After the Warden

| Boss | Always | Rage |
|---|---|---|
| Bjarki the Grave-Bound | `hpMult` 3.4, blows ×1.8 | below 60%: ×1.4 blows; Hearth-Charge (300 px shield charge, staggers); Barrow-King's Fury (three cuts, the last overhead) |
| The Binding Echo | `hpMult` 3.2, blows ×2.0 | below 60%: ×1.4 blows; Wolf-Run (320 px chain lash); Twin Eclipse (the dark comes up under you twice) |
| The Man in the Peat | `hpMult` 8, blows ×3.0 | below 75%: ×1.4 blows; Cord of Offering (roots and drags you in); Mire Surge (280 px slide) |

All three rage with speed ×1.6, wind-ups ×0.85 (floor 480 ms), rests ×0.7, 400 ms between blows, hunt the player, step
their blows in, and answer a heal with their charge. Aurevain (the level 10 Fallen trial) was already built as a wall and
is unchanged. **Every new boss gets a `bosses` entry with a rage and a cross-arena gap-closer** (tested).

## 5. Mob pressure

`actionRules.combat.pursuit` `{ beyondPx: 40, speed: 84 }`: an engaged non-boss enemy more than 40 px behind its fighting
range runs you down at 84 px/s if it is slower. You walk at 72 and sprint at 108, so walking away no longer works; only a
sprint with stamina to spare gets you clear, and the group still only gives up at a map exit or after 3 s unreachable.

## 6. Wide bosses (QA #18)

Bosses wider than a tile path only through cells their body fits. Before, a boss could take a path through a one-tile
gap, stick on the corner for the rest of the fight and be shot from behind a pillar (much of why casters found the
Warden easy).

## 7. Open

* Class spread after the Warden: rogues and necromancers still win most post-Warden attempts while warriors and mages
  lose most. The bosses can't close that gap without class changes, which are Tokelo's call.
* Healing has no cap, so a player carrying ten heals still wins far more often. The rage's heal punish is the only
  pressure on it.
