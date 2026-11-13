# Armor sets and weapon tempering

**Owners:** Thorne (mechanics), Gauge (numbers, first pass) · **Requested by:** Tokelo, 2026-11-13 · **Lore:** checked
against [ENSO_LORE_BIBLE.md](ENSO_LORE_BIBLE.md) and [CHAPTER_TWO_LORE.md](CHAPTER_TWO_LORE.md) §8

> "New weapons upgrade also we are missing armor sets" (Tokelo)

## What was missing

- The only armor in the game was the Padded Jerkin (+1 DEF) and the warrior's Wooden Shield. There were three gear
  slots besides the weapon (offhand, body, accessory), and nothing to put in them.
- A weapon could only be replaced, never improved. Shamefield's Thanks (a bound gift) went stale the moment Bjorn's
  bog-iron weapons arrived, against CHAPTER_TWO_LORE §8.3: "the player should be able to keep a family heirloom or
  named boss weapon".
- Scrap Metal dropped from every humanoid and had no use except selling.

## Armor sets

Three new gear slots: **Head**, **Hands** and **Feet** (beside Body armor). Each class gets one four-piece set per
chapter, sold by that chapter's smith, one of each piece, listed only for its class (`classes` on the stock entry).

Wearing pieces of one set adds bonuses at **2** and **4** pieces (`armorSets` in `src/data.js`). The bonuses are part of
`equipmentModifiers()`, so the equip preview, the stat sheet and save/load all count them with no extra rule.

### Chapter One: Bragg's forge, Shamefield (level 2)

The Vale under the old crown: German medieval craft with the old crown's imperial leftovers.

| Class | Set | Head | Body | Hands | Feet | 2 pieces | 4 pieces |
|---|---|---|---|---|---|---|---|
| Warrior | **Tollwatch** | Kettle Hat +1 DEF | Brigandine +2 DEF +5 HP | Gauntlets +1 STR | Boots +6 HP | +8 HP | +1 DEF, +1 phys |
| Rogue | **Vale Poacher** | Poacher's Gugel +2% crit | Loden Hunting Coat +1 DEF +1 AGI | Poacher's Gloves +1 AGI | Bundschuh +5 HP | +2% crit | +1 DEF, +6 HP |
| Mage | **Kloster Scriptorium** | Lector's Cowl +1 INT | Scriptorium Habit +1 DEF +6 HP | Copyist's Mitts +1 magic | Pilgrim's Shoes +6 HP | +8 HP | +1 INT, +1 DEF |
| Necromancer | **Beinhaus Sexton** | Sexton's Hat +1 INT | Gravedigger's Coat +1 DEF +8 HP | Bone-Stacker's Gloves +1 magic | Charnel Boots +1 DEF | +10 HP | +1 INT, +1 magic |

Prices: head 14, body 20, hands 12, feet 12 Gold (58 for a set). Pre-Warden Gold is about 170, so a player can buy
the forge weapon and most of a set.

**Research and lore notes**
- *Tollwatch*: the old crown's tollgate is Chapter One canon (the bars that "barred the road for twenty years").
  Kettle hats (Eisenhut) and brigandines (cloth over riveted plates) are what late-medieval German town and toll
  guards actually wore. The crown's mark is ground off the gauntlets; a careful look still finds it.
- *Vale Poacher*: the Gugel (hooded shoulder-cape) and loden (felted, boiled wool) are period German hunting wear.
  The **Bundschuh**, the laced peasant shoe, was the banner of the German peasant risings of 1493 to 1517, which
  fits a Vale that remembers the old crown badly.
- *Kloster Scriptorium*: a lector reads aloud at Benedictine meals; copyists wore fingerless mitts in cold
  scriptoria; the scallop shell is the pilgrim's mark. The mitts' ink "dried into letters nobody wrote" is a [mid]
  hint only.
- *Beinhaus Sexton*: a Beinhaus (charnel house) holds bones moved when a churchyard runs out of room; in the
  Alpine tradition skulls are painted with their names (Hallstatt). It fits the necromancer and the game's theme of
  names and the nameless, and it builds on the Kloster burial ground from Sexton's Bone Rod.

### Chapter Two: Bjorn Ironvein's forge, Járnmyr (level 5, after C2-04)

