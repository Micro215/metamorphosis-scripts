// ============================================================================
//  fx — projectile: a flying particle blob with trail, impact and callback
//
//  projectile(opts):
//    from      entity | [x,y,z] | {x,y,z}   launch point (captured at call)
//    to        entity | point                impact point; an entity is
//                                            tracked in flight only with homing
//    homing    boolean (default false)
//    speed     blocks per tick (default 1)
//    particle  trail/impact particle
//    trail     { count, spread, speed }      per tick at the current position
//    impact    { count, spread, speed }      one burst on arrival
//    onImpact  function({ server, level, x, y, z })
//    level     fallback level for array/point coordinates
//    viewDist  visibility radius (default fx.config.viewDist)
//    name      handle name
//
//  Impact fires when the projectile reaches the target, a homing target
//  dies mid-flight, or the 400-tick lifetime runs out.
// ============================================================================
let FX = global.libs.fx

FX.projectile = function(opts) {
    opts = opts || {}
    let start = FX.pos(opts.from, { level: opts.level })
    if (start == null) return null
    let lvl = start.level != null ? start.level : opts.level
    if (lvl == null) return null

    let live = opts.homing === true && FX._isEntity(opts.to)
    let target = FX.pos(opts.to, { level: lvl })
    if (target == null) return null

    let x = start.x, y = start.y, z = start.z
    let speed = Math.max(0.05, Number(opts.speed) || 1)
    let particle = opts.particle == null ? 'end_rod' : opts.particle
    let trail = opts.trail || {}
    let impact = opts.impact || {}
    let vd = opts.viewDist == null ? FX.config.viewDist : opts.viewDist
    let maxT = Math.max(20, (opts.maxTicks | 0) || 400)

    function vis(server, px, py, pz) {
        if (server == null) return true
        return FX._visible(server, { x: px, y: py, z: pz, level: lvl }, vd)
    }

    let handle = null
    handle = FX._add('projectile', opts.name, function(server) {
        handle._t = (handle._t || 0) + 1

        if (live) {
            let t2 = FX.pos(opts.to, { level: lvl })
            if (t2 == null) { hit(server); return }   // target gone: impact here
            target = t2
        }

        let dx = target.x - x, dy = target.y - y, dz = target.z - z
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d <= speed) {
            x = target.x; y = target.y; z = target.z
            hit(server)
            return
        }
        x += dx / d * speed
        y += dy / d * speed
        z += dz / d * speed

        if (trail.count != null && trail.count > 0 && vis(server, x, y, z)) {
            FX._spawn(lvl, particle, x, y, z, {
                count: trail.count, spread: trail.spread, speed: trail.speed,
            })
        }

        if (handle._t >= maxT) hit(server)
    })

    function hit(server) {
        if (handle._dead) return
        if (impact.count != null && impact.count > 0 && vis(server, x, y, z)) {
            FX._spawn(lvl, particle, x, y, z, {
                count: impact.count, spread: impact.spread, speed: impact.speed,
            })
        }
        if (typeof opts.onImpact === 'function') {
            try {
                opts.onImpact({ server: server, level: lvl, x: x, y: y, z: z })
            } catch (err) {
                console.error('[fx] projectile onImpact failed: ' + err)
            }
        }
        handle.stop()
    }

    return handle
}