// ============================================================================
//  shapes — helpers
// ============================================================================
let SH = global.libs.shapes

// normalize a position to [x, y, z]: [x,y,z] | {x,y,z} | BlockPos
SH._pos = function(p) {
    if (p == null) return null
    if (Array.isArray(p)) return [p[0] + 0, p[1] + 0, p[2] + 0]
    if (typeof p.x === 'number') return [p.x, p.y, p.z]
    if (typeof p.getX === 'function') return [p.getX(), p.getY(), p.getZ()]
    return null
}