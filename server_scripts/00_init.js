// ============================================================================
//  Root init
// ============================================================================
if (global.wipe != null) {
    try {
        global.wipe()
    } catch (err) {
        console.error('[init] previous-context cleanup failed: ' + err)
    }
}

global.libs = {}
global.customEvents = {}

PlayerEvents.loggedIn(event => {
    let pData = event.player.persistentData
    pData.disableTP = pData.disableTP || false
    pData.disableUSE = pData.disableUSE || false
    pData.disableBREAK = pData.disableBREAK || false
})