// ============================================================================
//  shapes — animated block structures library
//
//  No internal tick loop: shapes advance only when you call
//  shapes.animate(obj), so you fully control the update rate.
// ============================================================================
global.libs.shapes = {}

global.libs.shapes.VERSION = '2.0'

// registry of live shapes; they remove themselves once fully dissolved
global.libs.shapes._all = []