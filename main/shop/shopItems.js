// Prices here are for display only;
// buy_shop_item charges the price in the Supabase shop_items table.

// Two showcases (categories), each with ordered slots (shelves).
export const CATEGORIES = [
    {
        id: "avatar",
        label: "Wardrobe",
        slots: [
            { id: "hat", label: "Hats" },
            { id: "armor", label: "Armor" },
            { id: "equipment", label: "Equipment" }
        ]
    },
    {
        id: "room",
        label: "Room",
        slots: [
            { id: "wallpaper", label: "Wallpaper" },
            { id: "flooring", label: "Flooring" },
            { id: "dresser", label: "Dressers" },
            { id: "decoration", label: "Decorations" }
        ]
    }
];

export const BASE_SHEETS = {
    avatar: { src: "assets/character/1.1Base.png", count: 4 },
    // room:   { src: "assets/background/DefaultWallpaper.png", count: 1 }
};

// Slot stacking order, back to front.
export const LAYER_ORDER = {
    avatar: ["armor", "equipment", "hat"],
    room: ["wallpaper", "flooring", "dresser", "decoration"]
};

//not for sale, automatically granted to new users
export const DEFAULT_ITEMS = {
    wallpaper: { id: "default_wallpaper", name: "Default Wallpaper", sprite: "assets/background/DefaultWallpaper.png", count: 1 },
    flooring: { id: "default_flooring", name: "Default Flooring", sprite: "assets/background/DefaultFloor.png", count: 1 }
};

// Items for sale. To add one: add an object here, put its sprite in assets/itemSprites,
// and add a matching row in the Supabase shop_items table.
export const SHOP_ITEMS = [
    // ----- Wardrobe -----
    { id: "wizard_hat", name: "Wizard Hat", price: 25, category: "avatar", slot: "hat", sheet: "assets/itemSprites/equipment/wizard_hat.png", count: 4 },
    { id: "gold_crown",    name: "Gold Crown",    price: 60, category: "avatar", slot: "hat", sheet: "assets/itemSprites/equipment/crown.png", count:4},
    { id: "big_hat",    name: "Big Hat", price: 100, category: "avatar", slot: "hat",       sheet: "assets/itemSprites/equipment/bigHat.png", count: 4 },
    { id: "chainmail",    name: "Chainmail Armor",    price: 100, category: "avatar", slot: "armor",       sheet: "assets/itemSprites/equipment/chainArmor.png", count: 4 },
    { id: "soldier",    name: "Soldier Armor",    price: 150, category: "avatar", slot: "armor",       sheet: "assets/itemSprites/equipment/soldierArmor.png", count: 4 },
    { id: "sun_hat",    name: "Sun Hat",    price: 80, category: "avatar", slot: "hat", sheet: "assets/itemSprites/equipment/sunHat.png", count: 4},
    { id: "sword",         name: "Sword",         price: 20, category: "avatar", slot: "equipment", sheet: "assets/itemSprites/equipment/sword.png", count: 4 },
    //{ id: "shield",        name: "Shield",        price: 30, category: "avatar", slot: "equipment", sprite: "assets/itemSprites/equipment/shield.jpg" },
     //{ id: "leather_tunic", name: "Leather Tunic", price: 30, category: "avatar", slot: "armor",     sprite: "assets/itemSprites/equipment/shield.jpg" },

    // ----- Room -----
    { id: "blue_carpet",      name: "Blue Carpet",      price: 15, category: "room", slot: "flooring",   sprite: "assets/background/BlueCarpet.png" },
    { id: "red_carpet",       name: "Red Carpet",       price: 15, category: "room", slot: "flooring",   sprite: "assets/background/RedCarpet.png" },
    { id: "green_carpet",     name: "Green Carpet",     price: 15, category: "room", slot: "flooring",   sprite: "assets/background/GreenCarpet.png" },
    { id: "blue_wallpaper",   name: "Blue Wallpaper",   price: 20, category: "room", slot: "wallpaper",  sprite: "assets/background/BlueWallpaper.png" },
    { id: "red_wallpaper",    name: "Red Wallpaper",    price: 20, category: "room", slot: "wallpaper",  sprite: "assets/background/RedWallpaper.png" },
    { id: "green_wallpaper",  name: "Green Wallpaper",  price: 20, category: "room", slot: "wallpaper",  sprite: "assets/background/GreenWallpaper.png" },
    { id: "dark_blue_wallpaper", name: "Dark Blue Wallpaper", price: 20, category: "room", slot: "wallpaper", sprite: "assets/background/DarkBlueWallpaper.png" },
    { id: "light_wood_flooring", name: "Light Wood Flooring", price: 20, category: "room", slot: "flooring", sprite: "assets/background/LightWoodFloor.png" },
    { id: "orange_carpet", name: "Orange Carpet", price: 15, category: "room", slot: "flooring", sprite: "assets/background/OrangeCarpet.png" },
    { id: "purple_wallpaper", name: "Purple Wallpaper", price: 20, category: "room", slot: "wallpaper", sprite: "assets/background/PurpleWallpaper.png" },
    { id: "orange_wallpaper", name: "Orange Wallpaper", price: 20, category: "room", slot: "wallpaper", sprite: "assets/background/OrangeWallpaper.png" },
    { id: "purple_carpet", name: "Purple Carpet", price: 15, category: "room", slot: "flooring", sprite: "assets/background/PurpleCarpet.png" },
    { id: "yellow_carpet", name: "Yellow Carpet", price: 15, category: "room", slot: "flooring", sprite: "assets/background/YellowCarpet.png" },
    { id: "yellow_wallpaper", name: "Yellow Wallpaper", price: 20, category: "room", slot: "wallpaper", sprite: "assets/background/YellowWallpaper.png" }

];