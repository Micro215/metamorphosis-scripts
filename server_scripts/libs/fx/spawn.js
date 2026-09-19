// ============================================================================
//  fx — particle spawning, send queue, visibility, colored dust
// ============================================================================
let FX = global.libs.fx

// telemetry: FX._current is the effect type set by the command dispatcher;
// direct API calls count as 'api'
function countSpawn() {
    try {
        let st = FX._stats
        let t = FX._current || 'api'
        st._c++
        if (st._wTypes[t] == null) st._wTypes[t] = 0
        st._wTypes[t]++
    } catch (err) {}
}

// "flame" → "minecraft:flame"; namespaced ids pass through unchanged
function particleId(p) {
    let s = String(p)
    return s.indexOf(':') < 0 ? 'minecraft:' + s : s
}

// ---------------------------------------------------------------------------
//  Send queue: FIFO smoothing of bursts. Producers call FX._send(fn); the
//  driver flushes up to queueBudget sends per tick (core.js). Past queueCap
//  the oldest sends are dropped; a backlog over queueWarn is reported via
//  customDebug. queue:false sends everything immediately.
// ---------------------------------------------------------------------------
FX._sendQ = []
let qWarnAt = -100000   // last backlog warn (FX._clock ticks)
let qErrAt = -100000    // last drop/error report

FX._send = function(fn) {
    if (FX.config.queue !== true) { fn(); return }
    let q = FX._sendQ
    if (q.length >= FX.config.queueCap) {
        q.shift()
        if (FX._clock - qErrAt >= 100) {
            qErrAt = FX._clock
            console.error('[fx] send queue over cap (' + FX.config.queueCap + ') — oldest sends dropped')
            FX._dbgError('[fx] send queue over cap — oldest sends dropped')
        }
    }
    q.push(fn)
}

FX._flush = function() {
    let q = FX._sendQ
    if (q.length === 0) return
    let budget = FX.config.queueBudget | 0
    let n = budget <= 0 ? q.length : Math.min(budget, q.length)
    for (let i = 0; i < n; i++) {
        try { q[i]() } catch (err) {
            if (FX._clock - qErrAt >= 100) {
                qErrAt = FX._clock
                console.error('[fx] deferred send failed: ' + err)
            }
        }
    }
    q.splice(0, n)
    if (q.length >= FX.config.queueWarn && FX._clock - qWarnAt >= 100) {
        qWarnAt = FX._clock
        FX._dbgWarn('[fx] send queue backlog: ' + q.length + ' sends (budget ' + budget + '/tick) — sustained overload')
    }
}

FX._queueClear = function() { FX._sendQ.length = 0 }

// ---------------------------------------------------------------------------
//  Dust via Java objects: no command parsing, no string building
// ---------------------------------------------------------------------------
let DUSTJ = null
let DUSTJ_TRIED = false

function dustJavaDeps() {
    if (DUSTJ_TRIED) return DUSTJ
    DUSTJ_TRIED = true
    try {
        DUSTJ = {
            opts: Java.loadClass('net.minecraft.core.particles.DustParticleOptions'),
            vf: Java.loadClass('org.joml.Vector3f'),
        }
    } catch (err) { DUSTJ = null }
    return DUSTJ
}

// the vanilla ServerLevel behind a KubeJS level, if reachable
function vanillaLevel(level) {
    if (level == null) return null
    try { if (typeof level.sendParticles === 'function') return level } catch (err) {}
    try {
        let v = level.minecraftLevel
        if (v != null) return v
    } catch (err) {}
    try {
        if (typeof level.getMinecraftLevel === 'function') {
            let v = level.getMinecraftLevel()
            if (v != null) return v
        }
    } catch (err) {}
    return null
}

