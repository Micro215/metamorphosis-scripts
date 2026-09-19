// ============================================================================
//  beam — particle segment along the orientation axis from the target
//
//  opts:
//    length   number  5
//    points   number  12
//    duration number  0     0 = full beam; N = grow to full length
//    interval number  1
//    orientation: axis / toward / to / heading / tilt / facing
//                 (default: the player's look direction; to: aims the beam
//                 at the target — from:me to:<target> is the aiming form)
//    universal: count spread particleSpeed size colors singleColor
//
//  example: from:me to:"@e[type=zombie]" points:16
// ============================================================================
global.libs.fx.commands.register('beam', {
    usage: 'particle beam along the axis from the target',
    opts: [
        { key: 'length',   type: 'number', def: 5 },
        { key: 'points',   type: 'number', def: 12 },
        { key: 'duration', type: 'number', def: 0 },
        { key: 'interval', type: 'number', def: 1 },
    ],
    example: 'from:me to:"@e[type=zombie]" points:16',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.from != null ? opts.from : (opts.target != null ? opts.target : ctx.player), ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let length = Number(opts.length)
        let n = Math.max(2, opts.points | 0)
        let dur = opts.duration | 0
        let look = FX._lookDir(ctx.player)
        let o = FX._drawOpts(opts)

        FX._animate(ctx, opts, function(t) {
            let L = length * (dur > 0 ? Math.min(1, t / dur) : 1)
            FX._frame(ctx, opts, sources, function(p) {
                let axis = FX.axisOf(opts, p, look)
                let end = {
                    x: p.x + axis[0] * L,
                    y: p.y + axis[1] * L,
                    z: p.z + axis[2] * L,
                }
                FX._segment(p, end, n, function(x, y, z, i) {
                    FX._emit(p.level, colors, particle, i, x, y, z, o)
                })
            })
        })
    },
})