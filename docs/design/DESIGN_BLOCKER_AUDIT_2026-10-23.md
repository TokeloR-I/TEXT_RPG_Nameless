# ENSO — Design Blocker Audit and Routing Register

**Vaelis** · 2026-10-23 · Design audit, no gameplay-code authorization.

## Source basis and caveats
Inspected current `docs/GAME_DESIGN_STATUS.md`, `docs/REVIEW.md`, `docs/design/NECROMANCER_COMPLETION_AUDIT.md`, `docs/design/QA_8_EVOLUTION_RESOURCE_PROPOSAL.md`, and tracked issues #29, #33, #40. The review document includes historical batches and 50-run numbers; the newer 100-run QA baseline (Warrior 56%, Mage 0%, Rogue 8%, Necro 2%) is a separate reported snapshot. These are not new simulations. No new Tally QA-8 isolated results were found in the tracked issue comments. Current GitHub search yielded three open issues (#29, #33, #40); that count does not equal all pending design work. Historical status text can be stale; developers must verify current implementation before coding.

## Routing rules
- **D — Design-blocked:** Vaelis publishes exact gameplay contract, interactions, edge cases and deterministic tests; Keel reviews architectural feasibility when relevant.
- **I — Implementation-ready design:** existing mechanics and numeric descriptions may be implemented under the project's normal authorization/assignment workflow; no repeated creative ruling for already approved behavior.
- **Q — QA-dependent:** Tally isolates variables, then Vaelis provides one consolidated recommendation for genuinely unapproved numbers.
- A blocked feature does **not** block the developer's other ready assignments. Veyr redirects work; Vaelis owns the blocker through handoff. No undocumented numeric choices.

## Blocker register

| ID | Priority | Feature | State | Next action / handoff |
|---|---|---|---|---|
| D-01 | P0 | Soul Chain + Chain of Woe | D | Vaelis specify duration, propagated share, damage ordering, recursion guard, death/cleanse/relink and 2→3 target capacity. Keel review topology. |
| D-02 | P0 | Soul Feast, Spirit Lash, Wound Transfer | D, depends D-01 | Vaelis specify drain tick, healing distinction, source attribution, expiry, interactions and tests. |
| D-03 | P0 | Possession | D | Vaelis specify controlled action/target, one-turn lifecycle, boss/immunity/CR boundaries; Keel review authority model. |
| D-04 | P1 | March of Endless Bones | D | Vaelis specify fallen-minion roster, restoration, cap overflow, free ghoul and action order. Wren retains summon damage override ownership. |
| D-05 | P1 | Plague of Ages | D | Vaelis specify max Infection AOE and true-damage scope/duration; preserve approved 2 damage × 3 stacks × 3 rounds. |
| D-06 | P1 | Eternal Lich + Unmake | D | Resolve Soul Energy vs Hollow Will reference; first-death resurrection and free Soul Feast lifecycle. QA-8A prohibits hidden second pool. |
| D-07 | P1 | Fortress `create_zone` | D | Translate zone gameplay to approved non-positional combat model; define ownership, targets, duration, and stacking. |
| D-08 | P1 | Mage Overchannel | D | Define HP-to-Mana transaction, cast refusal, lethal/self-damage and cooldown without invented numbers. |
| D-09 | P1 | Steal Skill / turn-order manipulation | D | Define eligible skills, duration, copied costs and legal target; for rearrange-turn-order specify exact scheduling semantics. |
| D-10 | P2 | Rogue Shadowstep teleport | D (presentation ambiguity) | Under D2 non-positional combat, separate flavor movement from mechanically approved crit buff; no invented grid. |
| I-01 | P1 | QA-1 mark death expiry | I / approved | Marks persist until end of applier's death round, then expire; already documented and current status reports rule. |
| I-02 | P1 | QA-2 Shield Bash | I / approved | 3 Oath Point stun threshold without expenditure, one unstunned normal target turn between stun skips. |
| I-03 | P1 | Vanguard Shield Discipline | I / gap #33 | Existing 35% Vanguard Guard vs 25% base; independently assign and authorize code work, do not fold into QA-1. |
| I-04 | P1 | QA-8A evolved resource identity | I / approved | One active branch resource; inherited skills pay unchanged numerical costs from it. |
| I-05 | P1 | Existing Infection/Plague Wind mechanics | I / implemented baseline | Preserve infection stack/tick/duration and existing spread; regression only unless a verified bug. |
| I-06 | P1 | Summon damage override | I / Wren-owned | No Vaelis/Rook overlap; verify integration once Wren delivers. |
| Q-01 | P0 | QA-8B regeneration | Q / #29 | Tally fixed-seed isolated baseline, four regen candidates separately, combined, DEF-only and combined; Vaelis issues single decision sheet. |
| Q-02 | P0 | Mage/Rogue/Necro flat DEF | Q / #40 | Distinguish earlier +2 DEF combined results from isolated evidence; no stat change approved. |
| Q-03 | P1 | Necromancer Soul Energy and Bone Wall | Q / #40 | Measure damage-action trigger vs defensive/summon rotations; propose economic solution only after evidence. |
| Q-04 | P2 | Control Resistance numeric parameters | Q + D | Architecture approved, numeric gain/decay/tiers pending; coordinate with Tally, do not invent thresholds. |

## Findings and owner instructions
1. **Vaelis:** Complete D-01 to D-03 first as implementation-ready design contracts; follow with D-04 and D-05. Finish ordinary mechanical details without reflexively escalating; seek Director ruling only when changing approved identity, numbers or major behavior.
2. **Tally:** Complete #29 and #40 as one evidence lane, not duplicated runs. Publish seed sets, branch win rates, boss outcomes, resource starvation, and isolated DEF effects. No results were posted in those issue threads at audit time.
3. **Wren:** Continue assigned summon damage override; do not overlap. Approved QA-1/QA-2 can proceed under existing authorization.
4. **Rook:** Continue independently approved effect implementations; redirect from D-blocked mechanics until Vaelis publishes handoffs.
5. **Keel:** Review linked-target damage recursion/control authority, resurrection lifecycle, and non-positional zone feasibility; architecture advice is not numeric approval.
6. **Veyr:** Maintain one status row per blocker (owner, blocked feature, dependency, ready alternate, handoff PR). Redirect developer capacity rather than waiting for design.
7. **Director:** Receive a single balance decision sheet after isolated QA, not every minor mechanical detail.

## Delivery definition
A blocker becomes **design-ready** only when its specification names exact target selection, resource, trigger, duration, status lifecycle, immunities/cleanse/death, interactions, and deterministic acceptance cases. **Design-ready does not automatically authorize coding.**

## Next checkpoints
- Vaelis: D-01/D-02 linked-combat specification and D-03 Possession specification.
- Tally: post isolated QA-8 data to #29/#40.
- Veyr: publish development routing against this register.
- No source changes in this audit PR.
