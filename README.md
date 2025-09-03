# TEXT_RPG_Nameless  
*(working titles: Nameless RPG / ENSO’s Last Stand)*  

🎮 **Retro Text Adventure Game**  

Welcome to our evolving text-based adventure!  
This project is a passion-driven creation of a complex, immersive RPG where your choices — especially your class and its evolution — deeply shape your journey.  

---

## ✨ What We've Built So Far  

### 🎭 Deep Class System  

Four distinct playable classes, each with unique mechanics and detailed progression paths :  

- **Warrior** – Frontline melee fighter using *Momentum*. Evolves into defensive **Vanguards**, frenzied **Berserkers**, or battlefield-controlling **Wardens**.  
- **Necromancer** – Master of death magic & summoning, using *Soul Energy* to raise minions and spread decay.  
- **Rogue** – Agile, evasive, and precise damage dealer, using *Energy* for stealth, critical strikes, or traps.  
- **Mage** – Ranged magic damage dealer and battlefield manipulator, using *Mana* to unleash elemental, illusory, or time-based powers.  

**Class Features:**  
- Multi-Stage Evolution – Named tiers at key level milestones (e.g., *Warrior → Vanguard → Knight → Paladin*).  
- Unique Resources & Mechanics – Each class has its own resource with specific gain/spend rules.  
- Skills & Traits – Every evolution grants new active abilities and passive bonuses.  
- Lore-Rich Progression – Narrative flavor for each stage.  
- Ascended Forms & Hidden Paths – Legendary evolutions like *The Hollow King, Deathlord Eternal*, etc.  

---

### ⚔ Foundational Combat System  

Turn-based combat with speed-based turn order and room-based enemy encounters.  

**Key Features:**  
- **Turn Order** – Based on Speed (*SPD*).  
- **Enemy Encounters** – Triggered per room; player can choose to engage.  
- **Basic Attacks** – All combatants have a fallback attack.  
- **Resource Management** – Spend class resources; feedback if insufficient.  
- **Minion System** – Summons join turn order.  
- **Victory/Defeat Conditions** – Win when enemies die, lose at 0 HP.  

**Skill Examples (Necromancer):**  
- *Grave Bolt* – Damage scaling with corpses.  
- *Raise Skeleton* – Summon a minion with its own turns.  
- *Soul Leech* – Damage + healing.  
- *Channel the Grave* – 0-cost safety valve to gain Soul Energy.  

---

### 💬 Enhanced User Experience  

Features aimed at accessibility and immersion:  

- **Typing Effect** – Retro-style gradual text display.  
- **Separate Class Lore View** – Access via `class_lore` (`cl`).  
- **Flexible Command Parser:**  
  - Accepts aliases (e.g., `gb` for *Grave Bolt*).  
  - Handles extra spaces & varied formats (`use grave bolt #1`, `attack@2`).  
  - Auto-targeting when there’s only one valid target.  
  - Fuzzy Matching for skill names.  
- **Contextual Error Messages** – Show status, valid targets, and tips when a command fails.  

---

## 🚀 How to Play & Test  

1. **Save the Code** – Copy the full source from the provided HTML and save as `adventure_game.html`.  
2. **Open in Browser** – Launch in any modern browser.  
3. **Choose a Class** – Type your chosen base class name (e.g., `warrior`, `necromancer`, `rogue`, `mage`).  
4. **Explore**  
   - `go [direction]` – Move between rooms.  
   - `look` – Re-read room details.  
   - `inventory` / `i` – Check items.  
   - `class_lore` / `cl` – View evolution paths & lore.  

### ⚔ Testing Combat  

- **Start Combat** – From `starting_room`, type `engage` to fight the goblin.  

**Player Actions:**  
- `attack [enemy_number]`  
- `use [skill_name] [enemy_number]`  
- `flee`  

**Necromancer-Specific:**  
- `use grave bolt` – Test auto-target.  
- `use raise skeleton` – Summon ally.  
- `use soul leech` – Damage + heal.  
- `use channel the grave` – Gain Soul Energy.  

**Error Testing:**  
- Misspell skills (`graav bolt`).  
- Use skills without targets in multi-enemy fights.  
- Try resource-locked skills at 0 resource.  

---

## 🚧 Known Limitations / Next Steps  

- **Skill Effects** – Many advanced effects (stun, bleed, DoTs) not yet active.  
- **Status Effects** – Framework in place; needs implementation in turn resolution.  
- **Enemy AI** – Currently basic; no advanced tactics.  
- **Items** – Present in inventory but inactive.  
- **Quests/Events** – No dynamic events yet.  
- **game failing to start** – current perma crash.  
---

💡 *Testing & feedback are crucial. The game is evolving with each iteration — your input will help shape its combat, progression, and world-building.*  
