// effects/base/cloud.js
// ============================================================================
//  cloud — gaussian particle cloud around the target, one batched packet
//  per target point (k packets with k colors)
//
//  count fills a ~3σ ball of 'radius'; denser at the center — exact
//  geometry needs point/sphere.
//
//  opts:
//    radius  number  3
//    count   number  30
//    speed   number  0
//    colors  color   —
//    size    number  1
//
//  example: target:me radius:4 count:60 colors:{random:3}
// ============================================================================
global.libs.fx.commands.register('cloud', {
    usage: 'batched particle cloud around the target',
    opts: [
        { key: 'radius', type: 'number', def: 3 },
        { key: 'count',  type: 'number', def: 30 },
        { key: 'speed',  type: 'number', def: 0 },
        { key: 'colors', type: 'color',  def: null },
        { key: 'size',   type: 'number', def: 1 },
    ],
    example: 'target:me radius:4 count:60 colors:{random:3}',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let o = FX._drawOpts(opts)
        o.spread = opts.spread != null ? opts.spread : FX._spreadFor(Number(opts.radius))
        FX._frame(ctx, opts, sources, function(p) {
            FX._emit(p.level, colors, particle, 0, p.x, p.y, p.z, o)
        })
    },
})