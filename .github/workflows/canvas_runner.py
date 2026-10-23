import os
import json
import google.generativeai as genai

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("Missing GEMINI_API_KEY secret in repository settings.")

genai.configure(api_key=api_key)

event_name = os.environ.get("EVENT_NAME", "workflow_dispatch")
issue_title = os.environ.get("ISSUE_TITLE", "")
issue_body = os.environ.get("ISSUE_BODY", "")
comment_body = os.environ.get("COMMENT_BODY", "")
dispatch_prompt = os.environ.get("DISPATCH_PROMPT", "")

if event_name == "workflow_dispatch":
    user_instruction = dispatch_prompt or "Implement or refine the UI according to current design requirements."
elif event_name == "issue_comment":
    user_instruction = comment_body.replace("/canvas", "").strip()
else:
    user_instruction = f"Title: {issue_title}\nDescription: {issue_body}"

# Safely gather existing project context
context_files = [
    "README.md",
    "AGENTS.md",
    "index.html",
    "style.css",
    "docs/design/ENSO_Status_Effects_Approved_Design.md"
]
context_text = ""
for file_path in context_files:
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                context_text += f"\n--- {file_path} ---\n" + f.read()[:4000]
        except Exception:
            pass

system_instruction = """
You are Canvas, the Lead Game UI/UX Designer and Technical Interface Architect for the 2D RPG project 'Nameless'.
Your job is to read the user instruction and repository context, then output the updated or new files.
You MUST respond ONLY with a raw JSON array of objects. Do not include markdown code block formatting (no ```json).

Format:
[
  {
    "path": "path/to/file.ext",
    "content": "Full file content here"
  }
]
"""

full_prompt = f"""
{system_instruction}

PROJECT CONTEXT:
{context_text}

TASK INSTRUCTION:
{user_instruction}

Generate the JSON array of files:
"""

model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content(full_prompt)

# Clean potential markdown fences from the response
raw_text = response.text.strip()
if raw_text.startswith("```json"):
    raw_text = raw_text[7:]
elif raw_text.startswith("```"):
    raw_text = raw_text[3:]
if raw_text.endswith("```"):
    raw_text = raw_text[:-3]
raw_text = raw_text.strip()

try:
    files_to_write = json.loads(raw_text)
    for item in files_to_write:
        rel_path = item.get("path")
        content = item.get("content")
        if rel_path and content:
            os.makedirs(os.path.dirname(rel_path), exist_ok=True)
            with open(rel_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"[Canvas] Successfully wrote: {rel_path}")
except Exception as e:
    print(f"Failed to parse JSON response: {e}")
    print(f"Raw model output:\n{raw_text}")
    exit(1)
