// ============================================================================
//  fx — scriptable shapes for programmatic callers (boss fights, events)
//
//  One-shot, no handles: burst, ring, line.
//  Animated handles:     beam, spiral — appear in /fx list, expire on their
//  own or via fx.stop(name)/stopAll; every path is wipe-safe.
//
//  Independent of the /fx command effects: same geometry helpers, script
//  friendly signatures. Entities resolve live where they are sources.
// ============================================================================
let FX = global.libs.fx

// ---------------------------------------------------------------------------
//  burst(target, opts) — one-shot particle burst at the target
//  opts: particle (flame), count, spread number|[x,y,z], speed, offset,
//        level, server, viewDist
// ---------------------------------------------------------------------------
FX.burst = function(target, opts) {
    opts = opts == null ? {} : opts
    if (opts.particle == null) opts.particle = 'flame'
    FX.spawn(target, opts)
}

// ---------------------------------------------------------------------------
//  ring(target, opts) — flat circle around the default-up (or opts) axis
//  opts: particle, radius, count = points on the circle, per = particles
//        per point, spread, speed, offset, level, server, viewDist,
//        axis/heading/tilt/facing orientation
// ---------------------------------------------------------------------------
FX.ring = function(target, opts) {
    opts = opts || {}
    let radius = Number(opts.radius) || 1
    let n = Math.max(3, (opts.count | 0) || 24)
    let per = Math.max(1, (opts.per | 0) || 1)
    let particle = opts.particle == null ? 'end_rod' : opts.particle
    let colors = FX.colors(opts.colors)
    let o = {
        count: per,
        spread: opts.spread == null ? 0 : opts.spread,
        speed: opts.speed == null ? 0 : opts.speed,
        size: opts.size,
        singleColor: opts.singleColor,
    }
    let vd = FX._viewDistOf(opts)
    let axis = FX.axisOf(opts, null)
    let uv = FX._basis(axis)
    let step = FX.TAU / n

    let pts = FX._points(FX._sources(target, opts.level), FX._offset(opts.offset))
    for (let pi = 0; pi < pts.length; pi++) {
        let p = pts[pi]
        if (opts.server != null && !FX._visible(opts.server, p, vd)) continue
        for (let i = 0; i < n; i++) {
            let c = FX._circle(uv[0], uv[1], radius, i * step)
            FX._emit(p.level, colors, particle, i, p.x + c.x, p.y + c.y, p.z + c.z, o)
        }
    }
}

// ---------------------------------------------------------------------------
//  line(from, to, opts) — dotted segment between two points/entities
//  opts: particle, step = spacing between points (0.5), spread, speed,
//        level (fallback for array coordinates), server, viewDist
// ---------------------------------------------------------------------------
FX.line = function(from, to, opts) {
    opts = opts || {}
    let p0 = FX.pos(from, { level: opts.level })
    let p1 = FX.pos(to, { level: opts.level })
    if (p0 == null || p1 == null) return
    let lvl = p0.level != null ? p0.level : opts.level

    let step = Math.max(0.05, Number(opts.step) || 0.5)
    let particle = opts.particle == null ? 'end_rod' : opts.particle
    let colors = FX.colors(opts.colors)
    let o = {
        count: 1,
        spread: opts.spread == null ? 0 : opts.spread,
        speed: opts.speed == null ? 0 : opts.speed,
        size: opts.size,
        singleColor: opts.singleColor,
    }
    let vd = FX._viewDistOf(opts)

    let dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z
    let d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    let n = Math.max(2, Math.floor(d / step) + 1)

    for (let i = 0; i < n; i++) {
        let s = i / (n - 1)
        let x = p0.x + dx * s, y = p0.y + dy * s, z = p0.z + dz * s
        if (opts.server != null &&
            !FX._visible(opts.server, { x: x, y: y, z: z, level: lvl }, vd)) continue
        FX._emit(lvl, colors, particle, i, x, y, z, o)
    }
}

