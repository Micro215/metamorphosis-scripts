StartupEvents.registry('item', event => {

  event.create('varium_shard')
    .displayName('Varium Shard')
    .texture('kubejs:item/varium_shard')
    .maxStackSize(64)
    .glow(true)

  event.create('varium_crystal')
    .displayName('§aVarium Crystal')
    .texture('kubejs:item/varium_crystal')
    .maxStackSize(64)
    .glow(true)

  event.create('varium_geode')
    .displayName('§dVarium Geode')
    .texture('kubejs:item/varium_geode')
    .maxStackSize(64)
    .glow(true)

  event.create('pure_varium')
    .displayName('§4Pure Varium')
    .texture('kubejs:item/pure_varium')
    .maxStackSize(64)
    .glow(true)

})