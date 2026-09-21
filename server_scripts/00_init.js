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

// ServerEvents.tick(event => {
//     if (!global.server) {
//         global.server = event.server
//     }
// })