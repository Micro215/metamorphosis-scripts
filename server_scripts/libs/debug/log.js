// ============================================================================
//  debug — message delivery
// ============================================================================
let D = global.libs.customDebug

// grab the server as soon as it exists; _wipe clears it on unload
ServerEvents.loaded(function(event) {
    D._server = event.server
})

function gameTime() {
    try { return D._server == null ? -1 : D._server.tickCount } catch (err) { return -1 }
}

// line format: [gametime] [LEVEL] message
function deliver(level, msg, verboseOnly) {
    let server = D._server
    if (server == null || D._users.length === 0) return

    let line = '[' + gameTime() + '] [' + level + '] ' + msg
    for (let i = 0; i < D._users.length; i++) {
        let nick = D._users[i]
        if (verboseOnly && D._verbose[nick] !== true) continue
        try {
            server.runCommandSilent('tell ' + nick + ' ' + line)
        } catch (err) {}
    }
}

D.info = function(msg) { deliver('INFO', msg, true) }

D.warn = function(msg) {
    console.warn('[customDebug] ' + msg)
    deliver('WARN', msg, false)
}

D.error = function(msg) {
    console.error('[customDebug] ' + msg)
    deliver('ERROR', msg, false)
}

// reload cleanup: the cached server object is invalid after unload
D._wipe = function() { D._server = null }