// ============================================================================
//  fern — Barnsley fern (iterated function system)
//
//  4 affine maps with probabilities 0.01 / 0.85 / 0.07 / 0.07; each particle
//  is one iteration, so the shape emerges from the point cloud itself.
//
//  The fern's plane contains the growth axis and the horizontal direction
//  perpendicular to it — the plane's tilt equals the axis elevation:
//    horizontal axis (facing:E / heading + tilt:0) → flat on the ground
//    axis at 45°  → propped at 45°
//    axis up (default) → the classic vertical fern
//  roll rotates the fern around its growth axis (turns the vertical fern's
//  face; tilts the flat one).
//
//  opts:
//    height   number  3     extent along the growth axis
//    points   number  300   iterations to draw
//    seed     number  —     a number reproduces the same fern; null = random
//    roll     number  0     rotation around the growth axis (deg)
//    duration number  0     0 = draw everything at once; N = reveal gradually
//    interval number  1     render every N ticks (growth mode)
//    orientation: axis / toward / to / heading / tilt / facing (default up)
//    universal: count spread particleSpeed size colors singleColor
//
//  example: target:here height:3 points:500 duration:60
//  flat:    target:here facing:E points:400
// ============================================================================

// [cumulative probability, a, b, c, d, e, f]: x' = a·x + b·y + e, y' = c·x + d·y + f
let FERN = [
    [0.01, 0.00,  0.00,  0.00, 0.16, 0.00, 0.00],
    [0.86, 0.85,  0.04, -0.04, 0.85, 0.00, 1.60],
    [0.93, 0.20, -0.26,  0.23, 0.22, 0.00, 1.60],
    [1.00, -0.15, 0.28,  0.26, 0.24, 0.00, 0.44],
]
const FERN_XC = 0.25   // fern x spans about [-2.2, 2.7] — centered on this

// deterministic PRNG; a seed reproduces the same fern across runs
function fernRng(seed) {
    let s = (seed >>> 0) || 1
    return function() {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 4294967296
    }
}

global.libs.fx.commands.register('fern', {
    usage: 'Barnsley fern fractal',
    opts: [
        { key: 'height',   type: 'number', def: 3 },
        { key: 'points',   type: 'number', def: 300 },
        { key: 'seed',     type: 'number', def: null },
        { key: 'roll',     type: 'number', def: 0 },
        { key: 'duration', type: 'number', def: 0 },
        { key: 'interval', type: 'number', def: 1 },
    ],
    example: 'target:here height:3 points:500 duration:60',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let height = Math.max(0.5, Number(opts.height))
        let total = Math.max(20, opts.points | 0)
        let dur = opts.duration | 0
        let rnd = opts.seed != null ? fernRng(Number(opts.seed)) : Math.random
        let roll = FX._rad(Number(opts.roll) || 0)
        let scale = height / 10
        let o = FX._drawOpts(opts)

        function pick() {
            let r = rnd()
            for (let k = 0; k < 4; k++) {
                if (r < FERN[k][0]) return FERN[k]
            }
            return FERN[3]
        }

        FX._frame(ctx, opts, sources, function(p, idx) {
            if (idx > 0) return   // built from the first visible point

            let axis = FX.axisOf(opts, p)
            let fb = FX._flatBasis(axis)
            let u = fb[0], n = fb[1]
            if (roll !== 0) {
                let cr = Math.cos(roll), sr = Math.sin(roll)
                u = [u[0] * cr + n[0] * sr, u[1] * cr + n[1] * sr, u[2] * cr + n[2] * sr]
            }

            let x = 0, y = 0
            let drawn = 0

            function stepEmit() {
                let f = pick()
                let nx = f[1] * x + f[2] * y + f[5]
                let ny = f[3] * x + f[4] * y + f[6]
                x = nx
                y = ny
                let lx = (x - FERN_XC) * scale
                let ly = y * scale
                FX._emit(p.level, colors, particle, drawn,
                    p.x + u[0] * lx + axis[0] * ly,
                    p.y + u[1] * lx + axis[1] * ly,
                    p.z + u[2] * lx + axis[2] * ly, o)
                drawn++
            }

            // warm-up: converge into the attractor before drawing
            for (let k = 0; k < 10; k++) {
                let f = pick()
                let nx = f[1] * x + f[2] * y + f[5]
                let ny = f[3] * x + f[4] * y + f[6]
                x = nx
                y = ny
            }

            if (!(dur > 0)) {
                for (let k = 0; k < total; k++) stepEmit()
                return
            }

            FX._animate(ctx, opts, function(t) {
                let target = Math.min(total, Math.floor((t / dur) * total))
                while (drawn < target) stepEmit()
            })
        })
    },
})