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
