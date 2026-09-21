// ---
NetworkEvents.dataReceived("env_sky_set", event => {
    WorldJS.setSkyColor(event.data.data)
})

NetworkEvents.dataReceived("env_sky_reset", event => {
    WorldJS.clearSkyColor()
})

// ---
NetworkEvents.dataReceived("env_fog_set", event => {
    WorldJS.setFogColor(event.data.data)
})

NetworkEvents.dataReceived("env_fog_reset", event => {
    WorldJS.clearFogColor()
})

// ---
NetworkEvents.dataReceived("env_sun_set", event => {
    WorldJS.setSunTexture(event.data.data)
})

NetworkEvents.dataReceived("env_sun_reset", event => {
    WorldJS.clearSunTexture()
})

// ---
NetworkEvents.dataReceived("env_moon_set", event => {
    WorldJS.setMoonTexture(event.data.data)
})

NetworkEvents.dataReceived("env_moon_reset", event => {
    WorldJS.clearMoonTexture()
})

// ---
NetworkEvents.dataReceived("env_rain_set", event => {
    WorldJS.setRainTexture(event.data.data)
})

NetworkEvents.dataReceived("env_rain_reset", event => {
    WorldJS.clearRainTexture()
})

// ---
NetworkEvents.dataReceived("env_reset", event => {
    WorldJS.reset()
})