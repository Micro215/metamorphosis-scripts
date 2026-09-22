(function() {
    const UI = global.ui
    const HISTORY_LIMIT = 100
    const HISTORY_KEYS = 64

    UI.color = function(rgba) {
        let u = rgba < 0 ? rgba + 4294967296 : rgba
        let r = Math.floor(u / 16777216) % 256
        let g = Math.floor(u / 65536) % 256
        let b = Math.floor(u / 256) % 256
        let a = u % 256
        let argb = a * 16777216 + r * 65536 + g * 256 + b
        return argb > 2147483647 ? argb - 4294967296 : argb
    }

    UI.posKey = function(pos) {
        return pos.x + "," + pos.y + "," + pos.z
    }

    function invokeBool(obj, substr, value) {
        try {
            let ms = obj.getClass().getMethods()
            for (let i = 0; i < ms.length; i++) {
                let m = ms[i]
                if (String(m.getName()).toLowerCase().indexOf(substr) < 0) continue
                let pts = m.getParameterTypes()
                if (pts.length !== 1 || String(pts[0].getSimpleName()) !== "boolean") continue
                try { m.invoke(obj, [value]); return true } catch (e1) {}
                try { m.invoke(obj, Java.to([value], "java.lang.Object[]")); return true } catch (e2) {}
            }
        } catch (e) {}
        return false
    }

    function tryNoShadow(obj) {
        let names = ["setShadow", "setDropShadow", "setHasShadow", "setDrawShadow"]
        for (let i = 0; i < names.length; i++) {
            try { obj[names[i]](false); return true } catch (e) {}
        }
        return invokeBool(obj, "shadow", false)
    }

    UI.noShadow = function(widget) {
        if (!widget) return widget
        if (tryNoShadow(widget)) return widget
        try {
            let tex = widget.getTexture()
            if (tex) tryNoShadow(tex)
        } catch (e) {}
        return widget
    }

    // ===== slot binding =====
    UI.enableSlot = function(slot) {
        let putNames = ["setCanPutItems", "canPutItems", "setCanPut", "setCanPutStack", "canPutStack"]
        let putOk = false
        for (let i = 0; i < putNames.length && !putOk; i++) {
            try { slot[putNames[i]](true); putOk = true } catch (e) {}
        }
        if (!putOk) putOk = invokeBool(slot, "put", true)

        let takeNames = ["setCanTakeItems", "canTakeItems", "setCanTake", "setCanTakeStack", "canTakeStack"]
        let takeOk = false
        for (let i = 0; i < takeNames.length && !takeOk; i++) {
            try { slot[takeNames[i]](true); takeOk = true } catch (e) {}
        }
        if (!takeOk) takeOk = invokeBool(slot, "take", true)
    }

    UI.bindSlot = function(slot, inv, index) {
        try { slot.setHandlerSlot(inv, index); return true } catch (e) {}
        try { slot.setContainerSlot(inv, index); return true } catch (e) {}
        return false
    }

    UI.beHandler = function(be) {
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

    // ===== text =====
    function plainText(s) {
        s = String(s)
        let out = ""
        for (let i = 0; i < s.length; i++) {
            if (s.charAt(i) === "§") { i++; continue }
            out += s.charAt(i)
        }
        return out
    }

    UI.textWidth = function(s) {
        return plainText(s).length * 6
    }

    UI.label = function(parent, x, y, text) {
        let l = new LabelWidget()
        l.setSelfPosition(x, y)
        l.setText(text)
        UI.noShadow(l)
        parent.addWidget(l)
        return l
    }

    UI.dynamicLabel = function(parent, x, y, supplier) {
        let l = new LabelWidget()
        l.setSelfPosition(x, y)
        l.setTextSupplier(supplier)
        UI.noShadow(l)
        parent.addWidget(l)
        return l
    }

    UI.text = function(str) {
        let t = new TextTexture(str)
        UI.noShadow(t)
        return t
    }

    // ===== drawing =====
    UI.root = function(w, h, color) {
        let root = new WidgetGroup()
        root.setSize(w, h)
        root.setBackground(new ColorRectTexture(color))
        return root
    }

    UI.rect = function(parent, x, y, w, h, color) {
        let r = new WidgetGroup()
        r.setSelfPosition(x, y)
        r.setSize(w, h)
        r.setBackground(new ColorRectTexture(color))
        parent.addWidget(r)
        return r
    }

    UI.panel = function(parent, x, y, w, h, bg, border) {
        UI.rect(parent, x, y, w, h, border)
        UI.rect(parent, x + 1, y + 1, w - 2, h - 2, bg)
    }

    UI.slotBg = function(parent, x, y, border, bg) {
        UI.rect(parent, x - 1, y - 1, 20, 20, border)
        UI.rect(parent, x, y, 18, 18, bg)
    }

    UI.btnFrame = function(parent, x, y, w, h, border) {
        UI.rect(parent, x - 1, y - 1, w + 2, h + 2, border)
    }

    UI.header = function(parent, x, y, w, bg, border, title, rightText) {
        UI.panel(parent, x, y, w, 18, bg, border)
        UI.label(parent, x + 8, y + 5, title)
        if (rightText) {
            UI.label(parent, x + w - 8 - UI.textWidth(rightText), y + 5, rightText)
        }
    }

    UI.statusHeader = function(parent, x, y, w, bg, border, title, statusKey) {
        UI.panel(parent, x, y, w, 18, bg, border)
        UI.label(parent, x + 8, y + 5, title)
        UI.dynamicLabel(parent, x + w - 94, y + 5, function() {
            return UI.netStatusText(statusKey)
        })
    }

    // ===== slot widgets =====
    UI.makeSlot = function(parent, inv, index, x, y, border, slotColor) {
        UI.slotBg(parent, x, y, border, slotColor)
        let slot = new SlotWidget()
        slot.setSelfPosition(x, y)
        if (UI.bindSlot(slot, inv, index)) {
            UI.enableSlot(slot)
            parent.addWidget(slot)
        }
    }

    UI.playerInventory = function(root, event, panelX, panelY, border, panelColor, slotColor) {
        UI.label(root, panelX + 2, panelY - 12, "§8Inventory")
        UI.panel(root, panelX, panelY, 166, 80, panelColor, border)

        let playerInv = null
        try { playerInv = event.player.getInventory() } catch (e) {}
        if (!playerInv) { try { playerInv = event.player.inventory } catch (e2) {} }

        if (playerInv) {
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 9; col++) {
                    UI.makeSlot(root, playerInv, 9 + row * 9 + col, panelX + 2 + col * 18, panelY + 2 + row * 18, border, slotColor)
                }
            }
            for (let col = 0; col < 9; col++) {
                UI.makeSlot(root, playerInv, col, panelX + 2 + col * 18, panelY + 60, border, slotColor)
            }
        }
    }

    UI.blockSlots = function(root, event, x0, y0, count, cols, border, slotColor) {
        let be = event.block ? event.block.entity : null
        let beInv = be ? be.inventory : null
        let beHandler = UI.beHandler(be)

        for (let i = 0; i < count; i++) {
            let x = x0 + (i % cols) * 18
            let y = y0 + Math.floor(i / cols) * 18

            UI.slotBg(root, x, y, border, slotColor)
            let slot = new SlotWidget()
            slot.setSelfPosition(x, y)

            let bound = false
            if (beHandler) {
                try { slot.setHandlerSlot(beHandler, i); bound = true } catch (e) {}
            }
            if (!bound && beInv) {
                bound = UI.bindSlot(slot, beInv, i)
            }
            if (bound) {
                UI.enableSlot(slot)
                root.addWidget(slot)
            }
        }
    }

    // ===== net status =====
    UI.netStatusText = function(key) {
        if (!global.mmNetStatus) global.mmNetStatus = {}
        let s = global.mmNetStatus[key]
        if (s === undefined) return ""
        if (s === null) return "§7OFFLINE"
        if (s.conflict) return "§cCONFLICT"
        return "§anet §8#" + Number(s.net) + " §8· §0" + Number(s.modules) + " §8mod"
    }

    // ===== modules screen factory =====
    UI.moduleScreen = function(event, C, name) {
        let def = global.mmModules ? global.mmModules[name] : null
        if (!def || !def.ui) return null
        let ui = def.ui

        let key = UI.posKey(event.pos)
        let root = UI.root(ui.w, ui.h, C.ROOT)

        let title = "§f◈ " + ui.title
        if (ui.status) UI.statusHeader(root, 6, 6, ui.w - 12, C.HEADER, C.BORDER, title, key)
        else UI.header(root, 6, 6, ui.w - 12, C.HEADER, C.BORDER, title)
        
        if (ui.note && !ui.console) {
            UI.label(root, Math.floor((ui.w - UI.textWidth(ui.note)) / 2), 34, ui.note)
        }

        if (ui.console) {
            let cc = ui.console
            let btnW = cc.btnW || 18
            let btnH = cc.btnH || 18

            let con = UI.console(root, {
                x: cc.x, y: cc.y, w: cc.w, h: cc.h, lines: cc.lines,
                getLines: function() {
                    if (cc.history === "encryption") {
                        let store = global.mmEncryptionLines
                        let arr = store ? store[key] : null
                        if (arr && arr.length > 0) return arr
                        return global.mmEncryptionLast.split("\n")
                    }
                    return []
                },
                upX: cc.x + cc.w + 6, upY: cc.y,
                downX: cc.x + cc.w + 6, downY: cc.y + cc.h - btnH,
                btnW: btnW, btnH: btnH,
                colors: C
            })

            if (cc.history === "encryption") {
                global.mmEncryptionReceive = function(rkey) {
                    if (rkey === undefined || rkey === key) con.reset()
                }
            }
        }

        let count = ui.slots || 0
        if (count > 0) {
            let cols = ui.slotCols || 1
            let rows = Math.ceil(count / cols)
            let gridW = cols * 18

            let captionAbove = ui.slotPanel !== "wide" && ui.slotCaption
            let panelY = (ui.console ? ui.console.y + ui.console.h + 6 : 30) + (captionAbove ? 12 : 0)

            if (ui.slotPanel === "wide") {
                UI.panel(root, 6, panelY, ui.w - 12, rows * 18 + 40, C.PANEL, C.BORDER)
                UI.blockSlots(root, event, Math.floor((ui.w - gridW) / 2), panelY + 10, count, cols, C.BORDER, C.SLOT)
                if (ui.slotCaption) {
                    UI.label(root, Math.floor((ui.w - UI.textWidth(ui.slotCaption)) / 2), panelY + 10 + rows * 18 + 6, ui.slotCaption)
                }
            } else {
                let panelW = gridW + 4
                let panelX = Math.floor((ui.w - panelW) / 2)
                if (ui.slotCaption) UI.label(root, panelX + 2, panelY - 12, ui.slotCaption)
                UI.panel(root, panelX, panelY, panelW, rows * 18 + 4, C.PANEL, C.BORDER)
                UI.blockSlots(root, event, panelX + 2, panelY + 2, count, cols, C.BORDER, C.SLOT)
            }
        }

        UI.playerInventory(root, event, Math.floor((ui.w - 166) / 2), ui.h - 86, C.BORDER, C.PANEL, C.SLOT)

        event.success(root)
        return root
    }

    // ===== console =====
    UI.history = function(name, key) {
        if (!global[name] || Array.isArray(global[name])) global[name] = {}
        let store = global[name]
        let k = key === undefined ? "_shared" : key
        if (!store[k]) {
            store[k] = []
            let keys = Object.keys(store)
            if (keys.length > HISTORY_KEYS) {
                for (let i = 0; i < keys.length - HISTORY_KEYS; i++) delete store[keys[i]]
            }
        }
        return store[k]
    }

    UI.handleResponse = function(event, historyName, receiveName, keyField) {
        let payload = event.data
        if (!payload || !payload.data) return

        let d = payload.data

        let key = "_shared"
        let k = d[keyField || "master"]
        if (k && k.x !== undefined) key = k.x + "," + k.y + "," + k.z

        if (d.action === "clear") {
            UI.history(historyName, key).length = 0
            let rcv = global[receiveName]
            if (rcv) rcv(key)
            return
        }

        let lines = []
        if (d.response) {
            let parts = String(d.response).split("\n")
            for (let i = 0; i < parts.length; i++) lines.push(parts[i])
        }
        if (d.error) {
            let parts = String(d.error).split("\n")
            for (let i = 0; i < parts.length; i++) lines.push(parts[i])
        }
        if (lines.length === 0) return

        let history = UI.history(historyName, key)
        for (let i = 0; i < lines.length; i++) history.push(lines[i])
        while (history.length > HISTORY_LIMIT) history.shift()

        let rcv = global[receiveName]
        if (rcv) rcv(key)
    }

    UI.console = function(root, cfg) {
        let C = cfg.colors
        UI.panel(root, cfg.x, cfg.y, cfg.w, cfg.h, C.CONSOLE, C.BORDER)

        let top = cfg.y + 4
        if (cfg.caption) {
            UI.label(root, cfg.x + 3, cfg.y + 4, cfg.caption)
            top = cfg.y + 16
        }

        let offset = 0

        for (let i = 0; i < cfg.lines; i++) {
            let lineIndex = i
            UI.dynamicLabel(root, cfg.x + 3, top + i * 11, function() {
                let lines = cfg.getLines()
                let start = lines.length - cfg.lines - offset
                if (start < 0) start = 0
                let idx = start + lineIndex
                if (idx >= 0 && idx < lines.length) return lines[idx]
                return ""
            })
        }

        let scrollUp = new ButtonWidget()
        scrollUp.setSelfPosition(cfg.upX, cfg.upY)
        scrollUp.setSize(cfg.btnW, cfg.btnH)
        scrollUp.setButtonTexture(new ColorRectTexture(C.BUTTON), UI.text("§8▲"))
        scrollUp.setOnPressCallback(function(clickData) {
            if (clickData && clickData.isRemote) return
            let lines = cfg.getLines()
            if (offset < lines.length - cfg.lines) offset++
        })
        root.addWidget(scrollUp)

        let scrollDown = new ButtonWidget()
        scrollDown.setSelfPosition(cfg.downX, cfg.downY)
        scrollDown.setSize(cfg.btnW, cfg.btnH)
        scrollDown.setButtonTexture(new ColorRectTexture(C.BUTTON), UI.text("§8▼"))
        scrollDown.setOnPressCallback(function(clickData) {
            if (clickData && clickData.isRemote) return
            if (offset > 0) offset--
        })
        root.addWidget(scrollDown)

        return { reset: function() { offset = 0 } }
    }

    UI.terminal = function(root, cfg) {
        let C = cfg.colors
        let keyOf = cfg.keySupplier
            ? cfg.keySupplier
            : (cfg.pos
                ? function() { return UI.posKey(cfg.pos) }
                : function() { return "_shared" })

        let con = UI.console(root, {
            x: cfg.x, y: cfg.y, w: cfg.w, h: cfg.h, lines: cfg.maxLines,
            getLines: function() { return UI.history(cfg.historyName, keyOf()) },
            upX: cfg.upX, upY: cfg.upY, downX: cfg.downX, downY: cfg.downY,
            btnW: cfg.btnW, btnH: cfg.btnH,
            colors: C
        })

        UI.rect(root, cfg.inputX, cfg.inputY, cfg.inputW, cfg.inputH, C.INPUT)

        let currentCommand = ""
        let inputField = new TextFieldWidget()
        inputField.setSelfPosition(cfg.inputX, cfg.inputY)
        inputField.setSize(cfg.inputW, cfg.inputH)
        inputField.setBordered(true)
        inputField.setTextColor(0xFFFFFF)
        inputField.setMaxStringLength(100)
        inputField.setTextSupplier(function() { return currentCommand })
        inputField.setTextResponder(function(newText) { currentCommand = newText })
        root.addWidget(inputField)

        UI.btnFrame(root, cfg.sendX, cfg.sendY, cfg.sendW, cfg.sendH, C.BORDER)

        let sendButton = new ButtonWidget()
        sendButton.setSelfPosition(cfg.sendX, cfg.sendY)
        sendButton.setSize(cfg.sendW, cfg.sendH)
        sendButton.setButtonTexture(new ColorRectTexture(C.BUTTON), UI.text(cfg.sendLabel))
        sendButton.setOnPressCallback(function(clickData) {
            if (clickData && clickData.isRemote) return
            sendCommand()
        })
        root.addWidget(sendButton)

        function addLines(lines) {
            let history = UI.history(cfg.historyName, keyOf())
            for (let i = 0; i < lines.length; i++) history.push(lines[i])
            while (history.length > HISTORY_LIMIT) history.shift()
            con.reset()
        }

        function sendCommand() {
            let command = currentCommand.trim()
            if (command === "") return
            if (!cfg.noEcho) addLines(["§8» §0" + command])
            currentCommand = ""

            let payload
            if (cfg.buildPayload) {
                payload = cfg.buildPayload(command)
            } else {
                payload = { command: command }
                if (cfg.pos) {
                    payload.blockPos = { x: cfg.pos.x, y: cfg.pos.y, z: cfg.pos.z }
                }
            }

            Client.player.sendData(cfg.channel, { data: payload })
        }

        function receive(key) {
            let myKey = keyOf()
            if (key === undefined || key === "_shared" || key === myKey) con.reset()
        }

        return { addLines: addLines, reset: con.reset, receive: receive }
    }

    // ===== controls =====
    UI.button = function(parent, x, y, w, h, bg, border, label, onClick) {
        UI.btnFrame(parent, x, y, w, h, border)
        let btn = new ButtonWidget()
        btn.setSelfPosition(x, y)
        btn.setSize(w, h)
        btn.setButtonTexture(new ColorRectTexture(bg), UI.text(label))
        if (onClick) btn.setOnPressCallback(onClick)
        parent.addWidget(btn)
        return btn
    }
    UI.field = function(parent, x, y, w, h, stripColor, textColor, maxLength, supplier, responder) {
        // UI.rect(parent, x, y, w, h, stripColor)
        let field = new TextFieldWidget()
        field.setSelfPosition(x, y)
        field.setSize(w, h)
        field.setBordered(true)
        field.setTextColor(textColor)
        field.setMaxStringLength(maxLength)
        field.setTextSupplier(supplier)
        field.setTextResponder(responder)
        parent.addWidget(field)
        return field
    }
})()