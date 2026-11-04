# The Fallen Seraphim

**Owner:** Thorne (mechanics), Gauge (numbers), lore by Ashby and Wick. **Requested by:** Tokelo, 2026-11-04
("can we have the team design the lore attacks and skill tree for Fallen Angel").
**Status:** built. Data: `skillWeb.legendaryWebs.fallen_seraphim` and the skills in `skillDefinitions` (`src/data.js`);
dialogue: `seraph_statue` in `src/story/chapter1.js`; tests: `tests/96-fallen-seraphim.test.js`.
**Builds on:** the first pass (PR #226: the gaze, the statue, six nodes) and the legendary-web rules in
[SKILL_WEB.md](SKILL_WEB.md). The Fallen Angel and the Fallen Seraphim are the same class.

> "I know the plot is saying the player is evil hence the fallen part, besides what is evil? basically good that
> some one else does not deem good." (Tokelo)

## How you get it (unchanged)

Stand still in front of the robed statue in the courtyard inside the Kloster's abbey church and look at it. At
60 s a halo lights over its hood; at 120 s six wings unfold and it speaks. Its heart is a gift (it costs no
point). Then the web opens like any other: one point per node, a level gate on each. It **adds to your
character**: your class, your class web and your resource stay. Every Fallen skill is paid from the resource your
class already uses (`resource: 'any'`).

## What it pays at unlock, and the trial (Gauge, Tokelo 2026-11-04)

> "I expect it to be at least comparable to like 60 to 70% peak level classes ... At base (meaning at unlock) ...
> another quest with a ridiculously strong boss can be in the middle so that going forward is earned." (Tokelo)

The unlock is hidden (you have to know, or stare at a statue for two minutes), so it pays at once:

- **Fallen Grace**, a trait on the heart: +35% damage dealt, 35% less damage taken (`heartTraits` on the web).
- **Three gifts**, owned the moment the statue wakes and put on empty bar slots: Fallen Judgement, Halo of Ash and
  Wingstep (`gifts`). They cost no point and no resource, only their cooldown, and can't be unlearned while you
  hold the web. Saves that woke the statue before this get them on load (a story `catchUp`).

**The trial.** Every node at level 10 and up is sealed (`trial: true` on the node, `trial` on the web) until you win
**the Trial of the Cold Door** (quest QS1). After the Watcher rank the statue asks you to let its door's warden
come; say yes and **Aurevain, Warden of the Shut Door** waits in the courtyard: 3200 HP (about 21 Crow Wardens),
ATK 34, DEF 10, a two-hit spear sweep, a lunging thrust, a 1.2 s wingbeat you can't guard (×1.6), three pillars of
light (×1.7) and a bolt at range. Winning sets `seraph_trial_won` and opens the rest of the web, and with it the
wings, the red eyes and the holy weapon.

**Measured** (`qa/scripts/legendary_power.js`: a ×60 HP Crow Warden for 60 s, player kept alive, 6 seeds;
power = sqrt(dps × seconds you'd last, capped at 300). Peak = level 14 with an evolution; average of peaks 100):

| Setup | Power | % of the peak average |
|---|---|---|
| Warrior peaks (Vanguard, Berserker L14) | 68–75 | 68–75% |
| Rogue peaks (Assassin, Duelist L14) | 103–104 | 102–103% |
| Necromancer peaks (Bone Warden, Plaguecaller L14) | 117–136 | 116–136% |
| Warrior Vanguard L5, no legend | 40 | 40% |
| Rogue Assassin L5, no legend | 38 | 38% |
| **Warrior Vanguard L5 + Fallen at unlock** | **76** | **76%** |
| **Rogue Assassin L5 + Fallen at unlock** | **61** | **61%** |

The necromancer reads high at every level because the dummy can't kill its minions; its numbers aren't a guide.

The trial (`qa/scripts/trial_benchmark.js`: Aurevain, level 10, the player can die, dodges 60% of tells, 300 s cap,
healing items, 10 seeds). Fallen = the gifts and the first half of the web:

| Build | Wins plain | Wins + Fallen |
|---|---|---|
| Warrior Vanguard / Berserker | 0% / 0% | 60% / 60% |
| Rogue Assassin / Duelist | 0% / 40% | 70% / 70% |
| Necromancer Bone Warden / Plaguecaller | 0% / 30% | 60% / 60% |

Fallen runs never died; every loss was the 300 s cap, partly the bot catching on the courtyard's fountain and
benches. A plain level 10 build dies. Mage is left out: the bot sticks behind the fountain.

## Lore (Ashby, Wick)

**Caelith, Keeper of the Cold Door.** Long before the Kloster, the hill at Briarwell was a gate. Behind it lay the
warm country; in front of it, a winter that did not end. Caelith, a six-winged seraph, was set to keep the warmth
in and the world out. The ones outside knocked for a hundred years. Caelith opened the door, and spring ran down
the hill for the first time. The spring under the courtyard fountain is the last of it.

Heaven called it sin and shut the door behind it. Caelith fell, and the hill closed over it. Stone is patient.
The monks found the figure when they dug their cloister and built their walls around it. They do not know what it
is. One of them guessed, and carved it small on the altar step: **HE FELL FOR US**. The chained book in the
church, *On the Six-Winged Ones, and Why They Are Not Spoken Of*, has most of its pages cut out.

**Why it speaks to you.** Nobody looks at it any more; you did. It sees in you another thing that was given a
name by someone else. It never says what you were (the mystery pacing in
ENSO_WORLD_NARRATIVE_FOUNDATION.md holds: no NPC names the player's past before the midgame reveal). It answers
the story's verdict with a question: *evil is only a good that someone else did not choose.* "You are what you
do next. The names come afterwards, and they are written by whoever is left standing."

**The six wings** follow the old picture of a seraph: two cover the face, two cover the feet, two fly. The art
already draws them that way (`ui/gaze-fx.js`: up over the face, down over the feet, spread wide). Each pair is one
path, and each path asks one question:

| Wings | Path | Its question | Play |
|---|---|---|---|
| Over the face | **The Veiled Face** | Who judges? (It covered its eyes so as not to see what it judged. You don't get to.) | radiant damage, marks, an execute; burns brighter as you fall |
| Over the feet | **The Covered Feet** | Who is spared? (It stood on the ground it would not give up.) | damage reduction, absorbs, healing, cleansing |
| Spread wide | **The Wide Wings** | Who is free? (The two it flew with, and fell with.) | evasion, slows, wide strikes, the Descent |

**Ranks.** As the web grows you rise through five titles, and the statue has one new talk for each (heard once):

| Rank | Reached at | The statue says |
|---|---|---|
| Fallen | the heart (the waking) | the waking speech (PR #226) |
| Watcher | 6 nodes | its name, Caelith, and the Cold Door it opened |
| Ashen Seraph | 13 nodes | the monks, the carving, "make sure there is a second hand on the page" |
| Seraph Unbound | the Seraph Unbound node | "Now you are what I was, before the door. Go on. Open something." |
| The Six-Winged | every node of the web | "All of it. Every feather." It offers a holy weapon of your choosing (below) |

Watcher and Ashen Seraph each give **one free Skill Web point** the first time ("it gets lighter the more of it
you give away"). Unlearning and relearning pays nothing twice.

## On your character (Tokelo, 2026-11-04)

> "the legendary path should give the player a Halo when they start with the web" / "and when they have all
> skills they get the 6 wings aswell with red eyes" / "and a holy weapon of their choosing" (Tokelo)

| When | You get | How |
|---|---|---|
| The web opens (the statue wakes) | **a halo**: a small gold ring over your head that pulses | drawn by code over the sprite (`ui/gaze-fx.js` `playerHalo`) |
| Every skill of the web learned (The Six-Winged) | **six wings** at your back, the statue's grey-and-gold feathers at about half its size, breathing; in front of you when you face away | `playerWings`, the same painter as the statue's |
| the same | **red eyes** | the sprite's own iris colour, recoloured (`palette.eye`), so they follow every pose |
| the same | **a holy weapon of your choosing** | Caelith's `six` talk: five come up out of the fountain, you take one, the rest sink (story key `seraph_holy_weapon`, once) |

Data: `look: { halo: 'heart', wings: 'all', redEyes: 'all' }` on the web; the engine reports it as
`engine.legendaryLook()` (also `getSkillWeb().look`), and the front end only draws it. Unlearn a node and the
wings and red eyes go until you learn it back; the weapon stays yours.

**The holy weapons (Gauge).** Legendary, bound, unsellable, main hand, any class.
Each sits well above Chapter One gear (a common weapon there gives +1 damage), because it costs the whole web.

| Weapon | Hands | Stats | For |
|---|---|---|---|
| Doorward (holy greatsword) | 2 | +6 physical damage, +2 STR, +1 DEF | warriors |
| Spear of the Cold Door | 2 | +5 physical damage, +2 AGI, +5% crit | wardens, spears |
| Twin Pinions (two feather blades) | 1 | +4 physical damage, +3 AGI, +8% crit | rogues (keeps the off hand free) |
| Censer of Ash (holy staff) | 2 | +6 magic damage, +2 INT, +10 Max HP | mages |
| Grey Feather Scythe | 2 | +5 magic damage, +2 physical damage, +15 Max HP | necromancers |

Radiant Fallen skills use magic damage from gear, so a fighter who wants the most from the web takes the Censer or
the Scythe, and a fighter who wants their class kit takes their own weapon. That trade is on purpose.

## The web (Thorne)

20 nodes: the heart, three paths of six (four or five actives each, a capstone at level 14), and Seraph Unbound at
level 18, which needs **all three capstones**. The six first-pass nodes keep their ids, so saves keep them.

```
                         ♥ Fallen Seraphim (free, the waking)
          ┌──────────────────────┼──────────────────────┐
   THE VEILED FACE        THE COVERED FEET          THE WIDE WINGS
   ◆ Fallen Judgement L3  ◆ Halo of Ash L1          ◆ Wingstep L2
   ○ Grace of the Fallen L5  ◆ Feather Ward L4      ◆ Gale of Pinions L5
   ◆ Brand of the Watcher L6 ◆ Mercy of the Fallen L7  ◆ Wings of Sorrow L8 ── also from Halo of Ash
   ◆ Rain of Feathers L9  ○ What Is Evil? L10 ──── links Grace and Wings of Sorrow (the crossroads)
   ○ Burning Grace L11    ◆ Ashen Communion L12     ○ Weightless L11
   ◆ Verdict of Ash L14   ◆ The Door Held Open L14  ◆ Judgement from Above L12
          │                      │                  ◆ Six-Winged Descent L14
          └──────────────────────┼──────────────────────┘
                      ○ Seraph Unbound L18 (needs all three capstones)
```

Grace of the Fallen hangs from Fallen Judgement and Burning Grace links back to it. What Is Evil? is the
crossroads: it links the Feet path to Grace (Face) and to Wings of Sorrow (Wings), so a hybrid can cross over.

**Cost.** The whole web is 16 points (19 nodes, 3 of them free gifts); the cheapest road to Seraph Unbound is 13
(skip Grace, cross through What Is Evil?), less the 2 rank points. Everything from level 10 waits on the trial. At one point a level that is an endgame choice against your class web, which is
the point: a legend costs you something.

### New engine rules (Thorne; data, no names in code)

- **`needs`** on a node: every listed node must be owned before it can be learned, and none of them can be
  unlearned while it is held (refusal `NEEDS_NODES`). `getSkillWeb()` reports it.
- **`ranks`** on a legendary web: `{ name, at | node | all, points?, flag?, say? }`. A rank is reached by nodes owned in
  that web (`at`, the heart counts) or by owning one node. Reaching one announces it, says its line, sets its story
  flag (the statue's talk reads it) and pays `points` once. `getSkillWeb().legendaryWebs[].rank` and `.ranks`.
- **Trait `mods`** (passives that work through data): `damageVsFlags`, `damageTaken` (PR #226), and now
  `damageDealt` (0.1 = +10%) and `lowHpDamage` (`{ below: 0.5, value: 0.25 }`: +25% while under half HP).
- **`heartTraits`** on a legendary web: traits the heart grants while owned.
- **`gifts`** on a legendary web: nodes owned free once the heart is (`gift: true`, fixed like a base node).
- **`trial`** on a legendary web (`{ flag, name }`) and `trial: true` on a node: the node can't be learned until
  the story flag is set (refusal `TRIAL_LOCKED`).
- **`heal_percent`** effect: heal the caster `value` of max HP. A self skill with only calm effects can be cast
  out of a fight, as before.

## The skills (Gauge)

Turn values first; live fights use `liveDescription` (1 turn = 3 s unless a buff has its own seconds in
`realtimeRules.statuses.buffs`). Costs are in your class resource. Damage gets your stat bonus and gear as usual.
Benchmarks: Fireball 10–15 for 1, Holy Smite 15–25 for all, Flurry 3x 6–8 for 3, Assassinate 22–30 (x2 under 30%)
for 4, Evasion 50% for 2 turns for 2. The Fallen skills sit a little above their level's class skills because
they cost a point each and arrive late; Verdict of Ash pays for its size in HP.

### The Veiled Face

| Node | Level | Cost / cd | What it does |
|---|---|---|---|
| Fallen Judgement ◆ (gift) | 3 | 0 / 3 s | 26–34 radiant to one enemy, half of armour ignored, +6 vs Undead and Void |
| Grace of the Fallen ○ | 5 | | +20% damage against Undead and Void |
| Brand of the Watcher ◆ | 6 | 1 / 10 s | 6–9 radiant and [Expose] (+25% damage taken) for 2 turns (6 s) |
| Rain of Feathers ◆ | 9 | 2 / 10 s | 4 hits of 5–7 radiant to one enemy |
| Burning Grace ○ | 11 | | +25% damage while you are under half HP |
| **Verdict of Ash** ◆ capstone | 14 | 4 / 30 s | 30–40 radiant to one enemy, doubled under 30% HP (never an outright kill); costs you 8 HP |

Play: Brand, then Rain or Judgement into the Expose; Verdict to finish. Burning Grace rewards fighting hurt, which
the Feet path can afford.

### The Covered Feet

| Node | Level | Cost / cd | What it does |
|---|---|---|---|
| Halo of Ash ◆ (gift) | 1 | 0 / 20 s | take 30% less damage for 3 turns (9 s live) |
| Feather Ward ◆ | 4 | 1 / 14 s | absorb the next hit; live 12 s, stacks to 2 |
| Mercy of the Fallen ◆ | 7 | 2 / 24 s | heal 25% of max HP and burn away every damage over time |
| What Is Evil? ○ | 10 | | take 10% less damage from everything |
| Ashen Communion ◆ | 12 | 3 / 16 s | 8–12 radiant to every enemy, heal for half the damage dealt |
| **The Door Held Open** ◆ capstone | 14 | all / once per fight | 50% less damage for 3 turns (10 s live), heal 40% of max HP, shed every DoT and debuff |

Healing has no fight cap (Tokelo, 2026-11-04), so the cooldowns are the limit: Mercy every 24 s is about 1% of max
HP a second.

### The Wide Wings

| Node | Level | Cost / cd | What it does |
|---|---|---|---|
| Wingstep ◆ (gift) | 2 | 0 / 14 s | 40% to dodge every attack for 2 turns (6 s) |
| Gale of Pinions ◆ | 5 | 2 / 12 s | 6–9 radiant to every enemy, slowed 50% for 2 turns |
| Wings of Sorrow ◆ | 8 | 3 / 18 s | 8–12 radiant to every enemy, blinded (50% to miss) for 1 turn (4 s live) |
| Weightless ○ | 11 | | +10% damage with everything |
| Judgement from Above ◆ | 12 | 3 / 20 s | 12–16 radiant to every enemy, each [Exposed] +15% for 2 turns |
| **Six-Winged Descent** ◆ capstone | 14 | all / once per fight | 20–28 true damage to every enemy, stunned 1 turn |

### Seraph Unbound

| Node | Level | Needs | What it does |
|---|---|---|---|
| **Seraph Unbound** ○ | 18 | Verdict of Ash, The Door Held Open, Six-Winged Descent | +15% damage and 10% less damage taken |

With every passive the Fallen character deals about +27% (Weightless x Unbound), +52% against Undead and Void,
+58% under half HP, and takes 19% less damage. That is legendary on purpose; Gauge tunes it with `npm run balance`
once Chapter 2 enemies exist.

## Open for later

- Aurevain is code-drawn as a tall knight in white and gold with the seraph's wings and halo; a sprite of its own
  is Saffron's and Quill's call.

- Art: the holy weapons use your current weapon sprite for now; a drawn look for each is Saffron's and Quill's
  call (code-drawn, like everything else).
- The crow (Nahemoth) has no line about the seraph yet. Ashby's suggestion: it distrusts it, "light that bright
  always wants something back".
- Saves from before ranks that already owned all six first-pass nodes show the Watcher title but missed its point.
  It's a few hours of saves; not worth a migration.
