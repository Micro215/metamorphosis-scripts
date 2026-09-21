ItemEvents.rightClicked("kubejs:bmoon", event => {
    ItemUIFactory.INSTANCE.openUI(event.player, event.hand, "bmoon")
})

ServerEvents.tags("item", event => {
    event.add("kubejs:admin_item", "kubejs:bmoon")
})