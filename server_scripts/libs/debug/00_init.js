// ============================================================================
//  debug — chat logging for operators with debug enabled.
//
//  info  → chat only, only players with verbose on (dev tracing,
//          never touches the server console)
//  warn  → chat to all debug users + console.warn
//  error → chat to all debug users + console.error
// ============================================================================
global.libs.customDebug = {}

global.libs.customDebug.VERSION = '1.0'

// nicknames with debug chat enabled
global.libs.customDebug._users = []

// nickname → true for players who also want info-level messages
global.libs.customDebug._verbose = {}

// cached server (chat delivery + game time)
global.libs.customDebug._server = null