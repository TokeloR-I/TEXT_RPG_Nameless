# Engine review — Tier 1 (core game loop)

The game can now be played start to finish with no cheats. **73 tests passing.**

## ✅ Done
| System | What it does now |
|---|---|
| **Usable items** | `use <item>` in or out of combat (costs your turn in combat). Moldy Bread +8, Wine +12, Bandages +25, Healing Herb Bundle +40. Other items say "nothing to use it for (yet)". The combat menu lists usable items |
| **Catch your breath** | +20% max HP after every victory |
| **Stat scaling** | +1 damage per 4 points of the scaling stat: STR for physical, INT for magic/fire/ice/lightning/radiant, **AGI for Rogue physical**. True damage doesn't scale |
| **Class damage range** | The free Basic Attack uses each class's `baseDamageMin/Max` (was unused) |
| **Per-enemy XP** | `xp` on every enemy: rats 10, most 15–20, Ritual-Scarred Ghoul 30, Warden 200, James Newton 1000. The full run gives ~255 XP before the boss, which is the same pace as the old flat 50 |
| **Win condition** | Beating the Crow-Touched Warden ends the game with an epilogue and run summary (fights, kills, rounds) |
| **Fight-start resources** | Each resource resets at fight start (`resourceRules.startOfFight`): Momentum 1 (Battle-Ready now works), Mana 6, Energy 6, Soul Energy 1, etc. |
| **Missing gain rules filled** | Fury Gauge +1 when you're hit · Oath Points +1 when you Guard · Sin Marks +1 per kill |
| **Minion cap** | 3 minions max, +3 with the Black Pharaoh trait |
| **Balance tool** | `node tools/balance.js` runs a bot through the whole dungeon per class. `--set` tries a change without editing data |

## 🔴 Balance finding — needs your decision
Bot win rates (50 runs each, current numbers):

| Class | Win % | Dies mostly in |
|---|---|---|
| Warrior | 52% | boss |
| Mage | **0%** | 3rd fight (cellar tunnels) |
| Rogue | 10% | boss / tunnels |
| Necromancer | 4% | boss |

**Cause:** armor is flat subtraction and enemies hit for 5–10. Warrior DEF 5 takes 0–5 per hit; Mage DEF 2 takes 3–8. With 70 vs 120 HP, the Warrior ends up roughly 4× tankier. The Mage loses ~27 HP a fight and recovers 14.

**Tested fixes:**
| Change | Mage | Rogue | Necro |
|---|---|---|---|
| Breather heal 20% → 40% | 6% | 20% | 2% |
| **+2 DEF for Mage/Rogue/Necro** | **28%** | **66%** | **62%** |
| Both | 34% | 60% | 60% |

The bot is simple: it never summons, guards or dodges, so a human does better, especially as the necro. Suggested: the +2 DEF option. Say the word and I'll apply it.

## 🟡 New decisions to review
1. Healing values for the four items, and the 20% post-fight heal.
2. Enemy XP values (above).
3. Start-of-fight resource values, and the three invented gain rules (Fury, Oath, Sin Marks).
4. Stat scaling rate (+1 per 4 points) and Rogue using AGI.
5. The epilogue text in `data.js` → `rooms.wardens_roost.onClear`. It's your world, so rewrite freely.

---

# Engine review — batch 3

Effect types used by skills: **63** · implemented: **39** · partial: **3** · missing: **21**
Skills that can't be cast at all: **17 / 76** (was 36 at the start)
Tests: **62 passing**, including two fuzz suites (300 random playthroughs + 200 fights spamming every obtainable skill).

---

## ✅ Done in this batch (21 effect types)

### Rogue — all three branches playable
| Effect | Skill | What it does now |
|---|---|---|
| dodge_chance | Evasion | 50% to dodge the next attack (consumed whether it works or not) |
| guaranteed_crit_next_hit | Shadowstep | Your next hit crits (lasts until used, this fight) |
| silence | Garrote | Silenced enemy can only use the weak Basic Attack on its next turn |
| instant_kill_if_low_hp | Assassinate | Kills a target under 20% HP. Above that it's refused for free |
| counter_attack | Riposte | Next attack on you is answered with your basic attack +50% |
| slow | Caltrops | All enemies −50% speed for 2 turns (changes turn order) |
| blind | Smoke Bomb | Enemies have a 25% chance to miss on their next turn |
| place_trap | Poison Trap | The next enemy to act springs it: 4 poison/turn for 3 turns. Max 3 traps |
| delayed_aoe | Clockwork Bomb | No damage on cast. Explodes at the start of your next turn, hitting all enemies |

### Mage — all three branches mostly playable
| Effect | Skill | What it does now |
|---|---|---|
| slow_chance | Ice Lance | 30% chance to slow the target 50% |
| chain_lightning | Lightning Arc | Hits the target, then arcs to 2 more enemies |
| avoid_next_hit | Mirror Image | The next attack on you always misses |
| skip_turn_chance | Confuse | 50% chance the enemy loses its next turn |
| skip_turn_aoe | Multi-target Illusions | Up to 3 enemies skip their next turn |
| extra_turn | Haste | You act again immediately |
| revert_hp | Revert HP | Your HP goes back to what it was 2 turns ago |
| freeze_enemies | Freeze Time | No enemy acts next turn |

