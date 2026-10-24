# Nahemoth — Black Flight VFX 001

**Authorized by Creative Director 24 October 2026.** Original transparent 12-frame visual-effects artwork by Sable (2D VFX). Visual direction is based on the project's confirmed Nahemoth behavior (the player dissolves into dark feathers and reappears at a previously discovered safe anchor). This first-pass art requires Morrigan's visual review before final style lock.

## Art deliverables
- `black-flight-atlas.svg`: **actual frame-by-frame artwork**, 12 adjacent 96 × 96 transparent frames; charcoal-black living feathers, amethyst-cold shadows, broken flutter and reassembly. This is not gameplay logic or an animated CSS substitute.
- `black-flight.json`: authored timing and atlas coordinates for Wren. Duration 760ms total, nonlooping. The engine decides if Black Flight succeeds; rendering happens only after authorization.

## Sequence
Departure frames **0–5**: silhouette fragments into orbiting shadow-feathers. Arrival **6–11**: shadow feathers coil inward and corporeal fragments settle. A destination-change callback is for Wren to bind at the point where his transition state accepts a successful flight—not for Sable to implement.

## Art/technical handoff
Transparent SVG atlas can be loaded with `Image` and sampled using `drawImage(img, index * 96, 0, 96, 96, dstX, dstY, width, height)`. Disable smoothing for deliberate pixel edges. World sprite's feet anchor is approximately **48,76** in local effect coordinates. Scale relative to the current 24×32 character so the feather cloud reaches beyond their silhouette.

Do **not** replace the actual player sprite or introduce any map teleport rule. Hide on reduced motion, substituting a short crossfade / single frame. Keep the effect separate from normal Crow-Touched Warden birds: these are impossible shadow-feathers from the broken seal, not literal animals.

## Required validation
Morrigan checks feather language and palette; Wren checks atlas compatibility and asset bundling (single-file offline build currently needs special handling for external images); Pixie reviews any menu overlay; Tally checks visibility, opacity, frame timing, browser performance, reduced motion, and that blocked travel never fires the effect.

This work is **asset-only**; no engine, UI or renderer code changed.
