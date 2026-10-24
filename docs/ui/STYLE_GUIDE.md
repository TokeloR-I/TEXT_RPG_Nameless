# UI style guide (Pixie, UI/UX)

The rules every screen of the graphical game (`world.html`) follows. Tokens live at the top of `world.css`;
the battle screen is the first screen built entirely from them. See [DECISIONS.md](DECISIONS.md) for what was
kept or replaced, and [UI_AUDIT_AND_PLAN.md](UI_AUDIT_AND_PLAN.md) for the order the other screens follow.

Priorities when rules conflict: **readability > consistency > feel > everything else.**

## Resolution and scaling
- The world canvas is **640×448** (20×14 tiles of 32 px). Overlays are sized in `cqw` of the stage, so they scale with it.
- Sprites keep one art-pixel size per screen. In battle, creatures (32 px box) and the player (40×36 canvas)
  both draw at **10cqw per 32 art pixels**, so a pixel of a rat is the same size as a pixel of you.
- Always `image-rendering: pixelated`; never smooth a sprite.
- **Not yet:** integer scaling of the stage. Today the stage stretches to fit (e.g. 1.75× at 1120 px wide), so
  some pixels are a screen pixel wider than others. Fixing it is plan item P1 (with a Settings toggle).

## Palette tokens
Use the token, never a new hex value in a component. If a colour is missing, add a token first.

| Token | Use |
|---|---|
| `--c-void` | page background and letterbox |
| `--c-ink` / `--c-ink-dim` / `--c-ink-mute` | body text / secondary text and key hints / disabled text |
| `--c-win-hi` `--c-win-mid` `--c-win-lo` | the three bands of a window's fill |
| `--c-frame-hi` `--c-frame` `--c-frame-lo` | window frame: lit edge, frame, outer shadow |
| `--c-accent` | focus, cursor, selection (the glow in your hands) |
| `--c-gold` | objectives, rewards, victory, important log lines |
| `--c-hp` `--c-hp-mid` `--c-hp-low` | HP bar above half / above a quarter / below a quarter |
| `--c-res` | class resource bar (Mana, Energy, Momentum…) |
| `--c-foe` | enemy HP bar at full health |
| `--c-st-buff` `-debuff` `-control` `-dot` `-mark` `-cooldown` `-other` | status categories (same colours as `ui/combat-fx.js` `STYLE.status`) |

The older names (`--ink`, `--panel`, `--edge`, …) still exist as aliases so unmigrated screens keep working.
They go away once every screen is on the new tokens.

## Type
- One family: the monospace stack in `body`. A real pixel font is plan item P5 (needs the owner's choice of an
  authored or open-licence font, bundled locally so the game stays double-click playable).
- Base size is the screen's `font-size` (battle: `clamp(11px, 1.65cqw, 16px)`). Inside a screen use only
  **1em** (body), **0.85em** (secondary, plates, help line), **0.78em** (headers in caps, key hints) and
  **0.72em** (status chips). Nothing smaller than 0.72em, and never below 10 px.
- Headers in small caps style: `text-transform: uppercase` with `letter-spacing: 0.1–0.22em`.
- Numbers that change (HP, resource) use `font-variant-numeric: tabular-nums` so they don't jitter.

## Window frame (`.win`)
- Banded fill in three hard steps (no smooth gradients), a 2 px frame in `--c-frame`, a 1 px inner shadow,
  a faint lit top edge and notched pixel corners (`clip-path`). Padding `0.55em 0.8em`.
- Every menu, status and message window uses `.win`. Floating labels (name plates, the round tag) use a
  plain 1 px frame on a dark fill instead, so windows stay the strongest shape on screen.

## Components
| Component | Class | Rules |
|---|---|---|
| Window | `.win` | as above |
| Command list | `.menu` + `li.selected` / `li.disabled` | one line per entry; `▶` cursor with a 2-step nudge; selected has an accent border; disabled is muted with `✕` and is still selectable so its reason can be read |
| Help line | `.b-help` | the highlighted entry's detail, or `Unavailable · <engine's reason>`; always present so the window doesn't jump |
| Bar | `.bar.hp` / `.res` / `.enemy` + `.tone-*` | 10 % segment ticks; HP and enemy bars shift tone at 50 % and 25 %; a light trail drains from the old value after a hit |
| Status chip | `.chip.st-<category>` | glyph + name + `×stacks` + rounds left; colour is the second cue, never the only one; full text in `title` |
| Key hint | `kbd` | accent text, 1 px frame with a 2 px bottom edge |
| Name plate | `.plate` | name, bar, numbers, chips; accent frame when targeted |
| Target cursor | `.b-cursor` | `▼` above the aimed unit, 2-step bob |

Status glyphs: buff `▲`, debuff `▼`, dot `✸`, control `◆`, mark `◎`, cooldown `⧗`, other `•`
(`ui/battle-view.js`, tested).

## Spacing
4 px steps (`--sp-1` … `--sp-4`) for fixed spacing; layout gaps in `cqw` so they scale with the stage.

## Motion
- Frame-based (`steps()`) for anything pixel: cursor nudge and bob (0.6 s, 2 steps), hit shake (0.3 s, 4 steps),
  HP trail (420 ms, 6 steps, 180 ms delay so the hit number lands first).
- UI never waits on an animation: input is live while effects play.
- `prefers-reduced-motion`: every looping or decorative animation is off (see the media query in `world.css`).

## Lighting
Lighting belongs to the renderer (`ui/world-render.js`, GFX-3). UI windows never add glows of their own,
except the focus/selection accent.

## Input and focus
- Keyboard first: arrows/WASD move, Enter/E/Space confirm, Esc/Backspace back. Each screen lists its keys in
  a `kbd` hint line. Mouse: click an entry to choose it. Touch: the on-screen pad sends the same keys.
- Focus is always visible: the selected entry has a cursor **and** a border, never colour alone.
- New keys are screen-local and listed in that screen's hint (battle: `L` opens the full log).
- Gamepad support is plan item P4.
