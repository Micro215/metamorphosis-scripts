// ============================================================================
//  Wipe — top-level emergency cleanup.
// ============================================================================

global.wipe = function() {
    let wiped = []
    let groups = [global.customEvents, global.libs]

    for (let g = 0; g < groups.length; g++) {
        let ns = groups[g]
        if (ns == null) continue
        let keys = Object.keys(ns)
        for (let i = 0; i < keys.length; i++) {
            let mod = ns[keys[i]]
            if (mod == null || typeof mod._wipe !== 'function') continue
            try {
                mod._wipe()
                wiped.push(keys[i])
            } catch (err) {
                console.error('[wipe] module "' + keys[i] + '" failed: ' + err)
            }
        }
    }

    console.info('[wipe] ' + (wiped.length > 0
        ? 'cleaned: ' + wiped.join(', ')
        : 'nothing to clean'))
    return wiped
}

ServerEvents.unloaded(event => {
    global.wipe()
})