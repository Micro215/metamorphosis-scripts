// ============================================================================
//  fx — itemcmd: commands bound to tagged items inside whitelisted holder
//  blocks. Same holders and lifecycle as itemfx — the whitelist is shared
//  (/fx effect whitelist manages it).
//
//  All internals are assigned into the FX._cmd* namespace: KubeJS server
//  scripts share one scope, and bare top-level function declarations get
//  overwritten across files. Namespaced properties are immune.
//
//  Item NBT (flat keys; an item may carry fx and cmd tags simultaneously):
//    cmditem         string  a single command (legacy form)
//    cmditem_q       string  the command queue: "a|b|c" (commands never
//                            contain '|'); written when in: has 2+ entries
//    cmditem_out     string  a single take command (legacy form)
//    cmditem_out_q   string  the take queue: "a|b|c"
//    cmditem_repeat  bool    re-run the queue while present
//    cmditem_every   int     queue re-run interval in ticks (default 20)
//    cmditem_delay   int     ticks between queue commands (default 0)
//    cmditem_once    bool    the queue fires only on the first placement
//                            ever (recorded in persistentData, keyed by the
//                            joined command text)
//
//  /cmd hand in:<command|[queue]> out:<command|[queue]>
//             [repeat:true] [every:N] [delay:N] [once:true]
//  The legacy single-command form is fully supported: everything after the
//  command up to the first param token is the command.
//  Queue lists: in:["say 1","say 2"] — elements quoted, comma-separated;
//  the pre-parser grabs everything to the closing ']' so spaces inside
//  elements are safe.
//  Every command runs as
//    execute in <holder dimension> positioned <holder x y z> run <command>
//
//  Route 1 registers on a tagged-item click BEFORE vanilla settles the
//  item into the BE — the watcher gives it a grace window (bornAt + 10
//  ticks). Route 2 registers from the holder contents.
// ============================================================================
let FX = global.libs.fx

FX._cmdPool = {}

// ---------------------------------------------------------------------------
//  Internals
// ---------------------------------------------------------------------------
FX._cmdPosKey = function(level, x, y, z) {
    let d = ''
    try { d = String(level.dimension) } catch (err) {}
    return d + ':' + x + ',' + y + ',' + z
}

FX._cmdStackNbt = function(st) {
    if (st == null) return null
    try { let n = st.nbt; if (n != null) return n } catch (err) {}
    try { let n = st.getTag(); if (n != null) return n } catch (err) {}
    try { let n = st.getOrCreateTag(); if (n != null) return n } catch (err) {}
    return null
}

FX._cmdNbtStr = function(n, key) {
    if (n == null) return ''
    try { let v = n.getString(key); if (v != null) return FX.jsStr(v) } catch (err) {}
    try { let v = n[key]; if (v != null) return FX.jsStr(v) } catch (err) {}
    return ''
}

FX._cmdNbtBool = function(n, key) {
    if (n == null) return false
    try { if (n.getBoolean(key) === true) return true } catch (err) {}
    try { let v = n[key]; if (v === true || v === 1) return true } catch (err) {}
    return false
}

FX._cmdNbtInt = function(n, key, def) {
    if (n == null) return def
    try { let v = n.getInt(key); if (typeof v === 'number') return v } catch (err) {}
    try { let v = n[key]; if (typeof v === 'number') return v } catch (err) {}
    return def
}

// the entry for this holder already tracks the same queue — keep its state
FX._cmdSameEntry = function(level, x, y, z, cmds) {
    let e = FX._cmdPool[FX._cmdPosKey(level, x, y, z)]
    return e != null && e.cmds.join('|') === cmds.join('|')
}

// command list from NBT: the queue key first (pipe-separated), the legacy
// single-command key as the fallback
FX._cmdNbtList = function(n, qKey, key) {
    if (n == null) return null
    let q = FX._cmdNbtStr(n, qKey)
    if (q !== '' && q !== 'null') {
        let list = q.split('|')
        if (list.length > 0) return list
    }
    let single = FX._cmdNbtStr(n, key)
    if (single === '' || single === 'null') return null
    return [single]
}

