# Rogue ninja kit (Tokelo, 2026-11-02)

Tokelo asked for the Rogue to be reworked as a ninja for live combat. The point is **survival through evasion**: before
this, the rogue killed the Crow Warden fast but won only 40 to 45% of the time. This is an overhaul, not a patch on the
old kit. Mood references (Megumi from Jujutsu Kaisen for the Assassin, Ghost of Yotei for the Ronin) set the feel only.
Every name, skill and picture here is ENSO's own, and all art is code-drawn.

All numbers are first-pass picks for Gauge to tune in `src/data.js`.

## What was wrong (answers to Tokelo's questions)

- **Marked for Death** cost nothing and dealt nothing. It marked one enemy for +50% on the next hit, and in a live
  fight the mark ended after your next action, so it was a wasted button press. It leaves the kit.
- **Blind** existed (Smoke Bomb): each blinded blow had a hidden 25% chance to miss for 3 s, with nothing on screen.
- **Poison Trap** (Smoke Phantom) was never laid in the world. It sat in a hidden queue and poisoned the next enemy to
  start any attack, anywhere.
- **Caltrops** were neither attacks nor mines: an instant 50% slow in a small circle, no damage.
- **Second Wind** (+2 Energy for −25% evasion) is a turn-based valve with no place in live play.
- **Assassinate** killed anything under 20% HP outright, skipping the last fifth of every boss.
- **Branch resources** replaced Energy at level 3. An Assassin started a fight with 1 Stealth Token, so it could
  barely cast anything.

## One pool

Every rogue path runs on **Energy** (`resourceEvolution: []`). The paths differ in what they do, not in what they spend.

## Base Rogue (the shinobi)

| Skill | Cost | Cooldown | Live effect |
|---|---|---|---|
| Shuriken Volley | 1 | 4 s | 3 shuriken at one enemy within 140 px: 3 × 1–2 (+ Agility), ignores armour |
| Quick Slash | 1 | 3 s | Dash 32 px, 6–9, crits as an opener (kept) |
| Evasion | 2 | 15 s | For 6 s, **every** attack on you has a 50% chance to miss. You see EVADE and don't flinch |
| Shadow Clone | 3 | 20 s | A 30 HP clone for 10 s. It cuts for 2–4 through armour, and enemies go for it when it is the nearer body |
| Smoke Bomb (web, level 2, replaces Second Wind) | 2 | 16 s | Smoke in 48 px: enemies blinded 4 s, 50% of their blows miss. You see MISS |

## Assassin: shadow arts

Shadow creatures and a stronger evasion.

| Level | Stage | Trait | Skill |
|---|---|---|---|
| 3 | Assassin | **Shadow Veil**: Evasion is 65% instead of 50%, and every attack you evade gives +1 Energy | **Shadow Hounds**: 2 hounds for 15 s, 16 HP, 2–4 bites through armour (3 Energy, 22 s) |
| 5 | Shadowblade | **Umbral Edge**: crits +25% damage | **Shadowstep**: teleport behind, next hit crits (2 Energy, 8 s) |
| 8 | Phantom | **Long Shadows**: clone and creatures last 5 s longer | **Shadow Serpent**: 12–16 in 24 px, half armour ignored, held 3 s (3 Energy, 14 s) |
| 11 | Death's Whisper | **Death's Whisper**: crits a further +50% | **Assassinate**: 22–30, doubled under 30% HP, never an instant kill (4 Energy, 20 s) |
| 14 | Sovereign of Shades | **Born of Shadow**: every fight starts with Evasion up | **Shade Legion**: hounds up to the minion limit plus a Shadow Stag (40 HP, 5–8) for 20 s (6 Energy, 45 s) |

## Duelist: the ronin who took up ninjutsu

Attack buffs and fast follow-up cuts, with damage stated as numbers.

