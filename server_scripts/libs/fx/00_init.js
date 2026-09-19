// ============================================================================
//  fx — particle effects library
//  Entry point: the API surface every other fx file builds on.
//  The only file whose load order matters (the 00 prefix).
// ============================================================================
let FX = (global.libs.fx = global.libs.fx || {})

FX.VERSION = '2.2'

// runtime-editable global settings (/fx settings)
FX.config = FX.config || {
    viewDist: 128,    // effects farther than this from every player are skipped
    debug: false,     // verbose start/stop/crash logging via customDebug
    queue: true,      // FIFO smoothing of spawn bursts
    queueBudget: 300, // max packet sends per tick; 0 = unlimited
    queueWarn: 600,   // customDebug warning when the backlog exceeds this
    queueCap: 2000,   // hard cap; the oldest sends are dropped past it
    itemScan: 40,    // ticks between item-effect holder checks
    itemEvery: 10,   // default item-effect re-fire interval; repeat:N in the item line overrides
}

// driver state (core.js)
FX._active = []      // live effect handles
FX._tick = 0         // ticks with at least one active effect
FX._clock = 0        // monotonic tick counter, always advancing
FX._seq = 0          // auto-name counter
FX._current = null   // effect type currently spawning (telemetry attribution)

// spawn telemetry window (maintained by core.js, printed by /fx stats)
FX._stats = {
    window: 100,
    _c: 0, _w: 0, _wPeak: 0, _wTypes: {},
    lastAvg: 0, lastPeak: 0, lastTypes: {}, _wt: 0,
}

// custom entity-tag registry (entities.js)
FX._tags = {}
FX._iterMethod = null
FX._warnIter = false

// command layer
FX.commands = FX.commands || {}
FX.commands._cmds = FX.commands._cmds || {}

FX.cmd = FX.cmd || {}
FX.cmd.RESERVED = {
    effect: 1, run: 1, hand: 1, whitelist: 1,
    stop: 1, stopAll: 1, count: 1, list: 1,
    stats: 1, settings: 1, all: 1,
}

// register an effect: name → { name, usage, opts, example, run(ctx) }
// names reserved for /fx management are rejected
FX.commands.register = function(name, def) {
    if (name == null || def == null || typeof def.run !== 'function') {
        console.warn('[fx] bad registration: ' + name)
        return null
    }
    let n = String(name)
    if (FX.cmd.RESERVED[n]) {
        console.warn('[fx] effect name "' + n + '" is reserved for /fx management — pick another')
        try { global.libs.customDebug.error('[fx] reserved effect name: ' + n) } catch (err) {}
        return null
    }
    FX.commands._cmds[n] = {
        name: n,
        usage: def.usage || '',
        opts: def.opts || null,
        example: def.example || null,
        run: def.run,
    }
    return FX.commands._cmds[n]
}

// ---------------------------------------------------------------------------
//  Memoization: key from primitive arguments, ttl in FX._clock ticks.
//  Arrays key by JSON; objects, functions and Java refs bypass the cache.
//  Results are shared between callers — treat them as read-only.
//  Swept by core.js, cleared by FX._wipe.
// ---------------------------------------------------------------------------
FX._memoStores = []

FX._memo = function(fn, ttl, cap) {
    ttl = ttl == null ? 6000 : ttl
    cap = cap == null ? 256 : cap
    let store = {}
    FX._memoStores.push(store)
    return function() {
        let key = ''
        for (let i = 0; i < arguments.length; i++) {
            let a = arguments[i]
            let t = typeof a
            if (t === 'number' || t === 'boolean') key += t.charAt(0) + a + '\u0001'
            else if (t === 'string') key += 's' + a + '\u0001'
            else if (Array.isArray(a)) key += 'a' + JSON.stringify(a) + '\u0001'
            else return fn.apply(null, arguments)
        }
        let e = store[key]
        if (e != null && e.exp > FX._clock) return e.v
        let v = fn.apply(null, arguments)
        if (Object.keys(store).length >= cap) {
            for (let k in store) delete store[k]
        }
        store[key] = { v: v, exp: FX._clock + ttl }
        return v
    }
}

// ---------------------------------------------------------------------------
//  fx.itemfx — NBT / persistentData access, hardened for the Java string
//  boundary: Brigadier results and getString() returns are java.lang.String,
//  where .length and === are unreliable. Everything is coerced with
//  '' + value (always a JS string) and compared after coercion. Typed
//  accessors are tried first, bean properties as the fallback — whichever
//  surface this build exposes.
// ---------------------------------------------------------------------------
FX.itemfx = {}

// null/undefined → ''; anything else → a JS string with its content
FX.jsStr = function(v) {
    return v == null ? '' : ('' + v)
}

