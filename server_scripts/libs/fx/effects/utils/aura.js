// effects/utils/aura.js
// ============================================================================
//  aura — one puff of rising particles at the target; pair with repeat for
//  a continuous, target-following aura (repeat replaces the previous run)
//
//  opts:
//    particle particle soul_fire_flame
//    count    number  2
//    spread   vector  0.35
//    colors   color   —
//    size     number  1
//
//  example: target:"@e[type=zombie,limit=1]" repeat:3
// ============================================================================
let FX = global.libs.fx

FX.commands.register('aura', {
    usage: 'rising aura puff at the target (pair with repeat)',
    opts: [
        { key: 'particle', type: 'particle', def: 'soul_fire_flame' },
        { key: 'count',    type: 'number', def: 2 },
        { key: 'spread',   type: 'vector', def: 0.35 },
        { key: 'colors',   type: 'color',  def: null },
        { key: 'size',     type: 'number', def: 1 },
    ],
    example: 'target:"@e[type=zombie,limit=1]" repeat:3',
    run: function(ctx) {
        let opts = ctx.opts
        if (opts.offset == null) opts.offset = [0, 1, 0]
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let colors = FX.colors(opts.colors)
        let o = FX._drawOpts(opts)
        FX._frame(ctx, opts, sources, function(p) {
            FX._emit(p.level, colors, opts.particle, 0, p.x, p.y, p.z, o)
        })
    },
})