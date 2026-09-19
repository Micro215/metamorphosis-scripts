// effects/3d/shockwave.js
// ============================================================================
//  shockwave — expanding ring on the plane perpendicular to the axis
//
//  opts:
//    radius   number  3     final radius
//    r0       number  0     start radius
//    duration number  20    expansion length in ticks; 0 = static ring
//    easing   enum    out|linear|in
//    points   number  36    particles on the ring
//    interval number  1     render every N ticks
//    count    number  1
//    colors   color   —
//    size     number  1
//    orientation: axis / toward / heading / tilt / facing (default up)
//
//  example: target:here radius:6 duration:25 points:40
// ============================================================================


global.libs.fx._ease = {
    linear: function(p) { return p },
    out:    function(p) { return p * (2 - p) },
    in:     function(p) { return p * p },
}

global.libs.fx.commands.register('shockwave', {
    usage: 'expanding ring from the target',
    opts: [
        { key: 'radius',   type: 'number', def: 3 },
        { key: 'r0',       type: 'number', def: 0 },
        { key: 'duration', type: 'number', def: 20 },
        { key: 'easing',   type: 'enum', vals: ['out', 'linear', 'in'], def: 'out' },
        { key: 'points',   type: 'number', def: 36 },
        { key: 'interval', type: 'number', def: 1 },
        { key: 'count',    type: 'number', def: 1 },
        { key: 'colors',   type: 'color',  def: null },
        { key: 'size',     type: 'number', def: 1 },
    ],
    example: 'target:here radius:6 duration:25 points:40',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let rMax = Number(opts.radius)
        let rMin = Number(opts.r0)
        let n = Math.max(3, opts.points | 0)
        let ease = FX._ease[String(opts.easing)] || FX._ease.out
        let dur = opts.duration | 0
        let o = FX._drawOpts(opts)

        FX._animate(ctx, opts, function(t) {
            let prog = dur > 0 ? ease(Math.min(1, t / dur)) : 1
            let r = rMin + (rMax - rMin) * prog
            FX._frame(ctx, opts, sources, function(p) {
                let axis = FX.axisOf(opts, p)
                let uv = FX._basis(axis)
                let step = FX.TAU / n
                for (let i = 0; i < n; i++) {
                    let c = FX._circle(uv[0], uv[1], r, i * step)
                    FX._emit(p.level, colors, particle, i, p.x + c.x, p.y + c.y, p.z + c.z, o)
                }
            })
        })
    },
})