// one color, one native send; false → the caller falls back to the command path
function dustJava(level, c, size, x, y, z, count, sp, speed) {
    let deps = dustJavaDeps()
    if (deps == null) return false
    let vl = vanillaLevel(level)
    if (vl == null) return false
    let po = null
    try { po = new deps.opts(new deps.vf(c[0], c[1], c[2]), size) } catch (err) { return false }
    FX._send(function() {
        try {
            vl.sendParticles(null, po, true, x, y, z, count, sp[0], sp[1], sp[2], speed)
        } catch (err) {
            try {
                let srv = level.server
                if (srv != null) {
                    srv.runCommandSilent('particle minecraft:dust ' + c[0] + ' ' + c[1] + ' ' + c[2] +
                        ' ' + size + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + z.toFixed(2) +
                        ' ' + sp[0] + ' ' + sp[1] + ' ' + sp[2] + ' ' + speed + ' ' + count + ' force')
                }
            } catch (err2) {}
        }
    })
    return true
}

// ---------------------------------------------------------------------------
//  Low-level spawn; force is always true — visibility is cut by FX._visible
//  o: { spread: number|[x,y,z], count, speed }
// ---------------------------------------------------------------------------
FX._spawn = function(level, particle, x, y, z, o) {
    if (level == null) return
    countSpawn()
    particle = particleId(particle)
    o = o || {}
    let sp = o.spread
    if (sp == null) sp = 0
    if (!Array.isArray(sp)) sp = [sp, sp, sp]
    let count = o.count == null ? FX.defaults.count : o.count
    let speed = o.speed == null ? FX.defaults.speed : o.speed
    FX._send(function() {
        try {
            level.spawnParticles(particle, true, x, y, z, sp[0], sp[1], sp[2], count, speed)
            return
        } catch (err) {}
        try {
            let srv = level.server
            if (srv != null) {
                srv.runCommandSilent('particle ' + particle + ' ' +
                    x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + z.toFixed(2) + ' ' +
                    sp[0] + ' ' + sp[1] + ' ' + sp[2] + ' ' + speed + ' ' + count + ' force')
            }
        } catch (err) {
            if (!FX._warnSpawn) {
                FX._warnSpawn = true
                console.warn('[fx] particle "' + particle + '" failed both spawn paths')
            }
        }
    })
}

// (dx,dy,dz) is the motion direction; speed scales it
FX._spawnDir = function(level, particle, x, y, z, dx, dy, dz, speed) {
    if (level == null) return
    countSpawn()
    particle = particleId(particle)
    let spd = speed == null ? FX.defaults.speed : speed
    FX._send(function() {
        try {
            level.spawnParticles(particle, true, x, y, z, dx, dy, dz, 0, spd)
            return
        } catch (err) {}
        try {
            let srv = level.server
            if (srv != null) {
                srv.runCommandSilent('particle ' + particle + ' ' +
                    x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + z.toFixed(2) + ' ' +
                    dx + ' ' + dy + ' ' + dz + ' ' + spd + ' 0 force')
            }
        } catch (err) {}
    })
}

// true when at least one player is close enough to see the effect
FX._visible = function(server, p, viewDist) {
    if (server == null || p == null || p.level == null) return true
    if (viewDist == null || viewDist <= 0) return true
    let d2 = viewDist * viewDist
    let ok = false
    server.players.forEach(pl => {
        if (ok) return
        if (String(pl.level.dimension) !== String(p.level.dimension)) return
        let dx = pl.x - p.x, dy = pl.y - p.y, dz = pl.z - p.z
        if (dx * dx + dy * dy + dz * dz <= d2) ok = true
    })
    return ok
}

// one-shot particle spawn at target(s)
FX.spawn = function(target, opts) {
    opts = opts || {}
    let particle = particleId(FX._o(opts, 'particle'))
    let pts = FX._points(FX._sources(target, opts.level), FX._offset(opts.offset),
        opts.server || null)
    let vd = FX._viewDistOf(opts)
    for (let i = 0; i < pts.length; i++) {
        let p = pts[i]
        if (opts.server != null && !FX._visible(opts.server, p, vd)) continue
        FX._spawn(p.level, particle, p.x, p.y, p.z, opts)
    }
}

