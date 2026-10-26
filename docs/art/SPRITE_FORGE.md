# Agent Sprite Forge

[Agent Sprite Forge](https://github.com/0x0funky/agent-sprite-forge) (MIT, v0.4.0) is a Claude Code plugin with five
skills for 2D game art, plus deterministic Python tools that key, slice, palette, QA and export frames.

**It is ENSO's main tool for making its own original art** (owner decision, 2026-10-26: Mana Seed art is being dropped).
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
| `video2dsprite` | One image-to-video clip per action (idle, walk, attack, hurt...) from a master still | yes |
| `generate2dmap` | Maps, tiles, props, parallax; collision, nav and reachability checks; Tiled export | yes, for art; no, for map data and checks |
| `codeart2d` | Code-drawn pixel sprites, SVG icons, FX, autotiles, palette-exact | no |
| `generate2dmedia` | The route layer: API key, else a signed-in Codex or Grok CLI, else nothing | it is the route |

Image and video generation needs one provider key (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`, `ARK_API_KEY` or
`FAL_KEY`) in the environment or in the user config file, never in the repository. Every call is billed to that key;
`route_media.py` keeps a spend ledger. Character animation (`video2dsprite`) needs a video route: xAI, BytePlus or
fal.ai. With no key, `route_media.py resolve --kind image` answers `no-route` and only the processing tools and
`codeart2d` run.

## ENSO settings

Sprite Forge's defaults (HD finish, 1024 px masters, Godot exports) do not match ENSO. For game assets:

- Pixel finish (`--finish pixel`), at the real display size in `docs/SPRITES.md`, on the 16 px tile grid.
- One master still per character, approved by Saffron before any animation is made from it.
- Export frames as PNG atlases and pack them with `tools/pack-assets.js` (file:// PNGs break the WebGL pass).
- Record every new asset and its source (generated, with route, or code-drawn) in the sources table in `docs/SPRITES.md`.

## Leaving Mana Seed behind

Mana Seed art stays in the game until our own art replaces it, and while any of it is in the repository the permission
(`assets/LICENSE-manaseed.txt`) still binds us: **Mana Seed art is never used as reference or input for AI image
generation.** That covers making its replacement too:

- Never pass a Mana Seed file, frame, crop, palette, screenshot of the game, or the packs in the project files to
  `route_media.py`, `master_still.py`, `sprite_set.py` or any provider or CLI, and never write "in the style of Mana
  Seed" or "like the current sprites" into a prompt.
- Write prompts from ENSO's own visual direction (`docs/art/CH1_VISUAL_DIRECTION.md`) and use our own approved
  masters as the references for everything after them.
- When a Mana Seed asset is fully replaced, remove it and its row in `docs/SPRITES.md`.
