# Loot and equipment implementation validation — 25 October 2026

Implementation report for #169 and #170, prepared by Codex. This is reproducible developer validation, **not Tally’s balance sign-off**. The numeric candidates were implemented without changing class base stats or enemy combat kits.

## Checks

- `npm test`: 403/403 tests passed, including seeded probability tests, snapshots, save/load, ten Black Flight/re-entry cycles, error retention, equipment lifecycle and text/action parity.
- `npm run world`: world data and sprite sheets valid.
- `npm run build`: both standalone HTML builds produced successfully.
- `git diff --check`: clean.
- Chromium at 1280×900 and 390×844: bought armor, sold materials, sold class-incompatible rolled equipment, returned to conversation with Escape, opened Equipment. No page errors. Reproduce with `python -m http.server 8765 --bind 127.0.0.1` and `node qa/scripts/loot-browser.js` (Playwright required for this optional QA tool).

## Probability and accounting evidence

`tests/50-universal-loot.test.js` runs 10,000 rolls for each of the eight profiles; material, equipment and consumable frequencies are asserted within ±1 percentage point. It separately checks 10,000 rarity selections at levels 1, 3, 4, 7, 10 and 20, level downgrades, elite multipliers and the Warden’s independent special reward. Materials resolve to real sellable definitions. `tests/51-generated-equipment.test.js` checks 1,000 eligible generated records, committed seed-170 snapshots, flat damage/armor formulas, all six affixes, prices, class/level refusals and two-hand displacement.

Across 200 mandatory-route accounting trials, before the Warden: **minimum 66, mean 74.085, 10th percentile 70, maximum 81 Gold**. All trials had exactly 250 XP before the Warden. The guaranteed design bounds are 65–83, and the first gate remains 0 Gold / 0 materials. These accounting trials force victories and skip spending/sales; they make no survival claim.

## Combat observations

Command: `node tools/loot-acceptance.js 200 qa/results/loot-acceptance-2026-10-25.json`.

Each row uses seeds 1–200 twice. Both arms have the new economy, mandatory route, Iona healing purchases and the existing smart bot. The control has no equipment; the combined arm equips starters and positively scored eligible loot. No forced HP or optional farming is used in combat trials. All rows reached the Warden in 200/200 runs; no engine errors occurred across 4,800 trials.

| Class | Branch | Economy without gear: wins | Economy plus gear: wins |
|---|---|---:|---:|
| warrior | vanguard | 200/200 | 200/200 |
| warrior | berserker | 200/200 | 200/200 |
| warrior | warden | 200/200 | 200/200 |
| mage | elementalist | 200/200 | 200/200 |
| mage | illusionist | 145/200 | 177/200 |
| mage | chronomancer | 89/200 | 148/200 |
| rogue | assassin | 68/200 | 149/200 |
| rogue | duelist | 200/200 | 200/200 |
| rogue | saboteur | 200/200 | 200/200 |
| necromancer | bone_warden | 189/200 | 200/200 |
| necromancer | plaguecaller | 189/200 | 200/200 |
| necromancer | soulbinder | 189/200 | 200/200 |

These are full-route observed wins, not a guarantee for human players. The historical QA #12 class reference (Warrior 55%, Mage 15%, Rogue 28%, Necromancer 0%) used a different economy and route setup. This is not a reproduction of those percentages. The branch variation and large improvement from healing warrant Tally review before calling the candidates balanced. Same seed pairs are reproducible; changing fight duration changes subsequent RNG consumption. Armor’s DEF still mitigates all non-true direct damage under the existing engine semantics, including magic.

## Content and review limits

- No functional legendary item/effect was authored in the supplied design. Legendary rarity is selected at its specified weight at eligible levels, but the current table explicitly falls back to the highest implemented eligible rarity and reports the fallback. No fake legendary is awarded. A designer-authored unique item and functional effect implementation are still required before legendary equipment can enter stock.
- The supplied physical weapon and armor affix pools each contain only two eligible families. Such bases are eligible through Rare. Epic generation selects bases with three legal families (currently arcane equipment); it never duplicates a family or invents an affix. Expanding Epic physical/armor pools needs additional approved families.
- Consumable chances and armor/affix values remain first-pass candidates pending Vaelis/Tally review. This report does not close either issue’s human acceptance gate.
- Old saves that already paid kill coins mark those credited enemy IDs as legacy claims to prevent a second payout. New rolls are persisted under `stats.lootClaims`; generated records live under `player.itemInstances`. Overflow retains pending rewards for retry; invalid authored drops retain a durable error.
