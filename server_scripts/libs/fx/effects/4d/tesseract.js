// ============================================================================
//  tesseract — rotating 4D hypercube projected into 3D
//
//  16 vertices (±1)^4, 32 edges (pairs differing in one coordinate).
//  spinA rotates the xw plane, spinB the yz plane (deg/tick) — 4D rotation,
//  not a 3D tilt. dist is the 4D projection distance (perspective: smaller
//  = stronger). The 3D orientation of the projected cube is set with the
//  usual axis / toward / to / heading / tilt / facing (default: up).
//
//  opts:
//    size     number  2     3D extent of the projected cube
//    points   number  3     particles per edge (2 = endpoints only)
//    spinA    number  2     xw plane rotation (deg/tick)
//    spinB    number  3     yz plane rotation (deg/tick)
//    dist     number  3     4D projection distance
//    duration number  0     0 = one projection; N = rotate for N ticks
//    interval number  2     render every N ticks (96 sends/frame at points 3)
//    orientation: axis / toward / to / heading / tilt / facing
//    universal: count spread particleSpeed size colors singleColor
//
//  example: target:look size:3 duration:100
//  tilted:  target:me heading:45 tilt:30 repeat:2
// ============================================================================


// static vertex/edge tables, computed once at load
global.libs.fx._tessVerts = []
for (let i = 0; i < 16; i++) {
    global.libs.fx._tessVerts.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1])
}
global.libs.fx._tessEdges = []
for (let i = 0; i < 16; i++) {
    for (let b = 0; b < 4; b++) {
        let j = i ^ (1 << b)
        if (j > i) global.libs.fx._tessEdges.push([i, j])
    }
}

global.libs.fx.commands.register('tesseract', {
    usage: 'rotating 4D hypercube projection',
    opts: [
        { key: 'size',     type: 'number', def: 2 },
        { key: 'points',   type: 'number', def: 3 },
        { key: 'spinA',    type: 'number', def: 2 },
        { key: 'spinB',    type: 'number', def: 3 },
        { key: 'dist',     type: 'number', def: 3 },
        { key: 'duration', type: 'number', def: 0 },
        { key: 'interval', type: 'number', def: 2 },
    ],
    example: 'target:look size:3 duration:100',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let size = Number(opts.size)
        let n = Math.max(2, opts.points | 0)
        let spinA = Number(opts.spinA)
        let spinB = Number(opts.spinB)
        let dist = Math.max(1.2, Number(opts.dist))
        let o = FX._drawOpts(opts)

        FX._animate(ctx, opts, function(t) {
            let A = FX._rad(spinA * t), B = FX._rad(spinB * t)
            let ca = Math.cos(A), sa = Math.sin(A)
            let cb = Math.cos(B), sb = Math.sin(B)

            function proj(v) {
                let x = v[0] * ca - v[3] * sa
                let w = v[0] * sa + v[3] * ca
                let y = v[1] * cb - v[2] * sb
                let z = v[1] * sb + v[2] * cb
                let k = dist / Math.max(0.2, dist - w)
                return [x * k, y * k, z * k]
            }

            FX._frame(ctx, opts, sources, function(p) {
                let axis = FX.axisOf(opts, p)
                let uv = FX._basis(axis)
                let u = uv[0], v = uv[1]
                let sc = size / 2
                for (let e = 0; e < global.libs.fx._tessEdges.length; e++) {
                    let q0 = proj(global.libs.fx._tessVerts[global.libs.fx._tessEdges[e][0]])
                    let q1 = proj(global.libs.fx._tessVerts[global.libs.fx._tessEdges[e][1]])
                    let ax = p.x + (u[0] * q0[0] + v[0] * q0[1] + axis[0] * q0[2]) * sc
                    let ay = p.y + (u[1] * q0[0] + v[1] * q0[1] + axis[1] * q0[2]) * sc
                    let az = p.z + (u[2] * q0[0] + v[2] * q0[1] + axis[2] * q0[2]) * sc
                    let bx = p.x + (u[0] * q1[0] + v[0] * q1[1] + axis[0] * q1[2]) * sc
                    let by = p.y + (u[1] * q1[0] + v[1] * q1[1] + axis[1] * q1[2]) * sc
                    let bz = p.z + (u[2] * q1[0] + v[2] * q1[1] + axis[2] * q1[2]) * sc
                    FX._segment({ x: ax, y: ay, z: az }, { x: bx, y: by, z: bz }, n,
                        function(x, y, z) {
                            FX._emit(p.level, colors, particle, e, x, y, z, o)
                        })
                }
            })
        })
    },
})