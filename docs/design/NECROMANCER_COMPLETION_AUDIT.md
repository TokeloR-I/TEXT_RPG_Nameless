# ENSO — Necromancer Completion Design Package

**Vaelis — Lead Game Designer & Narrative Designer** · 22 Oct 2026  
**Status:** Verified source audit and proposed design handoffs; NOT gameplay implementation authorization.  
**Inputs:** `src/data.js`, `src/effects.js`, `src/engine.js`, `src/statuses.js`, `docs/GAME_DESIGN_STATUS.md`, `docs/REVIEW.md`, approved status design, QA-8A decision.  
**Evidence level:** source/registry inspection on main, not a new runtime test. ✅ registry/engine behavior found; ◐ partial or unverifiable rider; ❌ effect registry entry absent. Prior status reports can be stale.

## 1 — Core class identity

**Base Necromancer:** pays Soul Energy to deal direct magic damage, drain life, exploit corpses, and develop autonomous allies. Resource currently starts at **1**; no passive regen listed. On player kill +2, minion kill +1, and **+1 at round end only if the player dealt damage that round**. `Channel the Grave` is the +1 Energy / 2 true damage safety valve, but its one-turn cooldown is represented by a status without a working enforcement hook.

**Bone Warden:** defense through living undead assets and minion-directed pressure; Bone Armor, focus targeting, minion toughness, taunting, and resurrection. A defensive cast (especially Bone Wall) consumes one of the Necromancer's damaging actions and can forfeit the end-round +1 income, causing an effective resource disadvantage. No rate change approved.

**Plaguecaller:** accumulates Infection, spreads it through death and effects, and enhances DoTs over successive turns. Existing Infection invariant **2 damage/stack, maximum 3 stacks, 3-round duration** must be preserved absent separate approval.

**Soulbinder:** establishes links, manipulates targets and drains linked life; currently lacks the three effect primitives defining the branch. Build dependency order: link topology -> damage sharing -> linked drain -> control -> ascension. No positional geometry (approved D2).

## 2 — Implementation matrix: base + branch abilities

