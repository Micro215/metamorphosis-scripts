// ============================================================================
//  shapes.sphere — sphere filled from a block palette, built and refreshed
//  layer by layer, dissolved in waves
//
//  let s = global.libs.shapes.sphere({
//    level: <level>, pos: [x, y, z], radius: 10,
//    blocks: [
//      'minecraft:stone',
//      { block: 'minecraft:copper_block', w: 3 },   // weighted entry
//    ],
//    mode: 'slice',        // live sweep: 'slice' (Y layers) | 'wave' (shells)
//    dir: 'down',          // slice → 'down'|'up'; wave → 'out'|'in'
//    wave: 1.25,           // shell thickness, blocks (wave sweeps)
//    slice: 1,             // Y levels per layer (slice sweeps)
//    density: 1,           // per-block place chance (0..1)
//    shell: 0,             // 0 = solid, n = hollow shell n blocks thick
//    name: 'mySphere',
//    onWave: function(ctx) {},   // { obj, phase, wave, dist | y }
//    onEnd: function(obj) {},    // fired once fully dissolved
//  })
//
//  'wave' anchors (where the shells spread from):
//    1 (default) = the sphere center — the classic single dissolve
//    N           = N random spots among the real block positions
//    [[x,y,z],…] = explicit spots
//  Every block belongs to its nearest anchor; one update() advances one
//  shell around EVERY anchor at once — dissolving in many places at once.
//
//  s.update()                            1 layer
//  s.update(3)                           3 layers
//  s.update({ n: 2, mode: 'wave', dir: 'in', anchors: 8 })   reconfigure on the fly
//  s.stop()                              dissolve: wave, from the center, in
//  s.stop({ mode: 'wave', anchors: 9 }) dissolve from 9 random spots
//  s.stop(true) / s.instant()            remove everything at once
//  s.carve(pos, radius)                  punch a restorable hole
// ============================================================================
let SH = global.libs.shapes

