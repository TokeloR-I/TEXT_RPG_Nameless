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
            // Tokelo 2026-11-04: the road wolf leads a pack now and is its mini boss (more HP than the rest).
            'hungry_wolf': {
                name: 'Hungry Wolf',
                hp: 70, maxHp: 70, xp: 50, atk: 7, def: 3, spd: 12, tier: 'elite',
                critChance: 0.2, critMultiplier: 1.7,
                skills: [{ name: 'Bite', base_damage: [7, 10] }]
            },
            'pack_wolf': {
                name: 'Pack Wolf',
                hp: 24, maxHp: 24, xp: 15, atk: 5, def: 2, spd: 13,
                critChance: 0.1, critMultiplier: 1.5,
                skills: [{ name: 'Bite', base_damage: [4, 7] }]
            },
            // Fenrir's Heir (CL1, Gullstrand Coast): the coast wolves that the two hunts have turned. Sun-mad ones lie across
            // the bright cave and bite hot; the moonless ones come out of the dark hollow after you. Chapter Two pack wolves.
            'sunscorched_wolf': {
                name: 'Sun-Mad Wolf',
                hp: 40, maxHp: 40, xp: 32, atk: 9, def: 3, spd: 13,
                critChance: 0.12, critMultiplier: 1.6,
                skills: [{ name: 'Scorching Bite', base_damage: [7, 10] }]
            },
            'moonless_wolf': {
                name: 'Moonless Wolf',
                hp: 34, maxHp: 34, xp: 32, atk: 9, def: 2, spd: 14,
                critChance: 0.18, critMultiplier: 1.6,
                skills: [{ name: 'Night Bite', base_damage: [6, 10] }]
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
            // The road to the Warden (Tokelo 2026-11-04: "add more enemy NPCs leading up to the Warden"). CANDIDATE kits,
            // first-pass numbers for Gauge to tune: the Broken Oath's heavy (orchard and Featherwatch Path) and the crows
            // that fed on the cult's leavings (Featherwatch Path). Not the Warden's own birds: those stay on his perches.
            'cult_zealot': {
                name: 'Broken Oath Zealot',
                hp: 38, maxHp: 38, xp: 28, atk: 8, def: 3, spd: 8,
                critChance: 0.1, critMultiplier: 1.6,
                skills: [{ name: 'Oathbreaker Flail', base_damage: [8, 12] }, { name: 'Zealous Charge', base_damage: [6, 9] }]
            },
            'carrion_crow': {
                name: 'Hex-Eyed Crow',
                hp: 12, maxHp: 12, xp: 8, atk: 4, def: 0, spd: 18,
                critChance: 0.15, critMultiplier: 1.5,
                skills: [{ name: 'Raking Peck', base_damage: [3, 5] }]
            },
            'shackled_ghoul_stronger': {
                name: 'Ritual-Scarred Ghoul',
                hp: 40, maxHp: 40, xp: 30, atk: 10, def: 3, spd: 12,
                critChance: 0.15, critMultiplier: 1.6,
                specialFlags: ['undead'],
                skills: [{ name: 'Frenzied Bite', base_damage: [9, 14] }]
            },
            // Chapter One S01 (Shane's pursuers). CANDIDATE kit so the quest is playable: Rook owns the final enemy kit (CH1-06),
            // Tally tunes it. Defensive, predictable town watch; honest guards, not villains.
            'watch_constable': {
                name: 'Watch Constable',
                hp: 28, maxHp: 28, xp: 15, atk: 6, def: 3, spd: 9,
                critChance: 0.05, critMultiplier: 1.5,
                skills: [{ name: 'Truncheon', base_damage: [4, 7] }, { name: 'Shield Shove', base_damage: [2, 4] }]
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
            },
            // The Trial of the Live Coal (Fallen Seraphim, Tokelo 2026-11-04: "a quest with a ridiculously strong boss ... so
            // that going forward is earned"). Heaven's own altar-warden comes for the light Caelith gave you. Built to beat a
            // level 10 character only with the Fallen gifts and a good build (Gauge: docs/design/FALLEN_SERAPHIM.md).
            'heaven_doorwarden': {
                name: 'Aurevain, Warden of the Altar',
                id: 'heaven_doorwarden',
                hp: 3200, maxHp: 3200, xp: 600, atk: 34, def: 10, spd: 12,
                critChance: 0.15, critMultiplier: 1.8,
                specialFlags: ['boss'],
                skills: [
                    { name: 'Spear of the Altar', base_damage: [28, 36] },
                    { name: 'Wingbeat', base_damage: [20, 26] },
                    { name: 'Sentence of Light', base_damage: [16, 22] }
                ]
            },
            // The Binding Echo (Fenrir's Heir unlock, docs/design/FENRIRS_HEIR.md): what is left of Gleipnir's binding at the
            // Wolf's Wake, not Fenrir himself. Sun pressure, then consuming dark. Gauge's first numbers: a level 5-6 character
            // with any starter class wins it in about a minute; losing only resets the trial (retry any time).
            'binding_echo': {
                name: 'The Binding Echo',
                id: 'binding_echo',
                hp: 420, maxHp: 420, xp: 180, atk: 15, def: 5, spd: 11,
                critChance: 0.1, critMultiplier: 1.6,
                specialFlags: ['boss', 'spirit'],
                skills: [
                    { name: 'Chain Lash', base_damage: [12, 16] },
                    { name: 'Sunbrand', base_damage: [10, 14] },
                    { name: 'Moonless Drag', base_damage: [8, 12] }
                ]
            },
            // Chapter Two, Act I (docs/design/CHAPTER_TWO_LORE.md, C2-01 The Frostspine Road; Tokelo 2026-11-11 "start
            // building the world for chapter 2"). Torvald Redhand's Wolf-Banner raiders, hunting the name tablets of the six
            // hundred. CANDIDATE kits for Gauge: a step above the Broken Oath zealot, for a level 4-5 character after the Warden.
            'wolfbanner_raider': {
                name: 'Wolf-Banner Raider',
                hp: 46, maxHp: 46, xp: 34, atk: 9, def: 4, spd: 9,
                critChance: 0.1, critMultiplier: 1.6,
                skills: [{ name: 'Bearded Axe', base_damage: [8, 12] }, { name: 'Shield Rush', base_damage: [5, 8] }]
            },
            'wolfbanner_skirmisher': {
                name: 'Wolf-Banner Spear-Thrower',
                hp: 32, maxHp: 32, xp: 30, atk: 9, def: 2, spd: 11,
                critChance: 0.12, critMultiplier: 1.6,
                skills: [{ name: 'Thrown Spear', base_damage: [8, 11] }, { name: 'Spear Jab', base_damage: [6, 9] }]
            },
            // Sergeant Kess, the Ash-Marked (Chapter One master brief §3, 2026-11-11): a former Crown sergeant who fights
            // with measured melee pressure beside one acolyte. An elite, not a second boss. Gauge 2026-11-11: kept as is, met
            // at level 3 it is the hardest non-boss fight in Chapter One (turn: 7-10 rounds, 15-45% HP; action: 6-25 s), 100% wins.
            'oath_sergeant': {
                name: 'Sergeant Kess',
                hp: 90, maxHp: 90, xp: 60, atk: 10, def: 4, spd: 9, tier: 'elite',
                critChance: 0.1, critMultiplier: 1.6,
                skills: [{ name: 'Measured Cut', base_damage: [9, 13] }, { name: 'Shield Feint', base_damage: [5, 8] }]
            },
            'wolfbanner_ringleader': {
                name: 'Ulfrun Grey-Mantle',
                hp: 120, maxHp: 120, xp: 110, atk: 12, def: 5, spd: 10, tier: 'elite',
                critChance: 0.15, critMultiplier: 1.7,
                skills: [{ name: 'Two-Hand Axe', base_damage: [12, 17] }, { name: 'Wolf Howl', base_damage: [4, 6] }]
            }
        };
		
		

        // --- Minion Definitions (New) ---
        const minionDefinitions = {
            // Rogue ninja kit (Tokelo 2026-11-02): shadow bodies that fade after `lifetimeSeconds` (turn fights: `lifetimeTurns`)
            // and never follow you out of a fight (`fadesWithFight`). Their cuts pass through armour (shadow).
            'shadow_clone': {
                name: 'Shadow Clone', hp: 30, maxHp: 30, atk: 3, def: 2, spd: 12, critChance: 0.1, critMultiplier: 1.5,
                resistances: [], specialFlags: ['shadow'], lifetimeSeconds: 10, lifetimeTurns: 3, fadesWithFight: true,
                skills: [{ name: 'Shadow Cut', description: 'Deals 2-4 damage through armour.', base_damage: [2, 4], target: 'enemy_single', damage_type: 'physical', effects: [{ type: 'ignore_armor' }] }]
            },
            'shadow_hound': {
                name: 'Shadow Hound', hp: 16, maxHp: 16, atk: 3, def: 1, spd: 14, critChance: 0.05, critMultiplier: 1.5,
                resistances: [], specialFlags: ['shadow'], lifetimeSeconds: 15, lifetimeTurns: 5, fadesWithFight: true,
                skills: [{ name: 'Shadow Bite', description: 'Deals 2-4 damage through armour.', base_damage: [2, 4], target: 'enemy_single', damage_type: 'physical', effects: [{ type: 'ignore_armor' }] }]
            },
            // Fenrir's Heir: Call of the Pack. Spectral wolves, half sun and half moon; they fade with the fight.
            'spectral_wolf': {
                name: 'Spectral Wolf', hp: 20, maxHp: 20, atk: 4, def: 1, spd: 15, critChance: 0.1, critMultiplier: 1.5,
                resistances: [], specialFlags: ['spirit'], lifetimeSeconds: 15, lifetimeTurns: 5, fadesWithFight: true,
                skills: [{ name: 'Spirit Bite', description: 'Deals 3-5 damage.', base_damage: [3, 5], target: 'enemy_single', damage_type: 'physical' }]
            },
            'shadow_stag': {
                name: 'Shadow Stag', hp: 40, maxHp: 40, atk: 6, def: 3, spd: 10, critChance: 0.05, critMultiplier: 1.5,
                resistances: [], specialFlags: ['shadow'], lifetimeSeconds: 20, lifetimeTurns: 7, fadesWithFight: true,
                skills: [{ name: 'Antler Gore', description: 'Deals 5-8 damage through armour.', base_damage: [5, 8], target: 'enemy_single', damage_type: 'physical', effects: [{ type: 'ignore_armor' }] }]
            },
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
            'skeleton_champion': {   // March of Endless Bones: double a skeleton (Tokelo 2026-11-01)
                name: 'Skeleton Champion',
                hp: 30,
                maxHp: 30,
                atk: 10,
                def: 2,
                spd: 7,
                critChance: 0.05,
                critMultiplier: 1.5,
                resistances: [],
                specialFlags: ['undead'],
                skills: [{ name: 'Champion Cleave', description: 'Deals 10-14 damage.', base_damage: [10, 14], target: 'enemy_single', damage_type: 'physical' }]
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
            'Guard': { description: 'Reduce incoming damage by 25% next turn.', liveDescription: 'Take 25% less damage for 8 s. Stacks to 2 (44%).', cost: 0, resource: 'Momentum', effects: [{ type: 'damage_reduction', value: 0.25, duration: 1, traitOverride: 'Shield Discipline' }], target: 'self' },
            'Power Strike': { description: 'Spend 2 Momentum to deal 14–20 damage.', cost: 2, resource: 'Momentum', base_damage: [14, 20], target: 'enemy_single', damage_type: 'physical' },
            'War Cry': { description: 'Gain +1 Momentum, enemy gets +accuracy next attack.', liveDescription: 'Gain +1 Momentum; the enemy gets +accuracy for 3 s.', cost: 0, resource: 'Momentum', effects: [{ type: 'gain_resource', resource: 'Momentum', value: 1 }, { type: 'apply_status', status: 'accuracy_buff_enemy', value: 0.1, duration: 1 }], target: 'self' }, // Safety valve

            // Vanguard Branch Skills
            'Shield Bash': { description: 'Deal 10–14 damage; stun if Oath Points ≥ 3 (not spent). Target acts once between Shield Bash stuns.', liveDescription: 'Deal 10–14 damage; stun 3 s if Oath Points ≥ 3 (not spent). A target gets one action between Shield Bash stuns.', cost: 0, resource: 'Oath Points', base_damage: [10, 14], effects: [{ type: 'stun', duration: 1, shieldBashRecovery: true, condition: { stat: 'Oath Points', operator: '>=', value: 3 } }], target: 'enemy_single', damage_type: 'physical', combatFlavor: "Your shield rings out like a drum, shaking the foe’s footing." },
            'Mounted Charge': { description: 'Charge a target, dealing damage and gaining momentum. Gained via Tourney of Crowns prestige quest.', cost: 1, resource: 'Momentum', base_damage: [12, 18], effects: [{ type: 'gain_resource', resource: 'Momentum', value: 1 }], target: 'enemy_single', damage_type: 'physical' }, // Prestige Skill
            'Shield Charge': { description: 'Rush an ally, taunt enemies around them. Deals 8–12 dmg.', liveDescription: 'Rush an ally and taunt enemies around them for 3 s. Deals 8–12 dmg.', cost: 1, resource: 'Oath Points', base_damage: [8, 12], effects: [{ type: 'taunt_aoe', duration: 1 }], target: 'ally_single', damage_type: 'physical' },
            'Holy Smite': { description: 'Spend all Oath Points to deal 15–25 radiant dmg (+5 vs Undead/Void).', cost: 'all', resource: 'Oath Points', base_damage: [15, 25], effects: [{ type: 'bonus_damage_vs_flag', flag: 'undead', value: 5 }, { type: 'bonus_damage_vs_flag', flag: 'void', value: 5 }], target: 'enemy_single', damage_type: 'radiant' },
            'Soul Rend': { description: 'Consume all Sin Marks to deal 25–35 AOE dmg (ignores armor).', cost: 'all', resource: 'Sin Marks', base_damage: [25, 35], effects: [{ type: 'ignore_armor' }], target: 'enemy_aoe', damage_type: 'true', combatFlavor: "Your blade drinks deep, shadows screaming with each cut." },

            // Berserker Branch Skills
            'Hemorrhage': { description: 'Deal 10–16 damage + bleed (3 dmg/turn for 3 turns).', liveDescription: 'Deal 10–16 damage + bleed (3 dmg/s for 9 s).', cost: 1, resource: 'Fury Gauge', base_damage: [10, 16], effects: [{ type: 'bleed', value: 3, duration: 3 }], target: 'enemy_single', damage_type: 'physical', combatFlavor: "Pain sharpens your grin as the blood runs hotter." },
            'Whirlwind': { description: 'Deal 8–12 AOE damage to all enemies.', cost: 2, resource: 'Fury Gauge', base_damage: [8, 12], target: 'enemy_aoe', damage_type: 'physical' },
            'Lunge': { description: 'Leap to target, deal 15–22 damage, gain 2 Fury.', cost: 1, resource: 'Fury Gauge', base_damage: [15, 22], effects: [{ type: 'gain_resource', resource: 'Fury Gauge', value: 2 }], target: 'enemy_single', damage_type: 'physical' },
            'Sever Spine': { description: 'Once per boss fight, deal 30–40 true damage.', cost: 0, resource: 'Fury Gauge', base_damage: [30, 40], effects: [{ type: 'true_damage' }], target: 'enemy_single', damage_type: 'physical', combatFlavor: "The great beast falls silent, its last breath stolen by your strike." },

            // Warden Branch Skills
            'Pincushion': { description: 'Apply [Pin] Mark, reducing target speed by 50%.', liveDescription: 'Apply [Pin] Mark for 6 s, reducing target speed by 50%.', cost: 0, resource: 'Vigil', effects: [{ type: 'apply_mark', mark: 'Pin', value: 0.5, duration: 2 }], target: 'enemy_single', damage_type: 'utility', combatFlavor: "The enemy’s advance falters as your spear finds its mark." },
            'Lockstep': { description: 'Taunt enemies in your zone for 1 turn.', liveDescription: 'Taunt enemies in your zone for 3 s.', cost: 1, resource: 'Vigil', effects: [{ type: 'taunt_aoe', duration: 1 }], target: 'enemy_aoe', damage_type: 'utility' },
            'Expose Weakness': { description: 'Apply [Expose] Mark, increasing dmg taken by 20% for 2 turns.', liveDescription: 'Apply [Expose] Mark: target takes +20% damage for 6 s.', cost: 1, resource: 'Vigil', effects: [{ type: 'apply_mark', mark: 'Expose', value: 0.2, duration: 2 }], target: 'enemy_single', damage_type: 'utility' },
            'Fortress': { description: 'Create a zone lasting 3 turns, allies take -20% dmg inside.', liveDescription: 'Create a zone for 9 s; allies inside take -20% damage.', cost: 2, resource: 'Vigil', effects: [{ type: 'create_zone', zone: 'Fortress', duration: 3, effect: { type: 'damage_reduction', value: 0.2 } }], target: 'self', damage_type: 'utility' },

            // Necromancer Base Skills
            'Grave Bolt': { description: '10–14 dmg, +2 dmg for each minion you have raised.', cost: 1, cooldown: 4, resource: 'Soul Energy', base_damage: [10, 14], effects: [{ type: 'bonus_damage_per_minion', value: 2 }], target: 'enemy_single', damage_type: 'magic' },
            'Raise Skeleton': { description: 'Summon skeleton (5–7 dmg/turn).', liveDescription: 'Summon a skeleton (5–7 dmg per hit).', cost: 2, resource: 'Soul Energy', effects: [{ type: 'summon', summon_type: 'skeleton', damage: [5, 7], duration: 'permanent' }], target: 'self' },
            'Soul Leech': { description: 'Deal 8 dmg, heal for half dmg dealt.', cost: 1, cooldown: 4, resource: 'Soul Energy', base_damage: [8, 8], effects: [{ type: 'heal_from_damage', ratio: 0.5 }], target: 'enemy_single', damage_type: 'magic' },
            // Tokelo 2026-11-01: was "+1 Soul Energy for 2 true damage" (a turn-based valve). Now two random ghosts buff you.
            // Pool and numbers: docs/design/NECROMANCER_LIVE_KIT.md (Gauge). Ghost lifetime in timed fights: realtimeRules.statuses.buffs.
            'Channel the Grave': { description: 'Call 2 ghosts for 5 turns; each grants a random buff (damage, Soul Energy, speed, poison or bleed on hit).', liveDescription: 'Call 2 ghosts for 20 s; each grants a random buff: +25% damage, Soul Energy recovery, 25% faster swings and cooldowns, poison on hit or bleed on hit.', cost: 2, cooldown: 30, resource: 'Soul Energy', effects: [{ type: 'channel_ghosts', count: 2, duration: 5, pool: [
                { name: 'Wrath Ghost', type: 'damage_boost', value: 0.25, text: '+25% damage' },
                { name: 'Siphon Ghost', type: 'resource_regen', value: 1, text: '+1 Soul Energy every pulse' },
                { name: 'Swift Ghost', type: 'haste', value: 0.25, text: 'swings and cooldowns 25% faster' },
                { name: 'Venom Ghost', type: 'on_hit_dot', dot: 'Poison', value: 2, dotDuration: 1, dotStackCap: 2, text: 'your hits poison' },
                { name: 'Rend Ghost', type: 'on_hit_dot', dot: 'Bleed', value: 2, dotDuration: 1, dotStackCap: 2, text: 'your hits cause bleeding' }
            ] }], target: 'self' },

            // Bone Warden Branch Skills
            'Bone Wall': { description: 'Absorbs the next hit entirely.', liveDescription: 'Absorb the next hit entirely. Lasts 12 s; stacks to 2 (two hits).', cost: 1, resource: 'Soul Energy', effects: [{ type: 'absorb_hit', duration: 1 }], target: 'self' },
            'Shield of the Dead': { description: 'All minions taunt for 2 turns.', liveDescription: 'All minions taunt for 6 s.', cost: 2, resource: 'Soul Energy', effects: [{ type: 'minion_taunt', duration: 2 }], target: 'minions' },
            // Team pick (Tokelo asked for a researched swap, 2026-11-01): Shield of the Dead did nothing without minions.
            'Bone Cage': { description: 'Bone spikes burst from the ground: 8–12 dmg to enemies in the area, slowed by 90% for 1 turn.', liveDescription: 'Bone spikes burst from the ground: 8–12 dmg to enemies in the area, who are held (90% slower) for 3 s.', cost: 2, cooldown: 12, resource: 'Soul Energy', base_damage: [8, 12], effects: [{ type: 'slow', value: 0.9, duration: 1 }], target: 'enemy_aoe', damage_type: 'physical' },
            // Tokelo 2026-11-01: a meat shield. It takes every hit meant for you, then runs at an enemy and bursts.
            'Raise Ghoul': { description: 'Raise a ghoul that takes all damage meant for you for 3 turns, then bursts on an enemy: half the stored damage as a blast, half as bleeding.', liveDescription: 'Raise a ghoul that takes all damage meant for you for 10 s (up to 60), then runs at an enemy and bursts: 10 + half the stored damage at once, the other half as bleeding over 6 s.', cost: 3, cooldown: 25, resource: 'Soul Energy', effects: [{ type: 'ghoul_shield', summon_type: 'ghoul', seconds: 10, duration: 3, capacity: 60, burstBase: 10, burstShare: 0.5, bleedShare: 0.5, bleedTurns: 2, chargeSeconds: 4 }], target: 'self' },
            'Reaper’s Charge': { description: '20–28 dmg + stun 1 turn.', liveDescription: '20–28 dmg + stun 3 s.', cost: 3, resource: 'Soul Energy', base_damage: [20, 28], effects: [{ type: 'stun', duration: 1 }], target: 'enemy_single', damage_type: 'physical' },

            // Plaguecaller Branch Skills
            'Contagion': { description: 'Infect target; spreads on death.', liveDescription: 'Infect the target for 9 s; spreads on death.', cost: 1, resource: 'Soul Energy', effects: [{ type: 'infect', duration: 3, spread_on_death: true }], target: 'enemy_single', damage_type: 'magic' },
            'Black Spit': { description: 'Apply [Weaken] (-20% dmg) + 5 dmg/turn for 3 turns.', liveDescription: 'Apply [Weaken] (-20% dmg) for 9 s + poison 5 dmg/s for 9 s.', cost: 1, resource: 'Soul Energy', effects: [{ type: 'apply_mark', mark: 'Weaken', value: 0.2, duration: 3 }, { type: 'dot', dot_type: 'poison', value: 5, duration: 3 }], target: 'enemy_single', damage_type: 'magic' },
            'Corpse Bloom': { description: 'Explode a corpse for 15 dmg AOE + 1 Infection stack to all in range.', cost: 2, resource: 'Soul Energy', base_damage: [15, 15], effects: [{ type: 'aoe_damage_from_corpse' }, { type: 'apply_infection_aoe', stacks: 1 }], target: 'corpse', damage_type: 'magic' },
            // Plaguecaller live rework (Tokelo 2026-11-01): the branch needed a crowd (corpses, spreading). These two replace
            // Corpse Bloom (L8) and Plague Wind (L11) on the path; both work on a lone boss. docs/design/PLAGUECALLER_LIVE.md
            'Plague Burst': { description: 'Detonate the Infection on one enemy: 5 dmg per stack at once (ignores DEF), consuming it.', liveDescription: 'Detonate the Infection on one enemy: 5 dmg per stack at once (ignores DEF), consuming the stacks.', cost: 2, cooldown: 8, resource: 'Soul Energy', effects: [{ type: 'plague_burst', perStack: 5 }], target: 'enemy_single', damage_type: 'magic' },
            'Withering Curse': { description: 'Curse an enemy for 3 turns: it takes +50% damage from your DoTs.', liveDescription: 'Curse an enemy for 9 s: it takes +50% damage from damage over time (Infection, Poison, Bleed).', cost: 1, cooldown: 10, resource: 'Soul Energy', effects: [{ type: 'wither', value: 0.5, duration: 3 }], target: 'enemy_single', damage_type: 'utility' },
            'Plague Wind': { description: 'Spread all infections instantly to every enemy.', cost: 3, resource: 'Soul Energy', effects: [{ type: 'spread_all_infections' }], target: 'all_enemies', damage_type: 'utility' },

            // Soulbinder Branch Skills
            'Soul Chain': { description: 'Link 2 targets; dmg to one hits both.', cost: 1, resource: 'Soul Energy', effects: [{ type: 'link_targets', count: 2 }], target: 'enemy_multiple' },
            'Possession': { description: 'Control an enemy for 1 turn.', liveDescription: 'Take control of an enemy for its next action.', cost: 3, resource: 'Soul Energy', effects: [{ type: 'control_enemy', duration: 1 }], target: 'enemy_single' },
            'Soul Feast': { description: 'Drain 2 HP/turn from all linked enemies for 3 turns.', liveDescription: 'Drain 2 HP every 2 s from all linked enemies for 9 s.', cost: 2, resource: 'Soul Energy', effects: [{ type: 'drain_hp_from_linked', value: 2, duration: 3 }], target: 'linked_enemies' },

            // Rogue Base Skills
            'Backstab': { description: '10–14 dmg, +5 dmg if target is [Flanked].', cost: 2, resource: 'Energy', base_damage: [10, 14], target: 'enemy_single', damage_type: 'physical' },
            // Ninja rework (Tokelo 2026-11-02): Evasion is a window, not one coin flip. Every attack on you rolls while it lasts.
            'Evasion': { description: 'For 2 turns, every attack on you has a 50% chance to miss.', liveDescription: 'For 6 s, every attack on you has a 50% chance to miss (you see EVADE). 15 s cooldown.', cost: 2, cooldown: 15, resource: 'Energy', effects: [{ type: 'dodge_chance', value: 0.5, duration: 2, persistent: true }], target: 'self' },
            'Quick Slash': { description: '6–9 dmg, always crits if used first in turn.', liveDescription: 'Dash 32 px in for 6–9 dmg; always crits as an opener (your first attack in 2 s). 3 s cooldown.', cost: 1, cooldown: 3, resource: 'Energy', base_damage: [6, 9], effects: [{ type: 'guaranteed_crit_first_turn' }], target: 'enemy_single', damage_type: 'physical' },
            'Second Wind': { description: 'Gain +2 Energy, -25% evasion this turn.', liveDescription: 'Gain +2 Energy, -25% evasion for 3 s.', cost: 0, resource: 'Energy', effects: [{ type: 'gain_resource', resource: 'Energy', value: 2 }, { type: 'apply_status', status: 'Evasion Debuff', value: -0.25, duration: 1 }], target: 'self' }, // Safety valve

            // Assassin Branch Skills
            'Shadowstep': { description: 'Teleport to enemy, next hit crits.', liveDescription: 'Sink into your shadow and rise behind an enemy up to 110 px away (a moment of invulnerability); your next hit is a critical. 8 s cooldown.', cost: 2, cooldown: 8, resource: 'Energy', effects: [{ type: 'teleport_to_enemy' }, { type: 'guaranteed_crit_next_hit' }], target: 'enemy_single' },
            'Garrote': { description: '12–16 dmg + silence 1 turn.', liveDescription: '12–16 dmg + silence 3 s.', cost: 2, resource: 'Stealth Tokens', base_damage: [12, 16], effects: [{ type: 'silence', duration: 1 }], target: 'enemy_single', damage_type: 'physical' },
            'Marked for Death': { description: 'Mark enemy; next attack from you or ally deals +50% dmg.', liveDescription: 'Mark an enemy; the next attack from you or an ally deals +50% dmg. Lasts 3 s or until used.', cost: 0, resource: 'Stealth Tokens', effects: [{ type: 'apply_mark', mark: 'Marked for Death', value: 0.5, duration: 1 }], target: 'enemy_single', damage_type: 'utility' },
            // Ninja rework (Tokelo 2026-11-02): no longer an instant kill (it skipped the last fifth of every boss).
            'Assassinate': { description: '22–30 dmg; double damage against a target under 30% HP.', liveDescription: 'A killing cut: 22–30 dmg, doubled against a target under 30% HP. Never an instant kill, so a boss can\'t be skipped. 20 s cooldown.', cost: 4, cooldown: 20, resource: 'Energy', base_damage: [22, 30], effects: [{ type: 'execute_bonus', threshold: 0.3, value: 1 }], target: 'enemy_single', damage_type: 'physical' },

            // Duelist Branch Skills
            'Riposte': { description: 'Counter next melee attack for +50% dmg.', liveDescription: 'Stand ready for 10 s: the next blow aimed at you is answered with your weapon for +50% dmg. Stacks to 2. 8 s cooldown.', cost: 1, cooldown: 8, resource: 'Energy', effects: [{ type: 'counter_attack', bonus_damage: 0.5, duration: 1 }], target: 'self' },
            'Flurry': { description: '3x 6–8 dmg strikes.', cost: 3, resource: 'Combo Points', base_damage: [6, 8], effects: [{ type: 'multi_hit', count: 3 }], target: 'enemy_single', damage_type: 'physical' },
            'Blade Storm': { description: 'Spin through everything around you: 3 × 10–14 dmg to every enemy, half their armour ignored.', liveDescription: 'Spin through everything within 34 px: 3 sweeps of 10–14 dmg to every enemy (half their armour ignored). 25 s cooldown.', cost: 5, cooldown: 25, resource: 'Energy', base_damage: [10, 14], effects: [{ type: 'multi_hit', count: 3 }, { type: 'ignore_armor_percent', value: 0.5 }], target: 'enemy_aoe', damage_type: 'physical' },

            // Saboteur Branch Skills
            'Caltrops': { description: 'Slow enemies (-50% speed, 2 turns).', liveDescription: 'Slow enemies (-50% speed) for 6 s.', cost: 1, resource: 'Trap Charges', effects: [{ type: 'slow', value: 0.5, duration: 2 }], target: 'enemy_aoe', damage_type: 'utility' },
            'Smoke Bomb': { description: 'Smoke bursts around you: enemies in it are blinded (50% to miss) for 1 turn.', liveDescription: 'Smoke bursts around you (48 px): enemies in it are blinded for 4 s, so each of their attacks has a 50% chance to miss (you see MISS). 16 s cooldown.', cost: 2, cooldown: 16, resource: 'Energy', effects: [{ type: 'blind', value: 0.5, duration: 1, seconds: 4 }], target: 'enemy_aoe', damage_type: 'utility' },
            'Poison Trap': { description: '4 dmg/turn DoT, 3 turns.', liveDescription: 'The next enemy to attack springs it: 4 dmg/s for 9 s.', cost: 1, resource: 'Trap Charges', effects: [{ type: 'place_trap', trap_type: 'poison', value: 4, duration: 3 }], target: 'ground', damage_type: 'utility' },
            'Clockwork Bomb': { description: '20–28 dmg AOE, delayed 1 turn.', liveDescription: '20–28 dmg AOE; explodes within 2 s.', cost: 3, resource: 'Trap Charges', base_damage: [20, 28], effects: [{ type: 'delayed_aoe', delay: 1 }], target: 'enemy_aoe', damage_type: 'physical' },

            // ---------- Rogue ninja kit (Tokelo 2026-11-02, docs/design/ROGUE_NINJA_KIT.md) ----------
            // One pool for every path: Energy. First-pass numbers for Gauge. The Crow Warden has DEF 8, so small hits that
            // matter against him say so (ignore_armor / ignore_armor_percent) instead of quietly doing 0.
            'Shuriken Volley': { description: 'Throw 3 shuriken at one enemy: 3 × 1–2 dmg (plus Agility) that ignores armour.', liveDescription: 'Throw 3 shuriken at one enemy up to 140 px away: 3 × 1–2 dmg (plus Agility) that ignores armour. 4 s cooldown.', cost: 1, cooldown: 4, resource: 'Energy', base_damage: [1, 2], effects: [{ type: 'multi_hit', count: 3 }, { type: 'ignore_armor' }], target: 'enemy_single', damage_type: 'physical' },
            // Ronin's Follow-Up Cut trait swings this on its own (engine.followUpCut); no web node teaches it.
            'Follow-Up Cut': { description: 'A second cut right behind the first: 2–3 dmg (plus Agility) through armour.', cost: 0, resource: 'Energy', base_damage: [2, 3], effects: [{ type: 'ignore_armor' }], target: 'enemy_single', damage_type: 'physical', traitOnly: true },
            'Shadow Clone': { description: 'A shadow clone fights beside you for 3 turns; enemies may strike it instead of you.', liveDescription: 'A shadow clone steps out of you for 10 s (30 HP). It cuts for 2–4 dmg through armour, and enemies go for it whenever it is the nearer body. 20 s cooldown.', cost: 3, cooldown: 20, resource: 'Energy', effects: [{ type: 'shadow_summon', summon_type: 'shadow_clone', count: 1 }], target: 'self' },
            // Assassin: shadow creatures and evasion
            'Shadow Hounds': { description: 'Two shadow hounds rise from your shadow for 5 turns.', liveDescription: 'Two shadow hounds rise from your shadow for 15 s (16 HP each). Each bites for 2–4 dmg through armour about once a second, and enemies may go for them instead of you. 22 s cooldown.', cost: 3, cooldown: 22, resource: 'Energy', effects: [{ type: 'shadow_summon', summon_type: 'shadow_hound', count: 2 }], target: 'self' },
            'Shadow Serpent': { description: 'A serpent of shadow bursts under an enemy: 12–16 dmg and it is held (90% slower) for 1 turn.', liveDescription: 'A serpent of shadow bursts from the ground up to 130 px away (24 px wide): 12–16 dmg, half armour ignored, and everyone there is held (90% slower) for 3 s. 14 s cooldown.', cost: 3, cooldown: 14, resource: 'Energy', base_damage: [12, 16], effects: [{ type: 'ignore_armor_percent', value: 0.5 }, { type: 'slow', value: 0.9, duration: 1 }], target: 'enemy_aoe', damage_type: 'physical' },
            'Shade Legion': { description: 'Your shadow rises as an army: shadow hounds up to your minion limit plus a Shadow Stag, for 7 turns.', liveDescription: 'Your shadow rises as an army for 20 s: shadow hounds up to your minion limit, plus a Shadow Stag (40 HP, gores for 5–8 through armour). 45 s cooldown.', cost: 6, cooldown: 45, resource: 'Energy', effects: [{ type: 'raise_army', summon_type: 'shadow_hound', champion: 'shadow_stag', seconds: 20, duration: 7 }], target: 'self' },
            // Duelist: the ronin who took up ninjutsu
            'Iaido Draw': { description: 'A lightning draw-cut: 14–20 dmg; always crits as an opener.', liveDescription: 'Sheathe, then draw in one cut (34 px line): 14–20 dmg. Always a critical as an opener (your first attack in 2 s). 6 s cooldown.', cost: 2, cooldown: 6, resource: 'Energy', base_damage: [14, 20], effects: [{ type: 'guaranteed_crit_first_turn' }], target: 'enemy_single', damage_type: 'physical' },
            'Blade Focus': { description: 'For 3 turns: +30% damage and faster strikes.', liveDescription: 'Focus the blade for 10 s: +30% damage, and your swings and cooldowns run 20% faster. 20 s cooldown.', cost: 2, cooldown: 20, resource: 'Energy', effects: [{ type: 'self_buff', name: 'Blade Focus', status_type: 'damage_boost', value: 0.3, duration: 3 }, { type: 'self_buff', name: 'Focused Pace', status_type: 'haste', value: 0.2, duration: 3 }], target: 'self' },
            'Thousand Cuts': { description: 'Six rapid cuts on one enemy: 6 × 5–7 dmg, half its armour ignored.', liveDescription: 'Six cuts in a blink on one enemy in front of you: 6 × 5–7 dmg, half its armour ignored. 12 s cooldown.', cost: 4, cooldown: 12, resource: 'Energy', base_damage: [5, 7], effects: [{ type: 'multi_hit', count: 6 }, { type: 'ignore_armor_percent', value: 0.5 }], target: 'enemy_single', damage_type: 'physical' },
            // Saboteur: the ninja who went mad with explosives and chemistry. `explosive` skills feel Shrapnel and Volatile Mix.
            'Fire Bomb': { description: 'Throw a bomb that bursts on impact: 10–14 dmg to every enemy in the blast, half their armour ignored.', liveDescription: 'Throw a bomb up to 130 px; it bursts on the first enemy it hits or where it lands: 10–14 dmg to everyone within 32 px, half their armour ignored. 5 s cooldown.', cost: 2, cooldown: 5, resource: 'Energy', explosive: true, base_damage: [10, 14], effects: [{ type: 'ignore_armor_percent', value: 0.5 }], target: 'enemy_aoe', damage_type: 'physical' },
            'Explosive Caltrops': { description: 'Scatter 3 spiked charges; each blows up under the next enemy that steps on it: 8–12 dmg and Bleed.', liveDescription: 'Scatter 3 spiked charges where you aim (up to 110 px). For 20 s each one blows up when an enemy steps within 14 px: 8–12 dmg to everyone within 28 px (half armour ignored) and Bleed, 2 dmg/s for 6 s (stacks to 3). 10 s cooldown.', cost: 2, cooldown: 10, resource: 'Energy', explosive: true, effects: [{ type: 'lay_mines', count: 3, seconds: 20, spreadPx: 22, triggerPx: 14, blastPx: 28, blast: { base_damage: [8, 12], effects: [{ type: 'ignore_armor_percent', value: 0.5 }, { type: 'bleed', value: 2, duration: 2, stackCap: 3 }] } }], target: 'ground', damage_type: 'utility' },
            'Poison Flask': { description: 'A flask of venom shatters: Poison (4 dmg/turn for 3 turns) on every enemy in the splash.', liveDescription: 'Throw a flask up to 120 px; it shatters into a toxic cloud: everyone within 36 px is poisoned for 4 dmg/s over 9 s (stacks to 2). 8 s cooldown.', cost: 2, cooldown: 8, resource: 'Energy', effects: [{ type: 'dot', dot_type: 'poison', value: 4, duration: 3, stackCap: 2 }], target: 'enemy_aoe', damage_type: 'utility' },
            'Thunder Charge': { description: 'A heavy clockwork charge: 22–30 dmg to every enemy in a wide blast, and they are stunned for 1 turn.', liveDescription: 'Lob a heavy clockwork charge up to 120 px: it bursts for 22–30 dmg on everyone within 48 px (half armour ignored) and stuns them for 3 s (bosses resist control). 16 s cooldown.', cost: 4, cooldown: 16, resource: 'Energy', explosive: true, base_damage: [22, 30], effects: [{ type: 'ignore_armor_percent', value: 0.5 }, { type: 'stun', duration: 1 }], target: 'enemy_aoe', damage_type: 'physical' },
            'Cataclysm Barrage': { description: 'Empty your satchel: 3 × 10–14 dmg to every enemy around you, with Bleed and Poison.', liveDescription: 'Empty your satchel in a ring around you (80 px): 3 blasts of 10–14 dmg on every enemy in it (half armour ignored), then Bleed and Poison, 2 dmg/s each for 6 s. 40 s cooldown.', cost: 6, cooldown: 40, resource: 'Energy', explosive: true, base_damage: [10, 14], effects: [{ type: 'multi_hit', count: 3 }, { type: 'ignore_armor_percent', value: 0.5 }, { type: 'bleed', value: 2, duration: 2, stackCap: 3 }, { type: 'dot', dot_type: 'poison', value: 2, duration: 2, stackCap: 2 }], target: 'enemy_aoe', damage_type: 'physical' },

            // Mage Base Skills
            'Arcane Bolt': { description: '10–14 dmg.', cost: 1, cooldown: 4, resource: 'Mana', base_damage: [10, 14], target: 'enemy_single', damage_type: 'magic' },
            'Focus': { description: 'Gain +2 Mana.', cost: 0, resource: 'Mana', effects: [{ type: 'gain_resource', resource: 'Mana', value: 2 }], target: 'self' },
            'Mana Burst': { description: '15–20 dmg, ignores 25% armor.', cost: 2, cooldown: 7, resource: 'Mana', base_damage: [15, 20], effects: [{ type: 'ignore_armor_percent', value: 0.25 }], target: 'enemy_single', damage_type: 'magic' },
            'Overchannel': { description: 'Spend HP to cast beyond Mana this turn; leaves a "Burnout" debuff next turn.', liveDescription: 'Spend HP to cast beyond Mana for 3 s; then a "Burnout" debuff for 3 s.', cost: 0, resource: 'Mana', effects: [{ type: 'overchannel' }], target: 'self' }, // Safety valve

            // Elementalist Branch Skills
            'Fireball': { description: 'Deal fire damage.', cost: 1, resource: 'Mana', base_damage: [10, 15], target: 'enemy_single', damage_type: 'fire' },
            'Ice Lance': { description: 'Deal ice damage, may slow.', liveDescription: 'Deal ice damage; may slow for 3 s.', cost: 1, resource: 'Mana', base_damage: [9, 14], effects: [{ type: 'slow_chance', value: 0.3, duration: 1 }], target: 'enemy_single', damage_type: 'ice' },
            'Lightning Arc': { description: 'Deal lightning damage, may chain.', cost: 1, resource: 'Mana', base_damage: [8, 13], effects: [{ type: 'chain_lightning', count: 2 }], target: 'enemy_single', damage_type: 'lightning' },

            // Illusionist Branch Skills
            'mirrorImage': { description: 'Avoid next hit.', liveDescription: 'Images take hits for you: the next hit always misses. Lasts 15 s; stacks to 3.', cost: 1, resource: 'Deception Tokens', effects: [{ type: 'avoid_next_hit', duration: 1 }], target: 'self' },
            'confuse': { description: '50% chance enemy skips turn.', liveDescription: '50% chance the enemy is stunned for 3 s.', cost: 2, resource: 'Deception Tokens', effects: [{ type: 'skip_turn_chance', value: 0.5, duration: 1 }], target: 'enemy_single' },
            'stealSkill': { description: 'Steal enemy’s last used skill for 2 turns.', liveDescription: 'Steal the enemy’s last used skill for 6 s.', cost: 3, resource: 'Deception Tokens', effects: [{ type: 'steal_skill', duration: 2 }], target: 'enemy_single' },
            'multiTargetIllusions': { description: 'Up to 3 enemies skip turn.', liveDescription: 'Up to 3 enemies are stunned for 3 s.', cost: 4, resource: 'Deception Tokens', effects: [{ type: 'skip_turn_aoe', count: 3, duration: 1 }], target: 'enemy_aoe' },

            // Chronomancer Branch Skills
            'haste': { description: 'Ally takes extra turn.', liveDescription: 'Haste for 8 s: skill cooldowns and basic attacks run 30% faster.', cost: 2, resource: 'Time Charges', cooldown: 20, effects: [{ type: 'extra_turn', liveSpeedup: 0.3 }], target: 'ally_single' },
            'slow': { description: 'Enemy loses next turn.', liveDescription: 'Stun the enemy for 3 s.', cost: 2, resource: 'Time Charges', effects: [{ type: 'skip_turn', duration: 1 }], target: 'enemy_single' },
            'revertHp': { description: 'Revert ally to HP they had 2 turns ago.', liveDescription: 'Revert to the HP you had 4 s ago.', cost: 3, resource: 'Time Charges', effects: [{ type: 'revert_hp', turns: 2 }], target: 'ally_single' },
            'freezeTime': { description: 'Enemies can’t act for 1 turn.', liveDescription: 'Enemies can’t act for 3 s.', cost: 5, resource: 'Time Charges', effects: [{ type: 'freeze_enemies', duration: 1 }], target: 'all_enemies' },
            'rearrangeTurnOrder': { description: 'Rearrange entire turn order for 3 turns.', liveDescription: 'Not available in live combat yet: live fights have no initiative order to rearrange (needs a live redesign).', cost: 'all', resource: 'Time Charges', effects: [{ type: 'rearrange_turn_order', duration: 3, minResource: 1 }], target: 'all_combatants' }, // D-09: rounds; needs >= 1 Time Charge


            // Ascended Overdrives (Special Skills at max evolution)
            'Oblivion Reign': { description: 'Next 3 turns, all attacks are true dmg & heal you.', liveDescription: 'For 9 s, all attacks are true dmg & heal you.', cost: 'all', resource: 'Sin Marks', oncePerFight: true, effects: [{ type: 'true_damage_attacks', duration: 3 }, { type: 'heal_on_attack_percent', value: 1 }], target: 'self' },
            'Dragon’s Dominion': { description: 'Triple dmg vs bosses for 1 turn.', liveDescription: 'Triple dmg vs bosses for 10 s.', cost: 'all', resource: 'Fury Gauge', oncePerFight: true, effects: [{ type: 'bonus_damage_vs_flag_percent', flag: 'boss', value: 2, duration: 1 }], target: 'self' }, // 200% bonus = triple
            'Total Lockdown': { description: 'Enemies can’t move or leave zones for 2 turns.', liveDescription: 'Enemies can’t move or leave zones for 6 s.', cost: 'all', resource: 'Vigil', oncePerFight: true, effects: [{ type: 'immobilize_enemies', duration: 2 }], target: 'all_enemies' },
            // Tokelo 2026-11-01: fill your army and raise a champion; costed and on a cooldown instead of once per fight.
            'March of Endless Bones': { description: 'Raise skeletons up to your minion limit, plus a Skeleton Champion with double a skeleton\'s stats.', cost: 6, cooldown: 45, resource: 'Soul Energy', effects: [{ type: 'raise_army', summon_type: 'skeleton', champion: 'skeleton_champion' }], target: 'self' }, // Black Pharaoh Ascended
            'Plague of Ages': { description: 'All enemies instantly gain max Infection stacks; infections deal true dmg.', liveDescription: 'Every enemy around you (160 px) gains 10 Infection stacks that deal true damage.', cost: 'all', resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'apply_max_infection_aoe', stacks: 10 }, { type: 'infections_true_damage' }], target: 'all_enemies' }, // Plague Sovereign Ascended
            'Death’s Dominion': { description: 'All enemies instantly become undead under your control for 1 turn.', liveDescription: 'All enemies become undead under your control for 3 s.', cost: 'all', resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'control_all_enemies', duration: 1 }], target: 'all_enemies' }, // Deathlord Eternal Legendary


            // Fallen Seraphim Legendary (Tokelo 2026-11-04): heavenly light that fell. Like the other legendary skills,
            // these are paid from whatever pool your class runs on. Gauge's first numbers; tune in data.
            'Halo of Ash': { description: 'A halo of ash and light: take 30% less damage for 3 turns.', liveDescription: 'A halo of ash and light: take 30% less damage for 9 s. 20 s cooldown. Free: the statue’s gift.', cost: 0, cooldown: 20, resource: 'any', effects: [{ type: 'damage_reduction', value: 0.3, duration: 3 }], target: 'self' },
            'Fallen Judgement': { description: 'A spear of fallen light: 26–34 radiant dmg that half ignores armour (+6 vs Undead/Void).', liveDescription: 'Hurl a spear of fallen light: 26–34 radiant dmg, half of armour ignored (+6 vs Undead/Void). 3 s cooldown. Free: the statue’s gift.', cost: 0, cooldown: 3, resource: 'any', base_damage: [26, 34], effects: [{ type: 'ignore_armor_percent', value: 0.5 }, { type: 'bonus_damage_vs_flag', flag: 'undead', value: 6 }, { type: 'bonus_damage_vs_flag', flag: 'void', value: 6 }], target: 'enemy_single', damage_type: 'radiant' },
            'Wings of Sorrow': { description: 'Six wings beat once: 8–12 radiant dmg to every enemy, and the glare blinds them (50% to miss) for 1 turn.', liveDescription: 'Six wings beat once around you (160 px): 8–12 radiant dmg to every enemy, blinded for 4 s (50% of their attacks miss). 18 s cooldown.', cost: 3, cooldown: 18, resource: 'any', base_damage: [8, 12], effects: [{ type: 'blind', value: 0.5, duration: 1, seconds: 4 }], target: 'all_enemies', damage_type: 'radiant' },
            'Six-Winged Descent': { description: 'Fall on your enemies like judgement: 20–28 true dmg to every enemy and stun them for 1 turn.', liveDescription: 'Fall on everything around you (160 px): 20–28 true dmg to every enemy, stunned for 3 s. Once per fight.', cost: 'all', resource: 'any', oncePerFight: true, base_damage: [20, 28], effects: [{ type: 'true_damage' }, { type: 'stun', duration: 1 }], target: 'all_enemies', damage_type: 'radiant' },
            // The full Fallen Seraphim kit (Thorne, Gauge; Tokelo 2026-11-04 "design the lore, attacks and skill tree"):
            // docs/design/FALLEN_SERAPHIM.md. Paid from your own class resource ('any'). Verdict of Ash costs HP too: the light burns.
            // The Veiled Face (judgement)
            'Brand of the Watcher': { description: 'Mark an enemy with a burning sigil: 6–9 radiant dmg and [Expose] (+25% dmg taken) for 2 turns.', liveDescription: 'Brand an enemy: 6–9 radiant dmg and [Expose] (+25% dmg taken) for 6 s. 10 s cooldown.', cost: 1, cooldown: 10, resource: 'any', base_damage: [6, 9], effects: [{ type: 'apply_mark', mark: 'Expose', value: 0.25, duration: 2 }], target: 'enemy_single', damage_type: 'radiant' },
            'Rain of Feathers': { description: 'Four burning feathers: 4x 5–7 radiant dmg to one enemy.', liveDescription: 'Loose four burning feathers at one enemy: 4x 5–7 radiant dmg. 10 s cooldown.', cost: 2, cooldown: 10, resource: 'any', base_damage: [5, 7], effects: [{ type: 'multi_hit', count: 4 }], target: 'enemy_single', damage_type: 'radiant' },
            'Verdict of Ash': { description: 'Pass sentence: 30–40 radiant dmg, doubled under 30% HP. The verdict burns you for 8 HP.', liveDescription: 'Pass sentence on one enemy: 30–40 radiant dmg, doubled against a target under 30% HP. Costs you 8 HP. 30 s cooldown.', cost: 4, cooldown: 30, resource: 'any', base_damage: [30, 40], effects: [{ type: 'execute_bonus', threshold: 0.3, value: 1 }, { type: 'take_true_damage', value: 8 }], target: 'enemy_single', damage_type: 'radiant' },
            // The Covered Feet (mercy)
            'Feather Ward': { description: 'A wing folds over you: absorb the next hit.', liveDescription: 'A wing folds over you: absorb the next hit. Lasts 12 s; stacks to 2. 14 s cooldown.', cost: 1, cooldown: 14, resource: 'any', effects: [{ type: 'absorb_hit', duration: 2, say: 'folds a grey wing close against the next hit.' }], target: 'self' },
            'Mercy of the Fallen': { description: 'Heal 25% of your max HP and burn away poison, bleeding and infection.', liveDescription: 'Heal 25% of your max HP and burn away damage over time (poison, bleed, burn, infection). 24 s cooldown.', cost: 2, cooldown: 24, resource: 'any', effects: [{ type: 'heal_percent', value: 0.25 }, { type: 'cleanse', categories: ['dot'] }], target: 'self' },
            'Ashen Communion': { description: 'Ash falls on every enemy: 8–12 radiant dmg each, and you heal for half of it.', liveDescription: 'Ash falls around you (160 px): 8–12 radiant dmg to every enemy, and you heal for half the damage dealt. 16 s cooldown.', cost: 3, cooldown: 16, resource: 'any', base_damage: [8, 12], effects: [{ type: 'heal_from_damage', ratio: 0.5 }], target: 'all_enemies', damage_type: 'radiant' },
            'The Coal Carried Down': { description: 'Carry the coal down, as Caelith once did: take 50% less damage for 3 turns, heal 40% of your max HP, and shed every DoT and debuff.', liveDescription: 'Carry the coal down: take 50% less damage for 10 s, heal 40% of your max HP, and shed every DoT and debuff. Once per fight.', cost: 'all', resource: 'any', oncePerFight: true, effects: [{ type: 'damage_reduction', value: 0.5, duration: 3 }, { type: 'heal_percent', value: 0.4 }, { type: 'cleanse', categories: ['dot', 'debuff'] }], target: 'self' },
            // The Wide Wings (flight)
            'Wingstep': { description: 'Lift off the ground: for 2 turns, every attack on you has a 40% chance to miss.', liveDescription: 'Lift off the ground: for 6 s, every attack on you has a 40% chance to miss. 14 s cooldown. Free: the statue’s gift.', cost: 0, cooldown: 14, resource: 'any', effects: [{ type: 'dodge_chance', value: 0.4, duration: 2, persistent: true }], target: 'self' },
            'Gale of Pinions': { description: 'One beat of the wide wings: 6–9 radiant dmg to every enemy and slow them by 50% for 2 turns.', liveDescription: 'One beat of the wide wings (160 px): 6–9 radiant dmg to every enemy, slowed by 50% for 6 s. 12 s cooldown.', cost: 2, cooldown: 12, resource: 'any', base_damage: [6, 9], effects: [{ type: 'slow', value: 0.5, duration: 2 }], target: 'all_enemies', damage_type: 'radiant' },
            'Judgement from Above': { description: 'Rise and strike down: 12–16 radiant dmg to every enemy, each [Exposed] (+15% dmg taken) for 2 turns.', liveDescription: 'Rise and strike down (160 px): 12–16 radiant dmg to every enemy, each [Exposed] (+15% dmg taken) for 6 s. 20 s cooldown.', cost: 3, cooldown: 20, resource: 'any', base_damage: [12, 16], effects: [{ type: 'apply_mark', mark: 'Expose', value: 0.15, duration: 2 }], target: 'all_enemies', damage_type: 'radiant' },
            
            // Fenrir's Heir (Tokelo 2026-11-13, docs/design/FENRIRS_HEIR.md): Chapter Two's legendary class. `stance` = the
            // wolf you must stand in to use it (src/engine/stance.js); no stance = Fenrir's own, usable in every stance.
            // Paid from your own class resource ('any'). Thorne picked the roster from the design's candidates; Gauge's first numbers.
            // Sköll, the Sun Chaser: fire and offense
            'Solar Fang': { description: 'A wolf\'s head of sunfire lunges at one enemy: 20–26 fire dmg. Sköll only.', liveDescription: 'A wolf\'s head of sunfire leaps at one enemy: 20–26 fire dmg. 3 s cooldown. Sköll stance. Free: Fenrir\'s gift.', cost: 0, cooldown: 3, resource: 'any', stance: 'skoll', base_damage: [20, 26], target: 'enemy_single', damage_type: 'fire' },
            'Firehowl': { description: 'Sköll howls through you: +25% damage for 3 turns. Sköll only.', liveDescription: 'Sköll howls through you: +25% damage for 9 s. 20 s cooldown. Sköll stance.', cost: 1, cooldown: 20, resource: 'any', stance: 'skoll', effects: [{ type: 'self_buff', name: 'Firehowl', status_type: 'damage_boost', value: 0.25, duration: 3 }], target: 'self' },
            'Sunfang Rush': { description: 'Run with the burning wolf: 14–20 fire dmg to every enemy in your path. Sköll only.', liveDescription: 'Dash ahead as a burning wolf, then rake everything in front of you: 14–20 fire dmg each. 10 s cooldown. Sköll stance.', cost: 2, cooldown: 10, resource: 'any', stance: 'skoll', base_damage: [14, 20], target: 'enemy_aoe', damage_type: 'fire' },
            'Firestorm': { description: 'The sun falls in sparks: 8–12 fire dmg to every enemy and Burn (3 dmg/turn) for 2 turns. Sköll only.', liveDescription: 'Call a storm of sunfire where you aim (44 px): 8–12 fire dmg to every enemy in it, burning for 3 a pulse for 6 s. 14 s cooldown. Sköll stance.', cost: 3, cooldown: 14, resource: 'any', stance: 'skoll', base_damage: [8, 12], effects: [{ type: 'dot', dot_type: 'burn', value: 3, duration: 2 }], target: 'enemy_aoe', damage_type: 'fire' },
            'Devour the Sun': { description: 'Sköll swallows the sun through you: 36–46 fire dmg to one enemy, doubled under 30% HP, and Burn for 3 turns. Sköll only.', liveDescription: 'Sköll swallows the sun through you: 36–46 fire dmg to one enemy, doubled against one under 30% HP, then Burn for 9 s. Once per fight. Sköll stance.', cost: 'all', resource: 'any', oncePerFight: true, stance: 'skoll', base_damage: [36, 46], effects: [{ type: 'execute_bonus', threshold: 0.3, value: 1 }, { type: 'dot', dot_type: 'burn', value: 4, duration: 3 }], target: 'enemy_single', damage_type: 'fire' },
            // Hati, the Moon Chaser: consuming darkness, speed and defence
            'Black Maw': { description: 'Darkness opens and drags: 9–13 shadow dmg to every enemy and slow them 50% for 2 turns. Hati only.', liveDescription: 'Darkness opens around you (64 px) and drags enemies in: 9–13 shadow dmg each, slowed 50% for 6 s. 8 s cooldown. Hati stance. Free: Fenrir\'s gift.', cost: 0, cooldown: 8, resource: 'any', stance: 'hati', base_damage: [9, 13], effects: [{ type: 'slow', value: 0.5, duration: 2 }], target: 'enemy_aoe', damage_type: 'shadow' },
            'Darkhowl': { description: 'Hati\'s howl swallows the light: every enemy misses 30% of attacks for 2 turns. Hati only.', liveDescription: 'Hati\'s howl swallows the light around you (96 px): enemies miss 30% of their attacks for 6 s. 18 s cooldown. Hati stance.', cost: 1, cooldown: 18, resource: 'any', stance: 'hati', effects: [{ type: 'blind', value: 0.3, duration: 2, seconds: 6 }], target: 'enemy_aoe' },
            'Moonless Grasp': { description: 'Jaws of shadow close on one enemy: 10–14 shadow dmg and stun it for 1 turn. Hati only.', liveDescription: 'Jaws of shadow close on one enemy: 10–14 shadow dmg, stunned for 3 s (bosses resist repeats). 12 s cooldown. Hati stance.', cost: 2, cooldown: 12, resource: 'any', stance: 'hati', base_damage: [10, 14], effects: [{ type: 'stun', duration: 1 }], target: 'enemy_single', damage_type: 'shadow' },
            'Night\'s Dominion': { description: 'The dark feeds on them: 10–14 shadow dmg to every enemy, and you heal for 30% of it. Hati only.', liveDescription: 'The dark around you (80 px) feeds: 10–14 shadow dmg to every enemy, and you heal for 30% of the damage. 16 s cooldown. Hati stance.', cost: 3, cooldown: 16, resource: 'any', stance: 'hati', base_damage: [10, 14], effects: [{ type: 'heal_from_damage', ratio: 0.3 }], target: 'enemy_aoe', damage_type: 'shadow' },
            'Devour the Moon': { description: 'Hati swallows the moon and everything near it: 22–30 true dmg to every enemy and stun them for 1 turn. Hati only.', liveDescription: 'Hati swallows the moon (120 px): every enemy is dragged in, takes 22–30 true dmg and is stunned for 3 s. Once per fight. Hati stance.', cost: 'all', resource: 'any', oncePerFight: true, stance: 'hati', base_damage: [22, 30], effects: [{ type: 'true_damage' }, { type: 'stun', duration: 1 }], target: 'enemy_aoe', damage_type: 'shadow' },
            // Fenrir: shared, in every stance (the neutral Fenrir stance uses only these)
            'Call of the Pack': { description: 'Two spectral wolves run beside you for 5 turns.', liveDescription: 'Two spectral wolves run beside you for 15 s (20 HP each). Each bites for 3–5 about once a second, and enemies may go for them instead of you. 24 s cooldown. Free: Fenrir\'s gift.', cost: 0, cooldown: 24, resource: 'any', effects: [{ type: 'shadow_summon', summon_type: 'spectral_wolf', count: 2 }], target: 'self' },
            'Gleipnir\'s Bane': { description: 'Break the chain: shed every stun, slow and debuff, and the next hit on you is absorbed.', liveDescription: 'Break the chain: shed every stun, slow and debuff, and absorb the next hit (12 s). 18 s cooldown.', cost: 1, cooldown: 18, resource: 'any', effects: [{ type: 'cleanse', categories: ['control', 'debuff'] }, { type: 'absorb_hit', duration: 2, say: 'breaks the chain, and the broken links hang round you like armour.' }], target: 'self' },
            'Twin Eclipse': { description: 'Sun and moon go dark at once: 14–20 dmg to every enemy, each [Exposed] (+15% dmg taken) for 2 turns.', liveDescription: 'Sun and moon go dark at once around you (100 px): 14–20 dmg to every enemy, each [Exposed] (+15% dmg taken) for 6 s. 20 s cooldown. Any stance.', cost: 3, cooldown: 20, resource: 'any', base_damage: [14, 20], effects: [{ type: 'apply_mark', mark: 'Expose', value: 0.15, duration: 2 }], target: 'enemy_aoe', damage_type: 'shadow' },

            'Eternal Lich Unmake': { description: 'Eternal Lich erases one non-boss enemy from this fight.', cost: 5, resource: 'Soul Energy', oncePerFight: true, effects: [{ type: 'eternal_lich_unmake' }], target: 'enemy_single', damage_type: 'true' },

            // Hollow King Skills
            'Unmake': { description: 'Remove a target from the fight permanently.', cost: 5, resource: 'Hollow Will', effects: [{ type: 'remove_from_fight_permanent' }], target: 'enemy_single', damage_type: 'true' },
            'Echo of Nothing': { description: 'Skip the enemy’s next 2 turns.', liveDescription: 'Stun the enemy for 6 s.', cost: 3, resource: 'Hollow Will', effects: [{ type: 'skip_turn', duration: 2 }], target: 'enemy_single' },
            'Void Rend': { description: 'A basic strike that generates 3 Hollow Will (or 10 on a critical hit).', cost: 0, resource: 'Hollow Will', base_damage: [6, 8], effects: [{ type: 'gain_resource_on_hit', value: 3, critValue: 10 }], target: 'enemy_single', damage_type: 'physical' },
            'Oblivion’s Call': { description: 'Erase the entire enemy team for 1 turn; they cannot act or be targeted.', liveDescription: 'Erase the entire enemy team for 3 s; they cannot act or be targeted.', cost: 'all', resource: 'Hollow Will', oncePerFight: true, effects: [{ type: 'erase_enemies', duration: 1 }], target: 'all_enemies' },
            
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
                levelGrowth: { hp: 12, strength: 0.5, agility: 0.5, def: 1, resource: 1 },   // per level; a rate under 1 lands as whole points (0.5 = every other level). Gauge 2026-11-01
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
                levelGrowth: { hp: 6, intelligence: 2, agility: 0.5, def: 0.5, critChance: 0.01, resource: 3 },   // per level; a rate under 1 lands as whole points (0.5 = every other level). Gauge 2026-11-01
                startingSkills: ['Arcane Bolt', 'Focus', 'Mana Burst'],
                startingTraits: []
            },
            'rogue': {
                name: 'Rogue',
                description: "A shinobi: shuriken, a shadow clone and a body that is never quite where the blow lands.",
                lore: {
                    base: "Your enemy won’t see the blade until it’s too late.",
                    role: "Evasive skirmisher who survives by not being hit (Tokelo 2026-11-02: the ninja rework).",
                    identity: "Jutsu, shadow, speed."
                },
                startingItems: ['short sword', 'lockpicks', 'old key'],
                startingResource: { type: 'Energy', initial: 6, max: 15, regen: 3 },
                baseStats: { hp: 85, strength: 8, intelligence: 6, agility: 10, def: 3, critChance: 0.2, critMultiplier: 2.0, baseDamageMin: 5, baseDamageMax: 9 },
                levelGrowth: { hp: 8, strength: 0.5, agility: 2, def: 1, critChance: 0.02, resource: 2 },   // per level; a rate under 1 lands as whole points (0.5 = every other level). Gauge 2026-11-01
                startingSkills: ['Shuriken Volley', 'Quick Slash', 'Evasion', 'Shadow Clone'],
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
                levelGrowth: { hp: 8, intelligence: 2, agility: 0.5, def: 1, resource: 2 },   // per level; a rate under 1 lands as whole points (0.5 = every other level). Gauge 2026-11-01
                startingSkills: ['Grave Bolt', 'Raise Skeleton', 'Soul Leech', 'Channel the Grave'],
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
                            { level: 5, name: 'Ossified Champion', trait: 'Minions gain +20% HP', traitEffect: 'Your summoned minions are tougher, granting them increased durability.', skill: 'Bone Cage', upgrade: 'Skeletons now deal 6–9 dmg/turn.', lore: "Your summons no longer creak like rotted wood — they march with the weight of stone." },
                            { level: 8, name: 'Gravekeeper', trait: 'Bone Fortress', traitEffect: '+1% dmg reduction per minion (max 15%).', skill: 'Raise Ghoul', lore: "You no longer wait for death to find your army — you harvest it." },
                            { level: 11, name: 'Death Knight', trait: 'Summons deal +25% dmg', traitEffect: 'Your summoned creatures strike with terrifying force.', skill: 'Reaper’s Charge', upgrade: 'All summons gain +25% dmg.', lore: "You ride at the head of your host, steel and shadow made one." },
                            { level: 14, name: 'Black Pharaoh', trait: '+3 max minions; all summons gain AOE attacks', traitEffect: 'Your legion grows vast, each servant capable of sweeping strikes.', skill: 'March of Endless Bones', ascended: true, lore: "Your throne is a tomb. Your crown, the dust of empires." }
                        ]
                    },
                    'plaguecaller': {
                        name: 'Plaguecaller',
                        theme: 'Disease, rot, and battlefield-wide decay.',
                        mechanic: 'Infection Stacks — Infection stacks up on one enemy and ticks faster the higher it climbs; Plague Burst cashes it in.',
                        resourceEvolution: [],
                        stages: [
                            { level: 3, name: 'Plaguecaller', trait: 'Virulent Touch', traitEffect: 'All basic attacks apply 1 stack of [Infected].', skill: 'Contagion', lore: "Your touch sours flesh; your breath curdles the air." },
                            { level: 5, name: 'Pestilent Sage', trait: 'DoTs last +1 turn', traitEffect: 'Your applied blights linger longer, ensuring a slow, agonizing demise.', skill: 'Black Spit', upgrade: 'DoTs last 1 extra turn.', lore: "Every sickness is a verse in your scripture." },
                            { level: 8, name: 'Rotbringer', trait: 'Plague Reservoir', traitEffect: 'Every 6th tick of your Infection refunds 1 Soul Energy, and killing an infected enemy refunds 1.', skill: 'Plague Burst', lore: "The dead are not still. They swell, they split — and they serve you." },
                            { level: 11, name: 'Harbinger of Decay', trait: 'All infections deal +2 dmg/turn', traitEffect: 'Your infections become deadlier, gnawing faster at your foes.', skill: 'Withering Curse', upgrade: 'All infections deal +2 dmg/turn.', lore: "Your shadow carries plague like wind carries rain." },
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
                base: { name: 'Rogue', description: 'Shinobi: evasive skirmisher, jutsu and shadow.' },
                branches: {
                    // Ninja rework (Tokelo 2026-11-02, docs/design/ROGUE_NINJA_KIT.md): every path runs on Energy (no branch pool).
                    'assassin': {
                        name: 'Assassin',
                        theme: 'Shadow arts: creatures called out of your own shadow, and a body that is never where the blow lands.',
                        mechanic: 'Energy. Shadow creatures fight and draw attacks for a few seconds; every attack you evade feeds you Energy.',
                        resourceEvolution: [],
                        stages: [
                            { level: 3, name: 'Assassin', trait: 'Shadow Veil', traitEffect: 'Evasion makes attacks miss 65% of the time instead of 50%, and every attack you evade (Evasion, or an enemy blinded by your smoke) gives you +1 Energy.', skill: 'Shadow Hounds', lore: "Your shadow stops following you. It starts hunting for you." },
                            { level: 5, name: 'Shadowblade', trait: 'Umbral Edge', traitEffect: 'Your critical hits deal +25% damage.', skill: 'Shadowstep', lore: "You step into your own shadow and out of someone else's." },
                            { level: 8, name: 'Phantom', trait: 'Long Shadows', traitEffect: 'Your shadow clone and shadow creatures last 5 s longer (1 turn in turn fights).', skill: 'Shadow Serpent', lore: "The dark under their feet has teeth now." },
                            { level: 11, name: 'Death’s Whisper', trait: 'Death’s Whisper', traitEffect: 'Your critical hits deal a further +50% damage.', skill: 'Assassinate', lore: "One cut, placed where it ends things." },
                            { level: 14, name: 'Sovereign of Shades', trait: 'Born of Shadow', traitEffect: 'Every fight starts with Evasion already on you.', skill: 'Shade Legion', ascended: true, lore: "Every shadow on the field answers to you." }
                        ]
                    },
                    'duelist': {
                        name: 'Duelist',
                        theme: 'The ronin who took up ninjutsu: draw-cuts, a focused blade and cuts that come faster than the eye.',
                        mechanic: 'Energy. Your weapon hits can cut again at once (Follow-Up Cut); Blade Focus turns damage and speed up.',
                        resourceEvolution: [],
                        stages: [
                            { level: 3, name: 'Ronin', trait: 'Follow-Up Cut', traitEffect: '25% of your weapon hits cut again at once for 2–3 dmg (plus Agility) that ignores armour.', skill: 'Iaido Draw', lore: "No master, no banner. Only the draw." },
                            { level: 5, name: 'Wandering Blade', trait: 'Keen Edge', traitEffect: '+10% critical chance.', skill: 'Blade Focus', lore: "The road taught you to breathe before you cut." },
                            { level: 8, name: 'Blade Dancer', trait: 'Steel Rhythm', traitEffect: 'Follow-Up Cut triggers on 40% of your weapon hits.', skill: 'Riposte', lore: "Their blow is the first beat. Yours is the second and the third." },
                            { level: 11, name: 'Crimson Vortex', trait: 'Crimson Edge', traitEffect: 'Your critical hits make the target Bleed: 2 dmg/s for 6 s, stacks to 3.', skill: 'Thousand Cuts', lore: "Six cuts and the sheath has not stopped ringing." },
                            { level: 14, name: 'Masterless Storm', trait: 'Masterless', traitEffect: '+15% damage on everything you do.', skill: 'Blade Storm', ascended: true, lore: "You serve no lord, and no lord's army can stand in your circle." }
                        ]
                    },
                    'saboteur': {
                        name: 'Saboteur',
                        theme: 'A ninja who went mad with explosives and chemistry: bombs, flasks and charges that wait under the enemy\'s feet.',
                        mechanic: 'Energy. Thrown bombs burst where they land, spiked charges blow up under whoever steps on them, flasks poison.',
                        resourceEvolution: [],
                        stages: [
                            { level: 3, name: 'Saboteur', trait: 'Shrapnel', traitEffect: 'Your explosions make every enemy they hit Bleed: 2 dmg/s for 6 s, stacks to 3.', skill: 'Fire Bomb', lore: "Black powder, iron filings and a very short fuse." },
                            { level: 5, name: 'Mad Chemist', trait: 'Volatile Mix', traitEffect: 'Your explosions deal +25% damage.', skill: 'Explosive Caltrops', lore: "Every caltrop is a little bomb. Every bomb is a little bigger than the last." },
                            { level: 8, name: 'Smoke Phantom', trait: 'Toxic Smoke', traitEffect: 'Smoke Bomb also poisons everyone it blinds: 3 dmg/s for 6 s.', skill: 'Poison Flask', lore: "Your smoke stings now. It is meant to." },
                            { level: 11, name: 'Shadow Engineer', trait: 'Chain Reaction', traitEffect: 'Explosive Caltrops scatters 5 charges instead of 3.', skill: 'Thunder Charge', lore: "Clockwork, thunder-salt and patience." },
                            { level: 14, name: 'Grand Pyrotechnist', trait: 'Alchemist’s Blood', traitEffect: 'Your Poison and Bleed deal 50% more damage.', skill: 'Cataclysm Barrage', ascended: true, lore: "You stopped counting the bombs in your satchel. So did your enemies." }
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

        // --- Skill Webs (Tokelo 2026-11-02): each class has its own web; gateways cross between them ---
        // Spec: docs/design/SKILL_WEB.md. The engine builds the webs (src/engine/skill-web.js) from:
        //   - each class above: its own web, with a heart node and one node per starting skill (owned free by that class);
        //   - each evolution branch: one active node per new skill and one passive node per trait, stage by stage,
        //     gated by the stage's level (and story event). Ids: '<branch>.<stage 1-5>.skill' / '.trait'.
        //   - the extra nodes and gateways below. A new skill is one more entry in extraNodes; nothing else changes.
        // `npm run web` prints and validates the webs.
        const skillWeb = {
            rules: {
                pointsPerLevel: 1,          // Gauge: one point per level keeps a one-path player on the old evolution schedule exactly
                cost: { heart: 1, active: 1, passive: 1, gateway: 2 },   // a node's own `cost` wins; a gateway is the price of crossing
                refund: true                // unlearning a node out of a fight refunds its points (respec is free for now)
            },
            // Existing skills no path granted. `links` are the node ids they hang from (in the same class web).
            extraNodes: [
                { id: 'warrior.war_cry', kind: 'active', region: 'warrior', skill: 'War Cry', minLevel: 2, links: ['warrior.guard'] },
                { id: 'rogue.smoke_bomb', kind: 'active', region: 'rogue', skill: 'Smoke Bomb', minLevel: 2, links: ['rogue.evasion'] },   // replaced Second Wind (Tokelo 2026-11-02)
                { id: 'elementalist.ice_lance', kind: 'active', region: 'mage', branch: 'elementalist', skill: 'Ice Lance', minLevel: 5, links: ['elementalist.1.trait'] },
                { id: 'bone_warden.shield_of_the_dead', kind: 'active', region: 'necromancer', branch: 'bone_warden', skill: 'Shield of the Dead', minLevel: 5, links: ['bone_warden.1.trait'] },
                { id: 'plaguecaller.corpse_bloom', kind: 'active', region: 'necromancer', branch: 'plaguecaller', skill: 'Corpse Bloom', minLevel: 5, links: ['plaguecaller.1.trait'] },
                { id: 'plaguecaller.plague_wind', kind: 'active', region: 'necromancer', branch: 'plaguecaller', skill: 'Plague Wind', minLevel: 11, links: ['plaguecaller.corpse_bloom'] }
            ],
            // Gateways (Tokelo 2026-11-02): nodes at the edge of a class web that open a path into another class's web.
            // A gateway hangs from `from` (in its own web) and leads to `to` (in the other web). One way only: each class
            // has its own three gateways out. Once inside, the other web's nodes link as usual (its heart opens its base skills).
            gateways: [
                // Warrior
                { id: 'gate.spellblade', from: 'vanguard.3.skill', to: 'elementalist.3.skill', name: 'Spellblade', why: 'Holy Smite to Lightning Arc' },
                { id: 'gate.blade_frenzy', from: 'berserker.2.skill', to: 'duelist.2.skill', name: 'Blade Frenzy', why: 'Whirlwind to Blade Focus' },
                { id: 'gate.the_hunt', from: 'warden.1.skill', to: 'assassin.3.skill', name: 'The Hunt', why: 'Pincushion to Shadow Serpent' },
                // Rogue
                { id: 'gate.misdirection', from: 'assassin.2.skill', to: 'illusionist.1.skill', name: 'Misdirection', why: 'Shadowstep to Mirror Image' },
                { id: 'gate.venom', from: 'saboteur.3.skill', to: 'plaguecaller.2.skill', name: 'Venom', why: 'Poison Flask to Black Spit' },
                { id: 'gate.owning_the_ground', from: 'saboteur.2.skill', to: 'warden.2.skill', name: 'Owning the Ground', why: 'Explosive Caltrops to Lockstep' },
                // Mage
                { id: 'gate.tempo', from: 'chronomancer.1.skill', to: 'duelist.1.skill', name: 'Tempo', why: 'Haste to Iaido Draw' },
                { id: 'gate.burn_and_blight', from: 'elementalist.2.trait', to: 'plaguecaller.2.trait', name: 'Burn and Blight', why: 'Burn to longer DoTs' },
                { id: 'gate.stolen_mind', from: 'illusionist.2.skill', to: 'soulbinder.3.skill', name: 'The Stolen Mind', why: 'Confuse to Possession' },
                // Necromancer
                { id: 'gate.two_walls', from: 'bone_warden.1.skill', to: 'vanguard.1.skill', name: 'The Two Walls', why: 'Bone Wall to Shield Bash' },
                { id: 'gate.open_wounds', from: 'plaguecaller.1.skill', to: 'berserker.1.skill', name: 'Open Wounds', why: 'Contagion to Hemorrhage' },
                { id: 'gate.life_bent_back', from: 'soulbinder.4.skill', to: 'chronomancer.3.skill', name: 'Life Bent Back', why: 'Soul Feast to Revert HP' }
            ],
            // Legendary webs (Tokelo 2026-11-02): a legendary class is its own web, added on top of your build. Its heart
            // opens once every listed evolution stage is reached ('<branch>.<stage 1-5>', any class) and its story event has
            // happened. Names and lore: legendaryAndSecretClasses. The Hollow King stays a full transformation (no web).
            legendaryWebs: {
                deathlord_eternal: {
                    requires: { stages: ['soulbinder.5', 'vanguard.5'], event: 'the Throne of Bones' },   // Eternal Lich + Abyssal King
                    nodes: [
                        { id: 'deathlord_eternal.legion', kind: 'passive', trait: { name: 'Legion of the Dead', effect: 'Unlimited minion cap for 5 turns.' }, links: ['heart.deathlord_eternal'] },
                        { id: 'deathlord_eternal.deaths_dominion', kind: 'active', skill: 'Death’s Dominion', links: ['deathlord_eternal.legion'] }
                    ]
                },
                // Fallen Seraphim (Tokelo 2026-11-04): no evolution needed. Stare at the robed statue in the Kloster's inner
                // courtyard for 2 minutes (gazeRules): it wakes, speaks, and opens this web. Full design (Tokelo: "design the
                // lore, attacks and skill tree"): docs/design/FALLEN_SERAPHIM.md. Three paths, one per pair of wings, six nodes
                // each with a capstone at 14; Seraph Unbound at 18 needs all three capstones (`needs`). `ranks` are the web's
                // evolutions: a title by nodes owned (the heart counts), each one a flag the statue answers to, and `points`
                // a free Skill Web point the first time it is reached ("it gets lighter the more of it you give away").
                fallen_seraphim: {
                    requires: { stages: [], flag: 'seraph_awakened', event: 'the statue in the Kloster courtyard wakes' },
                    ranks: [
                        { name: 'Fallen', at: 1 },
                        { name: 'Watcher', at: 7, points: 1, flag: 'seraph_rank_watcher', say: 'Six places between your shoulders ache. The statue in the Kloster would know why.' },
                        { name: 'Ashen Seraph', at: 14, points: 1, flag: 'seraph_rank_ashen', say: 'Ash falls when you walk now, and nothing it touches is cold. Go back to the courtyard.' },
                        { name: 'Seraph Unbound', node: 'fallen_seraphim.unbound', flag: 'seraph_rank_unbound', say: 'All six wings open at once. Somewhere far above, an altar fire gutters.' },
                        // Tokelo (2026-11-04): every skill learned gives the six wings, red eyes and a holy weapon of your choosing.
                        { name: 'The Six-Winged', all: true, flag: 'seraph_rank_six', say: 'Every feather is yours now. Six wings stand at your back, and your eyes burn red. Caelith is waiting with a gift.' }
                    ],
                    // How it shows on your character (ui/gaze-fx.js, drawn by code): 'heart' = once the web opens, 'all' = every node owned.
                    look: { halo: 'heart', wings: 'all', redEyes: 'all' },
                    // Tokelo (2026-11-04): "it's legendary ... at unlock at least 60 to 70% of a peak-level evolved class". The
                    // statue's gift: the heart's trait and one skill from each pair of wings, owned free (no point, no level gate,
                    // never unlearned), so the class pays off the moment it wakes. Gauge measured it: qa/scripts/legendary_power.js.
                    heartTraits: [{ name: 'Fallen Grace', effect: 'The statue\'s light in you: +35% damage, take 35% less damage.', mods: { damageDealt: 0.35, damageTaken: -0.35 } }],
                    gifts: ['fallen_seraphim.judgement', 'fallen_seraphim.halo_of_ash', 'fallen_seraphim.wingstep'],
                    // Tokelo (2026-11-04): the second half is earned. Nodes marked `trial` (level 10 and up: the late passives, the
                    // capstones, Seraph Unbound, so the wings too) stay sealed until you win the Trial of the Live Coal (quest QS1).
                    trial: { flag: 'seraph_trial_won', name: 'the Trial of the Live Coal' },
                    nodes: [
                        // The Veiled Face: judgement. Two wings over the eyes, so as not to see what it judged.
                        { id: 'fallen_seraphim.judgement', kind: 'active', skill: 'Fallen Judgement', minLevel: 3, links: ['heart.fallen_seraphim'] },
                        { id: 'fallen_seraphim.grace', kind: 'passive', minLevel: 5, links: ['fallen_seraphim.judgement'],
                            trait: { name: 'Grace of the Fallen', effect: '+20% damage against Undead and Void.', mods: { damageVsFlags: { undead: 0.2, void: 0.2 } } } },
                        { id: 'fallen_seraphim.brand', kind: 'active', skill: 'Brand of the Watcher', minLevel: 6, links: ['fallen_seraphim.judgement'] },
                        { id: 'fallen_seraphim.rain_of_feathers', kind: 'active', skill: 'Rain of Feathers', minLevel: 9, links: ['fallen_seraphim.brand'] },
                        { id: 'fallen_seraphim.burning_grace', trial: true, kind: 'passive', minLevel: 11, links: ['fallen_seraphim.rain_of_feathers', 'fallen_seraphim.grace'],
                            trait: { name: 'Burning Grace', effect: 'The further you fall, the brighter you burn: +25% damage while under half HP.', mods: { lowHpDamage: { below: 0.5, value: 0.25 } } } },
                        { id: 'fallen_seraphim.verdict', trial: true, kind: 'active', skill: 'Verdict of Ash', minLevel: 14, links: ['fallen_seraphim.burning_grace'] },
                        // The Covered Feet: mercy. Two wings over the feet, over the ground it would not give up.
                        { id: 'fallen_seraphim.halo_of_ash', kind: 'active', skill: 'Halo of Ash', links: ['heart.fallen_seraphim'] },
                        { id: 'fallen_seraphim.feather_ward', kind: 'active', skill: 'Feather Ward', minLevel: 4, links: ['fallen_seraphim.halo_of_ash'] },
                        { id: 'fallen_seraphim.mercy', kind: 'active', skill: 'Mercy of the Fallen', minLevel: 7, links: ['fallen_seraphim.feather_ward'] },
                        { id: 'fallen_seraphim.what_is_evil', trial: true, kind: 'passive', minLevel: 10, links: ['fallen_seraphim.mercy', 'fallen_seraphim.wings_of_sorrow', 'fallen_seraphim.grace'],
                            trait: { name: 'What Is Evil?', effect: 'Neither saint nor sinner: take 10% less damage from everything.', mods: { damageTaken: -0.1 } } },
                        { id: 'fallen_seraphim.communion', trial: true, kind: 'active', skill: 'Ashen Communion', minLevel: 12, links: ['fallen_seraphim.what_is_evil'] },
                        { id: 'fallen_seraphim.door', trial: true, kind: 'active', skill: 'The Coal Carried Down', minLevel: 14, links: ['fallen_seraphim.communion'] },
                        // The Wide Wings: flight. The two it flew with, and fell with.
                        { id: 'fallen_seraphim.wingstep', kind: 'active', skill: 'Wingstep', minLevel: 2, links: ['heart.fallen_seraphim'] },
                        { id: 'fallen_seraphim.gale', kind: 'active', skill: 'Gale of Pinions', minLevel: 5, links: ['fallen_seraphim.wingstep'] },
                        { id: 'fallen_seraphim.wings_of_sorrow', kind: 'active', skill: 'Wings of Sorrow', minLevel: 8, links: ['fallen_seraphim.gale', 'fallen_seraphim.halo_of_ash'] },
                        { id: 'fallen_seraphim.weightless', trial: true, kind: 'passive', minLevel: 11, links: ['fallen_seraphim.wings_of_sorrow'],
                            trait: { name: 'Weightless', effect: 'Nothing holds you down any more: +10% damage with everything.', mods: { damageDealt: 0.1 } } },
                        { id: 'fallen_seraphim.from_above', trial: true, kind: 'active', skill: 'Judgement from Above', minLevel: 12, links: ['fallen_seraphim.weightless'] },
                        { id: 'fallen_seraphim.descent', trial: true, kind: 'active', skill: 'Six-Winged Descent', minLevel: 14, links: ['fallen_seraphim.from_above'] },
                        // All six wings.
                        { id: 'fallen_seraphim.unbound', trial: true, kind: 'passive', minLevel: 18, needs: ['fallen_seraphim.verdict', 'fallen_seraphim.door', 'fallen_seraphim.descent'],
                            links: ['fallen_seraphim.verdict', 'fallen_seraphim.door', 'fallen_seraphim.descent'],
                            trait: { name: 'Seraph Unbound', effect: 'All six wings open: +15% damage and 10% less damage taken.', mods: { damageDealt: 0.15, damageTaken: -0.1 } } }
                    ]
                },
                // Fenrir's Heir (Tokelo 2026-11-13, PR #256): Chapter Two's legendary class, replacing Allfather's Chosen. It opens
                // at the end of the Hunt of Sun and Moon (Gullstrand Coast, the Wolf's Wake). Three stances: Sköll (sun, fire,
                // offense), Hati (moon, consuming dark, speed and defence) and the neutral Fenrir stance (Tokelo 2026-11-13:
                // neither wolf). Spec and numbers: docs/design/FENRIRS_HEIR.md; rules: src/engine/stance.js.
                fenrirs_heir: {
                    requires: { stages: [], flag: 'fenrir_heir_awakened', event: 'the wolves wake at the Wolf\'s Wake' },
                    ranks: [
                        { name: 'Heir of the Wolf', at: 1 },
                        { name: 'Sun-and-Moon Hunter', at: 8, points: 1, flag: 'fenrir_rank_hunter', say: 'Two shadows run beside yours now, one warm and one cold.' },
                        { name: 'Fenrir Unbound', node: 'fenrirs_heir.unbound', flag: 'fenrir_rank_unbound', say: 'The last link of Gleipnir breaks. Far away, something enormous lifts its head and howls with you.' }
                    ],
                    // Gauge: Fenrir's Blood is a little under Fallen Grace (35%) because the bond adds up to +20% damage (Sköll) or +12%
                    // speed and defence (Hati) on top. Measured with qa/scripts/legendary_power.js --fenrir (docs/design/FENRIRS_HEIR.md).
                    heartTraits: [{ name: 'Fenrir\'s Blood', effect: 'The wolf\'s inheritance: +30% damage, take 30% less damage.', mods: { damageDealt: 0.3, damageTaken: -0.3 } }],
                    gifts: ['fenrirs_heir.solar_fang', 'fenrirs_heir.black_maw', 'fenrirs_heir.call_of_the_pack'],
                    // The stances (src/engine/stance.js). Bond 0-100 per wolf: +25 per 15 s of fighting in that wolf's stance
                    // (100 after 60 s); the other wolf fades 0.5 a second while it grows, so loyalty pays and both can't sit
                    // at 100. The Fenrir stance grows and fades neither. Bond persists between fights and in the save.
                    stances: {
                        first: 'skoll',
                        switchCooldownSeconds: 8, switchCooldownTurns: 3,
                        bond: { max: 100, gainPerSecond: 25 / 15, fadePerSecond: 0.5 },
                        list: {
                            fenrir: { name: 'Fenrir', title: 'the Bound Wolf', bond: false, say: 'You hold both wolves at heel. Neither runs; neither fades.' },
                            skoll: { name: 'Sköll', title: 'the Sun Chaser', bond: true, say: 'Sköll runs ahead of you, trailing sunfire.',
                                tiers: [{ at: 25, mods: { damage: 0.05 }, text: '+5% damage.' }, { at: 50, mods: { damage: 0.1 }, text: '+10% damage.' },
                                    { at: 75, mods: { damage: 0.15 }, text: '+15% damage.' }, { at: 100, mods: { damage: 0.2 }, text: '+20% damage.' }] },
                            hati: { name: 'Hati', title: 'the Moon Chaser', bond: true, say: 'Hati closes round you like a moonless night.',
                                tiers: [{ at: 25, mods: { speed: 0.03, defence: 0.03 }, text: '+3% speed, 3% less damage taken.' },
                                    { at: 50, mods: { speed: 0.06, defence: 0.06 }, text: '+6% speed, 6% less damage taken.' },
                                    { at: 75, mods: { speed: 0.09, defence: 0.09 }, text: '+9% speed, 9% less damage taken.' },
                                    { at: 100, mods: { speed: 0.12, defence: 0.12 }, text: '+12% speed, 12% less damage taken.' }] }
                        }
                    },
                    nodes: [
                        // Sköll, the Sun Chaser
                        { id: 'fenrirs_heir.solar_fang', kind: 'active', skill: 'Solar Fang', links: ['heart.fenrirs_heir'] },
                        { id: 'fenrirs_heir.firehowl', kind: 'active', skill: 'Firehowl', minLevel: 4, links: ['fenrirs_heir.solar_fang'] },
                        { id: 'fenrirs_heir.sunfang_rush', kind: 'active', skill: 'Sunfang Rush', minLevel: 6, links: ['fenrirs_heir.firehowl'] },
                        { id: 'fenrirs_heir.firestorm', kind: 'active', skill: 'Firestorm', minLevel: 9, links: ['fenrirs_heir.sunfang_rush'] },
                        { id: 'fenrirs_heir.ember_blood', kind: 'passive', minLevel: 11, links: ['fenrirs_heir.firestorm'],
                            trait: { name: 'Ember Blood', effect: 'The sun runs hot in you: +10% damage.', mods: { damageDealt: 0.1 } } },
                        { id: 'fenrirs_heir.devour_the_sun', kind: 'active', skill: 'Devour the Sun', minLevel: 14, links: ['fenrirs_heir.ember_blood'] },
                        // Hati, the Moon Chaser
                        { id: 'fenrirs_heir.black_maw', kind: 'active', skill: 'Black Maw', links: ['heart.fenrirs_heir'] },
                        { id: 'fenrirs_heir.darkhowl', kind: 'active', skill: 'Darkhowl', minLevel: 4, links: ['fenrirs_heir.black_maw'] },
                        { id: 'fenrirs_heir.moonless_grasp', kind: 'active', skill: 'Moonless Grasp', minLevel: 6, links: ['fenrirs_heir.darkhowl'] },
                        { id: 'fenrirs_heir.nights_dominion', kind: 'active', skill: 'Night\'s Dominion', minLevel: 9, links: ['fenrirs_heir.moonless_grasp'] },
                        { id: 'fenrirs_heir.moonhide', kind: 'passive', minLevel: 11, links: ['fenrirs_heir.nights_dominion'],
                            trait: { name: 'Moonhide', effect: 'Night sits on your skin like a pelt: take 10% less damage.', mods: { damageTaken: -0.1 } } },
                        { id: 'fenrirs_heir.devour_the_moon', kind: 'active', skill: 'Devour the Moon', minLevel: 14, links: ['fenrirs_heir.moonhide'] },
                        // Fenrir, shared by every stance
                        { id: 'fenrirs_heir.call_of_the_pack', kind: 'active', skill: 'Call of the Pack', links: ['heart.fenrirs_heir'] },
                        { id: 'fenrirs_heir.predators_instinct', kind: 'passive', minLevel: 5, links: ['fenrirs_heir.call_of_the_pack'],
                            trait: { name: 'Predator\'s Instinct', effect: 'The wolves know you: bond grows 50% faster.', mods: { bondRate: 0.5 } } },
                        { id: 'fenrirs_heir.gleipnirs_bane', kind: 'active', skill: 'Gleipnir\'s Bane', minLevel: 8, links: ['fenrirs_heir.predators_instinct'] },
                        { id: 'fenrirs_heir.twin_eclipse', kind: 'active', skill: 'Twin Eclipse', minLevel: 12, links: ['fenrirs_heir.gleipnirs_bane', 'fenrirs_heir.firestorm', 'fenrirs_heir.nights_dominion'] },
                        { id: 'fenrirs_heir.unbound', kind: 'passive', minLevel: 18, needs: ['fenrirs_heir.devour_the_sun', 'fenrirs_heir.devour_the_moon'],
                            links: ['fenrirs_heir.devour_the_sun', 'fenrirs_heir.devour_the_moon', 'fenrirs_heir.twin_eclipse'],
                            trait: { name: 'Fenrir Unbound', effect: 'Gleipnir is broken: +15% damage and 10% less damage taken.', mods: { damageDealt: 0.15, damageTaken: -0.1 } } }
                    ]
                },
                // Thorne: Reality Breaker's skills are not designed yet; the web opens with its heart only.
                reality_breaker: { requires: { stages: ['illusionist.5'], event: 'a reality-breaking event (not designed yet)' }, nodes: [] }
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
            'fallen_seraphim': {
                name: 'Fallen Seraphim',
                description: 'Heavenly power that chose to fall. Light that burns whoever holds it.',
                unlockPath: 'Stare at the robed statue in the Kloster courtyard for 2 minutes: a halo, then six wings, then it speaks.',
                mechanic: 'Grace and ash: radiant power that cuts deepest into the Undead and the Void, and burns brightest as you fall. Three paths, one per pair of wings: the Veiled Face (judgement), the Covered Feet (mercy), the Wide Wings (flight).',
                signatureSkill: 'Six-Winged Descent',
                seraph: 'Caelith, Keeper of the Altar Fire',
                ranks: ['Fallen', 'Watcher', 'Ashen Seraph', 'Seraph Unbound', 'The Six-Winged'],
                mastery: 'Every skill learned: six wings at your back, red eyes, and a holy weapon of your choosing from Caelith.',
                lore: "Evil is only a good that someone else did not choose. You were called fallen before you ever fell."
            },
            'fenrirs_heir': {
                name: 'Fenrir\'s Heir',
                description: 'The bound wolf\'s inheritance: Sköll who chases the sun, Hati who chases the moon, and the chain between them.',
                unlockPath: 'Gullstrand Coast: follow the two howls, take the Sun Fang and the Moon Fang, and survive the Binding Echo at the Wolf\'s Wake.',
                mechanic: 'Three stances: Sköll (fire, offense), Hati (consuming dark, speed and defence) and Fenrir (neither). Stay with one wolf and its bond grows; switching has an 8 s cooldown.',
                signatureSkill: 'Twin Eclipse',
                ranks: ['Heir of the Wolf', 'Sun-and-Moon Hunter', 'Fenrir Unbound'],
                lore: 'Not his child. His heir: the one who picked up what he left when the chain went on.'
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
            'Halo of Ash':      { category: 'buff' },     // Fallen Seraphim buffs, so a buff cleanse sees them
            'Feather Ward':     { category: 'buff' },
            'Wingstep':         { category: 'buff' },
            'The Coal Carried Down': { category: 'buff' },
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

        // ===================================================================
        // REAL-TIME COMBAT (combat v2, docs/REALTIME_COMBAT.md). Used only when the engine runs with
        // combatMode: 'realtime'; the turn-based rules above stay the legacy mode (combatMode: 'turn').
        // Every number here is Wren's FIRST PASS (2026-10-25) for Tally to measure and Vaelis to tune.
        // ===================================================================
        const realtimeRules = {
            pulseSeconds: 2,               // one "round" of bookkeeping: resource regen, Soul Energy, bombs, round counter (Gauge: 3 -> 2, Necromancer Soul Energy starved; docs/design/ENSO_ACTION_COMBAT_BALANCE.md)
            secondsPerTurn: 3,             // a status written in turns lasts this many seconds per turn
            globalCooldownSeconds: 1,      // after any skill or item, before the next one
            maxStepMs: 1000,               // the longest slice one tick() call simulates (a sleeping tab can't skip a fight)
            basicAttack: { swingSeconds: 3, referenceSpeed: 10, minSeconds: 1.5, maxSeconds: 4.5 },   // swing = 3 x 10 / SPD (QA #14: 1.6 s made every class win ~100%)
            cooldowns: { baseSeconds: 4, perCostSeconds: 3, allCostSeconds: 15 },   // a skill's own `cooldown` (seconds) wins
            enemy: { actionSeconds: 2.5, referenceSpeed: 10, minSeconds: 1.2, maxSeconds: 5, windupSeconds: 0.6, openingSeconds: 1 },
            minion: { actionSeconds: 2.5, referenceSpeed: 10, minSeconds: 1.2, maxSeconds: 5 },
            statuses: {
                dotMaxStacks: 99,          // Bleed, Poison, Infection and every other 'dot' stack to 99 (Tokelo, 2026-10-25)
                virulentTouchMaxStacks: 2, // Gauge (2026-11-02, Tokelo: "nerf Necro to add stack caps"): Virulent Touch basics stack Infection only this high, then refresh. Ghost on-hit DoTs use dotStackCap on the pool entry.
                tickSeconds: 1,            // a DoT ticks every second at 1 stack...
                perStackSpeedup: 0.02,     // ...and each stack above 1 shortens the tick: interval = tick / (1 + 0.02 x (stacks - 1))
                minTickSeconds: 0.25,      // never faster than this
                guardSeconds: 3,           // statuses that ended at the holder's next turn (Guard) last this long
                // Gauge (2026-10-31, Tokelo: "3 s of buffing has no chance of helping in a fight"): buffs in timed fights
                // (real-time and action, pre-buffs included) last `seconds`, not turns × secondsPerTurn, and stack to
                // `maxStacks`. A recast adds one stack and refreshes the timer to full. They outlive an action fight (Tokelo):
                // the time left keeps ticking on the out-of-fight clock. Damage reduction multiplies per
                // stack (25% -> 44% at 2); a charge buff (dodge, absorb, counter) spends one stack per use.
                // Turn mode never reads this. Reasoning and sources: docs/design/BALANCE_BUFFS.md.
                buffs: {
                    'Guard':           { seconds: 8,  maxStacks: 2 },   // warrior, 25% damage reduction per stack
                    'Bone Wall':       { seconds: 12, maxStacks: 2 },   // necromancer, each stack absorbs one hit
                    'Evasion':         { seconds: 6,  maxStacks: 1 },   // rogue (ninja rework 2026-11-02): every attack in 6 s rolls 50% to miss; 15 s cooldown
                    'Blade Focus':     { seconds: 10, maxStacks: 1 },   // ronin: +30% damage; 20 s cooldown
                    'Focused Pace':    { seconds: 10, maxStacks: 1 },   // ronin: swings and cooldowns 20% faster (with Blade Focus)
                    'Riposte':         { seconds: 10, maxStacks: 2 },   // each stack counters one attack for +50%
                    'Mirror Image':    { seconds: 15, maxStacks: 3 },   // three images, each takes one hit
                    'Guaranteed Crit': { maxStacks: 1 },                // Shadowstep: until used; one banked crit only
                    'Dragon’s Dominion': { seconds: 10, maxStacks: 1 }, // once per fight ultimate: a 10 s burst window
                    'Taunt':           { seconds: 6,  maxStacks: 1 },   // Shield of the Dead: minions hold aggro
                    'Haste':           { seconds: 8,  maxStacks: 1 },
                    // Fallen Seraphim (docs/design/FALLEN_SERAPHIM.md)
                    'Halo of Ash':        { seconds: 9,  maxStacks: 1 },   // 30% damage reduction; 20 s cooldown
                    'Feather Ward':       { seconds: 12, maxStacks: 2 },   // each stack absorbs one hit; 14 s cooldown
                    'Wingstep':           { seconds: 6,  maxStacks: 1 },   // 40% to dodge every attack; 14 s cooldown
                    'The Coal Carried Down': { seconds: 10, maxStacks: 1 },
                    // Fenrir's Heir (docs/design/FENRIRS_HEIR.md)
                    'Firehowl':           { seconds: 9,  maxStacks: 1 },   // +25% damage; 20 s cooldown   // once per fight: 50% damage reduction   // Time Mage: cooldowns and swings 30% faster (liveSpeedup); 20 s cooldown
                    // Channel the Grave's ghosts (necromancer, Tokelo 2026-11-01): 20 s each, 30 s cooldown, so 10 s without
                    'Wrath Ghost':     { seconds: 20, maxStacks: 1 },
                    'Siphon Ghost':    { seconds: 20, maxStacks: 1 },
                    'Swift Ghost':     { seconds: 20, maxStacks: 1 },
                    'Venom Ghost':     { seconds: 20, maxStacks: 1 },
                    'Rend Ghost':      { seconds: 20, maxStacks: 1 }
                }
            },
            skillBar: { slots: 6 }
        };

        // ===================================================================
        // ACTION COMBAT (combat v3, docs/ACTION_COMBAT.md): fights in the world, not on a battle screen.
        // Pixels are map pixels on 16 px tiles; times in ms. Behaviour and first-pass numbers: Thorne,
        // docs/design/ENSO_ACTION_COMBAT_DESIGN.md §7. Values owned by Gauge: docs/design/ENSO_ACTION_COMBAT_BALANCE.md
        // (the reasoning, the paper model `node qa/scripts/action_model.js`, and what the sim bot must verify).
        // ===================================================================
        const actionRules = {
            player: {
                speed: 72, sprintMult: 1.5, radius: 5, attackMoveMult: 0.35, hurtMs: 220, staggerMs: 400, inputBufferMs: 150,
                cancel: {
                    dodgeCancels: ['attackStartup', 'attackRecovery', 'skillCast', 'skillRecovery', 'guard', 'item'],
                    guardCancels: ['attackRecovery', 'skillRecovery'],
                    recoveryCancelPct: 0.5,
                    skillFizzle: { refundCost: true, cooldownMs: 1000 },
                    lightHitsInterrupt: false
                }
            },
            stamina: { max: 100, regenPerSec: 40, regenDelayMs: 600, sprintPerSec: 18, sprintMinToStart: 10, exhaustedUntil: 20, guardRegenMult: 0.3, sprintFreeOutOfCombat: true },
            dodge: { distance: 48, ms: 240, iframeStartMs: 20, iframeMs: 200, recoveryMs: 120, stamina: 25, cooldownMs: 350, passThroughEnemies: true },
            guard: { damageTaken: 0.4, arcDeg: 140, staminaPerHit: 14, moveMult: 0.45, raiseMs: 80, breakStaggerMs: 700 },
            parry: { windowMs: 160, staggerMs: 900, rearmMs: 400 },
            respawn: { hpPct: 0.5, bossHpPct: 1.0, at: 'entrySpawn', graceMs: 1500, iframeMs: 1500 },
            // Gauge: a blow that lands on the player deals at least 35% of its raw damage, whatever the DEF (0.35 is the
            // smallest round share at which the weakest Chapter One blow, a 3-damage rat bite, still deals 1). Guard applies after.
            defence: { minDamageShare: 0.35 },
            engageRadius: 120,                  // pressing attack with an enemy group this close engages it
            openerConeDeg: 30,                  // a shot out of a fight engages the group it is aimed at (this cone), as far as it flies
            classes: {
                warrior: {
                    weapon: {
                        kind: 'arc', reach: 26, arcDeg: 110, startupMs: 150, activeMs: 90, recoveryMs: 240, moveMult: 0.35, poise: 1, comboResetMs: 600,
                        combo: [
                            { kind: 'arc', reach: 26, arcDeg: 110, startupMs: 150, activeMs: 90, recoveryMs: 240 },
                            { kind: 'arc', reach: 26, arcDeg: 110, startupMs: 140, activeMs: 90, recoveryMs: 260 },
                            { kind: 'arc', reach: 30, arcDeg: 70, startupMs: 220, activeMs: 100, recoveryMs: 420, poise: 2, stepPx: 8 }
                        ]
                    },
                    dodge: {},
                    guard: { damageTaken: 0.25, arcDeg: 140, staminaMult: 0.8, moveMult: 0.55, parry: { windowMs: 200, staggerMs: 1100 } }
                },
                rogue: {
                    weapon: {
                        kind: 'arc', reach: 20, arcDeg: 90, startupMs: 90, activeMs: 70, recoveryMs: 160, moveMult: 0.6, poise: 1, comboResetMs: 600,
                        combo: [
                            { kind: 'arc', reach: 20, arcDeg: 90, startupMs: 90, activeMs: 70, recoveryMs: 160 },
                            { kind: 'arc', reach: 20, arcDeg: 90, startupMs: 90, activeMs: 70, recoveryMs: 160 },
                            { kind: 'line', reach: 26, width: 10, startupMs: 130, activeMs: 80, recoveryMs: 300 }
                        ]
                    },
                    dodge: { distance: 56, ms: 220, iframeMs: 200, recoveryMs: 70, stamina: 18, cooldownMs: 250 },
                    guard: { parryOnly: true, damageTaken: 1.0, stamina: 10, whiffRecoveryMs: 350, parry: { windowMs: 200, staggerMs: 800 } }
                },
                mage: {
                    weapon: { kind: 'projectile', range: 160, speed: 220, radius: 4, projectile: 'arcane', startupMs: 180, activeMs: 0, recoveryMs: 260, moveMult: 0.6, poise: 1 },   // Gauge 2026-11-01: range 128 -> 160, outranges every Chapter One detect radius (max 112)
                    dodge: { teleport: true, distance: 60, ms: 120, iframeStartMs: 0, iframeMs: 220, recoveryMs: 160, stamina: 30, cooldownMs: 600 },
                    guard: { damageTaken: 0.6, arcDeg: 360, staminaMult: 1.5, moveMult: 0.4, parry: null }
                },
                necromancer: {
                    weapon: { kind: 'projectile', range: 150, speed: 190, radius: 4, projectile: 'bone', startupMs: 200, activeMs: 0, recoveryMs: 300, moveMult: 0.6, poise: 1 },   // Gauge 2026-11-01: range 120 -> 150, as Grave Bolt
                    dodge: { distance: 40, ms: 300, iframeMs: 280, recoveryMs: 140, stamina: 25 },
                    guard: { damageTaken: 0.5, arcDeg: 360, staminaMult: 1.2, moveMult: 0.4, parry: null }
                }
            },
            // Summons outlive a fight and follow you; after this long without one they fall apart (Tokelo, 2026-10-31).
            summons: { lingerOutOfCombatMs: 60000 },
            // Skill resource recovery (Tokelo, 2026-10-31: "recover some during combat, then get it back out of combat so
            // you're ready for the next fight"). Action fights only; the turn-based and v2 modes keep resourceRules as is.
            // Per pool (keyed by resource type; a type not listed keeps the old rule: reset to startOfFight each fight):
            //   combatPerSec  passive trickle in a fight, on top of the class's own income (Mana/Energy regen, Soul Energy
            //                 for dealing damage and kills). Paid on the pulse; fractions carry over.
            //   calmPerSec    refill out of a fight, up to calmTo (default: max). Fractions carry over.
            // A listed pool is carried into the next fight: startOfFight becomes a floor, not a reset.
            // Gauge's first pass: every pool refills from empty in about 10 s of calm (docs/ACTION_COMBAT.md).
            resources: {
                pools: {
                    'Soul Energy': { combatPerSec: 0.25, calmPerSec: 1 },          // +1 every 4 s in a fight; 0 -> 10 in 10 s out of one
                    'Mana':        { combatPerSec: 0,    calmPerSec: 2 },          // already regens 1/s in a fight; 0 -> 20 in 10 s
                    'Energy':      { combatPerSec: 0,    calmPerSec: 1.5 },        // already regens 1.5/s in a fight; 0 -> 15 in 10 s
                    'Momentum':    { combatPerSec: 0.25, calmPerSec: 0.5, calmTo: 2 }   // had no income at all; walk in with one Power Strike
                }
            },
            skillShapes: {
                byTarget: {
                    enemy_single:   { shape: 'projectile', range: 140, speed: 240, radius: 5, castMs: 220, maxTargets: 1 },
                    enemy_aoe:      { shape: 'circle', radius: 40, castMs: 260 },
                    enemy_multiple: { shape: 'ground', range: 140, radius: 40, castMs: 300, los: true },
                    all_enemies:    { shape: 'circle', radius: 160, castMs: 300, los: true },
                    linked_enemies: { shape: 'self', radius: 200, castMs: 220 },
                    all_combatants: { shape: 'self', radius: 160, castMs: 300 },
                    self:           { shape: 'self', castMs: 0 },
                    ally_single:    { shape: 'self', castMs: 120 },
                    minions:        { shape: 'self', radius: 200, castMs: 160 },
                    ground:         { shape: 'ground', range: 110, radius: 32, castMs: 260 },
                    corpse:         { shape: 'ground', range: 140, radius: 40, castMs: 300, needsCorpse: true }
                },
                bySkill: {
                    'Slash':             { shape: 'arc', reach: 26, arcDeg: 110, castMs: 150, maxTargets: 1 },
                    'Guard':             { shape: 'self', castMs: 0, stacksWithGuard: true },
                    'Power Strike':      { shape: 'arc', reach: 30, arcDeg: 70, castMs: 420, activeMs: 120, recoveryMs: 450, poise: 3, stepPx: 12, maxTargets: 1 },
                    'War Cry':           { shape: 'self', castMs: 300 },
                    'Arcane Bolt':       { shape: 'projectile', range: 150, speed: 280, radius: 5, castMs: 240 },
                    'Focus':             { shape: 'self', castMs: 500, moveMult: 0.3, channel: true },
                    'Mana Burst':        { shape: 'projectile', range: 130, speed: 200, radius: 8, castMs: 450 },
                    'Overchannel':       { shape: 'self', castMs: 0 },
                    'Backstab':          { shape: 'line', reach: 24, width: 10, castMs: 160, maxTargets: 1, flankArcDeg: 120 },
                    'Evasion':           { shape: 'self', castMs: 0 },
                    // Rogue ninja kit (Tokelo 2026-11-02, docs/design/ROGUE_NINJA_KIT.md)
                    'Shuriken Volley':   { shape: 'projectile', range: 140, speed: 340, radius: 4, castMs: 120, recoveryMs: 120, projectile: 'shuriken' },
                    'Shadow Clone':      {
                        shape: 'summon', range: 32, castMs: 150,
                        // a body that fights like you: quick cuts, stands its ground (enemies hit the nearer body)
                        minion: { radius: 5, speed: 90, followMin: 12, followMax: 28, engageRadius: 140, teleportBeyond: 200,
                            attack: { skill: 'Shadow Cut', shape: 'arc', reach: 18, arcDeg: 90, windupMs: 180, activeMs: 70, recoveryMs: 200, cooldownMs: 700 } }
                    },
                    'Smoke Bomb':        { shape: 'circle', radius: 48, castMs: 120 },
                    'Shadow Hounds':     {
                        shape: 'summon', range: 40, castMs: 300,
                        minion: { radius: 4, speed: 110, followMin: 14, followMax: 32, engageRadius: 160, teleportBeyond: 220,
                            attack: { skill: 'Shadow Bite', shape: 'arc', reach: 14, arcDeg: 80, windupMs: 200, activeMs: 70, recoveryMs: 260, cooldownMs: 1000 } }
                    },
                    'Shadow Serpent':    { shape: 'ground', range: 130, radius: 24, castMs: 280, los: true },
                    'Assassinate':       { shape: 'line', reach: 28, width: 10, castMs: 220, maxTargets: 1 },
                    'Shade Legion':      {
                        shape: 'summon', range: 40, castMs: 600,
                        minions: {
                            shadow_stag: { radius: 7, speed: 80, followMin: 20, followMax: 40, engageRadius: 160, teleportBeyond: 220,
                                attack: { skill: 'Antler Gore', shape: 'arc', reach: 20, arcDeg: 90, windupMs: 320, activeMs: 90, recoveryMs: 380, cooldownMs: 1300 } }
                        }
                    },
                    'Iaido Draw':        { shape: 'line', reach: 34, width: 10, castMs: 140, activeMs: 60, recoveryMs: 160, maxTargets: 1 },
                    'Blade Focus':       { shape: 'self', castMs: 150 },
                    'Thousand Cuts':     { shape: 'arc', reach: 22, arcDeg: 90, castMs: 120, activeMs: 300, recoveryMs: 200, maxTargets: 1 },
                    'Blade Storm':       { shape: 'circle', radius: 34, castMs: 200, activeMs: 200 },
                    'Fire Bomb':         { shape: 'projectile', range: 130, speed: 210, radius: 5, castMs: 200, projectile: 'bomb', burstRadius: 32 },
                    'Explosive Caltrops': { shape: 'ground', range: 110, radius: 22, castMs: 220 },
                    'Poison Flask':      { shape: 'projectile', range: 120, speed: 200, radius: 5, castMs: 220, projectile: 'flask', burstRadius: 36, burstKind: 'poison' },
                    'Thunder Charge':    { shape: 'projectile', range: 120, speed: 170, radius: 6, castMs: 320, projectile: 'bomb', burstRadius: 48 },
                    'Cataclysm Barrage': { shape: 'circle', radius: 80, castMs: 450 },
                    'Quick Slash':       { shape: 'dash', dashPx: 32, dashMs: 110, reach: 20, arcDeg: 80, castMs: 80, maxTargets: 1 },
                    'Second Wind':       { shape: 'self', castMs: 0 },
                    'Grave Bolt':        { shape: 'projectile', range: 150, speed: 230, radius: 5, castMs: 300, corpseRadius: 200 },
                    'Raise Skeleton':    {
                        shape: 'summon', range: 40, castMs: 700,
                        minion: {
                            radius: 5, speed: 64, followMin: 24, followMax: 40, engageRadius: 110, teleportBeyond: 220,
                            attack: { skill: 'Bone Club', shape: 'arc', reach: 16, arcDeg: 70, windupMs: 350, activeMs: 80, recoveryMs: 450, cooldownMs: 1500 }
                        }
                    },
                    'Soul Leech':        { shape: 'line', reach: 96, width: 10, castMs: 320, los: true, maxTargets: 1 },
                    'Channel the Grave': { shape: 'self', castMs: 400 },
                    'Bone Cage':         { shape: 'ground', range: 140, radius: 40, castMs: 350, los: true },
                    'Raise Ghoul':       {
                        shape: 'summon', range: 40, castMs: 600,
                        // the meat shield sticks close to you, then sprints at an enemy (chargeSpeed) and bursts within burstRadius
                        minion: { radius: 6, speed: 72, followMin: 10, followMax: 18, engageRadius: 0, teleportBeyond: 120, chargeSpeed: 120, burstRadius: 40, attack: null }
                    },
                    'March of Endless Bones': {
                        shape: 'summon', range: 40, castMs: 900,
                        minions: {
                            skeleton_champion: {
                                radius: 7, speed: 64, followMin: 24, followMax: 40, engageRadius: 110, teleportBeyond: 220,
                                attack: { skill: 'Champion Cleave', shape: 'arc', reach: 20, arcDeg: 90, windupMs: 400, activeMs: 90, recoveryMs: 450, cooldownMs: 1600 }
                            }
                        }
                    },
                    'Shield Bash':       { shape: 'arc', reach: 22, arcDeg: 80, castMs: 260, poise: 3, stepPx: 12, maxTargets: 1 },
                    'Hemorrhage':        { shape: 'arc', reach: 28, arcDeg: 90, castMs: 300, maxTargets: 1 },
                    'Pincushion':        { shape: 'projectile', range: 160, speed: 320, radius: 4, castMs: 300 },
                    'Bone Wall':         { shape: 'self', castMs: 250 },
                    'Contagion':         { shape: 'projectile', range: 130, speed: 170, radius: 7, castMs: 400, los: true, spreadRadius: 48 },
                    'Soul Chain':        { shape: 'ground', range: 130, radius: 48, castMs: 450, los: true, count: 2, breakDistance: 200 },
                    'Shadowstep':        { shape: 'dash', teleport: true, range: 110, behindPx: 16, aimConeDeg: 30, castMs: 150, iframeMs: 150, los: true },
                    'Riposte':           { shape: 'self', castMs: 0, durationMs: 3000, counter: { shape: 'arc', reach: 26, arcDeg: 110 } },
                    'Caltrops':          { shape: 'ground', range: 110, radius: 32, castMs: 280, durationMs: 6000, applyOnEnter: true },
                    'Fireball':          { shape: 'projectile', range: 160, speed: 240, radius: 7, castMs: 380 },
                    // Fallen Seraphim: the single-target light is thrown; the wide wings use the all-enemies circle.
                    'Fallen Judgement':  { shape: 'projectile', range: 170, speed: 300, radius: 6, castMs: 300 },
                    'Brand of the Watcher': { shape: 'projectile', range: 150, speed: 320, radius: 5, castMs: 200 },
                    'Rain of Feathers':  { shape: 'projectile', range: 150, speed: 280, radius: 6, castMs: 260 },
                    'Verdict of Ash':    { shape: 'line', reach: 60, width: 14, castMs: 500, maxTargets: 1 },
                    // Fenrir's Heir: Sköll throws and charges; Hati's darkness pulls (pullPx drags each enemy hit toward you).
                    'Solar Fang':        { shape: 'projectile', range: 160, speed: 300, radius: 7, castMs: 260, projectile: 'fire' },
                    'Sunfang Rush':      { shape: 'dash', dashPx: 48, dashMs: 160, reach: 28, arcDeg: 120, castMs: 120 },
                    'Firestorm':         { shape: 'ground', range: 130, radius: 44, castMs: 450 },
                    'Devour the Sun':    { shape: 'projectile', range: 170, speed: 260, radius: 10, castMs: 500, projectile: 'fire' },
                    'Black Maw':         { shape: 'circle', radius: 64, castMs: 300, pullPx: 22 },
                    'Darkhowl':          { shape: 'circle', radius: 96, castMs: 300 },
                    'Moonless Grasp':    { shape: 'projectile', range: 140, speed: 280, radius: 7, castMs: 280 },
                    'Night\'s Dominion': { shape: 'circle', radius: 80, castMs: 400 },
                    'Devour the Moon':   { shape: 'circle', radius: 120, castMs: 600, pullPx: 48 },
                    'Twin Eclipse':      { shape: 'circle', radius: 100, castMs: 450 },
                    'mirrorImage':       { shape: 'self', castMs: 200, decoyMs: 3000 },
                    'haste':             { shape: 'self', castMs: 200 },
                    'Whirlwind':         { shape: 'circle', radius: 30, castMs: 200 }
                }
            },
            // Fills any field an enemy leaves out. An enemy's top-level reach/windupMs/shape are its primary attack.
            enemyDefaults: { speed: 48, detect: 90, sight: true, reach: 18, windupMs: 520, activeMs: 110, recoveryMs: 600, lockMs: 200, shape: 'arc', arcDeg: 100, leash: 200, radius: 6, wander: 18, poise: 2, flinchMs: 250, blockCost: 14, parryable: true, giveUpMs: 4000 },
            enemies: {
                rust_rat: {
                    speed: 60, detect: 64, reach: 12, arcDeg: 60, windupMs: 380, activeMs: 80, recoveryMs: 400, radius: 4, poise: 1, leash: 150,
                    keepDistance: [0, 12], group: 'swarm', flee: { belowHpPct: 0.3, ms: 1500 }, retreatAfterHitPx: 24,
                    attacks: [
                        { skill: 'Corroding Bite', shape: 'arc', reach: 12, arcDeg: 60, windupMs: 380, activeMs: 80, recoveryMs: 400, cooldownMs: 900, blockCost: 6 }
                    ]
                },
                // The pack leader (Tokelo 2026-11-04): a heavier body than its pack. The pack waits by the road itself (src/world/zone1.js), so it can't be walked past.
                hungry_wolf: {
                    speed: 82, detect: 112, smellRadius: 40, reach: 40, shape: 'line', width: 10, lunge: 40, windupMs: 480, activeMs: 200, recoveryMs: 650, radius: 7, poise: 4, leash: 220,
                    giveUpMs: 2000, giveUpBeyond: 180, keepDistance: [40, 56], group: 'circle',
                    attacks: [
                        { name: 'Lunge Bite', skill: 'Bite', shape: 'line', reach: 40, width: 10, lunge: 40, windupMs: 480, activeMs: 200, recoveryMs: 650, cooldownMs: 2200, blockCost: 12, useAt: [24, 56] },
                        // Gauge: windup 300 -> 380. 7-10 dmg (the wolf's whole bite) needs a tell a 250 ms reaction can answer.
                        { name: 'Snap', skill: 'Bite', shape: 'arc', reach: 16, arcDeg: 70, windupMs: 380, activeMs: 80, recoveryMs: 300, cooldownMs: 900, blockCost: 8, useAt: [0, 20] }
                    ]
                },
                pack_wolf: {
                    speed: 84, detect: 112, smellRadius: 40, reach: 36, shape: 'line', width: 9, lunge: 36, windupMs: 480, activeMs: 200, recoveryMs: 650, radius: 5, poise: 1, leash: 220,
                    giveUpMs: 2000, giveUpBeyond: 180, keepDistance: [36, 52], group: 'circle',
                    attacks: [
                        { name: 'Lunge Bite', skill: 'Bite', shape: 'line', reach: 36, width: 9, lunge: 36, windupMs: 480, activeMs: 200, recoveryMs: 650, cooldownMs: 2600, blockCost: 10, useAt: [22, 52] },
                        { name: 'Snap', skill: 'Bite', shape: 'arc', reach: 14, arcDeg: 70, windupMs: 380, activeMs: 80, recoveryMs: 300, cooldownMs: 1100, blockCost: 6, useAt: [0, 18] }
                    ]
                },
                // Gullstrand's turned wolves (CL1): the pack wolf's kit at Chapter Two weight. The sun-mad ones press in close;
                // the moonless ones circle wider and lunge from further out.
                sunscorched_wolf: {
                    speed: 86, detect: 120, smellRadius: 40, reach: 38, shape: 'line', width: 10, lunge: 38, windupMs: 480, activeMs: 200, recoveryMs: 600, radius: 6, poise: 2, leash: 220,
                    giveUpMs: 2000, giveUpBeyond: 180, keepDistance: [30, 46], group: 'circle',
                    attacks: [
                        { name: 'Lunge Bite', skill: 'Scorching Bite', shape: 'line', reach: 38, width: 10, lunge: 38, windupMs: 480, activeMs: 200, recoveryMs: 600, cooldownMs: 2400, blockCost: 10, useAt: [22, 52] },
                        { name: 'Snap', skill: 'Scorching Bite', shape: 'arc', reach: 16, arcDeg: 70, windupMs: 380, activeMs: 80, recoveryMs: 300, cooldownMs: 1000, blockCost: 7, useAt: [0, 20] }
                    ]
                },
                moonless_wolf: {
                    speed: 92, detect: 120, smellRadius: 40, reach: 44, shape: 'line', width: 9, lunge: 44, windupMs: 520, activeMs: 200, recoveryMs: 650, radius: 5, poise: 1, leash: 220,
                    giveUpMs: 2000, giveUpBeyond: 180, keepDistance: [44, 60], group: 'circle',
                    attacks: [
                        { name: 'Lunge Bite', skill: 'Night Bite', shape: 'line', reach: 44, width: 9, lunge: 44, windupMs: 520, activeMs: 200, recoveryMs: 650, cooldownMs: 2600, blockCost: 10, useAt: [26, 60] },
                        { name: 'Snap', skill: 'Night Bite', shape: 'arc', reach: 14, arcDeg: 70, windupMs: 380, activeMs: 80, recoveryMs: 300, cooldownMs: 1100, blockCost: 6, useAt: [0, 18] }
                    ]
                },
                weak_goblin: {
                    speed: 52, detect: 96, alertMs: 400, reach: 18, arcDeg: 90, windupMs: 480, activeMs: 100, recoveryMs: 450, radius: 5, poise: 1, leash: 180,
                    keepDistance: [14, 18], group: 'flank', flee: { belowHpPct: 0.25, ms: 2000 }, hopBackAfterHits: 2, hopBackPx: 20,
                    attacks: [
                        { skill: 'Goblin Slash', shape: 'arc', reach: 18, arcDeg: 90, windupMs: 480, activeMs: 100, recoveryMs: 450, cooldownMs: 1200, blockCost: 10 }
                    ]
                },
                bone_gnawer: {
                    speed: 50, detect: 80, reach: 14, arcDeg: 50, windupMs: 420, activeMs: 80, recoveryMs: 500, radius: 5, poise: 2, leash: 150, giveUpMs: null,
                    keepDistance: [0, 12], group: 'direct',
                    attacks: [
                        { skill: 'Ankle Snap', shape: 'arc', reach: 14, arcDeg: 50, windupMs: 420, activeMs: 80, recoveryMs: 500, cooldownMs: 1000, blockCost: 10, low: true, guardEfficiency: 0.5 }
                    ]
                },
                cult_acolyte: {
                    speed: 44, detect: 112, alertMs: 1200, ranged: true, keepDistance: [56, 90], reach: 120, shape: 'projectile', projectile: 'shadow', projSpeed: 130,
                    windupMs: 650, activeMs: 0, recoveryMs: 600, radius: 5, poise: 2, leash: 170, group: 'ranged_keeps_distance', roles: ['blade', 'hexer'], backOffBelow: 40,
                    attacks: [
                        { name: 'Hex Bolt', skill: 'Hexing Blade', shape: 'projectile', reach: 120, projSpeed: 130, radius: 5, windupMs: 650, activeMs: 0, recoveryMs: 600, cooldownMs: 2500, blockCost: 12, parryable: false, role: 'hexer' },
                        { name: 'Hexing Blade', skill: 'Hexing Blade', shape: 'line', reach: 22, width: 10, windupMs: 550, activeMs: 100, recoveryMs: 550, cooldownMs: 1400, blockCost: 12, role: 'blade' }
                    ]
                },
                watch_constable: {
                    speed: 54, detect: 128, alertMs: 1500, reach: 20, arcDeg: 80, windupMs: 500, activeMs: 100, recoveryMs: 500, radius: 6, poise: 3, leash: 260,
                    keepDistance: [16, 22], group: 'pincer', frontalShield: { arcDeg: 90, damageTaken: 0.5 },
                    attacks: [
                        { skill: 'Truncheon', shape: 'arc', reach: 20, arcDeg: 80, windupMs: 500, activeMs: 100, recoveryMs: 500, cooldownMs: 1400, blockCost: 12 },
                        { skill: 'Shield Shove', shape: 'line', reach: 18, width: 16, windupMs: 350, activeMs: 120, recoveryMs: 600, cooldownMs: 3000, blockCost: 20, knockbackPx: 24, staggers: true, useWhen: 'playerGuarding_or_shieldHitTwice' }
                    ]
                },
                // The Broken Oath's heavy: walks straight at you, swings a two-hit flail, and charges when you keep away.
                // Its acolytes hang back and hex (roles), so the pair is a tank-and-caster fight, not two of the same.
                cult_zealot: {
                    speed: 50, detect: 112, alertMs: 900, reach: 24, arcDeg: 120, windupMs: 620, activeMs: 110, recoveryMs: 600, radius: 7, poise: 4, leash: 200,
                    keepDistance: [0, 22], group: 'direct',
                    attacks: [
                        {
                            name: 'Oathbreaker Flail', skill: 'Oathbreaker Flail', shape: 'arc', reach: 24, arcDeg: 120, cooldownMs: 1800, useAt: [0, 26],
                            combo: [
                                { windupMs: 620, activeMs: 110, recoveryMs: 220, blockCost: 14 },
                                { windupMs: 420, activeMs: 110, recoveryMs: 750, blockCost: 18, reverse: true }
                            ]
                        },
                        { name: 'Zealous Charge', skill: 'Zealous Charge', shape: 'line', reach: 56, width: 12, lunge: 44, windupMs: 700, activeMs: 160, recoveryMs: 800, cooldownMs: 4500, blockCost: 20, knockbackPx: 18, staggers: true, useAt: [30, 70] }
                    ]
                },
                // Small, fast and fragile: they circle out of reach, dive in a straight line, peck, and break off.
                carrion_crow: {
                    speed: 92, detect: 112, reach: 34, shape: 'line', width: 8, lunge: 34, windupMs: 420, activeMs: 160, recoveryMs: 520, radius: 4, poise: 1, leash: 200,
                    giveUpMs: 2500, giveUpBeyond: 180, keepDistance: [30, 50], group: 'circle', retreatAfterHitPx: 28, wander: 12,
                    attacks: [
                        { name: 'Dive', skill: 'Raking Peck', shape: 'line', reach: 34, width: 8, lunge: 34, windupMs: 420, activeMs: 160, recoveryMs: 520, cooldownMs: 2200, blockCost: 8, useAt: [18, 50] },
                        { name: 'Peck', skill: 'Raking Peck', shape: 'arc', reach: 12, arcDeg: 70, windupMs: 340, activeMs: 70, recoveryMs: 300, cooldownMs: 1000, blockCost: 5, useAt: [0, 16] }
                    ]
                },
                shackled_ghoul_stronger: {
                    speed: 58, detect: 80, provokedOnly: true, reach: 20, arcDeg: 90, windupMs: 600, activeMs: 100, recoveryMs: 800, radius: 8, poise: 5, hyperArmor: true, leash: 120,
                    keepDistance: [0, 20], group: 'solo',
                    attacks: [
                        {
                            name: 'Frenzied Bite', skill: 'Frenzied Bite', shape: 'arc', reach: 20, arcDeg: 90, cooldownMs: 1600, useAt: [0, 20],
                            combo: [
                                { windupMs: 600, activeMs: 100, recoveryMs: 200, blockCost: 14 },
                                { windupMs: 350, activeMs: 100, recoveryMs: 800, blockCost: 16, staggers: true, knockbackPx: 12 }
                            ]
                        },
                        { name: 'Chain Whip', skill: 'Frenzied Bite', shape: 'arc', reach: 32, arcDeg: 160, windupMs: 800, activeMs: 150, recoveryMs: 700, cooldownMs: 4000, blockCost: 22, useAt: [20, 40] }
                    ]
                },
                // Chapter Two (CHAPTER_TWO_LORE.md C2-01): the Wolf-Banner. The raider is a shield-and-axe front liner, the
                // spear-thrower hangs back and throws, and Ulfrun leads with a two-hand axe and a howl that brings them in.
                wolfbanner_raider: {
                    speed: 54, detect: 120, alertMs: 900, reach: 22, arcDeg: 100, windupMs: 560, activeMs: 110, recoveryMs: 560, radius: 6, poise: 3, leash: 220,
                    keepDistance: [0, 20], group: 'pincer', frontalShield: { arcDeg: 90, damageTaken: 0.6 },
                    attacks: [
                        { name: 'Bearded Axe', skill: 'Bearded Axe', shape: 'arc', reach: 22, arcDeg: 100, windupMs: 560, activeMs: 110, recoveryMs: 560, cooldownMs: 1500, blockCost: 14, useAt: [0, 24] },
                        { name: 'Shield Rush', skill: 'Shield Rush', shape: 'line', reach: 48, width: 14, lunge: 36, windupMs: 650, activeMs: 150, recoveryMs: 750, cooldownMs: 4200, blockCost: 18, knockbackPx: 18, staggers: true, useAt: [26, 60] }
                    ]
                },
                wolfbanner_skirmisher: {
                    speed: 50, detect: 128, alertMs: 1000, ranged: true, keepDistance: [56, 96], reach: 130, shape: 'projectile', projectile: 'arrow', projSpeed: 170,
                    windupMs: 620, activeMs: 0, recoveryMs: 650, radius: 5, poise: 2, leash: 200, group: 'ranged_keeps_distance', roles: ['blade', 'hexer'], backOffBelow: 40,
                    attacks: [
                        { name: 'Thrown Spear', skill: 'Thrown Spear', shape: 'projectile', reach: 130, projSpeed: 170, radius: 5, windupMs: 620, activeMs: 0, recoveryMs: 650, cooldownMs: 2600, blockCost: 12, role: 'hexer' },
                        { name: 'Spear Jab', skill: 'Spear Jab', shape: 'line', reach: 26, width: 8, windupMs: 480, activeMs: 100, recoveryMs: 520, cooldownMs: 1300, blockCost: 10, role: 'blade' }
                    ]
                },
                // Sergeant Kess: a feint you can read (the short shield shove) before the heavy two-cut, and never a rush.
                oath_sergeant: {
                    speed: 48, detect: 120, alertMs: 900, reach: 24, arcDeg: 110, windupMs: 640, activeMs: 110, recoveryMs: 620, radius: 7, poise: 5, leash: 220,
                    keepDistance: [0, 22], group: 'direct', frontalShield: { arcDeg: 70, damageTaken: 0.7 },
                    attacks: [
                        {
                            name: 'Measured Cut', skill: 'Measured Cut', shape: 'arc', reach: 24, arcDeg: 110, cooldownMs: 2200, useAt: [0, 26],
                            combo: [
                                { windupMs: 640, activeMs: 110, recoveryMs: 260, blockCost: 16 },
                                { windupMs: 520, activeMs: 110, recoveryMs: 800, blockCost: 20, reverse: true }
                            ]
                        },
                        { name: 'Shield Feint', skill: 'Shield Feint', shape: 'line', reach: 18, width: 14, windupMs: 380, activeMs: 120, recoveryMs: 600, cooldownMs: 3800, blockCost: 14, knockbackPx: 16, staggers: true, useAt: [0, 20] }
                    ]
                },
                wolfbanner_ringleader: {
                    speed: 52, detect: 136, alertMs: 700, reach: 26, arcDeg: 140, windupMs: 650, activeMs: 120, recoveryMs: 650, radius: 8, poise: 6, hyperArmor: true, leash: 240,
                    keepDistance: [0, 24], group: 'direct',
                    attacks: [
                        {
                            name: 'Two-Hand Axe', skill: 'Two-Hand Axe', shape: 'arc', reach: 26, arcDeg: 140, cooldownMs: 2000, useAt: [0, 28],
                            combo: [
                                { windupMs: 650, activeMs: 120, recoveryMs: 240, blockCost: 18 },
                                { windupMs: 460, activeMs: 120, recoveryMs: 820, blockCost: 22, reverse: true, staggers: true, knockbackPx: 14 }
                            ]
                        },
                        { name: 'Wolf Howl', skill: 'Wolf Howl', shape: 'circle', radius: 44, windupMs: 900, activeMs: 150, recoveryMs: 900, cooldownMs: 9000, guardable: false, parryable: false, useAt: [0, 40] }
                    ]
                },
                crow_touched_warden: { boss: true, speed: 46, detect: 150, reach: 36, windupMs: 700, arcDeg: 150, radius: 10, leash: 400, poise: 10, hyperArmor: true, see: 'bosses.crow_touched_warden' },
                // Fenrir's Heir trial: a coil of broken chain that alternates the two wolves (design §4: telegraphed, walkable).
                // Sun: burning ground where you stand. Moon: a dark that drags you in. Every tell is readable; bosses hold still for pulls.
                binding_echo: {
                    boss: true, speed: 44, detect: 160, reach: 30, arcDeg: 140, windupMs: 620, activeMs: 130, recoveryMs: 700, radius: 10, poise: 8, hyperArmor: true, leash: 400,
                    giveUpMs: null, keepDistance: [20, 56], group: 'solo',
                    attacks: [
                        { name: 'Chain Lash', skill: 'Chain Lash', shape: 'arc', reach: 30, arcDeg: 140, windupMs: 620, activeMs: 130, recoveryMs: 700, cooldownMs: 2400, blockCost: 18, useAt: [0, 34] },
                        // Sköll's half: sunfire falls where you stand. Three marked circles, a full second to step out.
                        { name: 'Sunbrand', skill: 'Sunbrand', shape: 'ground', count: 3, radius: 20, leadMs: 300, windupMs: 1000, activeMs: 250, recoveryMs: 900, cooldownMs: 7000, guardable: false, parryable: false, damageMult: 1.5, useAt: [30, 160] },
                        // Hati's half: a chain of darkness that drags you to it (like the Warden's Chain Lock).
                        { name: 'Moonless Drag', skill: 'Moonless Drag', shape: 'projectile', reach: 130, width: 10, projSpeed: 260, windupMs: 700, activeMs: 0, recoveryMs: 800, cooldownMs: 6000, blockCost: 16, parryable: false, onHit: { status: 'Rooted', ms: 800, pullPx: 28 }, useAt: [50, 130] },
                        // Both at once: the broken chain whips round it. Walk out of 56 px or dodge through (1.1 s to read).
                        { name: 'Gleipnir Recoils', skill: 'Chain Lash', shape: 'circle', radius: 56, windupMs: 1100, activeMs: 140, recoveryMs: 1200, cooldownMs: 10000, guardable: false, parryable: false, damageMult: 1.4, useAt: [0, 50] }
                    ]
                },
                // The Trial of the Live Coal: four wings, a spear, and every tell readable (first-pass numbers, Gauge).
                heaven_doorwarden: {
                    boss: true, speed: 54, detect: 170, reach: 32, arcDeg: 150, windupMs: 600, activeMs: 140, recoveryMs: 700, radius: 10, poise: 12, hyperArmor: true, leash: 420,
                    giveUpMs: null, keepDistance: [24, 60], group: 'solo',
                    attacks: [
                        { name: 'Spear Sweep', skill: 'Spear of the Altar', shape: 'arc', reach: 32, arcDeg: 160, cooldownMs: 2600, useAt: [0, 34],
                            combo: [
                                { windupMs: 600, activeMs: 140, recoveryMs: 200, blockCost: 26 },
                                { windupMs: 420, activeMs: 140, recoveryMs: 900, blockCost: 30, reverse: true }
                            ] },
                        { name: 'Spear Thrust', skill: 'Spear of the Altar', shape: 'line', reach: 60, width: 12, lunge: 28, windupMs: 620, activeMs: 120, recoveryMs: 800, cooldownMs: 2400, blockCost: 28, useAt: [28, 70] },
                        // Four wings beat once around it: walk out of 60 px or dodge through it (1.2 s to read).
                        { name: 'Wingbeat', skill: 'Wingbeat', shape: 'circle', radius: 60, windupMs: 1200, activeMs: 150, recoveryMs: 1300, cooldownMs: 9000, guardable: false, parryable: false, damageMult: 1.6, useAt: [0, 56] },
                        // Light falls where you stand: three marked circles, 1 s to step out.
                        { name: 'Sentence of Light', skill: 'Sentence of Light', shape: 'ground', count: 3, radius: 22, leadMs: 300, windupMs: 1000, activeMs: 250, recoveryMs: 900, cooldownMs: 7000, guardable: false, parryable: false, damageMult: 1.7, useAt: [40, 170] },
                        { name: 'Judgement Bolt', skill: 'Sentence of Light', shape: 'projectile', reach: 160, projSpeed: 230, radius: 6, projectile: 'arcane', windupMs: 650, activeMs: 0, recoveryMs: 700, cooldownMs: 3500, blockCost: 18, parryable: false, useAt: [60, 160] }
                    ]
                }
            },
            bosses: {
                crow_touched_warden: {
                    arena: { x0: 32, y0: 64, x1: 672, y1: 448, home: { x: 368, y: 176 },   // the sanctuary floor in sim px (16 px tiles); the crow storms use it
                            leashInsideArena: false, exitResets: true, respawnAt: { x: 184, y: 232 }, reengageRadius: 80 },
                    // Gauge: hpMult 2.5 (action mode only) puts the fight at 60-90 s; action play lands far more hits than v2.
                    // Tokelo 2026-11-02 (beef up the boss, don't nerf the classes): 2.5 -> 3.2. The phase 2/3 moves alone left
                    // the warrior at 52 s; at 3.2 he takes 65 s and mage/rogue stay in the 60-90 s band (qa/scripts/warden_benchmark.js).
                    hpMult: 3.2, speed: 46, keepDistance: [32, 56], radius: 10, poise: 10, hyperArmor: true, postureBreakMs: 1500,
                    parryStaggerMs: 600, warriorParryStaggerMs: 800, attackGapMs: 1200, minWindupMs: 500,
                    alternateSpecials: true,   // a crow special or Reaper's Dance is followed by a base blow when one fits
                    guardsSeal: true, noSweepNearCagesPx: 40,
                    attacks: {
                        halberd_sweep:   { skill: 'Halberd Sweep', shape: 'arc', reach: 36, arcDeg: 150, windupMs: 700, activeMs: 150, recoveryMs: 700, blockCost: 30, parryable: true, useAt: [0, 40] },
                        reaping_thrust:  { skill: 'Halberd Sweep', shape: 'line', reach: 64, width: 12, lunge: 24, windupMs: 550, activeMs: 120, recoveryMs: 900, blockCost: 22, parryable: true, useAt: [40, 80], alsoWhen: 'playerNorthOfWarden_or_nearCage' },
                        chain_lock:      { skill: 'Chain Lock', shape: 'projectile', reach: 120, width: 10, projSpeed: 300, windupMs: 600, activeMs: 0, recoveryMs: 800, blockCost: 20, parryable: false, onHit: { status: 'Rooted', ms: 1000, pullPx: 24 }, useWhen: 'playerBeyond80For1500ms' },
                        summon_crows:    { skill: 'Summon Crows', shape: 'ground', count: 3, radius: 20, leadMs: 300, windupMs: 900, activeMs: 300, recoveryMs: 1000, guardable: false, cooldownMs: 9000, damageMult: 3 },
                        // Gauge: windup 1200 -> 1300 (walking out of r 64 from his feet takes ~960 ms + a 250 ms reaction) and
                        // active 200 -> 120 (the 200 ms dodge i-frames must cover the whole active window with slack).
                        murder_of_crows: { skill: 'Summon Crows', shape: 'circle', radius: 64, windupMs: 1300, activeMs: 120, recoveryMs: 1500, guardable: false, cooldownMs: 15000, phase: 2, damageMult: 6 },
                        // Phase 2 (Tokelo, 2026-11-02; docs/design/CROW_WARDEN_PHASES.md). First-pass numbers for Gauge.
                        // Reaper's Dance: his 2-hit sweep grows a third blow, a heavy thrust at you, then a long recovery to punish.
                        reapers_dance:   { skill: 'Halberd Sweep', shape: 'arc', reach: 36, arcDeg: 150, useAt: [0, 44], cooldownMs: 8000, parryable: true, phase: 2,
                                           combo: [
                                               { windupMs: 650, activeMs: 150, recoveryMs: 150, blockCost: 28 },
                                               { windupMs: 500, activeMs: 150, recoveryMs: 150, blockCost: 28, reverse: true },
                                               { shape: 'line', reach: 64, width: 14, lunge: 20, windupMs: 600, lockMs: 250, activeMs: 140, recoveryMs: 1800, blockCost: 36, damageMult: 1.3 }
                                           ] },
                        // Marked Prey: a crow marks you or one of your summons, follows it, then locks; three crows dive at the
                        // locked spot. Step out of it after the lock (or drag the mark away from him first).
                        marked_prey:     { skill: 'Summon Crows', shape: 'mark', count: 3, radius: 22, reachPx: 200, windupMs: 1600, lockMs: 550, activeMs: 200, recoveryMs: 900, guardable: false, parryable: false, cooldownMs: 11000, damageMult: 4, phase: 2 },
                        // Phase 3 crow storms: one of 5 arena patterns, always in this order, then a rest (cooldownMs and
                        // quietMs) so you get your turn. Zones are fractions of `arena` (fx, fy, r as a share of its width).
                        // Tokelo 2026-11-02 (harder): a storm comes as a chain of 2-3 patterns back to back (`chain`), each next one
                        // on a shorter wind-up and with a crow mark riding on you (`markRider`), and only then the rest.
                        crow_storm:      { skill: 'Summon Crows', shape: 'arena', windupMs: 1800, activeMs: 250, recoveryMs: 2200, guardable: false, parryable: false, cooldownMs: 12000, quietMs: 3500, damageMult: 5, phase: 3,
                                           chain: { min: 2, max: 3, windupMs: 1300, gapMs: 350, markRider: { radius: 22, lockMs: 450 } } }
                    },
                    // Guardian's Resolve: once, when phase 2 opens. 6 s of 20% less damage from every source (summons and
                    // DoTs too), slower steps and slower wind-ups; then a short window where any hit staggers him.
                    resolve: { atPhase: 2, ms: 6000, damageTaken: 0.8, speedMult: 0.6, windupMult: 1.4, vulnerableMs: 2500, staggerMs: 1500 },
                    // Crow's Illusion (Tokelo, 2026-11-02): once at 30% he bursts into crows and steps out as one of 5 identical
                    // Wardens. The 4 false ones have 2 HP and hit as hard as he does (same stats and skills); they swing only
                    // (no crows) and scatter after `ms` or when he falls.
                    illusion: { atHpPct: 0.3, count: 4, hp: 2, ms: 20000, attackGapMs: 2400, ringPx: 90, revealMs: 700, attacks: ['halberd_sweep', 'reaping_thrust'] },
                    crowStorms: [
                        { name: 'Cross', zones: [{ kind: 'band', fy: 0.5, h: 0.22 }, { kind: 'column', fx: 0.5, w: 0.14 }] },
                        { name: 'Ring', zones: [{ kind: 'ring', r: 0.13, count: 10, size: 0.045 }] },
                        { name: 'Rows', zones: [{ kind: 'band', fy: 0.1, h: 0.2 }, { kind: 'band', fy: 0.5, h: 0.2 }, { kind: 'band', fy: 0.9, h: 0.2 }] },
                        { name: 'Columns', zones: [{ kind: 'column', fx: 0.1, w: 0.14 }, { kind: 'column', fx: 0.37, w: 0.14 }, { kind: 'column', fx: 0.63, w: 0.14 }, { kind: 'column', fx: 0.9, w: 0.14 }] },
                        { name: 'Corners', zones: [{ kind: 'spot', fx: 0.15, fy: 0.2, r: 0.12 }, { kind: 'spot', fx: 0.85, fy: 0.2, r: 0.12 }, { kind: 'spot', fx: 0.15, fy: 0.8, r: 0.12 }, { kind: 'spot', fx: 0.85, fy: 0.8, r: 0.12 }, { kind: 'spot', fx: 0.5, fy: 0.5, r: 0.09 }] }
                    ],
                    phases: [
                        { fromHpPct: 1.0, attacks: ['halberd_sweep', 'reaping_thrust', 'chain_lock', 'summon_crows'] },
                        { fromHpPct: 0.5, openWith: 'murder_of_crows', speed: 54, attacks: ['reapers_dance', 'marked_prey', 'halberd_sweep', 'reaping_thrust', 'chain_lock', 'summon_crows', 'murder_of_crows'], sweepCombo: { hits: 2, gapMs: 400 }, summonCrowsCount: 5 },
                        // Phase 3 at 25% (Tokelo, 2026-11-02; was the 20% desperation stage): the crow storms join everything else.
                        { fromHpPct: 0.25, openWith: 'crow_storm', recoveryMult: 0.8, drop: ['chain_lock'], barkBeforeMurder: true, attacks: ['crow_storm', 'murder_of_crows', 'marked_prey', 'reapers_dance', 'halberd_sweep', 'reaping_thrust', 'chain_lock', 'summon_crows'],
                          // Tokelo 2026-11-02: below 25% his crows come faster and more often, between the storms
                          attackOverrides: { murder_of_crows: { cooldownMs: 7000, windupMs: 1000 }, marked_prey: { cooldownMs: 5500, windupMs: 1200, lockMs: 450 } } }
                    ],
                    onDefeat: { drop: 'First Echo key', scene: 'crows_mourn' },
                    onPlayerDefeat: { reset: 'fullHp', returnHome: true, keepFlags: ['warden_challenged'] }
                }
            },
            combat: {
                maxSimultaneousAttackers: 2,
                reset: { returnSpeedMult: 1.6, invulnerable: true, fullHeal: true, reengageCooldownMs: 1500, unreachableMs: 3000 },
                itemUse: { ms: 500, moveMult: 0.5, cancelKeepsItem: true },
                channelInteractMs: 1000,
                corpseMs: 30000,
                perfectDodgeFiresOnDodge: true,
                allowedWhileEngaged: { move: true, items: true, collectDrop: true, inspect: true, gather: 'channel', dialogue: false, shop: false, equip: false, skillBarEdit: false, inventoryReadOnly: true, pause: true, mapExit: true },
                blockedWhileThreatened: ['save', 'black_flight']
            }
        };

        // Items you can `use`. Anything not listed is a keepsake (for now).
        const KINDLE = (dormant) => ({ flag: 'seraph_rank_six', dormant,
            dormantText: 'Dormant: it wakes to full strength when every Fallen Seraphim skill is learned.' });
        const itemDefinitions = {
            'Moldy Bread':           { use: 'heal', value: 8,  description: 'Better than nothing. Probably.' },
            'Half-full Wine Bottle': { use: 'heal', value: 12, description: 'Sour, but it takes the edge off.' },
            'Bandages':              { use: 'heal', value: 25, description: 'Clean enough.' },
            'Healing Herb Bundle':   { use: 'heal', value: 40, description: 'Bitter leaves that knit flesh.' },
            // The Fallen Seraphim's holy weapons (Tokelo 2026-11-04: "a holy weapon of their choosing"). Any class can wield
            // them; you take one (story key seraph_holy_weapon). Since 2026-11-09 (Tokelo: "we have yet to see a player use
            // it cause of the level lock") Caelith offers them the moment the statue wakes, dormant at about half strength
            // (`kindle.dormant`); every web skill learned (rank The Six-Winged) wakes the weapon to its full statModifiers.
            'Emberward': { type: 'weapon', slot: 'mainHand', weaponType: 'two-hand', hands: 2, damageType: 'physical', rarity: 'legendary', bound: true, unique: true, sellable: false, holy: true,
                kindle: KINDLE({ physicalDamage: 3, strength: 1 }),
                statModifiers: { physicalDamage: 6, strength: 2, def: 1 }, description: 'A holy greatsword, its blade banked like a coal. Caelith guarded Heaven\'s altar fire with it, once, and then did not.' },
            'Spear of the Altar Fire': { type: 'weapon', slot: 'mainHand', weaponType: 'spear', hands: 2, damageType: 'physical', rarity: 'legendary', bound: true, unique: true, sellable: false, holy: true,
                kindle: KINDLE({ physicalDamage: 3, agility: 1, critChance: 0.03 }),
                statModifiers: { physicalDamage: 5, agility: 2, critChance: 0.05 }, description: 'A white-ash spear whose head glows like a live coal. It is warm to hold.' },
            'Twin Pinions': { type: 'weapon', slot: 'mainHand', weaponType: 'one-hand', hands: 1, damageType: 'physical', rarity: 'legendary', bound: true, unique: true, sellable: false, holy: true,
                kindle: KINDLE({ physicalDamage: 2, agility: 2, critChance: 0.04 }),
                statModifiers: { physicalDamage: 4, agility: 3, critChance: 0.08 }, description: 'Two curved blades, each forged from a single gold-edged feather.' },
            'Censer of Ash': { type: 'weapon', slot: 'mainHand', weaponType: 'staff', hands: 2, damageType: 'magic', rarity: 'legendary', bound: true, unique: true, sellable: false, holy: true,
                kindle: KINDLE({ magicDamage: 3, intelligence: 1, maxHp: 5 }),
                statModifiers: { magicDamage: 6, intelligence: 2, maxHp: 10 }, description: 'A holy staff hung with a censer. The smoke it gives off is grey, and smells of spring.' },
            'Grey Feather Scythe': { type: 'weapon', slot: 'mainHand', weaponType: 'scythe', hands: 2, damageType: 'magic', rarity: 'legendary', bound: true, unique: true, sellable: false, holy: true,
                kindle: KINDLE({ magicDamage: 3, physicalDamage: 1, maxHp: 8 }),
                statModifiers: { magicDamage: 5, physicalDamage: 2, maxHp: 15 }, description: 'A reaper\'s blade of pale stone on a black haft. Even the holy have harvests.' },
            'Roadworn Blade': { type: 'weapon', slot: 'mainHand', rarity: 'common', statModifiers: { strength: 1 }, sellable: true, sellPrice: 3, description: 'A nicked but serviceable blade.' },
            // ----- Weapons before the Warden (Tokelo, 2026-11-09: "they go from the basic weapon to defeating the warden with
            // literally broken or starter weapons"). docs/design/WEAPONS_BEFORE_THE_WARDEN.md. A three-step ladder per class:
            // starter (+1 damage) -> Bragg's forge in Shamefield (bought, level 2) -> Shamefield's Thanks (Bragg, once the
            // Captain opens the orchard gate, level 3). First-pass numbers for Gauge.
            // Step 2: Bragg's forge. His stock lists only your own class's weapon (shopDefinitions.bragg, `classes`).
            'Tollgate Arming Sword': { type: 'weapon', slot: 'mainHand', weaponType: 'one-hand', hands: 1, damageType: 'physical', legalClasses: ['warrior'],
                itemBaseId: 'Tollgate Arming Sword', itemLevel: 2, requiredLevel: 2, rarity: 'uncommon', affixes: [], unique: false, bound: false, sellable: true, sellPrice: 11,
                statModifiers: { physicalDamage: 2, strength: 1, def: 1 },
                description: 'Bragg forged it from the bars of the old crown\'s tollgate. The iron barred the road for twenty years, and still hits like it.' },
            "Poacher's Hook-Knife": { type: 'weapon', slot: 'mainHand', weaponType: 'one-hand', hands: 1, damageType: 'physical', legalClasses: ['rogue'],
                itemBaseId: "Poacher's Hook-Knife", itemLevel: 2, requiredLevel: 2, rarity: 'uncommon', affixes: [], unique: false, bound: false, sellable: true, sellPrice: 11,
                statModifiers: { physicalDamage: 1, agility: 1, critChance: 0.03 },
                description: 'A Vale hunter\'s knife with a gut-hook on the spine. Bragg swears he never asks whose deer.' },
            'Iron-Shod Ashwood Staff': { type: 'weapon', slot: 'mainHand', weaponType: 'staff', hands: 2, damageType: 'magic', legalClasses: ['mage'],
                itemBaseId: 'Iron-Shod Ashwood Staff', itemLevel: 2, requiredLevel: 2, rarity: 'uncommon', affixes: [], unique: false, bound: false, sellable: true, sellPrice: 11,
                statModifiers: { magicDamage: 2, intelligence: 1, maxHp: 5 },
                description: 'Kloster ash, cut on the hill, with an iron shoe so it does not split when you lean on it. Or hit something with it.' },
            "Sexton's Bone Rod": { type: 'weapon', slot: 'mainHand', weaponType: 'wand', hands: 1, damageType: 'magic', legalClasses: ['necromancer'],
                itemBaseId: "Sexton's Bone Rod", itemLevel: 2, requiredLevel: 2, rarity: 'uncommon', affixes: [], unique: false, bound: false, sellable: true, sellPrice: 11,
                statModifiers: { magicDamage: 1, intelligence: 1, maxHp: 8 },
                description: 'A wand of grave-yew from the Kloster\'s burial ground, capped in iron. Bragg does not ask what you want it for, and charges extra for not asking.' },
            // Step 3: Shamefield's Thanks. The village pays Bragg to forge one weapon for whoever helped all six households
            // (L01 done). Bound: a gift isn't for selling. Each one carries a piece of Chapter One canon (ENSO_LORE_BIBLE.md).
            'Sunbreak': { type: 'weapon', slot: 'mainHand', weaponType: 'one-hand', hands: 1, damageType: 'physical', legalClasses: ['warrior'],
                itemBaseId: 'Sunbreak', itemLevel: 3, requiredLevel: 3, rarity: 'rare', affixes: [], unique: true, bound: true, sellable: false,
                statModifiers: { physicalDamage: 3, strength: 2, def: 1 },
                description: 'Shamefield\'s thanks. Bragg stamped the festival mark on the blade: a sun breaking a crown. He says it suits you. You find you cannot look at it for long.' },
            'Millrace Tanto': { type: 'weapon', slot: 'mainHand', weaponType: 'one-hand', hands: 1, damageType: 'physical', legalClasses: ['rogue'],
                itemBaseId: 'Millrace Tanto', itemLevel: 3, requiredLevel: 3, rarity: 'rare', affixes: [], unique: true, bound: true, sellable: false,
                statModifiers: { physicalDamage: 2, agility: 1, critChance: 0.05 },
                description: 'Shamefield\'s thanks. Ground down from the millwheel\'s broken pin, which Tamsin fished out of the falls once the singing stopped. Single-edged, quick, and always a little wet.' },
            'Bell-Bronze Staff': { type: 'weapon', slot: 'mainHand', weaponType: 'staff', hands: 2, damageType: 'magic', legalClasses: ['mage'],
                itemBaseId: 'Bell-Bronze Staff', itemLevel: 3, requiredLevel: 3, rarity: 'rare', affixes: [], unique: true, bound: true, sellable: false,
                statModifiers: { magicDamage: 3, intelligence: 2, maxHp: 10 },
                description: 'Shamefield\'s thanks. Capped with a shard of the old Kloster bell, the one that rang for an hour a year ago and cracked doing it. It still hums.' },
            'Nameless Stone': { type: 'weapon', slot: 'mainHand', weaponType: 'staff', hands: 2, damageType: 'magic', legalClasses: ['necromancer'],
                itemBaseId: 'Nameless Stone', itemLevel: 3, requiredLevel: 3, rarity: 'rare', affixes: [], unique: true, bound: true, sellable: false,
                statModifiers: { magicDamage: 2, intelligence: 2, maxHp: 15 },
                description: 'Shamefield\'s thanks. A blackthorn staff set with a chip of the memorial stone, the one with no names on it. Something under the chip hums when you hold it, like a crowd heard through a wall.' },
            'Padded Jerkin': { type: 'armor', slot: 'bodyArmor', rarity: 'common', statModifiers: { def: 1 }, sellable: true, sellPrice: 4, description: 'Layers of patched leather and cloth.' },
            'Apprentice Charm': { type: 'accessory', slot: 'accessory', rarity: 'uncommon', statModifiers: { intelligence: 1 }, sellable: true, sellPrice: 3, description: 'An etched brass charm.' },
            'Wild Herbs': { type: 'material', sellable: true, sellPrice: 1, description: 'Common healing herbs.' },
            'Small Coin Purse': { type: 'consumable', use: 'gold', value: 6, sellable: false, description: 'A few coins from an earlier life.' },
            // Shamefield locals (2026-11-02). Quest goods: bound, unsellable, so they add nothing to the economy.
            'Barley Seed':         { type: 'quest', bound: true, sellable: false, description: 'A twist of seed barley from the Kloster granary.' },
            'Barley':              { type: 'quest', bound: true, sellable: false, description: 'Barley from your own bed in the Kloster herb garden.' },
            'Wild Hops':           { type: 'quest', bound: true, sellable: false, description: 'Green, sticky and bitter. Healthy, unlike Fenric\'s.' },
            'Rye Sheaf':           { type: 'quest', bound: true, sellable: false, description: 'Rye from the field behind the square.' },
            'Rye Flour':           { type: 'quest', bound: true, sellable: false, description: 'Coarse and grey, straight off the millstone.' },
            'Sourdough Starter':   { type: 'quest', bound: true, sellable: false, description: 'A jar of Oda\'s starter. It is older than you are. Probably.' },
            'Briarwell Pale':      { type: 'quest', bound: true, sellable: false, description: 'A small cask of pale ale you brewed with Brother Fenric.' },
            'Shamefield Rye Loaf': { type: 'quest', bound: true, sellable: false, description: 'Dark rye with a crust that cracks when you look at it.' },
            "Elian's Letter":      { type: 'quest', bound: true, sellable: false, description: 'Folded twice. A list of names, and the roads where they were last seen.' },
            // The Broken Crown rework (2026-11-11): the clues that lead from your house to the Broken Oath. Quest goods too.
            'Torn Salvage Order':  { type: 'quest', bound: true, sellable: false, description: 'Left under a stone on your grounds. OLD CROWN GOODS BOUGHT, and a seal you do not know.' },
            'Ash-Marked Orders':   { type: 'quest', bound: true, sellable: false, description: 'Orders on grey paper for armed men on the north road, signed with an open circle drawn in ash.' },

            // ----- The kitchen (Tokelo, 2026-11-02; docs/design/COOKING_AND_FOOD.md). Gauge's first pass on every number.
            // Food: use 'meal' | 'drink', heal (HP at once), seconds (buff length, never over foodRules.maxSeconds) and
            // mods (damage / defence / crit / speed shares, regen HP per second). Engine: src/engine/kitchen.js.
            // Seeds and young animals (cropDefinitions says where each goes)
            'Wheat Seed':     { type: 'material', sellable: true, sellPrice: 1, description: 'Seed wheat. Plant it in a field or garden bed.' },
            'Seed Potato':    { type: 'material', sellable: true, sellPrice: 1, description: 'A sprouting potato. Plant it and it makes more of itself.' },
            'Cabbage Seed':   { type: 'material', sellable: true, sellPrice: 1, description: 'A twist of cabbage seed. Sauerkraut, eventually.' },
            'Onion Set':      { type: 'material', sellable: true, sellPrice: 1, description: 'Little onion bulbs for planting.' },
            'Cannabis Seed':  { type: 'material', sellable: true, sellPrice: 2, description: "One of Shane's seeds. It only grows on your own homestead field. \"For medicine,\" he says." },
            'Piglet':         { type: 'material', sellable: false, description: 'A piglet from Greta Rusk. It needs a sty, and feeding.' },
            'Hen':            { type: 'material', sellable: false, description: 'A speckled hen. Give her a coop and grain and she lays eggs.' },
            // Ingredients: farmed, foraged, dropped, bought or given
            'Wheat':          { type: 'material', sellable: true, sellPrice: 1, description: 'Ripe wheat. Grind it at the watermill for flour, or brew it into Weizen.' },
            'Potato':         { type: 'material', sellable: true, sellPrice: 1, description: 'A good, dirty potato.' },
            'Cabbage':        { type: 'material', sellable: true, sellPrice: 1, description: 'A head of white cabbage.' },
            'Onion':          { type: 'material', sellable: true, sellPrice: 1, description: 'Makes everything better, and you cry.' },
            'Cannabis Leaf':  { type: 'material', sellable: true, sellPrice: 2, description: "Sticky, fragrant, and Shane swears it's medicinal. Bake it into a brownie." },
            'Flour':          { type: 'material', sellable: true, sellPrice: 1, description: 'Wheat flour, fine and white.' },
            'Egg':            { type: 'material', sellable: true, sellPrice: 1, description: 'A brown egg, still warm.' },
            'Pork':           { type: 'material', sellable: true, sellPrice: 2, description: 'Good pork: schnitzel, sausage, Mett.' },
            'Rat Meat':       { type: 'material', sellable: false, description: 'Stringy rat meat. Cook it long enough and it is goulash.' },
            'Wolf Meat':      { type: 'material', sellable: false, description: 'Tough, gamey wolf meat. Goulash meat.' },
            'Fresh Milk':     { type: 'material', sellable: true, sellPrice: 1, description: 'A jug of milk. Only from a shop, or a grateful neighbour.' },
            'Cheese':         { type: 'material', sellable: true, sellPrice: 2, description: 'A wedge of mountain cheese, for Käsespätzle.' },
            'Butter':         { type: 'material', sellable: true, sellPrice: 1, description: 'A crock of salted butter.' },
            'Chanterelles':   { type: 'material', sellable: true, sellPrice: 1, description: 'Golden Pfifferlinge from the woods. Soup, or a Jäger sauce.' },
            'Apple':          { type: 'material', sellable: true, sellPrice: 1, description: 'A tart orchard apple.' },
            // German dishes (at least ten, Tokelo): crafted at a hearth or oven, some sold in Shamefield
            'Brötchen':         { type: 'consumable', use: 'meal', heal: 6, sellable: true, sellPrice: 1, description: 'A crusty white bread roll. Fine on its own, better cooked: take it to your homestead hearth with Pork for a Leberkäsbrötchen, add Onion for Mettbrötchen, or Milk and an Egg for Semmelknödel.' },
            'Brezel':           { type: 'consumable', use: 'meal', heal: 10, seconds: 90, mods: { speed: 0.05 }, sellable: true, sellPrice: 1, description: 'A salted pretzel, eaten walking.' },
            'Bratwurst':        { type: 'consumable', use: 'meal', heal: 18, seconds: 150, mods: { damage: 0.06 }, sellable: true, sellPrice: 2, description: 'A grilled pork sausage.' },
            'Leberkäsbrötchen': { type: 'consumable', use: 'meal', heal: 22, seconds: 150, mods: { defence: 0.06 }, sellable: true, sellPrice: 3, description: 'A thick hot slice of Leberkäse in a roll, with mustard.' },
            'Mettbrötchen':     { type: 'consumable', use: 'meal', heal: 20, seconds: 150, mods: { damage: 0.08 }, sellable: true, sellPrice: 2, description: 'Raw seasoned pork on a roll, with onion. Brave, and good.' },
            'Schnitzel':        { type: 'consumable', use: 'meal', heal: 30, seconds: 180, mods: { damage: 0.12 }, sellable: true, sellPrice: 4, description: 'Pork beaten thin, breaded and fried golden.' },
            'Jägerschnitzel':   { type: 'consumable', use: 'meal', heal: 35, seconds: 180, mods: { damage: 0.12, crit: 0.05 }, sellable: true, sellPrice: 5, description: "Schnitzel under a hunter's sauce of chanterelles." },
            'Käsespätzle':      { type: 'consumable', use: 'meal', heal: 30, seconds: 180, mods: { defence: 0.10 }, sellable: true, sellPrice: 4, description: 'Egg noodles baked with cheese and crisp onions. Heavy armour for the stomach.' },
            'Semmelknödel':     { type: 'consumable', use: 'meal', heal: 25, seconds: 180, mods: { regen: 1 }, sellable: true, sellPrice: 3, description: 'Bread dumplings: old rolls, milk and egg, boiled round.' },
            'Sauerkraut':       { type: 'consumable', use: 'meal', heal: 10, seconds: 180, mods: { regen: 0.5 }, sellable: true, sellPrice: 1, description: 'Fermented cabbage. Sour, and it keeps you going.' },
            'Kartoffelsalat':   { type: 'consumable', use: 'meal', heal: 20, seconds: 180, mods: { speed: 0.08 }, sellable: true, sellPrice: 2, description: 'Potato salad with onion and vinegar, Swabian style.' },
            'Pilzsuppe':        { type: 'consumable', use: 'meal', heal: 25, seconds: 150, mods: { regen: 0.5, defence: 0.04 }, sellable: true, sellPrice: 2, description: 'Creamy chanterelle soup.' },
            'Apfelstrudel':     { type: 'consumable', use: 'meal', heal: 25, seconds: 180, mods: { crit: 0.06, speed: 0.04 }, sellable: true, sellPrice: 3, description: 'Apples and butter rolled in pastry thin enough to read through.' },
            // Low tier (Tokelo): meat off rats and wolves. It heals and helps a little, never much.
            'Rattengulasch':    { type: 'consumable', use: 'meal', heal: 12, seconds: 90, mods: { regen: 0.3 }, sellable: false, description: "Rat goulash. Don't ask. It's hot, at least." },
            'Wolfsgulasch':     { type: 'consumable', use: 'meal', heal: 16, seconds: 120, mods: { damage: 0.04 }, sellable: false, description: 'Wolf goulash, stewed with herbs until it gives up.' },
            // Shane's cannabis (Tokelo): grown on your own field, baked into a brownie with extra buffs.
            "Shane's Brownie":  { type: 'consumable', use: 'meal', heal: 20, seconds: 180, mods: { damage: 0.10, defence: 0.10, regen: 1, crit: 0.05 }, sellable: false, description: 'A dense, green-flecked brownie. Everything feels fine. Better than fine.' },
            // Beer (Tokelo: semi-OP, and more than four inverts the controls). Brewed with Brother Fenric or bought from him.
            'Helles':           { type: 'consumable', use: 'drink', heal: 5, seconds: 90, mods: { damage: 0.15 }, sellable: true, sellPrice: 2, description: 'A pale, clean lager. Courage in a mug.' },
            'Dunkel':           { type: 'consumable', use: 'drink', heal: 5, seconds: 90, mods: { defence: 0.12, regen: 0.5 }, sellable: true, sellPrice: 2, description: 'A dark malty lager. You feel thicker-skinned already.' },
            'Weizen':           { type: 'consumable', use: 'drink', heal: 5, seconds: 90, mods: { crit: 0.08, speed: 0.06 }, sellable: true, sellPrice: 2, description: 'Cloudy wheat beer, banana and clove. Quick on your feet, sharp in the eye.' },

            // ----- The Hrimvald kitchen (Tokelo, 2026-11-13; docs/design/NORSE_KITCHEN.md). Chapter Two's own food:
            // fish from Solveig in Skeldvik, mutton and dairy from Gudrun in Hrafnholm, berries off the fells, and mead
            // from Aslaug at the Stormtide Inn. Same rules as the German kitchen (foodRules); Gauge's first pass.
            // Ingredients
            'Herring':        { type: 'material', sellable: true, sellPrice: 1, description: 'Silver herring, salted in the cask. Smoke it, or ask Solveig what else she does with it. Then wish you had not.' },
            'Salmon':         { type: 'material', sellable: true, sellPrice: 2, description: 'A side of fjord salmon, red as a sunset. Cure it with herbs for gravlax.' },
            'Stockfish':      { type: 'material', sellable: true, sellPrice: 1, description: 'Cod dried hard on the Skeldvik racks. It keeps for years, and needs a day in water and a pot to forgive you.' },
            'Mutton':         { type: 'material', sellable: true, sellPrice: 2, description: 'Hill mutton from Gudrun\'s flock. Stew it with cabbage, or roast it with lingonberries.' },
            'Honey':          { type: 'material', sellable: true, sellPrice: 1, description: 'A crock of dark heather honey. Most of it in Hrimvald ends up as mead.' },
            'Sour Cream':     { type: 'material', sellable: true, sellPrice: 1, description: 'Thick soured cream. Bought, like all dairy: porridge-makers swear by it.' },
            'Lingonberries':  { type: 'material', sellable: true, sellPrice: 1, description: 'Small, red and sharp. They grow on every fell in Hrimvald and go with everything.' },
            'Cloudberries':   { type: 'material', sellable: true, sellPrice: 2, description: 'Amber berries off the high bogs, rare and prized. Stirred into skyr, they are a feast.' },
            'Juniper Berries':{ type: 'material', sellable: true, sellPrice: 1, description: 'Blue-black juniper from the pass. Farmhouse brewers filter their ale through the branches.' },
            // Norse dishes
            'Flatbread':        { type: 'consumable', use: 'meal', heal: 6, sellable: true, sellPrice: 1, description: 'Thin, crisp flatbread baked on a stone. It keeps all winter. Fine alone, better under gravlax or smoked herring.' },
            'Skyr':             { type: 'consumable', use: 'meal', heal: 10, seconds: 120, mods: { regen: 0.5 }, sellable: true, sellPrice: 1, description: 'Thick, tart cultured milk, eaten with a spoon. Bought, like all dairy. Add cloudberries at a hearth.' },
            'Cloudberry Skyr':  { type: 'consumable', use: 'meal', heal: 20, seconds: 180, mods: { crit: 0.05, speed: 0.05 }, sellable: true, sellPrice: 3, description: 'Skyr with cloudberries and a drizzle of honey. Children in Hrimvald behave for a year to get this.' },
            'Smoked Herring':   { type: 'consumable', use: 'meal', heal: 14, seconds: 120, mods: { damage: 0.05 }, sellable: true, sellPrice: 2, description: 'Herring smoked golden over juniper. Harbour food: eaten standing up, with your fingers.' },
            'Gravlax':          { type: 'consumable', use: 'meal', heal: 22, seconds: 150, mods: { crit: 0.08 }, sellable: true, sellPrice: 3, description: 'Salmon cured under salt and herbs, sliced thin. A sharp eye comes with it.' },
            'Fårikål':          { type: 'consumable', use: 'meal', heal: 30, seconds: 180, mods: { defence: 0.10 }, sellable: true, sellPrice: 4, description: 'Mutton and cabbage stewed for hours with whole peppercorns. A winter coat you eat.' },
            'Lingonberry Mutton':{ type: 'consumable', use: 'meal', heal: 32, seconds: 180, mods: { damage: 0.12 }, sellable: true, sellPrice: 4, description: 'Roast mutton under a sharp lingonberry sauce. The feast-table dish at Hrafnholm.' },
            'Stockfish Stew':   { type: 'consumable', use: 'meal', heal: 28, seconds: 180, mods: { regen: 1 }, sellable: true, sellPrice: 3, description: 'Stockfish soaked soft and stewed with potato and butter. Sailors swear it put them back together.' },
            'Rømmegrøt':        { type: 'consumable', use: 'meal', heal: 25, seconds: 180, mods: { defence: 0.06, regen: 0.5 }, sellable: true, sellPrice: 3, description: 'Sour-cream porridge, butter pooled on top. Rich enough to sleep on.' },
            // Fermented Baltic herring (Tokelo: a prank quest, C2S1). It works. Nobody stands near you, and that includes your enemies.
            'Surströmming':     { type: 'consumable', use: 'meal', heal: 15, seconds: 180, mods: { defence: 0.15, damage: 0.05 }, sellable: true, sellPrice: 3, description: 'Herring soured in the cask until it fights back. Eat it outdoors, downwind of everyone you love.' },
            // Hakon's camp kit (C2S2, Tokelo 2026-11-13): use it anywhere out of a fight to make camp and cook that region's food.
            'Camp Kit':         { type: 'tool', use: 'camp', opens: 'camp_hearth', bound: true, sellable: false, description: "Hakon's carter's kit: a fire-pot, a folding iron tripod, a flint and a twist of juniper tinder. Use it to make camp and cook wherever you are." },
            'Cask of Surströmming': { type: 'quest', bound: true, sellable: false, description: "Solveig's oldest cask of sour herring, the lid bulging like a drum. Do not open it near anything you like." },
            // Mead and ale (use 'drink'): they stack and make you Tipsy like beer, and the 5th drink in 2 minutes makes you Drunk.
            'Mead':             { type: 'consumable', use: 'drink', heal: 8, seconds: 120, mods: { damage: 0.12, regen: 0.5 }, sellable: true, sellPrice: 3, description: 'Honey mead from the Stormtide casks, gold and strong. Skalds say it is where poetry comes from.' },
            'Lingonberry Mead': { type: 'consumable', use: 'drink', heal: 8, seconds: 120, mods: { crit: 0.08, defence: 0.08 }, sellable: true, sellPrice: 3, description: 'Mead steeped with lingonberries, red and tart. Steady hands, steady nerve.' },
            'Juniper Ale':      { type: 'consumable', use: 'drink', heal: 5, seconds: 90, mods: { defence: 0.10, speed: 0.06 }, sellable: true, sellPrice: 2, description: 'Cloudy farmhouse ale filtered through juniper branches. Piney, smoky, and stronger than it tastes.' }
        };

        // Global balance knobs.
        // The kitchen (Gauge, 2026-11-02, first pass; docs/design/COOKING_AND_FOOD.md). Food buffs are a separate,
        // long category from fight buffs (realtimeRules.statuses.buffs, 6 to 15 s): up to 3 minutes (Tokelo).
        const foodRules = {
            maxSeconds: 180,          // no meal or drink lasts longer than 3 minutes (Tokelo)
            sameDishStacks: 2,        // eating the same dish again refreshes it and adds a stack, up to this
            drinkStacks: 3,           // the same beer stacks higher: that's what makes it semi-OP
            fullAt: 4,                // four different dishes at once and you're full (beer doesn't count)
            caps: { damage: 0.75, defence: 0.5, crit: 0.35, speed: 0.4, regen: 5 },   // totals over every meal and beer
            drunk: { beersBeforeDrunk: 4, tipsySeconds: 120, seconds: 20 },  // the 5th beer inside 2 minutes: controls inverted 20 s
            // Regional cooking (Tokelo, 2026-11-13): a region's public hearths cook that region's dishes; your home hearth
            // cooks every region's; a recipe with region 'any' (rat goulash) cooks anywhere. A recipe without a region,
            // and a map in no region below, belong to homeRegion. The camp kit cooks the region you stand in.
            homeRegion: 'blackbriar',
            regions: { hrimvald: { name: 'Hrimvald', maps: ['frostspine_pass', 'skeldvik', 'stormtide_inn', 'hrafnholm', 'hall_of_winter'] } }
        };
        const gameRules = {
            statDamagePer: 4,          // +1 damage per 4 points of the scaling stat
            physicalStat: { default: 'strength', rogue: 'agility', mage: 'intelligence', necromancer: 'intelligence' },   // Gauge 2026-11-01: caster staff bolts scale with INT
            magicStat: 'intelligence',
            magicTypes: ['magic', 'fire', 'ice', 'lightning', 'radiant'],
            postFightHealPct: 0.2,     // catch your breath after a victory
            baseMinionCap: 3,          // Black Pharaoh adds +3
            defaultEnemyXp: 15,
            critChanceCap: 0.5,        // level-up crit growth stops here
            // Hunting grounds (Tokelo 2026-11-04: a way to reach level 4 to 5 before the Crow Warden). A night in the
            // homestead bed brings these beaten encounters back for their XP again. Loot claims and quest credit stay once-only.
            restRespawns: ['grounds_weed_rats', 'road_wolf'],
            // Fallback growth for a class without its own `levelGrowth` (the old flat increase).
            defaultLevelGrowth: { hp: 10, strength: 1, intelligence: 1, agility: 1, def: 1, critChance: 0.01, resource: 2 }
        };

        // Item swaps per class when picking things up (was referenced but never defined).
        // Example: 'Ritual Dagger': { necromancer: 'Bone-Hilted Ritual Dagger' }
        const adaptiveLoot = {};

        // Every skill knows its own name (the engine relies on skill.name).
        for (const key of Object.keys(skillDefinitions)) skillDefinitions[key].name = key;

        // LOOT-001 / issues #169–170. Authored economy candidates; balance sign-off remains with QA.
        const lootProfiles = {
            "humanoid": {
                "gold": 1,
                "material": 0.35,
                "equipment": 0.12,
                "consumable": 0.12,
                "materials": [
                    [
                        "Scrap Metal",
                        40
                    ],
                    [
                        "Worn Cloth",
                        30
                    ],
                    [
                        "Damaged Leather",
                        30
                    ]
                ]
            },
            "beast": {
                "gold": 0,
                "material": 0.85,
                "equipment": 0,
                "consumable": 0,
                "materials": [
                    [
                        "Raw Meat",
                        45
                    ],
                    [
                        "Rough Hide",
                        35
                    ],
                    [
                        "Fang/Bone",
                        20
                    ]
                ]
            },
            "undead": {
                "gold": 0,
                "material": 0.7,
                "equipment": 0.03,
                "consumable": 0.03,
                "materials": [
                    [
                        "Bone Fragment",
                        50
                    ],
                    [
                        "Grave Dust",
                        30
                    ],
                    [
                        "Tattered Remnant",
                        20
                    ]
                ]
            },
            "monstrosity": {
                "gold": 0,
                "material": 0.75,
                "equipment": 0.04,
                "consumable": 0,
                "materials": [
                    [
                        "Strange Gland",
                        50
                    ],
                    [
                        "Carapace Shard",
                        30
                    ],
                    [
                        "Tainted Residue",
                        20
                    ]
                ]
            },
            "construct": {
                "gold": 0,
                "material": 0.8,
                "equipment": 0.05,
                "consumable": 0,
                "materials": [
                    [
                        "Scrap Metal",
                        50
                    ],
                    [
                        "Mechanism Part",
                        35
                    ],
                    [
                        "Charged Fragment",
                        15
                    ]
                ]
            },
            "demon": {
                "gold": 0.2,
                "material": 0.65,
                "equipment": 0.15,
                "consumable": 0.08,
                "materials": [
                    [
                        "Abyssal Ash",
                        50
                    ],
                    [
                        "Demon Horn Shard",
                        30
                    ],
                    [
                        "Otherworld Residue",
                        20
                    ]
                ]
            },
            "guardian": {
                // Tokelo, playtest 2026-11-11: "killing the first boss gave me zero gold". A guardian boss now carries a
                // purse (L3 Warden: 13-22 Gold on the ground where he falls), on top of the seal's 20 Gold treasury.
                "gold": 0.5,
                "material": 0.25,
                "equipment": 0,
                "consumable": 0,
                "materials": []
            },
            "sentient_looter": {
                "gold": 0.75,
                "material": 0.45,
                "equipment": 0.1,
                "consumable": 0,
                "materials": [
                    [
                        "Scrap Metal",
                        40
                    ],
                    [
                        "Worn Cloth",
                        30
                    ],
                    [
                        "Damaged Leather",
                        30
                    ]
                ]
            }
        };
        Object.assign(itemDefinitions, {
            "Raw Meat": {
                "type": "material",
                "sellable": true,
                "sellPrice": 2,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Rough Hide": {
                "type": "material",
                "sellable": true,
                "sellPrice": 3,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Fang/Bone": {
                "type": "material",
                "sellable": true,
                "sellPrice": 1,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Scrap Metal": {
                "type": "material",
                "sellable": true,
                "sellPrice": 3,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Worn Cloth": {
                "type": "material",
                "sellable": true,
                "sellPrice": 1,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Damaged Leather": {
                "type": "material",
                "sellable": true,
                "sellPrice": 2,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Bone Fragment": {
                "type": "material",
                "sellable": true,
                "sellPrice": 1,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Grave Dust": {
                "type": "material",
                "sellable": true,
                "sellPrice": 3,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Tattered Remnant": {
                "type": "material",
                "sellable": true,
                "sellPrice": 1,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Strange Gland": {
                "type": "material",
                "sellable": true,
                "sellPrice": 4,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Carapace Shard": {
                "type": "material",
                "sellable": true,
                "sellPrice": 3,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Tainted Residue": {
                "type": "material",
                "sellable": true,
                "sellPrice": 2,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Mechanism Part": {
                "type": "material",
                "sellable": true,
                "sellPrice": 5,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Charged Fragment": {
                "type": "material",
                "sellable": true,
                "sellPrice": 6,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Abyssal Ash": {
                "type": "material",
                "sellable": true,
                "sellPrice": 4,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Demon Horn Shard": {
                "type": "material",
                "sellable": true,
                "sellPrice": 6,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Otherworld Residue": {
                "type": "material",
                "sellable": true,
                "sellPrice": 5,
                "description": "Trade / crafting material. No recipe required to sell."
            },
            "Old Cellar Purse": {
                "type": "consumable",
                "use": "gold",
                "value": 10,
                "sellable": false,
                "description": "An abandoned purse containing 10 Gold."
            },
            "Village Supply Parcel": {
                "type": "quest",
                "bound": true,
                "sellable": false,
                "description": "Mara’s supplies for Tamsin."
            },
            // Fenrir's Heir: the Hunt of Sun and Moon (quest CL1, docs/design/FENRIRS_HEIR.md). Laid on the stone at the Wolf's Wake.
            "Sun Fang": { "type": "quest", "bound": true, "unique": true, "sellable": false, "description": "A wolf's tooth the size of your hand, warm as a stone left in the sun. It smells of smoke." },
            "Moon Fang": { "type": "quest", "bound": true, "unique": true, "sellable": false, "description": "A wolf's tooth the size of your hand, so cold it aches to hold. In the dark it is darker than the dark." },
            "Birkholt Name Tablet": {
                "type": "quest",
                "bound": true,
                "unique": true,
                "sellable": false,
                "description": "A wooden tablet carved with forty names of the six hundred, from the village of Birkholt. Raiders wanted it badly."
            },
            "Seal-Key of the First Echo": {
                "type": "quest",
                "bound": true,
                "unique": true,
                "sellable": false,
                "description": "The Warden’s irreplaceable seal key."
            },
            "Rusty Sword": {
                "type": "weapon",
                "slot": "mainHand",
                "weaponType": "one-hand",
                "hands": 1,
                "damageType": "physical",
                "legalClasses": [
                    "warrior"
                ],
                "statModifiers": {
                    "physicalDamage": 1
                },
                "itemBaseId": "Rusty Sword",
                "itemLevel": 1,
                "requiredLevel": 1,
                "rarity": "common",
                "affixes": [],
                "sellable": true,
                "sellPrice": 1,
                "shopPrice": 2,
                "unique": false,
                "bound": false,
                "description": "Rusty Sword. Starter equipment."
            },
            "Wooden Shield": {
                "type": "armor",
                "slot": "offHand",
                "weaponType": "shield",
                "hands": 1,
                "damageType": null,
                "legalClasses": [
                    "warrior"
                ],
                "statModifiers": {
                    "def": 1
                },
                "itemBaseId": "Wooden Shield",
                "itemLevel": 1,
                "requiredLevel": 1,
                "rarity": "common",
                "affixes": [],
                "sellable": true,
                "sellPrice": 1,
                "shopPrice": 2,
                "unique": false,
                "bound": false,
                "description": "Wooden Shield. Starter equipment."
            },
            "Short Sword": {
                "type": "weapon",
                "slot": "mainHand",
                "weaponType": "one-hand",
                "hands": 1,
                "damageType": "physical",
                "legalClasses": [
                    "rogue",
                    "warrior"
                ],
                "statModifiers": {
                    "physicalDamage": 1
                },
                "itemBaseId": "Short Sword",
                "itemLevel": 1,
                "requiredLevel": 1,
                "rarity": "common",
                "affixes": [],
                "sellable": true,
                "sellPrice": 1,
                "shopPrice": 2,
                "unique": false,
                "bound": false,
                "description": "Short Sword. Starter equipment."
            },
            "Wooden Staff": {
                "type": "weapon",
                "slot": "mainHand",
                "weaponType": "staff",
                "hands": 2,
                "damageType": "magic",
                "legalClasses": [
                    "mage"
                ],
                "statModifiers": {
                    "magicDamage": 1
                },
                "itemBaseId": "Wooden Staff",
                "itemLevel": 1,
                "requiredLevel": 1,
                "rarity": "common",
                "affixes": [],
                "sellable": true,
                "sellPrice": 1,
                "shopPrice": 2,
                "unique": false,
                "bound": false,
                "description": "Wooden Staff. Starter equipment."
            },
            "Cracked Bone Staff": {
                "type": "weapon",
                "slot": "mainHand",
                "weaponType": "staff",
                "hands": 2,
                "damageType": "magic",
                "legalClasses": [
                    "necromancer"
                ],
                "statModifiers": {
                    "magicDamage": 1
                },
                "itemBaseId": "Cracked Bone Staff",
                "itemLevel": 1,
                "requiredLevel": 1,
                "rarity": "common",
                "affixes": [],
                "sellable": true,
                "sellPrice": 1,
                "shopPrice": 2,
                "unique": false,
                "bound": false,
                "description": "Cracked Bone Staff. Starter equipment."
            }
        });
        const equipmentMetadata = {
            "Roadworn Blade": {
                "itemBaseId": "Roadworn Blade",
                "itemLevel": 1,
                "requiredLevel": 1,
                "legalClasses": [
                    "warrior",
                    "rogue"
                ],
                "hands": 1,
                "weaponType": "one-hand",
                "damageType": "physical",
                "unique": false,
                "bound": false
            },
            "Padded Jerkin": {
                "itemBaseId": "Padded Jerkin",
                "itemLevel": 1,
                "requiredLevel": 1,
                "legalClasses": [
                    "warrior",
                    "mage",
                    "rogue",
                    "necromancer"
                ],
                "hands": 0,
                "weaponType": "armor",
                "damageType": null,
                "unique": false,
                "bound": false
            },
            "Apprentice Charm": {
                "itemBaseId": "Apprentice Charm",
                "itemLevel": 1,
                "requiredLevel": 1,
                "legalClasses": [
                    "mage",
                    "necromancer"
                ],
                "hands": 0,
                "weaponType": "arcane-accessory",
                "damageType": "magic",
                "unique": false,
                "bound": false
            }
        };
        for (const [id, fields] of Object.entries(equipmentMetadata)) Object.assign(itemDefinitions[id], fields);
        const equipmentAffixes = {
            "keen": {
                "name": "Keen",
                "family": "keen",
                "types": [
                    "one-hand",
                    "staff"
                ],
                "modifiers": {
                    "critChance": 0.02
                }
            },
            "stalwart": {
                "name": "Stalwart",
                "family": "stalwart",
                "types": [
                    "armor",
                    "shield",
                    "arcane-accessory"
                ],
                "modifiers": {
                    "maxHp": 5
                }
            },
            "focused": {
                "name": "Focused",
                "family": "focused",
                "types": [
                    "staff",
                    "wand",
                    "arcane-accessory"
                ],
                "modifiers": {
                    "intelligence": 1
                }
            },
            "brutal": {
                "name": "Brutal",
                "family": "brutal",
                "types": [
                    "one-hand"
                ],
                "modifiers": {
                    "physicalDamage": 1
                }
            },
            "arcanist": {
                "name": "Arcanist",
                "family": "arcanist",
                "types": [
                    "staff",
                    "wand",
                    "arcane-accessory"
                ],
                "modifiers": {
                    "magicDamage": 1
                }
            },
            "guarding": {
                "name": "Guarding",
                "family": "guarding",
                "types": [
                    "armor",
                    "shield"
                ],
                "modifiers": {
                    "def": 1
                }
            }
        };
        const equipmentRarities = {
            "common": {
                "weight": 650,
                "multiplier": 1,
                "affixes": 0,
                "price": 1,
                "minLevel": 1
            },
            "uncommon": {
                "weight": 250,
                "multiplier": 1.15,
                "affixes": 1,
                "price": 1.5,
                "minLevel": 1
            },
            "rare": {
                "weight": 80,
                "multiplier": 1.35,
                "affixes": 2,
                "price": 2.5,
                "minLevel": 4
            },
            "epic": {
                "weight": 18,
                "multiplier": 1.65,
                "affixes": 3,
                "price": 5,
                "minLevel": 7
            },
            "legendary": {
                "weight": 2,
                "multiplier": 1,
                "affixes": null,
                "price": 12,
                "minLevel": 10
            }
        };
        const lootTables = {
            chapter1: { equipment: [
                { itemBaseId: 'Rusty Sword', weight: 2 }, { itemBaseId: 'Short Sword', weight: 2 },
                { itemBaseId: 'Wooden Staff', weight: 2 }, { itemBaseId: 'Cracked Bone Staff', weight: 2 },
                { itemBaseId: 'Wooden Shield', weight: 1 }, { itemBaseId: 'Padded Jerkin', weight: 2 },
                { itemBaseId: 'Apprentice Charm', weight: 1 }
            ], consumables: [{ item: 'Bandages', weight: 1 }, { item: 'Healing Herb Bundle', weight: 1 }] }
        };
        const enemyLoot = {
            "James_Newton": [
                10,
                "humanoid",
                "elite"
            ],
            "weak_goblin": [
                1,
                "humanoid",
                "common"
            ],
            "hungry_wolf": [
                1,
                "beast",
                "elite"
            ],
            "pack_wolf": [
                1,
                "beast",
                "common"
            ],
            "shackled_ghoul": [
                1,
                "undead",
                "common"
            ],
            "rust_rat": [
                1,
                "beast",
                "common"
            ],
            "cellar_vermin": [
                1,
                "beast",
                "common"
            ],
            "drunken_shade": [
                1,
                "undead",
                "common"
            ],
            "bone_gnawer": [
                1,
                "undead",
                "common"
            ],
            "mire_lurker": [
                2,
                "monstrosity",
                "common"
            ],
            "cult_acolyte": [
                2,
                "humanoid",
                "common"
            ],
            "cult_zealot": [
                2,
                "humanoid",
                "common"
            ],
            "carrion_crow": [
                1,
                "beast",
                "common"
            ],
            "shackled_ghoul_stronger": [
                2,
                "undead",
                "elite"
            ],
            "watch_constable": [
                2,
                "humanoid",
                "common"
            ],
            "crow_touched_warden": [
                3,
                "guardian",
                "boss"
            ],
            "wolfbanner_raider": [
                3,
                "humanoid",
                "common"
            ],
            "wolfbanner_skirmisher": [
                3,
                "humanoid",
                "common"
            ],
            "wolfbanner_ringleader": [
                3,
                "humanoid",
                "elite"
            ],
            "oath_sergeant": [
                2,
                "humanoid",
                "elite"
            ],
            "sunscorched_wolf": [
                3,
                "beast",
                "common"
            ],
            "moonless_wolf": [
                3,
                "beast",
                "common"
            ]
        };
        for (const [id, [lootLevel, lootProfile, lootRank]] of Object.entries(enemyLoot))
            Object.assign(enemies[id], { lootLevel, lootProfile, lootRank, lootTable: 'chapter1' });
        enemies.crow_touched_warden.materialDrops = false;
        // Meat for the pot (the kitchen, Tokelo 2026-11-02): rats and wolves always leave some. Goulash, not glory.
        for (const id of ['rust_rat', 'cellar_vermin']) enemies[id].foodDrops = [{ item: 'Rat Meat' }];
        for (const id of ['hungry_wolf', 'pack_wolf', 'sunscorched_wolf']) enemies[id].foodDrops = [{ item: 'Wolf Meat' }];
        // Every food and drink is its own status (named after the dish), so different dishes stack with each other.
        for (const [name, d] of Object.entries(itemDefinitions)) {
            if (d.use !== 'meal' && d.use !== 'drink') continue;
            if (d.mods) statusDefinitions[name] = { category: 'buff', maxStacks: d.use === 'drink' ? foodRules.drinkStacks : foodRules.sameDishStacks };
            const pct = (v) => `${Math.round(v * 100)}%`, m = d.mods || {}, parts = [];
            if (m.damage) parts.push(`+${pct(m.damage)} damage`);
            if (m.defence) parts.push(`-${pct(m.defence)} damage taken`);
            if (m.crit) parts.push(`+${pct(m.crit)} crit`);
            if (m.speed) parts.push(`+${pct(m.speed)} speed`);
            if (m.regen) parts.push(`+${m.regen} HP/s`);
            d.effectText = `Heals ${d.heal || 0}${parts.length ? `; ${parts.join(', ')} for ${Math.min(d.seconds || foodRules.maxSeconds, foodRules.maxSeconds)} s` : ''}.`;
        }
        statusDefinitions['Tipsy'] = { category: 'other', maxStacks: 99 };   // one stack per beer (foodRules.drunk)
        statusDefinitions['Drunk'] = { category: 'debuff', maxStacks: 1 };   // controls inverted
        enemies.crow_touched_warden.bossDrops = [{ item: 'Seal-Key of the First Echo', storyKey: 'item:crow_warden_memory_key' }];
        for (const cls of Object.values(basePlayerClasses)) for (const id of cls.startingItems) {
            if (!Object.keys(itemDefinitions).some(name => name.toLowerCase() === id.toLowerCase()))
                itemDefinitions[id] = { type: 'utility', bound: true, sellable: false, description: 'A personal keepsake or utility item.' };
        }
        const starterEquipment = { warrior: ['Rusty Sword', 'Wooden Shield'], rogue: ['Short Sword'], mage: ['Wooden Staff'], necromancer: ['Cracked Bone Staff'] };

        const data = {
            lootProfiles, lootTables, equipmentAffixes, equipmentRarities, starterEquipment,
            shopDefinitions: {
                // Dairy is store-bought or a quest gift (Tokelo): Mara keeps milk, cheese, butter and eggs.
                mara: { stock: { 'Moldy Bread': { buyPrice: 3, quantity: 6 }, 'Bandages': { buyPrice: 8, quantity: 4 }, 'Padded Jerkin': { buyPrice: 12, quantity: 2 },
                    'Fresh Milk': { buyPrice: 3, quantity: 10 }, 'Cheese': { buyPrice: 5, quantity: 8 }, 'Butter': { buyPrice: 3, quantity: 8 }, 'Egg': { buyPrice: 2, quantity: 12 },
                    'Flour': { buyPrice: 3, quantity: 10 }, 'Onion': { buyPrice: 2, quantity: 10 } } },
                // Bragg's forge (2026-11-09, WEAPONS_BEFORE_THE_WARDEN.md): one weapon per class; `classes` lists it only for them.
                bragg: { stock: { 'Roadworn Blade': { buyPrice: 10, quantity: 2 }, 'Padded Jerkin': { buyPrice: 12, quantity: 2 },
                    'Tollgate Arming Sword': { buyPrice: 24, quantity: 1, classes: ['warrior'] }, "Poacher's Hook-Knife": { buyPrice: 24, quantity: 1, classes: ['rogue'] },
                    'Iron-Shod Ashwood Staff': { buyPrice: 24, quantity: 1, classes: ['mage'] }, "Sexton's Bone Rod": { buyPrice: 24, quantity: 1, classes: ['necromancer'] } } },
                iona: { stock: { 'Healing Herb Bundle': { buyPrice: 12, quantity: 5 }, 'Bandages': { buyPrice: 8, quantity: 3 }, 'Wild Herbs': { buyPrice: 3, quantity: 6 } } },
                shane: { stock: { 'Healing Herb Bundle': { buyPrice: 10, quantity: 4 }, 'Wild Herbs': { buyPrice: 2, quantity: 8 }, 'Apprentice Charm': { buyPrice: 9, quantity: 1 },
                    // Shane grows what he sells (Tokelo): seed for your field, and his own cannabis.
                    'Cannabis Seed': { buyPrice: 5, quantity: 6 }, 'Wheat Seed': { buyPrice: 2, quantity: 10 }, 'Seed Potato': { buyPrice: 2, quantity: 10 },
                    'Cabbage Seed': { buyPrice: 2, quantity: 10 }, 'Onion Set': { buyPrice: 2, quantity: 10 } } },
                // The kitchen's Shamefield trade (2026-11-02): the baker, the butcher and the brewer sell what they make.
                oda: { stock: { 'Brötchen': { buyPrice: 2, quantity: 12 }, 'Brezel': { buyPrice: 3, quantity: 8 }, 'Flour': { buyPrice: 3, quantity: 6 } } },
                greta: { stock: { 'Pork': { buyPrice: 5, quantity: 8 }, 'Bratwurst': { buyPrice: 6, quantity: 6 }, 'Leberkäsbrötchen': { buyPrice: 8, quantity: 4 },
                    'Piglet': { buyPrice: 15, quantity: 2 }, 'Hen': { buyPrice: 8, quantity: 3 } } },
                fenric: { stock: { 'Helles': { buyPrice: 6, quantity: 6 }, 'Dunkel': { buyPrice: 7, quantity: 4 }, 'Weizen': { buyPrice: 7, quantity: 4 } } },
                // The Hrimvald kitchen (Tokelo, 2026-11-13; NORSE_KITCHEN.md). Solveig's fish stalls in Skeldvik, Aslaug's bar
                // at the Stormtide Inn (mead), and Gudrun's market stall in Hrafnholm (mutton, dairy, flour, roots).
                solveig: { stock: { 'Herring': { buyPrice: 2, quantity: 12 }, 'Salmon': { buyPrice: 4, quantity: 6 }, 'Stockfish': { buyPrice: 3, quantity: 8 },
                    'Smoked Herring': { buyPrice: 5, quantity: 6 }, 'Gravlax': { buyPrice: 8, quantity: 4 }, 'Surströmming': { buyPrice: 6, quantity: 3 } } },
                aslaug: { stock: { 'Mead': { buyPrice: 8, quantity: 8 }, 'Lingonberry Mead': { buyPrice: 9, quantity: 4 }, 'Juniper Ale': { buyPrice: 6, quantity: 6 },
                    'Honey': { buyPrice: 3, quantity: 10 }, 'Flatbread': { buyPrice: 2, quantity: 10 }, 'Fårikål': { buyPrice: 10, quantity: 3 } } },
                gudrun: { stock: { 'Mutton': { buyPrice: 5, quantity: 8 }, 'Skyr': { buyPrice: 4, quantity: 8 }, 'Sour Cream': { buyPrice: 3, quantity: 8 },
                    'Butter': { buyPrice: 3, quantity: 8 }, 'Flour': { buyPrice: 3, quantity: 8 }, 'Potato': { buyPrice: 2, quantity: 10 }, 'Cabbage': { buyPrice: 2, quantity: 10 } } }
            }, constructionDefinitions: {
                // Orin's first job (Q07). Free for now (Tokelo, 2026-10-24): a story repair until the economy is tuned.
                homestead_gate: { name: 'Homestead Gate', goldCost: 0, materials: {} },
                // Orin's next job once the gate is up (Tokelo, 2026-11-03). Placeholder price for Gauge to tune.
                homestead_walls: { name: 'Homestead Walls', goldCost: 40, materials: {}, requires: ['homestead_gate'] },
                // Bread and Beer (Shamefield locals, Tokelo 2026-11-02): the first real use of planting and crafting.
                // Sister Merrow lends a bed in the Kloster herb garden; digging it is free, like the gate.
                briarwell_bed: { name: 'Briarwell garden bed', verb: 'Dig', goldCost: 0, materials: {} },
                // Your own lot at the homestead (the kitchen, 2026-11-02): two fields, a pigsty and a hen coop.
                homestead_field_west: { name: 'west field', verb: 'Dig', goldCost: 0, materials: {} },
                homestead_field_east: { name: 'east field', verb: 'Dig', goldCost: 0, materials: {} },
                homestead_sty: { name: 'pigsty', verb: 'Build', goldCost: 12, materials: {} },
                homestead_coop: { name: 'hen coop', verb: 'Build', goldCost: 8, materials: {} }
            }, cropDefinitions: {
                // plantIn: the plots it may go in. In the world (action mode) crops grow on the calm clock, farmingRules
                // below (Tokelo, 2026-11-04); the text game, and livestock (`feed`), still count tendings (actionsToGrow).
                'Barley Seed':   { produces: 'Barley', yield: 2, actionsToGrow: 2, plantIn: ['briarwell_bed', 'homestead_field_west', 'homestead_field_east'] },
                'Wheat Seed':    { produces: 'Wheat', yield: 2, actionsToGrow: 2, plantIn: ['briarwell_bed', 'homestead_field_west', 'homestead_field_east'] },
                'Seed Potato':   { produces: 'Potato', yield: 3, actionsToGrow: 2, plantIn: ['homestead_field_west', 'homestead_field_east'] },
                'Cabbage Seed':  { produces: 'Cabbage', yield: 2, actionsToGrow: 2, plantIn: ['homestead_field_west', 'homestead_field_east'] },
                'Onion Set':     { produces: 'Onion', yield: 3, actionsToGrow: 2, plantIn: ['homestead_field_west', 'homestead_field_east'] },
                // Shane's seeds grow on the player's own lot only (Tokelo).
                'Cannabis Seed': { produces: 'Cannabis Leaf', yield: 3, actionsToGrow: 3, plantIn: ['homestead_field_west', 'homestead_field_east'] },
                // Livestock (Tokelo: meat needs farmed animals somewhere). Each tending feeds them one of `feed`.
                'Piglet':        { produces: 'Pork', yield: 3, actionsToGrow: 3, plantIn: ['homestead_sty'], feed: ['Potato', 'Cabbage', 'Apple', 'Barley', 'Wheat'], plantVerb: 'Settled', harvestVerb: 'Butchered' },
                'Hen':           { produces: 'Egg', yield: 2, actionsToGrow: 2, plantIn: ['homestead_coop'], feed: ['Wheat', 'Barley', 'Cabbage'], keeps: true, plantVerb: 'Settled', harvestVerb: 'Collected' }
            }, gazeRules: {
                // Legendary awakenings (Tokelo, 2026-11-04): stand facing this world object, still, within `range` tiles
                // (32 px map tiles) for `wakeSeconds` of calm time. At `haloSeconds` a halo lights over it; at
                // `wakeSeconds` it wakes: `flag` is set and `talk` (an NPC in the story data) speaks. Looking away,
                // walking or a fight starts the count again. Keyed by the interactable's id.
                // anchorUp: px from the object's bottom edge up to the statue's hood, where ui/gaze-fx.js hangs the halo.
                kloster_seraph_statue: { legend: 'fallen_seraphim', haloSeconds: 60, wakeSeconds: 120, range: 4, coneDeg: 50, anchorUp: 94,
                    flag: 'seraph_awakened', talk: 'seraph_statue',
                    haloText: 'A thin ring of light kindles above the statue\'s hood. Nobody else in the courtyard seems to see it.' }
            }, farmingRules: {
                // Tokelo (2026-11-04): "which plant grows that fast". A crop takes growSeconds of calm time (out of a
                // fight) to ripen. Watering and weeding it once takes tendCutsSeconds off; a second time does nothing.
                // A crop entry can set its own growSeconds. Livestock is fed instead and doesn't use these.
                growSeconds: 120,
                tendCutsSeconds: 60,
                tendsPerCrop: 1
            }, recipeDefinitions: {
                // Station recipes: offered by the place that makes them (Fenric's casks, the watermill, Oda's oven).
                brew_briarwell_pale: { verb: 'Brewed', ingredients: { 'Barley': 2, 'Wild Hops': 1 }, output: 'Briarwell Pale' },
                mill_rye_flour: { verb: 'Milled', ingredients: { 'Rye Sheaf': 1 }, output: 'Rye Flour' },
                bake_rye_loaf: { verb: 'Baked', ingredients: { 'Rye Flour': 1, 'Sourdough Starter': 1 }, output: 'Shamefield Rye Loaf' },
                // The kitchen (2026-11-02). `station`: where it's offered (hearth: your homestead; oven: Oda; mill: the
                // watermill; brewery: Brother Fenric, once Bread and Beer is done). `yield`: how many come out.
                mill_flour:          { station: 'mill', verb: 'Milled', ingredients: { 'Wheat': 1 }, output: 'Flour', yield: 2 },
                bake_broetchen:      { station: 'oven', verb: 'Baked', ingredients: { 'Flour': 1 }, output: 'Brötchen', yield: 3 },
                bake_brezel:         { station: 'oven', verb: 'Baked', ingredients: { 'Flour': 1, 'Butter': 1 }, output: 'Brezel', yield: 2 },
                brew_helles:         { station: 'brewery', verb: 'Brewed', ingredients: { 'Barley': 2, 'Wild Hops': 1 }, output: 'Helles', yield: 3 },
                brew_dunkel:         { station: 'brewery', verb: 'Brewed', ingredients: { 'Barley': 3, 'Wild Hops': 1 }, output: 'Dunkel', yield: 3 },
                brew_weizen:         { station: 'brewery', verb: 'Brewed', ingredients: { 'Wheat': 2, 'Wild Hops': 1 }, output: 'Weizen', yield: 3 },
                cook_bratwurst:      { station: 'hearth', verb: 'Grilled', ingredients: { 'Pork': 1 }, output: 'Bratwurst', yield: 2 },
                cook_leberkaese:     { station: 'hearth', verb: 'Baked', ingredients: { 'Pork': 1, 'Brötchen': 1 }, output: 'Leberkäsbrötchen' },
                cook_mett:           { station: 'hearth', verb: 'Made', ingredients: { 'Pork': 1, 'Brötchen': 1, 'Onion': 1 }, output: 'Mettbrötchen', yield: 2 },
                cook_schnitzel:      { station: 'hearth', verb: 'Fried', ingredients: { 'Pork': 1, 'Flour': 1, 'Egg': 1 }, output: 'Schnitzel' },
                cook_jaegerschnitzel:{ station: 'hearth', verb: 'Fried', ingredients: { 'Pork': 1, 'Flour': 1, 'Egg': 1, 'Chanterelles': 2 }, output: 'Jägerschnitzel' },
                cook_kaesespaetzle:  { station: 'hearth', verb: 'Baked', ingredients: { 'Flour': 1, 'Egg': 1, 'Cheese': 1, 'Onion': 1 }, output: 'Käsespätzle', yield: 2 },
                cook_knoedel:        { station: 'hearth', verb: 'Boiled', ingredients: { 'Brötchen': 2, 'Fresh Milk': 1, 'Egg': 1 }, output: 'Semmelknödel', yield: 2 },
                cook_sauerkraut:     { station: 'hearth', verb: 'Pickled', ingredients: { 'Cabbage': 2 }, output: 'Sauerkraut', yield: 3 },
                cook_kartoffelsalat: { station: 'hearth', verb: 'Made', ingredients: { 'Potato': 2, 'Onion': 1 }, output: 'Kartoffelsalat', yield: 2 },
                cook_pilzsuppe:      { station: 'hearth', verb: 'Cooked', ingredients: { 'Chanterelles': 2, 'Fresh Milk': 1 }, output: 'Pilzsuppe', yield: 2 },
                cook_apfelstrudel:   { station: 'hearth', verb: 'Baked', ingredients: { 'Apple': 2, 'Flour': 1, 'Butter': 1 }, output: 'Apfelstrudel', yield: 2 },
                cook_rattengulasch:  { station: 'hearth', region: 'any', verb: 'Stewed', ingredients: { 'Rat Meat': 2 }, output: 'Rattengulasch' },   // rats are everywhere (Tokelo)
                cook_wolfsgulasch:   { station: 'hearth', verb: 'Stewed', ingredients: { 'Wolf Meat': 1, 'Wild Herbs': 1 }, output: 'Wolfsgulasch' },
                bake_brownies:       { station: 'hearth', verb: 'Baked', ingredients: { 'Cannabis Leaf': 1, 'Flour': 1, 'Egg': 1, 'Butter': 1 }, output: "Shane's Brownie", yield: 2 },
                // The Hrimvald kitchen (2026-11-13): any hearth cooks these; the Skeldvik harbour cookfire and the Hrafnholm
                // feast fire are hearths. Mead is brewed with Aslaug at the Stormtide Inn (station 'meadery').
                bake_flatbread:      { station: 'hearth', region: 'hrimvald', verb: 'Baked', ingredients: { 'Flour': 1 }, output: 'Flatbread', yield: 3 },
                cook_cloudberry_skyr:{ station: 'hearth', region: 'hrimvald', verb: 'Made', ingredients: { 'Skyr': 1, 'Cloudberries': 2 }, output: 'Cloudberry Skyr' },
                smoke_herring:       { station: 'hearth', region: 'hrimvald', verb: 'Smoked', ingredients: { 'Herring': 2 }, output: 'Smoked Herring', yield: 2 },
                cure_gravlax:        { station: 'hearth', region: 'hrimvald', verb: 'Cured', ingredients: { 'Salmon': 1, 'Wild Herbs': 1 }, output: 'Gravlax', yield: 2 },
                cook_farikal:        { station: 'hearth', region: 'hrimvald', verb: 'Stewed', ingredients: { 'Mutton': 1, 'Cabbage': 2 }, output: 'Fårikål', yield: 2 },
                cook_lingonberry_mutton:{ station: 'hearth', region: 'hrimvald', verb: 'Roasted', ingredients: { 'Mutton': 1, 'Lingonberries': 2 }, output: 'Lingonberry Mutton' },
                cook_stockfish_stew: { station: 'hearth', region: 'hrimvald', verb: 'Stewed', ingredients: { 'Stockfish': 1, 'Potato': 1, 'Butter': 1 }, output: 'Stockfish Stew', yield: 2 },
                cook_rommegrot:      { station: 'hearth', region: 'hrimvald', verb: 'Cooked', ingredients: { 'Sour Cream': 1, 'Flour': 1, 'Butter': 1 }, output: 'Rømmegrøt', yield: 2 },
                brew_mead:           { station: 'meadery', verb: 'Brewed', ingredients: { 'Honey': 2 }, output: 'Mead', yield: 2 },
                brew_lingonberry_mead:{ station: 'meadery', verb: 'Brewed', ingredients: { 'Honey': 1, 'Lingonberries': 2 }, output: 'Lingonberry Mead', yield: 2 },
                brew_juniper_ale:    { station: 'meadery', verb: 'Brewed', ingredients: { 'Barley': 2, 'Juniper Berries': 1 }, output: 'Juniper Ale', yield: 3 }
            }, forageDefinitions: {
                // World objects of kind 'forage' (src/engine/kitchen.js): gathered, then back after regrowSeconds of calm time.
                chanterelles: { item: 'Chanterelles', yield: 2, regrowSeconds: 150 },
                wild_hops:    { item: 'Wild Hops', yield: 1, regrowSeconds: 120 },
                apples:       { item: 'Apple', yield: 2, regrowSeconds: 180 },
                wild_herbs:   { item: 'Wild Herbs', yield: 1, regrowSeconds: 120 },
                // Hrimvald's fells (2026-11-13)
                lingonberries:{ item: 'Lingonberries', yield: 2, regrowSeconds: 150 },
                cloudberries: { item: 'Cloudberries', yield: 2, regrowSeconds: 180 },
                juniper:      { item: 'Juniper Berries', yield: 1, regrowSeconds: 120 }
            },
            rooms, enemies, minionDefinitions, skillDefinitions, skillAliases,
            basePlayerClasses, evolutionPaths, skillWeb, legendaryAndSecretClasses, adaptiveLoot, resourceRules, itemDefinitions, gameRules,
            statusDefinitions, statusRules, statusReactions, realtimeRules, actionRules, foodRules
        };

        const ENSO = global.ENSO || (global.ENSO = {});
        ENSO.data = data;
        if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
