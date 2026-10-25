# ENSO Studios — Gameplay Direction Report
## Transition to Seamless Real-Time Action RPG Gameplay

**Project:** ENSO's Last Stand  
**From:** Creative Director  
**Priority:** Core gameplay direction  
**Affected areas:** Combat, exploration, world simulation, controls, UI/UX, AI, animations, loot, quests, and progression  
**Delivery team:** Claude Gaming Studio, with Wren (development lead), Pixie (UI/UX lead), and Tally (QA lead)  
**Standby:** Rook — backup developer; no work assigned through this report

---

## 1. Creative Director's Feedback

After testing the latest build, I can confirm that real-time combat has technically been implemented, but the result is not the gameplay direction I intended.

The game still moves the player into a separate battle interface when encountering an enemy. It feels like the original turn-based encounter system with timers, cooldowns, and a skill bar added on top.

**That is not the intended experience.**

ENSO's Last Stand is evolving into a **top-down dark fantasy action RPG where exploration and combat happen continuously in the same playable world**. A player should discover enemies, approach or avoid them, move around them, strike, defend, cast skills, loot, interact, and continue exploring without entering a separate combat screen.

Our references are:

- **Dimraeth:** Real-time top-down action combat, positioning, dodging, guarding, and readable threats.
- **Dark Souls:** Weighty attacks, risk and recovery, stamina and defensive timing, recognizable enemy patterns, and challenging bosses.
- **Guild Wars 2:** Responsive skill use, cooldowns, action targeting, mobile combat, dynamic encounters, and exploration.

These are inspirations, not blueprints to reproduce. ENSO needs its own combat identity, adapted to its top-down perspective and established dark fantasy classes.

**The world is the battlefield.**

---

## 2. Eliminate Instanced Combat from Primary Gameplay

Retire the separate combat box, battle transition, and battle-only interaction loop from the **primary graphical experience**.

Example: The player is exploring the Overgrown Road, finds two creatures near a ruined wagon, and attacks one with the left mouse button or basic attack key. Both enemies react in the same environment. The player circles them, dodges, uses skills, retreats if necessary, defeats them, collects loot, and continues walking. **No battle screen opens at any point.**

This applies to ordinary enemies, groups, elites, and bosses—including the Crow Warden. A boss may control an arena or seal exits for narrative reasons, but the encounter must remain in the world rather than an isolated combat interface.

Regions may have transitions or loading boundaries. The requirement is seamless **exploration-to-combat**, not a technically infinite map.

---

## 3. Movement and Controls

Proposed default keyboard-and-mouse controls:

| Input | Action |
| --- | --- |
| WASD | Continuous eight-direction movement |
| Left mouse button or 1 | Basic attack |
| 2–6 | Equipped combat skills |
| Space | Dodge / dash |
| Shift | Sprint |
| Right mouse button | Guard / block when supported |
| E | Interact, talk, gather, open, or collect |
| Tab | Toggle/cycle target lock |
| I / J / Esc | Inventory / journal / pause menu |

Controls should be rebindable and architected to allow controller support. Resolve input conflicts contextually without preventing normal movement.

The existing 16-pixel map grid can still define tile art and authored world geometry. However, **character movement, collision, aiming, and attacks must support sub-tile positioning** so play does not feel grid-locked. Players should be able to circle an opponent, pursue, flee, and reposition freely.

Attack animations may introduce deliberate, brief movement commitments; merely being in combat must never disable player navigation.

---

## 4. Combat Mechanics

### Basic attacks and weapon behavior

Basic attacks execute in world space with direction, animation startup, impact window, recovery, range, and hit detection. Weapon classes should differ in reach, swing speed, damage pattern, stagger, and mobility.

Short combo chains or heavy-attack follow-ups may be introduced where suitable. A hit should depend on spatial contact and valid timing—not a selected enemy in a hidden encounter screen.

### Skills and cooldowns

**Reuse the existing real-time combat work where practical**, including cooldowns, class resources, damage rules, and timed statuses. Move activation and resolution into the explorable world.

