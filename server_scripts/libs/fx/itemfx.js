// ============================================================================
//  fx — itemfx: effects bound to tagged items inside whitelisted holder
//  blocks.
//
//  All internals are namespaced into FX._ifx* — KubeJS server scripts share
//  one scope; bare top-level declarations get overwritten across files.
//
//  Item NBT (flat keys; an item may carry fx and cmd tags simultaneously):
//    fxitem       string  "<effect> [key:value …]" — the /fx effect run line
//    fxitem_once  bool    fire on the first placement, then go inert
//    fxitem_used  bool    set on activation (once items)
//
//  Life rule: the effect runs while the tagged item is INSIDE the holder;
//  taking it out stops the effect on the next scan. Route 1 registers on
//  a click with the tagged item in hand (grace window); route 2 scans the
//  contents (GUI placement, reboots).
// ============================================================================
let FX = global.libs.fx

FX._itemPool = {}

// ---------------------------------------------------------------------------
//  Internals
// ---------------------------------------------------------------------------
FX._ifxPosKey = function(level, x, y, z) {
    let d = ''
    try { d = String(level.dimension) } catch (err) {}
    return d + ':' + x + ',' + y + ',' + z
}

FX._ifxStackNbt = function(st) {
    if (st == null) return null
    try { let n = st.nbt; if (n != null) return n } catch (err) {}
    try { let n = st.getTag(); if (n != null) return n } catch (err) {}
    try { let n = st.getOrCreateTag(); if (n != null) return n } catch (err) {}
    return null
}

FX._ifxNbtStr = function(n, key) {
    if (n == null) return ''
    try { let v = n.getString(key); if (v != null) return FX.jsStr(v) } catch (err) {}
    try { let v = n[key]; if (v != null) return FX.jsStr(v) } catch (err) {}
    return ''
}

FX._ifxNbtBool = function(n, key) {
    if (n == null) return false
    try { if (n.getBoolean(key) === true) return true } catch (err) {}
    try { let v = n[key]; if (v === true || v === 1) return true } catch (err) {}
    return false
}

// { line, once, used, stack } | null — reads the fx line, once flags
FX._ifxReadTag = function(st) {
    if (st == null) return null
    try { if (st.empty === true || st.isEmpty === true) return null } catch (err) {}
    let n = FX._ifxStackNbt(st)
    let line = FX._ifxNbtStr(n, 'fxitem')
    if (line === '' || line === 'null') return null
    return {
        line: line,
        once: FX._ifxNbtBool(n, 'fxitem_once'),
        used: FX._ifxNbtBool(n, 'fxitem_used'),
        stack: st,
    }
}

// fx line from a SAVED ItemStack NBT compound (Items/Book/RecordItem)
FX._ifxFromCompound = function(c) {
    if (c == null) return null
    let tag = null
    try { tag = c.getCompound('tag') } catch (err) {}
    if (tag == null) {
        try { tag = c.get('tag') } catch (err) { tag = null }
    }
    if (tag == null) return null
    let line = FX._ifxNbtStr(tag, 'fxitem')
    if (line === '' || line === 'null') return null
    return {
        line: line,
        once: FX._ifxNbtBool(tag, 'fxitem_once'),
        used: FX._ifxNbtBool(tag, 'fxitem_used'),
        stack: null,
    }
}

// find a tagged item in the holder — shared walk, FX._ifx* readers
FX._ifxFind = function(block) {
    if (block == null) return null
    let be = null
    try { be = block.entity } catch (err) { be = null }
    if (be != null) {
        try { let t = FX._ifxReadTag(be.getBook()); if (t != null) return t } catch (err) {}
        try { let t = FX._ifxReadTag(be.getTheItem()); if (t != null) return t } catch (err) {}
        try {
            let n = be.getContainerSize()
            for (let i = 0; i < n; i++) {
                let t = FX._ifxReadTag(be.getItem(i))
                if (t != null) return t
            }
        } catch (err) {}
    }
    let d = null
    try { d = block.entityData } catch (err) { d = null }
    if (d == null) return null
    try { let t = FX._ifxFromCompound(d.get('Book')); if (t != null) return t } catch (err) {}
    try { let t = FX._ifxFromCompound(d.get('RecordItem')); if (t != null) return t } catch (err) {}
    try {
        let items = d.get('Items')
        if (items != null) {
            let n = 0
            try { n = items.size() } catch (err) { n = 0 }
            for (let i = 0; i < n; i++) {
                let t = FX._ifxFromCompound(items.get(i))
                if (t != null) return t
            }
        }
    } catch (err) {}
    try {
        let keys = d.getAllKeys()
        let it = keys.iterator()
        while (it.hasNext()) {
            let k = String(it.next())
            if (k === 'Items' || k === 'Book' || k === 'RecordItem') continue
            let v = null
            try { v = d.get(k) } catch (err) { v = null }
            if (v == null) continue
            try { let t = FX._ifxFromCompound(v); if (t != null) return t } catch (err) {}
            try {
                let n = v.size()
                for (let i = 0; i < n; i++) {
                    try {
                        let t = FX._ifxFromCompound(v.get(i))
                        if (t != null) return t
                    } catch (err) {}
                }
            } catch (err) {}
        }
    } catch (err) {}
    return null
}

