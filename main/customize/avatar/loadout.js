import { CATEGORIES } from "../../shop/shopItems.js";

export function getCategory(categoryId) {
    return CATEGORIES.find((category) => category.id === categoryId);
}

export function groupBySlot(items, categoryId) {
    const category = getCategory(categoryId);
    if (!category) return [];
    return category.slots.map((slot) => ({
        slot,
        items: items.filter((item) => item.category === categoryId && item.slot === slot.id)
    }));
}

export function buildLoadout(items, equippedIds, categoryId) {
    const category = getCategory(categoryId);
    const loadout = {};
    if (!category) return loadout;
    for (const slot of category.slots) {
        loadout[slot.id] = items.find((item) =>
            item.category === categoryId &&
            item.slot === slot.id &&
            equippedIds.includes(item.id)
        ) ?? null;
    }
    return loadout;
}

// Keep only equipped ids that are real items and owned
export function cleanEquipped(items, inventory, equippedIds) {
    return equippedIds.filter((id) =>
        inventory.includes(id) && items.some((item) => item.id === id));
}


// Equip an owned item. Anything else in that same slot comes off.
export function equipItem(items, inventory, equippedIds, itemId) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) throw new Error("Unknown item: " + itemId);
    if (!inventory.includes(itemId)) throw new Error("You don't own the " + item.name + " yet.");

    const others = equippedIds.filter((id) => {
        const other = items.find((candidate) => candidate.id === id);
        return !(other && other.category === item.category && other.slot === item.slot);
    });
    return [...others, itemId];
}

export function unequipItem(equippedIds, itemId) {
    return equippedIds.filter((id) => id !== itemId);
}

export function toggleItem(items, inventory, equippedIds, itemId) {
    return equippedIds.includes(itemId)
        ? unequipItem(equippedIds, itemId)
        : equipItem(items, inventory, equippedIds, itemId);
}