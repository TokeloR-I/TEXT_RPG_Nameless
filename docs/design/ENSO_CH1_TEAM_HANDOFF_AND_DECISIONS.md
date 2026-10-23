# ENSO — Chapter One Studio Handoff, Decisions and Playtest Gate
**Prepared by Vaelis, 2026-10-23** · Open for cross-team review. **A GitHub PR is the communication artifact; no one is presumed to see another agent's chat.**

## Snapshot: current implementation vs new design
**Verified existing:** graphical six-map Forgotten Homestead through Overgrown Road; two optional world encounters (rats ×2, wolf); encounters enter headless turn-based engine; current four base classes and level-3 branch choice; text dungeon with Crow-Touched Warden; item list with only a few useful consumables; no world NPC dialogue, saving or roaming enemy patrols according to `docs/WORLD_MAPS.md`.
**Not implemented:** new village maps, main quests and quest XP, speaking townsfolk/shops, Shane recruitment/dialogue, construction NPC, castle repairs, graphical Warden connection, character naming/appearance creator, equippable stat system, gold trade, crafting/farming, new enemies and aggro.
**User-established goals:** rich story, villain protagonist twist, ten Qliphoth guardians, Warden's actual goodness, key+fragment memories, castle evolution, class appearance, village/Shane with exact **"Suffer!"**, profession list pending.
**Developer-ready details once approved:** quest IDs/state boundaries and no-double-reward contracts; L3 XP target 250; NPC conversation-end trigger; map path topology; item transaction invariants; enemy alert model. Numbers/identity choices explicitly remain proposed.

## Proposed phase roadmap (small slices, no perpetual engine-only work)
| Order | Vertical slice milestone | Visible proof in a playable build | Review leads |
|---|---|---|---|
| CH1-01 | **Who am I?** create named, visually customized character + objective journal | enter chosen name, class, sprite, leave cellar with clear direction | Sable, Wren, Keel |
| CH1-02 | **Beyond the fog** new maps, traveler and introductory quest dialog | leave road, talk to traveler, follow journal waypoint | Wren, Sable, Vaelis |
| CH1-03 | **A dangerous road** patrols + new/reused encounters + XP route | see detection warning; flee; reach L3 before Warden | Rook/Wren, Tally |
| CH1-04 | **Shamefield** village, NPCs, first shops and Shane's quest | hear chant; resolve watch; recruit Shane; normal goodbye: **"Suffer!"** | Vaelis, Sable, Wren/Rook |
| CH1-05 | **Equipment and gold** gear slots, buying/selling, compare stats | equip armor with visible stat change and make first shop purchase | Keel, Sable, Tally |
| CH1-06 | **The good Warden** evidence, dialogue, boss + key and first memory | understands he is benevolent; kill unlocks key once; game continues | Vaelis, Wren/Rook, Tally |
| CH1-07 | **Home worth returning to** builder, ledger, first repair + Shane merchant introduction | spend earned gold, world art changes, see Shane at home | Vaelis, Sable, Wren/Rook |
| CH1-08 | **Seeds of an empire** first farm ingredient and simple recipe; next zone hook | perform a basic farm/craft loop, receive destination for chapter 2 | Vaelis, Keel, Tally |

**Note:** This is a logical priority order, not eight simultaneously approved code tasks. Class balance work with Tally stays parallel and is not replaced by new loot. Wren's summon-damage override task remains distinct.

