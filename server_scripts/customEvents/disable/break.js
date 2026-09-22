BlockEvents.broken(event => {
    if (!event.player.persistentData.disableBREAK) return
    event.cancel()
})

BlockEvents.leftClicked(event => {
    if (!event.player.persistentData.disableBREAK) return
    event.cancel()
})