| Level | Stage | Trait | Skill |
|---|---|---|---|
| 3 | Ronin | **Follow-Up Cut**: 25% of weapon hits cut again at once for 2–3 (+ Agility) through armour | **Iaido Draw**: 34 px line, 14–20, crits as an opener (2 Energy, 6 s) |
| 5 | Wandering Blade (replaces Swashbuckler) | **Keen Edge**: +10% crit chance | **Blade Focus**: +30% damage, swings and cooldowns 20% faster, for 10 s (2 Energy, 20 s) |
| 8 | Blade Dancer | **Steel Rhythm**: Follow-Up Cut on 40% of hits | **Riposte**: counter the next blow for +50% (1 Energy, 8 s) |
| 11 | Crimson Vortex | **Crimson Edge**: crits cause Bleed (2/s for 6 s, stacks to 3) | **Thousand Cuts**: 6 × 5–7, half armour ignored (4 Energy, 12 s) |
| 14 | Masterless Storm | **Masterless**: +15% damage on everything | **Blade Storm**: 3 sweeps of 10–14 to everyone in 34 px, half armour ignored (5 Energy, 25 s) |

## Saboteur: mad with explosives and chemistry

Bombs that burst where they land, caltrops that are real mines, and poison.

| Level | Stage | Trait | Skill |
|---|---|---|---|
| 3 | Saboteur | **Shrapnel**: explosions cause Bleed (2/s for 6 s, stacks to 3) | **Fire Bomb**: thrown 130 px, bursts on the first enemy or where it lands, 10–14 to everyone in 32 px, half armour ignored (2 Energy, 5 s) |
| 5 | Mad Chemist | **Volatile Mix**: explosions +25% | **Explosive Caltrops**: 3 spiked charges at the aim point. For 20 s each blows up when an enemy steps within 14 px: 8–12 in 28 px plus Bleed (2 Energy, 10 s) |
| 8 | Smoke Phantom | **Toxic Smoke**: Smoke Bomb also poisons (3/s for 6 s) | **Poison Flask**: thrown 120 px, Poison 4/s for 9 s on everyone in 36 px, stacks to 2 (2 Energy, 8 s) |
| 11 | Shadow Engineer | **Chain Reaction**: 5 caltrops instead of 3 | **Thunder Charge**: thrown 120 px, 22–30 in 48 px, stun 3 s (4 Energy, 16 s) |
| 14 | Grand Pyrotechnist | **Alchemist's Blood**: your Poison and Bleed deal +50% | **Cataclysm Barrage**: 3 blasts of 10–14 in 80 px around you, plus Bleed and Poison (6 Energy, 40 s) |

In turn-based and v2 fights, the Explosive Caltrops charges wait as traps that the next enemies to act set off.

## How it is built

- `shadow_summon` (effects.js): timed minions. A minion's `lifetimeSeconds` / `lifetimeTurns` in `minionDefinitions`
  becomes a `Shadow-bound` status. When it runs out, the body melts (`fadeMinion`). Shadows never become followers.
- Evasion is `dodge_chance` with `persistent: true`. The status is not used up by a roll.
- A blow that reaches the player and misses (dodge or blind) returns `evaded` from `actionEnemyStrike`. The sim shows
  EVADE or MISS and the player doesn't flinch.
- A projectile shape with `burstRadius` bursts on its first enemy, at a wall or at its range, and the hit includes
  everyone in that radius.
- `lay_mines`: the sim keeps the charges (`sim.mines`, drawn on the ground) and calls `engine.actionMineBlast(skill, ids)`
  when one goes off. The cost is paid when the charges are laid.
- `self_buff` covers Blade Focus and Focused Pace (`realtimeRules.statuses.buffs`). `execute_bonus` covers Assassinate.
- Old skills (Backstab, Second Wind, Garrote, Marked for Death, Flurry, Caltrops, Poison Trap, Clockwork Bomb) stay
  defined for old saves and the legacy tests. No web node teaches them any more.

## Crow Warden benchmark (level 3, 20 seeds, `qa/scripts/warden_benchmark.js`)

| path | before (react 0.6) | after (react 0.6) | after (react 0.4) |
|---|---|---|---|
| Ronin (duelist) | 40%, 65.9 s | 85%, 46.2 s | 65%, 39.2 s |
| Assassin | 45%, 70.1 s | 75%, 60.7 s | 40%, 49.5 s |
| Saboteur | not benchmarked | 90%, 52.4 s | 50%, 44.1 s |

Win rates are now in the 70 to 90% target. Kill times for the Ronin and the Saboteur are under the 60 to 90 s band,
close to the Plaguecaller's accepted 48 s. More than half the damage is still the rogue's plain weapon. It used to lose
time to flinches, and Evasion and the clone now spare it those. Gauge's levers, if a slower kill is wanted: Follow-Up
Cut chance, Fire Bomb cooldown, or the rogue weapon itself.
