# The Hrimvald kitchen: Norse food, mead, regional hearths, the camp kit and Sour Herring

**Owner request:** Tokelo, 2026-11-13 (thread "Add Norse food and surströmming prank"): "a bar with mead, ... local food
found in the norse area with relevant buffs and also a prank quest for surströmming". Then: "make sure the player can
make the food in the region, let the home hearth be the one with all recipes for all regions, so no need to mix food
specialties in different regions (only exception is rat related food)", "let there be a hearth available in the
chapter 2 areas", and a portable hearth taught by someone on the road.
**Mechanics:** Thorne (same rules as `COOKING_AND_FOOD.md`). **Numbers (first pass, candidates):** Gauge, all in
`src/data.js`. **Story:** `src/story/chapter2.js`. **Tests:** `tests/101-norse-kitchen.test.js`.
Built on existing Chapter Two maps only (no new area without Tokelo's picture).

## Regional cooking (new rule)

| Hearth | Cooks |
|---|---|
| Your homestead hearth (Chapter One) | every region's dishes |
| Public hearths in Blackbriar Vale (Baker's Lane, the festival hearth) | Chapter One's (German) dishes |
| Skeldvik harbour cookfire, Hrafnholm feast fire | Hrimvald's (Norse) dishes |
| Hakon's camp kit | the dishes of the region you are standing in |
| Any hearth | rat goulash (region `any`, Tokelo's exception) |

Data: a hearth recipe's `region` (no region = `foodRules.homeRegion`, Chapter One); a hearth station's `region`
(none = home, `'here'` = camp). `foodRules.regions` lists each region's maps. Engine: `hearthCooks()`, `foodRegion()`
in `src/engine/kitchen.js`; `cookBlock` refuses `NOT_COOKED_HERE` and the cooking menu only lists what that hearth cooks.
Oven, mill, brewery and meadery are tied to their people, not regions.

## Food (Gauge, first pass)

| Dish | How to get it | Heal | Buff | Time |
|---|---|---|---|---|
| Flatbread | Hearth (Flour, makes 3) or Aslaug 2 G | 6 | none | none |
| Skyr | Gudrun 4 G (dairy is bought) | 10 | +0.5 HP/s | 120 s |
| Cloudberry Skyr | Hearth (Skyr, 2 Cloudberries) | 20 | +5% crit, +5% speed | 180 s |
| Smoked Herring | Hearth (2 Herring, makes 2) or Solveig 5 G | 14 | +5% damage | 120 s |
| Gravlax | Hearth (Salmon, Wild Herbs, makes 2) or Solveig 8 G | 22 | +8% crit | 150 s |
| Fårikål | Hearth (Mutton, 2 Cabbage, makes 2) or Aslaug 10 G | 30 | 10% less damage taken | 180 s |
| Lingonberry Mutton | Hearth (Mutton, 2 Lingonberries) | 32 | +12% damage | 180 s |
| Stockfish Stew | Hearth (Stockfish, Potato, Butter, makes 2) | 28 | +1 HP/s | 180 s |
| Rømmegrøt | Hearth (Sour Cream, Flour, Butter, makes 2) | 25 | 6% less damage taken, +0.5 HP/s | 180 s |
| Surströmming | Solveig 6 G, or Sour Herring's reward | 15 | 15% less damage taken, +5% damage | 180 s |

| Drink (stacks to 3, counts toward Drunk) | How to get it | Heal | Buff per stack | Time |
|---|---|---|---|---|
| Mead | Aslaug (2 Honey, makes 2) or 8 G | 8 | +12% damage, +0.5 HP/s | 120 s |
| Lingonberry Mead | Aslaug (Honey, 2 Lingonberries, makes 2) or 9 G | 8 | +8% crit, 8% less damage taken | 120 s |
| Juniper Ale | Aslaug (2 Barley, Juniper Berries, makes 3) or 6 G | 5 | 10% less damage taken, +6% speed | 90 s |

Ingredients: **Solveig** (Skeldvik fish stalls) sells Herring, Salmon, Stockfish; **Gudrun** (Hrafnholm east stalls)
sells Mutton, Skyr, Sour Cream, Butter, Flour, Potato, Cabbage; **Aslaug** sells Honey. Foraged and growing back:
Lingonberries (Frostspine Pass, Skeldvik, Hrafnholm), Cloudberries (pass, Hrafnholm), Juniper Berries (pass).

## The mead bar

Aslaug, alewife of the Stormtide Inn, sells and brews mead (station `meadery`). She stands at the inn door in
Skeldvik (27, 10) until the inn's hall is built (thread "Add an enterable meeting hall in Skeldvik", waiting on
Tokelo's interior picture); that work moves `skeldvik_aslaug` inside. Her NPC id and shop id stay `aslaug`.

## A Fire of Your Own (C2S2), the camp kit

Hakon the carter on the Frostspine Road, wrist broken, teaches you to make camp: fetch juniper for tinder from the bush
above the pass, and he gives you his spare **Camp Kit**. Use it from Esc → Items anywhere out of a fight: it opens a
hearth (`camp_hearth`) that cooks the region you stand in. The kit is not used up.

## Sour Herring (C2S1), the surströmming prank

After Solveig tells you who split the memorial board, she has a petty, harmless revenge in mind: her oldest cask of
surströmming, tapped under the Wolf-Banner ship's rowing benches. Borrow Leif's cooper's awl, get Geir off the
gangplank (share a Mead and a toast to the six hundred, or lie that Thora wants the dues recounted), tap the cask, and
tell Solveig. Thora afterwards: "There is no law against a smell; I checked, twice." Reward: 15 Gold, 2 Surströmming,
Gravlax, 30 XP (candidates). Tone: comic relief in a grieving harbour; nobody is hurt, Geir is treated kindly.

## Open for Gauge and Tally

- All prices, heals, buffs and XP are a first pass.
- Surströmming's 15% damage reduction is the highest single-dish defence on purpose (a gag with teeth); check it
  stacked with Dunkel or Lingonberry Mead.
