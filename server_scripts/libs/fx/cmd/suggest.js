// ============================================================================
//  fx.cmd.suggest — tab completion
//
//  args is a greedy string, so a suggestion must contain everything typed
//  so far: candidates are proposed as <typed prefix><candidate>. Brigadier
//  prefix-filters them against the remaining input and inserts them without
//  wiping anything already typed.
// ============================================================================
let FX = global.libs.fx
let S = FX.cmd

var UNIVERSAL_KEYS = ['target', 'from', 'to', 'offset', 'particle', 'particleSpeed',
                      'spread', 'repeat', 'name', 'replace', 'viewDist', 'singleColor',
                      'heading', 'tilt', 'facing', 'axis']

// ---------------------------------------------------------------------------
//  Particles: the vanilla registry (lazily), "minecraft:" prefix stripped so
//  values stay single words; _spawn re-adds the namespace.
// ---------------------------------------------------------------------------
S.particles = null
S.baseParticles = [
    'flame', 'end_rod', 'cloud', 'crit', 'enchant', 'soul_fire_flame',
    'heart', 'happy_villager', 'angry_villager', 'totem_of_undying',
    'dragon_breath', 'witch', 'portal', 'redstone',
]

function particleList() {
    if (S.particles != null) return S.particles
    let out = []
    try {
        let reg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
        let it = reg.PARTICLE_TYPE.keySet().iterator()
        while (it.hasNext()) {
            let s = String(it.next())
            out.push(s.indexOf('minecraft:') === 0 ? s.substring(10) : s)
        }
    } catch (err) {}
    if (out.length === 0) out = S.baseParticles.slice()
    out.sort()
    S.particles = out
    return out
}

// ---------------------------------------------------------------------------
//  /fx settings spec: shared by tree.js and these suggestions
// ---------------------------------------------------------------------------
S.SETTINGS = [
    { key: 'viewDist',    type: 'number', min: 0, desc: 'effects farther than this from every player are skipped' },
    { key: 'debug',       type: 'bool',             desc: 'verbose fx logging (customDebug)' },
    { key: 'queue',       type: 'bool',             desc: 'FIFO smoothing of spawn bursts' },
    { key: 'queueBudget', type: 'number', min: 0,   desc: 'max packet sends per tick, 0 = unlimited' },
    { key: 'queueWarn',   type: 'number', min: 0,   desc: 'backlog warning threshold (customDebug)' },
    { key: 'queueCap',    type: 'number', min: 1,   desc: 'hard cap; the oldest sends are dropped past it' },
    { key: 'itemScan',  type: 'number', min: 1, desc: 'ticks between item-effect holder checks' },
    { key: 'itemEvery', type: 'number', min: 1, desc: 'default item-effect re-fire interval (ticks); repeat:N in the item line overrides' },
]
S.settingSpec = function(key) {
    for (let i = 0; i < S.SETTINGS.length; i++) if (S.SETTINGS[i].key === key) return S.SETTINGS[i]
    return null
}

// suggests() wrapper; falls back silently when the build lacks suggestion hooks
S.attachSuggests = function(arg, fn) {
    try {
        if (typeof arg.suggests !== 'function') return arg
        arg.suggests(function(a, b) {
            let builder = b
            let other = a
            if (builder == null || typeof builder.suggest !== 'function') {
                if (a != null && typeof a.suggest === 'function') {
                    builder = a
                    other = b
                }
            }
            if (builder == null || typeof builder.suggest !== 'function') return null
            try { fn(builder, other) } catch (err) {}
            try { return builder.buildFuture() } catch (err) { return null }
        })
    } catch (err) {}
    return arg
}

function typedTokens(str) {
    let s = String(str)
    if (s.charAt(0) === '/') s = s.substring(1)
    return S.tokenize(s)
}

// the effect name token after "run" or "hand"
function effectOf(toks) {
    for (let i = 0; i < toks.length; i++) {
        if (toks[i].text === 'run' || toks[i].text === 'hand') {
            return i + 1 < toks.length ? toks[i + 1].text : null
        }
    }
    return null
}

// ---------------------------------------------------------------------------
//  Simple lists
// ---------------------------------------------------------------------------
S.suggestEffects = function(builder) {
    let names = Object.keys(FX.commands._cmds).sort()
    for (let i = 0; i < names.length; i++) builder.suggest(names[i])
}

S.suggestStopNames = function(builder) {
    let seen = {}
    for (let i = 0; i < FX._active.length; i++) {
        let n = FX._active[i].name
        if (seen[n]) continue
        seen[n] = true
        builder.suggest(n)
    }
    if (FX._active.length > 0) builder.suggest('all')
}

S.suggestSettingsKeys = function(builder) {
    for (let i = 0; i < S.SETTINGS.length; i++) builder.suggest(S.SETTINGS[i].key)
}

