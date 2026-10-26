export class User {
    constructor(id, username, balance = 0, inventory = []) {
        this.id = id;
        this.username = username;
        this.balance = balance;
        this.inventory = [...inventory];
    }
}