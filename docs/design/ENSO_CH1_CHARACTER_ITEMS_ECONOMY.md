# ENSO Chapter One — Character Creation, Equipment, Currency, Villagers and Homestead Systems
**Vaelis** · 23 Oct 2026 · **Design systems package**. User-established features documented, proposed implementation contracts distinguished from approved rules. No code changes or unauthorized numbers.

## A. Character creator — first 60 seconds
**Creative direction established:** player chooses preferred **name and appearance** with graphics matching today's pixel/sprite language; later evolutions radically change appearance (e.g. Eternal Lich skeletal monarch).
**MVP proposals:** creation modal BEFORE first movement, sequence `Name → Class → Appearance → Confirm`, with ability to go Back, named identity in dialogue/journal/HUD/save, unmodified current four classes, preset sprite silhouettes for body/hair/skin/outfit/palette selected from art-ready assets, all cosmetic, a preview at game camera scale. Don't promise detailed sliders or 3D assets. No gender-based stat differences. Respect diacritics and international names; ensure blank name maps to a lore-neutral default (not reveal dark-lord name). Suggested validation 1–24 visible characters, profanity handling/accessibility policy TBD, no arbitrary forced default for text UI. Existing class evolution at levels 3,5,8,11,14 remains unchanged.
**Evolution art progression proposal:** base sprite; L3 branch visual accent; L5 posture/gear change; L8 distinct silhouette; L11 dominant aura/ornament; L14 ascended sprite variant. Skeletal king for Eternal Lich is a creative target; other branches (Bone Warden, Plaguecaller, Warrior, Rogue, Mage) also need thematically faithful forms—not all necromancers become liches. Equip overlay and evolution skin must compose without clipping; select fallback sprite where art absent. Keep class visuals readable in tiny pixel scale; palette swaps first, sprite redraw later.

## B. Equipment / stat contract
**Approved desire:** weapon and armor menu with stat boosts, accessories later and equipable gear. No existing stats are modified by this design.
**MVP loadout proposal:** Main Hand, Body Armor, Accessory; optional Off-hand after shield compatibility assessment. UI shows current vs previewed effective stat values, item requirements, and stat delta before equip. Support `equip / unequip / compare / inspect`. Inventory retains existing consumables, quest keys and class startingItems; don't reinterpret `old key` or `Crow Memory Key` as sellable weapon inventory. When equipping causes cap changes, recompute derived stats deterministically; don't multiply permanent attributes on equip/unequip.
**Stat meaning:** `DEF` is flat subtraction in existing combat; +1 DEF may materially shift survival, especially Mage. Gear DEF must be included in Tally's balance matrix **separately from the pending global +2 DEF decision**. Weapon attack bonus likewise tests across physical/magic vs summon effects; item modifiers must not silently buff true damage or both damage and healing.
**Examples (design placeholder, numbers NOT approved):**
- Tarnished Knife (common; weapon; might boost physical attack)
- Split Oak Buckler (common; offhand; might boost DEF, but requires equip-slot compatibility)
- Dustbound Robes (common; body; magical identity)
- Crowkeeper's Pin (uncommon; accessory; narrative artifact at Warden refuge, not necessarily dropped by murdering Warden)
- Feathered Halberd (unique boss trophy, if Director approves morally provocative looting)
- Builder's Ledger (quest item, no sale/equip)
- Seal-Key of the First Echo (unique quest key, never sold/stacked/consumed accidentally).

**Schema proposal, not code instruction:** stable `itemId`, `name`, `type` (weapon/armor/accessory/consumable/material/quest), `slot`, `rarity`, `statModifiers`, `requirements`, `value`, `sellable`, `stackMax`, `questFlags`, optional `appearanceTag`, source/description. Loot source ID prevents duplicating quest rewards on reload.

## C. Rarity, legendary item identity and drops
**Creative direction established:** rare and legendary items, a structured tier system. **Proposed tiers:** Common → Uncommon → Rare → Epic → Legendary; **Unique/Quest** is a separate ownership/tag distinction, not automatically a sixth power tier. Rarity impacts drop probability and feature complexity only after explicit economy/balance decisions, not guaranteed arbitrary stat scaling.
- Common: basic utility, shop stock.
- Uncommon: contextual trait or stat tradeoff.
- Rare: distinctive synergy.
- Epic: signature encounter or crafting milestone.
- Legendary: named lore, constrained acquisition, memorable effect (not just a large number).
- Unique/Quest: non-random, not sellable, progression-protected.
**Starting loot cadence proposal:** 1 small equipment choice in cellar/grounds; 1 weapon or armor upgrade on road or village (purchase/quest); 1 optional treasure in orchard; 1 memorable narrative item after Warden. All loot tables/drop probabilities and stat bonuses pending Tally measurement.

