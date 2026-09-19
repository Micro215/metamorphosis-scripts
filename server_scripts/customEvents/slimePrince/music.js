// ============================================================================
//  Slime Prince — music: intro + looping fight track on top of fx.sound
// ============================================================================
let SP = global.customEvents.slimePrince

SP.music = {
    handle: null,

    // track: { id, loop, interval } from SP.config.MUSIC
    play: function(server, pos, track) {
        let FX = global.libs.fx
        this.stop()
        if (server == null || track == null) return
        this.handle = FX.sound(server, pos, track.id, {
            category: 'music',
            volume: SP.config.MUSIC.VOLUME,
            loop: track.loop === true ? (track.interval || 2400) : null,
            name: 'slime_prince_music',
        })
    },

    stop: function() {
        if (this.handle != null) {
            this.handle.stop()   // also silences the music category
            this.handle = null
        }
    },
}