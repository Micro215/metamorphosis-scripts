// ============================================================================
//  fx.cmd.tree — the /fx command tree
//
//    /fx                                  list everything
//    /fx effect run <effect> [args]       run an effect
//    /fx effect hand <effect> [args]      tag the held item with the effect
//    /fx effect whitelist add|remove|list|clear [block]
//    /fx stop <name|all> | stopAll | count | list | stats | settings
//
//  args is one greedy string of key:value tokens, up to 32 of them:
//    /fx effect run ring radius:1.5 points:30 particle:flame
//  Quotes are only needed for values with spaces or a namespace colon:
//    target:"@e[type=zombie]" colors:'1,0,0 0,1,0' "minecraft:lectern"
//
//  Effect option defaults (the opts table of the effect) are merged here —
//  effects read opts directly.
//
//  repeat:N reruns the effect every N ticks with ctx.t advancing, until
//  /fx stop. Without repeat every effect fires exactly once.
//
//  hand: once:true in the args becomes the one-shot NBT flag (stripped from
//  the stored line); repeat:N stays in the line and means the re-fire
//  interval while the item sits on a whitelisted holder.
// ============================================================================
let FX = global.libs.fx
let S = FX.cmd

const MAX_ARGS = 32

function tell(ctx, msg) {
    let p = ctx.source.player
    if (p != null) p.tell(msg)
    else console.info(msg)
}

// ---------------------------------------------------------------------------
//  Dispatch — run
// ---------------------------------------------------------------------------
function dispatch(ctx, effectName, argsStr) {
    let FX = global.libs.fx
    let player = ctx.source.player
    if (player == null) { console.info('[fx] /fx is player only'); return 0 }
    effectName = FX.jsStr(effectName)
    argsStr = FX.jsStr(argsStr)

    let cmd = FX.commands._cmds[effectName]
    if (cmd == null) {
        player.tell('§cUnknown effect: ' + effectName + '§r — /fx for the list')
        return 0
    }

    if (argsStr != null && argsStr.trim() === '?') {
        S.help(player, cmd)
        return 1
    }

    let toks = S.tokenize(argsStr)
    if (toks.length > MAX_ARGS) {
        toks = toks.slice(0, MAX_ARGS)
        player.tell('§7[fx] arguments capped at ' + MAX_ARGS)
    }
    let opts = S.parseOpts(toks)
    S.normalizeOpts(opts)
    FX._mergeDefaults(cmd, opts)

    opts.level = player.level
    opts.server = ctx.source.server

    // targets are resolved before the effect sees them
    for (let i = 0; i < 3; i++) {
        let k = ['target', 'from', 'to'][i]
        if (opts[k] == null) continue
        let r = S.resolveTarget(opts[k], player, ctx.source.server)
        if (r == null) return 0
        opts[k] = r
    }

    let c = {
        player: player,
        server: ctx.source.server,
        level: player.level,
        pos: { x: player.x, y: player.y, z: player.z, level: player.level },
        opts: opts,
        args: argsStr == null ? '' : argsStr,
        effect: effectName,
        t: 0,
    }

    function runOnce() {
        FX._current = effectName          // telemetry attribution by effect type
        try {
            cmd.run(c)
        } catch (err) {
            console.error('[fx] "' + effectName + '" failed: ' + err)
            try { player.tell('§c/fx effect run ' + effectName + ' failed: ' + err) } catch (e2) {}
        } finally {
            FX._current = null
        }
    }

    // repeat N — rerun every N ticks; ctx.t advances so time-based effects
    // (orbit, spin, tesseract rotation) progress across reruns
    if (opts.repeat != null && opts.repeat > 0) {
        let every = Math.max(1, opts.repeat | 0)
        let name = opts.name != null ? String(opts.name) : ('repeat:' + effectName)
        FX.stop(name)
        let handle = null
        handle = FX._add('repeat', name, function(server) {
            if (!FX.entValid(player)) { handle.stop(); return }
            handle._t = (handle._t || 0) + 1
            if (handle._t % every !== 0) return
            c.t = handle._t
            runOnce()
        })
        runOnce()
        player.tell('Repeating §e' + effectName + '§r every ' + every + 't — §7/fx stop ' + name)
        return 1
    }

    runOnce()
    return 1
}

