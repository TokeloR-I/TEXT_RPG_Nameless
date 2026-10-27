# Enemy sprites — independent QA

Verity, 2026-10-27. Scope: the original 64 × 64 enemy renderer, eight compass views, movement and combat poses, and authoritative animation timing. No production files were changed by QA.

## Results

- `node tests/run-tests.js enemy-sprites action-sim action-fx movement-facing`: **29/29 passed**, including all four new enemy-art tests.
- Independent SHA-256 comparison of exported RGBA frames: all 13 authoritative enemy keys have eight distinct facing views (**104** total); each enemy in each facing has eight distinct gait frames (**832** total).
- Independent exhaustive raster probe across 13 enemies × 8 directions × all declared finite state frames: **3,328 frames**, zero opaque pixels touching any 64 × 64 cell boundary, zero partially transparent pixels. The production regression also covers the Warden's attack variants.
- Independent snapshot probe: a 1,000 ms windup at its midpoint returns elapsed 500 ms and progress 0.5; a 100 ms active phase returns elapsed 50 ms and progress 0.5. Hurt elapsed time also follows its actual 160 ms window. Phase duration comes from the simulation rather than a fixed art timer.
- Inspected the original-only directional contact sheet (`/tmp/enemies.png` during this session). All 13 enemy archetypes have distinguishable silhouettes, anatomy and equipment. Eight directions show changes in anatomy projection rather than a flat rotated image.
- Diff review: action rendering draws the new art at native 1× with anchor (32,54), consumes actor angle, and avoids mirroring authored directional views. Classic battle cards and legacy encounter markers prefer the original module. Existing unknown-enemy fallback remains. Gameplay data, collision geometry and combat durations were not altered.

## Findings resolved during implementation

1. Five enemies initially produced only five unique gait rasters from eight declared frames. Reported to Ember; opposing foot lifts were corrected. Final independent rerun produces eight unique frames in every enemy/facing combination.
2. Initial Warden windup and several death frames touched frame edges. Reported to Ember; final exhaustive independent probe reports zero edge pixels. The separate production regression covers the corrected Chain Lock extension.

No unresolved defect was found in the executed headless scope.

## Follow-up: health-bar placement

The root integrator's browser review found small enemies' bars positioned against transparent frame margins. After the implementation switched to cached opaque-art bounds, Verity independently reran `node tests/run-tests.js enemy-sprites action-sim action-fx movement-facing`: **30/30 passed**. The added regression verifies bounds against exact alpha pixels, the returned world-space top, and frame-cache reuse. Diff inspection confirms `drawEnemy()` returns the visible bounds after its presentation offset, and `world-ui.js` places bars four pixels above that visible top. Root owns the recaptured browser evidence; no independent browser retest is claimed.

## Coverage limits

Independent browser launch failed under the sandbox (`setsockopt: Operation not permitted`). An attempt with additional network permissions remained pending and was aborted; no browser capture or interactive browser scenario is claimed here. The root integrator owns live desktop/mobile/offline browser captures and the full `npm test`, world and build checks. Greyscale/night readability, live animation feel and real encounter overlap therefore require that separate visual evidence; frame hashes alone do not establish those subjective results.
