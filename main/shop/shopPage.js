import { getCurrentUser, refreshCurrentUser } from "../users/userSession.js";
import { Shop } from "./shop.js";
import { SHOP_ITEMS } from "./shopItems.js";
import { buyItem } from "../users/playerData.js";
import { renderStage } from "../customize/avatar/stage.js";


const shop = new Shop(SHOP_ITEMS);

const shopSection = document.getElementById("shop");

function renderShop() {

    // Read the current account each time; it may change after sign-out.
    const user = getCurrentUser();
    document.getElementById("counter").textContent = user?.balance ?? 0;

    if (!user) {
    shopSection.innerHTML = `
        <div class="shop-layout">
            <header class="panel-header"><h2>Shop</h2></header>
            <p>Sign in to earn coins and buy items.</p>
        </div>`;
    return;
    }

    const cards = shop.items.map((item) => {
        const owned = shop.owns(user, item.id);
        const canAfford = user.balance >= item.price;
        const label = owned ? "Owned" : canAfford ? "Buy" : "Too expensive";
        return `
            <article class="shop-card ${owned ? "is-owned" : ""}">
                <div class="shop-card-image" data-preview-category="${item.category}"
                data-preview-item="${item.id}" role="img" aria-label="${item.name}">
                </div>
                <h3>${item.name}</h3>
                <p>${item.price} points</p>
                <button class="shop-button" data-item-id="${item.id}"
                        ${owned || !canAfford ? "disabled" : ""}>
                    ${label}
                </button>
            </article>`;
    });

        shopSection.innerHTML = `
        <div class="shop-layout">
            <header class="panel-header"><h2>Shop</h2></header>
            <div class="shop-grid">${cards.join("")}</div>
        </div>`;

    shopSection.querySelectorAll("[data-preview-item]").forEach((preview) => {
    renderStage(preview, preview.dataset.previewCategory, [preview.dataset.previewItem], "", false);
});
}

// Clicking Buy: purchase the item. Equip it from the Customize tab.
shopSection.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-item-id]");
    if (!button || button.disabled) return;

    // Purchases must use the currently signed-in account.
    if (!getCurrentUser()) return;

    const item = shop.getItem(button.dataset.itemId);
    if (!item) return;

    button.disabled = true; // stop double-clicks

    try {
        await buyItem(item.id);          // the database checks price, balance and ownership
    } catch (error) {
        console.error(error);
        alert("Couldn't buy the " + item.name + ": " + error.message);
        renderShop();
        return;
    }

    await refreshCurrentUser();          // re-renders the shop through the userChanged event
});

// Refresh the balance and shop when login state changes.
document.addEventListener("questmanager:userChanged", renderShop);

renderShop();