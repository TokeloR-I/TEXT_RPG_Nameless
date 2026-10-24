# ENSO Chapter One — Creative Director Gameplay Feedback #96
**Owner:** Vaelis, Lead Game Designer & Narrative Designer · 2026-10-24  
**Source:** [Creative Director game feedback #96](https://github.com/TokeloR-I/TEXT_RPG_Nameless/issues/96)  
**Authority:** These are interpretations and implementation acceptance criteria of the Director's explicit feedback, **not authority for Vaelis to modify source**. Numerical item stats/prices remain Tally-reviewed. Text and graphical clients should present the same story and rewards.

## Decision summary / implementable corrections

| ID | CD feedback / expected behavior | Review lane |
|---|---|---|
| F96-01 | Walking out of the cellar/home or crossing an area **does not pay XP**. Replace the current Q01 15 XP + Q02 20 XP + Q03 25 XP with **one meaningful discovery quest about learning where you are**: Elian provides the narrative resolution and **all 60 quest XP on completion of his encounter**, once. Cellar inscription/grounds are still optional/contextual discovery objectives, not standalone XP payouts. Preserve **250 cumulative mainline XP before Crow Warden** (new guaranteed mainline budget: Elian 60 + village 25 + orchard ledger 20 + sanctuary 30 + required fights 115 = 250). Player must not receive XP merely for entering or leaving maps. | Vaelis design, Wren story/quest state, Tally progression |
| F96-02 | The creator must offer **visibly different hairstyles and clothing/garment silhouettes**, not only palette/shirt-color swaps. Use current graphical style; visual preview should display chosen parts before starting. Skin tone, hairstyle, clothes, and a reasonable choice of facial/other feasible features are recommended; exact art content/cost belongs to Sable. Cosmetically neutral—no unapproved stat modifiers. | Sable visuals/UX + dev integration |
| F96-03 | Dialogue should reveal **one readable line or short passage at a time**, with deliberate next/continue and distinct choice panel. Asking a question should not dump several paragraphs instantly. Prevent simultaneous multiple text blocks, skip/reveal race conditions, and duplicate farewell. Ensure accessibility: reveal speed setting and immediate-complete-current-line button, without re-triggering rewards. | Sable/Wren UX |
| F96-04 | Shops must be **usable** with visible stock/prices and real buy/sell transactions; player can acquire Gold and trade ordinary loot. Mainline must provide healing/buff consumables and at least one meaningful weapon/armor upgrade before Warden. Stock and Gold sources should not require optional killing or random drops. No unsafe duplicate XP/loot/gold. | Rook economy/shop/items + Tally cost viability |
| F96-05 | NPCs/characters from a destination **must not appear in the departing map** before transition resolves. Current map actors drawn only from current location and gated enter event; don't preload visible sprites from other area. | Sable/Wren renderer/world integration |
| F96-06 | Arrival-flavor/transition text appears **only on first entry to a particular arrival message during a run**; later backtracks silently change location/HUD unless a genuinely new story state warrants a *different* text. Persist seen-message IDs in run/save state, not just temporary UI state. Area names remain visible. | Wren/Sable engine/world UI |
| F96-07 | Crow Warden starts **in the central axis of his sanctuary**, as its obvious guardian, not off to the side and not stepping aside on a dialogue choice. He may permit retreat, **never grant passage to the seal**. Present evidence of his kindness in **the approach/outside** (Featherwatch trail, crow infirmary, roadside sign/log), not as a compulsory book inside sanctuary that unlocks his encounter. No 'read a house note to make boss wake up'. Talking alone can initiate confrontation or player can enter attack range; boss opportunity/quest must remain achievable without reading optional notes. | Vaelis staging, Wren map/event, Sable presentation |
| F96-08 | Warden **recognizes the player**. Maintain midgame antagonist twist: he can recognize a presence, sigil, voice or lost sovereign's essence and react with personal fear or grief, without directly saying 'you are the defeated dark lord' to player or exposing royal identity in a tooltip/journal. His recognition is internal knowledge; he won't be tricked into surrender. He remains truly kind, protected crows are friends, and killing him has moral gravity. | Vaelis final dialogue, Wren event integration |
| F96-09 | Player needs actual discoverable **healing, buffs, trade goods, usable weapons and armor that visibly improve STATS**. Introduce class-compatible gear sources, compare/equip/unequip and stat delta display, fixed early loot and at least one reward from optional discovery. Keep existing DEF balance debate separate: armor must undergo isolated Tally tests, not silently substitute for the +2 DEF proposal. | Rook items/gear, Sable inventory UI, Tally balance |

## Quest narrative replacement: 'Where Am I?' (F96-01)
**Intent:** The player begins disoriented, searches for signs of civilization and seeks answers, rather than being paid XP for taking steps. The current three small quest IDs can be remapped/migrated safely if old saves require it; exact engine key strategy belongs to developer.
- Journal at spawn: **'Where Am I?'** — *Find someone who can tell you what happened here and where you are.*
- Exploratory hints at cellar/grounds/road become **non-paying** milestones or journal observations; cannot be exploited to farm 15 or 20 XP.
- Elian in the Broken Tollway: after the player **hears his explanation of the kingdom, its recently defeated ruler, the heroes and the direction toward Shamefield**, quest completes with **+60 XP once**, not by simply touching Elian or spamming an NPC hello.
- Elian can be talked to again, but no further quest XP. Quest marker then points to village. Required encounters can be defeated before/after Elian; event memory must support out-of-order play.
- The previous mainline math **15+20+25=60** is preserved as **60 at Elian**, and therefore 60 + 115 required combat XP + 25 + 20 + 30 = **250** before the Warden. **Actual level 2 is now reached later** (after the required road fights), which is intentional; Tally must test difficulty at level 1 and item provision accordingly.
- No *automatic* XP on first area entry, nor repeat map transitions. Chapter tests update expected earlier XP checkpoints and maintain final 250 without cheats/optional content.

## Warden scene: story script draft (F96-07/F96-08)
**Location:** exterior climb to the Crowkeeper's Rest: injured crow perches, mended wing splints, a weathered log and a fresh feeding bowl. The environmental clues are **optional to inspect**, never a boss-interaction prerequisite.

**Blocking:** Warden physically stands between player and seal, centered in chamber from entry and never vanishes or slides aside as a concession. Sanctuary has retreat exit. Warden's crows circle him or settle on his armor.

**Suggested dialogue (draft, not verbatim CD quotation):**
- **Warden:** 'I know that shadow. I prayed I would never feel it again.'
- **Player:** 'Then you know who I am?'
- **Warden:** 'I know what followed it. I know what it cost. No further.'
- **Player:** 'Stand aside.'
- **Warden:** 'No. I spent my life keeping weaker things safe. I will not abandon them now.'
- **Player:** 'You can still walk away.'
- **Warden:** 'And leave this door open? Never.'
- **Encounter trigger:** A final choice to challenge (or entering his guard range) starts boss fight; 'Leave' permits retreat only. No 'Stand aside' option moving NPC aside. No required reading of journal.
- **Death beat:** crows gather at his body in grief; first fragment key awarded once. Player's forgotten identity remains unresolved. The Warden knows more than he can safely say; do **not** reveal the midgame twist here.
**Continuity review:** The existing draft story currently requires inspecting `sanctuary_journal` as Q06 objective and places an NPC Warden at (13,5) then boss at (11,5). This violates Director's requested staging. Dev should relocate journal outside sanctuary, change Q06 to confront/talk without mandatory read, and align visual/encounter central positions; verify the gate cannot be bypassed.

## Evidence and handoff
Checked `docs/CHAPTER_ONE.md`, `src/story/chapter1.js`, `src/world/chapter1-maps.js` against feedback. Current early quest rewards are 15,20,25, Q06 includes mandatory `sanctuary_journal`, and Warden NPC/battle positions differ. These are concrete design/code mismatches, not abstract feature requests.

**Required QA for closure**
1. XP must stay zero merely from exits/entrances, +60 once after Elian information, and >=250 before boss for all four classes with all optional content skipped; test natural combat separately from bypass/forced-HP integration.
2. Full class-specific starting gear and safe healing access before Warden, real merchant stock and positive Gold acquisition. No dead-ends if optional content ignored or medicine purchased first.
3. Screenshot/record creator with multiple distinct **hairstyles and clothing designs**, not colors only; dialogue reveal tested with keyboard/controller and choice navigation.
4. Travel A→B→A→B: only first B arrival flavor appears and actors from B never render in A. Save/continue preserves seen flags.
5. Without reading Warden notes, encounter works, he remains centered, rejects stand-aside demand, private recognition is implied without revealing protagonist twist, victory grants one key.
6. Existing Shane normal dialogue exits still end in exact **'Suffer!'**; text RPG remains functional.
7. Tally reports Warden viability by class after the XP pacing change. No global HP/DEF/resource rates authorized by this document.

**Coordination:** Veyr triages ownership; Sable owns visible presentation, Wren owns story/world changes, Rook owns merchants/equipment/Gold and currently assigned related implementation. Keel validates scene state, renderer boundary and saved one-time arrival flags when needed. Tally owns balance and regression. Vaelis owns narrative consistency/dialogue acceptance. This doc **does not itself authorize unrelated code or arbitrarily set new prices/stats**.
