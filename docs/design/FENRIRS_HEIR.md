# Fenrir's Heir

**Owner:** Thorne (mechanics), Gauge (numbers), Ashby and Wick (words). **Requested by:** Tokelo, 2026-11-13
(creative handoff: [FENRIRS_HEIR_LEGENDARY_CLASS_DESIGN.md](FENRIRS_HEIR_LEGENDARY_CLASS_DESIGN.md), PR #256).
**Status:** built: the web, the stances and bond, the skills, the unlock quest, its talks and its trial fight. **Not yet
placed:** Gullstrand Coast and the Wolf's Wake have no maps. They wait on Tokelo's design pictures (no area is built
without one), so the quest can't be found in play yet. The dev cheat `awaken_fenrir [skoll|hati|fenrir]` opens it.

Data: `skillWeb.legendaryWebs.fenrirs_heir` and the skills in `skillDefinitions` (`src/data.js`); rules:
`src/engine/stance.js`; quest `CL1` and its talks: `src/story/chapter2.js`; tests: `tests/100-fenrirs-heir.test.js`.

## Director's answers (Tokelo, 2026-11-13)

| Open question in the handoff | Answer |
|---|---|
| 1. A neutral Fenrir stance? | **Yes.** No wolf is active: no bond grows or fades, only Fenrir's shared skills work. It is a third choice at the unlock. |
| 2. Does bond persist between fights? | **Yes, for now** (the handoff's directive). It is saved with the character. |
| 3. Do stances change the skill bar? | Thorne: **no.** The six-slot bar stays as you set it; a skill of the other wolf greys out (`WRONG_STANCE`) until you switch. |
| 4. Allfather's Chosen? | **Fenrir's Heir replaces it.** Allfather's Chosen and the Raven's Wager are shelved in [CHAPTER_TWO_LORE.md](CHAPTER_TWO_LORE.md). |

## Stances and bond (Gauge)

| | Fenrir (neutral) | Sköll, the Sun Chaser | Hati, the Moon Chaser |
|---|---|---|---|
| Skills you can use | Fenrir's only | Sköll's + Fenrir's | Hati's + Fenrir's |
| Bond | none; both wolves' bonds hold | grows | grows |
| Bond reward (25 / 50 / 75 / 100) | none | +5 / 10 / 15 / 20% damage | +3 / 6 / 9 / 12% walking speed and 3 / 6 / 9 / 12% less damage taken |

- **Switching:** `T` in the world (or click the stance cell beside quick heal), `stance <name>` in text,
  `switch_stance { stance }` as an action. Free out of a fight. In a fight it never uses your turn, then waits
  **8 s** (live) or **3 turns** (turn fights) before the next change. The cooldown ends with the fight.
- **Bond** is 0 to 100 per wolf. Fighting in a wolf's stance adds **25 per 15 s** (full after 60 s). While one wolf
  grows, the other **fades 0.5 a second**, so loyalty pays and both can't sit at 100. The Fenrir stance holds both.
  Bond only moves in a fight, never resets when one ends, and is saved (`player.stance`).
- "Speed" is walking speed only (not attack speed). "Defence" is a share of damage taken, applied where meals apply.
- Numbers: `stances` on the web in `src/data.js` (`switchCooldownSeconds`, `switchCooldownTurns`, `bond`, `tiers`).

## The web (Thorne)

The heart is free when the wolves wake and carries **Fenrir's Blood** (+30% damage, 30% less damage taken). Three
gifts are owned free with it: Solar Fang, Black Maw and Call of the Pack. Every skill is paid from your own class
resource (`resource: 'any'`).

```
                          ♥ Fenrir's Heir (free, the waking)
          ┌──────────────────────┼──────────────────────┐
   SKÖLL (sun)              FENRIR (shared)           HATI (moon)
   ◆ Solar Fang (gift)      ◆ Call of the Pack (gift)  ◆ Black Maw (gift)
   ◆ Firehowl L4            ○ Predator's Instinct L5   ◆ Darkhowl L4
   ◆ Sunfang Rush L6        ◆ Gleipnir's Bane L8       ◆ Moonless Grasp L6
   ◆ Firestorm L9 ────────  ◆ Twin Eclipse L12 ─────── ◆ Night's Dominion L9
   ○ Ember Blood L11                                   ○ Moonhide L11
   ◆ Devour the Sun L14                                ◆ Devour the Moon L14
          └───────────── ○ Fenrir Unbound L18 (needs both Devours) ─┘
```

Ranks: **Heir of the Wolf** (the heart), **Sun-and-Moon Hunter** (8 nodes, +1 free point), **Fenrir Unbound** (the node).

### Sköll (stance: Sköll)

| Skill | Level | Cost / cd | Live |
|---|---|---|---|
| Solar Fang ◆ gift | 1 | 0 / 3 s | a wolf's head of sunfire: 20–26 fire to one |
| Firehowl ◆ | 4 | 1 / 20 s | +25% damage for 9 s |
| Sunfang Rush ◆ | 6 | 2 / 10 s | dash 48 px, then 14–20 fire to everything in front |
| Firestorm ◆ | 9 | 3 / 14 s | sunfire where you aim (44 px): 8–12 fire each, Burn 3 a pulse for 6 s |
| Ember Blood ○ | 11 | | +10% damage |
| Devour the Sun ◆ | 14 | all / once per fight | 36–46 fire to one, doubled under 30% HP, Burn for 9 s |

### Hati (stance: Hati)

| Skill | Level | Cost / cd | Live |
|---|---|---|---|
| Black Maw ◆ gift | 1 | 0 / 8 s | 64 px: 9–13 shadow each, slowed 50% for 6 s, **dragged 22 px toward you** |
| Darkhowl ◆ | 4 | 1 / 18 s | 96 px: enemies miss 30% of attacks for 6 s |
| Moonless Grasp ◆ | 6 | 2 / 12 s | 10–14 shadow to one, stunned 3 s (Control Resistance applies to bosses) |
| Night's Dominion ◆ | 9 | 3 / 16 s | 80 px: 10–14 shadow each, you heal 30% of it |
| Moonhide ○ | 11 | | 10% less damage taken |
| Devour the Moon ◆ | 14 | all / once per fight | 120 px: dragged 48 px in, 22–30 true damage each, stunned 3 s |

Bosses are never dragged (they hold still, as the design asks).

### Fenrir (every stance)

| Skill | Level | Cost / cd | Live |
|---|---|---|---|
| Call of the Pack ◆ gift | 1 | 0 / 24 s | two spectral wolves for 15 s (20 HP, 3–5 a bite) |
| Predator's Instinct ○ | 5 | | bond grows 50% faster |
| Gleipnir's Bane ◆ | 8 | 1 / 18 s | shed every stun, slow and debuff; absorb the next hit (12 s) |
| Twin Eclipse ◆ | 12 | 3 / 20 s | 100 px: 14–20 to every enemy, each Exposed (+15% taken) for 6 s |
| Fenrir Unbound ○ | 18 | | +15% damage, 10% less damage taken (needs both Devours) |

Left out of the handoff's candidate pool on purpose: a second **Fireball** (the Elementalist's own; Solar Fang is the
wolf version), and a summon that follows you out of a fight (Call of the Pack fades with the fight, like the ninja's
hounds; an exploration wolf is a follow-up).

### Measured (Gauge, `node qa/scripts/legendary_power.js --fenrir`, 3 seeds)

Same harness as the Fallen Seraphim: a ×60 HP Crow Warden for 60 s, player kept alive; power is a share of the
average of the six level 14 peaks. Tokelo's target for a legendary at unlock is 60–70%.

| Level 5 build + Fenrir's Heir at unlock | Sköll, bond 0 | Sköll, bond 100 | Hati, bond 0 | Hati, bond 100 |
|---|---|---|---|---|
| Warrior Vanguard | 69% | 73% | 63% | 70% |
| Rogue Assassin | 58% | 61% | 53% | 55% |
| Necromancer Bone Warden | 85% | 89% | 72% | 72% |

Without a legend the same builds sit at 46–69%. Sköll reaches the target; Hati is a little under it for the rogue,
because the bench bot never uses Hati's speed and holds range. Gauge's next pass: measure Hati in a moving fight
before touching its numbers.

## Unlock: The Hunt of Sun and Moon (quest CL1)

Optional, any class, any Chapter Two choice. Flags follow the handoff.

| Step | Where | What happens | Data |
|---|---|---|---|
| 1. The First Howl | Gullstrand cliffs | Read the wolf-carving: the verse, and the quest starts | inspect `gullstrand_wolf_carving`, flag `fenrir_quest_discovered` |
| 2. Two Hunts | a sun-scorched cairn, a moon-dark hollow | Take the **Sun Fang** and the **Moon Fang**, either order | talks `sun_marker`, `moon_hollow`; flags `fenrir_sun_fang`, `fenrir_moon_fang`, `fenrir_fangs_both` |
| 3. The Broken Binding | the Wolf's Wake | Lay both fangs in the stone; **the Binding Echo** wakes. Losing only resets it | talk `wolfs_wake_stone`; flag `fenrir_trial_called`; encounter `wolfs_wake_trial` |
| 4. The Choice of the Hunt | the Wolf's Wake | Sköll, Hati, or "Neither yet" (Fenrir): the web opens with that stance | flags `fenrir_trial_cleared`, `fenrir_heir_awakened`; effects `legend`, `stance` |
| 5. The First Bond | the same talk | The wolves explain the bond and the switch; the quest's end names the T key | flag `fenrir_first_bond_tutorial_done` |

**The Binding Echo** (`binding_echo`): the broken binding, not Fenrir. 420 HP (turn stats), boss. Chain Lash (arc),
**Sunbrand** (three burning circles, 1 s to step out), **Moonless Drag** (a dark chain that roots and pulls 28 px) and
**Gleipnir Recoils** (a 56 px whip, 1.1 s tell). Every tell is 0.6 s or longer. Code-drawn art in
`assets/sprites/enso-enemies.js`.

### Placing it (when Tokelo's pictures arrive)

Content marked `awaitsArea: 'gullstrand_coast'` (quest CL1 and the three talks) is skipped by the map-placement checks
until then; `tests/100-fenrirs-heir.test.js` lists exactly what waits. To place it: build the maps from Tokelo's
pictures, put the inspectable `gullstrand_wolf_carving`, the two talks and `wolfs_wake_stone` on them, add the
`wolfs_wake_trial` encounter (`enemies: ['binding_echo']`, `when: { flags: ['fenrir_trial_called'], notFlags: ['fenrir_trial_cleared'] }`),
add objective markers, and remove `awaitsArea`.

## Open for later

- A drawn look for the stances on the character (an ember or a shadow wolf at your heels) is Saffron's and Quill's call.
- Exploration wolf (a Call of the Pack that follows you out of a fight).
- Hati's balance in a moving fight (above).
