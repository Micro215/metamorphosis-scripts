ServerEvents.recipes(event => {
    event.shaped("irons_spellbooks:blank_rune", [
        "AAA",
        "ABA",
        "AAA"
    ], {
        A: "irons_spellbooks:arcane_ingot",
        B: "irons_spellbooks:shriving_stone"
    });

    event.shaped("irons_spellbooks:arcane_salvage", [
        "ABA",
        "BCB",
        "ABA"
    ], {
        A: "irons_spellbooks:arcane_ingot",
        B: "minecraft:netherite_scrap",
        C: "irons_spellbooks:blank_rune"
    });

    event.custom({
        type: "create:mixing",
        ingredients: [
            { item: "minecraft:lapis_lazuli" },
            { item: "minecraft:lapis_lazuli" },
            { item: "minecraft:amethyst_shard" },
            { item: "minecraft:amethyst_shard" },
            [
                { item: "create:experience_nugget" },
                { item: "minecraft:experience_bottle" },
            ]
        ],
        results: [
            {
                item: "irons_spellbooks:arcane_essence",
                count: 4
            }
        ],
        heatRequirement: "heated"
    }).id("create_wizardry:arcane_essence_recipe");
});