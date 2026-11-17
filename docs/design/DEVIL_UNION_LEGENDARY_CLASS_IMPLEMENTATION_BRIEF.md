# ENSO's Last Stand — Devil Union Legendary Class

**Date:** 17 November 2026  
**Creative Director:** Tokelo Ramasodi  
**Status:** **PROTOTYPE IMPLEMENTATION AUTHORIZED** — build now; iterate and rebalance later.  
**Scope:** Legendary skill web, nine demon contracts/unions, two Qliphoth resonance slots and playable mechanics.  
**Related story:** docs/design/JAMES_DEMONKORE_DEVIL_UNION_NARRATIVE_DESIGN.md

> **Director direction:** “Let them build anyway; will rework later.” Unsettled details below have **candidate defaults** so implementation can proceed. These values and the two weaker union concepts are **not canon-locked**. Do not postpone all development waiting for future redesign.

## 1. Player fantasy and foundational rules

Devil Union is an **additive legendary class** unlocked by the first successful contract with a defeated Underworld arena ruler. Its progress belongs in the existing legendary skill-web system; it **never permanently replaces** the base class, the player's existing class-web nodes, appearance or Qliphoth story powers.

- **Nine demon contracts**, one obtainable after each Dominion's five-wave arena and boss. **One** contract unlocks Devil Union. The other eight are optional progression, not mandatory main-story content.
- **One equipped/active contracted demon** at a time for the first prototype; switch selection **out of combat**. Union activation in combat grants a time-limited demon form and abilities.
- **All nine forms remain viable** as alternative playstyles; do not use the ninth as a straight numerical upgrade that invalidates the first.
- **Two Qliphoth Resonance slots** are available to the Devil Union class. The player equips **up to two already-acquired Qliphoth aspects**. These give modest stat bonuses **while Devil Union is active**, not additional demon forms; ordinary story aspect abilities remain intact.
- James/Demonkore's paid/free access path and restrained dialogue belong to the separate narrative brief. This file handles the combat class. Do not replace that story with an early class-information dump.

### Temporary prototype defaults (Thorne/Gauge may revise)

| Rule | Candidate behavior |
|---|---|
| Transform input | A visible Devil Union action, only when a contract is equipped |
| Union length | 20 seconds |
| Activation cooldown | 60 seconds, starting when activation occurs |
| Skill bar | Temporarily expose the equipped demon's signature actions; restore normal six-slot setup on exit |
| Death | Ordinary death ends union unless Zareth has another surviving body |
| Contract selection | Outside combat, free; save-persistent |
| Resonance selection | Outside combat, saved independently of contract |
| Balance | Target a stronger-than-normal legendary burst window, bounded by duration and cooldown; Gauge measures |

The team may replace a separate activation resource with cooldown-only for the first playable prototype if engine compatibility requires it. Do not invent permanent new stats without specifying their calculation and persistence.

## 2. Qliphoth Resonance — two selectable mini-buffs

**Approved concept:** Already obtained Qliphoth aspects provide extra stat boosts to Devil Union; **maximum two active slots**. Bonuses are not full unions. The **Nahemoth** aspect exists today; further aspect bonuses should be mapped as those aspects arrive, without requiring all ten to be implemented now.

**Candidate implementation:**

- UI shows two slots and a list of story-unlocked aspects; empty slots are valid.
- Cannot equip the same aspect twice.
- Apply equipped bonuses only during an active union; remove them immediately when it ends.
- **Nahemoth proposed example:** +5% movement speed during union (to be checked against its existing exploration identity; no alteration to Black Flight).
- Subsequent aspect examples (not tied to canon identities): +5% outgoing damage, +5% effective defence, +5% fire resistance.
- One source of truth for buffs; no permanent stacking after transformations or save/load.
- Resistances must use a real implemented damage type; if a type is not present, select a currently supported defensive stat for the prototype and document the substitution.

## 3. Nine demons — identities and minimum viable kits

The director selected the **power identities** of Lucifero (gravity), Beelzebub (space), Slotos (toughness), Plumede (agility), Varkhiel (kinetic absorption), Nerezza (echo attacks), and Zareth (multiple playable bodies). **Malachar and Morvath are still redesignable**, but the director authorizes building candidate prototypes now. Names Slotos/Plumede are working inspiration names and may need original ENSO naming before release.

The following are **concrete candidate effects**, not final balance values. All skills require a legal target/range and visible cooldown feedback. Use the engine's existing units (tiles, world distance, stat percentages) consistently.

### U1 — Lucifero: Gravity

- **Gravity Well** — targeted ground circle, radius 3 tiles, range 6 tiles; pulls normal enemies toward its centre over 2 seconds; 15-second cooldown. Bosses cannot be displaced unless their existing flags allow it.
- **Heavy Field** — radius 3 around caster for 5 seconds; enemies inside have movement speed reduced by 25%; 18-second cooldown. Effects don't stack with themselves.
- **Gravity Crush** — targeted radius-2 burst dealing 150% of the player's eligible baseline skill damage; 12-second cooldown. Define damage scaling via existing engine, not a second unbounded multiplier.

