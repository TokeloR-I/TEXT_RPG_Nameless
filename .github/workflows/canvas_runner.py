import os
import json
from google import genai
from google.genai import types

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("Missing GEMINI_API_KEY secret.")

client = genai.Client(api_key=api_key)

event_name = os.environ.get("EVENT_NAME")
issue_title = os.environ.get("ISSUE_TITLE", "")
issue_body = os.environ.get("ISSUE_BODY", "")
comment_body = os.environ.get("COMMENT_BODY", "")
dispatch_prompt = os.environ.get("DISPATCH_PROMPT", "")

# Determine prompt instruction
if event_name == "workflow_dispatch":
    user_instruction = dispatch_prompt
elif event_name == "issue_comment":
    user_instruction = comment_body.replace("/canvas", "").strip()
else:
    user_instruction = f"Title: {issue_title}\nDescription: {issue_body}"

# Gather project context summary
context_files = [
    "README.md",
    "AGENTS.md",
    "docs/design/ENSO_Status_Effects_Approved_Design.md"
]
context_text = ""
for file_path in context_files:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            context_text += f"\n--- {file_path} ---\n" + f.read()[:3000]

system_instruction = """
You are Canvas, the Lead Game UI/UX Designer and Technical Interface Architect for the 2D RPG project 'Nameless'.
Your mandate is to inspect the user's task and the repository context, then generate file modifications or new files.
You MUST respond ONLY with a valid JSON array of objects representing the files to create or overwrite.
Do not output markdown code blocks outside the JSON.

Output format:
[
  {
    "path": "path/to/file.ext",
    "content": "Full file content here"
  }
]
"""

full_prompt = f"""
PROJECT CONTEXT:
{context_text}

TASK INSTRUCTION:
{user_instruction}

Generate the exact files needed to complete this task.
"""

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=full_prompt,
    config=types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        temperature=0.2
    )
)

try:
    files_to_write = json.loads(response.text)
    for item in files_to_write:
        rel_path = item.get("path")
        content = item.get("content")
        if rel_path and content:
            os.makedirs(os.path.dirname(rel_path), exist_ok=True)
            with open(rel_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"[Canvas] Successfully wrote: {rel_path}")
except Exception as e:
    print(f"Failed to parse or write files: {e}")
    print(f"Raw response: {response.text}")
    exit(1)
