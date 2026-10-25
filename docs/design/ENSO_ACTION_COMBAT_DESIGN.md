# ENSO Action Combat Design: class feel, shapes, enemies, Crow Warden
**Thorne (Lead Game Designer, studio-game-designer)** · 2026-10-25 · numbers: **Gauge** (systems designer) to tune
**Implements:** [ENSO_SEAMLESS_ACTION_RPG_DIRECTION.md](ENSO_SEAMLESS_ACTION_RPG_DIRECTION.md) (Creative Director, the authority)
**Contract:** [docs/ACTION_COMBAT.md](../ACTION_COMBAT.md) (Wren).

**What is decided here, and what isn't.** The behaviours, class identities, shapes, cancel rules, enemy patterns and
the Crow Warden pattern are **decided** (Thorne). Every number is a **first pass for Gauge** to tune with Tally's
bots (`qa/scripts/rt_balance.js` and the action-combat playtests), **not final**. The `actionRules` block at the end
uses the same keys as Wren's first pass in `src/data.js`; §7 lists the new keys. Gauge owns the values. A
change to a value doesn't need this doc to change, but a change to a behaviour does.

**Units.** Positions are map pixels (16 px tiles). The player is a 24x32 sprite with its feet at the anchor. Every hit
test runs on the ground plane: a shape hits an actor when it overlaps that actor's body circle (`radius`), measured
from the feet anchor. Times are ms, speeds are px/s, angles are degrees. Facing for an attack is the aim direction at
the moment of the press (mouse, or the Tab lock target). It does not turn during the swing.

---

## 1. Core feel

ENSO is deliberate but not slow. Basic attacks are free and quick. Enemies hit hard but always telegraph. Stamina pays
only for defence and mobility (dodge, sprint, guard), never for attacking. We are borrowing Souls *timing*, not
Souls *scarcity*.

| | Rule | Number |
|---|---|---|
| Walk | 8-way, sub-tile, never disabled by combat | **72 px/s** (4.5 tiles/s; Wren's 64 felt sluggish crossing a 20-tile map) |
| Sprint | Shift. Free outside combat. Drains stamina while any group is engaged. Ends on attack, guard or dodge | ×1.5 = **108 px/s**, 18 stamina/s, can't start below 10 |
| Stamina | Pool, delay after any spend, then regen. At 0 you're *exhausted*: no dodge or sprint until 20 | **100**, regen **40/s** after **600 ms**, ×0.3 while guard is held |
| Dodge (Space) | In the move direction (aim direction if standing). Passes through enemy bodies, not walls | **48 px over 240 ms**, i-frames **20–220 ms**, recovery **120 ms**, **25** stamina, min **350 ms** between presses |
| Guard (RMB hold) | Frontal arc around aim. Blocked hits deal `damageTaken` × damage and cost the attack's `blockCost` stamina (default 14). Not enough stamina = **guard break**: the hit lands in full and you're staggered **700 ms** | ×**0.4** damage, **140°**, move ×**0.45**, raise **80 ms** |
| Parry | A *fresh* guard press (guard not held during the previous 400 ms) opens the window. A parryable melee hit in the window deals 0, costs no stamina and staggers the attacker | window **160 ms**, attacker stagger **900 ms** |
| Light hit on player | Damage + flash + 4 px knockback. Doesn't interrupt a swing or a cast already in startup | `hurtMs` **220** (visual only, no input lock) |
| Heavy hit on player (`staggers: true`) | Interrupts whatever you're doing. No input for the stagger | **400 ms**, knockback per attack |
| Input buffer | One press (attack, skill, dodge) made during startup or recovery fires when allowed | **150 ms** |

**Perfect dodge.** If an enemy attack's active hitbox overlaps you during i-frames, the dodge counts as *evaded*: 0
damage, and the resource rule `onDodge` fires (Stealth Tokens, Deception Tokens). It fires once per enemy attack.
Pressing dodge in empty air earns nothing. Wren: report it as `actionEnemyStrike(id, skill, { evaded: true })`.

**Poise (enemy flinch).** Every player hit deals `poise` (default 1; heavies more). An enemy whose poise breaks in a
2 s window flinches **250 ms**, and a flinch during its wind-up *cancels* that attack (it goes to recovery). Bosses
and brutes have **hyper armour** during wind-up: hits damage them but don't cancel. Stun/Pin statuses from skills
still work through the normal `applyStatus()` and Control Resistance.

### Cancel rules (predictable, one table)
| You are in… | Dodge cancels it? | Guard cancels it? | Next attack / skill? |
|---|---|---|---|
| Basic attack startup | Yes; the swing doesn't happen (it's free) | No | No (buffered) |
| Basic attack active | **No**: committed | No | No |
| Basic attack recovery | Yes | Yes, after 50% of recovery | Yes: the next combo hit, or any skill |
| Skill castMs (startup) | Yes; **cost refunded, cooldown set to 1 s** ("fizzle") | No | No |
| Skill active / recovery | Recovery only | Recovery after 50% | Recovery after 50% |
| Dodge | No (you finish it) | During its recovery | During its recovery (buffered) |
| Guard held | Yes | n/a | Yes (guard drops) |
| Using an item | Yes; the item **isn't used up** | No | No |
| Staggered / guard broken | No | No | No |

A heavy hit that interrupts a skill in startup fizzles it the same way (refund, 1 s cooldown). Wren: this needs an
`actionCancel(castId)` next to `actionCast`, because cost and cooldown are paid at cast.

Basic attack cadence comes from the weapon profile below, **not** the v2 swing timer (`realtimeRules.basicAttack`
stays for the v2 overlay and the bot). The pulse, GCD 1 s, cooldown formula, timed statuses and every `resourceRules`
entry stay as in v2. Two readings for the world: a basic-attack resource (`onBasicAttack`) counts a **landed** hit,
not a swing. `onGuard` keeps firing from the Guard *skill* only (see Open questions).

---

## 2. Class weapon profiles and defensive identity

Hit origin is the feet anchor. Reach is to the edge of the target's body circle. `moveMult` is your walk speed while
the attack is in startup/active/recovery. Combo: press again during recovery to chain. The combo resets after
**600 ms** without an attack.

