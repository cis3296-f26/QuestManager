export function renderStage(container, categoryId, itemIds, label = "") {

    const layers = stageLayers(categoryId, itemIds);
    const existingBase = container.querySelector("img.stage-base");

    container.querySelectorAll("img.stage-item").forEach((img) => img.remove());

    for (const layer of layers) {
        if (layer.base && existingBase) continue;
        const img = document.createElement("img");
        img.src = layer.src;
        img.className = "stage-layer " + (layer.base ? "stage-base" : "stage-item");
        container.appendChild(img);
    }
}