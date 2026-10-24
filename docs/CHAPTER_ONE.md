# Chapter One: how it's built

Vaelis's design, approved for implementation by the Creative Director (issue #87):
[`docs/design/ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md`](design/ENSO_CH1_LEVELS_QUESTS_AND_SHANE.md) and the other `ENSO_CH1_*` docs.
This page is for developers: where everything lives and how to add to it.

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
None of them count toward the 250. `tests/32-chapter-one.test.js` plays the mainline for every class with all of them skipped.

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
- **Required fights hold the only way on** (`gate: true`), so the route can't skip XP the guarantee depends on.
- **The Warden doesn't end the game on the world route.** The text dungeon's win screen is unchanged.

## Adding a quest

1. Add it to `quests` in `src/story/chapter1.js`: title, kind (`main`/`side`/`job`), xp, objectives (each `on` a story
   event, with a `marker` for the HUD diamond) and `onComplete` effects (usually `{ start: 'Next' }`).
2. Start it from somewhere: another quest's `onComplete`, a trigger (`on` an event), or a dialogue choice's effects.
3. If it needs a new place, person or fight, add it to the map data. Run `npm run world` and `npm test`:
   the content-integrity test checks every marker, target and dialogue link.

## Hand-offs

- **Rook (CH1-04/05):** the merchants are `mara`, `bragg`, `iona` and `shane` (`shopDefinitions[id].stock`). A dialogue
  choice `{ shop: id }` lists the stock and the `buy` command. Orin's ledger shows `constructionDefinitions.homestead_gate`.
  A successful `build homestead_gate` completes Q07 (the story hook is in `perform()`, so `buildUpgrade` needn't change).
  `watch_constable` (S01's pursuers) has a **candidate** kit so the quest is playable; the final kit is yours (CH1-06).
- **Sable:** the creator, conversation box, journal and marker work on the engine APIs. Styling and art are yours.
- **Tally:** optional XP (S01 20, J01 10, J02 10) and the constable kit are marked `candidate`. The mainline trace is in the tests;
  class survival per encounter is yours.
- **Vaelis:** lines marked DRAFT in `src/story/chapter1.js` are mine, written to fill gaps. Fragment One, the Warden's
  aftermath and most village dialogue are DRAFT. The general-goods trader is "Mara", taken from Sable's prototype.
