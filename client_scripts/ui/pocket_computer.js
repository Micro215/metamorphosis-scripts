function pocketTheme() {
    let c = global.ui.color
    return {
        ROOT:    c(0xE2E2E8FF),
        BORDER:  c(0x5C5C66FF),
        PANEL:   c(0xEFEFF3FF),
        SLOT:    c(0xF9F9FBFF),
        CONSOLE: c(0xF4F4F7FF),
        BUTTON:  c(0xD6D6DDFF),
        HEADER:  c(0x2B2B33FF),
        INPUT:   c(0x26262EFF)
    }
}

global.mmPocketVars = [
    { name: "nick", value: "" },
    { name: "", value: "" },
    { name: "", value: "" },
    { name: "", value: "" },
    { name: "", value: "" },
    { name: "", value: "" }
]

global.mmPocketLink = null
global.mmPocketReceive = null

LDLibUI.item("pocket_computer", event => {
    let UI = global.ui
    let C = pocketTheme()

    let root = UI.root(400, 218, C.ROOT)

    UI.panel(root, 6, 6, 388, 18, C.HEADER, C.BORDER)
    UI.label(root, 14, 11, "§f◈ POCKET TERMINAL")
    UI.dynamicLabel(root, 248, 11, function() {
        let L = global.mmPocketLink
        if (!L) return "§7◇ no link"
        if (L.conflict) return "§c◆ CONFLICT"
        if (!L.hasComms) return "§7◆ net §8#" + L.net + " §7· no comms"
        return "§a◆ §7net §8#" + L.net
    })

    Client.player.sendData("mm_pocket_open", { data: {} })

    // placeholder
    let ph = UI.history("mmComputerHistory", "_pocket")
    if (ph.length === 0) ph.push("§8◈ no network in range §8(32 blocks)")

    let term = UI.terminal(root, {
        x: 6, y: 30, w: 234, h: 160, maxLines: 14,
        historyName: "mmComputerHistory",
        keySupplier: function() {
            return (global.mmPocketLink && global.mmPocketLink.master) ? global.mmPocketLink.master : "_pocket"
        },
        noEcho: true,
        upX: 240, upY: 30, btnW: 18, btnH: 18,
        downX: 240, downY: 172,
        inputX: 6, inputY: 196, inputW: 204, inputH: 16,
        sendX: 212, sendY: 196, sendW: 46, sendH: 16,
        sendLabel: "§8SEND »",
        channel: "mm_pocket_say",
        buildPayload: function(command) {
            let nick = ""
            let vars = []
            for (let i = 0; i < global.mmPocketVars.length; i++) {
                let v = global.mmPocketVars[i]
                if (!v.name || v.name.trim() === "") continue
                let name = v.name.trim()
                if (name.toLowerCase() === "nick") nick = String(v.value || "").trim()
                vars.push({ name: name, value: String(v.value || "") })
            }
            return { text: command, nick: nick, vars: vars }
        },
        colors: C
    })
    global.mmPocketReceive = term.receive

    // ===== variables (right) =====
    UI.panel(root, 262, 30, 132, 160, C.PANEL, C.BORDER)
    UI.label(root, 265, 34, "§8VARIABLES")

    for (let i = 0; i < global.mmPocketVars.length; i++) {
        let varIndex = i
        let y = 48 + i * 22

        UI.field(root, 265, y, 44, 16, C.INPUT, 0xFFFFFF, 16,
            function() { return global.mmPocketVars[varIndex].name },
            function(newText) { global.mmPocketVars[varIndex].name = newText })

        UI.field(root, 313, y, 77, 16, C.INPUT, 0xFFFFFF, 64,
            function() { return global.mmPocketVars[varIndex].value },
            function(newText) { global.mmPocketVars[varIndex].value = newText })
    }

    UI.label(root, 265, 178, "§8${name} §7/ §8%name%")

    event.success(root)
})

// ===== network =====
function jsLines(s) {
    let raw = String(s).split("\n")
    let out = []
    for (let i = 0; i < raw.length; i++) out.push(String(raw[i]))
    return out
}

NetworkEvents.dataReceived("mm_pocket_net", event => {
    let payload = event.data
    if (!payload || !payload.data) return
    let d = payload.data

    if (!d.master) {
        global.mmPocketLink = null
        return
    }

    global.mmPocketLink = {
        master: Number(d.master.x) + "," + Number(d.master.y) + "," + Number(d.master.z),
        net: Number(d.net),
        hasComms: !!d.hasComms,
        conflict: !!d.conflict
    }
})

NetworkEvents.dataReceived("mm_pocket_response", event => {
    let payload = event.data
    if (!payload || !payload.data) return
    let d = payload.data
    if (d.error === undefined) return

    let key = (global.mmPocketLink && global.mmPocketLink.master) ? global.mmPocketLink.master : "_pocket"
    let h = global.ui.history("mmComputerHistory", key)
    let lines = jsLines(d.error)
    for (let i = 0; i < lines.length; i++) h.push(lines[i])
    while (h.length > 100) h.shift()

    if (global.mmReceiveHub) global.mmReceiveHub(key)
})