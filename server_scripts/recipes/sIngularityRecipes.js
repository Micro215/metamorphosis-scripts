// ===================== RECIPES =====================
const exludedItems = [
    ""] 

const addedItems = [
    {
        "id": "precision_mechanism",
        "name": "Precision Mechanism",
        "count": 1024,
        "timeCost": 300,
        "colors": [0xFFD700, 0xFFBF00],
        "ingredient": "create:precision_mechanism",
    },
	{
        "id": "hepatizon_ingot",
        "name": "Hepatizon",
        "count": 1000,
        "timeCost": 300,
        "colors": [0x715A7C, 0x1D0627],
        "ingredient": "tconstruct:hepatizon_ingot",
    },
	{
        "id": "golden_power_source",
        "name": "Golden Power Source",
        "count": 10000,
        "timeCost": 300,
        "colors": [0xFFFA91, 0xE0D22E],
        "ingredient": "forcecraft:golden_power_source",
    },
	{
        "id": "singularity",
        "name": "Singularity",
        "count": 100,
        "timeCost": 300,
        "colors": [0xA1FFFF, 0x0A002F],
        "ingredient": "ae2:singularity",
    },
	{
        "id": "straw",
        "name": "Straw",
        "count": 10000,
        "timeCost": 300,
        "colors": [0xA02A2A, 0xC0C0C0],
        "ingredient": "industrialforegoing:straw",
    },
	{
        "id": "blank_rune",
        "name": "RuneScape",
        "count": 1000,
        "timeCost": 300,
        "colors": [0x565C55, 0x353239],
        "ingredient": "irons_spellbooks:blank_rune",
    },
	{
        "id": "source_gem_block",
        "name": "Source Gem",
        "count": 5000,
        "timeCost": 300,
        "colors": [0xA642D7, 0x2F153D],
        "ingredient": "ars_nouveau:source_gem_block",
    },
	{	
        "id": "calorite_panel",
        "name": "Calorite",
        "count": 6000,
        "timeCost": 300,
        "colors": [0xAA3444, 0x2F091C],
        "ingredient": "ad_astra:calorite_panel",
    },
	{	
        "id": "nether_star",
        "name": "Nether Star",
        "count": 3333,
        "timeCost": 300,
        "colors": [0xC4D1CF, 0xFCFEA7],
        "ingredient": "minecraft:nether_star",
    },

]

// ===================== ADD ITEMS =====================
AvaritiaEvents.singularity(event => {
    exludedItems.forEach(item => {
        event.removeRecipe(`avaritia:${item}`);
        event.remove(`avaritia:${item}`);
    });

    if (!addedItems || addedItems.length === 0) {
        return;
    }
    
    addedItems.forEach(item => {
        event.register(`avaritia:${item.id}`, s => {
            s
                .setDisplayName(item.name)
                .setColors(item.colors[0], item.colors[1])
                .setCount(item.count)
                .setTimeCost(item.timeCost)
                .setIngredient(Ingredient.of(item.ingredient))
                .setEnabled(true)
                .setRecipeEnabled(true);
        });
    });
});

// ===================== REGISTER RECIPES =====================
ServerEvents.recipes(event => {
    if (!addedItems || addedItems.length === 0) return;

    const { avaritia } = event.recipes;

    addedItems.forEach(item => {
        avaritia
            .compressor(Item.of(item.ingredient), Item.of("avaritia:singularity", `{Id:"avaritia:${item.id}"}`))
            .timeCost(item.timeCost)
            .inputCount(item.count)
    });
});