Examples:

- A fireball travels toward a cursor-directed point or valid target and hits physical entities.
- A sword sweep affects enemies actually inside its attack arc.
- A curse checks actual range and, when relevant, line of sight.
- A summon appears in the world, follows or defends its owner, and attacks nearby enemies.
- A dash or teleport moves the player through valid world positions rather than merely playing an effect.

Skills should show clear cooldown and cast feedback on the persistent HUD.

### Dodge, guard, parry and recovery

Dodge should move the player meaningfully in their chosen direction, with a clear distance, duration, vulnerability/avoidance behavior, and recovery. Guard should respond to incoming attacks according to equipment and class. Parry can reward precise timing with stagger or counterattack opportunities where available.

Not every class needs identical defensive tools. Class identity takes priority over mechanical uniformity.

### Stamina and other resources

Consider stamina for dodge, sprint, guard, and heavy physical moves, with readable regeneration and sensible costs. Mana and specialized class resources retain distinct roles. Avoid adding resource restrictions simply to imitate Souls games; the result must feel responsive and fair in a top-down RPG.

### Readability and commitment

Attacks have readable startup, active and recovery windows. Stronger moves can be riskier. Interrupt and animation-cancel rules must be predictable rather than arbitrary. Enemy and player actions should communicate intent before damage is applied.

---

## 5. Enemy AI and Encounters

Enemies exist physically in the world, independent of whether the player initiates combat. They should be capable of:

- Idle behavior, wandering, patrols, guarding and scripted ambushes.
- Detection based on distance, sight and, where appropriate, sound or allied aggression.
- Pursuit, melee approach, ranged spacing, flanking and obstacle navigation.
- Attack selection, readable wind-ups, recovery, interrupts, and stagger.
- Disengagement and return-to-area behavior, including sensible anti-exploit leash rules.
- Death, persistent defeat state where applicable, rewards, and quest event updates.

The AI should respect collision geometry, hit range, line of sight and traversable routes. Groups should be able to engage simultaneously. Creatures should behave according to their fiction: a wolf does not fight like a robed cultist or a shielded soldier.

**Spatial fairness matters.** Enemies should not deal melee damage from unrealistic distances or track the player perfectly through a committed attack animation. Telegraphs must match the actual damage footprint.

---

## 6. Boss Encounters

The Crow Warden and future bosses should exist in explorable locations and fight the player in world space.

Bosses need recognizable attack patterns, movement, telegraphs, punishable openings, dangerous abilities, and behavior changes at appropriate health thresholds. Terrain, hazards and encounter space may shape the fight. An arena boundary is acceptable; a disconnected battle box is not.

Challenge should reward observation, timing, positioning and class mastery—not simply enormous health pools or unavoidable damage. A lost fight should have a clearly defined recovery, checkpoint or respawn behavior rather than leaving the player in a broken quest state.

---

## 7. Continuous Exploration, Interaction and Questing

The player must be able to explore roads, settlements, ruins, forests and dungeons; engage enemies; gather resources; inspect objects; open chests; talk to NPCs; complete quests; equip items; and use unlocked Black Flight destinations within one coherent world experience.

Entering combat should not replace the world simulation. Threats may temporarily restrict interaction where justified, but dialogue, inventory, quest and gathering systems must not rely on the old battle transition to determine whether the player is in combat.

### Combat state as world behavior

Rather than a separate scene, combat can be represented by nearby hostility, aggro, recent attacks, and other world-state conditions. Define when healing, saving, fast travel, dialogue, or interaction is permitted during danger without forcing the character into a second game mode.

---

## 8. Loot, Equipment and Progression

Preserve the universal enemy loot, Gold, equipment generation, rarity, affixes, inventory and quest-reward systems already implemented.

On defeat, an enemy should leave an appropriate world pickup, loot container or collectible drop. The player collects it by proximity or interaction; the game shows a concise reward notification. Do not open a mandatory post-battle result screen.