S.suggestSettingsValues = function(builder) {
    let full = String(builder.getInput())
    let rest = String(builder.getRemaining())
    let typed = full.substring(0, Math.max(0, full.length - rest.length))
    let toks = typedTokens(typed)
    let key = null
    for (let i = toks.length - 1; i >= 0; i--) {
        if (toks[i].text) { key = toks[i].text; break }
    }
    let spec = S.settingSpec(key)
    if (spec == null) return
    if (spec.type === 'bool') { builder.suggest('true'); builder.suggest('false') }
}

S.suggestWhitelistAdd = function(builder) {
    let vals = ['"minecraft:lectern"', '"minecraft:jukebox"']
    for (let i = 0; i < vals.length; i++) builder.suggest(vals[i])
}

S.suggestWhitelistRemove = function(builder, cctx) {
    let server = null
    try { if (cctx != null && cctx.source != null) server = cctx.source.server } catch (err) {}
    if (server == null) return
    let w = FX.getWhitelist(server)
    for (let i = 0; i < w.length; i++) builder.suggest('"' + w[i] + '"')
}

// ---------------------------------------------------------------------------
//  Value candidates for a key; quoted templates where the value has spaces
// ---------------------------------------------------------------------------
S.valueList = function(cmd, key) {
    if (cmd != null && cmd.opts != null) {
        for (let i = 0; i < cmd.opts.length; i++) {
            let o = cmd.opts[i]
            if (o.key !== key) continue
            if (o.type === 'enum' && o.vals != null) return o.vals
            if (o.type === 'bool') return ['true', 'false']
        }
    }
    if (key === 'particle')      return particleList()
    if (key === 'replace' || key === 'singleColor') return ['true', 'false']
    if (key === 'repeat')        return ['1', '2', '3', '5', '10', '20']
    if (key === 'interval')      return ['1', '2', '3', '5', '10']
    if (key === 'viewDist')      return ['0', '32', '64', '128']
    if (key === 'particleSpeed') return ['0', '0.05', '0.1', '0.3', '0.5']
    if (key === 'spread')        return ['0.1', '0.5', '1']
    if (key === 'offset')        return ['0,1,0', '0,0.5,0']
    if (key === 'heading')       return ['0', '90', '180', '270']
    if (key === 'tilt')          return ['0', '30', '45', '60', '90']
    if (key === 'facing')        return ['up', 'down', 'N', 'S', 'E', 'W']
    if (key === 'axis')          return ['0,1,0', '1,0,0', '0,0,1']
    if (key === 'colors')        return ["{random:3}", "'1,0,0 0,1,0'", '#ff0000']
    if (key === 'target' || key === 'from' || key === 'to') {
        let out = ['me', 'here', 'look:8', '1,2,3', '~,~1,~',
                   '"@e[type=zombie,distance=..8,limit=5]"']
        let tags = Object.keys(FX._tags).sort()
        for (let i = 0; i < tags.length && i < 6; i++) out.push('"@e[tag=' + tags[i] + ']"')
        return out
    }
    return null
}

// keys already present in the args string
function usedKeys(rest) {
    let used = {}
    let toks = String(rest).split(' ')
    for (let i = 0; i < toks.length; i++) {
        let ci = toks[i].indexOf(':')
        if (ci > 0) used[toks[i].substring(0, ci)] = true
    }
    return used
}

// ---------------------------------------------------------------------------
//  The args completion: keys not used yet, or values for the key being typed
// ---------------------------------------------------------------------------
S.suggestArgs = function(builder) {
    let full = String(builder.getInput())
    let rest = String(builder.getRemaining())
    let typed = full.substring(0, Math.max(0, full.length - rest.length))

    let effect = effectOf(typedTokens(typed))
    let cmd = effect != null ? FX.commands._cmds[effect] : null
    if (cmd == null) return

    // split the remaining into the typed prefix and the word being completed
    let li = rest.lastIndexOf(' ')
    let head = li >= 0 ? rest.substring(0, li + 1) : ''
    let partial = li >= 0 ? rest.substring(li + 1) : rest

    // completing a value: "key:val…"
    let ci = partial.indexOf(':')
    if (ci > 0) {
        let key = partial.substring(0, ci)
        let vals = S.valueList(cmd, key)
        if (vals != null) {
            for (let i = 0; i < vals.length; i++) {
                builder.suggest(head + key + ':' + vals[i] + ' ')
            }
        }
        return
    }

    // completing a key: keys not used yet
    let used = usedKeys(rest)
    let keys = []
    if (cmd.opts != null) {
        for (let i = 0; i < cmd.opts.length; i++) keys.push(cmd.opts[i].key)
    }
    for (let i = 0; i < UNIVERSAL_KEYS.length; i++) keys.push(UNIVERSAL_KEYS[i])
    let n = 0
    for (let i = 0; i < keys.length && n < 32; i++) {
        if (used[keys[i]]) continue
        builder.suggest(head + keys[i] + ':')
        n++
    }
}