// ============================================================================
//  fx.cmd.parse — tokens, values, selectors, target resolution
//  Selector strings are memoized; the parsed object is shared, read-only.
// ============================================================================
let FX = global.libs.fx
let S = FX.cmd

// quote-aware tokenizer; a quoted segment becomes one token without the quotes
S.tokenize = function(str) {
    let toks = []
    if (str == null) return toks
    let s = String(str)
    let i = 0, n = s.length
    while (i < n) {
        while (i < n && s.charAt(i) === ' ') i++
        if (i >= n) break
        let text = ''
        let quoted = false
        while (i < n && s.charAt(i) !== ' ') {
            let ch = s.charAt(i)
            if (ch === "'" || ch === '"') {
                let q = ch
                i++
                let start = i
                while (i < n && s.charAt(i) !== q) i++
                text += s.substring(start, i)
                quoted = true
                if (i < n) i++
            } else {
                text += ch
                i++
            }
        }
        toks.push({ text: text, quoted: quoted })
    }
    return toks
}

S.parseScalar = function(s) {
    if (s === 'true') return true
    if (s === 'false') return false
    if (s.charAt(0) === '~') return s          // relative coordinate string
    let n = Number(s)
    return (s.length > 0 && !isNaN(n)) ? n : s
}

// unquoted value: a selector stays whole; commas split into a list
S.parseValue = function(s) {
    s = String(s)
    if (s.charAt(0) === '@') return s
    if (s.indexOf(',') >= 0) {
        let parts = s.split(',')
        let out = []
        for (let i = 0; i < parts.length; i++) {
            let p = parts[i].trim()
            out.push(p.length === 0 ? 0 : S.parseScalar(p))
        }
        return out
    }
    return S.parseScalar(s)
}

// '~' only means something in targets; everywhere else it degrades to a number
var TARGET_KEYS = { target: 1, from: 1, to: 1 }

function stripRel(v) {
    if (typeof v === 'string' && v.charAt(0) === '~') {
        let n = Number(v.substring(1))
        return isNaN(n) ? 0 : n
    }
    if (Array.isArray(v)) {
        let out = []
        for (let i = 0; i < v.length; i++) out.push(stripRel(v[i]))
        return out
    }
    return v
}

// key:value token → opts object; a quoted value stays a raw string
// (colors:'1,0,0 0,1,0', target:"@e[type=zombie]" keep their contents)
S.parseOpts = function(toks) {
    let out = {}
    for (let i = 0; i < toks.length; i++) {
        let t = toks[i]
        let ci = t.text.indexOf(':')
        if (ci <= 0) continue
        out[t.text.substring(0, ci)] = t.quoted ? t.text.substring(ci + 1)
                                                : S.parseValue(t.text.substring(ci + 1))
    }
    return out
}

S.normalizeOpts = function(opts) {
    for (let k in opts) {
        if (!TARGET_KEYS[k]) opts[k] = stripRel(opts[k])
    }
    FX.applyAliases(opts)
}

function tagOk(e, want) {
    if (want == null) return true
    let neg = false, t = want
    if (t.charAt(0) === '!') { neg = true; t = t.substring(1) }
    let tags = FX.entityTags(e)
    let has = tags != null && tags.indexOf(t) >= 0
    return neg ? !has : has
}

// ---------------------------------------------------------------------------
//  Target resolution
// ---------------------------------------------------------------------------
function relCoord(tok, base) {
    if (typeof tok === 'number') return tok
    if (typeof tok === 'string' && tok.charAt(0) === '~') {
        let rest = tok.substring(1)
        if (rest.length === 0) return base
        let n = Number(rest)
        return isNaN(n) ? base : base + n
    }
    let n = Number(tok)
    return isNaN(n) ? null : n
}

FX.commands._lookPoint = function(player, dist) {
    let M = global.libs.math
    let d = M.orient.fromEntity(player)
    return {
        x: player.x + d[0] * dist,
        y: player.y + 1.62 + d[1] * dist,
        z: player.z + d[2] * dist,
        level: player.level,
    }
}

function findPlayerByNick(server, nick) {
    let found = null
    server.players.forEach(function(p) {
        if (found != null) return
        let s = null
        try { s = p.name.string } catch (err) { s = null }
        if (s != null && s.toLowerCase() === String(nick).toLowerCase()) found = p
    })
    return found
}

// '@e[type=zombie,tag=fx_aura,limit=1]' → { kind, filters }
S._parseSelectorRaw = function(str) {
    let kind = 'e', filters = []
    let s = String(str)
    if (s.length >= 2 && s.charAt(0) === '@') {
        kind = s.charAt(1)
        let bi = s.indexOf('[')
        if (bi >= 0) {
            let ei = s.lastIndexOf(']')
            let body = s.substring(bi + 1, ei > bi ? ei : s.length)
            let parts = body.split(',')
            for (let i = 0; i < parts.length; i++) {
                let p = parts[i].trim()
                let eq = p.indexOf('=')
                if (eq <= 0) continue
                filters.push({ k: p.substring(0, eq), v: p.substring(eq + 1) })
            }
        }
    }
    return { kind: kind, filters: filters }
}
S.parseSelector = FX._memo(S._parseSelectorRaw, 10000, 64)

