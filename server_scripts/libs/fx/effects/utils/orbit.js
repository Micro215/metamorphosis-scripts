// effects/utils/orbit.js
// ============================================================================
//  orbit — particles around the target at angle (roll + speed·t); pair with
//  repeat to rotate — ctx.t advances between reruns, and the circle follows
//  a moving target
//
//  opts:
//    radius  number  1.2
//    points  number  3     orbiters
//    speed   number  12    rotation speed (deg/tick)
//    roll    number  0     start angle (deg)
//    count   number  1
//    colors  color   —     cycled per orbiter
//    size    number  1
//    orientation: axis / toward / heading / tilt / facing (default up)
//
//  example: target:me radius:1.5 points:4 speed:15 repeat:2
// ============================================================================
let FX = global.libs.fx

FX.commands.register('orbit', {
    usage: 'particles around the target (pair with repeat)',
    opts: [
        { key: 'radius',  type: 'number', def: 1.2 },
        { key: 'points',  type: 'number', def: 3 },
        { key: 'speed',   type: 'number', def: 12 },
        { key: 'roll',    type: 'number', def: 0 },
        { key: 'count',   type: 'number', def: 1 },
        { key: 'colors',  type: 'color',  def: null },
        { key: 'size',    type: 'number', def: 1 },
    ],
    example: 'target:me radius:1.5 points:4 speed:15 repeat:2',
    run: function(ctx) {
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let radius = Number(opts.radius)
        let n = Math.max(1, opts.points | 0)
        let t = ctx.t || 0
        let ang = FX._rad(Number(opts.roll) + Number(opts.speed) * t)
        let o = FX._drawOpts(opts)

        FX._frame(ctx, opts, sources, function(p) {
            let axis = FX.axisOf(opts, p)
            let uv = FX._basis(axis)
            let step = FX.TAU / n
            for (let i = 0; i < n; i++) {
                let c = FX._circle(uv[0], uv[1], radius, ang + i * step)
                FX._emit(p.level, colors, particle, i, p.x + c.x, p.y + c.y, p.z + c.z, o)
            }
        })
    },
})