(function() {
    function broadcast(server, channel, payload) {
        if (!server) return
        let players = null
        try { players = server.players } catch (e) {}
        if (!players) return

        let sent = 0
        try {
            for (let i = 0; i < players.length; i++) {
                let p = players[i]
                if (!p) continue
                try { p.sendData(channel, payload); sent++ } catch (e) {}
            }
        } catch (err) {}
        if (sent > 0) return

        try {
            players.forEach(function(p) {
                if (!p) return
                try { p.sendData(channel, payload); sent++ } catch (e) {}
            })
        } catch (err2) {}
        if (sent > 0) return

        try {
            let n = players.size()
            for (let i = 0; i < n; i++) {
                let p = players.get(i)
                if (p) { try { p.sendData(channel, payload) } catch (e) {} }
            }
        } catch (err3) {}
    }

    function playerNames(server) {
        let names = []
        if (!server) return names
        let players = null
        try { players = server.players } catch (e) {}
        if (!players) return names

        try {
            for (let i = 0; i < players.length; i++) names.push(players[i].username)
        } catch (err) {}
        if (names.length > 0) return names

        try {
            players.forEach(function(p) { names.push(p.username) })
        } catch (err2) {}
        if (names.length > 0) return names

        try {
            let n = players.size()
            for (let i = 0; i < n; i++) names.push(players.get(i).username)
        } catch (err3) {}
        return names
    }
    global.mmEncryptionPush = function(server, message) {
        broadcast(server, "mm_encryption_response", {
            data: { message: String(message) }
        })
    }

    // ===== computer commands =====
    const computerCommands = {
        "hi": function(blockPos, player, args, server) {
            return [
                "§8=== §0COMPUTER §8===",
                "§8Position: §0[" + blockPos.x + ", " + blockPos.y + ", " + blockPos.z + "]",
                "§8Operator: §0" + player.username,
                "§8Args: §0" + (args.length > 0 ? args : "none")
            ].join("\n")
        },

        "help": function(blockPos, player, args, server) {
            return [
                "§8Available commands:",
                "§0  hi §8- position, operator, args",
                "§0  players §8- online players",
                "§0  say <msg> §8- message to all terminals",
                "§0  transmit <msg> §8- send to encryption protocols",
                "§0  clear §8- clear console"
            ].join("\n")
        },

        "players": function(blockPos, player, args, server) {
            let names = playerNames(server)
            return "§8Online §0[" + names.length + "]§8: §0" + (names.length > 0 ? names.join(", ") : "nobody")
        },

        "say": function(blockPos, player, args, server) {
            if (!args) return "§cUsage: say <message>"
            return "§8[" + player.username + "] §0" + args
        },

        "transmit": function(blockPos, player, args, server) {
            if (!args) return "§cUsage: transmit <message>"
            global.mmEncryptionPush(server, "§8◈ §0" + args)
            return "§8transmitted » §0" + args
        },

        "clear": function(blockPos, player, args, server) {
            return null
        }
    }

    function dispatch(event, commands, responseChannel) {
        let player = event.player
        let payload = event.data
        if (!payload || !payload.data) return

        let command = String(payload.data.command || "").trim()
        let blockPos = payload.data.blockPos || { x: 0, y: 0, z: 0 }
        if (command === "") return

        let spaceIdx = command.indexOf(" ")
        let name = (spaceIdx === -1 ? command : command.substring(0, spaceIdx)).toLowerCase()
        let args = spaceIdx === -1 ? "" : command.substring(spaceIdx + 1).trim()

        let handler = commands[name]
        if (!handler) {
            broadcast(event.server, responseChannel, {
                data: { error: "§cUnknown command: '" + name + "'. Type 'help'." }
            })
            return
        }

        try {
            if (name === "clear") {
                broadcast(event.server, responseChannel, { data: { action: "clear" } })
                return
            }
            let response = handler(blockPos, player, args, event.server)
            broadcast(event.server, responseChannel, { data: { response: response } })
        } catch (e) {
            broadcast(event.server, responseChannel, {
                data: { error: "§cCommand error: " + e }
            })
        }
    }

    NetworkEvents.dataReceived("mm_computer_command", function(event) {
        dispatch(event, computerCommands, "mm_computer_response")
    })

    // POCKET COMPUTER (admin item)
    function substituteVars(text, vars) {
        if (!vars) return text
        text = String(text)
        for (let i = 0; i < vars.length; i++) {
            let v = vars[i]
            if (v && v.name && v.value) {
                text = text.split("${" + v.name + "}").join(v.value)
                text = text.split("%" + v.name + "%").join(v.value)
            }
        }
        return text
    }

    NetworkEvents.dataReceived("mm_pocket_say", function(event) {
        let player = event.player
        let payload = event.data
        if (!payload || !payload.data) return

        let d = payload.data
        let text = substituteVars(String(d.text || "").trim(), d.vars)
        if (text === "") return

        let nick = String(d.nick || "").trim()
        let from = nick !== "" ? nick : player.username

        broadcast(event.server, "mm_computer_response", {
            data: { response: "§8[" + from + "] §0" + text }
        })
    })
})()

// ===== UI opening =====
BlockEvents.rightClicked("metamorphosis:computer", event => {
    if (event.player.isShiftKeyDown()) return
    BlockUIFactory.INSTANCE.openUI(event.player, event.block.pos, "computer")
    event.success(0)
})

BlockEvents.rightClicked("metamorphosis:disk_drive", event => {
    if (event.player.isShiftKeyDown()) return
    BlockUIFactory.INSTANCE.openUI(event.player, event.block.pos, "disk_drive")
    event.success(0)
})

BlockEvents.rightClicked("metamorphosis:encryption_protocol", event => {
    if (event.player.isShiftKeyDown()) return
    BlockUIFactory.INSTANCE.openUI(event.player, event.block.pos, "encryption_protocol")
    event.success(0)
})