| Class (starter weapon) | Basic attack (engine skill) | Kind | Reach / range | Arc | Startup / active / recovery | Move × | Combo |
|---|---|---|---|---|---|---|---|
| **Warrior** (Rusty Sword + Wooden Shield) | Slash | melee arc | 26 px | 110° | 150 / 90 / 240 | 0.35 | 3 hits: cut 150/90/240 → backcut 140/90/260 → overhead **finisher** 70°, reach 30, 220/100/420, poise 2, steps 8 px forward |
| **Rogue** (Short Sword) | Basic Attack | melee arc, thrust finisher | 20 px | 90° | 90 / 70 / 160 | 0.6 | 3 hits: 90/70/160 → 90/70/160 → **thrust** line 26×10 px, 130/80/300 |
| **Mage** (Wooden Staff) | Basic Attack | projectile ("staff spark") | 128 px, 220 px/s, r 4 | — | 180 / travel / 260 | 0.6 | none: a steady stream you can walk while firing |
| **Necromancer** (Cracked Bone Staff) | Basic Attack | projectile ("bone shard") | 120 px, 190 px/s, r 4 | — | 200 / travel / 300 | 0.6 | none |

Projectiles fly straight (no homing), stop at walls and solid objects, and hit the first body they touch. An
`enemy_single` hit always takes **one** target: the first body the shape touches, or for arcs the one nearest the
aim line. Keyboard/controller only: aim snaps to the nearest enemy within 10° of facing.

| Class | Defensive identity | Dodge | Guard (RMB) | Parry |
|---|---|---|---|---|
| **Warrior** | *The wall.* Best guard, best parry, plain roll. He stands in front of the halberd and wins. | default roll 48 px | ×**0.25** damage, 140°, block cost ×0.8, move ×0.55 | window **200 ms**, stagger **1100 ms** |
| **Rogue** | *Never there.* No guard. RMB is **Deflect**, a parry-only flick; dodge is cheap and quick | **56 px / 220 ms**, i-frames 200, recovery 70, **18** stamina, 250 ms apart | none (`parryOnly`): outside the window you take the hit in full | window **200 ms**, stagger 800 ms, Deflect costs 10 stamina; a miss leaves 350 ms recovery |
| **Mage** | *Elsewhere.* Dodge is a **Blink**: vanish, reappear 60 px away. The ward is an emergency bubble | teleport **60 px**, 120 ms, i-frames **220**, recovery 160, **30** stamina, 600 ms apart. Lands on the last walkable point along the line | ward ×**0.6**, **360°**, block cost ×1.5, move ×0.4 | none |
| **Necromancer** | *Hard to kill, harder to reach.* A slow "grave step" with the longest i-frames, an all-round bone ward, and skeletons that soak attention | **40 px / 300 ms**, i-frames **280**, recovery 140, 25 stamina | ward ×**0.5**, **360°**, block cost ×1.2, move ×0.4 | none |

Enemies pick the **nearest hostile body in reach**: player or minion (a tie goes to the player). That's the
Necromancer's screen, with no special rule.

---

## 3. Skill shapes

`castMs` is startup (cancel/fizzle rules in §1). The cast's area or projectile becomes active at the end of `castMs`.
Skills with `target: 'self'` resolve at once (contract). LOS = needs line of sight from caster to the target point.
Chapter One tops out at **level 3** (250 XP before the Warden + 200 for him = 450 < 475 for L4), so the reachable
branch skills are exactly the twelve Level 3 stage skills in `evolutionPaths`.

### Defaults by `target`
| target | shape | numbers | notes |
|---|---|---|---|
| enemy_single | projectile | range 140, speed 240, r 5, castMs 220 | Physical melee skills override this (below) |
| enemy_aoe | circle on caster | r 40, castMs 260 | Every enemy inside |
| enemy_multiple | ground circle at aim | range 140, r 40, castMs 300 | Up to the skill's count, nearest the centre; LOS |
| all_enemies | circle on caster | r 160, castMs 300 | Engaged enemies in LOS only: "all" never reaches through walls |
| linked_enemies | self | r 200, castMs 220 | Linked enemies within 200 |
| all_combatants | self | r 160, castMs 300 | |
| self | self | castMs 0 | Usable while walking |
| ally_single | self | castMs 120 | No party in Ch1: resolves on you (or nearest minion when the effect needs an ally) |
| minions | self | r 200, castMs 160 | Your minions within 200 |
| ground | ground circle at aim | range 110, r 32, castMs 260 | Persistent zones apply to each enemy once when it enters |
| corpse | ground circle | range 140, r 40, castMs 300 | Centred on the corpse nearest the aim point; refused (`NO_TARGET`) if none |

Corpses stay on the ground **30 s** (Grave Bolt counts corpses within 200 px of the caster).

