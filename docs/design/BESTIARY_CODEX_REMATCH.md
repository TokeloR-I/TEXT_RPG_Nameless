# Bestiary, lore codex, boss name cards and rematches

Research round two (docs/design/GAME_EXPERIENCE_RESEARCH_ROUND2_2026-11-25.md), picks #8 and #9. Tokelo approved them on 2026-11-25.
Bosses stay hard. No class was changed.

## Where it lives

| Part | File |
|---|---|
| Content: bestiary entries, lore entries, boss epithets, rematch names and trophies, ring dialogues | `src/story/codex.js` (`storyData.codex`) |
| Engine: what you know, rematch start, end and scaling, the Journal views | `src/engine/codex.js` |
| World: the feather rings and the remembered fights on existing maps | `src/world/rematch-maps.js` (added by `zone1.js`) |
| Arena seal, name card fx, stalemate release | `src/action/sim.js` |
| Menu tabs (Bestiary, Codex), name card, slow motion on the last blow, iron bars on sealed exits | `ui/world-ui.js`, `world.css`, `ui/audio.js`, `ui/menu-icons.js`, `ui/world-render.js` |
| Rematch scaling numbers | `actionRules.rematch.scale` in `src/data.js` |
| Tests | `tests/116-bestiary-codex-rematch.test.js` |

## Bestiary (Journal menu, "Beasts")

Every enemy in the world has an entry, sorted by region (Blackbriar Vale, Hrimvald, The Dominions). An entry fills in three steps:

1. **Met** (it joined a fight against you): name, kind and lore. Before that it shows as `???`.
2. **Beaten once**: XP, the conditions it inflicts (read from its skills' `inflict` effects), what hurts it (Radiant blows against undead), traits and boss phase/rage notes.
3. **Beaten 3 times**: what it drops (spoils profile, food drops, boss drops).

A boss tells you everything the first time it falls. Saves from before this PR learn their beaten bosses from story flags, so nothing is lost. Illusions, hallucinations and summons don't count as kills.

Some lore lines open only later in the story (`more: [{ if, text }]`). For example, the Warden's entry names Bran Ashdown only once Bran is buried.

## Lore codex (Journal menu, "Lore")

There are 24 entries in four groups: You, Blackbriar Vale, Hrimvald and Below. Each opens on a story condition (a flag, a talk, an inspected object or an entered map). `storyAllows` now also accepts `seen: [...]`. Entries come from ENSO_LORE_BIBLE.md and the chapter lore docs. They hold no [mid] or [late] spoilers and use no door motif.

## Boss name card and arena seal

When a boss group engages, the screen shows a name card with the boss's name and epithet (for example, "Keeper of the First Seal"). Iron bars drop on every exit of the map, the gate sound plays and dust kicks up. Walking into a sealed exit bounces you back with "The way out is shut. Finish the fight."

The seal opens when no engaged boss is left alive. To prevent a softlock, it also opens after 20 s in which nobody's HP changed (`rules.combat.sealStalemateMs`). Falling and respawning reset it.

The killing blow on a boss plays half a second of slow motion with a heavier fall sound.

## Rematches (rings of black feathers)

Once a boss has fallen in the story and the crow is with you (`aspect_nahemoth`), a ring of black feathers lies in that boss's own arena. No new areas were built (the area-art rule). Choosing "Remember the fight" makes the remembered boss stand up beside where it first stood. The name card reads "As the crow remembers".

- Only one remembered fight is active at a time. Winning, falling or leaving the map ends it, and only a win counts.
- **First win**: you get a trophy, kept in the Bestiary (Crooked Feather, Ember of the Altar, Link of Two Lights, Grave-Earth Rivet, Bog-Iron Pin, Starless Shard, Violet Glass Fly, Undented Plate, Silent Plume). It drops ordinary elite spoils once (guardian profile, no second authored boss item). XP is given on every win.
- **Later wins**: XP and the win count.
- **Scaling**: above the boss's story level, each extra player level adds +5% HP, +10% ATK and +4% DEF (`actionRules.rematch.scale`). The Dominion rulers already scale with `scaleToLevel` and keep that. A boss scaled to your level stays a hard fight on a replay.

Rings: the Warden (sanctuary), Aurevain (inner Kloster), the Binding Echo (Gullstrand coast), Bjarki (barrow), the Man in the Peat with two mire-dead (Járnmyr), Lucifero (Underworld arena), Beelzebub, Slotos and Plumede (their Dominions).

## Saves

The book lives in `stats.bestiary` and `stats.rematches`, created on first use, so the save layout is unchanged (no FORMAT_VERSION bump). CONTENT_REVISION is 23.

## Notes for Gauge and Thorne

- The rematch scale numbers are a first pass. Bot win rates per class on a level-matched rematch are worth a run.
- `actionRules.bosses.*.frontalShield`, `hyperArmor` and `flee` are not read anywhere in the sim. The bestiary therefore reports only traits the game actually uses. Either wire those fields up or drop them.
