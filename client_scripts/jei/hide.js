JEIEvents.hideItems(event => {
    event.hide("metamorphosis:artha_crystal_block")
    event.hide("metamorphosis:dharma_crystal_block")
    event.hide("metamorphosis:kama_crystal_block")
    event.hide("metamorphosis:moksha_crystal_block")
    event.hide("metamorphosis:computer")
    event.hide("kubejs:pc")
    event.hide("kubejs:test")
    event.hide("kubejs:bmoon")
})

JEIEvents.removeRecipes(event => {
    event.remove("minecraft:crafting", "minecraft:kjs/metamorphosis_computer")
})