// ---------------------------------------------------------------------------
//  Dispatch — hand: tag the held item with the effect line
//  The line is stored verbatim (key:value tokens, including once: and
//  repeat:) — the item runtime parses it the same way the command does.
// ---------------------------------------------------------------------------
function dispatchHand(ctx, effectName, argsStr) {
    let FX = global.libs.fx
    let player = ctx.source.player
    if (player == null) { console.info('[fx] /fx is player only'); return 0 }
    effectName = FX.jsStr(effectName)
    let a = FX.jsStr(argsStr).trim()

    let cmd = FX.commands._cmds[effectName]
    if (cmd == null) {
        player.tell('§cUnknown effect: ' + effectName + '§r — /fx for the list')
        return 0
    }
    if (a === '?') { S.help(player, cmd); return 1 }

    let hand = null
    try { hand = player.mainHandItem } catch (err) {}
    if (hand == null) {
        try { hand = player.getHeldItem('main_hand') } catch (err) { hand = null }
    }
    if (hand == null || String(hand.id) === 'minecraft:air' || hand.empty === true) {
        player.tell('§c[fx] hold the item to tag in your main hand')
        return 0
    }

    // the line keeps every token incl. once:/repeat: — the item runtime
    // (parseLine) reads once from the parsed opts, exactly like a command
    let line = effectName
    if (a.length > 0) line += ' ' + a

    let ok = false
    let why = ''
    try {
        let nbt = hand.nbt
        let wrote = false
        if (nbt != null) {
            try {
                nbt.putString('fxitem', line)
                wrote = true
            } catch (err1) { wrote = false }
            if (!wrote) {
                try {
                    nbt.fxitem = line
                    hand.setNbt(nbt)
                    wrote = true
                } catch (err2) { wrote = false }
            }
            if (wrote) {
                try { nbt.remove('fxitem_once') } catch (err3) {
                    try { delete nbt.fxitem_once } catch (err4) {}
                }
                try { nbt.remove('fxitem_used') } catch (err5) {
                    try { delete nbt.fxitem_used } catch (err6) {}
                }
            }
        }
        if (!wrote) hand.setNbt({ fxitem: line })

        let back = null
        try { back = hand.nbt.getString('fxitem') } catch (err) { back = null }
        if (back == null) {
            try { back = hand.nbt.fxitem } catch (err) { back = null }
        }
        ok = (FX.jsStr(back) === line)
        if (!ok) why = 'readback: "' + FX.jsStr(back) + '"'
    } catch (err) {
        why = String(err)
        console.warn('[fx] hand: nbt write failed: ' + err)
    }
    if (!ok) {
        player.tell('§c[fx] could not tag the item (' + why + ')')
        return 0
    }

    player.tell('§6[fx] tagged §f' + String(hand.id) + '§r: §e' + line)
    player.tell('§7[fx] place it on a whitelisted holder (default: lectern)')
    return 1
}

// ---------------------------------------------------------------------------
//  Stats / settings
// ---------------------------------------------------------------------------
function showStats(ctx) {
    let st = FX._stats
    let lines = ['§6fx stats§r §7(window: ' + st.window + ' ticks)§r']
    lines.push('§e' + st.lastAvg.toFixed(2) + '§r packets/tick average, peak §e' + st.lastPeak + '§r in a single tick')
    lines.push('§7current window: §f' + st._w + '§7 packets over §f' + st._wt + '§7 ticks')
    let types = []
    for (let k in st.lastTypes) types.push([k, st.lastTypes[k]])
    types.sort(function(a, b) { return b[1] - a[1] })
    if (types.length === 0) {
        lines.push('§7by effect type: no data (window not closed yet, or no spawns)')
    } else {
        lines.push('§7by effect type (last window):')
        let n = Math.min(10, types.length)
        for (let i = 0; i < n; i++) lines.push(' §e' + types[i][0] + '§r: ' + types[i][1])
    }
    tell(ctx, lines.join('\n'))
}

