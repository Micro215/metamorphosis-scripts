ItemEvents.rightClicked(event => {
    if (!event.player.persistentData.disableUSE) return
    event.cancel()
})

ItemEvents.entityInteracted(event => {
    if (!event.player.persistentData.disableUSE) return
    event.cancel()
})

BlockEvents.placed(event => {
    if (!event.player.persistentData.disableUSE) return
    event.cancel()
})

BlockEvents.rightClicked(event => {
    if (!event.player.persistentData.disableUSE) return
    event.cancel()
})
