import os
import sys
import json
import google.generativeai as genai

# 1. Validate API Key
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("\n[ERROR] Missing GEMINI_API_KEY secret in repository settings!")
    print("Please go to Settings -> Secrets and variables -> Actions and add GEMINI_API_KEY.\n")
    sys.exit(1)

genai.configure(api_key=api_key)

# 2. Extract Instruction from Event
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

print(f"[Canvas] Received instruction: {user_instruction}")

# 3. Read Existing Files for Context
context_files = [
    "README.md",
    "AGENTS.md",
    "index.html",
    "style.css",
    "ui/text-ui.js",
    "docs/design/ENSO_Status_Effects_Approved_Design.md",
    "docs/design/ISSUE_9_TECHNICAL_FEASIBILITY_UIUX_SPEC.md"
]

context_text = ""
for file_path in context_files:
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                context_text += f"\n--- {file_path} ---\n" + f.read()[:3500]
        except Exception as e:
            print(f"[Warning] Could not read {file_path}: {e}")

system_instruction = """
You are Canvas, the Lead Game UI/UX Designer and Technical Interface Architect for the 2D RPG project 'Nameless'.
Your role is to read the instruction and repository context, then output the updated or new files.
You MUST output ONLY a raw JSON array of objects. Do not use markdown backticks like ```json or ```.

JSON Format:
[
  {
    "path": "path/to/file.ext",
    "content": "Full file content string here"
  }
]
"""

full_prompt = f"""
{system_instruction}

PROJECT CONTEXT:
{context_text}

TASK INSTRUCTION:
{user_instruction}

Generate the JSON array:
"""

# 4. Call Model
print("[Canvas] Calling Gemini API...")
try:
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(full_prompt)
except Exception as e:
    print(f"\n[ERROR] Gemini API call failed: {e}\n")
    sys.exit(1)

# 5. Parse Output
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
    if not isinstance(files_to_write, list):
        raise ValueError("Model output was not a list of file objects.")
except Exception as e:
    print(f"\n[ERROR] Failed to parse model output as JSON: {e}")
    print(f"Raw Output:\n{raw_text}\n")
    sys.exit(1)

# 6. Write Files
for item in files_to_write:
    rel_path = item.get("path")
    content = item.get("content")
    if rel_path and content is not None:
        os.makedirs(os.path.dirname(rel_path), exist_ok=True)
        with open(rel_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Canvas] Wrote: {rel_path}")

print("[Canvas] Finished writing all files successfully.")
