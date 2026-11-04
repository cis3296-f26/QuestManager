import { getCurrentUser, refreshCurrentUser } from "../users/userSession.js";
import { Shop } from "./shop.js";
import { SHOP_ITEMS} from "./shopItems.js";
import { buyItem } from "../users/playerData.js";


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
            <p>Task Points: ${user.balance} (Easy: 10, Medium: 20, Hard: 30 coins)</p>
            <div class="shop-grid">${cards.join("")}</div>
        </div>`;
}

// Clicking Buy: purchase the item and show it on the character.
shopSection.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-item-id]");
    if (!button) return;

    // Purchases must use the currently signed-in account.
    if (!getCurrentUser()) return;

    const item = shop.getItem(button.dataset.itemId);
    button.disabled = true;

    try {
        await buyItem(item.id);
        await refreshCurrentUser();
        document.getElementById("image").src = item.image;
        } catch(error) {
            alert("Not enough task points for the " + item.name + ".");
            renderShop();
        }
});

// Refresh the balance and shop when login state changes.
document.addEventListener("questmanager:userChanged", renderShop);

renderShop();