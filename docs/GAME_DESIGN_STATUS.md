# Enso's Last Stand — Game & Engine Status

*Snapshot: 22 October 2026. For the game designer: how the game currently plays, how every rule works,
and what's still missing or undecided. Every number here is taken from the current code and data.*

---

## 1. The game in one paragraph

A turn-based dungeon crawler. You wake in a cellar with glowing hands and no memory, pick one of four
classes, and fight east through six rooms of a crow-haunted dungeon to the **Crow-Touched Warden**.
Beating him ends the game. The game's identity is **class evolution**: at level 3 every class picks one of
three branches, and each branch evolves through five named stages (levels 3, 5, 8, 11, 14), gaining a
skill and a trait at each one. Some stages are locked behind story events, and secret classes (the
Hollow King) sit outside the trees.

**Current state:** text-based, playable start to finish in a browser. The rules engine is separate from
the screen, so a side-scrolling (Darkest Dungeon-style) version can reuse it unchanged.

---

## 2. How a session plays

1. Choose a class: `warrior`, `mage`, `rogue` or `necromancer`.
2. Explore with `n / s / e / w` (or `go east`), `look`, `take <item>`, `use <item>`, `i` (inventory).
3. Rooms show their enemies. `engage` starts a fight. Enemies don't attack until you engage.
4. Fights are turn-based (section 5). Win → XP, a small heal, and the room stays cleared.
5. At level 3 you're asked to choose a branch. You can't do anything else until you choose.
6. Beat the Warden → epilogue and run summary. Die → game over. `start` restarts everything.

