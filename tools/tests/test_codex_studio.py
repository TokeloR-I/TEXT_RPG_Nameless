"""Stdlib tests for the ENSO launcher; no model or network calls.

Run from the repository root with Python 3.11+:
    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/tests -v
"""
from __future__ import annotations

import contextlib
import copy
import io
import json
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools/codex-studio.py"
# Execute the module without generating a launcher __pycache__ artifact.
studio = types.ModuleType("enso_studio_launcher_tests")
studio.__file__ = str(SCRIPT)
exec(compile(SCRIPT.read_text(encoding="utf-8"), str(SCRIPT), "exec"), studio.__dict__)


class ActualStudioTests(unittest.TestCase):
    def test_checked_in_configuration_resolves_all_declared_roles(self):
        manifest = json.loads((ROOT / ".codex/roles.json").read_text(encoding="utf-8"))
        names = studio.validate(ROOT)
        self.assertEqual(len(names), 11)
        self.assertEqual(set(names), {record["name"] for record in manifest["roles"]})
        self.assertIn("enso_coordinator", names)
        self.assertIn("enso_qa_tester", names)

    def test_check_reports_file_validation_without_starting_a_process(self):
        output = io.StringIO()
        with patch.object(studio.subprocess, "run") as run, contextlib.redirect_stdout(output):
            self.assertEqual(studio.main(["check"]), 0)
        run.assert_not_called()
        self.assertIn("11 native agents", output.getvalue())


class FixtureStudioTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="enso-studio-validation-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        # Copy public repository instructions/configuration only; never user config/auth.
        shutil.copytree(ROOT / ".codex", self.root / ".codex")
        shutil.copytree(ROOT / ".agents/skills/enso-studio", self.root / ".agents/skills/enso-studio")
        shutil.copy2(ROOT / "AGENTS.md", self.root / "AGENTS.md")
        self.manifest_path = self.root / ".codex/roles.json"
        self.manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        self.coordinator = self.root / self.manifest["roles"][0]["config"]

    def save_manifest(self):
        self.manifest_path.write_text(json.dumps(self.manifest), encoding="utf-8")

    def prepend_role_field(self, field):
        self.coordinator.write_text(field + "\n" + self.coordinator.read_text(encoding="utf-8"), encoding="utf-8")

    def test_claude_specific_metadata_is_not_silently_treated_as_native(self):
        for field in ('tools = ["Read", "Bash"]', 'permissionMode = "bypassPermissions"', 'color = "blue"'):
            with self.subTest(field=field):
                original = self.coordinator.read_text(encoding="utf-8")
                self.prepend_role_field(field)
                with self.assertRaisesRegex(studio.StudioError, "unsupported native role fields"):
                    studio.validate(self.root)
                self.coordinator.write_text(original, encoding="utf-8")

    def test_unknown_role_field_is_an_error_instead_of_a_ignored_setting(self):
        self.prepend_role_field('imaginary_capability = "enabled"')
        with self.assertRaisesRegex(studio.StudioError, "imaginary_capability"):
            studio.validate(self.root)

    def test_duplicate_discovered_role_names_are_rejected(self):
        shutil.copy2(self.coordinator, self.coordinator.parent / "duplicate-coordinator.toml")
        with self.assertRaisesRegex(studio.StudioError, "Duplicate native agent name.*enso_coordinator"):
            studio.validate(self.root)

    def test_duplicate_manifest_names_are_rejected_even_at_correct_role_count(self):
        self.manifest["roles"][1] = copy.deepcopy(self.manifest["roles"][0])
        self.save_manifest()
        self.assertEqual(len(self.manifest["roles"]), 11)
        with self.assertRaisesRegex(studio.StudioError, "Duplicate manifest role.*enso_coordinator"):
            studio.validate(self.root)

    def test_role_config_cannot_escape_repository_through_relative_path(self):
        self.manifest["roles"][0]["config"] = "../outside-coordinator.toml"
        self.save_manifest()
        with self.assertRaisesRegex(studio.StudioError, "must remain inside the repository"):
            studio.validate(self.root)

    def test_role_config_cannot_escape_repository_through_absolute_path(self):
        self.manifest["roles"][0]["config"] = str(self.root.parent / "outside-coordinator.toml")
        self.save_manifest()
        with self.assertRaisesRegex(studio.StudioError, "must remain inside the repository"):
            studio.validate(self.root)

    def test_manifest_cannot_point_to_a_non_agent_repository_file(self):
        self.manifest["roles"][0]["config"] = "AGENTS.md"
        self.save_manifest()
        with self.assertRaisesRegex(studio.StudioError, "must live beneath .codex/agents"):
            studio.validate(self.root)

    def test_missing_specialist_has_an_actionable_name_in_the_error(self):
        record = next(r for r in self.manifest["roles"] if r["name"] == "enso_qa_tester")
        (self.root / record["config"]).unlink()
        with self.assertRaisesRegex(studio.StudioError, "missing=.*enso_qa_tester"):
            studio.validate(self.root)

    def test_shared_context_and_skill_are_required(self):
        for relative in (".codex/STUDIO.md", ".agents/skills/enso-studio/SKILL.md"):
            with self.subTest(path=relative):
                path = self.root / relative
                original = path.read_text(encoding="utf-8")
                path.unlink()
                with self.assertRaisesRegex(studio.StudioError, "missing/empty"):
                    studio.validate(self.root)
                path.write_text(original, encoding="utf-8")

    def test_skill_requires_the_expected_native_invocation_name(self):
        path = self.root / ".agents/skills/enso-studio/SKILL.md"
        path.write_text("---\nname: pretend-studio\ndescription: An invalid entry point\n---\nDo work.\n", encoding="utf-8")
        with self.assertRaisesRegex(studio.StudioError, "name: enso-studio"):
            studio.validate(self.root)

    def test_native_role_can_reduce_shell_capability_but_not_enable_it(self):
        with self.coordinator.open("a", encoding="utf-8") as stream:
            stream.write("\n[features]\nshell_tool = false\n")
        self.assertEqual(len(studio.validate(self.root)), 11)
        body = self.coordinator.read_text(encoding="utf-8").replace("shell_tool = false", "shell_tool = true")
        self.coordinator.write_text(body, encoding="utf-8")
        with self.assertRaisesRegex(studio.StudioError, "only disable documented"):
            studio.validate(self.root)