### Every skill Chapter One can reach
| Skill (class / branch) | shape | range / reach | radius / arc / width | speed | castMs | notes |
|---|---|---|---|---|---|---|
| **Slash** (W) | arc | 26 | 110° | — | 150 | Is the warrior basic attack; combo in §2 |
| **Guard** (W) | self | — | — | — | 0 | 25% DR for 3 s (v2 `guardSeconds`). **Stacks multiplicatively with RMB guard** (×0.25×0.75); fiction: bracing the shield |
| **Power Strike** (W) | arc | 30 | 70° | — | 420 | Overhead, poise 3, steps 12 px, recovery 450. The heavy you commit to |
| War Cry (W valve) | self | — | r 64 shout (VFX) | — | 300 | |
| **Arcane Bolt** (M) | projectile | 150 | r 5 | 280 | 240 | The reliable spell |
| **Focus** (M) | self (channel) | — | — | — | 500 | Move ×0.3 during the channel; a heavy hit fizzles it |
| **Mana Burst** (M) | projectile | 130 | r 8 | 200 | 450 | Slow, fat; 20 px impact flash is cosmetic (single target) |
| Overchannel (M valve) | self | — | — | — | 0 | |
| **Backstab** (R) | line (thrust) | 24 | width 10 | — | 160 | **Flanked** = you're inside the target's rear 120° (its facing). Wren: pass `{ flanked: true }` to `actionResolve` |
| **Evasion** (R) | self | — | — | — | 0 | Its 50% avoid is a perfect-dodge for `onDodge` too |
| **Quick Slash** (R) | dash + arc | dash 32 px over 110 ms, then reach 20 | 80° | — | 80 | Gap-closer; no i-frames. "First in turn" keeps v2's reading |
| Second Wind (R valve) | self | — | — | — | 0 | |
| **Grave Bolt** (N) | projectile | 150 | r 5 | 230 | 300 | +2 per corpse within 200 px |
| **Raise Skeleton** (N) | summon | at aim point ≤ 40 px, must be walkable | — | — | 700 | Skeleton profile below |
| **Soul Leech** (N) | line (beam) | 96 | width 10 | instant | 320 | First enemy along the beam; LOS |
| Channel the Grave (N valve) | self | — | — | — | 400 | |
| **Shield Bash** (Vanguard L3) | arc | 22 | 80° | — | 260 | Steps 12 px, poise 3. The stun stays Oath ≥ 3 + CR |
| **Hemorrhage** (Berserker L3) | arc | 28 | 90° | — | 300 | Bleed is timed v2 |
| **Pincushion** (Warden L3) | projectile (thrown spear) | 160 | r 4 | 320 | 300 | Pin −50% speed scales enemy move speed too |
| **Bone Wall** (Bone Warden L3) | self | — | ring r 16 (VFX) | — | 250 | Absorbs the next hit from any side, guarded or not |
| **Contagion** (Plaguecaller L3) | projectile | 130 | r 7 | 170 | 400 | LOS; spread on death goes to enemies within 48 px of the corpse |
| **Soul Chain** (Soulbinder L3) | ground circle | range 130 | r 48 | — | 450 | Links the 2 enemies nearest the centre that you can see. Link breaks if they end up > 200 px apart |
| **Shadowstep** (Assassin L3) | dash (teleport) | target within 110 px | lands 16 px behind it | — | 150 | Target = Tab lock, else nearest enemy within 30° of aim; LOS; i-frames for the 150 ms; you face the target's back (Flanked) |
| **Riposte** (Duelist L3) | self (stance) | counter reach 26 | 110° | — | 0 | 3 s stance: the next melee hit you take triggers an instant counter-arc at the attacker |
| **Caltrops** (Saboteur L3) | ground | range 110 | r 32 | — | 280 | Zone lasts 6 s; slow applies once per enemy entering |
| **Fireball** (Elementalist L3) | projectile | 160 | r 7 | 240 | 380 | Single target as in data. Burn comes at L5 |
| **mirrorImage** (Illusionist L3) | self | — | decoy at your feet | — | 200 | Decoy lasts 3 s; enemies that haven't wound up yet target it |
| **haste** (Chronomancer L3) | self | — | — | — | 200 | ally_single resolves on you in Ch1 |

**Skeleton (Raise Skeleton).** body r 5, speed 64, stays 24–40 px from you, engages enemies within 110 px of you.
Bone Club: arc 70°, reach 16, wind-up 350, active 80, recovery 450, cooldown 1500 ms. Teleports to you if it ends up
more than 220 px away. It has a real body: enemy attacks that overlap it hit it.

---

## 4. Enemy behaviour (every Chapter One and zone-1 enemy)

Shared rules. The telegraph footprint **is** the hitbox. It appears at wind-up start and fills until active.
Enemies turn to track you during wind-up, then **lock direction for the last 200 ms** (`lockMs`); a lunge or thrust
never curves. At most **2 enemies** wind up against the player at once (attack tokens); the rest circle at their
preferred distance. Sight is blocked by solid tiles except water. Every enemy reacts to an ally being hit (the whole
group engages together, as `actionEngage` already does). Speeds sit around the player's 72 walk and 108 sprint:
you can outrun everything except a wolf at a walk.

