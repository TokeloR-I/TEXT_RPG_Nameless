# ENSO's Last Stand — NPC Class Recognition and Reactions

**Status:** Development-ready narrative/system design; implementation and balancing follow studio ownership.  
**Scope:** All chapters, starting with Chapter One named NPCs and extending to Chapter Two.  
**Intent:** Make class choice, acquired powers and publicly witnessed abilities matter in conversation without exposing secret class identities through omniscient dialogue.

## Design pillars

1. **Personality first.** Each NPC interprets the same power differently based on occupation, beliefs, relationships, fears and knowledge. A healer, farmer, priest and infernal merchant should not share one generic response.
2. **Evidence before identification.** NPCs react to what they plausibly know: appearance, open admission, rumors, witnessed powers, or specialist expertise. Do not have villagers automatically identify a secret Devil Union or legendary evolution from a hidden game-state field.
3. **Recognition is not a global reputation penalty.** Dialogue and flavor come first. Shop bans, combat consequences, price modifiers and exclusive rewards are separate future design decisions, not side effects of this system.
4. **Respect player build flexibility.** The Skill Web supports access to skills outside the starting class. Recognize the **equipped/specialized identity** when relevant, but also detect signature abilities actually witnessed. A mage who uses necromantic powers may provoke suspicion without instantly being relabeled a Necromancer.
5. **No spoilers.** Dialogue must not reveal the protagonist's forgotten history, locked chapter revelations, hidden NPC identities or undiscovered legendary paths.
6. **Keep dialogue optional and brief.** Reactions enrich conversations rather than interrupting every transaction or turning every encounter into an exposition dump.

## Recognition model

Each NPC tracks knowledge per player identity/power family at a suitable narrative granularity:

| State | Meaning | Permitted response |
| --- | --- | --- |
| `unknown` | No relevant knowledge or visible evidence | Normal dialogue; no class-specific line |
| `suspects` | Strange appearance, a credible rumor or an ambiguous witnessed ability | Descriptive uncertainty: “I saw shadows around you.” |
| `witnessed` | Directly saw a recognizable ability or transformation | React to the **observed action**, not necessarily its formal class label |
| `identified` | NPC has confirmation or specialist knowledge sufficient to name the power | Exact class/power name and specialist questions are allowed |

An NPC's knowledge can advance but should not inexplicably reset. A false rumor can produce `suspects`, not `identified`. Specific story events may explicitly correct or contradict a rumor. Store facts/events rather than a single opaque “everyone knows class” toggle.

### Evidence sources

- **Declared:** Player chooses to disclose their class or power in dialogue.
- **Witnessed:** The NPC was plausibly present when a signature action occurred in the world or during a story encounter. Combat actions from an unseen map must not count.
- **Narrative report:** A quest/event explicitly spreads a rumor to named people or a local settlement. Reports may be uncertain.
- **Expert recognition:** An informed NPC recognizes a power from evidence another NPC would misunderstand; expertise never grants universal knowledge of the player's unseen activity.
- **Visible transformation:** A publicly active form can be recognized by appearance, subject to NPC expertise. Merely unlocking a form is not public evidence.

## Selection and priority rules

The game may hold a base class, current specialization/evolution, learned cross-class skills and legendary powers simultaneously. Resolve the reaction to the **most relevant known, recent fact** rather than one permanent class tag.

1. **Scene-specific reaction:** NPC has just witnessed a signature ability or form.
2. **Quest-specific reaction:** The current conversation concerns a power the NPC knows.
3. **Known specialization/legendary identity:** Only if identified or declared.
4. **Known base class:** If no higher-priority applicable line exists.
5. **Default:** Normal existing conversation.

If several reactions compete at the same priority, select one via explicit NPC dialogue priority and stable authoring order; never randomize into repeated spam. An NPC may have multiple short authored lines in different conversations, but only one recognition insert per conversation unless a quest explicitly requires a longer exchange. Standard greetings, quest choices and merchant flow remain accessible.

## Suggested data contract (adapt to the existing engine)

Prefer data-driven dialogue variants. The shipped Chapter One content currently lives in `src/story/chapter1.js`; NPC/quest dialogue is evaluated by `src/engine/story.js`. Skill identity and evolution data are available through the player progression and `src/engine/skill-web.js`.

```js
// Illustrative authoring schema, not a required literal API.
{
  npcId: 'shane',
  reactionId: 'shane_necromancy_seen',
  priority: 'witnessed',
  when: {
    knowledge: { powerFamily: 'necromancy', atLeast: 'witnessed' },
    notSeen: 'shane_necromancy_seen'
  },
  lines: [
    ['npc', 'YOU CAN MAKE DEAD PEOPLE WALK?!'],
    ['you', 'Yes.'],
    ['npc', 'CAN YOU MAKE THEM FARM?!']
  ],
  once: true
}
```

Do **not** bolt conditional prose onto every frame or infer class from sprite alone. Integrate with the existing NPC `talk`/`if`/`node` patterns and persistent flags or a small dedicated memory model. The engine should support safe fallback if knowledge data are absent, ensuring old NPCs continue to work unchanged.

### Core state and events

