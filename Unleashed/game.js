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
                    'north': 'wooden_door_room',
                    'east': 'dark_passage'
                },
                enemies: ['weak_goblin','James_Newton'], // Example: Add enemies to a room
                items: ['Grigamba stone']
            },
            'wooden_door_room': {
                description: "You stand before a massive, reinforced wooden door. It looks incredibly sturdy. There's nothing else here. You can go back south.",
                exits: {
                    'south': 'starting_room'
                },
                items: []
            },
            'dark_passage': {
                description: "The passage is cold and smells of stale air. You hear dripping water somewhere ahead. You can go west to return to the cellar, or continue deeper east.",
                exits: {
                    'west': 'starting_room',
                    'east': 'cavern_entrance'
                },
                enemies: ['hungry_wolf', 'weak_goblin'], // More enemies
                items: []
            },
            'cavern_entrance': {
                description: "The dark passage opens into a small, echoing cavern. A faint, glowing mushroom illuminates the damp walls. There's a shimmering pool of water in the center. You can go west to the dark passage.",
                exits: {
                    'west': 'dark_passage'
                },
                items: ['glowing mushroom']
            }
        };

        // --- Enemy Definitions ---
        const enemies = {
                'James_Newton': {
                name: 'James Newton',
                hp: 666,
                maxHp: 666,
                atk: 666,
                def: 666,
                spd: 666,
                critChance: 666,
                critMultiplier: 666,
                resistances: [],
                specialFlags: [],
                skills: [{ name: 'Slash', description: 'Deals 6-66 damage.', base_damage: [6, 66], target: 'player', damage_type: 'physical' }]
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
            }
            // Add more enemies here
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
            'Guard': { description: 'Reduce incoming damage by 25% next turn.', cost: 0, resource: 'Momentum', effects: [{ type: 'damage_reduction', value: 0.25, duration: 1 }], target: 'self' },
            'Power Strike': { description: 'Spend 2 Momentum to deal 14–20 damage.', cost: 2, resource: 'Momentum', base_damage: [14, 20], target: 'enemy_single', damage_type: 'physical' },
            'War Cry': { description: 'Gain +1 Momentum, enemy gets +accuracy next attack.', cost: 0, resource: 'Momentum', effects: [{ type: 'gain_resource', resource: 'Momentum', value: 1 }, { type: 'apply_status', status: 'accuracy_buff_enemy', value: 0.1, duration: 1 }], target: 'self' }, // Safety valve

            // Vanguard Branch Skills
            'Shield Bash': { description: 'Deal 10–14 damage, stun 1 turn if Momentum ≥ 3.', cost: 0, resource: 'Momentum', base_damage: [10, 14], effects: [{ type: 'stun', duration: 1, condition: { stat: 'Momentum', operator: '>=', value: 3 } }], target: 'enemy_single', damage_type: 'physical', combatFlavor: "Your shield rings out like a drum, shaking the foe’s footing." },
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
            'Pincushion': { description: 'Apply [Pin] Mark, reducing target speed by 50%.', cost: 0, resource: 'Marks', effects: [{ type: 'apply_mark', mark: 'Pin', value: 0.5, duration: 2 }], target: 'enemy_single', damage_type: 'utility', combatFlavor: "The enemy’s advance falters as your spear finds its mark." },
            'Lockstep': { description: 'Taunt enemies in your zone for 1 turn.', cost: 1, resource: 'Marks', effects: [{ type: 'taunt_aoe', duration: 1 }], target: 'enemy_aoe', damage_type: 'utility' },
            'Expose Weakness': { description: 'Apply [Expose] Mark, increasing dmg taken by 20% for 2 turns.', cost: 1, resource: 'Marks', effects: [{ type: 'apply_mark', mark: 'Expose', value: 0.2, duration: 2 }], target: 'enemy_single', damage_type: 'utility' },
            'Fortress': { description: 'Create a zone lasting 3 turns, allies take -20% dmg inside.', cost: 2, resource: 'Marks', effects: [{ type: 'create_zone', zone: 'Fortress', duration: 3, effect: { type: 'damage_reduction', value: 0.2 } }], target: 'self', damage_type: 'utility' },

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
            // FIXED: Skill names changed from sentences to camelCase for easier command parsing.
            'mirrorImage': { description: 'Avoid next hit.', cost: 1, resource: 'Deception Tokens', effects: [{ type: 'avoid_next_hit', duration: 1 }], target: 'self' },
            'confuse': { description: '50% chance enemy skips turn.', cost: 2, resource: 'Deception Tokens', effects: [{ type: 'skip_turn_chance', value: 0.5, duration: 1 }], target: 'enemy_single' },
            'stealSkill': { description: 'Steal enemy’s last used skill for 2 turns.', cost: 3, resource: 'Deception Tokens', effects: [{ type: 'steal_skill', duration: 2 }], target: 'enemy_single' },
            'multiTargetIllusions': { description: 'Up to 3 enemies skip turn.', cost: 4, resource: 'Deception Tokens', effects: [{ type: 'skip_turn_aoe', count: 3, duration: 1 }], target: 'enemy_aoe' },

            // Chronomancer Branch Skills
            // FIXED: Skill names changed from sentences to camelCase for easier command parsing.
            'haste': { description: 'Ally takes extra turn.', cost: 2, resource: 'Time Charges', effects: [{ type: 'extra_turn' }], target: 'ally_single' },
            'slow': { description: 'Enemy loses next turn.', cost: 2, resource: 'Time Charges', effects: [{ type: 'skip_turn', duration: 1 }], target: 'enemy_single' },
            'revertHp': { description: 'Revert ally to HP they had 2 turns ago.', cost: 3, resource: 'Time Charges', effects: [{ type: 'revert_hp', turns: 2 }], target: 'ally_single' },
            'freezeTime': { description: 'Enemies can’t act for 1 turn.', cost: 5, resource: 'Time Charges', effects: [{ type: 'freeze_enemies', duration: 1 }], target: 'all_enemies' },
            'rearrangeTurnOrder': { description: 'Rearrange entire turn order for 3 turns.', cost: 'all', resource: 'Time Charges', effects: [{ type: 'rearrange_turn_order', duration: 3 }], target: 'all_combatants' },


            // Ascended Overdrives (Special Skills at max evolution)
            'Oblivion Reign': { description: 'Next 3 turns, all attacks are true dmg & heal you.', cost: 'all', resource: 'Sin Marks', oncePerFight: true, effects: [{ type: 'true_damage_attacks', duration: 3 }, { type: 'heal_on_attack_percent', value: 1 }], target: 'self' },
            'Dragon’s Dominion': { description: 'Triple dmg vs bosses for 1 turn.', cost: 'all', resource: 'Fury Gauge', oncePerFight: true, effects: [{ type: 'bonus_damage_vs_flag_percent', flag: 'boss', value: 2, duration: 1 }], target: 'self' }, // 200% bonus = triple
            'Total Lockdown': { description: 'Enemies can’t move or leave zones for 2 turns.', cost: 'all', resource: 'Marks', oncePerFight: true, effects: [{ type: 'immobilize_enemies', duration: 2 }], target: 'all_enemies' },
            'March of Endless Bones': { description: 'Instantly resurrect all fallen minions and summon 1 free ghoul.', cost: 'all', resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'resurrect_all_minions' }, { type: 'summon', summon_type: 'ghoul', damage: [9, 12], duration: 'permanent' }], target: 'self' }, // Black Pharaoh Ascended
            'Plague of Ages': { description: 'All enemies instantly gain max Infection stacks; infections deal true dmg.', cost: 'all', resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'apply_max_infection_aoe' }, { type: 'infections_true_damage' }], target: 'all_enemies' }, // Plague Sovereign Ascended
            'Death’s Dominion': { description: 'All enemies instantly become undead under your control for 1 turn.', cost: 'all', resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'control_all_enemies', duration: 1 }], target: 'all_enemies' }, // Deathlord Eternal Legendary
            'Unmake': { description: 'Remove a target from the fight permanently.', cost: 5, resource: 'Hollow Will', effects: [{ type: 'remove_from_fight_permanent' }], target: 'enemy_single', damage_type: 'true' }, // Hollow King
            'Echo of Nothing': { description: 'Skip the enemy’s next 2 turns.', cost: 3, resource: 'Hollow Will', effects: [{ type: 'skip_turn', duration: 2 }], target: 'enemy_single' }, // Hollow King
            'Oblivion’s Call': { description: 'Erase the entire enemy team for 1 turn; they cannot act or be targeted.', cost: 'all', resource: 'Hollow Will', oncePerFight: true, effects: [{ type: 'erase_enemies', duration: 1 }], target: 'all_enemies' }, // Hollow King Overdrive
            'Worldflame': { description: 'All elements gain +1 extra effect (burn harder, longer stuns, deeper slows).', cost: 'all', resource: 'Mana', oncePerFight: true, effects: [{ type: 'enhance_all_elements' }], target: 'self' }, // Elementalist Ascended
            'Arcane Hollow': { description: 'Permanently remove 1 skill from enemy on hit; needed for Reality Breaker Legendary.', cost: 'all', resource: 'Deception Tokens', oncePerFight: true, effects: [{ type: 'remove_enemy_skill_on_hit_permanent' }], target: 'self' }, // Illusionist Ascended
            // FIXED: Removed duplicate 'Eternal Architect' skill. 'rearrangeTurnOrder' is now the single source of truth.
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
                name: 'Warrior', // Added name property
                description: "A strong and resilient fighter, adept with weapons.",
                lore: {
                    base: "Steel in your hands, resolve in your heart. You fight because you must — and because no one else will.",
                    // FIXED: Corrected typo "er class" to "starter class" for clarity.
                    role: "Frontline melee, starter class.",
                    identity: "Grit, survival, and the will to push forward."
                },
                startingItems: ['rusty sword', 'wooden shield', 'old key'],
                startingResource: { type: 'Momentum', initial: 1, max: 10 }, // Starts with 1 Momentum due to Battle-Ready
                baseStats: { hp: 120, strength: 10, intelligence: 5, agility: 7, def: 5, critChance: 0.05, critMultiplier: 1.5, baseDamageMin: 8, baseDamageMax: 12 },
                startingSkills: ['Slash', 'Guard', 'Power Strike'],
                startingTraits: [{ name: 'Battle-Ready', effect: 'Start each fight with 1 Momentum.' }]
            },
            'mage': {
                name: 'Mage', // Added name property
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
                name: 'Rogue', // Added name property
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
                name: 'Necromancer', // Added name property
                description: "Master of death magic, summoning, and decay.",
                lore: {
                    base: "Life is fleeting. Death is patient. You are neither.",
                    role: "Master of death magic, summoning, and decay.",
                    identity: "You walk between realms, plucking secrets from cold lips. The living fear you; the dead obey."
                },
                startingItems: ['cracked bone staff', 'small black journal'], // Whispering skull implied narrative item
                startingResource: { type: 'Soul Energy', initial: 1, max: 10 }, // Seeded with 1 Soul Energy
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
                            { level: 3, name: 'Vanguard', trait: 'Shield Discipline', traitEffect: 'Guard reduces 35% dmg instead of 25%.', skill: 'Shield Bash', lore: "Shields up, eyes forward. A Vanguard does not falter — they are the wall upon which the enemy breaks.", loreStance: "Protector first, fighter second.", loreEffect: "Your presence slows the battle to your pace." },
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
                        resourceEvolution: [
                            { level: 3, stage: 'Warden', type: 'Mark Tokens' }
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
                        resourceEvolution: [], // Soul Energy does not evolve in type for this branch
                        stages: [
                            { level: 3, name: 'Bone Warden', trait: 'Grave Command', traitEffect: 'Minions focus the last enemy you attacked.', skill: 'Bone Wall', lore: "Your minions stand in a ring of brittle bone, a shield wall from another world.", loreStance: "Death is your armor.", loreEffect: "The battlefield is a grave, and you are its warden.",
                                synergy: [
                                    'Bone Wall (absorb next hit) → protects you while Soul Energy regenerates',
                                    'Grave Command (minions attack your target) → single-target pressure'
                                ]
                            },
                            { level: 5, name: 'Ossified Champion', trait: 'Minions gain +20% HP', traitEffect: 'Your summoned minions are tougher, granting them increased durability.', skill: 'Shield of the Dead', upgrade: 'Skeletons now deal 6–9 dmg/turn.', lore: "Your summons no longer creak like rotted wood — they march with the weight of stone.", loreStance: "The living quake as they see your legions swell.", loreEffect: "Bone and will, unbroken.",
                                synergy: [
                                    'Shield of the Dead (AOE taunt via minions) → forces enemies to hit minions → builds Bone Armor',
                                    'Skeletons HP +20% → better damage soaking'
                                ]
                            },
                            { level: 8, name: 'Gravekeeper', trait: 'Bone Fortress', traitEffect: '+1% dmg reduction per minion (max 15%).', skill: 'Raise Ghoul', lore: "You no longer wait for death to find your army — you harvest it.", loreStance: "Ghouls tear where skeletons guard.", loreEffect: "Your graveyard is never empty.",
                                synergy: [
                                    'Raise Ghoul (high dmg + Weaken) → reduces enemy threat for longer fights',
                                    'Bone Fortress (extra Bone Armor cap) → big synergy with mass summons'
                                ]
                            },
                            { level: 11, name: 'Death Knight', trait: 'Summons deal +25% dmg', traitEffect: 'Your summoned creatures strike with terrifying force.', skill: 'Reaper’s Charge', upgrade: 'All summons gain +25% dmg.', lore: "You ride at the head of your host, steel and shadow made one.", loreStance: "To see you charge is to know the end is near.", loreEffect: "The dead ride with you.",
                                synergy: [
                                    'Reaper’s Charge (big burst + stun) → creates opening for minion swarm',
                                    'Summons +25% dmg → turns tank army into offensive threat'
                                ]
                            },
                            { level: 14, name: 'Black Pharaoh', trait: '+3 max minions; all summons gain AOE attacks', traitEffect: 'Your legion grows vast, each servant capable of sweeping strikes.', skill: 'March of Endless Bones', ascended: true, lore: "Your throne is a tomb. Your crown, the dust of empires.", loreStance: "Armies of the dead rise at a word.", loreEffect: "All who breathe are subjects-in-waiting.",
                                synergy: [
                                    'March of Endless Bones (Overdrive) → instant army reset mid-fight',
                                    'Max minions +3, all AOE → snowball pressure across enemy team'
                                ],
                                coreLoop: [
                                    'Taunt with minions → soak dmg to build Bone Armor → stun key target → swarm and overwhelm.'
                                ]
                            }
                        ]
                    },
                    'plaguecaller': {
                        name: 'Plaguecaller',
                        theme: 'Disease, rot, and battlefield-wide decay.',
                        mechanic: 'Infection Stacks — DoTs can stack 3x on the same enemy.',
                        resourceEvolution: [], // Soul Energy does not evolve in type for this branch
                        stages: [
                            { level: 3, name: 'Plaguecaller', trait: 'Virulent Touch', traitEffect: 'All basic attacks apply 1 stack of [Infected].', skill: 'Contagion', lore: "Your touch sours flesh; your breath curdles the air.", loreStance: "One cough spreads your kingdom.", loreEffect: "You are the shepherd of rot.",
                                synergy: [
                                    'Contagion (infect + spreads) → creates first [Infected] stack',
                                    'Virulent Touch (passive) → adds [Infected] with basic hits'
                                ]
                            },
                            { level: 5, name: 'Pestilent Sage', trait: 'DoTs last +1 turn', traitEffect: 'Your applied blights linger longer, ensuring a slow, agonizing demise.', skill: 'Black Spit', upgrade: 'DoTs last 1 extra turn.', lore: "Every sickness is a verse in your scripture.", loreStance: "You read the body like an open book.", loreEffect: "Every chapter ends in fever.",
                                synergy: [
                                    'Black Spit (Weaken + DoT) → weakens threats while adding stack 2',
                                    'DoTs last +1 turn → more time for spreads'
                                ]
                            },
                            { level: 8, name: 'Rotbringer', trait: 'Plague Reservoir', traitEffect: 'Killing an infected enemy refunds 1 Soul Energy.', skill: 'Corpse Bloom', lore: "The dead are not still. They swell, they split — and they serve you.", loreStance: "The battlefield blooms with foul flowers.", loreEffect: "Beauty is rot, and rot is yours.",
                                synergy: [
                                    'Corpse Bloom (AOE + infection) → multi-target infection generator',
                                    'Plague Reservoir (refund energy on kill) → keeps infection loop going'
                                ]
                            },
                            { level: 11, name: 'Harbinger of Decay', trait: 'All infections deal +2 dmg/turn', traitEffect: 'Your infections become deadlier, gnawing faster at your foes.', skill: 'Plague Wind', upgrade: 'All infections deal +2 dmg/turn.', lore: "Your shadow carries plague like wind carries rain.", loreStance: "Walls mean nothing; sickness seeps everywhere.", loreEffect: "The end comes not with a roar, but a cough.",
                                synergy: [
                                    'Plague Wind (spread all infections) → perfect for multi-target fights',
                                    'Infections +2 dmg/turn → scaling threat'
                                ]
                            },
                            { level: 14, name: 'Plague Sovereign', trait: 'All DoTs become true dmg, ignore resistances.', traitEffect: 'Your diseases cut through any defense, rendering enemies utterly vulnerable.', skill: 'Plague of Ages', ascended: true, lore: "Your realm is pestilence, your flag a blackened lung.", loreStance: "Disease bows before you.", loreEffect: "Even the immune tremble.",
                                synergy: [
                                    'Plague of Ages (Overdrive) → instant triple stacks on all enemies',
                                    'Infections deal true dmg → ignores resistances entirely'
                                ],
                                coreLoop: [
                                    'Infect → stack DoTs → spread to everyone → let damage tick while defending.'
                                ]
                            }
                        ]
                    },
                    'soulbinder': {
                        name: 'Soulbinder',
                        theme: 'Soul manipulation, linking, possession.',
                        mechanic: 'Soul Chains — Linked enemies share damage.',
                        resourceEvolution: [], // Soul Energy does not evolve in type for this branch
                        stages: [
                            { level: 3, name: 'Soulbinder', trait: 'Binding Will', traitEffect: 'Links last 1 extra turn.', skill: 'Soul Chain', lore: "Threads unseen tie life to death — you pluck them at will.", loreStance: "Pain flows both ways.", loreEffect: "You are the knot no one can untangle.",
                                synergy: [
                                    'Soul Chain (link 2) → every hit doubles in value',
                                    'Binding Will (extra turn on links) → longer uptime'
                                ]
                            },
                            { level: 5, name: 'Chain of Woe', trait: 'Wound Transfer', traitEffect: 'Linked enemies take +10% dmg from all sources.', skill: 'Soul Chain', upgrade: 'Can link up to 3 enemies.', lore: "Your chains stretch across the battlefield, binding more than flesh.", loreStance: "Fear spreads faster than steel.", loreEffect: "All are linked in your web.",
                                synergy: [
                                    'Link up to 3 enemies → massive spread damage potential',
                                    'Wound Transfer (+10% dmg taken) → softens all linked targets'
                                ]
                            },
                            { level: 8, name: 'Wraithlord', trait: 'Spirit Lash', traitEffect: 'Linked enemies take 3 dmg/turn.', skill: 'Possession', lore: "Your will spills from your skull into theirs.", loreStance: "An enemy’s eyes glaze — and they strike their own.", loreEffect: "You do not command; you possess.",
                                synergy: [
                                    'Possession (control enemy 1 turn) → disrupts big threats',
                                    'Spirit Lash (3 dmg/turn to linked) → passive chip'
                                ]
                            },
                            { level: 11, name: 'Eidolon King', trait: 'You heal for 100% of Soul Feast dmg', traitEffect: 'Every heartbeat steals from them to feed you.', skill: 'Soul Feast', upgrade: 'You heal for 100% of Soul Feast dmg.', lore: "Your enemies live in agony, not from wounds, but from your pull.", loreStance: "Every heartbeat steals from them to feed you.", loreEffect: "Life is your leash.",
                                synergy: [
                                    'Soul Feast (drain HP from linked) → healing + pressure',
                                    'Soul Feast heals 100% dmg dealt → sustain for long fights'
                                ]
                            },
                            { level: 14, name: 'Eternal Lich', trait: 'Undying Will', traitEffect: 'First death per fight resurrects you at 50% HP.', skill: 'Unmake', upgrade: 'Soul Feast becomes free to cast once per fight.', ascended: true, lore: "Your body is a memory; your soul is iron.", loreStance: "Death is a pause, not an end.", loreEffect: "You rule the grave without leaving it.", secretEvolutionTrigger: true,
                                synergy: [
                                    'Free Soul Feast once per fight → strong comeback tool',
                                    'Undying Will → 1 resurrection per fight'
                                ]
                            }
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
                            { level: 3, name: 'Assassin', trait: '+25% crit dmg', traitEffect: 'Your critical strikes deal more damage.', skill: 'Shadowstep', lore: "You become one with the shadows, striking from unseen angles with deadly precision.", loreStance: "Strike from the unseen.", loreEffect: "Your presence is a whisper before the storm." },
                            { level: 5, name: 'Shadowblade', trait: 'Garrote applies Silence for 1 turn', traitEffect: 'Your Garrote skill now silences enemies, preventing them from casting spells.', skill: 'Garrote', lore: "Your blade is a phantom, slipping past defenses to find the vital points. Silence is your deadliest weapon.", loreStance: "Silence your foes.", loreEffect: "Your strikes disrupt the enemy's very will to fight." },
                            { level: 8, name: 'Phantom', trait: 'Marked for Death deals +50% dmg', traitEffect: 'Marked enemies take significantly more damage from your attacks.', skill: 'Marked for Death', lore: "You move like a ghost, marking your prey for a swift and inevitable demise. They never see it coming.", loreStance: "Mark your prey.", loreEffect: "The shadows guide your hand to the enemy's weakness." },
                            { level: 11, name: 'Death’s Whisper', trait: '+50% crit dmg', traitEffect: 'Your critical strikes become even more devastating.', skill: 'Assassinate', lore: "You become the embodiment of death itself, a whisper in the dark that silences all opposition. None escape your final judgment.", loreStance: "The final whisper.", loreEffect: "You can instantly eliminate weakened foes, leaving no trace." },
                            { level: 14, name: 'Death’s Whisper (Ascended)', trait: 'Start every fight in Stealth.', traitEffect: 'You begin every combat encounter hidden from your enemies, allowing for a decisive opening strike.', skill: 'Assassinate', ascended: true, lore: "You are the ultimate assassin, a legend whispered in hushed tones. Your presence is death, swift and unseen.", loreStance: "The unseen death.", loreEffect: "Every battle begins on your terms, from the depths of shadow." }
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
                            { level: 3, name: 'Duelist', trait: 'Riposte deals +50% dmg', traitEffect: 'Your counterattacks strike with increased force, punishing your aggressors.', skill: 'Riposte', lore: "Every parry is an invitation, every dodge a dance. You turn the enemy's aggression against them.", loreStance: "Dance of blades.", loreEffect: "You excel in one-on-one combat, turning defense into offense." },
                            { level: 5, name: 'Swashbuckler', trait: 'Can parry ranged attacks', traitEffect: 'You can now deflect projectiles, extending your defensive prowess.', skill: 'Flurry', lore: "With a flourish and a grin, you weave through the fray, a whirlwind of steel and daring. The battlefield is your stage.", loreStance: "Whirlwind of steel.", loreEffect: "You can unleash a rapid succession of strikes, overwhelming multiple foes." },
                            { level: 8, name: 'Blade Dancer', trait: 'Combo finishers refund 1 Energy', traitEffect: 'Your finishing moves become more efficient, allowing for sustained offense.', skill: 'Flurry', lore: "Your movements are poetry in motion, a deadly ballet of blades. Each strike flows seamlessly into the next.", loreStance: "Poetry in motion.", loreEffect: "You can unleash a rapid succession of strikes, overwhelming multiple foes." },
                            { level: 11, name: 'Crimson Vortex', trait: 'Blade Storm hits all enemies twice', traitEffect: 'Your ultimate attack now strikes every enemy twice, creating a devastating area of effect.', skill: 'Blade Storm', lore: "You become a crimson maelstrom, a whirlwind of lethal intent. None can escape your furious dance of death.", loreStance: "Crimson maelstrom.", loreEffect: "You can unleash a devastating area-of-effect attack, striking all enemies multiple times." },
                            { level: 14, name: 'Crimson Vortex (Ascended)', trait: 'All finishers cost 0 Energy for first 2 turns.', traitEffect: 'Your finishing moves become free to cast for the initial turns of combat, allowing for an explosive opening.', skill: 'Blade Storm', ascended: true, lore: "You are the embodiment of pure martial artistry, a living storm of blades. Your presence tears through any opposition.", loreStance: "The living storm.", loreEffect: "Your combat prowess reaches its peak, allowing for an overwhelming initial assault." }
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
                            { level: 3, name: 'Saboteur', trait: 'Caltrops apply -50% speed for 2 turns', traitEffect: 'Your caltrops significantly reduce enemy movement, controlling the battlefield.', skill: 'Caltrops', lore: "The battlefield is your playground, and your enemies are merely pawns in your deadly game of traps and diversions.", loreStance: "Master of the field.", loreEffect: "You can deploy traps to hinder and control enemy movement." },
                            { level: 5, name: 'Trickster', trait: 'Smoke Bomb blinds enemies (-25% hit chance, 1 turn)', traitEffect: 'Your smoke bombs now blind foes, making them miss their attacks.', skill: 'Smoke Bomb', lore: "You revel in chaos and confusion, using misdirection and cunning to outwit your opponents. They never know what hit them.", loreStance: "Embrace chaos.", loreEffect: "You can obscure the battlefield, blinding enemies and creating openings." },
                            { level: 8, name: 'Smoke Phantom', trait: 'Traps deal +50% dmg', traitEffect: 'Your deployed traps become deadlier, inflicting more damage upon activation.', skill: 'Poison Trap', lore: "You move through the smoke and shadows like a wraith, your traps appearing from nowhere to ensnare your unsuspecting foes.", loreStance: "Wraith in the mist.", loreEffect: "You can deploy more potent traps, inflicting damage over time." },
                            { level: 11, name: 'Shadow Engineer', trait: 'Clockwork Bomb deals 20-28 dmg AOE', traitEffect: 'Your clockwork bombs unleash a devastating explosion, damaging multiple enemies.', skill: 'Clockwork Bomb', lore: "Your mind is a forge of cunning devices, each one a testament to your mastery of demolition and strategic disruption. No obstacle can stand in your way.", loreStance: "Architect of destruction.", loreEffect: "You can deploy powerful delayed explosives to decimate enemy formations." },
                            { level: 14, name: 'Shadow Engineer (Ascended)', trait: 'Can place traps instantly without ending turn.', traitEffect: 'You can deploy traps with unparalleled speed, allowing for dynamic and reactive battlefield control.', skill: 'Clockwork Bomb', ascended: true, lore: "You are the ultimate architect of chaos, your traps and gadgets transforming the battlefield into a death trap for your enemies. None can escape your intricate designs.", loreStance: "The ultimate architect.", loreEffect: "Your trap deployment becomes seamless, allowing for continuous battlefield manipulation." }
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
                            { level: 3, stage: 'Elementalist', type: 'Mana' } // Mana is base resource, but listed for clarity of evolution
                        ],
                        stages: [
                            { level: 3, name: 'Elementalist', trait: 'Elemental Affinity', traitEffect: 'Casting same element twice in a row gives +50% dmg.', skill: 'Fireball', lore: "You command the primal forces of nature, weaving fire, ice, and lightning into devastating spells.", loreStance: "Master of elements.", loreEffect: "You gain access to fundamental elemental spells." },
                            { level: 5, name: 'Pyromancer', trait: 'Fireball leaves Burn', traitEffect: 'Your Fireball spell now inflicts a damage-over-time effect.', skill: 'Fireball', upgrade: 'Fireball leaves Burn (3 dmg/turn).', lore: "The flames within you burn brighter, transforming you into a conduit of pure destructive fire. Your enemies will be incinerated.", loreStance: "Conduit of fire.", loreEffect: "Your fire spells become more potent, leaving lingering burns." },
                            { level: 8, name: 'Stormcaller', trait: 'Lightning Arc chains to 2 extra enemies', traitEffect: 'Your Lightning Arc spell now strikes multiple targets, arcing between foes.', skill: 'Lightning Arc', upgrade: 'Lightning Arc chains to 2 extra enemies.', lore: "The fury of the storm answers your call, unleashing torrents of lightning and wind upon your enemies. Chaos is your ally.", loreStance: "Fury of the storm.", loreEffect: "You can gain the ability to strike multiple targets with lightning." },
                            { level: 11, name: 'Archmage', trait: 'Mix elements for hybrid effects', traitEffect: 'You can combine different elemental spells for unique and powerful hybrid effects.', skill: 'Fireball', upgrade: 'Mix elements for hybrid effects (fire+ice=steam slow, etc.).', lore: "You transcend the boundaries of individual elements, becoming a true master of arcane forces. All magic bends to your will.", loreStance: "Master of arcane.", loreEffect: "You can weave complex elemental combinations, creating new spell effects." },
                            { level: 14, name: 'Worldflame', trait: 'All elements gain +1 extra effect', traitEffect: 'Your elemental spells gain additional powerful effects, augmenting their destructive potential.', skill: 'Worldflame', ascended: true, lore: "You are the living embodiment of elemental fury, a cataclysm walking. Worlds burn and freeze at your command.", loreStance: "Cataclysm walking.", loreEffect: "Your elemental spells reach their peak, gaining enhanced secondary effects." }
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
                            // FIXED: Mapped old descriptive skill names to new camelCase names.
                            { level: 3, name: 'Illusionist', trait: 'Mirror Image avoids next hit', traitEffect: 'Your Mirror Image spell guarantees evasion of the next incoming attack.', skill: 'mirrorImage', lore: "You weave veils of illusion, twisting perception and confounding your enemies. Reality is merely a suggestion.", loreStance: "Reality is a suggestion.", loreEffect: "You can create illusory duplicates to avoid incoming attacks." },
                            { level: 5, name: 'Shadowmind', trait: 'Confuse has 50% chance enemy skips turn', traitEffect: 'Your Confuse spell has a chance to make enemies skip their turn entirely.', skill: 'confuse', lore: "You delve into the minds of your foes, planting seeds of doubt and fear. Their thoughts become your playground.", loreStance: "Playground of thoughts.", loreEffect: "You can sow confusion, potentially causing enemies to lose their turns." },
                            { level: 8, name: 'Spellthief', trait: 'Steal enemy’s last used skill for 2 turns', traitEffect: 'You can temporarily steal an enemy’s recently used skill, turning their power against them.', skill: 'stealSkill', lore: "You do not merely counter magic; you claim it. Their spells become your tools, their power your own.", loreStance: "Their power, your own.", loreEffect: "You can temporarily acquire and use enemy abilities." },
                            { level: 11, name: 'Mindweaver', trait: 'Multi-target illusions, up to 3 enemies skip turn', traitEffect: 'Your illusions can affect multiple enemies, causing widespread disruption.', skill: 'multiTargetIllusions', upgrade: 'Multi-target illusions, up to 3 enemies skip turn.', lore: "Your mental dominion expands, weaving intricate illusions that ensnare the minds of many. Entire battlefields fall silent under your influence.", loreStance: "Silent dominion.", loreEffect: "You can affect multiple targets with your illusions, causing widespread confusion." },
                            { level: 14, name: 'Arcane Hollow', trait: 'Permanently remove 1 skill from enemy on hit; needed for Reality Breaker Legendary.', traitEffect: 'Your attacks can permanently strip enemies of their abilities, crippling them for the entire encounter.', skill: 'Arcane Hollow', ascended: true, lore: "You are a void in the weave of magic, consuming spells and abilities with every touch. The very essence of magic unravels before you.", loreStance: "Void in the weave.", loreEffect: "Your touch can permanently erase enemy skills, paving the way for ultimate power." }
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
                            // FIXED: Mapped old descriptive skill names to new camelCase names.
                            { level: 3, name: 'Chronomancer', trait: 'Haste grants ally extra turn', traitEffect: 'Your Haste spell grants an ally an immediate extra turn, accelerating their actions.', skill: 'haste', lore: "You bend the fabric of time, accelerating allies and slowing foes. The battlefield moves to your rhythm.", loreStance: "Rhythm of time.", loreEffect: "You can manipulate the flow of time for allies." },
                            { level: 5, name: 'Timebinder', trait: 'Slow makes enemy lose next turn', traitEffect: 'You can cause an enemy to completely lose their next turn, disrupting their actions.', skill: 'slow', lore: "You knot the threads of fate, ensnaring enemies in temporal distortions. Their movements become sluggish, their actions delayed.", loreStance: "Knotting fate.", loreEffect: "You can bind enemies in temporal distortions, causing them to lose turns." },
                            { level: 8, name: 'Riftseer', trait: 'Revert ally to HP they had 2 turns ago', traitEffect: 'You can rewind an ally’s health state, undoing recent damage or debuffs.', skill: 'revertHp', lore: "You gaze into the echoes of the past, pulling fragments of what was to mend what is. Time is a tool in your hands.", loreStance: "Echoes of the past.", loreEffect: "You can undo recent damage or debuffs to allies by rewinding their health." },
                            { level: 11, name: 'Epoch Guardian', trait: 'Freeze time for 1 turn (enemies can’t act)', traitEffect: 'You can momentarily halt the flow of time for your enemies, rendering them immobile.', skill: 'freezeTime', lore: "You stand as a bulwark against the ravages of time, able to halt its relentless march for your foes. The present is yours to command.", loreStance: "Command the present.", loreEffect: "You can freeze enemies in time, preventing them from acting." },
                            { level: 14, name: 'Eternal Architect', trait: 'Rearrange entire turn order for 3 turns.', traitEffect: 'You can completely reorder the combat sequence for a limited time, dictating who acts when.', skill: 'rearrangeTurnOrder', ascended: true, lore: "You are the master of causality, the architect of destiny. Time is but clay in your hands, to be molded as you see fit.", loreStance: "Architect of destiny.", loreEffect: "You gain ultimate control over the flow of combat, dictating the turn order itself." }
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
                lore: "You do not command the dead — you are the dead. Every corpse is your tongue, every bone your banner.",
                loreEffect: "To face you is to face an army that does not break. The living are just recruits waiting for their turn."
            },
            'the_hollow_king': {
                name: 'The Hollow King',
                description: 'A crown of absence. A throne of silence. The world itself forgets your name.',
                whispers: [
                    "There is a king with no name, no crown, and no face.",
                    "He does not raise the dead — he hollows the living.",
                    "Strike him down, and you will rise in his place… but you will not be you anymore."
                ],
                uponUnlock: "You wake to silence. The wind does not stir. The earth does not move. The throne you sit upon is carved from nothing, and in that nothing… you reign.",
                unlockConditions: 'Start Necromancer (Soulbinder path). Reach Eternal Lich. During Throne of Bones, die while controlling at least 3 enemy souls. Revive not as yourself, but as The Hollow King.',
                identity: "A being stripped of self, ruling through the absence of all things. He is the echo of a soul that was, filled with the weight of what is not.",
                legacy: "No one remembers the Hollow King until they stand before him. Those who kneel are never seen again — not even as bones.",
                coreResource: { type: 'Hollow Will', initial: 0, max: 5, gain: 'from erasing enemies (permanent removal from battle)' },
                mechanic: 'Hollow Will — gained from erasing enemies (max 5).', // Added mechanic for Hollow King
                passives: [
                    { name: 'Life Inversion', effect: 'Damage heals you; healing damages you.' },
                    { name: 'Soul Erasure', effect: 'Kills leave no corpse; enemies cannot be revived.' },
                    { name: 'Unshackled Command', effect: 'Unlimited summons, but each drains 2% max HP/turn.' },
                    { name: 'Crown of the Undying', effect: 'If you die, resurrect next turn with 30% HP. Consumes all Hollow Will and permanently reduces max HP by 10%. Cannot trigger if max HP is below 25% of original.' }
                ],
                skills: ['Unmake', 'Echo of Nothing'], // Hollow Crown is a passive effect of a trait, not an active skill
                overdrive: { name: 'Oblivion’s Call', description: 'Erase the entire enemy team for 1 turn; they cannot act or be targeted.' },
                playstyleSummary: [
                    'Absolute control — can delete enemies, skip turns, swarm with infinite summons.',
                    'Immortal… for a price — every death brings you back weaker, forcing long-term survival planning.',
                    'Self-sabotaging power — summons drain your life, but you’re healed by damage, encouraging a hyper-aggressive style.'
                ],
                coreLoop: [ // Core loop for Hollow King
                    'Aggressive erasure → keep Hollow Will banked for resurrection → swarm endlessly until nothing remains.'
                ]
            },
            'reality_breaker': { // Legendary Mage class
                name: 'Reality Breaker',
                description: 'A being who shatters the very fabric of existence, twisting reality to their will.',
                unlockPath: 'Arcane Hollow (Mage) + ??? event.', // Placeholder for full unlock
                lore: "You are the ultimate truth, the ultimate lie. Reality itself is a malleable canvas for your desires.",
                loreEffect: "The laws of the universe bend to your whim. What is real, and what is illusion? Only you know."
            }
        };

        // Cross-Branch Synergy Notes
        const crossBranchSynergies = [
            'Bone Warden + Plaguecaller: Corpse Bloom in a minion-heavy build creates a self-feeding infection loop.',
            'Plaguecaller + Soulbinder: Link infected enemies to double every tick of DoT damage.',
            'Black Pharaoh + Eternal Lich: Minion army sustains the Lich’s resurrection window by keeping damage off them.'
        ];


        // --- Global Game State Variables ---
        let currentRoom = 'starting_room';
        let gameActive = true;
        let awaitingClassSelection = false;
        let awaitingBranchSelection = false;
        let inCombat = false;
        let currentEnemies = [];
        let playerMinions = [];
        let turnOrder = [];
        let currentTurnIndex = 0;
        let isTyping = false;
        let skipTyping = false;
        let corpsesOnBattlefield = 0;
        let playerDealtDamageThisTurn = false;
        let usedOverdrives = {};
        let playerHasTakenTurn = false;
        let turnNumber = 0;

        // Typing speed control (milliseconds per character)
        const TYPING_SPEED_MS = 16; // 20% faster than 20ms

        let playerStats = {
            name: 'Adventurer',
            currentHP: 0,
            maxHP: 0,
            // Using a getter/setter for `hp` ensures backward compatibility while standardizing on `currentHP`
            get hp() { return this.currentHP; },
            set hp(value) { this.currentHP = value; },
            strength: 0,
            intelligence: 0,
            agility: 0,
            baseDamageMin: 0,
            baseDamageMax: 0,
            def: 0,
            critChance: 0,
            critMultiplier: 0,
            level: 1,
            experience: 0,
            expToNextLevel: 100,
            resource: { type: 'None', current: 0, max: 0, regen: 0 },
            inventory: [],
            activeSkills: [],
            activeTraits: [],
            statusEffects: [],
            // Special flags for Legendary/Secret forms
            isHollowKing: false,
            controlledSouls: 0
        };

        let playerProgression = {
            baseClass: null,
            currentBranch: null,
            currentEvolutionName: null,
            currentEvolutionStageIndex: 0
        };

        // --- Helper Functions ---
        /**
         * Generates a random integer between min and max (inclusive).
         * @param {number} min
         * @param {number} max
         * @returns {number}
         */
        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        /**
         * Delays execution for a given number of milliseconds.
         * @param {number} ms - The delay in milliseconds.
         * @returns {Promise<void>} A promise that resolves after the delay.
         */
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Normalizes a command input string for parsing.
         * @param {string} input - The raw command string.
         * @returns {{command: string, targetNum: number|null}} An object with `command` and `targetNum`.
         */
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

        /**
         * Finds similar skill names based on a given input.
         * @param {string} inputSkillName - The skill name to match.
         * @returns {Array<string>} Up to 3 suggestions.
         */
        function findSimilarSkills(inputSkillName) {
            const allSkills = Object.keys(skillDefinitions);
            const suggestions = [];
            const lowerInput = inputSkillName.toLowerCase();

            for (const skill of allSkills) {
                const lowerSkill = skill.toLowerCase();
                if (lowerSkill === lowerInput) return [skill];
                if (lowerSkill.startsWith(lowerInput)) {
                    suggestions.push(skill);
                }
            }

            if (suggestions.length < 3) {
                for (const skill of allSkills) {
                    if (skill.toLowerCase().includes(lowerInput) && !suggestions.includes(skill)) {
                        suggestions.push(skill);
                    }
                }
            }
            return suggestions.slice(0, 3);
        }

        let currentTypingPromiseResolve = null;

        // --- Game Functions ---

        /**
         * Adds a message to the game output display with a typing effect.
         * @param {string} message - The text message to display.
         * @param {boolean} [isImportant=false] - If true, displays the message in bold.
         * @param {boolean} [isHTML=false] - If true, treats the message as HTML.
         * @returns {Promise<void>} A promise that resolves when the message is fully typed.
         */
        async function displayMessage(message, isImportant = false, isHTML = false) {
            isTyping = true;
            skipTyping = false;
            gameInput.disabled = true;
            submitButton.disabled = true;

            return new Promise(async (resolve) => {
                currentTypingPromiseResolve = resolve;

                const lines = message.split('\n');
                for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                    const line = lines[lineIndex];
                    if (line.trim() === '') continue; // Skip empty lines

                    const p = document.createElement('p');
                    gameOutput.appendChild(p);
                    
                    // FIXED: This now properly handles HTML content by using innerHTML,
                    // allowing for colors and other formatting from the lore descriptions.
                    // The typing effect is disabled for HTML lines to prevent broken tags.
                    if (isHTML || (isImportant && line.includes('<'))) {
                        p.innerHTML = line;
                        gameOutput.scrollTop = gameOutput.scrollHeight;
                        if (skipTyping) continue;
                        await sleep(TYPING_SPEED_MS * 5); // A small delay for HTML lines
                    } else {
                         if (isImportant) p.style.fontWeight = 'bold';

                        for (let i = 0; i < line.length; i++) {
                            if (skipTyping) {
                                p.textContent = line;
                                break;
                            }
                            p.textContent += line.charAt(i);
                            gameOutput.scrollTop = gameOutput.scrollHeight;
                            await sleep(TYPING_SPEED_MS);
                        }
                    }

                    if (skipTyping) {
                        // If skipped, instantly display all remaining lines
                        for (let j = lineIndex + 1; j < lines.length; j++) {
                            const nextLine = lines[j];
                            if (nextLine.trim() === '') continue;
                            const nextP = document.createElement('p');
                             if (isHTML || (isImportant && nextLine.includes('<'))) {
                                 nextP.innerHTML = nextLine;
                             } else {
                                 nextP.textContent = nextLine;
                                 if(isImportant) nextP.style.fontWeight = 'bold';
                             }
                            gameOutput.appendChild(nextP);
                        }
                        break; // Exit the main loop
                    }
                }

                isTyping = false;
                skipTyping = false;
                currentTypingPromiseResolve = null;
                gameInput.disabled = false;
                submitButton.disabled = false;
                gameInput.focus();
                resolve();
            });
        }


        /**
         * Initializes player stats and progression based on the chosen base class.
         * @param {string} className - The key for the chosen base class (e.g., 'warrior').
         */
        function initializePlayer(className) {
            const baseClassInfo = basePlayerClasses[className];
            if (baseClassInfo) {
                // FIXED: The player's name was not being initialized from the class data.
                playerStats.name = baseClassInfo.name || className.charAt(0).toUpperCase() + className.slice(1);
                playerStats.currentHP = baseClassInfo.baseStats.hp;
                playerStats.maxHP = baseClassInfo.baseStats.hp;
                playerStats.strength = baseClassInfo.baseStats.strength;
                playerStats.intelligence = baseClassInfo.baseStats.intelligence;
                playerStats.agility = baseClassInfo.baseStats.agility;
                playerStats.baseDamageMin = baseClassInfo.baseStats.baseDamageMin;
                playerStats.baseDamageMax = baseClassInfo.baseStats.baseDamageMax;
                playerStats.def = baseClassInfo.baseStats.def;
                playerStats.critChance = baseClassInfo.baseStats.critChance;
                playerStats.critMultiplier = baseClassInfo.baseStats.critMultiplier;
                playerStats.level = 1;
                playerStats.experience = 0;
                playerStats.expToNextLevel = 100;
                playerStats.inventory = [...baseClassInfo.startingItems];
                playerStats.activeSkills = [...baseClassInfo.startingSkills];
                playerStats.activeTraits = [...baseClassInfo.startingTraits];
                playerStats.resource = { ...baseClassInfo.startingResource };
                playerStats.isHollowKing = false;
                playerStats.statusEffects = [];

                playerProgression.baseClass = className;
                playerProgression.currentBranch = null;
                playerProgression.currentEvolutionName = baseClassInfo.name || className.charAt(0).toUpperCase() + className.slice(1);
                playerProgression.currentEvolutionStageIndex = -1; // -1 indicates base class

                updatePlayerHud();
            } else {
                console.error("Attempted to initialize with an invalid class:", className);
            }
        }


        /**
         * Starts or restarts the game.
         */
        async function startGame() {
            gameOutput.innerHTML = '';
            await displayMessage("Welcome to the Retro Adventure!", true);
            await displayMessage("To begin your journey, choose your path. Available classes:");

            // FIXED: Used a for...of loop to ensure messages display in order.
            for (const className in basePlayerClasses) {
                await displayMessage(`- ${className.charAt(0).toUpperCase() + className.slice(1)}: ${basePlayerClasses[className].description}`);
            }
            await displayMessage("Type the name of the class you wish to play (e.g., 'warrior', 'mage', 'rogue', 'necromancer').", true);

            currentRoom = 'starting_room';
            gameActive = true;
            inCombat = false;
            awaitingClassSelection = true;
            awaitingBranchSelection = false;
            gameInput.focus();
        }

        /**
         * Displays the description of the current room and available actions.
         */
        async function displayRoomDescription() {
            gameOutput.innerHTML = '';
            const room = rooms[currentRoom];
            if (room) {
                await displayMessage("--- " + currentRoom.replace(/_/g, ' ').toUpperCase() + " ---", true);
                await displayMessage(room.description);
                await displayMessage("\nWhat do you do?");

                if (Object.keys(room.exits).length > 0) {
                    await displayMessage("\n-- Exits --", true);
                    // FIXED: Used a for...of loop for correct async behavior.
                    for (const direction in room.exits) {
                        await displayMessage(`👣 Go ${direction}`);
                    }
                }

                if (room.enemies && room.enemies.length > 0) {
                    await displayMessage("\n-- Enemies Present --", true);
                    // FIXED: Used a for...of loop for correct async behavior.
                    for (const enemyKey of room.enemies) {
                        const enemyInfo = enemies[enemyKey];
                        if (enemyInfo) {
                            await displayMessage(`Beware! A ${enemyInfo.name} lurks here.`);
                        }
                    }
                    await displayMessage("⚔️ Engage (start combat)");
                }

                if (room.items && room.items.length > 0) {
                    await displayMessage("\n-- Items here --", true);
                    // FIXED: Used a for...of loop for correct async behavior.
                    for (const item of room.items) {
                        await displayMessage(`✋ Take ${item}`);
                    }
                }

                if (playerStats.activeSkills.length > 0 && playerProgression.baseClass) {
                    await displayMessage("\n-- Skills --", true);
                    // FIXED: Used a for...of loop for correct async behavior.
                    for (const skillName of playerStats.activeSkills) {
                        const skillInfo = skillDefinitions[skillName];
                        if (skillInfo) {
                            let skillDisplay = `✨ Use ${skillName} (${skillInfo.description})`;
                            if ((Number.isFinite(skillInfo.cost) && skillInfo.cost > 0) || skillInfo.cost === 'all') {
                                skillDisplay += ` [Cost: ${skillInfo.cost} ${playerStats.resource.type}]`;
                            }
                            await displayMessage(skillDisplay);
                        } else {
                            await displayMessage(`✨ Use ${skillName} (Description missing!)`);
                        }
                    }
                }

                await displayMessage("\n-- General Commands --", true);
                await displayMessage("📜 Inventory (i)");
                await displayMessage("👀 Look (re-examine room)");
                await displayMessage("❓ Help (list all commands)");
                await displayMessage("🚪 Quit (end game)");

            } else {
                await displayMessage("Error: You are in an unknown place. This shouldn't happen!", true);
            }
        }

        /**
         * Moves the player to a new room.
         * @param {string} direction The direction to move (e.g., 'north').
         */
        async function movePlayer(direction) {
            const currentRoomData = rooms[currentRoom];
            const newRoom = currentRoomData.exits[direction];

            if (newRoom) {
                currentRoom = newRoom;
                await displayMessage(`You move to the ${direction}.`);
                await displayRoomDescription();
            } else {
                await displayMessage("You can't go that way.");
            }
        }

        /**
         * Handles the player taking an item from a room.
         * @param {string} itemName The name of the item to take.
         */
        async function takeItem(itemName) {
            const currentRoomData = rooms[currentRoom];
            const itemIndex = currentRoomData.items.map(item => item.toLowerCase()).indexOf(itemName.toLowerCase());

            if (itemIndex !== -1) {
                const item = currentRoomData.items.splice(itemIndex, 1)[0];
                playerStats.inventory.push(item);
                await displayMessage(`You pick up the ${item}.`);
                updatePlayerHud();
            } else {
                await displayMessage(`You don't see a '${itemName}' here.`);
            }
        }

        /**
         * Displays the player's current inventory.
         */
        async function showInventory() {
            if (playerStats.inventory.length > 0) {
                await displayMessage("--- Inventory ---", true);
                // FIXED: Replaced forEach with a for...of loop to ensure messages display one by one.
                for (const item of playerStats.inventory) {
                    await displayMessage(`- ${item}`);
                }
            } else {
                await displayMessage("Your inventory is empty.");
            }
        }

        /**
         * Starts a combat encounter.
         * @param {Array<string>} enemyKeys - An array of enemy keys.
         */
        async function startCombat(enemyKeys) {
            gameOutput.innerHTML = '';
            inCombat = true;
            currentEnemies = [];
            playerMinions = [];
            corpsesOnBattlefield = 0;
            playerDealtDamageThisTurn = false;
            turnOrder = [];
            currentTurnIndex = 0;
            turnNumber = 1;
            playerHasTakenTurn = false;
            usedOverdrives = {};

            await displayMessage("\n--- COMBAT INITIATED! ---", true);

            playerStats.id = 'player';
            playerStats.isPlayer = true;
            playerStats.isMinion = false;

            for (const [index, key] of enemyKeys.entries()) {
                const enemyTemplate = enemies[key];
                if (enemyTemplate) {
                    const newEnemy = JSON.parse(JSON.stringify(enemyTemplate));
                    newEnemy.id = `enemy_${index}`;
                    newEnemy.isPlayer = false;
                    newEnemy.isMinion = false;
                    newEnemy.statusEffects = [];
                    newEnemy.lastSkillUsed = null;
                    currentEnemies.push(newEnemy);
                    await displayMessage(`A ${newEnemy.name} appears! (HP: ${newEnemy.hp})`);
                } else {
                    await displayMessage(`Warning: Unknown enemy type '${key}' encountered.`);
                }
            }
            
            turnOrder = [playerStats, ...currentEnemies];
            turnOrder.sort((a, b) => (b.agility || b.spd) - (a.agility || a.spd));

            await displayMessage("\n--- Battle Order ---", true);
            for (const combatant of turnOrder) {
                await displayMessage(`${combatant.name} (SPD: ${combatant.agility || combatant.spd})`);
            }
            updatePlayerHud();

            await resolveTurn();
        }

        /**
         * Displays the current state of combat.
         */
        async function displayCombatState() {
            for (const [index, enemy] of currentEnemies.entries()) {
                if (enemy.hp > 0) {
                    await displayMessage(`${index + 1}. ${enemy.name} (${enemy.hp}/${enemy.maxHp} HP)`);
                }
            }
            await displayMessage("---------------------");
            await displayMessage("What will you do?");

            const combatActions = [];
            // FIXED: Dynamically get the basic attack skill for the player's class.
            const playerBasicAttackSkillName = basePlayerClasses[playerProgression.baseClass]?.startingSkills[0] || 'Slash';
            combatActions.push({ type: 'attack', name: `Attack (${playerBasicAttackSkillName})`, skillName: playerBasicAttackSkillName });

            playerStats.activeSkills.forEach(skillName => {
                combatActions.push({ type: 'skill', name: skillName, skillName: skillName });
            });

            combatActions.push({ type: 'flee', name: 'Flee' });

            for (const action of combatActions) {
                let displayLine = `> ${action.name}`;
                if (action.type === 'skill' && skillDefinitions[action.skillName]) {
                    const skillInfo = skillDefinitions[action.skillName];
                    if ((Number.isFinite(skillInfo.cost) && skillInfo.cost > 0) || skillInfo.cost === 'all') {
                        displayLine += ` [Cost: ${skillInfo.cost} ${playerStats.resource.type}]`;
                    }
                }
                await displayMessage(displayLine);
            }
            await displayMessage("Type a command directly (e.g., 'attack 1', 'use grave bolt 1', 'gb 1').");
        }

        /**
         * Resolves one full turn in combat.
         */
        async function resolveTurn() {
            if (!inCombat) return;

            // FIXED: Clean up dead combatants from the main arrays first.
            currentEnemies = currentEnemies.filter(e => e.hp > 0);
            playerMinions = playerMinions.filter(m => m.hp > 0);
            
            // Re-create turn order from living combatants
            turnOrder = [playerStats, ...currentEnemies, ...playerMinions].filter(c => c.hp > 0);
            turnOrder.sort((a, b) => (b.agility || b.spd) - (a.agility || a.spd));

            if (await checkBattleEnd()) return;

            if (currentTurnIndex >= turnOrder.length) {
                currentTurnIndex = 0;
            }

            const currentCombatant = turnOrder[currentTurnIndex];
            
            // Handle turn skip effects
            const skipTurnEffect = currentCombatant.statusEffects.find(s => s.type === 'skip_turn' || s.name === 'Stun');
            if (skipTurnEffect) {
                await displayMessage(`${currentCombatant.name} is unable to act this turn!`);
                // Duration is handled at end of round, so we just skip the turn here
                currentTurnIndex = (currentTurnIndex + 1);
                if (currentTurnIndex >= turnOrder.length) await endOfRoundEffects();
                await resolveTurn();
                return;
            }
            
            if (currentCombatant.isPlayer) {
                await displayMessage(`\n--- Your Turn! ---`, true);
                await displayCombatState();
                updatePlayerHud();
                gameInput.focus();
                return;
            } else if (currentCombatant.isMinion) {
                await displayMessage(`\n--- ${currentCombatant.name}'s Turn! ---`, true);
                await minionTurn(currentCombatant);
            } else {
                await displayMessage(`\n--- ${currentCombatant.name}'s Turn! ---`, true);
                await enemyTurn(currentCombatant);
            }

            if (await checkBattleEnd()) return;

            currentTurnIndex++;
            
            if (currentTurnIndex >= turnOrder.length) {
                await endOfRoundEffects();
            }
            
            updatePlayerHud();
            await resolveTurn();
        }

        /**
         * Handles an enemy's turn.
         * @param {object} enemy - The enemy taking the turn.
         */
        async function enemyTurn(enemy) {
            let tauntingMinion = playerMinions.find(m => m.statusEffects.some(s => s.name === 'Taunt'));
            let target = tauntingMinion || playerStats;

            if (target && target.hp > 0) {
                let enemySkill = skillDefinitions[enemy.skills[0]?.name] || skillDefinitions['Basic Attack'];
                const damageDealt = calculateDamage(enemy, target, enemySkill);
                target.hp -= damageDealt;
                await displayMessage(`${enemy.name} uses ${enemySkill.name} on ${target.name} for ${damageDealt} damage! ${target.name} HP: ${target.hp}/${target.maxHp}`);
            } else {
                await displayMessage(`${enemy.name} has no target to attack.`);
            }
        }

        /**
         * Handles a minion's turn.
         * @param {object} minion - The minion taking the turn.
         */
        async function minionTurn(minion) {
            const targetEnemy = currentEnemies.find(e => e.hp > 0);
            if (targetEnemy) {
                // FIXED: Added a check to ensure minion has skills defined.
                if (minion.skills && minion.skills.length > 0) {
                    const minionSkill = skillDefinitions[minion.skills[0].name];
                    if (minionSkill) {
                        const damageDealt = calculateDamage(minion, targetEnemy, minionSkill);
                        targetEnemy.hp -= damageDealt;
                        await displayMessage(`${minion.name} attacks ${targetEnemy.name} for ${damageDealt} damage! ${targetEnemy.name} HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`);
                        if (targetEnemy.hp <= 0) {
                            await displayMessage(`${targetEnemy.name} has been defeated!`);
                            if (playerProgression.baseClass === 'necromancer') {
                                playerStats.resource.current = Math.min(playerStats.resource.max, playerStats.resource.current + 1);
                                await displayMessage(`You gained 1 Soul Energy from ${targetEnemy.name}'s demise!`);
                            }
                            corpsesOnBattlefield++;
                            await displayMessage(`A corpse is left on the battlefield. Total corpses: ${corpsesOnBattlefield}`);
                        }
                    } else {
                        await displayMessage(`${minion.name} tries to attack, but its skill '${minion.skills[0].name}' is not defined!`);
                    }
                } else {
                    await displayMessage(`${minion.name} has no skills to use!`);
                }
            } else {
                await displayMessage(`${minion.name} has no target to attack.`);
            }
        }

        /**
         * Calculates damage from attacker to defender.
         * @param {object} attacker - The attacking combatant.
         * @param {object} defender - The defending combatant.
         * @param {object} skill - The skill definition used.
         * @returns {number} The calculated damage.
         */
        function calculateDamage(attacker, defender, skill) {
            let baseDamage = getRandomInt(skill.base_damage[0], skill.base_damage[1]);
            let critMultiplier = (attacker.critMultiplier || 1.5);
            let critChance = (attacker.critChance || 0);
            let finalDamage = 0;
            let isCrit = false;

            const hasGuaranteedCrit = attacker.statusEffects.some(s => s.name === 'Guaranteed Crit');
            if (hasGuaranteedCrit || (skill.name === 'Quick Slash' && !playerHasTakenTurn)) {
                isCrit = true;
                attacker.statusEffects = attacker.statusEffects.filter(s => s.name !== 'Guaranteed Crit');
            } else {
                isCrit = Math.random() < critChance;
            }

            if (isCrit) {
                baseDamage = Math.floor(baseDamage * critMultiplier);
                // The combat message will indicate the critical hit
            }
            
            if (skill.damage_type === 'true' || skill.effects?.some(e => e.type === 'true_damage')) {
                finalDamage = baseDamage;
            } else {
                let defense = defender.def || 0;
                if (skill.effects?.some(e => e.type === 'ignore_armor_percent')) {
                    const ignorePercent = skill.effects.find(e => e.type === 'ignore_armor_percent').value;
                    defense -= defense * ignorePercent;
                }
                
                finalDamage = Math.max(0, baseDamage - defense);
                const damageReductionEffect = defender.statusEffects.find(s => s.type === 'damage_reduction');
                if (damageReductionEffect) {
                    finalDamage *= (1 - damageReductionEffect.value);
                }
                
                if (defender.isPlayer && playerProgression.currentBranch === 'bone_warden') {
                    const numMinions = playerMinions.length;
                    let boneArmorDR = numMinions * 0.02;
                    const boneFortressTrait = playerStats.activeTraits.some(t => t.name === 'Bone Fortress');
                    boneArmorDR = Math.min(boneArmorDR, boneFortressTrait ? 0.15 : 0.10);
                    finalDamage *= (1 - boneArmorDR);
                }
            }

            return Math.max(0, Math.floor(finalDamage));
        }

        /**
         * Applies the effects of a skill.
         * @param {object} caster - The combatant using the skill.
         * @param {object | Array<object>} targets - The target(s) of the skill.
         * @param {object} skillInfo - The skill definition.
         * @returns {Promise<boolean>} True if the skill effect was successfully applied.
         */
        async function applySkillEffect(caster, targets, skillInfo) {
            const actualTargets = Array.isArray(targets) ? targets : [targets];
            
            if (skillInfo.oncePerFight) {
                if (usedOverdrives[skillInfo.name]) {
                    await displayMessage(`${skillInfo.name} can only be used once per fight!`, true);
                    return false;
                }
                usedOverdrives[skillInfo.name] = true;
            }

            // Handle damage
            if (skillInfo.base_damage) {
                const multiHitCount = skillInfo.effects?.find(e => e.type === 'multi_hit')?.count || 1;
                for (let hit = 1; hit <= multiHitCount; hit++) {
                    if (multiHitCount > 1) await displayMessage(`--- Hit ${hit}/${multiHitCount} ---`);
                    for (const target of actualTargets) {
                        if (target.hp <= 0) continue;
                        let damageDealt = calculateDamage(caster, target, skillInfo);

                        // Grave Bolt bonus
                        if (skillInfo.effects?.some(e => e.type === 'bonus_damage_per_corpse')) {
                            const bonusEffect = skillInfo.effects.find(e => e.type === 'bonus_damage_per_corpse');
                            const bonusDmg = corpsesOnBattlefield * bonusEffect.value;
                            damageDealt += bonusDmg;
                            if (bonusDmg > 0) await displayMessage(`(${skillInfo.name} gains ${bonusDmg} bonus damage!)`);
                        }

                        target.hp -= damageDealt;
                        await displayMessage(`${caster.name} uses ${skillInfo.name} on ${target.name} for ${damageDealt} damage! ${target.name} HP: ${target.hp}/${target.maxHp}`);
                        
                        // Handle heal_from_damage
                        if (skillInfo.effects?.some(e => e.type === 'heal_from_damage')) {
                            const healEffect = skillInfo.effects.find(e => e.type === 'heal_from_damage');
                            const healAmount = Math.floor(damageDealt * healEffect.ratio);
                            caster.hp = Math.min(caster.maxHp, caster.hp + healAmount);
                            await displayMessage(`${caster.name} leeches ${healAmount} HP!`);
                        }
                    }
                }
                 // Handle death after all hits
                 for (const target of actualTargets) {
                    if (target.hp <= 0 && !target.isMarkedForDeath) { // Check a flag to prevent multiple death messages
                        target.isMarkedForDeath = true;
                        await displayMessage(`${target.name} has been defeated!`);
                        if (!target.isPlayer && !target.isMinion) {
                            corpsesOnBattlefield++;
                            await displayMessage(`A corpse is left on the battlefield. Total corpses: ${corpsesOnBattlefield}`);
                            if (caster.isPlayer && playerProgression.baseClass === 'necromancer') {
                                playerStats.resource.current = Math.min(playerStats.resource.max, playerStats.resource.current + 2);
                                await displayMessage(`You gained 2 Soul Energy from the killing blow!`);
                            }
                        }
                    }
                }
            }

            // Handle other effects
            if (skillInfo.effects) {
                for (const effect of skillInfo.effects) {
                    switch (effect.type) {
                        case 'summon':
                            const minionTemplate = minionDefinitions[effect.summon_type];
                            if (minionTemplate) {
                                const newMinion = JSON.parse(JSON.stringify(minionTemplate));
                                newMinion.id = `minion_${Date.now()}`;
                                newMinion.isPlayer = false;
                                newMinion.isMinion = true;
                                newMinion.statusEffects = [];
                                playerMinions.push(newMinion);
                                await displayMessage(`${caster.name} summons a ${newMinion.name}!`);
                            }
                            break;
                        case 'damage_reduction':
                            caster.statusEffects.push({ name: 'Guard', type: 'damage_reduction', value: effect.value, duration: effect.duration + 1 });
                            await displayMessage(`${caster.name} braces for impact!`);
                            break;
                        case 'stun':
                             for(const target of actualTargets) {
                                if (target.hp > 0) {
                                    target.statusEffects.push({ name: 'Stun', type: 'skip_turn', duration: effect.duration + 1 });
                                }
                             }
                             await displayMessage(`${actualTargets.map(t => t.name).join(', ')} are stunned!`);
                            break;
                         case 'minion_taunt':
                            playerMinions.filter(m => m.hp > 0).forEach(minion => {
                                minion.statusEffects.push({ name: 'Taunt', type: 'taunt', duration: effect.duration + 1 });
                            });
                            await displayMessage(`Your minions are now taunting enemies!`);
                            break;
                        // Add more effect cases here
                    }
                }
            }
            if(caster.isPlayer) {
              playerDealtDamageThisTurn = true;
              playerHasTakenTurn = true;
            }
            return true;
        }


  /**
         * Checks if the battle has ended.
         * @returns {Promise<boolean>} True if battle ended, false otherwise.
         */
        async function checkBattleEnd() {
            const livingEnemies = currentEnemies.filter(enemy => enemy.hp > 0);
            const isPlayerAlive = playerStats.currentHP > 0;

            if (livingEnemies.length === 0 && inCombat) { // Added inCombat check
                await displayMessage("\n--- VICTORY! ---", true);
                inCombat = false;
                const baseExp = 50;
                await displayMessage(`You defeated all enemies and gained ${baseExp} XP!`);
                await addExperience(baseExp);
                await displayRoomDescription();
                updatePlayerHud();
                return true;
            }

            if (!isPlayerAlive && inCombat) { // Added inCombat check

                // --- NEW: Hollow King Resurrection Logic ---
                const hasCrown = playerStats.isHollowKing && playerStats.activeTraits.some(t => t.name === 'Crown of the Undying');
                if (hasCrown) {
                    await displayMessage("Your form dissolves into nothingness... but the crown remains.", true);
                    await sleep(1000); // Dramatic pause
                    playerStats.currentHP = Math.floor(playerStats.maxHP * 0.30); // Resurrect at 30% HP
                    await displayMessage("Silence reigns, and from it, you are remade. The Hollow King cannot truly die.", true);
                    updatePlayerHud();
                    // By returning false, we prevent the "DEFEAT!" message and continue the battle.
                    return false; 
                }
                // --- End of New Logic ---

                await displayMessage("\n--- DEFEAT! ---", true);
                inCombat = false;
                gameActive = false;
                await displayMessage("You have been defeated! Game Over. Type 'start' to play again.");
                updatePlayerHud();
                return true;
            }
            return false;
        }
        /**
         * Applies end-of-round effects like resource regeneration and DoTs.
         */
        async function endOfRoundEffects() {
            await displayMessage("\n--- End of Round ---", true);
            turnNumber++;
            currentTurnIndex = 0; // Reset for the new round
            playerHasTakenTurn = false; // Reset for new round (e.g., Quick Slash)

            // Necromancer Soul Energy gain
            if (playerProgression.baseClass === 'necromancer' && playerDealtDamageThisTurn) {
                playerStats.resource.current = Math.min(playerStats.resource.max, playerStats.resource.current + 1);
                await displayMessage(`You gained 1 Soul Energy!`);
            }
            playerDealtDamageThisTurn = false;

            // Process status effects for all living combatants
            for (const combatant of [playerStats, ...currentEnemies, ...playerMinions].filter(c => c.hp > 0)) {
                combatant.statusEffects = combatant.statusEffects.filter(effect => {
                    if (effect.duration !== 'permanent') {
                        effect.duration--;
                    }
                    return effect.duration === 'permanent' || effect.duration > 0;
                });
            }
            updatePlayerHud();
        }

        /**
         * Adds experience points to the player and checks for level up.
         * @param {number} amount - The amount of experience to add.
         */
        async function addExperience(amount) {
            if (!playerProgression.baseClass) return; // Can't gain XP before choosing a class
            playerStats.experience += amount;
            await displayMessage(`You gained ${amount} experience points!`);
            await checkLevelUp();
        }

        /**
         * Checks if the player has enough experience to level up and handles it.
         */
        async function checkLevelUp() {
            while (playerStats.experience >= playerStats.expToNextLevel) {
                playerStats.experience -= playerStats.expToNextLevel;
                playerStats.level++;
                playerStats.expToNextLevel = Math.floor(playerStats.expToNextLevel * 1.5);

                await displayMessage(`\nCongratulations! You have reached Level ${playerStats.level}!`, true);
                
                playerStats.strength += 1;
                playerStats.intelligence += 1;
                playerStats.agility += 1;
                playerStats.maxHP += 10;
                playerStats.currentHP = playerStats.maxHP;
                playerStats.def += 1;
                playerStats.critChance = Math.min(0.5, playerStats.critChance + 0.01);

                playerStats.resource.max += 2;
                playerStats.resource.current = playerStats.resource.max;
                await displayMessage(`Stats increased! HP and ${playerStats.resource.type} refilled.`, true);

                await handleEvolution();
                updatePlayerHud();
            }
        }

        /**
         * Handles class evolution based on level and current branch.
         */
        async function handleEvolution() {
            if (playerStats.isHollowKing) {
                await displayMessage("Your form is beyond conventional evolution.", true);
                return;
            }

            const currentBaseClass = evolutionPaths[playerProgression.baseClass];
            if (!currentBaseClass) return;

            if (playerStats.level >= 3 && !playerProgression.currentBranch) {
                await displayMessage("\nYou feel a surge of new power! It's time to specialize.", true);
                await displayMessage("Choose your path:");
                const branches = Object.keys(currentBaseClass.branches);
                for (const branch of branches) {
                    await displayMessage(`- ${branch.replace(/_/g, ' ')}: ${currentBaseClass.branches[branch].theme}`);
                }
                awaitingBranchSelection = true;
                return;
            }
            
            if (playerProgression.currentBranch) {
                 const currentBranchPath = currentBaseClass.branches[playerProgression.currentBranch].stages;
                 // Find the next evolution stage the player qualifies for but hasn't reached yet
                 const nextStage = currentBranchPath.find((stage, index) => playerStats.level >= stage.level && index > playerProgression.currentEvolutionStageIndex);

                if (nextStage) {
                     const nextStageIndex = currentBranchPath.indexOf(nextStage);
                     playerProgression.currentEvolutionStageIndex = nextStageIndex;
                     playerProgression.currentEvolutionName = nextStage.name;
                     
                     await displayMessage(`\n--- Your destiny unfolds! You become a ${nextStage.name}! ---`, true, true);
                     if (nextStage.lore) await displayMessage(`"${nextStage.lore}"`);
                     
                     if (nextStage.skill && !playerStats.activeSkills.includes(nextStage.skill)) {
                         playerStats.activeSkills.push(nextStage.skill);
                         await displayMessage(`New Skill: ${nextStage.skill}!`, true);
                     }
                      if (nextStage.trait) {
                         playerStats.activeTraits.push({ name: nextStage.trait, effect: nextStage.traitEffect });
                         await displayMessage(`New Trait: ${nextStage.trait}!`, true);
                     }
                     
                     updatePlayerHud();
                }
            }
        }

        /**
         * Cheat command function to transform the player into The Hollow King.
         */
 /**
         * Cheat command function to transform the player into The Hollow King.
         */
        async function transformIntoHollowKing() {
            if (!playerProgression.baseClass) {
                await displayMessage("You must select a base class before you can embrace the void.", true);
                return;
            }

            const hkData = legendaryAndSecretClasses.the_hollow_king;

            // --- NEW: Grant legendary base stats ---
            playerStats.maxHP = 500;
            playerStats.currentHP = 500;
            playerStats.def = 50;
            playerStats.strength = 20;
            playerStats.intelligence = 20;
            playerStats.agility = 15;
            playerStats.critChance = 0.25;
            playerStats.critMultiplier = 2.5;
            // -----------------------------------------

            // Update Player Stats
            playerStats.name = hkData.name;
            playerStats.isHollowKing = true;
            playerStats.resource = { ...hkData.coreResource, current: hkData.coreResource.initial };

            // Update Skills, including the overdrive skill
            playerStats.activeSkills = [...hkData.skills, hkData.overdrive.name];

            // Update Traits/Passives
            playerStats.activeTraits = [...hkData.passives];

            // Update Progression State
            playerProgression.baseClass = 'hollow_king'; // Custom identifier
            playerProgression.currentBranch = null;
            playerProgression.currentEvolutionName = hkData.name;
            playerProgression.currentEvolutionStageIndex = 0; // or some other indicator

            // Notify the player
            gameOutput.innerHTML = '';
            await displayMessage(hkData.uponUnlock, true);
            await displayMessage("You have become The Hollow King. Your previous self is gone.", true);

            // Update UI and show current state
            updatePlayerHud();
            await displayRoomDescription(); // Show the room again with the new context
        }


       /**
         * Generates formatted strings for the class evolution tree and lore views.
         * @returns {object} An object containing 'tree' and 'lore' formatted strings.
         */
        function getClassEvolutionFormattedViews() {
            if (playerStats.isHollowKing) {
                const hk = legendaryAndSecretClasses.the_hollow_king;
                let loreView = `<br>--- The Hollow King Lore ---<br>`;
                loreView += `<strong>${hk.name}</strong>:<br>`;
                loreView += `  "${hk.uponUnlock}"<br>`;
                loreView += `<br>Identity:<br>  ${hk.identity}<br>`;
                return { tree: '', lore: loreView };
            }

            const baseClass = playerProgression.baseClass;
            if (!baseClass) return { tree: "No class selected yet.", lore: "" };

            const evolutionData = evolutionPaths[baseClass];
            let treeView = `<br>--- Evolution Tree for ${baseClass} ---<br>`;
            
            Object.values(evolutionData.branches).forEach(branch => {
                treeView += `<br><strong>Branch: ${branch.name}</strong><br>`;
                branch.stages.forEach((stage, index) => {
                    const isCurrent = playerProgression.currentBranch === branch.name.toLowerCase().replace(' ', '_') && playerProgression.currentEvolutionStageIndex === index;
                    let nameDisplay = stage.name;
                    if (stage.ascended) nameDisplay = `<span style="color: #f6ad55;">${stage.name} (Ascended)</span>`;
                    else if (stage.unlockTrigger) nameDisplay = `<span style="color: #fc8181;">${stage.name} (Event)</span>`;
                    
                    treeView += `  L${stage.level}: ${nameDisplay}${isCurrent ? ' (CURRENT)' : ''}<br>`;
                });
            });

            return { tree: treeView, lore: "Lore details can be expanded here." };
        }

        /**
         * Displays the class evolution tree and lore.
         */
        async function displayClassLore() {
            gameOutput.innerHTML = '';
            if (!playerProgression.baseClass) {
                await displayMessage("You need to choose a class first!", true);
                return;
            }
            const evolutionViews = getClassEvolutionFormattedViews();
            await displayMessage(evolutionViews.tree, true, true); // Display tree view as HTML
            // await displayMessage(evolutionViews.lore, false, true); // Display lore view as HTML
        }

        /**
         * Updates the Player HUD with current player stats and resources.
         */
        function updatePlayerHud() {
            if (!playerHudElement || !playerProgression.baseClass) {
                if(playerHudElement) playerHudElement.innerHTML = '';
                return;
            }

            const hpPercent = (playerStats.currentHP / playerStats.maxHP) * 100;
            let hpBarColorClass = hpPercent <= 30 ? 'critical' : hpPercent <= 60 ? 'low' : '';
            const resourcePercent = (playerStats.resource.max > 0) ? (playerStats.resource.current / playerStats.resource.max) * 100 : 0;
            
            let hudContent = `
                <div class="hud-section">
                    <strong>${playerStats.name}</strong><br>
                    Lvl ${playerStats.level} ${playerProgression.currentEvolutionName || playerProgression.baseClass}
                </div>
                <div class="hud-section">
                    HP: ${playerStats.currentHP}/${playerStats.maxHP}
                    <div class="hud-bar-container"><div class="hud-hp-bar ${hpBarColorClass}" style="width: ${hpPercent}%;"></div></div>
                    DEF: ${playerStats.def}
                </div>
                <div class="hud-section">
                    ${playerStats.resource.type}: ${playerStats.resource.current}/${playerStats.resource.max}
                    <div class="hud-bar-container"><div class="hud-resource-bar" style="width: ${resourcePercent}%;"></div></div>
                </div>
            `;
            
             if (playerMinions.length > 0) {
                hudContent += `<div class="hud-section"><strong>Minions (${playerMinions.filter(m => m.hp > 0).length})</strong><br>`;
                playerMinions.forEach(minion => {
                    if (minion.hp > 0) hudContent += `<span class="hud-minion-list">• ${minion.name} ${minion.hp}/${minion.maxHp} HP</span><br>`;
                });
                hudContent += `</div>`;
            }

            if (playerStats.statusEffects.length > 0) {
                hudContent += `<div class="hud-section"><strong>Effects</strong><br>`;
                playerStats.statusEffects.forEach(effect => {
                    hudContent += `<span class="text-xs text-blue-300">${effect.name} (${effect.duration -1}t)</span><br>`;
                });
                hudContent += `</div>`;
            }

            playerHudElement.innerHTML = hudContent;
        }


        /**
         * Processes the player's command.
         * @param {string} commandText - The command entered by the player.
         */
        async function processCommand(commandText) {
            const cleanedCommand = commandText.trim();
            gameInput.value = '';

            if (isTyping || cleanedCommand === '') return;

            if (inCombat) {
                await processCombatCommand(cleanedCommand);
                return;
            }

            if (!gameActive && cleanedCommand.toLowerCase() !== 'start') {
                await displayMessage("The game is over. Type 'start' to play again.", true);
                return;
            }

            gameOutput.innerHTML = '';

            if (awaitingClassSelection) {
                const className = cleanedCommand.toLowerCase();
                if (basePlayerClasses[className]) {
                    initializePlayer(className);
                    awaitingClassSelection = false;
                    await displayMessage(`You have chosen to be a ${playerProgression.baseClass}!`, true);
                    await displayRoomDescription();
                } else {
                    await displayMessage("That is not a valid class. Please choose again.");
                }
                return;
            }

            if (awaitingBranchSelection) {
                const branchName = cleanedCommand.toLowerCase().replace(' ', '_');
                const availableBranches = Object.keys(evolutionPaths[playerProgression.baseClass].branches);
                if (availableBranches.includes(branchName)) {
                    playerProgression.currentBranch = branchName;
                    awaitingBranchSelection = false;
                    await displayMessage(`You have chosen the path of the ${branchName.replace(/_/g, ' ')}!`, true);
                    await handleEvolution();
                } else {
                    await displayMessage("That is not a valid branch. Please choose again.");
                }
                return;
            }

            await displayMessage(`> ${cleanedCommand}`, false);
            const { command: mainCommand, targetNum } = normalizeCommandInput(cleanedCommand);
            const argument = cleanedCommand.split(' ').slice(1).join(' ');

            switch (mainCommand) {
                case 'go': await movePlayer(argument); break;
                case 'take': case 'get': await takeItem(argument); break;
                case 'inventory': case 'i': await showInventory(); break;
                case 'look': await displayRoomDescription(); break;
                case 'help': await displayMessage("Commands: go, take, inventory, look, engage, class_lore, quit."); break;
                case 'quit': gameActive = false; await displayMessage("Thanks for playing!", true); break;
                case 'start': await startGame(); break;
                case 'engage':
                    const roomEnemies = rooms[currentRoom]?.enemies;
                    if (roomEnemies && roomEnemies.length > 0) {
                        await startCombat(roomEnemies);
                    } else {
                        await displayMessage("There are no enemies here.");
                    }
                    break;
                case 'class_lore': case 'cl': await displayClassLore(); break;
                case 'add_xp': await addExperience(parseInt(argument) || 50); break;
                case 'become_hollow_king': await transformIntoHollowKing(); break; // <-- CHEAT ADDED HERE
                default: await displayErrorMessage("I don't understand that command.", mainCommand); break;
            }
        }

        /**
         * Processes commands when the game is in combat mode.
         * @param {string} commandText - The command entered by the player.
         */
        async function processCombatCommand(commandText) {
            const { command: mainCommandRaw, targetNum } = normalizeCommandInput(commandText);
            gameOutput.innerHTML = '';
            await displayMessage(`> ${commandText}`, false);

            if (!turnOrder[currentTurnIndex]?.isPlayer) {
                await displayMessage("It's not your turn yet!");
                return;
            }

            let actionTaken = false;
            const resolvedSkillName = resolveSkillName(mainCommandRaw);
            
            if (resolvedSkillName) {
                actionTaken = await handlePlayerSkillAction(resolvedSkillName, targetNum);
            } else {
                switch (mainCommandRaw) {
                    case 'attack':
                        const playerBasicAttack = basePlayerClasses[playerProgression.baseClass]?.startingSkills[0] || 'Slash';
                        actionTaken = await handlePlayerSkillAction(playerBasicAttack, targetNum);
                        break;
                    case 'flee':
                        inCombat = false;
                        await displayMessage("You fled from combat!");
                        await displayRoomDescription();
                        return;
                    case 'class_lore': case 'cl':
                        await displayClassLore();
                        await displayCombatState(); // Re-display combat prompt
                        return; // Does not consume a turn
                    default:
                        await displayErrorMessage("Unknown command in combat.", mainCommandRaw);
                        return;
                }
            }

            if (actionTaken) {
                if (await checkBattleEnd()) return;
                currentTurnIndex++;
                if (currentTurnIndex >= turnOrder.length) {
                   await endOfRoundEffects();
                }
                await resolveTurn();
            }
        }
        
        /**
         * Resolves a skill name from input, checking aliases and full names.
         * @param {string} input - The raw command part for the skill.
         * @returns {string|null} The canonical skill name or null if not found.
         */
        function resolveSkillName(input) {
            const lowerInput = input.toLowerCase();
            if (skillAliases[lowerInput]) return skillAliases[lowerInput];
            for (const skillName in skillDefinitions) {
                if (skillName.toLowerCase() === lowerInput) return skillName;
            }
            return null;
        }


        /**
         * Handles player's skill actions, including target resolution and resource checks.
         * @param {string} skillName - The normalized skill name.
         * @param {number|null} targetNum - The target number from input.
         * @returns {Promise<boolean>} True if action was successfully taken.
         */
        async function handlePlayerSkillAction(skillName, targetNum) {
            const skillInfo = skillDefinitions[skillName];

            if (!skillInfo || !playerStats.activeSkills.includes(skillName)) {
                await displayErrorMessage(`You don't know the skill '${skillName}'.`, skillName);
                return false;
            }

            const cost = skillInfo.cost === 'all' ? playerStats.resource.current : (skillInfo.cost || 0);
            if (playerStats.resource.current < cost) {
                await displayErrorMessage(`Not enough ${playerStats.resource.type}!`, skillName);
                return false;
            }

            let targets = [];
            const livingEnemies = currentEnemies.filter(e => e.hp > 0);

            switch (skillInfo.target) {
                case 'enemy_single':
                    const targetEnemy = getTargetEnemy(targetNum);
                    if (!targetEnemy) {
                        await displayErrorMessage(getInvalidTargetMessage(targetNum, livingEnemies), skillName);
                        return false;
                    }
                    targets.push(targetEnemy);
                    break;
                case 'self':
                    targets.push(playerStats);
                    break;
                case 'enemy_aoe': case 'all_enemies':
                    targets = livingEnemies;
                    if (targets.length === 0) {
                        await displayErrorMessage(`No enemies to target.`, skillName);
                        return false;
                    }
                    break;
                 case 'minions':
                    targets = playerMinions.filter(m => m.hp > 0);
                     if (targets.length === 0) {
                        await displayErrorMessage(`You have no minions to target.`, skillName);
                        return false;
                    }
                    break;
                default:
                    await displayErrorMessage(`Target type '${skillInfo.target}' is not implemented.`, skillName);
                    return false;
            }

            if (cost > 0) {
                playerStats.resource.current -= cost;
                await displayMessage(`Used ${cost} ${playerStats.resource.type}.`);
            }

            return await applySkillEffect(playerStats, targets, skillInfo);
        }

        /**
         * Helper to get a target enemy by its 1-based index.
         * @param {number} index - The 1-based index of the enemy.
         * @returns {object | null} The enemy object or null.
         */
        function getTargetEnemy(index) {
            const livingEnemies = currentEnemies.filter(e => e.hp > 0);
            if (index > 0 && index <= livingEnemies.length) return livingEnemies[index - 1];
            if (index === null && livingEnemies.length === 1) return livingEnemies[0];
            return null;
        }
        
        /**
         * Generates a standardized invalid target message.
         * @param {number} targetNum - The invalid target number.
         * @param {Array<object>} livingEnemies - The list of valid targets.
         * @returns {string} The formatted message.
         */
        function getInvalidTargetMessage(targetNum, livingEnemies) {
            let msg = `Invalid target '${targetNum || 'none specified'}'.`;
            if (livingEnemies.length === 0) {
                msg += ` There are no living enemies.`;
            } else {
                msg += ` Valid targets: ${livingEnemies.map((e, i) => i + 1).join(', ')}.`;
            }
            return msg;
        }

        /**
         * Displays a helpful error message with context.
         * @param {string} errorMessage - The specific error.
         * @param {string} originalCommandPart - The part of the command that caused the error.
         */
        async function displayErrorMessage(errorMessage, originalCommandPart) {
            await displayMessage(`Error: ${errorMessage}`, true);
            const suggestions = findSimilarSkills(originalCommandPart);
            if (suggestions.length > 0) {
                await displayMessage(`Did you mean: ${suggestions.join(', ')}?`);
            }
            if (inCombat) {
                await displayCombatState();
            }
        }


        // --- Event Listeners ---
        gameInput.addEventListener('keypress', async (event) => {
            if (event.key === 'Enter') {
                await processCommand(event.target.value);
            } else if (event.key === ' ') {
                // FIXED: Only allow space to skip if input is empty, to avoid skipping when typing multi-word commands.
                if (isTyping && currentTypingPromiseResolve && event.target.value.trim() === '') {
                    skipTyping = true;
                    event.preventDefault(); // Prevent space from being typed
                }
            }
        });

        submitButton.addEventListener('click', async () => {
            await processCommand(gameInput.value);
        });

        // --- Initialize the Game ---
        document.addEventListener('DOMContentLoaded', startGame);
