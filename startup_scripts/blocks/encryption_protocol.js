StartupEvents.registry("block", event => {
    event.create("metamorphosis:encryption_protocol", "basic")
        .blockEntity(be => {
            be.inventory(9, 3)
            be.enableSync()
        })
        .noDrops()
        .displayName("<glitch>Otherworldy Encryption Protocol")
        .soundType("large_amethyst_bud")
        .hardness(1.5)
        .resistance(1)
        .requiresTool(false)
})