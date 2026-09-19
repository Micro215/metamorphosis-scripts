// ============================================================================
//  Slime Prince — config (ALL timings in ticks, 20 ticks = 1 second)
// ============================================================================
let SP = global.customEvents.slimePrince

SP.config = {

    // ------------------------------------------------------------------ arena
    // players must be within this 3D distance of the anchor (summon block)
    ARENA_RADIUS: 65,

    // ---------------------------------------------------------------- phases
    // hp fraction thresholds: > 0.6 -> 1, > 0.2 -> 2, else 3
    PHASES: { THRESHOLDS: [0.6, 0.2] },

    // -------------------------------------------------------------- workers
    // per-phase delays in ticks, index = phase - 1
    ATTACK_DELAYS: [200, 160, 140],    // boss projectile (artillery)
    CRYSTAL_DELAYS: [200, 140, 80],    // crystal attacks
    FIRST_CRYSTAL_DELAY: 100,          // grace period after the boss spawns
    ATTACK_TIMEOUT: 600,               // safety: forget a stuck attack

    // crystal attack pool per phase (phase 1 has none)
    CRYSTAL_POOLS: {
        2: ['levitation', 'magnetic', 'targeting'],
        3: ['levitation', 'safe_zones', 'targeting', 'magnetic', 'wave'],
    },

    // ----------------------------------------------------------------- music
    MUSIC: {
        INTRO: { id: 'inventorypets:black_hole', loop: false },
        FIGHT: { id: 'aquamirae:music.forsaken_drownage', loop: true, interval: 2900 }, // 145s
        VOLUME: 5,
    },

    // ------------------------------------------------------------ artillery
    ARTILLERY: {
        SHOOT_SOUND: 'irons_spellbooks:magic_arrow_release',
        HIT_SOUND: 'lost_aether_content:entity.cloud_shot.puff',
        SOUND_VOLUME: 500,
        SOUND_DISTANCE: 120,
    },

    // ----------------------------------------------------------- levitation
    LEVITATION: {
        SCATTER: 30,                  // ring center: anchor +- this, x/z
        WAVES: 5,
        WAVE_DELAY: 20,               // 1s between waves
        CIRCLES_COUNT: 1,             // stacked rings per wave
        CIRCLES_SPACING: 0.5,
        CIRCLE_PARTICLE: 'alexsmobs:shocked',
        CIRCLE_COUNT: 50,             // points on the ring
        CIRCLE_PER_POINT: 5,
        CIRCLE_SPREAD: 0.5,
        BLOCK_PARTICLE: 'minecraft:block tconstruct:sky_congealed_slime',
        BLOCK_DISC_RADIUS: 7,         // (radius - 1) / 2
        BLOCK_DISC_COUNT: 100,
        RADIUS: 15,
        EFFECT: 'levitation',
        EFFECT_DURATION: 20,          // 1s
        EFFECT_AMPLIFIER: 30,
        EXPLOSION_PARTICLE: 'minecraft:explosion',
        EXPLOSION_COUNT: 25,          // points per collapse ring
        START_SOUND: 'alexsmobs:rocky_roller_earthquake',
        EXPLOSION_SOUND: 'iceandfire:dragon_flight',
        SOUND_DISTANCE: 32,
        SOUND_VOLUME: 200,
    },

    // ---------------------------------------------------------- safe_zones
    SAFE_ZONES: {
        SCATTER: 30,
        COUNT_MIN: 3, COUNT_MAX: 4,
        RADIUS: 15,
        RING_COUNT: 150,              // ring density
        ZONE_PARTICLE: 'minecraft:totem_of_undying',
        WAIT_DURATION: 100,           // 5s
        REDRAW_EVERY: 5,             // 0.5s
        REGEN_EFFECT: 'regeneration',
        REGEN_DURATION: 300,          // 15s
        REGEN_AMPLIFIER: 1,
        DAMAGE_EFFECT: 'instant_damage',
        DAMAGE_AMPLIFIER: 0,
    },

    // ------------------------------------------------------------ targeting
    TARGETING: {
        PULSES: 4,
        PULSE_EVERY: 10,              // 0.5s
        MARKER_PARTICLE: 'minecraft:crit',
        MARKER_COUNT: 20,
        // area effect cloud — durations in ticks (AEC semantics)
        CLOUD_PARTICLE: 'minecraft:entity_effect',
        CLOUD_RADIUS: 3,
        CLOUD_DURATION: 60,
        REAPPLICATION_DELAY: 20,
        SLOW_EFFECT: 'slowness', SLOW_DURATION: 100, SLOW_AMPLIFIER: 2,
        DAMAGE_EFFECT: 'instant_damage', DAMAGE_DURATION: 40, DAMAGE_AMPLIFIER: 0,
    },

    // -------------------------------------------------------------- magnetic
    MAGNETIC: {
        TARGETS: 2,
        PARTICLE: 'minecraft:angry_villager',
        SLOW_EFFECT: 'slowness',
        LEVITATION_EFFECT: 'levitation',
        EFFECT_DURATION: 60,          // 3s
        EFFECT_AMPLIFIER: 5,
    },

    // ------------------------------------------------------------------ wave
    WAVE: {
        RADIUS: 50,
        STEPS: 20,                    // wave expansion steps
        STEP_DELAY: 2,                // 0.1s per step
        COUNT_PER_UNIT: 2,            // ring points per block of radius
        PARTICLES_PER_POINT: 1,
        CENTER_PARTICLE: 'minecraft:end_rod',   // the column
        WAVE_PARTICLE: 'minecraft:cloud',
        WARNING_TIME: 60,             // 3s of warning bursts
        WARNING_EVERY: 8,             // 0.4s between bursts
        WARNING_PARTICLE: 'alexsmobs:shocked',
        WARNING_COUNT: 1000,
        BURST_PARTICLE: 'minecraft:explosion',
        BURST_COUNT: 1500,
        FINAL_BURST_DELAY: 4,         // 0.2s
        SAFE_HEIGHT: 1,               // players below anchor.y + this take the hit
        DAMAGE_EFFECT: 'minecraft:instant_damage',
        DAMAGE_DURATION: 20,          // 1s
        DAMAGE_AMPLIFIER: 1,
        PREPARE_SOUND: 'ad_astra:gravity_normalizer_idle',
        WARNING_SOUND: 'minecraft:entity.warden.sonic_charge',
        BURST_SOUND: 'spartanweaponry:hammer_slams_into_ground',
        SOUND_DISTANCE: 256,
        SOUND_VOLUME: 200,
    },

    // --------------------------------------------------------------- shields
    SHIELDS: {
        ENTITY: 'minecraft:slime',
        TAG: 'boss_shield',
        DISPLAY_NAME: 'Boss Shield',
        SIZE: 3,
        COUNT_MIN: 3, COUNT_MAX: 4,
        ALTITUDE: 5,                  // above the boss spawn point
        ORBIT_RADIUS: 30,
        RESPAWN_DELAY: 1200,
        CHECK_MISSES: 2,              // empty checks in a row before "broken"
        INVISIBILITY_DURATION: 1000000, // ticks
        SLOW_FALLING_DURATION: 200,   // 10s
        RESISTANCE: { effect: 'resistance', duration: 600, amplifier: 4, hidden: true },
        REFRESH_EVERY: 100,           // resistance refresh while shields live
        AURA_EVERY: 2,
        AURA_PARTICLE: 'aquamirae:ghost',
        AURA_COUNT: 2,
        AURA_SECONDARY: 'minecraft:enchant',
        BEAM: {
            PARTICLE: 'minecraft:end_rod',
            EVERY: 100,                // 5s
            DURATION: 10,
            STEP: 0.7,
            SPREAD: 0.1,
            // beam target = anchor + offset (the summon block), any distance
            TARGET_OFFSET: [0, 1, 0],
        },
    },

    // -------------------------------------------------------------- dome fx
    // break point offsets from the ANCHOR (summon block); the sphere
    // center is anchor + SPHERE.Y_OFFSET, all points sit on the shell
    DOME_FX: {
        POINTS: [
            [42, 57, 0], [-43, 56, 0], [0, 56, -43], [0, 56, 43], [0, 75, 0],
            [35, 48, -35], [34, 49, 35], [-35, 49, -36], [-34, 49, -35],
        ],
        BREAK_RADIUS: 5,
        DELAY_BASE: 80, DELAY_RANDOM: 80,   // 4s + rand 4s
        PHASE_MULT: [1, 0.75, 0.5],
        BEAMS_PER_BREAK: [2, 3, 4],
        RESET_EVERY: 200,             // mark all points whole again (the sweep restored them)
        BEAM: {
            PARTICLE: 'minecraft:end_rod',
            SPEED: 3,                 // comet speed, blocks per tick
            TRAIL_COUNT: 10,
            SPREAD: 0.1,
            // comet target = anchor + offset
            TARGET_OFFSET: [0, 1, 0],
        },
    },

    // ----------------------------------------------------------------- boss
    BOSS: {
        TYPE: 'tconstruct:sky_slime',
        MAX_HEALTH: 5000,
        NAME: 'Slime Prince',
        SIZE: 25,
        BOSSBAR_ID: 'kubejs:slime_prince_bar',
        ENTITY_TAG: 'slime_prince',          // leftover-filter marker
        SUMMON_ITEM_TAG: 'slime_prince_summon',
        SUMMON_COOLDOWN: 36000,              // 30 min item cooldown
        NO_AI: 0,
        GRAVITY: 1,
        SPAWN_Y_OFFSET: 50,
        ATTACK_POWER: 10,
        BOSSBAR_VISIBILITY_DIST: 256,
    },

    // ------------------------------------------------------------- artillery
    ATTACK: {
        TARGET_RANGE: 64,
        START_HEIGHT: 2,
        AIM_HEIGHT: 1,
        HIT_RADIUS: 6,

        PROJECTILE: {
            SPEED: 1.5,
            PARTICLE: 'minecraft:end_rod',
            COUNT_PER_TICK: 2,
            SPREAD: 0.1,
            MOTION: 0.1,
            IMPACT_COUNT: 30,
            IMPACT_SPREAD: 0.5,
            IMPACT_MOTION: 0.1,
        },

        CLOUD: {
            TYPE: 'minecraft:area_effect_cloud',
            PARTICLE: 'minecraft:end_rod',
            RADIUS: 4,
            DURATION: 100,
            WAIT_TIME: 0,

            EFFECTS: [
                { Id: 2, Amplifier: 1, Duration: 100 },  // slowness
                { Id: 25, Amplifier: 2, Duration: 100 }, // levitation
            ],
        },
    },

    // ------------------------------------------------- summon & death spiral
    // SPIN is degrees per tick: 6 * 120 ticks = 720 = 2 full turns
    SPIRAL: {
        OUT: 1,
        IN: -1,

        PARTICLE: 'supplementaries:green_flame',
        RADIUS: 60,
        DURATION_TICKS: 120,
        SPIN: 6,
        ARMS: 8,
        POINTS_PER_TICK: 4,
        Y_OFFSET: 1,
        RISE: 0,
        DRIFT: 0,
    },

    // ---------------------------------------------------------------- sphere
    // the arena dome; the live sweep builds it slice by slice (down),
    // the death dissolve runs as a wave from the center
    SPHERE: {
        RADIUS: 60,
        SHELL: 1,

        SLICE: 1,
        BUILD_EVERY: 1,

        WAVE: 0.1,
        CLEAR_EVERY: 10,

        Y_OFFSET: 15,                // sphere center = summon block + this

        BLOCKS: [
            'connectedglass:clear_glass_blue',
            'connectedglass:clear_glass_purple',
            'connectedglass:clear_glass_pink',
            'connectedglass:clear_glass_magenta',
        ],
    },

    // ------------------------------------------------------------------ loot
    LOOT: {
        OFFSET: [0, 1, 0],            // drop point relative to the anchor
        FIXED: [{ id: 'tconstruct:sky_slime_crystal', count: 640 }],
        RANDOM_POOL: [
            {   id: "tconstruct:plate_helmet", count: 1,
                nbt: {
                    tic_materials: ["tconstruct:slimesteel", "tconstruct:slimesteel"],
                    tic_modifiers: [
                        {name: "tconstruct:overslime", level: 2},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:protection", level: 4},
                        {name: "tconstruct:revitalizing", level: 1},
                        {name: "tconstruct:overcast", level: 2},
                    ],
                    tic_persistent: {defense: -3, upgrades: -2},
                    tic_upgrades: [
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:protection", level: 4},
                        {name: "tconstruct:revitalizing", level: 1},
                    ],
                    tic_volatile_data: {
                        defense: 3,
                        "tconstruct:indestructible": 1,
                        "tconstruct:rarity": 4,
                        "upgrades": 2
                    },
                    display: {
                        Name: '{"text": "Sky-Slimy Tainted Casque","italic": false,"color": "dark_aqua"}'
                    },
                    tag: "slime_prince_item"
                }
            },
            {   id: "tconstruct:plate_chestplate", count: 1,
                nbt: {
                    tic_materials: ["tconstruct:slimesteel", "tconstruct:slimesteel"],
                    tic_modifiers: [
                        {name: "tconstruct:overslime", level: 2},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:protection", level: 4},
                        {name: "tconstruct:revitalizing", level: 2},
                        {name: "tconstruct:overcast", level: 2},
                    ],
                    tic_persistent: {defense: -3, upgrades: -2},
                    tic_upgrades: [
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:protection", level: 4},
                        {name: "tconstruct:revitalizing", level: 2},
                    ],
                    tic_volatile_data: {
                        defense: 3,
                        "tconstruct:indestructible": 1,
                        "tconstruct:rarity": 4,
                        "upgrades": 2
                    },
                    display: {
                        Name: '{"text": "Sky-Slimy Tainted Cuirass","italic": false,"color": "dark_aqua"}'
                    },
                    tag: "slime_prince_item"
                }
            },
            {   id: "tconstruct:plate_leggings", count: 1,
                nbt: {
                    tic_materials: ["tconstruct:slimesteel", "tconstruct:slimesteel"],
                    tic_modifiers: [
                        {name: "tconstruct:overslime", level: 2},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:protection", level: 4},
                        {name: "tconstruct:revitalizing", level: 1},
                        {name: "tconstruct:overcast", level: 2},
                    ],
                    tic_persistent: {defense: -3, upgrades: -2},
                    tic_upgrades: [
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:protection", level: 4},
                        {name: "tconstruct:revitalizing", level: 1},
                    ],
                    tic_volatile_data: {
                        defense: 3,
                        "tconstruct:indestructible": 1,
                        "tconstruct:rarity": 4,
                        "upgrades": 2
                    },
                    display: {
                        Name: '{"text": "Sky-Slimy Tainted Cnemes","italic": false,"color": "dark_aqua"}'
                    },
                    tag: "slime_prince_item"
                }
            },
            {   id: "tconstruct:plate_boots", count: 1,
                nbt: {
                    tic_materials: ["tconstruct:slimesteel", "tconstruct:slimesteel"],
                    tic_modifiers: [
                        {name: "tconstruct:overslime", level: 2},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:protection", level: 4},
                        {name: "tconstruct:revitalizing", level: 1},
                        {name: "tconstruct:overcast", level: 2},
                    ],
                    tic_persistent: {defense: -3, upgrades: -2},
                    tic_upgrades: [
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:protection", level: 4},
                        {name: "tconstruct:revitalizing", level: 1},
                    ],
                    tic_volatile_data: {
                        defense: 3,
                        "tconstruct:indestructible": 1,
                        "tconstruct:rarity": 4,
                        "upgrades": 2
                    },
                    display: {
                        Name: '{"text": "Sky-Slimy Tainted Chausses","italic": false,"color": "dark_aqua"}'
                    },
                    tag: "slime_prince_item"
                }
            },
            {   id: "tconstruct:swasher", count: 1,
                nbt: {
                    tic_materials: ["tconstruct:slimesteel", "tconstruct:slimesteel", "tconstruct:slimesteel"],
                    tic_modifiers: [
                        {name: "tconstruct:tank_handler", level: 3},
                        {name: "tconstruct:overslime", level: 3},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:spitting", level: 1},
                        {name: "tconstruct:tank", level: 2147000000},
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:power", level: 10},
                        {name: "tconstruct:quick_charge", level: 5},
                        {name: "tconstruct:overcast", level: 3},
                        {name: "tconstruct:spilling", level: 1},
                        {name: "tconstruct:silky_shears", level: 1},
                    ],
                    tic_persistent: {
                        abilities: -1, upgrades: -3,
                        "tconstruct:tank_fluid": {
                            Amount: 2147000000,
                            FluidName: "tconstruct:sky_slime"
                        }
                    },
                    tic_stats: {
                        "tconstruct:tank_capacity": 2147000000
                    },
                    tic_upgrades: [
                        {name: "tconstruct:tank", level: 30000},
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:power", level: 10},
                        {name: "tconstruct:quick_charge", level: 5},
                    ],
                    tic_volatile_data: {
                        abilities: 1,
                        "tconstruct:indestructible": 1,
                        "tconstruct:rarity": 4,
                        "tconstruct:total_tanks": 1,
                        "upgrades": 3
                    },
                    display: {
                        Name: '{"text": "Sky-Slimy Tainted Swasher","italic": false,"color": "dark_aqua"}'
                    },
                    tag: "slime_prince_item"
                }
            },
            {   id: "tconstruct:mattock", count: 1,
                nbt: {
                    tic_materials: ["tconstruct:slimesteel", "tconstruct:slimesteel", "tconstruct:slimesteel"],
                    tic_modifiers: [
                        {name: "tconstruct:overslime", level: 3},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:springing", level: 11},
                        {name: "tconstruct:power", level: 5},
                        {name: "tconstruct:overcast", level: 3},
                        {name: "tconstruct:tilling", level: 1},
                    ],
                    tic_persistent: { abilities: -1, upgrades: -3 },
                    tic_upgrades: [
                        {name: "tconstruct:netherite", level: 1},
                        {name: "tconstruct:reinforced", level: 5},
                        {name: "tconstruct:unbreakable", level: 1},
                        {name: "tconstruct:springing", level: 11},
                        {name: "tconstruct:power", level: 5},
                    ],
                    tic_volatile_data: {
                        abilities: 1,
                        "tconstruct:indestructible": 1,
                        "tconstruct:rarity": 4,
                        "upgrades": 3
                    },
                    display: {
                        Name: '{"text": "Sky-Slimy Tainted Mattock","italic": false,"color": "dark_aqua"}'
                    },
                    tag: "slime_prince_item"
                }
            },
        ],
        RANDOM_MIN: 1, RANDOM_MAX: 3, // how many random entries per drop
        XP: { count: 500, valueMin: 10, valueMax: 40 },
        PLAYER_EFFECTS: [{ effect: 'luck', duration: 72000, amplifier: 4 }], // 1h
        ITEMS_PER_BATCH: 5,
        ORBS_PER_BATCH: 10,
        BATCH_EVERY: 1,               // ticks between batches
        MOTION: { up: 5, horizontal: 0.1 },
    },
}