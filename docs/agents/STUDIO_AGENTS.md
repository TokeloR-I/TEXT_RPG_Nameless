# Claude Code Game Studios roles on ENSO

ENSO uses agent roles from [Claude Code Game Studios](https://github.com/TokeloR-I/Claude-Code-Game-Studios) (MIT).
The work stays in this repo; the studio repo is only where the role definitions come from. Each role was copied into
`.claude/agents/studio-<role>.md` with an ENSO header on top that wins over the studio text: who holds the role,
their lane from `AGENTS.md`, our engine, and our paths. In a Claude Code session in this repo, ask for a role by name
(e.g. "use the studio-qa-tester agent") or let Claude pick one by its description.

| Studio role (`.claude/agents/`) | ENSO person | Lane (from `AGENTS.md`) |
|---|---|---|
| `studio-lead-programmer` | Wren, Primary Developer, dev lead | engine, tests, tools; assigns engineering work |
| `studio-gameplay-programmer` | Rook, Secondary Developer | engine and tests on assigned tasks |
| `studio-ui-programmer` | Pixie, UI/UX Lead | `ui/`, `world.css`, `style.css`, HTML shells |
| `studio-ux-designer` | Pixie, UI/UX Lead | HUD and menu flows |
| `studio-qa-tester` | Tally, QA & Balance | `qa/` only |
| `studio-performance-analyst` | Tally, QA & Balance | `qa/` measurements |
| `studio-systems-designer` | Gauge, Systems & Balance Designer | `docs/design/` balance specs, data values in `src/data.js` |
| `studio-game-designer` | Thorne, Lead Game Designer | `docs/design/` mechanics, pending design values |
| `studio-technical-director` | Keel, Technical Director | `architecture/` reviews |
| `studio-technical-artist` | Sable, 2D VFX Artist | VFX once direction is approved |

The ENSO-specific agents (`wren.md`, `pixel-ui-designer.md`, `thorne.md`, `gauge.md`) are each person's own brief and
win over the studio role text. Thorne and Gauge (added 2026-10-25) decide routine design and balance independently,
research online instead of asking Tokelo for answers, and escalate only major changes to the creative direction; the
studio designer roles' "ask first / defer to the user" protocol doesn't apply to them. Vaelis keeps narrative.

**Not imported:** the studio's engine specialists (Godot, Unity, Unreal), its slash-command skills, hooks and
`project.yaml`. ENSO runs its own JavaScript engine and its own workflow (`AGENTS.md`), so those don't apply. Ask Wren
if a studio skill (for example `team-combat`, `balance-check` or `playtest-report`) should be adapted next.

First job for the studio roles: the real-time combat overhaul, `docs/REALTIME_COMBAT.md` ("Team plan").
