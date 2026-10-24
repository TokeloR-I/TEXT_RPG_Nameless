# ENSO's Last Stand — Status Engine: Implementation Report

*Response to "Status Effects: Approved Design Handoff". 22 October 2026.*

**Summary.** All 15 approved decisions are built as one shared, data-driven status pipeline. Every value the handoff
left open is stored in `src/data.js` as `null` (= PENDING), and a pending value keeps its feature **switched off**. So
the game currently plays as before, except for the approved behaviour changes in section 3. No balance numbers were invented.
**92 automated tests pass**, including tests for every invariant the handoff asked for. Mutation testing confirmed
those tests fail if the rules are broken.

---

## 1. Approved decision → what was built

| # | Decision | Status | How it works now |
|---|---|---|---|
| 1 | Tactical, data-driven status system | ✅ Built | Every status has an entry in `statusDefinitions` (data). All application goes through one function, `applyStatus` |
| 2 | Intensity stacking | ✅ Built | One instance per status per target. Re-applying adds stacks up to the status's cap and **refreshes duration to full**. Statuses without an approved cap refresh only |
| 3–5 | Control Resistance | ✅ Built · ✅ on | **Replaced by Vaelis Package 2** (`docs/design/VAELIS_PACKAGE_2_CONTROL_RESISTANCE.md`, 2026-10-23). Fight-local CR 0–100, starting by tier (regular/player/summon 0, elite 25, boss 60). A successful hard control adds 35, soft adds 20 (one cast: one largest gain per target). Before application: CR 50–79 caps duration at 1; CR 80+ resists hard and binary soft control, and applies other soft control at half strength for 1 turn. −10 at the end of each holder opportunity with no successful control since the last one. Bosses can't lose two normal opportunities in a row to hard control. The old per-round recovery / tier-multiplier / immunity-flag model never shipped and is gone. Tests: `tests/25-control-resistance.test.js` |
| 6 | Individual affinities | ✅ Built (immune) · ⏸ resist/vulnerable | `statusAffinities: { Bleed: 'immune' }` on an enemy blocks it. Resist/vulnerable support a `durationMult` once their effect is approved |
| 7 | Overflow at max stacks | ✅ Built · ⏸ off | Re-applying a capped DoT always refreshes duration and rolls for an Overflow Burst. Stacks never exceed the cap |
| 8 | Overflow luck protection | ✅ Built · ⏸ off | Each failed roll adds `chanceStep` (up to `maxChance`). A burst resets to `baseChance` |
| 9 | Burst scales with damage per tick | ✅ Built · ⏸ off | Burst = current tick damage × `burstMultiplier` |
| 10 | Universal ownership | ✅ Built | Player, enemies and summons share the same application, duration, CR, stacking, overflow, dodge/counter and reaction rules. Enemy and summon attacks now run through the same skill pipeline as the player's, so an enemy skill with `effects` in data applies them |
| 11 | Round-based duration | ✅ Built | −1 duration at the end of each round **in which the holder had a turn after the status was applied**. That guarantees N ticks/skipped turns for DoTs and turn-skips regardless of speed order, stuns or bonus turns. **Correction (QA report #1, QA-1):** this did *not* hold for statuses used on someone else's turn. **Resolved for Marked for Death, Expose and Guard** by the approved QA-1 decision (Option A): they now expire by opportunity via an `expiry` policy in data (`docs/design/QA_1_REACTIVE_STATUS_DECISION.md`). If their applier dies mid-fight, Marked for Death and Expose last to the end of that round, then expire (Creative Director ruling, `onApplierDeath: 'end_of_round'`). Evasion, Riposte and Taunt were not in scope and are unchanged |
| 12 | Selective cleansing | ✅ Built | A `cleanse` effect must name `categories` and/or `statuses`. Calling it with neither is an error; there's no "remove all" default |
| 13 | Selective reactions | ✅ Built | Only recipes in `statusReactions` can react. No pairs are inferred |
| 14 | Chance-based reactions | ✅ Built | A reaction can fire only when one status of a pair is **applied** to a target already holding the other. Coexisting statuses don't keep triggering |
| 15 | Character-driven probability | ⏸ Hook only | `reactionChanceModifier()` exists and returns 0. Decision 16 is paused, so no formula was written |

✅ Built = working and tested · ⏸ off = built and tested with test-only values, inactive in the game until approved.

---

## 2. Preserved as instructed
- **Infection:** 2 damage per stack, 3-stack cap, 3-turn duration (now stored in `statusDefinitions.Infection`).
- **Every ability marked working in the status report still works.** The full test suite (all earlier skill tests) passes unchanged in what it checks.
- **Balance is unchanged:** bot win rates per class match the previous snapshot.

---

## 3. Behaviour that changed (because rule 11 or rule 10 requires it)

| Before | Now | Why |
|---|---|---|
| Buffs/debuffs ticked at the start of the **owner's** turn; marks ticked on the **applier's** turns | All statuses tick **once per round**, after the holder has had a turn with them | Rule 11 |
| Guard lasted until the start of your next turn | Guard covers the **whole next round**, then wears off | Rule 11. "N turns" is now measured in rounds |
| The same DoT from two different sources could exist twice | One instance per status per target. The latest applier gets kill credit | Rule 2 (intensity, not duplicates) |
| Infection refreshed to the *longer* of old/new duration | Refreshes to the **full** duration | Rule 2 |
| Only the player could dodge/counter; only enemies could be blinded | Dodge, counter, blind, silence, stun, marks and DoTs work on **anyone** | Rule 10 |
| The ghoul's on-hit Weaken was a special case | It's part of the ghoul's own attack, through the same pipeline | Rule 10 |
| — | The player can now be stunned, silenced, marked or poisoned **if an enemy skill says so** in data. No enemy does yet, since adding enemy abilities was out of scope | Rule 10 |
| — | Haste's bonus action doesn't consume extra duration | Rule 11 |

---

## 4. Pending decisions (live list: `node tools/pending-decisions.js`)

**Control Resistance**: decided (Vaelis Package 2, see §1 rows 3–5). Open question for Vaelis: does decay stop at the tier's starting value (`decayFloor` in data, currently 0 as written)?

**Stacking & DoTs**
- Caps for Bleed and Poison (refresh-only until set).
- Base tick damage per DoT. Today each skill supplies its own value (Hemorrhage 3, Black Spit 5, Poison Trap 4).

**Overflow**
- Which DoTs allow it, plus `baseChance`, `chanceStep`, `maxChance`, `burstMultiplier`. The 200% example was **not** used.
- *Scope question:* the luck-protection counter is currently kept **per status instance on each target**. Confirm this, or say if it should be per applier.

**Affinities**
- Per-enemy affinity tables. None exist yet.
- What *resist* and *vulnerable* do. The engine supports a duration multiplier; other forms (application chance, intensity) can be added once decided.

**Enemy tiers**
- No elites exist. Bosses are recognised by their existing "boss" flag. Assigning tiers is content work.

**Cleansing**
- Cleanse abilities. None exist yet.
- **The category taxonomy is provisional:** dot · control · debuff · mark · buff · cooldown. Please confirm or replace it.

**Reactions**
- Recipes: pairs, outcomes, base chances. The engine offers three outcome building blocks (deal damage, remove statuses, apply a status). More can be added per recipe.
- Decision 16: attribute mapping for reaction probability (paused).

---

## 5. How the designer configures it (no code)

All in `src/data.js`:
```js
statusDefinitions: {
  'Stun':  { category: 'control', control: 'hard', crGain: 40 },          // ← example shape, not a proposal
  'Bleed': { category: 'dot', type: 'dot', maxStacks: 3,
             overflow: { baseChance: 0.1, chanceStep: 0.05, maxChance: 0.4, burstMultiplier: 2 } }
},
statusRules: {
  controlResistance: { threshold: 100, recoveryPerRound: 10, releaseThreshold: 40,
                       tierMultipliers: { regular: 1, elite: 1.5, boss: 2, player: 1, summon: 1 } },
  affinityEffects:   { resist: { durationMult: 0.5 }, vulnerable: { durationMult: 1.5 } }
},
statusReactions: [
  { name: 'Septic Wound', pair: ['Bleed', 'Poison'], baseChance: 0.25,
    outcome: [{ type: 'damage', amount: 10 }, { type: 'remove_statuses', statuses: ['Bleed'] }] }
]
// per enemy:
'bone_gnawer': { ..., tier: 'elite', statusAffinities: { Bleed: 'immune', Poison: 'resist' } }
```
*The numbers above only show the format. None are proposals.* Then run `node tools/balance.js` to see the effect.

---

## 6. Tests added for the handoff's invariants
Stack cap never exceeded · duration refresh on re-apply · refresh-only for uncapped statuses · overflow off by default ·
overflow chance rises on failure, caps at max, resets on burst · burst = tick × multiplier ·
Control Resistance (Package 2 acceptance matrix, `tests/25-control-resistance.test.js`) · immune affinity blocks ·
**same number of DoT ticks whether the applier is faster or slower than the target** · bonus turns don't consume duration ·
enemy skills apply statuses to the player · player loses exactly one turn to a stun · enemies can mark the player ·
selective cleanse by category and by name, with no default · cleanse as a skill · reactions only on application of a
defined pair, never from coexistence, and never at 0% · no reactions ship by default and the attribute hook adds 0.

Mutation check: deliberately breaking round-based expiry, the CR-threshold rule, overflow reset or duration refresh
each makes the relevant tests fail.
