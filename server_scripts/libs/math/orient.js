// ============================================================================
//  math.orient — orientation of circular effects.
//
//  ALL angles on the API are DEGREES. Internally converted to radians.
//
//  Minecraft conventions (vanilla yaw/pitch):
//    yaw   (-180, +180]:  0 = south, 90 = west, 180 = north, -90 = east
//    pitch [-90, 90]:    -90 = up, +90 = down
//
//  heading 0..360 mirrors yaw without negatives (0 = south, 90 = west,
//  180 = north, 270 = east). tilt 0..90: 0 = horizontal circle,
//  90 = vertical circle.
//
//  An "axis" is the circle's normal: [0,1,0] (up) = flat ring on the ground.
// ============================================================================
let M = global.libs.math
let O = {}
M.orient = O

// ------------------------------------------------------------- axis sources
O.fromFacing = function(name) {
    switch (String(name).toLowerCase()) {
        case 'up':    return [0,  1, 0]
        case 'down':  return [0, -1, 0]
        case 'north': return [0, 0, -1]
        case 'south': return [0, 0,  1]
        case 'west':  return [-1, 0, 0]
        case 'east':  return [1, 0,  0]
    }
    console.warn('[math.orient] unknown facing: ' + name)
    return [0, 1, 0]
}

// vanilla look direction: yaw/pitch in degrees, conventions above
O.fromYawPitch = function(yaw, pitch) {
    let yr = yaw * M.DEG, pr = pitch * M.DEG
    let cp = Math.cos(pr)
    return [-Math.sin(yr) * cp, -Math.sin(pr), Math.cos(yr) * cp]
}

// heading = compass direction the axis points to, tilt = lean from vertical;
// tilt 0 → axis straight up (flat circle), tilt 90 → axis horizontal
// (vertical circle facing `heading`)
O.fromHeading = function(heading, tilt) {
    return O.fromYawPitch(heading, (tilt == null ? 0 : tilt) - 90)
}

// the entity's look direction; players follow the conventions exactly,
// mobs may store an inverted pitch (vanilla quirk) — use fromYawPitch
// manually when a mob's tilt looks wrong
O.fromEntity = function(entity) {
    try {
        return O.fromYawPitch(entity.yaw, entity.pitch)
    } catch (err) {
        return [0, 1, 0]
    }
}

// inverse of fromYawPitch → { yaw, pitch }, for debugging
O.toYawPitch = function(axis) {
    let a = M.norm(axis)
    let pitch = -Math.asin(M.clamp(a[1], -1, 1)) / M.DEG
    let yaw = Math.atan2(-a[0], a[2]) / M.DEG
    if (yaw > 180) yaw -= 360
    if (yaw <= -180) yaw += 360
    return { yaw: yaw, pitch: pitch }
}

// --------------------------------------------------------------- basis / rotation

// orthonormal pair [u, v] spanning the circle's plane (both ⊥ axis);
// point on circle = center + (u·cosθ + v·sinθ)·r
O.basis = function(axis) {
    let a = M.norm(axis)
    // reference vector guaranteed not to be parallel to the axis
    let ref = Math.abs(a[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0]
    let u = M.norm(M.cross(ref, a))
    let v = M.cross(a, u)
    return [u, v]
}

// rotate a vector around an axis by `deg` degrees (Rodrigues)
O.rotate = function(vec, axis, deg) {
    let a = M.norm(axis)
    let th = deg * M.DEG
    let c = Math.cos(th), s = Math.sin(th)
    let d = M.dot(a, vec)
    let cr = M.cross(a, vec)
    return [
        vec[0] * c + cr[0] * s + a[0] * d * (1 - c),
        vec[1] * c + cr[1] * s + a[1] * d * (1 - c),
        vec[2] * c + cr[2] * s + a[2] * d * (1 - c),
    ]
}

// axis tilted `tilt` degrees away from `base`, then rotated around `base`
// by `phase` degrees — one-liner for animated precessing circles:
//   axis: function(ctx) { return math.orient.orbit([0, 1, 0], 30, ctx.t * 3) }
O.orbit = function(base, tilt, phase) {
    let b = M.norm(base)
    let bv = O.basis(b)
    let u = bv[0], v = bv[1]
    let ct = Math.cos(tilt * M.DEG), st = Math.sin(tilt * M.DEG)
    let cp = Math.cos(phase * M.DEG), sp = Math.sin(phase * M.DEG)
    let rx = u[0] * cp + v[0] * sp
    let ry = u[1] * cp + v[1] * sp
    let rz = u[2] * cp + v[2] * sp
    return [
        b[0] * ct + rx * st,
        b[1] * ct + ry * st,
        b[2] * ct + rz * st,
    ]
}