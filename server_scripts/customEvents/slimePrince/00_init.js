// ============================================================================
//  Slime Prince — namespace init.
//  Containers are declared here, the letter-named modules fill them.
//  Every file below reads global.libs ONLY inside functions — the load
//  order of the letter-named files does not matter (events/ loads before
//  libs/, which is fine since the libs are needed at runtime only).
// ============================================================================
global.customEvents.slimePrince = {
    config: null,     // config.js — every constant of the fight
    utils: null,      // utils.js — shared helpers
    attacks: [],      // attacks.js — crystal attack pool
    shields: null,    // shields.js
    domefx: null,     // domefx.js
    music: null,      // music.js
    loot: null,       // loot.js
    state: null,      // boss.js — live fight state
    _wipe: null,      // boss.js — reload/unload cleanup
}