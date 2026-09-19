// ============================================================================
//  fx — sound: spatial playsound wrapper with optional looping
//
//  sound(server, pos, id, opts):
//    pos           {x,y,z} — the sound origin
//    opts.category 'master' (default) | 'music' | …
//    opts.volume   loudness; values above 1 only extend the audible radius
//    opts.pitch    1
//    opts.distance audible radius in blocks (default 16*volume)
//    opts.level    play in this level's dimension: recipients are gated by
//                  a distance selector in that dimension; without it the
//                  sound is delivered to every player and the client-side
//                  falloff provides locality (dimension-independent)
//    opts.loop     interval in ticks: re-fire until stopped; null = once
//    opts.name     handle name (/fx list, /fx stop; a re-play replaces)
//
//  Returns a handle for looped sounds; handle.stop() also stopsound's the
//  exact id in the category, so stopping one track cuts no other audio.
//  One-shots return null. Failed commands warn once per handle.
// ============================================================================
let FX = global.libs.fx

FX.sound = function(server, pos, id, opts) {
    opts = opts || {}
    if (server == null || id == null || pos == null) return null

    let x = Number(pos.x) || 0
    let y = Number(pos.y) || 0
    let z = Number(pos.z) || 0
    let category = opts.category == null ? 'master' : String(opts.category)
    let volume = opts.volume == null ? 1 : Number(opts.volume)
    let pitch = opts.pitch == null ? 1 : Number(opts.pitch)
    let dist = opts.distance == null ? Math.max(16, volume * 16) : Number(opts.distance)

    // volume <= 1 scales loudness down; above 1 it only extends the radius.
    // dist/16 + 1 keeps full loudness across the whole radius and fades to
    // zero right past it — the client-side equivalent of distance gating.
    let vol = volume <= 1 ? volume : dist / 16 + 1

    let dim = null
    if (opts.dimension != null) dim = String(opts.dimension)
    else if (opts.level != null) {
        try { dim = String(opts.level.dimension) } catch (err) { dim = null }
    }

    let warned = false
    function fire() {
        let cmd
        if (dim != null) {
            // selector-gated: recipients within dist, this dimension only
            cmd = 'execute in ' + dim + ' positioned ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + z.toFixed(2) +
                ' run playsound ' + id + ' ' + category +
                ' @a[distance=..' + dist + '] ~ ~ ~ ' + volume + ' ' + pitch
        } else {
            // dimension-independent: everyone gets the packet, the client
            // attenuates by listener distance (radius ~ dist)
            cmd = 'playsound ' + id + ' ' + category +
                ' @a ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + z.toFixed(2) +
                ' ' + vol + ' ' + pitch
        }
        try {
            let r = server.runCommandSilent(cmd)
            if (!warned && r != null && r != 1) {
                warned = true
                console.warn('[fx] sound command failed: "' + cmd + '" — check the sound id')
            }
        } catch (err) {}
    }

    function cut() {
        try { server.runCommandSilent('stopsound @a ' + category + ' ' + id) } catch (err) {}
    }

    if (opts.loop != null && opts.loop > 0) {
        let every = Math.max(1, opts.loop | 0)
        let name = opts.name != null ? String(opts.name) : null
        let handle = null
        handle = FX._add('sound', name, function() { fire() },
            { replace: name != null, interval: every })
        let baseStop = handle.stop
        handle.stop = function() {
            baseStop.call(this)
            cut()
        }
        fire()
        return handle
    }

    fire()
    return null
}