/* =========================================================================
 * Enso's Last Stand — GAME DATA
 * Pure data: rooms, enemies, minions, skills, classes, evolutions.
 * No logic, no DOM. Works in the browser (window.ENSO.data) and Node (require).
 * Extracted verbatim from the original game.js.
 * ========================================================================= */
(function (global) {
        const rooms = {
            'starting_room': {
                description: "You awaken in a damp, musty cellar. A faint light filters through a crack in the ceiling. Crows circle above the broken ceiling. You don’t remember how you got here… but your hands glow faintly with forbidden power.",
                exits: {
                    'north': 'hallway_of_chains',
                    'east': 'collapsed_wine_cellar'
                },
                enemies: ['James_Newton'],
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
                items: [],
                onClear: {
                    type: 'win',
                    text: "The Warden staggers. His feathered helm cracks, and for a heartbeat the red light in his eyes flickers to something almost human. Then the crows scatter, the chains along the walls fall slack, and the chanting beyond the sealed arch goes silent.\nA cold draft finds you from somewhere above. Daylight.\nYou don't remember how you got here. But you remember, now, how to leave."
                }
            }
        };

        // --- Enemy Definitions ---
        const enemies = {
            'James_Newton': {
                name: 'James Newton', properName: true, // text only: no "a" before the name
                hp: 666, maxHp: 666, xp: 1000, atk: 20, def: 66, spd: 20,
                critChance: 0.6, critMultiplier: 1.5,
                skills: [{ name: 'Heavy Slash', base_damage: [20, 30] }]
            },
            'weak_goblin': {
                name: 'Weak Goblin',
                hp: 30, maxHp: 30, xp: 10, atk: 5, def: 2, spd: 8,
                critChance: 0.1, critMultiplier: 1.5,
                skills: [{ name: 'Goblin Slash', base_damage: [5, 8] }]
            },
            'hungry_wolf': {
                name: 'Hungry Wolf',
                hp: 40, maxHp: 40, xp: 15, atk: 7, def: 3, spd: 12,
                critChance: 0.2, critMultiplier: 1.7,
                skills: [{ name: 'Bite', base_damage: [7, 10] }]
            },
            'shackled_ghoul': {
                name: 'Shackled Ghoul',
                hp: 20, maxHp: 20, xp: 15, atk: 8, def: 1, spd: 14,
                critChance: 0.15, critMultiplier: 1.6,
                specialFlags: ['undead', 'weak_to_light'],
                skills: [{ name: 'Frenzied Bite', base_damage: [6, 10] }]
            },
            'rust_rat': {
                name: 'Rust Rat',
                hp: 15, maxHp: 15, xp: 10, atk: 4, def: 2, spd: 16,
                critChance: 0.1, critMultiplier: 1.5,
                skills: [{ name: 'Corroding Bite', base_damage: [3, 5] }]
            },
            'cellar_vermin': {
                name: 'Cellar Vermin',
                hp: 25, maxHp: 25, xp: 15, atk: 6, def: 1, spd: 13,
                critChance: 0.1, critMultiplier: 1.5,
                skills: [{ name: 'Quick Swipe', base_damage: [5, 8] }]
            },
            'drunken_shade': {
                name: 'Drunken Shade',
                hp: 30, maxHp: 30, xp: 15, atk: 2, def: 4, spd: 7,
                critChance: 0.05, critMultiplier: 1.5,
                specialFlags: ['undead'],
                skills: [{ name: 'Disorienting Whisper', base_damage: [1, 3] }]
            },
            'bone_gnawer': {
                name: 'Bone Gnawer',
                hp: 18, maxHp: 18, xp: 15, atk: 6, def: 3, spd: 15,
                critChance: 0.1, critMultiplier: 1.5,
                specialFlags: ['undead'],
                skills: [{ name: 'Ankle Snap', base_damage: [6, 9] }]
            },
            'mire_lurker': {
                name: 'Mire Lurker',
                hp: 35, maxHp: 35, xp: 20, atk: 5, def: 2, spd: 6,
                critChance: 0.05, critMultiplier: 1.5,
                skills: [{ name: 'Corrosive Spit', base_damage: [4, 7] }]
            },
            'cult_acolyte': {
                name: 'Cult Acolyte',
                hp: 22, maxHp: 22, xp: 20, atk: 7, def: 1, spd: 9,
                critChance: 0.1, critMultiplier: 1.6,
                skills: [{ name: 'Hexing Blade', base_damage: [7, 11] }]
            },
            'shackled_ghoul_stronger': {
                name: 'Ritual-Scarred Ghoul',
                hp: 40, maxHp: 40, xp: 30, atk: 10, def: 3, spd: 12,
                critChance: 0.15, critMultiplier: 1.6,
                specialFlags: ['undead'],
                skills: [{ name: 'Frenzied Bite', base_damage: [9, 14] }]
            },
            'crow_touched_warden': {
                name: 'The Crow-Touched Warden',
                id: 'crow_touched_warden',
                hp: 150, maxHp: 150, xp: 200, atk: 15, def: 8, spd: 10,
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
        // Centralized definitions for all skills, including descriptions, costs, etc.
        const skillDefinitions = {
            // Universal Basic Attack fallback
            'Basic Attack': { description: 'A standard attack.', cost: 0, resource: 'N/A', base_damage: [5, 8], target: 'enemy_single', damage_type: 'physical' },
            // Base Warrior Skills
            'Slash': { description: 'Deal 8–12 damage to a single enemy.', cost: 0, resource: 'Momentum', base_damage: [8, 12], target: 'enemy_single', damage_type: 'physical' },
            'Guard': { description: 'Reduce incoming damage by 25% next turn.', cost: 0, resource: 'Momentum', effects: [{ type: 'damage_reduction', value: 0.25, duration: 1, traitOverride: 'Shield Discipline' }], target: 'self' },
            'Power Strike': { description: 'Spend 2 Momentum to deal 14–20 damage.', cost: 2, resource: 'Momentum', base_damage: [14, 20], target: 'enemy_single', damage_type: 'physical' },
            'War Cry': { description: 'Gain +1 Momentum, enemy gets +accuracy next attack.', cost: 0, resource: 'Momentum', effects: [{ type: 'gain_resource', resource: 'Momentum', value: 1 }, { type: 'apply_status', status: 'accuracy_buff_enemy', value: 0.1, duration: 1 }], target: 'self' }, // Safety valve

            // Vanguard Branch Skills
            'Shield Bash': { description: 'Deal 10–14 damage; stun if Oath Points ≥ 3 (not spent). Target acts once between Shield Bash stuns.', cost: 0, resource: 'Oath Points', base_damage: [10, 14], effects: [{ type: 'stun', duration: 1, shieldBashRecovery: true, condition: { stat: 'Oath Points', operator: '>=', value: 3 } }], target: 'enemy_single', damage_type: 'physical', combatFlavor: "Your shield rings out like a drum, shaking the foe’s footing." },
            'Mounted Charge': { description: 'Charge a target, dealing damage and gaining momentum. Gained via Tourney of Crowns prestige quest.', cost: 1, resource: 'Momentum', base_damage: [12, 18], effects: [{ type: 'gain_resource', resource: 'Momentum', value: 1 }], target: 'enemy_single', damage_type: 'physical' }, // Prestige Skill
            'Shield Charge': { description: 'Rush an ally, taunt enemies around them. Deals 8–12 dmg.', cost: 1, resource: 'Oath Points', base_damage: [8, 12], effects: [{ type: 'taunt_aoe', duration: 1 }], target: 'ally_single', damage_type: 'physical' },
            'Holy Smite': { description: 'Spend all Oath Points to deal 15–25 radiant dmg (+5 vs Undead/Void).', cost: 'all', resource: 'Oath Points', base_damage: [15, 25], effects: [{ type: 'bonus_damage_vs_flag', flag: 'undead', value: 5 }, { type: 'bonus_damage_vs_flag', flag: 'void', value: 5 }], target: 'enemy_single', damage_type: 'radiant' },
            'Soul Rend': { description: 'Consume all Sin Marks to deal 25–35 AOE dmg (ignores armor).', cost: 'all', resource: 'Sin Marks', base_damage: [25, 35], effects: [{ type: 'ignore_armor' }], target: 'enemy_aoe', damage_type: 'true', combatFlavor: "Your blade drinks deep, shadows screaming with each cut." },

            // Berserker Branch Skills
            'Hemorrhage': { description: 'Deal 10–16 damage + bleed (3 dmg/turn for 3 turns).', cost: 1, resource: 'Fury Gauge', base_damage: [10, 16], effects: [{ type: 'bleed', value: 3, duration: 3 }], target: 'enemy_single', damage_type: 'physical', combatFlavor: "Pain sharpens your grin as the blood runs hotter." },
            'Whirlwind': { description: 'Deal 8–12 AOE damage to all enemies.', cost: 2, resource: 'Fury Gauge', base_damage: [8, 12], target: 'enemy_aoe', damage_type: 'physical' },
            'Lunge': { description: 'Leap to target, deal 15–22 damage, gain 2 Fury.', cost: 1, resource: 'Fury Gauge', base_damage: [15, 22], effects: [{ type: 'gain_resource', resource: 'Fury Gauge', value: 2 }], target: 'enemy_single', damage_type: 'physical' },
            'Sever Spine': { description: 'Once per boss fight, deal 30–40 true damage.', cost: 0, resource: 'Fury Gauge', base_damage: [30, 40], effects: [{ type: 'true_damage' }], target: 'enemy_single', damage_type: 'physical', combatFlavor: "The great beast falls silent, its last breath stolen by your strike." },

            // Warden Branch Skills
            'Pincushion': { description: 'Apply [Pin] Mark, reducing target speed by 50%.', cost: 0, resource: 'Vigil', effects: [{ type: 'apply_mark', mark: 'Pin', value: 0.5, duration: 2 }], target: 'enemy_single', damage_type: 'utility', combatFlavor: "The enemy’s advance falters as your spear finds its mark." },
            'Lockstep': { description: 'Taunt enemies in your zone for 1 turn.', cost: 1, resource: 'Vigil', effects: [{ type: 'taunt_aoe', duration: 1 }], target: 'enemy_aoe', damage_type: 'utility' },
            'Expose Weakness': { description: 'Apply [Expose] Mark, increasing dmg taken by 20% for 2 turns.', cost: 1, resource: 'Vigil', effects: [{ type: 'apply_mark', mark: 'Expose', value: 0.2, duration: 2 }], target: 'enemy_single', damage_type: 'utility' },
            'Fortress': { description: 'Create a zone lasting 3 turns, allies take -20% dmg inside.', cost: 2, resource: 'Vigil', effects: [{ type: 'create_zone', zone: 'Fortress', duration: 3, effect: { type: 'damage_reduction', value: 0.2 } }], target: 'self', damage_type: 'utility' },

            // Necromancer Base Skills
            'Grave Bolt': { description: '10–14 dmg, +2 dmg per corpse on the battlefield.', cost: 1, resource: 'Soul Energy', base_damage: [10, 14], effects: [{ type: 'bonus_damage_per_corpse', value: 2 }], target: 'enemy_single', damage_type: 'magic' },
            'Raise Skeleton': { description: 'Summon skeleton (5–7 dmg/turn).', cost: 2, resource: 'Soul Energy', effects: [{ type: 'summon', summon_type: 'skeleton', damage: [5, 7], duration: 'permanent' }], target: 'self' },
            'Soul Leech': { description: 'Deal 8 dmg, heal for half dmg dealt.', cost: 1, resource: 'Soul Energy', base_damage: [8, 8], effects: [{ type: 'heal_from_damage', ratio: 0.5 }], target: 'enemy_single', damage_type: 'magic' },
            'Channel the Grave': { description: 'Gain +1 Soul Energy, take 2 true damage. (Cooldown: 1 turn)', cost: 0, resource: 'Soul Energy', effects: [{ type: 'gain_resource', resource: 'Soul Energy', value: 1 }, { type: 'take_true_damage', value: 2 }, { type: 'apply_status', status: 'Channel Cooldown', duration: 1 }], target: 'self' }, // Safety valve

            // Bone Warden Branch Skills
            'Bone Wall': { description: 'Absorbs the next hit entirely.', cost: 1, resource: 'Soul Energy', effects: [{ type: 'absorb_hit', duration: 1 }], target: 'self' },
            'Shield of the Dead': { description: 'All minions taunt for 2 turns.', cost: 2, resource: 'Soul Energy', effects: [{ type: 'minion_taunt', duration: 2 }], target: 'minions' },
            'Raise Ghoul': { description: 'Summon ghoul (9–12 dmg/turn, applies [Weaken]).', cost: 3, resource: 'Soul Energy', effects: [{ type: 'summon', summon_type: 'ghoul', damage: [9, 12], duration: 'permanent', apply_effect: { type: 'apply_mark', mark: 'Weaken', value: 0.2, duration: 2 } }], target: 'self' },
            'Reaper’s Charge': { description: '20–28 dmg + stun 1 turn.', cost: 3, resource: 'Soul Energy', base_damage: [20, 28], effects: [{ type: 'stun', duration: 1 }], target: 'enemy_single', damage_type: 'physical' },

            // Plaguecaller Branch Skills
            'Contagion': { description: 'Infect target; spreads on death.', cost: 1, resource: 'Soul Energy', effects: [{ type: 'infect', duration: 3, spread_on_death: true }], target: 'enemy_single', damage_type: 'magic' },
            'Black Spit': { description: 'Apply [Weaken] (-20% dmg) + 5 dmg/turn for 3 turns.', cost: 1, resource: 'Soul Energy', effects: [{ type: 'apply_mark', mark: 'Weaken', value: 0.2, duration: 3 }, { type: 'dot', dot_type: 'poison', value: 5, duration: 3 }], target: 'enemy_single', damage_type: 'magic' },
            'Corpse Bloom': { description: 'Explode a corpse for 15 dmg AOE + 1 Infection stack to all in range.', cost: 2, resource: 'Soul Energy', base_damage: [15, 15], effects: [{ type: 'aoe_damage_from_corpse' }, { type: 'apply_infection_aoe', stacks: 1 }], target: 'corpse', damage_type: 'magic' },
            'Plague Wind': { description: 'Spread all infections instantly to every enemy.', cost: 3, resource: 'Soul Energy', effects: [{ type: 'spread_all_infections' }], target: 'all_enemies', damage_type: 'utility' },

            // Soulbinder Branch Skills
            'Soul Chain': { description: 'Link 2 targets; dmg to one hits both.', cost: 1, resource: 'Soul Energy', effects: [{ type: 'link_targets', count: 2 }], target: 'enemy_multiple' },
            'Possession': { description: 'Control an enemy for 1 turn.', cost: 3, resource: 'Soul Energy', effects: [{ type: 'control_enemy', duration: 1 }], target: 'enemy_single' },
            'Soul Feast': { description: 'Drain 2 HP/turn from all linked enemies for 3 turns.', cost: 2, resource: 'Soul Energy', effects: [{ type: 'drain_hp_from_linked', value: 2, duration: 3 }], target: 'linked_enemies' },

            // Rogue Base Skills
            'Backstab': { description: '10–14 dmg, +5 dmg if target is [Flanked].', cost: 2, resource: 'Energy', base_damage: [10, 14], target: 'enemy_single', damage_type: 'physical' },
            'Evasion': { description: '50% chance to dodge next attack.', cost: 0, resource: 'Energy', effects: [{ type: 'dodge_chance', value: 0.5, duration: 1 }], target: 'self' },
            'Quick Slash': { description: '6–9 dmg, always crits if used first in turn.', cost: 1, resource: 'Energy', base_damage: [6, 9], effects: [{ type: 'guaranteed_crit_first_turn' }], target: 'enemy_single', damage_type: 'physical' },
            'Second Wind': { description: 'Gain +2 Energy, -25% evasion this turn.', cost: 0, resource: 'Energy', effects: [{ type: 'gain_resource', resource: 'Energy', value: 2 }, { type: 'apply_status', status: 'Evasion Debuff', value: -0.25, duration: 1 }], target: 'self' }, // Safety valve

            // Assassin Branch Skills
            'Shadowstep': { description: 'Teleport to enemy, next hit crits.', cost: 1, resource: 'Stealth Tokens', effects: [{ type: 'teleport_to_enemy' }, { type: 'guaranteed_crit_next_hit' }], target: 'enemy_single' },
            'Garrote': { description: '12–16 dmg + silence 1 turn.', cost: 2, resource: 'Stealth Tokens', base_damage: [12, 16], effects: [{ type: 'silence', duration: 1 }], target: 'enemy_single', damage_type: 'physical' },
            'Marked for Death': { description: 'Mark enemy; next attack from you or ally deals +50% dmg.', cost: 0, resource: 'Stealth Tokens', effects: [{ type: 'apply_mark', mark: 'Marked for Death', value: 0.5, duration: 1 }], target: 'enemy_single', damage_type: 'utility' },
            'Assassinate': { description: 'If target <20% HP, kill instantly.', cost: 3, resource: 'Stealth Tokens', effects: [{ type: 'instant_kill_if_low_hp', threshold: 0.2 }], target: 'enemy_single', damage_type: 'true' },

            // Duelist Branch Skills
            'Riposte': { description: 'Counter next melee attack for +50% dmg.', cost: 1, resource: 'Combo Points', effects: [{ type: 'counter_attack', bonus_damage: 0.5, duration: 1 }], target: 'self' },
            'Flurry': { description: '3x 6–8 dmg strikes.', cost: 3, resource: 'Combo Points', base_damage: [6, 8], effects: [{ type: 'multi_hit', count: 3 }], target: 'enemy_single', damage_type: 'physical' },
            'Blade Storm': { description: 'Hit all enemies twice.', cost: 5, resource: 'Combo Points', base_damage: [8, 8], effects: [{ type: 'multi_hit', count: 2 }], target: 'enemy_aoe', damage_type: 'physical' },

            // Saboteur Branch Skills
            'Caltrops': { description: 'Slow enemies (-50% speed, 2 turns).', cost: 1, resource: 'Trap Charges', effects: [{ type: 'slow', value: 0.5, duration: 2 }], target: 'enemy_aoe', damage_type: 'utility' },
            'Smoke Bomb': { description: 'Blind all enemies (-25% hit chance, 1 turn).', cost: 2, resource: 'Trap Charges', effects: [{ type: 'blind', value: 0.25, duration: 1 }], target: 'enemy_aoe', damage_type: 'utility' },
            'Poison Trap': { description: '4 dmg/turn DoT, 3 turns.', cost: 1, resource: 'Trap Charges', effects: [{ type: 'place_trap', trap_type: 'poison', value: 4, duration: 3 }], target: 'ground', damage_type: 'utility' },
            'Clockwork Bomb': { description: '20–28 dmg AOE, delayed 1 turn.', cost: 3, resource: 'Trap Charges', base_damage: [20, 28], effects: [{ type: 'delayed_aoe', delay: 1 }], target: 'enemy_aoe', damage_type: 'physical' },

            // Mage Base Skills
            'Arcane Bolt': { description: '10–14 dmg.', cost: 1, resource: 'Mana', base_damage: [10, 14], target: 'enemy_single', damage_type: 'magic' },
            'Focus': { description: 'Gain +2 Mana.', cost: 0, resource: 'Mana', effects: [{ type: 'gain_resource', resource: 'Mana', value: 2 }], target: 'self' },
            'Mana Burst': { description: '15–20 dmg, ignores 25% armor.', cost: 2, resource: 'Mana', base_damage: [15, 20], effects: [{ type: 'ignore_armor_percent', value: 0.25 }], target: 'enemy_single', damage_type: 'magic' },
            'Overchannel': { description: 'Spend HP to cast beyond Mana this turn; leaves a "Burnout" debuff next turn.', cost: 0, resource: 'Mana', effects: [{ type: 'overchannel' }], target: 'self' }, // Safety valve

            // Elementalist Branch Skills
            'Fireball': { description: 'Deal fire damage.', cost: 1, resource: 'Mana', base_damage: [10, 15], target: 'enemy_single', damage_type: 'fire' },
            'Ice Lance': { description: 'Deal ice damage, may slow.', cost: 1, resource: 'Mana', base_damage: [9, 14], effects: [{ type: 'slow_chance', value: 0.3, duration: 1 }], target: 'enemy_single', damage_type: 'ice' },
            'Lightning Arc': { description: 'Deal lightning damage, may chain.', cost: 1, resource: 'Mana', base_damage: [8, 13], effects: [{ type: 'chain_lightning', count: 2 }], target: 'enemy_single', damage_type: 'lightning' },

            // Illusionist Branch Skills
            'mirrorImage': { description: 'Avoid next hit.', cost: 1, resource: 'Deception Tokens', effects: [{ type: 'avoid_next_hit', duration: 1 }], target: 'self' },
            'confuse': { description: '50% chance enemy skips turn.', cost: 2, resource: 'Deception Tokens', effects: [{ type: 'skip_turn_chance', value: 0.5, duration: 1 }], target: 'enemy_single' },
            'stealSkill': { description: 'Steal enemy’s last used skill for 2 turns.', cost: 3, resource: 'Deception Tokens', effects: [{ type: 'steal_skill', duration: 2 }], target: 'enemy_single' },
            'multiTargetIllusions': { description: 'Up to 3 enemies skip turn.', cost: 4, resource: 'Deception Tokens', effects: [{ type: 'skip_turn_aoe', count: 3, duration: 1 }], target: 'enemy_aoe' },

            // Chronomancer Branch Skills
            'haste': { description: 'Ally takes extra turn.', cost: 2, resource: 'Time Charges', effects: [{ type: 'extra_turn' }], target: 'ally_single' },
            'slow': { description: 'Enemy loses next turn.', cost: 2, resource: 'Time Charges', effects: [{ type: 'skip_turn', duration: 1 }], target: 'enemy_single' },
            'revertHp': { description: 'Revert ally to HP they had 2 turns ago.', cost: 3, resource: 'Time Charges', effects: [{ type: 'revert_hp', turns: 2 }], target: 'ally_single' },
            'freezeTime': { description: 'Enemies can’t act for 1 turn.', cost: 5, resource: 'Time Charges', effects: [{ type: 'freeze_enemies', duration: 1 }], target: 'all_enemies' },
            'rearrangeTurnOrder': { description: 'Rearrange entire turn order for 3 turns.', cost: 'all', resource: 'Time Charges', effects: [{ type: 'rearrange_turn_order', duration: 3, minResource: 1 }], target: 'all_combatants' }, // D-09: rounds; needs >= 1 Time Charge


            // Ascended Overdrives (Special Skills at max evolution)
            'Oblivion Reign': { description: 'Next 3 turns, all attacks are true dmg & heal you.', cost: 'all', resource: 'Sin Marks', oncePerFight: true, effects: [{ type: 'true_damage_attacks', duration: 3 }, { type: 'heal_on_attack_percent', value: 1 }], target: 'self' },
            'Dragon’s Dominion': { description: 'Triple dmg vs bosses for 1 turn.', cost: 'all', resource: 'Fury Gauge', oncePerFight: true, effects: [{ type: 'bonus_damage_vs_flag_percent', flag: 'boss', value: 2, duration: 1 }], target: 'self' }, // 200% bonus = triple
            'Total Lockdown': { description: 'Enemies can’t move or leave zones for 2 turns.', cost: 'all', resource: 'Vigil', oncePerFight: true, effects: [{ type: 'immobilize_enemies', duration: 2 }], target: 'all_enemies' },
            'March of Endless Bones': { description: 'Instantly resurrect all fallen minions and summon 1 free ghoul.', cost: 'all', resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'resurrect_all_minions' }], target: 'self' }, // Black Pharaoh Ascended
            'Plague of Ages': { description: 'All enemies instantly gain max Infection stacks; infections deal true dmg.', cost: 'all', resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'apply_max_infection_aoe' }, { type: 'infections_true_damage' }], target: 'all_enemies' }, // Plague Sovereign Ascended
            'Death’s Dominion': { description: 'All enemies instantly become undead under your control for 1 turn.', cost: 'all', resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'control_all_enemies', duration: 1 }], target: 'all_enemies' }, // Deathlord Eternal Legendary
            
            'Eternal Lich Unmake': { description: 'Eternal Lich erases one non-boss enemy from this fight.', cost: 5, resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'eternal_lich_unmake' }], target: 'enemy_single', damage_type: 'true' },

            // Hollow King Skills
            'Unmake': { description: 'Remove a target from the fight permanently.', cost: 5, resource: 'Hollow Will', effects: [{ type: 'remove_from_fight_permanent' }], target: 'enemy_single', damage_type: 'true' },
            'Echo of Nothing': { description: 'Skip the enemy’s next 2 turns.', cost: 3, resource: 'Hollow Will', effects: [{ type: 'skip_turn', duration: 2 }], target: 'enemy_single' },
            'Void Rend': { description: 'A basic strike that generates 3 Hollow Will (or 10 on a critical hit).', cost: 0, resource: 'Hollow Will', base_damage: [6, 8], effects: [{ type: 'gain_resource_on_hit', value: 3, critValue: 10 }], target: 'enemy_single', damage_type: 'physical' },
            'Oblivion’s Call': { description: 'Erase the entire enemy team for 1 turn; they cannot act or be targeted.', cost: 'all', resource: 'Hollow Will', oncePerFight: true, effects: [{ type: 'erase_enemies', duration: 1 }], target: 'all_enemies' },
            
            // Other Ascended Skills
            'Worldflame': { description: 'All elements gain +1 extra effect (burn harder, longer stuns, deeper slows).', cost: 'all', resource: 'Mana', oncePerFight: true, effects: [{ type: 'enhance_all_elements' }], target: 'self' },
            'Arcane Hollow': { description: 'Permanently remove 1 skill from enemy on hit; needed for Reality Breaker Legendary.', cost: 'all', resource: 'Deception Tokens', oncePerFight: true, effects: [{ type: 'remove_enemy_skill_on_hit_permanent' }], target: 'self' },
        };


        // --- Skill Aliases (New) ---
        const skillAliases = {
            'gb': 'Grave Bolt',
            'rs': 'Raise Skeleton',
            'sl': 'Soul Leech',
            'ct': 'Channel the Grave',
            'ss': 'Slash',
            'g': 'Guard',
            'ps': 'Power Strike',
            'wc': 'War Cry',
            'bs': 'Backstab',
            'e': 'Evasion',
            'qs': 'Quick Slash',
            'sw': 'Second Wind',
            'ab': 'Arcane Bolt',
            'f': 'Focus',
            'mb': 'Mana Burst',
            'oc': 'Overchannel',
            // Add more aliases as needed
        };


        // --- Player Base Classes Definition ---
        const basePlayerClasses = {
            'warrior': {
                name: 'Warrior',
                description: "A strong and resilient fighter, adept with weapons.",
                lore: {
                    base: "Steel in your hands, resolve in your heart. You fight because you must — and because no one else will.",
                    role: "Frontline melee, starter class.",
                    identity: "Grit, survival, and the will to push forward."
                },
                startingItems: ['rusty sword', 'wooden shield', 'old key'],
                startingResource: { type: 'Momentum', initial: 1, max: 10 },
                baseStats: { hp: 120, strength: 10, intelligence: 5, agility: 7, def: 5, critChance: 0.05, critMultiplier: 1.5, baseDamageMin: 8, baseDamageMax: 12 },
                startingSkills: ['Slash', 'Guard', 'Power Strike'],
                startingTraits: [{ name: 'Battle-Ready', effect: 'Start each fight with 1 Momentum.' }]
            },
            'mage': {
                name: 'Mage',
                description: "A wise magic-user, skilled in arcane arts.",
                lore: {
                    base: "The world is made of rules. You are here to break them.",
                    role: "Ranged magic damage dealer, battlefield manipulator.",
                    identity: "Knowledge, control, raw magical power."
                },
                startingItems: ['wooden staff', 'spellbook', 'old key'],
                startingResource: { type: 'Mana', initial: 6, max: 20, regen: 2 },
                baseStats: { hp: 70, strength: 6, intelligence: 10, agility: 7, def: 2, critChance: 0.1, critMultiplier: 1.75, baseDamageMin: 6, baseDamageMax: 10 },
                startingSkills: ['Arcane Bolt', 'Focus', 'Mana Burst'],
                startingTraits: []
            },
            'rogue': {
                name: 'Rogue',
                description: "A nimble and cunning operative, good at stealth and traps.",
                lore: {
                    base: "Your enemy won’t see the blade until it’s too late.",
                    role: "Fast, evasive, precision damage dealer.",
                    identity: "Cunning, speed, precise execution."
                },
                startingItems: ['short sword', 'lockpicks', 'old key'],
                startingResource: { type: 'Energy', initial: 6, max: 15, regen: 3 },
                baseStats: { hp: 85, strength: 8, intelligence: 6, agility: 10, def: 3, critChance: 0.2, critMultiplier: 2.0, baseDamageMin: 5, baseDamageMax: 9 },
                startingSkills: ['Backstab', 'Evasion', 'Quick Slash'],
                startingTraits: []
            },
            'necromancer': {
                name: 'Necromancer',
                description: "Master of death magic, summoning, and decay.",
                lore: {
                    base: "Life is fleeting. Death is patient. You are neither.",
                    role: "Master of death magic, summoning, and decay.",
                    identity: "You walk between realms, plucking secrets from cold lips. The living fear you; the dead obey."
                },
                startingItems: ['cracked bone staff', 'small black journal'],
                startingResource: { type: 'Soul Energy', initial: 1, max: 10 },
                baseStats: { hp: 80, strength: 6, intelligence: 9, agility: 6, def: 4, critChance: 0.05, critMultiplier: 1.5, baseDamageMin: 6, baseDamageMax: 10 },
                startingSkills: ['Grave Bolt', 'Raise Skeleton', 'Soul Leech'],
                startingTraits: []
            }
        };

        // --- Evolution Path Data ---
        const evolutionPaths = {
            'warrior': {
                base: { name: 'Warrior', description: 'Frontline melee, starter class.' },
                branches: {
                    'vanguard': {
                        name: 'Vanguard',
                        theme: 'Duty-bound defender who can turn into a corrupted anti-paladin.',
                        resourceEvolution: [
                            { level: 3, stage: 'Vanguard', type: 'Oath Points' },
                            { level: 11, stage: 'Dark Knight', type: 'Sin Marks' }
                        ],
                        stages: [
                            { level: 3, name: 'Vanguard', trait: 'Shield Discipline', damageReductionOverride: 0.35, traitEffect: 'Guard reduces 35% dmg instead of 25%.', skill: 'Shield Bash', lore: "Shields up, eyes forward. A Vanguard does not falter — they are the wall upon which the enemy breaks.", loreStance: "Protector first, fighter second.", loreEffect: "Your presence slows the battle to your pace." },
                            { level: 5, name: 'Knight', trait: 'Oathbound', traitEffect: '+1 Oath Point when blocking for an ally.', skill: 'Shield Charge', lore: "Oaths sworn in light and blood bind you to your cause. You bear the weight of those who cannot defend themselves.", loreEffect: "Respected across kingdoms for honor and discipline. Every step echoes with the weight of your duty.", prestigeQuest: "Tourney of Crowns" },
                            { level: 8, name: 'Paladin', trait: 'Divine Ward', traitEffect: 'First ally death per fight is prevented (restore 20 HP).', skill: 'Holy Smite', lore: "Your shield is not merely steel; it is the will of the heavens. Your strikes burn with justice, your presence inspires the weary.", loreEffect: "Wields holy power against darkness. The common folk speak your name in prayers." },
                            { level: 11, name: 'Dark Knight', trait: 'Sin-Eater', traitEffect: 'Oath Points become Sin Marks, double dmg but take 5% max HP true dmg per hit.', skill: 'Soul Rend', unlockTrigger: 'betrayal event', lore: "The light you swore to serve has turned its back on you… or perhaps you on it. Oaths rot, faith crumles, and in the ashes, you find a darker strength.", loreEffect: "Armor black as midnight, blade thirsting for retribution. Powers drawn from Sin Marks that eat away at the soul." },
                            { level: 14, name: 'Abyssal King', trait: 'Sin Marks heal you instead of harming you; all attacks inflict [Silence Debt] — needed for Nullblade.', traitEffect: 'Sin Marks heal you instead of harming you; all attacks inflict [Silence Debt] for Legendary unlock.', skill: 'Oblivion Reign', ascended: true, lore: "The abyss answers to you. Sin no longer burns your flesh — it feeds you. All who speak find their words stolen, all who fight find their will broken.", loreEffect: "Walking apocalypse; silence spreads in your wake. Necessary for unlocking the Legendary Nullblade." }
                        ]
                    },
                    'berserker': {
                        name: 'Berserker',
                        theme: 'Frenzied damage dealer evolving into a mythic beast hunter.',
                        resourceEvolution: [
                            { level: 3, stage: 'Berserker', type: 'Fury Gauge' }
                        ],
                        stages: [
                            { level: 3, name: 'Berserker', trait: 'Blood Frenzy', traitEffect: '+10% dmg while below 50% HP.', skill: 'Hemorrhage', lore: "You welcome pain as a friend, for each wound only sharpens your rage. Blood is your banner.", loreEffect: "Battles are a blur of motion and screams. Fury grows with every heartbeat." },
                            { level: 5, name: 'Ravager', trait: 'Cleave Expert', traitEffect: 'Hitting 2+ enemies refunds 1 Fury.', skill: 'Whirlwind', lore: "Entire warbands fall to your relentless charge. Walls mean nothing — you are the storm that breaks them.", loreEffect: "Specializes in carving through multiple foes. Brutal, efficient, merciless." },
                            { level: 8, name: 'Bloodrunner', trait: 'Kill Rush', traitEffect: 'Killing an enemy grants +2 Fury & an extra turn (once/turn).', skill: 'Lunge', lore: "You are a predator in the chaos of war, darting from kill to kill with uncanny speed.", loreEffect: "Thrives on momentum and relentless pursuit. A killing blow only fuels the next." },
                            { level: 11, name: 'Dragon Slayer', trait: 'Scale Breaker', traitEffect: '+50% crit dmg vs Large enemies; immune to fear.', skill: 'Sever Spine', unlockTrigger: 'slaying a named dragon boss', lore: "The world whispers your name with awe and fear — you have slain what should not be slain.", loreEffect: "Dragons are your prey now. Scales, fire, and legends fall before you." },
                            { level: 14, name: 'Wyrm’s End', trait: 'Boss kills grant permanent +1% all stats.', traitEffect: 'Boss kills grant permanent +1% all stats.', skill: 'Dragon’s Dominion', ascended: true, lore: "No beast can stand before you. Every victory adds to your legend — and to your strength.", loreEffect: "Every boss slain empowers you permanently. Hunters become myths; myths becomes eternal." }
                        ]
                    },
                    'warden': {
                        name: 'Warden',
                        theme: 'Battlefield control, marking enemies, terrain effects.',
                        mechanic: 'Vigil — gain 1 at the end of each round in which an enemy you marked took damage.',
                        resourceEvolution: [
                            { level: 3, stage: 'Warden', type: 'Vigil' }
                        ],
                        stages: [
                            { level: 3, name: 'Warden', trait: 'Hunter’s Instinct', traitEffect: 'First Mark each turn is free.', skill: 'Pincushion', lore: "You see the flow of battle not in blows, but in movement. Every step an enemy takes is a step you predicted.", loreEffect: "Master of marks and battlefield control. Strikes with precision to disable and corner foes." },
                            { level: 5, name: 'Sentinel', trait: 'Zone Control', traitEffect: 'Enemies entering your zone take 5–8 dmg.', skill: 'Lockstep', lore: "You do not merely guard — you define the ground on which battles are fought.", loreEffect: "Creates danger zones enemies fear to enter. Patience turns defense into opportunity." },
                            { level: 8, name: 'Wardcaller', trait: 'Synergy Marks', traitEffect: 'Marks increase ally dmg by 10%.', skill: 'Expose Weakness', lore: "Every mark you place calls allies to action. Your enemies are no longer fighting one warrior, but an army moving as one.", loreEffect: "Turns ally attacks into devastating follow-ups. The battlefield hums with your commands." },
                            { level: 11, name: 'Bastion', trait: 'Fortified Presence', traitEffect: 'Allies in zone gain +5 armor.', skill: 'Fortress', lore: "You are the center of an unbreakable fortress. Allies thrive in your presence; enemies wither under your gaze.", loreEffect: "Creates safe havens amid chaos. Defense is your weapon." },
                            { level: 14, name: 'Iron Dominion', trait: 'Zones persist between rooms, start stacked by +1.', traitEffect: 'Zones persist between rooms and start stacked by 1.', skill: 'Total Lockdown', ascended: true, lore: "Your control extends beyond the battlefield — the land itself obeys. The war does not reset between battles, for the war is yours now.", loreEffect: "Zones persist, carrying your influence across the campaign. A living wall, impossible to breach." }
                        ]
                    }
                }
            },
            'necromancer': {
                base: { name: 'Necromancer', description: 'Master of death magic, summoning, and decay.' },
                branches: {
                    'bone_warden': {
                        name: 'Bone Warden',
                        theme: 'Tanky undead armies & physical defense.',
                        mechanic: 'Bone Armor — reduces dmg by 2% per minion alive (max 10%).',
                        resourceEvolution: [],
                        stages: [
                            { level: 3, name: 'Bone Warden', trait: 'Grave Command', traitEffect: 'Minions focus the last enemy you attacked.', skill: 'Bone Wall', lore: "Your minions stand in a ring of brittle bone, a shield wall from another world." },
                            { level: 5, name: 'Ossified Champion', trait: 'Minions gain +20% HP', traitEffect: 'Your summoned minions are tougher, granting them increased durability.', skill: 'Shield of the Dead', upgrade: 'Skeletons now deal 6–9 dmg/turn.', lore: "Your summons no longer creak like rotted wood — they march with the weight of stone." },
                            { level: 8, name: 'Gravekeeper', trait: 'Bone Fortress', traitEffect: '+1% dmg reduction per minion (max 15%).', skill: 'Raise Ghoul', lore: "You no longer wait for death to find your army — you harvest it." },
                            { level: 11, name: 'Death Knight', trait: 'Summons deal +25% dmg', traitEffect: 'Your summoned creatures strike with terrifying force.', skill: 'Reaper’s Charge', upgrade: 'All summons gain +25% dmg.', lore: "You ride at the head of your host, steel and shadow made one." },
                            { level: 14, name: 'Black Pharaoh', trait: '+3 max minions; all summons gain AOE attacks', traitEffect: 'Your legion grows vast, each servant capable of sweeping strikes.', skill: 'March of Endless Bones', ascended: true, lore: "Your throne is a tomb. Your crown, the dust of empires." }
                        ]
                    },
                    'plaguecaller': {
                        name: 'Plaguecaller',
                        theme: 'Disease, rot, and battlefield-wide decay.',
                        mechanic: 'Infection Stacks — DoTs can stack 3x on the same enemy.',
                        resourceEvolution: [],
                        stages: [
                            { level: 3, name: 'Plaguecaller', trait: 'Virulent Touch', traitEffect: 'All basic attacks apply 1 stack of [Infected].', skill: 'Contagion', lore: "Your touch sours flesh; your breath curdles the air." },
                            { level: 5, name: 'Pestilent Sage', trait: 'DoTs last +1 turn', traitEffect: 'Your applied blights linger longer, ensuring a slow, agonizing demise.', skill: 'Black Spit', upgrade: 'DoTs last 1 extra turn.', lore: "Every sickness is a verse in your scripture." },
                            { level: 8, name: 'Rotbringer', trait: 'Plague Reservoir', traitEffect: 'Killing an infected enemy refunds 1 Soul Energy.', skill: 'Corpse Bloom', lore: "The dead are not still. They swell, they split — and they serve you." },
                            { level: 11, name: 'Harbinger of Decay', trait: 'All infections deal +2 dmg/turn', traitEffect: 'Your infections become deadlier, gnawing faster at your foes.', skill: 'Plague Wind', upgrade: 'All infections deal +2 dmg/turn.', lore: "Your shadow carries plague like wind carries rain." },
                            { level: 14, name: 'Plague Sovereign', trait: 'All DoTs become true dmg, ignore resistances.', traitEffect: 'Your diseases cut through any defense, rendering enemies utterly vulnerable.', skill: 'Plague of Ages', ascended: true, lore: "Your realm is pestilence, your flag a blackened lung." }
                        ]
                    },
                    'soulbinder': {
                        name: 'Soulbinder',
                        theme: 'Soul manipulation, linking, possession.',
                        mechanic: 'Soul Chains — Linked enemies share damage.',
                        resourceEvolution: [],
                        stages: [
                            { level: 3, name: 'Soulbinder', trait: 'Binding Will', traitEffect: 'Links last 1 extra turn.', skill: 'Soul Chain', lore: "Threads unseen tie life to death — you pluck them at will." },
                            { level: 5, name: 'Chain of Woe', trait: 'Wound Transfer', traitEffect: 'Linked enemies take +10% dmg from all sources.', skill: 'Soul Chain', upgrade: 'Can link up to 3 enemies.', lore: "Your chains stretch across the battlefield, binding more than flesh." },
                            { level: 8, name: 'Wraithlord', trait: 'Spirit Lash', traitEffect: 'Linked enemies take 3 dmg/turn.', skill: 'Possession', lore: "Your will spills from your skull into theirs." },
                            { level: 11, name: 'Eidolon King', trait: 'You heal for 100% of Soul Feast dmg', traitEffect: 'Every heartbeat steals from them to feed you.', skill: 'Soul Feast', upgrade: 'You heal for 100% of Soul Feast dmg.', lore: "Your enemies live in agony, not from wounds, but from your pull." },
                            { level: 14, name: 'Eternal Lich', trait: 'Undying Will', traitEffect: 'First death per fight resurrects you at 50% HP.', skill: 'Eternal Lich Unmake', upgrade: 'Soul Feast becomes free to cast once per fight.', ascended: true, lore: "Your body is a memory; your soul is iron.", secretEvolutionTrigger: true }
                        ]
                    }
                }
            },
            'rogue': {
                base: { name: 'Rogue', description: 'Fast, evasive, precision damage dealer.' },
                branches: {
                    'assassin': {
                        name: 'Assassin',
                        theme: 'Stealth, critical strikes, and instant kills.',
                        mechanic: 'Stealth Tokens — gain 1 when you dodge or kill; spend for guaranteed crits.',
                        resourceEvolution: [
                            { level: 3, stage: 'Assassin', type: 'Stealth Tokens' }
                        ],
                        stages: [
                            { level: 3, name: 'Assassin', trait: '+25% crit dmg', traitEffect: 'Your critical strikes deal more damage.', skill: 'Shadowstep', lore: "You become one with the shadows, striking from unseen angles with deadly precision." },
                            { level: 5, name: 'Shadowblade', trait: 'Garrote applies Silence for 1 turn', traitEffect: 'Your Garrote skill now silences enemies, preventing them from casting spells.', skill: 'Garrote', lore: "Your blade is a phantom, slipping past defenses to find the vital points. Silence is your deadliest weapon." },
                            { level: 8, name: 'Phantom', trait: 'Marked for Death deals +50% dmg', traitEffect: 'Marked enemies take significantly more damage from your attacks.', skill: 'Marked for Death', lore: "You move like a ghost, marking your prey for a swift and inevitable demise. They never see it coming." },
                            { level: 11, name: 'Death’s Whisper', trait: '+50% crit dmg', traitEffect: 'Your critical strikes become even more devastating.', skill: 'Assassinate', lore: "You become the embodiment of death itself, a whisper in the dark that silences all opposition. None escape your final judgment." },
                            { level: 14, name: 'Death’s Whisper (Ascended)', trait: 'Start every fight in Stealth.', traitEffect: 'You begin every combat encounter hidden from your enemies, allowing for a decisive opening strike.', skill: 'Assassinate', ascended: true, lore: "You are the ultimate assassin, a legend whispered in hushed tones. Your presence is death, swift and unseen." }
                        ]
                    },
                    'duelist': {
                        name: 'Duelist',
                        theme: 'Agile melee, counterattacks, and flurries.',
                        mechanic: 'Combo Points — basic attacks generate points, finishers consume them.',
                        resourceEvolution: [
                            { level: 3, stage: 'Duelist', type: 'Combo Points' }
                        ],
                        stages: [
                            { level: 3, name: 'Duelist', trait: 'Riposte deals +50% dmg', traitEffect: 'Your counterattacks strike with increased force, punishing your aggressors.', skill: 'Riposte', lore: "Every parry is an invitation, every dodge a dance. You turn the enemy's aggression against them." },
                            { level: 5, name: 'Swashbuckler', trait: 'Can parry ranged attacks', traitEffect: 'You can now deflect projectiles, extending your defensive prowess.', skill: 'Flurry', lore: "With a flourish and a grin, you weave through the fray, a whirlwind of steel and daring. The battlefield is your stage." },
                            { level: 8, name: 'Blade Dancer', trait: 'Combo finishers refund 1 Energy', traitEffect: 'Your finishing moves become more efficient, allowing for sustained offense.', skill: 'Flurry', lore: "Your movements are poetry in motion, a deadly ballet of blades. Each strike flows seamlessly into the next." },
                            { level: 11, name: 'Crimson Vortex', trait: 'Blade Storm hits all enemies twice', traitEffect: 'Your ultimate attack now strikes every enemy twice, creating a devastating area of effect.', skill: 'Blade Storm', lore: "You become a crimson maelstrom, a whirlwind of lethal intent. None can escape your furious dance of death." },
                            { level: 14, name: 'Crimson Vortex (Ascended)', trait: 'All finishers cost 0 Energy for first 2 turns.', traitEffect: 'Your finishing moves become free to cast for the initial turns of combat, allowing for an explosive opening.', skill: 'Blade Storm', ascended: true, lore: "You are the embodiment of pure martial artistry, a living storm of blades. Your presence tears through any opposition." }
                        ]
                    },
                    'saboteur': {
                        name: 'Saboteur',
                        theme: 'Traps, gadgets, and control.',
                        mechanic: 'Trap Charges — max 3 active at once.',
                        resourceEvolution: [
                            { level: 3, stage: 'Saboteur', type: 'Trap Charges' }
                        ],
                        stages: [
                            { level: 3, name: 'Saboteur', trait: 'Caltrops apply -50% speed for 2 turns', traitEffect: 'Your caltrops significantly reduce enemy movement, controlling the battlefield.', skill: 'Caltrops', lore: "The battlefield is your playground, and your enemies are merely pawns in your deadly game of traps and diversions." },
                            { level: 5, name: 'Trickster', trait: 'Smoke Bomb blinds enemies (-25% hit chance, 1 turn)', traitEffect: 'Your smoke bombs now blind foes, making them miss their attacks.', skill: 'Smoke Bomb', lore: "You revel in chaos and confusion, using misdirection and cunning to outwit your opponents. They never know what hit them." },
                            { level: 8, name: 'Smoke Phantom', trait: 'Traps deal +50% dmg', traitEffect: 'Your deployed traps become deadlier, inflicting more damage upon activation.', skill: 'Poison Trap', lore: "You move through the smoke and shadows like a wraith, your traps appearing from nowhere to ensnare your unsuspecting foes." },
                            { level: 11, name: 'Shadow Engineer', trait: 'Clockwork Bomb deals 20-28 dmg AOE', traitEffect: 'Your clockwork bombs unleash a devastating explosion, damaging multiple enemies.', skill: 'Clockwork Bomb', lore: "Your mind is a forge of cunning devices, each one a testament to your mastery of demolition and strategic disruption. No obstacle can stand in your way." },
                            { level: 14, name: 'Shadow Engineer (Ascended)', trait: 'Can place traps instantly without ending turn.', traitEffect: 'You can deploy traps with unparalleled speed, allowing for dynamic and reactive battlefield control.', skill: 'Clockwork Bomb', ascended: true, lore: "You are the ultimate architect of chaos, your traps and gadgets transforming the battlefield into a death trap for your enemies. None can escape your intricate designs." }
                        ]
                    }
                }
            },
            'mage': {
                base: { name: 'Mage', description: 'Ranged magic damage dealer, battlefield manipulator.' },
                branches: {
                    'elementalist': {
                        name: 'Elementalist',
                        theme: 'Fire, ice, lightning — raw power.',
                        mechanic: 'Elemental Resonance — casting same element twice in a row gives +50% dmg.',
                        resourceEvolution: [
                            { level: 3, stage: 'Elementalist', type: 'Mana' }
                        ],
                        stages: [
                            { level: 3, name: 'Elementalist', trait: 'Elemental Affinity', traitEffect: 'Casting same element twice in a row gives +50% dmg.', skill: 'Fireball', lore: "You command the primal forces of nature, weaving fire, ice, and lightning into devastating spells." },
                            { level: 5, name: 'Pyromancer', trait: 'Fireball leaves Burn', traitEffect: 'Your Fireball spell now inflicts a damage-over-time effect.', skill: 'Fireball', upgrade: 'Fireball leaves Burn (3 dmg/turn).', lore: "The flames within you burn brighter, transforming you into a conduit of pure destructive fire. Your enemies will be incinerated." },
                            { level: 8, name: 'Stormcaller', trait: 'Lightning Arc chains to 2 extra enemies', traitEffect: 'Your Lightning Arc spell now strikes multiple targets, arcing between foes.', skill: 'Lightning Arc', upgrade: 'Lightning Arc chains to 2 extra enemies.', lore: "The fury of the storm answers your call, unleashing torrents of lightning and wind upon your enemies. Chaos is your ally." },
                            { level: 11, name: 'Archmage', trait: 'Mix elements for hybrid effects', traitEffect: 'You can combine different elemental spells for unique and powerful hybrid effects.', skill: 'Fireball', upgrade: 'Mix elements for hybrid effects (fire+ice=steam slow, etc.).', lore: "You transcend the boundaries of individual elements, becoming a true master of arcane forces. All magic bends to your will." },
                            { level: 14, name: 'Worldflame', trait: 'All elements gain +1 extra effect', traitEffect: 'Your elemental spells gain additional powerful effects, augmenting their destructive potential.', skill: 'Worldflame', ascended: true, lore: "You are the living embodiment of elemental fury, a cataclysm walking. Worlds burn and freeze at your command." }
                        ]
                    },
                    'illusionist': {
                        name: 'Illusionist',
                        theme: 'Deception, control, stealing magic.',
                        mechanic: 'Deception Tokens — gain from dodging or avoiding hits; spend to reflect or steal spells.',
                        resourceEvolution: [
                            { level: 3, stage: 'Illusionist', type: 'Deception Tokens' }
                        ],
                        stages: [
                            { level: 3, name: 'Illusionist', trait: 'Mirror Image avoids next hit', traitEffect: 'Your Mirror Image spell guarantees evasion of the next incoming attack.', skill: 'mirrorImage', lore: "You weave veils of illusion, twisting perception and confounding your enemies. Reality is merely a suggestion." },
                            { level: 5, name: 'Shadowmind', trait: 'Confuse has 50% chance enemy skips turn', traitEffect: 'Your Confuse spell has a chance to make enemies skip their turn entirely.', skill: 'confuse', lore: "You delve into the minds of your foes, planting seeds of doubt and fear. Their thoughts become your playground." },
                            { level: 8, name: 'Spellthief', trait: 'Steal enemy’s last used skill for 2 turns', traitEffect: 'You can temporarily steal an enemy’s recently used skill, turning their power against them.', skill: 'stealSkill', lore: "You do not merely counter magic; you claim it. Their spells become your tools, their power your own." },
                            { level: 11, name: 'Mindweaver', trait: 'Multi-target illusions, up to 3 enemies skip turn', traitEffect: 'Your illusions can affect multiple enemies, causing widespread disruption.', skill: 'multiTargetIllusions', upgrade: 'Multi-target illusions, up to 3 enemies skip turn.', lore: "Your mental dominion expands, weaving intricate illusions that ensnare the minds of many. Entire battlefields fall silent under your influence." },
                            { level: 14, name: 'Arcane Hollow', trait: 'Permanently remove 1 skill from enemy on hit; needed for Reality Breaker Legendary.', traitEffect: 'Your attacks can permanently strip enemies of their abilities, crippling them for the entire encounter.', skill: 'Arcane Hollow', ascended: true, lore: "You are a void in the weave of magic, consuming spells and abilities with every touch. The very essence of magic unravels before you." }
                        ]
                    },
                    'chronomancer': {
                        name: 'Chronomancer',
                        theme: 'Time control, turn manipulation, support.',
                        mechanic: 'Time Charges (gain 1/turn, store 3; spend to act twice).',
                        resourceEvolution: [
                            { level: 3, stage: 'Chronomancer', type: 'Time Charges' }
                        ],
                        stages: [
                            { level: 3, name: 'Chronomancer', trait: 'Haste grants ally extra turn', traitEffect: 'Your Haste spell grants an ally an immediate extra turn, accelerating their actions.', skill: 'haste', lore: "You bend the fabric of time, accelerating allies and slowing foes. The battlefield moves to your rhythm." },
                            { level: 5, name: 'Timebinder', trait: 'Slow makes enemy lose next turn', traitEffect: 'You can cause an enemy to completely lose their next turn, disrupting their actions.', skill: 'slow', lore: "You knot the threads of fate, ensnaring enemies in temporal distortions. Their movements become sluggish, their actions delayed." },
                            { level: 8, name: 'Riftseer', trait: 'Revert ally to HP they had 2 turns ago', traitEffect: 'You can rewind an ally’s health state, undoing recent damage or debuffs.', skill: 'revertHp', lore: "You gaze into the echoes of the past, pulling fragments of what was to mend what is. Time is a tool in your hands." },
                            { level: 11, name: 'Epoch Guardian', trait: 'Freeze time for 1 turn (enemies can’t act)', traitEffect: 'You can momentarily halt the flow of time for your enemies, rendering them immobile.', skill: 'freezeTime', lore: "You stand as a bulwark against the ravages of time, able to halt its relentless march for your foes. The present is yours to command." },
                            { level: 14, name: 'Eternal Architect', trait: 'Rearrange entire turn order for 3 turns.', traitEffect: 'You can completely reorder the combat sequence for a limited time, dictating who acts when.', skill: 'rearrangeTurnOrder', ascended: true, lore: "You are the master of causality, the architect of destiny. Time is but clay in your hands, to be molded as you see fit." }
                        ]
                    }
                }
            }
        };

        // --- Legendary and Secret Class Data (Not part of direct evolution tree) ---
        const legendaryAndSecretClasses = {
            'deathlord_eternal': {
                name: 'Deathlord Eternal',
                description: 'The ultimate master of undeath, capable of limitless legions and absolute dominion over the fallen.',
                unlockPath: 'Eternal Lich (Necromancer) + Abyssal King (Warrior) + Throne of Bones event.',
                mechanic: 'Legion of the Dead — Unlimited minion cap for 5 turns.',
                signatureSkill: 'Death’s Dominion',
                lore: "You do not command the dead — you are the dead. Every corpse is your tongue, every bone your banner."
            },
            'the_hollow_king': {
                name: 'The Hollow King',
                description: 'A crown of absence. A throne of silence. The world itself forgets your name.',
                uponUnlock: "You wake to silence. The wind does not stir. The earth does not move. The throne you sit upon is carved from nothing, and in that nothing… you reign.",
                unlockConditions: 'Start Necromancer (Soulbinder path). Reach Eternal Lich. During Throne of Bones, die while controlling at least 3 enemy souls. Revive not as yourself, but as The Hollow King.',
                identity: "A being stripped of self, ruling through the absence of all things. He is the echo of a soul that was, filled with the weight of what is not.",
                coreResource: { type: 'Hollow Will', initial: 0, max: 5, gain: 'from erasing enemies (permanent removal from battle)' },
                passives: [
                    { name: 'Life Inversion', effect: 'Damage heals you; healing damages you.' },
                    { name: 'Soul Erasure', effect: 'Kills leave no corpse; enemies cannot be revived.' },
                    { name: 'Unshackled Command', effect: 'Unlimited summons, but each drains 2% max HP/turn.' },
                    { name: 'Crown of the Undying', effect: 'If you die, resurrect next turn with 30% HP. Consumes all Hollow Will and permanently reduces max HP by 10%. Cannot trigger if max HP is below 25% of original.' }
                ],
                skills: ['Unmake', 'Echo of Nothing'],
                overdrive: { name: 'Oblivion’s Call', description: 'Erase the entire enemy team for 1 turn; they cannot act or be targeted.' }
            },
            'reality_breaker': {
                name: 'Reality Breaker',
                description: 'A being who shatters the very fabric of existence, twisting reality to their will.',
                unlockPath: 'Arcane Hollow (Mage) + ??? event.',
                lore: "You are the ultimate truth, the ultimate lie. Reality itself is a malleable canvas for your desires."
            }
        };

        // How each resource behaves in combat.
        //   startOfFight: value it resets to when a fight begins (capped at your max)
        //   regen: per round   onDodge / onKill / onBasicAttack / onDamageTaken / onGuard: per event
        //   onMarkedHitRound: per round in which a marked enemy took damage
        // Branch rules come from each branch's `mechanic` text; numbers marked (*) are placeholders to review.
        const resourceRules = {
            // base classes
            'Momentum':         { startOfFight: 1 },               // Warrior "Battle-Ready"
            'Mana':             { startOfFight: 6 },
            'Energy':           { startOfFight: 6 },
            'Soul Energy':      { startOfFight: 1 },
            'Hollow Will':      { startOfFight: 0 },
            // branches
            'Oath Points':      { startOfFight: 1, regen: 0, onGuard: 1 },          // (*) no gain rule in design
            'Sin Marks':        { startOfFight: 0, regen: 0, onKill: 1 },           // (*) no gain rule in design
            'Fury Gauge':       { startOfFight: 0, regen: 0, onDamageTaken: 1 },    // (*) no gain rule in design
            'Vigil':            { startOfFight: 1, regen: 0, onMarkedHitRound: 1 },
            'Stealth Tokens':   { startOfFight: 1, regen: 0, onDodge: 1, onKill: 1 },
            'Combo Points':     { startOfFight: 0, regen: 0, onBasicAttack: 1 },
            'Trap Charges':     { startOfFight: 3 },                                // (*) keeps Rogue regen
            'Deception Tokens': { startOfFight: 1, regen: 0, onDodge: 1 },
            'Time Charges':     { startOfFight: 1, regen: 1 }
        };

        // ===================================================================
        // STATUS EFFECTS — per "Status Effects: Approved Design Handoff"
        // `null` = PENDING director decision. A pending value keeps that feature OFF.
        // Run `node tools/pending-decisions.js` for the full list.
        //
        //   category   used by selective cleansing (taxonomy is PROVISIONAL — see pending list)
        //   maxStacks  intensity cap; null -> statusRules.defaultMaxStacks (1 = refresh only, today's behaviour)
        //   control    'hard' | 'soft' | false  Control Resistance class (Vaelis Package 2, CR-01/CR-03).
        //              A status that skips a turn (type 'skip_turn') always counts as hard, whatever this says.
        //   binary     soft control with no strength to halve (Silence): resisted outright at CR 80+
        //   overflow   { baseChance, chanceStep, maxChance, burstMultiplier } — all PENDING; null = no overflow
        // ===================================================================
        const statusDefinitions = {
            // --- damage over time
            'Infection':        { category: 'dot', type: 'dot', value: 2, maxStacks: 3, duration: 3, overflow: null }, // values preserved from v1 (approved to keep)
            'Bleed':            { category: 'dot', type: 'dot', maxStacks: null, overflow: null },
            'Poison':           { category: 'dot', type: 'dot', maxStacks: null, overflow: null },
            'Soul Feast':       { category: 'dot' },
            'Soul Chain':       { category: 'debuff' },
            // --- turn denial / control
            'Stun':             { category: 'control', control: 'hard' },
            'Frozen in time':   { category: 'control', control: 'hard' },   // Freeze Time: hard per affected target
            'Confused':         { category: 'control', control: 'hard' },   // only applied when the roll skips the turn
            'Entranced':        { category: 'control', control: 'hard' },
            'Silence':          { category: 'control', control: 'soft', binary: true }, // forces Basic Attack
            'Slow':             { category: 'debuff',  control: 'soft' },   // speed only, never skips a turn (Keel §2)
            'Blind':            { category: 'debuff',  control: false },    // a hit-chance debuff, not control
            'Possessed':        { category: 'control', control: 'hard', refuseTiers: ['boss'], refuseAtCr: 75 }, // N-5: refused before cost for bosses and at 75+ CR
            // --- marks
            'Pin':              { category: 'mark', control: false },       // an ordinary mark (CR-03)
            'Expose':           { category: 'mark', expiry: { type: 'applier_turns', onApplierDeath: 'end_of_round' } },             // QA-1 (approved Option A + applier-death ruling)
            'Weaken':           { category: 'mark' },
            'Marked for Death': { category: 'mark', expiry: { type: 'applier_turns', consumeOn: 'positive_allied_hit', onApplierDeath: 'end_of_round' } }, // QA-1
            // --- buffs
            'Guard':            { category: 'buff', expiry: { type: 'holder_next_turn_start' } },   // QA-1
            'Bone Wall':        { category: 'buff' },
            'Evasion':          { category: 'buff' },
            'Mirror Image':     { category: 'buff' },
            'Riposte':          { category: 'buff' },
            'Guaranteed Crit':  { category: 'buff' },
            'Taunt':            { category: 'buff' },
            'Dragon’s Dominion': { category: 'buff' },     // QA-15: so a buff cleanse sees it, like every other status
            // --- bookkeeping statuses from apply_status (no gameplay effect yet)
            'Channel Cooldown':     { category: 'cooldown' },
            'accuracy_buff_enemy':  { category: 'buff' },
            'Evasion Debuff':       { category: 'debuff' }
        };

        const statusRules = {
            defaultMaxStacks: 1,              // statuses without an approved cap don't stack (refresh only)
            // Control Resistance: Vaelis Package 2 (docs/design/VAELIS_PACKAGE_2_CONTROL_RESISTANCE.md), approved 2026-10-23.
            // Fight-local integer per combatant. Engine: src/statuses.js, "Control Resistance".
            controlResistance: {
                max: 100,
                start: { regular: 0, elite: 25, boss: 60, player: 0, summon: 0 },   // CR-01: by tier, reset every fight
                gain: { hard: 35, soft: 20 },   // after a successful application; one cast gives one target its largest gain once
                capAt: 50,                      // CR 50–79 before application: duration capped at capTurns
                resistAt: 80,                   // CR 80+: hard resisted; soft at softStrength for capTurns; binary soft resisted
                capTurns: 1,
                softStrength: 0.5,              // rounded toward zero
                decayPerOpportunity: 10,        // end of a holder opportunity (skipped ones too) with no successful control since the last
                decayFloor: 0,
                noConsecutiveHardSkip: ['boss'] // tiers that can't lose two normal opportunities in a row to hard control
            },
            // Affinity effects: 'immune' blocks the status (unambiguous). What resist / vulnerable DO is PENDING,
            // e.g. { durationMult: 0.5 } — the engine supports durationMult once a value is approved.
            affinityEffects: { resist: null, vulnerable: null }
        };
        // Enemy affinity tables (PENDING) go on each enemy: statusAffinities: { Bleed: 'immune', Poison: 'resist' }

        // Cross-status reaction recipes (PENDING — none approved yet). Shape:
        //   { name, pair: ['StatusA', 'StatusB'], baseChance: 0.25, outcome: [{ type: 'damage', amount }, { type: 'remove_statuses', statuses: [...] }, { type: 'apply_status', status: {...} }] }
        // Triggers only when one status of the pair is applied to a target already holding the other.
        const statusReactions = [];

        // Items you can `use`. Anything not listed is a keepsake (for now).
        const itemDefinitions = {
            'Moldy Bread':           { use: 'heal', value: 8,  description: 'Better than nothing. Probably.' },
            'Half-full Wine Bottle': { use: 'heal', value: 12, description: 'Sour, but it takes the edge off.' },
            'Bandages':              { use: 'heal', value: 25, description: 'Clean enough.' },
            'Healing Herb Bundle':   { use: 'heal', value: 40, description: 'Bitter leaves that knit flesh.' }
        };

        // Global balance knobs.
        const gameRules = {
            statDamagePer: 4,          // +1 damage per 4 points of the scaling stat
            physicalStat: { default: 'strength', rogue: 'agility' },
            magicStat: 'intelligence',
            magicTypes: ['magic', 'fire', 'ice', 'lightning', 'radiant'],
            postFightHealPct: 0.2,     // catch your breath after a victory
            baseMinionCap: 3,          // Black Pharaoh adds +3
            defaultEnemyXp: 15
        };

        // Item swaps per class when picking things up (was referenced but never defined).
        // Example: 'Ritual Dagger': { necromancer: 'Bone-Hilted Ritual Dagger' }
        const adaptiveLoot = {};

        // Every skill knows its own name (the engine relies on skill.name).
        for (const key of Object.keys(skillDefinitions)) skillDefinitions[key].name = key;

        const data = {
            rooms, enemies, minionDefinitions, skillDefinitions, skillAliases,
            basePlayerClasses, evolutionPaths, legendaryAndSecretClasses, adaptiveLoot, resourceRules, itemDefinitions, gameRules,
            statusDefinitions, statusRules, statusReactions
        };

        const ENSO = global.ENSO || (global.ENSO = {});
        ENSO.data = data;
        if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
