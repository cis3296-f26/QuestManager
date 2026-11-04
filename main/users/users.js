export class User {
    constructor(id, username, balance = 0, inventory = []) {

        // Allow zero coins, but reject negative or invalid starting balances.
        if (!Number.isInteger(balance) || balance < 0) {
            throw new Error("Starting balance must be a non-negative integer.");
        }

        // Inventory must be an array so it can hold the user's items.
        if (!Array.isArray(inventory)) {
            throw new Error("Inventory must be an array.");
        }

        this.id = id;
        this.username = username;
        this.balance = balance;
        
        // Copy the array so each user has their own inventory list.
        this.inventory = [...inventory];
    }

    // Add coins earned from completing a task.
    addBalance(amount) {
        // Reject invalid rewards: only positive whole numbers are allowed.
        if (!Number.isInteger(amount) || amount <= 0) {
            return false;
        }

        this.balance += amount;
        return true;
    }

    // Spend coins on a purchase; return whether the payment succeeded.
    spendBalance(amount) {
        if (!Number.isInteger(amount) || amount <= 0) {
            return false;
        }

        // Prevent purchases that would make the balance negative.
        if (amount > this.balance) {
            return false;
        }

        this.balance -= amount;
        return true;
    }
}