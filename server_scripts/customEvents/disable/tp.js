(function() {
    const items = [
        // vanilla
        "minecraft:ender_pearl",
        "minecraft:chorus_fruit",

        // inv pets
        "inventorypets:pet_house",
        "inventorypets:pet_enderman",
        "inventorypets:pet_nether_portal",
        "inventorypets:pet_end_portal",

        // mek
        "mekanism:portable_teleporter",

        // thermal
        "thermal:ender_grenade",

        // irons
        "irons_spellbooks:scroll",

        // force
        "forcecraft:force_rod",

        // enderio
        "enderio:staff_of_travelling",

        // chisel
        "chisel_chipped_integration:ender_offset_wand",

        // vinery
        "vinery:chorus_wine"
    ]

    const blocks = [
        // vanilla
        "minecraft:wither_skeleton_skull",

        // stalwart
        "stalwart_dungeons:teleporter",

        // thermal
        "thermal:ender_tnt",

        // enderio
        "enderio:travel_anchor",

        // mek
        "mekanism:teleporter_rame",
    ]

    const tags = [
        "tconstruct:modifiable/interactable/charge",
        'forge:tools'
    ]

    const mods = [
        "waystone"
    ]

    ItemEvents.rightClicked(event => {
        if (!event.player.persistentData.disableTP) return
        console.log(event.item.tags)
        if (items.includes(event.item.id)) {
            event.cancel()
        }
        tags.forEach(tag => {
            if (event.item.hasTag(tag)) event.cancel()
        })
        mods.forEach(mod => {
            if (event.item.id.startsWith(mod)) event.cancel()
        })
    })

    BlockEvents.placed(event => {
        if (!event.player.persistentData.disableTP) return
        if (blocks.includes(event.block.id)) {
            event.cancel()
        }
        tags.forEach(tag => {
            if (event.block.hasTag(tag)) event.cancel()
        })
        mods.forEach(mod => {
            if (event.block.id.startsWith(mod)) event.cancel()
        })
    })

    BlockEvents.rightClicked(event => {
        if (!event.player.persistentData.disableTP) return
        if (items.includes(event.item.id)) event.cancel()
        if (blocks.includes(event.block.id)) event.cancel()
        tags.forEach(tag => {
            if (event.item.hasTag(tag)) event.cancel()
            if (event.block.hasTag(tag)) event.cancel()
        })
        mods.forEach(mod => {
            if (event.item.id.startsWith(mod)) event.cancel()
            if (event.block.id.startsWith(mod)) event.cancel()
        })
    })
})()