function bmoonTheme() {
    let c = global.ui.color
    return {
        ROOT:       c(0x1D1D1DFF),
        BORDER:     c(0xA3A3A3FF),
        PANEL:      c(0x101010FF),
        SLOT:       c(0x060606FF),
        CONSOLE:    c(0x0B0B0BFF),
        BUTTON:     c(0x292929FF),
        HEADER:     c(0xD4D4D4FF),
        INPUT:      c(0xD9D9D9FF),
        INPUT_TEXT: c(0xFFFFFFFF)
    }
}

// ===== state =====
global.bmoonData = {
    pages: [
        { commands: new Array(8).fill("") }
    ],
    variables: [
        { name: "", value: "" },
        { name: "", value: "" },
        { name: "", value: "" },
        { name: "", value: "" }
    ],
    currentPage: 0
}

global.bmoonQueue = []
global.bmoonNextTick = 0
global.bmoonCurrentTick = 0
global.bmoonIsExecuting = false
global.bmoonLastAction = 0

LDLibUI.item("bmoon", event => {
    let UI = global.ui
    let C = bmoonTheme()

    let root = UI.root(280, 380, C.ROOT)

    UI.header(root, 6, 6, 268, C.HEADER, C.BORDER, "§0◈ BMOON SEQUENCER")

    UI.dynamicLabel(root, 212, 11, function() {
        return global.bmoonIsExecuting ? "§2◆ §0RUNNING" : "§8IDLE"
    })

    // ===== page navigation =====
    UI.button(root, 6, 30, 60, 18, C.BUTTON, C.BORDER, "§7« PREV", function() {
        if (!canClick()) return
        if (global.bmoonData.currentPage > 0) global.bmoonData.currentPage--
    })

    UI.dynamicLabel(root, 109, 35, function() {
        return "§7PAGE §f" + (global.bmoonData.currentPage + 1) + "§7/§f" + global.bmoonData.pages.length
    })

    UI.button(root, 212, 30, 60, 18, C.BUTTON, C.BORDER, "§7NEXT »", function() {
        if (!canClick()) return
        if (global.bmoonData.currentPage < global.bmoonData.pages.length - 1) global.bmoonData.currentPage++
    })

    // ===== command rows =====
    UI.label(root, 10, 54, "§7SEQUENCE")

    for (let i = 0; i < 8; i++) {
        let cmdIndex = i
        let y = 66 + i * 22

        UI.label(root, 10, y + 5, "§7" + (i + 1) + ".")

        UI.field(root, 30, y, 240, 20, C.INPUT, C.INPUT_TEXT, 256,
            function() {
                return global.bmoonData.pages[global.bmoonData.currentPage].commands[cmdIndex] || ""
            },
            function(newText) {
                global.bmoonData.pages[global.bmoonData.currentPage].commands[cmdIndex] = newText
            })
    }

    // ===== variables =====
    UI.label(root, 10, 248, "§7VARIABLES")

    for (let i = 0; i < 4; i++) {
        let varIndex = i
        let y = 262 + i * 22

        UI.field(root, 10, y, 110, 20, C.INPUT, C.INPUT_TEXT, 32,
            function() { return global.bmoonData.variables[varIndex].name || "" },
            function(newText) { global.bmoonData.variables[varIndex].name = newText })

        UI.label(root, 124, y + 5, "§7=")

        UI.field(root, 134, y, 140, 20, C.INPUT, C.INPUT_TEXT, 128,
            function() { return global.bmoonData.variables[varIndex].value || "" },
            function(newText) { global.bmoonData.variables[varIndex].value = newText })
    }

    // ===== actions =====
    UI.button(root, 6, 356, 84, 18, C.BUTTON, C.BORDER, "§aRUN PAGE", function() {
        if (!canClick()) return
        runPage()
    })

    UI.button(root, 96, 356, 84, 18, C.BUTTON, C.BORDER, "§cCLEAR", function() {
        if (!canClick()) return
        global.bmoonData.pages[global.bmoonData.currentPage].commands = new Array(8).fill("")
    })

    UI.button(root, 186, 356, 86, 18, C.BUTTON, C.BORDER, "§7ADD PAGE", function() {
        if (!canClick()) return
        if (global.bmoonData.pages.length < 10) {
            global.bmoonData.pages.push({ commands: new Array(8).fill("") })
        }
    })

    function canClick() {
        if (global.bmoonCurrentTick - global.bmoonLastAction < 2) return false
        global.bmoonLastAction = global.bmoonCurrentTick
        return true
    }

    function runPage() {
        if (global.bmoonIsExecuting) return

        global.bmoonQueue = []
        global.bmoonNextTick = 0
        global.bmoonIsExecuting = true

        let totalCommands = 0
        let page = global.bmoonData.pages[global.bmoonData.currentPage]

        for (let c = 0; c < page.commands.length; c++) {
            let cmd = page.commands[c]
            if (cmd && cmd.trim() !== "") {
                let processedCmd = cmd.trim()

                for (let v = 0; v < global.bmoonData.variables.length; v++) {
                    let var_ = global.bmoonData.variables[v]
                    if (var_.name && var_.value) {
                        processedCmd = processedCmd.split("${" + var_.name + "}").join(var_.value)
                        processedCmd = processedCmd.split("%" + var_.name + "%").join(var_.value)
                    }
                }

                if (processedCmd.toLowerCase().startsWith("sleep(") && processedCmd.endsWith(")")) {
                    let seconds = parseFloat(processedCmd.substring(6, processedCmd.length - 1)) || 1
                    global.bmoonQueue.push({ type: "sleep", ticks: Math.floor(seconds * 20) })
                } else {
                    global.bmoonQueue.push({ type: "command", command: processedCmd })
                    totalCommands++
                }
            }
        }

        if (totalCommands === 0) global.bmoonIsExecuting = false
    }

    event.success(root)
})

// ===== execution loop =====
ClientEvents.tick(event => {
    global.bmoonCurrentTick++

    if (!global.bmoonIsExecuting) return
    if (global.bmoonQueue.length === 0) return

    if (global.bmoonCurrentTick >= global.bmoonNextTick) {
        let item = global.bmoonQueue.shift()

        if (item && item.type === "sleep") {
            global.bmoonNextTick = global.bmoonCurrentTick + item.ticks
        } else if (item && item.type === "command") {
            try {
                Client.runCommand(item.command)
            } catch (e) {
                console.error("BMoon Error: " + e)
            }
            global.bmoonNextTick = global.bmoonCurrentTick + 5
        }

        if (global.bmoonQueue.length === 0) {
            global.bmoonIsExecuting = false
        }
    }
})