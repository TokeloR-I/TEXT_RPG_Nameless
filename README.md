# TEXT_RPG_Nameless  
*(Working titles: Nameless RPG / ENSO’s Last Stand)*  

🎮 **Retro Text Adventure Game**  

Welcome to our evolving text-based adventure!  
This project is a passion-driven creation of a complex, immersive RPG where your choices—especially your class and its evolution—deeply shape your journey.  

---

## ✨ What We've Built So Far  

### 🗺️ Expanded World & First Dungeon  
- **New Areas:** Players can now explore the *Hallway of Chains* to the north or venture into the *Collapsed Wine Cellar* to the east, containing tunnels, a ritual chamber, and the Warden's Roost.  
- **New Enemies:** Shackled Ghouls, Mire Lurkers, and Cult Acolytes provide varied medium-weak challenges.  
- **First Boss Encounter:** The eastern path ends in a fight with **The Crow-Touched Warden**, a starter boss with unique attacks.  

### 💰 Adaptive Loot System  
- **Class-Specific Items:** Generic items transform based on class (e.g., "Ritual Dagger" → "Bone Etching Tool" for Necromancer).  
- **Unique Boss Rewards:** Bosses drop class-specific crafting materials.  

### 🎭 Deep Class System  
Four distinct playable classes with unique mechanics and progression:  

- **Warrior** – Frontline melee fighter using *Momentum*.  
- **Necromancer** – Master of death magic & summoning, using *Soul Energy*.  
- **Rogue** – Agile and evasive precision fighter, using *Energy*.  
- **Mage** – Ranged magic damage dealer and manipulator, using *Mana*.  

**Class Features:**  
- *Legendary Class Testing:* Cheat `become_hollow_king` unlocks the Hollow King with unique skills and a resurrection passive.  
- *Unique Resources & Mechanics:* Each class uses a distinct resource system.  
- *Skills & Traits:* New active and passive abilities.  

### ⚔ Foundational Combat System  
- **Turn Order:** Based on *Speed (SPD)*.  
- **Enemy Encounters:** Triggered per room; player chooses to engage.  
- **Resource Management:** Spend resources with feedback on insufficiency.  
- **Minion System:** Summons join turn order.  
- **Victory/Defeat:** Win when enemies die; lose at 0 HP.  

### 💬 Enhanced User Experience  
- **Typing Effect:** Retro-style gradual text.  
- **Skippable Text:** “Skip >>” button displays messages instantly.  
- **Flexible Command Parser:**  
  - Accepts aliases (`gb` for *Grave Bolt*).  
  - Handles spacing/format variety (`go east`, `take item`).  
  - Provides contextual error messages.  

---

## 🚀 How to Play & Test  

1. Save the files: `index.html`, `style.css`, and `game.js`.  
2. Open `index.html` in any modern browser.  
3. Choose a class (e.g., `warrior`, `necromancer`).  
4. Explore:  
   - `go [direction]` → Move between rooms (try `go east` for new content).  
   - `look` → Re-read room details.  
   - `inventory` / `i` → Check items.  

---

## 🧪 Cheats & Debug Commands  

- `become_hollow_king` → Transforms you into the Hollow King.  
- `add_xp [number]` → Grants XP (e.g., `add_xp 100`).  

### ⚔ Testing Combat  
- **Start Combat:** Enter a room with enemies and type `engage`.  
- **Player Actions:**  
  - `attack [enemy_number]`  
  - `use [skill_name] [enemy_number]`  
  - `flee`  

**Hollow King Specifics:**  
- `use unmake 1` → Test removal skill.  
- `attack 1` → Test *Void Rend* and Hollow Will generation.  

---

## 🚧 Known Limitations / Next Steps  

- ✅ Fixed: Game failing to start.  
- **Skill Effects:** Many effects (stun, bleed, DoTs) not yet active; some Hollow King effects functional.  
- **Enemy AI:** Currently basic.  
- **Items:** Provide passive benefits; most lack active “use” effects.  
- **Class Evolution:** Data structure in place, system needs full implementation.  

---

💡 *Testing & feedback are crucial.* The game evolves with each iteration—your input shapes combat, progression, and world-building.  