## D. Gold and economy
**Creative direction established:** currency can be spent on castle repair, goods and trade.
**MVP proposal:** one currency **Gold**; small values in purse/stolen coffers/merchant trades and quest payouts, stored as integer >=0. No negative balance or gold from same defeated enemy more than once. Display money in inventory, merchant UI, and building quote. Item `Small Coin Purse` currently inert: define a single-use conversion into Gold only after data approval (avoid counting twice). Quest keys cannot be sold; quest-essential items protected from discard.
**Commerce contract:** Buy, Sell, Compare, Inspect; merchants have inventory by role (general goods / smith / healer / Shane); purchasing checks affordability + capacity, applies one atomic deduction/transfer, prevents buy-sell arbitrage duplication. Buy/sell price and stock restock timer TBD; don't add time-based infinite money exploit.
**Economy loop:** explore → obtain gold/materials → buy survival gear or restore home → new crafting/farming access → sustain further exploration. Healing items remain tactical and optional; do not inflate mandatory encounter difficulty to force purchases.
**Initial gold sources proposal:** fixed once-only coin satchels, safe exploration caches, optional non-repeatable quests, enemy rewards where narrative appropriate, merchant selling. Costs/gold values pending balancing; if initial repair is mandatory, guarantee obtainable gold (not RNG drops) or provide a non-currency quest repair alternative. Validate player can continue if they buy medicine first.

## E. Village life and merchants
**Minimum village NPCs (proposed):**
| NPC | Role | Gameplay utility | Social hook |
|---|---|---|---|
| Tamsin (working) | elder / quest giver | journal objective, history and place in world | protects village, mourns Warden after death |
| Bragg (working) | smith | buy weapons/armor, future forge repairs | local supplier, skeptical stranger |
| Iona (working) | herbalist | heals/ingredients, small medicine stock | knows Shane's apothecary dispute |
| Elian (working) | road traveler | lore exposition and hinting | celebrates victory of heroes |
| Watch Captain (unnamed) | local constables | patrols and Shane-quest adversary | lawful duty doesn't equal evil |
| **Shane the Shamed** | recruitable homestead trader | medicine, ingredients, farming introduction | ALWAYS says **"Suffer!"** when a normal conversation ends |
| Orin Vale (working) | builder after boss | home inspection/repair ledger | identifies castle architecture |

**Village life MVP:** residents placed at believable locations with barks, simple state changes from quests and Warden death, interacting merchants, day-state variations only if technically cheap. Do not promise full sleep/eating/AI routines at first. Dialogue prompts should allow rapid exit; merchant purchase menu and talking can return to same NPC and still deliver Shane's goodbye. The village **must have something to do besides shopping**: at least two optional tasks, gossip/history clues, an inspectable memorial and a Shane introduction.

## F. Crafting, farming and professions — staged
**Creative direction established:** crafting eventual food, weapons, armor, accessories; growing ingredients at homestead; jobs/professions (blacksmith, cook, farmer, store clerk, hunter etc) discussed **but the profession list and rules explicitly PENDING approval**.
**MVP after Shane:** repair one field plot → plant a starter herb/vegetable → collect ingredient after an action/time milestone → combine two ingredients into a simple healing food in an introduced station. No hunger/survival meter unless separately approved. Recipes discovered via NPC/book/loot, not guessed. Crafted item has distinct identity and cost/ingredients; prevent producing infinite items from zero resource.
**Staged crafting:** (1) cook/medicine; (2) smith weapons/armor (requires forge, materials); (3) accessories/enchantments; (4) legendary crafting quest components; (5) economic professions (future approval). For now **NPC station roles are not equivalent to player professions**, and profession rewards, specialization trees and work timers must not be invented.
**Builder/castle staged visual arc:** abandoned grounds → habitable refuge (first repair) → productive homestead (farm/store/forge) → fortified estate → dark citadel/castle. Exact tiers, material costs, capacity, gating and castle morality consequences later. Players can always backtrack; builder uses a construction board with unavailable entries clearly marked, not clickable fake functionality.
**Later empire loop:** residents migrate as world reputation changes, castle art responds to unlocked Qliphoth aspects and class visuals. That's narrative ambition, not MVP commitment.

## G. Systems acceptance checks
- Name/cosmetics survive route changes and future save system; class evolution uses existing stats; changes in appearance don't misrepresent combat class or overwrite equipped gear.
- Equip/unequip is reversible; cannot duplicate inventory, accidentally consume quest item, or cause stat growth by repeated toggling; effective DEF calculation is deterministic.
- Gear-induced survivability tested independently by Tally against pending DEF decision; item price/repair affordability tested across all classes without forced grinding.
- XP, gold, loot and quests claim exactly once; repeat NPC talk and map exit/entry never duplicate rewards.
- Shane's **"Suffer!"** is guaranteed after goodbye in dialogue/merchant/farming entry conversations; not when gameplay interrupts unexpectedly.
- Villagers have at least one post-Warden reaction demonstrating their world continues after boss death.
- No new numerical rates (drop %, stat affix %, recipes, prices, job XP) approved merely by these descriptions.

## H. Implementation ownership and boundaries
Sable UI: character creator, equipment panel, merchant/shop, quest journal and builder ledger designs. Keel architecture: account for new item types/inventory persistence, world/NPC interaction/quest state, patrol AI, flags and graphical boss bridge. Wren/Rook code only after assigned authorization; Vaelis keeps `docs/design/` narrative/content design; Tally validates class progression, gear balance, economy soft-locks, AI pacing. Do not overwrite the legacy text RPG: story and item systems should ultimately share authoritative engine data where practical.
