// ============================================================================
//  Slime Prince — dome fx: periodic breaks. Carve holes in the sphere shell
//  and send particle comets from the break points to the summon block. The
//  sphere's own live sweep (update) restores the removed blocks by itself.
// ============================================================================
let SP = global.customEvents.slimePrince

SP.domefx = {
    points: [],        // [{ off: [x,y,z] (from the anchor), broken: bool }]
    nextAt: 0,
    resetAt: 0,

    init: function() {
        this.points = []
        let list = SP.config.DOME_FX.POINTS
        for (let i = 0; i < list.length; i++) {
            this.points.push({ off: list[i], broken: false })
        }
    },

    tick: function(ctx) {
        let cfg = SP.config.DOME_FX
        let FX = global.libs.fx
        if (this.points.length === 0) this.init()
        if (!ctx.alive() || ctx.sphere == null || ctx.sphere.done) { this.stop(); return }

        let now = ctx.server.tickCount
        if (this.nextAt === 0) this.nextAt = now + cfg.DELAY_BASE
        if (this.resetAt === 0) this.resetAt = now + cfg.RESET_EVERY

        // the sphere sweep has restored everything by now — allow re-breaking
        if (now >= this.resetAt) {
            for (let i = 0; i < this.points.length; i++) this.points[i].broken = false
            this.resetAt = now + cfg.RESET_EVERY
        }
        if (now < this.nextAt) return

        let mult = cfg.PHASE_MULT[ctx.phase - 1] == null ? 1 : cfg.PHASE_MULT[ctx.phase - 1]
        this.nextAt = now + Math.max(10, Math.round(
            (cfg.DELAY_BASE + SP.utils.randInt(0, cfg.DELAY_RANDOM)) * mult))

        // pick this volley's break points
        let free = []
        for (let i = 0; i < this.points.length; i++) {
            if (!this.points[i].broken) free.push(this.points[i])
        }
        let want = cfg.BEAMS_PER_BREAK[ctx.phase - 1] == null ? 2 : cfg.BEAMS_PER_BREAK[ctx.phase - 1]
        let n = Math.min(want, free.length)
        if (n <= 0) return   // everything is broken — wait for the reset

        let a = ctx.anchor
        let off = cfg.BEAM.TARGET_OFFSET || [0, 1, 0]
        let tx = a.x + off[0], ty = a.y + off[1], tz = a.z + off[2]

        for (let k = 0; k < n; k++) {
            let p = free.splice((Math.random() * free.length) | 0, 1)[0]
            p.broken = true
            let px = a.x + p.off[0], py = a.y + p.off[1], pz = a.z + p.off[2]

            // carve the hole (the sphere sweep restores it later)
            try { ctx.sphere.carve([px, py, pz], cfg.BREAK_RADIUS) } catch (err) {}

            // particle comet: break point -> summon block
            FX.projectile({
                from: [px, py, pz],
                to: { x: tx, y: ty, z: tz, level: ctx.level },
                homing: false,
                speed: cfg.BEAM.SPEED,
                particle: cfg.BEAM.PARTICLE,
                trail: { count: cfg.BEAM.TRAIL_COUNT, spread: cfg.BEAM.SPREAD, speed: 0 },
                impact: { count: 30, spread: 0.5, speed: 0.1 },
                level: ctx.level,
                viewDist: 256,
            })
        }
    },

    stop: function() {
        this.nextAt = 0
        this.resetAt = 0
        for (let i = 0; i < this.points.length; i++) this.points[i].broken = false
    },
}