### Necromancer / Plaguecaller — the whole branch except its ascended overdrive
| Effect | Skill | What it does now |
|---|---|---|
| infect | Contagion | 1 infection stack. Spreads 1 stack to every other enemy when the target dies |
| apply_infection_aoe | Corpse Bloom | +1 infection stack to everything hit |
| aoe_damage_from_corpse | Corpse Bloom | Needs a corpse and consumes it. 15 damage to all enemies |
| spread_all_infections | Plague Wind | Every enemy gets the worst infection on the field |

### Traits now active
Virulent Touch (basic attacks infect) · Plague Reservoir (+1 Soul Energy on killing an infected enemy) ·
All infections +2 dmg (Harbinger) · Traps +50% dmg (Smoke Phantom) · DoTs last +1 turn also applies to infections

### Engine infrastructure added
- **`requires` hook**: skills can refuse to cast (no corpse, too healthy, traps full) without wasting cost or turn
- **Turn snapshots**: blind/silence are read at turn start, so 1-turn debuffs actually land
- **Extra turns**, **traps**, **delayed bombs**, **HP history**
- **Resource rules as data** (`resourceRules` in data.js), so branch resources can refill:
  Stealth Tokens (+1 on dodge or kill), Combo Points (+1 per basic attack), Deception Tokens (+1 on dodge), Time Charges (+1 per round), Vigil (+1 per round a marked enemy took damage)

---

## 🟡 Decisions I made — please review
1. **`attack` is always free.** It's your class's first skill if that costs nothing (Slash, Void Rend). Otherwise it's the universal Basic Attack (5–8). *Why:* Rogue's attack was Backstab (costs 2), so Duelists could never earn their first Combo Point, and a necro with 0 Soul Energy couldn't attack at all.
2. **Infection numbers** (not in the design): 2 dmg per stack, max 3 stacks, 3 turns.
3. **Trap trigger:** no positions exist, so "the next enemy to act" springs the trap.
4. **Silence on enemies** means they're forced to use the weak Basic Attack.
5. **Assassinate above 20% HP** is refused for free rather than failing and wasting the cost.
6. **Riposte** counters with your basic attack (all enemy attacks count as "melee").
7. **Trap Charges** (Saboteur) has no gain rule in the design. It keeps the Rogue's Energy regen (3/round) for now.
8. **Time Charges** "store 3" cap is not enforced, since Freeze Time costs 5 and would be uncastable.

## 🔲 Still missing (21 at batch 3; 20 now, live list: `npm run backlog`) — next batch candidates
| Effect | Skill | Note |
|---|---|---|
| taunt_aoe | Shield Charge, Lockstep | Warden/Vanguard. Easy |
| ~~absorb_hit~~ | Bone Wall | ✅ Done: PR #17 (Rook), follow-ups QA-11–14 |
| create_zone | Fortress | Needs a light "zone" system |
| link_targets | Soul Chain | Soulbinder L3 — whole Soulbinder branch needs these three |
| drain_hp_from_linked | Soul Feast | |
| control_enemy | Possession | |
| teleport_to_enemy | Shadowstep | No positions exist. Probably flavor-only (Shadowstep already works without it) |
| overchannel | Overchannel | Mage safety valve — needs a design call (HP-for-mana rules) |
| steal_skill | Steal Skill | Illusionist L8 |
| rearrange_turn_order | Eternal Architect | Chronomancer ascended |
| true_damage_attacks, heal_on_attack_percent | Oblivion Reign | Abyssal King ascended |
| bonus_damage_vs_flag_percent | Dragon's Dominion | Wyrm's End ascended. Easy |
| immobilize_enemies | Total Lockdown | Needs zones |
| resurrect_all_minions | March of Endless Bones | Black Pharaoh ascended. Easy |
| apply_max_infection_aoe, infections_true_damage | Plague of Ages | Plague Sovereign ascended. Easy now |
| control_all_enemies | Death's Dominion | Needs control_enemy |
| erase_enemies | Oblivion's Call | Hollow King overdrive |
| enhance_all_elements | Worldflame | Needs elemental status effects first (burn etc.) |
| remove_enemy_skill_on_hit_permanent | Arcane Hollow | Illusionist ascended |

## 🟠 Partial (3)
- **stun**: Shield Bash's condition is now checked (QA-2, approved): stun only with ≥ 3 Oath Points, not spent, and one unstunned target turn between Shield Bash stuns.
- **summon**: per-summon damage overrides are ignored (the templates already match the numbers).
- **apply_status**: cooldowns (Channel the Grave) and War Cry's enemy accuracy buff are stored but do nothing.

## Not effect types, but also not built yet
Most **traits** that aren't listed above (e.g. Blood Frenzy, Kill Rush, crit-damage traits, Divine Ward),
**stage upgrades** (e.g. "Skeletons now deal 6–9") and elemental Burn from Pyromancer.
(Bone Wall now exists: an absorbed hit never reaches Bone Armor, so the two don't interact.)