// the holder still carries an item: lectern/jukebox blockstate properties,
// generic holders count as present while the block exists
FX._ifxHolderHasItem = function(block) {
    try {
        let props = block.properties
        if (props != null) {
            if (props.has_book !== undefined) return props.has_book === true
            if (props.has_record !== undefined) return props.has_record === true
        }
    } catch (err) {}
    return true
}

FX._ifxParseLine = function(line) {
    let toks = FX.cmd.tokenize(line)
    let opts = FX.cmd.parseOpts(toks)
    FX.cmd.normalizeOpts(opts)
    let name = toks.length > 0 ? toks[0].text : null
    return {
        name: name,
        cmd: name != null ? FX.commands._cmds[name] : null,
        opts: opts,
        once: opts.once === true,
    }
}

FX._ifxEveryOf = function(line) {
    let p = FX._ifxParseLine(line)
    if (p.opts.repeat != null && p.opts.repeat > 0) return Math.max(1, p.opts.repeat | 0)
    return Math.max(1, FX.config.itemEvery | 0)
}

// one frame of the entry's effect; anim handles take the entry-unique name
FX._ifxRunEntry = function(server, e) {
    let p = FX._ifxParseLine(e.line)
    if (p.cmd == null) {
        FX._dbgError('[fx] itemfx: unknown effect in "' + e.line + '"')
        delete FX._itemPool[e.key]
        return
    }
    FX._mergeDefaults(p.cmd, p.opts)

    if (p.opts.duration > 0) {
        p.opts.repeat = 0
        p.opts.name = e.handleName + ':anim'
    } else {
        p.opts.name = e.handleName
    }

    if (p.opts.target == null) {
        // the default target = holder + offset, baked once here
        let off = FX._offset(p.opts.offset)
        p.opts.target = {
            x: e.x + 0.5 + off[0],
            y: e.y + 1 + off[1],
            z: e.z + 0.5 + off[2],
            level: e.level,
        }
        p.opts.offset = [0, 0, 0]
    }
    p.opts.level = e.level
    p.opts.server = server
    let player = FX.entValid(e.player) ? e.player : null
    let ctx = {
        player: player, server: server, level: e.level,
        pos: p.opts.target, opts: p.opts, args: e.line,
        effect: p.name, t: 0,
    }
    FX._current = 'fxitem:' + p.name
    try {
        p.cmd.run(ctx)
    } catch (err) {
        console.error('[fx] itemfx "' + e.key + '" failed: ' + err)
    } finally {
        FX._current = null
    }
}

FX._ifxRegister = function(server, level, x, y, z, line, player) {
    let key = FX._ifxPosKey(level, x, y, z)
    FX.stop('fxitem:' + key)              // old entry's plain handles
    FX.stop('fxitem:' + key + ':anim')    // old entry's anim handles
    let e = {
        key: key,
        handleName: 'fxitem:' + key,
        level: level, x: x, y: y, z: z,
        blockId: null, line: line, every: FX._ifxEveryOf(line),
        nextRun: 0, player: player,
        animated: false,
        fired: false,
    }
    try { e.blockId = String(level.getBlock(x, y, z).id) } catch (err) {}
    FX._itemPool[key] = e
    return e
}

FX._ifxDrop = function(server, e) {
    FX.stop(e.handleName)
    FX.stop(e.handleName + ':anim')
    delete FX._itemPool[e.key]
}

