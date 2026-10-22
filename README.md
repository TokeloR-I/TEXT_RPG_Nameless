# Enso's Last Stand
*(working titles: Nameless RPG / ENSO's Last Stand)*

**About the game, story and features:** [docs/ABOUT_THE_GAME.md](docs/ABOUT_THE_GAME.md)

Turn-based dungeon RPG. The game rules live in a UI-free engine, so the same
engine can drive the text version now and a Phaser side-scroller later.

## Play
- Double-click `index.html`. A single self-contained `EnsosLastStand.html` is attached to every CI run (Actions → latest run → Artifacts), or build it with `npm run build`.
- Terminal: `npm run play` (add `-- --seed 42` to reproduce a run exactly).

## Project layout
```
src/data.js       rooms, enemies, skills, classes, evolutions (pure data)
src/effects.js    effect registry: one entry per effect type
src/statuses.js   status pipeline: stacking, durations, Control Resistance, overflow, cleansing, reactions
src/engine.js     all rules: exploration, combat, leveling, evolution (no DOM)
ui/text-ui.js     the only file touching the DOM: typing effect, HUD
tests/            headless tests (node tests/run-tests.js)
tools/            balance bot, backlog, pending decisions, terminal player, single-file build
docs/             design status, engine reports, approved design handoffs (docs/design/)
qa/               QA & balance reports
```

**Working on this repo (human or AI): read [AGENTS.md](AGENTS.md) first.**

## How the engine talks to a front end
```js
const engine = new ENSO.GameEngine({ seed: 1 });   // seed optional
engine.start();             // -> [{type:'clear'}, {type:'text', text, important, html}, ...]
engine.input('attack 1');   // -> events for whatever happened
engine.getState();          // -> player, combat, enemies, minions (for HUD / sprites)
```

## Commands
`go <dir>` or `n/s/e/w`, `take <item>`, `use <item>`, `i`, `look`, `engage`, `cl`, `help`, `quit`, `start`
Combat: `attack 1`, `<skill or alias> <target>`, `use <item>`, `flee`
Dev cheats: `add_xp <n>`, `become_hollow_king`, `unlock_events`

## Balance testing
`node tools/balance.js` — a bot plays the full dungeon many times per class and prints win rates.
Try changes without editing data: `node tools/balance.js --set gameRules.postFightHealPct=0.35`
Balance knobs live in `gameRules`, `resourceRules` and `itemDefinitions` at the bottom of `src/data.js`.

## Pending design decisions
`node tools/pending-decisions.js` — every status-system value still awaiting approval (pending = feature off).

## Adding a skill effect
1. `node tools/missing-effects.js` to see the backlog.
2. Add an entry in `src/effects.js` (hooks are documented at the top of the file).
3. Add a test in `tests/run-tests.js`, then run `node tests/run-tests.js`.
4. `node tools/build-single.js` to refresh the single-file build.

Requires Node.js 18+ for tests and tools only. The game itself needs just a browser.

## License
GPL-3.0, see [LICENSE](LICENSE). The original single-file game is kept in `legacy/text-adventure-v0/`.