The armor families from CHAPTER_TWO_LORE §8.2. No horned helmets, and no Wolf-Banner gear for the player (that is the
enemy's look).

| Class | Set (§8.2 family) | Head | Body | Hands | Feet | 2 pieces | 4 pieces |
|---|---|---|---|---|---|---|---|
| Warrior | **Hird** (Jarl's Guard) | Spectacle Helm +2 DEF | Byrnie +3 DEF +10 HP | Vambraces +1 STR +1 DEF | Leg-Wraps +10 HP | +15 HP | +2 DEF, +1 phys |
| Rogue | **Fjord Hunter** | Sealskin Hood +3% crit | Vaðmál Hunting Tunic +2 DEF +1 AGI | Nålbound Mittens +2 AGI | Fjord Turnshoes +8 HP | +3% crit | +2 DEF, +1 phys |
| Mage | **Runesinger** | Runesinger's Hood +2 INT | Tablet-Woven Mantle +1 DEF +10 HP +1 INT | Amber-Bead Cuffs +2 magic | Runesinger's Calfskins +8 HP | +10 HP | +2 INT, +1 magic |
| Necromancer | **Gravebound** | Grave-Silver Circlet +2 INT | Barrow Shroud +2 DEF +12 HP | Bone-Clasp Bracers +2 magic | Mound-Walker's Boots +1 DEF +6 HP | +12 HP | +2 INT, +1 magic |

Prices: head 30, body 42, hands 26, feet 26 Gold.

**Research and lore notes**
- *Hird*: the spectacle helm follows the Gjermundbu find, the one near-complete Viking-age helmet (rounded cap,
  eye-and-nose guard, no horns). Mail was so costly it was often a man's whole inheritance. Winingas are wool leg
  wraps worn over turnshoes.
- *Fjord Hunter*: vaðmál, Norse homespun wool, was a legal currency and was paid as tax. Nålbinding is the
  single-needle looping technique of Viking-age mittens and socks. Turnshoes are sewn inside out and turned.
- *Runesinger*: the hood of black lambswool lined with white catskin and the calfskin shoes with long laces and tin
  knobs are from the seeress in *Eiríks saga rauða*. Galdr is spoken or sung spell-craft. Amber from Gullstrand
  ("gold strand") ties the set to the coast.
- *Gravebound*: grave-silver is in the §8.3 materials list. Bjorn makes the circlet "new, from coin, and says so
  twice", because C2-04 is about grave goods melted down for spearheads.

## Weapon tempering

At a smith, a main-hand weapon can be **tempered** one rank at a time (`smithingRules` in `src/data.js`):

| Rank | Cost | Adds (over the untempered weapon) |
|---|---|---|
| +1 | 12 Gold, 2 Scrap Metal | +1 damage |
| +2 | 24 Gold, 4 Scrap Metal | +2 damage, +1 main attribute |
| +3 | 40 Gold, 2 Bog Iron | +3 damage, +1 main attribute |
| +4 | 60 Gold, 3 Bog Iron | +4 damage, +2 main attribute |
| +5 | 85 Gold, 5 Bog Iron | +5 damage, +2 main attribute |

- "Damage" is physical or magic, by the weapon's damage type. The main attribute is the first of STR, AGI or INT
  the weapon already gives (else STR for physical, INT for magic weapons).
- **Bragg tempers to +2** ("If you want an edge put on something, I'm your man"). **Bjorn tempers to +5.**
- Scrap Metal is the humanoid drop that had no use; Bragg also sells it (4 Gold). **Bog Iron** is new: Bjorn sells it
  (6 Gold), and it is the §8.3 Járnmyr material.
- Any carried or wielded weapon can be tempered, including bound gifts (Shamefield's Thanks) and generated loot.
  A tempered weapon keeps its binding and resale value. **Holy weapons cannot be tempered**: they grow with the
  Fallen Seraphim web instead.

So the upgrade path is: starter, Bragg's weapon, Shamefield's Thanks (tempered +2 at Bragg), then in Chapter Two
either Bjorn's bog-iron weapon or the Thanks weapon carried on and tempered to +5. Sunbreak +5 (+8 phys, +4 STR,
+1 DEF) edges out an untempered Mire-Iron Bearded Axe (+4 phys, +2 STR, +1 DEF), so the heirloom can stay.

### How it is stored (saves)

A tempered weapon is a new item record in `player.itemInstances`, with the id `"<weapon> [+n]"` and the name
`"<weapon> +n"`. That is the naming generated gear already uses, so older saves load unchanged and a tempered weapon
is not mistaken for content from a newer version. The three new slots are filled in on load by `reconcileSave()`.
No save format change; `CONTENT_REVISION` 12.

### Rules added

- `temperBlock()` is one pure check used by the action, the text command (`temper <smith> <weapon>`) and the shop's
  Temper page, so they always give the same refusal (codes `NOT_A_FORGE`, `NOT_TEMPERABLE`, `TEMPER_MAX`,
  `TEMPER_FORGE_MAX`, `TEMPER_MATERIALS`, `NOT_ENOUGH_GOLD`).
- Tempering the weapon in hand re-applies worn stats in place, like a waking holy weapon.

## Measured (Crow Warden, level 4, 8 seeds, the Warden benchmark bot, react 0.6, with the Thanks weapon)

| | Thanks weapon only | + full Chapter One set |
|---|---|---|
| Warrior (vanguard / berserker) | 54 / 54 s (100%) | 53 / 52 s (100%) |
| Rogue (duelist / assassin / saboteur) | 42 / 53 / 43 s (88-100%) | 40 / 45 / 38 s (100%) |
| Mage (illusionist / elementalist) | 49 / 41 s (88-100%) | 48 / 51 s (100%) |
| Necromancer (bone warden / plaguecaller) | 59 / 40 s (88-100%) | 52 / 35 s (100%) |

The sets mostly buy survival (every branch now wins every seed) and a few seconds. The rogue's first draft (+1 phys,
+1 AGI at 4 pieces) cut 8 to 13 s off an already fastest class, so its 4-piece bonus became +1 DEF, +6 HP.

**Open for Gauge:** all prices and stats are first-pass candidates. The Warden fights now sit under the 60 to 90 s
band with gear; this joins the open question from WEAPONS_BEFORE_THE_WARDEN.md. Chapter Two sets are unmeasured
until Act II has a benchmark fight. **Open for art (Saffron, Quill):** armor is not drawn on the player sprite yet.
