function pocketTheme() {
    let c = global.ui.color
    return {
        ROOT:    c(0xE2E2E8FF), // window background
        BORDER:  c(0x5C5C66FF), // frames
        PANEL:   c(0xEFEFF3FF), // panels
        SLOT:    c(0xF9F9FBFF), // slot background
        CONSOLE: c(0xF4F4F7FF), // console background
        BUTTON:  c(0xD6D6DDFF), // button background
        HEADER:  c(0x2B2B33FF), // dark header
        INPUT:   c(0x26262EFF)  // dark input strips
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

LDLibUI.item("pocket_computer", event => {
    let UI = global.ui
    let C = pocketTheme()

    let root = UI.root(400, 218, C.ROOT)

    UI.header(root, 6, 6, 388, C.HEADER, C.BORDER, "§f◈ POCKET TERMINAL", "§a◆ §7ADMIN")

    // ===== terminal =====
    let term = UI.terminal(root, {
        x: 6, y: 30, w: 234, h: 160, maxLines: 14,
        historyName: "mmComputerHistory",
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
    global.mmComputerReceive = term.addLines

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