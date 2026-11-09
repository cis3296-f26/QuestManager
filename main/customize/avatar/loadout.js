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