Rewards must remain once-only where intended, persist through save/load, and avoid duplication on retreat, respawn, or world transitions. Quest objectives and experience should update from actual events occurring in the world.

Weapons should visibly match equipped artwork when possible and produce mechanically distinctive attacks. Avoid promising visual equipment layers that are not supported by available art; use the Mana Seed layered asset system and compatible licensed packs where appropriate.

---

## 9. UI/UX — One Persistent Action-RPG Interface

**Pixie, as UI/UX lead, should redesign the primary world UI around action gameplay**, not merely reskin the old battle screen.

Persistent or immediately available elements should include:

- Health, class resources and stamina if adopted.
- Basic attack indicator and equipped skill bar with live cooldowns.
- Status effects, duration and stacks.
- Contextual enemy health bars; distinct boss health presentation.
- Interact/loot prompts, quest tracking and concise reward notices.
- Directional targeting or lock-on indicators when necessary.

Attacks, hit feedback, projectiles, status effects and telegraphs should appear next to actors in the world. Turn-order strips, combat-only menu choices and scene transitions do not belong in the primary action gameplay.

Camera follow, mouse-directed facing/aiming, optional target lock and readable enemy silhouettes should support control rather than obstruct it. Combat should remain understandable with multiple enemies and overlapping effects.

---

## 10. Animation, Art and VFX

A successful action-RPG conversion requires visible motion and feedback for directional movement, idle, attacks, casting, dodging, guarding, stagger, damage, death, and enemy telegraphs.

The **Claude Gaming Studio** handles art and VFX production, sourcing and integration as part of its development workflow. **Wren** owns technical integration and renderer behavior; **Pixie** owns visual readability and interface presentation; **Tally** tests the actual in-game result. The studio can use its integrated specialist agents internally without creating additional external lead roles or waiting for role-by-role approval.

Prioritize compatible licensed packs and existing Mana Seed artwork where appropriate. Original artwork should be reserved for distinctive ENSO identities, encounters, and supernatural abilities rather than rebuilding generic assets unnecessarily.

The Mana Seed artist's permission and restriction on using their art as input or reference for AI image generation must be respected.

---

## 11. Technical and Gameplay Architecture

This is a gameplay architecture change, **not just a HUD change**. The player and enemies need real positions, velocities or movement intent, collision, spatial attacks, hitboxes/hurtboxes, projectiles, cooldowns and world-state persistence.

Keep reusable combat rules such as damage calculation, class abilities, resources, statuses, loot and progression. Replace assumptions that each fight must be a separate instance with a unified world-space simulation.

Technical design should account for:

- Consistent world coordinates and sub-tile collision.
- Fixed or bounded simulation timing independent of frame rate.
- Input responsiveness and attack/cast state handling.
- Spatial targeting, line of sight, hitboxes and damage validation.
- Projectile travel, area effects, enemy pathfinding and multiple simultaneous opponents.
- Threat state, pursuit/leash logic and enemy recovery.
- Save/load correctness for world enemies, drops, cooldowns and ongoing effects.
- Reasonable performance with many active entities and particles.
- Keyboard/mouse usability, controller-ready bindings and accessibility settings.

Preserve the legacy turn-based rules or build as a compatibility/testing reference if useful; do not allow them to dictate the new graphical experience. Do not build two competing combat implementations when shared engine services can be used.

---

## 12. Delivery Phases — Managed Internally by Claude Gaming Studio

The phases below describe **implementation scope and measurable progress**, not a mandatory sequence, external approval chain, or reason to stop parallel work. The **Claude Gaming Studio** decides how to subdivide, overlap, delegate, implement, and integrate the work. Multiple phases may progress simultaneously. Existing functioning systems should be reused wherever sensible.

**Studio leads:**

