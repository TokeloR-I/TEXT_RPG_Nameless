# ENSO's Last Stand — James / Demonkore and Devil Union

**Prepared:** 17 November 2026  
**Scope:** Chapter Two character background, recruitment, merchant, legendary quest narrative  
**Status:** Director-selected direction with draft dialogue and placement proposals; not implemented.

## 1. James — character background

James is a southern travelling bard met outside Skeldvik's Stormtide Inn. He genuinely enjoys music, instruments, collecting songs, performing for strangers, joking about bad audiences and travelling. He is not a demon masquerading as someone who hates mortal life: the bard is real.

He is also **Demonkore**. The two names belong to one person and one consciousness, not a possessed host. He sells peculiar wares collected from the mortal world and the Underworld, and becomes a homestead merchant after recruitment. The age, cosmic rank, motivation and exact reveal timing are **not decided**. We should not make him omniscient or reveal the player's forgotten imperial identity through him.

**Character tension:** James sincerely likes songs and company, yet knows far more about infernal rites than he admits. He enjoys watching a player choose to pursue a vaguely promised opportunity, but doesn't lecture them about its ultimate prize. He remains a useful bard and merchant whether or not they ever pursue Devil Union.

## 2. CB1 — A Bard Without His Lute

**Current state to change:** James can currently be recruited just by inviting him. Revised **ordered** recruitment gate: **(1)** recover the lute from Sven through **one of three player-chosen paths: buy it back, negotiate it back, or win it back in a simple dice wager**; **(2)** return it to James; **(3)** give James one Mead; **(4)** correctly answer all three music riddles; **(5)** only then can he be invited to the homestead, where his shop becomes available. James **claims** Sven stole the lute, but Sven **won it fairly in Hnefatafl** (a Nordic strategy board game) after James wagered it. The player **does not need to learn or play Hnefatafl**. Wrong riddle answers are retryable; Sven must not require murder.

### Opening dialogue (draft)

**James:** “A room at your homestead? How generous. But I don't follow every passing stranger.”

**Player:** “What will convince you?”

**James:** “First, a small matter of my missing lute. Then perhaps we'll talk.”

### The three music questions (four answers each; **locked until lute + Mead are delivered**)

Question 1 directly references Iron Maiden's *Dance of Death* using the prompt supplied by the director. Its correct answer below **paraphrases** the meaning of the next lyric; the song's exact continuation is not reproduced. Questions 2 and 3 are original music riddles.

**Q1 — Dance of Death (metal song recognition)**

James: “When you're lying in your sleep, when you're lying in your bed, you… What happens next in the song?”

- A. Hear an angel calling from a distant shore.
- **B. Wake from a dream to join the dead in their dance — CORRECT (paraphrase).**
- C. Find a crown beneath your pillow.
- D. Watch the sunrise turn the ocean red.

James on success: “Ha! A fine song. Though I prefer the dancing to the dying.”

**Q2 — Hooves of Iron**

James: “In the heaviest songs, what hammers beneath the guitars like a beast galloping through Hell?”

- A. Harp glissando
- B. Violin vibrato
- **C. Double-bass drum kicks — CORRECT**
- D. Flute trill

James on success: “A heartbeat fit for something rather unpleasant.”

**Q3 — The Silent Screamer**

James: “I have a neck without a head, a body without lungs, and strings that scream when I am played. What am I?”

- A. Horn
- **B. Lute — CORRECT**
- C. Drum
- D. Bell

James on success: “Ah, a musician's answer. Perhaps your ears are worth keeping.”

### Sven and the lute

**Director correction (17 November 2026): Sven is an ordinary NPC, not a thief or a villain.** During a risky game of **Hnefatafl**, a historical Norse strategy game, James wagered his prized lute and **lost**. Sven won it legitimately. James is embarrassed and tells the player it was *stolen*, hoping they will retrieve it for him. **Hnefatafl itself is backstory only, not a compulsory minigame.** This is an early glimpse of James's charming dishonesty—**not** proof Sven cheated or wronged him.

Suggested Sven location: an accessible Skeldvik tavern/harbour spot, not a late-act area. Exact position and visual design are for worldbuilding/development; no supernatural role should be invented for Sven.

**Scene with Sven (draft):**

> **Player:** “James says you stole his lute.”
>
> **Sven:** “Stole it? He put it on the table himself.”
>
> **Player:** “What table?”
>
> **Sven:** “Hnefatafl. He played the king. His king never escaped the board.”

Sven shows the player the lute. The player learns James lied. **The player chooses how to recover the lute**, without playing Hnefatafl:

1. **Buy it back:** Pay Sven a clearly displayed buyback price (Gauge to set). The lute transfers immediately and Sven keeps the Gold.
2. **Negotiate it back:** Offer Sven a reasonable trade or help with a small, concrete favour (exact negotiation terms are for the writers/world team). Sven remains its rightful owner and may agree voluntarily; no automatic free taking.
3. **Gamble it back:** Accept Sven's **optional simple dice minigame**. Winning gets the lute; losing costs the agreed Gold stake. The player can choose another recovery route after losing.

