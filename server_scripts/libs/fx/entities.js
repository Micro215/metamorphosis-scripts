// ============================================================================
//  fx — entity search, entity tags, type comparison
// ============================================================================
let FX = global.libs.fx

// 'zombie' ≡ 'minecraft:zombie'; 'mod:entity' matches as typed.
// Canonical definition — cmd/parse.js shares it.
FX._typeEq = function(e, want) {
    if (want == null) return true
    let t = null
    try { t = e.type } catch (err) { return false }
    if (t === want) return true
    let s = String(t)
    let short = want.indexOf(':') >= 0 ? want.substring(want.indexOf(':') + 1) : want
    let full = want.indexOf(':') >= 0 ? want : 'minecraft:' + want
    return s === short || s === full
}

function entityKey(e) {
    try { if (e.uuid !== undefined) return String(e.uuid) } catch (err) {}
    try { if (e.UUID !== undefined) return String(e.UUID) } catch (err) {}
    return null
}

// NBT value → plain string (JS strings and NBT tag wrappers)
function nbtToString(x) {
    if (typeof x === 'string') return x
    try { if (x != null && typeof x.getAsString === 'function') return x.getAsString() } catch (err) {}
    return String(x)
}

// public: the entity's vanilla Tags → array of strings, null when unreadable
FX.entityTags = function(e) {
    try {
        let live = e.tags
        if (live != null) {
            let out = []
            FX._each(live, function(x) { out.push(nbtToString(x)) })
            return out
        }
    } catch (err) {}

    let nbt = null
    try { nbt = e.nbt } catch (err) { nbt = null }
    if (nbt == null) return null

    let t = null
    try { t = nbt.Tags } catch (err) { t = null }
    if (t == null && typeof nbt.get === 'function') {
        try { t = nbt.get('Tags') } catch (err) { t = null }
    }
    if (t == null) return null
    if (typeof t === 'string') return [t]

    let out = []
    if (Array.isArray(t)) {
        for (let i = 0; i < t.length; i++) out.push(nbtToString(t[i]))
    } else {
        try { FX._each(t, function(x) { out.push(nbtToString(x)) }) } catch (err) {}
    }
    return out
}

function hasAnyTag(e, tags) {
    let et = FX.entityTags(e)
    if (et == null) return false
    for (let i = 0; i < tags.length; i++) {
        if (et.indexOf(tags[i]) >= 0) return true
    }
    return false
}

// ---------------------------------------------------------------------------
//  Entity tags — vanilla Tags + an in-memory registry for fast lookups
// ---------------------------------------------------------------------------
function addEntityTag(entity, name) {
    try {
        let live = entity.tags
        if (live != null) {
            live.add(name)
            return
        }
    } catch (err) {}
    try {
        let cur = FX.entityTags(entity)
        let merged = cur == null ? [] : cur.slice()
        if (merged.indexOf(name) < 0) merged.push(name)
        entity.mergeNbt({ Tags: merged })
    } catch (err) {}
}

function removeEntityTag(entity, name) {
    try {
        let live = entity.tags
        if (live != null) {
            live.remove(name)
            return
        }
    } catch (err) {}
    try {
        let cur = FX.entityTags(entity)
        if (cur == null) return
        let kept = []
        for (let i = 0; i < cur.length; i++) if (cur[i] !== name) kept.push(cur[i])
        entity.mergeNbt({ Tags: kept })
    } catch (err) {}
}

// fx.tag(entity, 'name') or fx.tag(entity, ['a', 'b'])
FX.tag = function(entity, name) {
    if (entity == null || name == null) return
    let names = Array.isArray(name) ? name : [String(name)]
    for (let i = 0; i < names.length; i++) {
        addEntityTag(entity, names[i])
        let list = FX._tags[names[i]]
        if (list == null) { list = []; FX._tags[names[i]] = list }
        let dup = false
        for (let k = 0; k < list.length; k++) if (list[k] === entity) { dup = true; break }
        if (!dup) list.push(entity)
    }
}

// fx.untag(entity) — from all tags; fx.untag(entity, 'name' | ['a','b'])
FX.untag = function(entity, name) {
    if (entity == null) return
    let keys = null
    if (name == null) {
        let cur = FX.entityTags(entity)
        keys = cur == null ? [] : cur.slice()
        let reg = Object.keys(FX._tags)
        for (let i = 0; i < reg.length; i++) {
            if (keys.indexOf(reg[i]) < 0) keys.push(reg[i])
        }
    } else {
        keys = Array.isArray(name) ? name : [String(name)]
    }
    for (let i = 0; i < keys.length; i++) {
        removeEntityTag(entity, keys[i])
        let list = FX._tags[keys[i]]
        if (list == null) continue
        for (let k = list.length - 1; k >= 0; k--) {
            if (list[k] === entity) list.splice(k, 1)
        }
    }
}

// ---------------------------------------------------------------------------
//  Level entity iteration — tries several methods, remembers what works
// ---------------------------------------------------------------------------
function makeAABB(x1, y1, z1, x2, y2, z2) {
    try { return new Packages.net.minecraft.world.phys.AABB(x1, y1, z1, x2, y2, z2) } catch (err) {}
    try {
        let cls = Java.loadClass('net.minecraft.world.phys.AABB')
        return new cls(x1, y1, z1, x2, y2, z2)
    } catch (err) {}
    return null
}

