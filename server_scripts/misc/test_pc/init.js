(function() {
    const commands = {
        "hi": function(blockPos, player, args) {
            return [
                "§a=== PC Info ===",
                "§7Position: §f[" + blockPos.x + ", " + blockPos.y + ", " + blockPos.z + "]",
                "§7Player: §f" + player.username,
                "§7Args: §f" + (args.length > 0 ? args : "none")
            ].join("\n")
        },

        "help": function(blockPos, player, args) {
            return [
                "§aAvailable commands:",
                "§f  hi §7- block position, player, args",
                "§f  help §7- this list",
                "§f  clear §7- clear console"
            ].join("\n")
        },

        "clear": function(blockPos, player, args) {
            return null
        }
    }

    NetworkEvents.dataReceived("pc_execute_command", function(event) {
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
            player.sendData("pc_command_response", {
                data: { error: "Unknown command: '" + name + "'. Type 'help'." }
            })
            return
        }

        try {
            if (name === "clear") {
                player.sendData("pc_command_response", { data: { action: "clear" } })
                return
            }
            let response = handler(blockPos, player, args)
            player.sendData("pc_command_response", { data: { response: response } })
        } catch (e) {
            player.sendData("pc_command_response", {
                data: { error: "Command error: " + e }
            })
        }
    })

})()

BlockEvents.rightClicked("kubejs:pc", event => {
    BlockUIFactory.INSTANCE.openUI(event.player, event.block.pos, "pc")
})

ServerEvents.tags("item", event => {
    event.add("kubejs:test_item", "kubejs:pc")
})