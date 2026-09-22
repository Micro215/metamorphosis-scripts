(function() {
    const MODULE_RELAY = true
    const MAX_BLOCKS = 512
    const SEARCH_LIMIT = 64
    const MOD_PREFIX = "metamorphosis:"

    // ===== reg =====
    function defOf(blockId) {
        let s = String(blockId)
        if (s.indexOf(MOD_PREFIX) !== 0) return null
        let name = s.substring(MOD_PREFIX.length)
        let def = global.mmModules ? global.mmModules[name] : null
        return def ? { name: name, def: def } : null
    }

    let foreignMap = {}
    let regNames = Object.keys(global.mmModules || {})
    for (let i = 0; i < regNames.length; i++) {
        let n = regNames[i]
        let d = global.mmModules[n]
        if (d && d.foreign) foreignMap[String(d.foreign)] = { name: n, def: d }
    }

    // ===== utils =====
    function getServer(level) {
        try {
            if (level && level.server && level.server.persistentData) return level.server
        } catch (e) {}
        try {
            if (typeof server !== "undefined" && server && server.persistentData) return server
        } catch (e2) {}
        return null
    }

    function isLoaded(level, x, z) {
        try { return level.isChunkLoaded(x >> 4, z >> 4) } catch (e) {}
        try { return level.minecraftLevel.hasChunk(x >> 4, z >> 4) } catch (e2) {}
        return true
    }

    function seedFrom(list) {
        let out = []
        if (!list) return out
        try {
            list.forEach(function(m) {
                out.push({ x: Number(m.x), y: Number(m.y), z: Number(m.z), module: String(m.module) })
            })
        } catch (e) {
            try {
                let n = list.size()
                for (let i = 0; i < n; i++) {
                    let m = list.get(i)
                    out.push({ x: Number(m.x), y: Number(m.y), z: Number(m.z), module: String(m.module) })
                }
            } catch (e2) {}
        }
        return out
    }

    // ===== pool netId =====
    function netPool(srv) {
        let d = srv.persistentData
        if (!d.mmNets) d.mmNets = { next: 1, free: "", masters: [] }
        if (!d.mmNets.masters) d.mmNets.masters = []
        return d.mmNets
    }

    function listToJs(list) {
        let out = []
        if (!list) return out
        try {
            list.forEach(function(m) { out.push(m) })
        } catch (e) {
            try {
                let n = list.size()
                for (let i = 0; i < n; i++) out.push(list.get(i))
            } catch (e2) {}
        }
        return out
    }

    function allocNet(srv) {
        let p = netPool(srv)
        let free = String(p.free || "")
        if (free !== "") {
            let parts = free.split(",")
            parts.sort(function(a, b) { return parseInt(a) - parseInt(b) })
            let id = parseInt(parts.shift())
            p.free = parts.join(",")
            if (!isNaN(id)) return id
        }
        let id = Number(p.next) || 1
        p.next = id + 1
        return id
    }

    function freeNet(srv, id) {
        if (!srv || id === null || id === undefined) return
        let p = netPool(srv)
        let free = String(p.free || "")
        let parts = free === "" ? [] : free.split(",")
        let s = String(id)
        if (parts.indexOf(s) < 0) parts.push(s)
        p.free = parts.join(",")

        let kept = []
        let masters = listToJs(p.masters)
        for (let i = 0; i < masters.length; i++) {
            if (Number(masters[i].net) !== id) kept.push(masters[i])
        }
        p.masters = kept
    }

    // ===== net BFS =====
    function scanNetwork(level, mx, my, mz, convert, seedMembers) {
        let visited = {}
        let members = []
        let cables = 0
        let conflict = false
        let overflow = false

        let typeCount = {}
        let seeded = {}
        if (seedMembers) {
            for (let i = 0; i < seedMembers.length; i++) {
                let m = seedMembers[i]
                seeded[m.x + "," + m.y + "," + m.z] = true
                typeCount[m.module] = (typeCount[m.module] || 0) + 1
            }
        }

        let queue = [{ x: mx, y: my, z: mz }]
        visited[mx + "," + my + "," + mz] = true

        let budget = MAX_BLOCKS

        while (queue.length > 0) {
            let p = queue.shift()

            let dirs = [
                [p.x + 1, p.y, p.z], [p.x - 1, p.y, p.z],
                [p.x, p.y + 1, p.z], [p.x, p.y - 1, p.z],
                [p.x, p.y, p.z + 1], [p.x, p.y, p.z - 1]
            ]

            for (let i = 0; i < dirs.length; i++) {
                let x = dirs[i][0]
                let y = dirs[i][1]
                let z = dirs[i][2]
                let k = x + "," + y + "," + z
                if (visited[k]) continue
                visited[k] = true

                if (!isLoaded(level, x, z)) continue

                let block = level.getBlock(x, y, z)
                let id = String(block.id)
                let info = defOf(id)

                if (info) {
                    if (info.def.master) {
                        conflict = true
                        continue
                    }
                    if (budget <= 0) { overflow = true; continue }
                    budget--
                    if (info.def.cable) {
                        cables++
                        queue.push({ x: x, y: y, z: z })
                    } else {
                        members.push({ x: x, y: y, z: z, module: info.name })
                        if (!seeded[k]) typeCount[info.name] = (typeCount[info.name] || 0) + 1
                        if (MODULE_RELAY) queue.push({ x: x, y: y, z: z })
                    }
                    continue
                }

                if (!convert) continue

                let foreign = foreignMap[id]
                if (foreign) {
                    let max = foreign.def.maxPerNetwork
                    if (max === null || max === undefined) max = Infinity
                    if ((typeCount[foreign.name] || 0) < max) {
                        try {
                            if (foreign.def.type === "cardinal") block.set(MOD_PREFIX + foreign.name, block.properties)
                            else block.set(MOD_PREFIX + foreign.name)
                        } catch (e) {
                            try { block.set(MOD_PREFIX + foreign.name) } catch (e2) {}
                        }
                        typeCount[foreign.name] = (typeCount[foreign.name] || 0) + 1

                        if (budget <= 0) { overflow = true; continue }
                        budget--
                        if (foreign.def.cable) {
                            cables++
                            queue.push({ x: x, y: y, z: z })
                        } else {
                            members.push({ x: x, y: y, z: z, module: foreign.name })
                            if (MODULE_RELAY) queue.push({ x: x, y: y, z: z })
                        }
                    }
                }
            }
        }

        return { members: members, cables: cables, conflict: conflict, overflow: overflow }
    }

    // ===== validation =====
    function validateNetwork(level, mx, my, mz, serverHint) {
        if (!isLoaded(level, mx, mz)) return null

        let master = level.getBlock(mx, my, mz)
        let minfo = defOf(master.id)
        if (!minfo || !minfo.def.master) return null

        let be = master.entity
        if (!be) return null

        let srv = serverHint || getServer(level)
        if (!srv) return null

        let data = be.persistentData

        if (!data.mm || data.mm.net === undefined || data.mm.net === null) {
            data.mm = { net: allocNet(srv), conflict: true, cables: 0, members: [] }
        }
        let netId = Number(data.mm.net)

        let pool = netPool(srv)
        let mlist = listToJs(pool.masters)
        let registered = false
        for (let i = 0; i < mlist.length; i++) {
            if (Number(mlist[i].net) === netId) { registered = true; break }
        }
        if (!registered) {
            mlist.push({ net: netId, x: mx, y: my, z: mz, dim: String(level.dimension) })
            pool.masters = mlist
        }

        let seedMembers = seedFrom(data.mm.members)

        let scan = scanNetwork(level, mx, my, mz, true, seedMembers)

        let parts = []
        for (let i = 0; i < scan.members.length; i++) {
            let m = scan.members[i]
            parts.push(m.module + "@" + m.x + "," + m.y + "," + m.z)
        }
        let sig = (scan.conflict ? "C" : "c") + (scan.overflow ? "O" : "o") + scan.cables + "|" + parts.join(";")

        if (String(data.mm.sig) !== sig) {
            data.mm.sig = sig
            data.mm.conflict = scan.conflict
            data.mm.cables = scan.cables
            data.mm.members = scan.members
        }

        if (!scan.conflict) {
            for (let i = 0; i < scan.members.length; i++) {
                let m = scan.members[i]
                let mbe = level.getBlock(m.x, m.y, m.z).entity
                if (!mbe) continue
                let pd = mbe.persistentData
                let mm = pd.mm
                if (mm && Number(mm.net) === netId && mm.master &&
                    Number(mm.master.x) === mx && Number(mm.master.y) === my && Number(mm.master.z) === mz) continue
                pd.mm = { net: netId, master: { x: mx, y: my, z: mz } }
            }
        }

        return { net: netId, conflict: scan.conflict, cables: scan.cables, members: scan.members }
    }

    // ===== rebuild if placed/broken =====
    function mastersNear(level, x, y, z) {
        let result = {}
        let visited = {}
        visited[x + "," + y + "," + z] = true
        let queue = [{ x: x, y: y, z: z }]
        let steps = 0

        while (queue.length > 0 && steps < SEARCH_LIMIT) {
            let p = queue.shift()
            steps++

            let dirs = [
                [p.x + 1, p.y, p.z], [p.x - 1, p.y, p.z],
                [p.x, p.y + 1, p.z], [p.x, p.y - 1, p.z],
                [p.x, p.y, p.z + 1], [p.x, p.y, p.z - 1]
            ]

            for (let i = 0; i < dirs.length; i++) {
                let nx = dirs[i][0]
                let ny = dirs[i][1]
                let nz = dirs[i][2]
                let k = nx + "," + ny + "," + nz
                if (visited[k]) continue
                visited[k] = true

                if (!isLoaded(level, nx, nz)) continue

                let block = level.getBlock(nx, ny, nz)
                let info = defOf(block.id)
                if (!info) continue

                if (info.def.master) {
                    result[k] = { x: nx, y: ny, z: nz }
                } else if (info.def.cable) {
                    queue.push({ x: nx, y: ny, z: nz })
                } else {
                    let mbe = block.entity
                    let mm = mbe ? mbe.persistentData.mm : null
                    if (mm && mm.master) {
                        let mk = Number(mm.master.x) + "," + Number(mm.master.y) + "," + Number(mm.master.z)
                        if (!result[mk]) {
                            result[mk] = { x: Number(mm.master.x), y: Number(mm.master.y), z: Number(mm.master.z) }
                        }
                    }
                    if (MODULE_RELAY) queue.push({ x: nx, y: ny, z: nz })
                }
            }
        }
        return result
    }

    function revalidateAround(level, x, y, z, serverHint) {
        let masters = mastersNear(level, x, y, z)
        let keys = Object.keys(masters)
        for (let i = 0; i < keys.length; i++) {
            let m = masters[keys[i]]
            try {
                validateNetwork(level, m.x, m.y, m.z, serverHint || null)
            } catch (e) {
                console.error("[mm] revalidate: " + e)
            }
        }
    }

    // ===== events =====
    BlockEvents.placed(event => {
        let info = defOf(event.block.id)
        if (!info) return

        let p = event.block.pos
        if (info.def.master) {
            try { validateNetwork(event.level, p.x, p.y, p.z, event.server || null) }
            catch (e) { console.error("[mm] placed: " + e) }
        } else {
            revalidateAround(event.level, p.x, p.y, p.z, event.server || null)
        }
    })

    BlockEvents.broken(event => {
        let info = defOf(event.block.id)
        if (!info) return

        let p = event.block.pos

        if (info.def.master) {
            try {
                let be = event.block.entity
                let mm = be ? be.persistentData.mm : null
                if (mm && mm.net !== undefined) {
                    let netId = Number(mm.net)
                    let scan = scanNetwork(event.level, p.x, p.y, p.z, false)
                    for (let i = 0; i < scan.members.length; i++) {
                        let m = scan.members[i]
                        let mbe = event.level.getBlock(m.x, m.y, m.z).entity
                        if (!mbe) continue
                        try { mbe.persistentData.remove("mm") } catch (e) {}
                    }
                    let srv = event.server || getServer(event.level)
                    freeNet(srv, netId)
                }
            } catch (err) { console.error("[mm] master broken: " + err) }
        } else {
            revalidateAround(event.level, p.x, p.y, p.z, event.server || null)
        }
    })

    // ===== export =====
    global.mmNetValidate = function(tick) {
        try {
            validateNetwork(tick.level, tick.blockPos.x, tick.blockPos.y, tick.blockPos.z, tick.server || null)
        } catch (e) { console.error("[mm] validate: " + e) }
    }

    global.mmNetSnapshot = function(level, x, y, z) {
        try {
            let be = level.getBlock(x, y, z).entity
            if (!be) return null
            let mm = be.persistentData.mm
            if (!mm) return null

            let members = []
            let list = listToJs(mm.members)
            for (let i = 0; i < list.length; i++) {
                let m = list[i]
                members.push({ x: Number(m.x), y: Number(m.y), z: Number(m.z), module: String(m.module) })
            }
            return { net: Number(mm.net), conflict: !!mm.conflict, cables: Number(mm.cables || 0), members: members }
        } catch (e) {
            console.error("[mm] snapshot: " + e)
            return null
        }
    }

    global.mmNearestMaster = function(srv, level, px, py, pz, maxDist) {
        if (!srv) return null
        let pool = netPool(srv)
        let dim = String(level.dimension)
        let limit = maxDist || 32
        let best = null
        let bestD = limit * limit
        let masters = listToJs(pool.masters)
        for (let i = 0; i < masters.length; i++) {
            let m = masters[i]
            if (String(m.dim) !== dim) continue
            let x = Number(m.x), y = Number(m.y), z = Number(m.z)
            let dx = x - px, dy = y - py, dz = z - pz
            let d = dx * dx + dy * dy + dz * dz
            if (d > bestD) continue
            if (String(level.getBlock(x, y, z).id) !== MOD_PREFIX + "computer") continue
            bestD = d
            best = { net: Number(m.net), x: x, y: y, z: z }
        }
        return best
    }

})()