SH.sphere = function(opts) {
    opts = opts || {}
    let what = '[shapes.sphere]'

    // ---- level object is required right away
    let lv = opts.level
    if (lv == null) { console.warn(what + ' "level" is required'); return null }

    // ---- center & radius
    let c = SH._pos(opts.pos != null ? opts.pos : opts.center)
    if (c == null) { console.warn(what + ' "pos" is required'); return null }
    let radius = opts.radius == null ? 5 : opts.radius
    if (!(radius > 0)) { console.warn(what + ' "radius" must be > 0'); return null }

    // ---- palette: 'id' or { block: 'id', w: weight } → weighted pick table
    let ids = [], acc = [], total = 0
    let raw = opts.blocks || ['minecraft:stone']
    for (let i = 0; i < raw.length; i++) {
        let e = raw[i], id, w
        if (typeof e === 'string') { id = e; w = 1 }
        else {
            id = e.block != null ? e.block : e.id
            w = e.w != null ? e.w : (e.weight != null ? e.weight : 1)
        }
        if (id == null) continue
        total += w
        ids.push(id)
        acc.push(total)
    }
    if (ids.length === 0) { console.warn(what + ' "blocks" is empty'); return null }

    function pick() {
        let r = Math.random() * total
        for (let i = 0; i < acc.length; i++) if (r < acc[i]) return ids[i]
        return ids[ids.length - 1]
    }

    // ---- shape options
    let wave = opts.wave == null ? 1.25 : Math.max(0.02, opts.wave)         // shell thickness
    let thick = opts.slice == null ? 1 : Math.max(1, Math.round(opts.slice))     // Y levels per slice
    let density = Math.min(1, Math.max(0, opts.density == null ? 1 : opts.density))
    let shell = Math.max(0, opts.shell || 0)

    // ---- state
    let phase = 'build'    // 'build' | 'live' | 'clear' | 'done'

    // ---- scan the sphere once; every block gets a flat index,
    //      coordinates live in one flat array, "placed by us" flags in another
    let rOut2 = radius * radius
    let rIn2 = shell > 0 ? (radius - shell) * (radius - shell) : -1
    let zc = c[2] - 0.5
    let coordFlat = []     // [x,y,z, x,y,z, ...] — 3 numbers per block
    let rawY = []          // Y-group buckets → block indices
    let count = 0

    // ---- world height bounds (blocks outside them are skipped)
    let yMin = -64, yMax = 320
    try {
        if (typeof lv.minHeight === 'number') yMin = lv.minHeight
        if (typeof lv.maxHeight === 'number') yMax = lv.maxHeight
    } catch (err) {}

    let yLo = Math.max(yMin, Math.ceil(c[1] - 0.5 - radius))
    let yHi = Math.min(yMax - 1, Math.floor(c[1] - 0.5 + radius))
    let numGroups = Math.ceil((yHi - yLo + 1) / thick)

    function pushBlock(x, y, z) {
        let idx = count++
        coordFlat.push(x, y, z)
        let g = ((y - yLo) / thick) | 0
        let yArr = rawY[g]
        if (yArr == null) yArr = rawY[g] = []
        yArr.push(idx)
    }

    // walk the shell band directly, the inner cube is never scanned
    for (let y = yLo; y <= yHi; y++) {
        let dy = y + 0.5 - c[1]
        let remY = rOut2 - dy * dy
        if (remY < 0) continue
        let remYin = rIn2 - dy * dy
        let sx = Math.sqrt(remY)

        let xLo = Math.ceil(c[0] - 0.5 - sx)
        let xHi = Math.floor(c[0] - 0.5 + sx)

        for (let x = xLo; x <= xHi; x++) {
            let dx = x + 0.5 - c[0]
            let rem = remY - dx * dx
            if (rem < 0) continue
            let remIn = remYin - dx * dx

            // z range of the chord: |dz| <= sqrt(rem)
            let s = Math.sqrt(rem)
            let zOutLo = Math.ceil(zc - s), zOutHi = Math.floor(zc + s)

            if (remIn > 0) {
                // hollow shell → two side bands, the hole is skipped entirely
                let si = Math.sqrt(remIn)
                for (let z = zOutLo; z <= Math.ceil(zc - si) - 1; z++) pushBlock(x, y, z)
                for (let z = Math.floor(zc + si) + 1; z <= zOutHi; z++) pushBlock(x, y, z)
            } else {
                // solid fill → whole chord
                for (let z = zOutLo; z <= zOutHi; z++) pushBlock(x, y, z)
            }
        }
    }

    if (count === 0) { console.warn(what + ' no blocks inside radius ' + radius); return null }

    // one flag per block: 1 = we placed it ourselves
    let flags = []
    for (let i = 0; i < count; i++) flags.push(0)

    // slice layers: top → bottom, thick Y levels each
    let sliceLayers = []
    for (let g = numGroups - 1; g >= 0; g--) {
        let arr = rawY[g]
        if (arr != null) sliceLayers.push({ idx: arr, y: yLo + g * thick + thick - 1 })
    }
    if (sliceLayers.length === 0) { console.warn(what + ' no blocks inside radius ' + radius); return null }

    // ------------------------------------------------------------------
    //  Sweeps. sweep = { mode, dir, anchors, layers, step, pos }
    //  one update() step = one layer (slice) or one shell around every
    //  anchor at once (wave)
    // ------------------------------------------------------------------
    function anchorPoints(anchors) {
        if (anchors == null || anchors === 1) return [c]
        if (typeof anchors === 'number') {
            // N random spots among the real block positions
            let n = Math.max(2, anchors | 0)
            let out = []
            let used = {}
            let guard = 0
            while (out.length < n && out.length < count && guard++ < n * 10) {
                let bi = (Math.random() * count) | 0
                if (used[bi]) continue
                used[bi] = true
                let k = bi * 3
                out.push([coordFlat[k], coordFlat[k + 1], coordFlat[k + 2]])
            }
            return out.length > 0 ? out : [c]
        }
        // explicit list
        let out = []
        for (let i = 0; i < anchors.length; i++) {
            let q = SH._pos(anchors[i])
            if (q != null) out.push(q)
        }
        return out.length > 0 ? out : [c]
    }

    function buildSliceSweep(dir) {
        let step = dir === 'up' ? -1 : 1
        return {
            mode: 'slice', dir: dir, anchors: null,
            layers: sliceLayers, step: step,
            pos: step > 0 ? 0 : sliceLayers.length - 1,
        }
    }

    function buildWaveSweep(dir, anchors) {
        let pts = anchorPoints(anchors)
        let maxB = 0
        let bucketOf = new Array(count)
        for (let bi = 0; bi < count; bi++) {
            let k = bi * 3
            let best = 0, bestD2 = Infinity
            for (let a = 0; a < pts.length; a++) {
                let dx = coordFlat[k] - pts[a][0]
                let dy = coordFlat[k + 1] - pts[a][1]
                let dz = coordFlat[k + 2] - pts[a][2]
                let d2 = dx * dx + dy * dy + dz * dz
                if (d2 < bestD2) { bestD2 = d2; best = a }
            }
            let b = Math.floor(Math.sqrt(bestD2) / wave)
            bucketOf[bi] = b
            if (b > maxB) maxB = b
        }
        // waveLayers[j] = blocks whose nearest-anchor bucket is j
        let layers = []
        for (let j = 0; j <= maxB; j++) layers.push([])
        for (let bi = 0; bi < count; bi++) layers[bucketOf[bi]].push(bi)
        let out = []
        for (let j = 0; j < layers.length; j++) {
            if (layers[j].length > 0) out.push({ idx: layers[j], dist: j * wave })
        }
        let step = dir === 'in' ? -1 : 1
        return {
            mode: 'wave', dir: dir, anchors: anchors,
            layers: out, step: step,
            pos: step > 0 ? 0 : out.length - 1,
        }
    }

    function applySweep(mode, dir, anchors) {
        if (mode === 'wave') sweep = buildWaveSweep(dir == null ? 'out' : dir, anchors)
        else sweep = buildSliceSweep(dir == null ? 'down' : dir)
    }

    // creation defaults: build with slices, top → bottom
    let sweep = null
    applySweep(opts.mode, opts.dir, opts.anchors)

    // fill one layer: random palette blocks, or air when dissolving;
    // only blocks flagged as ours get removed
    function fillLayer(j, air) {
        let L = sweep.layers[j]
        if (L == null) return
        let idxs = L.idx
        for (let i = 0; i < idxs.length; i++) {
            let bi = idxs[i], k = bi * 3
            if (air) {
                if (flags[bi] === 1) {          // never touch blocks we did not place
                    lv.getBlock(coordFlat[k], coordFlat[k + 1], coordFlat[k + 2]).set('minecraft:air')
                    flags[bi] = 0
                }
            } else {
                if (density < 1 && Math.random() > density) continue
                lv.getBlock(coordFlat[k], coordFlat[k + 1], coordFlat[k + 2]).set(pick())
                flags[bi] = 1
            }
        }
    }

    // remove everything we placed, ignoring layers
    function clearAll() {
        for (let bi = 0; bi < count; bi++) {
            if (flags[bi] !== 1) continue
            let k = bi * 3
            lv.getBlock(coordFlat[k], coordFlat[k + 1], coordFlat[k + 2]).set('minecraft:air')
            flags[bi] = 0
        }
    }

    // leave the registry + fire onEnd, exactly once
    let ended = false
    function finish() {
        if (ended) return
        ended = true
        SH._unregister(obj)
        if (typeof opts.onEnd === 'function') opts.onEnd(obj)
    }

    // the shape object
    let obj = {
        type: 'sphere',
        name: opts.name || 'sphere',
        done: false,
        built: false,   // true after the first complete live sweep (fully grown)

        // current phase: 'build' | 'live' | 'clear' | 'done'
        phase: function() { return phase },

        // update([n]) — advance n layers (default 1).
        // update({ n, mode, dir, anchors }) — reconfigure the sweep first
        // (restarts it from its beginning), then advance n layers.
        update: function(n) {
            if (phase === 'done') return
            let steps = 1
            let req = null
            if (typeof n === 'number') {
                steps = Math.max(1, n | 0)
            } else if (n != null && typeof n === 'object') {
                steps = n.n == null ? 1 : Math.max(1, n.n | 0)
                req = n
            }

            if (req != null && (req.mode != null || req.dir != null || req.anchors != null)) {
                let mode = req.mode != null ? String(req.mode) : sweep.mode
                let dir = req.dir != null ? String(req.dir) : sweep.dir
                let anch = req.anchors !== undefined ? req.anchors : sweep.anchors
                // same parameters → no rebuild, random anchors are NOT re-picked
                if (mode !== sweep.mode || dir !== sweep.dir || anch !== sweep.anchors) {
                    applySweep(mode, dir, anch)
                }
            }

            for (let i = 0; i < steps && phase !== 'done'; i++) {
                fillLayer(sweep.pos, phase === 'clear')
                if (typeof opts.onWave === 'function') {
                    let L = sweep.layers[sweep.pos]
                    if (L != null) {
                        opts.onWave({ obj: obj, phase: phase, wave: sweep.pos, dist: L.dist, y: L.y })
                    }
                }
                sweep.pos += sweep.step

                if (sweep.pos < 0 || sweep.pos > sweep.layers.length - 1) {
                    if (phase === 'clear') {
                        phase = 'done'                     // fully dissolved
                        obj.done = true
                        finish()
                    } else {
                        sweep.pos = sweep.step > 0 ? 0 : sweep.layers.length - 1   // wrap forever
                        if (phase === 'build') {
                            phase = 'live'                 // first pass finished
                            obj.built = true
                        }
                    }
                }
            }
        },

        // stop([true | { mode, dir, anchors }]) — dissolve via air waves.
        // Default: wave, from the center, inward. A second call (or true)
        // removes everything at once.
        stop: function(arg) {
            if (phase === 'done') return
            if (arg === true || phase === 'clear') {
                clearAll()
                phase = 'done'
                obj.done = true
                finish()
                return
            }
            phase = 'clear'
            let mode = 'wave', dir = 'in', anch = 1
            if (arg != null && typeof arg === 'object') {
                if (arg.mode != null) mode = String(arg.mode)
                if (arg.dir != null) dir = String(arg.dir)
                if (arg.anchors != null) anch = arg.anchors
            }
            applySweep(mode, dir, anch)
        },

        // instant() — remove everything at once, right now
        instant: function() { obj.stop(true) },

        isAlive: function() { return phase !== 'done' },

        // carve(pos, radius) — instantly remove every sphere block within
        // `radius` of `pos` (world coordinates). Only blocks placed by the
        // sphere are touched, and their flags are cleared, so the live
        // sweep (update) naturally restores the hole on later passes.
        // Returns the number of removed blocks.
        carve: function(pos, radius) {
            if (phase === 'done') return 0
            let q = SH._pos(pos)
            if (q == null) return 0
            let r = radius == null ? 5 : radius
            let r2 = r * r
            let removed = 0
            for (let bi = 0; bi < count; bi++) {
                if (flags[bi] !== 1) continue
                let k = bi * 3
                let dx = coordFlat[k] - q[0]
                let dy = coordFlat[k + 1] - q[1]
                let dz = coordFlat[k + 2] - q[2]
                if (dx * dx + dy * dy + dz * dz > r2) continue
                lv.getBlock(coordFlat[k], coordFlat[k + 1], coordFlat[k + 2]).set('minecraft:air')
                flags[bi] = 0
                removed++
            }
            return removed
        },
    }

    SH._register(obj)
    return obj
}