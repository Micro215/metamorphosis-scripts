// effects/2d/line.js
// ============================================================================
//  line — particle segment between two targets, re-resolved live each frame
//
//  opts:
//    from     target  you             segment start
//    to       target  5 ahead of you  segment end
//    points   number  16              particles along the segment
//    duration number  0               0 = full segment; N = grow
//    interval number  1
//    count    number  1
//    colors   color   —               dust mode, cycled along the line
//    size     number  1
//
//  example: from:me to:look:8 points:20
// ============================================================================
global.libs.fx.commands.register('line', {
    usage: 'particle segment between two targets',
    opts: [
        { key: 'points',   type: 'number', def: 16 },
        { key: 'duration', type: 'number', def: 0 },
        { key: 'interval', type: 'number', def: 1 },
        { key: 'count',    type: 'number', def: 1 },
        { key: 'colors',   type: 'color',  def: null },
        { key: 'size',     type: 'number', def: 1 },
    ],
    example: 'from:me to:look:8 points:20',
    run: function(ctx) {
        let FX = global.libs.fx
        let opts = ctx.opts
        let from = opts.from != null ? opts.from : ctx.player
        let to = opts.to != null ? opts.to : FX.commands._lookPoint(ctx.player, 5)
        let sources = FX._sources(from, ctx.level)
        let colors = FX.colors(opts.colors)
        let particle = FX._o(opts, 'particle')
        let n = Math.max(2, opts.points | 0)
        let dur = opts.duration | 0
        let o = FX._drawOpts(opts)

        FX._animate(ctx, opts, function(t) {
            let prog = dur > 0 ? Math.min(1, t / dur) : 1
            FX._frame(ctx, opts, sources, function(pf) {
                let pt = FX.pos(to, { level: ctx.level })
                if (pt == null) return
                let head = {
                    x: pf.x + (pt.x - pf.x) * prog,
                    y: pf.y + (pt.y - pf.y) * prog,
                    z: pf.z + (pt.z - pf.z) * prog,
                }
                FX._segment(pf, head, n, function(x, y, z, i) {
                    FX._emit(pf.level, colors, particle, i, x, y, z, o)
                })
            })
        })
    },
})