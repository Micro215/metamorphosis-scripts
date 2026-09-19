// ============================================================================
//  Root init — the two global namespaces.
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