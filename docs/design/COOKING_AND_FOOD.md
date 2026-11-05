# Cooking and food: German dishes, beer, farming and foraging

**Owner request:** Tokelo, 2026-11-02 (thread "Expand cooking with German dishes").
**Mechanics:** Thorne. **Numbers (first pass):** Gauge, all in `src/data.js` (`foodRules`, `itemDefinitions`,
`cropDefinitions`, `recipeDefinitions`, `forageDefinitions`, `shopDefinitions`). **Engine:** `src/engine/kitchen.js`.
**Tests:** `tests/93-kitchen.test.js`. Builds on Bread and Beer (PR #214), which added planting and crafting.

## What Tokelo asked for, and where it lives

| Ask | Built as |
|---|---|
| At least 10 German dishes, crafted or bought | 16 dishes (below) plus 3 beers. 5 are sold in Shamefield. |
| Buffs for up to 3 minutes, meals stack | Each dish is its own status, so different dishes stack. `foodRules.maxSeconds = 180`. |
| Beer buffs, semi-OP; more than 4 beers inverts the controls for 20 s | Beers stack to 3 each. The 5th beer within 2 minutes makes you Drunk: movement is inverted for 20 s. |
| Ingredients farmed, and found in other areas | Two homestead fields, the cloister bed, and foraging spots on 5 maps that grow back. |
| Livestock somewhere for meat | A pigsty (piglet to 3 Pork) and a hen coop (2 Eggs, again and again) at the homestead. Greta sells piglets and hens. |
| Goulash from rats and wolves, low tier | Rats always drop Rat Meat and wolves always drop Wolf Meat. Rattengulasch and Wolfsgulasch heal a little and buff a little. |
| Harvestable mushrooms on the maps | Chanterelles on the road, Shamefield, the orchard, the tollway and Featherwatch. |
| Milk and cheese bought, or given for quests | Mara sells milk, cheese, butter and eggs. Bread and Beer, Singing at the Mill and Get to Know the Locals give dairy. Dairy is never farmed. |
| Shane sells cannabis seeds; they grow on the player's lot; brownies give extra buffs | Shane sells Cannabis Seed and gives some when he explains farming. It only grows in the homestead fields. Shane's Brownie has four buffs at once. |

**First meal (Tokelo, 2026-11-04):** SF6 *A Proper Meal*, one of the six favours the Captain asks for before he opens
the orchard gate. Oda hands you a Brötchen and Pork, you cook a Leberkäsbrötchen at the homestead hearth, eat it from
Esc → Items, and tell her. The Brötchen's own description now names what to cook with it.

## Rules (Thorne)

1. **Eating** uses an item with `use: 'meal'` or `use: 'drink'`. It heals `heal` at once, then applies a status named
   after the dish through `applyStatus` (one status pipeline). Usable in and out of fights. Meals are not refused at full HP.
2. **Timing.** Food buffs are timed like fight buffs: on the fight clock in a fight and on the calm clock out of one.
   They come into a fight and keep running after it (same as pre-buffs, `src/engine/action.js`). A fall clears them,
   like every buff. In the legacy turn mode they last `seconds / secondsPerTurn` turns in a fight.
3. **Stacking.** Different dishes always stack. The same dish again refreshes its timer and adds a stack, up to
   `sameDishStacks` (2). The same beer stacks to `drinkStacks` (3). Effects multiply by stacks.
4. **Full.** With `fullAt` (4) different dishes still working, you can't start a fifth; the same dish can still be
   eaten again. Beer never fills you. The use-item menu shows the same refusal (`TOO_FULL`).
5. **Drunk.** Every beer adds a Tipsy stack that lasts `tipsySeconds` (120 s, refreshed by each beer). The beer after
   `beersBeforeDrunk` (4) clears Tipsy and applies Drunk for `seconds` (20 s): the action sim inverts movement input.
   The beer's own buff stays.
6. **Modifiers** (summed over every food status, capped by `foodRules.caps`): `damage` (outgoing), `defence`
   (incoming removed, after other damage reduction), `crit` (chance), `speed` (walking speed in the sim), `regen`
   (HP per second, on fight pulses and calm ticks).
7. **Farming.** A seed lists `plantIn`, the plots it may go in; each plot is a construction you build first. The
   homestead fields are free to dig; the sty costs 12 Gold and the coop 8 Gold. Animals have `feed`: each tending
   uses one of those items (`NO_FEED` if you have none). A hen `keeps`: after collecting eggs, she starts again.
8. **Foraging.** A `forage` world object gives its yield and disappears. It grows back after `regrowSeconds` of calm
   time (`world.foraged`, saved with the world).
9. **Stations.** Recipes carry a `station`: `hearth` (your homestead), `oven` (Oda), `mill` (the watermill),
   `brewery` (Brother Fenric, after Bread and Beer). A station's dialogue is built from the data, so it only offers
   recipes you have the ingredients for, plus "What can I make here?" to list them all.

## Numbers (Gauge, first pass)

Player HP at level 1 is 70 to 120. Fight buffs last 6 to 15 s (`BALANCE_BUFFS.md`), so food is a separate, long and
mild category. One dish is roughly a weak fight buff that lasts the whole fight. Beer is the strong one, and it costs
you control if you overdo it.

| Dish | How to get it | Heal | Buff | Time |
|---|---|---|---|---|
| Brötchen | Oda's oven (Flour, makes 3) or Oda 2 G | 6 | none | none |
| Brezel | Oda's oven (Flour, Butter) or Oda 3 G | 10 | +5% speed | 90 s |
| Bratwurst | Hearth (Pork, makes 2) or Greta 6 G | 18 | +6% damage | 150 s |
| Leberkäsbrötchen | Hearth (Pork, Brötchen) or Greta 8 G | 22 | 6% less damage taken | 150 s |
| Mettbrötchen | Hearth (Pork, Brötchen, Onion) | 20 | +8% damage | 150 s |
| Schnitzel | Hearth (Pork, Flour, Egg) | 30 | +12% damage | 180 s |
| Jägerschnitzel | Hearth (Pork, Flour, Egg, 2 Chanterelles) | 35 | +12% damage, +5% crit | 180 s |
| Käsespätzle | Hearth (Flour, Egg, Cheese, Onion) | 30 | 10% less damage taken | 180 s |
| Semmelknödel | Hearth (2 Brötchen, Milk, Egg) | 25 | +1 HP/s | 180 s |
| Sauerkraut | Hearth (2 Cabbage, makes 3) | 10 | +0.5 HP/s | 180 s |
| Kartoffelsalat | Hearth (2 Potato, Onion) | 20 | +8% speed | 180 s |
| Pilzsuppe | Hearth (2 Chanterelles, Milk) | 25 | +0.5 HP/s, 4% less damage taken | 150 s |
| Apfelstrudel | Hearth (2 Apple, Flour, Butter) | 25 | +6% crit, +4% speed | 180 s |
| Rattengulasch | Hearth (2 Rat Meat) | 12 | +0.3 HP/s | 90 s |
| Wolfsgulasch | Hearth (Wolf Meat, Wild Herbs) | 16 | +4% damage | 120 s |
| Shane's Brownie | Hearth (Cannabis Leaf, Flour, Egg, Butter, makes 2) | 20 | +10% damage, 10% less damage taken, +1 HP/s, +5% crit | 180 s |

| Beer (stacks to 3) | How to get it | Heal | Buff per stack | Time |
|---|---|---|---|---|
| Helles | Fenric (2 Barley, Wild Hops, makes 3) or 6 G | 5 | +15% damage | 90 s |
| Dunkel | Fenric (3 Barley, Wild Hops, makes 3) or 7 G | 5 | 12% less damage taken, +0.5 HP/s | 90 s |
| Weizen | Fenric (2 Wheat, Wild Hops, makes 3) or 7 G | 5 | +8% crit, +6% speed | 90 s |

Caps on the totals: damage +75%, damage taken −50%, crit +35%, speed +40%, regen 5 HP/s.

## Where ingredients come from

- **Farmed** (homestead fields; barley and wheat also in the cloister bed): Barley, Wheat, Potato, Cabbage, Onion,
  Cannabis Leaf (homestead only). Seeds from Shane.
- **Livestock** (homestead): Pork from a piglet (Greta, 15 G; 3 feedings of potato, cabbage, apple, barley or wheat),
  Eggs from a hen (Greta, 8 G, or the Pigs at Large reward; 2 feedings of grain or cabbage per clutch).
- **Foraged** (grows back): Chanterelles (150 s), Apples in the orchard (180 s), Wild Herbs on the road and tollway
  (120 s), Wild Hops on the mill falls after Bread and Beer (120 s).
- **Dropped:** Rat Meat (rust rats, cellar vermin), Wolf Meat (hungry wolves), every time.
- **Bought:** Mara (milk, cheese, butter, eggs, flour, onions), Greta (pork, piglets, hens), Oda (flour), Shane (seeds).
- **Quest gifts:** Bread and Beer (milk, butter), Pigs at Large (2 Bratwurst, a hen), Singing at the Mill (cheese),
  Get to Know the Locals (cheese, milk), A Proper Meal (a Brötchen and Pork to cook, two Brezel after).

## Open for Gauge and Tally

- All prices, heals, buffs and timers are a first pass and need a play check, especially stacked beer with fight
  buffs, and the sty and coop prices against Chapter One Gold.
- Food carries into fights, but the realtime battle-screen mode clears it at the end of a fight like its other buffs.
