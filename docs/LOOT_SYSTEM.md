# Loot and generated equipment

The authoritative implementation is in `src/engine/loot.js` and `src/engine/equipment.js`. Both text and world clients use it. Design: `docs/design/ENSO_UNIVERSAL_MONSTER_LOOT_AND_GOLD_SYSTEM.md`, issues #169 and #170. See `qa/QA_LOOT_IMPLEMENTATION_2026-10-25.md` for measurements and content limits.

## Authoring

Enemy definitions declare `lootLevel` (fixed positive integer), `lootProfile`, `lootRank` and `lootTable`. `startCombat` assigns a persistent `lootClaimId` from the encounter scope and enemy index. World encounters may supply `loot` as a shared object or an array of per-enemy overrides for those fields, `bossDrops` and `materialDrops`; spawned metadata is saved in combat state. New regions can supply new tables without a Chapter One branch in the engine.

`data.lootProfiles` defines Gold multipliers, independent material/equipment/consumable probabilities and weighted material pools. `data.lootTables[tableId]` contains `equipment` entries (`itemBaseId`, `weight`, optional `minLevel`, `maxLevel`, `rarities`) and working `consumables` (`item`, `weight`). Eligible equipment is selected without using player class or level. Item level always comes from the enemy’s authored loot level.

Bosses declare exactly one `bossDrops` entry. A `storyKey` reconciles a boss item with existing once-only narrative item grants. Warden’s key is awarded on victory; aspect, crow and treasury remain seal-opening effects. Story Gold effects use `{ gold, key }` and the same persistent award ledger. Village assistance now requires collecting Mara’s supply parcel and handing it to Tamsin.

## Records and rules

Inventory remains an array of string IDs for compatibility. Authored materials/consumables can repeat a string ID. Rolled equipment receives a distinct ID and a complete immutable roll record in `player.itemInstances`: base ID, item level, required level, rarity, rank, affix IDs, final modifiers, prices, instance ID and seed. `itemDef(id)` resolves either kind; `itemName(id)` provides its display name. Clients must use engine definitions and comparisons rather than reconstructing stats.

Generated weapons add flat physical/magic damage at the direct damage roll before crit and mitigation. They do not inflate base STR/INT/AGI. True damage and DoT ticks receive no weapon bonus. Keen is an effective crit chance modifier; Focused, Stalwart and Guarding use reversible stat deltas. Increasing Max HP does not heal. Two-handed weapons and offhands displace each other, returning displaced equipment to inventory.

`getEquipment()` reports every slot, owned candidate, effective comparison and class/level refusal. `getAvailableActions()` reports purchases, sales and pending loot recovery with the same validation execution uses. Selling requires a merchant conversation/context on the current map, including in the text client. Buy/sell prices do not adapt to player level.

## Claims and persistence

`stats.lootClaims[lootClaimId]` holds the exact rolled reward and `pending`, `claimed` or `error` status. Rolls happen at victory, before combat state is cleared. A flee or defeat never claims rewards. Re-entry, Black Flight and save/load preserve claims and RNG state. Summons, illusions and enemy-on-enemy kills are excluded from independent rewards.

Gold overflow retains the reward as pending; spend Gold and use `claim_loot` (or Items → Collect pending loot). Malformed authored rewards retain an explicit durable error for repair. There is no invented inventory capacity and no silent deletion. New saves include the ledger; old credited kill IDs migrate to claimed legacy entries to avoid paying the old kill coins twice.

No functional legendary item is currently authored. The current eligible pool reports a fallback to implemented gear rather than minting an inert legendary. Physical weapon/armor pools also stop at Rare when there are too few approved distinct affix families for Epic. Those are content constraints, not invitations to duplicate an affix or fabricate an effect.
