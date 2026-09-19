// ============================================================================
//  math — scalars, vectors, easing
// ============================================================================
let M = global.libs.math

// ------------------------------------------------------------------ scalars
M.lerp = function(a, b, t) { return a + (b - a) * t }

M.clamp = function(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v) }

// random float in [a, b]
M.rand = function(a, b) { return a + Math.random() * (b - a) }

M.dist = function(ax, ay, az, bx, by, bz) {
    let dx = bx - ax, dy = by - ay, dz = bz - az
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// ------------------------------------------------------------------ vectors
// vectors are plain [x, y, z] arrays; all helpers return NEW arrays
M.add = function(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] }

M.sub = function(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }

M.scale = function(v, k) { return [v[0] * k, v[1] * k, v[2] * k] }

M.dot = function(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }

M.cross = function(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

M.len = function(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) }

// normalized copy; a zero vector comes back as [0, 0, 0]
M.norm = function(v) {
    let l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    if (l < 1e-9) return [0, 0, 0]
    return [v[0] / l, v[1] / l, v[2] / l]
}

// ------------------------------------------------------------------ easing
// t in 0..1 → 0..1
M.ease = {
    linear:    function(t) { return t },
    easeIn:    function(t) { return t * t },
    easeOut:   function(t) { return 1 - (1 - t) * (1 - t) },
    easeInOut: function(t) {
        if (t < 0.5) return 2 * t * t
        let u = -2 * t + 2
        return 1 - u * u / 2
    },
    smooth:    function(t) { return t * t * (3 - 2 * t) },
}