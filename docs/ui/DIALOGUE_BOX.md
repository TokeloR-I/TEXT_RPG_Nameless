# Dialogue box and notifications (Pixie; QA Tally)

Owner request (Tokelo, 2026-11-03): after a quest hand-in, the dialogue box filled up with XP, quest-complete and
NPC text all at once, and some text was big enough to cover the screen. The box should hold about two sentences
and move on when the player presses Enter or clicks. System messages belong outside the box.

## What we looked at
Common patterns in console and PC RPGs and in dialogue tools:

- **Short pages.** Classic JRPG boxes hold 2 to 3 lines. A long speech is split into pages, and the player turns
  each page ([How to Make an RPG: textbox](https://howtomakeanrpg.com/r/a/rpg-textbox.html),
  [good dialog box](https://howtomakeanrpg.com/r/a/good-dialog-box.html)).
- **Type out, then advance.** The text types out. The first press shows the whole page, and the next press turns
  it. Yarn Spinner's line view works the same way
  ([UserRequestedViewAdvancement](https://docs.yarnspinner.dev/2.3/api/csharp/yarn.unity/yarn.unity.lineview/yarn.unity.lineview.userrequestedviewadvancement)).
  Players must be able to read at their own pace, and motion can be turned off
  ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=1219)).
- **A nameplate and a "more" mark.** The speaker's name sits on a tab above the text. A blinking ▼ means there is
  another page, and ■ marks the last one ([dialogue UI notes](https://www.abratabia.com/game-ui-design/dialogue-ui.php)).
- **Choices come after the last page,** never on top of half-read text.
- **Rewards are not dialogue.** Quest complete, XP, items and level ups appear as short notifications at the edge of
  the screen. They don't need a key press, so they never interrupt a character's words
  ([quest UX](https://www.gamedeveloper.com/design/clearly-and-considerately-ux-designing-of-quest),
  [toast notifications for quests](https://bitqueststudio.itch.io/random-quest-generator-for-rpg-maker-mz/devlog/1063051/random-quest-generator-v101-toast-notifications-update)).

## The rules (world.html)
1. **A page is at most two sentences and about 160 characters** (`ui/dialogue-pages.js`, `LIMITS`). An over-long
   sentence is cut at a comma or a word, with … at the break. Each authored line starts a new page. Ellipses
   ("You fall… and come to") and abbreviations ("Dr. Hale") don't end a sentence.
2. **The speaker goes on the nameplate,** taken from `Name: "…"` lines. The NPC's role and portrait show when the
   speaker is the NPC being talked to. Narration uses the object's or place's title.
3. **The player's own chosen line isn't repeated.** The player just picked it from the menu.
4. **Advancing:** Enter, Space, E or a left click on the box. The first press finishes the typing, and the next
   turns the page. Esc skips to the choices in a conversation, and closes a plain message box. The page count
   (2/5) is shown top right.
5. **Choices appear only on the last page,** under that page's text.
6. **Typewriter:** about 55 characters a second. It is instant when Settings → Motion is set to reduce (or the
   system asks for reduced motion).
7. **Size:** the box keeps one size, about three lines tall and never more than a third of the stage (46% when
   choices show). Text scales with the stage (`max(12px, 1.7cqw)`, down from 2.1cqw), as the UI-2 revision asks.
8. **Notifications:** the engine tags system lines with `notice` (see below). They stack top right, under the
   tracker, with a coloured edge and icon per kind. They stay visible over the dialogue box and over fights, fade
   after 4 to 6 seconds, and show at most 5 at a time. Live-fight rewards (drops, XP, loot) use the same feed.
9. A press that closes the box doesn't also talk to the NPC again (300 ms guard).

## Engine tags (`say(text, { notice })`)
| notice | lines | shown as |
|---|---|---|
| `quest` | Quest / Side quest started, complete (+XP), "Locals: 3/5" counts | gold `!` |
| `objective` | Objective: … | `◆` |
| `xp` | You gained N experience points! | `✦` |
| `level` | Level up, stats increased, unspent Skill Web points | `▲` |
| `item` | Received: …, crafted or harvested goods | `◈` |
| `gold` | Loot: N Gold · items | `◈` |

The text game (`index.html`, `npm run play`) prints these lines exactly as before. An untagged event keeps its old
shape (`{ type, text, important, html }`).

## Tests
`tests/94-dialogue-pages.test.js` covers the page rules, speakers, the player echo, notices, the typewriter clock
and the engine tags on a real quest completion and level up. In the browser, Tally checked the cellar
inscription, the coin purse (Loot as a notification) and Orin's first conversation (6 pages, then choices; the
Builder's Ledger as a notification) at 1280×760 and on a 390×844 phone.

## Left open
- Text speed setting (slow, normal, instant) in Settings. Today it follows the Motion setting.
- Turn-based battle log and the text game are unchanged.
- Gamepad A/B for advance and skip comes with UI-7.
