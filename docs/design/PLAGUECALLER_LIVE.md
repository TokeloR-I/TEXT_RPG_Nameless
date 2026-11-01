# Plaguecaller: live rework

**Thorne (mechanics) and Gauge (numbers), from Tokelo's direction, 1 Nov 2026.** Built by Wren alongside
`NECROMANCER_LIVE_KIT.md`. Tokelo: *"this class was turn based and relies heavily on having a crowd … rework this path
based on research online for a plague (poison based) Necromancer."*

## The problem

The old path paid off only when enemies died around you:

- **Corpse Bloom (L8)** needed a corpse.
- **Plague Wind (L11)** only spread Infection that was already on the field.
- **Contagion** spread its stacks on death.
- **Plague Reservoir** paid only on kills.

In a boss fight, or any one-on-one fight, half of the branch did nothing.

## What poison necromancers do in other action RPGs

Damage-over-time necromancer builds are built from four common pieces:

1. **Stack** a damage-over-time effect on one target until the ticks get big. Examples: Last Epoch's poison Lich and Warlock
   ([leveling guide](https://www.gamerevolution.com/guides/971474-last-epoch-best-lich-leveling-build),
   [necrotic DoT discussion](https://forum.lastepoch.com/t/necrotic-damage-over-time-build/41074)).
2. **Curse** the target so it takes more damage over time, like Decrepify or a wither effect in Diablo IV's Blight and Shadowblight
   builds ([Shadowblight guide](https://maxroll.gg/d4/build-guides/shadowblight-necromancer-guide),
   [skills overview](https://www.Gamespot.Com/articles/diablo-4-necromancer-skills-guide-overview/1100-6512706/)).
3. **Cash in** the stacks with one burst, the way Path of Exile pairs Contagion with a detonate
   ([Contagion reveal](https://www.pathofexile.com/forum/view-thread/1468555/filter-account-type/staff)).
4. **Spread** to crowds. This is a bonus on top of the other three, not what the build rests on.

Our branch already had the stacking: in live fights Infection stacks to 99, and each stack makes it tick faster. It was
missing the curse and the cash-in. The rework adds those two (original designs) and moves the crowd-only skills off the path.

## The new path

| Level | Stage | Skill | Change |
|---|---|---|---|
| 3 | Plaguecaller | **Contagion** | Unchanged: 1 Infection stack, which spreads on death. |
| 5 | Pestilent Sage | **Black Spit** | Unchanged: Weaken plus Poison. |
| 8 | Rotbringer | **Plague Burst** *(new, replaces Corpse Bloom)* | Detonates all the Infection on one enemy for **5 damage per stack** at once. It ignores DEF and uses up the stacks. It is refused, at no cost, on an enemy that isn't infected. 2 SE · 8 s. |
| 11 | Harbinger of Decay | **Withering Curse** *(new, replaces Plague Wind)* | The target takes **+50% damage over time** (Infection, Poison, Bleed, Grave Bleed) for 9 s (3 turns in turn mode). 1 SE · 10 s. |
| 14 | Plague Sovereign | **Plague of Ages** | In live fights: **10 Infection stacks** (true damage) on every enemy within 160 px of you. Turn mode keeps its 3-stack cap. Once per fight. |

**Passive changes**

- **Plague Reservoir (L8)** now also pays **+1 Soul Energy for every 6th tick of your Infection**, so it feeds you against a
  single boss. The kill refund stays.
- Virulent Touch (basic attacks add an Infection stack), Pestilent Sage (+1 turn), Harbinger (+2 per tick) and Plague
  Sovereign (DoTs deal true damage) are unchanged. They already work on one target.

**The single-target loop:** Contagion, then basic attacks (each adds a stack), Black Spit, Withering Curse, and then Plague Burst
once the stack count is high. Corpse Bloom and Plague Wind stay in the data so old saves still work, but no stage teaches them now.

## Open

- The numbers are first-pass: 5 per stack, +50%, 10 stacks, and every 6th tick. Gauge should tune them after a run
  against the Warden at level 8 or higher. The current Warden harness runs at level 3, where none of these skills exist yet.
