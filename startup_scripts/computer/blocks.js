// ============================================================
// Генерация всех блоков из реестра.
// Сетевая логика (BFS, ассимиляция, пул netId) — в
// server_scripts/computer/network.js, сюда идём только за тиком мастера.
// ============================================================

StartupEvents.registry("block", event => {
    let names = Object.keys(global.mmModules || {})

    for (let i = 0; i < names.length; i++) {
        let name = names[i]
        let def = global.mmModules[name]

        let block = event.create("metamorphosis:" + name, def.type || "basic")
            .displayName(def.displayName)
            .soundType(def.soundType || "large_amethyst_bud")
            .hardness(def.hardness !== undefined ? def.hardness : 1.5)
            .resistance(def.resistance !== undefined ? def.resistance : 1)
            .requiresTool(false)

        if (def.noDrops !== false) block.noDrops()

        // маленький хитбокс (кабель)
        if (def.box) {
            block.box(def.box[0], def.box[1], def.box[2], def.box[3], def.box[4], def.box[5], true)
        }

        // BE нужен только блокам с инвентарём и мастеру (кабель — без BE)
        if (def.inventory || def.master || def.ui) {
            block.blockEntity(be => {
                if (def.inventory) be.inventory(def.inventory.columns, def.inventory.rows)
                be.enableSync()
                if (def.master) {
                    be.serverTick(def.tickInterval || 20, 0, tick => {
                        if (global.mmNetValidate) global.mmNetValidate(tick)
                    })
                }
            })
        }
    }
})