No forced robbery, killing or accusation that Sven stole it. **Only the gamble route can lose wagered Gold.** All three successful routes produce the exact same unique-lute recovery objective and allow the rest of James's recruitment.

**Dice wager — initial implementation proposal:**

1. Player **optionally** chooses **Wager for the lute** after hearing the real story. A clearly displayed Gold stake (candidate **5 Gold**, Gauge to approve) is required before each attempt. This is not required if buying or negotiating instead.
2. Player and Sven each roll **two ordinary six-sided dice**. Show both rolls and their totals on screen; higher total wins. **Ties reroll for free**.
3. **Player wins:** Sven hands over the unique lute, the recovery objective completes, and the player pays no losing stake. Sven remains friendly. No repeated lute reward.
4. **Player loses:** Deduct the displayed stake **once**; Sven retains the lute. Player may earn Gold and **retry** later **or choose to buy/negotiate instead**, with no permanent lockout. If insufficient Gold, disable the wager with an informative message, but leave other recovery paths available.
5. The dice minigame must use a real saved random result, not a fixed scripted win/lose. No additional board-game rulebook or separate Hnefatafl implementation is required.

**Return confrontation with James (draft):**

> **Player:** “Sven didn't steal your lute. You lost it at Hnefatafl.”
>
> **James:** “A cruelly selective account of the evening.”
>
> **Player:** “You lied to me.”
>
> **James:** “I preferred to call it an arrangement of the facts.”

The player may call out James's lie or let it pass. It can affect local dialogue/trust later, **without blocking recruitment**. This is a small, human-scale story that establishes James as funny and slippery long before the Demonkore revelation.

The lute is a **unique quest item**, cannot duplicate on reload, and should not be lost to ordinary selling while the quest is active.

### The Mead demand (mandatory second step)

When the player returns the lute, James thanks them in the most James-like way possible:

> **James:** “Oh, wonderful! My precious lute! To repay your kind deed, I shall allow you to buy me a round of Mead for your hard work.”
>
> **Player:** “*My* hard work?”
>
> **James:** “Naturally. I would hate to deprive you of the pleasure of generosity.”

The player must **purchase one Mead from an accessible existing vendor and give it to James**. Use the game's ordinary inventory and trade systems. The Mead is consumed/removed once when handed over. If the player already owns an eligible Mead, allow handing it in directly; do not force an unnecessary purchase. If Mead is temporarily unavailable, keep the objective active and provide a clear vendor hint. James should not start his music quiz until Mead has been handed over.

### The music quiz, invitation and merchant unlock (mandatory final steps)

After drinking the Mead, James challenges the player to the **three four-choice questions above**. A wrong answer permits a retry without restarting the entire lute quest. When all three are answered correctly:

> **James:** “My lute restored, my thirst quenched, and three fine answers. Perhaps your homestead deserves a bard.”
>
> **Player:** “You'll come, then?”
>
> **James:** “With pleasure. Do try to keep a little Mead in stock.”

**Only then** set the recruitment flag, remove James from Skeldvik, spawn him at the established homestead location and **enable his merchant shop**. Complete CB1 exactly once. His shop is usable once recruited **without needing to pursue Devil Union**. Existing saves that already recruited James require compatibility handling; never delete an existing player's James/shop or silently reset progress.

## 3. Homestead services: bard and merchant

James's interactions should include music, conversation and **Shop**. Ordinary shopping does not require participation in the legendary quest. His stock is unusually infernal but mechanically useful.

| Shop item | Proposed identity | Tuning owner |
|---|---|---|
| Brimstone | Temporary attack damage buff or crafting ingredient | Gauge |
| Sulphur Salts | Temporary fire damage reduction | Gauge |
| Hellfire Ash | Temporary fire-infused attack effect | Gauge |
| Blackened Resin | Temporary defensive protection | Gauge |
| Underworld Residue | Crafting supply; reuse existing demon loot items when present | Loot/economy |
| Binding Grimoire | Absurdly expensive mysterious book, needed to reach demonic contracts | Gauge |

Effects, prices, recipes, refresh rates and stacking rules **not yet approved**. The grimoire's earlier 100,000 Gold example is an illustrative **placeholder**, not a balance target.

## 4. CB2 — A Deal with Demonkore

### The book

The player notices the extraordinary grimoire price in James's shop and can ask about it.

Player: “Why does that book cost more than a house?”

James: “A house keeps the rain out. This might change your life.”

Player: “What does it do?”

James: “Wouldn't you rather find out?”

Player: “I can't afford it.”

James: “Then I may have a small job for you.”

**Do not expose** the Devil Union name, a list of nine demons, full contract rules or James's Demonkore identity during this scene.

### Route A — Pay for the book

