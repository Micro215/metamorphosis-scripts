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

global.mmComputerHistory = []
global.mmComputerReceive = null

global.mmEncryptionLast = "§8◈ awaiting transmission..."
global.mmEncryptionLines = global.mmEncryptionLast.split("\n")
global.mmEncryptionReceive = null

// ============================================================
// computer
// ============================================================
LDLibUI.block("computer", event => {
    let UI = global.ui
    let C = theme()

    let root = UI.root(280, 228, C.ROOT)

    UI.header(root, 6, 6, 268, C.HEADER, C.BORDER, "§f◈ COMPUTER TERMINAL")

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
    global.mmComputerReceive = term.addLines

    event.success(root)
})

// ============================================================
// disk drive
// ============================================================
LDLibUI.block("disk_drive", event => {
    let UI = global.ui
    let C = theme()

    let root = UI.root(210, 194, C.ROOT)

    UI.header(root, 6, 6, 198, C.HEADER, C.BORDER, "§f◈ DISK DRIVE")

    // drive slot (block slot 0)
    UI.panel(root, 6, 30, 198, 58, C.PANEL, C.BORDER)
    UI.blockSlots(root, event, 96, 40, 1, 1, C.BORDER, C.SLOT)

    UI.label(root, 60, 64, "§8— INSERT DISK —")

    UI.playerInventory(root, event, 22, 108, C.BORDER, C.PANEL, C.SLOT)

    event.success(root)
})

// ============================================================
// encryption protocol
// ============================================================
LDLibUI.block("encryption_protocol", event => {
    let UI = global.ui
    let C = theme()

    let root = UI.root(250, 328, C.ROOT)

    UI.header(root, 6, 6, 238, C.HEADER, C.BORDER, "§f◈ ENCRYPTION PROTOCOL")

    let con = UI.console(root, {
        x: 6, y: 30, w: 210, h: 120, lines: 9,
        getLines: function() { return global.mmEncryptionLines || [] },
        upX: 222, upY: 30, btnW: 18, btnH: 18,
        downX: 222, downY: 132,
        colors: C
    })
    global.mmEncryptionReceive = con.reset

    UI.label(root, 44, 156, "§8◈ PROTOCOL MATRIX")
    UI.panel(root, 42, 168, 166, 58, C.PANEL, C.BORDER)
    UI.blockSlots(root, event, 44, 170, 27, 9, C.BORDER, C.SLOT)

    UI.playerInventory(root, event, 42, 242, C.BORDER, C.PANEL, C.SLOT)

    event.success(root)
})

// ===== network =====
NetworkEvents.dataReceived("mm_computer_response", function(event) {
    global.ui.handleResponse(event, "mmComputerHistory", "mmComputerReceive")
})

NetworkEvents.dataReceived("mm_encryption_response", function(event) {
    let payload = event.data
    if (!payload || !payload.data) return
    if (payload.data.message !== undefined) {
        global.mmEncryptionLast = String(payload.data.message)
        global.mmEncryptionLines = global.mmEncryptionLast.split("\n")
        if (global.mmEncryptionReceive) global.mmEncryptionReceive()
    }
})