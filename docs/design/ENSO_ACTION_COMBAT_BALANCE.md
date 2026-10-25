# ENSO Action Combat Balance: targets, numbers and what to measure
**Gauge (Systems & Balance Designer)** · 2026-10-25
**Implements:** [ENSO_SEAMLESS_ACTION_RPG_DIRECTION.md](ENSO_SEAMLESS_ACTION_RPG_DIRECTION.md) ·
**Behaviour:** [ENSO_ACTION_COMBAT_DESIGN.md](ENSO_ACTION_COMBAT_DESIGN.md) (Thorne) · **Contract:** [docs/ACTION_COMBAT.md](../ACTION_COMBAT.md) (Wren)
**Data:** `actionRules`, `realtimeRules` and the per-skill `cooldown` values in `src/data.js`.
**Tools:** `node qa/scripts/rt_balance.js` (Tally's v2 bot, measured) · `node qa/scripts/action_model.js [--level 1|3] [--uptime 0.4]` (paper model, re-derives every table below from data)

This file covers two things:
1. **Combat v2 (the real-time overlay):** retuned, with bot measurements.
2. **Combat v3 (action combat in the world):** Thorne's §7 numbers are now the live `actionRules`, with three changes.
   No headless sim bot can drive `src/action/sim.js` yet, so everything in part 2 is arithmetic. §2.6 lists what a
   sim-driven bot has to confirm.

Turn mode is untouched. Neither `realtimeRules` nor `cooldown` nor `actionRules` is read by a turn-based fight, and the
golden replay (`node qa/scripts/golden.js . --split --world`) is identical before and after:
`943ad668152bffad`, text `297a7b107316a551 / fd8aab54fa6c5e5c`, world `9b0c6a24e7ff4cf9 / d4f339347820d6fe`.

---

## 1. Combat v2: per-skill cooldowns and the pulse

### Target
Every class wins the Crow Warden **75–90%** of the time on Tally's bot, with no shopping, through Chapter One. The
spread between the weakest and the strongest caster or rogue should be **≤ 10 points**. The Warrior is allowed to sit
higher, because he's the starter class (see 1.4).

### Diagnosis (before)
| Class | Warden win % | Why |
|---|---:|---|
| Warrior | 100 | DEF 8 at level 3 (5 base + 2 levels + Wooden Shield). The Warden's Summon Crows (5–8) does 0 to him, and Halberd Sweep does 8–12. A stat issue, not a timing one: the Warrior doesn't move from 100 with Guard at 9 or 12 s or with enemies acting 20% faster. |
| Mage | 60 | Arcane Bolt costs 1 Mana, so the formula gave it a **7 s** cooldown. His basic attack does ~0 through DEF 8. Mana was never the limit (regen 0.67/s against 0.34/s spent). Illusionist 43%, Chronomancer 43%. |
| Rogue | 92 | Evasion costs 0, so its cooldown was **4 s**: a 50% dodge on almost every Warden attack, for free (it isn't on the GCD path that the basic swing uses). |
| Necromancer | 48 | **Soul Energy starved**: +1 per pulse (3 s) for dealing damage, and every skill costs ≥ 1. The fight log shows exactly one skill every 3 s, so Raise Skeleton (2) never comes up. Shortening the cooldowns alone: 58%. Bone Warden 36%, Soulbinder 20% (Soul Chain has nothing to link against a solo boss), Plaguecaller 100%. |

### Changes (old → new)
| Value | Old | New | Why |
|---|---|---|---|
| `realtimeRules.pulseSeconds` | 3 | **2** | The pulse is the only real-time lever on Soul Energy income (+1 per pulse is engine code). The Warrior has no regen, so he's untouched. Mage Mana and Rogue Energy regen speed up too (measured below). `secondsPerTurn` stays 3, so status durations don't change. |
| `Grave Bolt.cooldown` | (formula 7 s) | **4 s** | The Necromancer's main damage. With the faster pulse, Soul Energy pays for one 1-cost skill every 2 s, so GB + SL at 4 s each spend exactly the income. |
| `Soul Leech.cooldown` | (7 s) | **4 s** | Same. |
| `Arcane Bolt.cooldown` | (7 s) | **4 s** | Roughly the basic swing for a mage (3 × 10 / 7 SPD = 4.3 s). Mana still caps spam: 1/4 s + 2/7 s = 0.54 Mana/s against 1.0/s regen. |
| `Mana Burst.cooldown` | (10 s) | **7 s** | Same reason. It's the mage's armour breaker against the Warden. |
| `Evasion.cooldown` | (4 s) | **5 s** | Trims the free 50% dodge from ~75% to ~60% of Warden attacks. Not longer: Evasion's dodges feed the Assassin's Stealth Tokens, and at 7 s the Assassin fell from 71% to 48% (6 s: 60%, 5 s: 71%). |

Not changed: Guard (9 s and 12 s moved the Warrior's numbers by 0 points), the basic swing, enemy timings and the GCD.

### Measured (rt_balance, 200 seeds/class, APM 120, reaction 250 ms, `--probe`)
Chapter One to the Warden, real time:

| Class | Warden win % before → after | Route win % | Warden fight s | HP left on a win | DPS dealt | Nothing ready % |
|---|---|---:|---:|---:|---:|---:|
| Warrior | 100 → **100** | 100 | 34.8 | 126 | 3.26 | 59 |
| Mage | 60 → **83** | 83 | 33.3 → 28.6 | 47 → 54 | 5.62 → 6.81 | 32 → 38 |
| Rogue | 92 → **90** | 90 | 37.3 → 37.0 | 71 → 71 | 5.24 → 5.31 | 46 → 51 |
| Necromancer | 48 → **82** | 82 | 45.4 → 40.6 | 70 → 66 | 3.85 → 5.11 | 58 → 59 |

The spread among mage, rogue and necromancer goes from 44 points to **8**. The text dungeon route in real time is
100 / 95 / 99 / 100 (before: 100 / 75 / 99 / 91). Turn mode is unchanged (89 / 21 / 47 / 15 at the Warden). The
`--probe` run found no bugs: no refusal disagreed with availability.

Per branch, Warden win % before → after (120 seeds each, scratch harness, branch forced):

| Class | Branch 0 | Branch 1 | Branch 2 |
|---|---|---|---|
| Mage | Elementalist 79 → 93 | Illusionist 43 → 78 | Chronomancer 43 → 65 |
| Necromancer | Bone Warden 36 → 75 | Plaguecaller 100 → 100 | Soulbinder 20 → 65 |
| Rogue | Assassin 71 → 71 | Duelist 97 → 95 | Saboteur 99 → 99 |
| Warrior | Vanguard 100 | Berserker 100 | Warden 100 |

The Duelist and the Saboteur don't respond to Evasion, Caltrops (12–15 s) or Riposte (9–12 s) cooldowns. Their
edge is elsewhere, so I left them alone. Tally: please confirm the per-branch numbers with the official bot.

### 1.4 What's left (not a timing problem)
- **The Warrior's 100%** comes from DEF 8 against the Warden's damage ranges. Fixing it means changing enemy damage
  or Warrior DEF, which changes turn mode and the golden replay. That's a separate, owner-approved PR, not this one. (Tokelo, 2026-10-25: v2 stays as it is; action fights got a defence floor instead, 2.4.1.)
- **Chronomancer (65%)**: `haste` ("extra turn") has no real-time meaning yet. That's open question 6 in REALTIME_COMBAT.md, for Thorne.
- **Soulbinder (65%)**: Soul Chain links 2 enemies, and a solo boss gives it nothing to link. It's a design matter, not a number.
- **Plaguecaller (100%)**: 99-stack DoTs (open question 1). They're fine in Chapter One and will be a problem later.

---

## 2. Combat v3: action combat numbers

### 2.1 What changed from Thorne's §7 (Thorne's §7 block is otherwise the live `actionRules` verbatim)
| Value | Thorne | Gauge | Why |
|---|---|---|---|
| `enemies.hungry_wolf.attacks[Snap].windupMs` | 300 | **380** | 7–10 damage is the wolf's whole bite. A 250 ms human reaction plus a 20 ms i-frame start can't answer a 300 ms tell, and 380 matches the rat, our fastest tell. |
| `bosses.crow_touched_warden.attacks.murder_of_crows.windupMs` | 1200 | **1300** | Walking out of r 64 + body r 5 from his feet is 69 px at 72 px/s = 960 ms, plus a 250 ms reaction = 1210 ms. At 1200 the run-out answer fails from the centre. |
| `…murder_of_crows.activeMs` | 200 | **120** | The other answer is dodging through with i-frames. They last 200 ms, and a 200 ms active circle demands frame-perfect timing. At 120 the window has 80 ms of slack. |

### 2.2 Targets (player terms)
| | Target |
|---|---|
| Trash (rat, gnawer, acolyte) | dies in **2–3 hits**, about 1–3 s of real fighting |
| Mid (goblin, constable, wolf, ghoul) | **3–6 hits**, 3–8 s |
| Crow Warden | **60–90 s** for a player who punishes openings. Thorne wrote 75–120 s; I'd accept 60 as the floor for a first boss. |
| No telegraph shorter than | **380 ms** for an attack that deals ≥ 5 after DEF to a caster |
| Stamina | binds in **groups**, never 1-on-1 (direction §4: "no resource restrictions to imitate Souls") |
| Guard | turtling never kills, and phase 2 punishes holding guard |

### 2.3 Time to kill (level 3 = the Warden fight, `node qa/scripts/action_model.js`)
Damage = the engine's rule: roll + floor(stat/4) − DEF, crit-weighted. Cadence = the mean of the combo steps
(startup + active + recovery).

| Class (basic) | ms/hit | Rat (15 HP) | Wolf (40) | Goblin (30) | Constable (28) | Ghoul (40) | **Warden (150, DEF 8)** |
|---|---:|---|---|---|---|---|---|
| Warrior (Slash) | 570 | 2 hits · 1.1 s | 4 · 2.3 s | 3 · 1.7 s | 3 · 1.7 s | 4 · 2.3 s | **29 hits · 16.5 s** |
| Rogue | 383 | 2 · 0.8 s | 5 · 1.9 s | 4 · 1.5 s | 4 · 1.5 s | 5 · 1.9 s | **45 hits · 17.3 s** |
| Mage (staff spark) | 440 | 3 · 1.3 s | 7 · 3.1 s | 5 · 2.2 s | 5 · 2.2 s | 7 · 3.1 s | 114 hits (~1.3 dmg each) |
| Necromancer (bone shard) | 500 | 3 · 1.5 s | 8 · 4.0 s | 5 · 2.5 s | 5 · 2.5 s | 8 · 4.0 s | 160 hits (~0.9 dmg each) |

Warden with skills at their cooldown (resource permitting):

| Class | Basic DPS at 100% | Skill DPS | **TTK at 40% basic uptime** | at 60% |
|---|---:|---:|---:|---:|
| Warrior | 9.3 | 1.3 (Power Strike) | **30 s** | 22 s |
| Mage | 3.0 | 4.3 (Arcane Bolt, Mana Burst) | **27 s** | 25 s |
| Rogue | 8.9 | 1.7 (Backstab, Quick Slash) | **29 s** | 22 s |
| Necromancer | 1.9 | 2.2 (Grave Bolt, Soul Leech; Soul Energy caps it) | **52 s** | ~45 s |

Trash and mid enemies land on target. **The Warden doesn't: 22–30 s against a 60–90 s target.** That's because the
action basic attack cycles every 0.4–0.6 s, against v2's 3–4.5 s swing. Player damage is about 2.5–3× v2's, and the
Warden's 150 HP was sized for turns. Slowing every weapon by 2.5× would kill the "basic attacks are free and quick"
feel, so I didn't.
**Proposal (needs a new key, so it's Wren's call):** `bosses.crow_touched_warden.hpMult: 2.5` in action mode only
(375 HP), so turn mode and v2 keep 150. Expected TTK at 40% uptime: about 75 s for the warrior, mage and rogue, and about
130 s for the necromancer. That last figure is why the necromancer also needs §2.5.

### 2.4 Enemy damage per hit (unguarded / guarded by that class's guard) and per second at the attack cycle
Level 3. Cycle = wind-up + active + recovery + max(cooldown, boss attack gap). Live values: crow `damageMult` 3 / 6 and
the action-only defence floor `actionRules.defence.minDamageShare` **0.35** (2.4.1). Before → after the floor in the
columns that changed; the rest are unchanged.

| Attack (damage) | Cycle ms | Warrior (DEF 8, 140 HP) | Mage (DEF 4, 90) | Rogue (DEF 5, 105) | Necro (DEF 6, 100) |
|---|---:|---|---|---|---|
| Rat Corroding Bite (3–5) | 1760 | **0 → 1.1** / 0 | 0.5 → 1.1 / 0.4 | 0.1 → 1.1 | 0 → 1.1 / 0.1 |
| Wolf Lunge Bite (7–10) | 3530 | 1.8 → 3.2 / 0.2 · 0.9/s | 5.6 / 2.9 · 1.6/s | 4.6 · 1.3/s | 3.6 → 3.8 / 1.7 · 1.1/s |
| Wolf Snap (7–10) | 1660 | 1.8 → 3.2 / 0.2 · 1.9/s | 5.6 / 2.9 · 3.4/s | 4.6 · 2.8/s | 3.6 → 3.8 / 1.7 · 2.3/s |
| Goblin Slash (5–8) | 2230 | **0.2 → 1.9** / 0 · 0.8/s | 2.8 / 1.4 · 1.3/s | 1.8 → 2.3 · 1.0/s | 1.0 → 2.0 / 0.9 · 0.9/s |
| Gnawer Ankle Snap (6–9) | 2000 | 0.5 → 2.4 / 0.1 · 1.2/s | 3.9 / 2.0 · 1.9/s | 2.9 → 3.1 · 1.5/s | 1.9 → 2.5 / 1.1 · 1.3/s |
| Acolyte Hexing Blade (7–11) | 2600 | 1.7 → 2.9 / 0.1 · 1.1/s | 5.5 / 2.9 · 2.1/s | 4.5 · 1.7/s | 3.5 → 3.7 / 1.6 · 1.4/s |
| Constable Truncheon (4–7) | 2500 | **0 → 1.6** / 0 | 1.6 → 1.9 / 0.8 | 0.9 → 1.6 | 0.3 → 1.6 / 0.5 |
| Ghoul Frenzied Bite, 2 hits (9–14) | 3750 | 9.0 → 9.8 / 1.5 · 2.6/s | 16.9 / 9.5 · 4.5/s | 15.0 · 4.0/s | 13.0 / 6.0 · 3.5/s |
| **Warden Halberd Sweep (15–20)** | 2750 | 11.9 / 2.6 · 4.3/s | 15.9 / 9.1 · 5.8/s | 14.9 · 5.4/s | 13.9 / 6.7 · 5.0/s |
| Warden Reaping Thrust (15–20) | 2770 | 11.9 / 2.6 · 4.3/s | 15.9 / 9.1 · 5.7/s | 14.9 · 5.4/s | 13.9 / 6.7 · 5.0/s |
| Warden Chain Lock (10–12) | 2600 | 4.5 → 4.7 / 0.7 | 8.5 / 4.5 | 7.5 | 6.5 / 3.1 |
| Warden Summon Crows (5–8 ×3, unguardable) | 11200 | **1.5 → 7.4** | 9.9 → 10.3 | 6.9 → 8.7 | 4.5 → 8.0 |
| Warden Murder of Crows (5–8 ×6, unguardable) | 17920 | **3.0 → 14.9** | 19.8 → 20.6 | 13.8 → 17.4 | 9.0 → 16.0 |

The guarded column uses each class's guard from `classes[*].guard.damageTaken` (Warrior 0.25, mage 0.6, necro 0.5);
the rogue only parries. The engine applies guard after the floor, so a guarded trash blow can still be 0: holding
guard against a rat stays the Warrior's right answer.

Reading it:
- **Warden hits to kill the player, all unguarded: Warrior 12, Mage 6, Rogue 7, Necro 7.** At one landed hit per
  cycle (2.75 s) that's 16–33 s. A player who avoids half the attacks has 35–65 s, the same order as the 68–75 s TTK
  with `hpMult`. That's tense but fair.
- **Every Chapter One blow now hurts every class: at least 1 per landed hit.** DEF still orders the classes (the
  Warrior takes the least from everything except the rat, where all four take the floor), so his identity holds.
- **The crows land on everyone.** They were 5–8 raw against DEF 4–8, so DEF used to erase most of them before
  `damageMult`; now Murder of Crows is a 15–21 hit for every class and Summon Crows 7–10. That's Thorne's "dangerous".

#### 2.4.1 Defence floor (action fights only)
`actionRules.defence.minDamageShare: 0.35`. A blow that lands on the player in an action fight deals
`max(raw − DEF, raw × 0.35)`, then guard and `damageMult` as before. Turn and v2 fights never read it (golden unchanged).
- **Why a floor and not a DEF multiplier.** A floor only touches blows DEF would mostly erase, so it reaches the
  Warrior against trash and everyone against the crows, and leaves big hits (sweep, thrust, ghoul) alone. A player DEF
  ×0.75 also hurt the Warrior's Warden odds (98 → 90 in the model below), but it cost the mage 10 points and the rogue
  15, so I rejected it.
- **Why 0.35.** The weakest Chapter One blow is the rat's 3. 3 × 0.35 = 1.05, so every landed hit deals ≥ 1. It's
  the smallest round share that does, and it keeps the Warrior's DEF worth something (he takes 1.9 per goblin slash
  against the mage's 2.8). At 0.5 every class takes the same from trash (goblin 3.2 / 3.3 / 3.2 / 3.2), which erases
  DEF as a class trait.
- **Comparable systems.** Elden Ring and Dark Souls 3 give a hit at least about 10% of its attack whatever the defence;
  Path of Exile caps armour at 90% physical reduction. ENSO's numbers are small (3–20 per blow), so 10% floors to 0;
  a third is the ENSO-scale version of "armour never makes you immune".

Crow Warden win estimate (`action_model.js`: 2000 seeded fights per class, the player avoids `--avoid` of the blows,
deals the §2.3 DPS at 40% basic uptime; no guard, potions or respawns, so caster numbers read low: compare rows, don't
quote them):

| Class | avoid 0.6: before → after | **avoid 0.7: before → after** | avoid 0.8: before → after | Median fight s |
|---|---|---|---|---:|
| Warrior | 89 → 76 | **98 → 94** | 100 → 100 | 77 |
| Mage | 7 → 6 | **31 → 30** | 71 → 70 | 59 |
| Rogue | 20 → 15 | **54 → 50** | 86 → 84 | 72 |
| Necromancer | 0 → 0 | **6 → 3** | 41 → 33 | 81 |

The floor takes the Warrior off certain victory (a sloppy Warrior at 0.6 now loses one fight in four) and costs the
casters 1–5 points, all of it from the crows doing their job. The Warrior still leads, as the starter class may (1.4).
The rest of his edge is the sweep (11.9 against the mage's 15.9), which no floor below 0.6 touches.
The necromancer's low numbers are his 129 s TTK (§2.3), not his defence: the skeleton's aggro and Soul Energy are
what §2.6 item 7 must measure.

### 2.5 Stamina budget
Pool 100, regen 40/s after a 600 ms delay (×0.3 while guard is held).

| Class | Dodge cost | Dodges from full | 0 → full | Sustained dodges/s (regen only) | Block cost × | Warden sweeps blocked from full |
|---|---:|---:|---:|---:|---:|---:|
| Warrior | 25 | 4 | 3.1 s | 0.82 | 0.8 (24 per sweep) | 4 |
| Mage (Blink) | 30 | 3 | 3.1 s | 0.74 | 1.5 (45) | 2 |
| Rogue | 18 | 5 | 3.1 s | 0.95 | parry only (Deflect 10) | — |
| Necromancer | 25 | 4 | 3.1 s | 0.82 | 1.2 (36) | 2 |

- **1-on-1 never binds.** The Warden attacks every ~2.75 s, and a dodge per attack uses about 30–35% of what regen
  sustains. Good: a solo fight tests timing, not the bar.
- **Groups bind.** With 2 attack tokens and goblin-speed cycles (2.2 s each), about 0.9 attacks/s come in, which is
  more than the 0.74–0.95 dodges/s regen sustains. Exhaustion arrives after ~10–20 s of pure dodging. That's the
  intended pressure to guard, kill or reposition.
- **Turtling.** A Warrior holding guard against phase 1 regains ~33 stamina per sweep cycle (12/s × 2.75 s) and spends
  24: infinite, at 3 damage taken per sweep and 0 damage dealt. Phase 2's double sweep (48 per cycle) breaks the guard
  within ~4 cycles. That's the right shape. The mage's ward (45 per sweep) is an emergency tool, as Thorne intends.
- **Parry.** 160 ms by default, 200 for the Warrior and the Rogue's Deflect. Dark Souls' parry is about 167 ms, Sekiro's
  deflect about 200 ms. The Warden's 700 ms sweep tell leaves room to read it, then time a 200 ms window.

### 2.6 Verify with a sim-driven bot once `src/action/sim.js` can be driven headless
In priority order. Each item has a scenario and an expected range. The bot should play like rt_balance's "human":
250 ms reaction, a dodge on a telegraph aimed at it with ~70% success, attacks during recovery windows.
1. **Real basic-attack uptime against the Warden**, per class. This is the one assumption the TTK tables rest on
   (0.4). Expected: 0.3–0.6 for melee, 0.5–0.8 for ranged. If melee uptime is above 0.5, TTK falls below 25 s and
   `hpMult` becomes urgent.
2. **Warden TTK and win %**, per class and branch, 200 seeds. Target: 60–90 s, 70–90% wins.
3. **Projectile hit rate** for Arcane Bolt, Grave Bolt and the staff/bone shards against a moving wolf (82 px/s,
   circling) and the Warden (46). If it's below 60% against the wolf, the mage can't kill wolves. Fix it with projectile
   `speed`/`radius`, not damage.
4. **Murder of Crows avoidance** with the new 1300/120: the share of players starting within 20 px of him who escape,
   by walking or dodging. Expected > 85%.
5. **Wolf Snap avoidance** at 380 ms. Expected 50–70% (it's meant to sting).
6. **Stamina exhaustion events** per minute against goblin pairs and rat swarms (2 tokens). Expected 0.5–2 a minute
   for a dodge-only bot, 0 in any 1-on-1.
7. **Necromancer skeleton aggro share**: the fraction of enemy attacks aimed at the skeleton instead of the player.
   Expected 30–50%. Below 20%, the "hard to reach" identity fails.
8. **Guard break timing** in phase 2 for a Warrior who holds guard: expected 3–5 cycles.

---

## 3. Open questions
1. ~~**Warden action-mode HP**~~ **Done:** `hpMult` 2.5 is read on action engage (375 HP, TTK 68–75 s; necro 129 s).
2. ~~**Murder of Crows / Summon Crows damage**~~ **Done:** per-attack `damageMult` (Summon Crows 3, Murder 6), after DEF.
3. ~~**Warrior DEF against Chapter One damage**~~ **Closed (Tokelo: fix it in action combat only).** Action fights
   now have a defence floor, `actionRules.defence.minDamageShare` 0.35 (2.4.1): trash deals ≥ 1 per landed hit to the
   Warrior, and the crows hurt every class. Turn mode and v2 are untouched, golden `943ad668152bffad` unchanged.
   Estimated Warrior Warden win at avoid 0.7: 98 → 94%. Tally: confirm with the sim bot (§2.6 item 2).
4. **Thorne's Q2 (caster basic attack as magic/INT):** the balance impact is small. At level 3 the mage gains +1 per
   spark (INT 12 → +3 against STR 8 → +2), and the necromancer gains 0 (INT 11 and STR 8 both give +2). Against the
   Warden (DEF 8) both still do ~1–2. I have no balance objection. It doesn't fix caster damage against high DEF;
   skill cooldowns do.
5. **`pulseSeconds` 2 against `secondsPerTurn` 3:** resource bookkeeping (and bombs, Soul Feast, Vigil, the round
   counter) now runs every 2 s while a status "turn" lasts 3 s. Nothing reads them as the same clock today. Wren,
   please flag it if something should.

— Gauge, Systems & Balance Designer
