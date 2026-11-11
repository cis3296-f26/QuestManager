import { movement } from "../../engine/Movement.js";

export function validateExploration(config) {
    const errors = [], ids = new Set();
    const validBox = (box) => box && [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
        box.width > 0 && box.height > 0 && box.x >= 0 && box.x + box.width <= config.worldWidth &&
        box.y >= movement.hudBottom && box.y + box.height <= movement.viewHeight;
    const safeSupport = (box) => validBox(box) && config.platforms.some((p) => !p.type &&
        box.y + box.height === p.y && box.x >= p.x && box.x + box.width <= p.x + p.width);
    for (const area of config.explorationAreas ?? []) {
        if (!area.id || ids.has(area.id)) errors.push(`Duplicate or missing exploration ID: ${area.id}.`);
        ids.add(area.id);
        if (!area.title || !area.purpose || !area.clue || !["elevated", "passage", "alternate", "challenge"].includes(area.kind)) errors.push(`Exploration area ${area.id} needs its purpose, clue and kind.`);
        if (!validBox(area.bounds)) errors.push(`Exploration area ${area.id} has invalid bounds.`);
        if (!safeSupport(area.entrance) || !safeSupport(area.exit)) errors.push(`Exploration area ${area.id} needs safe entrance and reconnection terrain.`);
        if (!area.platformIds?.length || !area.discoveryPlatforms?.length) errors.push(`Exploration area ${area.id} needs route and discovery platforms.`);
        for (const id of area.platformIds ?? []) if (!config.platforms.some((p) => p.id === id)) errors.push(`Unknown exploration platform ${id}.`);
        for (const id of area.discoveryPlatforms ?? []) if (!area.platformIds?.includes(id)) errors.push(`Discovery platform ${id} is outside the exploration route.`);
        if (area.coinId && !config.coins.some((coin) => coin.id === area.coinId)) errors.push(`Unknown exploration coin ${area.coinId}.`);
        for (const veil of area.foreground ?? []) if (!validBox(veil) || !["hedge", "roots", "leaves"].includes(veil.kind)) errors.push(`Invalid exploration foliage in ${area.id}.`);
    }
    return errors;
}
