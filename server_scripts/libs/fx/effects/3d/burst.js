// ============================================================================
//  burst — one-shot directional cone; particles carry their own velocity
//
//  opts:
//    points        number  20    particles in the cone
//    angle         number  30    cone half-angle (deg)
//    particleSpeed number  0     particle velocity along the cone directions
//    orientation: axis / toward / to / heading / tilt / facing
//                 (default: the player's look direction)
//    universal: spread size colors singleColor count
//               (colored mode: one packet, random radial velocities —
//                cone directions do not apply)
//
//  example: target:me to:look:10 angle:15 particleSpeed:0.5 points:30
// ============================================================================
global.libs.fx.commands.register('burst', {
    usage: 'directional particle cone from the target',
    opts: [
        { key: 'points', type: 'number', def: 20 },
        { key: 'angle',  type: 'number', def: 30 },
    ],
    example: 'target:me to:look:10 angle:15 particleSpeed:0.5 points:30 particle:flame',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let n = Math.max(1, opts.points | 0)
        let angle = Number(opts.angle)
        let spd = Number(opts.particleSpeed) || 0
        let look = FX._lookDir(ctx.player)
        let o = FX._drawOpts(opts)

        FX._frame(ctx, opts, sources, function(p) {
            if (colors != null && colors.length > 0) {
                FX._spawnColor(p.level, colors, 0, p.x, p.y, p.z, o)
                return
            }
            let axis = FX.axisOf(opts, p, look)
            let uv = FX._basis(axis)
            for (let i = 0; i < n; i++) {
                let d = FX._coneDir(axis, uv, angle)
                FX._spawnDir(p.level, particle, p.x, p.y, p.z, d[0], d[1], d[2], spd)
            }
        })
    },
})