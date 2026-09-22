global.metamorphosis.items["metamorphosis:floppy_disk_1"] = {
    materials: [
        {item: "kubejs:varium_shard", count: 64, display: "§8◈ x64 §0Varium Shard"},
        {item: "kubejs:varium_crystal", count: 16, display: "§8◈ x16 §0Varium Crystal"},
        {item: "minecraft:ender_pearl", count: 7, display: "§8◈ x7 §0Ender Pearl"},
        {item: "advancedperipherals:memory_card", count: 7, display: "§8◈ x7 §0Memory Card"},
        {item: "advancedperipherals:chunk_controller", count: 9, display: "§8◈ x9 §0Chunk Controller"},
        {item: "vinery:straw_hat", count: 1, display: "§8◈ x1 §0Straw Hat"},
        {item: "vinery:apple_cider", count: 1, display: "§8◈ x1 §0Apple Cider"},
        {item: "vinery:red_wine", count: 1, display: "§8◈ x1 §0Red Wine"},
        {item: "vinery:cherry_wine", count: 1, display: "§8◈ x1 §0Cherry Wine"},
        {item: "vinery:bottle_mojang_noir", count: 1, display: "§8◈ x1 §0A Bottle of 'Mojang Noir'"},
    ],
    result: "metamorphosis:floppy_disk_1_decrypted"
}

StartupEvents.registry("item", event => {
    event.create("metamorphosis:floppy_disk_1")
        .displayName("<glitch><obfuscate mode=constant>Distillery Game</obfuscate></glitch>")
        .maxStackSize(1)
        .glow(false)
    
    event.create("metamorphosis:floppy_disk_1_decrypted")
        .displayName("<glitch>Distillery Game</glitch>")
        .maxStackSize(1)
        .glow(false)
})
