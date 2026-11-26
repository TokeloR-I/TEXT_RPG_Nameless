# What makes a game a game: the fundamentals of a 2D action RPG (studio research, 2026-11-25)

Tokelo asked the team to go one level deeper than the two feature hunts
([round one](GAME_EXPERIENCE_RESEARCH_2026-11-25.md), PR #298, and [round two](GAME_EXPERIENCE_RESEARCH_ROUND2_2026-11-25.md),
PR #299): not "which feature is missing" but "what makes a video game feel like a real game, especially a 2D action RPG".
This doc sets out the pillars, checks ENSO against each one in the code on `main`, and ranks what to do. Research only:
nothing here is built.

**Left out on purpose** (covered by rounds one and two, or being built now): locked and event-gated classes, the level
curve check, rest respawns, elites and affixes, the world map, tutorials and accessibility, the bestiary and boss
rematches, camera smoothing, the mirror and quest markers. Where a pillar touches one of these, this doc points to it
and moves on.

Sources are the standard design references, not any one game to copy: Steve Swink's *Game Feel*, the MDA framework
(Hunicke, LeBlanc, Zubek), Self-Determination Theory as used in player-motivation research (Ryan, Rigby, Przybylski),
Csikszentmihalyi's flow, Sid Meier's "a series of interesting decisions", Nintendo's four-step level teaching
(kishōtenketsu), and published postmortems and talks on Hades, Hollow Knight, Dark Souls, Hyper Light Drifter, Death's
Door, CrossCode, Diablo and Children of Morta. The comparisons explain *why* a thing works; ENSO uses its own designs.

---

## Part 1: What makes a game a game

Every definition that holds up says the same four things. A game has:

1. **A goal the player cares about** (beat the Warden, find out who you were).
2. **Rules that resist the player** (enemies, stamina, cooldowns, the clock). Without resistance there is no game,
   only a tour.
3. **Choices that matter**: Sid Meier's "series of interesting decisions". A choice is interesting when there is no
   obviously right answer and the result shows.
4. **Feedback**: the game answers every input, at once and clearly, so the player learns.

What turns that into a *great* game is the loop between them: the player tries something, the game answers, the player
gets a little better or a little stronger, and wants to try again. Players don't stay for features. They stay because
they feel **competent** (I'm getting better), **free** (my build, my route, my call) and **connected** (these people and
this place matter). Those three needs are the core of most player-motivation research, and every pillar below serves
one of them.

For a 2D action RPG in particular, the genre is a marriage of two promises:

- **Action**: *my hands* get better. Skill, timing, reading enemies, mastery.
- **RPG**: *my character* gets better. Levels, gear, builds, a story where I matter.

The beloved games keep both promises at once, so a fight is won by hands *and* build. The forgettable ones lean all on
one: an action game with RPG numbers stuck on, or an RPG where the action is just a slow way to press "attack".

---

## Part 2: The ten pillars, and where ENSO stands

Rating: **Strong** (keep doing it), **Partial** (the bones are there, a gap shows), **Weak** (players will feel it).

### 1. A core loop that runs at three speeds — Partial

Great action RPGs run three loops inside each other:

- **30 seconds**: the fight. Read, dodge, hit, win.
- **5 to 20 minutes**: the outing. Leave safety, clear a stretch, find something, come back stronger.
- **Hours**: the arc. New region, new boss, new build, new chapter of the story.

Each loop must *feed the next*: fights give the loot and XP that change the next outing; outings unlock the next part of
the arc. Hades is the clearest example: every room feeds the run, every run feeds the house.

**ENSO now.** The 30-second loop is strong (real-time combat with dodge, guard, parry, combos, telegraphs) and the
hour loop is strong (two chapters of story, bosses, legendary unlocks). The **middle loop is thin**: after a map is
cleared there is little reason to go out again (only 2 of 54 groups respawn, `gameRules.restRespawns`), and cooking,
farming and smithing sit beside the fighting rather than feeding it. Round two's respawns + elites + loot (#2, #3) are
exactly the fix for this loop, so they matter more than their own ranking suggests.

**Gap left for this doc:** tying the side systems *into* the outing. A meal before a boss is good; a farm or forge that
asks for something only found out in the world (a boss part, an elite drop, a rare forage) pulls the player back out.

### 2. Readable, honest feedback — Strong

Swink's rule: every input gets an answer within a frame or two, and the player can always tell what hurt them and why.

**ENSO now.** Telegraphs flash, hits stop, crits are gold, sound exists since PR #298, enemy conditions show. Nothing
new to add here beyond what round one listed (camera smoothing is in progress).

### 3. Mastery with a payoff — Weak

Players feel **competent** when skill is visibly rewarded. Every beloved action game has a "punish window": you read
the enemy, take a risk, and get paid for it. Dark Souls pays a parry with a riposte; Hollow Knight pays a pogo with
safety; Hades pays a perfect dodge with a free counter; many games slow time for a frame on a perfect dodge.
This is the single biggest thing that makes a fight feel like *a game you are good at* instead of a damage race.

**ENSO now.**
- A parry inside the 160 ms window **only staggers** the enemy for 900 ms (`actionRules.parry`, `src/action/sim.js:298`).
  There is no riposte, no bonus damage on a staggered enemy, no reward for the hardest skill in the game beyond
  "they stop for a moment".
- A dodge has i-frames (200 ms), but there is **no perfect-dodge reward**: dodging at the last instant is worth the
  same as dodging early.
- An opener from behind exists (`openerConeDeg`), which is good, but only for the first hit.
- Nothing measures or celebrates skill: no "no damage taken" note, no fight rating, no boss best time.

**Why it matters for ENSO in particular:** Tokelo wants bosses Dark Souls hard. Hard bosses only feel *fair* when the
player can see a way to get better. Without a payoff for parrying and dodging well, a hard boss reads as a wall of HP
and damage, which is exactly the "2-move tank" complaint from the Lucifero rework.

### 4. Enemies that teach, then test — Partial

Good enemy design is a vocabulary: each enemy is a small question ("can you dodge a lunge?"), and the game introduces
it safely, then mixes it with others, then twists it. Nintendo calls this introduce, develop, twist, conclude.
Mini-bosses are the "twist": the familiar enemy, one size up, with one new trick.

**ENSO now.** 42 live enemy profiles with group roles (swarm, circle, pincer, ranged-keeps-distance, flank), which is a
good base. But:

- **Most enemies have 1 or 2 attacks** (`actionRules.enemies`): 5 have one, 28 have two (of 42).
- The **mid-tier "tier" enemies** (Draugr Champion, Grave Foreman, Skuli Tally-Hand, Old Greymane, Mound Bride, Oath
  Sergeant) **also have only 2 attacks**, so they play like a large ordinary enemy rather than a mini-boss. Only the
  Peat King (3) and the full bosses (4 to 5) have a real moveset.
- Only 2 profiles flee at low HP (rat, goblin). Round two #12 covers behaviour; this doc is about **moveset depth**.

### 5. A challenge curve with rhythm — Partial

Flow theory: challenge should rise with skill, and it should **breathe**: tense, release, tense harder. The best
action RPGs alternate fights, quiet exploration, story and a boss, and they put the hardest moment right before a safe
one (bonfire, shop, story beat).

**ENSO now.** Boss rage and the Dark Souls target are in place for chapter 2 onward (PR #271), and the Warden sits at
~50 to 63% per class (PR #293). Between bosses the pressure is low by design: 20% HP back after every fight
(`gameRules.postFightHealPct`), healing items with no cooldown or cap (Tokelo's rule, kept), and death costs nothing.
That is fine *if* the ordinary fights in between are the tense part, which brings it back to pillars 3 and 4: the
pressure has to come from what enemies do, not from scarcity. Nothing here suggests a healing cap.

### 6. Progression you can feel, often — Partial

Two kinds of growth keep a player going: **power** (bigger numbers) and **options** (new verbs, new builds). Players
want something new on a steady beat; in strong action RPGs that beat is roughly every 10 to 20 minutes early on,
stretching later. A level-up should be a *moment*, not a log line.

**ENSO now, worked out from the data** (*estimate*, not a playthrough):

| Level | XP needed (total) | Reached around |
|---|---|---|
| 2 | 100 | the road wolf pack, early chapter 1 |
| 3 | 250 | Shamefield, branch choice opens |
| 4 | 475 | before the Warden (mainline gives 746) |
| 5 | 812 | only with the six optional favours |

So the whole of chapter 1 gives **3 to 4 level-ups**, each worth **1 Skill Web point** (`skillWeb.rules.pointsPerLevel: 1`).
Every class starts with 3 or 4 skills, and the branch's first stage adds one at level 3. That leaves long stretches
of chapter 1 (Shamefield to the Warden) where the player's toolkit does not change. Weapons from Bragg and the
Shamefield thanks, food and armour fill part of the gap, which is good, but the Skill Web, the game's best system, is
mostly locked during the first chapter people play.

The level-up itself is two text lines plus a sound (`progression.js:24`), and choosing the web node happens later in a
menu. Round two #14 lists a level-up burst; the bigger point is **linking the reward to the moment**.

### 7. A world that rewards curiosity — Partial

Great 2D worlds are readable (you remember where things are by landmark), layered (a locked door you will come back
to) and generous (looking around pays). Souls-likes add the **shortcut**: the door that opens from the other side and
loops you back to safety, which makes a map feel designed and makes going back out feel good.

**ENSO now.** Strong on reading: 216 inspect points, environmental lore, every area a painted scene. Round two #7 covers
breakables, caches and "found 3 of 5". What no round has covered: **shortcuts and ability gates**. Black Flight is the
only traversal power, and no map has a path that opens later because of what the player can now do (a Fenrir leap,
a seraph light that burns away thorns, a necromancer bone bridge).

### 8. Story where the player matters — Partial

The RPG promise is "my choices change things". Players forgive small choices if the world *remembers* them. The best
2D RPGs make few choices, but each one shows up again: an NPC who is there or not, a line that mentions it, a door
open or shut. Mystery is the other engine: a question big enough to pull the player through (ENSO has one: the Keeping).

**ENSO now.** The writing base is strong: a lore bible, two chapters, 187 + 324 dialogue choice points, barks that react
to class and quests. Real forks exist: the story route or the village route north, protect or pursue at the festival
raid (C1-N03), the Thing's three positions. But quest objectives lean on talk-and-walk: across both chapters about
**70% of objectives are talk, inspect, story or enter**, and about 25% are fights, which is a lot of walking for an
action game. And it is not clear the forks are *remembered*: they set flags, but few later scenes or barks read them.

### 9. A clear identity — Partial

Beloved games can be summed up in one sentence, and every system serves that sentence. Hades: "escape hell, and every
death makes you and the family stronger". Hollow Knight: "a lonely, beautiful ruin you master by learning it".
Forgettable games are often *broad*: many systems, none deep.

**ENSO now.** ENSO has a strong sentence hiding in it: *"a nameless survivor of a broken kingdom fights through real
cultures' myths and earns their legendary powers."* But it also has cooking, farming, livestock, beer, a bard, a demon
union, a skill web for every class and five legendary webs, two chapters, and lots of new systems each week. That
breadth is a strength only if the core fight stays the deepest thing in the game. Right now the side systems are deeper
than the enemies (pillar 4) and better rewarded than skilled play (pillar 3).

### 10. A first hour that sells the game — Unknown (needs measuring)

Most players decide in the first hour, often in the first 10 minutes, whether to keep going. The beloved games front-
load their best: Hades gives a full run and a boss in 20 minutes; Hyper Light Drifter shows a giant set-piece before
it says a word. The rule of thumb: **a fight in the first 5 minutes, a new power in the first 15, a "wow" moment and a
boss-sized threat in the first 60.**

**ENSO now.** The opening is atmospheric (cellar, glowing hands, an inscription) and the first fight (rust rats on the
grounds) comes within a few minutes. Level 2 arrives at the road wolf pack. After that, nobody has timed it: how long
until the first new skill, the first weapon, the first "wow"? No QA report measures the first hour.

---

## Part 3: What separates beloved action RPGs from forgettable ones

Across the postmortems and reviews, the same differences come up again and again:

| Beloved | Forgettable |
|---|---|
| Fights you get *better* at (punish windows, readable patterns) | Fights you only out-level |
| Enemies with personality: each one a small puzzle | Enemies as HP bags in different colours |
| Bosses people remember by name and by move | Bosses with more HP and bigger hits |
| A reward on a steady beat, and every level-up feels like an event | Long flat stretches, numbers in a log |
| A world that loops back on itself and remembers you | A line of maps you never revisit |
| Choices that come back later | Choices that only change one line |
| One clear fantasy, with every system serving it | Many systems, none deep |
| A first hour that shows the best of the game | A slow start that "gets good later" |

ENSO is clearly on the beloved side for atmosphere, lore, class fantasy and the Skill Web's freedom. The work left is
in the middle rows: mastery payoff, enemy depth, reward rhythm and remembered choices.

---

## Part 4: Ranked recommendations for Tokelo to approve

Impact: how much a player would notice. Effort: S (a day or two), M (a PR of a few days), L (several PRs). Nothing here
nerfs a class or caps healing.

| # | Recommendation | Pillar | Impact | Effort | Owner |
|---|---|---|---|---|---|
| 1 | **Pay off skilled play.** A parry opens a short **riposte** window (the next hit on a staggered enemy crits or deals bonus damage, with its own sound and hit-stop). A **perfect dodge** (dodging in the last ~100 ms before a hit lands) gives a brief slow-motion and a free empowered attack. Opener from behind also applies to staggered enemies. Numbers from Gauge. | 3 | very high | S–M | Thorne, Gauge, Rook |
| 2 | **Give mini-bosses a real moveset.** Every "tier" enemy (Draugr Champion, Grave Foreman, Skuli, Old Greymane, Mound Bride, Oath Sergeant, Hungry Wolf) gets a third and fourth move, including one signature attack with a big telegraph and a punish window after it, and one change at 50% HP. | 4 | high | M | Thorne, Hawk, Gauge |
| 3 | **A third move for common enemies.** Each ordinary type gets one rarer "tell" attack that teaches a lesson (a delayed swing that catches early dodgers, a grab that must be dodged not guarded, an unblockable flash). Introduce each one alone before it appears in a mixed group. | 4 | high | M | Thorne, Hawk, Moss |
| 4 | **Time the first hour.** Tally plays the first 60 minutes per class and logs: first fight, first level, first new skill, first weapon, first boss-sized threat, first "wow", longest stretch with nothing new. Every later pick in this list is tuned against that report. | 10, 6 | high | S | Tally |
| 5 | **A reward on a steady beat.** From the first-hour report, place something new every 10–20 minutes in chapter 1 (a node, a weapon, a recipe that matters in fights, a keepsake). Options for Gauge: two web points at levels 2–5, or small web nodes granted by main quests. Make the level-up a moment: burst, slow-motion, and the web opens straight to the nodes you can now buy. | 6 | high | S–M | Gauge, Pixie, Quill |
| 6 | **Fewer walks, more set-pieces.** Turn some talk-and-walk objectives in both chapters into play: an ambush on the way back, a chase, a defend-the-cart, a timed escape, a duel. Target: no more than two non-combat objectives in a row on the main path. Uses existing maps only (the area-art rule stays). | 5, 8 | high | M | Moss, Thorne, Ashby |
| 7 | **Make choices come back.** List every fork already in chapters 1 and 2 (route north, protect or pursue, the Thing, favours done) and give each a later echo: an NPC present or absent, a bark, a line in chapter 2, a different reward. A Journal page "What you chose" shows them. | 8 | med–high | M | Ashby, Wick |
| 8 | **Feed the outing.** Each side system asks for one thing found only out in the world: a forge upgrade needs a mini-boss part, a top recipe needs an elite drop, a farm seed comes from a forage spot behind a fight. Pairs with round two #2 and #3. | 1 | med–high | S–M | Ledger, Thorne |
| 9 | **Shortcuts and ability gates.** In existing maps, add a few one-way shortcuts back to a hearth, and a handful of spots that open later with a power the player earns (Fenrir leap, seraph light, bone bridge, Black Flight perch). No new areas. | 7 | med | M | Moss, Rook |
| 10 | **Celebrate mastery.** After a boss: time, damage taken, parries landed, and a "flawless" mark; a quiet per-boss best on the bestiary page from round two #8. | 3 | med | S | Pixie |
| 11 | **Write down the game's one sentence and three pillars.** Every new feature is checked against them, and new side systems wait until combat depth (picks 1–3) has caught up. | 9 | high (long term) | S | Tokelo, Juniper |

### Recommended order

1. **#4 first** (it is cheap and tells us where the flat stretches really are).
2. **#1** right after: the biggest single change to how fights feel, and what makes "Dark Souls hard" feel fair.
3. **#2 + #3** together as an enemy-depth pass, chapter 1 first.
4. **#5 + #6**, tuned against the first-hour report.
5. **#7, #8, #9, #10** as the next round.

**Needs Tokelo's call before anyone builds it:** #11 (the sentence and pillars are Tokelo's to write; the team can draft
options), and in #5 whether more web points early is wanted or whether the Skill Web should stay slow and precious.

## Notes

- Music is still the missing piece of audio identity (round one #16); it stays Tokelo's creative call and is not
  ranked again here.
- #1 adds damage for skilled players; it does not change any class's base numbers. Gauge sets the riposte and perfect
  dodge values and checks them with the balance bot.
- Any new item or reward fields follow the save rules in `AGENTS.md` (migrations, `reconcileSave()`,
  `CONTENT_REVISION`).
