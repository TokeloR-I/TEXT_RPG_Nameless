// --- Game Elements ---
        const gameOutput = document.getElementById('game-output');
        const gameInput = document.getElementById('game-input');
        const submitButton = document.getElementById('submit-button');
        const playerHudElement = document.getElementById('player-hud'); //HUD element reference

        // --- Game World Data ---
        const rooms = {
            'starting_room': {
                description: "You awaken in a damp, musty cellar. A faint light filters through a crack in the ceiling. Crows circle above the broken ceiling. You don’t remember how you got here… but your hands glow faintly with forbidden power.",
                exits: {
                    'north': 'hallway_of_chains',
                    'east': 'collapsed_wine_cellar'
                },
                enemies: [],
                items: ['Grigamba stone']
            },
            'hallway_of_chains': {
                description: "A narrow hallway carved from stone, dripping with condensation. Broken chains hang from the walls, as if something was once bound here. The air hums faintly, resonating with your glowing hands.",
                exits: { 'south': 'starting_room' },
                enemies: ['shackled_ghoul', 'shackled_ghoul', 'rust_rat'],
                items: ['Cracked Lantern', 'Rusted Key', 'Moldy Bread']
            },
            'collapsed_wine_cellar': {
                description: "A collapsed wine cellar, shelves overturned, shattered bottles across the floor. The smell of sour grapes and vinegar fills the air. The crunch of glass echoes underfoot, alerting nearby foes.",
                exits: {
                    'west': 'starting_room',
                    'east': 'cellar_tunnels' // New exit deeper east
                },
                enemies: ['cellar_vermin', 'cellar_vermin', 'drunken_shade'],
                items: ['Half-full Wine Bottle', 'Bandages', 'Shard of Glass']
            },
            // NEW EASTERN PATH
            'cellar_tunnels': {
                description: "You step deeper into the cellar tunnels. The air is thicker here, filled with mildew. Wooden support beams creak under unseen weight. Rats scurry along the edges, watching.",
                exits: {
                    'west': 'collapsed_wine_cellar',
                    'east': 'stagnant_chamber'
                },
                enemies: ['bone_gnawer', 'bone_gnawer', 'shackled_ghoul'],
                items: ['Pouch of Salt', 'Leather Strap', 'Small Coin Purse']
            },
            'stagnant_chamber': {
                description: "A wide chamber where collapsed wine barrels have spilled into stagnant pools. The stench of rot is overwhelming. Something stirs in the water.",
                exits: {
                    'west': 'cellar_tunnels',
                    'east': 'ritual_chamber'
                },
                enemies: ['mire_lurker', 'mire_lurker', 'drunken_shade'],
                items: ['Oil-soaked Rag', 'Wooden Shield', 'Strange Coin']
            },
            'ritual_chamber': {
                description: "This chamber feels different. The stone walls are smoother, less natural — carved deliberately. A faint chanting echoes from beyond a sealed archway at the far side. A glowing sigil is etched into the floor, faintly pulsing. This must be close to the heart of the cellar.",
                exits: {
                    'west': 'stagnant_chamber',
                    'east': 'wardens_roost' // Leads to the boss
                },
                enemies: ['cult_acolyte', 'cult_acolyte', 'shackled_ghoul_stronger'],
                items: ['Ritual Dagger', 'Healing Herb Bundle', 'Crow Feather Charm']
            },
            'wardens_roost': {
                description: "The air is still here. Broken statues line the walls, each depicting chained prisoners with crow masks. A tall armored figure stands in the center, his helm crowned with feathers. His eyes glow faint red, and his voice croaks like a raven.",
                exits: {
                    // No exits until the boss is defeated
                },
                enemies: ['crow_touched_warden'],
                items: []
            },
            // --- These rooms are now disconnected but kept for potential future use ---
            'wooden_door_room': {
                description: "You stand before a massive, reinforced wooden door. It looks incredibly sturdy. There's nothing else here.",
                exits: {
                    'south': 'starting_room'
                },
                items: []
            },
            'dark_passage': {
                description: "The passage is cold and smells of stale air. You hear dripping water somewhere ahead.",
                exits: {
                    'west': 'starting_room',
                    'east': 'cavern_entrance'
                },
                enemies: ['hungry_wolf', 'weak_goblin'],
                items: []
            },
            'cavern_entrance': {
                description: "The dark passage opens into a small, echoing cavern. A faint, glowing mushroom illuminates the damp walls. There's a shimmering pool of water in the center.",
                exits: {
                    'west': 'dark_passage'
                },
                items: ['glowing mushroom']
            }
        };
        
        // --- Adaptive Loot Definitions ---
        const adaptiveLoot = {
            'Ritual Dagger': {
                'warrior': 'Reinforced Knife',
                'mage': 'Blood Ink Quill',
                'rogue': 'Ritual Dagger',
                'necromancer': 'Bone Etching Tool'
            }
        };

        const bossLoot = {
            'crow_touched_warden': {
                universal: ['Minor Essence of the Forbidden', 'Crow Sigil Key', 'Pile of Feathers'],
                classSpecific: {
                    'warrior': 'Warden’s Rusted Halberd Fragment',
                    'mage': 'Warden’s Sigil of Crows',
                    'rogue': 'Feathered Dagger Hilt',
                    'necromancer': 'Crow-Bone Relic'
                }
            }
        };

        // --- Enemy Definitions ---
        const enemies = {
                'James_Newton': {
                name: 'James Newton',
                hp: 666,
                maxHp: 666,
                atk: 20, // Tuned down for balance
                def: 66,  // Tuned down for balance
                spd: 20,
                critChance: 0.6,
                critMultiplier: 1.5,
                specialFlags: [],
                skills: [{ name: 'Heavy Slash', description: 'Deals 20-30 damage.', base_damage: [20, 30], target: 'player', damage_type: 'physical' }]
            },
            'weak_goblin': {
                name: 'Weak Goblin',
                hp: 30,
                maxHp: 30,
                atk: 5,
                def: 2,
                spd: 8,
                critChance: 0.1,
                critMultiplier: 1.5,
                resistances: [],
                specialFlags: [],
                skills: [{ name: 'Goblin Slash', description: 'Deals 5-8 damage.', base_damage: [5, 8], target: 'player', damage_type: 'physical' }]
            },
            'hungry_wolf': {
                name: 'Hungry Wolf',
                hp: 40,
                maxHp: 40,
                atk: 7,
                def: 3,
                spd: 12,
                critChance: 0.2,
                critMultiplier: 1.7,
                resistances: [],
                specialFlags: [],
                skills: [{ name: 'Bite', description: 'Deals 7-10 damage.', base_damage: [7, 10], target: 'player', damage_type: 'physical' }]
            },
            'shackled_ghoul': {
                name: 'Shackled Ghoul',
                hp: 20,
                maxHp: 20,
                atk: 8,
                def: 1,
                spd: 14,
                critChance: 0.15,
                critMultiplier: 1.6,
                resistances: [],
                specialFlags: ['undead', 'weak_to_light'],
                skills: [{ name: 'Frenzied Bite', description: 'A rapid, vicious bite.', base_damage: [6, 10], target: 'player', damage_type: 'physical' }]
            },
            'rust_rat': {
                name: 'Rust Rat',
                hp: 15,
                maxHp: 15,
                atk: 4,
                def: 2,
                spd: 16,
                critChance: 0.1,
                critMultiplier: 1.5,
                resistances: [],
                specialFlags: [],
                skills: [{ name: 'Corroding Bite', description: 'Deals minor damage and dulls your weapon.', base_damage: [3, 5], target: 'player', damage_type: 'physical' }]
            },
            'cellar_vermin': {
                name: 'Cellar Vermin',
                hp: 25,
                maxHp: 25,
                atk: 6,
                def: 1,
                spd: 13,
                critChance: 0.1,
                critMultiplier: 1.5,
                resistances: [],
                specialFlags: [],
                skills: [{ name: 'Quick Swipe', description: 'Lashes out with filthy claws.', base_damage: [5, 8], target: 'player', damage_type: 'physical' }]
            },
            'drunken_shade': {
                name: 'Drunken Shade',
                hp: 30,
                maxHp: 30,
                atk: 2,
                def: 4,
                spd: 7,
                critChance: 0.05,
                critMultiplier: 1.5,
                resistances: ['physical'],
                specialFlags: ['undead'],
                skills: [{ name: 'Disorienting Whisper', description: 'Slurred whispers cause confusion, dealing minor psychic damage.', base_damage: [1, 3], target: 'player', damage_type: 'magic' }]
            },
            'bone_gnawer': {
                name: 'Bone Gnawer',
                hp: 18, maxHp: 18, atk: 6, def: 3, spd: 15,
                critChance: 0.1, critMultiplier: 1.5,
                specialFlags: ['undead'],
                skills: [{ name: 'Ankle Snap', base_damage: [6, 9] }]
            },
            'mire_lurker': {
                name: 'Mire Lurker',
                hp: 35, maxHp: 35, atk: 5, def: 2, spd: 6,
                critChance: 0.05, critMultiplier: 1.5,
                skills: [{ name: 'Corrosive Spit', base_damage: [4, 7] }]
            },
            'cult_acolyte': {
                name: 'Cult Acolyte',
                hp: 22, maxHp: 22, atk: 7, def: 1, spd: 9,
                critChance: 0.1, critMultiplier: 1.6,
                skills: [{ name: 'Hexing Blade', base_damage: [7, 11] }]
            },
            'shackled_ghoul_stronger': {
                name: 'Ritual-Scarred Ghoul',
                hp: 40, maxHp: 40, atk: 10, def: 3, spd: 12,
                critChance: 0.15, critMultiplier: 1.6,
                specialFlags: ['undead'],
                skills: [{ name: 'Frenzied Bite', base_damage: [9, 14] }]
            },
            'crow_touched_warden': {
                name: 'The Crow-Touched Warden',
                hp: 150, maxHp: 150, atk: 15, def: 8, spd: 10,
                critChance: 0.2, critMultiplier: 1.7,
                specialFlags: ['boss'],
                skills: [
                    { name: 'Halberd Sweep', base_damage: [15, 20] },
                    { name: 'Summon Crows', base_damage: [5, 8] },
                    { name: 'Chain Lock', base_damage: [10, 12] }
                ]
            }
        };

        // --- Minion Definitions (New) ---
        const minionDefinitions = {
            'skeleton': {
                name: 'Skeleton',
                hp: 15,
                maxHp: 15,
                atk: 5,
                def: 1,
                spd: 7,
                critChance: 0.05,
                critMultiplier: 1.5,
                resistances: [],
                specialFlags: ['undead'],
                skills: [{ name: 'Bone Club', description: 'Deals 5-7 damage.', base_damage: [5, 7], target: 'enemy_single', damage_type: 'physical' }]
            },
            'ghoul': {
                name: 'Ghoul',
                hp: 25,
                maxHp: 25,
                atk: 9,
                def: 2,
                spd: 10,
                critChance: 0.1,
                critMultiplier: 1.7,
                resistances: [],
                specialFlags: ['undead'],
                skills: [{ name: 'Claw Attack', description: 'Deals 9-12 damage.', base_damage: [9, 12], target: 'enemy_single', damage_type: 'physical' }]
            }
        };


        // --- Skill Definitions ---
        const skillDefinitions = {
            'Basic Attack': { description: 'A standard attack.', cost: 0, resource: 'N/A', base_damage: [5, 8], target: 'enemy_single', damage_type: 'physical' },
            'Slash': { description: 'Deal 8–12 damage to a single enemy.', cost: 0, resource: 'Momentum', base_damage: [8, 12], target: 'enemy_single', damage_type: 'physical' },
            'Guard': { description: 'Reduce incoming damage by 25% next turn.', cost: 0, resource: 'Momentum', effects: [{ type: 'damage_reduction', value: 0.25, duration: 1 }], target: 'self' },
            'Power Strike': { description: 'Spend 2 Momentum to deal 14–20 damage.', cost: 2, resource: 'Momentum', base_damage: [14, 20], target: 'enemy_single', damage_type: 'physical' },
            'Grave Bolt': { description: '10–14 dmg, +2 dmg per corpse on the battlefield.', cost: 1, resource: 'Soul Energy', base_damage: [10, 14], effects: [{ type: 'bonus_damage_per_corpse', value: 2 }], target: 'enemy_single', damage_type: 'magic' },
            'Raise Skeleton': { description: 'Summon skeleton (5–7 dmg/turn).', cost: 2, resource: 'Soul Energy', effects: [{ type: 'summon', summon_type: 'skeleton' }], target: 'self' },
            'Soul Leech': { description: 'Deal 8 dmg, heal for half dmg dealt.', cost: 1, resource: 'Soul Energy', base_damage: [8, 8], effects: [{ type: 'heal_from_damage', ratio: 0.5 }], target: 'enemy_single', damage_type: 'magic' },
            'Backstab': { description: '10–14 dmg, +5 dmg if target is [Flanked].', cost: 2, resource: 'Energy', base_damage: [10, 14], target: 'enemy_single', damage_type: 'physical' },
            'Evasion': { description: '50% chance to dodge next attack.', cost: 0, resource: 'Energy', effects: [{ type: 'dodge_chance', value: 0.5, duration: 1 }], target: 'self' },
            'Quick Slash': { description: '6–9 dmg, always crits if used first in turn.', cost: 1, resource: 'Energy', base_damage: [6, 9], effects: [{ type: 'guaranteed_crit_first_turn' }], target: 'enemy_single', damage_type: 'physical' },
            'Arcane Bolt': { description: '10–14 dmg.', cost: 1, resource: 'Mana', base_damage: [10, 14], target: 'enemy_single', damage_type: 'magic' },
            'Focus': { description: 'Gain +2 Mana.', cost: 0, resource: 'Mana', effects: [{ type: 'gain_resource', resource: 'Mana', value: 2 }], target: 'self' },
            'Mana Burst': { description: '15–20 dmg, ignores 25% armor.', cost: 2, resource: 'Mana', base_damage: [15, 20], effects: [{ type: 'ignore_armor_percent', value: 0.25 }], target: 'enemy_single', damage_type: 'magic' },
            'Unmake': { description: 'Remove a target from the fight permanently.', cost: 5, resource: 'Hollow Will', effects: [{ type: 'remove_from_fight_permanent' }], target: 'enemy_single', damage_type: 'true' },
            'Echo of Nothing': { description: 'Skip the enemy’s next 2 turns.', cost: 3, resource: 'Hollow Will', effects: [{ type: 'skip_turn', duration: 2 }], target: 'enemy_single' },
            'Void Rend': { description: 'A basic strike that generates 3 Hollow Will (or 10 on a critical hit).', cost: 0, resource: 'Hollow Will', base_damage: [6, 8], target: 'enemy_single', damage_type: 'physical' },
            'Oblivion’s Call': { description: 'Erase the entire enemy team for 1 turn; they cannot act or be targeted.', cost: 'all', resource: 'Hollow Will', oncePerFight: true, effects: [{ type: 'erase_enemies', duration: 1 }], target: 'all_enemies' },
        };

        // --- Skill Aliases ---
        const skillAliases = {
            'gb': 'Grave Bolt',
            'rs': 'Raise Skeleton',
            'sl': 'Soul Leech',
            'ss': 'Slash',
            'bs': 'Backstab',
            'qs': 'Quick Slash',
            'ab': 'Arcane Bolt',
        };

        // --- Player Base Classes ---
        const basePlayerClasses = {
            'warrior': {
                name: 'Warrior',
                description: "A strong and resilient fighter, adept with weapons.",
                startingItems: ['rusty sword', 'wooden shield'],
                startingResource: { type: 'Momentum', initial: 1, max: 10 },
                baseStats: { hp: 120, strength: 10, intelligence: 5, agility: 7, def: 5 },
                startingSkills: ['Slash', 'Guard', 'Power Strike'],
            },
            'mage': {
                name: 'Mage',
                description: "A wise magic-user, skilled in arcane arts.",
                startingItems: ['wooden staff', 'spellbook'],
                startingResource: { type: 'Mana', initial: 6, max: 20 },
                baseStats: { hp: 70, strength: 6, intelligence: 10, agility: 7, def: 2 },
                startingSkills: ['Arcane Bolt', 'Focus', 'Mana Burst'],
            },
            'rogue': {
                name: 'Rogue',
                description: "A nimble and cunning operative, good at stealth and traps.",
                startingItems: ['short sword', 'lockpicks'],
                startingResource: { type: 'Energy', initial: 6, max: 15 },
                baseStats: { hp: 85, strength: 8, intelligence: 6, agility: 10, def: 3 },
                startingSkills: ['Backstab', 'Evasion', 'Quick Slash'],
            },
            'necromancer': {
                name: 'Necromancer',
                description: "Master of death magic, summoning, and decay.",
                startingItems: ['cracked bone staff', 'small black journal'],
                startingResource: { type: 'Soul Energy', initial: 1, max: 10 },
                baseStats: { hp: 80, strength: 6, intelligence: 9, agility: 6, def: 4 },
                startingSkills: ['Grave Bolt', 'Raise Skeleton', 'Soul Leech'],
            }
        };
        
        // --- Legendary and Secret Class Data ---
        const legendaryAndSecretClasses = {
            'the_hollow_king': {
                name: 'The Hollow King',
                description: 'A crown of absence. A throne of silence.',
                uponUnlock: "You wake to silence. The wind does not stir. The earth does not move. The throne you sit upon is carved from nothing, and in that nothing… you reign.",
                coreResource: { type: 'Hollow Will', initial: 0, max: 10 },
                passives: [
                    { name: 'Crown of the Undying', effect: 'If you die, resurrect next turn with 30% HP.' }
                ],
                skills: ['Unmake', 'Echo of Nothing'],
                overdrive: { name: 'Oblivion’s Call' }
            }
        };

        // --- Global Game State ---
        let currentRoom = 'starting_room';
        let gameActive = true;
        let awaitingClassSelection = false;
        let inCombat = false;
        let currentEnemies = [];
        let playerMinions = [];
        let turnOrder = [];
        let currentTurnIndex = 0;
        let isTyping = false;
        let skipTyping = false;

        let playerStats = {
            name: 'Adventurer',
            currentHP: 0,
            maxHP: 0,
            get hp() { return this.currentHP; },
            set hp(value) { this.currentHP = value; },
            strength: 0,
            intelligence: 0,
            agility: 0,
            def: 0,
            critChance: 0.2,
            critMultiplier: 1.5,
            level: 1,
            experience: 0,
            expToNextLevel: 100,
            resource: { type: 'None', current: 0, max: 0 },
            inventory: [],
            activeSkills: [],
            activeTraits: [],
            statusEffects: [],
            isHollowKing: false
        };

        let playerProgression = {
            baseClass: null,
            currentEvolutionName: null,
        };

        // --- Helper Functions ---
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function normalizeCommandInput(input) {
            let cleaned = input.toLowerCase().trim().replace(/\s+/g, ' ');
            let targetNum = null;
            let command = cleaned;
            const targetMatch = cleaned.match(/(.+?)\s*[#@]?(\d+)$/);
            if (targetMatch) {
                command = targetMatch[1].trim();
                targetNum = parseInt(targetMatch[2]);
            }
            return { command, targetNum };
        }

        // --- Game Functions ---
        async function displayMessage(message, isImportant = false) {
            // ... (displayMessage function remains the same)
        }

        function initializePlayer(className) {
            const baseClassInfo = basePlayerClasses[className];
            if (baseClassInfo) {
                playerStats.name = baseClassInfo.name;
                playerStats.currentHP = baseClassInfo.baseStats.hp;
                playerStats.maxHP = baseClassInfo.baseStats.hp;
                playerStats.strength = baseClassInfo.baseStats.strength;
                playerStats.intelligence = baseClassInfo.baseStats.intelligence;
                playerStats.agility = baseClassInfo.baseStats.agility;
                playerStats.def = baseClassInfo.baseStats.def;
                playerStats.inventory = [...baseClassInfo.startingItems];
                playerStats.activeSkills = [...baseClassInfo.startingSkills];
                playerStats.resource = { ...baseClassInfo.startingResource };
                playerProgression.baseClass = className;
                playerProgression.currentEvolutionName = baseClassInfo.name;
                updatePlayerHud();
            }
        }

        async function startGame() {
            // ... (startGame function remains the same)
        }

        async function displayRoomDescription() {
            // ... (displayRoomDescription function remains the same)
        }

        async function takeItem(itemName) {
            const currentRoomData = rooms[currentRoom];
            const itemIndex = currentRoomData.items.map(item => item.toLowerCase()).indexOf(itemName.toLowerCase());

            if (itemIndex !== -1) {
                const genericItemName = currentRoomData.items.splice(itemIndex, 1)[0];
                let receivedItem = genericItemName;

                if (adaptiveLoot[genericItemName] && playerProgression.baseClass) {
                    receivedItem = adaptiveLoot[genericItemName][playerProgression.baseClass] || genericItemName;
                }
                
                playerStats.inventory.push(receivedItem);
                await displayMessage(`You pick up the ${receivedItem}.`);
                updatePlayerHud();
            } else {
                await displayMessage(`You don't see a '${itemName}' here.`);
            }
        }

        async function showInventory() {
            // ... (showInventory function remains the same)
        }

        async function startCombat(enemyKeys) {
            // ... (startCombat function remains the same)
        }

        async function displayCombatState() {
            // ... (displayCombatState function remains the same)
        }

        async function resolveTurn() {
            // ... (resolveTurn function remains the same)
        }
        
        async function enemyTurn(enemy) {
            let target = playerStats;
            if (target && target.hp > 0) {
                const enemySkill = enemy.skills[0] || skillDefinitions['Basic Attack'];
                if (enemySkill) {
                    const { damage: damageDealt } = calculateDamage(enemy, target, enemySkill);
                    target.hp -= damageDealt;
                    await displayMessage(`${enemy.name} uses ${enemySkill.name} on ${playerStats.name} for ${damageDealt} damage! ${playerStats.name} HP: ${target.hp}/${playerStats.maxHP}`);
                }
            }
        }

        async function minionTurn(minion) {
             // ... (minionTurn function remains the same)
        }

        function calculateDamage(attacker, defender, skill) {
            let baseDamage = getRandomInt(skill.base_damage[0], skill.base_damage[1]);
            let isCrit = Math.random() < (attacker.critChance || 0.05);
            if (isCrit) {
                baseDamage = Math.floor(baseDamage * (attacker.critMultiplier || 1.5));
            }
            let finalDamage = Math.max(0, baseDamage - (defender.def || 0));
            return { damage: Math.floor(finalDamage), isCrit: isCrit };
        }

        async function applySkillEffect(caster, targets, skillInfo) {
            const actualTargets = Array.isArray(targets) ? targets : [targets];
            if (skillInfo.base_damage) {
                for (const target of actualTargets) {
                    if (target.hp <= 0) continue;
                    const skillNameForDisplay = skillInfo.name || "a powerful strike";
                    const damageResult = calculateDamage(caster, target, skillInfo);
                    let damageDealt = damageResult.damage;
                    let critMessage = damageResult.isCrit ? " (CRITICAL HIT!)" : "";
                    target.hp -= damageDealt;
                    await displayMessage(`${caster.name} uses ${skillNameForDisplay} on ${target.name} for ${damageDealt} damage!${critMessage}`, true);
                    if (caster.isPlayer && caster.isHollowKing && skillInfo.cost === 0) {
                        const willGained = damageResult.isCrit ? 10 : 3;
                        const currentWill = caster.resource.current;
                        caster.resource.current = Math.min(caster.resource.max, currentWill + willGained);
                        if (caster.resource.current > currentWill) {
                            await displayMessage(`You generated ${caster.resource.current - currentWill} Hollow Will!`);
                        }
                    }
                    if (target.hp <= 0) {
                        await displayMessage(`${target.name} has been defeated!`);
                        if (!target.isPlayer) {
                            corpsesOnBattlefield++;
                        }
                    }
                }
            }
            if (skillInfo.effects) {
                for (const effect of skillInfo.effects) {
                    if (playerStats.isHollowKing && effect.type === 'remove_from_fight_permanent') {
                        for (const target of actualTargets) {
                            await displayMessage(`The Hollow King gestures at ${target.name}. It flickers and is GONE.`, true);
                            target.hp = 0;
                            currentEnemies = currentEnemies.filter(e => e.id !== target.id);
                        }
                        continue;
                    }
                }
            }
            return true;
        }

        async function grantBossLoot(enemyId) {
            const lootTable = bossLoot[enemyId];
            if (!lootTable) return;
            await displayMessage("You search the vanquished foe...", true);
            for (const item of lootTable.universal) {
                playerStats.inventory.push(item);
                await displayMessage(`You found: ${item}!`);
            }
            const classItem = lootTable.classSpecific[playerProgression.baseClass];
            if (classItem) {
                playerStats.inventory.push(classItem);
                await displayMessage(`You found a class-specific item: ${classItem}!`);
            }
            updatePlayerHud();
        }

        async function checkBattleEnd() {
            const isPlayerAlive = playerStats.currentHP > 0;
            const livingEnemies = currentEnemies.filter(enemy => enemy.hp > 0);
            
            if (livingEnemies.length === 0 && inCombat) {
                const defeatedEnemies = currentEnemies;
                await displayMessage("\n--- VICTORY! ---", true);
                inCombat = false;
                
                for (const enemy of defeatedEnemies) {
                    if (enemy.specialFlags.includes('boss')) {
                        await grantBossLoot(enemy.id || 'crow_touched_warden');
                    }
                }

                await addExperience(50 * defeatedEnemies.length);
                await displayRoomDescription();
                updatePlayerHud();
                return true;
            }

            if (!isPlayerAlive && inCombat) {
                if (playerStats.isHollowKing && playerStats.activeTraits.some(t => t.name === 'Crown of the Undying')) {
                    await displayMessage("Your form dissolves into nothingness... but the crown remains.", true);
                    await sleep(1000);
                    playerStats.currentHP = Math.floor(playerStats.maxHP * 0.30);
                    await displayMessage("Silence reigns, and from it, you are remade. The Hollow King cannot truly die.", true);
                    updatePlayerHud();
                    return false;
                }
                await displayMessage("\n--- DEFEAT! ---", true);
                inCombat = false;
                gameActive = false;
                await displayMessage("You have been defeated! Game Over. Type 'start' to play again.");
                updatePlayerHud();
                return true;
            }
            return false;
        }

        async function addExperience(amount) {
            if (!playerProgression.baseClass) return;
            playerStats.experience += amount;
            await displayMessage(`You gained ${amount} experience points!`);
            await checkLevelUp();
        }

        async function checkLevelUp() {
            while (playerStats.experience >= playerStats.expToNextLevel) {
                playerStats.experience -= playerStats.expToNextLevel;
                playerStats.level++;
                playerStats.expToNextLevel = Math.floor(playerStats.expToNextLevel * 1.5);
                await displayMessage(`\nCongratulations! You have reached Level ${playerStats.level}!`, true);
                playerStats.maxHP += 10;
                playerStats.currentHP = playerStats.maxHP;
                playerStats.def += 1;
                playerStats.strength += 1;
                playerStats.agility += 1;
                playerStats.intelligence += 1;
                playerStats.resource.max += 2;
                playerStats.resource.current = playerStats.resource.max;
                await displayMessage(`Stats increased! HP and ${playerStats.resource.type} refilled.`, true);
                updatePlayerHud();
            }
        }
        
        async function transformIntoHollowKing() {
            if (!playerProgression.baseClass) {
                await displayMessage("You must select a base class before you can embrace the void.", true);
                return;
            }
            const hkData = legendaryAndSecretClasses.the_hollow_king;
            playerStats.maxHP = 500;
            playerStats.currentHP = 500;
            playerStats.def = 50;
            playerStats.strength = 15;
            playerStats.agility = 15;
            playerStats.critChance = 0.25;
            playerStats.critMultiplier = 2.5;
            playerStats.name = hkData.name;
            playerStats.isHollowKing = true;
            playerStats.resource = { ...hkData.coreResource, current: hkData.coreResource.max };
            playerStats.activeSkills = ['Void Rend', ...hkData.skills, hkData.overdrive.name];
            playerStats.activeTraits = [...hkData.passives];
            playerProgression.baseClass = 'hollow_king';
            playerProgression.currentEvolutionName = hkData.name;
            gameOutput.innerHTML = '';
            await displayMessage(hkData.uponUnlock, true);
            updatePlayerHud();
            await displayRoomDescription();
        }

        function updatePlayerHud() {
             // ... (updatePlayerHud function remains the same)
        }

        async function processCommand(commandText) {
             // ... (processCommand function remains the same)
        }

        async function processCombatCommand(commandText) {
            const { command: mainCommandRaw, targetNum } = normalizeCommandInput(commandText);
            gameOutput.innerHTML = '';
            await displayMessage(`> ${commandText}`, false);
            if (!turnOrder[currentTurnIndex]?.isPlayer) {
                await displayMessage("It's not your turn yet!");
                return;
            }
            let actionTaken = false;
            let skillName = mainCommandRaw;
            if (mainCommandRaw === 'attack') {
                skillName = playerStats.isHollowKing ? 'Void Rend' : (basePlayerClasses[playerProgression.baseClass]?.startingSkills[0] || 'Slash');
            } else {
                const resolvedName = resolveSkillName(mainCommandRaw);
                if (resolvedName) {
                    skillName = resolvedName;
                } else {
                    switch (mainCommandRaw) {
                        case 'flee':
                            inCombat = false;
                            await displayMessage("You fled from combat!");
                            await displayRoomDescription();
                            return;
                        default:
                            await displayErrorMessage("Unknown command in combat.", mainCommandRaw);
                            return;
                    }
                }
            }
            const skillInfo = skillDefinitions[skillName];
            if (!skillInfo || !playerStats.activeSkills.includes(skillName)) {
                await displayErrorMessage(`You don't know the skill '${skillName}'.`, mainCommandRaw);
                return;
            }
            const cost = skillInfo.cost === 'all' ? playerStats.resource.current : (skillInfo.cost || 0);
            if (playerStats.resource.current < cost) {
                await displayErrorMessage(`Not enough ${playerStats.resource.type}!`, skillName);
                return;
            }
            let targets = [];
            const livingEnemies = currentEnemies.filter(e => e.hp > 0);
            if (skillInfo.target === 'enemy_single') {
                const targetEnemy = getTargetEnemy(targetNum);
                if (!targetEnemy) {
                    await displayErrorMessage(getInvalidTargetMessage(targetNum, livingEnemies), skillName);
                    return;
                }
                targets.push(targetEnemy);
            } else {
                targets = livingEnemies;
            }
            if (cost > 0) {
                playerStats.resource.current -= cost;
                await displayMessage(`Used ${cost} ${playerStats.resource.type}.`);
            }
            actionTaken = await applySkillEffect(playerStats, targets, skillInfo);
            if (actionTaken) {
                if (await checkBattleEnd()) return;
                currentTurnIndex++;
                if (currentTurnIndex >= turnOrder.length) {
                    await endOfRoundEffects();
                }
                await resolveTurn();
            }
        }
        
        function getTargetEnemy(index) {
            const livingEnemies = currentEnemies.filter(e => e.hp > 0);
            if (index > 0 && index <= livingEnemies.length) return livingEnemies[index - 1];
            if (index === null && livingEnemies.length === 1) return livingEnemies[0];
            return null;
        }

        async function displayErrorMessage(errorMessage, originalCommandPart) {
             // ... (displayErrorMessage function remains the same)
        }

        // --- Event Listeners ---
        gameInput.addEventListener('keypress', async (event) => {
             // ... (event listener remains the same)
        });

        submitButton.addEventListener('click', async () => {
             // ... (event listener remains the same)
        });

        // --- Initialize the Game ---
        document.addEventListener('DOMContentLoaded', startGame);