- **Wren — Development Lead:** Owns core gameplay architecture, in-world movement and combat implementation, enemy/world integration, and technical coordination with Claude Gaming Studio specialists.
- **Pixie — UI/UX Lead:** Owns the complete action-RPG interface, input presentation, targeting/HUD behavior, player feedback, and frontend integration.
- **Tally — QA Lead:** Owns continuous playable-build tests, regressions, balance evidence, and identifying serious gameplay defects as work lands.
- **Claude Gaming Studio:** Supplies its integrated game-development specialists for implementation, combat design, AI, animation, VFX, asset production, technical support, and other disciplines as needed. The studio handles its own delegation and day-to-day decisions.
- **Rook — Backup Developer:** Remains available but receives **no assignments from this report or the Claude Gaming Studio**. Only the Creative Director will assign work to Rook directly.

### Phase A — Continuous World-Combat Foundation

Implement free directional movement, responsive aiming and basic attacks, spatial hit detection, player and enemy collision, dodge behavior, and hostile enemies that remain visible in the explorable world. Remove the automatic transition into the separate combat box from the primary graphical game.

### Phase B — Combat Depth and Class Identity

Adapt the existing cooldowns, six-slot skill bar, damage and status rules to world-space attacks. Support weapon ranges, projectiles, area attacks, skills, defensive timing, resource management, and distinct class playstyles. Preserve useful existing functionality rather than reimplementing it unnecessarily.

### Phase C — Living Enemies and World Encounters

Add patrol and detection behavior, pursuit, tactical movement, multiple enemies, terrain and line-of-sight awareness, disengagement, enemy recovery, and world-integrated pickups. Ordinary encounters and ambushes must work without a battle transition.

### Phase D — Bosses and Chapter One Integration

Bring the Crow Warden and other major encounters into world space with readable attack patterns, appropriate encounter boundaries, and recovery behavior. Connect combat outcomes with quests, XP, loot, equipment, dialogue, saves, exploration and Black Flight.

### Phase E — Gameplay Feel, Stability and Polish

Refine control responsiveness, camera, animation, VFX, audiovisual feedback, HUD clarity, class balance, accessibility, save/load and performance. Tally conducts practical browser playtests throughout—not only at the end. Issues discovered here should be fixed as part of ongoing development.

**These phases are owned and coordinated by Claude Gaming Studio.** They are a planning aid, not sign-off gates. Agents are expected to produce working software, test it, fix regressions and continue without repeatedly escalating routine decisions.

---

## 13. Demonstrable Gameplay Outcomes

The target experience is demonstrated when:

1. The player moves freely while attacking, defending and using skills.
2. Enemies exist in the world before combat begins and react to player actions.
3. No separate battle screen opens for ordinary enemies or bosses.
4. Basic attacks, projectiles, melee arcs and area skills use actual world positions.
5. Dodging, guarding and class-specific movement are meaningful and responsive.
6. Enemies can approach, attack, pursue and disengage without breaking navigation.
7. Several enemies can participate in one continuous world-space encounter.
8. Bosses have positional attacks and readable patterns in the environment.
9. Loot is collected from the world with persistent, nonduplicating rewards.
10. Quests, XP, equipment and progression respond to the same world events.
11. The HUD functions during exploration and combat without switching layouts into an instanced battle UI.
12. Saving and loading preserves valid world and combat state.

These outcomes are **evidence of the intended experience, not a sequence of permission gates**. Direct browser testing remains part of Tally’s continuing QA responsibilities. Work should be merged and improved incrementally rather than held back until the entire list is complete.

---

## 14. Final Creative Direction

ENSO's Last Stand is transitioning from a menu-driven, encounter-based RPG into a dark fantasy action RPG.

The intended experience is simple to describe: walk through a forest, see an enemy, move and attack in that same forest, react to its attacks, defeat it, pick up its reward and keep exploring—**without leaving the world**.

The team should preserve what is valuable in the current combat, loot, classes and narrative, while rebuilding the interaction model to serve this continuous playstyle.

**The world is the battlefield. Combat is something the player does while exploring, not a separate screen the player enters.**

— **Creative Director, ENSO Studios**