// server.persistentData string read/write, surface-agnostic
// persistentData from any surface: event.server, block.level.server,
// ctx.source.server — whichever actually exposes it
FX.pd = function(anyServer) {
    if (anyServer == null) return null
    // direct surface
    try { let p = anyServer.persistentData; if (p != null) return p } catch (err) {}
    // unwrap a minecraft server (getPersistentData on the vanilla class)
    try {
        let mc = anyServer.minecraftServer
        if (mc != null) { let p = mc.persistentData; if (p != null) return p }
    } catch (err) {}
    try {
        let mc = anyServer.getServer()
        if (mc != null) { let p = mc.persistentData; if (p != null) return p }
    } catch (err) {}
    try {
        if (typeof anyServer.getPersistentData === 'function') {
            let p = anyServer.getPersistentData()
            if (p != null) return p
        }
    } catch (err) {}
    return null
}

FX.pdGet = function(server, key) {
    let p = FX.pd(server)
    if (p == null) return ''
    try { let v = p.getString(key); if (v != null) return FX.jsStr(v) } catch (err) {}
    try { let v = p[key]; if (v != null) return FX.jsStr(v) } catch (err) {}
    return ''
}

FX.pdPut = function(server, key, value) {
    let p = FX.pd(server)
    if (p == null) { console.warn('[fx] persistentData unreachable'); return false }
    try { p.putString(key, value); return true } catch (err) {}
    try { p[key] = value; return true } catch (err) {}
    console.warn('[fx] persistentData write failed for ' + key)
    return false
}

// holder-block whitelist: one '|'-separated string (ids never contain '|')
FX.getWhitelist = function(server) {
    let s = FX.pdGet(server, 'fx_whitelist')
    return s === '' ? [] : s.split('|')
}
FX.setWhitelist = function(server, list) {
    FX.pdPut(server, 'fx_whitelist', list.join('|'))
}
FX.inWhitelist = function(server, blockId) {
    if (blockId == null) return false
    let s = FX.pdGet(server, 'fx_whitelist')
    return s !== '' && ('|' + s + '|').indexOf('|' + String(blockId) + '|') >= 0
}
FX.addToWhitelist = function(server, blockId) {
    let id = String(blockId)
    if (id.indexOf(':') < 0) id = 'minecraft:' + id
    let w = FX.getWhitelist(server)
    if (w.indexOf(id) < 0) { w.push(id); FX.setWhitelist(server, w) }
    return id
}
FX.removeFromWhitelist = function(server, blockId) {
    let id = String(blockId)
    if (id.indexOf(':') < 0) id = 'minecraft:' + id
    let w = FX.getWhitelist(server)
    let i = w.indexOf(id)
    if (i >= 0) { w.splice(i, 1); FX.setWhitelist(server, w) }
    return id
}
FX.clearWhitelist = function(server) { FX.setWhitelist(server, []) }

// one-shot record: item lines that already fired (survives item NBT edits)
FX.itemUsed = function(server, line) {
    let s = FX.pdGet(server, 'fx_item_used')
    return s !== '' && ('|' + s + '|').indexOf('|' + line + '|') >= 0
}
FX.markItemUsed = function(server, line) {
    let s = FX.pdGet(server, 'fx_item_used')
    let list = s === '' ? [] : s.split('|')
    if (list.indexOf(line) < 0) {
        list.push(line)
        FX.pdPut(server, 'fx_item_used', list.join('|'))
    }
}

// FX.config persistence (scalars only); setSetting saves, world load reads
FX._cfgSave = function(server) {
    if (server == null) return
    let p = server.persistentData
    for (let k in FX.config) {
        let v = FX.config[k]
        let key = 'fx_cfg_' + k
        let ok = false
        try {
            if (typeof v === 'boolean') { p.putBoolean(key, v); ok = true }
            else if (typeof v === 'number') { p.putDouble(key, v); ok = true }
        } catch (err) {}
        if (!ok) {
            try { p[key] = v; ok = true } catch (err) {}
        }
        if (!ok) console.warn('[fx] config save failed: ' + k)
    }
}
FX._cfgLoad = function(server) {
    if (server == null) return
    let p = server.persistentData
    for (let k in FX.config) {
        let key = 'fx_cfg_' + k
        // presence via raw get: getBoolean/getDouble return defaults (false/0)
        // for MISSING keys and cannot distinguish "unset"
        let raw = null
        try { raw = p.get(key) } catch (err) {
            try { raw = p[key] } catch (err2) { raw = null }
        }
        if (raw == null) continue
        let v = null
        try {
            if (typeof FX.config[k] === 'boolean') v = p.getBoolean(key)
            else if (typeof FX.config[k] === 'number') v = p.getDouble(key)
        } catch (err) {}
        if (v == null) v = raw
        if (typeof FX.config[k] === 'boolean') FX.config[k] = (v === true || v === 1)
        else if (typeof FX.config[k] === 'number') {
            let n = Number(v)
            if (!isNaN(n)) FX.config[k] = n
        }
    }
}