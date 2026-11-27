# What ENSO still lacks: round two (studio research, 2026-11-25)

Tokelo felt things were still missing after round one ([GAME_EXPERIENCE_RESEARCH_2026-11-25.md](GAME_EXPERIENCE_RESEARCH_2026-11-25.md),
PR #298). This round looks wider: progression and loot, exploration, travel, onboarding, accessibility, enemies,
bosses, companions, endgame and replay, quality of life, polish, and classes that exist in the lore or data but can't
be reached or cast. Research only: nothing here is built yet.

Every finding was checked against the code on `main` (after PR #298). Numbers marked *estimate* are worked out from
the data, not from a playthrough. Comparisons are to strong 2D/top-down action RPGs: Hades, Hyper Light Drifter,
Death's Door, Tunic, CrossCode, Children of Morta, Moonlighter, Diablo/Grim Dawn (loot), Dark Souls (rest/respawn),
Stardew Valley (village life).

**Left out on purpose:** smoother camera, the mirror, `!` quest markers (being built in another thread); villager
day/evening schedules and music (waiting on Tokelo); everything round one already shipped.

## Already strong (not recommended again)

Real-time combat with dodge, guard, parry, lock-on and combo strings; enemy groups with roles (ranged hexers keep
distance); boss phases and rage; enemy conditions; 4 class webs + 5 legendary webs; cooking, farming, smithing,
tempering; quest tracker; save migrations; touch, gamepad, sound; Black Flight fast travel once the crow aspect is
earned.

## What the code shows

| Area | What exists | What's missing |
|---|---|---|
| Levels | XP to next level starts at 100 and grows ×1.5 per level (`progression.js`). | Chapter 1 + 2 give ~2,100 quest XP and ~5,800 from every placed fight. Gauge's 2026-11-24 pass set this pacing on purpose (level 4 at the Warden, about 8–9 at the end of chapter 2, the Dominions toward Aurevain's level 10), so stage 4 (L11) and stage 5 (L14) are later-chapter content. **Correction (same day):** this is not a bug. Only flag for later: past L14 the ×1.5 curve needs ~38,600 XP and keeps growing fast, which Gauge should revisit before chapter 3. |
| Class unlock events | Skill Web gates `requiresEvent` (`skill-web.js:386`). | The only thing that opens an event gate is the dev flag `eventsUnlocked`. **Dark Knight** ("betrayal event") and **Dragon Slayer** ("slaying a named dragon boss") are cheat-only; there is no betrayal scene and no dragon in the game, so Berserker's L11 and L14 stages are blocked too. The Knight's prestige quest, the **Tourney of Crowns** (it grants Mounted Charge), doesn't exist either, though the Knight is a level 5 stage. |
| Legendary classes | Fallen Seraphim, Fenrir's Heir, Devil Union have real story unlocks. | **Deathlord Eternal** needs "the Throne of Bones" event: not in any story file. **The Hollow King** (die holding 3 souls during the Throne of Bones) is reachable only by the `become_hollow_king` cheat. **Reality Breaker**'s event is literally "not designed yet" (`data.js:1369`). Both Deathlord and Reality Breaker also need L14 stages. |
| Ultimates | Most `cost: 'all'` ultimates have live versions. | **Rearrange Turn Order** (Eternal Architect, Chronomancer L14) said "Not available in live combat yet". **Built (follow-up PR):** live, every enemy is Out of Order for 9 s (half speed, wind-ups 60% slower) and you get Haste. 11 evolution skills have no `liveDescription`, but checked one by one their text has no turn wording, so no change was needed. |
| Lore-only classes | Lore bible §8. | **Great Sage** (Sun Wukong, Chinese region), **Black Pharaoh** (Egyptian region; the name is also Bone Warden's L14 stage, a clash to resolve), a Japanese legendary "to design". These belong to future chapters. |
| Loot | 5 rarities, random equipment with affixes (`loot.js`). | Only **6 affixes** (keen, stalwart, focused, brutal, arcanist, guarding), all flat stats. Only **2 of 54** encounter groups come back after resting (`gameRules.restRespawns`), so once a map is cleared there is nothing to farm. No elite/champion monsters in the world, though `lootRank: 'elite'` exists. Drops arrive as text notices, not as things that pop out of the enemy. |
| Exploration | 216 inspect points, 29 forage spots. | Only **7 pickups** in ~35 maps. No breakables, no hidden caches, no "you found everything here" count. Inspect texts reward reading but never the bag. |
| Travel | Black Flight to attuned anchors (`story.js:744`). | Only **6 anchors** (homestead, Shamefield, Skeldvik, Silent Field, Rúnadal, Hrafnholm): none at the Kloster, the road, Featherwatch, Birkholt or Járnmyr. **No world map or minimap**; Black Flight hides in the Esc menu's Crow tab. |
| Onboarding | Help text and key hints in menus. | No first-time prompts: dodge, guard, parry, the skill bar, quick heal (H), cooking and the Skill Web are never taught in play. |
| Accessibility | Display mode, reduced motion, graphics quality, sound sliders. | No key rebinding, no text size, no colour-blind safe telegraphs, no screen-shake strength, no hold/toggle options, no assist options. |
| Bosses | Phases, rage, telegraphs, boss HP bar. | No title card when a boss fight starts, no arena seal you can see, no way to fight a boss again. |
| Companions | Summons follow you between fights (`world.followers`). | No NPC who fights beside you, though the story has natural ones (Sergeant Kess, James, Runa). |
| Endgame / replay | Underworld five-wave arena, Dominion bosses. | No new game plus, no boss rematches, no challenge or arena mode, no bestiary or achievements to complete. |
| Death | Respawn at the map's entry with 50% HP, no loss. | A playtester found little survival pressure. Death costs nothing. |

## Ranked findings

Impact: how much a player would notice. Effort: S (a day or two), M (a PR of a few days), L (several PRs or needs
art/story from Tokelo).

| # | Missing | Impact | Effort | Owner | Like |
|---|---|---|---|---|---|
| 1 | **Make the locked classes reachable.** (a) Gauge checks the level curve against chapter content: stage 4/5 and the L10 trial are out of reach. (b) Build the missing unlock events: the Throne of Bones (opens Deathlord Eternal and the Hollow King's story unlock), the Dark Knight betrayal, a Reality Breaker event. (c) Live redesign of Rearrange Turn Order (for example: freeze every enemy's next attack timer and let you pick who acts first after). (d) Live descriptions for the 11 skills above. | high | (a) S, (b) L, (c) S, (d) S | Gauge, Thorne, Ashby, Rook | Every class tree a player sees should be climbable |
| 2 | **A world that refills: rest respawns and elites.** Resting at a bed or hearth brings back every non-story group (not just 2), like a Dark Souls bonfire. Some groups roll an **elite** with one visible modifier (Frenzied, Shielded, Venomous, Thorned) and a coloured name, worth `lootRank: 'elite'` drops. | high | M | Thorne, Gauge, Hawk | Dark Souls bonfires, Diablo champions |
| 3 | **Loot worth chasing.** 15–20 more affixes, including ones that change a skill (Fireball leaves a burning patch, dodge leaves a decoy), and a few named uniques per chapter that only drop from elites and bosses. Drops pop out of the enemy with a rarity-coloured glint and get picked up on walk-over. | high | M | Ledger, Gauge, Quill | Grim Dawn, Diablo, Hades boons |
| 4 | **World map and more Black Flight anchors.** A map screen (M key, a tab on touch) showing visited areas, where you are, tracked quests and anchors, fly from it. Add anchors at the Kloster, Featherwatch, Birkholt and Járnmyr. | high | M | Pixie, Moss | Hyper Light Drifter, CrossCode |
| 5 | **Teach the game in play.** One-time prompts the first time each thing matters: first enemy (attack, dodge), first enemy windup (guard/parry), first low HP (H to heal), first skill learned (bar), first hearth (cook). Shown for the device in use (keys, pad or touch) and switchable off. | high for new players | S–M | Pixie, Hollis | Death's Door, Hades |
| 6 | **Accessibility pass.** Key and pad rebinding, text size, colour-blind safe telegraphs and status icons (shape as well as colour), screen-shake strength, toggle instead of hold for guard and sprint. | med–high | M | Hollis | Celeste, The Last of Us standards |
| 7 | **Exploration that pays.** Breakable pots and crates (code-drawn), hidden caches behind inspect points, lore pages you can collect, and a per-area "found 3 of 5" count. | med–high | M | Moss, Quill | Tunic, Zelda-likes |
| 8 | **Bestiary and lore codex.** A Journal tab that fills as you fight (weaknesses, conditions they inflict, drops) and as you collect lore pages. Puts the lore bible, a standing priority, in front of players. | med | S–M | Pixie, Wick | Hades Codex, Hollow Knight Hunter's Journal |
| 9 | **Boss presentation.** Name card and the gate slamming shut when a boss fight starts; slow-motion on the last blow; a shrine or the Warden's grave to fight beaten bosses again for a trophy. | med | S | Pixie, Quill, Hawk | Hollow Knight, Dark Souls |
| 10 | **Death with a small stake.** You drop part of your carried gold where you fell and can walk back for it. Answers the "too little survival pressure" note without making bosses harder. | med | S | Thorne | Dark Souls souls, Hollow Knight shade |
| 11 | **A companion per chapter.** Sergeant Kess in chapter 1, Runa in chapter 2: fights beside you with the summons pipeline, has barks, can be told to hold or follow. | high | L | Thorne, Hawk, Ashby | Children of Morta, Dragon Age |
| 12 | **Enemy behaviour.** Enemies that flee at low HP, call nearby groups, or turn on each other (wolves vs raiders). | med | M | Hawk | Hyper Light Drifter, Death's Door |
| 13 | **Quality of life.** Sort the bag, sell all junk, "new" badges on unseen items and skills, auto-track the nearest objective, a stash reachable from every hearth. | med | S | Pixie | most modern ARPGs |
| 14 | **Juice.** Level-up burst and short slow-motion, low-HP heartbeat and edge glow, rarity beams, weapon trails on heavy blows. | med | S | Quill, Echo | Hades, Dead Cells |
| 15 | **Endgame and replay.** New game plus (keep level and webs, enemies scale, bosses always enraged), a Dominion trial ladder, achievements. Best once chapter 2 is finished. | med now, high later | M–L | Thorne, Gauge | Hades heat, NG+ in Souls games |
| 16 | **Future legendary classes.** Great Sage, the Egyptian legendary (rename it or Bone Warden's stage), the Japanese legendary: designed with each new chapter, after Tokelo's area pictures. | later | L | Ashby, Thorne | — |

## Recommended top picks for Tokelo to approve

1. **#1 Make the locked classes reachable**, starting with the level-curve check (a), the live Rearrange Turn Order (c)
   and live descriptions (d), then the Throne of Bones event (b) because it opens two legendary classes at once.
   The Dark Knight betrayal and Reality Breaker event need a story call from Tokelo. Dragon Slayer needs a dragon
   boss and its arena picture.
2. **#2 + #3 Refilling world and loot worth chasing.** Together they give the game a loop between story beats:
   rest, hunt elites, find gear that changes how a skill plays.
3. **#4 World map and more anchors.** Chapter 2 doubled the map count; a map and more anchors cut the walking.
4. **#5 + #6 Onboarding and accessibility.** Cheap, and they stop new players bouncing off a hard game.
5. **#8 + #9 Bestiary, lore codex and boss presentation.** Small builds that make the lore and bosses feel big.

**Needs Tokelo's creative call before anyone builds it:** #10 (dropping gold on death), #11 (which NPCs become
companions), the Dark Knight betrayal and Reality Breaker events in #1, and #16.

## Notes

- Nothing here nerfs a class (Tokelo's rule). The level-curve fix speeds progress; it does not cut power.
- Rest respawns (#2) only bring back ordinary groups: story fights, bosses and one-shot encounters stay beaten.
- New areas for #1 (a dragon arena) or #7 follow the area-art rule: list the area for Tokelo and wait for the picture.
- Any new item or affix layout needs a save migration (`src/engine/save.js`); new content bumps `CONTENT_REVISION`.
