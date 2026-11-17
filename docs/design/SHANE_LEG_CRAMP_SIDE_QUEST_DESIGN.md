# ENSO's Last Stand — Shane: A Cramping Experience

**Status:** Narrative and gameplay design handoff; not implemented or balanced  
**Character:** Shane the Shamed  
**Location:** Player homestead, after Shane's recruitment  
**Quest type:** Optional, short character side quest  
**Reward:** Learnable shout skill **LEG CRAMP!**

## Intent

Give Shane a distinct, useful gameplay contribution without turning him into a secret legendary figure. Shane is a chaotic, questionable apothecary and homestead merchant whose experiments sometimes work spectacularly. His recurring sign-off remains **“Suffer!”**. His nickname has accumulated through many embarrassing incidents; this quest does not invent a singular tragic explanation for it.

## Quest — A Cramping Experience

1. **Offer.** After recruitment, speak with Shane at his homestead stall. He boasts that he has perfected a combat technique that can bring even a mighty warrior to their knees. He needs a willing assistant and three commonplace ingredients.
2. **Collect.** Bring Shane **Wild Herbs**, **Chanterelle Mushrooms**, and **one Potato**, using existing Chapter One gathering/farming loops where available. The quest tracker identifies each ingredient and its source; no arbitrary hidden collectible is required. The designer/developer should verify accessibility before implementation.
3. **Return.** Shane mixes his experimental concoction and insists on demonstrating the technique immediately. The player is given an ordinary confirmation prompt before starting the demonstration; the actual effect is a surprise.
4. **Demonstration.** Shane shouts **“LEG CRAMP!”** The player immediately receives **Leg Cramp** for **20 seconds**. Shane celebrates with the *exact* approved line: **“HA! IT WORKS! SUFFER!”**
5. **Reward.** The player learns the **LEG CRAMP!** shout skill. The quest completes while the inflicted debuff still expires normally. Shane remains available as merchant and farming instructor.

### Dialogue draft

**Shane:** “Excellent! I've perfected a technique that can bring even the mightiest warrior to his knees!”  
**Player:** “What does it do?”  
**Shane:** “LEG CRAMP!”  
*The player staggers; Leg Cramp is applied for 20 seconds.*  
**Player:** “AAAAARGH! MY LEG!”  
**Shane:** **“HA! IT WORKS! SUFFER!”**  
**Player:** “YOU BASTARD!”  
**Shane:** “Congratulations! You've learned Leg Cramp!”  
**Player:** “YOU COULD HAVE WARNED ME!”  
**Shane:** “Would've ruined the surprise.”

The line **“HA! IT WORKS! SUFFER!”** is intentional and must not be split or replaced. Shane's normal goodbye **“Suffer!”** remains separately applicable to regular dialogue exits.

## Skill contract — LEG CRAMP!

| Property | Requirement |
| --- | --- |
| Type | Player-activated **shout**, area-of-effect |
| Origin | Learned from Shane's optional side quest |
| Targeting | Enemies within a radius centred on the player |
| Status | **Leg Cramp**: applies a **Cripple / movement slow** debuff |
| Attack speed | **Unaffected**; this is movement control, not attack-speed suppression |
| Radius | **TBD — Gauge and Thorne** |
| Enemy debuff duration | **TBD — Gauge and Thorne** |
| Movement slow strength | **TBD — Gauge and Thorne** |
| Cooldown | **TBD — Gauge and Thorne** |
| Training effect | Player receives Leg Cramp for **exactly 20 seconds** |

### Implementation and QA notes

- Use the game's existing status/debuff conventions; do not imply a new counter, aerial or limb-damage system.
- Resolve enemy eligibility (bosses, immunities, stacking) with Gauge and Thorne before final balance.
- Prevent the quest reward from being granted more than once. Preserve completion and learned skill across saves/reloads.
- Do not leave the player's training debuff permanently active after expiry, map changes or reloads.
- During the teaching event, display a clear status indicator and countdown for the 20-second effect.
- Keep the quest optional; it must not block Chapter One or Chapter Two progression.

## Shane's shop — directional note, separate from quest implementation

Shane already sells seeds, including cannabis seed in the current cooking design, and supports the homestead farming loop. The Creative Director wants to explore additional fictional fantasy consumables inspired by psilocybin, LSD and changa, with unpredictable but explicit in-game buffs/debuffs. These **are exploratory merchandise ideas**, not approved recipes, real-world preparation guidance, or finalized item effects. Any effects, prices, and loot/economy implications belong to subsequent design and Gauge/Thorne balancing.

## Creative ownership

- **Creative Director:** Approved concept, 20-second training consequence and exact celebration line.
- **Gauge / Thorne:** Numeric balance and status interactions.
- **Narrative / implementation team:** Dialogue, quest triggers, UI and save-state integration.

## Gauge / Thorne numbers (2026-11-17)

Target: a cornered player of any class can walk (not sprint) away from a regular mob or buy roughly 6 s to drink or heal, once per fight phase; against bosses it is a short breather, never a lock.

| Value | Set | Why |
| --- | --- | --- |
| Engine shape | `{ shape: 'circle', radius: 64, castMs: 250 }` | Same reach as Black Maw (64 px), wider than Heavy Field (48 px) because it deals no damage; well under Gale of Pinions (160 px), which is a class skill. 250 ms cast like Heavy Field so it works as a panic button. |
| Movement slow | 35% | Top of the enemy Slow rider range (25-35%). Mob pursuit 84 px/s becomes 55 px/s, below player walk speed (72), so you escape without spending stamina. Below Caltrops/Gale/Black Maw (50%), which are class kits. Attack speed unaffected. |
| Enemy duration | 6 s | House standard for every slow (Caltrops, Heavy Field, Gale, Black Maw); long enough to open about 80 px or finish an item use (0.5 s). |
| Turn-based duration | 2 turns | 2 x `secondsPerTurn` (3) = 6 s, same as the other slows. |
| Cooldown | 20 s | 30% uptime; a hair longer than Heavy Field (18 s) since every class gets it for free on top of its kit. |
| Cost / resource | 0, `'any'` | Same as other learned non-class skills (Heavy Field, Black Maw); no class pays for a quest reward. |
| Bosses | Yes, through the central Control Resistance policy only | Slow is soft control. Bosses start at CR 60: first cast is 35% for 1 turn-cap (3 s), then CR 80 halves the next to 17% for 3 s, decaying back. Enough to drink a potion after the Crow Warden, never enough to kite a boss to death. No special case. |
| Stacking | One Leg Cramp per enemy; recast refreshes | Existing Slow rule. Leg Cramp is its own status (type `slow`), so it never stacks with itself, but with a different slow (Caltrops, Gale) the two multiply, each capped at 90% as today. |
| Training debuff | 20 s on the player, 35% | Fixed by the Creative Director; uses the same Leg Cramp status, player CR 0. |

Skill data shape (for Wren): `cost: 0, cooldown: 20, resource: 'any', effects: [{ type: 'slow', value: 0.35, duration: 2 }], target: 'enemy_aoe', damage_type: 'utility'`.

Tally to check: Leg Cramp in a Chapter One regular pack (walk-away success, seeds 1-20) and one Crow Warden-tier boss fight (win rate change under 3 points vs. without the shout).

Gauge — Systems & Balance Designer
