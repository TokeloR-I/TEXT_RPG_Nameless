# ENSO's Last Stand — Fenrir's Heir

**Chapter:** Two — Hrimvald (Norse region)  
**Document type:** Legendary class design and development handoff  
**Prepared:** 13 November 2026  
**Creative direction:** Tokelo Ramasodi  
**Status:** Creative concept selected; mechanical values and unresolved decisions remain **provisional**, pending Gauge's balance review and development scoping.

## 1. Creative intent

**Class name:** Fenrir's Heir  
**Title / epithet (proposed):** Devourer of Sun and Moon  
**Core fantasy:** Inherit the mythical wolf power associated with Fenrir, channeling **Sköll**, the Sun Chaser, or **Hati**, the Moon Chaser. The player chooses their preferred wolf and can switch between them in combat. Staying loyal to one wolf deepens that bond and increases its benefits.

This is **one additive legendary skill web**, not a new starting class and not a replacement for a character's existing identity, stats, customization, or ordinary skill webs. The class must be playable with different starting and hybrid builds. Follow the current legendary-web implementation documented in `docs/design/SKILL_WEB.md`; benchmark against the Fallen Seraphim web.

### Approved creative direction

1. **Sköll** grants sun/light-themed **fire**, offensive power and buffs; requested examples include **Fireball, Firestorm and Firehowl**.
2. **Hati** grants **consuming darkness**: the pull, engulfment and suppression feeling of a gravitational void (Marshall D. Teach's darkness powers were the director's creative reference). Hati also favors **movement speed and defence** through bonding.
3. The player **manually switches** between Sköll and Hati. Switching has a **cooldown** to prevent spam; it does **not** demand a buildup resource.
4. **Time spent in the current stance builds affinity/bond**, with stronger bonuses at higher bond. Favoring one wolf is a supported, worthwhile playstyle; constant swapping must not be mathematically mandatory.
5. **Bond persists between encounters for now.** Exact persistence/decay semantics need Gauge's balancing and implementation decisions. Do not silently make it reset at combat end.
6. **Fenrir** connects the two wolves. Selected skills visibly manifest spectral wolf heads, jaws, silhouettes or enormous wolves. A temporary spectral wolf summon is desired for exploration.
7. Avoid duplicating the Necromancer's Plaguecaller (poison, infections and damage-over-time identity), its undead specializations, or the Elementalist's entire fire kit. Fireball can be a shared fantasy/upgrade, but Sköll must have a distinct wolf-combat identity.

### Not decided

- **Neutral/base Fenrir stance:** The director explicitly raised whether the player should have a neutral stance with neither wolf active. **Unresolved**: do not implement or assume one without a further ruling.
- Exact cooldown length and behavior on stance entry, knockout, saving/loading and respawn.
- Bond cap, accumulation speed, retention/decay, numerical buffs and combat eligibility.
- Actual skill roster, node graph, resource costs, damage values, art assets, questline, unlock conditions and boss trial.

## 2. Stance and bond design

| Aspect | Sköll — Sun | Hati — Moon |
|---|---|---|
| Combat role | Aggressive damage and offensive buffs | Mobility, defence, dark-field control |
| Primary effects | Fire/light, wolf-shaped strikes, fiery zones, howls | Dark attraction, engulfing fields, suppression, tactical repositioning |
| Bond reward | Increasing DPS / offensive damage | Increasing movement speed and defence |
| Visual signature | Amber-gold, red flame, ember wolf | Black/dark-violet, warped shadows, moon wolf |
| Preferred playstyle | Commit to sustained offense | Commit to agile, resilient control |

**Switching:** Manual during combat; no resource cost proposed. **8-second cooldown is an initial design placeholder**, not director-locked. Switching is allowed for tactical flexibility, but remaining in one wolf's aspect should feel rewarding. Existing normal skills should remain usable under the established skill-bar rules; the legendary implementation must define how stance-specific actives are exposed within the existing **six-slot** bar.

