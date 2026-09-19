// ============================================================================
//  shapes — registry & lifecycle
// ============================================================================
let SH = global.libs.shapes

// advance a shape by one (or more) layers
SH.animate = function(obj, layers) {
    if (obj == null) return
    if (typeof obj.update !== 'function') {
        console.warn('[shapes.animate] object has no update() method')
        return
    }
    obj.update(layers)
}

// stop every live shape; instant=true removes the blocks immediately
SH.stopAll = function(instant) {
    let list = SH._all
    for (let i = list.length - 1; i >= 0; i--) {
        if (typeof list[i].stop === 'function') list[i].stop(instant === true)
    }
}

// names of all live shapes (for debugging)
SH.list = function() {
    let out = []
    for (let i = 0; i < SH._all.length; i++) out.push(SH._all[i].name)
    return out
}

SH._register = function(obj) { SH._all.push(obj) }

SH._unregister = function(obj) {
    let list = SH._all
    for (let i = list.length - 1; i >= 0; i--) if (list[i] === obj) list.splice(i, 1)
}

// wipe contract: remove every placed block instantly
SH._wipe = function() { SH.stopAll(true) }