| Key | Archetype | Speed | Detect / LOS | Pref. dist | Attack(s) (skill: shape, reach, wind-up / active / recovery, cooldown) | Body r | Poise | Leash | Group behaviour | Fiction |
|---|---|---|---|---|---|---|---|---|---|---|
| `rust_rat` | skitterer | 60 | 64 / yes | 0–12 | Corroding Bite: arc 60°, 12 px, 380/80/400, cd 900 | 4 | 1 | 150 | Zig-zag approach; after a bite it scurries 24 px back. Below 30% HP it flees 1.5 s, then returns | Vermin: weak alone, annoying in pairs, never brave |
| `hungry_wolf` | circling hunter | 82 | 112 / yes (smells you without LOS within 40) | 40–56 circling | **Lunge Bite**: line 40×10, 480/200/650, cd 2200 (the punish). **Snap**: arc 70°, 16 px, 300/80/300 at 0–20 px | 6 | 2 | 220 | Circles, strafing; lunges from the side if it can. **Gives up** after 2 s with you beyond 180 px or out of sight (outrun with sprint) | A hungry animal: tests you, commits to the lunge, doesn't die for a meal |
| `weak_goblin` | opportunist skirmisher | 52 | 96 / yes, 400 ms shout | 14–18 | Goblin Slash: arc 90°, 18 px, 480/100/450, cd 1200 | 5 | 1 | 180 | **Flank**: the second goblin goes for your side or back (≥ 90° from the first). After 2 hits in a row it hops 20 px back. Flees 2 s below 25% HP | Hungry thieves, not cruel. Brave only two to one |
| `bone_gnawer` | low crawler | 50 | 80 / yes | 0–12 | Ankle Snap: arc 50°, 14 px, 420/80/500, cd 1000. **Low**: guard only halves what it would normally block | 5 | 2 | 150 | Pushes straight in, never flees, ignores the LOS give-up | Undead jaw on legs: relentless, stupid, low |
| `cult_acolyte` | ritual caster + knife | 44 | 112 / yes, **1200 ms chanted warning** (leave the radius and it doesn't engage) | blade 14–20, hexer 56–90 | **Hex Bolt** (Hexing Blade): projectile 120 px, 130 px/s, r 5, 650/travel/600, cd 2500, *not parryable*. **Hexing Blade**: line 22×10, 550/100/550 | 5 | 2 | 170 (ritual site) | **Ranged keeps distance**: one closes with the knife, the other backs off below 40 px and casts. Guarding the site, they never chase past the leash | Robed zealots: slow to commit, they'd rather curse you than bleed |
| `watch_constable` | shield soldier | 54 | 128 / yes, **1500 ms "Halt, in the Watch's name!"** | 16–22 | Truncheon: arc 80°, 20 px, 500/100/500, cd 1400. **Shield Shove**: line 18×16, 350/120/600, knockback 24 px, `staggers`, used when you guard or hit its shield twice | 6 | 3 | 260 (pursuers) | **Pincer**: the two approach from opposite sides. **Frontal shield**: hits from inside its front 90° deal ×0.5 to it unless it's attacking. Rewards circling | Honest town watch doing a duty. Defensive, predictable, no cheap shots |
| `shackled_ghoul_stronger` | brute | 58 lurch | 80 / yes, **only once provoked** (you enter its range with LOS, or hit it) | 0–20 | **Frenzied Bite** 2-hit: arc 90°, 20 px, 600/100/200 → 350/100/800, the 2nd hit `staggers`. **Chain Whip** (Frenzied Bite): arc 160°, 32 px, 800/150/700, cd 4000, at 20–40 px | 8 | 5, **hyper armour** in wind-up | 120 | Alone. Paces its pen until provoked | A penned, ritual-scarred thing with a snapped chain: slow to start, awful once going |

Detect, then *alert* (an icon over the head plus the warning time), then engage. Pressing attack with a group inside
`engageRadius` (120) engages it at once. Wren's `wander` 18 stays for idle.

**Map note (Wren).** `featherwatch_ghoul` sits at (12,7), in the 1-tile corridor. Arcs and dodges need room. Either
home it in the 3x3 cage clearing at (13–15, 3–5) or make the fight trigger at the wider rows 10–13. Dodge already
passes through bodies, so the corridor can't trap the player.

---

## 5. The Crow-Touched Warden (`crow_touched_warden`)

**Arena.** The sanctuary interior: tiles x 1–20, y 2–13 = **px 16–336 × 32–224**. He stands at the centre axis,
(11,5) → (184, 88), between you and the seal (F96-07). Cages (solid `k`) line both walls at x 2 and 19. The south exit
**stays open**: retreat is allowed, and leaving resets him. The seal door stays shut until the key drops. No leash
inside the arena. He never leaves it.

**Behaviour.** Walk 46 px/s (54 in phase 2), preferred distance 32–56. He **keeps himself between you and the
seal**: if you get north of him he backsteps to block and opens with Reaping Thrust. **He won't swing at his birds**:
within 40 px of a cage he uses the thrust, never the sweep. Players who read the room find this out. Poise 10, hyper
armour in every wind-up, posture break → **1500 ms** stagger. A parry staggers him **600 ms** (warrior 800).
Wind-ups never drop below 500 ms in any phase.

| # | Attack (engine skill) | Telegraph shape / size | Wind-up / active / recovery | Used when | Block / parry | Punish window |
|---|---|---|---|---|---|---|
| 1 | **Halberd Sweep** (Halberd Sweep) | arc **150°, reach 36** | 700 / 150 / 700. Tell: crows lift off his arms | you're at 0–40 px | block 30 stamina; parryable | ~700 ms behind or beside him |
| 2 | **Reaping Thrust** (Halberd Sweep) | line **64×12**, he lunges 24 px with it | 550 / 120 / **900** | 40–80 px, or you're north of him | block 22; parryable | longest melee opening: he's overextended |
| 3 | **Chain Lock** (Chain Lock) | projectile chain **120 px, width 10, 300 px/s** | 600 (chain whirls overhead) / travel / 800 | you're > 80 px away for 1.5 s (punishes kiting) | blockable (a guard stops the pull); **not parryable** | 800 ms while he reels in. On hit: **Rooted 1000 ms** (can't move or dodge, can still attack/guard) and pulled 24 px toward him |
| 4 | **Summon Crows** (Summon Crows) | **3 ground circles r 20**: one on you, two leading your movement by 300 ms | shadows 900 / 300 / he kneels 1000 | every 8–10 s | ground hazard: guard does nothing, move out | 1000 ms kneeling: safest damage window for casters |
| 5 | **Murder of Crows** (Summon Crows) *phase 2 only* | circle **r 64 on him**, then he stays still | **1200** (he plants the halberd, crows spiral in) / 200 / **1500** | phase change, then every 15 s | not blockable; dodge through with i-frames or run out | 1500 ms: the big opening |

**Phases.**
- **Phase 1 (100–50%)**: attacks 1–4. He's patient: ~1.2 s between attacks.
- **Phase 2 (≤ 50%)**: opens with Murder of Crows right away (no damage in the 1200 ms wind-up, so the player sees
  the new move first). Speed 54. Sweep becomes a **2-hit combo** (reverse sweep 400 ms after the first, same arc).
  Summon Crows drops **5** circles.
- **Desperation (≤ 20%)**: recoveries −20% (never below 500 ms), no Chain Lock. He stops protecting distance and just
  blocks the door. One bark line before each Murder of Crows (the narrative team writes it).

**What the player learns:** read a wind-up and dodge *into or past* a sweep. Punish the thrust. Don't kite a man with
a chain. Don't stand in shadows. Warriors learn parry timing on a 700 ms swing. Everyone learns he's guarding a door,
not hunting you.

