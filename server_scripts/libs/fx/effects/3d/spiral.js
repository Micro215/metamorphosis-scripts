// effects/3d/spiral.js
// ============================================================================
//  spiral — helix around the axis, growing along it
//
//  opts:
//    radius   number  1
//    height   number  4     extent along the axis
//    turns    number  2     full revolutions
//    points   number  40    particles along the whole helix
//    roll     number  0     start angle (deg)
//    duration number  0     0 = full helix; N = grow, only new points are
//                          drawn each frame (incremental)
//    interval number  1
//    count    number  1
//    colors   color   —
//    size     number  1
//    orientation: axis / toward / heading / tilt / facing (default up)
//
//  example: target:me height:6 turns:3 duration:30 particle:flame
// ============================================================================
global.libs.fx.commands.register('spiral', {
    usage: 'growing helix around the axis',
    opts: [
        { key: 'radius',   type: 'number', def: 1 },
        { key: 'height',   type: 'number', def: 4 },
        { key: 'turns',    type: 'number', def: 2 },
        { key: 'points',   type: 'number', def: 40 },
        { key: 'roll',     type: 'number', def: 0 },
        { key: 'duration', type: 'number', def: 0 },
        { key: 'interval', type: 'number', def: 1 },
        { key: 'count',    type: 'number', def: 1 },
        { key: 'colors',   type: 'color',  def: null },
        { key: 'size',     type: 'number', def: 1 },
    ],
    example: 'target:me height:6 turns:3 duration:30 particle:flame',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let radius = Number(opts.radius)
        let height = Number(opts.height)
        let turns = Number(opts.turns)
        let n = Math.max(4, opts.points | 0)
        let roll = FX._rad(Number(opts.roll))
        let dur = opts.duration | 0
        let o = FX._drawOpts(opts)
        let prev = 0

        FX._animate(ctx, opts, function(t) {
            let prog = dur > 0 ? Math.min(1, t / dur) : 1
            let i0 = dur > 0 ? Math.floor(prev * n) : 0
            let i1 = Math.min(n, Math.ceil(prog * n))
            prev = prog
            if (i1 <= i0) return
            FX._frame(ctx, opts, sources, function(p) {
                let axis = FX.axisOf(opts, p)
                let uv = FX._basis(axis)
                for (let i = i0; i < i1; i++) {
                    let s = i / (n - 1)
                    let c = FX._circle(uv[0], uv[1], radius, roll + FX.TAU * turns * s)
                    FX._emit(p.level, colors, particle, i,
                        p.x + axis[0] * height * s + c.x,
                        p.y + axis[1] * height * s + c.y,
                        p.z + axis[2] * height * s + c.z, o)
                }
            })
        })
    },
})