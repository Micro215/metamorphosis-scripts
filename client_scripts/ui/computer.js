function theme() {
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

global.mmComputerReceive = null
global.mmPocketReceive = null
global.mmEncryptionLast = "§8◈ awaiting transmission..."
global.mmEncryptionReceive = null
global.mmComputerHistory = {}
global.mmEncryptionLines = {}
global.mmNetStatus = {}

global.mmReceiveHub = function(key) {
    if (global.mmComputerReceive) { try { global.mmComputerReceive(key) } catch (e) {} }
    if (global.mmPocketReceive) { try { global.mmPocketReceive(key) } catch (e) {} }
}

LDLibUI.block("computer", event => {
    let UI = global.ui
    let C = theme()

    let root = UI.root(280, 228, C.ROOT)

    UI.statusHeader(root, 6, 6, 268, C.HEADER, C.BORDER, "§f◈ COMPUTER TERMINAL", UI.posKey(event.pos))

    let term = UI.terminal(root, {
        x: 6, y: 30, w: 242, h: 170, maxLines: 15,
        historyName: "mmComputerHistory",
        upX: 250, upY: 30, btnW: 20, btnH: 20,
        downX: 250, downY: 180,
        inputX: 6, inputY: 206, inputW: 198, inputH: 16,
        sendX: 210, sendY: 206, sendW: 58, sendH: 16,
        sendLabel: "§8SEND »",
        channel: "mm_computer_command",
        pos: event.pos,
        colors: C
    })
    global.mmComputerReceive = term.receive

    event.success(root)
})

LDLibUI.block("disk_drive", event => {
    global.ui.moduleScreen(event, theme(), "disk_drive")
})

LDLibUI.block("encryption_protocol", event => {
    global.ui.moduleScreen(event, theme(), "encryption_protocol")
})

function jsLines(s) {
    let raw = String(s).split("\n")
    let out = []
    for (let i = 0; i < raw.length; i++) out.push(String(raw[i]))
    return out
}

function jsPosKey(b) {
    return Number(b.x) + "," + Number(b.y) + "," + Number(b.z)
}

NetworkEvents.dataReceived("mm_computer_response", event => {
    global.ui.handleResponse(event, "mmComputerHistory", "mmComputerReceive")
})

NetworkEvents.dataReceived("mm_encryption_response", event => {
    let payload = event.data
    if (!payload || !payload.data) return
    let d = payload.data
    if (d.message === undefined || !d.block) return

    let key = jsPosKey(d.block)
    if (!global.mmEncryptionLines || Array.isArray(global.mmEncryptionLines)) global.mmEncryptionLines = {}
    global.mmEncryptionLines[key] = jsLines(d.message)

    if (global.mmEncryptionReceive) global.mmEncryptionReceive(key)
})

NetworkEvents.dataReceived("mm_net_status", event => {
    let payload = event.data
    if (!payload || !payload.data) return
    let d = payload.data
    if (!d.block) return
    if (!global.mmNetStatus) global.mmNetStatus = {}
    global.mmNetStatus[jsPosKey(d.block)] = (d.status === undefined ? null : d.status)
})
