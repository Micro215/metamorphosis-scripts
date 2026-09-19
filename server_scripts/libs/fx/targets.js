// ============================================================================
//  fx — targets: entities / selectors / positions → live points
//
//    entity / player          → the effect follows it, dies with it
//    { x, y, z, level }       → static point (blocks resolve this way)
//    [x, y, z] + level option → static point
//    { tag, type, near, ... } → entity selector (fx.entities, live)
//    array / Java collection  → one source per item
// ============================================================================
let FX = global.libs.fx

// iterate a JS array or a Java collection
FX._each = function(coll, fn) {
    if (coll == null) return
    if (Array.isArray(coll)) {
        for (let i = 0; i < coll.length; i++) fn(coll[i], i)
        return
    }
    let it = coll.iterator()
    let i = 0
    while (it.hasNext()) fn(it.next(), i++)
}

// public: is the entity alive and usable
FX.entValid = function(e) {
    try { return e != null && e.alive === true } catch (err) { return false }
}

// looks like an entity (has uuid/alive) — as opposed to blocks/positions
FX._isEntity = function(o) {
    if (o == null || typeof o !== 'object' || Array.isArray(o)) return false
    try { return o.uuid !== undefined || o.alive !== undefined } catch (err) { return false }
}

// selector spec: { tag, type, near, predicate, players }
FX._isSelector = function(o) {
    if (o == null || typeof o !== 'object' || Array.isArray(o)) return false
    if (o.x !== undefined) return false // that's a position instead
    return o.tag !== undefined || o.type !== undefined ||
            o.near !== undefined || o.predicate !== undefined ||
            o.players !== undefined
}

// a coordinate-like token: number or '~…' string
function isCoord(v) {
    if (typeof v === 'number') return true
    if (typeof v === 'string' && v.charAt(0) === '~') return true
    return false
}

function pushStatic(out, x, y, z, level) {
    if (level == null) console.warn('[fx] target has no level — pass level in the effect options')
    out.push({ level: level, x: x, y: y, z: z })
}

// ---------------------------------------------------------------------------
//  FX.pos(t, fb) → { x, y, z, level } | null
//  Entities resolve to their live position; fb = { level } is the fallback
//  level for points without one.
// ---------------------------------------------------------------------------
FX.pos = function(t, fb) {
    if (t == null) return null
    if (FX._isEntity(t)) {
        if (!FX.entValid(t)) return null
        return { x: t.x, y: t.y, z: t.z, level: t.level }
    }
    if (Array.isArray(t) && t.length === 3 && isCoord(t[0]) && isCoord(t[1]) && isCoord(t[2])) {
        let fl = fb != null ? fb.level : null
        return { x: Number(t[0]) || 0, y: Number(t[1]) || 0, z: Number(t[2]) || 0, level: fl }
    }
    if (typeof t === 'object' && t.x !== undefined && t.y !== undefined && t.z !== undefined) {
        let fl = (t.level != null) ? t.level : (fb != null ? fb.level : null)
        return { x: t.x, y: t.y, z: t.z, level: fl }
    }
    return null
}

// ---------------------------------------------------------------------------
//  FX._sources(spec, fallbackLevel) → array of sources
//  Entities stay entities — they are resolved to points on every use.
// ---------------------------------------------------------------------------
FX._sources = function(spec, fallbackLevel) {
    let out = []
    if (spec == null) return out

    // [x, y, z] position
    if (Array.isArray(spec) && spec.length === 3 &&
            isCoord(spec[0]) && isCoord(spec[1]) && isCoord(spec[2])) {
        pushStatic(out, Number(spec[0]) || 0, Number(spec[1]) || 0, Number(spec[2]) || 0, fallbackLevel)
        return out
    }

    // entity
    if (FX._isEntity(spec)) {
        out.push(spec)
        return out
    }

    // selector spec → live entity list
    if (FX._isSelector(spec)) {
        let q = {}
        for (let k in spec) q[k] = spec[k]
        if (q.level == null && fallbackLevel != null) q.level = fallbackLevel
        let found = FX.entities(q)
        for (let i = 0; i < found.length; i++) out.push(found[i])
        return out
    }

    // static point { x, y, z, level? }
    if (typeof spec === 'object' && spec.x !== undefined && spec.y !== undefined && spec.z !== undefined) {
        let lvl = (spec.level != null) ? spec.level : fallbackLevel
        pushStatic(out, Number(spec.x) || 0, Number(spec.y) || 0, Number(spec.z) || 0, lvl)
        return out
    }

    // a list of targets: JS array or Java collection
    if (Array.isArray(spec) || (spec != null && typeof spec.iterator === 'function')) {
        FX._each(spec, function(item) {
            let sub = FX._sources(item, fallbackLevel)
            for (let i = 0; i < sub.length; i++) out.push(sub[i])
        })
    }
    return out
}

// ---------------------------------------------------------------------------
//  FX._points(sources, offset, server) → array of { level, x, y, z }
//  Entities are resolved live on every call; the offset is added to each.
// ---------------------------------------------------------------------------
FX._points = function(sources, offset, server) {
    let out = []
    if (sources == null) return out
    let off = offset == null ? [0, 0, 0] : offset
    let ox = off[0] || 0, oy = off[1] || 0, oz = off[2] || 0
    FX._each(sources, function(s) {
        let p = FX.pos(s)
        if (p == null) return
        out.push({ level: p.level, x: p.x + ox, y: p.y + oy, z: p.z + oz })
    })
    return out
}