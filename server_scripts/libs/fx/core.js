// ============================================================================
//  fx — core: effect handles, driver tick, memo sweep, send-queue flush
// ============================================================================
let FX = global.libs.fx

// debug output behind the config flag; customDebug may be absent
FX._dbgInfo = function(msg) {
    if (!(FX.config && FX.config.debug)) return
    try { console.info(msg) } catch (err) {}
    try { global.libs.customDebug.info(msg) } catch (err) {}
}
FX._dbgWarn = function(msg) {
    try { global.libs.customDebug.warn(msg) } catch (err) {
        try { global.libs.customDebug.error(msg) } catch (err2) {}
    }
}
FX._dbgError = function(msg) {
    try { global.libs.customDebug.error(msg) } catch (err) {}
}

// ---------------------------------------------------------------------------
//  Handles: every long-lived effect is { kind, name, alive, stop() }.
//  Auto names are unique ("emitter#3"); fx.stop(name) only hits its own name.
//  name + replace:true makes a new effect replace the old one with that name.
//
//  addOpts.interval: fire the update every N ticks instead of every tick.
//  The update then receives (server, acc) where acc = ticks accumulated since
//  the last fire — animations advance acc frames of state per render.
//  The first fire happens N ticks after creation; draw once at creation when
//  an immediate first frame is needed.
// ---------------------------------------------------------------------------
FX._add = function(kind, name, updateFn, addOpts) {
    addOpts = addOpts || {}
    let auto = name == null
    if (auto) name = kind + '#' + (++FX._seq)
    if (addOpts.replace === true && !auto) FX.stop(name)

    let interval = addOpts.interval | 0
    if (!(interval > 1)) interval = 1
    let since = 0
    let update = (interval === 1) ? updateFn : function(server) {
        since++
        if (since < interval) return
        let acc = since
        since = 0
        updateFn(server, acc)
    }

    let h = {
        kind: kind,
        name: name,
        alive: true,
        _dead: false,
        _update: update,
        stop: function() {
            if (this._dead) return
            this._dead = true
            this.alive = false
            FX._dbgInfo('fx: "' + this.name + '" stopped')
        },
    }
    FX._active.push(h)
    FX._dbgInfo('fx: "' + name + '" started')
    return h
}

// stop every effect with this name; returns the number stopped
FX.stop = function(name) {
    let a = FX._active
    let n = 0
    for (let i = 0; i < a.length; i++) {
        if (a[i].name === name) { a[i].stop(); n++ }
    }
    return n
}

FX.stopAll = function() {
    let a = FX._active
    for (let i = 0; i < a.length; i++) a[i].stop()
    a.length = 0
}

FX.count = function() { return FX._active.length }

// reload/unload contract: kill every effect, reset telemetry, memo and queue
FX._wipe = function() {
    FX.stopAll()
    let st = FX._stats
    st._c = 0; st._w = 0; st._wPeak = 0; st._wTypes = {}
    st.lastAvg = 0; st.lastPeak = 0; st.lastTypes = {}; st._wt = 0
    FX._current = null
    if (FX._memoClear) FX._memoClear()
    if (FX._queueClear) FX._queueClear()
}

// ---------------------------------------------------------------------------
//  Driver — the only fx ServerEvents.tick
// ---------------------------------------------------------------------------
ServerEvents.tick(event => {
    let st = FX._stats
    FX._clock++

    if (st._c > 0) {
        st._w += st._c
        if (st._c > st._wPeak) st._wPeak = st._c
        st._c = 0
    }
    st._wt++
    if (st._wt >= st.window) {
        st.lastAvg = st._w / st.window
        st.lastPeak = st._wPeak
        st.lastTypes = st._wTypes
        st._w = 0; st._wPeak = 0; st._wTypes = {}; st._wt = 0
        if (FX._memoSweep) FX._memoSweep()
    }

    let active = FX._active
    if (active.length > 0) {
        FX._tick++
        let server = event.server
        for (let i = active.length - 1; i >= 0; i--) {
            let e = active[i]
            if (e._dead) { active.splice(i, 1); continue }
            let prev = FX._current
            FX._current = e.name || e.kind
            try {
                e._update(server)
            } catch (err) {
                console.error('[fx] effect "' + e.name + '" crashed: ' + err)
                FX._dbgError('fx: effect "' + e.name + '" crashed: ' + err)
                e.stop()
            } finally {
                FX._current = prev
            }
        }
    }

    // send everything the effects requested this tick, within the budget
    if (FX._flush) FX._flush()
})