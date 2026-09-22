// StartupEvents.registry("block", event => {
//     event.create("metamorphosis:computer", "cardinal")
//         .blockEntity(be => {
//             be.enableSync()
//             be.serverTick(20, 0, event => {
//                 let changeDiskDriveFlag = true
//                 let diskDriveBlock = null
//                 let diskDriveProperties = null

//                 let changeProtFlag = true
//                 let protBlock = null

//                 let posAround = [
//                     event.blockPos.above(), event.blockPos.below(),
//                     event.blockPos.east(), event.blockPos.west(),
//                     event.blockPos.south(), event.blockPos.north()
//                 ]

//                 posAround.forEach(pos => {
//                     let block = event.level.getBlock(pos)
//                     if (block.id === "metamorphosis:disk_drive") {
//                         changeDiskDriveFlag = false
//                     }
//                     else if (block.id === "computercraft:disk_drive") {
//                         diskDriveBlock = block
//                         diskDriveProperties = block.properties
//                     }
//                     if (block.id === "metamorphosis:encryption_protocol") {
//                         changeProtFlag = false
//                     }
//                     else if (block.id === "advancedperipherals:environment_detector") {
//                         protBlock = block
//                     }
//                 })

//                 if (changeDiskDriveFlag && diskDriveBlock) {
//                     diskDriveBlock.set("metamorphosis:disk_drive", diskDriveProperties)
//                 }
//                 if (changeProtFlag && protBlock) {
//                     protBlock.set("metamorphosis:encryption_protocol")
//                 }
//             })
//         })
//         .displayName("<glitch>Otherworldy Computer</glitch>")
//         .soundType("large_amethyst_bud")
//         .hardness(40)
//         .resistance(1)
//         .requiresTool(false)
// })