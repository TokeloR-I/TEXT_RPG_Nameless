# Combat v2: real-time combat

**Owner:** Wren (Primary Developer, dev lead for this overhaul) · **Requested by:** Tokelo, 2026-10-25
**Status:** first pass, in the engine and the world game. Numbers are Wren's first pass for Tally to measure and Vaelis to tune.
**Code:** `src/engine/realtime.js` · numbers: `realtimeRules` in `src/data.js` · tests: `tests/53-realtime-combat.test.js`

## The ask

> Change the combat system to a real-time combat system similar to Dimraeth. Skills sit on a skill bar: up to 6 active,
> with cooldowns, swappable as the character levels up and specialisations open. Effect skills (bleed, poison, …) go
> from round-based to time-based, stack up to 99, and the time taken to cool down is reduced per multiplier.
> Back up the current combat as a legacy version.

## Legacy (turn-based) combat is kept

- **Snapshot branch:** `legacy/turn-based-combat-v1` = `main` at `38f2aaf` (2026-10-25), the last build before this work.
- **Kept code path:** turn-based combat is still in the engine and is the default: `new GameEngine()` fights in turns,
  exactly as before. `new GameEngine({ combatMode: 'realtime' })` fights in real time. The text game (`index.html`,
  `npm run play`), `npm run balance` and every existing test use the turn-based mode. The world game uses real time;
  `world.html?combat=turn` plays it turn-based.

## What Dimraeth does (research, 2026-10-25)

