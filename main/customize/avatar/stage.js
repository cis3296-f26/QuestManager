// Draws a layered avatar or room: a base image with item sprites stacked on top.
// Used by the Home character panel, the Shop previews, and the Customize showcase.

import { BASE_IMAGES, BASE_FRAMES, LAYER_ORDER, SHOP_ITEMS } from "../../shop/shopItems.js";

export function stageLayers(categoryId, itemIds, items = SHOP_ITEMS) {
    const layers = [{
        src: BASE_IMAGES[categoryId],
        frames: BASE_FRAMES[categoryId],
        alt: "",
        base: true
    }];

    for (const slotId of LAYER_ORDER[categoryId] ?? []) {
        const item = items.find((candidate) =>
            candidate.category === categoryId &&
            candidate.slot === slotId &&
            itemIds.includes(candidate.id)
        );
        if (item && item.sprite) {
            layers.push({ src: item.sprite, frames: item.frames, alt: item.name, base: false });
        }
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
export function renderStage(container, categoryId, itemIds, label = "") {
    const layers = stageLayers(categoryId, itemIds);
    const existingBase = container.querySelector("img.stage-base");

    container.querySelectorAll("img.stage-item").forEach((img) => img.remove());

    for (const layer of layers) {
        if (layer.base && existingBase) {
            if (layer.frames?.length > 1) existingBase.dataset.frames = JSON.stringify(layer.frames);
            continue;
        }
        const img = document.createElement("img");
        img.src = layer.src;
        img.alt = layer.alt;
        img.className = "stage-layer " + (layer.base ? "stage-base" : "stage-item");
        if (layer.frames?.length > 1) img.dataset.frames = JSON.stringify(layer.frames);
        container.appendChild(img);
    }

    if (label) container.setAttribute("aria-label", label);
}

// One shared timer moves every animated image to the same frame, so layers stay in sync.
let tick = 0;
setInterval(() => {
    tick++;
    document.querySelectorAll("img[data-frames]").forEach((img) => {
        const frames = JSON.parse(img.dataset.frames);
        img.src = frames[tick % frames.length];
    });
}, 300);