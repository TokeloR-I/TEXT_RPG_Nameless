        // --- Game Elements ---
        const gameOutput = document.getElementById('game-output');
        const gameInput = document.getElementById('game-input');
        const submitButton = document.getElementById('submit-command');
        const playerHudElement = document.getElementById('player-hud'); // New HUD element reference

        // --- Game World Data ---
        const rooms = {
            'starting_room': {
                description: "You awaken in a damp, musty cellar. A faint light filters through a crack in the ceiling. Crows circle above the broken ceiling. You don’t remember how you got here… but your hands glow faintly with forbidden power.",
                exits: {
                    'north': 'wooden_door_room',
                    'east': 'dark_passage'
                },
                enemies: ['weak_goblin'], // Example: Add enemies to a room
                items: []
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
            'Grave Bolt': { description: '10–14 dmg, +2 dmg per corpse on the battlefield.', cost: 1, resource: 'Soul Energy', base_damage: [10, 14], target: 'enemy_single', damage_type: 'magic' },
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
            'Mirror Image': { description: 'Avoid next hit.', cost: 1, resource: 'Deception Tokens', effects: [{ type: 'avoid_next_hit', duration: 1 }], target: 'self' },
            'Confuse': { description: '50% chance enemy skips turn.', cost: 2, resource: 'Deception Tokens', effects: [{ type: 'skip_turn_chance', value: 0.5, duration: 1 }], target: 'enemy_single' },
            'Steal enemy’s last used skill': { description: 'Steal enemy’s last used skill for 2 turns.', cost: 3, resource: 'Deception Tokens', effects: [{ type: 'steal_skill', duration: 2 }], target: 'enemy_single' },
            'Multi-target illusions': { description: 'Up to 3 enemies skip turn.', cost: 4, resource: 'Deception Tokens', effects: [{ type: 'skip_turn_aoe', count: 3, duration: 1 }], target: 'enemy_aoe' },

            // Chronomancer Branch Skills
            'Haste': { description: 'Ally takes extra turn.', cost: 2, resource: 'Time Charges', effects: [{ type: 'extra_turn' }], target: 'ally_single' },
            'Slow': { description: 'Enemy loses next turn.', cost: 2, resource: 'Time Charges', effects: [{ type: 'skip_turn', duration: 1 }], target: 'enemy_single' },
            'Revert ally to HP': { description: 'Revert ally to HP they had 2 turns ago.', cost: 3, resource: 'Time Charges', effects: [{ type: 'revert_hp', turns: 2 }], target: 'ally_single' },
            'Freeze time': { description: 'Enemies can’t act for 1 turn.', cost: 5, resource: 'Time Charges', effects: [{ type: 'freeze_enemies', duration: 1 }], target: 'all_enemies' },
            'Rearrange turn order': { description: 'Rearrange entire turn order for 3 turns.', cost: 'all', resource: 'Time Charges', effects: [{ type: 'rearrange_turn_order', duration: 3 }], target: 'all_combatants' },


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
            'Eternal Architect': { description: 'Rearrange entire turn order for 3 turns.', cost: 'all', resource: 'Time Charges', oncePerFight: true, effects: [{ type: 'rearrange_turn_order', duration: 3 }], target: 'all_combatants' } // Chronomancer Ascended
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
                description: "A strong and resilient fighter, adept with weapons. Can evolve into Vanguard, Berserker, or Warden.",
                lore: {
                    base: "Steel in your hands, resolve in your heart. You fight because you must — and because no one else will.",
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
                              ],
                              coreLoop: [
                                'Link enemies → drain health → sustain while whittling enemy down.'
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
                            { level: 3, name: 'Illusionist', trait: 'Mirror Image avoids next hit', traitEffect: 'Your Mirror Image spell guarantees evasion of the next incoming attack.', skill: 'Mirror Image', lore: "You weave veils of illusion, twisting perception and confounding your enemies. Reality is merely a suggestion.", loreStance: "Reality is a suggestion.", loreEffect: "You can create illusory duplicates to avoid incoming attacks." },
                            { level: 5, name: 'Shadowmind', trait: 'Confuse has 50% chance enemy skips turn', traitEffect: 'Your Confuse spell has a chance to make enemies skip their turn entirely.', skill: 'Confuse', lore: "You delve into the minds of your foes, planting seeds of doubt and fear. Their thoughts become your playground.", loreStance: "Playground of thoughts.", loreEffect: "You can sow confusion, potentially causing enemies to lose their turns." },
                            { level: 8, name: 'Spellthief', trait: 'Steal enemy’s last used skill for 2 turns', traitEffect: 'You can temporarily steal an enemy’s recently used skill, turning their power against them.', skill: 'Steal enemy’s last used skill', lore: "You do not merely counter magic; you claim it. Their spells become your tools, their power your own.", loreStance: "Their power, your own.", loreEffect: "You can temporarily acquire and use enemy abilities." },
                            { level: 11, name: 'Mindweaver', trait: 'Multi-target illusions, up to 3 enemies skip turn', traitEffect: 'Your illusions can affect multiple enemies, causing widespread disruption.', skill: 'Multi-target illusions', upgrade: 'Multi-target illusions, up to 3 enemies skip turn.', lore: "Your mental dominion expands, weaving intricate illusions that ensnare the minds of many. Entire battlefields fall silent under your influence.", loreStance: "Silent dominion.", loreEffect: "You can affect multiple targets with your illusions, causing widespread confusion." },
                            { level: 14, name: 'Arcane Hollow', trait: 'Permanently remove 1 skill from enemy on hit; needed for Reality Breaker Legendary.', traitEffect: 'Your attacks can permanently strip enemies of their abilities, crippling them for the entire encounter.', skill: 'Arcane Hollow', ascended: true, lore: "You are a void in the weave of magic, consuming spells and abilities with every touch. The very essence of magic unravels before you.", loreStance: "Void in the weave.", loreEffect: "Your touch can permanently erase enemy skills, paving the way for ultimate power." }
                        ]
                    },
                    'chronomancer': {
                        name: 'Chronomancer',
                        theme: 'Time control, turn manipulation, support.',
                        mechanic: 'Time Charges — gain 1 per turn, store up to 3; spend to act twice.',
                        resourceEvolution: [
                            { level: 3, stage: 'Chronomancer', type: 'Time Charges' }
                        ],
                        stages: [
                            { level: 3, name: 'Chronomancer', trait: 'Haste grants ally extra turn', traitEffect: 'Your Haste spell grants an ally an immediate extra turn, accelerating their actions.', skill: 'Haste', lore: "You bend the fabric of time, accelerating allies and slowing foes. The battlefield moves to your rhythm.", loreStance: "Rhythm of time.", loreEffect: "You can manipulate the flow of time for allies." },
                            { level: 5, name: 'Timebinder', trait: 'Slow makes enemy lose next turn', traitEffect: 'You can cause an enemy to completely lose their next turn, disrupting their actions.', skill: 'Slow', lore: "You knot the threads of fate, ensnaring enemies in temporal distortions. Their movements become sluggish, their actions delayed.", loreStance: "Knotting fate.", loreEffect: "You can bind enemies in temporal distortions, causing them to lose turns." },
                            { level: 8, name: 'Riftseer', trait: 'Revert ally to HP they had 2 turns ago', traitEffect: 'You can rewind an ally’s health state, undoing recent damage or debuffs.', skill: 'Revert ally to HP', lore: "You gaze into the echoes of the past, pulling fragments of what was to mend what is. Time is a tool in your hands.", loreStance: "Echoes of the past.", loreEffect: "You can undo recent damage or debuffs to allies by rewinding their health." },
                            { level: 11, name: 'Epoch Guardian', trait: 'Freeze time for 1 turn (enemies can’t act)', traitEffect: 'You can momentarily halt the flow of time for your enemies, rendering them immobile.', skill: 'Freeze time', lore: "You stand as a bulwark against the ravages of time, able to halt its relentless march for your foes. The present is yours to command.", loreStance: "Command the present.", loreEffect: "You can freeze enemies in time, preventing them from acting." },
                            { level: 14, name: 'Eternal Architect', trait: 'Rearrange entire turn order for 3 turns.', traitEffect: 'You can completely reorder the combat sequence for a limited time, dictating who acts when.', skill: 'Rearrange turn order', ascended: true, lore: "You are the master of causality, the architect of destiny. Time is but clay in your hands, to be molded as you see fit.", loreStance: "Architect of destiny.", loreEffect: "You gain ultimate control over the flow of combat, dictating the turn order itself." }
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
        let inCombat = false; // New: Flag to indicate if currently in combat
        let currentEnemies = []; // New: Array to hold current enemies in combat
        let playerMinions = []; // New: Array to hold player's summoned minions
        let turnOrder = []; // New: Array to hold the turn order of combatants
        let currentTurnIndex = 0; // New: Index of the current combatant in turnOrder
        let isTyping = false; // New: Flag to indicate if text is currently being typed
        let skipTyping = false; // New: Flag to skip current typing animation
        let corpsesOnBattlefield = 0; // New: Counter for Necromancer Grave Bolt synergy
        let playerDealtDamageThisTurn = false; // New: Flag for Necromancer Soul Energy regen

        // Typing speed control (milliseconds per character)
        const TYPING_SPEED_MS = 16; // 20% faster than 20ms

        let playerStats = {
            name: 'Adventurer', // Default name, will be updated by class selection
            currentHP: 0,
            maxHP: 0,
            // FIX: 5, 6, 11 - To ensure combatant and playerStats are always in sync,
            // we will use `currentHP` consistently and add a getter `hp` for compatibility with older logic if needed.
            get hp() { return this.currentHP; },
            set hp(value) { this.currentHP = value; },
            strength: 0,
            intelligence: 0,
            agility: 0,
            baseDamageMin: 0,
            baseDamageMax: 0,
            def: 0, // Added DEF
            critChance: 0, // Added Crit Chance
            critMultiplier: 0, // Added Crit Multiplier
            level: 1,
            experience: 0,
            expToNextLevel: 100,
            resource: { type: 'None', current: 0, max: 0, regen: 0 },
            inventory: [],
            activeSkills: [],
            activeTraits: [],
            statusEffects: [], // New: Array to hold active status effects
            // Special flags for Legendary/Secret forms
            isHollowKing: false,
            controlledSouls: 0 // Placeholder for Hollow King unlock condition
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
         * Handles: lowercase, trim, collapse multiple spaces, extracts target number.
         * @param {string} input - The raw command string.
         * @returns {object} An object with `command` (main part) and `targetNum` (integer or null).
         */
        function normalizeCommandInput(input) {
            let cleaned = input.toLowerCase().trim();
            cleaned = cleaned.replace(/\s+/g, ' '); // Replace multiple spaces with a single space

            let targetNum = null;
            let command = cleaned;

            // Check for target number at the end (e.g., "skill 1", "skill@1", "skill#1")
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

            // Prioritize exact matches (case-insensitive) or startsWith
            for (const skill of allSkills) {
                if (skill.toLowerCase() === inputSkillName.toLowerCase()) {
                    return [skill]; // Exact match, return immediately
                }
                if (skill.toLowerCase().startsWith(inputSkillName.toLowerCase())) {
                    suggestions.push(skill);
                }
            }

            // Fallback to fuzzy matching (simple includes for now)
            if (suggestions.length < 3) {
                for (const skill of allSkills) {
                    if (skill.toLowerCase().includes(inputSkillName.toLowerCase()) && !suggestions.includes(skill)) {
                        suggestions.push(skill);
                    }
                }
            }

            return suggestions.slice(0, 3); // Return up to 3 suggestions
        }

        let currentTypingPromiseResolve = null; // Global variable to hold the resolve function for skipping

        // --- Game Functions ---

        /**
         * Adds a message to the game output display with a typing effect.
         * @param {string} message - The text message to display.
         * @param {boolean} isImportant - If true, displays the message in bold.
         * @returns {Promise<void>} A promise that resolves when the message is fully typed.
         */
        async function displayMessage(message, isImportant = false) {
            isTyping = true;
            skipTyping = false; // Reset skip flag for new message
            gameInput.disabled = true; // Disable input while typing
            submitButton.disabled = true;

            return new Promise(async (resolve) => {
                currentTypingPromiseResolve = resolve; // Store resolve function

                const lines = message.split('\n');
                for (const line of lines) {
                    const p = document.createElement('p');
                    if (isImportant) {
                        p.innerHTML = `<strong></strong>`; // Create strong tag inside p
                    }
                    gameOutput.appendChild(p);

                    const targetElement = isImportant ? p.querySelector('strong') : p;

                    for (let i = 0; i < line.length; i++) {
                        if (skipTyping) {
                            targetElement.textContent = line; // Show full line instantly
                            break; // Exit character loop
                        }
                        targetElement.textContent += line.charAt(i);
                        gameOutput.scrollTop = gameOutput.scrollHeight; // Keep scrolling to bottom
                        await sleep(TYPING_SPEED_MS); // Use faster speed
                    }
                    if (skipTyping) {
                        // If skipped, ensure all remaining lines are displayed instantly
                        for (let j = lines.indexOf(line) + 1; j < lines.length; j++) {
                            const nextP = document.createElement('p');
                            if (isImportant) {
                                nextP.innerHTML = `<strong>${lines[j]}</strong>`;
                            } else {
                                nextP.textContent = lines[j];
                            }
                            gameOutput.appendChild(nextP);
                        }
                        break; // Exit line loop
                    }
                }
                isTyping = false;
                skipTyping = false; // Reset skip flag
                currentTypingPromiseResolve = null; // Clear resolve function
                gameInput.disabled = false; // Re-enable input
                submitButton.disabled = false;
                gameInput.focus(); // Re-focus input
                resolve(); // Resolve the promise
            });
        }

        /**
         * Initializes player stats and progression based on the chosen base class.
         * @param {string} className - The key for the chosen base class (e.g., 'warrior').
         */
        function initializePlayer(className) {
            const baseClassInfo = basePlayerClasses[className];
            if (baseClassInfo) {
                playerStats.name = baseClassInfo.name || className.charAt(0).toUpperCase() + className.slice(1); // Initialize player name
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
                playerStats.resource = {
                    type: baseClassInfo.startingResource.type,
                    current: baseClassInfo.startingResource.initial,
                    max: baseClassInfo.startingResource.max,
                    regen: baseClassInfo.startingResource.regen || 0
                };
                playerStats.isHollowKing = false;
                playerStats.statusEffects = []; // Clear status effects on new game

                playerProgression.baseClass = className;
                playerProgression.currentBranch = null;
                playerProgression.currentEvolutionName = baseClassInfo.name || className.charAt(0).toUpperCase() + className.slice(1);
                playerProgression.currentEvolutionStageIndex = 0;

                updatePlayerHud(); // Initial HUD update
            } else {
                console.error("Attempted to initialize with an invalid class:", className);
            }
        }


        /**
         * Starts or restarts the game.
         */
        async function startGame() { // Made async
            gameOutput.innerHTML = ''; // Clear previous game output
            await displayMessage("Welcome to the Retro Adventure!", true);
            await displayMessage("To begin your journey, choose your path. Available classes:");

            for (const className in basePlayerClasses) {
                await displayMessage(`- ${className.charAt(0).toUpperCase() + className.slice(1)}: ${basePlayerClasses[className].description}`);
            }
            await displayMessage("Type the name of the class you wish to play (e.g., 'warrior', 'mage', 'rogue', 'necromancer').", true);

            currentRoom = 'starting_room';
            gameActive = true;
            inCombat = false; // Ensure not in combat
            awaitingClassSelection = true;
            awaitingBranchSelection = false;
            gameInput.focus();
        }

        /**
         * Displays the description of the current room and available actions.
         */
        async function displayRoomDescription() { // Made async
            gameOutput.innerHTML = ''; // Clear log for new action
            const room = rooms[currentRoom];
            if (room) {
                await displayMessage("--- " + currentRoom.replace(/_/g, ' ').toUpperCase() + " ---", true);
                await displayMessage(room.description);

                await displayMessage("\nWhat do you do?");

                // Display Exits
                if (Object.keys(room.exits).length > 0) {
                    await displayMessage("\n-- Exits --", true);
                    for (const direction in room.exits) {
                        await displayMessage(`👣 Go ${direction}`);
                    }
                }

                // Display Enemies and Combat Option
                if (room.enemies && room.enemies.length > 0) {
                    await displayMessage("\n-- Enemies Present --", true);
                    for (const enemyKey of room.enemies) { // Use for...of for async loop
                        const enemyInfo = enemies[enemyKey];
                        if (enemyInfo) {
                            await displayMessage(`Beware! A ${enemyInfo.name} lurks here.`);
                        }
                    }
                    await displayMessage("⚔️ Engage (start combat)");
                }

                // Display Items
                if (room.items && room.items.length > 0) {
                    await displayMessage("\n-- Items here --", true);
                    for (const item of room.items) {
                        await displayMessage(`✋ Take ${item}`);
                    }
                }

                // Display Available Skills (simplified for now, will expand with combat)
                if (playerStats.activeSkills.length > 0 && playerProgression.baseClass) {
                    await displayMessage("\n-- Skills --", true);
                    for (const skillName of playerStats.activeSkills) {
                        const skillInfo = skillDefinitions[skillName];
                        if (skillInfo) {
                            let skillDisplay = `✨ Use ${skillName} (${skillInfo.description})`;
                            // FIX: 2. Using Number.isFinite for robust cost checking.
                            if ((Number.isFinite(skillInfo.cost) && skillInfo.cost > 0) || skillInfo.cost === 'all') {
                                skillDisplay += ` [Cost: ${skillInfo.cost} ${playerStats.resource.type}]`;
                            }
                            await displayMessage(skillDisplay);
                        } else {
                            await displayMessage(`✨ Use ${skillName} (Description missing!)`);
                        }
                    }
                }

                // Generic commands always available
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
         * Starts a combat encounter.
         * @param {Array<string>} enemyKeys - An array of enemy keys (e.g., ['weak_goblin', 'hungry_wolf']).
         */
        async function startCombat(enemyKeys) { // Made async
            gameOutput.innerHTML = ''; // Clear log for new action
            inCombat = true;
            currentEnemies = [];
            playerMinions = []; // Reset minions at start of combat
            corpsesOnBattlefield = 0; // Reset corpses
            playerDealtDamageThisTurn = false; // Reset damage flag for new combat
            turnOrder = [];
            currentTurnIndex = 0;

            await displayMessage("\n--- COMBAT INITIATED! ---", true);

            // FIX: 5, 6, 11. Use the actual playerStats object in combat to ensure it's always in sync.
            // Add combat-specific properties directly to it.
            playerStats.id = 'player';
            playerStats.isPlayer = true;
            playerStats.isMinion = false;
            // statusEffects are already on playerStats

            // Populate currentEnemies with copies of enemy data
            for (const [index, key] of enemyKeys.entries()) {
                const enemyTemplate = enemies[key];
                if (enemyTemplate) {
                    // Create a deep copy to avoid modifying original enemy definitions
                    const newEnemy = JSON.parse(JSON.stringify(enemyTemplate));
                    newEnemy.id = `enemy_${index}`; // Unique ID for targeting
                    newEnemy.isPlayer = false;
                    newEnemy.isMinion = false;
                    newEnemy.statusEffects = []; // Initialize status effects for enemy
                    currentEnemies.push(newEnemy);
                    await displayMessage(`A ${newEnemy.name} appears! (HP: ${newEnemy.hp})`);
                } else {
                    await displayMessage(`Warning: Unknown enemy type '${key}' encountered.`);
                }
            }

            // FIX: 5, 11. Add the single source of truth (playerStats) to the turn order.
            turnOrder = [playerStats, ...currentEnemies];

            // Sort turn order by speed (higher speed goes first)
            turnOrder.sort((a, b) => (b.agility || b.spd) - (a.agility || a.spd));


            await displayMessage("\n--- Battle Order ---", true);
            for (const combatant of turnOrder) {
                await displayMessage(`${combatant.name} (SPD: ${combatant.agility || combatant.spd})`);
            }
            updatePlayerHud(); // Update HUD after combat starts

            // Start the first turn
            await resolveTurn();
        }

        /**
         * Displays the current state of combat (player and enemy HP) and the numbered action menu.
         */
        async function displayCombatState() { // Made async
            for (const [index, enemy] of currentEnemies.entries()) {
                if (enemy.hp > 0) {
                    await displayMessage(`${index + 1}. ${enemy.name} (${enemy.hp}/${enemy.maxHp} HP)`);
                }
            }
            await displayMessage("---------------------");
            await displayMessage("What will you do?");

            const combatActions = [];
            // Dynamically get the basic attack skill name for the current class
            const playerBasicAttackSkillName = basePlayerClasses[playerProgression.baseClass]?.startingSkills[0] || 'Slash';
            combatActions.push({ type: 'attack', name: 'Attack', skillName: playerBasicAttackSkillName }); 
            
            // Add active skills
            playerStats.activeSkills.forEach(skillName => {
                combatActions.push({ type: 'skill', name: skillName, skillName: skillName });
            });

            combatActions.push({ type: 'flee', name: 'Flee' });

            for (let i = 0; i < combatActions.length; i++) {
                const action = combatActions[i];
                let displayLine = `${i + 1}. ${action.name}`;
                if (action.type === 'skill' && skillDefinitions[action.skillName]) {
                    const skillInfo = skillDefinitions[action.skillName];
                    // FIX: 2. Use Number.isFinite for robust cost checking
                    if ((Number.isFinite(skillInfo.cost) && skillInfo.cost > 0) || skillInfo.cost === 'all') {
                        displayLine += ` [Cost: ${skillInfo.cost} ${playerStats.resource.type}]`;
                    }
                }
                await displayMessage(displayLine);
            }
            await displayMessage("Or type a command directly (e.g., 'attack 1', 'use grave bolt 1').");
        }

        /**
         * Resolves one full turn in combat.
         */
        async function resolveTurn() { // Made async
            if (!inCombat) return;

            // Clean up dead combatants from turn order
            turnOrder = turnOrder.filter(c => c.hp > 0);
            currentEnemies = currentEnemies.filter(e => e.hp > 0);
            playerMinions = playerMinions.filter(m => m.hp > 0);

            if (await checkBattleEnd()) { // Check if battle ended after cleanup
                return;
            }

            // Ensure currentTurnIndex is valid after filtering
            if (currentTurnIndex >= turnOrder.length) {
                currentTurnIndex = 0; // Reset to start of new round if index is out of bounds
            }

            const currentCombatant = turnOrder[currentTurnIndex];

            // If it's the player's turn, display prompt and wait for input
            if (currentCombatant.isPlayer) {
                await displayMessage(`\n--- Your Turn! ---`, true);
                await displayCombatState();
                updatePlayerHud(); // Update HUD at start of player's turn
                gameInput.focus();
                // We return here and wait for processCombatCommand to call resolveTurn again
                return;
            } else if (currentCombatant.isMinion) {
                await displayMessage(`\n--- ${currentCombatant.name}'s Turn! ---`, true);
                await minionTurn(currentCombatant);
            } else { // It's an enemy's turn
                await displayMessage(`\n--- ${currentCombatant.name}'s Turn! ---`, true);
                await enemyTurn(currentCombatant);
            }

            if (await checkBattleEnd()) { // Await checkBattleEnd after action
                return; // Battle ended, stop turn resolution
            }

            currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;

            // If we've wrapped around to the start of the turn order, it's the end of the round
            if (currentTurnIndex === 0) {
                await endOfRoundEffects(); // Await endOfRoundEffects
            }
            updatePlayerHud(); // Update HUD after each combatant's turn
            await resolveTurn(); // Recursively call for next turn (enemy or player)
        }

        /**
         * Handles an enemy's turn (basic AI).
         * @param {object} enemy - The enemy combatant taking the turn.
         */
        async function enemyTurn(enemy) { // Made async
            // Simple AI: always attack the player
            const player = turnOrder.find(c => c.isPlayer);
            if (player && player.hp > 0) {
                let enemySkill = skillDefinitions[enemy.skills[0]?.name]; // Try to get enemy's first skill
                if (!enemySkill) {
                    enemySkill = skillDefinitions['Basic Attack']; // Fallback to Basic Attack
                    await displayMessage(`${enemy.name} fumbles and resorts to a basic attack.`);
                }

                const damageDealt = calculateDamage(enemy, player, enemySkill);
                // FIX: 5, 11. Damage is dealt directly to the single playerStats object.
                playerStats.currentHP -= damageDealt;
                await displayMessage(`${enemy.name} attacks you for ${damageDealt} damage! Your HP: ${playerStats.currentHP}/${playerStats.maxHP}`);
            } else {
                await displayMessage(`${enemy.name} has no target to attack.`);
            }
        }

        /**
         * Handles a minion's turn (basic AI).
         * @param {object} minion - The minion combatant taking the turn.
         */
        async function minionTurn(minion) {
            // Simple AI: always attack the first living enemy
            const targetEnemy = currentEnemies.find(e => e.hp > 0);
            if (targetEnemy) {
                // FIX: 7. Add a check to ensure minion has skills before accessing them.
                if (minion.skills && minion.skills.length > 0) {
                    const minionSkill = skillDefinitions[minion.skills[0].name];
                    if (minionSkill) {
                        const damageDealt = calculateDamage(minion, targetEnemy, minionSkill);
                        targetEnemy.hp -= damageDealt;
                        await displayMessage(`${minion.name} attacks ${targetEnemy.name} for ${damageDealt} damage! ${targetEnemy.name} HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`);
                        if (targetEnemy.hp <= 0) {
                            await displayMessage(`${targetEnemy.name} has been defeated!`);
                            // Necromancer Soul Energy gain on kill
                            if (playerProgression.baseClass === 'necromancer') {
                                // For simplicity, +1 SE on any kill by player or minion
                                playerStats.resource.current = Math.min(playerStats.resource.max, playerStats.resource.current + 1);
                                await displayMessage(`You gained 1 Soul Energy from ${targetEnemy.name}'s demise! Current SE: ${playerStats.resource.current}/${playerStats.resource.max}`);
                            }
                            corpsesOnBattlefield++; // Increment corpse counter
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
         * @param {object} attacker - The attacking combatant (player or enemy).
         * @param {object} defender - The defending combatant (player or enemy).
         * @param {object} skill - The skill definition used for the attack.
         * @returns {number} The calculated damage dealt.
         */
        function calculateDamage(attacker, defender, skill) {
            let baseDamage = getRandomInt(skill.base_damage[0], skill.base_damage[1]);
            let isCrit = Math.random() < (attacker.critChance || 0);
            let finalDamage = 0;

            if (isCrit) {
                baseDamage = Math.floor(baseDamage * (attacker.critMultiplier || 1.5));
                // displayMessage(`Critical Hit!`, true); // Removed instant display, will be part of combat log
            }

            // Apply defense (simple reduction for now)
            finalDamage = Math.max(0, baseDamage - (defender.def || 0)); // Damage can't be negative


            return finalDamage;
        }

        /**
         * Applies the effects of a skill.
         * @param {object} caster - The combatant using the skill.
         * @param {object | Array<object>} targets - The target(s) of the skill.
         * @param {object} skillInfo - The skill definition.
         * @returns {Promise<boolean>} True if the skill effect was successfully applied, false otherwise.
         */
        async function applySkillEffect(caster, targets, skillInfo) {
            // Ensure targets is an array for consistent processing
            const actualTargets = Array.isArray(targets) ? targets : [targets];

            // Handle specific safety valve skills
            if (skillInfo.name === 'Channel the Grave') {
                if (caster.statusEffects.some(s => s.name === 'Channel Cooldown' && s.duration > 0)) {
                    await displayMessage("Channel the Grave is on cooldown!", true);
                    return false; // Skill failed due to cooldown
                }
                const effect = skillInfo.effects.find(e => e.type === 'take_true_damage');
                if (effect) {
                    caster.hp -= effect.value;
                    await displayMessage(`${caster.name} channels the grave, taking ${effect.value} true damage! Current HP: ${caster.hp}/${caster.maxHp}`);
                }
                const gainEffect = skillInfo.effects.find(e => e.type === 'gain_resource');
                // FIX: 4. Check if caster has a resource object before modifying it.
                if (gainEffect && caster.resource) {
                    caster.resource.current = Math.min(caster.resource.max, caster.resource.current + gainEffect.value);
                    await displayMessage(`${caster.name} gains ${gainEffect.value} ${caster.resource.type}! Current: ${caster.resource.current}/${caster.resource.max}`);
                }
                // Apply cooldown
                const cooldownEffect = skillInfo.effects.find(e => e.type === 'apply_status' && e.status === 'Channel Cooldown');
                if (cooldownEffect) {
                    caster.statusEffects.push({ name: cooldownEffect.status, duration: cooldownEffect.duration });
                }
                playerDealtDamageThisTurn = true; // Channeling counts as dealing damage for Necro regen
                return true; // Skill successfully used
            }
            // TODO: Implement other safety valve skills (Overchannel, Second Wind, War Cry)

            // Handle damage
            if (skillInfo.base_damage) {
                for (const target of actualTargets) {
                    if (target.hp <= 0) continue; // Skip dead targets
                    let damageDealt = calculateDamage(caster, target, skillInfo);

                    // Handle Grave Bolt bonus damage per corpse
                    if (skillInfo.effects && skillInfo.effects.some(e => e.type === 'bonus_damage_per_corpse')) {
                        const bonusEffect = skillInfo.effects.find(e => e.type === 'bonus_damage_per_corpse');
                        const bonusDmg = corpsesOnBattlefield * bonusEffect.value;
                        damageDealt += bonusDmg;
                        await displayMessage(`(${skillInfo.name} gains ${bonusDmg} bonus damage from ${corpsesOnBattlefield} corpses!)`);
                    }

                    target.hp -= damageDealt;
                    await displayMessage(`${caster.name} uses ${skillInfo.name} on ${target.name} for ${damageDealt} damage! ${target.name} HP: ${target.hp}/${target.maxHp}`);
                    if (target.hp <= 0) {
                        await displayMessage(`${target.name} has been defeated!`);
                        if (!target.isPlayer && !target.isMinion) { // Only count enemy deaths as corpses
                            corpsesOnBattlefield++;
                            await displayMessage(`A corpse is left on the battlefield. Total corpses: ${corpsesOnBattlefield}`);
                            // Necromancer Soul Energy gain on kill (if player is caster)
                            if (caster.isPlayer && playerProgression.baseClass === 'necromancer') {
                                playerStats.resource.current = Math.min(playerStats.resource.max, playerStats.resource.current + 2); // +2 for killing blow
                                await displayMessage(`You gained 2 Soul Energy from the killing blow! Current SE: ${playerStats.resource.current}/${playerStats.resource.max}`);
                            }
                        }
                    }

                    // Handle heal_from_damage (e.g., Soul Leech)
                    if (skillInfo.effects && skillInfo.effects.some(e => e.type === 'heal_from_damage')) {
                        const healEffect = skillInfo.effects.find(e => e.type === 'heal_from_damage');
                        const healAmount = Math.floor(damageDealt * healEffect.ratio);
                        caster.hp = Math.min(caster.maxHp, caster.hp + healAmount);
                        await displayMessage(`${caster.name} leeches ${healAmount} HP! Current HP: ${caster.hp}/${caster.maxHp}`);
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
                                newMinion.id = `minion_${playerMinions.length}`;
                                newMinion.isPlayer = false; // Minions are not the player
                                newMinion.isMinion = true; // Flag as minion
                                newMinion.statusEffects = [];
                                playerMinions.push(newMinion);
                                turnOrder.push(newMinion); // Add to turn order
                                turnOrder.sort((a, b) => (b.agility || b.spd) - (a.agility || a.spd));
                                await displayMessage(`${caster.name} summons a ${newMinion.name}!`);
                            }
                            break;
                        case 'damage_reduction':
                            caster.statusEffects.push({ name: 'Guard', type: 'damage_reduction', value: effect.value, duration: effect.duration });
                            await displayMessage(`${caster.name} braces for impact, reducing incoming damage!`);
                            break;
                        case 'gain_resource':
                            // FIX: 4. Check for resource property.
                             if (caster.resource) {
                                caster.resource.current = Math.min(caster.resource.max, caster.resource.current + (effect.value || 0));
                            }
                            break;
                        case 'take_true_damage':
                            // Handled by safety valve skills
                            break;
                        case 'apply_status':
                            // General status application (e.g., cooldowns, debuffs)
                            // This is a placeholder; actual status effect management needs to be built.
                            await displayMessage(`${caster.name} applies status: ${effect.status} (Duration: ${effect.duration})`);
                            break;
                        default:
                            await displayMessage(`(Unhandled effect type: ${effect.type} for skill ${skillInfo.name})`);
                            break;
                    }
                }
            }
            playerDealtDamageThisTurn = true; // Mark that player dealt damage this turn
            return true; // Skill successfully used
        }


        /**
         * Checks if the battle has ended (all enemies defeated or player defeated).
         * @returns {Promise<boolean>} A promise that resolves to true if battle ended, false otherwise.
         */
        async function checkBattleEnd() { // Made async
            const livingEnemies = currentEnemies.filter(enemy => enemy.hp > 0);
            
            // FIX: 5, 11. The single source of truth for player's HP is playerStats.
            const isPlayerAlive = playerStats.currentHP > 0;

            if (livingEnemies.length === 0) {
                await displayMessage("\n--- VICTORY! ---", true);
                inCombat = false;
                await displayMessage("You defeated all enemies!");
                await addExperience(50); // Example XP reward
                await displayRoomDescription();
                updatePlayerHud(); // Update HUD after combat ends
                return true;
            }

            if (!isPlayerAlive) { // Player is defeated
                await displayMessage("\n--- DEFEAT! ---", true);
                inCombat = false;
                gameActive = false; // Game over
                await displayMessage("You have been defeated! Game Over.");
                updatePlayerHud(); // Update HUD after combat ends
                return true;
            }
            return false;
        }

        /**
         * Applies end-of-round effects like resource regeneration and DoTs.
         */
        async function endOfRoundEffects() { // Made async
            await displayMessage("\n--- End of Round Effects ---");
            // Player resource regeneration (for classes with regen)
            if (playerStats.resource.regen > 0) {
                playerStats.resource.current = Math.min(playerStats.resource.max, playerStats.resource.current + playerStats.resource.regen);
                await displayMessage(`You regenerated ${playerStats.resource.regen} ${playerStats.resource.type}. Current: ${playerStats.resource.current}/${playerStats.resource.max}`);
            }
            // Necromancer specific Soul Energy gain if dealt damage this turn
            if (playerProgression.baseClass === 'necromancer' && playerDealtDamageThisTurn) {
                playerStats.resource.current = Math.min(playerStats.resource.max, playerStats.resource.current + 1);
                await displayMessage(`You gained 1 Soul Energy from dealing damage this turn! Current SE: ${playerStats.resource.current}/${playerStats.resource.max}`);
            }
            playerDealtDamageThisTurn = false; // Reset for next round

            // Process status effects for all combatants
            for (const combatant of turnOrder) {
                if (combatant.hp <= 0) continue; // Skip dead combatants

                // Filter out expired effects and apply tick effects
                combatant.statusEffects = combatant.statusEffects.filter(effect => {
                    if (effect.duration !== 'permanent') {
                        effect.duration--;
                    }
                    // TODO: Apply DoT damage here if effect.type is 'dot'
                    return effect.duration === 'permanent' || effect.duration > 0;
                });
            }
            updatePlayerHud(); // Update HUD after end of round effects
        }


        /**
         * Adds experience points to the player and checks for level up.
         * For now, this is a manual command, but eventually it will be from combat/quests.
         * @param {number} amount - The amount of experience to add.
         */
        async function addExperience(amount) { // Made async
            playerStats.experience += amount;
            await displayMessage(`You gained ${amount} experience points!`);
            await checkLevelUp();
        }

        /**
         * Checks if the player has enough experience to level up and handles it.
         */
        async function checkLevelUp() { // Made async
            while (playerStats.experience >= playerStats.expToNextLevel) {
                playerStats.experience -= playerStats.expToNextLevel;
                playerStats.level++;
                playerStats.expToNextLevel = Math.floor(playerStats.expToNextLevel * 1.5);

                await displayMessage(`Congratulations! You have reached Level ${playerStats.level}!`, true);
                // Apply stat bonuses (simple example: +1 str, int, agi per level)
                playerStats.strength += 1;
                playerStats.intelligence += 1;
                playerStats.agility += 1;
                playerStats.maxHP += 10;
                playerStats.currentHP = playerStats.maxHP;
                playerStats.def += 1; // Also increase defense
                playerStats.critChance = Math.min(0.5, playerStats.critChance + 0.01); // Cap crit chance

                // Increase max resource on level up
                playerStats.resource.max += 2;
                playerStats.resource.current = playerStats.resource.max; // Refill to new max
                await displayMessage(`Your ${playerStats.resource.type} increases by +2 (now ${playerStats.resource.current}/${playerStats.resource.max}).`, true);


                await handleEvolution();
                updatePlayerHud(); // Update HUD after level up/evolution
            }
        }

        /**
         * Handles class evolution based on level and current branch.
         * This function will also prompt for branch selection at Level 3.
         */
        async function handleEvolution() { // Made async
            // If player is The Hollow King, standard evolution stops
            if (playerStats.isHollowKing) {
                await displayMessage("Your form is beyond conventional evolution. The Hollow King simply... is.", true);
                return;
            }

            const currentBaseClass = evolutionPaths[playerProgression.baseClass];

            if (!currentBaseClass) {
                console.warn("No evolution path found for base class:", playerProgression.baseClass);
                return;
            }

            // Handle Branch Selection at Level 3
            if (playerStats.level === 3 && !playerProgression.currentBranch) {
                await displayMessage("You feel a surge of new power! It's time to specialize.", true);
                await displayMessage("Choose your path: ");
                const branches = Object.keys(currentBaseClass.branches);
                for (const branch of branches) {
                    await displayMessage(`- ${branch.charAt(0).toUpperCase() + branch.slice(1).replace(/_/g, ' ')}: ${currentBaseClass.branches[branch].theme}`);
                }
                await displayMessage(`Type the name of the branch you wish to pursue (e.g., '${Object.keys(currentBaseClass.branches)[0].replace(/_/g, ' ')}').`, true); // Dynamic example
                awaitingBranchSelection = true;
                return;
            }

            // Handle subsequent stage evolutions
            if (playerProgression.currentBranch) {
                const currentBranchPath = currentBaseClass.branches[playerProgression.currentBranch].stages;
                const nextStageIndex = playerProgression.currentEvolutionStageIndex + 1;

                if (nextStageIndex < currentBranchPath.length) {
                    const nextStage = currentBranchPath[nextStageIndex];

                    // Check if level requirement is met
                    if (playerStats.level >= nextStage.level) {
                        // Check for special unlock triggers (not implemented yet, but ready for it)
                        if (nextStage.unlockTrigger) {
                            await displayMessage(`You sense a powerful shift, but you need to achieve the '${nextStage.unlockTrigger}' to fully unlock your next evolution.`);
                            return;
                        }

                        // Evolve!
                        playerProgression.currentEvolutionStageIndex = nextStageIndex;
                        playerProgression.currentEvolutionName = nextStage.name;

                        // Display lore blurb first
                        await displayMessage(`\n--- Your destiny unfolds! You become a ${nextStage.name}! ---`, true);
                        if (nextStage.lore) {
                            await displayMessage(`"${nextStage.lore}"`);
                        }
                        if (nextStage.loreStance) {
                            await displayMessage(`Stance: ${nextStage.loreStance}`);
                        }
                        if (nextStage.loreEffect) {
                            await displayMessage(nextStage.loreEffect);
                        }
                        await displayMessage("---------------------------------------------", true);

                        // Apply new skill and trait (displayed after lore)
                        if (nextStage.skill) {
                            // Only add skill if not already present (prevents duplicates from temporary re-initialization etc.)
                            if (!playerStats.activeSkills.includes(nextStage.skill)) {
                                playerStats.activeSkills.push(nextStage.skill);
                            }
                            await displayMessage(`You learned a new skill: ${nextStage.skill}! (${skillDefinitions[nextStage.skill]?.description || 'No description available'})`, true);
                        }
                        if (nextStage.trait) {
                            playerStats.activeTraits.push({ name: nextStage.trait, effect: nextStage.traitEffect });
                            await displayMessage(`You gained a new trait: ${nextStage.trait}! (${nextStage.traitEffect})`, true);
                        }
                        if (nextStage.upgrade) { // Display upgrade info
                            await displayMessage(`Upgrade: ${nextStage.upgrade}`, true);
                        }

                        // Update resource type if it changes based on resourceEvolution array
                        const resourceChange = currentBaseClass.branches[playerProgression.currentBranch].resourceEvolution?.find(res => res.level === nextStage.level && res.stage === nextStage.name);
                        if (resourceChange) {
                            playerStats.resource.type = resourceChange.type;
                            await displayMessage(`Your resource has transformed into: ${playerStats.resource.type}!`);
                        }

                        // Check for secret evolution trigger (e.g., Eternal Lich for Hollow King)
                        if (nextStage.secretEvolutionTrigger && playerProgression.baseClass === 'necromancer' && playerProgression.currentBranch === 'soulbinder' && nextStage.name === 'Eternal Lich' /* && other conditions like Throne of Bones event active && playerStats.controlledSouls >= 3 */) {
                            await displayMessage("You feel an unholy transformation... the world shifts around you. The whispers grow louder...", true);
                            await displayMessage(legendaryAndSecretClasses.the_hollow_king.uponUnlock, true);
                        }
                        updatePlayerHud(); // Update HUD after evolution
                    }
                }
            }
        }

        /**
         * Generates formatted strings for the class evolution tree and lore views.
         * This includes textual indicators for Ascended and Event/Boss unlocks.
         * @returns {object} An object containing 'tree' and 'lore' formatted strings.
         */
        function getClassEvolutionFormattedViews() {
            // If player is Hollow King, display only its unique info
            if (playerStats.isHollowKing) {
                const hk = legendaryAndSecretClasses.the_hollow_king;
                let treeView = `\n--- Your Ascended Form: ${hk.name} ---\n`;
                treeView += `  Beyond the conventional tree. You are absence.\n`;
                let loreView = `\n--- The Hollow King Lore ---\n`;
                loreView += `<strong>${hk.name}</strong>:\n`;
                loreView += `  "${hk.uponUnlock}"\n`; // Use uponUnlock as the main lore
                loreView += `\nIdentity:\n  ${hk.identity}\n`;
                loreView += `\nLegacy:\n  ${hk.legacy}\n`;
                loreView += `\nCore Resource: ${hk.coreResource.type} (gain ${hk.coreResource.gain}, max ${hk.coreResource.max})\n`;
                loreView += `\nMechanic: ${hk.mechanic}\n`; // Hollow King mechanic
                loreView += `\nPassives:\n`;
                hk.passives.forEach(p => loreView += `  - ${p.name}: ${p.effect}\n`);
                loreView += `\nSkills:\n`;
                hk.skills.filter(s => s !== 'Hollow Crown').forEach(s => loreView += `  - ${s}: ${skillDefinitions[s]?.description || 'Description missing!'}\n`);
                loreView += `\nOverdrive: ${hk.overdrive.name} - ${hk.overdrive.description}\n`;
                loreView += `\nPlaystyle:\n`;
                hk.playstyleSummary.forEach(s => loreView += `  - ${s}\n`);
                if (hk.coreLoop && hk.coreLoop.length > 0) {
                    loreView += `\nCore Loop:\n`;
                    hk.coreLoop.forEach(loop => loreView += `  - ${loop}\n`);
                }
                return { tree: treeView, lore: loreView };
            }


            const baseClass = playerProgression.baseClass;
            if (!baseClass) {
                return { tree: "No class selected yet.", lore: "" };
            }

            const evolutionData = evolutionPaths[baseClass];
            let treeView = `\n--- Evolution Tree for ${baseClass.charAt(0).toUpperCase() + baseClass.slice(1)} ---\n`;
            let loreView = `\n--- Class Lore for ${baseClass.charAt(0).toUpperCase() + baseClass.slice(1)} ---\n`;

            // Base Class Entry for Lore View
            loreView += `\n**${baseClass.charAt(0).toUpperCase() + baseClass.slice(1)} (Lv1)**:\n`; // Using Markdown bold
            if (basePlayerClasses[baseClass].lore) {
                loreView += `  "${basePlayerClasses[baseClass].lore.base}"\n`;
                loreView += `  Role: ${basePlayerClasses[baseClass].lore.role}\n`;
                loreView += `  Identity: ${basePlayerClasses[baseClass].lore.identity}\n`;
            } else {
                loreView += `  Description: ${basePlayerClasses[baseClass].description}\n`;
            }
            loreView += `  Core Resource: ${basePlayerClasses[baseClass].startingResource.type} (`;
            if (baseClass === 'warrior') loreView += 'gain +1 per hit, lose all if you skip a turn';
            else if (baseClass === 'necromancer') loreView += 'gained from kills (+1, +2 if you land the killing blow)';
            else if (baseClass === 'rogue') loreView += `starts at ${basePlayerClasses[baseClass].startingResource.initial}, regenerates ${basePlayerClasses[baseClass].startingResource.regen} per turn`;
            else if (baseClass === 'mage') loreView += `starts at ${basePlayerClasses[baseClass].startingResource.initial}, regenerates ${basePlayerClasses[baseClass].startingResource.regen} per turn`;
            else loreView += '...details';
            loreView += `), max ${basePlayerClasses[baseClass].startingResource.max}\n`;
            loreView += `  Starting Skills: ${basePlayerClasses[baseClass].startingSkills.map(s => skillDefinitions[s]?.description ? `${s} (${skillDefinitions[s].description})` : s).join(', ')}\n`;
            loreView += `  Passive: ${basePlayerClasses[baseClass].startingTraits.map(t => `${t.name} — ${t.effect}`).join(', ')}\n`;


            // Sort branches alphabetically for consistent display
            const sortedBranchKeys = Object.keys(evolutionData.branches).sort();

            sortedBranchKeys.forEach(branchKey => {
                const branch = evolutionData.branches[branchKey];
                treeView += `\nBranch: ${branch.name} (${branch.theme})\n`;
                loreView += `\n--- Branch: ${branch.name} ---\n`;
                loreView += `  Theme: ${branch.theme}\n`;
                if (branch.mechanic) { // Display branch-specific mechanic
                    loreView += `  Mechanic: ${branch.mechanic}\n`;
                }
                if (branch.resourceEvolution && branch.resourceEvolution.length > 0) {
                    loreView += `  Branch Resource: ${branch.resourceEvolution[0].type} — `; // First resource type in the evolution
                    if (branch.name === 'Vanguard') {
                        loreView += 'gain by guarding or intercepting hits for allies.\n';
                        loreView += '  Dark Knight replaces these with Sin Marks (double dmg but self-harm).\n';
                    } else if (branch.name === 'Berserker') {
                        loreView += '+1 when hitting or taking dmg, max 10. At max Fury, next skill is doubled in dmg.\n';
                    } else if (branch.name === 'Warden') {
                        loreView += 'apply [Pin], [Expose], or [Weaken] marks to enemies. Max 3 marks per enemy.\n';
                    } else if (branch.name === 'Plaguecaller') {
                        loreView += 'Infection Stacks — DoTs can stack 3x on the same enemy.\n';
                    } else if (branch.name === 'Soulbinder') {
                        loreView += 'Soul Chains — Linked enemies share damage.\n';
                    } else if (branch.name === 'Assassin') {
                        loreView += 'gain 1 when you dodge or kill; spend for guaranteed crits.\n';
                    } else if (branch.name === 'Duelist') {
                        loreView += 'basic attacks generate points, finishers consume them.\n';
                    } else if (branch.name === 'Saboteur') {
                        loreView += 'max 3 active at once.\n';
                    } else if (branch.name === 'Elementalist') {
                        loreView += 'casting same element twice in a row gives +50% dmg.\n';
                    } else if (branch.name === 'Illusionist') {
                        loreView += 'gain from dodging or avoiding hits; spend to reflect or steal spells.\n';
                    } else if (branch.name === 'Chronomancer') {
                        loreView += 'gain 1 per turn, store up to 3; spend to act twice.\n';
                    }
                    else {
                        loreView += '...details.\n'; // Fallback
                    }
                }


                branch.stages.forEach((stage, index) => {
                    const isCurrent = playerProgression.currentBranch === branchKey && playerProgression.currentEvolutionStageIndex === index;
                    let statusIndicator = isCurrent ? ' (CURRENT)' : '';

                    let nameDisplayForTree = stage.name;
                    let loreStageTitle = `Level ${stage.level} - ${stage.name}`;

                    // Apply textual "color coding"
                    if (stage.ascended) {
                        nameDisplayForTree = `**<span style="color: #f6ad55;">${stage.name} (Ascended)</span>**`; // Gold for Ascended
                        loreStageTitle = `**<span style="color: #f6ad55;">Level ${stage.level} - ${stage.name} (Ascended Form)</span>**`;
                    } else if (stage.unlockTrigger) {
                        nameDisplayForTree = `**<span style="color: #fc8181;">${stage.name} (Event/Boss Unlock)</span>**`; // Red for Event/Boss
                        loreStageTitle = `**<span style="color: #fc8181;">Level ${stage.level} - ${stage.name} (Requires: ${stage.unlockTrigger})</span>**`;
                    } else {
                        nameDisplayForTree = `**<span style="color: #90cdf4;">${stage.name}</span>**`; // Blue for Normal evolution
                        loreStageTitle = `**<span style="color: #90cdf4;">Level ${stage.level} - ${stage.name}</span>**`;
                    }


                    treeView += `  L${stage.level}: ${nameDisplayForTree}${statusIndicator}\n`;

                    loreView += `\n${loreStageTitle}:\n`;
                    if (stage.lore) {
                        loreView += `  "${stage.lore}"\n`;
                    }
                    if (stage.loreStance) {
                        loreView += `  Stance: ${stage.loreStance}\n`;
                    }
                    if (stage.loreEffect) {
                        loreView += `  ${stage.loreEffect}\n`;
                    }

                    loreView += `  Passive: ${stage.trait} — ${stage.traitEffect}\n`;
                    if (stage.skill) {
                        const skillInfo = skillDefinitions[stage.skill];
                        loreView += `  Skill: ${stage.skill} — ${skillInfo?.description || 'Description missing.'}\n`;
                    }
                    if (stage.upgrade) { // Display upgrade info in lore view
                        loreView += `  Upgrade: ${stage.upgrade}\n`;
                    }
                    if (stage.combatFlavor) {
                        loreView += `  Combat Log Flavor: "${stage.combatFlavor}"\n`;
                    }
                    if (stage.prestigeQuest) {
                        loreView += `  Prestige Quest: "${stage.prestigeQuest}" — win duel → gain Mounted Charge skill.\n`;
                    }
                    // Display synergy for this stage
                    if (stage.synergy && stage.synergy.length > 0) {
                        loreView += `\n  Synergy:\n`;
                        stage.synergy.forEach(s => loreView += `    - ${s}\n`);
                    }
                    // Special display for Eternal Lich's connection to Hollow King
                    if (stage.secretEvolutionTrigger && baseClass === 'necromancer' && branchKey === 'soulbinder' && stage.name === 'Eternal Lich') {
                        loreView += `\n  This form is a prerequisite for the ultimate hidden class: **The Hollow King**.\n`; // Markdown bold
                        loreView += `  Unlock Conditions: ${legendaryAndSecretClasses.the_hollow_king.unlockConditions}\n`;
                    }
                });
                if (branch.coreLoop && branch.coreLoop.length > 0) { // Display core loop at the end of branch stages
                    loreView += `\n  Core Loop:\n`;
                    branch.coreLoop.forEach(loop => loreView += `    - ${loop}\n`);
                }
            });

            // Add hint about Legendary Unlock for Warrior (if base class is warrior)
            if (baseClass === 'warrior') {
                loreView += "\n\n" + "Some paths go darker still... a Legendary truth awaits discovery." + "\n";
            }
            // Add hint about Deathlord Eternal for Necromancer (if base class is necromancer)
            if (baseClass === 'necromancer') {
                const de = legendaryAndSecretClasses.deathlord_eternal;
                loreView += `\n--- Legendary Class: ${de.name} ---\n`;
                loreView += `  "${de.lore}"\n`;
                loreView += `  ${de.loreEffect}\n`;
                loreView += `  Unlock Path: ${de.unlockPath}\n`;
            }
            // Add hint about Reality Breaker for Mage (if base class is mage)
            if (baseClass === 'mage') {
                const rb = legendaryAndSecretClasses.reality_breaker;
                loreView += `\n--- Legendary Class: ${rb.name} ---\n`;
                loreView += `  "${rb.lore}"\n`;
                loreView += `  ${rb.loreEffect}\n`;
                loreView += `  Unlock Path: ${rb.unlockPath}\n`;
            }


            // Append Ascended Overdrives at the very end of the lore view for easy reference
            if (playerProgression.currentEvolutionName && playerProgression.currentEvolutionStageIndex !== -1 &&
                evolutionPaths[baseClass].branches[playerProgression.currentBranch]?.stages[playerProgression.currentEvolutionStageIndex]?.ascended && !playerStats.isHollowKing) { // Don't show if Hollow King
                const currentAscendedSkillName = evolutionPaths[baseClass].branches[playerProgression.currentBranch].stages[playerProgression.currentEvolutionStageIndex].skill;
                const skillInfo = skillDefinitions[currentAscendedSkillName];

                if (currentAscendedSkillName && skillInfo) {
                    loreView += "\n--- Ascended Overdrive (Current Class) ---\n";
                    loreView += `\n**${currentAscendedSkillName}**: ${skillInfo.description} (1/fight)\n`; // Markdown bold
                } else {
                    loreView += "\n--- Ascended Overdrive (Current Class) ---\n";
                    loreView += "No specific Ascended Overdrive found for current class (or it's the Hollow King).\n"; // Fallback for ascended with no skill
                }
            }

            // Cross-Branch Synergy Notes (displayed only if Necromancer is the base class)
            if (baseClass === 'necromancer' && crossBranchSynergies.length > 0) {
                loreView += `\n---\n`;
                loreView += `\n--- Necromancer Cross-Branch Synergy Notes ---\n`;
                crossBranchSynergies.forEach(note => loreView += `  - ${note}\n`);
            }


            return { tree: treeView, lore: loreView };
        }

        /**
         * Displays the class evolution tree and lore.
         */
        async function displayClassLore() { // New function for class lore
            gameOutput.innerHTML = ''; // Clear log for new action
            if (!playerProgression.baseClass) {
                await displayMessage("You need to choose a class first to view its lore!", true);
                return;
            }
            const evolutionViews = getClassEvolutionFormattedViews();
            await displayMessage(evolutionViews.tree, true); // Display tree view
            await displayMessage(evolutionViews.lore, true); // Display lore view
        }

        /**
         * Updates the Player HUD with current player stats, resources, and combat info.
         */
        function updatePlayerHud() {
            if (!playerHudElement) return; // Exit if HUD element not found

            let hudContent = '';

            // Identity
            hudContent += `<div class="hud-section">`;
            hudContent += `<strong>${playerStats.name || 'Adventurer'}</strong><br>`; // Use playerStats.name
            hudContent += `Level: ${playerStats.level}`;
            if (playerProgression.baseClass) {
                hudContent += `<br>Class: ${playerProgression.baseClass.charAt(0).toUpperCase() + playerProgression.baseClass.slice(1)}`;
            }
            if (playerProgression.currentBranch) {
                hudContent += `<br>Branch: ${playerProgression.currentBranch.charAt(0).toUpperCase() + playerProgression.currentBranch.slice(1).replace(/_/g, ' ') || 'Unspecialized'}`;
            }
            hudContent += `</div>`;

            // Vitals (HP)
            const hpPercent = (playerStats.currentHP / playerStats.maxHP) * 100;
            // FIX: 1. Remove the unnecessary 'green' class. The default style is green.
            let hpBarColorClass = '';
            if (hpPercent <= 30) {
                hpBarColorClass = 'critical';
            } else if (hpPercent <= 60) {
                hpBarColorClass = 'low';
            }

            hudContent += `<div class="hud-section">`;
            hudContent += `HP: ${playerStats.currentHP}/${playerStats.maxHP}`;
            hudContent += `<div class="hud-hp-bar-container"><div class="hud-hp-bar ${hpBarColorClass}" style="width: ${hpPercent}%;"></div></div>`;
            hudContent += `DEF: ${playerStats.def}`;
            hudContent += `</div>`;

            // Primary Stats
            hudContent += `<div class="hud-section">`;
            hudContent += `STR: ${playerStats.strength}<br>`;
            hudContent += `INT: ${playerStats.intelligence}<br>`;
            hudContent += `AGI: ${playerStats.agility}<br>`;
            hudContent += `Base Dmg: ${playerStats.baseDamageMin}-${playerStats.baseDamageMax}<br>`;
            hudContent += `Crit Chance: ${(playerStats.critChance * 100).toFixed(0)}%<br>`;
            hudContent += `Crit Multi: x${playerStats.critMultiplier.toFixed(2)}`;
            hudContent += `</div>`;

            // Primary Resource
            const resourcePercent = (playerStats.resource.current / playerStats.resource.max) * 100;
            hudContent += `<div class="hud-section">`;
            hudContent += `${playerStats.resource.type}: ${playerStats.resource.current}/${playerStats.resource.max}`;
            hudContent += `<div class="hud-resource-bar-container"><div class="hud-resource-bar" style="width: ${resourcePercent}%;"></div></div>`;
            // Add resource hint
            if (playerProgression.baseClass === 'necromancer') {
                hudContent += `<span class="text-xs text-gray-400">Gain: kills (+1, +2 last-hit), +1 on turns you deal damage</span>`;
            } else if (playerProgression.baseClass === 'warrior') {
                hudContent += `<span class="text-xs text-gray-400">Gain: +1 per hit, lose all if skip turn</span>`;
            } else if (playerProgression.baseClass === 'rogue') {
                hudContent += `<span class="text-xs text-gray-400">Regen: +${playerStats.resource.regen}/turn</span>`;
            } else if (playerProgression.baseClass === 'mage') {
                hudContent += `<span class="text-xs text-gray-400">Regen: +${playerStats.resource.regen}/turn</span>`;
            }
            hudContent += `</div>`;

            // Minions
            if (playerMinions.length > 0) {
                hudContent += `<div class="hud-section">`;
                hudContent += `<strong>Minions (${playerMinions.filter(m => m.hp > 0).length})</strong><br>`;
                playerMinions.forEach(minion => {
                    if (minion.hp > 0) {
                        hudContent += `<span class="hud-minion-list">• ${minion.name} ${minion.hp}/${minion.maxHp} HP</span><br>`;
                    }
                });
                hudContent += `</div>`;
            }

            // Buffs & Debuffs (Placeholder)
            if (playerStats.statusEffects.length > 0) {
                hudContent += `<div class="hud-section">`;
                hudContent += `<strong>Effects</strong><br>`;
                playerStats.statusEffects.forEach(effect => {
                    hudContent += `<span class="text-xs text-blue-300">${effect.name} (${effect.duration}t)</span><br>`;
                });
                hudContent += `</div>`;
            }

            playerHudElement.innerHTML = hudContent;
        }


        /**
         * Processes the player's command.
         * @param {string} commandText - The command entered by the player.
         */
        async function processCommand(commandText) { // Made async
            const cleanedCommand = commandText.toLowerCase().trim();
            gameInput.value = '';

            if (isTyping) { // Prevent input while typing
                return;
            }

            // If in combat, route to combat-specific command processing
            if (inCombat) {
                await processCombatCommand(cleanedCommand); // Await combat command
                return;
            }

            if (!gameActive && cleanedCommand !== 'start') {
                await displayMessage("The game is over. Type 'start' to play again.", true);
                return;
            }

            gameOutput.innerHTML = ''; // Clear log for new action

            // --- Handle Class Selection Phase ---
            if (awaitingClassSelection) {
                if (basePlayerClasses[cleanedCommand]) {
                    initializePlayer(cleanedCommand);
                    awaitingClassSelection = false;
                    await displayMessage(`You have chosen to be a ${playerProgression.baseClass.charAt(0).toUpperCase() + playerProgression.baseClass.slice(1)}!`, true);
                    await displayMessage(`Your journey begins with: ${playerStats.inventory.join(', ')}.`);
                    await displayRoomDescription();
                } else {
                    await displayMessage("That is not a valid class. Please choose from: " + Object.keys(basePlayerClasses).join(', ') + ".");
                }
                return;
            }

            // --- Handle Branch Selection Phase (Level 3) ---
            if (awaitingBranchSelection) {
                const availableBranches = Object.keys(evolutionPaths[playerProgression.baseClass].branches);
                if (availableBranches.includes(cleanedCommand)) {
                    playerProgression.currentBranch = cleanedCommand;
                    // Find the index of the stage at the current level (3)
                    playerProgression.currentEvolutionStageIndex = evolutionPaths[playerProgression.baseClass].branches[playerProgression.currentBranch].stages.findIndex(s => s.level === playerStats.level);
                    awaitingBranchSelection = false;
                    await displayMessage(`You have chosen the path of the ${cleanedCommand.charAt(0).toUpperCase() + cleanedCommand.slice(1).replace(/_/g, ' ')}!`, true);
                    await handleEvolution(); // Trigger evolution for Level 3 branch
                } else {
                    await displayMessage("That is not a valid branch. Please choose from: " + availableBranches.join(', ') + ".");
                }
                return;
            }


            // --- Normal Game Command Processing (Exploration Mode) ---
            await displayMessage(`> ${cleanedCommand}`, true); // Echo the command

            const { command: mainCommand, targetNum: targetNum } = normalizeCommandInput(cleanedCommand);
            const argument = cleanedCommand.split(' ').slice(1).join(' '); // Keep original argument for some cases if needed
            const args = cleanedCommand.split(' ');

            switch (mainCommand) {
                case 'go':
                    if (argument) {
                        await movePlayer(argument);
                    } else {
                        await displayMessage("Go where? Try 'go north' or 'go east'.");
                    }
                    break;
                case 'take':
                case 'get':
                    if (argument) {
                        await takeItem(argument);
                    } else {
                        await displayMessage("Take what? Try 'take key' or 'get mushroom'.");
                    }
                    break;
                case 'inventory':
                case 'i':
                    await showInventory();
                    break;
                case 'look':
                    await displayRoomDescription();
                    break;
                case 'help':
                    await displayMessage("Available commands: go [direction], take [item], inventory (i), look, help, quit, add_xp [amount], use [skill], class_lore (cl).");
                    await displayMessage("\n--- CHEATS ---", true);
                    await displayMessage("set_level [number]");
                    await displayMessage("force_evolve [branch_name] [stage_index (0-4)]");
                    await displayMessage("become_hollow_king");
                    break;
                case 'quit':
                    await displayMessage("Thanks for playing! Game Over.", true);
                    gameActive = false;
                    break;
                case 'start':
                    await startGame();
                    break;
                case 'add_xp':
                    const xpAmount = parseInt(argument);
                    if (!isNaN(xpAmount) && xpAmount > 0) {
                        await addExperience(xpAmount);
                    } else {
                        await displayMessage("Usage: add_xp [amount]. Amount must be a positive number.");
                    }
                    break;
                case 'use':
                    // Use handlePlayerSkillAction for skills in exploration mode too
                    const skillName = argument.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    await handlePlayerSkillAction(skillName, targetNum); // Pass targetNum from parsed argument
                    break;
                case 'engage': // New command to start combat
                    const roomEnemies = rooms[currentRoom]?.enemies;
                    if (roomEnemies && roomEnemies.length > 0) {
                        await startCombat(roomEnemies);
                    } else {
                        await displayMessage("There are no enemies to engage here.");
                    }
                    break;
                case 'class_lore': // New command for class lore
                case 'cl':
                    await displayClassLore();
                    break;
                
                // --- CHEAT COMMANDS START HERE ---

                case 'set_level':
                    const level = parseInt(args[1]);
                    if (!isNaN(level) && level > 0) {
                        playerStats.level = level;
                        playerStats.currentHP = playerStats.maxHP; // Heal on level up
                        updatePlayerHud();
                        await displayMessage(`CHEAT: Player level set to ${level}.`, true);
                    } else {
                        await displayMessage("Usage: set_level [number]");
                    }
                    break;

                case 'force_evolve':
                    const branchName = args[1];
                    const stageIndex = parseInt(args[2]);
                    const baseClass = playerProgression.baseClass;

                    if (branchName && !isNaN(stageIndex) && evolutionPaths[baseClass]?.branches[branchName]?.stages[stageIndex]) {
                        const branch = evolutionPaths[baseClass].branches[branchName];
                        const targetStage = branch.stages[stageIndex];
                        
                        playerProgression.currentBranch = branchName;
                        playerProgression.currentEvolutionStageIndex = stageIndex;
                        playerProgression.currentEvolutionName = targetStage.name;
                        playerStats.level = targetStage.level;

                        // Grant all skills and traits from this branch up to the target stage
                        playerStats.activeSkills = [...basePlayerClasses[baseClass].startingSkills]; // Reset to base skills
                        playerStats.activeTraits = [...basePlayerClasses[baseClass].startingTraits];

                        for (let i = 0; i <= stageIndex; i++) {
                            const stage = branch.stages[i];
                            if (stage.skill && !playerStats.activeSkills.includes(stage.skill)) {
                                playerStats.activeSkills.push(stage.skill);
                            }
                            if (stage.trait) {
                                playerStats.activeTraits.push({ name: stage.trait, effect: stage.traitEffect });
                            }
                        }
                        
                        updatePlayerHud();
                        await displayMessage(`CHEAT: Evolved to ${targetStage.name} (Lvl ${targetStage.level}).`, true);
                    } else {
                        await displayMessage("Usage: force_evolve [branch_name] [stage_index (0-4)]");
                        await displayMessage(`Example: 'force_evolve vanguard 2' as a Warrior.`);
                    }
                    break;
                
                case 'become_hollow_king':
                    if (playerProgression.baseClass === 'necromancer') {
                        playerStats.isHollowKing = true;
                        playerProgression.currentEvolutionName = legendaryAndSecretClasses.the_hollow_king.name;
                        playerStats.activeSkills = legendaryAndSecretClasses.the_hollow_king.skills;
                        playerStats.activeTraits = legendaryAndSecretClasses.the_hollow_king.passives;
                        playerStats.resource = { ...legendaryAndSecretClasses.the_hollow_king.coreResource };
                        await displayMessage(`A forbidden transformation! You are now ${legendaryAndSecretClasses.the_hollow_king.name}!`, true);
                        await displayMessage(`"${legendaryAndSecretClasses.the_hollow_king.uponUnlock}"`, true);
                        updatePlayerHud(); // Update HUD after transformation
                    } else {
                        await displayMessage("You must be a Necromancer to become The Hollow King.");
                    }
                    break;

                // --- CHEAT COMMANDS END HERE ---

                default:
                    await displayErrorMessage("I don't understand that command.", mainCommand); // Pass mainCommand for suggestions
            }
        }

        /**
         * Processes commands when the game is in combat mode.
         * @param {string} commandText - The command entered by the player.
         */
        async function processCombatCommand(commandText) {
            const { command: mainCommandRaw, targetNum } = normalizeCommandInput(commandText);

            gameOutput.innerHTML = '';
            await displayMessage(`> ${commandText}`, true);

            if (!turnOrder[currentTurnIndex] || !turnOrder[currentTurnIndex].isPlayer) {
                await displayMessage("It's not your turn yet!");
                return;
            }

            let actionTaken = false;
            // FIX: 3, 10. Centralize skill resolution.
            // First, try to resolve the command as a skill (alias or full name)
            const resolvedSkillName = resolveSkillName(mainCommandRaw);
            
            if (resolvedSkillName) {
                actionTaken = await handlePlayerSkillAction(resolvedSkillName, targetNum);
            } else {
                // If not a direct skill, check for other combat commands
                switch (mainCommandRaw) {
                    case 'attack':
                        const targetEnemy = getTargetEnemy(targetNum);
                        if (!targetEnemy) {
                            await displayErrorMessage(getInvalidTargetMessage(targetNum), 'attack', currentEnemies.filter(e => e.hp > 0));
                            return;
                        }
                        const playerBasicAttackSkillName = basePlayerClasses[playerProgression.baseClass]?.startingSkills[0] || 'Slash';
                        const playerAttackSkillInfo = skillDefinitions[playerBasicAttackSkillName];
                        if (playerAttackSkillInfo) {
                            if (playerProgression.baseClass === 'warrior') {
                                playerStats.resource.current = Math.min(playerStats.resource.max, playerStats.resource.current + 1);
                                await displayMessage(`You gained 1 Momentum! Current: ${playerStats.resource.current}/${playerStats.resource.max}`);
                            }
                            actionTaken = await applySkillEffect(playerStats, targetEnemy, playerAttackSkillInfo);
                        } else {
                            await displayErrorMessage("You don't have a basic attack skill defined!", playerBasicAttackSkillName);
                        }
                        break;
                    
                    case 'use':
                        await displayErrorMessage("Please specify which skill to use, e.g., 'use grave bolt 1' or just 'grave bolt 1'.", "use");
                        return;

                    case 'flee':
                        await displayMessage("You successfully fled from combat!");
                        inCombat = false;
                        await displayRoomDescription();
                        return;

                    case 'class_lore':
                    case 'cl':
                        await displayClassLore();
                        return; // Does not consume a turn

                    default:
                        await displayErrorMessage("Unknown command in combat.", mainCommandRaw);
                        return; // Does not consume a turn
                }
            }
            
            if (actionTaken) {
                if (await checkBattleEnd()) return;
                currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
                if (currentTurnIndex === 0) {
                    await endOfRoundEffects();
                }
                await resolveTurn();
            }
        }
        
        // FIX: 3, 10. New centralized function to resolve skill names from aliases or direct input (case-insensitive).
        function resolveSkillName(input) {
            const lowerInput = input.toLowerCase();

            // Check aliases first
            if (skillAliases[lowerInput]) {
                return skillAliases[lowerInput];
            }

            // Check full skill names (case-insensitive)
            for (const skillName in skillDefinitions) {
                if (skillName.toLowerCase() === lowerInput) {
                    return skillName;
                }
            }

            return null; // Return null if no match found
        }


        /**
         * Helper to handle player's skill actions, including target resolution and resource checks.
         * @param {string} skillName - The normalized skill name.
         * @param {number|null} targetNum - The target number from input, or null.
         * @returns {Promise<boolean>} True if action was successfully taken, false otherwise.
         */
        async function handlePlayerSkillAction(skillName, targetNum) {
            const skillInfo = skillDefinitions[skillName];

            if (!skillInfo || !playerStats.activeSkills.includes(skillName)) {
                await displayErrorMessage(`You don't know the skill '${skillName}'.`, skillName);
                return false;
            }
            
             // Check resource cost
            const cost = skillInfo.cost === 'all' ? playerStats.resource.current : (skillInfo.cost || 0);
            if (playerStats.resource.current < cost) {
                await displayErrorMessage(`Not enough ${playerStats.resource.type} for ${skillName}! Requires ${cost}, you have ${playerStats.resource.current}.`, skillName);
                return false;
            }

            // Determine target(s) based on skill target type
            let targets = [];
            // FIX: 13. Expand targeting logic to be more robust.
            const livingEnemies = currentEnemies.filter(e => e.hp > 0);

            switch (skillInfo.target) {
                case 'enemy_single':
                    if (livingEnemies.length === 0) {
                        await displayErrorMessage(`No enemies to target with ${skillName}.`, skillName);
                        return false;
                    }
                    if (targetNum === null) {
                        if (livingEnemies.length === 1) {
                            targets.push(livingEnemies[0]);
                        } else {
                            await displayErrorMessage(`Choose a target for ${skillName}: use ${skillName.toLowerCase()} [1-${livingEnemies.length}].`, skillName, livingEnemies);
                            return false;
                        }
                    } else {
                        const targetEnemy = getTargetEnemy(targetNum);
                        if (!targetEnemy) {
                            await displayErrorMessage(getInvalidTargetMessage(targetNum), skillName, livingEnemies);
                            return false;
                        }
                        targets.push(targetEnemy);
                    }
                    break;
                case 'self':
                    targets.push(playerStats);
                    break;
                case 'enemy_aoe':
                case 'all_enemies':
                    targets = livingEnemies;
                    if (targets.length === 0) {
                        await displayErrorMessage(`No enemies to target with ${skillName}.`, skillName);
                        return false;
                    }
                    break;
                case 'minions':
                    targets = playerMinions.filter(m => m.hp > 0);
                    if (targets.length === 0) {
                        await displayErrorMessage(`You have no minions to target with ${skillName}.`, skillName);
                        return false;
                    }
                    break;
                default:
                    await displayErrorMessage(`Target type '${skillInfo.target}' for ${skillName} is not yet implemented.`, skillName);
                    return false;
            }


            // Deduct resource
            if (cost > 0) {
                playerStats.resource.current -= cost;
                await displayMessage(`Used ${cost} ${playerStats.resource.type}.`);
            }

            return await applySkillEffect(playerStats, targets, skillInfo);
        }

        /**
         * Helper to get a target enemy by its 1-based index.
         * @param {number} index - The 1-based index of the enemy.
         * @returns {object | null} The enemy object or null if invalid.
         */
        function getTargetEnemy(index) {
            const livingEnemies = currentEnemies.filter(e => e.hp > 0);
            if (index > 0 && index <= livingEnemies.length) {
                return livingEnemies[index - 1];
            }
            // Auto-target if no index is given and there's only one enemy
            if (index === null && livingEnemies.length === 1) {
                return livingEnemies[0];
            }
            return null;
        }

        /**
         * Helper to generate a standardized invalid target message.
         * @param {number} targetNum - The invalid target number.
         * @returns {string} The formatted message.
         */
        function getInvalidTargetMessage(targetNum) {
            const livingEnemies = currentEnemies.filter(e => e.hp > 0);
            let msg = `Invalid target '${targetNum || 'none specified'}'.`;
            if (livingEnemies.length === 0) {
                msg += ` There are no living enemies.`;
            } else {
                msg += ` Valid targets: ${livingEnemies.map((e, i) => `(${i + 1}) ${e.name}`).join(', ')}.`;
            }
            return msg;
        }

        /**
         * Displays a helpful error message with context.
         * @param {string} errorMessage - The specific error.
         * @param {string} originalCommandPart - The part of the command that caused the error (e.g., skill name).
         * @param {Array<object>} [livingEnemies=[]] - Optional: list of living enemies for target context.
         */
        async function displayErrorMessage(errorMessage, originalCommandPart, livingEnemies = []) {
            await displayMessage(`Error: ${errorMessage}`, true);

            // Suggest similar skills if the error was about an unknown skill
            const suggestions = findSimilarSkills(originalCommandPart);
            if (suggestions.length > 0 && (errorMessage.includes("don't understand that command") || errorMessage.includes("don't have the skill"))) {
                await displayMessage(`Did you mean: ${suggestions.join(', ')}?`);
            }

            await displayMessage("\n--- Current Status ---", true);
            await displayMessage(`Check HUD for HP and Resource details.`);
            
            if (inCombat) {
                await displayCombatState();
            } else {
                await displayMessage("Valid commands: go [direction], take [item], inventory (i), look, help, quit, engage, class_lore (cl).");
            }
        }


        // --- Event Listeners ---
        gameInput.addEventListener('keypress', async (event) => { // Made async
            if (event.key === 'Enter') {
                if (!isTyping) { // Only process command if not currently typing
                    await processCommand(event.target.value);
                }
            } else if (event.key === ' ') { 
                // FIX: 8. Only allow space to skip typing if the input is empty.
                if (isTyping && currentTypingPromiseResolve && event.target.value.trim() === '') {
                    skipTyping = true;
                    currentTypingPromiseResolve();
                    event.preventDefault(); // Prevent space from being typed into input
                }
            }
        });

        submitButton.addEventListener('click', async () => { // Made async
            if (!isTyping) { // Only process command if not currently typing
                await processCommand(gameInput.value);
            }
        });

        // --- Initialize the Game ---
        document.addEventListener('DOMContentLoaded', startGame);