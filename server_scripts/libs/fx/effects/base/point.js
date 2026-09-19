// ============================================================================
//  point — particles at the target; the one-shot primitive
//
//  opts:
//    count   number  1     particles per target point
//    spread  vector  0     gaussian spread per axis
//    speed   number  0     random particle velocity
//    colors  color   —     'r,g,b' | '#hex' | several | {random:N};
//                          dust mode — particle is ignored
//    size    number  1     dust size (colors mode)
//
//  example: target look count 10 spread 0.3 particle flame
// ============================================================================
global.libs.fx.commands.register('point', {
    usage: 'particles at the target',
    opts: [
        { key: 'count',  type: 'number', def: 1 },
        { key: 'spread', type: 'vector', def: 0 },
        { key: 'colors', type: 'color',  def: null },
        { key: 'size',   type: 'number', def: 1 },
    ],
    example: 'target look count 10 spread 0.3 particle flame',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let o = FX._drawOpts(opts)
        FX._frame(ctx, opts, sources, function(p) {
            FX._emit(p.level, colors, particle, 0, p.x, p.y, p.z, o)
        })
    },
})