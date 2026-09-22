(function() {
    const MOD_PREFIX = "metamorphosis:"
    const TERMINAL_RANGE = 8
    const POCKET_RANGE = 32

    // ===== wide =====
    function broadcast(server, channel, payload) {
        try {
            server.players.forEach(function(p) {
                try { p.sendData(channel, payload) } catch (e) {}
            })
        } catch (err) { console.error("[mm] broadcast: " + err) }
    }

    function respond(server, master, body) {
        let data = body || {}
        data.master = master
        broadcast(server, "mm_computer_response", { data: data })
    }

    function encryptionPush(server, encPort, message) {
        let pos = encPort.pos
        broadcast(server, "mm_encryption_response", {
            data: { block: { x: pos.x, y: pos.y, z: pos.z }, message: String(message) }
        })
    }

    // ===== inv utils =====
    function getSlotCount(slot) {
        return slot.Count !== undefined ? slot.Count : (slot.count !== undefined ? slot.count : 1)
    }
    function setSlotCount(slot, n) {
        if (slot.Count !== undefined) slot.Count = n
        else slot.count = n
    }
    function clearSlot(slot) {
        slot.id = "minecraft:air"
        setSlotCount(slot, 0)
    }

    function countItems(inv) {
        let available = {}
        inv.forEach(function(slot) {
            if (!slot || !slot.id || slot.id === "minecraft:air") return
            available[slot.id] = (available[slot.id] || 0) + getSlotCount(slot)
        })
        return available
    }

    function takeItems(inv, mats) {
        mats.forEach(function(mat) {
            let needed = mat.count
            for (let i = 0; i < inv.length && needed > 0; i++) {
                let slot = inv[i]
                if (!slot || slot.id !== mat.item) continue
                let count = getSlotCount(slot)
                if (count <= needed) {
                    needed -= count
                    clearSlot(slot)
                } else {
                    setSlotCount(slot, count - needed)
                    needed = 0
                }
            }
        })
    }

    function moduleLabel(name) {
        let def = global.mmModules ? global.mmModules[name] : null
        return (def && def.ui && def.ui.title) || name
    }

    // ===== global net =====
    function mastersOf(server) {
        let out = []
        try {
            let d = server.persistentData
            if (!d || !d.mmNets || !d.mmNets.masters) return out
            let list = d.mmNets.masters
            try {
                list.forEach(function(m) { out.push(m) })
            } catch (e) {
                let n = list.size()
                for (let i = 0; i < n; i++) out.push(list.get(i))
            }
        } catch (e2) {}
        return out
    }

    function levelByDim(server, dim) {
        try {
            let l = server.getLevel(String(dim))
            if (l) return l
        } catch (e) {}
        try {
            let levels = server.levels
            let arr = []
            try {
                levels.forEach(function(l) { arr.push(l) })
            } catch (e1) {
                let n = levels.size()
                for (let i = 0; i < n; i++) arr.push(levels.get(i))
            }
            for (let i = 0; i < arr.length; i++) {
                if (String(arr[i].dimension) === String(dim)) return arr[i]
            }
        } catch (e2) {}
        return null
    }

    function snapshotHasCap(snap, cap) {
        for (let i = 0; i < snap.members.length; i++) {
            let def = global.mmModules ? global.mmModules[snap.members[i].module] : null
            if (def && def.capabilities) {
                for (let j = 0; j < def.capabilities.length; j++) {
                    if (def.capabilities[j] === cap) return true
                }
            }
        }
        return false
    }

    function broadcastChat(server, fromLabel, text) {
        let masters = mastersOf(server)
        for (let i = 0; i < masters.length; i++) {
            let m = masters[i]
            try {
                let level = levelByDim(server, m.dim)
                if (!level) continue
                let x = Number(m.x), y = Number(m.y), z = Number(m.z)
                if (String(level.getBlock(x, y, z).id) !== MOD_PREFIX + "computer") continue
                let snap = global.mmNetSnapshot(level, x, y, z)
                if (!snap || snap.conflict) continue
                if (!snapshotHasCap(snap, "comms")) continue
                respond(server, { x: x, y: y, z: z }, { response: "§8[" + fromLabel + "] §0" + text })
            } catch (e) {}
        }
    }

    // ===== net context =====
    function buildCtx(level, player, server, master, snapshot) {
        let blocks = {}
        for (let i = 0; i < snapshot.members.length; i++) {
            let m = snapshot.members[i]
            let b = level.getBlock(m.x, m.y, m.z)
            if (String(b.id) !== MOD_PREFIX + m.module) continue
            if (!blocks[m.module]) blocks[m.module] = []
            blocks[m.module].push(b)
        }
        return {
            player: player, server: server, level: level,
            master: master, net: snapshot.net,
            conflict: snapshot.conflict, cables: snapshot.cables,
            members: snapshot.members, blocks: blocks,
            find: function(module) {
                let arr = blocks[module]
                return (arr && arr.length > 0) ? arr[0] : null
            },
            findAll: function(module) { return blocks[module] || [] },
            count: function(module) { return blocks[module] ? blocks[module].length : 0 }
        }
    }

    function countsOf(snapshot) {
        let c = { any: 0 }
        for (let i = 0; i < snapshot.members.length; i++) {
            let m = snapshot.members[i]
            c[m.module] = (c[m.module] || 0) + 1
            c.any++
        }
        return c
    }

    function missingRequires(cmd, counts) {
        let req = cmd.requires || {}
        let missing = []
        let keys = Object.keys(req)
        for (let i = 0; i < keys.length; i++) {
            let k = keys[i]
            let need = req[k]
            let have = counts[k] || 0
            if (have < need) {
                let label = k === "any" ? "any module" : moduleLabel(k)
                missing.push(label + " §7(" + have + "/" + need + ")")
            }
        }
        return missing
    }

    // ===== commands =====
    function runDecode(ctx) {
        let diskDrive = ctx.find("disk_drive")
        let encPort = ctx.find("encryption_protocol")
        if (!diskDrive) return "§cData Handler missing"
        if (!encPort) return "§cEncryption Protocol missing"

        // ---------- Disk Drive ----------
        let diskDriveData = diskDrive.entityData
        let diskSlot = null
        if (diskDriveData.attachments && diskDriveData.attachments[0]) {
            diskDriveData.attachments[0].items.forEach(slot => {
                if (!diskSlot && slot && slot.id && slot.id !== "minecraft:air") diskSlot = slot
            })
        }
        if (!diskSlot) return "§cNo data inserted"

        let diskData = global.metamorphosis.items[diskSlot.id]
        if (!diskData) return "§cUnknown data format"
        let decodeMaterials = diskData.materials

        // ---------- Encryption Protocol ----------
        let encPortData = encPort.entityData
        let inv = []
        if (encPortData.attachments && encPortData.attachments[0] && encPortData.attachments[0].items) {
            inv = encPortData.attachments[0].items
        }

        let available = countItems(inv)

        let totals = {}
        decodeMaterials.forEach(mat => {
            totals[mat.item] = (totals[mat.item] || 0) + mat.count
        })

        let materialsString = "§7Decode Materials:\n"
        let missing = []
        let totalIds = Object.keys(totals)
        for (let i = 0; i < totalIds.length; i++) {
            let id = totalIds[i]
            let mat = decodeMaterials.find(m => m.item === id)
            materialsString += mat.display + "\n"
            if ((available[id] || 0) < totals[id]) {
                missing.push(mat.display + " §7(" + (available[id] || 0) + "/" + totals[id] + ")")
            }
        }

        let ports = ctx.findAll("encryption_protocol")
        for (let i = 0; i < ports.length; i++) {
            encryptionPush(ctx.server, ports[i], materialsString)
        }

        if (missing.length > 0) {
            return "§cNot enough materials:\n" + missing.join("\n")
        }

        takeItems(inv, decodeMaterials)
        encPort.setEntityData(encPortData)

        // ---------- change disk ----------
        diskSlot.id = diskData.result
        setSlotCount(diskSlot, 1)
        diskDrive.setEntityData(diskDriveData)

        return "§aData decoded"
    }

    const commands = {
        "say": {
            usage: "say <msg>", desc: "message to all networks",
            requires: { communication: 1 },
            run: function(ctx, args) {
                if (!args) return "§cUsage: say <message>"
                broadcastChat(ctx.server, ctx.player.username, args)
                return null
            }
        },

        "decode": {
            usage: "decode", desc: "decode data",
            requires: { disk_drive: 1, encryption_protocol: 1 },
            run: function(ctx, args) { return runDecode(ctx) }
        },

        "net": {
            usage: "net", desc: "network status", conflictSafe: true,
            run: function(ctx) {
                if (ctx.conflict) return "§cNETWORK CONFLICT §8- two computers connected"
                return [
                    "§anet §8#" + ctx.net,
                    "§8  status: §aonline",
                    "§8  modules: §0" + ctx.members.length,
                    "§8  cables: §0" + ctx.cables
                ].join("\n")
            }
        },

        "modules": {
            usage: "modules", desc: "list connected modules",
            run: function(ctx) {
                if (ctx.members.length === 0) return "§8no modules connected"
                let byType = {}
                for (let i = 0; i < ctx.members.length; i++) {
                    let m = ctx.members[i]
                    byType[m.module] = (byType[m.module] || 0) + 1
                }
                let lines = ["§8modules §7(" + ctx.members.length + "):"]
                let names = Object.keys(byType)
                for (let i = 0; i < names.length; i++) {
                    lines.push("§0  " + moduleLabel(names[i]) + " §8x" + byType[names[i]])
                }
                return lines.join("\n")
            }
        },

        "clear": {
            usage: "clear", desc: "clear console",
            conflictSafe: true, run: null
        }
    }

    function helpLines(ctx, counts) {
        let status
        if (ctx.conflict) status = "§cNETWORK CONFLICT"
        else status = "§anet §8#" + ctx.net + " §8- " + ctx.members.length + " modules"

        let lines = ["§8" + status, "§8Available commands:"]
        let names = Object.keys(commands)
        names.push("help")
        names.sort()
        for (let i = 0; i < names.length; i++) {
            let name = names[i]
            let cmd = name === "help" ? { usage: "help", desc: "list commands" } : commands[name]
            if (ctx.conflict && !cmd.conflictSafe) continue
            if (missingRequires(cmd, counts).length > 0) continue
            lines.push("§0  " + cmd.usage + " §8- " + cmd.desc)
        }
        return lines.join("\n")
    }

    // ===== dispetcher =====
    function dispatch(event) {
        let player = event.player
        let payload = event.data
        if (!payload || !payload.data) return
        let d = payload.data

        let command = String(d.command || "").trim()
        if (command === "") return
        let blockPos = d.blockPos
        if (!blockPos) return

        let level = player.level
        let mx = Math.floor(Number(blockPos.x))
        let my = Math.floor(Number(blockPos.y))
        let mz = Math.floor(Number(blockPos.z))
        let master = { x: mx, y: my, z: mz }

        if (String(level.getBlock(mx, my, mz).id) !== MOD_PREFIX + "computer") {
            respond(event.server, master, { error: "§cTerminal not found" })
            return
        }

        let dx = player.x - mx, dy = player.y - my, dz = player.z - mz
        if (dx * dx + dy * dy + dz * dz > TERMINAL_RANGE * TERMINAL_RANGE) {
            respond(event.server, master, { error: "§cToo far from terminal" })
            return
        }

        let snapshot = global.mmNetSnapshot(level, mx, my, mz)
        if (!snapshot) {
            respond(event.server, master, { error: "§cNetwork offline §8- wait a second" })
            return
        }

        let spaceIdx = command.indexOf(" ")
        let name = (spaceIdx === -1 ? command : command.substring(0, spaceIdx)).toLowerCase()
        let args = spaceIdx === -1 ? "" : command.substring(spaceIdx + 1).trim()

        let counts = countsOf(snapshot)

        if (name === "help") {
            let ctx = buildCtx(level, player, event.server, master, snapshot)
            respond(event.server, master, { response: helpLines(ctx, counts) })
            return
        }

        let cmd = commands[name]
        if (!cmd) {
            respond(event.server, master, { error: "§cUnknown command: '" + name + "'. Type 'help'." })
            return
        }

        if (name === "clear") {
            respond(event.server, master, { action: "clear" })
            return
        }

        if (snapshot.conflict && !cmd.conflictSafe) {
            respond(event.server, master, { error: "§cNETWORK CONFLICT §8- disconnect the second computer" })
            return
        }

        let missing = missingRequires(cmd, counts)
        if (missing.length > 0) {
            respond(event.server, master, { error: "§cModule required:\n§c  " + missing.join("\n§c  ") })
            return
        }

        try {
            let ctx = buildCtx(level, player, event.server, master, snapshot)
            let response = cmd.run(ctx, args)
            respond(event.server, master, response === null || response === undefined ? {} : { response: String(response) })
        } catch (e) {
            respond(event.server, master, { error: "§cCommand error: " + e })
        }
    }

    NetworkEvents.dataReceived("mm_computer_command", dispatch)

    // ===== POCKET COMPUTER =====
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

    function pocketError(player, message) {
        try { player.sendData("mm_pocket_response", { data: { error: String(message) } }) } catch (e) {}
    }

    function pocketLink(player, master, snap) {
        try {
            player.sendData("mm_pocket_net", {
                data: {
                    master: master ? { x: master.x, y: master.y, z: master.z } : null,
                    net: snap ? snap.net : (master ? master.net : 0),
                    hasComms: snap ? snapshotHasCap(snap, "comms") : false,
                    conflict: snap ? !!snap.conflict : false
                }
            })
        } catch (e) {}
    }

    NetworkEvents.dataReceived("mm_pocket_open", function(event) {
        let player = event.player
        let master = global.mmNearestMaster(event.server, player.level, player.x, player.y, player.z, POCKET_RANGE)
        if (!master) { pocketLink(player, null, null); return }
        let snap = global.mmNetSnapshot(player.level, master.x, master.y, master.z)
        pocketLink(player, master, snap)
    })

    NetworkEvents.dataReceived("mm_pocket_say", function(event) {
        let player = event.player
        let payload = event.data
        if (!payload || !payload.data) return

        let d = payload.data
        let text = substituteVars(String(d.text || "").trim(), d.vars)
        if (text === "") return

        let nick = String(d.nick || "").trim()
        let from = nick !== "" ? nick : player.username

        let master = global.mmNearestMaster(event.server, player.level, player.x, player.y, player.z, POCKET_RANGE)
        if (!master) {
            pocketError(player, "§cNo computer terminal nearby §8(" + POCKET_RANGE + " blocks)")
            return
        }

        let snap = global.mmNetSnapshot(player.level, master.x, master.y, master.z)
        if (!snap) { pocketError(player, "§cNetwork offline §8- wait a second"); return }
        if (snap.conflict) { pocketError(player, "§cNETWORK CONFLICT §8- disconnect the second computer"); return }
        if (!snapshotHasCap(snap, "comms")) {
            pocketError(player, "§cCommunication Module required §8- nearby network has none")
            return
        }

        broadcastChat(event.server, from, text)
        pocketLink(player, master, snap)
    })
})()