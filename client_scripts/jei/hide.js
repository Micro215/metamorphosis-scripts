JEIEvents.hideItems(event => {
    event.hide("metamorphosis:artha_crystal_block")
    event.hide("metamorphosis:dharma_crystal_block")
    event.hide("metamorphosis:kama_crystal_block")
    event.hide("metamorphosis:moksha_crystal_block")

    event.hide("metamorphosis:computer")
    event.hide("metamorphosis:disk_drive")
    event.hide("metamorphosis:encryption_protocol")
    event.hide("metamorphosis:communication")
    event.hide("metamorphosis:cable")
    
    event.hide("metamorphosis:floppy_disk_1")
    event.hide("metamorphosis:floppy_disk_1_decrypted")

    // admin items
    event.hide("kubejs:bmoon")
    event.hide("metamorphosis:pocket_computer")
})

JEIEvents.removeRecipes(event => {
    event.remove("minecraft:crafting", "minecraft:kjs/metamorphosis_computer")
})