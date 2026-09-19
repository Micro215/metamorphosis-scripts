// ============================================================================
//  Slime Prince — crystal attacks
//
//  Each attack: { name, minPhase, run(ctx) }.
//  ctx: { server, level, boss, sphere, anchor, center, bossSpawn, phase,
//         alive(), done() }
//  Attacks signal completion through ctx.done(); every timeline is guarded
//  by ctx.alive(), so a boss death mid-attack stops it automatically.
// ============================================================================
let SP = global.customEvents.slimePrince

// ------------------------------------------------------------------ magnetic
SP.attacks.push({
    name: 'magnetic',
    minPhase: 2,
    run: function(ctx) {
        let cfg = SP.config.MAGNETIC
        let FX = global.libs.fx

        let players = SP.utils.playersInArena(ctx)
        if (players.length === 0) { ctx.done(); return }

        // random players without repeats
        let picked = SP.utils.pickUnique(players, cfg.TARGETS)
        for (let i = 0; i < picked.length; i++) {
            let pl = picked[i]
            SP.utils.giveEffect(pl, cfg.SLOW_EFFECT, cfg.EFFECT_DURATION, cfg.EFFECT_AMPLIFIER)
            SP.utils.giveEffect(pl, cfg.LEVITATION_EFFECT, cfg.EFFECT_DURATION, cfg.EFFECT_AMPLIFIER)
            FX.burst(pl, {
                particle: cfg.PARTICLE,
                count: 10,
                spread: 0.5,
                speed: 0,
                offset: [0, 1, 0],
                level: ctx.level,
                server: ctx.server,
            })
        }
        ctx.done()
    },
})

// ----------------------------------------------------------------- targeting
SP.attacks.push({
    name: 'targeting',
    minPhase: 2,
    run: function(ctx) {
        let cfg = SP.config.TARGETING
        let FX = global.libs.fx

        let players = SP.utils.playersInArena(ctx)
        if (players.length === 0) { ctx.done(); return }
        let target = players[(Math.random() * players.length) | 0]

        // mark the spot — the position is fixed at cast time
        let pos = { x: target.x, y: target.y + 1, z: target.z }
        let steps = []

        for (let i = 0; i < cfg.PULSES; i++) {
            steps.push({
                t: i * cfg.PULSE_EVERY,
                fn: function() {
                    FX.ring(pos, {
                        particle: cfg.MARKER_PARTICLE,
                        radius: 3,
                        count: cfg.MARKER_COUNT,
                        level: ctx.level,
                    })
                },
            })
        }

        // the payload cloud
        steps.push({
            t: cfg.PULSES * cfg.PULSE_EVERY,
            fn: function() {
                SP.utils.cloud(ctx.level, pos.x, pos.y, pos.z, {
                    particle: cfg.CLOUD_PARTICLE,
                    radius: cfg.CLOUD_RADIUS,
                    duration: cfg.CLOUD_DURATION,
                    reapplicationDelay: cfg.REAPPLICATION_DELAY,
                    effects: [
                        { name: cfg.SLOW_EFFECT, duration: cfg.SLOW_DURATION, amplifier: cfg.SLOW_AMPLIFIER },
                        { name: cfg.DAMAGE_EFFECT, duration: cfg.DAMAGE_DURATION, amplifier: cfg.DAMAGE_AMPLIFIER },
                    ],
                })
            },
        })

        FX.timeline(steps, {
            name: 'slime_prince:targeting',
            while: ctx.alive,
            onEnd: function() { ctx.done() },
        })
    },
})