Dimraeth (pixel-art action RPG, 2026) has real-time elemental combat that its wiki calls "deliberate rather than
frantic": enemies telegraph attacks with readable wind-ups; light attacks form the basic combo; five spells are equipped
at once from a large spell pool, so the loadout is the strategic choice; dash and guard have their own cooldowns;
balance patches tune spell cooldowns in seconds (e.g. Vehement Cleave 20 → 15 s); Bleed stacks (and teammates stacking it
trigger an execution), Poison builds up over time. Race + class form an archetype whose skill tree supplies more spells.
Sources: [Dimraeth wiki](https://dimraeth.wiki.gg/), [combat page](https://thegameswiki.com/dimraeth/wiki/combat).

What we take from it: telegraphed enemy wind-ups, a small loadout picked from a bigger pool, per-skill cooldowns in
seconds, a basic attack that is always there, stacking DoTs. What we don't (yet): stamina, dodge/dash, positioning in the
battle scene. Those are a design call for Vaelis (see "Open questions").

## Rules (engine)

The engine still owns no clock (AGENTS.md §3). The front end calls `engine.tick(ms)`; the engine simulates exactly that
much fight time and returns events. Same seed + same `tick`/`act` sequence = same fight (tested).

| | Rule | First-pass number (`realtimeRules`) |
|---|---|---|
| Basic attack | Free, any time, own swing timer from SPD. Not blocked by the global cooldown. | 3 s × 10 / SPD, 1.5–4.5 s |
| Skills | Use any time they're ready. Own cooldown, then the shared global cooldown. | GCD 1 s |
| Cooldowns | A skill's own `cooldown` (seconds) if set; else from its cost. | 4 s + 3 s per cost; cost "all" 15 s |
| Enemies | Act on their own clock from SPD; each action winds up first ("readies Heavy Slash!"), then lands. A stun during the wind-up interrupts it. | 2.5 s × 10 / SPD, 1.2–5 s; wind-up 0.6 s; first action after 1 s |
| Minions | Act on their own clock, no wind-up. | 2.5 s × 10 / SPD, 1.2–5 s |
| Pulse | What the end of a round did: resource regen, Soul Energy for dealing damage, Combo/Mark gains, bombs, Soul Feast, the round counter. | every 3 s |
| Statuses | Every status is timed. A duration written in turns lasts `secondsPerTurn` per turn. Statuses that ended at the holder's next turn (Guard) last `guardSeconds`. Marked for Death / Expose windows are timed too. | 3 s per turn; Guard 3 s |
| DoTs | Tick on their own clock for their timed duration. Damage per tick = value × stacks (unchanged). | tick 1 s |
| Stacking | Every damage-over-time status (Bleed, Poison, Infection, Burn, …) stacks to **99**. Control, marks and buffs keep their caps. | 99 |
| "Cooldown reduced per multiplier" | **Wren's reading:** each stack above 1 shortens the DoT's tick interval: `interval = tick / (1 + 0.02 × (stacks − 1))`, never below the floor. More stacks = more damage per tick *and* faster ticks. | 2% per stack, floor 0.25 s (99 stacks → 0.34 s) |
| Stunned player | Can't act until the stun runs out (refusal code `STUNNED`). | — |
| Control Resistance | Unchanged rules. Every action (or skipped action) is one opportunity, so CR gain/decay, combat timers and Possession still use the T-0 hooks. | — |
| Possession | No pause in real time: the possessed enemy's next action hits one of its own allies. | — |
| Eternal Architect (set turn order) | No turn order in real time; the effect has nothing to do there yet. | — |

### Skill bar

- `player.skillBar`: 6 slots (`realtimeRules.skillBar.slots`). The basic attack needs no slot.
- A newly learned skill (level-up stage, branch/specialisation, trait) takes the first empty slot, once. A skill you take
  off the bar stays off until you put it back.
- `act({ type: 'set_skill_slot', slot, skillId })` puts a learned skill in a slot (a skill already on the bar swaps
  places); `skillId: null` clears the slot. Refused in a fight (`IN_COMBAT`).
- In a fight: `act({ type: 'skill_slot', slot })` uses that slot's skill on the held target.

### API for front ends

- `engine.tick(ms)` → events (a slice is capped at `maxStepMs`).
- `engine.act(...)` in a real-time fight: `attack`, `skill`, `skill_slot`, `set_target`, `use_item`, `flee`. With no
  target given, the held target (or the first living enemy) is used.
- `engine.getAvailableActions()` → `{ awaiting: 'realtime', actions, skillBar }`; skill options carry `cooldownMs`,
  `readyInMs` and the refusal reason (`ON_COOLDOWN`, `GLOBAL_COOLDOWN`, `STUNNED`, …). Front ends never re-derive this.
- `engine.getRealtimeState()` (pure; `null` outside a real-time fight) → the clock, the GCD, the basic swing, per-skill cooldowns, each enemy's next
  action and wind-up, the skill bar with its cooldowns. `engine.getSkillBar()` → the 6 slots. Both are kept out of `getState()` so the golden
  replay hash is unchanged. Status instances in a real-time fight carry `rtEndsAt` / `rtTotalMs`.

## Team plan (Claude Code Game Studios roles on ENSO)

Wren leads; each agent works in the area `AGENTS.md` gives them. Studio roles come from
[Claude-Code-Game-Studios](https://github.com/TokeloR-I/Claude-Code-Game-Studios) `.claude/agents/`; see
`docs/agents/STUDIO_AGENTS.md` for the full mapping.

| Who (studio role) | Does | State |
|---|---|---|
| Wren (lead-programmer, gameplay-programmer) | Engine clock, cooldowns, skill bar, timed statuses, tests | done in this PR |
| Pixie (ui-programmer, ux-designer) | Real-time battle HUD: skill bar with cooldown sweeps, keys 1–6, target, wind-up bars, status timers; skill-bar editor | this PR |
| Tally (qa-tester, performance-analyst) | Real-time bot, win rates per class vs. turn mode, real-time bug hunt | `qa/QA_REPORT_2026-10-25_14_REALTIME.md` |
| Vaelis (systems-designer, game-designer) | Tune `realtimeRules`, per-skill `cooldown` values, the open questions below | next |
| Keel (technical-director) | Engine review: real-time is one of the triggers in `ENGINE_DECISION.md` (see below) | next |
| Sable / Vesper (technical-artist, 2D) | Wind-up telegraphs and hit VFX timed to the clock | later |
| Rook (gameplay-programmer) | Follow-ups: per-skill cooldowns in data, stamina/dodge if approved | later |

### Engine decision check (Keel's trigger)

`ENGINE_DECISION.md` names "combat goes real-time" as a reason to revisit the custom engine. Wren's assessment: this
version of real-time combat is a clock over the same headless rules engine, in a menu-free battle overlay — no physics,
no positioning, no hitboxes — so the custom JS/Canvas engine is enough and no switch is needed now. If Vaelis wants
action combat with movement, dodging and hitboxes on the map, that is the point to have Keel re-run the engine review.

## Balance, first pass (Tally, QA #14)

`qa/QA_REPORT_2026-10-25_14_REALTIME.md`, bot `qa/scripts/rt_balance.js` (200 seeds per class, ~120 actions a minute).
The first numbers (1.6 s swing, 3 s enemies, 3 s + 2 s cooldowns) let every class win the Warden 79–100%, because
the player acted 2–4 times per enemy action. Wren took Tally's "closest to parity" option (3 s swing, 2.5 s enemies,
4 s + 3 s cooldowns). Measured after the change, Warden win % without shopping (QA #13 had 100 / 74 / 87 / 98 turn-based with shopping):

| | Warrior | Mage | Rogue | Necromancer |
|---|---|---|---|---|
| Turn-based, no shopping | 89 | 21 | 47 | 15 |
| Real time, now, no shopping | 100 | 60 | 92 | 48 |

The Necromancer (idle 58% of the time) and the Warrior's 100% are class-tuning jobs for Vaelis. DoT damage grows
with the square of the stacks (more damage per tick *and* faster ticks): two 99-stack DoTs deal ~2,000 DPS in Tally's
stress fight, ~600 with `perStackSpeedup: 0`. Real fights reach 7 stacks today, but it's question 1 below.

## Open questions (for Vaelis and Tokelo)

1. **"Cooldown reduced per multiplier"**: is the faster DoT tick the right reading? The other readings were: stacks
   shorten the *skill's* cooldown, or stacks shorten how long the effect lasts. Swapping the reading is a small change.
2. Should Infection keep its approved cap of 3 in real time? It now stacks to 99 with the other DoTs.
3. Should skill-bar slots unlock with level (e.g. 3 at level 1, 6 at level 9)? Now all 6 are open from the start.
4. Stamina, dodge and guard as Dimraeth has them: wanted?
5. Per-skill cooldowns: the cost formula is a stand-in. Vaelis can set `cooldown` (seconds) on any skill in `src/data.js`.
6. Possession and Eternal Architect need a real-time design.
