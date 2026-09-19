// ============================================================================
//  Slime Prince — shields: orbiting invisible slimes; while at least one
//  lives the boss keeps resistance, when they all die the boss turns
//  vulnerable until the shields respawn.
// ============================================================================
let SP = global.customEvents.slimePrince

SP.shields = {
    list: [],            // live shield entities
    active: false,
    brokenAt: -1,        // server tick when the last shield died
    misses: 0,
    lastResistAt: -100000,
    lastBeamAt: -100000,

    // push a shield into the list, uuid-deduplicated: the spawned filter
    // and the programmatic spawn may both report the same entity
    track: function(e) {
        let key = null
        try { key = String(e.uuid) } catch (err) {}
        for (let i = 0; i < this.list.length; i++) {
            let k = null
            try { k = String(this.list[i].uuid) } catch (err) {}
            if (key != null && k === key) return
        }
        this.list.push(e)
    },

    spawn: function(ctx) {
        let cfg = SP.config.SHIELDS
        let FX = global.libs.fx
        let M = global.libs.math
        this.killAll()

        let bs = ctx.bossSpawn
        let count = SP.utils.randInt(cfg.COUNT_MIN, cfg.COUNT_MAX)
        let y = bs.y + cfg.ALTITUDE
        let base = Math.random() * M.TAU
        let spawned = 0

        for (let i = 0; i < count; i++) {
            let angle = base + (M.TAU * i) / count
            let x = bs.x + Math.cos(angle) * cfg.ORBIT_RADIUS
            let z = bs.z + Math.sin(angle) * cfg.ORBIT_RADIUS

            let e = null
            try {
                e = ctx.level.createEntity(cfg.ENTITY)
                e.setPosition(x, y, z)
            } catch (err) {
                console.error('[slime_prince] shield createEntity failed: ' + err)
                continue
            }

            try {
                e.mergeNbt({
                    PersistenceRequired: 1,
                    Size: cfg.SIZE,
                    Health: 1,
                    Tags: [cfg.TAG],
                    CustomName: '{"text":"' + cfg.DISPLAY_NAME + '"}',
                })
            } catch (err) {
                console.error('[slime_prince] shield mergeNbt failed: ' + err)
            }

            try { e.setHealth(1) } catch (err) {}

            e.spawn()
            FX.tag(e, cfg.TAG)   // registry entry for fx.entities({ tag })
            this.track(e)
            spawned++

            SP.utils.giveEffect(e, 'minecraft:invisibility', cfg.INVISIBILITY_DURATION, 0)
            SP.utils.giveEffect(e, 'minecraft:slow_falling', cfg.SLOW_FALLING_DURATION, 0)
        }

        this.active = spawned > 0
        this.misses = 0
        this.brokenAt = -1
        if (spawned === 0) console.warn('[slime_prince] shields: spawn FAILED, see the errors above')
    },

    // main state tick (every 10 ticks from boss.js)
    tick: function(ctx) {
        let FX = global.libs.fx
        let cfg = SP.config.SHIELDS
        if (!ctx.alive()) { this.killAll(); return }

        // prune dead references
        let alive = []
        for (let i = 0; i < this.list.length; i++) {
            if (FX.entValid(this.list[i])) alive.push(this.list[i])
        }
        this.list = alive

        let now = ctx.server.tickCount

        if (this.list.length > 0) {
            this.misses = 0
            this.active = true
            this.giveResistance(ctx, now)

            // decorative beams to the summon block — any distance
            if (now - this.lastBeamAt >= cfg.BEAM.EVERY) {
                this.lastBeamAt = now
                this.fireBeams(ctx)
            }
        } else {
            if (this.active) {
                // two consecutive empty checks before "broken"
                this.misses++
                if (this.misses >= cfg.CHECK_MISSES) {
                    this.active = false
                    this.brokenAt = now
                    this.clearResistance(ctx)
                }
            } else if (this.brokenAt > 0 && now - this.brokenAt >= cfg.RESPAWN_DELAY) {
                this.spawn(ctx)
            }
        }
    },

    giveResistance: function(ctx, now) {
        let cfg = SP.config.SHIELDS
        let r = cfg.RESISTANCE
        if (r == null || ctx.boss == null) return
        if (now - this.lastResistAt < cfg.REFRESH_EVERY) return
        this.lastResistAt = now
        SP.utils.giveEffect(ctx.boss, r.effect, r.duration, r.amplifier, r.hidden !== false)
    },

    clearResistance: function(ctx) {
        let r = SP.config.SHIELDS.RESISTANCE
        if (r == null || ctx.boss == null) return
        let full = String(r.effect).indexOf(':') >= 0 ? r.effect : 'minecraft:' + r.effect
        try {
            ctx.boss.potionEffects.remove(full)
        } catch (err) {
            try {
                ctx.server.runCommandSilent('effect clear ' + String(ctx.boss.uuid) + ' ' + full)
            } catch (err2) {}
        }
    },

    fireBeams: function(ctx) {
        let FX = global.libs.fx
        let cfg = SP.config.SHIELDS.BEAM
        let off = cfg.TARGET_OFFSET || [0, 1, 0]
        let target = {
            x: ctx.anchor.x + off[0], y: ctx.anchor.y + off[1], z: ctx.anchor.z + off[2],
            level: ctx.level,
        }
        for (let i = 0; i < this.list.length; i++) {
            let e = this.list[i]
            if (!FX.entValid(e)) continue
            FX.beam({
                from: e,
                to: target,
                duration: cfg.DURATION,
                particle: cfg.PARTICLE,
                step: cfg.STEP,
                spread: cfg.SPREAD,
                level: ctx.level,
            })
        }
    },

    // aura particles (every 2 ticks from boss.js)
    aura: function(ctx) {
        let FX = global.libs.fx
        let cfg = SP.config.SHIELDS
        for (let i = 0; i < this.list.length; i++) {
            let e = this.list[i]
            if (!FX.entValid(e)) continue
            FX.spawn(e, {
                particle: cfg.AURA_PARTICLE, count: cfg.AURA_COUNT,
                spread: 0.1, offset: [0, 1, 0], level: ctx.level,
            })
            FX.spawn(e, {
                particle: cfg.AURA_SECONDARY, count: 1,
                spread: 0.3, offset: [0, 1, 0], level: ctx.level,
            })
        }
    },

    killAll: function() {
        // out of the world: no drops, no survivors; children that spawn
        // on death are removed by the spawned-filter below
        for (let i = 0; i < this.list.length; i++) {
            SP.utils.remove(this.list[i])
        }
        this.list = []
        this.active = false
        this.brokenAt = -1
    },
}

// ---------------------------------------------------------------------------
//  Shield spawned filter
// ---------------------------------------------------------------------------
EntityEvents.spawned(event => {
    let e = event.entity
    try {
        let type = String(e.type)
        if (type !== 'minecraft:slime' && type !== 'slime') return

        if (SP.utils.hasTag(e, SP.config.SHIELDS.TAG)) {
            SP.shields.track(e)
            return
        }

        let name = SP.utils.displayName(e)
        if (name.indexOf(SP.config.SHIELDS.DISPLAY_NAME) >= 0) {
            SP.utils.remove(e)
        }
    } catch (err) {}
})