"""Canvas (Gemini) UI/UX agent runner for GitHub Actions.

Reads the task from the triggering issue / comment / manual dispatch, sends it to Gemini together with
the UI files it may change, validates the reply, and writes the files. The workflow then runs `npm test`
and opens a pull request; the owner merges (AGENTS.md).

Environment (set by .github/workflows/canvas-agent.yml):
  GEMINI_API_KEY   repository secret (required)
  GEMINI_MODEL     model id; defaults to DEFAULT_MODEL (override with the repo variable GEMINI_MODEL)
  EVENT_NAME, ISSUE_TITLE, ISSUE_BODY, COMMENT_BODY, DISPATCH_PROMPT
  CANVAS_RESULT    file to write a short human-readable result to (posted back on the issue)
"""
import json
import os
import sys

DEFAULT_MODEL = "gemini-3.8-flash"   # gemini-1.5-* were shut down on 2025-09-29

# Files Canvas may create or change. Everything else (engine, data, tests, workflows) is refused,
# matching the ownership rules in AGENTS.md: the UI never touches game rules.
ALLOWED_FILES = {"index.html", "style.css", "world.html", "world.css"}
ALLOWED_DIRS = ("ui/", "docs/ux/")

# Context sent to the model, in full (no truncation: the model returns whole files, so it must see them whole).
CONTEXT_FILES = [
    "AGENTS.md",
    "README.md",
    "docs/AGENT_ROSTER.md",
    "docs/design/ZONE_1_FORGOTTEN_HOMESTEAD.md",
    "docs/design/ISSUE_9_D1_D3_DECISION_REGISTER.md",
    "index.html", "style.css", "ui/text-ui.js",
    "world.html", "world.css", "ui/world-ui.js", "ui/world-render.js",
]
MAX_SHRINK = 0.5   # refuse a rewrite that drops more than half of an existing file (truncated output)

result_lines = []


def report(line):
    print(line)
    result_lines.append(line)


def finish(code):
    path = os.environ.get("CANVAS_RESULT")
    if path:
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(result_lines) + "\n")
    sys.exit(code)


def fail(msg):
    report(f"[ERROR] {msg}")
    finish(1)


def allowed(rel):
    norm = os.path.normpath(rel).replace("\\", "/")
    if os.path.isabs(rel) or norm.startswith("../") or norm == ".." or "/../" in f"/{norm}/":
        return None
    if norm in ALLOWED_FILES or norm.startswith(ALLOWED_DIRS):
        return norm
    return None


def instruction():
    event = os.environ.get("EVENT_NAME", "workflow_dispatch")
    if event == "workflow_dispatch":
        return os.environ.get("DISPATCH_PROMPT") or "Implement or refine the UI according to the current design documents."
    if event == "issue_comment":
        body = os.environ.get("COMMENT_BODY", "").strip()
        text = body[len("/canvas"):].strip() if body.startswith("/canvas") else body
        # A bare "/canvas" comment means: do what the issue asks.
        return text or f"Title: {os.environ.get('ISSUE_TITLE', '')}\n\n{os.environ.get('ISSUE_BODY', '')}"
    return f"Title: {os.environ.get('ISSUE_TITLE', '')}\n\n{os.environ.get('ISSUE_BODY', '')}"


def build_prompt(task):
    parts = []
    for p in CONTEXT_FILES:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                parts.append(f"===== FILE: {p} =====\n{f.read()}")
        else:
            print(f"[Canvas] (context file not found, skipped: {p})")
    return "\n\n".join(parts) + f"\n\n===== TASK =====\n{task}\n"


SYSTEM = f"""You are Canvas, the UX Designer agent for the game project in this repository (Enso's Last Stand).
Read AGENTS.md first and follow it. You may only create or change these files: {sorted(ALLOWED_FILES)} and files under {list(ALLOWED_DIRS)}.
Never change game rules: src/, tests/, tools/ and .github/ are owned by other agents.
Return ONLY a JSON array. Each element is {{"path": "<repo-relative path>", "content": "<the COMPLETE new file content>"}}.
Include only files you change or create. Each content must be the whole file, not a fragment or a diff.
If the task needs changes outside your files, return [] and explain why in a file docs/ux/CANVAS_NOTES.md instead."""


def main():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        fail("GEMINI_API_KEY is empty. Add it under Settings -> Secrets and variables -> Actions -> Repository secrets.")
    model = os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        fail("The google-genai package is not installed (pip install google-genai).")

    task = instruction()
    report(f"[Canvas] Model: {model}")
    report(f"[Canvas] Task: {task[:300]}{'...' if len(task) > 300 else ''}")

    try:
        client = genai.Client(api_key=key)
        response = client.models.generate_content(
            model=model,
            contents=build_prompt(task),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM,
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=65536,
            ),
        )
    except Exception as e:  # network, auth, unknown model, quota...
        fail(f"Gemini API call failed for model '{model}': {e}")

    text = response.text
    if not text:
        reason = None
        try:
            reason = response.candidates[0].finish_reason if response.candidates else response.prompt_feedback
        except Exception:
            pass
        fail(f"Gemini returned no text (finish reason / feedback: {reason}).")

    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.rstrip().endswith("```"):
            raw = raw.rstrip()[:-3]
    try:
        files = json.loads(raw)
    except json.JSONDecodeError as e:
        fail(f"Model output is not valid JSON ({e}). First 500 characters:\n{raw[:500]}")
    if not isinstance(files, list):
        fail("Model output is JSON but not a list of {path, content} objects.")

    # Validate everything first, then write: no half-applied changes.
    planned, refused = [], []
    for item in files:
        if not isinstance(item, dict) or not isinstance(item.get("path"), str) or not isinstance(item.get("content"), str):
            refused.append(f"{item!r:.80} (not a {{path, content}} object)")
            continue
        rel = allowed(item["path"])
        if not rel:
            refused.append(f"{item['path']} (outside Canvas's files)")
            continue
        if os.path.exists(rel):
            with open(rel, "r", encoding="utf-8") as f:
                old = f.read()
            if len(old) > 2000 and len(item["content"]) < len(old) * MAX_SHRINK:
                refused.append(f"{rel} (new version is {len(item['content'])} chars vs {len(old)}: looks truncated)")
                continue
        planned.append((rel, item["content"]))

    for r in refused:
        report(f"[Canvas] Refused: {r}")
    if refused and not planned:
        fail("Every file in the reply was refused; nothing written.")

    for rel, content in planned:
        d = os.path.dirname(rel)
        if d:
            os.makedirs(d, exist_ok=True)
        with open(rel, "w", encoding="utf-8") as f:
            f.write(content)
        report(f"[Canvas] Wrote: {rel}")

    if not planned:
        report("[Canvas] The model returned no file changes.")
    finish(0)


if __name__ == "__main__":
    main()
