# What ENSO is missing next to strong action RPGs (studio research, 2026-11-25)

Tokelo asked the team to research which game elements and experiences would most improve ENSO: controls, combat,
NPC liveliness and character customization. Thorne (game design) covered controls, combat feel and customization,
Hawk (AI) covered NPCs, and Echo (audio) covered sound. Wick wrote the bark lines. Each finding was checked against the
code first, so nothing below is a feature the game already has.

## Already strong (not recommended again)

Dodge with i-frames, guard and parry, Tab lock-on, screen shake, floating damage numbers, enemy hurt flash and stagger,
flashing telegraphs, enemy combo strings, the 8-way touch stick, the 10-step character creator, the unified menus
(PR #297).

## Ranked findings

| # | Missing | Impact | Effort | Status |
|---|---|---|---|---|
| 1 | **Sound.** The game made no sound at all: no hits, no footsteps, no menu clicks. | high | M | Done in this PR (ui/audio.js) |
| 2 | **Designed combat data that the sim never read:** the 150 ms input buffer and the warrior and rogue 3-hit combo strings (`actionRules.player.inputBufferMs`, `weapon.combo`). | high | S–M | Done |
| 3 | **Hit-stop**: a few frames of stillness when a blow lands, longer on crits, parries and kills. | high | S | Done (presentation only) |
| 4 | **Crits were invisible in live fights**: the engine rolled them but only said so in the text log. | high | S | Done (gold numbers, bigger sparks, own sound) |
| 5 | **Villagers were statues**: they always faced down and never spoke unless you pressed E. | high | S–M | Done: they turn to face you, and 52 of them say 192 ambient lines (some react to your class and quests) |
| 6 | **No gamepad.** | high | M | Done (ui/gamepad.js) |
| 7 | **Unaimed attacks whiff**, worst on touch: keyboard and touch attacks go exactly where you face. | high on mobile | S | Done: aim assist within ±35° (`actionRules.player.aimAssist`) |
| 8 | Haptics on phones for being hit, parries and boss phases. | med | S | Done |
| 9 | Camera smoothing and look-ahead toward where you face or your lock target. | med | S | Done (second batch): the camera eases after you and leans 1.6 tiles ahead while you move, a third of the way to a lock-on target |
| 10 | Change your look after creation (a mirror or wardrobe at the homestead reusing the creator steps). | med | S | Done (second batch): a standing mirror in the homestead house reopens the appearance editor |
| 11 | "Has something for you" markers (`!`) over NPCs with a quest or objective waiting. | med | S | Done (second batch): `!` = talking now offers a quest you haven't started, `?` = an active quest sends you to them (`engine.npcMarker`, pure) |
| 12 | Cancel matrix in `actionRules.player.cancel` (guard cancels recovery, skill fizzle refund) is still unread. | med | M | Next |
| 13 | Key rebinding (accessibility). | med | M | Later (Hollis) |
| 14 | Idle routines (smith hammers, baker kneads) and NPC reactions to nearby fights. | med | M | Later |
| 15 | Day/evening phases with NPC schedules. | high | L | Needs Tokelo's direction: changes every map's lighting and where people stand |
| 16 | Ambient sound beds (wind, fire, sea) per map, and music. | med | M | Music is a creative-direction call for Tokelo |
| 17 | Armour drawn on the character, transmog. | med | L (art) | Waits for the layered sprite work |

## Notes

- Nothing here nerfs a class. The combo strings use Gauge's existing timings; the engine still deals the basic attack's
  damage on every step.
- Every sound is synthesised in the browser (Web Audio): no audio files, nothing copied, the game stays
  double-click playable. Sound settings are per browser (Settings → Sound, Combat sounds, Menu and voice sounds;
  M mutes anywhere) and never part of a save.
- Barks are pure data (`src/story/barks.js`) with story conditions; the UI picks one and draws a bubble. No save
  change.
