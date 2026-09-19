// effects/fractals/tree.js
// ============================================================================
//  tree — recursive branching structure from the target along the axis
//
//  Segment count = (branches^(depth+1) - 1) / (branches - 1); keep depth
//  and branches modest.
//
//  opts:
//    depth    number  4      recursion levels
//    length   number  1.5    first segment length
//    shrink   number  0.7    length factor per level
//    branches number  2      children per node
//    angle    number  40     opening angle (deg)
//    density  number  4      particles per segment
//    seed     number  —      a number reproduces the same tree; null = random
//    duration number  0      0 = full tree; N = reveal level by level
//    interval number  1
//    count    number  1
//    colors   color   —
//    size     number  1
//    orientation: axis / toward / heading / tilt / facing (default up)
//
//  example: target:look depth:5 angle:35 duration:30
// ============================================================================

// deterministic PRNG; a seed reproduces the same tree across runs
function treeRng(seed) {
    let s = (seed >>> 0) || 1
    return function() {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 4294967296
    }
}

global.libs.fx.commands.register('tree', {
    usage: 'recursive branching structure',
    opts: [
        { key: 'depth',    type: 'number', def: 4 },
        { key: 'length',   type: 'number', def: 1.5 },
        { key: 'shrink',   type: 'number', def: 0.7 },
        { key: 'branches', type: 'number', def: 2 },
        { key: 'angle',    type: 'number', def: 40 },
        { key: 'density',  type: 'number', def: 4 },
        { key: 'seed',     type: 'number', def: null },
        { key: 'duration', type: 'number', def: 0 },
        { key: 'interval', type: 'number', def: 1 },
        { key: 'count',    type: 'number', def: 1 },
        { key: 'colors',   type: 'color',  def: null },
        { key: 'size',     type: 'number', def: 1 },
    ],
    example: 'target:look depth:5 angle:35 duration:30',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let depth = Math.max(1, Math.min(7, opts.depth | 0))
        let length = Number(opts.length)
        let shrink = Number(opts.shrink)
        let branches = Math.max(1, Math.min(4, opts.branches | 0))
        let angle = FX._rad(Number(opts.angle))
        let density = Math.max(2, opts.density | 0)
        let dur = opts.duration | 0
        let rnd = opts.seed != null ? treeRng(Number(opts.seed)) : Math.random
        let o = FX._drawOpts(opts)

        let built = false

        FX._frame(ctx, opts, sources, function(p) {
            if (built) return   // built from the first visible point
            built = true

            let segs = []
            function grow(pos, dir, len, level) {
                let end = [pos[0] + dir[0] * len, pos[1] + dir[1] * len, pos[2] + dir[2] * len]
                segs.push({ a: { x: pos[0], y: pos[1], z: pos[2] },
                            b: { x: end[0], y: end[1], z: end[2] }, level: level })
                if (level + 1 >= depth) return
                let uv = FX._basis(dir)
                let ca = Math.cos(angle), sa = Math.sin(angle)
                for (let br = 0; br < branches; br++) {
                    let az = FX.TAU * br / branches + (rnd() - 0.5) * 0.6
                    let cu = Math.cos(az), sv = Math.sin(az)
                    let cd = FX._vec.norm([
                        dir[0] * ca + (uv[0][0] * cu + uv[1][0] * sv) * sa,
                        dir[1] * ca + (uv[0][1] * cu + uv[1][1] * sv) * sa,
                        dir[2] * ca + (uv[0][2] * cu + uv[1][2] * sv) * sa,
                    ])
                    grow(end, cd, len * shrink, level + 1)
                }
            }

            grow([p.x, p.y, p.z], FX.axisOf(opts, p), length, 0)

            let drawn = 0
            FX._animate(ctx, opts, function(t) {
                let G = dur > 0 ? Math.min(depth, (t / dur) * depth) : depth
                while (drawn < depth && G > drawn) {
                    for (let i = 0; i < segs.length; i++) {
                        let sg = segs[i]
                        if (sg.level !== drawn) continue
                        FX._segment(sg.a, sg.b, density, function(x, y, z) {
                            FX._emit(p.level, colors, particle, i, x, y, z, o)
                        })
                    }
                    drawn++
                }
            })
        })
    },
})