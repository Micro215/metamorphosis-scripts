StartupEvents.registry("block", event => {
    event.create("metamorphosis:disk_drive", "cardinal")
        .blockEntity(be => {
            be.inventory(9, 1)
            be.enableSync()
        })
        .noDrops()
        .displayName("<glitch>Otherworldy Disk Drive")
        .soundType("large_amethyst_bud")
        .hardness(1.5)
        .resistance(1)
        .requiresTool(false)
})