## Targeted team messages (pasteable into PR review, not falsely claimed as delivered)
- **Veyr / CCO:** Sequence CH1-01 through CH1-08 as studio milestones; protect narrative slice delivery against unlimited engine refactors. Confirm owners, overlaps and PR dependency.
- **Wren and Rook:** Read [quests/levels](ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md) and [XP/enemies](ENSO_CH1_ENCOUNTERS_XP_AND_BALANCE.md); no implementation until assignment. Maintain CLI/text RPG route while extending world. Do not change unapproved enemy HP/DEF or class resource rates.
- **Sable:** Design pixel-appropriate character creator, world objective/journal, equipment comparison, NPC/shop dialogue and restoration board; exact appearance preset count pending asset review.
- **Keel:** Review authoritative quest+reward state, one-time gold/XP flags, NPC scheduling and merchant transactions, patrol line-of-sight without activating combat-time hooks, world-to-Warden transition, and eventually save/persistence. Propose architecture only; no unapproved framework rewrite.
- **Tally:** Run fixed-seed class-by-class Chapter One viability and XP tracing: 250 mandatory XP before boss without Shane, existing rats or grinding; isolated armor/gear effects; new roaming enemy soft-lock; consumable and gold affordability. Provide one consolidated decision sheet, coordinated with Vaelis.
- **Narrative collaborators:** Check that hero and Warden remain sympathetic, twist isn't spoiled by dialogue/UI/item tooltip, and Shane is strange and memorable rather than a flat meme.

## Genuine creative decisions to confirm, grouped rather than one gate per task
**D-1 Names and geography:** Confirm village name Shamefield, traveler Elian, builder Orin Vale, NPC supporting names and geographical position. No new names should quietly become lore canon.
**D-2 Shane's accusation and watch encounter:** Is he wanted over medicines/permits, something more morally questionable, or a misunderstanding? Does the player kill or nonlethally defeat constables? This shapes village trust and morality. **"Suffer!"** line is already directed by CD and does not need reapproval.
**D-3 First memory image and Warden seal lore:** Confirm the recovered memory's content and whether Warden knew who he was guarding against; benevolent Warden and fragment key are already locked.
**D-4 XP and balance:** Approve candidate 135 quest +115 combat guarantee only after Tally verified source/feasibility. Exact proposed encounters can change without altering **at-least-L3-before-boss** design goal.
**D-5 Initial economy:** Decide starter Gold and fixed guaranteed sources, first repair fee, starter gear deltas, selling rules, crafting recipe rates **after isolated tests**. Do not backdoor the pending global +2 DEF decision via armor.
**D-6 Appearance and gear structure:** Pixel-friendly preset breadth, appearance lock/edit and slot count; branch-specific transformation schedule deferred until art milestone.
**D-7 Profession system:** Blacksmith/cook/farmer/store clerk/hunter and other job choices **remain pending approval** for formal profession mechanics. NPC occupation is not the same as player profession.
**D-8 First ten Qliphoth bosses:** Earlier PR holds proposed associations; not necessary to resolve entire ten-boss pantheon to build Chapter One.

## Quality acceptance / milestone stop rules
- Playable **without debug cheats**; no quest blocker or inaccessible flag on normal route.
- Story gives clear next objective, map route and cause/effect, with no early 'you are the dark lord' spoiler.
- Mainline provides >=250 XP **before** Warden even if every optional fight and Shane quest is skipped; L3 choice can actually be made on-screen.
- Warden has three storytelling supports: pre-fight caretaker evidence, personal warning, post-fight bird reaction; kill grants unique key once and does NOT terminate expanded campaign.
- Shane's exit line exact and repeatedly reproducible; merchant relocates once.
- NPC, item, XP, Gold and construction state never duplicate on re-entry; first repair remains achievable without random money drops.
- Maintain legacy text-based RPG and its tests; graphical combat uses same engine. Run world validation and tests on every relevant implementation PR.
- Frame rates, enemy AI patrol performance and actual balance are **QA measurements**, not alleged completion in this design PR.

## Merge/review workflow
This design branch is **stacked on** `chatgpt/fallen-sovereign-narrative-foundation` (**PR #85**). Merge PR #85 first, then retarget this new PR to `main` and merge after review/CI. This avoids duplicating foundation content and makes changes traceable. Until both are merged, direct `main` links to new story docs will be missing; agents should read the PR branches. No direct main commits, no gameplay source edits, no test claim from a docs-only PR.
