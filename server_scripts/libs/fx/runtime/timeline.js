// ============================================================================
//  fx — timeline: sequenced steps on the driver tick
//
//  timeline(steps, opts):
//    steps   [{ t: tickOffset, fn: function() }] — t is absolute, from the
//            timeline start; unordered input is sorted
//    opts.name   handle name (/fx list, /fx stop; a re-run replaces)
//    opts.while  function() → keep running while true
//    opts.onEnd  called exactly once — natural end, while() failure,
//                a crashed step, /fx stop, or a wipe
// ============================================================================
let FX = global.libs.fx

FX.timeline = function(steps, opts) {
    opts = opts || {}

    let sorted = []
    let n = steps == null ? 0 : steps.length
    for (let i = 0; i < n; i++) {
        let s = steps[i]
        if (s == null || typeof s.fn !== 'function') continue
        sorted.push({ t: Math.max(0, s.t | 0), fn: s.fn })
    }
    sorted.sort(function(a, b) { return a.t - b.t })

    let ended = false
    function end() {
        if (ended) return
        ended = true
        if (typeof opts.onEnd === 'function') {
            try { opts.onEnd() } catch (err) {
                console.error('[fx] timeline onEnd failed: ' + err)
            }
        }
    }

    let i = 0
    let handle = null
    handle = FX._add('timeline', opts.name, function(server) {
        handle._t = (handle._t || 0) + 1
        if (opts.while != null && opts.while() !== true) { handle.stop(); return }
        while (i < sorted.length && sorted[i].t <= handle._t) {
            try {
                sorted[i].fn()
            } catch (err) {
                console.error('[fx] timeline step t=' + sorted[i].t + ' failed: ' + err)
            }
            i++
        }
        if (i >= sorted.length) handle.stop()
    }, { replace: opts.name != null })

    let baseStop = handle.stop
    handle.stop = function() {
        baseStop.call(this)
        end()
    }
    return handle
}