// ---------------------------------------------------------------------------
//  Colors: 'r,g,b' (0..1 floats) | '#rrggbb' | array | { random: N }
//  A single color, an array (cycled per point) or a space-separated string
//  of several colors. Parsing is memoized; results are shared, read-only.
// ---------------------------------------------------------------------------
FX.colors = function(spec) {
    let out = []
    if (spec == null) return out

    // [r, g, b] of three numbers — one color that survived value parsing
    // (the unquoted command form colors:1,0,0 arrives this way)
    if (Array.isArray(spec) && spec.length === 3 &&
            typeof spec[0] === 'number' && typeof spec[1] === 'number' && typeof spec[2] === 'number') {
        return [[spec[0], spec[1], spec[2]]]
    }

    if (typeof spec === 'string' && spec.charAt(0) === '{') {
        let inner = spec.replace('{', '').replace('}', '').trim()
        let ci = inner.indexOf(':')
        if (ci >= 0 && inner.substring(0, ci).trim() === 'random') {
            let n = parseInt(inner.substring(ci + 1), 10)
            n = isNaN(n) ? 1 : Math.max(1, n)
            for (let k = 0; k < n; k++) out.push([Math.random(), Math.random(), Math.random()])
            return out
        }
    }

    let items = Array.isArray(spec) ? spec : [spec]
    if (typeof spec === 'string' && spec.indexOf(' ') >= 0) items = spec.split(' ')

    for (let i = 0; i < items.length; i++) {
        let it = items[i]
        if (it != null && typeof it === 'object' && it.random != null) {
            let n = Math.max(1, it.random | 0)
            for (let k = 0; k < n; k++) out.push([Math.random(), Math.random(), Math.random()])
            continue
        }
        let c = FX._parseColor(it)
        if (c != null) out.push(c)
    }
    return out
}

FX._parseColor = FX._memo(function(s) {
    if (s == null) return null
    if (typeof s === 'number') return [s, s, s]   // grayscale shorthand
    if (Array.isArray(s) && s.length >= 3) {
        return [Number(s[0]) || 0, Number(s[1]) || 0, Number(s[2]) || 0]
    }
    s = String(s).trim()
    if (s.charAt(0) === '#') {                     // #rrggbb
        let h = s.substring(1)
        if (h.length === 3) h = h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2)
        if (h.length === 6) {
            return [parseInt(h.substring(0,2),16)/255, parseInt(h.substring(2,4),16)/255, parseInt(h.substring(4,6),16)/255]
        }
        return null
    }
    let parts = s.split(',')
    if (parts.length >= 3) {
        return [Number(parts[0])||0, Number(parts[1])||0, Number(parts[2])||0]
    }
    return null
}, 6000, 128)

// ---------------------------------------------------------------------------
//  One colored point:
//    default:          k colors → k calls (each a single packet, count/k each)
//    singleColor:true  one color for the whole call (one packet)
//  The Java path sends the whole count as one native packet.
// ---------------------------------------------------------------------------
FX._spawnColor = function(level, colors, ci, x, y, z, o) {
    if (level == null || colors == null || colors.length === 0) return
    o = o || {}
    let c = colors[ci % colors.length]
    let count = o.count == null ? FX.defaults.count : o.count
    let spread = o.spread
    if (spread == null) spread = 0
    if (!Array.isArray(spread)) spread = [spread, spread, spread]
    let speed = o.speed == null ? FX.defaults.speed : o.speed
    let size = o.size == null ? FX.defaults.size : o.size

    if (dustJava(level, c, size, x, y, z, Math.max(1, count | 0), spread, speed)) {
        countSpawn()
        return
    }

    if (count > 1 && o.singleColor !== true) {
        let per = Math.max(1, Math.ceil(count / colors.length))
        let left = count
        for (let i = 0; i < colors.length; i++) {
            let n = Math.min(per, left)
            if (n <= 0) break
            left -= n
            FX._spawn(level, 'minecraft:dust ' + colors[i][0] + ' ' + colors[i][1] + ' ' + colors[i][2] + ' ' + size,
                x, y, z, { spread: spread, count: n, speed: speed })
        }
    } else {
        FX._spawn(level, 'minecraft:dust ' + c[0] + ' ' + c[1] + ' ' + c[2] + ' ' + size,
            x, y, z, { spread: spread, count: count, speed: speed })
    }
}