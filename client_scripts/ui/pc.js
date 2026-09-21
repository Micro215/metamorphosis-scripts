// ===== Console state  =====
global.pcConsoleHistory = []
global.pcReceive = null

const PC_MAX_LINES = 13
const PC_HISTORY_LIMIT = 100

// ============================================================
// Slot helpers (LDLib 1.0.x compatibility)
// ============================================================
function pcReflectBool(slot, substr, value) {
    try {
        let ms = slot.getClass().getMethods()
        for (let i = 0; i < ms.length; i++) {
            let m = ms[i]
            if (String(m.getName()).toLowerCase().indexOf(substr) < 0) continue
            let pts = m.getParameterTypes()
            if (pts.length !== 1 || String(pts[0].getSimpleName()) !== "boolean") continue
            try { m.invoke(slot, [value]); return true } catch (e1) {}
            try { m.invoke(slot, Java.to([value], "java.lang.Object[]")); return true } catch (e2) {}
        }
    } catch (e) {}
    return false
}

function pcEnableSlot(slot) {
    let putNames = ["setCanPutItems", "canPutItems", "setCanPut", "setCanPutStack", "canPutStack"]
    let putOk = false
    for (let i = 0; i < putNames.length && !putOk; i++) {
        try { slot[putNames[i]](true); putOk = true } catch (e) {}
    }
    if (!putOk) putOk = pcReflectBool(slot, "put", true)

    let takeNames = ["setCanTakeItems", "canTakeItems", "setCanTake", "setCanTakeStack", "canTakeStack"]
    let takeOk = false
    for (let i = 0; i < takeNames.length && !takeOk; i++) {
        try { slot[takeNames[i]](true); takeOk = true } catch (e) {}
    }
    if (!takeOk) takeOk = pcReflectBool(slot, "take", true)
}

function pcBindSlot(slot, inv, index) {
    try { slot.setHandlerSlot(inv, index); return true } catch (e) {}
    try { slot.setContainerSlot(inv, index); return true } catch (e) {}
    return false
}

function pcBEHandler(be) {
    if (!be) return null
    try {
        let caps = Java.loadClass("net.minecraftforge.common.capabilities.ForgeCapabilities")
        let lazy = null
        try { lazy = be.getCapability(caps.ITEM_HANDLER) } catch (e1) {}
        if (!lazy) { try { lazy = be.getCapability(caps.ITEM_HANDLER, null) } catch (e2) {} }
        if (lazy) {
            try {
                let opt = lazy.resolve()
                if (opt && opt.isPresent()) return opt.get()
            } catch (e3) {}
            try {
                let h = lazy.orElse(null)
                if (h) return h
            } catch (e4) {}
        }
    } catch (e) {}
    return null
}

// ============================================================
// Colors (RGBA format: 0xRRGGBBAA)
// ============================================================
const PC_COL_ROOT    = 0x1A1A2EFF // window background
const PC_COL_BORDER  = 0x4A4A7EFF // frames
const PC_COL_PANEL   = 0x12122EFF // panel background
const PC_COL_SLOT    = 0x0A0A1EFF // slot background
const PC_COL_CONSOLE = 0x0F3460FF // console background
const PC_COL_BUTTON  = 0x0F3460FF // button background

// ============================================================
// UI helpers
// ============================================================
function pcPanel(parent, x, y, w, h, bg) {
    let outer = new WidgetGroup()
    outer.setSelfPosition(x, y)
    outer.setSize(w, h)
    outer.setBackground(new ColorRectTexture(PC_COL_BORDER))
    parent.addWidget(outer)

    let inner = new WidgetGroup()
    inner.setSelfPosition(x + 1, y + 1)
    inner.setSize(w - 2, h - 2)
    inner.setBackground(new ColorRectTexture(bg))
    parent.addWidget(inner)
}

function pcSlotBg(parent, x, y) {
    let f = new WidgetGroup()
    f.setSelfPosition(x - 1, y - 1)
    f.setSize(20, 20)
    f.setBackground(new ColorRectTexture(PC_COL_BORDER))
    parent.addWidget(f)

    let b = new WidgetGroup()
    b.setSelfPosition(x, y)
    b.setSize(18, 18)
    b.setBackground(new ColorRectTexture(PC_COL_SLOT))
    parent.addWidget(b)
}

function pcBtnFrame(parent, x, y, w, h) {
    let f = new WidgetGroup()
    f.setSelfPosition(x - 1, y - 1)
    f.setSize(w + 2, h + 2)
    f.setBackground(new ColorRectTexture(PC_COL_BORDER))
    parent.addWidget(f)
}

function pcMakeSlot(parent, inv, index, x, y) {
    pcSlotBg(parent, x, y)
    let slot = new SlotWidget()
    slot.setSelfPosition(x, y)
    if (pcBindSlot(slot, inv, index)) {
        pcEnableSlot(slot)
        parent.addWidget(slot)
    }
}