function showSettings(ctx) {
    let lines = ['§6/fx settings§r §7<key> <value>§r']
    for (let i = 0; i < S.SETTINGS.length; i++) {
        let sp = S.SETTINGS[i]
        lines.push(' §e' + sp.key + '§r = §f' + FX.config[sp.key] + '§r §7— ' + sp.desc)
    }
    tell(ctx, lines.join('\n'))
}

function setSetting(ctx, key, valueStr) {
    let sp = S.settingSpec(key)
    if (sp == null) { tell(ctx, '§cUnknown setting: ' + key); return 0 }
    let v = S.parseScalar(String(valueStr))
    if (sp.type === 'bool' && typeof v !== 'boolean') { tell(ctx, '§c' + key + ' must be true/false'); return 0 }
    if (sp.type === 'number') {
        if (typeof v !== 'number') { tell(ctx, '§c' + key + ' must be a number'); return 0 }
        if (sp.min != null && v < sp.min) { tell(ctx, '§c' + key + ' must be >= ' + sp.min); return 0 }
    }
    FX.config[key] = v
    FX._cfgSave(ctx.source.server)   // persist across restarts
    tell(ctx, 'fx §e' + key + '§r = ' + v)
    return 1
}

// ---------------------------------------------------------------------------
//  The tree
// ---------------------------------------------------------------------------
ServerEvents.commandRegistry(event => {
    const { commands, arguments } = event

    let root = commands.literal('fx')
        .requires(src => src.hasPermission(2))
        .executes(ctx => { S.listAll(ctx); return 1 })

    function runUsage(ctx) {
        tell(ctx, '§7Usage: /fx effect run <effect> [key:value …] — /fx for the list')
        return 1
    }
    function handUsage(ctx) {
        tell(ctx, '§7Usage: /fx effect hand <effect> [key:value …] once:true — tags the held item')
        return 1
    }
    function whitelistUsage(ctx) {
        tell(ctx, '§7Usage: /fx effect whitelist <add|remove|list|clear> [block]§r §8— ids with a namespace go in quotes: "minecraft:lectern"')
        return 1
    }

    function showCmdHelp(ctx) {
        let name = null
        try { name = arguments.STRING.getResult(ctx, 'effect') } catch (err) {}
        let cmd = name != null ? FX.commands._cmds[name] : null
        if (cmd == null) return 0
        let p = ctx.source.player
        if (p != null) S.help(p, cmd)
        else console.info('[fx] effect help is in-game only')
        return 1
    }

    // --- /fx effect run <effect> [args] ---
    let effectArg = S.attachSuggests(
        commands.argument('effect', arguments.STRING.create(event)),
        S.suggestEffects)
    effectArg.executes(ctx =>
        dispatch(ctx, arguments.STRING.getResult(ctx, 'effect'), null))
    effectArg.then(commands.literal('?').executes(showCmdHelp))

    let argsArg = S.attachSuggests(
        commands.argument('args', arguments.GREEDY_STRING.create(event)),
        S.suggestArgs)
    argsArg.executes(ctx =>
        dispatch(ctx,
            arguments.STRING.getResult(ctx, 'effect'),
            arguments.GREEDY_STRING.getResult(ctx, 'args')))
    effectArg.then(argsArg)

    // --- /fx effect hand <effect> [args] ---
    let handEffectArg = S.attachSuggests(
        commands.argument('effect', arguments.STRING.create(event)),
        S.suggestEffects)
    handEffectArg.executes(ctx =>
        dispatchHand(ctx, arguments.STRING.getResult(ctx, 'effect'), null))
    handEffectArg.then(commands.literal('?').executes(showCmdHelp))

    let handArgsArg = S.attachSuggests(
        commands.argument('args', arguments.GREEDY_STRING.create(event)),
        S.suggestArgs)
    handArgsArg.executes(ctx =>
        dispatchHand(ctx,
            arguments.STRING.getResult(ctx, 'effect'),
            arguments.GREEDY_STRING.getResult(ctx, 'args')))
    handEffectArg.then(handArgsArg)

    // --- /fx effect whitelist <add|remove|list|clear> [block] ---
    let whitelistNode = commands.literal('whitelist').executes(whitelistUsage)

    whitelistNode.then(commands.literal('add')
        .then(S.attachSuggests(commands.argument('block', arguments.STRING.create(event)), S.suggestWhitelistAdd)
            .executes(ctx => {
                let id = global.libs.fx.addToWhitelist(ctx.source.server,
                    arguments.STRING.getResult(ctx, 'block'))
                tell(ctx, '§6[fx] whitelist += ' + id)
                return 1
            })))

    whitelistNode.then(commands.literal('remove')
        .then(S.attachSuggests(commands.argument('block', arguments.STRING.create(event)), S.suggestWhitelistRemove)
            .executes(ctx => {
                let id = global.libs.fx.removeFromWhitelist(ctx.source.server,
                    arguments.STRING.getResult(ctx, 'block'))
                tell(ctx, '§6[fx] whitelist -= ' + id)
                return 1
            })))

    whitelistNode.then(commands.literal('list')
        .executes(ctx => {
            let w = global.libs.fx.getWhitelist(ctx.source.server)
            tell(ctx, w.length === 0 ? '§7Whitelist is empty' : '§6Whitelist:§r ' + w.join(', '))
            return 1
        }))

    whitelistNode.then(commands.literal('clear')
        .executes(ctx => {
            global.libs.fx.clearWhitelist(ctx.source.server)
            tell(ctx, '§6[fx] whitelist cleared')
            return 1
        }))

    // --- the effect zone: run / hand / whitelist, all direct children ---
    let effectNode = commands.literal('effect').executes(runUsage)
    effectNode.then(commands.literal('run').executes(runUsage).then(effectArg))
    effectNode.then(commands.literal('hand').executes(handUsage).then(handEffectArg))
    effectNode.then(whitelistNode)
    root.then(effectNode)

    // /fx stop <name|all>
    root.then(
        commands.literal('stop')
            .executes(ctx => { tell(ctx, '§7Usage: /fx stop <name|all>'); return 1 })
            .then(S.attachSuggests(commands.argument('name', arguments.STRING.create(event)), S.suggestStopNames)
                .executes(ctx => {
                    let name = arguments.STRING.getResult(ctx, 'name')
                    let n
                    if (name === 'all') { n = FX._active.length; FX.stopAll() }
                    else n = FX.stop(name)
                    tell(ctx, 'Stopped ' + n + ' effect(s) "' + name + '"')
                    return 1
                })))

    root.then(commands.literal('stopAll').executes(ctx => {
        let n = FX._active.length
        FX.stopAll()
        tell(ctx, 'Stopped ' + n + ' effect(s)')
        return 1
    }))

    root.then(commands.literal('count').executes(ctx => {
        tell(ctx, 'Running effects: ' + FX.count())
        return 1
    }))

    root.then(commands.literal('list').executes(ctx => {
        let active = FX._active
        if (active.length === 0) { tell(ctx, 'No running effects'); return 1 }
        let out = []
        for (let i = 0; i < active.length; i++) out.push(active[i].name + ' (' + active[i].kind + ')')
        tell(ctx, out.join(', '))
        return 1
    }))

    root.then(commands.literal('stats').executes(ctx => { showStats(ctx); return 1 }))

    // /fx settings [key] [value]
    root.then(
        commands.literal('settings')
            .executes(ctx => { showSettings(ctx); return 1 })
            .then(
                S.attachSuggests(commands.argument('key', arguments.STRING.create(event)), S.suggestSettingsKeys)
                    .executes(ctx => {
                        let key = arguments.STRING.getResult(ctx, 'key')
                        let sp = S.settingSpec(key)
                        if (sp != null) tell(ctx, '§e' + key + '§r = §f' + FX.config[key] + '§r §7— ' + sp.desc)
                        else tell(ctx, '§cUnknown setting: ' + key)
                        return 1
                    })
                    .then(
                        S.attachSuggests(commands.argument('value', arguments.STRING.create(event)), S.suggestSettingsValues)
                            .executes(ctx => setSetting(ctx,
                                arguments.STRING.getResult(ctx, 'key'),
                                arguments.STRING.getResult(ctx, 'value'))))))

    event.register(root)
})