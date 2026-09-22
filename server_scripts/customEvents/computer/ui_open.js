function mmPushStatus(event, def) {
    let player = event.player
    let level = event.level
    let p = event.block.pos

    let masterPos = null
    if (def.master) {
        masterPos = p
    } else if (def.ui && def.ui.status) {
        let be = event.block.entity
        let mm = be ? be.persistentData.mm : null
        if (mm && mm.master) {
            masterPos = { x: Number(mm.master.x), y: Number(mm.master.y), z: Number(mm.master.z) }
        }
    }
    if (!masterPos) return

    let status = null
    let snap = global.mmNetSnapshot ? global.mmNetSnapshot(level, masterPos.x, masterPos.y, masterPos.z) : null
    if (snap) {
        status = { net: snap.net, conflict: snap.conflict, modules: snap.members.length, cables: snap.cables }
    }

    player.sendData("mm_net_status", { data: { block: { x: p.x, y: p.y, z: p.z }, status: status } })
}

BlockEvents.rightClicked(event => {
    let id = String(event.block.id)
    if (id.indexOf("metamorphosis:") !== 0) return

    let name = id.substring("metamorphosis:".length)
    let def = global.mmModules ? global.mmModules[name] : null
    if (!def) return
    if (!def.ui && !def.master) return

    if (event.player.isShiftKeyDown()) return
    BlockUIFactory.INSTANCE.openUI(event.player, event.block.pos, name)
    try { mmPushStatus(event, def) } catch (e) { console.error("[mm] status: " + e) }
    event.success(0)
})