import { getCurrentUser } from "./userSession.js";
import { Shop } from "./Shop.js";
import { SHOP_ITEMS, TASK_REWARD } from "./shopItems.js";


const shop = new Shop(SHOP_ITEMS);

const shopSection = document.getElementById("shop");

function renderShop() {
    
    // Read the current account each time; it may change after sign-out.
    const user = getCurrentUser();
    document.getElementById("counter").textContent = user?.balance ?? 0;

    if (!user) {
        shopSection.innerHTML = `
            <div class="shop-panel">
                <h2>Shop</h2>
                <p>Sign in to earn coins and buy items.</p>
            </div>`;
        return;
    }

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

    // Purchases must use the currently signed-in account.
    const user = getCurrentUser();
    if (!user) return;

    const item = shop.getItem(button.dataset.itemId);
    if (shop.buy(user, item.id)) {
        document.getElementById("image").src = item.image;
    } else {
        alert("Not enough task points for the " + item.name + ".");
    }
    renderShop();
});

// Credit the signed-in user when a task-completion event arrives.
document.addEventListener("questmanager:taskCompleted", () => {
    const user = getCurrentUser();
    if (!user) return;

    if (user.addBalance(TASK_REWARD)) {
        renderShop();
    }
});

// Refresh the balance and shop when login state changes.
document.addEventListener("questmanager:userChanged", renderShop);

renderShop();