// { cmds:[…], out:[…]|null, repeat, every, once, delay } | null
FX._cmdFromNbt = function(n) {
    if (n == null) return null
    let cmds = FX._cmdNbtList(n, 'cmditem_q', 'cmditem')
    if (cmds == null || cmds.length === 0) return null
    let outs = FX._cmdNbtList(n, 'cmditem_out_q', 'cmditem_out')
    return {
        cmds: cmds,
        out: (outs == null || outs.length === 0) ? null : outs,
        repeat: FX._cmdNbtBool(n, 'cmditem_repeat'),
        every: Math.max(1, FX._cmdNbtInt(n, 'cmditem_every', 20) | 0),
        once: FX._cmdNbtBool(n, 'cmditem_once'),
        delay: Math.max(0, FX._cmdNbtInt(n, 'cmditem_delay', 0) | 0),
    }
}

FX._cmdFromStack = function(st) {
    if (st == null) return null
    try { if (st.empty === true || st.isEmpty === true) return null } catch (err) {}
    return FX._cmdFromNbt(FX._cmdStackNbt(st))
}

FX._cmdFromCompound = function(c) {
    if (c == null) return null
    let tag = null
    try { tag = c.getCompound('tag') } catch (err) {}
    if (tag == null) {
        try { tag = c.get('tag') } catch (err) { tag = null }
    }
    return FX._cmdFromNbt(tag)
}

