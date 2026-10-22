# ENSO Necromancer — Director Decision Register and Acceptance Gates

**Vaelis — design proposals, not approvals.** Only genuinely unresolved semantics are presented. Existing Infection, QA-8A single-resource direction, and documented ability numerical values remain in force.

## N-1 Bone Warden — March / resurrection (P1)
**Approved description:** resurrect all fallen minions and summon one free ghoul; once/fight, costs all Soul Energy. Black Pharaoh gives +3 cap and AOE attacks.
**Undecided:** Does resurrection restore full HP or prior HP? Does it resurrect minions lost earlier in same fight only? If fallen roster + new ghoul exceeds capacity, which have priority? Does resurrection carry previous buffs/statuses? Does it act immediately or next round? Which targets do summon AOE attacks strike?
**Proposal:** fight-local fallen roster, resurrect eligible units as fresh live instances retaining summon type, clear temporary statuses, rejoin next round, respect cap; if slots insufficient, prioritize resurrection in death order before free ghoul; no partial refund unless separately decided. **None of these defaults is approved.**
**Acceptance:** fixed seed two dead summons + one available slot; no resurrection of enemies or pre-fight dead; no duplicate IDs, action order/cap invariants, explicit overflow result.

## N-2 Plaguecaller — Plague of Ages (P1)
**Approved description:** all enemies gain maximum Infection stacks; infections deal true damage. Infection baseline: 2/stack, 3 cap, 3-round duration; resource cost all; once/fight.
**Undecided:** True damage for existing+new Infection only or *all DoTs* via ascended passive? Does conversion persist for rest of fight or remaining Infection ticks? What does “ignore resistances” mean for explicit enemy affinity immunities? Separate scope of Plague Sovereign passive vs cast effect.
**Proposal:** add/refresh Infection to 3 per living enemy via universal `applyStatus`; conversion applies to Infection's armor mitigation, **not** blanket immunity bypass, during its remaining natural duration. The ascended passive's all-DoT conversion is separate and needs a scope decision. No automatic extra tick, extra stack or new numeric damage. **Pending approval.**
**Acceptance:** empty/partial/capped infections; immune enemy; reapplication refresh; 2×3 tick baseline; true damage vs armor; selective cleanse; multi-target; DoT source attribution; no carry to next fight unless approved.

## N-3 Soulbinder — links (highest priority)
**Approved description:** Soul Chain links **two** enemies, incoming damage to one affects linked enemies; Chain of Woe level 5 capacity **three**, Binding Will +1 turn, Wound Transfer +10% incoming damage.
**Undecided:** Base link duration (data field absent), damage share percentage (no number), whether propagated damage is direct/true/mitigated, whether non-attack DoTs propagate, whether one member's death dissolves group or shrinks it, whether groups can overlap, cleanse semantics, links across summons, selection when insufficient targets.
**Proposal:** a single owned link group; no overlapping memberships; propagated damage may not recursively re-propagate; remove dead members; links end at their own duration; cleansing removes membership; prohibit links with fewer than two live eligible targets. **Still pending**: duration and copied damage proportion, eligible damage types and post-mitigation behavior. No implied 100% copy from ambiguous “hits both.”
**Acceptance:** exactly 2 at L3, capacity 3 at L5; hit A must not indefinitely recurse; B guards/absorbs independently; death A/B, cleanse, re-link, expiry, save/restore deterministic; no link effect without valid target set.

## N-4 Soul Feast / linked passives
**Approved descriptions:** Soul Feast drains **2 HP per linked enemy per turn for 3 turns**; Spirit Lash 3 linked damage/turn; Eidolon upgrade heals for **100% of Soul Feast damage**; Wound Transfer +10% damage taken.
**Undecided:** Does base Soul Feast heal the caster or only damage targets? Does drain ignore armor/resistance? Are multiple simultaneous Feast casts additive or refreshing? How do Feast/Spirit Lash interact with link expiry and death? Does Wound Transfer amplify reflected damage?
**Proposal:** Feast requires at least one active link; ticks on standard round engine; no ticks after targets unlink/die; refresh not double-stack, cap caster healing to missing HP; attribute damage to caster. Preserve 2/3 and 3/tick text. **Do not choose baseline healing or immunity penetration without approval.**
**Acceptance:** two vs three targets, cast at end of round, link breaks mid-duration, owner stun, targets die, cleanse, multiple applications, heal cap, no recursive sharing.

## N-5 Soulbinder — Possession (P1)
**Approved description:** control one enemy for **one turn**.
**Undecided:** Human chooses skill/target vs automatic deterministic move; whether controlled enemy attacks its allies, whether boss/elite valid, CR classification/tier, what occurs when no legal skill exists, does normal turn order change, can enemy use special boss abilities?
**Proposal:** keep enemy initiative slot; one forced alternate action under temporary control, then revert. Never grant a permanent ally, spawn a copy, or bypass hard-control gates. Actual action and legal targets must be Director-approved; Keel validates technical feasibility.
**Acceptance:** normal/elite/boss fixtures, immunity, CR threshold, zero legal actions, death before turn, expires exactly once; no duplicate turns/rewards.

## N-6 Eternal Lich — ascension resource and death
**Approved descriptions:** first death/fight resurrect at 50% max HP; free Soul Feast once/fight; Unmake removes one target permanently. **QA-8A approves a single active resource.**
**Contradiction:** Unmake cost **5 Hollow Will** belongs to Hollow King, yet Eternal Lich retains Soul Energy (no resource evolution). Secret Hollow King is separate.
**Choices:** assign a separate Soul Energy cost to Eternal Lich's Unmake, or explicitly grant a resource evolution (would supersede current tree). Do not convert cost 5 by assumption. Also decide whether free Soul Feast overrides insufficient resources, and trigger order relative to poison tick/loss.
**Proposal:** leave Hollow King Unmake intact; provide an Eternal Lich-specific cost/skill data definition after numeric approval; lethal interception before game-over, once/fight, 50% HP, no extra action. **Cost and any restrictions pending.**
**Acceptance:** lethal hit at first/second death, DoT death, full-party death order, blocked heal, free Feast counter and persistence, Hollow Will never silently debited from Soul Energy.

## N-7 Already-described passive ambiguities
- Grave Command target focus: last enemy hit, marked, or targeted? Minion AI precedence when target dies.
- Plague Reservoir: only player-killed infected enemy vs any friendly source / Infection DoT kill.
- Infection +2 per tick at L11: per stack or per target? Declared “All infections deal +2 dmg/turn” could imply total.
- Channel the Grave one-turn cooldown: no enforced status behavior; specify whether next regular turn or following turn is blocked.
- Summon AOE at Black Pharaoh: current graphical combat non-positional; choose “all eligible enemies” vs selected count and per-hit modifiers.
- Bone Warden summon HP +20%, +25% damage: verify rounding, whether ghoul included and summon time vs dynamic trait changes, without overlapping Wren's ongoing override task.

## Decision sequencing

Request rulings in order **N-3 → N-4 → N-5 → N-1 → N-2 → N-6 → N-7**, one compact batch per subsystem when Director is ready. Existing data-described values are not up for unnecessary reapproval. **This PR is an audit/proposal, not a new approval gate for established functioning abilities.**

After approval: Keel reviews the control/link architecture; Wren/Rook receive separate assigned implementation tasks with verified QA acceptance fixtures. No coding authorization here.
