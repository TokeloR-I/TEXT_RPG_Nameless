#!/usr/bin/env python3
"""Validate and invoke ENSO's native Codex studio without changing user settings.

Requires Python 3.11+ and an installed Codex CLI for live execution. `check`
validates repository files only. A successful launcher exit does not itself prove
that a model delegated; inspect the smoke command's JSONL tool events and result.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:
    raise SystemExit("codex-studio requires Python 3.11+ (stdlib tomllib).")

ROOT = Path(__file__).resolve().parents[1]
ROLE_FIELDS = {
    "name", "description", "developer_instructions", "nickname_candidates",
    "model", "model_reasoning_effort", "model_reasoning_summary", "model_verbosity",
    "features", "skills",
}
DISABLABLE_FEATURES = {
    "shell_tool", "apps", "plugins", "memories", "request_permissions_tool",
}
SKILL_FIELDS = {"config", "bundled", "include_instructions", "max_context_tokens"}
REQUIRED_AGENTS = 11
SMOKE_PROMPT = """$enso-studio
Run a small, read-only native delegation demonstration. Do not edit any files,
create branches or worktrees, post comments, or perform remote mutations.
Use the configured native agent_type enso_coordinator with a fresh context
(fork_turns=none). Give that coordinator this bounded task: delegate to the
configured agent_type enso_qa_tester, again with a fresh context, to verify two
existing engine invariants: engine code has no DOM calls, and seeded randomness
uses the authoritative engine RNG. The QA specialist must inspect actual source
and return useful evidence with file paths and symbols/line references, noting
any real limitation. The coordinator must receive and assess that response,
then return the findings to this root thread. Wait for the delegated work and
report what actually ran. If native custom-role spawning or nested delegation
is unavailable, report the exact limitation; do not simulate a tool call or
claim success from instructions alone. Do not substitute a different model,
change global settings, alter trust, or bypass the sandbox to make the test pass.
"""


class StudioError(Exception):
    """A configuration or invocation problem safe to show without credentials."""


def read_toml(path: Path) -> dict:
    try:
        with path.open("rb") as stream:
            return tomllib.load(stream)
    except FileNotFoundError as exc:
        raise StudioError(f"Missing required file: {path}") from exc
    except (OSError, UnicodeError, tomllib.TOMLDecodeError) as exc:
        raise StudioError(f"Cannot parse {path}: {exc}") from exc


def local_path(root: Path, value: str, *, base: Path | None = None) -> Path:
    if not isinstance(value, str) or not value.strip():
        raise StudioError("Manifest file paths must be non-empty strings.")
    path = ((base or root) / value).resolve()
    if not path.is_relative_to(root.resolve()):
        raise StudioError(f"Studio path must remain inside the repository: {value}")
    return path


def nonempty_string(value: object, label: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise StudioError(f"{label} must be a non-empty string.")


def validate_role(path: Path) -> str:
    role = read_toml(path)
    unknown = set(role) - ROLE_FIELDS
    if unknown:
        raise StudioError(f"{path}: unsupported native role fields: {', '.join(sorted(unknown))}. "
                          "Claude front matter, tool lists and permission metadata are not Codex role settings.")
    for key in ("name", "description", "developer_instructions"):
        nonempty_string(role.get(key), f"{path}: {key}")
    for key in ("model", "model_reasoning_effort"):
        if key in role:
            nonempty_string(role[key], f"{path}: {key}")
    if "model_reasoning_summary" in role and (not isinstance(role["model_reasoning_summary"], str) or role["model_reasoning_summary"] not in {"auto", "concise", "detailed", "none"}):
        raise StudioError(f"{path}: invalid model_reasoning_summary.")
    if "model_verbosity" in role and (not isinstance(role["model_verbosity"], str) or role["model_verbosity"] not in {"low", "medium", "high"}):
        raise StudioError(f"{path}: invalid model_verbosity.")
    if "nickname_candidates" in role:
        names = role["nickname_candidates"]
        if not isinstance(names, list) or not names or any(not isinstance(n, str) or not n.strip() or not re.fullmatch(r"[A-Za-z0-9 _-]+", n) for n in names):
            raise StudioError(f"{path}: nickname_candidates must be non-empty native ASCII display names.")
        if len({n.strip() for n in names}) != len(names):
            raise StudioError(f"{path}: duplicate nickname candidates.")
    features = role.get("features", {})
    if not isinstance(features, dict) or set(features) - DISABLABLE_FEATURES or any(v is not False for v in features.values()):
        raise StudioError(f"{path}: role features may only disable documented inherited capabilities.")
    skills = role.get("skills", {})
    if not isinstance(skills, dict) or set(skills) - SKILL_FIELDS:
        raise StudioError(f"{path}: skills must be a native Codex skills table.")
    if "include_instructions" in skills and not isinstance(skills["include_instructions"], bool):
        raise StudioError(f"{path}: skills.include_instructions must be a boolean.")
    if "bundled" in skills and (not isinstance(skills["bundled"], dict) or set(skills["bundled"]) - {"enabled"} or not isinstance(skills["bundled"].get("enabled"), bool)):
        raise StudioError(f"{path}: skills.bundled requires a boolean enabled field.")
    if "config" in skills:
        entries = skills["config"]
        if not isinstance(entries, list):
            raise StudioError(f"{path}: skills.config must be an array of tables.")
        for entry in entries:
            if not isinstance(entry, dict) or set(entry) - {"path", "enabled"} or not isinstance(entry.get("path"), str) or not isinstance(entry.get("enabled"), bool):
                raise StudioError(f"{path}: each skills.config entry requires path and enabled.")
    if "max_context_tokens" in skills and (type(skills["max_context_tokens"]) is not int or not 1 <= skills["max_context_tokens"] <= 10000):
        raise StudioError(f"{path}: skills.max_context_tokens must be an integer from 1 to 10000.")
    return role["name"].strip()


def validate(root: Path = ROOT) -> list[str]:
    config = read_toml(root / ".codex/config.toml")
    agents = config.get("agents", {})
    if not isinstance(agents, dict) or agents.get("enabled", True) is not True:
        raise StudioError(".codex/config.toml must enable agents.")
    concurrency = agents.get("max_concurrent_threads_per_session", agents.get("max_threads"))
    if type(concurrency) is not int or concurrency < 1:
        raise StudioError("Set agents.max_concurrent_threads_per_session to a positive integer.")
    if type(agents.get("max_depth")) is not int or agents["max_depth"] < 2:
        raise StudioError("Set agents.max_depth >= 2 so a spawned coordinator can delegate in V1.")
    features = config.get("features", {})
    if not isinstance(features, dict) or features.get("multi_agent", True) is not True:
        raise StudioError("features.multi_agent must not disable native delegation.")
    manifest_path = root / ".codex/roles.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise StudioError(f"Cannot read role manifest {manifest_path}: {exc}") from exc
    if not isinstance(manifest, dict):
        raise StudioError(".codex/roles.json must be an object with a roles list.")
    if type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != 1:
        raise StudioError(".codex/roles.json requires schemaVersion 1.")
    entries = manifest.get("roles")
    if not isinstance(entries, list) or len(entries) != REQUIRED_AGENTS:
        raise StudioError(f".codex/roles.json must declare exactly {REQUIRED_AGENTS} roles (coordinator plus ten specialists).")
    actual = {}
    for path in sorted((root / ".codex/agents").rglob("*.toml")):
        name = validate_role(path)
        if name in actual:
            raise StudioError(f"Duplicate native agent name {name}: {actual[name]} and {path}")
        actual[name] = path.resolve()
    expected = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise StudioError("Each manifest role must be an object with name, identity, role, config and source.")
        for field in ("name", "identity", "role", "config", "source"):
            nonempty_string(entry.get(field), f"Manifest role {field}")
        name = entry["name"]
        if name in expected:
            raise StudioError(f"Duplicate manifest role: {name}")
        # The studio manifest deliberately uses repository-relative paths.
        path = local_path(root, entry["config"])
        if not path.is_relative_to((root / ".codex/agents").resolve()):
            raise StudioError(f"Role {name} must live beneath .codex/agents.")
        expected[name] = path
    if actual != expected:
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        wrong_paths = sorted(name for name in set(actual) & set(expected) if actual[name] != expected[name])
        raise StudioError(f"Native roles disagree with manifest: missing={missing}, extra={extra}, wrong_paths={wrong_paths}")
    for name in ("enso_coordinator", "enso_qa_tester"):
        if name not in actual:
            raise StudioError(f"Required native role missing: {name}")
    for value in (".codex/STUDIO.md", "AGENTS.md", ".agents/skills/enso-studio/SKILL.md"):
        path = local_path(root, value)
        if not path.is_file() or not path.read_text(encoding="utf-8").strip():
            raise StudioError(f"Required shared context or entry skill is missing/empty: {path}")
    skill = (root / ".agents/skills/enso-studio/SKILL.md").read_text(encoding="utf-8")
    if not skill.startswith("---\n") or len(skill.split("---", 2)) < 3:
        raise StudioError("enso-studio SKILL.md must include native name/description front matter.")
    header = skill.split("---", 2)[1]
    if not re.search(r"(?m)^name:\s*['\"]?enso-studio['\"]?\s*$", header) or not re.search(r"(?m)^description:\s*\S", header):
        raise StudioError("enso-studio SKILL.md must declare name: enso-studio and a description.")
    return sorted(actual)


def command_for(mode: str, task: str = "") -> list[str]:
    command = ["codex", "-C", str(ROOT)]
    if mode == "start":
        return [*command, "$enso-studio " + task]
    return [*command, "--ask-for-approval", "never", "exec", "--strict-config",
            "--ephemeral", "--sandbox", "read-only", "--json", SMOKE_PROMPT]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("check", help="Validate repository studio files without starting a model.")
    start = sub.add_parser("start", help="Open the interactive coordinator workflow using current Codex settings.")
    start.add_argument("--dry-run", action="store_true", help="Print argv; do not launch Codex.")
    start.add_argument("task", nargs="+", help="Authorized studio task.")
    smoke = sub.add_parser("smoke", help="Run an actual read-only native coordinator-to-QA delegation probe.")
    smoke.add_argument("--dry-run", action="store_true", help="Print argv; do not execute or claim a live result.")
    smoke.add_argument("--timeout", type=float, default=300, help="Live smoke deadline in seconds (default: 300).")
    args = parser.parse_args(argv)
    try:
        names = validate()
        if args.command == "check":
            print(f"Studio files validate: {len(names)} native agents and shared entry context.")
            return 0
        task = " ".join(args.task).strip() if args.command == "start" else ""
        if args.command == "start" and not task:
            raise StudioError("Provide a non-empty task.")
        if args.command == "smoke" and (not math.isfinite(args.timeout) or args.timeout <= 0):
            raise StudioError("Smoke timeout must be positive.")
        command = command_for(args.command, task)
        if args.dry_run:
            print(shlex.join(command))
            return 0
        if not shutil.which("codex"):
            raise StudioError("Codex CLI is not installed or is not on PATH. Install/sign in to Codex, then retry.")
        if args.command == "smoke":
            print("Live read-only smoke: inspect JSONL delegation events and findings; exit status alone is not proof of delegation.", file=sys.stderr)
        return subprocess.run(command, cwd=ROOT, check=False,
                              timeout=args.timeout if args.command == "smoke" else None).returncode
    except StudioError as exc:
        print(f"Studio configuration error: {exc}", file=sys.stderr)
        return 2
    except subprocess.TimeoutExpired:
        print("Live smoke timed out. Native delegation has not been verified; inspect the emitted events.", file=sys.stderr)
        return 124
    except (OSError, UnicodeError) as exc:
        print(f"Cannot read studio files or invoke Codex: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