**If the player buys the Binding Grimoire**, the enormous price is the cost of the shortcut. **James opens the passage to the Underworld for them immediately. No three-seal requirement.**

James: “You actually bought it. Delightful. A bargain is a bargain.”

Player: “Where do I go?”

James: “Stand back.”

He opens the passage with an understated gesture or a few notes from his lute. His effortless control is a subtle clue. Only at this point does he share the minimum necessary account of a dangerous place below and the possibility of a contract.

### Route B — The “free” book

James offers the opportunity without Gold, but the player must recover **three original Goetic-inspired sigils** from existing accessible maps. Their exact placements remain for Cairn and Tokelo:

1. **Seal of Invocation**
2. **Seal of Dominion**
3. **Seal of Covenant**

Avoid three miniature story campaigns; each is a short exploration discovery or contained encounter. The player can find them in any order. James remains deliberately evasive until **all three** return:

Player: “What are these for?”

James: “Something worth the walk.”

Player: “That's not an answer.”

James: “No. But it's a fine incentive.”

**Only once all three seals are returned** does James explain the essential truth: they grant passage to the Underworld; the book enables a bargain/contract with a powerful entity. He supplies the grimoire without the huge Gold fee and opens the passage. Still no catalogue of nine unions and **no Demonkore reveal**.

James: “Three seals. Well done. I rather underestimated you.”

Player: “Now tell me what I earned.”

James: “A way below, and a chance to return with something greater.”

### First arena — class unlock

Both routes converge at the same Underworld entry. The player fights **five rounds of demon hordes within one arena**, with reasonable pauses, followed by its **ruling demon boss**. The exact enemy compositions and tuning are for development and Gauge. Victory leads to a binding ceremony and the player's **first union contract**, rather than automatically granting a demon on the boss's death.

**LEGENDARY CLASS UNLOCKED: DEVIL UNION**

The additive legendary skill web opens. The player can temporarily merge with their contracted demon. Exact resource, duration, appearance, rank progression and combat actions must be specified separately.

### Nine rulers, no nine-boss prerequisite

The long-term plan is **nine distinct Dominion rulers**, each with a separate arena experience and union identity. **One contract unlocks the class**; the remaining eight are optional progression and broader playstyle choices. A player should be able to master their favorite union without being forced to capture all nine. Do not canonize the previously brainstormed mixed-demonology name list until the director decides.

### James's secret

**James is Demonkore**. The reveal should come later, at a deliberate character moment, not when the grimoire is first seen or the seals are returned. Proposed understated version:

Player: “Where can I find Demonkore?”

James: “You already have.”

Player: “You're joking.”

James: “About my prices? Never.”

The actual reveal timing, nature of Demonkore, moral position and motive are open. James stays a bard and merchant afterward.

## 5. Implementation and QA handoff

- **CB1:** enforce order **Sven recovery (buy OR negotiate OR dice win) → lute returned → Mead handed to James → three music riddles correctly answered → James recruited/shop available**. Incorrect answers retryable. Sven fairly won the lute in Hnefatafl; James falsely calls it stolen. Only optional dice losses cost the displayed stake; ties reroll free; every recovery route grants the lute once and no low-Gold permanent soft-lock. No playable Hnefatafl required. Migrate older recruited saves safely.
- **Merchant:** normal homestead service, no mandatory Devil Union; all effects/items in authoritative data; no duplicated drop definitions or exploitable buffs.
- **CB2 paid route:** buy once; James opens passage immediately, **without seals**.
- **CB2 free route:** collect three seals; James remains vague until all three; obtain grimoire access and passage without Gold payment.
- **Convergence:** both routes unlock identical arena and class; neither route requires both payment and seal collection.
- **Arena:** five waves plus boss; defeat and contract unlock exactly once, with replay/failure and save handling designed before coding.
- **Progression:** nine optional unions total, additive legendary web with distinctive mechanics. Don't require all nine to reach a useful rank.
- **Narrative:** no early protagonist identity reveal; Demonkore's identity must not leak into ordinary merchant copy; Chapter Two politics and six hundred remain independent.

**Suggested owners:** Wick/Ashby narrative and dialogue; Cairn map/NPC placements; Thorne/Wren gameplay; Gauge economy and combat balance; Tally QA; Morrigan visual direction.

**Existing repo baseline:** docs/CHAPTER_TWO.md, src/story/chapter2.js, src/world/chapter2-maps.js, tests/101-james-bard.test.js, docs/design/SKILL_WEB.md.

**Decision boundary:** The core direction (James/Demonkore, bard/merchant, **lute fairly lost in Hnefatafl**, James's false theft story, **player choice to buy, negotiate or gamble for its recovery**, **Gold loss only for a failed optional dice wager**, **Mead demand before music riddles**, recruitment unlocking homestead shop, paid shortcut/free seals, vague promise, first contract and nine optional unions) follows Tokelo's discussion. Dialogue, exact location, negotiation terms, dice stake, item stats, prices, class mechanics and reveal timing are proposals requiring approval.
