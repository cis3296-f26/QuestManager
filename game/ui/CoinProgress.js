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

// Three compact achievement slots inside the tan section bar, in screen space.
export function drawCoinHUD(ctx, definitions, savedIds, pendingIds, viewWidth) {
    ctx.save();
    definitions.forEach((coin, index) => {
        const earned = savedIds.has(coin.id), pending = pendingIds.has(coin.id);
        const x = viewWidth - 119 + index * 38;
        ctx.fillStyle = earned || pending ? "#efbd43" : "#c8c1b3";
        ctx.strokeStyle = earned || pending ? "#795b29" : "#746b5b";
        ctx.lineWidth = 2;
        ctx.setLineDash(pending && !earned ? [3, 2] : []);
        ctx.beginPath();
        ctx.arc(x, 39, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, 39, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, 32);
        ctx.lineTo(x, 46);
        ctx.stroke();
    });
    ctx.restore();
}

