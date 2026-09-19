ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var Arguments = event.arguments

    event.register(
        Commands.literal('mapart')
            .then(
                Commands.argument('filename', Arguments.STRING.create(event))
                    .executes(function(ctx) {
                        var player = ctx.source.player
                        if (player == null) return 0

                        var filename = Arguments.STRING.getResult(ctx, 'filename')
                        player.sendData('mapart_request', { filename: filename })
                        player.tell(Text.gray('Requesting: ' + filename + '.dat'))
                        return 1
                    })
            )
    )
})

NetworkEvents.dataReceived('mapart_data', function(event) {
    var player = event.player
    var data = event.data

    try {
        var Base64 = Java.loadClass('java.util.Base64')
        var MapItemSavedData = Java.loadClass('net.minecraft.world.level.saveddata.maps.MapItemSavedData')
        var ResourceKey = Java.loadClass('net.minecraft.resources.ResourceKey')
        var Registries = Java.loadClass('net.minecraft.core.registries.Registries')

        var colors = Base64.getDecoder().decode(data.b64)
        if (colors.length != 16384) {
            player.tell(Text.red('Invalid color data size: ' + colors.length + ' (expected 16384)'))
            return
        }

        var level = player.level
        var mapId = level.getFreeMapId()

        var dimensionKey = ResourceKey.create(Registries.DIMENSION, level.dimension)

        var freshData = MapItemSavedData.createFresh(
            player.x,
            player.z,
            0,              // byte
            false,          // trackingPosition
            false,          // unlimitedTracking
            dimensionKey    // ResourceKey<Level>
        )
        freshData.colors = colors

        var lockedData = freshData.locked()
        lockedData.colors = colors

        level.setMapData('map_' + mapId, lockedData)
        lockedData.setDirty()

        player.giveInHand(Item.of('minecraft:filled_map', 1, { map: mapId }))

        player.tell(Text.green('Map created! ID: ' + mapId))
        player.tell(Text.gray('Pixels: 16384'))
        player.tell(Text.gray('Locked: true'))
        player.tell(Text.gray('Tracking: disabled'))
    } catch (e) {
        player.tell(Text.red('Error: ' + e))
    }
})

NetworkEvents.dataReceived('mapart_error', function(event) {
    var player = event.player
    var data = event.data
    player.tell(Text.red('Error: ' + data.error))
})