### U2 — Beelzebub: Space

- **Spatial Step** — teleport player to a valid walkable point within 5 tiles; 8-second cooldown; cannot cross unvisited zone boundaries or blocked quest gates.
- **Rift Exchange** — targeted normal enemy within 5 tiles swaps positions with player if both destinations are legal; boss-immune fallback: skill fails without moving anyone; 15-second cooldown.
- **Spatial Cut** — instant line attack, length 5 tiles, width 1; 140% eligible baseline skill damage; 12-second cooldown. Cannot damage through invalid map collision unless explicitly allowed by current engine rules.

### U3 — Slotos: Toughness

- **Iron Hide** — reduce incoming direct damage by 25% for 5 seconds; 18-second cooldown, with mitigation order defined by the existing engine.
- **Brace** — gain a temporary shield equal to 20% maximum HP for 6 seconds; 20-second cooldown; shield never persists after union.
- **Stampede** — melee-range area hit, radius 2, at 120% baseline skill damage; 10-second cooldown. This gives a limited offense without turning Slotos into another DPS form.

### U4 — Plumede: Agility

- **Fleet Form** — +25% movement speed for 5 seconds; 15-second cooldown; use movement speed, not an unimplemented global attack-speed stat.
- **Blink Feint** — short 3-tile dash to legal ground, followed by one 100% baseline hit against a chosen enemy within melee range; 10-second cooldown; no invulnerable crossing of collision.
- **Quick Flurry** — three attacks at 45% baseline each against one legal target; 12-second cooldown; attack events must not recursively generate more flurries.

### U5 — Varkhiel: Kinetic Demon

- **Impact Reservoir (passive)** — record **20% of actual physical damage received after mitigation** as kinetic charges, capped at 30% of player's maximum HP; the player still takes that damage. Only genuine enemy hits count, not self-inflicted damage or shields that absorbed the hit.
- **Kinetic Discharge** — consume all stored charges to deal area damage to enemies within radius 3; candidate conversion 1 damage for each 1 charge spent, plus a small baseline so an empty reservoir is not a free nuke; 12-second cooldown.
- **Kinetic Ram** — single target melee strike, 120% baseline damage; if any charges are stored, spend up to 10% of their cap to add an equal amount of damage. Cannot generate its own incoming-damage charges.

### U6 — Malachar: Rupture (provisional, rebuild later if needed)

- **Fracture Strike** — attack one target within melee range for 70% baseline damage; add one Fracture stack, up to 3; each stack expires after 6 seconds.
- **Rupture** — target within 5 tiles; consume all their Fracture stacks; deal 50% baseline damage per stack in radius 2; 12-second cooldown. Damage from detonation never applies another Fracture.
- **Shatterwave** — cone/short forward area attack, 100% baseline damage; 15-second cooldown. This is placeholder design: no assumed permanent armour-reduction system.

### U7 — Nerezza: Echoes / Madara-inspired overwhelming copies

**Identity:** Short-lived *echoes of player actions*, not independent fully controllable bodies. This distinguishes it from Zareth.

- **Echo Strike (passive while unioned)** — the next eligible **direct basic attack** creates a spectral delayed echo after 1 second that repeats **40% of the original final direct damage** on the original legal target, if still valid. Internal cooldown 3 seconds.
- **Phantom Assault** — create **two visual echo manifestations** for 6 seconds; each repeats the next **three eligible basic attacks** at 25% of recorded direct damage. Cooldown 20 seconds. These are replay effects with no independent AI or HP.
- **Unseen Legion** — for 5 seconds, echo damage from eligible basic attacks uses 60% instead of 40%, with a hard cap of one echo per attack per source; 30-second cooldown.
- **Safety:** echoes cannot echo echoes, proc new resource gains, create summons, reapply their originating on-hit skills, or recursively trigger effects.

### U8 — Zareth: Multiplicity / distributed player existence

**Director's key mechanic:** Copies have the **same combat kit as the player**. There is **no privileged main body**. When the directly controlled body dies, **control transfers to another surviving body**; player death only occurs once **all bodies are destroyed**.

**Candidate implementation of the director's 50%-HP instruction:**