- `player.baseClass` — starting identity (implementation should use the repository's actual field).
- `player.currentSpecialization` — active evolution/legendary path, if applicable.
- `player.observedPowerFamilies` — inferred from specific abilities performed, never from all learned skills.
- `npcKnowledge[npcId][powerFamily]` — current state plus evidence provenance.
- `reactionSeen[npcId][reactionId]` — persistence and anti-repeat.
- Event hooks should capture relevant ability performed, visible transformation, explicit dialogue disclosure and story rumor distribution **only when the NPC is present/eligible**. Use existing world/session proximity and encounter participation where possible; if no reliable witnesses can be inferred, use explicit authored quest witnesses for the first release.

## Initial content pack

Draft dialogue; authored expansion should follow the character bibles and current quest states. Examples do not establish new powers or game mechanics.

| NPC / context | Known event | Example reaction |
| --- | --- | --- |
| Shamefield villager | Witnesses necromantic ability | “Keep those dead things away from my house!” |
| Iona | Witnesses necromancy | “I don't care where your magic comes from. Don't bring corpses into my shop.” |
| Shane | Witnesses necromancy | “YOU CAN MAKE DEAD PEOPLE WALK?! … CAN YOU MAKE THEM FARM?!” |
| Shamefield villager | Sees Devil Union manifestation without identification | “Something moved in your shadow. Tell me I imagined that.” |
| James / Demonkore | Recognizes a disclosed or demonstrated infernal pact, when his own story knowledge allows it | “Interesting. Which one did you bind yourself to?” |
| Hrafnholm local | Witnesses Fenrir's Heir wolf manifestation | “That howl … whose hunt have you joined?” |
| Iona | Witnesses healing magic | “If you can mend wounds, perhaps you can help. But please ask before treating anyone.” |
| Shane | Witnesses Devil Union | “DOES THE DEMON EAT?! I HAVE SOMETHING I'D LIKE TO TEST!” |

**Character guardrails:** Shane remains inquisitive, ridiculous and interested in practical exploitation of magic; retain his normal **“Suffer!”** farewell. Iona remains pragmatic and protective. James's knowledge of infernal contracts must not reveal his Demonkore identity before the established reveal. Norse NPCs should respond using local beliefs and their specific relationship to the wolf legend, not blanket reverence.

## Rollout

### Phase 1 — Named NPCs and narrative facts

- Implement data-driven reactions for **Shane, Iona**, and other Chapter One named NPCs with meaningful class-specific views; start with base class, necromancy and visibly infernal power cases actually present in the game.
- Support `unknown` / `witnessed` / `identified` and per-NPC persistence for known events. Add `suspects` where authored rumors or ambiguity exist.
- Preserve all normal interactions, existing side quest triggers, shopping and Shane's farewell.
- Include multiple player identities in QA, including characters who cross into another class's skill web.

### Phase 2 — Chapter Two and advanced recognition

- Add Norse-specific responses to Fenrir's Heir (Sköll/Hati), local sacred places and legends, but only after the character displays or reveals the power.
- Add Devil Union recognition under the James/Demonkore quest's secrecy timeline and avoid prematurely revealing contract structures.
- Enable authored witnesses/rumors across locations where actually narratively supported.
- Broaden distinctive responses for Fallen Angel, Necromancer evolutions and other implemented paths without inventing new skills.

### Phase 3 — Deeper reactivity, after core system is stable

- Contextual dialogue choices, follow-up conversations and occasional optional class-flavored tasks or merchandise.
- These additions should be positive or alternative pathways where possible; do not deny mandatory quests, core merchants, or plot progression based solely on class.
- Build an authoring checklist for every new notable NPC so class awareness becomes normal production practice.

## Acceptance criteria / QA

1. With the same NPC and same story progress, a recognized class/power produces a distinct line, while an unknown power does not.
2. A hidden/unwitnessed evolution never leaks through dialogue.
3. A witnessed cross-class ability can be recognized without overwriting the player's base class.
4. A non-specialist can express uncertainty; an expert may identify the same observed power where consistent with lore.
5. Reactions do not repeat on every greeting, shop purchase, map re-entry or save/load.
6. Dialogue choices, quest flags, rewards, merchant access, and Shane's **“Suffer!”** farewell still work.
7. Witness detection does not credit NPCs who are elsewhere or absent.
8. Legacy NPCs with no reaction records show normal dialogue and no runtime errors.
9. Test cases cover changed class/specialization, unlocked-but-unused powers, witnessed forms, story rumors, save/reload, and Chapter One to Chapter Two transition.
10. No spoilers for hidden identities or future chapters are triggered through class recognition.

## Studio execution and gap-filling policy

**This handoff authorizes the studio team to research, flesh out, implement, test and iterate on routine narrative and technical gaps without referring them back to the Creative Director.**

For missing lore, inspect the relevant canonical story files, chapter designs, class specifications and existing dialogue; consult research sources when cultural/mythological accuracy is relevant. Write a concise assumption/decision into the relevant design or implementation notes, preserve existing canon, and proceed. For implementation uncertainty, inspect the current story engine, world proximity/events and save format; implement the smallest maintainable extension and validate it. Coordinate among narrative, engineering, QA and balancing roles as needed.

Where two sources truly contradict each other, resolve using the established story decision records and current implemented constraints; document the resolution and continue. Avoid escalating ordinary copywriting, naming, dialogue, side-quest flavor or data-schema detail as an approval gate. Do not assign unvalidated numbers to balance: Gauge and Thorne own those values.

**Not included:** automatic class-based hostility, global morality scores, automatic price penalties, mandatory class-locked quests, or an invisible omniscient NPC knowledge network.