// one-shot bookkeeping: NBT on the stack (when reachable) + persistentData
FX._ifxMarkOnce = function(server, tag) {
    if (tag.stack != null) {
        try { tag.stack.nbt.putBoolean('fxitem_used', true) } catch (err) {
            try {
                tag.stack.nbt.fxitem_used = true
                tag.stack.setNbt(tag.stack.nbt)
            } catch (err2) {}
        }
    }
    FX.markItemUsed(server, tag.line)
}

// ---------------------------------------------------------------------------
//  Start routes — registration only; the watcher fires within one tick
// ---------------------------------------------------------------------------
BlockEvents.rightClicked(event => {
    let FX = global.libs.fx
    let player = event.player
    let block = event.block
    if (player == null || block == null) return

    let server = event.server
    if (server == null || FX.pd(server) == null) {
        try { server = block.level.server } catch (err) {}
    }
    if (server == null || FX.pd(server) == null) {
        try { server = event.server.server } catch (err) {}
    }
    if (FX.pd(server) == null) return

    let id = ''
    try { id = String(block.id) } catch (err) { return }
    if (!FX.inWhitelist(server, id)) return
    let level = block.level

    // route 1: tagged item in hand
    let tag = null
    try { tag = FX._ifxReadTag(event.item) } catch (err) { tag = null }
    if (tag != null) {
        if (tag.once && (tag.used || FX.itemUsed(server, tag.line))) return
        FX._ifxRegister(server, level, block.x, block.y, block.z, tag.line, player)
        return
    }

    // route 2: scan the holder contents
    let found = null
    try { found = FX._ifxFind(block) } catch (err) { found = null }
    if (found == null) return
    if (found.once && (found.used || FX.itemUsed(server, found.line))) return
    FX._ifxRegister(server, level, block.x, block.y, block.z, found.line, player)
})

// ---------------------------------------------------------------------------
//  Watcher
// ---------------------------------------------------------------------------
ServerEvents.tick(event => {
    let FX = global.libs.fx
    let server = event.server
    if (server == null) return
    let scan = Math.max(1, FX.config.itemScan | 0)
    let doScan = server.tickCount % scan === 0

    for (let key in FX._itemPool) {
        let e = FX._itemPool[key]

        try {
            // presence: every tick until the first run, then on scan ticks
            let needCheck = !e.fired || doScan
            if (needCheck) {
                let block = null
                try { block = e.level.getBlock(e.x, e.y, e.z) } catch (err) {}
                if (block == null || String(block.id) !== e.blockId ||
                        !FX.inWhitelist(server, e.blockId)) {
                    FX._ifxDrop(server, e)
                    continue
                }
                let found = null
                try { found = FX._ifxFind(block) } catch (err) { found = null }
                if (found == null) { FX._ifxDrop(server, e); continue }
                if (found.line !== e.line) {
                    e.line = found.line
                    e.every = FX._ifxEveryOf(found.line)
                    e.nextRun = 0
                    e.animated = false
                    e.fired = false
                    FX.stop(e.handleName)
                    FX.stop(e.handleName + ':anim')
                }
            }

            // first run / re-fire — every tick, so repeat:1 = every tick
            if (!e.animated) {
                if (e.nextRun === 0) e.nextRun = server.tickCount + (e.fired ? e.every : 1)
                if (server.tickCount >= e.nextRun) {
                    e.nextRun = server.tickCount + e.every
                    let p = FX._ifxParseLine(e.line)
                    FX._ifxRunEntry(server, e)
                    e.fired = true
                    if (p.opts.duration > 0) e.animated = true
                    if (p.once) {
                        FX._ifxMarkOnce(server, { line: e.line, stack: null })
                        FX._ifxDrop(server, e)
                        continue
                    }
                }
            }
        } catch (err) {
            console.error('[fx] itemfx entry crashed (' + e.key + '): ' + err)
            FX._ifxDrop(server, e)
        }
    }
})

// ---------------------------------------------------------------------------
//  Init & wipe
// ---------------------------------------------------------------------------
ServerEvents.loaded(event => {
    let server = event.server
    if (FX.pdGet(server, 'fx_whitelist') === '') {
        FX.setWhitelist(server, ['minecraft:lectern'])
    }
    FX._cfgLoad(server)
})

if (FX._wipeFns != null) {
    FX._wipeFns.push(function() { FX._itemPool = {} })
}