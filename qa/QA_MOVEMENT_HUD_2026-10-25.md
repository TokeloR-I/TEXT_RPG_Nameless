# Walking, facing and HUD regression verification — 2026-10-25

User playtest fixes against main `b83f99e`: missing walking animation, mouse overriding WASD turning, and an obstructive bottom-left player HUD. Orion coordinated Flint (movement), Lumen (HUD) and Verity (independent verification); root integrated and ran browser checks.

- **Cause:** legacy tile animation cleanup reset the action sim's moving flag before drawing. Action input also reused passive mouse aim for eight seconds, so keyboard travel faced the cursor.
- **Behavior:** action walking reaches the sprite renderer, WASD turns, and releasing keys retains facing. Keyboard/HUD attacks and skills face forward; LMB/RMB explicitly aim, and Tab remains an explicit lock. An action commits its direction before startup and retains action-pose priority.
- **HUD:** portrait/name/level/HP/resource are compact at top left; the quest is top right, empty exploration skill slots collapse, and equipped skills remain accessible. Portraits retry while image layers load. Desktop boss/quest spacing and phone layout were checked together.

## Evidence

- `npm test`: **473/473 passed**, including new movement, input, frame-handoff and portrait/cache regressions. Verity independently passed the combined 40-test targeted suite and direct state/portrait probes.
- `npm run world`, `npm run build` and `git diff --check`: passed. Both standalone HTML builds produced.
- Playwright/Chromium at **1280×900** and **390×844**, seed170: baseline rendered zero walking frames and passive mouse motion changed facing. After the fix both sizes render all six walking poses; four WASD directions and retained idle facing pass, passive mouse motion does not turn, keyboard1 faces forward and deliberate clicking aims right. Actual portrait pixels are nontransparent. No page errors.
- An isolated HUD combat-layout fixture combines the real Warden title, long player name and quest; player/boss/quest rectangles do not overlap on either viewport. This fixture verifies geometry, not a full Warden fight.

Reproduce browser checks after serving the repository: `ENSO_BASE_URL=http://127.0.0.1:8876/enso-movement-hud node qa/scripts/movement-hud-browser.js <capture-directory>`. Set the URL to your actual local server root. Playwright is an optional QA tool, not a new game dependency. `--baseline` captures observations without asserting the fixed behavior.

Captures: [desktop before](../docs/captures/movement-hud/before-desktop.png), [desktop after](../docs/captures/movement-hud/after-desktop.png), [phone before](../docs/captures/movement-hud/before-phone.png), [phone after](../docs/captures/movement-hud/after-phone.png), [desktop boss layout](../docs/captures/movement-hud/after-desktop-boss-layout.png), [phone boss layout](../docs/captures/movement-hud/after-phone-boss-layout.png).