class LauncherInvocationTests(unittest.TestCase):
    def test_both_dry_runs_print_argv_without_process_or_binary_discovery(self):
        for args in (["start", "--dry-run", "Inspect the engine"], ["smoke", "--dry-run"]):
            with self.subTest(command=args[0]):
                output = io.StringIO()
                with patch.object(studio.subprocess, "run") as run, patch.object(studio.shutil, "which") as which, contextlib.redirect_stdout(output):
                    self.assertEqual(studio.main(args), 0)
                run.assert_not_called()
                which.assert_not_called()
                command = shlex.split(output.getvalue())
                self.assertEqual(command[:3], ["codex", "-C", str(ROOT)])
                self.assertIn("$enso-studio", command[-1])
                self.assertNotIn("--agent", command)
                self.assertNotIn("--dangerously-bypass-approvals-and-sandbox", command)

    def test_start_passes_one_literal_task_and_preserves_user_auth_model_permissions(self):
        task = "Review source; do not execute $(anything)"
        with patch.object(studio.shutil, "which", return_value="/installed/codex"), patch.object(studio.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as run:
            self.assertEqual(studio.main(["start", task]), 0)
        command = run.call_args.args[0]
        self.assertEqual(command, ["codex", "-C", str(ROOT), "$enso-studio " + task])
        self.assertNotIn("env", run.call_args.kwargs)
        self.assertFalse(run.call_args.kwargs.get("shell", False))
        for forbidden in ("--ignore-user-config", "--model", "--sandbox", "--profile", "--agent"):
            self.assertNotIn(forbidden, command)

    def test_smoke_uses_a_real_read_only_probe_without_model_or_trust_overrides(self):
        stderr = io.StringIO()
        with patch.object(studio.shutil, "which", return_value="/installed/codex"), patch.object(studio.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as run, contextlib.redirect_stderr(stderr):
            self.assertEqual(studio.main(["smoke", "--timeout", "15"]), 0)
        command = run.call_args.args[0]
        for flag in ("exec", "--strict-config", "--ephemeral", "--json"):
            self.assertIn(flag, command)
        self.assertEqual(command[command.index("--sandbox") + 1], "read-only")
        self.assertEqual(command[command.index("--ask-for-approval") + 1], "never")
        self.assertIn("enso_coordinator", command[-1])
        self.assertIn("enso_qa_tester", command[-1])
        self.assertIn("fork_turns=none", command[-1])
        self.assertNotIn("env", run.call_args.kwargs)
        self.assertEqual(run.call_args.kwargs["timeout"], 15)
        self.assertIn("exit status alone is not proof", stderr.getvalue())
        self.assertNotIn("delegation succeeded", stderr.getvalue())

    def test_missing_cli_exits_with_helpful_error_without_attempting_execution(self):
        stderr = io.StringIO()
        with patch.object(studio.shutil, "which", return_value=None), patch.object(studio.subprocess, "run") as run, contextlib.redirect_stderr(stderr):
            self.assertEqual(studio.main(["smoke"]), 2)
        run.assert_not_called()
        self.assertIn("Codex CLI is not installed", stderr.getvalue())

    def test_timeout_does_not_claim_live_delegation_was_verified(self):
        stderr = io.StringIO()
        with patch.object(studio.shutil, "which", return_value="/installed/codex"), patch.object(studio.subprocess, "run", side_effect=subprocess.TimeoutExpired(["codex"], 1)), contextlib.redirect_stderr(stderr):
            self.assertEqual(studio.main(["smoke", "--timeout", "1"]), 124)
        self.assertIn("Native delegation has not been verified", stderr.getvalue())

    def test_invalid_deadlines_are_rejected_before_running_even_in_dry_run(self):
        for deadline in ("0", "-1", "nan", "inf"):
            with self.subTest(timeout=deadline):
                with patch.object(studio.subprocess, "run") as run, contextlib.redirect_stderr(io.StringIO()):
                    self.assertEqual(studio.main(["smoke", "--dry-run", "--timeout", deadline]), 2)
                run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
