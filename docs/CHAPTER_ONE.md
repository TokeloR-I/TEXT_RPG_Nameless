# Chapter One: how it's built

Chapter One's implemented content follows the Creative Director's narrative direction and the design handoff recorded in issue #87:
[`docs/design/ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md`](design/ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md) and the other `ENSO_CH1_*` docs.
This page documents the **current implemented Chapter One route** and its authoring interfaces. The design documents also contain proposals; their draft lore, numeric candidates, and unapproved future features are not automatically binding canon. This page is for developers: where everything lives and how to add to it.

## The route

```
Cellar → House → Grounds → Overgrown Road → Broken Tollway → Shamefield ─┬─ Shane's Allotment (side)
  Q01      Q01     Q02         Q02/Q03          Q03, G1, G2      Q04, Q05  └─ North Orchard → Featherwatch Path → Warden's Sanctuary → Seal Chamber
                                                                                G3                 G4               Q06, B01            B01
                                                       … then home to the Grounds: Orin Vale (Q07), Shane's stall (after S01)
```

| Step | What | XP | Running total |
|---|---|---:|---:|
| Q01 A Name in the Dark | read the cellar inscription, leave the cellar | 15 | 15 |
| Q02 A House That Remembers | look over the grounds, find the road | 20 | 35 |
| Q03 The Road Keeps Its Dead | through the fog, talk to Elian | 25 | 60 |
| G1 Ragpicker Pair | weak goblin ×2, on the only bridge | 20 | 80 |
| G2 Root-Chewers | bone gnawer + rust rat, in the only gap in the carts | 25 | **105 (L2)** |
| Q04 Bread and Bell | reach Shamefield, talk to Tamsin, meet a trader | 25 | 130 |
| Q05 The Orchard Ledger | Watch Captain, the register in the tollway wrecks, back to the Captain: the gate opens | 20 | 150 |
| G3 Broken Oath Cultists | cult acolyte ×2, in the old causeway | 40 | 190 |
| G4 Ritual-Scarred Ghoul | on the narrow climb | 30 | 220 |
| Q06 The Keeper's Warning | reach the sanctuary, read the log, talk to the Warden | 30 | **250 (L3)** |
| B01 A Good Man Dies | the Warden (existing boss, unchanged), then the seal: Fragment One | | |
| Q07 The Mason Who Waited | home, Orin Vale, the Builder's Ledger, repair the gate | | |
| Q08 Ten Seals | the hook for Chapter Two | | |

Optional: S01 *Shame on Shane!*, J01 *Wolf on the Road*, J02 *Herbs for Iona* (from the notice board), the old rats and wolf.
None of them count toward the mandatory 250. `tests/32-chapter-one.test.js` traces the mainline for each base class with all optional content skipped. **This is a progression/integration test, not a fair-combat balance test:** its player has effectively unlimited HP and enemies are reduced to 1 HP before attacks. It proves XP, routing and quest triggers can complete; it does **not** prove ordinary characters can survive the required encounters, beat the Warden, or afford supplies.

## Where things live

| What | File | Notes |
|---|---|---|
| Maps, people's positions, fights, gates | `src/world/chapter1-maps.js` | merged into the Zone 1 world by `zone1.js` |
| Quests, NPC dialogue, triggers | `src/story/chapter1.js` | pure data |
| The rules that run them | `src/engine/story.js` | quests, flags, journal, dialogue, identity |
| What the world asks of the engine | `talk`, `dialogue_choice`, `dialogue_leave`, `world_inspect`, `world_enter`, `set_identity` | through `engine.act()`, like everything else |
| Screens | `ui/world-ui.js`, `ui/world-render.js` | name/class/look, conversations, journal, objective marker |

## Rules that matter

- **XP and items are paid once.** Quest XP is claimed under `quest:<id>`, story items under their key, triggers once each.
  Re-entering maps, re-reading things, re-talking and save/restore never pay again.
- **Out-of-order play can't soft-lock a quest.** Every story event is remembered. When an objective becomes current and its
  event already happened, it completes immediately.
- **Conversations are an engine waiting state.** `getAvailableActions()` returns `awaiting: 'dialogue'` with the lines and
  choices. Nothing else is accepted until the conversation ends. A quest that completes during a conversation
  prompts the evolution choice only after it ends.
- **"Suffer!"** Shane's `farewell` plays on every normal goodbye: a choice that ends the talk, `dialogue_leave`, Esc in
  the world, `bye` in the text game. It never plays on an interruption (`end: 'interrupt'`).
