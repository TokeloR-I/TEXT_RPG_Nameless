# Enso's Last Stand
*(working titles: Nameless RPG / ENSO's Last Stand)*

**About the game, story and features:** [docs/ABOUT_THE_GAME.md](docs/ABOUT_THE_GAME.md)

Turn-based dungeon RPG. The game rules live in a UI-free engine, so the same
engine can drive the text version now and a Phaser side-scroller later.

## Play
- **Explore the world (new, Zone 1):** double-click `world.html`. Walk with the arrow keys or WASD, interact with E / Enter, Esc for the menu.
  Walk into a visible enemy to fight it; battles are the same turn-based fights as the text game, chosen from a menu.
- **Classic text version:** double-click `index.html`. Single self-contained builds of both (`EnsosLastStand.html`, `EnsosLastStand-World.html`) are attached to every CI run (Actions → latest run → Artifacts), or build them with `npm run build`.
- Terminal: `npm run play` (add `-- --seed 42` to reproduce a run exactly).

## Project layout
```
src/data.js       rooms, enemies, skills, classes, evolutions (pure data)
src/effects.js    effect registry: one entry per effect type
src/statuses.js   status pipeline: stacking, durations, Control Resistance, overflow, cleansing, reactions
src/engine.js     engine core: public API, output, save/restore, command routing (no DOM)
src/engine/       the rest of the rules, one module per area:
  exploration.js    rooms, items, resting
  combat.js         fight flow, turn order, enemy and minion turns, marks
  combat-input.js   player commands in a fight, menus, targeting
  skills.js         casting, damage pipeline, primitives the effect registry calls
  progression.js    XP, levels, evolution, skill trees
  world.js          world intents: pickups, map encounters, run flags (graphical world only)
  actions.js        getAvailableActions() and act(): the structured action API both front ends use
  timers.js         turn-opportunity hooks and combat timers (durations counted in turns)
  util.js           seeded RNG and small helpers
src/world/        the explorable world (no DOM):
  world.js          map model: collision, tile-step movement, transitions, pickups, encounters, validation
  zone1.js          Zone 1 (the Forgotten Homestead) map data: 6 maps
ui/text-ui.js     text front end (index.html): typing effect, HUD
ui/world-render.js  canvas painter for the world (no image files)
ui/world-ui.js    world front end (world.html): title, movement, dialogs, menus
ui/battle-menu.js turns the engine's availability list into the battle menus (no DOM, tested)
tests/            headless tests, one file per area (NN-area.test.js) + helpers.js
tools/            balance bot, backlog, pending decisions, terminal player, single-file build
docs/             design status, engine reports, approved design handoffs (docs/design/)
qa/               QA & balance reports
```

**Working on this repo (human or AI): read [AGENTS.md](AGENTS.md) first.**

## How the engine talks to a front end
```js
const engine = new ENSO.GameEngine({ seed: 1 });   // seed optional
engine.start();             // -> [{type:'clear'}, {type:'text', text, important, html}, ...]
engine.input('attack 1');   // -> events for whatever happened (the text game)
engine.getState();          // -> player, combat, enemies, minions (for HUD / sprites)

// Structured interface (Phase 1, architecture/PHASE1_ENGINE_INTERFACE_SPEC.md §4)
engine.getAvailableActions();  // -> { mode, awaiting, actions: [{ type, skillId, enabled, reason, targets, … }] } (pure)
engine.act({ type: 'skill', skillId: 'Grave Bolt', targetId: 'enemy_1' });  // -> { ok, events, error? }
```
`input()` is a text translator onto the same rules as `act()`; refusals carry a code (`NOT_ENOUGH_RESOURCE`, `INVALID_TARGET`, …).

## Commands
`go <dir>` or `n/s/e/w`, `take <item>`, `use <item>`, `i`, `look`, `engage`, `cl`, `help`, `quit`, `start`
Combat: `attack 1`, `<skill or alias> <target>`, `use <item>`, `flee`
Dev cheats: `add_xp <n>`, `become_hollow_king`, `unlock_events`

## Balance testing
`node tools/balance.js` — a bot plays the full dungeon many times per class and prints win rates.
Try changes without editing data: `node tools/balance.js --set gameRules.postFightHealPct=0.35`
Balance knobs live in `gameRules`, `resourceRules` and `itemDefinitions` at the bottom of `src/data.js`.

## Adding to the world
Maps, exits, pickups and enemies are data in `src/world/zone1.js`. `npm run world` prints and checks them.
Full guide: [docs/WORLD_MAPS.md](docs/WORLD_MAPS.md).

## Pending design decisions
`node tools/pending-decisions.js` — every status-system value still awaiting approval (pending = feature off).

## Adding a skill effect
1. `node tools/missing-effects.js` to see the backlog.
2. Add an entry in `src/effects.js` (hooks are documented at the top of the file).
3. Add a test in the matching `tests/NN-area.test.js`, then run `npm test`
   (or only some files: `node tests/run-tests.js rogue qa1`).
4. `node tools/build-single.js` to refresh the single-file build.

Requires Node.js 18+ for tests and tools only. The game itself needs just a browser.

## License
GPL-3.0, see [LICENSE](LICENSE). The original single-file game is kept in `legacy/text-adventure-v0/`.
