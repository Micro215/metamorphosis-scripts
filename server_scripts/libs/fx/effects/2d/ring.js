// effects/2d/ring.js
// ============================================================================
//  ring — flat circle of particles around an axis through the target
//
//  opts:
//    radius   number  1
//    points   number  24
//    roll     number  0     start angle in the circle plane (deg)
//    spin     number  0     deg/tick; moves with duration or repeat
//    duration number  0     0 = one frame; N = animate for N ticks
//    interval number  1     render every N ticks (animated mode)
//    count    number  1
//    colors   color   —     dust mode, cycled per point
//    size     number  1
//    orientation: axis / toward / heading / tilt / facing (default up)
//
//  example: target:me radius:1.5 points:30 spin:12 duration:40
//  loop:    /fx effect run ring target:me spin:12 repeat:2
// ============================================================================
global.libs.fx.commands.register('ring', {
    usage: 'circle of particles around the target',
    opts: [
        { key: 'radius',   type: 'number', def: 1 },
        { key: 'points',   type: 'number', def: 24 },
        { key: 'roll',     type: 'number', def: 0 },
        { key: 'spin',     type: 'number', def: 0 },
        { key: 'duration', type: 'number', def: 0 },
        { key: 'interval', type: 'number', def: 1 },
        { key: 'count',    type: 'number', def: 1 },
        { key: 'colors',   type: 'color',  def: null },
        { key: 'size',     type: 'number', def: 1 },
    ],
    example: 'target:me radius:1.5 points:30 spin:12 duration:40',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let radius = Number(opts.radius)
        let n = Math.max(3, opts.points | 0)
        let o = FX._drawOpts(opts)

        FX._animate(ctx, opts, function(t) {
            FX._frame(ctx, opts, sources, function(p) {
                let axis = FX.axisOf(opts, p)
                let uv = FX._basis(axis)
                let base = FX._rollAt(opts, t)
                let step = FX.TAU / n
                for (let i = 0; i < n; i++) {
                    let c = FX._circle(uv[0], uv[1], radius, base + i * step)
                    FX._emit(p.level, colors, particle, i, p.x + c.x, p.y + c.y, p.z + c.z, o)
                }
            })
        })
    },
})