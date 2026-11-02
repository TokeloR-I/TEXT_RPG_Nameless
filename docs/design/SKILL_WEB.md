# Skill Webs

**Owner:** Thorne (mechanics), Gauge (numbers). **Requested by:** Tokelo, 2026-11-02.
**Status:** increment 1 (framework + migration of existing skills) built. UI and new skills follow.

> "The player starts with a class, but that starting choice should not define the limits of what their
> character can eventually become." — Tokelo

## What changes

Locked class trees are gone. **Each class has its own Skill Web**: a Warrior web, a Rogue web, a Mage web
and a Necromancer web (Tokelo, 2026-11-02). You start in your class's web and can grow in any direction in it.
**Gateway nodes** at the edge of each web open a path into another class's web, so hybrid builds are possible
but take investment (Tokelo's pick, 2026-11-02).

| Before | Skill Webs |
|---|---|
| Pick one branch at level 3, forever | Pick a path at level 3 as a *guide*; you can leave it, change it, or ignore it |
| Branch skills arrive automatically at 3/5/8/11/14 | The guide still learns them on schedule, or you spend points by hand |
| Only your class's skills | Your class's web, plus other class webs through gateways |
| One evolution | Every branch you complete stage one of is a specialization you can switch to |

## Nodes

Four kinds:

- **Heart** (♥): the centre of a class web. You own your own. Inside another class's web its heart costs a
  point and opens that class's base skills (and its starting trait, if any).
- **Active** (◆): grants a skill. It goes on the skill bar (6 slots, swap out of a fight) or the bench.
- **Passive** (○): grants a trait. Always on.
- **Gateway** (⇒): sits at the edge of a class web, hanging from one node of it, and leads to one node of
  another class's web. It grants nothing itself; owning it makes that node learnable. A gateway opens **from
  its own web's side only**: the other class can't walk it backwards (it has its own gateways out).

A node can be learned when it **touches a node you own** (a gateway: when you own the node it hangs from),
your **level** is at least its `minLevel`, its **story event** has happened (Dark Knight, Dragon Slayer) and
you have the **points**.

### How the webs are built (data, no code per skill)

`skillWeb` in `src/data.js`, plus the classes and branches already there:

1. Each class web: a heart, and one active node per starting skill (owned free by that class).
2. Each evolution branch, in its class's web, stage by stage: an active node for the stage's new skill and a
   passive node for its trait, gated by the stage's level and event. Ids: `<branch>.<stage>.skill` /
   `<branch>.<stage>.trait` (stage 1 to 5). A stage that only upgrades an earlier skill (Soul Chain, Flurry,
   Fireball…) is one passive node.
3. `extraNodes`: existing skills no path granted (War Cry, Second Wind, Ice Lance, Shield of the Dead,
   Corpse Bloom, Plague Wind).
4. `gateways`: `{ id, from, to, name, why }`, three out of each class web.

**Adding a skill is one `extraNodes` entry** (`id`, `kind`, `region` = its class web, optional `branch`,
`skill` or `trait`, `minLevel`, `cost`, `links`). `npm run web` prints each class web and validates them;
the tests run the same check (every class web is one piece on its own, only gateways cross between webs,
every skill defined).

Today: **4 class webs + 2 legendary webs, 152 nodes** (6 hearts, 73 active, 61 passive, 12 gateways), 33 to 40 per web. Room for
80–100+ skills is the design target; the structure has no limit.

### Gateways (increment 1)

| Class web | Gateway | Hangs from | Leads to |
|---|---|---|---|
| Warrior | Spellblade | Holy Smite (Vanguard, L8) | Lightning Arc (Mage: Elementalist) |
| Warrior | Blade Frenzy | Whirlwind (Berserker, L5) | Flurry (Rogue: Duelist) |
| Warrior | The Hunt | Pincushion (Warden, L3) | Marked for Death (Rogue: Assassin) |
| Rogue | Misdirection | Shadowstep (Assassin, L3) | Mirror Image (Mage: Illusionist) |
| Rogue | Venom | Poison Trap (Saboteur, L8) | Black Spit (Necromancer: Plaguecaller) |
| Rogue | Owning the Ground | Caltrops (Saboteur, L3) | Lockstep (Warrior: Warden) |
| Mage | Tempo | Haste (Chronomancer, L3) | Riposte (Rogue: Duelist) |
| Mage | Burn and Blight | Fireball leaves Burn (Elementalist, L5) | DoTs last +1 turn (Necromancer: Plaguecaller) |
| Mage | The Stolen Mind | Confuse (Illusionist, L5) | Possession (Necromancer: Soulbinder) |
| Necromancer | The Two Walls | Bone Wall (Bone Warden, L3) | Shield Bash (Warrior: Vanguard) |
| Necromancer | Open Wounds | Contagion (Plaguecaller, L3) | Hemorrhage (Warrior: Berserker) |
| Necromancer | Life Bent Back | Soul Feast (Soulbinder, L11) | Revert HP (Mage: Chronomancer) |

A gateway costs **2 points** (`rules.cost.gateway`) and needs the level of the node it hangs from. The node it
leads to keeps its own level gate. Once inside, that web's nodes link as usual: you can walk back down a
branch to its first stage and to the heart, then out to the class's base skills.

## Points (Gauge)

- **1 point per level** after level 1 (`rules.pointsPerLevel`), plus `progression.web.bonusPoints` for
  future quest or boss rewards.
- Every node costs 1 (`rules.cost`, a node's own `cost` wins).

Why 1: a branch costs exactly 2 points per stage (skill + trait), so a player who follows one path has the
same skills, traits, title and resource at the same levels as before (level 3: 2 points, stage 1; level 14:
13 points, 10 on the path, 3 free). **The 60–90 s Crow Warden benchmark and `npm run balance` are unchanged**
(balance output identical before and after). Hybrid builds trade depth for breadth with the same budget, plus the gateway toll.
Gauge may raise the rate or add milestone bonus points once hybrids are measured.

## Specializations (the evolutions)

A branch's stage is **reached** when you own all of its nodes up to that stage. Any branch with stage 1
reached is a specialization you can walk as (`set_specialization`, out of a fight), **whichever class it
belongs to**. Your specialization sets:

- your **title** (`progression.evolutionName`, the highest stage reached),
- your **resource**: the branch's class resource, then the branch's resource evolutions up to that stage
  (a Vanguard runs on Oath Points, a warrior walking as a Plaguecaller runs on Soul Energy),
- branch mechanics that read `progression.branch` (Bone Armor).

Traits work whatever your specialization is. Learning never changes your specialization by itself, except
the first time you complete a stage one (you had none).

## The guide (choosing a path)

At level 3 the game still asks you to choose a path. The chosen path becomes your specialization and your
**guide**: on each level-up the guide learns that branch's next nodes in order while points, level and story
events allow (stopping at an event, exactly as evolutions did). `guide <path>` changes it, `guide off`
turns it off. Unlearning a node on the guided path turns the guide off.

## Legendary webs (Tokelo, 2026-11-02)

A legendary class is **its own web, added on top of your build**. It doesn't replace your character. Its
heart opens once every evolution stage it lists is reached (in any class web, so most need a hybrid build)
and its story event has happened. Then its nodes link as usual. Data: `skillWeb.legendaryWebs`; names and
lore stay in `legendaryAndSecretClasses`.

| Legendary web | Opens after | Nodes today |
|---|---|---|
| Deathlord Eternal | Eternal Lich (`soulbinder.5`) + Abyssal King (`vanguard.5`) + the Throne of Bones | Legion of the Dead (passive), Death's Dominion (active, effect not built yet) |
| Reality Breaker | Arcane Hollow (`illusionist.5`) + an event not designed yet | heart only; skills to be designed (Thorne) |

While you hold a legendary web, the stages it rests on can't be unlearned. `getSkillWeb().legendaryWebs`
lists each with what is still `missing`.

**The Hollow King is the exception:** it stays a full transformation (its story is losing yourself). It
replaces the character with its own resource and kit and stands outside every web (`WEB_UNAVAILABLE`).

## Costs of borrowed skills

A skill is paid from **your current pool** whatever resource it was written for: a warrior's Raise Skeleton
costs 2 Momentum. One pool per character stays the rule. Soul Energy's income (damage dealt, kills) now
follows the pool, not the class, so anyone walking as a necromancer specialization earns it.

## Unlearning (respec)

Out of a fight, any node you own can be unlearned for its points back, as long as everything else you own
stays connected to your heart. Your own heart and starting skills can't be unlearned. Free for now
(`rules.refund`); a gold cost is Gauge's call.

## Interfaces

- Actions: `learn_node {nodeId}`, `unlearn_node {nodeId}`, `set_specialization {branchId}`,
  `set_web_guide {branchId|null}`. `nodeId` also takes a skill or trait name. All refuse in a fight
  (`IN_COMBAT`). Refusal codes: `UNKNOWN_NODE`, `ALREADY_LEARNED`, `NOT_CONNECTED`, `LEVEL_TOO_LOW`,
  `EVENT_LOCKED`, `LEGEND_LOCKED`, `NO_WEB_POINTS`, `NOT_LEARNED`, `NODE_FIXED`, `NODE_ANCHORS_OTHERS`, `SPEC_LOCKED`,
  `WEB_UNAVAILABLE` (Hollow King).
- `engine.getSkillWeb()` (pure): points, guide, specializations, `webs` (one per class: `home`, `entered`),
  and every node with `state`
  (`owned` / `available` / `locked`), the same `reason` learn_node would give, links and a layout position.
- Text: `web`, `learn <skill>`, `unlearn <skill>`, `specialize <path>`, `guide <path|off>`.
- Saves: `progression.web = { nodes, guide, bonusPoints }`. A save from before the web is migrated on load
  to own exactly the stages it had reached.

## Next increments

1. **Skill Web screen** (Pixie, Hollis): one panel per class web (tabs; your own first, others shown once
   entered or as "beyond the gateway"), using `getSkillWeb()` positions (each web is centred on its heart,
   gateways sit at the rim), learn/unlearn, specialization switch, guide toggle, and a "walk freely" choice
   at level 3.
2. **New skills and gateways** (Thorne, Gauge): fill toward 80–100 active skills, hybrid-only passives on
   gateways, milestone points.
3. **Balance pass on hybrids** (Gauge, Tally): measure cross-class builds on the Crow Warden.

## Open questions

- Should cross-class skills cost more (a "foreign" multiplier), or is the gateway toll enough?
- Should a gold or item cost apply to respec?
- Legion of the Dead and Death's Dominion need their effects built; Reality Breaker needs its skills and event.