**Bond:** Each wolf has its own tracked bond, `skollBond` and `hatiBond` (names illustrative). While its stance is active, that wolf gains bond during meaningful combat activity. The inactive wolf's bond may be retained or decay slowly; this is a **balance proposal**, not a locked rule. Previously accrued bond **must not be erased simply because combat ends**. Saving/loading should preserve bond as part of character progress if persistence remains approved.

### Provisional numerical tuning — Gauge to assess

These figures come from early discussion and are **not authorized balance constants**.

| Bond range | Sköll illustrative bonus | Hati illustrative bonus |
|---|---|---|
| 0–24% | None | None |
| 25–49% | +5% damage | +3% movement speed and defence |
| 50–74% | +10% damage | +6% movement speed and defence |
| 75–99% | +15% damage | +9% movement speed and defence |
| 100% | +20% damage | +12% movement speed and defence |

Early timing concept: 25% bond per approximately 15 seconds of active combat, reaching 100% after **60 seconds**. Proposed inactive-bond decay example: **5 percentage points per 10 seconds**; this is **particularly undecided** because it could punish preferred-stance builds. Gauge should evaluate alternatives, including retaining full stored affinity, decay only during another active stance, and decay only after prolonged inactivity.

**Balance requirements:** Define whether Sköll's percentage applies to all damage or only eligible attacks; distinguish raw speed from move speed and animation/attack speed; specify whether Hati's defence means armor, percentage damage reduction or another existing stat. Check multiplicative scaling with cross-class bonuses. Full-bond buffs must not make short encounters disproportionately weak or force players to artificially prolong fights.

## 3. Proposed skill concepts (not final roster)

### Sköll — The Sun Chaser

| Skill | Proposed behavior | Differentiation |
|---|---|---|
| **Solar Fang** | Fire-wolf projectile or lunging bite that bursts on impact. | Wolf manifestation rather than a plain spell. |
| **Fireball** | Sun-fire projectile; may interact with Sköll bond. | Consider augmenting/shared baseline Elementalist Fireball rather than duplicating it verbatim. |
| **Firestorm** | Sustained fiery zone or volley. | Balance its area coverage against existing Elementalist skills. |
| **Firehowl** | Spectral wolf howl grants an offensive buff. | Class-defining howl and wolf-bond synergy. |
| **Sunfang Rush** | Flaming spectral wolf charges across a line. | Directional attack and distinctive silhouette. |
| **Devour the Sun** | Major manifestation of Sköll and powerful solar attack. | Ultimate visual; exact effect pending. |

### Hati — The Moon Chaser

| Skill | Proposed behavior | Differentiation |
|---|---|---|
| **Black Maw** | Darkness draws nearby enemies into a limited zone. | Attraction, not poison or necromancy. |
| **Moonless Grasp** | Shadow-jaws seize or hinder a target. | Short control window, subject to boss-CC rules. |
| **Abyssal Collapse** | Gathered darkness compresses, then releases force. | Burst/control interaction. |
| **Darkhowl** | Spectral howl imposes a bounded debuff. | Defensive/control counterpart to Firehowl. |
| **Night's Dominion** | Localized consuming dark field affects enemy positioning or actions. | Distinct from generic DoT area spells. |
| **Devour the Moon** | Major manifestation of Hati; implosive dark attack. | Ultimate visual; exact effect pending. |

### Fenrir — Shared inheritance

| Skill | Proposed behavior |
|---|---|
| **Call of the Pack** | Temporarily summon spectral wolves. Presentation may change with Sköll/Hati stance; cap, AI, targeting and lifetime are open. |
| **Gleipnir's Bane** | Spectral binding chains break in a counterattack or breakout effect. |
| **Predator's Instinct** | Passive related to wolf affiliation; **do not** force stance-switch spam through this trait. |
| **Twin Eclipse** | Combined sun/fire and darkness spectacle. Can be available without repeated switching if balancing requires. |
| **Fenrir Unbound** | Enormous spectral Fenrir manifestation for a limited major effect; do not replace player customization permanently. |

