ItemEvents.rightClicked("metamorphosis:pocket_computer", event => {
    ItemUIFactory.INSTANCE.openUI(event.player, event.hand, "pocket_computer")
})

ServerEvents.tags("item", event => {
    event.add("kubejs:admin_item", "metamorphosis:pocket_computer")
})