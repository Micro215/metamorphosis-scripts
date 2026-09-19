// ============================================================================
//  fx.cmd.help — in-game help; clicking a piece of text fills the chat input
//  A line is an array of [text, color?, clickCommand?] parts.
// ============================================================================
let FX = global.libs.fx
let S = FX.cmd

let CH = null
try {
    let Comp = Java.loadClass('net.minecraft.network.chat.Component')
    let Style = Java.loadClass('net.minecraft.network.chat.Style')
    let Click = Java.loadClass('net.minecraft.network.chat.ClickEvent')
    let CF = Java.loadClass('net.minecraft.ChatFormatting')

    function clickOf(cmd) {
        try { return new Click(Click.Action.SUGGEST_COMMAND, cmd) }
        catch (err) { return Click.suggestCommand(cmd) }
    }

    CH = {
        txt: function(text, color, cmd) {
            let c = Comp.literal(String(text))
            let st = Style.EMPTY
            try { st = st.withColor(CF[color || 'WHITE']) } catch (err) {}
            if (cmd != null) {
                try { st = st.withClickEvent(clickOf(cmd)) } catch (err) {}
            }
            return c.withStyle(st)
        },
        row: function(parts) {
            let out = Comp.empty()
            for (let i = 0; i < parts.length; i++) {
                out.append(CH.txt(parts[i][0], parts[i][1], parts[i][2]))
            }
            return out
        },
        join: function(lines) {
            let out = Comp.empty()
            for (let i = 0; i < lines.length; i++) {
                if (i > 0) out.append(Comp.literal('\n'))
                out.append(CH.row(lines[i]))
            }
            return out
        },
    }
} catch (err) { CH = null }

var CODE = { GOLD: '6', YELLOW: 'e', GRAY: '7', WHITE: 'f', AQUA: 'b', DARK_GRAY: '8', RED: 'c' }

function plainLine(parts) {
    let out = ''
    for (let i = 0; i < parts.length; i++) {
        let p = parts[i]
        out += '§' + (CODE[p[1] || 'WHITE'] || 'f') + p[0] + '§r'
    }
    return out
}

function tellLines(player, lines) {
    if (player == null) {
        let plain = []
        for (let i = 0; i < lines.length; i++) plain.push(plainLine(lines[i]))
        console.info(plain.join('\n'))
        return
    }
    if (CH != null) {
        try { player.tell(CH.join(lines)); return } catch (err) {}
    }
    let plain = []
    for (let i = 0; i < lines.length; i++) plain.push(plainLine(lines[i]))
    player.tell(plain.join('\n'))
}

// /fx effect run <effect> ? — help for one effect
// /fx effect run <effect> ? — help for one effect
S.help = function(player, cmd) {
    if (player == null) return
    let base = '/fx effect run ' + cmd.name + ' '
    let lines = []
    lines.push([['/fx effect run ' + cmd.name, 'GOLD'], [' — ' + (cmd.usage || ''), 'GRAY']])
    lines.push([['syntax: key:value tokens — quote values with spaces: colors:\'1,0,0 0,1,0\'', 'DARK_GRAY']])

    if (cmd.opts != null && cmd.opts.length > 0) {
        lines.push([['options (click to insert):', 'GRAY']])
        for (let i = 0; i < cmd.opts.length; i++) {
            let o = cmd.opts[i]
            let t = o.type
            if (t === 'enum' && o.vals != null) t += ' [' + o.vals.join('|') + ']'
            let d = (o.def !== undefined && o.def !== null) ? (' = ' + o.def) : ''
            lines.push([[' ' + o.key, 'YELLOW', base + o.key + ':'], [' : ' + t + d, 'WHITE']])
        }
    }

    lines.push([['orientation: heading: tilt: facing: axis: to:<target> — default up; beam/burst follow your look', 'DARK_GRAY']])
    lines.push([['universal: target: from: to: offset: particle: particleSpeed: spread: repeat:N name: replace: viewDist: singleColor:', 'GRAY']])
    lines.push([['targets: me here look:8 x,y,z ~,~1,~ nick @s @p @a @r @e[type=,tag=,distance=..N,limit=N]', 'GRAY']])
    lines.push([['a run without repeat fires exactly once; repeat:N loops it', 'DARK_GRAY']])

    if (cmd.example != null) {
        lines.push([['example (click): ', 'GRAY'], [base + cmd.example, 'WHITE', base + cmd.example]])
    }
    tellLines(player, lines)
}

// /fx — the full effect list plus management commands
S.listAll = function(ctx) {
    let player = ctx.source ? ctx.source.player : ctx.player
    if (player == null) {
        console.info('[fx] effects: ' + Object.keys(FX.commands._cmds).sort().join(', '))
        return
    }
    let names = Object.keys(FX.commands._cmds).sort()
    let lines = []
    lines.push([['/fx effect run <effect> [key:value …]', 'GOLD'], ['  — /fx effect run <effect> ? for options', 'GRAY']])
    for (let i = 0; i < names.length; i++) {
        let c = FX.commands._cmds[names[i]]
        lines.push([[' ' + c.name, 'YELLOW', '/fx effect run ' + c.name + ' '],
                    [' — ' + (c.usage || ''), 'GRAY'],
                    ['  [?]', 'AQUA', '/fx effect run ' + c.name + ' ?']])
    }
    lines.push([['management:', 'GOLD'], [' stop stopAll count list stats settings', 'GRAY']])
    tellLines(player, lines)
}