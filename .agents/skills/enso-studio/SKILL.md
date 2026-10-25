---
name: enso-studio
description: Run the independent ENSO Codex Studio for game development, design, UI, art, systems, testing and performance tasks in TEXT_RPG_Nameless. Delegate to Orion and the native Codex specialists, integrate changes and prepare a tested PR.
---

Read `AGENTS.md`, `.codex/STUDIO.md`, `.codex/agents/enso-coordinator.toml` and `docs/agents/CODEX_STUDIO.md`.

The user invoking this skill authorizes bounded specialist delegation for their task. Use a real child agent, not simulated role conversations.

If native configured roles are available, delegate to `enso_coordinator` (Orion) with a fresh context, pass the full user task and relevant repository/worktree details, then wait and integrate the returned work. Orion delegates to the ten specialists as needed. Keep enough runtime capacity for Orion's specialists; do not fill every slot with coordinators.

If this host's spawn tool has no `agent_type` parameter, explicitly load the coordinator TOML's `developer_instructions` and send them with the task to a fresh generic child. Orion does the same for specialists. State that this is explicit instruction-loading through the session's delegation tools; native CLI role auto-discovery has not thereby been tested.

If the host has no delegation tools, explain the limitation and use/provide `python3 tools/codex-studio.py start "<task>"` in the installed CLI. Never claim a child ran without actual tool evidence. Do not silently change global trust, permissions or credentials.

Follow the coordinator's integration/QA workflow, preserve Claude configurations and other studios' branches, and leave merging to the owner.
