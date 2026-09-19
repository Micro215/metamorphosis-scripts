ServerEvents.recipes(event => {
    event.custom({
        type: "avaritia:shapeless_table",
        category: "equipment",

        ingredients: [
            { item: "minecraft:apple" },
            { item: "minecraft:golden_apple" },
            { item: "minecraft:melon_slice" },
            { item: "minecraft:glistering_melon_slice" },
            { item: "minecraft:sweet_berries" },
            { item: "minecraft:chorus_fruit" },
            { item: "minecraft:carrot" },
            { item: "minecraft:golden_carrot" },
            { item: "minecraft:potato" },
            { item: "minecraft:poisonous_potato" },
            { item: "minecraft:beetroot" },
            { item: "minecraft:kelp" },
            { item: "minecraft:nether_wart" },
            { item: "minecraft:cocoa_beans" },
            { item: "minecraft:pitcher_pod" },
            { item: "minecraft:honey_bottle" },
            { item: "minecraft:cactus" },
            { item: "minecraft:bamboo" },
            { item: "minecraft:sugar_cane" },
            { item: "minecraft:sea_pickle" },
            { item: "minecraft:brown_mushroom" },
            { item: "minecraft:red_mushroom" },
            { item: "minecraft:crimson_fungus" },
            { item: "minecraft:warped_fungus" },
            { item: "minecraft:wheat" },
            { item: "minecraft:pumpkin" },
            { item: "avaritia:neutron_nugget" },

            { item: "farmersdelight:roast_chicken_block" },
            { item: "farmersdelight:stuffed_pumpkin_block" },

            [
                { item: "croptopia:shepherds_pie" },
                { item: "farmersdelight:shepherds_pie_block" }
            ],

            { item: "croptopia:the_big_breakfast" },
            { item: "croptopia:pizza" },
            { item: "croptopia:quiche" },
            { item: "iceandfire:dragon_meal" },
            { item: "create_confectionery:gingerbread_man" },
            { item: "mysticalagradditions:insanium_apple" },

            [
                { tag: "forge:water_bottles" },
                { item: "minecraft:potion" },
                { item: "projecte:evertide_amulet" }
            ],

            { tag: "forge:milks" }
        ],

        result: {
            item: "avaritia:ultimate_stew"
        },

        tier: 4
    }).id("avaritia:ultimate_stew");


    event.custom({
        type: "avaritia:shapeless_table",
        category: "equipment",

        ingredients: [
            { item: "minecraft:porkchop" },
            { item: "minecraft:beef" },
            { item: "minecraft:mutton" },
            { item: "minecraft:cod" },
            { item: "minecraft:salmon" },
            { item: "minecraft:tropical_fish" },
            { item: "minecraft:pufferfish" },
            { item: "minecraft:rabbit" },
            { item: "minecraft:chicken" },
            { item: "minecraft:rotten_flesh" },
            { item: "minecraft:spider_eye" },
            { tag: "forge:eggs" },
            { item: "avaritia:neutron_nugget" },

            { item: "croptopia:raisins" },
            { item: "croptopia:soybean" },

            { tag: "forge:salt" },

            [
                { item: "thermal:corn" },
                { item: "brewery:corn" },
                { item: "croptopia:corn" }
            ],

            { tag: "forge:crops/rice" },

            { item: "create_confectionery:bar_of_caramel" },

            [
                { item: "thermal:coffee_seeds" },
                { item: "herbalbrews:coffee_beans" },
                { item: "croptopia:coffee_beans" }
            ],

            { tag: "forge:flour" },

            [
                { item: "tconstruct:cheese_ingot" },
                { item: "croptopia:cheese" },
                { item: "thermal:cheese_wedge" },
                { item: "ad_astra:cheese" }
            ]
        ],

        result: {
            item: "avaritia:cosmic_meatballs"
        },

        tier: 4
    }).id("avaritia:cosmic_meatballs");
});