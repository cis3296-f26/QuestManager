import { User } from "./User.js";
import { Shop } from "./Shop.js";
import { SHOP_ITEMS, TASK_REWARD } from "./shopItems.js";

// Temporary local user until login/database is connected.
const user = new User("local", "Adventurer");
const shop = new Shop(SHOP_ITEMS);

const shopSection = document.getElementById("shop");

function renderShop() {
    document.getElementById("counter").textContent = user.balance;

    const cards = shop.items.map((item) => {
        const owned = shop.owns(user, item.id);
        return `
            <article class="shop-card">
                <img class="shop-card-image" src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p>${item.price} points</p>
                <button class="shop-button" data-item-id="${item.id}" ${owned ? "disabled" : ""}>
                    ${owned ? "Owned" : "Buy"}
                </button>
            </article>`;
    });

    shopSection.innerHTML = `
        <div class="shop-panel">
            <h2>Shop</h2>
            <p>Task Points: ${user.balance} (earn ${TASK_REWARD} per completed task)</p>
            <div class="shop-grid">${cards.join("")}</div>
        </div>`;
}

// Clicking Buy: purchase the item and show it on the character.
shopSection.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-item-id]");
    if (!button) return;

    const item = shop.getItem(button.dataset.itemId);
    if (shop.buy(user, item.id)) {
        document.getElementById("image").src = item.image;
    } else {
        alert("Not enough task points for the " + item.name + ".");
    }
    renderShop();
});

// script.js sends this event the first time a task is checked off.
document.addEventListener("questmanager:taskCompleted", () => {
    user.addBalance(TASK_REWARD);
    renderShop();
});

renderShop();