| Ability or element | Source-based status | Intended contract and outstanding gap |
|---|---|---|
| Grave Bolt | ✅ `bonus_damage_per_corpse` | 10–14 magic, +2 per recorded battlefield corpse; validate corpse count after bloom/kill |
| Raise Skeleton | ◐ `summon` exists | Template summon joins next round, cap enforced. Per-skill 5–7 damage override is explicitly partial; **Wren owns summon damage override**, do not overlap |
| Soul Leech | ✅ `heal_from_damage` | Existing 8 base magic damage, heal floor(positive dealt damage ×0.5); no heal on zero damage |
| Channel the Grave | ◐ status bookkeeping only | +1 Soul Energy, −2 true HP, advertised one-turn cooldown not enforced; decide cooldown semantics before coding |
| Soul Energy income | ✅ conditional round-end and death hooks | 1 start; +2 own kill/+1 minion kill/+1 if player personally dealt damage in round; defensive/summon turns can lose the per-round gain |
| Bone Wall | ✅ existing `absorb_hit` per game status | Costs 1; intercepts next eligible hit. QA reports riders on absorbed attack do not land; existing implementation, not reassign |
| Shield of the Dead | ✅ `minion_taunt` | 2 Soul Energy; applies 2-turn taunt to live minions; verify actual enemy targeting weight and no-minion case |
| Raise Ghoul | ◐ `summon` works, damage override partial | 9–12 advertised damage, Weaken on hit; verify that status application and upgrade scaling occur (don't alter Wren-owned override) |
| Reaper’s Charge | ✅ `stun` registered | 20–28 physical + 1-turn Stun; CR numeric config remains pending; test immunity and failed hits |
| March of Endless Bones | ◐ resurrection ❌ / ghoul summon ✅ | Once/fight, all Soul Energy; resurrect fallen minions + free ghoul. Resurrection semantics missing (Decision N-1) |
| Contagion | ✅ `infect` | One stack, 3-round duration, spreads on flagged host death |
| Black Spit | ✅ mark + poison | Weaken 20% and poison 5 per tick ×3 rounds; reapplication with alternate poison value remains separate pending status question |
| Corpse Bloom | ✅ corpse consumption + AOE infect | Consumes recorded corpse, 15 AOE base, +1 Infection to affected enemies; verify target eligibility and corpse order |
| Plague Wind | ✅ `spread_all_infections` | Copies highest existing Infection stack count to all enemies, cannot cast if none infected |
| Plague of Ages | ❌ `apply_max_infection_aoe`, ❌ `infections_true_damage` | Once/fight all Soul Energy; max stacks to each alive enemy and true-damage conversion; conversion scope/duration undecided (N-2) |
| Soul Chain | ❌ `link_targets` | Cost 1, base two enemy targets; links share damage. Precise propagation and expiry require director decisions (N-3) |
| Soul Feast | ❌ `drain_hp_from_linked` | Cost 2, 2 HP/round ×3 rounds from linked enemies; healing baseline vs Eidolon upgrade must be clarified (N-4) |
| Possession | ❌ `control_enemy` | Cost 3, controls one enemy for one turn; target/choice/CR/boss semantics require director decision (N-5) |
| Chain of Woe stage | ◐ duplicate unlock | Level 5 repeats Soul Chain but documents **capacity upgrade to 3 targets** and Wound Transfer +10%; avoid second identical skill |
| Eternal Lich / Unmake | ◐ effect ✅ / resource mismatch | `remove_from_fight_permanent` registered. Unmake costs 5 Hollow Will in skill data but Eternal Lich retains Soul Energy under QA-8A. Decide access/cost, no hidden secondary pool (N-6) |

## 3 — Passive trait / progression matrix

| Path/stage | Recorded passive / upgrade | Code-audit finding / specification need |
|---|---|---|
| Bone Warden base | Bone Armor −2% incoming damage per living minion, maximum 10% | Engine damage pipeline references reduction; verify order and ownership |
| Bone Warden L3 Grave Command | Minions focus last attacked enemy | Trait is description-based; verify minion AI targeting and owner attack record (unconfirmed) |
| L5 Ossified Champion | Minion +20% HP; Skeleton 6–9 damage | Trait/upgrade declared; effects not demonstrated in registry; **damage override under Wren** |
| L8 Gravekeeper | +1% damage reduction per minion, max 15% | Trait described; test actual cap/stacking with base Bone Armor |
| L11 Death Knight | Summon damage +25% | Trait documented; verify minion attack pipeline, but don't touch damage override Wren owns |
| L14 Black Pharaoh | +3 cap, all summons AOE | Cap referenced in review; AOE behavior unverified, needs target and hit definition (N-1) |
| Plaguecaller L3 Virulent Touch | Basic attacks +1 Infection | Engine appears to call `infect` on player basic attack; verify free-attack variants |
| L5 Pestilent Sage | DoTs last +1 | `applyDot`/`infect` check trait; verify Infection duration additive, stack cap unchanged |
| L8 Rotbringer Plague Reservoir | +1 Soul Energy on infected enemy kill | `onDeath` hook found; current condition ties it to player's final blow; whether minion/DoT kill counts is N-7 |
| L11 Harbinger of Decay | Infection +2 damage per tick | Described; verify tick damage path and that additive vs per-stack is explicitly defined (N-7) |
| L14 Plague Sovereign | All DoTs true damage; ignore resistances | Scope (armor vs affinity/immune) unclear and separate from Plague of Ages (N-2) |
| Soulbinder L3 Binding Will | Links +1 turn | Requires duration baseline N-3 |
| L5 Wound Transfer | Linked targets +10% damage taken, capacity 3 | No active linking implementation; damage interaction with propagation requires N-3 |
| L8 Spirit Lash | Linked targets 3 damage/turn | Requires linked duration/ticking rule and damage attribution (N-4) |
| L11 Eidolon King | Heal for 100% Soul Feast damage | Different from base Feast; baseline heal unresolved N-4 |
| L14 Eternal Lich Undying Will | First death in fight revive at 50% HP; one free Feast/fight | No verified hooks; resurrection/death event ordering and free-cast trigger N-6 |
| Secret Deathlord Eternal | Legion of the Dead unlimited minions 5 turns; Death’s Dominion 1-turn enemy control | Legendary cross-path content, **separate scope** from routine necromancer completion; not ready without control design |
| Hollow King secret | Hollow Will resource; Unmake, Echo, other effects | **Distinct secret evolution**, not identical to Eternal Lich; avoid reallocating Hollow Will implicitly |

**Audit note:** A stage's `traitEffect` description is not evidence of a working gameplay hook. Items marked “unverified” need deterministic tests against the live engine. No trait should be declared implemented solely from data text.

## 4 — Developer-ready contracts for already-decided behavior

**Existing Infection:** single shared status pipeline; 2 damage/stack/tick, three stacks max, three rounds; reapplication refreshes duration; appropriate overflow remains disabled while pending. Contagion death-spread transfers one stack to each other living enemy when source flag is set. No re-entrant recursive spread; dead targets and expired statuses cannot receive stacks. Minions, enemies and player share application rules.

**Plague Wind:** only available with at least one currently infected enemy. Find current max living-enemy stacks and bring each living target up to that count (do not exceed 3); no AOE distance restrictions under D2; use existing `infect` semantics for duration/reactions. Validate when only one infected target or target immune.

**Soul Leech:** existing on-hit ratio uses damage actually dealt. At 0 damage, healing is 0; when HP is full, healing cannot exceed cap. Crit/armor interactions stay with existing damage pipeline.

**Bone Wall:** preserve 100% interception of the next eligible hit, existing targeting and rider handling. Record resource-starvation consequence as balance issue, not an excuse to add income without approval.

**Minion lifecycle:** summons join on the next round; obey currently approved cap (base 3, Black Pharaoh +3). Death removes them from live minion count. Resurrection must use an explicit record of fallen summons, not arbitrary enemy corpses. Duration/damage specifics beyond source evidence are awaiting N-1.

**Regression baseline:** fixed seeded encounters, single/multi-target, dead targets, cleanse, NPC/summon ownership, status immunities, minion cap, action order, no UI-specific state. QA review after code authorization.

## 5 — Soulbinder provisional engineering contracts (BLOCKED pending Director rulings)

The following describe interface/edge invariants, **not inferred gameplay answers**:

- **Link state:** group has owner, member entity IDs, creation event, finite expiry policy, and unique group identifier; should be serializable, purge stale/dead members, respect selective cleanse and non-positional targeting. Need N-3 before deciding propagated damage fraction, duplicate links, overlapping groups, recursion, reflection, armor/Guard and death.
- **Damage propagation:** only original direct damage should trigger propagation, never damage produced by a propagated event, preventing infinite loops. Whether to copy raw or final mitigated damage is N-3; preserving target-specific prevention is a necessary test.
- **Soul Feast:** per-round drain must tick with consistent status schedule, never siphon from dead/unlinked actors, cap healing to max HP. Whether to heal by default is N-4; do not silently assign lifesteal.
- **Possession:** distinguish enemy turn denial from actually selecting its action and target. Must use existing action/AI and deterministic seeded selection where selection exists. Enforce target immunities and CR once classified; bosses cannot be silently excluded without decision N-5. No indefinite allegiance change or uncontrolled permanent conversion.
- **Eternal Lich:** lethal-hit interception must be once per combat and occur before definitive combat loss. Revive does not restore removed/erased actor unless separately authorized; N-6 rules required.

## 6 — Resource economy finding and isolated experiments

Current engine at `endRound()` grants +1 Soul Energy **only if the Necromancer player dealt damage in that round**. Bone Wall, Raise Skeleton, Shield of the Dead, Soul Chain and Possession are non-damage actions, and thus can forfeit the gain without an ally being able to substitute (unless separate kill income triggers). This creates an effective opportunity cost **in addition** to the skill's printed Soul Energy cost.

**No numeric change approved.** Ask Tally to measure matched fixed-seed scenarios: (A) damaging rotation; (B) Bone Wall before/after comparable attacks; (C) summon-first rotation; (D) minion kill attribution and player action; (E) hypothetical round gain based on player/minion dealt damage, **scratch overrides only**; (F) resource at boss entry and end, unused corpses, minion contribution and survival. Track resource-neutral vs resource-positive turns and whether defensive actions actually improve survival; isolate from Wren's pending summon damage overrides.

Previous QA found necromancer ~2% full-run win rate at 100 seeds and ~23% boss-only aggregated branches in an earlier report. Not a proof of which single rule causes losses. Strong armor on boss makes low-damage minions weak; do not revise minion damage on Wren's behalf.

## 7 — Prioritized backlog and dependency gates

| Rank | Work package | Readiness / owner |
|---|---|---|
| P0 | Validate existing base and Bone/Plague trait wiring; regressions, no assumed new values | QA/Tally evidence; Developer only after assignment |
| P1 | **N-3 Soul Chain link semantics**, including Chain of Woe capacity | **Director decision first**; then Rook/Wren implementation |
| P1 | **N-4 Soul Feast + Spirit Lash + Wound Transfer** | Depends on N-3 and N-4 |
| P1 | **N-5 Possession** | Director approval then Keel architectural review of controlled enemy action ownership |
| P1 | **N-1 March resurrection and Black Pharaoh AOE** | Director determines minion history/cap/overflow; no overlap Wren summon damage |
| P1 | **N-2 Plague of Ages effect semantics** | Preserve Infection numeric rules; Director decides true damage duration/scope |
| P2 | **N-6 Eternal Lich resurrection/free Feast/Unmake cost** | Director decides resource identity and death interception; Keel reviews |
| P2 | Bone Wall/Soul Energy rotation assessment | Tally experimental report first, Director balance decision later |
| P2 | N-7 passive semantics review/remaining cooldown cleanup | Distinguish existing semantics from missing implementation |
| Separate | Wren's per-summon damage override | **Owned by Wren, excluded from this package** |

**Dependency rule:** Do not implement placeholder values or mechanically silent text as design approval. Conversely, independently verified existing mechanics do not need a fresh creative approval to be recognized as existing design. This audit does **not** independently authorize developer code work.

**Keel coordination request:** Review viable representation of link groups, recursive damage suppression, one-round control actor authority, minion resurrection registry, resurrection vs defeat resolution, and cross-branch resource references. No architecture instruction or source edit is issued by this document.