// --------------------------------------------------------------- safe_zones
SP.attacks.push({
    name: 'safe_zones',
    minPhase: 2,
    run: function(ctx) {
        let cfg = SP.config.SAFE_ZONES
        let FX = global.libs.fx
        let a = ctx.anchor

        // pick the zone centers: anchor +- SCATTER, hovering 1 above the ground
        let zones = []
        let num = SP.utils.randInt(cfg.COUNT_MIN, cfg.COUNT_MAX)
        for (let i = 0; i < num; i++) {
            zones.push({
                x: a.x + SP.utils.randInt(-cfg.SCATTER, cfg.SCATTER),
                y: a.y + 1,
                z: a.z + SP.utils.randInt(-cfg.SCATTER, cfg.SCATTER),
            })
        }

        let steps = []
        let redraws = Math.max(1, Math.floor(cfg.WAIT_DURATION / cfg.REDRAW_EVERY))

        // redraw the zone rings + regen for players inside (horizontal check)
        for (let r = 0; r < redraws; r++) {
            steps.push({
                t: r * cfg.REDRAW_EVERY,
                fn: function() {
                    for (let i = 0; i < zones.length; i++) {
                        FX.ring(zones[i], {
                            particle: cfg.ZONE_PARTICLE,
                            radius: cfg.RADIUS,
                            count: cfg.RING_COUNT,
                            level: ctx.level,
                        })
                    }
                    ctx.server.players.forEach(function(pl) {
                        if (!SP.utils.inArena(pl, ctx)) return
                        for (let i = 0; i < zones.length; i++) {
                            let z = zones[i]
                            let dx = pl.x - z.x, dz = pl.z - z.z
                            if (dx * dx + dz * dz <= cfg.RADIUS * cfg.RADIUS) {
                                SP.utils.giveEffect(pl, cfg.REGEN_EFFECT, cfg.REGEN_DURATION, cfg.REGEN_AMPLIFIER)
                                break
                            }
                        }
                    })
                },
            })
        }

        // damage everyone outside the zones
        steps.push({
            t: redraws * cfg.REDRAW_EVERY,
            fn: function() {
                ctx.server.players.forEach(function(pl) {
                    if (!SP.utils.inArena(pl, ctx)) return
                    let inside = false
                    for (let i = 0; i < zones.length; i++) {
                        let z = zones[i]
                        let dx = pl.x - z.x, dz = pl.z - z.z
                        if (dx * dx + dz * dz <= cfg.RADIUS * cfg.RADIUS) { inside = true; break }
                    }
                    if (!inside) {
                        SP.utils.giveEffect(pl, cfg.DAMAGE_EFFECT, 20, cfg.DAMAGE_AMPLIFIER)
                    }
                })
            },
        })

        FX.timeline(steps, {
            name: 'slime_prince:safe_zones',
            while: ctx.alive,
            onEnd: function() { ctx.done() },
        })
    },
})

// --------------------------------------------------------------- levitation
SP.attacks.push({
    name: 'levitation',
    minPhase: 2,
    run: function(ctx) {
        let cfg = SP.config.LEVITATION
        let FX = global.libs.fx
        let a = ctx.anchor

        let tx = a.x + SP.utils.randInt(-cfg.SCATTER, cfg.SCATTER)
        let tz = a.z + SP.utils.randInt(-cfg.SCATTER, cfg.SCATTER)

        FX.sound(ctx.server, { x: tx, y: a.y, z: tz }, cfg.START_SOUND, {
            volume: cfg.SOUND_VOLUME, distance: cfg.SOUND_DISTANCE,
        })

        let steps = []

        // waves of rings + a flat disc of block particles
        for (let w = 0; w < cfg.WAVES; w++) {
            ;(function(idx) {
                steps.push({
                    t: idx * cfg.WAVE_DELAY,
                    fn: function() {
                        for (let ci = 0; ci < cfg.CIRCLES_COUNT; ci++) {
                            FX.ring({
                                x: tx, y: a.y + 1 + ci * cfg.CIRCLES_SPACING, z: tz,
                            }, {
                                particle: cfg.CIRCLE_PARTICLE,
                                radius: cfg.RADIUS,
                                count: cfg.CIRCLE_COUNT,
                                per: cfg.CIRCLE_PER_POINT,
                                spread: cfg.CIRCLE_SPREAD,
                                level: ctx.level,
                            })
                        }
                        // block particles need the blockstate argument -> vanilla command
                        let r = cfg.BLOCK_DISC_RADIUS
                        ctx.server.runCommandSilent('particle ' + cfg.BLOCK_PARTICLE + ' ' +
                            tx.toFixed(2) + ' ' + (a.y + 1).toFixed(2) + ' ' + tz.toFixed(2) +
                            ' ' + r + ' 0 ' + r + ' 0 ' + cfg.BLOCK_DISC_COUNT + ' force')
                    },
                })
            })(w)
        }

        // collapse: shrinking rings, then levitate everyone inside
        steps.push({
            t: cfg.WAVES * cfg.WAVE_DELAY,
            fn: function() {
                for (let rr = cfg.RADIUS; rr >= 1; rr--) {
                    FX.ring({ x: tx, y: a.y + 1, z: tz }, {
                        particle: cfg.EXPLOSION_PARTICLE,
                        radius: rr,
                        count: cfg.EXPLOSION_COUNT,
                        level: ctx.level,
                    })
                }
                // levitate everyone inside the ring (horizontal check)
                ctx.server.players.forEach(function(pl) {
                    if (!SP.utils.inArena(pl, ctx)) return
                    let dx = pl.x - tx, dz = pl.z - tz
                    if (dx * dx + dz * dz <= cfg.RADIUS * cfg.RADIUS) {
                        SP.utils.giveEffect(pl, cfg.EFFECT, cfg.EFFECT_DURATION, cfg.EFFECT_AMPLIFIER)
                    }
                })
                FX.sound(ctx.server, { x: tx, y: a.y, z: tz }, cfg.EXPLOSION_SOUND, {
                    volume: cfg.SOUND_VOLUME, distance: cfg.SOUND_DISTANCE,
                })
            },
        })

        FX.timeline(steps, {
            name: 'slime_prince:levitation',
            while: ctx.alive,
            onEnd: function() { ctx.done() },
        })
    },
})

