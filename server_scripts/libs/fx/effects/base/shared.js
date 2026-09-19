// ============================================================================
//  fx effects — shared geometry and drawing helpers
//
//  Constants: Math.* constants are unavailable in this environment —
//  FX.PI / FX.TAU are literals; Math methods (cos, sqrt, random…) work.
//
//  Effects fire once per run. repeat:N (the command wrapper) re-fires them
//  every N ticks with ctx.t advancing — the only looping mechanism.
//  duration:N opts into a self-terminating animation handle for that run;
//  interval K renders every K ticks while advancing K frames of state.
//
//  FX._drawOpts is the universal spawn option set every effect accepts:
//  count, spread, particleSpeed, size, singleColor — combinable with any
//  geometry.
// ============================================================================
let FX = global.libs.fx

FX.PI  = 3.141592653589793
FX.TAU = 6.283185307179586

// --- local vector math ---
FX._vec = {
    len: function(a) { return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]) },
    norm: function(a) {
        let l = FX._vec.len(a)
        if (l < 1e-9) return [0, 1, 0]
        return [a[0]/l, a[1]/l, a[2]/l]
    },
    cross: function(a, b) {
        return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
    },
}

// orthonormal basis [u, v] perpendicular to a unit axis
FX._basis = function(axis) {
    let h = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]
    let u = FX._vec.norm(FX._vec.cross(h, axis))
    let v = FX._vec.norm(FX._vec.cross(axis, u))
    return [u, v]
}

// ---------------------------------------------------------------------------
//  Flat-shape basis: [width direction, plane normal] for 2D shapes drawn in
//  the plane containing the growth axis (fern). The width direction is
//  horizontal and perpendicular to the axis, so the plane's tilt equals the
//  axis elevation: a horizontal axis lays the shape flat on the ground, a
//  vertical axis gives a vertical shape. Degenerate for a vertical axis —
//  any horizontal width works there.
// ---------------------------------------------------------------------------
FX._flatBasis = function(axis) {
    let u = FX._vec.cross([0, 1, 0], axis)
    if (FX._vec.len(u) < 0.001) u = FX._vec.cross([0, 0, 1], axis)
    if (FX._vec.len(u) < 0.001) u = [1, 0, 0]
    u = FX._vec.norm(u)
    return [u, FX._vec.cross(axis, u)]
}

// random direction inside a cone around a unit axis (half-angle in degrees)
FX._coneDir = function(axis, uv, angleDeg) {
    let u = uv[0], v = uv[1]
    let a = Math.random() * FX._rad(angleDeg)
    let th = Math.random() * FX.TAU
    let c = Math.cos(a), s = Math.sin(a)
    let cu = Math.cos(th), sv = Math.sin(th)
    return [
        axis[0] * c + (u[0] * cu + v[0] * sv) * s,
        axis[1] * c + (u[1] * cu + v[1] * sv) * s,
        axis[2] * c + (u[2] * cu + v[2] * sv) * s,
    ]
}

// segment p0→p1 with n points; fn(x, y, z, i)
FX._segment = function(p0, p1, n, fn) {
    if (n < 2) n = 2
    for (let i = 0; i < n; i++) {
        let s = i / (n - 1)
        fn(p0.x + (p1.x - p0.x) * s, p0.y + (p1.y - p0.y) * s, p0.z + (p1.z - p0.z) * s, i)
    }
}

// universal spawn options: count, spread (gaussian per-axis), particleSpeed,
// size, singleColor — accepted by every effect
FX._drawOpts = function(opts) {
    return {
        count: opts.count == null ? 1 : (opts.count | 0),
        spread: opts.spread == null ? 0 : opts.spread,
        speed: opts.particleSpeed == null ? 0 : Number(opts.particleSpeed),
        size: opts.size == null ? 1 : Number(opts.size),
        singleColor: opts.singleColor,
    }
}

// one particle or colored dust at a shape point; colors cycle by ci
FX._emit = function(level, colors, particle, ci, x, y, z, o) {
    if (colors != null && colors.length > 0) FX._spawnColor(level, colors, ci, x, y, z, o)
    else FX._spawn(level, particle, x, y, z, o)
}

// resolve sources to live points (offset applied), fn(p, i) per visible one
FX._frame = function(ctx, opts, sources, fn) {
    let vd = FX._viewDistOf(opts)
    let pts = FX._points(sources, FX._offset(opts.offset))
    for (let i = 0; i < pts.length; i++) {
        let p = pts[i]
        if (!FX._visible(ctx.server, p, vd)) continue
        fn(p, i)
    }
}

// the player's look direction — the default axis for beam and burst
FX._lookDir = function(player) {
    try { return global.libs.math.orient.fromEntity(player) } catch (err) {}
    return [0, 1, 0]
}

// animation runner: draw(t, acc) at logical time t, clamped to duration.
// duration <= 0 → one frame at ctx.t (repeat re-fires with advancing t);
// duration > 0 → a self-terminating handle, re-runs replace the previous
// animation of the same effect.
FX._animate = function(ctx, opts, draw) {
    let dur = opts.duration == null ? 0 : (opts.duration | 0)
    let forever = dur < 0
    if (!forever && !(dur > 0)) { draw(ctx.t || 0, 0); return null }
    let interval = Math.max(1, (opts.interval | 0) || 1)
    let name = opts.name != null ? String(opts.name) : ('anim:' + (ctx.effect || 'fx'))
    let handle = null
    handle = FX._add('anim', name, function(server, acc) {
        handle._t = (handle._t || 0) + acc
        draw(forever ? handle._t : Math.min(handle._t, dur), acc)
        if (!forever && handle._t >= dur) handle.stop()
    }, { replace: true, interval: interval })
    draw(0, 0)
    return handle
}