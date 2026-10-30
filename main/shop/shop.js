// Holds the shop's items and handles buying them for a User.
export class Shop {
    constructor(items) {
        this.items = items;
    }

    getItem(itemId) {
        return this.items.find((item) => item.id === itemId);
    }

    owns(user, itemId) {
        return user.inventory.includes(itemId);
    }

    // Returns true if the purchase worked, false if not.
    buy(user, itemId) {
        const item = this.getItem(itemId);

        if (!item || this.owns(user, itemId)) {
            return false;
        }

        // spendBalance() already refuses if the user can't afford it.
        if (!user.spendBalance(item.price)) {
            return false;
        }

        user.inventory.push(item.id);
        return true;
    }
}