// ---------------------------------------------------------------------- wave
SP.attacks.push({
    name: 'wave',
    minPhase: 2,
    run: function(ctx) {
        let cfg = SP.config.WAVE
        let FX = global.libs.fx
        let a = ctx.anchor
        let c = ctx.center
        let soundPos = { x: a.x, y: a.y, z: a.z }
        let vol = { volume: cfg.SOUND_VOLUME, distance: cfg.SOUND_DISTANCE }
        let burstPos = { x: a.x, y: a.y + 1, z: a.z }

        // vertical column from the sphere center down to the ground
        FX.line([c.x, c.y, c.z], [a.x, a.y, a.z], {
            particle: cfg.CENTER_PARTICLE,
            step: 1,
            level: ctx.level,
        })

        let steps = []

        // expanding hollow wave
        for (let i = 1; i <= cfg.STEPS; i++) {
            ;(function(idx) {
                steps.push({
                    t: (idx - 1) * cfg.STEP_DELAY,
                    fn: function() {
                        let r = (idx / cfg.STEPS) * cfg.RADIUS
                        FX.ring({ x: a.x, y: a.y, z: a.z }, {
                            particle: cfg.WAVE_PARTICLE,
                            radius: r,
                            count: Math.max(8, Math.floor(r * cfg.COUNT_PER_UNIT)),
                            per: cfg.PARTICLES_PER_POINT,
                            level: ctx.level,
                        })
                        if (idx <= cfg.STEPS / 2) {
                            FX.sound(ctx.server, soundPos, cfg.PREPARE_SOUND, vol)
                        }
                    },
                })
            })(i)
        }

        // warning phase
        let warnT = cfg.STEPS * cfg.STEP_DELAY
        let warnCount = Math.max(1, Math.floor(cfg.WARNING_TIME / cfg.WARNING_EVERY))

        steps.push({ t: warnT, fn: function() {
            FX.sound(ctx.server, soundPos, cfg.WARNING_SOUND, vol)
        }})

        for (let k = 0; k < warnCount; k++) {
            ;(function(tt) {
                steps.push({
                    t: tt,
                    fn: function() {
                        FX.burst(burstPos, {
                            particle: cfg.WARNING_PARTICLE,
                            count: cfg.WARNING_COUNT,
                            spread: [cfg.RADIUS / 2, 0, cfg.RADIUS / 2],
                            speed: 0,
                            level: ctx.level,
                            server: ctx.server,
                        })
                    },
                })
            })(warnT + k * cfg.WARNING_EVERY)
        }

        // the hit: players NOT above the summon block take heavy damage
        let hitT = warnT + warnCount * cfg.WARNING_EVERY
        steps.push({
            t: hitT,
            fn: function() {
                FX.sound(ctx.server, soundPos, cfg.BURST_SOUND, vol)
                FX.burst(burstPos, {
                    particle: cfg.BURST_PARTICLE,
                    count: cfg.BURST_COUNT,
                    spread: [cfg.RADIUS / 2, 0, cfg.RADIUS / 2],
                    speed: 0,
                    level: ctx.level,
                    server: ctx.server,
                })
                let limit = a.y + cfg.SAFE_HEIGHT
                ctx.server.players.forEach(function(pl) {
                    if (!SP.utils.inArena(pl, ctx)) return
                    if (Math.abs(pl.x - a.x) > cfg.RADIUS || Math.abs(pl.z - a.z) > cfg.RADIUS) return
                    if (pl.y < limit) {
                        SP.utils.giveEffect(pl, cfg.DAMAGE_EFFECT, cfg.DAMAGE_DURATION, cfg.DAMAGE_AMPLIFIER)
                    }
                })
            },
        })

        // second burst for the looks
        steps.push({
            t: hitT + cfg.FINAL_BURST_DELAY,
            fn: function() {
                FX.burst(burstPos, {
                    particle: cfg.BURST_PARTICLE,
                    count: cfg.BURST_COUNT,
                    spread: [cfg.RADIUS / 2, 0, cfg.RADIUS / 2],
                    speed: 0,
                    level: ctx.level,
                    server: ctx.server,
                })
            },
        })

        FX.timeline(steps, {
            name: 'slime_prince:wave',
            while: ctx.alive,
            onEnd: function() { ctx.done() },
        })
    },
})