**Defeat (his).** At 0 HP he kneels, no ragdoll. The crows gather (F96-08 death beat). The **First Echo key** is a
world drop at his feet (Rook's drop system, once-only). 200 XP as now. **Defeat (yours):** see §6. He walks back to
centre at full HP. `warden_challenged` stays set, so the dialogue doesn't replay. He waits, halberd down, until you
come within 80 px of him or attack.

Stats (HP 150, atk 15, def 8) stay as in data. Rough reach check (Gauge/Tally to measure): a warrior combo hit does ~4–7
after DEF 8, so the fight runs about 75–120 s for a player who punishes the openings. That's the target.

---

## 6. Combat state rules (world behaviour, no mode screen)

"**Engaged**" = at least one group engaged (engine `mode: 'combat'`). "**Threatened**" = engaged, or an alerted enemy
is within its detect radius of you.

| Action | Allowed while engaged? | Rule |
|---|---|---|
| Walk, sprint, dodge, guard, attack, skills | Yes | Never disabled by combat |
| Healing / consumables | **Yes**, with a **500 ms use time** (move ×0.5) | Dodge or a stagger cancels it and the item isn't used up. Shares the 1 s GCD |
| Collect a world drop, inspect | Yes | Inspect text is a toast, never a pause |
| Gather, open a chest | Yes, as a **1000 ms channel** that any hit cancels | |
| Talk to NPCs, shops, crafting | **No** (`IN_COMBAT`) | The Warden's pre-fight dialogue happens before engagement |
| Equip, skill-bar edits | No (`IN_COMBAT`) | As in v2 |
| Inventory / journal (I, J) | Open, **read-only** for equipment; the world keeps running | |
| Pause (Esc) | Always | Single-player: the sim stops |
| Save | No while **threatened** (`IN_COMBAT`) | |
| Black Flight | No while **threatened** | As NAH-01 (combat, pursuit) |
| Map exits | Yes, except the boss's seal door | Leaving resets every engaged group on that map |

**Leash and anti-exploit.**
1. An enemy beyond `leash` px of its home, or one that has lost you (`giveUpMs`), **resets**: it walks home at ×1.6
   speed, can't be damaged or targeted, and arrives at full HP with statuses cleared (`actionDisengage`). The group
   can't be re-engaged for **1500 ms** after it gets home.
2. **Unreachable**: an engaged enemy that can't path to within its reach of you for **3000 ms** (you're across water
   or on solid ground it can't walk) resets. No free kills from a ledge.
3. A group that resets gives no XP and no drop. XP, drops and quest events come only from the kill (already once-only).
4. **2 attack tokens** (§4): no unreadable pile-ons.
5. **Spawn grace**: for 1500 ms after entering a map or respawning, enemies don't detect you, and you have 1500 ms of
   i-frames after a respawn.

**Defeat and respawn (Wren's default, kept with two changes).** You come back at the **spawn you entered the map
from**, at **50% HP**, with stamina full, resources at `startOfFight`, cooldowns cleared and statuses cleared. Engaged
groups reset. Defeated groups, claimed drops and quest state are untouched. No XP or Gold loss in Chapter One.
**Change: a defeat in a boss fight respawns you at 100% HP**, because the retry is the content and 50% against the
Warden is a dead run. For the Warden you return at the sanctuary entrance (11,14) → (184, 232), 9 tiles from him.

---

## 7. `actionRules` (first-pass numbers, Gauge to tune)

The same keys as Wren's block, with these **new** keys:
- `player.staggerMs`, `player.inputBufferMs`, `player.cancel`
- `stamina.exhaustedUntil`, `stamina.guardRegenMult`, `stamina.sprintFreeOutOfCombat`
- `dodge.iframeStartMs`, `dodge.passThroughEnemies`
- `guard.raiseMs`, `guard.breakStaggerMs`, `guard.recoveryCancelPct`; `parry.rearmMs`
- per class: `weapon.moveMult`, `weapon.combo`, `weapon.comboResetMs`, `weapon.poise`; `dodge.teleport`;
  `guard.staminaMult`, `guard.parryOnly`, `guard.parry`
- skill entries: `stepPx`, `poise`, `maxTargets`, `los`, `durationMs`, `minion`
- enemies: `attacks[]`, `poise`, `hyperArmor`, `alertMs`, `keepDistance`, `group`, `giveUpMs`, `flee`
- `combat` (state rules, tokens, reset, respawn) and `bosses`

`classes` and `skillShapes` take the place of Wren's entries. `enemyDefaults` stays and fills any missing field. An
enemy's top-level `reach`/`windupMs`/`shape` are its primary attack, so the current sim keeps working until it reads
`attacks[]`.

```json
{
  "player": {
    "speed": 72, "sprintMult": 1.5, "radius": 5, "attackMoveMult": 0.35,
    "hurtMs": 220, "staggerMs": 400, "inputBufferMs": 150,
    "cancel": {
      "dodgeCancels": ["attackStartup", "attackRecovery", "skillCast", "skillRecovery", "guard", "item"],
      "guardCancels": ["attackRecovery", "skillRecovery"],
      "recoveryCancelPct": 0.5,
      "skillFizzle": { "refundCost": true, "cooldownMs": 1000 },
      "lightHitsInterrupt": false
    }
  },
  "stamina": { "max": 100, "regenPerSec": 40, "regenDelayMs": 600, "sprintPerSec": 18, "sprintMinToStart": 10, "exhaustedUntil": 20, "guardRegenMult": 0.3, "sprintFreeOutOfCombat": true },
  "dodge": { "distance": 48, "ms": 240, "iframeStartMs": 20, "iframeMs": 200, "recoveryMs": 120, "stamina": 25, "cooldownMs": 350, "passThroughEnemies": true },
  "guard": { "damageTaken": 0.4, "arcDeg": 140, "staminaPerHit": 14, "moveMult": 0.45, "raiseMs": 80, "breakStaggerMs": 700 },
  "parry": { "windowMs": 160, "staggerMs": 900, "rearmMs": 400 },
  "respawn": { "hpPct": 0.5, "bossHpPct": 1.0, "at": "entrySpawn", "graceMs": 1500, "iframeMs": 1500 },
  "engageRadius": 120,
  "classes": {
    "warrior": {
      "weapon": { "kind": "arc", "reach": 26, "arcDeg": 110, "startupMs": 150, "activeMs": 90, "recoveryMs": 240, "moveMult": 0.35, "poise": 1, "comboResetMs": 600,
        "combo": [
          { "kind": "arc", "reach": 26, "arcDeg": 110, "startupMs": 150, "activeMs": 90, "recoveryMs": 240 },
          { "kind": "arc", "reach": 26, "arcDeg": 110, "startupMs": 140, "activeMs": 90, "recoveryMs": 260 },
          { "kind": "arc", "reach": 30, "arcDeg": 70, "startupMs": 220, "activeMs": 100, "recoveryMs": 420, "poise": 2, "stepPx": 8 }
        ] },
      "dodge": {},
      "guard": { "damageTaken": 0.25, "arcDeg": 140, "staminaMult": 0.8, "moveMult": 0.55, "parry": { "windowMs": 200, "staggerMs": 1100 } }
    },
    "rogue": {
      "weapon": { "kind": "arc", "reach": 20, "arcDeg": 90, "startupMs": 90, "activeMs": 70, "recoveryMs": 160, "moveMult": 0.6, "poise": 1, "comboResetMs": 600,
        "combo": [
          { "kind": "arc", "reach": 20, "arcDeg": 90, "startupMs": 90, "activeMs": 70, "recoveryMs": 160 },
          { "kind": "arc", "reach": 20, "arcDeg": 90, "startupMs": 90, "activeMs": 70, "recoveryMs": 160 },
          { "kind": "line", "reach": 26, "width": 10, "startupMs": 130, "activeMs": 80, "recoveryMs": 300 }
        ] },
      "dodge": { "distance": 56, "ms": 220, "iframeMs": 200, "recoveryMs": 70, "stamina": 18, "cooldownMs": 250 },
      "guard": { "parryOnly": true, "damageTaken": 1.0, "stamina": 10, "whiffRecoveryMs": 350, "parry": { "windowMs": 200, "staggerMs": 800 } }
    },
    "mage": {
      "weapon": { "kind": "projectile", "range": 128, "speed": 220, "radius": 4, "projectile": "arcane", "startupMs": 180, "activeMs": 0, "recoveryMs": 260, "moveMult": 0.6, "poise": 1 },
      "dodge": { "teleport": true, "distance": 60, "ms": 120, "iframeStartMs": 0, "iframeMs": 220, "recoveryMs": 160, "stamina": 30, "cooldownMs": 600 },
      "guard": { "damageTaken": 0.6, "arcDeg": 360, "staminaMult": 1.5, "moveMult": 0.4, "parry": null }
    },
    "necromancer": {
      "weapon": { "kind": "projectile", "range": 120, "speed": 190, "radius": 4, "projectile": "bone", "startupMs": 200, "activeMs": 0, "recoveryMs": 300, "moveMult": 0.6, "poise": 1 },
      "dodge": { "distance": 40, "ms": 300, "iframeMs": 280, "recoveryMs": 140, "stamina": 25 },
      "guard": { "damageTaken": 0.5, "arcDeg": 360, "staminaMult": 1.2, "moveMult": 0.4, "parry": null }
    }
  },
  "skillShapes": {
    "byTarget": {
      "enemy_single":   { "shape": "projectile", "range": 140, "speed": 240, "radius": 5, "castMs": 220, "maxTargets": 1 },
      "enemy_aoe":      { "shape": "circle", "radius": 40, "castMs": 260 },
      "enemy_multiple": { "shape": "ground", "range": 140, "radius": 40, "castMs": 300, "los": true },
      "all_enemies":    { "shape": "circle", "radius": 160, "castMs": 300, "los": true },
      "linked_enemies": { "shape": "self", "radius": 200, "castMs": 220 },
      "all_combatants": { "shape": "self", "radius": 160, "castMs": 300 },
      "self":           { "shape": "self", "castMs": 0 },
      "ally_single":    { "shape": "self", "castMs": 120 },
      "minions":        { "shape": "self", "radius": 200, "castMs": 160 },
      "ground":         { "shape": "ground", "range": 110, "radius": 32, "castMs": 260 },
      "corpse":         { "shape": "ground", "range": 140, "radius": 40, "castMs": 300, "needsCorpse": true }
    },
    "bySkill": {
      "Slash":            { "shape": "arc", "reach": 26, "arcDeg": 110, "castMs": 150, "maxTargets": 1 },
      "Guard":            { "shape": "self", "castMs": 0, "stacksWithGuard": true },
      "Power Strike":     { "shape": "arc", "reach": 30, "arcDeg": 70, "castMs": 420, "activeMs": 120, "recoveryMs": 450, "poise": 3, "stepPx": 12, "maxTargets": 1 },
      "War Cry":          { "shape": "self", "castMs": 300 },
      "Arcane Bolt":      { "shape": "projectile", "range": 150, "speed": 280, "radius": 5, "castMs": 240 },
      "Focus":            { "shape": "self", "castMs": 500, "moveMult": 0.3, "channel": true },
      "Mana Burst":       { "shape": "projectile", "range": 130, "speed": 200, "radius": 8, "castMs": 450 },
      "Overchannel":      { "shape": "self", "castMs": 0 },
      "Backstab":         { "shape": "line", "reach": 24, "width": 10, "castMs": 160, "maxTargets": 1, "flankArcDeg": 120 },
      "Evasion":          { "shape": "self", "castMs": 0 },
      "Quick Slash":      { "shape": "dash", "dashPx": 32, "dashMs": 110, "reach": 20, "arcDeg": 80, "castMs": 80, "maxTargets": 1 },
      "Second Wind":      { "shape": "self", "castMs": 0 },
      "Grave Bolt":       { "shape": "projectile", "range": 150, "speed": 230, "radius": 5, "castMs": 300, "corpseRadius": 200 },
      "Raise Skeleton":   { "shape": "summon", "range": 40, "castMs": 700,
        "minion": { "radius": 5, "speed": 64, "followMin": 24, "followMax": 40, "engageRadius": 110, "teleportBeyond": 220,
          "attack": { "skill": "Bone Club", "shape": "arc", "reach": 16, "arcDeg": 70, "windupMs": 350, "activeMs": 80, "recoveryMs": 450, "cooldownMs": 1500 } } },
      "Soul Leech":       { "shape": "line", "reach": 96, "width": 10, "castMs": 320, "los": true, "maxTargets": 1 },
      "Channel the Grave": { "shape": "self", "castMs": 400 },
      "Shield Bash":      { "shape": "arc", "reach": 22, "arcDeg": 80, "castMs": 260, "poise": 3, "stepPx": 12, "maxTargets": 1 },
      "Hemorrhage":       { "shape": "arc", "reach": 28, "arcDeg": 90, "castMs": 300, "maxTargets": 1 },
      "Pincushion":       { "shape": "projectile", "range": 160, "speed": 320, "radius": 4, "castMs": 300 },
      "Bone Wall":        { "shape": "self", "castMs": 250 },
      "Contagion":        { "shape": "projectile", "range": 130, "speed": 170, "radius": 7, "castMs": 400, "los": true, "spreadRadius": 48 },
      "Soul Chain":       { "shape": "ground", "range": 130, "radius": 48, "castMs": 450, "los": true, "count": 2, "breakDistance": 200 },
      "Shadowstep":       { "shape": "dash", "teleport": true, "range": 110, "behindPx": 16, "aimConeDeg": 30, "castMs": 150, "iframeMs": 150, "los": true },
      "Riposte":          { "shape": "self", "castMs": 0, "durationMs": 3000, "counter": { "shape": "arc", "reach": 26, "arcDeg": 110 } },
      "Caltrops":         { "shape": "ground", "range": 110, "radius": 32, "castMs": 280, "durationMs": 6000, "applyOnEnter": true },
      "Fireball":         { "shape": "projectile", "range": 160, "speed": 240, "radius": 7, "castMs": 380 },
      "mirrorImage":      { "shape": "self", "castMs": 200, "decoyMs": 3000 },
      "haste":            { "shape": "self", "castMs": 200 },
      "Whirlwind":        { "shape": "circle", "radius": 30, "castMs": 200 }
    }
  },
  "enemyDefaults": { "speed": 48, "detect": 90, "sight": true, "reach": 18, "windupMs": 520, "activeMs": 110, "recoveryMs": 600, "lockMs": 200, "shape": "arc", "arcDeg": 100, "leash": 200, "radius": 6, "wander": 18, "poise": 2, "flinchMs": 250, "blockCost": 14, "parryable": true, "giveUpMs": 4000 },
  "enemies": {
    "rust_rat": { "speed": 60, "detect": 64, "reach": 12, "arcDeg": 60, "windupMs": 380, "activeMs": 80, "recoveryMs": 400, "radius": 4, "poise": 1, "leash": 150, "keepDistance": [0, 12], "group": "swarm", "flee": { "belowHpPct": 0.3, "ms": 1500 }, "retreatAfterHitPx": 24,
      "attacks": [ { "skill": "Corroding Bite", "shape": "arc", "reach": 12, "arcDeg": 60, "windupMs": 380, "activeMs": 80, "recoveryMs": 400, "cooldownMs": 900, "blockCost": 6 } ] },
    "hungry_wolf": { "speed": 82, "detect": 112, "smellRadius": 40, "reach": 40, "shape": "line", "width": 10, "lunge": 40, "windupMs": 480, "activeMs": 200, "recoveryMs": 650, "radius": 6, "poise": 2, "leash": 220, "giveUpMs": 2000, "giveUpBeyond": 180, "keepDistance": [40, 56], "group": "circle",
      "attacks": [
        { "name": "Lunge Bite", "skill": "Bite", "shape": "line", "reach": 40, "width": 10, "lunge": 40, "windupMs": 480, "activeMs": 200, "recoveryMs": 650, "cooldownMs": 2200, "blockCost": 12, "useAt": [24, 56] },
        { "name": "Snap", "skill": "Bite", "shape": "arc", "reach": 16, "arcDeg": 70, "windupMs": 300, "activeMs": 80, "recoveryMs": 300, "cooldownMs": 900, "blockCost": 8, "useAt": [0, 20] } ] },
    "weak_goblin": { "speed": 52, "detect": 96, "alertMs": 400, "reach": 18, "arcDeg": 90, "windupMs": 480, "activeMs": 100, "recoveryMs": 450, "radius": 5, "poise": 1, "leash": 180, "keepDistance": [14, 18], "group": "flank", "flee": { "belowHpPct": 0.25, "ms": 2000 }, "hopBackAfterHits": 2, "hopBackPx": 20,
      "attacks": [ { "skill": "Goblin Slash", "shape": "arc", "reach": 18, "arcDeg": 90, "windupMs": 480, "activeMs": 100, "recoveryMs": 450, "cooldownMs": 1200, "blockCost": 10 } ] },
    "bone_gnawer": { "speed": 50, "detect": 80, "reach": 14, "arcDeg": 50, "windupMs": 420, "activeMs": 80, "recoveryMs": 500, "radius": 5, "poise": 2, "leash": 150, "giveUpMs": null, "keepDistance": [0, 12], "group": "direct",
      "attacks": [ { "skill": "Ankle Snap", "shape": "arc", "reach": 14, "arcDeg": 50, "windupMs": 420, "activeMs": 80, "recoveryMs": 500, "cooldownMs": 1000, "blockCost": 10, "low": true, "guardEfficiency": 0.5 } ] },
    "cult_acolyte": { "speed": 44, "detect": 112, "alertMs": 1200, "ranged": true, "keepDistance": [56, 90], "reach": 120, "shape": "projectile", "projectile": "shadow", "projSpeed": 130, "windupMs": 650, "activeMs": 0, "recoveryMs": 600, "radius": 5, "poise": 2, "leash": 170, "group": "ranged_keeps_distance", "roles": ["blade", "hexer"], "backOffBelow": 40,
      "attacks": [
        { "name": "Hex Bolt", "skill": "Hexing Blade", "shape": "projectile", "reach": 120, "projSpeed": 130, "radius": 5, "windupMs": 650, "activeMs": 0, "recoveryMs": 600, "cooldownMs": 2500, "blockCost": 12, "parryable": false, "role": "hexer" },
        { "name": "Hexing Blade", "skill": "Hexing Blade", "shape": "line", "reach": 22, "width": 10, "windupMs": 550, "activeMs": 100, "recoveryMs": 550, "cooldownMs": 1400, "blockCost": 12, "role": "blade" } ] },
    "watch_constable": { "speed": 54, "detect": 128, "alertMs": 1500, "reach": 20, "arcDeg": 80, "windupMs": 500, "activeMs": 100, "recoveryMs": 500, "radius": 6, "poise": 3, "leash": 260, "keepDistance": [16, 22], "group": "pincer", "frontalShield": { "arcDeg": 90, "damageTaken": 0.5 },
      "attacks": [
        { "skill": "Truncheon", "shape": "arc", "reach": 20, "arcDeg": 80, "windupMs": 500, "activeMs": 100, "recoveryMs": 500, "cooldownMs": 1400, "blockCost": 12 },
        { "skill": "Shield Shove", "shape": "line", "reach": 18, "width": 16, "windupMs": 350, "activeMs": 120, "recoveryMs": 600, "cooldownMs": 3000, "blockCost": 20, "knockbackPx": 24, "staggers": true, "useWhen": "playerGuarding_or_shieldHitTwice" } ] },
    "shackled_ghoul_stronger": { "speed": 58, "detect": 80, "provokedOnly": true, "reach": 20, "arcDeg": 90, "windupMs": 600, "activeMs": 100, "recoveryMs": 800, "radius": 8, "poise": 5, "hyperArmor": true, "leash": 120, "keepDistance": [0, 20], "group": "solo",
      "attacks": [
        { "name": "Frenzied Bite", "skill": "Frenzied Bite", "shape": "arc", "reach": 20, "arcDeg": 90, "combo": [
          { "windupMs": 600, "activeMs": 100, "recoveryMs": 200, "blockCost": 14 },
          { "windupMs": 350, "activeMs": 100, "recoveryMs": 800, "blockCost": 16, "staggers": true, "knockbackPx": 12 } ], "cooldownMs": 1600, "useAt": [0, 20] },
        { "name": "Chain Whip", "skill": "Frenzied Bite", "shape": "arc", "reach": 32, "arcDeg": 160, "windupMs": 800, "activeMs": 150, "recoveryMs": 700, "cooldownMs": 4000, "blockCost": 22, "useAt": [20, 40] } ] },
    "crow_touched_warden": { "boss": true, "speed": 46, "detect": 150, "reach": 36, "windupMs": 700, "arcDeg": 150, "radius": 10, "leash": 400, "poise": 10, "hyperArmor": true, "see": "bosses.crow_touched_warden" }
  },
  "bosses": {
    "crow_touched_warden": {
      "arena": { "x0": 16, "y0": 32, "x1": 336, "y1": 224, "home": { "x": 184, "y": 88 }, "leashInsideArena": false, "exitResets": true, "respawnAt": { "x": 184, "y": 232 }, "reengageRadius": 80 },
      "speed": 46, "keepDistance": [32, 56], "radius": 10, "poise": 10, "hyperArmor": true, "postureBreakMs": 1500,
      "parryStaggerMs": 600, "warriorParryStaggerMs": 800, "attackGapMs": 1200, "minWindupMs": 500,
      "guardsSeal": true, "noSweepNearCagesPx": 40,
      "attacks": {
        "halberd_sweep":   { "skill": "Halberd Sweep", "shape": "arc", "reach": 36, "arcDeg": 150, "windupMs": 700, "activeMs": 150, "recoveryMs": 700, "blockCost": 30, "parryable": true, "useAt": [0, 40] },
        "reaping_thrust":  { "skill": "Halberd Sweep", "shape": "line", "reach": 64, "width": 12, "lunge": 24, "windupMs": 550, "activeMs": 120, "recoveryMs": 900, "blockCost": 22, "parryable": true, "useAt": [40, 80], "alsoWhen": "playerNorthOfWarden_or_nearCage" },
        "chain_lock":      { "skill": "Chain Lock", "shape": "projectile", "reach": 120, "width": 10, "projSpeed": 300, "windupMs": 600, "activeMs": 0, "recoveryMs": 800, "blockCost": 20, "parryable": false, "onHit": { "status": "Rooted", "ms": 1000, "pullPx": 24 }, "useWhen": "playerBeyond80For1500ms" },
        "summon_crows":    { "skill": "Summon Crows", "shape": "ground", "count": 3, "radius": 20, "leadMs": 300, "windupMs": 900, "activeMs": 300, "recoveryMs": 1000, "guardable": false, "cooldownMs": 9000 },
        "murder_of_crows": { "skill": "Summon Crows", "shape": "circle", "radius": 64, "windupMs": 1200, "activeMs": 200, "recoveryMs": 1500, "guardable": false, "cooldownMs": 15000, "phase": 2 }
      },
      "phases": [
        { "fromHpPct": 1.0, "attacks": ["halberd_sweep", "reaping_thrust", "chain_lock", "summon_crows"] },
        { "fromHpPct": 0.5, "openWith": "murder_of_crows", "speed": 54, "attacks": ["halberd_sweep", "reaping_thrust", "chain_lock", "summon_crows", "murder_of_crows"], "sweepCombo": { "hits": 2, "gapMs": 400 }, "summonCrowsCount": 5 },
        { "fromHpPct": 0.2, "recoveryMult": 0.8, "drop": ["chain_lock"], "barkBeforeMurder": true }
      ],
      "onDefeat": { "drop": "First Echo key", "scene": "crows_mourn" },
      "onPlayerDefeat": { "reset": "fullHp", "returnHome": true, "keepFlags": ["warden_challenged"] }
    }
  },
  "combat": {
    "maxSimultaneousAttackers": 2,
    "reset": { "returnSpeedMult": 1.6, "invulnerable": true, "fullHeal": true, "reengageCooldownMs": 1500, "unreachableMs": 3000 },
    "itemUse": { "ms": 500, "moveMult": 0.5, "cancelKeepsItem": true },
    "channelInteractMs": 1000,
    "corpseMs": 30000,
    "perfectDodgeFiresOnDodge": true,
    "allowedWhileEngaged": { "move": true, "items": true, "collectDrop": true, "inspect": true, "gather": "channel", "dialogue": false, "shop": false, "equip": false, "skillBarEdit": false, "inventoryReadOnly": true, "pause": true, "mapExit": true },
    "blockedWhileThreatened": ["save", "black_flight"]
  }
}
```

---

## Open questions (Tokelo)
(Balance values are not on this list. They're Gauge's.)
1. **Vanguard Oath Points**: should RMB blocks and parries earn `onGuard` (+1 Oath), or only the Guard skill (as
   now)? I'd say parries only.
2. **Mage/Necromancer basic attack damage type**: Basic Attack is physical (STR). A staff spark reads as magic. Make
   it `magic` (INT) for casters? I'd say yes, but Gauge measures the balance impact first.
3. **Rooted**: Chain Lock needs a new soft-control status (no move, no dodge, 1000 ms, normal CR). OK to add?

## Summary
1. Stamina pays only for dodge, sprint and guard. Attacks are free and quick, and enemies telegraph; walk 72,
   sprint 108, dodge 48 px with 200 ms i-frames.
2. Each class defends differently: the warrior has the best guard and parry, the rogue has no guard but a cheap dodge
   and a Deflect parry, the mage Blinks, and the necromancer has long i-frames, a 360° ward and skeletons that draw
   attacks.
3. Every Chapter One skill has a shape. `enemy_single` hits exactly one body, which keeps v2's damage balance, and a
   skill dodged or interrupted in startup fizzles: cost refunded, 1 s cooldown.
4. Each enemy fights according to its fiction (rat hit-and-run, wolf circle and lunge, goblin flank, acolyte keeping
   its distance, constable shield pincer, ghoul hyper armour). Telegraph = hitbox, and at most 2 attackers at once.
5. The Crow Warden guards the seal with 5 readable attacks across 2 phases plus a desperation stage. Retreat is
   allowed, a boss defeat respawns you at full HP, and he waits at the centre without replaying his dialogue.

— Thorne, Lead Game Designer (numbers: first pass for Gauge)
