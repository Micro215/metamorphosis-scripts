StartupEvents.registry("block", event => {
    event.create("pc", "cardinal")
        .blockEntity(be => {
            be.inventory(9, 1, ["#kubejs:admin_item", "#kubejs:test_item"])
            be.enableSync()
        })
        .displayName("PC")
        .soundType("large_amethyst_bud")
        .hardness(40)
        .resistance(1)
        .requiresTool(false)
})