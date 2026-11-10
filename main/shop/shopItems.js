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
            { id: "dresser", label: "Dressers" },
            { id: "decoration", label: "Decorations" }
        ]
    }
];

// Bottom layer drawn first for each category.
export const BASE_FRAMES = {
    avatar: [
        "assets/character/1Idle01.png",
        "assets/character/1Idle02.png",
        "assets/character/1Idle03.png",
        "assets/character/1Idle04.png"
    ],
    room: ["assets/room/base_room.png"]
};

export const BASE_IMAGES = {
    avatar: BASE_FRAMES.avatar[0],
    room: BASE_FRAMES.room[0]
};

// Slot stacking order, back to front.
export const LAYER_ORDER = {
    avatar: ["armor", "equipment", "hat"],
    room: ["wallpaper", "dresser", "decoration"]
};

// Items for sale. To add one: add an object here, put its sprite in assets/itemSprites,
// and add a matching row in the Supabase shop_items table.
export const SHOP_ITEMS = [
    // ----- Wardrobe -----
    { id: "wizard_hat", name: "Wizard Hat", price: 25, category: "avatar", slot: "hat",
  sprite: "assets/itemSprites/equipment/wizard/wizard1.png",
  frames: [
      "assets/itemSprites/equipment/wizard/wizard1.png",
      "assets/itemSprites/equipment/wizard/wizard2.png",
      "assets/itemSprites/equipment/wizard/wizard3.png",
      "assets/itemSprites/equipment/wizard/wizard4.png"
        ]
    },
    { id: "gold_crown",    name: "Gold Crown",    price: 60, category: "avatar", slot: "hat",       sprite: "assets/itemSprites/equipment/shield.jpg" },
    { id: "leather_tunic", name: "Leather Tunic", price: 30, category: "avatar", slot: "armor",     sprite: "assets/itemSprites/equipment/shield.jpg" },
    { id: "sword",         name: "Sword",         price: 20, category: "avatar", slot: "equipment", sprite: "assets/itemSprites/equipment/sword.jpg" },
    { id: "shield",        name: "Shield",        price: 30, category: "avatar", slot: "equipment", sprite: "assets/itemSprites/equipment/shield.jpg" }
];