# Claude studio on ENSO: team and hierarchy

Owner restructure, 2026-10-26 (Tokelo): every studio role ENSO needs is active, the technical artist and the gameplay
programmer (Rook) included, and the earlier structure is replaced by this one. Roles come from
[Claude Code Game Studios](https://github.com/TokeloR-I/Claude-Code-Game-Studios) (MIT) and live in
`.claude/agents/studio-<role>.md`, each with an ENSO header that wins over the studio text. Ask for one by name
("use the studio-level-designer agent"). The ENSO briefs `wren.md`, `pixel-ui-designer.md`, `thorne.md` and `gauge.md`
win over their studio role text. Codex runs its own independent team (`docs/agents/CODEX_STUDIO.md`).

## Hierarchy

```
Tokelo — Creative Director (owner, merges main)
├── Juniper — Producer: plan, milestones, assigns work across departments
│   ├── Brook — Release Manager: builds, versions, release notes
│   └── Tally — QA Lead (also qa-tester, performance-analyst)
├── Wren — Lead Programmer
│   ├── Rook — Gameplay Programmer (active)
│   ├── Hawk — AI Programmer (enemy behaviour)
│   ├── Forge — Engine Programmer
│   └── Bolt — Tools Programmer
├── Keel — Technical Director (architecture reviews, advises Wren)
├── Thorne — Lead Game Designer
│   ├── Gauge — Systems & Balance Designer
│   ├── Ledger — Economy Designer
│   ├── Moss — Level Designer
│   ├── Cairn — World Builder
│   └── Pip — Prototyper
├── Ashby — Narrative Director
│   └── Wick — Writer
├── Saffron — Art Director
│   └── Quill — Technical Artist (replaces the retired Sable)
├── Pixie — UI/UX Lead (ui-programmer, ux-designer)
│   └── Hollis — Accessibility Specialist
└── Echo — Audio Director
    └── Reed — Sound Designer
```

| Studio role (`.claude/agents/`) | Person | Lane |
|---|---|---|
| `studio-producer` | Juniper | plan, milestones, backlog, `docs/production/` |
| `studio-release-manager` | Brook | builds, versions, release notes |
| `studio-qa-lead`, `studio-qa-tester`, `studio-performance-analyst` | Tally | `qa/` |
| `studio-lead-programmer` | Wren | `src/`, `ui/`, `tests/`, `tools/` |
| `studio-gameplay-programmer` | Rook | gameplay features in `src/`, `tests/` |
| `studio-ai-programmer` | Hawk | enemy behaviour, `src/action/sim.js` |
| `studio-engine-programmer` | Forge | core engine, save/load, performance |
| `studio-tools-programmer` | Bolt | `tools/` |
| `studio-technical-director` | Keel | `architecture/` reviews |
| `studio-game-designer` | Thorne | `docs/design/` mechanics |
| `studio-systems-designer` | Gauge | balance specs, values in `src/data.js` |
| `studio-economy-designer` | Ledger | gold, shops, loot tables |
| `studio-level-designer` | Moss | map layouts, encounter placement, pacing |
| `studio-world-builder` | Cairn | regions, landmarks, world consistency |
| `studio-prototyper` | Pip | throwaway prototypes on `claude/proto-*` |
| `studio-narrative-director` | Ashby | story, quests, lore canon |
| `studio-writer` | Wick | dialogue, item and quest text |
| `studio-art-director` | Saffron | visual direction (Mana Seed, in code only) |
| `studio-technical-artist` | Quill | VFX, sprite/tile pipeline, rendering polish |
| `studio-ui-programmer`, `studio-ux-designer` | Pixie | `ui/`, CSS, HUD and menus |
| `studio-accessibility-specialist` | Hollis | rebinding, readability, motion, input options |
| `studio-audio-director` | Echo | music and sound direction |
| `studio-sound-designer` | Reed | SFX, ambience, Web Audio hooks |

## Not brought in, and why

- Godot, Unity and Unreal specialists (15 roles): ENSO runs its own JavaScript engine.
- Network programmer, live-ops designer, community manager, analytics engineer, security engineer: ENSO is a
  single-player browser game with no servers, live service or player data. Add them if that changes.
- Localization lead: English only for now; add before a translation.
- DevOps engineer: Brook covers builds and releases.
- Creative director: Tokelo.
