export class User {
    constructor(id, username, balance = 0, inventory = []) {
        this.id = id;
        this.username = username;
        this.balance = balance;
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