**Combat commands:** `attack 2` · `<skill name or alias> <target number>` (e.g. `grave bolt 1`, `gb 1`) ·
`use bandages` · `flee` (always succeeds, keeps the room's enemies).
**Dev cheats (for testing):** `add_xp <n>` · `become_hollow_king` · `unlock_events` (unlocks story-gated stages).

---

## 3. The world

### Map
```
                [Hallway of Chains]
                        |
                    (north)
                        |
 [Starting Room] --(east)-- [Collapsed Wine Cellar] -- [Cellar Tunnels] -- [Stagnant Chamber] -- [Ritual Chamber] -- [Warden's Roost]
  James Newton*                                                                                                       BOSS · no exits
```
*James Newton is a deliberate test dummy (666 HP, 66 DEF), not part of the real path.*

The Warden's Roost has no exits: entering it commits you to the final fight.
Cleared rooms stay cleared. There is no save system.

### Rooms
| Room | Enemies | Items |
|---|---|---|
| Starting Room | James Newton (test dummy) | Grigamba stone |
| Hallway of Chains | Shackled Ghoul ×2, Rust Rat | Cracked Lantern, Rusted Key, **Moldy Bread** |
| Collapsed Wine Cellar | Cellar Vermin ×2, Drunken Shade | **Half-full Wine Bottle**, **Bandages**, Shard of Glass |
| Cellar Tunnels | Bone Gnawer ×2, Shackled Ghoul | Pouch of Salt, Leather Strap, Small Coin Purse |
| Stagnant Chamber | Mire Lurker ×2, Drunken Shade | Oil-soaked Rag, Wooden Shield, Strange Coin |
| Ritual Chamber | Cult Acolyte ×2, Ritual-Scarred Ghoul | Ritual Dagger, **Healing Herb Bundle**, Crow Feather Charm |
| Warden's Roost | The Crow-Touched Warden | — |

### Enemies
| Enemy | HP | DEF | SPD | XP | Crit | Attack(s) | Flags |
|---|---|---|---|---|---|---|---|
| Rust Rat | 15 | 2 | 16 | 10 | 10% ×1.5 | Corroding Bite 3–5 | |
| Shackled Ghoul | 20 | 1 | 14 | 15 | 15% ×1.6 | Frenzied Bite 6–10 | undead, weak_to_light |
| Cellar Vermin | 25 | 1 | 13 | 15 | 10% ×1.5 | Quick Swipe 5–8 | |
| Drunken Shade | 30 | 4 | 7 | 15 | 5% ×1.5 | Disorienting Whisper 1–3 | undead |
| Bone Gnawer | 18 | 3 | 15 | 15 | 10% ×1.5 | Ankle Snap 6–9 | undead |
| Mire Lurker | 35 | 2 | 6 | 20 | 5% ×1.5 | Corrosive Spit 4–7 | |
| Cult Acolyte | 22 | 1 | 9 | 20 | 10% ×1.6 | Hexing Blade 7–11 | |
| Ritual-Scarred Ghoul | 40 | 3 | 12 | 30 | 15% ×1.6 | Frenzied Bite 9–14 | undead |
| **Crow-Touched Warden** | 150 | 8 | 10 | 200 | 20% ×1.7 | Halberd Sweep 15–20 · Summon Crows 5–8 · Chain Lock 10–12 | boss |
| James Newton *(test)* | 666 | 66 | 20 | 1000 | 60% ×1.5 | Heavy Slash 20–30 | |

Unused in the dungeon: Weak Goblin, Hungry Wolf. Each enemy's `atk` stat exists in the data but **does nothing**;
damage comes only from the attack's range. Flags like `weak_to_light` are also not used yet.

### Items
| Item | Use |
|---|---|
| Moldy Bread | Heal 8 |
| Half-full Wine Bottle | Heal 12 |
| Bandages | Heal 25 |
| Healing Herb Bundle | Heal 40 |
| Everything else (keys, coins, charms, starting gear…) | No effect yet: "nothing to use it for (yet)" |

The whole dungeon contains 85 HP of healing items.

---

## 4. The player

### Classes
| | Warrior | Mage | Rogue | Necromancer |
|---|---|---|---|---|
| HP | 120 | 70 | 85 | 80 |
| DEF | 5 | 2 | 3 | 4 |
| SPD (= AGI) | 7 | 7 | 10 | 6 |
| STR / INT / AGI | 10 / 5 / 7 | 6 / 10 / 7 | 8 / 6 / 10 | 6 / 9 / 6 |
| Crit | 5% ×1.5 | 10% ×1.75 | 20% ×2.0 | 5% ×1.5 |
| Basic Attack dmg | 8–12 (Slash) | 6–10 | 5–9 | 6–10 |
| Resource (start of fight / max) | Momentum 1/10 | Mana 6/20, +2/round | Energy 6/15, +3/round | Soul Energy 1/10 |
| Starting skills | Slash, Guard, Power Strike | Arcane Bolt, Focus, Mana Burst | Backstab, Evasion, Quick Slash | Grave Bolt, Raise Skeleton, Soul Leech |

### Leveling
- XP comes from defeated enemies (table above). The full dungeon gives ~255 XP before the boss: **level 3** right before it.
- XP needed: 100 → 150 → 225 → 337 → 505 … (×1.5 each level).
- **Each level:** +1 STR/INT/AGI/SPD/DEF, +10 max HP, +1% crit (max 50%), +2 resource max. HP and resource fully refill.

### Evolution
- **Level 3:** choose a branch (3 per class, 12 total). The game pauses until you choose.
- **Levels 3/5/8/11/14:** become the next stage: new skill + new trait, sometimes a new resource.
- **Story-gated stages** don't unlock by level alone: **Dark Knight** (needs "betrayal event") and
  **Dragon Slayer** (needs "slaying a named dragon boss"). Progress stops there until the event happens.
  **None of these events exist yet** (only the `unlock_events` cheat).
- **Knight** references a prestige quest (Tourney of Crowns) that doesn't exist. Its prestige skill, Mounted Charge, is unobtainable.
- **Secret classes:** The Hollow King (cheat-only for now), Deathlord Eternal and Reality Breaker (data only).

| Class | Branches |
|---|---|
| Warrior | Vanguard (defender → Dark Knight), Berserker (frenzy → dragon hunter), Warden (marks & control) |
| Mage | Elementalist (fire/ice/lightning), Illusionist (deception & disabling), Chronomancer (time & turns) |
| Rogue | Assassin (stealth & crits), Duelist (combos & counters), Saboteur (traps & gadgets) |
| Necromancer | Bone Warden (tanky minions), Plaguecaller (infections), Soulbinder (linking & possession) |

---

## 5. Combat rules

### Rounds and turns
- Everyone alive is sorted by **speed** (highest first) at the start of each round. Speed can be lowered by **Slow** and **[Pin]**.
- Each combatant takes one turn per round. **You act once per round**, except with Haste.
- Summoned minions join the order **next round**.
- At the end of each round: resource regen and resource rules (section 6) apply.

### Your turn
- **Attack** is always free. It uses your class's first skill if that costs nothing (Warrior: Slash),
  otherwise a universal **Basic Attack** with your class damage range. (This stops resource-starved builds getting stuck.)
- **Skills** cost resource. Single-target skills need a target number if there's more than one enemy.
- Skills that can't work right now are **refused without using your turn**: not enough resource,
  no corpse for Corpse Bloom, target too healthy to Assassinate, traps full, minion cap reached, not implemented yet.
- **Use item** costs your turn.

### Damage, step by step
1. Roll the skill's damage range.
2. **+ stat bonus** (player only): +1 per 4 points of STR (physical), INT (magic/fire/ice/lightning/radiant) or AGI (Rogue physical). True damage doesn't scale.
3. **Crit?** Roll vs crit chance (some effects force a crit). Crit multiplies the damage.
4. **− Armor:** flat subtraction of the target's DEF (some skills ignore all or part of it). True damage skips this.
5. **× Damage reduction** (Guard etc.), **× Bone Armor** (Bone Warden: −2% per minion, max 10%/15%).
6. **× Marks:** Expose +20% taken, Weaken −20% dealt, Marked for Death +50% (then consumed), Synergy Marks trait +10% vs marked targets.
7. Round down, minimum 0.

**Design note:** step 4 is the biggest balance lever in the game. Enemies hit for 3–15, so 2–3 points of DEF decide whether a class survives (section 9).

### Status effects
*Updated after the status-engine batch. Full details: `STATUS_ENGINE_REPORT.md`.*

One shared pipeline for players, enemies and summons. **Durations are round-based:** a status loses 1 at the end of each
round in which its holder had a turn after it was applied, so "N turns" means N effective turns regardless of speed.
One instance per status per target: stackable statuses gain intensity up to a cap (only Infection: 2 dmg/stack, cap 3,
3 turns), and re-applying always refreshes the duration. DoTs deal damage at the start of the holder's turn and ignore armor.
Control Resistance, overflow bursts, affinities, cleansing and reactions are built, but switched off until their values are approved.

### Other mechanics
- **Dodge** (Evasion 50%, Mirror Image 100%): the next attack against you rolls to miss. Consumed either way.
- **Riposte:** the next attack on you is countered with your basic attack +50%.
- **Traps:** up to 3. The next enemy to act springs one (no positions exist, so "next to act" stands in for "walks into it").
- **Delayed bombs:** Clockwork Bomb deals no damage on cast and explodes on all enemies at the start of your next turn.
- **Corpses:** every enemy kill leaves one. Grave Bolt gets +2 dmg per corpse, and Corpse Bloom consumes one.
- **Minions:** max 3 (+3 with Black Pharaoh). They attack the first living enemy. **Enemies never target minions** unless a minion is taunting.
- **Once-per-fight** skills (overdrives) can't be repeated in the same fight.

### Enemy behaviour (very simple right now)
- Picks a **random** one of its attacks each turn.
- Always attacks **you**, unless a minion is taunting.
- **Silenced:** can only use a weak Basic Attack (5–8). **Blinded:** chance to miss.
- No healing, buffing, status use, target choice or boss phases.

### End of fight
- **Victory:** XP (sum of enemies' XP) · **+20% max HP heal** ("catch your breath") · statuses cleared · room cleared.
- **Defeat:** game over (The Hollow King's Crown of the Undying revives him at 30% HP and −10% max HP).
- **Flee:** always works, no penalty, enemies stay.

---

## 6. Resources

Every resource **resets at the start of each fight**. Base class resources keep their regen. Branch
resources follow these rules (numbers marked * were invented to fill gaps in the design):

| Resource | Who | Start of fight | How you gain more |
|---|---|---|---|
| Momentum | Warrior | 1 | War Cry +1 |
| Mana | Mage, Elementalist | 6 | +2 per round · Focus +2 |
| Energy | Rogue | 6 | +3 per round · Second Wind +2 |
| Soul Energy | Necromancer | 1 | +2 on your kill · +1 on minion kill · +1 per round you dealt damage · Channel the Grave +1 |
| Oath Points | Vanguard | 1* | +1 when you Guard* |
| Sin Marks | Dark Knight | 0* | +1 per kill* |
| Fury Gauge | Berserker | 0* | +1 when you get hit* · Lunge +2 |
| Vigil | Warden | 1* | +1 per round in which an enemy you marked took damage |
| Stealth Tokens | Assassin | 1* | +1 on dodge · +1 on kill |
| Combo Points | Duelist | 0* | +1 per basic attack |
| Trap Charges | Saboteur | 3* | Keeps Rogue's +3/round* (no rule in the design) |
| Deception Tokens | Illusionist | 1* | +1 on dodge |
| Time Charges | Chronomancer | 1* | +1 per round ("store 3" cap not enforced, Freeze Time costs 5) |
| Hollow Will | Hollow King | 0 | Void Rend +3 (+10 on crit) |

---

## 7. Skill status by class

✅ = every effect works · 🟡 = works, part of it missing · ❌ = can't be cast yet.
Note that ✅ means the *effects* work. A few skill-text conditions aren't enforced (listed after the tables).

#### Warrior

| Where | Skill | Cost | What it does | Status |
|---|---|---|---|---|
| Base | Slash | 0 Momentum | Deal 8–12 damage to a single enemy. | ✅ works |
| Base | Guard | 0 Momentum | Reduce incoming damage by 25% next turn. | ✅ works |
| Base | Power Strike | 2 Momentum | Spend 2 Momentum to deal 14–20 damage. | ✅ works |
| Vanguard L3 | Shield Bash | 0 Momentum | Deal 10–14 damage, stun 1 turn if Momentum ≥ 3. | ✅ works |
| Vanguard L5 | Shield Charge | 1 Oath Points | Rush an ally, taunt enemies around them. Deals 8–12 dmg. | 🟡 partly (taunt_aoe missing) |
| Vanguard L8 | Holy Smite | all Oath Points | Spend all Oath Points to deal 15–25 radiant dmg (+5 vs Undead/Void). | ✅ works |
| Vanguard L11 | Soul Rend | all Sin Marks | Consume all Sin Marks to deal 25–35 AOE dmg (ignores armor). | ✅ works |
| Vanguard L14 (Ascended) | Oblivion Reign | all Sin Marks | Next 3 turns, all attacks are true dmg & heal you. | ❌ not implemented (true_damage_attacks, heal_on_attack_percent) |
| Berserker L3 | Hemorrhage | 1 Fury Gauge | Deal 10–16 damage + bleed (3 dmg/turn for 3 turns). | ✅ works |
| Berserker L5 | Whirlwind | 2 Fury Gauge | Deal 8–12 AOE damage to all enemies. | ✅ works |
| Berserker L8 | Lunge | 1 Fury Gauge | Leap to target, deal 15–22 damage, gain 2 Fury. | ✅ works |
| Berserker L11 | Sever Spine | 0 Fury Gauge | Once per boss fight, deal 30–40 true damage. | ✅ works |
| Berserker L14 (Ascended) | Dragon’s Dominion | all Fury Gauge | Triple dmg vs bosses for 1 turn. | ❌ not implemented (bonus_damage_vs_flag_percent) |
| Warden L3 | Pincushion | 0 Vigil | Apply [Pin] Mark, reducing target speed by 50%. | ✅ works |
| Warden L5 | Lockstep | 1 Vigil | Taunt enemies in your zone for 1 turn. | ❌ not implemented (taunt_aoe) |
| Warden L8 | Expose Weakness | 1 Vigil | Apply [Expose] Mark, increasing dmg taken by 20% for 2 turns. | ✅ works |
| Warden L11 | Fortress | 2 Vigil | Create a zone lasting 3 turns, allies take -20% dmg inside. | ❌ not implemented (create_zone) |
| Warden L14 (Ascended) | Total Lockdown | all Vigil | Enemies can’t move or leave zones for 2 turns. | ❌ not implemented (immobilize_enemies) |

#### Mage

| Where | Skill | Cost | What it does | Status |
|---|---|---|---|---|
| Base | Arcane Bolt | 1 Mana | 10–14 dmg. | ✅ works |
| Base | Focus | 0 Mana | Gain +2 Mana. | ✅ works |
| Base | Mana Burst | 2 Mana | 15–20 dmg, ignores 25% armor. | ✅ works |
| Elementalist L3 | Fireball | 1 Mana | Deal fire damage. | ✅ works |
| Elementalist L5 | Fireball | 1 Mana | Deal fire damage. | ✅ works |
| Elementalist L8 | Lightning Arc | 1 Mana | Deal lightning damage, may chain. | ✅ works |
| Elementalist L11 | Fireball | 1 Mana | Deal fire damage. | ✅ works |
| Elementalist L14 (Ascended) | Worldflame | all Mana | All elements gain +1 extra effect (burn harder, longer stuns, deeper slows). | ❌ not implemented (enhance_all_elements) |
| Illusionist L3 | mirrorImage | 1 Deception Tokens | Avoid next hit. | ✅ works |
| Illusionist L5 | confuse | 2 Deception Tokens | 50% chance enemy skips turn. | ✅ works |
| Illusionist L8 | stealSkill | 3 Deception Tokens | Steal enemy’s last used skill for 2 turns. | ❌ not implemented (steal_skill) |
| Illusionist L11 | multiTargetIllusions | 4 Deception Tokens | Up to 3 enemies skip turn. | ✅ works |
| Illusionist L14 (Ascended) | Arcane Hollow | all Deception Tokens | Permanently remove 1 skill from enemy on hit; needed for Reality Breaker Legendary. | ❌ not implemented (remove_enemy_skill_on_hit_permanent) |
| Chronomancer L3 | haste | 2 Time Charges | Ally takes extra turn. | ✅ works |
| Chronomancer L5 | slow | 2 Time Charges | Enemy loses next turn. | ✅ works |
| Chronomancer L8 | revertHp | 3 Time Charges | Revert ally to HP they had 2 turns ago. | ✅ works |
| Chronomancer L11 | freezeTime | 5 Time Charges | Enemies can’t act for 1 turn. | ✅ works |
| Chronomancer L14 (Ascended) | rearrangeTurnOrder | all Time Charges | Rearrange entire turn order for 3 turns. | ❌ not implemented (rearrange_turn_order) |

#### Rogue

| Where | Skill | Cost | What it does | Status |
|---|---|---|---|---|
| Base | Backstab | 2 Energy | 10–14 dmg, +5 dmg if target is [Flanked]. | ✅ works |
| Base | Evasion | 0 Energy | 50% chance to dodge next attack. | ✅ works |
| Base | Quick Slash | 1 Energy | 6–9 dmg, always crits if used first in turn. | ✅ works |
| Assassin L3 | Shadowstep | 1 Stealth Tokens | Teleport to enemy, next hit crits. | 🟡 partly (teleport_to_enemy missing) |
| Assassin L5 | Garrote | 2 Stealth Tokens | 12–16 dmg + silence 1 turn. | ✅ works |
| Assassin L8 | Marked for Death | 0 Stealth Tokens | Mark enemy; next attack from you or ally deals +50% dmg. | ✅ works |
| Assassin L11 | Assassinate | 3 Stealth Tokens | If target <20% HP, kill instantly. | ✅ works |
| Assassin L14 (Ascended) | Assassinate | 3 Stealth Tokens | If target <20% HP, kill instantly. | ✅ works |
| Duelist L3 | Riposte | 1 Combo Points | Counter next melee attack for +50% dmg. | ✅ works |
| Duelist L5 | Flurry | 3 Combo Points | 3x 6–8 dmg strikes. | ✅ works |
| Duelist L8 | Flurry | 3 Combo Points | 3x 6–8 dmg strikes. | ✅ works |
| Duelist L11 | Blade Storm | 5 Combo Points | Hit all enemies twice. | ✅ works |
| Duelist L14 (Ascended) | Blade Storm | 5 Combo Points | Hit all enemies twice. | ✅ works |
| Saboteur L3 | Caltrops | 1 Trap Charges | Slow enemies (-50% speed, 2 turns). | ✅ works |
| Saboteur L5 | Smoke Bomb | 2 Trap Charges | Blind all enemies (-25% hit chance, 1 turn). | ✅ works |
| Saboteur L8 | Poison Trap | 1 Trap Charges | 4 dmg/turn DoT, 3 turns. | ✅ works |
| Saboteur L11 | Clockwork Bomb | 3 Trap Charges | 20–28 dmg AOE, delayed 1 turn. | ✅ works |
| Saboteur L14 (Ascended) | Clockwork Bomb | 3 Trap Charges | 20–28 dmg AOE, delayed 1 turn. | ✅ works |

#### Necromancer

| Where | Skill | Cost | What it does | Status |
|---|---|---|---|---|
| Base | Grave Bolt | 1 Soul Energy | 10–14 dmg, +2 dmg per corpse on the battlefield. | ✅ works |
| Base | Raise Skeleton | 2 Soul Energy | Summon skeleton (5–7 dmg/turn). | ✅ works |
| Base | Soul Leech | 1 Soul Energy | Deal 8 dmg, heal for half dmg dealt. | ✅ works |
| Bone Warden L3 | Bone Wall | 1 Soul Energy | Absorbs the next hit entirely. | ❌ not implemented (absorb_hit) |
| Bone Warden L5 | Shield of the Dead | 2 Soul Energy | All minions taunt for 2 turns. | ✅ works |
| Bone Warden L8 | Raise Ghoul | 3 Soul Energy | Summon ghoul (9–12 dmg/turn, applies [Weaken]). | ✅ works |
| Bone Warden L11 | Reaper’s Charge | 3 Soul Energy | 20–28 dmg + stun 1 turn. | ✅ works |
| Bone Warden L14 (Ascended) | March of Endless Bones | all Soul Energy | Instantly resurrect all fallen minions and summon 1 free ghoul. | 🟡 partly (resurrect_all_minions missing) |
| Plaguecaller L3 | Contagion | 1 Soul Energy | Infect target; spreads on death. | ✅ works |
| Plaguecaller L5 | Black Spit | 1 Soul Energy | Apply [Weaken] (-20% dmg) + 5 dmg/turn for 3 turns. | ✅ works |
| Plaguecaller L8 | Corpse Bloom | 2 Soul Energy | Explode a corpse for 15 dmg AOE + 1 Infection stack to all in range. | ✅ works |
| Plaguecaller L11 | Plague Wind | 3 Soul Energy | Spread all infections instantly to every enemy. | ✅ works |
| Plaguecaller L14 (Ascended) | Plague of Ages | all Soul Energy | All enemies instantly gain max Infection stacks; infections deal true dmg. | ❌ not implemented (apply_max_infection_aoe, infections_true_damage) |
| Soulbinder L3 | Soul Chain | 1 Soul Energy | Link 2 targets; dmg to one hits both. | ❌ not implemented (link_targets) |
| Soulbinder L5 | Soul Chain | 1 Soul Energy | Link 2 targets; dmg to one hits both. | ❌ not implemented (link_targets) |
| Soulbinder L8 | Possession | 3 Soul Energy | Control an enemy for 1 turn. | ❌ not implemented (control_enemy) |
| Soulbinder L11 | Soul Feast | 2 Soul Energy | Drain 2 HP/turn from all linked enemies for 3 turns. | ❌ not implemented (drain_hp_from_linked) |
| Soulbinder L14 (Ascended) | Unmake | 5 Hollow Will | Remove a target from the fight permanently. | ✅ works |

#### The Hollow King (secret)

| Skill | Cost | What it does | Status |
|---|---|---|---|
| Void Rend | 0 Hollow Will | A basic strike that generates 3 Hollow Will (or 10 on a critical hit). | ✅ works |
| Unmake | 5 Hollow Will | Remove a target from the fight permanently. | ✅ works |
| Echo of Nothing | 3 Hollow Will | Skip the enemy’s next 2 turns. | ✅ works |
| Oblivion’s Call | all Hollow Will | Erase the entire enemy team for 1 turn; they cannot act or be targeted. | ❌ not implemented (erase_enemies) |

**Skill text not enforced even where marked ✅:**
Backstab's +5 vs [Flanked] (no flanking exists) · Sever Spine "once per boss fight" (no limit) ·
Quick Slash "crits if used first in turn" (you act once per round, so it always crits) ·
Hunter's Instinct makes Expose Weakness permanently free (same reason) ·
Elementalist "Elemental Resonance" (+50% for same element twice) · Pyromancer Burn upgrade ·
Ossified Champion "Skeletons deal 6–9" and other stage **upgrades** · Shield Discipline (Guard 35%).

### Traits that actually work
Battle-Ready · Hunter's Instinct · Synergy Marks · Bone Armor + Bone Fortress · Pestilent Sage (DoTs +1 turn) ·
Virulent Touch · Plague Reservoir · Harbinger (+2 infection dmg) · Smoke Phantom (traps +50%) ·
Black Pharaoh (+3 minions) · Hollow King: Crown of the Undying, Soul Erasure (no corpses).
**All other traits are description only.**

---

## 8. What's missing

### Core systems (Tier 2)
- **Equipment:** starting gear and found items (Wooden Shield, Ritual Dagger…) give no stats. No equip slots.
- **Damage types and weaknesses:** skills have types (fire, radiant…) but nothing resists or is weak to them. `weak_to_light` is unused.
- **Enemy AI:** random attacks, always at the player, no tactics, no boss phases.
- **Cooldowns:** no system (Channel the Grave's cooldown is ignored).
- **Keys and locked doors:** Rusted Key / old key / lockpicks exist, nothing is locked.
- **Loot and gold:** enemies drop nothing. Coin purses do nothing.

### Bigger design pieces (Tier 3)
- **Story events** that unlock gated stages: betrayal, named dragon boss, Throne of Bones, Tourney of Crowns.
- **Secret/legendary class unlocks** done for real (Hollow King's unlock conditions are written but not built).
- **Battlefield positions / ranks.** Zones, flanking, taunting, teleporting, Lockstep, Fortress and Total Lockdown
  all assume positions that don't exist. **The planned side-scroller needs these anyway**, so this is the most important decision.
- **Most traits and stage upgrades** (section 7).
- **Save/load.**
- **More content:** one 7-room dungeon, 10 real enemy types, 1 boss.

### 21 skill effect types still to build
Taunts (Shield Charge, Lockstep) · Fortress zones · Total Lockdown · Bone Wall · Soulbinder's whole kit
(Soul Chain, Soul Feast, Possession) · Overchannel · Steal Skill · Shadowstep's teleport ·
and most ascended overdrives (Oblivion Reign, Dragon's Dominion, March of Endless Bones, Plague of Ages,
Death's Dominion, Oblivion's Call, Worldflame, Arcane Hollow, Eternal Architect).

---

## 9. Balance snapshot

A bot plays the real dungeon (no cheats): it uses its biggest affordable damage skill on the weakest enemy
and heals below 45% HP. It never summons, guards or dodges, so humans will do better.

| Class | Win rate (50 runs) | Usually dies |
|---|---|---|
| Warrior | 52% | at the boss |
| Mage | **0%** | 3rd fight |
| Rogue | 10% | boss / 3rd fight |
| Necromancer | 4% | at the boss |

**Why:** flat armor. Enemies hit for 5–10, so Warrior DEF 5 takes 0–5 per hit while Mage DEF 2 takes 3–8.
With 70 vs 120 HP, the Warrior is roughly 4× tankier. The Mage loses ~27 HP per fight and recovers 14.

| Tested change | Mage | Rogue | Necro |
|---|---|---|---|
| Post-fight heal 20% → 40% | 6% | 20% | 2% |
| **+2 DEF for Mage, Rogue, Necro** | **28%** | **66%** | **62%** |
| Both | 34% | 60% | 60% |

Not applied yet. That's a design decision.

---

## 10. Open design questions

1. **Armor model:** keep flat DEF and bump squishy classes, or move to percentage armor?
2. **Battlefield ranks** (Darkest Dungeon-style 4 slots per side): yes/no? This shapes the side-scroller.
3. **Missing gain rules** for Oath Points, Sin Marks, Fury Gauge and Trap Charges (placeholders in section 6).
4. **Infection numbers:** 2 dmg/stack, max 3 stacks, 3 turns.
5. **Overchannel** (Mage): how should "spend HP to cast beyond Mana" and "Burnout" work exactly?
6. **"Once per turn" traits** (Hunter's Instinct, Quick Slash) are effectively "always" because you act once per round. Should they be "once per fight"?
7. **Enemy targeting:** should enemies attack minions?
8. **Healing economy:** 85 HP of items in the whole dungeon plus 20% after each fight. Rest points? Potions from loot?
9. **Story events:** what are the betrayal, dragon and Throne of Bones events, and where do they happen?
10. **What items like Pouch of Salt, Crow Feather Charm and Strange Coin should do.**
11. **Enemy `atk` stat:** remove it, or make it scale enemy damage?
12. **Epilogue text:** currently placeholder.

**Data oddities spotted while writing this:**
- The Soulbinder's ascended stage (Eternal Lich) grants **Unmake**, which costs **Hollow Will**, a Hollow King resource the Necromancer doesn't have. It currently charges Soul Energy instead.
- Soulbinder L5 (Chain of Woe) grants **Soul Chain** again rather than a new skill. Intended as an upgrade?
- **Mounted Charge** is defined but no stage grants it (the prestige quest doesn't exist).
- Weak Goblin and Hungry Wolf are defined but never placed in a room.

---

## 11. How the engine is built (short version)

- **All content is data.** Rooms, enemies, items, skills, classes, evolution trees, resource rules and balance
  knobs live in one file (`src/data.js`). Changing a number there changes the game; no code needed.
- **Every skill effect is a small, separate rule** (`src/effects.js`). Adding a mechanic means adding one rule and a test.
- **The engine has no screen.** It takes a command and returns what happened. The text version and a future
  side-scroller are just two different screens on the same engine.
- **Seeded randomness:** any run can be replayed exactly, which is useful for reproducing bugs.
- **73 automated tests**, including random stress tests and full-dungeon bot runs.

**Tools the team can use** (Node.js needed for these, not for playing):
| Command | What it does |
|---|---|
| `node tools/balance.js` | Bot win rates per class. Add `--set gameRules.postFightHealPct=0.35` to try a change without editing anything |
| `node tools/missing-effects.js` | The current list of unbuilt skill effects |
| `node tools/play-cli.js --seed 42` | Play in a terminal with a repeatable seed |
| `node tests/run-tests.js` | Run all tests |

**Balance knobs** (bottom of `src/data.js`): `gameRules` (stat scaling, post-fight heal, minion cap), `resourceRules`, `itemDefinitions`, enemy stats and XP.
