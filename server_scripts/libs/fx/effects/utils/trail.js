// effects/utils/trail.js
// ============================================================================
//  trail — particles at the target's feet; pair with repeat to trail a
//  moving target
//
//  opts:
//    particle particle flame
//    spread   vector  0.08
//
//  example: target:@s repeat:2
// ============================================================================
let FX = global.libs.fx

FX.commands.register('trail', {
    usage: 'particle trail at the target (pair with repeat)',
    opts: [
        { key: 'particle', type: 'particle', def: 'flame' },
        { key: 'spread',   type: 'vector', def: 0.08 },
    ],
    example: 'target:@s repeat:2',
    run: function(ctx) {
        let opts = ctx.opts
        if (opts.offset == null) opts.offset = [0, 0.2, 0]
        let sources = FX._sources(opts.target != null ? opts.target : ctx.player, ctx.level)
        let o = {
            count: 1,
            spread: opts.spread,
            speed: FX._o(opts, 'speed'),
            size: FX._o(opts, 'size'),
            singleColor: opts.singleColor,
        }
        FX._frame(ctx, opts, sources, function(p) {
            FX._emit(p.level, null, opts.particle, 0, p.x, p.y, p.z, o)
        })
    },
})