// '..10' | '5..' | '2..10' | '7' → { min, max }
function parseRange(v) {
    let a = 0, b = Infinity
    let di = v.indexOf('..')
    if (di < 0) {
        let n = Number(v)
        if (!isNaN(n)) { a = n; b = n }
    } else {
        let lo = v.substring(0, di), hi = v.substring(di + 2)
        if (lo.length > 0) { let n = Number(lo); if (!isNaN(n)) a = n }
        if (hi.length > 0) { let n = Number(hi); if (!isNaN(n)) b = n }
    }
    return { min: a, max: b }
}

function resolveSelector(sel, player, server) {
    let typeF = null, tagF = null, range = null, limit = 0
    for (let i = 0; i < sel.filters.length; i++) {
        let f = sel.filters[i]
        if (f.k === 'type') typeF = f.v
        else if (f.k === 'tag') tagF = f.v
        else if (f.k === 'distance') range = parseRange(f.v)
        else if (f.k === 'limit') {
            let n = Number(f.v)
            if (!isNaN(n)) limit = Math.max(1, n | 0)
        } else {
            try { player.tell('§7[fx] unknown selector filter "' + f.k + '" (type, tag, distance, limit)') } catch (err) {}
        }
    }

    function dist2(e) {
        let dx = e.x - player.x, dy = e.y - player.y, dz = e.z - player.z
        return dx * dx + dy * dy + dz * dz
    }

    let list = []
    if (sel.kind === 's') {
        list = [player]
    } else if (sel.kind === 'e') {
        let o = { level: player.level, players: true }
        if (typeF != null && typeF.charAt(0) !== '!') o.type = typeF
        if (range != null) o.near = [player.x, player.y, player.z, range.max === Infinity ? 1024 : range.max]
        let base = FX.entities(o)
        for (let i = 0; i < base.length; i++) {
            let e = base[i]
            if (!FX._typeEq(e, typeF)) continue
            if (!tagOk(e, tagF)) continue
            if (range != null) {
                let d = Math.sqrt(dist2(e))
                if (d < range.min || d > range.max) continue
            }
            list.push(e)
        }
        list.sort(function(a, b) { return dist2(a) - dist2(b) })
        if (limit === 0 && list.length > 50) {
            list = list.slice(0, 50)
            try { player.tell('§7[fx] @e without limit — capped at the 50 nearest') } catch (err) {}
        }
    } else {
        server.players.forEach(function(p) { list.push(p) })
        let kept = []
        for (let i = 0; i < list.length; i++) {
            let e = list[i]
            if (!FX._typeEq(e, typeF)) continue
            if (!tagOk(e, tagF)) continue
            if (range != null) {
                let d = Math.sqrt(dist2(e))
                if (d < range.min || d > range.max) continue
            }
            kept.push(e)
        }
        kept.sort(function(a, b) { return dist2(a) - dist2(b) })
        list = kept
    }

    if (limit > 0) {
        if (sel.kind === 'r') {
            for (let i = list.length - 1; i > 0; i--) {
                let j = (Math.random() * (i + 1)) | 0
                let t = list[i]; list[i] = list[j]; list[j] = t
            }
        }
        list = list.slice(0, limit)
    } else if (sel.kind === 'r') {
        list = list.length > 0 ? [list[(Math.random() * list.length) | 0]] : []
    } else if (sel.kind === 'p') {
        list = list.slice(0, 1)
    }

    if (list.length === 0) return null
    return list.length === 1 ? list[0] : list
}

// any target value → an fx target (entity | point | array)
FX.commands._resolveTarget = S.resolveTarget = function(v, player, server) {
    if (v == null) return null
    if (v === 'me') return player
    if (v === 'here') return { x: player.x, y: player.y, z: player.z, level: player.level }
    if (typeof v === 'string') {
        if (v === 'look' || v.indexOf('look:') === 0) {
            let d = 5
            if (v.length > 5) {
                let n = Number(v.substring(5))
                if (!isNaN(n) && n > 0) d = n
            }
            return FX.commands._lookPoint(player, d)
        }
        if (v.charAt(0) === '@') return resolveSelector(S.parseSelector(v), player, server)
        let p = findPlayerByNick(server, v)
        if (p != null) return p
        try { player.tell('§c[fx] unknown target: ' + v) } catch (err) {}
        return null
    }
    if (Array.isArray(v) && v.length >= 3) {
        let x = relCoord(v[0], player.x)
        let y = relCoord(v[1], player.y)
        let z = relCoord(v[2], player.z)
        if (x == null || y == null || z == null) {
            try { player.tell('§c[fx] bad coordinates: ' + v.join(',')) } catch (err) {}
            return null
        }
        return { x: x, y: y, z: z, level: player.level }
    }
    try { player.tell('§c[fx] bad target: ' + v) } catch (err) {}
    return null
}