- On activation create **three bodies total**: the original position plus two additional manifestations.
- **Every body, including the controlled one, starts with 50% of the player's maximum HP** (e.g., 1,000 base max HP → **500 HP each**). This is **1,500 combined HP**, intentionally more than the original 1,000, not a literal conserved 1,000-HP split. Gauge will assess power level later.
- All bodies share equipment snapshot, player statistics and **available combat abilities**. AI clones may use the same attack/skill repertoire, but never initiate another Zareth transformation, recruit, interact with story objects, modify inventory, or trigger duplicate quest/loot rewards.
- Exactly **one** body receives direct player input at any moment; the other surviving bodies are AI-controlled. Optional manual body swap is a **proposed follow-up**; automatic transfer on death is **mandatory**.
- On controlled body death, immediately route input and camera to a surviving body (choose nearest by world distance, then stable entity ID). Preserve that body's **existing HP**; no full heal, new clone or reset of active cooldowns. Destroyed bodies never respawn during the same union.
- If an AI body dies, simply remove it; no transfer unless it was the controlled body. When no body survives, use normal player-death handling.
- On union expiry, collapse surviving copies into the currently controlled body at its current position, with that body's **remaining HP percentage** carried back to the normal character (no free health restoration). Clear clones and AI safely; avoid leaving duplicate player entities in saves.
- All body damage and target selection must be supported by existing enemy combat targeting; do not assume NPCs always target the original. Show an unmistakable controlled-body marker.
- **Prototype safeguard:** AI clones use a shared per-skill cooldown budget with the controlled body, rather than three independent full-speed skill rotations, until Gauge validates damage output. Their basic attacks can occur independently. This is a tunable safeguard, **not** a reduction in the director's “same attacks and abilities” identity.

**Essential tests:** kill controlled body first, then second, then last; kill AI copies first; 0-HP transfer within a single simulation tick; simultaneous multi-body lethal hits; union ending during transfer; safe zones; saving/loading mid-union; no duplicated items/XP/quest progress; no infinite recursion from clone-triggered effects; summon cap and performance.

### U9 — Morvath: Damage Convergence (provisional replacement)

The former projectile-consumption idea is **rejected for current content** because too few enemies attack with projectiles.

- **Bloodlink** — select two different enemies within 6 tiles; for 6 seconds each **direct damage** event dealt to one transfers 25% of that final damage to the other; 18-second cooldown. Transfer damage cannot trigger another transfer, on-hit proc or a new link.
- **Convergence** — consumes active link to deal a 120% baseline burst to **each** surviving linked enemy; 12-second cooldown. No link → action unavailable, not free damage.
- **Sunder Link** — 100% baseline hit on one linked enemy; the linked target receives its normal 25% share; 10-second cooldown. This is a provisional kit, to be revised after playtesting.

## 4. Rank and progression proposal

| Rank | Prototype gate | Reward |
|---|---|---|
| **I — Bound** | Defeat arena ruler and make first contract | Devil Union heart, basic union abilities, optional two Qliphoth resonance slots |
| **II — Awakened** | Invest in that demon's first web cluster | Additional active/passive choices |
| **III — Dominant** | Invest further in the equipped union branch | Improved manifestation and kit |
| **IV — Perfect Union** | Complete that demon's high-rank path | Advanced capstone; exact effect per demon to design |

**Each union progresses independently**, using the existing web nodes and point budget. Acquiring new contracts grants access to new demon branches, not automatic mastery of all nine. No mandatory nine-ruler gate for one favorite demon to reach high proficiency. Use the existing six-slot bar and legendary-web save/rank semantics wherever possible; don't rewrite the entire class system.

## 5. Build sequence — proceed now

1. **Core foundation:** contract registry, equipped union, transformation lifetime/cooldown, save/load, two Qliphoth resonance slots, UI with clear active states.
2. **Four selected powers:** Lucifero, Beelzebub, Slotos, Plumede. Test real combat/map interactions; handle movement and boss immunities explicitly.
3. **Varkhiel and Nerezza:** kinetic charges and bounded echo replay.
4. **Zareth:** isolated vertical slice and extensive QA for controllable-body transfer and health distribution. This is the highest technical risk. Do not fake it as invulnerable original + cosmetic clones.
5. **Malachar/Morvath prototypes:** implement playable defaults and record improvement ideas; no need to block all other work on these two.
6. **Progression/balance:** web nodes/ranks, consistent union VFX, arena rewards and nine optional contracts; Gauge/Tally validate before declaring production-complete.

**Ownership:** Thorne/Wren — architecture and gameplay; Gauge — actual numeric tuning; Tally — automated combat/edge-case QA; Pixie — UI and controls; Morrigan — distinct transformation visuals; Wick/Ashby — lore/dialogue, no premature James reveal.

## 6. Non-negotiables versus changeable prototype details

**Keep:** Nine optional contracts; first contract unlocks class; one active demon; two equipped Qliphoth stat boosters; original class preserved; Zareth's 50%-HP per body concept and automatic soul/control transfer until last body dies; Nerezza echoes vs Zareth real bodies; Varkhiel stores received kinetic force; no mandatory nine-demon grind.

**Rework freely after first playable:** Numeric values, cooldowns, ranges, transformations, placeholder skills for Malachar/Morvath, exact number of Zareth bodies if Gauge determines it cannot be three, additional higher-rank skills, and demonic names borrowed as *Black Clover* reference labels. Any change to Zareth's core shared-existence rule or the two-slot cap requires director approval.

**Repository source references:** docs/design/SKILL_WEB.md; docs/design/JAMES_DEMONKORE_DEVIL_UNION_NARRATIVE_DESIGN.md; docs/design/ENSO_NAHEMOTH_CROW_ASPECT_AND_BLACK_FLIGHT.md; docs/design/ENSO_LORE_BIBLE.md.