// ---------------------------------------------------------------------------
//  beam(opts) — a dotted line from an entity to a point, redrawn every tick
//  for `duration` ticks; the source position is re-resolved live
//  opts: from (entity/point), to (entity/point), duration (10), particle,
//        step (0.5), spread (0), level, viewDist, name
// ---------------------------------------------------------------------------
FX.beam = function(opts) {
    opts = opts || {}
    let duration = opts.duration == null ? 10 : (opts.duration | 0)
    let step = Math.max(0.05, Number(opts.step) || 0.5)
    let spread = opts.spread == null ? 0 : opts.spread
    let particle = opts.particle == null ? 'end_rod' : opts.particle
    let vd = opts.viewDist == null ? FX.config.viewDist : opts.viewDist

    let handle = null
    handle = FX._add('beam', opts.name, function(server) {
        handle._t = (handle._t || 0) + 1
        if (duration > 0 && handle._t > duration) { handle.stop(); return }

        let p0 = FX.pos(opts.from, { level: opts.level })
        let p1 = FX.pos(opts.to, { level: opts.level })
        if (p0 == null || p1 == null) { handle.stop(); return }
        let lvl = p0.level != null ? p0.level : opts.level

        let dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        let n = Math.max(2, Math.floor(d / step) + 1)
        for (let i = 0; i < n; i++) {
            let s = i / (n - 1)
            let x = p0.x + dx * s, y = p0.y + dy * s, z = p0.z + dz * s
            if (server != null &&
                !FX._visible(server, { x: x, y: y, z: z, level: lvl }, vd)) continue
            FX._spawn(lvl, particle, x, y, z, { count: 1, spread: spread, speed: 0 })
        }
    }, { replace: opts.name != null })
    return handle
}

// ---------------------------------------------------------------------------
//  spiral(opts) — multi-armed spiral, animated over `duration` ticks
//    direction 'out': radius 0 → radius;  'in': radius → 0
//    spin: degrees per tick (spin * duration = total rotation)
//    arms: point chains, evenly phased; pointsPerTick per arm
//    rise: y gain per tick; drift: random radius jitter
//  opts: target, level, particle, radius (10), duration (60), spin (4),
//        arms (1), pointsPerTick (1), direction, rise (0), drift (0),
//        viewDist, name
// ---------------------------------------------------------------------------
FX.spiral = function(opts) {
    opts = opts || {}
    let p0 = FX.pos(opts.target, { level: opts.level })
    if (p0 == null) return null
    let lvl = p0.level != null ? p0.level : opts.level

    let radius = Number(opts.radius) || 10
    let duration = Math.max(1, (opts.duration | 0) || 60)
    let spin = Number(opts.spin) || 4
    let arms = Math.max(1, (opts.arms | 0) || 1)
    let perTick = Math.max(1, (opts.pointsPerTick | 0) || 1)
    let inward = String(opts.direction) === 'in'
    let rise = Number(opts.rise) || 0
    let drift = Number(opts.drift) || 0
    let particle = opts.particle == null ? 'end_rod' : opts.particle
    let vd = opts.viewDist == null ? FX.config.viewDist : opts.viewDist
    let roll = Math.random() * FX.TAU

    let handle = null
    handle = FX._add('spiral', opts.name, function(server) {
        handle._t = (handle._t || 0) + 1
        let t = handle._t
        if (t > duration) { handle.stop(); return }

        for (let k = 0; k < arms; k++) {
            let base = roll + (FX.TAU * k) / arms
            for (let j = 0; j < perTick; j++) {
                // spread the points over this tick's arc segment
                let tt = t - 1 + (j + 1) / perTick
                let prog = tt / duration
                let r = inward ? radius * (1 - prog) : radius * prog
                if (drift > 0) r += (Math.random() * 2 - 1) * drift
                if (r < 0) r = 0
                let th = FX._rad(spin * tt) + base
                let x = p0.x + Math.cos(th) * r
                let y = p0.y + rise * tt
                let z = p0.z + Math.sin(th) * r
                if (server != null &&
                    !FX._visible(server, { x: x, y: y, z: z, level: lvl }, vd)) continue
                FX._spawn(lvl, particle, x, y, z, { count: 1, spread: 0, speed: 0 })
            }
        }
    }, { replace: opts.name != null })
    return handle
}