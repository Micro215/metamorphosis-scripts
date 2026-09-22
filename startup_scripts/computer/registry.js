global.mmModules = {
    // ---- master ----
    computer: {
        master: true,
        type: "cardinal",
        displayName: "<glitch>Otherworldy Computer</glitch>",
        hardness: 40,
        noDrops: false,
        tickInterval: 20
    },

    // ---- cable ----
    cable: {
        type: "basic",
        cable: true,
        displayName: "<glitch>Otherworldy Conduit</glitch>",
        foreign: "computercraft:cable",
        maxPerNetwork: null,
        hardness: 0.4,
        noDrops: false,
        box: [5, 5, 5, 11, 11, 11]
    },

    // ---- modules ----
    disk_drive: {
        type: "cardinal",
        displayName: "<glitch>Otherworldy Data Handling Unit</glitch>",
        inventory: { columns: 9, rows: 1 },
        capabilities: ["media"],
        foreign: "computercraft:disk_drive",
        maxPerNetwork: 1,
        ui: {
            w: 210, h: 194, title: "Data Handling Unit",
            slots: 1, slotCols: 1,
            slotPanel: "wide",
            slotCaption: "§8— INSERT —"
        }
    },

    encryption_protocol: {
        type: "basic",
        displayName: "<glitch>Otherworldy Encryption Protocol</glitch>",
        inventory: { columns: 9, rows: 3 },
        capabilities: ["materials"],
        foreign: "advancedperipherals:environment_detector",
        maxPerNetwork: 1,
        ui: {
            w: 250, h: 328, title: "ENCRYPTION PROTOCOL",
            slots: 27, slotCols: 9,
            slotPanel: "tight",
            slotCaption: "§8◈ PROTOCOL MATRIX",
            console: {
                x: 6, y: 30, w: 210, h: 120, lines: 9,
                btnW: 18, btnH: 18,
                history: "encryption"
            },
            status: true
        }
    },

    communication: {
        type: "basic",
        displayName: "<glitch>Otherworldy Communication Module</glitch>",
        capabilities: ["comms"],
        foreign: "advancedperipherals:chat_box",
        maxPerNetwork: 1,
        ui: {
            w: 210, h: 150, title: "Communication Module",
            status: true,
            note: "§8◈ long-range link"
        }
    }
}