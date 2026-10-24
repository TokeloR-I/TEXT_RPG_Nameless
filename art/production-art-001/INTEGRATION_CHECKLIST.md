# Wren integration checklist — Production Art 001 (#145)

## Import status
**BLOCKED: original binary art is absent from `main`.** The merged #145 contains only a README, manifest and this handoff. Do not enable a "production" sprite sheet or claim creator parity until Vesper's original ZIP has been uploaded.

## Steps once the archive is available
1. Extract `ENSO_Production_Art_001_Vesper_WIP.zip` into `art/production-art-001/`, retaining source filenames and directory structure.
2. Run `node tools/check-production-art-001.js`. Expected minimum: 52 layer PNGs, 7 atlas PNGs, 4 ORA files; every PNG must have real PNG content on a 24×32 frame grid. This catches missing media and invalid files, **not** visual quality or registration correctness.
3. Inspect the uploaded atlas indices and register the real filenames in a separate `assets/sprites/vesper-production-art-001.js` using the `ENSO.spriteSheets` source-image schema from `docs/SPRITES.md`. Use the 12-cell facing × stand/stepA/stepB mapping only where the actual sheet provides those cells; hair sheets may have 4 rather than 12 cells. Preserve the (12,30) foot anchor.
4. Register `player.body`, `player.outfit.0/1`, and `player.hair.0/1.front/back` only after inspecting each atlas. Include a valid existing palette-sheet fallback for every image-backed registration; don't turn off the placeholder fallback for the other 10 hairstyles and two other outfits.
5. Authored PNGs are not recolored by `paletteFor()`. Before enabling these as default, confirm cosmetic skin/hair colour parity in both creator and gameplay, or gate the authored artwork to an exact supported palette choice. Do **not** silently discard player-selected colours.
6. Update `world.html` load order, and inline raster image URLs in `tools/build-single.js` for offline single-file play (current build inlines scripts but not general PNG sheets).
7. Verify idle and walking in all four facings, layers on up-facing, foot ground contact, first-run creator versus game appearance and saved cosmetics. Run `npm test`, `npm run world`, `npm run build`; Tally browser QA and Morrigan/Director art gates remain.

**No 48×64 redesign is authorized under #145.** This is a technical readiness contract, not a claim that the uploaded art exists.