// holder content walk — FX._findTagged (itemfx) when present, a local
// fallback otherwise; both readers are the _cmd* ones
FX._cmdFindTagged = function(block) {
    if (block == null) return null
    if (typeof FX._findTagged === 'function') {
        let r = null
        try { r = FX._findTagged(block, FX._cmdFromStack, FX._cmdFromCompound) } catch (err) { r = null }
        if (r != null) return r
    }
    let be = null
    try { be = block.entity } catch (err) { be = null }
    if (be != null) {
        try { let t = FX._cmdFromStack(be.getBook()); if (t != null) return t } catch (err) {}
        try { let t = FX._cmdFromStack(be.getTheItem()); if (t != null) return t } catch (err) {}
        try {
            let n = be.getContainerSize()
            for (let i = 0; i < n; i++) {
                let t = FX._cmdFromStack(be.getItem(i))
                if (t != null) return t
            }
        } catch (err) {}
    }
    let d = null
    try { d = block.entityData } catch (err) { d = null }
    if (d == null) return null
    try { let t = FX._cmdFromCompound(d.get('Book')); if (t != null) return t } catch (err) {}
    try { let t = FX._cmdFromCompound(d.get('RecordItem')); if (t != null) return t } catch (err) {}
    try {
        let items = d.get('Items')
        if (items != null) {
            let n = 0
            try { n = items.size() } catch (err) { n = 0 }
            for (let i = 0; i < n; i++) {
                let t = FX._cmdFromCompound(items.get(i))
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
            try { let t = FX._cmdFromCompound(v); if (t != null) return t } catch (err) {}
            try {
                let n = v.size()
                for (let i = 0; i < n; i++) {
                    try {
                        let t = FX._cmdFromCompound(v.get(i))
                        if (t != null) return t
                    } catch (err) {}
                }
            } catch (err) {}
        }
    } catch (err) {}
    return null
}

// once record — persistentData, keyed by the joined queue text
FX._cmdUsed = function(server, cmds) {
    let key = cmds.join('|')
    let s = FX.pdGet(server, 'cmd_item_used')
    return s !== '' && ('|' + s + '|').indexOf('|' + key + '|') >= 0
}
FX._cmdMarkUsed = function(server, cmds) {
    let key = cmds.join('|')
    let s = FX.pdGet(server, 'cmd_item_used')
    let list = s === '' ? [] : s.split('|')
    if (list.indexOf(key) < 0) {
        list.push(key)
        FX.pdPut(server, 'cmd_item_used', list.join('|'))
    }
}

// ---------------------------------------------------------------------------
//  Execution
// ---------------------------------------------------------------------------
FX._cmdRunOne = function(runServer, e, c) {
    if (c == null) return
    let s = FX.jsStr(c)
    if (s === '') return
    if (s.charAt(0) === '/') s = s.substring(1)
    let dim = ''
    try { dim = String(e.level.dimension) } catch (err) { dim = '' }
    let full = 'execute in ' + dim + ' positioned ' + e.x + ' ' + e.y + ' ' + e.z + ' run ' + s
    try {
        runServer.runCommandSilent(full)
    } catch (err) {
        if (!e.warned) {
            e.warned = true
            console.warn('[cmd] FIRE threw: "' + full + '" — ' + err)
        }
    }
}

// run a command queue: one command per delay ticks (delay 0 = the same
// tick). The queue handle is replaceable by name — a re-fire stops the
// previous queue first; a single command skips the machinery entirely.
FX._cmdRunQueue = function(runServer, e, cmds, tag) {
    if (cmds == null || cmds.length === 0) return
    if (cmds.length === 1 && (e.delay | 0) === 0) {
        FX._cmdRunOne(runServer, e, cmds[0])
        return
    }
    let qName = 'cmdq:' + e.key + (tag === 'out' ? ':out' : '')
    let i = 0
    let handle = null
    handle = FX._add('cmdq', qName, function() {
        if (i >= cmds.length) { handle.stop(); return }
        FX._cmdRunOne(runServer, e, cmds[i])
        i++
        if (i >= cmds.length) handle.stop()
    }, { replace: true, interval: Math.max(1, e.delay | 0) })
}

FX._cmdFireOut = function(runServer, e) {
    if (e.out == null || e.out.length === 0) return
    FX._cmdRunQueue(runServer, e, e.out, 'out')
}

// ---------------------------------------------------------------------------
//  Pool
// ---------------------------------------------------------------------------
FX._cmdRegister = function(pdServer, level, x, y, z, tag, bornNow) {
    let key = FX._cmdPosKey(level, x, y, z)
    let skipMain = false
    try { skipMain = tag.once && FX._cmdUsed(pdServer, tag.cmds) } catch (err) {}
    let e = {
        key: key,
        pdServer: pdServer,
        level: level, x: x, y: y, z: z,
        blockId: null,
        cmds: tag.cmds, out: tag.out == null ? null : tag.out,
        repeat: tag.repeat === true,
        every: Math.max(1, tag.every | 0),
        once: tag.once === true,
        delay: Math.max(0, tag.delay | 0),
        skipMain: skipMain === true,
        fired: skipMain === true,
        nextRun: 0,
        warned: false,
        bornAt: bornNow,
    }
    try { e.blockId = String(level.getBlock(x, y, z).id) } catch (err) {}
    FX._cmdPool[key] = e
    return e
}

FX._cmdDrop = function(e, reason) {
    FX._dbgInfo('[cmd] drop ' + e.key + ' — ' + reason)
    delete FX._cmdPool[e.key]
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
    let inWl = false
    try { inWl = FX.inWhitelist(server, id) } catch (err) {}
    if (!inWl) return
    let level = block.level
    let now = 0
    try { now = server.tickCount } catch (err) { now = 0 }

    // route 1: tagged item in hand — registers BEFORE vanilla settles the
    // item into the BE; bornAt starts the grace window
    let tag = null
    try { tag = FX._cmdFromStack(event.item) } catch (err) {}
    if (tag != null) {
        let same = false
        try { same = FX._cmdSameEntry(level, block.x, block.y, block.z, tag.cmds) } catch (err) {}
        if (!same) {
            try {
                FX._cmdRegister(server, level, block.x, block.y, block.z, tag, now)
            } catch (err) {
                console.error('[cmd] route1 register crashed: ' + err)
            }
        }
        return
    }

    // route 2: scan the holder contents — the item is already inside
    let found = null
    try { found = FX._cmdFindTagged(block) } catch (err) {}
    if (found == null) return
    let same2 = false
    try { same2 = FX._cmdSameEntry(level, block.x, block.y, block.z, found.cmds) } catch (err) {}
    if (!same2) {
        try {
            FX._cmdRegister(server, level, block.x, block.y, block.z, found, 0)
        } catch (err) {
            console.error('[cmd] route2 register crashed: ' + err)
        }
    }
})

