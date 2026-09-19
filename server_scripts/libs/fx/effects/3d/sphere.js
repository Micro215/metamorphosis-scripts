// effects/3d/sphere.js
// ============================================================================
//  sphere — particle sphere around the target, one call per point
//
//  opts:
//    radius  number  1.5
//    points  number  60
//    mode    enum    shell|volume   shell: fibonacci lattice (even);
//                                     volume: uniform random positions
//    count   number  1
//    colors  color   —              dust mode, cycled per point
//    size    number  1
//
//  volume draws one call per particle — for a cheap dense core use cloud.
//
//  example: target:me radius:2 points:80 mode:shell
// ============================================================================
global.libs.fx.commands.register('sphere', {
    usage: 'particle sphere around the target',
    opts: [
        { key: 'radius', type: 'number', def: 1.5 },
        { key: 'points', type: 'number', def: 60 },
        { key: 'mode',   type: 'enum', vals: ['shell', 'volume'], def: 'shell' },
        { key: 'count',  type: 'number', def: 1 },
        { key: 'colors', type: 'color',  def: null },
        { key: 'size',   type: 'number', def: 1 },
    ],
    example: 'target:me radius:2 points:80 mode:shell',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let radius = Number(opts.radius)
        let n = Math.max(4, opts.points | 0)
        let mode = String(opts.mode)
        let o = FX._drawOpts(opts)
        let ga = FX.PI * (3 - Math.sqrt(5))

        FX._frame(ctx, opts, sources, function(p) {
            for (let i = 0; i < n; i++) {
                let dx, dy, dz
                if (mode === 'volume') {
                    let z = 2 * Math.random() - 1
                    let th = FX.TAU * Math.random()
                    let r = Math.sqrt(Math.max(0, 1 - z * z))
                    let rr = radius * Math.pow(Math.random(), 1 / 3)
                    dx = Math.cos(th) * r * rr
                    dy = z * rr
                    dz = Math.sin(th) * r * rr
                } else {
                    let y = 1 - 2 * (i + 0.5) / n
                    let r = Math.sqrt(Math.max(0, 1 - y * y))
                    let th = ga * i
                    dx = Math.cos(th) * r * radius
                    dy = y * radius
                    dz = Math.sin(th) * r * radius
                }
                FX._emit(p.level, colors, particle, i, p.x + dx, p.y + dy, p.z + dz, o)
            }
        })
    },
})