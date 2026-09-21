StartupEvents.registry("block", event => {
    event.create("test", "basic")
        .blockEntity(be => {
            be.inventory(9, 1, ["#kubejs:admin_item", "#kubejs:test_item"])
            be.rightClickOpensInventory()
            be.enableSync()
        })
        .displayName("Test Block")
        .soundType("large_amethyst_bud")
        .hardness(-1)
        .resistance(1)
})