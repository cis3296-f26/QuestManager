import { BASE_SHEETS, LAYER_ORDER, SHOP_ITEMS } from "../../shop/shopItems.js";

export function stageLayers(categoryId, itemIds, items = SHOP_ITEMS) {
    const base = BASE_SHEETS[categoryId];
    const layers = [{
        src: base.src, count: base.count, alt: "", base: true
    }];

    for (const slotId of LAYER_ORDER[categoryId] ?? []) {
        const item = items.find((c) =>
            c.category === categoryId &&
            c.slot === slotId &&
            itemIds.includes(c.id)
        );
        const src = item && (item.sheet || item.sprite);
        if (src) layers.push({ src, count: item.count || 1, alt: item.name, base: false });
    }
    
    return layers;
}

// Short text description of what's on the stage (for screen readers).
export function describeStage(categoryId, itemIds, items = SHOP_ITEMS) {
    const names = itemIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item) => item && item.category === categoryId)
        .map((item) => item.name);

    const subject = categoryId === "room" ? "Your room" : "Your avatar";
    return names.length ? `${subject} with ${names.join(", ")}` : `${subject}, nothing equipped`;
}

// Fills a container with the base image plus one <img> per equipped item.
export function renderStage(container, categoryId, itemIds, label = "", withBase = true) {
    container.innerHTML = "";

    for (const layer of stageLayers(categoryId, itemIds)) {
         if (layer.base && !withBase) continue;
        const el = document.createElement("div");
        el.className = "stage-layer stage-sheet " + (layer.base ? "stage-base" : "stage-item");
        el.dataset.count = layer.count;
        el.style.backgroundImage = `url("${layer.src}")`;
        el.style.backgroundSize = `${layer.count * 100}% 100%`;
        el.style.backgroundPositionX = "0%";
        el.setAttribute("role", "img");
        el.setAttribute("aria-label", layer.alt);
        container.appendChild(el);
    }

    if (label) container.setAttribute("aria-label", label);
}


let tick = 0;
setInterval(() => {
    tick++;
    document.querySelectorAll(".avatar-stage .stage-sheet, .showcase-stage .stage-sheet").forEach((el) => {
        const count = Number(el.dataset.count);
        if (count > 1) el.style.backgroundPositionX = `${((tick % count) / (count - 1)) * 100}%`;
    });
}, 300);