// ---------------------------------------------------------------------------
//  Watcher
// ---------------------------------------------------------------------------
FX._cmdTickSeen = false
ServerEvents.tick(event => {
    let FX = global.libs.fx
    let runServer = event.server
    if (!FX._cmdTickSeen) {
        FX._cmdTickSeen = true
    }
    if (runServer == null) return
    let scan = Math.max(1, FX.config.itemScan | 0)
    let doScan = runServer.tickCount % scan === 0

    for (let key in FX._cmdPool) {
        let e = FX._cmdPool[key]
        if (e.bornAt === undefined) e.bornAt = 0

        try {
            let needCheck = !e.fired || doScan
            if (needCheck) {
                let block = null
                try { block = e.level.getBlock(e.x, e.y, e.z) } catch (err) {}
                if (block == null) { FX._cmdDrop(e, 'level unreadable'); continue }
                if (String(block.id) !== e.blockId) {
                    if (e.fired) FX._cmdFireOut(runServer, e)
                    FX._cmdDrop(e, 'holder replaced')
                    continue
                }
                let inWl = true
                try { inWl = FX.inWhitelist(e.pdServer, e.blockId) } catch (err) {}
                if (!inWl) {
                    if (e.fired) FX._cmdFireOut(runServer, e)
                    FX._cmdDrop(e, 'holder unlisted')
                    continue
                }
                let found = null
                try { found = FX._cmdFindTagged(block) } catch (err) {}
                if (found == null) {
                    // grace window: route-1 entries are registered before
                    // vanilla settles the item into the BE
                    let inGrace = e.bornAt > 0 &&
                        (runServer.tickCount - e.bornAt) < 10
                    if (!inGrace) {
                        if (e.fired) FX._cmdFireOut(runServer, e)
                        FX._cmdDrop(e, 'item gone from holder')
                    }
                    continue
                }
                let changed = found.cmds.join('|') !== e.cmds.join('|')
                if (!changed && e.out != null && found.out != null) {
                    changed = found.out.join('|') !== e.out.join('|')
                }
                if (!changed && (e.out == null) !== (found.out == null)) changed = true
                if (changed) {
                    if (e.fired) FX._cmdFireOut(runServer, e)
                    e.cmds = found.cmds
                    e.out = found.out
                    e.repeat = found.repeat === true
                    e.every = Math.max(1, found.every | 0)
                    e.once = found.once === true
                    e.delay = Math.max(0, found.delay | 0)
                    e.skipMain = e.once && FX._cmdUsed(e.pdServer, e.cmds)
                    e.fired = e.skipMain
                    e.nextRun = 0
                    e.warned = false
                    continue   // the new item settles for one tick before firing
                }
            }

            // main queue: once per placement, or re-fire on repeat
            if (!e.skipMain && !e.fired) {
                FX._cmdRunQueue(runServer, e, e.cmds)
                e.fired = true
                if (e.once) {
                    FX._cmdMarkUsed(e.pdServer, e.cmds)
                    e.skipMain = true
                }
                if (e.repeat) e.nextRun = runServer.tickCount + e.every
            } else if (e.repeat && !e.skipMain) {
                if (e.nextRun === 0) e.nextRun = runServer.tickCount + e.every
                if (runServer.tickCount >= e.nextRun) {
                    e.nextRun = runServer.tickCount + e.every
                    FX._cmdRunQueue(runServer, e, e.cmds)
                }
            }
        } catch (err) {
            console.error('[cmd] watcher entry crashed (' + e.key + '): ' + err)
            FX._cmdDrop(e, 'watcher crash')
        }
    }
})

