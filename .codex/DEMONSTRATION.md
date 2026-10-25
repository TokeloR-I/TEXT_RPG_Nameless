# Studio operational verification — 2026-10-25

Source snapshot: GitHub main `cabb946e53a12d624e1ae0540eacef27df4419b5`.
Installed CLI: `codex-cli 0.163.0`. Owner request: independent Codex studio with ten specialists and one coordinator.

## What actually ran

The hosted session's collaboration tool does not accept a configured `agent_type`, so this run used the documented explicit instruction-loading fallback:

1. A real fresh coordinator child `/root/orion_demo` was started as Orion. It read the committed coordinator TOML, AGENTS.md and shared studio context.
2. Orion read the QA TOML and started real fresh child `/root/orion_demo/verity_readonly_audit` as Verity with the loaded instructions and a bounded read-only assignment.
3. Verity returned a useful audit plus **17/17 passing focused real-time/action-simulation tests**. Orion received the result and independently checked its source evidence.
4. Verified invariant: `src/action/sim.js` `update(ms)` consumes caller-supplied elapsed time and advances fixed simulation steps; the step calls `engine.tick(STEP)`. `src/engine/realtime.js` `tick(ms)` clamps supplied time. No engine/simulation wall-clock scheduling was introduced; `window` in browser export wrappers is not a gameplay dependency.
5. Verity also checked all **11 unique native role names/identities** against their TOMLs. No files were edited by Orion or Verity.

The root separately inspected live GitHub main, open issues/PRs and both branch-list pages. There was no competing Codex studio implementation or open PR at that check. Existing gameplay work and historical branches were left alone. `.claude/` files remain byte-for-byte equal to the pinned GitHub tree and have no patch changes. Local historical `main` refs in this connector-reconstructed workspace are not a substitute for the pinned remote main.

## Integrated checks

- Local studio validator: 11/11 native role definitions and the shared skill/context pass.
- Launcher/validator regression tests: 19/19 stdlib tests pass, including invalid metadata, duplicates, path escapes and dry-run safety.
- Existing game tests: 464/464 pass. World/sprite validation and both standalone builds pass; no gameplay files changed.
- CI checks the configuration and mocked launcher tests without credentials or paid model calls. That job does not claim native live delegation.

## Native CLI limit, stated precisely

A separate actual invocation attempted read-only, ephemeral native execution with `--strict-config --json` and `$enso-studio`. It failed before a model run:

```text
Error: failed to initialize in-process app-server client: Read-only file system (os error 30)
```

The managed environment mounts Codex state locations read-only. No credentials were inspected, no global trust was changed and no sandbox was bypassed to force initialization. **This failed attempt does not verify native CLI role discovery or nested native spawning.** The live demonstrated path is hosted instruction-loading delegation above.

The native format/discovery keys were verified against official documentation and the exact installed-version OpenAI role loader/parser/config schema (links in the operating guide). Local validation checks syntax, roles and entry context. On a normal writable authenticated CLI installation, invoke `python3 tools/codex-studio.py smoke` to collect actual native JSONL delegation evidence; inspect spawn/result events, not just a successful exit code.

The launcher and native configurations are executable infrastructure, not merely a collection of role descriptions. They inherit the user's model and security settings. There is no claim that repository files start background workers or hot-register role types into an already-running hosted conversation.