function levelEntities(level) {
    if (level == null) return null

    let m = FX._iterMethod
    if (m != null) {
        try {
            if (m === 'aabb') {
                let box = makeAABB(-10000, -10000, -10000, 10000, 10000, 10000)
                if (box != null) return level.getEntities(null, box)
            } else {
                let l = level[m]()
                if (l != null) return l
            }
        } catch (err) {
            FX._iterMethod = null // stopped working, re-detect next time
        }
        return null
    }

    // detect once
    try { let l = level.getEntities(); if (l != null) { FX._iterMethod = 'getEntities'; return l } } catch (err) {}
    try { let l = level.getAllEntities(); if (l != null) { FX._iterMethod = 'getAllEntities'; return l } } catch (err) {}
    try {
        let box = makeAABB(-10000, -10000, -10000, 10000, 10000, 10000)
        if (box != null) {
            let l = level.getEntities(null, box)
            if (l != null) { FX._iterMethod = 'aabb'; return l }
        }
    } catch (err) {}

    if (!FX._warnIter) {
        FX._warnIter = true
        console.warn('[fx] could not iterate level entities — { tag } selectors only work through fx.tag(); { near }/{ type }/{ predicate } need entity lists')
    }
    return null
}

// ---------------------------------------------------------------------------
//  fx.entities({
//    level: level | server: server,   // where to search (one of them)
//    tag: 'name' | ['a', 'b'],        // entity tag (registry first, then Tags)
//    type: 'minecraft:zombie',        // by entity type
//    near: [x, y, z, r] | {x,y,z,r},  // within radius r of the point
//    predicate: function(e) {...},    // custom filter
//    players: true                    // also add players from server.players
//  }) → array of entities
// ---------------------------------------------------------------------------
FX.entities = function(opts) {
    opts = opts || {}
    let out = []
    let server = opts.server
    if (server == null && opts.level != null) {
        try { server = opts.level.server } catch (err) { server = null }
    }
    if (opts.level == null && server == null) return out

    // gather levels to scan
    let levels = []
    if (opts.level != null) {
        levels = [opts.level]
    } else {
        let ls = null
        try { ls = server.levels } catch (err) { ls = null }
        if (ls == null) {
            try { ls = server.getAllLevels() } catch (err) { ls = null }
        }
        FX._each(ls, function(l) { levels.push(l) })
    }

    let tags = null
    if (opts.tag != null) tags = Array.isArray(opts.tag) ? opts.tag : [String(opts.tag)]
    let type = opts.type == null ? null : String(opts.type)
    let near = null
    if (opts.near != null) {
        if (Array.isArray(opts.near)) {
            near = { x: opts.near[0], y: opts.near[1], z: opts.near[2], r: opts.near[3] == null ? 32 : opts.near[3] }
        } else {
            near = { x: opts.near.x, y: opts.near.y, z: opts.near.z, r: opts.near.r == null ? 32 : opts.near.r }
        }
    }
    let pred = typeof opts.predicate === 'function' ? opts.predicate : null

    let seen = {}
    function matchesExtra(e) {
        if (type != null && !FX._typeEq(e, type)) return false
        if (near != null) {
            let dx = e.x - near.x, dy = e.y - near.y, dz = e.z - near.z
            if (dx * dx + dy * dy + dz * dz > near.r * near.r) return false
        }
        if (pred != null && !pred(e)) return false
        return true
    }
    function pushUnique(e) {
        let key = entityKey(e)
        if (key != null) {
            if (seen[key]) return
            seen[key] = true
        }
        if (matchesExtra(e)) out.push(e)
    }

    // 1) registry — reliable, no iteration needed
    if (tags != null) {
        for (let i = 0; i < tags.length; i++) {
            let list = FX._tags[tags[i]]
            if (list == null) continue
            for (let k = list.length - 1; k >= 0; k--) {
                let e = list[k]
                if (!FX.entValid(e)) { list.splice(k, 1); continue }
                if (opts.level != null && String(e.level.dimension) !== String(opts.level.dimension)) continue
                let et = FX.entityTags(e)
                if (et != null && et.indexOf(tags[i]) < 0) continue
                pushUnique(e)
            }
        }
    }

    // 2) level scan — Tags, type, near, predicate
    for (let li = 0; li < levels.length; li++) {
        let list = levelEntities(levels[li])
        if (list == null) continue
        try {
            FX._each(list, function(e) {
                if (tags != null && !hasAnyTag(e, tags)) return
                pushUnique(e)
            })
        } catch (err) {
            if (FX._iterMethod != null) {
                FX._iterMethod = null
                console.warn('[fx] entity list became unreadable, will re-detect: ' + err)
            }
        }
    }

    // 3) players live in server.players and are not always in level lists
    if (opts.players === true && server != null) {
        FX._each(server.players, function(e) {
            if (tags != null && !hasAnyTag(e, tags)) return
            pushUnique(e)
        })
    }
    return out
}