// ---------------------------------------------------------------------------
//  /cmd hand — tag the held item
// ---------------------------------------------------------------------------
// pre-parser: in:[…] / out:[…] lists are matched greedily to the closing
// bracket — spaces inside elements are safe; the lists are removed from the
// string so the token parser never sees them
FX._cmdExtractLists = function(s) {
    let cmds = null, out = null
    let src = FX.jsStr(s)
    let rest = ''
    let i = 0, n = src.length
    while (i < n) {
        // find the next in:/out: token start
        let m = /(?:^|\s)(in|out):/.exec(src.substring(i))
        if (m == null) { rest += src.substring(i); break }
        let tokStart = i + m.index
        let before = src.substring(i, tokStart)
        rest += before
        let key = m[1]
        let j = tokStart + m[0].length
        while (j < n && src.charAt(j) === ' ') j++
        if (j >= n || src.charAt(j) !== '[') {
            // not a list — leave the token untouched for the token parser
            let advance = tokStart + m[0].length - i
            rest += src.substring(tokStart, tokStart + m[0].length)
            i = tokStart + m[0].length
            continue
        }
        // scan to the balanced closing bracket, quotes skip their content
        let depth = 0
        let k = j
        let inQuote = null
        while (k < n) {
            let ch = src.charAt(k)
            if (inQuote != null) {
                if (ch === inQuote) inQuote = null
            } else if (ch === '"' || ch === "'") {
                inQuote = ch
            } else if (ch === '[') {
                depth++
            } else if (ch === ']') {
                depth--
                if (depth === 0) break
            }
            k++
        }
        let listText = (k < n) ? src.substring(j, k + 1) : src.substring(j)
        let list = FX._cmdParseList(listText)
        if (key === 'in') cmds = list
        else out = list
        i = (k < n) ? k + 1 : n
        if (k < n) rest += ' '
    }
    return { cmds: cmds, out: out, rest: rest.trim() }
}

// '["a","b"]' → ['a','b']; unquoted elements run to the comma
FX._cmdParseList = function(v) {
    let s = FX.jsStr(v).trim()
    if (s.charAt(0) !== '[') return null
    if (s.charAt(s.length - 1) !== ']') return null
    let body = s.substring(1, s.length - 1)
    let out = []
    let i = 0, n = body.length
    while (i < n) {
        while (i < n && (body.charAt(i) === ' ' || body.charAt(i) === ',')) i++
        if (i >= n) break
        let text = ''
        if (body.charAt(i) === '"' || body.charAt(i) === "'") {
            let q = body.charAt(i)
            i++
            let st = i
            while (i < n && body.charAt(i) !== q) i++
            text = body.substring(st, i)
            if (i < n) i++
        } else {
            while (i < n && body.charAt(i) !== ',') { text += body.charAt(i); i++ }
            text = text.trim()
        }
        if (text !== '') {
            if (text.charAt(0) === '/') text = text.substring(1)
            out.push(text)
        }
    }
    return out
}

FX._cmdParamKey = /(?:^|\s)(out|repeat|every|once|delay):/

// token params for the non-list forms: bare out:"…" / out: rest-of-line,
// repeat / every / once / delay
FX._cmdParseParams = function(s) {
    let out = null, repeat = false, once = false, every = 20, delay = 0
    let i = 0, n = s.length
    while (i < n) {
        while (i < n && s.charAt(i) === ' ') i++
        if (i >= n) break
        let text = ''
        while (i < n && s.charAt(i) !== ' ') {
            let ch = s.charAt(i)
            if (ch === '"' || ch === "'") {
                let q = ch
                i++
                let st = i
                while (i < n && s.charAt(i) !== q) i++
                text += s.substring(st, i)
                if (i < n) i++
            } else { text += ch; i++ }
        }
        let ci = text.indexOf(':')
        if (ci <= 0) continue
        let k = text.substring(0, ci)
        let v = text.substring(ci + 1)
        if (k === 'repeat') repeat = (v === 'true')
        else if (k === 'once') once = (v === 'true')
        else if (k === 'every') {
            let num = parseInt(v, 10)
            if (!isNaN(num) && num >= 1) every = num | 0
        } else if (k === 'delay') {
            let num = parseInt(v, 10)
            if (!isNaN(num) && num >= 0) delay = num | 0
        } else if (k === 'out') {
            if (v === '') {
                let rest = s.substring(i).trim()
                if (rest !== '') {
                    if (rest.charAt(0) === '/') rest = rest.substring(1)
                    out = [rest]
                }
                break
            }
            if (v.charAt(0) === '/') v = v.substring(1)
            out = [v]
        }
    }
    return { out: out, repeat: repeat, once: once, every: every, delay: delay }
}

