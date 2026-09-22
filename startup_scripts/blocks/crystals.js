StartupEvents.registry("block", event => {
    event.create("metamorphosis:artha_crystal_block", "basic") // red
        .displayName("<glitch shiftChance=1 chromatic=1><grad freq=0.1 colors=FF0000,FFFF00>Otherworldy Crystal Block</glitch></grad>")
        .soundType("large_amethyst_bud")
        .hardness(40)
        .resistance(1)
        .requiresTool(false)
        .tagBlock("metamorphosis:great_crystal")

    event.create("metamorphosis:dharma_crystal_block", "basic") // white black
        .displayName("<glitch shiftChance=1 chromatic=1><grad freq=0.1 colors=000000,FFFFFF>Otherworldy Crystal Block</glitch></grad>")
        .soundType("large_amethyst_bud")
        .hardness(40)
        .resistance(1)
        .requiresTool(false)
        .tagBlock("metamorphosis:great_crystal")

    event.create("metamorphosis:kama_crystal_block", "basic") // green
        .displayName("<glitch shiftChance=1 chromatic=1><grad freq=0.1 colors=2EB62C,C5E8B7>Otherworldy Crystal Block</glitch></grad>")
        .soundType("large_amethyst_bud")
        .hardness(40)
        .resistance(1)
        .requiresTool(false)
        .tagBlock("metamorphosis:great_crystal")

    event.create("metamorphosis:moksha_crystal_block", "basic") // blue
        .displayName("<glitch shiftChance=1 chromatic=1><grad freq=0.1 colors=0000FF,BFBFFF>Otherworldy Crystal Block</glitch></grad>")
        .soundType("large_amethyst_bud")
        .hardness(40)
        .resistance(1)
        .requiresTool(false)
        .tagBlock("metamorphosis:great_crystal")
})
