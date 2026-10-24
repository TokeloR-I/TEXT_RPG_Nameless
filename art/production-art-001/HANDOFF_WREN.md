# Wren — Vesper handoff (WIP)

Target repository pipeline: `docs/SPRITES.md`, `ui/sprites.js`, `assets/sprites/player-placeholder.js`.

**Don't replace existing placeholders or change runtime code from this PR.** This branch contains metadata only until the existing PNG/ORA assets are uploaded.

### Planned atlas registrations
- `player.body`: four directions × stand/stepA/stepB, 12 cells total at 24×32.
- `player.outfit.0`, `player.outfit.1`: same 12-cell layout.
- `player.hair.0.front`, `player.hair.0.back`, `player.hair.1.front`, `player.hair.1.back`: four directions each.
- Anchor remains (12,30).
- Keep old missing-sheet fallback until verified.

### Compatibility risks
The existing browser PNG sheets are drawn as authored and **are not recolored** by `paletteFor()`; skin and hair color changes therefore require an explicit solution. Also, PNG image fallbacks need existing registered palette-sheet fallback IDs while loading. The creator and world must both call `ENSO.sprites.drawCharacter`, as currently documented.

### Wren verification
After asset upload, run `npm run world` and `npm test`. Check both stand and walking frames in the browser; verify all directions, foot anchor, layering with hair-back on up direction, hairstyle/outfit selection and creator/world identity. No 48×64 renderer change is authorized by this handoff.
