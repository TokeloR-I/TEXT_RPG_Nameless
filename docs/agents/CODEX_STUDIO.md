# Independent ENSO Codex Studio

Orion coordinates the Codex team independently of Claude capacity. One repository and game direction are shared; implementations use separate branches/worktrees. The owner merges main. The current owner mandate and `.codex/STUDIO.md` supersede stale unassigned/per-file approval/retired-personnel directions for Codex work. Claude's configurations are unchanged.

## Invoke

From this repository in Codex CLI or a host with repository skill discovery:

```text
$enso-studio Implement <task or issue>
```

Or start from a terminal (no new npm packages):

```sh
codex '$enso-studio Implement <task or issue>'
# Optional launcher; Python 3.11+ and installed authenticated Codex CLI:
python3 tools/codex-studio.py check
python3 tools/codex-studio.py start 'Implement <task or issue>'
python3 tools/codex-studio.py smoke
# Offline regression tests (no credentials or model calls):
python3 -m unittest discover -s tools/tests -v
```

The skill bootstraps Orion as `enso_coordinator`; Orion delegates to specialists. This is a real native agent role, not a `--agent` CLI flag or a profile. A newly opened session discovers the committed skill and roles. In trusted projects, `.codex/config.toml` enables native multi-agent work, six child threads per session and depth two (root → coordinator → specialist). User model, credentials, sandbox and approvals are inherited. No model is pinned, no dependency/auth is installed, and no permissions are elevated.

Codex may require its normal repository trust decision before loading project configuration. Make that trust decision in Codex after reviewing the files; this setup never modifies global trust or credentials. `--dry-run` on launcher execution commands shows the argv without starting a model run. `check` is local validation; by itself it does not prove a model delegated.

In hosted sessions whose generic spawn tool has no configured `agent_type` selector, the skill explicitly reads each native TOML and passes its developer instructions to a fresh child through the available delegation tools. This is an operational instruction-loading fallback, not proof of native role auto-discovery. A host without delegation cannot simulate a team; use the installed CLI instead. See the [operational demonstration report](../../.codex/DEMONSTRATION.md) for the exact modes verified here.

## Roles

| Functional role | Claude counterpart/source | Independent Codex identity / native name |
|---|---|---|
| Coordinator | Wren's orchestration responsibility | Orion / `enso_coordinator` |
| Lead Programmer | Wren / studio-lead-programmer | Alder / `enso_lead_programmer` |
| Game Designer | Thorne / studio-game-designer | Lyra / `enso_game_designer` |
| Systems Designer | Gauge / studio-systems-designer | Vector / `enso_systems_designer` |
| UI Programmer | Pixie / studio-ui-programmer | Lumen / `enso_ui_programmer` |
| UX Designer | Pixie / studio-ux-designer | Mira / `enso_ux_designer` |
| QA Tester | Tally / studio-qa-tester | Verity / `enso_qa_tester` |
| Performance Analyst | Tally / studio-performance-analyst | Pulse / `enso_performance_analyst` |
| Technical Artist | Functional specialization; stale source names retired staff | Ember / `enso_technical_artist` |
| Technical Director | Keel / studio-technical-director | Atlas / `enso_technical_director` |
| Gameplay Programmer | Functional role; Rook remains owner-assigned backup only | Flint / `enso_gameplay_programmer` |

The ten roles were adapted from the actual `.claude/agents/studio-*.md`, with Thorne/Gauge/Wren and current ENSO contracts inspected. Their source paths are recorded in `.codex/roles.json`. The Codex instructions are independently written: no Claude frontmatter, fictitious tool grants, maxTurns fields, foreign engine assumptions or mandatory routine approval chains.

Sable, Morrigan, Vesper and Vaelis are retired. Historical art/design documents remain evidence; their authors are not active agents. No Codex role revives them. Claude retains Wren, Pixie, Tally, Thorne and Gauge as its independent leads; Codex does not assign work to Claude's Rook.

## Daily workflow

1. Orion checks current main, working changes, relevant issues, PRs and branches for completed work and overlap. Use available GitHub tools or CLI. Record access gaps rather than claiming a check ran.
2. Create `codex/<topic>` in a separate worktree. Delegate bounded independent work with disjoint file scopes; parallelize mechanics, numeric analysis, engineering, UX/art and validation where useful.
3. Lyra and Vector research comparable RPGs, make routine decisions and implement concise specs/data with evidence. Alder/Atlas resolve normal technical choices. Escalate only changes to the fundamental creative vision.
4. Specialists return actual artifacts and source/test evidence. Orion integrates; Verity independently checks the combined result. Shared files are integrated by the coordinator rather than concurrently overwritten.
5. Run relevant checks and `npm test`, with build/world/browser/golden checks as applicable. Open a concise PR into main with findings, meaningful decisions and material limitations; the owner merges.

This is delegation and integration, not a sequential approval chain. Prompt-level file lanes are not filesystem ACLs. Mira's native role disables its shell tool; in a generic hosted fallback the no-shell instruction is behavioral unless the host also enforces tool controls. Orion supplies file excerpts/captures when needed. Tools must exist in the host and remain subject to its permissions. Designers report unavailable online research honestly; profiling claims require measurements. There are no automatic background workers just because configuration files exist.

## Native compatibility sources

Verified against installed **codex-cli 0.163.0**, not inferred from Claude metadata:

- [Current official subagents documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents): standalone project roles and inherited execution settings.
- [Current skill discovery](https://learn.chatgpt.com/docs/build-skills): `.agents/skills/<name>/SKILL.md` and `$skill-name` invocation.
- [Installed-version loader](https://github.com/openai/codex/blob/rust-v0.163.0/codex-rs/agent-roles/src/loader.rs), [role parser](https://github.com/openai/codex/blob/rust-v0.163.0/codex-rs/agent-roles/src/agent_role_config.rs) and [config schema](https://github.com/openai/codex/blob/rust-v0.163.0/codex-rs/core/config.schema.json): standalone TOML discovery, supported fields, `agents.enabled`, `max_concurrent_threads_per_session`, `max_depth` and `features.multi_agent`.

Current CLI V1 applies configured roles to fresh delegated contexts; the skill requests that route. Future Codex versions may change features: inspect current docs/schema and run validation/smoke before changing the configuration. Do not install/up-level Codex silently as part of game work.