// ============================================================
// UI (260 x 300)
// ============================================================
LDLibUI.block("pc", event => {
    let root = new WidgetGroup()
    root.setSize(260, 300)
    root.setBackground(new ColorRectTexture(PC_COL_ROOT))

    // ===== Title =====
    let titleLabel = new LabelWidget()
    titleLabel.setSelfPosition(102, 4)
    titleLabel.setText("§8PC §7Terminal")
    root.addWidgets(titleLabel)

    // ===== Console panel =====
    pcPanel(root, 34, 16, 190, 152, PC_COL_CONSOLE)

    let consoleOffset = 0

    for (let i = 0; i < PC_MAX_LINES; i++) {
        let lineIndex = i
        let line = new LabelWidget()
        line.setSelfPosition(37, 20 + i * 11)
        line.setTextSupplier(function() {
            let total = global.pcConsoleHistory.length
            let start = total - PC_MAX_LINES - consoleOffset
            if (start < 0) start = 0
            let idx = start + lineIndex
            if (idx >= 0 && idx < total) return global.pcConsoleHistory[idx]
            return ""
        })
        root.addWidget(line)
    }

    // ===== Scroll buttons =====
    // pcBtnFrame(root, 10, 16, 20, 20)
    let scrollUp = new ButtonWidget()
    scrollUp.setSelfPosition(10, 16)
    scrollUp.setSize(20, 20)
    scrollUp.setButtonTexture(new TextTexture("§7▲"))
    root.addWidgets(scrollUp)

    // pcBtnFrame(root, 10, 148, 20, 20)
    let scrollDown = new ButtonWidget()
    scrollDown.setSelfPosition(10, 148)
    scrollDown.setSize(20, 20)
    scrollDown.setButtonTexture(new TextTexture("§7▼"))
    root.addWidgets(scrollDown)

    // ===== PC storage: vertical column of 9 slots =====
    pcPanel(root, 232, 16, 22, 166, PC_COL_PANEL)

    let be = event.block.entity
    let beInv = be ? be.inventory : null
    let beHandler = pcBEHandler(be)

    for (let i = 0; i < 9; i++) {
        let x = 234
        let y = 18 + i * 18

        pcSlotBg(root, x, y)
        let slot = new SlotWidget()
        slot.setSelfPosition(x, y)

        let bound = false
        if (beHandler) {
            try { slot.setHandlerSlot(beHandler, i); bound = true } catch (e) {}
        }
        if (!bound && beInv) {
            bound = pcBindSlot(slot, beInv, i)
        }
        if (bound) {
            pcEnableSlot(slot)
            root.addWidget(slot)
        }
    }

    // ===== Input field + Send button =====
    let currentCommand = ""

    let inputField = new TextFieldWidget()
    inputField.setSelfPosition(34, 174)
    inputField.setSize(156, 14)
    inputField.setBordered(true)
    inputField.setTextColor(0xFFFFFF)
    inputField.setMaxStringLength(100)
    inputField.setTextSupplier(function() { return currentCommand })
    inputField.setTextResponder(function(newText) { currentCommand = newText })
    root.addWidgets(inputField)

    pcBtnFrame(root, 194, 174, 30, 14)
    let sendButton = new ButtonWidget()
    sendButton.setSelfPosition(194, 174)
    sendButton.setSize(30, 14)
    sendButton.setButtonTexture(new ColorRectTexture(PC_COL_BUTTON), new TextTexture("§aSend"))
    root.addWidgets(sendButton)

    // ===== Player inventory =====
    let invTitle = new LabelWidget()
    invTitle.setSelfPosition(47, 202)
    invTitle.setText("§8Inventory:")
    root.addWidgets(invTitle)

    pcPanel(root, 47, 214, 166, 80, PC_COL_PANEL)

    let playerInv = null
    try { playerInv = event.player.getInventory() } catch (e) {}
    if (!playerInv) { try { playerInv = event.player.inventory } catch (e2) {} }

    if (playerInv) {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 9; col++) {
                pcMakeSlot(root, playerInv, 48 + row * 9 + col, 49 + col * 18, 216 + row * 18)
            }
        }

        for (let col = 0; col < 9; col++) {
            pcMakeSlot(root, playerInv, col, 49 + col * 18, 274)
        }
    }

    // ===== Console logic =====
    function addLines(lines) {
        for (let i = 0; i < lines.length; i++) {
            global.pcConsoleHistory.push(lines[i])
        }
        while (global.pcConsoleHistory.length > PC_HISTORY_LIMIT) {
            global.pcConsoleHistory.shift()
        }
        consoleOffset = 0
    }

    global.pcReceive = addLines

    scrollUp.setOnPressCallback(function(clickData) {
        if (clickData && clickData.isRemote) return
        if (consoleOffset < global.pcConsoleHistory.length - PC_MAX_LINES) consoleOffset++
    })

    scrollDown.setOnPressCallback(function(clickData) {
        if (clickData && clickData.isRemote) return
        if (consoleOffset > 0) consoleOffset--
    })

    function sendCommand() {
        let command = currentCommand.trim()
        if (command === "") return
        addLines(["§7> §f" + command])
        currentCommand = ""

        Client.player.sendData("pc_execute_command", {
            data: {
                command: command,
                blockPos: { x: event.pos.x, y: event.pos.y, z: event.pos.z }
            }
        })
    }

    sendButton.setOnPressCallback(function(clickData) {
        if (clickData && clickData.isRemote) return
        sendCommand()
    })

    event.success(root)
})

// ===== Server response handler =====
NetworkEvents.dataReceived("pc_command_response", function(event) {
    let payload = event.data
    if (!payload || !payload.data) return

    let d = payload.data

    if (d.action === "clear") {
        global.pcConsoleHistory = []
        if (global.pcReceive) global.pcReceive([])
        return
    }

    let lines = []
    if (d.response) {
        let parts = String(d.response).split("\n")
        for (let i = 0; i < parts.length; i++) lines.push(parts[i])
    }
    if (d.error) lines.push("§c" + d.error)
    if (lines.length > 0 && global.pcReceive) global.pcReceive(lines)
})