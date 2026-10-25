# Compact skill dock — 2026-10-25

Request: replace skill abbreviations with images, reduce the dock footprint and stop it obscuring Strongbox dialogue.

Implemented original offline SVG pictograms, compact 32–52px slots and full names on hover/focus. Resource costs, key bindings, cooldowns and castability still come from the existing rules path. All action HUD controls hide and become inert during modals and transitions.

Validation: 480/480 tests; world validation; both single-file builds. Chromium desktop 1920×1080 and phone 390×844 runs reproduced the actual tollway Strongbox interaction. Four distinct necromancer icons rendered; dock dimensions were 312×67px and 179×37px. Opening dialogue hid the HUD, set inert/aria-hidden, and blocked skill input without spending resource; closing restored it. Pause hid/restored the HUD. Tooltips stayed onscreen. No browser errors. Regression script: `qa/scripts/skill-dock-browser.js` (optional Playwright installation; not a game dependency).

Desktop captures: [icons](captures/skill-ui-desktop.png), [dialogue](captures/skill-ui-dialogue.png). Phone: [icons](captures/skill-ui-phone.png), [dialogue](captures/skill-ui-phone-dialogue.png).

No balance or game rules changed. Owner reviews and merges the PR.
