// Shared by the HUD, completion dialog and future level selection panel.
export function renderCoinProgress(container, definitions, savedIds, pendingIds = []) {
    const saved = new Set(savedIds), pending = new Set(pendingIds);
    container.replaceChildren();
    container.classList.add("coin-slots");
    for (const [index, coin] of definitions.entries()) {
        const icon = document.createElement("span");
        const earned = saved.has(coin.id), collected = pending.has(coin.id);
        icon.className = `coin-slot${earned ? " is-earned" : collected ? " is-pending" : ""}`;
        icon.setAttribute("role", "img");
        icon.setAttribute("aria-label", `Coin ${index + 1}: ${earned ? "saved" : collected ? "collected this attempt, reach the flag to save" : "not earned"}`);
        icon.textContent = "Ⅰ";
        container.appendChild(icon);
    }
}
