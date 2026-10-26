# Agent Sprite Forge

[Agent Sprite Forge](https://github.com/0x0funky/agent-sprite-forge) (MIT, v0.4.0) is a Claude Code plugin with five
skills for 2D game art, plus deterministic Python tools that key, slice, palette, QA and export frames.
Owner: Saffron (art direction) with Quill (pipeline). Wren uses it for engine-side sprite work.

## Install

```bash
claude plugin marketplace add 0x0funky/agent-sprite-forge --sparse .claude-plugin skills
claude plugin install agent-sprite-forge@agent-sprite-forge
python -m pip install "numpy>=1.26" "Pillow>=10.1" "scipy>=1.11"
```

Start a new session so the skills load. Video work also needs `ffmpeg` 5.1+ on `PATH`. Check the setup with:

```bash
python "<plugin>/skills/generate2dmedia/scripts/forge_doctor.py"
```

`<plugin>` is `~/.claude/plugins/cache/agent-sprite-forge/agent-sprite-forge/<version>`.

## The skills

| Skill | What it does | Needs an image or video route |
|---|---|---|
| `generate2dsprite` | Master stills, sprite sheets, FX, icons; key, slice, palette, QA, export | yes, to generate; no, to process frames we already have |
| `video2dsprite` | One image-to-video clip per action from a master still | yes |
| `generate2dmap` | Maps, tiles, props, parallax; collision, nav and reachability checks; Tiled export | yes, for art; no, for map data and checks |
| `codeart2d` | Code-drawn pixel sprites, SVG icons, FX, autotiles, palette-exact | no |
| `generate2dmedia` | The route layer: API key, else a signed-in Codex or Grok CLI, else nothing | it is the route |

No API key is configured for this project, so `route_media.py resolve --kind image` answers `no-route` and only the
processing tools and `codeart2d` run. Image generation needs a provider key (`OPENAI_API_KEY`, `GEMINI_API_KEY`,
`XAI_API_KEY`, `ARK_API_KEY` or `FAL_KEY`), and every call is billed to that key.

## How it fits with Mana Seed

All of ENSO's art is Mana Seed by Seliel the Shaper, used under written permission with one condition
(`assets/LICENSE-manaseed.txt`): **the art is never used as reference or input for AI image generation.**
Sprite Forge's generation paths take reference images (master-still edits, image-to-video, reference edits), so:

1. **Never** pass a Mana Seed file, frame, crop, palette swatch or screenshot containing Mana Seed art to
   `route_media.py`, `generate_media.py`, `cli_media.py`, `master_still.py`, `sprite_set.py` or any provider or CLI.
   That includes the packs in the project files and `assets/src/tiles/manaseed.png`, `assets/sprites/manaseed.js`.
2. **Allowed without asking:** the deterministic tools on our own frames (slicing, `sheet_qc.py`, `pixel_qa.py`,
   palette and scale checks, Aseprite or Tiled exports), the map checks in `generate2dmap`, and `codeart2d` for things
   Mana Seed does not cover, such as combat VFX and UI icons. These are plain Python, not AI image generation.
   Code-drawn output must match the Mana Seed look (16 px grid, the pack's palette ramps, no blur) and is listed in
   `docs/SPRITES.md` as code-drawn.
3. **Generated art is a creative-direction change.** Adding AI-generated characters, tiles or props to a game whose
   art is Mana Seed goes to Tokelo first, even with a key configured. If approved, prompts are written from scratch
   and never cite or show Mana Seed art.

Sprite Forge's own defaults (HD finish, 1024 px masters, Godot exports) do not match ENSO. Use the pixel finish, the
real display size (64×64 Mana Seed character frames, 16 px tiles, `docs/SPRITES.md`), and pack results with `tools/pack-assets.js`.