The complete skill roster is a pool of **candidates**. Do not build every row automatically. Thorne and Gauge should select a coherent, feasible set, preserve the six-slot skill-bar UX and document input actions/cooldowns. No aerial combat system is needed.

## 4. How to unlock Fenrir's Heir — hidden quest design

**Quest working title:** *The Hunt of Sun and Moon*  
**Proposed location:** Gullstrand Coast → a hidden coastal shrine, *The Wolf's Wake* (working name).  
**Unlock classification:** Optional, discoverable legendary quest; **not** a guaranteed main-story reward, monster loot drop, purchase or starting-class selection.  
**Story prerequisite:** Reach Chapter Two and gain free access to coastal exploration. No specific starting class, alignment, political faction, or choice about the missing six hundred is required.  
**Implementation status:** Proposed design only; actual map placements, flags and quest IDs need approval.

The premise: Gullstrand fishermen speak of two impossible howls, one at the brightest hour and one when the moon disappears. An old carved stone depicts two wolves chasing opposite celestial lights, while a broken chain binds their tracks together. The discovery is **not** another sealed door. It is a physical site of ancient wolf-worship, dangerous to approach and deliberately avoided by the local community.

### Unlock sequence

| Step | Player experience | Completion gate | Design purpose |
|---|---|---|---|
| **1. The First Howl** | Explore Gullstrand; find a weathered wolf-carving and hear an unexplained howl. A fisher or skald can provide an optional clue. | Inspect the carving and obtain the *Verse of the Two Hunters* (quest clue). | Reward curiosity; no quest-marker giveaway before discovery. |
| **2. Two Hunts** | Follow two distinct leads: a sun-scorched coastal marker and a moon-darkened hollow. The player can complete them in either order. | Recover the **Sun Fang** and **Moon Fang** tokens (names provisional) through interaction/combat challenges. | Introduce Sköll and Hati as distinct powers; avoid fetch-only tasks. |
| **3. The Broken Binding** | The two tokens reveal the Wolf's Wake. At the ritual site, a vision of Fenrir's chain fractures the ground. | Survive a self-contained encounter that alternates **solar pressure** and **consuming dark zones**. | Demonstrate both stance fantasies without requiring actual unlocked skills. |
| **4. The Choice of the Hunt** | After the trial, two spectral wolves appear. The player accepts Fenrir's inheritance and selects **Sköll or Hati as their first active bond**. | Set one-time unlock flag `fenrir_heir_awakened` and grant the Fenrir's Heir legendary-web heart. | Provide an explicit, memorable class unlock and first-stance tutorial. |
| **5. The First Bond** | A short safe tutorial shows switching, cooldown indication and bond growth; temporary spectral wolf attacks illustrate the two aspects. | Complete first stance switch and demonstrate bond UI; class remains unlocked even if tutorial is interrupted. | Teach the core system without requiring progression into another quest. |

**The chosen wolf in step 4 is an initial affinity, not a permanent restriction.** Both Sköll and Hati become accessible. If a neutral Fenrir stance is later approved, revise this step to offer that as a genuine third starting state; do not assume the neutral stance exists now.

### Encounter specifics for Thorne and Gauge

- The trial can be delivered with existing 2D ground combat and telegraphed fields: **sun phase** uses visible burning ground and timed attacks; **moon phase** uses bounded attraction or dark zones. No aerial system or complex new movement axis is required.
- A spectral **Chain-Warden** or Fenrir's **Binding Echo** is a *proposed* trial opponent, **not Fenrir himself**, and should not imply the player killed a mythic god or took loot from a corpse.
- Include telegraphs, walkable escape routes and accessibility/readability checks. Pull strength, boss immunity, damage and phase timing are unspecified.
- Failure may reset the trial encounter but **must not permanently lock out** the class; the player can retry. All four starter classes and viable hybrids must be able to finish it.
- The bond mechanic should become active **after** the class heart unlock, not before. A quest tutorial may preview effects without creating lasting, hidden bond counters.
- Save flags should distinguish `fenrir_quest_discovered`, the two trial tokens, `fenrir_trial_cleared`, `fenrir_heir_awakened`, and `fenrir_first_bond_tutorial_done` (illustrative data names; align to established naming conventions). Quest rewards, unlock flags and bonus points must only be granted once.

