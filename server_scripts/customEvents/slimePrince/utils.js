// ============================================================================
//  Slime Prince — shared utils
// ============================================================================
let SP = global.customEvents.slimePrince

SP.utils = {

    // vanilla effect ids by name (area effect cloud NBT needs numeric ids)
    EFFECT_IDS: {
        speed: 1, slowness: 2, haste: 3, mining_fatigue: 4, strength: 5,
        instant_health: 6, instant_damage: 7, jump_boost: 8, nausea: 9,
        regeneration: 10, resistance: 11, fire_resistance: 12, water_breathing: 13,
        invisibility: 14, blindness: 15, night_vision: 16, hunger: 17, weakness: 18,
        poison: 19, wither: 20, health_boost: 21, absorption: 22, saturation: 23,
        glowing: 24, levitation: 25, luck: 26, unluck: 27, slow_falling: 28,
        conduit_power: 29, dolphins_grace: 30, bad_omen: 31, hero_of_the_village: 32,
        darkness: 33,
    },

    // random integer in [a, b]
    randInt: function(a, b) {
        return a + ((Math.random() * (b - a + 1)) | 0)
    },

    // n random elements without repeats
    pickUnique: function(list, n) {
        let copy = list.slice()
        let out = []
        while (out.length < n && copy.length > 0) {
            out.push(copy.splice((Math.random() * copy.length) | 0, 1)[0])
        }
        return out
    },

    // does the entity carry the given vanilla Tags entry
    hasTag: function(entity, tag) {
        if (entity == null || tag == null) return false
        let tags = global.libs.fx.entityTags(entity)
        return tags != null && tags.indexOf(tag) >= 0
    },

    // remove an entity without drops or survivors (discard; y=-1000 as
    // a fallback for builds where discard is unavailable)
    remove: function(e) {
        if (e == null) return
        try { e.y = -1000 } catch (err) {}
        try { e.mergeNbt({ Health: 1 }) } catch (err) {}
    },

    // player is inside the arena: same dimension + within ARENA_RADIUS of the anchor
    inArena: function(player, ctx) {
        if (player == null || ctx == null) return false
        try {
            if (String(player.level.dimension) !== String(ctx.level.dimension)) return false
        } catch (err) { return false }
        let a = ctx.anchor
        let dx = player.x - a.x, dy = player.y - a.y, dz = player.z - a.z
        let r = SP.config.ARENA_RADIUS
        return dx * dx + dy * dy + dz * dz <= r * r
    },

    // all players currently inside the arena
    playersInArena: function(ctx) {
        let out = []
        ctx.server.players.forEach(function(pl) {
            if (SP.utils.inArena(pl, ctx)) out.push(pl)
        })
        return out
    },

    // effect id by name or number (for area effect cloud NBT)
    effectId: function(name) {
        if (typeof name === 'number') return name
        let n = parseInt(name, 10)
        if (!isNaN(n)) return n
        let id = SP.utils.EFFECT_IDS[String(name).replace('minecraft:', '')]
        if (id == null) {
            console.warn('[slime_prince] unknown effect name: ' + name)
            return 1
        }
        return id
    },

    // give a potion effect; hidden=true (default) hides the particles.
    // tries the entity API first, falls back to a command targeted by uuid
    giveEffect: function(entity, id, durationTicks, amplifier, hidden) {
        if (entity == null) return
        if (hidden == null) hidden = true
        let full = String(id).indexOf(':') >= 0 ? String(id) : 'minecraft:' + String(id)
        let dur = Math.max(1, durationTicks | 0)
        let amp = (amplifier || 0) | 0

        try {
            entity.potionEffects.add(full, dur, amp, false, !hidden)
            return
        } catch (err) {}

        try {
            let server = entity.server
            let key = null
            try { key = String(entity.uuid) } catch (err2) { key = null }
            if (key == null && entity.username != null) key = entity.username
            if (server != null && key != null) {
                server.runCommandSilent('effect give ' + key + ' ' + full + ' ' +
                    Math.max(1, Math.ceil(dur / 20)) + ' ' + amp + ' ' + (hidden ? 'true' : 'false'))
            }
        } catch (err) {}
    },

    // read a field from entity NBT (defensive)
    nbtString: function(entity, key) {
        try {
            let nbt = entity.nbt
            if (nbt == null) return null
            let v = null
            try { v = nbt[key] } catch (err) {}
            if (v == null && typeof nbt.get === 'function') {
                try { v = nbt.get(key) } catch (err) {}
            }
            if (v == null) return null
            if (typeof v === 'string') return v
            if (typeof v === 'number' || typeof v === 'boolean') return String(v)
            try { if (typeof v.getAsString === 'function') return String(v.getAsString()) } catch (err) {}
            return String(v)
        } catch (err) { return null }
    },

    // display name of an entity as a string ('' when none)
    displayName: function(entity) {
        if (entity == null) return ''
        try {
            let n = entity.customName
            if (n != null) {
                let s = String(n)
                if (s.length > 0 && s !== 'null') return s
            }
        } catch (err) {}
        let s = SP.utils.nbtString(entity, 'CustomName')
        return s == null ? '' : s
    },

    // spawn an area effect cloud
    // opts: { particle, radius, duration, waitTime, effects, reapplicationDelay }
    // effects: [{ name, duration, amplifier }] — durations in TICKS (AEC semantics)
    cloud: function(level, x, y, z, opts) {
        opts = opts || {}
        try {
            let cloud = level.createEntity('minecraft:area_effect_cloud')
            cloud.setPosition(x, y, z)
            let nbt = {
                Particle: opts.particle == null ? 'minecraft:end_rod' : opts.particle,
                Radius: opts.radius == null ? 3 : opts.radius,
                Duration: opts.duration == null ? 60 : opts.duration,
                WaitTime: opts.waitTime == null ? 0 : opts.waitTime,
                RadiusOnUse: 0,
                RadiusPerTick: 0,
            }
            if (opts.effects != null && opts.effects.length > 0) {
                let list = []
                for (let i = 0; i < opts.effects.length; i++) {
                    let e = opts.effects[i]
                    let src = e.name
                    if (src == null) src = e.id
                    if (src == null) src = e.Id
                    list.push({
                        Id: SP.utils.effectId(src),
                        Amplifier: (e.amplifier == null ? 0 : e.amplifier) | 0,
                        Duration: (e.duration == null ? 100 : e.duration) | 0,
                    })
                }
                nbt.Effects = list
                nbt.ReapplicationDelay = opts.reapplicationDelay == null ? 20 : opts.reapplicationDelay
            }
            cloud.mergeNbt(nbt)
            cloud.spawn()
            return cloud
        } catch (err) {
            console.warn('[slime_prince] cloud spawn failed: ' + err)
            return null
        }
    },

    // random outward motion vector, like the lua loot motion
    randomMotion: function(m) {
        let angle = Math.random() * global.libs.math.TAU / 2
        let h = (m.horizontal || 0.35) * (0.5 + Math.random())
        let up = (m.up || 0.4) * (0.5 + Math.random())
        return [Math.cos(angle) * h, up, Math.sin(angle) * h]
    },

    // spawn an item entity; entry: { id, count, nbt }
    spawnItemEntity: function(level, x, y, z, entry, motionCfg) {
        try {
            let e = level.createEntity('minecraft:item')
            e.setPosition(x, y, z)
            let item = { id: entry.id, Count: entry.count == null ? 1 : entry.count }
            if (entry.nbt != null) item.tag = entry.nbt
            e.mergeNbt({
                Item: item,
                PickupDelay: 40,
                Motion: SP.utils.randomMotion(motionCfg),
            })
            e.spawn()
        } catch (err) { console.warn('[slime_prince] item spawn failed: ' + err) }
    },

    // spawn a single xp orb
    spawnXpOrb: function(level, x, y, z, value, motionCfg) {
        try {
            let e = level.createEntity('minecraft:experience_orb')
            e.setPosition(x, y, z)
            e.mergeNbt({
                Value: value,
                Motion: SP.utils.randomMotion(motionCfg),
            })
            e.spawn()
        } catch (err) { console.warn('[slime_prince] xp orb spawn failed: ' + err) }
    },
}