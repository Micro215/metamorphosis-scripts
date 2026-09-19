// ============================================================================
//  fx — option normalization, defaults, aliases, orientation
//
//  Conventions:
//    vectors  — canonical [x, y, z]; a bare number in offset means height
//    angles   — degrees on the user side, radians inside (FX._rad)
//    time     — ticks
//    speed    — effect geometry (rotation, spin); particle velocity is
//               particleSpeed (universal, default 0)
// ============================================================================
let FX = global.libs.fx

// ---------------------------------------------------------------------------
//  Defaults
// ---------------------------------------------------------------------------
FX.defaults = {
    particle: 'end_rod',
    count: 1,
    speed: 0,           // internal spawn speed for direct FX.spawn calls
    size: 1.0,
    interval: 1,
    particleSpeed: 0,   // universal particle velocity for command runs
}

// opts[key] with the FX.defaults fallback; null means unset
FX._o = function(opts, key) {
    let v = opts != null ? opts[key] : null
    return v == null ? FX.defaults[key] : v
}

// merge the effect's opts-table defaults into opts; shared by the command
// dispatcher and the item-effect runner
FX._mergeDefaults = function(cmd, opts) {
    if (cmd == null || cmd.opts == null) return opts
    for (let i = 0; i < cmd.opts.length; i++) {
        let d = cmd.opts[i]
        if (d.def !== undefined && d.def !== null && opts[d.key] === undefined) {
            opts[d.key] = d.def
        }
    }
    return opts
}

// ---------------------------------------------------------------------------
//  Aliases: source key → canonical key, applied when the canonical key is
//  absent. Unknown keys pass through untouched.
// ---------------------------------------------------------------------------
FX.ALIASES = {
    // r: 'radius',
    // time: 'duration',
}

FX.applyAliases = function(opts) {
    if (opts == null) return opts
    for (let k in FX.ALIASES) {
        let to = FX.ALIASES[k]
        if (opts[k] !== undefined && opts[to] === undefined) opts[to] = opts[k]
    }
    return opts
}

// ---------------------------------------------------------------------------
//  Vectors
// ---------------------------------------------------------------------------
// offset/jitter: number → [0, n, 0]; [x,y,z]; {x,y,z} → always [x, y, z]
FX._offset = function(o) {
    if (o == null) return [0, 0, 0]
    if (typeof o === 'number') return [0, o, 0]
    if (Array.isArray(o)) return [o[0] || 0, o[1] || 0, o[2] || 0]
    return [o.x || 0, o.y || 0, o.z || 0]
}

// ---------------------------------------------------------------------------
//  Units & pacing
// ---------------------------------------------------------------------------
// degrees → radians; global.libs.math.DEG as in the old code, literal fallback
FX._rad = function(deg) {
    let m = global.libs.math
    let k = (m != null && typeof m.DEG === 'number') ? m.DEG : 0.017453292519943295
    return (deg || 0) * k
}

// gaussian cloud spread: ~99.7% of particles land within 3σ;
// spread = radius / 3 fills the radius, denser toward the center
FX._spreadFor = function(radius) { return (radius || 0) / 3 }

// effective view distance: the call option overrides the global config
FX._viewDistOf = function(opts) {
    if (opts != null && opts.viewDist != null) return opts.viewDist
    return FX.config.viewDist
}

// ---------------------------------------------------------------------------
//  Memo upkeep (stores are created by FX._memo in 00_init.js)
// ---------------------------------------------------------------------------
FX._memoSweep = function() {
    let now = FX._clock
    for (let i = 0; i < FX._memoStores.length; i++) {
        let store = FX._memoStores[i]
        for (let k in store) {
            if (store[k].exp <= now) delete store[k]
        }
    }
}

FX._memoClear = function() {
    for (let i = 0; i < FX._memoStores.length; i++) {
        let store = FX._memoStores[i]
        for (let k in store) delete store[k]
    }
}

// ---------------------------------------------------------------------------
//  Orientation — shared by every axis-aware effect
//
//    axis: function(ctx) → [x,y,z]   animated axis
//    toward: <target>                  axis points at the target, live
//    to: <target>                      axis from the source to the target
//    axis: [x,y,z] | {x,y,z}          direct axis
//    heading: 0..360 + tilt: 0..90     compass style
//    facing: 'up'|'down'|'N'|'S'|'E'|'W'
//    defDir: fallback (beam/burst pass the player's look; others get up)
//
//  heading/facing are memoized; toward/to/look recompute every call.
// ---------------------------------------------------------------------------
FX._axisHF = FX._memo(function(kind, a, b) {
    let M = global.libs.math
    let v = kind === 'h' ? M.orient.fromHeading(a, b) : M.orient.fromFacing(a)
    let n = M.norm([v[0] || 0, v[1] || 0, v[2] || 0])
    if (n[0] === 0 && n[1] === 0 && n[2] === 0) return [0, 1, 0]
    return n
}, 10000, 64)

function axisVec(a) {
    let M = global.libs.math
    let n = M.norm([a[0] || 0, a[1] || 0, a[2] || 0])
    if (n[0] === 0 && n[1] === 0 && n[2] === 0) return [0, 1, 0]
    return n
}

FX.axisOf = function(opts, p, defDir) {
    let a = null

    if (typeof opts.axis === 'function') {
        try { a = opts.axis(p) } catch (err) {
            console.warn('[fx] axis(ctx) threw: ' + err)
        }
    } else if (opts.toward != null && p != null) {
        let t = FX.pos(opts.toward, { level: p.level || null })
        if (t != null) a = [t.x - p.x, t.y - p.y, t.z - p.z]
    } else if (opts.to != null && p != null) {
        let t = FX.pos(opts.to, { level: p.level || null })
        if (t != null) a = [t.x - p.x, t.y - p.y, t.z - p.z]
    } else if (Array.isArray(opts.axis)) {
        a = opts.axis
    } else if (opts.axis != null && typeof opts.axis === 'object') {
        a = [opts.axis.x || 0, opts.axis.y || 0, opts.axis.z || 0]
    } else if (opts.heading != null || opts.tilt != null) {
        return FX._axisHF('h', opts.heading || 0, opts.tilt || 0)
    } else if (opts.facing != null) {
        return FX._axisHF('f', opts.facing, 0)
    }

    if (a == null) a = defDir
    if (a == null) return [0, 1, 0]
    return axisVec(a)
}

// current in-plane angle in RADIANS: (roll + spin*t) degrees → radians
FX._rollAt = function(opts, t) {
    return FX._rad((opts.roll || 0) + (opts.spin || 0) * (t || 0))
}

// point & outward direction on a circle around the origin:
// basis [u, v], radius r, in-plane angle theta (radians)
FX._circle = function(u, v, r, theta) {
    let c = Math.cos(theta), s = Math.sin(theta)
    let dx = u[0] * c + v[0] * s
    let dy = u[1] * c + v[1] * s
    let dz = u[2] * c + v[2] * s
    return { x: dx * r, y: dy * r, z: dz * r, dx: dx, dy: dy, dz: dz }
}