FX._cmdDispatchHand = function(ctx, argsStr) {
    let FX = global.libs.fx
    let player = ctx.source.player
    if (player == null) { console.info('[cmd] /cmd is player only'); return 0 }

    let a = FX.jsStr(argsStr).trim()
    if (a === '') {
        player.tell('§7Usage: /cmd hand <command|in:[…]> [out:<command|[…]>] [repeat:true] [every:N] [delay:N] [once:true]')
        player.tell('§8queue: in:["say 1","say 2"] delay:20 — one command per 20 ticks; ~ and the dimension come from the holder')
        return 0
    }
    if (a.charAt(0) === '/') a = a.substring(1)

    // 1) list params first — extracted whole, removed from the string
    let pre = FX._cmdExtractLists(a)
    let cmds = pre.cmds
    let out = pre.out
    let rest = pre.rest

    // 2) the command region: everything up to the first token param
    let m = FX._cmdParamKey.exec(rest)
    let cmd = rest, paramStr = ''
    if (m != null) {
        cmd = rest.substring(0, m.index).trim()
        paramStr = rest.substring(m.index).trim()
    }

    // 3) token params (bare out:, repeat, every, once, delay)
    let repeat = false, once = false, every = 20, delay = 0
    if (paramStr !== '') {
        let p = FX._cmdParseParams(paramStr)
        if (out == null) out = p.out
        repeat = p.repeat; once = p.once; every = p.every; delay = p.delay
    }

    // 4) the bare command form (no in: list): the whole leading region
    if (cmds == null) {
        if (cmd === '') {
            player.tell('§c[cmd] no command — use in:<command> or in:[queue]')
            return 0
        }
        cmds = [cmd]
    } else if (cmd !== '') {
        // a bare command AND an in: list — the bare one goes first
        cmds = [cmd].concat(cmds)
    }

    let hand = null
    try { hand = player.mainHandItem } catch (err) {}
    if (hand == null) {
        try { hand = player.getHeldItem('main_hand') } catch (err) { hand = null }
    }
    if (hand == null || String(hand.id) === 'minecraft:air' || hand.empty === true) {
        player.tell('§c[cmd] hold the item to tag in your main hand')
        return 0
    }

    // NBT write: a single command stays the legacy string; 2+ entries
    // become the pipe queue. Only cmditem_* keys are touched.
    let ok = false, why = ''
    try {
        let nbt = hand.nbt
        let wrote = false
        if (nbt != null) {
            try {
                if (cmds.length === 1) {
                    nbt.putString('cmditem', cmds[0])
                    nbt.remove('cmditem_q')
                } else {
                    nbt.putString('cmditem_q', cmds.join('|'))
                    nbt.remove('cmditem')
                }
                if (out != null && out.length > 0) {
                    if (out.length === 1) {
                        nbt.putString('cmditem_out', out[0])
                        nbt.remove('cmditem_out_q')
                    } else {
                        nbt.putString('cmditem_out_q', out.join('|'))
                        nbt.remove('cmditem_out')
                    }
                } else {
                    nbt.remove('cmditem_out')
                    nbt.remove('cmditem_out_q')
                }
                nbt.putBoolean('cmditem_repeat', repeat)
                nbt.putInt('cmditem_every', every)
                nbt.putInt('cmditem_delay', delay)
                nbt.putBoolean('cmditem_once', once)
                wrote = true
            } catch (err1) { wrote = false }
            if (!wrote) {
                try {
                    if (cmds.length === 1) {
                        nbt.cmditem = cmds[0]
                        delete nbt.cmditem_q
                    } else {
                        nbt.cmditem_q = cmds.join('|')
                        delete nbt.cmditem
                    }
                    if (out != null && out.length > 0) {
                        if (out.length === 1) {
                            nbt.cmditem_out = out[0]
                            delete nbt.cmditem_out_q
                        } else {
                            nbt.cmditem_out_q = out.join('|')
                            delete nbt.cmditem_out
                        }
                    } else {
                        delete nbt.cmditem_out
                        delete nbt.cmditem_out_q
                    }
                    nbt.cmditem_repeat = repeat
                    nbt.cmditem_every = every
                    nbt.cmditem_delay = delay
                    nbt.cmditem_once = once
                    hand.setNbt(nbt)
                    wrote = true
                } catch (err2) { wrote = false }
            }
        }
        if (!wrote) {
            let fresh = {
                cmditem_repeat: repeat, cmditem_every: every,
                cmditem_delay: delay, cmditem_once: once,
            }
            if (cmds.length === 1) fresh.cmditem = cmds[0]
            else fresh.cmditem_q = cmds.join('|')
            if (out != null && out.length > 0) {
                if (out.length === 1) fresh.cmditem_out = out[0]
                else fresh.cmditem_out_q = out.join('|')
            }
            hand.setNbt(fresh)
        }

        // readback: the queue key or the single key must match
        let back = null
        try { back = FX._cmdNbtList(hand.nbt, 'cmditem_q', 'cmditem') } catch (err) { back = null }
        ok = (back != null && back.join('|') === cmds.join('|'))
        if (!ok) why = 'readback: "' + (back == null ? 'null' : back.join('|')) + '"'
    } catch (err) {
        why = String(err)
        console.warn('[cmd] hand: nbt write failed: ' + err)
    }
    if (!ok) {
        player.tell('§c[cmd] could not tag the item (' + why + ')')
        return 0
    }

    player.tell('§6[cmd] tagged §f' + String(hand.id) + '§r: §e' +
        (cmds.length === 1 ? cmds[0] : cmds.length + ' commands'))
    if (out != null) {
        player.tell('§7[cmd] on take: §e' +
            (out.length === 1 ? out[0] : out.length + ' commands'))
    }
    if (delay > 0) player.tell('§7[cmd] queue delay: ' + delay + 't')
    if (repeat) player.tell('§7[cmd] repeats every ' + every + 't while placed')
    if (once) player.tell('§7[cmd] one-shot: the first placement only, then inert')
    return 1
}

