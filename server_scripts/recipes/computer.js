ServerEvents.tags("item", event => {
    event.add("metamorphosis:great_crystal", "metamorphosis:artha_crystal_block")
    event.add("metamorphosis:great_crystal", "metamorphosis:dharma_crystal_block")
    event.add("metamorphosis:great_crystal", "metamorphosis:kama_crystal_block")
    event.add("metamorphosis:great_crystal", "metamorphosis:moksha_crystal_block")
})

ServerEvents.recipes(event => {
    event.shaped(
        Item.of("metamorphosis:computer"),
        [
            " A ",
            "BCD",
            " E ",
        ],
        {
            A: "#metamorphosis:great_crystal",
            B: "#metamorphosis:great_crystal",
            C: "computercraft:computer_advanced",
            D: "#metamorphosis:great_crystal",
            E: "#metamorphosis:great_crystal",
        }
    )
})
