// Prices here are for display only;
// buy_shop_item charges the price in the Supabase shop_items table.

// Items for sale. To add one add an object here and put its image in the repo.
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
            { id: "wallpaper", label: "Theme" },
            { id: "dresser", label: "Dressers" },
            { id: "decoration", label: "Decorations" }
        ]
    }
];

// Drawing order for the layered previews (first = furthest back).
export const LAYER_ORDER = {
    avatar: ["armor", "hat", "equipment"],
    room: ["wallpaper", "dresser", "decoration"]
};

export const BASE_IMAGES = {
    avatar: "assets/my_character.jpg",
    //room: "assets/room/base_room.svg"
};

export const SHOP_ITEMS = [
    {   id: "sword",
        name: "Sword", 
        price: 20, 
        image: "assets/itemSprites/equipment/with_sword.jpg" },

    {   id: "shield", 
        name: "Shield", 
        price: 30, 
        image: "assets/itemSprites/equipment/with_shield.jpg" }
];