ServerEvents.commandRegistry(event => {
    const { commands, arguments } = event
    let FX = global.libs.fx

    let usage = function(ctx) {
        let p = ctx.source.player
        let msg = '§7Usage: /cmd hand <command|in:[…]> [out:<command|[…]>] [repeat:true] [every:N] [delay:N] [once:true]'
        if (p != null) p.tell(msg)
        else console.info('[cmd] ' + msg)
        return 1
    }

    let argsArg = FX.cmd.attachSuggests(
        commands.argument('args', arguments.GREEDY_STRING.create(event)),
        function(builder) {
            let rest = String(builder.getRemaining())
            let li = rest.lastIndexOf(' ')
            let head = li >= 0 ? rest.substring(0, li + 1) : ''
            let vals = ['in:["say 1","say 2"]', 'out:["say 3"]',
                        'repeat:true', 'once:true', 'delay:20', 'every:20']
            for (let i = 0; i < vals.length; i++) builder.suggest(head + vals[i] + ' ')
        })
    argsArg.executes(ctx =>
        FX._cmdDispatchHand(ctx, arguments.GREEDY_STRING.getResult(ctx, 'args')))

    let root = commands.literal('cmd')
        .requires(src => src.hasPermission(2))
        .executes(ctx => usage(ctx))
    root.then(commands.literal('hand')
        .executes(ctx => usage(ctx))
        .then(argsArg))
    event.register(root)
})

// reload/unload: pool reset
if (FX._wipeFns != null) {
    FX._wipeFns.push(function() { FX._cmdPool = {} })
}