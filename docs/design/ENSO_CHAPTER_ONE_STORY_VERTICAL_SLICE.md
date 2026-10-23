# ENSO — Chapter One Playable Story Vertical Slice
**Design handoff proposal** · 2026-10-23 · Narrative scope only; **NO code authorization**

## Mission
Make current Zone 1 feel like the start of an RPG rather than a test arena, while retaining current combat engine. Deliver a short complete loop of **character creation → homestead objective → overgrown road exploration → speaking NPC → Warden context/fight → memory key → builder → first homestead repair**. Keep developer work split into optional independently testable increments. The current graphical `world.html` Zone 1 stops at the fog edge; the Crow-Touched Warden is currently in the separate text dungeon. Bridging them is an explicit level/world integration task, **not assumed to be implemented**.

## Experience beats and minimum acceptance criteria
| Sequence | Content minimum | Acceptance evidence |
|---|---|---|
| 1. Identity | Enter name, select from art-supported appearance presets, choose existing class | Name persists in journal, combat and save; default works; no unapproved stat effect from cosmetics |
| 2. Awakening | One voiced-as-text or dialogue intro, one visible objective | Player knows where to head; no spoiler of dark-ruler identity |
| 3. Home | Ruined property, inspectable damage, future castle location, clear return path | Journal points out possibility of repair without immediately granting castle |
| 4. Road | More than three enemy actors across varied behavior, visible roaming and sight response | Patrol detection visually signaled; encountering enemy enters existing turn-based battle, no real-time combat redesign |
| 5. Story NPC | Traveler beyond fog gives context of defeated dark ruler and recently victorious heroes, direction to Warden | Dialogue does not identify player; new objective appears |
| 6. Warden | Environment notes proving his kindness; warning dialogue; boss encounter reuses existing stats until balance approval | A player can understand they harmed a good person, before and after battle |
| 7. Memory key | Boss reward item/progression flag, first fragmented recollection | Unique event once; save/reload safe; story doesn't reveal midpoint twist |
| 8. Builder | Meet construction specialist because Warden route is now open | Recruitment and construction ledger unlocked, no commitment to full building tree |
| 9. First repair | Spend defined later-approved gold and return to see clear world change | Correct resource deduct and persistence; do not invent cost or material recipe |

## Task stream separation (proposed responsibilities; assignment by Creative Director)
- **Vaelis**: approved story canon, dialogue script, memory fragment, journal copy, Warden backstory, aspect ledger.
- **Veyr**: scope ordering and studio coordination.
- **Keel**: world flags, save compatibility, class-appearance data representation, NPC patrol/sight vs turn-based trigger architecture.
- **Sable**: UI character naming/appearance, journal objectives, equipment menu, construction ledger wireframes; cosmetic scope tied to currently available sprites.
- **Wren/Rook**: after assignment/authorization, own gameplay/world implementations, no speculative balance changes.
- **Tally**: exploratory path tests, pacing, soft-lock/failure, resource and encounter burden.
- **Lore/documentation peers**: continuity, naming and dialogue review as invited.

## Definition of fun for the early slice
Players can answer: **Who am I now? Where am I going? Why should I explore? Whom did I hurt? What changed at home after victory?** without having to read technical logs. The Warden must be a character, not only a health bar.

## Non-goals of first slice
Entire ten-boss campaign, full castle and economy, complete crafting, Shane's village, professions/jobs, legendary equipment tiers, secret class transformations, new numerical combat balance, implementation of the graphical boss absent world integration design. These belong to following milestones.

## Open design questions that actually require decisions
- Story NPC identity and exact geography connecting fog edge to Warden;
- Warden's history, builder identity, precise first memory key flashback;
- Minimum appearance presets compatible with current assets;
- First homestead repair options/costs;
- Whether boss gating requires different entry in graphical route than text dungeon.

**Approved vision is not automatic approval to code these proposals.** Merge docs after creative review, then give small precise implementation assignments.
