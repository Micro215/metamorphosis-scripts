StartupEvents.registry("block", event => {
    event.create("metamorphosis:computer", "cardinal")
        .blockEntity(be => {
            be.inventory(9, 1)
            be.enableSync()
        })
        .displayName("<glitch>Otherworldy Computer")
        .soundType("large_amethyst_bud")
        .hardness(40)
        .resistance(1)
        .requiresTool(false)
})