- **No reveal.** No line, journal entry or tooltip says the player was the old ruler. Fragment One is partial and faceless.
- **Required fights hold the only way on** (`gate: true`), so the route can't skip XP the guarantee depends on. The first branch is unlocked at **250 cumulative XP (100 for L2 + 150 for L3)** and must become selectable before the Warden. The route guarantee assumes each required fight is won; escape or a death is not an alternate XP source.
- **The Warden doesn't end the game on the world route.** The text dungeon's win screen is unchanged.

## Current boundaries and QA ownership

- **World progression is present, class viability is not established by story tests.** Tally should separately run unmodified seeded encounters with ordinary class HP/DEF, resources, healing and equip state. Capture each class's survival, resource at boss entrance, defeat location and actual ability to select its first branch. Compare any +2 DEF or resource-regeneration experiments in isolated scenarios; those proposals are not silently approved by this chapter.
- **Gameplay systems may be only partially connected.** `src/story/chapter1.js` provides quests and NPC dialogue, while shop inventories, construction and equipment depend on their respective rules/UI. Inspect the current source and relevant tests before telling players that every future crafting, farming, or visual transformation feature is live.
- **Narrative continuity:** the Warden is a genuinely compassionate caretaker; his death is a morally consequential player choice, not proof he was an evil monster. His key reveals only a fragmented memory. Neither the early journal nor dialogue may reveal the player was the defeated ruler. The Warden is the **first of the planned ten Qliphoth-aspect guardians**; later aspect names, powers and final-boss details remain separately reviewable proposals.
- **Shane:** the exact farewell `Suffer!` on normal conversation exit is Creative Director-directed; preserve it in dialogue, shop and farming flows. It must not fire for an interrupted conversation.
- **Draft text and candidate values:** labels `DRAFT` and `candidate` in `src/story/chapter1.js` are not permission to finalize lore or balance without review. In particular, optional XP and the watch constable combat kit still need Tally's evidence; supporting NPC names and first memory prose should be reconciled with Vaelis's final narrative.

## Adding a quest

1. Add it to `quests` in `src/story/chapter1.js`: title, kind (`main`/`side`/`job`), xp, objectives (each `on` a story
   event, with a `marker` for the HUD diamond) and `onComplete` effects (usually `{ start: 'Next' }`).
2. Start it from somewhere: another quest's `onComplete`, a trigger (`on` an event), or a dialogue choice's effects.
3. If it needs a new place, person or fight, add it to the map data. Run `npm run world` and `npm test`:
   the content-integrity test checks every marker, target and dialogue link.

## Integration and review handoffs

These are **points of contact for review**, not claims that an agent has accepted new work or permission to change source without assignment.

- **Rook / Wren (shops and building):** the merchants are `mara`, `bragg`, `iona` and `shane` (`shopDefinitions[id].stock`). A dialogue
  choice `{ shop: id }` lists the stock and the `buy` command. Orin's ledger shows `constructionDefinitions.homestead_gate`.
  A successful `build homestead_gate` completes Q07 (the story hook is in `perform()`, so `buildUpgrade` needn't change).
  `watch_constable` (S01's pursuers) has a **candidate** kit so the quest is playable; final balance belongs in Tally's isolated QA evaluation before Director approval.
- **Sable:** the creator, conversation box, journal and marker work on the engine APIs. Styling and art are yours.
- **Tally:** optional XP (S01 20, J01 10, J02 10) and the constable kit are marked `candidate`. The mainline integration trace is in the tests; **real-combat class survival and affordability are still unverified by that trace**. Please report a consolidated decision sheet without mixing equipment bonuses, DEF proposals and resource regeneration in one uncontrolled experiment.
- **Vaelis:** lines marked DRAFT in `src/story/chapter1.js` are mine, written to fill gaps. Fragment One, the Warden's
  aftermath and most village dialogue are DRAFT. The general-goods trader is "Mara", taken from Sable's prototype.

## Story-author checklist before a content PR

1. Confirm a new NPC, quest and map interaction has a real story purpose, a journal objective, and no inadvertent reveal of the dark-ruler twist.
2. Check dialogue can be exited, re-entered and re-read without duplicate XP, loot, Gold or recruitment state; Shane's normal farewell must remain exact.
3. Confirm quest-essential enemies and NPCs cannot be bypassed or made unreachable so a new class never gains its first evolution. Update the 250-XP test if approved rewards or encounter composition change.
4. Confirm village residents visibly react when the Warden dies; keep him benevolent, and the memory fragment incomplete.
5. Test normal player progression separately from test shortcuts: `npm run world`, `npm test`, and Tally's ordinary-HP/ordinary-damage QA scenarios. A passing story integration suite **is not** a passing balance report.
6. Preserve the shared text-mode rules path; Chapter One world mode continues after the Warden, while the original text dungeon may retain its standalone epilogue.
