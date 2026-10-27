# Enemy art integration — 2026-10-27

All 13 current enemy definitions now have original native 64×64 pixel art at eight compass angles. The walk cycle has eight distinct frames in every direction; idle, anticipation, strike, recovery, hurt, stagger and death have separate pose sequences. Anatomy is projected for each facing, rather than rotating a flat picture. Weapon, fur, bone, cloth and armour detail use original material ramps. No third-party image inputs were used.

Combat poses read elapsed time and normalized progress from the actual simulation phase, so different attack durations and boss phases retain their tells. Crow Warden halberd, crows and chain have distinct poses. Native resolution is used in-world; battle cards and legacy encounter markers also use the new art. Collision, enemy statistics and combat durations are unchanged. Health bars follow the actual opaque top of each rendered pose (the initial full-frame calculation left rat bars floating too high; fixed and regression-tested). Lazy raster frames and bounds share a bounded 384-frame cache.

## Verification

- Full suite: **491/491 pass**; `npm run world` and both single-file builds pass.
- Independent specialist QA: **30/30 relevant tests pass**, 104 distinct direction views, 832 distinct gait frames; see [REPORT.md](REPORT.md).
- Root Chromium source build at 1440×1000: actual Rust Rat encounter naturally traversed idle/move/windup/attack/recover; engine remained in seamless combat/exploration screen, progress stayed within 0–1. All 13 battle-card paths and unknown-key fallback rendered nonempty pixels. No page errors.
- Chromium self-contained world build at 390×844: original enemy module loaded all 13 keys at 64×64; a live wolf encounter rendered successfully. No page errors. See [browser-results.json](browser-results.json).
- Visual review of the directional sheet and in-game captures confirms readable silhouettes and corrected health-bar placement. These are development-machine checks, not a performance claim for every device.

## Review art

[All enemies, eight directions](eight-directions.png) · [live combat](in-game-combat.png) · [phone built game](phone-built-game.png).

[Eight-direction walking](eight-direction-walk.gif) · [eight-direction attacks](eight-direction-attacks.gif). Animated preview rows are goblin, wolf, ghoul, Warden; columns N, NE, E, SE, S, SW, W, NW at 2× nearest neighbour. Combat preview uses evenly spaced review frames; the game uses actual attack-phase timing.

Generate the interactive offline review with `node tools/preview-enemies.js /tmp/enso-enemies.html`. It includes every enemy, direction, gait frame and combat phase plus Warden variants, scrubbing, native/2× scale, greyscale and night toggles. Reproduce browser checks with `ENSO_BASE_URL=http://127.0.0.1:8877/enso-enemy-sprites node qa/scripts/enemy-sprites-browser.js` against a local server after `npm run build` (optional Playwright and Chromium; no game dependencies added).