### Narrative choice boundaries

The unlock tests endurance and understanding of both celestial wolves. It must **not** force the player to be heroic, condemn the dark empire, relinquish the six hundred, swear loyalty to Odin or become Fenrir's literal child. **Fenrir's Heir** denotes a claimed mythic inheritance, not biological parentage. This avoids locking a broadly usable legendary class behind a specific end-state of Chapter Two's unresolved moral choices.

**Continuity safeguards:**

- Do not derail Hrafnholm, Jarl Ragnhild, Torvald, missing Eirik, Hallvard or the six hundred's unresolved fate.
- Do not reveal the protagonist's former identity early.
- Do not turn Fenrir, Sköll or Hati into a mandatory kill/loot boss without narrative approval.
- Do not introduce door motifs as a narrative shortcut.
- The previously proposed **Allfather's Chosen** in `CHAPTER_TWO_LORE.md` §9 is **not automatically removed or superseded in canon** by this draft. The team must reconcile the legendary-class slot with Tokelo before implementing conflicting questlines.

## 5. Implementation handoff

**Narrative and game design:** Confirm class epithet, wolf interpretations, neutral/base stance question, discovery and progression fiction; update Chapter Two lore only after director approval.

**Thorne — mechanics:** Specify one additive legendary web with stance state, cooldown gating, bond state, available skills, save compatibility, and shared Fenrir abilities. Reuse engine primitives where feasible. Do not implement a new flight system. Ensure existing character build and six-slot skill-bar behavior remain intact.

**Gauge — balance:** Own all numerical constants; benchmark Sköll DPS and Hati mobility/survivability against existing peak evolved builds and Fallen Seraphim unlock expectations. Evaluate short/long encounters, bond buildup, persistence, cooldown length, initial stance, summon caps, crowd-control immunity, and hybrid stacking. Report recommended numbers separately before they are treated as final.

**Tally — QA:** Verify cooldown prevents repeated swaps; bonds correctly track each wolf; bonuses apply only under intended conditions; no unintended reset between combats; save/load, death, scene transition, respec and legendary unlock function; no infinite damage, invulnerable Hati builds, permanent wolf summons or boss soft-locks.

**Morrigan / visual team:** Create a consistent three-wolf identity with Sköll's fire-gold, Hati's consuming shadow and Fenrir's monumental spectral silhouette; all manifestations should preserve the customized playable character and directional-animation readability.

### Outstanding director decisions

1. Is there a **neutral Fenrir/base stance** with neither Sköll nor Hati active, or must one wolf always be selected?
2. Does bond remain indefinitely between encounters, or persist with limited decay? **Current directive: persist for now; Gauge to propose balance.**
3. Do stance changes alter the equipped skill slots or only activate/deactivate eligible legendary skills?
4. Does the proposed **Gullstrand / Wolf's Wake** unlock quest replace or coexist with the existing Chapter Two **Allfather's Chosen** proposal? The sequence above is ready for creative review but is not automatically canon.

## 6. Reference material

- `docs/design/SKILL_WEB.md` — additive legendary webs, six-slot bar, prerequisites and scaling.
- `docs/design/FALLEN_SERAPHIM.md` — first chapter's legendary implementation precedent.
- `docs/design/CHAPTER_TWO_LORE.md` — Hrimvald, Chapter Two proposal and Allfather's Chosen slot.
- `docs/design/CHAPTER_TWO_NARRATIVE_REVIEW.md` — confirmed Hrafnholm continuity and Chapter Two corrections.
- Design conversation, 13 November 2026 — Tokelo's Sköll/Hati/Fenrir concept, stance cooldown, bond-based playstyles, and provisional persistence decision.

**Approval boundary:** This document records the creative direction and gives the team a concrete proposal. It does **not** authorize unreviewed story-canon changes or lock specific damage, defence, movement, cooldown or summon values.
